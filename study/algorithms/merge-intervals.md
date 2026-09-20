# Merge overlapping intervals

**Origin**: practice problem from an interview-prep study-plan's algorithmic
bank. Direct follow-up to
[meeting-room-overlap.md](meeting-room-overlap.md) — same sort-by-start
foundation, extended to actually build the merged result instead of just
returning true/false.

**Problem**: given a list of intervals, merge all overlapping ones and
return the resulting list of non-overlapping intervals.

```typescript
mergeIntervals(intervals: [number, number][]): [number, number][]
```

Example:
- `[[1,3],[2,6],[8,10],[15,18]]` → `[[1,6],[8,10],[15,18]]`
- `[[1,4],[4,5]]` → `[[1,5]]` — **touching counts as merge-worthy here**,
  unlike `canAttendAll` where touching was fine (non-conflicting). Worth
  naming this difference out loud if asked — same sorting foundation, but
  the boundary condition flips from `<` to `<=` because the question being
  asked is different ("do these need to merge into one block" vs "do these
  conflict").

## The core idea (builds on meeting-room-overlap)

Same first move: sort by start time. Then walk through once, keeping a
running "current merged interval." For each next interval:

- If it starts at or before the current merged interval's end
  (`curr[0] <= last[1]`) — it overlaps or touches, so extend the current
  merged interval's end to `Math.max(last[1], curr[1])`.
- Otherwise, the current merged interval is finished — push it and start a
  new one from `curr`.

## A subtle bug worth catching before it happens: shared references

`[...intervals].sort(...)` only makes a **shallow copy** — a new outer
array, but the inner `[number, number]` tuples inside it are the exact
same objects as in the caller's original `intervals`. If the merge step
does `last[1] = Math.max(...)` directly on an interval taken from `sorted`,
it silently mutates one of the caller's original interval tuples as a side
effect — the caller's input data changes without them asking for it.

Fix: copy each interval (`[...sorted[0]]`, `[...curr]`) before storing it
in `result`, so mutations only ever touch the fresh copies. This is the
same category of care as copying the array before sorting in
meeting-room-overlap — don't mutate what you were handed.

## Solution

```typescript
function mergeIntervals(intervals: [number, number][]): [number, number][] {
  if (intervals.length === 0) return [];

  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const result: [number, number][] = [[...sorted[0]]]; // fresh copy

  for (let i = 1; i < sorted.length; i++) {
    const last = result[result.length - 1];
    const curr = sorted[i];

    if (curr[0] <= last[1]) {
      last[1] = Math.max(last[1], curr[1]);
    } else {
      result.push([...curr]); // fresh copy again
    }
  }

  return result;
}
```

**Complexity**: O(n log n) time (sort dominates the O(n) merge pass), O(n)
space for the result.

**Trace against the examples**:
- `[[1,3],[2,6],[8,10],[15,18]]` (already sorted): start `result=[[1,3]]`.
  `[2,6]`: 2 ≤ 3 → extend to `[1,6]`. `[8,10]`: 8 ≤ 6? no → push. `[15,18]`:
  15 ≤ 10? no → push. Final: `[[1,6],[8,10],[15,18]]`. ✓
- `[[1,4],[4,5]]`: start `result=[[1,4]]`. `[4,5]`: 4 ≤ 4 → extend to
  `[1,5]`. Final: `[[1,5]]`. ✓

## Spoken walkthrough — read this out loud

> "This is a direct extension of the meeting-room overlap problem I did
> earlier — same first move: sort the intervals by start time, since that
> guarantees I only ever need to compare an interval to the one right
> before it, not every pair.
>
> The difference here is I'm not just detecting overlap, I need to build
> the merged result. So I'll keep track of the last interval I've added to
> my result list, and for each new interval in sorted order, I check: does
> it start before or exactly when my current merged interval ends? If so,
> they belong together, so I extend the end of my current interval to
> whichever is larger — because the incoming interval might actually end
> later than what I already had. If not, the current merged interval is
> done, so I push it as final and start a new one.
>
> One thing I want to be careful about: sorting with a spread copy only
> copies the outer array, not the interval tuples inside it. If I mutate
> an interval's end value directly from the sorted array, I'd actually be
> mutating the caller's original data as a side effect, which they didn't
> ask for. So I make a fresh copy of each interval before I start editing
> it.
>
> Also worth noting: here I'm treating touching intervals — one ending
> exactly when the next starts — as something that should merge. That's a
> different call than the meeting-room problem, where touching was
> considered fine, not a conflict. Same sorting idea, different boundary
> condition, because the question being asked is different: 'should these
> become one block' versus 'do these conflict.' I'd confirm that
> assumption with the interviewer if it weren't given in the example.
>
> This runs in O of n log n time, dominated by the sort, and O of n space
> for the result."

## Talking points to narrate live

- Say explicitly that this reuses the sort-by-start foundation from the
  overlap-detection problem — showing you recognize a shared pattern
  across "different" problems is a strong signal on its own.
- Naming the shared-reference mutation risk **before** it becomes a bug,
  rather than after being asked "does this have side effects?", is a good
  habit to demonstrate unprompted.
- The `<` vs `<=` boundary difference from `canAttendAll` is worth stating
  out loud as a deliberate choice, not something to gloss over — it shows
  you're reasoning about what the problem is actually asking, not
  pattern-matching blindly from the last problem.
