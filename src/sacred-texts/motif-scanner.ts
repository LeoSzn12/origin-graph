import type { Pool } from "pg";
import { transaction } from "@/db";

export type MotifDefinition={slug:string;label:string;definition:string;patterns:RegExp[]};

export const sacredMotifDefinitions:MotifDefinition[]=[
  {slug:"creation",label:"Creation",definition:"Accounts or statements about the origin, formation, or ordering of the world, living beings, or humanity.",patterns:[/\bcreat(?:e|ed|ion)\b/i,/\bformed the (?:earth|world|man)\b/i,/\borigin of (?:the )?(?:world|heavens|earth)\b/i]},
  {slug:"primordial-flood",label:"Primordial flood",definition:"A destructive or world-altering flood narrative. A lexical match does not by itself establish shared origin.",patterns:[/\bflood\b/i,/\bdeluge\b/i,/\bark\b.*\bwaters?\b/i]},
  {slug:"giants",label:"Giants and giant peoples",definition:"Explicit giants, Nephilim, Rephaim, or unusually gigantic beings.",patterns:[/\bgiants?\b/i,/\bnephilim\b/i,/\brephaim\b/i]},
  {slug:"return-from-death",label:"Return from death",definition:"A person or group described as returning, rising, or being raised from death.",patterns:[/\braised from the dead\b/i,/\brose from the dead\b/i,/\bresurrection\b/i,/\bdead (?:shall|will) rise\b/i]},
  {slug:"heavenly-beings",label:"Heavenly beings",definition:"Angels, Watchers, jinn, devas, or other beings described in source-native heavenly or nonhuman categories.",patterns:[/\bangels?\b/i,/\bwatchers?\b/i,/\bdjinn\b|\bjinn\b/i,/\bdevas?\b/i,/\bheavenly beings?\b/i]},
  {slug:"sacrifice-offering",label:"Sacrifice and offering",definition:"Ritual sacrifice, offering, oblation, or altar language.",patterns:[/\bsacrific(?:e|ed|ing)\b/i,/\bofferings?\b/i,/\boblations?\b/i,/\baltar\b/i]},
  {slug:"final-judgment",label:"Final judgment",definition:"A final or cosmic judgment of persons, nations, or beings.",patterns:[/\bday of judg(?:e)?ment\b/i,/\bfinal judgment\b/i,/\bjudge the (?:world|earth|dead)\b/i]},
  {slug:"forbidden-knowledge",label:"Forbidden knowledge",definition:"Knowledge, arts, or instruction portrayed as prohibited, corrupting, or improperly revealed.",patterns:[/\bforbidden knowledge\b/i,/\btaught (?:men|mankind).{0,80}\b(?:swords|sorcery|enchantments)\b/i,/\bknowledge of good and evil\b/i]},
  {slug:"ascent-to-heaven",label:"Ascent to heaven",definition:"A person ascending, being taken, or traveling to heaven or a divine realm.",patterns:[/\bascend(?:ed|s|ing)? (?:to|into) heaven\b/i,/\btaken up (?:to|into) heaven\b/i,/\bcarried (?:me|him|her) (?:to|into) heaven\b/i]},
  {slug:"moral-duty",label:"Moral duty and righteous conduct",definition:"Explicit instruction about righteousness, justice, mercy, compassion, duty, or dharma.",patterns:[/\brighteousness\b/i,/\bjustice and mercy\b/i,/\bcompassion\b/i,/\bdharma\b/i,/\bsacred duty\b/i]}
];

export function detectSacredMotifs(text:string):{definition:MotifDefinition;matched:string}[]{
  const results:{definition:MotifDefinition;matched:string}[]=[];
  for(const definition of sacredMotifDefinitions){
    for(const pattern of definition.patterns){const match=text.match(pattern);if(match){results.push({definition,matched:match[0]});break;}}
  }
  return results;
}

