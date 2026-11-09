#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// The project's PostgreSQL databases, reached through a connection string wherever the server runs (installed on this
// machine, in Docker, online, behind NAT). Two kinds of environment, chosen at setup:
//   existing  a server you already have. You give a connection string; Crewbook never starts, stops, upgrades or
//             reconfigures that server, and touches only this project's account and databases.
//   managed   a server Crewbook creates for this project (Docker on this machine for now), with its compose, its name,
//             its port and its credentials kept in this project. Other projects may use it as an existing server.
// Each project has ONE account that owns all its databases (dev, frontend, test, staging, the CI databases, a shadow
// database when the stack needs one); every role gets a URL to its own database with that same account.
//
//   node scripts/db-setup.mjs connect          (the owner, in a terminal) paste a connection string, hidden. An admin
//                                               one: Crewbook creates the project account. An account that may create
//                                               databases: it becomes the project account. Anything less is refused.
//   node scripts/db-setup.mjs managed create [--adapter docker] [--version 17]   (the owner) a server for this project
//   node scripts/db-setup.mjs managed up | status | down --confirm | destroy --confirm   its life cycle (the owner)
//   node scripts/db-setup.mjs create            every project database, owned by the project account; then env
//   node scripts/db-setup.mjs env               each checkout's connection strings, each role's DATABASE_URL
//   node scripts/db-setup.mjs check             the project account opens each database (from this machine)
//   node scripts/db-setup.mjs status            the environment, the account, the databases, what is pending; never a secret
//   node scripts/db-setup.mjs reset <db> | reset-check | migrate <db> | seed <db> [small|full]
//   node scripts/db-setup.mjs backup | restore <file> [db]
//   node scripts/db-setup.mjs admin-url         (the owner, in a terminal) prints the admin connection string, to give
//                                               another project; sessions cannot run it
//   node scripts/db-setup.mjs adopt-legacy      (the owner) move a project from the old model (one login per role on the
//                                               machine's shared server) to one project account; old logins are kept
//   node scripts/db-setup.mjs --plan            what create would make, with no server
//
// Configuration, with no secret in it: "database" in .claude/project.json (committed). Secret values: the main checkout's
// .env.local only: DB_PROJECT_URL (the project account), DB_ADMIN_URL (an admin, when given or managed), and the URLs
// derived for each database. Worktrees get the derived URLs, never DB_ADMIN_URL or DB_PROJECT_URL. Nothing here prints
// a password or a whole connection string.
import { execFileSync, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, ident, literal, parseUrl, withAccount, withDatabase, withPg } from "./pg-client.mjs";
import { MAIN_ONLY_KEYS, ROLE_DATABASE_KEY, readProject, writeProject } from "./project-level.mjs";

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const [cmd, a1, a2] = args.filter((x) => !x.startsWith("--"));
const flag = (f) => args.includes(f);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
};
const fail = (m, code = 1) => {
  console.error(m);
  process.exit(code);
};
const project = () => readProject(here) || {};
const cfg = () => project().database || {};
const saveCfg = (next) => writeProject(here, { ...project(), database: { ...cfg(), ...next } });
const legacyCfg = project().db || {};
const name = (project().name || path.basename(here)).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const P = cfg().prefix || legacyCfg.prefix || name;
const roles = project().roles || ["lead", "dev"];

// The project's databases and the .env.local key of each. All are owned by the one project account.
const DBS = [
  { db: `${P}_dev`, env: "DEV_DATABASE_URL" },
  ...(cfg().shadow || legacyCfg.shadow ? [{ db: `${P}_dev_shadow`, env: "DEV_SHADOW_DATABASE_URL" }] : []),
  ...(roles.includes("frontend") ? [{ db: `${P}_frontend`, env: "FRONTEND_DATABASE_URL" }] : []),
  ...(roles.includes("test") ? [{ db: `${P}_test`, env: "TEST_DATABASE_URL" }] : []),
  { db: `${P}_staging`, env: "STAGING_DATABASE_URL" },
];
const ROLE_DB = Object.fromEntries(Object.entries(ROLE_DATABASE_KEY).map(([role, key]) => [`role/${role}`, key]));
const MAIN_ONLY = MAIN_ONLY_KEYS;

