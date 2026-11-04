---
description: Show or switch what runs without the owner (/cb-auto, /cb-auto merge on|off, /cb-auto relay on|off, /cb-auto testing on|off); merge and relay start on
argument-hint: merge on|off | relay on|off | testing on|off
---

Automation: **$ARGUMENTS**. Works in any session; the settings apply to every session of the project at once.

1. Without an argument, run `node scripts/crew-settings.mjs status` and report the three switches in three lines. Stop.
2. With `merge on|off`, `relay on|off` or `testing on|off`, run `node scripts/crew-settings.mjs <merge|relay|testing> <on|off>`. Anything else: show the usage line from the description and stop.
3. Reply in a few lines, in the owner's language:
   - **merge on** (the default): after its review (by level: L0-L1 the diff, L2 `code-review`, L3 also `security-review`) and green CI, the Lead merges every PR into `dev` without asking and reports each merge in one line. Gates, releases to `main`, deployments and rollbacks still wait for the owner, and nothing reaches `main` without `staging` and the acceptance.
   - **merge off:** the Lead asks the owner before every merge into `dev`.
   - **relay on** (the default): at the end of a step, each session sends the next session its one-line prompt itself and names it in one line of its recap. The receiving session reads the issue and the documents, so a message costs little beyond the work itself. Work runs on until a gate, a release or a question only the owner can answer. The receiving session must be open; if it is closed, the sender shows the hand-off block instead.
   - **relay off:** sessions end with a hand-off block for the owner to paste; `/cb-send` sends one block.
   - **testing off** (the default): every task is checked once, at the end of the milestone on `staging`: the regression (Full: Test; Lite: Dev1), then the acceptance (Full: Test; Lite: the Lead).
   - **testing on** (Full): after each merge the Lead also hands each L1-L3 task to Test, which checks it against the issue's acceptance criteria and closes it. More sessions at work and more tokens; useful for high-stakes products.
