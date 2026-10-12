# Product definitions

One JSON file per customizable Custom Genie product. The studio (and later the Print MCP `list_products` tool) reads
these instead of hard-coding product settings: `studio-src/build.py` embeds every definition marked
`studio_status: "built"` (today Domed White, Silver and Gold), and the studio takes its sizes, prices, quantity
discounts and product codes from them. The badge studio is built the same way by `studio-src/build_badges.py`, which
also reads `products/families/badge.json` (shape, material and size per badge) and
`products/families/badge-layouts.json` (the Doogma layout masters). After a new pull, re-run the generator and both
builds, then `node tests/price-check.mjs` and `node tests/badge-check.mjs`.

| Path | What it is | Edited by |
|---|---|---|
| `families/sticker.json`, `badge.json`, `pen.json` | What BigCommerce doesn't store: editor mode, print checks, previews, per-type settings (dome, sheet size, roll), assumptions and to-dos | hand |
| `sticker/*.json`, `badge/*.json`, `pen/*.json` | One definition per live product | **generated**, do not edit |
| `index.json` | List of all definitions | generated |
| `schema/product-definition.schema.json` | The format | hand |

## Regenerate

```bash
node scripts/bigcommerce/pull-catalog.mjs        # read-only BigCommerce pull into .cache/bigcommerce/ (gitignored)
node scripts/bigcommerce/build-definitions.mjs   # writes products/<family>/*.json and products/index.json
```

`pull-catalog.mjs` needs `.env.bigcommerce` in the repo root with `BIGCOMMERCE_STORE_HASH` and
`BIGCOMMERCE_ACCESS_TOKEN` (a store-level API account with read-only scopes). That file is gitignored and stays on
the machine that runs the pull. The script only sends GET requests.

Add `--include-hidden` to the build to also generate hidden products (tests, copies).

## What a definition holds

- **Identity:** `id` (from the URL slug), `name`, `family`, `type` (BigCommerce product type), `group`, `status`, `studio_status`.
- **BigCommerce:** product id, URL, SKU.
- **Size:** `free` (width and height in a range, priced at BigCommerce's size steps, rounding up), `preset` (named sizes)
  or `fixed`.
- **Choices:** shapes, corners, materials, background and border colors, attachments (magnet or pin), product colors
  (pen barrel, notebook), fonts, text fields, bulk names.
- **Pricing:** every variant with its price, the quantity discounts (bulk pricing rules) and, for free-size products,
  a `price_grid` by size. These are the storefront prices, pulled on `pricing.pulled_at`.
- **Cart:** BigCommerce option and modifier ids and names (the fields the Doogma builder fills today), and which
  modifiers BigCommerce requires.
- **Studio:** editor mode, print checks, previews, cut border widths.
- **`assumptions` and `todo`:** anything not confirmed by BigCommerce or the current studio is listed here, never
  presented as fact.

## Left out on purpose

The repo is public. Definitions only contain what a shopper can already see on customgenie.com plus the ids needed to
build a cart line. Cost prices, units sold, inventory, Doogma ids and other internal fields are never written.
