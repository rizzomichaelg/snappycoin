import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  PUD_PUBLIC_REQUEST_CONTRACTS,
  assertOrderStatus,
  assertPaymentSession,
  assertPublicConfig,
  assertRecurringResult,
  assertReorderBootstrap,
  assertTipResult,
  contractBody,
} from "../assets/js/pud-contract.js";

const openApiPath = process.env.PUD_OPENAPI || resolve(new URL("../../snappycoin-promo-backend/docs/pud-openapi.yaml", import.meta.url).pathname);
let openApi;
try {
  openApi = await readFile(openApiPath, "utf8");
} catch (error) {
  if (error?.code === "ENOENT") throw new Error(`OpenAPI contract not found at ${openApiPath}; set PUD_OPENAPI to its path.`);
  throw error;
}

const apiSource = await readFile(new URL("../assets/js/pud-api.js", import.meta.url), "utf8");
if (!apiSource.includes("contractBody(path, input)")) throw new Error("PUD API requests must pass through contractBody.");

const requestBodies = parseRequestBodies(openApi);
const pathOperations = parsePathOperations(openApi);
const rawSchemas = parseSchemas(openApi);
const resolvedSchemas = new Map();

for (const [path, browserContract] of Object.entries(PUD_PUBLIC_REQUEST_CONTRACTS)) {
  const operation = pathOperations.get(path);
  if (!operation || operation.method !== "post") throw new Error(`OpenAPI is missing POST ${path}.`);
  const schemaName = requestBodies.get(operation.requestBody);
  if (!schemaName) throw new Error(`OpenAPI request body ${operation.requestBody || "<missing>"} for ${path} has no schema.`);
  if (schemaName !== browserContract.schema) {
    throw new Error(`${path} uses ${schemaName} in OpenAPI but ${browserContract.schema} in the browser.`);
  }

  const openApiSchema = resolveSchema(schemaName, rawSchemas, resolvedSchemas, []);
  assertSameSet(`${schemaName} required fields`, browserContract.required, openApiSchema.required);
  assertSameSet(`${schemaName} allowed fields`, browserContract.allowed, openApiSchema.allowed);
  if (operation.idempotencyRequired && !browserContract.idempotent) {
    throw new Error(`${path} requires idempotency in OpenAPI but is not marked idempotent in the browser contract.`);
  }
  const dynamicRecurringAction = /^\/api\/pud\/recurring\/(pause|skip|resume)$/.test(path) && apiSource.includes("`/api/pud/recurring/${action}`");
  if (!dynamicRecurringAction && !apiSource.includes(`"${path}"`)) throw new Error(`pud-api.js does not expose ${path}.`);

  const sample = Object.fromEntries(browserContract.required.map((field) => [field, sampleValue(field)]));
  const built = contractBody(path, { ...sample, __unknown: "must be stripped" });
  if (Object.hasOwn(built, "__unknown")) throw new Error(`${schemaName} did not strip an unknown field.`);
  const missing = { ...sample };
  delete missing[browserContract.required[0]];
  try {
    contractBody(path, missing);
    throw new Error(`${schemaName} accepted a missing required field.`);
  } catch (error) {
    if (!String(error?.message).includes("is missing")) throw error;
  }
}

