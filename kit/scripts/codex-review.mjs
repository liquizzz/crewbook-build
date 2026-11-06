#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// Run a Codex review of a PR or a branch (/cb-review): the diff against its base (dev), in a throw-away worktree
// at the head of the PR, so nothing in any checkout changes.
//   node scripts/codex-review.mjs <#PR | branch>                 Codex's review, then an adversarial pass on security
//   node scripts/codex-review.mjs <#PR | branch> standard        Codex's review only
//   node scripts/codex-review.mjs <#PR | branch> adversarial [focus text...]   one adversarial pass with that focus
//   --no-fetch   use the local branches only
// Before it runs it checks that the plugin is installed and enabled (in ~/.claude/settings.json or the project's
// .claude/settings.json); CODEX_PLUGIN_ROOT names a plugin folder by hand and skips that check.
// It needs the Codex plugin (once per machine: /plugin marketplace add openai/codex-plugin-cc, then
// /plugin install codex@openai-codex, /codex:setup). It never falls back to another reviewer and never fixes anything:
// it prints Codex's output and exits with Codex's exit code. The plugin's own slash commands cannot be started by
// Claude, so this script runs the plugin's companion script directly.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2).filter((a) => a !== "--no-fetch");
const noFetch = process.argv.includes("--no-fetch");
const target = args[0];
const kind = ["standard", "adversarial"].includes((args[1] || "").toLowerCase()) ? args[1].toLowerCase() : "both";
const focus = args.slice(["standard", "adversarial"].includes((args[1] || "").toLowerCase()) ? 2 : 1).join(" ");
if (!target) {
  console.error("Usage: node scripts/codex-review.mjs <#PR | branch> [standard | adversarial [focus text...]]");
  process.exit(1);
}

const sh = (file, a, cwd) => execFileSync(file, a, { cwd, stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
const git = (a, cwd) => sh("git", a, cwd);

// 1. The plugin's companion script: CODEX_PLUGIN_ROOT, else the newest installed version.
const version = (v) => v.split(".").map((n) => Number(n) || 0);
const newer = (a, b) => {
  const x = version(a), y = version(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0);
  return 0;
};
const findCompanion = () => {
  const roots = [];
  if (process.env.CODEX_PLUGIN_ROOT) roots.push(process.env.CODEX_PLUGIN_ROOT);
  const base = path.join(os.homedir(), ".claude", "plugins", "cache", "openai-codex");
  if (fs.existsSync(base)) {
    for (const plugin of fs.readdirSync(base)) {
      const dir = path.join(base, plugin);
      if (!fs.statSync(dir).isDirectory()) continue;
      roots.push(...fs.readdirSync(dir).sort(newer).reverse().map((v) => path.join(dir, v)));
    }
  }
  return roots.map((r) => path.join(r, "scripts", "codex-companion.mjs")).find((f) => fs.existsSync(f)) || null;
};
const SECURITY = "security: permissions and access control, input validation and injection, secrets in code or logs, personal data exposure, deletes and money at the edges";
// Enabled: the project's .claude/settings.json wins over the user's ~/.claude/settings.json.
const enabled = () => {
  if (process.env.CODEX_PLUGIN_ROOT) return true;
  const read = (f) => {
    try {
      return JSON.parse(fs.readFileSync(f, "utf8")).enabledPlugins || {};
    } catch {
      return {};
    }
  };
  const id = Object.keys({ ...read(path.join(os.homedir(), ".claude", "settings.json")), ...read(path.join(process.cwd(), ".claude", "settings.json")) }).find((k) => k.startsWith("codex@"));
  if (!id) return false;
  const project = read(path.join(process.cwd(), ".claude", "settings.json"));
  return id in project ? project[id] === true : read(path.join(os.homedir(), ".claude", "settings.json"))[id] === true;
};
const companion = findCompanion();
if (companion && !enabled()) {
  console.error(`The Codex plugin is installed but not enabled, so there is no Codex review. The owner turns it on, in any session:
  /plugin enable codex@openai-codex
  /reload-plugins
then types /cb-review again. This is not a pass, and no other reviewer runs instead.`);
  process.exit(3);
}
if (!companion) {
  console.error(`The Codex plugin is not installed on this machine, so there is no Codex review. The owner installs it once, in any session:
  /plugin marketplace add openai/codex-plugin-cc
  /plugin install codex@openai-codex
  /reload-plugins
  /codex:setup
Claude's /code-review is a different reviewer; use it only if the owner asks.`);
  process.exit(3);
}

// 2. The branch and its base.
const root = path.dirname(path.resolve(git(["rev-parse", "--git-common-dir"])));
if (!noFetch) {
  try {
    git(["fetch", "-q", "origin"]);
  } catch {
    console.log("! fetch failed: using the local branches");
  }
}
let branch = target;
let baseName = "dev";
if (/^#?\d+$/.test(target)) {
  try {
    const pr = JSON.parse(sh("gh", ["pr", "view", target.replace("#", ""), "--json", "headRefName,baseRefName"]));
    branch = pr.headRefName;
    baseName = pr.baseRefName || "dev";
  } catch (e) {
    console.error(`Could not read PR ${target} with gh: ${String(e.stderr || e.message).trim().split(/\r?\n/)[0]}`);
    process.exit(1);
  }
}
const ref = (name) => {
  for (const r of [name, `origin/${name}`]) {
    try {
      git(["rev-parse", "--verify", "-q", `${r}^{commit}`]);
      return r;
    } catch {}
  }
  console.error(`Unknown branch ${name}`);
  process.exit(1);
};
const head = ref(branch);
const base = ref(baseName);

// 3. A throw-away worktree at the head of the branch; Codex reviews its diff against the base.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "crewbook-codex-"));
const work = path.join(dir, "src");
let status = 1;
try {
  git(["worktree", "add", "--detach", work, head], root);
  const short = git(["rev-parse", "--short", head], root);
  const passes = kind === "both" ? [["review", ""], ["adversarial-review", SECURITY]] : kind === "adversarial" ? [["adversarial-review", focus]] : [["review", ""]];
  if (kind === "standard" && focus) console.log(`! A standard review takes no focus text (${focus}); use adversarial to give one.`);
  for (const [sub, text] of passes) {
    const a = [companion, sub, "--wait", "--base", base, "--scope", "branch"];
    if (text) a.push(text);
    console.log(`Codex ${sub === "review" ? "review" : `adversarial review${text === SECURITY ? " (security)" : ""}`} of ${branch} (${short}) against ${baseName}:\n`);
    status = spawnSync("node", a, { cwd: work, stdio: "inherit" }).status ?? 1;
    if (status !== 0) {
      console.error(`\nCodex did not finish the review (exit ${status}); see its message above (not signed in, no quota, an error). This is not a pass, and no other reviewer runs instead.`);
      break;
    }
  }
} finally {
  try {
    git(["worktree", "remove", "--force", work], root);
  } catch {}
  fs.rmSync(dir, { recursive: true, force: true });
}
process.exit(status);
