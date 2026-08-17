import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { squareMountSelector } from "../assets/js/pud-payment.js";

test("Square card fields attach through a selector string", () => {
  assert.equal(squareMountSelector("#pud-payment-element"), "#pud-payment-element");
  assert.equal(squareMountSelector({ id: "pud-payment-element" }), "#pud-payment-element");
  assert.throws(() => squareMountSelector({}), /must have an id/);
});

test("booking CSP permits Square PCI connections in sandbox and production", async () => {
  const html = await readFile(new URL("../pickup-delivery/index.html", import.meta.url), "utf8");
  const csp = html.match(/Content-Security-Policy[^>]+content="([^"]+)"/)?.[1] || "";
  assert.match(csp, /connect-src[^;]*https:\/\/pci-connect\.squareup\.com/);
  assert.match(csp, /connect-src[^;]*https:\/\/pci-connect\.squareupsandbox\.com/);
  assert.match(csp, /connect-src[^;]*https:\/\/o160250\.ingest\.sentry\.io/);
  assert.match(csp, /style-src[^;]*https:\/\/sandbox\.web\.squarecdn\.com/);
  assert.match(csp, /style-src[^;]*https:\/\/web\.squarecdn\.com/);
  assert.match(csp, /img-src[^;]*https:\/\/sandbox\.web\.squarecdn\.com/);
  assert.match(csp, /img-src[^;]*https:\/\/web\.squarecdn\.com/);
  assert.match(csp, /font-src[^;]*https:\/\/\*\.squarecdn\.com/);
});

test("Square initialization failures explain that no card was saved or charged", async () => {
  const source = await readFile(new URL("../assets/js/pud-payment.js", import.meta.url), "utf8");
  assert.match(source, /No card was saved or charged\./);
});

test("booking explains that Square handles sensitive card details", async () => {
  const html = await readFile(new URL("../pickup-delivery/index.html", import.meta.url), "utf8");
  assert.match(html, /Square securely stores your card\./);
  assert.match(html, /Snappy receives only the card brand, last four digits, and a secure Square reference—not your full card number or security code\./);
  assert.match(html, /I authorize Square to store this payment method for Snappy Coin Laundry/);
  assert.doesNotMatch(html, /authorize Snappy Coin Laundry to save this payment method/);
  assert.match(html, /href="https:\/\/squareup\.com\/help\/us\/en\/article\/3797-secure-data-encryption"/);
  assert.match(html, /target="_blank" rel="noopener">Learn about Square security\.<\/a>/);
});
