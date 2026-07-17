import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const result = await db().query(
    `SELECT cf.*,coalesce(json_agg(cfo ORDER BY cfo.sort_order) FILTER (WHERE cfo.object_id IS NOT NULL),'[]') AS objects
     FROM case_files cf LEFT JOIN case_file_objects cfo ON cfo.case_file_id=cf.id
     WHERE cf.slug=$1 GROUP BY cf.id`, [slug]);
  if (!result.rows[0]) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Case file not found", details: {} } }, { status: 404 });
  if (request.nextUrl.searchParams.get("format") !== "markdown") return NextResponse.json(result.rows[0]);
  const file = result.rows[0];
  const markdown = `# ${file.title}\n\n## Core question\n\n${file.core_question}\n\n## Scope\n\n${file.scope ?? "Editorial scope pending."}\n\n## Evidence objects\n\n${file.objects.length ? file.objects.map((item: Record<string,string>) => `- ${item.object_type}: ${item.object_id}`).join("\n") : "No verified objects linked yet."}\n`;
  return new NextResponse(markdown, { headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": `attachment; filename="${file.slug}.md"` } });
}
