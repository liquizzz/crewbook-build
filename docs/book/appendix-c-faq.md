# Appendix C: FAQ and troubleshooting

**Purpose:** quick answers to what comes up most.

## Working with sessions

**A session drafts something wrong.**
A redo costs a session minutes, which is why it drafts first. Say what to change in your own words, or point at the part that is wrong. Check the ⚠️ guesses first.

**A session asks too many questions.**
Each step may ask at most three together, each with a suggested answer. If it asks more, or asks before it shows anything, say: "Draft first, then ask, as CLAUDE.md says." Answer "you decide" on what you do not care about.

**A role asked me something in its own session.**
Roles report to the Lead, which asks you. If a role still asks you directly, answer it in the Lead's session ("Dev asks X; my answer is Y") so the thread stays in one place.

**Nothing has moved for hours.**
Type `/cb-progress`: it lists stalled sessions. The usual cause is a session that hit its usage limit or was closed. The Lead resumes it when it can; otherwise reopen the session in its folder, or wait for the limit to reset ([chapter 6](06-continuity.md#3-a-session-that-stopped)).

**A session forgot what it was doing.**
Open a new session in the same folder: it recovers from the issues and git. Or say "Read CLAUDE.md and continue as `<role>`."

**Two sessions changed the same files.**
They should not: each role has its own worktree and paths. Ask the Lead to check which paths each role touched and to fix `.claude/ownership.json`.

**I want to talk to a Dev directly.**
Fine for a task it already has: `/cb-build try #<n>` to see it running early. Anything new goes to the Lead, so the plan and the issues stay in step.

## The guard

**"[role-guard] Role "dev" may only push role/dev".**
Working as intended. The Dev opens a PR and tells the Lead.

**"[role-guard] Real .env files and environment dumps hold secrets…"**
Working as intended, in every role and subagent. A script that needs a value reads `.env.local` itself. To check that a value is set, ask for a check that prints only yes or no.

**"[role-guard] docker inspect prints a container's settings…"**
Use `docker inspect --format` with the one field you need, for example `{{.State.Health.Status}}`.

**"Role X does not own <path>".**
Either the work belongs to another role (ask through the issue), or the project's folders differ from the defaults: ask the Lead to update `.claude/ownership.json`.

**I approved a prompt by mistake.**
The prompts only cover pushes to `main`, tags, releases and workflow runs. Ask the Lead to undo the last release step (revert, delete the tag, or deploy the previous tag).

## Databases

**Do I need to set up a database?**
No. By default the database and the cache run in the project's own Docker, set up during setup. Only a project that must use servers you already have needs `connect`.

**Which connection string do I give `connect`?**
The one the app really reaches, with its SSL options. Behind NAT, the mapped address and port. An admin lets Crewbook create the project's account; an account that may already create databases is used as it is. SQL Server takes an ADO.NET string (`Server=host,port;User Id=…;Password=…`) and needs `sqlcmd` on this machine.

**`connect` says the account may not create databases.**
It needs `CREATEDB`, or an admin that can create logins and databases. Ask the server's owner for one of the two; nothing was stored or changed.

**I changed the server's admin password.**
The project account keeps its own password, so the app and the roles keep working. Run `connect` again with the new admin only if this project needs to create accounts or databases with it.

**My project uses the old model (one login per role).**
It keeps working. To move: back up `staging`, run `node scripts/db-setup.mjs connect database` with that server's admin, then `node scripts/db-setup.mjs adopt-legacy`. The databases and their tables move to one project account, the data stays, and the old logins stay until you drop them.

**A role's connection string is missing after I added a worktree.**
`node scripts/db-setup.mjs env` writes every checkout's URLs again, with no new passwords.

## Process

**How much do I review myself?**
At L0 and L1 the reviews and CI are usually enough. For L3 changes (shared code, sign-in, money, personal data, the schema) and anything the Lead flags, read the Lead's summary and the review findings, or the diff if you read code, and always try the release candidate on `staging`. Lower `/cb-auto merge` to see more PRs before they merge.

**My project runs on an older kit.**
Type `/cb-update` in the Lead ([chapter 6](06-continuity.md#7-get-the-newest-kit)). A project from before roles by layer (Dev1, Dev2, DevOps, the Lite and Full levels) stays on its kit version: `/cb-update` says so.

**A document is full of technical words.**
Every document must read clearly the first time, and a technical one opens with "In short". Say: "Rewrite `<file>` in plain language."

**I cannot picture the product.**
Ask the Lead for the main screens first: grey screens you can click through, then the look and feel. React to those.

**The milestone keeps growing.**
Ask the Lead what came in since the plan and how much buffer is left. Move what does not fit to the next milestone.

**A task keeps failing.**
After two red tries the role names the cause. The environment or an unclear request is fixed where it is; the same wrong reasoning moves the task one model step up; a scope that grew is split. `/cb-model up` moves it up yourself.

**A client asks for a change by email.**
Paste it to the Lead with the date and the sender: "Client request: …". It becomes a CR with the request, its impact and price, and a row in `docs/product/changes.md`.

**I am away for a few days.**
Tell the Lead: "I am away until `<date>`. Work on approved items only and queue every decision." Set `/cb-auto merge` lower if you want fewer merges while you are away.

## Tools

**`init.mjs` says Docker is missing.**
Install Docker Desktop (or Docker Engine with Compose on Linux), check `docker compose version`, start it, and run init again.

**CI never runs on a new public repo.**
Open its Actions tab and click **Enable Actions on this repository**. Then push once more.

**`gh` lacks the `project` scope.**
Run `gh auth refresh -s project` in a terminal.

**I see no kanban board.**
Run `node scripts/setup-board.mjs` in the project, open the board once and choose View → Layout → Board.

**A private release image cannot be pulled.**
Run `gh auth refresh -s read:packages` once and try again; `run.mjs` logs in with the gh CLI.

**An image build fails with a missing package.**
A cache mount was emptied while the layers above it stayed cached. The kit's rule is never to install offline-only from a cache mount (`--prefer-offline`, not `--offline`); ask the Dev to fix the Dockerfile.

**A Codex review fails or is out of quota.**
The Lead says so. The roles' own `code-review` already ran; reply "skip" or try later.
