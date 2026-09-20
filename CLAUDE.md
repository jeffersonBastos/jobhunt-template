# jobhunt-template — an AI-agent-driven job-search workspace

A template for running a job search with an AI coding agent (Claude Code or
similar) as your day-to-day collaborator: drafting resumes, tracking
applications, scouting career pages across multiple ATS platforms, and
drafting screening-question answers — all from plain markdown you can read,
diff, and edit by hand.

**First time in this repo?** Run the onboarding skill
(`.claude/skills/onboarding/SKILL.md`, or just say "help me get started") —
it interviews you to fill in your identity, target roles, and preferences,
and explains each module as it goes.

## Core principles

- **Markdown is the source of truth. PDF is a build artifact.** Content is
  edited and reviewed as markdown (cheap, diffable). `build/build.js` renders
  it to PDF.
- **Authentic voice.** Any new or rewritten content should be co-written with
  you and run through `research/tropes.md` so it never reads AI-generated.
- **Multiple languages when useful.** If you're applying in more than one
  language market, keep an EN and (e.g.) PT version of each resume.
- **Git is the review tool.** See the tailoring workflow below.

## Git Workflow

This repo works well with a **develop → main** flow, purely to make review
easier (diff a PR instead of a raw commit history).

```
develop   ← all active work lives here (always checked out)
  └─ PR → main   ← merge only when you review and say so
```

**Rules:**
- Always work on `develop`. Never commit directly to `main`.
- If an open PR (`develop → main`) exists, push commits to `develop` and
  update the PR description. If none exists, create one.
- Merge to `main` only on explicit instruction — don't merge just because a
  change is done.

## Resume pivots

Keep your resume as one or more reusable "pivots" under `resumes/<pivot>/`,
each ideally in every language you apply in. A pivot is a variant of your
resume that leads with a different slice of your experience for a different
kind of target company (e.g. one pivot leading with backend/infra depth, one
leading with a specific domain). If your background only supports one honest
narrative, keep a single pivot — don't force a split.

Cover letter: `cover-letters/generic-en.md` is a single generic base — see
the "Cover letters" section below and `research/cover-letter-best-practices.md`
for the reasoning on when a single language/version is enough vs. when you
need more.

## Git-based review workflow (base → tailor)

**Rule: any new resume — a new pivot OR a per-job tailor — is created as TWO
commits so a reviewer sees only the new part:**

```
1. Create the file as an exact COPY of the closest existing resume.
2. git commit -m "base: <name> — copy of <source>"   # no content change yet
3. Edit the copy (co-write, tropes-filtered).
4. git commit -m "tailor: <name>"                     # this diff = only the changes
5. node build/build.js <resume.md> [--ats]            # render (auto-names the PDF)
```

Reviewing step 4's diff shows exactly what changed — nothing else. This
applies to `applications/<company-role>/` tailors AND to new
`resumes/<pivot>/` pivots. If the base was already committed together with
edits, split it: save the final, `git reset --soft HEAD~1`, commit the copy
as base, restore the final, commit as tailor.

## Building a PDF

```
cd build && npm install                          # first time only (js-yaml, marked)
cp build/config.example.yaml build/config.yaml    # first time only — fill in your slug
node build/build.js <resume.md> [out.pdf] [--ats]
```

Renders via a fixed HTML/CSS template (`build/resume.css`) + headless Chrome.
Tune the look in `resume.css`; content stays in the markdown. Override Chrome
with `CHROME_PATH=...`.

**ATS-safe variant:** add `--ats` to render a single-column, parse-friendly
PDF (`build/resume-ats.css`) from the same markdown — for uploads into ATS
forms that mishandle the two-column designed PDF. Use the designed PDF for
humans, the ATS PDF for ATS forms.

**Output naming — leave `[out.pdf]` off.** The default filename is already
the one to send, using your `slug` and `pivot_numbers` from
`build/config.yaml`:

```
resumes/<pivot>/<slug>-<word>-<n>.pdf        # designed
resumes-ats/<slug>-<word>-<n>-ats.pdf        # --ats
```

`<word>` is the language (**resume** for EN, **cv** for PT) and `<n>` is the
pivot number from `pivot_numbers`. A new pivot needs its number added there;
without one it falls back to the folder name, which is what application
tailors in `applications/<company-role>/` get — those keep both variants
next to their source. Pass an explicit `[out.pdf]` only for a one-off.

Rebuild everything (both variants, all pivots, whichever languages exist):

```
cd build
for p in resumes/*/; do for f in "../$p"*.md; do \
  node build.js "$f"; node build.js "$f" --ats; done; done
```

### Resume markdown format

YAML frontmatter drives the header/sidebar; the markdown body is EXPERIENCE:

- Frontmatter: `name`, `summary`, `contact`, `skills[]`, `education[]`,
  `languages`, `sections` (label overrides for i18n), `layout` (optional).
- `layout: sidebar-contact` moves the contact block out of the header and
  into the sidebar above EDUCATION/LANGUAGES, which frees the full page width
  for the summary. Omit the key for the original header-contact layout.
  Designed PDF only — the ATS variant is single-column and ignores it.
