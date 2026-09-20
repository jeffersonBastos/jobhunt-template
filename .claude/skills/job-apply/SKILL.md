---
name: job-apply
description: Draft answers to job-application screening questions for postings tracked in this repo. Use when the user pastes an application-form question — with or without naming the job — while filling out a job application (Gupy, Ashby, LinkedIn Easy Apply, etc). They'll typically just name the company/role from a scouting report and expect the posting to be looked up, the real JD fetched, and a tailored, honest, tropes-filtered answer produced in the right language and within any stated character limit.
---

# job-apply — draft an application-screening-question answer

The user pastes application questions one at a time as they fill out a form
and expects a ready-to-paste answer, not a discussion.

## Where things live (all relative to this repo's root)

- `scouting/reports/<date>.md` — one-line-per-posting match summaries + link.
  This is the entry point ("it's the posting from the 2026-07-23 report", or
  just a company name) — it is NOT the job description, just a pointer to one.
- `profile/experience-bank.md` — the source of truth for every real, confirmed
  fact about the user's work. If it's not here (or in `narrative.md`), treat
  it as unconfirmed.
- `profile/narrative.md` — positioning, target markets, headline options.
- `resumes/<pivot>/` (each `en.md`/`pt.md` where it exists) — already-tailored
  language per pivot. Match whichever pivot's framing fits the JD instead of
  writing from scratch.
- `answers/bank.md` — reusable answers to repetitive questions (bio,
  why-this-role, logistics, behavioral). Check it first; add good new answers
  back to it.
- `research/tropes.md` — the AI-writing-tropes-to-avoid reference. Run every
  answer through this before presenting it.
- `applications/<company-role-slug>/` — per-job folder (job-posting.md +
  answers.md), created by this repo's own `job-scout` skill once the user
  actually applies (`node scout.js apply <url>`, or them saying "applied" +
  a link). Not this skill's job to create — that belongs to
  `.claude/skills/job-scout/SKILL.md`. If they're clearly mid-application, you
  may mention that pointer, but don't create the folder unprompted.

## Recurring platform-specific questions (shorthand)

Some platforms (e.g. Gupy) repeat the exact same closing screening questions
across every posting. Once you've confirmed the exact wording and character
limit for a platform from a real posting, you can shortcut it: if the user
says something like "the usual two" or otherwise implies the standard closing
questions without pasting them — for a job they name on a posting from that
platform — answer both without asking them to repaste the text, as long as
you're confident the platform's questions really are stable across postings
(confirm from the actual form if a specific application shows anything
different — never assume a cached version is still current).

If the user only names the company/role with no question text at all, still
follow the full procedure below (find posting → fetch JD) before drafting.

## Fit-check gate for weak-match postings (run before drafting anything)

Before drafting anything for a posting, identify the requirement the JD
itself emphasizes most (first-listed in "Required Experience," called out as
the single most important requirement, or the thing the summary paragraph
centers on) and check it against `experience-bank.md`:

- **Real, even if thin, coverage exists** (a personal project, an adjacent
  tool, transferable scope) → proceed normally, note the gap's real depth
  honestly per the no-fabrication rule below, no need to stop and ask.
- **Zero adjacency** (nothing in the bank touches the domain at all) → stop
  and tell the user directly what the gap is and how central it is to the
  posting, *before* drafting. Let them decide whether to proceed; if they do,
  be direct about the gap in whichever question gives it a natural home
  rather than dressing it up across every answer.

A gap with a bridge (adjacent tool, personal-project scope, general pattern
that transfers) is worth applying through and being honest about. A gap with
no bridge at all, especially on the posting's own named top requirement,
costs credibility with a human reviewer for close to zero expected upside,
and deserves a real "do you still want to apply" checkpoint, not just an
honesty footnote after the fact.

## Procedure

1. **Find the posting.** If the user pastes the full report block (title +
   link + "Matched: ..." line), use it directly — no need to search. If they
   only name a company/role, grep across *all* files in `scouting/reports/*.md`
   (not just the most recent one — older postings are still valid). If more
   than one candidate matches, or nothing matches, ask which one (or for the
   direct link) — never guess which posting they mean.

