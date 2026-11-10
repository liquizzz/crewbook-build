// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// Behaviour of scripts/db-setup.mjs with real servers in Docker on this machine: the default local mode (PostgreSQL,
// SQL Server, Redis in each project's own Docker) and the existing mode (a server you already have, simulated by
// another project's local server reached through its admin connection string). It makes temporary projects and removes
// their containers and volumes at the end. Without Docker it runs the cases that need no server.
// Run: node kit/scripts/db-setup.test.mjs
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { literal, parseUrl, withPg } from "./pg-client.mjs";
import { parseMssql, runSql } from "./mssql-client.mjs";
import { parseRedisUrl, withRedis } from "./redis-client.mjs";

const scripts = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "db-setup-test-"));
let failed = 0;
let passed = 0;
const check = (what, ok) => {
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? "PASS" : "FAIL"} ${what}`);
};
const outputs = [];
const git = (dir, ...a) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...a], { cwd: dir, stdio: ["ignore", "pipe", "pipe"] }).toString().trim();

function makeProject(name, roles = ["lead", "dev", "frontend", "test"], services = { database: { engine: "postgres" } }) {
  const dir = path.join(tmp, name.toLowerCase());
  fs.mkdirSync(path.join(dir, ".claude"), { recursive: true });
  fs.cpSync(scripts, path.join(dir, "scripts"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".claude", "project.json"), JSON.stringify({ name, roles, services }, null, 2));
  fs.writeFileSync(path.join(dir, ".gitignore"), ".env.local\n");
  git(tmp, "init", "-q", "-b", "main", dir);
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "kit");
  for (const r of roles.filter((x) => x !== "lead")) git(dir, "worktree", "add", "-q", "-b", `role/${r}`, `${dir}-wt-${r}`);
  return dir;
}
const run = (dir, input, ...a) => {
  const r = spawnSync("node", [path.join("scripts", "db-setup.mjs"), ...a], { cwd: dir, input: input || "", encoding: "utf8", env: { ...process.env, ...(run.env || {}) } });
  outputs.push(r.stdout + r.stderr);
  return r;
};
const envOf = (file) => Object.fromEntries((fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "").split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const pj = (dir) => JSON.parse(fs.readFileSync(path.join(dir, ".claude", "project.json"), "utf8"));
const pgOwners = (admin, prefix) => withPg(admin, (q) => q(`SELECT d.datname AS db, r.rolname AS owner FROM pg_database d JOIN pg_roles r ON r.oid = d.datdba WHERE d.datname LIKE ${literal(prefix + "_%")} ORDER BY 1`));
const mainOnly = ["DATABASE_ADMIN_URL", "DATABASE_PROJECT_URL", "DATABASE_LOCAL_PASSWORD", "CACHE_ADMIN_URL", "CACHE_PROJECT_URL", "CACHE_LOCAL_PASSWORD"];

// Without a server.
{
  const p = makeProject("Plain", ["lead", "dev"], { database: { engine: "postgres" }, cache: { engine: "redis" } });
  const plan = run(p, "", "--plan");
  check("plan: one project account per service; databases per role; Redis keys under the project's prefix", plan.stdout.includes("plain_dev -> DEV_DATABASE_URL") && plan.stdout.includes("keys plain:*") && plan.stdout.includes("one account for the whole project"));
  const swap = run(p, "", "use", "database", "mssql");
  check("use: the engine is chosen before anything is set up", swap.status === 0 && pj(p).services.database.engine === "mssql");
  const bad = run(p, "not a url\n", "connect", "database");
  check("connect: a bad connection string changes nothing", bad.status === 1 && !fs.existsSync(path.join(p, ".env.local")));
}

const docker = spawnSync("docker", ["info"], { stdio: "ignore" }).status === 0;
const locals = [];
if (!docker) console.log("SKIP the server cases: Docker is not running.");
else {
  try {
    // 1. The default: everything local, in the project's own Docker.
    const A = makeProject("Alpha", ["lead", "dev", "frontend", "test"], { database: { engine: "postgres" }, cache: { engine: "redis" } });
    locals.push(A);
    const up = run(A, "", "local");
    const envA = envOf(path.join(A, ".env.local"));
    check("local: PostgreSQL and Redis start in the project's own Docker with one account each", up.status === 0 && pj(A).services.database.mode === "local" && pj(A).services.database.account === "alpha" && pj(A).services.cache.account === "alpha" && Boolean(envA.DATABASE_PROJECT_URL) && Boolean(envA.CACHE_PROJECT_URL));
    const ports = spawnSync("docker", ["ps", "--filter", "label=com.docker.compose.project=alpha-services", "--format", "{{.Ports}}"], { encoding: "utf8" }).stdout;
    check("local: the ports listen on 127.0.0.1 only", ports.includes("127.0.0.1:") && !/0\.0\.0\.0:\d+->/.test(ports));
    const created = run(A, "", "create");
    const ownedA = await pgOwners(envA.DATABASE_ADMIN_URL, "alpha");
    check("local: every database of the project is owned by its one account", created.status === 0 && ownedA.length === 4 && ownedA.every((r) => r.owner === "alpha"));
    const dev = envOf(`${A}-wt-dev/.env.local`);
    const fe = envOf(`${A}-wt-frontend/.env.local`);
    const te = envOf(`${A}-wt-test/.env.local`);
    check("roles: each gets its own DATABASE_URL and REDIS_PREFIX, same accounts, no admin or local password", parseUrl(dev.DATABASE_URL).database === "alpha_dev" && parseUrl(fe.DATABASE_URL).database === "alpha_frontend" && parseUrl(te.DATABASE_URL).database === "alpha_test" && dev.REDIS_PREFIX === "alpha:dev:" && fe.REDIS_PREFIX === "alpha:frontend:" && dev.REDIS_URL === fe.REDIS_URL && [dev, fe, te].every((e) => mainOnly.every((k) => !e[k])));
    const checkA = run(A, "", "check");
    check("check: the accounts reach every database and the project's keys", checkA.status === 0 && checkA.stdout.includes("ok    Redis alpha:*"));
    // Redis: the project account stays inside its prefix.
    const noperm = await withRedis(envA.CACHE_PROJECT_URL, async (c) => {
      await c("SET", "alpha:dev:x", "1");
      try {
        await c("SET", "other:x", "1");
        return false;
      } catch (e) {
        return /NOPERM/.test(e.message);
      }
    });
    check("Redis: the project account may use its own keys and nothing else", noperm);
    // Data survives a stop; a run again changes no port, password or database.
    await withPg(dev.DATABASE_URL, (q) => q("CREATE TABLE notes (id int); INSERT INTO notes VALUES (1)"));
    const portA = pj(A).services.database.port;
    const stop = run(A, "", "local", "stop");
    const again = run(A, "", "local");
    const createdAgain = run(A, "", "create");
    const rows = await withPg(dev.DATABASE_URL, (q) => q("SELECT count(*) AS n FROM notes"));
    check("resume: stop and start keep the data; the port, the passwords and the databases stay as they were", stop.status === 0 && again.status === 0 && pj(A).services.database.port === portA && envOf(path.join(A, ".env.local")).DATABASE_PROJECT_URL === envA.DATABASE_PROJECT_URL && createdAgain.stdout.includes("nothing created") && rows[0].n === "1");

    // A second local project: its own containers, ports and data.
    const M = makeProject("Mike", ["lead", "dev"], { database: { engine: "mssql" }, cache: { engine: "redis" } });
    locals.push(M);
    const upM = run(M, "", "local");
    const createM = run(M, "", "create");
    const envM = envOf(path.join(M, ".env.local"));
    const devM = envOf(`${M}-wt-dev/.env.local`);
    check("local SQL Server: a login for the project owns its databases; nothing to install (the container's sqlcmd)", upM.status === 0 && createM.status === 0 && pj(M).services.database.account === "mike" && /^Server=127\.0\.0\.1,\d+;Database=mike_dev;User Id=mike;/.test(devM.DATABASE_URL || ""));
    const ownersM = runSql(envM.DATABASE_ADMIN_URL, "SELECT name, SUSER_SNAME(owner_sid) FROM sys.databases WHERE name LIKE 'mike[_]%' ORDER BY name");
    check("local SQL Server: mike_dev and mike_staging belong to the login mike", ownersM.length === 2 && ownersM.every((r) => r[1] === "mike"));
    check("two local projects: their own compose projects, ports and accounts", pj(M).services.database.port !== portA && pj(M).services.cache.port !== pj(A).services.cache.port && parseRedisUrl(envM.CACHE_PROJECT_URL).port !== parseRedisUrl(envA.CACHE_PROJECT_URL).port);

    // 2. Existing servers: another project's local server stands in for a company server.
    const B = makeProject("Bravo", ["lead", "dev"], { database: { engine: "postgres" }, cache: { engine: "redis" } });
    const connB = run(B, envA.DATABASE_ADMIN_URL + "\n", "connect", "database");
    const createB = run(B, "", "create");
    const connBc = run(B, envA.CACHE_ADMIN_URL + "\n", "connect", "cache");
    const ownedB = await pgOwners(envA.DATABASE_ADMIN_URL, "bravo");
    const logins = await withPg(envA.DATABASE_ADMIN_URL, (q) => q("SELECT rolname FROM pg_roles WHERE rolcanlogin AND rolname <> 'postgres' ORDER BY 1"));
    check("existing PostgreSQL with an admin: exactly one account bravo, owner of every database of B", connB.status === 0 && createB.status === 0 && pj(B).services.database.mode === "existing" && ownedB.length === 2 && ownedB.every((r) => r.owner === "bravo") && logins.map((r) => r.rolname).join(",") === "alpha,bravo");
    check("existing Redis with an admin: one user bravo, limited to bravo:*", connBc.status === 0 && parseRedisUrl(envOf(path.join(B, ".env.local")).CACHE_PROJECT_URL).user === "bravo" && /~bravo:\*/.test((await withRedis(envA.CACHE_ADMIN_URL, (c) => c("ACL", "LIST"))).join(" ")));
    check("existing: B starts no container and has no compose of its own", !fs.existsSync(path.join(B, "docker", "services-compose.yml")));

    // An account that may already create databases: used as it is.
    await withPg(envA.DATABASE_ADMIN_URL, (q) => q("CREATE ROLE delta_owner LOGIN PASSWORD 'd3lta-pass-xyz' CREATEDB"));
    const D = makeProject("Delta", ["lead", "dev"]);
    const connD = run(D, `postgresql://delta_owner:d3lta-pass-xyz@127.0.0.1:${portA}/postgres?sslmode=disable\n`, "connect", "database");
    const createD = run(D, "", "create");
    const ownedD = await pgOwners(envA.DATABASE_ADMIN_URL, "delta");
    check("existing PostgreSQL with an account that may create databases: no login created, it owns them all", connD.status === 0 && createD.status === 0 && pj(D).services.database.provisioning === "account" && ownedD.every((r) => r.owner === "delta_owner") && ownedD.length === 2);

    // Not enough rights: refused, nothing stored.
    await withPg(envA.DATABASE_ADMIN_URL, (q) => q("CREATE ROLE echo_low LOGIN PASSWORD 'ech0-pass-xyz' NOCREATEDB"));
    const E = makeProject("Echo", ["lead", "dev"]);
    const connE = run(E, `postgresql://echo_low:ech0-pass-xyz@127.0.0.1:${portA}/postgres?sslmode=disable\n`, "connect", "database");
    check("existing: an account that may not create databases is refused with what it lacks; nothing stored", connE.status === 1 && connE.stderr.includes("CREATEDB") && !fs.existsSync(path.join(E, ".env.local")));

    // Existing SQL Server: sqlcmd on this machine, with the owner's OK to install it.
    const N = makeProject("November", ["lead", "dev"], { database: { engine: "mssql" } });
    run.env = { CREWBOOK_SQLCMD: "none" };
    const noTool = run(N, envM.DATABASE_ADMIN_URL + "\n", "connect", "database");
    run.env = {};
    check("existing SQL Server without sqlcmd: asks for the owner's OK to install it; nothing stored", noTool.status === 1 && noTool.stderr.includes("winget install sqlcmd") && !fs.existsSync(path.join(N, ".env.local")));
    const hasSqlcmd = !spawnSync("sqlcmd", ["-?"], { stdio: "ignore" }).error;
    if (!hasSqlcmd) console.log("SKIP existing SQL Server with sqlcmd: sqlcmd is not installed here.");
    else {
      const p = parseMssql(envM.DATABASE_ADMIN_URL);
      const ado = `Server=127.0.0.1,${p.port};User Id=sa;Password=${p.password};TrustServerCertificate=True`;
      const connN = run(N, ado + "\n", "connect", "database");
      const createN = run(N, "", "create");
      const ownersN = runSql(envM.DATABASE_ADMIN_URL, "SELECT name, SUSER_SNAME(owner_sid) FROM sys.databases WHERE name LIKE 'november[_]%' ORDER BY name");
      check("existing SQL Server with an admin (ADO.NET string): one login november owns its databases", connN.status === 0 && createN.status === 0 && ownersN.length === 2 && ownersN.every((r) => r[1] === "november"));
      const oscarPw = "0scar-Pass-xyz!";
      runSql(envM.DATABASE_ADMIN_URL, `CREATE LOGIN oscar_owner WITH PASSWORD = N'${oscarPw}', CHECK_POLICY = ON; GRANT CREATE ANY DATABASE TO oscar_owner;`);
      const O = makeProject("Oscar", ["lead", "dev"], { database: { engine: "mssql" } });
      const connO = run(O, `Server=127.0.0.1,${p.port};User Id=oscar_owner;Password=${oscarPw};TrustServerCertificate=True\n`, "connect", "database");
      const createO = run(O, "", "create");
      const oscarLogin = runSql(envM.DATABASE_ADMIN_URL, "SELECT name FROM sys.server_principals WHERE name = N'oscar'");
      check("existing SQL Server with a login that may create databases: used as it is, no login created", connO.status === 0 && createO.status === 0 && pj(O).services.database.provisioning === "account" && oscarLogin.length === 0);
    }

    // No secret in any output or tracked file.
    const known = [envA.DATABASE_ADMIN_URL, envA.DATABASE_PROJECT_URL, envA.CACHE_PROJECT_URL, envM.DATABASE_ADMIN_URL].map((u) => (u.startsWith("sqlserver") ? parseMssql(u).password : u.startsWith("redis") ? parseRedisUrl(u).password : parseUrl(u).password));
    check("secrets: no password appears in any output", !outputs.some((o) => known.some((s) => s && o.includes(s))));
    check("secrets: the tracked files and the generated compose hold none", !known.some((s) => s && (spawnSync("git", ["grep", "-I", "-q", "-e", s, "--", "."], { cwd: A }).status === 0 || fs.readFileSync(path.join(A, "docker", "services-compose.yml"), "utf8").includes(s) || fs.readFileSync(path.join(A, ".claude", "project.json"), "utf8").includes(s))));
  } catch (e) {
    failed++;
    console.log(`FAIL (error) ${e.message}`);
  } finally {
    for (const dir of locals) run(dir, "", "local", "destroy", "--confirm");
  }
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
