# Crewbook search and content plan

Updated: 2026-11-09. This is the repository's editorial plan, separate from the user guide. Proposed pages below are a backlog, not existing features or published articles. The GitHub About description and 15 topics below have been applied and read back from the live repository; the served HTML also reflects the description.

## Positioning and search intent

Crewbook Build for Claude is an open-source Claude Code workflow kit for developers who already know how to build software. Its strongest angle is the path from requirements to client handover: role sessions in separate Git worktrees, reviewed task PRs, staging acceptance and versioned releases.

The primary phrase for the repository is **Claude Code workflow kit**. Supporting phrases are **Claude Code multi-agent workflow**, **spec-driven development with Claude Code**, and **Claude Code workflow for client projects**. Use them where they describe the content, especially the opening paragraph and descriptive links. Keep the product name consistent: Crewbook Build for Claude.

The goal is to help a relevant developer understand the kit and start a project. Broad terms such as “AI agents” can support discovery, but should not define every article. “No-code”, “no coding required”, and “playbook” no longer describe the intended positioning. “Claude Code agent teams” can imply a particular native feature; describe Crewbook's role sessions and worktrees explicitly.

This is a qualitative keyword and intent assessment. Searches for workflow kits, multi-agent workflows and client-project workflows showed related repositories and guides. No Search Console, search-volume, backlink or difficulty dataset was available. The priorities below reflect product fit, missing reader answers and the evidence we can publish; they are not traffic forecasts.

## GitHub About and topics

Use this description:

> Open-source Claude Code workflow kit for developers: coordinate role sessions in Git worktrees, turn requirements into reviewed PRs, and deliver software through staging, releases and client handover.

Use these topics:

```text
claude-code, claude, crewbook, ai-agents, multi-agent,
agentic-coding, agentic-workflow, ai-assisted-development,
spec-driven-development, git-worktree, code-review,
software-delivery, starter-kit, developer-tools, sdlc
```

