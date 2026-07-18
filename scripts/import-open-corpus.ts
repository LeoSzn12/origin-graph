import { createPool } from "../src/db";
import { importWorldEnglishBibleChapter } from "../src/connectors/open-corpus-import";
import { loadLocalEnv } from "./env";

loadLocalEnv();
async function main(){const requested=process.argv.slice(2);if(!requested.length)throw new Error("Provide one or more World English Bible chapters as BOOK:CHAPTER, for example GEN:6 GEN:7.");const pool=createPool();try{for(const value of requested){const match=value.match(/^([1-3]?[A-Za-z]{2,3}):(\d{1,3})$/);if(!match)throw new Error(`Invalid chapter selector: ${value}`);const result=await importWorldEnglishBibleChapter(pool,{book:match[1],chapter:Number(match[2]),actor:"open-corpus-import"});process.stdout.write(`${JSON.stringify(result)}\n`);}}finally{await pool.end();}}
main().catch((error)=>{process.stderr.write(`${error instanceof Error?error.message:String(error)}\n`);process.exitCode=1;});
