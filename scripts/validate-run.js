// Validates one or more picker run files: node scripts/validate-run.js runs/<file>.json
// Exits 1 if any file has errors. Makes no network requests.
import { readFile } from "node:fs/promises";
import { validateRun, summarize } from "../lib/validate.js";

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Usage: node scripts/validate-run.js <run.json> [...]");
  process.exit(2);
}

let failed = false;
for (const file of files) {
  let run;
  try {
    run = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    console.log(`✗ ${file}\n  error: cannot read as JSON (${error.message})`);
    failed = true;
    continue;
  }
  const { errors, warnings } = validateRun(run);
  const { searches, pageReads, wallSeconds, shortlisted } = summarize(run);
  console.log(
    `${errors.length ? "✗" : "✓"} ${file}\n` +
      `  ${shortlisted} shortlisted · ${searches} searches · ` +
      `${pageReads} page reads · ${wallSeconds ?? "?"} s`,
  );
  for (const error of errors) console.log(`  error: ${error}`);
  for (const warning of warnings) console.log(`  warning: ${warning}`);
  if (errors.length) failed = true;
}
process.exit(failed ? 1 : 0);
