# Experience bank

Raw material for every resume. Each role holds all its bullet variants; pivots
and tailored resumes draw from here. Keep the truth here; shape it in the resumes.

> Rule: new/rewritten bullets are co-written with you and passed through
> `research/tropes.md` before landing in any resume.

---

## How to use this file

This is the *source of truth* for your career facts — not the polished,
audience-tuned version (that's what `resumes/` is for). Write in long form
here, with dates, numbers, and context, even messy or uncertain. When a fact
is uncertain or needs verification, say so explicitly (e.g. "confirm exact
dates before submitting a form that requires them") — don't let an unverified
guess quietly become a resume claim.

Suggested structure per role:

```
## Company — Title (Month Year – Month Year)

- **Where:** City, Country (remote/hybrid/onsite) · **When:** dates
- **Focus:** one or two sentences on what the role covered.

### A specific achievement, with numbers
- What the problem/opportunity was.
- What you actually did (be concrete — tools, decisions, tradeoffs).
- The measurable outcome, if you have one. If you don't have a number, say so
  rather than inventing one — "no hours-saved figure was tracked" is an honest
  and usable answer.

### A hard problem you solved (or didn't fully solve)
- Good interview material doesn't need a clean happy ending. An honest
  "we mitigated it but never found the root cause" story, told with the
  investigation steps, is often stronger than a tidy fabricated resolution.
```

## Education

### [University] — [Degree], [Field]

- **Period:** [Month Year] - [Month Year]
- **GPA / academic record:** [figure + scale, and which scale a US-style
  application should map it to if your country's system differs]

## [Company Name] — [Your Title]

- **Where:** [City, Country] (remote/hybrid/onsite) · **When:** [Month Year] – [Month Year]
- **Focus:** [one or two sentences: domain, stack, what you owned]

### [A flagship project or achievement]

- What it was, why it mattered, what you specifically did.
- Numbers if you have them (%, req/day, uptime, cost, time saved).
- Links to public evidence if any exist (announcement posts, docs, PRs) —
  these are the strongest, most verifiable resume citations.

### [Extra technical detail worth keeping on file]

- Deeper context you might need for a follow-up interview question but that
  doesn't belong in the headline resume bullet.

### [A hard/unsolved problem — good debugging story material]

- **Symptom:** what broke, how it was noticed.
- **Investigation:** what you tried, what you ruled out.
- **Mitigation vs. root cause:** be honest about which one you actually
  achieved. "We protected the customer but never found the root cause" is a
  legitimate and often more credible answer than a fabricated resolution.
- **Lesson:** what you'd do differently, or what this taught you about the
  system/process.

### Extra tech / ways of working

- Tools, languages, and practices worth keeping as a running list so you're
  not re-deriving your own stack from memory during a screening call.
- Note confidence level per claim (e.g. "~5 years, general use, not deep on
  the specific sub-feature X" vs. "daily driver for 3 years") — recruiters and
  interviewers will drill into specifics, and a vague inflated claim costs
  more credibility than an honest scoped one.

### Client/employer-naming policy

- Decide up front: which relationships are public/citable by name (e.g.
  a client that publicly announced the work and credited you or your team),
  and which should stay generic ("a fintech client", "a logistics platform")
  out of confidentiality or NDA obligations. Keep this decision documented
  here so you don't accidentally leak a confidential client name into a
  résumé or cover letter later.

### Skill-years snapshot

Keep a running, self-reported list of years-of-experience per skill so you
have one place to pull an honest number from instead of re-deriving it under
pressure in a recruiter screen. Update it whenever a screen forces you to
state a number.

```
TypeScript Xy · Node Xy · [language] Xy · [framework] Xy · [database] Xy ·
[cloud provider] Xy · [tool] Xy · ...
```

---

## Personal projects / self-directed skills (not tied to any employer)

Side projects, freelance work, and self-taught skills that don't fit under an
employer entry but are still real, citable experience — mark clearly whether
each one shipped to production/users or stayed a learning exercise, and don't
inflate scope.

### [Project name]

- What it was, who it served (or "personal learning project, not shipped"),
  what you built, what you'd change if you rebuilt it today.

---

## Security / secrets practices (if relevant to your target roles)

Many senior/staff screens ask directly about credential handling, access
control, and incident response. Keep an honest inventory — including the
gaps — rather than a sanitized version. Interviewers generally respect a
candidate who names their own weak points and what they'd fix first over one
who claims a spotless setup.

| Practice | Reality |
|---|---|
| Credential storage | |
| Cloud access model | |
| MFA | |
| Key rotation | |
| CI/CD secrets | |
| Infra access | |
| Manual deploys | |
| Access audit cadence | |

**What you'd change first:** [your own honest read]

## Self-assessment

Keep an honest, numbered self-assessment (e.g. backend 8/10, frontend 6/10)
with the reasoning behind each number — it's useful raw material for
"describe your strengths and weaknesses" questions and keeps your framing
consistent across applications instead of improvising a new answer each time.

## Tracking gaps honestly

If you have a confirmed **zero** in some area recruiters keep asking about
(a technology, a domain, a certification), write it down explicitly here so
future-you doesn't accidentally claim adjacent experience as if it were the
real thing. An honest "I haven't done X, but here's the closest adjacent
thing I have done" answer is more credible than a stretch.
