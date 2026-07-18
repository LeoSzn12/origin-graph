import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { loadLocalEnv } from "./env";

async function main(){loadLocalEnv();const url=process.env.DATABASE_URL;if(!url)throw new Error("DATABASE_URL is required");const parsed=new URL(url);const outputDir="artifacts/backups";await mkdir(outputDir,{recursive:true});const stamp=new Date().toISOString().replace(/[:.]/g,"-");const output=`${outputDir}/origin-graph-${stamp}.dump`;const env={...process.env,PGHOST:parsed.hostname,PGPORT:parsed.port||"5432",PGUSER:decodeURIComponent(parsed.username),PGPASSWORD:decodeURIComponent(parsed.password),PGDATABASE:parsed.pathname.slice(1)};await new Promise<void>((resolve,reject)=>{const child=spawn("pg_dump",["--format=custom","--no-owner","--no-privileges","--file",output],{env,stdio:["ignore","inherit","inherit"]});child.on("error",reject);child.on("exit",code=>code===0?resolve():reject(new Error(`pg_dump exited ${code}`)));});process.stdout.write(`${output}\n`);}
main().catch(error=>{process.stderr.write(`${error instanceof Error?error.message:String(error)}\n`);process.exitCode=1;});
