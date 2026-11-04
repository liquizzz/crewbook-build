# Software Requirements Specification: <Project name>

Save as `docs/tech/srs.md`. Structure follows ISO/IEC/IEEE 29148 (software requirements), cut down to what one owner needs. The Lead writes sections 1-3 (the functional part: one `FR-xxx` per requirement, with its origin and acceptance) at G2, then adds the NFR targets, the architecture and the traceability at G3 and keeps the SRS current after that through CRs. Sections 1-3 are in plain words, like the PRD; the NFRs and the architecture may be technical but each section opens with a sentence anyone can read. Mandatory for every project. It always describes the system as it is now; every CR updates it before its tasks are assigned; its version equals the release version.

**Version:** 0.0.0 · **Status:** Functional draft (G2) / Baseline draft (G3) · **Last updated:** YYYY-MM-DD

## Revision history
Newest first. The `release` script adds the row for each release; the Lead adds CR rows under "Unreleased" while the milestone runs.

<!-- revision-history -->
| SRS version | Release | Date | CRs | Sections changed | Summary |
|---|---|---|---|---|---|
| Unreleased | n/a | n/a | <CR-12> | <§3.2> | <...> |
| 0.0.0 | n/a | YYYY-MM-DD | n/a | All | Baseline approved at G3 |

## 1. Introduction
### 1.1 Purpose and scope
<What the system is for and its boundaries. Link `docs/product/prd.md`.>

### 1.2 Definitions
| Term | Meaning |
|---|---|
| <...> | <...> |

### 1.3 References
- PRD: `docs/product/prd.md` · Data notes: `docs/product/data-notes.md` · ADRs: `docs/tech/adr/` · C4: `docs/tech/c4.md`

## 2. Overall description
### 2.1 Users and roles
| Role | Can do |
|---|---|
| <...> | <...> |

### 2.2 Operating environment
<Platforms, browsers, hosting, integrations.>

### 2.3 Look and feel
<Direction the owner picked in `design/look-and-feel.html`: style, palette (hex), fonts, layout; rejected directions in one line each. Skip if the product has no screens or has a design prototype.>

### 2.4 Constraints and assumptions
- <...>

## 3. Functional requirements
One subsection per module. Every requirement has a stable ID that is never reused, and its origin.

### 3.1 <Module name>
| ID | Requirement | Origin | Acceptance |
|---|---|---|---|
| FR-001 | The system shall <...> | <US-001, baseline> | <testable condition> |
| FR-002 | The system shall <...> | <CR-12, since v0.2.0> | <...> |

<Business rules, states and flows for this module, step by step.>

### 3.2 <Module name>
| ID | Requirement | Origin | Acceptance |
|---|---|---|---|
| FR-0NN | <...> | <...> | <...> |

## 4. Data
<Main entities, key fields, retention, deletion rules. Detailed schema in specs or code.>

## 5. External interfaces
| Interface | Direction | Contract | Requirement |
|---|---|---|---|
| <Broker API / CMS DB> | <in / out> | <link or summary> | <FR-0NN> |

## 6. Non-functional requirements
One row per quality characteristic of ISO/IEC 25010. Write `n/a` where it does not apply; do not ask the owner about those rows.

| ID | Characteristic | Requirement | How verified |
|---|---|---|---|
| NFR-001 | Performance | <p95 < 1.5 s on <...>> | <load test> |
| NFR-002 | Reliability (availability, backup, recovery) | <...> | <...> |
| NFR-003 | Security (auth, personal data, secrets) | <...> | <CodeQL, review of L3 changes> |
| NFR-004 | Usability and accessibility | <...> | <...> |
| NFR-005 | Compatibility (browsers, devices, integrations) | <...> | <...> |
| NFR-006 | Maintainability (tests, lint, module limits) | <...> | <CI> |
| NFR-007 | Portability (runs in Docker) | Runs from the release image with `docker compose up` | <release check> |
| NFR-008 | Safety | <n/a for most products> | <...> |
| NFR-009 | Cost (not in 25010) | <...> | <...> |

## 7. Removed requirements
Requirements are never deleted silently; they move here.

| ID | Removed in | By | Reason |
|---|---|---|---|
| <FR-0NN> | <vX.Y.Z> | <CR-n> | <...> |

## 8. Traceability matrix
| Requirement | CR | Issues | Test cases | Status |
|---|---|---|---|---|
| FR-001 | baseline | #<n> | `docs/tech/test-cases/<module>.md#TC-001` | Delivered v0.1.0 |
| FR-002 | CR-12 | #<n>, #<n> | <TC-0NN> | In progress |
