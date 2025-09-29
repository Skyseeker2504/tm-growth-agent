import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function planCalendar({ goal = 'Grow to 5k followers & leads', inputs }) {
  const sys = `You are a B2B growth strategist for TenderManagers. Create a 30-day FB+IG calendar.`;
  const user = `
Goal: ${goal}
Inputs: ${JSON.stringify(inputs).slice(0, 4000)}
Constraints: B2B tone, India, 1–2 posts/day/platform, 3 stories/week, 1 reel/week, strong CTAs.
Output JSON: [{day:1,type:"carousel|image|reel|story", title, caption, hashtags, cta, link, needsImage:true/false}] (30 items)
`;
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
    temperature: 0.7
  });
  return JSON.parse(res.choices[0].message.content);
}

export async function generateCaption({ title, dataPoints }) {
  const sys = `You write concise, persuasive B2B captions for FB/IG.`;
  const user = `
Title: ${title}
Data points: ${JSON.stringify(dataPoints)}
Tone: Helpful, numbers-first, CTA to trial/reports.
Return: { caption, hashtags }
`;
  const r = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
    temperature: 0.7
  });
  return JSON.parse(r.choices[0].message.content);
}

export async function reelScript({ topic, bullets }) {
  const sys = `You write 20s reel scripts with hook -> value -> CTA.`;
  const user = `Topic: ${topic}\nBullets: ${bullets.join(' | ')}\nReturn JSON {script}`;
  const r = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
    temperature: 0.8
  });
  return JSON.parse(r.choices[0].message.content);
}
