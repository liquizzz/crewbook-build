#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
//
// Bring a Crewbook project that already runs up to this kit's version, keeping what belongs to the project.
//   node <playbook>/kit/update.mjs [<folder>] [--dry-run]
// Run it in the Lead's worktree (a role/ branch, clean working tree). It changes files only; the Lead reviews
// the diff, commits it and opens a PR into dev (/cb-update). --dry-run prints the plan and writes nothing.
//
// What it does with each kind of file:
// - Kit files (.claude/roles, hooks, commands, start-here.md, scripts, docs/templates): replaced by the new version.
// A project on the roles before DEC-081 (a "level", Dev1, Dev2, DevOps) is not updated: it stays on its kit version.
//   A file the kit no longer ships is deleted when the project never changed it.
// - .github files: replaced only when the project never changed them; new ones are added.
// - CLAUDE.md: the kit's sections and rules are replaced. The project's title, description, Stage and Documents
//   lines, its Open decisions, its stack lines, its own rules and its own sections are kept.
// - .claude/settings.json: the kit's plugins, marketplaces, hooks and permissions merged with the project's own.
// - Docker files, CHANGELOG.md, README.md and docs/ (except docs/templates) belong to the project: never changed.
// "Never changed" means the file is exactly a version the kit once shipped, looked up in the kit's git history.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RETIRED_ROLES, kitVersion, rolesLine, languageLine, mainCheckout, readProject, renderStartHere, worktreePath, writeProject } from "./scripts/project-level.mjs";

const argv = process.argv.slice(2);
const dry = argv.includes("--dry-run");
const target = path.resolve(argv.find((a) => !a.startsWith("--")) || ".");
const kit = path.dirname(fileURLToPath(import.meta.url));
const playbook = path.dirname(kit);

const git = (cwd, args) => {
  try {
    return execFileSync("git", args, { cwd, stdio: ["ignore", "pipe", "ignore"], maxBuffer: 256 * 1024 * 1024 }).toString();
  } catch {
    return null;
  }
};
const stop = (text) => {
  console.error(text);
  process.exit(1);
};
const lf = (t) => t.replace(/\r\n/g, "\n");

// 1. The project: a Crewbook project, in a role worktree, nothing uncommitted.
const root = git(target, ["rev-parse", "--show-toplevel"])?.trim();
if (!root) stop(`${target} is not a git repo.`);
const project = readProject(root);
if (!project) stop(`${root} has no .claude/project.json: it is not a Crewbook project. To start one, use init.mjs.`);
const branch = git(root, ["branch", "--show-current"])?.trim();
if (!branch || ["main", "dev", "staging"].includes(branch)) {
  stop(`This checkout is on ${branch || "a detached HEAD"}. Run the update in the Lead's worktree (branch role/lead), so it reaches dev through a PR.`);
}
if (git(root, ["status", "--porcelain"])?.trim()) stop("The working tree has uncommitted changes. Commit or remove them first, then run the update again.");
// The roles changed in DEC-081 (chosen at setup, split by layer; no levels, Dev1, Dev2 or DevOps). A project set up
// before that keeps its kit version: moving its sessions, branches and open work is not something to do by accident.
if (project.level || (!Array.isArray(project.roles) && project.setup !== false)) {
  stop(`This project uses the roles from before DEC-081 (${project.level ? `the "${project.level}" level, ` : ""}Dev1, Dev2, DevOps). This kit version changed them, so it is not applied here: the project stays on its kit version. Start new projects with the new kit.`);
}

// 2. The kit's history: every file version the kit ever shipped, to tell untouched kit files from the project's changes.
const version = kitVersion(playbook);
const shipped = new Set(
  (git(playbook, ["rev-list", "--all", "--objects", "--", "kit", "templates"]) || "")
    .split("\n").map((l) => l.split(" ")).filter((p) => p.length === 2).map((p) => p[0]),
);
if (!shipped.size) console.warn("Warning: the kit has no git history here, so every file that differs counts as changed by the project. Clone crewbook-build with git for a cleaner update.\n");
const pastVersions = (file) => (git(playbook, ["log", "--all", "--format=%H", "--", file]) || "").split("\n").filter(Boolean)
  .map((h) => git(playbook, ["show", `${h}:${file}`])).filter(Boolean).map(lf);

