#!/usr/bin/env node
// Build product definitions from the BigCommerce pull (.cache/bigcommerce) + the hand-written family files
// (products/families/*.json). Writes products/<family>/<slug>.json and products/index.json.
//
// What goes in: only what a shopper can already see on customgenie.com (names, options, sizes, prices,
// quantity discounts, SKUs) plus BigCommerce IDs needed to build a cart line.
// What stays out: cost prices, units sold, inventory, Doogma IDs and every other internal field.
//
// Usage: node scripts/bigcommerce/build-definitions.mjs [--include-hidden]
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CACHE = join(ROOT, ".cache", "bigcommerce");
const OUT = join(ROOT, "products");
const includeHidden = process.argv.includes("--include-hidden");
const readJSON = p => JSON.parse(readFileSync(p, "utf8"));

if (!existsSync(join(CACHE, "products.json"))) { console.error("Run scripts/bigcommerce/pull-catalog.mjs first."); process.exit(1) }
const products = readJSON(join(CACHE, "products.json"));
const pulled = readJSON(join(CACHE, "pulled.json"));
const FAMILY_BY_TEMPLATE = { stickerprod: "sticker", badgeprod: "badge", penprod: "pen" };
const families = Object.fromEntries(Object.values(FAMILY_BY_TEMPLATE).map(f => [f, readJSON(join(OUT, "families", `${f}.json`))]));

const cf = (p, name) => p.custom_fields.find(f => f.name === name)?.value;
const slugOf = p => p.custom_url.url.split("/").filter(Boolean).pop();
// Store descriptions are shown on the prototype product pages: keep the store's copy, drop anything executable.
const clean = h => String(h || "").replace(/<(script|style|iframe|object|embed|form)[\s\S]*?<\/\1>/gi, "").replace(/<(script|iframe|object|embed|link|meta)[^>]*>/gi, "")
  .replace(/\s(on\w+|style|class|id)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "").replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, "$1=\"#\"").replace(/<img /gi, '<img loading="lazy" ').trim();
const idOf = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const num = s => Number.parseFloat(s);

const OPTION_ROLES = [
  [/^SH Range/i, "height"], [/^SW Range/i, "width"], [/^Material$/i, "material"], [/^Size$/i, "size"],
  [/^Border Color$/i, "border_color"], [/^Background Color$/i, "background_color"], [/^(Back )?Attachment$/i, "attachment"],
  [/^Pen Color$/i, "pen_color"], [/^Notebook Color$/i, "notebook_color"], [/^Grip Color$/i, "grip_color"], [/^Color$/i, "color"],
];
const optionRole = name => (OPTION_ROLES.find(([re]) => re.test(name)) || [])[1] || null;
const MODIFIER_ROLES = {
  "Saved Design": "saved_design", "Saved Design Link": "saved_design_link", "Saved Print Output": "saved_print_output",
  "Special Design Instructions": "special_instructions", "Review": "proof_approval", "Order File Disclaimer": "order_file_disclaimer",
  "Additional Names - File Upload": "bulk_names_file", "Sticker Height": "sticker_height", "Sticker Width": "sticker_width",
  "Shape": "shape", "Rounded Corners": "rounded_corners", "Background Color": "background_mode", "Background Image": "background_image",
  "Background Size": "background_size", "Image": "image", "Uploaded Logo Size": "logo_size", "Text": "text_1", "Text Line 2": "text_2",
  "Name": "name", "Title": "title", "Badge Text": "badge_text", "Select Layout": "layout", "Alignment": "alignment", "Size": "size_field",
  "Font1": "font_1", "Font2": "font_2", "Font3": "font_3", "Font1size": "font_1_size", "Font2size": "font_2_size", "Font3size": "font_3_size",
  "Customcolor1": "color_1", "Customcolor2": "color_2", "Customcolor3": "color_3", "Custom Color": "custom_color", "Color": "ink_color",
};
const modifierRole = name => MODIFIER_ROLES[name] || (/Placement|vertical align|Layout Data|Fit mode|Readability/i.test(name) ? "layout_data" : null);

