---
description: Run the next foundation step ("Picture the project": G1 and G2, PO; "How we build it": G3, Lead) up to the owner's approval
argument-hint: [your idea in your own words]
---

Run the next foundation step of this Crewbook project. The owner's idea, if given: **$ARGUMENTS**

1. Read `.claude/project.json` (level, design, setup) and `.claude/role`. If setup is not done, say "Setup is not done: open "<Project> - Lead" and type /setup" and stop. Find the next step from the documents' Status fields:

| Next step | Session | The owner approves | Then you write, without the owner (templates in `docs/templates/`) |
|---|---|---|---|
| Picture the project (G1 and G2, one approval) | PO | `docs/product/proposal.md` (one page) and the screen sketches in `docs/product/screens/` | `docs/product/prd.md`, the stories, the functional part of `docs/tech/srs.md` (sections 1-3, one `FR-xxx` per requirement), data notes when data comes from an existing system |
| How we build it (G3) | Lead | `docs/tech/solution-design.md`, with the look and feel | the ADRs, the SRS baseline (NFR targets, traceability), milestone v0.1.0 and its tasks, Docker and CI (Full: also C4, test strategy, eval plan) |

   If this session is not the one the step needs, end with the hand-off block for that session (prompt: `/next`) and stop. Work under the gate's issues (label `gate`): move them to In progress, and name them in every commit. Follow "AI does the work; the owner decides" and "Plain language" in `CLAUDE.md`.

2. **Picture the project (PO).**
   a. No idea given yet: ask for it in one line ("Tell me your idea in your own words. Clear already? Describe it as fully as you like. Still vague? One line is enough: I will show you screens to react to."), then stop.
   b. **Two ways to start**, for every project. Judge from what the owner wrote; do not ask which one.
      - **A clear idea** (a full description, a document, an old system to replace): draft the proposal from it at once, then sketch the screens to confirm what it describes.
      - **A vague idea** (a line or two): sketch 2-3 main screens first, from the idea and the closest products you know, and show them; each reaction from the owner changes the screens and adds to the next ones. Write the proposal from what the screens show once the owner recognises the product in them.
   c. The proposal is one page in plain words (template `proposal.md`): why, for whom, the size (users, data, screens or functions, how long), what the first version does, what comes later and what is left out, how we will know it works, constraints (systems it must work with, a required platform, budget, deadline), time and budget. When the owner names a product to copy or beat, try it first (Skills table in `CLAUDE.md`). **An existing system** (a rewrite or a replacement): look at it first, its screens (the owner can log you in) and its code, and turn it into a map of its functions with keep / drop / redo for each, instead of asking what it should do. Check facts the owner gives when it is cheap.
      The screen sketches: one plain HTML page per main screen in `docs/product/screens/`, in the order of the main journey, linked to each other, with realistic example data and `index.html` listing them (Skills table: "Screen sketches"). A rewrite starts from the old screens. A product without screens gets the main flows as numbered steps with an example input and output for each.
   d. Ask the owner once, at most three questions, only about what you could not guess; each has your suggested answer. Mark every other guess ⚠️ in the proposal.
   e. Show the proposal and the screens (links, and the screens open in the browser), with the G1 checks from `.claude/commands/gate.md` and the approval form (step 5). On changes, update the draft and show only what changed.
   f. After "Approved": set the proposal's Status, then write the PRD, the stories (one per must-have; the acceptance criteria describe what the approved screens show), the SRS sections 1-3 and the data notes from what was approved, without asking again. Run `/gate G2`. If writing them raises a question that changes scope, ask the owner then; otherwise close G1 and G2, open the PR for the Lead, push.

