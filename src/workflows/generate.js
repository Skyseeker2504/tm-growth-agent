import { col, markStatus } from '../dataAdapters/firestore.js';

export async function generateContent() {
  // fetch up to 20 planned items and "generate" captions (already present)
  const snap = await col('calendar').where('status', '==', 'planned').limit(20).get();
  for (const d of snap.docs) {
    await markStatus(d.id, 'generated');
  }
  return { generated: snap.size };
}

export default { generateContent };
