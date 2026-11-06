#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// The weekly measures (/cb-progress report, rule "Measuring" in CLAUDE.md), from the local Claude Code transcripts and
// the project's GitHub issues:
//   node scripts/usage.mjs [--days 7 | --since YYYY-MM-DD [--until YYYY-MM-DD]] [--project <path>] [--no-github] [--json]
// - tokens and an API-equivalent cost per role and model (each message counted once), and per task and level: a call
//   counts for the role's task open at that time (between its "Started #n" comment and its close) that started last;
// - per level: tasks closed, first-try passes (no "Needs changes", no move up), fix rounds, moves up and their causes,
//   hours from start to merge;
// - the owner's interventions: the messages the owner typed in the sessions;
// - defects opened, by severity, and by the level and model of the task that caused them ("Caused by").
// --project points at another project (its main checkout), for a baseline: the round-4 project before the new kit.
// The cost is an estimate at list prices (PRICES below); on a subscription it shows where the usage goes, not a bill.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { mainCheckout, readProject, worktreePath } from "./project-level.mjs";

// USD per million tokens: input, output, cache read; a cache write costs 1.25 x input. Edit when the prices change.
const PRICES = { opus: [4, 20, 0.2], sonnet: [2, 10, 0.2], haiku: [0.1, 0.5, 0.01] };
const args = process.argv.slice(2);
const opt = (n) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const until = opt("until") ? Date.parse(`${opt("until")}T23:59:59`) : Date.now();
const since = opt("since") ? Date.parse(`${opt("since")}T00:00:00`) : until - Number(opt("days") || 7) * 86400000;
const root = opt("project") ? path.resolve(opt("project")) : mainCheckout();
const project = readProject(root) || {};
const projectsDir = process.env.CLAUDE_PROJECTS_DIR || path.join(os.homedir(), ".claude", "projects");
const family = (model) => Object.keys(PRICES).find((k) => String(model).includes(k)) || "other";
const cost = (m, u) => {
  const p = PRICES[family(m)];
  return p ? ((u.input_tokens || 0) * p[0] + (u.cache_creation_input_tokens || 0) * p[0] * 1.25 + (u.cache_read_input_tokens || 0) * p[2] + (u.output_tokens || 0) * p[1]) / 1e6 : 0;
};
const tokens = (u) => (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.output_tokens || 0);

// 1. The roles' folders and their transcript folders (Claude Code names them after the path, every other character "-").
const mangle = (p) => path.resolve(p).replace(/[^a-zA-Z0-9]/g, "-");
const wtRoot = path.join(path.dirname(root), `${path.basename(root)}-wt`);
const roles = fs.existsSync(wtRoot) ? fs.readdirSync(wtRoot).filter((r) => fs.statSync(path.join(wtRoot, r)).isDirectory()) : [];
const dirs = fs.existsSync(projectsDir) ? fs.readdirSync(projectsDir) : [];
const roleOf = {};
for (const r of roles) {
  const m = mangle(worktreePath(root, r));
  for (const d of dirs) if (d === m || d.startsWith(`${m}-`)) roleOf[d] = r;
}

// 2. The transcripts: each assistant message once (by id), the owner's own messages.
const seen = new Set();
const calls = []; // { role, ts, model, usage }
const owner = {}; // role -> count
for (const [dir, role] of Object.entries(roleOf)) {
  for (const f of fs.readdirSync(path.join(projectsDir, dir)).filter((x) => x.endsWith(".jsonl"))) {
    const file = path.join(projectsDir, dir, f);
    if (fs.statSync(file).mtimeMs < since) continue;
    const rl = readline.createInterface({ input: fs.createReadStream(file) });
    for await (const line of rl) {
      let o;
      try {
        o = JSON.parse(line);
      } catch {
        continue;
      }
      const ts = Date.parse(o.timestamp || "");
      if (!ts || ts < since || ts > until) continue;
      const m = o.message;
      if (o.type === "assistant" && m?.usage && m.model) {
        if (m.id && seen.has(m.id)) continue;
        if (m.id) seen.add(m.id);
        calls.push({ role, ts, model: m.model, usage: m.usage });
      } else if (o.type === "user" && !o.isMeta && m) {
        const text = typeof m.content === "string" ? m.content : (m.content || []).filter((c) => c.type === "text").map((c) => c.text).join(" ");
        if (text.trim() && !/^\s*</.test(text) && !(m.content || []).some?.((c) => c.type === "tool_result")) owner[role] = (owner[role] || 0) + 1;
      }
    }
  }
}
const sum = (list) => list.reduce((a, c) => ({ tokens: a.tokens + tokens(c.usage), usd: a.usd + cost(c.model, c.usage), calls: a.calls + 1 }), { tokens: 0, usd: 0, calls: 0 });

