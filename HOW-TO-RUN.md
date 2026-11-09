# Crewbook Build for Claude: how to run

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

You do not install Claude Code plugins by hand: `init` (step 2) installs the ones the project uses with the `claude` command, and the Lead's `/cb-setup` checks them before anything else. If `init` cannot, it prints the `/plugin install` lines to paste into any session. The list is in [chapter 1](docs/book/01-setup.md#you-do-this-yourself-once-per-machine).

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

It asks three questions, each with a one-line hint. Press Enter to take the suggestion in brackets.

| # | Question | Suggestion | Note |
|---|---|---|---|
| 1 | Project name | | Any name, for example "Tiny Todo" |
| 2 | Where to create the project | `./tiny-todo` | A new folder; init creates it |
| 3 | GitHub repo | `private`, as `<you>/tiny-todo` | `none` to connect later |

The rest (the roles, the language, your idea, the stack and the environments) comes in the Lead's `/cb-setup`.

Then it installs the kit, creates the branches and the Lead's worktree, creates and pushes the GitHub repo with its labels and kanban board, and writes `START-HERE.md`.

Read the "Please check" lines at the end of its report. A private repo runs CI on your machine (`node scripts/ci-local.mjs`), so it uses none of your GitHub Actions minutes; switch with `node scripts/ci-mode.mjs github`. On a new public repo, open its Actions tab on GitHub once: if it shows **Enable Actions on this repository**, click it, or CI and the Docker images never run.

## 3. Follow START-HERE.md

Open `START-HERE.md` in your new project folder. Its first step tells you which folder to open in Claude Code (a worktree, which is a second folder of the same project, one per session, such as `tiny-todo-wt\lead`) and the command to type there: `/cb-setup` (every command starts with `cb`, for Crewbook). Write to the Lead in your own language; the sessions answer in it.

Setup runs in order, each step with a suggestion you can take as it is:

1. Your idea, the roles and how much runs without you, in one reply. The Lead and the Dev are always on; UI/UX, Frontend and Test are ticked by default.
2. The requirements: the Lead drafts the stories, suggests the ones usually missing and draws the function tree; you correct the draft.
3. The deployment model and stack: three options with their cost, one recommended; pick one or say "you decide".
4. The look and feel, when the product has screens: 2-3 named directions; pick one.
5. GitHub, only if init skipped it.
6. The database: a server you already have (`node scripts/db-setup.mjs connect`, paste its connection string) or one Crewbook creates for this project (`node scripts/db-setup.mjs managed create`). Either way the project gets one account for all its databases.

You approve the plan on one page, and the Lead creates every other session. From there the Lead plans each milestone (`/cb-plan`), the sessions build and pass work to each other, and you step in when something waits for you. `/cb-release demo` gives you the milestone to try on `staging`; `/cb-release` publishes it after your OK. `/cb-progress` tells you where the project stands at any time; `/cb-help` lists every command. Set API keys and passwords with `node scripts/set-secret.mjs <NAME>`, never in the chat.

## 4. Get kit updates later

The kit gets better between your projects. A project started before the roles changed (Dev1, Dev2, DevOps, the Lite and Full levels) stays on its kit version: `/cb-update` says so and stops. To bring a newer project up to the newest kit, type `/cb-update` in its Lead session. The Lead fetches crewbook-build, shows you what will change, updates the kit files in its own folder and keeps your project's files, rules and decisions. The update reaches `dev` through a PR that waits for your OK. A project that still has `/kit-update` types that once; it brings in `/cb-update`. A project with neither command: run this once in its Lead folder (`<project>-wt/lead`), with your clone of crewbook-build next to the project:

```bash
node ../../crewbook-build/kit/update.mjs --dry-run
```

Then ask the Lead: "Update the kit as the dry run shows, then open a PR." From then on, `/cb-update` is there.

When you want to know why a step works the way it does, the [book](README.md#the-book) has a chapter for it.
