import type { Pool } from "pg";

export interface Citation {
  citation_id: string;
  source_id: string;
  passage_id: string;
  locator: string;
  display_label: string;
}

export interface AskResponse {
  answer: string;
  answer_status: "grounded" | "partial" | "insufficient";
  source_statements: Record<string, unknown>[];
  interpretations: Record<string, unknown>[];
  supporting_evidence: Record<string, unknown>[];
  challenging_evidence: Record<string, unknown>[];
  uncertainties: string[];
  timeline_items: Record<string, unknown>[];
  citations: Citation[];
  source_counts: { passages: number; works: number; traditions: number; source_families: number };
  suggested_hypothesis: null;
}

export function validateCitationMarkers(answer: string, citations: Citation[]): void {
  const available = new Set(citations.map((citation) => citation.citation_id));
  const sentences = answer.split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter(Boolean);
  for (const sentence of sentences) {
    if (sentence === "Not enough reviewed source material." || sentence.startsWith("Uncertainty:")) continue;
    const markers = [...sentence.matchAll(/\[([A-Z]\d+)\]/g)].map((match) => match[1]);
    if (markers.length === 0 || markers.some((marker) => !available.has(marker))) {
      throw new Error(`CITATION_VALIDATION_FAILED: factual sentence lacks a valid citation: ${sentence}`);
    }
  }
}

export class AskService {
  constructor(private readonly pool: Pool) {}

  async ask(question: string): Promise<AskResponse> {
    const normalized = question.trim();
    if (normalized.length < 3) throw new Error("QUESTION_TOO_SHORT: enter a research question");
    const result = await this.pool.query<{
      claim_id: string; statement: string; claim_class: string; evidence_role: string;
      passage_id: string; locator_type: string; locator_value: string; source_id: string;
      source_title: string; work_id: string; tradition: string | null; independence_cluster: string;
    }>(
      `SELECT c.id AS claim_id,c.statement,c.claim_class,c.evidence_role,p.id AS passage_id,
        p.locator_type,p.locator_value,se.id AS source_id,se.title AS source_title,w.id AS work_id,
        w.tradition,coalesce(se.independence_cluster_key,se.id::text) AS independence_cluster
       FROM claims c JOIN passages p ON p.id=c.passage_id
       JOIN source_editions se ON se.id=p.source_edition_id LEFT JOIN works w ON w.id=se.work_id
       WHERE c.review_status='published' AND p.review_status IN ('approved','published')
         AND se.review_status IN ('approved','published') AND se.publication_allowed=true
         AND (c.search_vector @@ websearch_to_tsquery('english',$1)
           OR p.search_vector @@ websearch_to_tsquery('simple',$1)
           OR c.statement ILIKE '%' || $1 || '%' OR se.title ILIKE '%' || $1 || '%')
       ORDER BY ts_rank(c.search_vector,websearch_to_tsquery('english',$1)) DESC,c.created_at DESC LIMIT 12`,
      [normalized]);
    if (result.rows.length === 0) return {
      answer: "Not enough reviewed source material.", answer_status: "insufficient",
      source_statements: [], interpretations: [], supporting_evidence: [], challenging_evidence: [],
      uncertainties: ["No published claims with exact locators matched this question."], timeline_items: [],
      citations: [], source_counts: { passages: 0, works: 0, traditions: 0, source_families: 0 }, suggested_hypothesis: null
    };
    const citations: Citation[] = result.rows.map((row, index) => ({
      citation_id: `C${index + 1}`, source_id: row.source_id, passage_id: row.passage_id,
      locator: `${row.locator_type}: ${row.locator_value}`, display_label: row.source_title
    }));
    const sourceStatements = result.rows.filter((row) => row.claim_class.startsWith("textual_") || row.claim_class === "empirical_observation");
    const interpretations = result.rows.filter((row) => !sourceStatements.includes(row));
    const answer = result.rows.slice(0, 4).map((row, index) => `${row.statement.replace(/[.!?]+$/, "")} [C${index + 1}].`).join(" ");
    validateCitationMarkers(answer, citations);
    const timeline = await this.pool.query(
      `SELECT DISTINCT ti.* FROM timeline_items ti JOIN claims c ON ti.source_claim_id=c.id
       WHERE c.id=ANY($1::uuid[]) LIMIT 20`, [result.rows.map((row) => row.claim_id)]).catch(() => ({ rows: [] as Record<string, unknown>[] }));
    const evidence = await this.pool.query<{ stance: string; claim_id: string; statement: string; evidence_domain: string; reviewer_note: string | null }>(
      `SELECT ei.stance,ei.claim_id,c.statement,ei.evidence_domain,ei.reviewer_note
       FROM evidence_items ei JOIN claims c ON c.id=ei.claim_id
       WHERE ei.claim_id=ANY($1::uuid[]) AND ei.review_status IN ('approved','published')
       ORDER BY ei.created_at`, [result.rows.map((row) => row.claim_id)]);
    const supportingEvidence = evidence.rows.filter((row) => row.stance === "supports");
    const challengingEvidence = evidence.rows.filter((row) => row.stance === "challenges");
    return {
      answer, answer_status: result.rows.length >= 2 ? "grounded" : "partial",
      source_statements: sourceStatements.map((row) => ({ claim_id: row.claim_id, statement: row.statement, evidence_role: row.evidence_role })),
      interpretations: interpretations.map((row) => ({ claim_id: row.claim_id, statement: row.statement, evidence_role: row.evidence_role })),
      supporting_evidence: supportingEvidence, challenging_evidence: challengingEvidence,
      uncertainties: result.rows.length < 2 ? ["Only one reviewed source statement matched; comparison coverage is limited."] : [],
      timeline_items: timeline.rows, citations,
      source_counts: {
        passages: new Set(result.rows.map((row) => row.passage_id)).size,
        works: new Set(result.rows.map((row) => row.work_id)).size,
        traditions: new Set(result.rows.map((row) => row.tradition).filter(Boolean)).size,
        source_families: new Set(result.rows.map((row) => row.independence_cluster)).size
      },
      suggested_hypothesis: null
    };
  }
}
