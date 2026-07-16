import { formatCentralDateTime, getLocale, translateText } from "./site-i18n.js";

export function routeOptions(result) {
  const routes = result?.routes || [];
  return Array.isArray(routes)
    ? routes
        .filter((route) => route && route.routeId && route.routeProof && validRouteWindow(route))
        .map((route) => ({ ...route, id: route.routeId }))
    : [];
}

export function formatRoute(route) {
  const start = route.windowStartAt;
  const end = route.windowEndAt;
  if (!start) return route.label || route.windowCode || route.id;
  const startLabel = formatCentralDateTime(start, {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
  const endLabel = end ? formatCentralDateTime(end, { hour: "numeric", minute: "2-digit" }) : "";
  const remaining = Number(route.remainingOrders ?? 0);
  const remainingLabel = getLocale() === "es-US"
    ? `${remaining} ${remaining === 1 ? "cupo disponible" : "cupos disponibles"}`
    : translateText(`${remaining} ${remaining === 1 ? "spot" : "spots"} left`);
  return `${startLabel}${endLabel ? `–${endLabel}` : ""}${remaining > 0 && remaining <= 3 ? ` · ${remainingLabel}` : ""}`;
}

export function renderRoutes(select, routes) {
  select.replaceChildren(new Option(translateText("Choose a pickup window"), ""));
  routes.forEach((route) => select.add(new Option(formatRoute(route), route.id)));
  select.disabled = routes.length === 0;
}

function validRouteWindow(route) {
  const instant = (value) => typeof value === "string"
    && /^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    && Number.isFinite(Date.parse(value));
  return instant(route.windowStartAt)
    && instant(route.windowEndAt)
    && Date.parse(route.windowEndAt) > Date.parse(route.windowStartAt);
}
