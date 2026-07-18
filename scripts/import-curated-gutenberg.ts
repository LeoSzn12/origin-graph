import { createPool } from "../src/db";
import { importGutenbergExcerpts } from "../src/connectors/open-corpus-import";
import { loadLocalEnv } from "./env";

const plan=[
  {ebookId:1572,ranges:[{start:1,end:26,label:"Project Gutenberg embedded header"},{start:4300,end:4370,label:"Timaeus dialogue — Critias account of Atlantis"}]},
  {ebookId:77935,ranges:[{start:1,end:26,label:"Project Gutenberg embedded header"},{start:1090,end:1123,label:"1 Enoch chapters 6–7 — Watchers and giants"}]},
  {ebookId:15474,ranges:[{start:1,end:26,label:"Project Gutenberg embedded header"},{start:57032,end:57045,label:"Mahabharata Volume 1 — celestials in the firmament, vimanam note marker"},{start:58432,end:58438,label:"Mahabharata Volume 1 — translator note 107 on vimanam"},{start:16872,end:16894,label:"Mahabharata Volume 1, Section CLXXII — fiery celestial weapon"}]},
  {ebookId:2017,ranges:[{start:1,end:26,label:"Project Gutenberg embedded header"},{start:786,end:815,label:"Dhammapada chapter XIV, verses 179–185 — the Awakened and their teaching"}]},
  {ebookId:3330,ranges:[{start:1,end:26,label:"Project Gutenberg embedded header"},{start:60,end:82,label:"Analects book I, chapter I — the Master on learning and friendship"}]},
  {ebookId:2800,ranges:[{start:1,end:26,label:"Project Gutenberg embedded header"},{start:23550,end:23562,label:"Koran sura 33 — Muhammad described as apostle and seal of the prophets"}]}
];
async function main(){loadLocalEnv();const pool=createPool();try{for(const item of plan){const result=await importGutenbergExcerpts(pool,{...item,actor:"curated-gutenberg-import"});process.stdout.write(`${JSON.stringify(result)}\n`);}}finally{await pool.end();}}
main().catch(error=>{process.stderr.write(`${error instanceof Error?error.message:String(error)}\n`);process.exitCode=1;});
