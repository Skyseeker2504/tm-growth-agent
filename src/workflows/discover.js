import { col } from "../dataAdapters/firestore.js";
import { listTables, tableSchema, quickStats } from "../dataAdapters/dataExec.js";
import { suggestInsights } from "../ai.js";

export async function runDiscovery({ maxTables = 8 } = {}) {
  const tables = (await listTables()).slice(0, maxTables);

  const profile = [];
  for (const name of tables) {
    try {
      const schema = await tableSchema(name);
      const stats  = await quickStats(name);
      // keep it lean; drop raw row samples if they look big
      const safeStats = {
        rows: stats?.rows ?? 0,
        dateCol: stats?.dateCol ?? null,
        daterange: stats?.daterange ?? null,
        // convert sample rows to plain JSON-safe values
        sample: (stats?.sample || []).slice(0,3).map(r => {
          const out = {};
          for (const [k,v] of Object.entries(r)) {
            if (typeof v === "bigint") out[k] = v.toString();
            else if (typeof v === "number" && !Number.isFinite(v)) out[k] = null;
            else out[k] = v ?? null;
          }
          return out;
        })
      };
      profile.push({ table: name, schema, stats: safeStats });
    } catch (e) {
      console.warn("[DISCOVER] skip table:", name, String(e));
    }
  }

  // Ask AI for ideas (already returns strict JSON)
  const suggestions = await suggestInsights({ profile });

  // 🔒 Write as strings to avoid Firestore nested pitfalls
  const doc = {
    profile_json: JSON.stringify(profile).slice(0, 900000),
    suggestions_json: JSON.stringify(suggestions).slice(0, 900000),
    createdAt: Date.now()
  };

  const catRef = await col("catalog").add(doc);
  return { id: catRef.id, profileCount: profile.length, suggestions };
}
