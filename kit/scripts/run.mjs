#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// Run a version of the product in Docker with one command, the same on Windows, macOS and Linux:
//   node scripts/run.mjs            the latest release tag (or the dev image when there is none)
//   node scripts/run.mjs v0.1.0     that release
//   node scripts/run.mjs staging    the image of staging (what the owner tries before a release)
//   node scripts/run.mjs dev        the work in progress on dev
//   node scripts/run.mjs --source   build what is checked out here instead of using an image
//   node scripts/run.mjs --stop     stop it
//   --build-only                    build (and push) the images, do not start them (the Lead after a merge, a build host)
//   --here                          build on this machine even when the project has a build host
//   --dry-run                       print the steps without running Docker
// The images are "images" in .claude/project.json ({ name, paths }), else one "app". An image is built once per source
// tree: dev builds only the images whose paths changed since the last dev build and tags them :dev and :dev-<sha>
// (Test and Frontend pin :dev-<sha>); a tag whose files equal those of an image already built (the release tag of the
// accepted staging commit) is tagged with docker tag, not built again. With CI on this machine ("ci": "local") GitHub
// builds no image: staging and tags are built here too. With a registry ("registry" in project.json or
// ~/.crewbook/hosts.json) the built images are pushed; with a build host ("buildHost") they are built there over SSH
// and pulled here. After a dev build, "devMigrate" in project.json (a command) brings the Frontend database up to date.
// It checks that Docker runs and port 3000 is free, logs in to ghcr.io with the gh CLI when the image is private,
// starts the app, waits for its healthcheck and opens the browser. It never prints a token.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { buildHostOf, imageRecord, imagesOf, mainCheckout, onBuildHost, readProject, registryOf, sameTreeTag } from "./project-level.mjs";

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const dry = flag("--dry-run");
const buildOnly = flag("--build-only");
const root = mainCheckout();
// The project record of this checkout (a role worktree may be ahead of the main checkout), else the main checkout's.
const here = (() => {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return root;
  }
})();
const project = readProject(here) || readProject(root) || {};
const owner = (project.repo || "").split("/")[0];
const registry = registryOf(project);
const images = imagesOf(project).map((i) => i.name);
const PORT = 3000;
const URL = `http://localhost:${PORT}`;
const env = (tag) => ({ ...process.env, ...(tag ? { IMAGE_TAG: tag } : {}), ...(registry ? { REGISTRY: registry } : {}) });

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
  return spawnSync("docker", ["compose", ...a], { cwd: root, stdio: "inherit", env: env(tag) }).status === 0;
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
console.log(`${buildOnly ? "Building" : "Running"} ${source ? "the code checked out here" : `version ${tag}`} of ${project.name || "the project"}${dry ? " (dry run)" : ""}:`);

// 1. Docker must be running.
if (!dry && !quiet("docker", ["info", "--format", "{{.ServerVersion}}"])) {
  stop("Docker is not running. Start Docker Desktop (or the Docker service), wait until it says it is running, then run this again.");
}
step("Docker is running");

