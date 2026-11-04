# Chapter 2: The team

**Purpose:** know which session does what, how code moves to production, and what stops a session from overstepping.

## Roles

| Role | Talk to it when you want to | Reports to | Open |
|---|---|---|---|
| Lead | Everything, from the idea to each release: the proposal and screen sketches, the requirements, the solution design, tasks, a change (a feature added or cut), quality, the handover, a release | You | Always |
| Dev1, Dev2 | Run `/cb-build try` and `/cb-build done` on the tasks the Lead assigns | Lead | Dev1 when tasks are ready; Dev2 only when you ask (`/cb-add-dev`) |
| Test | Rarely; the Lead assigns its work | Lead | Full, when G3 is approved: writes the test cases while the Devs build, then the regression and the acceptance on `staging` (and per task with `/cb-auto testing on`) |
| UI/UX | Pick a look and feel at G3, review a design round | Lead | Full, products with screens |
| DevOps | Rarely; hosting and pipelines | Lead | Larger infrastructure work |

The minimum team is the Lead and Dev1 (Lite: the Lead also does the design, the DevOps work and the acceptance on `staging`; Dev1 also the regression). Each role follows its file in `.claude/roles/` ([kit](../../kit/.claude/roles/)).

| Role | Writes | Pushes |
|---|---|---|
| Lead | `docs/product/` (screen sketches, CRs, `changes.md` and handovers included), `docs/tech/`, `docs/reports/`, milestones, `docs/releases/`, `CHANGELOG.md`, `CLAUDE.md`, `docs/ai-log.md`; merges | every branch (`main`, `production`, tags need you) |
| Dev | `app/` or source folders, unit tests; with two Devs only its workstream's folders (`.claude/ownership.json`) | `role/dev1` (`role/dev2` when you add Dev2) |
| Test (Lite: Dev1) | `tests/`, `docs/tech/test-cases/`, `docs/tech/test-reports/` | `role/test` |
| UI/UX | `design/`, `packages/tokens/` | `role/uiux` |
| DevOps | `.github/workflows/`, `infra/`, `scripts/`, `docs/tech/ops/` | `role/devops` |

**Branches:** `role/<role>` → `dev` (daily integration) → `staging` (release candidate: regression, acceptance, demo; Lite too) → `main` (released, tagged) → `production` (live, from go-live). One worktree per role; nobody rebases or force-pushes `dev`, `staging` or `main`.

## 1. Add a team member

**What it does:** opens a Dev, Test, UI/UX or DevOps session when there is work for it. The Lead proposes it: UI/UX at G3 for the look and feel of a product with screens, Dev1 and Test when G3 is approved (Test writes the test cases while Dev1 builds, and runs the regression and the acceptance at the end), any role when a task needs one. You can also ask. Each new session gets its role's model ([chapter 1](01-setup.md#change-the-models-later)).

**Ask the Lead:**
> We need a dev1 for the tasks in milestone v0.1.0. Prepare it.

**Claude asks you:** only if it is unclear which role you need and which tasks it should take first.

**Claude does:** creates the worktree `<project>-wt/dev1` on `role/dev1` with its local port and the secrets you set; assigns the first Ready issues to it; ends with the folder and the prompt in a box.

**You do:** say yes when the Lead offers to open the session: in Claude Code desktop it opens `<Project> - Dev1` in that folder, already given its prompt, as a session of its own. In the CLI, or if you prefer, open it yourself and paste the prompt. The session knows its role when it starts.

**You check:** the session lists its assigned issues and starts the first one.

## Add a second Dev

**What it does:** lets two Devs build at once when the milestone has two parts that do not touch each other (two Devs at most).

**Ask the Lead:**
> /cb-add-dev `<the work for Dev2, or nothing>`

**Claude asks you:** "Add Dev2 with this split?", after a short table of the two workstreams (folders, tasks, shared files and who owns each).

**Claude does:** gives each Dev one workstream, writes its folders under the Dev's key in `.claude/ownership.json` (the role guard then stops each Dev from editing the other's folders), gives each shared file (a migration, the menu, start-up code) one owner, creates `<project>-wt/dev2` and opens `<Project> - Dev2`. If no two parts are independent, it says so and adds no Dev.

**You check:** the split table makes sense for your product.

## Who thinks, who builds

**What it does:** keeps cost down by giving the hard thinking to the Lead's model. The Lead writes each task with its approach, the files to change and the tests that must pass; a Dev builds what the task says.

**Claude does:** a Dev that is still red after two tries stops and tells the Lead. The Lead then moves that task to a stronger model (`/cb-model dev1 opus`, for example), splits it, or does the hard part itself. After each merged task, the Lead clears the Dev's context when it has no other open PR, because a long session pays for its whole history on every call; the Dev picks up its next task from the issue.

**You do:** type `/clear` in the Lead's session when it asks, after G2 and after each release. It writes down where things stand first.

## 2. How a task moves (nothing to ask)

