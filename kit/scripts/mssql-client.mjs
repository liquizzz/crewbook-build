// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// SQL Server for the kit's database scripts, through sqlcmd: the one installed on this machine for a server you already
// have (the owner installs it with their OK), or the one inside the project's own SQL Server container (local mode,
// nothing to install). The password goes through the environment (SQLCMDPASSWORD) and SQL through stdin, never the
// command line. Connection strings are kept as sqlserver://user:password@host:port/database?options; the app gets an
// ADO.NET string (default) or the URL form.
import { spawnSync } from "node:child_process";

// ADO.NET ("Server=host,port;Database=…;User Id=…;Password=…") or a sqlserver:// / mssql:// URL → the kit's URL form.
export function toMssqlUrl(input) {
  const text = String(input || "").trim();
  if (/^(sqlserver|mssql):\/\//i.test(text) && text.includes("@")) {
    const u = new URL(text.replace(/^mssql:/i, "sqlserver:"));
    return u.toString();
  }
  const pairs = Object.fromEntries(text.split(";").filter((x) => x.includes("=")).map((x) => {
    const i = x.indexOf("=");
    return [x.slice(0, i).trim().toLowerCase().replace(/\s+/g, ""), x.slice(i + 1).trim()];
  }));
  const server = pairs.server || pairs.datasource || pairs.address || pairs.addr;
  const user = pairs.userid || pairs.uid || pairs.user || pairs.username;
  const password = pairs.password || pairs.pwd;
  if (!server || !user || password === undefined) throw new Error("Not a SQL Server connection string: it needs Server, User Id and Password (Windows sign-in is not supported here).");
  const m = /^(?:tcp:)?([^,\\]+)(?:\\[^,]+)?(?:,(\d+))?$/i.exec(server);
  if (!m) throw new Error("Not a SQL Server address the kit understands (host,port).");
  if (server.includes("\\") && !m[2]) throw new Error("A named instance needs its port (host,port).");
  const u = new URL("sqlserver://localhost");
  u.hostname = m[1];
  u.port = m[2] || "1433";
  u.username = encodeURIComponent(user);
  u.password = encodeURIComponent(password);
  u.pathname = "/" + encodeURIComponent(pairs.database || pairs.initialcatalog || "master");
  const yes = (v) => /^(true|yes|mandatory|strict)$/i.test(v || "");
  if (yes(pairs.trustservercertificate)) u.searchParams.set("trustServerCertificate", "true");
  if (pairs.encrypt !== undefined) u.searchParams.set("encrypt", yes(pairs.encrypt) ? "true" : "false");
  return u.toString();
}

export function parseMssql(url) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port || 1433),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: decodeURIComponent(u.pathname.slice(1)) || "master",
    trust: u.searchParams.get("trustServerCertificate") === "true",
    encrypt: u.searchParams.get("encrypt") !== "false",
  };
}
export const mssqlWithDatabase = (url, db) => {
  const u = new URL(url);
  u.pathname = "/" + encodeURIComponent(db);
  return u.toString();
};
export const mssqlWithAccount = (url, user, password) => {
  const u = new URL(url);
  u.username = encodeURIComponent(user);
  u.password = encodeURIComponent(password);
  return u.toString();
};

// What the app reads as DATABASE_URL: ADO.NET (the default, .NET and most SQL Server stacks) or the URL form some ORMs use.
export function mssqlAppString(url, format = "ado") {
  const p = parseMssql(url);
  if (format === "url") return `sqlserver://${p.host}:${p.port};database=${p.database};user=${p.user};password=${p.password};encrypt=${p.encrypt};trustServerCertificate=${p.trust}`;
  return `Server=${p.host},${p.port};Database=${p.database};User Id=${p.user};Password=${p.password};Encrypt=${p.encrypt ? "True" : "False"};TrustServerCertificate=${p.trust ? "True" : "False"}`;
}

export const sqlquote = (s) => `N'${String(s).replace(/'/g, "''")}'`;
export const bracket = (s) => `[${String(s).replace(/]/g, "]]")}]`;

// sqlcmd on this machine (for an existing server).
export const sqlcmdHere = () => process.env.CREWBOOK_SQLCMD !== "none" && !spawnSync("sqlcmd", ["-?"], { stdio: "ignore" }).error;
export const SQLCMD_INSTALL = "SQL Server needs sqlcmd on this machine to reach a server you already have. With your OK, install it, then run this again: Windows: winget install sqlcmd · macOS: brew install sqlcmd · Linux: https://learn.microsoft.com/sql/tools/sqlcmd/sqlcmd-utility";

// Run SQL; returns the rows as arrays of strings. container: the name of the project's own SQL Server container, whose
// bundled sqlcmd is used (the server is then "localhost" inside it).
export function runSql(url, sql, { container = null } = {}) {
  const p = parseMssql(url);
  const flags = ["-U", p.user, "-d", p.database, "-b", "-h", "-1", "-W", "-s", "|", "-l", "15", ...(p.trust || container ? ["-C"] : [])];
  const input = `SET NOCOUNT ON;\n${sql}\nGO\n`;
  let r;
  if (container) {
    const tool = "if [ -x /opt/mssql-tools18/bin/sqlcmd ]; then T=/opt/mssql-tools18/bin/sqlcmd; else T=/opt/mssql-tools/bin/sqlcmd; fi; exec $T -S localhost \"$@\"";
    r = spawnSync("docker", ["exec", "-i", "-e", "SQLCMDPASSWORD", container, "sh", "-c", tool, "sh", ...flags], { input, encoding: "utf8", env: { ...process.env, SQLCMDPASSWORD: p.password } });
  } else {
    if (!sqlcmdHere()) throw new Error(SQLCMD_INSTALL);
    r = spawnSync("sqlcmd", ["-S", `tcp:${p.host},${p.port}`, ...flags], { input, encoding: "utf8", env: { ...process.env, SQLCMDPASSWORD: p.password } });
  }
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  if (r.status !== 0) {
    const msg = out.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !/^Msg \d+, Level/.test(l)).join(" ").replace(p.password, "***");
    throw new Error(msg || `sqlcmd failed (${r.status}).`);
  }
  return (r.stdout || "").split(/\r?\n/).filter((l) => l.trim()).map((l) => l.split("|").map((c) => c.trim()));
}
