#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// Install the Claude Code plugins this project enables. Enabling a plugin in the project's .claude/settings.json
// does not download it, so init runs this once, and the Lead runs it again at G3 when it enables the design plugins.
//   node scripts/plugins.mjs            install every plugin in "enabledPlugins", and the ones a role adds, for this user
//                                       (once per machine)
//   node scripts/plugins.mjs --dry-run  print the commands only
// It adds each plugin's marketplace (from "extraKnownMarketplaces"), then installs the plugin with the claude CLI.
// Without the claude CLI (some desktop-only machines) it prints the /plugin lines to paste into any session.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ROLE_PLUGINS } from "./project-level.mjs";

const dry = process.argv.includes("--dry-run");
const root = execFileSync("git", ["rev-parse", "--show-toplevel"]).toString().trim();
const settings = JSON.parse(fs.readFileSync(path.join(root, ".claude", "settings.json"), "utf8"));
const markets = settings.extraKnownMarketplaces || {};
// The shared set, plus the plugins a role turns on for itself (claude-mem for the Lead: project-level.mjs ROLE_PLUGINS).
const plugins = [...new Set([
  ...Object.entries(settings.enabledPlugins || {}).filter(([, on]) => on).map(([id]) => id),
  ...Object.values(ROLE_PLUGINS).flatMap((set) => Object.entries(set).filter(([, on]) => on).map(([id]) => id)),
])];
const repoOf = (market) => (markets[market] && markets[market].source && markets[market].source.repo) || null;

const claude = (args) => {
  try {
    execFileSync("claude", args, { stdio: ["ignore", "pipe", "pipe"], shell: process.platform === "win32" });
    return true;
  } catch {
    return false;
  }
};
const hasClaude = !dry && claude(["--version"]);

const used = [...new Set(plugins.map((p) => p.split("@")[1]))];
if (dry || !hasClaude) {
  if (!dry) console.log("The claude command is not available here. Paste these into any Claude Code session, then run /reload-plugins:");
  for (const m of used) if (repoOf(m)) console.log(dry ? `claude plugin marketplace add ${repoOf(m)}` : `/plugin marketplace add ${repoOf(m)}`);
  for (const p of plugins) console.log(dry ? `claude plugin install ${p} --scope user` : `/plugin install ${p}`);
  process.exit(0);
}

const failed = [];
// Adding a marketplace that is already known fails harmlessly, so its result is not checked.
for (const m of used) if (repoOf(m)) claude(["plugin", "marketplace", "add", repoOf(m)]);
for (const p of plugins) if (!claude(["plugin", "install", p, "--scope", "user"])) failed.push(p);
const ok = plugins.filter((p) => !failed.includes(p));
if (ok.length) console.log(`Plugins installed or already there: ${ok.map((p) => p.split("@")[0]).join(", ")}.`);
if (failed.length) {
  console.log(`Not installed: ${failed.join(", ")}. Paste these into any Claude Code session:`);
  for (const p of failed) console.log(`/plugin install ${p}`);
}
console.log("In a session that is already open, run /reload-plugins.");
