# Flatten a nested structure (recursion)

**Origin**: practice problem from an interview-prep study-plan's algorithmic
bank. Classic recursion warm-up — arbitrary-depth nested
arrays into a single flat array.

**Problem**: given an array that may contain other arrays nested to any
depth, return a single flat array with all values in order.

```typescript
flatten(arr: any[]): any[]
```

Example:
- `[1, [2, [3, 4], 5], 6]` → `[1, 2, 3, 4, 5, 6]`
- `[[1, 2], [3, [4, [5]]]]` → `[1, 2, 3, 4, 5]`

## Core idea

For each element: if it's itself an array, recursively flatten it first,
then splice the result in. If it's a plain value, just add it. The
recursion handles arbitrary depth for free — no need to know or track how
deep the nesting goes ahead of time.

```typescript
function flatten(arr: any[]): any[] {
  const result: any[] = [];

  for (const item of arr) {
    if (Array.isArray(item)) {
      result.push(...flatten(item));
    } else {
      result.push(item);
    }
  }

  return result;
}
```

**Complexity**: O(n) time, where n is the total number of elements across
every nesting level (each value gets visited once); O(d) additional space
for the recursion call stack, where d is the maximum nesting depth — worth
distinguishing from the O(n) space of the output array itself, since
they're bounded by different things (total element count vs. how deep the
nesting goes).

## Trace

`[1, [2, [3, 4], 5], 6]`:
- `1` → plain value → push `1`.
- `[2, [3, 4], 5]` → array → recurse:
  - `2` → push `2`.
  - `[3, 4]` → array → recurse → `[3, 4]` → spread in.
  - `5` → push `5`.
  - returns `[2, 3, 4, 5]`.
- spread `[2, 3, 4, 5]` into result.
- `6` → plain value → push `6`.
- Final: `[1, 2, 3, 4, 5, 6]`. ✓

## Spoken walkthrough — read this out loud

> "This is a natural fit for recursion because the problem is
> self-similar — flattening a nested array is the same operation as
> flattening its inner arrays, just at a smaller scale. So for each
> element, I check: is this itself an array? If so, I recursively flatten
> it first, and spread the result into my output. If it's just a plain
> value, I push it directly.
>
> The nice part is I never need to know the nesting depth ahead of time —
> the recursion naturally bottoms out once it hits a level with no more
> nested arrays, and unwinds back up, flattening one level at a time.
>
> In terms of complexity: every individual value gets visited exactly
> once, so that's linear time in the total number of elements. Space is a
> bit more nuanced — the output array is linear in the number of elements,
> but there's also the recursion call stack itself, which grows with how
> *deep* the nesting goes, not how many elements there are. So if I had a
> very deep but narrow structure, the call stack could be the bottleneck
> even with relatively few total values."

## Talking points to narrate live

- Explicitly separate "space for the output" from "space for the call
  stack" when asked about complexity — conflating them is a common
  imprecision worth avoiding out loud.
- If asked about very deep nesting (risk of stack overflow), mention the
  iterative alternative: use an explicit stack/array as a worklist instead
  of the call stack, pushing nested arrays onto it and popping until
  empty — same idea, without relying on the language's call stack depth
  limit. Good "what would you do differently at scale" answer if it comes
  up.
- `Array.isArray()` specifically (not `typeof item === "object"`) is the
  correct check — `typeof null === "object"` too, which would be a subtle
  bug if the input could contain `null` values.
