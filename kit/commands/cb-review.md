---
description: Force a Codex review of a PR (Lead only): runs it, posts the findings on the PR, fixes or rejects each
argument-hint: "[#PR] [standard|adversarial] [focus]"
---

Codex review: **$ARGUMENTS**. A manual step: it runs when the owner types this, never by itself, and it always uses Codex. You are the Lead; in another session, end with the hand-off block for the Lead (prompt: `/cb-review <arguments>`) and stop.

1. **Find the PR.** The number in the arguments, else the one PR in review (`gh pr list --state open`); with several, ask which, once. Read its task issue for the change level and what it touches.
2. **Choose the kind.** `adversarial` (challenges the approach and design; a focus text may follow it) for an L3 change, anything touching money, security or user data, and before a release; otherwise `standard`. The arguments win over this rule.
3. **Run it.** `node scripts/codex-review.mjs <#PR> <kind> [focus]`, as a background command (Codex can take several minutes); tell the owner in one line that it started. It reviews the PR's diff against `dev` in a throw-away worktree and prints Codex's output. If the plugin is missing, the script says how the owner installs it (once per machine); if Codex fails or is out of quota, say so plainly and stop: this is not a pass, and you do not switch to another reviewer. Offer Claude's `/code-review` only as a separate step, and only if the owner wants it.
4. **Post it.** Add the label `codex-review` to the PR (`gh pr edit <n> --add-label codex-review`) and comment Codex's findings on it, unchanged, with the kind and the commit reviewed (`gh pr comment <n> --body-file <file>`).
5. **Decide each finding.** Group them by severity. A finding you accept: send it to the PR's author as "Needs changes" (rule "PR review" in `CLAUDE.md`: the issue goes back to In progress, the points go to the Dev). A finding you reject: one line on the PR with the reason. Never fix code yourself in the Dev's branch.
6. **Report** in three lines: the kind and the commit, the counts (accepted, rejected, open), and whether the PR can go on to merge. A Codex review that found something serious is the owner's decision to merge past, as with any review the Lead cannot settle.
