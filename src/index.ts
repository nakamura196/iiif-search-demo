import { MANIFESTS } from "./config";
import { buildResponse, search } from "./search";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};
const TTL_SECONDS = 600;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS,
      "Content-Type": "application/ld+json;profile=\"http://iiif.io/api/search/2/context.json\"",
    },
  });
}

function error(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function loadManifest(url: string): Promise<unknown> {
  const cache = caches.default;
  const cacheKey = new Request(url);
  const hit = await cache.match(cacheKey);
  if (hit) return hit.json();
  const res = await fetch(url, { cf: { cacheTtl: TTL_SECONDS, cacheEverything: true } });
  if (!res.ok) throw new Error(`manifest fetch failed: ${res.status}`);
  const text = await res.text();
  await cache.put(
    cacheKey,
    new Response(text, {
      headers: { "Content-Type": "application/json", "Cache-Control": `max-age=${TTL_SECONDS}` },
    }),
  );
  return JSON.parse(text);
}

function home(origin: string): Response {
  const keys = Object.keys(MANIFESTS)
    .map((k) => `<li><code>${origin}/search/${k}?q=...</code> (${MANIFESTS[k]})</li>`)
    .join("");
  const html = `<!doctype html><meta charset="utf-8"><title>iiif-search-demo</title>
<h1>iiif-search-demo</h1>
<p>A small demo server for the <a href="https://iiif.io/api/search/2.0/">IIIF Content Search API 2.0</a>.
It searches the annotations of a few demo manifests.</p>
<ul>${keys}</ul>`;
  return new Response(html, { headers: { ...CORS, "Content-Type": "text/html; charset=utf-8" } });
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (request.method !== "GET" && request.method !== "HEAD") return error(405, "Method not allowed");
    const url = new URL(request.url);
    if (url.pathname === "/") return home(url.origin);
    const m = url.pathname.match(/^\/search\/([^/]+)\/?$/);
    if (!m) return error(404, "Not found");
    const manifestUrl = Object.hasOwn(MANIFESTS, m[1]) ? MANIFESTS[m[1]] : undefined;
    if (!manifestUrl) return error(404, `Unknown key: ${m[1]}`);
    const q = (url.searchParams.get("q") ?? "").trim();
    if (!q) return error(400, "Missing or empty query parameter: q");
    let manifest: unknown;
    try {
      manifest = await loadManifest(manifestUrl);
    } catch (e) {
      return error(502, e instanceof Error ? e.message : "manifest unavailable");
    }
    return json(buildResponse(request.url, search(manifest, q)));
  },
} satisfies ExportedHandler;
