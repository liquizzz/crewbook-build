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
// and pulled here. After a dev build, "devMigrate" in project.json (a command) brings the Frontend database up to date,
// run in the built commit with CREWBOOK_API_IMAGE naming the backend image just built; before staging starts,
// "stagingMigrate" does the same for the staging database. Staging gets its database, http cookies and the address
// people open through docker-compose.staging.yml, from STAGING_DATABASE_URL in .env.local, read here and never printed.
// It checks that Docker runs and port 3000 is free, logs in to ghcr.io with the gh CLI when the image is private,
// starts the app, waits for its healthcheck and opens the browser. It never prints a token.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { backendOf, buildHostOf, containerUrl, imageRecord, imagesOf, lanAddress, mainCheckout, onBuildHost, readProject, registryOf, sameTreeTag, serviceImage } from "./project-level.mjs";

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
// A layer's own folder is the first of its paths (apps/web). A layer whose folder does not exist yet (before its first
// task) has no image to build or start; buildFrom checks the built commit again.
const layerFolder = (name) => {
  const first = imagesOf(project).find((i) => i.name === name)?.paths?.[0];
  return first && first !== "." && !/\.[A-Za-z]+$/.test(first) ? first.replace(/\/+$/, "") : null;
};
const images = imagesOf(project).filter((i) => !layerFolder(i.name) || fs.existsSync(path.join(here, layerFolder(i.name)))).map((i) => i.name);
const backend = backendOf(project);
const PORT = 3000;
const URL = `http://localhost:${PORT}`;
const env = (tag) => ({ ...process.env, ...(tag ? { IMAGE_TAG: tag } : {}), ...(registry ? { REGISTRY: registry } : {}) });

