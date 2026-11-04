# Appendix C: FAQ and troubleshooting

**Purpose:** quick answers to the questions and problems that come up most.

## Working with sessions

**A session drafts something that is wrong.**
Sessions draft first, because redoing costs them minutes. Say what to change, in your own words, or point at the part that is wrong; it redoes the draft and shows what changed. Its guesses are marked ⚠️, so check those first.

**A session skipped a skill, for example said "done" without the verification step.**
You do not have to name skills: each session is reminded of its skills when it starts. If one still skips a step, say "Follow the Skills table in CLAUDE.md and redo the last step."

**A session asks too many questions.**
Each step may ask at most three questions together, each with a suggested answer. If it asks more, or asks before it shows a draft, say: "Follow 'AI does the work; the owner decides' in CLAUDE.md: draft first, then ask." Say "you decide" for the topics you do not care about; it settles them and lists its assumptions.

**A session forgot what it was doing.**
Open a new session in the same folder: it recovers its state from the issues and git. You can also say "Read CLAUDE.md and continue as `<role>`." If it still drifts, ask the Lead: "Post the current state of #42 on the issue", then restart the session.

**Two sessions edited the same thing.**
That should not happen: each role has its own worktree and paths. Ask the Lead: "Check which paths each role touched in the last day and fix the overlap." Review `.claude/ownership.json`.

**I want to talk to Dev directly.**
That is normal while building: type `/cb-build try #<n>` or `/cb-build done #<n>` in Dev1 for a task it has. Anything new goes to the Lead (a feature added or cut becomes a CR, a change in how it is built an ADR, a fault a defect), so the plan and the issues stay in step.

## Guardrails

**"[role-guard] Role "dev1" may only push role/dev1".**
Working as intended: only the Lead pushes shared branches. The Dev should open a PR and send the Lead the link.

**"[role-guard] No role found in .claude/role".**
The session runs outside a role worktree. Ask the Lead: "Create the worktree for `<role>`", then open the session there.

**"Role X does not own <path>".**
Either the work belongs to another role (ask through the issue), or the project's folders differ from the defaults. Ask the Lead: "Add `<path>` to `<role>` in ownership.json."

**I approved a prompt by mistake.**
Approval prompts only cover pushes of `main` / `production`, tags, releases and workflow runs. Ask the Lead: "Undo the last release step" (revert, delete the tag, or redeploy the previous tag).

## Process

**I have never written code. Can I use this?**
Yes. The sessions write the code, the tests and the documents; you describe what you want, correct their drafts and approve each gate. Install the tools once with [How to run](../../HOW-TO-RUN.md), then follow the [Quick start](00-introduction.md#quick-start-from-idea-to-demo).

**My project was made with the old Starter level.**
Run `node scripts/set-level.mjs lite` in the Lead's worktree. Nothing is deleted.

**My project runs on an older kit.**
Type `/cb-update` in the Lead session ([chapter 6](06-continuity.md#7-get-the-newest-kit)). Without that command, run `node <crewbook-build>/kit/update.mjs --dry-run` in the Lead's folder once, then ask the Lead to apply it and open a PR.

**A document is full of technical words.**
Every document must be readable on the first read, and a technical one opens with "In short". Say: "Rewrite `<file>` in plain language, following the rule in CLAUDE.md."

**I cannot picture what the product will look like.**
Give the Lead a one-line idea and ask for screens first: it sketches 2-3 grey screens you can click through, and you react to them. The proposal follows from what the screens show ([chapter 3](03-foundation.md)).

**Do I really need an SRS for a small change?**
Yes. Even a one-line requirement change updates the SRS, so the SRS stays true. For L0 display changes with no requirement change, the SRS is untouched.

**The milestone keeps growing.**
Ask the Lead: "What did we take into this milestone, and what is the buffer left?" Move anything that does not fit to the next milestone.

**A Dev keeps failing on one task.**
It stops by itself after two red tries and tells the Lead, which gives it a stronger model, splits the task or does the hard part ([chapter 4](04-delivery-loop.md#10-a-task-is-stuck)). To see which model each session runs on, type `/cb-model` in the Lead.

**Can two Devs work at once?**
Yes, when the milestone has two workstreams that do not touch each other. Type `/cb-add-dev` in the Lead ([chapter 4](04-delivery-loop.md#9-add-a-second-dev)). The kit has at most two Devs.

**A client asks for a change by email.**
Paste it to the Lead: "Client request: …", with the email's date and sender. It becomes a CR with that request, the impact and price, and the client's approval when it comes, and a row in `docs/product/changes.md`, so you can show later what was asked and what it cost.

**The owner is away for a few days.**
Tell the Lead: "I am away until `<date>`. Keep working on approved items only; queue every decision for my return." Nothing that needs you will happen; work continues on what is already approved.

## Tools

**`init.mjs` says Docker is missing.**
Docker is required. Install Docker Desktop (Windows, macOS) or Docker Engine with the Compose plugin (Linux), check `docker compose version`, then run init again. If it says Docker is not running, start Docker Desktop.

**Codex review fails or is out of quota.**
The Lead reports it; reply "use /code-review instead" or "skip".

**`gh` says it lacks the `project` scope.**
Run `gh auth refresh -s project` yourself in a terminal.

**CI never runs on a new repo, and the tag builds no image.**
Open the repo's Actions tab on GitHub. If it says "Workflows aren't being run on this repository", click **Enable Actions on this repository**. The API can report Actions as enabled before you do this, so only the page shows it. Pushes made earlier do not run again: push once more, or use **Run workflow**.

**I see no kanban board.**
Run `node scripts/setup-board.mjs` in the project (it needs `gh auth refresh -s project`). It creates a GitHub Project linked to the repo with Crewbook's columns. Open it once and choose View → Layout → Board: GitHub's API cannot set the layout.

**The release image cannot be pulled (`denied` or `unauthorized`).**
Images of a private repo are private too. `node scripts/run.mjs` logs in for you with the gh CLI; if it still fails, run `gh auth refresh -s read:packages` once and try again.

**GitHub Actions minutes run out (GitHub Free).**
Ask DevOps or the Lead: "Reduce CI minutes: cache dependencies and skip workflows for docs-only changes."
