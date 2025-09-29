const banned = ['politics','religion','claims of guaranteed profit'];

export function sanitize(text) {
  let t = text.replace(/\s+\s/g,' ').trim();
  if (t.length > 2000) t = t.slice(0, 2000);
  return t;
}

export function passesPolicy(text) {
  const lt = text.toLowerCase();
  return !banned.some(b => lt.includes(b));
}
