# Chapter 3: The plan

**Purpose:** turn your idea into a plan you approve once: who uses the product, what it does, how it is built, where it runs, and what the first milestone delivers.

Setup is five questions and one approval. Each question comes with a suggestion you can take as it is, and the Lead drafts the answer to the next one while you read. Most owners finish it in one sitting.

## 1. Roles, autonomy and your idea

**What it does:** settles who is on the team and how much runs without you, and starts from your idea in your own words.

**Ask:** in the Lead's session, `/cb-setup`.

**Claude asks you,** in one message:
1. The roles: a table of what each role does and when it is worth having. The Lead and the Dev are always on; UI/UX, Frontend and Test are ticked. Untick what you do not need.
2. How much runs without you: the four `/cb-auto` switches with their defaults ([chapter 2](02-the-team.md#5-how-much-runs-without-you)). "Keep the defaults" is a fine answer.
3. Your idea, in any form: a few sentences, a document, a product you want to copy or beat, an old system to replace.

**Claude does:** records the roles and the switches. When you name a product to copy, it tries that product in the browser (the main flows, on desktop and phone) and tells you what it found, with links.

## 2. The requirements

**What it does:** writes down what the product must do, in words a client without a technical background understands on the first read.

**Claude asks you:** one short round on what only you know: who uses it, the problem it solves, what this first stage does, how you will know it works. At most three questions, each with its suggested answer.

**Claude does:** the first draft at once:
- the stories in `docs/product/stories/`, each with acceptance criteria in the user's words;
- the stories usually missing for this kind of product (password reset, empty states, an admin who leaves), as suggestions you keep or drop;
- the function tree in `docs/product/function-tree.md`: modules, then screens or functions, then their main actions.

Every guess carries ⚠️. The function tree later gives the folders, each role's paths, the milestones and the tasks.

**You check:** the stories and the tree. Approve, or say what to change in one message; the Lead puts your corrections straight in and asks again only about what changed.

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

**What it does:** your first of three decisions. Everything after it is the team's work until the milestone is ready.

**Claude asks you,** alone and on one page with links: what the product does and for whom, the stories, the function tree, the architecture and stack, the environments, the first milestone with its scope and AI time, the roles, the autonomy, and the open decisions. Then: approve, or say what to change.

**You check:** the page. Say "Approved" to approve. An answer that only picks an option ("design B") is taken as that choice, and the Lead asks for the approval again with it put in.

**Claude does,** on approval: fills in `CLAUDE.md` (the description, the stack, the commands, the stage), turns on the design plugins when there are screens, creates milestone v0.1.0, merges the plan into `dev`, then opens every role's session on Sonnet low with "Ready; wait for the Lead's task.", detached and filed in the project's sidebar group. It ends by splitting v0.1.0 into tasks ([chapter 4](04-delivery-loop.md)).

**Claude asks before:** nothing else here. The approval is the go-ahead for the sessions and the first tasks.

## Decide later

Any question can wait. Say "later": the Lead writes it under Open decisions in `CLAUDE.md` with the step that needs it, opens a `decision` issue, and carries on with what does not depend on it. `/cb-progress` lists what is still open.

> **Token tip:** the setup runs on the Lead's Opus. That pays back later: a clear plan lets most tasks start on a cheaper model.

Next: [Chapter 4: The delivery loop](04-delivery-loop.md).
