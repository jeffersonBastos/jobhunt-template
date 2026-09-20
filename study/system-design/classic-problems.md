# Classic system design problems — pattern reference

Started 2026-08-12. Not exhaustive — the "greatest hits" that repeat across
company interviews because each one tests one specific non-obvious insight,
not raw breadth. Goal: recognize the underlying pattern fast when a founder
pitch (or a direct "design X" question) turns out to need one of these,
even if the surface story is different from the classic phrasing.

## Real-time / live-update problems

- **Turn-based game (chess, tic-tac-toe)**: the trick is **WebSockets over
  polling**. Don't have the client repeatedly ask "has the other player
  moved yet?" — open a persistent connection, and the server pushes the
  move the instant it happens. Same insight applies any time a UI needs to
  reflect another actor's action live.
- **Live location tracking (Uber driver map)**: two parts. (1) the driver's
  app periodically pushes its location (short interval, not websocket
  necessarily — location doesn't need sub-second precision). (2) finding
  "drivers near me" efficiently needs **geospatial indexing** (geohash or
  quad-tree), not scanning every driver's raw lat/long on every request.
- **Chat app (Slack/WhatsApp-style)**: WebSocket for live delivery, plus a
  **message queue** so a message isn't lost if the recipient is briefly
  offline — queued and delivered on reconnect. Ordering and read-receipts
  are the common follow-up depth.
- **Live dashboard / notification feed**: same WebSocket-vs-polling
  insight, generalized — any "the UI needs to reflect a backend state
  change without the user refreshing" story reduces to this.

## Feed / content distribution: fanout and the celebrity problem

**Fanout** is the pattern of pushing one piece of data out to many
recipients — e.g. a new post going into every follower's feed. Two ways to
do it:
- **Fan-out on write**: precompute and push to every follower's feed the
  moment a post is made. Reads are instant (already materialized), but
  writes get expensive fast as follower count grows.
- **Fan-out on read**: don't precompute anything — when a user opens their
  feed, gather and merge posts from everyone they follow, on the spot.
  Writes stay cheap regardless of follower count, but reads get expensive,
  especially for users following many accounts.

**The celebrity problem** is the specific failure case that breaks pure
fan-out-on-write: an account with millions of followers means millions of
feed writes for a single post — too slow/expensive to do synchronously.

**The real-world answer (this is literally Twitter's actual architecture)**:
a **hybrid** — fan-out on write for normal accounts, fan-out on read
*only* for celebrity/high-follower accounts, merging their posts in at
read time instead of writing to millions of feeds. Present these two
together as one story if asked — the celebrity problem is the reason the
hybrid exists, not a separate topic.

## URL shortener (bit.ly-style)

**What it is**: a service that takes a long URL and generates a short
unique alias (`short.ly/xyz123`) that redirects to the original when
visited.

**What it's for**: sharing links in space-constrained contexts, cleaner
links, and (often) click analytics on the redirect.

**Why it's a classic**: it's small enough to fully design in 20-30
minutes, but still touches several real concepts at once — ID generation,
read/write skew, caching, redirect semantics — which is exactly why it's a
common warm-up/first system design question.

**Core approach**:
- **Generating the short code**: either (a) an auto-increment counter,
  base62-encoded (0-9a-zA-Z) into a compact string — guarantees
  uniqueness with no collision handling needed; or (b) hash the original
  URL and take the first N characters — simpler conceptually, but needs a
  collision-handling strategy (retry with a salt, check-and-increment).
  Approach (a) is the cleaner answer to lead with.
- **Storage**: a simple `short_code -> original_url` key-value mapping —
  Postgres is fine, or a KV store (Redis/DynamoDB) given the access
  pattern is just point lookups, no relational queries needed.
- **Redirect**: HTTP 302 (temporary), not 301 (permanent) — 301 gets
  cached by browsers, which means you'd lose visibility into subsequent
  clicks for analytics. Worth stating this distinction out loud if asked
  about the redirect itself.
- **The read-heavy insight**: redirects (reads) vastly outnumber link
  creation (writes) — so caching the hot/popular short codes (Redis, or
  even CDN-level) in front of the database is the detail that separates a
  complete answer from a basic one.

**When this would actually come up in Sierra's format**: less likely as a
bare standalone "design bit.ly" prompt, given the confirmed hybrid format
is a founder-scoping conversation, not abstract "design X" prompts. More
likely to surface as the *same underlying pattern* inside a SaaS feature —
shareable invite links, referral codes, magic login links, tracked links
in an email campaign — all of which need the same generate-unique-code +
redirect + cache-the-hot-path shape. Worth naming that connection if a
founder pitch includes anything link-shaped.

## Video streaming (Netflix/YouTube)

**The core insight**: video never gets served live from your application
server — it's pre-processed once and then delivered almost entirely by a
**CDN**, so the origin server is only in the path for the very first request
per edge location.

- **Upload/ingest pipeline (async, off the request path)**: uploaded video
  goes into a **queue**, picked up by workers that **transcode** it into
  multiple resolutions/bitrates (e.g. 240p/480p/1080p/4K) and chunk each
  into small segments (a few seconds each) — this is what makes **adaptive
  bitrate streaming** possible (HLS or DASH protocol): the player requests
  the next segment at whatever quality current bandwidth supports, so
  quality can step up/down mid-playback without restarting.
- **Delivery**: segments are stored in blob storage (S3-equivalent) and
  fronted by a **CDN**, cached at edge locations near the viewer — the same
  origin→CDN→cache-hit pattern as any static asset (see
  [components-glossary.md](components-glossary.md)), just at video scale.
  **Netflix's specific answer** (worth citing by name if it comes up): they
  built their own CDN, **Open Connect** — appliances placed directly inside
  ISP networks — rather than relying purely on a third-party CDN, because at
  their volume this dramatically cuts transit cost and latency versus
  routing everything back to origin. The generalizable lesson, not the
  literal product name, is the part worth remembering: at large enough
  scale, the economics can flip from "buy CDN capacity" to "place your own
  caching hardware as close to the user as physically possible."
- **Metadata vs. bytes are different systems**: the video file itself flows
  through the pipeline above; title/description/thumbnails/watch-progress/
  recommendations live in an entirely separate, much smaller, more
  relational data path (Postgres-shaped, not CDN-shaped) — worth separating
  the two explicitly if asked to design "the whole system," since they have
  completely different scaling profiles.
- **Watch-progress / resume playback**: a small, frequently-written record
  (user, video, timestamp) — high write volume but tiny payload, a good fit
  for a fast KV store rather than the main relational DB.

## Rate limiting / traffic control

- **API rate limiter**: token bucket or sliding-window-counter algorithm,
  and — the part people forget — it needs to be **distributed** (via
  Redis) the moment you have more than one app instance, or each instance
  enforces its own separate limit instead of a shared one.

## Search / lookup problems

- **Autocomplete / typeahead**: a **trie** for prefix matching, with the
  most popular completions cached at each node so the common case doesn't
  need a full tree walk.

## Storage / consistency problems

- **File sync service (Dropbox/Drive)**: chunk large files instead of
  moving the whole file on every small edit; S3-backed storage +
  CDN for delivery (ties directly to your File Storage bullet in the main
  cheat sheet); conflict resolution when two devices edit offline is the
  advanced follow-up.
- **Booking / ticket system (avoid double-booking)**: the trick is
  **concurrency control** — a database transaction with row-level locking,
  or an idempotency key on the booking request, so two simultaneous
  requests for the same seat/slot can't both succeed.

## Payments

- **Payment processing**: **idempotency keys** on every payment request
  (so a retried request after a timeout doesn't double-charge), plus
  webhook-driven confirmation since payment providers settle
  asynchronously — don't assume the initial API call is the final word.

## Architecture & consistency fundamentals

- **Monolith vs. microservices**: monolith = one codebase/deployable/DB —
  simple to build, real ACID transactions, low ops overhead, but scaling
  is all-or-nothing and one bad deploy risks everything. Microservices =
  independent services over the network — scale only what needs it,
  independent deploys, fault isolation — but heavy operational cost
  (service discovery, network calls that can fail where a function call
  used to just work, no single transaction across services, needs
  eventual-consistency patterns like sagas). **Practical answer**:
  monolith for MVP, structured as a "modular monolith" so pieces are
  extractable later; the common early exception is pulling out something
  with a genuinely different scaling profile (e.g. an AI worker/queue)
  while everything else stays monolithic — matches the AI integration
  bullet in the main cheat sheet.

- **Sync vs. async**: sync = caller blocks until it gets a response — fine
  for fast/predictable work, bad for slow/unpredictable work (ties up the
  connection, causes timeouts/poor UX). Async = caller doesn't wait, finds
  out the result later via polling/webhook/websocket, or work runs via a
  queue/worker — doesn't block the caller, but adds complexity (need a
  notify mechanism, need to handle duplicate/out-of-order processing).
  **When to choose**: sync for fast, predictable reads/writes; async for
  anything slow or unpredictable — exactly why the cheat sheet says never
  call an LLM synchronously inside the request/response cycle.

- **CAP theorem**: Consistency, Availability, Partition tolerance. Since
  network partitions are inevitable in any real distributed system, the
  practical choice is **CP vs. AP** when one happens. CP (sacrifice
  availability): clustered relational DBs, Zookeeper/etcd — return an
  error rather than serve possibly-stale data. AP (sacrifice consistency):
  DynamoDB, Cassandra — always responds, data might be briefly stale,
  resolved via eventual consistency. **Practical framing**: most real
  systems tune this per operation, not globally — e.g. "a like count
  being a second stale is fine (favor availability), but inventory or
  payments need strong consistency, even if that means rejecting a
  request during a partition rather than risk double-selling an item."

## Common bugs/gotchas worth naming unprompted

- **N+1 query problem**: fetch N parent records (1 query), then loop over
  them fetching each one's related data separately (N more queries) — N+1
  total instead of 1-2. E.g. 100 posts (1 query) + querying each post's
  author individually in a loop (100 more queries) = 101 queries instead
  of a couple. **Fix**: eager loading / joins — fetch related data upfront
  in a single query (a `JOIN`, or the ORM's eager-load feature — Prisma's
  `include`, Django's `select_related`) instead of lazy-loading each
  relation inside a loop. Worth naming unprompted whenever describing any
  data-fetching code with nested relations.

## How this maps to Sierra's actual format

Given the confirmed hybrid format — a founder-scoping conversation, not a
bare "design Twitter at scale" prompt — these are more likely to surface
as **one feature embedded inside a SaaS founder pitch** than as a
standalone classic question. E.g. Scenario A (Support Triage Copilot,
[[coding-round]]) could naturally need a live dashboard → WebSocket vs.
polling insight applies directly. Treat this list as pattern-recognition
insurance to weave into a scenario answer when it fits, not a separate
question format to prep for in isolation.
