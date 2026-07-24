import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { Pool } from "pg";
import { transaction } from "@/db";
import { appendAudit } from "@/domain/services";
import { safeFetchMetadata } from "@/security/fetch";
import { storePrivateObject } from "@/storage/local-storage";

type ManifestEdition={
  key:string;text:string;label:string;language:string;source_kind:"translation";
  source_url:string;download_url?:string;license_scope:"public_domain";
  integrity:string;import_status:string;
};
type StructuredUnit={chapter:number;label:string;text:string};
const manifestPath=fileURLToPath(new URL("../../corpus/sacred-texts/manifest.json",import.meta.url));
const hash=(value:Uint8Array|string)=>createHash("sha256").update(value).digest("hex");

function romanToInt(value:string):number{
  const values:Record<string,number>={I:1,V:5,X:10,L:50,C:100,D:500,M:1000};let total=0;let previous=0;
  for(const character of [...value.toUpperCase()].reverse()){const current=values[character]??0;if(current<previous)total-=current;else{total+=current;previous=current;}}
  return total;
}

function gutenbergBody(source:string):string{
  const start=source.search(/\*{3}\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*{3}/i);
  const end=source.search(/\*{3}\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*{3}/i);
  if(start<0||end<=start)throw new Error("GUTENBERG_PARSE_FAILED: embedded start/end markers missing");
  return source.slice(source.indexOf("\n",start)+1,end).replace(/\r/g,"");
}

function normalizeBlock(value:string):string{
  return value.replace(/\n{3,}/g,"\n\n").replace(/[ \t]+\n/g,"\n").trim();
}

export function parseRodwellQuran(source:string):StructuredUnit[]{
  const body=gutenbergBody(source);const pattern=/^SURA\d*[\s-]+([IVXLCDM]+)\b[^\n]*$/gm;
  const headings=[...body.matchAll(pattern)];const units:StructuredUnit[]=[];
  for(const [index,heading] of headings.entries()){
    const chapter=romanToInt(heading[1]);if(chapter<1||chapter>114)continue;
    const next=headings[index+1]?.index??body.length;let text=body.slice((heading.index??0)+heading[0].length,next);
    text=text.split(/^_{5,}\s*$/m)[0].replace(/^\s*(?:MECCA|MEDINA)[^\n]*\n/im,"").trim();
    if(text)units.push({chapter,label:`Quran ${chapter}`,text:normalizeBlock(text)});
  }
  const unique=new Map(units.map(unit=>[unit.chapter,unit]));
  if(unique.size!==114)throw new Error(`GUTENBERG_PARSE_FAILED: expected 114 Quran surahs, found ${unique.size}`);
  return [...unique.values()];
}

export function parseArnoldGita(source:string):StructuredUnit[]{
  const body=gutenbergBody(source);const pattern=/^\s*CHAPTER\s+([IVXLCDM]+)\s*$/gm;
  const headings=[...body.matchAll(pattern)];const units:StructuredUnit[]=[];
  for(const [index,heading] of headings.entries()){
    const chapter=romanToInt(heading[1]);if(chapter<1||chapter>18)continue;
    const next=headings[index+1]?.index??body.length;
    let text=body.slice((heading.index??0)+heading[0].length,next);
    text=text.split(/^\s*HERE ENDETH CHAPTER\b/im)[0];
    if(text.trim())units.push({chapter,label:`Bhagavad Gita ${chapter}`,text:normalizeBlock(text)});
  }
  const unique=new Map(units.map(unit=>[unit.chapter,unit]));
  if(unique.size!==18)throw new Error(`GUTENBERG_PARSE_FAILED: expected 18 Bhagavad Gita chapters, found ${unique.size}`);
  return [...unique.values()].sort((a,b)=>a.chapter-b.chapter);
}

