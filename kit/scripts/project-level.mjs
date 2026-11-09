// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// Shared by init.mjs, update.mjs, roles.mjs and new-role-worktree.mjs: the roles a project can have, the project record
// in .claude/project.json, the "Roles:" line in CLAUDE.md and START-HERE.md rendered from .claude/start-here.md.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// The branches every project has besides main.
export const BRANCHES = ["dev", "staging"];
// The roles a project can have. The Lead and the Dev are always on; the owner picks the others at /cb-setup.
export const ROLES = ["lead", "dev", "uiux", "frontend", "test"];
export const REQUIRED_ROLES = ["lead", "dev"];
export const OPTIONAL_ROLES = ["uiux", "frontend", "test"];
// What each role does and when it is worth having: shown at /cb-setup and by roles.mjs.
export const ROLE_INFO = {
  lead: { title: "Lead", does: "Plans, decides, splits tasks, reviews, merges and releases; designs when there is no UI/UX", when: "Always" },
  dev: { title: "Dev", does: "Builds the backend, the infrastructure and the images; both layers when there is no Frontend; the tests when there is no Test", when: "Always" },
  uiux: { title: "UI/UX", does: "Designs the screens before they are built: a prototype the client can see and approve", when: "The product has screens a client approves, or the look matters" },
  frontend: { title: "Frontend", does: "Builds the screens from the approved design, beside the Dev", when: "The product has a real UI, so backend and frontend can be built at the same time" },
  test: { title: "Test", does: "Writes the test cases early and runs the regression on staging", when: "Money, security, personal data, or a client who signs off each release" },
};
// Local ports for the roles that run the app.
export const PORTS = { uiux: 5100, dev: 5201, frontend: 5202, test: 5300 };
// Roles the kit no longer has, and who does their work now (their worktrees are kept until the owner removes them).
export const RETIRED_ROLES = {
  po: "the Lead (DEC-074)",
  dev1: "the Dev (DEC-081)",
  dev2: "Frontend (DEC-081)",
  dev3: "the Dev or Frontend (DEC-081)",
  dev4: "the Dev or Frontend (DEC-081)",
  devops: "the Lead for the set-up and the Dev for builds and images (DEC-081)",
};

export const roleTitle = (role) => ROLE_INFO[role]?.title || role;

// The machine's shared hosts (~/.crewbook/hosts.json, or CREWBOOK_HOME): the build host, the registry, the database
// servers and the staging server, set once for every project (scripts/hosts.mjs). No passwords in it.
export const crewbookHome = () => process.env.CREWBOOK_HOME || path.join(process.env.HOME || process.env.USERPROFILE || ".", ".crewbook");
export function readHosts() {
  try {
    return JSON.parse(fs.readFileSync(path.join(crewbookHome(), "hosts.json"), "utf8"));
  } catch {
    return {};
  }
}
// "local", or { ssh: "user@host", path: "<the project's clone there>" }: the project's own setting wins over the machine's.
export function buildHostOf(project) {
  const host = project?.buildHost || readHosts().build || "local";
  if (host === "local") return null;
  const ssh = typeof host === "string" ? host.replace(/^ssh:/, "") : host.ssh;
  const where = typeof host === "object" && host.path ? host.path : null;
  return ssh ? { ssh, path: where || `~/crewbook/${project?.repo?.split("/")[1] || project?.name || "project"}` } : null;
}
export const registryOf = (project) => project?.registry || readHosts().registry || null;
// Run a kit script on the project's build host over SSH instead of here, when the project has one: the clone there
// fetches, moves to origin/dev for the newest scripts, and runs the script with --here. Returns the exit code, or null
// when the script should run here. CREWBOOK_SSH_DRY=1 prints the command instead (tests).
export function onBuildHost(project, script, args) {
  const host = buildHostOf(project);
  if (!host || args.includes("--here") || process.env.CREWBOOK_HERE) return null;
  const quote = (a) => `'${String(a).replace(/'/g, "'\''")}'`;
  const remote = `cd ${host.path} && git fetch -q origin && git checkout -q -B crewbook-build origin/dev && node scripts/${script} ${args.map(quote).join(" ")} --here`;
  if (process.env.CREWBOOK_SSH_DRY) {
    console.log(`ssh ${host.ssh} ${remote}`);
    return 0;
  }
  console.log(`On the build host ${host.ssh} (${host.path}); push the branch first, it fetches from origin.`);
  const r = spawnSync("ssh", [host.ssh, remote], { stdio: "inherit" });
  return r.status ?? 1;
}
// The images the project builds: "images" in project.json ({ name, paths }), else one "app" image of everything.
export const imagesOf = (project) => (Array.isArray(project?.images) && project.images.length ? project.images : [{ name: "app", paths: ["."] }]);

