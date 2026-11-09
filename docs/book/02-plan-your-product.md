# Chapter 2: Plan your product with Claude Code

← [Back: Chapter 1: Start your first project](01-setup.md) · [Contents](../../README.md#read-the-guide) · [Next: Chapter 3: Build and review](03-build-and-review.md) →

**Purpose:** turn your idea into a plan you approve once: who uses the product, what it does, how it is built, where it runs, and what the first milestone delivers.

Setup is five questions and one approval. Each question comes with a suggestion you can take as it is, and the Lead drafts the answer to the next one while you read. Your choices and corrections feed one formal plan approval at the end.

## 1. Roles, autonomy and your idea

**What it does:** settles who is on the team and how much runs without you, and starts from your idea in your own words.

**Ask:** in the Lead's session, `/cb-setup`.

**Claude asks you,** in one message:
1. The roles: a table of what each role does and when it is worth having. The Lead and the Dev are always on; UI/UX, Frontend and Test are ticked. Untick what you do not need.
2. How much runs without you: the four `/cb-auto` switches with their defaults ([autonomy switches](#autonomy-switches)). "Keep the defaults" is a fine answer.
3. Your idea, in any form: a few sentences, a document, a product you want to copy or beat, an old system to replace.

**Claude does:** records the roles and the switches. When you name a product to copy, it tries that product in the browser (the main flows, on desktop and phone) and tells you what it found, with links.

### Choose the roles

Each role is a Claude Code session in its own worktree, on its own branch `role/<role>`, with a role file (`.claude/roles/<role>.md`) that it reads first.

| Role | Always? | Owns | Does |
|---|---|---|---|
| Lead | Yes | Everything, and prefers to leave code to the owning role | Talks to you. Writes the plan, splits milestones into tasks, picks each task's model, reads every PR, merges, runs the milestone and the release |
| Dev | Yes | The backend, the API contract (an OpenAPI file), shared types, infrastructure, Docker, CI | Builds backend tasks test-first, builds the images, runs `staging` |
| UI/UX | When the product has screens | `design/`, the design tokens | Proposes the look and feel, designs screens ahead of the code ([chapter 6](06-design-and-frontend.md)) |
| Frontend | When the UI is its own layer | The screens | Builds screens against the API contract, or a mock of it while the backend is still on its way |
| Test | When the product has users who depend on it | The test folders, test cases and reports | Writes the cases, runs the regression and the acceptance on `staging` |

A role left out hands its work to another: without UI/UX the Lead designs, without Frontend the Dev builds both layers, without Test the Dev runs the regression and the Lead accepts ([chapter 7](07-configure-your-team.md)).

#### Suggested teams

| Project | Roles |
|---|---|
| A script, an API, a tool without screens | Lead, Dev |
| A small app for a few people | Lead, Dev, Frontend |
| A product people depend on, or with money, personal data or a client who signs off | Lead, Dev, UI/UX, Frontend, Test |
| A one-off spike you will throw away | None: a single Claude Code session is enough |

Start with Lead and Dev to keep coordination and implementation in separate sessions. Add specialists when the milestone has enough work for them; the same issues and hand-offs carry the project forward.

### Autonomy switches

`/cb-auto` shows and changes four switches, shared by every session:

| Switch | Default | What it does |
|---|---|---|
| `merge` | `all` | The highest level the Lead merges by itself after the reviews and a green CI: `off`, `only-L0`, `up-to-L1`, `up-to-L2`, `all` |
| `relay` | on | Sessions send each other their prompts |
| `escalate` | on | A stuck task climbs one model step by itself, below Opus |
| `testing` | off | With Test: each merged task is also checked against its acceptance criteria |

`/cb-auto off` stops all of it at once, when you want to stop and look. Whatever the switches say, the three approvals, production, money, accounts, secrets, deleting data and the client's scope, date or price always wait for you.

## 2. The requirements

**What it does:** writes down what the product must do, in words a client without a technical background understands on the first read.

**Claude asks you:** one short round on what only you know: who uses it, the problem it solves, what this first stage does, how you will know it works. At most three questions, each with its suggested answer.

**Claude does:** the first draft at once:
- the stories in `docs/product/stories/`, each with acceptance criteria in the user's words;
- the stories usually missing for this kind of product (password reset, empty states, an admin who leaves), as suggestions you keep or drop;
- the function tree in `docs/product/function-tree.md`: modules, then screens or functions, then their main actions.

Every guess carries ⚠️. The function tree later gives the folders, each role's paths, the milestones and the tasks.

**You check:** the stories and the tree. Say what to keep or change in one message; the Lead puts your corrections in and asks again only about what changed. This is feedback on the draft. The formal plan approval comes in step 5.

## 3. The stack and how it runs

**What it does:** picks how the product is built and where it runs, with the cost in plain numbers.

**Claude asks you:** one round on scale: how many users, how many at once, how much data, where it should run, the budget, any platform you or your client require.

**Claude does:** three architectures side by side, with their stack, hosting, running cost and fit, one recommended. You pick one, ask for a change, or say "you decide". Then it writes `docs/tech/solution-design.md`, which opens with "In short" for anyone to read, and sets up, without asking you: the stack, one Docker image per layer, CI kept under about five minutes, each role's folders in `.claude/ownership.json`, the requirements baseline in `docs/tech/srs.md`, and an ADR only for a choice that was really open.

**You check:** the three options and the "In short" of the solution design.

## 4. The environments

**What it does:** gets the databases, the build host and `staging` ready before the first task, reusing what already runs on your machine.

**Claude does:** proposes the databases on the shared server, the build host and the registry, and where `staging` runs, then asks you to run the one command that writes secrets:

```bash
node scripts/db-setup.mjs create
```

It then checks every login with `db-setup.mjs check`, proves a reset works, and writes `docs/tech/ops/environments.md`.

**You check:** the command printed "ok" for every login. You never see a password.

## 5. The plan approval

**What it does:** the first checkpoint, agreeing what to build and how the team will deliver the first milestone. The Lead uses that plan to assign the work.

**Claude asks you,** alone and on one page with links: what the product does and for whom, the stories, the function tree, the architecture and stack, the environments, the first milestone with its scope and AI time, the roles, the autonomy, and the open decisions. Then: approve, or say what to change.

**You check:** the page. Say "Approved" to approve. An answer that only picks an option ("design B") is taken as that choice, and the Lead asks for the approval again with it put in.

**Claude does,** on approval: fills in `CLAUDE.md` (the description, the stack, the commands, the stage), turns on the design plugins when there are screens, creates milestone v0.1.0, merges the plan into `dev`, then opens every role's session on Sonnet low with "Ready; wait for the Lead's task.", detached and filed in the project's sidebar group. It ends by splitting v0.1.0 into tasks ([chapter 3](03-build-and-review.md)).

**Claude asks before:** nothing else here. The approval is the go-ahead for the sessions and the first tasks.

Use the [plan checklist](appendix-d-templates-and-checklist.md#once-the-plan) before approval if you want to check the record.

## Decide later

Any question can wait. Say "later": the Lead writes it under Open decisions in `CLAUDE.md` with the step that needs it, opens a `decision` issue, and carries on with what does not depend on it. `/cb-progress` lists what is still open.

---

← [Back: Chapter 1: Start your first project](01-setup.md) · [Contents](../../README.md#read-the-guide) · [Next: Chapter 3: Build and review](03-build-and-review.md) →
