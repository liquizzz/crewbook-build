// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// Test cases for the secret check. Run: node kit/hooks/pre-commit.test.mjs
// Each case stages one file in a temporary repo and runs the hook with bash.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const hook = path.join(path.dirname(fileURLToPath(import.meta.url)), "pre-commit");
const cases = [
  ["a.py", 'password = read_secret("PGPASSWORD")', "allow"],
  ["b.py", "conn = connect(password=pg_password, user=u)", "allow"],
  ["c.py", "api_key=cfg.gemini_api_key", "allow"],
  ["d.py", "client = Client(api_key=self.api_key)", "allow"],
  ["e.py", 'password = os.environ["PGPASSWORD"]', "allow"],
  ["f.env.example", "API_KEY=CHANGE_ME", "allow"],
  ["g.py", 'password = "hunter2secret"', "block"],
  ["h.yml", "password: hunter2secret", "block"],
  ["i.ts", 'const apiKey = "abcdef123456";', "block"],
  ["j.py", 'token = "sk-abcdefghijklmnopqrstuvwxyz"', "block"],
  [".env", "X=1", "block"],
  // A word that excuses a placeholder elsewhere on the line excuses nothing.
  ["k.ts", 'const password = "hunter2secret"; // example connection', "block"],
  ["l.py", 'password = "hunter2secret"  # your-db, placeholder below', "block"],
  ["m.py", 'password = "CHANGE_ME"  # set the real one in .env', "allow"],
  ["n.yml", "api_key: <your-api-key>", "allow"],
  ["o.py", 'password = "example-only"', "allow"],
  ["p.mjs", "env: { ...process.env, PGPASSWORD: pwdOf(url) }", "allow"],
  ["q.mjs", 'env: { ...process.env, PGPASSWORD: "hunter2secret" }', "block"],
];

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "secret-check-"));
const git = (...args) => execFileSync("git", args, { cwd: dir, stdio: ["ignore", "pipe", "pipe"] });
git("init", "-q");
let failed = 0;
try {
  for (const [file, line, want] of cases) {
    fs.writeFileSync(path.join(dir, file), line + "\n");
    git("add", "-f", file);
    let got = "allow";
    try {
      execFileSync("bash", [hook], { cwd: dir, stdio: ["ignore", "pipe", "pipe"] });
    } catch {
      got = "block";
    }
    if (got !== want) failed++;
    console.log(`${got === want ? "PASS" : "FAIL"}  ${file}: ${line}  → ${got}`);
    git("rm", "-q", "--cached", file);
    fs.rmSync(path.join(dir, file));
  }
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
console.log(`\n${cases.length - failed}/${cases.length} passed`);
process.exit(failed ? 1 : 0);
