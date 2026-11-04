# Handover: <Project name> vX.Y.Z

Save as `docs/product/handover/vX.Y.Z.md`. The Lead fills in section 1 from the acceptance on `staging` (Full: Test's results in the test report), and the rest after the owner's acceptance. The owner sends it to the client.

| Field | Value |
|---|---|
| Version | vX.Y.Z (image `ghcr.io/<owner>/<repo>-app:vX.Y.Z`) |
| Date | YYYY-MM-DD |
| Release notes | `docs/releases/vX.Y.Z.md` |

## 1. Acceptance check
Every acceptance criterion of the milestone's stories and CRs, tried on `staging` after the regression passed (and on a narrow window for a product with screens).

| Story or CR | Criterion | Result | Note |
|---|---|---|---|
| US-<n> / CR-<n> | Given … When … Then … | Pass / Fail (#defect) | <…> |

## 2. Delivered
- <US-n: what the user can do now, link>
- <CR-n: what changed, link>

## 3. Changes in this version
The rows of `docs/product/changes.md` released in this version.

| CR | What changed | Requested by | Client approval | Billed |
|---|---|---|---|---|
| CR-<n> | <…> | <name, date> | <name, date> | Yes / No |

## 4. What the client must prepare
From the milestone file: what the technical choices need from the client (server size, accounts, licences, data, DNS, a database specialist for a large migration).
- <…>

## 5. Accepted risks and open items
Risks the owner accepted for this version, and what is left for later, each with its issue.
- <…>

## 6. How to run it, and how to roll back
`node scripts/run.mjs vX.Y.Z` (Docker), or the client's own deployment from the image above. To roll back: run the previous version (`node scripts/run.mjs vA.B.C`); when this version changed data, run its rollback script first (<path, or "no data changes">).

## 7. Sign-off
| Role | Name | Date | Signature or link |
|---|---|---|---|
| Client | | | |
| Owner | | | |
