# Wine picker agent — plan

Single source of truth for this prototype's progress. Update the status of a
step when it starts and when it ends; replace notes rather than append a diary.

**Status legend:** 🟢 done and verified · 🟡 in progress · 🔴 blocked or failed,
needs attention · ⚪ not started

**Last updated:** 2026-10-10 (building stopped) · **Time budget:** half a day
(about 4.5 hours)

## Resume here (fresh session)

**Building is stopped.** On 2026-10-10 the user chose to stop after the
discovery rerun.

1. Read `findings.md` first. It holds both rounds, the hand checks, the
   friction and the next test that was defined but not run. Then read the
   Outcome section below.
2. Do not spend Oxylabs requests to rediscover context; 55 of the 80 budgeted
   are used.
3. If building resumes later, start Claude Code from this folder with
   credentials loaded (`set -a; source .env.local; set +a; claude`). Use a
   fresh session so the edited skill is loaded, and begin with the next test
   in `findings.md`.

## Outcome (2026-10-10)

**The riskiest assumption holds in part.** An agent with only Oxylabs MCP
tools reads product pages correctly without per-shop parsers. It does not yet
find enough of them.

- **Reading pages works.** All 27 product page reads returned a price without
  rendering, across five shops and five price shapes. The user confirmed by
  hand every price checked: 11 shortlisted wines and 7 rejected ones, 18 pages
  in all. All 11 shortlisted wines also matched their brief.
- **Finding candidates is the weak part.** The first round shortlisted 2, 0 and
  2 wines against a target of three to five. Letting the agent read listing
  pages and retry an empty search gave 4, 5 and 2. Listings are readable on
  some shops only, and the gain is partly due to different search queries.
- **Cost and speed are fine.** 5 to 11 requests and 27 to 87 seconds per brief;
  55 requests for the whole prototype.
- **Setup took about 30 minutes**, of which about 20 were two friction items:
  the Web API not being offered to the trial account, and the documented MCP
  install command crashing.
- **Decision: Iterate**, confirmed by the user. One iteration was run; the
  second is described in `findings.md` and was not run.

**Open threads**

- Web API access: not available to this trial account (see step 1).
  Everything ran on the classic API.
- The price per request has not been read from the dashboard, and it is not
  known whether empty search results are billed.
- The two rounds are not a clean comparison (see "Limits of the comparison"
  in `findings.md`).
- Step 10, the run viewer, was not started and is not planned.
- Not yet sorted: which friction items are feedback for Oxylabs and which are
  specific to this setup.

## What this prototype tests

**Idea.** A person describes the wine they want (budget, style, occasion, food).
An agent uses Oxylabs search and page retrieval to look through Lithuanian
shops and return a shortlist of wines actually on sale, with current prices,
source links and reasons.

**Riskiest assumption.** An agent given only Oxylabs tools through MCP can
return a shortlist that is _correct_ (real product, right bottle, current price)
without the hand-written per-shop parsers and matching rules that Cellar needed.
Cellar is an earlier prototype (repository `wine-price-monitor`, not public)
that tracks prices on the same five shops with a parser per shop.

**Why it matters.** It is a first-hand trial of Oxylabs driven the way an
agent developer would use it (MCP, a skill, no custom parser), with measured
correctness and cost instead of an impression. It runs on the classic API
because the Web API launched on 7 October is not offered to this trial
account; that gap is itself recorded in the Friction log.

### Decision thresholds (set before running)

| Measure                                   | Go           | Iterate   | Stop        |
| ----------------------------------------- | ------------ | --------- | ----------- |
| Shortlisted wines with correct price      | 80% or more  | 50–79%    | under 50%   |
| Shortlisted wines that match the brief    | 80% or more  | 50–79%    | under 50%   |
| Oxylabs requests per brief                | 11 or fewer  | 12–20     | over 20     |
| Wall time per brief                       | under 2 min  | 2–5 min   | over 5 min  |
| Setup: key in hand to first good response | under 30 min | 30–90 min | over 90 min |

Correctness is checked by opening each shortlisted URL by hand. The five Papale
prices recorded by Cellar on 2026-10-09 are a reference only, not live truth.

## Decisions

