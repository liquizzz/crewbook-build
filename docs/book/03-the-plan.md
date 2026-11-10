# Chapter 3: The plan

**Purpose:** turn your idea into a plan you approve once: who uses the product, what it does, how it is built, where it runs, and what the first milestone delivers.

`/cb-setup` runs its steps in a fixed order and ends with one approval, the plan. Each step comes with a suggestion you can take as it is, and the Lead drafts the next one while you read. Everything before the plan is a draft you correct. Most owners finish it in one sitting.

## 1. Roles, autonomy and your idea

**What it does:** settles who is on the team and how much runs without you, and starts from your idea in your own words.

**Ask:** in the Lead's session, `/cb-setup`.

**Claude asks you,** in one message, so one reply answers all three:
1. Your idea, in any form: a few sentences, a document, a product you want to copy or beat, an old system to replace.
2. The roles: a table of what each role does and when it is worth having. The Lead and the Dev are always on; UI/UX, Frontend and Test are ticked. Untick what you do not need.
3. How much runs without you: the four `/cb-auto` switches with their defaults ([chapter 2](02-the-team.md#5-how-much-runs-without-you)). "Keep the defaults" is a fine answer.

**Claude does:** records the roles, the switches and your answer about them. When you name a product to copy, it tries that product in the browser (the main flows, on desktop and phone) and tells you what it found, with links.

## 2. The requirements

**What it does:** writes down what the product must do, in words a client without a technical background understands on the first read.

**Claude asks you:** one short round on what only you know: who uses it, the problem it solves, what this first stage does, how you will know it works. At most three questions, each with its suggested answer.

**Claude does:** the first draft at once:
- the stories in `docs/product/stories/`, each with acceptance criteria in the user's words;
- the stories usually missing for this kind of product (password reset, empty states, an admin who leaves), as suggestions you keep or drop;
- the function tree in `docs/product/function-tree.md`: modules, then screens or functions, then their main actions.

Every guess carries ⚠️. The function tree later gives the folders, each role's paths, the milestones and the tasks.

**You check:** the stories and the tree. Say what to change in one message; the Lead puts your corrections straight in. This is feedback on a draft: you approve everything together with the plan.

## 3. The stack and how it runs

**What it does:** picks how the product is built and where it runs, with the cost in plain numbers.

**Claude asks you:** one round on scale: how many users, how many at once, how much data, where it should run, the hosting budget, any platform you or your client require.

**Claude does:** three architectures side by side, with their stack, hosting, running cost and fit, one recommended. You pick one, ask for a change, or say "you decide". Then it writes `docs/tech/solution-design.md`, which opens with "In short" for anyone to read, and sets up, without asking you: the stack, one Docker image per layer, CI kept under about five minutes, each role's folders in `.claude/ownership.json`, the requirements baseline in `docs/tech/srs.md`, and an ADR only for a choice that was really open.

**You check:** the three options and the "In short" of the solution design.

## 4. The look and feel

**What it does:** settles the visual direction before the plan, when the product has screens.

**Claude does:** the Lead searches styles, palettes and font pairs for the product and its users and shows 2 or 3 named directions in `design/look-and-feel.html`, each applied to the main screen, at desktop and phone width. The Lead does this itself even when the project has UI/UX: that session opens after the plan and takes the chosen direction over ([chapter 7](07-products-with-screens.md)).

**You check:** the page. Pick one by its name. That is a choice for the plan, not an approval.

## 5. GitHub

**What it does:** connects the project to a repository before anything needs one (milestones, issues, pushes, CI). Skipped when `init` already created the repo.

**Claude asks you:** once, when the project was created with "GitHub: none": the repository name and whether it is private (suggested).

**Claude does:** `node scripts/connect-github.mjs <owner/name> private`, the same steps `init` takes: the repo, the branches, the labels, Dependabot, the board, where CI runs.

## 6. The environments

**What it does:** gets the database, the cache, the build host and `staging` ready before the first task.

**Claude does:** by default, starts the database and the cache in the project's own Docker (`node scripts/db-setup.mjs local`), with one account each and passwords you never see; creates every database of the project and writes each worktree's URLs (`create`); checks that the accounts reach them (`check`) and that a reset works on a scratch database made for it (`reset-check`); proposes the build host, the registry and where `staging` runs; writes `docs/tech/ops/environments.md`.

**Claude asks you:** nothing for the default. If the project must use servers you already have (a company SQL Server, a shared Redis), say so: you then paste their connection strings in a terminal ([chapter 1](01-setup.md#the-database-and-the-cache)).

**You check:** `node scripts/db-setup.mjs status`. You never see a password.

## 7. The plan approval

**What it does:** your first of three decisions. Everything after it is the team's work until the milestone is ready.

**Claude asks you,** alone and on one page with links: what the product does and for whom, the stories, the function tree, the architecture and stack, the look and feel you picked, the environments, the first milestone with its scope and AI time, the roles, the autonomy, and the open decisions. Then: approve, or say what to change.

**You check:** the page. Say "Approved" to approve. An answer that only picks an option ("design B") is taken as that choice, and the Lead asks for the approval again with it put in.

**Claude does,** on approval: fills in `CLAUDE.md` (the description, the stack, the commands, the stage), turns on the design plugins when there are screens, creates milestone v0.1.0 and merges the plan into `dev`.

**Claude asks before:** nothing else here. The approval is the go-ahead for the sessions and the first tasks.

## 8. Worktrees and sessions

**What it does:** gives every role its own folder and session, ready to work.

**Claude does:** creates each role's worktree from the approved plan, with its plugins, its port and its own `DATABASE_URL`; checks each role is ready; opens every session on Sonnet low with "Ready; wait for the Lead's task.", detached and filed in the project's sidebar group; then splits v0.1.0 into tasks ([chapter 4](04-delivery-loop.md)).

**You check:** the sidebar shows one group with the Lead and the roles you chose.

## If setup stops

Type `/cb-setup` again. The Lead records each step only after its check passes (`node scripts/setup-state.mjs` shows them), so a step that stopped halfway runs again from its start, keeping the choices already made. A run again never creates a second server, changes a password or resets data.

## Decide later

Any question can wait. Say "later": the Lead writes it under Open decisions in `CLAUDE.md` with the step that needs it, opens a `decision` issue, and carries on with what does not depend on it. `/cb-progress` lists what is still open.

> **Token tip:** the setup runs on the Lead's Opus. That pays back later: a clear plan lets most tasks start on a cheaper model.

Next: [Chapter 4: The delivery loop](04-delivery-loop.md).
