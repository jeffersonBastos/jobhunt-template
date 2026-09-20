# AI: build vs. buy, and open-source provider landscape

Originally researched for a specific interview round, generalized into a
durable reference. **Caveat**: the specific model names/benchmarks below
came from a live web search at the time — verify freshness before quoting
exact numbers in any future interview, this space moves fast.

## Build own AI vs. paid API — and which to pick

Default for founder/MVP stage: **start with a paid frontier API.** Same
decision axis as the hosting point in [[architecture-cheatsheet]] —
optimize for speed to validation, not cost, before committing infra/capex
to an unproven idea.

Consider self-hosting/open models when:
- Cost becomes the dominant line item AND usage is high-volume and
  **predictable** (not bursty) — same predictability axis as hosting.
- Privacy/compliance requires data to never leave your infra.
- Extreme latency requirements need local inference control.
- Deep fine-tuning/customization a general API won't provide.

**Strongest personal angle here**: `local-llm-lab` already measured this
trade-off directly, not theoretically — open models run local are viable
for narrow, well-defined tasks with the right infra (correct chat template,
correct runtime), but break down on general agentic tasks requiring
reliable tool-calling. Real data beats "it depends" as an answer.

## Open-source LLM options vs. closed frontier (Anthropic/OpenAI/Google)

No absolute "better" — depends on the axis, say so explicitly rather than
giving a dogmatic answer.

**Open models that closed much of the gap to closed frontier (as of
mid-2026, re-verify before quoting exact benchmark numbers):**
- **Qwen3-Coder-480B** (Apache-2.0) — strong specifically on coding/SWE-bench,
  permissive license.
- **Kimi K2.6** (Moonshot) — tops neutral open-model rankings.
- **DeepSeek V4 Pro** — leads agentic coding, close to closed frontier on
  SWE-Bench.
- **GLM-5.1** — also near the top for coding.

These win or tie on *specific* coding/agentic benchmarks, not general
reasoning/reliability across the board — closed models (Claude/GPT/Gemini)
are still the safer default for broad reliability.

**Inference providers for open models (not model owners):**
- **Groq** — lowest latency (custom LPU hardware), predictable linear pricing.
- **DeepInfra** — lowest cost per token, best pure-cost pick.
- **Together AI** — largest open-model catalog (200+), best for variety.
- **Fireworks AI** — pricier, enterprise reliability/performance, strong
  structured-output support.
- **OpenRouter** — single endpoint across GPT/Claude/Llama/DeepSeek — pairs
  directly with the "thin abstraction layer over the model provider" point
  in [[architecture-cheatsheet]].

Honest interview answer if asked "would you use one of these instead of
Anthropic": not ideological — depends on the axis that matters for the
project. High-volume predictable cost or self-host requirement → open model
via Together/DeepInfra. General reliability, lower operational risk →
start with a closed frontier model, migrate narrow, validated slices to
open models later.
