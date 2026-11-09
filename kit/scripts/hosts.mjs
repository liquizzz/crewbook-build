#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// The machine's shared hosts and services, set once for every project (~/.crewbook, or CREWBOOK_HOME). No passwords
// in hosts.json; they go to ~/.crewbook/.env, outside every repo, through "secret".
//   node scripts/hosts.mjs                                 the hosts, and the shared services that run
//   node scripts/hosts.mjs set build <local|ssh:user@host> [path]   where images are built and ci-local runs
//   node scripts/hosts.mjs set registry <host:port|ghcr.io/owner|none>
//   node scripts/hosts.mjs set staging <ssh:user@host> [path] [url]  the server staging runs on (/cb-deploy staging)
//   node scripts/hosts.mjs add db <name> <engine> <version> <host:port>   a database server (the shared one, or online)
//   node scripts/hosts.mjs shared <up|down> <service...>   start or stop shared services on this machine:
//                                                          sqlserver-2022, postgres-17, redis-7, registry
//   node scripts/hosts.mjs secret <NAME>                   a password for the shared services (hidden, never printed;
//                                                          POSTGRES_PASSWORD also changes it in the running server)
//   --dry-run                                              print what would run
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { crewbookHome, mainCheckout, readHosts } from "./project-level.mjs";

const args = process.argv.slice(2).filter((a) => a !== "--dry-run");
const dry = process.argv.includes("--dry-run");
const home = crewbookHome();
const file = path.join(home, "hosts.json");
const hosts = readHosts();
const fail = (t) => {
  console.error(t);
  process.exit(1);
};
const save = (next) => {
  fs.mkdirSync(home, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(next, null, 2) + "\n");
};
const sharedDir = path.join(home, "shared");
const sharedFile = path.join(sharedDir, "docker-compose.yml");
const [cmd, what, ...rest] = args;

if (!cmd) {
  console.log(`Hosts (${file}):`);
  console.log(`  build:    ${hosts.build ? (typeof hosts.build === "string" ? hosts.build : `ssh:${hosts.build.ssh} ${hosts.build.path || ""}`) : "local (this machine)"}`);
  console.log(`  registry: ${hosts.registry || "GHCR (the repo's owner on ghcr.io)"}`);
  console.log(`  staging:  ${hosts.staging ? `ssh:${hosts.staging.ssh} ${hosts.staging.path || ""} ${hosts.staging.url || ""}`.trim() : "this machine (node scripts/run.mjs staging)"}`);
  const dbs = Object.entries(hosts.databases || {});
  console.log(`  databases: ${dbs.length ? dbs.map(([n, d]) => `${n} (${d.engine} ${d.version} at ${d.host})`).join(", ") : "none yet"}`);
  const ps = fs.existsSync(sharedFile) ? spawnSync("docker", ["compose", "-f", sharedFile, "ps", "--format", "{{.Service}} {{.Status}}"], { encoding: "utf8" }) : null;
  console.log(`\nShared services here: ${ps?.status === 0 && ps.stdout.trim() ? ps.stdout.trim().split(/\r?\n/).join(", ") : "none running"}`);
  process.exit(0);
}

if (cmd === "set") {
  const [value, where, url] = rest;
  if (what === "build" && value) {
    save({ ...hosts, build: value === "local" ? "local" : { ssh: value.replace(/^ssh:/, ""), ...(where ? { path: where } : {}) } });
  } else if (what === "registry" && value) {
    const next = { ...hosts };
    if (value === "none") delete next.registry;
    else next.registry = value;
    save(next);
  } else if (what === "staging" && value) {
    save({ ...hosts, staging: { ssh: value.replace(/^ssh:/, ""), ...(where ? { path: where } : {}), ...(url ? { url } : {}) } });
  } else fail("Usage: node scripts/hosts.mjs set <build|registry|staging> <value> [path] [url]");
  console.log(`Set ${what}. Every project on this machine uses it unless its .claude/project.json says otherwise.`);
  process.exit(0);
}

if (cmd === "add" && what === "db") {
  const [name, engine, version, host] = rest;
  if (!name || !engine || !version || !host) fail("Usage: node scripts/hosts.mjs add db <name> <engine> <version> <host:port>");
  save({ ...hosts, databases: { ...(hosts.databases || {}), [name]: { engine, version, host } } });
  console.log(`Database server ${name}: ${engine} ${version} at ${host}. Each project gets its own databases and logins on it (/cb-env setup).`);
  process.exit(0);
}

// The password each shared service needs, from ~/.crewbook/.env. It is set when the service's data is first created;
// "secret" changes it in the running server too (POSTGRES_PASSWORD), so the file and the server never differ.
const NEEDS = { "sqlserver-2022": "MSSQL_SA_PASSWORD", "postgres-17": "POSTGRES_PASSWORD" };
const inEnvFile = (name) => {
  try {
    return fs.readFileSync(path.join(home, ".env"), "utf8").split(/\r?\n/).some((l) => l.startsWith(`${name}=`) && l.length > name.length + 1);
  } catch {
    return false;
  }
};

if (cmd === "shared" && ["up", "down"].includes(what)) {
  if (!fs.existsSync(sharedFile)) {
    const template = path.join(mainCheckout(), "docker", "shared-compose.yml");
    if (!fs.existsSync(template)) fail(`No template: ${template} is missing (it comes with the kit).`);
    if (!dry) {
      fs.mkdirSync(sharedDir, { recursive: true });
      fs.copyFileSync(template, sharedFile);
    }
    console.log(`Copied the shared services to ${sharedFile}.`);
  }
  // A copy from an older kit checks every password with ":?" and so stops one service for want of another's.
  const copy = fs.existsSync(sharedFile) ? fs.readFileSync(sharedFile, "utf8") : "";
  if (/:\?run node scripts\/hosts\.mjs secret/.test(copy) && !dry) {
    fs.writeFileSync(sharedFile, copy.replace(/\$\{([A-Z_]+):\?run node scripts\/hosts\.mjs secret [A-Z_]+\}/g, "${$1:-}"));
  }
  if (what === "up" && !rest.length) fail("Name the services to start: sqlserver-2022, postgres-17, redis-7, registry.");
  // Each service's password, checked only for the services being started (the compose file has no ":?" check).
  const missing = what === "up" ? rest.map((s) => NEEDS[s]).filter((v) => v && !inEnvFile(v)) : [];
  if (missing.length && dry) console.log(missing.map((v) => `Needs ${v} (node scripts/hosts.mjs secret ${v}) before it starts.`).join("\n"));
  else if (missing.length) fail(missing.map((v) => `Set ${v} first: node scripts/hosts.mjs secret ${v}`).join("\n"));
  const a = ["compose", "-f", sharedFile, "--env-file", path.join(home, ".env"), ...rest.flatMap((s) => ["--profile", s]), ...(what === "up" ? ["up", "-d", "--wait", ...rest] : ["down"])];
  if (dry) {
    console.log(`docker ${a.join(" ")}`);
    process.exit(0);
  }
  if (!fs.existsSync(path.join(home, ".env"))) fs.writeFileSync(path.join(home, ".env"), "");
  const r = spawnSync("docker", a, { stdio: "inherit" });
  if (r.status === 0 && what === "up") {
    const ports = { "sqlserver-2022": ["sqlserver", "2022", "localhost:1433"], "postgres-17": ["postgres", "17", "localhost:5432"], "redis-7": ["redis", "7", "localhost:6379"] };
    const dbs = { ...(hosts.databases || {}) };
    for (const s of rest) if (ports[s] && !dbs[s]) dbs[s] = { engine: ports[s][0], version: ports[s][1], host: ports[s][2] };
    const next = { ...hosts, databases: dbs };
    if (rest.includes("registry") && !hosts.registry) next.registry = "localhost:5000";
    save(next);
  }
  process.exit(r.status ?? 1);
}

if (cmd === "secret" && /^[A-Z][A-Z0-9_]*$/.test(what || "")) {
  const read = () => {
    if (!process.stdin.isTTY) return Promise.resolve(fs.readFileSync(0, "utf8").split(/\r?\n/)[0]);
    process.stdout.write(`${what} (hidden): `);
    return new Promise((resolve) => {
      let value = "";
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", function onData(ch) {
        if (ch === "\r" || ch === "\n" || ch === "\u0004") {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener("data", onData);
          process.stdout.write("\n");
          resolve(value);
        } else if (ch === "\u0003") process.exit(1);
        else if (ch === "\u0008" || ch === "\u007f") value = value.slice(0, -1);
        else value += ch;
      });
    });
  };
  const value = (await read()).trim();
  if (!value) fail("Nothing entered; nothing changed.");
  fs.mkdirSync(home, { recursive: true });
  const envFile = path.join(home, ".env");
  const lines = (fs.existsSync(envFile) ? fs.readFileSync(envFile, "utf8").split(/\r?\n/) : []).filter((l) => l && !l.startsWith(`${what}=`));
  fs.writeFileSync(envFile, [...lines, `${what}=${value}`].join("\n") + "\n");
  console.log(`${what} set in ${envFile} (not shown).`);
  // The value only applies when a server's data is first created. For a running shared Postgres, change it there too,
  // over the container's local socket (no old password needed); the value goes through stdin, never the command line.
  if (what === "POSTGRES_PASSWORD") {
    const container = spawnSync("docker", ["ps", "-q", "--filter", "label=com.docker.compose.project=crewbook-shared", "--filter", "label=com.docker.compose.service=postgres-17"], { encoding: "utf8" });
    const id = (container.stdout || "").trim().split(/\r?\n/)[0];
    if (id) {
      const sql = `ALTER ROLE postgres PASSWORD '${value.replace(/'/g, "''")}';\n`;
      const r = spawnSync("docker", ["exec", "-i", id, "psql", "-U", "postgres", "-q", "-v", "ON_ERROR_STOP=1"], { input: sql, encoding: "utf8" });
      console.log(r.status === 0 ? "The running shared Postgres uses the new password too." : "Could not change it in the running Postgres; it still has the old one. Run this again once it runs.");
    }
  }
  process.exit(0);
}

fail("Usage: node scripts/hosts.mjs [set <build|registry|staging> ... | add db ... | shared <up|down> <service...> | secret <NAME>] [--dry-run]");
