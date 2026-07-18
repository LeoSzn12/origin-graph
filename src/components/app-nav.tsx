"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const primaryLinks = [
  ["/", "Explore"], ["/ask", "Ask evidence"], ["/case-files", "Research files"],
  ["/hypotheses", "Hypotheses"], ["/sources", "Sources"]
] as const;

const toolLinks = [
  ["/data-sources", "Connected collections", "Search external text, archive, archaeology, and science catalogs"],
  ["/sacred-teachers", "Tradition comparison", "Compare source-native roles without collapsing traditions"],
  ["/map", "Evidence map", "Inspect reviewed places and spatial uncertainty"],
  ["/graph", "Relationship graph", "Follow typed connections around a claim"],
  ["/review", "Review queue", "Approve sources, claims, and evidence for research use"]
] as const;

export function AppNav() {
  const pathname = usePathname();
  const isActive=(href:string)=>pathname===href||(href!=="/"&&pathname.startsWith(href));
  const toolsActive=toolLinks.some(([href])=>isActive(href));
  return <header className="app-nav">
    <Link href="/" className="app-logo" aria-label="Origin Graph home"><span>OG</span><b>Origin Graph</b></Link>
    <nav aria-label="Primary navigation">{primaryLinks.map(([href,label]) => <Link key={href} href={href} className={isActive(href)?"active":""}>{label}</Link>)}</nav>
    <details className={`tools-menu ${toolsActive?"active":""}`}><summary>Tools</summary><div>{toolLinks.map(([href,label,description])=><Link href={href} key={href} className={isActive(href)?"active":""}><b>{label}</b><span>{description}</span></Link>)}</div></details>
    <Link href="/sources/new" className="nav-action">Add source</Link>
  </header>;
}
