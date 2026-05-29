(function () {
  var productionHost =
    /^(www\.)?snappycoinlaundry\.com$/i.test(window.location.hostname) ||
    window.location.hostname === "snappycoin-promo-test.pages.dev";

  window.SNAPPY_PROMO_CONFIG = {
    apiBase: productionHost ? "https://api.snappycoinlaundry.com" : "https://api-staging.snappycoinlaundry.com",
    turnstileSiteKey: productionHost ? "" : "0x4AAAAAADVlAL_Y3ES5Jk6-"
  };
})();
