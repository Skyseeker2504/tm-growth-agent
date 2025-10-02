// src/dataAdapters/dataExec.js
import axios from "axios";

const http = axios.create({
  baseURL: process.env.DATA_EXEC_URL,
  headers: process.env.DATA_EXEC_TOKEN ? { "X-API-Key": process.env.DATA_EXEC_TOKEN } : {}
});

export async function qDuck(sql) {
  const { data } = await http.post("/duck", { sql });
  if (!data?.ok) throw new Error(data?.error || "duck error");
  return data.data || [];
}

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
      SELECT * FROM services WHERE contract_date >= date_trunc('quarter', current_date) - INTERVAL 1 QUARTER
    ),
    g AS (
      SELECT * FROM products WHERE contract_date >= date_trunc('quarter', current_date) - INTERVAL 1 QUARTER
    )
    SELECT 'Services' AS type, SUM(total) AS amount, COUNT(*) AS orders FROM q
    UNION ALL
    SELECT 'Goods' AS type, SUM(total) AS amount, COUNT(*) AS orders FROM g;
  `);
}

export async function priceBenchmark(item, months=12) {
  item = item.replace(/'/g,"''");
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
