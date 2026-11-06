#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// role-guard: Claude Code PreToolUse hook for Bash, PowerShell and file edits.
// Enforces Crewbook rules per role. The role is read from .claude/role in the
// worktree (one word: lead, dev, uiux, frontend, test), written by scripts/new-role-worktree.mjs.
//
//   Push    every role except the Lead pushes only role/<role>; nobody force-pushes dev, staging, main;
//           nobody uses --no-verify; only the Lead merges PRs.
//   Ask     the Lead's pushes to main or production, tag pushes, GitHub releases and workflow runs
//           open an approval prompt for the owner.
//   Data    no role reads a database backup or dump (*.bak, *.bacpac, *.dump, *.dmp, *.sql.gz, backups/): real data never
//           reaches a model; restoring one with the database's own tools is fine.
//   Deploy  production is deployed by the owner in a terminal: no session runs deploy.mjs production.
//   Paths   each role edits only the paths it owns (defaults below, override in .claude/ownership.json). When two
//           roles list a folder, the longer path wins: "src/" for the Dev and "src/Web/Views/" for Frontend.
//           A role the project does not have leaves its paths to the Dev (Frontend, Test); the Lead may edit anything.
//
// Block: exit 2 with the reason on stderr. Ask: exit 0 with a permissionDecision "ask" on stdout.
// Tests: node .claude/hooks/role-guard.test.cjs

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const PROTECTED_FROM_FORCE = ["dev", "staging", "main"];
const OWNER_GATED_BRANCHES = ["main", "production"];

// Paths each role may edit, relative to the worktree root. "*" means everything.
const DEFAULT_OWNERSHIP = {
  lead: ["*"],
  dev: [
    "app/", "src/", "api/", "server/", "backend/", "packages/", "tests/unit/", "CHANGELOG.md", "package.json", "pnpm-lock.yaml", ".env.example",
    ".github/workflows/", "infra/", "scripts/", "docs/tech/ops/", "docker/", ".dockerignore", "Dockerfile", "docker-compose.yml",
  ],
  frontend: ["web/", "frontend/", "client/", "packages/ui/", "tests/ui/", "CHANGELOG.md"],
  test: ["tests/", "docs/tech/test-cases/", "docs/tech/test-reports/"],
  uiux: ["design/", "packages/tokens/"],
};

function readInput() {
  try {
    return JSON.parse(fs.readFileSync(0, "utf8") || "{}");
  } catch {
    return {};
  }
}

// Find the worktree root (the folder holding .claude/role) and the role.
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

function readRoles(root) {
  try {
    const roles = JSON.parse(fs.readFileSync(path.join(root, ".claude", "project.json"), "utf8")).roles;
    return Array.isArray(roles) ? roles : null;
  } catch {
    return null;
  }
}

// The ownership map: the defaults, the project's own .claude/ownership.json on top, and the paths of a role the project
// does not have handed to the Dev (it builds both layers without Frontend and tests without Test).
function loadOwnership(root) {
  let map = { ...DEFAULT_OWNERSHIP };
  try {
    map = { ...map, ...JSON.parse(fs.readFileSync(path.join(root, ".claude", "ownership.json"), "utf8")) };
  } catch {}
  const roles = readRoles(root);
  if (roles) {
    for (const r of ["frontend", "test"]) {
      if (roles.includes(r)) continue;
      map.dev = [...(map.dev || []), ...(map[r] || [])];
      delete map[r];
    }
  }
  return map;
}

const matches = (rel, p) => (p.endsWith("/") ? rel.startsWith(p) : rel === p);

// The role that owns a path: the longest matching path across all roles (the Lead's "*" never wins).
function ownerOf(rel, map) {
  let best = null;
  for (const [role, paths] of Object.entries(map)) {
    for (const p of paths || []) {
      if (p !== "*" && matches(rel, p) && (!best || p.length > best.path.length)) best = { role, path: p };
    }
  }
  return best;
}

// A database backup or dump: its content is real data.
const BACKUP = /(^|[\\/])(db-)?backups?[\\/]|\.(bak|bacpac|dump|dmp)$|\.sql\.gz$/i;
const READERS = ["cat", "type", "get-content", "gc", "head", "tail", "less", "more", "strings", "xxd", "od", "hexdump", "zcat", "gunzip", "select-string", "grep", "rg", "findstr"];

// ---------- shell commands ----------

// Split a command line into simple commands on ; && || | and newlines, then into words.
function splitCommands(line) {
  const commands = [];
  let words = [];
  let word = "";
  let quote = null;
  const pushWord = () => {
    if (word !== "") words.push(word);
    word = "";
  };
  const pushCommand = () => {
    pushWord();
    words = dropRedirects(words);
    if (words.length) commands.push(words);
    words = [];
  };
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === quote) quote = null;
      else word += c;
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    else if (c === " " || c === "\t") pushWord();
    else if (c === "&" && (word.endsWith(">") || word.endsWith("<") || line[i + 1] === ">")) word += c; // 2>&1, >&2, &> file
    else if (c === ";" || c === "\n" || c === "|" || c === "&") {
      pushCommand();
      if ((c === "&" || c === "|") && line[i + 1] === c) i++;
    } else word += c;
  }
  pushCommand();
  return commands;
}

