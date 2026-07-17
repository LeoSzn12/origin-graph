import { describe,expect,it } from "vitest";
import { assertSafeExternalUrl,isPrivateAddress,normalizeExternalUrl } from "@/security/url-policy";
import { validateUpload } from "@/security/uploads";
import { validateCitationMarkers } from "@/research/ask-service";

describe("ingestion security",()=>{
  it("blocks local and private destinations",async()=>{
    expect(isPrivateAddress("127.0.0.1")).toBe(true);
    expect(isPrivateAddress("10.1.2.3")).toBe(true);
    expect(isPrivateAddress("::1")).toBe(true);
    await expect(assertSafeExternalUrl("http://127.0.0.1/admin")).rejects.toThrow(/PRIVATE_NETWORK_BLOCKED/);
    await expect(assertSafeExternalUrl("file:///etc/passwd")).rejects.toThrow(/UNSAFE_URL_PROTOCOL/);
  });
  it("normalizes tracking parameters without changing the source path",()=>{
    expect(normalizeExternalUrl("HTTPS://Example.org:443/a?utm_source=x&item=1#part")).toBe("https://example.org/a?item=1");
  });
  it("rejects unsafe uploads",()=>{
    expect(()=>validateUpload({name:"payload.svg",type:"image/svg+xml",size:100})).toThrow(/UPLOAD_TYPE_BLOCKED/);
    expect(()=>validateUpload({name:"../note.txt",type:"text/plain",size:100})).toThrow(/UPLOAD_NAME_INVALID/);
  });
});

describe("citation grounding",()=>{
  const citations=[{citation_id:"C1",source_id:"s",passage_id:"p",locator:"line 1",display_label:"Source"}];
  it("accepts mapped factual sentences",()=>expect(()=>validateCitationMarkers("A reviewed statement [C1].",citations)).not.toThrow());
  it("rejects uncited or invented citation markers",()=>{
    expect(()=>validateCitationMarkers("An uncited factual sentence.",citations)).toThrow(/CITATION_VALIDATION_FAILED/);
    expect(()=>validateCitationMarkers("A statement [C9].",citations)).toThrow(/CITATION_VALIDATION_FAILED/);
  });
});

