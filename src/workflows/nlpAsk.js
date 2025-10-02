// src/workflows/nlpAsk.js
import { col } from "../dataAdapters/firestore.js";
import { topCategories30, topStates60, servicesVsGoodsQuarter, priceBenchmark } from "../dataAdapters/dataExec.js";
import { generateCaption, reelScript } from "../dataAdapters/tenders.js";

function asINR(n){ return "₹" + Math.round(+n||0).toLocaleString("en-IN"); }

export async function askAndDraft(prompt) {
  const text = (prompt || "").toLowerCase();
  const items = [];

  if (text.includes("top categories")) {
    const rows = await topCategories30();
    items.push({
      type: "carousel",
      title: "Top product categories (last 30 days)",
      data: rows.map(r => ({ label: r.name, spend: asINR(r.spend), orders: r.orders }))
    });
  }

  if (text.includes("top states") || text.includes("state leaders")) {
    const rows = await topStates60();
    items.push({
      type: "carousel",
      title: "States leading procurement (last 60 days)",
      data: rows.map(r => ({ label: r.state, spend: asINR(r.spend), orders: r.orders }))
    });
  }

  if (text.includes("services vs goods")) {
    const rows = await servicesVsGoodsQuarter();
    items.push({
      type: "image",
      title: "Services vs Goods — last quarter",
      data: rows.map(r => ({ label: r.type, spend: asINR(r.amount), orders: r.orders }))
    });
  }

  const m = text.match(/benchmark (for )?(.+)/);
  if (m) {
    const item = m[2].trim();
    const rows = await priceBenchmark(item, 12);
    items.push({
      type: "image",
      title: `Price benchmark — ${item} (12 months)`,
      data: rows
    });
  }

  if (!items.length) {
    const rows = await topCategories30();
    items.push({
      type: "carousel",
      title: "Top product categories (last 30 days)",
      data: rows.map(r => ({ label: r.name, spend: asINR(r.spend), orders: r.orders }))
    });
  }

  const out = [];
  for (const it of items) {
    const cap = await generateCaption({ title: it.title, dataPoints: it.data });
    const payload = { caption: cap.caption, hashtags: cap.hashtags || "#tenders #GeM #CPPP #MSME #procurement" };

    if (it.type === "reel") {
      const script = await reelScript({ topic: it.title, bullets: it.data?.map(d => `${d.label}: ${d.spend || d.orders||""}`) || [] });
      payload.reelScript = script.script;
    }

    const ref = await col("calendar").add({
      type: it.type,
      title: it.title,
      data: it.data,
      payload,
      status: "generated",     // ready for /queue → /publish
      createdAt: Date.now()
    });
    out.push({ id: ref.id, ...it, payload });
  }
  return out;
}
