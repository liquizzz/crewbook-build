#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// Set one secret for every checkout of the project:  node scripts/set-secret.mjs <NAME>
// The owner runs it and pastes the value when asked; nothing is shown on screen or printed.
// It writes NAME=value to the git-ignored .env.local of the main checkout and of every role worktree,
// so new worktrees get it too (scripts/new-role-worktree.mjs copies it). Run it again to change the value.
// DEEPSEEK_API_KEY also updates the roles that run on DeepSeek (scripts/model.mjs --apply).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const name = process.argv[2] || "";
if (!/^[A-Z][A-Z0-9_]*$/.test(name)) {
  console.error("Usage: node scripts/set-secret.mjs <NAME>   (capital letters, digits and _, for example GEMINI_API_KEY)");
  process.exit(1);
}
if (["DB_ADMIN_URL", "DB_PROJECT_URL", "DB_MANAGED_ADMIN_PASSWORD"].includes(name) || /_DATABASE_URL$/.test(name)) {
  console.error("Database connection strings are set with node scripts/db-setup.mjs connect (it checks them, keeps the admin in the main checkout only and writes each role's URL).");
  process.exit(1);
}
if (name === "PORT") {
  console.error("PORT is set per worktree by new-role-worktree.mjs; it is not a secret.");
  process.exit(1);
}

// Read the value without showing it: raw keyboard input in a terminal, plain stdin otherwise (scripts, tests).
function readHidden(prompt) {
  if (!process.stdin.isTTY) return Promise.resolve(fs.readFileSync(0, "utf8").split(/\r?\n/)[0]);
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    let value = "";
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", function onData(chunk) {
      for (const c of chunk) {
        if (c === "\r" || c === "\n") {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener("data", onData);
          process.stdout.write("\n");
          return resolve(value);
        }
        if (c === "\u0003") {
          process.stdout.write("\nStopped; nothing was changed.\n");
          process.exit(1);
        }
        if (c === "\u007f" || c === "\b") value = value.slice(0, -1);
        else value += c;
      }
    });
  });
}

const value = (await readHidden(`Paste the value for ${name} (it will not be shown), then press Enter: `)).trim();
if (!value) {
  console.error("No value given; nothing was changed.");
  process.exit(1);
}
if (/[\r\n]/.test(value)) {
  console.error("The value must be one line; nothing was changed.");
  process.exit(1);
}

const git = (args) => execFileSync("git", args, { stdio: ["ignore", "pipe", "pipe"] }).toString();
const checkouts = git(["worktree", "list", "--porcelain"]).split(/\r?\n/)
  .filter((l) => l.startsWith("worktree ")).map((l) => l.slice("worktree ".length));

let count = 0;
for (const dir of checkouts) {
  if (!fs.existsSync(dir)) continue;
  const file = path.join(dir, ".env.local");
  const lines = fs.existsSync(file) ? fs.readFileSync(file, "utf8").split(/\r?\n/).filter((l, i, all) => l !== "" || i < all.length - 1) : [];
  const kept = lines.filter((l) => !l.startsWith(`${name}=`));
  fs.writeFileSync(file, `${[...kept, `${name}=${value}`].join("\n")}\n`);
  count++;
}
console.log(`${name} set in .env.local of ${count} checkout${count === 1 ? "" : "s"} (git-ignored). Restart the app to use it.`);
// The DeepSeek key also goes into the settings of the roles that run on DeepSeek (scripts/model.mjs).
const modelScript = path.join(path.dirname(fileURLToPath(import.meta.url)), "model.mjs");
if (name === "DEEPSEEK_API_KEY" && fs.existsSync(modelScript)) {
  try {
    const out = execFileSync("node", [modelScript, "--apply"], { stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
    if (out) console.log(out);
  } catch {}
}
