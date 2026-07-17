import { describe, expect, it } from "vitest";
import { dateIntervalSchema } from "@/domain/validation";
import { temporalRoles } from "@/domain/types";

describe("temporal role validation", () => {
  it("keeps all chronology roles distinct", () => {
    expect(new Set(temporalRoles).size).toBe(7);
    expect(temporalRoles).toEqual(expect.arrayContaining([
      "event_claimed_date", "composition_date", "witness_date", "edition_date",
      "observation_date", "phenomenon_date"
    ]));
  });

  it("rejects reversed ranges and unexplained phenomenon dates", () => {
    const base = {
      earliestYear: 100,
      latestYear: 50,
      role: "phenomenon_date" as const,
      displayLabel: "synthetic range",
      eraSystem: "astronomical_year",
      precision: "range"
    };
    const result = dateIntervalSchema.safeParse(base);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toEqual(expect.arrayContaining([
        "earliestYear must be <= latestYear",
        "phenomenon_date requires a dating method"
      ]));
    }
  });
});
