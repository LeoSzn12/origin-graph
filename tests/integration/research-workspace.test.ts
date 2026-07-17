import type { Pool } from "pg";
import { afterAll,beforeAll,beforeEach,describe,expect,it } from "vitest";
import { migrate } from "../../scripts/migrate";
import { AskService } from "@/research/ask-service";
import { SourceInputService } from "@/ingestion/source-input-service";
import { resetTestData,testPool } from "../helpers";

let pool:Pool;
beforeAll(async()=>{await migrate("up");pool=testPool();});
beforeEach(async()=>resetTestData(pool));
afterAll(async()=>pool.end());

describe("research workspace",()=>{
  it("registers a manual source idempotently and leaves rights yellow",async()=>{
    const service=new SourceInputService(pool);
    const input={input_type:"book_citation" as const,title:"SYNTHETIC Manual Citation",citation:"SYNTHETIC citation, locator 1.",safe_summary:"Test-only summary.",case_file_slugs:[]};
    const first=await service.materializeManual(input,"tester");
    const second=await service.materializeManual(input,"tester");
    expect(second.id).toBe(first.id);
    expect(first.status).toBe("human_review");
    const edition=await pool.query("SELECT rights_lane,review_status,publication_allowed FROM source_editions WHERE id=$1",[first.source_edition_id]);
    expect(edition.rows[0]).toEqual({rights_lane:"yellow",review_status:"draft",publication_allowed:false});
  });

  it("stores transcript segments and draft claims as modern discourse",async()=>{
    const record=await new SourceInputService(pool).registerTranscript({title:"SYNTHETIC Show",episode_title:"SYNTHETIC Episode",language:"en",provenance:"user_provided",rights_lane:"yellow",case_file_slugs:[],segments:[{locator:"00:01–00:02",safe_summary:"A synthetic speaker statement.",start_ms:1000,end_ms:2000,speaker:"SYNTHETIC Guest",speaker_confidence:.9,text_confidence:.8}]},"tester");
    const result=await pool.query(`SELECT c.evidence_role,c.review_status,ms.start_ms::int,ms.end_ms::int,ms.transcript_provenance,ms.rights_lane
      FROM claims c JOIN passages p ON p.id=c.passage_id JOIN media_segments ms ON ms.passage_id=p.id WHERE p.source_edition_id=$1`,[record.source_edition_id]);
    expect(result.rows[0]).toEqual({evidence_role:"modern_discourse",review_status:"draft",start_ms:1000,end_ms:2000,transcript_provenance:"user_provided",rights_lane:"yellow"});
  });

  it("returns grounded citations only for published reviewed material",async()=>{
    const answer=await new AskService(pool).ask("synthetic claim");
    expect(answer.answer_status).not.toBe("insufficient");
    expect(answer.citations[0].locator).toContain("SYN 1.1");
    const absent=await new AskService(pool).ask("material that definitely does not exist");
    expect(absent.answer_status).toBe("insufficient");
    expect(absent.citations).toEqual([]);
  });

  it("never returns a mythical place as factual geometry",async()=>{
    const result=await pool.query(`SELECT place_kind,geometry IS NULL AS has_no_geometry FROM places WHERE preferred_name='SYNTHETIC Literary Place'`);
    expect(result.rows[0]).toEqual({place_kind:"literary",has_no_geometry:true});
  });
});
