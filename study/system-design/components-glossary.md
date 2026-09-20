# System design components — glossary

Started 2026-08-12, compiled while watching prep videos. Building-block
concepts and infrastructure components — distinct from
[classic-problems.md](classic-problems.md) (named interview problems with
one core trick) and [architecture-cheatsheet.md](architecture-cheatsheet.md)
(opinionated MVP-stage tool choices). This file is the "what is X and how
does it work" reference underneath both of those.

## Database guarantees

**ACID** (relational DBs): the guarantees a transaction gets.
- **Atomicity**: a transaction fully completes or fully rolls back — no
  partial writes (e.g. transferring money: debit + credit both happen, or
  neither does).
- **Consistency**: a transaction moves the DB from one valid state to
  another, respecting all constraints (foreign keys, uniqueness). **Not**
  the same "C" as in CAP theorem below — same word, different concept,
  worth flagging explicitly since it's a common mix-up.
- **Isolation**: concurrent transactions don't interfere — behave as if
  run sequentially even when actually parallel. (Isolation levels — read
  committed, repeatable read, serializable — trade correctness strength
  for performance; know the term exists, don't need to memorize all four.)
- **Durability**: once committed, a transaction survives a crash — it's
  written to disk/WAL, not just memory.

**NoSQL -> BASE**: the relaxed counterpart to ACID, used by systems that
favor availability/scale over strict consistency.
- **B**asically **A**vailable — favors availability (the "A" in CAP).
- **S**oft state — the system's state can change over time even without
  new input, as replicas catch up to each other.
- **E**ventual consistency — given enough time with no new writes, all
  replicas converge to the same value, but a read *right now* might be
  stale.

ACID vs. BASE is the same underlying tradeoff as CP vs. AP in CAP theorem
(see [classic-problems.md](classic-problems.md)) — strong guarantees and
harder horizontal scaling (ACID/CP) vs. weaker guarantees and easier scale
(BASE/AP).

**Partitioning vs. sharding** — genuinely inconsistent usage across the
industry, but the useful distinction: **partitioning** is the general
term for splitting a table's data into smaller pieces — this can happen
**within a single DB instance** (e.g. Postgres native table partitioning
by date range, for query/maintenance performance) or across multiple
instances. **Sharding** is specifically the case where those partitions
live on **entirely separate physical database servers** — a horizontal
scaling technique for spreading write/storage load across machines. So:
all sharding is a form of partitioning, not all partitioning is sharding.
Shard-key choice matters a lot — a poorly chosen key (e.g. sharding by
signup date, where all new users hit the same shard) creates a hot
partition/shard that becomes the bottleneck; a well-distributed key
(hash of user ID) spreads load evenly.

## Queues

**Beyond sending email**, common queue use cases: image/video/PDF
processing, webhook delivery with retries, order-processing pipelines,
push notification/SMS delivery, ETL/data pipelines, decoupling services in
an event-driven architecture (see below), smoothing bursty traffic so a
downstream system isn't overwhelmed ("load leveling").

**Logging**: yes — queues are a standard part of log pipelines. The app
writes log events onto a queue (Kafka is the classic choice here — this
was literally one of Kafka's original use cases at LinkedIn), and a
separate log-processing/indexing service consumes from the queue
asynchronously into storage (Elasticsearch, Datadog, etc). This decouples
log producers from the ingestion backend and absorbs bursts of log volume
without overwhelming storage.

**Delivery guarantees** — the three levels, and which one matters:
- **At-most-once**: delivered 0 or 1 times, never redelivered even after a
  consumer crash — risk of silent message loss. Simplest/cheapest; fine
  when occasional loss is acceptable (e.g. non-critical telemetry).
- **At-least-once**: guaranteed not lost, but may be delivered more than
  once (consumer crashes after processing but before acknowledging →
  redelivered). Requires the consumer to be **idempotent** (processing the
  same message twice has the same effect as once). This is the most
  common real-world guarantee — most managed queues (SQS) default here.
- **Exactly-once**: delivered and processed exactly once — genuinely hard
  and expensive to guarantee in a distributed system. Worth saying out
  loud: "true exactly-once is very hard; in practice most systems do
  at-least-once delivery + idempotent consumers, which gives the same
  practical outcome without the distributed-transaction complexity."

**Web crawler** (semi-classic system design question on its own): a
program that starts from seed URLs, downloads pages, extracts links, and
follows them to discover more pages — used to build search indexes or for
scraping. Key design pieces: a queue of URLs to visit (the "frontier"),
deduplication (don't revisit — a set or bloom filter), politeness
(rate-limit per domain, respect `robots.txt`), and distributed workers to
crawl in parallel.

## Load Balancer

**Distribution algorithms**:
- **Round robin** — cycle through servers in order.
- **Random** — pick one at random each time.
- **Least connections** — send to whichever server has the fewest active
  connections right now; better than round robin when request processing
  time varies a lot.
- **Weighted** (round robin or least-connections) — some servers get
  proportionally more traffic (a bigger instance gets a higher weight).
- **IP hash** — route based on a hash of the client IP, so the same client
  consistently lands on the same server — a form of session affinity done
  at the LB level, without needing a shared session store.

**Does AWS have this?** Yes — the ELB family: **ALB** (Application Load
Balancer, layer 7/HTTP, supports path/host-based routing — `/api` to one
target group, `/admin` to another, plus WebSocket support — the default
choice for most web apps and microservices) and **NLB** (Network Load
Balancer, layer 4/TCP-UDP, ultra-low latency, handles extreme
requests/sec — used when you need raw throughput or non-HTTP protocols).
ALB mostly handles algorithm choice automatically (defaults to something
like least-outstanding-requests) — less manual algorithm tuning exposed
than something like Nginx/HAProxy where you'd configure it explicitly.

**Load Balancer vs. API Gateway — the actual difference** (commonly
confused): a **load balancer** distributes traffic across multiple
*identical* instances of the *same* service, for scaling/availability —
fairly simple forwarding logic. An **API Gateway** sits in front of
*many different* backend services (typical in microservices) and does a
lot more: authentication/authorization, rate limiting, request/response
transformation, routing by path to different services, aggregating
multiple service calls into one response, versioning. They're
complementary, not either/or — an API Gateway routes `/users/*` to the
Users service, and a load balancer distributes that traffic across the
Users service's own replicas underneath. AWS has both as distinct managed
services: Amazon API Gateway, separate from ELB.

**What is a Lambda** (two sentences): a serverless compute service that
runs your code in response to events — an HTTP request, an S3 upload, a
queue message — without provisioning or managing any servers. AWS scales
invocations automatically (including to zero when idle) and you're billed
only for actual execution time.

**Serverless vs. server — when to use which**:
- Serverless (Lambda, Cloudflare Workers): ✅ no server management,
  scales to zero (no idle cost), pay only for execution time — great for
  bursty/unpredictable/infrequent workloads and simple event-driven glue
  code (S3 upload → generate a thumbnail). ❌ **cold starts** (first
  request after idle time pays a latency penalty), execution time limits
  (Lambda caps around 15 min), poor fit for persistent connections
  (WebSocket servers) or long-running processes, can get pricier than a
  dedicated server at sustained high volume.
- Traditional server (container/VM): better for sustained,
  predictable high traffic (cheaper at scale, no cold starts),
  long-running or stateful processes, anything needing more control over
  the runtime.

## WAF, DDoS, SSL/TLS, reverse proxy, CDN, Cloudflare

Already covered in depth in an earlier session — see the **Networking /
edge layer** bullet in [architecture-cheatsheet.md](architecture-cheatsheet.md)
for the condensed version: WAF filters malicious HTTP requests (SQLi, XSS,
rate-limiting brute-force login attempts) rather than managing passwords
itself; DDoS is a flood of traffic from many machines at once meant to
overwhelm a server; SSL/TLS encrypts data in transit; a reverse proxy is
the entry point that forwards client requests to your actual origin;
Cloudflare bundles all of these (plus DNS + CDN) in one product, and is
**not** an AWS service — it's an independent, cloud-agnostic alternative
to assembling Route53 + CloudFront + AWS WAF + ACM + Shield separately.

## Event-driven architecture and the Saga pattern

**Event-driven architecture**: instead of services calling each other
directly (sync request/response), services publish and subscribe to
**events** ("OrderCreated") through a message broker (Kafka, SQS/SNS,
RabbitMQ). A producer doesn't know or care who consumes its events;
consumers react independently, and new consumers can be added without
touching the producer. Naturally fits async processing.

**Saga pattern**: how you handle a "transaction" that spans multiple
services/databases, where a normal single-database ACID transaction can't
reach. A saga breaks the business transaction into a sequence of local
transactions, one per service, where each step's completion triggers the
next. If a step fails partway through, the saga runs **compensating
transactions** to undo the completed steps — since you can't just
"rollback" across separate services like a real DB transaction (e.g. an
order flow: reserve inventory → charge payment → confirm order; if
payment fails, a compensating action releases the reserved inventory).
Two implementation styles: **choreography** (each service listens for
events and reacts on its own — decentralized, can get hard to trace as
complexity grows) vs. **orchestration** (a central coordinator explicitly
tells each service what to do next — easier to reason about and debug,
but the orchestrator becomes a more critical/central component).

## DNS

Translates a human-readable domain (`yourapp.com`) into the IP address
computers actually route traffic to. It's the very first hop — before the
request even reaches your load balancer/reverse proxy, the client has to
resolve the domain to an IP first. In an architecture diagram, DNS sits
outermost, before everything else.

**Can this live inside Cloudflare?** Yes — Cloudflare started as a DNS +
security company, and when you point your domain's nameservers at
Cloudflare (the "orange cloud" mode), your DNS resolves to **Cloudflare's
edge IPs**, not your actual origin server's IP — which is exactly why
Cloudflare can sit in front of all your traffic: DNS itself points at
Cloudflare, not at you. AWS's equivalent standalone service is **Route53**.

## Blob storage, CDN, and cache invalidation

**Blob store** = a generic/vendor-neutral term for unstructured file
storage — S3 is the canonical example (Azure literally calls its version
"Blob Storage"). It's the **origin** — the actual durable copy of a file.

**How it links to a CDN**: the CDN sits in front of the blob store and
caches copies of files at edge locations close to users. First request
for a given file at a given edge location is a cache miss — the CDN
fetches it from the origin (S3), caches it, and serves it. Every
subsequent nearby request is a cache hit — served directly from the edge,
without touching S3 at all.

**Cache invalidation — how something expires from a CDN**, three
mechanisms:
1. **TTL** — each cached object has an expiration set via HTTP
   `Cache-Control: max-age=...` headers; after it passes, the CDN
   re-fetches from origin (often after first *revalidating* with an ETag
   / If-Modified-Since check, so it only re-downloads if the content
   actually changed).
2. **Manual/explicit purge** — actively telling the CDN "drop this file
   from every edge cache now," used when you can't wait for the TTL (e.g.
   fixed a bug in an image, need it live immediately). Both CloudFront and
   Cloudflare support this via API/dashboard.
3. **Cache-busting via versioned filenames** — instead of invalidating
   `logo.png`, name the new version `logo.v2.png` (or append a content
   hash) so the URL itself changes when the content changes — the old
   cached copy just becomes irrelevant rather than needing to be purged.
   This is the standard approach for JS/CSS bundles — webpack/Vite output
   hashed filenames automatically for exactly this reason.

## Caching patterns: cache-aside vs. read-through

**Cache-aside** ("lazy loading") — the **application code** manages the
cache explicitly. Read: check cache first; on a miss, the app itself
queries the DB, then the app itself writes the result into the cache. This
is the default mental model for "just use Redis as a cache" in a typical
app — the app orchestrates the miss-then-populate logic.

**Read-through** — the **cache layer itself** sits transparently in front
of the DB and handles misses internally; from the app's perspective, it
only ever talks to the cache, never the DB directly for reads. Requires
the caching layer/library to support this pattern natively.

**One-line difference**: cache-aside = app code explicitly manages the
miss-then-populate logic; read-through = the cache layer handles it
transparently.

**Write-side counterparts**, usually mentioned alongside these: **write-
through** (every write goes to cache and DB synchronously, as one
operation — cache always consistent, adds write latency) vs.
**write-behind/write-back** (write goes to cache immediately, cache
asynchronously flushes to DB later in batches — faster writes, but risk
of data loss if the cache crashes before flushing).
