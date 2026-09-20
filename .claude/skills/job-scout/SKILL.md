---
name: job-scout
description: Check tracked career pages (config/sites.yaml under scouting/) for new postings, classify them against your fit checklist, and produce a markdown report of what's worth reviewing. Also runs a weekly discovery pass searching outside the tracked sites for new companies/postings. Use when the user says "check for new jobs", "run the job scout", "/job-scout", or this is invoked on a schedule.
---

# job-scout — check tracked career pages for fitting postings

Runs the `jobhunt/scouting/` pipeline: deterministic fetch → your judgment on
fit → deterministic report. Only the middle step needs a model at all —
**always run classification on the primary model (Sonnet or better), never
on Haiku or another cheap/fast model.**

Confirmed by direct feedback 2026-08-17, after a Haiku-run classification of
564 postings came back with 386 false FITs — postings like "Estágio em
Design" and "Coordenadora de Growth" (no engineering content at all) were
tagged "Strong stack match: Web3/Blockchain" purely from surface keyword
presence, and ~274 Turing gig/annotation postings ("Business Analyst -
Korean", "US Tax Law Annotation Expert") were marked FIT for containing the
words "LLM/Agentic" anywhere in the text. A full Sonnet reclassification of
the same batch, reading the real job text, brought FIT down from 386 to 44.
This step is exactly the opposite of mechanical: distinguishing a real stack
match from an incidental keyword hit, and a real engineering role from
gig/annotation work wearing an engineering-sounding title, is a judgment
call. Getting it wrong in the FIT direction wastes your own review time on
noise; getting it wrong in the DISCARD direction silently buries a posting
he'd have wanted to see. Both failure modes are costly enough that the token
savings from a cheap model are not worth it here.

## Why it's split this way

Fetching, deduping, and rendering the report are pure scripts (`scout.js`) —
zero LLM tokens, and they should stay that way. The one thing a script can't
do reliably is tell "Kotlin required" apart from "Kotlin is a plus" in free
-text requirements — that's the one step you do, per job, per the checklist,
and it needs real reading comprehension of the job text, not keyword
matching.

## Procedure

Run all commands from `jobhunt/scouting/`.

### 1. Fetch
```
node scout.js fetch          # all sites in config/sites.yaml
node scout.js fetch --site=ifood   # just one, for testing
```
Prints how many sites were checked and how many new postings need
classification. If 0, stop here — nothing to do, no report is written for an
empty run.

Sites with `status: needs-research-spike` in `config/sites.yaml` will fail
loudly (logged to `state/fetch-errors.log`) — that's expected, not a bug to
fix here.

Sites with `classify: false` (e.g. the CoW forum RFP watcher — not a job
board, no fit judgment applies) skip steps 2-4 entirely: `fetch` alone
writes new items straight into today's report under "New."

### 2. Read the batch
Read `state/pending.json` (array of canonical job records — `id`, `company`,
`title`, `location`, `remoteType`, `department`, `url`, `text`) and
`config/checklist.yaml` (`known_stack`, `deal_breakers`, `nice_to_have`,
`soft_signals`).

### 3. Classify each job
For every record in `pending.json`, decide FIT / CLOSE / DISCARD against the
checklist:

- **AI-training/annotation gig work (Turing and similar marketplaces) is not
  a full-time engineering role, even when the title says "Software Engineer"
  or "DevOps Engineer."** Read the actual text: if the role is
  rating/annotating/transcribing/evaluating AI outputs, or is a short-term
  contract gig rather than a full-time position, it's not a stack match no
  matter what keywords appear in the description — DISCARD it outright
  (rater/annotator/transcriber/SME-in-an-unrelated-domain/business-analyst-
  by-language titles). The narrow exception: postings that are genuinely
  engineering-flavored contract work (e.g. "Senior Software Engineer – Python
  (LLM Evaluation & Repository Validation)", "DevOps Engineer", "Android
  Engineer", "Forward Deployed Engineer") — cap these at CLOSE, never FIT,
  and say in `reason` that it's contract/gig-adjacent work worth your
  own eyeball, not a real full-time role. Still apply `deal_breakers`
  normally to these (Go/Java-primary Turing gigs get DISCARDed like any
  other Go/Java-required posting).
- **DISCARD** only if a `deal_breakers` entry is clearly **required** (not
  "a plus"/"nice to have") in the job text. Read carefully — the same
  technology can appear as a hard requirement in one posting and a bonus in
  another; that distinction is the entire reason this step isn't a script.
  This includes `rigid-onsite-required`: if the text plainly says onsite is
  mandatory and non-negotiable ("must be based in," "fully onsite," "commute
  daily") in a location you're not willing to relocate for, that's a
  deal-breaker like any hard stack mismatch — DISCARD, not a soft signal.
  It also includes a location-specific variant you should define in your
  own `checklist.yaml` (e.g. `onsite-outside-my-city`): on-site/hybrid in
  your home country, based anywhere that isn't your own city or metro area,
  and not remote — DISCARD, same as an onsite role in a foreign city, even
  when the stack is a strong match and the brand is appealing. Location miss
  alone should disqualify; brand strength doesn't offset it. Calibrate this
  rule against your own reviewed reports — if you find yourself rejecting by
  hand every onsite-far-city posting that surfaces as FIT/CLOSE, tighten the
  rule the same way.
- **Location/remote is otherwise a `soft_signals` factor, not a DISCARD by
  itself** — but an onsite/hybrid posting that's non-remote and outside your
  target country, without explicit rigid language, should **cap the verdict
  at CLOSE. It must never produce FIT**, regardless of stack match. Recalibrate
  this threshold based on direct feedback: if a large fraction of FIT postings
  in a report turn out to be onsite-far-city roles you reject by hand on
  sight, that's a signal the rule needs tightening. If you want remote roles
  but are also open to strong local companies on-site *in your own city*,
  define a signal like `location-strong-local-company` that's unaffected by
  this cap and can still land FIT or CLOSE on technical merits alone.
  On-site/hybrid anywhere else in your home country falls under the
  `onsite-outside-my-city`-style DISCARD rule above, not this softer signal.
- **FIT** = clear `known_stack` overlap, no required deal-breaker. Don't
  require a 100%-perfect match — see the years-of-experience note below and
  in `checklist.yaml`.
- **CLOSE** = decent — i.e. genuinely partial, not zero — overlap but
  missing 1-2 must-haves, ambiguous/generic requirements, a role-type
  mismatch worth a human call (e.g. management track, ambiguous language
  list), or a strong match undercut only by a soft-signal mismatch. This
  bucket exists specifically for jobs you should eyeball yourself, not
  obvious rejects — when unsure, prefer CLOSE over DISCARD. **But company
  brand strength is a tiebreaker on top of a real stack match, never a
  substitute for one** — confirmed 2026-08-20 after a batch of postings with
  literally zero `known_stack` overlap (pure C#/.NET, PHP) were CLOSEd on
  "no known_stack overlap, but strong brand — worth his own judgment"
  reasoning alone. Zero overlap is DISCARD regardless of how well-known the
  company is.
- **Years-of-experience / seniority requirements are NOT a discard or
  downgrade factor, in either direction.** A posting asking for "10+ years"
  or "Staff-level" when you have fewer does not by itself take a role below
  FIT — international remote roles pay well even below the posted level and
  titles/years are frequently negotiable. If the stack/domain match is
  strong, call it FIT and just note the gap in `reason`. Confirmed from
  direct feedback: don't be strict on this parameter. The same applies to
  under-leveled postings: a "Mid"/"Pleno"-titled INTL role is just as valid a
  FIT/CLOSE candidate as a senior/staff one — confirmed 2026-07-27, don't
  assume a senior candidate only wants senior-titled roles. Judge purely on
  stack/domain overlap and the location soft signals; seniority band never
  drives the verdict.
- If a job's text is genuinely too thin/ambiguous to call, prefer CLOSE with
  a reason saying so — never silently drop a record.
- **Don't trust an ATS's `remoteType`/location field at face value.**
  Confirmed wrong twice already (see `remote-region-restricted` in
  `checklist.yaml`): a role flagged remote by the API was actually onsite,
  and a "Remote · France, Paris" role turned out to be Europe-only remote,
  not accessible from Brazil. Read the actual text for eligibility/location
  restrictions before calling something remote-accessible.
- **Also tag every record with a `region`: `"br"` or `"intl"`** — this drives
  which of the two split report files it lands in (see step 4). **Brazil
  (`"br"`)** = the record matches the `location-br-strong-company` soft
  signal, or `location` names a Brazilian city/"Brasil" — regardless of what
  the title says. Don't use the word "Internacional" in a title as the
  signal: a real example, "Grupo Boticário — ...Especialista II -
  Internacional", is a Brazil-based, Brazil-remote role where "Internacional"
  just describes the team's scope (serves resellers abroad), not international
  hiring eligibility — that one is still `"br"`. **International (`"intl"`)**
  = everything else that's still FIT/CLOSE (`location-remote-us-eu`, a
  genuine foreign onsite/hybrid role via `location-onsite-other`, etc). Tag
  every record regardless of verdict, for consistency — only FIT/CLOSE ones
  actually surface in a report.

Write your verdicts to a temp JSON file matching this shape (one entry per
record, matched by `id`):
```json
[
  {"id": "<record.id>", "verdict": "FIT|CLOSE|DISCARD", "region": "br|intl",
   "matched": ["known_stack: ...", "soft_signal: ..."], "violated": ["deal_breaker id"],
   "reason": "short, specific — cite what actually drove the verdict"}
]
```

### 4. Finalize
```
node scout.js finalize /path/to/your-classifications.json
```
Writes **two** files split by the `region` tag from step 3 —
`reports/br/<date>.md` and `reports/intl/<date>.md` (FIT + CLOSE only —
DISCARDs are logged to `state/discard-log.jsonl`, not shown in either) — and
updates `state/seen.json` so nothing gets re-fetched or re-classified. If a
batch has FIT/CLOSE records in only one region, only that region's file gets
a new section for this run — the other isn't touched. If you only classified
some of the batch, unclassified records are safely left in
`state/pending.json` for next time — no data is lost.

### 5. Discovery: finding companies outside the tracked list (weekly)

`sites.yaml` only covers what's already been manually mapped. Discovery is a
separate, occasional step that goes looking for companies/postings the
tracked sites can't see — a different problem from steps 1-4, which only
process what the *existing* sites returned.

**Cadence gate — check before doing any searching.** Read
`state/discovery-meta.json` (`{"lastRun": "YYYY-MM-DD"}`, may not exist yet).
If `lastRun` is within the last 7 days, skip discovery entirely for this
job-scout run (say so in the report-back, don't silently omit it). Otherwise
run it, then write today's date to that file when done:
```
node -e "require('fs').writeFileSync('state/discovery-meta.json', JSON.stringify({lastRun: new Date().toISOString().slice(0,10)}))"
```

**Search.** Confirmed scope 2026-08-17: use all of —
- **General web search** for companies actively hiring against the stack in
  `checklist.yaml` (web3/blockchain, Node/TS, Python, Rust, LLM-agentic dev),
  remote-first / US-EU / strong BR companies. Vary the query angle (by stack,
  by "remote web3 engineering jobs 2026", by specific niches like DeFi
  infra/oracles) rather than one broad query.
- **Aggregators not already in `sites.yaml`**: RemoteOK, WeWorkRemotely,
  Wellfound/AngelList, Web3.career. Use WebFetch/WebSearch against their
  public listing pages — these don't have adapters (unlike the sites.yaml
  entries), so read them ad hoc each run rather than trying to parse a fixed
  schema.
- **LinkedIn Jobs**: no authenticated LinkedIn access exists in this
  environment by default (a browser-automation MCP session could add it, if
  you have one configured elsewhere) — coverage here is necessarily partial,
  limited to whatever `site:linkedin.com/jobs` web search turns up and
  individual public posting pages fetched from those results. Don't claim
  full LinkedIn Jobs search coverage; say explicitly in the report that this
  leg is search-engine-indexed postings only.

**Dedup before judging fit** — this is the step that keeps discovery from
just re-finding what's already tracked:
1. Company-level: skip anything whose company name already appears in
   `sites.yaml`'s `company:` fields (case-insensitive, allow for punctuation/
   suffix differences like "Inc"/"Labs").
2. Posting-level: for anything that survives step 1, strip tracking params
   from the URL (same rule as `findSeenByUrl` in `lib/dedup.js` — drop
   `?utm_source=...`-style params before comparing) and skip if it's already
   in `state/seen.json`.

**Judge fit** on whatever's left using the exact same `checklist.yaml`
rules as step 3 above (including the Turing-style gig-work exclusion) — no
separate discovery-specific criteria.

**Write output** — never touch the regular `reports/<region>/<date>.md`
files for this. Two outputs instead:
- `reports/<region>/discovery-<date>.md` — FIT/CLOSE postings found this run,
  same rendered format as a normal report section, headed with a one-line
  note on which sources were searched and any partial-coverage caveats
  (e.g. LinkedIn).
- If a company turns up with multiple current FIT/CLOSE-worthy openings (a
  sign of active, recurring engineering hiring — not just one job that'll go
  stale), it's worth tracking properly rather than re-discovering it every
  week. Append it to `tasks/discovery-candidates.md` (create if missing) as
  a bullet: company, why it looked strong, the URL(s) found. Don't edit
  `sites.yaml` or build an adapter yourself — that's deliberate follow-up
  work you pick up later, same as the existing `needs-research-spike`
  entries (see `tasks/reap-teamtailor-adapter.md` for the pattern a real
  adapter spike follows).

## Two independent tracks: verdict vs status

You review the report incrementally and give feedback per job as you
go — this is meant to be continuous, not a one-shot review. There are two
separate things that can be recorded per posting, and they're NOT the same
axis:

- **`verdict`** (FIT/CLOSE/DISCARD/UNRESOLVED/NEW) — Claude's fit judgment
  from classification. Corrected only when the judgment itself was wrong
  (e.g. a role flagged remote was actually onsite — see
  `remote-region-restricted` in `checklist.yaml`).
- **`status`** (open/applied/closed) — Your own application-tracking
  state, independent of verdict. This is the one he sets on nearly every
  entry he reviews:
  - **open** — reviewed, intends to apply later, hasn't gotten to it yet.
  - **applied** — applied. Also snapshots the posting (see below).
  - **closed** — reviewed, decided not to apply (whether because the verdict
    was wrong or just his own call — either way, done with it).

Both are set via the same CLI, matched by URL (tracking params like
`?utm_source=...` stripped, so a pasted link always works):
```
node scout.js correct <url> <FIT|CLOSE|DISCARD|UNRESOLVED|NEW> ["why"]   # fixes verdict
node scout.js status <url> <open|applied|closed>                         # sets status
node scout.js apply <url>                                                # shortcut for `status <url> applied`
```

Both write to `state/corrections-log.jsonl` for an audit trail. If a
`correct` reveals a systemic issue (like the remote-region-restriction one),
fix `checklist.yaml`/this file too, not just the one record — don't make him
repeat the same correction for every future posting with the same issue.

### "Applied" also works for jobs that never came through this pipeline

If you say you applied to a link that isn't in `state/seen.json` (a
role he found on LinkedIn directly, not surfaced by the scout), `status`/
`apply` don't error out — they create a minimal ad-hoc tracking record for
that URL on the fly (optionally pass `--company="X" --title="Y"` for a
cleaner record; otherwise the URL itself is the placeholder title). This is
the single source of truth for "have I applied to this already?" regardless
of where the posting came from — check `state/seen.json` /
`state/corrections-log.jsonl` before answering that question, never guess.

**Recognize "apliquei" + a bare link, with no other framing, as this
action** — treat it as `node scout.js apply <url>`, confirm back what got
marked, don't ask for confirmation first (see also root `CLAUDE.md`).

### Entry numbering

Every entry heading is numbered (`### 3. Company — Title`), running
continuously through the whole file — FIT entries first, then CLOSE, etc. —
so you can track how many you've gone through in one sitting ("I
reviewed up to #12") without losing his place. `report.js`'s `section()` and
`scout.js`'s digest renderer both do this with a shared counter; it's purely
cosmetic — `sync-report` matches blocks by their `[link](...)` url, never by
number, so numbers can shift between regenerations without breaking sync.
Don't renumber past reports retroactively — this only applies going forward.

### The four checkboxes on every entry

Every entry ends with four GFM task-list checkboxes — real, clickable
checkboxes in GitHub/VS Code/most viewers:
```
- [ ] open — will apply later
- [ ] applied
- [ ] closed — not a fit
- [ ] note — leave a comment or adjustment request below this line
```
The first three are mutually exclusive **status** — he checks exactly one as
he reviews. Don't remove these when rendering entries in `report.js`.
Checking a box does NOT by itself change anything; it needs `sync-report` (or
manual `status`/`apply` calls) to actually take effect.

The fourth (**note**) is independent and additive — can be checked alongside
any status, or on its own. It's for free-form feedback that isn't a
status/verdict change: an adjustment request for the pipeline itself
("localidade longe" on a batch of onsite postings, "esse eu acho que já
apliquei, tem registro?"), a flag to revisit later, anything that doesn't fit
the other three boxes. Write the note either inline right after the em dash
on the checked line, or as plain text below it (or both) — `sync-report`
captures the inline text and anything below it up to the next entry, joining
them. In practice most people almost always write inline, which is what
prompted the fix below.

### Bulk mode: sync the whole report file at once

After you check boxes (and/or adds a `> FIT|CLOSE|DISCARD|...` line
for the rarer verdict-correction case, and/or writes a note) directly in a
report file, run:
```
node scout.js sync-report reports/<date>.md
```
This processes every checked box, `>` annotation, and note in the file —
status boxes call `status`, `>` lines call `correct` (or `status ... applied`
for `> applied`), a checked **note** box + its text appends to
`state/notes-log.jsonl` (`{id, company, title, url, note, at}`) without
touching verdict or status — and rewrites each processed line with
`— ✓ synced <date>` so running it again is a no-op for lines already handled.
Safe to run repeatedly as he adds more marks over several sittings.

**A day's reports can be split across more than one file.** The first batch
of a day writes `reports/<region>/<date>.md`; any later batch (a re-run, a
follow-up fetch) writes its own `reports/<region>/<date>-HHMM.md` instead of
appending to the existing file — confirmed 2026-07-27 after an append
collided with someone actively reviewing that same file in an editor and
their save silently wiped the just-written batch. Practical implication: if
you fetch/finalize more than once in a day, check `ls reports/<region>/` for
same-date files before assuming there's only one, and run `sync-report` on
each one that has marks in it.

**Check `state/notes-log.jsonl` at the start of any job-scout session** for
anything left since the last visit — this is the structured version of what
used to require re-reading a whole report file by hand looking for
hand-typed "notes:" lines.

### Applied postings are snapshotted, not just linked

`finalize` saves a full-text snapshot for every FIT/CLOSE record (not
DISCARD/UNRESOLVED — keeps it to postings worth remembering) to
`state/snapshots/<id>.json`, since by the time he actually applies, the
original job's text is long gone from `pending.json`. Setting status to
`applied` promotes that snapshot into
`applications/<company-title-slug>/job-posting.md` — the same git-tracked
folder jobhunt already uses for tailored resume copies (see root
`CLAUDE.md`) — so the description survives even if the live ATS posting is
taken down before he preps for an interview (confirmed this happens: a
Phantom posting he applied to was already gone from Ashby within a day).

## Reviewing CLOSE postings when short on time

You'll often skim a report's CLOSE section (or older FIT/CLOSE items you
never got to) without time to fully judge each one. In that situation it's
fine — encouraged, even — to just check **open — will apply later** on
anything plausible rather than force a real FIT/CLOSE/DISCARD judgment call
right then. `open` just means "still worth a look," independent of verdict;
he can decide for real later. Don't hold up a review sweep waiting for
certainty on borderline entries.

## Cross-report rollups: `node scout.js digest`

A dated `reports/<date>.md` never updates after you review it, so
everything still awaiting a decision — explicitly marked `open`, or never
reviewed at all — ends up scattered across however many report files he's
touched (or a backlog he never got to). `digest` fixes that by rebuilding
two always-current files straight from `state/seen.json` (the real source
of truth for status) and `applications/*/job-posting.md`:

```
node scout.js digest
```

- **`scouting/state/br/pending-digest.md`** and **`scouting/state/intl/pending-digest.md`**
  — every FIT/CLOSE posting that isn't `closed` or `applied` yet (status
  `open`, or no status at all — never reviewed), split by its snapshot's
  `region` (oldest-first within each file), rendered as normal report blocks
  (checkboxes included) — mirrors the `reports/br/` · `reports/intl/`
  subfolder split for consistency. This is the "I have a backlog of a few
  days of reports I haven't finished reviewing" view — run it any time to
  get one consolidated file instead of re-opening every dated report.
  You can review and check boxes directly in either file, then run
  `node scout.js sync-report scouting/state/br/pending-digest.md` (or the
  `intl/` one) exactly like any dated report. Both are fully regenerated
  every run — anything typed outside the checkboxes/notes is lost on the
  next `digest`. Postings whose snapshot predates the `region` field (from
  before this split existed) get `region` computed on the fly from the
  snapshot's `location` using the same rule as step 3, so nothing is
  silently dropped from either file.
- **`applications/README.md`** — a table of every application actually
  submitted (company, title, applied date, links), built from each
  `applications/<slug>/job-posting.md`'s front matter. Also fully
  regenerated; don't hand-edit it.

Run `digest` at the end of any review sweep (after `sync-report`, once
statuses are updated) so both rollups reflect what just changed. `closed`
and `applied` entries need nothing further — they're terminal and don't
appear in either rollup, and dedup (keyed on posting id, not status) keeps
`closed` postings from ever resurfacing in a future `fetch` either. If
`digest` ever surfaces something odd (e.g. an entry whose verdict is
`DISCARD` showing up — can happen if a verdict was corrected after a status
was set), that's worth a quick manual look but isn't itself a bug.

## Notes sometimes mean the checklist needs fixing, not just a reply

When reviewing `state/notes-log.jsonl` (see "Bulk mode" above), a note isn't
always just feedback about that one posting. If it points at a systemic
pattern in how postings get classified or filtered, fix `config/checklist.yaml`
(or this skill file) too, not just that one record — see the
`remote-region-restricted` recalibration in `checklist.yaml` for a precedent
of a note leading to a rule change. Don't make yourself repeat the same
correction for every future posting with the same issue.

## Regenerating the checklist

If `resumes/web2/en.md` or `resumes/web3/en.md` skills change, refresh the
auto-generated part of the checklist:
```
node lib/checklist-build.js
```
This only touches the `known_stack` block — `deal_breakers`/`soft_signals`
are hand-authored and never overwritten.

## Reporting back

Report back: sites checked, how many new postings, and the FIT/CLOSE/
DISCARD counts (broken down by region if it's a mixed batch). Point him at
the exact file `writeReport`/`finalize` returned (`reports/br/<date>.md` or
`reports/br/<date>-HHMM.md`, same for `intl/`) rather than pasting the whole
thing inline unless he asks — don't assume the plain `<date>.md` name if this
was a second batch that day. If discovery ran this time (step 5), say so
and point him at `reports/<region>/discovery-<date>.md` and any new entries
in `tasks/discovery-candidates.md`; if it was skipped on the cadence gate,
mention that too (with the date it last ran) so he knows why nothing new
showed up from outside the tracked sites.
