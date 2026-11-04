# Appendix E: Standards map

**Purpose:** show which public standard or practice each part of Crewbook: Build follows, and what it leaves out on purpose.

Crewbook aims at software one owner can trust and maintain, with no lost documents and code that is easy to control. It follows each standard where that costs the owner no extra steps or choices; the rest is left out and listed below. Nothing here is a certification. Sessions never read this appendix, so it adds no tokens.

## What follows what

| Crewbook part | Standard or practice | Where |
|---|---|---|
| Phases 1-7 with gates G1-G6, approved by the owner | Stage-Gate (phase reviews in PMI and PRINCE2) | Chapter 3, `/cb-gate`, Appendix D |
| SRS with `FR-xxx` and `NFR-xxx` IDs, revision history, traceability matrix | ISO/IEC/IEEE 29148 (requirements), short form | `templates/srs.md` |
| NFR rows | ISO/IEC 25010 quality characteristics | SRS section 6 |
| Test strategy, exit criteria, product risks | ISO/IEC/IEEE 29119-3 (test plan), short form | `templates/test-strategy.md` |
| Stories with Given/When/Then acceptance, in the user's words | BDD; user stories from Scrum | `templates/user-story.md`, brief |
| ADRs with rejected options | Architecture Decision Records (Nygard) | `docs/tech/adr/` |
| Architecture diagrams | C4 model | `templates/c4.md` |
| CRs, change levels L0-L3, testing by level | Change management (ITIL), risk-based testing | Chapter 4, test strategy section 2 |
| Board columns, one task in progress per role | Kanban with a WIP limit of one | `scripts/setup-board.mjs`, kit `CLAUDE.md` |
| Commit format `type(module): summary (#n)` | Conventional Commits | kit `CLAUDE.md` |
| Version from issue labels | Semantic Versioning | `scripts/release.mjs` |
| Secrets only in `.env*`, secret check before each commit, secret scanning with push protection on public repos | OWASP secrets management | secret-check hook, `init.mjs` |
| CodeQL on every PR and push; Dependabot security fixes | NIST SSDF (SP 800-218): find and fix vulnerabilities | `.github/workflows/codeql.yml`, `.github/dependabot.yml` |
| SBOM and provenance attestation for each release image | NIST SSDF; SLSA build provenance | `.github/workflows/image-app.yml` |
| `docs/ai-log.md`: what the AI did, who asked, the human decision | Record keeping and human oversight in NIST AI RMF and ISO/IEC 42001, short form | kit `CLAUDE.md` |

## Left out on purpose

| Left out | Why | When to add it |
|---|---|---|
| A full security checklist (OWASP ASVS) for L3 changes | Adds review work to every L3 change | When the product has logins, payments or personal data |
| Delivery metrics (DORA) | Little signal with one owner and few releases | When releases are weekly or a team joins |
| Full ISO/IEC/IEEE 12207 process set (supply, maintenance, retirement) | Too heavy for one owner | Not planned |
| Formal test documents of 29119-3 (test design, test procedure specs) | Test cases in `docs/tech/test-cases/` and the tests themselves cover them | Regulated products |
| CodeQL, secret scanning and attestation on private repos | GitHub charges for them there | When the owner buys GitHub Code Security or Enterprise |

## What the owner does for this

No extra steps. `init` turns on Dependabot alerts and fixes, plus secret scanning on public repos; the Lead starts CodeQL at G3, once the stack is chosen; release tags build the SBOM and the attestation. The Lead retargets Dependabot's security PRs to `dev` and turns high or critical alerts into defects. To check a public release image yourself:
```
gh attestation verify oci://ghcr.io/<owner>/<repo>-app:v0.1.0 -R <owner>/<repo>
```
