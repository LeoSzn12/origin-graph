import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { CaseFileService } from "@/domain/services";
import { apiError, requestActor } from "@/http";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const result = await db().query(
    `SELECT cf.*,
      coalesce((SELECT json_agg(cfo ORDER BY cfo.sort_order) FROM case_file_objects cfo WHERE cfo.case_file_id=cf.id),'[]') AS objects,
      coalesce((SELECT json_agg(cfq ORDER BY cfq.created_at) FROM case_file_queries cfq WHERE cfq.case_file_id=cf.id),'[]') AS saved_queries,
      coalesce((SELECT json_agg(json_build_object('id',c.id,'statement',c.statement,'claim_class',c.claim_class,'evidence_role',c.evidence_role,'directness',c.directness,'interpretation_level',c.interpretation_level,'uncertainty_note',c.uncertainty_note,'locator',p.locator_value,'source_id',se.id,'source_title',se.title) ORDER BY c.created_at) FROM case_file_objects cfo JOIN claims c ON cfo.object_type='claim' AND c.id=cfo.object_id LEFT JOIN passages p ON p.id=c.passage_id LEFT JOIN source_editions se ON se.id=p.source_edition_id WHERE cfo.case_file_id=cf.id AND c.review_status='published'),'[]') AS claims,
      coalesce((SELECT json_agg(DISTINCT jsonb_build_object('id',se.id,'title',se.title,'evidence_role',se.evidence_role,'rights_lane',se.rights_lane,'rights_note',se.rights_note,'license_name',se.license_name,'canonical_url',se.canonical_url,'review_status',se.review_status,'full_text_allowed',se.full_text_publication_allowed)) FROM case_file_objects cfo JOIN source_editions se ON cfo.object_type='source_edition' AND se.id=cfo.object_id WHERE cfo.case_file_id=cf.id AND se.review_status IN ('approved','published')),'[]') AS sources,
      coalesce((SELECT json_agg(json_build_object('id',m.id,'label',m.label,'definition',m.definition)) FROM case_file_objects cfo JOIN motifs m ON cfo.object_type='motif' AND m.id=cfo.object_id WHERE cfo.case_file_id=cf.id),'[]') AS motifs,
      coalesce((SELECT json_agg(json_build_object('id',h.id,'title',h.title,'proposition',h.proposition,'state',h.state,'alternatives',h.alternatives)) FROM case_file_objects cfo JOIN hypotheses h ON cfo.object_type='hypothesis' AND h.id=cfo.object_id WHERE cfo.case_file_id=cf.id),'[]') AS hypotheses,
      coalesce((SELECT json_agg(cfr ORDER BY cfr.revision_number DESC) FROM case_file_revisions cfr WHERE cfr.case_file_id=cf.id),'[]') AS revisions,
      coalesce((SELECT json_agg(json_build_object('id',er.id,'title',er.title,'provider',sp.display_name,'provider_key',sp.provider_key,'record_type',er.record_type,'canonical_url',er.canonical_url,'date_label',er.date_label,'creators',er.creators,'rights_lane',er.rights_lane,'rights_note',er.rights_note,'safe_summary',er.safe_summary,'review_status',cfer.review_status,'relevance_note',cfer.relevance_note) ORDER BY sp.display_name,er.title) FROM case_file_external_records cfer JOIN external_records er ON er.id=cfer.external_record_id JOIN source_providers sp ON sp.id=er.source_provider_id WHERE cfer.case_file_id=cf.id),'[]') AS source_candidates,
      coalesce((SELECT json_build_object('candidates',count(*),'providers',count(DISTINCT er.source_provider_id),'green',count(*) FILTER (WHERE er.rights_lane='green'),'yellow',count(*) FILTER (WHERE er.rights_lane='yellow')) FROM case_file_external_records cfer JOIN external_records er ON er.id=cfer.external_record_id WHERE cfer.case_file_id=cf.id),'{}') AS discovery_summary
     FROM case_files cf WHERE cf.slug=$1`, [slug]);
  if (!result.rows[0]) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Case file not found", details: {} } }, { status: 404 });
  return NextResponse.json(result.rows[0]);
}

const patchSchema = z.object({ title:z.string().min(1).optional(), core_question:z.string().min(3).optional(), summary:z.string().min(3).optional(), scope:z.string().min(3).optional(), reason:z.string().min(3) });

export async function PATCH(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const input = patchSchema.parse(await request.json());
    const revision = await new CaseFileService(db()).revise({ slug, title:input.title, coreQuestion:input.core_question, summary:input.summary, scope:input.scope, reason:input.reason, actor:requestActor(request) });
    return NextResponse.json({ revision });
  } catch (error) { return apiError(error); }
}