// ---------- the project's .env.local files ----------

function checkouts() {
  const out = execFileSync("git", ["worktree", "list", "--porcelain"], { encoding: "utf8", cwd: here });
  const list = [];
  let cur = null;
  for (const l of out.split(/\r?\n/)) {
    if (l.startsWith("worktree ")) list.push((cur = { dir: l.slice(9), branch: "" }));
    else if (l.startsWith("branch ") && cur) cur.branch = l.slice(7).replace("refs/heads/", "");
  }
  return list;
}
const mainDir = () => checkouts()[0].dir;
const mainEnvFile = () => path.join(mainDir(), ".env.local");
function readEnv(file = mainEnvFile()) {
  const m = new Map();
  if (fs.existsSync(file)) for (const l of fs.readFileSync(file, "utf8").split(/\r?\n/)) if (/^[A-Z][A-Z0-9_]*=/.test(l)) m.set(l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1));
  return m;
}
function writeEnv(file, values) {
  let text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  for (const [k, v] of Object.entries(values)) {
    if (v === null) {
      text = text.replace(new RegExp(`^${k}=.*(\\r?\\n|$)`, "m"), "");
      continue;
    }
    if (new RegExp(`^${k}=`, "m").test(text)) text = text.replace(new RegExp(`^${k}=.*$`, "m"), () => `${k}=${v}`);
    else text += `${text && !text.endsWith("\n") ? "\n" : ""}${k}=${v}\n`;
  }
  fs.writeFileSync(file, text);
}

// ---------- reading a secret ----------

function readHidden(prompt) {
  if (!process.stdin.isTTY) return Promise.resolve(fs.readFileSync(0, "utf8").split(/\r?\n/)[0].trim());
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    let value = "";
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", function onData(chunk) {
      for (const c of chunk) {
        if (c === "\r" || c === "\n") {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener("data", onData);
          process.stdout.write("\n");
          return resolve(value.trim());
        }
        if (c === "\u0003") {
          process.stdout.write("\nStopped; nothing was changed.\n");
          process.exit(1);
        }
        if (c === "\u007f" || c === "\b") value = value.slice(0, -1);
        else value += c;
      }
    });
  });
}
const newPassword = () => crypto.randomBytes(24).toString("base64url");
// Messages from the server never carry the password; strip a connection string anyway.
const safe = (e) => String(e && e.message ? e.message : e).replace(/postgres(ql)?:\/\/[^\s]+/gi, "<connection string>");

// ---------- what an account may do ----------

async function rights(url) {
  return withPg(url, async (q) => {
    const [r] = await q("SELECT current_user AS name, rolsuper, rolcreaterole, rolcreatedb FROM pg_roles WHERE rolname = current_user");
    return { name: r.name, superuser: r.rolsuper === "t", createRole: r.rolcreaterole === "t", createDb: r.rolcreatedb === "t" };
  });
}
const kindOf = (r) => (r.superuser || (r.createRole && r.createDb) ? "admin" : r.createDb ? "account" : null);

// ---------- connect: the project account, from an admin or as given ----------

