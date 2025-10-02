// src/workflows/askSql.js
import { col } from "../dataAdapters/firestore.js";
import { listTables, tableSchema, quickStats, qDuck } from "../dataAdapters/dataExec.js";
import { nl2sql, summarizeRows } from "../ai.js";

export async function askSQL(prompt) {
  const tableNames = (await listTables()).slice(0, 12);

  const profile = [];
  for (const t of tableNames) {
    try {
      const schema = await tableSchema(t);
      const stats  = await quickStats(t);
      profile.push({ table: t, schema, stats });
    } catch (e) {
      profile.push({ table: t, schema: [], stats: { error: String(e?.message || e) } });
    }
  }

  // NL → SQL
  const plan = await nl2sql({ prompt, profile });
  const { sql, reason } = plan;

  // Run the SQL (if it fails, surface the error but don’t crash the server)
  let rows = [];
  try {
    rows = await qDuck(sql);
  } catch (e) {
    rows = [];
  }

  // Summarize to content
  const title = prompt;
  let cap = { caption: `${title}\n\nNo rows returned.`, hashtags: "#tenders #GeM #CPPP #MSME #procurement" };
  try {
    if (rows.length) cap = await summarizeRows({ title, rows });
  } catch {}

  const ref = await col("calendar").add({
    type: "image",
    title,
    data: rows.slice(0, 20),
    payload: { caption: cap.caption, hashtags: cap.hashtags },
    meta: { reason, sql },
    status: "generated",
    createdAt: Date.now()
  });

  return { id: ref.id, sql, reason, rowsPreview: rows.slice(0, 5), caption: cap.caption };
}
