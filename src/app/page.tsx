import Link from "next/link";

export default function Home() {
  return (
    <main className="gate-shell">
      <div className="brand-mark" aria-hidden="true">OG</div>
      <p className="eyebrow">Phase 0–1 review gate</p>
      <h1>Origin Graph</h1>
      <p className="lede">
        The source, chronology, evidence, rights, and review foundation is ready for inspection.
        External ingestion and later research interfaces remain intentionally unopened.
      </p>
      <div className="gate-grid">
        <section><span>01</span><h2>Source fidelity</h2><p>Works, editions, witnesses, exact locators, and immutable versions remain distinct.</p></section>
        <section><span>02</span><h2>Layered time</h2><p>Claimed, composition, witness, edition, observation, and phenomenon dates coexist without collapsing.</p></section>
        <section><span>03</span><h2>Review before publication</h2><p>Rights approval and source locators are enforced at the database boundary.</p></section>
      </div>
      <Link className="primary-link" href="/admin">Open admin data browser <span aria-hidden="true">→</span></Link>
    </main>
  );
}
