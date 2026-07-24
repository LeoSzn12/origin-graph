import { describe,expect,it } from "vitest";
import { buildSacredSensemaking, type SacredCoverage } from "@/sacred-texts/sensemaking";

function coverage(groupCount:number):SacredCoverage{
  const groups=Array.from({length:groupCount},(_,index)=>({
    key:`group-${index}`,
    label:`Group ${index+1}`,
    matching_passages:10,
    distinct_references:8,
    editions:1
  }));
  return{
    matching_passages:groups.reduce((sum,group)=>sum+group.matching_passages,0),
    distinct_references:groups.reduce((sum,group)=>sum+group.distinct_references,0),
    shown_passages:Math.min(groupCount*10,39),
    text_groups_with_matches:groups.length,
    groups
  };
}

describe("sacred text sensemaking",()=>{
  it("treats five-group flood recurrence as a broad pattern, not historical proof",()=>{
    const result=buildSacredSensemaking({normalizedQuery:"flood",concept:"flood",coverage:coverage(5)});
    expect(result.signal).toBe("broad_recurrence");
    expect(result.bottom_line).toMatch(/establishes recurrence/i);
    expect(result.bottom_line).toMatch(/does not.*historical probability/i);
    expect(result.explanations.map(item=>item.title)).toEqual(expect.arrayContaining([
      "A shared or inherited story",
      "Memories of regional disasters",
      "One large historical event",
      "Symbolic or theological reuse"
    ]));
    expect(JSON.stringify(result)).not.toMatch(/\b\d{1,3}%\b/);
  });

  it("marks source independence and external corroboration as unresolved",()=>{
    const result=buildSacredSensemaking({normalizedQuery:"creation",concept:"creation",coverage:coverage(4)});
    expect(result.measures.find(item=>item.key==="independence")?.value).toBe("Unresolved");
    expect(result.measures.find(item=>item.key==="external_corroboration")?.value).toBe("Not included");
  });

  it("provides a useful framework for an unknown query",()=>{
    const result=buildSacredSensemaking({normalizedQuery:"sacred mountains",concept:null,coverage:coverage(3)});
    expect(result.signal).toBe("partial_recurrence");
    expect(result.explanations).toHaveLength(3);
    expect(result.explanations[0].interpretation).toContain("sacred mountains");
  });

  it("does not turn no results into evidence of absence",()=>{
    const result=buildSacredSensemaking({normalizedQuery:"unknown",concept:null,coverage:coverage(0)});
    expect(result.signal).toBe("no_match");
    expect(result.bottom_line).toMatch(/not proof.*absent/i);
  });
});
