import express from "express";
import { listSources } from "./sources.js";
import { collectSource } from "./collector.js";

const app = express();
const PORT = Number(process.env.PORT ?? 8080);
const API_KEY = process.env.PLUGIN_API_KEY;
const MAX_DOCS = Number(process.env.PLUGIN_MAX_DOCS ?? 20);
const MAX_CONTENT_CHARS = Number(process.env.PLUGIN_MAX_CONTENT_CHARS ?? 4000);

app.get("/api/plugin/collect", async (req, res) => {
  // No PLUGIN_API_KEY set -> unauthenticated pass-through, local dev only.
  // Set it before deploying anywhere reachable from the internet.
  if (API_KEY && req.header("X-Api-Key") !== API_KEY) {
    res.status(401).json({ error: "missing or invalid X-Api-Key" });
    return;
  }

  const { vendor, category } = req.query;
  const sources = listSources({
    vendor: typeof vendor === "string" ? vendor : undefined,
    category: typeof category === "string" ? category : undefined,
  }).slice(0, MAX_DOCS);

  const documents = await Promise.all(
    sources.map(async (source) => {
      try {
        return await collectSource(source, MAX_CONTENT_CHARS);
      } catch (err) {
        return {
          vendor: source.vendor,
          sourceId: source.id,
          title: source.vendor,
          url: source.url,
          publishedAt: null,
          normalizedText: "",
          contentHash: "",
          error: err instanceof Error ? err.message : String(err),
        };
      }
    })
  );

  res.json(documents);
});

app.listen(PORT, () => {
  console.log(`noticement plugin backend listening on :${PORT}`);
});
