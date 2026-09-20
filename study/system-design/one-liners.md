# Component one-liners — quick recall card

Started 2026-09-10. One sentence per component, for fast recall mid-interview
— the "what is it, in one breath" version. Deeper explanations of the same
components live in [components-glossary.md](components-glossary.md) and
where each one enters the build-up in [components-ladder.md](components-ladder.md).

- **CDN** — network of servers spread across the globe that caches static
  content close to the user, so requests don't all travel back to one
  origin server (Cloudflare, CloudFront).
- **Load Balancer** — spreads incoming requests across multiple identical
  replicas of the same service so no single one gets overwhelmed.
- **Reverse Proxy** — sits in front of your real server(s) as the only thing
  the client ever talks to, forwarding requests behind the scenes
  (Cloudflare, Nginx).
- **API Gateway** — single front door for many *different* backend services,
  handling auth, rate limiting, and routing by path (distinct from a load
  balancer, which fronts replicas of *one* service).
- **Cache (Redis)** — keeps frequently-read data in memory so repeat reads
  skip the database entirely.
- **Message Queue (Kafka/SQS/RabbitMQ)** — buffer that decouples whoever
  creates a task from whoever processes it, enabling async work and
  absorbing traffic spikes.
- **Database (Postgres)** — durable, structured storage with transactional
  (ACID) guarantees — the default for anything relational.
- **Blob Storage (S3)** — storage for large binary files (videos, images,
  PDFs) that shouldn't live inside a relational database.
- **Observability (Datadog/Sentry)** — logs, metrics, and alerts that let
  you see what's actually happening inside the system and catch problems
  before/as they surface.
- **DNS** — translates a human domain name into the actual server IP; the
  very first hop of any request, before anything else in the diagram.
- **WAF** — filters out malicious HTTP requests (SQL injection, XSS,
  credential-stuffing) before they ever reach your application.
- **Auth service (Clerk/Auth0/OAuth)** — verifies who the user is and what
  they're allowed to do, so individual services don't reimplement identity.
- **Read replica** — a read-only copy of the primary database that absorbs
  read traffic so the primary is free to handle writes.
- **Vector DB (pgvector/Pinecone)** — stores embeddings and finds the
  *semantically* closest matches to a query — the retrieval half of RAG.
- **Worker/consumer** — a process that pulls tasks off a queue and executes
  them asynchronously, off the main request/response path.
- **Sharding** — splitting one table's data across multiple physical
  database servers so write/storage load spreads instead of hitting one
  machine.
- **Saga** — a sequence of local transactions across services, each with a
  compensating "undo" step, standing in for a single ACID transaction that
  can't span multiple databases.
- **Idempotency key** — a unique token on a request so retrying it (e.g.
  after a timeout) has the same effect as sending it once, never double.
