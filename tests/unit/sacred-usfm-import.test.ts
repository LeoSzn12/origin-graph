import { describe,expect,it } from "vitest";
import { parseUsfmBook } from "@/sacred-texts/usfm-import";

describe("USFM sacred-text parser",()=>{
  it("retains verse words while removing notes and markup",()=>{
    const parsed=parseUsfmBook("\\id GEN\n\\c 1\n\\p\n\\v 1 In the \\w beginning|lemma=abc\\w* God created.\\f + \\ft a note\\f*");
    expect(parsed.verses).toEqual([{bookKey:"genesis",bookLabel:"Genesis",chapter:1,verseStart:1,verseEnd:null,text:"In the beginning God created."}]);
  });

  it("retains combined verse ranges explicitly",()=>{
    const parsed=parseUsfmBook("\\id GEN\n\\c 1\n\\v 1-2 Combined text.");
    expect(parsed.verses[0]).toMatchObject({verseStart:1,verseEnd:2});
  });
});
