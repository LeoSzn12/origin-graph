"use client";
import Link from "next/link";
import { useEffect,useState } from "react";
interface CaseFile{id:string;slug:string;title:string;core_question:string;review_status:string;object_count:number}
export default function CaseFilesPage(){const [files,setFiles]=useState<CaseFile[]>([]);useEffect(()=>{fetch('/api/case-files').then(r=>r.json()).then(d=>setFiles(d.case_files??[]));},[]);return <main className="standard-page"><header className="page-header"><div><p className="eyebrow">Curated investigations</p><h1>Case files</h1></div><p>Each file keeps primary sources, chronology, support, challenge, alternatives, rights, and revision history visible together.</p></header><div className="grid-list">{files.map((file,index)=><Link className="grid-card" href={`/case-files/${file.slug}`} key={file.id}><span className="kicker">Case {String(index+1).padStart(2,'0')}</span><h2>{file.title}</h2><p>{file.core_question}</p><footer><span>{file.object_count} linked objects</span><span className="status-chip">{file.review_status}</span></footer></Link>)}</div></main>}

