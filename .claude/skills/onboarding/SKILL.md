---
name: onboarding
description: First-run setup for this jobhunt template — interviews a new user to fill in their identity, target roles, stack/location preferences, seed scouting targets, and a first pass at their experience bank. Use when the profile/experience-bank.md is still template placeholders, when a fresh clone has no build/config.yaml, when the user asks "how does this repo work", "help me get started", "/onboarding", or this is clearly a first session in this project.
---

# onboarding — first-run setup for this repo

This repo is a template for running a job search with an AI agent. On a
fresh clone, nearly every file is a placeholder. Your job here is to turn it
into a working, personalized workspace through a short conversational
interview — not to dump a wall of instructions on the user.

## How to detect first-run

Any of these means onboarding hasn't happened yet:
- `profile/experience-bank.md` still contains bracketed placeholders like
  `[Company Name]` instead of real content.
- `build/config.yaml` doesn't exist (only `build/config.example.yaml` does).
- No `.onboarded` marker file at the repo root.

Don't force onboarding if the user is clearly just asking a specific
question about an already-set-up repo — check for real content first.

## Orientation — explain the repo before asking for anything

Before interviewing, give a short (not exhaustive) tour so the user
understands what they're filling in and why. Pull this from the module map
in the root `README.md`/`CLAUDE.md` rather than repeating it verbatim — the
point is to explain it in your own words, tailored to what you're about to
ask them to fill in first:

- `profile/` — the source of truth for your career facts (raw, messy is
  fine).
- `resumes/` — polished, audience-tuned resume variants built from
  `profile/`.
- `answers/` — reusable answers to repeated screening questions.
- `scouting/` — an automated pipeline (`.claude/skills/job-scout/`) that
  checks career pages across multiple ATS platforms (Greenhouse, Lever, Gupy,
  Workday, and more — see `scouting/adapters/`) for postings matching your
  checklist.
- `.claude/skills/job-apply/` — drafts tailored answers to a specific job's
  screening questions once you've found one worth applying to.
- `research/` and `study/` — reference material (resume best practices, an
  anti-AI-writing-tropes filter, technical interview prep) that isn't
  personal to you and ships as-is.
- `applications/`, `interviews/`, `tasks/` — tracking folders that fill up as
  you actually use the repo; empty at first.

## The interview

Ask in this order, one topic at a time — don't front-load every question at
once. Confirm each answer before moving to the next topic, since later steps
build on earlier ones (e.g. checklist.yaml needs the target roles first).

1. **Identity & contact.** Name, email, phone, location/timezone, LinkedIn,
   GitHub (whatever's relevant). Write these into:
   - `build/config.yaml` (copy from `build/config.example.yaml` first) — the
     `slug` field, typically a URL-safe version of the name.
   - `resumes/<pivot>/*.md` frontmatter (`name`, `contact.*`).
   - `answers/bank.md` → "Location / timezone / remote setup".

2. **Target roles and markets.** What kind of role(s), which markets/regions,
   remote vs. relocation-open. Write into `profile/narrative.md` → "Targets".
   If the user's background supports more than one credible narrative (e.g.
   can lead with different experience for different company types), set up
   the "Pivot strategy" section and create a second folder under `resumes/`
   mirroring the first — otherwise keep a single resume and delete the pivot
   section.

3. **Stack, dealbreakers, and location preferences.** This drives the
   scouting pipeline's fit classifier. Ask specifically:
   - Core stack/skills (feeds `known_stack` in `scouting/config/checklist.yaml`
     — can be regenerated later from resume content via
     `node scouting/lib/checklist-build.js` once resumes have real skills, or
     filled by hand now).
   - Hard dealbreakers (a language/stack they won't work in, any legal/work-
     authorization constraint, non-negotiable location requirements).
   - Nice-to-haves and soft location/remote signals (preferred timezone,
     whether a strong local company on-site is acceptable, etc).
   Write these into `scouting/config/checklist.yaml`, replacing every
   `example-*` entry.

4. **Seed scouting targets.** Ask for 2-3 real companies they're interested
   in tracking. For each, identify which ATS the company uses (ask the user
   for their careers-page URL and inspect it, or ask them to check — the
   URL pattern usually gives it away: `boards.greenhouse.io/<token>`,
   `jobs.lever.co/<site>`, `<company>.gupy.io`, etc). Add real entries to
   `scouting/config/sites.yaml`, replacing the `example-*` entries. If an ATS
   isn't one of the adapters already in `scouting/adapters/`, say so plainly
   and note it as a `needs-research-spike` entry rather than guessing at a
   config shape — the job-scout skill's own TODO-log pattern
   (`scouting/TODO.md`) is the right place to track that kind of open item.

5. **First pass at the experience bank.** Don't try to get a polished resume
   out of this step — get real facts down. Ask about current/most recent
   role, then walk backward: company, dates, what they owned, 2-3 concrete
   achievements with numbers if available. Write into
   `profile/experience-bank.md`, replacing the template placeholders section
   by section. It's fine to leave older/less relevant roles thin for now —
   depth matters most for the most recent 1-2 roles.

## Wrapping up

- Once the core identity/targets/checklist/first-experience-pass are filled,
  create an empty `.onboarded` marker file at the repo root (gitignored) so
  future sessions don't re-trigger this interview.
- Tell the user what's still template/placeholder (resumes body content,
  cover letter, answer bank) and that they can fill those in over time, or
  ask you to draft them from `profile/experience-bank.md` whenever they're
  ready.
- Point them at `.claude/skills/job-scout/SKILL.md` as the next real action:
  run it once their `sites.yaml` has real, confirmed entries.
