import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const blockedHostnames = new Set(["localhost", "localhost.localdomain", "metadata.google.internal"]);

function isPrivateV4(address: string): boolean {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some(Number.isNaN)) return true;
  const [a, b] = octets;
  return a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224;
}

function isPrivateV6(address: string): boolean {
  const normalized = address.toLowerCase().split("%")[0];
  if (normalized === "::" || normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) return true;
  if (normalized.startsWith("::ffff:")) return isPrivateV4(normalized.slice(7));
  return false;
}

export function isPrivateAddress(address: string): boolean {
  const family = isIP(address);
  return family === 4 ? isPrivateV4(address) : family === 6 ? isPrivateV6(address) : true;
}

export async function assertSafeExternalUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("INVALID_URL: URL could not be parsed");
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("UNSAFE_URL_PROTOCOL: only HTTP and HTTPS are allowed");
  if (url.username || url.password) throw new Error("URL_CREDENTIALS_BLOCKED: embedded credentials are not allowed");
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (blockedHostnames.has(hostname) || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw new Error("PRIVATE_NETWORK_BLOCKED: local hostnames are not allowed");
  }
  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) throw new Error("PRIVATE_NETWORK_BLOCKED: private addresses are not allowed");
  } else {
    const addresses = await lookup(hostname, { all: true, verbatim: true });
    if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
      throw new Error("PRIVATE_NETWORK_BLOCKED: destination resolves to a private address");
    }
  }
  return url;
}

export function normalizeExternalUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|fbclid|gclid)/i.test(key)) url.searchParams.delete(key);
  }
  if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) url.port = "";
  return url.toString();
}

