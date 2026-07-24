import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { strFromU8,unzipSync } from "fflate";
import type { Pool,PoolClient } from "pg";
import { transaction } from "@/db";
import { appendAudit } from "@/domain/services";
import { safeFetchMetadata } from "@/security/fetch";
import { storePrivateObject } from "@/storage/local-storage";
import { allSacredBooks } from "@/sacred-texts/catalog";

type ManifestEdition={
  key:string;text:string;label:string;language:string;source_kind:"original_language"|"translation"|"manuscript"|"commentary";
  source_url:string;download_url?:string;license_scope:"public_domain"|"attribution"|"noncommercial"|"restricted"|"unknown";
  integrity:string;import_status:string;
};

type ParsedVerse={bookKey:string;bookLabel:string;chapter:number;verseStart:number;verseEnd:number|null;text:string};
const bookByCode=new Map(allSacredBooks.filter(book=>book.code).map(book=>[book.code!,book]));
const manifestPath=fileURLToPath(new URL("../../corpus/sacred-texts/manifest.json",import.meta.url));
const hash=(value:Uint8Array|string)=>createHash("sha256").update(value).digest("hex");

function cleanUsfmText(value:string):string{
  return value
    .replace(/\\f\s[\s\S]*?\\f\*/g," ")
    .replace(/\\x\s[\s\S]*?\\x\*/g," ")
    .replace(/\\(?:fig|esb)\s[\s\S]*?\\(?:fig|esbe)\*/g," ")
    .replace(/\\w\s+([^|\\]+)(?:\|[^\\]*)?\\w\*/g,"$1")
    .replace(/\\\+?[a-z0-9-]+\*?/gi," ")
    .replace(/\s+/g," ")
    .trim();
}

export function parseUsfmBook(source:string):{code:string;verses:ParsedVerse[]}{
  const code=source.match(/^\\id\s+([0-9A-Z]{3})\b/m)?.[1];
  if(!code)throw new Error("USFM_PARSE_FAILED: missing book id");
  const book=bookByCode.get(code);
  if(!book)throw new Error(`USFM_UNKNOWN_BOOK: ${code}`);
  let chapter=0;let active:{start:number;end:number|null;text:string}|null=null;const verses:ParsedVerse[]=[];
  const flush=()=>{if(!active||chapter<1)return;const text=cleanUsfmText(active.text);if(text)verses.push({bookKey:book.key,bookLabel:book.label,chapter,verseStart:active.start,verseEnd:active.end,text});active=null;};
  for(const rawLine of source.replace(/\r/g,"").split("\n")){
    const line=rawLine.trim();if(!line)continue;
    const chapterMatch=line.match(/^\\c\s+(\d+)/);if(chapterMatch){flush();chapter=Number(chapterMatch[1]);continue;}
    const verseMatch=line.match(/^\\v\s+(\d+)(?:-(\d+))?\s*(.*)$/);
    if(verseMatch){flush();active={start:Number(verseMatch[1]),end:verseMatch[2]?Number(verseMatch[2]):null,text:verseMatch[3]};continue;}
    if(active&&!/^\\(?:id|h|toc\d?|mt\d?|c|cl|cp)\b/.test(line))active.text+=` ${line}`;
  }
  flush();return{code,verses};
}

async function loadManifest():Promise<ManifestEdition[]>{
  const parsed=JSON.parse(await readFile(manifestPath,"utf8")) as {editions:ManifestEdition[]};
  return parsed.editions;
}

export async function sacredManifestEditions(){return loadManifest();}

