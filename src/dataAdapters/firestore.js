// src/dataAdapters/firestore.js
import { Firestore } from '@google-cloud/firestore';

let db;

/**
 * Initialize Firestore from FIREBASE_JSON explicitly (no auto-detect).
 */
function init() {
  if (db) return db;

  const raw = process.env.FIREBASE_JSON;
  if (!raw) throw new Error('FIREBASE_JSON missing. Paste full service account JSON in Heroku Config Vars.');

  let sa;
  try { sa = JSON.parse(raw); }
  catch { throw new Error('FIREBASE_JSON is not valid JSON. Paste it exactly as downloaded.'); }

  const projectId = sa.project_id || process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) throw new Error('No project_id found in service account JSON.');

  const { client_email, private_key } = sa;
  if (!client_email || !private_key) throw new Error('Service account JSON must include client_email and private_key.');

  db = new Firestore({
    projectId,
    credentials: { client_email, private_key },
  });

  process.env.GCLOUD_PROJECT = projectId;
  process.env.GOOGLE_CLOUD_PROJECT = projectId;
  return db;
}

export function col(name) {
  return init().collection(name);
}

/**
 * saveCalendar(items)
 * Writes/merges an array of calendar items into 'calendar' collection.
 * Each item gets an id if missing. Returns count written.
 */
export async function saveCalendar(items = []) {
  const database = init();
  const batch = database.batch();
  const now = Date.now();

  for (const it of items) {
    const id = it.id || col('calendar').doc().id;
    const ref = col('calendar').doc(id);
    batch.set(
      ref,
      {
        id,
        status: it.status || 'planned',
        scheduledAt: it.scheduledAt ?? now,
        payload: it.payload || {},
        link: it.link || null,
        image_url: it.image_url || null,
        updatedAt: now,
      },
      { merge: true }
    );
  }

  await batch.commit();
  return items.length;
}

/** markStatus(id, status, extra?) */
export async function markStatus(id, status, extra = {}) {
  const ref = col('calendar').doc(id);
  await ref.set({ id, status, updatedAt: Date.now(), ...extra }, { merge: true });
  return { id, status };
}

/** FAQs helpers so engage.js can import safely */
export async function getFAQs() {
  const snapshot = await col('faqs').get();
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function upsertFAQ(id, data) {
  await col('faqs').doc(id).set({ ...data, updatedAt: Date.now() }, { merge: true });
  return { id, ok: true };
}

export default { init, col, saveCalendar, markStatus, getFAQs, upsertFAQ };
