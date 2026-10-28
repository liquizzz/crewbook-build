# Chapter 4: The delivery loop

**Purpose:** ship the product in small releases (milestones), turning each request into tested code without losing control of scope or date.

The rules:
- A milestone holds a few CRs and ships in a day or so. Only one runs at a time; one more is "next".
- The plan is set at the start of your working day; you decide.
- Each task has a change level that sets its testing: L0 display · L1 setting · L2 logic in one module · L3 core, money, security, user data, deletes.
- Estimates are in AI time: what the sessions take to build and test, plus your time for reviews and approvals, plus waits for things only others can give. Until the project has its own numbers, a task takes about 15 min (L0), 30 min (L1), 1 h (L2) or 2 h (L3) of AI time; a milestone that is ready after G3 usually fits in a day. Each closed task records its actual AI time, and the Lead updates the numbers every milestone.
- The committed date includes a risk buffer (+15% / +25% / +40%). New work in the day is paid from it; when it is used up, work moves to the next milestone or you move the date.

## 1. Ask for a change

**What it does:** records every change so the client cannot later say "I never asked for that", and the extra cost has a trail. A change is sorted by what the client receives:

| | Functional | Technical |
|---|---|---|
| What changes | What the client gets: a feature, behaviour a user sees, scope, acceptance, date or price | How it is built or run: a library, a provider, a model, the test approach, running cost |
| Comes from | The client or you, to the Lead | The Lead, or you |
| Recorded as | A CR with the client's approval and a row in `docs/product/changes.md` | An ADR; what the client must prepare and the risks you accepted go into the milestone file |
| Who approves | The client (you record it) and you for L2-L3 | You, when it touches cost or accepts a risk |

In the [news chatbot example](../examples/news-chatbot/walkthrough.md), moving the search to a self-hosted model to avoid paying for AI calls was technical, and so was skipping the full eval before the demo. Dropping the search of official sources for later was functional: the client got less.

**Ask the Lead** (after G2 every change goes to the Lead; `/change` sorts it first):
> /change `<what, in business terms>`

