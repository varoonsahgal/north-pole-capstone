/* North Pole Cloud Capstone - site behaviour (no dependencies) */
(function () {
  "use strict";

  var TEAMS = ["dasher", "dancer", "prancer", "vixen", "comet", "cupid", "donner", "blitzen"];
  var PAGE = document.body.dataset.page || "page";
  var PATH = location.pathname.split("/").slice(-2).join("/");

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (e) {
      return null;
    }
  }

  /* ---------- team name: personalise every [[TEAM]] on the page ---------- */
  var team = store("np-team");
  if (TEAMS.indexOf(team) === -1 && !/^[a-z][a-z0-9]{2,11}$/.test(team || "")) team = null;

  function wrapTeamTokens(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) if (walker.currentNode.nodeValue.indexOf("[[TEAM]]") !== -1) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      var parts = node.nodeValue.split("[[TEAM]]");
      var frag = document.createDocumentFragment();
      parts.forEach(function (part, i) {
        if (part) frag.appendChild(document.createTextNode(part));
        if (i < parts.length - 1) {
          var span = document.createElement("span");
          span.className = "tn";
          frag.appendChild(span);
        }
      });
      node.parentNode.replaceChild(frag, node);
    });
  }

  function paintTeam() {
    document.querySelectorAll(".tn").forEach(function (el) {
      el.textContent = team || "yourteam";
      el.title = team ? "Your team name" : "Pick your team (top right) to fill this in";
    });
    var chip = document.getElementById("team-chip-name");
    if (chip) chip.textContent = team ? "Team " + team.charAt(0).toUpperCase() + team.slice(1) : "Pick your team";
    document.querySelectorAll(".needs-team").forEach(function (el) {
      el.hidden = !!team;
    });
    document.querySelectorAll("#team-grid button").forEach(function (b) {
      b.classList.toggle("on", b.dataset.team === team);
    });
  }

  var dialog = document.getElementById("team-dialog");
  var grid = document.getElementById("team-grid");
  if (grid) {
    TEAMS.forEach(function (name) {
      var b = document.createElement("button");
      b.type = "button";
      b.dataset.team = name;
      b.innerHTML = "<span>🦌</span>" + name;
      b.addEventListener("click", function () {
        team = name;
        store("np-team", name);
        paintTeam();
        loadProgress();
        document.dispatchEvent(new Event("np-team"));
        dialog.close();
        burst(["🦌", "❄️", "⭐"], 18);
      });
      grid.appendChild(b);
    });
  }
  document.querySelectorAll("#team-chip, .pick-team").forEach(function (el) {
    el.addEventListener("click", function () {
      if (dialog.showModal) dialog.showModal();
    });
  });

  /* ---------- code blocks: light highlighting + copy ---------- */
  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function highlightLine(line) {
    var out = "";
    var i = 0;
    while (i < line.length) {
      var ch = line[i];
      if (ch === '"') {
        var end = line.indexOf('"', i + 1);
        if (end === -1) end = line.length - 1;
        out += '<span class="s">' + esc(line.slice(i, end + 1)) + "</span>";
        i = end + 1;
      } else if (ch === "#" && (i === 0 || /\s/.test(line[i - 1]))) {
        out += '<span class="c">' + esc(line.slice(i)) + "</span>";
        break;
      } else {
        out += esc(ch);
        i++;
      }
    }
    return out;
  }
  document.querySelectorAll("pre code").forEach(function (code) {
    if (/lang-(text|json)/.test(code.className)) return;
    code.innerHTML = code.textContent.split("\n").map(highlightLine).join("\n");
  });

  wrapTeamTokens(document.body);
  paintTeam();

  document.querySelectorAll(".copy").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.closest(".code").querySelector("code").textContent;
      var done = function () {
        btn.textContent = "Copied ✓";
        btn.classList.add("ok");
        setTimeout(function () {
          btn.textContent = "Copy";
          btn.classList.remove("ok");
        }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () {
          fallbackCopy(text);
          done();
        });
      } else {
        fallbackCopy(text);
        done();
      }
    });
  });
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } catch (e) {}
    ta.remove();
  }

  /* ---------- progress: steps, sleigh bar, ornaments ---------- */
  var steps = Array.prototype.slice.call(document.querySelectorAll(".step[id]"));
  var fill = document.querySelector(".track .fill");
  var sled = document.querySelector(".track .sled");
  var countEl = document.querySelector(".progress .count");
  var toc = document.querySelector(".toc .toc-links");
  var celebrated = false;

  function progressKey() {
    return "np-progress:" + PATH + ":" + (team || "none");
  }

  if (toc) {
    steps.forEach(function (step) {
      var h = step.querySelector("h2");
      var a = document.createElement("a");
      a.href = "#" + step.id;
      a.dataset.step = step.id;
      a.innerHTML = '<span class="tick">○</span><span>' + (step.dataset.short || h.textContent) + "</span>";
      toc.appendChild(a);
    });
  }

  function paintProgress(animate) {
    var done = steps.filter(function (s) {
      return s.classList.contains("is-done");
    }).length;
    var pct = steps.length ? Math.round((done / steps.length) * 100) : 0;
    if (fill) fill.style.width = pct + "%";
    if (sled) sled.style.left = pct + "%";
    if (countEl) countEl.textContent = done + " of " + steps.length + " complete";
    steps.forEach(function (s, i) {
      var link = document.querySelector('.toc a[data-step="' + s.id + '"]');
      var isDone = s.classList.contains("is-done");
      if (link) {
        link.classList.toggle("done", isDone);
        link.querySelector(".tick").textContent = isDone ? "✓" : "○";
      }
      var orn = document.querySelector('.orn[data-i="' + i + '"]');
      if (orn) orn.classList.toggle("lit", isDone);
    });
    var star = document.querySelector(".star");
    if (star) star.classList.toggle("lit", steps.length > 0 && done === steps.length);
    var treeCount = document.querySelector(".tree-box .count");
    if (treeCount) treeCount.textContent = done + " of " + steps.length + " ornaments lit";
    if (animate && steps.length && done === steps.length && !celebrated) {
      celebrated = true;
      burst(["🎄", "🎁", "⭐", "❄️", "🦌", "🔔"], 70);
      var win = document.getElementById("mission-complete");
      if (win) {
        win.hidden = false;
        win.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
    if (done < steps.length) celebrated = false;
  }

  function loadProgress() {
    var saved = {};
    try {
      saved = JSON.parse(store(progressKey()) || "{}");
    } catch (e) {}
    steps.forEach(function (s) {
      var box = s.querySelector(".done-row input");
      var on = !!saved[s.id];
      if (box) box.checked = on;
      s.classList.toggle("is-done", on);
    });
    paintProgress(false);
  }

  steps.forEach(function (s) {
    var box = s.querySelector(".done-row input");
    if (!box) return;
    box.addEventListener("change", function () {
      s.classList.toggle("is-done", box.checked);
      var saved = {};
      steps.forEach(function (x) {
        if (x.classList.contains("is-done")) saved[x.id] = 1;
      });
      store(progressKey(), JSON.stringify(saved));
      if (box.checked) burst(["❄️", "⭐", "🎁"], 12);
      paintProgress(true);
      document.dispatchEvent(new Event("np-score"));
    });
  });
  document.querySelectorAll(".orn").forEach(function (orn) {
    orn.addEventListener("click", function () {
      var s = steps[+orn.dataset.i];
      if (s) s.scrollIntoView({ behavior: "smooth" });
    });
  });
  loadProgress();

  /* ---------- quizzes ---------- */
  document.querySelectorAll(".quiz").forEach(function (quiz) {
    quiz.querySelectorAll("button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (btn.hasAttribute("data-right")) {
          btn.classList.add("right");
          quiz.classList.add("solved");
          burst(["⭐", "🔔"], 10);
        } else {
          btn.classList.remove("wrong");
          void btn.offsetWidth;
          btn.classList.add("wrong");
        }
      });
    });
  });

  /* ---------- screenshots: click to zoom ---------- */
  var lightbox = document.getElementById("lightbox");
  if (lightbox) {
    document.querySelectorAll("figure.shot img").forEach(function (img) {
      img.addEventListener("click", function () {
        lightbox.querySelector("img").src = img.src;
        lightbox.hidden = false;
      });
    });
    lightbox.addEventListener("click", function () {
      lightbox.hidden = true;
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") lightbox.hidden = true;
    });
  }

  /* ---------- confetti ---------- */
  var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function burst(symbols, n) {
    if (calm) return;
    for (var i = 0; i < n; i++) {
      var el = document.createElement("span");
      el.className = "confetti";
      el.textContent = symbols[i % symbols.length];
      el.style.left = Math.random() * 100 + "vw";
      el.style.animationDuration = 1.8 + Math.random() * 2.2 + "s";
      el.style.animationDelay = Math.random() * 0.5 + "s";
      document.body.appendChild(el);
      setTimeout(
        (function (node) {
          return function () {
            node.remove();
          };
        })(el),
        4800
      );
    }
  }

  /* ---------- snow ---------- */
  var canvas = document.getElementById("snow");
  var toggle = document.getElementById("snow-toggle");
  var snowing = store("np-snow") !== "off" && !calm;
  var ctx = canvas && canvas.getContext ? canvas.getContext("2d") : null;
  var flakes = [];
  var raf = null;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    var want = Math.min(140, Math.round((canvas.width * canvas.height) / 14000));
    flakes = [];
    for (var i = 0; i < want; i++) {
      flakes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: 0.8 + Math.random() * 2.6,
        v: 0.4 + Math.random() * 1.2,
        d: Math.random() * Math.PI * 2,
      });
    }
  }
  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (var i = 0; i < flakes.length; i++) {
      var f = flakes[i];
      f.y += f.v;
      f.d += 0.01;
      f.x += Math.sin(f.d) * 0.5;
      if (f.y > canvas.height + 4) {
        f.y = -4;
        f.x = Math.random() * canvas.width;
      }
      ctx.globalAlpha = 0.35 + f.r / 5;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    raf = requestAnimationFrame(tick);
  }
  function setSnow(on) {
    snowing = on;
    if (toggle) toggle.setAttribute("aria-pressed", String(on));
    if (!ctx) return;
    cancelAnimationFrame(raf);
    if (on) {
      resize();
      tick();
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  if (ctx) {
    window.addEventListener("resize", function () {
      if (snowing) resize();
    });
    setSnow(snowing);
  }
  if (toggle) {
    toggle.addEventListener("click", function () {
      setSnow(!snowing);
      store("np-snow", snowing ? "on" : "off");
    });
  }
})();

