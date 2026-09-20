# Clarifying questions — the opening checklist

Started 2026-09-10. The questions to ask **before** drawing a single box,
every time, regardless of what "design X" prompt shows up. Interviewers use
this phase to judge whether you scope before you solve — skipping it (or
doing it silently in your head) is the single most common way to lose points
in the first five minutes. Say these out loud, even the obvious ones.

**A strong anchor to lead with**: "before I start
designing, I need to understand the access volume — how many requests per
second, or how many concurrent users?" — keep leading with that, then work
through the rest below in roughly this order.

Each question below carries its **implication** — the "if X, then reach for
this; if Y, then reach for that" branch — because the question is only
useful if you know what to do with the answer.

## 1. Users & scale (always ask, no exceptions)

- How many total users, and how many **concurrent/active at once** (DAU/MAU
  vs. concurrent are different numbers — ask for both if only one is given)?
  → **If low** (hundreds/day): single server, no load balancer, don't
  over-build. **If high** (thousands+/sec): load balancer + multiple
  replicas + cache are needed from the first diagram, not added later.
- Requests per second — and **read vs. write ratio**?
  → **If read-heavy** (most systems): invest in caching and read replicas
  first — that's where the bottleneck will actually be. **If write-heavy**
  (e.g. an ingestion/logging system): think queue-to-absorb-bursts and
  earlier partitioning/sharding, since caching won't help writes.
- Single region or global?
  → **If single region**: skip multi-region entirely, don't mention it.
  **If global**: geo-routing and data-replication trade-offs (Rung 10 in
  `components-ladder.md`) become a real part of the answer, not a footnote.

## 2. Data shape & growth

- What's the core entity, and roughly how big is one record?
  → **If small/structured with relationships** (a user, an order, a chat
  message): relational DB (Postgres), normal rows. **If large/binary**
  (video, image, PDF, audio): never put it in the DB — blob storage (S3)
  + CDN for delivery, DB only stores a reference/URL to it.
  → **If a document with a flexible/changing shape** (freeform JSON,
  config, event payloads): either JSONB inside Postgres (keeps
  transactions/relations for everything else) or a NoSQL store if it's
  *also* write-heavy at scale — don't reach for Mongo just because a field
  is flexible; JSONB usually covers that alone.
- Growth rate — steady or bursty/seasonal (a sale, a viral moment)?
  → **If bursty**: a queue in front of the spike absorbs it instead of the
  DB/app taking the full peak directly. **If steady**: capacity planning is
  simpler, autoscaling on averages is enough.

## 3. Consistency & availability requirements

- Strong consistency (payments, inventory — a wrong answer is unacceptable)
  or eventual consistency (a like count, a view count) is fine?
  → **If strong**: relational DB with real transactions, and on a network
  partition you **reject the request** rather than risk serving/committing
  a wrong value (CP side of CAP). **If eventual is fine**: favor
  availability — always respond, even with slightly stale data (AP side) —
  DynamoDB/Cassandra-shaped stores fit here.
- Acceptable latency — real-time (<100-200ms: chat, gaming, a live chatbot
  reply) or "a few seconds is fine" (a report, a batch export)?
  → **If real-time**: WebSocket or streaming response, never polling, and
  no synchronous call to something slow (like an LLM) inside that path.
  **If it can wait**: push the work to a queue/worker and let the client
  poll or get notified when it's done.
- On partial failure, degrade gracefully (serve stale cached data) or fail
  loudly (reject rather than risk a wrong answer)?
  → **If the wrong answer is worse than no answer** (e.g. an AI giving a
  customer incorrect account info): fail loudly / escalate, don't guess.
  **If stale is better than nothing** (e.g. a dashboard number): serve
  cached/stale and refresh in the background.

## 4. Functional scope — what's actually in v1

- Of everything the prompt implies, what's the **one core flow** to design
  first?
  → This decides where you spend your 20 minutes. Naming the cut out loud
  ("I'll focus on the request→answer path first, and treat admin/reporting
  as out of scope unless you want it") is itself the signal an interviewer
  is checking for — silently picking a scope without saying so reads as
  not having one.
- Any existing systems this has to integrate with, or is this greenfield?
  → **If integrating**: the existing system's constraints (its API shape,
  its data format) become real constraints on your design, ask about them
  before assuming a clean slate. **If greenfield**: you have more freedom,
  say so and move faster through this section.

## 5. Growth trajectory (ask once the v1 shape is agreed)

- Design for the scale stated today, but say out loud where the design
  would need to change at 10x/100x.
  → This is the "how do you handle detours" moment the interviewer is
  actually watching for — naming the future bottleneck (e.g. "this single
  Postgres instance is fine here, but at 10x write volume I'd shard by
  user ID") shows judgment even without building it now.

## 6. Constraints (ask if not obviously implied)

- Any mandated cloud provider / existing infra to build on top of?
  → **If mandated**: use their native building blocks (e.g. AWS shop →
  SQS/ALB/RDS, not "I'd reach for Kafka" out of nowhere). **If open**:
  pick based on the actual requirement, not habit.
- Any compliance/regulatory angle (PII, payments/PCI, healthcare)?
  → **If sensitive data is involved**: encryption at rest/in transit, data
  minimization (store a hash, not the raw document, when possible — a real
  pattern worth citing if you have this kind of experience), audit logging become part
  of the answer. **If the data is public/non-sensitive** (e.g. on-chain
  data): say so and skip this section instead of over-engineering security
  theater.

## Why the order matters

Scale (1) first, because it decides almost everything downstream — a
1000-req/day tool and a 1M-req/sec platform are different systems even with
identical features. Data shape (2) and consistency (3) come next because
they decide the database/caching answer. Scope (4) comes after, once you
know what you're actually building for. Growth (5) and constraints (6) are
the closing/framing questions — ask them briefly, don't let them balloon
the clarifying phase past ~2-3 minutes total.

See also [components-ladder.md](components-ladder.md) for what to reach for
once scale/scope are pinned down, and [classic-problems.md](classic-problems.md)
for named problems and their one non-obvious insight.
