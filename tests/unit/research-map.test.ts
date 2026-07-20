import { describe, expect, it } from "vitest";
import { projectMapPoint } from "@/components/research-map";

describe("research map fallback", () => {
  it("projects longitude and latitude into the fallback canvas", () => {
    expect(projectMapPoint([0, 0])).toEqual({ left: "50%", top: "50%" });
    expect(projectMapPoint([-180, 90])).toEqual({ left: "0%", top: "0%" });
    expect(projectMapPoint([180, -90])).toEqual({ left: "100%", top: "100%" });
  });
});
