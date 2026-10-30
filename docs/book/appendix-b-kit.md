# Appendix B: Kit reference

**Purpose:** what `kit/init.mjs` installs in a project, what each part does, and how to change it with Claude.

| Path in the project | What it does |
|---|---|
| `CLAUDE.md` | Shared rules every session reads: roles, your gates, "AI does the work; the owner decides", "Plain language", "See it first, then build it", Open decisions, build modes, git rules, compact instructions |
| `.claude/roles/<role>.md` | One file per role: mission, inputs and outputs, paths, must-nots, when to ask, recovery |
| `.claude/role` (per worktree, not committed) | The worktree's role name, read by the hook |
| `.claude/hooks/role-guard.cjs` | Blocks or asks before risky commands and edits, per role (chapter 2). It also sees through wrappers and nested shells (`rtk git push`, `env … git push`, `bash -c "git push …"`, `powershell -Command "…"`) and refuses encoded PowerShell |
| `.claude/hooks/role-guard.test.cjs` | 101 test cases for the hook, including wrapped and nested commands and per-Dev modules |
| `.claude/hooks/session-start.cjs` | Runs when a session starts, resumes or is compacted: tells Claude its role, its role's skills, and to draft at once, ask at most three questions and write in plain language, so you never type it |
| `.claude/ownership.json` (optional) | Overrides which paths each role may edit; with several Devs, one key per Dev (`"dev2": [...]`) limits it to its module |
| `.claude/settings.json` | Registers the hook; shared allow and deny rules; the minimum plugin set |
| `.claude/commands/` | The steps as slash commands, so the owner types a word and the session follows the full prompt ([Commands](#commands)). Each reads the level from `.claude/project.json` |
| `.github/ISSUE_TEMPLATE/` | Issue forms: CR, Task, Defect, Design |
| `.github/pull_request_template.md` | PR checklist by change level, L3 safety checks, hand-off |
| `.github/workflows/` | `ci` (builds the app image until the Lead adds the stack's lint and tests at G3), `docs-check`, `codeql` (public repos, once the Lead sets `CODEQL_LANGUAGES` at G3), `image-app` (each release tag also gets an SBOM and, on public repos, a provenance attestation), and `image-design` with a design prototype only: checks on every PR, Docker images built into `ghcr.io` |
| `.github/dependabot.yml` | Security fixes only, one grouped PR per ecosystem, no version-bump PRs; the Lead adds the stack's ecosystem at G3. Standards behind these checks: [Appendix E](appendix-e-standards.md) |
| `docs/templates/` | The document templates (proposal, PRD, SRS, solution design, CR, ADR, test cases, release checklist…), so every session fills in the same structure |
| `docker-compose.yml`, `docker/*.Dockerfile`, `.dockerignore` | Runs every part in Docker; examples for a pnpm workspace, adapted to your stack by the Lead after G3 (chapter 1, step 4) |
| `START-HERE.md` | The owner's steps for the project's level, as commands to type; rewritten by `set-level.mjs` |
| `.claude/project.json`, `.claude/start-here/` | The project's name, level, repo and kit version (`kitVersion`, the crewbook-build commit it came from); the `START-HERE.md` template for each level |
| `scripts/set-level.mjs` | Changes the level (lite, full) up or down: branches, worktrees, `CLAUDE.md`, `START-HERE.md`; deletes nothing |
| `scripts/set-secret.mjs` | The owner sets one secret: hidden input, written to the git-ignored `.env.local` of every checkout; new worktrees copy it |
| `scripts/project-level.mjs` | What each level needs; shared by `init.mjs` and `set-level.mjs` |
| `scripts/ci-mode.mjs` | Shows or sets where CI runs (`github` or `local`): `"ci"` in `.claude/project.json` and the repo variable `CI_MODE`, which every workflow job checks; init picks `local` for a private repo |
| `scripts/ci-local.mjs` | CI on this machine: the steps of `scripts/ci-steps.json` on a branch merged with `dev`, in a throw-away worktree, one run at a time; skips a step whose `"changed"` paths the branch did not touch, reuses a PASS for the same branch and `dev`; prints PASS or FAIL and the time per step and in total |
| `scripts/new-role-worktree.mjs` | Creates a role's worktree, branch, role file and local port (`dev1` to `dev4`: ports 5201 to 5204) |
| `scripts/setup-labels.mjs` | Creates the labels |
| `scripts/setup-board.mjs` | Creates the kanban board: a GitHub Project linked to the repo, with columns Backlog · Approved · Ready · In progress · In review · Testing (Full, with `/auto testing on`) · Done and fields Role, Module, Level, Priority |
| `scripts/crew-settings.mjs` | Settings shared by every session, kept in the repo's git folder (nothing to commit): messages between sessions and auto-merge (both on until `/auto` turns them off), per-task testing (off), and the hand-off tips, shown three times at most while messages are off |
| `scripts/board-status.mjs` | Moves an issue, or a PR with no task issue, to a board column (`node scripts/board-status.mjs 12 "In progress"`); the commands call it as work moves |
| `scripts/run.mjs` | Runs a version in Docker with one command (`node scripts/run.mjs v0.1.0`, `staging`, `dev`, `--source`, `--stop`): checks Docker and port 3000, logs in to ghcr.io when the repo is private, pulls the image, waits for the healthcheck, opens the browser |
| `scripts/plugins.mjs` | Installs the Claude Code plugins `.claude/settings.json` enables (adds their marketplaces, then `claude plugin install --scope user`), or prints the `/plugin install` lines when the `claude` command is missing; `init` runs it, `/setup` when a required plugin is missing, and the Lead at G3 when it enables the design plugins |
| `scripts/release.mjs` | Computes the version from labels; updates `CHANGELOG.md` and the SRS (either line ending) |
| `scripts/release.test.mjs` | Tests the release script without GitHub |
| `.git/hooks/pre-commit` | Blocks commits with `.env` files or credential-like values |

## Commands

| Command | What it does |
|---|---|
| `/setup` | First step, with no questions: `CLAUDE.md`, gate issues, milestone, the team's worktrees |
| `/next <idea>` | The next foundation step up to your approval: in the PO, picture the project (proposal and screen sketches, G1 and G2); in the Lead, how we build it (the solution design, G3) |
| `/build try` | Quick: no tests, no merge |
| `/build done` | Tests at the task's level, then a PR the Lead merges |
| `/release demo` | Full checks, no tag |
| `/release [version]` | A tagged version and its image |
| `/change <request>` | In the Lead after G2. Sorts the request: a functional change (a feature added or cut) becomes a CR (who asked, impact, price, the client's approval, a row in `changes.md`) with the SRS update; a technical change becomes an ADR |
| `/progress` | Live state in ten lines |
| `/gate G1`…`G6` | Checks a gate against the repo and GitHub |
| `/send` | Sends the prompt of the last hand-off block to the session it names |
| `/kit-update [path]` | Lead only: brings the project up to the newest kit through a PR you approve ([chapter 6](06-continuity.md#7-get-the-newest-kit)) |
| `/auto` | Shows or switches what runs without you, shared by every session: `/auto relay on|off` (sessions pass prompts to each other) `/auto merge on|off` (the Lead merges every PR after its review by level and green CI), both on at the start, and `/auto testing on|off` (Full: Test checks each merged task; off at the start) |

## Plugins

The kit's `.claude/settings.json` enables the minimum set, so every role uses the same plugins. Enabling a plugin there does not download it: `init` installs them with `scripts/plugins.mjs` (the `claude` command), `/setup` checks them first, and on another machine you run `node scripts/plugins.mjs` once.

| Plugin | Marketplace (`/plugin marketplace add …`) | Who uses it | Level |
|---|---|---|---|
| superpowers | `anthropics/claude-plugins-official` (built in) | All roles | Required |
| code-review | built in | Lead | Required |
| claude-mem | `thedotmack/claude-mem` | All roles | Required |
| context7 | built in | Dev, Lead, DevOps | Required |
| frontend-design | built in | UI/UX, Dev on front ends | Products with screens (the Lead enables it at G3) |
| ui-ux-pro-max | `nextlevelbuilder/ui-ux-pro-max-skill` | UI/UX; the Lead at Lite | Products with screens (the Lead enables it at G3) |
| figma | `anthropics/knowledge-work-plugins` | UI/UX | Only if the design lives in Figma |
| codex | `openai/codex-plugin-cc` | Lead | Optional: independent review (chapter 2) |
| product-management | `anthropics/knowledge-work-plugins` | PO | Optional: `write-spec`, `competitive-brief` and `stakeholder-update` for a PO who wants them; adds about 850 tokens and several connectors to each session |
| humanizer | `blader/humanizer` | Every role that writes documents | Only with polished documents (init question 6) |
| rampstack-seo | Anthropic plugin directory | Dev, PO on a public site | Off: the kit's `.claude/settings.json` sets it to `false`, so an install on your machine does not load SEO skills into every session. Set it to `true` for a product that needs SEO |

### Skills by task

The kit's `CLAUDE.md` has a Skills table, and each role file names its own skills, so you never choose one. In short: suggestions, when you ask for them, use `superpowers:brainstorming`; the screen sketches are plain grey HTML; the proposal, PRD, stories and solution design follow the templates; milestone planning uses `superpowers:writing-plans`; L2-L3 code uses `superpowers:test-driven-development`; failures use `superpowers:systematic-debugging`; every "done", PR, merge and release passes `superpowers:verification-before-completion`; the Lead reviews with `code-review`, adding `security-review` for L3; the look-and-feel options come from `ui-ux-pro-max` and screens are built with `frontend-design`; with polished documents, every document gets a `humanizer` pass. The superpowers skills for worktrees, branch finishing and subagents are not used, because the kit's own worktrees and merge rules replace them.

Install a plugin with `/plugin install <name>@<marketplace>`, then `/reload-plugins`. Each plugin adds its skill list to every session's context, and claude-mem also adds context at each session start, so leave out what the project does not use. To see what a plugin costs, run `claude plugin details <plugin>` in a terminal: it lists the plugin's skills, agents and hooks and its projected token cost per session (the Codex plugin, for example, adds about 450 tokens). To add a project-specific plugin for the whole team, ask the Lead: "Add `<plugin>` to the project's plugin list."

## Update the kit in a running project

`kit/update.mjs` stays in crewbook-build and is not installed: `/kit-update` runs it from a clone (`~/.crewbook/crewbook-build` unless you give a path). It runs in the Lead's worktree with nothing uncommitted, and `--dry-run` prints the plan only. It looks every project file up in the kit's git history, so it knows whether you changed it:

| Files | What the update does |
|---|---|
| `.claude/roles/`, `hooks/`, `commands/`, `start-here/`, `scripts/` (the kit's), `docs/templates/` | Replaced. A file the kit dropped is deleted if you never changed it. A file you changed is replaced too and listed, so the Lead can put your change back |
| `.github/` | Replaced only if you never changed it; new files are added; the files you changed are kept and listed |
| `CLAUDE.md` | The kit's sections and rules are replaced; your title, description, Stage, Documents, Open decisions, stack lines, own rules, own table rows and own sections stay |
| `.claude/settings.json` | The kit's marketplaces, hooks and permissions are merged with yours; every plugin you enabled stays |
| Docker files, `CHANGELOG.md`, `README.md`, `docs/` | Yours: never changed. The report says when the kit's Docker files changed since your version |
| `START-HERE.md` | Rendered again in English projects; in other languages the Lead rewrites it |

## Change the kit for one project

**Ask the Lead:**
> `<what you want to change>`, e.g. "Dev also owns the `db/` folder" or "Allow the Test role to run the e2e workflow".

**Claude asks you:** which roles it affects and whether the change should go back to Crewbook: Build too.

**Claude does:** edits `.claude/ownership.json`, the role file or the hook; runs the hook tests and adds a case for the change; commits.

**Claude asks before:** nothing, unless the change touches a gate (pushing `main`, releases), which it will not loosen without you saying so explicitly.

## Docker for another stack

**What it does:** replaces the example Dockerfiles with ones for your stack (API server, database, worker, another language) while keeping one image per part and the per-folder builds.

**Ask the Lead** (or DevOps):
> Our stack is `<stack>`. Rewrite the Docker setup and image workflows for it, keeping one image per part and builds only when that part changes.

**Claude asks you:**
1. The services and how they talk to each other.
2. Build, test and migration commands; how the database is migrated and backed up.
3. Environment variables each service needs (names only).
4. A health check URL or command for the smoke test.

**Claude does:** rewrites `docker-compose.yml`, `docker/` and the `image-*` workflows; writes run, migration and rollback commands and variable names in `docs/tech/ops/`; runs `docker compose up --build` and CI on a test PR.

**Claude asks before:** running any workflow by hand.

## Update a project to a newer kit

**Ask the Lead:**
> Update this project to the latest kit from `<path to crewbook-build>`. Show me what changes first.

**Claude does:** compares the project's kit files with Crewbook: Build, lists differences, keeps project-specific edits, applies the update after you agree, runs the tests.

## Licenses

Docs and templates: CC BY 4.0. Kit code: MIT ([kit/LICENSE](../../kit/LICENSE)). Keep the `SPDX-License-Identifier` line when you copy kit files.
