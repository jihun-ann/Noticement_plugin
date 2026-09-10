import * as cheerio from "cheerio";
import { createHash } from "node:crypto";
import type { Source } from "./sources.js";

export interface CollectedDocument {
  vendor: string;
  sourceId: string;
  title: string;
  url: string;
  publishedAt: string | null;
  normalizedText: string;
  contentHash: string;
}

// Cloudflare (and similar) blocks fetches with no/bot User-Agent (openai.com returns 403) -
// same fix the Java collector needed.
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function normalizeText(raw: string): string {
  const zeroWidth = new RegExp("[\\u200B-\\u200D\\uFEFF]", "g");
  return raw
    .normalize("NFKC")
    .replace(zeroWidth, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function collectSource(
  source: Source,
  maxContentChars: number
): Promise<CollectedDocument> {
  const res = await fetch(source.url, { headers: { "User-Agent": BROWSER_UA } });
  if (!res.ok) {
    throw new Error(`fetch failed: ${res.status} ${res.statusText}`);
  }
  const html = await res.text();
  const $ = cheerio.load(html);
  $("script, style, nav, header, footer").remove();

  const normalizedText = normalizeText($("body").text()).slice(0, maxContentChars);
  const title = normalizeText($("title").first().text()) || source.vendor;
  const contentHash = createHash("sha256").update(normalizedText).digest("hex");

  return {
    vendor: source.vendor,
    sourceId: source.id,
    title,
    url: source.url,
    // ponytail: no per-vendor date parsing, publishedAt stays null. Add real
    // extraction if a caller needs to sort/dedup by date instead of contentHash.
    publishedAt: null,
    normalizedText,
    contentHash,
  };
}
