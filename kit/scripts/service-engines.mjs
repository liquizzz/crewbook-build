// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// The engines scripts/db-setup.mjs works with, behind one interface: PostgreSQL and SQL Server (a project's database),
// Redis (its cache). For each: how to read a connection string, what an account may do, how to create the project's
// one account and its databases (or, for Redis, its key prefix), how to check them, and how the engine runs in the
// project's own Docker (local mode). No function here prints a password.
import { describe as pgDescribe, ident, literal, parseUrl as pgParse, withAccount as pgWithAccount, withDatabase as pgWithDatabase, withPg } from "./pg-client.mjs";
import { bracket, mssqlAppString, mssqlWithAccount, mssqlWithDatabase, parseMssql, runSql, sqlquote, toMssqlUrl } from "./mssql-client.mjs";
import { parseRedisUrl, redisWithAccount, withRedis } from "./redis-client.mjs";
import crypto from "node:crypto";

// A generated password that also meets SQL Server's complexity rules.
export const newPassword = () => `${crypto.randomBytes(24).toString("base64url")}Aa1`;

const postgres = {
  kind: "database",
  title: "PostgreSQL",
  parse: (input) => (pgParse(input), input),
  describe: (url) => pgDescribe(url).replace(/\/.*$/, ""),
  user: (url) => pgParse(url).user,
  password: (url) => pgParse(url).password,
  async rights(url) {
    return withPg(url, async (q) => {
      const [r] = await q("SELECT current_user AS name, rolsuper, rolcreaterole, rolcreatedb FROM pg_roles WHERE rolname = current_user");
      const admin = r.rolsuper === "t" || (r.rolcreaterole === "t" && r.rolcreatedb === "t");
      return { name: r.name, kind: admin ? "admin" : r.rolcreatedb === "t" ? "account" : null, missing: "CREATEDB (or an admin that can create logins and databases)" };
    });
  },
  accountExists: (adminUrl, name) => withPg(adminUrl, async (q) => (await q(`SELECT 1 AS x FROM pg_roles WHERE rolname = ${literal(name)}`)).length > 0),
  createAccount: (adminUrl, name, password) => withPg(adminUrl, (q) => q(`CREATE ROLE ${ident(name)} LOGIN PASSWORD ${literal(password)} CREATEDB NOSUPERUSER NOCREATEROLE`)),
  projectUrl: (adminUrl, name, password) => pgWithAccount(pgWithDatabase(adminUrl, pgParse(adminUrl).database || "postgres"), name, password),
  // Every database, owned by the project account; one that exists and belongs to someone else is refused.
  async ensure(projectUrl, names) {
    const account = pgParse(projectUrl).user;
    const made = [];
    await withPg(projectUrl, async (q) => {
      for (const db of names) {
        const [row] = await q(`SELECT r.rolname AS owner FROM pg_database d JOIN pg_roles r ON r.oid = d.datdba WHERE d.datname = ${literal(db)}`);
        if (row) {
          if (row.owner !== account) throw new Error(`${db} already exists and belongs to ${row.owner}, not to this project's account ${account}. It was not touched.`);
          continue;
        }
        await q(`CREATE DATABASE ${ident(db)}`);
        await q(`REVOKE CONNECT ON DATABASE ${ident(db)} FROM PUBLIC`);
        made.push(db);
      }
    });
    return made;
  },
  check: (projectUrl, db) => withPg(pgWithDatabase(projectUrl, db), (q) => q("SELECT 1")),
  recreate: (projectUrl, db) => withPg(projectUrl, async (q) => {
    await q(`DROP DATABASE IF EXISTS ${ident(db)} WITH (FORCE)`);
    await q(`CREATE DATABASE ${ident(db)}`);
    await q(`REVOKE CONNECT ON DATABASE ${ident(db)} FROM PUBLIC`);
  }),
  drop: (projectUrl, db) => withPg(projectUrl, (q) => q(`DROP DATABASE IF EXISTS ${ident(db)} WITH (FORCE)`)),
  appValue: (projectUrl, db) => pgWithDatabase(projectUrl, db),
  maintenance: (projectUrl) => projectUrl,
  local: {
    image: (v) => `postgres:${v || "17"}-alpine`,
    internalPort: 5432,
    firstPort: 55432,
    environment: ["POSTGRES_PASSWORD: ${DATABASE_LOCAL_PASSWORD:?run node scripts/db-setup.mjs local}"],
    healthcheck: '["CMD-SHELL", "pg_isready -U postgres"]',
    adminUrl: (port, password) => `postgresql://postgres:${encodeURIComponent(password)}@127.0.0.1:${port}/postgres?sslmode=disable`,
  },
};

