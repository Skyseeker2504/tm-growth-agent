// src/workflows/schedule.js
import { postToFacebook, postImageToInstagram } from '../meta.js';
import { col } from '../dataAdapters/firestore.js';
import { markStatus } from '../dataAdapters/firestore.js';

const PREVIEW_ONLY = process.env.PREVIEW_ONLY === '1';
// How far in the future to schedule FB posts when previewing (seconds)
const PREVIEW_OFFSET_SECS = Number(process.env.PREVIEW_OFFSET_SECS || 2 * 60 * 60); // default +2h
// Optional cap per publish cycle to avoid blasting too many at once
const PUBLISH_BATCH_LIMIT = Number(process.env.PUBLISH_BATCH_LIMIT || 25);

/**
 * Move up to 20 generated items into the queued state.
 * (You can call this via /queue endpoint or a cron.)
 */
export async function queueForPublish() {
  const gen = await col('calendar')
    .where('status', '==', 'generated')
    .limit(20)
    .get();

  for (const d of gen.docs) {
    await d.ref.update({ status: 'queued' });
  }
}

/**
 * Publish (or schedule if PREVIEW_ONLY) content that is due.
 * - FB: posts text+optional link
 *   - In preview mode, creates a scheduled (unpublished) post in the future.
 * - IG: posts only if image_url is present.
 * Firestore status:
 *   - live publish: status -> 'published'
 *   - preview/scheduled: keep 'queued' + note (so you can re-run or cancel)
 */
export async function publishDue(now = Date.now()) {
  // Fetch items that are queued and due (scheduledAt <= now)
  // NOTE: scheduledAt is expected to be a JS timestamp (ms).
  const snapshot = await col('calendar')
    .where('status', '==', 'queued')
    .where('scheduledAt', '<=', now)
    .limit(PUBLISH_BATCH_LIMIT)
    .get();

  if (snapshot.empty) return;

  for (const d of snapshot.docs) {
    const item = { id: d.id, ...d.data() };

    try {
      // Defensive reads
      const payload = item?.payload || {};
      const baseCaption = payload?.caption || '';
      const hashtags = payload?.hashtags || '';
      const caption = [baseCaption, hashtags].filter(Boolean).join('\n');

      // --- Facebook ---
      if (PREVIEW_ONLY) {
        // Schedule as unpublished draft in the future so you can review/cancel
        // FB expects epoch seconds, not ms
        const scheduled_time_secs = Math.floor(Date.now() / 1000) + PREVIEW_OFFSET_SECS;

        await postToFacebook({
          message: caption,
          link: item?.link, // optional
          scheduled_time: scheduled_time_secs,
          unpublished_content_type: 'SCHEDULED',
        });

        // Keep as queued so you can re-run or cancel; add a note for visibility
        await markStatus(item.id, 'queued', {
          note: `FB scheduled draft (+${Math.round(PREVIEW_OFFSET_SECS / 60)} min)`,
          lastAction: 'scheduled_fb_draft',
          lastActionAt: Date.now(),
        });
      } else {
        // Immediate publish
        await postToFacebook({
          message: caption,
          link: item?.link, // optional
        });
      }

      // --- Instagram (only if there is an image URL) ---
      if (item?.image_url) {
        await postImageToInstagram({
          image_url: item.image_url,
          caption,
        });
      }

      // Finalize status only when NOT in preview
      if (!PREVIEW_ONLY) {
        await markStatus(item.id, 'published', {
          lastAction: 'published_fb' + (item?.image_url ? '_ig' : ''),
          lastActionAt: Date.now(),
        });
      }
    } catch (e) {
      await markStatus(item.id, 'failed', {
        reason: String(e?.message || e),
        lastAction: 'error_publish',
        lastActionAt: Date.now(),
      });
    }
  }
}

export default { queueForPublish, publishDue };
