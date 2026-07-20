"use client";
import { useEffect, useMemo, useState } from "react";

export default function SacredTeachersPage() {
  const [data, setData] = useState<Record<string, any>>({ entities:[], dimensions:[] });
  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => { fetch("/api/compare/sacred-teachers").then((response) => response.json()).then((value) => { setData(value); setSelected(value.entities.slice(0,3).map((entity:any) => entity.id)); }); }, []);
  const entities = useMemo(() => data.entities.filter((entity:any) => selected.includes(entity.id)), [data.entities, selected]);
  function toggle(id:string) { setSelected((current) => current.includes(id) ? (current.length > 2 ? current.filter((value) => value !== id) : current) : (current.length < 6 ? [...current,id] : current)); }
  function cell(entity:any, dimension:string) {
    if (dimension === "native role") return entity.roles.map((role:any) => `${role.native_label ?? role.role_key} · ${role.tradition}`).join("; ");
    if (dimension === "claimed lifetime" || dimension === "composition and witness dates") return entity.dates.filter((date:any) => dimension === "claimed lifetime" ? date.role === "active_interval" : ["composition_date","witness_date"].includes(date.role)).map((date:any) => `${date.role.replaceAll("_"," ")}: ${date.display_label}`).join("; ") || "No reviewed date assertion";
    const claims = entity.claims.filter((claim:any) => claim.dimension === dimension);
    return claims.length ? claims.map((claim:any) => <span className="teacher-citation" key={claim.id}>{claim.statement}<a href={`/sources/${claim.source_id}`}>{claim.source} · {claim.locator}</a></span>) : "No reviewed material";
  }
  return <main className="standard-page"><header className="page-header"><div><p className="eyebrow">Tradition-aware comparison</p><h1>Sacred Teachers Atlas</h1></div><p>Compare exact, reviewed passages without flattening role names or dates. “Prophet” is one tradition-specific role, not the universal category.</p></header>
    <section className="teacher-picker" aria-label="Choose two to six figures"><span>{selected.length ? `${selected.length} selected` : "Compare 2–6"}</span>{data.entities.map((entity:any)=><button key={entity.id} aria-pressed={selected.includes(entity.id)} onClick={()=>toggle(entity.id)}>{entity.preferred_name}<small>{entity.roles[0]?.tradition}</small></button>)}</section>
    {entities.length<2?<p className="empty-state">Select at least two reviewed figures.</p>:<div className="comparison-table"><table><thead><tr><th>Dimension</th>{entities.map((entity:any)=><th key={entity.id}>{entity.preferred_name}<small>{entity.roles.map((role:any)=>role.tradition).join(" · ")}</small></th>)}</tr></thead><tbody>{data.dimensions.map((dimension:string)=><tr key={dimension}><th>{dimension}</th>{entities.map((entity:any)=><td key={entity.id}>{cell(entity,dimension)}</td>)}</tr>)}</tbody></table></div>}
    <p className="form-note">The pilot covers five figures from four broad traditions using selected public-domain English editions. It is a demonstration, not “all cultures.” Similarities do not imply identity, borrowing, or common supernatural origin.</p></main>;
}
