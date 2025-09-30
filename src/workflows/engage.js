import express from 'express';
import { replyToComment } from '../meta.js';
import { getFAQs } from '../dataAdapters/firestore.js';

export const engageRouter = express.Router();

// Meta webhook verification
engageRouter.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = 'tm_webhook_token';
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) return res.status(200).send(challenge);
  return res.sendStatus(403);
});

engageRouter.post('/webhook', async (req, res) => {
  try {
    const body = req.body || {};
    const text = String(body.text || '').toLowerCase();
    const faqs = await getFAQs();
    const found = faqs.find(f => text.includes(String(f.trigger || '').toLowerCase()));

    const reply = found?.reply || `Thanks! Tell us your category & state. We'll DM a free sample.\n${process.env.WHATSAPP_DEEPLINK || ''}`.trim();
    if (body.commentId) {
      await replyToComment(body.commentId, reply);
    }
    res.sendStatus(200);
  } catch (e) {
    console.error('ENGAGE webhook error', e);
    res.sendStatus(200);
  }
});

export default { engageRouter };
