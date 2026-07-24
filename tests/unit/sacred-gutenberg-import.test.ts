import { describe,expect,it } from "vitest";
import { parseArnoldGita,parseCharlesEnoch,parseRodwellQuran } from "@/sacred-texts/gutenberg-import";

const wrap=(body:string)=>`*** START OF THE PROJECT GUTENBERG EBOOK TEST ***\n${body}\n*** END OF THE PROJECT GUTENBERG EBOOK TEST ***`;

describe("structured sacred-text Gutenberg parsers",()=>{
  it("rejects an incomplete Quran instead of presenting it as complete",()=>{
    expect(()=>parseRodwellQuran(wrap("SURA I.-OPENING [I.]\nMECCA.-7 Verses\nA line"))).toThrow(/expected 114/);
  });

  it("rejects an incomplete Bhagavad Gita instead of silently dropping chapters",()=>{
    expect(()=>parseArnoldGita(wrap("CHAPTER I\nArjuna spoke."))).toThrow(/expected 18/);
  });

  it("rejects an incomplete Enoch transcription",()=>{
    expect(()=>parseCharlesEnoch(wrap("THE BOOK OF ENOCH I-XXXVI.\nI. 1. The words"))).toThrow(/at least 100/);
  });
});
