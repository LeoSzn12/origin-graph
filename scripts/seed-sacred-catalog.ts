import { createPool,transaction } from "../src/db";
import type { PoolClient } from "pg";
import { loadLocalEnv } from "./env";
import {
  allSacredBooks,catholicAdditionalBooks,catholicKeys,canonicalGroupForJewishBook,
  ethiopianDistinctBooks,newTestament,pentateuchKeys,protestantKeys,protestantOldTestament
} from "../src/sacred-texts/catalog";

async function insertMemberships(client:PoolClient,canonKey:string,keys:string[],sectionFor:(key:string)=>string,statusFor:(key:string)=>string=()=>"canonical"){
  for(const [index,key] of keys.entries()){
    const status=typeof statusFor==="function"?statusFor(key):"canonical";
    await client.query(
      `INSERT INTO sacred_canon_books (canon_key,sacred_book_key,section,position,canonical_group,membership_status,note)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (canon_key,sacred_book_key) DO UPDATE SET
         section=EXCLUDED.section,position=EXCLUDED.position,canonical_group=EXCLUDED.canonical_group,
         membership_status=EXCLUDED.membership_status,note=EXCLUDED.note`,
      [canonKey,key,sectionFor(key),index+1,canonKey==="jewish-tanakh"?canonicalGroupForJewishBook(key):null,status,
        canonKey==="christian-ethiopian"?"Membership map is expanded only when an edition or an authoritative canon record is verified.":null]
    );
  }
}

