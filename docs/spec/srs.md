# Software Requirements Specification: Crewbook Build for Claude

The requirements of the playbook itself: what `kit/init.mjs` and the kit it installs must do, and what the book promises. Structure follows the playbook's own [SRS template](../../templates/srs.md). The reasons behind each requirement are in [decisions.md](decisions.md) (DEC-0NN).

**Version:** 0.31 · **Status:** Describes `main` after the PO was removed and the models per role added (2026-11-04) · **Last updated:** 2026-11-05

## Revision history
Newest first. A change to the kit or the book that changes behaviour adds a row here in the same commit.

| SRS version | Commit | Date | Decisions | Sections changed | Summary |
|---|---|---|---|---|---|
| 0.37 | (this commit) | 2026-11-09 | DEC-100 | §3, §8 | The database and the cache: local in the project's Docker by default, or an existing server; PostgreSQL, SQL Server and Redis (FR-117) |
| 0.36 | b2f8466 | 2026-11-09 | DEC-098, DEC-099 | §3, §8 | Setup in ten recorded steps; the database environment per project, existing or managed, one account per project (FR-115, FR-116); the documentation rewrite of 492c4b1 to 68d89c7 reverted |
| 0.35 | 2441bf0 | 2026-11-09 | DEC-097 | §3 | L3 starts on Opus medium; no task starts on Opus high (FR-097) |
| 0.34 | 0144621 | 2026-11-09 | DEC-095, DEC-096 | Title, §1, §3, §8 | Eight fixes from a second Codex review (FR-101, FR-103, FR-109, FR-111, FR-112, FR-114); the name Crewbook Build for Claude and its audience |
| 0.33 | 9a62aaa | 2026-11-09 | DEC-090 to DEC-094 | §3, §6, §8 | After the first trial of the new kit: secrets kept out of sessions, plugins per role, the trial's script fixes and `db-setup.mjs`, reports through the Lead, stalled sessions, approvals asked alone (FR-109 to FR-113); a push's branch read where git runs, credentials judged one by one, `/cb-review` pinned to the PR's head (FR-015, FR-069, FR-102) |
| 0.32 | d6d1d73 | 2026-11-05 | DEC-081 to DEC-089 | §2, §3, §7, §8 | A leaner kit: roles chosen at setup and split by layer, setup in five questions and three approvals, tasks with reach and signals, models per task, reviews once, merge levels, shared environments, weekly measures, one plugin per kind of work (FR-096 to FR-108) |
| 0.31 | 84d6b2e | 2026-11-05 | DEC-080 | §3, §8 | `/cb-review`: a manual command that forces a Codex review (FR-095) |
| 0.30 | a5f4181 | 2026-11-05 | DEC-079 | §3, §8 | Build nothing twice: one image per source tree, `CI_CHANGED_FILES`, `ci-local --full` once per milestone, the Lead's CI guide (FR-094) |
| 0.29 | 8430ee7 | 2026-11-04 | DEC-074 to DEC-078 | §2, §3, §7, §8 | No PO (the Lead from the idea to each release, acceptance by Test or the Lead); two Devs at most with `/cb-add-dev`; model modes and `/cb-model`; every command with the `cb-` prefix; a fresh context per task; safer kit updates (FR-089 to FR-093) |
| 0.28 | 996dc4c | 2026-10-30 | DEC-073 | §3, §8 | Faster CI on the machine: PASS reused for the same branch and `dev`, one run at a time, steps by changed paths, times per step and in total (FR-088) |
| 0.27 | c8b06d9 | 2026-10-28 | DEC-072 | §3, §8 | CI on GitHub or on the machine (`ci-mode.mjs`, `ci-local.mjs`), local by default for a private repo; fewer Actions minutes in github mode (FR-087) |
| 0.26 | 39126fa | 2026-10-24 | DEC-071 | §3, §8 | Full: Test opens after G3 to write the test cases while the Devs build (FR-032, FR-086) |
| 0.25 | b51204e | 2026-10-24 | DEC-070 | §3, §8 | Up to four Devs, one module each, a single owner for shared files, the Dev's self-review before the PR (FR-085) |
| 0.24 | 9937300 | 2026-10-23 | DEC-069 | §3, §7, §8 | Draft first, ask once, approve once; setup asks nothing; "Picture the project" (G1 and G2 in one approval, proposal and screen sketches, two ways to start); "How we build it" (one solution design at G3); plain language (FR-017, FR-018, FR-026, FR-029 to FR-031, FR-035, FR-081 to FR-084) |
| 0.23 | 02193ac | 2026-10-21 | DEC-068 | §3 | `rampstack-seo` off by default in the kit's settings (FR-076) |
| 0.22 | 5193706 | 2026-10-21 | DEC-067 | §3, §7, §8 | The PO up to G2 (with the SRS's functional part) and for the acceptance on `staging` and the handover; the Lead the owner's contact from G3 and every change (CR or ADR); one test round on `staging`, release with no new tests; Lite gets `staging`, Dev1 does the Test work; auto-merge at every level; data changes with update and rollback scripts (FR-004, FR-030, FR-043, FR-045, FR-046, FR-049, FR-072, FR-073, FR-080, FR-081) |
| 0.21 | 4ed7f22 | 2026-10-21 | DEC-066 | §3, §8 | Kit updates for running projects: `kitVersion`, `kit/update.mjs`, `/cb-update` (FR-079) |
| 0.20 | 564e63b | 2026-10-20 | DEC-065 | §3 | Detached sessions go back into the project's sidebar group; `/cb-setup` creates the group (FR-078) |
| 0.19 | b3e1a42 | 2026-10-20 | DEC-065 | §3, §8 | Sessions opened by the hand-off session on the owner's yes, detached at once (FR-078) |
| 0.18 | 80e22c3 | 2026-10-20 | DEC-064 | §3, §8 | Issue and PR numbers shown with link, title and CR (FR-077) |
| 0.17 | 65fb0d5 | 2026-10-20 | DEC-063 | §2, §3.12, §8 | `init` installs the enabled plugins, `/cb-setup` checks them first, no GitHub MCP (FR-076) |
| 0.16 | 6949afc | 2026-10-20 | DEC-062 | §3, §8 | `scripts/run.mjs`, healthchecks, small images at G3 (FR-075) |
| 0.15 | b855889 | 2026-10-20 | DEC-061 | §3, §8 | `/cb-auto merge` and `/cb-auto relay`, both on by default; Lead auto-merges L0-L2; Lite G3 approves the design with the rest (FR-071, FR-073, FR-074) |
| 0.14 | bd087a0 | 2026-10-20 | DEC-060 | §3, §7, §8 | Morning brief and end-of-day report removed; `/cb-progress report` saves a report on request (FR-052) |
| 0.13 | 40e5f58 | 2026-10-20 | DEC-059 | §3.4, §4, §8 | Same seven board columns at every level; the Testing column stays empty at Lite (FR-072, FR-044) |
| 0.12 | 432fb38 | 2026-10-20 | DEC-059 | §3.4, §4, §8 | Board: review loop back to In review, docs PRs on the board, Testing column at Full (FR-072, FR-044) |
| 0.11 | 7793518 | 2026-10-20 | DEC-058 | All | Commands renamed: `/brief` to `/cb-next`, `/cb-build dev` to `/cb-build try`, `/pass` to `/cb-send`, `/msg` to `/relay` |
| 0.10 | da6fce3 | 2026-10-20 | DEC-057 | §3.4, §8 | `/pass` and `/msg on|off` (now `/cb-send` and `/relay`), hand-off tips shown three times (FR-071) |
| 0.9 | 8e018f5 | 2026-10-20 | DEC-056 | §3, §8 | Ownership and live checks at G3, guard redirections, secret check for code, `.env` carried to worktrees (FR-068 to FR-070) |
| 0.8 | c704ad1 | 2026-10-20 | DEC-055 | §3.4, §8 | Commands stay English, explained in the owner's language (FR-063, FR-065) |
| 0.7 | a1d9969 | 2026-10-20 | DEC-054 | §3, §8 | `set-level` asks for the START-HERE rewrite in a non-English project (FR-065) |
| 0.6 | 15e06be | 2026-10-20 | DEC-053, DEC-011 superseded | §3, §8 | Wording review of book, kit and templates: START-HERE in the owner's language, conditional data notes and eval plan, role write paths, ai-log owner, messages line, one test scope per level (FR-065 to FR-067) |
| 0.5 | 884ee77 | 2026-10-20 | DEC-052 | Title, §1 | Renamed to Crewbook: Build; repo `crewbook-build` |
| 0.4 | 0cd449d | 2026-10-20 | DEC-051 | §3.8, §8 | Estimates in AI time (FR-064) |
| 0.3 | 8532327 | 2026-10-20 | DEC-050 | §3.4, §8 | The owner's language covers recaps, questions and buttons (FR-063) |
| 0.2 | c123e80 | 2026-10-20 | DEC-049 | §3.4, §8 | No side sessions for another role's work (FR-062) |
| 0.1 | d280151 | 2026-10-20 | DEC-001 to DEC-048 | All | First written, from the state after the round-3 fixes |

## 1. Introduction

### 1.1 Purpose and scope
Crewbook Build for Claude lets one owner deliver a real software project with a team of Claude Code sessions, under a fixed process with gates the owner approves. It has two parts:
- **The kit** (`kit/`, MIT): `init.mjs` and the files it installs into a project (project `CLAUDE.md`, role files, hooks, slash commands, scripts, GitHub workflows and forms, Docker files, document templates, `START-HERE.md`).
- **The book** (`docs/book/`, CC BY 4.0): why each step works the way it does, as prompts, and the templates in `templates/`.

Out of scope: teaching programming; choosing or running production servers (each release is a Docker image the owner runs where they like); a fast prototype mode (DEC-007); teams of several people with their own tools (DEC-011).

### 1.2 Definitions
The book's glossary ([chapter 0](../book/00-introduction.md#words)) applies. In addition:

| Term | Meaning |
|---|---|
| Project | A repository created by `init.mjs` |
| Main checkout | The project folder init creates; it stays on `main` |
| Role worktree | `<project>-wt/<role>` on branch `role/<role>`, one per session |
| Setup | The Lead's `/cb-setup` step; `"setup"` in `.claude/project.json` records whether it is done |
| Approval | One of the owner's three decisions: the plan (end of `/cb-setup`), a milestone (`/cb-release demo`), a release (`/cb-release`) |
| Hand-off block | The end of a report: the session to open and its prompt alone in a code block |

### 1.3 References
- Decisions: [decisions.md](decisions.md) · Book: [docs/book/](../book/) · How to run: [HOW-TO-RUN.md](../../HOW-TO-RUN.md) · Standards map: [Appendix E](../book/appendix-e-standards.md)

## 2. Overall description

### 2.1 Users and roles

| Role | Can do |
|---|---|
| Owner | A person with an IT background who delivers for clients, most often a freelancer or team lead (DEC-011). Runs init, opens sessions, answers guides, approves gates and releases, runs owner-only commands (secrets, Docker) |
| Lead session | The owner's one contact from the idea to each release: setup (roles, autonomy, requirements, stack, environments), the plan, ADRs, specs, task planning, CRs, DECs, reading PRs, merges, the acceptance without Test, the handover, releases; the only role that merges |
| Dev session | The backend, the API contract and the infrastructure; both layers without Frontend, and the tests without Test |
| UI/UX, Frontend, Test sessions | Chosen by the owner at setup: the design ahead of the code; the screens beside the Dev; the test cases and the regression |

### 2.2 Operating environment
- Claude Code desktop (the plugins of DEC-042 are installed by `init`, DEC-063); Git; Node.js 20 or newer; Docker with Docker Compose v2; the GitHub CLI (`gh`) signed in, with the `project` scope for the board.
- Windows (PowerShell, CRLF files), macOS and Linux. Only Windows has been tried on real projects so far.
- GitHub for issues, PRs, Actions, the board and the image registry (`ghcr.io`); the free plan is enough.

### 2.3 Look and feel
n/a: the playbook has no screens. Products made with it get a look-and-feel round at setup (FR-043).

### 2.4 Constraints and assumptions
- Everything in the repo is written in English; owner-facing session output uses the owner's language (DEC-018, DEC-045).
- No real client data or internal numbers in the repo (DEC-046).
- Sessions do not run by themselves: the owner opens them, and they pick up work from issues (DEC-035).

## 3. Functional requirements

### 3.1 Project creation (`kit/init.mjs`)
| ID | Requirement | Origin | Acceptance |
|---|---|---|---|
| FR-001 | Init shall check Node.js 20+, Git, Docker and Docker Compose before changing anything, stop with install links if one is missing, and warn if Docker is not running or `gh` is missing | DEC-006 | Run without Docker on PATH: exits 1, nothing created |
| FR-002 | Init shall ask three questions, each with a one-line hint and a default taken with Enter (name, folder, GitHub repo), confirm before acting, and accept flags or `--yes` instead; the roles, the language, the stack and the environments come at `/cb-setup` | DEC-082 | Answers piped in the test; `--yes` |
| FR-004 | Init shall create `main`, `dev` and `staging`, commit the kit, and create only the Lead's worktree, with `"setup": false` and `"roles": null` in `.claude/project.json` | DEC-026, DEC-081 | Branches `dev,main,role/lead,staging`; no `dev` worktree |
| FR-005 | Init shall install the project `CLAUDE.md` (name, description, the Roles line, language and documents lines filled), role files, hooks, settings, slash commands, the START-HERE template, `.github/`, scripts, document templates in `docs/templates/`, the Docker files (app, web, design, shared services) and `.dockerignore` | DEC-081, DEC-087 | Files present after init |
| FR-006 | Init shall install the design pipeline for every project, its compose service under the `design` profile so it starts only when asked; UI/UX, chosen at setup, uses it | DEC-081 | `profiles: ["design"]` in `docker-compose.yml` |
| FR-007 | When the owner chooses a GitHub repo, init shall create it, push the branches, create the labels and the board, turn on Dependabot alerts and fixes (and secret scanning with push protection on a public repo), and tell the owner to open the Actions tab once | DEC-009, DEC-034 | Repo, labels and board exist; report lists the Actions check |
| FR-008 | Init shall install the secret-check pre-commit hook | DEC-038 | A staged line with a credential pattern blocks the commit |
| FR-009 | Init shall keep existing files unless `--force` is given, and never write secrets | | Second run lists "Kept existing" |
| FR-010 | Init's last lines shall name the Lead's folder, the session name and `/cb-setup`, and say setup comes first | DEC-026 | Report text |
| FR-079 | Init shall record the kit's version (`kitVersion`, the playbook commit) in `.claude/project.json`. `kit/update.mjs`, run by the Lead through `/cb-update` in its worktree with a clean tree, shall bring a running project up to the kit's version: replace kit files (deleting dropped ones only when untouched), replace `.github` files only when untouched, merge `CLAUDE.md` (keeping the project's title, description, Stage, Documents, Open decisions, stack lines, own rules, rows and sections) and `.claude/settings.json` (keeping every plugin, the project's permissions and hooks), never change Docker files, `CHANGELOG.md`, `README.md` or `docs/` outside `docs/templates/`, list what it did and the kit decisions since the old version, and write nothing with `--dry-run`. The PR always waits for the owner | DEC-066 | `kit/update.test.mjs`: an aged project is updated with each kind of file handled as stated; a second run changes nothing; a dirty tree and `main` are refused; a copy of the round-3 trial project updated with its description, decisions, stack, rules and design plugins kept |

### 3.2 Roles (`scripts/roles.mjs`, `scripts/project-level.mjs`)
| ID | Requirement | Origin | Acceptance |
|---|---|---|---|
| FR-011 | Every project shall have the Lead and the Dev; UI/UX, Frontend and Test shall be the owner's choice at `/cb-setup` (all by default), kept in `"roles"` in `.claude/project.json` and the Roles line of `CLAUDE.md`; a role left out shall leave its work to the Lead (design) or the Dev (frontend, tests) | DEC-081 | `roles.mjs set`; the role guard hands the paths to the Dev |
| FR-012 | `scripts/roles.mjs` shall show what each role does and when it is worth having, set the roles (`set <all\|none\|list>`), create the chosen roles' worktrees (`worktrees [--json]`) and add one later (`add <role>`, `/cb-add-role`), refusing unknown and retired roles | DEC-081 | `kit/init.test.mjs` (roles) |

### 3.3 Roles, guard and session start
| ID | Requirement | Origin | Acceptance |
|---|---|---|---|
| FR-014 | Each worktree shall hold its role in `.claude/role`, and each role shall have a role file with its mission, work, skills, paths, limits and Recovery steps | DEC-002 | Role files in `.claude/roles/` |
| FR-015 | The `role-guard` hook shall block pushes to branches other than the role's own (the Lead excepted), force pushes to `dev`, `staging` and `main`, `--no-verify`, merges by roles other than the Lead, and edits outside the role's paths; it shall open an approval prompt for the Lead's pushes to `main` or `production`, tags, releases and workflow runs; wrapped and nested commands shall be checked too; the branch of a push shall be read where git runs (`-C`, a `cd` earlier in the command line, `--git-dir`), and a branch it cannot read shall ask the owner when the Lead pushes (DEC-094) | DEC-002 | `role-guard.test.cjs` |
| FR-016 | The session-start hook shall tell each session its role, its skills, the owner-leads rule and to run its Recovery steps; tell a session in the main checkout to move to a worktree; and, while `"setup": false`, tell every role except the Lead to do nothing but say "Setup is not done" and allow only `/cb-progress` | DEC-026, DEC-041 | `init.test.mjs` session-start checks |

### 3.4 Working with the owner (project `CLAUDE.md`)
| ID | Requirement | Origin | Acceptance |
|---|---|---|---|
| FR-017 | Each step that needs the owner shall start from what the owner says, draft at once, mark its guesses ⚠️, and redo the draft as often as the owner asks | DEC-069 | `CLAUDE.md` rule "AI does the work; the owner decides" |
| FR-018 | Sessions shall ask once, at most three questions together, only about what they cannot guess, each with a suggested answer and free text allowed, suggest only when the owner says "suggest" (with `superpowers:brainstorming`), and ask for one approval | DEC-069 | `init.test.mjs` foundation check |
| FR-020 | "Later" shall put a choice under Open decisions in `CLAUDE.md` with the step that needs it and open a `decision` issue; "you decide" shall settle the rest and list the assumptions | DEC-017 | Open decisions section; `decision` label |
| FR-021 | Sessions shall check facts the owner gives when it is cheap, and try a product the owner names in the browser before analysing it | DEC-021 | Skills table row |
| FR-022 | A session that proposes another role's work shall mark it for that role to confirm and post it on that role's issue | DEC-022 | `CLAUDE.md` rule |
| FR-062 | A session shall never start a side session for another role's work; the work goes to that role's session through a hand-off block, and the session-start hook repeats this rule | DEC-049 | `init.test.mjs` side-session check |
| FR-023 | Sessions shall talk to the owner in the language set at init and write commands for the owner's shell | DEC-018, DEC-039 | `CLAUDE.md` Language line |
| FR-063 | Everything the owner reads (replies, questions, options and button labels, the For you block, the end-of-turn recap and next-step box) shall be in the owner's language; commands, paths and code stay English with a few words in the owner's language on what each does; the session-start hook shall name the language | DEC-050, DEC-055 | `init.test.mjs` language checks |

### 3.5 Setup (`/cb-setup`)
| ID | Requirement | Origin | Acceptance |
|---|---|---|---|
| FR-024 | `/cb-setup` shall run only in the Lead and come before every other step | DEC-026 | Other roles wait (FR-016) |
| FR-026 | `/cb-setup` shall ask five questions, each with a default or a proposal and at most one short round inside: the roles, the autonomy, the requirements (stories, the usually missing ones as suggestions, the function tree), the deployment model and stack (three architectures, one recommended, "you decide" allowed) and the environments (proposed from the machine); then the plan approval; run again, it shall go on from the first step not done | DEC-082 | `commands/cb-setup.md` |
| FR-027 | After the plan approval `/cb-setup` shall fill in `CLAUDE.md`, create milestone v0.1.0, set `"setup": true`, create every chosen role's worktree and, in Claude Code desktop, its session (title, Sonnet at low effort until its first task, detached and filed in the project's group), check that CI ran and start `/cb-plan` | DEC-081, DEC-082 | `commands/cb-setup.md` |

