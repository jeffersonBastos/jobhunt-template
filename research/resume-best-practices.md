---
title: Resume best practices — evidence-based framework (Senior Backend + Web3)
created: 2026-07-02
updated: 2026-07-02
tags: [research, resume, ats, web3, hiring]
purpose: Input for the `resume-tailor` skill. Principles + reasoning + trade-offs.
status: >-
  Synthesized from an interrupted deep-research run (23 sources, 98 claims, 25
  adversarially verified before the run hit a session limit). The final merge
  step did not run, so this synthesis was written by hand from the verified
  claims + the extracted-but-unverified claims. Verification tags below.
---

# Resume best practices — Senior Backend Engineer targeting Web3 + Web2 (US/EU remote)

**Verification legend**
- `[✓]` — adversarially confirmed in the research run (≥2 of 3 skeptics failed to refute).
- `[~]` — extracted from a credible source but **not** adversarially verified (the run
  was interrupted before its vote). Treat as plausible, not proven.
- `[✗]` — **refuted as literally stated** in the run; the nuance is explained inline.

> The point of this file is not a checklist — it's the reasoning. When it feeds the
> `resume-tailor` skill, the *why* is what lets us adapt per role instead of applying
> generic rules.

---

## TL;DR — the operating principles

1. **Impact over responsibility, every bullet.** Pair a concrete result with a number
   and the action that produced it (the X-Y-Z formula). `[✓]`
2. **Senior = scope, not a "leadership" word-count.** Show ownership of whole
   subsystems and technical judgment, not invented mentorship lines. `[✗ / nuance]`
3. **One page is a heuristic, not a law.** Optimize signal density; 2 pages is fine
   for a senior with real depth. `[~ contested — see §1]`
4. **ATS is real but dumber than the myths.** The two highest-leverage keyword moves
   are the **exact target job title** and a **keyword-aligned skills section** — not
   mirroring the whole JD. `[~ / ✗ nuance]`
5. **Web3 rewards proof-of-work.** Public GitHub, deployed/live protocol work, docs,
   and real protocol names carry more weight than in Web2. `[~]`
6. **But you are backend/data infra, not a Solidity auditor.** For infra roles, crypto
   companies value transferable high-scale/reliability experience and do **not**
   require prior crypto experience. Lean into that. `[✓]`

---

## 1. Structure & length

- **The classic rule** (Google / Laszlo Bock): *one page per ten years of experience*;
  brevity is itself a signal of prioritization ability. `[✓]`
- **The contrarian, more current view** (scale.jobs, 2026): major ATS do **not** score
  on page count; ~54% of hiring managers now accept/prefer two pages. What matters is
  **signal density** — relevance of keywords and achievements per line. `[~]`
