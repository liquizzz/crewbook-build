# Software Requirements Specification: Crewbook: Build

The requirements of the playbook itself: what `kit/init.mjs` and the kit it installs must do, and what the book promises. Structure follows the playbook's own [SRS template](../../templates/srs.md). The reasons behind each requirement are in [decisions.md](decisions.md) (DEC-0NN).

**Version:** 0.30 · **Status:** Describes `main` after the PO was removed and the models per role added (2026-11-04) · **Last updated:** 2026-11-05

## Revision history
Newest first. A change to the kit or the book that changes behaviour adds a row here in the same commit.

| SRS version | Commit | Date | Decisions | Sections changed | Summary |
|---|---|---|---|---|---|
| 0.30 | (this commit) | 2026-11-05 | DEC-079 | §3, §8 | Build nothing twice: one image per source tree, `CI_CHANGED_FILES`, `ci-local --full` once per milestone, the Lead's CI guide (FR-094) |
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
Crewbook: Build lets one owner deliver a real software project with a team of Claude Code sessions, under a fixed process with gates the owner approves. It has two parts:
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
| Gate issue | The GitHub issue of a foundation gate (G1, G2, G3), label `gate` |
| Hand-off block | The end of a report: the session to open and its prompt alone in a code block |

### 1.3 References
- Decisions: [decisions.md](decisions.md) · Book: [docs/book/](../book/) · How to run: [HOW-TO-RUN.md](../../HOW-TO-RUN.md) · Standards map: [Appendix E](../book/appendix-e-standards.md)

## 2. Overall description

### 2.1 Users and roles

| Role | Can do |
|---|---|
| Owner | A person with an IT background who delivers for clients, most often a freelancer or team lead (DEC-011). Runs init, opens sessions, answers guides, approves gates and releases, runs owner-only commands (secrets, Docker) |
| Lead session | The owner's one contact from the idea to each release: setup, the proposal, screen sketches, PRD, stories and SRS (G1-G2), design and stack (G3), ADRs, specs, task planning, CRs, DECs, reviews, merges, the acceptance at Lite, the handover, releases; the only role that merges |
| Dev session(s) | Dev1, and Dev2 on `/cb-add-dev`: code and tests for assigned tasks in its own workstream; pushes `role/devN` |
| Test, UI/UX, DevOps sessions | Full level only, opened by the Lead when there is work; Test also does the acceptance on `staging` |

### 2.2 Operating environment
- Claude Code desktop (the plugins of DEC-042 are installed by `init`, DEC-063); Git; Node.js 20 or newer; Docker with Docker Compose v2; the GitHub CLI (`gh`) signed in, with the `project` scope for the board.
- Windows (PowerShell, CRLF files), macOS and Linux. Only Windows has been tried on real projects so far.
- GitHub for issues, PRs, Actions, the board and the image registry (`ghcr.io`); the free plan is enough.

### 2.3 Look and feel
n/a: the playbook has no screens. Products made with it get a look-and-feel round at G3 (FR-043).

### 2.4 Constraints and assumptions
- Everything in the repo is written in English; owner-facing session output uses the owner's language (DEC-018, DEC-045).
- No real client data or internal numbers in the repo (DEC-046).
- Sessions do not run by themselves: the owner opens them, and they pick up work from issues (DEC-035).

## 3. Functional requirements

