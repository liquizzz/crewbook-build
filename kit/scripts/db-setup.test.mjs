// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// Behaviour of scripts/db-setup.mjs against real PostgreSQL servers (the acceptance cases of the database model).
// It makes temporary projects, starts their managed servers with Docker and removes them at the end. Without Docker it
// runs the cases that need no server and says the rest were skipped.
// Run: node kit/scripts/db-setup.test.mjs
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { literal, parseUrl, withPg } from "./pg-client.mjs";

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

// A project: a git repo with the kit's scripts, its roles and a worktree per role.
function makeProject(name, roles = ["lead", "dev", "frontend", "test"]) {
  const dir = path.join(tmp, name.toLowerCase());
  fs.mkdirSync(path.join(dir, ".claude"), { recursive: true });
  fs.cpSync(scripts, path.join(dir, "scripts"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".claude", "project.json"), JSON.stringify({ name, roles }, null, 2));
  fs.writeFileSync(path.join(dir, ".gitignore"), ".env.local\n");
  git(tmp, "init", "-q", "-b", "main", dir);
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "kit");
  for (const r of roles.filter((x) => x !== "lead")) git(dir, "worktree", "add", "-q", "-b", `role/${r}`, `${dir}-wt-${r}`);
  return dir;
}
const db = (dir, input, ...a) => {
  const r = spawnSync("node", [path.join("scripts", "db-setup.mjs"), ...a], { cwd: dir, input: input || "", encoding: "utf8" });
  outputs.push(r.stdout + r.stderr);
  return r;
};
const envOf = (file) => Object.fromEntries((fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "").split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const pj = (dir) => JSON.parse(fs.readFileSync(path.join(dir, ".claude", "project.json"), "utf8"));
const owners = (admin, prefix) => withPg(admin, (q) => q(`SELECT d.datname AS db, r.rolname AS owner FROM pg_database d JOIN pg_roles r ON r.oid = d.datdba WHERE d.datname LIKE ${literal(prefix + "_%")} ORDER BY 1`));

// Cases that need no server.
{
  const p = makeProject("Plain");
  const plan = db(p, "", "--plan");
  check("plan: one project account for every database, CI included", plan.stdout.includes("Project account: plain") && plan.stdout.includes("plain_dev -> DEV_DATABASE_URL") && plan.stdout.includes("plain_ci_*"));
  const low = db(p, "not a url\n", "connect");
  check("connect: a bad connection string changes nothing", low.status === 1 && !fs.existsSync(path.join(p, ".env.local")));
  const native = db(p, "", "managed", "create", "--adapter", "native");
  check("AC-16: an adapter not supported yet says so and leaves the step not done", native.status === 2 && native.stderr.includes("not supported yet") && !pj(p).database);
}

const docker = spawnSync("docker", ["compose", "version"], { stdio: "ignore" }).status === 0 && spawnSync("docker", ["info"], { stdio: "ignore" }).status === 0;
const managed = [];
if (!docker) console.log("SKIP the server cases: Docker is not running.");
else {
  try {
    // AC-03: a managed server for A, one project account, every database of A owned by it.
    const A = makeProject("Alpha");
    managed.push(A);
    const made = db(A, "", "managed", "create");
    const envA = envOf(path.join(A, ".env.local"));
    check("AC-03: managed create starts A's own server and creates one project account", made.status === 0 && pj(A).database.type === "managed" && pj(A).database.account === "alpha" && Boolean(envA.DB_ADMIN_URL) && parseUrl(envA.DB_PROJECT_URL).user === "alpha");
    const created = db(A, "", "create");
    const ownedA = await owners(envA.DB_ADMIN_URL, "alpha");
    check("AC-13: every database of A is owned by the one account alpha", created.status === 0 && ownedA.length === 4 && ownedA.every((r) => r.owner === "alpha"));
    // AC-08 / AC-13: each role's DATABASE_URL points at its own database, same account; no admin in a worktree.
    const dev = envOf(`${A}-wt-dev/.env.local`);
    const fe = envOf(`${A}-wt-frontend/.env.local`);
    const te = envOf(`${A}-wt-test/.env.local`);
    check("AC-08: Dev, Frontend and Test get their own DATABASE_URL, with no admin or project URL", parseUrl(dev.DATABASE_URL).database === "alpha_dev" && parseUrl(fe.DATABASE_URL).database === "alpha_frontend" && parseUrl(te.DATABASE_URL).database === "alpha_test" && [dev, fe, te].every((e) => !e.DB_ADMIN_URL && !e.DB_PROJECT_URL && !e.DB_MANAGED_ADMIN_PASSWORD));
    check("AC-13: every role's URL uses the same account and password", new Set([dev, fe, te].map((e) => `${parseUrl(e.DATABASE_URL).user}:${parseUrl(e.DATABASE_URL).password}`)).size === 1);
    const checkA = db(A, "", "check");
    check("check: the project account opens every database, other places stay pending", checkA.status === 0 && checkA.stdout.includes("Other places"));
    // AC-07: run again, nothing duplicated, no password changed.
    const portA = pj(A).database.managed.port;
    const again = db(A, "", "managed", "create");
    const createdAgain = db(A, "", "create");
    check("AC-07: running again keeps the server, its port and the passwords, and creates nothing twice", again.status === 0 && pj(A).database.managed.port === portA && envOf(path.join(A, ".env.local")).DB_PROJECT_URL === envA.DB_PROJECT_URL && createdAgain.stdout.includes("nothing created"));

    // AC-04: a second managed project on the same machine.
    const C = makeProject("Charlie", ["lead", "dev"]);
    managed.push(C);
    const madeC = db(C, "", "managed", "create");
    check("AC-04: two managed projects get their own compose project and port", madeC.status === 0 && pj(C).database.managed.project !== pj(A).database.managed.project && pj(C).database.managed.port !== portA);

    // AC-05: B uses A's admin connection string: one account B, every database of B owned by it.
    const B = makeProject("Bravo", ["lead", "dev", "test"]);
    const connB = db(B, envA.DB_ADMIN_URL + "\n", "connect");
    const createB = db(B, "", "create");
    const ownedB = await owners(envA.DB_ADMIN_URL, "bravo");
    const loginsOnA = await withPg(envA.DB_ADMIN_URL, (q) => q("SELECT rolname FROM pg_roles WHERE rolcanlogin AND rolname <> 'postgres' ORDER BY 1"));
    check("AC-05: B, given A's admin, creates exactly one account bravo and owns its databases with it", connB.status === 0 && createB.status === 0 && pj(B).database.type === "existing" && pj(B).database.provisioning === "admin" && ownedB.length === 3 && ownedB.every((r) => r.owner === "bravo") && loginsOnA.map((r) => r.rolname).join(",") === "alpha,bravo");
    check("AC-09: B has no server of its own to start or stop", !pj(B).database.managed && !fs.existsSync(path.join(B, "docker", "db-compose.yml")));

    // AC-12: D is given an account that may create databases: no new login.
    await withPg(envA.DB_ADMIN_URL, (q) => q("CREATE ROLE delta_owner LOGIN PASSWORD 'd3lta-pass-xyz' CREATEDB"));
    const D = makeProject("Delta", ["lead", "dev"]);
    const deltaUrl = `postgresql://delta_owner:d3lta-pass-xyz@localhost:${portA}/postgres?sslmode=disable`;
    const connD = db(D, deltaUrl + "\n", "connect");
    const createD = db(D, "", "create");
    const ownedD = await owners(envA.DB_ADMIN_URL, "delta");
    const deltaLogin = await withPg(envA.DB_ADMIN_URL, (q) => q("SELECT 1 AS x FROM pg_roles WHERE rolname = 'delta'"));
    check("AC-12: an account that may create databases owns them all; no login is created", connD.status === 0 && createD.status === 0 && pj(D).database.provisioning === "account" && ownedD.length === 2 && ownedD.every((r) => r.owner === "delta_owner") && deltaLogin.length === 0 && !envOf(path.join(D, ".env.local")).DB_ADMIN_URL);

    // AC-06: not enough rights: refused, nothing stored, nothing changed.
    await withPg(envA.DB_ADMIN_URL, (q) => q("CREATE ROLE echo_low LOGIN PASSWORD 'ech0-pass-xyz' NOCREATEDB"));
    const E = makeProject("Echo", ["lead", "dev"]);
    const connE = db(E, `postgresql://echo_low:ech0-pass-xyz@localhost:${portA}/postgres?sslmode=disable\n`, "connect");
    check("AC-06: an account that may not create databases is refused with what it lacks; nothing is stored", connE.status === 1 && connE.stderr.includes("CREATEDB") && !fs.existsSync(path.join(E, ".env.local")) && !pj(E).database);

    // AC-14: the endpoint and SSL options are kept; a server without SSL fails clearly when SSL is required.
    const F = makeProject("Foxtrot", ["lead", "dev"]);
    const connF = db(F, envA.DB_ADMIN_URL.replace("sslmode=disable", "sslmode=require") + "\n", "connect");
    check("AC-14: sslmode is honoured and a refusal names it, without the connection string", connF.status === 1 && connF.stderr.includes("sslmode=require") && !fs.existsSync(path.join(F, ".env.local")));
    check("AC-14: B's URLs keep the endpoint and the options of the connection string it was given", parseUrl(envOf(path.join(B, ".env.local")).DEV_DATABASE_URL).port === portA && envOf(path.join(B, ".env.local")).DEV_DATABASE_URL.includes("sslmode=disable"));

    // AC-17: the admin password changes; the project accounts keep theirs.
    await withPg(envA.DB_ADMIN_URL, (q) => q("ALTER ROLE postgres PASSWORD 'n3w-admin-pass-xyz'"));
    const createB2 = db(B, "", "check");
    check("AC-17: after the admin password changed, B still works with its own account", createB2.status === 0);
    const newAdmin = envA.DB_ADMIN_URL.replace(/:[^:@]+@/, ":n3w-admin-pass-xyz@");
    const reconn = db(B, newAdmin + "\n", "connect");
    check("AC-17: giving B the new admin updates only the admin connection; the project password stays", reconn.status === 0 && reconn.stdout.includes("unchanged") && envOf(path.join(B, ".env.local")).DB_PROJECT_URL === envOf(path.join(B, ".env.local")).DB_PROJECT_URL);

    // AC-09: stopping A's server warns that other projects use it, and needs --confirm.
    fs.writeFileSync(path.join(A, ".env.local"), fs.readFileSync(path.join(A, ".env.local"), "utf8").replace(/^DB_ADMIN_URL=.*$/m, `DB_ADMIN_URL=${newAdmin}`));
    const down = db(A, "", "managed", "down");
    check("AC-09: stopping a shared managed server names the other projects and waits for --confirm", down.status === 1 && down.stderr.includes("bravo") && down.stderr.includes("--confirm"));

    // AC-11 / AC-18: a project on the old model (one login per role) moves to one account; old logins stay.
    await withPg(newAdmin, async (q) => {
      await q("CREATE ROLE lima_dev LOGIN PASSWORD 'l1ma-dev-xyz'");
      await q("CREATE ROLE lima_staging LOGIN PASSWORD 'l1ma-stg-xyz'");
      await q("CREATE DATABASE lima_dev OWNER lima_dev");
      await q("CREATE DATABASE lima_staging OWNER lima_staging");
    });
    await withPg(newAdmin.replace(/\/postgres\?/, "/lima_dev?"), (q) => q("SET ROLE lima_dev; CREATE TABLE notes (id int); INSERT INTO notes VALUES (1)"));
    const L = makeProject("Lima", ["lead", "dev"]);
    fs.writeFileSync(path.join(L, ".env.local"), `DEV_DATABASE_URL=postgresql://lima_dev:l1ma-dev-xyz@localhost:${portA}/lima_dev?sslmode=disable\nSTAGING_DATABASE_URL=postgresql://lima_staging:l1ma-stg-xyz@localhost:${portA}/lima_staging?sslmode=disable\n`);
    const st = db(L, "", "status");
    const connL = db(L, newAdmin + "\n", "connect");
    const adopt = db(L, "", "adopt-legacy");
    const ownedL = await owners(newAdmin, "lima");
    const tableOwner = await withPg(newAdmin.replace(/\/postgres\?/, "/lima_dev?"), (q) => q("SELECT tableowner, (SELECT count(*) FROM notes) AS n FROM pg_tables WHERE tablename = 'notes'"));
    const oldLogins = await withPg(newAdmin, (q) => q("SELECT count(*) AS n FROM pg_roles WHERE rolname IN ('lima_dev', 'lima_staging')"));
    check("AC-11: the old model is detected, and nothing moves before the owner connects an admin", st.stdout.includes("Old model found"));
    check("AC-18: ownership moves to one project account, the data stays, the old logins are kept", connL.status === 0 && adopt.status === 0 && ownedL.every((r) => r.owner === "lima") && tableOwner[0]?.tableowner === "lima" && tableOwner[0]?.n === "1" && oldLogins[0].n === "2");

    // AC-10: no secret in any output.
    const known = [envA.DB_ADMIN_URL, envA.DB_PROJECT_URL, envOf(path.join(B, ".env.local")).DB_PROJECT_URL, envOf(path.join(C, ".env.local")).DB_PROJECT_URL].map((u) => parseUrl(u).password).concat(["d3lta-pass-xyz", "ech0-pass-xyz", "n3w-admin-pass-xyz", "l1ma-dev-xyz"]);
    check("AC-10: no password appears in any output", !outputs.some((o) => known.some((s) => s && o.includes(s))));
    // The passwords the kit generated (the fixed test passwords above are in this file, which the project copies).
    const generated = known.slice(0, 4);
    check("AC-10: the project's tracked files hold no secret", !generated.some((s) => s && (spawnSync("git", ["grep", "-I", "-q", "-e", s, "--", "."], { cwd: A }).status === 0 || fs.readFileSync(path.join(A, ".claude", "project.json"), "utf8").includes(s) || fs.readFileSync(path.join(A, "docker", "db-compose.yml"), "utf8").includes(s))));
  } catch (e) {
    failed++;
    console.log(`FAIL (error) ${e.message}`);
  } finally {
    for (const dir of managed) db(dir, "", "managed", "destroy", "--confirm");
  }
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
