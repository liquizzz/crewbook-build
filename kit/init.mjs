#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
//
// Set up a project for Crewbook in one command.
//   node <playbook>/kit/init.mjs                      asks: name, folder, level, language, design, documents, description, GitHub
//   node <playbook>/kit/init.mjs <folder> [options]   asks only what the options leave out
// Options: --name "<name>"  --level lite|full  --language <lang>  --docs-language <lang>  --design yes|no
//          --humanize yes|no  --description "<text>"
//          --github private|public|none  --repo <owner/name>  --yes (no questions, defaults)  --force
//          --no-plugins (skip installing the Claude Code plugins; also CREWBOOK_NO_PLUGINS=1)
//
// It creates the folder and a git repo, copies the kit, fills in the project name, level and description,
// writes START-HERE.md (the owner's steps for that level), creates the branches and the Lead's worktree
// (the Lead's /setup creates the other roles' worktrees) and, only if you choose it, creates the GitHub repo,
// pushes the branches and sets up the labels and the board.
// Existing files are kept unless --force is given. It never writes secrets.
// To bring a project that already runs up to a newer kit, use update.mjs instead.
import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { LEVELS, LEVEL_ORDER, REMOVED_LEVELS, kitVersion, languageLine, parseLevel, renderStartHere, setClaudeLevel, slugify, worktreePath, writeProject } from "./scripts/project-level.mjs";

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : undefined;
};
const force = argv.includes("--force");
const yes = argv.includes("--yes");
const installPlugins = !argv.includes("--no-plugins") && !process.env.CREWBOOK_NO_PLUGINS;
const valued = new Set(["--name", "--level", "--language", "--docs-language", "--design", "--humanize", "--description", "--github", "--repo"]);
const target = argv.find((a, i) => !a.startsWith("--") && !valued.has(argv[i - 1]));

// 0. Required tools. Docker is required: every part of the product runs in it.
function version(cmd) {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim().split("\n")[0];
  } catch {
    return null;
  }
}
const missingTools = [];
const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor < 20) missingTools.push(`Node.js 20 or newer (found ${process.versions.node}): https://nodejs.org`);
if (!version("git --version")) missingTools.push("Git: https://git-scm.com/downloads");
const docker = version("docker --version");
if (!docker) missingTools.push("Docker (Docker Desktop on Windows and macOS, Docker Engine on Linux): https://docs.docker.com/get-docker/");
else if (!version("docker compose version")) missingTools.push(`Docker Compose v2 (found ${docker}, but "docker compose" does not work): https://docs.docker.com/compose/install/`);
if (missingTools.length) {
  console.error("Cannot set up the project. Install these first, then run init again:\n  - " + missingTools.join("\n  - "));
  process.exit(1);
}
if (!version("docker info --format {{.ServerVersion}}")) {
  console.warn("Warning: Docker is installed but not running. Start Docker before running the project.\n");
}
const hasGh = Boolean(version("gh --version"));
const ghUser = hasGh ? version("gh api user --jq .login") : null;
if (!hasGh) console.warn("Warning: the GitHub CLI (gh) is not installed; install it to connect GitHub (chapter 1).\n");

const kit = path.dirname(fileURLToPath(import.meta.url));
const playbook = path.dirname(kit);

// 1. Questions. Each has a default; Enter accepts it. --yes or a non-interactive run takes the defaults.
// PLAYBOOK_INIT_INTERACTIVE=1 asks the questions even with piped input (used by the kit's tests).
const interactive = !yes && (process.stdin.isTTY || process.env.PLAYBOOK_INIT_INTERACTIVE === "1");
// Lines are read through an iterator, which buffers them, so piped answers are not lost.
const rl = interactive ? readline.createInterface({ input: process.stdin, terminal: false }) : null;
const lines = rl?.[Symbol.asyncIterator]();
async function ask(question, fallback, check = (v) => v) {
  if (!rl) return check(fallback);
  for (;;) {
    process.stdout.write(`${question}${fallback ? ` [${fallback}]` : ""}: `);
    const next = await lines.next();
    if (next.done) {
      console.error("\nNo more input. Stopped; nothing was changed.");
      process.exit(1);
    }
    if (!process.stdin.isTTY) console.log(next.value);
    const answer = next.value.trim() || fallback || "";
    const value = check(answer);
    if (value !== null && value !== undefined && value !== "") return value;
    console.log("  Please answer this one.");
  }
}

