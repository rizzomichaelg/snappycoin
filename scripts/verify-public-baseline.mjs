import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const frontendRoot = new URL("../", import.meta.url);
const manifest = JSON.parse(
  await readFile(new URL("config/public-baseline.json", frontendRoot), "utf8"),
);
const mismatches = [];

for (const [relativePath, expectedHash] of Object.entries(manifest.files)) {
  const contents = await readFile(new URL(relativePath, frontendRoot));
  const actualHash = createHash("sha256").update(contents).digest("hex");
  if (actualHash !== expectedHash) {
    mismatches.push(`${relativePath}: expected ${expectedHash}, received ${actualHash}`);
  }
}

if (mismatches.length) {
  throw new Error(
    `Existing public frontend drifted from ${manifest.source}:\n${mismatches.join("\n")}`,
  );
}

console.log(
  `Public frontend baseline verified (${Object.keys(manifest.files).length} files match ${manifest.source}).`,
);
