import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
}
const db = admin.firestore();

export const col = (name) => db.collection(name);

// Calendars: items queued with status: 'planned' | 'generated' | 'queued' | 'published' | 'failed'
export async function saveCalendar(items) {
  const batch = db.batch();
  items.forEach(item => {
    const ref = col('calendar').doc();
    batch.set(ref, { ...item, status: 'planned', createdAt: Date.now() });
  });
  await batch.commit();
}

export async function listDueQueue(now = Date.now()) {
  const snap = await col('calendar')
    .where('status','==','queued')
    .where('scheduledAt','<=', now)
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function markStatus(id, status, extra={}) {
  await col('calendar').doc(id).update({ status, ...extra, updatedAt: Date.now() });
}

export async function getFAQs() {
  const snap = await col('faqs').get();
  return snap.docs.map(d => d.data());
}
