# Chapter 1: Start your first Claude Code project

← [Back: Chapter 0: Meet Crewbook](00-introduction.md) · [Contents](../../README.md#read-the-guide) · [Next: Chapter 2: Plan your product](02-plan-your-product.md) →

**Purpose:** create the project, open the Lead and move into planning. This is the complete installation guide; the generated `START-HERE.md` gives the commands for your particular project.

<a id="you-do-this-yourself-once-per-machine"></a>
## 1. Install the prerequisites

Install the Claude Code desktop app, Git, Node.js 20 or newer, the GitHub CLI (`gh`), and Docker with Compose v2. Start Docker. The initializer stops if `docker compose` is missing.

Sign in to GitHub in a terminal and allow the CLI to create boards:

```bash
gh auth login
```

```bash
gh auth refresh -s project
```

These steps touch your machine and accounts, so you run them yourself. Plugins install during project creation through the `claude` command. If that fails, the initializer prints the `/plugin install` lines to paste into a session. The Lead checks them again before setup; [Appendix B](appendix-b-kit.md#plugins) lists the plugins by role.

## 2. Clone the Crewbook repository

Open PowerShell or Terminal, or the Terminal panel in Claude Code, and go to the folder where your projects live. Clone Crewbook next to the projects you will create:

```bash
cd <your projects folder>
```

```bash
git clone https://github.com/liquizzz/crewbook-build.git
```

## 3. Create your project

In the same terminal and folder:

```bash
node crewbook-build/kit/init.mjs
```

The initializer asks three questions. Press Enter to take a suggestion.

| Question | Example or default | Note |
|---|---|---|
| Project name | Tiny Todo | The product's name |
| Where to create it | `./tiny-todo` | A new folder; init creates it |
| GitHub repo | `private`, as `<you>/tiny-todo` | Choose `public` or `none` if needed |

It installs the kit's role files, hooks, scripts, issue forms, workflows, Docker files and templates. It creates `main`, `dev` and `staging`, the Lead's worktree and `START-HERE.md`. When you choose a GitHub repo, it also sets up the repository, labels and board. Choosing `none` leaves the GitHub connection for later.

Read the report's "Please check" lines and handle any warnings. Private repos use local CI (`node scripts/ci-local.mjs`); public repos use GitHub Actions. You can switch with `node scripts/ci-mode.mjs github`. On a new public repo, open its Actions tab once: if it shows **Enable Actions on this repository**, click it so CI and image builds can run.

For scripts and tests, `node crewbook-build/kit/init.mjs <folder> --name "<name>" --github none --yes` asks nothing.

## 4. Open the Lead and begin setup

Open `START-HERE.md` in your new project. It names the Lead's worktree, such as `<project>-wt/lead`. Open a Claude Code session in that folder and type:

> /cb-setup

Write in your own language; the sessions answer in it. The Lead names its session "<Project> - Lead" and groups it under the project in the sidebar. Setup begins with roles, autonomy and your idea, then covers requirements, architecture and environments. [Chapter 2](02-plan-your-product.md) explains those choices and the plan approval.

After you approve the plan, the Lead creates the other roles' worktrees and sessions and assigns the first tasks. Until setup is done, another session tells you to finish it first. Check that the sidebar shows the Lead and the roles you chose.

## Keep secrets in the terminal

When setup needs an API key or password, run `node scripts/set-secret.mjs <NAME>` in the project's main folder and enter the value through hidden input. Never paste secrets into chat. The Lead gives you the owner-run database setup command when it is needed. [Appendix B](appendix-b-kit.md#secrets-and-database-setup) covers these commands and shared services.

If setup fails, use [troubleshooting](appendix-c-faq.md). Once the Lead is ready, continue to the plan rather than configuring every optional tool first.

---

← [Back: Chapter 0: Meet Crewbook](00-introduction.md) · [Contents](../../README.md#read-the-guide) · [Next: Chapter 2: Plan your product](02-plan-your-product.md) →
