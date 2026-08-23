# AI Web Scraper

> Give it a URL and describe the data you want; it returns structured JSON you can export as CSV.

**[Live demo](https://scraper-mlx.vercel.app)**

Writing a scraper usually means inspecting the DOM and hand-tuning selectors that break the moment the page changes. This app skips selectors entirely. The server fetches the URL with a browser user agent, strips out scripts, styles, nav, and footer, flattens the remaining markup to plain text, and hands that text to Llama 3.3 70B along with your description of what to extract — "product names, prices, and ratings," for instance. The model returns a JSON array of objects, rendered as a table.

## Features

- Natural-language extraction target instead of CSS or XPath selectors
- Results rendered as a table with columns derived from the returned object keys
- Copy JSON to clipboard and download the same rows as CSV
- Collapsible panel showing the raw extracted page text the model actually saw
- Server-side fetch with a 15-second timeout, HTML entity decoding, and a 6,000-character cap

## Stack

- Next.js 16 (App Router) with React 19 and TypeScript
- Tailwind CSS v4
- Groq Chat Completions API — `llama-3.3-70b-versatile` at temperature 0
- Regex-based HTML stripping and CSV serialization, no scraping or parsing libraries

## Running locally

```bash
npm install
npm run dev
```

Requires `GROQ_API_KEY` in `.env.local`.

---

Part of a series of 91 small web apps. [Browse them all](https://lorenzoylosada.vercel.app).
