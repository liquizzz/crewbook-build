# Environments: <Project>

Save as `docs/tech/ops/environments.md`. Written by the Lead at setup (question 5, `/cb-env setup`); the Dev keeps it current. No passwords or connection strings here: they are secrets in the main checkout's `.env.local` (the admin stays there) and each role's `.env.local` (its own URLs).

| Field | Value |
|---|---|
| Status | Draft / Ready (every database exists and a reset works) |
| Database | PostgreSQL / SQL Server · local (this project's own Docker) / existing (the owner's server) |
| Cache | Redis / none · local / existing |
| Project accounts | <name> (one account per service for the whole project) |
| Machine's hosts | `node scripts/hosts.mjs` |

## Servers

| What | Where | Shared with other projects |
|---|---|---|
| Database server | <engine version, host:port as the app reaches it> | local: this project only; existing: owned by <who> |
| Cache server | <Redis version, host:port> | local: this project only; existing: owned by <who>; keys `<project>:*` |
| Build host | <this machine / ssh:user@host, path> | yes |
| Registry | <ghcr.io/owner / host:port> | yes |
| Staging | <this machine / ssh:user@host, url> | |
| Production | <the owner's: how it is reached, who deploys> | |

## Databases

| Database | Used by | Data |
|---|---|---|
| `<project>_dev` | Dev | small, by scenario |
| `<project>_frontend` | Frontend, through `api:dev-<sha>` | small, by scenario |
| `<project>_test` | Test, through the pinned images | small, by scenario |
| `<project>_ci_*` | `ci-local` (`CI_DB_NAME`), created and dropped per run | what each test sets up |
| `<project>_staging` | regression, acceptance, performance | anonymised, up to production's volume |
| `<project>_source`, `<project>_migration` | a data migration only | anonymised sample; full volume only on staging |

Every database is owned by the project account; each role's `DATABASE_URL` points at its own database.

## Where it was checked

| Place | Checked |
|---|---|
| This machine | <date> (`db-setup.mjs check`) |
| The app's containers | <date / pending> |
| Build host | <date / pending> |
| Staging server | <date / pending> |

## Scenarios in the seed

At most 10,000 rows per table; every case the tests need, related rows kept together.

- <Scenario: what it contains and which test uses it.>

## Commands (`node scripts/db-setup.mjs`)

| Command | Does |
|---|---|
| `local` | the database and the cache in this project's own Docker (the default) |
| `connect database` / `connect cache` | a server the owner already has, by the owner in a terminal |
| `create` | every database above, owned by the project account |
| `check` / `reset-check` | the account opens each database / a reset works on a scratch database |
| `migrate <db>` | the schema up to date |
| `seed <db> small\|full` | the scenarios, or the staging volume |
| `reset <db>` | drop, create, migrate, seed small |
| `backup` / `restore <file>` | staging; keeps the last three and the one before each release |

`devMigrate` in `.claude/project.json`: <the command that migrates `_frontend` after a dev build>.

## Last restore proved

<date, backup restored on a scratch database, result>
