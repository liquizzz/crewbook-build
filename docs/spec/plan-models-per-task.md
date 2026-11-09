# Plan: a leaner kit, models per task

Status: final draft for the owner's approval, 2026-11-05. Nothing is built yet. Everything here ships as one kit version and is tried as a whole. When it is built, each decision becomes a row in `decisions.md`, the SRS is updated in the same commit, and this file is deleted.

## Why

On the round-4 project the kit cost too much and asked too much of the owner. Every role ran Opus by default; the Devs used about 70% of the tokens, the Lead about 22%, UI/UX 9% (token count recorded in DEC-076). The foundation asked question after question, G3 asked for documents nobody read, reviews ran twice, and the owner was asked to choose hand-offs and merges.

## Principles

1. **Each task on the cheapest Claude model that does it well**, moved up when it really gets stuck.
2. **The Lead proposes, the owner approves or corrects.** One short round of questions at most; then a full proposal with its assumptions.
3. **Nothing is done twice.** A build, a CI PASS or a review is reused while it is still valid for the exact commit.
4. **Two people who write code never touch the same files.**
5. **Fewer steps and documents.** Whatever the owner does not read or decide goes.
6. **The AI does the understanding.** The owner's words are a starting point, not a full spec: the Lead works out what the owner means, fills the gaps and suggests as much as it can, and the owner keeps or drops each suggestion.

## Scope

- One kit version with everything below; it is tried on a new project after it is built.
- Projects already running stay on their kit version. `update.mjs` does not move a project from the old roles: it says the project uses the old layout and stops, so nothing in a running project changes by accident.

## 1. Modes

The kit runs on the Claude client, so every mode has Claude in it.

| Mode | Who runs where | State |
|---|---|---|
| `claude` | Every task on Claude (Opus, Sonnet, Haiku), chosen per task | Default |
| `deepseek` | The Lead and L3 work on Claude; well-specified Dev, Frontend and Test tasks on DeepSeek | Today's `mix`, renamed; kept compatible, no new work |
| `qwen3` | Like `deepseek`, with Qwen3 on a local Ollama on the owner's LAN | Backlog |

Today's all-DeepSeek mode is removed. A provider other than Claude needs a session started with `claude` in the role's worktree: the provider settings are read when a session starts, and sessions opened from the desktop app ignore `settings.local.json`. A client project needs the client's OK before its code goes to a third party.

## 2. Roles

**Chosen at setup.** The Lead and the Dev are always on; UI/UX, Frontend and Test are ticked by the owner, all ticked by default. The list is `"roles"` in `project.json`, and every command reads it. The kit is for owners who know what they want, so the Lite and Full levels go (`set-level.mjs` and the level texts with them). DevOps, Dev1, Dev2 and `/cb-add-dev` are retired.

| Role | Work | Owns |
|---|---|---|
| Lead | Analysis, stories, the function tree, the architecture, the deployment model and the environments at setup, the API contract, splitting tasks, merges, tags, releases; the design when there is no UI/UX | Documents and the spec |
| UI/UX (`uiux`) | The design: `design/` prototype, tokens, the client's "staging design" link. Works ahead of the code, for example on the next milestone | `design/`, `packages/tokens/` |
| Dev (`dev`) | Backend: API, business rules, data, migrations, the infrastructure files; builds to try, `staging` and release images; both layers when there is no Frontend | Backend folders, the API contract (OpenAPI) and shared types, `docker/`, `docker-compose.yml`, `.github/workflows/`, `infra/` |
| Frontend (`frontend`) | The frontend code, from the approved design | Frontend folders; reads `design/`, tokens and the infrastructure files, never edits them |
| Test (`test`) | Test cases, end-to-end tests, the regression on `staging` | Test folders and reports |

| Not chosen | Who does it |
|---|---|
| UI/UX | The Lead designs inside the app; no `design/`. A product with no screens (a bot, an API, a background job) skips the design step and the design plugins |
| Frontend | The Dev builds both layers |
| Test | The Dev writes the test cases and runs the regression; the Lead accepts |

