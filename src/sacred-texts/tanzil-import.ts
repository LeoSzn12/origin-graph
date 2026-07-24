import { createHash } from "node:crypto";
import type { Pool } from "pg";
import { transaction } from "@/db";
import { appendAudit } from "@/domain/services";
import { safeFetchMetadata } from "@/security/fetch";
import { storePrivateObject } from "@/storage/local-storage";

const downloadUrl="https://tanzil.net/pub/download/index.php?quranType=uthmani&outType=txt-2&agree=true&marks=true&sajdah=true&tatweel=true";
const sourceUrl="https://tanzil.net/docs/download";
const integrityNotice="Verbatim Tanzil Quran Text Version 1.1. Text changes are prohibited. Source: Tanzil Project, https://tanzil.net.";
const hash=(value:Uint8Array|string)=>createHash("sha256").update(value).digest("hex");
export const quranAyahCounts=[7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];

export function parseTanzilQuran(source:string):{surah:number;ayah:number;text:string}[]{
  const verses=source.replace(/\r/g,"").split("\n").map(line=>{
    const match=line.match(/^(\d{1,3})\|(\d{1,3})\|(.+)$/);if(!match)return null;
    return{surah:Number(match[1]),ayah:Number(match[2]),text:match[3]};
  }).filter((value):value is {surah:number;ayah:number;text:string}=>Boolean(value));
  if(verses.length!==6236)throw new Error(`TANZIL_PARSE_FAILED: expected 6236 ayahs, found ${verses.length}`);
  if(verses.some(verse=>verse.surah<1||verse.surah>114||verse.ayah<1||!verse.text.trim()))throw new Error("TANZIL_PARSE_FAILED: invalid surah, ayah, or empty text");
  for(const verse of verses)if(verse.ayah>quranAyahCounts[verse.surah-1])throw new Error(`TANZIL_PARSE_FAILED: invalid ayah ${verse.surah}:${verse.ayah}`);
  if(new Set(verses.map(verse=>`${verse.surah}:${verse.ayah}`)).size!==6236)throw new Error("TANZIL_PARSE_FAILED: duplicate or missing surah/ayah references");
  return verses;
}

