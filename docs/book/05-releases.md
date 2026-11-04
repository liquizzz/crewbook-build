# Chapter 5: Releases

**Purpose:** ship each milestone as a numbered, approved version, and get back fast when something goes wrong.

**Version rules:**
- The kit computes the version for you, as `MAJOR.MINOR.PATCH`, from the labels of the milestone's closed issues: any `breaking` → MAJOR (from 1.0.0) · any `type:feature`/`type:change` → MINOR · only `type:fix` → PATCH.
- Before go-live versions are `0.x.y`. Every merge into `main` is a version.
- Breaking means something that works in production stops working the same way (data migration, changed API or core flow, different business result). A breaking change needs upgrade steps and a rollback plan in its spec.

**What a release gives you:** a git tag `vX.Y.Z` and a Docker image `ghcr.io/<owner>/<project>-app:vX.Y.Z`, built by the `image-app` workflow, with an SBOM (every library in the image) and, on public repos, a provenance attestation (a signed record of which workflow built the image from which commit) you can check with `gh attestation verify`. You run that image wherever you run the product. Before go-live the Lead suggests hosting options in the deployment notes (step 2); you choose one and run it.

## 1. Release a milestone

**What it does:** turns a finished milestone into an approved version with an updated changelog and SRS. It is tested once, on `staging`: the regression, then the acceptance against every story and CR; then you try it yourself. AI tests check what the SRS says; only you can confirm it is what the business needs. The release itself adds no tests: if it fails where it runs, it is rolled back (section 4).

**Ask the Lead:**
> /cb-release v1.4.0

For a demo (to a client, or just for you) without publishing, ask for `/cb-release demo`: the same checks on `staging` and your acceptance scenarios, then it stops before `main` and the tag.

**Claude asks you:** only if something is still open: unfinished issues (move them or wait?) or open medium defects (accept or fix first?).

**Claude does:**
- merges `dev` into `staging`, which builds the `:staging` image;
- asks for the regression on `staging` (Full: the Test session; Lite: Dev1): tests, eval and adversarial sets, and when the milestone changes data, the update and rollback scripts on the staging database;
- has every acceptance criterion of the milestone's stories and CRs tried on `staging` (Full: by the Test session, after its regression; Lite: by the Lead itself), with each result in the acceptance section of `docs/tech/test-reports/v1.4.0.md`, and a defect for each failure. A defect is fixed on `dev` and merged into `staging` again, and only the affected area and the main journeys are tested again;
- copies the results into section 1 of `docs/product/handover/v1.4.0.md` and sends you 3-5 of them as your scenarios, in plain steps ("Log in as a sales user → create an order with 2 items → total shows 1,250,000 VND") and the command to run the staging image: `node scripts/run.mjs staging` (or your own staging server).

**You do:** try each scenario, plus anything you know real users do. Reply per scenario: "1 ok, 2 ok, 3 wrong total when discount applied".

**Claude does:** turns each failure into a defect and fixes it the same way; when all pass:
- the Lead finishes the handover for the client ([template](../../templates/handover.md)): what is delivered, the changes in this version with who approved them and whether they are billed, what the client must prepare (server, accounts, a specialist for a large data migration), the risks you accepted, how to roll back, and a sign-off block. You send it;
- it runs `scripts/release.mjs` (version from labels; `CHANGELOG.md` and SRS Revision History updated), writes `docs/releases/v1.4.0.md` ([template](../../templates/release-checklist.md)) and sends the summary:
  > **v1.4.0** (from v1.3.2) · MINOR · CR-12, CR-15 · Fixed: #88, #91 · SRS §3.2, §5.1 · Regression on staging passed · Data: update and rollback tried · Acceptance passed (14/14) · Owner scenarios passed (5/5) · Handover: link · Codex: 3 findings, 2 fixed · Risks: … · Buffer used: 40 min of AI time → Approve / Reject

**You check:** the summary; reply Approve or Reject (with a reason). After Approve, the Lead merges exactly the accepted `staging` commit into `main` and pushes the tag, with no new tests; the `:v1.4.0` image is built and the Lead checks that it starts and answers its healthcheck. Deploy it when you choose. Then the Lead writes where things stand in the next milestone file and asks you to type `/clear` in its session, so the next milestone starts with a fresh context ([chapter 9](09-token-budget.md#start-fresh-contexts)).

**Claude asks before:** pushing `main`, pushing the tag, creating the GitHub release.

## 2. Go live (first production release)

**What it does:** marks the first live version, declares 1.0.0 and gives you what you need to deploy it.

**Ask the Lead:**
> We are ready to go live with `<version>`. Prepare the deployment notes.

**Claude asks you:** where it will run (if you do not know yet, it suggests two or three options that fit the stack and the budget), the go-live time, and who does the smoke test with you.

**Claude does:** creates the `production` branch from the chosen tag, which records what is live; writes `docs/tech/ops/deploy.md`: the hosting you chose, image tags, environment variables (names only), data migration and backup steps, the smoke test, and the rollback command; marks the next release as `1.0.0`.

**You do:** deploy the image with your own setup, run the smoke test and tell the Lead the result.

**Claude asks before:** pushing `production`.

## 3. Hotfix

**What it does:** fixes a serious production defect outside the milestone.

**Ask the Lead:**
> Production defect: `<what happens>`. Hotfix it.

**Claude asks you:** steps to reproduce, who is affected, severity (proposed), workaround if any.

**Claude does:** opens a `sev:high` defect; branches `hotfix/*` from `production`; a Dev fixes; Test (Lite: Dev1) checks the area and core scenarios on `staging`; prepares `vX.Y.(Z+1)`; after your approval merges into `production` and `main`, then back into `staging` and `dev`. The new tag builds a new image.

**You do:** deploy the hotfix image.

## 4. Roll back

**What it does:** puts the previous version back live in minutes, because every release is a separate image.

**Ask the Lead:**
> Production has a problem. Prepare a rollback to the previous version.

**Claude asks you:** confirm the target version (proposed: the last tag before the current one) and the reason.

**Claude does:** checks whether data changes in between can be undone (the release's rollback script, tried on the staging database before the release), gives you the exact command for your setup, e.g. `node scripts/run.mjs v1.3.2` on your machine, opens a `sev:high` defect for the fix, and records the rollback in `CHANGELOG.md`.

**You do:** run the rollback and confirm production works again.

**Claude asks before:** moving the `production` branch back (only if the old version will stay live for a long time).

> **Data changes:** the kit makes a migration lighter (a staging database, an update and a rollback script, both tried before the release), but it does not replace people. For a large or risky migration, have a database specialist review it; the handover lists it for the client.

> **Token tip:** run the regression once per milestone, on `staging`, and test only the affected area after a fix. Close the Test session when its report is written.

Next: [Chapter 6: Continuity](06-continuity.md).
