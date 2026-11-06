---
description: Build a task. "/cb-build try" = code and run it, no tests, no PR. "/cb-build done" = the checks of its level, your own review, then a PR.
argument-hint: try [#n] | done [#n]
---

Build: **$ARGUMENTS**

Read `.claude/role`, the task issue and its last hand-off. If setup is not done (`"setup": false` in `.claude/project.json`), say so and stop. The Lead splits milestones with `/cb-plan`; this command is for the role that builds the task.

**`/cb-build try [#n]`: quick build.** For when the owner wants to see something fast.
- Take the given issue, or the next Ready one assigned to you. Comment `Started #n` the first time and run `node scripts/board-status.mjs <n> "In progress"`.
- Write the code, run it from the source on your port, and show the owner how to see it (the command or the URL). No tests, no PR.
- Commit `<type>(<module>): <summary> (#n)` and push `role/<role>`. The issue stays In progress.
- Report in two or three lines.

**`/cb-build done [#n]`: build that leads to a merge.**
- Confirm the level and, for L3, the reach against the actual change (rule "Change level" in `CLAUDE.md`): raise them if the change is wider, never lower them.
- Run the checks of that level, and only those (rule "Change level"). Note the task's actual AI time on the issue.
- Merge `dev` in again. Run `node scripts/ci-local.mjs` when CI runs on this machine (rule "Where CI runs"); its PASS names the branch and `dev` commits.
- Your own review in a fresh context, on the final commit: `code-review` at L2-L3, `security-review` at L3 or when the task touches permissions, money, personal data or a secret. Fix the findings; a fix is a new commit, so review again what changed since. Run `superpowers:verification-before-completion`.
- **Stuck:** after two red tries, or twice the estimate, stop: no third try. Name the cause in the hand-off to the Lead (prompt: `#<n> is stuck: <cause>, <one line>.`): the environment or a tool (a database down, missing rights, a broken dependency), the request (missing or contradicting), the same wrong reasoning after the fixes, or a scope that grew. The Lead fixes the environment, clarifies the task, moves it up the model ladder or splits it (rule "Models").
- Push `role/<role>` and open a PR into `dev` from the template: `Closes #n`, the level and reach, the `ci-local` PASS line, the commit reviewed and the findings fixed. Run `node scripts/board-status.mjs <n> "In review"` and send the Lead `Review the PR for #<n>.` (rule "Hand-offs").
- When the Lead asks for changes the issue goes back to In progress: fix them on the same branch, review what changed, push, run `node scripts/board-status.mjs <n> "In review"` again and send `Review the fixes for #<n>.`
- After the merge, post the hand-off on the issue (rule "Hand-offs"): the Lead clears your session from it before your next task (rule "Fresh context"). A red CI run on `dev` or on `ci-local` is fixed first (`superpowers:systematic-debugging`).

Board columns (`node scripts/board-status.mjs <issue or PR> "<column>"`): In progress when you start, and again when the Lead asks for changes; In review while a PR waits for the Lead's review or the owner's merge, again after each pushed fix; Testing (per-task testing on, L1-L3) from the merge until the Test session passes it; Done when it is merged (and tested, when it went to Testing). A PR with no task issue of its own (a docs PR) goes on the board itself: In review when it is opened, Done when it is merged.

When every issue of the milestone is closed, the Lead's next step is `/cb-release demo`.
