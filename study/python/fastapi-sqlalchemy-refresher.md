# Python / FastAPI / SQLAlchemy refresher

Started after confirming (via research on a target company) that its
stack is Python/FastAPI/SQLAlchemy/Next.js/Postgres/Railway — see
`../../interviews/prep/<company>/company.md`'s "This specific opening"
section. Framed as JS/TS → Python translations throughout, since that's
the language everything in this whole study bank has been written in so
far — fastest way to get fluent in an adjacent language under time
pressure is mapping to what's already automatic.

## Python syntax essentials (JS/TS → Python)

- No `const`/`let` — just `x = 5`. No block scoping either: a variable
  defined inside an `if` is still visible outside it (Python scopes at the
  function level, not the block level, unlike JS's `let`).
- No `;`, no `{}` — indentation itself defines blocks. Indentation
  mistakes are a real live-coding risk, watch spacing carefully under
  pressure.
- `None` instead of `null`/`undefined` — only one "nothing" value, not two.
- `==` compares values, but unlike JS there's no implicit type coercion
  across different types — comparing a string to a number is just `False`,
  never `True` for a mismatched type. `is` compares identity (same object)
  — use `is None`, not `== None`, by convention.
- `True`/`False` (capitalized), `and`/`or`/`not` instead of `&&`/`||`/`!`.
- **Falsy values**: `0`, `0.0`, `""`, `[]`, `{}`, `set()`, `None`, `False`.
  Real gotcha coming from JS: **empty containers (`[]`, `{}`) are falsy in
  Python**, unlike JS where they're truthy. `if my_list:` behaves
  differently than you'd expect if you're used to JS.
- f-strings instead of template literals: `f"{name} is {age}"` instead of
  `` `${name} is ${age}` ``.
- Negative indexing: `result[-1]` gets the last element — equivalent to
  `result[result.length - 1]` in JS, but built into the language. Reach
  for this constantly instead of the JS-style length calculation.

## Functions

```python
def add(a: int, b: int) -> int:
    return a + b
```

Type hints are optional syntactically, but expected in professional code —
and **required in practice with FastAPI/Pydantic**, since they're what
drives automatic request validation (see below).

**The classic Python gotcha — never use a mutable default argument**:

```python
def add_item(item, items=[]):  # BUG: this list is created ONCE, shared across every call
    items.append(item)
    return items
```

Fix — default to `None`, create the mutable value inside the function body:

```python
def add_item(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items
```

Worth naming this out loud if you write any function with a default
list/dict argument — it's one of the most well-known Python footguns, and
avoiding it unprompted is a good signal.

## Comprehensions — Python's biggest idiom difference from JS

```python
squares = [x**2 for x in range(10)]             # list comprehension
evens = [x for x in range(10) if x % 2 == 0]     # with a filter
lookup = {x: x**2 for x in range(10)}            # dict comprehension
unique = {x % 3 for x in range(10)}              # set comprehension
```

Equivalent to chaining JS's `.map()`/`.filter()`, but as one expression.
Reaching for a comprehension instead of a manual loop-and-append is often
what separates code that reads as "written in Python" from code that
reads as "translated from JS."

## Common stdlib — easy points lost by not knowing these exist

- **`collections.Counter`** — count occurrences: `Counter(["a","b","a"])`
  → `{"a": 2, "b": 1}`. Saves manually building a frequency map.
- **`collections.defaultdict`** — a dict with a default value factory,
  avoids `if key not in d: d[key] = []` boilerplate:
  `d = defaultdict(list); d["x"].append(1)` just works even if `"x"` was
  never set before.
- **`enumerate(items)`** — get `(index, item)` pairs while iterating,
  instead of a manual counter: `for i, item in enumerate(items):`.
- **`zip(a, b)`** — iterate two lists in parallel as pairs.
- **`sorted(items, key=lambda x: x[0])`** — always returns a **new** list
  (unlike JS's in-place `.sort()`); `key=` takes a value-extractor
  function, not a full comparator like JS's `(a, b) => ...`.

## Async/await

Same keywords, same core idea (non-blocking I/O) as JS. Same restriction
too: `await` only works inside an `async def` function. FastAPI is
async-first — most endpoint functions are declared `async def`.

---

## FastAPI — minimal shape

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

class ItemCreate(BaseModel):
    name: str
    price: float

@app.get("/items/{item_id}")
async def get_item(item_id: int):
    if item_id not in fake_db:
        raise HTTPException(status_code=404, detail="Item not found")
    return fake_db[item_id]

@app.post("/items")
async def create_item(item: ItemCreate):
    # item is already validated against ItemCreate's schema by the time
    # this line runs
    ...
```

- **Path params** (`{item_id}`) become plain function arguments with a
  type hint — FastAPI parses and validates automatically (a non-integer in
  the URL returns a 422 for free, no manual check needed).
- **Query params** are just extra arguments not present in the path:
  `async def list_items(limit: int = 10):` reads `?limit=20`, defaults to
  10 if absent.
- **Request body** — declared as a Pydantic `BaseModel` subclass; FastAPI
  parses and validates the JSON body against that schema before your
  function body even runs. This is the single biggest FastAPI idiom to
  have fresh — validation is declarative via types, not written by hand.
- **Dependency injection** — `Depends()`, e.g.
  `def endpoint(user = Depends(get_current_user))` — used constantly for
  "give me the current user" or "give me a DB session" without each
  endpoint re-deriving it.
- **Errors**: `raise HTTPException(status_code=404, detail="...")` instead
  of manually constructing and returning an error response.

## SQLAlchemy — minimal shape (ORM style)

```python
from sqlalchemy import Column, Integer, String, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

Base = declarative_base()

class Item(Base):
    __tablename__ = "items"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    price = Column(Integer)

engine = create_engine("postgresql://...")
SessionLocal = sessionmaker(bind=engine)

def get_item(db, item_id: int):
    return db.query(Item).filter(Item.id == item_id).first()

def create_item(db, name: str, price: int):
    item = Item(name=name, price=price)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item
```

- A **model class** maps to a table; `Column` defines each field's
  type/constraints.
- A **session** (`db` above) is the unit-of-work object — all queries and
  writes go through it. `.commit()` persists, `.refresh()` reloads the
  object with DB-generated values (like the auto-incremented `id`).
- `.query(Model).filter(...)` is the classic query API — most likely what
  you'd write live. (SQLAlchemy 2.0 also has a newer `select()`-based
  style, but `.query()` is still extremely common and safe to default to.)
- **FastAPI + SQLAlchemy combined**: a session is typically injected per
  endpoint via `Depends()`:
  `def create_item(item: ItemCreate, db: Session = Depends(get_db))` —
  worth recognizing this exact combined pattern, since it's what the
  confirmed stack looks like in real code.

---

## Practice: translate an already-solved problem into Python

Fast fluency check — `mergeIntervals` (already solved in TS, see
[merge-intervals.md](../algorithms/merge-intervals.md)) translated:

```python
def merge_intervals(intervals: list[tuple[int, int]]) -> list[tuple[int, int]]:
    if not intervals:
        return []

    sorted_intervals = sorted(intervals, key=lambda x: x[0])
    result = [sorted_intervals[0]]

    for curr in sorted_intervals[1:]:
        last = result[-1]
        if curr[0] <= last[1]:
            result[-1] = (last[0], max(last[1], curr[1]))
        else:
            result.append(curr)

    return result
```

**A real language difference worth noticing, not just syntax**: Python
tuples are **immutable**. The TS version mutated `last[1]` directly in
place; here, `result[-1] = (...)` replaces the whole tuple instead, since
you can't reassign one element of a tuple. If you used lists instead of
tuples internally, in-place mutation (`last[1] = max(...)`) would work
exactly like the TS version — worth picking one deliberately and being
able to explain why, if asked.
