#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// The project's databases on the machine's shared PostgreSQL (rule "Environments"): one database and one login per role
// and environment, each login able to open its own database only. No password is ever printed.
//
//   node scripts/db-setup.mjs create        every database and login; new passwords go to .env.local only (the owner
//                                            runs it: it writes secrets)
//   node scripts/db-setup.mjs env           copy the connection strings into every checkout's .env.local again
//                                            (after new role worktrees; no new passwords)
//   node scripts/db-setup.mjs check         each login opens its own database and is refused on another one
//   node scripts/db-setup.mjs list          the databases and whether each one exists
//   node scripts/db-setup.mjs reset <db>    drop and create one database, then migrate and seed small
//   node scripts/db-setup.mjs migrate <db>  the schema up to date ("db.migrate"; inside the backend image named by
//                                            CREWBOOK_API_IMAGE with "db.migrateInImage", as run.mjs does)
//   node scripts/db-setup.mjs seed <db> [small|full]
//   node scripts/db-setup.mjs backup        the staging database to ~/.crewbook/backups/<project>/, keeps the last three
//   node scripts/db-setup.mjs restore <file> [db]   a backup into a database (default: <project>_restore_check)
//
// "db" in .claude/project.json (all optional):
//   { "prefix": "shop", "container": "crewbook-shared-postgres-17-1", "host": "localhost", "port": 5432, "shadow": false,
//     "migrate": "pnpm -C apps/api exec prisma migrate deploy", "seed": "pnpm -C apps/api run seed {size}",
//     "migrateInImage": "node node_modules/prisma/build/index.js migrate deploy" }
// migrate and seed run in this checkout with DATABASE_URL set; migrateInImage runs in the backend image instead.
// Connections go through `docker exec` into the shared container as the postgres superuser over its local socket, so this
// script needs no admin password. It finds the checkouts from its own folder, never from the terminal's.
import { execFileSync, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readProject } from "./project-level.mjs";

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const project = readProject(here) || {};
const cfg = project.db || {};
const P = cfg.prefix || (project.name || path.basename(here)).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const CONTAINER = cfg.container || "crewbook-shared-postgres-17-1";
const HOST = cfg.host || "localhost";
const PORT = String(cfg.port || 5432);
const roles = project.roles || ["lead", "dev"];

// The databases: name, login, the .env.local key, and whether the login may create databases (CI only).
const DBS = [
  { db: `${P}_dev`, login: `${P}_dev`, env: "DEV_DATABASE_URL" },
  ...(cfg.shadow ? [{ db: `${P}_dev_shadow`, login: `${P}_dev`, env: "DEV_SHADOW_DATABASE_URL" }] : []),
  ...(roles.includes("frontend") ? [{ db: `${P}_frontend`, login: `${P}_frontend`, env: "FRONTEND_DATABASE_URL" }] : []),
  ...(roles.includes("test") ? [{ db: `${P}_test`, login: `${P}_test`, env: "TEST_DATABASE_URL" }] : []),
  { db: `${P}_staging`, login: `${P}_staging`, env: "STAGING_DATABASE_URL" },
  { db: "postgres", login: `${P}_ci`, env: "CI_DATABASE_URL", ci: true },
];
// Which connection string a checkout uses as DATABASE_URL, by its branch.
const ROLE_DB = { "role/dev": "DEV_DATABASE_URL", "role/frontend": "FRONTEND_DATABASE_URL", "role/test": "TEST_DATABASE_URL" };

const fail = (m) => {
  console.error(m);
  process.exit(1);
};
const ident = (s) => (/^[a-z_][a-z0-9_]*$/.test(s) ? s : fail(`Bad name: ${s}`));

// SQL goes in through stdin, so a password never reaches a command line or a process list.
function psql(sql, db = "postgres") {
  const r = spawnSync("docker", ["exec", "-i", CONTAINER, "psql", "-U", "postgres", "-d", db, "-v", "ON_ERROR_STOP=1", "-qtA"], { input: sql, encoding: "utf8" });
  if (r.status !== 0) fail(`psql failed: ${(r.stderr || "").replace(/PASSWORD '[^']*'/g, "PASSWORD '***'").trim()}`);
  return r.stdout.trim();
}

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

function readEnv(file) {
  const m = new Map();
  if (fs.existsSync(file)) for (const l of fs.readFileSync(file, "utf8").split(/\r?\n/)) if (/^[A-Z][A-Z0-9_]*=/.test(l)) m.set(l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1));
  return m;
}
function writeEnv(file, values) {
  let text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  for (const [k, v] of Object.entries(values)) {
    const re = new RegExp(`^${k}=.*$`, "m");
    if (re.test(text)) text = text.replace(re, () => `${k}=${v}`);
    else text += `${text && !text.endsWith("\n") ? "\n" : ""}${k}=${v}\n`;
  }
  fs.writeFileSync(file, text);
}
const pwdOf = (url) => {
  try {
    return decodeURIComponent(new URL(url).password);
  } catch {
    return "";
  }
};

