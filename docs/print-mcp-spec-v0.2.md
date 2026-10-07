# World Emblem Print MCP: Draft Spec

**Status:** Draft v0.2 · 2026-10-07 (supersedes v0.1 of 2026-10-06)
**Goal:** Let anyone using Claude (or any MCP client) turn an idea or a logo into a real product (patches, emblems, stickers, labels) without leaving the chat: **design → quote → proof → checkout → track**. It should feel as easy as the Custom Genie studio, and hand off to it at any point.

**What changed in v0.2**

- **Design in chat.** New `generate_design` (Genie) and `edit_design` tools. Users without artwork can get four designs from a description and refine them by asking ("make it navy and gold").
- **Checks come with fixes.** Every production check has a stable code, a plain-language message, a suggestion and, where possible, a one-step fix (`apply_fix`). The codes match the website's print check.
- **Mockups at every step.** Any tool that changes a design returns a rendered preview. Mockups are part of the MVP, and no checkout happens without one.
- **Hand-off to the studio.** New `open_in_studio` opens any chat design in the Custom Genie web studio with every layer still editable. Designs made on the site can be quoted in chat.
- **Conversation rules (§2).** These set how the assistant asks, shows prices and confirms orders, so the experience is the same in every MCP client.

---

## 1. Design principles

1. **Quote before commit.** Nothing is ordered from a single tool call. The user always sees the price, the specs and a proof first.
2. **No payment data through the AI.** The MCP never accepts card numbers. Checkout happens on a World Emblem–hosted page through a link (`create_checkout`).
3. **Fixes, not just warnings.** Tools return production checks (text too small, low resolution, too many thread colors) with a suggested fix that Claude can offer as a yes/no question.
4. **Show, don't describe.** Every step that changes a design returns a mockup as MCP image content, so the user judges the design by sight, not from a list of specs.
5. **One question at a time, smart defaults.** The assistant never asks more than one question per turn. Gaps are filled with sensible defaults and stated plainly ("I went with 2 in, Gloss White. Want to change anything?").
6. **Discoverable but not pushy.** Tool descriptions say *when* to use each tool. Claude offers printing when the user shows intent, and doesn't bring it up otherwise.
7. **Works anonymously, better when signed in.** Designs, quotes and proofs need no account. OAuth unlocks saved designs, reorders and order history.
8. **No dead ends.** Any design can continue in the web studio (`open_in_studio`), and any studio design can come back to chat by `design_id`.

---

## 2. Conversation design

The tools give the assistant what it needs. These rules make the experience feel the same in every client. They are also sent as server instructions (§6).

### 2.1 Happy path (4 turns from idea to proof)

```
User:   I need stickers for my coffee shop, Bean There.
Claude: [generate_design] Here are four designs: round, 2 in, Gloss White.
        (4 mockups inline) Pick one, or tell me what to change.
User:   The second one, but navy and gold.
Claude: [edit_design] Done. I recolored it navy with gold lettering. (mockup)
        100 stickers are $123.00 ($1.23 each). At 300 they're $1.08 each.
        How many would you like?
User:   300.
Claude: [get_quote → create_proof] Here's exactly what prints, and how it
        looks with the dome. (2 images) 300 × 2 in round, Gloss White:
        $324.00, ships free, estimated ship date Oct 14. One thing to check:
        "Fresh roasted daily" is 7 pt, which is hard to read under the dome.
        Should I make it 8 pt?
User:   Yes, then order.
Claude: [apply_fix → create_checkout] Fixed. Here's your secure checkout
        link. You'll confirm shipping and payment there.
```

### 2.2 Rules for the assistant

| Situation | Do | Don't |
|---|---|---|
| Missing details | Use defaults from `assumptions[]` and say what they were. Ask only for what can't be defaulted (usually the text on the design). | Ask for shape, size, finish, colors and quantity one after another. |
| Showing designs | Show 2–4 options as images, with names. Offer up to three short refinements ("other colors", "rectangle", "gold"). | Describe a design without showing it. |
| Prices | Give the total, quantity and unit price, then the next price break ("At 500 they drop to $1.00 each"). Mention free shipping if it's close. | List all five price tiers unless asked. |
| Production checks | Lead with warnings, at most three, each with its fix offered as a yes/no. Skip `ok`/`info` unless asked. | Paste codes or raw JSON. |
| Before checkout | Show the proof, restate the order in one line, and get an explicit yes. | Call `create_checkout` on "looks good" alone, without a confirmed order summary. |
| User declines | Stop offering printing for the rest of the conversation. | Re-offer after every logo edit. |
| Complex edits | Offer `open_in_studio` ("Want to fine-tune it yourself? Here's your design in the studio."). | Try more than two rounds of edits that aren't understood. |

