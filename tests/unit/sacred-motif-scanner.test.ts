import { describe,expect,it } from "vitest";
import { detectSacredMotifs } from "@/sacred-texts/motif-scanner";

describe("sacred motif candidate scanner",()=>{
  it("can emit more than one candidate while keeping categories separate",()=>{
    const matches=detectSacredMotifs("The angels announced judgment, and the dead shall rise.");
    expect(matches.map(match=>match.definition.slug)).toEqual(expect.arrayContaining(["heavenly-beings","return-from-death"]));
  });

  it("does not convert modern alien wording into an ancient textual claim",()=>{
    expect(detectSacredMotifs("Aliens arrived from another planet.")).toEqual([]);
  });
});
