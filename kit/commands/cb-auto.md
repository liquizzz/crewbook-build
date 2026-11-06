---
description: Show or switch what runs without the owner (/cb-auto; merge <off|only-L0|up-to-L1|up-to-L2|all>; relay, escalate, testing on|off; /cb-auto off stops every automation)
argument-hint: merge <off|only-L0|up-to-L1|up-to-L2|all> | relay on|off | escalate on|off | testing on|off | off
---

Automation: **$ARGUMENTS**. Works in any session; the settings apply to every session of the project at once. `/cb-setup` asks for them; this changes them later.

1. Without an argument, run `node scripts/crew-settings.mjs status` and report the four settings in four lines. Stop.
2. With `merge <level>` (empty means `all`), `relay on|off`, `escalate on|off`, `testing on|off` or `off`, run `node scripts/crew-settings.mjs <setting> <value>` (`off` alone: `node scripts/crew-settings.mjs off`). Anything else: show the usage line from the description and stop.
3. Reply in a few lines, in the owner's language:
   - **merge** is the highest level the Lead merges by itself, after the role's reviews and a valid PASS (rule "Reviews and evidence"): `off` none, `only-L0` L0, `up-to-L1` L0 and L1, `up-to-L2` L0 to L2, `all` (the default) every level, L3 included. A PR above it waits for the owner. Each merge is one line in the Lead's recap.
   - **relay on** (the default): at the end of a step each session sends the next one its prompt itself and names it in its recap; work runs on until something only the owner can decide. The receiving session must be open; if it is closed, the sender shows the hand-off block instead. **relay off:** sessions end with a hand-off block for the owner to paste; `/cb-send` sends one.
   - **escalate on** (the default): a task stuck on the same wrong reasoning moves one step up the model ladder by itself (rule "Models"), the reason on the issue; Opus still asks the owner. **escalate off:** every move up is the owner's call, from the alert.
   - **testing off** (the default): every task is checked once, at the end of the milestone on `staging` (the regression by Test, or the Dev without Test). **testing on** (with Test): after each merge Test also checks each L1-L3 task against its acceptance criteria and closes it; more sessions at work and more tokens.
   - **off:** relay, merge and escalate all off at once, for when the owner wants to stop and look; turn each back on by name.
   Whatever the settings, the owner always decides the three approvals (the plan, each milestone, each release), production, money, accounts, secrets, deleting data, and a change to the client's scope, date or price (rule "Ask the owner before").
