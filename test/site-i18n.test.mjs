import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  CATALOGS,
  CENTRAL_TIME_ZONE,
  DISPLAY_CURRENCY,
  SUPPORTED_LOCALES,
  configurePublicLocales,
  enabledPublicLocales,
  translateExternalText,
  translateText,
} from "../assets/js/site-i18n.js";

const root = new URL("../", import.meta.url);
const requiredPages = Object.freeze([
  "index.html",
  "privacy.html",
  "terms.html",
  "cookies.html",
  "promos/free-weekday-wash/index.html",
  "pickup-delivery/index.html",
  "pickup-delivery/status/index.html",
  "pickup-delivery/claims/index.html",
  "pickup-delivery/recover/index.html",
  "pickup-delivery/privacy/index.html",
  "pickup-delivery/terms/index.html",
]);

const runtimeModules = Object.freeze([
  "assets/js/availability-widget.js",
  "assets/js/pud-booking.js",
  "assets/js/pud-status.js",
  "assets/js/pud-claims.js",
  "assets/js/pud-recovery.js",
  "assets/js/pud-api.js",
  "assets/js/pud-payment.js",
  "assets/js/pud-phone.js",
  "assets/js/pud-reorder.js",
  "assets/js/pud-scheduling.js",
]);

// These strings are implementation identifiers or fail-closed contract errors;
// they are not rendered as customer copy. Keep this exact allowlist narrow so a
// new prose string in a runtime module fails the parity guard by default.
const nonUiRuntimeLiterals = new Set([
  "Content-Type",
  "Idempotency-Key",
  "PudApiError",
  "Unsupported recurring action.",
  "Invalid reorder bootstrap.",
  "Incomplete reorder bootstrap.",
  "Unsafe reorder bootstrap.",
  "Unrecognized status payload shape",
  "Invalid recurring proposal bootstrap.",
  "Invalid preferred route bootstrap.",
]);

const nonUiRuntimeTemplates = new Set([
  "The {value} body and Idempotency-Key header must match.",
]);