const responseContracts = {
  PublicRouteOption: {
    required: ["routeId", "routeDate", "windowCode", "windowStartAt", "windowEndAt", "remainingOrders", "remainingBags", "routeProof"],
    allowed: ["routeId", "routeDate", "windowCode", "windowStartAt", "windowEndAt", "remainingOrders", "remainingBags", "routeProof"],
  },
  PublicRecurringProposal: {
    required: ["proposalId", "status", "proposedForAt", "expiresAt"],
    allowed: ["proposalId", "status", "proposedForAt", "expiresAt", "routeId", "blockedReason"],
  },
  PublicRecurringSchedule: {
    required: ["scheduleId", "cadence", "status", "nextProposalAt", "version", "proposals"],
    allowed: ["scheduleId", "cadence", "status", "nextProposalAt", "version", "proposals"],
  },
  RecurringDefaults: {
    required: ["preferredBags", "detergent", "softenerPref", "preferredRouteRule"],
    allowed: ["preferredBags", "detergent", "softenerPref", "preferredRouteRule"],
  },
  SafeOrderStatus: {
    required: [
      "orderNumber", "version", "fulfillmentStatus", "paymentStatus", "totalCents", "refundedCents",
      "paymentAttentionRequired", "operationalAttentionRequired", "canCancel", "canTip", "canClaim",
      "canCreateRecurring", "recurringDefaults", "rescheduleOptions", "recurringSchedules", "updatedAt",
    ],
    allowed: [
      "orderNumber", "version", "fulfillmentStatus", "paymentStatus", "pickupWindowCode", "deliveryPromisedAt",
      "actualBags", "weightTenths", "totalCents", "refundedCents", "paymentAttentionRequired",
      "operationalAttentionRequired", "canCancel", "canTip", "canClaim", "canCreateRecurring",
      "recurringDefaults", "rescheduleOptions", "recurringSchedules", "updatedAt",
    ],
  },
  PaymentRecoveryData: {
    required: ["paymentStatus", "setupIntentId", "setupIntentClientSecret", "duplicate"],
    allowed: ["paymentStatus", "setupIntentId", "setupIntentClientSecret", "duplicate"],
  },
  TipData: {
    required: ["paymentIntentId", "status", "clientSecret"],
    allowed: ["paymentIntentId", "status", "clientSecret"],
  },
  ReorderBootstrapData: {
    required: [
      "priorOrderNumber", "customer", "address", "preferences", "savedPaymentMethodAvailable", "bookingBlocked",
      "nextStep", "requiresPhoneVerification", "requiresPaymentSetup",
    ],
    allowed: [
      "priorOrderNumber", "customer", "address", "preferences", "savedPaymentMethodAvailable", "bookingBlocked",
      "nextStep", "requiresPhoneVerification", "requiresPaymentSetup", "recurringProposalId",
    ],
  },
};

for (const [schemaName, expected] of Object.entries(responseContracts)) {
  const schema = resolveSchema(schemaName, rawSchemas, resolvedSchemas, []);
  assertSameSet(`${schemaName} required fields`, expected.required, schema.required);
  assertSameSet(`${schemaName} allowed fields`, expected.allowed, schema.allowed);
}

verifyResponseGuards();

const frontendOnlyEndpoints = Object.keys(PUD_PUBLIC_REQUEST_CONTRACTS);
console.log(`PUD contract verification passed (${frontendOnlyEndpoints.length} request and ${Object.keys(responseContracts).length} response schemas matched OpenAPI; runtime guards exercised).`);

function verifyResponseGuards() {
  const route = {
    routeId: "route_1",
    routeDate: "2026-07-15",
    windowCode: "AM",
    windowStartAt: "2026-07-15T14:00:00Z",
    windowEndAt: "2026-07-15T17:00:00Z",
    remainingOrders: 4,
    remainingBags: 8,
    routeProof: "route-proof",
  };
  const recurringDefaults = {
    preferredBags: 2,
    detergent: "free_clear",
    softenerPref: "none",
    preferredRouteRule: { weekday: "wednesday" },
  };
  const status = {
    orderNumber: "PUD-1001",
    version: 3,
    fulfillmentStatus: "delivered",
    paymentStatus: "succeeded",
    totalCents: 4200,
    refundedCents: 0,
    paymentAttentionRequired: false,
    operationalAttentionRequired: false,
    canCancel: false,
    canTip: true,
    canClaim: true,
    canCreateRecurring: true,
    recurringDefaults,
    rescheduleOptions: [route],
    recurringSchedules: [{
      scheduleId: "schedule_1",
      cadence: "weekly",
      status: "active",
      nextProposalAt: "2026-07-22T14:00:00Z",
      version: 2,
      proposals: [{
        proposalId: "proposal_1",
        status: "proposed",
        proposedForAt: "2026-07-22T14:00:00Z",
        expiresAt: "2026-07-20T14:00:00Z",
        routeId: "route_1",
      }],
    }],
    updatedAt: "2026-07-13T18:00:00Z",
  };
  const publicConfig = {
    publicEnabled: true,
    bookingEnabled: true,
    recurringEnabled: true,
    tipsEnabled: true,
    referralsEnabled: true,
    claimsEnabled: true,
    stripePublishableKey: "pk_test_from_server",
    turnstileSiteKey: "turnstile-from-server",
    timezone: "America/Chicago",
    pricing: { pricePerLbCents: 199, minimumCents: 2500, deliveryFeeCents: 0, version: "2026-07" },
    consentVersions: { privacy: "2026-07" },
  };
  const payment = {
    paymentStatus: "requires_action",
    setupIntentId: "seti_1",
    setupIntentClientSecret: "seti_1_secret_memory_only",
    duplicate: false,
  };
  const reorder = {
    priorOrderNumber: "PUD-1001",
    customer: { firstName: "Sam", lastName: "Customer", phoneLast4: "1212" },
    address: { line1: "1 Main St", city: "Chicago", state: "IL", postalCode: "60601" },
    preferences: {
      estimatedBags: 2,
      detergent: "free_clear",
      softenerPref: "none",
      unattendedPickup: false,
      unattendedDelivery: false,
    },
    savedPaymentMethodAvailable: true,
    bookingBlocked: false,
    nextStep: "address_check",
    requiresPhoneVerification: true,
    requiresPaymentSetup: true,
    recurringProposalId: "proposal_1",
  };
  const tip = { paymentIntentId: "pi_tip_1", status: "requires_action", clientSecret: "pi_tip_1_secret_memory_only" };
  const recurring = {
    scheduleId: "schedule_1",
    cadence: "weekly",
    status: "active",
    nextProposalAt: null,
    version: 2,
    action: "skip",
    proposal: { proposalId: "proposal_1", status: "skipped", proposedForAt: "2026-07-22T14:00:00Z" },
  };

  for (const [label, guard, value] of [
    ["public config", assertPublicConfig, publicConfig],
    ["safe order status", assertOrderStatus, status],
    ["payment recovery", assertPaymentSession, payment],
    ["reorder bootstrap", assertReorderBootstrap, reorder],
    ["tip", assertTipResult, tip],
    ["recurring", assertRecurringResult, recurring],
  ]) {
    if (guard(value) !== value) throw new Error(`${label} guard did not return its validated object.`);
  }

  expectGuardFailure("public config feature flags", () => assertPublicConfig({ ...publicConfig, referralsEnabled: undefined }));
  expectGuardFailure("route proofs", () => assertOrderStatus({ ...status, rescheduleOptions: [{ ...route, routeProof: "" }] }));
  expectGuardFailure("private status fields", () => assertOrderStatus({ ...status, phoneCiphertext: "must-not-leak" }));
  expectGuardFailure("recurring defaults", () => assertOrderStatus({ ...status, recurringDefaults: null }));
  expectGuardFailure("payment client secret", () => assertPaymentSession({ ...payment, setupIntentClientSecret: undefined }));
  expectGuardFailure("reorder proof chain", () => assertReorderBootstrap({ ...reorder, requiresPhoneVerification: false }));
  expectGuardFailure("tip client secret shape", () => assertTipResult({ ...tip, clientSecret: undefined }));
  expectGuardFailure("recurring next proposal", () => assertRecurringResult({ ...recurring, nextProposalAt: undefined }));
}

