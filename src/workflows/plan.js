// Simple planner: seeds N items with daily schedule
import { saveCalendar } from '../dataAdapters/firestore.js';

export async function doPlanning({ inputs = {} } = {}) {
  const {
    days = 7,
    goal = 'Leads for trials/reports',
    focus = ['Safes', 'AC', 'Electronics'],
    states = ['MH', 'DL', 'GJ']
  } = inputs;

  const start = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const items = Array.from({ length: days }).map((_, i) => ({
    status: 'planned',
    scheduledAt: start + i * dayMs,
    link: 'https://tendermanagers.com/login',
    payload: {
      caption: `(${goal}) Day ${i + 1} — Focus: ${focus[i % focus.length]}, States: ${states.join(', ')}`,
      hashtags: '#tenders #B2B #India'
    },
    image_url: null
  }));

  return await saveCalendar(items);
}

export default { doPlanning };