### 3.6 Setup and the plan (`/cb-setup`)
| ID | Requirement | Origin | Acceptance |
|---|---|---|---|
| FR-029 | The requirements (setup question 3): from the owner's words, the Lead shall write the stories, mark the stories usually missing for this kind of product as suggestions the owner keeps or drops, and build the function tree in `docs/product/function-tree.md` (modules, screens or functions, main actions), each guess marked; after the plan approval it shall write the functional part of the SRS without asking again | DEC-082 | `templates/function-tree.md` |
| FR-030 | The deployment model and stack (setup question 4): the Lead shall ask about scale once, then show three architectures (stack, hosting, running cost, fit), one recommended (`templates/architecture-options.md`); on "you decide" take the recommended one; then write `docs/tech/solution-design.md`, ADRs only for choices that were really open, no C4 required | DEC-082 | `templates/architecture-options.md` |
| FR-031 | The plan approval shall show one page (requirements, function tree, architecture, environments, the first milestone, the roles and the autonomy, the open decisions) and is not given until every database exists and a reset works | DEC-082, DEC-087 | `commands/cb-setup.md` |
| FR-082 | Every document the kit writes shall be in plain language for a reader with no technical background (everyday words, short sentences, terms explained, examples); IDs and template sections stay; technical documents open with "In short" | DEC-069 | `CLAUDE.md` rule "Plain language", templates |
| FR-083 | The kit shall ship `templates/solution-design.md` and create `docs/product/screens/` | DEC-069 | `init.test.mjs` see-it-first check |
| FR-084 | A secret the terminal will not take shall go into `.env.local` through an editor the Lead may open but never read; a secret pasted in the chat shall not be used | DEC-069 | `CLAUDE.md` Secrets line |
| FR-032 | With Test, the Test session shall start on the test cases once the plan is approved and at the start of each milestone (`/cb-plan` hands it the milestone) | DEC-071, DEC-081 | `commands/cb-plan.md` |
| FR-033 | Foundation work shall happen under the gate's issue, and commits shall name it | DEC-029 | Commit messages |

