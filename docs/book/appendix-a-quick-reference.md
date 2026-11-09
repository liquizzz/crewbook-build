# Appendix A: Claude Code workflow quick reference

← [Back: Chapter 7: Configure and grow your team](07-configure-your-team.md) · [Contents](../../README.md#read-the-guide) · [Next: Appendix B: Kit and configuration](appendix-b-kit.md) →

Find the command for the current stage. Commands run in a Claude Code session unless a row says otherwise. `/cb-help` lists the commands with the one that fits the stage first.

## Slash commands

| Command | Who | What it does |
|---|---|---|
| `/cb-setup` | Lead | Five questions, the plan approval, every session ([chapter 2](02-plan-your-product.md)) |
| `/cb-plan [milestone]` | Lead | Splits a milestone into tasks with level, reach, signals and model |
| `/cb-build try` · `done` | Roles | Try a task in the running app; finish it with its checks, review and PR |
| `/cb-change <request>` | Lead | A CR for a functional change, an ADR for a technical one |
| `/cb-bug <what happened>` | Any | A Defect with "Caused by", its own level and severity, sent to the right role |
| `/cb-release demo` | Lead | The milestone on `staging` and your milestone approval |
| `/cb-release` | Lead | The handover, your release approval, the tag and the image |
| `/cb-deploy <env> <tag>` | Dev for staging, you for production | A version on a server; the previous tag rolls back |
| `/cb-env` | Lead | Shared services, hosts, the project's databases, reset, backup and restore |
| `/cb-progress [report]` | Any; Lead saves reports | Live state in ten lines; `report` adds the weekly measures |
| `/cb-model`, `/cb-redo` | Any; the Lead for another task | A stronger model for a task; the last step again one step up |
| `/cb-review #<PR>` | Lead | A Codex second opinion and security pass |
| `/cb-auto` | Any | The four switches of what runs without you; `off` stops all of them |
| `/cb-send` | Any | Sends the last hand-off block's prompt to its session |
| `/cb-add-role <role>` | Lead | Adds UI/UX, Frontend or Test |
| `/cb-update` | Lead | The newest kit, through a PR you approve |
| `/cb-help` | Any | Every command in one line, the one that fits the stage first |

## How to read the guides

The task guides identify what an action does, which session to ask, what Claude may ask, what it does next, what you check and which actions wait for your permission.

Three phrases help steer a session: "suggest" asks for options, "later" parks a choice under Open decisions until a step needs it, and "you decide" takes the recommendation and asks the session to list the calls it made. Choosing an option or delegating a choice does not replace the formal plan, milestone or release approval.

## Crewbook terms

| Term | Meaning |
|---|---|
| Owner | You: the person who decides scope, priorities and releases |
| Session | One Claude Code conversation playing one role |
| Lead | Your one contact: the plan, the tasks, every change, the merges, the milestone and the release |
| Role | Lead, Dev, UI/UX, Frontend or Test; the project's roles are chosen at setup |
| Branch | A line of work: `role/<role>` per role, `dev` (work in progress), `staging` (what you try), `main` (released) |
| Change level | The risk of a task: L0 display, L1 a setting or small logic, L2 module logic, L3 core (shared code, sign-in, money, personal data, the schema) |
| CR (change request) | A change to what the client gets, with who asked, its impact and the client's approval |
| ADR / DEC | A recorded technical / business decision, with the options rejected and why |
| SRS | The requirements document, always current, with numbered requirements (`FR-xxx`, `NFR-xxx`) |
| Function tree | The product as modules, then screens or functions, then their main actions |
| Milestone | The next version, a few stories built and tried together |
| Staging | The test copy of the product, with its own database, where you try each milestone |
| Regression | The important scenarios of the whole product, run again on `staging` before a release |
| Model ladder | Haiku low, Sonnet medium, Sonnet high, Opus medium, Opus high: a task climbs one step when it is stuck |

---

← [Back: Chapter 7: Configure and grow your team](07-configure-your-team.md) · [Contents](../../README.md#read-the-guide) · [Next: Appendix B: Kit and configuration](appendix-b-kit.md) →