const runtimeTemplateSamples = new Map([
  ["Updated {value}", ["Updated hace menos de 1 minuto"]],
  ["Opening in {value}", ["Opening in 2 minutes", "Opening in 1 hour 2 minutes"]],
  ["Reviewing a recurring pickup from {value}. Recheck the address, route, phone, and card before confirming it.", ["Reviewing a recurring pickup from PUD-20260715-AB12CD34. Recheck the address, route, phone, and card before confirming it."]],
  ["Reordering {value}. Recheck the address, phone, and card to create a new order.", ["Reordering PUD-20260715-AB12CD34. Recheck the address, phone, and card to create a new order."]],
  ["{value}/lb · {value} minimum{value}", ["$1.99/lb · $35.00 minimum", "$1.99/lb · $35.00 minimum · $5.00 delivery"]],
  ["For security, re-enter and verify the mobile number ending in {value}.", ["For security, re-enter and verify the mobile number ending in 0101."]],
  ["That pickup window does not have room for {value} estimated bag{value}. Choose another window or a lower bag estimate.", ["That pickup window does not have room for 2 estimated bags. Choose another window or a lower bag estimate."]],
  ["{value} pickup window{value} can currently take {value} estimated bag{value}.", ["1 pickup window can currently take 1 estimated bag.", "2 pickup windows can currently take 3 estimated bags."]],
  ["No listed pickup window has room for {value} estimated bag{value}. Choose a lower estimate or call the store.", ["No listed pickup window has room for 3 estimated bags. Choose a lower estimate or call the store."]],
  ["{value} estimated bag{value}", ["2 estimated bags"]],
  ["A code was sent to the mobile number ending in {value}.", ["A code was sent to the mobile number ending in 0101."]],
  ["Phone verified. Protected actions are unlocked, but {value} could not load. Try verifying again if the problem continues.", ["Phone verified. Protected actions are unlocked, but order history and preferences and rewards could not load. Try verifying again if the problem continues."]],
  ["Phone verified. Protected actions, {value}order history, receipts, claims, and preferences are unlocked for this short browser session.", ["Phone verified. Protected actions, order history, receipts, claims, and preferences are unlocked for this short browser session.", "Phone verified. Protected actions, rewards, order history, receipts, claims, and preferences are unlocked for this short browser session."]],
  ["A new code was sent to the mobile number ending in {value}.", ["A new code was sent to the mobile number ending in 0101."]],
  ["Add a {value} tip?", ["Add a $5.00 tip?"]],
  ["This creates a separate tip payment for {value}. It will not change the laundry order charge.", ["This creates a separate tip payment for PUD-20260715-AB12CD34. It will not change the laundry order charge."]],
  ["Recurring pickups are now {value}.", ["Recurring pickups are now paused.", "Recurring pickups are now active."]],
  ["The private link for {value} was revoked.", ["The private link for PUD-20260715-AB12CD34 was revoked."]],
  ["{value} bag{value} in this order", ["2 bags in this order"]],
  ["Server status updated {value}.", ["Server status updated Jul 15, 2026, 9:00 AM."]],
  ["Order journey. Current stage: {value}.", ["Order journey. Current stage: Laundry picked up."]],
  ["{value}/lb", ["$1.99/lb"]],
  ["Pricing {value} · tax rule {value} · minimum {value}.", ["Pricing pricing-v1 · tax rule tax-v1 · minimum $35.00."]],
  ["Rewards account: {value}.", ["Rewards account: Active."]],
  ["{value} · {value} · balance {value}{value} · {value}{value}", ["Reward earned · +$5.00 · balance $10.00 · order PUD-20260715-AB12CD34 · Jul 15, 2026 · expires Aug 15, 2026"]],
  ["{value} · ordered {value}{value}", ["Pickup and delivery · ordered Jul 15, 2026 · delivered Jul 16, 2026"]],
  ["{value} requested", ["$5.00 requested"]],
  ["{value} · {value} · {value}{value} · opened {value}{value}", ["Missing item · Under review · $5.00 requested · $3.00 approved · opened Jul 15, 2026 · resolved Jul 16, 2026"]],
  ["Defaults from {value}.", ["Defaults from PUD-20260715-AB12CD34."]],
  ["{value} pickups", ["Weekly pickups"]],
  ["Next proposal: {value}", ["Next proposal: Jul 22, 2026"]],
  ["Proposed pickup · {value}", ["Proposed pickup · Jul 22, 2026"]],
  ["Respond by {value}.", ["Respond by Jul 20, 2026."]],
  ["Phone verified until {value}. Each protected action still receives its own one-time authorization.", ["Phone verified until Jul 15, 2026, 9:30 AM. Each protected action still receives its own one-time authorization."]],
  ["{value} evidence file{value} ready to submit with this report.", ["2 evidence files are ready to submit with this report."]],
  ["{value} removed.", ["photo.jpg removed."]],
  ["{value} evidence file{value} secured. If claim submission needs a network retry, the same in-memory references will be reused without uploading again.", ["2 evidence files secured. If claim submission needs a network retry, the same in-memory references will be reused without uploading again."]],
  ["Securing evidence file {value} of {value} before submitting the claim…", ["Securing evidence file 1 of 2 before submitting the claim…"]],
  ["The claim was not submitted because evidence file {value} could not be secured. Your entered claim details remain on this page. Return to the private status page and verify again before retrying; do not resubmit a claim just to compensate for this upload failure. {value}", ["The claim was not submitted because evidence file 1 could not be secured. Your entered claim details remain on this page. Return to the private status page and verify again before retrying; do not resubmit a claim just to compensate for this upload failure. Network error"]],
  ["Evidence file {value}", ["Evidence file 1"]],
  ["Remove {value}", ["Remove photo.jpg"]],
  ["{value} supporting file{value} attached.", ["2 supporting files were attached."]],
  ["Reference {value} is {value}.{value} We’ll contact you after a staff member reviews it.", ["Reference claim-1 is under review. 2 supporting files were attached. We’ll contact you after a staff member reviews it."]],
  ["Reference number: {value}", ["Reference number: claim-1"]],
]);

test("English and reviewed US Spanish catalogs have exact key parity", () => {
  assert.deepEqual(SUPPORTED_LOCALES, ["en-US", "es-US"]);
  assert.deepEqual(Object.keys(CATALOGS["es-US"]).sort(), Object.keys(CATALOGS["en-US"]).sort());
  assert.ok(Object.keys(CATALOGS["es-US"]).length >= 300, "customer catalog unexpectedly small");
  for (const [key, value] of Object.entries(CATALOGS["es-US"])) {
    assert.equal(typeof value, "string", `non-string Spanish value for ${key}`);
    assert.ok(value.trim(), `blank Spanish value for ${key}`);
  }
  assert.equal(CENTRAL_TIME_ZONE, "America/Chicago");
  assert.equal(DISPLAY_CURRENCY, "USD");
});

