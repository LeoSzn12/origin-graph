"use client";

import { use, useCallback, useEffect, useState } from "react";
import { EvidenceAdder } from "@/components/evidence-adder";

interface Evidence { id: string; stance: string; domain: string; statement: string; source_title: string; locator: string; cluster: string | null }

export default function HypothesisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [item, setItem] = useState<Record<string, any> | null>(null);
  const load = useCallback(() => { fetch(`/api/hypotheses/${id}`).then((response) => response.json()).then(setItem); }, [id]);
  useEffect(() => { load(); }, [load]);
  if (!item) return <main className="standard-page"><p className="empty-state">Loading hypothesis…</p></main>;
  const evidence = item.evidence as Evidence[];
  const groups = ['supports','challenges','contextualizes','ambiguous','cannot_test'];
  const clusters = new Set(evidence.map((card) => card.cluster).filter(Boolean));
  const domains = new Set(evidence.map((card) => card.domain).filter(Boolean));
  return <main className="standard-page">
    <header className="page-header"><div><p className="eyebrow">Private hypothesis · {item.state}</p><h1>{item.title}</h1></div><p>{item.proposition}</p></header>
    <section className="hypothesis-brief"><article><h2>Scope</h2><p>{item.scope}</p></article><article><h2>Predicted observations</h2><ul>{item.predicted_observations?.map((value:string)=><li key={value}>{value}</li>)}</ul></article><article><h2>Falsifiers</h2><ul>{item.falsifiers?.map((value:string)=><li key={value}>{value}</li>)}</ul></article><article><h2>Alternatives</h2><ul>{item.alternatives?.map((value:string)=><li key={value}>{value}</li>)}</ul></article></section>
    <section className="triangulation-summary" aria-label="Triangulation profile"><div><span>Evidence cards</span><strong>{evidence.length}</strong></div><div><span>Source families</span><strong>{clusters.size}</strong></div><div><span>Evidence domains</span><strong>{domains.size}</strong></div><p>Coverage description only—never a truth-probability score.</p></section>
    <section className="evidence-board">{groups.map(group=><div key={group}><h2>{group.replaceAll('_',' ')}</h2>{evidence.filter(e=>e.stance===group).map(e=><article key={e.id}><strong>{e.statement}</strong><p>{e.source_title} · {e.locator}</p><small>{e.domain} · family {e.cluster??'unreviewed'}</small></article>)}{!evidence.some(e=>e.stance===group)&&<p className="board-empty">No reviewed cards</p>}</div>)}</section>
    <EvidenceAdder hypothesisId={id} onAdded={load} />
    <p><a className="text-link" href={`/api/hypotheses/${id}/export?format=markdown`}>Export Markdown</a> · <a className="text-link" href={`/api/hypotheses/${id}/export?format=json`}>Export JSON</a></p>
  </main>;
}