function spreadEnv(values) {
  const list = checkouts();
  for (const c of list) {
    const own = { ...values };
    const key = ROLE_DB[c.branch];
    if (key && values[key]) own.DATABASE_URL = values[key];
    if (key === "DEV_DATABASE_URL" && values.DEV_SHADOW_DATABASE_URL) own.SHADOW_DATABASE_URL = values.DEV_SHADOW_DATABASE_URL;
    writeEnv(path.join(c.dir, ".env.local"), own);
  }
  console.log(`Connection strings written to .env.local of ${list.length} checkout${list.length === 1 ? "" : "s"} (git-ignored, not shown).`);
}

function ensureServer() {
  if (spawnSync("docker", ["exec", CONTAINER, "pg_isready", "-U", "postgres"]).status !== 0) {
    fail(`The shared PostgreSQL is not running (${CONTAINER}). Start it: node scripts/hosts.mjs shared up postgres-17`);
  }
}
function createDb(db, owner) {
  if (psql(`SELECT 1 FROM pg_database WHERE datname='${ident(db)}'`) !== "1") psql(`CREATE DATABASE ${db} OWNER ${ident(owner)}`);
  psql(`REVOKE CONNECT ON DATABASE ${db} FROM PUBLIC; GRANT CONNECT ON DATABASE ${db} TO ${owner}`);
}

function create() {
  ensureServer();
  const env = readEnv(path.join(mainDir(), ".env.local"));
  const values = {};
  const pw = {};
  for (const d of DBS) {
    const login = ident(d.login);
    pw[login] ||= pwdOf(env.get(d.env) || "") || crypto.randomBytes(24).toString("base64url");
    const exists = psql(`SELECT 1 FROM pg_roles WHERE rolname='${login}'`) === "1";
    const opts = `LOGIN PASSWORD '${pw[login]}' ${d.ci ? "CREATEDB" : "NOCREATEDB"} NOSUPERUSER NOCREATEROLE`;
    psql(exists ? `ALTER ROLE ${login} WITH ${opts}` : `CREATE ROLE ${login} WITH ${opts}`);
    if (d.ci) psql(`GRANT CONNECT ON DATABASE postgres TO ${login}`);
    else createDb(d.db, login);
    values[d.env] = `postgresql://${login}:${encodeURIComponent(pw[login])}@${HOST}:${PORT}/${d.db}`;
  }
  values.CI_DB_PREFIX = `${P}_ci_`;
  spreadEnv(values);
  list();
}

function env() {
  const e = readEnv(path.join(mainDir(), ".env.local"));
  const values = Object.fromEntries(DBS.filter((d) => e.get(d.env)).map((d) => [d.env, e.get(d.env)]));
  if (!Object.keys(values).length) fail("No connection strings yet: the owner runs node scripts/db-setup.mjs create first.");
  spreadEnv(values);
}

function urlFor(db) {
  const d = DBS.find((x) => x.db === db && !x.ci);
  if (!d) fail(`Unknown database ${db}. Known: ${DBS.filter((x) => !x.ci).map((x) => x.db).join(", ")}`);
  const url = readEnv(path.join(mainDir(), ".env.local")).get(d.env);
  if (!url) fail("No connection string yet: the owner runs node scripts/db-setup.mjs create first.");
  return { d, url };
}
// A project command (db.migrate, db.seed) with DATABASE_URL set; the value never reaches the command line.
function runCmd(cmd, url) {
  if (!cmd) {
    console.log("Nothing to run: set it under \"db\" in .claude/project.json.");
    return true;
  }
  return spawnSync(cmd, { cwd: here, shell: true, stdio: "inherit", env: { ...process.env, DATABASE_URL: url } }).status === 0;
}
// Inside the backend image just built (CREWBOOK_API_IMAGE), which holds the migrations: no checkout or install needed.
function inImage(image, cmd, url) {
  const u = new URL(url);
  if (["localhost", "127.0.0.1", "::1", "[::1]"].includes(u.hostname)) u.hostname = "host.docker.internal";
  return spawnSync("docker", ["run", "--rm", "--add-host=host.docker.internal:host-gateway", "-e", "DATABASE_URL", "--entrypoint", "sh", image, "-c", cmd], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: u.toString() },
  }).status === 0;
}
function migrate(db) {
  const { url } = urlFor(db);
  const image = process.env.CREWBOOK_API_IMAGE;
  const ok = image && cfg.migrateInImage ? inImage(image, cfg.migrateInImage, url) : runCmd(cfg.migrate, url);
  if (!ok) fail("Migration failed.");
}
function seed(db, size = "small") {
  if (!["small", "full"].includes(size)) fail("Usage: seed <db> [small|full]");
  const { url } = urlFor(db);
  if (!runCmd(cfg.seed && cfg.seed.replace("{size}", size), url)) fail("Seed failed.");
}
function reset(db) {
  ensureServer();
  const { d } = urlFor(db);
  psql(`DROP DATABASE IF EXISTS ${ident(db)} WITH (FORCE)`);
  createDb(db, d.login);
  if (db.endsWith("_shadow")) return console.log(`${db} reset (empty).`);
  migrate(db);
  seed(db, "small");
  console.log(`${db} reset: dropped, created, migrated, seeded small.`);
}