// 3. GitHub: the tasks and defects touched in the window.
let issues = [];
if (!args.includes("--no-github") && project.repo) {
  try {
    issues = JSON.parse(execFileSync("gh", ["issue", "list", "--repo", project.repo, "--state", "all", "--limit", "300", "--search", `updated:>=${new Date(since).toISOString().slice(0, 10)}`, "--json", "number,title,labels,createdAt,closedAt,comments"], { stdio: ["ignore", "pipe", "ignore"], maxBuffer: 1 << 28 }).toString());
  } catch {
    console.error("! GitHub not read (gh missing or not signed in): only the tokens are measured.");
  }
}
const label = (i, re) => i.labels.map((l) => l.name).find((n) => re.test(n));
const tasks = [];
const defects = [];
for (const i of issues) {
  const level = label(i, /^L[0-3]$/);
  const role = (label(i, /^role:/) || "").replace("role:", "");
  if (label(i, /^defect$/) && Date.parse(i.createdAt) >= since) {
    const cause = (i.comments.map((c) => c.body).join("\n") + " " + i.title).match(/Caused by[^#\n]*#(\d+)/i);
    defects.push({ number: i.number, sev: (label(i, /^sev:/) || "sev:?").replace("sev:", ""), caused: cause ? Number(cause[1]) : null });
    continue;
  }
  if (!level || !i.closedAt || Date.parse(i.closedAt) < since) continue;
  const started = i.comments.find((c) => /^Started #/i.test(c.body.trim()));
  const start = started ? Date.parse(started.createdAt) : Date.parse(i.createdAt);
  const end = Date.parse(i.closedAt);
  const fixes = i.comments.filter((c) => /Needs changes/i.test(c.body)).length;
  const moves = i.comments.filter((c) => /^Model: .*→/m.test(c.body)).length;
  const causes = i.comments.flatMap((c) => [...c.body.matchAll(/Stuck: (environment|request|reasoning|scope)/gi)].map((m) => m[1].toLowerCase()));
  tasks.push({ number: i.number, level, role, start, end, hours: (end - start) / 3600000, fixes, moves, causes, first: fixes === 0 && moves === 0 });
}
// Each call counts for one task at most: the role's task open at that time that started last.
const owned = new Map(tasks.map((t) => [t, []]));
for (const c of calls) {
  const t = tasks.filter((x) => (c.role === x.role || c.role.replace(/\d+$/, "") === x.role) && c.ts >= x.start && c.ts <= x.end).sort((a, b) => b.start - a.start)[0];
  if (t) owned.get(t).push(c);
}
for (const [t, own] of owned) {
  const models = {};
  for (const c of own) models[family(c.model)] = (models[family(c.model)] || 0) + tokens(c.usage);
  Object.assign(t, sum(own), { model: Object.entries(models).sort((a, b) => b[1] - a[1])[0]?.[0] || "?" });
}
for (const d of defects) {
  const t = tasks.find((x) => x.number === d.caused);
  Object.assign(d, { level: t?.level || "?", model: t?.model || "?" });
}

// 4. The report.
const day = (t) => new Date(t).toISOString().slice(0, 10);
const fmt = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n));
const byRole = {};
for (const c of calls) {
  const k = `${c.role}|${family(c.model)}`;
  (byRole[k] ??= []).push(c);
}
const total = sum(calls);
const median = (xs) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : 0);
const levels = ["L0", "L1", "L2", "L3"].map((l) => {
  const t = tasks.filter((x) => x.level === l);
  return { level: l, tasks: t.length, first: t.filter((x) => x.first).length, fixes: t.reduce((a, x) => a + x.fixes, 0), moves: t.reduce((a, x) => a + x.moves, 0), hours: median(t.map((x) => x.hours)), tokens: t.reduce((a, x) => a + x.tokens, 0), usd: t.reduce((a, x) => a + x.usd, 0) };
});
const result = { project: project.name || path.basename(root), from: day(since), to: day(until), total, byRole: Object.fromEntries(Object.entries(byRole).map(([k, v]) => [k, sum(v)])), levels, tasks, owner, defects };
if (args.includes("--json")) {
  console.log(JSON.stringify(result, null, 1));
  process.exit(0);
}
const out = [];
out.push(`## Measures ${result.from} to ${result.to}: ${result.project}`, "", `Total: ${fmt(total.tokens)} tokens in ${total.calls} model calls, about $${total.usd.toFixed(0)} at list prices.`, "");
out.push("| Role | Model | Calls | Tokens | Cost |", "|---|---|---|---|---|");
for (const [k, v] of Object.entries(result.byRole).sort((a, b) => b[1].usd - a[1].usd)) {
  const [r, m] = k.split("|");
  out.push(`| ${r} | ${m} | ${v.calls} | ${fmt(v.tokens)} | $${v.usd.toFixed(0)} |`);
}
out.push("", "| Level | Tasks | First try | Fix rounds | Moves up | Hours to merge (median) | Tokens | Cost |", "|---|---|---|---|---|---|---|---|");
for (const l of levels) out.push(`| ${l.level} | ${l.tasks} | ${l.first} | ${l.fixes} | ${l.moves} | ${l.hours.toFixed(1)} | ${fmt(l.tokens)} | $${l.usd.toFixed(0)} |`);
const causes = tasks.flatMap((t) => t.causes);
if (causes.length) out.push("", `Stuck causes: ${["environment", "request", "reasoning", "scope"].map((c) => `${c} ${causes.filter((x) => x === c).length}`).join(", ")}.`);
out.push("", `The owner's messages: ${Object.entries(owner).map(([r, n]) => `${r} ${n}`).join(", ") || "none"}.`);
out.push(`Defects opened: ${defects.length}${defects.length ? ` (${defects.map((d) => `#${d.number} ${d.sev}, from ${d.level} on ${d.model}`).join("; ")})` : ""}.`);
console.log(out.join("\n"));
