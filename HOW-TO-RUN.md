# How to run

From nothing to a project you can work on: about five minutes once your machine has the tools of step 0. You do not need to read the book first: the project you create gets its own `START-HERE.md`, with every next step as a short command to type.

Steps 0 to 2 happen in a terminal. You need a Claude Code session only from step 3.

## 0. Once per machine

Install the Claude Code desktop app, Git, Node.js 20+, Docker (and start it) and the GitHub CLI. Then sign in to GitHub and allow the CLI to create boards:

```bash
gh auth login
```

```bash
gh auth refresh -s project
```

You do not install Claude Code plugins by hand: `init` (step 2) installs the ones the project uses with the `claude` command, and the Lead's `/setup` checks them before anything else. If `init` cannot, it prints the `/plugin install` lines to paste into any session. The list is in [chapter 1](docs/book/01-setup.md#you-do-this-yourself-once).

## 1. Clone the playbook

Open a terminal: PowerShell or Terminal on your computer, or the Terminal panel in Claude Code. The panel opens in your home folder, so go first to the folder where your projects live (create it if needed):

```bash
cd <your projects folder>
```

```bash
git clone https://github.com/liquizzz/crewbook-build.git
```

## 2. Create your project

In the same terminal and folder:

```bash
node crewbook-build/kit/init.mjs
```

It asks eight questions, each with a one-line hint. Press Enter to take the suggestion in brackets.

| # | Question | Suggestion | Note |
|---|---|---|---|
| 1 | Project name | | Any name, for example "Tiny Todo" |
| 2 | Where to create the project | `./tiny-todo` | A new folder; init creates it |
| 3 | Level: 1 (Lite) or 2 (Full) | `1` (Lite) | Lite: PO, Lead and Dev. Start here. Full: adds Test, UI/UX and DevOps sessions, for money, security, personal data or formal sign-off of each release. Change it any time |
| 4 | Working language | `English` | The sessions talk to you in it; you also choose the language of the documents |
| 5 | Separate design prototype | `no` | Yes only if someone reviews a clickable design before the app is built |
| 6 | Polished documents | `no` | Yes adds a humanizer pass to every document: reads better, costs more tokens. Worth it for documents other people read; turn it on later by telling the Lead |
| 7 | One-line description | | Optional; you give your idea to the PO later |
| 8 | GitHub repo | `private`, as `<you>/tiny-todo` | `none` to connect later |

Then it installs the kit, creates the branches and the Lead's worktree, creates and pushes the GitHub repo with its labels and kanban board, and writes `START-HERE.md`.

Read the "Please check" lines at the end of its report. A private repo runs CI on your machine (`node scripts/ci-local.mjs`), so it uses none of your GitHub Actions minutes; switch with `node scripts/ci-mode.mjs github`. On a new public repo, open its Actions tab on GitHub once: if it shows **Enable Actions on this repository**, click it, or CI and the Docker images never run.

## 3. Follow START-HERE.md

Open `START-HERE.md` in your new project folder. Its first step tells you which folder to open in Claude Code (a worktree, which is a second folder of the same project, one per session, such as `tiny-todo-wt\lead`) and the command to type there: `/setup`. Setup comes first: it creates the other sessions' folders and ends with the next session's prompt in a box you copy. Each later step names the session, the command, what you check, and what you get.

At Lite it goes: `/setup` (Lead, no questions), `/next <your idea>` (PO: a one-page proposal and grey screen sketches you approve once, then the requirements and the SRS's functional part without asking again), `/next` (Lead: one solution design with the look and feel you approve, then the ADRs, the SRS baseline and the plan; from here on you work with the Lead), `/build try` and `/build done` (Dev1), `/release` (Lead: the milestone goes to `staging`, Dev1 runs the regression, the PO accepts it and writes the handover, you try it yourself), then run it in Docker. `/progress` tells you where the project stands at any time. Set API keys and passwords with `node scripts/set-secret.mjs <NAME>`, never in the chat.

## 4. Get kit updates later

The kit gets better between your projects. To bring a project that already runs up to the newest kit, type `/kit-update` in its Lead session. The Lead fetches crewbook-build, shows you what will change, updates the kit files in its own folder and keeps your project's files, rules and decisions. The update reaches `dev` through a PR that waits for your OK. A project made before `/kit-update` existed has no such command yet: run this once in its Lead folder (`<project>-wt/lead`), with your clone of crewbook-build next to the project:

```bash
node ../../crewbook-build/kit/update.mjs --dry-run
```

Then ask the Lead: "Update the kit as the dry run shows, then open a PR." From then on, `/kit-update` is there.

When you want to know why a step works the way it does, the [book](README.md#the-book) has a chapter for it.
