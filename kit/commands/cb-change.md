---
description: Turn a request into a change: a CR (functional) or an ADR (technical), both by the Lead after G2
argument-hint: <what you want, in business terms>
---

The owner wants: **$ARGUMENTS**

1. Read `.claude/project.json` (level) and `.claude/role`. The Lead takes every change; in another session, end with the hand-off block for the Lead (prompt: `/cb-change <request>`) and stop. Before G2 the Lead folds the request into the proposal or the PRD instead.
2. Sort the request with the rule "Two kinds of change" in `CLAUDE.md`: does the client get something different (a feature added or cut, behaviour a user sees, scope, acceptance, date or price)? Unsure, or both: say how you would split it and ask the owner once. A defect in what was released goes through the Defect form instead (`type:fix`, `defect` and a severity).
3. **Technical:** write the ADR with rejected options, ask the owner when it touches cost or accepts a risk, align the SRS (L0), create the tasks, add what the client must prepare and any accepted risk to the milestone file, and report. Stop here.
4. **Functional:** follow "AI does the work; the owner decides" in `CLAUDE.md`: draft the CR from the request at once, ask only what you cannot find. The CR needs: who asked and how (email, chat, meeting) and when, what changes for the user, the scope before and after, how to check it is done, how urgent it is, and which version it goes in. Ask only for what the request does not say. Give the impact (AI time, date) yourself and ask the owner for the price and whether it is billed.
5. Open the CR issue (CR form) with testable acceptance and a proposed change level (money, security, personal data, deletes: always L3), and put it in Backlog (`node scripts/board-status.mjs <n> Backlog`). Record the client's approval on the issue (name, date, link to the message), or the owner's when there is no client; the owner also approves L2-L3 CRs. After the approval, move it to Approved, export it to `docs/product/cr/CR-<n>-<slug>.md`, add its row to `docs/product/changes.md`, update `docs/tech/srs.md` (FR/NFR, origin, Revision History "Unreleased", traceability) and, if needed, a spec in `docs/tech/spec/`, open one PR, merge it into `dev` and create the tasks in the milestone.
6. Report in a few lines, with links: the CR or ADR, its level, the SRS sections changed, the impact on date and price, and the next step as a hand-off block (prompt: `/cb-build try #<n>` for the Dev session).
