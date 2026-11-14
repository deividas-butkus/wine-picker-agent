import { test } from "node:test";
import assert from "node:assert/strict";
import { validateRun, summarize } from "../lib/validate.js";
import { shopFor } from "../lib/shops.js";

const URLS = [
  "https://vynoteka.lt/papale-primitivo-di-manduria-075-l",
  "https://www.vynokambarys.lt/varvaglione-papale-primitivo-di-manduria-dop",
  "https://www.rimi.lt/e-parduotuve/lt/produktai/vynas/papale/p/7158615",
];

function validRun() {
  return {
    schemaVersion: 1,
    brief: "Primitivo under €15 to go with steak.",
    startedAt: "2026-10-10T15:00:00Z",
    finishedAt: "2026-10-10T15:01:30Z",
    criteria: { minPriceEur: null, maxPriceEur: 15, volumeMl: 750 },
    requests: {
      searches: [{ query: "primitivo vynas" }],
      pageReads: URLS.map((url) => ({ url, ok: true })),
    },
    shortlist: [
      {
        rank: 1,
        name: "Papale Primitivo di Manduria",
        producer: "Varvaglione",
        shop: "rimi",
        url: URLS[2],
        priceEur: 13.99,
        priceText: "13 99 €/vnt.",
        volumeMl: 750,
        inStock: true,
        reason: "Full-bodied Primitivo, the cheapest of the three.",
      },
      {
        rank: 2,
        name: "Papale Primitivo di Manduria",
        producer: "Varvaglione",
        shop: "vynokambarys",
        url: URLS[1],
        priceEur: 14.5,
        priceText: "14.50 €",
        volumeMl: 750,
        inStock: true,
        reason: "Same wine from a specialist shop.",
      },
      {
        rank: 3,
        name: "Papale Primitivo di Manduria 0,75 L",
        producer: "Varvaglione",
        shop: "vynoteka",
        url: URLS[0],
        priceEur: 15,
        priceText: "15 00 €",
        volumeMl: 750,
        inStock: true,
        reason: "At the top of the budget.",
      },
    ],
  };
}

function errorsAfter(change) {
  const run = validRun();
  change(run);
  return validateRun(run).errors;
}
const hasError = (errors, pattern) =>
  assert.ok(
    errors.some((error) => pattern.test(error)),
    `expected an error matching ${pattern}, got ${JSON.stringify(errors)}`,
  );

test("a well-formed run passes with no errors or warnings", () => {
  assert.deepEqual(validateRun(validRun()), { errors: [], warnings: [] });
});

test("summarize reports request counts and wall time", () => {
  assert.deepEqual(summarize(validRun()), {
    searches: 1,
    pageReads: 3,
    wallSeconds: 90,
    shortlisted: 3,
  });
});

test("schema: rejects non-objects and missing fields", () => {
  assert.equal(validateRun(null).errors.length, 1);
  hasError(
    errorsAfter((run) => (run.schemaVersion = 2)),
    /schemaVersion/,
  );
  hasError(
    errorsAfter((run) => delete run.brief),
    /brief/,
  );
  hasError(
    errorsAfter((run) => (run.finishedAt = "soon")),
    /ISO timestamps/,
  );
  hasError(
    errorsAfter((run) => (run.finishedAt = "2026-10-10T14:00:00Z")),
    /before startedAt/,
  );
  hasError(
    errorsAfter((run) => delete run.shortlist),
    /shortlist must be an array/,
  );
  hasError(
    errorsAfter((run) => (run.shortlist[0].reason = " ")),
    /reason/,
  );
  hasError(
    errorsAfter((run) => (run.shortlist[1].rank = 5)),
    /rank must be 2/,
  );
});

test("request caps: rejects more than 3 searches or 8 page reads", () => {
  hasError(
    errorsAfter((run) => {
      run.requests.searches = Array(4).fill({ query: "vynas" });
    }),
    /4 searches exceed the cap of 3/,
  );
  hasError(
    errorsAfter((run) => {
      for (let n = 0; n < 6; n++)
        run.requests.pageReads.push({
          url: `https://vynoteka.lt/wine-${n}`,
          ok: true,
        });
    }),
    /9 page reads exceed the cap of 8/,
  );
});

test("empty searches: one retry is allowed on top of the cap", () => {
  const four = (emptyCount) =>
    Array.from({ length: 4 }, (_, index) =>
      index < emptyCount ? { query: "vynas", empty: true } : { query: "vynas" },
    );
  assert.deepEqual(
    errorsAfter((run) => (run.requests.searches = four(1))),
    [],
  );
  assert.deepEqual(
    errorsAfter((run) => (run.requests.searches = four(2))),
    [],
  );
  hasError(
    errorsAfter((run) => {
      run.requests.searches = [...four(2), { query: "vynas" }];
    }),
    /5 searches exceed the cap of 4/,
  );
});

test("listing pages: count as page reads and cannot be shortlisted", () => {
  const listing = { url: "https://vynoteka.lt/primitivo-vynas", ok: true };
  assert.deepEqual(
    errorsAfter((run) =>
      run.requests.pageReads.push({ ...listing, kind: "listing" }),
    ),
    [],
  );
  hasError(
    errorsAfter((run) => (run.requests.pageReads[2].kind = "listing")),
    /is a listing page, not a product page/,
  );
  hasError(
    errorsAfter((run) => (run.requests.pageReads[0].kind = "category")),
    /kind must be "product" or "listing"/,
  );
  hasError(
    errorsAfter((run) => {
      for (let n = 0; n < 6; n++)
        run.requests.pageReads.push({
          url: `https://vynoteka.lt/listing-${n}`,
          ok: true,
          kind: "listing",
        });
    }),
    /9 page reads exceed the cap of 8/,
  );
});

