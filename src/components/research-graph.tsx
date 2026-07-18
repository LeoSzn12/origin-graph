"use client";

import { useEffect, useRef, useState } from "react";

interface Claim { id:string; statement:string; claim_class:string }
interface ElementData { data:{ id:string; object_id?:string; label:string; type?:string; source?:string; target?:string; explanation?:string; confidence?:string } }
type GraphElements={nodes:ElementData[];edges:ElementData[]};

export function ResearchGraph(){
  const container=useRef<HTMLDivElement>(null);
  const cyRef=useRef<any>(null);
  const [claims,setClaims]=useState<Claim[]>([]);
  const [focus,setFocus]=useState<{type:string;id:string;label:string}|null>(null);
  const [selected,setSelected]=useState<ElementData['data']|null>(null);
  const [elements,setElements]=useState<GraphElements>({nodes:[],edges:[]});
  const [layout,setLayout]=useState('cose');

  useEffect(()=>{fetch('/api/claims').then(response=>response.json()).then(data=>{setClaims(data.claims??[]);if(data.claims?.[0])setFocus({type:'claim',id:data.claims[0].id,label:data.claims[0].statement});});},[]);
  useEffect(()=>{if(focus)fetch(`/api/graph/neighborhood/${focus.type}/${focus.id}`).then(response=>response.json()).then(setElements);},[focus]);
  useEffect(()=>{
    if(!container.current)return;
    let cy:any;
    import('cytoscape').then(({default:cytoscape})=>{
      const createGraph=cytoscape as any;
      cy=createGraph({
        container:container.current,
        elements:[...elements.nodes,...elements.edges],
        style:[
          {selector:'node',style:{'background-color':'#3e6b52','border-color':'#f5f2ea','border-width':3,'label':'data(label)','font-size':'10px','font-family':'Inter, sans-serif','font-weight':700,'color':'#12201c','text-wrap':'ellipsis','text-max-width':'150px','text-valign':'bottom','text-margin-y':'10px','width':38,'height':38,'overlay-opacity':0}},
          {selector:'node[type="claim"]',style:{'background-color':'#ad4f31','width':46,'height':46}},
          {selector:'node[type="motif"]',style:{'background-color':'#b48732','shape':'diamond'}},
          {selector:'node[type="place"]',style:{'background-color':'#4f758c','shape':'round-rectangle'}},
          {selector:'node[type="source_edition"]',style:{'background-color':'#12201c','shape':'rectangle'}},
          {selector:'node:selected',style:{'border-color':'#12201c','border-width':4,'width':54,'height':54}},
          {selector:'edge',style:{'line-color':'#9ba29d','target-arrow-color':'#9ba29d','target-arrow-shape':'triangle','arrow-scale':.7,'curve-style':'bezier','width':1.5,'label':'data(label)','font-size':'8px','color':'#5c6c66','text-background-color':'#f5f2ea','text-background-opacity':.92,'text-background-padding':'3px','text-rotation':'autorotate','overlay-opacity':0}},
          {selector:'edge:selected',style:{'line-color':'#ad4f31','target-arrow-color':'#ad4f31','width':3}}
        ],
        layout:{name:layout,animate:true,animationDuration:450,padding:70},minZoom:.25,maxZoom:2.5
      });
      cyRef.current=cy;
      cy.on('tap','node',(event:any)=>setSelected(event.target.data()));
      cy.on('tap','edge',(event:any)=>setSelected(event.target.data()));
      cy.on('dbltap','node',(event:any)=>{const data=event.target.data();if(data.object_id&&data.type)setFocus({type:data.type,id:data.object_id,label:data.label});});
    });
    return()=>{cyRef.current=null;cy?.destroy();};
  },[elements,layout]);
  function chooseClaim(id:string){const claim=claims.find(item=>item.id===id);if(claim)setFocus({type:'claim',id:claim.id,label:claim.statement});}
  return <div className="graph-workspace">
    <div className="graph-toolbar"><label>Focus claim<select value={focus?.type==='claim'?focus.id:''} onChange={event=>chooseClaim(event.target.value)}>{claims.map(claim=><option value={claim.id} key={claim.id}>{claim.statement}</option>)}</select></label><div><span>Layout</span>{[['cose','Evidence'],['concentric','Radial'],['breadthfirst','Lineage']].map(([value,label])=><button aria-pressed={layout===value} onClick={()=>setLayout(value)} key={value}>{label}</button>)}</div><button onClick={()=>cyRef.current?.fit(undefined,60)}>Fit graph</button></div>
    <div className="graph-layout"><aside><p className="eyebrow">Focused neighborhood</p><h2>{focus?.label??'Choose a claim'}</h2><p>Double-click any node to make it the new center. Connections are typed, reviewed, and limited to the immediate neighborhood.</p><div className="graph-legend">{[['claim','Claim'],['motif','Motif'],['place','Place'],['entity','Entity'],['source_edition','Source']].map(([type,label])=><span key={type}><i className={`node-key type-${type}`}/>{label}</span>)}</div><h3>Connections</h3>{elements.edges.map(edge=><article key={edge.data.id}><strong>{edge.data.label}</strong><p>{edge.data.explanation}</p><small>{edge.data.confidence} confidence</small></article>)}{elements.edges.length===0&&<p>No approved connections around this object.</p>}</aside>
      <div ref={container} className="graph-canvas" aria-label="Focused relationship graph"/>
      {selected&&<section className="graph-inspector"><button onClick={()=>setSelected(null)}>Close</button><span className="kicker">{selected.type??'connection'}</span><h2>{selected.label}</h2>{selected.explanation&&<p>{selected.explanation}</p>}{selected.confidence&&<small>{selected.confidence} confidence</small>}{selected.object_id&&selected.type&&<button className="small-button" onClick={()=>setFocus({type:selected.type!,id:selected.object_id!,label:selected.label})}>Focus this object</button>}</section>}
    </div>
  </div>;
}
