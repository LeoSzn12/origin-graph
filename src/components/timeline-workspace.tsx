"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { scaleLinear } from "d3-scale";

interface Band { key: string; label: string; from: number; to: number }
export interface TimelineItem { temporal_assertion_id:string;title:string;lane:string;role:string;earliest_year:number|null;latest_year:number|null;display_label:string;confidence:string;source_edition_id:string|null;source_title:string|null;locator_type:string|null;locator_value:string|null;tradition:string|null;culture:string|null }
interface AskResult { answer: string; answer_status: string; citations: { citation_id: string; display_label: string; locator: string }[]; uncertainties: string[]; source_counts: { passages: number; works: number; source_families: number } }

const fallbackBands: Band[] = [
  { key:"human-origins",label:"Human Origins",from:-7000000,to:-50000 }, { key:"late-pleistocene",label:"Late Pleistocene",from:-50000,to:-10000 },
  { key:"early-holocene",label:"Early Holocene",from:-10000,to:-4000 }, { key:"ancient",label:"Ancient Civilizations",from:-4000,to:500 },
  { key:"medieval",label:"Medieval to Early Modern",from:500,to:1800 }, { key:"modern",label:"Modern",from:1800,to:2026 }
];
const laneLabels: Record<string,string> = { climate_geology:"Climate & geology",claimed_events:"Claimed events",text_composition:"Text composition",physical_witnesses:"Witnesses",editions:"Editions",modern_observation:"Observation",historical_events:"Historical events" };

function displayYear(year: number | null): string { if (year === null) return "Unknown"; return year < 0 ? `${Math.abs(year).toLocaleString()} BCE` : `${year.toLocaleString()} CE`; }

export function layoutTimelineItems(items: TimelineItem[], scale: (year:number)=>number) {
  const rowEnds:number[]=[];
  return items.map((item) => {
    const start=Math.max(0,scale(item.earliest_year ?? 0));
    const end=Math.min(100,scale(item.latest_year ?? item.earliest_year ?? 0));
    const width=Math.max(1.2,end-start);
    let row=rowEnds.findIndex((rowEnd)=>start>=rowEnd+0.5);
    if(row<0) row=rowEnds.length;
    rowEnds[row]=Math.min(100,start+width);
    return {item,start,width,row};
  });
}

