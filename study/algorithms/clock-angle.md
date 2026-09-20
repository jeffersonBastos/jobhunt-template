# Clock angle problem (LeetCode 1344 shape)

**Origin**: surfaced during interview prep for a coding round — a
friend's account of a real question asked in an earlier interview round.
Kept here as a general algorithms-bank entry, not
company-specific — the problem shape (clean function, one non-obvious edge
case) is common across companies.

**Problem**: given a clock, find the smallest angle between the hour and
minute hands. Function signature in the original account:
`calculateAngClock(pointerA, pointerB)`. Equivalent to LeetCode 1344
("Angle Between Hands of a Clock").

## A worked derivation, corrected and verified

An independently-derived approach — converts everything into
"minute-mark" units before going to degrees, rather than computing degrees
per-hand directly. Worth rehearsing this version specifically (not the
textbook one below) since it's genuinely his own reasoning, not memorized:

```typescript
function calculateAngClock(hour: number, minute: number): number {
  const minAng = 360 / 60; // degrees per one minute-mark (6°)

  const minPerHourMark = 60 / 12; // how much 1 hour represents in "minute marks" (5)
  const partHour = minute / 60;   // fraction of the current hour elapsed

  const hourToMin = (hour % 12) * minPerHourMark + partHour * minPerHourMark;

  const diffMin = Math.abs(minute - hourToMin); // diff in minute-mark units

  const ang = diffMin * minAng; // convert to degrees

  if (ang <= 180) return ang;

  return 360 - ang;
}
```

Verified against 3:15 → 7.5°.

## Bugs found and fixed in the first attempt

Worth remembering the *shape* of these mistakes, not just the fix, since
they're easy to repeat live under pressure:

- Invalid identifier starting with a digit (`1HourToMin`) — variables can't
start with a number.
- `cont` typo for `const` (syntax noise, not a logic bug — per
[[feedback_code_review_logic_over_syntax]], don't dwell on this class of
mistake).
- **Real logic bug**: used `!!(x)` (boolean coercion — converts to
`true`/`false`) instead of `Math.abs(x)` (absolute value) to get a
positive diff. `!!(-5)` is `true`, not `5`. This was the one worth
catching.
- Referenced an undeclared `min` in the final comparison instead of the
computed `ang`.
- Returned the constant `minAng` instead of the computed `ang` in both
branches.
- Needed `hour % 12` to handle `hour = 12` correctly.



## Why `hour % 12` matters (conceptual, not just "makes tests pass")

A clock only has 12 hour positions (0-11 in a repeating cycle). When
`hour = 12` is passed, physically the hour hand is in the same position as
`hour = 0` — there's no "13th position." Without the modulo, intermediate
values go outside their valid range (e.g. `hourToMin` becomes 60, but the
dial only has marks 0-59) — even in cases where the final if/else happens
to numerically self-correct, relying on that is fragile and hard to defend
if an interviewer asks about it live. Normalize at the input boundary
instead — `% 12` also correctly folds 24h-format afternoon hours (13-23)
back to their 12h equivalent for free (`13 % 12 = 1`).

## Canonical alternative (degrees per-hand, kept only as a cross-check)

```typescript
function calculateAngClock(hour: number, minute: number): number {
  const minuteDeg = minute * 6;
  const hourDeg = (hour % 12) * 30 + minute * 0.5;
  const diff = Math.abs(hourDeg - minuteDeg);
  return Math.min(diff, 360 - diff);
}
```

Mathematically equivalent to the minute-mark version above — computes each
hand's absolute angular position independently instead of going through an
intermediate unit conversion. Neither version is more performant in any
way that matters: both are **O(1) time, O(1) space** — fixed number of
arithmetic operations regardless of input, no loops, no recursion. The
difference is purely stylistic/conceptual (fewer vs. more intermediate
concepts to narrate), not algorithmic complexity.

## Talking points to narrate live

- Ask whether the inputs are hour/minute values or already degrees — the
generic `pointerA`/`pointerB` naming invites this clarifying question.
- The hour hand drifts as the minute progresses within the hour (0.5°/min,
or 1/12 minute-mark per minute) — the most common mistake if solved too
fast.
- State the complexity explicitly: **O(1)**, said out loud as "constant
time" or "O of one" (see [[technical-communication]] for how to say Big-O
notation in English).
- Generalizes cleanly to a seconds hand by reusing the same diff logic —
shows reuse instinct unprompted.

