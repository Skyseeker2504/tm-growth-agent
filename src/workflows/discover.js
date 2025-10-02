import { col } from "../dataAdapters/firestore.js";
import { listTables, tableSchema, quickStats } from "../dataAdapters/dataExec.js";
import { suggestInsights } from "../ai.js";
import { sanitizeForFirestore } from "../util/sanitize.js";

export async function runDiscovery({ maxTables = 8 } = {}) {
  const tables = (await listTables()).slice(0, maxTables);

  const profile = [];
  for (const name of tables) {
    try {
      const schema = await tableSchema(name);
      const stats  = await quickStats(name);
      profile.push({ table: name, schema, stats });
    } catch (e) {
      console.warn("[DISCOVER] Skipping table due to error:", name, String(e));
      continue;
    }
  }

  if (!profile.length) {
    return { id: null, profileCount: 0, suggestions: { note: "No tables could be profiled." } };
  }

  // Ask AI (already returns strict JSON)
  const suggestions = await suggestInsights({ profile });

  // 🔒 SANITIZE before writing
  const safeDoc = sanitizeForFirestore({ profile, suggestions, createdAt: Date.now() });

  const catRef = await col("catalog").add(safeDoc);

  return { id: catRef.id, profileCount: profile.length, suggestions };
}
