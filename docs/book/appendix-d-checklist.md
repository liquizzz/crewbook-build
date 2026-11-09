# Appendix D: Process checklist

**Purpose:** every step in order, so nothing is skipped. Each row says who does it, what it leaves behind, and how you can tell it was done.

← [Back: Appendix C: FAQ and troubleshooting](appendix-c-faq.md) · [Contents](../../README.md#the-book) · [Next: Appendix E: Standards map](appendix-e-standards.md) →

**Ask the Lead,** any time:

> Check the project against Appendix D and list anything skipped.

**Claude does:** checks each row against the repo and GitHub, marks it done, in progress or missing, and proposes the smallest set of steps to catch up.

## Once: the plan

| # | Step | Who | Leaves behind | Done when |
|---|---|---|---|---|
| 1 | Create the project (`init.mjs`) | You | The kit, the branches, the Lead's worktree, the repo and board, `START-HERE.md` | The report shows no warning you have not handled |
| 2 | Roles, autonomy and your idea (`/cb-setup`) | You and the Lead | The roles in `.claude/project.json`, the four switches | `/cb-auto` shows them |
| 3 | Requirements | Lead | Stories, the function tree | You approved them |
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
| A bug (`/cb-bug`) | Any session, filed by the Lead | [4](04-delivery-loop.md#5-something-does-not-work) |
| Hotfix, rollback | Lead, and you for production | [5](05-releases.md#hotfix-and-rollback) |
| First go-live | Lead writes the notes, you deploy | [5](05-releases.md#3-put-it-on-a-server) |
| Trace a change | Lead | [6](06-continuity.md#4-trace-a-change) |
| Add a role (`/cb-add-role`) | Lead | [8](08-small-teams.md#add-a-role-later) |
| Kit update (`/cb-update`) | Lead, your OK | [6](06-continuity.md#7-get-the-newest-kit) |

Steps 7, 15 and 16 are yours and are never skipped.

---

← [Back: Appendix C: FAQ and troubleshooting](appendix-c-faq.md) · [Contents](../../README.md#the-book) · [Next: Appendix E: Standards map](appendix-e-standards.md) →
