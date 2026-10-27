import { formatCentralDateTime, translateText } from "./site-i18n.js";

export function routeOptions(result, field = "routes") {
  const routes = result?.[field] || [];
  return Array.isArray(routes)
    ? routes
        .filter((route) => route && route.routeId && route.routeProof && validRouteWindow(route, field === "routes"))
        .map((route) => ({ ...route, id: route.routeId }))
    : [];
}

export function formatRoute(route, { includeDay = true } = {}) {
  const start = route.windowStartAt;
  const end = route.windowEndAt;
  if (!start) return route.label || route.windowCode || route.id;
  const startLabel = formatCentralDateTime(start, includeDay
    ? { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
    : { hour: "numeric", minute: "2-digit" });
  const endLabel = end ? formatCentralDateTime(end, { hour: "numeric", minute: "2-digit" }) : "";
  return `${startLabel}${endLabel ? `–${endLabel}` : ""}`;
}

export function formatRouteDay(route) {
  return formatCentralDateTime(route.windowStartAt, { weekday: "long", month: "short", day: "numeric" });
}

export function routeDays(routes) {
  return [...new Set(routes.map((route) => route.routeDate))];
}

export function renderRouteDays(select, routes, placeholder) {
  select.replaceChildren(new Option(translateText(placeholder), ""));
  routeDays(routes).forEach((date) => {
    const route = routes.find((item) => item.routeDate === date);
    select.add(new Option(formatRouteDay(route), date));
  });
  select.disabled = routes.length === 0;
}

export function renderRouteTimes(select, routes, routeDate, placeholder) {
  const matching = routes.filter((route) => route.routeDate === routeDate);
  select.replaceChildren(new Option(translateText(placeholder), ""));
  matching.forEach((route) => select.add(new Option(formatRoute(route, { includeDay: false }), route.id)));
  select.disabled = matching.length === 0;
  return matching;
}

export function eligibleDeliveryRoutes(routes, pickupRoute, minimumHours = 24) {
  if (!pickupRoute) return [];
  const threshold = Date.parse(pickupRoute.windowStartAt) + (minimumHours * 60 * 60 * 1000);
  return routes.filter((route) => Date.parse(route.windowStartAt) >= threshold);
}

export function formatExpectedReturn(route) {
  if (!route?.expectedReturnAt) return "";
  return formatCentralDateTime(route.expectedReturnAt, {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export function renderRoutes(select, routes) {
  select.replaceChildren(new Option(translateText("Choose a pickup window"), ""));
  routes.forEach((route) => select.add(new Option(formatRoute(route), route.id)));
  select.disabled = routes.length === 0;
}

function validRouteWindow(route, requireExpectedReturn) {
  const instant = (value) => typeof value === "string"
    && /^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    && Number.isFinite(Date.parse(value));
  return typeof route.routeDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(route.routeDate)
    && typeof route.windowCode === "string" && Boolean(route.windowCode)
    && instant(route.windowStartAt)
    && instant(route.windowEndAt)
    && Date.parse(route.windowEndAt) > Date.parse(route.windowStartAt)
    && ((!requireExpectedReturn && !route.expectedReturnAt) || (instant(route.expectedReturnAt) && Date.parse(route.expectedReturnAt) > Date.parse(route.windowEndAt)));
}