### 3.7 Approvals
| ID | Requirement | Origin | Acceptance |
|---|---|---|---|
| FR-035 | The owner shall approve three times: the plan (end of `/cb-setup`), each milestone (`/cb-release demo`), each release (`/cb-release`); each request shows only what the Lead's checks found missing, the For you block and the question | DEC-082 | `CLAUDE.md` rule "Asking for an approval" |
| FR-036 | An approval request shall have the gate table, a For you block with links, then the question | DEC-019, DEC-020 | `CLAUDE.md` rule |
| FR-037 | An item waiting for someone outside the team may be approved later with an issue, a due date and the step that needs it | DEC-033 | `gate.md` "Approved later" |
| FR-038 | Only the owner passes a gate; the session records the approval date and closes the gate's issue | DEC-001, DEC-029 | Status field and closed issue |

### 3.8 Delivery (`/cb-build`, `/cb-change`, board)
| ID | Requirement | Origin | Acceptance |
|---|---|---|---|
| FR-039 | `/cb-plan` (Lead) shall split a milestone into tasks a fresh session can build (approach, files, pattern, tests, acceptance, API contract), with level, reach, difficulty signals, model and estimate; split issues needing both layers; put them in Ready and send each role its first task after setting its model | DEC-083, DEC-084 | `commands/cb-plan.md` |
| FR-085 | The kit shall allow at most two Dev worktrees (`dev1`, `dev2`, ports 5201 and 5202; FR-090); a Dev's own key in `.claude/ownership.json` shall limit its edits to its workstream; shared files shall have one owner; each Dev shall run `code-review` on its own L2-L3 diff before the PR, and the Lead's L2 review shall read the diff and that self-review | DEC-070, DEC-075 | `new-role-worktree.mjs`, `role-guard.cjs`, `CLAUDE.md` rule "Two Devs", `cb-build.md`, PR template |
| FR-086 | With Test, the Test session shall write the test cases for every requirement of the milestone (and the automated tests it can write before the code, against the pinned images) at the start of the milestone and run the regression on `staging` at the end; without Test the Dev does it | DEC-071, DEC-081 | `roles/test.md`, `roles/dev.md` |
| FR-087 | The kit shall run CI either on GitHub Actions or on the owner's machine: init shall set `"ci"` and the repo variable `CI_MODE` (`github` for a public repo, otherwise `local`); every workflow job shall skip when `CI_MODE` is `local`; `scripts/ci-local.mjs` shall run `scripts/ci-steps.json` on a branch merged with `dev` and exit 0 only when every step passed; in local mode the Dev and the Lead shall run it before the PR and before the merge, and `run.mjs` shall build `staging` and tags locally; in github mode CI shall run on PRs only and skip documents-only PRs, and the app image shall build on `staging` and tags only | DEC-072 | `scripts/ci-mode.mjs`, `ci-local.mjs`, `ci-steps.json`, `run.mjs`, `.github/workflows/`, `init.mjs`, `CLAUDE.md` rule "Where CI runs" |
| FR-088 | `scripts/ci-local.mjs` shall reuse a PASS for the same branch and `dev` commits without running the steps again (unless `--again`), run one at a time on the machine through a lock in `.git` that clears after an hour, skip a step with `"changed"` paths when the branch changed none of them since it left `dev` (every step on `dev` itself or when `ci-steps.json` changed), and print the time of each step and the total | DEC-073 | `scripts/ci-local.mjs`, `scripts/ci-steps.json`, `CLAUDE.md` rule "Where CI runs", `roles/lead.md` |
| FR-089 | `new-role-worktree.mjs` and `roles.mjs` shall refuse the retired roles `po`, `dev1`, `dev2`, `dev3`, `dev4` and `devops`, and the session-start hook shall tell such a session where its work goes and to do no new work | DEC-074, DEC-081 | `project-level.mjs` (`RETIRED_ROLES`), `session-start.cjs` |
| FR-091 | `scripts/model.mjs` shall pick a task's starting model from its level and signals (`pick`), record it in the role's worktree (`task`), move it one step up the ladder with its reason (`up`), set the mode (`claude`, `deepseek`; `mix` read as `deepseek`) and one role's provider (`provider`), write DeepSeek's settings only for DeepSeek roles, refuse DeepSeek without its key and never print it | DEC-084 | `kit/init.test.mjs` (models) |
| FR-092 | Every kit command shall start with `cb-`; `update.mjs` shall stop on a project with the roles from before DEC-081, and otherwise remove old command files, keep a project's own `ci-local.mjs` until its steps are in `ci-steps.json`, and keep the project's Roles line | DEC-077, DEC-081 | `kit/update.test.mjs` |
| FR-093 | Context by phase: Dev and Frontend cleared after each merged PR once their hand-off is on the issue, Test after a test round, UI/UX after an approved design package, the Lead at the end of a phase (mid-phase a compaction naming what to keep); a stuck task names its cause (environment, request, reasoning, scope) and only the same wrong reasoning moves it up | DEC-078, DEC-081, DEC-084 | `CLAUDE.md` rules "Fresh context", "Models" |
| FR-094 | With CI on this machine the kit shall build an image once per set of files (`run.mjs` shall tag an image built from the same source tree instead of building it again, never using the dev image as a source); `ci-local.mjs` shall give each step `CI_CHANGED_FILES` and run every step with `--full`, which the Lead runs once per milestone on `staging` before the image is built | DEC-079 | `scripts/run.mjs`, `project-level.mjs` (`imageRecord`, `sameTreeTag`), `ci-local.mjs`, `CLAUDE.md` rule "Where CI runs", `roles/lead.md`, `test.md`, `commands/cb-release.md` |
| FR-095 | `/cb-review` (Lead) shall run a Codex second opinion on a PR only when the owner asks or agrees, label the PR `codex-review`, post the findings, send accepted ones to the author and give a reason for each rejected one; a missing or disabled plugin, a quota error or a failed run shall be reported as no review, never as a pass, and not replaced by another reviewer | DEC-080, DEC-085 | `commands/cb-review.md`, `scripts/codex-review.mjs` |
| FR-096 | Each task shall carry its level, for L3 its reach (one point, narrow, wide) and affected places, and three difficulty signals; the Task form shall ask for the approach, files, pattern, tests and model; small L0-L1 changes in one area shall be one task | DEC-083 | `.github/ISSUE_TEMPLATE/task.yml` |
| FR-097 | A task shall start on the model the table gives (level and signals; never above Opus medium, DEC-097), move up one step at a time only on the owner's request or the same wrong reasoning, and never move down while open; Opus asks the owner unless escalation is on and allowed | DEC-084 | `CLAUDE.md` rule "Models", `scripts/model.mjs` |
| FR-098 | The Lead shall set a role's session model and effort before each hand-off; a session shall not change its own; `/cb-model` and `/cb-redo` in a role's session shall ask the Lead; the session-start hook shall name the task's model and warn when the session runs another | DEC-084 | `commands/cb-model.md`, `commands/cb-redo.md`, `session-start.cjs` |
| FR-099 | `/cb-bug` shall turn a report into a Defect with "Caused by" (the task and PR), severity and its own level and model, sent to the role that made the task; a severe production defect goes to the hotfix path | DEC-084 | `commands/cb-bug.md`, `defect.yml` |
| FR-100 | The role's own reviews shall run once, in a fresh context, on the final commit; the Lead shall not run them again but check that they and the PASS name the PR's last commit and the current `dev` | DEC-085 | `CLAUDE.md` rule "Reviews and evidence" |
| FR-101 | `ci-local.mjs` shall run every step when the branch changed a shared input (CI files, lockfiles, manifests, build configuration, Docker files, migrations, `"shared"` in `ci-steps.json`), give each step `CI_DB_NAME` and `CI_DB_PREFIX`, and run on the build host over SSH when there is one; with a build host it shall settle the branch first, require it pushed, and the host shall read origin's branches (DEC-095) | DEC-085, DEC-087 | `kit/init.test.mjs` (ci-local) |
| FR-102 | `/cb-review` shall run Codex's review and an adversarial security pass by default (`standard`, `adversarial <focus>` as options), stop with how to enable the plugin when it is installed but off, and never count a failed run as a pass; a PR shall be reviewed at GitHub's head commit, fetched through its pull ref, and a branch at its remote copy after a fetch (DEC-094) | DEC-085 | `scripts/codex-review.mjs`, `commands/cb-review.md` |
| FR-103 | `scripts/hosts.mjs` shall keep the machine's build host, registry, staging server and database servers in `~/.crewbook/hosts.json` without passwords, start and stop the shared services once per machine, and take their passwords hidden into `~/.crewbook/.env` | DEC-087 | `kit/init.test.mjs` (hosts) |
| FR-104 | `scripts/deploy.mjs` (`/cb-deploy`) shall have an environment's server pull and start a tag over SSH, refuse production without `--owner`, and the role guard shall stop any session that runs it for production | DEC-087 | `kit/init.test.mjs` (deploy), `role-guard.test.cjs` |
| FR-105 | The role guard shall block reading database backups and dumps, through the Read tool and through shell reading commands, and allow restoring them with the database's tools | DEC-087 | `role-guard.test.cjs` |
| FR-106 | `/cb-env` shall show and set up the environments: shared servers reused, one database per role and environment with its own login, small data by scenario, `staging` backups proved, documented in `docs/tech/ops/environments.md` | DEC-087 | `commands/cb-env.md`, `templates/environments.md` |
| FR-107 | `scripts/usage.mjs` (`/cb-progress report`) shall report tokens and estimated cost per role, model, task and level (each message once, each call to one task), first-try passes, fix rounds, moves up and causes, hours to merge, the owner's messages and defects by origin, also for another project (`--project`) | DEC-088 | `kit/init.test.mjs` (measures) |
| FR-108 | The kit shall enable Product Management for the requirements (setup question 3, unclear functional CRs) and Superpowers for the technical plan and the tasks, both filling the kit's documents, with no second plan; a small change already clear skips Product Management | DEC-089 | `kit/.claude/settings.json`, `kit/CLAUDE.md` Skills table |
| FR-109 | The role guard shall block, in every role and in subagents, reading a real `.env` file (Read, Grep, shell readers, inline code), dumping the environment, `docker compose config` and `docker inspect` without `--format`, and allow `.env.example`; `docker inspect --format` only with fields that hold no secrets (DEC-095) | DEC-090 | `role-guard.test.cjs` (secrets, search) |
| FR-110 | Each role worktree shall get its plugins in its `settings.local.json`: claude-mem for the Lead, Product Management off outside the Lead; the shared settings shall turn claude-mem off; `plugins.mjs` shall install the role plugins; `/cb-update` shall apply them | DEC-091 | `init.test.mjs` (plugins per role, plugins), `update.test.mjs` (claude-mem) |
| FR-111 | `run.mjs` shall tag each service's own image, run `devMigrate` in the built commit with `CREWBOOK_API_IMAGE`, skip layers without a folder, start staging with its database, http cookies and network address from `docker-compose.staging.yml` without printing them, and run `stagingMigrate` first; `hosts.mjs` shall check each started service's password and change `POSTGRES_PASSWORD` in the running server; a failed push shall fail the build and leave the image unrecorded; the staging overlay shall map `host.docker.internal` (DEC-095) | DEC-092 | `run.test.mjs`, `init.test.mjs` (images, hosts) |
| FR-112 | `scripts/db-setup.mjs` shall create one database and login per role and environment on the shared Postgres, write each checkout's connection strings without printing them, and check, reset, migrate, seed, back up and restore them; a restore into a project database shall keep its login as owner (DEC-095) | DEC-092 | `init.test.mjs` (db-setup) |
| FR-113 | Roles shall report to the Lead and take tasks only from the Lead and the owner; the Lead shall relay the owner's answers word for word, find stalled sessions and list them in `/cb-progress`; setup shall ask roles, autonomy and the idea together; an approval shall be asked alone and count only when the answer approves; `usage.mjs` shall count messages from other sessions apart | DEC-093 | `init.test.mjs` (relay) |
| FR-114 | `model.mjs up` shall move a task to the first ladder step above its current model and effort, never skipping a step and never lowering it | DEC-095 | `init.test.mjs` (models off the ladder) |
| FR-040 | `/cb-build try [#n]` shall code and run the task with no tests and no merge, commit `<type>(<module>): <summary> (#n)`, push the role branch and keep the issue In progress | DEC-030 | `build.md` |
| FR-041 | `/cb-build done [#n]` shall confirm the level and reach against the diff (raise, never lower), run the checks of that level, the role's own review in a fresh context on the final commit, `ci-local` when CI runs here, then open a PR into `dev` naming the commit reviewed and the PASS, and move the issue to In review | DEC-083, DEC-085 | `commands/cb-build.md`, PR template |
| FR-042 | The Lead shall review every PR (`code-review`, plus `security-review` for L3), merge into `dev`, and when CI on `dev` is green close the issue and move it to Done | DEC-031 | Closed issue in Done |
| FR-043 | After the plan approval `/cb-change <request>` shall run in the Lead and first sort the request (FR-080); a functional change becomes a CR with who asked and how, the scope before and after, testable acceptance, a proposed level, the impact on AI time, date and price, and the client's approval before work starts | DEC-003, DEC-067, DEC-082 | `commands/cb-change.md` |
| FR-080 | A change shall be sorted by what the client receives: functional (a feature added or cut, behaviour a user sees, scope, acceptance, date or price) as a CR; technical (how it is built or run) as an ADR, with the owner's OK when it touches cost or accepts a risk and no client approval; after the plan approval the Lead takes both; what a technical change leaves the client to prepare and the risks the owner accepted go into the milestone file. A change to the database schema or existing data shall be L3 with an update and a rollback script tried on a staging database, and a large or risky one flagged for a database specialist | DEC-067 | `CLAUDE.md` rules "Two kinds of change" and "Data changes"; `change.md` |
| FR-044 | `scripts/board-status.mjs <n> "<column>"` shall move an issue, or a PR with no task issue, on the project board | DEC-034, DEC-059 | Card moves |
| FR-045 | An alignment edit to an approved document shall be L0 with a note in the PR; any other change goes through a CR (functional) or an ADR (technical) | DEC-032, DEC-067 | `CLAUDE.md` rule |
| FR-065 | When the owner writes in another language than the project's, `/cb-setup` shall set it and rewrite START-HERE in it, keeping commands, paths, code blocks and links; `roles.mjs` and `update.mjs` render START-HERE in English and the Lead rewrites it | DEC-053, DEC-082 | `commands/cb-setup.md` |
| FR-066 | Role boundaries: the Dev owns the backend, the API contract and the infrastructure; Frontend the screens; UI/UX `design/` and the tokens; Test the test folders; the longer path wins in `.claude/ownership.json`; the Lead may write anything and prefers the owning role after setup; only the Lead writes `docs/ai-log.md` | DEC-081 | `role-guard.cjs` (`ownerOf`), `role-guard.test.cjs` |
| FR-067 | The checks each change level needs (L0-L3 with the API rule, the reach of L3, `security-review` on sensitive changes whatever the level) shall be defined once, in the project `CLAUDE.md`; `/cb-build`, the role files and the PR template refer to it | DEC-083 | `CLAUDE.md` Change level rule |
| FR-068 | At setup, with the stack, the Lead shall write `.claude/ownership.json` (the Dev's and Frontend's folders, Frontend's inside the Dev's when the UI lives in the backend project) and check each outside service with one live call | DEC-056, DEC-081 | `commands/cb-setup.md`, `roles/lead.md` |
| FR-069 | The role guard shall ignore shell redirections when it reads a push's refspecs; the secret check shall pass code that hands a value along and block literal credentials; each credential found shall be judged on its own text, never excused by another word on its line (DEC-094) | DEC-056 | `role-guard.test.cjs`, `pre-commit.test.mjs` |
| FR-070 | A new role worktree shall carry the keys from the main checkout's `.env.local` and git-ignored `.env`, without printing them | DEC-056 | `init.test.mjs` (new worktree) |
| FR-071 | `/cb-send` shall send the last hand-off prompt to the session it names; `/cb-auto relay on|off` (on by default) shall set messages between sessions for every checkout at once without a commit; before a hand-off each session shall read the setting (`crew-settings.mjs handoff`), send the one-line prompt itself and name it in its recap when on, and show the hand-off block when off or when the receiving session is closed; the tip under a block shall show three times at most, only while messages are off, and stop once the owner used `/cb-send` or `/cb-auto` | DEC-057, DEC-061 | Hand-offs |
| FR-073 | `/cb-auto merge <off\|only-L0\|up-to-L1\|up-to-L2\|all>` (`all` by default and when empty) shall let the Lead merge by itself every PR up to that level after the role's reviews and a valid PASS, reporting each merge in one recap line; above it the PR waits for the owner; `escalate on\|off` and `off` (relay, merge and escalate at once) as in DEC-086 | DEC-061, DEC-086 | `scripts/crew-settings.mjs` (`merge-ok`) |
| FR-075 | `node scripts/run.mjs [version\|dev] [--source\|--stop\|--build-only\|--here\|--dry-run]` shall run a version in Docker with one command on every OS; build one image per layer (`"images"`), for dev only the changed ones tagged `:dev` and `:dev-<sha>`, push them to the registry, build on the build host over SSH when there is one, run `devMigrate` after a dev build, then start the images and wait for their healthcheck | DEC-062, DEC-087 | `kit/init.test.mjs` (run.mjs, images, build host) |
| FR-072 | The board shall show every wait: an issue goes back to In progress when the Lead asks for changes and to In review again when the fixes are pushed; a PR with no task issue sits in In review until merged; with per-task testing on (`/cb-auto testing on`, with Test) an L1-L3 task waits in Testing until Test passes it | DEC-059 | `scripts/board-status.mjs` |
| FR-064 | Estimates shall be in AI time, split into AI working time, the owner's time and outside waits, starting from L0 15 min, L1 30 min, L2 1 h, L3 2 h per task; tasks over 2 h are split; each closed task records its actual AI time and the Lead recalibrates every milestone | DEC-051 | Task form, milestone template, `init.test.mjs` estimate check |