export function TimelineWorkspace() {
  const [bands,setBands] = useState<Band[]>(fallbackBands);
  const [bandKey,setBandKey] = useState("early-holocene");
  const [items,setItems] = useState<TimelineItem[]>([]);
  const [loading,setLoading] = useState(true);
  const [question,setQuestion] = useState("");
  const [askResult,setAskResult] = useState<AskResult | null>(null);
  const [asking,setAsking] = useState(false);
  const [selected,setSelected] = useState<TimelineItem | null>(null);
  const [visibleRoles,setVisibleRoles] = useState<string[]>([]);
  const band = bands.find((candidate) => candidate.key === bandKey) ?? bands[0];
  useEffect(() => { fetch("/api/timeline/anchors").then((response) => response.json()).then((data) => setBands(data.bands)).catch(() => undefined); }, []);
  useEffect(() => { setLoading(true); fetch(`/api/timeline?from=${band.from}&to=${band.to}&reviewed=true`).then((response) => response.json()).then((data) => setItems(data.items ?? [])).finally(() => setLoading(false)); }, [band.from,band.to]);
  const roles = useMemo(() => [...new Set(items.map((item) => item.role))], [items]);
  const filteredItems = useMemo(() => visibleRoles.length ? items.filter((item)=>visibleRoles.includes(item.role)) : items,[items,visibleRoles]);
  const lanes = useMemo(() => [...new Set(filteredItems.map((item) => item.lane))], [filteredItems]);
  const scale = useMemo(() => scaleLinear().domain([band.from,band.to]).range([2,98]), [band.from,band.to]);
  async function ask(event: FormEvent) { event.preventDefault(); if (!question.trim()) return; setAsking(true); const response = await fetch("/api/ask", { method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question}) }); setAskResult(await response.json()); setAsking(false); }
  const answerStatus=askResult?.answer_status==="grounded"?"Strong reviewed coverage":askResult?.answer_status==="partial"?"Limited reviewed coverage":"No reviewed match";
  return <main className="timeline-page">
    <section className="timeline-hero"><div><p className="eyebrow">Explore the reviewed chronology</p><h1>History,<br/>with every date in context.</h1><p className="timeline-intro">Compare traditions, scientific observations, physical witnesses, and historical claims without pretending they are the same kind of evidence.</p></div><form className="canvas-ask" onSubmit={ask}><label htmlFor="timeline-question">Quick evidence check</label><p>Ask a question here, or use <Link href="/ask">Ask evidence</Link> for filters, evidence groups, and full citations.</p><div><input id="timeline-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What evidence exists for…"/><button disabled={asking}>{asking ? "Checking…" : "Check"}</button></div></form></section>
    <ol className="timeline-how" aria-label="How to use the timeline"><li><b>1. Choose an era</b><span>Move from human origins to modern history.</span></li><li><b>2. Filter date types</b><span>Separate claimed events, texts, witnesses, and observations.</span></li><li><b>3. Select an interval</b><span>Inspect its source, exact locator, and uncertainty.</span></li></ol>
    {askResult && <aside className={`ask-overlay ${askResult.answer_status}`}><div><span>{answerStatus}</span><button onClick={() => setAskResult(null)} aria-label="Close answer">Close</button></div><p>{askResult.answer}</p>{askResult.source_counts && <small>{askResult.source_counts.passages} cited passages · {askResult.source_counts.works} works · {askResult.source_counts.source_families} independent families</small>}{askResult.citations?.length > 0 && <ul>{askResult.citations.map((citation) => <li key={citation.citation_id}><b>{citation.citation_id}</b> {citation.display_label} · {citation.locator}</li>)}</ul>}<Link className="ask-overlay-link" href={`/ask?question=${encodeURIComponent(question)}`}>Open the full evidence packet →</Link></aside>}
    <div className="band-tabs" role="tablist" aria-label="Timeline scale">{bands.map((candidate) => <button role="tab" aria-selected={candidate.key===bandKey} key={candidate.key} onClick={() => setBandKey(candidate.key)}>{candidate.label}<small>{displayYear(candidate.from)} – {displayYear(candidate.to)}</small></button>)}</div>
    <section className="timeline-canvas" aria-label={`${band.label} timeline`}><header><div><p className="eyebrow">Current band</p><h2>{band.label}</h2></div><p>Linear scale within this band. Select an interval to inspect its source, locator, and date role.</p></header><div className="timeline-role-filter"><span>{filteredItems.length} intervals</span>{roles.map(role=><button aria-pressed={visibleRoles.length===0||visibleRoles.includes(role)} onClick={()=>setVisibleRoles(current=>current.length===0?roles.filter(item=>item!==role):current.includes(role)?current.filter(item=>item!==role):[...current,role])} key={role}><i className={`role-swatch role-${role}`}/>{role.replaceAll('_',' ')}</button>)}{visibleRoles.length>0&&<button onClick={()=>setVisibleRoles([])}>Show all</button>}</div>{loading ? <p className="empty-state">Loading reviewed chronology…</p> : items.length === 0 ? <p className="empty-state">No reviewed items in this band yet. Add or review sources to populate it.</p> : <div className="lane-stack">{lanes.map((lane) => {const positioned=layoutTimelineItems(filteredItems.filter((item) => item.lane===lane),scale);const rowCount=Math.max(1,...positioned.map(({row})=>row+1));return <div className="timeline-lane" key={lane}><h3>{laneLabels[lane] ?? lane.replaceAll("_"," ")}</h3><div className="lane-track" style={{height:`${Math.max(76,16+rowCount*48)}px`}}>{positioned.map(({item,start,width,row}) => <button key={item.temporal_assertion_id} aria-pressed={selected?.temporal_assertion_id===item.temporal_assertion_id} onClick={()=>setSelected(item)} className={`timeline-mark role-${item.role}`} style={{left:`${start}%`,width:`${width}%`,top:`${12+row*48}px`}} title={`${item.title}: ${item.display_label}`}><span>{item.title}</span></button>)}</div></div>})}</div>}
      <div className="axis"><span>{displayYear(band.from)}</span><span>{displayYear((band.from+band.to)/2)}</span><span>{displayYear(band.to)}</span></div>
    </section>
    {selected&&<aside className="timeline-inspector"><header><span className="eyebrow">{selected.role.replaceAll('_',' ')}</span><button onClick={()=>setSelected(null)}>Close</button></header><h2>{selected.title}</h2><p>{selected.display_label}</p><dl><div><dt>Interval</dt><dd>{displayYear(selected.earliest_year)} — {displayYear(selected.latest_year)}</dd></div><div><dt>Confidence</dt><dd>{selected.confidence}</dd></div><div><dt>Tradition / culture</dt><dd>{selected.tradition??selected.culture??'Not assigned'}</dd></div><div><dt>Source</dt><dd>{selected.source_title??'Source claim not linked'}</dd></div><div><dt>Exact locator</dt><dd>{selected.locator_value?`${selected.locator_type}: ${selected.locator_value}`:'No source locator linked'}</dd></div></dl>{selected.source_edition_id&&<a href={`/sources/${selected.source_edition_id}`}>Open source card</a>}</aside>}
    <section className="timeline-table-section"><div className="section-heading"><div><p className="section-index">Accessible view</p><h2>Chronology records</h2></div><p>Same filtered data as the visual canvas.</p></div><div className="table-wrap"><table><thead><tr><th>Object</th><th>Date role</th><th>Earliest</th><th>Latest</th><th>Confidence</th></tr></thead><tbody>{filteredItems.map((item) => <tr key={item.temporal_assertion_id} onClick={()=>setSelected(item)}><td><strong>{item.title}</strong><small>{item.display_label}</small></td><td>{item.role.replaceAll("_"," ")}</td><td>{displayYear(item.earliest_year)}</td><td>{displayYear(item.latest_year)}</td><td>{item.confidence}</td></tr>)}</tbody></table></div></section>
  </main>;
}
