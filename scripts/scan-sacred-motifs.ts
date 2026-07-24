import { createPool } from "../src/db";
import { loadLocalEnv } from "./env";
import { scanSacredMotifs } from "../src/sacred-texts/motif-scanner";

async function main(){loadLocalEnv();const pool=createPool();try{process.stdout.write(`${JSON.stringify(await scanSacredMotifs(pool,"sacred-motif-scanner"),null,2)}\n`);}finally{await pool.end();}}
main().catch(error=>{process.stderr.write(`${error instanceof Error?error.message:String(error)}\n`);process.exitCode=1;});