// Remove redirections ("2>&1", "> out.txt", "2>/dev/null", "&> log") so they are not read as arguments.
function dropRedirects(words) {
  const out = [];
  for (let i = 0; i < words.length; i++) {
    const m = /^(\d*|&)(>>?|<)(.*)$/.exec(words[i]);
    if (!m) {
      out.push(words[i]);
      continue;
    }
    if (m[3] === "") i++; // the target is the next word
  }
  return out;
}

const isTool = (word, name) => new RegExp(`(^|[\\\\/])${name}(\\.exe)?$`, "i").test(word || "");

// Wrappers that run another command: "rtk git push", "env X=1 git push", "command git push", "sudo git push" …
const WRAPPERS = ["rtk", "env", "command", "builtin", "exec", "sudo", "nohup", "time", "nice", "npx", "&"];
const SHELLS = ["bash", "sh", "zsh", "dash", "cmd", "powershell", "pwsh"];

// Turn one simple command into the commands it actually runs: strip wrappers and open nested shells
// ("bash -c 'git push …'", "powershell -Command \"…\"", "cmd /c …"). Returns a list of word arrays.
function unwrap(words, depth = 0) {
  if (depth > 4 || !words.length) return [words];
  let i = 0;
  for (;;) {
    const w = words[i];
    if (w === undefined) return [];
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w)) { i++; continue; } // VAR=value prefix
    const base = w.replace(/^.*[\\/]/, "").replace(/\.exe$/i, "").toLowerCase();
    if (WRAPPERS.includes(base)) {
      i++;
      if (base === "rtk" && words[i] === "proxy") i++;
      while (words[i] && words[i].startsWith("-") && base !== "&") i++; // wrapper options (env -i, nice -n …)
      continue;
    }
    if (SHELLS.includes(base)) {
      const flag = words.findIndex((x, k) => k > i && /^(-c|\/c|-command|-encodedcommand)$/i.test(x));
      if (flag > i && /^-encodedcommand$/i.test(words[flag])) return [["-encodedcommand"]];
      if (flag > i && words[flag + 1] !== undefined) {
        const inner = words.slice(flag + 1).join(" ");
        return splitCommands(inner).flatMap((cmd) => unwrap(cmd, depth + 1));
      }
    }
    return [words.slice(i)];
  }
}

// Return { sub, args } for a git command, skipping global options such as -C <dir> and -c <k=v>.
function parseGit(words) {
  let i = 0;
  while (i < words.length && !isTool(words[i], "git")) {
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(words[i]) || words[i] === "sudo") i++;
    else return null;
  }
  if (i >= words.length) return null;
  i++;
  while (i < words.length && words[i].startsWith("-")) {
    if (["-C", "-c", "--git-dir", "--work-tree"].includes(words[i])) i += 2;
    else i++;
  }
  if (i >= words.length) return null;
  return { sub: words[i], args: words.slice(i + 1) };
}

function currentBranch(cwd) {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", { cwd, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return null;
  }
}

