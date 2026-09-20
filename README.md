# jobhunt-template

A template workspace for running a job search with an AI coding agent
(Claude Code or similar) as your day-to-day collaborator — resumes, an
application/interview tracker, an automated multi-ATS job scout, and a
screening-question drafting skill, all built on plain markdown you own and
can read, diff, and edit by hand.

This isn't a SaaS or a hosted tool. It's a repo you clone, personalize, and
run locally with an AI agent attached.

## Quickstart

```
git clone <this-repo> my-jobhunt
cd my-jobhunt
```

Open it in Claude Code (or your agent of choice) and say something like
*"help me get started"*. The onboarding skill
(`.claude/skills/onboarding/SKILL.md`) will interview you — identity, target
roles, stack/location preferences, a couple of real companies to track, and a
first pass at your career facts — and explain each module as it fills it in.

Prefer to do it by hand first? Read `CLAUDE.md` for the full module map and
workflow conventions, then start with `profile/experience-bank.md` and
`build/config.example.yaml`.

## What's in here

| Module | What it does |
|---|---|
| `profile/` | Your career facts, in raw form — the source of truth everything else draws from. |
| `resumes/` | Polished resume variants ("pivots") built from `profile/`, rendered to PDF via `build/`. |
| `answers/` | Reusable answers to screening questions that repeat across applications. |
| `cover-letters/` | A fill-in-the-blank cover letter base. |
| `applications/`, `interviews/` | Per-job tracking, filled in as you actually apply and interview. |
| `scouting/` | An automated pipeline that checks career pages across 15+ ATS platforms (Greenhouse, Lever, Gupy, Workday, Ashby, and more) for postings matching your checklist. |
| `.claude/skills/job-scout/` | Runs the scouting pipeline and classifies fit. |
| `.claude/skills/job-apply/` | Drafts tailored, honest, tropes-filtered answers to a specific job's screening questions. |
| `.claude/skills/onboarding/` | First-run setup interview. |
| `research/`, `study/` | Reference material: resume/interview best practices, an anti-AI-writing-tropes filter, technical study notes — ships as-is, no personal data. |
| `linkedin/` | A content system for building visibility during your search. |
| `toptal/` | A worked example of tracking a talent-network platform track alongside your direct search — adapt or delete for your own platform of choice. |
| `tasks/` | A cross-session inbox for anything you want a future session to pick up. |

## Why markdown + git

Every piece of content — resumes, cover letters, answers, even scouting
config — is plain markdown or YAML. That means:

- Real diffs when you or an agent edit something, not opaque binary changes.
- A resume PDF is a build artifact (`build/build.js`), never hand-edited.
- A `develop → main` git flow (see `CLAUDE.md`) makes every batch of edits
  reviewable before it "goes live" as your working resume.

## Privacy

This template ships with **no personal data** — every profile, resume, and
config file is a placeholder or a genericized example. Once you fill it in
with your own information, treat the repo as private: this template is meant
to be cloned into your own (private) repo, not committed to as a fork of a
public one.

## License

MIT — see [LICENSE](LICENSE). Use it, fork it, adapt it for your own job
search.