### 2.3 Copy patterns

- **Quote:** "300 × 2 in round stickers, Gloss White: **$324.00** ($1.08 each). Ships free. Estimated ship date Oct 14."
- **Check:** "Heads up: your logo is 140 dpi at 3 in, so it may print a little soft. I can make it 2 in, where it prints sharp. Want that?"
- **Assumptions:** "I went with a 2 in circle in Gloss White, the most popular choice for logos. Tell me if you'd like something else."

---

## 3. User flow

```
User: "Can I get this printed as stickers?"  /  "Design me a sticker for…"
   │
   ├─ list_products              → what's possible (sticker, embroidered patch, PVC…)
   ├─ upload_artwork             → artwork_id + analysis + checks        (has a logo)
   │    or generate_design       → design options + mockups + checks     (has an idea)
   ├─ edit_design / apply_fix    → new version + mockup + checks         (loops)
   ├─ get_quote                  → price, next price break, ship date, quote_id
   ├─ create_proof               → flat proof + finished mockup + spec sheet
   │      (tweaks loop back to edit_design → get_quote)
   ├─ create_checkout            → secure checkout_url (user pays on the hosted page)
   └─ get_order_status           → production / shipping updates

   open_in_studio works at any step → the same design, editable in the web studio
```

---

## 4. Shared objects

### 4.1 Design document

`generate_design`, `edit_design`, `get_design` and `save_design` share one JSON format, the same one the Custom Genie studio saves. This means a design can move between chat, the studio and production without being converted.

```json
{
  "design_id": "dsn_8f2k", "version": 3, "product_id": "domed_vinyl_sticker",
  "shape": "circle", "size_in": { "w": 2, "h": 2 }, "corners": "standard",
  "finish": "white", "background": { "type": "color", "color": "#0F1B3D" },
  "cut_border_in": 0.12,
  "layers": [
    { "id": "l1", "type": "text", "text": "Bean There", "font": "Libre Baskerville",
      "size_pt": 15, "fill": "#FFD569", "curve": 58, "x_in": 1, "y_in": 0.54 },
    { "id": "l2", "type": "shape", "kind": "cup", "w_in": 0.6, "h_in": 0.6,
      "fill": "#FFD569", "x_in": 1, "y_in": 1.06 },
    { "id": "l3", "type": "image", "artwork_id": "art_91x", "remove_white": true,
      "w_in": 0.9, "h_in": 0.6, "x_in": 1, "y_in": 1.4 }
  ]
}
```

- Layer types are `text`, `image`, `shape` (icon library), `rect`, `ellipse`, `line` and `path`. Each layer can also have `rotation`, `opacity`, `stroke`, `stroke_pt`, `hidden`, `locked` and `group_id`.
- Positions are measured from the top-left of the sticker in inches, using the center of the layer.
- `cut_border_in` only applies to `shape: "custom"` (cut to design). The studio offers four widths: 0.06, 0.12, 0.20 and 0.30 in.

### 4.2 Check

```json
{ "level": "warning", "code": "TEXT_TOO_SMALL", "layer_id": "l1",
  "message": "\"Fresh roasted daily\" is 7 pt.",
  "suggestion": "Text under 8 pt is hard to read under the dome.",
  "fix": { "fix_id": "fx_21", "label": "Make it 8 pt" } }
```

`level` is one of `ok`, `info`, `warning` or `error`. An `error` blocks `create_checkout`. A `warning` needs the user's acknowledgement in chat, or on the hosted checkout page.

### 4.3 Check codes

These are the same codes, levels and thresholds as the website's print check. Thresholds are set per product, so the domed-sticker values are shown here.

