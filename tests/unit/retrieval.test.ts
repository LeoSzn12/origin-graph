import type { Pool } from "pg";
import { describe, expect, it, vi } from "vitest";
import { analyzeQuestion, PostgresHybridRetriever } from "@/research/retrieval";

describe("Ask retrieval precision", () => {
  it("removes question scaffolding and requires every meaningful concept", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const pool = { query } as unknown as Pool;

    const analysis = analyzeQuestion("Did the battle of Troy really happen?");
    expect(analysis.terms).toEqual(["battle", "troy"]);

    await new PostgresHybridRetriever(pool).retrieveClaimIds("Did the battle of Troy really happen?");
    expect(query).toHaveBeenCalledOnce();
    expect(query.mock.calls[0][1][0]).toBe("battle:* & troy:*");
  });

  it("keeps curated synonyms in one alternative term group", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const pool = { query } as unknown as Pool;

    await new PostgresHybridRetriever(pool).retrieveClaimIds("Was Atlantis real?");
    expect(query.mock.calls[0][1][0]).toBe("(atlantis:* | timaeus:* | critias:*)");
  });

  it("does not turn comparison framing into required historical concepts", () => {
    expect(analyzeQuestion("Compare reported sacred-teacher roles without collapsing traditions").terms)
      .toEqual(["teacher"]);
  });
});
