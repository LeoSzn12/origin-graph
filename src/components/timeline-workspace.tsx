"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { scaleLinear } from "d3-scale";

interface Band { key: string; label: string; from: number; to: number }
interface TimelineItem { temporal_assertion_id: string; title: string; lane: string; role: string; earliest_year: number | null; latest_year: number | null; display_label: string; confidence: string }
interface AskResult { answer: string; answer_status: string; citations: { citation_id: string; display_label: string; locator: string }[]; uncertainties: string[]; source_counts: { passages: number; works: number; source_families: number } }

const fallbackBands: Band[] = [
  { key:"human-origins",label:"Human Origins",from:-7000000,to:-50000 }, { key:"late-pleistocene",label:"Late Pleistocene",from:-50000,to:-10000 },
  { key:"early-holocene",label:"Early Holocene",from:-10000,to:-4000 }, { key:"ancient",label:"Ancient Civilizations",from:-4000,to:500 },
  { key:"medieval",label:"Medieval to Early Modern",from:500,to:1800 }, { key:"modern",label:"Modern",from:1800,to:2026 }
];
const laneLabels: Record<string,string> = { climate_geology:"Climate & geology",claimed_events:"Claimed events",text_composition:"Text composition",physical_witnesses:"Witnesses",editions:"Editions",modern_observation:"Observation",historical_events:"Historical events" };

function displayYear(year: number | null): string { if (year === null) return "Unknown"; return year < 0 ? `${Math.abs(year).toLocaleString()} BCE` : `${year.toLocaleString()} CE`; }

export function TimelineWorkspace() {
  const [bands,setBands] = useState<Band[]>(fallbackBands);
  const [bandKey,setBandKey] = useState("ancient");
  const [items,setItems] = useState<TimelineItem[]>([]);
  const [loading,setLoading] = useState(true);
  const [question,setQuestion] = useState("");
  const [askResult,setAskResult] = useState<AskResult | null>(null);
  const [asking,setAsking] = useState(false);
  const band = bands.find((candidate) => candidate.key === bandKey) ?? bands[0];
  useEffect(() => { fetch("/api/timeline/anchors").then((response) => response.json()).then((data) => setBands(data.bands)).catch(() => undefined); }, []);
  useEffect(() => { setLoading(true); fetch(`/api/timeline?from=${band.from}&to=${band.to}&reviewed=true`).then((response) => response.json()).then((data) => setItems(data.items ?? [])).finally(() => setLoading(false)); }, [band.from,band.to]);
  const lanes = useMemo(() => [...new Set(items.map((item) => item.lane))], [items]);
  const scale = useMemo(() => scaleLinear().domain([band.from,band.to]).range([2,98]), [band.from,band.to]);
  async function ask(event: FormEvent) { event.preventDefault(); if (!question.trim()) return; setAsking(true); const response = await fetch("/api/ask", { method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question}) }); setAskResult(await response.json()); setAsking(false); }
  return <main className="timeline-page">
    <section className="timeline-hero"><div><p className="eyebrow">Living chronology · reviewed evidence</p><h1>Human history,<br/>without collapsing time.</h1></div><form className="canvas-ask" onSubmit={ask}><label htmlFor="timeline-question">Ask across the reviewed corpus</label><div><input id="timeline-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Compare a motif, source, place, or chronology…"/><button disabled={asking}>{asking ? "Searching" : "Ask"}</button></div></form></section>
    {askResult && <aside className={`ask-overlay ${askResult.answer_status}`}><div><span>{askResult.answer_status}</span><button onClick={() => setAskResult(null)} aria-label="Close answer">Close</button></div><p>{askResult.answer}</p>{askResult.source_counts && <small>{askResult.source_counts.passages} passages · {askResult.source_counts.works} works · {askResult.source_counts.source_families} source families</small>}{askResult.citations?.length > 0 && <ul>{askResult.citations.map((citation) => <li key={citation.citation_id}><b>{citation.citation_id}</b> {citation.display_label} · {citation.locator}</li>)}</ul>}</aside>}
    <div className="band-tabs" role="tablist" aria-label="Timeline scale">{bands.map((candidate) => <button role="tab" aria-selected={candidate.key===bandKey} key={candidate.key} onClick={() => setBandKey(candidate.key)}>{candidate.label}<small>{displayYear(candidate.from)} – {displayYear(candidate.to)}</small></button>)}</div>
    <section className="timeline-canvas" aria-label={`${band.label} timeline`}><header><div><p className="eyebrow">Current band</p><h2>{band.label}</h2></div><p>Linear scale within this band. Dates preserve their source role and uncertainty.</p></header>{loading ? <p className="empty-state">Loading reviewed chronology…</p> : items.length === 0 ? <p className="empty-state">No reviewed items in this band yet. Add or review sources to populate it.</p> : <div className="lane-stack">{lanes.map((lane) => <div className="timeline-lane" key={lane}><h3>{laneLabels[lane] ?? lane.replaceAll("_"," ")}</h3><div className="lane-track">{items.filter((item) => item.lane===lane).map((item) => { const start=scale(item.earliest_year ?? band.from); const end=scale(item.latest_year ?? item.earliest_year ?? band.to); return <button key={item.temporal_assertion_id} className={`timeline-mark role-${item.role}`} style={{left:`${Math.max(0,start)}%`,width:`${Math.max(1.2,end-start)}%`}} title={`${item.title}: ${item.display_label}`}><span>{item.title}</span></button>; })}</div></div>)}</div>}
      <div className="axis"><span>{displayYear(band.from)}</span><span>{displayYear((band.from+band.to)/2)}</span><span>{displayYear(band.to)}</span></div>
    </section>
    <section className="timeline-table-section"><div className="section-heading"><div><p className="section-index">Accessible view</p><h2>Chronology records</h2></div><p>Same data as the visual canvas.</p></div><div className="table-wrap"><table><thead><tr><th>Object</th><th>Date role</th><th>Earliest</th><th>Latest</th><th>Confidence</th></tr></thead><tbody>{items.map((item) => <tr key={item.temporal_assertion_id}><td><strong>{item.title}</strong><small>{item.display_label}</small></td><td>{item.role.replaceAll("_"," ")}</td><td>{displayYear(item.earliest_year)}</td><td>{displayYear(item.latest_year)}</td><td>{item.confidence}</td></tr>)}</tbody></table></div></section>
  </main>;
}