3. **How we build it (Lead).**
   a. Read the proposal, the screens, the PRD, the SRS and, for a rewrite, the old system's code. Write `docs/tech/solution-design.md` (template `solution-design.md`), in plain words with diagrams:
      - in short: what we build, how, how big, and the main reason for the approach;
      - the system map: the modules (from the PRD's function list), the shared parts, what depends on what;
      - the architecture: a diagram, the stack, the framework or boilerplate, the design patterns, the shared services (sign-in, permissions, files, logging), with 2-3 options for each real choice, the one chosen and why;
      - the data: the main things the system keeps and how they relate; for an existing system, how the data moves over and how the old and new systems run side by side;
      - how one function is built from start to end, with a real example from this project, so every later function follows the same recipe;
      - the look and feel for a product with screens: 2-3 named directions applied to the main G2 screen in `design/look-and-feel.html` (Full: the UI/UX session does this; propose it, and on the owner's OK create its worktree from your own with `node scripts/new-role-worktree.mjs uiux` and hand it a design issue under G3; Lite: you do it);
      - the plan: milestones in the order the modules depend on each other, each estimated in AI time (rule "Estimates" in `CLAUDE.md`), v0.1.0 as the thinnest slice that works from start to end, the risks, and what the client must prepare.
      Before you show a stack, check that it installs on the owner's machine and that each outside service the product calls answers one live call with the key the owner will use.
   b. Ask the owner once, at most three questions (usually: which look, a stack choice that has no clear winner, what v0.1.0 holds), each with your suggested answer.
   c. Show the solution design and the look-and-feel page with the G3 checks that can already pass and the approval form (step 5).
   d. After "Approved", do the rest without the owner:
      - one ADR per real choice in the solution design, with the options left out;
      - install the stack once on the owner's machine; fit Docker, CI (`.github/workflows/ci.yml` and the same steps in `scripts/ci-steps.json`, rule "Where CI runs"), Dependabot (and on a public repo `gh variable set CODEQL_LANGUAGES` before you push) to it, so `docker compose up --build` starts the project. Keep the image small: a multi-stage build, then a static server (`nginx:alpine`, `caddy`) for a static app, or a `-slim` or `-alpine` runtime for an app with a back end, with layer caching in CI. Make the `app` healthcheck in `docker-compose.yml` work in that image (a `/health` route when there is a back end; `curl` or the runtime itself when the image has no `wget`), so `node scripts/run.mjs` knows when the app is up. Record in the ADR what each outside service's plan blocks (rate limits, missing features);
      - write `.claude/ownership.json` for the stack's folders (start from the defaults in `.claude/hooks/role-guard.cjs`; for example `backend/` and `widget/` for dev, `eval/` for test), so no Dev or Test is blocked on its first write;
      - for a product with screens, enable `frontend-design@claude-plugins-official` and `ui-ux-pro-max@ui-ux-pro-max-skill` in `.claude/settings.json`, run `node scripts/plugins.mjs`, and tell the owner to run `/reload-plugins`;
      - complete the SRS into the baseline (NFR targets, section 2.3 look and feel, traceability) (Full: also C4, test strategy, eval plan);
      - milestone v0.1.0 in `docs/product/milestones/`, its task issues in Ready (`node scripts/board-status.mjs <n> Ready`).
      Run `/gate G3`. Ask the owner again only when this work changes something they approved (cost, scope, a risk). Then close G3, merge into `dev`, push.

4. An item that waits for someone else (for example a table description from the client) may be approved later: give it an issue, a due date and the step that needs it.
5. Ask for approval in the fixed form (gate table, `For you` block with links, then the question). The `For you` block names what the owner reads (the proposal and the screens; the solution design and the look) and nothing else.
6. End with the next step as a hand-off block. After "Picture the project": the Lead (`/next`). After G3: propose the team the milestone needs (Lite: Dev1 is there; Full: Dev1, and Test at once to write the milestone's test cases while Dev1 builds, prompt `Write the test cases for v<X.Y.Z>.`); on the owner's OK create the worktrees from your own (`node scripts/new-role-worktree.mjs <role>`) and open each new session for the owner (rule "Opening sessions" in `CLAUDE.md`), or give its hand-off block, then `/build` in the Lead.
