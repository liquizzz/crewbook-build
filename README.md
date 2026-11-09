# Crewbook Build for Claude

Build with Claude Code. Lead the team.

You already build with Claude Code. Crewbook gives that work a team: a Lead to turn the idea into a plan, a Dev to build the application, and Frontend, UI/UX and Test sessions when the project needs them. Work moves through tasks and reviewed PRs to a version you can try on staging and hand over to a client.

Talk to the Lead, review the plan and try the product as it grows. Choose how much the team handles on its own. The three checkpoints are simple: approve the plan, accept each milestone, approve each release.

Models chosen per task and reusable checks also help keep usage under control as the project grows.

[Start your first Crewbook project](HOW-TO-RUN.md). With Claude Code, Git, Node.js 20+, Docker with Compose v2 and the GitHub CLI installed:

```bash
git clone https://github.com/liquizzz/crewbook-build.git
```

```bash
node crewbook-build/kit/init.mjs
```

Answer three setup questions, open the Lead's worktree and type `/cb-setup`. The generated `START-HERE.md` guides you from there.

## How it works

```mermaid
flowchart LR
  You(["You"]) <-- "plan, milestones, releases" --> Lead
  Lead --> Dev["Dev: backend, API, infra"]
  Lead -.-> UX["UI/UX: design"]
  Lead -.-> FE["Frontend: screens"]
  Lead -.-> Test["Test: regression"]
```

1. You describe it: in your own words, a document, a product you want to beat, an old system to replace. The Lead asks at most three questions at a time, each with a suggested answer.
2. You approve the plan: a one-page overview of the product, recommended architecture, environments and first milestone, with the stories and technical detail behind it.
3. The team builds. The Lead assigns tasks and models by risk. Implementers open PRs with the checks and reviews each change needs; the Lead merges up to the level you allow.
4. You try the milestone on `staging`, with 3 to 5 things to try, what a wrong result looks like, and links to the evidence. "All pass", or what failed.
5. You approve the release: a version tag, Docker images and a handover for the client. `node scripts/run.mjs v0.1.0` runs that version on your machine.

## What you get

| | |
|---|---|
| A project ready for the team | One initializer sets up the kit, branches, the Lead's worktree and `START-HERE.md`, with GitHub repo, label and board setup when you choose it |
| A team split by layer | The Lead and the Dev always; UI/UX, Frontend and Test when the project needs them, added later with `/cb-add-role`. Each role in its own worktree, on its own branch, inside its own folders |
| Clear boundaries for the work | Role instructions and hooks check branch pushes, file ownership and sensitive operations, so sessions have a defined place to work and a path to hand changes over |
| Checks sized to the risk | Four change levels, from a text fix (CI and a look) to core code (tests by reach, a code review and a security review). Reviews and CI are tied to the commit and reused while still valid |
| Records a client can follow | Change requests with the client's approval and price, decisions with the options rejected, a requirements document kept current, a handover for each release, and the chain from any behaviour back to the request that caused it |
| A workflow you can keep using | Issues and hand-offs let a fresh session pick up the work; `/cb-update` prepares supported kit updates as a PR for you to review |

## The book

| | Chapter | Use it to |
|---|---|---|
| 0 | [Introduction](docs/book/00-introduction.md) | See the idea in one minute and the seven-step quick start |
| 1 | [Setup](docs/book/01-setup.md) | Install the tools and create the project |
| 2 | [The team](docs/book/02-the-team.md) | Know who does what, how work moves and what the guard blocks |
| 3 | [The plan](docs/book/03-the-plan.md) | Answer five questions and approve the plan |
| 4 | [The delivery loop](docs/book/04-delivery-loop.md) | Let the team build; ask for a change; report a bug |
| 5 | [Milestones and releases](docs/book/05-releases.md) | Try a milestone, approve a release, deploy, roll back |
| 6 | [Continuity](docs/book/06-continuity.md) | Restart, recover a stalled session, update the kit |
| 7 | [Products with screens](docs/book/07-products-with-screens.md) | Pick the look and feel; design ahead of the code |
| 8 | [Small teams](docs/book/08-small-teams.md) | Run with fewer roles; add one later |
| A-E | [Templates](docs/book/appendix-a-templates.md) · [Kit](docs/book/appendix-b-kit.md) · [FAQ](docs/book/appendix-c-faq.md) · [Checklist](docs/book/appendix-d-checklist.md) · [Standards](docs/book/appendix-e-standards.md) | Look something up |

## FAQ

**Who is it for?**
Developers who already use Claude Code and want a repeatable way to deliver a product, an internal tool or a client project. Bring your programming experience; the kit gives your sessions the roles, records and delivery workflow to work together.

**How is this different from vibe coding?**
Crewbook keeps the request, implementation and review connected as the project grows. Each task has a risk level and checks to match; each milestone gets a staging version you can try before release. You can follow a change from the original request to the PR that delivered it.

**How is it different from agent teams, BMAD-METHOD or spec-kit?**
Crewbook focuses on the whole delivery workflow: role sessions in separate worktrees, task PRs, staging, release approval and client handover. The book explains the process; the kit installs the commands and templates your sessions use to follow it. See [the team](docs/book/02-the-team.md) for how the work moves.

**What stack does it use?**
Any. The Lead proposes three architectures with their cost and recommends one; a platform you or your client require is a constraint.



## Repository

| Path | Contents |
|---|---|
| [HOW-TO-RUN.md](HOW-TO-RUN.md) | From clone to your first project |
| [docs/book/](docs/book/) | The book |
| [templates/](templates/) | The documents the sessions fill in |
| [kit/](kit/) | What `kit/init.mjs` installs into a project |
| [docs/spec/](docs/spec/) | The playbook's own requirements and decision log |
| [docs/ai-log.md](docs/ai-log.md) | How this playbook itself was built with AI |
| [docs/assets/](docs/assets/) | The social preview image and its source |

## License

[![CC BY 4.0](https://img.shields.io/badge/Docs-CC%20BY%204.0-lightgrey.svg)](LICENSE) [![MIT](https://img.shields.io/badge/Kit%20code-MIT-blue.svg)](kit/LICENSE)

| Part | License |
|---|---|
| Docs and templates (`README.md`, `docs/`, `templates/`) | [Creative Commons Attribution 4.0 International](LICENSE) |
| Kit (`kit/`: hooks, scripts, workflows, settings, role files) | [MIT](kit/LICENSE) |

You may use, adapt and share both, including commercially. Please give credit: "Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)". Code files carry an `SPDX-License-Identifier: MIT` line; keep it when you copy them.
