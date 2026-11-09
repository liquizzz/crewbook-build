# Chapter 1: Setup

**Purpose:** go from an empty folder to a project with the kit installed, a GitHub repo with a board, and the Lead ready for your idea.

## You do this yourself (once per machine)

These touch your machine and your accounts, so no session does them for you:

- Install the Claude Code desktop app, Git, Node.js 20 or newer, the GitHub CLI (`gh`) and Docker, and start Docker. `init` stops when `docker compose` is missing.
- Sign in to GitHub in a terminal and let the CLI create boards:

```bash
gh auth login
```

```bash
gh auth refresh -s project
```

- Clone the playbook next to where your projects live:

```bash
git clone https://github.com/liquizzz/crewbook-build.git
```

Plugins install themselves: `init` runs `scripts/plugins.mjs`, and the Lead's `/cb-setup` checks them before anything else. When the `claude` command is missing, `init` prints the `/plugin install` lines to paste into any session. Which plugin each role gets, and why, is in [Appendix B](appendix-b-kit.md#plugins).

## 1. Create the project

**What it does:** installs the kit into a new folder: the shared `CLAUDE.md`, the role files, the guard hook, the scripts, the issue forms, the workflows, the Docker files and the document templates. It creates the branches `main`, `dev` and `staging`, the Lead's worktree, the GitHub repo with its labels and kanban board, and `START-HERE.md`, your next steps as commands.

**You run,** in a terminal, in the folder that holds `crewbook-build`:

```bash
node crewbook-build/kit/init.mjs
```

**It asks you** three things, each with a suggestion (Enter takes it): the project name, the folder, and the GitHub repo (`private`, `public` or `none`).

**It does:** everything above, then installs the plugins. A private repo runs CI on your machine, so it spends none of your GitHub Actions minutes; a public one runs it on GitHub for free.

**You check:** the "Please check" lines at the end of its report, then open `START-HERE.md`. On a new public repo, open its Actions tab once: if GitHub shows **Enable Actions on this repository**, click it, or nothing runs.

For scripts and tests: `node crewbook-build/kit/init.mjs <folder> --name "<name>" --github none --yes` asks nothing.

## 2. Start the Lead

**What it does:** opens the one session you talk to. It names itself "<Project> - Lead", files itself in a sidebar group named after the project, and runs the setup ([chapter 3](03-the-plan.md)).

**Ask:** open a Claude Code session in the Lead's folder (`<project>-wt/lead`, shown in `START-HERE.md`) and type, in your own language:

> /cb-setup

**Claude asks you:** the five setup questions, starting with the roles, how much runs without you and your idea, all in one message.

**Claude does:** the plan, then every other role's worktree and session, each detached and filed in the project's group.

**You check:** the plan, once. Then the sidebar shows one group with the Lead and the roles you chose.

Until setup is done, any other session you open only tells you to finish it first.

## Secrets

**What it does:** puts an API key or a password where every checkout can use it and no session can read it.

**You run,** in the project's main folder:

```bash
node scripts/set-secret.mjs <NAME>
```

Type the value when asked. Nothing shows on screen; the value goes into the git-ignored `.env.local` of every checkout. The guard stops any session, subagent or review from reading `.env` files or printing the environment, so the value stays out of every transcript. Never paste a secret into a chat. If one ever reaches a chat, replace it.

The databases get their own command, which you run once when the Lead asks: `node scripts/db-setup.mjs create` makes one database and one login per role and writes each connection string where it belongs, without showing any of them ([chapter 2](02-the-team.md#environments)).

## The machine's shared services

**What it does:** runs each database engine once for every project on this machine (one Postgres 17, one SQL Server 2022, one Redis), so ten projects do not mean ten database containers.

**Ask the Lead:**

> /cb-env

**Claude does:** shows what runs, proposes what the project needs, and gives you the commands that need a password, such as:

```bash
node scripts/hosts.mjs secret POSTGRES_PASSWORD
```

That command also changes the password in the running Postgres, so the file and the server never disagree. To open the shared server in a database tool, connect as `postgres` to `localhost:5432` with that password (in DBeaver, tick "Show all databases").

**You check:** `node scripts/hosts.mjs` lists the services and the hosts.

## Optional: a second-opinion reviewer

Install the Codex plugin once per machine, in any session:

```
/plugin marketplace add openai/codex-plugin-cc
/plugin install codex@openai-codex
/reload-plugins
/codex:setup
```

The Lead then offers `/cb-review #<PR>` on risky pull requests ([chapter 4](04-delivery-loop.md)).

> **Token tip:** you do not need to read the kit's files. Each session reads only the part it needs.

Next: [Chapter 2: The team](02-the-team.md).