async function insertPassageChunks(client:PoolClient,editionId:string,sacredTextKey:string,verses:ParsedVerse[]){
  for(let offset=0;offset<verses.length;offset+=500){
    const chunk=verses.slice(offset,offset+500);
    await client.query(
      `INSERT INTO passages (source_edition_id,locator_type,locator_value,translation_text,text_hash,extraction_confidence,review_status)
       SELECT $1,'chapter_verse',locator,text_value,text_hash,1.0,'approved'
       FROM unnest($2::text[],$3::text[],$4::text[]) AS imported(locator,text_value,text_hash)
       ON CONFLICT (source_edition_id,locator_type,locator_value,text_hash) DO UPDATE SET
         translation_text=EXCLUDED.translation_text,extraction_confidence=EXCLUDED.extraction_confidence`,
      [editionId,chunk.map(v=>`${v.bookLabel} ${v.chapter}:${v.verseStart}${v.verseEnd?`-${v.verseEnd}`:""}`),chunk.map(v=>v.text),chunk.map(v=>hash(v.text))]
    );
  }
  const rows=await client.query<{id:string;locator_value:string}>(
    `SELECT id,locator_value FROM passages WHERE source_edition_id=$1`,[editionId]
  );
  const passageByLocator=new Map(rows.rows.map(row=>[row.locator_value,row.id]));
  for(let offset=0;offset<verses.length;offset+=500){
    const chunk=verses.slice(offset,offset+500);
    const passageIds:string[]=[];const bookKeys:string[]=[];const chapters:number[]=[];
    const starts:number[]=[];const ends:(number|null)[]=[];const labels:string[]=[];const refs:string[]=[];const sorts:string[]=[];
    for(const verse of chunk){
      const reference=`${verse.bookLabel} ${verse.chapter}:${verse.verseStart}${verse.verseEnd?`-${verse.verseEnd}`:""}`;
      const passageId=passageByLocator.get(reference);if(!passageId)continue;
      passageIds.push(passageId);bookKeys.push(verse.bookKey);chapters.push(verse.chapter);starts.push(verse.verseStart);
      ends.push(verse.verseEnd);labels.push("verse");refs.push(reference);
      sorts.push(`${String(allSacredBooks.findIndex(book=>book.key===verse.bookKey)+1).padStart(3,"0")}:${String(verse.chapter).padStart(3,"0")}:${String(verse.verseStart).padStart(3,"0")}`);
    }
    if(!passageIds.length)continue;
    await client.query(
      `INSERT INTO passage_sacred_references
        (passage_id,sacred_text_key,sacred_book_key,chapter_number,verse_start,verse_end,unit_label,normalized_reference,reference_sort_key)
       SELECT passage_id,$2,book_key,chapter_number,verse_start,verse_end,unit_label,normalized_reference,reference_sort_key
       FROM unnest($1::uuid[],$3::text[],$4::int[],$5::int[],$6::int[],$7::text[],$8::text[],$9::text[])
         AS imported(passage_id,book_key,chapter_number,verse_start,verse_end,unit_label,normalized_reference,reference_sort_key)
       ON CONFLICT (passage_id) DO UPDATE SET sacred_text_key=EXCLUDED.sacred_text_key,
         sacred_book_key=EXCLUDED.sacred_book_key,chapter_number=EXCLUDED.chapter_number,verse_start=EXCLUDED.verse_start,
         verse_end=EXCLUDED.verse_end,unit_label=EXCLUDED.unit_label,normalized_reference=EXCLUDED.normalized_reference,
         reference_sort_key=EXCLUDED.reference_sort_key`,
      [passageIds,sacredTextKey,bookKeys,chapters,starts,ends,labels,refs,sorts]
    );
  }
}

