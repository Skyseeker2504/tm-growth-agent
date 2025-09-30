import { postToFacebook, postImageToInstagram } from '../meta.js';
import { col, markStatus } from '../dataAdapters/firestore.js';

const PREVIEW_ONLY = process.env.PREVIEW_ONLY === '1';
const PREVIEW_OFFSET_SECS = Number(process.env.PREVIEW_OFFSET_SECS || 2 * 60 * 60);
const PUBLISH_BATCH_LIMIT = Number(process.env.PUBLISH_BATCH_LIMIT || 25);

export async function queueForPublish() {
  const gen = await col('calendar').where('status','==','generated').limit(20).get();
  for (const d of gen.docs) await d.ref.update({ status: 'queued' });
}

export async function publishDue(now = Date.now()) {
  const snapshot = await col('calendar')
    .where('status','==','queued')
    .where('scheduledAt','<=', now)
    .limit(PUBLISH_BATCH_LIMIT)
    .get();

  if (snapshot.empty) return;

  for (const d of snapshot.docs) {
    const item = { id: d.id, ...d.data() };
    try {
      const payload = item?.payload || {};
      const caption = [payload.caption || '', payload.hashtags || ''].filter(Boolean).join('\n');

      if (PREVIEW_ONLY) {
        const scheduled_time = Math.floor(Date.now()/1000) + PREVIEW_OFFSET_SECS;
        await postToFacebook({ message: caption, link: item?.link, scheduled_time, unpublished_content_type: 'SCHEDULED' });
        await markStatus(item.id, 'queued', { note: `FB scheduled draft (+${Math.round(PREVIEW_OFFSET_SECS/60)} min)` });
      } else {
        await postToFacebook({ message: caption, link: item?.link });
      }

      if (item?.image_url) {
        await postImageToInstagram({ image_url: item.image_url, caption });
      }

      if (!PREVIEW_ONLY) await markStatus(item.id, 'published');
    } catch (e) {
      await markStatus(item.id, 'failed', { reason: String(e.message || e) });
    }
  }
}

export default { queueForPublish, publishDue };