export async function scanSacredMotifs(pool:Pool,actor:string){
  return transaction(pool,async client=>{
    const motifIds=new Map<string,string>();
    for(const definition of sacredMotifDefinitions){
      const motif=await client.query<{id:string}>(
        `INSERT INTO motifs (slug,label,definition,review_status) VALUES ($1,$2,$3,'approved')
         ON CONFLICT (slug) DO UPDATE SET label=EXCLUDED.label,definition=EXCLUDED.definition RETURNING id`,
        [definition.slug,definition.label,definition.definition]
      );motifIds.set(definition.slug,motif.rows[0].id);
    }
    const passages=await client.query<{passage_id:string;text:string;tradition_key:string;normalized_reference:string}>(
      `SELECT p.id AS passage_id,coalesce(p.translation_text,p.original_text,p.safe_summary,'') AS text,
        st.key AS tradition_key,psr.normalized_reference
       FROM passages p JOIN passage_sacred_references psr ON psr.passage_id=p.id
       JOIN sacred_texts txt ON txt.key=psr.sacred_text_key JOIN sacred_traditions st ON st.key=txt.tradition_key
       WHERE p.review_status IN ('approved','published')`
    );
    const candidateRows:{passageId:string;motifId:string;rationale:string}[]=[];const byMotif=new Map<string,typeof passages.rows>();
    for(const passage of passages.rows)for(const match of detectSacredMotifs(passage.text)){
      candidateRows.push({passageId:passage.passage_id,motifId:motifIds.get(match.definition.slug)!,
        rationale:`Deterministic vocabulary match “${match.matched}” in ${passage.normalized_reference}; contextual review is required.`});
      byMotif.set(match.definition.slug,[...(byMotif.get(match.definition.slug)??[]),passage]);
    }
    for(let offset=0;offset<candidateRows.length;offset+=500){
      const chunk=candidateRows.slice(offset,offset+500);
      await client.query(
        `INSERT INTO passage_motifs (passage_id,motif_id,match_basis,confidence,rationale,review_status)
         SELECT passage_id,motif_id,'curated_concept','medium',rationale,'in_review'
         FROM unnest($1::uuid[],$2::uuid[],$3::text[]) AS candidates(passage_id,motif_id,rationale)
         ON CONFLICT (passage_id,motif_id) DO UPDATE SET rationale=EXCLUDED.rationale`,
        [chunk.map(row=>row.passageId),chunk.map(row=>row.motifId),chunk.map(row=>row.rationale)]
      );
    }
    let parallelSets=0;
    for(const definition of sacredMotifDefinitions){
      const matches=byMotif.get(definition.slug)??[];const traditions=new Set(matches.map(match=>match.tradition_key));
      if(traditions.size<2)continue;
      const set=await client.query<{id:string}>(
        `INSERT INTO sacred_parallel_sets (slug,label,description,match_type,confidence,review_status,created_by)
         VALUES ($1,$2,$3,'general_motif','low','draft',$4)
         ON CONFLICT (slug) DO UPDATE SET description=EXCLUDED.description,updated_at=now() RETURNING id`,
        [`candidate-${definition.slug}`,`${definition.label}: cross-tradition candidates`,
          `Automatically gathered vocabulary candidates across ${traditions.size} traditions. This set does not assert common origin or equivalence.`,actor]
      );parallelSets+=1;
      const selected=[...new Map(matches.map(match=>[`${match.tradition_key}:${match.passage_id}`,match])).values()].slice(0,24);
      for(const passage of selected)await client.query(
        `INSERT INTO sacred_parallel_passages (parallel_set_id,passage_id,member_role,rationale)
         VALUES ($1,$2,'candidate',$3) ON CONFLICT (parallel_set_id,passage_id) DO UPDATE SET rationale=EXCLUDED.rationale`,
        [set.rows[0].id,passage.passage_id,`Vocabulary candidate in ${passage.tradition_key}: ${passage.normalized_reference}.`]
      );
    }
    return{passages_scanned:passages.rowCount,motif_candidates:candidateRows.length,parallel_sets:parallelSets};
  });
}
