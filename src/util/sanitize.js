// Make any JS value safe to write into Firestore JSON
export function sanitizeForFirestore(value, depth = 0) {
  if (depth > 6) return null; // avoid crazy nesting

  if (value === null) return null;

  const t = typeof value;

  if (t === "string") {
    // trim huge strings to keep docs small
    return value.length > 5000 ? value.slice(0, 5000) + "…" : value;
  }

  if (t === "number") {
    if (!Number.isFinite(value)) return null; // NaN/Infinity -> null
    return value;
  }

  if (t === "boolean") return value;

  if (t === "bigint") {
    // Firestore can’t store BigInt; store as string
    return value.toString();
  }

  if (t === "object") {
    // Dates → ISO
    if (value instanceof Date) return value.toISOString();

    // Buffers / typed arrays → base64 string
    if (typeof Buffer !== "undefined" && Buffer.isBuffer?.(value)) {
      return value.toString("base64");
    }
    if (value?.byteLength !== undefined && value?.buffer !== undefined) {
      try {
        return Buffer.from(value).toString("base64");
      } catch { return null; }
    }

    // Arrays → sanitize each element
    if (Array.isArray(value)) {
      return value.map(v => sanitizeForFirestore(v, depth + 1));
    }

    // Plain object → sanitize each property, drop undefined / functions
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) continue;
      if (typeof v === "function") continue;
      out[k] = sanitizeForFirestore(v, depth + 1);
    }
    return out;
  }

  // functions/symbol/undefined
  return null;
}
