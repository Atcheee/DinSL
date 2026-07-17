/**
 * SL site GIDs (e.g. 9091001000009115) exceed Number.MAX_SAFE_INTEGER.
 * JSON.parse / response.json() silently round them, so nearby stops collide.
 * Quote oversized integers before parsing.
 */
export const parseJsonPreservingLargeIntegers = <T>(raw: string): T => {
  const withQuotedLargeInts = raw.replace(/:\s*(-?\d{16,})\b/g, ':"$1"');
  return JSON.parse(withQuotedLargeInts) as T;
};