- The Dev commits on its branch, pushes, opens a PR into `dev` with `Closes #n` and sends the Lead the link. The card moves to In review.
- The Lead reviews a PR before any other work. When it asks for changes, the card goes back to In progress, and to In review again when the Dev pushes the fixes. Then the Lead squash-merges.
- Each task is checked once, at the end of the milestone, on `staging`: the regression (Full: Test; Lite: Dev1), then the acceptance (Full: Test; Lite: the Lead), then the 3-5 scenarios you try yourself. With `/cb-auto testing on` (Full), an L1-L3 task also moves to Testing after its merge, where Test checks it against its acceptance criteria.
- The issue closes and the card moves to Done. A docs PR with no task issue of its own has its own card: In review while it waits for you, Done when merged.

**You check:** "Waiting for the owner" in `/cb-progress`.

## 3. Ask for an independent review

**What it does:** gets a second opinion from Codex on a risky change. It runs only when you ask.

**Ask the Lead.** It proposes a review (label `codex-review` or `claude-review`) for L3 changes, anything touching money, security or user data, and before a release. To force the Codex review yourself, type in the Lead:
> /cb-review #42

Add `adversarial` to challenge the approach and design (with a focus if you like: `/cb-review #42 adversarial the payment flow`), or `standard` for a normal review. Without one, the Lead picks adversarial for L3 and `standard` otherwise.

**Claude asks you:** which PR, when more than one is waiting.

**Claude does:** runs Codex on the PR's diff against `dev` in a throw-away folder, labels the PR `codex-review`, posts Codex's findings on it unchanged, sends each finding it accepts to the author as changes to make, writes the reason on each one it rejects, and reports the counts.

**You check:** the summary. If the Codex plugin is missing or out of quota, Claude says so and stops: that is not a pass, and it does not switch reviewers. Claude's own `/code-review` runs only if you ask for it. A missing review never blocks a PR.

## 4. Guardrails (always on)

The `role-guard` hook ([kit](../../kit/.claude/hooks/role-guard.cjs)) checks every command and file edit in every session:

| Blocked for everyone | Blocked for non-Lead roles | The Lead asks you first |
|---|---|---|
| Force push to `dev`, `staging`, `main`; `--no-verify`; `gh secret`; editing real `.env` files | Pushing any branch but their own; merging PRs; releases; running workflows; editing paths they do not own | Pushing `main` or `production`; pushing tags; GitHub releases; running a workflow by hand |

A blocked session sees the reason and changes course. An approval request appears as a prompt in the Lead session. The hook also checks wrapped and nested commands ([Appendix B](appendix-b-kit.md)). It catches mistakes, but a determined person could get around it. On GitHub Free, private repos cannot use branch protection; on a paid plan, also protect `main` and `production` on GitHub.

## 5. How automatic it is

**What it does:** the team runs on its own between your decisions: sessions pass the work to each other and the Lead merges every PR after its review and green CI, while you approve the gates and every release. Nothing reaches `main` without `staging`, the acceptance and your approval. `/cb-auto` shows the switches; turn either off when you want to follow each step.

| Automation | What happens on its own | What you still do |
|---|---|---|
| 1 By hand (`/cb-auto relay off`, `/cb-auto merge off`) | Each open session takes its assigned issues, works, hands off on the issue and ends with a prompt for the next session | Paste each prompt (or `/cb-send` it); approve every merge, gate and release |
| 2 Default | Each session sends the next one its one-line prompt when a step ends (Claude Code desktop can send messages between local sessions); the Lead merges every PR after its review (by level) and green CI; a session that is needed and not running is opened for you, in its folder and with its name, as a session of its own | Say yes once to each session the Lead opens; answer the questions sessions ask; approve gates and releases |
| 3 Timers (`/loop`, `/goal`) | A session re-checks or keeps working on its own | Not recommended: every cycle costs tokens even when there is nothing to do |

At automation 2 every session names in its recap what it sent and what it merged ("Sent to Lead: Review the PR for #46.", "Merged PR #58 (L2), CI green."), so you can read what happened. A message costs little: the prompt is one line and the receiving session reads the issue and the documents, as it would if you pasted it. At automation 1 you carry the work yourself: the report ends with the session to open and a short prompt alone in a box, which you copy with one click and paste there, or send with `/cb-send` from the same session. The first few blocks show a one-line tip about `/cb-send` and `/cb-auto relay on`; it stops once you have used either. The receiving session comments `Started #n` on the issue when it begins, so the board shows whether it really picked the work up. An issue comment alone does not start a closed session.

**Type** `/cb-auto relay off` and `/cb-auto merge off` in any session to go back to automation 1, and `on` to return. A session the Lead opens is detached at once, so it runs on its own like one you opened yourself; the app asks for your yes before each new session, and the first time a folder opens it may ask whether you trust it.

Limits: sessions do not wake up on GitHub events by themselves; a closed session does nothing until opened; gates and releases always wait for you; every running session uses tokens.

> **Token tip:** automation 2 adds almost no cost: a message only wakes a session when there is real work. Avoid automation 3; if you try it, use a long interval and stop it the same day ([chapter 9](09-token-budget.md)).

Next: [Chapter 3: Foundation](03-foundation.md).
