#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// Which provider and model each role runs on (/cb-model):
//   node scripts/model.mjs                         the table: role, provider, model, where it comes from
//   node scripts/model.mjs mode <claude|deepseek|mix>   the project's mode; every role goes to its default
//   node scripts/model.mjs <role> <model|default>  one role: opus, sonnet, deepseek-pro, deepseek-flash
//   node scripts/model.mjs --apply [role]          write the settings again (after the key changed, for a new worktree)
// It writes each role worktree's git-ignored .claude/settings.local.json: "model" for Claude, an "env" block
// (address, key, model names) for DeepSeek. The key comes from DEEPSEEK_API_KEY in .env.local
// (node scripts/set-secret.mjs DEEPSEEK_API_KEY) and is never printed. The mode is kept in .claude/project.json
// ("models"), the per-role changes in the shared .git folder. A session picks a change up when it starts.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { RETIRED_ROLES, ROLES, mainCheckout, readProject, worktreePath, writeProject } from "./project-level.mjs";

const MODELS = ["opus", "sonnet", "deepseek-pro", "deepseek-flash"];
// Roles that look at images (screens, screenshots): deepseek-v4-pro cannot read them.
const SEES_IMAGES = ["uiux", "test"];
// The default model of each role in each mode. DeepSeek: a role that would use Opus runs deepseek-pro, or
// deepseek-flash when it looks at images; Dev and Test run deepseek-flash.
export const MODES = {
  claude: { lead: "opus", uiux: "opus", devops: "opus", dev1: "sonnet", dev2: "sonnet", test: "sonnet" },
  deepseek: { lead: "deepseek-pro", uiux: "deepseek-flash", devops: "deepseek-pro", dev1: "deepseek-flash", dev2: "deepseek-flash", test: "deepseek-flash" },
  mix: { lead: "opus", uiux: "opus", devops: "opus", dev1: "deepseek-flash", dev2: "deepseek-flash", test: "deepseek-flash" },
};
const DEEPSEEK = "https://api.deepseek.com/anthropic";
const KEY_NAME = "DEEPSEEK_API_KEY";
const TOKEN_VAR = "ANTHROPIC_AUTH_TOKEN";
// deepseek-pro: v4-pro does the work; subagents (and the Lead's look at an image) run flash, which reads images.
const ENV = {
  "deepseek-pro": { main: "deepseek-v4-pro", opus: "deepseek-v4-pro", sonnet: "deepseek-flash", haiku: "deepseek-flash", sub: "deepseek-flash" },
  "deepseek-flash": { main: "deepseek-flash[1m]", opus: "deepseek-flash[1m]", sonnet: "deepseek-flash[1m]", haiku: "deepseek-flash", sub: "deepseek-flash" },
};
const ENV_KEYS = ["ANTHROPIC_BASE_URL", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_MODEL", "ANTHROPIC_DEFAULT_OPUS_MODEL", "ANTHROPIC_DEFAULT_SONNET_MODEL", "ANTHROPIC_DEFAULT_HAIKU_MODEL", "CLAUDE_CODE_SUBAGENT_MODEL"];

const here = execFileSync("git", ["rev-parse", "--show-toplevel"], { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
const root = mainCheckout(here);
const common = path.resolve(execFileSync("git", ["rev-parse", "--git-common-dir"], { stdio: ["ignore", "pipe", "ignore"] }).toString().trim());
const store = path.join(common, "crewbook-models.json");
const readJson = (file, empty) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return empty;
  }
};
const state = readJson(store, {});
const project = readProject(here) || {};
let mode = state.mode || project.models || null;
const changed = state.roles || {};
const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};

const key = () => {
  for (const dir of [root, here]) {
    const file = path.join(dir, ".env.local");
    if (!fs.existsSync(file)) continue;
    const line = fs.readFileSync(file, "utf8").split(/\r?\n/).find((l) => l.startsWith(`${KEY_NAME}=`));
    const value = line ? line.slice(KEY_NAME.length + 1).trim() : "";
    if (value && value !== "CHANGE_ME") return value;
  }
  return null;
};
const NO_KEY = "No DeepSeek key yet. The owner runs: node scripts/set-secret.mjs DEEPSEEK_API_KEY (the key stays hidden), then try again.";
const modelOf = (role) => changed[role] || (mode ? MODES[mode][role] : null);
const refuse = (role, model) => {
  if (!MODELS.includes(model)) return `Unknown model ${model}: use ${MODELS.join(", ")} or default.`;
  if (model === "deepseek-pro" && SEES_IMAGES.includes(role)) return `${role} looks at screens and screenshots; deepseek-pro cannot read images. Use deepseek-flash or a Claude model.`;
  if (model.startsWith("deepseek") && !key()) return NO_KEY;
  return null;
};

