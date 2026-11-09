// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// A small PostgreSQL client over a connection string, with no package and no psql, Docker or container name: the kit's
// database scripts reach a server the same way wherever it runs (installed on this machine, in Docker, online, behind
// NAT). It speaks the simple query protocol: SSL as the URL asks (sslmode), SCRAM-SHA-256, md5 or password sign-in.
// Errors never include the password or the full connection string.
import crypto from "node:crypto";
import net from "node:net";
import tls from "node:tls";

// The parts of a connection string, without ever logging it. sslmode: disable, prefer (default), require, verify-ca,
// verify-full. A host given as a Unix socket path is not supported here.
export function parseUrl(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    throw new Error("Not a connection string (postgresql://user:password@host:port/database).");
  }
  if (!/^postgres(ql)?:$/.test(u.protocol)) throw new Error("Not a PostgreSQL connection string.");
  const params = Object.fromEntries(u.searchParams);
  return {
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    host: u.hostname.replace(/^\[|\]$/g, "") || "localhost",
    port: Number(u.port || 5432),
    database: decodeURIComponent(u.pathname.slice(1)) || decodeURIComponent(u.username),
    sslmode: params.sslmode || "prefer",
    params,
  };
}

// The same server and account with another database name; every other part (host, port, SSL options) is kept.
export function withDatabase(url, database) {
  const u = new URL(url);
  u.pathname = "/" + encodeURIComponent(database);
  return u.toString();
}

// The same database with another account (user and password); the endpoint and options are kept.
export function withAccount(url, user, password) {
  const u = new URL(url);
  u.username = encodeURIComponent(user);
  u.password = encodeURIComponent(password);
  return u.toString();
}

// A safe description for messages: host, port, database, user; never the password.
export const describe = (url) => {
  try {
    const p = parseUrl(url);
    return `${p.user}@${p.host}:${p.port}/${p.database}`;
  } catch {
    return "(not a connection string)";
  }
};

export const ident = (name) => `"${String(name).replace(/"/g, '""')}"`;
export const literal = (value) => `'${String(value).replace(/'/g, "''")}'`;

const int32 = (n) => {
  const b = Buffer.alloc(4);
  b.writeInt32BE(n);
  return b;
};
const message = (type, body) => Buffer.concat([type ? Buffer.from(type) : Buffer.alloc(0), int32(body.length + 4), body]);
const cstr = (s) => Buffer.concat([Buffer.from(String(s), "utf8"), Buffer.from([0])]);

class Reader {
  constructor(socket) {
    this.buf = Buffer.alloc(0);
    this.waiters = [];
    this.error = null;
    this.attach(socket);
  }
  attach(socket) {
    socket.on("data", (d) => {
      this.buf = Buffer.concat([this.buf, d]);
      this.flush();
    });
    socket.on("error", (e) => this.fail(e));
    socket.on("close", () => this.fail(new Error("The server closed the connection.")));
  }
  fail(e) {
    this.error = this.error || e;
    for (const w of this.waiters.splice(0)) w.reject(this.error);
  }
  flush() {
    while (this.waiters.length && this.buf.length >= 5) {
      const len = this.buf.readInt32BE(1);
      if (this.buf.length < len + 1) return;
      const type = String.fromCharCode(this.buf[0]);
      const body = this.buf.subarray(5, len + 1);
      this.buf = this.buf.subarray(len + 1);
      this.waiters.shift().resolve({ type, body });
    }
  }
  next() {
    if (this.error) return Promise.reject(this.error);
    return new Promise((resolve, reject) => {
      this.waiters.push({ resolve, reject });
      this.flush();
    });
  }
}

const errorFields = (body) => {
  const f = {};
  let i = 0;
  while (i < body.length && body[i] !== 0) {
    const key = String.fromCharCode(body[i]);
    const end = body.indexOf(0, i + 1);
    f[key] = body.toString("utf8", i + 1, end);
    i = end + 1;
  }
  return f;
};
const pgError = (body) => {
  const f = errorFields(body);
  const e = new Error(f.M || "PostgreSQL error");
  e.code = f.C;
  return e;
};

function connectSocket(p, timeout) {
  return new Promise((resolve, reject) => {
    const s = net.connect({ host: p.host, port: p.port });
    const timer = setTimeout(() => {
      s.destroy();
      reject(new Error(`No answer from ${p.host}:${p.port} within ${timeout / 1000} s.`));
    }, timeout);
    s.once("connect", () => {
      clearTimeout(timer);
      resolve(s);
    });
    s.once("error", (e) => {
      clearTimeout(timer);
      reject(new Error(`Cannot reach ${p.host}:${p.port}: ${e.code || e.message}.`));
    });
  });
}

// Ask for SSL as sslmode says; returns the socket to use.
async function negotiateSsl(socket, p) {
  if (p.sslmode === "disable") return socket;
  socket.write(Buffer.concat([int32(8), int32(80877103)]));
  const answer = await new Promise((resolve, reject) => {
    socket.once("data", (d) => resolve(String.fromCharCode(d[0])));
    socket.once("error", reject);
  });
  if (answer !== "S") {
    if (["require", "verify-ca", "verify-full"].includes(p.sslmode)) throw new Error(`${p.host}:${p.port} does not offer SSL, and the connection string requires it (sslmode=${p.sslmode}).`);
    return socket;
  }
  return new Promise((resolve, reject) => {
    const secure = tls.connect({
      socket,
      servername: net.isIP(p.host) ? undefined : p.host,
      rejectUnauthorized: p.sslmode === "verify-ca" || p.sslmode === "verify-full",
      checkServerIdentity: p.sslmode === "verify-full" ? tls.checkServerIdentity : () => undefined,
    });
    secure.once("secureConnect", () => resolve(secure));
    secure.once("error", (e) => reject(new Error(`SSL with ${p.host}:${p.port} failed: ${e.message}`)));
  });
}

