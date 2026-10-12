#!/usr/bin/env node
// Read-only BigCommerce catalog pull for Custom Genie.
//
// - Sends GET requests only. The request helper has no way to send anything else.
// - Reads the store hash and token from .env.bigcommerce in the repo root (gitignored, local only).
// - Never prints the token. Writes raw JSON to .cache/bigcommerce/ (gitignored).
//
// Usage: node scripts/bigcommerce/pull-catalog.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ENV_FILE = join(ROOT, ".env.bigcommerce");
const OUT = join(ROOT, ".cache", "bigcommerce");

if (!existsSync(ENV_FILE)) {
  console.error("Missing .env.bigcommerce in the repo root (BIGCOMMERCE_STORE_HASH, BIGCOMMERCE_ACCESS_TOKEN).");
  process.exit(1);
}
const env = Object.fromEntries(readFileSync(ENV_FILE, "utf8").split(/\r?\n/)
  .filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const HASH = env.BIGCOMMERCE_STORE_HASH, TOKEN = env.BIGCOMMERCE_ACCESS_TOKEN;
if (!HASH || !TOKEN) { console.error("BIGCOMMERCE_STORE_HASH or BIGCOMMERCE_ACCESS_TOKEN is empty in .env.bigcommerce."); process.exit(1) }

/** The only function that talks to BigCommerce. GET only, by construction. */
async function bcGet(path) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`https://api.bigcommerce.com/stores/${HASH}${path}`, {
      method: "GET", headers: { "X-Auth-Token": TOKEN, Accept: "application/json" },
    });
    if (res.status === 429) { await new Promise(r => setTimeout(r, 1500 * (attempt + 1))); continue }
    if (res.status === 204) return null;
    if (!res.ok) throw new Error(`GET ${path.split("?")[0]} failed: HTTP ${res.status}`);
    return res.json();
  }
  throw new Error(`GET ${path.split("?")[0]} rate limited`);
}
async function getAll(path) {
  const rows = [];
  for (let page = 1; ; page++) {
    const j = await bcGet(`${path}${path.includes("?") ? "&" : "?"}limit=250&page=${page}`);
    rows.push(...(j?.data || []));
    const p = j?.meta?.pagination;
    if (!p || page >= p.total_pages) return rows;
  }
}

mkdirSync(OUT, { recursive: true });
const save = (name, data) => writeFileSync(join(OUT, `${name}.json`), JSON.stringify(data, null, 1));

const products = await getAll("/v3/catalog/products?include=variants,modifiers,options,custom_fields,bulk_pricing_rules,primary_image,images");
save("products", products);
save("categories", await getAll("/v3/catalog/trees/categories"));
const store = await bcGet("/v2/store");
save("store", { name: store.name, domain: store.domain, currency: store.currency, weight_units: store.weight_units, dimension_units: store.dimension_units });
save("pulled", { pulled_at: new Date().toISOString(), store_hash: HASH, products: products.length });

console.log(`Pulled ${products.length} products from ${store.name} (${store.domain}) into .cache/bigcommerce/`);
