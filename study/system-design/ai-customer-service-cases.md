# AI customer-service system design cases

A set of system-design cases for the customer-communication/customer-service
GenAI role shape — chatbots, ticket routing, agent-assist, and the internal
service integrations that come with them. Each case has the one non-obvious
insight and the follow-up probes an interviewer would likely push on. Useful
prep for any generative-AI-platform round; keep your own notes on a specific
company's stack in that company's file under `interviews/prep/<company>/`.

## 1. Support chatbot answering from an internal knowledge base (RAG)

**Most likely prompt shape for this round**, given the JD names both
"chatbots" and "content management systems" explicitly.

- **Core flow**: customer question → retrieve relevant docs (embed the
  query, similarity search in a vector DB) → build a prompt with the
  retrieved context + the question → call the LLM → return the answer.
- **The one non-obvious insight**: the knowledge base is a **content
  pipeline, not a static file** — someone edits an FAQ/policy doc, and that
  change has to reach the chatbot's answers. That's an async job (queue →
  re-embed → upsert into the vector index), and it needs **cache/answer
  invalidation** so the chatbot doesn't keep citing an outdated policy
  after it changed.
- **Likely follow-ups**: what happens when retrieval finds nothing
  relevant (answer "I don't know" / escalate to a human, never let the LLM
  guess); how do you know the answer was actually correct (an eval set of
  known question→expected-answer pairs, run against the pipeline before
  and after any prompt/model change — same idea as a regression test
  suite); how do you handle a customer asking something the docs
  contradict on different pages.

## 2. Ticket triage / routing

Customer message comes in (chat, email, form) → needs to reach the right
queue/team, possibly with urgency ranked.

- **The one non-obvious insight**: classification (which team, how urgent)
  can run **async, off the customer-facing path** — the customer doesn't
  need to wait for the LLM call to route the ticket; show them "we got it"
  immediately, then a worker classifies and routes in the background a
  second later.
- **Likely follow-ups**: what if the classifier is wrong (a human-correction
  feedback loop, ideally logged for future fine-tuning/prompt iteration);
  how to prioritize (e.g. a payment-outage complaint from many customers at
  once vs. a single low-urgency question) — this is a queue-with-priority-
  levels problem, not a flat FIFO queue.

## 3. Multi-channel unification (webchat + WhatsApp + email + phone)

A customer's conversation needs to look like **one thread** regardless of
which channel they used, and possibly hop channels mid-conversation.

- **The one non-obvious insight**: each channel needs its own **adapter**
  normalizing its message format into one internal representation, so the
  core orchestration/AI logic is written once and doesn't know or care
  which channel it's talking to. Identity resolution (matching "this
  WhatsApp number" and "this email" to the same customer) is the hard,
  often-skipped part.
- **Likely follow-ups**: what if a customer switches from chat to phone
  mid-issue (context/history needs to carry over — a shared conversation
  store keyed by customer ID, not by channel); rate limits or behavior
  differences per channel (WhatsApp Business API has its own rules/quotas
  distinct from a web widget).

## 4. Agent-assist (AI suggests replies to a human agent, doesn't send them)

Common enterprise pattern: the AI drafts a reply, a human reviews/edits/
approves before it goes to the customer.

- **The one non-obvious insight**: this changes the latency requirement
  (the human is in the loop anyway, so a 1-2s suggestion latency is
  fine — no need to over-optimize for real-time) but raises a different
  bar: the suggestion has to be **editable and clearly marked as a
  draft**, and the system needs to log whether the agent accepted,
  edited, or ignored it — that signal is the feedback loop for improving
  prompts/retrieval over time, and it's also the safety net that makes
  "AI could be wrong" acceptable, since a human always has final say.
- **Likely follow-ups**: how would you eventually decide it's safe to
  let some categories of reply auto-send without a human — probably a
  confidence threshold plus tracking the human-edit rate per category over
  time as the trust signal, not a one-time decision.

## 5. Guardrails / preventing bad answers from reaching a customer

Cross-cutting concern likely to come up as a follow-up on any of the above,
not necessarily its own standalone prompt.

- **The one non-obvious insight**: guardrails belong at **two points**, not
  one — before the call (validate/sanitize the retrieved context and the
  prompt) and after the call (validate the LLM's output against constraints
  — e.g. never state a specific account balance/legal claim without a
  verified data lookup, refuse instead of guessing). Treating "ask the LLM
  nicely to be careful" as sufficient is the wrong answer.
- **Likely follow-ups**: how do you catch regressions when you change the
  prompt or swap models (a golden eval set run on every change, same
  instinct as the RAG case above); what's the fallback when guardrails
  reject an answer (escalate to a human, don't just show an error to the
  customer).

## 6. Handling a traffic spike (e.g. an outage causing a wave of complaints)

- **The one non-obvious insight**: this is a **queueing + prioritization**
  problem more than a raw-scale problem — the AI triage layer becomes the
  thing that keeps the human team from being overwhelmed, by auto-
  answering the easy/repeated questions ("is the outage known? when will
  it be fixed?") and surfacing only the genuinely novel/urgent ones to
  humans.
- **Likely follow-ups**: what if the AI itself gets overwhelmed (rate
  limit/queue depth alerting, and a plan to degrade to "acknowledge and
  queue" rather than silently dropping requests).

## Common thread across all of these (say this explicitly if it fits)

Every one of these reduces to the same shape: **synchronous customer-facing
path stays fast and simple** (ack, or a direct answer when confidence is
high), while **classification/enrichment/heavy AI work happens async** where
possible, with **a human or a guardrail as the safety net** wherever a wrong
answer has real cost. That's also the throughline back to
`architecture-cheatsheet.md`'s AI-integration bullet ("don't call the LLM
synchronously inside the request/response cycle for anything non-trivial").

## Personal material to draw on if a case gets concrete

If you have real project experience that maps to any case above, keep short
notes here — e.g. an MCP/agent-integration build, a RAG proof-of-concept, or
a production incident whose root cause maps to one of the "likely follow-up"
questions. Concrete, quantified, verifiable examples beat abstract answers
every time; this section is just a reminder to keep them close at hand
before the round, not to draft them fresh under pressure.