export async function importSacredUsfmEdition(pool:Pool,input:{editionKey:string;actor:string}){
  const manifest=(await loadManifest()).find(edition=>edition.key===input.editionKey);
  if(!manifest)throw new Error(`UNKNOWN_SACRED_EDITION: ${input.editionKey}`);
  if(manifest.import_status!=="approved"||!manifest.download_url?.endsWith(".zip"))throw new Error(`EDITION_NOT_AUTOMATICALLY_IMPORTABLE: ${input.editionKey}`);
  const fetched=await safeFetchMetadata(manifest.download_url,{maxBytes:25_000_000,userAgentPurpose:"approved sacred-text USFM import"});
  const archive=unzipSync(fetched.content);const parsed:ParsedVerse[]=[];const warnings:string[]=[];
  for(const [name,bytes] of Object.entries(archive)){
    if(!/\.usfm$/i.test(name))continue;
    try{parsed.push(...parseUsfmBook(strFromU8(bytes)).verses);}catch(error){
      const message=error instanceof Error?error.message:String(error);
      if(message.startsWith("USFM_UNKNOWN_BOOK:"))warnings.push(`${name}: ${message}`);else throw error;
    }
  }
  if(!parsed.length)throw new Error("USFM_PARSE_FAILED: archive contained no recognized verses");
  const contentHash=hash(fetched.content);const stored=await storePrivateObject(fetched.content,"zip");
  return transaction(pool,async client=>{
    const tradition=manifest.text==="tanakh"?"Judaism":manifest.text==="christian-bible"?"Christianity":manifest.text==="quran"?"Islam":"Hinduism";
    let work=await client.query<{id:string}>(`SELECT id FROM works WHERE title=$1 AND work_type='sacred_text_edition_family' LIMIT 1`,[manifest.label]);
    if(!work.rows[0])work=await client.query<{id:string}>(
      `INSERT INTO works (title,work_type,tradition,original_language,description)
       VALUES ($1,'sacred_text_edition_family',$2,$3,$4) RETURNING id`,
      [manifest.label,tradition,manifest.language,`Edition family imported from ${manifest.source_url}; passages remain edition-specific.`]
    );
    let edition=await client.query<{id:string;content_hash:string;version_number:number}>(
      `SELECT id,content_hash,version_number FROM source_editions WHERE version_group_key=$1 ORDER BY version_number DESC LIMIT 1 FOR UPDATE`,
      [`sacred:${manifest.key}`]
    );
    let editionId=edition.rows[0]?.id;
    if(!edition.rows[0]||edition.rows[0].content_hash!==contentHash){
      const version=(edition.rows[0]?.version_number??0)+1;
      const inserted=await client.query<{id:string}>(
        `INSERT INTO source_editions
          (work_id,version_group_key,version_number,supersedes_source_edition_id,title,edition_type,evidence_role,language,
           publisher,stable_identifier,canonical_url,license_name,rights_lane,rights_note,attribution_text,content_hash,
           independence_cluster_key,adapter_key,adapter_version,parser_version,rights_reviewed_at,rights_reviewed_by,
           publication_allowed,full_text_publication_allowed,storage_visibility,review_status,metadata)
         VALUES ($1,$2,$3,$4,$5,'sacred_text_usfm','primary_tradition',$6,$7,$8,$9,$10,'green',$11,$12,$13,$14,
           'sacred_usfm','1.0.0','usfm-verse-1.0.0',now(),$15,true,true,'public','approved',$16::jsonb) RETURNING id`,
        [work.rows[0].id,`sacred:${manifest.key}`,version,edition.rows[0]?.id??null,manifest.label,manifest.language,
          new URL(manifest.source_url).hostname,manifest.key,manifest.source_url,
          manifest.license_scope==="public_domain"?"Public Domain":manifest.license_scope,
          manifest.integrity,`${manifest.label}; source ${manifest.source_url}`,contentHash,`sacred:${manifest.key}`,input.actor,
          JSON.stringify({manifest_key:manifest.key,download_url:manifest.download_url,warnings})]
      );
      editionId=inserted.rows[0].id;
      if(edition.rows[0])await client.query(`UPDATE source_editions SET review_status='superseded',updated_at=now() WHERE id=$1`,[edition.rows[0].id]);
    }
    await client.query(
      `INSERT INTO sacred_edition_profiles
        (source_edition_id,sacred_text_key,edition_key,display_name,language_code,source_kind,license_scope,text_integrity_policy,is_default)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true)
       ON CONFLICT (source_edition_id) DO UPDATE SET display_name=EXCLUDED.display_name,searchable=true`,
      [editionId,manifest.text,manifest.key,manifest.label,manifest.language,manifest.source_kind,manifest.license_scope,manifest.integrity]
    );
    const normalizedKey=`sacred:${manifest.key}:${contentHash}`;const sourceInput=await client.query<{id:string}>(
      `INSERT INTO source_inputs (input_type,normalized_key,payload,status,source_edition_id,rights_lane,created_by)
       VALUES ('url',$1,$2::jsonb,'human_review',$3,'green',$4)
       ON CONFLICT (input_type,normalized_key) DO UPDATE SET source_edition_id=EXCLUDED.source_edition_id,updated_at=now() RETURNING id`,
      [normalizedKey,JSON.stringify({manifest_key:manifest.key,url:manifest.download_url}),editionId,input.actor]
    );
    await client.query(
      `INSERT INTO source_snapshots
        (source_input_id,source_edition_id,content_hash,storage_uri,media_type,byte_size,adapter_key,adapter_version,private)
       VALUES ($1,$2,$3,$4,$5,$6,'sacred_usfm','1.0.0',true)
       ON CONFLICT (source_input_id,content_hash,adapter_version) DO NOTHING`,
      [sourceInput.rows[0].id,editionId,contentHash,stored.uri,fetched.mediaType,stored.byteSize]
    );
    await insertPassageChunks(client,editionId,manifest.text,parsed);
    await appendAudit(client,{objectType:"source_edition",objectId:editionId,action:"sacred_usfm_edition_imported",actor:input.actor,
      after:{manifest_key:manifest.key,verses:parsed.length,warnings,content_hash:contentHash}});
    return{edition_key:manifest.key,source_edition_id:editionId,passages:parsed.length,warnings,content_hash:contentHash};
  });
}
