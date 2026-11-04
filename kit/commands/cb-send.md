---
description: Send the prompt of your last hand-off block to the session it names, so the owner does not switch sessions
---

Send the hand-off prompt for the owner. Works in any session.

1. Take the last hand-off block you gave in this session: the session it names ("<Project> - <Role>") and the prompt in its code block. If there is none, say so in one line and stop.
2. Find that session with the app's session list and send it the prompt exactly as written, as a message from the owner. Add nothing else.
3. Run `node scripts/crew-settings.mjs learned` (the owner knows `/cb-send` now, so the tips under hand-off blocks stop).
4. Reply in one line, in the owner's language: sent to which session. If the session is closed or messages between sessions are not available here, say so and show the hand-off block again, so the owner can paste it.
