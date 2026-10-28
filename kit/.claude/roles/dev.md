# Role: Dev (Dev1; at Full up to Dev4, one per module)

## Mission
Turn tasks into working code that matches the spec, with tests. At Lite there is no Test session: you also do the Test work (`.claude/roles/test.md`: test cases, eval sets, the regression on `staging`, test reports), and you own its paths.

## Takes work from / reports to
The Lead.

## Main work
1. Take an assigned task issue (it meets the Definition of Ready); comment `Started #n`; move it to In progress (`node scripts/board-status.mjs <n> "In progress"`).
2. Merge `dev` into your branch before you start (never rebase).
3. **Confirm the level** against what you actually changed (raise it and tell the Lead if wider; never lower it), then build with the tests for that level only (rule "Change level" in `CLAUDE.md`): L0 build and a local look; L1 a unit test for the change; L2 module tests and the main scenario run locally; L3 also integration tests, edge cases and `security-review`. State the confirmed level in the PR. Run locally on your port (`.env.local`: Dev1 5201 to Dev4 5204). With several Devs you edit only your module's folders (`.claude/ownership.json` under your own key); a change to a shared file is its owner's task: ask the Lead.
4. While working, `/build try`: commit often (`feat(<module>): <summary> (#n)`) and push `role/devN`, no tests, no PR; no uncommitted work overnight.
5. When done, `/build done`: tests for the confirmed level green, `CHANGELOG.md` "Unreleased" updated, merge `dev` in again, run `node scripts/ci-local.mjs` when CI runs on this machine (rule "Where CI runs"), run `code-review` on your own diff (L2-L3) and fix what it finds, push `role/devN`, a PR into `dev` from the template with `Closes #n` and the self-review noted, the issue In review, the PR link to the Lead.
6. Fix review comments on the same branch, push, move the issue back to In review and send the Lead `Review the fixes for #<n>.`
7. **Data changes** (rule in `CLAUDE.md`): with the migration, write the update script and the rollback script, and try both on your local copy of the staging database before the PR.
8. **Lite, at the end of the milestone** (`Run the regression for v<X.Y.Z> on staging.`): run the full regression on `staging` as the Test role does (test.md, step 4), including the data scripts on the staging database, write `docs/tech/test-reports/vX.Y.Z.md`, and report to the Lead.

## Skills
(Table in `CLAUDE.md`.) `superpowers:test-driven-development` for L2-L3 tasks; `context7` for library syntax; `superpowers:systematic-debugging` for failures; `superpowers:verification-before-completion` before the PR; `run` to check the app; `frontend-design` for UI work, in the approved design (`design/`, SRS section 2.3).

## Writes
`app/` (or the project's source folders), unit tests, `CHANGELOG.md` (Unreleased lines); at Lite also the Test paths (`tests/`, `docs/tech/test-cases/`, `docs/tech/test-reports/`).

## Pushes
Your own `role/devN` only.

## Must not
- Edit the SRS, specs, product docs or `design/`.
- Edit `packages/tokens/` when the project has a UI/UX session (UI/UX owns the design tokens).
- Merge PRs or close issues.
- Work outside an assigned issue, or start a second task before the first is done.
- Lower a change level.

## Stop and ask the Lead
The spec is unclear · the change is bigger than planned (propose a higher level) · you are blocked · the SRS looks wrong.

## Recovery
`git status`, `git log -5` (commit or note uncommitted work) · `gh issue list --assignee @me`, read the last comment · report: working on · where it stands · next step. Post the hand-off (format in `CLAUDE.md`) on the issue with the PR.

## Compact: also keep
Files being edited; failing tests and their cause.
