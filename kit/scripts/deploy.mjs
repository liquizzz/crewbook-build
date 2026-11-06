#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// Put a version on an environment's server (/cb-deploy): the server pulls the images of that tag from the registry and
// starts them; nothing is built there and the build host holds no key to it.
//   node scripts/deploy.mjs <env> <tag>          staging: the Dev runs it; a rollback is the same with the previous tag
//   node scripts/deploy.mjs production <tag> --owner   production: only the owner runs it (the role guard stops sessions)
//   --dry-run                                     print the command
// The server: "environments" in .claude/project.json ({ "staging": { "ssh": "user@host", "path": "...", "url": "..." } }),
// or for staging the machine's ~/.crewbook/hosts.json (node scripts/hosts.mjs set staging ...). The server has a clone
// of the repo at that path (for docker-compose.yml) and its own .env.local with that environment's secrets.
// A rollback by tag does not undo a schema change: run the release's rollback script too (rule "Data changes").
import { spawnSync } from "node:child_process";
import { imagesOf, mainCheckout, readHosts, readProject, registryOf } from "./project-level.mjs";

const args = process.argv.slice(2);
const dry = args.includes("--dry-run");
const [envName, tag] = args.filter((a) => !a.startsWith("--"));
const fail = (t) => {
  console.error(t);
  process.exit(1);
};
if (!envName || !tag) fail("Usage: node scripts/deploy.mjs <env> <tag> [--owner] [--dry-run]");
if (envName === "production" && !args.includes("--owner")) fail("Production is deployed by the owner only: the owner runs  node scripts/deploy.mjs production <tag> --owner  in a terminal.");
const project = readProject(mainCheckout()) || {};
const target = project.environments?.[envName] || (envName === "staging" ? readHosts().staging : null);
if (!target?.ssh) fail(`No server for ${envName}: add it to "environments" in .claude/project.json${envName === "staging" ? ", or run node scripts/hosts.mjs set staging ssh:<user>@<host> <path> <url>" : ""}. Without one, staging runs here: node scripts/run.mjs staging.`);
const registry = registryOf(project);
if (!registry && !(project.repo)) fail("No registry to pull from: node scripts/hosts.mjs set registry <host:port>, or a GitHub repo for GHCR.");
const images = imagesOf(project).map((i) => i.name).join(" ");
const where = target.path || `~/${(project.repo || project.name || "app").split("/").pop()}`;
const vars = `IMAGE_TAG=${tag}${registry ? ` REGISTRY=${registry}` : ""}`;
const remote = `cd ${where} && git fetch -q --tags origin && git checkout -q ${tag} 2>/dev/null; ${vars} docker compose pull ${images} && ${vars} docker compose up -d --no-build --wait --wait-timeout 120 ${images}`;
if (dry) {
  console.log(`ssh ${target.ssh} ${remote}`);
  process.exit(0);
}
console.log(`Deploying ${tag} to ${envName} (${target.ssh}):`);
const r = spawnSync("ssh", [target.ssh, remote], { stdio: "inherit" });
if (r.status !== 0) fail(`The deploy did not finish (exit ${r.status}). The previous version may still run; check with the Lead before trying again.`);
console.log(`\n${envName} runs ${tag}${target.url ? `: ${target.url}` : ""}. A rollback: node scripts/deploy.mjs ${envName} <previous tag>${envName === "production" ? " --owner" : ""}.`);
