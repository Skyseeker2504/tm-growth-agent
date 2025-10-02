import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

import { engageRouter } from './workflows/engage.js';
import { doPlanning } from './workflows/plan.js';
import { generateContent } from './workflows/generate.js';
import { queueForPublish, publishDue } from './workflows/schedule.js';
import { draftEngagementAd } from './workflows/ads.js';
import { askAndDraft } from "./workflows/nlpAsk.js";

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '2mb' }));

app.get('/', (_req, res) => res.send('OK'));
app.get('/health', (_req, res) => res.json({ ok: true, time: Date.now() }));

app.use('/engage', engageRouter);

app.post('/plan', async (req, res) => {
  try {
    const count = await doPlanning({ inputs: req.body || {} });
    res.json({ ok: true, planned: count });
  } catch (e) {
    console.error('PLAN error', e);
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

app.post('/generate', async (_req, res) => {
  try {
    await generateContent();
    res.json({ ok: true });
  } catch (e) {
    console.error('GENERATE error', e);
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

app.post('/queue', async (_req, res) => {
  try {
    await queueForPublish();
    res.json({ ok: true });
  } catch (e) {
    console.error('QUEUE error', e);
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

app.post('/publish', async (_req, res) => {
  try {
    await publishDue(Date.now());
    res.json({ ok: true });
  } catch (e) {
    console.error('PUBLISH error', e);
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

app.post('/ads/draft', async (req, res) => {
  try {
    const { message = 'Top tenders this week. Try 7-day trial.' } = req.body || {};
    const ids = await draftEngagementAd({ message });
    res.json({ ok: true, created: ids });
  } catch (e) {
    console.error('ADS error', e);
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

app.post("/ask", async (req, res) => {
  try {
    const { prompt } = req.body || {};
    const { askAndDraft } = await import("./workflows/nlpAsk.js");

    const drafted = await askAndDraft(prompt || "Top categories please");

    // 🔒 Always JSON (never send raw text/markdown)
    res.status(200).json({ ok: true, drafted });
  } catch (e) {
    console.error("ASK error", e);
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});


const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log('TM Growth Agent running on', PORT));
