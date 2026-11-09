# Chapter 9: Token budget

**Purpose:** get the product built for a reasonable cost, and see every week where the tokens went.

## What a project costs: two real runs

| | An earlier trial (old kit) | The first trial of this kit |
|---|---|---|
| Product | A CMS rewrite | A small web app for team tasks |
| Models | Every role on Opus | A model per task: mostly Opus for the Lead and the Dev, mostly Sonnet for Frontend and Test, Haiku for the smallest tasks |
| Work | 96 tasks in 14 days | 21 tasks in 4 days, to `staging` |
| Cost at list prices | About $1,313, about $13.70 a task | About $102, about $4.90 a task |
| Your messages | About 400, about 4 a task | 26, about 1 a task |
| Defects found later | 10 | 0 so far (the milestone was not yet accepted) |

The prices are list prices: on a subscription they show where the usage goes, not a bill. The second run is smaller, so the cost per task compares better than the totals. Most of the saving came from three things in this chapter: the model per task, fresh contexts, and checks sized to the risk.

## The biggest costs, and what the kit does about them

| Cost | What the kit does |
|---|---|
| A strong model everywhere | Each task starts on the cheapest model its level allows and climbs one step only when it fails on the same reasoning ([chapter 2](02-the-team.md#4-models-per-task)) |
| A long session pays for its history on every call | Sessions are cleared when a phase ends: a Dev after each merged PR, the Lead after each big phase ([chapter 6](06-continuity.md#2-fresh-context-by-phase)) |
| Checking more than the risk needs | Checks by change level; the full regression once per milestone; reviews and CI reused while still valid |
| Building the same image twice | One image per set of files: a release tags the accepted `staging` image instead of building it again |
| Plugins in every session | Each role gets only its plugins: claude-mem for the Lead, Product Management for the Lead, the design plugins for UI/UX and Frontend ([Appendix B](appendix-b-kit.md#plugins)) |
| Many small questions | Setup asks three things in its first message; every session asks at most three questions at once, each with an answer you can accept |
| A session that keeps working by itself | No `/goal` or `/loop` unless you ask for one |

## Measuring

**What it does:** shows the tokens and an estimated cost per role, model, task and level, how often tasks pass the first time, how many times they climbed the ladder and why, your own messages, and the defects with the task that caused them.

**Ask the Lead,** once a week:

> /cb-progress report

**Claude does:** runs `node scripts/usage.mjs --days 7` and saves the tables to `docs/reports/<date>.md`, with three lines on what they say: the most expensive rows, the levels with the most fix rounds, and one change worth trying. When a row of the model table keeps costing fix rounds or defects, it proposes moving that row up; when one always passes first time, it proposes trying a cheaper model.

Your messages and the messages sessions send each other are counted apart. Not counted: model calls a plugin makes in the background, and sessions outside the project's folders.

**You check:** the three lines, and the proposal if there is one.

## Other models

**What it does:** runs the Dev, Frontend and Test on DeepSeek, with the Lead and UI/UX on Claude.

**Ask the Lead:**

> /cb-model mode deepseek

**Claude asks you:** the DeepSeek key first: `node scripts/set-secret.mjs DEEPSEEK_API_KEY` in a terminal. On a client project, the client's OK, since the code those roles see goes to DeepSeek.

**Claude does:** writes each role's provider; an L3 task, or one without all three signals, still goes to Claude. DeepSeek sessions start from a terminal with `claude` in their folder, because sessions opened from the desktop app always run Claude. In our replays DeepSeek passed the same tasks but needed more calls and more time than Sonnet, so the default stays `claude`.

## Habits that keep cost low

1. One prompt per step; let the session stop when the step is done.
2. Put what you know in your first message, and answer a session's questions in one reply.
3. Say "you decide" on what you do not care about.
4. Ask for a section, never a whole document: "read section 3.2 of the SRS".
5. Paste the error and a few lines around it, never a whole log.
6. Plan before you build: rework from an unclear request is the most expensive token there is.

> **Token tip:** when a milestone costs much more than the last one, ask the Lead why. The usual answers are a long session that was never cleared, a `/loop`, or rework from an unclear request.

Next: [Appendix A: Templates](appendix-a-templates.md).
