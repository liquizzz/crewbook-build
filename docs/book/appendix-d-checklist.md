# Appendix D: Process checklist

**Purpose:** every step in order, so nothing is skipped. Each row says who does it, what it leaves behind, and how you can tell it was done.

**Ask the Lead,** any time:

> Check the project against Appendix D and list anything skipped.

**Claude does:** checks each row against the repo and GitHub, marks it done, in progress or missing, and proposes the smallest set of steps to catch up.

## Once: the plan

| # | Step | Who | Leaves behind | Done when |
|---|---|---|---|---|
| 1 | Create the project (`init.mjs`) | You | The kit, the branches, the Lead's worktree, the repo and board, `START-HERE.md` | The report shows no warning you have not handled |
| 2 | Roles, autonomy and your idea (`/cb-setup`) | You and the Lead | The roles in `.claude/project.json`, the four switches | `/cb-auto` shows them |
| 3 | Requirements | Lead | Stories, the function tree | You corrected the draft |
| 4 | Stack | Lead | `docs/tech/solution-design.md`, Docker per layer, CI, `.claude/ownership.json`, the SRS baseline | You picked an option; `docker compose up --build` starts |
| 5 | The look and feel (products with screens) | Lead, before the plan | `design/look-and-feel.html` | You picked a direction by name |
| 6 | GitHub, when init skipped it | Lead, after your OK | The repository, branches, labels, the board, `"repo"` in `.claude/project.json` | `node scripts/connect-github.mjs --check` says connected |
| 7 | Environments | Lead; you only for `db-setup.mjs connect` when the project uses servers you already have | The database and the cache (local by default), one project account each, every database, each worktree's URLs, `docs/tech/ops/environments.md` | `db-setup.mjs check` is all ok and `reset-check` worked |
| 8 | The plan approval | You | `"setup": true`, milestone v0.1.0, `CLAUDE.md` filled in | You said "Approved" |
| 9 | Worktrees and sessions | Lead | One worktree per role with its own `DATABASE_URL`, one session per role filed in the project's group | `node scripts/setup-state.mjs` shows every step done |

## Every milestone

| # | Step | Who | Leaves behind | Done when |
|---|---|---|---|---|
| 10 | A CR for each functional change, an ADR for a technical one | Lead | `docs/product/cr/`, a row in `docs/product/changes.md` | The client's approval is recorded; yours for L2-L3 |
| 11 | Tasks (`/cb-plan`) | Lead | Issues with level, reach, signals and model | Each fits in two hours of AI time |
| 12 | Build (`/cb-build done`) | The role | A PR with its checks and review on its last commit, a hand-off comment | CI green; the reviews its level needs |
| 13 | Merge | Lead | The change on `dev`, the changed images as `:dev-<sha>` | Within your merge level, or your OK |
| 14 | Stalled sessions checked | Lead | A line to you for any session that stopped | `/cb-progress` lists none |
| 15 | Regression and acceptance on `staging` (`/cb-release demo`) | Test, or the Dev and the Lead | `docs/tech/test-reports/vX.Y.Z.md`; update and rollback scripts run when data changed | Every acceptance criterion tried |
| 16 | Your scenarios | You | "All pass" or the failures | You said "All pass": the milestone approval |
| 17 | Handover and release (`/cb-release`) | Lead | `docs/product/handover/`, `docs/releases/`, `CHANGELOG.md`, the SRS revision, the tag and image | You said "Approved": the release approval |
| 18 | Measures and log | Lead | `docs/reports/<date>.md`, the actual AI times, `docs/ai-log.md` | Once a week, and at the end of the milestone |

## When needed

| Step | Who | Chapter |
|---|---|---|
| A bug (`/cb-bug`) | Any session, filed by the Lead | [4](04-delivery-loop.md#5-something-does-not-work) |
| Hotfix, rollback | Lead, and you for production | [5](05-releases.md#hotfix-and-rollback) |
| First go-live | Lead writes the notes, you deploy | [5](05-releases.md#3-put-it-on-a-server) |
| Trace a change | Lead | [6](06-continuity.md#4-trace-a-change) |
| Add a role (`/cb-add-role`) | Lead | [8](08-small-teams.md#add-a-role-later) |
| Kit update (`/cb-update`) | Lead, your OK | [6](06-continuity.md#7-get-the-newest-kit) |

Steps 8, 16 and 17 are yours and are never skipped.
