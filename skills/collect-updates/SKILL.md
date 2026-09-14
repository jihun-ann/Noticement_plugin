---
name: collect-updates
description: Check the registered AI/Java/Python/Security/IT sources (OpenAI, Anthropic, Google, Meta, NVIDIA release+company-news blogs, TechCrunch AI and Techmeme for independent AI-industry journalism, the LMArena leaderboard dataset, Spring/Spring Boot/OpenJDK JEPs, Python release blog/PEPs, Oracle JDK/Eclipse Temurin/Amazon Corretto and CPython end-of-life+patch data, GitHub Security Advisories, NVIDIA CVEs, Oracle CPU advisories, Hacker News) directly via WebFetch and summarize what's new. Use when the user asks for the latest AI/Java/Python/security/IT updates, model rankings, industry controversies, or language EOL/feature status.
---

# Collect Updates

Fetches each vendor source directly with `WebFetch` and summarizes what's
new — no backend, no server, nothing to deploy or run first. (This project
also has a ChatGPT Custom GPT Action variant that *does* need a backend,
since Custom GPT Actions can only call an HTTP API — see
`openapi/plugin.yaml` and `backend/`. Claude doesn't need that path: it
already has WebFetch.)

If the user also wants the digest written to Notion and emailed, use the
`publish-digest` skill instead — this one only prints the summary in chat.

## Sources

Read `sources.json` next to this file for the current list (`id`, `vendor`,
`category`, `url`, optional `prompt`). If the user asked for a subset (e.g.
"OpenAI 것만"), filter by `vendor`/`category`; otherwise check all of them.

Most sources are vendor blog/announcement pages (OpenAI's is its RSS feed,
not the HTML page - the HTML page 403s under WebFetch/Cloudflare). Google
and Meta each have *two* entries: `*-ai-release` (their AI-specific blog)
and `*-news` (their general official blog/newsroom) - use both, since
company news (funding, policy, leadership, non-AI product launches) often
doesn't show up on the AI-only blog. Anthropic and OpenAI don't need a
second entry - their one feed already mixes product and company news.

**None of the above catch a company's own controversies** - a vendor's
blog only ever self-reports good news, and this whole list used to be
vendor blogs plus Hacker News (vote-based, misses things that don't go
viral that specific day). `techcrunch-ai` and `techmeme` fix that:
independent journalism and an editor-curated cross-outlet aggregator,
respectively. (Verified once against a real story they'd otherwise have
missed entirely: a WSJ report on Chinese AI labs routing queries through
"transfer stations" to distill Claude/other US models, exposing user data
to those models' operators - showed up on Techmeme, on none of the vendor
feeds.) Always check these alongside the vendor blogs, not as an
afterthought - this is where "what's the industry actually talking about"
lives, distinct from "what a vendor wants to announce."

A few sources aren't announcement-shaped and carry their own `prompt` in
`sources.json` because "list announcements" doesn't make sense for them:

- `lmarena-leaderboard` — Hugging Face dataset API, JSON rows. Note the
  `leaderboard_publish_date`; dataset snapshots lag the live site somewhat.
- `spring-boot-releases` — Spring Boot's GitHub Releases page, for actual
  changelog bullet points (not just "version X released" from the blog
  index at `spring-release`, whose excerpts are usually one thin sentence).
- `openjdk-jeps` — the master JDK Enhancement Proposal index, i.e. the
  actual language/JVM features landing in upcoming Java releases,
  independent of any one distribution's build.
- `python-peps` — the master PEP (Python Enhancement Proposal) index, the
  Python equivalent of `openjdk-jeps`: actual language/stdlib/C-API
  features, not just "3.15.0 beta N is out" version-bump announcements
  from `python-release-blog`.
- `python-eol` — same pattern and same caveat as the JDK `*-eol` sources
  below: endoflife.date's JSON API, with a `latest` patch build per minor
  version separate from the `eol` calendar date.
- `oracle-jdk-eol`, `eclipse-temurin-eol`, `amazon-corretto-eol` — three
  separate JDK distributions' data, from endoflife.date's JSON API (not the
  HTML page - the API is exact and machine-readable, no summarization risk
  on the numbers). Report all three, not just Oracle's: the same major
  version number has a different EOL date on each, because support terms
  differ by distribution (Oracle sells Premier/Extended commercial support;
  Temurin/Corretto are free and community/vendor-backported on their own
  schedules). That difference is itself the useful fact for anyone deciding
  whether to move off a commercially-EOL'd version instead of paying for
  extended support.
  - **Major version ≠ the patch actually running.** JDK releases are
    versioned down to a patch/build (`17.0.20.1`, `8u452`, ...), not just
    `17` or `8`. The API's `eol` field is a *major-line* calendar date; it
    says nothing about whether a specific patch is current. Each vendor
    ships new patch builds on a regular cadence (quarterly Critical Patch
    Updates) that fix newly-disclosed CVEs — so within a major version that
    is still fully supported, any patch older than the current `latest`
    build is likely missing fixes for vulnerabilities disclosed since it
    shipped. Always report the `latest` (patch build) and
    `latestReleaseDate` fields alongside the major-line `eol` date, and
    don't conflate "major version not yet EOL" with "this specific patch is
    still secure."
- `oracle-java-cpu` — Oracle's Critical Patch Update advisory index, the
  actual security bulletins behind each JDK "latest" patch build above.
  **Oracle blocks WebFetch here (403, same bot-check as OpenAI's HTML
  page)** — unlike OpenAI, there's no RSS alternative, so this one usually
  just fails and gets skipped per the normal policy below. (It does work
  through `backend/`, which sets a browser User-Agent — see
  `collector.ts`.)
- `nvidia-cve-index` — NVIDIA's own published-CVE index on GitHub
  (`NVIDIA/product-security`), one markdown table per year. The URL is
  pinned to the current year (`.../2026/CVE_index.md`); bump it in
  `sources.json` each January or it 404s.
- `hn-frontpage` — Hacker News's front page (via `hnrss.org`), a general
  tech-industry pulse rather than an AI/Java/Security-specific source.
- `techmeme` — see the note above; a general cross-outlet tech aggregator,
  editor-curated rather than vote-based like `hn-frontpage`.

## Steps

1. For each source, call `WebFetch` with its `prompt` field if it has one;
   otherwise use the default: "List each release/announcement on this page
   with its date (if shown) and a one-sentence summary of what changed."
2. If a fetch fails or comes back blocked (some sites rate-limit or
   challenge automated fetches), say so for that one vendor and move on —
   don't fail the whole run over a single source.
3. Present the summary **grouped by vendor** (one heading per vendor), and
   **within each vendor's list, sort items newest-first with the date shown
   on every item** — a bare title with no date isn't useful for a digest
   meant to show what's new *when*. If a source genuinely has no date for
   an item, say so explicitly rather than omitting the date silently. There
   is no separate web page or dashboard for this path — the chat itself is
   the output.
4. If the user wants this repeated on a schedule, that's Claude Code's own
   `schedule`/`loop` mechanism (or Claude.ai's scheduled tasks in a web
   session) re-invoking this skill — this skill itself has no background
   execution of its own.
