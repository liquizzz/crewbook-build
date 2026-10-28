#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// Run a version of the product in Docker with one command, the same on Windows, macOS and Linux:
//   node scripts/run.mjs            the latest release tag (or the dev image when there is none)
//   node scripts/run.mjs v0.1.0     that release
//   node scripts/run.mjs staging    the image CI built from staging (what the owner tries before a release)
//   node scripts/run.mjs dev        the work in progress on dev, built on this machine
// With CI on this machine ("ci": "local" in .claude/project.json, scripts/ci-mode.mjs) GitHub builds no image:
// staging and every tag are built here too, from that branch or tag, in a throw-away worktree.
//   node scripts/run.mjs --source   build what is checked out here instead of pulling an image
//   node scripts/run.mjs --stop     stop it
//   --dry-run                       print the steps without running Docker
// It checks that Docker runs and port 3000 is free, logs in to ghcr.io with the gh CLI when the image is private,
// pulls the image, starts the app, waits for its healthcheck and opens the browser. It never prints a token.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { mainCheckout, readProject } from "./project-level.mjs";

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const dry = flag("--dry-run");
const root = mainCheckout();
const project = readProject(root) || {};
const owner = (project.repo || "").split("/")[0];
const PORT = 3000;
const URL = `http://localhost:${PORT}`;

const quiet = (file, a, opts = {}) => {
  try {
    return execFileSync(file, a, { cwd: root, stdio: ["ignore", "pipe", "pipe"], ...opts }).toString().trim();
  } catch {
    return null;
  }
};
const step = (text) => console.log(`- ${text}`);
const stop = (text) => {
  console.error(`\n${text}`);
  process.exit(1);
};
const compose = (a, tag) => {
  if (dry) return step(`docker compose ${a.join(" ")}${tag ? `   (IMAGE_TAG=${tag})` : ""}`);
  const r = spawnSync("docker", ["compose", ...a], { cwd: root, stdio: "inherit", env: { ...process.env, ...(tag ? { IMAGE_TAG: tag } : {}) } });
  return r.status === 0;
};

if (flag("--stop")) {
  compose(["down"]);
  console.log("Stopped.");
  process.exit(0);
}

const source = flag("--source");
const asked = args.find((a) => !a.startsWith("--"));
quiet("git", ["fetch", "--tags", "--quiet"]);
// On main, bring the compose file and scripts up to date with the releases.
if (quiet("git", ["branch", "--show-current"]) === "main" && !dry) quiet("git", ["pull", "--ff-only", "--quiet"]);
const tag = asked || quiet("git", ["describe", "--tags", "--abbrev=0"]) || "dev";
console.log(`Running ${source ? "the code checked out here" : `version ${tag}`} of ${project.name || "the project"}${dry ? " (dry run)" : ""}:`);

// 1. Docker must be running.
if (!dry && !quiet("docker", ["info", "--format", "{{.ServerVersion}}"])) {
  stop("Docker is not running. Start Docker Desktop (or the Docker service), wait until it says it is running, then run this again.");
}
step("Docker is running");

// 2. Port 3000: free, or already used by this project's app (it is replaced).
const busy = await new Promise((resolve) => {
  const s = net.createServer().once("error", () => resolve(true)).once("listening", () => s.close(() => resolve(false)));
  s.listen(PORT, "0.0.0.0");
});
const ours = Boolean(quiet("docker", ["compose", "ps", "-q", "app"]));
if (busy && !ours && !dry) {
  stop(`Port ${PORT} is used by another program. Close it, or change "${PORT}:3000" in docker-compose.yml, then run this again.`);
}
step(busy && ours ? `port ${PORT}: the running app is replaced` : `port ${PORT} is free`);

// 3. The image: pull it (logging in to ghcr.io with gh when the repo is private), or build it here.
// dev is always built here; with CI on this machine, staging and tags too (GitHub builds no image then).
const buildHere = !source && (tag === "dev" || project.ci === "local");
const buildFrom = (ref) => {
  if (dry) return step(`build app from ${ref} in a temporary worktree   (IMAGE_TAG=${ref})`);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "crewbook-run-"));
  const work = path.join(dir, "src");
  const commit = quiet("git", ["rev-parse", "--verify", "-q", `${ref}^{commit}`]) || quiet("git", ["rev-parse", "--verify", "-q", `origin/${ref}^{commit}`]);
  if (!commit) stop(`There is no branch or tag ${ref}. Check the tags with  git tag`);
  quiet("git", ["worktree", "add", "--detach", work, commit]);
  const r = spawnSync("docker", ["compose", "-f", path.join(work, "docker-compose.yml"), "build", "app"], { cwd: work, stdio: "inherit", env: { ...process.env, IMAGE_TAG: ref } });
  quiet("git", ["worktree", "remove", "--force", work]);
  fs.rmSync(dir, { recursive: true, force: true });
  return r.status === 0;
};
if (source) {
  if (compose(["build", "app"], tag) === false) stop("The build failed. Send the lines above to the Lead.");
} else if (buildHere) {
  if (buildFrom(tag) === false) stop("The build failed. Send the lines above to the Lead.");
} else if (compose(["pull", "app"], tag) === false) {
  const token = owner ? quiet("gh", ["auth", "token"]) : null;
  const login = token && quiet("docker", ["login", "ghcr.io", "-u", owner, "--password-stdin"], { input: token, stdio: ["pipe", "pipe", "pipe"] });
  if (!login || compose(["pull", "app"], tag) === false) {
    stop(`Could not download the image for ${tag}.
- A private repo needs read access once: gh auth refresh -s read:packages   then run this again.
- A version that does not exist: check the tags with  git tag  (or use "dev").`);
  }
}
step(source ? "image built from this folder" : buildHere ? `image ${tag} built here` : `image ${tag} downloaded`);

// 4. Start and wait for the healthcheck.
if (compose(["up", "-d", "--no-build", "--wait", "--wait-timeout", "120", "app"], tag) === false) {
  console.error("\nThe app did not become ready. Its last lines:");
  spawnSync("docker", ["compose", "logs", "--tail", "30", "app"], { cwd: root, stdio: "inherit" });
  stop("Send these lines to the Lead. Stop it with: node scripts/run.mjs --stop");
}
step("the app answers its healthcheck");

// 5. Open the browser.
if (!dry) {
  const [file, a] = process.platform === "win32" ? ["cmd", ["/c", "start", "", URL]] : [process.platform === "darwin" ? "open" : "xdg-open", [URL]];
  spawnSync(file, a, { stdio: "ignore" });
}
console.log(`\nOpen ${URL}. Stop it with: node scripts/run.mjs --stop`);