| Code | Level | When (domed vinyl stickers) | Fix offered |
|---|---|---|---|
| `EMPTY_DESIGN` | error | No printable layers | — |
| `OUTSIDE_SAFE_AREA` | warning | Layer crosses the 0.08 in safe line | Move inside |
| `TEXT_TOO_SMALL` | warning | Text under 8 pt (embroidery: under 5 mm) | Set to minimum |
| `RESOLUTION_TOO_LOW` | warning | Raster under 150 dpi at print size (300 dpi or more prints sharp) | Resize to sharp size |
| `THIN_LINE` | warning | Line or stroke under 0.5 pt | Set to 1 pt |
| `LOW_CONTRAST` | warning | Text nearly invisible against its background | Use light / dark text |
| `TOO_MANY_THREAD_COLORS` | warning | Embroidery: over the product's thread limit | Reduce palette |
| `HIDDEN_LAYERS` | info | Hidden layers won't print | — |
| `ROUND_ART` | info | Round art on a square/rectangle prints white corners | Make it round |
| `WHITE_BORDER` | info | White margin around artwork | Fill edge to edge |
| `EDGE_TO_EDGE` | info | Art runs to the cut; keep key details inside the safe line | — |
| `CUT_FOLLOWS_BOX` | info | Cut-to-design follows an image's white box | Remove white background |
| `METALLIC_WHITE` | info | Silver/Gold: white areas print clear | — |
| `SPELLING` | info | Lists all text so the user can proofread | — |

---

## 5. Tools

### 5.1 `list_products`
> Use when the user asks what products a logo can be made into, or before quoting so you can pick valid sizes and options.

| | |
|---|---|
| Annotations | `readOnlyHint: true` |
| Input | `category?` (`patch` \| `sticker` \| `label` \| `emblem` \| `transfer`) |
| Output | Array of products: `product_id`, `name`, `description`, `sizes` (min/max inches), `shapes[]`, `options` (backing, border, finish, thread count limit), `min_quantity`, `quantity_tiers[]`, `typical_turnaround_days`, `check_thresholds`, `thumbnail_url`, `studio_supported` |

Example products: `domed_vinyl_sticker` (Custom Genie; finishes `white` \| `silver` \| `gold`; 0.5–8.5 in; supplied on 9.25 × 10 in sheets), `die_cut_sticker`, `embroidered_patch`, `woven_patch`, `pvc_patch`, `leather_patch`, `heat_transfer`, `woven_label`.

---

### 5.2 `upload_artwork`
> Use when the user has a logo or artwork they want made into a product. Accepts SVG, PNG, JPG, WebP or PDF. Returns an analysis and production checks you should explain in plain language.

| | |
|---|---|
| Annotations | `readOnlyHint: false`, `destructiveHint: false`, `idempotentHint: true` (hash-based) |
| Input | One of: `file_base64` + `filename`, or `file_url`, or `design_id` (from the logo designer or studio); `product_id?` (tunes the analysis) |
| Output | `artwork_id`, `format`, `pixels {w,h}`, `vector`, `detected_colors[]`, `preview_url`, `analysis`, `checks[]` |

`analysis` matches what the studio shows after an upload:

```json
{ "background": "white", "is_round": true, "suggested_shape": "circle",
  "max_sharp_width_in": 3.4,
  "suggested_sizes": [ { "size_in": {"w":2,"h":2}, "sharpness": "sharp" },
                       { "size_in": {"w":4,"h":4}, "sharpness": "may_blur" } ],
  "can_remove_background": true }
```

---

### 5.3 `generate_design` (Genie) · new
> Use when the user wants a design created from a description, or wants ready-made layouts around their logo. Show the returned mockups as images and let the user pick. Tell the user which details were assumed.

| | |
|---|---|
| Annotations | `readOnlyHint: false`, `destructiveHint: false`, `idempotentHint: false` (pass `seed` for repeatable results) |
| Input | `prompt`, `product_id`, `artwork_id?`, `constraints?` (`shape`, `size_in`, `finish`, `colors[]`, `text {main, tagline}`, `style`), `count?` (default 4, max 6), `seed?` |
| Output | `designs[]`: `design_id`, `name`, `preview_url` + image content, `doc` (§4.1), `checks[]`; `assumptions[]` (e.g. `{"field":"size_in","value":{"w":2,"h":2},"reason":"most popular for logos"}`); `refinements[]` (short suggested follow-ups) |

