#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// The project's database (PostgreSQL or SQL Server) and cache (Redis), in one of two modes each:
//   local     the default: the engine runs in the project's own Docker (its own compose project, ports on 127.0.0.1
//             only, generated passwords, its own volumes). Nobody else uses it; stopping the app keeps the data.
//   existing  on request: a server you already have (a company server, a shared Docker you set up yourself). You give
//             a connection string in a terminal; Crewbook creates the project's part on it and never starts, stops or
//             reconfigures the server.
// Each project has ONE account per service: on the database it owns every database of the project (dev, frontend,
// test, staging, CI, shadow); on Redis it may use the project's keys only (<project>:*). Every role gets a URL to its
// own database (and its own Redis key prefix) with that account.
//
//   node scripts/db-setup.mjs use database <postgres|mssql|none> | use cache <redis|none>   what the stack uses (Lead)
//   node scripts/db-setup.mjs local [up | stop | status | destroy --confirm]   the project's own containers (default)
//   node scripts/db-setup.mjs connect <database|cache>   (the owner, in a terminal) a server you already have
//   node scripts/db-setup.mjs create        the project's databases on the database server; then env
//   node scripts/db-setup.mjs env           each checkout's URLs and each role's DATABASE_URL, REDIS_URL, REDIS_PREFIX
//   node scripts/db-setup.mjs check         the project's accounts reach their databases and keys (from this machine)
//   node scripts/db-setup.mjs status        modes, accounts, databases, what is pending; never a secret
//   node scripts/db-setup.mjs reset <db> | reset-check | migrate <db> | seed <db> [small|full]
//   node scripts/db-setup.mjs backup | restore <file> [db]                    PostgreSQL
//   node scripts/db-setup.mjs adopt-legacy  (the owner) the old model (one login per role) to one project account
//   node scripts/db-setup.mjs --plan        what create would make, with no server
//
// Configuration, with no secret in it: "services" in .claude/project.json (committed). Secret values: the main
// checkout's .env.local only for the admins and the local passwords; every checkout gets its own URLs. SQL Server on an
// existing server needs sqlcmd on this machine (the owner installs it); in local mode the container's own is used.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseUrl as pgParse, withDatabase as pgWithDatabase, withPg } from "./pg-client.mjs";
import { MAIN_ONLY_KEYS, ROLE_DATABASE_KEY, readProject, writeProject } from "./project-level.mjs";
import { ENGINES, newPassword } from "./service-engines.mjs";

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const [cmd, a1, a2] = args.filter((x) => !x.startsWith("--"));
const flag = (f) => args.includes(f);
const fail = (m, code = 1) => {
  console.error(m);
  process.exit(code);
};
const safe = (e) => String(e && e.message ? e.message : e).replace(/(postgres(ql)?|sqlserver|mssql|rediss?):\/\/[^\s]+/gi, "<connection string>").replace(/(Pass)(word)\s*=[^;\s]*/gi, "$1$2=***");

// ---------- the project's configuration ----------

const project = () => readProject(here) || {};
// "services" in project.json; a project from the first version of this script ("database" for PostgreSQL) is read too.
function services() {
  const p = project();
  if (p.services) return p.services;
  if (p.database) return { database: { engine: "postgres", ...p.database, mode: p.database.type === "managed" ? "local" : p.database.type } };
  return { database: { engine: "postgres" } };
}
const saveService = (kind, next) => {
  const all = services();
  const p = project();
  delete p.database;
  writeProject(here, { ...p, services: { ...all, [kind]: { ...(all[kind] || {}), ...next } } });
};
const name = (project().name || path.basename(here)).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const legacy = project().db || {};
const P = services().database?.prefix || legacy.prefix || name;
const roles = project().roles || ["lead", "dev"];
const KEYS = {
  database: { admin: "DATABASE_ADMIN_URL", project: "DATABASE_PROJECT_URL", local: "DATABASE_LOCAL_PASSWORD", old: { admin: "DB_ADMIN_URL", project: "DB_PROJECT_URL" } },
  cache: { admin: "CACHE_ADMIN_URL", project: "CACHE_PROJECT_URL", local: "CACHE_LOCAL_PASSWORD", old: {} },
};
const enabled = () => Object.entries(services()).filter(([, s]) => s && s.engine && s.engine !== "none" && ENGINES[s.engine]).map(([kind, s]) => ({ kind, ...s, engine: ENGINES[s.engine] }));
const svc = (kind) => {
  const s = services()[kind];
  if (!s || !s.engine || s.engine === "none") fail(`This project has no ${kind}: node scripts/db-setup.mjs use ${kind} <${kind === "database" ? "postgres|mssql" : "redis"}>.`);
  if (!ENGINES[s.engine]) fail(`Unknown engine "${s.engine}" for the ${kind}.`);
  return { kind, ...s, engine: ENGINES[s.engine] };
};

