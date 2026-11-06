#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// Models per task (/cb-model, rule "Models" in CLAUDE.md):
//   node scripts/model.mjs                            the table: role, provider, the task in hand, its model and effort
//   node scripts/model.mjs pick <L0-L3|analysis|design|review|coordination> [signals 0-3] [--files n] [--level Ln]
//                                                     the model and effort a task starts on
//   node scripts/model.mjs task <role> <#n> <model> <effort>   record the task's model in the role's worktree
//                                                     (.claude/task.json, git-ignored; the session-start hook checks it)
//   node scripts/model.mjs up <role> [reason]         the next step on the ladder for that role's task
//   node scripts/model.mjs mode <claude|deepseek>     claude: every role on Claude; deepseek: the Dev, Frontend and Test
//                                                     on DeepSeek, the Lead and UI/UX on Claude
//   node scripts/model.mjs provider <role> <claude|deepseek>   one role's provider (a DeepSeek task moved to Claude)
//   node scripts/model.mjs --apply [role]             write the provider settings again (a new worktree, a new key)
// A Claude session gets its model from the Lead (set_session_model, set_session_effort), or from the owner's model menu;
// a session cannot change its own. A provider other than Claude needs an "env" block in the worktree's git-ignored
// .claude/settings.local.json, read only when a session starts with `claude` in that folder (sessions opened from the
// desktop app ignore it). The DeepSeek key comes from DEEPSEEK_API_KEY in .env.local (set-secret.mjs) and is never printed.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { RETIRED_ROLES, ROLES, mainCheckout, readProject, roleTitle, worktreePath, writeProject } from "./project-level.mjs";

// The ladder, one step at a time. Higher steps only when the owner asks or a task fails, never by default.
export const LADDER = [["haiku", "low"], ["sonnet", "medium"], ["sonnet", "high"], ["opus", "medium"], ["opus", "high"]];
export const MODEL_IDS = { haiku: "claude-haiku-5-5", sonnet: "claude-sonnet-5-5", opus: "claude-opus-5-5" };
const EFFORTS = ["low", "medium", "high", "xhigh", "max"];
// The starting point of a task (plan, "Models"): the level is the risk, the three difficulty signals the ease.
export function pick(kind, signals = 0, files = 0, level = null) {
  const all = Number(signals) >= 3;
  switch (String(kind).toUpperCase()) {
    case "L0": return all && (!files || files <= 3) ? ["haiku", "low"] : ["sonnet", "low"];
    case "L1": return all ? ["haiku", "medium"] : ["sonnet", "medium"];
    case "L2": return ["sonnet", "high"];
    case "L3": return all ? ["sonnet", "high"] : ["opus", "high"];
    case "ANALYSIS":
    case "DESIGN": return ["opus", "medium"];
    case "REVIEW": return String(level).toUpperCase() === "L3" ? ["opus", "medium"] : ["sonnet", "medium"];
    case "COORDINATION":
    case "BUILD":
    case "RELEASE": return ["sonnet", "low"];
    default: return null;
  }
}
// The next step on the ladder from a model and effort (an effort between two steps goes to the next one up).
export function nextStep(model, effort) {
  const at = LADDER.findIndex(([m, e]) => m === model && EFFORTS.indexOf(e) >= EFFORTS.indexOf(effort));
  const i = at >= 0 ? at : LADDER.findIndex(([m]) => m === model);
  return i >= 0 && i < LADDER.length - 1 ? LADDER[i + 1] : null;
}

// Providers. In the deepseek mode the building roles run on DeepSeek; the Lead and UI/UX stay on Claude.
export const MODES = {
  claude: { lead: "claude", uiux: "claude", dev: "claude", frontend: "claude", test: "claude" },
  deepseek: { lead: "claude", uiux: "claude", dev: "deepseek", frontend: "deepseek", test: "deepseek" },
};
const RENAMED_MODES = { mix: "deepseek" };
const DEEPSEEK = "https://api.deepseek.com/anthropic";
const KEY_NAME = "DEEPSEEK_API_KEY";
const TOKEN_VAR = "ANTHROPIC_AUTH_TOKEN";
const DS_ENV = { main: "deepseek-flash[1m]", opus: "deepseek-flash[1m]", sonnet: "deepseek-flash[1m]", haiku: "deepseek-flash", sub: "deepseek-flash" };
const ENV_KEYS = ["ANTHROPIC_BASE_URL", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_MODEL", "ANTHROPIC_DEFAULT_OPUS_MODEL", "ANTHROPIC_DEFAULT_SONNET_MODEL", "ANTHROPIC_DEFAULT_HAIKU_MODEL", "CLAUDE_CODE_SUBAGENT_MODEL"];

const args = process.argv.slice(2);
const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};
const readJson = (file, empty) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return empty;
  }
};

