# Start here: {{name}}

Any session can translate this file for you: ask it in your language. The book explains every step: https://github.com/liquizzz/crewbook-build/tree/main/docs/book

Level: **Full process**. You manage a team of Claude Code sessions: the PO answers to the client: you give it the problem and the requirements up to G2, and it comes back for the acceptance on `staging` and the handover. From G3 the Lead is your one contact: it runs the team (UI/UX, Dev, Test, DevOps), takes every change and releases. Each step is one command in one session. The AI does the work: you say what you want in your own words, it drafts at once, asks you at most three questions, and redoes the draft as often as you like until you approve. Say "later" for anything you have not decided and "suggest" when you want ideas. Type `/` in a session to see the kit's commands.

Done by `init`: the kit, branches `main`, `dev` and `staging`, GitHub repo {{repo}} with labels and a kanban board, and the Lead's folder `{{lead}}`. The Lead creates every other session's folder when it is needed.

**Where the code is:** `dev` holds the work in progress (every merged PR), `staging` the demo for the client, and `main` the latest released version, so until v0.1.0 `main` holds just the kit. To read the code, open the `dev` branch on GitHub.

**Gates** are the points where a session stops and you approve before it goes on: G1 and G2 picturing the project (one approval), G3 how we build it, G4 built, G5 tested and accepted on `staging`, G6 released. Each approval request shows the gate's checks, then a **For you** block: what the gate means, what to try yourself (with links, the expected result and an example of a wrong one), and what tests and CI already prove. Try those items before you say "Approved". Appendix D of the book lists every step with its check: https://github.com/liquizzz/crewbook-build/blob/main/docs/book/appendix-d-checklist.md

**Hand-offs:** when work moves to another session, the report ends with the session to open and a prompt in its own box. Copy the box with its copy button and paste it into that session.

## 1. Setup ([ch. 1](https://github.com/liquizzz/crewbook-build/blob/main/docs/book/01-setup.md)). Session: Lead

**Open** the Lead: in Claude Code desktop, open a new session, choose the folder `{{lead}}`, name the session "{{name}} - Lead", and type `/setup`. Setup comes first: the Lead finishes it before anyone else works, opens the gate issues (one GitHub issue per gate, where its work is tracked) and milestone v0.1.0 (your first small release), then creates the PO's folder `{{po}}` and offers to open the PO's session for you, in the right folder with the right name (or you open it yourself and paste its prompt). Setup asks you nothing: your idea comes next, the stack at G3.

**You do:** if the repo is new and public (CI on GitHub), open {{actions}} and click **Enable Actions on this repository** if GitHub shows it. Open the board once (GitHub → your profile → Projects), choose View → Layout → Board, and click **Save**.

## 2. Picture the project: gates G1 and G2 ([ch. 3](https://github.com/liquizzz/crewbook-build/blob/main/docs/book/03-foundation.md)). Session: PO

The Lead opens the PO for you at the end of setup (or open a session in the folder `{{po}}`, name it "{{name}} - PO", and type `/next`). Tell it your idea in your own words, either way:
- **Clear idea:** describe it as fully as you like, or point at a document or an old system to replace. The PO writes a one-page proposal at once, then sketches the screens.
- **Vague idea:** one line is enough. The PO sketches 2-3 main screens first; you react ("this, not that, and also..."), it redraws, and the proposal follows from what the screens show.

**You check:** the one-page proposal (why, for whom, how big, what the first version does, time and budget) and the screen sketches in `docs/product/screens/` (grey, clickable, with example data). Approve, or say what to change: the PO redoes it as often as you want. After your approval it writes the PRD, the stories and the first part of the SRS from them without asking again. From now on you work with the Lead. You may close the PO session: the Lead opens it again for the acceptance on `staging` and the handover.

## 3. How we build it: gate G3 ([ch. 3](https://github.com/liquizzz/crewbook-build/blob/main/docs/book/03-foundation.md)). Session: Lead, with UI/UX

Type `/next` in the Lead. It writes one solution design (`docs/tech/solution-design.md`), in plain words with diagrams, so you picture how the project will be built before any detail: the parts of the system, the architecture, the stack and patterns with the reason for each and the options left out, the data, how one function is built from start to end, the milestones with their time, the risks. For screens the Lead opens the UI/UX session, which shows 2-3 named looks applied to the PO's sketches in `design/look-and-feel.html`; you pick one.

**You check:** the solution design and the look. Approve, or say what to change. Then the Lead writes the details from it (ADRs, the SRS baseline, test strategy, milestone v0.1.0 and its tasks) and sets up Docker and CI, without asking you again unless something you approved changes.

## 4. The team and the build: gate G4 ([ch. 2](https://github.com/liquizzz/crewbook-build/blob/main/docs/book/02-the-team.md), [ch. 4](https://github.com/liquizzz/crewbook-build/blob/main/docs/book/04-delivery-loop.md)). Session: Lead

