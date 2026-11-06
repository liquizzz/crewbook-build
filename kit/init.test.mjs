#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// Tests init.mjs (with flags and with answers to its questions) and scripts/roles.mjs on temporary folders.
// Run:  node kit/init.test.mjs      (needs git, Docker and Docker Compose, like init itself; never touches GitHub)
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const kit = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "playbook-init-"));
let failed = 0;
let passed = 0;
const check = (label, cond) => {
  if (cond) passed++;
  else {
    failed++;
    console.log(`FAIL ${label}`);
  }
};
// Tests never install plugins on this machine.
process.env.CREWBOOK_NO_PLUGINS = "1";
const node = (args, opts = {}) => execFileSync("node", args, { stdio: ["pipe", "pipe", "pipe"], ...opts }).toString();
const git = (dir, ...args) => execFileSync("git", args, { cwd: dir }).toString().trim();
const branches = (dir) => git(dir, "branch", "--format=%(refname:short)").split(/\r?\n/).sort().join(",");
const read = (...p) => fs.readFileSync(path.join(...p), "utf8");
const wt = (dir, role) => path.join(path.dirname(dir), `${path.basename(dir)}-wt`, role);

try {
  // 1. Lite with flags
  const a = path.join(tmp, "tiny-todo");
  node([path.join(kit, "init.mjs"), a, "--name", "Tiny Todo", "--description", "A one-page todo list.", "--yes"]);
  check("lite: branches main, dev and staging", branches(a) === "dev,main,role/lead,staging");
  check("lite: only the Lead's worktree before setup", fs.existsSync(wt(a, "lead")) && !fs.existsSync(wt(a, "po")) && !fs.existsSync(wt(a, "dev")));
  check("lite: role file in worktree", read(wt(a, "lead"), ".claude", "role").trim() === "lead");
  check("lite: project.json records the kit version", /^[0-9a-f]{40}$/.test(JSON.parse(read(a, ".claude", "project.json")).kitVersion || ""));
  check("lite: /cb-update for the Lead, asked before", fs.existsSync(path.join(a, ".claude", "commands", "cb-update.md")) && read(a, "CLAUDE.md").includes("kit updates (`/cb-update`)") && read(a, ".claude", "roles", "lead.md").includes("/cb-update"));
  check("lite: project.json with setup false and no roles yet", JSON.parse(read(a, ".claude", "project.json")).roles === null && JSON.parse(read(a, ".claude", "project.json")).setup === false && !("level" in JSON.parse(read(a, ".claude", "project.json"))));
  check("lite: CLAUDE.md name, description, roles line", /^# Tiny Todo$/m.test(read(a, "CLAUDE.md")) && read(a, "CLAUDE.md").includes("A one-page todo list.") && /^- Roles: chosen at \/cb-setup\.$/m.test(read(a, "CLAUDE.md")) && !read(a, "CLAUDE.md").includes("set-level"));
  check("lite: START-HERE.md filled in", read(a, "START-HERE.md").includes("# Start here: Tiny Todo") && read(a, "START-HERE.md").includes(wt(a, "lead")) && !/\{\{\w+\}\}/.test(read(a, "START-HERE.md")));
  check("lite: START-HERE.md committed", git(a, "ls-files", "START-HERE.md") === "START-HERE.md" && git(a, "status", "--porcelain") === "");
  check("lite: compose project name", read(a, "docker-compose.yml").includes("name: tiny-todo"));
  check("design: the prototype service only starts when asked", read(a, "docker-compose.yml").includes('profiles: ["design"]') && fs.existsSync(path.join(a, ".github", "workflows", "image-design.yml")) && fs.existsSync(path.join(a, "docker", "design.Dockerfile")));
  check("lite: English by default", read(a, "CLAUDE.md").includes("- Language: talk to the owner in English; write documents in English."));
  check("plugins: core ones declared with Product Management for the requirements, no github MCP", read(a, ".claude", "settings.json").includes("superpowers@claude-plugins-official") && !read(a, ".claude", "settings.json").includes("github@claude-plugins-official") && read(a, ".claude", "settings.json").includes("\"product-management@knowledge-work-plugins\": true") && read(a, "CLAUDE.md").includes("`product-management:write-spec`, filling the kit's documents") && read(a, "CLAUDE.md").includes("not `product-management:sprint-planning`"));
  check("lite: security checks installed", fs.existsSync(path.join(a, ".github", "dependabot.yml")) && read(a, ".github", "workflows", "codeql.yml").includes("vars.CODEQL_LANGUAGES") && read(a, ".github", "workflows", "image-app.yml").includes("attest-build-provenance"));
  check("lite: NFR rows follow ISO 25010", read(a, "docs", "templates", "srs.md").includes("ISO/IEC 25010") && read(a, "docs", "templates", "srs.md").includes("### 2.4 Constraints"));
  check("lite: plain documents by default, no humanizer plugin", read(a, "CLAUDE.md").includes("- Documents: plain") && !read(a, ".claude", "settings.json").includes("humanizer@humanizer") && JSON.parse(read(a, ".claude", "project.json")).humanize === false);
  check("design plugins left to setup", !read(a, ".claude", "settings.json").includes("ui-ux-pro-max@ui-ux-pro-max-skill\": true") && read(a, "CLAUDE.md").includes("at setup when the product has screens") && read(a, ".claude", "commands", "cb-setup.md").includes("design plugins"));
  check("plan before building: stories, function tree, three architectures", read(a, "CLAUDE.md").includes("**Plan before building.**") && read(a, ".claude", "commands", "cb-setup.md").includes("docs/product/function-tree.md") && read(a, ".claude", "commands", "cb-setup.md").includes("three architectures") && read(a, ".claude", "commands", "cb-setup.md").includes("docs/tech/solution-design.md") && ["function-tree.md", "architecture-options.md", "solution-design.md"].every((t) => fs.existsSync(path.join(a, "docs", "templates", t))));
  check("setup: five questions, the plan approval, the sessions, no PO", ["**Roles.**", "**Autonomy.**", "**Requirements** (`product-management", "**Deployment model and stack** (`superpowers", "**Environments.**", "**The plan approval.**", "**The sessions.**", "roles.mjs set", "roles.mjs worktrees"].every((t) => read(a, ".claude", "commands", "cb-setup.md").includes(t)) && !/\bPO\b|gate/.test(read(a, ".claude", "commands", "cb-setup.md")));
  check("reports: on /cb-progress report only, no daily brief", read(a, ".claude", "commands", "cb-progress.md").includes("docs/reports/<YYYY-MM-DD>.md") && !/morning brief|end-of-day/i.test(read(a, ".claude", "roles", "lead.md") + read(a, "CLAUDE.md") + read(a, "START-HERE.md")));
  // A repo that is not public runs CI on this machine: run.mjs builds the tag here; in github mode it pulls the image.
  check("ci: local by default without a public repo", JSON.parse(read(a, ".claude", "project.json")).ci === "local" && node([path.join("scripts", "ci-mode.mjs")], { cwd: a }).includes("ci: local"));
  const runLocal = node([path.join("scripts", "run.mjs"), "v0.1.0", "--dry-run"], { cwd: a });
  const projectFile = path.join(a, ".claude", "project.json");
  const projectText = fs.readFileSync(projectFile, "utf8");
  fs.writeFileSync(projectFile, JSON.stringify({ ...JSON.parse(projectText), ci: "github" }, null, 2) + "\n");
  const runDry = node([path.join("scripts", "run.mjs"), "v0.1.0", "--dry-run"], { cwd: a });
  fs.writeFileSync(projectFile, projectText);
  check("run.mjs: one command pulls, waits for the healthcheck and opens the app", runDry.includes("docker compose pull app   (IMAGE_TAG=v0.1.0)") && runDry.includes("--wait") && runDry.includes("http://localhost:3000"));
  check("run.mjs: with CI on this machine it builds the tag here", runLocal.includes("build app from v0.1.0 in a temporary worktree, or tag the image already built from the same files") && !runLocal.includes("docker compose pull app"));
  check("workflows: every job skips when CI_MODE is local; CI only on PRs, no dev image", ["ci.yml", "codeql.yml", "docs-check.yml", "image-app.yml"].every((f) => read(a, ".github", "workflows", f).includes("vars.CI_MODE != 'local'")) && !read(a, ".github", "workflows", "ci.yml").includes("branches: [dev]") && read(a, ".github", "workflows", "image-app.yml").includes("branches: [staging]"));
  check("docker: healthcheck on the app, START-HERE runs run.mjs", read(a, "docker-compose.yml").includes("healthcheck:") && read(a, "START-HERE.md").includes("node scripts/run.mjs") && !read(a, "START-HERE.md").includes("docker login"));
  check("setup: one image per layer, dependency files first", read(a, ".claude", "roles", "lead.md").includes("one image per layer") && read(a, ".claude", "roles", "lead.md").includes("dependency files before the source") && read(a, ".claude", "commands", "cb-release.md").includes("node scripts/run.mjs staging"));
  const plug = node([path.join("scripts", "plugins.mjs"), "--dry-run"], { cwd: a });
  check("plugins: installed from the enabled list, marketplaces first", plug.includes("claude plugin marketplace add thedotmack/claude-mem") && plug.includes("claude plugin install superpowers@claude-plugins-official --scope user") && plug.indexOf("marketplace add") < plug.indexOf("plugin install"));
  check("plugins: /cb-setup checks them before anything else", read(a, ".claude", "commands", "cb-setup.md").includes("**Plugins first:**") && read(a, ".claude", "commands", "cb-setup.md").includes("node scripts/plugins.mjs"));
  check("links: issue numbers carry a title and CR, never bare", read(a, "CLAUDE.md").includes("An issue or PR number never stands alone") && read(a, "CLAUDE.md").includes("**Next:** [#12") && read(a, ".claude", "commands", "cb-progress.md").includes("as a link with its short title"));
  check("sessions: created at setup with a model and detached at once", read(a, "CLAUDE.md").includes("**Opening sessions:**") && read(a, "CLAUDE.md").includes("detach it to top level at once") && read(a, "CLAUDE.md").includes("file it back into your sidebar group") && read(a, ".claude", "commands", "cb-setup.md").includes("named after the project") && read(a, ".claude", "commands", "cb-setup.md").includes("`model` Sonnet") && read(a, ".claude", "commands", "cb-add-role.md").includes("`/cb-setup` step 7") && read(a, ".claude", "commands", "cb-plan.md").includes("rule \"Opening sessions\""));
  check("board: same seven columns at every level", ["Backlog", "Approved", "Ready", "In progress", "In review", "Testing", "Done"].every((c) => read(a, "scripts", "setup-board.mjs").includes(`["${c}",`)) && !read(a, "scripts", "setup-board.mjs").includes("readProject"));
  check("board: review loop, docs PRs and Testing in the roles", read(a, ".claude", "commands", "cb-build.md").includes("Review the fixes for #<n>.") && read(a, ".claude", "roles", "dev.md").includes("back to In review") && read(a, ".claude", "roles", "lead.md").includes("Test #<n> on dev.") && read(a, ".claude", "roles", "test.md").includes("leave #n in Testing") && read(a, "CLAUDE.md").includes("goes on the board itself") && read(a, "scripts", "board-status.mjs").includes("pull_request"));
  check("approvals: the plan, a milestone, a release", read(a, "CLAUDE.md").includes("**Asking for an approval** (the plan, a milestone, a release)") && read(a, "CLAUDE.md").includes("The owner decides three times") && !/\bG[1-6]\b/.test(read(a, "CLAUDE.md") + read(a, "START-HERE.md") + read(a, ".claude", "roles", "lead.md")));
  check("lite: skills table in CLAUDE.md", read(a, "CLAUDE.md").includes("## Skills") && read(a, "CLAUDE.md").includes("superpowers:brainstorming") && read(a, "CLAUDE.md").includes("Try it in the browser"));
  const hook = (dir) => {
    const out = execFileSync("node", [path.join(dir, ".claude", "hooks", "session-start.cjs")], { input: "{}", env: { ...process.env, CLAUDE_PROJECT_DIR: dir } }).toString();
    return out ? JSON.parse(out).hookSpecificOutput.additionalContext : "";
  };
  const leadReminder = hook(wt(a, "lead"));
  check("session-start: lead gets role, skills and recovery", leadReminder.includes("you are the lead session") && leadReminder.includes("superpowers:writing-plans") && leadReminder.includes("The AI understands") && leadReminder.includes("Recovery"));
  check("session-start: main checkout is told to use a worktree", hook(a).includes("has no role"));
  check("session-start: registered in settings", read(a, ".claude", "settings.json").includes("session-start.cjs"));
  // A UI/UX worktree made before setup is told to wait; after setup it works. A retired role is told to stop.
  node([path.join("scripts", "new-role-worktree.mjs"), "uiux"], { cwd: wt(a, "lead") });
  const uiWaits = hook(wt(a, "uiux"));
  check("session-start: UI/UX waits until setup is done", uiWaits.includes("setup is not done") && uiWaits.includes("Tiny Todo - Lead") && !uiWaits.includes("Your role's skills"));
  const uiProject = JSON.parse(read(wt(a, "uiux"), ".claude", "project.json"));
  fs.writeFileSync(path.join(wt(a, "uiux"), ".claude", "project.json"), JSON.stringify({ ...uiProject, setup: true }));
  check("session-start: UI/UX works after setup", hook(wt(a, "uiux")).includes("you are the uiux session"));
  const retiredDir = path.join(tmp, "retired-po");
  fs.mkdirSync(path.join(retiredDir, ".claude"), { recursive: true });
  fs.writeFileSync(path.join(retiredDir, ".claude", "role"), "po\n");
  fs.cpSync(path.join(a, ".claude", "hooks"), path.join(retiredDir, ".claude", "hooks"), { recursive: true });
  check("session-start: a retired PO session is told its work goes to the Lead", hook(retiredDir).includes("no longer has a po role") && hook(retiredDir).includes("the Lead"));
  let poRefused = false;
  try {
    node([path.join("scripts", "new-role-worktree.mjs"), "po"], { cwd: wt(a, "lead") });
  } catch (e) {
    poRefused = String(e.stderr).includes("no longer has a po role");
  }
  check("new worktree: a retired role (po) is refused", poRefused && !fs.existsSync(wt(a, "po")));
  check("retired roles: dev1, dev2 and devops are refused and told where their work goes", ["dev1", "dev2", "devops"].every((r) => spawnSync("node", [path.join("scripts", "new-role-worktree.mjs"), r], { cwd: wt(a, "lead"), encoding: "utf8" }).stderr.includes(`no longer has a ${r} role`)));
  check("estimates in AI time", read(a, "CLAUDE.md").includes("Estimates are in AI time") && read(a, ".github", "ISSUE_TEMPLATE", "task.yml").includes("AI working time") && read(a, "docs", "templates", "milestone.md").includes("never in human developer days"));
  check("setup sets ownership", read(a, ".claude", "roles", "lead.md").includes(".claude/ownership.json") && read(a, ".claude", "commands", "cb-setup.md").includes(".claude/ownership.json"));
  const crew = (...args) => node([path.join("scripts", "crew-settings.mjs"), ...args], { cwd: wt(a, "lead") });
  check("/cb-auto: relay on, merge all, escalate on by default", crew("status").includes("messages: on") && crew("status").includes("auto-merge: all") && crew("status").includes("escalate: on") && crew("handoff").includes("tips: hide"));
  crew("merge", "up-to-L1");
  check("/cb-auto merge up-to-L1: L0 and L1 by the Lead, L2 and L3 wait; shared by every checkout", ["L0", "L1"].every((l) => crew("merge-ok", l).trim() === "yes") && ["L2", "L3"].every((l) => crew("merge-ok", l).trim() === "no") && node([path.join("scripts", "crew-settings.mjs"), "merge"], { cwd: a }).includes("auto-merge: up-to-L1") && git(a, "status", "--porcelain") === "");
  crew("merge", "only-L0");
  check("/cb-auto merge only-L0 and off", crew("merge-ok", "L0").trim() === "yes" && crew("merge-ok", "L1").trim() === "no" && crew("merge", "off").includes("every PR waits") && crew("merge-ok", "L0").trim() === "no");
  check("/cb-auto merge: an unknown level is refused, the old on and off still read", spawnSync("node", [path.join("scripts", "crew-settings.mjs"), "merge", "L2"], { cwd: wt(a, "lead"), encoding: "utf8" }).status === 1);
  fs.writeFileSync(path.join(a, ".git", "crewbook-settings.json"), JSON.stringify({ merge: true }));
  check("/cb-auto: merge true from before levels means all", crew("merge").includes("auto-merge: all"));
  crew("off");
  check("/cb-auto off: relay, merge and escalate off at once", ["messages: off", "auto-merge: off", "escalate: off"].every((t) => crew("status").includes(t)));
  crew("relay", "on");
  crew("merge", "all");
  crew("escalate", "on");
  crew("relay", "off");
  check("/cb-auto relay off: blocks without tips (the owner knows /cb-auto)", node([path.join("scripts", "crew-settings.mjs"), "handoff"], { cwd: a }).includes("messages: off") && crew("handoff").includes("tips: hide"));
  fs.writeFileSync(path.join(a, ".git", "crewbook-settings.json"), JSON.stringify({ messages: false }));
  const tips = [1, 2, 3, 4].map(() => crew("handoff"));
  check("hand-off tips: shown three times, then hidden", tips.slice(0, 3).every((x) => x.includes("tips: show")) && tips[3].includes("tips: hide"));
  fs.rmSync(path.join(a, ".git", "crewbook-settings.json"));
  check("auto-merge: standing approval for every level", read(a, "CLAUDE.md").includes("standing approval") && read(a, ".claude", "roles", "lead.md").includes("above that level the PR waits for the owner"));
  check("setup: proposals with a default, never round after round", read(a, ".claude", "commands", "cb-setup.md").includes("never ask round after round") && read(a, ".claude", "commands", "cb-setup.md").includes("you decide") && read(a, "START-HERE.md").includes("you decide") && read(a, "CLAUDE.md").includes("at most three questions together") && read(a, "CLAUDE.md").includes("**Plain language.**") && read(a, ".claude", "commands", "cb-setup.md").includes("set_session_title"));
  check("/cb-auto testing: off by default, switchable", crew("testing").includes("per-task testing: off") && crew("testing", "on").includes("on") && crew("status").includes("per-task testing: on") && crew("testing", "off").includes("off"));
  check("two kinds of change, both by the Lead after the plan", read(a, "CLAUDE.md").includes("**Two kinds of change.**") && read(a, "CLAUDE.md").includes("After the plan approval the owner brings both kinds to the Lead.") && read(a, ".claude", "commands", "cb-change.md").includes("**Technical:** write the ADR") && read(a, ".github", "ISSUE_TEMPLATE", "cr.yml").includes("Client approval"));
  check("no PO: the Lead runs setup and writes the handover, Test or the Lead accepts", !fs.existsSync(path.join(a, ".claude", "roles", "po.md")) && read(a, ".claude", "roles", "lead.md").includes("**Setup (`/cb-setup`)**") && read(a, ".claude", "roles", "lead.md").includes("docs/product/handover/vX.Y.Z.md") && read(a, ".claude", "roles", "test.md").includes("Then the acceptance (`Accept v<X.Y.Z> on staging.`)"));
  check("Lead: the owner's one contact, every change, release with no new tests", ["one contact", "**Changes**", "**The release**", "no new tests"].every((t) => read(a, ".claude", "roles", "lead.md").includes(t)));
  check("without Test the Dev does the Test work; data changes have update and rollback scripts", read(a, ".claude", "roles", "dev.md").includes("you also do the Test work") && read(a, "CLAUDE.md").includes("**Data changes.**"));
  check("merging: the owner's standing approval up to a level; reviews once, tied to the commit", read(a, "CLAUDE.md").includes("**Merging** (`/cb-auto merge`: `off`, `only-L0`, `up-to-L1`, `up-to-L2`, `all`") && read(a, "CLAUDE.md").includes("**Reviews and evidence.**") && read(a, "CLAUDE.md").includes("does not run the same reviews again") && !read(a, "scripts", "setup-labels.mjs").includes("claude-review"));
  check("templates: change register and handover; handover folder", fs.existsSync(path.join(a, "docs", "templates", "changes.md")) && fs.existsSync(path.join(a, "docs", "templates", "handover.md")) && fs.existsSync(path.join(a, "docs", "product", "handover")));
  check("release: regression and acceptance on staging, handover", read(a, ".claude", "commands", "cb-release.md").includes("`Accept v<X.Y.Z> on staging.`") && read(a, ".claude", "roles", "lead.md").includes("docs/product/handover/vX.Y.Z.md"));
  check("hand-off rule reads the setting", read(a, "CLAUDE.md").includes("crew-settings.mjs handoff"));
  check("no side sessions for another role's work", read(a, "CLAUDE.md").includes("Never start a side session") && hook(wt(a, "lead")).includes("never start a side session"));
  check("CLAUDE.md: hand-off block, For you, links rules", read(a, "CLAUDE.md").includes("Started #n") && read(a, "CLAUDE.md").includes("`For you` block") && read(a, "CLAUDE.md").includes("prompt stands alone in a code block") && read(a, "CLAUDE.md").includes("**Links:**"));
  check("cb- commands installed, retired ones gone", ["setup", "plan", "build", "release", "change", "progress", "send", "auto", "update", "model", "redo", "bug", "review", "add-role", "env", "deploy", "help"].every((c) => fs.existsSync(path.join(a, ".claude", "commands", `cb-${c}.md`))) && ["cb-next", "cb-gate", "cb-add-dev", "status", "relay"].every((c) => !fs.existsSync(path.join(a, ".claude", "commands", `${c}.md`))));
  check("START-HERE uses the commands", ["`/cb-setup`", "`/cb-help`", "`/cb-release demo`", "`/cb-release`", "`/cb-progress`", "`/cb-add-role", "set-secret.mjs"].every((c) => read(a, "START-HERE.md").includes(c)) && !read(a, "START-HERE.md").includes("/status"));
  check("one START-HERE template, no levels left", fs.existsSync(path.join(a, ".claude", "start-here.md")) && !fs.existsSync(path.join(a, ".claude", "start-here")) && !fs.existsSync(path.join(a, "scripts", "set-level.mjs")) && !/starter|\blite\b|full process/i.test(read(a, "CLAUDE.md") + read(a, "START-HERE.md")));
  check("lite: START-HERE links Actions and image", read(a, "START-HERE.md").includes("your repo's Actions tab") && read(a, "START-HERE.md").includes("ghcr.io/<github-user>/<repo>-app"));

  // 1b. Secrets: set once, hidden, copied to every checkout and to new worktrees
  const secretOut = node([path.join("scripts", "set-secret.mjs"), "DEMO_API_KEY"], { cwd: wt(a, "lead"), input: "s3cret-value\n" });
  check("set-secret: value never printed", !secretOut.includes("s3cret-value") && secretOut.includes("DEMO_API_KEY set"));
  check("set-secret: written to main checkout and worktrees", [a, wt(a, "lead"), wt(a, "uiux")].every((d) => read(d, ".env.local").includes("DEMO_API_KEY=s3cret-value")));
  check("set-secret: git-ignored", git(a, "status", "--porcelain") === "" && git(wt(a, "lead"), "status", "--porcelain") === "");
  fs.writeFileSync(path.join(a, ".env"), "STACK_KEY=from-dot-env\n");
  node([path.join("scripts", "new-role-worktree.mjs"), "dev"], { cwd: wt(a, "lead") });
  check("new worktree: secrets copied, own port", read(wt(a, "dev"), ".env.local").includes("DEMO_API_KEY=s3cret-value") && read(wt(a, "dev"), ".env.local").includes("PORT=5201"));
  check("new worktree: a git-ignored .env is carried too", read(wt(a, "dev"), ".env.local").includes("STACK_KEY=from-dot-env") && git(a, "status", "--porcelain") === "");
  node([path.join("scripts", "new-role-worktree.mjs"), "frontend"], { cwd: wt(a, "lead") });
  check("roles by layer: Frontend gets its own worktree, port and rules; /cb-add-role exists", read(wt(a, "frontend"), ".env.local").includes("PORT=5202") && read(wt(a, "frontend"), ".claude", "role").trim() === "frontend" && read(a, "CLAUDE.md").includes("**Roles by layer.**") && fs.existsSync(path.join(a, ".claude", "roles", "frontend.md")) && !fs.existsSync(path.join(a, ".claude", "roles", "devops.md")) && fs.existsSync(path.join(a, ".claude", "commands", "cb-add-role.md")) && read(a, ".github", "pull_request_template.md").includes("Self-review"));
  // Models per task: the table, the ladder, the task record and the hook's warning; the deepseek mode needs the key,
  // which is never printed; mix is the old name of deepseek.
  const model = (...m) => spawnSync("node", [path.join("scripts", "model.mjs"), ...m], { cwd: wt(a, "lead"), encoding: "utf8" });
  const localSettings = (role) => { try { return JSON.parse(fs.readFileSync(path.join(wt(a, role), ".claude", "settings.local.json"), "utf8")); } catch { return {}; } };
  const pickOf = (...x) => model("pick", ...x).stdout.trim().split(" (")[0];
  check("models: the starting table", pickOf("L0", "3", "--files", "2") === "haiku low" && pickOf("L0", "3", "--files", "9") === "sonnet low" && pickOf("L1", "2") === "sonnet medium" && pickOf("L1", "3") === "haiku medium" && pickOf("L2", "3") === "sonnet high" && pickOf("L3", "3") === "sonnet high" && pickOf("L3", "1") === "opus high" && pickOf("analysis") === "opus medium" && pickOf("review", "0", "--level", "L3") === "opus medium" && pickOf("coordination") === "sonnet low");
  const rec = model("task", "dev", "#12", "haiku", "low");
  const up1 = model("up", "dev", "same wrong fix twice");
  const up2 = model("up", "dev");
  const task = JSON.parse(read(wt(a, "dev"), ".claude", "task.json"));
  check("models: a task is recorded and moves up one step at a time, with its reason", rec.status === 0 && rec.stdout.includes("claude-haiku-5-5") && up1.stdout.includes("haiku low → sonnet medium") && up2.stdout.includes("sonnet medium → sonnet high") && task.model === "sonnet" && task.effort === "high" && task.steps[0].why === "same wrong fix twice" && git(wt(a, "dev"), "status", "--porcelain") === "");
  model("task", "dev", "#12", "opus", "high");
  const top = model("up", "dev");
  check("models: the top of the ladder says split, Opus asks the owner", top.status === 1 && top.stderr.includes("top of the ladder") && model("task", "dev", "#12", "sonnet", "high").status === 0 && model("up", "dev").stdout.includes("the owner's OK first"));
  const devHook = (m) => {
    const out = execFileSync("node", [path.join(wt(a, "dev"), ".claude", "hooks", "session-start.cjs")], { input: JSON.stringify({ model: m }), env: { ...process.env, CLAUDE_PROJECT_DIR: wt(a, "dev") } }).toString();
    return out ? JSON.parse(out).hookSpecificOutput.additionalContext : "";
  };
  fs.writeFileSync(path.join(wt(a, "dev"), ".claude", "project.json"), JSON.stringify({ ...JSON.parse(read(wt(a, "dev"), ".claude", "project.json")), setup: true }));
  check("models: the session-start hook warns when the session runs another model than its task", devHook("claude-opus-5-5").includes("Warning: this session runs claude-opus-5-5, but task #12 is set for opus medium") === false && devHook("claude-sonnet-5-5").includes("Warning: this session runs claude-sonnet-5-5, but task #12 is set for opus medium") && devHook("claude-opus-5-5").includes("Task #12 is set for opus medium"));
  git(wt(a, "dev"), "checkout", "--", ".claude/project.json");
  const dsNoKey = model("mode", "deepseek");
  const claudeMode = model("mode", "claude");
  check("models: deepseek refused without the key; claude is the default and needs none", dsNoKey.status === 1 && dsNoKey.stderr.includes("set-secret.mjs DEEPSEEK_API_KEY") && claudeMode.status === 0 && JSON.parse(read(wt(a, "lead"), ".claude", "project.json")).models === "claude");
  const keyOut = node([path.join("scripts", "set-secret.mjs"), "DEEPSEEK_API_KEY"], { cwd: wt(a, "lead"), input: "ds-test-value-123\n" });
  const mixMode = model("mode", "mix");
  check("models: mix is now deepseek: the Dev, Frontend and Test on DeepSeek, the Lead and UI/UX on Claude; the key never printed", mixMode.status === 0 && JSON.parse(read(wt(a, "lead"), ".claude", "project.json")).models === "deepseek" && localSettings("dev").env.ANTHROPIC_BASE_URL === "https://api.deepseek.com/anthropic" && localSettings("dev").env.ANTHROPIC_AUTH_TOKEN === "ds-test-value-123" && localSettings("frontend").env.ANTHROPIC_MODEL === "deepseek-flash[1m]" && !localSettings("uiux").env && !("model" in localSettings("dev")) && mixMode.stdout.includes("client's OK") && ![keyOut, mixMode.stdout, model().stdout].some((o) => o.includes("ds-test-value-123")));
  const toClaude = model("provider", "dev", "claude");
  check("models: one task moved to Claude, the table shows it", toClaude.status === 0 && !localSettings("dev").env && /Dev\s+Claude/.test(model().stdout) && model().stdout.includes("provider changed") && toClaude.stdout.includes("start that session again"));
  model("mode", "claude");
  git(wt(a, "lead"), "checkout", "--", ".claude/project.json");
  // ci-local: the default steps pass on dev (no app/ yet); a failing step on a branch makes it FAIL with exit 1.
  const ciPass = spawnSync("node", [path.join("scripts", "ci-local.mjs"), "dev", "--no-fetch"], { cwd: wt(a, "lead"), encoding: "utf8" });
  fs.writeFileSync(path.join(wt(a, "frontend"), "scripts", "ci-steps.json"), JSON.stringify({ steps: [{ name: "Unit tests", run: "node -e \"process.exit(3)\"" }] }));
  git(wt(a, "frontend"), "add", "scripts/ci-steps.json");
  git(wt(a, "frontend"), "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", "test: failing step");
  const ciFail = spawnSync("node", [path.join("scripts", "ci-local.mjs"), "role/frontend", "--no-fetch"], { cwd: wt(a, "lead"), encoding: "utf8" });
  check("ci-local: PASS on dev, FAIL with exit 1 on a failing step", ciPass.status === 0 && ciPass.stdout.includes("ci-local dev") && ciPass.stdout.includes(": PASS") && ciFail.status === 1 && ciFail.stdout.includes("FAIL Unit tests") && git(a, "worktree", "list").split("\n").length === git(wt(a, "lead"), "worktree", "list").split("\n").length);
  // ci-local in a small repo: a step runs only when the branch changed its paths, a PASS is reused for the same
  // pair of commits, and a stale lock is cleared.
  const cr = path.join(tmp, "ci-repo");
  fs.mkdirSync(path.join(cr, "scripts"), { recursive: true });
  fs.copyFileSync(path.join(kit, "scripts", "ci-local.mjs"), path.join(cr, "scripts", "ci-local.mjs"));
  fs.writeFileSync(path.join(cr, "scripts", "ci-steps.json"), JSON.stringify({ steps: [{ name: "Bundle", changed: ["web/**"], run: "node -e \"process.exit(3)\"" }, { name: "Unit", changed: ["src/**"], run: "node -e \"0\"" }, { name: "Files", run: "node -e \"const f=process.env.CI_CHANGED_FILES;process.exit(f&&require('fs').readFileSync(f,'utf8').split('\\n').includes('src/a.txt')?0:4)\"" }] }));
  const cg = (...a) => git(cr, "-c", "user.name=t", "-c", "user.email=t@t", ...a);
  cg("init", "-q", "-b", "dev");
  cg("add", ".");
  cg("commit", "-q", "-m", "steps");
  cg("checkout", "-q", "-b", "feature");
  fs.mkdirSync(path.join(cr, "src"));
  fs.writeFileSync(path.join(cr, "src", "a.txt"), "a\n");
  cg("add", ".");
  cg("commit", "-q", "-m", "src change");
  const lockFile = path.join(cr, ".git", "ci-local.lock");
  fs.writeFileSync(lockFile, "1 old\n");
  fs.utimesSync(lockFile, new Date(Date.now() - 2 * 3600 * 1000), new Date(Date.now() - 2 * 3600 * 1000));
  const ciRun = () => spawnSync("node", [path.join("scripts", "ci-local.mjs"), "feature", "--no-fetch"], { cwd: cr, encoding: "utf8" });
  const ciFirst = ciRun();
  const ciSecond = ciRun();
  check("ci-local: changed-only step skipped, total time, stale lock cleared", ciFirst.status === 0 && ciFirst.stdout.includes("SKIP (no change) Bundle") && ciFirst.stdout.includes("PASS Unit") && /: PASS in \d+ s/.test(ciFirst.stdout) && !fs.existsSync(lockFile));
  const ciFull = spawnSync("node", [path.join("scripts", "ci-local.mjs"), "feature", "--no-fetch", "--full"], { cwd: cr, encoding: "utf8" });
  check("ci-local: CI_CHANGED_FILES lists the changed files; --full runs every step and is kept apart from the usual PASS", ciFirst.stdout.includes("PASS Files") && ciFull.stdout.includes("FAIL Bundle") && ciFull.stdout.includes("ci-local feature --full") && ciFull.status === 1);
  check("ci-local: a PASS for the same branch and dev is reused", ciSecond.status === 0 && ciSecond.stdout.includes("(reused: passed") && !ciSecond.stdout.includes("- Unit"));
  // A shared input (a lockfile here) runs every step, the changed-only ones too.
  cg("checkout", "-q", "-b", "lockfile", "dev");
  fs.writeFileSync(path.join(cr, "package-lock.json"), "{}\n");
  cg("add", ".");
  cg("commit", "-q", "-m", "lockfile");
  const ciShared = spawnSync("node", [path.join("scripts", "ci-local.mjs"), "lockfile", "--no-fetch"], { cwd: cr, encoding: "utf8" });
  check("ci-local: a change to a shared input runs every step", ciShared.status === 1 && ciShared.stdout.includes("package-lock.json is a shared input") && ciShared.stdout.includes("FAIL Bundle"));
  cg("checkout", "-q", "feature");
  // run.mjs builds an image once per source tree: a tag of the same files is tagged, never built again; dev is no source.
  const { sameTreeTag } = await import(pathToFileURL(path.join(kit, "scripts", "project-level.mjs")).href);
  check("run.mjs: an image of the same files is reused (staging for the release tag), dev never is", sameTreeTag({ staging: "t1" }, "v0.1.0", "t1") === "staging" && sameTreeTag({ staging: "t1" }, "v0.1.0", "t2") === null && sameTreeTag({ dev: "t1" }, "staging", "t1") === null && sameTreeTag({ staging: "t1" }, "staging", "t1") === null);
  check("faster CI: the full run, one image per tree and the Dockerfile order", read(a, ".claude", "roles", "lead.md").includes("dependency files before the source") && read(a, ".claude", "roles", "dev.md").includes("ci-local.mjs staging --full") && read(a, "CLAUDE.md").includes("ci-local.mjs staging --full") && read(a, ".claude", "commands", "cb-release.md").includes("ci-local.mjs staging --full") && read(a, "docker", "app.Dockerfile").includes("dependency files first"));
  // /cb-review: the script runs the Codex plugin's companion in a throw-away worktree at the branch head; a missing
  // plugin or a failed run is reported, never a pass. A fake plugin stands in for Codex.
  fs.copyFileSync(path.join(kit, "scripts", "codex-review.mjs"), path.join(cr, "scripts", "codex-review.mjs"));
  const fakeCodex = path.join(tmp, "fake-codex");
  fs.mkdirSync(path.join(fakeCodex, "scripts"), { recursive: true });
  fs.writeFileSync(path.join(fakeCodex, "scripts", "codex-companion.mjs"), [
    'import fs from "node:fs";',
    'import { execFileSync } from "node:child_process";',
    'fs.writeFileSync(process.env.FAKE_OUT, JSON.stringify({ args: process.argv.slice(2), cwd: process.cwd(), head: execFileSync("git", ["rev-parse", "HEAD"]).toString().trim() }));',
    'console.log("FAKE CODEX FINDINGS");',
    'process.exit(Number(process.env.FAKE_EXIT || 0));',
  ].join("\n"));
  const out = path.join(tmp, "fake-out.json");
  const review = (env, ...a) => spawnSync("node", [path.join("scripts", "codex-review.mjs"), ...a, "--no-fetch"], { cwd: cr, encoding: "utf8", env: { ...process.env, ...env } });
  const worktreesBefore = git(cr, "worktree", "list").split("\n").length;
  const adv = review({ CODEX_PLUGIN_ROOT: fakeCodex, FAKE_OUT: out }, "feature", "adversarial", "the", "payment", "flow");
  const seen = JSON.parse(fs.readFileSync(out, "utf8"));
  const std = review({ CODEX_PLUGIN_ROOT: fakeCodex, FAKE_OUT: out }, "feature", "standard");
  const seenStdArgs = JSON.parse(fs.readFileSync(out, "utf8")).args;
  const both = review({ CODEX_PLUGIN_ROOT: fakeCodex, FAKE_OUT: out }, "feature");
  const seenBoth = JSON.parse(fs.readFileSync(out, "utf8"));
  const failed = review({ CODEX_PLUGIN_ROOT: fakeCodex, FAKE_OUT: out, FAKE_EXIT: "2" }, "feature");
  const none = review({ CODEX_PLUGIN_ROOT: "", HOME: path.join(tmp, "no-home"), USERPROFILE: path.join(tmp, "no-home") }, "feature");
  check("codex-review: adversarial runs the plugin on the branch against dev with the focus, in a worktree at the head", adv.status === 0 && adv.stdout.includes("FAKE CODEX FINDINGS") && ["adversarial-review", "--wait", "--base", "dev", "--scope", "branch", "the payment flow"].every((x) => seen.args.includes(x)) && seen.head === git(cr, "rev-parse", "feature") && path.resolve(seen.cwd) !== path.resolve(cr));
  check("codex-review: standard is the review alone; the default adds a security pass; the worktree is removed afterwards", std.status === 0 && seenStdArgs[0] === "review" && both.status === 0 && (both.stdout.match(/FAKE CODEX FINDINGS/g) || []).length === 2 && both.stdout.includes("adversarial review (security)") && seenBoth.args[0] === "adversarial-review" && seenBoth.args.some((x) => x.startsWith("security:")) && git(cr, "worktree", "list").split("\n").length === worktreesBefore);
  const offHome = path.join(tmp, "codex-off-home");
  fs.mkdirSync(path.join(offHome, ".claude", "plugins", "cache", "openai-codex", "codex", "1.0.0"), { recursive: true });
  fs.cpSync(path.join(fakeCodex, "scripts"), path.join(offHome, ".claude", "plugins", "cache", "openai-codex", "codex", "1.0.0", "scripts"), { recursive: true });
  fs.writeFileSync(path.join(offHome, ".claude", "settings.json"), JSON.stringify({ enabledPlugins: { "codex@openai-codex": false } }));
  const off = review({ CODEX_PLUGIN_ROOT: "", HOME: offHome, USERPROFILE: offHome, FAKE_OUT: out }, "feature");
  check("codex-review: installed but not enabled stops with how to turn it on", off.status === 3 && off.stderr.includes("/plugin enable codex@openai-codex") && !off.stdout.includes("FAKE CODEX"));
  check("codex-review: a failed run is not a pass and has no fallback; a missing plugin says how to install it", failed.status === 2 && failed.stderr.includes("not a pass") && none.status === 3 && none.stderr.includes("/plugin install codex@openai-codex") && !none.stdout.includes("FAKE CODEX"));
  check("codex-review: /cb-review is a second opinion, never by itself, labels the PR, never a pass when it cannot run", ["second opinion", "never by itself", "codex-review", "never a pass", "not enabled"].every((t) => read(a, ".claude", "commands", "cb-review.md").includes(t)) && read(a, ".claude", "roles", "lead.md").includes("propose `/cb-review`"));
  check("levels: the API rule, the reach of L3, difficulty signals, grouping", ["any change to the API contract", "**Reach of an L3 task**", "**Difficulty signals**", "**Grouping:**", "whatever its level"].every((t) => read(a, "CLAUDE.md").includes(t)));
  check("task form: approach, tests, reach, signals and model; PR names the commit reviewed", ["id: reach", "id: signals", "id: model", "id: tests", "pattern to copy"].every((t) => read(a, ".github", "ISSUE_TEMPLATE", "task.yml").includes(t)) && read(a, ".github", "pull_request_template.md").includes("Self-review on commit") && read(a, ".github", "pull_request_template.md").includes("branch `<sha>` + dev `<sha>`"));
  check("/cb-plan splits the milestone; /cb-build only builds; stuck names its cause", fs.existsSync(path.join(a, ".claude", "commands", "cb-plan.md")) && !read(a, ".claude", "commands", "cb-build.md").includes("[milestone]") && read(a, ".claude", "commands", "cb-build.md").includes("is stuck: <cause>") && read(a, "CLAUDE.md").includes("Stuck: <cause>"));
  check("models: the rule, /cb-model through the Lead, /cb-redo keeps the first result", read(a, "CLAUDE.md").includes("**Models** per task, not per role") && read(a, "CLAUDE.md").includes("**The ladder**") && read(a, ".claude", "commands", "cb-model.md").includes("cannot change its own model") && read(a, ".claude", "commands", "cb-redo.md").includes("Keep the first result") && read(a, ".gitignore").includes(".claude/task.json"));
  check("defects: /cb-bug files a Defect with Caused by and its own level", read(a, ".claude", "commands", "cb-bug.md").includes("Caused by") && read(a, ".github", "ISSUE_TEMPLATE", "defect.yml").includes("id: caused") && read(a, ".github", "ISSUE_TEMPLATE", "defect.yml").includes("not copied from the task"));
  // Environments: the machine's hosts (a temporary CREWBOOK_HOME), shared services, the build host, images, deploys.
  const crewHome = path.join(tmp, "crewbook-home");
  const envRun = (script, ...x) => spawnSync("node", [path.join("scripts", script), ...x], { cwd: wt(a, "lead"), encoding: "utf8", env: { ...process.env, CREWBOOK_HOME: crewHome, CREWBOOK_SSH_DRY: "1" } });
  envRun("hosts.mjs", "set", "registry", "192.168.1.10:5000");
  envRun("hosts.mjs", "set", "staging", "ssh:deploy@192.168.1.20", "/srv/tiny-todo", "http://192.168.1.20:3000");
  const shown = envRun("hosts.mjs").stdout;
  const sharedUp = envRun("hosts.mjs", "shared", "up", "sqlserver-2022", "postgres-17", "--dry-run").stdout;
  check("hosts: set once for every project, shared services by profile, no password in hosts.json", shown.includes("192.168.1.10:5000") && shown.includes("deploy@192.168.1.20") && sharedUp.includes("--profile sqlserver-2022 --profile postgres-17") && sharedUp.includes("up -d --wait") && !/password/i.test(fs.readFileSync(path.join(crewHome, "hosts.json"), "utf8")) && fs.existsSync(path.join(a, "docker", "shared-compose.yml")));
  const leadProject = path.join(wt(a, "lead"), ".claude", "project.json");
  const leadProjectText = fs.readFileSync(leadProject, "utf8");
  fs.writeFileSync(leadProject, JSON.stringify({ ...JSON.parse(leadProjectText), buildHost: "ssh:ci@192.168.1.10", images: [{ name: "api", paths: ["api"] }, { name: "web", paths: ["web"] }] }, null, 2));
  const ciRemote = envRun("ci-local.mjs", "role/dev");
  const runRemote = envRun("run.mjs", "dev", "--build-only");
  check("build host: ci-local and builds run there over SSH with --here", ciRemote.stdout.includes("ssh ci@192.168.1.10") && ciRemote.stdout.includes("node scripts/ci-local.mjs 'role/dev' --here") && runRemote.stdout.includes("node scripts/run.mjs 'dev' '--build-only' --here"));
  const runImages = envRun("run.mjs", "dev", "--here", "--dry-run").stdout;
  check("images: one per layer, dev builds only the changed ones as :dev and :dev-<sha>, pushed to the registry", runImages.includes("build api, web from dev") && runImages.includes(":dev-<sha>") && runImages.includes("push api:dev to 192.168.1.10:5000") && runImages.includes("docker compose up -d --no-build --wait --wait-timeout 120 api web"));
  fs.writeFileSync(leadProject, leadProjectText);
  const deployStaging = envRun("deploy.mjs", "staging", "v0.1.0", "--dry-run");
  const deployProd = envRun("deploy.mjs", "production", "v0.1.0", "--dry-run");
  check("deploy: staging pulls the tag on its server; production only with --owner", deployStaging.status === 0 && deployStaging.stdout.includes("ssh deploy@192.168.1.20") && deployStaging.stdout.includes("IMAGE_TAG=v0.1.0 REGISTRY=192.168.1.10:5000 docker compose pull app") && deployProd.status === 1 && deployProd.stderr.includes("by the owner only"));
  check("environments: the rule, /cb-env, /cb-deploy and the template", read(a, "CLAUDE.md").includes("**Environments.**") && read(a, "CLAUDE.md").includes("Real data never reaches a model") && read(a, "docker-compose.yml").includes("${REGISTRY:-ghcr.io/") && ["cb-env.md", "cb-deploy.md"].every((c) => fs.existsSync(path.join(a, ".claude", "commands", c))) && fs.existsSync(path.join(a, "docs", "templates", "environments.md")) && read(a, ".claude", "settings.json").includes("|Read"));
  // Measures: transcripts in a temporary projects folder; each message once, the owner's own messages counted.
  const projectsDir = path.join(tmp, "claude-projects");
  const leadDir = path.join(projectsDir, path.resolve(wt(a, "lead")).replace(/[^a-zA-Z0-9]/g, "-"));
  fs.mkdirSync(leadDir, { recursive: true });
  const now = new Date().toISOString();
  const usageLine = (id, model, out) => JSON.stringify({ type: "assistant", timestamp: now, message: { id, model, usage: { input_tokens: 1000, output_tokens: out, cache_read_input_tokens: 10000, cache_creation_input_tokens: 0 } } });
  fs.writeFileSync(path.join(leadDir, "s1.jsonl"), [
    usageLine("m1", "claude-opus-5-5", 500),
    usageLine("m1", "claude-opus-5-5", 500),
    usageLine("m2", "claude-sonnet-5-5", 100),
    JSON.stringify({ type: "user", timestamp: now, message: { role: "user", content: "Make the list sortable." } }),
    JSON.stringify({ type: "user", timestamp: now, message: { role: "user", content: [{ type: "tool_result", content: "ok" }] } }),
    JSON.stringify({ type: "user", timestamp: now, message: { role: "user", content: "<command-name>/cb-progress</command-name>" } }),
  ].join("\n") + "\n");
  const measured = spawnSync("node", [path.join("scripts", "usage.mjs"), "--days", "1", "--no-github", "--json"], { cwd: wt(a, "lead"), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECTS_DIR: projectsDir } });
  const m = JSON.parse(measured.stdout);
  check("measures: each message once, per role and model, the owner's own messages", measured.status === 0 && m.total.calls === 2 && m.byRole["lead|opus"].calls === 1 && m.byRole["lead|sonnet"].calls === 1 && m.owner.lead === 1 && m.total.usd > 0);
  check("measures: the rule, /cb-progress report runs them, moves up are written on the issue", read(a, "CLAUDE.md").includes("**Measuring.**") && read(a, ".claude", "commands", "cb-progress.md").includes("node scripts/usage.mjs --days 7") && read(a, ".claude", "commands", "cb-model.md").includes("Model: <from> → <to>"));
  check("Test writes the test cases early", read(a, ".claude", "roles", "test.md").includes("**Test cases first**") && read(a, ".claude", "commands", "cb-add-role.md").includes("`Write the test cases for v<X.Y.Z>.`") && read(a, ".claude", "commands", "cb-plan.md").includes("`Write the test cases for v<X.Y.Z>.`"));
  let badName = false;
  try {
    node([path.join("scripts", "set-secret.mjs"), "lower-case"], { cwd: wt(a, "lead"), input: "x\n" });
  } catch {
    badName = true;
  }
  check("set-secret: bad name refused", badName);

  // 2. Through the questions (name, folder, confirm); GitHub none keeps them the same with or without gh.
  const b = path.join(tmp, "my-shop");
  node([path.join(kit, "init.mjs"), "--github", "none"], { cwd: tmp, input: "My Shop\n\nyes\n", env: { ...process.env, PLAYBOOK_INIT_INTERACTIVE: "1" } });
  check("questions: folder from the suggested name", fs.existsSync(path.join(b, "CLAUDE.md")));
  check("questions: roles left to setup, staging too", JSON.parse(read(b, ".claude", "project.json")).roles === null && branches(b).includes("staging"));

  // 3. Answering "no" changes nothing
  node([path.join(kit, "init.mjs"), "--github", "none"], { cwd: tmp, input: "Nope\n\nno\n", env: { ...process.env, PLAYBOOK_INIT_INTERACTIVE: "1" } });
  check("no: nothing created", !fs.existsSync(path.join(tmp, "nope")));

  // 4. With flags: the name from the folder; a language
  const c = path.join(tmp, "big-one");
  node([path.join(kit, "init.mjs"), c, "--yes"]);
  check("flags: name from folder, staging, only the Lead's worktree", /^# big-one$/m.test(read(c, "CLAUDE.md")) && branches(c).includes("staging") && fs.existsSync(wt(c, "lead")) && !fs.existsSync(wt(c, "dev")));
  const d = path.join(tmp, "shop-vn");
  node([path.join(kit, "init.mjs"), d, "--language", "Vietnamese", "--docs-language", "Vietnamese", "--yes"]);
  check("language: written to CLAUDE.md, covering recaps and buttons", read(d, "CLAUDE.md").includes("talk to the owner in Vietnamese; write documents in Vietnamese.") && read(d, "CLAUDE.md").includes("end-of-turn recap") && read(d, "CLAUDE.md").includes("on what it does"));
  check("language: session-start names it", hook(wt(d, "lead")).includes("Talk to the owner in Vietnamese") && hook(wt(d, "lead")).includes("button labels"));

  // 5. roles.mjs in the Lead's worktree: set at setup, worktrees, add later; unknown and retired roles refused
  const lead = wt(c, "lead");
  const roles = (...r) => spawnSync("node", [path.join("scripts", "roles.mjs"), ...r], { cwd: lead, encoding: "utf8" });
  const show = roles();
  check("roles: the table explains each role", ["Lead", "Dev", "UI/UX", "Frontend", "Test"].every((t) => show.stdout.includes(t)) && show.stdout.includes("Worth it when") && show.stdout.includes("not chosen yet"));
  const noneSet = roles("set", "none");
  check("roles: none keeps the Lead and the Dev, says who takes the rest", noneSet.status === 0 && JSON.stringify(JSON.parse(read(lead, ".claude", "project.json")).roles) === '["lead","dev"]' && /^- Roles: Lead, Dev\./m.test(read(lead, "CLAUDE.md")) && read(lead, "START-HERE.md").includes("Roles: Lead, Dev") && noneSet.stdout.includes("The Lead designs") && noneSet.stdout.includes("The Dev builds both layers"));
  check("roles: an unknown role is refused", roles("set", "uiux,devops").status === 1);
  const made = roles("worktrees", "--json");
  check("roles: worktrees for the chosen roles, as JSON", made.status === 0 && JSON.parse(made.stdout).map((w) => w.role).join() === "lead,dev" && fs.existsSync(wt(c, "dev")));
  const added = roles("add", "frontend");
  check("roles: add one later, its worktree and port", added.status === 0 && JSON.parse(read(lead, ".claude", "project.json")).roles.includes("frontend") && read(wt(c, "frontend"), ".env.local").includes("PORT=5202") && added.stdout.includes("ownership.json"));
  check("roles: a retired role or one already there is refused", roles("add", "dev2").stderr.includes("no longer has a dev2 role") && roles("add", "frontend").status === 1);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
