# Crewbook: Build

**You bring the idea. Your AI team ships the software.**

A step-by-step Claude Code playbook and starter kit for building high-quality software from zero, whether you have written code for years or never written a line. You lead a crew of Claude Code sessions (a Lead and a Dev) the way you would lead a real team, and nothing moves forward until you approve it. One command sets up your project. From then on every session knows its role, picks the right skill for each task, drafts its step at once in plain words, asks you at most three questions and keeps token use down.

Crewbook: Build is the first playbook in the Crewbook series.

**[Start a project in 5 minutes: How to run](HOW-TO-RUN.md)** (once Claude Code, Git, Node.js, Docker and the GitHub CLI are installed)

```bash
git clone https://github.com/liquizzz/crewbook-build.git
```

```bash
node crewbook-build/kit/init.mjs
```

The first time, install the tools listed in How to run (once per machine). Then answer eight short questions (Enter takes each suggestion) and open the `START-HERE.md` it writes into your project. Every next step there is one short command to type, such as `/cb-setup`, `/cb-next <your idea>`, `/cb-build try`, `/cb-build done` or `/cb-release` ("cb" stands for Crewbook), and each hand-off ends with a prompt you copy with one click. `/cb-setup` asks one question: which models the team runs on (`claude`, `deepseek` or `mix`); `/cb-model` changes it later.

## What you get: a Claude Code agent team in one command

| You get | How |
|---|---|
| A ready project in one command | `init.mjs` creates the folder, git branches, the Lead's worktree (its own folder of the project, one per session), the GitHub repo (private or public) with labels and a kanban board, CI and Docker image builds, the Claude Code plugins the team uses, and `START-HERE.md`; the Lead's `/cb-setup` then opens the gate issues and the other roles' worktrees |
| A small team that knows its job | Every project starts with two sessions. The Lead is your one contact from the idea to each release: the proposal, the screen sketches and the requirements (G1-G2), the solution design (G3), every change with its price and the client's approval, review, the acceptance on `staging`, the handover and the release. Dev1 builds; a second Dev joins only when you ask for it (`/cb-add-dev`), with its own module. Test, UI/UX and DevOps join only for high-stakes work. Each role has a role file with its rules and paths; a guard hook (a script that checks every command and edit) blocks risky commands and edits outside the role |
| The right skill for each task, chosen in advance | Suggestions use brainstorming, code uses test-first development, failures use systematic debugging, nothing is called done without a verification step, and the Lead reviews every change. Documents can get a humanizer pass, which you turn on at init or later. A hook reminds each session at start, so you never name a skill |
| AI does the work, you decide | You say what you want in your own words; the session drafts at once, asks at most three questions (each with a suggested answer), marks its guesses ⚠️ and redoes the draft as often as you like, then asks for one approval. "later" parks a decision until a step needs it, and "suggest" asks for ideas. A product you name is tried in the browser, an old system is read for what to keep, and facts you give are checked |
| See it first, then build it | The Lead sketches the main screens you can click through, so you approve a product you can see (G1 and G2, one approval). It then shows the whole plan in one solution design: the parts, the stack and why, the data, the look and feel, the milestones and the risks (G3). Every document is in plain words |
| Lower token cost | Tests sized to the change (levels L0 to L3), no `/goal` or `/loop`, compact rules per role, short hand-off prompts, a fresh context for each Dev task, roles opened only when there is work for them, and the option to run the Dev and Test sessions (or every session) on DeepSeek |
| Quality you can check | Gates you approve, each with a For you block (a few things to try yourself, with links to the evidence), a requirements document kept current with every change, CI on every push, and your own acceptance test before each release |
| Room to grow | `node scripts/set-level.mjs` moves a project from Lite (Lead and Dev1) to Full (adds Test, UI/UX and DevOps sessions, for money, security, personal data or a client who signs off each release), or back, without redoing anything |
| Kit updates in a running project | `/cb-update` in the Lead brings the newest kit into a project that already runs: kit files are replaced, your own files, rules and decisions stay, and it lands through a PR you approve |
| Releases you can run anywhere | Each version tag builds a Docker image; `node scripts/run.mjs v0.1.0` runs it, or rolls back to an older tag |