export async function importTanzilQuran(pool:Pool,input:{actor:string}){
  const fetched=await safeFetchMetadata(downloadUrl,{maxBytes:4_000_000,userAgentPurpose:"verbatim Tanzil Quran import"});
  const source=new TextDecoder().decode(fetched.content);const verses=parseTanzilQuran(source);
  const contentHash=hash(fetched.content);const stored=await storePrivateObject(fetched.content,"txt");
  return transaction(pool,async client=>{
    let work=await client.query<{id:string}>(`SELECT id FROM works WHERE title='Tanzil Quran Text, Uthmani' AND work_type='sacred_text_edition_family' LIMIT 1`);
    if(!work.rows[0])work=await client.query<{id:string}>(
      `INSERT INTO works (title,work_type,tradition,culture,original_language,description)
       VALUES ('Tanzil Quran Text, Uthmani','sacred_text_edition_family','Islam','Quranic Arabic','ar',
         'Verified Arabic Quran text supplied by the Tanzil Project; redistribution must remain verbatim and attributed.') RETURNING id`
    );
    let existing=await client.query<{id:string;content_hash:string;version_number:number}>(
      `SELECT id,content_hash,version_number FROM source_editions WHERE version_group_key='sacred:quran-tanzil-uthmani' ORDER BY version_number DESC LIMIT 1 FOR UPDATE`
    );
    let editionId=existing.rows[0]?.id;
    if(!existing.rows[0]||existing.rows[0].content_hash!==contentHash){
      const inserted=await client.query<{id:string}>(
        `INSERT INTO source_editions
          (work_id,version_group_key,version_number,supersedes_source_edition_id,title,edition_type,evidence_role,language,
           publisher,publication_date,stable_identifier,canonical_url,license_name,license_url,rights_lane,rights_note,
           attribution_text,content_hash,independence_cluster_key,adapter_key,adapter_version,parser_version,
           rights_reviewed_at,rights_reviewed_by,publication_allowed,full_text_publication_allowed,storage_visibility,review_status,metadata)
         VALUES ($1,'sacred:quran-tanzil-uthmani',$2,$3,'Tanzil Quran Text, Uthmani','verified_original_language_text',
           'primary_tradition','ar','Tanzil Project','Version 1.1, February 2021','quran-tanzil-uthmani',$4,
           'Tanzil Quran Text Terms of Use',$5,'green',$6,$6,$7,'sacred:quran-arabic','tanzil','1.1',
           'tanzil-pipe-verse-1.0.0',now(),$8,true,true,'public','approved',$9::jsonb) RETURNING id`,
        [work.rows[0].id,(existing.rows[0]?.version_number??0)+1,existing.rows[0]?.id??null,sourceUrl,
          "https://tanzil.net/docs/Text_License",integrityNotice,contentHash,input.actor,
          JSON.stringify({text_type:"uthmani",pause_marks:true,sajdah_signs:true,tatweel:true,ayah_count:6236,source_download:downloadUrl})]
      );
      editionId=inserted.rows[0].id;
      if(existing.rows[0])await client.query(`UPDATE source_editions SET review_status='superseded',updated_at=now() WHERE id=$1`,[existing.rows[0].id]);
    }
    await client.query(
      `INSERT INTO sacred_edition_profiles
        (source_edition_id,sacred_text_key,edition_key,display_name,language_code,source_kind,license_scope,text_integrity_policy,is_default)
       VALUES ($1,'quran','quran-tanzil-uthmani','Tanzil Quran Text, Uthmani','ar','original_language','attribution',$2,true)
       ON CONFLICT (source_edition_id) DO UPDATE SET searchable=true,text_integrity_policy=EXCLUDED.text_integrity_policy`,
      [editionId,integrityNotice]
    );
    const sourceInput=await client.query<{id:string}>(
      `INSERT INTO source_inputs (input_type,normalized_key,payload,status,source_edition_id,rights_lane,created_by)
       VALUES ('url',$1,$2::jsonb,'human_review',$3,'green',$4)
       ON CONFLICT (input_type,normalized_key) DO UPDATE SET source_edition_id=EXCLUDED.source_edition_id,updated_at=now() RETURNING id`,
      [`sacred:quran-tanzil-uthmani:${contentHash}`,JSON.stringify({url:downloadUrl,terms_accepted:true,integrity_notice:integrityNotice}),editionId,input.actor]
    );
    await client.query(
      `INSERT INTO source_snapshots
        (source_input_id,source_edition_id,content_hash,storage_uri,media_type,byte_size,adapter_key,adapter_version,private)
       VALUES ($1,$2,$3,$4,$5,$6,'tanzil','1.1',true)
       ON CONFLICT (source_input_id,content_hash,adapter_version) DO NOTHING`,
      [sourceInput.rows[0].id,editionId,contentHash,stored.uri,fetched.mediaType,stored.byteSize]
    );
    for(let offset=0;offset<verses.length;offset+=500){
      const chunk=verses.slice(offset,offset+500);
      await client.query(
        `INSERT INTO passages (source_edition_id,locator_type,locator_value,original_text,text_hash,extraction_confidence,review_status)
         SELECT $1,'surah_ayah',reference,text_value,text_hash,1.0,'approved'
         FROM unnest($2::text[],$3::text[],$4::text[]) AS imported(reference,text_value,text_hash)
         ON CONFLICT (source_edition_id,locator_type,locator_value,text_hash) DO UPDATE SET original_text=EXCLUDED.original_text`,
        [editionId,chunk.map(v=>`Quran ${v.surah}:${v.ayah}`),chunk.map(v=>v.text),chunk.map(v=>hash(v.text))]
      );
    }
    const passageRows=await client.query<{id:string;locator_value:string}>(`SELECT id,locator_value FROM passages WHERE source_edition_id=$1`,[editionId]);
    const passageByReference=new Map(passageRows.rows.map(row=>[row.locator_value,row.id]));
    for(const verse of verses){
      const reference=`Quran ${verse.surah}:${verse.ayah}`;const passageId=passageByReference.get(reference);if(!passageId)continue;
      await client.query(
        `INSERT INTO passage_sacred_references
          (passage_id,sacred_text_key,sacred_book_key,chapter_number,verse_start,unit_label,normalized_reference,reference_sort_key)
         VALUES ($1,'quran','quran',$2,$3,'ayah',$4,$5)
         ON CONFLICT (passage_id) DO UPDATE SET normalized_reference=EXCLUDED.normalized_reference,reference_sort_key=EXCLUDED.reference_sort_key`,
        [passageId,verse.surah,verse.ayah,reference,`quran:${String(verse.surah).padStart(3,"0")}:${String(verse.ayah).padStart(3,"0")}`]
      );
    }
    await appendAudit(client,{objectType:"source_edition",objectId:editionId,action:"tanzil_quran_imported",actor:input.actor,
      after:{ayahs:verses.length,content_hash:contentHash,verbatim:true,attribution:integrityNotice}});
    return{edition_key:"quran-tanzil-uthmani",source_edition_id:editionId,passages:verses.length,content_hash:contentHash};
  });
}
