# Meeting room overlap problem

**Origin**: practice problem from an interview-prep study-plan's algorithmic
bank — not a confirmed real question, picked for the same
"clean function, one non-obvious insight" shape as
[clock-angle](clock-angle.md). Classic shape: LeetCode 252 (Meeting Rooms).

**Problem**: given a list of meeting intervals `[start, end]`, determine
whether a person could attend all of them — i.e. whether any two intervals
overlap.

```typescript
canAttendAll(intervals: [number, number][]): boolean
```

Example:
- `[[0,30],[5,10],[15,20]]` → `false` (0-30 overlaps with 5-10)
- `[[7,10],[2,4]]` → `true`

## First attempt — bugs found (kept for the record)

Original attempt enumerated 4 explicit overlap cases (starts-inside,
ends-inside, contains, contained-by) instead of using a general test.
Worth remembering the bugs — not the syntax noise (missing braces, the
`itv`/`interval` typo), but the real logic bugs:

- **`forEach` can't return a value.** `intervals.forEach(...)` always
  returns `undefined` — `return true` inside the callback only exits that
  one callback call, never the outer function. As written, the function
  could never actually produce `true`/`false`. Needs `.some()` or a manual
  `for` loop with a real `return`.
- **Self-comparison.** The inner loop compared every interval against
  itself too — Case 1's condition is trivially true when `it === interval`.
- **No `return false`** at the end if no overlap is found.
- **Case 4 turned out to be dead code** (see verification below) — not a
  bug exactly, but worth knowing: if `it[0] > interval[0] && it[1] <
  interval[1]`, then `it[0] < it[1] < interval[1]`, which already satisfies
  Case 1's condition. Case 4 never fires on its own.

## Verified: hand-checked cases were correct

Sanity-checked the 4 manually-written cases against pivot interval
`[13,16]` using the general two-interval overlap test
(`a0 < b1 && b0 < a1`):

| pair | check | overlap? |
|---|---|---|
| `[12,14]` vs `[13,16]` | 12<16 ✓ and 13<14 ✓ | yes |
| `[14,17]` vs `[13,16]` | 14<16 ✓ and 13<17 ✓ | yes |
| `[12,17]` vs `[13,16]` | 12<16 ✓ and 13<17 ✓ | yes |
| `[14,15]` vs `[13,16]` | 14<16 ✓ and 13<15 ✓ | yes |

All 4 confirmed as overlaps — the case-by-case reasoning about *what
counts as an overlap* was correct. The bugs were in the plumbing
(`forEach`, self-comparison, `itv`), not in the overlap logic itself.

**Why the final solution only compares one number per pair**: the general
test is `prev[0] < curr[1] && curr[0] < prev[1]`. Once the array is
sorted by start, `prev[0] <= curr[0]` is guaranteed, and since
`curr[0] < curr[1]` for any valid interval, `prev[0] < curr[1]` is
**always true automatically**. Sorting doesn't remove a check — it makes
one half of the general test trivially true, so only `curr[0] < prev[1]`
still carries information.

**Why only adjacent pairs need checking, not every pair**: if
`curr[0] >= prev[1]` (no overlap with the immediate neighbor), every
interval after `curr` has a start `>= curr[0] >= prev[1]` too (sort
order), so nothing later can overlap `prev` either. "No overlap with the
immediate neighbor" transitively rules out overlap with anything earlier.

## Spoken walkthrough — read this out loud to practice

Staged like an actual live build — clarify, name the brute force, pivot to
the optimization, then write it incrementally. Don't jump straight to the
final version; each stage below is a natural checkpoint to actually type
up to before continuing.

---

**Stage 1 — restate and clarify (no code yet)**

> "So, the task is to check whether any two meetings in this list
> overlap — I want to return false the moment I find a colliding pair,
> and true if the whole schedule is conflict-free.
>
> Quick clarifying question before I start: if one meeting ends exactly
> when the next one begins — like nine to ten, and then ten to eleven —
> do we count that as an overlap, or is that back-to-back and fine? I'll
> assume back-to-back is fine unless you tell me otherwise, since that's
> the standard convention for this kind of scheduling problem."

**Stage 2 — name the brute force out loud, write the helper**

> "The most direct way to solve this is to compare every pair of
> intervals. Two intervals overlap if each one starts before the other
> one ends — that's a general test I can reuse for any pair."

```typescript
function overlaps(a: [number, number], b: [number, number]): boolean {
  return a[0] < b[1] && b[0] < a[1];
}
```

> "If I called this for every pair in the list, that's order n-squared,
> since I'm comparing every meeting against every other meeting."

**Stage 3 — pivot to the optimization**

> "But I can do better than checking every pair. If I sort the meetings
> by start time first, an overlap can only happen between two meetings
> that end up *next to each other* in that sorted order — because once
> sorted, if a meeting doesn't overlap the one right before it, nothing
> even earlier in the list can overlap it either. So I only need one
> pass after sorting, instead of comparing every pair. Sorting is order
> n log n, the pass is order n, so the total is order n log n, dominated
> by the sort."

```typescript
function canAttendAll(intervals: [number, number][]): boolean {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);

  // next: walk through sorted, compare each interval to the one right before it
}
```

**Stage 4 — fill in the scan, narrating each line**

> "Now I walk through the sorted list starting from the second element,
> and compare each one to its immediate predecessor. Since I've already
> sorted by start time, I know the previous interval never starts after
> the current one — so the only thing left to check is whether the
> current meeting starts before the previous one ends. If it does,
> that's an overlap, and I can return false right away."

```typescript
function canAttendAll(intervals: [number, number][]): boolean {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (curr[0] < prev[1]) {
      return false; // curr starts before prev ends -> overlap
    }
  }

  return true;
}
```

**Stage 5 — test out loud, then state complexity**

> "Let me trace it against the examples. First one: zero-to-thirty,
> five-to-ten, fifteen-to-twenty. Sorted, zero-to-thirty comes first.
> Comparing five-to-ten against it: five is less than thirty, so that's
> an overlap — return false. Matches the expected result.
>
> Second one: seven-to-ten and two-to-four. Sorted: two-to-four, then
> seven-to-ten. Seven is not less than four, so no overlap — return
> true. Matches too.
>
> One edge case worth naming: an empty list or a single meeting should
> just return true trivially, since there's nothing to compare — the
> loop simply never runs.
>
> Overall this runs in O(n log n) time, dominated by the sort, and O(n)
> extra space, since I copied the array before sorting instead of
> mutating the caller's original order — that's a deliberate choice, not
> an accident, in case the caller cares about the original ordering."

---

## Final solution

```typescript
function canAttendAll(intervals: [number, number][]): boolean {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (curr[0] < prev[1]) {
      return false;
    }
  }

  return true;
}
```

**Complexity**: O(n log n) time (sort dominates the O(n) scan), O(n) space
for the sorted copy.

## Talking points to narrate live

- Ask the touching-boundary question before coding — it's a real ambiguity,
  not a stalling tactic, and shows you think about edge cases upfront.
- Name the brute force first, even briefly, before jumping to the
  optimized version — shows you know the naive approach and chose to
  improve it, rather than only knowing one way to solve it.
- State explicitly *why* sorting reduces the check to one comparison
  instead of two (see derivation above) if asked to justify it — this is
  the part most likely to get a live follow-up question.
- Natural extension if asked "what if I also need to know how many rooms
  are needed": this becomes LeetCode's Meeting Rooms II — same sorting
  idea, but tracking concurrently active meetings (e.g. with a min-heap of
  end times) instead of just detecting the first conflict. Good to
  mention unprompted if there's time, shows you see where this
  generalizes.
