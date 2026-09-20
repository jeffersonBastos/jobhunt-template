# Roman numeral <-> integer conversion

**Origin**: practice problem from an interview-prep study-plan's algorithmic
bank. LeetCode 13 (roman → int) and 12 (int → roman) shape.
Both directions covered since the bank item names the conversion both ways.

**Problem**: convert between Roman numerals and integers.

```typescript
romanToInt(s: string): number
intToRoman(num: number): string
```

Symbol values: `I=1, V=5, X=10, L=50, C=100, D=500, M=1000`. The
subtractive-notation quirk (`IV=4`, `IX=9`, `XL=40`, `XC=90`, `CD=400`,
`CM=900`) is the one non-obvious rule both directions hinge on.

## Roman → int

**Core idea**: walk left to right, comparing each symbol's value to the
*next* one. Normally you add. But if a smaller-value symbol comes right
before a larger one (`IV`, `IX`, ...), that's the subtractive case — so you
subtract instead.

```typescript
function romanToInt(s: string): number {
  const values: Record<string, number> = {
    I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000,
  };
  let total = 0;

  for (let i = 0; i < s.length; i++) {
    const curr = values[s[i]];
    const next = values[s[i + 1]];

    if (next && curr < next) {
      total -= curr;
    } else {
      total += curr;
    }
  }

  return total;
}
```

Trace `"IV"`: i=0, curr=1 (I), next=5 (V), curr<next → subtract → total=-1.
i=1, curr=5 (V), next=undefined → add → total=4. ✓

**Complexity**: O(n) time, single pass over the string; O(1) space.

## Int → roman

**Core idea**: greedy. Build a table of every value the subtractive
notation can represent, ordered largest to smallest — including the
subtractive pairs (`900, "CM"`, etc.) as first-class entries, not a
separate special case. Repeatedly subtract the largest value that still
fits, appending its symbol each time.

```typescript
function intToRoman(num: number): string {
  const table: [number, string][] = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];

  let result = "";

  for (const [value, symbol] of table) {
    while (num >= value) {
      result += symbol;
      num -= value;
    }
  }

  return result;
}
```

Trace `1994`: 1994≥1000→"M",994 left. 994≥900→"MCM",94 left. 94≥90→"MCMXC",4
left. 4≥4→"MCMXCIV",0 left. Result: `"MCMXCIV"`. ✓ (matches the well-known
example for 1994)

**Complexity**: O(1) — the table has a fixed 13 entries and Roman numerals
are only conventionally defined up to 3999, so the loop bound doesn't grow
with input in any meaningful sense; commonly stated as O(1) for this
reason.

## Spoken walkthrough — read this out loud

> "For Roman to integer, the key insight is the subtractive notation —
> 'IV' means four, not 'one then five.' So instead of just summing every
> symbol's value, I compare each symbol to the one right after it: if the
> current symbol is smaller than the next one, that's a subtractive pair,
> so I subtract instead of add. Otherwise I add normally. One left-to-right
> pass, order n time.
>
> For integer to Roman, I go the other way with a greedy approach. I build
> a table of every value I might need to represent, from largest to
> smallest — and importantly, I include the subtractive combinations like
> nine-hundred for 'CM' directly in that table, rather than handling them
> as a special case afterward. Then I just keep subtracting the largest
> value that still fits and appending its symbol, until nothing's left.
> Since the table size is fixed and Roman numerals only go up to a few
> thousand by convention, this is effectively constant time."

## Talking points to narrate live

- Naming the subtractive-notation rule explicitly, before writing any
  code, shows you understand the actual domain quirk rather than pattern
  matching a "convert between formats" template blindly.
- For int→roman, folding the subtractive pairs into the lookup table
  (instead of writing separate `if` branches for `CM`, `CD`, `XC`, etc.) is
  the detail that separates a clean solution from a messy one — worth
  calling out as a deliberate design choice if asked.
- If asked to validate a Roman numeral string instead of converting it,
  mention it'd reuse the same subtractive-pair awareness, just checking
  well-formedness instead of computing a value.
