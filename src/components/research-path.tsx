import Link from "next/link";

const steps = [
  { key:"ask", number:"1", title:"Ask", description:"Frame a question", href:"/ask" },
  { key:"evidence", number:"2", title:"Evaluate", description:"Compare claims and citations", href:"/ask#results" },
  { key:"hypothesis", number:"3", title:"Develop", description:"Test an explanation", href:"/hypotheses" }
] as const;

export function ResearchPath({ current }:{ current:"ask"|"evidence"|"hypothesis"|"sources" }) {
  return <nav className="research-path" aria-label="Research workflow">
    <span className="research-path-label">Research workflow</span>
    {steps.map(step=><Link href={step.href} key={step.key} className={current===step.key?"active":""}><i>{step.number}</i><span><b>{step.title}</b><small>{step.description}</small></span></Link>)}
    <Link href="/sources" className={current==="sources"?"active research-path-source":"research-path-source"}><i>+</i><span><b>Add evidence</b><small>Expand the reviewed corpus</small></span></Link>
  </nav>;
}