## The best tool for each stage

No single plugin is best at everything. Crewbook picks one for each stage and tells each session when to use it, so you never choose a skill yourself.

| Stage | Tool | Why this one |
|---|---|---|
| Ideas, when you ask for them | superpowers `brainstorming` | Options explored before anything is written |
| Look and feel | ui-ux-pro-max | Searches real styles, palettes and fonts for 2-3 directions |
| Screens | frontend-design | Screens that look designed, in the direction you picked |
| Library facts | context7 | Current documentation in place of guesses |
| Planning | superpowers `writing-plans` | A milestone split into small tasks (the kit caps each at 2 hours of AI time) |
| Code | superpowers `test-driven-development` | Tests first, sized to the change level |
| Failures | superpowers `systematic-debugging` | The cause is found before code changes |
| Review | `code-review`, `security-review` for L3, Codex on request | A second look at every PR |
| "Done" | superpowers `verification-before-completion` | Evidence before anything is called done |
| Memory | claude-mem | A restarted session finds its context |
| Documents | humanizer | Documents that read like a person wrote them |

Some skills are left out on purpose: the superpowers skills for worktrees, branch finishing and subagents, because the kit's own worktrees, roles and merge rules do that job.

## What you still decide

You do not need to program: the sessions write the code. You still decide what is right for the business ([chapter 0](docs/book/00-introduction.md#what-this-book-does-not-do)). You need the tools listed in [How to run](HOW-TO-RUN.md): Claude Code, Git, Node.js, Docker and the GitHub CLI, plus a GitHub account (the free plan is enough). Where the Docker images run in production is up to you ([chapter 1](docs/book/01-setup.md#4-run-it-with-docker)). The team does not run by itself: you open the sessions ([chapter 2](docs/book/02-the-team.md#5-how-automatic-it-is)).

The book gives each step as prompts (what to say, what Claude asks back, what it does) and explains why. Read it when you want the reasons: [Chapter 0](docs/book/00-introduction.md) takes 5 minutes, [Appendix D](docs/book/appendix-d-checklist.md) checks that no step was skipped, and [Chapter 9](docs/book/09-token-budget.md) covers cost.

## The book

| | Chapter | Use it to |
|---|---|---|
| 0 | [Introduction](docs/book/00-introduction.md) | Understand the model, the principles and how prompts work in this book |
| 1 | [Setup](docs/book/01-setup.md) | Start a project, connect GitHub, open the first sessions |
| 2 | [The team](docs/book/02-the-team.md) | Know who does what, how code moves, what the guardrails block |
| 3 | [Foundation](docs/book/03-foundation.md) | Picture the project (G1-G2), then how it is built (G3), with two approvals |
| 4 | [The delivery loop](docs/book/04-delivery-loop.md) | Ask for changes, follow progress, keep the milestone on date |
| 5 | [Releases](docs/book/05-releases.md) | Release, go live, hotfix, roll back |
| 6 | [Continuity](docs/book/06-continuity.md) | Restart, compact, trace a change, switch machines without losing work |
| 7 | [Front-end projects](docs/book/07-frontend-projects.md) | Show design rounds (to you or a client) while the product is built |
| 8 | [Lite mode](docs/book/08-lite-mode.md) | Run with two sessions; move to Full and back |
| 9 | [Token budget](docs/book/09-token-budget.md) | Keep cost under control; avoid `/goal` and `/loop` |
| A | [Templates](docs/book/appendix-a-templates.md) | See every document the sessions fill in |
| B | [Kit reference](docs/book/appendix-b-kit.md) | See what the kit installs and how to change it |
| C | [FAQ and troubleshooting](docs/book/appendix-c-faq.md) | Fix common problems |
| D | [Process checklist](docs/book/appendix-d-checklist.md) | Check that no step was skipped |
| E | [Standards map](docs/book/appendix-e-standards.md) | See which standard each step follows and what is left out |

## From idea to release in seven steps

The [Quick start in chapter 0](docs/book/00-introduction.md#quick-start-from-idea-to-demo) walks through a whole project in seven steps, from an empty folder to a tested, tagged demo.

## FAQ

**Can I build an app with Claude Code if I can't code?**
Yes. You describe what you want, correct the sessions' drafts and approve each gate; the sessions write the code, the tests and the documents. You do need to install a few tools once and type short commands such as `/cb-next` and `/cb-build try`. [How to run](HOW-TO-RUN.md) walks through each one.

**How is this different from vibe coding?**
Vibe coding ships whatever the last prompt produced. In Crewbook every change has a requirement, a review by the Lead and tests sized to the change, and nothing is released before it is tested on `staging`, accepted against every acceptance criterion and approved by you, so the tenth feature is as solid as the first.

**How is it different from Claude Code agent teams or spec-driven kits?**
Each role (Lead, Dev, and Test, UI/UX or DevOps when needed) runs in its own session and git worktree, and a guard hook keeps it inside its role. The process covers the whole delivery: proposal and screen sketches, requirements (SRS), solution design, build, release, change requests and rollback, with six gates (G1 to G6).

**How is Crewbook different from BMAD-METHOD or spec-kit?**
All three start from a spec. Crewbook uses the plugin that does each stage best (superpowers for brainstorming and test-first code, ui-ux-pro-max and frontend-design for the look and the screens, context7 for library facts) in place of one framework for everything. It leads you one step at a time: one command per stage, a START-HERE file that lists every step, and at the end of each step the session tells you, or sends the next session, what comes next. You can approve without reading code: each gate shows what to try yourself, what a wrong result looks like and what the tests already prove, and changes merge on their own after the Lead's review (a security review for money, security or personal data), while every release waits for you. The result is a real project, with a branch per role, reviewed pull requests, a kanban board, CI, tagged releases and a Docker image you run with one command. For a quick prototype spec-kit is faster; Crewbook is for software you will hand over, maintain or show a client.

**What stack does it use?**
Any. The Lead proposes one in the solution design at G3, with the options it left out and why, and you approve it. A platform you or your client require is a constraint in the proposal.

**What does it cost?**
A Claude subscription that includes Claude Code, and GitHub (the free plan is enough). With the `deepseek` or `mix` model mode you also pay DeepSeek for what those sessions use. [Chapter 9](docs/book/09-token-budget.md) shows how the kit keeps token use down.

## Repository

| Path | Contents |
|---|---|
| [HOW-TO-RUN.md](HOW-TO-RUN.md) | From clone to your first project in three steps |
| [docs/book/](docs/book/) | The book |
| [templates/](templates/) | Documents the sessions fill in |
| [kit/](kit/) | Files installed into a project by `kit/init.mjs` |
| [docs/assets/](docs/assets/) | The repo's social preview image and the HTML it is rendered from |
| [docs/spec/](docs/spec/) | The playbook's own SRS and decision log |
| [docs/ai-log.md](docs/ai-log.md) | Log of how this playbook itself was built with AI |

## License

[![CC BY 4.0](https://img.shields.io/badge/Docs-CC%20BY%204.0-lightgrey.svg)](LICENSE) [![MIT](https://img.shields.io/badge/Kit%20code-MIT-blue.svg)](kit/LICENSE)

| Part | License |
|---|---|
| Docs and templates (`README.md`, `docs/`, `templates/`) | [Creative Commons Attribution 4.0 International](LICENSE) |
| Kit (`kit/`: hooks, scripts, workflows, settings, role files) | [MIT](kit/LICENSE) |

You may use, adapt and share both, including commercially. Please give credit: "Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)". Code files carry an `SPDX-License-Identifier: MIT` line; keep it when you copy them.