const blobs = new Map();
for (const line of (git(root, ["ls-files", "-s"]) || "").split("\n")) {
  const m = line.match(/^\d+ ([0-9a-f]+) \d+\t(.+)$/);
  if (m) blobs.set(m[2], m[1]);
}
const untouched = (rel) => shipped.has(blobs.get(rel));

const out = { added: [], replaced: [], yoursReplaced: [], removed: [], kept: [], merged: [], notes: [] };
const exists = (rel) => fs.existsSync(path.join(root, rel));
const readText = (rel) => lf(fs.readFileSync(path.join(root, rel), "utf8"));
const write = (rel, text) => {
  if (dry) return;
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), text);
};
const remove = (rel) => dry || fs.rmSync(path.join(root, rel));
const files = (dir, base = dir) => (fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : []).flatMap((e) =>
  e.isDirectory() ? files(path.join(dir, e.name), base) : [path.relative(base, path.join(dir, e.name)).split(path.sep).join("/")]);

// 3. Kit folders. "kit": the kit owns the files and replaces them; "shared": replaced only when untouched.
const FOLDERS = [
  ["kit/.claude/roles", ".claude/roles", "kit"],
  ["kit/.claude/hooks", ".claude/hooks", "kit"],
  ["kit/commands", ".claude/commands", "kit"],
  ["kit/scripts", "scripts", "kit"],
  ["templates", "docs/templates", "kit"],
  ["kit/.github", ".github", "shared"],
];
// A project that wrote its own scripts/ci-local.mjs keeps it until its steps are in scripts/ci-steps.json.
const ownCiLocal = exists("scripts/ci-local.mjs") && !exists("scripts/ci-steps.json") && !untouched("scripts/ci-local.mjs");
for (const [from, to, owner] of FOLDERS) {
  const now = files(path.join(playbook, from));
  for (const name of now) {
    const rel = `${to}/${name}`;
    if (rel === "scripts/ci-local.mjs" && ownCiLocal) {
      out.kept.push(`${rel} (this project's own; the kit's runs the steps of scripts/ci-steps.json)`);
      out.notes.push("CI on this machine: move the steps of your scripts/ci-local.mjs into scripts/ci-steps.json (the kit's ci-local.mjs runs them, reuses a PASS and skips steps by changed paths), then run the update again to take the kit's script. If your script does more than the kit's (several runs at once, a build-only check, a fallback for dev), keep it and add to it the kit's reuse of a PASS, the changed-paths steps, CI_CHANGED_FILES and --full instead.");
      continue;
    }
    if (rel === "scripts/ci-steps.json" && ownCiLocal) continue; // added with the kit's ci-local.mjs, not before
    const text = fs.readFileSync(path.join(playbook, from, name));
    if (!exists(rel)) {
      write(rel, text);
      out.added.push(rel);
    } else if (readText(rel) === lf(text.toString())) {
      continue;
    } else if (untouched(rel)) {
      write(rel, text);
      out.replaced.push(rel);
    } else if (owner === "kit") {
      write(rel, text);
      out.yoursReplaced.push(rel);
    } else if (!project.kitVersion || git(playbook, ["diff", "--quiet", project.kitVersion, "HEAD", "--", `${from}/${name}`]) === null) {
      // Listed only when the kit's version moved on since the project's (or when that is unknown).
      out.kept.push(rel);
    }
  }
  // Files the kit no longer ships: deleted when untouched; the project's own files stay.
  for (const name of files(path.join(root, to))) {
    if (now.includes(name)) continue;
    const rel = `${to}/${name}`;
    if (untouched(rel)) {
      remove(rel);
      out.removed.push(rel);
    }
  }
}

// Kit files renamed or retired: removed even when the project changed them (the kit owns these folders).
const RENAMED = { ...Object.fromEntries(["auto", "build", "change", "gate", "next", "progress", "release", "send", "setup"].map((c) => [`.claude/commands/${c}.md`, `.claude/commands/cb-${c}.md`])),
  ".claude/commands/kit-update.md": ".claude/commands/cb-update.md", ".claude/roles/po.md": null };
for (const [old, now] of Object.entries(RENAMED)) {
  if (!exists(old) || out.removed.includes(old)) continue;
  if (!untouched(old)) out.yoursReplaced.push(`${old} removed${now ? `: now ${now}` : ""} (it had changes made here)`);
  else out.removed.push(`${old}${now ? ` (now ${now})` : " (the role is retired)"}`);
  remove(old);
}

