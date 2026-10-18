import { describe, expect, it } from "vitest";
import fixture from "./fixtures/ueno.json";
import {
  annotationTexts,
  buildResponse,
  collectAnnotations,
  normalize,
  search,
  splitTerms,
  stripHtml,
} from "../src/search";

describe("text helpers", () => {
  it("normalizes NFKC and lowercases", () => {
    expect(normalize("ＡＢＣ　Ｕｅｎｏ")).toBe("abc ueno");
  });
  it("splits terms on whitespace (incl. full-width)", () => {
    expect(splitTerms("上野　Station  ")).toEqual(["上野", "station"]);
  });
  it("strips HTML", () => {
    expect(stripHtml("<p>a &amp; <b>b</b></p>").replace(/\s+/g, " ").trim()).toBe("a & b");
  });
  it("collects body values and labels in all languages", () => {
    const texts = annotationTexts({
      label: { ja: ["駅"], en: ["Station"] },
      body: { type: "TextualBody", value: "<i>tall</i>" },
    });
    expect(texts).toEqual(["tall", "駅", "Station"]);
  });
});

describe("Scene-based manifest (ueno)", () => {
  it("walks Scene -> annotations and skips painting/georeferencing", () => {
    const all = collectAnnotations(fixture);
    expect(all.length).toBe(4);
    expect(all.every((a: any) => a.motivation.includes("commenting"))).toBe(true);
  });
  it("finds hits by label, copied verbatim", () => {
    const hits = search(fixture, "上野駅");
    const ids = hits.map((a: any) => a.id);
    expect(ids).toContain("https://nakamura196.github.io/hongo-campus-iiif/ueno.json#building-2");
    const original = collectAnnotations(fixture).find((a: any) => a.id === ids[0]);
    expect(hits[0]).toBe(original);
  });
  it("matches English labels case-insensitively and by body value", () => {
    expect(search(fixture, "ueno STATION").length).toBeGreaterThan(0);
    expect(search(fixture, "PLATEAU").length).toBe(4);
  });
  it("requires every term", () => {
    expect(search(fixture, "上野駅 zzzzzz")).toEqual([]);
  });
  it("returns nothing for empty terms", () => {
    expect(search(fixture, "   ")).toEqual([]);
  });
});

describe("buildResponse", () => {
  it("builds a Content Search 2.0 AnnotationPage", () => {
    const r = buildResponse("https://x/search/ueno?q=a", [{ id: "i" }]);
    expect(r).toEqual({
      "@context": "http://iiif.io/api/search/2/context.json",
      id: "https://x/search/ueno?q=a",
      type: "AnnotationPage",
      items: [{ id: "i" }],
    });
  });
});