- **API surface (changed 2026-10-10): classic Web Scraper API, not the new Web
  API.** The trial dashboard offers no way to add a Web API instance (see
  Friction log), so the build uses the classic MCP server with the existing
  username and password. The skill, validator and briefs are written so the
  tools can be swapped; if a Web API key arrives, rerun the same three briefs
  on it for a like-for-like comparison.
- **Agent runtime: Claude Code + Oxylabs MCP + a project skill.** No
  separate model API key or app server. Alternative, if a standalone demo is
  wanted later: a Node service calling a model API with the same tools.
- **Trust is not delegated to the model.** A deterministic validator checks
  every run (shop allowlist, product URL, price range, bottle volume, schema).
- **Shops:** Vynoteka, Vynokambarys, Vynomeka, Rimi, IKI (same as Cellar).
- **New independent repository** in this folder; Cellar is not modified.
- **Committing and pushing** happen only when asked. The key stays in ignored
  `.env.local` files; `.mcp.json` references `${OXYLABS_USERNAME}` and
  `${OXYLABS_PASSWORD}`, never the values.

## Steps

| #   | Status | Step                        | Timebox | Done when                                                                                                                                          |
| --- | ------ | --------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | 🟢     | Plan and research           | —       | This file exists; Web API, MCP and Agent Skills docs read (see References).                                                                        |
| 1   | 🟢     | Access and budget           | 15 min  | Classic access confirmed; Web API access requested from Oxylabs and the outcome noted below.                                                       |
| 2   | 🟢     | Scaffold the repository     | 20 min  | `git init`; `package.json` (Node 22, ESM), Prettier config matching Cellar, `.gitignore`, `.env.example`, README stub.                             |
| 3   | 🟢     | Smoke test the API directly | 30 min  | One `google_search` and one `universal` Markdown request succeed from `scripts/smoke.js`; latency and payload noted.                               |
| 4   | 🟢     | Connect MCP to Claude Code  | 30 min  | `.mcp.json` (local `uvx oxylabs-mcp`) committed without secrets; after a session restart the Oxylabs tools are listed.                             |
| 5   | 🟢     | Picker skill                | 60 min  | `/pick-wine <brief>` returns a shortlist and writes `runs/<timestamp>.json` within the per-run request caps.                                       |
| 6   | 🟢     | Validator and tests         | 40 min  | `scripts/validate-run.js` rejects bad runs; `npm test` covers each rule; `npm run check` passes.                                                   |
| 7   | 🟢     | Three benchmark briefs      | 45 min  | Three fixed briefs run, validated and hand-checked; results table filled in `findings.md`.                                                         |
| 8   | 🟢     | Findings and decision       | 30 min  | `findings.md` states the numbers, the friction log, go / iterate / stop against the thresholds, and the next test.                                 |
| 9   | 🟢     | README                      | 20 min  | README explains run, limits and cost; commit made if requested.                                                                                    |
| 10  | ⚪     | Stretch: static run viewer  | 30 min  | Only if steps 1–9 are 🟢 with time left: one HTML page that renders a run file.                                                                    |
| 11  | 🟢     | Discovery rerun             | 45 min  | Skill reads listing pages and may retry one empty search; same three briefs rerun, validated and hand-checked; `findings.md` compares both rounds. |

### Step notes

**1 — Access and budget.** Classic trial: $0.02 of $1 used on 2026-10-10
(dashboard screenshot), credentials copied into this folder's `.env.local`.
Web API: asked in the dashboard chat on 2026-10-10. It exists only in the new
dashboard, and this account had not yet been migrated to it, so the build
proceeds on the classic API. Once the account is migrated, add
`OXYLABS_WEB_API_KEY=...` to `.env.local` and rerun the three briefs.

**2 — Scaffold.** Own repository on `main`, pushed to
`github.com/deividas-butkus/wine-picker-agent`; later commits only when asked.
`.env.local` and `data/` are ignored; `runs/` is tracked because run files are
the evidence for the findings.

