# Chapter 7: Configure and grow your Claude Code team

← [Back: Chapter 6: Design and frontend](06-design-and-frontend.md) · [Contents](../../README.md#read-the-guide) · [Next: Appendix A: Quick reference](appendix-a-quick-reference.md) →

**Purpose:** add or pause specialists as the project changes, and adjust what the team can do on its own. For initial role selection, use [the planning guide](02-plan-your-product.md#choose-the-roles).

## Who does the work of a role you leave out

| Left out | Its work goes to | What you give up |
|---|---|---|
| UI/UX | The Lead picks the look and feel and sketches the screens | Design rounds ahead of the code; a separate design link for a client |
| Frontend | The Dev builds both layers | Screens built at the same time as the backend |
| Test | The Dev runs the regression; the Lead tries every acceptance criterion | A session whose only job is to find what is broken |

## Add a role later

**What it does:** brings in UI/UX, Frontend or Test when the project grows, and hands it the work that is now its own.

**Ask the Lead:**

> /cb-add-role frontend

Without a role, the Lead shows the table and proposes the one that would help most now.

**Claude asks you:** once, after saying in two lines what moves to the new role: "Add Frontend?"

**Claude does:** creates the role's worktree and session (detached, filed in the project's group, on Sonnet low), moves its folders in `.claude/ownership.json` (Frontend takes the screens from the Dev; UI/UX takes `design/` and the tokens from the Lead; Test takes the cases and the regression from the Dev), turns on its plugins, and sends its first task. Open tasks keep their role; only new ones go to the new role.

**You check:** the two-line report: the new role, what it took over, its first task.

## Pause a role

Close its session. Its worktree, branch and open issues stay; the next session you open in that folder picks up from the issues ([chapter 5](05-continue-and-maintain.md#1-restart-a-session)). The Lead stops sending it tasks while it is closed and tells you when one is waiting for it.

## Adjust autonomy as the project changes

Use `/cb-auto` to inspect the project's shared switches. Set `/cb-auto merge` lower when you want to inspect more PRs, or use `/cb-auto off` to stop automatic merging, relaying, escalation and per-task testing together. See [the switch table](02-plan-your-product.md#autonomy-switches) for defaults and allowed values.

These settings keep the plan, milestone and release approvals in your hands. Sensitive actions and changes to a client's scope, date or price still wait for you.

## Change ownership or configuration

Ask the Lead when a role needs different folders or a project needs a kit adjustment. [Appendix B](appendix-b-kit.md#change-the-kit-for-one-project) explains ownership, hook changes and the approval needed to loosen a guard. It also holds the [model policy](appendix-b-kit.md#change-levels-models-and-checks), [environment configuration](appendix-b-kit.md#environments) and [plugin list](appendix-b-kit.md#plugins).

---

← [Back: Chapter 6: Design and frontend](06-design-and-frontend.md) · [Contents](../../README.md#read-the-guide) · [Next: Appendix A: Quick reference](appendix-a-quick-reference.md) →