Replace the old no-code, low-code and playbook topics. GitHub topics help people browse and find related repositories; they are not a Google ranking guarantee. [GitHub's topic guidance](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics) permits up to 20 topics and recommends classifications tied to the project's purpose.

## Keyword clusters and destination pages

Each row groups related queries around one useful destination. Avoid creating several near-identical pages for variations of the same question.

| Priority | Primary query and related phrases | Intent | Destination and reader outcome |
|---|---|---|---|
| P0 | Crewbook Build for Claude; Crewbook Claude Code | Navigational | README: identify the project, see what it installs and start |
| P0 | Claude Code workflow kit; Claude Code starter kit; Claude Code project workflow | Evaluate a tool | README now; a product homepage if a documentation site is launched |
| P0 | how to start a project with Crewbook; Claude Code project setup | Informational | Chapter 1: one canonical setup guide with working commands |
| P1 | Claude Code workflow for client projects; build client software with Claude Code | Informational | New end-to-end worked example with a small demo project |
| P1 | Claude Code multi-agent workflow; multiple Claude Code sessions; Claude Code Git worktrees | Informational | New practical worktree tutorial, linked to chapters 3 and 7 |
| P1 | spec-driven development with Claude Code; Claude Code requirements workflow | Informational | New worked story-to-task-to-PR guide, linked to chapter 2 and templates |
| P2 | Claude Code code review workflow; Claude Code testing workflow | Informational | New risk-level walkthrough with an actual PR and its checks |
| P2 | Claude Code staging and release workflow; AI coding client handover | Informational | New release walkthrough, linked to chapter 4 and the handover template |
| P2 | Crewbook vs BMAD; Crewbook vs spec-kit | Commercial investigation | A dated comparison only after testing the current alternatives |
| P3 | quy trình Claude Code; Claude Code cho dự án khách hàng | Informational | A Vietnamese landing page or guide after the English example is complete |

## Content to publish first

### 1. A complete client-project example

Suggested title: **Build a client project with Claude Code and Crewbook**.

Use a small fictional product with public source code. Show the initial brief, the plan, a story, the task issue, a reviewed PR, staging acceptance and the release handover. Link to the actual artifacts and identify the Crewbook revision used. Include the decisions the owner still makes and any step that needs manual work. A short screen recording can accompany the same guide, with a transcript and a link back to the project setup.

This should be the first substantial addition: the current book explains the process, while a reproducible example lets readers see what they will get. Existing internal trials can supply lessons, but publish only sanitized, supported details. Use fictional data; any real screenshots require the approval recorded in DEC-046.

### 2. A worktree and hand-off tutorial

Suggested title: **Run multiple Claude Code sessions with Git worktrees**.

Show Lead and Dev first, then add Frontend when the example needs screens. Include the branch and folder layout, a task hand-off, a PR, and recovery after a session stops. Explain the difference between separate role sessions and subagents inside one session. Link to the canonical setup guide rather than copying installation instructions.

### 3. A spec-driven development example

Suggested title: **From requirements to reviewed PRs with Claude Code**.

Follow one feature through a user story, acceptance criteria, task, implementation, checks and an SRS update. Then show a scope change as a CR. Offer completed example documents alongside the blank templates. The reader should be able to follow the feature's history without reading a long chat transcript.

### 4. Review and release walkthroughs

Publish two focused guides after the example exists: one on choosing checks for an L0-L3 change, and one on accepting staging and handing over a tagged release. Reuse the example's real artifacts. Explain application rollback and database recovery separately. Keep usage optimization as a short supporting advantage rather than a separate article or comparison metric.

### 5. A comparison for developers choosing a workflow

Compare scope, installation, role boundaries, specifications, review, staging and handover. Pin each project's revision and cite its official documentation. Separate native Claude Code capabilities from the instructions Crewbook installs. Recheck the comparison before publishing; the README's description of Crewbook alone is not evidence about another tool. Avoid “best” and speed claims without a defined, reproducible evaluation.

## On-page assessment

| Dimension | Current assessment | Action |
|---|---|---|
| Title | GitHub controls the HTML title; README H1 names the product | Keep the full brand in H1 and explain “Claude Code workflow kit” in the opening |
| Description | About now describes the developer workflow; its text appears in GitHub's served title and description | Keep metadata aligned with the kit; use a page-specific description on a future site |
| Headings | The earlier contents mixed onboarding and configuration | Follow the delivery sequence in chapters 1-5; keep optional design/team chapters and reference separate |
| Content | Audience and workflow are clear; a complete public example is missing | Publish the example before producing a large set of generic AI-coding articles |
| Internal links | Chapters and appendices have a continuous reading path | Validate anchors and Back/Contents/Next after reordering; link new guides to the exact relevant chapter |
| Media | A social preview asset exists; no example recording is linked | Add meaningful demo media when available, with descriptive alt text or transcripts; keep private screenshots out |
| URLs | GitHub Markdown URLs depend on filenames | Update all current links when moving a page. A future site should keep stable public slugs and redirect moved URLs |
| Structured data | Repository Markdown does not provide control over page-head schema | Assess suitable markup on a future documentation site, matching visible content and current search eligibility |

## Documentation website: the next infrastructure step

A small static documentation site would allow control over page titles, descriptions, canonical URLs, redirects, sitemap and social cards. Start with a homepage, the existing guide and the complete example. Generate the site from the Markdown source so setup instructions do not drift. Keep GitHub as the source, contribution and installation destination.

Suggested homepage title: **Claude Code Workflow Kit | Crewbook Build for Claude**.

Suggested homepage description:

> Build products with a Claude Code workflow kit for developers. Plan work, coordinate role sessions, review PRs and deliver releases with Crewbook. Start here.

Publish the site before adding a homepage URL to GitHub About. Once a controlled domain is available, verify it in Search Console, submit its sitemap and inspect representative pages for indexing. If both a hosted guide and GitHub copies are discoverable, decide which hosted URLs should be canonical within the site's own templates; GitHub's page-head tags are outside this repository's control.

Do not add hidden keyword blocks, a `meta keywords` list or JSON-LD pasted into the README. Google states that [the keywords meta tag has no effect on indexing or ranking](https://developers.google.com/search/docs/crawling-indexing/special-tags). Its guidance instead emphasizes [helpful content, descriptive headings and crawlable links](https://developers.google.com/search/docs/essentials).

## Publishing and measurement

Suggested sequence: fix About and README, publish the complete example, then add the worktree and requirements guides. Launch the documentation site when the source and URL policy are ready. Treat a Vietnamese version as a real translation with its own maintenance owner; on a multilingual site, assess language URLs and hreflang together.

For every new guide, record its author, review date, kit revision, primary reader question and next action. Recheck affected guides whenever commands or roles change. Cite public source artifacts where possible. [Google's helpful-content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) supports making authorship and firsthand evidence clear.

Use the first month after publication as a baseline. For a site under our control, track relevant non-brand queries, impressions, clicks and the paths from guides to setup. On GitHub, use the repository traffic and referrer data available to maintainers alongside release feedback and discussions. Stars are a useful interest signal, but do not prove that someone completed setup. Do not claim an installation conversion rate until a privacy-conscious measurement method exists.

Review content priorities after there is query data. Expand pages that attract relevant developers and answer their follow-up questions before adding more broad keywords.
