// src/dataAdapters/tenders.js
import { generateCaption as gen } from "../ai.js";

// Always return an object with caption + hashtags
export async function generateCaption(args = {}) {
  const out = await gen(args);
  if (typeof out === "string") {
    return { caption: out, hashtags: "#tenders #GeM #CPPP #MSME #procurement" };
  }
  return {
    caption: out?.caption || "",
    hashtags: out?.hashtags || "#tenders #GeM #CPPP #MSME #procurement"
  };
}

// Simple reel script helper so imports never break
export async function reelScript({ topic = "", bullets = [] } = {}) {
  const lines = [
    `Hook: ${topic}`,
    ...bullets.map(b => `• ${b}`),
    "CTA: Try a 7-day trial at tendermanagers.com"
  ];
  return { script: lines.join("\n") };
}
