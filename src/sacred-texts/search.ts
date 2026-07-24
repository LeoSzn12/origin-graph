import type { Pool } from "pg";
import { buildSacredSensemaking, type SacredCoverage, type SacredCoverageGroup } from "@/sacred-texts/sensemaking";

export type SimilarityGrade =
  | "direct_textual_relationship"
  | "shared_inherited_narrative"
  | "strong_thematic_parallel"
  | "general_motif"
  | "speculative_interpretation";

const conceptVocabulary: Record<string,{terms:string[];grade:SimilarityGrade;note:string}> = {
  flood:{terms:["flood","deluge","inundation"],grade:"general_motif",note:"Searches explicit flood language. Broader water imagery is excluded to reduce false parallels."},
  creation:{terms:["creation","created","beginning","heavens","earth","formed"],grade:"general_motif",note:"Searches creation language without assuming the accounts are historically related."},
  giants:{terms:["giant","giants","nephilim","rephaim","watchers"],grade:"general_motif",note:"Includes named giant traditions and Watcher vocabulary."},
  resurrection:{terms:["resurrection","raised","rose","risen","dead","life again"],grade:"general_motif",note:"Searches return-to-life language; results still require contextual review."},
  afterlife:{terms:["afterlife","heaven","hell","paradise","sheol","gehenna","rebirth"],grade:"general_motif",note:"Searches multiple tradition-specific terms without treating them as identical."},
  sacrifice:{terms:["sacrifice","offering","altar","victim","oblations"],grade:"general_motif",note:"Searches ritual offering and sacrifice vocabulary."},
  morality:{terms:["righteous","wicked","justice","mercy","compassion","duty","dharma"],grade:"general_motif",note:"Searches moral vocabulary, including tradition-specific terms."},
  aliens:{terms:["angel","angels","watcher","watchers","jinn","deva","devas","heavenly being","celestial being","vimana"],grade:"speculative_interpretation",note:"Modern 'alien' framing is speculative. Results show ancient source-native terms, not explicit claims about extraterrestrials."}
};

export function analyzeSacredQuery(query:string):{
  normalized:string;
  terms:string[];
  concept:string|null;
  suggested_grade:SimilarityGrade;
  note:string|null;
}{
  const normalized=query.trim().toLocaleLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}\s'-]+/gu," ").replace(/\s+/g," ");
  const words=normalized.split(/\s+/);
  const concept=Object.keys(conceptVocabulary).find(key=>words.includes(key))
    ??(words.some(word=>["alien","extraterrestrial","extraterrestrials","ufo","ufos"].includes(word))?"aliens":null);
  const rawTerms=concept==="aliens"?[]:words.filter(term=>term.length>2);
  const terms=[...new Set([...(concept?conceptVocabulary[concept].terms:[]),...rawTerms])].slice(0,20);
  return{
    normalized,
    terms,
    concept,
    suggested_grade:concept?conceptVocabulary[concept].grade:"general_motif",
    note:concept?conceptVocabulary[concept].note:null
  };
}

export function sacredMatchExcerpt(text:string,terms:string[],maximum=560):{text:string;matched_terms:string[]}{
  const matched=terms.filter(term=>text.toLocaleLowerCase().includes(term.toLocaleLowerCase()));
  if(text.length<=maximum)return{text,matched_terms:matched};
  const positions=matched.map(term=>text.toLocaleLowerCase().indexOf(term.toLocaleLowerCase())).filter(position=>position>=0);
  const center=positions.length?Math.min(...positions):0;const start=Math.max(0,center-Math.floor(maximum*.3));
  const end=Math.min(text.length,start+maximum);return{
    text:`${start>0?"…":""}${text.slice(start,end).trim()}${end<text.length?"…":""}`,
    matched_terms:matched
  };
}

export type SacredSearchFilters = {
  traditions?: string[];
  canons?: string[];
  editions?: string[];
  limit?: number;
};

export class SacredTextSearchService {
  constructor(private readonly pool:Pool){}

