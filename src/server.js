import express from 'express';
import bodyParser from 'body-parser';
import { engageRouter } from './workflows/engage.js';
import { doPlanning } from './workflows/plan.js';
import { generateContent } from './workflows/generate.js';
import { queueForPublish, publishDue } from './workflows/schedule.js';
import { draftEngagementAd } from './workflows/ads.js';

const app = express();
app.use(bodyParser.json({ limit: '2mb' }));

app.use('/engage', engageRouter);

// One-shot endpoints (secure behind a secret in production)
app.post('/plan', async (req, res) => {
  const count = await doPlanning({ inputs: req.body || {} });
  res.json({ planned: count });
});

app.post('/generate', async (_req, res) => {
  await generateContent();
  res.json({ ok: true });
});

app.post('/queue', async (_req, res) => {
  await queueForPublish();
  res.json({ ok: true });
});

app.post('/publish', async (_req, res) => {
  await publishDue(Date.now());
  res.json({ ok: true });
});

app.post('/ads/draft', async (req, res) => {
  const { message = 'Top tenders this week. Try 7-day trial.' } = req.body || {};
  const ids = await draftEngagementAd({ message });
  res.json({ created: ids });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log('TM Growth Agent running on', PORT));