- **Resolution / trade-off:** for a 6-year candidate, **one page is still the safer
  default** — it forces ruthless editing and reads as senior confidence. Go to two
  pages only when the second page is *all* high-signal (it usually isn't). Never pad.
- **Summary, not objective:** replace any "career objective" with a 2–3 line
  qualifications summary spotlighting your most marketable facts. Drop it only if space
  is tight. `[~]`
- **Section order (Web2 default):** Header → Summary → Experience → Skills → Education.
  Skills near the top only if the ATS/skills-filter concern is high for that employer.

## 2. Senior vs mid-level

- **The refuted framing:** "senior = led a team of 12 + mentored 5 juniors." Stated as
  *the* differentiator, this was **refuted** `[✗]`. Mentorship lines are weak signal and
  can read as filler (or drift into staff/manager territory you're not claiming).
- **The real differentiator: scope.** Mid-level owns *features*; senior owns *major
  subsystems*, makes tradeoff decisions, and drives technical quality across a system. `[~]`
- **Implication:** frame **end-to-end ownership**, not people-management, if that's your real scope.
  "Owned the entire backend/data layer for a multichain lending protocol" *is* the
  senior signal. Decisions, reliability, correctness, cost — not headcount.

## 3. Writing bullets (the core skill)

- **X-Y-Z formula** (Google): *"Accomplished [X] as measured by [Y], by doing [Z]."*
  Every bullet pairs an accomplishment + a quantified measure + the method. `[✓]`
- **Purpose:** shift from *duties* ("responsible for maintaining the API") to
  *accomplishments* ("cut p95 latency 40% by introducing a caching layer"). `[✓]`
- **Quantify impact** with %, counts, $, time, or scale — even indirect proxies
  (req/day, # chains, # records, infra cost). `[✓ / ~]`
- **Strong lead verbs, past tense, no first-person pronouns.** One line each where
  possible; lead with the result, not the technology.
- **Example of quantifiable material worth foregrounding** (verify each before use):
  throughput numbers, a defect caught pre-launch, a cost-reduction percentage, scale
  metrics, funding/grant approvals. Replace with your own real numbers from
  `profile/experience-bank.md`.

## 4. ATS & keywords — separate signal from myth

- **Do:** put the **exact target job title** on the resume (e.g., "Backend Engineer",
  "Protocol Engineer"). One source claims resumes containing the target title got
  **10.6× more interviews**, and ~55% of recruiters filter by title. `[~ unverified —
  treat the multiplier as illustrative, the direction as sound]`
- **Do:** maintain a **keyword-rich skills section** aligned to the JD's hard skills —
  skills is reportedly the most-used recruiter filter. `[~]`
- **Don't over-rotate:** the blanket claim "tailor by mirroring the JD's language" was
  **refuted as stated** `[✗]`. Keyword *alignment* helps; mechanical mirroring/stuffing
  does not, and reads as inauthentic to the human who screens after the ATS.
- **Format for parsing:** single column *for the ATS copy*, standard headings, no text
  in images/tables, real text (not a flattened graphic).
  - ⚠️ **Note on our build:** the template renders a two-column PDF. Two-column layouts
    can confuse some ATS parsers. **Decision needed** — either (a) keep the designed
    two-column PDF for humans + generate a **single-column ATS-safe variant** from the
    same markdown for upload, or (b) restructure the template to a parse-safe single
    column. This is a concrete follow-up (see §9).

## 5. GitHub / portfolio / proof-of-work

- **Seniority changes the weight.** Junior: GitHub proves you can code. Senior: nobody
  reads your repos to check competence — link **selectively** to signal *what kind* of
  engineer you are (curated projects, not a raw profile dump). `[~]`
- **Link, don't dump.** A tidy profile README + 2–3 pinned, relevant repos beats a wall
  of abandoned forks. Dead/empty profiles are worse than no link.
- **What counts as proof:** deployed and still-running projects, published packages,
  docs you wrote, client sites, conference talks, technical articles — anything a
  stranger can verify without you.

## 6. Project-first vs company-first ordering

- **Company-first (reverse-chronological) is the default** and what recruiters/ATS
  expect for experienced hires. Deviating raises "what are they hiding?" questions.
- **Project-first** helps mainly when your work history is thin/non-linear, or when the
  *projects* are the credential (common in Web3 for self-taught/independent builders).
- **Company-first works well** for a clean, senior, name-brand-adjacent history.
  Optionally add a compact **"Selected Projects / Open Source"** block *below*
  experience for a domain-specific pivot, if you have public proof-of-work worth citing.

## 7. Web3 vs Web2 — where the advice genuinely diverges

This is the section that matters most for the two pivots.

- **Proof-of-work culture.** Multiple Web3 sources converge: "your resume doesn't get
  you hired in crypto — your work does." Crypto teams expect visible GitHub, deployed
  contracts, on-chain activity, protocol/governance/hackathon participation as
  *verifiable* signal, and treat a bare Web2-style resume as insufficient. `[~]`
- **Referrals dominate.** A large share of Web3 roles fill through networks/referrals;
  a warm intro can outweigh a strong resume. (Argues for the later LinkedIn/network
  phase of this project.) `[~]`
- **The crucial nuance (a16z crypto) — don't overcorrect.** Blockchain-native expertise
  is essential mainly for **smart-contract/protocol-security** roles, where one bug =
  catastrophic loss. For **most other roles (infra, backend, data, tooling), prior
  crypto experience is often not required**, and teams actively value engineers who
  "built products used by millions" and "kept systems up under extreme load." `[✓]`
- **If this describes your own pivot:** a strong backend/reliability engineer *with real
  domain-specific data-infra experience* is in the sweet spot the a16z piece describes.
  Consider:
  - Foreground **the real protocol/client names you've actually worked with** and
    concrete on-chain/data work (subgraphs, real-time pricing feeds, multichain,
    points-pipeline correctness, grants) — name what you're actually credited on.
  - Add **verifiable proof** (GitHub, any public subgraphs/docs/PRs, deployed
    endpoints) — the Web3 differentiator you currently lack on paper.
  - **Don't** fabricate Solidity/audit/governance signals you don't have. Lead with
    transferable high-SLA reliability + genuine DeFi infra. That's a coherent, honest,
    competitive story.
- **Web2 pivot** stays conventional: reverse-chron, impact bullets, ATS-clean, your
  highest-throughput API work as the anchor of reliability-at-scale.

## 8. Common mistakes (consolidated)

- Duties instead of accomplishments; no numbers.
- Buzzword/keyword stuffing that a human immediately discounts.
- Two-column PDFs uploaded to ATS that parse them into garble (see §4).
- Generic one-size resume sent everywhere (vs. a pivot chosen per role).
- Dead GitHub links / listing a profile with nothing pinned.
- Inflating into leadership/mentorship claims to "look senior" instead of showing scope.
- Length padding; a weak second page dilutes a strong first.

## 9. Concrete follow-ups for this project

1. **ATS-safe variant:** decide (a) dual output (designed 2-col PDF + single-col ATS
   PDF from the same markdown) vs (b) single-col template. Recommend (a).
2. **Proof-of-work assets:** curate your GitHub (pin relevant public work, write a
   profile README) so a domain-specific pivot can link real proof.
3. **Per-role keyword map:** the `resume-tailor` skill should extract the JD's exact
   title + hard-skill keywords and check the chosen pivot covers them — *aligned, not
   stuffed*.
4. **When credits reset:** optionally re-run the interrupted verification pass to
   confirm the `[~]` claims (esp. the 10.6× title stat and the two-page/ATS claims),
   and pull 2–3 more primary sources (real DeFi job posts, an engineering hiring
   manager's own write-up) to harden §7.

---

## Sources

Quality tags are the run's own assessment. `primary` = practitioner/hiring-manager
voice; `secondary` = reputable outlet; `blog` = useful but weigh critically.

- `[primary]` a16z crypto — *Hiring in crypto: when blockchain experience is essential — and when it's not* — https://a16zcrypto.com/posts/article/hiring-in-crypto/
- `[secondary]` Inc. — *Google recruiters' X-Y-Z formula* (Laszlo Bock / "Work Rules!") — https://www.inc.com/bill-murphy-jr/google-recruiters-say-these-5-resume-tips-including-x-y-z-formula-will-improve-your-odds-of-getting-hired-at-google.html
- `[secondary]` ResumeWorded — *Senior Software Engineer resume example* — https://resumeworded.com/senior-software-engineer-resume-example
- `[secondary]` IEEE — *Resume tips for mid-to-senior engineers* — https://innovationatwork.ieee.org/5-get-noticed-resume-writing-tips-for-mid-to-senior-level-engineers/
- `[secondary]` CCN — *Web3 job search: Owen Healy on crypto hiring* — https://www.ccn.com/education/crypto/web3-job-search-owen-healy-crypto-hiring-tips/
- `[blog]` scale.jobs — *One-page vs two-page resume: what ATS prefers in 2026* — https://scale.jobs/blog/one-page-vs-two-page-resume-ats-preferences
- `[blog]` Cyfrin — *How to get a job as a blockchain developer* — https://www.cyfrin.io/blog/how-to-get-a-job-as-a-blockchain-developer-in-depth-guide
- `[blog]` Jobscan — *ATS resume* / *top resume keywords* — https://www.jobscan.co/blog/ats-resume/ · https://www.jobscan.co/blog/top-resume-keywords-boost-resume/
- `[blog]` Plexus — *Ultimate guide to a Web3 CV* — https://plexusrs.com/the-ultimate-guide-to-creating-a-web3-cv/
- `[blog]` HashtagWeb3 — *Web3 resume / portfolio guides* — https://hashtagweb3.com/how-to-build-a-web3-resume-that-stands-out · https://hashtagweb3.com/building-web3-portfolio
- `[blog]` Enhancv — *GitHub on resume* — https://enhancv.com/blog/github-on-resume/
- `[blog]` Blockchain Council — *Portfolio-first tech hiring* — https://www.blockchain-council.org/career-advice/portfolio-first-tech-hiring-projects-github-proof-resume-interviews/
- `[blog]` Art of Blockchain — *Blockchain developer resume masterclass 2025* — https://artofblockchain.club/article/blockchain-developer-resume-masterclass-2025-the-complete-guide-for-every-web3-job
- `[blog]` Observability Guy (Medium) — *Mid vs senior vs staff vs principal* — https://observabilityguy.medium.com/the-real-difference-between-mid-level-senior-staff-and-principal-engineers-3c149c33a929
- `[blog]` CryptoRecruit — *What it takes to get hired in crypto in 2026* — https://www.cryptorecruit.com/news/what-it-takes-to-get-hired-in-crypto-in-2026/
