---
name: publish-digest
description: Collect AI/Java/Security vendor updates (same sources as collect-updates), write a summarized digest page to Notion via the Notion MCP, and email the digest via the user's connected mail account (Outlook/Gmail/etc). Use when the user wants the update digest actually saved and sent, not just shown in chat.
---

# Publish Digest

Same collection step as `collect-updates`, then two side effects: a Notion
page and an email. Both side effects are done by calling MCP tools directly
— this skill does not summarize or decide anything on the server side, you
(the calling model) do the writing.

## Prerequisites

- The `notion` MCP server (declared in this plugin's `plugin.json`, backed
  by Notion's official remote MCP at `mcp.notion.com`) must be connected and
  authorized. If it isn't, tell the user to connect it first.
- A mail-sending connector must already be connected in this Claude
  environment — e.g. the Outlook/Microsoft 365 or Gmail connector. This
  plugin doesn't bundle its own email server or declare one in
  `plugin.json`; it just calls whatever mail-send tool that connector
  exposes (its exact name depends on which connector the user has). If none
  is connected, tell the user to connect one before this step, rather than
  failing silently.
- You need a recipient email address and (optionally) a Notion parent
  page/database to file the new page under. Ask the user for these if they
  weren't given, rather than guessing or hardcoding one.

## Steps

1. Read `../collect-updates/sources.json` for the vendor list (filter by
   `vendor`/`category` if the user asked for a subset).
2. For each source, call `WebFetch` the same way `collect-updates` does:
   "List each release/announcement on this page with its date (if shown)
   and a one-sentence summary of what changed." Skip and note any source
   that fails or is blocked — don't abort the whole run over one vendor.
3. Compose the digest content once, from the fetched summaries:
   - A short markdown/blocks body grouped by vendor, for the Notion page.
   - A shorter plain-text/HTML version for the email: headline items plus
     "what needs attention" (e.g. security advisories), and a link back to
     the Notion page once it's created.
4. Create the Notion page with the `notion` MCP tools (create/append a page
   under the parent the user specified), then grab the resulting page URL.
5. Send the email through the connected mail connector's send tool (Outlook
   `mail.send` / Gmail equivalent / whatever is available) with the
   recipient, a subject like "AI/Java/Security digest - <date>", and the
   HTML body including the Notion page URL from step 4.
6. Report back in chat: what was published where (Notion URL) and who the
   email was sent to. If either step failed, say which one and why — don't
   silently skip it.

## Scheduling

This skill has no background execution of its own. Repeat it on a schedule
via Claude Code's `schedule`/`loop` mechanism or Claude.ai's scheduled
tasks, the same way `collect-updates` would be scheduled.
