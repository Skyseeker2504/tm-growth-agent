// src/ai.js
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MOCK = String(process.env.MOCK_OPENAI || "") === "1";

function coerceJSON(txt) {
  if (!txt) return null;
  // try parse whole
  try { return JSON.parse(txt); } catch {}
  // try first {...} block
  const m = txt.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

function fallbackCaption({ title = "", dataPoints = [] } = {}) {
  const bullets = (dataPoints || []).slice(0, 6).map(dp => {
    if (typeof dp === "string") return `• ${dp}`;
    if (dp && typeof dp === "object") {
      const [k, v] = Object.entries(dp)[0] || ["", ""];
      return `• ${k}: ${v}`;
    }
    return "• —";
  }).join("\n");
  return {
    caption: `${title}\n\n${bullets}\n\nStart your 7-day trial: https://tendermanagers.com`,
    hashtags: "#tenders #GeM #CPPP #MSME #procurement"
  };
}

function fallbackReel({ topic = "", bullets = [] } = {}) {
  return {
    script: [`Hook: ${topic}`, ...(bullets || []).map(b => `• ${b}`), "CTA: Try a 7-day trial at tendermanagers.com"].join("\n")
  };
}

export async function planCalendar({ goal = "Grow to 5k followers & leads", inputs }) {
  if (MOCK || !process.env.OPENAI_API_KEY) {
    return Array.from({ length: 30 }, (_, i) => ({
      day: i + 1, type: "image", title: `Day ${i + 1}: ${goal}`,
      caption: `Progress update for "${goal}". Start your 7-day trial.`,
      hashtags: "#tenders #GeM #CPPP #MSME #procurement",
      cta: "Start trial", link: "https://tendermanagers.com", needsImage: false
    }));
  }

  const user = `
Goal: ${goal}
Inputs: ${JSON.stringify(inputs).slice(0, 4000)}
Constraints: B2B tone, India, 1–2 posts/day/platform, 3 stories/week, 1 reel/week, strong CTAs.
Return STRICT JSON ONLY (no markdown): [{"day":1,"type":"carousel|image|reel|story","title":"...","caption":"...","hashtags":"...","cta":"...","link":"...","needsImage":true}]
  `.trim();

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        { role: "system", content: "Return STRICT JSON only. No markdown, no commentary." },
        { role: "user", content: user }
      ]
    });
    const txt = res.choices?.[0]?.message?.content || "";
    const parsed = coerceJSON(txt);
    return Array.isArray(parsed) ? parsed : (() => { throw new Error("Bad JSON"); })();
  } catch {
    return Array.from({ length: 30 }, (_, i) => ({
      day: i + 1, type: "image", title: `Day ${i + 1}: ${goal}`,
      caption: `Progress update for "${goal}". Start your 7-day trial.`,
      hashtags: "#tenders #GeM #CPPP #MSME #procurement",
      cta: "Start trial", link: "https://tendermanagers.com", needsImage: false
    }));
  }
}

export async function generateCaption({ title, dataPoints }) {
  if (MOCK || !process.env.OPENAI_API_KEY) return fallbackCaption({ title, dataPoints });

  const user = `
Title: ${title}
Data points: ${JSON.stringify(dataPoints)}
Tone: Helpful, numbers-first, CTA to trial/reports.
Return STRICT JSON ONLY (no markdown): {"caption":"...","hashtags":"..."}
  `.trim();

  try {
    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        { role: "system", content: "Return STRICT JSON only. No markdown, no commentary." },
        { role: "user", content: user }
      ]
    });
    const txt = r.choices?.[0]?.message?.content || "";
    const parsed = coerceJSON(txt) || fallbackCaption({ title, dataPoints });
    if (!parsed.caption) return fallbackCaption({ title, dataPoints });
    if (!parsed.hashtags) parsed.hashtags = "#tenders #GeM #CPPP #MSME #procurement";
    return parsed;
  } catch {
    return fallbackCaption({ title, dataPoints });
  }
}

export async function reelScript({ topic, bullets }) {
  if (MOCK || !process.env.OPENAI_API_KEY) return fallbackReel({ topic, bullets });

  const user = `Topic: ${topic}\nBullets: ${(bullets || []).join(" | ")}\nReturn STRICT JSON ONLY (no markdown): {"script":"..."}`;

  try {
    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.8,
      messages: [
        { role: "system", content: "Return STRICT JSON only. No markdown, no commentary." },
        { role: "user", content: user }
      ]
    });
    const txt = r.choices?.[0]?.message?.content || "";
    const parsed = coerceJSON(txt);
    return parsed?.script ? parsed : fallbackReel({ topic, bullets });
  } catch {
    return fallbackReel({ topic, bullets });
  }
}
