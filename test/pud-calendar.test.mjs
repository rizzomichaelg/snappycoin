import assert from "node:assert/strict";
import test from "node:test";
import {
  createPickupCalendar,
  downloadPickupCalendar,
  pickupCalendarFilename,
} from "../assets/js/pud-calendar.js";

const pickup = Object.freeze({
  orderNumber: "PUD-20260715-AB12CD34",
  windowStartAt: "2026-07-20T14:00:00Z",
  windowEndAt: "2026-07-20T17:00:00Z",
});

test("pickup calendar is deterministic, RFC-shaped, and UTC", () => {
  const content = createPickupCalendar({
    ...pickup,
    generatedAt: new Date("2026-07-15T12:34:56.789Z"),
  });
  assert.equal(content, [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Snappy Coin Laundry//Pickup Calendar//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    "UID:PUD-20260715-AB12CD34@pickup.snappycoinlaundry.com",
    "DTSTAMP:20260715T123456Z",
    "DTSTART:20260720T140000Z",
    "DTEND:20260720T170000Z",
    "SUMMARY:Snappy Coin Laundry pickup - order PUD-20260715-AB12CD34",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n"));
  assert.ok(content.endsWith("\r\n"));
  for (const line of content.split("\r\n")) {
    assert.ok(new TextEncoder().encode(line).byteLength <= 75, `line exceeds 75 octets: ${line}`);
  }
});

test("pickup calendar allowlists only time-window and generic-order event data", () => {
  const privateValues = [
    "2303 McKelvey Rd",
    "private-token-value",
    "customer@example.com",
    "+13145550123",
    "leave bags behind the gate",
  ];
  const content = createPickupCalendar({
    ...pickup,
    generatedAt: "2026-07-15T12:00:00Z",
    address: privateValues[0],
    statusToken: privateValues[1],
    email: privateValues[2],
    phone: privateValues[3],
    accessNotes: privateValues[4],
  });
  for (const value of privateValues) assert.ok(!content.includes(value));
  for (const property of ["DESCRIPTION", "LOCATION", "URL", "ATTENDEE", "ORGANIZER", "CONTACT"]) {
    assert.ok(!content.includes(`${property}:`));
  }
  assert.equal(pickupCalendarFilename(pickup.orderNumber), "snappy-pickup-PUD-20260715-AB12CD34.ics");
});

test("pickup calendar rejects injected order numbers and invalid windows", () => {
  assert.throws(() => createPickupCalendar({
    ...pickup,
    orderNumber: "PUD-20260715-AB12CD34\r\nLOCATION:private",
  }), /generic pickup order number/);
  assert.throws(() => createPickupCalendar({
    ...pickup,
    windowStartAt: "2026-07-20T09:00:00-05:00",
  }), /UTC timestamp/);
  assert.throws(() => createPickupCalendar({
    ...pickup,
    windowEndAt: pickup.windowStartAt,
  }), /must be after/);
});

test("calendar download uses a local Blob and revokes its temporary object URL", async () => {
  let appended;
  let clicked = false;
  let removed = false;
  let capturedBlob;
  let revokeDelay;
  const revoked = [];
  const anchor = {
    setAttribute() {},
    click() { clicked = true; },
    remove() { removed = true; },
  };
  const documentRef = {
    body: { append(node) { appended = node; } },
    createElement(tag) {
      assert.equal(tag, "a");
      return anchor;
    },
  };
  const urlApi = {
    createObjectURL(blob) {
      capturedBlob = blob;
      return "blob:local-calendar";
    },
    revokeObjectURL(value) { revoked.push(value); },
  };
  const result = downloadPickupCalendar(pickup, {
    documentRef,
    urlApi,
    schedule: (callback, delay) => {
      revokeDelay = delay;
      callback();
    },
  });
  assert.equal(appended, anchor);
  assert.equal(anchor.href, "blob:local-calendar");
  assert.equal(anchor.download, result.filename);
  assert.equal(clicked, true);
  assert.equal(removed, true);
  assert.equal(revokeDelay, 1_000);
  assert.deepEqual(revoked, ["blob:local-calendar"]);
  assert.equal(capturedBlob.type, "text/calendar;charset=utf-8");
  assert.equal(await capturedBlob.text(), result.content);
});
