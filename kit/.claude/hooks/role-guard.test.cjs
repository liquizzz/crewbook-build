// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// Test cases for role-guard.cjs. Run: node .claude/hooks/role-guard.test.cjs
// Pushes without an explicit refspec use the current branch, so these cases always name the target.
const path = require("path");
const { checkCommand, checkEdit } = require("./role-guard.cjs");

const root = path.resolve("/tmp/proj-wt/x");
const outcome = (r) => (!r ? "allow" : r.block ? "block" : "ask");

const commandCases = [
  // wrapped and nested commands
  ["dev1", "rtk git push origin main", "block"],
  ["dev1", "rtk proxy git push origin main", "block"],
  ["dev1", "rtk git push origin role/dev1", "allow"],
  ["dev1", "env GIT_TRACE=1 git push origin dev", "block"],
  ["dev1", "FOO=1 git push origin dev", "block"],
  ["dev1", "command git push origin main", "block"],
  ["dev1", "nohup git push origin main", "block"],
  ["dev1", "/usr/bin/git push origin main", "block"],
  ["dev1", "git.exe push origin main", "block"],
  ["dev1", "bash -c \"git push origin main\"", "block"],
  ["dev1", "sh -c 'cd app && git push origin staging'", "block"],
  ["dev1", "cmd /c git push origin main", "block"],
  ["dev1", "powershell -Command \"git push origin main\"", "block"],
  ["dev1", "pwsh -c \"git push origin role/dev1\"", "allow"],
  ["dev1", "powershell -EncodedCommand ZwBpAHQAIABwAHUAcwBoAA==", "block"],
  ["dev1", "& git push origin main", "block"],
  // redirections are not refspecs
  ["dev1", "git push origin role/dev1 2>&1", "allow"],
  ["dev1", "git push -u origin role/dev1 2>&1 | tail -5", "allow"],
  ["dev1", "git push origin role/dev1 > push.log 2>&1", "allow"],
  ["dev1", "git push origin role/dev1 2>/dev/null", "allow"],
  ["dev1", "git push origin role/dev1 &> push.log", "allow"],
  ["dev1", "git push origin dev 2>&1", "block"],
  ["dev1", "git push origin main > push.log", "block"],
  ["dev1", "git push origin role/dev1 2>&1 && git push origin main", "block"],
  ["dev1", "rtk gh pr merge 12", "block"],
  ["dev1", "bash -c \"gh release create v1.0.0\"", "block"],
  ["dev1", "rtk git status", "allow"],
  ["lead", "rtk git push origin main", "ask"],
  ["lead", "bash -c \"git push --force origin dev\"", "block"],
  ["lead", "rtk git push origin dev", "allow"],
  // plain commands
  ["dev1", "git push origin role/dev1", "allow"],
  ["dev1", "git push -u origin role/dev1", "allow"],
  ["dev1", "git push origin HEAD:role/dev1", "allow"],
  ["dev1", "git push origin dev", "block"],
  ["dev1", "git push origin role/dev2", "block"],
  ["dev2", "git push origin role/dev2", "allow"],
  ["dev2", "git push origin role/dev1", "block"],
  ["dev1", "git push origin role/dev1:main", "block"],
  ["dev1", "git -C ../x push origin main", "block"],
  ["dev1", "git add . && git commit -m wip && git push origin main", "block"],
  ["dev1", "git push --tags origin", "block"],
  ["dev1", "git push origin --delete role/dev1", "block"],
  ["dev1", "git commit --no-verify -m x", "block"],
  ["dev1", "gh pr merge 12 --squash", "block"],
  ["dev1", "gh pr create --base dev --fill", "allow"],
  ["dev1", "gh secret set TOKEN", "block"],
  ["dev1", "git status", "allow"],
  ["devops", "git push origin role/devops", "allow"],
  ["devops", "git push origin dev", "block"],
  ["test", "git push origin role/test", "allow"],
  ["uiux", "git push origin role/uiux", "allow"],
  ["uiux", "git push origin staging", "block"],
  ["devops", "git push origin role/devops", "allow"],
  ["devops", "gh workflow run deploy-production.yml", "block"],
  [null, "git push origin role/dev1", "block"],
  ["lead", "git push origin dev", "allow"],
  ["lead", "git push origin staging", "allow"],
  ["lead", "git push origin role/dev1", "allow"],
  ["lead", "gh pr merge 12 --squash", "allow"],
  ["lead", "git push origin main", "ask"],
  ["lead", "git push origin staging:main", "ask"],
  ["lead", "git push origin v1.4.0", "ask"],
  ["lead", "git push --tags origin", "ask"],
  ["lead", "git push --force origin v1.3.2:production", "ask"],
  ["lead", "gh release create v1.4.0 --notes-file x.md", "ask"],
  ["lead", "gh workflow run deploy-production.yml -f tag=v1.3.2", "ask"],
  ["lead", "git push --force origin dev", "block"],
  ["lead", "git push -f origin main", "block"],
  ["lead", "git push origin +staging", "block"],
  ["lead", "git push --force-with-lease origin main", "block"],
  ["lead", "git push --no-verify origin dev", "block"],
];

