# Solution design: <Project name>

| Field | Value |
|---|---|
| Written by | Lead |
| Status | Draft / Approved with the plan |
| Approved on | YYYY-MM-DD |
| Based on | `docs/product/proposal.md`, `docs/product/screens/`, `docs/product/prd.md`, `docs/tech/srs.md` |

Save as `docs/tech/solution-design.md`. The whole plan on one document, so the owner pictures how the project will be built before any detail: the reason for each choice, and the options left out. Plain words, with diagrams; each technical term explained the first time. The owner approves it once; the ADRs, the SRS baseline and the tasks are written from it afterwards. After approval it changes only through an ADR (technical) or a CR (functional).

## In short
<Three lines anyone can read: what we build, how, how big, and the main reason for the approach.>

## 1. System map
<The modules, from the PRD's function list, and the shared parts every module uses (sign-in, permissions, files, logging). A diagram: which module depends on which.>

| Module | What it does | Depends on | Milestone |
|---|---|---|---|
| <...> | <...> | <...> | <v0.1.0> |

## 2. Architecture
<A diagram of the parts and how they talk: browser, app, API, database, outside services.>

| Choice | Options looked at | Chosen | Why |
|---|---|---|---|
| Platform and language | <A, B, C> | <...> | <...> |
| Framework or boilerplate | <...> | <...> | <...> |
| Design patterns | <...> | <...> | <...> |
| Database | <...> | <...> | <...> |
| Hosting and running | <...> | <...> | <...> |

Shared services: <how sign-in, permissions, files, logging and errors work once for every module.>

## 3. Data
<The main things the system keeps and how they relate (a simple diagram). What is kept, for how long, what may be deleted.>

For an existing system: <how the data moves over, how the old and new systems run side by side, how each function is switched over, how to go back if something fails.>

## 4. How one function is built
<One real function of this project from start to end, so every later function follows the same recipe: screen → API → rules and permissions → data (and the move from the old system) → tests → check on `staging` → switch on.>

## 5. Look and feel
<For a product with screens: the direction the owner picked in `design/look-and-feel.html` (2-3 directions applied to the main screen), in one line each for the ones left out.>

## 6. Plan
| Milestone | What it delivers | AI time | Owner's time | Outside waits |
|---|---|---|---|---|
| v0.1.0 | <the thinnest slice that works from start to end> | <...> | <...> | <...> |

## 7. Risks and what the client must prepare
| Risk or need | What we do about it |
|---|---|
| <...> | <...> |
