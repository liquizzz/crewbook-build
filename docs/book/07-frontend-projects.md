# Chapter 7: Front-end projects

**Purpose:** show each design round (to you or a client) the same day, without exposing unfinished product code.

**Setup:** answer yes to init's question 5 (separate design prototype). Without it, the kit leaves out the design image, its workflow and its Dockerfile. The product still gets its design: the Lead's grey screen sketches at G1-G2, then at G3, in the solution design, 2-3 named directions applied to those sketches in `design/look-and-feel.html`; you pick one when you approve the solution design. The choice is recorded in SRS section 2.3.

**Layout:** one repo with a pnpm workspace (several packages in one repo, sharing one install): `design/` (UI/UX prototype), `packages/tokens/` (shared design tokens: colours, fonts and spacing as named values), `app/` (product code). Use a second repo only if an outside partner makes the design or the client must see the design repo.

**Images:** everything runs in Docker with one image per part, and each image is rebuilt only when its own folders change:

| Workflow | Builds when | Image tags |
|---|---|---|
| `ci` | Every PR, push to `dev` | (checks only: lint, type check, tests, build) |
| `image-design` | Push to `dev` that touches `design/`, `packages/tokens/` or `docker/design.Dockerfile`; tag `design-vN` | `:dev`, `:dev-<sha>`, `:design-vN` |
| `image-app` | Push to `dev` or `staging` that touches `app/`, `packages/tokens/`, `docker/app.Dockerfile` or the lockfile; tag `vX.Y.Z` | `:dev`, `:staging`, `:vX.Y.Z`, `:latest` |

A merge into `dev` that only changes `app/` does not rebuild the design image, so the client's demo stays as it was. Three rules keep it that way:
- The design build reads only `design/` and `packages/tokens/`. The Lead rejects a PR where `design/` imports from `app/`.
- `design/` pins its own dependency versions in its `package.json`, so a library upgrade for `app/` cannot change the next design build.
- Once the client approves a round, the demo runs the fixed tag `:design-vN` instead of `:dev`.

Where the client opens the demo (your server, a cloud service, a tunnel) and how the link is protected is your choice. Locally, `docker compose up design` serves it on port 8080. Local dev servers without Docker use fixed ports: UI/UX 5100 · Dev1 5201 · Dev2 5202 · Test 5300.

## 1. Run a design round

**What it does:** turns client needs into a clickable prototype the client can open.

**Ask the Lead:**
> Start a design round for `<screens or flow>`.

**Claude asks you:**
1. Which screens and states (empty, loading, error) are in this round?
2. Brand inputs: colours, fonts, logo, reference sites.
3. Devices to support first (mobile, desktop).
4. Who on the client side reviews, and by when?

**Claude does:** the Lead opens a Design issue and hands it to UI/UX (Lite: draws the screens itself); UI/UX builds the screens in `design/`, pushes and opens a PR; the Lead merges it through the fast lane (L0), which builds a new `:dev` design image, and tells you it is ready to view.

**You check:** the screens, before they go to the client.

## 2. Process client feedback

**Ask the Lead:**
> Client feedback on the design: `<paste or summarise>`.

**Claude asks you:** which comments to accept, defer or reject, when they conflict or change business rules (each with a proposal).

**Claude does:** records the feedback on the Design issue; UI/UX makes the next round; a feature added or cut becomes a CR with the client's approval.

## 3. Approve the design

**Ask the Lead:**
> The client approved the design.

**Claude does:** the Lead tags `design-vN`; UI/UX writes the hand-off for Dev (screens, states, tokens, behaviour); the Lead creates the build tasks in `app/` for the next milestone; the demo is switched to `:design-vN`.

**You check:** the build tasks in the next milestone.

> **Token tip:** collect the client's comments into one feedback message per round instead of forwarding them one by one; close the UI/UX session between rounds.

Next: [Chapter 8: Lite mode](08-lite-mode.md).
