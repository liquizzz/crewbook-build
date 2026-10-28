# Start here: {{name}}

Any session can translate this file for you: ask it in your language. The book explains every step: https://github.com/liquizzz/crewbook-build/tree/main/docs/book

Level: **Lite**. Three Claude Code sessions work like a small team you manage: PO (the problem and the requirements up to G2, then the acceptance on `staging` and the handover), Lead (from G3 your one contact: design, stack, tasks, every change, review, DevOps, release) and Dev1 (builds and tests). Each step is one command in one session. The AI does the work: you say what you want in your own words, it drafts at once, asks you at most three questions, and redoes the draft as often as you like until you approve. Say "later" for anything you have not decided and "suggest" when you want ideas. Type `/` in a session to see the kit's commands.

Done by `init`: the kit, branches `main`, `dev` and `staging`, GitHub repo {{repo}} with labels and a kanban board, and the Lead's folder `{{lead}}`. The Lead's setup creates the PO's and Dev1's folders.

**Where the code is:** `dev` holds the work in progress (every merged PR), `staging` the milestone being tested and shown to the client, and `main` the latest released version, so until v0.1.0 `main` holds just the kit. To read the code, open the `dev` branch on GitHub.

**Gates** are the points where a session stops and you approve before it goes on: G1 and G2 picturing the project (one approval), G3 how we build it, G4 built, G5 tested, G6 released. Each approval request shows the gate's checks, then a **For you** block: what the gate means, what to try yourself (with links, the expected result and an example of a wrong one), and what tests and CI already prove. Try those items before you say "Approved". The book explains any step in more depth (chapter links in parentheses).

**Hand-offs:** when work moves to another session, the report ends with the session to open and a prompt in its own box. Copy the box with its copy button and paste it into that session.

## 1. Setup ([ch. 1](https://github.com/liquizzz/crewbook-build/blob/main/docs/book/01-setup.md)). Session: Lead

**Open** the Lead: in Claude Code desktop, open a new session, choose the folder `{{lead}}`, name the session "{{name}} - Lead", and type `/setup`. Setup comes first: until it is done, the other sessions only tell you to finish it.

Setup asks you nothing: your idea comes next, the stack at G3.
**You do:** if the repo is new and public (CI on GitHub), open {{actions}} and click **Enable Actions on this repository** if GitHub shows it. Open the board once (GitHub → your profile → Projects), choose View → Layout → Board, and click **Save**.
**You get:** CLAUDE.md filled in, the G1-G3 gate issues (one GitHub issue per gate, where its work is tracked), milestone v0.1.0 (your first small release), the folders for PO `{{po}}` and Dev1 `{{dev1}}`, and the PO's session: the Lead asks "Open it for you?", and on yes it opens in the right folder with the right name (or you open it yourself and paste the Lead's prompt).

## 2. Picture the project: gates G1 and G2 ([ch. 3](https://github.com/liquizzz/crewbook-build/blob/main/docs/book/03-foundation.md)). Session: PO

The Lead opens the PO for you at the end of setup (or open a session in the folder `{{po}}`, name it "{{name}} - PO", and type `/next`). Tell it your idea in your own words, either way:
- **Clear idea:** describe it as fully as you like, or point at a document or an old system to replace. The PO writes a one-page proposal at once, then sketches the screens.
- **Vague idea:** one line is enough. The PO sketches 2-3 main screens first; you react ("this, not that, and also..."), it redraws, and the proposal follows from what the screens show.

**You check:** the one-page proposal (why, for whom, how big, what the first version does, time and budget) and the screen sketches in `docs/product/screens/` (grey, clickable, with example data). Approve, or say what to change: the PO redoes it as often as you want. After your approval it writes the PRD, the stories and the first part of the SRS from them without asking again. From now on you work with the Lead. You may close the PO session: the Lead opens it again for the acceptance on `staging` and the handover.

## 3. How we build it: gate G3 ([ch. 3](https://github.com/liquizzz/crewbook-build/blob/main/docs/book/03-foundation.md)). Session: Lead

Type `/next` in the Lead. It writes one solution design (`docs/tech/solution-design.md`), in plain words with diagrams, so you picture how the project will be built before any detail: the parts of the system, the architecture, the stack and patterns with the reason for each and the options left out, the data, how one function is built from start to end, the milestones with their time, the risks. For screens it shows 2-3 named looks applied to the PO's sketches in `design/look-and-feel.html`; you pick one.

