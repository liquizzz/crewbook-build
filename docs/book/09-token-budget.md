# Chapter 9: Token budget

**Purpose:** get the product built for a reasonable cost. Most token waste comes from sessions that run without a reason, contexts that grow too large and work that is checked more than it needs.

## The biggest costs, and what to do

| Cost driver | Do this |
|---|---|
| `/goal` and `/loop`: the session keeps working or re-checking on its own and re-reads its context every cycle | Avoid them. Give one clear prompt per step and let the session finish and stop. If you must use `/loop`, use a long interval (hours, not minutes), a clear stop condition, and stop it the same day |
| Too many open sessions: each one holds its own context | Open the minimum team (Lead, one Dev). Open Test, UI/UX, DevOps only when there is work; close any session idle for a day |
| Large contexts: a long session re-sends everything on every turn | Let the Lead clear contexts at the kit's fixed points ([below](#start-fresh-contexts)). Compact other sessions after each task or hand-off ([chapter 6](06-continuity.md)) |
| Reading whole documents: the SRS and specs grow with every release | Ask for the section you need: "read §3.2 of the SRS", "read the spec of CR-12" |
| Long pasted logs | Paste only the error and a few lines around it |
| Many small questions | Answer the open decisions in one reply; put what you know in your first message, so the session drafts more and asks less; say "you decide" for topics you do not care about |
| Over-testing | Test by change level ([chapter 4](04-delivery-loop.md)); full regression only before a release |
| Extra AI reviews | Only for L3, money, security or data, and before a release; you decide each time |
| Strong model everywhere | The Lead's model does the thinking (design, task plans, review); Dev and Test build and check what the task says, on a cheaper model. Pick a model mode ([below](#choose-the-models)) |
| Skills | A skill loads its instructions only when a session uses it. The kit names one skill per task and leaves out the subagent skills, which multiply the cost; do not add others to a role file without a reason |
| Plugins you do not use | Each plugin adds a fixed cost to every session. Check it with `claude plugin details <plugin>` ("Projected token cost") and disable what the project does not need with `claude plugin disable <plugin>` |
| Verbose command output | Ask sessions for short output (`--quiet`, `git log --oneline`); an output-filtering CLI proxy, which shortens command output before the session reads it, helps further |

## Start fresh contexts

**What it does:** keeps each model call small, because a session pays for its whole history on every call. In a real trial (a .NET CMS rewrite, Full level) each role ran one session for ten days. The median context per model call was about 400k tokens. The Devs used about 70% of the project's usage, the Lead about 22%, UI/UX 9%, and the PO role of that kit 0.4%. Fresh contexts cut the history each call carries.

**Claude does,** on its own:
- after each merged task, the Lead clears the Dev's context before it sends the next task, when that Dev has no other open PR (Claude Code desktop: it clears the session itself; otherwise it asks you to type `/clear` there). The Dev starts again from its recovery steps: the issue, git and the task;
- after G2 and after each release, the Lead writes where things stand in the milestone file and the issues, then asks you to type `/clear` in its own session.

**You check:** nothing. A session with a PR in review or work not pushed is never cleared.

## Choose the models

**What it does:** the second lever after fresh contexts. You pick a mode at `/cb-setup` and can change it any time.

| Mode | Lead | UI/UX | DevOps | Dev | Test |
|---|---|---|---|---|---|
| `claude` | Opus | Opus | Opus | Sonnet | Sonnet |
| `deepseek` | deepseek-pro | deepseek-flash | deepseek-pro | deepseek-flash | deepseek-flash |
| `mix` | Opus | Opus | Opus | deepseek-flash | deepseek-flash |

`deepseek-pro` reads no images, so UI/UX and Test, which look at screens, run `deepseek-flash`, and the Lead looks at a screen through a subagent on `deepseek-flash`.

**Ask the Lead:**
> /cb-model

It shows each role's provider and model. `/cb-model mode <claude|deepseek|mix>` changes the whole project; `/cb-model <role> <opus|sonnet|deepseek-pro|deepseek-flash|default>` changes one role, for example a stuck task (`/cb-model dev1 opus`).

**Claude asks you:** for `deepseek` or `mix`, the DeepSeek key first. You run `node scripts/set-secret.mjs DEEPSEEK_API_KEY` in a terminal, never in the chat; without the key both modes are refused.

**You check:** on a client project, the client's OK before you choose `deepseek` or `mix`, since the code those roles see goes to DeepSeek's servers. A change reaches a session when it restarts; `/status` in that session shows the model and the address.

## Habits that keep cost low

1. Give one prompt per step and let the session stop when the step is done.
2. Close sessions that are idle. Their work is in issues, documents and git, so nothing is lost.
3. Compact at natural breaks, never in the middle of a fix.
4. Keep `CLAUDE.md` and the role files short, because every session reads them each time it starts.
5. Start at Lite and move to Full only when the stakes call for it ([chapter 8](08-lite-mode.md)). Open a role only when the Lead proposes it for work that is ready to start: fewer open sessions means less context to pay for.
6. Plan before you build. A clear CR and spec prevent rework, and rework is where tokens are wasted most.

## Check what you spend

**Ask any session** at the end of a day:
> How much context are you holding, and should I compact or restart you?

**Claude does:** reports its context size and recommends compacting or restarting with the restart sentence.

**You check:** your plan's usage page once a day during the first week, to learn what a milestone costs; then once a week.

> **Token tip:** if a milestone costs much more than the last one, ask the Lead: "Why did v0.4.0 cost more than v0.3.0?" The usual answers are a long-running session, a `/loop`, or rework from an unclear CR.

Next: [Appendix A: Templates](appendix-a-templates.md).
