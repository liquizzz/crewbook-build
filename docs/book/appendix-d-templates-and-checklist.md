# Appendix D: Templates and project checklist

← [Back: Appendix C: Troubleshooting](appendix-c-faq.md) · [Contents](../../README.md#read-the-guide) · [Next: Appendix E: Standards map](appendix-e-standards.md) →

**Purpose:** every step in order, so nothing is skipped. Each row says who does it, what it leaves behind, and how you can tell it was done.

**Ask the Lead,** any time:

> Check the project against Appendix D and list anything skipped.

**Claude does:** checks each row against the repo and GitHub, marks it done, in progress or missing, and proposes the smallest set of steps to catch up.

## Once: the plan

| # | Step | Who | Leaves behind | Done when |
|---|---|---|---|---|
| 1 | Create the project (`init.mjs`) | You | The kit, the branches, the Lead's worktree, the repo and board when selected, `START-HERE.md` | The report shows no warning you have not handled |
| 2 | Roles, autonomy and your idea (`/cb-setup`) | You and the Lead | The roles in `.claude/project.json`, the four switches | `/cb-auto` shows them |
| 3 | Requirements | Lead | Stories, the function tree | You reviewed the draft and supplied corrections |
| 4 | Stack | Lead | `docs/tech/solution-design.md`, Docker per layer, CI, `.claude/ownership.json`, the SRS baseline | You picked an option; `docker compose up --build` starts |
| 5 | Environments | Lead, and you for `db-setup.mjs create` | Databases and logins, `docs/tech/ops/environments.md` | `db-setup.mjs check` is all ok; a reset works |
| 6 | The look and feel (products with screens) | UI/UX, or the Lead | `design/look-and-feel.html` | You picked a direction by name |
| 7 | The plan approval | You | `"setup": true`, milestone v0.1.0, `CLAUDE.md` filled in | You said "Approved" |
| 8 | The sessions | Lead | One session per role, filed in the project's group | The sidebar shows them |

## Every milestone

| # | Step | Who | Leaves behind | Done when |
|---|---|---|---|---|
| 9 | A CR for each functional change, an ADR for a technical one | Lead | `docs/product/cr/`, a row in `docs/product/changes.md` | The client's approval is recorded; yours for L2-L3 |
| 10 | Tasks (`/cb-plan`) | Lead | Issues with level, reach, signals and model | Each fits in two hours of AI time |
| 11 | Build (`/cb-build done`) | The role | A PR with its checks and review on its last commit, a hand-off comment | CI green; the reviews its level needs |
| 12 | Merge | Lead | The change on `dev`, the changed images as `:dev-<sha>` | Within your merge level, or your OK |
| 13 | Stalled sessions checked | Lead | A line to you for any session that stopped | `/cb-progress` lists none |
| 14 | Regression and acceptance on `staging` (`/cb-release demo`) | Test, or the Dev and the Lead | `docs/tech/test-reports/vX.Y.Z.md`; update and rollback scripts run when data changed | Every acceptance criterion tried |
| 15 | Your scenarios | You | "All pass" or the failures | You said "All pass": the milestone approval |
| 16 | Handover and release (`/cb-release`) | Lead | `docs/product/handover/`, `docs/releases/`, `CHANGELOG.md`, the SRS revision, the tag and image | You said "Approved": the release approval |
| 17 | Measures and log | Lead | `docs/reports/<date>.md`, the actual AI times, `docs/ai-log.md` | Once a week, and at the end of the milestone |

## When needed

| Step | Who | Chapter |
|---|---|---|
| A bug (`/cb-bug`) | Any session, filed by the Lead | [3](03-build-and-review.md#5-something-does-not-work) |
| Hotfix, rollback | Lead, and you for production | [4](04-try-release-and-deploy.md#hotfix-and-rollback) |
| First go-live | Lead writes the notes, you deploy | [4](04-try-release-and-deploy.md#3-put-it-on-a-server) |
| Trace a change | Lead | [5](05-continue-and-maintain.md#4-trace-a-change) |
| Add a role (`/cb-add-role`) | Lead | [7](07-configure-your-team.md#add-a-role-later) |
| Kit update (`/cb-update`) | Lead, your OK | [5](05-continue-and-maintain.md#7-get-the-newest-kit) |

Steps 7, 15 and 16 are yours and are never skipped.

## Document templates

Sessions copy templates into `docs/`, fill them in from your requirements and mark guesses ⚠️ for correction. You rarely need to edit a template yourself.

**Ask any session:**

> Use the `<template>` template for `<topic>`.

### Used in every project

| Template | Written by | Saved as | When |
|---|---|---|---|
| [User story](../../templates/user-story.md) | Lead | `docs/product/stories/US-NNN-*.md` | Setup question 3, then every CR that adds one |
| [Function tree](../../templates/function-tree.md) | Lead | `docs/product/function-tree.md` | Setup question 3; it gives the folders, the roles' paths, the milestones and the tasks |
| [Architecture options](../../templates/architecture-options.md) | Lead | In the setup conversation, then the solution design | Setup question 4: three options, one recommended |
| [Solution design](../../templates/solution-design.md) | Lead | `docs/tech/solution-design.md` | Setup question 4; opens with "In short" |
| [SRS](../../templates/srs.md) | Lead | `docs/tech/srs.md` | The baseline at the plan approval; updated by every CR and every release |
| [Environments](../../templates/environments.md) | Lead | `docs/tech/ops/environments.md` | Setup question 5 and `/cb-env` |
| [Milestone](../../templates/milestone.md) | Lead | `docs/product/milestones/vX.Y.Z.md` | `/cb-plan`; the actual AI times at the end |
| [ADR](../../templates/adr.md) | Lead | `docs/tech/adr/NNNN-*.md` | A technical choice that was really open |
| [DEC](../../templates/dec.md) | Lead | `docs/product/dec/DEC-n-*.md` | A business decision |
| [CR](../../templates/cr.md) | Lead | `docs/product/cr/CR-n-*.md` | `/cb-change`, every functional change |
| [Changes](../../templates/changes.md) | Lead | `docs/product/changes.md` | One row per approved CR |
| [Spec](../../templates/spec.md) | Lead | `docs/tech/spec/CR-n-*.md` | A CR whose technical detail does not fit its tasks |
| [Test cases](../../templates/test-cases.md) | Test, or the Dev without Test | `docs/tech/test-cases/<module>.md` | Each milestone |
| [Test report](../../templates/test-report.md) | Test, or the Dev; its acceptance section the Lead without Test | `docs/tech/test-reports/vX.Y.Z.md` | `/cb-release demo` |
| [Handover](../../templates/handover.md) | Lead | `docs/product/handover/vX.Y.Z.md` | Every release, for the client |
| [Release](../../templates/release-checklist.md) | Lead | `docs/releases/vX.Y.Z.md` | Every release |
| [Changelog](../../templates/changelog.md) | Every role, on its PR | `CHANGELOG.md` | Every PR and every release |
| [Report](../../templates/daily-report.md) | Lead | `docs/reports/YYYY-MM-DD.md` | `/cb-progress report`, once a week |

### On request

These are there when you, a client or a reviewer ask for them; the setup does not need them.

| Template | Saved as | Useful when |
|---|---|---|
| [Proposal](../../templates/proposal.md) | `docs/product/proposal.md` | A client wants a one-page pitch before the plan |
| [PRD](../../templates/prd.md) | `docs/product/prd.md` | A client expects a product requirements document |
| [Data notes](../../templates/data-notes.md) | `docs/product/data-notes.md` | The product moves or cleans existing data |
| [C4 diagrams](../../templates/c4.md) | `docs/tech/c4.md` | Several systems talk to each other |
| [Test strategy](../../templates/test-strategy.md) | `docs/tech/test-strategy.md` | A client or an auditor asks how testing is organised |
| [Eval plan](../../templates/eval-plan.md) | `docs/tech/eval-plan.md` | The product has AI features whose answers must be measured |
| [Case study](../../templates/case-study.md) | `docs/product/case-study.md` | The end of a project or a phase you want to show |

Placeholders are in `<angle brackets>`. A session never leaves one unfilled: it writes its best guess marked ⚠️, or asks you when a guess would change the result.

---

← [Back: Appendix C: Troubleshooting](appendix-c-faq.md) · [Contents](../../README.md#read-the-guide) · [Next: Appendix E: Standards map](appendix-e-standards.md) →
