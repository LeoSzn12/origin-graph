"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const primaryLinks = [
  ["/", "Explore", "Explore"], ["/ask", "Ask evidence", "Ask"], ["/case-files", "Research files", "Research"],
  ["/hypotheses", "Hypotheses", "Hypotheses"], ["/sources", "Sources", "Sources"], ["/game", "Evidence game", "Play"]
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
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const isActive=(href:string)=>pathname===href||(href!=="/"&&pathname.startsWith(href));
  const toolsActive=toolLinks.some(([href])=>isActive(href));
  useEffect(() => { setToolsOpen(false); }, [pathname]);
  useEffect(() => {
    if (!toolsOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setToolsOpen(false); };
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(event.target as Node)) setToolsOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("mousedown", closeOnOutsideClick);
    };
  }, [toolsOpen]);
  return <header className="app-nav">
    <Link href="/" className="app-logo" aria-label="Origin Graph home"><span>OG</span><b>Origin Graph</b></Link>
    <nav aria-label="Primary navigation">{primaryLinks.map(([href,label,shortLabel]) => <Link key={href} href={href} aria-label={label} className={isActive(href)?"active":""}><span className="nav-full-label">{label}</span><span className="nav-short-label" aria-hidden="true">{shortLabel}</span></Link>)}</nav>
    <div className={`tools-menu ${toolsActive?"active":""}`} ref={toolsRef}>
      <button type="button" className="tools-toggle" aria-expanded={toolsOpen} aria-controls="tools-menu-panel" aria-haspopup="menu" onClick={() => setToolsOpen((open) => !open)}>Tools<span aria-hidden="true">⌄</span></button>
      {toolsOpen && <div id="tools-menu-panel" role="menu">{toolLinks.map(([href,label,description])=><Link href={href} key={href} role="menuitem" className={isActive(href)?"active":""}><b>{label}</b><span>{description}</span></Link>)}</div>}
    </div>
    <Link href="/sources/new" className="nav-action">Add source</Link>
  </header>;
}
