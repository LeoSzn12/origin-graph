import type { Pool } from "pg";
import { PostgresHybridRetriever, type QueryIntent } from "./retrieval";

export interface Citation { citation_id:string;source_id:string;passage_id:string;locator:string;display_label:string }
export interface AskFilters { evidence_roles?:string[];traditions?:string[];from_year?:number;to_year?:number }
export interface EvidenceSynthesis {
  conclusion:string;
  established:string[];
  connections:Array<{label:string;path:string;explanation:string;confidence:string}>;
  unresolved:string[];
}
export interface AskResponse {
  answer:string;answer_status:"grounded"|"partial"|"insufficient";source_statements:Record<string,unknown>[];interpretations:Record<string,unknown>[];
  supporting_evidence:Record<string,unknown>[];challenging_evidence:Record<string,unknown>[];uncertainties:string[];timeline_items:Record<string,unknown>[];
  citations:Citation[];source_counts:{passages:number;works:number;traditions:number;source_families:number};source_families:Record<string,unknown>[];
  graph_context:Record<string,unknown>[];related_entities:Record<string,unknown>[];coverage_profile:Record<string,unknown>;suggested_hypothesis:Record<string,unknown>|null;
  synthesis:EvidenceSynthesis;
  query_analysis?:{intent:QueryIntent;retrieval:string;embedding_provider:string};
}

export function buildEvidenceSynthesis(input:{claimCount:number;familyCount:number;timelineCount:number;supportCount:number;challengeCount:number;graphEdges:Array<Record<string,unknown>>;uncertainties:string[]}):EvidenceSynthesis{
  if(input.claimCount===0)return{conclusion:"The reviewed corpus cannot form a synthesis yet.",established:[],connections:[],unresolved:input.uncertainties};
  const claimLabel=input.claimCount===1?"reviewed claim":"reviewed claims";
  const familyLabel=input.familyCount===1?"independent source family":"independent source families";
  const conclusion=input.familyCount>=2
    ? input.challengeCount>0
      ? "The evidence forms a cross-source pattern, but it is contested by reviewed counterevidence."
      : "The evidence forms a cross-source pattern, but the current packet is still a lead rather than a settled conclusion."
    : "This packet identifies a documented lead, not a historical conclusion: too few independent source families are present to test it.";
  const established=[
    `${input.claimCount} ${claimLabel} are linked across ${input.familyCount} ${familyLabel}.`,
    ...(input.timelineCount>0?[`${input.timelineCount} dated record${input.timelineCount===1?" is":"s are"} linked to the packet; their roles stay separate from the claims they date.`]:[]),
    ...(input.graphEdges.length>0?[`${input.graphEdges.length} approved graph connection${input.graphEdges.length===1?" links":"s link"} these records to related research objects.`]:[])
  ];
  const connections=input.graphEdges.slice(0,8).map(edge=>{
    const label=String(edge.connection_type??"related evidence").replaceAll("_"," ");
    return{label,path:`${String(edge.from_type??"record")} → ${String(edge.to_type??"record")}`,explanation:String(edge.explanation??"An approved relationship links this object into the research graph."),confidence:String(edge.confidence??"reviewed")};
  });
  const unresolved=[...input.uncertainties];
  if(input.graphEdges.length===0)unresolved.push("No approved graph connection is linked to these claims yet; treat this as a source packet, not a connected explanation.");
  if(input.supportCount===0&&input.challengeCount===0)unresolved.push("No reviewed evidence cards test the claims directly; the packet currently contains source statements rather than a support/challenge comparison.");
  return{conclusion,established,connections,unresolved};
}

export function validateCitationMarkers(answer:string,citations:Citation[]):void{const available=new Set(citations.map(c=>c.citation_id));const sentences=answer.split(/(?<!\b[A-Z])(?<=[.!?])\s+/).map(s=>s.trim()).filter(Boolean);for(const sentence of sentences){if(sentence==="Not enough reviewed source material."||sentence.startsWith("Uncertainty:"))continue;const markers=[...sentence.matchAll(/\[([A-Z]\d+)\]/g)].map(match=>match[1]);if(markers.length===0||markers.some(marker=>!available.has(marker)))throw new Error(`CITATION_VALIDATION_FAILED: factual sentence lacks a valid citation: ${sentence}`);}}

type ClaimRow={claim_id:string;statement:string;claim_class:string;evidence_role:string;passage_id:string;locator_type:string;locator_value:string;source_id:string;source_title:string;work_id:string;tradition:string|null;culture:string|null;independence_cluster:string};