test("shortlist size: rejects empty or oversized, warns when short", () => {
  hasError(
    errorsAfter((run) => (run.shortlist = [])),
    /empty/,
  );
  hasError(
    errorsAfter((run) => {
      run.shortlist = Array.from({ length: 6 }, (_, index) => ({
        ...run.shortlist[0],
        rank: index + 1,
      }));
    }),
    /maximum is 5/,
  );
  const run = validRun();
  run.shortlist.length = 2;
  const { errors, warnings } = validateRun(run);
  assert.deepEqual(errors, []);
  assert.match(warnings[0], /target is 3–5/);
});

test("shop allowlist: rejects other shops, plain HTTP and lookalike hosts", () => {
  assert.equal(shopFor("https://www.vynoteka.lt/x")?.id, "vynoteka");
  for (const url of [
    "https://barbora.lt/produktai/primitivo",
    "http://vynoteka.lt/papale-primitivo-di-manduria-075-l",
    "https://vynoteka.lt.example.com/papale",
    "https://shop.rimi.lt/papale",
    "not a url",
  ]) {
    assert.equal(shopFor(url), null, url);
    hasError(
      errorsAfter((run) => {
        run.shortlist[0].url = url;
        run.requests.pageReads.push({ url, ok: true });
      }),
      /not an HTTPS page of a listed shop/,
    );
  }
  hasError(
    errorsAfter((run) => (run.shortlist[0].shop = "vynoteka")),
    /shop must be "rimi"/,
  );
});

test("product URL: rejects home pages, unread pages and duplicates", () => {
  hasError(
    errorsAfter((run) => {
      run.shortlist[0].url = "https://www.rimi.lt/";
      run.requests.pageReads.push({ url: "https://www.rimi.lt/", ok: true });
    }),
    /home page/,
  );
  hasError(
    errorsAfter((run) => (run.requests.pageReads[2].ok = false)),
    /not among the successful page reads/,
  );
  hasError(
    errorsAfter((run) => run.requests.pageReads.pop()),
    /not among the successful page reads/,
  );
  hasError(
    errorsAfter((run) => {
      run.shortlist[1].url = `${URLS[2]}/`;
      run.shortlist[1].shop = "rimi";
    }),
    /duplicate/,
  );
});

test("price: rejects over budget, under a floor and implausible values", () => {
  hasError(
    errorsAfter((run) => {
      run.shortlist[0].priceEur = 15.99;
      run.shortlist[0].priceText = "15 99 €";
    }),
    /over the brief's 15/,
  );
  hasError(
    errorsAfter((run) => (run.criteria.minPriceEur = 14)),
    /under the brief's 14/,
  );
  // Vynomeka's Markdown drops the decimal separator: "1560 €" means 15.60.
  hasError(
    errorsAfter((run) => {
      run.criteria.maxPriceEur = null;
      run.shortlist[0].priceEur = 1560;
      run.shortlist[0].priceText = "1560 €";
    }),
    /outside the plausible range/,
  );
  hasError(
    errorsAfter((run) => (run.shortlist[0].priceEur = "13.99")),
    /priceEur must be a number/,
  );
  hasError(
    errorsAfter((run) => (run.shortlist[0].priceEur = 13.999)),
    /at most two decimals/,
  );
});

test("price evidence: quoted page text must carry the reported digits", () => {
  hasError(
    errorsAfter((run) => (run.shortlist[0].priceText = "12 99 €/vnt.")),
    /does not match priceEur 13.99/,
  );
  for (const [priceEur, priceText] of [
    [15.6, "1560 €"],
    [14.99, "14 99 Eur"],
    [15.55, "Kaina 15.55 €"],
    [12, "12 €"],
  ])
    assert.deepEqual(
      errorsAfter((run) => {
        run.criteria.maxPriceEur = 20;
        Object.assign(run.shortlist[0], { priceEur, priceText });
      }),
      [],
      priceText,
    );
});

test("bottle volume: rejects anything but the brief's size (750 ml default)", () => {
  hasError(
    errorsAfter((run) => (run.shortlist[0].volumeMl = 1500)),
    /volumeMl must be 750/,
  );
  hasError(
    errorsAfter((run) => delete run.shortlist[0].volumeMl),
    /volumeMl must be 750/,
  );
  assert.deepEqual(
    errorsAfter((run) => {
      run.criteria.volumeMl = 1500;
      for (const wine of run.shortlist) wine.volumeMl = 1500;
    }),
    [],
  );
});

test("stock: rejects out-of-stock wines and warns when unknown", () => {
  hasError(
    errorsAfter((run) => (run.shortlist[0].inStock = false)),
    /out of stock/,
  );
  hasError(
    errorsAfter((run) => delete run.shortlist[0].inStock),
    /inStock must be/,
  );
  const run = validRun();
  run.shortlist[0].inStock = null;
  const { errors, warnings } = validateRun(run);
  assert.deepEqual(errors, []);
  assert.match(warnings[0], /stock was not confirmed/);
});