async function provisionFromAdmin(adminUrl) {
  const account = cfg().account || P;
  const env = readEnv();
  // The project account's password: kept across runs, never changed by setup.
  const existingUrl = env.get("DB_PROJECT_URL");
  const kept = existingUrl && parseUrl(existingUrl).user === account ? parseUrl(existingUrl).password : null;
  const password = kept || newPassword();
  await withPg(adminUrl, async (q) => {
    const [found] = await q(`SELECT rolname FROM pg_roles WHERE rolname = ${literal(account)}`);
    if (found && !kept) fail(`A login named ${account} already exists on ${describe(adminUrl).split("@")[1].replace(/\/.*$/, "")} and is not recorded as this project's. Nothing was changed. Use another prefix ("database": { "prefix": … } in .claude/project.json), or connect with that account's own connection string.`);
    if (!found) await q(`CREATE ROLE ${ident(account)} LOGIN PASSWORD ${literal(password)} CREATEDB NOSUPERUSER NOCREATEROLE`);
  });
  const projectUrl = withAccount(withDatabase(adminUrl, parseUrl(adminUrl).database || "postgres"), account, password);
  writeEnv(mainEnvFile(), { DB_ADMIN_URL: adminUrl, DB_PROJECT_URL: projectUrl });
  saveCfg({ engine: "postgres", account, provisioning: "admin", prefix: P });
  return account;
}

async function connectCmd() {
  const given = await readHidden("Paste the PostgreSQL connection string (it will not be shown), then press Enter: ");
  if (!given) fail("No connection string given; nothing was changed.");
  let r;
  try {
    r = await rights(given);
  } catch (e) {
    fail(`Could not sign in to ${describe(given).replace(/^[^@]*@/, "")}: ${safe(e)}. Nothing was changed.`);
  }
  const kind = kindOf(r);
  if (!kind) fail(`${r.name} may not create databases (it needs CREATEDB, or an admin that can create logins and databases). Nothing was changed; ask the server's owner for one of the two, then run this again.`);
  const env = readEnv();
  if (kind === "admin") {
    // Already provisioned: only the admin connection string is updated (a changed admin password, say); the project
    // account keeps its own password.
    if (env.get("DB_PROJECT_URL") && cfg().account) {
      writeEnv(mainEnvFile(), { DB_ADMIN_URL: given });
      console.log(`Admin connection updated. The project account ${cfg().account} is unchanged.`);
    } else {
      const account = await provisionFromAdmin(given);
      console.log(`Signed in as an admin (${r.name}). Project account ${account} ready: it owns every database of this project. The admin stays in the main checkout's .env.local only.`);
    }
  } else {
    if (cfg().account && cfg().account !== r.name) fail(`This project already uses the account ${cfg().account}; ${r.name} was not recorded. Nothing was changed.`);
    writeEnv(mainEnvFile(), { DB_PROJECT_URL: given });
    saveCfg({ engine: "postgres", account: r.name, provisioning: "account", prefix: P });
    console.log(`Signed in as ${r.name}, which may create databases: it is the project account and owns every database of this project. No other login is created.`);
  }
  if (!cfg().type) saveCfg({ type: "existing" });
  console.log("Next: node scripts/db-setup.mjs create");
}

// ---------- create, env, check ----------

const projectUrl = () => readEnv().get("DB_PROJECT_URL") || fail("No project account yet: the owner runs node scripts/db-setup.mjs connect (or managed create) in a terminal.");

async function createCmd() {
  const url = projectUrl();
  const account = parseUrl(url).user;
  const made = [];
  try {
    await withPg(url, async (q) => {
      for (const { db } of DBS) {
        const [row] = await q(`SELECT r.rolname AS owner FROM pg_database d JOIN pg_roles r ON r.oid = d.datdba WHERE d.datname = ${literal(db)}`);
        if (row) {
          if (row.owner !== account) fail(`${db} already exists and belongs to ${row.owner}, not to this project's account ${account}. It was not touched; choose another prefix or ask its owner.`);
          continue;
        }
        await q(`CREATE DATABASE ${ident(db)}`);
        await q(`REVOKE CONNECT ON DATABASE ${ident(db)} FROM PUBLIC`);
        made.push(db);
      }
    });
  } catch (e) {
    fail(`Could not create the databases: ${safe(e)}.`);
  }
  saveCfg({ databases: DBS.map((d) => d.db), created: new Date().toISOString().slice(0, 10) });
  console.log(made.length ? `Created: ${made.join(", ")} (owner ${account}).` : `Every database exists already, owned by ${account}; nothing created.`);
  envCmd();
}

