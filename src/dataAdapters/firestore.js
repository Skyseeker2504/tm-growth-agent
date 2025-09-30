// src/dataAdapters/firestore.js
import { Firestore } from '@google-cloud/firestore';

let db;

/**
 * Initialize Firestore using FIREBASE_JSON env (service account)
 * without relying on GOOGLE_APPLICATION_CREDENTIALS or auto-detect.
 */
function init() {
  if (db) return db;

  const raw = process.env.FIREBASE_JSON;
  if (!raw) {
    throw new Error('FIREBASE_JSON missing in env. Paste full service account JSON in Heroku Config Vars.');
  }

  let sa;
  try {
    sa = JSON.parse(raw);
  } catch (e) {
    throw new Error('FIREBASE_JSON is not valid JSON. Paste it exactly as downloaded (no escaping).');
  }

  const projectId = sa.project_id || process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) {
    throw new Error('No project_id found. Ensure your service account JSON contains "project_id".');
  }

  // Make sure private_key newlines are correct (Heroku usually keeps them intact via Dashboard UI)
  const client_email = sa.client_email;
  const private_key = sa.private_key;

  if (!client_email || !private_key) {
    throw new Error('Service account JSON must include client_email and private_key.');
  }

  // Explicit initialization so the SDK never tries to auto-detect
  db = new Firestore({
    projectId,
    credentials: { client_email, private_key },
    // optional: prefer long-lived keep-alives on Heroku
    preferRest: false,
  });

  // Also set process env so any other libs depending on it are happy
  process.env.GCLOUD_PROJECT = projectId;
  process.env.GOOGLE_CLOUD_PROJECT = projectId;

  return db;
}

export function col(name) {
  return init().collection(name);
}

export async function markStatus(id, status, extra = {}) {
  const ref = col('calendar').doc(id);
  await ref.set({ status, updatedAt: Date.now(), ...extra }, { merge: true });
  return { id, status };
}

// add near the other exports in firestore.js

export async function getFAQs() {
  // Returns [] if collection empty / not created
  const snapshot = await col('faqs').get();
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function upsertFAQ(id, data) {
  // helper (not required now)
  await col('faqs').doc(id).set({ ...data, updatedAt: Date.now() }, { merge: true });
  return { id, ok: true };
}

export default { init, col, markStatus };