### 3.9 Release (`/cb-release`, `scripts/release.mjs`)
| ID | Requirement | Origin | Acceptance |
|---|---|---|---|
| FR-046 | `/cb-release demo` shall check that the milestone is ready, merge `dev` into `staging`, have the Dev run `ci-local staging --full` and build the `staging` image, have the regression run there (Test, or the Dev without Test), with data changes the update and rollback scripts, then the acceptance (FR-081) and the milestone approval | DEC-067, DEC-082 | `commands/cb-release.md` |
| FR-081 | The Lead shall be the owner's one contact from the idea to each release. At the end of each milestone the acceptance on `staging` (Test after its regression, or the Lead) shall try every acceptance criterion of the milestone's stories and CRs, record each result in the test report and the handover, and give the owner 3-5 scenarios | DEC-074, DEC-081 | `commands/cb-release.md` |
| FR-047 | `/cb-release demo` shall stop after acceptance, with no tag | DEC-030 | No tag created |
| FR-048 | `release.mjs` shall compute the version from the issue labels (SemVer, breaking ignored before 1.0), write the CHANGELOG version block and the SRS revision row and status, keep CRLF or LF line endings, and warn when the changelog was not updated | DEC-005 | `release.test.mjs` |
| FR-049 | After the release approval the Lead shall merge into `main` exactly the `staging` commit that was accepted, with no new tests, tag, push and create the GitHub release; the Dev builds or reuses the release image and checks that it starts | DEC-067, DEC-081 | `commands/cb-release.md` |

