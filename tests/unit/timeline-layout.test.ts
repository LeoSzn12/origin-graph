import { describe, expect, it } from "vitest";
import { layoutTimelineItems, type TimelineItem } from "@/components/timeline-workspace";

function item(id:string, earliest:number, latest:number):TimelineItem {
  return {temporal_assertion_id:id,title:id,lane:"climate_geology",role:"phenomenon_date",earliest_year:earliest,latest_year:latest,display_label:id,confidence:"high",source_edition_id:null,source_title:null,locator_type:null,locator_value:null,tradition:null,culture:null};
}

describe("timeline interval layout",()=>{
  it("puts overlapping intervals on separate clickable rows",()=>{
    const positioned=layoutTimelineItems([item("long",10,80),item("inside",20,30),item("after",81,90)],year=>year);
    expect(positioned.map(entry=>entry.row)).toEqual([0,1,0]);
  });

  it("keeps point events visible with a minimum width",()=>{
    const [positioned]=layoutTimelineItems([item("point",50,50)],year=>year);
    expect(positioned.width).toBe(1.2);
  });
});
