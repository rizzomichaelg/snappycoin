(function () {
  var target = new URL("../../", window.location.href);
  target.search = window.location.search;
  target.hash = "hero";
  window.location.replace(target.toString());
})();
