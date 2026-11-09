# Chapter 5: Milestones and releases

**Purpose:** try each milestone yourself before it ships, publish it as a numbered version only after your OK, and get back fast when something goes wrong.

← [Back: Chapter 4: The delivery loop](04-delivery-loop.md) · [Contents](../../README.md#the-book) · [Next: Chapter 6: Continuity](06-continuity.md) →

The next two checkpoints happen here: accept the milestone, then approve its release. Each comes with a `For you` block: what you are approving, a few things to try, and links to the checks and review results.

## 1. Try the milestone on staging

**What it does:** puts the finished milestone on `staging`, the test copy of the product with its own database, and lets you try it before anything is published.

**Ask the Lead:**

> /cb-release demo

**Claude asks you:** only when something is still open: unfinished tasks (move them to the next milestone, or wait?) or medium defects (accept, or fix first?).

**Claude does:**
- merges `dev` into `staging`; the Dev runs the full CI once on it and builds the `staging` images (with CI on your machine, here; with a staging server, there);
- starts `staging` with its own database, http cookies and the address people on your network open, from `docker-compose.staging.yml`, without printing a password;
- has the regression run on `staging` (Test, or the Dev without Test), with the update and rollback scripts on the staging database when the milestone changed data;
- has every acceptance criterion of the milestone's stories and CRs tried on `staging`, on desktop and at about 390 pixels wide, each result in `docs/tech/test-reports/<version>.md`, a defect for each failure;
- picks 3 to 5 of them as your scenarios, in plain steps: "Sign in as a member → create a task with a due date → it shows on the board under Today".

Before the link goes to anyone else: when the product makes its first sign-up the administrator, you create that account first. A `staging` on plain http stays on your local network.

**You check:** each scenario, plus anything you know real users do. Reply "All pass", or per scenario: "1 ok, 2 ok, 3 wrong total with a discount".

**Claude does:** turns each failure into a defect, fixes it on `dev`, puts it on `staging` again and tests the affected area and the main journeys again. When you say "All pass", the milestone is approved. `/cb-release demo` stops here, so you can show `staging` to a client before you publish.

## 2. Approve the release

**What it does:** publishes the accepted `staging` commit as a version, with a tag, a Docker image and a handover for the client.

**Ask the Lead:**

> /cb-release

**Claude does:**
- finishes the handover ([template](../../templates/handover.md)): what is delivered, the changes with who approved them and whether they are billed, what the client must prepare, the risks you accepted, how to roll back, a sign-off block;
- computes the version from the labels of the closed issues (`MAJOR.MINOR.PATCH`: a breaking change raises MAJOR from 1.0.0, a feature or change MINOR, fixes only PATCH; before go-live versions are `0.x.y`), updates `CHANGELOG.md` and the requirements' revision history, writes `docs/releases/<version>.md`;
- asks you, with the summary and the `For you` block:

> **v0.2.0** (from v0.1.0) · MINOR · CR-3, CR-5 · Fixed: #31, #34 · Regression on staging passed · Acceptance 14/14 · Your scenarios 5/5 · Data: update and rollback tried · Handover: link · Risks: … → Approve / Reject

**You check:** the summary. Reply "Approved", or "Reject" with a reason.

**Claude does,** after "Approved", with no new tests: merges exactly the accepted `staging` commit into `main`, pushes the tag and creates the GitHub release. The release image is the `staging` image tagged again when the files are the same, and built only when they differ; the Lead checks that it starts and answers its health check. Then it writes where things stand into the next milestone file and clears its own context.

**Claude asks before:** pushing `main`, pushing the tag, creating the GitHub release.

Run any version on your machine:

```bash
node scripts/run.mjs v0.2.0
```

## 3. Put it on a server

**What it does:** runs a version on a server that only pulls images; nothing is built there.

| Environment | Who | Command |
|---|---|---|
| `staging` | The Dev | `/cb-deploy staging <tag>`, or `node scripts/run.mjs staging` on this machine |
| production | You only, in a terminal | `node scripts/deploy.mjs production <tag> --owner` |

No session can run the production command: the guard stops it. After your release approval the Lead gives you the command, the tag and what to check after it. Before your first go-live, ask the Lead to "prepare the deployment notes": it suggests two or three places to run it that fit the stack and the budget, and writes `docs/tech/ops/deploy.md` with the image tags, the variable names (never their values), the backup and migration steps, the smoke test and the rollback command.

## Hotfix and rollback

**A severe defect in production:** `/cb-bug <what happens>`. The Lead files it as `sev:high`, tells you at once, and runs the hotfix path: the fix, a check of the affected area and the core scenarios on `staging`, a patch version after your OK.

**A release that misbehaves:** run the same deploy command with the previous tag. Every release is its own image, so going back takes minutes. Going back to an older image does not undo a change to the database: when the release changed data, the rollback script runs too, on production only with your OK. The release notes say which versions can go back by tag alone.

> **Data changes:** the kit makes a migration lighter (an update script and a rollback script, both tried on the staging database before the release). For a large or risky migration, the Lead tells you to have a database specialist review it, and the handover lists it for the client.

---

← [Back: Chapter 4: The delivery loop](04-delivery-loop.md) · [Contents](../../README.md#the-book) · [Next: Chapter 6: Continuity](06-continuity.md) →
