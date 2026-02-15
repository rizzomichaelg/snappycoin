(() => {
  const root = document.querySelector("[data-availability-widget]");
  if (!root) return;

  const statusUrl =
    root.dataset.statusUrl ||
    "https://dexterlive-status.snappycoinlaundry.workers.dev/status";
  const pollMs = Math.max(15000, Number(root.dataset.pollMs || 90000));
  const staleMs = Math.max(30000, Number(root.dataset.staleMs || 300000));
  const timeoutMs = 8000;
  const cacheKey = "snappy-availability-cache-v1";
  const maxCacheAgeMs = pollMs + 8000;

  const $ = (sel) => root.querySelector(sel);

  const el = {
    pill: $("[data-availability-pill]"),
    status: $("[data-availability-status]"),
    statusState: $("[data-availability-state]"),
    error: $("[data-availability-error]"),

    wAvail: $("[data-washers-available]"),
    wTotal: $("[data-washers-total]"),
    wInUse: $("[data-washers-inuse]"),
    wBar: $("[data-washers-bar]"),

    dAvail: $("[data-dryers-available]"),
    dTotal: $("[data-dryers-total]"),
    dInUse: $("[data-dryers-inuse]"),
    dBar: $("[data-dryers-bar]"),
  };

  let timer = null;
  let ageTimer = null;
  let lastGood = null;
  let lastGoodAt = 0;
  let inFlight = false;
  let lastActivityAt = Date.now();
  let isStaleState = false;
  let ageBaseTs = null;
  let ageStateText = "";

  function setPill(text, variant) {
    if (!el.pill) return;

    el.pill.textContent = text;
    el.pill.className = `availability-pill pill--${variant}`;
  }

  function setError(message) {
    if (!el.error) return;

    if (!message) {
      el.error.hidden = true;
      el.error.textContent = "";
      return;
    }

    el.error.hidden = false;
    el.error.textContent = message;
  }

  function formatAgo(input) {
    const ts = Number(input);
    if (!Number.isFinite(ts)) {
      return "<1 minute ago";
    }

    const seconds = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (seconds < 60) return "<1 minute ago";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  function parseTimestamp(value) {
    if (value == null) return NaN;

    if (typeof value === "number") {
      if (value > 1e12) return value;
      if (value > 1e9) return value * 1000;
      return value;
    }

    const asNumber = Number(value);
    if (Number.isFinite(asNumber)) {
      if (asNumber > 1e12) return asNumber;
      if (asNumber > 1e9) return asNumber * 1000;
      return asNumber;
    }

    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  function resolveUpdatedAt(payload, fallbackTs) {
    const candidates = [
      payload?.updatedAt,
      payload?.updated_at,
      payload?.generatedAt,
      payload?.generated_at,
      payload?.timestamp,
      payload?.time,
      payload?.updated,
    ];

    for (const candidate of candidates) {
      const parsed = parseTimestamp(candidate);
      if (Number.isFinite(parsed)) return parsed;
    }

    const fromHeader = parseTimestamp(fallbackTs);
    if (Number.isFinite(fromHeader)) return fromHeader;

    return Date.now();
  }

  function statusLine(updatedAt, stateText) {
    ageBaseTs = Number.isFinite(updatedAt) ? updatedAt : Date.now();
    ageStateText = stateText || "";
    if (el.status) {
      el.status.textContent = `Updated ${formatAgo(ageBaseTs)}`;
    }
    if (el.statusState) {
      el.statusState.textContent = ageStateText;
    }
  }

  function startAgeTicker() {
    if (ageTimer) {
      clearInterval(ageTimer);
    }

    ageTimer = setInterval(() => {
      if (!ageBaseTs) return;
      if (el.status) {
        el.status.textContent = `Updated ${formatAgo(ageBaseTs)}`;
      }
      if (el.statusState) {
        el.statusState.textContent = ageStateText;
      }
    }, 15000);
  }

  function markActivity() {
    lastActivityAt = Date.now();
    if (isStaleState) {
      isStaleState = false;
      setError("");
      if (!document.hidden) {
        startPolling();
      }
    }
  }

  function isPageStale() {
    return Date.now() - lastActivityAt > staleMs;
  }

  function pauseForStaleness() {
    if (!document.hidden && isPageStale()) {
      isStaleState = true;
      setPill("Paused", "down");
      statusLine(lastGoodAt || Date.now(), "Updates paused (inactive)");
      setAvailabilityState("down");
      setError("Updates paused while page is stale.");
      return true;
    }
    return false;
  }

  function getCachedState() {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      if (!parsed.summary || !parsed.fetchedAt) return null;
      return parsed;
    } catch (_err) {
      return null;
    }
  }

  function setCachedState(summary) {
    if (!summary) return;
    try {
      const payload = {
        summary,
        fetchedAt: Date.now(),
      };
      localStorage.setItem(cacheKey, JSON.stringify(payload));
    } catch (_err) {
      // Ignore quota/serialize failures in normal usage.
    }
  }

  function hydrateFromCache() {
    const cached = getCachedState();
    if (!cached || !cached.summary) {
      return false;
    }

    const age = Date.now() - Number(cached.fetchedAt || 0);
    if (!Number.isFinite(age)) {
      return false;
    }

    if (cached.summary.washers || cached.summary.dryers) {
      lastGood = cached.summary;
      const cachedUpdatedAt = Number(cached.summary?.updatedAt);
      lastGoodAt = Number.isFinite(cachedUpdatedAt) ? cachedUpdatedAt : Number(cached.fetchedAt) || 0;
      renderSummary(lastGood, age > pollMs, lastGoodAt);
      return true;
    }

    return false;
  }

  function setAvailabilityState(state) {
    const states = ["loading", "good", "ok", "busy", "down"];
    for (const s of states) {
      root.classList.remove(`availability-state-${s}`);
    }

    const stateClass = `availability-state-${state || "loading"}`;
    root.classList.add(stateClass);
  }

  function safeNum(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function percent(numerator, denominator) {
    if (!denominator) return 0;
    return Math.max(0, Math.min(100, Math.round((numerator / denominator) * 100)));
  }

  function normalizeBucket(bucket, fallbackTotal) {
    const available = safeNum(bucket?.available ?? bucket?.free ?? bucket?.available_count, null);
    const inUse = safeNum(bucket?.inUse ?? bucket?.in_use ?? bucket?.used ?? bucket?.occupied, null);
    const rawTotal =
      bucket?.total ??
      bucket?.count ??
      bucket?.capacity ??
      bucket?.in_service_total ??
      bucket?.inServiceTotal ??
      bucket?.service_total ??
      bucket?.serviceTotal ??
      fallbackTotal;
    const totalCandidate = safeNum(rawTotal, null);

    const outOfService =
      safeNum(
        bucket?.outOfService ??
          bucket?.out_of_service ??
          bucket?.outOfServiceCount ??
          bucket?.out_of_service_count ??
          bucket?.outOfServiceUnits ??
          bucket?.out_of_service_units,
        0
      );
    const offline =
      safeNum(
        bucket?.offline ??
          bucket?.offline_count ??
          bucket?.networkOutage ??
          bucket?.network_outage,
        0
      );

    let total = totalCandidate;
    if (total === null && available !== null && inUse !== null) {
      total = available + inUse;
    }
    if (total === null) {
      return {
        available: available ?? 0,
        total: 0,
        inUse: inUse ?? 0,
      };
    }

    const inServiceTotal = Math.max(0, Math.floor(total - outOfService - offline));
    const computedInUse = inUse === null ? Math.max(0, inServiceTotal - (available ?? 0)) : Math.max(0, inUse);

    const availableFinal =
      available === null ? Math.max(0, inServiceTotal - computedInUse) : Math.max(0, Math.min(available, inServiceTotal));

    return {
      available: availableFinal,
      total: inServiceTotal,
      inUse: computedInUse,
    };
  }

  function computeFromMachineConfigs(machineConfigs) {
    let wTotal = 0;
    let wInUse = 0;
    let dTotal = 0;
    let dInUse = 0;

    for (const cfg of Array.isArray(machineConfigs) ? machineConfigs : []) {
      const machines = Array.isArray(cfg?.machines) ? cfg.machines : [];
      for (const machine of machines) {
        const type = (machine?.machine_type || "").toLowerCase();
        const pockets = Array.isArray(machine?.pockets) ? machine.pockets : [];
        const retired = machine?.retired === true;
        const online = machine?.online !== false;

        if (retired || !online) {
          continue;
        }

        for (const pocket of pockets) {
          const outOfService =
            pocket?.out_of_service === true ||
            pocket?.payment_lockout === true ||
            pocket?.no_usage === true;
          if (outOfService) {
            continue;
          }

          const inUse = pocket?.in_use === true;
          if (type === "dryer") {
            dTotal += 1;
            if (inUse) {
              dInUse += 1;
            }
          } else {
            wTotal += 1;
            if (inUse) {
              wInUse += 1;
            }
          }
        }
      }
    }

    return {
      washers: {
        available: Math.max(0, wTotal - wInUse),
        total: wTotal,
        inUse: wInUse,
      },
      dryers: {
        available: Math.max(0, dTotal - dInUse),
        total: dTotal,
        inUse: dInUse,
      },
    };
  }

  function normalize(payload, responseDate) {
    const updatedAt = resolveUpdatedAt(payload, responseDate);

    const maybeWashers = payload?.washers || payload?.summary?.washers || payload?.availability?.washers;
    const maybeDryers = payload?.dryers || payload?.summary?.dryers || payload?.availability?.dryers;

    if (maybeWashers && maybeDryers) {
      const washers = normalizeBucket(maybeWashers, payload?.washersTotal);
      const dryers = normalizeBucket(maybeDryers, payload?.dryersTotal);
      return {
        washers,
        dryers,
        updatedAt,
      };
    }

    if (Array.isArray(payload?.machine_configs)) {
      return {
        ...computeFromMachineConfigs(payload.machine_configs),
        updatedAt,
      };
    }

    throw new Error("Unrecognized status payload shape");
  }

  function busynessLabel(washers, dryers) {
    const ratios = [];

    if (washers.total > 0) {
      ratios.push(washers.available / washers.total);
    }
    if (dryers.total > 0) {
      ratios.push(dryers.available / dryers.total);
    }

    if (!ratios.length) {
      return { text: "Busy right now", variant: "busy" };
    }

    const ratio = Math.min(...ratios);
    if (ratio >= 0.6) {
      return { text: "Plenty available", variant: "good" };
    }
    if (ratio >= 0.3) {
      return { text: "Some available", variant: "ok" };
    }

    return { text: "Busy right now", variant: "busy" };
  }

  function renderSummary(summary, degraded = false, updatedAt = null) {
    const { washers, dryers } = summary;

    const wHaveData = Number.isFinite(washers.total) && washers.total > 0;
    const dHaveData = Number.isFinite(dryers.total) && dryers.total > 0;

    el.wAvail.textContent = wHaveData ? String(washers.available) : "—";
    el.wTotal.textContent = wHaveData ? String(washers.total) : "—";
    el.wInUse.textContent = wHaveData ? String(washers.inUse) : "—";
    el.wBar.style.width = `${wHaveData ? percent(washers.available, washers.total) : 0}%`;

    el.dAvail.textContent = dHaveData ? String(dryers.available) : "—";
    el.dTotal.textContent = dHaveData ? String(dryers.total) : "—";
    el.dInUse.textContent = dHaveData ? String(dryers.inUse) : "—";
    el.dBar.style.width = `${dHaveData ? percent(dryers.available, dryers.total) : 0}%`;

    const label = busynessLabel(washers, dryers);
    const pillText = degraded ? `${label.text} (paused)` : label.text;

    const state = degraded ? "down" : label.variant;
    setPill(pillText, state);
    setAvailabilityState(state);

    const stateText = degraded ? "Updates paused" : "Updates automatically";
    statusLine(updatedAt || Date.now(), stateText);

    setError("");
  }

  function showLoading() {
    setPill("Checking…", "loading");
    statusLine(Date.now(), "Checking");
    setAvailabilityState("loading");
    setError("");
  }

  function showDown(message) {
    setPill("Unavailable", "down");
    statusLine(Date.now(), "Live availability temporarily unavailable.");
    setAvailabilityState("down");
    setError(message);
  }

  async function fetchWithTimeout(url, ms) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { accept: "application/json" },
        cache: "no-cache",
        credentials: "omit",
        signal: ctrl.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = await response.json();
      return normalize(payload, response.headers.get("date"));
    } finally {
      clearTimeout(timer);
    }
  }

  function stopPolling() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  async function tick() {
    if (inFlight || document.hidden) {
      return;
    }
    inFlight = true;
    const now = Date.now();
    const shared = getCachedState();

    try {
      if (shared?.summary && now - Number(shared.fetchedAt || 0) < maxCacheAgeMs) {
        if (!lastGood) {
          lastGood = shared.summary;
          lastGoodAt = Number(shared.fetchedAt) || now;
        }

        if (lastGoodAt && now - lastGoodAt < maxCacheAgeMs) {
          renderSummary(lastGood, now - lastGoodAt > pollMs, lastGoodAt);
          return;
        }
      }

      const summary = await fetchWithTimeout(statusUrl, timeoutMs);
      lastGood = summary;
      lastGoodAt = Number(summary.updatedAt) || Date.now();
      renderSummary(summary, false, lastGoodAt);
      setCachedState(summary);
      setError("");
    } catch (_error) {
      if (lastGood) {
        renderSummary(lastGood, true, lastGoodAt);
        if (Date.now() - lastGoodAt > pollMs * 2.5) {
          setError("Live updates are delayed right now.");
        }
        return;
      }

      showDown("Live availability temporarily unavailable.");
    } finally {
      inFlight = false;
    }
  }

  function startPolling() {
    stopPolling();
    const run = async () => {
      if (document.hidden) {
        stopPolling();
        return;
      }

      if (pauseForStaleness()) {
        stopPolling();
        return;
      }

      await tick();
      const jitter = Math.floor(Math.random() * 8000);
      timer = setTimeout(run, pollMs + jitter);
    };

    run();
  }

  function start() {
    stopPolling();
    startAgeTicker();
    const activityEvents = [
      "click",
      "keydown",
      "mousedown",
      "touchstart",
      "mousemove",
      "scroll",
      "focus",
      "pointerdown",
      "wheel",
    ];

    for (const eventType of activityEvents) {
      document.addEventListener(eventType, markActivity, { passive: true });
    }

    const hadCache = hydrateFromCache();
    if (!hadCache) {
      showLoading();
    }
    startPolling();

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stopPolling();
        return;
      }

      markActivity();

      if (isPageStale()) {
        pauseForStaleness();
        return;
      }

      startPolling();
    });
  }

  start();
})();
