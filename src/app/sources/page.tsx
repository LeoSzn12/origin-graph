"use client";

import Link from "next/link";
import { useEffect,useMemo,useState } from "react";
import { ResearchPath } from "@/components/research-path";

export interface SourceRecord { id:string;source_edition_id:string|null;title:string;input_type:string;status:string;rights_lane:string;created_at:string }

export function filterSourceRecords(sources:SourceRecord[],query:string,status:string){
  const normalized=query.trim().toLocaleLowerCase();
  return sources.filter(source=>(!normalized||`${source.title} ${source.input_type}`.toLocaleLowerCase().includes(normalized))&&(status==="all"||source.status===status));
}

const statusLabels:Record<string,string>={human_review:"Needs review",materialized:"Ready to inspect",queued:"Queued",failed:"Needs attention"};

export default function SourcesPage(){
  const [sources,setSources]=useState<SourceRecord[]>([]);
  const [loading,setLoading]=useState(true);
  const [query,setQuery]=useState("");
  const [status,setStatus]=useState("all");
  useEffect(()=>{fetch("/api/sources").then(response=>response.json()).then(data=>setSources(data.sources??[])).finally(()=>setLoading(false));},[]);
  const shown=useMemo(()=>filterSourceRecords(sources,query,status),[sources,query,status]);
  const statuses=useMemo(()=>[...new Set(sources.map(source=>source.status))],[sources]);

  return <main className="standard-page source-library">
    <ResearchPath current="sources"/>
    <header className="page-header"><div><p className="eyebrow">Reviewed corpus</p><h1>Source library</h1></div><p>Find material, preserve its provenance, and move it through review before it can support an answer.</p></header>

    <section className="source-start" aria-labelledby="source-start-title"><div><p className="eyebrow">Start here</p><h2 id="source-start-title">How do you want to add evidence?</h2></div><Link href="/data-sources"><span>Search first</span><h3>Search connected collections</h3><p>Look across public texts, scholarship, archives, archaeology, geography, and scientific datasets.</p><b>Browse collections →</b></Link><Link href="/sources/new"><span>I have a source</span><h3>Add a specific source</h3><p>Register a URL, DOI, book citation, transcript segment, note, or private upload.</p><b>Add source →</b></Link></section>

    <ol className="source-pipeline" aria-label="Source review process"><li><b>1. Register</b><span>Capture the edition, stable URL, creator, and rights information.</span></li><li><b>2. Review</b><span>Verify the exact passage and decide whether publication is allowed.</span></li><li><b>3. Use</b><span>Published claims become searchable in Ask, timelines, maps, and hypotheses.</span></li></ol>

    <section className="library-section"><header><div><p className="eyebrow">Your research material</p><h2>Registered sources</h2></div><span>{shown.length} of {sources.length} shown</span></header><div className="library-toolbar"><label>Search this library<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Title or source type"/></label><label>Workflow status<select value={status} onChange={event=>setStatus(event.target.value)}><option value="all">All statuses</option>{statuses.map(value=><option value={value} key={value}>{statusLabels[value]??value.replaceAll("_"," ")}</option>)}</select></label></div>
      {loading?<p className="empty-state">Loading your source library…</p>:shown.length===0?<div className="library-empty"><h3>{sources.length?"No sources match these filters.":"Your source library is empty."}</h3><p>{sources.length?"Clear the search or choose a different workflow status.":"Search a connected collection or add a source you already trust."}</p>{sources.length?<button onClick={()=>{setQuery("");setStatus("all");}}>Clear filters</button>:<Link className="solid-button" href="/data-sources">Search connected collections</Link>}</div>:<div className="grid-list">{shown.map(source=>{const content=<><span className="kicker">{source.input_type.replaceAll("_"," ")}</span><h2>{source.title}</h2><p>Registered {new Date(source.created_at).toLocaleDateString()}</p><footer><span className={`pill lane-${source.rights_lane}`}>{source.rights_lane} rights</span><span className="status-chip">{statusLabels[source.status]??source.status.replaceAll("_"," ")}</span></footer></>;return source.source_edition_id?<Link className="grid-card" href={`/sources/${source.source_edition_id}`} key={source.id}>{content}</Link>:<article className="grid-card pending" key={source.id}>{content}</article>;})}</div>}
    </section>
  </main>;
}
