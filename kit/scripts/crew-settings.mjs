#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// Settings every session of this project shares at once, kept outside git in the repo's common git
// folder (one file for the main checkout and all worktrees; nothing to commit or merge). /cb-setup asks for them; the
// defaults: relay on, merge all, escalate on, testing off.
//   node scripts/crew-settings.mjs handoff           before a hand-off: prints "messages: on|off" and "tips: show|hide"
//                                                     (tips only while messages are off; a "show" counts; they stop after 3
//                                                     or once the owner used /cb-send or /cb-auto)
//   node scripts/crew-settings.mjs relay [on|off]    sessions pass hand-off prompts to each other (/cb-auto relay)
//   node scripts/crew-settings.mjs merge [level]     the PRs the Lead merges by itself after its checks (/cb-auto merge):
//                                                     off, only-L0, up-to-L1, up-to-L2, all (empty means all)
//   node scripts/crew-settings.mjs merge-ok <L0-L3>  "yes" when a PR of that level may be merged without the owner, else "no"
//   node scripts/crew-settings.mjs escalate [on|off] a stuck task moves one step up the model ladder below Opus by itself
//   node scripts/crew-settings.mjs testing [on|off]  Test checks each merged L1-L3 task before it is Done (/cb-auto testing)
//   node scripts/crew-settings.mjs off               every automation off at once (relay, merge, escalate)
//   node scripts/crew-settings.mjs learned           the owner knows /cb-send and /cb-auto: no more tips
//   node scripts/crew-settings.mjs status            prints the settings
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const TIPS_LIMIT = 3;
// The merge levels: the highest change level the Lead merges by itself (-1: none).
export const MERGE_LEVELS = { off: -1, "only-L0": 0, "up-to-L1": 1, "up-to-L2": 2, all: 3 };
const DEFAULTS = { messages: true, merge: "all", escalate: true, testing: false, tipsShown: 0, learned: false };
const commonDir = path.resolve(execFileSync("git", ["rev-parse", "--git-common-dir"]).toString().trim());
const file = path.join(commonDir, "crewbook-settings.json");
// The merge setting before levels was on or off.
const mergeOf = (v) => (v === true ? "all" : v === false ? "off" : MERGE_LEVELS[v] !== undefined ? v : "all");
const read = () => {
  let s;
  try {
    s = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(file, "utf8")) };
  } catch {
    s = { ...DEFAULTS };
  }
  return { ...s, merge: mergeOf(s.merge) };
};
const write = (s) => fs.writeFileSync(file, JSON.stringify(s, null, 2) + "\n");
const onOff = (v) => (v ? "on" : "off");
const mergeText = (m) => ({ off: "off (every PR waits for the owner)", "only-L0": "only-L0 (L1-L3 wait for the owner)", "up-to-L1": "up-to-L1 (L2-L3 wait for the owner)", "up-to-L2": "up-to-L2 (L3 waits for the owner)", all: "all (every level, L3 included)" }[m]);

const [cmd, arg] = process.argv.slice(2);
const s = read();
const toggle = arg === "on" || arg === "off";
const fail = () => {
  console.error("Usage: node scripts/crew-settings.mjs handoff | relay [on|off] | merge [off|only-L0|up-to-L1|up-to-L2|all] | merge-ok <L0-L3> | escalate [on|off] | testing [on|off] | off | learned | status");
  process.exit(1);
};
if (cmd === "handoff") {
  const show = !s.messages && !s.learned && s.tipsShown < TIPS_LIMIT;
  if (show) write({ ...s, tipsShown: s.tipsShown + 1 });
  console.log(`messages: ${onOff(s.messages)}\ntips: ${show ? "show" : "hide"}`);
} else if (cmd === "relay" && (toggle || !arg)) {
  if (toggle) write({ ...s, messages: arg === "on", learned: true });
  console.log(`messages: ${toggle ? arg : onOff(s.messages)}`);
} else if (cmd === "merge") {
  const asked = arg === undefined ? null : arg === "" ? "all" : Object.keys(MERGE_LEVELS).find((k) => k.toLowerCase() === String(arg).toLowerCase());
  if (arg !== undefined && !asked) fail();
  if (asked) write({ ...s, merge: asked, learned: true });
  console.log(`auto-merge: ${mergeText(asked || s.merge)}`);
} else if (cmd === "merge-ok") {
  const level = Number(String(arg || "").replace(/^L/i, ""));
  if (!Number.isInteger(level) || level < 0 || level > 3) fail();
  console.log(level <= MERGE_LEVELS[s.merge] ? "yes" : "no");
} else if (cmd === "escalate" && (toggle || !arg)) {
  if (toggle) write({ ...s, escalate: arg === "on", learned: true });
  console.log(`escalate: ${toggle ? arg : onOff(s.escalate)}`);
} else if (cmd === "testing" && (toggle || !arg)) {
  if (toggle) write({ ...s, testing: arg === "on" });
  console.log(`per-task testing: ${toggle ? arg : onOff(s.testing)}`);
} else if (cmd === "off" && !arg) {
  write({ ...s, messages: false, merge: "off", escalate: false, learned: true });
  console.log("messages: off\nauto-merge: off (every PR waits for the owner)\nescalate: off");
} else if (cmd === "learned") {
  write({ ...s, learned: true });
  console.log("tips: hide");
} else if (cmd === "status") {
  console.log(`messages: ${onOff(s.messages)}\nauto-merge: ${mergeText(s.merge)}\nescalate: ${onOff(s.escalate)}\nper-task testing: ${onOff(s.testing)}\ntips shown: ${s.tipsShown} of ${TIPS_LIMIT}${s.learned ? " (owner knows /cb-send and /cb-auto)" : ""}`);
} else fail();
