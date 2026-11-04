# Test report v<X.Y.Z>

Save as `docs/tech/test-reports/vX.Y.Z.md`. Written by Test (Lite: Dev1) for the regression on `staging` (G5), or for a hotfix check. The acceptance section is filled by Test (Lite: the Lead) after the regression passes.

| Field | Value |
|---|---|
| Build | `staging` @ <commit> |
| Date | YYYY-MM-DD |
| Kind | Full regression / Hotfix check / On request |
| Result | Pass / Fail |

## Summary
| Total | Passed | Failed | Blocked | Not run |
|---|---|---|---|---|
| <n> | <n> | <n> | <n> | <n> |

## By requirement
| Requirement | Test cases | Result | Defect |
|---|---|---|---|
| FR-001 | TC-001, TC-002 | Pass | n/a |
| FR-021 | TC-031 | Fail | #<n> (sev:medium) |

## Eval (AI features)
| Metric | Pass mark | Result |
|---|---|---|
| <hit@5> | <≥ 0.8> | <...> |

## Acceptance
Every acceptance criterion of the milestone's stories and CRs, tried on `staging` (desktop and about 390 px wide for a product with screens).

| Story or CR | Criterion | Result | Note |
|---|---|---|---|
| US-<n> / CR-<n> | Given … When … Then … | Pass / Fail (#defect) | <…> |

## Defects
| Issue | Severity | Status | Blocks release? |
|---|---|---|---|
| #<n> | sev:medium | Fixed in rc / Open | <...> |

## Notes
- <Environment problems, cases not run and why.>