**You check:** the solution design and the look. Approve, or say what to change. Then the Lead writes the details from it (ADRs, the SRS baseline, milestone v0.1.0 and its tasks) and sets up Docker and CI, without asking you again unless something you approved changes.

## 4. Build: gate G4 ([ch. 4](https://github.com/liquizzz/crewbook-build/blob/main/docs/book/04-delivery-loop.md)). Sessions: Dev1, then Lead

Type `/build` in the Lead: it assigns the v0.1.0 tasks and gives you the prompt for Dev1 (folder `{{dev1}}`, session "{{name}} - Dev1"). The Lead offers to open each session it needs (say yes, or open it yourself) and sends it its prompt, so you never type the Dev commands yourself. `/build try #<n>` shows you a task working quickly, and `/build done #<n>` adds its tests and sends it to the Lead, who reviews and merges it. By default the sessions pass these prompts to each other by themselves and the Lead merges every PR after its review and green CI; each recap says what was sent and merged, and gates and releases still wait for you. Nothing reaches `main` without `staging`. `/auto` shows the switches; `/auto relay off` and `/auto merge off` hand them back to you (then paste each prompt, or type `/send` in the session that gave it) ([ch. 2, section 5](https://github.com/liquizzz/crewbook-build/blob/main/docs/book/02-the-team.md#5-how-automatic-it-is)).

## 5. Release v0.1.0: gates G5-G6 ([ch. 5](https://github.com/liquizzz/crewbook-build/blob/main/docs/book/05-releases.md)). Sessions: Lead, Dev1, PO

Type `/release demo` to show it to someone without publishing, or `/release` to publish.

The Lead merges `dev` into `staging`; Dev1 runs the regression there, then the PO tries every acceptance criterion on `staging` (it is responsible for this test). A defect goes back to `dev` and returns to `staging`, where only the affected area is tested again. Then you try 3-5 of those scenarios yourself from the link or command the Lead gives you (`node scripts/run.mjs staging`; one at a narrow window when there are screens) and say "All pass" or what failed. The PO writes the handover for the client (`docs/product/handover/v0.1.0.md`: what is delivered, the changes and who approved them, what the client must prepare, the risks you accepted, how to roll back). When you approve, the Lead releases the accepted `staging` commit with no new tests; the tag builds the image `{{image}}:v0.1.0`. If it fails where it runs, the Lead rolls back to the previous version with your OK.

## 6. Run the release in Docker

In the folder `{{main}}`:
```
node scripts/run.mjs v0.1.0
```
It checks that Docker is running and port 3000 is free, downloads the release image (logging in to GitHub's registry for you when the repo is private), starts the app, waits until it answers and opens http://localhost:3000. `node scripts/run.mjs` alone runs the latest release, and `node scripts/run.mjs dev` the build being worked on. Stop it with `node scripts/run.mjs --stop`. If it asks for read access, run `gh auth refresh -s read:packages` once and try again.

## Any time

| Need | Type or run |
|---|---|
| Where the project stands, and what is still open | `/progress` (any session) · `/progress report` in the PO or the Lead saves it in `docs/reports/` |
| A change | Lead: `/change <what>`. A feature added or cut is a CR with its price and the client's approval, in `docs/product/changes.md`; a change in how it is built is an ADR |
| Send a hand-off prompt without switching | `/send` in the session that gave it |
| What runs without you | `/auto` (any session): `/auto relay on|off` (sessions pass prompts), `/auto merge on|off` (the Lead merges PRs) |
| Where CI runs | `node scripts/ci-mode.mjs`. A private repo runs CI on this machine (`node scripts/ci-local.mjs`), so it uses none of your GitHub Actions minutes; a public repo runs it on GitHub for free. `node scripts/ci-mode.mjs github` or `local` switches it |
| Is a gate ready? | `/gate <G1-G6>` |
| A secret (an API key, a password) | `node scripts/set-secret.mjs <NAME>` in `{{main}}`: paste the value when asked; it is not shown and never goes in the chat |
| Restart after closing a session | Open a new session in the same folder; it knows its role and finds where it stopped |
| Change the level | `node scripts/set-level.mjs full` in `{{lead}}`, then tell the Lead: "We moved to Full. Draft what this level still lacks." |
| Save tokens | `/compact` each session after each gate or milestone |
