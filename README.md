# iiif-search-demo

A small Cloudflare Worker that answers [IIIF Content Search API 2.0](https://iiif.io/api/search/2.0/) queries for a few demo manifests.

It walks a manifest (Manifest -> Canvas/Scene -> embedded `annotations` pages) and returns the non-painting annotations (for example `commenting`) whose text matches the query. Matched annotations are copied verbatim.

## Endpoint

```
GET /search/<key>?q=<terms>
```

- Returns an `AnnotationPage` (`@context` `http://iiif.io/api/search/2/context.json`).
- Terms are separated by whitespace; an annotation matches if every term occurs in its text (TextualBody values and labels, all languages, HTML stripped). Matching is case-insensitive and NFKC-normalised.
- Missing or empty `q`: 400 with a JSON error. Unknown key: 404.
- CORS is open (`Access-Control-Allow-Origin: *`).
- The manifest is cached for about 10 minutes.
- Not implemented: autocomplete, and the optional `annotations` array of highlights.

Example: `https://iiif-search-demo.ldas.jp/search/ueno?q=上野`

## Add a manifest

Add an entry to `src/config.ts`:

```ts
export const MANIFESTS = {
  ueno: "https://nakamura196.github.io/hongo-campus-iiif/ueno.json",
  mykey: "https://example.org/manifest.json",
};
```

Then reference it from the manifest with a `service` of type `SearchService2` whose `id` is `https://iiif-search-demo.ldas.jp/search/mykey`.

## Develop and deploy

```
npm ci
npm test
npx tsc --noEmit
npm run dev      # local, http://localhost:8787
npm run deploy   # wrangler deploy (custom domain iiif-search-demo.ldas.jp)
```

## License

MIT, see [LICENSE](LICENSE).
