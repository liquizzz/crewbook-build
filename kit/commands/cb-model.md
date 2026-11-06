---
description: Change the model of a task. "/cb-model up" = one step up; "/cb-model <model> [effort]"; "/cb-model #n <model> [effort]" (Lead); "/cb-model mode <claude|deepseek>" (Lead)
argument-hint: "up [reason] | <haiku|sonnet|opus> [effort] | #<n> <model> [effort] | mode <claude|deepseek>"
---

Model: **$ARGUMENTS** (rule "Models" in `CLAUDE.md`). Showing the models is `/cb-progress`; this command changes them. A session cannot change its own model or effort: the app refuses it. So the Lead switches the other sessions, and the owner switches the Lead's in the model menu.

- **`up [reason]`, `<model> [effort]` in a role's session** (Dev, Frontend, Test, UI/UX): send the Lead one line, `#<n>: <the request> (<reason>)` (rule "Hand-offs"), and stop until it answers. Do not keep working on the old model if the owner asked for a stronger one.
- **The same in the Lead's own session:** for your own work, tell the owner in one line which model and effort to pick in the model menu (`/model` in the CLI), and why.
- **The Lead, for a role's task** (a request from that role or the owner, `/cb-model #<n> <model> [effort]`, or a task that is stuck):
  1. Check the cause first (rule "Models", When a task fails): a broken environment or an unclear task is fixed, not moved up.
  2. `node scripts/model.mjs up <role> <reason>` (one step) or `node scripts/model.mjs task <role> #<n> <model> <effort>` (a given model); it prints the model id.
  3. Opus needs the owner's OK unless `/cb-auto escalate` is on and the owner allowed it: ask in one line with the reason and the cost.
  4. Set it on the session (`set_session_model`, `set_session_effort`); write the move on the issue as one comment, `Model: <from> → <to> (<cause>: <reason>)`, which the weekly measures count; tell the role to go on.
- **`mode <claude|deepseek>`** (Lead): `node scripts/model.mjs mode <mode>`. `claude`: every role on Claude, the model chosen per task. `deepseek`: the Dev, Frontend and Test on DeepSeek, the Lead and UI/UX on Claude; DeepSeek gets the code those roles see, so a client project needs the client's OK, and its key must be set first (the owner runs `node scripts/set-secret.mjs DEEPSEEK_API_KEY` in a terminal, never in the chat). A DeepSeek session starts with `claude` in its worktree, not from the app (rule "Models"); tell the owner which sessions to start again. Commit `.claude/project.json`.

Report in one or two lines: which session, the model and effort now, why.
