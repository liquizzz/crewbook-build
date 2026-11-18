// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// Test cases for clear-guard.cjs and the merge note in role-guard.cjs. Run: node .claude/hooks/clear-guard.test.cjs
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync, execFileSync } = require("child_process");

const guard = path.join(__dirname, "clear-guard.cjs");
const roleGuard = path.join(__dirname, "role-guard.cjs");
let failed = 0;
let total = 0;
const check = (name, ok) => {
  total++;
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}`);
};

function project(role) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "clear-guard-"));
  execFileSync("git", ["init", "-q"], { cwd: dir });
  fs.mkdirSync(path.join(dir, ".claude"));
  fs.writeFileSync(path.join(dir, ".claude", "role"), `${role}\n`);
  return dir;
}
const run = (script, cwd, input) => spawnSync("node", [script], { input: JSON.stringify({ cwd, ...input }), encoding: "utf8" });
const merge = (cwd, command = "gh pr merge 12 --squash") => run(roleGuard, cwd, { tool_name: "Bash", tool_input: { command } });
const send = (cwd, to = "local_dev", tool_name = "SendMessage") => run(guard, cwd, { hook_event_name: "PreToolUse", tool_name, tool_input: tool_name === "SendMessage" ? { to, message: "/cb-build try #2" } : { session_id: to, message: "/cb-build try #2" } }).status;
const clear = (cwd, session_id = "local_dev", tool_response = {}) => run(guard, cwd, { hook_event_name: "PostToolUse", tool_name: "mcp__ccd_session_mgmt__clear_session", tool_input: { session_id }, tool_response });

const lead = project("lead");
check("no merge yet: the message goes through", send(lead) === 0);
merge(lead);
const blocked = run(guard, lead, { hook_event_name: "PreToolUse", tool_name: "SendMessage", tool_input: { to: "local_dev" } });
check("after a merge: the first message is blocked", blocked.status === 2);
check("the reason names the clear and the way past it", blocked.stderr.includes("clear_session") && blocked.stderr.includes("/clear") && blocked.stderr.includes("send the same message again"));
check("sent again: it goes through", send(lead) === 0);

merge(lead, "git fetch -q\ngh pr comment 13 --body \"ok\"\nrtk gh pr merge 13 --squash");
check("a merge inside a longer script counts", send(lead) === 2);
send(lead);

merge(lead);
clear(lead);
check("cleared since the merge: no block", send(lead) === 0);
check("another session is still stopped once", send(lead, "local_test") === 2);
check("the older message tool is covered", send(lead, "local_ui", "mcp__ccd_session_mgmt__send_message") === 2);

merge(lead);
clear(lead, "local_dev", { is_error: true });
check("a refused clear does not count", send(lead) === 2);
send(lead);
merge(lead);
clear(lead, "self");
check("clearing the Lead itself does not count for a role", send(lead) === 2);

const dev = project("dev");
fs.writeFileSync(path.join(dev, ".claude", "project.json"), "{}");
merge(dev);
check("other roles are never stopped", send(dev) === 0);
const noGit = fs.mkdtempSync(path.join(os.tmpdir(), "clear-guard-"));
fs.mkdirSync(path.join(noGit, ".claude"));
fs.writeFileSync(path.join(noGit, ".claude", "role"), "lead\n");
check("no git folder: the hook lets the message through", send(noGit) === 0);

for (const d of [lead, dev, noGit]) fs.rmSync(d, { recursive: true, force: true });
console.log(`\n${total - failed}/${total} passed`);
process.exit(failed ? 1 : 0);