// The roles from an answer such as "all", "none", "uiux,test" or "lead dev frontend": always with the Lead and the Dev,
// in the kit's order. Returns null when a name is not a role.
export function parseRoles(value) {
  const v = String(value ?? "").trim().toLowerCase();
  if (v === "" || v === "all") return [...ROLES];
  const asked = v === "none" ? [] : v.split(/[\s,]+/).filter(Boolean).map((r) => (r === "ui/ux" ? "uiux" : r));
  if (asked.some((r) => !ROLES.includes(r))) return null;
  return ROLES.filter((r) => REQUIRED_ROLES.includes(r) || asked.includes(r));
}

export function slugify(name) {
  return String(name).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// The main checkout, even when run from a role worktree.
export function mainCheckout(cwd = process.cwd()) {
  const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd, stdio: ["ignore", "pipe", "ignore"] })
    .toString().trim();
  return path.dirname(common);
}

export function worktreePath(root, role) {
  return path.join(path.dirname(root), `${path.basename(root)}-wt`, role);
}

export function readProject(dir) {
  const file = path.join(dir, ".claude", "project.json");
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
}

export function writeProject(dir, project) {
  fs.mkdirSync(path.join(dir, ".claude"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".claude", "project.json"), JSON.stringify(project, null, 2) + "\n");
}

// The "- Language:" line of CLAUDE.md.
export function languageLine(language, docsLanguage) {
  return `- Language: talk to the owner in ${language}; write documents in ${docsLanguage}. Everything the owner reads is in that language: replies, questions, options and button labels, the For you block, the end-of-turn recap and next-step box, and the words around a hand-off prompt. Code, commits, identifiers and file paths stay in English; so do commands and slash commands, each with a few words in the owner's language on what it does.`;
}

