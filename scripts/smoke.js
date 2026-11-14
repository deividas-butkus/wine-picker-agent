// Smoke test for the classic Oxylabs Web Scraper API: one parsed Google search
// and one shop product page as Markdown. Each live run costs two requests; raw
// responses are cached under data/cache/ and replayed with --offline.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "node:process";
import { shopFor } from "../lib/shops.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENDPOINT = "https://realtime.oxylabs.io/v1/queries";
// Same page Cellar cached as HTML on 2026-10-09 (537,580 characters).
const PRODUCT_URL = "https://vynoteka.lt/papale-primitivo-di-manduria-075-l";
const CELLAR_HTML_CHARS = 537_580;

const REQUESTS = [
  {
    label: "google_search",
    payload: {
      source: "google_search",
      query: "primitivo vynas kaina",
      domain: "lt",
      geo_location: "Lithuania",
      parse: true,
    },
  },
  {
    label: "universal markdown",
    payload: { source: "universal", url: PRODUCT_URL, markdown: true },
  },
];

function credentials() {
  const file = path.join(ROOT, ".env.local");
  if (
    (!process.env.OXYLABS_USERNAME || !process.env.OXYLABS_PASSWORD) &&
    existsSync(file)
  )
    loadEnvFile(file);
  const { OXYLABS_USERNAME: username, OXYLABS_PASSWORD: password } =
    process.env;
  if (!username || !password)
    throw new Error("Add Oxylabs credentials to .env.local first.");
  return { username, password };
}

function cachePath(payload) {
  const hash = createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
  return path.join(ROOT, "data/cache", `${hash}.json`);
}

async function query(payload, offline) {
  const file = cachePath(payload);
  if (offline) return JSON.parse(await readFile(file, "utf8"));
  const { username, password } = credentials();
  const started = performance.now();
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(180_000),
  });
  const body = await response.text();
  const latencyMs = Math.round(performance.now() - started);
  if (!response.ok)
    throw new Error(
      `Oxylabs returned HTTP ${response.status}: ${body.slice(0, 300)}`,
    );
  const record = {
    fetchedAt: new Date().toISOString(),
    latencyMs,
    payload,
    data: JSON.parse(body),
  };
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(record));
  return record;
}

function reportSearch(result) {
  const organic = result.content?.results?.organic ?? [];
  const fromShops = organic.filter((item) => shopFor(item.url));
  console.log(
    `  organic results: ${organic.length}, from the five shops: ${fromShops.length}`,
  );
  for (const item of organic)
    console.log(
      `  ${shopFor(item.url) ? "✓" : "·"} ${item.pos}. ${item.title}\n      ${item.url}`,
    );
}

function reportPage(result) {
  const content = String(result.content ?? "");
  const share = ((content.length / CELLAR_HTML_CHARS) * 100).toFixed(1);
  console.log(
    `  Markdown: ${content.length.toLocaleString("en")} characters, ` +
      `about ${Math.round(content.length / 4).toLocaleString("en")} tokens ` +
      `(${share}% of Cellar's ${CELLAR_HTML_CHARS.toLocaleString("en")} characters of HTML)`,
  );
  const lines = content.split("\n");
  const priceLines = lines
    .map((line, index) => ({ line: line.trim(), index }))
    .filter(({ line }) => /\d+[.,]\d{2}\s*€|€\s*\d+[.,]\d{2}/.test(line));
  console.log(`  lines with a euro price: ${priceLines.length}`);
  for (const { line, index } of priceLines.slice(0, 8))
    console.log(`    line ${index + 1}: ${line.slice(0, 120)}`);
  const title = lines.find((line) => /^#\s/.test(line));
  console.log(`  first heading: ${title ?? "(none)"}`);
}

const offline = process.argv.includes("--offline");
for (const { label, payload } of REQUESTS) {
  const record = await query(payload, offline);
  const result = record.data.results?.[0];
  console.log(
    `\n${label}: status ${result?.status_code}, ${record.latencyMs} ms, ` +
      `${JSON.stringify(record.data).length.toLocaleString("en")} characters of JSON` +
      (offline ? ` (cached ${record.fetchedAt})` : ""),
  );
  if (payload.source === "google_search") reportSearch(result);
  else reportPage(result);
}
