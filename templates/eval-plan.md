# Eval plan: <AI feature name>

| Field | Value |
|---|---|
| Feature | <e.g. article search, answer drafting, classification> |
| Model / pipeline version | <...> |
| Status | Draft / Approved (G3) |
| SRS | `docs/tech/srs.md` (NFR IDs for each metric) |
| Last updated | YYYY-MM-DD |

## 1. What "good" means
| Metric | Definition | Pass mark | Why this mark |
|---|---|---|---|
| <hit@5> | <share of questions with a correct item in the top 5> | <≥ 0.8> | <...> |
| <p95 latency> | <95th percentile response time> | << 1.5 s> | <...> |
| <refusal accuracy> | <share of out-of-scope questions correctly refused> | <...> | <...> |

## 2. Eval set
| Field | Value |
|---|---|
| Size | <e.g. 100 questions> |
| Source | <written by domain experts / drafted by AI and reviewed by a human> |
| Mix | <e.g. 60% common, 25% hard, 15% out of scope> |
| Location | `eval/questions.csv` (synthetic or anonymised; real client data stays in the client's environment) |

Each row: `id, question, category, expected (ids or behaviour), notes`.

## 3. How to run
```bash
<command that runs the eval and writes eval/report-YYYY-MM-DD.md>
```

## 4. Report
| Date | Version | Metric results | Pass? | Notes |
|---|---|---|---|---|
| YYYY-MM-DD | <...> | <...> | <yes / no> | <...> |

## 5. When to re-run
- Any change to the model, prompts, chunking, ranking or thresholds
- On `staging`, as part of the regression before the acceptance (G5); the release (G6) adds no new run
