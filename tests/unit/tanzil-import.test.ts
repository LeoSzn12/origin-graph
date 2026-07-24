import { describe,expect,it } from "vitest";
import { parseTanzilQuran,quranAyahCounts } from "@/sacred-texts/tanzil-import";

describe("Tanzil Quran integrity parser",()=>{
  it("refuses a partial text",()=>{
    expect(()=>parseTanzilQuran("1|1|بِسْمِ ٱللَّهِ")).toThrow(/expected 6236/);
  });

  it("does not normalize or alter Arabic verse text before validation",()=>{
    const source=quranAyahCounts.flatMap((count,surah)=>Array.from({length:count},(_,ayah)=>
      `${surah+1}|${ayah+1}|${surah===0&&ayah===0?"بِسْمِ  ٱللَّهِ":"x"}`)).join("\n");
    expect(parseTanzilQuran(source)[0].text).toBe("بِسْمِ  ٱللَّهِ");
  });
});
