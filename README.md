# Custom Genie Studio: Domed Vinyl Stickers (v3)

World Emblem's Custom Genie sticker customizer:

* **Design studio**: a Figma-style editor with layers, text, shapes, images and pen, and a live price and print check.
* **Genie, the AI designer**: customers describe a logo and **Nano Banana Pro** (Google Gemini 3 Pro Image, via OpenRouter) draws options they can click or drag into the canvas, then edit ("make it navy and gold").
* **3D preview**: a real WebGL dome model in gloss white, silver or gold. It's for viewing only; editing happens in Design.
* **Print MCP spec v0.2**: `docs/print-mcp-spec-v0.2.md`, also viewable at `/spec.html`.

```
public/index.html      the studio page (one self-contained file, built from studio-src/)
public/spec.html       the Print MCP spec, readable in a browser
server.mjs             small Node server: serves the page and holds the AI key (no npm install needed)
render.yaml            one-click deploy settings for Render
studio-src/            the studio's source files and build script
docs/                  Print MCP spec (markdown)
.env.example           settings template (copy to .env on your computer; never commit .env)
```

---

## Team test link (Render)

GitHub stores the code. **Render** runs it and gives you the live link. GitHub Pages can't be used for the full app, because it can't run the server that keeps the AI key secret.

**One-time setup (about 5 minutes):**

1. Go to **https://dashboard.render.com** and sign in **with GitHub**.
2. Click **New → Blueprint**.
3. Pick the **custom-genie-studio** repository. If you don't see it, click "Configure account" and give Render access to it.
4. Render reads `render.yaml` and asks for two values:
   * **OPENROUTER_API_KEY**: your OpenRouter key (starts with `sk-or-`).
   * **GENIE_TEAM_PASSWORD**: any password you choose. Your team types it to open the link.
5. Click **Apply**. After 1–2 minutes the link appears at the top of the service page, for example `https://custom-genie-studio.onrender.com`.

**Share with the team:** the link and the password. When the browser asks for a user name and password, any user name works.

**Good to know:**

* **Free plan sleep:** the server sleeps after 15 minutes without visitors, so the first visit after a break takes about 50 seconds. A paid instance ($7/month) stays awake.
* **Auto-deploy:** every push to the `main` branch redeploys automatically.
* **Cost cap:** the test link stops making AI logos after **100 images a day** (about $13). You can change `GENIE_DAILY_IMAGE_LIMIT` under **Environment** in Render.
* **Server log:** Render's **Logs** tab shows each logo request and its cost, and the exact reason if a request fails, like "out of credits".

## Run it on your own computer

1. Install Node.js 18 or newer (https://nodejs.org).
2. Copy `.env.example` to `.env` and paste your key after `OPENROUTER_API_KEY=`.
3. Double-click `start-server.bat` (or run `node server.mjs`) and open http://localhost:8765/.

## Settings

Set these in `.env` on your computer, or under **Environment** in Render.

| Setting | Default | What it does |
|---|---|---|
| `OPENROUTER_API_KEY` | none | OpenRouter key (`sk-or-…`). A Google Gemini key (`AIza…`) in `GEMINI_API_KEY` also works. |
| `GENIE_TEAM_PASSWORD` | off | Asks for a password before showing anything. Use it on shared links. |
| `GENIE_IMAGES_PER_REQUEST` | 2 | Logo options per request (1–4). About $0.134 each at 2K. |
| `GENIE_IMAGE_SIZE` | 2K | 1K, 2K or 4K (4K is about $0.24 per image). |
| `GENIE_IMAGE_MODEL` | gemini-3-pro-image | `gemini-3.1-flash-image` (Nano Banana 2) is about half the price. |
| `GENIE_RATE_PER_10MIN` | 8 | Requests per visitor every 10 minutes. |
| `GENIE_DAILY_IMAGE_LIMIT` | 200 (100 on Render) | Images per day for everyone combined: a hard cost cap. |
| `GENIE_ALLOWED_ORIGINS` | none | Only if the studio page is hosted on a different domain from the server. |
| `GENIE_MOCK` | off | `1` makes fake logos: a free test mode with no API calls. |

If no key is set, or the AI is unavailable, Genie still works with its built-in design layouts, so customers never hit a dead end.

## Editing the studio

The page is built from the files in `studio-src/src/`:

* `studio.html`, `dialogs.html` and the other `.html` files: markup
* `style.css`: all styles (brand colors, Poppins and Work Sans)
* `js1_core.js`: canvas, pricing and rules
* `js2_interact.js`: tools and dragging
* `js3_panels.js`: panels and print check
* `js4_genie.js`: Genie chat
* `js5_3d.js`: 3D preview
* `js6_banana.js`: Nano Banana Pro client

After editing, rebuild the page (Python 3):

```
python studio-src/build.py public/index.html
```

Then commit and push. Render redeploys by itself.

## Security

* The AI key lives **only** in `.env` on your computer or in Render's Environment settings. It's never in the page, and `.gitignore` keeps `.env` out of GitHub.
* The server refuses AI requests from other websites, limits each visitor's request rate, caps the number of images per day, and never logs the key.

## Before launch (placeholders to confirm)

* Silver and gold finish codes (SIL, GLD), estimated prices and the 5-day turnaround.
* The local checkout stand-in, which should be replaced by the real cart.
* three.js for the 3D preview loads from jsDelivr; self-host it for production.

## Genie chat (v1.2)

Genie now holds a real conversation. A chat model gathers the brief, then sends a written art brief to Nano Banana Pro.

- **Two ways in** (on Genie's first message): **Walk me through it** asks one question at a time with tap-able answers. **Just make it for me** takes one line or one image and draws right away. Shoppers can also just type.
- **Flow:** the server (`/api/genie/chat`) sends the conversation, the brief so far, the current sticker state and the product facts to the chat model (`GENIE_CHAT_MODEL`). The model answers with text plus *actions*. It never touches the page directly.
- **Actions** (`server.mjs` `CHAT_TOOLS`, each validated on the server): `ask_user`, `update_brief`, `create_designs`, `edit_logo`, `edit_design`, `set_sticker`, `show_layouts`. `studio-src/src/js7_chat.js` carries them out with the studio's own functions (`setShape`, `setSize`, `genieEdit`, `nbEdit`, `generate`, `commit`). Every change is a normal edit with Undo, and all manual tools keep working.
- **Spending:** in guided mode a plan card ("Here's my plan" → **Create my designs**) is confirmed before anything is drawn. "Just make it for me" draws straight away; picking that mode is the consent.
- **Reference images:** files attached in the chat are now sent to Nano Banana Pro for *new* designs too (up to 3). Before this, only edits sent an image.
- **Facts:** shapes, sizes, finishes and quantities come from the page (`gcFacts()`). Genie is told never to quote prices or turnaround, and points to the price panel instead.
- **Fallback:** if the chat is off or the server can't be reached, Genie uses its built-in rules exactly as before.
- **Mock:** with `GENIE_MOCK=1`, a scripted chat runs with no API calls, for testing the UI.

Build after editing `studio-src/`: `python studio-src/build.py public/index.html`.