async function signIn(socket, reader, p) {
  socket.write(message(null, Buffer.concat([int32(196608), cstr("user"), cstr(p.user), cstr("database"), cstr(p.database), cstr("client_encoding"), cstr("UTF8"), Buffer.from([0])])));
  let scram = null;
  for (;;) {
    const { type, body } = await reader.next();
    if (type === "E") throw pgError(body);
    if (type === "Z") return;
    if (type !== "R") continue;
    const code = body.readInt32BE(0);
    if (code === 0) continue;
    if (code === 3) socket.write(message("p", cstr(p.password)));
    else if (code === 5) {
      const salt = body.subarray(4, 8);
      const inner = crypto.createHash("md5").update(p.password + p.user).digest("hex");
      socket.write(message("p", cstr("md5" + crypto.createHash("md5").update(Buffer.concat([Buffer.from(inner), salt])).digest("hex"))));
    } else if (code === 10) {
      if (!body.toString("utf8", 4).split("\0").includes("SCRAM-SHA-256")) throw new Error("The server asks for a sign-in method this client does not support.");
      const nonce = crypto.randomBytes(18).toString("base64");
      scram = { nonce, firstBare: `n=*,r=${nonce}` };
      const first = Buffer.from(`n,,${scram.firstBare}`);
      socket.write(message("p", Buffer.concat([cstr("SCRAM-SHA-256"), int32(first.length), first])));
    } else if (code === 11) {
      const serverFirst = body.toString("utf8", 4);
      const attrs = Object.fromEntries(serverFirst.split(",").map((kv) => [kv[0], kv.slice(2)]));
      if (!attrs.r || !attrs.r.startsWith(scram.nonce)) throw new Error("The server's sign-in answer does not match.");
      const salted = crypto.pbkdf2Sync(p.password.normalize("NFKC"), Buffer.from(attrs.s, "base64"), Number(attrs.i), 32, "sha256");
      const clientKey = crypto.createHmac("sha256", salted).update("Client Key").digest();
      const storedKey = crypto.createHash("sha256").update(clientKey).digest();
      const finalBare = `c=biws,r=${attrs.r}`;
      const auth = `${scram.firstBare},${serverFirst},${finalBare}`;
      const signature = crypto.createHmac("sha256", storedKey).update(auth).digest();
      const proof = Buffer.from(clientKey.map((b, i) => b ^ signature[i]));
      scram.serverKey = crypto.createHmac("sha256", salted).update("Server Key").digest();
      scram.auth = auth;
      socket.write(message("p", Buffer.from(`${finalBare},p=${proof.toString("base64")}`)));
    } else if (code === 12) {
      const v = body.toString("utf8", 4).split(",").find((x) => x.startsWith("v="));
      const expected = crypto.createHmac("sha256", scram.serverKey).update(scram.auth).digest("base64");
      if (!v || v.slice(2) !== expected) throw new Error("The server's sign-in proof does not match.");
    } else throw new Error(`The server asks for a sign-in method this client does not support (${code}).`);
  }
}

// Open a connection; returns { query(sql) → rows as objects, close() }.
export async function connect(url, { timeout = 10000 } = {}) {
  const p = parseUrl(url);
  let socket = await connectSocket(p, timeout);
  socket = await negotiateSsl(socket, p);
  const reader = new Reader(socket);
  try {
    await signIn(socket, reader, p);
  } catch (e) {
    socket.destroy();
    throw e;
  }
  let busy = Promise.resolve();
  const query = (sql) => {
    const run = async () => {
      socket.write(message("Q", cstr(sql)));
      let fields = [];
      const rows = [];
      let error = null;
      for (;;) {
        const { type, body } = await reader.next();
        if (type === "T") {
          fields = [];
          let i = 2;
          for (let n = body.readInt16BE(0); n > 0; n--) {
            const end = body.indexOf(0, i);
            fields.push(body.toString("utf8", i, end));
            i = end + 1 + 18;
          }
        } else if (type === "D") {
          const row = {};
          let i = 2;
          for (let n = 0; n < body.readInt16BE(0); n++) {
            const len = body.readInt32BE(i);
            i += 4;
            row[fields[n]] = len < 0 ? null : body.toString("utf8", i, i + len);
            if (len > 0) i += len;
          }
          rows.push(row);
        } else if (type === "E") error = pgError(body);
        else if (type === "Z") break;
      }
      if (error) throw error;
      return rows;
    };
    busy = busy.then(run, run);
    return busy;
  };
  const close = () => {
    try {
      socket.end(message("X", Buffer.alloc(0)));
    } catch {}
  };
  return { query, close };
}

// Run fn with a connection, closed afterwards.
export async function withPg(url, fn, options) {
  const c = await connect(url, options);
  try {
    return await fn(c.query);
  } finally {
    c.close();
  }
}