- When the UI lives in the backend project (server views), the split is by folder: views, static files and components for Frontend; controllers, services and data for the Dev. The Lead writes it in `.claude/ownership.json` at setup.
- An issue that needs both layers is split into a backend task and a frontend task. The Lead writes the API contract in the backend task. By default the backend is merged first; when time is short, Frontend starts against a mock generated from the contract.
- On `dev` the Dev never removes or changes a field the frontend uses without an L2 task announced first.
- `/cb-add-role <uiux|frontend|test>` (in the Lead) adds a role later: `"roles"`, its worktree and branch, the folders moved in `ownership.json` (for Frontend), `design/` and tokens (for UI/UX). Open tasks keep their role. Removing a role is in the backlog.
- When the description mentions money, security or personal data, init suggests Test.

**Release work** moves from the old DevOps role and from the Lead's context:

| Work | Who |
|---|---|
| The deployment model, Docker, `ci-steps.json`, healthchecks, `docs/tech/ops/` | Lead, at setup |
| The milestone check, merging `dev` into `staging`, the handover, the changelog, the owner's approval, merging into `main`, the tag, `gh release` | Lead |
| `ci-local staging --full`, the `staging` image, the owner's try link, the release image and its start check | Dev |
| A failed build or an image that does not start | Dev, as an Infra task with a level; the Lead decides a rollback |

The Dev also takes DevOps's limits: never create, read or print secrets; never run or enable workflows; no paid resources; stop and ask the owner about anything on production.

**Sessions.**
- When setup ends, the Lead creates every session the chosen roles need: its worktree, branch, title "<Project> - <Role>", the project's sidebar group, and a short first message ("Ready; wait for the Lead's task"). The owner's answer to the setup form is the go-ahead; nothing else is asked. Opening a session still loads its system prompt and hooks once; the trial measures that cost.
- **Context by phase.** Clearing and switching models are separate; neither follows from the other, and compacting after every task loses detail that is then read again.
  - Dev and Frontend: cleared after each merged PR once the hand-off is on the issue (the PR and its last commit, the result, the technical decisions to keep, the tests and reviews run with their commit, what is left and what the next task depends on), unless another PR is in review or work is not pushed.
  - Test: cleared when a test round ends, its report is written and no retest is waiting.
  - UI/UX: cleared after a design package is approved and its decisions, tokens and hand-off notes are saved.
  - The Lead: keeps its context through a phase (setup, a milestone, a release), with auto-compact as the fallback; at the end of a big phase it writes the decisions, tasks, results and what is waiting into the documents and clears itself; mid-phase with a noisy context it compacts, naming what to keep. It saves its state at every hand-off point, so a fresh context never depends on auto-compact alone.
- Each task is written so a fresh session can do it without the history: the approach, the files, the tests, a pattern to copy, the acceptance, the API contract when there is one.

## 3. Setup and the foundation

**Setup is five questions.** Everything else takes a default without asking: the name from the folder, the language from the owner's first message, a private GitHub repo, the `claude` mode; each can be changed later. "Polished documents" and "design prototype" go: the Lead turns the humanizer on when the owner asks, and a prototype comes with UI/UX.

1. **Roles.** A multi-select, all ticked by default, each role with one line on what it does and when it is worth having:

   | Role | Does | Worth it when |
   |---|---|---|
   | Lead (always) | Plans, decides, splits tasks, reviews, merges, releases | Always |
   | Dev (always) | Builds the backend, the infrastructure and the images | Always |
   | UI/UX | Designs the screens before they are built; a prototype the client can see | The product has screens a client approves, or the look matters |
   | Frontend | Builds the screens from the design, beside the Dev | The product has a real UI, so backend and frontend can run at the same time |
   | Test | Writes the test cases early and runs the regression | Money, security, personal data, or a client who signs off each release |

2. **Autonomy.** The automation settings, each with its default:

   | Setting | Choices | Default |
   |---|---|---|
   | Sessions send each other their hand-offs (`relay`) | on, off | on |
   | Merges the Lead does by itself (`merge`) | off, only-L0, up-to-L1, up-to-L2, all (or empty) | all |
   | Moving a stuck task up the ladder (`escalate`) | on (below Opus), off | on |
   | Test checks each merged task (`testing`) | on, off | off |

   The settings are written once, shared by every session, and changed later with `/cb-auto`.

