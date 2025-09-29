import { planCalendar } from '../ai.js';
import { saveCalendar } from '../dataAdapters/firestore.js';

export async function doPlanning({ inputs }) {
  const plan = await planCalendar({ inputs });
  // Add scheduling timestamps (9:30 & 18:30 IST) for next 30 days
  const base = Date.now();
  const dayMs = 24*60*60*1000;
  const IST = 5.5*60*60*1000;
  const scheduled = plan.map((item, i) => {
    const date = new Date(base + i*dayMs);
    const times = [9.5, 18.5]; // hours local
    const when = new Date(date.getFullYear(), date.getMonth(), date.getDate(), (i%2?18:9), (i%2?30:30)).getTime() - IST;
    return { ...item, scheduledAt: when, status: 'planned' };
  });
  await saveCalendar(scheduled);
  return scheduled.length;
}
