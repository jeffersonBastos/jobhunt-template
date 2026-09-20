# Study — index

Durable, cross-company technical interview prep. Material collected here is
meant to carry forward to future job applications — not tied to one company.

This file is an **index only** — content lives in the individual files
below. Company-specific application of this material (how it maps to a
specific interviewer, a specific role's culture, a specific deadline) stays
in `../interviews/prep/<company>/`, which links back here for the general
content instead of duplicating it.

**Workspace for actual code** (Docker projects, scratch repos, timed
practice runs): keep this outside the repo (e.g. `~/Projects/interview-practice/`)
since it's disposable/runnable code, not notes.

## Algorithms

- [Clock angle problem](algorithms/clock-angle.md) — LeetCode 1344 shape,
  smallest angle between clock hands. A worked derivation, corrected,
  plus the bug patterns worth remembering (esp. `!!` vs `Math.abs`).
- [Meeting room overlap](algorithms/meeting-room-overlap.md) — LeetCode 252
  shape, detect any overlapping interval in a list. Staged spoken-English
  walkthrough (brute force → sort → single-pass), plus why sorting collapses
  the general two-condition overlap test down to one comparison.
- [Duration string parsing](algorithms/duration-parsing.md) — "2h 30m" →
  total minutes, regex-free split+slice approach (unit = last character,
  number = everything before it) — avoids assuming fixed digit width.
- [Merge overlapping intervals](algorithms/merge-intervals.md) — extends
  meeting-room-overlap's sort-by-start idea to build the merged result;
  flags the shallow-copy shared-reference mutation trap, and the `<=` vs
  `<` boundary flip (touching merges here, unlike overlap-detection).
- [Roman numeral conversion](algorithms/roman-numeral-conversion.md) — both
  directions (LeetCode 12+13). Subtractive-notation rule (`IV`=4) is the
  crux; int→roman folds subtractive pairs directly into the lookup table.
- [Balanced parentheses](algorithms/balanced-parentheses.md) — canonical
  stack pattern. Why `"([)]"` is the case that separates a real solution
  from a bracket-counting one; the trailing-unclosed edge case.
- [Flatten nested structure](algorithms/flatten-nested-structure.md) —
  recursion warm-up. Distinguishes O(n) output space from O(depth) call
  stack space; `Array.isArray()` vs `typeof` null gotcha.

*(More files land here as problems get practiced — see the practice bank
in the active company's study-plan for what's queued.)*

## System design

- [Clarifying questions](system-design/clarifying-questions.md) — the
  opening checklist to run through out loud before drawing anything: scale
  (users/RPS/read-write ratio), data shape & growth, consistency/latency
  requirements, functional scope (v1 slice), growth trajectory, constraints.
- [Component one-liners](system-design/one-liners.md) — one sentence per
  component (CDN, load balancer, cache, queue, vector DB, etc.) for fast
  recall mid-interview.
- [AI customer-service cases](system-design/ai-customer-service-cases.md) —
  domain-specific cases for a GenAI/chatbot/customer-communication role
  (RAG support bot, ticket triage, multi-channel unification, agent-assist,
  guardrails, traffic-spike handling), each with its one non-obvious
  insight and likely follow-ups.
- [Components ladder](system-design/components-ladder.md) — the escalation
  path from a single server to a robust multi-region system, rung by rung
  (DB split → cache → load balancer → CDN/edge → observability → queue/
  async → DB replicas/sharding → event-driven → microservices/API gateway
  → multi-region), narrated as additions rather than one final diagram.
- [Architecture cheat sheet](system-design/architecture-cheatsheet.md) —
  opinionated, concrete answers for "how would you architect X" style
  questions: scaling, observability, database, auth, storage, networking/
  edge layer (CDN/Cloudflare/reverse proxy), AI integration, hosting,
  frontend/design system. Includes the "cut for MVP but cheap to extend
  later" framing pattern and the execution-elegance (task breakdown) idea.
- [Classic system design problems](system-design/classic-problems.md) —
  the "greatest hits" (chat, live location, feeds, rate limiting,
  autocomplete, file sync, booking, payments) each reduced to its one
  non-obvious insight (e.g. websockets-over-polling for turn-based games).
  Pattern-recognition insurance, meant to be woven into a scenario answer.
  Also covers monolith vs. microservices, sync vs. async, CAP theorem, and
  the N+1 query problem.
- [Components glossary](system-design/components-glossary.md) — ACID vs.
  BASE, partitioning vs. sharding, queue delivery guarantees (at-most/
  at-least/exactly-once), load balancer algorithms + LB vs. API Gateway,
  Lambda/serverless, event-driven architecture + Saga pattern, DNS, CDN +
  cache invalidation, cache-aside vs. read-through.

## AI/ML concepts

- [RAG and prompting](ai-ml-concepts/rag-and-prompting.md) — what RAG is,
  the retrieval pipeline, and principles for writing effective prompts.
- [Build vs. buy and providers](ai-ml-concepts/build-vs-buy-and-providers.md)
  — when to self-host/fine-tune vs. use a paid frontier API, and the
  open-source model / inference-provider landscape as of mid-2026 (verify
  freshness before reusing exact numbers).

## Python (FastAPI / SQLAlchemy)

- [FastAPI/SQLAlchemy refresher](python/fastapi-sqlalchemy-refresher.md) —
  added after confirming a target company's stack is Python-based, not
  Node/TS. JS/TS → Python idiom translations
  (comprehensions, falsy-value gotcha, mutable-default-argument bug),
  FastAPI request/response/dependency-injection shape, SQLAlchemy ORM
  model + session basics, and a Python translation of the already-solved
  `mergeIntervals` problem.

## English

- [Technical communication](english/technical-communication.md) — how to
  say Big-O notation and other technical concepts out loud in English,
  plus a running vocabulary/phrases log.

## Active applications using this material

Track company-specific application of this material in
`../interviews/prep/<company>/` — one folder per active interview process,
each with its own study plan linking back to the relevant files above.
