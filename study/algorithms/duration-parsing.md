# Duration string parsing

**Origin**: a practice problem from an interview-prep study plan's algorithmic
bank. Written up directly (not self-derived) — solved with a regex-free
split+slice approach, which is arguably the more defensible live-interview
choice anyway if regex isn't in your own toolkit yet (see talking points).

**Problem**: given a duration string like `"2h 30m"`, parse it into total
minutes.

```typescript
parseDuration(duration: string): number
```

Examples:
- `"2h 30m"` → `150`
- `"45m"` → `45`
- `"3h"` → `180`

## The core idea

Don't assume a fixed number of digits for the number part (`9m` vs `09m`,
`3h` vs `12h`). Instead: split the string into tokens on whitespace, and
for each token, the **unit is always the last character**, and the
**number is everything before it** — regardless of how many digits it has.

```
"30m"  -> unit = "m", number = "30"
"9m"   -> unit = "m", number = "9"
"125m" -> unit = "m", number = "125"
```

This avoids regex entirely and avoids hardcoding character positions —
the same fragility trap as the meeting-room 4-case enumeration
(see [meeting-room-overlap.md](meeting-room-overlap.md)): don't build logic
around one assumed input shape when a general rule handles all shapes.

## Solution

```typescript
function parseDuration(duration: string): number {
  const tokens = duration.trim().split(" ").filter((t) => t.length > 0);
  let totalMinutes = 0;

  for (const token of tokens) {
    const unit = token.slice(-1);
    const value = parseInt(token.slice(0, -1), 10);

    if (unit === "h") {
      totalMinutes += value * 60;
    } else if (unit === "m") {
      totalMinutes += value;
    }
  }

  return totalMinutes;
}
```

**Complexity**: O(n) time, where n is the length of the string (each
character is visited a constant number of times across the split and the
per-token slicing); O(n) space for the tokens array.

## Spoken walkthrough — read this out loud

> "So the task is to turn a duration string like '2 h, 30 m' into a total
> number of minutes. My first instinct is to ask: is the number always
> zero-padded, like '09m', or could it be a single digit? I don't know, so
> I'll design around not needing to know — I won't rely on fixed character
> positions at all.
>
> Instead, I'll split the string on whitespace, which gives me chunks like
> '2h' and '30m'. For each chunk, the unit is always the very last
> character — 'h' or 'm' — and everything before that last character is
> the number, no matter how many digits it has. That's more robust than
> assuming a fixed width.
>
> Then I just loop through the chunks: if the unit is hours, I multiply the
> number by sixty and add it to the total; if it's minutes, I add it
> directly. This also handles the case where only one unit is present —
> like just '45m' with no hours — since I'm not assuming there are always
> two chunks, I just process however many chunks actually exist.
>
> One assumption I'm making out loud: exactly one space between the number
> and the unit, and between chunks — if the input format were messier, I'd
> want to confirm that with whoever's giving me the spec.
>
> This runs in linear time, O of n, since I touch each character a
> constant number of times between the split and the per-chunk slicing."

## Talking points to narrate live

- Explicitly naming "I don't know regex well enough to trust it live" is a
  perfectly fine thing to say if it comes up — choosing the approach you
  can execute correctly under pressure, and explaining *why*, is a
  stronger signal than reaching for a fancier tool you're shaky on.
- The "unit is the last character, number is everything else" trick
  generalizes to any unit-suffixed value parsing (weights, currencies,
  file sizes like "10kb") — worth naming as a reusable pattern if asked
  for a related follow-up.
- If asked to extend it: negative durations, or additional units like `s`
  for seconds or `d` for days, both slot into the same `if`/`else if`
  chain without changing the parsing strategy — good "cheap to extend"
  framing to reuse from the architecture cheat sheet.
