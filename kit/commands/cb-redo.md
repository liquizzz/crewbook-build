---
description: Do the last step again on a stronger model (an analysis, a design, a task), keeping the first result to compare
argument-hint: "[haiku|sonnet|opus] [effort] [what was weak]"
---

Redo: **$ARGUMENTS**. For when the owner finds a result weak: an analysis, a proposal, a design, a task's code.

1. **Which step:** the last result you gave the owner (or the one they name). Say it in one line, with the model and effort it ran on.
2. **Which model:** the one given, or one step up the ladder (rule "Models"). A session cannot change its own model:
   - in a role's session, send the Lead `#<n>: redo on <model> <effort> (<what was weak>)` and stop; the Lead switches the session (`node scripts/model.mjs up <role>`, `set_session_model`, `set_session_effort`) and sends the redo back;
   - in the Lead's own session, tell the owner the model and effort to pick in the model menu, and go on when they say it is set.
   Opus needs the owner's OK unless escalation is on and allowed.
3. **Keep the first result:** a document is copied next to it with `-v1` before you write the new one; code stays on its commit (note the sha on the issue). The new result starts from the owner's words and the documents, not from the first attempt's reasoning; read the first only to avoid its mistakes.
4. **Show both:** what changed and why, in a few lines, with links to both versions. The owner keeps one; drop the other (delete the `-v1` copy, or revert to the kept commit).
5. Write on the issue (or in Open decisions during setup): the step redone, the model, and which version was kept. It counts in the weekly report as a move up.