if (interactive) console.log("Crewbook: new project. Each question has a suggestion in [brackets]: press Enter to take it.");
// A question with a one-line hint under its title.
const topic = (title, hint) => interactive && console.log(`
${title}
   ${hint}`);

topic("1. Project name", "Any name, for example Tiny Todo. It suggests the folder and the repo name.");
const name = flag("name") || (target && !interactive ? path.basename(path.resolve(target)) : undefined)
  || (await ask("   Name", target ? path.basename(path.resolve(target)) : ""));
if (!name) {
  console.error("Give the project a name: node init.mjs <folder> or --name \"<name>\".");
  process.exit(1);
}
const slug = slugify(name) || "project";
const parent = path.resolve(process.cwd()) === playbook ? path.dirname(playbook) : process.cwd();
if (!target) topic("2. Where to create the project", "A new folder for its code and documents. The role worktrees go next to it, in <folder>-wt.");
const dest = path.resolve(target || (await ask("   Folder", path.join(parent, slug))));

let level = parseLevel(flag("level")) || REMOVED_LEVELS[String(flag("level") || "").toLowerCase()];
if (!level) {
  topic("3. Level of process", "How many Claude sessions work on it. Change it any time with: node scripts/set-level.mjs <level>");
  if (interactive) LEVEL_ORDER.forEach((l, i) => console.log(`     ${i + 1}  ${l.padEnd(5)} ${LEVELS[l].help}`));
  level = await ask("   Level (1 or 2)", "1", parseLevel);
}

topic("4. Your working language", "The sessions talk to you in it. For example English or Vietnamese.");
const language = flag("language") || (await ask("   Language", "English"));
let docsLanguage = flag("docs-language") || "English";
if (!flag("docs-language") && !/^english$/i.test(language)) {
  docsLanguage = await ask(`   Documents in English or ${language}`, "English");
}

let design = flag("design");
if (!design) {
  topic("5. Separate design prototype", "yes: a design/ folder and image the client reviews before the app is built (chapter 7). no: Claude designs inside the app.");
  design = await ask("   Design prototype? yes or no", "no", (v) => (/^(y|yes|n|no)$/i.test(v) ? v.toLowerCase()[0] : null));
}
design = /^y/i.test(design);

let humanize = flag("humanize");
if (!humanize) {
  topic("6. Polished documents", "yes: a humanizer pass on every document, for client reports (more tokens). no: plain documents. Change it later via the Lead.");
  humanize = await ask("   Polish documents? yes or no", "no", (v) => (/^(y|yes|n|no)$/i.test(v) ? v.toLowerCase()[0] : null));
}
humanize = /^y/i.test(humanize);

topic("7. One-line description (optional)", "Who it is for and what it does. Claude asks for the rest later.");
const description = flag("description") ?? (await ask("   Description", "", (v) => v || " ")).trim();

let github = flag("github");
let repo = flag("repo");
if (!github) {
  if (!ghUser) {
    if (interactive) console.log(`
8. GitHub repo: skipped (${hasGh ? "run gh auth login first" : "gh is not installed"}). The Lead connects it later.`);
    github = "none";
  } else {
    topic("8. GitHub repo", "private (only you see it), public, or none to connect later. It pushes the branches and creates the labels.");
    github = await ask("   Create it now? private, public or none", interactive ? "private" : "none",
      (v) => (["private", "public", "none"].includes(v.toLowerCase()) ? v.toLowerCase() : null));
  }
}
if (!["private", "public", "none"].includes(github)) {
  console.error("--github must be private, public or none.");
  process.exit(1);
}
if (github !== "none" && !repo && !ghUser) {
  console.error("Cannot create the GitHub repo: run gh auth login first, or pass --repo <owner/name>.");
  process.exit(1);
}
if (github !== "none" && !repo) repo = await ask("   Repo name", `${ghUser}/${slug}`);
if (github === "none") repo = undefined;

if (interactive) {
  console.log(`
About to set up:
  ${name} in ${dest}
  Level: ${LEVELS[level].title}
  Language: ${language} (documents: ${docsLanguage})
  Design prototype: ${design ? "yes" : "no"}
  Polished documents (humanizer): ${humanize ? "yes" : "no"}
  GitHub: ${repo ? `${repo} (${github}), branches pushed, labels created` : "none"}`);
  const go = await ask("Go ahead? yes or no", "yes");
  if (!/^y/i.test(go)) {
    console.log("Stopped. Nothing was changed.");
    process.exit(0);
  }
}
rl?.close();

