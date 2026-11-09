#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// Tests update.mjs on a project made by init.mjs in a temporary folder and then aged by hand: an old command,
// a missing command, changed kit files, the project's own rules, sections, plugins and hooks.
// Run:  node kit/update.test.mjs      (needs the kit's git history: in CI, checkout with fetch-depth 0)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const kit = path.dirname(fileURLToPath(import.meta.url));
const playbook = path.dirname(kit);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "playbook-update-"));
let failed = 0;
let passed = 0;
const check = (label, cond) => {
  if (cond) passed++;
  else {
    failed++;
    console.log(`FAIL ${label}`);
  }
};
process.env.CREWBOOK_NO_PLUGINS = "1";
const git = (dir, ...args) => execFileSync("git", args, { cwd: dir, stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
const update = (dir, ...args) => {
  try {
    return { ok: true, out: execFileSync("node", [path.join(kit, "update.mjs"), ...args], { cwd: dir, stdio: ["ignore", "pipe", "pipe"] }).toString() };
  } catch (e) {
    return { ok: false, out: String(e.stdout) + String(e.stderr) };
  }
};
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), "utf8").replace(/\r\n/g, "\n");
const write = (dir, rel, text) => {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), text);
};
const commit = (dir, msg) => {
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", msg);
};

// An old version of a kit file, and a rule the kit had once and no longer has, from the kit's history.
const pastFile = (file) => {
  for (const h of git(playbook, "log", "--all", "--format=%H", "--", file).split("\n").filter(Boolean)) {
    try {
      return execFileSync("git", ["show", `${h}:${file}`], { cwd: playbook, stdio: ["ignore", "pipe", "ignore"] }).toString();
    } catch {}
  }
  return null;
};
const label = (l) => l.match(/^- \*\*(.+?)\*\*/)?.[1].replace(/[.:]+$/, "");
const kitLabels = new Set(read(kit, "CLAUDE.md").split("\n").map(label).filter(Boolean));
let oldRule = null;
for (const h of git(playbook, "log", "--all", "--format=%H", "--", "kit/CLAUDE.md").split("\n").filter(Boolean)) {
  const line = git(playbook, "show", `${h}:kit/CLAUDE.md`).split("\n").find((l) => label(l) && !kitLabels.has(label(l)));
  if (line) {
    oldRule = line;
    break;
  }
}
const oldRelay = pastFile("kit/commands/relay.md");
const oldBuild = pastFile("kit/commands/build.md");

