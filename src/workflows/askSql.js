import { col } from "../dataAdapters/firestore.js";
import { listTables, tableSchema, quickStats, qDuck } from "../dataAdapters/dataExec.js";
import { nl2sql, summarizeRows } from "../ai.js";

export async function askSQL(prompt) {
  // Build a minimal, cached profile (use previous discovery if you want)
  const tableNames = (await listTables()).slice(0, 12);
  const profile = [];
  for (const t of tableNames) {
    const schema = await tableSchema(t);
    const stats  = await quickStats(t);
    profile.push({ table: t, schema, stats });
  }

  // NL → SQL
  const plan = await nl2sql({ prompt, profile });
  const { sql, reason } = plan;

  // Run
  const rows = await qDuck(sql);

  // Summarize to content
  const title = prompt;
  const cap = await summarizeRows({ title, rows });

  // Save draft like other flows
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
