# PRD: <Product name>

| Field | Value |
|---|---|
| Owner | Lead |
| Status | Draft / In review / Approved (G2) |
| Approved on | YYYY-MM-DD (after this date every functional change is a CR; a technical one is an ADR) |
| Last updated | YYYY-MM-DD |
| Time box | <e.g. one weekend, 8 hours> |
| Proposal | `docs/product/proposal.md` |

Save as `docs/product/prd.md`. Written by the Lead after the owner approved the proposal and the screen sketches, from what they show, in plain words; the owner does not approve it again. Each must-have names its screen. The detailed, always-current requirements live in the SRS (`docs/tech/srs.md`).

## 1. Problem
<Who has the problem, what it is, and what it costs them today. 2-4 sentences.>

## 2. Users
| Persona | Goal | Pain today |
|---|---|---|
| <role> | <what they want to achieve> | <what gets in the way> |

## 3. Success metrics
| Metric | Target | How we measure |
|---|---|---|
| <e.g. time to create a quote> | <e.g. < 5 min> | <e.g. timestamp in app> |

## 4. Scope
### Must-have
1. <capability: one line, user-facing>

### Nice-to-have
- <capability>

### Non-goals
- <what we will deliberately not build, and why>

## 5. Key user journey
1. <step>
2. <step>

## 6. AI features
| Feature | Input → output | Human-in-the-loop | Failure handling |
|---|---|---|---|
| <e.g. classify issue> | <photo + text → category, confidence> | <dispatcher approves> | <low confidence → manual> |

## 7. Non-functional requirements
- Performance: <...>
- Security & privacy: <synthetic data only; auth model>
- Cost: <monthly cloud budget>
- Availability: <...>

## 8. Assumptions and open questions
| # | Assumption / question | Owner | Status |
|---|---|---|---|
| 1 | <...> | <...> | Open |

## 9. Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| <...> | L/M/H | L/M/H | <...> |

## 10. Release plan
Small milestones (a few days each); each one is planned in `docs/product/milestones/vX.Y.Z.md`.

| Version | Target | Must-haves / CRs |
|---|---|---|
| <v0.1.0> | <date> | <thin end-to-end slice of must-have 1> |
| <v1.0.0> | <date> | <go-live scope> |
