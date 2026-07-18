"use client";

import Link from "next/link";
import { useEffect,useState, type FormEvent } from "react";
import { ResearchPath } from "@/components/research-path";

type Tab="answer"|"evidence"|"chronology"|"citations";
type EvidenceItem=Record<string,string>;

const roles=[
  ["primary_tradition","Myth, folklore & primary texts"],
  ["physical_scientific","Scientific & material evidence"],
  ["academic_interpretation","Scholarship & interpretation"],
  ["modern_discourse","Modern commentary"]
] as const;
const roleLabels:Record<string,string>=Object.fromEntries(roles);
const examples=[
  "What evidence supports a historical flood tradition?",
  "What is the evidence around the Younger Dryas transition?",
  "What do reviewed editions say about Atlantis in Plato?",
  "Compare sacred-teacher roles across traditions"
];
const statusCopy:Record<string,{label:string;description:string}>={
  grounded:{label:"Strong reviewed coverage",description:"Multiple independent source families matched."},
  partial:{label:"Limited reviewed coverage",description:"Relevant evidence matched, but comparison is incomplete."},
  insufficient:{label:"No reviewed match",description:"The corpus cannot support an answer yet."}
};

export default function AskPage(){
  const [question,setQuestion]=useState("");
  const [selectedRoles,setSelectedRoles]=useState<string[]>([]);
  const [fromYear,setFromYear]=useState("");
  const [toYear,setToYear]=useState("");
  const [result,setResult]=useState<Record<string,any>|null>(null);
  const [loading,setLoading]=useState(false);
  const [tab,setTab]=useState<Tab>("answer");
  const [message,setMessage]=useState("");

  useEffect(()=>{const seededQuestion=new URLSearchParams(window.location.search).get("question");if(seededQuestion)setQuestion(seededQuestion);},[]);

  async function submit(event:FormEvent){event.preventDefault();setLoading(true);setMessage("");const filters={evidence_roles:selectedRoles.length?selectedRoles:undefined,from_year:fromYear?Number(fromYear):undefined,to_year:toYear?Number(toYear):undefined};const response=await fetch("/api/ask",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question,filters})});setResult(await response.json());setLoading(false);setTab("answer");requestAnimationFrame(()=>document.getElementById("results")?.scrollIntoView({behavior:"smooth",block:"start"}));}
  function toggleRole(role:string){setSelectedRoles(current=>current.includes(role)?current.filter(item=>item!==role):[...current,role]);}
  async function saveHypothesis(){if(!result?.suggested_hypothesis)return;setMessage("Creating private hypothesis…");const seed=result.suggested_hypothesis;const response=await fetch("/api/hypotheses",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({slug:`ask-${Date.now()}`,title:seed.title,proposition:seed.proposition,scope:seed.scope,predictions:[],falsifiers:[],alternatives:seed.alternatives})});const data=await response.json();if(!response.ok){setMessage(data.error?.message??"Could not create hypothesis.");return;}for(const claimId of seed.claim_ids??[]){await fetch(`/api/hypotheses/${data.id}/evidence`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({claim_id:claimId,stance:"contextualizes",evidence_domain:"Ask evidence packet",reviewer_note:`Imported from question: ${question}`})});}window.location.href=`/hypotheses/${data.id}`;}

  const allEvidence:EvidenceItem[]=result?[...result.source_statements,...result.interpretations].filter((item,index,items)=>items.findIndex(candidate=>candidate.claim_id===item.claim_id)===index):[];
  const status=result?statusCopy[result.answer_status]??statusCopy.partial:null;

  return <main className="ask-workbench">
    <ResearchPath current={result?"evidence":"ask"}/>
    <section className="ask-command">
      <div className="ask-command-copy"><p className="eyebrow">Evidence search</p><h1>Ask a historical question.</h1><p>Origin Graph searches only reviewed claims with exact citations. It separates what traditions report, what material evidence shows, and how scholars interpret both.</p></div>
      <form onSubmit={submit} className="ask-console">
        <label className="ask-question-label">Your question<textarea value={question} onChange={event=>setQuestion(event.target.value)} placeholder="For example: What evidence exists for the Trojan War?" required minLength={3}/></label>
        <details className="ask-filters"><summary>Optional: narrow the evidence</summary><div className="ask-filter-row"><fieldset><legend>Evidence types</legend>{roles.map(([role,label])=><button type="button" aria-pressed={selectedRoles.includes(role)} onClick={()=>toggleRole(role)} key={role}>{label}</button>)}</fieldset><label>From year<input type="number" value={fromYear} onChange={event=>setFromYear(event.target.value)} placeholder="-12000"/></label><label>To year<input type="number" value={toYear} onChange={event=>setToYear(event.target.value)} placeholder="2026"/></label></div></details>
        <button className="ask-run" disabled={loading}>{loading?"Checking reviewed evidence…":"Search reviewed evidence"}<span>→</span></button>
      </form>
      <div className="ask-examples"><span>Try an example</span>{examples.map(example=><button onClick={()=>setQuestion(example)} key={example}>{example}</button>)}</div>
    </section>

    {result?.error&&<section className="ask-results"><p className="error-box">{result.error.message}</p></section>}
    {result&&!result.error&&<section className="ask-results" id="results">
      <header className="answer-status-bar"><div><span className={`answer-signal ${result.answer_status}`}/><span><b>{status?.label}</b><small>{status?.description}</small></span></div>{result.answer_status!=="insufficient"&&<button onClick={saveHypothesis}>Use this evidence in a hypothesis</button>}</header>
      {result.answer_status==="insufficient"?<div className="ask-empty"><p className="eyebrow">The honest answer</p><h2>There is not enough reviewed evidence in this corpus.</h2><p>Origin Graph found no published claim with an exact locator that matches your question. It will not substitute a loosely related myth, place, or scientific record.</p><div><Link className="solid-button" href={`/data-sources?query=${encodeURIComponent(question)}`}>Search connected collections</Link><Link className="secondary-button" href="/sources/new">Add a source you trust</Link></div><small>You can still save the question in Hypotheses after adding evidence.</small></div>:<>
        <nav className="answer-tabs" aria-label="Evidence packet sections">{([['answer','Summary'],['evidence','Evidence by type'],['chronology','Dates'],['citations','Citations']] as [Tab,string][]).map(([value,label])=><button aria-selected={tab===value} onClick={()=>setTab(value)} key={value}>{label}</button>)}</nav>
        {tab==="answer"&&<div className="answer-reading"><article><p className="eyebrow">What the reviewed corpus supports</p><h2>{question}</h2><p className="answer-copy">{result.answer}</p>{result.uncertainties?.length>0&&<div className="uncertainty-stack"><h3>Limits and missing evidence</h3>{result.uncertainties.map((value:string)=><p key={value}>{value}</p>)}</div>}</article><aside><h3>Why this answer is usable</h3><dl><div><dt>Cited passages</dt><dd>{result.source_counts.passages}</dd></div><div><dt>Independent families</dt><dd>{result.coverage_profile.independent_source_families}</dd></div><div><dt>Evidence types</dt><dd>{result.coverage_profile.evidence_roles.length}</dd></div></dl><p>These are coverage counts, not a truth score. Open Citations to inspect every locator.</p><h3>Sources represented</h3>{result.source_families.map((family:Record<string,any>)=><div className="family-row" key={family.key}><b>{family.sources.join(", ")}</b><span>{family.claim_count} claims · {family.evidence_roles.map((role:string)=>roleLabels[role]??role).join(", ")}</span></div>)}</aside></div>}
        {tab==="evidence"&&<><div className="evidence-by-role">{roles.map(([role,label])=>{const items=allEvidence.filter(item=>item.evidence_role===role);return <section key={role}><span>{label}</span><h2>{items.length?`${items.length} reviewed ${items.length===1?"claim":"claims"}`:"No reviewed match"}</h2>{items.map(item=><article key={item.claim_id}><p>{item.statement}</p><small>{item.source_title} · {item.locator}</small></article>)}</section>;})}</div><div className="evidence-balance"><section><h3>Supporting evidence cards</h3>{result.supporting_evidence.length?result.supporting_evidence.map((item:EvidenceItem,index:number)=><p key={`${item.claim_id}-${index}`}>{item.statement}</p>):<p>No reviewed supporting cards are linked.</p>}</section><section><h3>Challenging evidence cards</h3>{result.challenging_evidence.length?result.challenging_evidence.map((item:EvidenceItem,index:number)=><p key={`${item.claim_id}-${index}`}>{item.statement}</p>):<p>No reviewed challenging cards are linked.</p>}</section></div></>}
        {tab==="chronology"&&<div className="ask-chronology"><header><h2>Dates keep their meaning</h2><p>Claimed events, text composition, physical witnesses, editions, observations, and natural phenomena remain separate.</p></header>{result.timeline_items.map((item:Record<string,any>)=><article key={item.temporal_assertion_id}><span className={`date-role role-${item.role}`}>{item.role.replaceAll("_"," ")}</span><div><b>{item.title}</b><p>{item.display_label}</p></div><strong>{item.earliest_year} → {item.latest_year}</strong></article>)}{!result.timeline_items.length&&<p className="empty-state">No reviewed chronology is linked to this evidence packet.</p>}</div>}
        {tab==="citations"&&<div className="citation-ledger"><header><span>ID</span><span>Source edition</span><span>Exact locator</span><span>Open</span></header>{result.citations.map((citation:Record<string,string>)=><article key={citation.citation_id}><b>{citation.citation_id}</b><span>{citation.display_label}</span><code>{citation.locator}</code><Link href={`/sources/${citation.source_id}`}>Source card</Link></article>)}</div>}
      </>}
      {message&&<p className="form-note">{message}</p>}
    </section>}
  </main>;
}
