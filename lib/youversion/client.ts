const API_BASE = "https://api.youversion.com/v1";

async function yvFetch(path: string, revalidateSeconds = 3600) {
  const key = process.env.YOUVERSION_APP_KEY;
  if (!key) {
    throw new Error("YOUVERSION_APP_KEY is not set");
  }
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "X-YVP-App-Key": key,
      Accept: "application/json",
    },
    next: { revalidate: revalidateSeconds },
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`YouVersion ${res.status}: ${errText.slice(0, 200)}`);
  }
  return (await res.json()) as unknown;
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractPassageText(json: unknown): string {
  if (typeof json !== "object" || json === null) return "";
  const r = json as Record<string, unknown>;
  const keys = ["content", "text", "body"] as const;
  for (const k of keys) {
    const v = r[k];
    if (typeof v === "string" && v.trim()) return stripHtml(v);
  }
  if (Array.isArray(r.passages)) {
    for (const item of r.passages) {
      const inner = extractPassageText(item);
      if (inner) return inner;
    }
  }
  if (typeof r.passage === "object" && r.passage !== null) {
    const inner = extractPassageText(r.passage);
    if (inner) return inner;
  }
  if (r.data && typeof r.data === "object") {
    return extractPassageText(r.data);
  }
  return "";
}

function pickReference(json: unknown, fallback: string): string {
  if (typeof json !== "object" || json === null) return fallback;
  const r = json as Record<string, unknown>;
  if (typeof r.reference === "string" && r.reference.trim()) return r.reference.trim();
  if (typeof r.human_reference === "string" && r.human_reference.trim()) {
    return r.human_reference.trim();
  }
  if (r.data && typeof r.data === "object") {
    const ref = pickReference(r.data, fallback);
    if (ref !== fallback || (r.data as Record<string, unknown>).reference) {
      return ref;
    }
  }
  return fallback;
}

function pickDeepLink(
  json: unknown,
  bibleId: number,
  passageId: string
): string | null {
  if (typeof json !== "object" || json === null) return null;
  const r = json as Record<string, unknown>;
  const urls = [
    r.canonical_url,
    r.canonicalUrl,
    r.deep_link,
    r.deepLink,
    r.url,
  ];
  for (const u of urls) {
    if (typeof u === "string" && u.startsWith("http")) return u;
  }
  return `https://www.bible.com/bible/${bibleId}/${passageId}`;
}

export type PassageResult = {
  reference: string;
  content: string;
  bibleId: number;
  deepLink: string | null;
  passageId: string;
};

export async function fetchVerseOfTheDayPassageId(dayOfYear: number): Promise<string> {
  const json = (await yvFetch(`/verse_of_the_days/${dayOfYear}`, 24 * 3600)) as Record<
    string,
    unknown
  >;
  const direct = typeof json.passage_id === "string" ? json.passage_id : null;
  if (direct) return direct;
  const data = json.data;
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0] as Record<string, unknown>;
    if (typeof first.passage_id === "string") return first.passage_id;
  }
  throw new Error("YouVersion verse_of_the_days returned no passage_id");
}

/**
 * Server-only: uses YOUVERSION_APP_KEY (never expose to the client).
 */
export async function fetchPassage(
  bibleId: number,
  passageId: string
): Promise<PassageResult> {
  const json = await yvFetch(`/bibles/${bibleId}/passages/${encodeURIComponent(passageId)}`);
  const content = extractPassageText(json);
  const reference = pickReference(json, passageId.replace(/\./g, " "));
  const deepLink = pickDeepLink(json, bibleId, passageId);

  return {
    reference,
    content,
    bibleId,
    deepLink,
    passageId,
  };
}