try {
  check("kit history: an old command and an old rule are found", Boolean(oldRelay && oldRule));
  const p = path.join(tmp, "old-shop");
  execFileSync("node", [path.join(kit, "init.mjs"), p, "--name", "Old Shop", "--github", "none", "--yes"], { stdio: "ignore" });
  const lead = path.join(tmp, "old-shop-wt", "lead");

  // 1. Where it runs
  check("refused on main", !update(p).ok && update(p).out.includes("Lead's worktree"));
  check("fresh project: nothing to do", update(lead).out.includes("already has this kit version"));
  check("init records the kit version", JSON.parse(read(p, ".claude/project.json")).kitVersion === git(playbook, "rev-parse", "HEAD"));

  // 2. Age the project as if it came from an older kit and was then worked on.
  const project = JSON.parse(read(lead, ".claude/project.json"));
  delete project.kitVersion;
  write(lead, ".claude/project.json", JSON.stringify({ ...project, roles: ["lead", "dev", "frontend"], setup: true }, null, 2) + "\n");
  write(lead, ".claude/commands/relay.md", oldRelay || "");
  fs.rmSync(path.join(lead, ".claude/commands/cb-auto.md"));
  write(lead, ".claude/roles/dev.md", read(lead, ".claude/roles/dev.md") + "\nA local note.\n");
  write(lead, ".github/workflows/ci.yml", read(lead, ".github/workflows/ci.yml") + "# project job\n");
  write(lead, "scripts/own.mjs", "// the project's own script\n");
  // Commands from before the cb- prefix (one changed here), the project's own ci-local without ci-steps.json, a PO worktree.
  fs.rmSync(path.join(lead, ".claude/commands/cb-build.md"));
  write(lead, ".claude/commands/build.md", oldBuild || "");
  write(lead, ".claude/commands/setup.md", "a setup this project changed\n");
  write(lead, "scripts/ci-local.mjs", "// the project's own CI\n");
  fs.rmSync(path.join(lead, "scripts/ci-steps.json"));
  fs.mkdirSync(path.join(tmp, "old-shop-wt", "po"), { recursive: true });
  let claude = read(lead, "CLAUDE.md")
    .replace(/^- Stage: .*$/m, "- Stage: Delivery, milestone v0.2.0.")
    .replace("- <none>", "- Payment provider: needed before v0.3.0. Issue #9.")
    .replace("- <Project hard rules.>", `- Prices are shown with VAT.\n${oldRule}`)
    .replace("| Check that the app runs | `run` |", "| Check that the app runs | `run` |\n| Deploy to the client's server | `scripts/own.mjs` |")
    .replace("## Compact instructions", "## Client notes\nThe client reviews on Fridays.\n\n## Compact instructions");
  write(lead, "CLAUDE.md", claude);
  const settings = JSON.parse(read(lead, ".claude/settings.json"));
  settings.enabledPlugins["frontend-design@claude-plugins-official"] = true;
  settings.enabledPlugins["rampstack-seo@anthropic-plugin-directory"] = true;
  settings.enabledPlugins["claude-mem@thedotmack"] = true;
  settings.permissions.allow.push("Bash(uv *)");
  settings.hooks.PostToolUse = [{ hooks: [{ type: "command", command: "node own-hook.cjs" }] }];
  write(lead, ".claude/settings.json", JSON.stringify(settings, null, 2) + "\n");
  commit(lead, "chore: work on the project");

  // 3. A dry run writes nothing.
  const dry = update(lead, "--dry-run");
  check("dry run: reports the plan", dry.ok && dry.out.includes("Dry run") && dry.out.includes(".claude/commands/cb-auto.md"));
  check("dry run: nothing written", git(lead, "status", "--porcelain") === "");

  // 4. The update
  const run = update(lead);
  check("update runs", run.ok);
  check("missing kit file added", fs.existsSync(path.join(lead, ".claude/commands/cb-auto.md")));
  check("old untouched kit file removed", !fs.existsSync(path.join(lead, ".claude/commands/relay.md")) && run.out.includes(".claude/commands/relay.md"));
  check("changed kit file replaced and reported", read(lead, ".claude/roles/dev.md") === read(kit, ".claude/roles/dev.md") && /had changes made in this project[\s\S]*\.claude\/roles\/dev\.md/.test(run.out));
  check("changed .github file kept and reported", read(lead, ".github/workflows/ci.yml").includes("# project job") && /Kept[\s\S]*\.github\/workflows\/ci\.yml/.test(run.out));
  check("the project's own script stays", fs.existsSync(path.join(lead, "scripts/own.mjs")));
  check("old command names removed, cb- names added", fs.existsSync(path.join(lead, ".claude/commands/cb-build.md")) && !fs.existsSync(path.join(lead, ".claude/commands/build.md")) && !fs.existsSync(path.join(lead, ".claude/commands/setup.md")) && run.out.includes(".claude/commands/setup.md removed: now .claude/commands/cb-setup.md"));
  check("the project's own ci-local.mjs kept until ci-steps.json has its steps", read(lead, "scripts/ci-local.mjs") === "// the project's own CI\n" && run.out.includes("move the steps of your scripts/ci-local.mjs into scripts/ci-steps.json"));
  check("a retired PO worktree and a missing model mode are reported", run.out.includes("Retired roles: po (its work goes to the Lead") && run.out.includes("chosen per task now"));
  claude = read(lead, "CLAUDE.md");
  check("CLAUDE.md: title, Stage and Open decisions kept", claude.startsWith("# Old Shop") && claude.includes("- Stage: Delivery, milestone v0.2.0.") && claude.includes("- Payment provider: needed before v0.3.0. Issue #9."));
  check("CLAUDE.md: the project's rule kept, the old kit rule removed", claude.includes("- Prices are shown with VAT.") && !claude.includes(oldRule));
  check("CLAUDE.md: own section and table row kept", claude.includes("## Client notes\nThe client reviews on Fridays.") && claude.includes("| Deploy to the client's server |"));
  check("CLAUDE.md: kit rules are the new ones, the Roles line from the project", claude.includes("- **Opening sessions:**") && /^- Roles: Lead, Dev, Frontend\./m.test(claude));
  const merged = JSON.parse(read(lead, ".claude/settings.json"));
  check("settings: own plugin, permission and hook kept", merged.enabledPlugins["frontend-design@claude-plugins-official"] === true && merged.permissions.allow.includes("Bash(uv *)") && merged.hooks.PostToolUse?.[0].hooks[0].command === "node own-hook.cjs");
  check("settings: a plugin the kit turns off stays on when the project turned it on", merged.enabledPlugins["rampstack-seo@anthropic-plugin-directory"] === true);
  check("settings: claude-mem moves from every role to the Lead", merged.enabledPlugins["claude-mem@thedotmack"] === false && run.out.includes("claude-mem@thedotmack is now off"));
  check("settings: kit hooks still there", JSON.stringify(merged.hooks.PreToolUse).includes("role-guard.cjs"));
  check("version recorded", JSON.parse(read(lead, ".claude/project.json")).kitVersion === git(playbook, "rev-parse", "HEAD") && JSON.parse(read(lead, ".claude/project.json")).setup === true);
  check("next steps for the Lead", run.out.includes("open a PR into dev"));

  // 4b. A project on the roles from before DEC-081 (a level, Dev1, Dev2, DevOps) is not updated.
  commit(lead, "chore(kit): update Crewbook kit");
  const newProject = read(lead, ".claude/project.json");
  write(lead, ".claude/project.json", JSON.stringify({ ...JSON.parse(newProject), roles: undefined, level: "full" }, null, 2) + "\n");
  commit(lead, "chore: an old layout");
  const oldLayout = update(lead);
  check("old roles: refused, the project stays on its kit version", !oldLayout.ok && oldLayout.out.includes("before DEC-081") && oldLayout.out.includes("stays on its kit version"));
  write(lead, ".claude/project.json", newProject);
  commit(lead, "chore: back to the new layout");

  // 5. A second run finds nothing; uncommitted work stops it.
  const again = update(lead);
  check("second run: nothing to do", again.out.includes("already has this kit version") && git(lead, "status", "--porcelain") === "");
  if (process.env.DEBUG) console.log(again.out, git(lead, "diff"));
  write(lead, "notes.txt", "draft\n");
  check("uncommitted changes: refused", !update(lead).ok && update(lead).out.includes("uncommitted"));
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
