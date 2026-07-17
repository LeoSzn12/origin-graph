import sanitizeHtml from "sanitize-html";
import { assertSafeExternalUrl } from "./url-policy";

const maxBytes = 2_000_000;
const maxRedirects = 4;

export interface FetchedMetadata {
  finalUrl: string;
  title: string | null;
  description: string | null;
  mediaType: string;
  content: Uint8Array;
}

export async function safeFetchMetadata(rawUrl: string): Promise<FetchedMetadata> {
  let url = await assertSafeExternalUrl(rawUrl);
  for (let redirects = 0; redirects <= maxRedirects; redirects += 1) {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": "OriginGraph/0.1 (+source-review; metadata fetch)" }
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirects === maxRedirects) throw new Error("REDIRECT_BLOCKED: too many or invalid redirects");
      url = await assertSafeExternalUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok) throw new Error(`FETCH_FAILED: upstream returned ${response.status}`);
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > maxBytes) throw new Error("FETCH_TOO_LARGE: response exceeds metadata limit");
    const reader = response.body?.getReader();
    if (!reader) throw new Error("FETCH_EMPTY: response body is unavailable");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new Error("FETCH_TOO_LARGE: response exceeds metadata limit");
      }
      chunks.push(value);
    }
    const content = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { content.set(chunk, offset); offset += chunk.byteLength; }
    const mediaType = response.headers.get("content-type")?.split(";")[0] ?? "application/octet-stream";
    let title: string | null = null;
    let description: string | null = null;
    if (mediaType.includes("html")) {
      const html = new TextDecoder().decode(content);
      title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? null;
      description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)?.[1]?.trim() ?? null;
      title = title ? sanitizeHtml(title, { allowedTags: [], allowedAttributes: {} }) : null;
      description = description ? sanitizeHtml(description, { allowedTags: [], allowedAttributes: {} }) : null;
    }
    return { finalUrl: url.toString(), title, description, mediaType, content };
  }
  throw new Error("FETCH_FAILED: redirect loop");
}

