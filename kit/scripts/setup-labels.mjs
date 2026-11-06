#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// Create or update the playbook's GitHub labels in the current repo (needs the gh CLI).
// Run:  node scripts/setup-labels.mjs
import { execFileSync } from "node:child_process";

const LABELS = [
  ["cr", "1d76db", "Change request (parent issue)"],
  ["type:feature", "0e8a16", "New capability; bumps MINOR"],
  ["type:change", "fbca04", "Changed behaviour; bumps MINOR"],
  ["type:fix", "d93f0b", "Fix only; bumps PATCH"],
  ["breaking", "b60205", "From 1.0.0: breaks what runs in production; bumps MAJOR"],
  ["L0", "c5def5", "Change level: display, no logic"],
  ["L1", "bfd4f2", "Change level: setting or small logic"],
  ["L2", "7fa7e0", "Change level: module logic or API contract"],
  ["L3", "3e6fb0", "Change level: core, money, security, data"],
  ["role:dev", "5319e7", "Dev task (backend, infrastructure)"],
  ["role:frontend", "5319e7", "Frontend task"],
  ["role:test", "5319e7", "Test task"],
  ["role:uiux", "5319e7", "UI/UX task"],
  ["defect", "e11d21", "Defect"],
  ["gate", "0052cc", "A foundation gate (G1, G2, G3): its documents, decisions and the owner's approval"],
  ["decision", "d4c5f9", "A choice the owner left for later; see Open decisions in CLAUDE.md"],
  ["sev:high", "b60205", "Blocks a release; hotfix in production"],
  ["sev:medium", "f9a03f", "Blocks a release unless the owner accepts it"],
  ["sev:low", "fef2c0", "Does not block a release"],
  ["blocked", "000000", "Waiting on something outside the team"],
  ["needs-owner", "ff7619", "Waiting for the owner's decision"],
  ["codex-review", "ededed", "A Codex second opinion (/cb-review) ran on this PR"],
];

for (const [name, color, description] of LABELS) {
  execFileSync("gh", ["label", "create", name, "--color", color, "--description", description, "--force"], { stdio: "inherit" });
}
console.log(`${LABELS.length} labels ready.`);