// 2. Set up
const created = [];
const kept = [];
const sh = (cmd) => execSync(cmd, { cwd: dest, stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
const run = (file, args) => execFileSync(file, args, { cwd: dest, stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
const ok = (cmd) => {
  try {
    sh(cmd);
    return true;
  } catch {
    return false;
  }
};

function copyFile(from, to) {
  const out = path.join(dest, to);
  const shown = to.split(path.sep).join("/");
  if (fs.existsSync(out) && !force) return kept.push(shown);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.copyFileSync(from, out);
  created.push(shown);
}

function copyDir(from, to) {
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const rel = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, rel);
    else copyFile(src, rel);
  }
}

// 2a. Folder and git repo
fs.mkdirSync(dest, { recursive: true });
if (!ok("git rev-parse --is-inside-work-tree")) {
  sh("git init -b main");
  created.push("(git repo, branch main)");
}

// 2b. Kit files
copyFile(path.join(kit, "CLAUDE.md"), "CLAUDE.md");
copyDir(path.join(kit, ".claude", "roles"), path.join(".claude", "roles"));
copyDir(path.join(kit, ".claude", "hooks"), path.join(".claude", "hooks"));
copyFile(path.join(kit, ".claude", "settings.json"), path.join(".claude", "settings.json"));
copyDir(path.join(kit, "commands"), path.join(".claude", "commands"));
copyDir(path.join(kit, "start-here"), path.join(".claude", "start-here"));
copyDir(path.join(kit, ".github"), ".github");
if (!design && created.includes(".github/workflows/image-design.yml")) {
  fs.rmSync(path.join(dest, ".github", "workflows", "image-design.yml"));
  created.splice(created.indexOf(".github/workflows/image-design.yml"), 1);
}
copyDir(path.join(kit, "scripts"), "scripts");
copyFile(path.join(playbook, "templates", "changelog.md"), "CHANGELOG.md");
copyDir(path.join(playbook, "templates"), path.join("docs", "templates"));
copyFile(path.join(kit, "docker", "docker-compose.yml"), "docker-compose.yml");
if (design) copyFile(path.join(kit, "docker", "design.Dockerfile"), path.join("docker", "design.Dockerfile"));
copyFile(path.join(kit, "docker", "app.Dockerfile"), path.join("docker", "app.Dockerfile"));
copyFile(path.join(kit, "docker", ".dockerignore"), ".dockerignore");

// 2c. Name, description, level
const fill = (rel, edit) => {
  const file = path.join(dest, rel);
  if (!created.includes(rel)) return;
  fs.writeFileSync(file, edit(fs.readFileSync(file, "utf8")));
};
fill("CLAUDE.md", (t) => t.replace("# <Project name>", `# ${name}`)
  .replace(/^- Documents: .*$/m, humanize ? "- Documents: polished (humanizer pass on each document)." : "- Documents: plain (no humanizer pass). To turn it on, the owner tells the Lead: \"Polish documents from now on.\"")
  .replace(/^<One paragraph: what the product does.*$/m, (line) => description || line)
  .replace(/^- Language: .*$/m, languageLine(language, docsLanguage)));
setClaudeLevel(dest, level);
const owner = repo ? repo.split("/")[0].toLowerCase() : null;
const project = repo ? repo.split("/")[1].toLowerCase() : slug;
fill("docker-compose.yml", (t) => {
  if (!design) t = t.replace(/ *# design:start[\s\S]*?# design:end\r?\n/, "");
  t = t.replaceAll("<project>", project);
  return owner ? t.replaceAll("<owner>", owner) : t;
});
// Plugins: humanizer only for polished documents; the Lead enables the design plugins at G3 when the product has screens.
fill(".claude/settings.json", (t) => {
  const s = JSON.parse(t);
  if (!humanize) delete s.enabledPlugins["humanizer@humanizer"];
  return JSON.stringify(s, null, 2) + "\n";
});
// setup: false until the Lead's /setup is done; the session-start hook keeps other roles waiting until then.
// kitVersion: the playbook commit the kit came from; update.mjs starts from it.
// ci: where CI runs. A public repo has free Actions minutes; a private one (or none) runs CI on this machine.
const ci = github === "public" ? "github" : "local";
writeProject(dest, { name, level, repo: repo || null, language, docsLanguage, design, humanize, setup: false, ci, kitVersion: kitVersion(playbook) });
renderStartHere(dest, { name, level, repo }, dest);
created.push(".claude/project.json", "START-HERE.md");

// 2d. Docs folders
const folders = [
  "docs/product/cr", "docs/product/dec", "docs/product/stories", "docs/product/milestones", "docs/product/handover", "docs/product/screens",
  "docs/tech/spec", "docs/tech/adr", "docs/tech/test-cases", "docs/tech/test-reports", "docs/tech/ops",
  "docs/reports", "docs/releases",
];
for (const f of folders) {
  const dir = path.join(dest, f);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, ".gitkeep"), "");
    created.push(`${f}/`);
  }
}
const log = path.join(dest, "docs", "ai-log.md");
if (!fs.existsSync(log)) {
  fs.writeFileSync(log, "# AI Delivery Log\n\nOne line per task: what AI did, where the human stepped in, how much rework.\n\n| Date | Phase | Task | AI did | Human did | Rework loops | Time |\n|---|---|---|---|---|---|---|\n");
  created.push("docs/ai-log.md");
}
const readme = path.join(dest, "README.md");
if (!fs.existsSync(readme)) {
  fs.writeFileSync(readme, `# ${name}\n\n${description ? `${description}\n\n` : ""}Built with [Crewbook: Build](https://github.com/liquizzz/crewbook-build). The owner's steps are in \`START-HERE.md\`; releases are listed in \`CHANGELOG.md\`.\n`);
  created.push("README.md");
}
const envExample = path.join(dest, ".env.example");
if (!fs.existsSync(envExample)) {
  fs.writeFileSync(envExample, "# Copy to .env.local (done by new-role-worktree). Real values are filled in by the owner.\nPORT=3000\n");
  created.push(".env.example");
}