// Each checkout: the derived URLs and the role's DATABASE_URL; the main checkout keeps the admin and the project URL.
function envCmd() {
  const url = projectUrl();
  const values = Object.fromEntries(DBS.map((d) => [d.env, withDatabase(url, d.db)]));
  values.CI_DATABASE_URL = withDatabase(url, parseUrl(url).database);
  values.CI_DB_PREFIX = `${P}_ci_`;
  const list = checkouts();
  for (const c of list) {
    const own = { ...values };
    const key = ROLE_DB[c.branch];
    if (key && values[key]) own.DATABASE_URL = values[key];
    if (key === "DEV_DATABASE_URL" && values.DEV_SHADOW_DATABASE_URL) own.SHADOW_DATABASE_URL = values.DEV_SHADOW_DATABASE_URL;
    if (c.dir !== list[0].dir) for (const k of MAIN_ONLY) own[k] = null;
    writeEnv(path.join(c.dir, ".env.local"), own);
  }
  console.log(`Connection strings written to .env.local of ${list.length} checkout${list.length === 1 ? "" : "s"} (git-ignored, not shown); the admin stays in the main checkout only.`);
}

async function checkCmd() {
  const url = projectUrl();
  let bad = 0;
  for (const d of DBS) {
    try {
      await withPg(withDatabase(url, d.db), (q) => q("SELECT 1"));
      console.log(`  ok    ${d.db}`);
    } catch (e) {
      console.log(`  FAIL  ${d.db}: ${safe(e)}`);
      bad++;
    }
  }
  const where = `this machine (${os.hostname()})`;
  saveCfg({ checked: { ...(cfg().checked || {}), [where]: bad ? "failed" : new Date().toISOString().slice(0, 10) } });
  console.log(`Checked from ${where} as ${parseUrl(url).user} on ${parseUrl(url).host}:${parseUrl(url).port}. Other places (the app's containers, a build host, a staging server) reach the server by their own route: check there too before calling them ready.`);
  if (bad) fail(`${bad} database(s) not reachable.`);
}

// ---------- status ----------

function isLegacy() {
  if (cfg().account) return null;
  const env = readEnv();
  if (env.get("DEV_DATABASE_URL") && !env.get("DB_PROJECT_URL")) return "one login per role";
  if (project().db) return '"db" in .claude/project.json';
  return null;
}
function statusCmd() {
  const c = cfg();
  const env = readEnv();
  console.log(`Engine: postgres · environment: ${c.type || "not chosen"}${c.provisioning ? ` · project account: ${c.account} (${c.provisioning === "admin" ? "created from an admin" : "given"})` : ""}`);
  if (env.get("DB_PROJECT_URL")) console.log(`Server: ${parseUrl(env.get("DB_PROJECT_URL")).host}:${parseUrl(env.get("DB_PROJECT_URL")).port}`);
  console.log(`Databases: ${DBS.map((d) => d.db).join(", ")}${c.created ? ` (created ${c.created})` : " (not created yet)"}`);
  if (c.managed) console.log(`Managed server: ${c.managed.adapter}, compose project ${c.managed.project}, port ${c.managed.port}`);
  const checked = Object.entries(c.checked || {});
  console.log(`Checked: ${checked.length ? checked.map(([w, d]) => `${w} ${d}`).join("; ") : "not yet"}; other places pending until checked there.`);
  const legacy = isLegacy();
  if (legacy) console.log(`Old model found (${legacy}). After a backup, connect with the old server's admin, then node scripts/db-setup.mjs adopt-legacy (see /cb-env).`);
}

// ---------- migrate, seed, reset ----------

