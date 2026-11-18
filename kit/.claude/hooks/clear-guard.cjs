#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// clear-guard: stops the Lead once before it messages a session that was not cleared since the last merged PR.
//
//   role-guard calls noteMerge when the Lead runs gh pr merge.
//   PostToolUse on clear_session records the session as cleared for that merge.
//   PreToolUse on a session message: the first message to a session not cleared since the merge is blocked with the
//   reason; sending it again goes through, so a role with other work, or a session the app refuses to clear, never waits.
//
// The state lives in the worktree's git folder, so it is never committed. Any failure here lets the message through.
// Tests: node .claude/hooks/clear-guard.test.cjs

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

function findRole(startDir) {
  let dir = path.resolve(startDir);
  for (;;) {
    const file = path.join(dir, ".claude", "role");
    if (fs.existsSync(file)) return { role: fs.readFileSync(file, "utf8").trim().toLowerCase(), root: dir };
    const parent = path.dirname(dir);
    if (parent === dir) return { role: null, root: null };
    dir = parent;
  }
}

function stateFile(root) {
  const rel = execFileSync("git", ["rev-parse", "--git-path", "crewbook-clear.json"], { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  return path.resolve(root, rel);
}

function load(file) {
  try {
    return { merge: 0, cleared: {}, warned: {}, ...JSON.parse(fs.readFileSync(file, "utf8")) };
  } catch {
    return { merge: 0, cleared: {}, warned: {} };
  }
}

const save = (file, state) => fs.writeFileSync(file, JSON.stringify(state) + "\n");

function noteMerge(root) {
  try {
    const file = stateFile(root);
    const state = load(file);
    state.merge += 1;
    save(file, state);
  } catch {}
}

function noteClear(root, session) {
  const file = stateFile(root);
  const state = load(file);
  state.cleared[session] = state.merge;
  save(file, state);
}

// Returns the reason to block, or null.
function checkSend(root, target) {
  const file = stateFile(root);
  const state = load(file);
  if (!state.merge || (state.cleared[target] || 0) >= state.merge || (state.warned[target] || 0) >= state.merge) return null;
  state.warned[target] = state.merge;
  save(file, state);
  return "A PR was merged and this session was not cleared since (rule \"Fresh context\"). If it is the role whose PR was merged and its hand-off is on the issue: clear it with clear_session (load the tool if needed), set its model, then send. If the app refuses the clear, ask the owner to type /clear there. If this session has another PR in review or work not pushed, or it is another role, send the same message again: it goes through.";
}

function main() {
  let input = {};
  try {
    input = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
  } catch {}
  try {
    const { role, root } = findRole(input.cwd || process.cwd());
    if (role !== "lead") return;
    const ti = input.tool_input || {};
    if (input.hook_event_name === "PostToolUse") {
      const failed = input.tool_response && (input.tool_response.is_error || input.tool_response.isError);
      if (ti.session_id && ti.session_id !== "self" && !failed) noteClear(root, ti.session_id);
      return;
    }
    const target = ti.to || ti.session_id;
    const reason = target ? checkSend(root, target) : null;
    if (reason) {
      process.stderr.write(`[clear-guard] ${reason}\n`);
      process.exitCode = 2;
    }
  } catch {}
}

if (require.main === module) main();
module.exports = { noteMerge, noteClear, checkSend };