// 4. CLAUDE.md: sections by "## " title, bullets by their bold label (or their first words).
const parse = (text) => {
  const lines = lf(text).replace(/\n+$/, "").split("\n");
  const sections = [{ title: "", lines: [] }];
  for (const line of lines) {
    if (line.startsWith("## ")) sections.push({ title: line.slice(3).trim(), lines: [] });
    else sections[sections.length - 1].lines.push(line);
  }
  return sections;
};
// Items: a bullet with its indented lines (blank lines inside it included), or one line of text.
const items = (lines) => {
  const list = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith("- ")) {
      list.push({ text: line });
      continue;
    }
    const block = [line];
    while (i + 1 < lines.length) {
      const next = lines[i + 1];
      const later = lines.slice(i + 1).find((l) => l.trim());
      if (/^\s+\S/.test(next) || (!next.trim() && later && /^\s+\S/.test(later))) block.push(lines[++i]);
      else break;
    }
    list.push({ bullet: true, text: block.join("\n"), key: keyOf(line) });
  }
  return list;
};
function keyOf(line) {
  const bold = line.match(/^- \*\*(.+?)\*\*/);
  if (bold) return `b:${bold[1].replace(/[.:]+$/, "").toLowerCase()}`;
  const field = line.match(/^- (Level|Roles|Language|Documents|Stage|Stack):/);
  if (field) return `f:${field[1].toLowerCase()}`;
  return `t:${line.slice(2, 42).toLowerCase().replace(/\s+/g, " ")}`;
}
// A bullet the project fills in (the kit ships it as a placeholder).
const PLACEHOLDER = /^- (<[^>]*>\.?$|Stack: <|Install `<install>`)/;
const FILLED = ["f:documents", "f:stage", "f:roles"];

function mergeClaude(mine, kitText, history) {
  const ours = parse(mine);
  const theirs = parse(kitText);
  const past = history.map(parse);
  const pastKeys = (title) => new Set(past.flatMap((s) => s.filter((x) => x.title === title).flatMap((x) => items(x.lines).filter((i) => i.bullet).map((i) => i.key))));
  const pastLines = (title) => new Set(past.flatMap((s) => s.filter((x) => x.title === title).flatMap((x) => x.lines)));
  const pastTitles = new Set(past.flatMap((s) => s.map((x) => x.title)));
  const result = [];

  for (const section of theirs) {
    const mineSection = ours.find((s) => s.title === section.title);
    let lines = section.lines;
    if (mineSection && section.title === "") {
      // The title line and the description paragraph stay the project's.
      const kitStart = section.lines.findIndex((l) => /project\. Steps for the owner/.test(l));
      const myStart = mineSection.lines.findIndex((l) => /project\. Steps for the owner|^- /.test(l));
      const head = mineSection.lines.slice(0, myStart < 0 ? mineSection.lines.length : myStart);
      lines = [...head, ...section.lines.slice(kitStart)];
    }
    if (mineSection) lines = mergeLines(lines, mineSection.lines, pastKeys(section.title), pastLines(section.title), section.title);
    result.push({ title: section.title, lines });
  }
  // The project's own sections stay, after the section they followed; sections the kit dropped go.
  ours.forEach((s, i) => {
    if (theirs.some((t) => t.title === s.title)) return;
    if (pastTitles.has(s.title)) return out.notes.push(`CLAUDE.md: the section "${s.title}" is no longer in the kit and was removed.`);
    const after = result.findIndex((r) => r.title === ours[i - 1]?.title);
    result.splice(after < 0 ? result.length : after + 1, 0, s);
  });
  const trim = (lines) => {
    const l = [...lines];
    while (l.length && !l[l.length - 1].trim()) l.pop();
    return l;
  };
  let text = result.map((s) => trim(s.title ? [`## ${s.title}`, ...s.lines] : s.lines).join("\n")).join("\n\n") + "\n";
  text = text.replace(/^- Language: .*$/m, languageLine(project.language || "English", project.docsLanguage || "English"));
  text = text.replace(/^- Roles: .*$/m, rolesLine(project.roles));
  return text;
}