// Staging's own values for the backend container (docker-compose.staging.yml lists the keys without a value). They hold
// the staging database password: kept in this process, passed to docker compose only, never printed.
const APP_KEYS = ["DATABASE_URL", "COOKIE_SECURE", "PUBLIC_URL", "REDIS_URL", "REDIS_PREFIX"];
const WEB_PORT = process.env.WEB_PORT || String(project.webPort || PORT);
let stagingVars;
const stagingEnv = () => {
  if (stagingVars) return stagingVars;
  let file = "";
  try {
    file = fs.readFileSync(path.join(root, ".env.local"), "utf8");
  } catch {}
  // Like dotenv: "export " allowed, the last line wins, a quoted value is unquoted, " # comment" ends an unquoted one.
  const lines = [...file.matchAll(/^\s*(?:export\s+)?STAGING_DATABASE_URL=(.*)$/gm)];
  let value = lines.length ? lines[lines.length - 1][1].trim() : "";
  value = /^(["']).*\1$/.test(value) ? value.slice(1, -1) : value.replace(/\s+#.*$/, "");
  const url = value && value !== "CHANGE_ME" ? containerUrl(value) : null;
  if (!url) step("no STAGING_DATABASE_URL in .env.local: staging starts without a database (the owner creates them once: node scripts/db-setup.mjs create)");
  // Plain http on the local network: the session cookie must not require https. STAGING_PUBLIC_URL overrides the address.
  const publicUrl = process.env.STAGING_PUBLIC_URL || `http://${lanAddress(os.networkInterfaces()) || "localhost"}:${WEB_PORT}`;
  // The cache, when the project has one: its account as the container reaches it, and the staging key prefix.
  const cacheLine = [...file.matchAll(/^\s*(?:export\s+)?REDIS_URL=(.*)$/gm)].pop();
  const prefixLine = [...file.matchAll(/^\s*(?:export\s+)?STAGING_REDIS_PREFIX=(.*)$/gm)].pop();
  const cache = cacheLine && cacheLine[1].trim() ? { REDIS_URL: containerUrl(cacheLine[1].trim()) || cacheLine[1].trim(), REDIS_PREFIX: prefixLine ? prefixLine[1].trim() : "" } : {};
  return (stagingVars = { ...(url ? { DATABASE_URL: url } : {}), ...cache, COOKIE_SECURE: "false", PUBLIC_URL: publicUrl.replace(/\/+$/, "") });
};
// The environment of a docker compose command: only `up` of staging gets staging's values; other versions never get
// them from the shell, and a build, pull or push of staging runs without .env.local.
const runEnv = (tag, a = []) => {
  const e = env(tag);
  for (const k of APP_KEYS) delete e[k];
  return tag === "staging" && a[0] === "up" ? { ...e, ...stagingEnv() } : e;
};
// Compose runs from this checkout when it has a compose file (the main checkout stays on main, with an older one). The
// project name is "name:" in docker-compose.yml, so the containers are the same whichever checkout runs it.
const composeDir = fs.existsSync(path.join(here, "docker-compose.yml")) ? here : root;
const overlay = (tag) => tag === "staging" && fs.existsSync(path.join(composeDir, "docker-compose.staging.yml"));
const composeBase = (tag) => ["compose", ...(overlay(tag) ? ["-f", "docker-compose.yml", "-f", "docker-compose.staging.yml"] : [])];

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
  return spawnSync("docker", [...composeBase(tag), ...a], { cwd: composeDir, stdio: "inherit", env: runEnv(tag, a) }).status === 0;
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
// On a build host (--from-origin) origin's copy first: the host's own branches may be old.
const commitOf = (ref) => {
  const order = flag("--from-origin") ? [`origin/${ref}`, ref] : [ref, `origin/${ref}`];
  for (const r of order) {
    const c = quiet("git", ["rev-parse", "--verify", "-q", `${r}^{commit}`]);
    if (c) return c;
  }
  return null;
};
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
  // The service's own image (not `config --images <name>`, which also lists the images of the services it depends on).
  const imageOf = (name, t) => serviceImage(quiet("docker", ["compose", "-f", composeFile, "config", "--format", "json"], { cwd: work, env: env(t) }), name, t);
  const idOf = (image) => quiet("docker", ["image", "inspect", "--format", "{{.Id}}", image]);
  // Tag :dev-<sha> from :dev, and check that the new tag is the service's own image and the same one as :dev.
  const tagDevSha = (name) => {
    const from = imageOf(name, "dev");
    const to = from?.replace(/:dev$/, `:dev-${sha}`);
    if (!from || !to) return false;
    const repository = from.slice(0, from.lastIndexOf(":")).split("/").pop();
    if (repository !== name && !repository.endsWith(`-${name}`)) {
      console.error(`${from} does not look like the image of ${name}.`);
      return false;
    }
    if (spawnSync("docker", ["tag", from, to], { stdio: "inherit" }).status !== 0) return false;
    const same = Boolean(idOf(from)) && idOf(from) === idOf(to);
    if (!same) console.error(`${to} is not the same image as ${from}.`);
    return same;
  };
  // The layers of the built commit itself (dev may have one this checkout has not merged yet).
  const inCommit = (name) => !layerFolder(name) || quiet("git", ["rev-parse", "--verify", "-q", `${commit}:${layerFolder(name)}`]) !== null;
  const layers = imagesOf(project).map((i) => i.name).filter(inCommit);
  const record = imageRecord(root);
  let ok = true;
  try {
  for (const name of layers) {
    const tree = treeOf(commit, name);
    const key = (t) => (name === "app" ? t : `${t}:${name}`);
    if (ref === "dev" && record.get()[key("dev")] === tree && imageOf(name, "dev") && quiet("docker", ["image", "inspect", imageOf(name, "dev")]) !== null) {
      // Same files: no build, but this dev commit still gets its :dev-<sha> tag, so every role can pin it.
      // Both tags are pushed again: a push that failed last time is retried here, never left to an older :dev.
      const tagged = tagDevSha(name);
      const pushed = tagged && push(name, "dev") !== false && push(name, `dev-${sha}`) !== false;
      step(`${name}: no change since the last dev build (tagged dev-${sha})${tagged && !pushed ? "; the push failed" : ""}`);
      ok = ok && tagged && pushed;
      continue;
    }
    const twin = ref === "dev" ? null : sameTreeTag(Object.fromEntries(Object.entries(record.get()).filter(([k]) => (name === "app" ? !k.includes(":") : k.endsWith(`:${name}`))).map(([k, v]) => [k.split(":")[0], v])), ref, tree);
    let built = false;
    if (twin && imageOf(name, twin) && quiet("docker", ["image", "inspect", imageOf(name, twin)]) !== null && imageOf(name, ref)) {
      built = spawnSync("docker", ["tag", imageOf(name, twin), imageOf(name, ref)], { stdio: "inherit" }).status === 0;
      if (built) step(`${name} ${ref}: the same files as ${twin}, tagged, not built again`);
    }
    if (!built) built = spawnSync("docker", ["compose", "-f", composeFile, "build", name], { cwd: work, stdio: "inherit", env: env(ref) }).status === 0;
    if (built && ref === "dev") built = tagDevSha(name);
    // A push that fails fails the build, and the image is not recorded as done, so the next run builds and pushes again
    // instead of leaving the servers on an older tag.
    const pushed = built && push(name, ref) !== false && (ref !== "dev" || push(name, `dev-${sha}`) !== false);
    if (pushed) {
      record.set(key(ref), tree);
      step(`${name} ${ref}${ref === "dev" ? ` (and dev-${sha})` : ""} built${registry ? ` and pushed to ${registry}` : ""}`);
    } else if (built) console.error(`${name} ${ref} was built, but the push to ${registry} failed: check the registry and the login, then run this again.`);
    ok = ok && pushed;
  }
  // The Frontend database follows the new backend (rule "Environments"); Test moves its pinned images itself. It runs
  // in the built commit's worktree (its own scripts and migrations), never in the main checkout, which stays on main.
  if (ok && ref === "dev" && project.devMigrate) {
    step(`devMigrate: ${project.devMigrate}`);
    const apiImage = layers.includes(backend) ? imageOf(backend, "dev") : undefined;
    ok = spawnSync(project.devMigrate, {
      cwd: work,
      shell: true,
      stdio: "inherit",
      env: { ...process.env, CREWBOOK_DB_ENV: "frontend", ...(apiImage ? { CREWBOOK_API_IMAGE: apiImage } : {}) },
    }).status === 0;
  }
  } finally {
    quiet("git", ["worktree", "remove", "--force", work]);
    fs.rmSync(dir, { recursive: true, force: true });
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

// 2b. Staging: bring its database up to date with the migrations of the backend image about to start, before the
// running app is replaced.
if (tag === "staging" && project.stagingMigrate && !dry) {
  const apiImage = serviceImage(quiet("docker", ["compose", "config", "--format", "json"], { cwd: composeDir, env: env(tag) }), backend, tag);
  if (!apiImage) stop(`stagingMigrate needs the ${backend} image of staging, and there is none.`);
  step(`stagingMigrate: ${project.stagingMigrate}`);
  const migrated = spawnSync(project.stagingMigrate, { cwd: composeDir, shell: true, stdio: "inherit", env: { ...process.env, CREWBOOK_API_IMAGE: apiImage } }).status === 0;
  if (!migrated) stop("The staging migration failed; the running app was not touched. Send the lines above to the Lead.");
}

// 3. Port 3000: free, or already used by this project's app (it is replaced).
const busy = await new Promise((resolve) => {
  const s = net.createServer().once("error", () => resolve(true)).once("listening", () => s.close(() => resolve(false)));
  s.listen(PORT, "0.0.0.0");
});
const ours = Boolean(quiet("docker", ["compose", "ps", "-q"], { cwd: composeDir }));
if (busy && !ours && !dry) {
  stop(`Port ${PORT} is used by another program. Close it, or change the "${PORT}:..." port in docker-compose.yml, then run this again.`);
}
step(busy && ours ? `port ${PORT}: the running app is replaced` : `port ${PORT} is free`);

// 4. Start and wait for the healthcheck.
if (compose(["up", "-d", "--no-build", "--wait", "--wait-timeout", "120", ...images], tag) === false) {
  console.error("\nThe app did not become ready. Its last lines:");
  spawnSync("docker", ["compose", "logs", "--tail", "30", ...images], { cwd: composeDir, stdio: "inherit" });
  stop("Send these lines to the Lead. Stop it with: node scripts/run.mjs --stop");
}
step("the app answers its healthcheck");

// 5. Open the browser.
// Staging: the address people on the local network open.
const shown = tag === "staging" && !dry && overlay(tag) ? stagingEnv().PUBLIC_URL : URL;
if (!dry) {
  const [file, a] = process.platform === "win32" ? ["cmd", ["/c", "start", "", shown]] : [process.platform === "darwin" ? "open" : "xdg-open", [shown]];
  spawnSync(file, a, { stdio: "ignore" });
}
console.log(`\nOpen ${shown}. Stop it with: node scripts/run.mjs --stop`);
