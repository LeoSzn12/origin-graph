"use client";

import { useEffect,useMemo,useState, type FormEvent } from "react";

type Option={key:string;label:string;description?:string;display_name?:string;edition_key?:string;passage_count?:number;claimed_unit_count?:number;unit_label?:string;mapped_book_count?:number};
type CoverageGroup={key:string;label:string;matching_passages:number;distinct_references:number;editions:number};
type SensemakingMeasure={key:string;label:string;value:string;tone:"positive"|"caution"|"neutral";explanation:string};
type CompetingExplanation={title:string;interpretation:string;would_strengthen:string;caution:string};
type SacredResult={
  total:number;
  shown_total:number;
  query:{normalized:string;suggested_grade:string;note:string|null};
  traditions_represented:{key:string;label:string}[];
  coverage:{matching_passages:number;distinct_references:number;shown_passages:number;text_groups_with_matches:number;groups:CoverageGroup[]};
  sensemaking:{
    signal:string;
    headline:string;
    bottom_line:string;
    measures:SensemakingMeasure[];
    established:string[];
    not_established:string[];
    explanations:CompetingExplanation[];
    next_questions:string[];
  };
  results:Record<string,any>[];
};

const examples=["flood","creation","giants","resurrection","afterlife","sacrifice","morality","aliens"];