3. **The requirements.** The owner describes the idea in their own words. The Lead discusses it in one short round (three questions at most), then writes the first draft: the stories, the stories usually missing for this kind of product marked as suggestions, and the function tree (modules, then screens or functions, then the main actions, in `docs/product/function-tree.md`). The owner approves or corrects. The function tree gives the modules, the code folders, `ownership.json`, the milestones and the tasks.
4. **The deployment model and the stack.** One round on scale (users, how many at once, data volume, where it runs, budget, a required stack), then three architectures with their stack, cost and fit, one recommended. The owner picks one, asks for a change, or answers "you decide": the Lead takes the recommended one and writes why. The solution design is written from the choice; ADRs only for choices that were really open. No C4 diagrams or long option studies.
5. **The environments.** The Lead proposes the databases, the build host and `staging` from `~/.crewbook/hosts.json` and the chosen stack (section 9), reusing the servers already running on the machine. The owner accepts, or says what to change.

The owner answers each question once; the Lead proposes and the owner approves or corrects, never round after round. An owner who knows what they want changes a proposal in one message.

**Three approvals replace the gates G1 to G6.** The owner decides three times; everything else was the Lead's own checklist, so it runs inside the commands and reports only what is missing.

| Approval | When | The owner | The Lead checks first |
|---|---|---|---|
| 1. The plan | End of `/cb-setup` | Reads one page (requirements, function tree, architecture, environments, the first milestone) and approves or corrects | Stories, the function tree, the stack, every database and the build host ready |
| 2. The milestone | `/cb-release demo` | Opens the `staging` link and tries the 3 to 5 scenarios the Lead gives | Every issue closed or moved, a valid PASS on `dev`, the regression passed, data and rollback scripts tried |
| 3. The release | `/cb-release` | Approves the release | The accepted `staging` commit, the image starts, the changelog and the handover complete |

`/cb-gate` and the gate issues on the board go. `/cb-progress` shows where the project is: `Plan ✓ · Milestone v0.1.0: 7/12 tasks · Acceptance · Release`. The gate IDs G1 to G6 are removed from the kit, the templates and the book in the same version.

## 4. Tasks

**The level is the risk**: it sets the checks, the review and who approves. A task touching several kinds of code takes the highest level; when in doubt, the higher one.

| Level | Logic and state | API | Example |
|---|---|---|---|
| L0 Display | None: text, style, layout, icons, translations, documents; no data change | No call, or the existing calls unchanged | A button label, a CSS fix |
| L1 Setting | Small logic in one screen or module, or a value the code already reads (configuration, a constant, a default, a flag that turns on code already tested) | Only existing endpoints | A button wired to an existing endpoint, a filter in the browser, the page size |
| L2 Module logic | New behaviour or a changed business rule inside one module | A new or changed endpoint, request or response | A filter endpoint, a new field in the API |
| L3 Core | Code shared by modules, sign-in or permissions, money, personal data, deletes, the schema or a migration, an outside system, deployment | Or an API several modules use | The permission middleware, a connection string |

A change to the API contract is at least L2. A flag that turns on code that never ran is L2.

**The reach of an L3 task** sets how far its tests go. The Lead writes the reach and the affected places on the issue; the role confirms them from the diff and may widen them, never narrow them.

| Reach | When | Tests |
|---|---|---|
| One point | One configuration or infrastructure value | The app starts and passes its healthcheck, one read and one write work there, the old value can be put back |
| Narrow | Inside one shared module, its public interface and behaviour unchanged | That module's tests and tests of its public interface |
| Wide | A changed interface or behaviour others use; permissions, money, personal data, deletes, the schema | Module tests, integration tests of the modules that use it, edge cases, part of the regression |

**Three difficulty signals**, ticked by the Lead when it writes the task: the request is clear (no decision left open); there is a pattern and tests to copy; no change to the architecture or to several modules. They set the model (section 6); the level does not change with them.

**Grouping.** Small L0 and L1 changes in one area go into one task, so they share one PR, one CI run, one review and one merge.

## 5. Checks per level

