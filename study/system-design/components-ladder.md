# Components ladder — simple to robust

Started 2026-09-10. The escalation path for "how would you architect this,"
narrated as a sequence of additions rather than presenting the final robust
diagram all at once. **Say it as a ladder out loud**: "I'd start here for the
scale we just discussed, and here's what I'd add first if it grew" — this is
the single best way to show judgment instead of reciting a checklist.
Complements [clarifying-questions.md](clarifying-questions.md) (what to ask
first) and [classic-problems.md](classic-problems.md) (named problems).

## Rung 0 — single server

Client → one server running the app code and the database on the same box.
Correct answer for a prototype/low-traffic MVP; anything more is
over-engineering at this stage. Say so explicitly if a prompt clearly implies
low scale — resisting the urge to over-build is itself a signal.

## Rung 1 — split the database out

App server and DB on separate machines. Immediate win: the app can restart/
redeploy without touching the DB, and you can scale/tune each independently.
This is also the point to default to **Postgres** unless there's a concrete
reason not to (see `architecture-cheatsheet.md`).

## Rung 2 — add a cache

**Redis** (or equivalent) in front of the DB for hot reads — cache-aside is
the default pattern (see `components-glossary.md`). This is usually the
highest-leverage single addition: most systems are read-heavy, and a cache
hit avoids a DB round-trip entirely.

## Rung 3 — horizontal scaling: load balancer + multiple app replicas

Once one app server can't keep up, add more identical replicas behind a
**load balancer** (ALB-style, layer 7). Precondition: the app must be
**stateless** — no local session/file state — or requests to different
replicas break. This is why "design it stateless from day one" is worth
saying even at Rung 0, so this rung is additive later, not a rewrite.

## Rung 4 — edge layer: reverse proxy / CDN / Cloudflare

In front of the load balancer: TLS termination, DDoS protection, WAF, and a
**CDN** caching static assets (and, for read-heavy APIs, even some dynamic
responses) at edge locations close to users. Cloudflare bundles this; AWS
assembles it from Route53 + CloudFront + WAF + ACM + Shield. This is also
where DNS resolution happens, logically outermost in the diagram.

## Rung 5 — observability

Structured logging (JSON, request/trace IDs threaded through every service),
metrics, and alerting — **not optional even at Rung 0-1** in a real answer,
but it's placed here because this is the point in the narration where an
interviewer expects you to say "and now that there's more than one moving
part, I need to see across them." Tool tiering: Sentry (fast MVP) →
Datadog (full-featured, priced accordingly) → Grafana stack (cost-optimized,
more setup). Close every design with "how would I know this is actually
working" — ties observability back to validating correctness, not just
uptime.

## Rung 6 — async work: queue + workers

Once something in the request path is slow or unpredictable (sending email,
processing an upload, calling an LLM), pull it out of the synchronous
request/response cycle into a **queue** (SQS/RabbitMQ/Kafka) consumed by
worker processes. Caller gets an immediate ack; result arrives via polling,
webhook, or a websocket push. This is the direct answer to "how do you avoid
a slow dependency taking down your API's latency."

## Rung 7 — database scaling: replicas, then partitioning/sharding

Read replicas first (cheap, handles read-heavy growth, some replication lag
to accept). If **write** volume outgrows one instance, partition/shard —
picking a good shard key (hash of user ID, not something clustering new
writes on one shard) is the detail that separates a real answer from a
buzzword.

## Rung 8 — event-driven decoupling

Instead of services calling each other synchronously, they publish/subscribe
to events through a broker (Kafka/SQS+SNS/RabbitMQ). New consumers can be
added without touching producers. This is also where the **Saga pattern**
enters, for any "transaction" that now spans multiple services/databases.

## Rung 9 — microservices + API gateway

Split the monolith only once team size or genuinely different scaling
profiles justify the operational cost (service discovery, network calls that
can fail where a function call used to just work, no cross-service ACID
transactions). An **API Gateway** sits in front of the many services —
auth, rate limiting, routing by path, response aggregation — distinct from
the load balancers each service still has underneath it (see
`components-glossary.md` for the LB-vs-gateway distinction).

## Rung 10 — multi-region

Global load balancing/geo-DNS routing users to the nearest region; data
replicated across regions with an explicit CAP-theorem tradeoff per data
type (strong-consistency data usually stays single-region or accepts
higher write latency; eventually-consistent data replicates more freely).
Reserve this rung for prompts that explicitly ask about global scale or
disaster recovery — naming it as "premature before that requirement exists"
is a correct answer, not a gap.

## The four components that show up in almost every answer

If time is short, these are the ones to always have ready, matching what
tends to get asked regardless of the specific system: **database** (Rung 1),
**edge/proxy layer — Cloudflare or equivalent** (Rung 4), **load balancer**
(Rung 3), **observability/logging** (Rung 5). Naming where each one enters
the ladder — not just that it exists — is what separates "I know the
vocabulary" from "I know when to reach for it."