const mssql = {
  kind: "database",
  title: "SQL Server",
  parse: (input) => toMssqlUrl(input),
  describe: (url) => {
    const p = parseMssql(url);
    return `${p.user}@${p.host}:${p.port}`;
  },
  user: (url) => parseMssql(url).user,
  password: (url) => parseMssql(url).password,
  async rights(url, ctx) {
    const [[name, sysadmin, alterLogin, createDb]] = runSql(url, "SELECT SUSER_SNAME(), IS_SRVROLEMEMBER('sysadmin'), HAS_PERMS_BY_NAME(NULL, NULL, 'ALTER ANY LOGIN'), HAS_PERMS_BY_NAME(NULL, NULL, 'CREATE ANY DATABASE')", ctx);
    const admin = sysadmin === "1" || (alterLogin === "1" && createDb === "1");
    return { name, kind: admin ? "admin" : createDb === "1" ? "account" : null, missing: "CREATE ANY DATABASE (or an admin that can create logins and databases)" };
  },
  accountExists: async (adminUrl, name, ctx) => runSql(adminUrl, `SELECT 1 FROM sys.server_principals WHERE name = ${sqlquote(name)}`, ctx).length > 0,
  createAccount: async (adminUrl, name, password, ctx) => {
    runSql(mssqlWithDatabase(adminUrl, "master"), `CREATE LOGIN ${bracket(name)} WITH PASSWORD = ${sqlquote(password)}, CHECK_POLICY = ON;\nGRANT CREATE ANY DATABASE TO ${bracket(name)};`, ctx);
  },
  projectUrl: (adminUrl, name, password) => mssqlWithAccount(mssqlWithDatabase(adminUrl, "master"), name, password),
  async ensure(projectUrl, names, ctx) {
    const account = parseMssql(projectUrl).user;
    const made = [];
    for (const db of names) {
      const row = runSql(projectUrl, `SELECT SUSER_SNAME(owner_sid) FROM sys.databases WHERE name = ${sqlquote(db)}`, ctx)[0];
      if (row) {
        if (row[0] !== account) throw new Error(`${db} already exists and belongs to ${row[0]}, not to this project's login ${account}. It was not touched.`);
        continue;
      }
      runSql(projectUrl, `CREATE DATABASE ${bracket(db)}`, ctx);
      made.push(db);
    }
    return made;
  },
  check: async (projectUrl, db, ctx) => runSql(mssqlWithDatabase(projectUrl, db), "SELECT 1", ctx),
  recreate: async (projectUrl, db, ctx) => runSql(projectUrl, `IF DB_ID(${sqlquote(db)}) IS NOT NULL BEGIN ALTER DATABASE ${bracket(db)} SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE ${bracket(db)}; END;\nCREATE DATABASE ${bracket(db)};`, ctx),
  drop: async (projectUrl, db, ctx) => runSql(projectUrl, `IF DB_ID(${sqlquote(db)}) IS NOT NULL BEGIN ALTER DATABASE ${bracket(db)} SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE ${bracket(db)}; END;`, ctx),
  appValue: (projectUrl, db, cfg) => mssqlAppString(mssqlWithDatabase(projectUrl, db), cfg.urlFormat || "ado"),
  maintenance: (projectUrl, cfg) => mssqlAppString(projectUrl, cfg.urlFormat || "ado"),
  local: {
    image: (v) => `mcr.microsoft.com/mssql/server:${v || "2022"}-latest`,
    internalPort: 1433,
    firstPort: 51433,
    environment: ['ACCEPT_EULA: "Y"', "MSSQL_SA_PASSWORD: ${DATABASE_LOCAL_PASSWORD:?run node scripts/db-setup.mjs local}"],
    healthcheck: '["CMD-SHELL", "SQLCMDPASSWORD=\\"$$MSSQL_SA_PASSWORD\\" /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -Q \\"SELECT 1\\" || exit 1"]',
    start: "40s",
    adminUrl: (port, password) => `sqlserver://sa:${encodeURIComponent(password)}@127.0.0.1:${port}/master?trustServerCertificate=true`,
    // The project's own container: its bundled sqlcmd, nothing to install.
    viaContainer: true,
  },
};