const urlFor = (db) => {
  if (!DBS.some((x) => x.db === db) && db !== `${P}_reset_check` && db !== `${P}_restore_check`) fail(`Not a database of this project: ${db}. Known: ${DBS.map((x) => x.db).join(", ")}`);
  return withDatabase(projectUrl(), db);
};
function runCmd(command, url) {
  if (!command) {
    console.log('Nothing to run: set it under "database" in .claude/project.json.');
    return true;
  }
  return spawnSync(command, { cwd: here, shell: true, stdio: "inherit", env: { ...process.env, DATABASE_URL: url } }).status === 0;
}
const local = (url) => {
  const u = new URL(url);
  if (["localhost", "127.0.0.1", "::1", "[::1]"].includes(u.hostname)) u.hostname = "host.docker.internal";
  return u.toString();
};
function inImage(image, command, url) {
  return spawnSync("docker", ["run", "--rm", "--add-host=host.docker.internal:host-gateway", "-e", "DATABASE_URL", "--entrypoint", "sh", image, "-c", command], { stdio: "inherit", env: { ...process.env, DATABASE_URL: local(url) } }).status === 0;
}
const conf = (k) => cfg()[k] ?? legacyCfg[k];
function migrate(db) {
  const url = urlFor(db);
  const image = process.env.CREWBOOK_API_IMAGE;
  if (!(image && conf("migrateInImage") ? inImage(image, conf("migrateInImage"), url) : runCmd(conf("migrate"), url))) fail("Migration failed.");
}
function seed(db, size = "small") {
  if (!["small", "full"].includes(size)) fail("Usage: seed <db> [small|full]");
  if (!runCmd(conf("seed") && conf("seed").replace("{size}", size), urlFor(db))) fail("Seed failed.");
}
async function recreate(db) {
  await withPg(projectUrl(), async (q) => {
    await q(`DROP DATABASE IF EXISTS ${ident(db)} WITH (FORCE)`);
    await q(`CREATE DATABASE ${ident(db)}`);
    await q(`REVOKE CONNECT ON DATABASE ${ident(db)} FROM PUBLIC`);
  });
}
async function resetCmd(db) {
  if (!db) fail("Usage: reset <db>");
  urlFor(db);
  if (db.endsWith("_staging") && !flag("--confirm")) fail(`${db} holds the milestone's data: take a backup, then reset it with --confirm.`);
  await recreate(db);
  if (!db.endsWith("_shadow")) {
    migrate(db);
    seed(db, "small");
  }
  console.log(`${db} reset: dropped, created${db.endsWith("_shadow") ? "" : ", migrated, seeded small"}.`);
}
// Proof that a reset works, on a scratch database made for it, never on a database that holds anyone's data.
async function resetCheckCmd() {
  const db = `${P}_reset_check`;
  await recreate(db);
  migrate(db);
  seed(db, "small");
  await withPg(projectUrl(), (q) => q(`DROP DATABASE IF EXISTS ${ident(db)} WITH (FORCE)`));
  console.log(`Reset works: ${db} was created, migrated, seeded and dropped.`);
}

// ---------- backup, restore (pg_dump / pg_restore here, else in a postgres image) ----------

