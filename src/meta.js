import axios from 'axios';
const GRAPH = 'https://graph.facebook.com/v19.0';

const token = process.env.META_SYSTEM_USER_TOKEN;
const PAGE_ID = process.env.META_PAGE_ID;
const IG_USER_ID = process.env.META_IG_USER_ID;
const AD_ACC = process.env.META_AD_ACCOUNT_ID;

const auth = { access_token: token };

export async function postToFacebook({ message, link, scheduled_time }) {
  const url = `${GRAPH}/${PAGE_ID}/feed`;
  const data = { message, ...auth };
  if (link) data.link = link;
  if (scheduled_time) {
    data.published = false;
    data.scheduled_publish_time = Math.floor(scheduled_time / 1000);
  }
  const { data: res } = await axios.post(url, new URLSearchParams(data));
  return res; // { id: post_id }
}

export async function postImageToInstagram({ image_url, caption }) {
  // 1) create media container
  const createUrl = `${GRAPH}/${IG_USER_ID}/media`;
  const { data: create } = await axios.post(createUrl, new URLSearchParams({
    image_url, caption, ...auth
  }));
  // 2) publish it
  const pubUrl = `${GRAPH}/${IG_USER_ID}/media_publish`;
  const { data: pub } = await axios.post(pubUrl, new URLSearchParams({
    creation_id: create.id, ...auth
  }));
  return pub; // { id: media_id }
}

export async function scheduleImageToInstagram({ image_url, caption, scheduled_time }) {
  // IG API doesn’t support true “schedule”; typical pattern: queue in Firestore then publish at time
  // We implement scheduling in cron.js by checking due items and calling postImageToInstagram at runtime.
  return { queued: true };
}

// Comments / replies
export async function replyToComment(commentId, message) {
  const url = `${GRAPH}/${commentId}/comments`;
  const { data } = await axios.post(url, new URLSearchParams({ message, ...auth }));
  return data;
}

// === Ads: create PAUSED drafts ===
export async function createCampaign({ name, objective = 'ENGAGEMENT' }) {
  const url = `${GRAPH}/act_${AD_ACC}/campaigns`;
  const { data } = await axios.post(url, new URLSearchParams({
    name, objective, status: 'PAUSED', ...auth
  }));
  return data; // { id: campaign_id }
}

export async function createAdSet({
  name, campaign_id, daily_budget = 70000, // ₹700 in paise
  start_time, end_time, optimization_goal = 'POST_ENGAGEMENT',
  billing_event = 'IMPRESSIONS'
}) {
  const url = `${GRAPH}/act_${AD_ACC}/adsets`;
  const { data } = await axios.post(url, new URLSearchParams({
    name, campaign_id, daily_budget, optimization_goal, billing_event,
    status: 'PAUSED',
    start_time, end_time,
    targeting: JSON.stringify({
      geo_locations: { countries: ['IN'] },
      interests: [{ id: '6003139266461', name: 'Small and medium-sized enterprises' }]
    }),
    ...auth
  }));
  return data; // { id: adset_id }
}

export async function createAdCreative({ page_id = PAGE_ID, message, image_hash }) {
  const url = `${GRAPH}/act_${AD_ACC}/adcreatives`;
  const { data } = await axios.post(url, new URLSearchParams({
    name: `TM Creative ${Date.now()}`,
    object_story_spec: JSON.stringify({
      page_id,
      link_data: { message, image_hash, link: process.env.TRIAL_URL }
    }),
    ...auth
  }));
  return data; // { id: creative_id }
}

export async function createAd({ name, adset_id, creative_id }) {
  const url = `${GRAPH}/act_${AD_ACC}/ads`;
  const { data } = await axios.post(url, new URLSearchParams({
    name, adset_id, creative: JSON.stringify({ creative_id }), status: 'PAUSED', ...auth
  }));
  return data; // { id: ad_id }
}
