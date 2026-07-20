import { describe,expect,it } from "vitest";
import { buildEvidenceSynthesis } from "@/research/ask-service";

describe("buildEvidenceSynthesis",()=>{
  it("separates cross-source patterns from unresolved certainty",()=>{
    const synthesis=buildEvidenceSynthesis({claimCount:4,familyCount:2,timelineCount:3,supportCount:1,challengeCount:1,graphEdges:[{connection_type:"shares_motif",from_type:"claim",to_type:"motif",explanation:"The reviewed claims share a motif.",confidence:"medium"}],uncertainties:["The setting is not independently verified."]});
    expect(synthesis.conclusion).toContain("contested");
    expect(synthesis.established).toEqual(expect.arrayContaining(["4 reviewed claims are linked across 2 independent source families."]));
    expect(synthesis.connections[0]).toMatchObject({label:"shares motif",path:"claim → motif",confidence:"medium"});
    expect(synthesis.unresolved).toContain("The setting is not independently verified.");
  });

  it("does not pretend an empty corpus has a conclusion",()=>{
    const synthesis=buildEvidenceSynthesis({claimCount:0,familyCount:0,timelineCount:0,supportCount:0,challengeCount:0,graphEdges:[],uncertainties:["No reviewed claims matched."]});
    expect(synthesis.conclusion).toBe("The reviewed corpus cannot form a synthesis yet.");
    expect(synthesis.established).toEqual([]);
    expect(synthesis.unresolved).toEqual(["No reviewed claims matched."]);
  });
});