const have = (bin) => spawnSync(bin, ["--version"], { stdio: "ignore" }).status === 0;
function pgTool(tool, url, extra, input) {
  // The URL goes in through the environment, never the command line.
  if (have(tool)) return spawnSync(process.platform === "win32" ? "cmd" : "sh", process.platform === "win32" ? ["/c", `${tool} ${extra.join(" ")} --dbname "%DBURL%"`] : ["-c", `${tool} ${extra.join(" ")} --dbname "$DBURL"`], { input, maxBuffer: 1 << 30, env: { ...process.env, DBURL: url } });
  const image = `postgres:${cfg().managed?.version || 17}-alpine`;
  return spawnSync("docker", ["run", "--rm", "-i", "--add-host=host.docker.internal:host-gateway", "-e", "DBURL", image, "sh", "-c", `${tool} ${extra.join(" ")} --dbname "$DBURL"`], { input, maxBuffer: 1 << 30, env: { ...process.env, DBURL: local(url) } });
}
function backupCmd() {
  const dir = path.join(os.homedir(), ".crewbook", "backups", P);
  fs.mkdirSync(dir, { recursive: true });
  const r = pgTool("pg_dump", urlFor(`${P}_staging`), ["-Fc"]);
  if (r.status !== 0) fail("pg_dump failed (install the PostgreSQL client tools, or Docker to use them from an image).");
  const file = path.join(dir, `${P}_staging_${new Date().toISOString().replace(/[:.]/g, "-")}.dump`);
  fs.writeFileSync(file, r.stdout);
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".dump") && !f.includes("_release_")).sort().reverse().slice(3)) fs.rmSync(path.join(dir, f));
  console.log(`Backup written: ${file}`);
}
async function restoreCmd(file, db = `${P}_restore_check`) {
  if (!file || !fs.existsSync(file)) fail(`No file ${file}`);
  urlFor(db);
  await recreate(db);
  // Restored by the project account: it owns every object, as in every other database of the project.
  const r = pgTool("pg_restore", withDatabase(projectUrl(), db), ["--no-owner", "--no-acl"], fs.readFileSync(file));
  if (r.status !== 0) fail("pg_restore failed.");
  console.log(`Restored into ${db}, owned by ${parseUrl(projectUrl()).user}.`);
}

// ---------- managed: a server for this project ----------

