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
  ["dev", "rtk git push origin main", "block"],
  ["dev", "rtk proxy git push origin main", "block"],
  ["dev", "rtk git push origin role/dev", "allow"],
  ["dev", "env GIT_TRACE=1 git push origin dev", "block"],
  ["dev", "FOO=1 git push origin dev", "block"],
  ["dev", "command git push origin main", "block"],
  ["dev", "nohup git push origin main", "block"],
  ["dev", "/usr/bin/git push origin main", "block"],
  ["dev", "git.exe push origin main", "block"],
  ["dev", "bash -c \"git push origin main\"", "block"],
  ["dev", "sh -c 'cd app && git push origin staging'", "block"],
  ["dev", "cmd /c git push origin main", "block"],
  ["dev", "powershell -Command \"git push origin main\"", "block"],
  ["dev", "pwsh -c \"git push origin role/dev\"", "allow"],
  ["dev", "powershell -EncodedCommand ZwBpAHQAIABwAHUAcwBoAA==", "block"],
  ["dev", "& git push origin main", "block"],
  // redirections are not refspecs
  ["dev", "git push origin role/dev 2>&1", "allow"],
  ["dev", "git push -u origin role/dev 2>&1 | tail -5", "allow"],
  ["dev", "git push origin role/dev > push.log 2>&1", "allow"],
  ["dev", "git push origin role/dev 2>/dev/null", "allow"],
  ["dev", "git push origin role/dev &> push.log", "allow"],
  ["dev", "git push origin dev 2>&1", "block"],
  ["dev", "git push origin main > push.log", "block"],
  ["dev", "git push origin role/dev 2>&1 && git push origin main", "block"],
  ["dev", "rtk gh pr merge 12", "block"],
  ["dev", "bash -c \"gh release create v1.0.0\"", "block"],
  ["dev", "rtk git status", "allow"],
  ["lead", "rtk git push origin main", "ask"],
  ["lead", "bash -c \"git push --force origin dev\"", "block"],
  ["lead", "rtk git push origin dev", "allow"],
  // plain commands
  ["dev", "git push origin role/dev", "allow"],
  ["dev", "git push -u origin role/dev", "allow"],
  ["dev", "git push origin HEAD:role/dev", "allow"],
  ["dev", "git push origin dev", "block"],
  ["dev", "git push origin role/frontend", "block"],
  ["frontend", "git push origin role/frontend", "allow"],
  ["frontend", "git push origin role/dev", "block"],
  ["dev", "git push origin role/dev:main", "block"],
  ["dev", "git -C ../x push origin main", "block"],
  ["dev", "git add . && git commit -m wip && git push origin main", "block"],
  ["dev", "git push --tags origin", "block"],
  ["dev", "git push origin --delete role/dev", "block"],
  ["dev", "git commit --no-verify -m x", "block"],
  ["dev", "gh pr merge 12 --squash", "block"],
  ["dev", "gh pr create --base dev --fill", "allow"],
  ["dev", "gh secret set TOKEN", "block"],
  ["dev", "git status", "allow"],
  ["frontend", "git push origin role/frontend", "allow"],
  ["frontend", "git push origin dev", "block"],
  ["test", "git push origin role/test", "allow"],
  ["uiux", "git push origin role/uiux", "allow"],
  ["uiux", "git push origin staging", "block"],
  ["frontend", "git push origin role/dev", "block"],
  ["dev", "gh workflow run deploy-production.yml", "block"],
  [null, "git push origin role/dev", "block"],
  ["lead", "git push origin dev", "allow"],
  ["lead", "git push origin staging", "allow"],
  ["lead", "git push origin role/dev", "allow"],
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
  ["dev", "cat backups/staging-2026-11-01.bak", "block"],
  ["dev", "Get-Content C:\\data\\prod.bacpac", "block"],
  ["lead", "head -n 50 db-backups/source.sql.gz", "block"],
  ["dev", "sqlcmd -Q \"RESTORE DATABASE x FROM DISK='/backups/x.bak'\"", "allow"],
  ["dev", "node scripts/deploy.mjs production v1.2.0 --owner", "block"],
  ["lead", "node scripts/deploy.mjs production v1.2.0 --owner", "block"],
  ["dev", "node scripts/deploy.mjs staging v1.2.0", "allow"],
];

