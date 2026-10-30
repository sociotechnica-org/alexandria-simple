# Jobs-to-be-Done product map: schema

One data file per product. Both pages (the jobs map and, later, the roadmap
view) render from it. Nothing about pixels lives here; position is only ever
a side (in / waystation / hub / out) and an order within that side.

The file is JSON so the viewer can read it directly and so a future
`docs/alexandria/` home needs no conversion. First instance: `sorare.jobs.json`.

## Decisions this schema encodes

1. **Jobs and features are a matrix, not a tree.** A feature lists the cells it
   serves; a cell never owns a feature.
2. **The unit between job and feature is a cell: job × dimension.** Dimensions
   are `better`, `cheaper`, `faster`. A cell can be `applies: false`.
3. **The decision is a first-class row.** The hub (play, sell or seal) is a
   `job` with `kind: "decision"`, so it gets cells and features like any job.
4. **Time is the product's own calendar.** `phases` are the season's phases
   and events, each with a window. A feature's `dueBy` is a phase id, meaning
   "must exist before this phase starts".
5. **Served status is evidence, not opinion.** A cell is `served` or `partial`
   only if a feature with `status: shipped` or `partial` points at it. `open`
   is derived, not typed.
6. **Importance is the owner's number.** `importance` on a job is `null` until
   the owner sets it. Priority is computed, never stored.

## `cards` (on stocks, jobs, flows, phases)

A list of library card names (`Mechanic - Sealing`) the item rests on. The library is
the provenance layer: a card carries the source, confidence and `as_of` date, so the
map inherits them instead of restating facts. `check.py` fails on a name that doesn't
resolve to a file in the library.

## Top level

| key | what |
|---|---|
| `meta` | product, goal, goal unit, owner, version, `lockedModel` link, `repos`, `library` |
| `stocks` | what you hold; grouped `cards`, `money`, `rewards` |
| `jobs` | the 5–9 actions plus the decision |
| `flows` | arrows between jobs, the hub and the wallet; colour = what moves |
| `phases` | the calendar: `kind: season` (sequential) or `kind: event` (overlapping) |
| `cells` | job × dimension opportunities |
| `features` | tools, shipped or proposed, each with the cells it serves |
| `priority` | the formula and its inputs; no computed values stored |

## `stocks[]`

`id`, `name`, `group` (`cards | money | rewards`), `notes`, and optional
`traits`: `exposure` (cash value moves on its own), `craftOnly`,
`sorareOnly` (only spendable with Sorare itself), `onCard` (travels with a
card, not held in the wallet).

## `jobs[]`

| field | values |
|---|---|
| `id` | short slug, stable; this is the join key for board items and features |
| `kind` | `job` or `decision` |
| `name` | the action, as the tile headline |
| `side` | `in` (adds cards), `waystation` (changes cards in place), `hub`, `out` (cards go to work or leave) |
| `order` | top-to-bottom within the side |
| `ownership` | `first` / `second` / `null`: what kind of card the job produces |
| `cardsReturn` | `true` if cards come back (two-headed arrow), `false` if gone, `null` if n/a |
| `venue` | optional label shared by tiles that are the same place, e.g. `Manager marketplace` |
| `summary` | the hover text |
| `importance` | 1–5 or `null` (owner sets) |
| `modelRoom` | anchor into the dynamic model page |
| `page` | the product page that serves this job, or `null` |

## `flows[]`

`id`, `from`, `to` (job id, `hub`, or `wallet`), `carries` (stock ids),
`ownership` (`first | second | null`), `direction` (`one | both`), `label`,
`optional` (dashed, e.g. the vault bonus). Rendering colour is derived from
the first stock's group.

## `phases[]`

`id`, `kind` (`season | event`), `name`, `basis` (where the phase comes from: a
published window, or last season's pattern; the calendar is a hypothesis, not a schedule),
`window` `{ start, end }` as ISO dates
or `null` with a `windowNote` when the date is unknown, `rule` (the one-line
play for that phase), `jobs` (ids lit in this phase), `priceDirection`
(`dip | inflate | crash | drift | null`), `status` (`past | now | next | later`).

## `cells[]`

`job`, `dimension`, `applies` (bool), `means` (what better / cheaper /
faster would look like for this job), `gap` (what's missing today, free text).
Status is derived from `features[].serves`.

## `features[]`

| field | values |
|---|---|
| `id` | slug |
| `name` | |
| `status` | `shipped | partial | proposed` |
| `serves` | list of `{ job, dimension, coverage: full | partial }` |
| `where` | repo paths for shipped/partial; `[]` for proposed |
| `dueBy` | phase id or `null` |
| `page` | URL of the page in the real product that does this, or `null` |
| `how` | `{ better, cheaper, faster }`: one sentence each on how it beats doing the job by hand (built) or what it would do (proposed). This is the writing the room shows; priority is shown by order, not stated. |
| `issues` | GitHub issue URLs in the product repo that deliver it; the kanban lives there, not here |
| `evidence` | `audited | inferred`: whether a human checked the code |
| `note` | |

## `priority`

Not computed in the file. The formula, so every view agrees:

```
value(feature)   = Σ over served cells of importance(job) × weight(dimension)
urgency(feature) = 1 + boost if dueBy phase's status is `next`, 0 if `past` (status is set by the owner; dates are display)
gap(feature)     = share of its served cells currently `open`
priority         = value × urgency × gap
```

`weights` and `boost` are inputs in the file. Change them there, not in a page.