When G3 is approved, the Lead proposes the sessions the milestone needs (usually Dev1, and Test, which writes the test cases while Dev1 builds and runs the regression at the end), creates their folders and opens their sessions when you agree. One Dev is enough for most milestones. When the milestone has modules that do not touch each other, the Lead can run up to four Devs (`dev1` to `dev4`), one per module; each reviews its own PR with `code-review` before the Lead does, and a file every module uses has one owner. Then `/build` in the Lead assigns the tasks. The Lead offers to open each session it needs (say yes, or open it yourself) and sends it its prompt, so you never type the Dev commands yourself. `/build try #<n>` shows you a task working quickly, and `/build done #<n>` adds its tests and sends it to the Lead, who merges it. The receiving session comments `Started #n` on the issue. When the Lead asks for changes the card goes back to In progress. Anything in In review is waiting for the Lead or for your merge. When every task of the milestone is merged with green CI, the milestone is built (G4). Each task is checked once, at the end of the milestone; `/auto testing on` also has Test check each L1-L3 task right after its merge (it waits in Testing until then). By default the sessions pass these prompts to each other by themselves and the Lead merges every PR after its review and green CI; each recap says what was sent and merged, and gates and releases still wait for you. Nothing reaches `main` without `staging`. `/auto` shows the switches; `/auto relay off` and `/auto merge off` hand them back to you (then paste each prompt, or type `/send` in the session that gave it) ([ch. 2, section 5](https://github.com/liquizzz/crewbook-build/blob/main/docs/book/02-the-team.md#5-how-automatic-it-is)).

## 5. Every day ([ch. 4](https://github.com/liquizzz/crewbook-build/blob/main/docs/book/04-delivery-loop.md)). Session: Lead

`/change <what>` for any change: a feature added or cut becomes a CR with who asked, the impact on date and price and the client's approval, in `docs/product/changes.md`; a change in how it is built (a library, a provider, the test approach) becomes an ADR · `/progress` any time to see where things stand; `/progress report` in the PO or the Lead also saves it in `docs/reports/`.

## 6. Release: gates G5-G6 ([ch. 5](https://github.com/liquizzz/crewbook-build/blob/main/docs/book/05-releases.md)). Sessions: Lead, Test, PO

Type `/release demo` to show it to a client without publishing, or `/release` to publish.

The Lead merges `dev` into `staging`; the Test session runs the regression there, then the PO tries every acceptance criterion on `staging` (it is responsible for this test). A defect goes back to `dev` and returns to `staging`, where only the affected area is tested again. Then you try 3-5 of those scenarios yourself from the link or command the Lead gives you (`node scripts/run.mjs staging`; one at a narrow window when there are screens) and say "All pass" or what failed. The PO writes the handover for the client (`docs/product/handover/v0.1.0.md`: what is delivered, the changes and who approved them, what the client must prepare, the risks you accepted, how to roll back). When you approve, the Lead releases the accepted `staging` commit with no new tests; the tag builds the image `{{image}}:v0.1.0`. If it fails where it runs, the Lead rolls back to the previous version with your OK.

## 7. Run the release in Docker

In the folder `{{main}}`:
```
node scripts/run.mjs v0.1.0
```
It checks that Docker is running and port 3000 is free, downloads the release image (logging in to GitHub's registry for you when the repo is private), starts the app, waits until it answers and opens http://localhost:3000. `node scripts/run.mjs` alone runs the latest release, and `node scripts/run.mjs dev` the build being worked on. Stop it with `node scripts/run.mjs --stop`. If it asks for read access, run `gh auth refresh -s read:packages` once and try again.

## Any time

| Need | Type or run |
|---|---|
| Where the project stands | `/progress` (any session) |
| Send a hand-off prompt without switching | `/send` in the session that gave it |
| What runs without you | `/auto` (any session): `/auto relay on|off` (sessions pass prompts), `/auto merge on|off` (the Lead merges PRs), `/auto testing on|off` (Test checks each task after its merge; off by default) |
| Where CI runs | `node scripts/ci-mode.mjs`. A private repo runs CI on this machine (`node scripts/ci-local.mjs`), so it uses none of your GitHub Actions minutes; a public repo runs it on GitHub for free. `node scripts/ci-mode.mjs github` or `local` switches it |
| Is a gate ready? | `/gate <G1-G6>` |
| A secret (an API key, a password) | `node scripts/set-secret.mjs <NAME>` in `{{main}}`: paste the value when asked; it is not shown and never goes in the chat |
| Restart after closing a session | Open a new session in the same folder; it knows its role and finds where it stopped |
| Fewer roles | `node scripts/set-level.mjs lite` in `{{lead}}`. Documents and history stay. |
| No step skipped | Book Appendix D, the process checklist: https://github.com/liquizzz/crewbook-build/blob/main/docs/book/appendix-d-checklist.md |
