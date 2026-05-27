(function () {
  var target = new URL("../../", window.location.href);
  target.search = window.location.search;
  target.hash = "free-weekday-wash";
  window.location.replace(target.toString());
})();