### 3.1 Project creation (`kit/init.mjs`)
| ID | Requirement | Origin | Acceptance |
|---|---|---|---|
| FR-001 | Init shall check Node.js 20+, Git, Docker and Docker Compose before changing anything, stop with install links if one is missing, and warn if Docker is not running or `gh` is missing | DEC-006 | Run without Docker on PATH: exits 1, nothing created |
| FR-002 | Init shall ask eight questions, each with a one-line hint and a default taken with Enter (name, folder, level, language, design prototype, polished documents, description, GitHub repo), confirm before acting, and accept flags or `--yes` instead | DEC-018 | Piped answers create the project; "no" at the confirmation creates nothing |
| FR-003 | Init shall offer the levels Lite (default) and Full; `--level starter` shall map to Lite | DEC-012 | `--level starter` gives `"level": "lite"` |
| FR-004 | Init shall create `main`, `dev` and `staging` at every level, commit the kit, and create only the Lead's worktree, with `"setup": false` in `.claude/project.json` | DEC-026, DEC-067 | Branches `dev,main,role/lead,staging`; no `po` or `dev1` worktree |
| FR-005 | Init shall install the project `CLAUDE.md` (name, description, level, language and documents lines filled), role files, hooks, settings, slash commands, START-HERE templates, `.github/`, scripts, document templates in `docs/templates/`, Docker files, the docs folders, `docs/ai-log.md`, `README.md`, `.env.example` and `.gitignore` lines | DEC-002, DEC-044 | Files present; START-HERE has no unfilled `{{…}}` |
| FR-006 | Init shall leave out the design pipeline (design service, image workflow, Dockerfile) unless the owner asked for a design prototype, and leave out the humanizer plugin unless documents are polished | DEC-042 | Default run has no `design:` service and no humanizer plugin |
| FR-007 | When the owner chooses a GitHub repo, init shall create it, push the branches, create the labels and the board, turn on Dependabot alerts and fixes (and secret scanning with push protection on a public repo), and tell the owner to open the Actions tab once | DEC-009, DEC-034 | Repo, labels and board exist; report lists the Actions check |
| FR-008 | Init shall install the secret-check pre-commit hook | DEC-038 | A staged line with a credential pattern blocks the commit |
| FR-009 | Init shall keep existing files unless `--force` is given, and never write secrets | | Second run lists "Kept existing" |
| FR-010 | Init's last lines shall name the Lead's folder, the session name and `/cb-setup`, and say setup comes first | DEC-026 | Report text |
| FR-079 | Init shall record the kit's version (`kitVersion`, the playbook commit) in `.claude/project.json`. `kit/update.mjs`, run by the Lead through `/cb-update` in its worktree with a clean tree, shall bring a running project up to the kit's version: replace kit files (deleting dropped ones only when untouched), replace `.github` files only when untouched, merge `CLAUDE.md` (keeping the project's title, description, Stage, Documents, Open decisions, stack lines, own rules, rows and sections) and `.claude/settings.json` (keeping every plugin, the project's permissions and hooks), never change Docker files, `CHANGELOG.md`, `README.md` or `docs/` outside `docs/templates/`, list what it did and the kit decisions since the old version, and write nothing with `--dry-run`. The PR always waits for the owner | DEC-066 | `kit/update.test.mjs`: an aged project is updated with each kind of file handled as stated; a second run changes nothing; a dirty tree and `main` are refused; a copy of the round-3 trial project updated with its description, decisions, stack, rules and design plugins kept |

### 3.2 Levels (`scripts/set-level.mjs`, `scripts/project-level.mjs`)
| ID | Requirement | Origin | Acceptance |
|---|---|---|---|
| FR-011 | Lite shall use Lead and Dev1 sessions and release through `staging` to `main` | DEC-012 | START-HERE Lite; release from `dev` |
| FR-012 | Full shall add `staging` and, when there is work, Test, UI/UX and DevOps sessions | DEC-001 | `staging` exists at Full |
| FR-013 | `set-level.mjs <lite|full>` shall move a project up or down, create the branches and (once setup is done) the worktrees of the level, delete nothing, list sessions no longer used, and update `project.json`, the Level line and START-HERE; `starter` shall mean Lite | DEC-012, DEC-040 | Up to Full creates `staging`; down keeps it and says so |

### 3.3 Roles, guard and session start
| ID | Requirement | Origin | Acceptance |
|---|---|---|---|
| FR-014 | Each worktree shall hold its role in `.claude/role`, and each role shall have a role file with its mission, work, skills, paths, limits and Recovery steps | DEC-002 | Role files in `.claude/roles/` |
| FR-015 | The `role-guard` hook shall block pushes to branches other than the role's own (the Lead excepted), force pushes to `dev`, `staging` and `main`, `--no-verify`, merges by roles other than the Lead, and edits outside the role's paths; it shall open an approval prompt for the Lead's pushes to `main` or `production`, tags, releases and workflow runs; wrapped and nested commands shall be checked too | DEC-002 | `role-guard.test.cjs` |
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
| FR-026 | `/cb-setup` shall ask the owner one thing, the model mode (FR-091): it fills in `CLAUDE.md`, renames the Lead's session "<Project> - Lead" in Claude Code desktop, creates milestone v0.1.0 (Full: also v0.2.0) and the G1-G3 gate issues, set `"setup": true`, merge into `dev` and push | DEC-026, DEC-029, DEC-069, DEC-076 | Gate issues and milestone on GitHub |
| FR-027 | `/cb-setup` shall then create Dev1's worktree at Lite (none at Full) from the Lead's worktree, check that CI ran, and end with `/cb-next <idea>` in the Lead's own session | DEC-026, DEC-036, DEC-074 | Dev1 worktree at Lite after setup |