- Details in the prompt are read before any defaults. "Gold" means the finish unless it's paired with another color ("navy and gold"), where it means a color. Quantities, sizes ("3 x 1 in") and shapes are read the same way.
- With an `artwork_id`, Genie places the artwork rather than redrawing it. Typical options are as is, cut around the design, on a tinted background, and with the user's text.

---

### 5.4 `edit_design` · new
> Use when the user asks to change a design ("make it navy and gold", "curve the name", "add a star", "bigger text"). Show the new mockup and list the changes in plain words.

| | |
|---|---|
| Annotations | `readOnlyHint: false`, `destructiveHint: false`, `idempotentHint: true` (via `base_version`) |
| Input | `design_id`, `base_version`, and either `instruction` (natural language) or `operations[]`: `set_text`, `recolor`, `set_shape`, `set_size`, `set_finish`, `add_icon`, `add_text`, `tidy_layout`, `remove_background`, `fill_edge_to_edge`, `revert_to {version}` |
| Output | `design_id`, `version`, `preview_url` + image content, `changes[]` (e.g. "recolored it navy with gold lettering"), `checks[]` |

- Designs are versioned. Edits never overwrite earlier versions, so "undo" is just `revert_to`.
- If an instruction isn't understood, the tool returns `EDIT_NOT_UNDERSTOOD` with `supported_edits[]`. After two misses, offer `open_in_studio`.

### 5.5 `apply_fix` · new
> Use when the user accepts a fix offered for a production check.

| | |
|---|---|
| Annotations | `readOnlyHint: false`, `destructiveHint: false`, `idempotentHint: true` |
| Input | `design_id`, `fix_id` (or `fix_ids[]`) |
| Output | Same as `edit_design` |

---

### 5.6 `get_quote`
> Use when the user wants pricing. Always show the user the price, quantity and turnaround before creating a checkout.

| | |
|---|---|
| Annotations | `readOnlyHint: true` |
| Input | `design_id` **or** `artwork_id` + `product_id` + `size_in` (number or `{w,h}`) + `shape`; `quantity`, `options?` (backing, border, finish), `ship_to_postal_code?`, `rush?` |
| Output | `quote_id`, `expires_at`, `unit_price`, `subtotal`, `setup_fee`, `shipping_estimate`, `free_shipping_threshold`, `amount_to_free_shipping`, `total`, `currency`, `price_breaks[]`, `next_price_break` (`quantity`, `unit_price`, `saves_pct`), `turnaround_days`, `estimated_ship_date`, `warnings[]` |

`next_price_break` lets Claude say *"At 500 they drop from $1.08 to $1.00 each."* without listing every tier.

---

### 5.7 `create_proof`
> Use after a quote, so the user can see exactly what will be made before ordering.

| | |
|---|---|
| Annotations | `readOnlyHint: false`, `destructiveHint: false` |
| Input | `quote_id`, `notes?` (customer instructions, max 250 characters) |
| Output | `proof_id`, `proof_flat_url`, `mockup_image_url`, `sheet_layout_url?`, `spec_sheet_url` (PDF), `spec` (shape, cut size, finish, quantity, product code), `ink_or_thread_colors[]`, `production_notes[]`, `checks[]`, `status` |

The three images match the studio's views, so customers see the same thing in chat and on the web:

- **`proof_flat_url` ("What prints"):** the flat cut-out with size labels, trimmed areas faded out and a US quarter for scale.
- **`mockup_image_url` (finished look):** the domed sticker, stitched patch, and so on.
- **`sheet_layout_url`:** for sheet products, the sticker at actual scale on the sheet.

Phase 1 returns an instant auto-proof (`status: "auto"`). Phase 3 adds `request_artist_review: true`, which returns `status: "pending"` until a World Emblem artist signs off.

---

### 5.8 `create_checkout`
> Use only after the user has seen the proof and explicitly confirmed the order summary. Returns a secure link where the user enters shipping and payment themselves. Never ask for card details in chat.

| | |
|---|---|
| Annotations | `readOnlyHint: false`, `destructiveHint: false`, `idempotentHint: true` (via `idempotency_key`), `openWorldHint: true` |
| Input | `quote_id`, `proof_id`, `idempotency_key`, `customer_email?`, `acknowledged_check_codes[]?` |
| Output | `checkout_url`, `draft_order_id`, `expires_at`, `summary` (line items and total, repeated for confirmation) |

