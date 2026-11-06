---
description: Split a milestone into tasks a fresh session can build, with level, reach, difficulty signals and model, and send them out (Lead only)
argument-hint: "[milestone, e.g. v0.1.0]"
---

Plan **$ARGUMENTS** (no argument: the open milestone). Only the Lead runs this. If `.claude/role` is not `lead`, end with the hand-off block for the Lead (prompt: `/cb-plan <milestone>`) and stop. If setup is not done, say so and stop.

1. **Split.** From the function tree, the stories and the solution design, split the milestone with `superpowers:writing-plans` into tasks of 2 h of AI time or less (rule "Estimates"). An issue that needs both layers becomes a backend task (with the API contract in the OpenAPI file) and a frontend task that depends on it. Small L0 and L1 changes in one area go into one task (rule "Change level", Grouping). Two roles never get tasks on the same files at the same time; a shared file has one owner and its task comes first.
2. **Write each task** from the Task form so a fresh session can build it without the history: the approach, the files, the pattern to copy, the tests that must pass, the acceptance, the API contract when there is one; then the level, for L3 the reach and the affected places, the three difficulty signals, the module, the role, the estimate.
3. **Pick the model** of each task from its level and signals (rule "Models") and write it on the issue. When you set a stronger one than the table gives, write why in one line.
4. **Show the plan** in one table: task, role, level (reach), model, estimate, depends on. Sum the AI time per role and the calendar (the AI time divided over the roles that work at the same time, plus the owner's slots and outside waits). The owner approved the milestone's scope with the plan; ask only when the sum goes past the date or a task needs a decision that is still open.
5. **Put them on the board:** each issue in Ready (`node scripts/board-status.mjs <n> Ready`), assigned, labelled with its level and `role:*`. Hand Test the milestone at once when the project has Test (`Write the test cases for v<X.Y.Z>.`).
6. **Send the first task of each role:** clear its session if its last task is merged and handed off (rule "Fresh context"), set its model and effort (`set_session_model`, `set_session_effort`), then send `/cb-build try #<n>` (rule "Hand-offs"). A role whose session is closed: open it (rule "Opening sessions"). Frontend tasks that wait for a backend task go out when that one is merged, unless the milestone is short of time: then Frontend starts against the mock of the contract.
7. Report in a few lines: the tasks per role, the first ones sent, the AI time and the calendar.
