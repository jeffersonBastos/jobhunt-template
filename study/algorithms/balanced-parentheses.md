# Balanced parentheses (stack)

**Origin**: practice problem from an interview-prep study-plan's algorithmic
bank. LeetCode 20 shape — the canonical stack-pattern warm-up.

**Problem**: given a string containing only `(`, `)`, `{`, `}`, `[`, `]`,
determine whether it's valid — every opening bracket is closed by the same
type, in the correct order.

```typescript
isValid(s: string): boolean
```

Example:
- `"()[]{}"` → `true`
- `"(]"` → `false`
- `"([)]"` → `false` (wrong order — this is the case people get wrong)
- `"{[]}"` → `true`

## Core idea

A stack is the natural fit because "most recently opened, must be closed
first" is exactly Last-In-First-Out order. Push every opening bracket.
When a closing bracket appears, it must match whatever's on **top** of the
stack right now — if it doesn't, the string is invalid immediately.

```typescript
function isValid(s: string): boolean {
  const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  const stack: string[] = [];

  for (const char of s) {
    if (char === "(" || char === "[" || char === "{") {
      stack.push(char);
    } else {
      if (stack.pop() !== pairs[char]) {
        return false;
      }
    }
  }

  return stack.length === 0;
}
```

**Why `stack.pop() !== pairs[char]` handles the empty-stack case for
free**: popping an empty array returns `undefined`, which will never
equal any actual opening bracket — so a stray closing bracket with nothing
open correctly falls into the "invalid" branch without a separate
`stack.length === 0` guard before popping.

**Why the final `stack.length === 0` check matters**: a string like `"((("`
never fails any single comparison — nothing's ever popped and found wrong
— but it leaves unclosed brackets on the stack. Complexity check without
that final check.

**Complexity**: O(n) time (single pass), O(n) space (worst case, all
opening brackets, e.g. `"((((("`).

## Trace

`"([)]"`: push `(`. push `[`. see `)` → pop gives `[`, expected `(` for
`)` → mismatch → `false`. Correctly rejects the wrong-order case even
though every bracket type does appear an equal number of times overall.

## Spoken walkthrough — read this out loud

> "This is a classic stack problem — the reason a stack fits is that
> brackets need to close in the reverse order they were opened, which is
> exactly last-in-first-out behavior. So I push every opening bracket onto
> a stack. When I hit a closing bracket, I check whether it matches
> whatever's currently on top of the stack — if it doesn't match, or if
> the stack's already empty at that point, the string is invalid right
> away.
>
> One subtlety: popping from an empty stack returns undefined in
> JavaScript, which conveniently never equals a real bracket character, so
> I don't need a separate empty-check before popping — the mismatch
> comparison handles it naturally.
>
> The other thing worth testing explicitly: a string of only opening
> brackets, like three open parens with nothing closing them. That never
> triggers a mismatch during the loop, so I need a final check after the
> loop that the stack is completely empty — otherwise I'd incorrectly call
> it valid.
>
> This runs in linear time, one pass through the string, and linear space
> in the worst case where every character is an opening bracket."

## Talking points to narrate live

- State the LIFO justification for the stack choice explicitly — "why a
  stack" is a common live follow-up, and it's a one-sentence answer if you
  have it ready.
- Test `"([)]"` out loud specifically — it's the case that separates a
  correct solution (checks order via the stack) from a naive one (just
  counts brackets of each type).
- Mention the trailing-unclosed-brackets edge case (`"((("`) proactively —
  it's the easiest one to forget since it never fails inside the loop.