| Level | Checks |
|---|---|
| L0 | The level confirmed on the issue (no logic, state or data in the diff); `ci-local` PASS; a look in the running app only when style or layout changed; the Lead reads the diff against the task |
| L1 | Everything for L0; the affected action tried in the running app; a unit or component test when there is logic, none for a value or a button wired to an existing endpoint; a configuration value changed in every environment file, noted in the PR |
| L2 | Module tests; the main scenario run locally; `ci-local` PASS; the role's `code-review` |
| L3 | Tests by reach; `ci-local` PASS; the role's `code-review` and `security-review` |

The look in the app runs from the source on the role's port with hot reload; no image is built for it. `security-review` runs for any task touching permissions, money, personal data or a secret, whatever its level. The full regression still runs once per milestone on `staging`.

## 6. Models

**Starting point per task:**

| Task | Model | Effort |
|---|---|---|
| L0 | Haiku when all three signals are ticked and it touches about 3 files or fewer; otherwise Sonnet | low |
| L1 | Sonnet; Haiku when all three signals are ticked | medium |
| L2 | Sonnet | high |
| L3 | Sonnet high when all three signals are ticked; otherwise Opus medium (Opus high only through the ladder) | medium or high |
| Analysis (stories, function tree, architecture, CR, ADR, the API contract, splitting tasks) | Opus | medium |
| Design | Opus | medium |
| Reading a PR before a merge | Sonnet; Opus at L3 | medium |
| Coordination, builds, releases | Sonnet | low |

**The ladder**, one step at a time: Haiku low, Sonnet medium, Sonnet high, Opus medium, Opus high. Higher steps are used when the owner asks or a task fails, never by default. The next task starts again from the table.

**Commands.**

| Command | Does |
|---|---|
| `/cb-model` | Shows the model and effort of each open task and session |
| `/cb-model up` | One step up for the task in hand |
| `/cb-model <model> [effort]` | That model for the task in hand |
| `/cb-model #42 <model> [effort]` | In the Lead: that model for issue #42, written on the issue, applied when the task is sent |
| `/cb-redo [model] [effort]` | Does the last step again (an analysis, a design, a task) one step up or with the model given; the first result stays for comparison |

**How the switch happens** (checked on 2026-11-05, see "Step 0 results"):
- The Lead opens each role session with its model and effort (`start_session` takes both), so a session opened from the app runs the model it was given. This fixes the bug where app-opened sessions ran the opener's model.
- Before a hand-off the Lead clears the role's session, sets its model and effort (`set_session_model`, `set_session_effort`), then sends the task. A model or effort above the Lead's own asks the owner unless the session runs in auto mode, so the Lead runs on Opus and the kit recommends auto mode.
- A session cannot change its own model or effort; the app refuses it. So `/cb-model up` and `/cb-redo` typed in a role's session send the request to the Lead, which switches that session; typed in the Lead's own session, they tell the owner to pick the model in the model menu.
- A session-start hook compares the session's real model with the task's and warns on a mismatch.

**When a task fails.** After two red tries, or twice its estimate, the role stops and names the cause:

| Cause | What happens |
|---|---|
| The environment or a tool (database down, missing rights, a broken dependency) | The environment is fixed; the model stays |
| The request is missing or contradicts itself | The Lead clarifies the task |
| The same wrong reasoning after the fixes | The task moves up one step |
| The scope grew | The Lead splits the task and sets its level again |

The alert reaches the owner through the Lead with the task, its model and effort, the cause and the next step, with a button for `/cb-model up`. With `/cb-auto escalate on` the Lead moves a task up by itself below Opus; Opus always asks. The reason goes on the issue. A task never moves down while it is open.

**Defects.** A defect found after a merge is a new Defect issue, never a reopened task. The template gets "Caused by" (the task and its PR) and the label `defect`; it goes to the role that made the task; its level and model are set again by the current risk, not copied from the task.

## 7. Reviews and evidence