// The project's databases and their .env.local keys.
const DBS = () => {
  const d = services().database || {};
  return [
    { db: `${P}_dev`, env: "DEV_DATABASE_URL" },
    ...(d.shadow || legacy.shadow ? [{ db: `${P}_dev_shadow`, env: "DEV_SHADOW_DATABASE_URL" }] : []),
    ...(roles.includes("frontend") ? [{ db: `${P}_frontend`, env: "FRONTEND_DATABASE_URL" }] : []),
    ...(roles.includes("test") ? [{ db: `${P}_test`, env: "TEST_DATABASE_URL" }] : []),
    { db: `${P}_staging`, env: "STAGING_DATABASE_URL" },
  ];
};
const ROLE_DB = Object.fromEntries(Object.entries(ROLE_DATABASE_KEY).map(([role, key]) => [`role/${role}`, key]));
const redisPrefixOf = (branch) => `${P}:${(branch || "main").replace(/^role\//, "")}:`;

// ---------- .env.local files ----------

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
const mainEnvFile = () => path.join(checkouts()[0].dir, ".env.local");
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
const stored = (kind, which) => readEnv().get(KEYS[kind][which]) || readEnv().get(KEYS[kind].old[which] || "\0") || null;

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

// ---------- the local containers ----------

const localProject = () => `${P.replace(/_/g, "-")}-services`;
const composeFile = () => path.join(here, "docker", "services-compose.yml");
const listenable = (port, host) => new Promise((resolve) => {
  const s = net.createServer().once("error", () => resolve(false)).once("listening", () => s.close(() => resolve(true)));
  s.listen(port, host);
});
const published = () => {
  const r = spawnSync("docker", ["ps", "-a", "--format", "{{.Ports}}"], { encoding: "utf8" });
  return new Set([...(r.stdout || "").matchAll(/:(\d+)->/g)].map((m) => Number(m[1])));
};
async function freePort(from, taken) {
  for (let port = from; ; port++) if (!taken.has(port) && (await listenable(port, "127.0.0.1")) && (await listenable(port, "0.0.0.0"))) return port;
}
const DATA_DIR = { postgres: "/var/lib/postgresql/data", mssql: "/var/opt/mssql", redis: "/data" };
function writeCompose() {
  const local = enabled().filter((s) => s.mode === "local");
  const lines = [
    "# This project's own database and cache (node scripts/db-setup.mjs local). Generated: change it through db-setup.mjs.",
    "# Ports listen on 127.0.0.1 only; the passwords come from the main checkout's .env.local, never this file. Its life",
    "# cycle is separate from the app's: stopping the app never stops it.",
    "services:",
  ];
  for (const s of local) {
    const L = s.engine.local;
    const key = Object.keys(ENGINES).find((k) => ENGINES[k] === s.engine);
    lines.push(`  ${s.kind}:`, `    image: ${L.image(s.version)}`, "    environment:", ...L.environment.map((e) => `      ${e}`));
    if (L.command) lines.push(`    command: ${L.command}`);
    lines.push(`    ports: ["127.0.0.1:\${${s.kind.toUpperCase()}_LOCAL_PORT:?}:${L.internalPort}"]`, `    volumes: ["${s.kind}-data:${DATA_DIR[key]}"]`, "    restart: unless-stopped", "    healthcheck:", `      test: ${L.healthcheck}`, "      interval: 3s", "      timeout: 5s", "      retries: 60", ...(L.start ? [`      start_period: ${L.start}`] : []));
  }
  lines.push("volumes:", ...local.map((s) => `  ${s.kind}-data:`), "");
  fs.mkdirSync(path.dirname(composeFile()), { recursive: true });
  fs.writeFileSync(composeFile(), lines.join("\n"));
}
function compose(a) {
  const env = { ...process.env };
  for (const s of enabled().filter((x) => x.mode === "local")) {
    env[KEYS[s.kind].local] = stored(s.kind, "local") || "";
    env[`${s.kind.toUpperCase()}_LOCAL_PORT`] = String(s.port || "");
  }
  return spawnSync("docker", ["compose", "-p", localProject(), "-f", composeFile(), ...a], { cwd: here, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", env });
}
const containerOf = (kind) => (compose(["ps", "-q", kind]).stdout || "").trim().split(/\r?\n/)[0] || null;
const ctxFor = (s) => ({ prefix: P, container: s.mode === "local" && s.engine.local.viaContainer ? containerOf(s.kind) : null });

async function localCmd(sub = "up") {
  if (sub === "status") {
    const ps = fs.existsSync(composeFile()) ? (compose(["ps", "--format", "{{.Service}} {{.State}}"]).stdout || "").trim() : "";
    return console.log(`Local services (compose project ${localProject()}): ${ps || "not running"}`);
  }
  if (sub === "stop") {
    if (!fs.existsSync(composeFile())) fail("No local services in this project.");
    compose(["stop"]);
    return console.log("Local services stopped; their data is kept. node scripts/db-setup.mjs local starts them again.");
  }
  if (sub === "destroy") {
    if (!flag("--confirm")) fail(`This deletes the data of this project's local services (${localProject()}). Run again with --confirm to go ahead.`);
    if (fs.existsSync(composeFile())) compose(["down", "-v"]);
    return console.log("Local services and their data removed.");
  }
  if (sub !== "up") fail("Usage: node scripts/db-setup.mjs local [up | stop | status | destroy --confirm]");
  if (spawnSync("docker", ["compose", "version"], { stdio: "ignore" }).status !== 0) fail("Docker with Compose v2 is needed for the local services.");
  const local = enabled().filter((s) => !s.mode || s.mode === "local");
  if (!local.length) return console.log("Nothing runs locally: every service of this project is an existing server.");
  // Ports and passwords are chosen once and kept on every later run.
  const taken = published();
  for (const s of local) {
    const port = s.port || (await freePort(s.engine.local.firstPort, taken));
    taken.add(port);
    if (!stored(s.kind, "local")) writeEnv(mainEnvFile(), { [KEYS[s.kind].local]: newPassword() });
    saveService(s.kind, { mode: "local", port });
  }
  writeCompose();
  const up = compose(["up", "-d", "--wait"]);
  if (up.status !== 0) fail(`The local services did not start: ${(up.stderr || "").trim().split(/\r?\n/).pop()}`);
  for (const s of enabled().filter((x) => x.mode === "local")) {
    if (!stored(s.kind, "project")) await provision(s, s.engine.local.adminUrl(s.port, stored(s.kind, "local")));
  }
  console.log(`Local services running (compose project ${localProject()}, 127.0.0.1 only): ${enabled().filter((x) => x.mode === "local").map((x) => `${x.engine.title} on port ${x.port}`).join(", ")}. Passwords are generated and kept in the main checkout's .env.local, never shown.`);
}

// ---------- the project's account ----------

// From an admin: one account for the project, its password kept across runs.
async function provision(s, adminUrl) {
  const account = s.account || P;
  const ctx = ctxFor(s);
  const existing = stored(s.kind, "project");
  const kept = existing && s.engine.user(existing) === account ? s.engine.password(existing) : null;
  const password = kept || newPassword();
  const exists = await s.engine.accountExists(adminUrl, account, ctx);
  if (exists && !kept) fail(`An account named ${account} already exists on ${s.engine.describe(adminUrl).split("@")[1]} and is not recorded as this project's. Nothing was changed. Use another prefix, or connect with that account's own connection string.`);
  if (!exists) await s.engine.createAccount(adminUrl, account, password, ctx);
  writeEnv(mainEnvFile(), { [KEYS[s.kind].admin]: adminUrl, [KEYS[s.kind].project]: s.engine.projectUrl(adminUrl, account, password) });
  saveService(s.kind, { account, provisioning: "admin", prefix: P });
  if (s.kind === "cache" && ctx.saved === false) console.log("! The Redis server keeps the project's user until it restarts (it has no ACL file). Ask its owner to persist users (aclfile, or CONFIG REWRITE).");
  return account;
}

async function connectCmd(kind) {
  if (!["database", "cache"].includes(kind || "")) fail("Usage: node scripts/db-setup.mjs connect <database|cache>");
  const s = svc(kind);
  if (s.mode === "local" && stored(kind, "project")) fail(`The ${kind} runs in this project's own Docker (local). Switching it to a server you already have is a decision for the Lead; nothing was changed.`);
  const input = await readHidden(`Paste the ${s.engine.title} connection string (it will not be shown), then press Enter: `);
  if (!input) fail("No connection string given; nothing was changed.");
  let url;
  let r;
  try {
    url = s.engine.parse(input);
    r = await s.engine.rights(url, { prefix: P });
  } catch (e) {
    fail(`Could not sign in: ${safe(e)} Nothing was changed.`);
  }
  if (!r.kind) fail(`${r.name} may not create databases (it needs ${r.missing}). Nothing was changed; ask the server's owner for one of the two, then run this again.`);
  if (r.kind === "admin") {
    if (stored(kind, "project") && s.account) {
      writeEnv(mainEnvFile(), { [KEYS[kind].admin]: url });
      console.log(`Admin connection updated. The project account ${s.account} is unchanged.`);
    } else {
      saveService(kind, { mode: "existing" });
      const account = await provision({ ...s, mode: "existing" }, url);
      console.log(`Signed in as an admin (${r.name}). Project account ${account} ready${kind === "cache" ? `, limited to the keys ${P}:*` : ": it owns every database of this project"}. The admin stays in the main checkout's .env.local only.`);
    }
  } else {
    if (s.account && s.account !== r.name) fail(`This project already uses the account ${s.account}; ${r.name} was not recorded. Nothing was changed.`);
    writeEnv(mainEnvFile(), { [KEYS[kind].project]: url });
    saveService(kind, { mode: "existing", account: r.name, provisioning: "account", prefix: P });
    console.log(kind === "cache" ? `Signed in as ${r.name}: it is the project's Redis account; the project uses the keys ${P}:* on it.${r.noAcl ? " This server has no user accounts (Redis before 6): the prefix keeps projects apart, not a permission." : ""}` : `Signed in as ${r.name}, which may create databases: it is the project account and owns every database of this project. No other login is created.`);
  }
  console.log(kind === "database" ? "Next: node scripts/db-setup.mjs create" : "Next: node scripts/db-setup.mjs env");
}

// ---------- create, env, check, status ----------

const projectUrl = (kind) => stored(kind, "project") || fail(`No project account for the ${kind} yet: node scripts/db-setup.mjs local (the default), or the owner runs node scripts/db-setup.mjs connect ${kind} in a terminal.`);

async function createCmd() {
  const s = svc("database");
  const url = projectUrl("database");
  let made;
  try {
    made = await s.engine.ensure(url, DBS().map((d) => d.db), ctxFor(s));
  } catch (e) {
    fail(`Could not create the databases: ${safe(e)}`);
  }
  saveService("database", { databases: DBS().map((d) => d.db), created: new Date().toISOString().slice(0, 10) });
  console.log(made.length ? `Created: ${made.join(", ")} (owner ${s.engine.user(url)}).` : `Every database exists already, owned by ${s.engine.user(url)}; nothing created.`);
  envCmd();
}

// Each checkout: its URLs (never an admin); each role its own DATABASE_URL and REDIS_PREFIX.
function envCmd() {
  const values = {};
  const db = enabled().find((s) => s.kind === "database");
  const cache = enabled().find((s) => s.kind === "cache");
  if (db && stored("database", "project")) {
    const url = stored("database", "project");
    for (const d of DBS()) values[d.env] = db.engine.appValue(url, d.db, db);
    values.CI_DATABASE_URL = db.engine.maintenance(url, db);
    values.CI_DB_PREFIX = `${P}_ci_`;
  }
  if (cache && stored("cache", "project")) {
    values.REDIS_URL = stored("cache", "project");
    values.STAGING_REDIS_PREFIX = redisPrefixOf("staging");
  }
  if (!Object.keys(values).length) fail("No project account yet: node scripts/db-setup.mjs local, or connect.");
  const list = checkouts();
  for (const c of list) {
    const own = { ...values };
    const key = ROLE_DB[c.branch];
    if (key && values[key]) own.DATABASE_URL = values[key];
    if (key === "DEV_DATABASE_URL" && values.DEV_SHADOW_DATABASE_URL) own.SHADOW_DATABASE_URL = values.DEV_SHADOW_DATABASE_URL;
    if (values.REDIS_URL) own.REDIS_PREFIX = redisPrefixOf(c.branch);
    if (c.dir !== list[0].dir) for (const k of MAIN_ONLY_KEYS) own[k] = null;
    writeEnv(path.join(c.dir, ".env.local"), own);
  }
  console.log(`URLs written to .env.local of ${list.length} checkout${list.length === 1 ? "" : "s"} (git-ignored, not shown); the admins and local passwords stay in the main checkout only.`);
}

async function checkCmd() {
  let bad = 0;
  for (const s of enabled()) {
    const url = stored(s.kind, "project");
    if (!url) {
      console.log(`  FAIL  ${s.kind}: no project account yet`);
      bad++;
      continue;
    }
    const targets = s.kind === "database" ? DBS().map((d) => d.db) : [`${P}:*`];
    let badHere = 0;
    for (const t of targets) {
      try {
        await s.engine.check(url, t, ctxFor(s));
        console.log(`  ok    ${s.engine.title} ${t}`);
      } catch (e) {
        console.log(`  FAIL  ${s.engine.title} ${t}: ${safe(e)}`);
        badHere++;
      }
    }
    bad += badHere;
    saveService(s.kind, { checked: { ...(s.checked || {}), "this machine": badHere ? "failed" : new Date().toISOString().slice(0, 10) } });
  }
  console.log("Checked from this machine. The app's containers reach the services through host.docker.internal (Docker Desktop); a staging server or a build host is checked there before it counts as ready.");
  if (bad) fail(`${bad} problem(s).`);
}

function statusCmd() {
  const list = enabled();
  if (!list.length) return console.log("No database or cache in this project.");
  for (const s of list) {
    const url = stored(s.kind, "project");
    console.log(`${s.kind}: ${s.engine.title} · ${s.mode || "local (not started)"}${s.account ? ` · project account ${s.account} (${s.provisioning === "admin" ? "created by Crewbook" : "given"})` : ""}${url ? ` · ${s.engine.describe(url).split("@")[1]}` : ""}${s.port ? ` · local port ${s.port}` : ""}`);
    if (s.kind === "database") console.log(`  databases: ${DBS().map((d) => d.db).join(", ")}${s.created ? ` (created ${s.created})` : " (not created yet)"}`);
    if (s.kind === "cache") console.log(`  keys: ${P}:* (each role its own prefix ${P}:<role>:)`);
    const checked = Object.entries(s.checked || {});
    console.log(`  checked: ${checked.length ? checked.map(([w, d]) => `${w} ${d}`).join("; ") : "not yet"}`);
  }
  const env = readEnv();
  if (!services().database?.account && env.get("DEV_DATABASE_URL") && !env.get("DATABASE_PROJECT_URL") && !env.get("DB_PROJECT_URL")) console.log("Old model found (one login per role). After a backup, the owner connects the old server's admin (connect database), then node scripts/db-setup.mjs adopt-legacy (see /cb-env).");
}

// ---------- migrate, seed, reset, backup ----------

const urlFor = (db) => {
  if (!DBS().some((x) => x.db === db) && db !== `${P}_reset_check` && db !== `${P}_restore_check`) fail(`Not a database of this project: ${db}. Known: ${DBS().map((x) => x.db).join(", ")}`);
  const s = svc("database");
  return s.engine.appValue(projectUrl("database"), db, s);
};
const conf = (k) => services().database?.[k] ?? legacy[k];
function runCmd(command, url) {
  if (!command) {
    console.log('Nothing to run: set it under "services"."database" in .claude/project.json.');
    return true;
  }
  return spawnSync(command, { cwd: here, shell: true, stdio: "inherit", env: { ...process.env, DATABASE_URL: url } }).status === 0;
}
const forContainer = (value) => String(value).replace(/(@|Server=|Data Source=)(tcp:)?(localhost|127\.0\.0\.1)/gi, "$1$2host.docker.internal");
function inImage(image, command, url) {
  return spawnSync("docker", ["run", "--rm", "--add-host=host.docker.internal:host-gateway", "-e", "DATABASE_URL", "--entrypoint", "sh", image, "-c", command], { stdio: "inherit", env: { ...process.env, DATABASE_URL: forContainer(url) } }).status === 0;
}
function migrate(db) {
  const url = urlFor(db);
  const image = process.env.CREWBOOK_API_IMAGE;
  if (!(image && conf("migrateInImage") ? inImage(image, conf("migrateInImage"), url) : runCmd(conf("migrate"), url))) fail("Migration failed.");
}
function seed(db, size = "small") {
  if (!["small", "full"].includes(size)) fail("Usage: seed <db> [small|full]");
  if (!runCmd(conf("seed") && conf("seed").replace("{size}", size), urlFor(db))) fail("Seed failed.");
}
async function resetCmd(db) {
  if (!db) fail("Usage: reset <db>");
  urlFor(db);
  if (db.endsWith("_staging") && !flag("--confirm")) fail(`${db} holds the milestone's data: take a backup, then reset it with --confirm.`);
  const s = svc("database");
  await s.engine.recreate(projectUrl("database"), db, ctxFor(s));
  if (!db.endsWith("_shadow")) {
    migrate(db);
    seed(db, "small");
  }
  console.log(`${db} reset: dropped, created${db.endsWith("_shadow") ? "" : ", migrated, seeded small"}.`);
}
// Proof that a reset works, on a scratch database made for it, never on one that holds anyone's data.
async function resetCheckCmd() {
  const s = svc("database");
  const db = `${P}_reset_check`;
  await s.engine.recreate(projectUrl("database"), db, ctxFor(s));
  migrate(db);
  seed(db, "small");
  await s.engine.drop(projectUrl("database"), db, ctxFor(s));
  console.log(`Reset works: ${db} was created, migrated, seeded and dropped.`);
}
const have = (bin) => !spawnSync(bin, ["--version"], { stdio: "ignore" }).error;
function pgTool(tool, url, extra, input) {
  if (have(tool)) return spawnSync(process.platform === "win32" ? "cmd" : "sh", process.platform === "win32" ? ["/c", `${tool} ${extra.join(" ")} --dbname "%DBURL%"`] : ["-c", `${tool} ${extra.join(" ")} --dbname "$DBURL"`], { input, maxBuffer: 1 << 30, env: { ...process.env, DBURL: url } });
  return spawnSync("docker", ["run", "--rm", "-i", "--add-host=host.docker.internal:host-gateway", "-e", "DBURL", "postgres:17-alpine", "sh", "-c", `${tool} ${extra.join(" ")} --dbname "$DBURL"`], { input, maxBuffer: 1 << 30, env: { ...process.env, DBURL: forContainer(url) } });
}
const needPostgres = () => {
  if (svc("database").engine !== ENGINES.postgres) fail("backup and restore are for PostgreSQL; for SQL Server use BACKUP DATABASE / RESTORE DATABASE with your server's tools.");
};
function backupCmd() {
  needPostgres();
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
  needPostgres();
  if (!file || !fs.existsSync(file)) fail(`No file ${file}`);
  urlFor(db);
  await ENGINES.postgres.recreate(projectUrl("database"), db);
  const r = pgTool("pg_restore", pgWithDatabase(projectUrl("database"), db), ["--no-owner", "--no-acl"], fs.readFileSync(file));
  if (r.status !== 0) fail("pg_restore failed.");
  console.log(`Restored into ${db}, owned by ${pgParse(projectUrl("database")).user}.`);
}

// ---------- the old model (PostgreSQL, one login per role on the machine's shared server) ----------

async function adoptLegacyCmd() {
  needPostgres();
  const env = readEnv();
  const admin = stored("database", "admin") || fail("Connect the old server's admin first (node scripts/db-setup.mjs connect database), after a backup.");
  const s = svc("database");
  if (!s.account || !stored("database", "project")) await provision({ ...s, mode: "existing" }, admin);
  const account = svc("database").account;
  const q1 = (v) => `'${String(v).replace(/'/g, "''")}'`;
  const id = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const oldLogins = new Set();
  for (const d of DBS()) if (env.get(d.env)) oldLogins.add(pgParse(env.get(d.env)).user);
  if (env.get("CI_DATABASE_URL")) oldLogins.add(pgParse(env.get("CI_DATABASE_URL")).user);
  oldLogins.delete(account);
  const moved = [];
  for (const d of DBS()) {
    const exists = await withPg(admin, (q) => q(`SELECT 1 AS x FROM pg_database WHERE datname = ${q1(d.db)}`));
    if (!exists.length) continue;
    await withPg(pgWithDatabase(admin, d.db), async (q) => {
      for (const login of oldLogins) {
        const [r] = await q(`SELECT 1 AS x FROM pg_roles WHERE rolname = ${q1(login)}`);
        if (r) await q(`REASSIGN OWNED BY ${id(login)} TO ${id(account)}`);
      }
    });
    await withPg(admin, (q) => q(`ALTER DATABASE ${id(d.db)} OWNER TO ${id(account)}`));
    moved.push(d.db);
  }
  saveService("database", { mode: "existing", databases: DBS().map((d) => d.db), adopted: new Date().toISOString().slice(0, 10) });
  envCmd();
  console.log(`Moved to the project account ${account}: ${moved.join(", ") || "no database found"}. The old logins (${[...oldLogins].join(", ") || "none"}) are kept: drop them yourself once the app, the migrations and CI work with the new URLs.`);
}

// ---------- use: what the stack needs ----------

function useCmd(kind, engine) {
  const allowed = { database: ["postgres", "mssql", "none"], cache: ["redis", "none"] };
  if (!allowed[kind] || !allowed[kind].includes(engine || "")) fail("Usage: node scripts/db-setup.mjs use database <postgres|mssql|none> | use cache <redis|none>");
  const cur = services()[kind];
  if (cur && cur.engine && cur.engine !== engine && (cur.account || cur.port)) fail(`The ${kind} is already set up on ${cur.engine}; changing the engine is a decision for the Lead and the owner (an ADR), not a switch.`);
  saveService(kind, { engine, mode: cur?.mode || "local" });
  console.log(`${kind}: ${engine}${engine === "none" ? "" : ", local by default (node scripts/db-setup.mjs local)"}.`);
}

// ---------- commands ----------

if (cmd === "--plan" || flag("--plan")) {
  for (const s of enabled()) {
    console.log(`${s.kind}: ${s.engine.title}, ${s.mode || "local"}; project account ${s.account || P} (one account for the whole project)`);
    if (s.kind === "database") {
      for (const d of DBS()) console.log(`  ${d.db} -> ${d.env}`);
      console.log(`  CI: ${P}_ci_* (created and dropped by the project account) -> CI_DATABASE_URL`);
    } else console.log(`  keys ${P}:*, each role its own prefix -> REDIS_URL, REDIS_PREFIX`);
  }
  process.exit(0);
}
const commands = {
  use: () => useCmd(a1, a2),
  local: () => localCmd(a1 || "up"),
  connect: () => connectCmd(a1),
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
};
if (!commands[cmd || "status"]) fail("Usage: node scripts/db-setup.mjs use | local [up|stop|status|destroy] | connect <database|cache> | create | env | check | status | reset <db> | reset-check | migrate <db> | seed <db> [small|full] | backup | restore <file> [db] | adopt-legacy | --plan");
try {
  await commands[cmd || "status"]();
} catch (e) {
  fail(safe(e));
}