function mergeLines(kitLines, myLines, pastKeys, pastLines, title) {
  const kitItems = items(kitLines);
  const kitKeys = new Set(kitItems.filter((i) => i.bullet).map((i) => i.key));
  const slot = (i) => i.bullet && (FILLED.includes(i.key) || PLACEHOLDER.test(i.text));
  const slotKeys = new Set(kitItems.filter(slot).map((i) => i.key));
  const myItems = items(myLines);
  // The project's bullets: what it wrote where the kit has a placeholder, and bullets the kit never had.
  const mine = myItems.filter((i) => i.bullet && (slotKeys.has(i.key) || PLACEHOLDER.test(i.text) || (!kitKeys.has(i.key) && !pastKeys.has(i.key))));
  // The project's own lines outside bullets (a table row, a note), when the kit never had them.
  // Table rows count as the kit's when their first cell starts like one of the kit's rows, old or new.
  const cell = (l) => (l.startsWith("|") ? l.split("|")[1].trim().toLowerCase().split(/\s+/).slice(0, 4).join(" ") : null);
  const kitCells = new Set([...pastLines, ...kitLines].map(cell).filter(Boolean));
  const myText = title === "" ? [] : myItems.filter((i) => !i.bullet && i.text.trim() && !pastLines.has(i.text) && !kitLines.includes(i.text) && !kitCells.has(cell(i.text)));
  const merged = [];
  const used = new Set();
  let placed = false;
  for (const item of kitItems) {
    if (!slot(item)) {
      merged.push(item.text);
      continue;
    }
    const own = mine.find((m) => m.key === item.key && !used.has(m));
    if (own) {
      merged.push(own.text);
      used.add(own);
    } else if (FILLED.includes(item.key)) merged.push(item.text);
    // The project's other bullets go where the kit's first placeholder is.
    if (PLACEHOLDER.test(item.text) && !placed) {
      for (const m of mine) if (!used.has(m) && !slotKeys.has(m.key)) {
        merged.push(m.text);
        used.add(m);
      }
      placed = true;
    }
  }
  const rest = mine.filter((m) => !used.has(m));
  if (rest.length) {
    const last = merged.findLastIndex((l) => l.startsWith("- "));
    merged.splice(last + 1, 0, ...rest.map((m) => m.text));
  }
  if (myText.length) {
    const rows = myText.filter((i) => i.text.startsWith("|")).map((i) => i.text);
    const other = myText.filter((i) => !i.text.startsWith("|")).map((i) => i.text);
    const lastRow = merged.findLastIndex((l) => l.startsWith("|"));
    if (rows.length && lastRow >= 0) merged.splice(lastRow + 1, 0, ...rows);
    else other.unshift(...rows);
    if (other.length) {
      while (merged.length && !merged[merged.length - 1].trim()) merged.pop();
      merged.push("", ...other, "");
    }
    out.notes.push(`CLAUDE.md "${title}": kept ${myText.length} line(s) of your own outside the kit's text; check where they landed.`);
  }
  return merged.join("\n").split("\n");
}

if (exists("CLAUDE.md")) {
  const mine = readText("CLAUDE.md");
  let text = mergeClaude(mine, fs.readFileSync(path.join(kit, "CLAUDE.md"), "utf8"), pastVersions("kit/CLAUDE.md"));
  if (text !== mine) {
    write("CLAUDE.md", text);
    out.merged.push("CLAUDE.md");
  }
}

