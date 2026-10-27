const ORDER_NUMBER_PATTERN = /^PUD-\d{8}-[A-Z0-9]{8}$/;
const MIME_TYPE = "text/calendar;charset=utf-8";

export function createPickupCalendar({
  orderNumber,
  windowStartAt,
  windowEndAt,
  generatedAt = new Date(),
  locale = "en-US",
} = {}) {
  const safeOrderNumber = assertOrderNumber(orderNumber);
  const startsAt = utcDate(windowStartAt, "Pickup window start");
  const endsAt = utcDate(windowEndAt, "Pickup window end");
  const createdAt = dateValue(generatedAt, "Calendar creation time");
  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new TypeError("Pickup window end must be after its start.");
  }

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//Snappy Coin Laundry//Pickup Calendar//${locale === "es-US" ? "ES" : "EN"}`,
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${safeOrderNumber}@pickup.snappycoinlaundry.com`,
    `DTSTAMP:${formatUtc(createdAt)}`,
    `DTSTART:${formatUtc(startsAt)}`,
    `DTEND:${formatUtc(endsAt)}`,
    `SUMMARY:${locale === "es-US" ? "Recogida de Snappy Coin Laundry - pedido" : "Snappy Coin Laundry pickup - order"} ${safeOrderNumber}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `${lines.flatMap(foldLine).join("\r\n")}\r\n`;
}

export function pickupCalendarFilename(orderNumber) {
  return `snappy-pickup-${assertOrderNumber(orderNumber)}.ics`;
}

export function downloadPickupCalendar(input, {
  documentRef = globalThis.document,
  urlApi = globalThis.URL,
  BlobCtor = globalThis.Blob,
  schedule = globalThis.setTimeout,
} = {}) {
  if (!documentRef?.body || typeof documentRef.createElement !== "function" ||
      typeof urlApi?.createObjectURL !== "function" || typeof urlApi.revokeObjectURL !== "function" ||
      typeof BlobCtor !== "function") {
    throw new Error("Calendar downloads are unavailable in this browser.");
  }
  const content = createPickupCalendar(input);
  const filename = pickupCalendarFilename(input?.orderNumber);
  const blob = new BlobCtor([content], { type: MIME_TYPE });
  const objectUrl = urlApi.createObjectURL(blob);
  const anchor = documentRef.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.hidden = true;
  anchor.setAttribute("aria-hidden", "true");
  documentRef.body.append(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    if (typeof schedule === "function") schedule(() => urlApi.revokeObjectURL(objectUrl), 1_000);
    else urlApi.revokeObjectURL(objectUrl);
  }
  return { content, filename };
}

function assertOrderNumber(value) {
  const orderNumber = typeof value === "string" ? value.trim() : "";
  if (!ORDER_NUMBER_PATTERN.test(orderNumber)) {
    throw new TypeError("A valid generic pickup order number is required.");
  }
  return orderNumber;
}

function utcDate(value, label) {
  if (typeof value !== "string" || !/Z$/.test(value)) {
    throw new TypeError(`${label} must be a UTC timestamp.`);
  }
  return dateValue(value, label);
}

function dateValue(value, label) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError(`${label} is invalid.`);
  return date;
}

function formatUtc(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function foldLine(line) {
  const encoder = new TextEncoder();
  const result = [];
  let segment = "";
  let segmentBytes = 0;
  let limit = 75;
  for (const character of line) {
    const characterBytes = encoder.encode(character).byteLength;
    if (segment && segmentBytes + characterBytes > limit) {
      result.push(result.length ? ` ${segment}` : segment);
      segment = "";
      segmentBytes = 0;
      limit = 74;
    }
    segment += character;
    segmentBytes += characterBytes;
  }
  result.push(result.length ? ` ${segment}` : segment);
  return result;
}
