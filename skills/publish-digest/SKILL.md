---
name: publish-digest
description: Collect AI/Java/Python/Security/IT updates (same sources as collect-updates, including NVIDIA, company-news blogs, JEPs/PEPs, and Hacker News), write a summarized digest page to Notion via the Notion MCP, keep a standing Java/JDK EOL reference page up to date, and email the digest via the user's connected mail account (Outlook/Gmail/etc). Use when the user wants the update digest actually saved and sent, not just shown in chat.
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
2. For each source, call `WebFetch` the same way `collect-updates` does —
   its own `prompt` field if it has one, otherwise the default
   announcement-summary prompt. Skip and note any source that fails or is
   blocked — don't abort the whole run over one vendor.
3. Compose the digest content once, from the fetched summaries:
   - A short markdown/blocks body for the Notion page, with sections: an
     AI release/company-news section (OpenAI/Anthropic/Google incl.
     `google-news`/Meta incl. `meta-news`/NVIDIA), an "AI model rankings"
     section from `lmarena-leaderboard`, a Java section, a Python section, a
     security section (GitHub Advisories + `nvidia-cve-index` +
     `oracle-java-cpu` if it wasn't blocked), and an "IT 트렌드" section from
     `hn-frontpage` for broader industry signal beyond the named vendors.
   - The AI release/company-news section is grouped **by vendor** (one
     `### Vendor` heading each), and **within each vendor's list, items are
     sorted newest-first with the date shown on every item** — never a bare
     title with no date. Same rule for the Python release section. If a
     source genuinely has no date for an item, say so explicitly rather
     than dropping the date silently. (Sources with their own natural
     shape — the leaderboard, EOL tables, CVE indexes — don't follow this
     vendor/date pattern; it's for the release/news lists specifically.)
   - The "AI model rankings" table always gets printed in full, every run,
     even if it's unchanged from the previous digest — this skill has no
     state to diff against anyway, and "no change, see yesterday's entry"
     makes each entry depend on another one instead of standing alone.
   - The Java section needs both parts, not just one: a dated release list
     from `spring-release` (same vendor/date pattern as the AI section
     above), *and* a separate "버전별 기능 상세" breakdown pulling real
     feature/change detail from `openjdk-jeps` (grouped by JDK version, one
     line of JEP numbers+titles per version) and `spring-boot-releases`
     (grouped by Spring Boot version, real changelog bullets - not just
     "version X released"). Skipping either half is an incomplete Java
     section. Use `·` or line breaks to separate items within a version's
     line, not commas — long comma-separated clauses inside one bullet have
     gotten mis-split into stray sub-bullets when written to Notion before.
   - The Java section's EOL data is not just Oracle's table — combine all
     three `*-eol` sources (`oracle-jdk-eol`, `eclipse-temurin-eol`,
     `amazon-corretto-eol`) into one comparison, since the same version
     number has a different EOL date on each distribution. Explain *why*
     briefly (Oracle Premier/Extended commercial support vs. Temurin/
     Corretto's free community/vendor-backported support), then call out
     what's actionable right now: any LTS version whose *Oracle* support is
     within 6 months or already past, and what free distribution someone on
     that version could move to instead of paying for Oracle Extended
     Support.
   - The Python section, same treatment as Java: version-bump announcements
     from `python-release-blog` are just "3.15.0 beta N is out" - pull the
     actual language/stdlib feature detail from `python-peps` (the PEP
     index, Python's equivalent of `openjdk-jeps`) alongside it. Then EOL
     status from `python-eol` (same "minor line not-EOL ≠ your patch is
     current" caveat as Java - report the `latest` patch build, not just
     the `eol` date).
   - For the standing reference page (step 5), go further than the digest
     summary: one full table per distribution listing *every* major version
     ("cycle") each source returns (not just LTS lines), and for each one
     include its `latest` patch build and `latestReleaseDate` alongside the
     `eol` date — don't let it condense old versions into a summary
     sentence, and don't drop the `latest` field. That field is the actual
     point: a major line being "not yet EOL" only means the *line* still
     gets patches, not that whatever patch build is currently deployed is
     current. Call out explicitly that anything older than `latest` for a
     still-supported cycle should be treated as exposed to whatever CVEs
     the newer patch builds fixed, independent of the `eol` date.
   - A shorter plain-text/HTML version for the email: headline items plus
     "what needs attention" (e.g. security advisories, any Java version
     that's newly past EOL), and a link back to the Notion page once it's
     created.
   - The database row's "주요 내용" property is a **list, not a paragraph**:
     one `- ` line per major section (AI vendors, model rankings, Java,
     Python, security, IT), each line a compressed highlight of that
     section — not one dense run-on sentence covering everything. This is
     the text that shows in the database's table/list view without opening
     the page, so it needs to scan as separate points at a glance.
4. Create the Notion page with the `notion` MCP tools (create/append a page
   under the parent the user specified), then grab the resulting page URL.
5. Maintain the standing "Java/JDK EOL 현황" reference section — this is a
   living part of the digest's *parent page* itself (e.g. "IT Digest", the
   page holding the digest database), not a separate subpage and not a row
   in the database:
   - `notion-fetch` the parent page first. If it already has a
     `## Java/JDK EOL 현황` section, overwrite just that section with
     `notion-update-page` (`update_content`, search/replace on the old
     section text, or `replace_content` with the full page content
     reproduced including the existing `<database>` block reference — do
     NOT create a new page/subpage for this).
   - If the section doesn't exist yet, add it with `insert_content`
     (`position: {"type": "end"}`) on the parent page.
   - The content is the full per-distribution version tables from step 3
     plus the policy explanation, with a "마지막 업데이트: <today's date>"
     line at the very top so anyone reading it can tell how fresh it is.
   - **Markdown gotcha**: pass real line breaks in the `content`/`new_str`
     string, never the literal two characters `\` `n`. A literal `\n` gets
     parsed as an escaped "n" character (not a newline), which collapses
     the whole section into one run-on paragraph and breaks every table.
6. Send the email through the connected mail connector's send tool (Outlook
   `mail.send` / Gmail equivalent / whatever is available) with the
   recipient, a subject like "AI/Java/Security digest - <date>", and the
   HTML body including the Notion page URL from step 4.
7. Report back in chat: what was published/updated where (digest page URL,
   Java EOL reference page URL) and who the email was sent to. If any step
   failed, say which one and why — don't silently skip it.

## Scheduling

This skill has no background execution of its own. Repeat it on a schedule
via Claude Code's `schedule`/`loop` mechanism or Claude.ai's scheduled
tasks, the same way `collect-updates` would be scheduled.
