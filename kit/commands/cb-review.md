---
description: A second opinion on a PR from Codex (Lead only): its review and a security pass, findings posted on the PR, each one accepted or rejected
argument-hint: "[#PR] [standard | adversarial [focus]]"
---

Codex review: **$ARGUMENTS**. The Claude reviews are the role's own (`code-review` at L2, also `security-review` at L3), run once before the PR; this is a second opinion from another tool. It runs when the owner types it, or when you proposed it and the owner agreed; never by itself. You are the Lead; in another session, end with the hand-off block for the Lead (prompt: `/cb-review <arguments>`) and stop.

1. **Find the PR.** The number in the arguments, else the one PR in review (`gh pr list --state open`); with several, ask which, once. Read its task issue for the level and what it touches.
2. **Run it.** `node scripts/codex-review.mjs <#PR> [standard | adversarial <focus>]` as a background command (Codex takes several minutes); tell the owner in one line that it started. With no kind it runs Codex's review, then an adversarial pass on security (permissions, input, secrets, personal data, deletes and money); `standard` is the review alone; `adversarial <focus>` is one pass with the owner's focus. It reviews the PR's diff against `dev` in a throw-away worktree at the PR's head.
3. **When it cannot run,** say so plainly and stop: the plugin not installed or not enabled (the script prints what the owner types to turn it on, then `/cb-review` again), Codex not signed in, no quota, or a failed run. That is never a pass, and no other reviewer runs instead.
4. **Post it.** Add the label `codex-review` to the PR and comment Codex's findings on it unchanged, with the passes run and the commit reviewed (`gh pr comment <n> --body-file <file>`).
5. **Decide each finding,** grouped by severity. Accepted: back to the PR's author as "Needs changes" (the issue goes back to In progress); after the fix, the author's own review runs again on what changed. Rejected: one line on the PR with the reason. Never fix code yourself in the author's branch.
6. **Report** in three lines: the passes and the commit, the counts (accepted, rejected, open), and whether the PR can go on to merge. A serious finding you cannot settle is the owner's decision to merge past.