### 3.10 Hand-offs and reports
| ID | Requirement | Origin | Acceptance |
|---|---|---|---|
| FR-050 | Work changing hands shall get a hand-off comment on the issue in the fixed format, and the receiving session shall comment `Started #n` | DEC-035 | Issue comments |
| FR-051 | A report that hands work over shall end with the session to open, its folder, and a short prompt alone in a code block, nothing after it | DEC-036 | Kit commands use the block |
| FR-052 | `/cb-progress` shall report, read-only and from live state, the stage, open decisions, work done since the last tag, work in progress, what waits for the owner, CI, and the next step; before setup it shall say setup is not done; with `report`, in the PO or the Lead, it shall also save the reply as `docs/reports/<date>.md` | DEC-037, DEC-060 | `progress.md` |
| FR-053 | Every file, issue, PR, run and board mentioned to the owner shall be a clickable link; a page outside GitHub needs the owner's OK | DEC-023 | `CLAUDE.md` rule |
| FR-054 | Sessions shall check live state before reporting it, never run commands that wait for input, and show a page only after checking it themselves | DEC-024, DEC-039 | `CLAUDE.md` rules |

### 3.11 Secrets
| ID | Requirement | Origin | Acceptance |
|---|---|---|---|
| FR-055 | `scripts/set-secret.mjs <NAME>` shall read the value without showing it, refuse bad names and `PORT`, write `NAME=value` to the git-ignored `.env.local` of the main checkout and every worktree, and never print the value | DEC-038 | `init.test.mjs` set-secret checks |
| FR-056 | `new-role-worktree.mjs` shall give a new worktree `.env.local` with its port and the secrets already set in the main checkout | DEC-038 | `init.test.mjs` worktree check |
| FR-057 | Sessions shall never read, create or ask for secrets, and shall tell the owner to replace a secret that reached the chat | DEC-038 | `CLAUDE.md` rule |

