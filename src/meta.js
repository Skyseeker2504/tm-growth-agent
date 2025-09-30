const hasMeta = !!process.env.META_SYSTEM_USER_TOKEN;

export async function postToFacebook({ message, link, scheduled_time, unpublished_content_type } = {}) {
  if (!hasMeta) {
    console.log('[FB stub] message:', message, 'link:', link, 'scheduled:', scheduled_time ? 'yes' : 'no');
    return { stub: true };
  }
  // TODO: real Graph API call using PAGE_ID and token
  console.log('[FB TODO] Would post to FB here.');
  return { ok: true };
}

export async function postImageToInstagram({ image_url, caption }) {
  if (!hasMeta) {
    console.log('[IG stub] image:', image_url, 'caption:', caption?.slice(0, 40));
    return { stub: true };
  }
  // TODO: real IG publish
  console.log('[IG TODO] Would post to IG here.');
  return { ok: true };
}

export async function replyToComment(commentId, text) {
  if (!hasMeta) {
    console.log('[Reply stub] commentId:', commentId, 'text:', text?.slice(0, 80));
    return { stub: true };
  }
  // TODO: real comment reply
  console.log('[Reply TODO] Would reply via Graph API.');
  return { ok: true };
}

export default { postToFacebook, postImageToInstagram, replyToComment };