### 3.6 Foundation (`/cb-next`)
| ID | Requirement | Origin | Acceptance |
|---|---|---|---|
| FR-028 | `/cb-next` shall find the next foundation step from the documents' Status fields and send the owner to the right session if this is the wrong one | DEC-001 | `next.md` table |
| FR-029 | G1 and G2, "Picture the project": the Lead shall write a one-page `docs/product/proposal.md` in plain words and sketch the main screens in `docs/product/screens/` (no screens: the main flows as steps), starting from the proposal for a clear idea or from 2-3 screens for a vague one, and mapping an existing system keep / drop / redo; the owner approves both once | DEC-001, DEC-069, DEC-074 | Gate G1 |
| FR-030 | G2: after that approval, without asking again, the Lead shall write the PRD, one story per must-have with testable acceptance matching the approved screens, the functional part of the SRS (sections 1-3, one `FR-xxx` per requirement with origin and acceptance) and, at Full when data comes from an existing system, the data notes mapped to real fields; it completes the SRS at G3 | DEC-001, DEC-067, DEC-069, DEC-074 | Gate G2 |
| FR-031 | G3, "How we build it": the Lead shall write one solution design (`docs/tech/solution-design.md`: system map, architecture with stack, framework and patterns and the options left out, data and migration, one function end to end, the look and feel as 2-3 directions applied to the sketches (Full: by a UI/UX session; Lite: by the Lead), milestones, risks) for one approval; then, without the owner, the ADRs, the stack installed once, Docker and CI, the design plugins, the SRS baseline (Full: C4, test strategy, and an eval plan when the product has AI features) and milestone v0.1.0 with its tasks in Ready, asking again only when that changes what was approved | DEC-028, DEC-069 | Gate G3 |
| FR-082 | Every document the kit writes shall be in plain language for a reader with no technical background (everyday words, short sentences, terms explained, examples); IDs and template sections stay; technical documents open with "In short" | DEC-069 | `CLAUDE.md` rule "Plain language", templates |
| FR-083 | The kit shall ship `templates/solution-design.md` and create `docs/product/screens/` | DEC-069 | `init.test.mjs` see-it-first check |
| FR-084 | A secret the terminal will not take shall go into `.env.local` through an editor the Lead may open but never read; a secret pasted in the chat shall not be used | DEC-069 | `CLAUDE.md` Secrets line |
| FR-032 | After G3 the Lead shall propose the sessions the milestone needs (at Full Dev1 and Test) and create their worktrees on the owner's OK | DEC-008, DEC-071 | Hand-off blocks for the new sessions |
| FR-033 | Foundation work shall happen under the gate's issue, and commits shall name it | DEC-029 | Commit messages |

### 3.7 Gates (`/cb-gate`)
| ID | Requirement | Origin | Acceptance |
|---|---|---|---|
| FR-034 | `/cb-gate <G1-G6>` shall check each criterion for the project's level and design flag against the repo and GitHub, report pass, fail or unclear with evidence, and change nothing | DEC-001 | `gate.md` |
| FR-035 | G1 shall not require a running app; G1 and G2 shall be approved together on the proposal and the sketches; G3 shall require the approved solution design, ADRs written from it and `docker compose up --build` to start the project | DEC-027, DEC-069 | `gate.md` table |
| FR-036 | An approval request shall have the gate table, a For you block with links, then the question | DEC-019, DEC-020 | `CLAUDE.md` rule |
| FR-037 | An item waiting for someone outside the team may be approved later with an issue, a due date and the step that needs it | DEC-033 | `gate.md` "Approved later" |
| FR-038 | Only the owner passes a gate; the session records the approval date and closes the gate's issue | DEC-001, DEC-029 | Status field and closed issue |

