# Chapter 5: Continue and maintain your project

← [Back: Chapter 4: Try, release and deploy](04-try-release-and-deploy.md) · [Contents](../../README.md#read-the-guide) · [Next: Chapter 6: Design and frontend](06-design-and-frontend.md) →

**Purpose:** close, clear or move any session and have it pick up its work within a minute, and notice at once when one has quietly stopped.

The work does not live in a session's memory. It lives in GitHub issues (tasks, hand-offs, decisions), in the repo's documents (requirements, CRs, ADRs, reports) and in git. A session that starts again reads them and knows where it is.

## 1. Restart a session

**What it does:** brings a closed or confused session back to its work.

**You do:** open a new session in the role's folder. Its start hook tells it its role and its recovery steps. To be sure, say:

> Read CLAUDE.md and continue as `<role>`.

**Claude does:** reads `CLAUDE.md` and its role file, checks `git status` and the recent commits, reads its open issues and the last hand-off on each, and reports in three lines: working on, where it stands, next step.

**You check:** the three lines match what you expected. If not, say what is wrong; the session corrects itself from the issue.

## 2. Fresh context, by phase

A long session pays for its whole history on every call, so the kit clears sessions when a phase ends, never by the clock:

| Session | Cleared |
|---|---|
| Dev, Frontend | After each merged PR, once the hand-off is on the issue |
| Test | When a test round ends and its report is written |
| UI/UX | After a design package is approved and its notes are saved |
| Lead | At the end of a big phase (the plan approved, a milestone accepted, a release out), after writing where things stand; `/compact` naming what to keep when a phase is still open but the context is full of noise |

The Lead clears the other sessions itself. A session with a PR in review, a retest waiting or work not pushed is never cleared. Switching a task's model is never a reason to clear.

## 3. A session that stopped

**What it does:** finds a session that stopped without a word (a usage limit, a crash, a closed window) before the whole milestone waits on it.

**Claude does:** whenever the Lead ends a step, and in `/cb-progress`, it looks at the roles with work in progress. A task with `Started #n` and no commit, comment or message for two hours, or an idle session whose task is still open, is stalled. The Lead reads that session's last lines, sends its prompt again when it can, and otherwise tells you in one line which session stopped, why if it knows (a usage limit says when it resets) and what waits on it.

**You do:** what the line asks: usually reopen the session, or wait for the limit to reset.

## 4. Trace a change

**What it does:** answers "why does it work like this?" months later, from the record.

**Ask the Lead:**

> Why does `<behaviour>` work like this? Trace it.

**Claude does:** finds the requirement, the CR and its acceptance criteria, the decision behind it, the PRs and the release, and answers in one chain with links: *FR-021 → CR-12 (DEC-4) → PR #47 → v1.4.0*.

**You check:** the chain. To change the behaviour, `/cb-change` with a reference to it.

## 5. Work away from the machine

Read reports and PRs on GitHub from the web or your phone, and drive the sessions remotely (Remote Control, claude.ai). Never open a second session for a role that is already running: two sessions on one branch overwrite each other.

## 6. Move the team to another machine

**Ask the Lead** on the old machine:

> We are moving the team to another machine. Get every role ready.

**Claude does:** has each session commit and push, takes a `staging` backup (`node scripts/db-setup.mjs backup`, saved under `~/.crewbook/backups/`), and lists the worktrees to recreate and the secrets the project uses (names only).

**You do,** on the new machine. Secrets and `.env.local` never travel in git, so the databases and their passwords are set up again there:
1. Clone the repo, run `node scripts/new-role-worktree.mjs lead`, open the Lead there and ask it to "recreate the worktrees".
2. Start the shared database server: `node scripts/hosts.mjs secret POSTGRES_PASSWORD`, then `node scripts/hosts.mjs shared up postgres-17`. If the old machine's server stays the shared one on your network, register it with `node scripts/hosts.mjs add db` instead.
3. `node scripts/db-setup.mjs create`: every database and login, with new passwords written into each worktree's `.env.local`. `db-setup.mjs check` confirms them.
4. Bring `staging` back: copy the backup file over and run `node scripts/db-setup.mjs restore <file> <project>_staging`. The other databases come back from their seed: ask the Lead to reset them.
5. `node scripts/set-secret.mjs <NAME>` for each other secret on the list (API keys and the like).

`db-setup.mjs env` only copies connection strings that already sit in the main checkout's `.env.local`, so it helps after adding a worktree, never on a fresh machine.

## 7. Get the newest kit

**What it does:** brings a running project up to the newest Crewbook kit, so a long project gets every fix too.

**Ask the Lead:**

> /cb-update

**Claude does:** fetches crewbook-build, shows you what changes and what happens to each file, and on your yes replaces the kit's files, keeps yours (your Docker files, workflows you changed, `docs/`), merges `CLAUDE.md` and the settings (your description, stage, open decisions, rules, plugins and permissions stay), refreshes each role's plugins, runs the tests and opens a PR into `dev`.

**You check:** the list of files kept because you changed them, and the PR.

**Claude asks before:** the update, and its merge, even with `merge all`. After the merge it tells every session to merge `dev` and restart.

A project made before `/cb-update` existed follows the [first-update instructions](appendix-b-kit.md#first-update-for-an-older-project). See the [update reference](appendix-b-kit.md#update-the-kit-in-a-running-project) for how each kind of file is handled.

---

← [Back: Chapter 4: Try, release and deploy](04-try-release-and-deploy.md) · [Contents](../../README.md#read-the-guide) · [Next: Chapter 6: Design and frontend](06-design-and-frontend.md) →
