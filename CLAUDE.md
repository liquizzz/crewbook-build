If the parent workspace has its own `CLAUDE.md` (`../CLAUDE.md`), read it first.

# crewbook-build

A public book and kit for building real products with Claude Code: one owner and a team of role sessions.

- Everything in this repo is written in English.
- `docs/book/` is the book. Each chapter opens with a one-line **Purpose**, then tasks written as **What it does / Ask / Claude asks you / Claude does / You check / Claude asks before**. Prompts are what the reader says to a session; keep them short and let the "ask first, then finish" rule in `kit/CLAUDE.md` fill the gaps. Keep chapters concise: purpose and usage, no long explanations.
- `templates/` holds copy-ready documents. Keep placeholders in `<angle brackets>`. Refer to project files as code paths (`docs/tech/srs.md`), not links.
- `kit/` holds what `kit/init.mjs` installs into a project: `CLAUDE.md`, `.claude/` (roles, `role-guard` hook, settings), `.github/`, `scripts/`, `/cb-gate`, the secret-check hook.
- Tests: `node kit/init.test.mjs` after changing `kit/init.mjs`, `kit/start-here/` or the level scripts; `node kit/.claude/hooks/role-guard.test.cjs` after changing the hook; `node kit/scripts/release.test.mjs` after changing the release script; `node kit/scripts/run.test.mjs` after changing `run.mjs` or its helpers in `project-level.mjs`; `node kit/hooks/pre-commit.test.mjs` after changing `kit/hooks/pre-commit`; `node kit/update.test.mjs` after changing `kit/update.mjs` or what init installs; run `kit/init.mjs` on a temporary folder after changing what it installs.
- Phase numbers (1–7), gate IDs (G1–G6), role names, branch names, label names and change levels (L0–L3) must match across the book, templates and kit.
- `docs/spec/` is the playbook's own specification: `srs.md` (what the kit and the book must do, FR/NFR IDs, traceability to kit files and tests) and `decisions.md` (DEC log with reasons and rejected options). When a change alters the kit's behaviour or the book's process, record the decision in `decisions.md` and update `srs.md` (requirement rows, Removed, Revision history) in the same commit. A decision that is still open goes under Open decisions there.
- `docs/examples/` holds worked examples. Clients are named "the client"; no client names, domains or internal numbers.
- Licenses: docs and templates are CC BY 4.0 (`LICENSE`); everything in `kit/` is MIT (`kit/LICENSE`). New code files in `kit/` start with the `SPDX-License-Identifier: MIT` line and the credit line (after the shebang, if any).
- Run the humanizer skill on every prose change (book, README, HOW-TO-RUN, templates, kit role files and START-HERE) before committing: no em or en dashes, no "not X but Y", no decorative bold, no one-line closers. Keep code, commands, paths and the fixed task labels unchanged.
- Log every task in `docs/ai-log.md` (what was done); decisions go in `docs/spec/decisions.md` (what was decided and why).
- No real client data or internal numbers from any employer or client.
- Commit/push only when the user asks.