// 2e. .gitignore
const ignorePath = path.join(dest, ".gitignore");
const ignore = fs.existsSync(ignorePath) ? fs.readFileSync(ignorePath, "utf8") : "";
const needed = [".env", ".env.*", "!.env.example", ".claude/role", ".claude/settings.local.json", "node_modules/", "dist/"];
const missing = needed.filter((l) => !ignore.split(/\r?\n/).includes(l));
if (missing.length) {
  fs.writeFileSync(ignorePath, `${ignore}${ignore && !ignore.endsWith("\n") ? "\n" : ""}# Crewbook\n${missing.join("\n")}\n`);
  created.push(`.gitignore (+${missing.length} lines)`);
}

// 2f. Secret-check git hook
const hookOut = path.join(dest, ".git", "hooks", "pre-commit");
if (!fs.existsSync(hookOut) || force) {
  fs.copyFileSync(path.join(kit, "hooks", "pre-commit"), hookOut);
  try { fs.chmodSync(hookOut, 0o755); } catch {}
  created.push(".git/hooks/pre-commit");
} else kept.push(".git/hooks/pre-commit");

// 2g. First commit and the level's branches. An existing repo is not committed for you.
const fresh = !ok("git rev-parse --verify HEAD");
if (fresh) {
  sh("git add -A");
  run("git", ["commit", "-m", `Set up Crewbook kit (${LEVELS[level].title})`]);
  created.push("(first commit)");
}
for (const b of LEVELS[level].branches) {
  if (!ok(`git show-ref --verify --quiet refs/heads/${b}`)) {
    sh(`git branch ${b}`);
    created.push(`(branch ${b})`);
  }
}

