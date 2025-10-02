// src/dataAdapters/dataExec.js
import axios from "axios";

const http = axios.create({
  baseURL: process.env.DATA_EXEC_URL,
  timeout: 30_000,
  headers: process.env.DATA_EXEC_TOKEN ? { "X-API-Key": process.env.DATA_EXEC_TOKEN } : {}
});

// Safe wrapper: never throw; returns [] on failure (useful for probes)
async function tryDuck(sql) {
  try {
    const { data } = await http.post("/duck", { sql });
    if (!data?.ok) throw new Error(data?.error || "duck error");
    return data.data || [];
  } catch (e) {
    console.warn("tryDuck failed:", e?.message || e, "\nSQL:", sql.slice(0, 200));
    return [];
  }
}

// Strict wrapper: throws on failure (use for core flows)
export async function qDuck(sql) {
  const { data } = await http.post("/duck", { sql });
  if (!data?.ok) throw new Error(data?.error || "duck error");
  return data.data || [];
}

// ---------- Business queries (unchanged) ----------
export async function topCategories30() {
  return qDuck(`
    SELECT product_name AS name, SUM(total) AS spend, COUNT(*) AS orders
    FROM products
    WHERE contract_date >= current_date - INTERVAL 30 DAY
    GROUP BY 1 ORDER BY spend DESC LIMIT 10;
  `);
}

export async function topStates60() {
  return qDuck(`
    SELECT state, SUM(total) AS spend, COUNT(*) AS orders
    FROM state
    WHERE contract_date >= current_date - INTERVAL 60 DAY
    GROUP BY 1 ORDER BY spend DESC LIMIT 10;
  `);
}

export async function servicesVsGoodsQuarter() {
  return qDuck(`
    WITH q AS (
      SELECT * FROM services
      WHERE contract_date >= date_trunc('quarter', current_date) - INTERVAL 1 QUARTER
    ),
    g AS (
      SELECT * FROM products
      WHERE contract_date >= date_trunc('quarter', current_date) - INTERVAL 1 QUARTER
    )
    SELECT 'Services' AS type, SUM(total) AS amount, COUNT(*) AS orders FROM q
    UNION ALL
    SELECT 'Goods' AS type, SUM(total) AS amount, COUNT(*) AS orders FROM g;
  `);
}

export async function priceBenchmark(item, months = 12) {
  item = item.replace(/'/g, "''");
  return qDuck(`
    WITH allrows AS (
      SELECT contract_date, product_name AS item, unit_price FROM ministry
      UNION ALL
      SELECT contract_date, product_name AS item, unit_price FROM state
      UNION ALL
      SELECT contract_date, service_name AS item, unit_price FROM services
    )
    SELECT date_trunc('month', CAST(contract_date AS DATE)) AS month,
           median(unit_price) AS median_unit_price,
           count(*) AS n
    FROM allrows
    WHERE lower(item) = lower('${item}')
      AND contract_date >= dateadd('month', -${months}, current_date)
    GROUP BY 1 ORDER BY 1;
  `);
}

// ---------- Discovery helpers (hardened) ----------

// list tables (dedup)
export async function listTables() {
  const rows = await tryDuck(`
    SELECT DISTINCT table_name AS name
    FROM information_schema.tables
    WHERE table_schema = 'main'
    ORDER BY 1;
  `);
  return rows.map(r => r.name);
}

// describe columns of a table (never throw)
export async function tableSchema(table) {
  const t = table.replace(/'/g, "''");
  return await tryDuck(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = '${t}'
    ORDER BY ordinal_position;
  `);
}

// quick stats per table — *all parts guarded* (no throws)
export async function quickStats(table) {
  const t = table.replace(/'/g, "''");

  // Detect a date-like column
  const cand = await tryDuck(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name='${t}' AND lower(data_type) LIKE '%date%'
    ORDER BY ordinal_position LIMIT 1;
  `);
  const dateCol = cand?.[0]?.column_name || null;

  // Count
  const cnt = await tryDuck(`SELECT COUNT(*) AS rows FROM "${t}";`);
  const rows = cnt?.[0]?.rows ?? 0;

  // Date range if available
  let daterange = null;
  if (dateCol) {
    const r = await tryDuck(`
      SELECT MIN("${dateCol}") AS min_date, MAX("${dateCol}") AS max_date
      FROM "${t}";
    `);
    daterange = r?.[0] || null;
  }

  // Tiny sample: only *column names* of first few rows to avoid heavy payload / parse issues
  let sample = [];
  const s = await tryDuck(`SELECT * FROM "${t}" LIMIT 3;`);
  if (Array.isArray(s) && s.length) {
    const cols = Object.keys(s[0]);
    sample = [cols];
  }

  return { rows, dateCol, daterange, sample };
}
