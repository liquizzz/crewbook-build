// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// A small Redis client over a connection string (redis://, or rediss:// for TLS), with no package: it signs in, then
// sends commands as arrays of strings. Errors never include the password or the connection string.
import net from "node:net";
import tls from "node:tls";

export function parseRedisUrl(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    throw new Error("Not a Redis connection string (redis://user:password@host:port).");
  }
  if (!/^rediss?:$/.test(u.protocol)) throw new Error("Not a Redis connection string (redis://user:password@host:port).");
  return {
    tls: u.protocol === "rediss:",
    user: decodeURIComponent(u.username) || null,
    password: decodeURIComponent(u.password) || null,
    host: u.hostname.replace(/^\[|\]$/g, "") || "localhost",
    port: Number(u.port || 6379),
    db: Number(u.pathname.slice(1) || 0),
  };
}

export function redisWithAccount(url, user, password) {
  const u = new URL(url);
  u.username = encodeURIComponent(user);
  u.password = encodeURIComponent(password);
  u.pathname = "";
  return u.toString();
}

const encode = (args) => Buffer.from(`*${args.length}\r\n` + args.map((a) => `$${Buffer.byteLength(String(a))}\r\n${a}\r\n`).join(""));

// One reply from buf at i: [value, next], or null when more bytes are needed. A server error becomes an Error value.
function parseReply(buf, i = 0) {
  if (i >= buf.length) return null;
  const end = buf.indexOf("\r\n", i);
  if (end < 0) return null;
  const type = String.fromCharCode(buf[i]);
  const line = buf.toString("utf8", i + 1, end);
  if (type === "+") return [line, end + 2];
  if (type === "-") return [new Error(line), end + 2];
  if (type === ":") return [Number(line), end + 2];
  if (type === "$") {
    const n = Number(line);
    if (n < 0) return [null, end + 2];
    if (buf.length < end + 2 + n + 2) return null;
    return [buf.toString("utf8", end + 2, end + 2 + n), end + 4 + n];
  }
  if (type === "*") {
    const n = Number(line);
    if (n < 0) return [null, end + 2];
    const out = [];
    let at = end + 2;
    for (let k = 0; k < n; k++) {
      const r = parseReply(buf, at);
      if (!r) return null;
      out.push(r[0]);
      at = r[1];
    }
    return [out, at];
  }
  throw new Error("Unexpected answer from the Redis server.");
}

export async function connectRedis(url, { timeout = 10000 } = {}) {
  const p = parseRedisUrl(url);
  const socket = await new Promise((resolve, reject) => {
    const s = p.tls ? tls.connect({ host: p.host, port: p.port, servername: net.isIP(p.host) ? undefined : p.host }) : net.connect({ host: p.host, port: p.port });
    const timer = setTimeout(() => {
      s.destroy();
      reject(new Error(`No answer from ${p.host}:${p.port} within ${timeout / 1000} s.`));
    }, timeout);
    s.once(p.tls ? "secureConnect" : "connect", () => {
      clearTimeout(timer);
      resolve(s);
    });
    s.once("error", (e) => {
      clearTimeout(timer);
      reject(new Error(`Cannot reach ${p.host}:${p.port}: ${e.code || e.message}.`));
    });
  });
  let buf = Buffer.alloc(0);
  const waiters = [];
  let failure = null;
  const flush = () => {
    while (waiters.length) {
      const r = parseReply(buf);
      if (!r) return;
      buf = buf.subarray(r[1]);
      const w = waiters.shift();
      if (r[0] instanceof Error) w.reject(r[0]);
      else w.resolve(r[0]);
    }
  };
  socket.on("data", (d) => {
    buf = Buffer.concat([buf, d]);
    flush();
  });
  const fail = (e) => {
    failure = failure || e;
    for (const w of waiters.splice(0)) w.reject(failure);
  };
  socket.on("error", fail);
  socket.on("close", () => fail(new Error("The Redis server closed the connection.")));
  const command = (...args) => {
    if (failure) return Promise.reject(failure);
    return new Promise((resolve, reject) => {
      waiters.push({ resolve, reject });
      socket.write(encode(args));
    });
  };
  try {
    if (p.password) await (p.user ? command("AUTH", p.user, p.password) : command("AUTH", p.password));
    if (p.db) await command("SELECT", String(p.db));
  } catch (e) {
    socket.destroy();
    throw new Error(`Sign-in refused: ${String(e.message).split(" ")[0]}`);
  }
  return { command, close: () => socket.end() };
}

export async function withRedis(url, fn, options) {
  const c = await connectRedis(url, options);
  try {
    return await fn(c.command);
  } finally {
    c.close();
  }
}
