---
description: Where the project stands, from live GitHub and git state, in a few lines. "/cb-progress report" also saves it as a dated report.
argument-hint: [report]
---

Report where this project stands: **$ARGUMENTS**. Read only what you need and check live state; do not repeat an earlier report. It works in any session, also before setup.

1. Read `.claude/project.json` (level, setup), the Stage line and the Open decisions of `CLAUDE.md`. If `"setup": false`, say first: "Setup is not done: open "<Project> - Lead" and type /cb-setup. Every other step waits for it."
2. Check: `gh issue list --state open --limit 30` (gate issues first; `--label cr` for CRs waiting for the client's approval), the open milestone and its progress, `gh pr list`, `gh run list --limit 3`, the last tag (`git describe --tags --abbrev=0`).
3. Reply in at most 10 lines, each issue and PR as a link with its short title (rule "Links" in `CLAUDE.md`): stage and next gate or milestone · open decisions and the step that needs each · done since the last tag · in progress (issue, session) · blocked or waiting for the owner or the client (CRs without the client's approval) · CI state · the one next step, as a hand-off block (format in `CLAUDE.md`) when it is in another session.
4. Change nothing, unless the argument is `report`: then, in the Lead, also save the reply as `docs/reports/<YYYY-MM-DD>.md` (template `docs/templates/daily-report.md`, with the decisions you need from the owner), push your branch and give the link. In another session, say that the Lead saves reports.
