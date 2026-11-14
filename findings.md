# Wine picker agent — findings

**Status:** the three benchmark briefs were run, validated and hand-checked on
2026-10-10. Decision: **Iterate**. The first iteration, a rerun with changed
discovery rules, was done the same day and is reported under
[Discovery rerun](#discovery-rerun); its shortlisted wines are hand-checked too.

Three briefs on five shops is a feasibility signal, not a quality benchmark.

## Results

Classic Web Scraper API through the Oxylabs MCP server, driven by the
`/pick-wine` skill in Claude Code. Caps per run: 3 searches, 8 page reads.

| #   | Brief                                                          | Searches (empty) | Page reads | Wall time | Shortlisted | Validator                |
| --- | -------------------------------------------------------------- | ---------------- | ---------- | --------- | ----------- | ------------------------ |
| 1   | Primitivo under €15 to go with steak.                          | 3 (1)            | 2          | 34 s      | 2           | pass, under target       |
| 2   | Dry white under €10 for grilled fish.                          | 3 (1)            | 2          | 27 s      | 0           | fail: shortlist is empty |
| 3   | A red around €25 as a gift for someone who likes Italian wine. | 3 (0)            | 6          | 42 s      | 2           | pass, under target       |

Run files, in order: `runs/20261010T144009Z.json`, `runs/20261010T144103Z.json`,
`runs/20261010T144155Z.json`.

- **Wall time** is the gap between the two `date` calls in the skill, in a
  session that was already open. It covers searching, reading and ranking, not
  writing the run file or the reply.
- **Context tokens added** were not measured: the statusline is not visible to
  the agent. What dominates is known from the smoke test and the offline replay
  in the plan: about 10,000 characters per non-empty search result, and 13,000
  to 16,000 per Vynomeka or Vynokambarys page (mostly navigation) against
  1,000 to 7,000 for the other three shops.
- **Price-correct and brief-match counts** come from the hand check below:
  4 of 4 on both.

A run of a non-benchmark brief the same day, "Prosecco under €12 for a
birthday" (`runs/20261010T143642Z.json`), shortlisted five wines from four
shops with 3 searches and 5 page reads in 64 s. It is not counted below.

## Against the thresholds

| Measure                                   | Result              | Verdict                           |
| ----------------------------------------- | ------------------- | --------------------------------- |
| Shortlisted wines with correct price      | 4 of 4              | Go (80% or more)                  |
| Shortlisted wines that match the brief    | 4 of 4              | Go (80% or more)                  |
| Oxylabs requests per brief                | 5, 5 and 9          | Go (11 or fewer)                  |
| Wall time per brief                       | 34 s, 27 s and 42 s | Go (under 2 min)                  |
| Setup: key in hand to first good response | about 30 min        | On the Go / Iterate line (30 min) |

Setup time is an estimate from memory. It includes about 15 minutes looking for
the Web API in the trial dashboard and about 5 on the MCP install crash, both
described in the friction log; without them it would be about 10 minutes.

**Decision: Iterate.** On the thresholds as written, four rows are
Go and setup sits on the line. They measure whether shortlisted wines are right and what
a run costs. They do not measure whether a shortlist is produced at all, and
that is where the prototype fell short: four wines across three briefs against
a target of three to five each, and one brief with none. Four correct wines is
also a small sample to rest a Go on.

## What the runs show

**Finding candidates is the bottleneck, not reading pages.**

- All 10 benchmark page reads returned the product's price and volume without
  rendering (15 of 15 including the Prosecco run). The price shapes seen
  offline all appeared live and were read without a per-shop parser, including
  Vynomeka's lost separator (`2495 €`, checked against the page's own
  `80.00 €` / `8000 €` delivery threshold).
- The 9 benchmark searches surfaced 13 relevant product pages on the five
  shops. 10 were read and 3 were skipped because their snippets put them far
  outside the budget, so 14 of 24 permitted page reads went unused.
