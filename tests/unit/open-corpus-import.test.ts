import { describe,expect,it } from "vitest";
import { parseWorldEnglishBibleChapter } from "@/connectors/open-corpus-import";

describe("open corpus parsing",()=>{
  it("keeps exact verse boundaries and removes embedded footnote popups",()=>{
    const html=`<div class='p'><span class="verse" id="V1">1&nbsp;</span>First text<a href="#FN1" class="notemark">†<span class="popup">editorial note</span></a>. <span class="verse" id="V2">2&nbsp;</span>Second text.</div><ul class='tnav'>`;
    expect(parseWorldEnglishBibleChapter(html)).toEqual([{number:1,text:"First text."},{number:2,text:"Second text."}]);
  });
});
