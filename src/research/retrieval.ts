import type { Pool } from "pg";

export type QueryIntent = "factual_lookup" | "chronology" | "comparison" | "motif_search" | "evidence_assessment" | "source_request" | "hypothesis_exploration";

export interface EmbeddingProvider {
  readonly key: string;
  embed(text: string): Promise<number[] | null>;
}

export class DisabledEmbeddingProvider implements EmbeddingProvider {
  readonly key = "disabled";
  async embed(): Promise<null> { return null; }
}

const stopWords = new Set(["a", "an", "and", "are", "around", "about", "actual", "actually", "across", "by", "can", "collapse", "collapsed", "collapsing", "compare", "compared", "comparing", "could", "date", "dates", "definitely", "did", "difference", "differences", "do", "does", "edition", "editions", "evidence", "exist", "family", "families", "for", "from", "happen", "happened", "happening", "happens", "how", "in", "is", "it", "material", "may", "might", "not", "of", "on", "or", "passage", "passages", "real", "really", "record", "records", "report", "reported", "reports", "reviewed", "role", "roles", "sacred", "say", "says", "scientific", "should", "similar", "similarities", "source", "sources", "that", "the", "this", "title", "titles", "to", "tradition", "traditions", "true", "truth", "was", "were", "what", "when", "where", "which", "who", "why", "will", "with", "without", "would"]);
const expansions: Record<string, string[]> = {
  atlantis: ["timaeus", "critias"], flood: ["deluge", "ark"], floods: ["deluge", "ark"],
  giant: ["giants", "nephilim", "enoch", "watchers"], giants: ["nephilim", "enoch", "watchers"],
  vimana: ["vimanam", "firmament"], vimanas: ["vimanam", "firmament"],
  weapon: ["weapons", "astra", "arjuna"], weapons: ["astra", "arjuna"],
  teacher: ["rabbi", "prophet", "sage"], teachers: ["rabbi", "prophet", "sage"],
  moses: ["exodus", "deuteronomy"], jesus: ["matthew", "luke", "john"],
  mahabharata: ["bharata", "arjuna", "pandava", "kaurava", "kurukshetra", "hastinapura"],
};

export function analyzeQuestion(question: string): { intent: QueryIntent; terms: string[]; termGroups: string[][] } {
  const lower = question.toLocaleLowerCase();
  const intent: QueryIntent = /compare|difference|similar/.test(lower) ? "comparison"
    : /when|date|chronolog|timeline/.test(lower) ? "chronology"
      : /support|challenge|evidence|prove|disprove/.test(lower) ? "evidence_assessment"
        : /source|edition|citation|passage/.test(lower) ? "source_request"
          : /motif|pattern/.test(lower) ? "motif_search"
            : /hypoth|could|explain/.test(lower) ? "hypothesis_exploration" : "factual_lookup";
  const terms = [...new Set(lower.normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, " ").split(/\s+/)
    .filter((term) => term.length > 2 && !stopWords.has(term)))];
  const boundedTerms = terms.slice(0, 12);
  const termGroups = boundedTerms.map((term) => [...new Set([term, ...(expansions[term] ?? [])])]);
  return { intent, terms: boundedTerms, termGroups };
}

export class PostgresHybridRetriever {
  constructor(private readonly pool: Pool, private readonly embeddings: EmbeddingProvider = new DisabledEmbeddingProvider()) {}

  async retrieveClaimIds(question: string, limit = 48): Promise<{ claimIds: string[]; intent: QueryIntent; embeddingProvider: string }> {
    const analysis = analyzeQuestion(question);
    const safeGroups = analysis.termGroups
      .map((group) => group.filter((term) => /^[\p{L}\p{N}]+$/u.test(term)))
      .filter((group) => group.length > 0);
    if (!safeGroups.length) return { claimIds: [], intent: analysis.intent, embeddingProvider: this.embeddings.key };
    // When a recognized work/topic is present, question framing and location
    // terms are soft context. Requiring every word would turn “Did the
    // Mahabharata really take place in India?” into an impossible exact match.
    const topicGroups = safeGroups.filter((group) => group.some((term) => (expansions[term] ?? []).length > 0));
    const queryGroups = topicGroups.length ? topicGroups : safeGroups;
    const tsQuery = queryGroups.map((group) => {
      const alternatives = group.map((term) => `${term}:*`).join(" | ");
      return group.length > 1 ? `(${alternatives})` : alternatives;
    }).join(" & ");
    // The embedding hook is deliberately provider-neutral. V1 remains deterministic when disabled.
    await this.embeddings.embed(question);
    const result = await this.pool.query<{ claim_id: string }>(
      `WITH direct AS (
         SELECT c.id AS claim_id,
           ts_rank(search.document, to_tsquery('simple', $1)) + 1.0 AS score
           FROM claims c
           LEFT JOIN passages p ON p.id = c.passage_id
           LEFT JOIN source_editions se ON se.id = p.source_edition_id
           CROSS JOIN LATERAL (SELECT to_tsvector('simple', coalesce(c.statement,'') || ' ' || coalesce(se.title,'')) || coalesce(p.search_vector, ''::tsvector) AS document) search
          WHERE search.document @@ to_tsquery('simple', $1)
       ), case_matches AS (
         SELECT cfo.object_id AS claim_id, 0.72 AS score
           FROM case_files cf JOIN case_file_objects cfo ON cfo.case_file_id = cf.id AND cfo.object_type = 'claim'
          WHERE to_tsvector('simple', coalesce(cf.title,'') || ' ' || coalesce(cf.core_question,'')) @@ to_tsquery('simple', $1)
       ), motif_matches AS (
         SELECT con.from_id AS claim_id, 0.62 AS score
           FROM motifs m JOIN connections con ON con.to_type = 'motif' AND con.to_id = m.id AND con.from_type = 'claim'
          WHERE con.review_status IN ('approved','published')
            AND to_tsvector('simple', coalesce(m.label,'') || ' ' || coalesce(m.definition,'')) @@ to_tsquery('simple', $1)
       ), entity_matches AS (
         SELECT c.id AS claim_id, 0.66 AS score
           FROM entities e JOIN claims c ON c.subject_entity_id = e.id
          WHERE to_tsvector('simple', e.preferred_name) @@ to_tsquery('simple', $1)
       ), ranked AS (
         SELECT claim_id, max(score) AS score FROM (
           SELECT * FROM direct UNION ALL SELECT * FROM case_matches
           UNION ALL SELECT * FROM motif_matches UNION ALL SELECT * FROM entity_matches
         ) matches GROUP BY claim_id
       )
       SELECT claim_id FROM ranked ORDER BY score DESC, claim_id LIMIT $2`,
      [tsQuery, limit],
    );
    return { claimIds: result.rows.map((row) => row.claim_id), intent: analysis.intent, embeddingProvider: this.embeddings.key };
  }
}
