import { createCampaign, createAdSet, createAdCreative, createAd } from '../meta.js';

export async function draftEngagementAd({ message }) {
  const camp = await createCampaign({ name: 'TM_Engagement_Boost', objective: 'ENGAGEMENT' });
  const adset = await createAdSet({
    name: 'IN_MSME_Procurement',
    campaign_id: camp.id,
    daily_budget: 70000, // ₹700
    optimization_goal: 'POST_ENGAGEMENT',
    start_time: new Date(Date.now()+3600*1000).toISOString()
  });
  // Creative: to keep MVP simple, use a Page story spec with message only (or add image hash later)
  const creative = await createAdCreative({ message });
  const ad = await createAd({ name: 'TM_Engagement_Post', adset_id: adset.id, creative_id: creative.id });
  return { campaign: camp.id, adset: adset.id, ad: ad.id };
}