const stripRef = (ref) => ref.replace(/^\+/, "").replace(/^refs\/heads\//, "");

function analysePush(args, cwd) {
  const r = { force: false, all: false, tags: false, del: false, targets: [] };
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--force" || a.startsWith("--force-with-lease") || a === "--force-if-includes") r.force = true;
    else if (/^-[a-zA-Z]*f[a-zA-Z]*$/.test(a)) r.force = true;
    else if (a === "--all" || a === "--mirror") r.all = true;
    else if (a === "--tags" || a === "--follow-tags") r.tags = true;
    else if (a === "--delete" || a === "-d") r.del = true;
    else if (["-o", "--push-option", "--repo", "--receive-pack"].includes(a)) i++;
    else if (!a.startsWith("-")) positional.push(a);
  }
  const refspecs = positional.slice(1); // the first positional is the remote
  if (refspecs.length === 0) r.targets.push(currentBranch(cwd) || "<unknown>");
  for (const spec of refspecs) {
    if (spec.startsWith("+")) r.force = true;
    if (spec.startsWith(":")) {
      r.del = true;
      r.targets.push(stripRef(spec.slice(1)));
      continue;
    }
    const parts = spec.split(":");
    let dst = stripRef(parts.length > 1 ? parts[1] : parts[0]);
    if (dst === "HEAD") dst = currentBranch(cwd) || "<unknown>";
    if (/^refs\/tags\//.test(dst) || /^v\d/.test(dst)) r.tags = true;
    r.targets.push(dst);
  }
  return r;
}

// Returns { block: reason } | { ask: reason } | null
function checkCommand(command, role, cwd) {
  if (/(^|\s)--no-verify(\s|$)/.test(command)) {
    return { block: "Do not skip checks with --no-verify. Fix the reported problem instead." };
  }
  let ask = null;
  for (const words of splitCommands(command).flatMap((c) => unwrap(c))) {
    if (/^-encodedcommand$/i.test(words[0] || "")) {
      return { block: "Encoded PowerShell commands are not allowed; run the command in plain text." };
    }
    const base = (words[0] || "").replace(/^.*[\\/]/, "").replace(/\.exe$/i, "").toLowerCase();
    if (READERS.includes(base) && words.slice(1).some((w) => BACKUP.test(w))) {
      return { block: "Database backups and dumps hold real data and are never read by a session. Restore them with the database's own tools (db-setup restore)." };
    }
    if (words.some((w) => /(^|[\\/])deploy\.mjs$/.test(w)) && words.includes("production")) {
      return { block: "Production is deployed by the owner in a terminal (node scripts/deploy.mjs production <tag> --owner). Give the owner the command." };
    }
    if (isTool(words[0], "gh")) {
      if (words[1] === "pr" && words[2] === "merge" && role !== "lead") {
        return { block: `Role "${role || "unknown"}" may not merge PRs. Send the PR link to the Lead.` };
      }
      if (words[1] === "secret") return { block: "Secrets are entered by the owner only." };
      const releaseOrRun = words[1] === "release" || (words[1] === "workflow" && ["run", "enable"].includes(words[2]));
      if (releaseOrRun && role !== "lead") {
        return { block: `Role "${role || "unknown"}" may not create releases or run workflows. Ask the Lead.` };
      }
      if (releaseOrRun) {
        ask = ask || { ask: `Lead runs "gh ${words.slice(1, 3).join(" ")}": owner approval required.` };
      }
      continue;
    }
    const git = parseGit(words);
    if (!git || git.sub !== "push") continue;
    const p = analysePush(git.args, cwd);

    if (p.force && p.targets.some((t) => PROTECTED_FROM_FORCE.includes(t))) {
      return { block: `Force push to ${p.targets.join(", ")} is not allowed for any role.` };
    }
    if (role === "lead") {
      const gated = p.targets.filter((t) => OWNER_GATED_BRANCHES.includes(t));
      if (gated.length || p.tags || p.all) {
        ask = ask || { ask: `Lead pushes ${[...gated, p.tags ? "tags" : "", p.all ? "--all" : ""].filter(Boolean).join(", ")}: owner approval required (release / deployment gate).` };
      }
      continue;
    }
    if (!role) return { block: "No role found in .claude/role. Create the worktree with scripts/new-role-worktree.mjs first." };
    const own = `role/${role}`;
    if (p.all || p.tags || p.del) return { block: `Role "${role}" may only push its own branch ${own} (no --all, --tags or deletes).` };
    const others = p.targets.filter((t) => t !== own);
    if (others.length) {
      return { block: `Role "${role}" may only push ${own}, not ${others.join(", ")}. Push ${own}, open a PR into dev and send the Lead the link.` };
    }
  }
  return ask;
}

// ---------- file edits ----------

function checkEdit(filePath, role, root, cwd) {
  if (!filePath || !role || !root) return null;
  const abs = path.resolve(cwd, filePath);
  const rel = path.relative(root, abs).split(path.sep).join("/");
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null; // outside the worktree (scratch files)
  if (rel === ".env" || /(^|\/)\.env(\.[^/]*)?$/.test(rel) && !rel.endsWith(".example")) {
    return { block: "Real .env files are filled in by the owner, not by agents." };
  }
  const map = loadOwnership(root);
  const owned = map[role] || [];
  if (owned.includes("*")) return null;
  const owner = ownerOf(rel, map);
  // A file two roles both list (CHANGELOG.md for the Dev and Frontend) is shared: each may edit it.
  if (owner && (owner.role === role || owned.some((p) => matches(rel, p) && p.length === owner.path.length))) return null;
  if (owner) return { block: `${rel} belongs to ${owner.role} (${owner.path}), not to "${role}". Ask the Lead through the issue instead.` };
  return { block: `Role "${role}" does not own ${rel}. Owned: ${owned.join(", ")}. Ask through the issue instead.` };
}

// Reading a file (the Read tool): backups and dumps are real data.
function checkRead(filePath) {
  if (filePath && BACKUP.test(String(filePath).split("\\").join("/"))) {
    return { block: "Database backups and dumps hold real data and are never read by a session. Restore them with the database's own tools (db-setup restore)." };
  }
  return null;
}

function main() {
  const input = readInput();
  const cwd = input.cwd || process.cwd();
  const found = findRole(cwd);
  const role = process.env.ROLE_GUARD_ROLE || found.role;
  const tool = input.tool_name || "";
  const ti = input.tool_input || {};

  let result = null;
  if (tool === "Bash" || tool === "PowerShell") result = checkCommand(ti.command || "", role, cwd);
  else if (tool === "Read") result = checkRead(ti.file_path);
  else result = checkEdit(ti.file_path || ti.notebook_path, role, found.root, cwd);

  if (result && result.block) {
    process.stderr.write(`[role-guard] ${result.block}\n`);
    process.exit(2);
  }
  if (result && result.ask) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "ask", permissionDecisionReason: `[role-guard] ${result.ask}` },
    }));
  }
  process.exit(0);
}

if (require.main === module) main();
module.exports = { checkCommand, checkEdit, checkRead, splitCommands, unwrap, parseGit, analysePush, loadOwnership, ownerOf };
