// Pure functions: manifest walking, text extraction, matching, response building.
/* eslint-disable @typescript-eslint/no-explicit-any */

export type Json = any;

export const SEARCH_CONTEXT = "http://iiif.io/api/search/2/context.json";

export function normalize(s: string): string {
  return s.normalize("NFKC").toLowerCase();
}

export function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, "&");
}

export function splitTerms(q: string): string[] {
  return normalize(q).split(/\s+/).filter(Boolean);
}

const asArray = (v: Json): Json[] => (v == null ? [] : Array.isArray(v) ? v : [v]);

/** Values of a language map ({"ja":["a"],"en":["b"]}) in all languages. */
function languageMapValues(m: Json): string[] {
  if (!m || typeof m !== "object") return [];
  return Object.values(m).flatMap((v) => asArray(v).filter((x) => typeof x === "string"));
}

/** Text of an annotation: TextualBody values (any body shape) plus label, HTML stripped. */
export function annotationTexts(anno: Json): string[] {
  const out: string[] = [];
  const visit = (b: Json) => {
    if (!b || typeof b !== "object") return;
    if (b.type === "TextualBody" && typeof b.value === "string") out.push(b.value);
    if (b.type === "Choice" || b.type === "List") asArray(b.items).forEach(visit);
  };
  asArray(anno.body).forEach(visit);
  out.push(...languageMapValues(anno.label));
  return out.map((t) => stripHtml(t).replace(/\s+/g, " ").trim()).filter(Boolean);
}

/** Non-painting annotations that can hold searchable text. */
function isSearchable(anno: Json): boolean {
  const m = asArray(anno.motivation);
  if (m.length === 0) return true;
  return !m.every((x) => x === "painting" || x === "georeferencing");
}

/** Walk Manifest -> items (Canvas/Scene) -> annotations (embedded AnnotationPages). */
export function collectAnnotations(manifest: Json): Json[] {
  const out: Json[] = [];
  for (const container of asArray(manifest?.items)) {
    for (const page of asArray(container?.annotations)) {
      for (const anno of asArray(page?.items)) {
        if (anno && typeof anno === "object" && isSearchable(anno)) out.push(anno);
      }
    }
  }
  return out;
}

export function matches(anno: Json, terms: string[]): boolean {
  if (terms.length === 0) return false;
  const text = normalize(annotationTexts(anno).join("\n"));
  return terms.every((t) => text.includes(t));
}

export function search(manifest: Json, q: string): Json[] {
  const terms = splitTerms(q);
  return collectAnnotations(manifest).filter((a) => matches(a, terms));
}

export function buildResponse(requestUrl: string, items: Json[]): Json {
  return {
    "@context": SEARCH_CONTEXT,
    id: requestUrl,
    type: "AnnotationPage",
    items,
  };
}
