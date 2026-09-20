# RAG and prompt engineering

Originally researched for a specific interview round, generalized into a
reference for any AI-adjacent interview or founder-pitch scenario, not
company-specific.

## RAG (Retrieval-Augmented Generation)

Don't rely on the model's parametric memory alone — retrieve relevant
external data at query time and inject it into the prompt.

Pipeline: ingest docs → chunk → embed → store in a vector DB (pgvector,
Pinecone, Weaviate, Qdrant) → embed the user query → similarity search
(top-k) → optionally rerank → stuff into context → model answers grounded
in the retrieved data, ideally with citations.

Why: cuts hallucination, supports private/fresh data without retraining,
far cheaper than fine-tuning for knowledge injection, gives traceability.

Advanced variants worth naming if pushed: hybrid search (BM25 + vector),
cross-encoder reranking, query rewriting, agentic RAG (model decides when/
what to retrieve instead of always retrieving).

## Writing effective prompts

- Be specific about task, format, constraints — ambiguity gets filled with
  assumptions you don't control.
- Separate system prompt (stable rules/persona) from user/context (dynamic
  content).
- Demand explicit output format when code will parse the response (e.g. JSON
  matching a schema) — pairs with the Zod/Pydantic validation point in
  [[architecture-cheatsheet]].
- Break complex asks into steps rather than one large request.
- Few-shot examples when format matters more than description would convey.
- For tool-calling/agentic prompts: describe each tool clearly (when to use,
  params), avoid overloading with too many tools at once — measured
  first-hand in `local-llm-lab`: smaller models degrade with excess
  tools/instruction density.
- Treat prompts like code: version them, test against real examples, iterate
  from observed failures, not guesswork.
