/* ===========================================================================
   BreakBox design sheet, behaviour.
   Written by Max-Anton Horvat.  MAH6 = 0x4D414836.  I wrote this.

   It is small on purpose: all it does is switch the sections, remember the last
   one I looked at, and keep the URL hash in sync so I can link straight to a
   tab. If you are checking whether a person built this: this is a person's
   amount of JavaScript.
   =========================================================================== */

(function () {
  "use strict";

  // a quiet signature in the console, my mark, the same hex as every class header
  console.log("%cBreakBox design sheet  ·  drawn by Max-Anton Horvat (MAH6, 0x4D414836)",
    "color:#77b8d1;font-family:monospace");

  var names = {
    landing: "Overview",
    application: "Application",
    architecture: "Architecture",
    security: "Security",
    usecases: "Use cases",
    research: "Research",
    diagrams: "Diagrams",
    roadmap: "Roadmap",
    references: "References"
  };

  var btns = Array.prototype.slice.call(document.querySelectorAll(".tabs button"));
  var panels = Array.prototype.slice.call(document.querySelectorAll(".panel"));
  var crumb = document.getElementById("crumb");

  // show one section, hide the rest, and record where I am
  function show(tab) {
    if (!names[tab]) tab = "landing";
    panels.forEach(function (p) { p.hidden = p.dataset.panel !== tab; });
    btns.forEach(function (b) { b.classList.toggle("active", b.dataset.tab === tab); });
    if (crumb) crumb.textContent = names[tab];
    try { localStorage.setItem("bbx-design-tab", tab); } catch (e) {}
    if (location.hash.slice(1) !== tab) history.replaceState(null, "", "#" + tab);
  }

  btns.forEach(function (b) {
    b.addEventListener("click", function () {
      show(b.dataset.tab);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  // let any in-page link like href="#references" jump to that tab
  window.addEventListener("hashchange", function () { show(location.hash.slice(1)); });

  // the figure decks: one big figure showing at a time, the same size frame every
  // time, switched by a strip of named tabs. a slideshow, but tab-driven. no
  // clicking to zoom. I wired the switching myself, no carousel library.
  document.querySelectorAll(".figdeck").forEach(function (deck) {
    var stage = deck.querySelector(".figdeck-stage");
    var tabwrap = deck.querySelector(".figdeck-tabs");
    var figs = Array.prototype.slice.call(stage.querySelectorAll("figure"));

    function showFig(n) {
      figs.forEach(function (f, k) { f.hidden = k !== n; });
      Array.prototype.slice.call(tabwrap.children).forEach(function (b, k) {
        b.classList.toggle("active", k === n);
        b.setAttribute("aria-selected", k === n ? "true" : "false");
      });
    }

    figs.forEach(function (fig, k) {
      var t = fig.querySelector(".fig-tab");
      var name = t ? t.textContent.trim() : "Figure " + (k + 1);
      var sp = fig.getAttribute("data-sprint") || "";
      var b = document.createElement("button");
      b.type = "button";
      b.className = "figdeck-tab";
      b.setAttribute("role", "tab");
      var two = (k + 1 < 10 ? "0" : "") + (k + 1);
      b.innerHTML = '<span class="n">' + two + '</span>' + name +
        (sp ? '<span class="sp">S' + sp + '</span>' : "");
      b.addEventListener("click", function () { showFig(k); });
      tabwrap.appendChild(b);
      fig._tab = b;               // so the sprint switcher can reach the tab from the figure
      // a small sprint badge in the corner of the figure frame
      var media = fig.querySelector(".fig-media");
      if (media && sp) {
        var badge = document.createElement("span");
        badge.className = "fig-sprint";
        badge.textContent = "Sprint " + sp;
        media.appendChild(badge);
      }
    });
    showFig(0);
  });

  // ---- the sprint switcher: view the sheet "as of sprint N" ------------------
  // every figure carries data-sprint (the sprint it lands in). "All" shows the whole
  // living sheet; picking a sprint marks what is new that sprint, what is carried over,
  // and what is still ahead (planned). I wired this myself, no framework.
  var sprintPills = Array.prototype.slice.call(document.querySelectorAll(".sprintpill"));
  var sprintFigs = Array.prototype.slice.call(document.querySelectorAll("figure[data-sprint], .roadcard[data-sprint], .progrow[data-sprint]"));

  // Sprint mode: picking a sprint drops a banner in that says where I am, what it delivers, and how
  // far along the ladder it sits. "All" hides it and shows the whole living sheet.
  var SPRINTS = {
    "1": { name: "Foundation", status: "built + securing", desc: "The platform, the Roslyn generator, Levels 1 and 2 with my keygen, Peek in Studio, Docker, and CI with the security scans. The database is the security foundation: the schema is now built (an EF Core DbContext and migration, MySQL in Docker with SQLite for local); the auth on top of it is Sprint 2." },
    "2": { name: "Pixler + Flip", status: "next", desc: "Patch a real app's licence check (Pixler) with my own patcher (Flip), add the SonarQube quality gate, and stand up the database auth I will attack." },
    "3": { name: "Obfuscation + native", status: "planned", desc: "Get past obfuscation and anti-debugging (Protected), then crack a native target with a memory bug (Overflow), for Ghidra and x64dbg." },
    "4": { name: "Polish + vision", status: "planned", desc: "Polish to a shareable build, the Bosch security vision, the five-minute demo, the reflection, and the attack-monitoring should-have." }
  };
  var banner = document.querySelector(".sprintbanner");
  function renderBanner(sel) {
    if (!banner) return;
    var s = SPRINTS[sel];
    if (sel === "all" || !s) { banner.hidden = true; return; }
    banner.querySelector(".sb-num").textContent = "Sprint " + sel;
    banner.querySelector(".sb-title").innerHTML = s.name + ' <span class="sb-status">' + s.status + '</span>';
    banner.querySelector(".sb-desc").textContent = s.desc;
    Array.prototype.slice.call(banner.querySelectorAll(".sb-dots i")).forEach(function (d) {
      var ds = +d.getAttribute("data-s"), n = +sel;
      d.className = ds < n ? "is-past" : ds === n ? "is-now" : "";
    });
    banner.hidden = false;
    banner.classList.remove("in"); void banner.offsetWidth; banner.classList.add("in");
  }

  function applySprint(sel) {
    document.body.setAttribute("data-sprint", sel);
    sprintPills.forEach(function (p) { p.classList.toggle("active", p.getAttribute("data-sprint") === sel); });
    sprintFigs.forEach(function (fig) {
      var s = parseInt(fig.getAttribute("data-sprint"), 10);
      fig.classList.remove("is-new", "is-future", "is-past");
      if (fig._tab) fig._tab.classList.remove("is-new", "is-future", "is-past");
      if (sel === "all" || isNaN(s)) return;
      var n = parseInt(sel, 10);
      var state = s === n ? "is-new" : (s > n ? "is-future" : "is-past");
      fig.classList.add(state);
      if (fig._tab) fig._tab.classList.add(state);
    });
    // if a figure deck's shown figure is a future sprint (now hidden), fall back to a visible one
    document.querySelectorAll(".figdeck").forEach(function (deck) {
      var active = deck.querySelector(".figdeck-tab.active");
      if (active && active.classList.contains("is-future")) {
        var ok = Array.prototype.slice.call(deck.querySelectorAll(".figdeck-tab"))
          .filter(function (t) { return !t.classList.contains("is-future"); })[0];
        if (ok) ok.click();
      }
    });
    try { localStorage.setItem("bbx-design-sprint", sel); } catch (e) {}
    renderBanner(sel);
  }

  sprintPills.forEach(function (p) {
    p.addEventListener("click", function () { applySprint(p.getAttribute("data-sprint")); });
  });

  var startSprint = "all";
  try { startSprint = localStorage.getItem("bbx-design-sprint") || "all"; } catch (e) {}
  applySprint(startSprint);

  // ---- status badges + the "Show" filter -------------------------------------
  // every figure carries data-status (built / design / idea). I stamp a badge on each so it is
  // obvious what is real, what is only a design, and what is just an idea; the filter then dims
  // whatever is not built yet down to a faint sneak peek, so nothing reads as done when it is not.
  document.querySelectorAll("figure[data-status]").forEach(function (fig) {
    var media = fig.querySelector(".fig-media"); if (!media) return;
    var s = fig.getAttribute("data-status");
    var el = document.createElement("span");
    el.className = "fig-status";
    el.textContent = s === "built" ? "Built" : s === "design" ? "Design" : "Idea";
    el.title = s === "built" ? "This runs and is tested. I have it now."
      : s === "design" ? "Researched and designed, not built yet." : "Thought of, not built. A sneak peek for later.";
    media.appendChild(el);
    // the words have to be honest too: say in the caption that a design or idea is not final and not built
    if (s !== "built") {
      var cap = fig.querySelector("figcaption");
      if (cap && !cap.querySelector(".fig-note")) {
        var note = document.createElement("span");
        note.className = "fig-note";
        note.textContent = s === "design"
          ? "Honest status: a design from my research, not built yet. What it concludes is provisional, not a final answer."
          : "Honest status: only an idea I have skimmed, not researched in full and not built. A placeholder to come back to.";
        cap.appendChild(note);
      }
    }
  });

  // ---- signature entrances: the Overview decodes itself in; References cascades in -----------
  // the landing title resolves from hex glyphs (the decode motif again), and opening References
  // cascades the sources in from the left. both fall back to the finished state on a timer, so a
  // throttled tab never leaves them stuck. I wrote this myself.
  (function () {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    var GLYPHS = "0123456789ABCDEF/\\<>[]{}".split("");
    function decodeEl(el, dur) {
      var orig = el._o != null ? el._o : (el._o = el.textContent);
      var n = orig.length, start = null, done = false;
      function f(now) {
        if (done || !el.isConnected) return;
        if (start == null) start = now;
        var p = (now - start) / dur;
        if (p >= 1) { el.textContent = orig; done = true; return; }
        var lk = Math.floor(p * n), s = orig.slice(0, lk);
        for (var i = lk; i < n; i++) { var c = orig[i]; s += (c === " ") ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0]; }
        el.textContent = s;
        requestAnimationFrame(f);
      }
      setTimeout(function () { if (!done) { el.textContent = orig; done = true; } }, dur + 450);
      requestAnimationFrame(f);
    }
    var lp = document.querySelector('.panel[data-panel="landing"]');
    var h1 = lp && lp.querySelector(".hero h1");
    function playLanding() { if (h1) decodeEl(h1, 850); }
    var rp = document.querySelector('.panel[data-panel="references"]');
    function playRefs() {
      if (!rp) return;
      var items = Array.prototype.slice.call(rp.querySelectorAll(".refgroup, .reflist li"));
      items.forEach(function (it, i) {
        it.style.opacity = "0"; it.style.transform = "translateX(-16px)";
        setTimeout(function () {
          it.style.transition = "opacity .34s ease, transform .38s cubic-bezier(.2,.7,.2,1)";
          it.style.opacity = ""; it.style.transform = "";
        }, 20 + i * 20);
      });
      setTimeout(function () { items.forEach(function (it) { it.style.opacity = ""; it.style.transform = ""; }); }, 40 + items.length * 20 + 500);
    }
    function hook(panel, play) {
      if (!panel) return;
      if (!panel.hasAttribute("hidden")) setTimeout(play, 70);
      try { new MutationObserver(function () { if (!panel.hasAttribute("hidden")) setTimeout(play, 30); }).observe(panel, { attributes: true, attributeFilter: ["hidden"] }); } catch (e) {}
    }
    hook(lp, playLanding);
    hook(rp, playRefs);
  })();

  // clickable diagram boxes: click a box and a popup opens showing what else I looked
  // at and why I still chose this. the text sits over the box but ignores clicks
  // (pointer-events:none) so a click on the label still lands on the box. one shared
  // popup, built once, filled from the box's data-* attributes. I wired this myself.
  var pop = null, lastPick = null;

  function buildPop() {
    pop = document.createElement("div");
    pop.className = "pop";
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-modal", "true");
    pop.innerHTML =
      '<div class="pop-card">' +
        '<button type="button" class="pop-x" aria-label="Close">close</button>' +
        '<span class="pop-eyebrow">Why I chose this</span>' +
        '<h4 class="pop-t"></h4>' +
        '<div class="pop-sec"><span class="pop-l">What I looked at</span><p class="pop-r"></p></div>' +
        '<div class="pop-sec"><span class="pop-l">Why I still chose this</span><p class="pop-w"></p></div>' +
        '<div class="pop-sec pop-links-sec"><span class="pop-l">What I read</span><p class="pop-links"></p></div>' +
      '</div>';
    pop.addEventListener("click", function (e) {
      if (e.target === pop || e.target.classList.contains("pop-x")) closePop();
    });
    document.body.appendChild(pop);
  }

  function openPop(el) {
    if (!pop) buildPop();
    // two modes: a settled choice ("why I chose this"), or something I still have to
    // research before I can decide ("still to research"). data-mode="research" switches
    // the labels so a future/planned box reads honestly instead of pretending it is decided.
    var research = el.getAttribute("data-mode") === "research";
    var labels = pop.querySelectorAll(".pop-l");
    pop.querySelector(".pop-eyebrow").textContent = research ? "Thought of, not researched yet" : "Why I chose this";
    labels[0].textContent = research ? "Why it is already on my radar" : "What I looked at";
    labels[1].textContent = research ? "What I still need to research" : "Why I still chose this";
    labels[2].textContent = research ? "Where I will look" : "What I read";
    pop.querySelector(".pop-t").textContent = el.getAttribute("data-t") || "";
    pop.querySelector(".pop-r").textContent = el.getAttribute("data-research") || "";
    pop.querySelector(".pop-w").textContent =
      el.getAttribute("data-why") || el.getAttribute("data-w") || "";
    // "What I read": links come as "label::url||label::url"; render as real anchors
    var linksBox = pop.querySelector(".pop-links");
    var linksSec = pop.querySelector(".pop-links-sec");
    var raw = el.getAttribute("data-links") || "";
    linksBox.innerHTML = "";
    if (raw) {
      raw.split("||").forEach(function (pair, i) {
        var bits = pair.split("::");
        if (bits.length < 2) return;
        var a = document.createElement("a");
        a.href = bits[1];
        a.textContent = bits[0];
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        if (i) linksBox.appendChild(document.createTextNode("  ·  "));
        linksBox.appendChild(a);
      });
    }
    linksSec.style.display = raw ? "" : "none";
    pop.classList.add("open");
    if (lastPick) lastPick.classList.remove("on");
    el.classList.add("on");
    lastPick = el;
  }

  function closePop() {
    if (pop) pop.classList.remove("open");
    if (lastPick) { lastPick.classList.remove("on"); lastPick = null; }
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closePop();
  });

  // every clickable box, in decks and in standalone figures alike
  document.querySelectorAll(".pick").forEach(function (el) {
    el.addEventListener("click", function () { openPop(el); });
  });

  // ---- reveal engine: every figure decodes itself into view ----------------
  // When a figure scrolls in, it prints itself under a scan beam: a bright line sweeps
  // across, the strokes ink in as it passes, and each label DECODES from a scramble of
  // hex glyphs into its real text, left to right. It is the whole project in one gesture,
  // the diagram reverse-engineers itself in front of you, then settles. One pass, no
  // perpetual motion. reduced-motion just shows the finished figure. I wrote this myself.
  (function () {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var svgs = Array.prototype.slice.call(document.querySelectorAll(".fig-media svg"));
    var NS = "http://www.w3.org/2000/svg";
    var GLYPHS = "0123456789ABCDEF/\\<>[]{}=+*".split("");
    function rnd(n) { return (Math.random() * n) | 0; }
    function lenOf(el) { try { if (el.getTotalLength) return el.getTotalLength() || 300; } catch (e) {} return 300; }
    function boxX(el) { try { return el.getBBox().x; } catch (e) { return 0; } }

    function prep(svg) {
      var all = Array.prototype.slice.call(svg.querySelectorAll("line,polyline,path,rect,circle,ellipse"))
        .filter(function (el) { return !el.closest("defs") && !el.classList.contains("scan-beam"); });
      svg._draw = all;
      svg._texts = Array.prototype.slice.call(svg.querySelectorAll("text"));
      svg._texts.forEach(function (t) { if (t._orig == null) t._orig = t.textContent; });
      all.forEach(function (el) { el.classList.add("ln"); });
      var vb = (svg.getAttribute("viewBox") || "0 0 1000 600").split(/\s+/).map(Number);
      svg._vw = vb[2] || 1000; svg._vh = vb[3] || 600;
    }
    function clearTimers(svg) { if (svg._timers) { svg._timers.forEach(clearTimeout); } svg._timers = []; }
    function dropBeam(svg) { var b = svg.querySelector(".scan-beam"); if (b) b.remove(); }
    function reset(svg) {
      clearTimers(svg); dropBeam(svg);
      (svg._draw || []).forEach(function (el) { el.style.transition = "none"; var L = lenOf(el); el.style.strokeDasharray = L; el.style.strokeDashoffset = L; });
      (svg._texts || []).forEach(function (t) { t.style.transition = "none"; t.style.opacity = 0; if (t._orig != null) t.textContent = t._orig; });
    }
    function finish(svg) {
      clearTimers(svg); dropBeam(svg);
      (svg._draw || []).forEach(function (el) { el.style.transition = "none"; el.style.strokeDasharray = ""; el.style.strokeDashoffset = ""; });
      (svg._texts || []).forEach(function (t) { t.style.transition = "none"; t.style.opacity = 1; if (t._orig != null) t.textContent = t._orig; });
    }
    function decode(t) {
      var orig = t._orig; if (orig == null) { t.style.opacity = 1; return; }
      var n = orig.length, DUR = 260 + Math.min(300, n * 11), start = performance.now();
      t.style.opacity = 1;
      function frame(now) {
        if (!t.isConnected) return;
        var p = (now - start) / DUR;
        if (p >= 1) { t.textContent = orig; return; }
        var locked = Math.floor(p * n), out = orig.slice(0, locked);
        for (var k = locked; k < n; k++) { var c = orig[k]; out += (c === " ") ? " " : GLYPHS[rnd(GLYPHS.length)]; }
        t.textContent = out;
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }
    function play(svg) {
      reset(svg);
      var vw = svg._vw, vh = svg._vh, SWEEP = 1150;
      // a short setTimeout (not rAF, which some embedded views throttle to a halt) lets the reset
      // commit, then the strokes get their transition so the CSS compositor draws them in. A
      // guaranteed setTimeout finish() at the end means a figure is never left half-drawn, even
      // if every frame callback is throttled: worst case it snaps to the finished figure.
      svg._timers.push(setTimeout(function () {
        var beam = document.createElementNS(NS, "rect");
        beam.setAttribute("class", "scan-beam");
        beam.setAttribute("x", "0"); beam.setAttribute("y", "0");
        beam.setAttribute("width", Math.max(3, vw * 0.006).toFixed(1));
        beam.setAttribute("height", vh);
        svg.appendChild(beam);
        try {
          var a = beam.animate(
            [{ transform: "translateX(-12px)", opacity: 0 }, { opacity: 0.85, offset: 0.06 }, { opacity: 0.85, offset: 0.94 }, { transform: "translateX(" + vw + "px)", opacity: 0 }],
            { duration: SWEEP, easing: "cubic-bezier(.42,0,.28,1)" });
          a.onfinish = function () { beam.remove(); };
        } catch (e) { beam.remove(); }
        (svg._draw || []).forEach(function (el) {
          var d = Math.max(0, Math.min(SWEEP, (boxX(el) / vw) * SWEEP));
          el.style.transition = "stroke-dashoffset 0.5s cubic-bezier(.4,0,.2,1)";
          el.style.transitionDelay = (d / 1000).toFixed(3) + "s";
          el.style.strokeDashoffset = 0;
        });
        (svg._texts || []).forEach(function (t) {
          var d = Math.max(0, Math.min(SWEEP, (boxX(t) / vw) * SWEEP));
          svg._timers.push(setTimeout(function () { decode(t); }, d));
        });
        svg._timers.push(setTimeout(function () { finish(svg); }, SWEEP + 900));
      }, 24));
    }
    function visible(svg) {
      var fig = svg.closest("figure"); if (fig && fig.hidden) return false;
      var panel = svg.closest(".panel"); if (panel && panel.hasAttribute("hidden")) return false;
      return true;
    }
    svgs.forEach(prep);
    if (reduce) { svgs.forEach(finish); return; }
    svgs.forEach(reset);
    // reveal each figure the first time it is actually on screen, then leave it settled. the
    // panels and figure decks show/hide by toggling [hidden] (display:none), which an
    // IntersectionObserver misses, so I trigger on first paint, on any un-hide (a tab or figure
    // switch), and on scroll. plays once per figure, no perpetual motion.
    function revealVisible() {
      svgs.forEach(function (svg) { if (!svg._played && visible(svg)) { svg._played = true; play(svg); } });
    }
    setTimeout(revealVisible, 30);
    try {
      var mo = new MutationObserver(function () { setTimeout(revealVisible, 0); });
      mo.observe(document.querySelector(".sheet") || document.body, { attributes: true, attributeFilter: ["hidden"], subtree: true });
    } catch (e) {}
    var st;
    window.addEventListener("scroll", function () { clearTimeout(st); st = setTimeout(revealVisible, 80); }, { passive: true });
  })();

  // open on the hash if there is one, else the last tab I used, else the overview
  var start = location.hash.slice(1);
  if (!names[start]) { try { start = localStorage.getItem("bbx-design-tab"); } catch (e) {} }
  show(names[start] ? start : "landing");
})();
