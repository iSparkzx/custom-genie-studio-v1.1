# Custom Genie studio: architecture

**Status:** draft for review · 2026-10-10

## Goal

One design studio for every customizable Custom Genie product. Today the studio supports the domed sticker sheets.
BigCommerce lists **57 live customizable products** in three families, all currently on the Doogma builder:

| Family | BigCommerce template | Live products | Examples |
|---|---|---|---|
| Stickers & labels | `stickerprod` | 30 | sticker sheets (domed, glossy, matte, metallic, fluorescent, clear, glow, reflective, removable), die cut, kiss cut, roll labels, vinyl lettering, window clings |
| Name badges | `badgeprod` | 14 | plastic, prestige, borderless, engraved, reusable, executive metal, wooden, chalkboard, round, oval |
| Pens, pencils & notebooks | `penprod` | 13 | Derby, Contour, Electra, Sparta, Value Stick, bamboo, silver executive, pencils, printed notebook |

Full list: [`products/index.json`](../products/index.json). Findings from the first pull:
[`docs/findings/2026-10-10-bigcommerce-price-check.md`](findings/2026-10-10-bigcommerce-price-check.md).

## Principles

1. **One engine, products as data.** The editor, Genie AI, print check and Review & Print are shared. What differs per
   product lives in a product definition (`products/<family>/<product>.json`). A fix to the engine reaches every product.
2. **BigCommerce is the source of truth** for products, options, sizes, prices and quantity discounts. The studio never
   keeps its own price table: what the shopper sees must equal what the cart charges.
3. **Read-only access to BigCommerce.** The pull uses a store-level API account with read-only scopes and a client that
   can only send GET. Nothing in this repo can change the store.
4. **Orders reach production the way they do today.** The studio fills the same BigCommerce modifiers the Doogma builder
   fills (Saved Design, Saved Design Link, Saved Print Output, Special Design Instructions, Review), so fulfillment
   doesn't change.
5. **Nothing guessed is presented as fact.** Anything not confirmed by BigCommerce or the current studio is listed in a
   definition's `assumptions` or `todo`.
6. **The public repo holds public data only.** No cost prices, sales figures, inventory or credentials.

## How data flows

```
BigCommerce (read-only API account)
   │  scripts/bigcommerce/pull-catalog.mjs        GET only, token from .env.bigcommerce (local, gitignored)
   ▼
.cache/bigcommerce/*.json                         raw pull (gitignored)
   │  scripts/bigcommerce/build-definitions.mjs   + products/families/<family>.json (hand-written)
   ▼
products/<family>/<product>.json, products/index.json   (committed, reviewed in PRs)
   │
   ├──▶ studio      reads the definition for the product page it's on: sizes, shapes, options, prices, checks, previews
   ├──▶ Print MCP   list_products / get_quote can serve the same definitions (docs/print-mcp-spec-v0.2.md)
   └──▶ cart        definition.cart lists the BigCommerce option and modifier ids to fill
```

Prices in the definitions are a snapshot (`pricing.pulled_at`). On the live store the studio should read current prices
from the storefront itself; the snapshot covers development and anything that runs without the store.

## Product definition

Format: [`products/schema/product-definition.schema.json`](../products/schema/product-definition.schema.json).
Overview: [`products/README.md`](../products/README.md).

| Part | From | Holds |
|---|---|---|
| identity | BigCommerce | id, name, family, type, group, live or hidden, `studio_status` (built or planned) |
| size | BigCommerce | `free` (range, priced at BigCommerce size steps, rounding up), `preset` (named sizes) or `fixed` |
| choices | BigCommerce | shapes, corners, materials, background and border colors, magnet or pin, pen and notebook colors, fonts, text fields, bulk names |
| pricing | BigCommerce | every variant with its price, quantity discounts, price grid by size |
| cart | BigCommerce | option and modifier ids and names, required modifiers |
| editor, checks, previews | family file | editor mode, print-check thresholds, preview list, per-type settings (dome, sheet size, roll) |
| assumptions, todo | family file + generator | open items for Carlos, production or Doogma |

## Families

- **Stickers & labels** (`editor.mode: free_layout`): the current studio. Types set the format (`sheet`, `single`,
  `roll`, `cut_vinyl`, `window_cling`), dome on or off, white ink, and whether white prints clear on metallic.
- **Name badges** (`template_layout`): name, title, badge text and logo placed by layout; sizes, border and background
  colors, magnet or pin; bulk names from an uploaded names file, with a preview of every badge.
- **Pens, pencils & notebooks** (`imprint`): one or two text lines and a logo inside a small imprint area per model;
  barrel or cover color; printed or engraved.

## Target code layout

The current studio is built from `studio-src/src/*` into one file (`public/index.html`). The plan is to move it, one
step at a time, to:

```
studio-src/            (today)            →  packages/core          editor, Genie, checks, Review & Print
                                             packages/families/*    sticker, badge, pen behavior and previews
                                             packages/bigcommerce   product + price loading, add to cart
products/              definitions (this PR)
scripts/bigcommerce/   read-only pull + generator (this PR)
server.mjs             Genie AI + later proofs and print files
tests/                 browser tests (the scripted checks used during development)
```

## Phases

| # | Work | Status |
|---|---|---|
| 0 | Builder fixes (PR #3) | open for review |
| 1 | Price check and product definitions from BigCommerce | **this PR** |
| 2 | Studio reads the Domed White definition instead of hard-coded settings; prices from BigCommerce | next |
| 3 | Domed Color, Silver, Gold, then the other sticker sheets | |
| 4 | Add to cart fills the same modifiers as Doogma | needs production input |
| 5 | Name badges family | needs badge dimensions and layouts |
| 6 | Pens family | needs imprint areas |

Every phase is its own PR. Nothing is deployed and the live store isn't touched without Carlos's explicit approval.

## Open questions

1. **Prices:** BigCommerce's own size grid has 19 places where a bigger sticker costs less (see findings). Intended?
2. **Shapes:** the studio offers Square and Oval; BigCommerce's Shape modifier doesn't. Keep and map, or remove?
3. **Production files:** what does production need from "Saved Print Output" for each product type?
4. **Badges:** real dimensions for size1 to size4, and what each layout1 to layout9 looks like.
5. **Pens:** imprint area, colors and method per model.
6. **Scope and order:** do vinyl lettering and window clings come later? Prioritize by sales volume?
7. **Hidden drafts:** should FlexStyle emblems, the acrylic ornament, can cooler, mouse pad or journal become customizable?
