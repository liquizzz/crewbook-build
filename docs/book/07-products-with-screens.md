# Chapter 7: Products with screens

**Purpose:** choose how the product looks before it is built, design each milestone's screens ahead of the code, and show a client a design round the same day without exposing unfinished code.

← [Back: Chapter 6: Continuity](06-continuity.md) · [Contents](../../README.md#the-book) · [Next: Chapter 8: Small teams](08-small-teams.md) →

## How the work is split

| Role | Owns | Works on |
|---|---|---|
| UI/UX | `design/` (a clickable prototype), `packages/tokens/` (colours, fonts, spacing as named values) | The look and feel for the plan, then each milestone's screens, often one milestone ahead |
| Frontend | The screens in the product (`web/` or the UI folders inside the backend project) | The screens, against the API contract, or against a mock generated from it while the backend is still on its way |
| Dev | The backend and the API contract | The endpoints the screens call |

The API contract (an OpenAPI file the Dev owns) is the line between them. A task that needs both layers is two tasks: the backend first, then the screens. On `dev` the Dev never removes or changes a field a screen uses without an L2 task announced first.

Without UI/UX the Lead picks the look and feel; without Frontend the Dev builds the screens too ([chapter 8](08-small-teams.md)).

## 1. Pick the look and feel

**What it does:** settles the visual direction once, with the plan, so every screen after it looks like one product.

**Ask:** nothing; it is part of setup when the product has screens ([chapter 3](03-the-plan.md)).

**Claude does:** UI/UX (or the Lead) searches styles, palettes and font pairs that fit the product and its users, and shows 2 or 3 named directions side by side in `design/look-and-feel.html`, each applied to the main screen, at desktop and phone width.

**You check:** the page. Pick one by its name ("Direction B, calm"). Picking a direction is a choice, not the plan approval: the Lead puts it into the plan and asks for the approval on its own.

## 2. A design round

**What it does:** turns the next screens into a prototype you, or a client, can click through.

**Ask the Lead:**

> Start a design round for `<screens or flow>`.

**Claude asks you:** only what it cannot find: which states matter (empty, loading, error), the brand inputs (logo, colours, reference sites), the devices that come first, who reviews and by when.

**Claude does:** UI/UX builds every screen and state in `design/`, checks it at desktop and phone width, and opens a PR. The Lead merges it on the fast lane (L0); the design image is rebuilt only from `design/` and the tokens, so a change to the product code never changes what the client is looking at.

**You check:** the screens, before they go to the client. Locally `docker compose up design` serves them on port 8080.

## 3. Client feedback

**Ask the Lead:**

> Client feedback on the design: `<paste or summarise>`.

**Claude asks you:** which comments to accept, defer or reject when they conflict or change a business rule, each with a proposal.

**Claude does:** records the feedback on the Design issue; UI/UX makes the next round. A comment that adds or cuts a feature becomes a CR with the client's approval ([chapter 4](04-delivery-loop.md#4-a-change-to-what-the-product-does)).

## 4. The design is approved

**Ask the Lead:**

> The client approved the design.

**Claude does:** tags the round `design-vN`, so the client's link stays on that version; UI/UX writes the hand-off for Frontend (screens, states, tokens, behaviour); the Lead plans the screen tasks for the milestone.

**You check:** the screen tasks in the milestone.

## Plugins for this work

UI/UX and Frontend get `frontend-design`, and `ui-ux-pro-max` for the look-and-feel options, turned on by the Lead at setup when the product has screens; `figma` when the design lives in Figma ([Appendix B](appendix-b-kit.md#plugins)).

---

← [Back: Chapter 6: Continuity](06-continuity.md) · [Contents](../../README.md#the-book) · [Next: Chapter 8: Small teams](08-small-teams.md) →