test("public locale activation is exactly off until the rollout config enables Spanish", async () => {
  assert.deepEqual(configurePublicLocales(["en-US"]), ["en-US"]);
  assert.deepEqual(enabledPublicLocales(), ["en-US"]);
  assert.deepEqual(configurePublicLocales(["en-US", "es-US"]), ["en-US", "es-US"]);
  assert.deepEqual(enabledPublicLocales(), ["en-US", "es-US"]);
  const configSource = await readFile(new URL("assets/js/pud-config.js", root), "utf8");
  assert.match(configSource, /supportedLocales:\s*Object\.freeze\(\["en-US"\]\)/);
  configurePublicLocales(["en-US"]);
});

test("runtime outage and cookie-consent copy has reviewed Spanish text", () => {
  const expected = new Map([
    ["The service could not be reached. Check the connection and try again.", "No se pudo conectar con el servicio. Verifica la conexión e inténtalo de nuevo."],
    ["Optional analytics help us measure visits and promo claims. Essential tools work either way.", "Los análisis opcionales nos ayudan a medir las visitas y las solicitudes de promociones. Las herramientas esenciales funcionan de cualquier manera."],
    ["Cookie details", "Detalles sobre las cookies"],
    ["Decline", "Rechazar"],
    ["Accept", "Aceptar"],
    ["Cookie consent", "Consentimiento de cookies"],
    ["Open the private status link from your confirmation message.", "Abre el enlace privado de estado que aparece en tu mensaje de confirmación."],
    ["Calendar file downloaded. It contains only the pickup window and order number.", "Se descargó el archivo de calendario. Contiene solo el horario de recogida y el número del pedido."],
    ["Your browser could not create the calendar file. Keep the pickup window from your private order page handy.", "Tu navegador no pudo crear el archivo de calendario. Conserva a mano el horario de recogida que aparece en tu página privada del pedido."],
    ["Calendar file downloaded. It contains only the new pickup window and order number.", "Se descargó el archivo de calendario. Contiene solo el nuevo horario de recogida y el número del pedido."],
    ["Your browser could not create the calendar file. Keep the updated pickup window from this page handy.", "Tu navegador no pudo crear el archivo de calendario. Conserva a mano el horario de recogida actualizado que aparece en esta página."],
    ["Your pickup window was updated. You can add the new time to your calendar below.", "Se actualizó tu horario de recogida. Puedes agregar el nuevo horario a tu calendario a continuación."],
    ["Return to the private status page, verify the mobile number, and choose Open a claim again.", "Vuelve a la página privada del pedido, verifica el número móvil y selecciona Abrir un reclamo otra vez."],
    ["Lost your private link? Verify your phone to get a new one.", "¿Perdiste tu enlace privado? Verifica tu teléfono para obtener uno nuevo."],
  ]);
  for (const [english, spanish] of expected) {
    assert.equal(translateText(english, "es-US"), spanish);
  }
  assert.equal(
    translateExternalText("Unexpected provider/schema detail.", "We could not complete that request.", "es-US"),
    "No pudimos completar esa solicitud.",
  );
  assert.equal(translateText("5m ago", "es-US"), "hace 5 min");
  assert.equal(translateText("Updated hace 5 min", "es-US"), "Actualizado hace 5 min");
  assert.equal(translateText("Opening in 1 hour 2 minutes", "es-US"), "Abre en 1 hora 2 minutos");
  assert.equal(translateText("Plenty available (delayed)", "es-US"), "Muchas disponibles (con demora)");
});

test("every required public, booking, status, claims, and legal page loads the human-authored locale module", async () => {
  for (const page of requiredPages) {
    const html = await readFile(new URL(page, root), "utf8");
    assert.match(html, /assets\/js\/site-i18n\.js/, `${page} is missing locale support`);
  }
  for (const policy of ["pickup-delivery/privacy/index.html", "pickup-delivery/terms/index.html"]) {
    const html = await readFile(new URL(policy, root), "utf8");
    assert.match(html, /script-src 'self'/, `${policy} must allow only its local locale module`);
  }
});

