import { describe, expect, it } from "vitest";
import {
  buildAtlantisProfile,
  buildTroyProfile,
  gradeEvidenceGame,
  TROY_CITATIONS,
} from "@/domain/evidence-game";

describe("evidence game", () => {
  it("scores research reasoning without producing a truth probability", () => {
    const result = gradeEvidenceGame({
      inference: "textual-report",
      independence: "zero-witnesses",
      chronology: "edition-date",
      "next-evidence": "dated-site",
    });

    expect(result.playerScore).toBe(750);
    expect(result.maxScore).toBe(1000);
    expect(result.correctCount).toBe(3);
    expect(result.rank).toBe("Source critic");
    expect(JSON.stringify(result)).not.toMatch(/truth probability|likelihood/i);
  });

  it("describes triangulation dimensions instead of collapsing them", () => {
    const profile = buildAtlantisProfile({
      reviewedClaimCount: 1,
      reviewedSourceCount: 3,
      discoveryLeadCount: 6,
      physicalEvidenceCount: 0,
    });

    expect(profile).toHaveLength(5);
    expect(
      profile.find((item) => item.label === "Primary textual report")?.state,
    ).toBe("present");
    expect(
      profile.find((item) => item.label === "Material evidence")?.state,
    ).toBe("missing");
    expect(profile.at(-1)?.value).toBe(
      "Textually attested, historically unresolved",
    );
  });

  it("grades the Troy case independently from Atlantis", () => {
    const result = gradeEvidenceGame(
      {
        inference: "tradition-evidence",
        independence: "real-settlement",
        chronology: "context-not-proof",
        "next-evidence": "epic-certain",
      },
      "troy-historicity",
    );

    expect(result.playerScore).toBe(750);
    expect(result.correctCount).toBe(3);
    expect(result.results.at(-1)?.correctOptionId).toBe("layered-verdict");
  });

  it("keeps Troy's evidence lanes and source roles explicit", () => {
    const profile = buildTroyProfile();

    expect(
      profile.find((item) => item.label === "Settlement archaeology")?.state,
    ).toBe("present");
    expect(
      profile.find((item) => item.label === "Named events and people")?.state,
    ).toBe("missing");
    expect(profile.at(-1)?.value).toBe("Real city, unresolved war");
    expect(TROY_CITATIONS.map((citation) => citation.role)).toEqual([
      "primary text",
      "archaeology",
      "historical context",
      "critical synthesis",
    ]);
  });
});