const redis = {
  kind: "cache",
  title: "Redis",
  parse: (input) => (parseRedisUrl(input), input),
  describe: (url) => {
    const p = parseRedisUrl(url);
    return `${p.user || "default"}@${p.host}:${p.port}`;
  },
  user: (url) => parseRedisUrl(url).user || "default",
  password: (url) => parseRedisUrl(url).password,
  // An admin may manage users (ACL); any other account is used as it is, inside the project's key prefix.
  async rights(url) {
    return withRedis(url, async (c) => {
      let name = "default";
      try {
        name = await c("ACL", "WHOAMI");
      } catch {
        return { name, kind: "account", missing: "", noAcl: true };
      }
      try {
        await c("ACL", "LIST");
        return { name, kind: "admin", missing: "" };
      } catch {
        await c("PING");
        return { name, kind: "account", missing: "" };
      }
    });
  },
  accountExists: (adminUrl, name) => withRedis(adminUrl, async (c) => (await c("ACL", "GETUSER", name)) !== null),
  // One user for the project: its keys and channels only, no admin commands. Saved when the server keeps an ACL file.
  createAccount: (adminUrl, name, password, ctx) => withRedis(adminUrl, async (c) => {
    await c("ACL", "SETUSER", name, "reset", "on", `>${password}`, `~${ctx.prefix}:*`, `&${ctx.prefix}:*`, "+@all", "-@admin", "-@dangerous");
    try {
      await c("ACL", "SAVE");
      ctx.saved = true;
    } catch {
      ctx.saved = false;
    }
  }),
  projectUrl: (adminUrl, name, password) => redisWithAccount(adminUrl, name, password),
  ensure: async () => [],
  check: (projectUrl, _db, ctx) => withRedis(projectUrl, async (c) => {
    await c("SET", `${ctx.prefix}:crewbook:check`, "1", "EX", "10");
    await c("GET", `${ctx.prefix}:crewbook:check`);
  }),
  appValue: (projectUrl) => projectUrl,
  local: {
    image: (v) => `redis:${v || "7"}-alpine`,
    internalPort: 6379,
    firstPort: 56379,
    environment: ["REDIS_PASSWORD: ${CACHE_LOCAL_PASSWORD:?run node scripts/db-setup.mjs local}"],
    // An ACL file in the volume keeps the project's user across restarts; the default user is the admin.
    command: '["sh", "-c", "[ -f /data/users.acl ] || echo \\"user default on >$$REDIS_PASSWORD ~* &* +@all\\" > /data/users.acl; exec redis-server --aclfile /data/users.acl --appendonly yes"]',
    healthcheck: '["CMD-SHELL", "REDISCLI_AUTH=\\"$$REDIS_PASSWORD\\" redis-cli --user default ping | grep -q PONG"]',
    adminUrl: (port, password) => `redis://default:${encodeURIComponent(password)}@127.0.0.1:${port}`,
  },
};

export const ENGINES = { postgres, mssql, redis };
