---
description: Put a version on an environment's server (staging by the Dev; production by the owner only); a rollback is the previous tag
argument-hint: "<staging|production> <tag>"
---

Deploy: **$ARGUMENTS**.

- **staging** (the Dev, or the Lead through the Dev): `node scripts/deploy.mjs staging <tag>`. The server pulls the images of that tag from the registry and starts them; nothing is built there. Report the link and the tag in one line. Without a staging server (`node scripts/hosts.mjs` shows none, and no `"environments"` in `.claude/project.json`), staging runs here: `node scripts/run.mjs staging`.
- **production:** only the owner runs it, in a terminal: `node scripts/deploy.mjs production <tag> --owner`. A session never runs it (the role guard stops it); give the owner that command after the release approval, with the tag and what to check after it.
- **A rollback** is the same command with the previous tag. It does not undo a schema change: when the release changed data, the rollback script runs too (rule "Data changes"), and on production only with the owner's OK.
- A failed deploy: say so plainly, with the last lines; the previous version may still run. The Dev fixes it as an Infra task; the Lead decides a rollback.
