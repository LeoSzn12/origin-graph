"use client";

import { useEffect, useState, type FormEvent } from "react";

interface ClaimOption { id: string; statement: string; source_title: string | null; locator_value: string | null }

export function EvidenceAdder({ hypothesisId, onAdded }: { hypothesisId: string; onAdded: () => void }) {
  const [claims, setClaims] = useState<ClaimOption[]>([]);
  const [claimId, setClaimId] = useState("");
  const [stance, setStance] = useState("supports");
  const [domain, setDomain] = useState("primary text");
  const [cluster, setCluster] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/claims").then((response) => response.json()).then((data) => {
      setClaims(data.claims ?? []);
      setClaimId(data.claims?.[0]?.id ?? "");
    });
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const response = await fetch(`/api/hypotheses/${hypothesisId}/evidence`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim_id: claimId, stance, evidence_domain: domain,
        independence_cluster: cluster || undefined, reviewer_note: note || undefined })
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error?.message ?? "Could not add evidence.");
    setMessage("Evidence card added as a draft."); setNote(""); onAdded();
  }

  return <form className="evidence-adder" onSubmit={submit}>
    <div><p className="eyebrow">Research workspace</p><h2>Add evidence card</h2><p>Stance is explicit and reversible. A card never changes a hypothesis into a probability score.</p></div>
    <label>Claim<select value={claimId} onChange={(event) => setClaimId(event.target.value)} required>{claims.map((claim) => <option value={claim.id} key={claim.id}>{claim.statement} — {claim.source_title ?? "No source"} {claim.locator_value ?? ""}</option>)}</select></label>
    <label>Stance<select value={stance} onChange={(event) => setStance(event.target.value)}>{['supports','challenges','contextualizes','ambiguous','cannot_test'].map((value) => <option value={value} key={value}>{value.replaceAll('_',' ')}</option>)}</select></label>
    <label>Evidence domain<input value={domain} onChange={(event) => setDomain(event.target.value)} required /></label>
    <label>Source family / independence cluster<input value={cluster} onChange={(event) => setCluster(event.target.value)} placeholder="Optional; used for triangulation" /></label>
    <label>Reviewer note<textarea value={note} onChange={(event) => setNote(event.target.value)} /></label>
    <button className="solid-button" disabled={!claimId}>Add draft card</button>
    {message && <p className="form-note">{message}</p>}
  </form>;
}