// Write one worktree's settings.local.json; keeps every other setting in it.
const apply = (role) => {
  const dir = worktreePath(root, role);
  if (!fs.existsSync(dir)) return false;
  const model = modelOf(role);
  if (!model) return false;
  const file = path.join(dir, ".claude", "settings.local.json");
  const settings = readJson(file, {});
  const env = { ...(settings.env || {}) };
  for (const k of ENV_KEYS) delete env[k];
  delete settings.model;
  if (model.startsWith("deepseek")) {
    const token = key();
    if (!token) return false;
    const m = ENV[model];
    Object.assign(env, {
      ANTHROPIC_BASE_URL: DEEPSEEK,
      [TOKEN_VAR]: token,
      ANTHROPIC_MODEL: m.main,
      ANTHROPIC_DEFAULT_OPUS_MODEL: m.opus,
      ANTHROPIC_DEFAULT_SONNET_MODEL: m.sonnet,
      ANTHROPIC_DEFAULT_HAIKU_MODEL: m.haiku,
      CLAUDE_CODE_SUBAGENT_MODEL: m.sub,
    });
  } else {
    settings.model = model;
  }
  if (Object.keys(env).length) settings.env = env;
  else delete settings.env;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(settings, null, 2) + "\n");
  return true;
};
const save = () => fs.writeFileSync(store, JSON.stringify({ mode, roles: changed }, null, 2) + "\n");
const reopen = (roles) => {
  const open = roles.filter((r) => fs.existsSync(worktreePath(root, r)));
  if (open.length) console.log(`Open a new session for: ${open.join(", ")} (a running session keeps its model until it restarts). Check with /status in it.`);
};

const args = process.argv.slice(2);
if (args[0] === "--apply") {
  const roles = args[1] ? [args[1]] : ROLES;
  if (!mode && !roles.some((r) => changed[r])) process.exit(0);
  const done = roles.filter((r) => apply(r));
  if (done.length) console.log(`Model set for ${done.map((r) => `${r} (${modelOf(r)})`).join(", ")}.`);
  const waiting = roles.filter((r) => modelOf(r)?.startsWith("deepseek") && !key() && fs.existsSync(worktreePath(root, r)));
  if (waiting.length) console.log(`Waiting for the DeepSeek key: ${waiting.join(", ")}. ${NO_KEY}`);
  process.exit(0);
}

if (args[0] === "mode") {
  const next = String(args[1] || "").toLowerCase();
  if (!MODES[next]) fail("Usage: node scripts/model.mjs mode <claude|deepseek|mix>");
  if (next !== "claude" && !key()) fail(`The ${next} mode runs roles on DeepSeek. ${NO_KEY}`);
  mode = next;
  for (const r of Object.keys(changed)) delete changed[r];
  save();
  writeProject(here, { ...project, models: mode });
  const done = ROLES.filter((r) => apply(r));
  console.log(`Model mode: ${mode}. ${ROLES.map((r) => `${r} ${MODES[mode][r]}`).join(", ")}.`);
  console.log("Updated .claude/project.json (\"models\"): commit it.");
  reopen(done);
  process.exit(0);
}

if (args.length >= 2) {
  const role = args[0].toLowerCase();
  const asked = args[1].toLowerCase();
  if (RETIRED_ROLES[role]) fail(`The kit no longer has a ${role} role; its work is done by ${RETIRED_ROLES[role]}.`);
  if (!ROLES.includes(role)) fail(`Unknown role ${role}: ${ROLES.join(", ")}.`);
  if (!mode) fail("The project has no model mode yet: node scripts/model.mjs mode <claude|deepseek|mix> first.");
  if (asked === "default") delete changed[role];
  else {
    const why = refuse(role, asked);
    if (why) fail(why);
    if (asked === MODES[mode][role]) delete changed[role];
    else changed[role] = asked;
  }
  save();
  apply(role);
  console.log(`${role}: ${modelOf(role)}${changed[role] ? " (changed)" : " (the mode's default)"}.`);
  reopen([role]);
  process.exit(0);
}

if (args.length) fail("Usage: node scripts/model.mjs [mode <claude|deepseek|mix> | <role> <opus|sonnet|deepseek-pro|deepseek-flash|default> | --apply [role]]");

console.log(`Model mode: ${mode || "(not set: node scripts/model.mjs mode <claude|deepseek|mix>)"} · DeepSeek key: ${key() ? "set" : "not set"}\n`);
console.log(`${"Role".padEnd(8)} ${"Provider".padEnd(10)} ${"Model".padEnd(16)} Source`);
for (const r of ROLES) {
  const m = modelOf(r);
  const there = fs.existsSync(worktreePath(root, r));
  const provider = !m ? "-" : m.startsWith("deepseek") ? "DeepSeek" : "Claude";
  const source = !m ? "" : changed[r] ? `changed (node scripts/model.mjs ${r} ${m})` : "mode";
  console.log(`${r.padEnd(8)} ${provider.padEnd(10)} ${(m || "-").padEnd(16)} ${source}${there ? "" : " · no worktree yet"}`);
}
const retired = Object.keys(RETIRED_ROLES).filter((r) => fs.existsSync(worktreePath(root, r)));
if (retired.length) console.log(`\nRetired roles with a worktree still: ${retired.join(", ")}. Remove each when its work is merged: git worktree remove "${worktreePath(root, retired[0])}"`);