function expectGuardFailure(label, callback) {
  try {
    callback();
  } catch (_error) {
    return;
  }
  throw new Error(`Response guard accepted invalid ${label}.`);
}

function parseRequestBodies(source) {
  const result = new Map();
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^    ([A-Za-z0-9]+): .*#\/components\/schemas\/([A-Za-z0-9]+)"/);
    if (match) result.set(match[1], match[2]);
  }
  return result;
}

function parsePathOperations(source) {
  const lines = source.split(/\r?\n/);
  const result = new Map();
  let path = "";
  let method = "";
  let requestBody = "";
  let idempotencyRequired = false;

  const flush = () => {
    if (path && method) result.set(path, { method, requestBody, idempotencyRequired });
  };

  for (const line of lines) {
    const pathMatch = line.match(/^  (\/[^:]+):\s*$/);
    if (pathMatch) {
      flush();
      path = pathMatch[1];
      method = "";
      requestBody = "";
      idempotencyRequired = false;
      continue;
    }
    const methodMatch = line.match(/^    (get|post|patch|delete):\s*$/);
    if (path && methodMatch) method = methodMatch[1];
    if (path && method) {
      const bodyMatch = line.match(/requestBodies\/([A-Za-z0-9]+)/);
      if (bodyMatch) requestBody = bodyMatch[1];
      if (/^      x-idempotency:\s*required\b/.test(line)) idempotencyRequired = true;
    }
    if (/^components:\s*$/.test(line)) break;
  }
  flush();
  return result;
}

function parseSchemas(source) {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((line) => line === "  schemas:");
  if (start < 0) throw new Error("OpenAPI components.schemas was not found.");
  const result = new Map();
  let name = "";
  let block = [];
  const flush = () => {
    if (name) result.set(name, parseSchemaBlock(block));
  };

  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^  \S/.test(line)) break;
    const header = line.match(/^    ([A-Za-z0-9]+):(?:\s.*)?$/);
    if (header) {
      flush();
      name = header[1];
      block = [line];
    } else if (name) {
      block.push(line);
    }
  }
  flush();
  return result;
}

