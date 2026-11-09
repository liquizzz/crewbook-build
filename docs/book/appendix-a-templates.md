# Appendix A: Templates

**Purpose:** the documents the sessions fill in. You rarely open a template yourself: the session copies it into `docs/`, fills it in from what you said in plain words, and marks its guesses ⚠️ for you to correct.

← [Back: Chapter 8: Small teams](08-small-teams.md) · [Contents](../../README.md#the-book) · [Next: Appendix B: Kit reference](appendix-b-kit.md) →

**Ask any session:**

> Use the `<template>` template for `<topic>`.

## Used in every project

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

## On request

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

← [Back: Chapter 8: Small teams](08-small-teams.md) · [Contents](../../README.md#the-book) · [Next: Appendix B: Kit reference](appendix-b-kit.md) →
