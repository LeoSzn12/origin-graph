import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { CaseFileService } from "@/domain/services";
import { apiError, requestActor } from "@/http";

const schema = z.object({ slug: z.string().regex(/^[a-z0-9-]+$/), title: z.string().min(1), core_question: z.string().min(3) });

export async function GET() {
  const result = await db().query(
    `SELECT cf.*,count(cfo.object_id)::int AS object_count
     FROM case_files cf LEFT JOIN case_file_objects cfo ON cfo.case_file_id=cf.id
     GROUP BY cf.id ORDER BY cf.title`);
  return NextResponse.json({ case_files: result.rows });
}

export async function POST(request: NextRequest) {
  try {
    const input = schema.parse(await request.json());
    const id = await new CaseFileService(db()).createShell({ slug: input.slug, title: input.title, coreQuestion: input.core_question, actor: requestActor(request) });
    return NextResponse.json({ id, ...input }, { status: 201 });
  } catch (error) { return apiError(error); }
}

