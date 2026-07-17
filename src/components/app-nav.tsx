"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["/", "Timeline"], ["/ask", "Ask"], ["/case-files", "Case files"],
  ["/hypotheses", "Theory lab"], ["/sacred-teachers", "Atlas"], ["/data-sources", "Data"], ["/sources", "Inbox"], ["/map", "Map"],
  ["/graph", "Graph"], ["/review", "Review"]
] as const;

export function AppNav() {
  const pathname = usePathname();
  return <header className="app-nav"><Link href="/" className="app-logo" aria-label="Origin Graph home"><span>OG</span><b>Origin Graph</b></Link><nav aria-label="Primary navigation">{links.map(([href,label]) => <Link key={href} href={href} className={pathname === href || (href !== "/" && pathname.startsWith(href)) ? "active" : ""}>{label}</Link>)}</nav><Link href="/sources/new" className="nav-action">Add source</Link></header>;
}
