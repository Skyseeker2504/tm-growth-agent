import { col } from "../dataAdapters/firestore.js";
import { listTables, tableSchema, quickStats } from "../dataAdapters/dataExec.js";
import { suggestInsights } from "../ai.js";

export async function runDiscovery({ maxTables = 8 } = {}) {
  const tables = (await listTables()).slice(0, maxTables);

  const profile = [];
  for (const name of tables) {
    try {
      const schema = await tableSchema(name);
      const stats  = await quickStats(name);   // may throw on some views
      profile.push({ table: name, schema, stats });
    } catch (e) {
      console.warn("[DISCOVER] Skipping table due to error:", name, String(e));
      // keep going; one bad table shouldn’t break discovery
      continue;
    }
  }

  // If nothing usable, short-circuit with a friendly message
  if (!profile.length) {
    return { id: null, profileCount: 0, suggestions: { note: "No tables could be profiled." } };
  }

  // Ask AI for ideas (it returns strict JSON in our ai.js)
  const suggestions = await suggestInsights({ profile });

  // Save a snapshot for later reference
  const catRef = await col("catalog").add({
    profile,
    suggestions,
    createdAt: Date.now()
  });

  return { id: catRef.id, profileCount: profile.length, suggestions };
}
