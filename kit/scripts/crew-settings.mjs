#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// Settings every session of this project shares at once, kept outside git in the repo's common git
// folder (one file for the main checkout and all worktrees; nothing to commit or merge). relay and merge start on, testing off.
//   node scripts/crew-settings.mjs handoff         before a hand-off: prints "messages: on|off" and "tips: show|hide"
//                                                   (tips only while messages are off; a "show" counts; they stop after 3
//                                                   or once the owner used /cb-send or /cb-auto)
//   node scripts/crew-settings.mjs relay [on|off]  sessions pass hand-off prompts to each other (/cb-auto relay)
//   node scripts/crew-settings.mjs merge [on|off]  the Lead merges every PR after its review and green CI (/cb-auto merge)
//   node scripts/crew-settings.mjs testing [on|off] Full: Test checks each merged L1-L3 task before it is Done (/cb-auto testing)
//   node scripts/crew-settings.mjs learned         the owner knows /cb-send and /cb-auto: no more tips
//   node scripts/crew-settings.mjs status          prints the settings
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const TIPS_LIMIT = 3;
const DEFAULTS = { messages: true, merge: true, testing: false, tipsShown: 0, learned: false };
const commonDir = path.resolve(execFileSync("git", ["rev-parse", "--git-common-dir"]).toString().trim());
const file = path.join(commonDir, "crewbook-settings.json");
const read = () => {
  try {
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(file, "utf8")) };
  } catch {
    return { ...DEFAULTS };
  }
};
const write = (s) => fs.writeFileSync(file, JSON.stringify(s, null, 2) + "\n");
const onOff = (v) => (v ? "on" : "off");

const [cmd, arg] = process.argv.slice(2);
const s = read();
const toggle = arg === "on" || arg === "off";
if (cmd === "handoff") {
  const show = !s.messages && !s.learned && s.tipsShown < TIPS_LIMIT;
  if (show) write({ ...s, tipsShown: s.tipsShown + 1 });
  console.log(`messages: ${onOff(s.messages)}\ntips: ${show ? "show" : "hide"}`);
} else if (cmd === "relay" && (toggle || !arg)) {
  if (toggle) write({ ...s, messages: arg === "on", learned: true });
  console.log(`messages: ${toggle ? arg : onOff(s.messages)}`);
} else if (cmd === "merge" && (toggle || !arg)) {
  if (toggle) write({ ...s, merge: arg === "on" });
  console.log(`auto-merge: ${toggle ? arg : onOff(s.merge)}`);
} else if (cmd === "testing" && (toggle || !arg)) {
  if (toggle) write({ ...s, testing: arg === "on" });
  console.log(`per-task testing: ${toggle ? arg : onOff(s.testing)}`);
} else if (cmd === "learned") {
  write({ ...s, learned: true });
  console.log("tips: hide");
} else if (cmd === "status") {
  console.log(`messages: ${onOff(s.messages)}\nauto-merge: ${onOff(s.merge)}\nper-task testing: ${onOff(s.testing)}\ntips shown: ${s.tipsShown} of ${TIPS_LIMIT}${s.learned ? " (owner knows /cb-send and /cb-auto)" : ""}`);
} else {
  console.error("Usage: node scripts/crew-settings.mjs handoff | relay [on|off] | merge [on|off] | testing [on|off] | learned | status");
  process.exit(1);
}