- **The role reviews its own diff in a separate context**: `code-review` at L2, `code-review` and `security-review` at L3. Both run as subagents with a fresh context, apart from the session that wrote the code. Findings are fixed before the PR.
- **Each review and each PASS names its commit.** The PR records the commit reviewed and the commit pair of the `ci-local` PASS. A commit pushed after a review means the review runs again on what changed since. The Lead merges only when the PR's last commit is the one reviewed and the PASS is still valid.
- **The Lead does not run the same reviews again.** It reads the diff, checks that every finding is fixed or answered, and that the evidence matches the last commit. A PR without the review its level needs goes back to the role as "Needs changes".
- **`/cb-review [#PR] [standard|adversarial] [focus]`** (in the Lead) is a second opinion from Codex, run only when the owner types it or agrees to the Lead's proposal: its review, then an adversarial pass on security. It checks first that the Codex plugin is installed and enabled and Codex is signed in; if not, it stops and tells the owner to turn the plugin on. A missing plugin, no quota or a failed run is never a pass and never falls back to another reviewer. Findings are posted unchanged with the label `codex-review`; the Lead decides each one. Other reviewers are in the backlog.
- **A PASS is reused only when nothing it depends on changed**: the branch commit, the `dev` commit, `ci-steps.json`, and the environment. A step with `"changed"` paths runs whenever the diff touches its paths or any shared input: lockfiles, build configuration, shared code, the schema, the CI scripts. When the reach of a change is unclear, every step runs.
- **Test works on pinned images**: `api:dev-<sha>` and `web:dev-<sha>`, never the moving `:dev` tag, so an image cannot change under a test run.

## 8. Autonomy

The sessions pass work among themselves; the owner is not asked to choose each hand-off or merge.

- With relay on (the default) the Lead decides and the owner corrects afterwards: hand-offs, which role takes a task, task splits, moving up below Opus when escalation is on, accepting or rejecting review findings, merges into `dev`.
- `/cb-auto merge <off|only-L0|up-to-L1|up-to-L2|all>`: the Lead merges by itself every PR up to that level (off: none; only-L0: L0; up-to-L1: L0 and L1; up-to-L2: L0 to L2) after its review and a valid PASS; above it the PR waits for the owner. `all`, or no value, merges every level, L3 included; it is the default. `off` means the owner approves each PR.
- Always the owner, whatever the settings: the three approvals (the plan, the milestone, the release), releases to `main` and anything on production, money, accounts and secrets, deleting data, a change to the client's scope, date or price, and Opus unless escalation is on.

## 9. Docker and environments

**One shared host per owner.** A build host, a registry and a database server are set up once for all projects: one Docker engine with one build cache, one registry container, one MSSQL or Postgres container holding every project's databases under their own names and logins.

**Fewest containers.** On a machine, every stateful or heavy service runs once and is shared by all projects and environments; only the app's own containers run per environment.

| Runs once per machine (`crewbook-shared`) | Runs per project and environment |
|---|---|
| One SQL Server per major version in use; one Postgres per major version in use (a pgvector image also serves plain Postgres; PostGIS only when a project needs it); one Redis (a database number per project and environment); one embedding or model server; the registry | `api`, `web`, and a worker only when it does something per environment |

