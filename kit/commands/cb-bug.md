---
description: Report something that does not work: the Lead turns it into a Defect with "Caused by", a level and a severity, and sends it to the right role (a severe one in production goes to the hotfix path)
argument-hint: "<what happened, in your own words>"
---

Bug: **$ARGUMENTS**. Any session takes it; only the Lead files it. In another session, end with the hand-off block for the Lead (prompt: `/cb-bug <the owner's words>`) and stop.

1. **Understand it** from the owner's words; ask once only what you cannot find yourself (at most three questions, each with a suggested answer): where (local, `dev`, `staging`, production), what they did, what they expected. Reproduce it when it is cheap (`superpowers:systematic-debugging`); a screenshot or a log is fine, never a secret.
2. **Find the cause in the history:** the area of the code, `git log` on those files, the merged PRs since it last worked. Name the task and the PR that brought it in ("Caused by"), or "unknown".
3. **File the Defect** (Defect form): severity (`sev:high` main function blocked, data loss, wrong money, security; `sev:medium` wrong with a workaround; `sev:low` cosmetic), environment, version, steps, expected and actual result, "Caused by", and the fix's own level (rule "Change level": set again by its risk, never copied from the task). A defect is never a reopened task.
4. **Send it:**
   - to the role that made the task (the Dev for the backend, Frontend for the screens), with a model picked again from the fix's level and signals (rule "Models");
   - found while testing a milestone: it goes in this milestone; otherwise it is sorted with the buffer (lead.md, Work 8);
   - `sev:high` in production: the hotfix path (rule "Ask the owner before" covers the release); tell the owner at once in one line.
5. Report in two lines: the Defect (link and title), its severity and level, who fixes it and when.