const managedProject = () => `${P.replace(/_/g, "-")}-db`;
const composeFile = () => path.join(here, "docker", "db-compose.yml");
const listenable = (port, host) => new Promise((resolve) => {
  const s = net.createServer().once("error", () => resolve(false)).once("listening", () => s.close(() => resolve(true)));
  s.listen(port, host);
});
// Free here and not published by any container (Docker Desktop holds its ports where a plain listen does not see them).
const published = () => {
  const r = spawnSync("docker", ["ps", "-a", "--format", "{{.Ports}}"], { encoding: "utf8" });
  return new Set([...(r.stdout || "").matchAll(/:(\d+)->/g)].map((m) => Number(m[1])));
};
const portFree = async (port, taken) => !taken.has(port) && (await listenable(port, "0.0.0.0")) && (await listenable(port, "127.0.0.1"));
// The managed server's values for docker compose, from this process only.
const MANAGED_KEY = "DB_MANAGED_ADMIN_PASSWORD";
const managedEnv = (pw, port) => ({ [MANAGED_KEY]: pw, DB_MANAGED_PORT: String(port) });
function compose(a, extraEnv = {}) {
  const env = { ...process.env, DB_MANAGED_ADMIN_PASSWORD: readEnv().get("DB_MANAGED_ADMIN_PASSWORD") || "", DB_MANAGED_PORT: String(cfg().managed?.port || ""), ...extraEnv };
  return spawnSync("docker", ["compose", "-p", managedProject(), "-f", composeFile(), ...a], { cwd: here, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", env });
}
// Databases on the server that are not this project's (other projects using it).
async function otherProjects() {
  const admin = readEnv().get("DB_ADMIN_URL");
  if (!admin) return [];
  try {
    const rows = await withPg(admin, (q) => q("SELECT datname FROM pg_database WHERE NOT datistemplate AND datname <> 'postgres'"));
    return [...new Set(rows.map((r) => r.datname).filter((d) => !d.startsWith(`${P}_`)).map((d) => d.replace(/_(dev|dev_shadow|frontend|test|staging|ci_.*)$/, "")))];
  } catch {
    return ["(could not be listed)"];
  }
}
async function managedCmd(sub) {
  const m = cfg().managed;
  if (sub === "status") {
    if (!m) return console.log("No managed server in this project.");
    const ps = compose(["ps", "--format", "{{.Name}} {{.State}}"]);
    return console.log(`Managed server (${m.adapter}): compose project ${m.project}, port ${m.port}: ${(ps.stdout || "").trim() || "not running"}`);
  }
  if (sub === "up") {
    if (!m) fail("No managed server in this project: managed create first.");
    const r = compose(["up", "-d", "--wait"]);
    if (r.status !== 0) fail(`Could not start it: ${(r.stderr || "").trim().split(/\r?\n/).pop()}`);
    return console.log(`Managed server running: compose project ${m.project}, port ${m.port}.`);
  }
  if (sub === "down" || sub === "destroy") {
    if (!m) fail("No managed server in this project.");
    const others = await otherProjects();
    if (!flag("--confirm")) fail(`This ${sub === "destroy" ? "stops the server and deletes its data" : "stops the server"} (${m.project}). ${others.length ? `Other projects use it: ${others.join(", ")}; they lose their databases${sub === "destroy" ? " for good" : " until it starts again"}.` : "No other project's database was found on it."} Run again with --confirm to go ahead.`);
    const r = compose(sub === "destroy" ? ["down", "-v"] : ["stop"]);
    if (r.status !== 0) fail("docker compose failed.");
    return console.log(sub === "destroy" ? "Server and data removed." : "Server stopped; its data is kept. managed up starts it again.");
  }
  if (sub !== "create") fail("Usage: node scripts/db-setup.mjs managed create | up | status | down --confirm | destroy --confirm");
  const adapter = option("--adapter", "docker");
  if (adapter !== "docker") fail(`A managed server on "${adapter}" is not supported yet. Install and run the server yourself, then choose "I have an environment" (node scripts/db-setup.mjs connect). The environment step stays not done.`, 2);
  if (cfg().type === "existing" && cfg().account) fail("This project already uses an existing server; managed create was not run.");
  if (spawnSync("docker", ["compose", "version"], { stdio: "ignore" }).status !== 0) fail("Docker with Compose v2 is needed for a managed server on this machine.");
  const version = option("--version", m?.version || "17");
  if (!fs.existsSync(composeFile())) {
    fs.mkdirSync(path.dirname(composeFile()), { recursive: true });
    fs.writeFileSync(composeFile(), [
      "# This project's own PostgreSQL server (node scripts/db-setup.mjs managed ...). Its life cycle is separate from the",
      "# app's: stopping the app never stops it. The password comes from the main checkout's .env.local, never this file.",
      "# Other projects may use it as an existing server; they never start, stop or change it.",
      "services:",
      "  postgres:",
      `    image: postgres:${version}-alpine`,
      "    environment:",
      "      POSTGRES_PASSWORD: ${DB_MANAGED_ADMIN_PASSWORD:?run node scripts/db-setup.mjs managed create}",
      '    ports: ["${DB_MANAGED_PORT:?}:5432"]',
      '    volumes: ["data:/var/lib/postgresql/data"]',
      "    restart: unless-stopped",
      "    healthcheck:",
      '      test: ["CMD-SHELL", "pg_isready -U postgres"]',
      "      interval: 3s",
      "      timeout: 3s",
      "      retries: 30",
      "volumes:",
      "  data:",
      "",
    ].join("\n"));
  }
  // A port of its own, chosen once and kept; the server listens on 5432 inside, clients use this one.
  let port = m?.port;
  if (!port) {
    const taken = published();
    for (port = Number(option("--port", 55432)); !(await portFree(port, taken)); port++);
  }
  const env = readEnv();
  const adminPassword = env.get("DB_MANAGED_ADMIN_PASSWORD") || newPassword();
  writeEnv(mainEnvFile(), { [MANAGED_KEY]: adminPassword });
  saveCfg({ type: "managed", engine: "postgres", prefix: P, managed: { adapter, project: managedProject(), port, version, compose: "docker/db-compose.yml" } });
  const up = compose(["up", "-d", "--wait"], managedEnv(adminPassword, port));
  if (up.status !== 0) fail(`The server did not start: ${(up.stderr || "").trim().split(/\r?\n/).pop()}`);
  const adminUrl = env.get("DB_ADMIN_URL") || `postgresql://postgres:${encodeURIComponent(adminPassword)}@localhost:${port}/postgres?sslmode=disable`;
  if (!env.get("DB_PROJECT_URL")) await provisionFromAdmin(adminUrl);
  else writeEnv(mainEnvFile(), { DB_ADMIN_URL: adminUrl });
  console.log(`Managed server running: compose project ${managedProject()}, port ${port}. Project account ${cfg().account} ready. The admin and the passwords are in the main checkout's .env.local, never shown. Next: node scripts/db-setup.mjs create`);
}

// ---------- the old model: one login per role on the machine's shared server ----------

async function adoptLegacyCmd() {
  const env = readEnv();
  const admin = env.get("DB_ADMIN_URL") || fail("Connect with the old server's admin first (node scripts/db-setup.mjs connect), after a backup.");
  if (!cfg().account || !env.get("DB_PROJECT_URL")) await provisionFromAdmin(admin);
  const account = cfg().account;
  const oldLogins = new Set();
  for (const d of DBS) {
    const old = env.get(d.env);
    if (old) oldLogins.add(parseUrl(old).user);
  }
  const oldCi = env.get("CI_DATABASE_URL");
  if (oldCi) oldLogins.add(parseUrl(oldCi).user);
  oldLogins.delete(account);
  const moved = [];
  for (const d of DBS) {
    const exists = await withPg(admin, (q) => q(`SELECT 1 AS x FROM pg_database WHERE datname = ${literal(d.db)}`));
    if (!exists.length) continue;
    await withPg(withDatabase(admin, d.db), async (q) => {
      for (const login of oldLogins) {
        const [r] = await q(`SELECT 1 AS x FROM pg_roles WHERE rolname = ${literal(login)}`);
        if (r) await q(`REASSIGN OWNED BY ${ident(login)} TO ${ident(account)}`);
      }
    });
    await withPg(admin, (q) => q(`ALTER DATABASE ${ident(d.db)} OWNER TO ${ident(account)}`));
    moved.push(d.db);
  }
  saveCfg({ type: cfg().type || "existing", databases: DBS.map((d) => d.db), adopted: new Date().toISOString().slice(0, 10) });
  envCmd();
  console.log(`Moved to the project account ${account}: ${moved.join(", ") || "no database found"}. The old logins (${[...oldLogins].join(", ") || "none"}) are kept: drop them yourself once the app, the migrations and CI work with the new URLs.`);
}

// ---------- commands ----------

if (cmd === "--plan" || flag("--plan")) {
  console.log(`Project account: ${cfg().account || P} (one login for every database of this project)`);
  for (const d of DBS) console.log(`${d.db} -> ${d.env}`);
  console.log(`CI: ${P}_ci_* (created and dropped by the project account) -> CI_DATABASE_URL`);
  process.exit(0);
}
const commands = {
  connect: connectCmd,
  managed: () => managedCmd(a1),
  create: createCmd,
  env: envCmd,
  check: checkCmd,
  status: statusCmd,
  reset: () => resetCmd(a1),
  "reset-check": resetCheckCmd,
  migrate: () => migrate(a1 || fail("Usage: migrate <db>")),
  seed: () => seed(a1 || fail("Usage: seed <db>"), a2),
  backup: backupCmd,
  restore: () => restoreCmd(a1, a2),
  "adopt-legacy": adoptLegacyCmd,
  "admin-url": () => {
    if (!process.stdout.isTTY) fail("admin-url prints a secret: run it yourself in a terminal.");
    console.log(readEnv().get("DB_ADMIN_URL") || "No admin connection string in this project.");
  },
};
if (!commands[cmd]) fail("Usage: node scripts/db-setup.mjs connect | managed <create|up|status|down|destroy> | create | env | check | status | reset <db> | reset-check | migrate <db> | seed <db> [small|full] | backup | restore <file> [db] | adopt-legacy | admin-url | --plan");
try {
  await commands[cmd]();
} catch (e) {
  fail(safe(e));
}
