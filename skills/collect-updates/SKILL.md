---
name: collect-updates
description: Check the registered AI/Java/Security sources (OpenAI, Anthropic, Google, Meta release blogs, the LMArena leaderboard dataset, Spring, Oracle JDK end-of-life dates, GitHub Security Advisories) directly via WebFetch and summarize what's new. Use when the user asks for the latest AI/Java/security release updates, model rankings, or Java EOL status.
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

Most sources are vendor blog/announcement pages. Two aren't:
`lmarena-leaderboard` (a Hugging Face dataset API, JSON rows) and `java-eol`
(a structured EOL table) — those have their own `prompt` in `sources.json`
because "list announcements" doesn't make sense for them. Note the LMArena
data has a `leaderboard_publish_date` — mention it, since dataset snapshots
lag the live site somewhat.

## Steps

1. For each source, call `WebFetch` with its `prompt` field if it has one;
   otherwise use the default: "List each release/announcement on this page
   with its date (if shown) and a one-sentence summary of what changed."
2. If a fetch fails or comes back blocked (some sites rate-limit or
   challenge automated fetches), say so for that one vendor and move on —
   don't fail the whole run over a single source.
3. Present the summary grouped by vendor, directly in the conversation.
   There is no separate web page or dashboard for this path — the chat
   itself is the output.
4. If the user wants this repeated on a schedule, that's Claude Code's own
   `schedule`/`loop` mechanism (or Claude.ai's scheduled tasks in a web
   session) re-invoking this skill — this skill itself has no background
   execution of its own.
