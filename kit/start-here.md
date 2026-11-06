# Start here: {{name}}

Any session can translate this file for you: ask it in your language. The book explains every step: https://github.com/liquizzz/crewbook-build/tree/main/docs/book

You run a team of Claude Code sessions. The Lead is your one contact: it understands what you want, proposes, and runs the others. Every proposal comes with a suggestion: approve it, change it in one message, or answer "you decide". You decide three times: the plan, each milestone, each release. The kit's commands start with `/cb-`; `/cb-help` lists them.

Done by `init`: the kit, branches `main`, `dev` and `staging`, GitHub repo {{repo}} with labels and a kanban board, and the Lead's folder `{{lead}}`.

**Where the code is:** `dev` holds the work in progress, `staging` what you try before a release, `main` the released versions.

## 1. Setup. Session: Lead

Open a new Claude Code session in `{{lead}}`, name it "{{name}} - Lead" and type `/cb-setup`. Write to it in your own language: the sessions talk to you in it. Setup asks five things, each with a default or a proposal:

1. **Roles.** The Lead and the Dev are always on; UI/UX, Frontend and Test are ticked by default. Untick what the project does not need: without UI/UX the Lead designs, without Frontend the Dev builds both layers, without Test the Dev tests and the Lead accepts.
2. **Autonomy.** What runs without you: sessions pass work to each other (on), the Lead merges by itself (all levels), a stuck task moves to a stronger model below Opus (on), Test checks each merged task (off).
3. **Requirements.** Describe the idea in your own words. The Lead discusses it briefly, then writes the first draft: the stories, the ones usually missing for this kind of product as suggestions, and the function tree (modules, screens, main actions).
4. **Deployment model and stack.** The Lead asks about scale once, then proposes three architectures with their stack and cost, one recommended. Pick one, ask for a change, or say "you decide".
5. **Environments.** The Lead proposes the databases, the build host and `staging`, reusing what already runs on your machine.

Then you approve **the plan** on one page, and the Lead creates every other session (Roles: {{roles}}).

**You do:** if the repo is public (CI on GitHub), open {{actions}} once and click **Enable Actions on this repository** if GitHub shows it. Open the board once (GitHub → your profile → Projects), choose View → Layout → Board, and click **Save**.

## 2. The build. Sessions: all

The Lead splits the milestone into tasks (`/cb-plan`) and sends each to its session. The sessions build, test at each task's level, review their own work and pass it on; the Lead merges. Each recap says what was sent and merged. You step in only when something waits for you: an alert (a task stuck, a model to raise), a change you asked for, a decision.

## 3. The milestone. Session: Lead

Type `/cb-release demo`. The Dev builds `staging`, the regression runs there, and the Lead gives you a link and 3 to 5 scenarios to try. Say "All pass" or what failed: **the milestone** approval.

## 4. The release. Session: Lead

Type `/cb-release`. The Lead shows the handover for the client and asks for **the release** approval; it then releases the accepted `staging` commit, and the tag builds the image `{{image}}`. Run it with `node scripts/run.mjs <version>` in `{{main}}`.

## Any time

| Need | Type or run |
|---|---|
| Every command, one line each | `/cb-help` |
| Where the project stands, sessions and models | `/cb-progress` (`report` adds the weekly numbers) |
| A change to what the product does | `/cb-change <what you want>` |
| Something does not work | `/cb-bug <what happened>` |
| A stronger model for a task | `/cb-model up`, or `/cb-redo` to do the last step again one level up |
| A second opinion on a PR | `/cb-review #<PR>` (Codex; needs the Codex plugin) |
| What runs without you | `/cb-auto`; `/cb-auto off` stops every automation at once |
| Another role later | `/cb-add-role <uiux\|frontend\|test>` |
| Databases and the build host | `/cb-env` |
| Put a version on a server | `/cb-deploy <env> <tag>` |
| A secret (an API key, a password) | `node scripts/set-secret.mjs <NAME>` in `{{main}}`; it is never shown and never goes in the chat |
| Restart after closing a session | Open a new session in the same folder; it knows its role and finds where it stopped |
