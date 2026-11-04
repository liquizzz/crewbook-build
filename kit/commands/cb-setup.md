---
description: Finish the project setup (CLAUDE.md, gate issues, milestone, the team's folders, the model mode) with one question; comes first
---

Finish the setup of this Crewbook project. You are the Lead (check `.claude/role`; if not, say which session to open and stop). Setup comes before any other step: until it is done, the other sessions wait. Setup asks the owner one thing, the model mode; the idea and the constraints come at G1, the stack at G3.

1. Read `.claude/project.json` (level, design, humanize) and `CLAUDE.md`. **Plugins first:** check your own skill list for `superpowers:`, `code-review`, `claude-mem` and `context7` skills (and `humanizer` when `humanize` is true). If any is missing, run `node scripts/plugins.mjs` (it installs what `.claude/settings.json` enables, or prints the `/plugin install` lines to paste), tell the owner to type `/reload-plugins` and then `/cb-setup` again, and stop.
2. Set up:
   - fill in `CLAUDE.md`: the description from init (or "given at G1"), Stage ("Foundation, next gate G1") and the Stack line ("chosen at G3, in the solution design");
   - create milestone v0.1.0 on GitHub (Full: also v0.2.0) and one issue per foundation gate, labelled `gate`, in Backlog on the board: "G1 Proposal", "G2 Requirements", "G3 Design, stack and SRS". Foundation commits name their gate's issue;
   - if the project's language (the Language line in `CLAUDE.md`, `language` in `.claude/project.json`) is not English, rewrite `START-HERE.md` in that language; keep commands, paths, code blocks, links and session names in English and explain in that language what each command does (`scripts/set-level.mjs` renders it again in English and tells the owner to ask you to rewrite it, so do it again then);
   - in Claude Code desktop: if your own session's title is not "<Project> - Lead", rename it (`set_session_title`); if it is in no sidebar group, create one named after the project and file yourself in it (`create_group`, then `move_sessions` with `self`), so every session opened later joins the same group;
   - set `"setup": true` in `.claude/project.json`;
   - commit, merge into `dev`, push.
3. **The model mode** (rule "Models" in `CLAUDE.md`), the one question of setup, with `claude` as the suggested answer: `claude` (every role on Claude: Lead, UI/UX and DevOps on Opus, Dev and Test on Sonnet), `deepseek` (every role on DeepSeek), or `mix` (Lead, UI/UX and DevOps on Claude Opus, Dev and Test on DeepSeek Flash). Say in one line that `deepseek` and `mix` send the code of those roles to DeepSeek's servers, so a client project needs the client's OK. For `deepseek` or `mix`, the DeepSeek key must be set first: if `node scripts/model.mjs` says "DeepSeek key: not set", give the owner `node scripts/set-secret.mjs DEEPSEEK_API_KEY` to run in a terminal (never in the chat) and wait. Then `node scripts/model.mjs mode <mode>` and commit `.claude/project.json`.
4. From your own worktree, create the team's folders: Lite `node scripts/new-role-worktree.mjs dev1`; Full none yet. Full: UI/UX joins at G3 for the look and feel, Dev1 and Test when G3 is approved (Test writes the test cases while Dev1 builds). Dev2 comes only when the owner asks for it (`/cb-add-dev`). Each new worktree gets its role's model.
5. Check live state: `gh run list --limit 3`. If no run exists, tell the owner to open the repo's Actions tab and click "Enable Actions on this repository", then check again.
6. Report in a few lines what was set up, with links. The next step stays in this session: end with the hand-off block (format in `CLAUDE.md`), for example:

   **Next:** here, in this session, type:
   ```
   /cb-next <your idea, in your own words>
   ```