// 2. The images: built here (dev always; staging and tags with CI on this machine), built on the build host and
// pulled, or pulled from the registry.
const buildHere = !source && (tag === "dev" || project.ci === "local");
const remote = buildHere && !flag("--here") && buildHostOf(project);
const commitOf = (ref) => quiet("git", ["rev-parse", "--verify", "-q", `${ref}^{commit}`]) || quiet("git", ["rev-parse", "--verify", "-q", `origin/${ref}^{commit}`]);
// The tree of an image's paths at a commit: equal trees mean equal images.
const treeOf = (commit, name) => {
  const paths = imagesOf(project).find((i) => i.name === name)?.paths || ["."];
  return paths.map((p) => quiet("git", ["rev-parse", `${commit}:${p === "." ? "" : p.replace(/\/+$/, "")}`]) || "-").join("+");
};
const push = (name, t) => {
  if (!registry) return true;
  if (dry) return step(`push ${name}:${t} to ${registry}`) ?? true;
  return compose(["push", name], t);
};
const buildFrom = (ref) => {
  const commit = commitOf(ref);
  if (dry) {
    step(`build ${images.join(", ")} from ${ref} in a temporary worktree, or tag the image already built from the same files${ref === "dev" ? "; only the images whose files changed, tagged :dev and :dev-<sha>" : ""}   (IMAGE_TAG=${ref})`);
    images.forEach((n) => push(n, ref));
    return true;
  }
  if (!commit) stop(`There is no branch or tag ${ref}. Check the tags with  git tag`);
  const sha = commit.slice(0, 7);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "crewbook-run-"));
  const work = path.join(dir, "src");
  quiet("git", ["worktree", "add", "--detach", work, commit]);
  const composeFile = path.join(work, "docker-compose.yml");
  const imageOf = (name, t) => (quiet("docker", ["compose", "-f", composeFile, "config", "--images", name], { cwd: work, env: env(t) }) || "").split(/\r?\n/).find((l) => l.endsWith(`:${t}`));
  const record = imageRecord(root);
  let ok = true;
  for (const name of images) {
    const tree = treeOf(commit, name);
    const key = (t) => (name === "app" ? t : `${t}:${name}`);
    if (ref === "dev" && record.get()[key("dev")] === tree && imageOf(name, "dev") && quiet("docker", ["image", "inspect", imageOf(name, "dev")]) !== null) {
      step(`${name}: no change since the last dev build`);
      continue;
    }
    const twin = ref === "dev" ? null : sameTreeTag(Object.fromEntries(Object.entries(record.get()).filter(([k]) => (name === "app" ? !k.includes(":") : k.endsWith(`:${name}`))).map(([k, v]) => [k.split(":")[0], v])), ref, tree);
    let built = false;
    if (twin && imageOf(name, twin) && quiet("docker", ["image", "inspect", imageOf(name, twin)]) !== null && imageOf(name, ref)) {
      built = spawnSync("docker", ["tag", imageOf(name, twin), imageOf(name, ref)], { stdio: "inherit" }).status === 0;
      if (built) step(`${name} ${ref}: the same files as ${twin}, tagged, not built again`);
    }
    if (!built) built = spawnSync("docker", ["compose", "-f", composeFile, "build", name], { cwd: work, stdio: "inherit", env: env(ref) }).status === 0;
    if (built && ref === "dev") built = spawnSync("docker", ["tag", imageOf(name, "dev"), imageOf(name, "dev").replace(/:dev$/, `:dev-${sha}`)], { stdio: "inherit" }).status === 0;
    if (built) {
      record.set(key(ref), tree);
      push(name, ref);
      if (ref === "dev") push(name, `dev-${sha}`);
      step(`${name} ${ref}${ref === "dev" ? ` (and dev-${sha})` : ""} built`);
    }
    ok = ok && built;
  }
  quiet("git", ["worktree", "remove", "--force", work]);
  fs.rmSync(dir, { recursive: true, force: true });
  // The Frontend database follows the new api (rule "Environments"); Test moves its pinned images itself.
  if (ok && ref === "dev" && project.devMigrate) {
    step(`devMigrate: ${project.devMigrate}`);
    ok = spawnSync(project.devMigrate, { cwd: root, shell: true, stdio: "inherit", env: { ...process.env, CREWBOOK_DB_ENV: "frontend" } }).status === 0;
  }
  return ok;
};
if (source) {
  if (compose(["build", ...images], tag) === false) stop("The build failed. Send the lines above to the Lead.");
  step("images built from this folder");
} else if (remote) {
  const code = onBuildHost(project, "run.mjs", [tag, "--build-only"]);
  if (code !== 0) stop("The build on the build host failed. Send the lines above to the Lead.");
  if (!registry) stop(`Built on ${remote.ssh}, but there is no registry to bring the images here: node scripts/hosts.mjs set registry <host:port>.`);
  step(`images ${tag} built on ${remote.ssh}`);
  if (!buildOnly && compose(["pull", ...images], tag) === false) stop("Could not pull the images from the registry.");
} else if (buildHere) {
  if (buildFrom(tag) === false) stop("The build failed. Send the lines above to the Lead.");
  step(`images ${tag} ready here`);
} else if (compose(["pull", ...images], tag) === false) {
  const token = owner ? quiet("gh", ["auth", "token"]) : null;
  const login = token && quiet("docker", ["login", "ghcr.io", "-u", owner, "--password-stdin"], { input: token, stdio: ["pipe", "pipe", "pipe"] });
  if (!login || compose(["pull", ...images], tag) === false) {
    stop(`Could not download the image for ${tag}.
- A private repo needs read access once: gh auth refresh -s read:packages   then run this again.
- A version that does not exist: check the tags with  git tag  (or use "dev").`);
  }
  step(`images ${tag} downloaded`);
}
if (buildOnly) process.exit(0);

// 3. Port 3000: free, or already used by this project's app (it is replaced).
const busy = await new Promise((resolve) => {
  const s = net.createServer().once("error", () => resolve(true)).once("listening", () => s.close(() => resolve(false)));
  s.listen(PORT, "0.0.0.0");
});
const ours = Boolean(quiet("docker", ["compose", "ps", "-q"]));
if (busy && !ours && !dry) {
  stop(`Port ${PORT} is used by another program. Close it, or change the "${PORT}:..." port in docker-compose.yml, then run this again.`);
}
step(busy && ours ? `port ${PORT}: the running app is replaced` : `port ${PORT} is free`);

// 4. Start and wait for the healthcheck.
if (compose(["up", "-d", "--no-build", "--wait", "--wait-timeout", "120", ...images], tag) === false) {
  console.error("\nThe app did not become ready. Its last lines:");
  spawnSync("docker", ["compose", "logs", "--tail", "30", ...images], { cwd: root, stdio: "inherit" });
  stop("Send these lines to the Lead. Stop it with: node scripts/run.mjs --stop");
}
step("the app answers its healthcheck");

// 5. Open the browser.
if (!dry) {
  const [file, a] = process.platform === "win32" ? ["cmd", ["/c", "start", "", URL]] : [process.platform === "darwin" ? "open" : "xdg-open", [URL]];
  spawnSync(file, a, { stdio: "ignore" });
}
console.log(`\nOpen ${URL}. Stop it with: node scripts/run.mjs --stop`);
