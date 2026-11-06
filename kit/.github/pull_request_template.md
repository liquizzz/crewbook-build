## Link
Closes #

## Change
<!-- What changed, in a few lines -->

## Level and reach (confirmed against the files changed)
- [ ] L0 display (no logic, state or data)
- [ ] L1 setting or small logic (existing endpoints only)
- [ ] L2 module logic, or a change to the API contract
- [ ] L3 core · reach: one point / narrow / wide · places:
- Same as the task's? If wider, say why and tell the Lead:

## Checked (rule "Change level" in `CLAUDE.md`)
- [ ] `ci-local` PASS (or CI on GitHub green): branch `<sha>` + dev `<sha>`
- [ ] L0: looked at in the running app (style or layout changes only)
- [ ] L1: the affected action tried in the running app; a test when there is logic; a configuration value changed in every environment file
- [ ] L2: module tests and the main scenario run locally
- [ ] L3: tests by reach (one point: starts, healthcheck, one read and one write, the old value can be put back; narrow: the module and its public interface; wide: the modules that use it, edge cases)
- [ ] Self-review on commit `<sha>`: `code-review` (L2-L3) and `security-review` (L3, or any change to permissions, money, personal data or a secret); findings fixed: <how many>
- [ ] Only my role's folders, or a shared file my task owns

## Documents
- [ ] The SRS matches the behaviour (or no requirement changed)
- [ ] `CHANGELOG.md` "Unreleased" updated

## Screenshots (UI changes)

## L3 checklist (required for L3)
- [ ] No secrets or tokens in code, logs or commits
- [ ] Permissions correct; no access opened by accident
- [ ] Deletes and overwrites are confirmed or reversible
- [ ] Money and order logic checked at the edges
- [ ] Schema or data change: update and rollback scripts tried on a copy of the staging database
- [ ] A second opinion proposed? (`/cb-review` runs Codex; the owner decides)

## Hand-off
- Commit: `role/<role>` @ `<sha>`
- Decisions to keep:
- Left for later:
