---
description: Add a role after setup (UI/UX, Frontend or Test): its worktree, its folders and its session (Lead only)
argument-hint: "<uiux|frontend|test>"
---

Add the role **$ARGUMENTS**. Only the Lead runs this. If `.claude/role` is not `lead`, end with the hand-off block for the Lead (prompt: `/cb-add-role <role>`) and stop.

1. Check the role: one of `uiux`, `frontend`, `test`, and not one of the project's roles yet (`node scripts/roles.mjs`). Without an argument, show the table from `node scripts/roles.mjs` and propose the role that would help most now, with one line why.
2. Say in two lines what moves to it: Frontend takes the frontend folders and the open frontend work from the Dev; UI/UX takes `design/`, the tokens and the next design rounds from you; Test takes the test cases and the regression from the Dev. Open tasks keep their role; only new ones go to the new role. Ask once: "Add <Role>?"
3. On yes: `node scripts/roles.mjs add <role>` (it writes `.claude/project.json`, `CLAUDE.md`, `START-HERE.md` and creates the worktree). Then:
   - Frontend: move the frontend folders from `"dev"` to `"frontend"` in `.claude/ownership.json` (when the UI lives in the backend project, the views, static files and components inside the Dev's folders);
   - UI/UX: create `design/` and `packages/tokens/`, and enable the design plugins in `.claude/settings.json` if they are off;
   - Test: give it its folders in `.claude/ownership.json` if they differ from the defaults;
   - commit, merge into `dev`, push.
4. Create the session as `/cb-setup` step 7 does (title "<Project> - <Role>", Sonnet, low effort, `Ready; wait for the Lead's task.`), then send it its first task or, for Test, `Write the test cases for v<X.Y.Z>.`
5. Report in two lines: the new role, what it took over, its first task.