### 3.12 Skills and plugins
| ID | Requirement | Origin | Acceptance |
|---|---|---|---|
| FR-058 | The project `CLAUDE.md` shall name the skill for each task, and ban the superpowers worktree and subagent skills | DEC-041 | Skills table |
| FR-059 | The kit's settings shall enable superpowers, code-review and context7 for every role, claude-mem for the Lead (FR-110), and humanizer only for polished documents; setup enables frontend-design and ui-ux-pro-max for products with screens | DEC-042 | `init.test.mjs` plugin checks |
| FR-076 | `init` shall install the plugins `.claude/settings.json` enables through `scripts/plugins.mjs` (marketplaces first, then `claude plugin install --scope user`) or print the `/plugin install` lines when the `claude` command is missing, and skip this with `--no-plugins`; the kit's settings shall set `rampstack-seo` to `false` so a user-level install stays off unless the project turns it on; `/cb-setup` shall check its skill list for the enabled plugins before anything else and stop with the install step when one is missing; the kit shall need no GitHub MCP | DEC-063, DEC-068 | Plugins on a new machine |
| FR-077 | Every issue or PR number a session shows the owner shall be a link with its short title and its CR when there is one; recaps and buttons, which hold no links, shall add a few words to the number; the hand-off "Next" line shall start with the linked issue | DEC-064 | Owner-facing text |
| FR-078 | `/cb-setup` and `/cb-add-role` shall create a role's session in its worktree with its title and model, detached to top level and filed in the project's group; when a step needs a closed session, the Lead asks the owner once and opens it the same way | DEC-065, DEC-081 | `CLAUDE.md` rule "Opening sessions" |

### 3.13 This repository
| ID | Requirement | Origin | Acceptance |
|---|---|---|---|
| FR-060 | `.github/workflows/test.yml` shall run the role-guard, release and init tests on every push and pull request | | Green Actions run |
| FR-061 | A change that alters kit behaviour or the book's process shall update this SRS and the decision log in the same commit, and add a line to `docs/ai-log.md` | DEC-048 | Commit contents |

## 4. Data
- `.claude/project.json`: `name`, `level` (`lite` or `full`), `repo`, `language`, `docsLanguage`, `design`, `humanize`, `setup`.
- `.claude/role`: one word, the role of the worktree.
- Project `CLAUDE.md` lines read by scripts and sessions: Level, Language, Documents, Stage, Open decisions, Stack.
- Labels: `cr`, `type:feature`, `type:change`, `type:fix`, `breaking`, `L0`-`L3`, `role:*`, `defect`, `gate`, `decision`, `sev:high`, `sev:medium`, `sev:low`, `blocked`, `needs-owner`, `codex-review`, `claude-review`.
- Board columns, the same for every project: Backlog, Approved, Ready, In progress, In review, Testing (used with Test and per-task testing on), Done (`scripts/setup-board.mjs`). Cards: issues, and PRs with no task issue.
- `.env.local` (git-ignored): `PORT` per worktree and the owner's secrets.

## 5. External interfaces

| Interface | Direction | Contract | Requirement |
|---|---|---|---|
| GitHub through `gh` | out | repo, labels, issues, PRs, milestones, Projects board, Actions runs, security settings | FR-007, FR-026, FR-042, FR-044 |
| GitHub Actions | in | `ci`, `codeql`, `docs-check`, `image-app`, `image-design` workflows | FR-049 |
| GitHub Container Registry | out | `ghcr.io/<owner>/<repo>-app:<tag>` and `-design` | FR-049 |
| Docker Compose | out | `docker-compose.yml` with `app` (and `design`) services | FR-031, FR-046 |
| Claude Code | in | `CLAUDE.md`, `.claude/settings.json` (hooks, plugins), `.claude/commands/`, `.claude/roles/` | FR-014 to FR-016, FR-058 |

## 6. Non-functional requirements

| ID | Characteristic | Requirement | How verified |
|---|---|---|---|
| NFR-001 | Performance | n/a beyond init finishing in a few minutes on a normal machine | Trials |
| NFR-002 | Reliability | Init can be re-run and keeps existing files; scripts other than init's GitHub step never push; a failed GitHub step leaves a working local project and says how to finish | `init.test.mjs` |
| NFR-003 | Security | Secrets never committed (pre-commit check, `.gitignore`), never shown or printed, never read by a session (FR-109); role paths and push rules enforced by a hook; owner approval for `main`, tags and releases | `role-guard.test.cjs`, `init.test.mjs` |
| NFR-004 | Usability | A new owner reaches `/cb-setup` in about five minutes once the tools are installed; every next step is one command or one copied prompt; owner-facing text in the owner's language | Trials |
| NFR-005 | Compatibility | Windows (PowerShell, CRLF), macOS and Linux; Node.js 20+; Docker Compose v2 | `release.test.mjs` CRLF cases; CI on Linux; macOS not yet tried |
| NFR-006 | Maintainability | Kit tests: init, role-guard, release; one decision log and this SRS; new code files carry the SPDX and credit lines | CI |
| NFR-007 | Portability | Projects run from the release image with `docker compose up` | `/cb-release` check |
| NFR-008 | Safety | n/a | |
| NFR-009 | Cost (not in 25010) | Each task on the cheapest model that does it well (DEC-084); context by phase; reviews and CI runs reused while valid; services once per machine; measured weekly (DEC-088) | `scripts/usage.mjs`; book chapter 9 |

## 7. Removed requirements

| ID | Removed in | By | Reason |
|---|---|---|---|
| FR-003 Lite and Full levels at init | (this commit) | DEC-081 | Roles are chosen at setup (FR-011) |
| FR-013 `set-level.mjs` | (this commit) | DEC-081 | No levels; `roles.mjs add` and `/cb-add-role` (FR-012) |
| FR-028 `/cb-next` | (this commit) | DEC-082 | `/cb-setup` goes on where it stopped (FR-026) |
| FR-034 `/cb-gate` and the gates G1-G6 | (this commit) | DEC-082 | Three approvals, checked inside `/cb-setup` and `/cb-release` (FR-035) |
| FR-090 `/cb-add-dev` and Dev2 | (this commit) | DEC-081 | The Dev and Frontend split by layer; `/cb-add-role` (FR-012) |
| The DevOps role | (this commit) | DEC-081 | Its set-up goes to the Lead, its builds and images to the Dev |
| The all-DeepSeek model mode | (this commit) | DEC-084 | Every mode keeps Claude; `mix` is now `deepseek` |
| Starter level (one session, one brief for G1-G3, no PRs) | d280151 | DEC-012 | Slower than three sessions and hides the hand-offs |
| The PO role (`roles/po.md`, the `po` worktree, `role/po`) | (this commit) | DEC-074 | The owner is the product owner; the Lead does its work, Test or the Lead the acceptance |
| Dev3 and Dev4 | (this commit) | DEC-075 | Four Devs made the hand-offs messy; two at most |
| Command names without the `cb-` prefix, `/kit-update` | (this commit) | DEC-077 | Now `/cb-...`, `/cb-update` |
| `/status` command | d280151 | DEC-037 | Clashed with Claude Code's `/status`; now `/cb-progress` |
| Morning brief and end-of-day report (PO, `docs/reports/` every day) | bd087a0 | DEC-060 | Never written in round 3; `/cb-progress` covers it, `/cb-progress report` saves one |
| `/relay` command | b855889 | DEC-061 | Now `/cb-auto relay`, next to `/cb-auto merge` |
| "What you need to say" guides, the "lock" and "final, or review first?" confirmation (FR-019) | 9937300 | DEC-069 | Owners lost hours in rounds; the AI drafts, asks once and redoes instead |
| Setup interview (FR-025) | 9937300 | DEC-069 | Constraints were asked three times; setup asks nothing |
| Separate G2 approval; G3 design approved before the stack; Lite G3 screens question (FR-074) | 9937300 | DEC-069 | One approval for the proposal and sketches, one for the solution design |
| Stack question at setup | d280151 | DEC-027 | The stack is chosen at G3, after the design |
| `docker compose up` at G1 | d280151 | DEC-027 | No app exists before the stack |
| `docs/design/look-and-feel.html` path | d280151 | DEC-027 | UI/UX may only write `design/` |
| `templates/next.md` | d280151 | DEC-012 | Only Starter used it |
| The PO approving L0-L1 CRs within the buffer by itself; CRs written by the PO after G2 | 5193706 | DEC-067 | After G2 the Lead takes every change, and every functional change needs the client's approval on record |
| Test checking each merged task at Full by default | 5193706 | DEC-067 | Each milestone is tested once, on `staging`; `/cb-auto testing on` brings the per-task check back |
| Lite releasing from `dev` without `staging` | 5193706 | DEC-067 | Both levels test on `staging` and release the accepted commit |
| L3 PRs waiting for the owner with auto-merge on | 5193706 | DEC-067 | Nothing reaches `main` without `staging`, the PO's acceptance and the owner's release approval |
| A docs PR per task for its actual AI time | 5193706 | DEC-067 | Times stay on the issue; the Lead copies them once per milestone |
| Habit Tracker worked example | d280151 | DEC-047 | Made with Starter; to be redone at Lite |
| github MCP and product-management as required plugins | c90aa5d | DEC-042 | Not used; the kit uses `gh` |