const editCases = [
  ["dev", "app/src/login.ts", "allow"],
  ["dev", "tests/unit/login.test.ts", "allow"],
  ["dev", "docs/tech/srs.md", "block"],
  ["dev", "design/index.html", "block"],
  ["dev", ".env", "block"],
  ["dev", ".env.example", "allow"],
  ["lead", "docs/product/cr/CR-12.md", "allow"],
  ["lead", "docs/tech/srs.md", "allow"],
  ["po", "docs/product/prd.md", "block"],
  ["test", "docs/tech/test-reports/v1.4.0.md", "allow"],
  ["test", "app/src/login.ts", "block"],
  ["uiux", "packages/tokens/theme.css", "allow"],
  ["uiux", "app/src/login.ts", "block"],
  ["dev", ".github/workflows/ci.yml", "allow"],
  ["dev", "docker/app.Dockerfile", "allow"],
  ["dev", "docker-compose.yml", "allow"],
  ["dev", "docs/product/prd.md", "block"],
  ["frontend", "web/src/Login.tsx", "allow"],
  ["frontend", "docker-compose.yml", "block"],
  ["frontend", "design/index.html", "block"],
  ["frontend", "CHANGELOG.md", "allow"],
  ["dev", "CHANGELOG.md", "allow"],
  ["dev", "web/src/Login.tsx", "block"],
  ["lead", "docs/tech/srs.md", "allow"],
  ["lead", ".env.local", "block"],
  ["dev", path.resolve("/tmp/outside/notes.md"), "allow"],
];

const { checkRead } = require("./role-guard.cjs");
const readCases = [
  ["backups/staging.bak", "block"],
  ["data/old.dump", "block"],
  ["docs/tech/ops/environments.md", "allow"],
];

let failed = 0;
const report = (kind, role, subject, expected, got) => {
  const ok = got === expected;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${kind} [${role}] ${subject}  → ${got}${ok ? "" : ` (expected ${expected})`}`);
};
for (const [role, cmd, expected] of commandCases) report("cmd ", role, cmd, expected, outcome(checkCommand(cmd, role, process.cwd())));
for (const [file, expected] of readCases) report("read", "any", file, expected, outcome(checkRead(file)));
for (const [role, file, expected] of editCases) report("edit", role, file, expected, outcome(checkEdit(file, role, root, root)));

// Roles the project does not have leave their paths to the Dev; with them, the Dev keeps out.
const fs = require("fs");
const os = require("os");
const project = (roles, ownership) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "guard-roles-"));
  fs.mkdirSync(path.join(dir, ".claude"));
  fs.writeFileSync(path.join(dir, ".claude", "project.json"), JSON.stringify({ roles }));
  if (ownership) fs.writeFileSync(path.join(dir, ".claude", "ownership.json"), JSON.stringify(ownership));
  return dir;
};
const small = project(["lead", "dev"]);
const full = project(["lead", "dev", "uiux", "frontend", "test"]);
const roleCases = [
  [small, "dev", "docs/tech/test-cases/chat.md", "allow"],
  [small, "dev", "tests/e2e/chat.spec.ts", "allow"],
  [small, "dev", "web/src/Login.tsx", "allow"],
  [small, "dev", "design/index.html", "block"],
  [small, "dev", "docs/tech/srs.md", "block"],
  [full, "dev", "docs/tech/test-cases/chat.md", "block"],
  [full, "dev", "web/src/Login.tsx", "block"],
  [full, "test", "tests/e2e/chat.spec.ts", "allow"],
  [full, "frontend", "web/src/Login.tsx", "allow"],
];
for (const [dir, role, file, expected] of roleCases) report("edit", role, `${path.basename(dir)}/${file}`, expected, outcome(checkEdit(path.join(dir, file), role, dir, dir)));

// UI inside the backend project: the longer path wins, so Frontend owns the views inside the Dev's src/.
const split = project(["lead", "dev", "frontend"], { dev: ["src/", "tests/unit/"], frontend: ["src/Web/Views/", "src/Web/wwwroot/"] });
const multiCases = [
  [split, "frontend", "src/Web/Views/Home/Index.cshtml", "allow"],
  [split, "frontend", "src/Web/Controllers/HomeController.cs", "block"],
  [split, "dev", "src/Web/Views/Home/Index.cshtml", "block"],
  [split, "dev", "src/Web/Controllers/HomeController.cs", "allow"],
  [split, "dev", "src/Services/Orders.cs", "allow"],
];
for (const [dir, role, file, expected] of multiCases) report("edit", role, `${path.basename(dir)}/${file}`, expected, outcome(checkEdit(path.join(dir, file), role, dir, dir)));
for (const dir of [small, full, split]) fs.rmSync(dir, { recursive: true, force: true });
const levelCases = roleCases;

const total = readCases.length + commandCases.length + editCases.length + levelCases.length + multiCases.length;
console.log(`\n${total - failed}/${total} passed`);
process.exit(failed ? 1 : 0);