- Body: one job per `## Company — *Role*`, followed by a `*Location · dates*`
  meta line, an intro paragraph, then `**Bold label:** detail` bullets.

## Structure

```
resumes/<pivot>/              # your resume pivot(s) (en.md + pt.md, etc.)
applications/<company-role>/  # per-job tailored copies (see workflow above)
profile/experience-bank.md    # raw material: every role, all bullet variants
profile/narrative.md          # positioning, targets, headline options, strengths
answers/bank.md               # reusable answers to repetitive application questions
interviews/prep/              # common Q&A + interview drills (STAR)
interviews/feedback-log.md    # post-interview retros → improvements
study/                        # durable, cross-company technical study (algorithms,
                               # system design, domain concepts) — see study/INDEX.md
challenges/                   # take-home test workspace
research/                     # resume best-practices, ATS, AI-era hiring notes,
                               # tropes.md (AI-writing-tropes-to-avoid filter)
tasks/                        # cross-session inbox: drop a task, any future session picks it up
build/                        # md → pdf tooling
linkedin/                     # content system for building visibility (see below)
toptal/                       # example "platform/network" track scaffold — rename or
                               # remove if you're not using a talent-network platform
```

## Platform/network tracks (e.g. Toptal)

`toptal/` is a worked example of tracking a talent-network platform (rules,
profile, per-job applications, engagements) as a track parallel to your
direct job search. Start at `toptal/README.md`, which carries the current
status table. If you're not using Toptal specifically, either adapt this
folder for whatever platform you do use, or delete it.

- `<platform>/rules.md` — read before drafting anything that goes to a
  platform recruiter or client (rate discussion rules, escalation paths,
  confidentiality).
- `<platform>/applications/` — one file per application (template in its
  README).
- `<platform>/engagements/` — one folder per won engagement, management layer
  only. **Client code, data and credentials never enter this repo.**

A platform's confidentiality rules often constrain `linkedin/` — nothing
about platform jobs or client work becomes public post material unless the
platform/client explicitly allows it.

## LinkedIn content system

Goal: build engagement/visibility during the job search via posts — industry
commentary and build-in-public updates, tropes-filtered like the resumes.

- `linkedin/ideas.md` — inbox for loose post ideas, drop-as-you-go, newest
  first.
- `linkedin/research.md` — researched patterns for what gets engagement + a
  9-beat working template derived from a real reference post.
- `linkedin/references/` — saved example posts worth modeling structure on
  (full text + why it was saved + structural breakdown), not to copy content.
- `linkedin/posts/` — drafts once an idea graduates from the inbox.

Posts should run through the same tropes filter (`research/tropes.md`) as
resume content (no em-dash addiction, no "it's not X it's Y", no bold-bullet
spam, no emoji) — the point is credibility, so it can't read as AI-generated.

## Cover letters

Base lives at `cover-letters/generic-en.md` — see
`research/cover-letter-best-practices.md` for guidance on whether you need
more than one language/version (often the customization axis is role type,
not geography).

- **If you ask for "the cover letter" and send a job-posting link in the same
  message, the link is the posting for that specific application.** Fetch
  and read it, then write the company/role-specific paragraph that replaces
  the `[one line here per application...]` placeholder — it doesn't need to
  stay one line; expand it if the posting gives real material to work with.
- Any other adjustment beyond that placeholder (swapping which achievement
  leads, tightening a sentence) should be called out explicitly — you'll
  likely want to re-review the whole letter any time more than that one slot
  moved, not just diff the new part.
- Save per-application tailors under
  `applications/<company-role>/cover-letter.md`, copied from the generic
  base — same base→tailor spirit as the résumé workflow above, though cover
  letters don't need the two-commit split unless you want it.
- Render to PDF with any markdown-to-PDF tool you have available — resumes
  render with this repo's own `build/build.js` (structured frontmatter
  schema, output-naming conventions); cover letters are plain markdown and
  don't need that structure.

## Job scouting

`scouting/` (see `.claude/skills/job-scout/SKILL.md`) checks tracked career
pages, classifies postings against `scouting/config/checklist.yaml`, and
writes dated reports under `scouting/reports/`. Two rules for any session,
not just the skill invocation itself:

- **If you send only "applied" + a link, treat it as
  `node scout.js apply <url>` immediately** — mark it applied and confirm
  back what got recorded, don't ask for confirmation first. Works even for a
  job that never came through the scout (see SKILL.md).
- **If you ask "did I already apply to X," check
  `scouting/state/seen.json` / `scouting/state/corrections-log.jsonl` before
  answering** — never guess from memory or the current conversation alone.

## Task inbox

`tasks/` (see `tasks/README.md`) is a cross-session inbox: drop a task from
whatever chat you're in instead of resolving it there, so it doesn't bloat
that conversation's context. Any future session can open the folder, pick an
`open` one, and work it — check there when starting fresh work on this
project and nothing else is specified.
