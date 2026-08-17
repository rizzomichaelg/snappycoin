import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const baselinePath = resolve(process.cwd(), process.argv[2] || "artifacts/pud-redesign/baseline-hooks.json");
const finalPath = resolve(process.cwd(), process.argv[3] || "artifacts/pud-redesign/final-hooks.json");
const outputPath = resolve(process.cwd(), process.argv[4] || "artifacts/pud-redesign/hook-comparison.json");
const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
const final = JSON.parse(await readFile(finalPath, "utf8"));
const removals = [];
const additions = [];

for (const section of ["pages", "javascript"]) {
  for (const [file, before] of Object.entries(baseline[section] || {})) {
    const after = final[section]?.[file];
    if (!after) {
      removals.push({ section, file, field: "file", values: [file] });
      continue;
    }
    for (const [field, values] of Object.entries(before)) {
      if (!Array.isArray(values)) continue;
      const afterValues = Array.isArray(after[field]) ? after[field] : [];
      const missing = values.filter((value) => !afterValues.includes(value));
      const added = afterValues.filter((value) => !values.includes(value));
      if (missing.length) removals.push({ section, file, field, values: missing });
      if (added.length) additions.push({ section, file, field, values: added });
    }
  }
}

const report = {
  schemaVersion: 1,
  baseline: baselinePath,
  final: finalPath,
  preserved: removals.length === 0,
  removals,
  additions
};
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
if (removals.length) {
  console.error(`PUD hook comparison failed with ${removals.length} removal group(s).`);
  process.exitCode = 1;
} else {
  console.log(`PUD hook comparison passed; no baseline IDs, form names, data hooks, queried hooks, or dynamic classes were removed (${additions.length} addition groups).`);
}
