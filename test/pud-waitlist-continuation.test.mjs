import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../assets/js/pud-waitlist-continuation.js", import.meta.url), "utf8");
const token = `pud_wlc_${"a".repeat(70)}`;

for (const storageBlocked of [false, true]) {
  const stored = new Map();
  let replaced = "";
  const window = {};
  const sessionStorage = {
    getItem(key) { if (storageBlocked) throw new Error("blocked"); return stored.get(key) ?? null; },
    setItem(key, value) { if (storageBlocked) throw new Error("blocked"); stored.set(key, value); },
    removeItem(key) { if (storageBlocked) throw new Error("blocked"); stored.delete(key); },
  };
  const context = {
    window,
    URLSearchParams,
    location: {
      hash: `#waitlistContinuation=${token}&waitlistRoute=route_123&keep=yes`,
      pathname: "/pickup-delivery/",
      search: "?campaign=safe",
    },
    history: {
      state: { pudStep: "address" },
      replaceState(_state, _title, url) { replaced = url; },
    },
    sessionStorage,
  };

  vm.runInNewContext(source, context);
  assert.equal(replaced, "/pickup-delivery/?campaign=safe#keep=yes");
  assert.deepEqual(JSON.parse(JSON.stringify(window.SnappyWaitlistContinuation.get())), { token, routeId: "route_123" });
  assert.equal(replaced.includes(token), false);
  window.SnappyWaitlistContinuation.clear();
  assert.equal(window.SnappyWaitlistContinuation.get(), null);
}

{
  let replaced = "";
  const stored = new Map([["snappy-pud-waitlist-continuation-v1", "stale"]]);
  const window = {};
  vm.runInNewContext(source, {
    window,
    URLSearchParams,
    location: { hash: "#waitlistContinuation=bad&waitlistRoute=route_123", pathname: "/pickup-delivery/", search: "" },
    history: { state: null, replaceState(_state, _title, url) { replaced = url; } },
    sessionStorage: { getItem: (key) => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value), removeItem: (key) => stored.delete(key) },
  });
  assert.equal(replaced, "/pickup-delivery/");
  assert.equal(window.SnappyWaitlistContinuation.invalid, true);
  assert.equal(window.SnappyWaitlistContinuation.get(), null);
}

console.log("waitlist continuation fragment capture: ok");
