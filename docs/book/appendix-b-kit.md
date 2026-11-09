# Appendix B: Kit reference

**Purpose:** what `kit/init.mjs` installs in a project, what each part does, and how to change it with Claude.

## What the kit installs

| Path in the project | What it does |
|---|---|
| `CLAUDE.md` | The rules every session reads: the three approvals, "The AI understands; the owner decides", plain language, roles by layer, models per task, fresh context, CI, reviews, merging, change levels, data changes, environments, hand-offs, everything through the Lead, stalled sessions, secrets, the Skills table |
| `.claude/roles/<role>.md` | One file per role (`lead`, `dev`, `uiux`, `frontend`, `test`): what it owns, how it works, what it must not do, when it asks, how it recovers |
| `.claude/role` (per worktree, not committed) | The worktree's role, read by the hooks |
| `.claude/hooks/role-guard.cjs` | Runs before every command, file read, search and edit, in every session and subagent: pushes, merges, paths, backups, `.env` files and environment dumps, production deploys ([chapter 2](02-the-team.md#3-the-guard)). It sees through wrappers and nested shells (`rtk`, `env`, `bash -c`, `powershell -Command`) and refuses encoded PowerShell |
| `.claude/hooks/session-start.cjs` | Tells a starting session its role, its recovery steps, its skills, and warns when it runs another model than its task's |
| `.claude/ownership.json` | Which folders each role may edit; the longer path wins (Frontend's views inside the Dev's `src/`) |
| `.claude/settings.json` | Registers the hooks; shared permissions; the plugins every role shares ([Plugins](#plugins)) |
| `.claude/settings.local.json` (per worktree, not committed) | The role's own plugins, and its model provider in the `deepseek` mode |
| `.claude/project.json` | Name, roles, repo, language, where CI runs, the images per layer, `devMigrate`, `stagingMigrate`, `db`, the kit version |
| `.claude/commands/` | The slash commands ([Commands](#commands)) |
| `.github/ISSUE_TEMPLATE/` | Forms for CR, Task (level, reach, signals, model, tests), Defect (severity, "Caused by") and Design |
| `.github/pull_request_template.md` | The checks by level, the commit each review and CI ran on, the hand-off |
| `.github/workflows/` | `ci`, `docs-check`, `codeql` (public repos), `image-app` (release images with an SBOM and, on public repos, a provenance attestation), `image-design` (the design prototype). Every job skips itself when CI runs on your machine |
| `.github/dependabot.yml` | Security fixes only, one grouped PR per ecosystem ([Appendix E](appendix-e-standards.md)) |
| `docs/templates/` | The document templates ([Appendix A](appendix-a-templates.md)) |
| `docker-compose.yml`, `docker-compose.staging.yml`, `docker/*.Dockerfile`, `.dockerignore` | One image per layer, a health check on each; the staging overlay gives the backend its database, http cookies and network address. Adapted to the stack at setup |
| `docker/shared-compose.yml` | The machine's shared services (Postgres, SQL Server, Redis, a registry), copied to `~/.crewbook/shared/` |
| `START-HERE.md` | Your steps, as commands to type |
| `.git/hooks/pre-commit` | Blocks commits with `.env` files or values that look like credentials |

## Scripts

| Script | What it does |
|---|---|
| `roles.mjs` | Shows the roles, sets them at setup, adds one later, creates the worktrees |
| `new-role-worktree.mjs` | A role's worktree, branch, port and plugins, and its model in the `deepseek` mode |
| `set-secret.mjs` | You set one secret through hidden input; it goes to `.env.local` in every checkout |
| `db-setup.mjs` | The project's databases on the shared Postgres: `create` (you run it), `env`, `check`, `list`, `reset`, `migrate`, `seed`, `backup`, `restore`, `--plan`. Never prints a password |
| `hosts.mjs` | The machine's build host, registry, staging server and shared services; `secret <NAME>` for their passwords, which also changes `POSTGRES_PASSWORD` in the running server |
| `run.mjs` | Runs a version in Docker with one command (`v0.1.0`, `staging`, `dev`, `--source`, `--stop`). Builds an image once per set of files, tags `:dev-<sha>` from the service's own image, migrates the Frontend and staging databases from the image just built, starts `staging` with its own values without printing them |
| `ci-local.mjs`, `ci-steps.json`, `ci-mode.mjs` | CI on your machine: one run at a time, steps skipped when their files did not change, a PASS reused while valid, `--full` once per milestone; `ci-mode.mjs` switches between `local` and `github` |
| `model.mjs` | Picks a task's model from its level and signals, records it, moves it up the ladder, switches the project's mode |
| `crew-settings.mjs` | The `/cb-auto` switches, shared by every session |
| `usage.mjs` | The weekly measures: tokens and cost per role, model, task and level; first-try passes, moves up and their causes; your messages and the relayed ones apart; defects by cause |
| `codex-review.mjs` | The Codex second opinion on a PR, in a throw-away worktree (`/cb-review`) |
| `deploy.mjs` | Puts a tag on a server that only pulls images; production only with `--owner` |
| `release.mjs` | The version from the labels; `CHANGELOG.md` and the requirements' revision history |
| `plugins.mjs` | Installs the plugins the project and its roles use |
| `setup-labels.mjs`, `setup-board.mjs`, `board-status.mjs` | Labels, the kanban board, moving an issue between columns |
| `project-level.mjs` | Helpers the other scripts share |

## Commands

| Command | Who | What it does |
|---|---|---|
| `/cb-setup` | Lead | Five questions, the plan approval, every session ([chapter 3](03-the-plan.md)) |
| `/cb-plan [milestone]` | Lead | Splits a milestone into tasks with level, reach, signals and model |
| `/cb-build try` · `done` | Roles | Try a task in the running app; finish it with its checks, review and PR |
| `/cb-change <request>` | Lead | A CR for a functional change, an ADR for a technical one |
| `/cb-bug <what happened>` | Any | A Defect with "Caused by", its own level and severity, sent to the right role |
| `/cb-release demo` | Lead | The milestone on `staging` and your milestone approval |
| `/cb-release` | Lead | The handover, your release approval, the tag and the image |
| `/cb-deploy <env> <tag>` | Dev for staging, you for production | A version on a server; the previous tag rolls back |
| `/cb-env` | Lead | Shared services, hosts, the project's databases, reset, backup and restore |
| `/cb-progress [report]` | Any | Live state in ten lines; `report` adds the weekly measures |
| `/cb-model`, `/cb-redo` | Any; the Lead for another task | A stronger model for a task; the last step again one step up |
| `/cb-review #<PR>` | Lead | A Codex second opinion and security pass |
| `/cb-auto` | Any | The four switches of what runs without you; `off` stops all of them |
| `/cb-send` | Any | Sends the last hand-off block's prompt to its session |
| `/cb-add-role <role>` | Lead | Adds UI/UX, Frontend or Test |
| `/cb-update` | Lead | The newest kit, through a PR you approve |
| `/cb-help` | Any | Every command in one line, the one that fits the stage first |

## Plugins

The kit's `.claude/settings.json` holds the set every role shares. Each role worktree adds its own on top, in its git-ignored `.claude/settings.local.json` (`scripts/new-role-worktree.mjs` writes it, `/cb-update` refreshes it). Enabling a plugin does not download it: `init` installs them with `scripts/plugins.mjs`, `/cb-setup` checks them first, and on another machine you run `node scripts/plugins.mjs` once.

| Plugin | Marketplace (`/plugin marketplace add …`) | Who has it | When |
|---|---|---|---|
| superpowers | `anthropics/claude-plugins-official` (built in) | Every role | Always: planning, test-first code, debugging, checks before "done" |
| code-review | built in | Every role | Always: each role reviews its own diff before the PR |
| context7 | built in | Every role | Always: current library documentation |
| product-management | `anthropics/knowledge-work-plugins` | Lead only | The requirements, the roadmap and functional CRs. The Lead may turn it off for itself once the plan is approved and turn it on again for the next CR |
| claude-mem | `thedotmack/claude-mem` | Lead only | The Lead runs for the whole project and keeps its thread across sessions. The other roles start from the issue and their hand-off, so they run without it: it sends every tool result to a model and stores it |
| frontend-design | built in | UI/UX, Frontend | Products with screens (the Lead turns it on at setup) |
| ui-ux-pro-max | `nextlevelbuilder/ui-ux-pro-max-skill` | UI/UX, or the Lead without UI/UX | Products with screens, for the look-and-feel options |
| figma | `anthropics/knowledge-work-plugins` | UI/UX | Only when the design lives in Figma |
| codex | `openai/codex-plugin-cc` | Lead | Optional: a second opinion through `/cb-review` |
| humanizer | `blader/humanizer` | Every role that writes documents | Only with polished documents ("Polish documents from now on") |
| rampstack-seo | Anthropic plugin directory | Dev, Frontend, Lead | Off by default. Turn it on in the project's settings for the phase that works on a public site's SEO, then off again |

Each plugin adds its skill list to every session that has it. `claude plugin details <plugin>` shows what one costs per session.

### Skills by task

The kit's `CLAUDE.md` names the skill for each kind of work, and each role file names its own, so you never choose one. The requirements use Product Management (`write-spec`, `product-brainstorming`, `roadmap-update`); the technical plan and the tasks use `superpowers:brainstorming` and `writing-plans`; L2-L3 code uses `test-driven-development`; failures use `systematic-debugging`; every "done", PR, merge and release passes `verification-before-completion`; each role reviews its own diff with `code-review`, and `security-review` at L3; the look and feel comes from `ui-ux-pro-max` and the screens from `frontend-design`. The superpowers skills for worktrees, branch finishing and subagents are not used: the kit's worktrees and merge rules replace them.

## Update the kit in a running project

`kit/update.mjs` stays in crewbook-build: `/cb-update` runs it from a clone. It looks every project file up in the kit's history, so it knows whether you changed it:

| Files | What the update does |
|---|---|
| `.claude/roles/`, `hooks/`, `commands/`, the kit's `scripts/`, `docs/templates/` | Replaced; a file you changed is replaced and listed, so the Lead can put your change back |
| `.github/` | Replaced only if you never changed it; new files added |
| `CLAUDE.md` | The kit's rules replaced; your title, description, stage, open decisions, stack, own rules and sections stay |
| `.claude/settings.json` | Merged; your plugins and permissions stay. A plugin the kit now gives to one role only (claude-mem) is turned off there and on in that role's `settings.local.json` |
| Each role's `settings.local.json` | Its plugins refreshed |
| `docker-compose.staging.yml` | Added when missing; yours kept |
| Docker files, `CHANGELOG.md`, `README.md`, `docs/` | Yours: never changed; the report says when the kit's Docker files changed since your version |

## Change the kit for one project

**Ask the Lead:**

> `<what you want>`, e.g. "The Dev also owns the `db/` folder".

**Claude asks you:** which roles it affects, and whether the change should go back to Crewbook: Build too.

**Claude does:** edits `.claude/ownership.json`, the role file or the hook, adds a test case for a hook change, runs the tests, commits.

**Claude asks before:** loosening anything that guards your approvals, secrets, real data or production. It does not do that unless you say so explicitly.

## Licenses

Docs and templates: CC BY 4.0. Kit code: MIT ([kit/LICENSE](../../kit/LICENSE)). Keep the `SPDX-License-Identifier` line when you copy kit files.