**Claude asks you:** only what your request does not say, at most three questions together, each with its suggested answer. A CR needs:
1. Who asked, how (email, chat, meeting) and when.
2. What changes for the user, from what to what.
3. Acceptance: what must be true when it is done (it proposes the criteria in the user's words).
4. The price, and whether it is billed (it gives the AI time and the date itself).
5. Priority: this milestone or the next, and anything out of scope.

**Claude does:** drafts the CR from your request at once, opens a CR issue with the scope before and after and the impact; when the client approves, records the approval (name, date, link) on it, exports it to `docs/product/cr/`, adds the row to `changes.md`, updates the SRS and writes the spec, all in one PR. A technical change becomes an ADR instead.

**You check:** the client's approval is recorded before work starts; approve L2-L3 CRs.

## 2. CR to tasks (nothing to ask)

**Claude does** (the Lead, for each approved CR):
- updates the SRS (FR/NFR, Revision History "Unreleased", traceability) and writes the spec ([template](../../templates/spec.md));
- merges both into `dev` before any task starts;
- creates task sub-issues with level, module, estimate, confidence, assignee; moves them to Ready.

A task is Ready when its CR is approved by the client (or its ADR accepted), the SRS and spec are on `dev`, it has acceptance criteria linked to `FR-xxx`, nothing blocks it and its assignee is free.

A task is Done when it is pushed, its PR (`Closes #n`) passed CI and the Lead's review, tests pass for its level, the SRS and `CHANGELOG.md` are updated, and it is merged into `dev`.

## 3. Where things stand

**What it does:** shows the live state of the project: stage, what is done, in progress, waiting for you or blocked, CI, and the next step.

**Ask any session**, whenever you want:
> /progress

**Claude does:** checks GitHub and git live and replies in at most 10 lines with links. It writes nothing.

**You check:** "waiting for the owner" and "blocked". Answer the decisions in one reply, e.g. "1 yes, 2 next milestone".

When you want it kept, for yourself or a client, type `/progress report` in the PO or the Lead: it saves the same state in `docs/reports/<date>.md` ([template](../../templates/daily-report.md)) and sends you the link.

## 4. Something urgent comes up

**Ask the Lead:**
> `<the new item>`. Can we fit it in this milestone?

**Claude asks you:** only what is missing about the item (as in step 1).

**Claude does:** sorts it: defect in testing → this milestone · L0-L1 within the buffer → this milestone · L2-L3 or more than 2 h of AI time → next milestone, unless you accept a later date · high-severity production defect → hotfix (chapter 5). Tells you the effect on the buffer and the date.

**You check:** accept, defer, or move the date.

## 5. The date is at risk

**Claude does:** the Lead proposes these steps on its own, in order: (1) use the buffer, (2) move the lowest-priority CR to the next milestone, (3) move the date.

**You check:** choose. Only you can move the date.

## 6. Test by change level

**What it does:** tests exactly what the change level requires, so small changes cost little and risky ones are covered. The level is confirmed before any test starts.

| Level | Dev before the PR | Test after merge (only with `/auto testing on`, Full) |
|---|---|---|
| L0 Display | Build, lint, local look | None now; covered by the milestone regression |
| L1 Setting | + unit tests for the change | Check the changed spot only |
| L2 Module logic | + unit tests; main scenario locally | That module's scenarios (by `FR-xxx`) |
| L3 Core | + integration tests, edge cases | Core scenarios, related modules, part of the regression |

**Claude does,** on its own for every task:
1. The tester (the Dev before the PR; Test after the merge when per-task testing is on) reads the task's level and the files actually changed, and writes one line on the issue: *"Level L1 confirmed: only the default page size changed; testing the list page only."*
2. If the change is wider than its label, it raises the level (e.g. an "L1" that touched shared code or data becomes L3) and tells the Lead; it never lowers a level on its own.
3. It tests only that scope, then records the result on the issue.

**Ask the Lead** when you doubt a level:
> Is #42 really L1? Show me what changed.

**Claude does:** compares the diff with the level rules and confirms or raises it.

Each task is checked once more at the end of the milestone, whatever its level, on `staging`: the regression (Full: Test; Lite: Dev1), then the PO's acceptance. The release adds no tests.

## 7. Build modes

**What it does:** keeps day-to-day work fast and every merge controlled.

| Type | When | Tests | Merge |
|---|---|---|---|
| `/build try [#n]` | You want to see a task working, try it, change direction | None; it only has to run | No. Committed and pushed to `role/<role>`; the issue stays In progress |
| `/build done [#n]` | The task is finished | Exactly the task's confirmed level (section 6) | A PR the Lead merges after its review and green CI (section 8); the Lead then closes the issue |
| `/release demo` | You want to show the milestone to someone | Regression and the PO's acceptance on `staging`, your acceptance scenarios | No tag; the demo runs the `:staging` image |
| `/release` | You publish a version | None more: the accepted `staging` commit is released | `main`, a tag and a versioned image ([chapter 5](05-releases.md)) |

Only `/build done` puts code into `dev`, so `dev` always holds tested work. The board follows each issue: Ready, In progress, In review (back to In progress when the Lead asks for changes), Testing (Full, only with `/auto testing on`), Done. Anything waiting for the Lead's review or your merge is in In review, docs PRs included.

> **Token tip:** most tasks are L0-L1. Keeping them at "build + changed spot" is where most testing tokens are saved; do not ask for a full regression after each merge.

## 8. Where CI runs

**What it does:** runs the build, lint and tests of every PR somewhere, without spending more than you have. A GitHub account's free Actions minutes (2,000 a month) are shared by all its private repos, and a project with a real stack uses them up in days.

| Mode | When | What runs where |
|---|---|---|
| `github` | Public repo (free minutes), or you pay for minutes | GitHub Actions: CI on each PR (PRs that only change documents are skipped), the image on `staging` and on each tag, CodeQL on `main` and once a week |
| `local` | Private repo (the default) | Your machine: `node scripts/ci-local.mjs <branch>` runs the steps of `scripts/ci-steps.json` on the branch merged with `dev`. The Dev runs it before the PR, the Lead again right before the merge, and `node scripts/run.mjs` builds the images here. The workflows stay in the repo and skip their jobs |

**Ask the Lead:**
> Run CI on GitHub from now on. (or: on my machine)

**Claude does:** runs `node scripts/ci-mode.mjs github` (or `local`), which sets `"ci"` in `.claude/project.json` and the repo variable `CI_MODE`, and commits. At G3 it writes the same steps in `.github/workflows/ci.yml` and `scripts/ci-steps.json`, so you can switch at any time.

**You check:** in local mode your machine builds and tests more (Docker must be running for the image and for tests that use containers). CodeQL does not run on a private repo either way; L3 work keeps its `security-review`.

Next: [Chapter 5: Releases](05-releases.md).