function parseSchemaBlock(lines) {
  const propertyMarkers = lines
    .map((line, index) => ({
      index,
      indent: indent(line),
      block: /^\s+properties:\s*$/.test(line),
      inline: /\bproperties:\s*\{/.test(line),
      line,
    }))
    .filter((entry) => entry.block || entry.inline);
  const allowed = [];
  if (propertyMarkers.length) {
    const topIndent = Math.min(...propertyMarkers.map((entry) => entry.indent));
    for (const marker of propertyMarkers.filter((entry) => entry.indent === topIndent)) {
      if (marker.inline) {
        allowed.push(...inlineObjectKeys(marker.line, "properties:"));
        continue;
      }
      for (let index = marker.index + 1; index < lines.length; index += 1) {
        const line = lines[index];
        if (!line.trim()) continue;
        const lineIndent = indent(line);
        if (lineIndent <= marker.indent) break;
        if (lineIndent !== marker.indent + 2) continue;
        const property = line.trim().match(/^([A-Za-z0-9_]+):/);
        if (property) allowed.push(property[1]);
      }
    }
  }

  const requiredEntries = lines
    .map((line) => ({ line, indent: indent(line) }))
    .filter((entry) => /\brequired:\s*\[/.test(entry.line));
  const required = [];
  if (requiredEntries.length) {
    const topIndent = Math.min(...requiredEntries.map((entry) => entry.indent));
    for (const entry of requiredEntries.filter((item) => item.indent === topIndent)) {
      const values = entry.line.match(/required:\s*\[([^\]]*)\]/)?.[1] || "";
      required.push(...values.split(",").map((value) => value.trim()).filter(Boolean));
    }
  }

  const inherits = [];
  for (const line of lines) {
    if (!/^\s*(?:allOf:.*)?-?\s*\{?\s*\$ref:/.test(line.trimStart()) && !/allOf:\s*\[\s*\{\s*\$ref:/.test(line)) continue;
    const match = line.match(/#\/components\/schemas\/([A-Za-z0-9]+)/);
    if (match) inherits.push(match[1]);
  }
  return { allowed: unique(allowed), required: unique(required), inherits: unique(inherits) };
}

function resolveSchema(name, schemas, cache, stack) {
  if (cache.has(name)) return cache.get(name);
  if (stack.includes(name)) throw new Error(`Circular OpenAPI schema inheritance: ${[...stack, name].join(" -> ")}.`);
  const schema = schemas.get(name);
  if (!schema) throw new Error(`OpenAPI schema ${name} was not parsed.`);
  const inherited = schema.inherits.map((parent) => resolveSchema(parent, schemas, cache, [...stack, name]));
  const resolved = {
    allowed: unique([...inherited.flatMap((item) => item.allowed), ...schema.allowed]),
    required: unique([...inherited.flatMap((item) => item.required), ...schema.required]),
  };
  cache.set(name, resolved);
  return resolved;
}

function sampleValue(field) {
  if (/^(expectedVersion|amountCents|preferredBags)$/.test(field)) return 1;
  if (/Consent$/.test(field)) return false;
  if (/^(address|preferences|consents|preferredRouteRule|consentVersions)$/.test(field)) return {};
  return `${field}-sample-value`;
}

function assertSameSet(label, actual, expected) {
  const left = [...actual].sort();
  const right = [...expected].sort();
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    throw new Error(`${label} mismatch. Browser=[${left.join(", ")}] OpenAPI=[${right.join(", ")}].`);
  }
}

function indent(line) { return line.length - line.trimStart().length; }
function unique(values) { return [...new Set(values)]; }

function inlineObjectKeys(line, marker) {
  const markerIndex = line.indexOf(marker);
  const start = line.indexOf("{", markerIndex + marker.length);
  if (markerIndex < 0 || start < 0) return [];
  const keys = [];
  let depth = 0;
  let quote = "";
  let escaped = false;
  let expectingKey = false;
  for (let index = start; index < line.length; index += 1) {
    const character = line[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === '"' || character === "'") { quote = character; continue; }
    if (character === "{") {
      depth += 1;
      if (depth === 1) expectingKey = true;
      continue;
    }
    if (character === "}") { depth -= 1; continue; }
    if (depth !== 1) continue;
    if (character === ",") { expectingKey = true; continue; }
    if (!expectingKey || !/[A-Za-z0-9_]/.test(character)) continue;
    const rest = line.slice(index);
    const match = rest.match(/^([A-Za-z0-9_]+)\s*:/);
    if (match) {
      keys.push(match[1]);
      index += match[0].length - 1;
      expectingKey = false;
    }
  }
  return keys;
}
