---
name: pick-wine
description: Shortlist 3–5 wines currently on sale in five Lithuanian shops for a brief (budget, style, occasion, food), using only the Oxylabs MCP search and page tools, and write a validated run file. Use when asked to pick, recommend or shortlist a wine to buy in Lithuania.
argument-hint: <brief, e.g. "Primitivo under €15 to go with steak">
---

# Pick a wine

Brief: $ARGUMENTS

Return a shortlist of wines a person can buy today, each with a price read from
the shop's own product page. A wrong price or a wrong bottle is worse than a
shorter list.

## Tools and hard caps

Use only these two tools. Do not use the `ai_*` or Amazon tools, WebSearch,
WebFetch, or any script that calls Oxylabs.

| Purpose   | Tool                                  | Cap per run                       |
| --------- | ------------------------------------- | --------------------------------- |
| Search    | `mcp__oxylabs__google_search_scraper` | 3 calls, plus 1 retry (see below) |
| Page read | `mcp__oxylabs__universal_scraper`     | 8 calls, listing pages included   |

Every call counts, including failed ones and retries. The one exception: if a
search returns an empty result (`[]`), you may make one extra search in the
run, with the same or a reworded query. When a cap is reached, stop and work
with what you have. If the Oxylabs tools are not available, stop
and say so; do not substitute another source.

## Shops

Only these five. Anything else is ignored, however good it looks.

| `shop` id      | Host              |
| -------------- | ----------------- |
| `vynoteka`     | `vynoteka.lt`     |
| `vynokambarys` | `vynokambarys.lt` |
| `vynomeka`     | `vynomeka.lt`     |
| `rimi`         | `rimi.lt`         |
| `iki`          | `iki.lt`          |

## Steps

1. Run `date -u +%Y-%m-%dT%H:%M:%SZ` and keep the result as `startedAt`.
2. Turn the brief into criteria: price floor and ceiling in euros (either may be
   absent; "around €25" means roughly €20–30), colour, style or grape, country,
   occasion, food. Bottle size is 750 ml unless the brief says otherwise.
3. Search. Call the search tool with `parse: true`, `domain: "lt"`,
   `geo_location: "Lithuania"`. Write queries in Lithuanian, as a shopper
   would ("primitivo vynas", "sausas baltas vynas"). At most one `site:` filter
   per query; several joined with OR return irrelevant results. Spread the
   searches so that more than one shop is represented.
4. From the results keep product pages and listing pages on the five shops. A
   listing page shows many wines: a category, a grape, a style or a "goes
   with" page. Skip search-result, article and home pages. Result snippets can
   be stale: use them to choose pages, never as a price.
5. If the product pages in hand are unlikely to give three wines that fit,
   read up to 3 listing pages with `output_format: "md"` and take product
   links from them. Prefer the listing closest to the brief (a grape or style
   page over "all red wine") and spread them over shops. Names and prices on a
   listing only choose which products to open: never record them as a price.
   Links can be relative; resolve them against the shop's host. If a listing's
   Markdown has no product links, you may read it again with
   `output_format: "links"`, which counts as another page read.
6. Read the most promising product pages with `output_format: "md"`. Do not set
   `render` unless a page came back without the product's price, and count the
   rendered retry as another page read.
7. From each product page take the name, producer, bottle volume, price, stock
   and anything that bears on the brief (colour, sweetness, grape, country).
8. Rank the wines that fit the brief and are not out of stock. Keep the best
   3–5. If fewer than three fit, return fewer and say why.
9. Run `date -u +%Y-%m-%dT%H:%M:%SZ` for `finishedAt`, then write the run file
   and validate it (below).
10. Reply with the shortlist: rank, name, shop, price, one-line reason and link,
    followed by the request counts and the validator's result.

## Reading prices

Pages arrive as Markdown converted from HTML, and the price is often mangled:

- Euros and cents can sit on separate lines: `15`, `99`, `€` means 15.99.
- The decimal separator can be missing: `1560 €` on a bottle of wine means
  15.60. Check against a per-litre price or the shop's other prices if shown.
- The currency can be written `Eur`.
- Ignore basket totals (`0,00 €`), free-delivery thresholds and per-litre
  prices (`€/l`).
- If a page shows both a regular and a loyalty-card or promotional price,
  record the price a buyer without a card pays today and mention the other in
  the reason.

If you cannot tell the price or the volume with confidence, leave the wine out.
Set `inStock` to `true` or `false` only when the page says so; otherwise `null`.

## Run file

Write `runs/<startedAt as YYYYMMDDTHHMMSSZ>.json` in exactly this shape:

```json
{
  "schemaVersion": 1,
  "brief": "the brief, verbatim",
  "startedAt": "2026-10-10T15:00:00Z",
  "finishedAt": "2026-10-10T15:01:30Z",
  "criteria": {
    "minPriceEur": null,
    "maxPriceEur": 15,
    "volumeMl": 750,
    "notes": "red, Primitivo, to go with steak"
  },
  "requests": {
    "searches": [
      { "query": "primitivo vynas" },
      { "query": "primitivo site:rimi.lt", "empty": true }
    ],
    "pageReads": [
      { "url": "https://vynoteka.lt/…", "ok": true, "kind": "listing" },
      { "url": "https://vynoteka.lt/…", "ok": true },
      {
        "url": "https://www.rimi.lt/…",
        "ok": false,
        "note": "no price on page"
      }
    ]
  },
  "shortlist": [
    {
      "rank": 1,
      "name": "Product name as the shop writes it",
      "producer": "Producer, or null if the page does not say",
      "shop": "vynoteka",
      "url": "https://vynoteka.lt/…",
      "priceEur": 13.99,
      "priceText": "13 99 €",
      "volumeMl": 750,
      "inStock": null,
      "reason": "One line tying the wine to the brief."
    }
  ],
  "rejected": [{ "url": "https://…", "reason": "1.5 l magnum" }],
  "notes": "Anything a reader needs to interpret the run."
}
```

- `requests` lists every call made, in order, including failures (`ok: false`).
  Mark a search that returned an empty result with `"empty": true` and a
  listing page with `"kind": "listing"`.
- `priceText` is the price exactly as it appeared on the page and nothing else
  (no volume, no per-litre price), with line breaks replaced by spaces.
- `url` in the shortlist must be a product page listed in `pageReads` with
  `ok: true`, never a listing page.

Then run:

```sh
node scripts/validate-run.js runs/<file>.json
```

If it reports errors, fix only mistakes in how the file was written. Never
change or drop a price, volume, URL or wine to make the run pass, and never
make another Oxylabs call after `finishedAt`. Report remaining errors as they
are: a failed run is a result.
