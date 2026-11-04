# Chapter 3: Foundation (phases 1-3)

**Purpose:** go from an idea to a project you can picture, then to a plan you can picture, before any product code is written. The AI does the work; you approve twice, both times in the Lead's session. Runs once per project.

| Phase | You approve | The AI then writes, without asking you again | Gate |
|---|---|---|---|
| 1-2 Picture the project (Lead) | `docs/product/proposal.md` (one page) and the screen sketches in `docs/product/screens/` | `docs/product/prd.md`, `stories/`, `data-notes.md` when data comes from an existing system, the functional part of `docs/tech/srs.md` | G1 and G2, one approval |
| 3 How we build it (Lead) | `docs/tech/solution-design.md` and the look and feel in `design/look-and-feel.html` | the ADRs (architecture decision records), the SRS baseline, C4 diagrams, test strategy and eval plan (Full), Docker and CI, milestone v0.1.0 and its tasks | G3 |

Rules: picture it before you build it · screens before requirements · the whole plan before the details · every document in plain words · no production code before G3 · the first milestone is one thin end-to-end slice. Each gate has its issue (label `gate`), and the gate's commits name it.

How every step works: you say what you want in your own words. The session drafts at once, asks you at most three questions together (each with its suggested answer), marks its other guesses ⚠️, and redoes the draft as often as you like. Redoing costs the AI minutes, so correcting a draft is faster than answering questions first. You approve once.

## 1. Picture the project (phases 1-2)

**What it does:** turns your idea into something you can see: a one-page proposal and sketches of the main screens.

**Ask the Lead:**
> /cb-next `<your idea>`

There are two ways to start, and the Lead follows the one your words show:
- **A clear idea.** Describe it as fully as you like, or point at a document or an old system to replace. The Lead writes the proposal at once, then sketches the screens to confirm it.
- **A vague idea.** One line is enough. The Lead sketches 2-3 main screens first, from your idea and the closest products it knows. You react ("this, not that, and also..."), it redraws, and the proposal follows from what the screens show.

If you name a product to copy or beat, the Lead tries it in the browser first. For an old system you are replacing, it reads its screens (you can log it in) and its code, and lists its functions with keep, drop or redo for each, instead of asking you what the new one should do.

**Claude asks you:** at most three questions, only about what it could not guess, each with a suggested answer.

**Claude does:** writes `docs/product/proposal.md` ([template](../../templates/proposal.md)): why, for whom, how big, what the first version does, what comes later and what is left out, how you will know it works, constraints, time and budget. Sketches the main screens in `docs/product/screens/`: plain grey pages you can click through, with realistic example data. A product without screens gets its main flows as numbered steps with examples.

**You check:** the proposal and the screens. Approve, or say what to change. After "Approved" the Lead writes the PRD, one story per must-have (with acceptance criteria that match the screens), the data notes and the functional part of the SRS (one `FR-xxx` per requirement), all in plain words. It asks you again only if writing them changes the scope.

From now on a feature added or cut is a CR with the client's approval, and a change in how it is built is an ADR ([chapter 4](04-delivery-loop.md)). Before G3 the Lead writes down where things stand and asks you to type `/clear` in its session, so G3 starts with a fresh context.

## 2. Pass a gate

**What it does:** confirms a phase is complete before the next starts. Works for G1-G6.

**Ask the Lead** (it owns every gate, G1-G6):
> Check G1 and tell me if it is ready for my approval.

**Claude does:** runs `/cb-gate G1` with the criteria for your level (Lite or Full), reports each criterion as pass / fail / unclear with evidence, and the smallest list of fixes. When the gate is ready, it adds a **For you** block in plain words: what the gate means for the product, one to three things to try or read yourself (each a link, with the expected result and an example of a wrong one), what you are confirming, and what tests, CI and review already prove, with links.

**You check:** try the items in the For you block. You judge whether the product does what you want; the evidence covers the technical part, so you do not have to judge an ADR or a test report yourself. Then reply "Approved" (or what is wrong). The session records the approval date and closes the gate's issue. An item that waits for someone outside the team, such as a table description from the client, can be approved later when it has an issue and a due date.

## 3. How we build it (phase 3)

**What it does:** shows you the whole plan in one document before any technical detail, so you picture how the project will be built and why.

**Ask the Lead:**
> /cb-next

**Claude asks you:** at most three questions, usually which look you prefer, a stack choice with no clear winner, and what v0.1.0 holds.

**Claude does:** writes `docs/tech/solution-design.md` ([template](../../templates/solution-design.md)), in plain words with diagrams:
- the system map: the modules, the parts every module shares, what depends on what;
- the architecture: the stack, the framework or boilerplate and the design patterns, each with the options left out and the reason for the choice; the stack is installed on your machine before it is proposed;
- the data, and for an old system how the data moves over and how both systems run side by side;
- how one real function is built from start to end, the recipe every later function follows;
- the look and feel: 2-3 named directions applied to the G2 screen sketches in `design/look-and-feel.html` (Full: the UI/UX session draws them; Lite: the Lead);
- the milestones in order, with their time in AI hours, the risks and what the client must prepare.

**You check:** the solution design and the look. Approve, or say what to change. Then the Lead does the rest without you: an ADR for each choice, Docker and CI, the SRS completed as version `0.0.0` ([template](../../templates/srs.md)) with NFR targets and traceability, at Full also C4 diagrams, the test strategy and the eval plan, and milestone `v0.1.0` with its tasks in Ready. It runs `/cb-gate G3` and asks you again only if that work changes something you approved. The Lead then proposes the sessions the milestone needs (Dev1; at Full also Test, which writes the test cases while Dev1 builds) and opens them when you agree. The delivery loop starts.

## The SRS, in short

- Describes the system as it is now; versioned with every release.
- Stable IDs (`FR-021`, `NFR-004`) never reused, each with its origin (`CR-12, since v1.4.0`); removed requirements move to a "Removed" table.
- Revision History and traceability matrix (requirement ↔ CR ↔ issue ↔ test).

To understand the product at any version, ask the Lead: "What does the system do about `<topic>`, and since which version?" It answers from the SRS.

> **Token tip:** put what you already know, and any material you have, in your first message; the session then drafts more and asks less. Compact the Lead if the foundation runs long; G3 starts with a fresh context anyway.

Next: [Chapter 4: The delivery loop](04-delivery-loop.md).
