---
description: The environments: the machine's shared services and hosts, the project's databases, a reset from the seed, staging backups and restores
argument-hint: "[show | setup | reset <db> | backup | restore [file]]"
---

Environments: **$ARGUMENTS** (no argument: `show`). The Lead and the Dev run this (rule "Environments" in `CLAUDE.md`). Never print a password or a connection string; secrets go through `node scripts/set-secret.mjs` (the project) or `node scripts/hosts.mjs secret` (the shared services).

- **show:** `node scripts/hosts.mjs` (the build host, the registry, the database servers, staging, the shared services running) and `docs/tech/ops/environments.md` (the project's databases, who uses which, how to reset). Report in a few lines what is ready and what is missing.
- **setup** (the Lead at `/cb-setup` question 5, or later):
  1. Propose, reusing what this machine has: a database server per engine and version the stack needs (`node scripts/hosts.mjs shared up <service>` for one that is missing: one container per engine version for every project, never one per project); the build host and the registry (`hosts.mjs set build|registry`, or this machine and GHCR); `staging` (this machine, or a server: `hosts.mjs set staging`).
  2. The project's databases on that server, small data by scenario: `<project>_dev`, `<project>_frontend` and `<project>_test` (with those roles), `<project>_staging` (anonymised, up to the volume of production), and for a migration project `<project>_source` (read-only, anonymised) and `<project>_migration`. One login per role with rights on its own database only; a CI login that may create and drop `<project>_ci_*` databases; no AI login on production or on real data.
  3. A `db-setup` script in the project's stack (in `scripts/`): `create` (every database and login), `migrate`, `seed small|full`, `reset <db>`, `backup` and `restore` for staging (the last three backups and the one before each release are kept). Each role's connection string goes into its worktree's `.env.local` through `set-secret.mjs` (the owner types the passwords).
  4. `docs/tech/ops/environments.md` from the template. The plan is not approved until every database exists and a reset works.
- **reset <db>:** the project's `db-setup reset <db>` (drop, create, migrate, seed small). Never on `staging` without a backup first, never on production.
- **backup / restore:** the project's `db-setup backup` (staging; it keeps the last three and the pre-release one) and `restore <file>`; once a milestone, restore one backup on a scratch database to prove it works, and note it in the test report.