test("every visible static customer phrase has a reviewed Spanish catalog entry", async () => {
  const missing = [];
  for (const page of requiredPages) {
    const html = (await readFile(new URL(page, root), "utf8")).replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
    for (const match of html.matchAll(/>([^<>]+)</g)) {
      const phrase = match[1]
        .replace(/&amp;/g, "&").replace(/&rsquo;/g, "’").replace(/&#39;/g, "’")
        .replace(/&mdash;/g, "—").replace(/&middot;/g, "·").replace(/\s+/g, " ").trim();
      if (!/[A-Za-z]/.test(phrase)) continue;
      if (/^(?:Snappy Coin Laundry|Google|Facebook|Instagram|DexterPay|McKelvey|Maryland Heights|Resend|Stripe|Twilio|Cloudflare|Meta|[\d$()+.·–—/\sA-Z-]+)$/.test(phrase)) continue;
      if (!CATALOGS["es-US"][phrase]) missing.push(`${page}: ${phrase}`);
    }
  }
  assert.deepEqual(missing, []);
});

test("every customer runtime phrase and template has reviewed Spanish coverage", async () => {
  const missingLiterals = [];
  const missingTemplates = [];
  const unseenTemplateSamples = new Set(runtimeTemplateSamples.keys());

  for (const modulePath of runtimeModules) {
    const source = await readFile(new URL(modulePath, root), "utf8");
    const { literals, templates } = extractJavaScriptText(source);
    for (const literal of literals) {
      if (!isRuntimeProse(literal) || nonUiRuntimeLiterals.has(literal)) continue;
      if (translateText(literal, "es-US") === literal) missingLiterals.push(`${modulePath}: ${literal}`);
    }
    for (const rawTemplate of templates) {
      const template = rawTemplate.replace(/\s+/g, " ").trim();
      if (!isRuntimeTemplate(template) || nonUiRuntimeTemplates.has(template)) continue;
      const samples = runtimeTemplateSamples.get(template);
      if (!samples) {
        missingTemplates.push(`${modulePath}: unmapped template ${template}`);
        continue;
      }
      unseenTemplateSamples.delete(template);
      for (const sample of samples) {
        if (translateText(sample, "es-US") === sample) {
          missingTemplates.push(`${modulePath}: untranslated sample ${sample}`);
        }
      }
    }
  }

  assert.deepEqual(missingLiterals, []);
  assert.deepEqual(missingTemplates, []);
  assert.deepEqual([...unseenTemplateSamples], [], "runtime template sample map contains stale entries");
  for (const lowerCasePhrase of ["date unavailable", "update available"]) {
    assert.notEqual(translateText(lowerCasePhrase, "es-US"), lowerCasePhrase);
  }
});

test("locale implementation is local, explicit, and sends locale snapshots with booking intents", async () => {
  const localeSource = await readFile(new URL("assets/js/site-i18n.js", root), "utf8");
  const bookingSource = await readFile(new URL("assets/js/pud-booking.js", root), "utf8");
  const schedulingSource = await readFile(new URL("assets/js/pud-scheduling.js", root), "utf8");
  const availabilitySource = await readFile(new URL("assets/js/availability-widget.js", root), "utf8");
  const homeSource = await readFile(new URL("index.html", root), "utf8");
  assert.doesNotMatch(localeSource, /translate\.google|deepl|microsofttranslator|fetch\s*\(/i);
  assert.match(localeSource, /localStorage\.setItem\(LOCALE_STORAGE_KEY/);
  assert.match(localeSource, /url\.searchParams\.set\("lang", "es"\)/);
  assert.match(localeSource, /attributes:\s*true/);
  assert.match(localeSource, /attributeFilter:\s*\["aria-label", "title", "placeholder", "content", "alt"\]/);
  assert.match(bookingSource, /locale: getLocale\?\.\(\) \|\| undefined/g);
  assert.match(schedulingSource, /formatCentralDateTime/);
  assert.match(bookingSource, /formatCurrencyCents/);
  assert.match(availabilitySource, /CENTRAL_TIME_ZONE/);
  assert.match(availabilitySource, /new Intl\.DateTimeFormat\(getLocale\(\)/);
  assert.doesNotMatch(availabilitySource, /Intl\.DateTimeFormat\("en-US"/);
  assert.match(homeSource, /type="module" src="assets\/js\/availability-widget\.js/);
});

test("Spanish calendar copy remains generic and contains no private fields", async () => {
  const { createPickupCalendar } = await import("../assets/js/pud-calendar.js");
  const calendar = createPickupCalendar({
    orderNumber: "PUD-20260715-AB12CD34",
    windowStartAt: "2026-07-20T14:00:00Z",
    windowEndAt: "2026-07-20T17:00:00Z",
    generatedAt: "2026-07-15T12:00:00Z",
    locale: "es-US",
    address: "2303 McKelvey Rd",
    statusToken: "private-token",
    phone: "+13145550123",
    email: "customer@example.com",
  });
  assert.match(calendar, /PRODID:.*\/ES/);
  assert.match(calendar, /SUMMARY:Recogida de Snappy Coin Laundry - pedido PUD-/);
  for (const sensitive of ["2303 McKelvey Rd", "private-token", "+13145550123", "customer@example.com"]) {
    assert.ok(!calendar.includes(sensitive));
  }
});

test("malformed route windows fail closed before a server label can reach localized UI", async () => {
  const { routeOptions } = await import("../assets/js/pud-scheduling.js");
  const base = {
    routeId: "route-1",
    routeProof: "proof-1",
    label: "Monday morning",
    windowStartAt: "2026-07-20T14:00:00Z",
    windowEndAt: "2026-07-20T17:00:00Z",
  };
  assert.equal(routeOptions({ routes: [base] }).length, 1);
  assert.deepEqual(routeOptions({ routes: [{ ...base, windowStartAt: "" }] }), []);
  assert.deepEqual(routeOptions({ routes: [{ ...base, windowEndAt: "legacy-window" }] }), []);
  assert.deepEqual(routeOptions({ routes: [{ ...base, windowEndAt: "2026-07-20T13:00:00Z" }] }), []);
});

function isRuntimeProse(value) {
  return /^[A-Z]/.test(value) && /[a-z]/.test(value) && !value.startsWith("PUD_");
}

function isRuntimeTemplate(value) {
  const prose = value.replaceAll("{value}", "").trim();
  if (/^[A-Z]/.test(prose) && /[a-z]/.test(prose)) return true;
  return /^\{value\}/.test(value) && /(?:\/lb\b|\b(?:pickup|minimum|delivery|estimated|evidence|supporting|balance|ordered|requested|opened|pickups|bags?|removed)\b)/i.test(value);
}

function extractJavaScriptText(source) {
  const literals = [];
  const templates = [];
  let index = 0;
  while (index < source.length) {
    if (source.startsWith("//", index)) {
      index = skipLineComment(source, index + 2);
      continue;
    }
    if (source.startsWith("/*", index)) {
      index = skipBlockComment(source, index + 2);
      continue;
    }
    const character = source[index];
    if (character === '"' || character === "'") {
      const parsed = readQuoted(source, index, character);
      literals.push(parsed.value);
      index = parsed.next;
      continue;
    }
    if (character === "`") {
      const parsed = readTemplate(source, index);
      templates.push(parsed.value);
      index = parsed.next;
      continue;
    }
    index += 1;
  }
  return { literals, templates };
}

function readQuoted(source, start, quote) {
  let value = "";
  let index = start + 1;
  while (index < source.length) {
    const character = source[index];
    if (character === "\\") {
      const next = source[index + 1] || "";
      value += next === "n" ? "\n" : next === "r" ? "\r" : next === "t" ? "\t" : next;
      index += 2;
      continue;
    }
    if (character === quote) return { value, next: index + 1 };
    value += character;
    index += 1;
  }
  return { value, next: source.length };
}

function readTemplate(source, start) {
  let value = "";
  let index = start + 1;
  while (index < source.length) {
    const character = source[index];
    if (character === "\\") {
      value += source[index + 1] || "";
      index += 2;
      continue;
    }
    if (character === "`") return { value, next: index + 1 };
    if (character === "$" && source[index + 1] === "{") {
      value += "{value}";
      index = skipTemplateExpression(source, index + 2);
      continue;
    }
    value += character;
    index += 1;
  }
  return { value, next: source.length };
}

function skipTemplateExpression(source, start) {
  let depth = 1;
  let index = start;
  while (index < source.length && depth > 0) {
    if (source.startsWith("//", index)) {
      index = skipLineComment(source, index + 2);
      continue;
    }
    if (source.startsWith("/*", index)) {
      index = skipBlockComment(source, index + 2);
      continue;
    }
    const character = source[index];
    if (character === '"' || character === "'") {
      index = readQuoted(source, index, character).next;
      continue;
    }
    if (character === "`") {
      index = readTemplate(source, index).next;
      continue;
    }
    if (character === "{") depth += 1;
    else if (character === "}") depth -= 1;
    index += 1;
  }
  return index;
}

function skipLineComment(source, start) {
  const end = source.indexOf("\n", start);
  return end < 0 ? source.length : end + 1;
}

function skipBlockComment(source, start) {
  const end = source.indexOf("*/", start);
  return end < 0 ? source.length : end + 2;
}
