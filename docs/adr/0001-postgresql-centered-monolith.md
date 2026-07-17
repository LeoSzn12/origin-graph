# ADR 0001: PostgreSQL-centered modular monolith

- Status: accepted for Phase 0–1
- Date: 2026-07-16

## Context

Origin Graph must preserve source editions, exact locators, multiple chronology roles, spatial uncertainty, semantic retrieval readiness, typed graph edges, review state, and audit history without premature distributed-system complexity.

## Decision

Use a standalone Next.js/TypeScript modular monolith backed by PostgreSQL 16. PostGIS stores spatial geometry, pgvector reserves semantic-index capability, and normal relational tables model typed connections and source genealogy. SQL files are the migration source of truth; a small TypeScript runner applies them transactionally. Domain services own cross-table publication and review rules. Background jobs and object-storage adapters are deferred until the ingestion phase.

The application is organized into web, domain, and database boundaries. It does not import from or modify Immerse. Admin access uses environment-provided HTTP Basic credentials and is read-only in Phase 1.

## Consequences

- One database provides transactions across source, claim, review, and audit changes.
- PostGIS and pgvector must be available in development and production PostgreSQL images.
- Polymorphic graph endpoints are validated in services because PostgreSQL cannot directly foreign-key a `(type, id)` pair across several tables.
- Search embeddings, live adapters, jobs, timeline rendering, and Ask remain later-phase work.

## Rejected alternatives

- Neo4j: operational and synchronization cost is not justified for MVP graph size.
- Kafka/microservices: no Phase 1 workload requires distributed messaging.
- ORM-generated schema: SQL-first migrations make constraints and review gates easier to inspect.
