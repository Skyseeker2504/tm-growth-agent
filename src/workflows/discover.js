// src/workflows/discover.js
import { col } from "../dataAdapters/firestore.js";
import { listTables, tableSchema, quickStats } from "../dataAdapters/dataExec.js";
import { suggestInsights } from "../ai.js";

export async function runDiscovery({ maxTables = 10 } = {}) {
  const names = (await listTables()).slice(0, maxTables);

  const profile = [];
  for (const name of names) {
    try {
      const schema = await tableSchema(name);    // returns [] on failure
      const stats  = await quickStats(name);     // never throws
      profile.push({ table: name, schema, stats });
    } catch (e) {
      // Shouldn’t hit due to guards, but just in case
      profile.push({ table: name, schema: [], stats: { error: String(e?.message || e) } });
    }
  }

  let suggestions = { ideas: [], questions: [], content: [] };
  try {
    suggestions = await suggestInsights({ profile });
  } catch (e) {
    console.warn("suggestInsights failed:", e?.message || e);
  }

  const ref = await col("catalog").add({
    profile, suggestions, createdAt: Date.now()
  });

  return { id: ref.id, profileCount: profile.length, suggestions };
}
