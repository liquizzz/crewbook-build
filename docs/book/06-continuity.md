# Chapter 6: Continuity

**Purpose:** close, compact or move any session and have it continue within a minute, without retelling anything.

**Why it works:** work lives in GitHub issues (tasks, hand-offs, small decisions), repo documents (SRS, specs, CRs or change requests, DECs and ADRs, which record business and technical decisions, and reports) and git (code). Messages between sessions only notify, with a link. Every decision is written down the moment it is made.

## 1. Restart a session

**What it does:** brings a closed or confused session back to its work.

**You do:** open a new session in the role's folder (its worktree). It knows its role and recovers by itself; to be sure, say:
> Read CLAUDE.md and continue as `<role>`.

**Claude does:** reads `CLAUDE.md` and its role file; checks `git status` and recent commits; lists its issues and reads the last comment on each (the Lead also reads the latest report and the milestone file); reports in three lines: working on · where it stands · next step.

**You check:** the three lines match what you expect. If not, say what is wrong; the session corrects from the issue.

## 2. Hand work to another role (nothing to ask)

**Claude does:** whenever work changes hands, the sender posts a hand-off note on the issue:
```
## Hand-off: <from> → <to>
- Task: #42 <title> · Status: Done / Needs changes / Blocked
- Commit: role/dev1 @ a1b2c3d · Level: L2 · Module: auth
- Done: … · Next for the receiver: … · Notes / risks: …
```
Team members also comment when they start, finish a major part, get blocked or finish.

A session never does another role's work. If you ask one for it, you get a hand-off block instead: the session to open and a prompt in its own code block, which you paste into that role's session.

## 3. Trace a change

**What it does:** answers "why does it work like this?" months later, from the record, so a fix or change starts from facts instead of memory.

**Ask the Lead:**
> Why does `<behaviour>` work like this? Trace it.

**Claude asks you:** which screen, feature or version, if the behaviour is ambiguous.

**Claude does:** finds the requirement in the SRS (`FR-xxx`, its origin and version), the CR and its acceptance criteria, the DEC or ADR behind it, the PRs and commits that built it and the release that shipped it; answers in a short chain: *FR-021 → CR-12 (DEC-4) → PR #47 → v1.4.0*, with links.

**You check:** the chain. To change the behaviour, ask the Lead for a change that references it: a CR if the client gets something different, an ADR if only the way it is built changes ([chapter 4](04-delivery-loop.md)).

## 4. Compact a long session

**What it does:** frees context without losing the thread.

**Ask the session** after it finishes a task, not in the middle of a fix:
> Save your state to the issue, then I will compact.

**Claude does:** writes any unwritten decision or progress to the issue or document, commits and pushes its branch, confirms.

**You do:** type `/compact`. The compact instructions in `CLAUDE.md` keep role, current issue, branch and last commit, decisions, items waiting for you and open risks. To drop only a side discussion, press Esc twice (rewind) and pick "Summarize from here".

Devs and the Lead need this less: the Lead clears a Dev's context after each merged task, and its own after G2 and after each release ([chapter 9](09-token-budget.md#start-fresh-contexts)).

## 5. Work from a second machine

**What it does:** lets you follow and approve while away from the main machine.

**You do:** read reports and PRs on GitHub (web or mobile); drive the main machine's sessions remotely (Remote Control / claude.ai). Never open a second session for a role that is already running.

## 6. Move the team to another machine

**Ask the Lead** on the old machine:
> We are moving the team to another machine. Get every role ready.

**Claude does:** asks each running session to commit and push its branch; lists the worktrees to recreate.

**You do:** on the new machine clone the repo and run `node scripts/new-role-worktree.mjs lead` in it. Open the Lead's session in the folder it creates and ask:
> Recreate the worktrees for `<roles>`.

Then open each role's session with the restart sentence. Fill in each `.env.local` yourself.

## 7. Get the newest kit

**What it does:** brings a project that already runs up to the newest Crewbook kit, so a long project gets the kit's fixes too.

**Ask the Lead:**
> /cb-update

**Claude does:** fetches crewbook-build; shows you the kit versions, the kit decisions that change how you work, and what happens to each file; on your yes, replaces the kit files, keeps your own (Docker files, workflows you changed, `docs/`), merges `CLAUDE.md` (your description, Stage, Open decisions, stack and rules stay) and `.claude/settings.json` (your plugins and permissions stay); runs the tests and opens a PR into `dev`.

**You check:** the list of files it kept because you changed them, and the PR. A kit update always waits for your OK, even with auto-merge on.

**Claude asks before:** the update itself, and the merge. After the merge it tells every running session to merge `dev` and restart.

An update from an older kit can also bring:
- renamed commands: they all start with `/cb-` now (`/cb-build` instead of `/build`, `/cb-update` instead of `/kit-update`); the Lead tells you once;
- retired roles: the PO's work goes to the Lead, Dev3's and Dev4's modules to Dev1 or Dev2. The Lead proposes who takes each open issue; you close those sessions once their work is merged;
- your own `scripts/ci-local.mjs` is kept until its steps are in `scripts/ci-steps.json`; the Lead moves them in the same PR;
- no model mode yet: the Lead asks you which one (`claude`, `deepseek` or `mix`).

A project made before `/cb-update` existed runs the update once by hand: `node <crewbook-build>/kit/update.mjs --dry-run` in the Lead's folder ([How to run](../../HOW-TO-RUN.md)).

> **Token tip:** a fresh session with the restart sentence is often cheaper than a long, compacted one; restart instead of compacting a second time.

Next: [Chapter 7: Front-end projects](07-frontend-projects.md).
