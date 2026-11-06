# Environments: <Project>

Save as `docs/tech/ops/environments.md`. Written by the Lead at setup (question 5, `/cb-env setup`); the Dev keeps it current. No passwords or connection strings here: they are secrets in each role's `.env.local`.

| Field | Value |
|---|---|
| Status | Draft / Ready (every database exists and a reset works) |
| Machine's hosts | `node scripts/hosts.mjs` |

## Servers

| What | Where | Shared with other projects |
|---|---|---|
| Database server | <engine version, host:port> | yes / no (a client's rule) |
| Build host | <this machine / ssh:user@host, path> | yes |
| Registry | <ghcr.io/owner / host:port> | yes |
| Staging | <this machine / ssh:user@host, url> | |
| Production | <the owner's: how it is reached, who deploys> | |

## Databases

| Database | Used by | Data | Login |
|---|---|---|---|
| `<project>_dev` | Dev | small, by scenario | `<project>_dev` |
| `<project>_frontend` | Frontend, through `api:dev-<sha>` | small, by scenario | `<project>_frontend` |
| `<project>_test` | Test, through the pinned images | small, by scenario | `<project>_test` |
| `<project>_ci_*` | `ci-local` (`CI_DB_NAME`) | what each test sets up | `<project>_ci` (create and drop) |
| `<project>_staging` | regression, acceptance, performance | anonymised, up to production's volume | `<project>_staging` |
| `<project>_source`, `<project>_migration` | a data migration only | anonymised sample; full volume only on staging | read-only / `<project>_migration` |

## Scenarios in the seed

At most 10,000 rows per table; every case the tests need, related rows kept together.

- <Scenario: what it contains and which test uses it.>

## Commands (`scripts/db-setup.*`)

| Command | Does |
|---|---|
| `create` | every database and login above |
| `migrate <db>` | the schema up to date |
| `seed <db> small\|full` | the scenarios, or the staging volume |
| `reset <db>` | drop, create, migrate, seed small |
| `backup` / `restore <file>` | staging; keeps the last three and the one before each release |

`devMigrate` in `.claude/project.json`: <the command that migrates `_frontend` after a dev build>.

## Last restore proved

<date, backup restored on a scratch database, result>