// 2h. GitHub, only if chosen
const warnings = [];
if (repo) {
  try {
    if (!ok("git remote get-url origin")) {
      run("gh", ["repo", "create", repo, `--${github}`, "--source", ".", "--remote", "origin", ...(description ? ["--description", description] : [])]);
      created.push(`(GitHub repo ${repo}, ${github})`);
    }
    run("git", ["push", "-u", "origin", "main", ...LEVELS[level].branches]);
    created.push(`(pushed main, ${LEVELS[level].branches.join(", ")})`);
    run("node", [path.join("scripts", "setup-labels.mjs")]);
    created.push("(GitHub labels)");
  } catch (e) {
    warnings.push(`GitHub step failed: ${String(e.stderr || e.message).trim().split("\n")[0]}. Finish it later with the Lead: "Connect this project to GitHub."`);
  }
  // Security checks GitHub runs for free: Dependabot alerts and fixes on every repo, secret scanning on public repos.
  try {
    run("gh", ["api", "-X", "PUT", `repos/${repo}/vulnerability-alerts`]);
    run("gh", ["api", "-X", "PUT", `repos/${repo}/automated-security-fixes`]);
    if (github === "public") {
      run("gh", ["api", "-X", "PATCH", `repos/${repo}`, "-f", "security_and_analysis[secret_scanning][status]=enabled", "-f", "security_and_analysis[secret_scanning_push_protection][status]=enabled"]);
    }
    created.push(`(security: Dependabot alerts and fixes${github === "public" ? ", secret scanning with push protection" : ""})`);
  } catch (e) {
    warnings.push(`Security settings not changed: ${String(e.stderr || e.message).trim().split("\n")[0]} Turn on Dependabot alerts in the repo's Settings → Advanced Security.`);
  }
  try {
    const board = run("node", [path.join("scripts", "setup-board.mjs")]);
    created.push(`(kanban board: ${(board.match(/https:\S+/) || ["GitHub Projects"])[0]})`);
  } catch (e) {
    warnings.push(`Kanban board not created: ${String(e.stderr || e.message).trim().split("\n")[0]} Then run: node scripts/setup-board.mjs`);
  }
  try {
    run("gh", ["variable", "set", "CI_MODE", "--body", ci, "--repo", repo]);
    created.push(`(CI_MODE=${ci})`);
  } catch (e) {
    warnings.push(`CI_MODE not set: ${String(e.stderr || e.message).trim().split("\n")[0]} Then run: node scripts/ci-mode.mjs ${ci}`);
  }
  if (ci === "github") warnings.push(`Open https://github.com/${repo}/actions once: a new repo may show "Enable Actions on this repository", and CI and images do not run until you click it.`);
  else warnings.push(`CI runs on this machine (private repo, no Actions minutes used): node scripts/ci-local.mjs <branch>. To use GitHub Actions instead: node scripts/ci-mode.mjs github`);
}

// 2i. The Lead's worktree (it starts from the committed kit, so only in a fresh repo). /setup creates the others.
if (!fresh) warnings.push(`Existing repo: commit the kit files, then run node scripts/new-role-worktree.mjs lead to create the Lead's worktree.`);
for (const role of fresh ? ["lead"] : []) {
  if (fs.existsSync(worktreePath(dest, role))) {
    kept.push(`worktree ${role}`);
    continue;
  }
  try {
    run("node", [path.join("scripts", "new-role-worktree.mjs"), role]);
    created.push(`(worktree ${role}: ${worktreePath(dest, role)})`);
  } catch (e) {
    warnings.push(`Worktree ${role} failed: ${String(e.stderr || e.message).trim().split("\n")[0]}`);
  }
}

// 2j. The Claude Code plugins the project enables: enabling them in .claude/settings.json does not download them.
if (installPlugins) {
  try {
    const out = run("node", [path.join("scripts", "plugins.mjs")]);
    const lines = out.split(/\r?\n/);
    if (out.includes("/plugin install")) warnings.push(`Claude Code plugins: ${lines.join("\n    ")}`);
    else created.push(`(${lines[0].replace(/\.$/, "")})`);
  } catch (e) {
    warnings.push(`Plugins not installed: ${String(e.stderr || e.message).trim().split(/\r?\n/)[0]}. The Lead's /setup checks them first.`);
  }
}

// 3. Report
const lead = worktreePath(dest, "lead");
console.log(`\n${name} is set up in ${dest} (level ${LEVELS[level].title}).\n`);
console.log(`Created (${created.length}):\n  ${created.join("\n  ")}`);
if (kept.length) console.log(`\nKept existing (${kept.length}, use --force to overwrite):\n  ${kept.join("\n  ")}`);
if (warnings.length) console.log(`\nPlease check:\n  ${warnings.join("\n  ")}`);
console.log(`
Next: open ${path.join(dest, "START-HERE.md")} and follow it step by step.
Step 1: open Claude Code desktop in this folder, name the session "${name} - Lead", and type /setup:
  ${lead}
Setup comes first: it creates the other sessions' folders and tells you which to open next.`);
