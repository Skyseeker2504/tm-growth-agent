import { generateCaption, reelScript } from '../ai.js';
import { col } from '../dataAdapters/firestore.js';
import { sanitize, passesPolicy } from '../guardrails.js';

export async function generateContent() {
  const snap = await col('calendar').where('status','==','planned').limit(10).get();
  for (const doc of snap.docs) {
    const item = { id: doc.id, ...doc.data() };
    let captionPack = await generateCaption({ title: item.title, dataPoints: item.data || {} });
    let caption = sanitize(captionPack.caption || '');
    if (!passesPolicy(caption)) {
      await doc.ref.update({ status: 'failed', reason: 'policy' });
      continue;
    }
    let payload = { caption, hashtags: captionPack.hashtags || '' };

    if (item.type === 'reel') {
      const script = await reelScript({ topic: item.title, bullets: (item.data && item.data.points) || [] });
      payload.reelScript = script.script;
    }
    await doc.ref.update({ status: 'generated', payload });
  }
}
