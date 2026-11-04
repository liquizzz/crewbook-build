---
description: Add a second Dev (Dev2) with its own workstream, when the owner asks for it (Lead only)
argument-hint: "[the workstream for Dev2, e.g. the media module]"
---

Add Dev2: **$ARGUMENTS**. Only the Lead runs this, when the owner asks for a second Dev. If `.claude/role` is not `lead`, end with the hand-off block for the Lead (prompt: `/cb-add-dev <workstream>`) and stop. The kit has at most two Devs (rule "Two Devs" in `CLAUDE.md`); if Dev2 exists already, say so and stop.

1. **Split the work into two workstreams** that do not touch each other: from the milestone's open tasks and the solution design's system map, give Dev1 and Dev2 one workstream each (a module, its folders, its tests). Without an argument, propose the split yourself. Each file both would touch (a shared model, the menu, a migration list, `CHANGELOG.md`) gets one owner; the other asks through the issue. A milestone with no two independent workstreams does not get a Dev2: say so and stop.
2. **Show the split** to the owner in a short table (workstream, folders, tasks, shared files and their owner) and ask once: "Add Dev2 with this split?"
3. **On yes:**
   - write the two workstreams in `.claude/ownership.json` under `dev1` and `dev2` (their folders and the shared files each owns), commit, merge into `dev`, push;
   - assign Dev2's tasks to it in the milestone file and on their issues, shared-file tasks first;
   - from your own worktree, `node scripts/new-role-worktree.mjs dev2` (it gets its port and its role's model, rule "Models");
   - open the Dev2 session for the owner (rule "Opening sessions" in `CLAUDE.md`, title "<Project> - Dev2", first message `/cb-build try #<n>`), or give its hand-off block; tell Dev1 in one hand-off which workstream is now its own.
4. Report in two lines: the two workstreams and Dev2's first task.