/* ---------- Reindeer Games: bonus challenges, score, mission clock, certificate ---------- */
(function () {
  "use strict";
  var PATH = location.pathname.split("/").slice(-2).join("/");
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function team() { return get("np-team") || "none"; }
  function key(kind) { return "np-" + kind + ":" + PATH + ":" + team(); }

  var bonuses = Array.prototype.slice.call(document.querySelectorAll(".bonus[data-id]"));
  var STEP_POINTS = 10;

  function paintScore() {
    var steps = document.querySelectorAll(".step.is-done").length;
    var total = steps * STEP_POINTS;
    bonuses.forEach(function (b) {
      if (b.classList.contains("is-done")) total += +b.dataset.points || 0;
    });
    document.querySelectorAll(".score").forEach(function (el) { el.textContent = "🏆 " + total + " pts"; });
    document.querySelectorAll(".cert-score").forEach(function (el) { el.textContent = total; });
    document.querySelectorAll(".cert-team").forEach(function (el) { el.textContent = team() === "none" ? "Reindeer" : team(); });
  }
  function loadBonus() {
    var saved = {};
    try { saved = JSON.parse(get(key("bonus")) || "{}"); } catch (e) {}
    bonuses.forEach(function (b) {
      var box = b.querySelector("label.claim input");
      var on = !!saved[b.dataset.id];
      if (box) box.checked = on;
      b.classList.toggle("is-done", on);
    });
    document.querySelectorAll(".hunt input").forEach(function (inp, i) {
      inp.value = get(key("hunt" + i)) || "";
    });
    paintScore();
  }
  bonuses.forEach(function (b) {
    var head = b.querySelector(".pts");
    if (head) head.textContent = "+" + b.dataset.points + " pts";
    var box = b.querySelector("label.claim input");
    if (!box) return;
    box.addEventListener("change", function () {
      b.classList.toggle("is-done", box.checked);
      var saved = {};
      bonuses.forEach(function (x) { if (x.classList.contains("is-done")) saved[x.dataset.id] = 1; });
      set(key("bonus"), JSON.stringify(saved));
      paintScore();
    });
  });
  document.querySelectorAll(".hunt input").forEach(function (inp, i) {
    inp.addEventListener("input", function () { set(key("hunt" + i), inp.value); });
  });
  document.addEventListener("np-score", paintScore);
  document.addEventListener("np-team", function () { loadBonus(); paintClock(); });
  loadBonus();

  /* mission clock: elapsed time versus the planned pace */
  var clock = document.querySelector(".clock");
  var plan = Array.prototype.slice.call(document.querySelectorAll(".step[data-min]"));
  function fmt(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h + ":" + (m < 10 ? "0" : "") + m + ":" + (sec < 10 ? "0" : "") + sec;
  }
  function paintClock() {
    if (!clock) return;
    var started = +get(key("clock")) || 0;
    var time = clock.querySelector(".time"), pace = clock.querySelector(".pace");
    var startBtn = clock.querySelector(".start"), resetBtn = clock.querySelector(".reset");
    startBtn.hidden = !!started;
    resetBtn.hidden = !started;
    if (!started) { time.textContent = "0:00:00"; pace.textContent = "Start the clock when your instructor says go."; pace.className = "pace"; return; }
    var elapsedMin = (Date.now() - started) / 60000;
    time.textContent = fmt(Date.now() - started);
    var sum = 0, planned = plan[plan.length - 1];
    for (var i = 0; i < plan.length; i++) { sum += +plan[i].dataset.min; if (elapsedMin < sum) { planned = plan[i]; break; } }
    var current = null;
    for (var j = 0; j < plan.length; j++) if (!plan[j].classList.contains("is-done")) { current = plan[j]; break; }
    var pi = plan.indexOf(planned), ci = current ? plan.indexOf(current) : plan.length;
    var name = planned.dataset.short || planned.id;
    if (!current) { pace.textContent = "Mission complete!"; pace.className = "pace ahead"; }
    else if (ci > pi) { pace.textContent = "Ahead of plan. Time for a bonus challenge?"; pace.className = "pace ahead"; }
    else if (ci < pi) { pace.textContent = "The plan is at “" + name + "”. Pick up the pace, or skip the bonus challenges."; pace.className = "pace behind"; }
    else { pace.textContent = "Right on plan: “" + name + "”."; pace.className = "pace"; }
  }
  if (clock) {
    clock.querySelector(".start").addEventListener("click", function () { set(key("clock"), String(Date.now())); paintClock(); });
    clock.querySelector(".reset").addEventListener("click", function () {
      if (window.confirm && !window.confirm("Reset the mission clock?")) return;
      del(key("clock")); paintClock();
    });
    paintClock();
    setInterval(paintClock, 1000);
  }
})();
