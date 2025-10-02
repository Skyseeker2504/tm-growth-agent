import { col } from "../dataAdapters/firestore.js";
import { listTables, tableSchema, quickStats } from "../dataAdapters/dataExec.js";
import { suggestInsights } from "../ai.js";

export async function runDiscovery({ maxTables = 10 } = {}) {
  const tables = (await listTables()).slice(0, maxTables);

  const profile = [];
  for (const name of tables) {
    const schema = await tableSchema(name);
    const stats  = await quickStats(name);
    profile.push({ table: name, schema, stats });
  }

  // Ask AI to propose what’s possible
  const suggestions = await suggestInsights({ profile });

  // persist for later use (catalog + suggestions)
  const catRef = await col("catalog").add({
    profile,
    suggestions,
    createdAt: Date.now()
  });

  return { id: catRef.id, profileCount: profile.length, suggestions };
}
