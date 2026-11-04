# Test strategy: <Project name>

Save as `docs/tech/test-strategy.md`. Written by the Lead, approved at G3. A short form of the test plan in ISO/IEC/IEEE 29119-3.

| Field | Value |
|---|---|
| SRS | `docs/tech/srs.md` |
| Status | Draft / Approved (G3) |
| Last updated | YYYY-MM-DD |

## 1. What must be true to release (exit criteria)
<The requirements and non-functional targets that decide a release (G5), in 3-5 bullets, with FR/NFR IDs.>

Product risks tested first: <the 2-3 things that would hurt most if wrong, with FR/NFR IDs>.

## 2. Testing by change level
Every task carries a change level, set by the Lead. Money, security, user data and deletes are always L3. When in doubt, use the higher level.

| Level | What changes | Dev before the PR | Test after merge into `dev` (only with `/cb-auto testing on`, Full) |
|---|---|---|---|
| L0 Display | Look, text, layout; `design/` only | Build, lint, local check | Covered by regression |
| L1 Setting | Defaults, names, configuration | + Unit tests for the change | Check the changed spot |
| L2 Module logic | Business logic in one module | + Unit tests; main scenario locally | Module scenarios |
| L3 Core | Shared code, data, auth, money, security, several modules | + Integration tests, edge cases | Core scenarios, related modules, part of regression |

**Regression** on `staging` once per milestone (Full: Test; Lite: Dev1), then the acceptance on `staging` (Full: Test; Lite: the Lead); after a fix, the affected area plus the main journeys; with data changes, the update and rollback scripts on the staging database. The release itself adds no tests: `main` is the accepted `staging` commit.

## 3. Test levels and tools
| Level | Scope | Tool | Data | Runs | Owner role |
|---|---|---|---|---|---|
| Unit | Functions and modules | <...> | Synthetic | Every commit, CI | Dev |
| Integration | Database, jobs, external calls | <...> | Synthetic rows in a local copy | L3 tasks, regression | Test (Lite: Dev1) |
| End-to-end | Main user journeys | <Playwright> | Seeded test data | Regression | Test (Lite: Dev1) |
| Load | p95 latency, error rate | <...> | Synthetic requests | Before go-live and on NFR changes | Test (Lite: Dev1) |
| Evaluation | Quality of AI output | `docs/tech/eval-plan.md` | Eval set | Every model or prompt change | Test (Lite: Dev1) |

## 4. Test cases and traceability
- Test cases live in `docs/tech/test-cases/`, one file per module, each case tagged with the FR IDs it covers.
- The SRS traceability matrix links every FR to its test cases.
- Repeated cases are automated over time and added to CI.

## 5. AI-written tests
- Tests are written from acceptance criteria and FR text, not from the current code.
- The Lead checks each new test for intent during review: does it check the behaviour the requirement describes?

## 6. Environments and test data
| Environment | Branch | Used for |
|---|---|---|
| Local | role branch | Dev and UI/UX checks (fixed port per role) |
| Dev | `dev` | CI after each merge; per-task checks with `/cb-auto testing on`; design preview |
| Staging | `staging` | Regression, data scripts, acceptance, owner scenarios, client demo |
| Production | `production` | Smoke test after deployment |

<How test data is created and cleaned up; no real personal data.>

## 7. Defects
Defects are GitHub issues from the Defect template, labelled `defect` and a severity.

| Severity | Definition | Blocks release? |
|---|---|---|
| `sev:high` | Main function blocked, data loss, wrong money, security | Yes; in production it is a hotfix |
| `sev:medium` | Function wrong, a workaround exists | Yes, unless the owner accepts it |
| `sev:low` | Cosmetic or minor annoyance | No |