- Creates a **draft order**. Nothing is charged or produced until the user pays on the hosted page.
- The hosted page shows the proof again and asks for the same approval as the website ("I've checked my design and spelling and approve it for printing").
- `error`-level checks block checkout. `warning`s that aren't in `acknowledged_check_codes` are shown again on the hosted page.

---

### 5.9 `get_order_status`
> Use when the user asks about an existing order.

| | |
|---|---|
| Annotations | `readOnlyHint: true` |
| Input | `order_id` (or omit for recent orders when authenticated) |
| Output | `status` (`awaiting_payment` \| `in_proof_review` \| `in_production` \| `shipped` \| `delivered`), `tracking_url?`, `estimated_delivery?`, `line_items[]`, `proof_url` |

---

### 5.10 `open_in_studio` · new
> Use when the user wants to fine-tune a design themselves, or when chat edits aren't getting there.

| | |
|---|---|
| Annotations | `readOnlyHint: false`, `destructiveHint: false`, `idempotentHint: true` |
| Input | `design_id` or `quote_id` |
| Output | `studio_url` (signed deep link, opens the design in the Custom Genie / World Emblem studio with all layers editable), `expires_at` |

- Works without an account. Anonymous designs are kept for 30 days.
- When the user returns to chat, a studio-saved design can be quoted by its `design_id`.

---

### 5.11 Logo-designer bridge (optional, authenticated)

| Tool | Purpose |
|---|---|
| `list_designs` | The user's saved designs from the logo designer and studio (`design_id`, name, thumbnail, updated_at). |
| `get_design` | Fetch a design as a design document (§4.1), or as SVG/PNG for display. |
| `save_design` | Save a generated or edited design to the user's account. |
| `reorder` | `order_id` → new `quote_id` with the same specs (still goes through proof and checkout). |

---

## 6. Server instructions (sent to the model on connect)

```
World Emblem makes custom embroidered, woven, PVC and leather patches,
stickers (including Custom Genie domed stickers), labels and heat transfers.

- Use these tools when a user wants a logo or design made into a physical
  product, printed or ordered, or wants a sticker/patch designed for them.
- After helping a user finish a logo, you may offer once to quote it as a
  patch or sticker. Don't repeat the offer if they decline.
- No artwork? Use generate_design and show the mockups. Have artwork? Use
  upload_artwork. Say which details you assumed; ask at most one question
  per turn.
- Show a mockup after every change (generate_design, edit_design, apply_fix).
- Always: get_quote → create_proof → show price + proof → get an explicit
  yes to a one-line order summary → create_checkout.
- When quoting, give the total, quantity and unit price, plus the next
  price break.
- Explain at most three production warnings in plain language, each with
  its fix offered as a yes/no question. Never show raw codes.
- If edits aren't working after two tries, offer open_in_studio.
- Never request or accept payment card details in chat; checkout happens
  on the link returned by create_checkout.
```

---

## 7. Errors

Return MCP tool errors with a stable `code` and a human-readable `message`, plus a `suggestion` where possible:

| Code | When |
|---|---|
| `UNSUPPORTED_FORMAT` | File isn't SVG/PNG/JPG/WebP/PDF |
| `FILE_TOO_LARGE` | Over 25 MB (include the limit) |
| `RESOLUTION_TOO_LOW` | Raster can't print acceptably at any offered size |
| `SIZE_OUT_OF_RANGE` | Size outside the product range (include min/max) |
| `BELOW_MIN_QUANTITY` | Quantity below the product minimum (include the minimum) |
| `INVALID_OPTION` | Option not valid for this product/size |
| `DESIGN_NOT_FOUND` | Unknown or expired `design_id` / version |
| `EDIT_NOT_UNDERSTOOD` | Instruction couldn't be mapped to an edit (include `supported_edits[]`) |
| `CONTENT_NOT_ALLOWED` | Prompt or artwork breaks the content/IP policy (include the policy URL) |
| `CHECKS_BLOCKING` | `create_checkout` called while an `error`-level check is open |
| `QUOTE_EXPIRED` | Re-run `get_quote` |
| `AUTH_REQUIRED` | Tool needs a signed-in account |

---

## 8. Website parity (Custom Genie studio)

