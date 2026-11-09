# Chapter 8: Small teams

**Purpose:** run a project with only the roles it needs, and add one later without redoing anything.

Every project has the Lead and the Dev. UI/UX, Frontend and Test are ticked at setup and you untick what the project does not need. Fewer sessions means fewer tokens and fewer hand-offs; the process (the plan, the levels, the reviews, `staging`, your three approvals) stays the same.

## Who does the work of a role you leave out

| Left out | Its work goes to | What you give up |
|---|---|---|
| UI/UX | The Lead picks the look and feel and sketches the screens | Design rounds ahead of the code; a separate design link for a client |
| Frontend | The Dev builds both layers | Screens built at the same time as the backend |
| Test | The Dev runs the regression; the Lead tries every acceptance criterion | A session whose only job is to find what is broken |

## Which roles to pick

| Project | Roles |
|---|---|
| A script, an API, a tool without screens | Lead, Dev |
| A small app for a few people | Lead, Dev, Frontend |
| A product people depend on, or with money, personal data or a client who signs off | Lead, Dev, UI/UX, Frontend, Test |
| A one-off spike you will throw away | None: a single Claude Code session is enough |

There is no one-session Crewbook: one session playing every role is slower than two working side by side, and it hides the hand-offs you need to see.

## Add a role later

**What it does:** brings in UI/UX, Frontend or Test when the project grows, and hands it the work that is now its own.

**Ask the Lead:**

> /cb-add-role frontend

Without a role, the Lead shows the table and proposes the one that would help most now.

**Claude asks you:** once, after saying in two lines what moves to the new role: "Add Frontend?"

**Claude does:** creates the role's worktree and session (detached, filed in the project's group, on Sonnet low), moves its folders in `.claude/ownership.json` (Frontend takes the screens from the Dev; UI/UX takes `design/` and the tokens from the Lead; Test takes the cases and the regression from the Dev), turns on its plugins, and sends its first task. Open tasks keep their role; only new ones go to the new role.

**You check:** the two-line report: the new role, what it took over, its first task.

## Pause a role

Close its session. Its worktree, branch and open issues stay; the next session you open in that folder picks up from the issues ([chapter 6](06-continuity.md#1-restart-a-session)). The Lead stops sending it tasks while it is closed and tells you when one is waiting for it.

> **Token tip:** a role that is open but idle runs on Sonnet low and costs little. A role you do not need costs nothing, so start small and add.

Next: [Chapter 9: Token budget](09-token-budget.md).
