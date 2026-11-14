// Deterministic checks on a picker run file. The model is not trusted to judge
// its own output: every rule here is plain code over the fixed run schema.
import { shopFor } from "./shops.js";

// A search that comes back empty carries no status, so one retry per run is
// allowed on top of the search cap. Listing pages count as page reads.
export const CAPS = { searches: 3, emptySearchRetries: 1, pageReads: 8 };
const PAGE_KINDS = ["product", "listing"];
export const SHORTLIST = { min: 3, max: 5 };
// A 0.75 l bottle outside this range is far more likely a misread price (a
// lost decimal separator, a basket total) than a real offer.
export const PRICE_SANITY_EUR = { min: 2, max: 500 };
const DEFAULT_VOLUME_ML = 750;

const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const isText = (value) => typeof value === "string" && value.trim() !== "";
const isTime = (value) => isText(value) && !Number.isNaN(Date.parse(value));
const isPrice = (value) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;
const optionalNumber = (value) =>
  value === null || value === undefined || typeof value === "number";

// Strips tracking noise so the same page compares equal across the run file.
function pageKey(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname.replace(/\/$/, "")}`;
  } catch {
    return null;
  }
}

export function validateRun(run) {
  const errors = [];
  const warnings = [];
  if (!isObject(run))
    return { errors: ["Run must be a JSON object."], warnings };

  if (run.schemaVersion !== 1) errors.push("schemaVersion must be 1.");
  if (!isText(run.brief)) errors.push("brief must be a non-empty string.");
  if (!isTime(run.startedAt) || !isTime(run.finishedAt))
    errors.push("startedAt and finishedAt must be ISO timestamps.");
  else if (Date.parse(run.finishedAt) < Date.parse(run.startedAt))
    errors.push("finishedAt is before startedAt.");

  const criteria = isObject(run.criteria) ? run.criteria : null;
  if (!criteria) errors.push("criteria must be an object.");
  else if (
    !optionalNumber(criteria.minPriceEur) ||
    !optionalNumber(criteria.maxPriceEur) ||
    !optionalNumber(criteria.volumeMl)
  )
    errors.push(
      "criteria.minPriceEur, maxPriceEur and volumeMl must be numbers or null.",
    );
  const minPrice = criteria?.minPriceEur ?? null;
  const maxPrice = criteria?.maxPriceEur ?? null;
  const volume = criteria?.volumeMl ?? DEFAULT_VOLUME_ML;

  const searches = run.requests?.searches;
  const pageReads = run.requests?.pageReads;
  if (!Array.isArray(searches) || !Array.isArray(pageReads)) {
    errors.push("requests.searches and requests.pageReads must be arrays.");
  } else {
    const searchCap =
      CAPS.searches +
      (searches.some((search) => search?.empty === true)
        ? CAPS.emptySearchRetries
        : 0);
    if (searches.length > searchCap)
      errors.push(
        `${searches.length} searches exceed the cap of ${searchCap}.`,
      );
    if (pageReads.length > CAPS.pageReads)
      errors.push(
        `${pageReads.length} page reads exceed the cap of ${CAPS.pageReads}.`,
      );
    if (searches.some((search) => !isText(search?.query)))
      errors.push("Every search needs a query.");
    for (const read of pageReads)
      if (!isText(read?.url) || typeof read.ok !== "boolean")
        errors.push("Every page read needs a url and a boolean ok.");
      else {
        if (read.kind !== undefined && !PAGE_KINDS.includes(read.kind))
          errors.push(`Page read kind must be "product" or "listing".`);
        if (!shopFor(read.url))
          warnings.push(`Page read outside the shop allowlist: ${read.url}`);
      }
  }
  const listingPages = new Set(
    (Array.isArray(pageReads) ? pageReads : [])
      .filter((read) => read?.kind === "listing")
      .map((read) => pageKey(read.url)),
  );
  const readPages = new Set(
    (Array.isArray(pageReads) ? pageReads : [])
      .filter((read) => read?.ok === true)
      .map((read) => pageKey(read.url)),
  );

  if (!Array.isArray(run.shortlist)) {
    errors.push("shortlist must be an array.");
    return { errors, warnings };
  }
  if (run.shortlist.length === 0) errors.push("shortlist is empty.");
  if (run.shortlist.length > SHORTLIST.max)
    errors.push(
      `shortlist has ${run.shortlist.length} wines; the maximum is ${SHORTLIST.max}.`,
    );
  else if (run.shortlist.length > 0 && run.shortlist.length < SHORTLIST.min)
    warnings.push(
      `shortlist has ${run.shortlist.length} wines; the target is ${SHORTLIST.min}–${SHORTLIST.max}.`,
    );

  const seen = new Set();
  run.shortlist.forEach((wine, index) => {
    const at = `shortlist[${index}]`;
    if (!isObject(wine)) {
      errors.push(`${at} must be an object.`);
      return;
    }
    if (wine.rank !== index + 1)
      errors.push(`${at}.rank must be ${index + 1}.`);
    for (const field of ["name", "url", "priceText", "reason"])
      if (!isText(wine[field]))
        errors.push(`${at}.${field} must be a non-empty string.`);
    if (![true, false, null].includes(wine.inStock))
      errors.push(`${at}.inStock must be true, false or null (unknown).`);
    else if (wine.inStock === false)
      errors.push(`${at} is out of stock and cannot be shortlisted.`);
    else if (wine.inStock === null)
      warnings.push(`${at}: stock was not confirmed on the page.`);

    if (isText(wine.url)) {
      const shop = shopFor(wine.url);
      const key = pageKey(wine.url);
      if (!shop)
        errors.push(`${at}.url is not an HTTPS page of a listed shop.`);
      else {
        if (wine.shop !== shop.id)
          errors.push(`${at}.shop must be "${shop.id}" for this URL.`);
        if (new URL(wine.url).pathname.replace(/\/$/, "") === "")
          errors.push(`${at}.url is a shop home page, not a product page.`);
      }
      // Prices must come from a page the agent opened, never a search snippet.
      if (key && !readPages.has(key))
        errors.push(`${at}.url was not among the successful page reads.`);
      // A listing shows many wines; its prices only choose which pages to open.
      if (key && listingPages.has(key))
        errors.push(`${at}.url is a listing page, not a product page.`);
      if (key && seen.has(key)) errors.push(`${at}.url is a duplicate.`);
      seen.add(key);
    }

    if (!isPrice(wine.priceEur)) {
      errors.push(`${at}.priceEur must be a number with at most two decimals.`);
    } else {
      const price = wine.priceEur;
      if (price < PRICE_SANITY_EUR.min || price > PRICE_SANITY_EUR.max)
        errors.push(
          `${at}.priceEur ${price} is outside the plausible range ` +
            `${PRICE_SANITY_EUR.min}–${PRICE_SANITY_EUR.max}.`,
        );
      if (maxPrice !== null && price > maxPrice)
        errors.push(`${at}.priceEur ${price} is over the brief's ${maxPrice}.`);
      if (minPrice !== null && price < minPrice)
        errors.push(
          `${at}.priceEur ${price} is under the brief's ${minPrice}.`,
        );
      // The quoted page text must carry the same digits as the reported price.
      if (isText(wine.priceText)) {
        const digits = wine.priceText.replace(/\D/g, "");
        const cents = String(Math.round(price * 100));
        if (digits !== cents && digits !== String(price))
          errors.push(
            `${at}.priceText "${wine.priceText}" does not match priceEur ${price}.`,
          );
      }
    }

    if (wine.volumeMl !== volume)
      errors.push(`${at}.volumeMl must be ${volume} for this brief.`);
  });

  return { errors, warnings };
}

export function summarize(run) {
  const seconds = Math.round(
    (Date.parse(run.finishedAt) - Date.parse(run.startedAt)) / 1000,
  );
  return {
    searches: run.requests?.searches?.length ?? 0,
    pageReads: run.requests?.pageReads?.length ?? 0,
    wallSeconds: Number.isNaN(seconds) ? null : seconds,
    shortlisted: Array.isArray(run.shortlist) ? run.shortlist.length : 0,
  };
}
