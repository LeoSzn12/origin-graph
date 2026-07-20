"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface ReviewItem {
  object_type: string;
  object_id: string;
  status: string;
  subtype: string;
  created_at: string;
  rights_lane: string | null;
  label: string;
}

export default function ReviewPage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const load = () => fetch("/api/review")
    .then((response) => response.json())
    .then((data) => setItems(data.items ?? []))
    .catch(() => setError("The review queue could not be loaded."))
    .finally(() => setLoaded(true));
  useEffect(() => { load(); }, []);

  async function advance(item: ReviewItem) {
    if (item.object_type === "external_record") {
      const response = await fetch(`/api/providers/records/${item.object_id}/promote`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) setError(data.error?.message ?? "Promotion failed");
      else window.location.href = `/sources/${data.source_edition_id}`;
      return;
    }
    const next: Record<string, string> = { inbox: "draft", draft: "in_review", in_review: "approved", approved: "published", blocked: "draft" };
    const to = next[item.status];
    if (!to) return;
    const response = await fetch(`/api/review/${item.object_type}/${item.object_id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, note: "Advanced from the review queue." })
    });
    const data = await response.json();
    if (!response.ok) setError(data.error?.message ?? "Review failed");
    else load();
  }

  return <main className="standard-page"><header className="page-header"><div><p className="eyebrow">Human gate</p><h1>Review queue</h1></div><p>Machine extraction and new sources stop here. Publication remains an explicit reviewer decision.</p></header>{error && <p className="error-box">{error}</p>}<div className="review-list"><div className="review-row heading"><span>Object</span><span>Status</span><span>Rights</span><span>Action</span></div>{items.map((item) => <article className="review-row" key={`${item.object_type}:${item.object_id}`}><div><span className="kicker">{item.object_type.replaceAll("_", " ")} · {item.subtype.replaceAll("_", " ")}</span><strong>{item.label}</strong></div><span className="status-chip">{item.status.replaceAll("_", " ")}</span><span>{item.rights_lane ? <b className={`pill lane-${item.rights_lane}`}>{item.rights_lane}</b> : "—"}</span>{item.object_type === "source_input" ? <span className="kicker">Open source card</span> : <button className="small-button" onClick={() => advance(item)}>{item.object_type === "external_record" ? "Create source draft" : "Advance"}</button>}</article>)}</div>{!loaded && <p className="review-loading" role="status">Loading review queue…</p>}{loaded && !error && items.length === 0 && <section className="review-empty"><p className="eyebrow">Queue clear</p><h2>Nothing is waiting for review.</h2><p>Search connected collections to stage a catalog record, or inspect registered sources that still need an editorial decision.</p><div><Link className="solid-button" href="/data-sources">Search collections</Link><Link className="secondary-button" href="/sources">Open source library</Link></div></section>}</main>;
}