function build(p) {
  const family = FAMILY_BY_TEMPLATE[cf(p, "bctemplate")];
  const fam = families[family];
  const type = cf(p, "dp_product") || null;
  const typeCfg = (fam.types || {})[type] || {};
  const slug = slugOf(p), id = idOf(slug);

  const options = p.options.map(o => ({
    id: o.id, name: o.display_name, type: o.type, role: optionRole(o.display_name),
    values: o.option_values.map(v => ({ id: v.id, label: v.label })),
  }));
  const byRole = r => options.find(o => o.role === r);
  const modifiers = p.modifiers.map(m => ({
    id: m.id, name: m.display_name, type: m.type, required: !!m.required, role: modifierRole(m.display_name),
    ...(m.option_values?.length ? { values: m.option_values.map(v => ({ id: v.id, label: v.label })) } : {}),
  }));
  const mod = r => modifiers.find(m => m.role === r);

  // size
  let size, todo = [...(fam.todo || [])];
  const H = byRole("height"), W = byRole("width"), S = byRole("size");
  if (H && W) {
    const rng = o => { const m = o.name.match(/\(([\d.]+)-([\d.]+)\)/); return m ? { min: num(m[1]), max: num(m[2]) } : null };
    const steps = o => o.values.map(v => num(v.label)).filter(Number.isFinite).sort((a, b) => a - b);
    size = { mode: "free", unit: "in", width: rng(W), height: rng(H), price_steps: { width: steps(W), height: steps(H) }, rounding: "up_to_next_step" };
  } else if (S) {
    size = { mode: "preset", unit: "in", presets: S.values.map(v => ({ id: v.label, label: v.label, w_in: null, h_in: null })) };
    todo.push(`Dimensions for ${S.values.map(v => v.label).join(", ")} (BigCommerce stores only these labels).`);
  } else {
    // fixed size: some products carry it in the name, e.g. 'Oval Name Badge (2 3/4"  x 1 9/16")'
    const inch = s => s.trim().split(/\s+/).reduce((t, part) => t + (part.includes("/") ? num(part.split("/")[0]) / num(part.split("/")[1]) : num(part)), 0);
    const m = p.name.match(/\(\s*([\d\s\/]+)"\s*x\s*([\d\s\/]+)"\s*\)/i);
    size = m ? { mode: "fixed", unit: "in", w_in: Math.round(inch(m[1]) * 10000) / 10000, h_in: Math.round(inch(m[2]) * 10000) / 10000, source: "product name" }
             : { mode: "fixed", unit: "in", w_in: null, h_in: null };
    if (!m) todo.push(family === "pen" ? "Imprint area for this model (see family todo)." : "Product dimensions (not in BigCommerce).");
  }

  // pricing (public storefront prices only)
  const tiers = [...p.bulk_pricing_rules].sort((a, b) => a.quantity_min - b.quantity_min)
    .map(b => ({ min_qty: b.quantity_min, max_qty: b.quantity_max || null, type: b.type, amount: b.amount }));
  const variants = p.variants.map(v => ({
    id: v.id, sku: v.sku, price: v.calculated_price, ...(v.purchasing_disabled ? { purchasing_disabled: true } : {}),
    options: Object.fromEntries(v.option_values.map(ov => [optionRole(ov.option_display_name) || ov.option_display_name, ov.label])),
  }));
  const pricing = { source: "bigcommerce_variants", pulled_at: pulled.pulled_at, base_price: p.price, quantity_tiers: tiers, variants };
  if (size.mode === "free") pricing.price_grid = Object.fromEntries(variants.filter(v => v.options.height && v.options.width)
    .map(v => [`${num(v.options.height)}x${num(v.options.width)}`, v.price]));

  // shapes, corners, fonts (stickers mostly)
  const shapeMod = mod("shape");
  const shapes = shapeMod?.values?.map(v => ({ id: (fam.shape_map || {})[v.label] || idOf(v.label), bigcommerce_label: v.label })) || null;
  const cornerMod = mod("rounded_corners");
  const corners = cornerMod ? {
    optional: true, rounded_radius_in: num((cornerMod.values.find(v => /yes/i.test(v.label))?.label.match(/([\d.]+)"/) || [])[1]) || null,
    bigcommerce_labels: cornerMod.values.map(v => v.label),
  } : null;
  const fonts = mod("font_1")?.values?.map(v => v.label) || [];

  const engraved = cf(p, "dp_engraved");
  const def = {
    $schema: "../schema/product-definition.schema.json",
    id, name: p.name, family, type, group: type ? idOf(type) : null,
    status: p.is_visible ? "live" : "hidden",
    studios: { advanced: (fam.studios?.advanced || []).includes(id), basic: (fam.studios?.basic || []).includes(id) },
    studio_status: (fam.studios?.advanced || []).includes(id) || (fam.studios?.basic || []).includes(id) ? "built" : "planned",
    bigcommerce: { product_id: p.id, url: p.custom_url.url, sku: p.sku || null, base_variant_id: p.base_variant_id, template: cf(p, "bctemplate") },
    size,
    ...(shapes ? { shapes } : {}),
    ...(corners ? { corners } : {}),
    ...(byRole("material") ? { materials: byRole("material").values.map(v => v.label) } : {}),
    ...(byRole("background_color") ? { background_colors: byRole("background_color").values.map(v => v.label) } : {}),
    ...(byRole("border_color") ? { border_colors: byRole("border_color").values.map(v => v.label) } : {}),
    ...(byRole("attachment") ? { attachments: byRole("attachment").values.map(v => v.label.toLowerCase()) } : {}),
    ...(byRole("pen_color") || byRole("notebook_color") || byRole("color") ? { product_colors: (byRole("pen_color") || byRole("notebook_color") || byRole("color")).values.map(v => v.label) } : {}),
    decoration: engraved === "true" ? "engraved" : engraved === "false" ? "printed" : (typeCfg.format === "cut_vinyl" ? "cut_vinyl" : "printed"),
    ...(Object.keys(typeCfg).length ? { format: typeCfg.format || null, ...(typeCfg.dome ? { dome: true } : {}), ...(typeCfg.sheet_in ? { sheet_in: typeCfg.sheet_in } : {}),
      ...(typeCfg.white_prints_clear ? { white_prints_clear: true } : {}), ...(typeCfg.white_ink ? { white_ink: true } : {}), ...(typeCfg.max_colors ? { max_colors: typeCfg.max_colors } : {}) } : {}),
    text_fields: ["text_1", "text_2", "name", "title", "badge_text"].filter(r => mod(r)),
    fonts,
    personalization: mod("bulk_names_file") ? { bulk_names_file: true } : null,
    quantity: { min: p.order_quantity_minimum || null, max: p.order_quantity_maximum || null },
    pricing,
    editor: { ...fam.editor, ...(typeCfg.layers ? { layers: typeCfg.layers } : {}) },
    checks: fam.checks || null,
    previews: [...(fam.previews || []), ...(typeCfg.previews_add || [])],
    ...(fam.cut_border_in_options && shapes?.some(s => s.id === "custom") ? { cut_border_in_options: fam.cut_border_in_options } : {}),
    cart: {
      note: "BigCommerce options pick the variant (price); modifiers carry the design. These are the fields the Doogma builder fills today.",
      options: options.map(({ id, name, role, values }) => ({ id, name, role, values })),
      modifiers,
      required_modifiers: modifiers.filter(m => m.required).map(m => m.name),
    },
    mcp: { product_id: id, studio_supported: (fam.studios?.advanced || []).includes(id) || (fam.studios?.basic || []).includes(id) },
    pdp: {
      page_title: p.page_title || p.name, meta_description: p.meta_description || "", reviews_count: p.reviews_count || 0,
      images: (p.images || []).slice().sort((a, b) => a.sort_order - b.sort_order).map(im => ({ zoom: im.url_zoom, standard: im.url_standard, thumb: im.url_thumbnail, alt: im.description || p.name })),
      description_html: clean(p.description),
    },
    assumptions: fam.assumptions || [],
    todo,
  };
  // The studio's shapes (decision, Carlos 2026-10-10: keep Square and Oval) vs this product's BigCommerce Shape values
  if (shapes && def.studio_status === "built") {
    /* what the studio adds on top of BigCommerce's shapes: Square wherever Rectangle exists (a rectangle with equal
       sides), Oval on domed sheets (Carlos's decision) */
    const offered = [shapes.some(x => x.id === "rect") && "square", def.type === "Sheets - Domed" && "oval"].filter(Boolean);
    const missing = offered.filter(s => !shapes.some(x => x.id === s));
    if (missing.length) def.todo.push(`Studio offers ${missing.join(" and ")} (Carlos, 2026-10-10: keep them). This product's BigCommerce 'Shape' modifier has no matching value (${shapes.map(s => s.bigcommerce_label).join(", ")}), so the cart mapping for ${missing.join(" and ")} is still to be decided.`);
  }
  return def;
}

// validate the few things the studio depends on
function check(d) {
  const errs = [];
  for (const k of ["id", "name", "family", "bigcommerce", "size", "pricing", "cart"]) if (d[k] == null) errs.push(`missing ${k}`);
  if (d.size.mode === "free") {
    const n = Object.keys(d.pricing.price_grid || {}).length, need = d.size.price_steps.width.length * d.size.price_steps.height.length;
    if (n !== need) errs.push(`price grid has ${n} sizes, expected ${need}`);
  }
  if (!d.pricing.variants.length) errs.push("no variants");
  if (!d.cart.modifiers.some(m => m.role === "saved_print_output")) errs.push("no Saved Print Output modifier");
  return errs;
}

const selected = products.filter(p => FAMILY_BY_TEMPLATE[cf(p, "bctemplate")] && (includeHidden || p.is_visible));
for (const f of Object.keys(families)) {                        // regenerate cleanly
  const dir = join(OUT, f); mkdirSync(dir, { recursive: true });
  for (const n of readdirSync(dir)) if (n.endsWith(".json")) rmSync(join(dir, n));
}
const index = [], problems = [];
for (const p of selected.sort((a, b) => a.id - b.id)) {
  const d = build(p), errs = check(d);
  if (errs.length) problems.push(`${p.id} ${p.name}: ${errs.join("; ")}`);
  const file = `${d.family}/${slugOf(p)}.json`;
  writeFileSync(join(OUT, file), JSON.stringify(d, null, 2) + "\n");
  index.push({ id: d.id, name: d.name, family: d.family, type: d.type, group: d.group, status: d.status, studio_status: d.studio_status, studios: d.studios,
    bigcommerce_product_id: p.id, url: d.bigcommerce.url, size_mode: d.size.mode, file });
}
index.sort((a, b) => a.family.localeCompare(b.family) || (a.type || "").localeCompare(b.type || "") || a.name.localeCompare(b.name));
writeFileSync(join(OUT, "index.json"), JSON.stringify({ generated_from: "BigCommerce (read-only pull)", pulled_at: pulled.pulled_at, count: index.length, products: index }, null, 2) + "\n");

const by = k => index.reduce((m, r) => (m[r[k]] = (m[r[k]] || 0) + 1, m), {});
console.log(`Wrote ${index.length} definitions:`, by("family"), "| studio_status:", by("studio_status"), "| size modes:", by("size_mode"));
if (problems.length) { console.log("Problems:"); problems.forEach(x => console.log("  " + x)); process.exitCode = 1 } else console.log("All definitions passed the checks.");
