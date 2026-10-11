# BigCommerce price check (2026-10-10)

Read-only pull of the Custom Genie catalog compared with the prices the studio shows today. No BigCommerce data was changed.

## 1. The studio's prices don't match BigCommerce for most sizes

Product: **Domed White Vinyl Sticker Sheet (261)**. BigCommerce prices it with 100 size variants (heights x widths of 0.5, 1 to 8 and 8.5 in) plus bulk pricing. The studio has 10 sizes typed in (`PRICE` in `studio-src/src/js1_core.js`) and estimates every other size from the sticker's area.

- **Quantity discounts match:** 100+ 20%, 200+ 25%, 300+ 30%, 500+ 35%, 1000+ 40%.
- **Price per sticker:** 35 of 100 sizes match; **65 differ** (42 lower in the studio, 23 higher). The 10 typed-in sizes all match; every estimated size is a mismatch.
- So a shopper can see one price in the studio and be charged another in the cart.

Largest differences, per sticker before the quantity discount:

| Size (H x W in) | BigCommerce | Studio | Difference | 100 stickers in BigCommerce | 100 stickers in the studio |
|---|---|---|---|---|---|
| 3 x 5 | $7.82 | $4.49 | -3.33 (-43%) | $626.00 | $359.00 |
| 5 x 3 | $7.82 | $4.49 | -3.33 (-43%) | $626.00 | $359.00 |
| 2 x 7 | $7.30 | $4.29 | -3.01 (-41%) | $584.00 | $343.00 |
| 7 x 2 | $7.30 | $4.29 | -3.01 (-41%) | $584.00 | $343.00 |
| 5 x 5 | $16.85 | $10.16 | -6.69 (-40%) | $1,348.00 | $813.00 |
| 3 x 8.5 | $17.19 | $10.47 | -6.72 (-39%) | $1,375.00 | $838.00 |
| 8.5 x 3 | $17.19 | $10.47 | -6.72 (-39%) | $1,375.00 | $838.00 |
| 2 x 6 | $6.25 | $3.89 | -2.36 (-38%) | $500.00 | $311.00 |
| 3 x 4 | $6.25 | $3.89 | -2.36 (-38%) | $500.00 | $311.00 |
| 4 x 3 | $6.25 | $3.89 | -2.36 (-38%) | $500.00 | $311.00 |
| 6 x 2 | $6.25 | $3.89 | -2.36 (-38%) | $500.00 | $311.00 |
| 4 x 7 | $18.87 | $11.99 | -6.88 (-36%) | $1,510.00 | $959.00 |

**Fix (planned, step 3):** the studio reads prices from the product definition (`pricing.price_grid` and `pricing.quantity_tiers`, pulled from BigCommerce) instead of its own table, so the studio always equals the cart.

## 2. BigCommerce's own size grid is irregular (for Carlos to review)

In BigCommerce, a larger sticker costs less than a smaller one of the same height in **19 places**. This may be intended (for example, squares priced lower) or data-entry slips. Nothing was changed.

Price per sticker, Domed White (same grid on Domed Color, Silver and Gold). Rows are height, columns are width, in inches:

| H \ W | 0.5 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 8.5 |
|---|---|---|---|---|---|---|---|---|---|---|
| **0.5** | 0.19 | 0.38 | 0.77 | 1.15 | 1.54 | 1.92 | 2.31 | 2.69 | 1.54 | 1.64 |
| **1** | 0.38 | 0.77 | 1.54 | 2.31 | 1.54 | 1.92 | 2.31 | 2.69 | 3.08 | 3.27 |
| **2** | 0.77 | 1.54 | 1.54 | 2.31 | 3.08 | 5.21 | 6.25 | 7.30 | 4.69 | 4.98 |
| **3** | 1.15 | 2.31 | 2.31 | 4.69 | 6.25 | 7.82 | 5.28 | 6.16 | 7.04 | 17.19 |
| **4** | 1.54 | 1.54 | 3.08 | 6.25 | 4.69 | 5.86 | 7.04 | 18.87 | 21.57 | 22.92 |
| **5** | 1.92 | 1.92 | 5.21 | 7.82 | 5.86 | 16.85 | 20.22 | 23.59 | 18.72 | 19.89 |
| **6** | 2.31 | 2.31 | 6.25 | 5.28 | 7.04 | 20.22 | 16.85 | 19.66 | 22.47 | 17.54 |
| **7** | 2.69 | 2.69 | 7.30 | 6.16 | 18.87 | 23.59 | 19.66 | 16.85 | 19.26 | 20.46 |
| **8** | 1.54 | 3.08 | 4.69 | 7.04 | 21.57 | 18.72 | 22.47 | 19.26 | 16.85 | 17.90 |
| **8.5** | 1.64 | 3.27 | 4.98 | 17.19 | 22.92 | 19.89 | 17.54 | 20.46 | 17.90 | 19.02 |

Where a bigger size is cheaper:

- 0.5 x 8 ($1.54) costs less than 0.5 x 7 ($2.69)
- 1 x 4 ($1.54) costs less than 1 x 3 ($2.31)
- 2 x 8 ($4.69) costs less than 2 x 7 ($7.30)
- 3 x 6 ($5.28) costs less than 3 x 5 ($7.82)
- 4 x 4 ($4.69) costs less than 4 x 3 ($6.25)
- 5 x 4 ($5.86) costs less than 5 x 3 ($7.82)
- 5 x 8 ($18.72) costs less than 5 x 7 ($23.59)
- 6 x 3 ($5.28) costs less than 6 x 2 ($6.25)
- 6 x 6 ($16.85) costs less than 6 x 5 ($20.22)
- 6 x 8.5 ($17.54) costs less than 6 x 8 ($22.47)
- 7 x 3 ($6.16) costs less than 7 x 2 ($7.30)
- 7 x 6 ($19.66) costs less than 7 x 5 ($23.59)
- 7 x 7 ($16.85) costs less than 7 x 6 ($19.66)
- 8 x 5 ($18.72) costs less than 8 x 4 ($21.57)
- 8 x 7 ($19.26) costs less than 8 x 6 ($22.47)
- 8 x 8 ($16.85) costs less than 8 x 7 ($19.26)
- 8.5 x 5 ($19.89) costs less than 8.5 x 4 ($22.92)
- 8.5 x 6 ($17.54) costs less than 8.5 x 5 ($19.89)
- 8.5 x 8 ($17.90) costs less than 8.5 x 7 ($20.46)

## 3. Each product has its own prices

- **Domed Color Vinyl Sticker Sheet (181)**: same size prices as Domed White; discounts 100+ 20%, 200+ 25%, 300+ 30%, 500+ 35%, 1000+ 40%
- **Domed Silver Vinyl Sticker Sheet (182)**: same size prices as Domed White; discounts 100+ 20%, 200+ 25%, 300+ 30%, 500+ 35%, 1000+ 40%
- **Domed Gold Vinyl Sticker Sheet (183)**: same size prices as Domed White; discounts 100+ 20%, 200+ 25%, 300+ 30%, 500+ 35%, 1000+ 40%
- **Glossy White Vinyl Sticker Sheet (159)**: its own size prices; discounts 100+ 20%, 200+ 25%, 300+ 30%, 500+ 35%, 1000+ 40%
- **Custom Matte Stickers (160)**: its own size prices; discounts 100+ 20%, 200+ 25%, 300+ 30%, 500+ 35%, 1000+ 40%
- **Metallic Brushed Silver Sticker Sheet (168)**: its own size prices; discounts 100+ 20%, 200+ 25%, 300+ 30%, 500+ 35%, 1000+ 40%
- **Metallic Brushed Gold Sticker Sheet (169)**: its own size prices; discounts 100+ 20%, 200+ 25%, 300+ 30%, 500+ 35%, 1000+ 40%
- **Reflective Sticker Sheet (161)**: its own size prices; discounts 100+ 20%, 200+ 25%, 300+ 30%, 500+ 35%, 1000+ 40%
- **Removable Sticker Sheet (162)**: its own size prices; discounts 100+ 20%, 200+ 25%, 300+ 30%, 500+ 35%, 1000+ 40%
- **Custom Glow in the Dark Stickers (167)**: its own size prices; discounts 100+ 20%, 200+ 25%, 300+ 30%, 500+ 35%, 1000+ 40%
- **Fluorescent Orange Sticker Sheet (177)**: its own size prices; discounts 100+ 20%, 200+ 25%, 300+ 30%, 500+ 35%, 1000+ 40%
- **Fluorescent Green Sticker Sheet (178)**: its own size prices; discounts 100+ 20%, 200+ 25%, 300+ 30%, 500+ 35%, 1000+ 40%
- **Fluorescent Pink Sticker Sheet (179)**: its own size prices; discounts 100+ 20%, 200+ 25%, 300+ 30%, 500+ 35%, 1000+ 40%
- **Fluorescent Yellow Sticker Sheet (180)**: its own size prices; discounts 100+ 20%, 200+ 25%, 300+ 30%, 500+ 35%, 1000+ 40%
- **Clear Sticker Sheet with White Ink (NON-MET)-Standard Sizes (186)**: its own size prices; discounts 100+ 20%, 200+ 25%, 300+ 30%, 500+ 35%, 1000+ 40%
- **Die Cut Sticker (184)**: its own size prices; discounts 100+ 25%, 200+ 30%, 300+ 35%, 500+ 40%, 1000+ 45%

Prices and discounts therefore have to be read per product. One shared table can't be right.

## 4. Other things found

- **Shapes:** Domed White's BigCommerce `Shape` modifier offers Rectangle, Circle, Stadium and Custom Shape. The studio also offers Square and Oval, which have no matching BigCommerce value. Decide the mapping before the cart is connected.
- **Required modifiers** on Domed White: Review, Shape, Saved Print Output, Background Color, Rounded Corners, Sticker Height, Sticker Width. The studio must fill these when it adds to cart.
- **Product codes:** the studio builds `57NOMWHIDOM--{H}-{W}`, the same format as the BigCommerce variant SKUs.
- **Badge sizes:** BigCommerce stores only the labels size1 to size4; the real dimensions live in Doogma.
