import { describe,expect,it } from "vitest";
import { analyzeSacredQuery,sacredMatchExcerpt } from "@/sacred-texts/search";

describe("sacred text query analysis",()=>{
  it("expands a reviewed concept without losing the user's term",()=>{
    const result=analyzeSacredQuery("giants");
    expect(result.concept).toBe("giants");
    expect(result.terms).toEqual(expect.arrayContaining(["giants","nephilim","watchers"]));
    expect(result.suggested_grade).toBe("general_motif");
  });

  it("labels alien framing as speculative and searches source-native vocabulary",()=>{
    const result=analyzeSacredQuery("aliens");
    expect(result.suggested_grade).toBe("speculative_interpretation");
    expect(result.terms).toEqual(expect.arrayContaining(["angel","jinn","deva","vimana"]));
    expect(result.terms).not.toContain("aliens");
    expect(result.note).toMatch(/speculative/i);
  });

  it.each(["alien","extraterrestrial beings","UFOs"])("maps %s to the cautious celestial-being concept",query=>{
    const result=analyzeSacredQuery(query);
    expect(result.concept).toBe("aliens");
    expect(result.terms).not.toEqual(expect.arrayContaining(["alien","aliens","extraterrestrial","ufos"]));
  });

  it("keeps an unknown query bounded and searchable",()=>{
    const result=analyzeSacredQuery("people rising from the dead");
    expect(result.concept).toBeNull();
    expect(result.terms.length).toBeLessThanOrEqual(20);
    expect(result.terms).toContain("rising");
  });

  it("bounds long chapter translations around the actual match",()=>{
    const excerpt=sacredMatchExcerpt(`${"before ".repeat(100)}flood${" after".repeat(100)}`,["flood"],160);
    expect(excerpt.text.length).toBeLessThanOrEqual(162);
    expect(excerpt.text).toContain("flood");
    expect(excerpt.matched_terms).toEqual(["flood"]);
  });
});
