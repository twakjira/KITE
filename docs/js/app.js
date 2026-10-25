(function () {
  "use strict";

  var FRAMES = [
    { key: "measured", label: "Measured" },
    { key: "kite", label: "KITE" }
  ];

  function reveal() {
    var els = [].slice.call(document.querySelectorAll(".reveal"));
    function show(e) { e.classList.add("in"); }
    els.forEach(function (e) { if (e.getBoundingClientRect().top < window.innerHeight * 1.1) show(e); });
    setTimeout(function () { els.forEach(show); }, 1200);
    if (!("IntersectionObserver" in window)) { els.forEach(show); return; }
    var io = new IntersectionObserver(function (rows) {
      rows.forEach(function (r) { if (r.isIntersecting) { show(r.target); io.unobserve(r.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    els.forEach(function (e) { if (!e.classList.contains("in")) io.observe(e); });
  }

  function nav() {
    var links = [].slice.call(document.querySelectorAll(".navlink"));
    var secs = links.map(function (a) { return document.querySelector(a.getAttribute("href")); });
    function mark() {
      var y = window.scrollY + 120, best = 0;
      secs.forEach(function (s, i) { if (s && s.offsetTop <= y) best = i; });
      links.forEach(function (a, i) { a.classList.toggle("active", i === best); });
    }
    window.addEventListener("scroll", mark, { passive: true });
    mark();
  }

  function tables() {
    [].forEach.call(document.querySelectorAll("table[data-sortable]"), function (tb) {
      var body = tb.tBodies[0];
      var heads = [].slice.call(tb.tHead.rows[0].cells);
      var lower = (tb.getAttribute("data-lower") || "").split(",").map(Number);

      function bars() {
        heads.forEach(function (h, c) {
          if (c === 0) return;
          var cells = [].slice.call(body.rows).map(function (r) { return r.cells[c]; });
          var vals = cells.map(function (d) { return parseFloat(d.getAttribute("data-v")); });
          var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
          cells.forEach(function (d, i) {
            var bar = d.querySelector(".cellbar");
            var f = hi === lo ? 1 : (vals[i] - lo) / (hi - lo);
            if (lower.indexOf(c) >= 0) f = 1 - f;
            bar.style.width = (8 + 92 * f).toFixed(1) + "%";
          });
        });
      }

      heads.forEach(function (h, c) {
        h.classList.add("sortable");
        h.addEventListener("click", function () {
          var desc = !h.classList.contains("desc");
          heads.forEach(function (o) { o.classList.remove("asc", "desc"); });
          h.classList.add(desc ? "desc" : "asc");
          var rows = [].slice.call(body.rows);
          rows.sort(function (a, b) {
            var x = a.cells[c], y = b.cells[c];
            if (c === 0) return (desc ? -1 : 1) * x.textContent.localeCompare(y.textContent);
            return (desc ? -1 : 1) * (parseFloat(y.getAttribute("data-v")) - parseFloat(x.getAttribute("data-v")));
          });
          rows.forEach(function (r) { body.appendChild(r); });
        });
      });

      [].forEach.call(body.querySelectorAll("td"), function (d) {
        if (d.cellIndex === 0) return;
        d.setAttribute("data-v", parseFloat(d.textContent));
        var b = document.createElement("span");
        b.className = "cellbar";
        b.style.width = "0%";
        d.appendChild(b);
      });
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (rows, o) {
          rows.forEach(function (r) { if (r.isIntersecting) { bars(); o.disconnect(); } });
        }, { threshold: 0.15 }).observe(tb);
        setTimeout(bars, 1200);
      } else { bars(); }
    });
  }

  function viewer(groups) {
    var root = document.getElementById("viewer");
    if (!root || !groups.length) return;
    var group = 0, item = 0, frame = FRAMES.length - 1, playing = false, timer = null, split = 50;

    var dtabs = root.querySelector("#dtabs"),
        ftabs = root.querySelector("#ftabs"),
        thumbs = root.querySelector("#thumbs"),
        stage = root.querySelector("#stage"),
        base = root.querySelector("#base"),
        top = root.querySelector("#top"),
        lab = root.querySelector("#lab"),
        meta = root.querySelector("#meta"),
        play = root.querySelector("#play"),
        playTxt = root.querySelector("#playtxt");

    FRAMES.forEach(function (f, i) {
      var b = document.createElement("button");
      b.className = "tab";
      b.textContent = f.label;
      b.onclick = function () { stop(); frame = i; sync(); };
      ftabs.appendChild(b);
    });

    groups.forEach(function (g, i) {
      var b = document.createElement("button");
      b.className = "tab";
      b.textContent = g.label;
      b.onclick = function () { group = i; item = 0; sync(); };
      dtabs.appendChild(b);
    });

    function cur() { return groups[group].items[item]; }

    function stop() { playing = false; clearInterval(timer); playTxt.textContent = "Alternate"; play.classList.remove("active"); }
    play.onclick = function () {
      if (playing) { stop(); sync(); return; }
      playing = true; playTxt.textContent = "Stop"; play.classList.add("active");
      timer = setInterval(function () { frame = (frame + 1) % FRAMES.length; sync(); }, 1100);
      sync();
    };

    function sync() {
      var it = cur();
      base.src = it.measured;
      top.src = it[FRAMES[frame].key];
      lab.textContent = FRAMES[frame].label;
      stage.classList.toggle("cycle", playing);
      stage.style.setProperty("--split", playing ? "0%" : split + "%");
      meta.innerHTML = groups[group].label + ", " + it.label + " &middot; relative RMSE of KITE <b>" + it.rmse.kite.toFixed(3) + "</b>";
      [].forEach.call(ftabs.children, function (b, i) { b.classList.toggle("active", i === frame); });
      [].forEach.call(dtabs.children, function (b, i) { b.classList.toggle("active", i === group); });
      thumbs.innerHTML = "";
      groups[group].items.forEach(function (x, i) {
        var b = document.createElement("button");
        b.className = i === item ? "active" : "";
        b.innerHTML = '<img src="' + x.kite + '" alt="' + x.label + '" loading="lazy">';
        b.onclick = function () { item = i; sync(); };
        thumbs.appendChild(b);
      });
    }

    function drag(e) {
      if (playing) return;
      var r = stage.getBoundingClientRect();
      var x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      split = Math.max(0, Math.min(100, (x / r.width) * 100));
      stage.style.setProperty("--split", split + "%");
    }
    var down = false;
    stage.addEventListener("mousedown", function (e) { down = true; drag(e); e.preventDefault(); });
    window.addEventListener("mousemove", function (e) { if (down) drag(e); });
    window.addEventListener("mouseup", function () { down = false; });
    stage.addEventListener("touchstart", function (e) { down = true; drag(e); }, { passive: true });
    stage.addEventListener("touchmove", function (e) { if (down) drag(e); }, { passive: true });
    stage.addEventListener("touchend", function () { down = false; });

    sync();
  }

  document.addEventListener("DOMContentLoaded", function () {
    reveal(); nav(); tables();
    fetch("assets/samples/manifest.json")
      .then(function (r) { return r.json(); })
      .then(viewer)
      .catch(function () {
        var r = document.getElementById("viewer");
        if (r) r.innerHTML = '<p class="note">The interactive viewer requires a web server. ' +
          'The same predictions are shown in the figures below.</p>';
      });
  });
})();
