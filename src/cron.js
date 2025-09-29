import cron from 'node-cron';
import { doPlanning } from './workflows/plan.js';
import { generateContent } from './workflows/generate.js';
import { queueForPublish, publishDue } from './workflows/schedule.js';

console.log('Worker started');

// Every day 08:00 IST: refresh/extend plan (server runs UTC; adjust as you prefer)
cron.schedule('30 2 * * *', async () => {
  await doPlanning({ inputs: { focus: ['AC','Safes','Electronics'], states: ['MH','DL','GJ'] } });
});

// Every hour : generate content for newly planned items
cron.schedule('5 * * * *', async () => {
  await generateContent();
  await queueForPublish();
});

// Every 10 min: publish due
cron.schedule('*/10 * * * *', async () => {
  await publishDue(Date.now());
});
