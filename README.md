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

The first time, install the tools listed in How to run (once per machine). Then answer three short questions (Enter takes each suggestion) and open the `START-HERE.md` it writes into your project. You open the Lead and type `/cb-setup`: five questions, each with a suggestion (the roles, how much runs without you, your idea, the stack, the environments), then you approve the plan and the Lead creates the rest of the team. `/cb-help` lists every command ("cb" stands for Crewbook); each hand-off ends with a prompt the sessions pass on by themselves.

## What you get: a Claude Code agent team in one command

| You get | How |
|---|---|
| A ready project in one command | `init.mjs` creates the folder, git branches, the Lead's worktree (its own folder of the project, one per session), the GitHub repo (private or public) with labels and a kanban board, CI and Docker image builds, the Claude Code plugins the team uses, and `START-HERE.md`; the Lead's `/cb-setup` then creates every other role's worktree and session |
| A team you pick, split by layer | The Lead and the Dev always; UI/UX (the design, ahead of the code), Frontend (the screens, beside the Dev) and Test (test cases and the regression) when the project needs them, chosen at setup and added later with `/cb-add-role`. The Lead is your one contact from the idea to each release; the Dev and Frontend never touch the same files. Each role has a role file with its rules and paths; a guard hook (a script that checks every command and edit) blocks risky commands, edits outside the role and reading database backups |
| The right skill for each task, chosen in advance | Suggestions use brainstorming, code uses test-first development, failures use systematic debugging, nothing is called done without a verification step, and the Lead reviews every change. Documents can get a humanizer pass, which you turn on at init or later. A hook reminds each session at start, so you never name a skill |
| The AI understands, you decide | You say what you want in your own words; the Lead works out what you mean, fills the gaps and proposes with a recommendation, asks at most one short round, and marks its guesses ⚠️. You can answer "you decide". You decide three times: the plan, each milestone, each release |
| A plan before the code | Stories (with the ones usually missing as suggestions), a function tree of modules, screens and actions, three architectures with their stack and cost (one recommended), and the environments ready before the first task. Every document is in plain words |
| Lower token cost, measured | Each task on the cheapest Claude model that does it well (Haiku, Sonnet or Opus, from its level and how clear it is), moved up only when it is stuck; reviews and CI runs reused while still valid; a fresh context after each phase; databases and model servers once per machine; a weekly report of tokens, cost, first-try passes and defects per role, model and level (`/cb-progress report`). The Dev, Frontend and Test can run on DeepSeek instead |
| Quality you can check | Three approvals you give, each with a For you block (a few things to try yourself, with links to the evidence), tests and reviews sized to each change's risk, a requirements document kept current with every change, CI on every change, and your own acceptance test before each release |
| Room to grow | `/cb-add-role` adds UI/UX, Frontend or Test when the project needs them; `/cb-auto` sets how much runs without you, from every merge waiting for you to all of them merged by the Lead |
| Kit updates in a running project | `/cb-update` in the Lead brings the newest kit into a project that already runs: kit files are replaced, your own files, rules and decisions stay, and it lands through a PR you approve |
| Releases you can run anywhere | Each version tag builds a Docker image; `node scripts/run.mjs v0.1.0` runs it, `/cb-deploy staging <tag>` puts it on a server, and the previous tag rolls it back |

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
| 3 | [Foundation](docs/book/03-foundation.md) | Setup: the roles, the requirements, the stack and the environments, then the plan you approve |
| 4 | [The delivery loop](docs/book/04-delivery-loop.md) | Ask for changes, follow progress, keep the milestone on date |
| 5 | [Releases](docs/book/05-releases.md) | Release, go live, hotfix, roll back |
| 6 | [Continuity](docs/book/06-continuity.md) | Restart, compact, trace a change, switch machines without losing work |
| 7 | [Front-end projects](docs/book/07-frontend-projects.md) | Show design rounds (to you or a client) while the product is built |
| 8 | [Lite mode](docs/book/08-lite-mode.md) | Run with the Lead and the Dev only; add roles later |
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
Yes. You describe what you want, correct the Lead's proposals and approve the plan, each milestone and each release; the sessions write the code, the tests and the documents. You do need to install a few tools once and type a few short commands such as `/cb-setup` and `/cb-release demo`. [How to run](HOW-TO-RUN.md) walks through each one.

**How is this different from vibe coding?**
Vibe coding ships whatever the last prompt produced. In Crewbook every change has a requirement, a review by the Lead and tests sized to the change, and nothing is released before it is tested on `staging`, accepted against every acceptance criterion and approved by you, so the tenth feature is as solid as the first.

**How is it different from Claude Code agent teams or spec-driven kits?**
Each role (the Lead and the Dev, and UI/UX, Frontend or Test when the project needs them) runs in its own session and git worktree, on the model its task needs, and a guard hook keeps it inside its role. The process covers the whole delivery: requirements and a function tree, the architecture, the environments, build, release, change requests and rollback, with three approvals for you.

**How is Crewbook different from BMAD-METHOD or spec-kit?**
All three start from a spec. Crewbook uses the plugin that does each stage best (superpowers for brainstorming and test-first code, ui-ux-pro-max and frontend-design for the look and the screens, context7 for library facts) in place of one framework for everything. It leads you one step at a time: one command per stage, a START-HERE file that lists every step, and at the end of each step the session tells you, or sends the next session, what comes next. You can approve without reading code: each approval shows what to try yourself, what a wrong result looks like and what the tests already prove, and changes merge on their own after their reviews (a security review for money, security or personal data) up to the level you set, while every release waits for you. The result is a real project, with a branch per role, reviewed pull requests, a kanban board, CI, tagged releases and a Docker image you run with one command. For a quick prototype spec-kit is faster; Crewbook is for software you will hand over, maintain or show a client.

**What stack does it use?**
Any. At setup the Lead proposes three architectures with their stack and cost, one recommended, and you pick one or let it decide. A platform you or your client require is a constraint.

**What does it cost?**
A Claude subscription that includes Claude Code, and GitHub (the free plan is enough). With the `deepseek` model mode you also pay DeepSeek for what the Dev, Frontend and Test sessions use. [Chapter 9](docs/book/09-token-budget.md) shows how the kit keeps token use down, and `/cb-progress report` measures it every week.

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