async function main(){
  loadLocalEnv();const pool=createPool();
  try{
    const summary=await transaction(pool,async client=>{
      for(const [index,book] of allSacredBooks.entries()){
        await client.query(
          `INSERT INTO sacred_books (key,label,alternate_labels,default_order)
           VALUES ($1,$2,$3::jsonb,$4)
           ON CONFLICT (key) DO UPDATE SET label=EXCLUDED.label,alternate_labels=EXCLUDED.alternate_labels,default_order=EXCLUDED.default_order`,
          [book.key,book.label,JSON.stringify(book.aliases??[]),index+1]
        );
      }

      const textBooks:Record<string,string[]>={
        torah:pentateuchKeys,
        tanakh:protestantOldTestament.map(book=>book.key),
        "christian-bible":[...new Set([...protestantKeys,...catholicAdditionalBooks.map(book=>book.key),...ethiopianDistinctBooks.map(book=>book.key)])],
        quran:["quran"],
        "bhagavad-gita":["bhagavad-gita"],
        "related-ancient":ethiopianDistinctBooks.map(book=>book.key)
      };
      for(const [textKey,keys] of Object.entries(textBooks))for(const [position,key] of keys.entries()){
        await client.query(
          `INSERT INTO sacred_text_books (sacred_text_key,sacred_book_key,position)
           VALUES ($1,$2,$3) ON CONFLICT (sacred_text_key,sacred_book_key) DO UPDATE SET position=EXCLUDED.position`,
          [textKey,key,position+1]
        );
      }

      await insertMemberships(client,"jewish-torah",pentateuchKeys,()=>"Torah");
      await insertMemberships(client,"jewish-tanakh",protestantOldTestament.map(book=>book.key),key=>{
        if(pentateuchKeys.includes(key))return"Torah";
        if(["joshua","judges","1-samuel","2-samuel","1-kings","2-kings","isaiah","jeremiah","ezekiel","hosea","joel","amos","obadiah","jonah","micah","nahum","habakkuk","zephaniah","haggai","zechariah","malachi"].includes(key))return"Nevi’im";
        return"Ketuvim";
      });
      await insertMemberships(client,"christian-protestant",protestantKeys,key=>newTestament.some(book=>book.key===key)?"New Testament":"Old Testament");
      await insertMemberships(client,"christian-catholic",catholicKeys,key=>newTestament.some(book=>book.key===key)?"New Testament":catholicAdditionalBooks.some(book=>book.key===key)?"Deuterocanon":"Old Testament",
        key=>catholicAdditionalBooks.some(book=>book.key===key)?"deuterocanonical":"canonical");
      const ethiopianMapped=[...protestantKeys,...ethiopianDistinctBooks.map(book=>book.key)];
      await insertMemberships(client,"christian-ethiopian",ethiopianMapped,key=>newTestament.some(book=>book.key===key)?"New Testament":ethiopianDistinctBooks.some(book=>book.key===key)?"Ethiopian additional books":"Old Testament",
        key=>ethiopianDistinctBooks.some(book=>book.key===key)?"broader_canon":"canonical");
      await insertMemberships(client,"quran-standard",["quran"],()=>"Quran");
      await insertMemberships(client,"bhagavad-gita-18",["bhagavad-gita"],()=>"Bhagavad Gita");

      const editions=await client.query<{id:string;stable_identifier:string|null;title:string;language:string|null}>(
        `SELECT id,stable_identifier,title,language FROM source_editions
         WHERE stable_identifier LIKE 'ebible:eng-web:%' OR stable_identifier IN ('gutenberg:2800','gutenberg:77935','gutenberg:2388')`
      );
      for(const edition of editions.rows){
        const web=edition.stable_identifier?.startsWith("ebible:eng-web:");
        const sacredText=web?"christian-bible":edition.stable_identifier==="gutenberg:2800"?"quran":edition.stable_identifier==="gutenberg:2388"?"bhagavad-gita":"related-ancient";
        const editionKey=(web?edition.stable_identifier!:edition.stable_identifier!).replaceAll(":","-").toLocaleLowerCase();
        await client.query(
          `INSERT INTO sacred_edition_profiles (source_edition_id,sacred_text_key,edition_key,display_name,language_code,source_kind,license_scope,text_integrity_policy,is_default)
           VALUES ($1,$2,$3,$4,$5,'translation','public_domain',$6,$7)
           ON CONFLICT (source_edition_id) DO UPDATE SET sacred_text_key=EXCLUDED.sacred_text_key,edition_key=EXCLUDED.edition_key,
             display_name=EXCLUDED.display_name,language_code=EXCLUDED.language_code`,
          [edition.id,sacredText,editionKey,edition.title,edition.language??"en",
            web?"Faithful World English Bible text; do not relabel modified text as WEB.":"Historical public-domain translation; retain edition context.",
            Boolean(web)]
        );
      }

      const passages=await client.query<{id:string;locator_value:string;stable_identifier:string|null}>(
        `SELECT p.id,p.locator_value,se.stable_identifier FROM passages p JOIN source_editions se ON se.id=p.source_edition_id
         WHERE se.stable_identifier LIKE 'ebible:eng-web:%' OR se.stable_identifier IN ('gutenberg:2800','gutenberg:77935','gutenberg:2388')`
      );
      const labelToKey=new Map(allSacredBooks.map(book=>[book.label.toLocaleLowerCase(),book.key]));
      let tagged=0;
      for(const passage of passages.rows){
        let textKey:string;let bookKey:string|null=null;let chapter:number|null=null;let verse:number|null=null;
        let reference=passage.locator_value;
        const biblical=passage.locator_value.match(/^(.+?)\s+(\d+):(\d+)$/);
        if(biblical){
          textKey="christian-bible";bookKey=labelToKey.get(biblical[1].toLocaleLowerCase())??null;
          chapter=Number(biblical[2]);verse=Number(biblical[3]);
        }else if(passage.stable_identifier==="gutenberg:2800"){textKey="quran";bookKey="quran";}
        else if(passage.stable_identifier==="gutenberg:2388"){textKey="bhagavad-gita";bookKey="bhagavad-gita";}
        else{textKey="related-ancient";bookKey="1-enoch";}
        if(!bookKey)continue;
        const sortKey=`${bookKey}:${String(chapter??0).padStart(3,"0")}:${String(verse??0).padStart(3,"0")}:${passage.id}`;
        const insert=await client.query(
          `INSERT INTO passage_sacred_references
            (passage_id,sacred_text_key,sacred_book_key,chapter_number,verse_start,unit_label,normalized_reference,reference_sort_key)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (passage_id) DO NOTHING`,
          [passage.id,textKey,bookKey,chapter,verse,verse?"verse":"excerpt",reference,sortKey]
        );
        tagged+=insert.rowCount??0;
      }
      return{books:allSacredBooks.length,canon_memberships:"seeded",editions_profiled:editions.rowCount,passages_tagged:tagged};
    });
    process.stdout.write(`${JSON.stringify(summary,null,2)}\n`);
  }finally{await pool.end();}
}

main().catch(error=>{process.stderr.write(`${error instanceof Error?error.message:String(error)}\n`);process.exitCode=1;});
