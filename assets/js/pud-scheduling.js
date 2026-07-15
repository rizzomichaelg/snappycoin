export function routeOptions(result) {
  const routes = result?.routes || [];
  return Array.isArray(routes)
    ? routes
        .filter((route) => route && route.routeId && route.routeProof)
        .map((route) => ({ ...route, id: route.routeId }))
    : [];
}

export function formatRoute(route) {
  const start = route.windowStartAt;
  const end = route.windowEndAt;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
  if (!start) return route.label || route.windowCode || route.id;
  const startLabel = formatter.format(new Date(start));
  const endLabel = end ? new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "2-digit" }).format(new Date(end)) : "";
  const remaining = Number(route.remainingOrders ?? 0);
  return `${startLabel}${endLabel ? `–${endLabel}` : ""}${remaining > 0 && remaining <= 3 ? ` · ${remaining} spots left` : ""}`;
}

export function renderRoutes(select, routes) {
  select.replaceChildren(new Option("Choose a pickup window", ""));
  routes.forEach((route) => select.add(new Option(formatRoute(route), route.id)));
  select.disabled = routes.length === 0;
}
