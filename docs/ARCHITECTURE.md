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

Prices in the definitions are a snapshot (`pricing.pulled_at`). Today `studio-src/build.py` embeds the definitions of
the products the studio supports (`studio_status: built`), so a price change in BigCommerce reaches the studio after
the pull, the generator and the build are re-run. On the live store the studio should read current prices from the
storefront itself; the snapshot covers development and anything that runs without the store.

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
tests/                 browser tests (tests/price-check.mjs: studio prices vs BigCommerce)
```

## Phases

| # | Work | Status |
|---|---|---|
| 0 | Builder fixes (PR #3) | open for review |
| 1 | Price check and product definitions from BigCommerce | PR #4 |
| 2 | Studio reads the White, Silver and Gold definitions instead of hard-coded settings; prices and product codes from BigCommerce | PR #5 |
| 3 | Domed Color, Silver, Gold, then the other sticker sheets | done in PR #8 (all 30 sticker products) |
| 4 | Add to cart fills the same modifiers as Doogma | needs production input |
| 5 | Name badge studio (`/badges.html`): all 14 badges, Doogma layouts 1 to 7, team names, Genie logo | PR #6; real badge sizes still needed |
| 6 | Product pages (`/p/<product>.html`) with Start designing: Genie Studio Advanced and Genie Studio Basic | PR #7 |
| 7 | Genie Studio Advanced designs every product: 30 stickers, 14 name badges, 13 pens, pencils and notebooks, with all their BigCommerce variants | PR #8 |
| 8 | Genie Studio Basic for stickers | |
| 9 | Genie Studio Basic for pens | needs imprint sizes |

Every phase is its own PR. Nothing is deployed and the live store isn't touched without Carlos's explicit approval.

## Decisions

| Date | Question | Decision (Carlos) |
|---|---|---|
| 2026-10-10 | BigCommerce's size grid has 19 places where a bigger sticker costs less | **Intended.** Keep the prices as they are; the studio uses BigCommerce's prices exactly. |
| 2026-10-10 | The studio offers Square and Oval; the domed sheets' BigCommerce Shape modifier doesn't | **Keep both shapes.** The cart mapping is still to be decided. |

## Open questions

1. **Square and Oval in the cart:** which BigCommerce Shape value each one sends. Options:
   - **A.** Carlos adds "Square" and "Oval" as values of the Shape modifier on the four domed products in BigCommerce, so orders say exactly what was ordered. Needs a store change, which only Carlos makes.
   - **B.** No store change: Square sends "Rectangle" (width = height, so it's exact) and Oval sends "Custom Shape" (the oval cut line travels in the print file).
2. **Production files:** what "Saved Print Output" must contain for each product type. *Not available yet.*
3. **Badges:** real dimensions for size1 to size4, and what each layout1 to layout9 looks like. *Not available yet.*
4. **Pens:** imprint area, colors and method per model. *Not available yet.*
5. **Scope and order:** do vinyl lettering and window clings come later? Prioritize by sales volume?
6. **Hidden drafts:** should FlexStyle emblems, the acrylic ornament, can cooler, mouse pad or journal become customizable?

Phases that depend on items 2 to 4 (add to cart, badges, pens) wait for that information. Nothing is built on guesses.

## Genie Studio Advanced: one studio, every product (PR #8)

The studio page (`public/index.html`, built by `studio-src/build.py`) embeds every product with `studios.advanced` on.
A design carries its product (`D.pid`) and the shopper's option choices (`D.opt`, by BigCommerce option role).

* **Price and product code**: the BigCommerce variant that matches the choices. Free sizes round up to the next size
  step. Nothing is computed from a table of our own. `tests/price-check.mjs` checks every variant of every product.
* **What the panel shows**: the product's own options. Stickers: shape, free size, finish/material/color siblings,
  background. Badges: preset sizes, background, border, back. Pens and notebooks: imprint area, barrel or cover color.
  Options BigCommerce can't sell together are disabled; a product with ordering turned off can still be previewed, and
  Review & Print says it can't be ordered.
* **How it looks on screen**: `products/families/<family>.json` `studio`: sticker material looks and groups, badge
  shape, frame and material, pen imprint areas and colors. Engraving and cut vinyl show the design in one color.
* **Previews**: 3D and On sheet only on domed sheets; object scenes only for stickers small enough to sit on them.
* **Templates**: sticker templates, plus badge, pen and notebook templates built on the product's own size.
* **Drafts** are saved per family, so a sticker in progress is not squeezed onto a pen.

Still placeholders (marked in the data and shown to shoppers as approximate): badge sizes size1 to size4 except the
named ones, every pen, pencil and notebook imprint area, and the Domed Color look.
