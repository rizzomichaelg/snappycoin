(() => {
  const root = document.querySelector("[data-availability-widget]");
  if (!root) return;

  const statusUrl =
    root.dataset.statusUrl ||
    "https://dexterlive-status.snappycoinlaundry.workers.dev/status";
  const pollMs = Math.max(5000, Number(root.dataset.pollMs || 30000));
  const timeoutMs = 8000;

  const $ = (sel) => root.querySelector(sel);

  const el = {
    pill: $("[data-availability-pill]"),
    status: $("[data-availability-status]"),
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
  let lastGood = null;
  let lastGoodAt = 0;

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

  function normalize(payload) {
    const maybeWashers = payload?.washers || payload?.summary?.washers || payload?.availability?.washers;
    const maybeDryers = payload?.dryers || payload?.summary?.dryers || payload?.availability?.dryers;

    if (maybeWashers && maybeDryers) {
      const washers = normalizeBucket(maybeWashers, payload?.washersTotal);
      const dryers = normalizeBucket(maybeDryers, payload?.dryersTotal);
      return { washers, dryers };
    }

    if (Array.isArray(payload?.machine_configs)) {
      return computeFromMachineConfigs(payload.machine_configs);
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

  function renderSummary(summary, degraded = false) {
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
    if (el.status) {
      el.status.textContent = degraded ? "Live update paused" : "Updates automatically";
    }

    setError("");
  }

  function showLoading() {
    setPill("Checking…", "loading");
    if (el.status) el.status.textContent = "Checking availability…";
    setAvailabilityState("loading");
    setError("");
  }

  function showDown(message) {
    setPill("Unavailable", "down");
    if (el.status) {
      el.status.textContent = "Live availability temporarily unavailable.";
    }
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
        cache: "no-store",
        credentials: "omit",
        signal: ctrl.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  function stopPolling() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function startPolling() {
    stopPolling();
    tick();
    timer = setInterval(tick, pollMs);
  }

  async function tick() {
    try {
      const payload = await fetchWithTimeout(statusUrl, timeoutMs);
      const summary = normalize(payload);
      lastGood = summary;
      lastGoodAt = Date.now();
      renderSummary(summary, false);
    } catch (error) {
      if (lastGood) {
        renderSummary(lastGood, true);
        if (Date.now() - lastGoodAt > pollMs * 2.5) {
          setError("Live updates are delayed right now.");
        }
        return;
      }

      showDown("Live availability temporarily unavailable.");
    }
  }

  function start() {
    stopPolling();
    showLoading();
    startPolling();

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stopPolling();
        return;
      }

      startPolling();
    });
  }

  start();
})();
