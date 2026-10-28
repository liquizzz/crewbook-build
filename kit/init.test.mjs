#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// Tests init.mjs (with flags and with answers to its questions) and scripts/set-level.mjs on temporary folders.
// Run:  node kit/init.test.mjs      (needs git, Docker and Docker Compose, like init itself; never touches GitHub)
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
  node([path.join(kit, "init.mjs"), a, "--name", "Tiny Todo", "--level", "lite", "--description", "A one-page todo list.", "--yes"]);
  check("lite: branches main, dev and staging", branches(a) === "dev,main,role/lead,staging");
  check("lite: only the Lead's worktree before setup", fs.existsSync(wt(a, "lead")) && !fs.existsSync(wt(a, "po")) && !fs.existsSync(wt(a, "dev1")));
  check("lite: role file in worktree", read(wt(a, "lead"), ".claude", "role").trim() === "lead");
  check("lite: project.json records the kit version", /^[0-9a-f]{40}$/.test(JSON.parse(read(a, ".claude", "project.json")).kitVersion || ""));
  check("lite: /kit-update for the Lead, asked before", fs.existsSync(path.join(a, ".claude", "commands", "kit-update.md")) && read(a, "CLAUDE.md").includes("kit updates (`/kit-update`)") && read(a, ".claude", "roles", "lead.md").includes("/kit-update"));
  check("lite: project.json with setup false", JSON.parse(read(a, ".claude", "project.json")).level === "lite" && JSON.parse(read(a, ".claude", "project.json")).setup === false);
  check("lite: CLAUDE.md name, description, level", /^# Tiny Todo$/m.test(read(a, "CLAUDE.md")) && read(a, "CLAUDE.md").includes("A one-page todo list.") && /^- Level: Lite /m.test(read(a, "CLAUDE.md")) && read(a, "CLAUDE.md").includes("set-level.mjs <lite|full>"));
  check("lite: START-HERE.md filled in", read(a, "START-HERE.md").includes("# Start here: Tiny Todo") && read(a, "START-HERE.md").includes(wt(a, "lead")) && !/\{\{\w+\}\}/.test(read(a, "START-HERE.md")));
  check("lite: START-HERE.md committed", git(a, "ls-files", "START-HERE.md") === "START-HERE.md" && git(a, "status", "--porcelain") === "");
  check("lite: compose project name", read(a, "docker-compose.yml").includes("name: tiny-todo"));
  check("lite: no design pipeline by default", !read(a, "docker-compose.yml").includes("design:") && !fs.existsSync(path.join(a, ".github", "workflows", "image-design.yml")) && !fs.existsSync(path.join(a, "docker", "design.Dockerfile")));
  check("lite: English by default", read(a, "CLAUDE.md").includes("- Language: talk to the owner in English; write documents in English."));
  check("lite: core plugins declared, no github MCP or product-management", read(a, ".claude", "settings.json").includes("superpowers@claude-plugins-official") && !read(a, ".claude", "settings.json").includes("github@claude-plugins-official") && !read(a, ".claude", "settings.json").includes("product-management@"));
  check("lite: security checks installed", fs.existsSync(path.join(a, ".github", "dependabot.yml")) && read(a, ".github", "workflows", "codeql.yml").includes("vars.CODEQL_LANGUAGES") && read(a, ".github", "workflows", "image-app.yml").includes("attest-build-provenance"));
  check("lite: NFR rows follow ISO 25010", read(a, "docs", "templates", "srs.md").includes("ISO/IEC 25010") && read(a, "docs", "templates", "srs.md").includes("### 2.4 Constraints"));
  check("lite: plain documents by default, no humanizer plugin", read(a, "CLAUDE.md").includes("- Documents: plain") && !read(a, ".claude", "settings.json").includes("humanizer@humanizer") && JSON.parse(read(a, ".claude", "project.json")).humanize === false);
  check("lite: design plugins left to G3", !read(a, ".claude", "settings.json").includes("ui-ux-pro-max@ui-ux-pro-max-skill\": true") && read(a, "CLAUDE.md").includes("at G3 when the product has screens") && read(a, ".claude", "commands", "next.md").includes("ui-ux-pro-max@ui-ux-pro-max-skill"));
  check("see it first: screen sketches at G1-G2, one solution design at G3", read(a, "CLAUDE.md").includes("See it first, then build it") && read(a, "START-HERE.md").includes("docs/product/screens/") && read(a, "START-HERE.md").includes("design/look-and-feel.html") && read(a, ".claude", "commands", "next.md").includes("Two ways to start") && read(a, ".claude", "commands", "next.md").includes("docs/tech/solution-design.md") && fs.existsSync(path.join(a, "docs", "templates", "solution-design.md")) && fs.existsSync(path.join(a, "docs", "product", "screens")));
  check("setup: no stack question, opens gate issues and team folders", !read(a, ".claude", "commands", "setup.md").includes("stack in mind") && read(a, ".claude", "commands", "setup.md").includes("label") && read(a, ".claude", "commands", "setup.md").includes("new-role-worktree.mjs po"));
  check("reports: on /progress report only, no daily brief", read(a, ".claude", "commands", "progress.md").includes("docs/reports/<YYYY-MM-DD>.md") && !/morning brief|end-of-day/i.test(read(a, ".claude", "roles", "po.md") + read(a, ".claude", "roles", "lead.md") + read(a, "CLAUDE.md") + read(a, "START-HERE.md")));
  // A repo that is not public runs CI on this machine: run.mjs builds the tag here; in github mode it pulls the image.
  check("ci: local by default without a public repo", JSON.parse(read(a, ".claude", "project.json")).ci === "local" && node([path.join("scripts", "ci-mode.mjs")], { cwd: a }).includes("ci: local"));
  const runLocal = node([path.join("scripts", "run.mjs"), "v0.1.0", "--dry-run"], { cwd: a });
  const projectFile = path.join(a, ".claude", "project.json");
  const projectText = fs.readFileSync(projectFile, "utf8");
  fs.writeFileSync(projectFile, JSON.stringify({ ...JSON.parse(projectText), ci: "github" }, null, 2) + "\n");
  const runDry = node([path.join("scripts", "run.mjs"), "v0.1.0", "--dry-run"], { cwd: a });
  fs.writeFileSync(projectFile, projectText);
  check("run.mjs: one command pulls, waits for the healthcheck and opens the app", runDry.includes("docker compose pull app   (IMAGE_TAG=v0.1.0)") && runDry.includes("--wait") && runDry.includes("http://localhost:3000"));
  check("run.mjs: with CI on this machine it builds the tag here", runLocal.includes("build app from v0.1.0 in a temporary worktree") && !runLocal.includes("docker compose pull app"));
  check("workflows: every job skips when CI_MODE is local; CI only on PRs, no dev image", ["ci.yml", "codeql.yml", "docs-check.yml", "image-app.yml"].every((f) => read(a, ".github", "workflows", f).includes("vars.CI_MODE != 'local'")) && !read(a, ".github", "workflows", "ci.yml").includes("branches: [dev]") && read(a, ".github", "workflows", "image-app.yml").includes("branches: [staging]"));
  check("docker: healthcheck on the app, START-HERE runs run.mjs", read(a, "docker-compose.yml").includes("healthcheck:") && read(a, "START-HERE.md").includes("node scripts/run.mjs v0.1.0") && !read(a, "START-HERE.md").includes("docker login"));
  check("G3: small image and a working healthcheck", read(a, ".claude", "commands", "next.md").includes("Keep the image small") && read(a, ".claude", "commands", "release.md").includes("node scripts/run.mjs staging"));
  const plug = node([path.join("scripts", "plugins.mjs"), "--dry-run"], { cwd: a });
  check("plugins: installed from the enabled list, marketplaces first", plug.includes("claude plugin marketplace add thedotmack/claude-mem") && plug.includes("claude plugin install superpowers@claude-plugins-official --scope user") && plug.indexOf("marketplace add") < plug.indexOf("plugin install"));
  check("plugins: /setup checks them before anything else", read(a, ".claude", "commands", "setup.md").includes("**Plugins first:**") && read(a, ".claude", "commands", "setup.md").includes("node scripts/plugins.mjs"));
  check("links: issue numbers carry a title and CR, never bare", read(a, "CLAUDE.md").includes("An issue or PR number never stands alone") && read(a, "CLAUDE.md").includes("**Next:** [#12") && read(a, ".claude", "commands", "progress.md").includes("as a link with its short title"));
  check("sessions: the Lead opens them on yes and detaches them at once", read(a, "CLAUDE.md").includes("**Opening sessions:**") && read(a, "CLAUDE.md").includes("detach it to top level at once") && read(a, "CLAUDE.md").includes("file it straight back into the group") && read(a, ".claude", "commands", "setup.md").includes("create one named after the project") && read(a, ".claude", "commands", "setup.md").includes("rule \"Opening sessions\"") && read(a, ".claude", "commands", "build.md").includes("rule \"Opening sessions\""));
  check("board: same seven columns at every level", ["Backlog", "Approved", "Ready", "In progress", "In review", "Testing", "Done"].every((c) => read(a, "scripts", "setup-board.mjs").includes(`["${c}",`)) && !read(a, "scripts", "setup-board.mjs").includes("readProject"));
  check("board: review loop, docs PRs and Testing in the roles", read(a, ".claude", "commands", "build.md").includes("Review the fixes for #<n>.") && read(a, ".claude", "roles", "dev.md").includes("back to In review") && read(a, ".claude", "roles", "lead.md").includes("Test #<n> on dev.") && read(a, ".claude", "roles", "test.md").includes("leave #n in Testing") && read(a, "CLAUDE.md").includes("goes on the board itself") && read(a, "scripts", "board-status.mjs").includes("pull_request"));
  check("gate: G1 needs no running app, G3 does", read(a, ".claude", "commands", "gate.md").includes("No app is needed yet") && /G3 Design, stack and SRS approved[^\n]*docker compose up --build/.test(read(a, ".claude", "commands", "gate.md")));
  check("lite: skills table in CLAUDE.md", read(a, "CLAUDE.md").includes("## Skills") && read(a, "CLAUDE.md").includes("superpowers:brainstorming") && read(a, "CLAUDE.md").includes("Try it in the browser"));
  const hook = (dir) => {
    const out = execFileSync("node", [path.join(dir, ".claude", "hooks", "session-start.cjs")], { input: "{}", env: { ...process.env, CLAUDE_PROJECT_DIR: dir } }).toString();
    return out ? JSON.parse(out).hookSpecificOutput.additionalContext : "";
  };
  const leadReminder = hook(wt(a, "lead"));
  check("session-start: lead gets role, skills and recovery", leadReminder.includes("you are the lead session") && leadReminder.includes("superpowers:writing-plans") && leadReminder.includes("AI does the work") && leadReminder.includes("Recovery"));
  check("session-start: main checkout is told to use a worktree", hook(a).includes("has no role"));
  check("session-start: registered in settings", read(a, ".claude", "settings.json").includes("session-start.cjs"));
  // A PO worktree made before setup is told to wait; after setup it works.
  node([path.join("scripts", "new-role-worktree.mjs"), "po"], { cwd: wt(a, "lead") });
  const poWaits = hook(wt(a, "po"));
  check("session-start: PO waits until setup is done", poWaits.includes("setup is not done") && poWaits.includes("Tiny Todo - Lead") && !poWaits.includes("Your role's skills"));
  const poProject = JSON.parse(read(wt(a, "po"), ".claude", "project.json"));
  fs.writeFileSync(path.join(wt(a, "po"), ".claude", "project.json"), JSON.stringify({ ...poProject, setup: true }));
  check("session-start: PO works after setup", hook(wt(a, "po")).includes("you are the po session"));
  check("gate: level-aware with owner block", read(a, ".claude", "commands", "gate.md").includes("**Lite level:**") && read(a, ".claude", "commands", "gate.md").includes("For you") && !read(a, ".claude", "commands", "gate.md").includes("Starter"));
  check("estimates in AI time", read(a, "CLAUDE.md").includes("Estimates are in AI time") && read(a, ".github", "ISSUE_TEMPLATE", "task.yml").includes("AI working time") && read(a, "docs", "templates", "milestone.md").includes("never in human developer days"));
  check("G3 sets ownership and checks outside services live", read(a, ".claude", "commands", "next.md").includes(".claude/ownership.json") && read(a, ".claude", "commands", "next.md").includes("one live call") && read(a, ".claude", "commands", "gate.md").includes("live check of each outside service"));
  const crew = (...args) => node([path.join("scripts", "crew-settings.mjs"), ...args], { cwd: wt(a, "lead") });
  check("/auto: relay and merge start on", crew("status").includes("messages: on") && crew("status").includes("auto-merge: on") && crew("handoff").includes("tips: hide"));
  crew("merge", "off");
  check("/auto merge off: shared by every checkout", node([path.join("scripts", "crew-settings.mjs"), "merge"], { cwd: a }).includes("auto-merge: off") && git(a, "status", "--porcelain") === "");
  crew("merge", "on");
  crew("relay", "off");
  check("/auto relay off: blocks without tips (the owner knows /auto)", node([path.join("scripts", "crew-settings.mjs"), "handoff"], { cwd: a }).includes("messages: off") && crew("handoff").includes("tips: hide"));
  fs.writeFileSync(path.join(a, ".git", "crewbook-settings.json"), JSON.stringify({ messages: false }));
  const tips = [1, 2, 3, 4].map(() => crew("handoff"));
  check("hand-off tips: shown three times, then hidden", tips.slice(0, 3).every((x) => x.includes("tips: show")) && tips[3].includes("tips: hide"));
  fs.rmSync(path.join(a, ".git", "crewbook-settings.json"));
  check("auto-merge: standing approval for every level", read(a, "CLAUDE.md").includes("standing approval") && read(a, ".claude", "roles", "lead.md").includes("while auto-merge is off, every PR waits for the owner"));
  check("foundation: two approvals, the rest written by the AI", read(a, ".claude", "commands", "next.md").includes("do the rest without the owner") && read(a, ".claude", "commands", "gate.md").includes("G1 and G2 together") && read(a, "START-HERE.md").includes("without asking you again") && read(a, "CLAUDE.md").includes("at most three questions together") && read(a, "CLAUDE.md").includes("**Plain language.**") && read(a, ".claude", "commands", "setup.md").includes("asks the owner nothing") && read(a, ".claude", "commands", "setup.md").includes("set_session_title"));
  check("/auto testing: off by default, switchable", crew("testing").includes("per-task testing: off") && crew("testing", "on").includes("on") && crew("status").includes("per-task testing: on") && crew("testing", "off").includes("off"));
  check("two kinds of change, both by the Lead after G2", read(a, "CLAUDE.md").includes("**Two kinds of change.**") && read(a, "CLAUDE.md").includes("After G2 the owner brings both kinds to the Lead.") && read(a, ".claude", "commands", "change.md").includes("**Technical:** write the ADR") && read(a, ".github", "ISSUE_TEMPLATE", "cr.yml").includes("Client approval"));
  check("PO: pictures the project, requirements with the SRS's FRs, acceptance on staging, handover", ["**Picture the project (G1 and G2, one approval):**", "**The requirements (G2):**", "**Acceptance on `staging`**", "**Handover:**"].every((t) => read(a, ".claude", "roles", "po.md").includes(t)));
  check("Lead: the owner's contact from G3, every change, release with no new tests", ["one contact", "**Changes**", "**Release (G6), no new tests:**"].every((t) => read(a, ".claude", "roles", "lead.md").includes(t)));
  check("Lite: Dev1 does the Test work; data changes have update and rollback scripts", read(a, ".claude", "roles", "dev.md").includes("you also do the Test work") && read(a, "CLAUDE.md").includes("**Data changes.**"));
  check("auto-merge: every level after review by level", read(a, "CLAUDE.md").includes("L3 `code-review` and `security-review`) and green CI (rule \"Where CI runs\") without asking") && !read(a, "CLAUDE.md").includes("L3 PRs, and every PR while auto-merge is off, wait"));
  check("templates: change register and handover; handover folder", fs.existsSync(path.join(a, "docs", "templates", "changes.md")) && fs.existsSync(path.join(a, "docs", "templates", "handover.md")) && fs.existsSync(path.join(a, "docs", "product", "handover")));
  check("release: regression and PO acceptance on staging, handover at G5 and G6", read(a, ".claude", "commands", "release.md").includes("`Accept v<X.Y.Z> on staging.`") && read(a, ".claude", "commands", "gate.md").includes("docs/product/handover/vX.Y.Z.md"));
  check("hand-off rule reads the setting", read(a, "CLAUDE.md").includes("crew-settings.mjs handoff"));
  check("no side sessions for another role's work", read(a, "CLAUDE.md").includes("Never start a side session") && hook(wt(a, "lead")).includes("never start a side session"));
  check("CLAUDE.md: hand-off block, For you, links rules", read(a, "CLAUDE.md").includes("Started #n") && read(a, "CLAUDE.md").includes("`For you` block") && read(a, "CLAUDE.md").includes("prompt stands alone in a code block") && read(a, "CLAUDE.md").includes("**Links:**"));
  check("lite: step commands installed, /progress instead of /status, /auto instead of /relay", ["setup", "next", "build", "release", "change", "progress", "gate", "send", "auto"].every((c) => fs.existsSync(path.join(a, ".claude", "commands", `${c}.md`))) && !fs.existsSync(path.join(a, ".claude", "commands", "status.md")) && !fs.existsSync(path.join(a, ".claude", "commands", "relay.md")));
  check("lite: START-HERE uses the commands", ["`/setup`", "`/next`", "`/build try", "`/build done", "`/release`", "`/progress`", "set-secret.mjs"].every((c) => read(a, "START-HERE.md").includes(c)) && !read(a, "START-HERE.md").includes("/status"));
  check("lite: no Starter left in the kit", !fs.existsSync(path.join(a, ".claude", "start-here", "starter.md")) && !fs.existsSync(path.join(a, "docs", "templates", "brief.md")) && !/starter/i.test(read(a, "CLAUDE.md")));
  check("lite: START-HERE links Actions and image", read(a, "START-HERE.md").includes("your repo's Actions tab") && read(a, "START-HERE.md").includes("ghcr.io/<github-user>/<repo>-app"));

  // 1b. Secrets: set once, hidden, copied to every checkout and to new worktrees
  const secretOut = node([path.join("scripts", "set-secret.mjs"), "DEMO_API_KEY"], { cwd: wt(a, "lead"), input: "s3cret-value\n" });
  check("set-secret: value never printed", !secretOut.includes("s3cret-value") && secretOut.includes("DEMO_API_KEY set"));
  check("set-secret: written to main checkout and worktrees", [a, wt(a, "lead"), wt(a, "po")].every((d) => read(d, ".env.local").includes("DEMO_API_KEY=s3cret-value")));
  check("set-secret: git-ignored", git(a, "status", "--porcelain") === "" && git(wt(a, "lead"), "status", "--porcelain") === "");
  fs.writeFileSync(path.join(a, ".env"), "STACK_KEY=from-dot-env\n");
  node([path.join("scripts", "new-role-worktree.mjs"), "dev1"], { cwd: wt(a, "lead") });
  check("new worktree: secrets copied, own port", read(wt(a, "dev1"), ".env.local").includes("DEMO_API_KEY=s3cret-value") && read(wt(a, "dev1"), ".env.local").includes("PORT=5201"));
  check("new worktree: a git-ignored .env is carried too", read(wt(a, "dev1"), ".env.local").includes("STACK_KEY=from-dot-env") && git(a, "status", "--porcelain") === "");
  node([path.join("scripts", "new-role-worktree.mjs"), "dev4"], { cwd: wt(a, "lead") });
  check("several Devs: dev4 gets its own worktree, port and rules", read(wt(a, "dev4"), ".env.local").includes("PORT=5204") && read(wt(a, "dev4"), ".claude", "role").trim() === "dev4" && read(a, "CLAUDE.md").includes("**Several Devs**") && read(a, ".claude", "commands", "build.md").includes("up to four Devs") && read(a, ".github", "pull_request_template.md").includes("Self-review"));
  // ci-local: the default steps pass on dev (no app/ yet); a failing step on a branch makes it FAIL with exit 1.
  const ciPass = spawnSync("node", [path.join("scripts", "ci-local.mjs"), "dev", "--no-fetch"], { cwd: wt(a, "lead"), encoding: "utf8" });
  fs.writeFileSync(path.join(wt(a, "dev4"), "scripts", "ci-steps.json"), JSON.stringify({ steps: [{ name: "Unit tests", run: "node -e \"process.exit(3)\"" }] }));
  git(wt(a, "dev4"), "add", "scripts/ci-steps.json");
  git(wt(a, "dev4"), "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", "test: failing step");
  const ciFail = spawnSync("node", [path.join("scripts", "ci-local.mjs"), "role/dev4", "--no-fetch"], { cwd: wt(a, "lead"), encoding: "utf8" });
  check("ci-local: PASS on dev, FAIL with exit 1 on a failing step", ciPass.status === 0 && ciPass.stdout.includes("ci-local dev") && ciPass.stdout.includes(": PASS") && ciFail.status === 1 && ciFail.stdout.includes("FAIL Unit tests") && git(a, "worktree", "list").split("\n").length === git(wt(a, "lead"), "worktree", "list").split("\n").length);
  check("Full: Test opens after G3 to write test cases", read(a, ".claude", "roles", "test.md").includes("**Test cases first**") && read(a, ".claude", "roles", "lead.md").includes("`Write the test cases for v<X.Y.Z>.`") && read(a, ".claude", "commands", "build.md").includes("`Write the test cases for v<X.Y.Z>.`") && read(a, ".claude", "commands", "gate.md").includes("`docs/tech/test-cases/` covers every requirement"));
  let badName = false;
  try {
    node([path.join("scripts", "set-secret.mjs"), "lower-case"], { cwd: wt(a, "lead"), input: "x\n" });
  } catch {
    badName = true;
  }
  check("set-secret: bad name refused", badName);

  // 2. Lite through the questions (name, folder, level, description, GitHub, confirm)
  const b = path.join(tmp, "my-shop");
  // --github none keeps the questions the same whether or not gh is signed in on this machine.
  node([path.join(kit, "init.mjs"), "--github", "none"], { cwd: tmp, input: "My Shop\n\n1\n\n\n\nA tiny shop.\nyes\n", env: { ...process.env, PLAYBOOK_INIT_INTERACTIVE: "1" } });
  check("questions: folder from the suggested name", fs.existsSync(path.join(b, "CLAUDE.md")));
  check("questions: level 1 is Lite", JSON.parse(read(b, ".claude", "project.json")).level === "lite");
  check("questions: staging at Lite too", branches(b).includes("staging"));

  // 3. Answering "no" changes nothing
  node([path.join(kit, "init.mjs"), "--github", "none"], { cwd: tmp, input: "Nope\n\n\n\n\n\n\nno\n", env: { ...process.env, PLAYBOOK_INIT_INTERACTIVE: "1" } });
  check("no: nothing created", !fs.existsSync(path.join(tmp, "nope")));

  // 4. Full with flags; the removed Starter level maps to Lite
  const c = path.join(tmp, "big-one");
  node([path.join(kit, "init.mjs"), c, "--level", "full", "--yes"]);
  check("full: staging branch", branches(c).includes("staging"));
  check("full: name from folder", /^# big-one$/m.test(read(c, "CLAUDE.md")));
  check("full: only the Lead's worktree before setup", fs.existsSync(wt(c, "lead")) && !fs.existsSync(wt(c, "po")));
  const old = path.join(tmp, "old-habit");
  node([path.join(kit, "init.mjs"), old, "--level", "starter", "--yes"]);
  check("starter flag: becomes Lite", JSON.parse(read(old, ".claude", "project.json")).level === "lite");

  // 4b. Language and design prototype
  const d = path.join(tmp, "shop-vn");
  node([path.join(kit, "init.mjs"), d, "--language", "Vietnamese", "--docs-language", "Vietnamese", "--design", "yes", "--humanize", "yes", "--yes"]);
  check("humanize: plugin and CLAUDE.md line", read(d, ".claude", "settings.json").includes("humanizer@humanizer") && read(d, "CLAUDE.md").includes("- Documents: polished"));
  check("language: written to CLAUDE.md, covering recaps and buttons", read(d, "CLAUDE.md").includes("talk to the owner in Vietnamese; write documents in Vietnamese.") && read(d, "CLAUDE.md").includes("end-of-turn recap") && read(d, "CLAUDE.md").includes("on what it does"));
  check("language: session-start names it", hook(wt(d, "lead")).includes("Talk to the owner in Vietnamese") && hook(wt(d, "lead")).includes("button labels"));
  const vnUp = node([path.join("scripts", "set-level.mjs"), "full"], { cwd: wt(d, "lead") });
  check("language: set-level asks the Lead to rewrite START-HERE", vnUp.includes("rewrite START-HERE.md in Vietnamese"));
  check("design: pipeline kept", read(d, "docker-compose.yml").includes("design:") && fs.existsSync(path.join(d, ".github", "workflows", "image-design.yml")) && fs.existsSync(path.join(d, "docker", "design.Dockerfile")));

  // 5. set-level from the Lite lead worktree: up to full, down to lite; "starter" means lite
  const lead = wt(a, "lead");
  const setLevel = (level) => node([path.join("scripts", "set-level.mjs"), level], { cwd: lead });
  setLevel("full");
  check("up to full: staging created", branches(a).includes("staging"));
  check("up to full: files updated in the worktree", JSON.parse(read(lead, ".claude", "project.json")).level === "full" && /^- Level: Full /m.test(read(lead, "CLAUDE.md")) && read(lead, "START-HERE.md").includes("Level: **Full process**"));
  check("up to full: START-HERE.md points at the main checkout's worktrees", read(lead, "START-HERE.md").includes(wt(a, "po")));
  const down = setLevel("lite");
  check("down to lite: staging kept and still used", branches(a).includes("staging") && !down.includes("no longer used: releases"));
  check("english project: no START-HERE rewrite asked", !down.includes("START-HERE.md in"));
  check("same level: nothing to do", setLevel("lite").includes("Already at level Lite"));
  check("starter: refused politely, means lite", setLevel("starter").includes("Already at level Lite"));
  let refused = false;
  try {
    setLevel("huge");
  } catch {
    refused = true;
  }
  check("unknown level refused", refused);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
