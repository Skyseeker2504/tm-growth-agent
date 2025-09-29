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
    const body = req.body;
    // Parse comment events → very abbreviated (expand for IG, messages, etc.)
    // For demo, assume we get {commentId, text}
    const faqs = await getFAQs();
    const found = faqs.find(f => req.body.text?.toLowerCase().includes(f.trigger));
    if (found) {
      await replyToComment(body.commentId, found.reply);
    } else {
      await replyToComment(body.commentId, `Thanks! Tell us your category & state. We'll DM a free sample.\n${process.env.WHATSAPP_DEEPLINK}`);
    }
    res.sendStatus(200);
  } catch (e) {
    res.sendStatus(200);
  }
});