const editCases = [
  ["dev1", "app/src/login.ts", "allow"],
  ["dev1", "tests/unit/login.test.ts", "allow"],
  ["dev1", "docs/tech/srs.md", "block"],
  ["dev1", "design/index.html", "block"],
  ["dev1", ".env", "block"],
  ["dev1", ".env.example", "allow"],
  ["lead", "docs/product/cr/CR-12.md", "allow"],
  ["lead", "docs/tech/srs.md", "allow"],
  ["po", "docs/product/prd.md", "block"],
  ["test", "docs/tech/test-reports/v1.4.0.md", "allow"],
  ["test", "app/src/login.ts", "block"],
  ["uiux", "packages/tokens/theme.css", "allow"],
  ["uiux", "app/src/login.ts", "block"],
  ["devops", ".github/workflows/ci.yml", "allow"],
  ["devops", "docker/app.Dockerfile", "allow"],
  ["dev1", "docker-compose.yml", "block"],
  ["devops", "docs/product/prd.md", "block"],
  ["lead", "docs/tech/srs.md", "allow"],
  ["lead", ".env.local", "block"],
  ["dev1", path.resolve("/tmp/outside/notes.md"), "allow"],
];

let failed = 0;
const report = (kind, role, subject, expected, got) => {
  const ok = got === expected;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${kind} [${role}] ${subject}  → ${got}${ok ? "" : ` (expected ${expected})`}`);
};
for (const [role, cmd, expected] of commandCases) report("cmd ", role, cmd, expected, outcome(checkCommand(cmd, role, process.cwd())));
for (const [role, file, expected] of editCases) report("edit", role, file, expected, outcome(checkEdit(file, role, root, root)));

// Lite: Dev1 also owns the Test paths; at Full it does not.
const fs = require("fs");
const os = require("os");
const lite = fs.mkdtempSync(path.join(os.tmpdir(), "guard-lite-"));
fs.mkdirSync(path.join(lite, ".claude"));
fs.writeFileSync(path.join(lite, ".claude", "project.json"), JSON.stringify({ level: "lite" }));
const levelCases = [
  [lite, "dev1", "docs/tech/test-cases/chat.md", "allow"],
  [lite, "dev1", "tests/e2e/chat.spec.ts", "allow"],
  [lite, "dev1", "docs/tech/srs.md", "block"],
  [root, "dev1", "docs/tech/test-cases/chat.md", "block"],
];
for (const [dir, role, file, expected] of levelCases) report("edit", role, `${path.basename(dir)}/${file}`, expected, outcome(checkEdit(path.join(dir, file), role, dir, dir)));
fs.rmSync(lite, { recursive: true, force: true });

// Two Devs: each Dev's own entry in ownership.json limits it to its workstream.
const multi = fs.mkdtempSync(path.join(os.tmpdir(), "guard-multi-"));
fs.mkdirSync(path.join(multi, ".claude"));
fs.writeFileSync(path.join(multi, ".claude", "ownership.json"), JSON.stringify({ dev1: ["src/Modules/Users/"], dev2: ["src/Modules/Media/", "tests/unit/Media/", "CHANGELOG.md"] }));
const multiCases = [
  [multi, "dev2", "src/Modules/Media/Upload.cs", "allow"],
  [multi, "dev2", "src/Modules/Publishing/Publish.cs", "block"],
  [multi, "dev1", "src/Modules/Media/Upload.cs", "block"],
  [multi, "dev1", "src/Modules/Users/Create.cs", "allow"],
  [multi, "dev2", "CHANGELOG.md", "allow"],
  [multi, "dev1", "CHANGELOG.md", "block"],
];
for (const [dir, role, file, expected] of multiCases) report("edit", role, `${path.basename(dir)}/${file}`, expected, outcome(checkEdit(path.join(dir, file), role, dir, dir)));
fs.rmSync(multi, { recursive: true, force: true });

const total = commandCases.length + editCases.length + levelCases.length + multiCases.length;
console.log(`\n${total - failed}/${total} passed`);
process.exit(failed ? 1 : 0);
