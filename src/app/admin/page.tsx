import { getAdminSummary } from "@/admin-data";

export const dynamic = "force-dynamic";

const roleLabels: Record<string, string> = {
  event_claimed_date: "Claimed event",
  composition_date: "Composition",
  witness_date: "Witness",
  edition_date: "Edition",
  observation_date: "Observation",
  phenomenon_date: "Natural phenomenon",
  active_interval: "Active interval"
};

function formatMilliseconds(value: string): string {
  const total = Number(value);
  const minutes = Math.floor(total / 60_000);
  const seconds = ((total % 60_000) / 1000).toFixed(3).padStart(6, "0");
  return `${minutes}:${seconds}`;
}

export default async function AdminPage() {
  const data = await getAdminSummary();
  const keyCounts = data.counts.filter(({ table_name }) =>
    ["works", "source_editions", "claims", "temporal_assertions", "case_files"].includes(table_name));
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div><p className="eyebrow">Internal research administration</p><h1>Foundation browser</h1></div>
        <div className="review-badge"><i /> Phase 1 · Review gate</div>
      </header>

      <section className="metric-grid" aria-label="Key table counts">
        {keyCounts.map((count) => <article key={count.table_name}><strong>{count.row_count}</strong><span>{count.table_name.replaceAll("_", " ")}</span></article>)}
      </section>

      <section className="browser-section">
        <div className="section-heading"><div><p className="section-index">A</p><h2>Source editions & versions</h2></div><p>Rights and evidence roles stay edition-specific.</p></div>
        <div className="table-wrap"><table><thead><tr><th>Edition</th><th>Version</th><th>Evidence role</th><th>Rights</th><th>Review</th></tr></thead><tbody>
          {data.sourceEditions.map((source) => <tr key={source.id}><td><strong>{source.title}</strong><small>{source.version_group_key}</small></td><td>v{source.version_number}</td><td>{source.evidence_role.replaceAll("_", " ")}</td><td><span className={`pill lane-${source.rights_lane}`}>{source.rights_lane}</span></td><td><span className="status">{source.review_status}</span></td></tr>)}
        </tbody></table></div>
      </section>

      <section className="browser-section">
        <div className="section-heading"><div><p className="section-index">B</p><h2>Chronology roles</h2></div><p>Every range answers “what date is this?”</p></div>
        <div className="timeline-list">
          {data.temporalAssertions.map((date) => <article key={date.id}><span className={`date-role role-${date.role}`}>{roleLabels[date.role]}</span><div><strong>{date.display_label}</strong><p>{date.target_title}</p></div><code>{date.earliest_year} → {date.latest_year}</code></article>)}
        </div>
      </section>

      <div className="split-grid">
        <section className="browser-section compact">
          <div className="section-heading"><div><p className="section-index">C</p><h2>Native roles</h2></div></div>
          {data.entityRoles.map((role) => <article className="role-card" key={role.id}><div><strong>{role.preferred_name}</strong><p>{role.tradition}</p></div><div className="role-label"><b>{role.native_label ?? role.role_key}</b><small>{role.role_key}</small></div></article>)}
        </section>
        <section className="browser-section compact">
          <div className="section-heading"><div><p className="section-index">D</p><h2>Media segments</h2></div></div>
          {data.mediaSegments.map((segment) => <article className="media-card" key={segment.id}><div><strong>{segment.source_title}</strong><p>{segment.speaker_name ?? "Unassigned speaker"}</p></div><code>{formatMilliseconds(segment.start_ms)}–{formatMilliseconds(segment.end_ms)}</code><small>{segment.transcript_provenance.replaceAll("_", " ")} · {segment.rights_lane}</small></article>)}
        </section>
      </div>

      <section className="browser-section">
        <div className="section-heading"><div><p className="section-index">E</p><h2>Editorial case shells</h2></div><p>Structure only; no fabricated content.</p></div>
        <ol className="case-list">{data.caseFiles.map((file, index) => <li key={file.slug}><span>{String(index + 1).padStart(2, "0")}</span><strong>{file.title}</strong><small>{file.review_status}</small></li>)}</ol>
      </section>
      <footer>Read-only internal browser · Synthetic fixtures are clearly labeled · No external ingestion active</footer>
    </main>
  );
}