  async catalog(){
    const [traditions,canons,editions]=await Promise.all([
      this.pool.query(`SELECT st.key,st.label,st.description,st.sort_order,
        count(DISTINCT psr.passage_id)::int AS passage_count
        FROM sacred_traditions st
        LEFT JOIN sacred_texts txt ON txt.tradition_key=st.key
        LEFT JOIN passage_sacred_references psr ON psr.sacred_text_key=txt.key
        GROUP BY st.key,st.label,st.description,st.sort_order ORDER BY st.sort_order`),
      this.pool.query(`SELECT sc.key,sc.label,sc.community,sc.description,sc.claimed_unit_count,sc.unit_label,
        sc.source_url,count(DISTINCT scb.sacred_book_key)::int AS mapped_book_count
        FROM sacred_canons sc LEFT JOIN sacred_canon_books scb ON scb.canon_key=sc.key
        GROUP BY sc.key,sc.label,sc.community,sc.description,sc.claimed_unit_count,sc.unit_label,sc.source_url,sc.sort_order
        ORDER BY sc.sort_order`),
      this.pool.query(`SELECT sep.edition_key,sep.display_name,sep.language_code,sep.source_kind,sep.license_scope,
        sep.sacred_text_key,se.id AS source_edition_id,se.canonical_url,se.rights_note,
        count(psr.passage_id)::int AS passage_count
        FROM sacred_edition_profiles sep JOIN source_editions se ON se.id=sep.source_edition_id
        LEFT JOIN passages p ON p.source_edition_id=se.id
        LEFT JOIN passage_sacred_references psr ON psr.passage_id=p.id
        WHERE sep.searchable
        GROUP BY sep.edition_key,sep.display_name,sep.language_code,sep.source_kind,sep.license_scope,
          sep.sacred_text_key,se.id,se.canonical_url,se.rights_note,sep.is_default
        ORDER BY sep.is_default DESC,sep.display_name`)
    ]);
    return{traditions:traditions.rows,canons:canons.rows,editions:editions.rows,
      similarity_grades:[
        {key:"direct_textual_relationship",label:"Direct textual relationship"},
        {key:"shared_inherited_narrative",label:"Shared or inherited narrative"},
        {key:"strong_thematic_parallel",label:"Strong thematic parallel"},
        {key:"general_motif",label:"General motif"},
        {key:"speculative_interpretation",label:"Speculative modern interpretation"}
      ]};
  }

