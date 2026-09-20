# tasks — inbox for work to pick up later

Drop ideas/requests here from whatever chat you're in so they don't have to
be resolved in that same conversation and don't bloat its context. A future
session (any of them — this isn't tied to one chat) reads this folder, picks
a task, and works it.

## Format

One file per task, `tasks/<slug>.md`:

```markdown
---
status: open   # open | in-progress | done
created: YYYY-MM-DD
area: scouting | resumes | answers | interviews | other
---

# Task title

What was actually asked for, verbatim intent preserved. Context, links,
constraints, and anything already known that would help whoever picks this
up next. Note explicitly if the user offered to help unblock something
(e.g. pasting a DevTools network request) — say what they offered and when
to ask for it.
```

## Working a task

1. Set `status: in-progress` when you start (so two sessions don't duplicate
   work — check this before starting).
2. When done, set `status: done`, add a one-line "Resolution" note at the
   bottom (what shipped, where), and move the file into `tasks/done/` — it's
   the record of what happened, just archived out of the active inbox.
3. If a task turns out to need the user's input to unblock, ask inline in
   whatever session picked it up — don't leave it silently stuck at
   `in-progress`.

## Listing open tasks

```
grep -l "^status: open" tasks/*.md
```