**3 — Smoke test.** `npm run smoke` (two requests; `-- --offline` replays the
cache). Results on 2026-10-10: parsed `google_search` "primitivo vynas kaina"
in 2.9 s, 10,566 characters of JSON, 9 organic results of which 4 on the five
shops (all Vynoteka). `universal` with `markdown: true` on the Vynoteka Papale
page in 5.5 s: 18,040 characters, about 4,500 tokens, 3.4% of the 537,580
characters of HTML Cellar cached. The price survives (15.99, unchanged from
Cellar's 2026-10-09 reading) but split over three lines: `15`, `99`, `€`.
JSON-LD is dropped, so stock is not stated in the Markdown.

**4 — MCP.** `.mcp.json` is written and holds only `${OXYLABS_USERNAME}` and
`${OXYLABS_PASSWORD}`. The documented `uvx oxylabs-mcp` crashes on start (see
Friction log), so the config runs `uvx --with "mcp<2" oxylabs-mcp`. Verified
outside Claude Code by a `tools/list` call (no Oxylabs request): server 0.9.3
starts and lists 10 tools, the four expected ones plus six AI Studio tools
(`ai_search`, `ai_scraper`, `ai_crawler`, `ai_browser_agent`, `ai_map`,
`generate_schema`) that are listed even without an AI Studio key. Confirmed
on 2026-10-10 in a restarted session: the ten `mcp__oxylabs__*` tools are
listed and the two the skill uses returned live results.

The server's `output_format: "md"` is not the API's `markdown: true`: it
fetches HTML and converts locally (lxml clean + markdownify). Replaying Cellar's
five cached Papale pages through that code, offline, gives what the agent will
actually read:

| Shop         | HTML chars | MCP Markdown chars | Price as it appears    |
| ------------ | ---------- | ------------------ | ---------------------- |
| Vynoteka     | 537,580    | 2,851              | `15` / `99` / `€`      |
| Rimi         | 144,954    | 1,032              | `13` / `99` / `€/vnt.` |
| IKI          | 258,099    | 7,181              | `14` / `99` / `Eur`    |
| Vynokambarys | 70,509     | 12,679             | `Kaina 15.55 €`        |
| Vynomeka     | 79,923     | 15,627             | `1560 €` (is 15.60)    |

So eight page reads cost roughly 2,000–30,000 tokens, and every shop keeps the
price, but in four shapes, one of which (Vynomeka) reads as €1,560. Only
Vynokambarys states stock ("turime sandėlyje"). Prices in the table are from
Cellar's cache of 2026-10-09, not rechecked.

Official skills (`oxylabs/agent-skills`): five API reference skills
(`web-scraper-api`, `web-unblocker`, `proxies`, `agent-browser`,
`video-data`) that teach an agent to call the API with curl. No overlap with a
task skill like ours and not needed with MCP, so not installed.

**5 — Picker skill.** `.claude/skills/pick-wine/SKILL.md`. Flow: parse the brief
→ up to 3 Google searches (Lithuania) → keep allowlisted product URLs → up to 8
page reads as Markdown; the agent reads name, producer, volume, price and stock
from each → rank → shortlist of
3–5 with a one-line reason and source URL each. Hard caps: 3 searches and 8
page reads per run. Output schema is fixed so the validator can check it.
The price guidance in the skill is general (split lines, missing separator,
basket totals) and comes from the offline replay above, before any brief was
run. First live run on 2026-10-10, "Prosecco under €12 for a birthday":
`runs/20261010T143642Z.json`, 3 searches, 5 page reads, 64 s, 5 shortlisted
from 4 shops, validator passed with stock warnings only. Not hand-checked and
not one of the benchmark briefs. The skill is unchanged since that run.

**6 — Validator.** `lib/validate.js`, CLI `npm run validate -- runs/<file>`.
Rules: schema, request caps (3 and 8), shortlist size, shop allowlist, product
URL must be a successfully read page, price within the brief and within €2–500,
`priceText` digits must equal `priceEur`, bottle volume, stock. 13 tests since
step 11 added the empty-search retry and listing-page rules; `npm run check`
passes. It cannot check that `priceText` really was on the page; that is what
the hand check in step 7 is for.

**7 — Benchmark briefs** (fixed, do not tune after seeing results):

1. "Primitivo under €15 to go with steak."
2. "Dry white under €10 for grilled fish."
3. "A red around €25 as a gift for someone who likes Italian wine."

Record per brief: searches, page reads, wall time, context tokens added (from
the statusline before and after), shortlist size, price-correct count,
brief-match count, and any failure.

Run on 2026-10-10 in one session, skill unchanged: 2, 0 and 2 wines
shortlisted with 5, 5 and 9 requests in 34, 27 and 42 s. Brief 2 fails
validation (empty shortlist). Hand-checked the same day: all four shortlisted
prices correct, all four wines match their brief, and the six rejected prices
are correct too. Results are in `findings.md`. Context tokens were not
recorded, because the agent cannot see the statusline.

**8 — Findings.** Keep claims inside the evidence: three briefs on five shops
is a feasibility signal, not a quality benchmark. Include what the prototype
does not show (buyer demand, willingness to pay, behaviour at scale).
`findings.md` has the numbers, the friction and the next test. Four
thresholds are Go (4 of 4 on both correctness rows) and setup, about 30
minutes, sits on the Go / Iterate line. The decision, confirmed on
2026-10-10, is Iterate, because the runs produce too few wines and no
threshold measures that.

**9 — README.** README now covers running the picker, limits and cost in
requests. The price per request has not been read
from the dashboard, so the README gives cost in requests only. Committed and
pushed on 2026-10-10 at the user's request.

**11 — Discovery rerun** (added 2026-10-10 after the decision to iterate).
Only candidate discovery changes: the skill may read up to 3 listing pages of
the five shops within the 8 page reads and follow product links from them, and
may make one extra search when a search returns an empty result. Prices still
come only from product pages; the validator rejects a shortlisted listing
page. The price band rule is deliberately unchanged. Rerun on 2026-10-10: 4,
5 and 2 wines shortlisted (first round 2, 0 and 2) with 8, 11 and 7 requests
in 47, 87 and 75 s; all three validate. Listing pages supplied three of the five wines for
brief 2 and nothing elsewhere: Vynoteka listings come back without products
and one IKI listing errored. The retry recovered the one empty search. The
comparison is not clean: queries differed between rounds, both ran in one
session, and `/pick-wine` served the skill text cached at session start, so
the edited `SKILL.md` on disk was followed instead. Hand-checked the same
day: all 11 shortlisted wines correct on price and fit. Committed and pushed
on 2026-10-10 at the user's request.

## Request budget

Cap for the whole prototype: **80 requests**. Stop and reassess at 60. The
credit is shared with the other prototypes; the Wikipedia daily job uses three
requests each morning while it stays enabled.

| Date       | Step | Searches | Page reads | Running total | Note                     |
| ---------- | ---- | -------- | ---------- | ------------- | ------------------------ |
| 2026-10-10 | 3    | 1        | 1          | 2             | Smoke test; both cached. |
| 2026-10-10 | 5    | 3        | 5          | 10            | First `/pick-wine` run.  |
| 2026-10-10 | 7    | 3        | 2          | 15            | Brief 1; 1 empty search. |
| 2026-10-10 | 7    | 3        | 2          | 20            | Brief 2; 1 empty search. |
| 2026-10-10 | 7    | 3        | 6          | 29            | Brief 3.                 |
| 2026-10-10 | 11   | 2        | 6          | 37            | Rerun, brief 1.          |
| 2026-10-10 | 11   | 3        | 8          | 48            | Rerun, brief 2.          |
| 2026-10-10 | 11   | 4        | 3          | 55            | Rerun, brief 3; 1 empty. |

Empty search results are counted here; whether Oxylabs bills them is not
known. Available credit: $0.98 of the $1 classic trial (2026-10-10, before the
picker runs). Rates are the dashboard's Pricing tab; not yet read. At roughly $1 per 1,000 results, 80
requests is about $0.08.

## Friction log (feeds the findings)

- **2026-10-10 — New product not reachable from an existing trial account.**
  The docs say "+ Add product instance → Web API". This account's dashboard has
  no such button; "Scraping Solutions" lists only Headless Browser, and My
  Products only Web Scraper API. About 15 minutes spent before falling back.
  Support explained the cause the same day: Web API lives only in the new
  dashboard, and existing accounts are being migrated to it. It is a staged
  rollout, not a defect. The reply was fast and specific, and it repeated the
  endpoints, the MCP install command and the per-product key rule.
- **2026-10-10 — The documented MCP install command crashes.**
  `uvx oxylabs-mcp` (0.9.3) exits at import with `No module named
'mcp.server.fastmcp'`: it declares only `fastmcp>=3.2.4`, uv resolves the
  `mcp` SDK to 2.x, and the server imports a module 2.x renamed. Fixed locally
  with `uvx --with "mcp<2" oxylabs-mcp`. About 5 minutes, but a first-time
  user following the docs gets a Python traceback instead of tools.
- **2026-10-10 — Two Markdown paths give different pages.** API
  `markdown: true` returned 18,040 characters for the Vynoteka page; the MCP
  server's `md` output for the same page is 2,851. Both keep the price.
- **2026-10-10 — Prices lose their shape in Markdown.** Cents split onto their
  own line on three shops and the decimal separator vanishes on one (`1560 €`).
  Observed offline on cached pages; whether the agent copes is what step 7
  measures.
- **2026-10-10 — Empty search results carry no status.** 3 of 12
  `google_search_scraper` calls returned `[]`: two with a `site:` filter, one
  without. The MCP tool gives no error or status code, so the agent cannot tell
  a failed request from a query without results, and each one used a third of
  a run's search budget.
- **2026-10-10 — The parsed search `price` field can be badly wrong.** It was
  99 for two IKI wines priced 11.99 and 19.99, where the snippet reads
  "11. 99 Eur".
- **2026-10-10 — Generic queries return category pages.** A shopper's phrase
  ("sausas baltas vynas prie žuvies") gave listings; product-name phrases gave
  product pages. With category pages skipped, the benchmark shortlisted 4
  wines in 3 briefs.
- **2026-10-10 — Listing pages read differently per shop.** The same
  `universal_scraper` call with `md` output returned a full product list for a
  Vynokambarys listing, navigation only for a Vynoteka one (also with `links`
  output), and "Error: Document is empty" for one IKI listing while another
  IKI listing read normally. The response does not say which case occurred.
- **2026-10-10 — An empty search succeeds on retry.** The one retried query
  returned ten results the second time. Over the day 4 of 21 searches came
  back as `[]`.
- **2026-10-10 — Tools without credentials are still listed.** Six AI Studio
  tools appear with no AI Studio key set, so the agent sees tools it cannot
  use; the skill names the two it may call.
- **2026-10-10 — Different variable names per route.** The MCP server reads
  `OXYLABS_USERNAME` / `OXYLABS_PASSWORD`; the official `web-scraper-api`
  skill expects `OXY_WSA_USERNAME` / `OXY_WSA_PASSWORD` for the same account.
- **2026-10-10 — Credentials are per product.** Docs state the classic username
  and password are rejected by Web API (401), and each MCP server needs its own
  credentials. Not yet tested with a real request.

## Open questions

- Answered: live MCP page reads match the offline replay. All 15 page reads
  carried the price in the shape the replay predicted, without rendering.
- Answered for now: a single `site:` filter is not reliable either. Three
  attempts gave two empty results and one that ignored the keyword.
- How should the agent find candidates when searches return listings? Reading
  listing pages is the next test (see `findings.md`).
- Are empty search results billed? (They do succeed on retry: one of one.)
- Do Vynoteka listings read with `render`? Are Rimi and Vynomeka listings
  readable as Markdown?

## References

- Web API for agents: https://developers.oxylabs.io/products/web-api/for-agents
- Authentication: https://developers.oxylabs.io/products/web-api/authentication
- MCP servers: https://developers.oxylabs.io/ai-workflows/mcp
- Agent Skills: https://developers.oxylabs.io/ai-workflows/agent-skills
- Quick start: https://developers.oxylabs.io/get-started/quick-start-web-api
- Cellar, the earlier prototype with shop list, parser and verified prices:
  repository `wine-price-monitor` (not public)

Web API facts from the docs on 2026-10-10, kept for a later rerun and not
confirmed by a real request: base URL `https://webapi.oxylabs.io`,
`Authorization: Bearer <key>`, `POST /v1/search` (`query`, `max_results` 1–20,
`location`), `POST /v1/scrape` (`url`, `output`, `json.prompt`, `location`,
`device`, `run_js`); MCP server `oxylabs-web-api-mcp` with tools `search`,
`scrape`, `extract`; a one-time $5 welcome credit for first-time users.