### 3.8 Delivery (`/cb-build`, `/cb-change`, board)
| ID | Requirement | Origin | Acceptance |
|---|---|---|---|
| FR-039 | `/cb-build` in the Lead shall split the milestone into tasks with level, role and estimate, put them in Ready, create any missing worktree on the owner's OK, and end with one hand-off block per session that starts | DEC-030, DEC-040 | `build.md` |
| FR-085 | The kit shall allow at most two Dev worktrees (`dev1`, `dev2`, ports 5201 and 5202; FR-090); a Dev's own key in `.claude/ownership.json` shall limit its edits to its workstream; shared files shall have one owner; each Dev shall run `code-review` on its own L2-L3 diff before the PR, and the Lead's L2 review shall read the diff and that self-review | DEC-070, DEC-075 | `new-role-worktree.mjs`, `role-guard.cjs`, `CLAUDE.md` rule "Two Devs", `cb-build.md`, PR template |
| FR-086 | At Full the Test session shall write the test cases for every requirement of the milestone (and the automated tests it can write before the code) at the start of the milestone, while the Devs build, and run the regression on `staging` at the end; G4 shall check that the test cases cover the milestone | DEC-071 | `roles/test.md`, `lead.md`, `commands/cb-build.md`, `next.md`, `gate.md` |
| FR-087 | The kit shall run CI either on GitHub Actions or on the owner's machine: init shall set `"ci"` and the repo variable `CI_MODE` (`github` for a public repo, otherwise `local`); every workflow job shall skip when `CI_MODE` is `local`; `scripts/ci-local.mjs` shall run `scripts/ci-steps.json` on a branch merged with `dev` and exit 0 only when every step passed; in local mode the Dev and the Lead shall run it before the PR and before the merge, and `run.mjs` shall build `staging` and tags locally; in github mode CI shall run on PRs only and skip documents-only PRs, and the app image shall build on `staging` and tags only | DEC-072 | `scripts/ci-mode.mjs`, `ci-local.mjs`, `ci-steps.json`, `run.mjs`, `.github/workflows/`, `init.mjs`, `CLAUDE.md` rule "Where CI runs" |
| FR-088 | `scripts/ci-local.mjs` shall reuse a PASS for the same branch and `dev` commits without running the steps again (unless `--again`), run one at a time on the machine through a lock in `.git` that clears after an hour, skip a step with `"changed"` paths when the branch changed none of them since it left `dev` (every step on `dev` itself or when `ci-steps.json` changed), and print the time of each step and the total | DEC-073 | `scripts/ci-local.mjs`, `scripts/ci-steps.json`, `CLAUDE.md` rule "Where CI runs", `roles/lead.md` |
| FR-089 | The kit shall have no PO role: `new-role-worktree.mjs` shall refuse `po`, `dev3` and `dev4`; the session-start hook shall tell a session with a retired role where its work goes and to do no new work | DEC-074, DEC-075 | `project-level.mjs` (`RETIRED_ROLES`), `new-role-worktree.mjs`, `session-start.cjs` |
| FR-090 | `/cb-add-dev` (Lead, on the owner's request) shall split the milestone into two workstreams that do not touch each other, write them under `dev1` and `dev2` in `.claude/ownership.json` with one owner per shared file, create Dev2's worktree and open its session; with no two independent workstreams it shall add no Dev | DEC-075 | `commands/cb-add-dev.md`, `CLAUDE.md` rule "Two Devs" |
| FR-091 | `scripts/model.mjs` (`/cb-model`) shall show each role's provider and model, set the project's mode (`claude`, `deepseek`, `mix`) and one role's model (`opus`, `sonnet`, `deepseek-pro`, `deepseek-flash`, `default`) by writing the role worktree's git-ignored `.claude/settings.local.json`; it shall refuse `deepseek` and `mix` without `DEEPSEEK_API_KEY`, refuse `deepseek-pro` for UI/UX and Test, never print the key, and apply to new worktrees and after `set-secret.mjs DEEPSEEK_API_KEY` | DEC-076 | `scripts/model.mjs`, `commands/cb-model.md`, `cb-setup.md`, `new-role-worktree.mjs`, `set-secret.mjs`, `CLAUDE.md` rule "Models" |
| FR-092 | Every kit command shall start with `cb-`; `update.mjs` shall remove the old command files and `roles/po.md` (reporting changed ones), keep a project's own `scripts/ci-local.mjs` without adding `ci-steps.json` until the project has its steps there, and report retired roles' worktrees and a missing model mode | DEC-077 | `kit/commands/cb-*.md`, `kit/update.mjs`, `commands/cb-update.md` |
| FR-093 | The Lead shall clear a Dev's context after each merged task when the Dev has no other open PR, and its own after G2 and after each release; a Dev shall stop after two red tries and hand the task back to the Lead, who writes tasks with their approach, files and tests | DEC-078 | `CLAUDE.md` rules "Fresh context" and "Models", `roles/lead.md`, `dev.md`, `commands/cb-build.md`, `cb-next.md`, `cb-release.md` |
| FR-094 | With CI on this machine the kit shall build an image once per set of files (`run.mjs` shall tag an image built from the same source tree instead of building it again, never using the dev image as a source); `ci-local.mjs` shall give each step `CI_CHANGED_FILES` and run every step with `--full`, which the Lead runs once per milestone on `staging` before the image is built | DEC-079 | `scripts/run.mjs`, `project-level.mjs` (`imageRecord`, `sameTreeTag`), `ci-local.mjs`, `CLAUDE.md` rule "Where CI runs", `roles/lead.md`, `test.md`, `commands/cb-release.md` |
| FR-040 | `/cb-build try [#n]` shall code and run the task with no tests and no merge, commit `<type>(<module>): <summary> (#n)`, push the role branch and keep the issue In progress | DEC-030 | `build.md` |
| FR-041 | `/cb-build done [#n]` shall confirm the change level against the diff (raise, never lower), make the tests for that level green, run verification, open a PR into `dev` with `Closes #n` and the level, and move the issue to In review | DEC-004, DEC-030 | PR template fields |
| FR-042 | The Lead shall review every PR (`code-review`, plus `security-review` for L3), merge into `dev`, and when CI on `dev` is green close the issue and move it to Done | DEC-031 | Closed issue in Done |
| FR-043 | After G2 `/cb-change <request>` shall run in the Lead and first sort the request (FR-080); a functional change becomes a CR with who asked and how, the scope before and after, testable acceptance, a proposed level, the impact on AI time, date and price, whether it is billed, and the client's approval recorded before work starts (the owner also approves L2-L3); the approved CR is exported with a row in `docs/product/changes.md` and merged with the SRS and spec in one PR before tasks are assigned | DEC-003, DEC-004, DEC-067 | `change.md`, CR form, `templates/changes.md` |
| FR-080 | A change shall be sorted by what the client receives: functional (a feature added or cut, behaviour a user sees, scope, acceptance, date or price) as a CR; technical (how it is built or run) as an ADR, with the owner's OK when it touches cost or accepts a risk and no client approval; after G2 the Lead takes both; what a technical change leaves the client to prepare and the risks the owner accepted go into the milestone file. A change to the database schema or existing data shall be L3 with an update and a rollback script tried on a staging database, and a large or risky one flagged for a database specialist | DEC-067 | `CLAUDE.md` rules "Two kinds of change" and "Data changes"; `change.md` |
| FR-044 | `scripts/board-status.mjs <n> "<column>"` shall move an issue, or a PR with no task issue, on the project board | DEC-034, DEC-059 | Card moves |
| FR-045 | An alignment edit to an approved document shall be L0 with a note in the PR; any other change goes through a CR (functional) or an ADR (technical) | DEC-032, DEC-067 | `CLAUDE.md` rule |
| FR-065 | When the project's language is not English, `/cb-setup` shall rewrite START-HERE in that language, keeping commands, paths, code blocks and links; after a level change `set-level` shall tell the owner to ask the Lead to rewrite it again | DEC-053, DEC-054 | `commands/cb-setup.md`, `scripts/set-level.mjs`, `init.test.mjs` (language: set-level) |
| FR-066 | Role boundaries: the Lead may write `.github/`, `docker/` and `design/` (preferring UI/UX or DevOps when they exist); Dev shall not edit `packages/tokens/` when UI/UX exists; UI/UX takes work from the Lead; only the Lead writes `docs/ai-log.md`; messages between sessions follow `/relay` (FR-071) | DEC-053, DEC-057 | Role files, `CLAUDE.md` |
| FR-067 | The tests each change level needs shall be defined once, in the project `CLAUDE.md`; `/cb-build`, the Dev role and the PR template refer to it | DEC-053 | `CLAUDE.md` Change level rule |
| FR-068 | At G3, with the stack, the Lead shall write `.claude/ownership.json` for the stack's folders and make one live call to each outside service with the owner's key, recording what the plan blocks; G3 checks both | DEC-056 | `commands/cb-next.md`, `commands/cb-gate.md` |
| FR-069 | The role guard shall ignore shell redirections when it reads a push's refspecs; the secret check shall pass code that hands a value along and block literal credentials | DEC-056 | `role-guard.test.cjs`, `pre-commit.test.mjs` |
| FR-070 | A new role worktree shall carry the keys from the main checkout's `.env.local` and git-ignored `.env`, without printing them | DEC-056 | `init.test.mjs` (new worktree) |
| FR-071 | `/cb-send` shall send the last hand-off prompt to the session it names; `/cb-auto relay on|off` (on by default) shall set messages between sessions for every checkout at once without a commit; before a hand-off each session shall read the setting (`crew-settings.mjs handoff`), send the one-line prompt itself and name it in its recap when on, and show the hand-off block when off or when the receiving session is closed; the tip under a block shall show three times at most, only while messages are off, and stop once the owner used `/cb-send` or `/cb-auto` | DEC-057, DEC-061 | Hand-offs |
| FR-073 | `/cb-auto merge on|off` (on by default) shall let the Lead merge every PR into `dev` after its review by level (L0-L1 the diff, L2 `code-review`, L3 also `security-review`) and green CI without asking, reporting each merge in one recap line; while it is off every PR shall wait for the owner | DEC-061, DEC-067 | Merges |
| FR-075 | `node scripts/run.mjs [version|dev] [--source|--stop|--dry-run]` shall run a version in Docker with one command on every OS: check Docker and port 3000, log in to ghcr.io through gh when needed without printing the token, pull the image, start it and wait for its healthcheck, open the browser, and print the app's last log lines on failure; `docker-compose.yml` shall carry a healthcheck for each service; G3 shall keep the image small and the healthcheck working | DEC-062 | Running a release |
| FR-072 | The board shall show every wait: an issue goes back to In progress when the Lead asks for changes and to In review again when the fixes are pushed; a PR with no task issue sits in In review until merged; at Full with per-task testing on (`/cb-auto testing on`, off by default) an L1-L3 task stays in Testing after the merge until the Test session passes it and closes it; every level's board has the same seven columns (`setup-board.mjs`), and the Testing column stays empty otherwise | DEC-059, DEC-067 | Board during a build |
| FR-064 | Estimates shall be in AI time, split into AI working time, the owner's time and outside waits, starting from L0 15 min, L1 30 min, L2 1 h, L3 2 h per task; tasks over 2 h are split; each closed task records its actual AI time and the Lead recalibrates every milestone | DEC-051 | Task form, milestone template, `init.test.mjs` estimate check |

### 3.9 Release (`/cb-release`, `scripts/release.mjs`)
| ID | Requirement | Origin | Acceptance |
|---|---|---|---|
| FR-046 | `/cb-release` shall check G4, merge `dev` into `staging`, have the regression run there (Full: Test; Lite: Dev1), with data changes the update and rollback scripts on the staging database, then the acceptance (FR-081); a defect is fixed on `dev`, merged into `staging` again and only its area and the main journeys tested again; then it shall start the `:staging` image (`node scripts/run.mjs staging`) and give the owner 3-5 acceptance scenarios with expected and wrong results, one at a narrow window for products with screens | DEC-030, DEC-067 | `release.md` |
| FR-081 | The Lead shall be the owner's one contact from the idea to each release. At the end of each milestone the acceptance on `staging` (Full: the Test session after its regression; Lite: the Lead) shall try every acceptance criterion of the milestone's stories and CRs, in the browser at desktop and narrow width for products with screens, record the results in the acceptance section of `docs/tech/test-reports/vX.Y.Z.md` and open a defect per failure; the Lead shall copy them into section 1 of `docs/product/handover/vX.Y.Z.md`, pick 3-5 as the owner's scenarios and, after the owner's acceptance, finish the handover (delivered, changes with client approvals and billing, what the client must prepare, accepted risks and open items, how to run and roll back, sign-off), which the owner sends. At Lite the Lead also does the design and DevOps, and Dev1 the Test work (the guard gives Dev1 the Test paths). G5 requires the regression and the acceptance on `staging`, G6 the handover | DEC-067, DEC-074 | `roles/lead.md`, `test.md`, `dev.md`, `templates/handover.md`, `templates/test-report.md`, `cb-gate.md` G5 and G6, `role-guard.cjs` |
| FR-047 | `/cb-release demo` shall stop after acceptance, with no tag | DEC-030 | No tag created |
| FR-048 | `release.mjs` shall compute the version from the issue labels (SemVer, breaking ignored before 1.0), write the CHANGELOG version block and the SRS revision row and status, keep CRLF or LF line endings, and warn when the changelog was not updated | DEC-005 | `release.test.mjs` |
| FR-049 | After the owner's approval the Lead shall merge into `main` exactly the `staging` commit that was accepted, at every level, with no new tests, tag, push and create the GitHub release; the tag shall build `ghcr.io/<owner>/<repo>-app:<version>` with an SBOM and, on a public repo, a build attestation, and the Lead checks that it starts and answers its healthcheck; a failure where it runs is rolled back to the previous tag (and the rollback script when data changed) with the owner's OK | DEC-005, DEC-009, DEC-067 | `image-app.yml`, `release.md` |

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
| FR-059 | The kit's settings shall enable superpowers, code-review, claude-mem and context7, and humanizer only for polished documents; setup enables frontend-design and ui-ux-pro-max for products with screens | DEC-042 | `init.test.mjs` plugin checks |
| FR-076 | `init` shall install the plugins `.claude/settings.json` enables through `scripts/plugins.mjs` (marketplaces first, then `claude plugin install --scope user`) or print the `/plugin install` lines when the `claude` command is missing, and skip this with `--no-plugins`; the kit's settings shall set `rampstack-seo` to `false` so a user-level install stays off unless the project turns it on; `/cb-setup` shall check its skill list for the enabled plugins before anything else and stop with the install step when one is missing; the kit shall need no GitHub MCP | DEC-063, DEC-068 | Plugins on a new machine |
| FR-077 | Every issue or PR number a session shows the owner shall be a link with its short title and its CR when there is one; recaps and buttons, which hold no links, shall add a few words to the number; the hand-off "Next" line shall start with the linked issue | DEC-064 | Owner-facing text |
| FR-078 | When a step needs a session that is not running, the handing-off session shall ask the owner once and, on yes and where the app allows it, start that session in the role's worktree with its title and first prompt, detach it to top level before it works and file it in the opener's sidebar group; otherwise it shall show the hand-off block | DEC-065 | Opening sessions |

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
- Board columns, the same at every level: Backlog, Approved, Ready, In progress, In review, Testing (used at Full), Done (`scripts/setup-board.mjs`). Cards: issues, and PRs with no task issue.
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
| NFR-003 | Security | Secrets never committed (pre-commit check, `.gitignore`), never shown or printed; role paths and push rules enforced by a hook; owner approval for `main`, tags and releases | `role-guard.test.cjs`, `init.test.mjs` |
| NFR-004 | Usability | A new owner reaches `/cb-setup` in about five minutes once the tools are installed; every next step is one command or one copied prompt; owner-facing text in the owner's language | Trials |
| NFR-005 | Compatibility | Windows (PowerShell, CRLF), macOS and Linux; Node.js 20+; Docker Compose v2 | `release.test.mjs` CRLF cases; CI on Linux; macOS not yet tried |
| NFR-006 | Maintainability | Kit tests: init, role-guard, release; one decision log and this SRS; new code files carry the SPDX and credit lines | CI |
| NFR-007 | Portability | Projects run from the release image with `docker compose up` | `/cb-release` check |
| NFR-008 | Safety | n/a | |
| NFR-009 | Cost (not in 25010) | No `/goal` or `/loop` unless asked; tests sized to the change level; roles opened only for Ready work; short hand-off prompts; compact rules per role | Book chapter 9 |

## 7. Removed requirements

| ID | Removed in | By | Reason |
|---|---|---|---|
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
| FR-001 to FR-010 | DEC-006, DEC-012, DEC-026 | `kit/init.mjs` | `kit/init.test.mjs` | Delivered |
| FR-011 to FR-013 | DEC-012, DEC-040 | `scripts/set-level.mjs`, `scripts/project-level.mjs` | `kit/init.test.mjs` (set-level) | Delivered |
| FR-014, FR-015 | DEC-002 | `.claude/roles/`, `.claude/hooks/role-guard.cjs` | `role-guard.test.cjs` | Delivered |
| FR-016 | DEC-026, DEC-041 | `.claude/hooks/session-start.cjs` | `kit/init.test.mjs` (session-start) | Delivered |
| FR-017, FR-018, FR-020 to FR-023 | DEC-015 to DEC-022, DEC-069 | `kit/CLAUDE.md`, `.claude/hooks/session-start.cjs` | `kit/init.test.mjs` (foundation check) | Delivered; round 5 to confirm |
| FR-062 | DEC-049 | `kit/CLAUDE.md`, `.claude/hooks/session-start.cjs` | `kit/init.test.mjs` (side sessions) | Delivered |
| FR-072 | DEC-059 | `commands/cb-build.md`, roles `lead.md`, `dev.md`, `test.md`, `kit/CLAUDE.md`, `scripts/board-status.mjs`, `scripts/setup-board.mjs` | `kit/init.test.mjs` (board) | Delivered; card moves to verify live in round 4 |
| FR-071, FR-073 | DEC-057, DEC-061 | `commands/cb-send.md`, `commands/cb-auto.md`, `scripts/crew-settings.mjs`, `kit/CLAUDE.md`, `roles/lead.md` | `kit/init.test.mjs` (/cb-auto, tips, auto-merge) | Delivered |
| FR-075 | DEC-062 | `scripts/run.mjs`, `docker/docker-compose.yml`, `commands/cb-next.md`, `commands/cb-release.md`, `start-here/` | `kit/init.test.mjs` (run.mjs dry run, healthcheck) | Delivered; live pull and healthcheck to verify in the habit tracker run |
| FR-068 to FR-070 | DEC-056 | `commands/cb-next.md`, `commands/cb-gate.md`, `.claude/hooks/role-guard.cjs`, `hooks/pre-commit`, `scripts/new-role-worktree.mjs` | `init.test.mjs`, `role-guard.test.cjs` (88), `pre-commit.test.mjs` (11) | Delivered |
| FR-065 to FR-067 | DEC-053 | `commands/cb-setup.md`, role files, `kit/CLAUDE.md`, `commands/cb-build.md`, `.github/pull_request_template.md` | `kit/init.test.mjs` (suite passes) | Delivered |
| FR-064 | DEC-051 | `kit/CLAUDE.md`, `.github/ISSUE_TEMPLATE/task.yml`, `templates/milestone.md`, `commands/cb-build.md` | `kit/init.test.mjs` (estimates) | Delivered |
| FR-063 | DEC-050 | `kit/CLAUDE.md`, `kit/init.mjs`, `.claude/hooks/session-start.cjs` | `kit/init.test.mjs` (language) | Delivered |
| FR-024 to FR-027 | DEC-026, DEC-027, DEC-029 | `commands/cb-setup.md`, `scripts/new-role-worktree.mjs`, `scripts/setup-labels.mjs` | `kit/init.test.mjs` (content checks) | Delivered; not yet run on a real project |
| FR-028 to FR-033 | DEC-027 to DEC-029, DEC-069 | `commands/cb-next.md`, `commands/cb-gate.md`, `.claude/roles/lead.md`, `uiux.md`, `start-here/` | `kit/init.test.mjs` (content checks) | Delivered; not yet run on a real project |
| FR-089 | DEC-074, DEC-075 | `scripts/project-level.mjs`, `scripts/new-role-worktree.mjs`, `.claude/hooks/session-start.cjs` | `kit/init.test.mjs` (po refused, retired session told) | Delivered |
| FR-090 | DEC-075 | `commands/cb-add-dev.md`, `kit/CLAUDE.md`, `.claude/hooks/role-guard.cjs` | `kit/init.test.mjs` (dev2 worktree, port, rules), `role-guard.test.cjs` (two workstreams) | Delivered |
| FR-091 | DEC-076 | `scripts/model.mjs`, `scripts/set-secret.mjs`, `scripts/new-role-worktree.mjs`, `commands/cb-model.md`, `commands/cb-setup.md` | `kit/init.test.mjs` (models: modes, key refused and never printed, one role changed, deepseek-pro refused for UI/UX) | Delivered |
| FR-092 | DEC-077 | `kit/commands/`, `kit/update.mjs` | `kit/init.test.mjs` (cb- commands, old names gone), `kit/update.test.mjs` (renames, own ci-local kept, retired roles reported) | Delivered |
| FR-094 | DEC-079 | `scripts/run.mjs`, `scripts/project-level.mjs`, `scripts/ci-local.mjs`, `kit/CLAUDE.md`, `.claude/roles/lead.md`, `test.md`, `commands/cb-release.md` | `kit/init.test.mjs` (CI_CHANGED_FILES, --full, same-tree image reuse, guide text) | Delivered; docker tag path to confirm in a release |
| FR-093 | DEC-078 | `kit/CLAUDE.md`, `.claude/roles/lead.md`, `dev.md`, `commands/cb-build.md` | Trials | Delivered; to confirm in a trial |
| FR-088 | DEC-073 | `scripts/ci-local.mjs`, `scripts/ci-steps.json`, `kit/CLAUDE.md`, `.claude/roles/lead.md` | `kit/init.test.mjs` (changed-only step skipped, total time, stale lock cleared, PASS reused) | Delivered |
| FR-087 | DEC-072 | `scripts/ci-mode.mjs`, `scripts/ci-local.mjs`, `scripts/ci-steps.json`, `scripts/run.mjs`, `.github/workflows/`, `kit/init.mjs`, `kit/CLAUDE.md` | `kit/init.test.mjs` (ci mode, run.mjs local build, workflows, ci-local PASS and FAIL) | Delivered |
| FR-086 | DEC-071 | `.claude/roles/test.md`, `lead.md`, `commands/cb-build.md`, `next.md`, `setup.md`, `gate.md`, `start-here/full.md` | `kit/init.test.mjs` (Test after G3) | Delivered |
| FR-085 | DEC-070 | `scripts/new-role-worktree.mjs`, `.claude/hooks/role-guard.cjs`, `kit/CLAUDE.md`, `commands/cb-build.md`, `.github/pull_request_template.md` | `role-guard.test.cjs` (per-Dev modules), `kit/init.test.mjs` (dev4 worktree) | Delivered |
| FR-082 to FR-084 | DEC-069 | `kit/CLAUDE.md`, `templates/`, `kit/init.mjs` | `kit/init.test.mjs` (see-it-first and foundation checks) | Delivered |
| FR-034 to FR-038 | DEC-019, DEC-020, DEC-033 | `commands/cb-gate.md`, `kit/CLAUDE.md` | `kit/init.test.mjs` (content checks) | Delivered |
| FR-039 to FR-045 | DEC-004, DEC-030 to DEC-032, DEC-034 | `commands/cb-build.md`, `commands/cb-change.md`, `scripts/board-status.mjs`, `.github/` | Trials | Delivered; board moves not yet verified live |
| FR-046 to FR-049 | DEC-005, DEC-009, DEC-030 | `commands/cb-release.md`, `scripts/release.mjs`, `.github/workflows/image-app.yml` | `release.test.mjs` | Delivered |
| FR-050 to FR-054 | DEC-023, DEC-024, DEC-035 to DEC-037, DEC-039 | `kit/CLAUDE.md`, `commands/cb-progress.md` | `kit/init.test.mjs` (content checks) | Delivered |
| FR-055 to FR-057 | DEC-038 | `scripts/set-secret.mjs`, `scripts/new-role-worktree.mjs`, `hooks/pre-commit` | `kit/init.test.mjs` (set-secret) | Delivered |
| FR-058, FR-059 | DEC-041, DEC-042 | `kit/CLAUDE.md`, `.claude/settings.json` | `kit/init.test.mjs` (plugins) | Delivered |
| FR-076 | DEC-063, DEC-068 | `scripts/plugins.mjs`, `init.mjs`, `commands/cb-setup.md` | `kit/init.test.mjs` (plugins dry run, /cb-setup check); init run on a temp folder installed the five plugins | Delivered |
| FR-077 | DEC-064 | `kit/CLAUDE.md` (Links, hand-offs), `commands/cb-progress.md` | `kit/init.test.mjs` (links) | Delivered; to confirm in transcripts of the habit tracker run |
| FR-078 | DEC-065 | `kit/CLAUDE.md` (Opening sessions), `commands/cb-setup.md`, `commands/cb-next.md`, `commands/cb-build.md`, `start-here/` | `kit/init.test.mjs` (sessions); scratch-project test: opened in `role/po`, detached | Delivered |
| FR-079 | DEC-066 | `kit/update.mjs`, `commands/cb-update.md`, `init.mjs`, `scripts/project-level.mjs`, `.claude/roles/lead.md`, `kit/CLAUDE.md` (Ask the owner before) | `kit/update.test.mjs`; `kit/init.test.mjs` (kitVersion); trial-project copy | Delivered |
| FR-080, FR-081 | DEC-067 | `kit/CLAUDE.md` (Two kinds of change, Data changes, Auto-merge), roles `lead.md`, `dev.md`, `test.md` (`po.md` removed by DEC-074), `.claude/hooks/role-guard.cjs`, `scripts/project-level.mjs`, `set-level.mjs`, `commands/cb-change.md`, `release.md`, `gate.md`, `auto.md`, `scripts/crew-settings.mjs`, `.github/ISSUE_TEMPLATE/cr.yml`, `templates/cr.md`, `changes.md`, `handover.md`, `milestone.md` | `kit/init.test.mjs` (change kinds, PO and Lead jobs, Lite staging, data changes, auto-merge, templates, release, `/cb-auto testing`); `role-guard.test.cjs` (Lite Test paths) | Delivered; not yet tried in a trial |
| FR-060, FR-061 | DEC-048 | `.github/workflows/test.yml`, `CLAUDE.md` | CI | Delivered |
