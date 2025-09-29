import { postToFacebook, postImageToInstagram } from '../meta.js';
import { col } from '../dataAdapters/firestore.js';
import { markStatus } from '../dataAdapters/firestore.js';

export async function queueForPublish() {
  const gen = await col('calendar').where('status','==','generated').limit(20).get();
  for (const d of gen.docs) {
    await d.ref.update({ status: 'queued' });
  }
}

export async function publishDue(now=Date.now()) {
  const due = await col('calendar')
    .where('status','==','queued')
    .where('scheduledAt','<=', now).get();

  for (const d of due.docs) {
    const item = { id: d.id, ...d.data() };
    try {
      // Simple: same caption for FB + IG; image_url optional (use your CDN or skip to FB text post)
      const caption = item.payload.caption + '\n' + (item.payload.hashtags || '');
      // Facebook text+link (if any)
      await postToFacebook({ message: caption, link: item.link });
      // Instagram (needs image_url). If you don't have one, skip or add a brand image URL.
      if (item.image_url) {
        await postImageToInstagram({ image_url: item.image_url, caption });
      }
      await markStatus(item.id, 'published');
    } catch (e) {
      await markStatus(item.id, 'failed', { reason: String(e.message || e) });
    }
  }
}
