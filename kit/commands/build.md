---
description: Build work. "/build try" = quick, no tests, no merge. "/build done" = tests at the task's level, then merge. No argument = plan the milestone's tasks.
argument-hint: try [#n] | done [#n] | [milestone]
---

Build: **$ARGUMENTS**

Read `.claude/project.json` (level), `.claude/role` and the Open decisions in `CLAUDE.md`. If a decision the work needs is still open (for example the stack), ask for it now and record it; ask nothing else. If setup or the foundation (G1-G3) is not approved yet, say so and stop.

**`/build try [#n]`: quick build.** For when the owner wants to see something fast.
- Take the given issue, or the next Ready one assigned to you. Comment `Started #n` the first time and run `node scripts/board-status.mjs <n> "In progress"`.
- Write the code, run it, show the owner how to see it (the command or the URL). No tests, no merge.
- Commit `<type>(<module>): <summary> (#n)` and push `role/<role>`. The issue stays In progress.
- Report in two or three lines.

**`/build done [#n]`: build that merges.** For a task that is finished.
- Confirm the task's change level against the actual change (raise it if the change is wider, never lower it).
- Note the task's actual AI time on the issue.
- Make the tests for that level green, and only that level (rule "Change level" in `CLAUDE.md`): L0 build and a local look; L1 a unit test for the change; L2 module tests and the main scenario run locally (`superpowers:test-driven-development`); L3 also integration tests, edge cases and `security-review`.
- Merge `dev` in again. With CI on this machine (rule "Where CI runs"), run `node scripts/ci-local.mjs` and paste its PASS line in the PR. For L2-L3, run `code-review` on your own diff and fix what it finds; note it in the PR ("Self-review: code-review, 3 findings fixed").
- Run `superpowers:verification-before-completion`.
- Push `role/<role>`, open a PR into `dev` with `Closes #n` and the level, run `node scripts/board-status.mjs <n> "In review"`, and end with the hand-off block for the Lead (prompt: `Review the PR for #<n>.`). The Lead reviews by level (Skills table "PR review" in `CLAUDE.md`). When the Lead asks for changes, it moves the issue back to In progress: fix them on the same branch, push, run `node scripts/board-status.mjs <n> "In review"` again and end with the hand-off block for the Lead (prompt: `Review the fixes for #<n>.`). The Lead merges by itself when auto-merge is on (`/auto`), whatever the level, and asks the owner for every merge when it is off. After the merge, the Lead closes the issue and moves it to Done; at Full with per-task testing on (`/auto testing on`), an L1-L3 task goes to Testing first and the Test session closes it. A red CI run on `dev` or on `ci-local` is fixed first (`superpowers:systematic-debugging`).

**`/build [milestone]` (Lead): plan the milestone.** Split what is still too big with `superpowers:writing-plans`, set each task's level, role and estimate in AI time (rule "Estimates" in `CLAUDE.md`; split anything over 2 h), assign it, put it in Ready on the board. At Full a milestone with independent modules may run up to four Devs (rule "Several Devs" in `CLAUDE.md`): one module per Dev, its folders under its key in `.claude/ownership.json`, and the tasks on shared files first, each with one owner. Each role that gets work needs its worktree: if one is missing, propose it, and on the owner's OK create it from your own worktree (`node scripts/new-role-worktree.mjs <role>`). Open each session that starts for the owner (rule "Opening sessions" in `CLAUDE.md`, first message `/build try #<n>`), or give its hand-off block. At Full also hand Test the milestone (`Write the test cases for v<X.Y.Z>.`), so its test cases are ready before the regression.

Board columns (`node scripts/board-status.mjs <issue or PR> "<column>"`): In progress when you start, and again when the Lead asks for changes; In review while a PR waits for the Lead's review or the owner's merge, again after each pushed fix; Testing (Full with per-task testing on, L1-L3) from the merge until the Test session passes it; Done when it is merged after green CI (and tested, when it went to Testing). A PR with no task issue of its own (a docs PR) goes on the board itself: In review when it is opened, Done when it is merged.

When every issue of the milestone is closed, the next step is `/release demo` or `/release`; both run the full checks.
