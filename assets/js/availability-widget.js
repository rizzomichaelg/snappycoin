(() => {
  const root = document.querySelector("[data-availability-widget]");
  if (!root) return;

  const statusUrl = root.dataset.statusUrl || "https://dexterlive-status.snappycoinlaundry.workers.dev/status";
  const pollMs = Number(root.dataset.pollMs || 30000);
  const timeoutMs = 8000;

  const elWashers = root.querySelector("[data-washers]");
  const elDryers = root.querySelector("[data-dryers]");
  const elUpdated = root.querySelector("[data-updated]");
  const elPill = root.querySelector("[data-availability-pill]");
  const elStatus = root.querySelector("[data-availability-status]");
  const elError = root.querySelector("[data-error]");

  let lastGood = null;
  let timer = null;

  function nowIso() {
    return new Date().toISOString();
  }

  function formatAgo(isoOrMs) {
    const t = typeof isoOrMs === "number" ? isoOrMs : Date.parse(isoOrMs);
    if (!Number.isFinite(t)) return "Updated just now";

    const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
    if (s < 10) {
      return "Updated just now";
    }
    if (s < 60) {
      return `Updated ${s}s ago`;
    }

    const m = Math.floor(s / 60);
    return `Updated ${m}m ago`;
  }

  function busynessLabel(washers, dryers) {
    const washerRatio = washers.total > 0 ? washers.available / washers.total : null;
    const dryerRatio = dryers.total > 0 ? dryers.available / dryers.total : null;
    const ratios = [washerRatio, dryerRatio].filter((v) => v !== null);

    if (ratios.length === 0) {
      return "Busy right now";
    }

    const ratio = Math.min(...ratios);

    if (ratio >= 0.6) {
      return "Plenty available";
    }
    if (ratio >= 0.3) {
      return "Some available";
    }

    return "Busy right now";
  }

  function normalizeNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function inServiceTotal(bucket, totalFallback) {
    const available = normalizeNumber(bucket?.available ?? bucket?.available_count);
    const inUse = normalizeNumber(bucket?.inUse ?? bucket?.in_use ?? bucket?.used ?? bucket?.occupied);

    if (available !== null && inUse !== null) {
      return Math.max(0, Math.floor(available + inUse));
    }

    const explicitInService = normalizeNumber(
      bucket?.inServiceTotal ??
        bucket?.in_service_total ??
        bucket?.serviceTotal ??
        bucket?.service_total ??
        null
    );

    if (explicitInService !== null) {
      return Math.max(0, Math.floor(explicitInService));
    }

    const outOfService = normalizeNumber(
      bucket?.outOfService ??
        bucket?.out_of_service ??
        bucket?.outOfServiceCount ??
        bucket?.out_of_service_count ??
        0
    );

    const offline = normalizeNumber(
      bucket?.offline ??
        bucket?.offline_count ??
        bucket?.networkOutage ??
        bucket?.network_outage ??
        0
    );

    if (totalFallback === null) {
      return null;
    }

    return Math.max(0, Math.floor(totalFallback - (outOfService || 0) - (offline || 0)));
  }

  function computeFromRawDexter(payload) {
    // Counts pockets, which matches reality for stacked dryers.
    const w = { total: 0, inUse: 0, available: 0, offline: 0, outOfService: 0 };
    const d = { total: 0, inUse: 0, available: 0, offline: 0, outOfService: 0 };

    const configs = Array.isArray(payload?.machine_configs) ? payload.machine_configs : [];

    for (const cfg of configs) {
      const machines = Array.isArray(cfg?.machines) ? cfg.machines : [];
      for (const machine of machines) {
        const type = (machine?.machine_type || "").toLowerCase(); // "washer" or "dryer"
        const pockets = Array.isArray(machine?.pockets) ? machine.pockets : [];

        for (const pocket of pockets) {
          const bucket = type === "dryer" ? d : w;
          bucket.total += 1;

          const out =
            pocket?.out_of_service === true ||
            pocket?.payment_lockout === true ||
            pocket?.no_usage === true;
          const offline = machine?.online === false || machine?.networked === false;

          if (out) {
            bucket.outOfService += 1;
          } else if (offline) {
            bucket.offline += 1;
          } else if (pocket?.in_use === true) {
            bucket.inUse += 1;
          } else {
            bucket.available += 1;
          }
        }
      }
    }

    return {
      washers: {
        available: w.available,
        total: w.available + w.inUse,
      },
      dryers: {
        available: d.available,
        total: d.available + d.inUse,
      },
      updatedAt: payload?.updatedAt || payload?.updated_at || nowIso(),
    };
  }

  function normalize(payload) {
    const washers = payload?.washers || payload?.summary?.washers;
    const dryers = payload?.dryers || payload?.summary?.dryers;

    const normalized =
      washers &&
      dryers &&
      Number.isFinite(normalizeNumber(washers.available)) &&
      Number.isFinite(normalizeNumber(washers.total)) &&
      Number.isFinite(normalizeNumber(dryers.available)) &&
      Number.isFinite(normalizeNumber(dryers.total));

    if (normalized) {
      const washersAvailable = normalizeNumber(washers.available);
      const dryersAvailable = normalizeNumber(dryers.available);
      const washerTotal = inServiceTotal(washers, normalizeNumber(washers.total));
      const dryerTotal = inServiceTotal(dryers, normalizeNumber(dryers.total));

      const safeWasherTotal =
        washerTotal === null ? normalizeNumber(washers.total) : washerTotal;
      const safeDryerTotal =
        dryerTotal === null ? normalizeNumber(dryers.total) : dryerTotal;

      return {
        washers: {
          available: washersAvailable,
          total: safeWasherTotal === null ? 0 : safeWasherTotal,
        },
        dryers: {
          available: dryersAvailable,
          total: safeDryerTotal === null ? 0 : safeDryerTotal,
        },
        updatedAt: payload?.updatedAt || payload?.updated_at || nowIso(),
      };
    }

    if (Array.isArray(payload?.machine_configs)) {
      return computeFromRawDexter(payload);
    }

    throw new Error("Unrecognized status payload shape");
  }

  function render(model, degraded = false) {
    const wText = `${model.washers.available} of ${model.washers.total} available`;
    const dText = `${model.dryers.available} of ${model.dryers.total} available`;

    elWashers.textContent = wText;
    elDryers.textContent = dText;
    elUpdated.textContent = formatAgo(model.updatedAt);

    const label = busynessLabel(model.washers, model.dryers);

    elPill.textContent = degraded ? `${label} (paused)` : label;
    if (elStatus) {
      elStatus.textContent = degraded ? "Live update paused" : "Auto-updates";
    }
    elError.hidden = true;
  }

  function showLoading() {
    elPill.textContent = "Checking availability…";
    elUpdated.textContent = "Updated —";
    if (elStatus) {
      elStatus.textContent = "Checking availability…";
    }
    elError.hidden = true;
  }

  function showError() {
    if (lastGood) {
      render(lastGood, true);
      return;
    }

    elPill.textContent = "Unavailable";
    if (elStatus) {
      elStatus.textContent = "Live availability temporarily unavailable.";
    }
    elError.hidden = false;
  }

  async function fetchWithTimeout(url, ms) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { accept: "application/json" },
        cache: "no-store",
        signal: ctrl.signal,
        credentials: "omit",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async function tick() {
    try {
      const payload = await fetchWithTimeout(statusUrl, timeoutMs);
      const model = normalize(payload);
      lastGood = model;
      render(model, false);
    } catch (error) {
      showError();
    }
  }

  function stopPolling() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function startPolling() {
    tick();
    stopPolling();
    timer = setInterval(tick, pollMs);
  }

  function start() {
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
