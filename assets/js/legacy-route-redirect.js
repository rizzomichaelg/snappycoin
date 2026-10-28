// Keep old private links on the legacy app; never forward capabilities to the new app.
const path = location.pathname.replace(/index\.html$/, "");
const leaf = path.split("/").filter(Boolean).at(-1);
const target = leaf === "pickup-delivery"
  ? (location.hash ? "/legacy/pickup-delivery/" : "https://book.snappycoinlaundry.com")
  : "/legacy/pickup-delivery/" + leaf + "/";
const url = new URL(target, location.origin);
if (url.origin === location.origin) {
  url.hash = location.hash;
  const params = new URLSearchParams(location.search);
  for (const key of ["focus", "lang"]) if (params.has(key)) url.searchParams.set(key, params.get(key));
}
location.replace(url.href);
