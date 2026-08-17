import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pageFiles = [
  "pickup-delivery/index.html",
  "pickup-delivery/status/index.html",
  "pickup-delivery/recover/index.html",
  "pickup-delivery/claims/index.html",
  "pickup-delivery/terms/index.html",
  "pickup-delivery/privacy/index.html"
];
const jsFiles = [
  "assets/js/pud-booking.js",
  "assets/js/pud-status.js",
  "assets/js/pud-recovery.js",
  "assets/js/pud-claims.js",
  "assets/js/site-i18n.js",
  "assets/js/site-analytics.js"
];

const outputArg = process.argv[2];
if (!outputArg) {
  throw new Error("Usage: node scripts/pud-hook-inventory.mjs <output.json>");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function matches(source, expression, group = 1) {
  return unique([...source.matchAll(expression)].map((match) => match[group]));
}

function formControlNames(source) {
  return unique(
    [...source.matchAll(/<(?:input|select|textarea|button)\b[^>]*>/gi)]
      .flatMap((match) => matches(match[0], /\sname=["']([^"']+)["']/gi))
  );
}

function datasetName(property) {
  return property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function classTokens(value) {
  return value
    .replace(/\$\{[^}]*\}/g, " ")
    .split(/[\s,]+/)
    .map((token) => token.replace(/^['"`]|['"`]$/g, ""))
    .filter((token) => /^[a-z][a-z0-9_-]*$/i.test(token));
}

const pages = {};
const sourceHashes = {};

for (const file of pageFiles) {
  const source = await readFile(resolve(root, file), "utf8");
  sourceHashes[file] = createHash("sha256").update(source).digest("hex");
  pages[file] = {
    route: `/${file.replace(/index\.html$/, "")}`,
    ids: matches(source, /\sid=["']([^"']+)["']/g),
    formNames: formControlNames(source),
    dataAttributes: matches(source, /\s(data-[a-z0-9-]+)(?:=|\s|>)/gi),
    scripts: matches(source, /<script\b[^>]*\bsrc=["']([^"']+)["']/gi),
    stylesheets: matches(source, /<link\b[^>]*\bhref=["']([^"']+\.css(?:\?[^"']*)?)["']/gi)
  };
}

const javascript = {};
for (const file of jsFiles) {
  const source = await readFile(resolve(root, file), "utf8");
  sourceHashes[file] = createHash("sha256").update(source).digest("hex");
  const selectorDataAttributes = matches(source, /\[\s*(data-[a-z0-9-]+)(?:[~|^$*]?=|\s*\])/gi);
  const datasetAttributes = matches(source, /\.dataset\.([A-Za-z][A-Za-z0-9]*)/g).map(datasetName);
  const selectorIds = matches(source, /#[A-Za-z][\w:-]*/g, 0).map((value) => value.slice(1));
  const assignedClassValues = [
    ...matches(source, /\.className\s*=\s*["'`]([^"'`]+)["'`]/g),
    ...matches(source, /\.classList\.(?:add|remove|toggle)\(([^)]*)\)/g)
  ];
  javascript[file] = {
    queriedIds: unique([
      ...selectorIds,
      ...matches(source, /getElementById\(\s*["']([A-Za-z][\w:-]*)["']\s*\)/g)
    ]),
    queriedDataAttributes: unique([...selectorDataAttributes, ...datasetAttributes]),
    dynamicClasses: unique(assignedClassValues.flatMap(classTokens))
  };
}

const inventory = {
  schemaVersion: 1,
  pages,
  javascript,
  sourceHashes
};

const output = resolve(process.cwd(), outputArg);
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(inventory, null, 2)}\n`);
console.log(`Wrote PUD hook inventory to ${output}`);