  async search(query:string,filters:SacredSearchFilters={}){
    const analysis=analyzeSacredQuery(query);
    if(!analysis.terms.length){
      const coverage:SacredCoverage={matching_passages:0,distinct_references:0,shown_passages:0,text_groups_with_matches:0,groups:[]};
      return{query:analysis,total:0,shown_total:0,coverage,sensemaking:buildSacredSensemaking({normalizedQuery:analysis.normalized,concept:analysis.concept,coverage}),traditions_represented:[],results:[]};
    }
    const limitPerTradition=Math.max(1,Math.min(filters.limit??12,25));
    const patterns=analysis.terms.map(term=>`%${term}%`);
    const sharedParameters=[patterns,filters.traditions??[],filters.editions??[],filters.canons??[]];
    const [result,coverageResult]=await Promise.all([this.pool.query(
      `WITH candidates AS (
        SELECT p.id AS passage_id,st.sort_order AS tradition_sort,coalesce(sb.default_order,999) AS book_sort,
          psr.reference_sort_key,
          row_number() OVER (PARTITION BY st.key ORDER BY
            CASE WHEN lower(coalesce(p.translation_text,p.original_text,p.safe_summary,'')) LIKE $5 THEN 0 ELSE 1 END,
            coalesce(sb.default_order,999),psr.reference_sort_key) AS tradition_rank
        FROM passages p
        JOIN source_editions se ON se.id=p.source_edition_id
        JOIN sacred_edition_profiles sep ON sep.source_edition_id=se.id AND sep.searchable
        JOIN passage_sacred_references psr ON psr.passage_id=p.id
        JOIN sacred_texts txt ON txt.key=psr.sacred_text_key
        JOIN sacred_traditions st ON st.key=txt.tradition_key
        LEFT JOIN sacred_books sb ON sb.key=psr.sacred_book_key
        WHERE p.review_status IN ('approved','published')
          AND (coalesce(p.original_text,'') ILIKE ANY($1::text[])
            OR coalesce(p.transliteration,'') ILIKE ANY($1::text[])
            OR coalesce(p.translation_text,'') ILIKE ANY($1::text[])
            OR coalesce(p.safe_summary,'') ILIKE ANY($1::text[]))
          AND ($2::text[]='{}' OR st.key=ANY($2::text[]))
          AND ($3::text[]='{}' OR sep.edition_key=ANY($3::text[]))
          AND ($4::text[]='{}' OR EXISTS (
            SELECT 1 FROM sacred_canon_books filter_scb
            WHERE filter_scb.sacred_book_key=psr.sacred_book_key AND filter_scb.canon_key=ANY($4::text[])
          ))
      ), chosen AS (
        SELECT * FROM candidates WHERE tradition_rank <= $6
      )
      SELECT p.id AS passage_id,p.locator_value,p.original_text,p.transliteration,p.translation_text,p.safe_summary,
        p.damaged,p.reconstructed,p.extraction_confidence,p.review_status,
        se.id AS source_edition_id,se.title AS edition_title,se.canonical_url,se.license_name,se.rights_note,
        sep.edition_key,sep.display_name AS edition_display_name,sep.language_code,sep.source_kind,sep.license_scope,
        psr.normalized_reference,psr.chapter_number,psr.verse_start,psr.verse_end,psr.reference_sort_key,
        sb.key AS book_key,sb.label AS book_label,txt.key AS sacred_text_key,txt.label AS sacred_text_label,
        st.key AS tradition_key,st.label AS tradition_label,chosen.tradition_sort,chosen.book_sort,chosen.tradition_rank,
        coalesce((SELECT json_agg(DISTINCT jsonb_build_object('key',sc.key,'label',sc.label,'community',sc.community))
          FROM sacred_canon_books scb JOIN sacred_canons sc ON sc.key=scb.canon_key
          WHERE scb.sacred_book_key=psr.sacred_book_key),'[]') AS canons,
        coalesce((SELECT json_agg(jsonb_build_object('slug',m.slug,'label',m.label,'confidence',pm.confidence,'basis',pm.match_basis))
          FROM passage_motifs pm JOIN motifs m ON m.id=pm.motif_id
          WHERE pm.passage_id=p.id AND pm.review_status IN ('approved','published')),'[]') AS motifs
      FROM chosen JOIN passages p ON p.id=chosen.passage_id
      JOIN source_editions se ON se.id=p.source_edition_id
      JOIN sacred_edition_profiles sep ON sep.source_edition_id=se.id
      JOIN passage_sacred_references psr ON psr.passage_id=p.id
      JOIN sacred_texts txt ON txt.key=psr.sacred_text_key
      JOIN sacred_traditions st ON st.key=txt.tradition_key
      LEFT JOIN sacred_books sb ON sb.key=psr.sacred_book_key
      ORDER BY chosen.tradition_sort,chosen.book_sort,chosen.reference_sort_key`,
      [...sharedParameters,`%${analysis.normalized}%`,limitPerTradition]
    ),this.pool.query(
      `SELECT st.key,st.label,st.sort_order,
        count(DISTINCT p.id)::int AS matching_passages,
        count(DISTINCT concat_ws(':',psr.sacred_book_key,psr.normalized_reference))::int AS distinct_references,
        count(DISTINCT sep.edition_key)::int AS editions
      FROM passages p
      JOIN source_editions se ON se.id=p.source_edition_id
      JOIN sacred_edition_profiles sep ON sep.source_edition_id=se.id AND sep.searchable
      JOIN passage_sacred_references psr ON psr.passage_id=p.id
      JOIN sacred_texts txt ON txt.key=psr.sacred_text_key
      JOIN sacred_traditions st ON st.key=txt.tradition_key
      WHERE p.review_status IN ('approved','published')
        AND (coalesce(p.original_text,'') ILIKE ANY($1::text[])
          OR coalesce(p.transliteration,'') ILIKE ANY($1::text[])
          OR coalesce(p.translation_text,'') ILIKE ANY($1::text[])
          OR coalesce(p.safe_summary,'') ILIKE ANY($1::text[]))
        AND ($2::text[]='{}' OR st.key=ANY($2::text[]))
        AND ($3::text[]='{}' OR sep.edition_key=ANY($3::text[]))
        AND ($4::text[]='{}' OR EXISTS (
          SELECT 1 FROM sacred_canon_books filter_scb
          WHERE filter_scb.sacred_book_key=psr.sacred_book_key AND filter_scb.canon_key=ANY($4::text[])
        ))
      GROUP BY st.key,st.label,st.sort_order
      ORDER BY st.sort_order`,
      sharedParameters
    )]);
    const results=result.rows.map(row=>{
      const fullText=String(row.translation_text??row.original_text??row.safe_summary??"");
      const excerpt=sacredMatchExcerpt(fullText,analysis.terms);
      return{...row,display_excerpt:excerpt.text,matched_terms:excerpt.matched_terms};
    });
    const represented=[...new Map(results.map(row=>[row.tradition_key,{key:row.tradition_key,label:row.tradition_label}])).values()];
    const groups=coverageResult.rows.map(row=>({
      key:String(row.key),
      label:String(row.label),
      matching_passages:Number(row.matching_passages),
      distinct_references:Number(row.distinct_references),
      editions:Number(row.editions)
    })) satisfies SacredCoverageGroup[];
    const coverage:SacredCoverage={
      matching_passages:groups.reduce((sum,group)=>sum+group.matching_passages,0),
      distinct_references:groups.reduce((sum,group)=>sum+group.distinct_references,0),
      shown_passages:result.rowCount??0,
      text_groups_with_matches:groups.length,
      groups
    };
    return{
      query:analysis,
      total:coverage.matching_passages,
      shown_total:coverage.shown_passages,
      coverage,
      sensemaking:buildSacredSensemaking({normalizedQuery:analysis.normalized,concept:analysis.concept,coverage}),
      traditions_represented:represented,
      results
    };
  }
}
