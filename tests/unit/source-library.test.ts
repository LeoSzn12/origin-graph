import { describe,expect,it } from "vitest";
import { filterSourceRecords, type SourceRecord } from "@/app/sources/page";

const records:SourceRecord[]=[
  {id:"1",source_edition_id:"e1",title:"Timaeus",input_type:"book_citation",status:"human_review",rights_lane:"green",created_at:"2026-01-01"},
  {id:"2",source_edition_id:"e2",title:"Younger Dryas dataset",input_type:"doi",status:"materialized",rights_lane:"yellow",created_at:"2026-01-01"}
];

describe("source library filtering",()=>{
  it("filters by human-readable title or source type",()=>{
    expect(filterSourceRecords(records,"timaeus","all").map(record=>record.id)).toEqual(["1"]);
    expect(filterSourceRecords(records,"doi","all").map(record=>record.id)).toEqual(["2"]);
  });

  it("combines search and workflow status without mutating the source list",()=>{
    expect(filterSourceRecords(records,"","materialized").map(record=>record.id)).toEqual(["2"]);
    expect(records).toHaveLength(2);
  });
});