- Generic shopper queries return category pages. "sausas baltas vynas prie
  žuvies 0,75 l" gave three category pages on the five shops and no product
  page. Queries that look like a product name ("chianti classico riserva vynas
  0,75 l") gave up to four product pages. The skill tells the agent to skip
  category pages, so those results were dead ends.
- 2 of 9 benchmark searches returned an empty result (`[]`), with no error or
  status to tell a failure from a query without results. Including the
  Prosecco run it is 3 of 12, and two of the three were `site:` queries.
- The one `site:` query that returned results ignored the keyword: ten
  Vynokambarys pages, none of them a Primitivo.

**The validator and the fixed criteria did their job, at a price.**

- Brief 2 failed honestly. Both wines found were over €10 (10.99 and 12.29)
  and were rejected rather than shortlisted.
- Brief 3 rejected two Barolos at 19.99 and 30.49 against a €20–30 band fixed
  before searching. A shopper asking for "around €25" would probably accept
  either. A hard band read from a soft phrase costs recall.

**Search snippets cannot be trusted for prices.** Google's parsed `price` field
was 99 for an IKI wine that costs 11.99 and again for one that costs 19.99.
The rule that prices come only from an opened page held in every run.

**Stock is mostly unknown.** Only Vynokambarys states it in the Markdown; one
of four shortlisted wines has confirmed stock.

## Hand check

Done by hand on 2026-10-10 by opening each link. A price is correct if it
equals what a buyer without a loyalty card pays today for a 0.75 l bottle.
Every recorded price was confirmed, and all four shortlisted wines match
their brief.

| Brief | Wine                                                                                                                                                                                                              | Shop         | Recorded | Price correct? | Matches brief? |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | -------- | -------------- | -------------- |
| 1     | [Santoro Primitivo Puglia](https://vynoteka.lt/santoro-primitivo-puglia-075-l)                                                                                                                                    | Vynoteka     | €8.99    | yes            | yes            |
| 1     | [Vigneti del Salento I Muri Primitivo Puglia](https://www.rimi.lt/e-parduotuve/lt/produktai/alkoholiniai-ir-nealkoholiniai-gerimai/vynas/raudonasis-vynas/raudonas-sausas-vynas-primitivo-puglia-0-75l/p/7201736) | Rimi         | €9.99    | yes            | yes            |
| 3     | [Banfi Chianti Classico Riserva](https://www.vynokambarys.lt/banfi-chianti-classico-riserve-docg-075-l)                                                                                                           | Vynokambarys | €24.95   | yes            | yes            |
| 3     | [Ruffino Riserva Ducale Chianti Classico Riserva](https://www.vynomeka.lt/vynas-ruffino-riserva-ducale-chianti-classico-riserva-docg-075-l)                                                                       | Vynomeka     | €24.95   | yes            | yes            |

Rejected on price. Worth a glance, because a misread price here would hide a
wine that fits.

| Brief | Wine                                                                                                                                                                               | Shop     | Recorded | Price correct? |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------- | -------------- |
| 2     | [New Zeas Sauvignon Blanc](https://vynoteka.lt/new-zeas-sauvignon-blanc-075l-13)                                                                                                   | Vynoteka | €10.99   | yes            |
| 2     | [LYV Sauvignon Blanc](https://www.rimi.lt/e-parduotuve/lt/produktai/alkoholiniai-ir-nealkoholiniai-gerimai/vynas/baltasis-vynas/b-s-vynas-lyv-sauvignon-blanc-12-0-75-l/p/7290190) | Rimi     | €12.29   | yes            |
| 3     | [Barolo Terre Sabaude](https://vynoteka.lt/barolo-terre-sabaude-075-l)                                                                                                             | Vynoteka | €30.49   | yes            |
| 3     | [Manieri Barolo DOCG](https://iki.lt/alkoholiniai-gerimai/raudonasis-vynas-manieri-barolo-docg-075-l/)                                                                             | IKI      | €19.99   | yes            |
| 3     | [Antiche Terre Valpolicella Ripasso Superiore](https://vynoteka.lt/antiche-terre-valpolicella-ripasso-superiore-075-l)                                                             | Vynoteka | €14.99   | yes            |
| 3     | [Poggio Civetta Chianti Classico DOCG](https://vynoteka.lt/poggio-civetta-chianti-classico-docg-075-l)                                                                             | Vynoteka | €15.99   | yes            |

## Discovery rerun

Run on 2026-10-10 after the decision to iterate. Only candidate discovery
changed:

1. The agent may read up to 3 listing pages of the five shops (category, grape
   or "goes with" pages that appear in the search results) within the 8 page
   reads, and follow product links from them. Listing prices only choose which
   products to open; a price is still recorded only from the product's page.
2. A search that returns an empty result may be retried once per run.

The validator enforces both: it allows one extra search when one is marked
empty, and rejects a shortlisted URL that was read as a listing. The price
band rule and everything about reading product pages are unchanged.

| #   | Brief                 | Shortlisted | Requests | Wall time   | Validator          |
| --- | --------------------- | ----------- | -------- | ----------- | ------------------ |
| 1   | Primitivo under €15   | 2 → 4       | 5 → 8    | 34 s → 47 s | pass               |
| 2   | Dry white under €10   | 0 → 5       | 5 → 11   | 27 s → 87 s | fail → pass        |
| 3   | Italian red about €25 | 2 → 2       | 9 → 7    | 42 s → 75 s | pass, under target |

Run files, in order: `runs/20261010T151320Z.json`, `runs/20261010T151438Z.json`,
`runs/20261010T151627Z.json`.

Eleven wines against four, and two of three briefs now reach the target of
three to five. Every run stayed within 11 requests and under two minutes, and
all eleven wines passed the hand check on price and on fit.

### What the rerun shows

- **Listing pages rescued brief 2.** Its searches again returned no product
  page. The Vynokambarys white-wine listing came back as Markdown with 32 of
  its 98 products, each with name, sweetness, price and link, and supplied
  three wines. The listing prices matched the product pages.
- **Listing pages are not reliably readable.** Of five listing reads, one
  supplied candidates. Vynoteka listings are filled in by script: both the
  Markdown and the links output held navigation only. One IKI listing returned
  "Document is empty"; another was readable but lists the cheapest wines
  first, all under €6. Rimi and Vynomeka listings were not tried.
- **Brief 1 improved because of the queries, not the rule change.** All four
  product pages came from the search results, two of them only from the image
  and overview blocks. Different wording found twice as many pages as the
  first round's.
- **Brief 3 did not improve.** The searches surfaced no listing that held
  wines near €25, so the agent ended with the same two bottles.
- **The retry works.** The one empty result returned ten results when the
  same query was repeated, so empty results are failures, not answers. Over
  the day, 4 of 21 searches came back empty.
- **Prices were stable.** The four wines read in both rounds, about 35 minutes apart, showed the same prices.

### Limits of the comparison

- The agent chose different search queries in the two rounds, so the gain
  cannot be credited to the rule change alone. Brief 1 shows that directly.
- Both rounds ran in one session. In the rerun the agent skipped two Vynoteka
  listings and one product page it already knew to be useless. A fresh
  session would have spent two or three more page reads on brief 3.
- `/pick-wine` served the skill text cached at the start of the session, so
  the agent followed the edited `SKILL.md` on disk. A fresh session is needed
  for the command itself to show the new rules.
- One run per brief per round. Nothing here measures run-to-run variation.

### Hand check of the rerun

Done by hand on 2026-10-10. The four wines marked "round 1" were confirmed
earlier the same day at the same prices; the seven new wines were all
confirmed on price and on fit. That makes 11 of 11 shortlisted wines correct
on both measures in the rerun.

| Brief | Wine                                                                                                                                                                                                              | Shop         | Recorded | Price correct? | Matches brief? |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | -------- | -------------- | -------------- |
| 1     | [Maia Primitivo Puglia Bio](https://vynoteka.lt/maia-primitivo-puglia-bio-075-l)                                                                                                                                  | Vynoteka     | €10.99   | yes            | yes            |
| 1     | [Doppio Passo Primitivo Puglia IGT](https://www.vynomeka.lt/vynas-doppio-passo-primitivo-puglia-igt-075-l)                                                                                                        | Vynomeka     | €8.95    | yes            | yes            |
| 1     | [Vigneti del Salento I Muri Primitivo Puglia](https://www.rimi.lt/e-parduotuve/lt/produktai/alkoholiniai-ir-nealkoholiniai-gerimai/vynas/raudonasis-vynas/raudonas-sausas-vynas-primitivo-puglia-0-75l/p/7201736) | Rimi         | €9.99    | round 1        | round 1        |
| 1     | [Santoro Primitivo Puglia](https://vynoteka.lt/santoro-primitivo-puglia-075-l)                                                                                                                                    | Vynoteka     | €8.99    | round 1        | round 1        |
| 2     | [Ferraton La Tournée Vin de France White](https://www.vynokambarys.lt/ferraton-la-tourne-vin-de-france-white-075-l)                                                                                               | Vynokambarys | €8.90    | yes            | yes            |
| 2     | [Lupo Nero Bianco Sicilia IGT](https://www.vynokambarys.lt/lupo-nero-bianco-sicilia-igt)                                                                                                                          | Vynokambarys | €5.50    | yes            | yes            |
| 2     | [Santa Rita 120 Chardonnay](https://www.vynokambarys.lt/santa-rita-120-chardonnay)                                                                                                                                | Vynokambarys | €7.90    | yes            | yes            |
| 2     | [Doppio Passo Pinot Grigio](https://www.rimi.lt/e-parduotuve/lt/produktai/alkoholiniai-ir-nealkoholiniai-gerimai/vynas/baltasis-vynas/b-saus-vynas-doppio-passo-pinot-grigio-0-75l/p/7189660)                     | Rimi         | €9.49    | yes            | yes            |
| 2     | [Domodo Pinot Grigio](https://iki.lt/alkoholiniai-gerimai/baltasis-vynas-domodo-pinot-grigio-075-l/)                                                                                                              | IKI          | €9.29    | yes            | yes            |
| 3     | [Banfi Chianti Classico Riserva](https://www.vynokambarys.lt/banfi-chianti-classico-riserve-docg-075-l)                                                                                                           | Vynokambarys | €24.95   | round 1        | round 1        |
| 3     | [Ruffino Riserva Ducale Chianti Classico Riserva](https://www.vynomeka.lt/vynas-ruffino-riserva-ducale-chianti-classico-riserva-docg-075-l)                                                                       | Vynomeka     | €24.95   | round 1        | round 1        |

Rejected on price: [Elemento Pinot Grigio](https://vynoteka.lt/elemento-pinot-grigio-075-l),
Vynoteka, recorded €16.99 (brief 2). Confirmed by hand as well.

## Friction

The full log is in [plan.md](plan.md). The entries the benchmark added:

- Empty search results arrive as `[]` with no status, so an agent cannot tell
  whether to retry, and each one used a third of the run's search budget.
- `site:` did not restrict a search usefully in three attempts.
- The parsed search result carries a `price` field that was wrong by a factor
  of five to eight on IKI pages. In the rerun it read 29 for a wine at 9.29.
- The same tool and output format gave a full product list on one shop's
  listing, navigation only on another's, and "Document is empty" on a third.
  Nothing in the response says which case occurred.

## What this does not show

- Whether anyone wants this, or would pay for it.
- Behaviour beyond three briefs, five shops and one session: no repeat runs,
  so no measure of how much results vary between runs of the same brief.
- Whether the shortlisted wines are the best on offer. Nothing compares the
  shortlist with the shops' full range.
- The new Web API. Everything here ran on the classic API.

## Next test

The rerun leaves two gaps, both in finding candidates:

1. Listings only help when a search happens to surface a readable one. Give
   the skill one known listing address per shop to start from, or let it
   follow the category link on a product page it has read. That is a small
   per-shop list, which is a step back from "no per-shop knowledge" and should
   be said plainly.
2. Vynoteka listings need a rendered read. Allow `render` for a listing that
   comes back without products, and count it as a page read.

A soft price band ("around €25") read as a hard one still costs recall on
brief 3. That is a ranking rule, separate from discovery.

Any further round should start each brief in a fresh session and fix the
search queries in advance, so that the comparison is clean.