- Projects and environments are databases, logins and Redis numbers inside the shared servers, never extra server containers. A new server version is added only when a project requires it.
- A worker that copies the same outside data into every environment (a sync from another system, an indexing job) runs once, into one shared read-only database that every environment reads. A Dev changing the worker itself runs it on demand into its own database, with small data, never as a second always-on loop.
- The Dev runs the app from the source with hot reload, so `dev` has no app container. Frontend runs `api:dev-<sha>`; Test runs the pinned `api` and `web`. A role's containers start when it works and stop when its session is cleared.
- Disk: the build cache is capped (BuildKit garbage collection, about 10 GB), `:dev-<sha>` tags older than the last few are removed, and images of stopped environments are pruned after a release. `run.mjs` reports what it removed. They are written once in `~/.crewbook/hosts.json` (no passwords); a project points to it. One build at a time per host, through a lock on the host. A project that must stay apart (a client's rule) gets its own entries. The zero-setup path stays: this machine, GHCR, one database container.

**Databases.** Every role connects to a database server: the shared one, or its own container at `localhost`. Only the connection string in the role's `.env.local` differs; it is a secret (`set-secret.mjs`).

| Database | Used by | Data |
|---|---|---|
| `<project>_dev` | Dev | Small, by scenario |
| `<project>_frontend` | Frontend, through `api:dev-<sha>` | Small, by scenario |
| `<project>_test` | Test, through the pinned images | Small, by scenario |
| `<project>_ci_<id>` | `ci-local` integration tests | Only what each test sets up; dropped after the run, old ones dropped before the next |
| `<project>_staging` | Regression, acceptance, performance and load tests, data scripts | Up to the volume of production, anonymised |
| Production | The owner | The kit never touches it |

- **Small data by scenario.** The seed covers every business case and state the tests need (one row per case and edge, relations kept together), capped at 10,000 rows per table so the databases stay fast and small. The cap is a limit, not the goal: a case missing from the seed is a seed bug.
- **Migrations on the shared databases run under a lock and never during a run.** After a build, the migrations reach `_frontend` at once (it follows the new `api`), and `_test` only when Test moves its pinned images to the new commit, between runs.
- **Backups that are proved.** `db-setup` keeps the last three `staging` backups and the one taken before each release; each milestone one backup is restored on a scratch database to prove it works.
- **A rollback is the image and the data.** Going back to an older image tag does not undo a schema change. A task that changes the schema ships with its rollback script (DEC-067), and the release notes say which tags can go back by tag alone.
- **Rights per environment.** Each role's login has rights on its own database only; the CI login may create and drop `_ci_` databases; no AI role has a login to production.
- **Real data never reaches a model, enforced.** The role guard blocks reading backup files and dumps; `_source` (for migrations) is anonymised before any AI login can read it; the AI logins exist only on the anonymised databases; query results printed in a session are limited to counts and samples from those databases. Real data through a cloud model needs the client's OK.
- **Setup sets it up**: `docs/tech/ops/environments.md` and a `db-setup` script that creates every database, runs the migrations, loads the seed (`small`, or `full` for staging), and backs up or restores `staging`. The plan is not approved until every database exists and a reset works.

**Projects that migrate data** add `<project>_source` (a read-only, anonymised copy of the old database) and `<project>_migration` (a scratch database with the new schema, reset after each run). The script is written against a sample of `_source` (related rows kept together, at most 10,000 rows per table); the rehearsal runs the full volume on `_staging`: back it up, migrate, time it, run the checks, roll back to the backup. The migrated data is then the staging data. During setup the client prepares the backup of the old database (engine, version, size), the anonymisation rules, access and the downtime window. Before any code the Lead writes the field mapping, the check queries used as acceptance (row counts, money totals, samples) and the rollback plan. A migration task is L3 with a wide reach; its script can run again and resume after a stop.

**Builds.** `project.json` names the `"buildHost"` (`local` or `ssh:<user>@<host>`), the `"registry"`, and the `"images"` with their source folders (`api`, `web`, `design`, or one `app` when the UI lives in the backend project).

- Right after a merge into `dev` the Lead starts `run.mjs dev` in the background: it builds only the images whose inputs changed (the rules of section 7), tags them `:dev` and `:dev-<sha>`, pushes them and migrates `_frontend`. The Lead gets one line; a failed build goes to the PR's author as an Infra task. Merges close together are built once.
- Frontend uses a mock generated from the OpenAPI contract (for example Prism) until `api` has the endpoint, then `api:dev-<sha>`. If a new image breaks a screen it stays on the previous one and tells the Lead.
- `staging` and releases build as in DEC-073; the release tag reuses the accepted `staging` image when the files are the same.
- `deploy.mjs <env> <tag>` (optional) connects over SSH to the environment's server, pulls the tag, starts it, waits for the healthcheck and prints the link. The Dev runs it for `staging`; only the owner runs it for production. Servers only read from the registry; the build host holds no key to production.
- In `github` CI mode GitHub Actions still build and push to GHCR.

**Commands.** `/cb-env [show|setup|reset <db>|backup|restore]` shows and manages the environments: the shared services on the machine, the project's databases, a reset from the seed, `staging` backups and restores. `/cb-deploy <env> <tag>` runs `deploy.mjs`: the Dev for `staging`, only the owner for production; a rollback is the previous tag.

## 10. Commands

| Group | Command | Who | Does |
|---|---|---|---|
| Setup | `/cb-setup` | Lead | The five questions, the plan approval, every session created; run again, it goes on from where it stopped (replaces `/cb-next`) |
| | `/cb-add-role <uiux\|frontend\|test>` | Lead | Adds a role later (replaces `/cb-add-dev`) |
| | `/cb-help` | Any | Every command in one line each, in the owner's language |
| Work | `/cb-plan [milestone]` | Lead | Splits a milestone into tasks with level, reach, signals and model (taken out of `/cb-build`) |
| | `/cb-build try\|done [#n]` | Dev, Frontend, Test | `try`: code and run; `done`: tests by level, self-review, commit recorded, hand-off, PR |
| | `/cb-change <request>` | Lead | A CR (functional) or an ADR (technical) |
| | `/cb-bug <description>` | Any, mostly the owner | The Lead finds the task that caused it, opens a Defect with "Caused by", level and severity, sends it to the right role; a severe production defect goes to the hotfix path |
| Models | `/cb-model up\|<model> [effort]\|#n <model> [effort]\|mode <claude\|deepseek>` | Any; `#n` and `mode` in the Lead | Changes models; showing them is in `/cb-progress` |
| | `/cb-redo [model] [effort]` | Any | The last step again, one step up |
| Review and release | `/cb-review [#PR] [standard\|adversarial] [focus]` | Lead | Codex second opinion |
| | `/cb-release demo\|[version]` | Lead (builds by the Dev) | `demo`: the milestone approval on `staging` (calls `/cb-deploy staging` when a staging server is set); no argument: the release approval |
| | `/cb-deploy <env> <tag>` | Dev for `staging`, owner for production | Puts an image on a server; a rollback is the previous tag |
| Environments | `/cb-env [show\|setup\|reset <db>\|backup\|restore]` | Lead, Dev | The shared services and the project's databases |
| Autonomy | `/cb-auto merge <off\|only-L0\|up-to-L1\|up-to-L2\|all>`, `relay on\|off`, `escalate on\|off`, `testing on\|off`, `off` | Owner | Changes the settings; `/cb-auto off` turns every automation off at once |
| | `/cb-send` | Any | Sends the last hand-off by hand when relay is off |
| Status | `/cb-progress [report]` | Any | The one status view: progress, sessions (idle or working, model), settings; `report` adds the weekly measures |
| Kit | `/cb-update [path]` | Lead | Updates the kit; stops on a project with the old roles |

Removed: `/cb-gate`, `/cb-next`, `/cb-add-dev`.

## 11. Measuring

DEC-043 (cost not measured) is reversed. `/cb-progress` gives a weekly report, read from the local transcripts and counted once per message:

- tokens and cost per role, model, level and task, review and fixes included;
- tasks that passed on the first try, fix rounds, moves up the ladder and their causes;
- the owner's time: approvals, alerts answered, corrections;
- time from a task's start to its merge, and to its acceptance;
- defects after a merge, by severity, level and model.

The baseline is the round-4 project's transcripts, measured the same way before the new version is tried.

## 12. The trial

After the version is built, a new project runs on it and a set of round-4 tasks is replayed on the new kit: an L1 task, an L2 task, a UI task, a defect fix, a change across many files and an L3 change. Each is compared with the baseline on cost, time, first-try passes, the owner's time and defects. The model table is adjusted to the results before the decisions are recorded.

## Step 0 results (2026-11-05)

| Check | Result |
|---|---|
| A session opened by the Lead runs the model and effort it was given | Yes: opened with Haiku, low; `get_session` and the transcript show `claude-haiku-5-5` |
| The Lead changes another session's model and effort | Yes, from that session's next turn; a level above the Lead's own asks the owner unless in auto mode |
| A session changes its own model or effort | No, refused by the app |
| Haiku takes an effort setting | Accepted at low, medium and high and the turns ran; the effect on real work is measured in the trial |
| What an idle session costs | Its first message carried about 77,000 tokens of context: tools about 35,000, MCP tools about 20,000, the system prompt about 12,000, skills about 10,000; 29,000 were new cache, the rest read from cache. The same base rides on every call of every session |
| Clearing a session | Needs the owner's OK each time unless the session runs in auto mode |

| A lean base context (step 0b) | Turning off five plugins and denying seven MCP servers in the project settings moved the base from about 76,900 to 75,800 tokens: skills fell by about 2,700, the MCP tools and the app's own tools did not change. Most of the base comes from the desktop app, not from the project, and most of it is read from the cache (about 46,000 of the first call), which costs a tenth of new input |

What this changes: the Lead opens sessions with their model (no more wrong model); `/cb-model up` goes through the Lead; auto mode is recommended for the sessions. The base context is not worth a build step: each role only turns off the plugins it does not use (design plugins without UI/UX, the humanizer unless asked), and the saving goes where the tokens grow, the conversation itself (fresh context per task, short task packs, small outputs).

## Build order inside the version

0. Done: see "Step 0 results".
1. Roles, init and setup, the foundation steps.
2. Tasks: levels, reach, signals, the task and hand-off format, checks per level.
3. Models: the table, the ladder, `/cb-model`, `/cb-redo`, failure causes, defects.
4. Reviews and evidence, `/cb-review`.
5. Autonomy.
6. Docker and environments.
7. Measuring.
8. The full test suite, `init.mjs` on a temporary folder, then the trial.

## Decisions to record

1. Roles chosen at init and split by layer; DevOps, Dev1 and Dev2 retired; the Lead and the Dev share the release work; sessions opened at setup and cleared after each merge with a hand-off. Supersedes DEC-075; changes DEC-065, DEC-078.
2. Setup in five questions with defaults, the Lead proposing; three approvals (the plan, the milestone, the release) replace the gates G1 to G6; the command set below.
3. Tasks: levels with the API rule, the reach of L3, difficulty signals, checks per level, grouping.
4. Models per task, the ladder, the commands, failure causes, the modes `claude` and `deepseek`. Supersedes DEC-076.
5. Reviews once, in a separate context, tied to the commit; evidence reuse rules; `/cb-review` as Codex. Supersedes DEC-080; changes DEC-073.
6. Autonomy: the Lead decides with relay on, merges by level.
7. Docker and environments: the shared host, databases by role, data by scenario, migrations under a lock, proved backups, rollback with data, real data blocked, builds after each merge, the mock API, `deploy.mjs`. Changes DEC-062, DEC-073.
8. Usage and quality measured weekly. Supersedes DEC-043.

## Files the build will touch

- Kit: `init.mjs`, `update.mjs`, `CLAUDE.md`, `.claude/roles/` (`lead.md`, `dev.md`, `frontend.md` new, `uiux.md`, `test.md`, `devops.md` removed), `.claude/ownership.json`, the session-start and role-guard hooks, `commands/` (`cb-setup`, `cb-build`, `cb-plan` new, `cb-bug` new, `cb-help` new, `cb-next` and `cb-gate` removed, `cb-release`, `cb-progress`, `cb-auto`, `cb-model`, `cb-review`, `cb-update`, `cb-add-role` new, `cb-redo` new, `cb-env` new, `cb-deploy` new, `cb-add-dev` removed), `scripts/` (`project-level.mjs`, `set-level.mjs`, `model.mjs`, `crew-settings.mjs`, `new-role-worktree.mjs`, `set-secret.mjs`, `ci-local.mjs`, `run.mjs`, `codex-review.mjs`, `hosts.mjs` new, `deploy.mjs` new, `db-setup` guide), `docker/` (api, web, design images, `.dockerignore`, cache mounts), `docker-compose.yml`, `.github/ISSUE_TEMPLATE/` (`task.yml`: roles, reach, signals; `defect.yml`: "Caused by"), `.github/pull_request_template.md`, `start-here/`, templates for the function tree, the three-architecture proposal and `environments.md`.
- Kit also: `~/.crewbook/shared/docker-compose.yml` (the shared services), `scripts/set-level.mjs` and the level texts removed.
- Tests: `init.test.mjs`, `update.test.mjs`, `role-guard.test.cjs`, `release.test.mjs`.
- Book: every chapter that names roles, levels, gates or models; `README.md`, `HOW-TO-RUN.md`.
- Spec: `decisions.md`, `srs.md`, `docs/ai-log.md`.

## Backlog

- The `qwen3` mode: Ollama on the desktop, an Anthropic-compatible endpoint or a LiteLLM proxy, strict task packs, L0 to L2 tasks, a replay with a blind review before buying a GPU.
- Moving running projects to the new roles.
- Removing a role from a running project.
- A script that suggests the level from the diff.
- Moving up by itself within a set budget, once the weekly report gives the numbers.
- Reviewers other than Codex for `/cb-review`.
- Working away from home (VPN).
