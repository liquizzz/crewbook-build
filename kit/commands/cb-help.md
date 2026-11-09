---
description: Every Crewbook command in one line each, in the owner's language, with the one that fits the project's stage first
---

List the kit's commands for the owner, in the owner's language (commands stay in English). Read the Stage line of `CLAUDE.md` and `.claude/project.json` (`setup`, `roles`) first, and put the one or two commands that fit where the project stands at the top, with one line why. Then the table, grouped, one line each; change nothing.

| Group | Command | What it does |
|---|---|---|
| Setup | `/cb-setup` | Ten steps from the idea to the plan approval (the roles and autonomy, requirements, stack, look and feel, GitHub, environments), then every worktree and session; run again, it goes on where it stopped |
| | `/cb-add-role <uiux\|frontend\|test>` | Adds a role later |
| | `/cb-help` | This list |
| Work | `/cb-plan [milestone]` | The Lead splits a milestone into tasks and sends them out |
| | `/cb-build try\|done [#n]` | A role builds a task: try it quickly, or finish it with its checks and a PR |
| | `/cb-change <request>` | A change to what the product does (a CR) or how it is built (an ADR) |
| | `/cb-bug <what happened>` | Something does not work: a Defect sent to the role that made it |
| Models | `/cb-model up\|<model> [effort]\|#n <model>\|mode <claude\|deepseek>` | A stronger model for a task, or the project's mode |
| | `/cb-redo [model]` | The last step again on a stronger model, the first result kept |
| Review and release | `/cb-review [#PR]` | A Codex second opinion on a PR |
| | `/cb-release demo` | The milestone on `staging` for you to try and approve |
| | `/cb-release` | The release approval, then `main`, the tag and the image |
| | `/cb-deploy <env> <tag>` | A version on a server (production: you, in a terminal) |
| Environments | `/cb-env [show\|setup\|reset\|backup\|restore]` | Databases, the build host, the registry, `staging` |
| Autonomy | `/cb-auto merge\|relay\|escalate\|testing ...`, `/cb-auto off` | What runs without you; `off` stops it all |
| | `/cb-send` | Sends the last hand-off when relay is off |
| Status | `/cb-progress [report]` | Where the project stands, each session and its model; `report` adds the weekly measures |
| Kit | `/cb-update` | The newest kit, through a PR you approve |
