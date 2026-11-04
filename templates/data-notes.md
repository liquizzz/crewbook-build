# Data notes: <Project name>

| Field | Value |
|---|---|
| Source | <system and version, e.g. SQL Server 2019 copy restored on YYYY-MM-DD> |
| Where the copy lives | <client environment / local machine; never in git> |
| Access | <read-only login name> |
| Status | Draft / Approved (G2) |
| Owner | Lead |

> Counts and structure only. No real records, personal data or credentials in this file.

## Entities used by the product
| Entity (table) | Rows (approx.) | Key | Notes |
|---|---|---|---|
| <...> | <order of magnitude> | <...> | <...> |

## Field mapping
| Product field | Source table.column | Type | Rule / transformation | Edge cases found |
|---|---|---|---|---|
| <e.g. title> | <...> | <...> | <...> | <NULLs, encoding, HTML in text> |

## Statuses and lifecycle
| Value | Meaning (confirmed by) | Product behaviour |
|---|---|---|
| <...> | <...> | <shown / hidden / deleted> |

## Time and change tracking
- Time zone of stored dates: <...>
- How changes are detected: <modified date / rowversion / log>
- Deletes: <hard / soft, how to detect>

## Quality findings
| # | Finding | Impact | Decision |
|---|---|---|---|
| F1 | <...> | <...> | <...> |