// Images built on this machine (CI local): which source tree each tag was built from, kept in the shared .git folder.
// A tag whose tree equals the tree of an image already built is tagged, not built again (scripts/run.mjs).
export function imageRecord(root) {
  const file = path.join(path.resolve(root, execFileSync("git", ["rev-parse", "--git-common-dir"], { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString().trim()), "crewbook-images.json");
  const read = () => {
    try {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      return {};
    }
  };
  return {
    get: read,
    set: (tag, tree) => fs.writeFileSync(file, JSON.stringify({ ...read(), [tag]: tree }, null, 1) + "\n"),
  };
}
// The other tag built from the same tree, if any. The dev image is never a source: it is rebuilt every time.
export function sameTreeTag(built, ref, tree) {
  return Object.entries(built).find(([t, x]) => x === tree && t !== ref && t !== "dev")?.[0] || null;
}

// The kit's version: the playbook commit it was taken from, or null without git.
export function kitVersion(playbook) {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: playbook, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return null;
  }
}

// The "- Roles:" line of CLAUDE.md for a list of roles.
export const rolesLine = (roles) => roles?.length
  ? `- Roles: ${roles.map(roleTitle).join(", ")}. Add one with \`/cb-add-role <role>\`; what a missing role did goes to the Lead (design) or the Dev (frontend, tests).`
  : "- Roles: chosen at /cb-setup.";

// Replace the "- Roles:" line of CLAUDE.md. Returns false if the line is missing.
export function setClaudeRoles(dir, roles) {
  const file = path.join(dir, "CLAUDE.md");
  if (!fs.existsSync(file)) return false;
  const text = fs.readFileSync(file, "utf8");
  if (!/^- Roles: .*$/m.test(text)) return false;
  fs.writeFileSync(file, text.replace(/^- Roles: .*$/m, rolesLine(roles)));
  return true;
}

// Write START-HERE.md from the kit's template.
export function renderStartHere(dir, project, root = dir) {
  const template = path.join(dir, ".claude", "start-here.md");
  if (!fs.existsSync(template)) return false;
  const [owner, repoName] = project.repo ? project.repo.toLowerCase().split("/") : ["<github-user>", "<repo>"];
  const values = {
    name: project.name,
    repo: project.repo || "(no GitHub repo yet)",
    actions: project.repo ? `https://github.com/${project.repo}/actions` : "your repo's Actions tab on GitHub",
    owner,
    image: `ghcr.io/${owner}/${repoName}-app`,
    main: root,
    lead: worktreePath(root, "lead"),
    roles: project.roles?.length ? project.roles.map(roleTitle).join(", ") : "chosen at /cb-setup",
  };
  const text = fs.readFileSync(template, "utf8").replace(/\{\{(\w+)\}\}/g, (m, k) => (k in values ? values[k] : m));
  fs.writeFileSync(path.join(dir, "START-HERE.md"), text);
  return true;
}
// The image of one compose service with a given tag, from the text of `docker compose config --format json`. It reads
// the service's own "image", never the list of images `config --images <name>` prints, which also holds the images of
// the services it depends on (web lists api's image too).
export function serviceImage(configJson, name, tag) {
  try {
    const image = JSON.parse(configJson)?.services?.[name]?.image;
    return typeof image === "string" && image.endsWith(`:${tag}`) ? image : undefined;
  } catch {
    return undefined;
  }
}

// A connection string as a container must use it: this machine's own addresses (localhost, 127.0.0.1, ::1) become
// host.docker.internal. null when it is not a URL. Never log the result: it holds the password.
export function containerUrl(value) {
  try {
    const u = new URL(value);
    if (["localhost", "127.0.0.1", "[::1]", "::1"].includes(u.hostname)) u.hostname = "host.docker.internal";
    return u.toString();
  } catch {
    return null;
  }
}

// The address other machines on the LAN reach this one on, from os.networkInterfaces(): 192.168.x or 10.x first (the
// 172.x ones are mostly Docker's and WSL's own networks). null without a network.
export function lanAddress(interfaces) {
  const all = Object.values(interfaces).flat().filter((i) => i && i.family === "IPv4" && !i.internal).map((i) => i.address);
  return all.find((a) => a.startsWith("192.168.")) || all.find((a) => a.startsWith("10.")) || all[0] || null;
}


// The image that holds the backend and its migrations: "backend" in project.json, else api, else app, else the first.
export function backendOf(project) {
  const names = imagesOf(project || {}).map((i) => i.name);
  if (project?.backend) return project.backend;
  return ["api", "app"].find((n) => names.includes(n)) || names[0] || "app";
}

// Plugins per role, on top of the project's .claude/settings.json, in each worktree's git-ignored settings.local.json.
// The shared file holds the safe default (claude-mem off, Product Management on). The Lead, a long-running session that
// keeps the whole project's thread, also gets claude-mem; the other roles drop Product Management, which only the Lead
// uses (requirements, roadmap, CRs). Superpowers stays on everywhere: the Skills table gives every role its skills.
export const ROLE_PLUGINS = {
  lead: { "claude-mem@thedotmack": true },
  other: { "product-management@knowledge-work-plugins": false },
};
export function applyRolePlugins(dir, role) {
  const file = path.join(dir, ".claude", "settings.local.json");
  let settings = {};
  try {
    settings = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {}
  const mine = ROLE_PLUGINS[role === "lead" ? "lead" : "other"];
  settings.enabledPlugins = { ...(settings.enabledPlugins || {}), ...mine };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(settings, null, 2) + "\n");
}
