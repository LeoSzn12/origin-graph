import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const result = await db().query(
    `SELECT h.*,coalesce(json_agg(json_build_object('stance',ei.stance,'domain',ei.evidence_domain,
      'statement',c.statement,'locator',p.locator_value,'source',se.title)) FILTER (WHERE ei.id IS NOT NULL),'[]') AS evidence
     FROM hypotheses h LEFT JOIN evidence_items ei ON ei.hypothesis_id=h.id LEFT JOIN claims c ON c.id=ei.claim_id
     LEFT JOIN passages p ON p.id=c.passage_id LEFT JOIN source_editions se ON se.id=p.source_edition_id
     WHERE h.id=$1 GROUP BY h.id`, [id]);
  if (!result.rows[0]) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Hypothesis not found", details: {} } }, { status: 404 });
  if (request.nextUrl.searchParams.get("format") !== "markdown") return NextResponse.json(result.rows[0]);
  const h = result.rows[0] as Record<string, unknown> & { title: string; proposition: string; scope: string; evidence: { stance: string; statement: string; source: string; locator: string }[] };
  const markdown = `# ${h.title}\n\n## Proposition\n\n${h.proposition}\n\n## Scope\n\n${h.scope}\n\n## Evidence\n\n${h.evidence.map((item) => `- **${item.stance}**: ${item.statement} — ${item.source}, ${item.locator}`).join("\n")}\n`;
  return new NextResponse(markdown, { headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": `attachment; filename="hypothesis-${id}.md"` } });
}