// 5. settings.json: kit entries replace the kit's old ones; entries the kit never had stay.
const SETTINGS = ".claude/settings.json";
if (exists(SETTINGS)) {
  const mine = JSON.parse(readText(SETTINGS));
  const theirs = JSON.parse(fs.readFileSync(path.join(kit, ".claude", "settings.json"), "utf8"));
  if (!project.humanize) delete theirs.enabledPlugins?.["humanizer@humanizer"];
  const past = pastVersions("kit/.claude/settings.json").map((t) => {
    try {
      return JSON.parse(t);
    } catch {
      return {};
    }
  });
  const pastSet = (pick) => new Set(past.flatMap(pick));
  const map = (a = {}, b = {}, old, kitWins) => {
    const r = {};
    for (const [k, v] of Object.entries(b)) r[k] = !kitWins && k in a ? a[k] : v;
    for (const [k, v] of Object.entries(a)) if (!(k in b) && !old.has(k)) r[k] = v;
    return r;
  };
  const list = (a = [], b = [], old) => [...b, ...a.filter((x) => !b.includes(x) && !old.has(x))];
  const commands = (groups = []) => groups.flatMap((g) => (g.hooks || []).map((h) => h.command));
  const merged = { ...mine };
  for (const k of Object.keys(theirs)) if (!(k in merged)) merged[k] = theirs[k];
  merged.extraKnownMarketplaces = map(mine.extraKnownMarketplaces, theirs.extraKnownMarketplaces, pastSet((s) => Object.keys(s.extraKnownMarketplaces || {})), true);
  // Plugins: every plugin the project has stays (setup enables the design plugins); the kit's new ones are added.
  merged.enabledPlugins = { ...theirs.enabledPlugins, ...mine.enabledPlugins };
  for (const p of Object.keys(mine.enabledPlugins || {})) {
    if (!(p in (theirs.enabledPlugins || {})) && past.some((s) => s.enabledPlugins?.[p]) && !/frontend-design|ui-ux-pro-max|humanizer/.test(p)) {
      out.notes.push(`The kit no longer enables the plugin ${p}; remove it from ${SETTINGS} if you do not use it.`);
    }
  }
  merged.permissions = { ...mine.permissions, ...theirs.permissions,
    allow: list(mine.permissions?.allow, theirs.permissions?.allow, pastSet((s) => s.permissions?.allow || [])),
    deny: list(mine.permissions?.deny, theirs.permissions?.deny, pastSet((s) => s.permissions?.deny || [])) };
  const oldCommands = pastSet((s) => Object.values(s.hooks || {}).flatMap(commands));
  merged.hooks = { ...theirs.hooks };
  for (const [event, groups] of Object.entries(mine.hooks || {})) {
    const own = groups.filter((g) => commands([g]).some((c) => !oldCommands.has(c) && !commands(theirs.hooks?.[event]).includes(c)));
    if (own.length) merged.hooks[event] = [...(merged.hooks[event] || []), ...own];
  }
  const text = JSON.stringify(merged, null, 2) + "\n";
  if (JSON.stringify(merged) !== JSON.stringify(mine)) {
    write(SETTINGS, text);
    out.merged.push(SETTINGS);
  }
}

// 6. The rest: docs folders, .gitignore lines, the secret-check hook, START-HERE, the project record.
for (const f of ["docs/product/cr", "docs/product/dec", "docs/product/stories", "docs/product/milestones", "docs/product/handover", "docs/tech/spec", "docs/tech/adr",
  "docs/tech/test-cases", "docs/tech/test-reports", "docs/tech/ops", "docs/reports", "docs/releases"]) {
  if (!exists(f)) {
    write(`${f}/.gitkeep`, "");
    out.added.push(`${f}/`);
  }
}
const ignore = exists(".gitignore") ? readText(".gitignore") : "";
const needed = [".env", ".env.*", "!.env.example", ".claude/role", ".claude/settings.local.json", "node_modules/", "dist/"].filter((l) => !ignore.split("\n").includes(l));
if (needed.length) {
  write(".gitignore", `${ignore}${ignore && !ignore.endsWith("\n") ? "\n" : ""}# Crewbook\n${needed.join("\n")}\n`);
  out.merged.push(`.gitignore (+${needed.length} lines)`);
}
const hooksDir = path.join(path.resolve(root, git(root, ["rev-parse", "--git-common-dir"]).trim()), "hooks");
const hook = path.join(hooksDir, "pre-commit");
const hookText = fs.readFileSync(path.join(kit, "hooks", "pre-commit"));
if (!fs.existsSync(hook) || lf(fs.readFileSync(hook, "utf8")) !== lf(hookText.toString())) {
  if (!dry) {
    fs.mkdirSync(hooksDir, { recursive: true });
    fs.writeFileSync(hook, hookText);
    try { fs.chmodSync(hook, 0o755); } catch {}
  }
  out.replaced.push(".git/hooks/pre-commit (not in git; every worktree uses it)");
}
for (const f of ["docker-compose.yml", "docker/app.Dockerfile", ".dockerignore"]) {
  const kitFile = path.join(kit, "docker", path.basename(f));
  const changed = project.kitVersion && git(playbook, ["diff", "--quiet", project.kitVersion, "HEAD", "--", `kit/docker/${path.basename(f)}`]) === null;
  if (changed) out.notes.push(`${f} is yours, so it was not changed; the kit's ${path.relative(playbook, kitFile).split(path.sep).join("/")} has changed since your version: compare them.`);
}
const main = mainCheckout(root);
const retired = Object.keys(RETIRED_ROLES).filter((r) => fs.existsSync(worktreePath(main, r)));
if (retired.length) out.notes.push(`Retired roles: ${retired.map((r) => `${r} (its work goes to ${RETIRED_ROLES[r]})`).join(", ")}. The Lead moves their open work, the owner closes their sessions, then removes each worktree: git worktree remove "${worktreePath(main, retired[0])}".`);
if (!project.models) out.notes.push("Models: chosen per task now (rule \"Models\"); the project runs the claude mode. For DeepSeek on the Dev, Frontend and Test: /cb-model mode deepseek.");
// START-HERE: one template, kit-owned.
{
  const rel = ".claude/start-here.md";
  const text = fs.readFileSync(path.join(kit, "start-here.md"));
  if (!exists(rel) || readText(rel) !== lf(text.toString())) {
    write(rel, text);
    (exists(rel) ? out.replaced : out.added).push(rel);
    if (/^english$/i.test(project.language || "English")) {
      if (!dry) renderStartHere(root, project, mainCheckout(root));
      out.merged.push("START-HERE.md (rendered again from the new template)");
    } else out.notes.push(`START-HERE.md: the template changed. The Lead rewrites START-HERE.md in ${project.language} from .claude/start-here.md.`);
  }
}

