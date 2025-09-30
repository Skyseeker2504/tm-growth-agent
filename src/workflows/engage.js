// src/workflows/engage.js
import express from 'express';
import { replyToComment } from '../meta.js';
import { getFAQs } from '../dataAdapters/firestore.js';

export const engageRouter = express.Router();

// Simple webhook verification for Meta
engageRouter.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = 'tm_webhook_token';
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) return res.status(200).send(challenge);
  return res.sendStatus(403);
});

// Minimal example handler (comment auto-reply)
engageRouter.post('/webhook', async (req, res) => {
  try {
    const body = req.body || {};
    const text = (body.text || '').toLowerCase();
    const faqs = await getFAQs();
    const found = faqs.find(f => text.includes(String(f.trigger || '').toLowerCase()));

    if (found) {
      await replyToComment(body.commentId, found.reply);
    } else {
      const fallback = `Thanks! Tell us your category & state. We'll DM a free sample.\n${process.env.WHATSAPP_DEEPLINK || ''}`.trim();
      await replyToComment(body.commentId, fallback);
    }
    res.sendStatus(200);
  } catch (e) {
    // Don't let webhook crash your app
    console.error('ENGAGE webhook error', e);
    res.sendStatus(200);
  }
});

export default { engageRouter };