## 8. Traceability matrix

| Requirement | Decisions | Kit files | Tests | Status |
|---|---|---|---|---|
| FR-011, FR-012, FR-066, FR-089 | DEC-081 | `kit/scripts/roles.mjs`, `kit/scripts/project-level.mjs`, `kit/.claude/hooks/role-guard.cjs`, `kit/.claude/roles/` | `kit/init.test.mjs` (roles), `role-guard.test.cjs` (roles, longer path) | Delivered |
| FR-026, FR-027, FR-029 to FR-031, FR-035 | DEC-082 | `kit/commands/cb-setup.md`, `kit/CLAUDE.md`, `templates/function-tree.md`, `templates/architecture-options.md` | `kit/init.test.mjs` (setup, approvals) | Delivered; to try on a new project |
| FR-039, FR-041, FR-067, FR-096 | DEC-083 | `kit/commands/cb-plan.md`, `kit/commands/cb-build.md`, `kit/.github/ISSUE_TEMPLATE/task.yml`, PR template | `kit/init.test.mjs` (levels, task form) | Delivered |
| FR-099 | DEC-084 | `kit/commands/cb-bug.md`, `kit/.github/ISSUE_TEMPLATE/defect.yml` | `kit/init.test.mjs` (defects) | Delivered |
| FR-095, FR-100 to FR-102 | DEC-085 | `kit/CLAUDE.md`, `kit/scripts/ci-local.mjs`, `kit/scripts/codex-review.mjs`, `kit/commands/cb-review.md` | `kit/init.test.mjs` (shared input, Codex passes, disabled plugin) | Delivered; to confirm with the real plugin |
| FR-073 | DEC-086 | `kit/scripts/crew-settings.mjs`, `kit/commands/cb-auto.md` | `kit/init.test.mjs` (merge levels, off) | Delivered |
| FR-075, FR-103 to FR-106 | DEC-087 | `kit/scripts/run.mjs`, `kit/scripts/hosts.mjs`, `kit/scripts/deploy.mjs`, `kit/docker/`, `kit/commands/cb-env.md`, `kit/commands/cb-deploy.md` | `kit/init.test.mjs` (hosts, build host, images, deploy, dry runs), `role-guard.test.cjs` (backups, production) | Delivered; SSH, registry and shared services to try on the desktop |
| FR-107 | DEC-088 | `kit/scripts/usage.mjs`, `kit/commands/cb-progress.md` | `kit/init.test.mjs` (measures); run on the round-4 project | Delivered |
| FR-108 | DEC-089 | `kit/.claude/settings.json`, `kit/CLAUDE.md`, `kit/commands/cb-setup.md`, `kit/commands/cb-change.md`, `kit/.claude/roles/lead.md` | `kit/init.test.mjs` (plugins) | Delivered; the plugin's skills to confirm in a real setup |
| FR-109 to FR-113 | DEC-090 to DEC-093 | `kit/.claude/hooks/role-guard.cjs`, `kit/.claude/settings.json`, `kit/scripts/project-level.mjs`, `run.mjs`, `hosts.mjs`, `db-setup.mjs`, `plugins.mjs`, `usage.mjs`, `new-role-worktree.mjs`, `kit/update.mjs`, `kit/docker/`, `kit/CLAUDE.md`, `commands/cb-setup.md`, `cb-progress.md`, `cb-env.md`, `cb-release.md`, roles `lead.md`, `test.md` | `role-guard.test.cjs`, `run.test.mjs`, `kit/init.test.mjs`, `kit/update.test.mjs` | Delivered; to try in the next trial |
| FR-114 | DEC-095 | `kit/scripts/model.mjs`, `ci-local.mjs`, `run.mjs`, `db-setup.mjs`, `kit/docker/docker-compose.staging.yml`, `kit/.claude/hooks/role-guard.cjs` | `init.test.mjs` (models, build host), `role-guard.test.cjs` (inspect) | Delivered; push failures, restore ownership and Linux not yet run against Docker |
| FR-115 | `/cb-setup` shall run its ten steps in order and record each with `setup-state.mjs` only after its check passes; a role's worktree shall get its own `DATABASE_URL`; the Lead shall prepare the look and feel before the plan; a project without GitHub shall be connected before any GitHub step; the requirements step shall ask for corrections, not an approval | DEC-098 | `init.test.mjs` (setup steps, setup-state, connect-github, new worktree DATABASE_URL) |
| FR-116 | The database environment shall be existing (a connection string, any location, the server never managed) or managed (a server for the project with its own identity, port and credentials in the project); each project shall have one account owning all its databases, created from an admin or given with CREATEDB, and refused otherwise; the admin shall never reach a worktree; database work shall go through a connection string; old projects shall be detected and moved only by the owner | DEC-099 | `kit/scripts/db-setup.test.mjs` (AC-03 to AC-18 with real servers), `role-guard.test.cjs` (owner-only database commands), `init.test.mjs`, `update.test.mjs` |
| FR-117 | The database (PostgreSQL or SQL Server) and the cache (Redis) shall run local in the project's own Docker by default (127.0.0.1 only, generated passwords, kept across runs and stops) or on an existing server given by a connection string; each service shall have one project account (the database owner of every project database; on Redis the keys `<project>:*`); each role shall get its own DATABASE_URL and REDIS_PREFIX and never an admin; SQL Server on an existing server shall require `sqlcmd` installed with the owner's OK | DEC-100 | `kit/scripts/db-setup.test.mjs` (local and existing for the three engines, with real servers), `role-guard.test.cjs`, `run.test.mjs`, `init.test.mjs` |
| FR-001 to FR-010 | DEC-006, DEC-012, DEC-026 | `kit/init.mjs` | `kit/init.test.mjs` | Delivered |
| FR-011, FR-012 | DEC-081 | `scripts/roles.mjs`, `scripts/project-level.mjs` | `kit/init.test.mjs` (roles) | Delivered |
| FR-014, FR-015 | DEC-002 | `.claude/roles/`, `.claude/hooks/role-guard.cjs` | `role-guard.test.cjs` | Delivered |
| FR-016 | DEC-026, DEC-041 | `.claude/hooks/session-start.cjs` | `kit/init.test.mjs` (session-start) | Delivered |
| FR-017, FR-018, FR-020 to FR-023 | DEC-015 to DEC-022, DEC-069 | `kit/CLAUDE.md`, `.claude/hooks/session-start.cjs` | `kit/init.test.mjs` (foundation check) | Delivered; round 5 to confirm |
| FR-062 | DEC-049 | `kit/CLAUDE.md`, `.claude/hooks/session-start.cjs` | `kit/init.test.mjs` (side sessions) | Delivered |
| FR-072 | DEC-059 | `commands/cb-build.md`, roles `lead.md`, `dev.md`, `test.md`, `kit/CLAUDE.md`, `scripts/board-status.mjs`, `scripts/setup-board.mjs` | `kit/init.test.mjs` (board) | Delivered; card moves to verify live in round 4 |
| FR-071, FR-073 | DEC-057, DEC-061 | `commands/cb-send.md`, `commands/cb-auto.md`, `scripts/crew-settings.mjs`, `kit/CLAUDE.md`, `roles/lead.md` | `kit/init.test.mjs` (/cb-auto, tips, auto-merge) | Delivered |
| FR-075 | DEC-062, DEC-087 | `scripts/run.mjs`, `docker/docker-compose.yml`, `commands/cb-release.md`, `start-here.md` | `kit/init.test.mjs` (run.mjs dry runs, images, build host) | Delivered; live pull and healthcheck to verify on a real project |
| FR-068 to FR-070 | DEC-056, DEC-081 | `commands/cb-setup.md`, `.claude/hooks/role-guard.cjs`, `hooks/pre-commit`, `scripts/new-role-worktree.mjs` | `init.test.mjs`, `role-guard.test.cjs`, `pre-commit.test.mjs` (11) | Delivered |
| FR-065 to FR-067 | DEC-053 | `commands/cb-setup.md`, role files, `kit/CLAUDE.md`, `commands/cb-build.md`, `.github/pull_request_template.md` | `kit/init.test.mjs` (suite passes) | Delivered |
| FR-064 | DEC-051 | `kit/CLAUDE.md`, `.github/ISSUE_TEMPLATE/task.yml`, `templates/milestone.md`, `commands/cb-build.md` | `kit/init.test.mjs` (estimates) | Delivered |
| FR-063 | DEC-050 | `kit/CLAUDE.md`, `kit/init.mjs`, `.claude/hooks/session-start.cjs` | `kit/init.test.mjs` (language) | Delivered |
| FR-024 to FR-027 | DEC-026, DEC-027, DEC-029 | `commands/cb-setup.md`, `scripts/new-role-worktree.mjs`, `scripts/setup-labels.mjs` | `kit/init.test.mjs` (content checks) | Delivered; not yet run on a real project |
| FR-029 to FR-033 | DEC-082 | `commands/cb-setup.md`, `.claude/roles/lead.md`, `uiux.md`, `start-here.md`, `templates/function-tree.md`, `templates/architecture-options.md` | `kit/init.test.mjs` (setup) | Delivered; not yet run on a real project |
| FR-089 | DEC-074, DEC-075 | `scripts/project-level.mjs`, `scripts/new-role-worktree.mjs`, `.claude/hooks/session-start.cjs` | `kit/init.test.mjs` (po refused, retired session told) | Delivered |
| FR-090 | DEC-075 | `commands/cb-add-dev.md`, `kit/CLAUDE.md`, `.claude/hooks/role-guard.cjs` | `kit/init.test.mjs` (dev2 worktree, port, rules), `role-guard.test.cjs` (two workstreams) | Removed (DEC-081) |
| FR-091, FR-097, FR-098 | DEC-084 | `kit/scripts/model.mjs`, `kit/commands/cb-model.md`, `kit/commands/cb-redo.md`, `kit/.claude/hooks/session-start.cjs` | `kit/init.test.mjs` (models: table, ladder, task record, hook warning, modes, provider) | Delivered; the hook's model field to confirm in a real session |
| FR-092 | DEC-077 | `kit/commands/`, `kit/update.mjs` | `kit/init.test.mjs` (cb- commands, old names gone), `kit/update.test.mjs` (renames, own ci-local kept, retired roles reported) | Delivered |
| FR-095 | DEC-080 | `kit/commands/cb-review.md`, `kit/scripts/codex-review.mjs`, `kit/.claude/roles/lead.md`, `kit/CLAUDE.md` | `kit/init.test.mjs` (codex-review: plugin missing, review run in a worktree at the PR head, adversarial focus, failure not a pass) | Delivered; to confirm with the real plugin |
| FR-094 | DEC-079 | `scripts/run.mjs`, `scripts/project-level.mjs`, `scripts/ci-local.mjs`, `kit/CLAUDE.md`, `.claude/roles/lead.md`, `test.md`, `commands/cb-release.md` | `kit/init.test.mjs` (CI_CHANGED_FILES, --full, same-tree image reuse, guide text) | Delivered; docker tag path to confirm in a release |
| FR-093 | DEC-078 | `kit/CLAUDE.md`, `.claude/roles/lead.md`, `dev.md`, `commands/cb-build.md` | Trials | Delivered; to confirm in a trial |
| FR-088 | DEC-073 | `scripts/ci-local.mjs`, `scripts/ci-steps.json`, `kit/CLAUDE.md`, `.claude/roles/lead.md` | `kit/init.test.mjs` (changed-only step skipped, total time, stale lock cleared, PASS reused) | Delivered |
| FR-087 | DEC-072 | `scripts/ci-mode.mjs`, `scripts/ci-local.mjs`, `scripts/ci-steps.json`, `scripts/run.mjs`, `.github/workflows/`, `kit/init.mjs`, `kit/CLAUDE.md` | `kit/init.test.mjs` (ci mode, run.mjs local build, workflows, ci-local PASS and FAIL) | Delivered |
| FR-086 | DEC-071, DEC-081 | `.claude/roles/test.md`, `dev.md`, `commands/cb-plan.md`, `commands/cb-add-role.md` | `kit/init.test.mjs` (Test writes the test cases early) | Delivered |
| FR-085 | DEC-070 | `scripts/new-role-worktree.mjs`, `.claude/hooks/role-guard.cjs`, `kit/CLAUDE.md`, `commands/cb-build.md`, `.github/pull_request_template.md` | `role-guard.test.cjs` (per-Dev modules), `kit/init.test.mjs` (dev4 worktree) | Delivered |
| FR-082 to FR-084 | DEC-069 | `kit/CLAUDE.md`, `templates/`, `kit/init.mjs` | `kit/init.test.mjs` (see-it-first and foundation checks) | Delivered |
| FR-035 to FR-038 | DEC-019, DEC-020, DEC-033, DEC-082 | `kit/CLAUDE.md` (Asking for an approval), `commands/cb-setup.md`, `commands/cb-release.md` | `kit/init.test.mjs` (approvals) | Delivered |
| FR-039 to FR-045 | DEC-004, DEC-030 to DEC-032, DEC-034 | `commands/cb-build.md`, `commands/cb-change.md`, `scripts/board-status.mjs`, `.github/` | Trials | Delivered; board moves not yet verified live |
| FR-046 to FR-049 | DEC-005, DEC-009, DEC-030 | `commands/cb-release.md`, `scripts/release.mjs`, `.github/workflows/image-app.yml` | `release.test.mjs` | Delivered |
| FR-050 to FR-054 | DEC-023, DEC-024, DEC-035 to DEC-037, DEC-039 | `kit/CLAUDE.md`, `commands/cb-progress.md` | `kit/init.test.mjs` (content checks) | Delivered |
| FR-055 to FR-057 | DEC-038 | `scripts/set-secret.mjs`, `scripts/new-role-worktree.mjs`, `hooks/pre-commit` | `kit/init.test.mjs` (set-secret) | Delivered |
| FR-058, FR-059 | DEC-041, DEC-042 | `kit/CLAUDE.md`, `.claude/settings.json` | `kit/init.test.mjs` (plugins) | Delivered |
| FR-076 | DEC-063, DEC-068 | `scripts/plugins.mjs`, `init.mjs`, `commands/cb-setup.md` | `kit/init.test.mjs` (plugins dry run, /cb-setup check); init run on a temp folder installed the five plugins | Delivered |
| FR-077 | DEC-064 | `kit/CLAUDE.md` (Links, hand-offs), `commands/cb-progress.md` | `kit/init.test.mjs` (links) | Delivered; to confirm in transcripts of the habit tracker run |
| FR-078 | DEC-065, DEC-081 | `kit/CLAUDE.md` (Opening sessions), `commands/cb-setup.md`, `commands/cb-add-role.md`, `commands/cb-plan.md` | `kit/init.test.mjs` (sessions); step 0 check: a session opened by the Lead runs the model it was given | Delivered |
| FR-079 | DEC-066 | `kit/update.mjs`, `commands/cb-update.md`, `init.mjs`, `scripts/project-level.mjs`, `.claude/roles/lead.md`, `kit/CLAUDE.md` (Ask the owner before) | `kit/update.test.mjs`; `kit/init.test.mjs` (kitVersion); trial-project copy | Delivered |
| FR-080, FR-081 | DEC-067 | `kit/CLAUDE.md` (Two kinds of change, Data changes, Auto-merge), roles `lead.md`, `dev.md`, `test.md` (`po.md` removed by DEC-074), `.claude/hooks/role-guard.cjs`, `scripts/project-level.mjs`, `set-level.mjs`, `commands/cb-change.md`, `release.md`, `gate.md`, `auto.md`, `scripts/crew-settings.mjs`, `.github/ISSUE_TEMPLATE/cr.yml`, `templates/cr.md`, `changes.md`, `handover.md`, `milestone.md` | `kit/init.test.mjs` (change kinds, PO and Lead jobs, Lite staging, data changes, auto-merge, templates, release, `/cb-auto testing`); `role-guard.test.cjs` (Lite Test paths) | Delivered; not yet tried in a trial |
| FR-060, FR-061 | DEC-048 | `.github/workflows/test.yml`, `CLAUDE.md` | CI | Delivered |