export function parseCharlesEnoch(source:string):StructuredUnit[]{
  const body=gutenbergBody(source);const start=body.search(/THE BOOK OF ENOCH\s+I-XXXVI\./);
  if(start<0)throw new Error("GUTENBERG_PARSE_FAILED: Book of Enoch body marker missing");
  const text=body.slice(start);const pattern=/^\s*\[?([IVXLCDM]+)\.\s*(?:(\d+)(?:-\d+)?\.\s*)?/gm;
  const candidates=[...text.matchAll(pattern)].map(match=>({match,index:match.index??0,chapter:romanToInt(match[1]),number:match[2]?Number(match[2]):null}))
    .filter(item=>item.chapter>=1&&item.chapter<=108);
  const selected=new Map<number,(typeof candidates)[number]>();
  for(const candidate of candidates){
    const current=selected.get(candidate.chapter);
    const score=(item:typeof candidate)=>item.number===1?3:item.number===null?2:1;
    if(!current||score(candidate)>score(current))selected.set(candidate.chapter,candidate);
  }
  const headings=[...selected.values()].sort((a,b)=>a.index-b.index);const units:StructuredUnit[]=[];
  for(const [index,heading] of headings.entries()){
    const next=headings[index+1]?.index??text.length;const block=text.slice(heading.index,next);
    if(block.trim())units.push({chapter:heading.chapter,label:`1 Enoch ${heading.chapter}`,text:normalizeBlock(block)});
  }
  const unique=new Map(units.map(unit=>[unit.chapter,unit]));
  if(unique.size<100)throw new Error(`GUTENBERG_PARSE_FAILED: expected at least 100 Enoch chapters, found ${unique.size}`);
  return [...unique.values()].sort((a,b)=>a.chapter-b.chapter);
}

async function manifestEdition(key:string):Promise<ManifestEdition>{
  const manifest=JSON.parse(await readFile(manifestPath,"utf8")) as {editions:ManifestEdition[]};
  const edition=manifest.editions.find(item=>item.key===key);
  if(!edition)throw new Error(`UNKNOWN_SACRED_EDITION: ${key}`);
  return edition;
}

export async function importSacredGutenbergEdition(pool:Pool,input:{editionKey:string;actor:string}){
  const manifest=await manifestEdition(input.editionKey);
  if(manifest.import_status!=="approved"||!manifest.download_url?.includes("gutenberg.org"))throw new Error(`EDITION_NOT_AUTOMATICALLY_IMPORTABLE: ${input.editionKey}`);
  const fetched=await safeFetchMetadata(manifest.download_url,{maxBytes:12_000_000,userAgentPurpose:"approved sacred-text Gutenberg import"});
  const source=new TextDecoder().decode(fetched.content);
  if(!source.includes("Project Gutenberg License"))throw new Error("RIGHTS_CHECK_FAILED: Project Gutenberg license missing");
  const parser=manifest.key==="quran-rodwell-1909"?parseRodwellQuran:manifest.key==="gita-arnold-1885"?parseArnoldGita:manifest.key==="enoch-charles-1917"?parseCharlesEnoch:null;
  if(!parser)throw new Error(`NO_STRUCTURED_PARSER: ${manifest.key}`);
  const units=parser(source);const contentHash=hash(fetched.content);const stored=await storePrivateObject(fetched.content,"txt");
  const bookKey=manifest.text==="quran"?"quran":manifest.text==="bhagavad-gita"?"bhagavad-gita":"1-enoch";
  const tradition=manifest.text==="quran"?"Islam":manifest.text==="bhagavad-gita"?"Hinduism":"Related";
  return transaction(pool,async client=>{
    let work=await client.query<{id:string}>(`SELECT id FROM works WHERE title=$1 AND work_type='sacred_text_edition_family' LIMIT 1`,[manifest.label]);
    if(!work.rows[0])work=await client.query<{id:string}>(
      `INSERT INTO works (title,work_type,tradition,original_language,description)
       VALUES ($1,'sacred_text_edition_family',$2,$3,$4) RETURNING id`,
      [manifest.label,tradition,manifest.language,`Historical Project Gutenberg edition; ${manifest.integrity}`]
    );
    let existing=await client.query<{id:string;content_hash:string;version_number:number}>(
      `SELECT id,content_hash,version_number FROM source_editions WHERE version_group_key=$1 ORDER BY version_number DESC LIMIT 1 FOR UPDATE`,
      [`sacred:${manifest.key}`]
    );
    let editionId=existing.rows[0]?.id;
    if(!existing.rows[0]||existing.rows[0].content_hash!==contentHash){
      const inserted=await client.query<{id:string}>(
        `INSERT INTO source_editions
          (work_id,version_group_key,version_number,supersedes_source_edition_id,title,edition_type,evidence_role,language,
           publisher,stable_identifier,canonical_url,license_name,rights_lane,rights_note,attribution_text,content_hash,
           independence_cluster_key,adapter_key,adapter_version,parser_version,rights_reviewed_at,rights_reviewed_by,
           publication_allowed,full_text_publication_allowed,storage_visibility,review_status,metadata)
         VALUES ($1,$2,$3,$4,$5,'sacred_text_gutenberg','primary_tradition',$6,'Project Gutenberg',$7,$8,
           'Project Gutenberg License / United States public-domain status','green',$9,$10,$11,$12,
           'sacred_gutenberg','1.0.0','structured-chapter-1.0.0',now(),$13,true,true,'public','approved',$14::jsonb) RETURNING id`,
        [work.rows[0].id,`sacred:${manifest.key}`,(existing.rows[0]?.version_number??0)+1,existing.rows[0]?.id??null,
          manifest.label,manifest.language,manifest.key,manifest.source_url,manifest.integrity,
          `${manifest.label}; Project Gutenberg source ${manifest.source_url}`,contentHash,`sacred:${manifest.key}`,input.actor,
          JSON.stringify({manifest_key:manifest.key,download_url:manifest.download_url,unit_count:units.length})]
      );
      editionId=inserted.rows[0].id;
      if(existing.rows[0])await client.query(`UPDATE source_editions SET review_status='superseded',updated_at=now() WHERE id=$1`,[existing.rows[0].id]);
    }
    await client.query(
      `INSERT INTO sacred_edition_profiles
        (source_edition_id,sacred_text_key,edition_key,display_name,language_code,source_kind,license_scope,text_integrity_policy,is_default)
       VALUES ($1,$2,$3,$4,$5,'translation','public_domain',$6,true)
       ON CONFLICT (source_edition_id) DO UPDATE SET display_name=EXCLUDED.display_name,searchable=true`,
      [editionId,manifest.text,manifest.key,manifest.label,manifest.language,manifest.integrity]
    );
    const sourceInput=await client.query<{id:string}>(
      `INSERT INTO source_inputs (input_type,normalized_key,payload,status,source_edition_id,rights_lane,created_by)
       VALUES ('url',$1,$2::jsonb,'human_review',$3,'green',$4)
       ON CONFLICT (input_type,normalized_key) DO UPDATE SET source_edition_id=EXCLUDED.source_edition_id,updated_at=now() RETURNING id`,
      [`sacred:${manifest.key}:${contentHash}`,JSON.stringify({manifest_key:manifest.key,url:manifest.download_url}),editionId,input.actor]
    );
    await client.query(
      `INSERT INTO source_snapshots
        (source_input_id,source_edition_id,content_hash,storage_uri,media_type,byte_size,adapter_key,adapter_version,private)
       VALUES ($1,$2,$3,$4,$5,$6,'sacred_gutenberg','1.0.0',true)
       ON CONFLICT (source_input_id,content_hash,adapter_version) DO NOTHING`,
      [sourceInput.rows[0].id,editionId,contentHash,stored.uri,fetched.mediaType,stored.byteSize]
    );
    for(const unit of units){
      const passage=await client.query<{id:string}>(
        `INSERT INTO passages (source_edition_id,locator_type,locator_value,translation_text,text_hash,extraction_confidence,review_status)
         VALUES ($1,'chapter',$2,$3,$4,1.0,'approved')
         ON CONFLICT (source_edition_id,locator_type,locator_value,text_hash) DO UPDATE SET translation_text=EXCLUDED.translation_text
         RETURNING id`,
        [editionId,unit.label,unit.text,hash(unit.text)]
      );
      await client.query(
        `INSERT INTO passage_sacred_references
          (passage_id,sacred_text_key,sacred_book_key,chapter_number,unit_label,normalized_reference,reference_sort_key)
         VALUES ($1,$2,$3,$4,'chapter',$5,$6)
         ON CONFLICT (passage_id) DO UPDATE SET normalized_reference=EXCLUDED.normalized_reference,reference_sort_key=EXCLUDED.reference_sort_key`,
        [passage.rows[0].id,manifest.text,bookKey,unit.chapter,unit.label,`${bookKey}:${String(unit.chapter).padStart(3,"0")}`]
      );
    }
    await appendAudit(client,{objectType:"source_edition",objectId:editionId,action:"sacred_gutenberg_edition_imported",actor:input.actor,
      after:{manifest_key:manifest.key,units:units.length,content_hash:contentHash}});
    return{edition_key:manifest.key,source_edition_id:editionId,passages:units.length,content_hash:contentHash};
  });
}
