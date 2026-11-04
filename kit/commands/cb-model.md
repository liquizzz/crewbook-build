---
description: Show or change which provider (Claude, DeepSeek) and model each role runs on; "/cb-model mode <claude|deepseek|mix>" for the whole project
argument-hint: "[mode <claude|deepseek|mix> | <role> <opus|sonnet|deepseek-pro|deepseek-flash|default>]"
---

Models: **$ARGUMENTS**. Only the Lead changes them, on the owner's request. In another session, show the table (no argument) and, for a change, end with the hand-off block for the Lead (prompt: `/cb-model <arguments>`).

1. **No argument:** run `node scripts/model.mjs` and show its table in the owner's language: each role, its provider, its model, and whether it is the mode's default or changed; whether the DeepSeek key is set (never its value).
2. **`mode <claude|deepseek|mix>`:** the whole project (rule "Models" in `CLAUDE.md`). Before `deepseek` or `mix`, say in one line that the code those roles see goes to DeepSeek's servers, so a client project needs the client's OK. Run `node scripts/model.mjs mode <mode>`. Without the DeepSeek key it refuses: give the owner `node scripts/set-secret.mjs DEEPSEEK_API_KEY` to run in a terminal (never in the chat), then run it again. Commit `.claude/project.json`.
3. **`<role> <model>`:** one role (`lead`, `dev1`, `dev2`, `test`, `uiux`, `devops`), for example a stuck task (`/cb-model dev1 deepseek-pro`, or `opus`). `default` takes it back to the mode's model. Run `node scripts/model.mjs <role> <model>`; it refuses `deepseek-pro` for UI/UX and Test, which look at images. Note the change and why on the task's issue.
4. **After a change:** a running session keeps its old model. Tell the owner which sessions to restart, or restart them yourself when the app lets you (Claude Code desktop: for a Claude model, also set the open session's model with `set_session_model`). In the restarted session, `/status` shows the model and the address (`api.deepseek.com` for DeepSeek).
5. Report in two lines: what changed, and which sessions need a restart.