export class AskService{
  constructor(private readonly pool:Pool){}
  async ask(question:string,filters:AskFilters={}):Promise<AskResponse>{
    const normalized=question.trim();if(normalized.length<3)throw new Error("QUESTION_TOO_SHORT: enter a research question");
    const roles=filters.evidence_roles?.length?filters.evidence_roles:null;const traditions=filters.traditions?.length?filters.traditions:null;
    const retrieval=await new PostgresHybridRetriever(this.pool).retrieveClaimIds(normalized);
    if(retrieval.claimIds.length===0)return {...this.insufficient(normalized,filters),query_analysis:{intent:retrieval.intent,retrieval:"structured + full-text + approved graph expansion",embedding_provider:retrieval.embeddingProvider}};
    const result=await this.pool.query<ClaimRow>(`SELECT c.id AS claim_id,c.statement,c.claim_class,c.evidence_role,p.id AS passage_id,p.locator_type,p.locator_value,
      se.id AS source_id,se.title AS source_title,w.id AS work_id,w.tradition,w.culture,coalesce(se.independence_cluster_key,se.id::text) AS independence_cluster
      FROM claims c JOIN passages p ON p.id=c.passage_id JOIN source_editions se ON se.id=p.source_edition_id LEFT JOIN works w ON w.id=se.work_id
      WHERE c.review_status='published' AND p.review_status IN ('approved','published') AND se.review_status IN ('approved','published') AND se.publication_allowed=true
      AND ($6::boolean OR coalesce(se.adapter_key,'') <> 'fixture')
      AND ($2::text[] IS NULL OR c.evidence_role::text=ANY($2)) AND ($3::text[] IS NULL OR w.tradition=ANY($3))
      AND ($4::int IS NULL OR EXISTS (SELECT 1 FROM temporal_assertions ta WHERE ta.source_claim_id=c.id AND ta.latest_year >= $4))
      AND ($5::int IS NULL OR EXISTS (SELECT 1 FROM temporal_assertions ta WHERE ta.source_claim_id=c.id AND ta.earliest_year <= $5))
      AND c.id=ANY($1::uuid[])
      ORDER BY array_position($1::uuid[],c.id),c.created_at DESC LIMIT 24`,[retrieval.claimIds,roles,traditions,filters.from_year??null,filters.to_year??null,process.env.NODE_ENV==='test']);
    if(result.rows.length===0)return this.insufficient(normalized,filters);
    const citations=result.rows.map((row,index)=>({citation_id:`C${index+1}`,source_id:row.source_id,passage_id:row.passage_id,locator:`${row.locator_type}: ${row.locator_value}`,display_label:row.source_title}));
    const sourceStatements=result.rows.filter(row=>row.claim_class.startsWith("textual_")||row.claim_class==="empirical_observation");const interpretations=result.rows.filter(row=>!sourceStatements.includes(row));
    const asksHistoricity=/\b(really|actually|historical|historicity|happen|happened|take place|real)\b/i.test(normalized);
    const topicContext=asksHistoricity
      ? "Uncertainty: The reviewed corpus cannot confirm that the narrated events occurred as historical events or that the setting named in the question is independently verified."
      : "";
    const answerStatements=result.rows.slice(0,6).map((row,index)=>`${row.statement.replace(/[.!?]+$/,'')} [C${index+1}].`);
    const firstContext=result.rows[0] ? `The matched record is ${result.rows[0].source_title}${result.rows[0].tradition||result.rows[0].culture?` and is associated with ${[result.rows[0].tradition,result.rows[0].culture].filter(Boolean).join(' / ')}`:''} [C1].` : "";
    const answer=[topicContext,firstContext,...answerStatements].filter(Boolean).join(' ');validateCitationMarkers(answer,citations);
    const ids=result.rows.map(row=>row.claim_id);
    const [timeline,evidence,graph,entities]=await Promise.all([
      this.pool.query(`SELECT DISTINCT ti.* FROM timeline_items ti WHERE ti.source_claim_id=ANY($1::uuid[]) ORDER BY earliest_year LIMIT 60`,[ids]),
      this.pool.query<{stance:string;claim_id:string;statement:string;evidence_domain:string;reviewer_note:string|null}>(`SELECT ei.stance,ei.claim_id,c.statement,ei.evidence_domain,ei.reviewer_note FROM evidence_items ei JOIN claims c ON c.id=ei.claim_id WHERE ei.claim_id=ANY($1::uuid[]) AND ei.review_status IN ('approved','published') ORDER BY ei.created_at`,[ids]),
      this.pool.query(`SELECT id,from_type,from_id,to_type,to_id,connection_type,explanation,confidence FROM connections WHERE review_status IN ('approved','published') AND ((from_type='claim' AND from_id=ANY($1::uuid[])) OR (to_type='claim' AND to_id=ANY($1::uuid[]))) LIMIT 40`,[ids]),
      this.pool.query(`SELECT DISTINCT e.id,e.preferred_name,e.entity_type,era.role_key,era.native_label,era.tradition FROM entity_role_assertions era JOIN entities e ON e.id=era.entity_id WHERE era.source_claim_id=ANY($1::uuid[]) AND era.review_status IN ('approved','published') LIMIT 30`,[ids])
    ]);
    const families=[...new Map(result.rows.map(row=>[row.independence_cluster,{key:row.independence_cluster,sources:new Set<string>(),claims:0,roles:new Set<string>()}])).values()];
    for(const row of result.rows){const family=families.find(item=>item.key===row.independence_cluster)!;family.sources.add(row.source_title);family.roles.add(row.evidence_role);family.claims+=1;}
    const support=evidence.rows.filter(row=>row.stance==='supports');const challenge=evidence.rows.filter(row=>row.stance==='challenges');
    const dateRoles=[...new Set(timeline.rows.map(row=>(row as {role:string}).role))];
    const uncertainties:string[]=[];if(families.length<2)uncertainties.push("Matched records represent fewer than two independent source families.");if(challenge.length===0)uncertainties.push("No reviewed challenging evidence card is linked to the matched claims.");if(result.rows.length<2)uncertainties.push("Only one reviewed source statement matched; comparison coverage is limited.");
    const synthesis=buildEvidenceSynthesis({claimCount:result.rows.length,familyCount:families.length,timelineCount:timeline.rows.length,supportCount:support.length,challengeCount:challenge.length,graphEdges:graph.rows,uncertainties});
    return {answer,answer_status:result.rows.length>=2&&families.length>=2?'grounded':'partial',source_statements:sourceStatements.map(row=>({claim_id:row.claim_id,statement:row.statement,evidence_role:row.evidence_role,source_title:row.source_title,locator:row.locator_value})),interpretations:interpretations.map(row=>({claim_id:row.claim_id,statement:row.statement,evidence_role:row.evidence_role,source_title:row.source_title,locator:row.locator_value})),supporting_evidence:support,challenging_evidence:challenge,uncertainties,timeline_items:timeline.rows,citations,
      source_counts:{passages:new Set(result.rows.map(row=>row.passage_id)).size,works:new Set(result.rows.map(row=>row.work_id)).size,traditions:new Set(result.rows.map(row=>row.tradition).filter(Boolean)).size,source_families:families.length},
      source_families:families.map(family=>({key:family.key,sources:[...family.sources],claim_count:family.claims,evidence_roles:[...family.roles]})),graph_context:graph.rows,related_entities:entities.rows,
      coverage_profile:{independent_source_families:families.length,date_roles:dateRoles,evidence_roles:[...new Set(result.rows.map(row=>row.evidence_role))],has_support:support.length>0,has_challenge:challenge.length>0,description:"Descriptive coverage only; not a truth score."},
      synthesis,
      suggested_hypothesis:{title:`Research hypothesis: ${normalized.slice(0,90)}`,proposition:normalized,scope:"Define the cultural, chronological, and evidentiary scope before saving.",claim_ids:ids,alternatives:["Record at least one competing explanation before activation."]},
      query_analysis:{intent:retrieval.intent,retrieval:"structured + full-text + approved graph expansion",embedding_provider:retrieval.embeddingProvider}};
  }
  private insufficient(question:string,filters:AskFilters):AskResponse{return{answer:"Not enough reviewed source material.",answer_status:"insufficient",source_statements:[],interpretations:[],supporting_evidence:[],challenging_evidence:[],uncertainties:["No published claims with exact locators matched this question and filter set."],timeline_items:[],citations:[],source_counts:{passages:0,works:0,traditions:0,source_families:0},source_families:[],graph_context:[],related_entities:[],coverage_profile:{independent_source_families:0,date_roles:[],evidence_roles:[],has_support:false,has_challenge:false,description:"Insufficient reviewed coverage."},synthesis:buildEvidenceSynthesis({claimCount:0,familyCount:0,timelineCount:0,supportCount:0,challengeCount:0,graphEdges:[],uncertainties:["No published claims with exact locators matched this question and filter set."]}),suggested_hypothesis:{title:`Open question: ${question.slice(0,90)}`,proposition:question,scope:JSON.stringify(filters),claim_ids:[],alternatives:["Gather primary-source and counterevidence before activation."]}};}
}