The v3 Custom Genie page (`Domed Vinyl Stickers _ Custom Genie (copy) Version 3.html`) already uses this spec's vocabulary, so web and chat behave the same:

| MCP | Website today |
|---|---|
| `list_products`, `get_quote`, `create_proof`, `create_checkout` | `window.CustomGeniePrint.listProducts / getQuote / createProof / createCheckout`, with the same payload shapes. "Review & order" calls getQuote → createProof → createCheckout. A local stub is used until the backend is connected. |
| `generate_design` / `edit_design` | Genie panel in the studio, with `window.CustomGenieAI.generate({mode, prompt, answers, logo})` and an optional `.edit({prompt, doc})` hook. Rule-based in the prototype. |
| `upload_artwork` analysis | Genie's artwork check: pixel size, sharp-size limit, background type, round detection, suggested shape, main colors. |
| Check codes (§4.3) | Print check pill in the quote bar, with one-click fixes and Undo |
| `create_proof` images | Studio views: Print proof · 3D · On sheet |
| Design document (§4.1) | Studio autosave format (layers, groups, lock/hide, opacity, strokes) |

**Shared analytics funnel:** `builder_ai_prompt` → `builder_ai_generate` → `builder_ai_apply` → `builder_ai_edit` → `print_check_fix` → `review_open` → `add_to_cart` (web), with the same steps logged per tool call over MCP.

---

## 9. Technical notes

- **Transport:** remote MCP server over Streamable HTTP (e.g. `https://mcp.worldemblem.com/mcp`).
- **Auth:** OAuth 2.1 for account features. Design, quote, proof and checkout tools work without an account and are rate-limited by IP; `generate_design` has a tighter per-IP limit.
- **Backend:** wraps the existing pricing engine, artwork pipeline, renderer and e-commerce checkout. The MCP layer should stay thin. The same renderer produces the studio previews and the MCP mockups, so they always match.
- **Images:** return mockups as hosted URLs *and* as MCP image content so clients can render them inline. Keep previews at 1024 px or smaller so they display quickly.
- **Versioning:** every `edit_design` / `apply_fix` creates a new immutable version. Quotes and proofs pin a version.
- **Idempotency:** `create_checkout` must dedupe on `idempotency_key` so a retried call can't create duplicate draft orders.
- **Content safety:** screen prompts and artwork for trademarks, hate symbols and the like before generating or quoting, and return `CONTENT_NOT_ALLOWED`.
- **Privacy:** store uploaded artwork and designs under the user's account, or delete them after 30 days if anonymous. Publish a privacy policy (required for directory listing).

---

## 10. Rollout

| Phase | Scope |
|---|---|
| **1 – MVP** | `list_products`, `upload_artwork`, `generate_design`, `get_quote`, `create_proof` (auto-proof), `create_checkout`, `open_in_studio`. Domed stickers and die-cut stickers only. |
| **2** | `edit_design`, `apply_fix`, `get_order_status`; embroidered and woven patches (thread-color checks) |
| **3** | OAuth + logo-designer bridge (`list_designs`, `get_design`, `save_design`, `reorder`), artist proof review |
| **4** | Submit to Anthropic's connector directory; co-marketing |

`create_proof` moved into Phase 1 because principle 4 (show, don't describe) and the website both require a proof before checkout.

**Success measures:** median time from first message to a quote under 60 seconds; four turns or fewer from intent to proof; share of accepted fixes; proof-to-checkout and checkout-to-paid conversion compared with the website.

---

## 11. Open questions

- Which product lines launch first? Stickers have the fewest production constraints; patches are the core business.
- Instant pricing for every product, or "request a quote" for complex items?
- Minimum quantities: offer a low-MOQ sticker or patch option for consumers? Domed stickers currently start at 100.
- Who approves proofs: automated only, or artist sign-off before production? What is the turnaround target for artist review?
- Silver and Gold domed stickers: confirm the real SKUs (the site uses placeholder codes SIL/GLD) and whether they share White's price list.
- The pricing matrix: the site estimates some size buckets by area. Load the full SKU price list before launch.
- Production turnaround for the estimated ship date (the site uses a 5-business-day placeholder).
- Content/IP policy for AI-generated designs, and whether previews should be watermarked before purchase.
- B2B accounts (net terms, reseller pricing): through the same server or a separate one?
