import { createPool } from "../src/db";
import { loadLocalEnv } from "./env";
import { importSacredUsfmEdition,sacredManifestEditions } from "../src/sacred-texts/usfm-import";
import { importSacredGutenbergEdition } from "../src/sacred-texts/gutenberg-import";
import { importTanzilQuran } from "../src/sacred-texts/tanzil-import";

async function main(){
  loadLocalEnv();const requested=process.argv.slice(2);const manifest=await sacredManifestEditions();
  const keys=requested.includes("--approved")
    ?manifest.filter(item=>item.import_status==="approved"&&item.download_url).map(item=>item.key)
    :requested;
  if(!keys.length)throw new Error("Provide edition keys or --approved. Start with: jps-tanakh-1917 web-protestant-2025 web-catholic-2025");
  const pool=createPool();try{
    for(const editionKey of keys){
      const selected=manifest.find(item=>item.key===editionKey);
      const result=editionKey==="quran-tanzil-uthmani"
        ?await importTanzilQuran(pool,{actor:"sacred-corpus-import"})
        :selected?.download_url?.endsWith(".zip")
          ?await importSacredUsfmEdition(pool,{editionKey,actor:"sacred-corpus-import"})
          :await importSacredGutenbergEdition(pool,{editionKey,actor:"sacred-corpus-import"});
      process.stdout.write(`${JSON.stringify(result)}\n`);
    }
  }finally{await pool.end();}
}
main().catch(error=>{process.stderr.write(`${error instanceof Error?error.message:String(error)}\n`);process.exitCode=1;});
