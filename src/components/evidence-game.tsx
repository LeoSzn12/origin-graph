"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  EvidenceGameChallenge,
  EvidenceGameResult,
  GameRound,
} from "@/domain/evidence-game";

type GameState =
  "loading" | "intro" | "playing" | "grading" | "complete" | "error";

const decks = [
  {
    slug: "troy",
    number: "002",
    title: "The Battle of Troy",
    question: "Real city. Epic war. What survives the evidence?",
    era: "Late Bronze Age",
    region: "Anatolia & Aegean",
    difficulty: "Intermediate",
    accent: "rust",
  },
  {
    slug: "atlantis",
    number: "001",
    title: "Atlantis in Plato",
    question: "Textually attested. Historically unresolved.",
    era: "Classical text",
    region: "Mediterranean",
    difficulty: "Starter",
    accent: "night",
  },
] as const;

export function EvidenceGame() {
  const [challenge, setChallenge] = useState<EvidenceGameChallenge | null>(
    null,
  );
  const [state, setState] = useState<GameState>("loading");
  const [roundIndex, setRoundIndex] = useState(0);
  const [answers, setAnswers] = useState<
    Partial<Record<GameRound["id"], string>>
  >({});
  const [result, setResult] = useState<EvidenceGameResult | null>(null);

  function loadChallenge(slug: string) {
    setState("loading");
    setAnswers({});
    setResult(null);
    fetch(`/api/game/${slug}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Challenge unavailable");
        return response.json();
      })
      .then((payload) => {
        setChallenge(payload.challenge);
        setState("intro");
      })
      .catch(() => setState("error"));
  }

  useEffect(() => {
    loadChallenge("troy");
  }, []);

  const round = challenge?.rounds[roundIndex];
  const selected = round ? answers[round.id] : undefined;
  const progress = challenge
    ? ((roundIndex + (state === "complete" ? 1 : 0)) /
        challenge.rounds.length) *
      100
    : 0;
  const resultByRound = useMemo(
    () => new Map(result?.results.map((item) => [item.roundId, item]) ?? []),
    [result],
  );

  function start() {
    setRoundIndex(0);
    setAnswers({});
    setResult(null);
    setState("playing");
  }

  async function advance() {
    if (!challenge || !round || !selected) return;
    if (roundIndex < challenge.rounds.length - 1) {
      setRoundIndex((value) => value + 1);
      return;
    }
    setState("grading");
    try {
      const response = await fetch(`/api/game/${challenge.slug}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (!response.ok) throw new Error("Unable to grade round");
      const payload = await response.json();
      setResult(payload.result);
      setState("complete");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setState("error");
    }
  }

  if (state === "loading") {
    return (
      <main className="game-page">
        <p className="game-loading" role="status">
          Preparing the evidence deck…
        </p>
      </main>
    );
  }
  if (state === "error" || !challenge) {
    return (
      <main className="game-page">
        <section className="game-error">
          <p className="eyebrow">Evidence game</p>
          <h1>The deck could not be loaded.</h1>
          <p>
            The research service may still be starting. Try another
            investigation or reload the page.
          </p>
          <button
            className="secondary-button"
            onClick={() => loadChallenge("troy")}
          >
            Reload featured case
          </button>
        </section>
      </main>
    );
  }

  if (state === "intro") {
    return (
      <main className="game-page">
        <section className="game-hero">
          <div className="game-hero-copy">
            <p className="eyebrow">Origin Graph · Evidence Game</p>
            <h1>
              History is a case.
              <br />
              <em>You build it.</em>
            </h1>
            <p>
              Connect myth, material evidence, chronology, and independent
              records. Earn points for disciplined reasoning, then turn the
              surviving gaps into a research hypothesis.
            </p>
            <div className="game-actions">
              <button className="game-primary" onClick={start}>
                Play the {challenge.slug === "troy" ? "Troy" : "Atlantis"} case{" "}
                <span>→</span>
              </button>
              <a href="#case-library">Browse investigations</a>
            </div>
          </div>
          <aside className="game-case-card">
            <span>{challenge.deckLabel}</span>
            <div className="game-orbit" aria-hidden="true">
              <i />
              <i />
              <i />
              <b>OG</b>
            </div>
            <p>Case {challenge.caseNumber}</p>
            <h2>{challenge.title}</h2>
            <strong>{challenge.question}</strong>
            <dl>
              <div>
                <dt>Evidence statements</dt>
                <dd>{challenge.reviewedClaimCount}</dd>
              </div>
              <div>
                <dt>Cited sources</dt>
                <dd>{challenge.reviewedSourceCount}</dd>
              </div>
              <div>
                <dt>Open leads</dt>
                <dd>{challenge.discoveryLeadCount}</dd>
              </div>
            </dl>
          </aside>
        </section>
        <section className="game-library" id="case-library">
          <header>
            <div>
              <p className="eyebrow">Investigation library</p>
              <h2>Choose a historical mystery</h2>
            </div>
            <p>
              Each case rewards how well you read the evidence. No popularity
              votes. No made-up certainty.
            </p>
          </header>
          <div className="game-decks">
            {decks.map((deck) => (
              <button
                key={deck.slug}
                className={`${deck.accent} ${challenge.slug === deck.slug ? "active" : ""}`}
                onClick={() => loadChallenge(deck.slug)}
              >
                <span>
                  Case {deck.number} · {deck.difficulty}
                </span>
                <h3>{deck.title}</h3>
                <p>{deck.question}</p>
                <dl>
                  <div>
                    <dt>Era</dt>
                    <dd>{deck.era}</dd>
                  </div>
                  <div>
                    <dt>Region</dt>
                    <dd>{deck.region}</dd>
                  </div>
                </dl>
                <b>
                  {challenge.slug === deck.slug ? "Selected" : "Open case"} →
                </b>
              </button>
            ))}
          </div>
        </section>
        <section className="game-rules">
          <p className="eyebrow">How to play</p>
          <ol>
            <li>
              <b>Read precisely</b>
              <span>Separate what a source says from what happened.</span>
            </li>
            <li>
              <b>Trace independence</b>
              <span>Ten copies of one source still count once.</span>
            </li>
            <li>
              <b>Protect uncertainty</b>
              <span>Keep event, composition, and observation dates apart.</span>
            </li>
            <li>
              <b>Choose the next test</b>
              <span>Prefer evidence that could change the case.</span>
            </li>
          </ol>
        </section>
        <p className="game-integrity">
          <b>Your score measures source-critical reasoning.</b> It never claims
          a probability that a person, place, or event existed.
        </p>
      </main>
    );
  }

  if (state === "complete" && result) {
    return (
      <main className="game-page">
        <section className="game-results-hero">
          <div>
            <p className="eyebrow">Investigation complete</p>
            <h1>{result.rank}</h1>
            <p>
              You correctly resolved {result.correctCount} of{" "}
              {result.totalRounds} evidence decisions.
            </p>
          </div>
          <div className="game-score">
            <span>Player score</span>
            <strong>{result.playerScore}</strong>
            <small>of {result.maxScore} points · not a truth probability</small>
          </div>
        </section>
        <section className="game-profile">
          <header>
            <div>
              <p className="eyebrow">Triangulation profile</p>
              <h2>What the reviewed packet can support</h2>
            </div>
            <p>Dimensions stay separate. Missing material stays missing.</p>
          </header>
          <div>
            {challenge.profile.map((dimension) => (
              <article
                key={dimension.label}
                className={`profile-${dimension.state}`}
              >
                <span>{dimension.label}</span>
                <strong>{dimension.value}</strong>
                <p>{dimension.detail}</p>
                <i aria-hidden="true" />
              </article>
            ))}
          </div>
        </section>
        <section className="game-debrief">
          <header>
            <p className="eyebrow">Round debrief</p>
            <h2>See where the evidence changed the answer</h2>
          </header>
          {challenge.rounds.map((item) => {
            const graded = resultByRound.get(item.id);
            const chosen = item.options.find(
              (option) => option.id === answers[item.id],
            );
            const correct = item.options.find(
              (option) => option.id === graded?.correctOptionId,
            );
            return (
              <article
                key={item.id}
                className={graded?.correct ? "correct" : "incorrect"}
              >
                <span>{graded?.correct ? "+250" : "+0"}</span>
                <div>
                  <small>
                    {item.number} · {item.skill}
                  </small>
                  <h3>{item.prompt}</h3>
                  <p>
                    <b>Your call:</b> {chosen?.label}
                  </p>
                  {!graded?.correct && (
                    <p>
                      <b>Better reading:</b> {correct?.label}
                    </p>
                  )}
                  <blockquote>{graded?.explanation}</blockquote>
                  {graded?.citationIndex !== undefined &&
                    challenge.citations[graded.citationIndex] && (
                      <Link
                        href={challenge.citations[graded.citationIndex].href}
                      >
                        [{graded.citationIndex + 1}]{" "}
                        {challenge.citations[graded.citationIndex].label} ·{" "}
                        {challenge.citations[graded.citationIndex].locator}
                      </Link>
                    )}
                </div>
              </article>
            );
          })}
        </section>
        <section className="game-source-ledger">
          <header>
            <p className="eyebrow">Evidence ledger</p>
            <h2>Sources used in this case</h2>
          </header>
          <div>
            {challenge.citations.map((citation, index) => (
              <a
                key={citation.href}
                href={citation.href}
                target={citation.href.startsWith("http") ? "_blank" : undefined}
                rel={
                  citation.href.startsWith("http") ? "noreferrer" : undefined
                }
              >
                <span>
                  [{index + 1}] {citation.role ?? "reviewed source"}
                </span>
                <strong>{citation.label}</strong>
                <p>{citation.locator}</p>
              </a>
            ))}
          </div>
        </section>
        <section className="game-next">
          <div>
            <p className="eyebrow">Keep investigating</p>
            <h2>Good history stays revisable.</h2>
            <p>
              Turn the unresolved dimensions into a testable hypothesis, inspect
              the source trail, or play another case.
            </p>
          </div>
          <div>
            <button className="game-primary" onClick={start}>
              Replay case
            </button>
            <button
              className="secondary-button"
              onClick={() => setState("intro")}
            >
              Choose another case
            </button>
            <Link href="/hypotheses">Open Hypothesis Lab</Link>
            <Link href="/ask">Ask the evidence engine</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="game-page game-play-page">
      <header className="game-progress-header">
        <div>
          <button onClick={() => setState("intro")}>← Case library</button>
          <span>{challenge.title}</span>
        </div>
        <b>
          Round {roundIndex + 1} / {challenge.rounds.length}
        </b>
      </header>
      <div
        className="game-progress"
        aria-label={`${Math.round(progress)} percent complete`}
      >
        <i style={{ width: `${progress}%` }} />
      </div>
      {round && (
        <section className="game-round">
          <div className="game-round-context">
            <span>{round.number}</span>
            <div>
              <p className="eyebrow">{round.skill}</p>
              <h1>{round.prompt}</h1>
              <p>{round.context}</p>
              {round.citationIndex !== undefined &&
                challenge.citations[round.citationIndex] && (
                  <a
                    className="game-source-cue"
                    href={challenge.citations[round.citationIndex].href}
                    target={
                      challenge.citations[round.citationIndex].href.startsWith(
                        "http",
                      )
                        ? "_blank"
                        : undefined
                    }
                    rel="noreferrer"
                  >
                    <b>[{round.citationIndex + 1}]</b>
                    <span>
                      {challenge.citations[round.citationIndex].label}
                    </span>
                    <small>
                      {challenge.citations[round.citationIndex].locator}
                    </small>
                  </a>
                )}
            </div>
          </div>
          <fieldset className="game-options">
            <legend>Choose the most defensible answer</legend>
            {round.options.map((option, index) => (
              <label
                key={option.id}
                className={selected === option.id ? "selected" : ""}
              >
                <input
                  type="radio"
                  name={round.id}
                  value={option.id}
                  checked={selected === option.id}
                  onChange={() =>
                    setAnswers((current) => ({
                      ...current,
                      [round.id]: option.id,
                    }))
                  }
                />
                <span>{String.fromCharCode(65 + index)}</span>
                <b>{option.label}</b>
                <i aria-hidden="true">✓</i>
              </label>
            ))}
          </fieldset>
          <footer className="game-round-footer">
            <button
              disabled={roundIndex === 0}
              onClick={() => setRoundIndex((value) => Math.max(0, value - 1))}
            >
              ← Previous
            </button>
            <p>
              Answer every round. Explanations and citations unlock at the end.
            </p>
            <button
              className="game-primary"
              disabled={!selected || state === "grading"}
              onClick={advance}
            >
              {state === "grading"
                ? "Reading the packet…"
                : roundIndex === challenge.rounds.length - 1
                  ? "Reveal my case"
                  : "Lock answer →"}
            </button>
          </footer>
        </section>
      )}
    </main>
  );
}
