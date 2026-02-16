import type { WebsiteOwnerNameParsed } from "./types.ts";

const GUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function parseWebsiteOwnerName(
  ownerName: string,
): WebsiteOwnerNameParsed {
  const s = ownerName.trim();
  const plusIdx = s.indexOf("+");
  if (plusIdx <= 0) return {};

  const sub = s.slice(0, plusIdx).trim();
  const seg = s.slice(plusIdx + 1).trim();

  const out: WebsiteOwnerNameParsed = {
    ...(GUID_RE.test(sub) ? { subscriptionId: sub } : {}),
    ...(seg !== "" ? { ownerSegment: seg } : {}),
  };

  // Heuristic:
  // Example seen in the wild:
  //   "<subId>+RG-SOMETHING-WestEuropewebspace"
  // We'll try: split by last '-' and strip trailing "webspace".
  const lower = seg.toLowerCase();
  if (lower.endsWith("webspace")) {
    const withoutWebspace = seg.slice(0, seg.length - "webspace".length);
    const lastDash = withoutWebspace.lastIndexOf("-");
    if (lastDash > 0) {
      const rgCand = withoutWebspace.slice(0, lastDash).trim();
      const regionCand = withoutWebspace.slice(lastDash + 1).trim();
      out.inferred = {
        ...(rgCand ? { resourceGroupCandidate: rgCand } : {}),
        ...(regionCand ? { regionCandidate: regionCand } : {}),
      };
    }
  }

  return out;
}