export default function SacredTextsPage(){
  const [catalog,setCatalog]=useState<{traditions:Option[];canons:Option[];editions:Option[]}|null>(null);
  const [query,setQuery]=useState("flood");
  const [traditions,setTraditions]=useState<string[]>([]);
  const [canons,setCanons]=useState<string[]>([]);
  const [editions,setEditions]=useState<string[]>([]);
  const [result,setResult]=useState<SacredResult|null>(null);
  const [loading,setLoading]=useState(false);
  const [message,setMessage]=useState("");

  useEffect(()=>{fetch("/api/sacred-texts/catalog").then(async response=>{
    const data=await response.json();if(response.ok)setCatalog(data);else setMessage(data.error?.message??"Could not load the sacred-text catalog.");
  }).catch(()=>setMessage("Could not load the sacred-text catalog."));},[]);

  function toggle(value:string,current:string[],set:(next:string[])=>void){set(current.includes(value)?current.filter(item=>item!==value):[...current,value]);}
  async function search(event?:FormEvent,requestedQuery=query){event?.preventDefault();
    const normalizedQuery=requestedQuery.trim();
    if(normalizedQuery.length<2){setResult(null);setMessage("Enter at least 2 characters to compare.");return;}
    setLoading(true);setMessage("");
    try{
      const response=await fetch("/api/sacred-texts/search",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query:normalizedQuery,filters:{traditions,canons,editions,limit:12}})});
      const contentType=response.headers.get("content-type")??"";const data=contentType.includes("application/json")?await response.json():{error:{message:await response.text()}};
      if(response.ok)setResult(data);else setMessage(data.error?.message??"Search failed.");
    }catch{setMessage("Search failed. Check the local database connection and try again.");}
    finally{setLoading(false);}
  }
  const grouped=useMemo(()=>{const groups=new Map<string,any[]>();for(const item of result?.results??[]){const key=item.tradition_label;groups.set(key,[...(groups.get(key)??[]),item]);}return[...groups.entries()];},[result]);
  const coverageByLabel=useMemo(()=>new Map(result?.coverage.groups.map(group=>[group.label,group])??[]),[result]);

  return <main className="sacred-workbench">
    <section className="sacred-hero">
      <p className="eyebrow">Sacred text comparison</p>
      <h1>Search the texts.<br/>Keep the traditions distinct.</h1>
      <p>Search the Bible, Torah and Tanakh, Quran, Bhagavad Gita, and separately labeled related writings. Every result retains its edition, translation, canon membership, and exact locator.</p>
    </section>

    <form className="sacred-search" onSubmit={search}>
      <label>Search for a word, story, being, or idea
        <div><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Try: flood, giants, resurrection, heavenly beings…"/><button disabled={loading}>{loading?"Searching…":"Compare texts"}</button></div>
      </label>
      <div className="sacred-examples">{examples.map(example=><button type="button" key={example} onClick={()=>{setQuery(example);void search(undefined,example);}}>{example}</button>)}</div>
      <details>
        <summary>Choose traditions, canons, or translations</summary>
        <div className="sacred-filter-grid">
          <fieldset><legend>Traditions</legend>{catalog?.traditions.map(item=><button type="button" key={item.key} aria-pressed={traditions.includes(item.key)} onClick={()=>toggle(item.key,traditions,setTraditions)}>{item.label}<small>{item.passage_count??0} passages</small></button>)}</fieldset>
          <fieldset><legend>Canons</legend>{catalog?.canons.map(item=><button type="button" key={item.key} aria-pressed={canons.includes(item.key)} onClick={()=>toggle(item.key,canons,setCanons)}>{item.label}<small>{item.claimed_unit_count} {item.unit_label}; {item.mapped_book_count??0} mapped</small></button>)}</fieldset>
          <fieldset><legend>Editions</legend>{catalog?.editions.map(item=><button type="button" key={item.edition_key} aria-pressed={editions.includes(item.edition_key!)} onClick={()=>toggle(item.edition_key!,editions,setEditions)}>{item.display_name}<small>{item.passage_count??0} passages</small></button>)}</fieldset>
        </div>
      </details>
    </form>

    {message&&<p className="error-box">{message}</p>}
    {result&&<section className="sacred-results">
      <header><div><p className="eyebrow">Evidence brief</p><h2>{result.sensemaking.headline}</h2><p>{result.total.toLocaleString()} matches · {result.coverage.distinct_references.toLocaleString()} distinct references · showing {result.shown_total.toLocaleString()}</p></div>
        <div className={`similarity-grade ${result.query.suggested_grade}`}>{result.query.suggested_grade.replaceAll("_"," ")}</div></header>
      {result.query.note&&<p className="sacred-query-note">{result.query.note}</p>}
      {!result.total&&<div className="sacred-empty"><h3>No reviewed passage matched yet.</h3><p>The catalog may still be awaiting import or review. The app will not manufacture a parallel from unrelated wording.</p></div>}
      {!!result.total&&<>
        <section className="sensemaking-brief">
          <div className="sensemaking-bottom-line"><p className="eyebrow">Bottom line</p><p>{result.sensemaking.bottom_line}</p></div>
          <div className="sensemaking-measures">{result.sensemaking.measures.map(measure=><article className={measure.tone} key={measure.key}>
            <span>{measure.label}</span><strong>{measure.value}</strong><p>{measure.explanation}</p>
          </article>)}</div>
          <div className="sensemaking-boundaries">
            <section><p className="eyebrow">What this search establishes</p><ul>{result.sensemaking.established.map(item=><li key={item}>{item}</li>)}</ul></section>
            <section><p className="eyebrow">What it does not establish</p><ul>{result.sensemaking.not_established.map(item=><li key={item}>{item}</li>)}</ul></section>
          </div>
          <section className="competing-explanations">
            <header><p className="eyebrow">Competing explanations</p><h3>More than one explanation can fit the same pattern.</h3><p>Compare what each explanation predicts instead of turning repetition into a probability score.</p></header>
            <div>{result.sensemaking.explanations.map((explanation,index)=><article key={explanation.title}>
              <span>{String(index+1).padStart(2,"0")}</span><h4>{explanation.title}</h4><p>{explanation.interpretation}</p>
              <dl><div><dt>Would strengthen</dt><dd>{explanation.would_strengthen}</dd></div><div><dt>Keep in mind</dt><dd>{explanation.caution}</dd></div></dl>
            </article>)}</div>
          </section>
          <section className="sensemaking-next">
            <p className="eyebrow">Investigate next</p><h3>Questions that move this from pattern to historical inquiry</h3>
            <ol>{result.sensemaking.next_questions.map(item=><li key={item}>{item}</li>)}</ol>
          </section>
        </section>
        <details className="sacred-evidence" open>
          <summary><span>Read the source passages</span><small>{result.shown_total.toLocaleString()} representative results shown from {result.total.toLocaleString()} corpus matches</small></summary>
          <div className="sacred-tradition-columns">{grouped.map(([tradition,items])=>{const groupCoverage=coverageByLabel.get(tradition);return <section key={tradition}><header><span>{tradition}</span><b>showing {items.length} of {groupCoverage?.matching_passages??items.length}</b></header>{items.map(item=><article key={item.passage_id}>
            <div className="sacred-reference"><b>{item.normalized_reference}</b><span>{item.sacred_text_label}</span></div>
            <blockquote>{item.display_excerpt}</blockquote>
            {item.original_text&&item.translation_text&&<details><summary>Original text</summary><p dir="auto">{item.original_text}</p></details>}
            <footer><span>{item.edition_display_name}</span><span>{item.language_code}</span><span>{item.license_scope.replaceAll("_"," ")}</span></footer>
            {item.canons?.length>0&&<div className="canon-tags">{item.canons.map((canon:Record<string,string>)=><span key={canon.key}>{canon.label}</span>)}</div>}
          </article>)}</section>;})}</div>
        </details>
      </>}
    </section>}
  </main>;
}