// What changed in the kit since the project's version (estimated from its first commit when it has none).
let from = project.kitVersion;
let estimated = false;
if (!from) {
  const first = git(root, ["log", "--reverse", "--format=%cI"])?.split("\n")[0];
  from = first && git(playbook, ["rev-list", "-1", `--before=${first}`, "HEAD"])?.trim();
  estimated = Boolean(from);
}
// New kit decisions: rows whose ID the old decision log did not have (or, without one, dated from that version on).
let decisions = [];
if (from) {
  const ids = (t) => new Set([...(t || "").matchAll(/^\| (DEC-\d+) \|/gm)].map((m) => m[1]));
  const before = git(playbook, ["show", `${from}:docs/spec/decisions.md`]);
  const known = ids(before);
  const since = before ? "" : (git(playbook, ["log", "-1", "--format=%cs", from]) || "").trim();
  decisions = [...lf(fs.readFileSync(path.join(playbook, "docs", "spec", "decisions.md"), "utf8")).matchAll(/^\| (DEC-\d+) \| ([\d-]+) \| ([^|]+)\|.*\| ([^|]*) \|$/gm)]
    .filter((m) => !known.has(m[1]) && m[2] >= since && !/Superseded/i.test(m[4]))
    .sort((x, y) => x[1].localeCompare(y[1]))
    .map((m) => `${m[1]}: ${m[3].trim().split(/(?<=\.)\s/)[0].slice(0, 120)}`);
}
if (version && !dry) writeProject(root, { ...readProject(root), kitVersion: version });

// 7. Report
const short = (v) => (v ? v.slice(0, 7) : "unknown");
const show = (title, list) => list.length && console.log(`\n${title} (${list.length}):\n  ${list.join("\n  ")}`);
console.log(`${dry ? "Dry run: nothing was written. " : ""}Crewbook kit update for ${project.name || path.basename(root)}: ${short(project.kitVersion) === "unknown" ? `no recorded version${estimated ? ` (about ${short(from)}, from the project's first commit)` : ""}` : short(project.kitVersion)} → ${short(version)}`);
show("Added", out.added);
show("Replaced (untouched kit files)", out.replaced);
show("Replaced, and they had changes made in this project (check the diff)", out.yoursReplaced);
show("Removed (no longer in the kit, never changed here)", out.removed);
show("Merged", out.merged);
show("Kept, because this project changed them (compare with the kit by hand)", out.kept);
show("Notes", out.notes);
show("Kit decisions since your version", decisions.length > 25 ? [...decisions.slice(-25), `(and ${decisions.length - 25} earlier ones in docs/spec/decisions.md of the kit)`] : decisions);
const nothing = !out.added.length && !out.replaced.length && !out.yoursReplaced.length && !out.removed.length && !out.merged.length;
console.log(nothing ? "\nThe project already has this kit version." : `
Next (Lead): review git diff, run the project's tests, commit "chore(kit): update Crewbook kit to ${short(version)} (#n)" and open a PR into dev.
After the merge: node scripts/plugins.mjs · node scripts/setup-labels.mjs; every session merges dev and restarts.`);
