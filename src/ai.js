// src/ai.js
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const MOCK = String(process.env.MOCK_OPENAI || "") === "1";

// Always return { caption, hashtags }
export async function generateCaption({ title = "", dataPoints = [] } = {}) {
  // Simple local generator
  const fallback = () => {
    const bullets = (dataPoints || [])
      .slice(0, 6)
      .map(dp => {
        if (typeof dp === "string") return `• ${dp}`;
        if (dp && typeof dp === "object") {
          const first = Object.entries(dp)[0] || [];
          return `• ${first[0] ?? ""}: ${first[1] ?? ""}`;
        }
        return "• —";
      })
      .join("\n");

    const caption =
`${title}

${bullets}

Start your 7-day trial: https://tendermanagers.com
#tenders #GeM #CPPP #MSME #procurement`;

    return { caption, hashtags: "#tenders #GeM #CPPP #MSME #procurement" };
  };

  // If no API key or mock enabled → fallback
  if (MOCK || !OPENAI_API_KEY) return fallback();

  // Try OpenAI; if anything goes wrong, fallback safely.
  try {
    const prompt =
`You are a marketing copywriter. Create a short social caption in ~2-3 lines for the post TITLE and DATAPOINTS.
Return STRICT JSON only: {"caption":"...","hashtags":"..."} with no markdown, no commentary.

TITLE: ${title}
DATAPOINTS:
${(dataPoints || []).map(d => JSON.stringify(d)).join("\n")}
CTA: Start a 7-day trial at tendermanagers.com
Primary hashtags: #tenders #GeM #CPPP #MSME #procurement`;

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.5,
        messages: [
          { role: "system", content: "Respond with strict JSON. No markdown. No extra text." },
          { role: "user", content: prompt }
        ]
      })
    });

    if (!r.ok) {
      // If you hit 429 etc., fall back
      return fallback();
    }

    const body = await r.json();
    const txt = body?.choices?.[0]?.message?.content?.trim() || "";
    // Model should have returned JSON. Parse defensively.
    let parsed;
    try {
      parsed = JSON.parse(txt);
    } catch {
      return fallback();
    }

    if (!parsed || typeof parsed !== "object" || !parsed.caption) return fallback();
    if (!parsed.hashtags) parsed.hashtags = "#tenders #GeM #CPPP #MSME #procurement";
    return parsed;
  } catch {
    return fallback();
  }
}
