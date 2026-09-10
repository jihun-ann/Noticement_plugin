import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export interface Source {
  id: string;
  vendor: string;
  category: string;
  url: string;
}

const sourcesPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../skills/collect-updates/sources.json"
);

const allSources: Source[] = JSON.parse(readFileSync(sourcesPath, "utf-8"));

export function listSources(filter: { vendor?: string; category?: string }): Source[] {
  return allSources.filter(
    (s) =>
      (!filter.vendor || s.vendor === filter.vendor.toUpperCase()) &&
      (!filter.category || s.category === filter.category.toUpperCase())
  );
}
