import { describe,expect,it } from "vitest";
import { providerRegistry } from "@/connectors/registry";

describe("source provider registry",()=>{
  it("covers text, archaeology, scholarly, geography, and deep-time evidence",()=>{
    const kinds=new Set(providerRegistry.map((provider)=>provider.kind));
    expect(kinds).toEqual(new Set(["text_corpus","scholarly_index","museum_archive","archaeology","geography","paleoclimate","paleoecology"]));
  });
  it("does not enable a credentialed connector without its credential gate",()=>{
    for(const provider of providerRegistry.filter((item)=>["api_key","client_credentials"].includes(item.access))){
      expect(provider.enabled).toBe(false);
      expect(provider.environmentKey).toBeTruthy();
    }
  });
  it("keeps edition-sensitive sacred corpora out of the green lane",()=>{
    for(const key of ["sefaria","quran_foundation","tanzil","perseus","ctext","gretil","bdrc","sat"]){
      expect(providerRegistry.find((provider)=>provider.key===key)?.rightsLane).toBe("yellow");
    }
  });
});
