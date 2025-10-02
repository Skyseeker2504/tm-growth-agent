// src/dataAdapters/tenders.js
// Re-export caption writer from ai.js
export { generateCaption } from "../ai.js";

// Provide a simple reelScript so current imports don't crash.
// You can replace with your fancy version later.
export async function reelScript({ topic = "", bullets = [] }) {
  const lines = [
    `Hook: ${topic}`,
    ...bullets.map(b => `• ${b}`),
    "CTA: Try a 7-day trial at tendermanagers.com"
  ];
  return { script: lines.join("\n") };
}

