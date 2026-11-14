# Wine picker agent

A prototype that tests one assumption: an agent given only Oxylabs tools through
MCP can return a correct shortlist of wines on sale in Lithuanian shops, without
hand-written per-shop parsers.

Results of the three benchmark briefs are in [findings.md](findings.md).
Status, decisions, request budget and resume instructions are in
[plan.md](plan.md).

## Setup

Requires Node 22.5+ and [uv](https://docs.astral.sh/uv/) (for the Oxylabs MCP
server).

```sh
npm install
cp .env.example .env.local   # then fill in the classic API credentials
```

Start Claude Code from this folder with the credentials in the environment, so
the project MCP server can read them:

```sh
set -a; source .env.local; set +a; claude
```

## Commands

```sh
npm run check                        # formatting and tests
npm run format                       # Prettier
npm run smoke -- --offline           # replay the cached smoke test (no requests)
npm run validate -- runs/<file>.json # check a picker run
```

`npm run smoke` without `--offline` spends two requests.

## Running the picker

In Claude Code, started as above:

```
/pick-wine Primitivo under €15 to go with steak
```

The skill in `.claude/skills/pick-wine/SKILL.md` makes up to 3 Google searches
(plus one retry if a search comes back empty) and reads up to 8 pages as
Markdown through the Oxylabs MCP server. Up to 3 of those may be listing
pages, used only to find product links. It takes name, price, volume and stock
from each product page, ranks the wines that fit and writes
`runs/<timestamp>.json`. `lib/validate.js` then checks that file
with plain code: schema, request caps, shop allowlist, that every shortlisted
URL was a product page actually read, price within the brief, quoted price
text matching the reported price, and bottle volume. A run that fails validation is
kept and reported as failed.

## Limits

- Five shops only: Vynoteka, Vynokambarys, Vynomeka, Rimi and IKI.
- Candidates come from product pages in the search results and from listing
  pages that the searches surface. On the benchmark that gave 2, 0 and 2 wines
  before listings were allowed and 4, 5 and 2 after; see the findings.
- Not every shop's listings can be read: Vynoteka's come back without
  products.
- The validator cannot confirm that a price really was on the page. That takes
  a hand check of each link.
- Stock is unknown unless the page says so in its Markdown, which only
  Vynokambarys does.
- It runs on the classic Web Scraper API. The new Web API was not available to
  the trial account.

## Cost

A run makes at most 12 Oxylabs requests (11, plus one retry of an empty
search). The benchmark runs made 5 to 11 and took 27 to 87 seconds each. Every request costs trial credit. The price per
request has not been read from the dashboard, so no cost in money is stated
here. The request budget and running count are in the plan.