2. **Fetch the real job description.** The report line is a one-sentence
   match summary, not the actual posting. Always fetch the job's own link to
   pull the real responsibilities, required stack, seniority framing, and any
   team/challenge description before drafting anything — this is the single
   highest-value step, since report summaries are consistently too thin to
   tailor against.

3. **Detect the answer language — check this explicitly before drafting, not
   just as background awareness.** Primary signal: the literal language the
   question itself is written in. Secondary signal: the posting's own
   language/location. If the JD or the question is in a different language
   than your default, or the posting is international, draft directly in that
   language — don't write one draft and translate it. Invoke the `writing`
   skill for that language's pass (tropes-filtered, natural, no stiff
   corporate register) since that's what actually goes in the form.

4. **Never fabricate a factual claim. This is the one non-negotiable rule.**
   If a screening question asserts something specific ("have you shipped X to
   production", "N years with Y", "describe a time you...") and it is not
   clearly confirmed in `experience-bank.md` / `narrative.md`, stop and ask
   the user directly (a clarifying question, not a guess) rather than
   inventing or stretching a fact. A fabricated claim here is something they'd
   have to defend live in an interview. This extends to motivation, not just
   facts: don't invent a stated desire or "I've always wanted to" to make a
   past experience connect to a posting — describe what the past work was and
   what they liked about it, then let the motivation actually stated carry
   the "why now." If a correction updates a previously-recorded fact, update
   `experience-bank.md` (and any resume bullet repeating the wrong version)
   before moving on — don't just fix the one answer and leave the source
   stale.

5. **Respect stated limits exactly.** Forms often cap length ("Max. 1,000
   characters"). Count the actual character length of the drafted answer
   (don't estimate) and report it back, e.g. "994 / 1,000 characters."

6. **Never use markdown link syntax `[text](url)` in a drafted answer.** If
   the user copy-pastes answers out of a terminal into the application form,
   a terminal copy of rendered markdown can grab the visible link text only
   and lose the URL. Write the raw URL inline instead, either bare in
   parentheses right after the reference or as its own trailing line, but
   never hide it behind link text.

7. **For "pick up to N skills from this list" questions:** map the JD's
   explicitly-named requirements onto the user's registered skill checklist.
   Prefer terms that appear verbatim in the JD over generic filler. Don't pick
   two skills that signal the same thing redundantly — pick one, use the
   freed slot for something the JD names that the other doesn't cover. State
   the pick with a one-sentence rationale and name one swappable alternative.

8. **Write in the user's authentic voice, tropes-filtered.** No em-dash
   addiction, no "it's not X, it's Y", no rhetorical question-then-answer, no
   bold-bullet spam in prose answers, no emoji, no grandiose stakes, no
   AI-sounding filler ("I'm passionate about...", "I'd love the opportunity
   to..."). Ground every sentence in a real fact from `experience-bank.md`,
   not a generic platitude. See `research/tropes.md` for the full list.
   **Before presenting a draft, re-scan it specifically for em-dashes** ("—")
   and replace with a period, comma, or "..." — treat this as a mandatory
   final pass, not just a style guideline to keep in mind.
   **Hedge confident claims, don't declare them.** Prefer "seems like a good
   fit," "would likely," "comfortable moving independently" over "is a good
   fit," "would be the same," "doesn't need anyone standing behind them."
   Declarative certainty about one's own fit or competence reads as
   overselling; a measured, slightly understated tone reads as more credible.
   This extends to how a client's own codebase/product gets described: "needs
   some cleanup" lands better than "messy, unstable" — don't editorialize
   negatively on something the client owns, even when quoting the JD's own
   framing of it. For a multi-part pitch, break it into short paragraphs by
   topic rather than one dense block.

9. **Don't mirror the JD's specific vocabulary back as a stated interest.** If
   a posting names a specific tool/pattern the user hasn't actually used, do
   NOT write "I'm interested in deepening my knowledge of [that specific
   thing]" — that reads as reverse-engineered from the JD text sitting right
   there, which is exactly what it is. If there's no real experience with the
   specific thing asked, just don't mention it — stating the adjacent
   confirmed experience is enough. Expressing interest is fine ONLY at the
   level of a broad field/domain career-direction shift the user would
   genuinely make (e.g. "coming from web3, I'm looking to move into AI-native
   product work"). A specific library/tool named in one JD is too granular to
   be credible as anything but answer-mirroring. This extends to not
   narrating the match itself: never write "these are the same principles the
   job lists as a differentiator" or "as the posting mentions" even when the
   overlap is real and honestly earned — let a shared term stand on its own.

10. **Reweight, don't recycle verbatim.** The same underlying facts show up
    across applications, but which one leads should shift with what the
    specific JD asks for. Don't paste the same paragraph into every form.

11. **The user edits answers before submitting — capture those edits.** Treat
    an edit as a live style/fact correction: fold the lesson into this
    skill's rules (not just this one answer) and log it in the Self-Improvement
    section below. Generic, reusable answers (a short bio, "why this field",
    a domain-experience answer) are worth also saving to `answers/bank.md`
    once they've been through a real edit round — job-specific answers tied
    to one JD's exact wording aren't, since they won't transfer as-is.

12. **Classify the question before drafting.** Not every question wants the
    experience bank. A motivational or "who are you" question is asking
    about the person, not the portfolio — answer from motivation, temperament
    and how they like to work, and bring in a project only if it illustrates
    the point naturally. Answering those with achievement bullets reads as a
    resume paste and misses what was asked.

13. **Stack questions: order by the JD, keep it tight.** For "what
    technologies are you using" questions, lead with what the posting names
    as required, keep each line short, and demote domains the role doesn't
    ask for to a trailing line rather than cutting them (they still signal
    range). Don't dump the resume's full skills section.

14. **Mine beyond the profile files for project answers.** For "something
    cool you built" / "a personal project" / "hardest thing you've done"
    questions, `experience-bank.md` is often incomplete. If you know of real
    details from elsewhere (another workspace, a prior conversation), ask
    before assuming, then write what you find back into `experience-bank.md`
    so the next application has it.

15. **Spoken answers (video responses, interview prep) get optimized for
    speech, not text.** Applies to any video-response question or
    interview-prep request:
    - Target **60-90 seconds** unless told otherwise — roughly 130-170 words.
      Count words and trim; don't just polish a too-long draft.
    - No company flattery or culture-praise as the opening hook. Lead with
      the user's own technical interest/career logic, not admiration of the
      employer.
    - No generic interview-cliché lines ("I'm excited about this
      opportunity," "this feels like the right next step in my career," "I'd
      love the chance to..."). If a sentence could be said by any candidate
      about any company, cut it.
    - Write sentences short enough to actually say in one breath.
    - Still tropes-filtered per rule 8 — the spoken-vs-written shift doesn't
      relax that, it adds constraints on top of it.
    - Connect real experience directly to the role's actual responsibilities
      rather than to the company in the abstract.
    - **Don't let tool-derived precision leak into recall-level detail.**
      When a spoken answer is drafted from tool-derived facts (session
      history, git log, project records), match the level of detail a person
      would naturally recall from memory in an interview, not the omniscient
      precision that gives away it was pulled from records.
    - Deliver as a paragraph script for review, never tell the user to read
      it verbatim on camera.

## Explicitly out of scope

- Marking a job as applied, tracking status, or creating the `applications/`
  snapshot folder — that's this repo's `job-scout` skill and its `scout.js
  apply/status/correct` commands. Point to it if relevant, don't duplicate it.
- Writing or rebuilding resume PDFs — see the root `CLAUDE.md` build workflow
  (`node build/build.js`).

## Self-improvement — Feedback log

**This skill evolves.** Whenever the user edits a drafted answer before
submitting it, or otherwise corrects the approach, append a dated entry below
AND fold the lesson into the rules above so it applies next time, not just to
that one answer. Keep entries short: what happened → the rule now.

_No entries yet — this log starts empty in the template. Add your own as you
draft real answers and get corrected._