function backupDir() {
  const d = path.join(os.homedir(), ".crewbook", "backups", P);
  fs.mkdirSync(d, { recursive: true });
  return d;
}
function backup() {
  ensureServer();
  const file = path.join(backupDir(), `${P}_staging_${new Date().toISOString().replace(/[:.]/g, "-")}.dump`);
  const r = spawnSync("docker", ["exec", CONTAINER, "pg_dump", "-U", "postgres", "-Fc", `${P}_staging`], { maxBuffer: 1 << 30 });
  if (r.status !== 0) fail("pg_dump failed.");
  fs.writeFileSync(file, r.stdout);
  // Keep the last three, and every backup taken before a release (its name holds "_release_").
  for (const f of fs.readdirSync(backupDir()).filter((f) => f.endsWith(".dump") && !f.includes("_release_")).sort().reverse().slice(3)) fs.rmSync(path.join(backupDir(), f));
  console.log(`Backup written: ${file}`);
}
function restore(file, db = `${P}_restore_check`) {
  ensureServer();
  if (!file || !fs.existsSync(file)) fail(`No file ${file}`);
  // A project database keeps its own login as owner, of the database and of every restored object, with connect rights
  // for that login only; a scratch database (the default) belongs to postgres.
  const own = DBS.find((x) => x.db === db && !x.ci);
  psql(`DROP DATABASE IF EXISTS ${ident(db)} WITH (FORCE)`);
  if (own) createDb(db, own.login);
  else psql(`CREATE DATABASE ${db}`);
  const as = own ? ["--role", own.login, "--no-acl"] : [];
  const r = spawnSync("docker", ["exec", "-i", CONTAINER, "pg_restore", "-U", "postgres", "-d", db, "--no-owner", ...as], { input: fs.readFileSync(file) });
  if (r.status !== 0) fail("pg_restore failed.");
  console.log(`Restored into ${db}${own ? `, owned by ${own.login}` : ""}.`);
}

// Each login opens its own database with the password in .env.local and is refused on another one. The password goes
// to psql through the environment of docker exec, never the command line.
function check() {
  ensureServer();
  const e = readEnv(path.join(mainDir(), ".env.local"));
  const tryUrl = (url, db) => {
    const u = new URL(url);
    return spawnSync("docker", ["exec", "-e", "PGPASSWORD", CONTAINER, "psql", "-h", "127.0.0.1", "-U", u.username, "-d", db, "-qtAc", "select 1"], { env: { ...process.env, PGPASSWORD: pwdOf(url) } }).status === 0;
  };
  let bad = 0;
  for (const d of DBS) {
    const url = e.get(d.env);
    if (!url) {
      console.log(`  missing ${d.env} in .env.local`);
      bad++;
      continue;
    }
    const ok = tryUrl(url, d.ci ? "postgres" : d.db);
    const other = d.ci || !tryUrl(url, d.db === `${P}_staging` ? `${P}_dev` : `${P}_staging`);
    console.log(`  ${ok && other ? "ok  " : "FAIL"} ${d.login} -> ${d.db}${d.ci ? "" : ` (refused elsewhere: ${other ? "yes" : "NO"})`}`);
    if (!ok || !other) bad++;
  }
  if (bad) fail(`${bad} problem(s).`);
}

function list() {
  ensureServer();
  const have = new Set(psql("SELECT datname FROM pg_database").split(/\r?\n/));
  for (const d of DBS.filter((x) => !x.ci)) console.log(`  ${have.has(d.db) ? "ok     " : "missing"} ${d.db} (login ${d.login})`);
  console.log(`  ${psql(`SELECT 1 FROM pg_roles WHERE rolname='${P}_ci'`) === "1" ? "ok     " : "missing"} login ${P}_ci (creates and drops ${P}_ci_* for each CI run)`);
}

const [cmd, a, b] = process.argv.slice(2);
if (cmd === "--plan") {
  // What create would make, without Docker (tests, and the Lead before the owner runs it).
  for (const d of DBS) console.log(`${d.ci ? "login " + d.login + " (CI, creates databases)" : d.db + " (login " + d.login + ")"} -> ${d.env}`);
  process.exit(0);
}
const cmds = { create, env, check, list, backup, reset: () => reset(a || fail("Usage: reset <db>")), migrate: () => migrate(a || fail("Usage: migrate <db>")), seed: () => seed(a || fail("Usage: seed <db>"), b), restore: () => restore(a, b) };
(cmds[cmd] || (() => fail("Usage: node scripts/db-setup.mjs create|env|check|list|reset <db>|migrate <db>|seed <db> [small|full]|backup|restore <file> [db]|--plan")))();
