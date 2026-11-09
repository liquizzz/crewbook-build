# Appendix B: Kit and configuration reference

← [Back: Appendix A: Quick reference](appendix-a-quick-reference.md) · [Contents](../../README.md#read-the-guide) · [Next: Appendix C: Troubleshooting](appendix-c-faq.md) →

**Purpose:** what `kit/init.mjs` installs in a project, what each part does, and how to change it with Claude.

- [Installed files](#what-the-kit-installs) and [scripts](#scripts)
- [Change levels, models and checks](#change-levels-models-and-checks), [role guard](#the-role-guard), [secrets](#secrets-and-database-setup), [environments](#environments) and [shared services](#the-machines-shared-services)
- [Plugins](#plugins), [skills by task](#skills-by-task) and [optional second-opinion reviewer](#optional-a-second-opinion-reviewer)
- [Kit updates](#update-the-kit-in-a-running-project), [first update for an older project](#first-update-for-an-older-project), [project-specific changes](#change-the-kit-for-one-project) and [licenses](#licenses)

## What the kit installs

| Path in the project | What it does |
|---|---|
| `CLAUDE.md` | The rules every session reads: the three approvals, "The AI understands; the owner decides", plain language, roles by layer, models per task, fresh context, CI, reviews, merging, change levels, data changes, environments, hand-offs, everything through the Lead, stalled sessions, secrets, the Skills table |
| `.claude/roles/<role>.md` | One file per role (`lead`, `dev`, `uiux`, `frontend`, `test`): what it owns, how it works, what it must not do, when it asks, how it recovers |
| `.claude/role` (per worktree, not committed) | The worktree's role, read by the hooks |
| `.claude/hooks/role-guard.cjs` | Runs before every command, file read, search and edit, in every session and subagent: pushes, merges, paths, backups, `.env` files and environment dumps, production deploys ([role guard](#the-role-guard)). It sees through wrappers and nested shells (`rtk`, `env`, `bash -c`, `powershell -Command`) and refuses encoded PowerShell |
| `.claude/hooks/session-start.cjs` | Tells a starting session its role, its recovery steps, its skills, and warns when it runs another model than its task's |
| `.claude/ownership.json` | Which folders each role may edit; the longer path wins (Frontend's views inside the Dev's `src/`) |
| `.claude/settings.json` | Registers the hooks; shared permissions; the plugins every role shares ([Plugins](#plugins)) |
| `.claude/settings.local.json` (per worktree, not committed) | The role's own plugins, and its model provider in the `deepseek` mode |
| `.claude/project.json` | Name, roles, repo, language, where CI runs, the images per layer, `devMigrate`, `stagingMigrate`, `db`, the kit version |
| `.claude/commands/` | The slash commands ([quick reference](appendix-a-quick-reference.md#slash-commands)) |
| `.github/ISSUE_TEMPLATE/` | Forms for CR, Task (level, reach, signals, model, tests), Defect (severity, "Caused by") and Design |
| `.github/pull_request_template.md` | The checks by level, the commit each review and CI ran on, the hand-off |
| `.github/workflows/` | `ci`, `docs-check`, `codeql` (public repos), `image-app` (release images with an SBOM and, on public repos, a provenance attestation), `image-design` (the design prototype). Every job skips itself when CI runs on your machine |
| `.github/dependabot.yml` | Security fixes only, one grouped PR per ecosystem ([Appendix E](appendix-e-standards.md)) |
| `docs/templates/` | The document templates ([Appendix D](appendix-d-templates-and-checklist.md)) |
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

## Change levels, models and checks

Each task starts on the model its level and difficulty signals allow. The level also determines its checks and reviews.

| Level | Start | With all three signals | Required checks |
|---|---|---|---|
| L0 display | Sonnet low | Haiku low, about 3 files or fewer | CI; a look in the running app when style or layout changed |
| L1 setting or small logic | Sonnet medium | Haiku medium | CI; affected action tried; a test when there is logic |
| L2 module logic | Sonnet high | Sonnet high | CI; module tests; main scenario run locally; `code-review` |
| L3 core | Opus medium | Sonnet high | CI; tests by reach; `code-review` and `security-review` |

The three signals are: the request is clear, there is a pattern to copy, and no change to the architecture. L3 reach ranges from one point (the app starts and one read and write work) to integration tests of every module that uses it. Security review also runs whenever a task touches permissions, money, personal data or a secret. Schema or existing-data changes are L3, with update and rollback scripts both run on staging.

The Lead's own analysis and design run on Opus medium, reading a PR on Sonnet medium (Opus at L3), coordination on Sonnet low. No task starts above Opus medium: Opus high, the top of the ladder, is reached only when a task is stuck or you ask for it.

A task that fails twice on the same wrong reasoning moves one step up the ladder: Haiku low, Sonnet medium, Sonnet high, Opus medium, Opus high. A failure caused by the environment, an unclear request or a scope that grew is fixed at its cause, with the model kept. Escalation to Opus asks you first unless escalation is on and you separately allowed Opus. `/cb-auto escalate on` alone does not grant that permission. `/cb-model up` and `/cb-redo` let you request a stronger model for the task.

## The role guard

A hook runs before every command, file read, search and edit in every session, subagents included. It blocks:

| Rule | Example it stops |
|---|---|
| Push only your own branch | The Dev pushing to `dev`, `staging` or `main` |
| No force push to shared branches | `git push --force origin dev` |
| No skipped checks | `--no-verify` |
| Only the Lead merges | `gh pr merge` in the Dev's session |
| Your own paths only | Frontend editing the backend's files |
| No real data | Reading a database backup or dump |
| No secrets | Reading `.env.local`, `printenv`, `docker compose config`, `docker inspect` without `--format` |
| Production is yours | Any session running `deploy.mjs production` |

The Lead's pushes to `main`, tags, releases and workflow runs open an approval prompt for you instead of running.

## Secrets and database setup

Run `node scripts/set-secret.mjs <NAME>` in the project's main folder. Hidden input writes the value to the git-ignored `.env.local` in every checkout. Role hooks block reading these files and printing environment dumps. Never paste a secret into chat; replace one that reaches a transcript.

For database credentials, run `node scripts/db-setup.mjs create` when the Lead asks. It makes the databases and logins and writes their connection strings without printing passwords.

## Environments

Every role reaches the same kind of database server, each with its own database and login:

| Database | Used by |
|---|---|
| `<project>_dev` | The Dev, while it builds |
| `<project>_frontend` | Frontend, through the newest `api:dev-<sha>` image |
| `<project>_test` | Test, through the images it pinned |
| `<project>_ci_<id>` | Each CI run, created and dropped |
| `<project>_staging` | The regression and your try of each milestone |

Each login opens its own database only. `node scripts/db-setup.mjs create` (you run it once) makes them all and writes the connection strings into each worktree's `.env.local`; `db-setup.mjs check` proves each login is refused everywhere else. The engines themselves run once per machine for every project ([shared services](#the-machines-shared-services)).

## The machine's shared services

**What it does:** runs each database engine once for every project on this machine (one Postgres 17, one SQL Server 2022, one Redis), so ten projects do not mean ten database containers.

**Ask the Lead:**

> /cb-env

**Claude does:** shows what runs, proposes what the project needs, and gives you the commands that need a password, such as:

```bash
node scripts/hosts.mjs secret POSTGRES_PASSWORD
```

That command also changes the password in the running Postgres, so the file and the server never disagree. To open the shared server in a database tool, connect as `postgres` to `localhost:5432` with that password (in DBeaver, tick "Show all databases").

**You check:** `node scripts/hosts.mjs` lists the services and the hosts.

## Optional: a second-opinion reviewer

Install the Codex plugin once per machine, in any session:

```
/plugin marketplace add openai/codex-plugin-cc
/plugin install codex@openai-codex
/reload-plugins
/codex:setup
```

The Lead then offers `/cb-review #<PR>` on risky pull requests ([chapter 3](03-build-and-review.md)).

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

## First update for an older project

Projects from before roles by layer (Dev1, Dev2, DevOps, Lite and Full) stay on their existing kit version; `/cb-update` reports that limit and stops. For a compatible project that still has `/kit-update`, run that command once to bring in `/cb-update`. A project with neither command: run this once in its Lead folder (`<project>-wt/lead`), with your clone of crewbook-build next to the project:

```bash
node ../../crewbook-build/kit/update.mjs --dry-run
```

Then ask the Lead: "Update the kit as the dry run shows, then open a PR." From then on, `/cb-update` is there.

## Change the kit for one project

**Ask the Lead:**

> `<what you want>`, e.g. "The Dev also owns the `db/` folder".

**Claude asks you:** which roles it affects, and whether the change should go back to Crewbook Build for Claude too.

**Claude does:** edits `.claude/ownership.json`, the role file or the hook, adds a test case for a hook change, runs the tests, commits.

**Claude asks before:** loosening anything that guards your approvals, secrets, real data or production. It does not do that unless you say so explicitly.

## Licenses

Docs and templates: CC BY 4.0. Kit code: MIT ([kit/LICENSE](../../kit/LICENSE)). Keep the `SPDX-License-Identifier` line when you copy kit files.

---

← [Back: Appendix A: Quick reference](appendix-a-quick-reference.md) · [Contents](../../README.md#read-the-guide) · [Next: Appendix C: Troubleshooting](appendix-c-faq.md) →