// pick needs no project: it is the table alone.
if (args[0] === "pick") {
  const flag = (n) => {
    const i = args.indexOf(`--${n}`);
    return i > 0 ? args[i + 1] : undefined;
  };
  const got = pick(args[1], Number(args[2] || 0), Number(flag("files") || 0), flag("level"));
  if (!got) fail("Usage: node scripts/model.mjs pick <L0|L1|L2|L3|analysis|design|review|coordination> [signals 0-3] [--files n] [--level Ln]");
  console.log(`${got[0]} ${got[1]} (${MODEL_IDS[got[0]]})`);
  process.exit(0);
}

const here = execFileSync("git", ["rev-parse", "--show-toplevel"], { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
const root = mainCheckout(here);
const common = path.resolve(execFileSync("git", ["rev-parse", "--git-common-dir"], { stdio: ["ignore", "pipe", "ignore"] }).toString().trim());
const store = path.join(common, "crewbook-models.json");
const state = readJson(store, {});
const project = readProject(here) || {};
let mode = RENAMED_MODES[state.mode || project.models] || state.mode || project.models || "claude";
if (!MODES[mode]) mode = "claude";
const providers = state.providers || {};
const save = () => fs.writeFileSync(store, JSON.stringify({ mode, providers }, null, 2) + "\n");

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
const providerOf = (role) => providers[role] || MODES[mode][role] || "claude";
const checkRole = (role) => {
  if (RETIRED_ROLES[role]) fail(`The kit no longer has a ${role} role; its work is done by ${RETIRED_ROLES[role]}.`);
  if (!ROLES.includes(role)) fail(`Unknown role ${role}: ${ROLES.join(", ")}.`);
};
const taskFile = (role) => path.join(worktreePath(root, role), ".claude", "task.json");
const taskOf = (role) => readJson(taskFile(role), null);

// Write one worktree's provider settings; keeps every other setting in settings.local.json.
const apply = (role) => {
  const dir = worktreePath(root, role);
  if (!fs.existsSync(dir)) return false;
  const file = path.join(dir, ".claude", "settings.local.json");
  const settings = readJson(file, {});
  const env = { ...(settings.env || {}) };
  for (const k of ENV_KEYS) delete env[k];
  delete settings.model;
  if (providerOf(role) === "deepseek") {
    const token = key();
    if (!token) return false;
    Object.assign(env, {
      ANTHROPIC_BASE_URL: DEEPSEEK,
      [TOKEN_VAR]: token,
      ANTHROPIC_MODEL: DS_ENV.main,
      ANTHROPIC_DEFAULT_OPUS_MODEL: DS_ENV.opus,
      ANTHROPIC_DEFAULT_SONNET_MODEL: DS_ENV.sonnet,
      ANTHROPIC_DEFAULT_HAIKU_MODEL: DS_ENV.haiku,
      CLAUDE_CODE_SUBAGENT_MODEL: DS_ENV.sub,
    });
  }
  if (Object.keys(env).length) settings.env = env;
  else delete settings.env;
  if (!Object.keys(settings).length && !fs.existsSync(file)) return true;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(settings, null, 2) + "\n");
  return true;
};
const restart = (roles) => {
  const open = roles.filter((r) => fs.existsSync(worktreePath(root, r)));
  if (open.length) console.log(`New provider for ${open.map(roleTitle).join(", ")}: start that session again with \`claude\` in its folder (the provider is read when a session starts; sessions opened from the desktop app run Claude).`);
};

if (args[0] === "--apply") {
  const roles = args[1] ? [args[1]] : ROLES;
  roles.forEach(apply);
  const waiting = roles.filter((r) => providerOf(r) === "deepseek" && !key() && fs.existsSync(worktreePath(root, r)));
  if (waiting.length) console.log(`Waiting for the DeepSeek key: ${waiting.join(", ")}. ${NO_KEY}`);
  process.exit(0);
}

if (args[0] === "mode") {
  const asked = String(args[1] || "").toLowerCase();
  const next = RENAMED_MODES[asked] || asked;
  if (!MODES[next]) fail("Usage: node scripts/model.mjs mode <claude|deepseek>");
  if (next !== "claude" && !key()) fail(`The ${next} mode runs the Dev, Frontend and Test on DeepSeek. ${NO_KEY}`);
  mode = next;
  for (const r of Object.keys(providers)) delete providers[r];
  save();
  writeProject(here, { ...project, models: mode });
  ROLES.forEach(apply);
  console.log(`Model mode: ${mode}. ${ROLES.map((r) => `${roleTitle(r)} ${providerOf(r) === "claude" ? "Claude" : "DeepSeek"}`).join(", ")}.`);
  console.log("Updated .claude/project.json (\"models\"): commit it.");
  if (mode !== "claude") console.log("DeepSeek gets the code those roles see: a client project needs the client's OK.");
  restart(ROLES.filter((r) => MODES[mode][r] !== "claude"));
  process.exit(0);
}

if (args[0] === "provider") {
  const role = String(args[1] || "").toLowerCase();
  const asked = String(args[2] || "").toLowerCase();
  checkRole(role);
  if (!["claude", "deepseek"].includes(asked)) fail("Usage: node scripts/model.mjs provider <role> <claude|deepseek>");
  if (asked === "deepseek" && !key()) fail(NO_KEY);
  if (asked === MODES[mode][role]) delete providers[role];
  else providers[role] = asked;
  save();
  apply(role);
  console.log(`${roleTitle(role)}: ${asked === "claude" ? "Claude" : "DeepSeek"}${providers[role] ? " (changed)" : " (the mode's)"}.`);
  restart([role]);
  process.exit(0);
}

if (args[0] === "task") {
  const [, roleArg, issue, model, effort] = args;
  const role = String(roleArg || "").toLowerCase();
  checkRole(role);
  if (!/^#?\d+$/.test(issue || "") || !MODEL_IDS[model] || !EFFORTS.includes(effort)) fail("Usage: node scripts/model.mjs task <role> <#n> <haiku|sonnet|opus> <low|medium|high|xhigh|max>");
  if (!fs.existsSync(worktreePath(root, role))) fail(`${roleTitle(role)} has no worktree yet.`);
  const task = { issue: Number(String(issue).replace("#", "")), model, effort, steps: [] };
  fs.writeFileSync(taskFile(role), JSON.stringify(task, null, 2) + "\n");
  console.log(`${roleTitle(role)} · #${task.issue}: ${model} ${effort} (${MODEL_IDS[model]}). Set it on the session (set_session_model, set_session_effort) before you send the task.`);
  process.exit(0);
}

if (args[0] === "up") {
  const role = String(args[1] || "").toLowerCase();
  checkRole(role);
  const task = taskOf(role);
  if (!task) fail(`${roleTitle(role)} has no task recorded: node scripts/model.mjs task ${role} <#n> <model> <effort> first.`);
  if (providerOf(role) === "deepseek") {
    providers[role] = "claude";
    save();
    apply(role);
    Object.assign(task, { model: "sonnet", effort: "medium", steps: [...(task.steps || []), { to: "sonnet medium", from: "deepseek", why: args.slice(2).join(" ") || null }] });
    fs.writeFileSync(taskFile(role), JSON.stringify(task, null, 2) + "\n");
    console.log(`${roleTitle(role)} · #${task.issue}: DeepSeek → Claude sonnet medium.`);
    restart([role]);
    process.exit(0);
  }
  const next = nextStep(task.model, task.effort);
  if (!next) fail(`${roleTitle(role)} · #${task.issue} is already on ${task.model} ${task.effort}, the top of the ladder: split the task, or the Lead does the hard part.`);
  task.steps = [...(task.steps || []), { from: `${task.model} ${task.effort}`, to: next.join(" "), why: args.slice(2).join(" ") || null }];
  [task.model, task.effort] = next;
  fs.writeFileSync(taskFile(role), JSON.stringify(task, null, 2) + "\n");
  console.log(`${roleTitle(role)} · #${task.issue}: ${task.steps.at(-1).from} → ${next.join(" ")} (${MODEL_IDS[next[0]]})${next[0] === "opus" ? ". Opus: the owner's OK first, unless escalation is on and the owner allowed Opus" : ""}. Set it on the session (set_session_model, set_session_effort) and comment on the issue: Model: ${task.steps.at(-1).from} → ${next.join(" ")} (<cause>: <reason>).`);
  process.exit(0);
}

if (args.length) fail("Usage: node scripts/model.mjs [pick ... | task <role> <#n> <model> <effort> | up <role> [reason] | mode <claude|deepseek> | provider <role> <claude|deepseek> | --apply [role]]");

console.log(`Model mode: ${mode} · DeepSeek key: ${key() ? "set" : "not set"}\n`);
console.log(`${"Role".padEnd(9)} ${"Provider".padEnd(9)} ${"Task".padEnd(6)} Model and effort`);
for (const r of project.roles || ROLES) {
  const t = taskOf(r);
  const there = fs.existsSync(worktreePath(root, r));
  const provider = providerOf(r) === "claude" ? "Claude" : "DeepSeek";
  const now = t ? `${t.model} ${t.effort}${t.steps?.length ? ` (moved up ${t.steps.length}x)` : ""}` : "-";
  console.log(`${roleTitle(r).padEnd(9)} ${provider.padEnd(9)} ${(t ? `#${t.issue}` : "-").padEnd(6)} ${now}${there ? "" : " · no worktree yet"}${providers[r] ? " · provider changed" : ""}`);
}
const retired = Object.keys(RETIRED_ROLES).filter((r) => fs.existsSync(worktreePath(root, r)));
if (retired.length) console.log(`\nRetired roles with a worktree still: ${retired.join(", ")}. Remove each when its work is merged: git worktree remove "${worktreePath(root, retired[0])}"`);
