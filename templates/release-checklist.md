# Release v<X.Y.Z>: <Project>

Save as `docs/releases/vX.Y.Z.md`. Prepared by the Lead; the summary at the top is what the owner reads to approve.

## Release summary
> **v<X.Y.Z>** (from v<A.B.C>) · <MAJOR / MINOR / PATCH> · CRs: <CR-12, CR-15> · Defects fixed: <#88, #91> · SRS: <§3.2, §5.1> changed · Regression on `staging`: <passed> · Data changes: <none / update and rollback tried> · Acceptance: <passed n/n> · Owner scenarios: <passed n/n> · Handover: <link> · Extra review: <none / Codex: n findings, x fixed, y rejected> · Risks: <...> · Buffer used: <1 h of AI time>
>
> **Approve / Approve and deploy / Reject**

| Field | Value |
|---|---|
| Milestone | <vX.Y.Z> |
| Release approved | <YYYY-MM-DD, by the owner> |
| Deployment approved | <YYYY-MM-DD, by the owner / not yet (before 1.0.0)> |
| Breaking | <No / Yes: upgrade steps and rollback in `docs/tech/spec/CR-<n>-*.md`> |

## Before the release (Lead)
- [ ] Every milestone issue is Done or moved to the next milestone with a note
- [ ] `dev` merged into `staging`; regression passed on `staging` (`docs/tech/test-reports/vX.Y.Z.md`; Full: Test, Lite: Dev1); eval meets pass marks: <metric = value>
- [ ] Data changes: update and rollback scripts run on the staging database (<none / scripts and result>); a specialist reviewed a large or risky migration (<not needed / who>)
- [ ] Acceptance (Full: Test, Lite: Lead): every acceptance criterion passed on `staging` (`docs/tech/test-reports/vX.Y.Z.md`, copied into `docs/product/handover/vX.Y.Z.md` section 1)
- [ ] No open `sev:high` or `sev:medium` defects (or accepted by the owner: <#>)
- [ ] Owner acceptance: the owner tried each scenario on the `:staging` image (`node scripts/run.mjs staging`) and confirmed it
- [ ] Handover finished (`docs/product/handover/vX.Y.Z.md`): delivered, changes, what the client must prepare, accepted risks, how to roll back
- [ ] Nothing reached `staging` after the acceptance
- [ ] `release` script run: version computed from labels, `CHANGELOG.md` finalised, SRS version and Revision History updated
- [ ] Secret check passes; no credentials or client data in the repo or images

## Owner acceptance scenarios (picked by the Lead from the acceptance, tried by the owner on the staging image)
| # | Scenario (plain steps) | Expected | Owner result |
|---|---|---|---|
| 1 | <Log in as … → do … → see …> | <...> | <ok / problem: …> |
| 2 | <...> | <...> | <...> |

## Release (after the owner approves)
- [ ] The accepted `staging` commit merged into `main` (no new tests); tag `vX.Y.Z` pushed; GitHub release created from the changelog
- [ ] The tag's image built; `node scripts/run.mjs vX.Y.Z` starts it and it answers its healthcheck

## Deployment (done by the owner; from 1.0.0)
- [ ] Image `ghcr.io/<owner>/<project>-app:vX.Y.Z` built by `image-app`
- [ ] Owner deployed it with their own setup; `production` branch moved to tag `vX.Y.Z`
- [ ] Migrations applied
- [ ] Smoke test of the main journey passed
- [ ] Errors and monitoring checked for <30 min>

## Rollback (only if needed, owner approves)
- [ ] Owner ran the previous image <vA.B.C> (`node scripts/run.mjs vA.B.C`, or their own deployment); the rollback script run when the release changed data
- [ ] Defect `sev:high` opened; fix planned as hotfix <vX.Y.(Z+1)>
- [ ] Recorded in `CHANGELOG.md`

## After
- [ ] Handover sent to the client by the owner; sign-off recorded
- [ ] Milestone closed on GitHub; next milestone set as running
- [ ] Actual AI times copied into the milestone file and `docs/ai-log.md`; README status updated
