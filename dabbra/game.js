/* دبّرة — محرك اللعبة. المحتوى كله في content.js */
(() => {
  "use strict";
  const C = window.DABBRA_CONTENT;
  const KEY = "dabbra-save-v1";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const app = $("#app");
  const mascotEl = $("#mascot");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const inFrame = (() => { try { return window.self !== window.top; } catch { return true; } })();

  /* ================= الحالة ================= */
  const SKILLS = Object.keys(C.skills);
  let S = null;
  function fresh() {
    const skills = {}; SKILLS.forEach((k) => (skills[k] = [0, 0]));
    return { v: 1, screen: "title", name: "", gender: "m", band: "young", grade: "", goal: null,
      cash: 0, save: 0, emer: 0, debt: 0, xp: 0, done: {}, stars: {}, badges: [], skills,
      pre: null, post: null, alloc: null, spend: { needs: 0, impulse: 0, fun: 0 }, log: [], sound: true, started: Date.now() };
  }
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
  const loadSaved = () => { try { const d = JSON.parse(localStorage.getItem(KEY)); return d && d.v === 1 ? d : null; } catch { return null; } };

  const band = () => C.ageBands[S.band];
  const P = (n) => Math.round(n * band().priceFactor);
  const g = (m, f) => (S && S.gender === "f" ? f : m);
  const avatar = () => (S.gender === "f" ? "👧" : "👦");
  const goal = () => C.goals.find((x) => x.id === S.goal);
  const R = C.currency;
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => `<span class="num">${Math.round(n)}</span> ${R}`;
  const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const addSkill = (k, pts, max) => { S.skills[k][0] += pts; S.skills[k][1] += max; };
  const skillPct = (k) => { const [a, b] = S.skills[k]; return b ? Math.round((a / b) * 100) : 0; };
  const log = (st, text, good) => S.log.push({ st, text, good });
  const wallet = () => ({ cash: S.cash, save: S.save, emer: S.emer });

  /* ================= مؤقتات تُلغى عند الانتقال ================= */
  let timers = [];
  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(() => clearTimeout(id)); return id; };
  function countdown(sec, onTick, onEnd) {
    let left = sec * 1000, last = performance.now(), paused = false, id, dead = false;
    const loop = (t) => {
      if (dead) return;
      if (!paused) left -= t - last;
      last = t;
      onTick(Math.max(0, left) / (sec * 1000), Math.max(0, Math.ceil(left / 1000)));
      if (left <= 0) { dead = true; onEnd(); return; }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    const h = { stop() { dead = true; cancelAnimationFrame(id); }, pause() { paused = true; }, resume() { paused = false; last = performance.now(); } };
    timers.push(h.stop);
    return h;
  }
  const clearTimers = () => { timers.forEach((f) => f()); timers = []; };

  /* ================= الصوت ================= */
  let ac;
  function tone(f, d, type = "sine", vol = 0.12, when = 0) {
    if (!S || !S.sound) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume();
      const t = ac.currentTime + when, o = ac.createOscillator(), gn = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(gn).connect(ac.destination); o.start(t); o.stop(t + d + 0.02);
    } catch {}
  }
  const buzz = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch {} };
  const sfx = {
    tap: () => tone(700, 0.05, "sine", 0.07),
    coin: () => { tone(988, 0.07, "square", 0.05); tone(1319, 0.16, "square", 0.05, 0.06); },
    good: () => { [523, 659, 784].forEach((f, i) => tone(f, 0.16, "triangle", 0.14, i * 0.08)); buzz(20); },
    bad: () => { tone(240, 0.22, "sawtooth", 0.06); tone(170, 0.3, "sawtooth", 0.06, 0.12); buzz([40, 40, 40]); },
    tick: () => tone(1400, 0.025, "sine", 0.04),
    win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.22, "triangle", 0.13, i * 0.11)),
    unlock: () => [392, 523, 659, 784].forEach((f, i) => tone(f, 0.12, "square", 0.05, i * 0.06)),
  };

  /* ================= مؤثرات ================= */
  const fx = $("#fx");
  function confetti(n = 140) {
    if (reduced) return;
    const ctx = fx.getContext("2d"), dpr = devicePixelRatio || 1;
    fx.width = innerWidth * dpr; fx.height = innerHeight * dpr;
    const cols = ["#f6c443", "#1fb1ac", "#ee6464", "#36b871", "#1b2d66", "#a9dbf7"];
    const ps = Array.from({ length: n }, () => ({ x: Math.random() * fx.width, y: -Math.random() * fx.height * 0.5, vx: (Math.random() - 0.5) * 4 * dpr, vy: (2 + Math.random() * 4) * dpr, r: (4 + Math.random() * 6) * dpr, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.3, c: cols[(Math.random() * cols.length) | 0] }));
    const t0 = performance.now();
    const step = (t) => {
      ctx.clearRect(0, 0, fx.width, fx.height);
      ps.forEach((p) => { p.x += p.vx; p.y += p.vy; p.vy += 0.05 * dpr; p.a += p.va; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore(); });
      if (t - t0 < 3200) requestAnimationFrame(step); else ctx.clearRect(0, 0, fx.width, fx.height);
    };
    requestAnimationFrame(step);
  }
  function fly(from, to, html = "🪙", done) {
    if (!from || !to || reduced) { done && done(); return; }
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    const el = document.createElement("div"); el.className = "fly"; el.innerHTML = html;
    el.style.left = a.left + a.width / 2 - 18 + "px"; el.style.top = a.top + a.height / 2 - 18 + "px";
    document.body.appendChild(el);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    el.animate([{ transform: "translate(0,0) scale(1)" }, { transform: `translate(${dx / 2}px, ${dy / 2 - 80}px) scale(1.3)`, offset: 0.5 }, { transform: `translate(${dx}px, ${dy}px) scale(.7)` }], { duration: 520, easing: "ease-in-out" }).onfinish = () => { el.remove(); done && done(); };
  }
  function floatNum(el, text, color = "#1f7d4b") {
    if (!el) return;
    const r = el.getBoundingClientRect(), d = document.createElement("div");
    d.className = "float-num"; d.textContent = text; d.style.color = color;
    d.style.left = r.left + r.width / 2 - 30 + "px"; d.style.top = r.top - 10 + "px";
    document.body.appendChild(d); setTimeout(() => d.remove(), 1200);
  }

  /* ================= المرشد «سَنَد» ================= */
  const MASCOT_SVG = `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="52" r="44" fill="#d99a12"/><circle cx="50" cy="48" r="44" fill="#f6c443"/><circle cx="50" cy="48" r="34" fill="none" stroke="#d99a12" stroke-width="4" stroke-dasharray="6 6"/><ellipse cx="37" cy="44" rx="6" ry="8" fill="#1b2d66"/><ellipse cx="63" cy="44" rx="6" ry="8" fill="#1b2d66"/><circle cx="39" cy="41" r="2.2" fill="#fff"/><circle cx="65" cy="41" r="2.2" fill="#fff"/><path d="M36 60 Q50 72 64 60" stroke="#1b2d66" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="28" cy="56" r="5" fill="#ee6464" opacity=".45"/><circle cx="72" cy="56" r="5" fill="#ee6464" opacity=".45"/></svg>`;
  let sayTimer;
  function say(text, ms = 6500) {
    clearTimeout(sayTimer);
    if (!text) { mascotEl.innerHTML = ""; return; }
    mascotEl.innerHTML = `${MASCOT_SVG}<div class="bubble" role="status">${text}</div>`;
    if (ms) sayTimer = setTimeout(() => { const b = $(".bubble", mascotEl); if (b) b.remove(); }, ms);
  }

  /* ================= العرض ================= */
  function hud() {
    if (!S.goal) return "";
    const gl = goal(), pct = Math.min(100, (S.save / P(gl.price)) * 100);
    return `<header class="hud">
      <div class="hud-me"><span class="av">${avatar()}</span><span class="nm">${esc(S.name)}</span></div>
      <span class="pill" id="h-cash" title="النقد">💵 <span class="num">${Math.round(S.cash)}</span></span>
      <span class="pill" id="h-save" title="حصالة الهدف">🐷 <span class="num">${Math.round(S.save)}</span></span>
      <span class="pill" id="h-emer" title="صندوق الطوارئ">🛟 <span class="num">${Math.round(S.emer)}</span></span>
      <span class="pill" id="h-xp" title="النجوم">⭐ <span class="num">${S.xp}</span></span>
      <button class="iconbtn noprint" id="h-snd" aria-label="الصوت">${S.sound ? "🔊" : "🔇"}</button>
      <div class="goalbar"><span>${gl.icon} ${gl.name}</span><div class="track"><div class="fill" style="width:${pct}%"></div></div><span class="num">${Math.round(S.save)} / ${P(gl.price)}</span></div>
    </header>`;
  }
  function refreshHud(bump = []) {
    const h = $(".hud"); if (!h) return;
    const t = document.createElement("div"); t.innerHTML = hud(); h.replaceWith(t.firstElementChild); bindHud();
    bump.forEach((k) => { const el = $("#h-" + k); if (el) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); } });
  }
  function bindHud() { const b = $("#h-snd"); if (b) b.onclick = () => { S.sound = !S.sound; persist(); refreshHud(); }; }
  function view(html) {
    clearTimers(); closeModal();
    app.innerHTML = hud() + `<main class="screen" id="main">${html}</main>`;
    bindHud(); window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    return $("#main");
  }
  let modalEl = null;
  function modal(html, cls = "") {
    closeModal();
    modalEl = document.createElement("div"); modalEl.className = "overlay";
    modalEl.innerHTML = `<div class="modal ${cls}" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(modalEl);
    return modalEl.firstElementChild;
  }
  function closeModal() { if (modalEl) { modalEl.remove(); modalEl = null; } }

  /* ================= الشاشة الأولى ================= */
  function title() {
    const saved = loadSaved();
    const canResume = saved && saved.goal;
    const hasReport = canResume && saved.screen === "report";
    S = S || saved || fresh();
    const coins = reduced ? "" : Array.from({ length: 14 }, (_, i) => `<span style="left:${(i * 7.3) % 100}%;animation-duration:${4 + (i % 5)}s;animation-delay:${-i * 0.7}s">🪙</span>`).join("");
    const m = view(`
      <section class="card hero center" style="display:flex;flex-direction:column;gap:18px">
        <div class="coins">${coins}</div>
        <p class="eyebrow">رحلة مالية افتراضية للطلاب والطالبات</p>
        <h1 class="title-xl logo-word">دبّرة</h1>
        <p class="title-m" style="max-width:34ch">مصروفك بين يديك. وزّعه، تسوّق، واجه المفاجآت، واصطد المحتالين، ثم اكتشف أي مدبّر أنت!</p>
        <div class="mosaic">${C.stations.map((s) => `<img src="${s.img}" alt="${s.title}">`).join("")}</div>
        <div class="row" style="justify-content:center">
          ${canResume ? `<button class="btn gold big" id="resume">${hasReport ? "اعرض تقريري 📊" : "أكمل رحلتك ▶"}</button>` : ""}
          <button class="btn big ${canResume ? "ghost" : "gold"}" id="new">${canResume ? "رحلة جديدة" : "ابدأ الرحلة ▶"}</button>
        </div>
        <p class="muted" style="font-size:14px">6 محطات · قرابة 25 دقيقة · تقرير شخصي في النهاية</p>
      </section>`);
    if (canResume) $("#resume", m).onclick = () => { S = saved; sfx.unlock(); resume(); };
    $("#new", m).onclick = () => { S = fresh(); sfx.tap(); setup(); };
    say("أهلًا! أنا <b>سَنَد</b>، مرشدك في رحلة المال. جاهز للمغامرة؟", 0);
  }
  function resume() {
    if (S.screen === "report") return report();
    if (S.screen === "post") return quiz("post");
    if (!S.pre) return quiz("pre");
    if (!S.goal) return pickGoal();
    map();
  }

  /* ================= التسجيل ================= */
  function setup() {
    S.screen = "setup";
    const grades = Object.entries(C.ageBands).flatMap(([k, b]) => b.grades.map((gr) => ({ k, gr })));
    const m = view(`
      <section class="card" style="display:flex;flex-direction:column;gap:18px">
        <p class="eyebrow">قبل الانطلاق</p>
        <h2 class="title-l">جهّز شخصيتك</h2>
        <label class="field" for="nm">ما اسمك؟<input id="nm" maxlength="20" autocomplete="off" placeholder="اكتب اسمك الأول" value="${esc(S.name)}"></label>
        <div class="field">اختر شخصيتك
          <div class="grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">
            <button class="tile ${S.gender === "m" ? "on" : ""}" data-g="m"><span class="ic">👦</span>طالب</button>
            <button class="tile ${S.gender === "f" ? "on" : ""}" data-g="f"><span class="ic">👧</span>طالبة</button>
          </div>
        </div>
        <div class="field">صفك الدراسي
          <div class="chips">${grades.map((x) => `<button class="chip ${S.grade === x.gr ? "on" : ""}" data-b="${x.k}" data-gr="${x.gr}">${x.gr}</button>`).join("")}</div>
        </div>
        <button class="btn gold big" id="go" style="align-self:center">انطلق إلى اختبار البداية</button>
      </section>`);
    $$("[data-g]", m).forEach((b) => (b.onclick = () => { S.gender = b.dataset.g; $$("[data-g]", m).forEach((x) => x.classList.toggle("on", x === b)); sfx.tap(); }));
    $$("[data-gr]", m).forEach((b) => (b.onclick = () => { S.grade = b.dataset.gr; S.band = b.dataset.b; $$("[data-gr]", m).forEach((x) => x.classList.toggle("on", x === b)); sfx.tap(); }));
    $("#go", m).onclick = () => {
      const nm = $("#nm", m).value.trim();
      if (!nm) { $("#nm", m).focus(); say("اكتب اسمك أولًا حتى أعرف كيف أناديك 😊"); sfx.bad(); return; }
      if (!S.grade) { say("اختر صفك الدراسي لأجهّز لك المواقف المناسبة."); sfx.bad(); return; }
      S.name = nm; persist(); sfx.good(); quiz("pre");
    };
    say("اكتب اسمك واختر شخصيتك وصفك. سأجهّز لك رحلة على مقاسك!", 0);
  }

  /* ================= الاختبار القبلي والبعدي ================= */
  function quiz(phase) {
    S.screen = phase; persist();
    const qs = C.quiz.map((q, i) => ({ ...q, i, order: phase === "post" ? shuffle(q.options.map((_, j) => j)) : q.options.map((_, j) => j) }));
    const res = []; let idx = 0;
    const isPre = phase === "pre";
    const m = view(`
      <section class="card" style="display:flex;flex-direction:column;gap:14px">
        <p class="eyebrow">${isPre ? "اختبار الانطلاق" : "اختبار الوصول"}</p>
        <h2 class="title-l">${isPre ? `لنعرف من أين ${g("تبدأ", "تبدئين")}` : `لنرَ كم ${g("تطورت", "تطورتِ")}!`}</h2>
        <div class="qhead"><span id="qn"></span><div class="qdots" id="qd"></div></div>
        <div class="timer"><i id="tb"></i></div>
        <h3 class="title-m" id="qq" aria-live="polite"></h3>
        <div class="choices" id="qc"></div>
      </section>`);
    say(isPre ? "ستة أسئلة سريعة. لا تقلق، هذا ليس امتحانًا؛ فقط لنعرف نقطة البداية." : "نفس الأسئلة… لكنك الآن صاحب خبرة! ركّز.", 0);
    const show = () => {
      const q = qs[idx];
      $("#qn", m).textContent = `السؤال ${idx + 1} من ${qs.length}`;
      $("#qd", m).innerHTML = qs.map((_, j) => `<i class="${j < idx ? (isPre ? "ok" : res[j] ? "ok" : "no") : j === idx ? "cur" : ""}"></i>`).join("");
      $("#qq", m).textContent = q.q;
      $("#qc", m).innerHTML = q.order.map((j, n) => `<button class="choice" data-j="${j}"><span class="k">${"أبجد"[n]}</span>${esc(q.options[j])}</button>`).join("");
      const tm = countdown(25, (f) => ($("#tb", m).style.transform = `scaleX(${f})`), () => answer(-1));
      const answer = (j) => {
        tm.stop();
        const ok = j === q.a; res[idx] = ok;
        $$(".choice", m).forEach((b) => {
          b.disabled = true;
          if (!isPre && +b.dataset.j === q.a) b.classList.add("good");
          if (!isPre && +b.dataset.j === j && !ok) b.classList.add("bad");
          if (isPre && +b.dataset.j === j) b.classList.add("good");
        });
        if (isPre) sfx.coin(); else ok ? sfx.good() : sfx.bad();
        later(() => { idx++; idx < qs.length ? show() : done(); }, isPre ? 550 : 1100);
      };
      $$(".choice", m).forEach((b) => (b.onclick = () => answer(+b.dataset.j)));
    };
    const done = () => {
      const score = res.filter(Boolean).length;
      S[phase] = score; persist();
      if (isPre) {
        sfx.win();
        const dm = modal(`<div class="big-ic">🚀</div><h2 class="title-l">تم تسجيل نقطة البداية!</h2><p>${g("أنت", "أنتِ")} الآن ${g("جاهز", "جاهزة")} لاختيار هدفك الكبير.</p><button class="btn gold big" id="nx">اختر هدفي</button>`);
        $("#nx", dm).onclick = () => { closeModal(); pickGoal(); };
      } else {
        if (S.post > S.pre && !S.badges.includes("growth")) S.badges.push("growth");
        S.screen = "report"; persist(); report(true);
      }
    };
    show();
  }

  /* ================= اختيار الهدف ================= */
  function pickGoal() {
    S.screen = "goal"; persist();
    const m = view(`
      <section class="card" style="display:flex;flex-direction:column;gap:16px">
        <p class="eyebrow">هدفك الكبير</p>
        <h2 class="title-l">ما الشيء الذي تحلم بشرائه؟</h2>
        <p class="muted">ستدخر له طوال الرحلة. كل قرار ${g("تتخذه", "تتخذينه")} يقربك منه أو يبعدك عنه.</p>
        <div class="grid">${C.goals.map((x) => `<button class="tile" data-id="${x.id}"><span class="ic">${x.icon}</span><span class="title-m">${x.name}</span><span class="num" style="font-size:24px;color:var(--teal-dk)">${P(x.price)} ${R}</span><span class="muted">الصعوبة: ${"🔥".repeat(x.level)}</span></button>`).join("")}</div>
      </section>`);
    $$("[data-id]", m).forEach((b) => (b.onclick = (e) => {
      S.goal = b.dataset.id; sfx.unlock(); persist();
      fly(b, document.body, goal().icon);
      say(`اختيار رائع! ${goal().icon} ${goal().name} ينتظرك في نهاية الطريق. هيا إلى الخريطة!`);
      later(map, 500);
    }));
    say("اختر هدفًا يحمّسك. الأغلى أصعب… لكن الوصول إليه أمتع!", 0);
  }

  /* ================= الخريطة ================= */
  function nextStation() { return C.stations.find((s) => !S.done[s.id]); }
  function map(justDone) {
    S.screen = "map"; persist();
    const nx = nextStation();
    const allDone = !nx;
    const m = view(`
      <section class="card center" style="display:flex;flex-direction:column;gap:6px">
        <p class="eyebrow">خريطة الرحلة</p>
        <h2 class="title-l">${allDone ? "أنهيت كل المحطات! 🎉" : `المحطة ${nx.id}: ${nx.title}`}</h2>
        <p class="muted">${allDone ? "بقيت خطوة واحدة: اختبار الوصول، ثم تقريرك الشخصي." : "اضغط على المحطة المضيئة لتبدأ."}</p>
        ${allDone ? `<button class="btn gold big" id="post" style="margin-top:8px">اختبار الوصول 🏁</button>` : ""}
      </section>
      <section class="map" id="map">
        <svg class="path" id="pth" aria-hidden="true"></svg>
        ${C.stations.map((s, i) => {
          const done = S.done[s.id], cur = nx && nx.id === s.id, st = S.stars[s.id] || 0;
          return `<div class="stop ${i % 2 ? "alt" : ""}">
            <button class="node ${cur ? "current" : ""}" data-id="${s.id}" ${cur ? "" : "disabled"} aria-label="${s.title}">
              <img src="${s.img}" alt="">
              <span class="no">${s.id}</span>
              ${!done && !cur ? `<span class="lock">🔒</span>` : ""}
              ${done ? `<span class="stars">${"⭐".repeat(st)}${"☆".repeat(3 - st)}</span>` : ""}
              ${cur ? `<span class="token">${avatar()}</span>` : ""}
            </button>
            <div class="stop-info"><h3>${s.title}</h3><p>${s.game} · ${s.skill}</p></div>
          </div>`;
        }).join("")}
      </section>`);
    drawPath();
    $$(".node:not([disabled])", m).forEach((b) => (b.onclick = () => { sfx.tap(); stationIntro(+b.dataset.id); }));
    if (allDone) $("#post", m).onclick = () => quiz("post");
    const cur = $(".node.current", m);
    if (cur && justDone) later(() => { cur.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" }); sfx.unlock(); }, 350);
    const msgs = allDone ? "رحلة مذهلة! هيا نختبر ما تعلمته." : justDone ? `فُتحت محطة جديدة: <b>${nx.title}</b>! ${g("أنت", "أنتِ")} ${g("تتقدم", "تتقدمين")} بسرعة.` : `${g("مستعد", "مستعدة")}؟ المحطة التالية: <b>${nx.title}</b>.`;
    say(msgs, 0);
  }
  function drawPath() {
    const mp = $("#map"), svg = $("#pth"); if (!mp || !svg) return;
    const base = mp.getBoundingClientRect();
    const pts = $$(".node", mp).map((n) => { const r = n.getBoundingClientRect(); return [r.left - base.left + r.width / 2, r.top - base.top + r.height / 2]; });
    let d = "", dd = "";
    const doneCount = C.stations.filter((s) => S.done[s.id]).length;
    pts.forEach((p, i) => {
      if (!i) { d = `M${p[0]} ${p[1]}`; dd = d; return; }
      const q = pts[i - 1], my = (q[1] + p[1]) / 2, seg = ` C${q[0]} ${my} ${p[0]} ${my} ${p[0]} ${p[1]}`;
      d += seg; if (i <= doneCount) dd += seg;
    });
    svg.setAttribute("viewBox", `0 0 ${base.width} ${base.height}`);
    svg.innerHTML = `<path d="${d}" fill="none" stroke="#ffffff" stroke-width="16" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#a9c9e2" stroke-width="5" stroke-dasharray="2 14" stroke-linecap="round"/>${doneCount ? `<path d="${dd}" fill="none" stroke="#f6c443" stroke-width="8" stroke-linecap="round"/>` : ""}`;
  }
  addEventListener("resize", () => { if (S && S.screen === "map") drawPath(); });

  /* ================= مقدمة المحطة ================= */
  function stationIntro(id) {
    const s = C.stations.find((x) => x.id === id);
    const m = view(`
      <section class="card intro">
        <img src="${s.img}" alt="">
        <div style="display:flex;flex-direction:column;gap:12px;min-width:0">
          <p class="eyebrow">المحطة ${s.id} من 6 · ${s.title}</p>
          <h2 class="title-l">${s.game}</h2>
          <p style="font-size:19px">${s.story}</p>
          <p class="pill" style="align-self:flex-start">🎓 ${g("ستتعلم", "ستتعلمين")}: ${s.skill}</p>
          <div class="row"><button class="btn gold big" id="go">ابدأ التحدي ▶</button><button class="btn ghost" id="bk">الخريطة</button></div>
        </div>
      </section>`);
    $("#bk", m).onclick = () => map();
    $("#go", m).onclick = () => { sfx.unlock(); GAMES[id](); };
    say(["المال يحب الخطة!", "العين تشتهي… والعقل يختار!", "الأهم فالمهم!", "ريال فوق ريال يصنع حلمًا!", "الاستعداد نصف الحل!", "لا تشارك رمزك أبدًا!"][id - 1]);
  }

  /* ================= إنهاء المحطة ================= */
  function finish(id, pct, badgeKey, lines, before) {
    const stars = pct >= 0.8 ? 3 : pct >= 0.5 ? 2 : 1;
    const s = C.stations.find((x) => x.id === id);
    S.done[id] = true; S.stars[id] = stars;
    const gained = stars * 40;
    S.xp += gained;
    const newBadge = stars >= 2 && !S.badges.includes(badgeKey);
    if (newBadge) S.badges.push(badgeKey);
    if (S.save >= P(goal().price) && !S.badges.includes("goal")) S.badges.push("goal");
    persist();
    const dl = (k, ic, nm) => { const d = Math.round(S[k] - before[k]); return d ? `<span class="delta ${d > 0 ? "up" : "down"}">${ic} ${nm} ${d > 0 ? "+" : ""}${d}</span>` : ""; };
    const head = stars === 3 ? `${g("مدبّر", "مدبّرة")} ${g("رائع", "رائعة")}!` : stars === 2 ? "أحسنت! أداء جيد" : "بداية جيدة، والتجربة تعلّم";
    const m = view(`
      <section class="card center" style="display:flex;flex-direction:column;gap:14px">
        <p class="eyebrow">انتهت المحطة ${id} · ${s.title}</p>
        <div class="stars-big">${[1, 2, 3].map((n) => `<span class="${n <= stars ? "" : "off"}" style="animation-delay:${n * 0.18}s">⭐</span>`).join("")}</div>
        <h2 class="title-l">${head}</h2>
        <p class="pill num">+${gained} ⭐</p>
        ${newBadge ? `<span class="badge">${C.badges[badgeKey].icon} وسام جديد: ${C.badges[badgeKey].name}</span>` : ""}
        <div class="deltas">${dl("cash", "💵", "النقد")}${dl("save", "🐷", "الحصالة")}${dl("emer", "🛟", "الطوارئ")}</div>
        <div class="choices" style="max-width:620px">${lines.map((l) => `<div class="feedback ${l[0]}">${l[1]}</div>`).join("")}</div>
        <button class="btn gold big" id="nx">${id < 6 ? "إلى المحطة التالية ▶" : "إلى الخريطة ▶"}</button>
      </section>`);
    if (stars >= 2) { confetti(); sfx.win(); } else sfx.good();
    refreshHud(["xp"]);
    $("#nx", m).onclick = () => map(true);
    say(stars === 3 ? "واو! ثلاث نجوم! أنا فخور بك 🌟" : stars === 2 ? "عمل جميل! في المحطة القادمة يمكنك الوصول لثلاث نجوم." : "لا بأس! كل محطة تعلمنا شيئًا. تابع!");
  }

  /* ================= المحطة 1: الجِرار ================= */
  function st1() {
    const before = { cash: 0, save: 0, emer: 0 };
    S.cash = 0; S.save = 0; S.emer = 0;
    const total = P(C.income), v = total / 10;
    const put = { needs: 0, save: 0, emergency: 0, fun: 0 };
    let left = 10;
    const m = view(`
      <section class="card center" style="display:flex;flex-direction:column;gap:6px">
        <p class="eyebrow">المحطة 1 · مصنع الجِرار</p>
        <h2 class="title-l">وصل مصروفك: ${money(total)}</h2>
        <p class="muted">اضغط على أي جرّة لتضع فيها عملة. كل عملة = ${v} ${R}. اضغط − لإرجاع عملة.</p>
      </section>
      <div class="tray" id="tray" aria-label="العملات المتبقية"></div>
      <div class="jars" id="jars">${C.jars.map((j) => `<div class="jar" role="button" tabindex="0" data-j="${j.id}" aria-label="${j.name}">
          <button class="minus" data-m="${j.id}" aria-label="أرجع عملة من ${j.name}">−</button>
          <span class="jic">${j.icon}</span><span class="jn">${j.name}</span><span class="jh">${j.hint}</span>
          <div class="stack"></div><span class="amt num">0</span><span class="pct">0٪</span></div>`).join("")}</div>
      <div class="row" style="justify-content:center"><button class="btn ghost" id="hint">💡 تلميح (−10 ⭐)</button><button class="btn gold big" id="ok" disabled>اعتمد التوزيع ✔</button></div>`);
    const draw = () => {
      $("#tray", m).innerHTML = left ? Array.from({ length: left }, () => `<span class="coin">${v}</span>`).join("") : `<span class="muted" style="font-weight:700">وزّعت كل العملات! راجع توزيعك ثم اعتمده.</span>`;
      C.jars.forEach((j) => {
        const el = $(`[data-j="${j.id}"]`, m), n = put[j.id];
        $(".stack", el).innerHTML = Array.from({ length: n }, () => `<span class="coin sm">${v}</span>`).join("");
        $(".amt", el).textContent = n * v; $(".pct", el).textContent = n * 10 + "٪";
      });
      $("#ok", m).disabled = left > 0;
    };
    const hintFor = () => {
      if (put.fun >= 5) return "المتعة جميلة، لكن نصف المصروف للمتعة كثير! ماذا عن هدفك؟";
      if (put.needs >= 7) return "الأساسيات مهمة، لكن قد تحتاج جزءًا للادخار والطوارئ.";
      if (!left && put.save === 0) return `لم تضع شيئًا في جرّة الهدف! كيف ${g("ستصل", "ستصلين")} إلى ${goal().name}؟`;
      if (!left && put.emergency === 0) return "ماذا لو حدثت مفاجأة؟ جرّة الطوارئ فارغة!";
      if (!left) return "توزيع يبدو متوازنًا. اعتمده إذا كنت راضيًا!";
      return null;
    };
    $$(".jar", m).forEach((el) => {
      const add = () => {
        if (!left) { sfx.bad(); say("لا توجد عملات في الصينية. اضغط − لإرجاع عملة."); return; }
        const coins = $$(".coin", $("#tray", m)); const src = coins[coins.length - 1];
        left--; put[el.dataset.j]++; sfx.coin();
        fly(src, el, `<span class="coin sm">${v}</span>`);
        draw(); const h = hintFor(); if (h) say(h);
      };
      el.onclick = (e) => { if (e.target.closest(".minus")) return; add(); };
      el.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); add(); } };
    });
    $$("[data-m]", m).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); const k = b.dataset.m; if (put[k]) { put[k]--; left++; sfx.tap(); draw(); } }));
    $("#hint", m).onclick = () => { S.xp = Math.max(0, S.xp - 10); refreshHud(["xp"]); say("تلميح: جرّب «ادفع لنفسك أولًا»: خُمس على الأقل للهدف، وعُشر للطوارئ، وحوالي النصف للأساسيات، والباقي للمتعة.", 9000); $("#hint", m).disabled = true; };
    $("#ok", m).onclick = () => {
      const n = put.needs, s = put.save, e = put.emergency, f = put.fun;
      const pN = n >= 4 && n <= 5 ? 3 : n === 3 || n === 6 ? 2 : n === 2 || n === 7 ? 1 : 0;
      const pS = s >= 2 ? 3 : s === 1 ? 1 : 0;
      const pE = e >= 1 && e <= 2 ? 3 : e >= 3 ? 2 : 0;
      const pF = f <= 3 ? 3 : f === 4 ? 1 : 0;
      addSkill("budget", pN + pF, 6); addSkill("saving", pS, 3); addSkill("emergency", pE, 3);
      S.cash = (n + f) * v; S.save = s * v; S.emer = e * v;
      S.alloc = { needs: n * 10, save: s * 10, emergency: e * 10, fun: f * 10 };
      S.spend.fun += f * v;
      log(1, `خصصت ${s * 10}٪ للادخار، و ${e * 10}٪ للطوارئ`, pS + pE >= 5);
      const lines = [
        [pN >= 2 ? "good" : "bad", pN === 3 ? "🏠 الأساسيات: ممتاز، مبلغ كافٍ لاحتياجاتك." : n < 4 ? "🏠 الأساسيات قليلة! قد لا يكفيك المال لطعامك ومواصلاتك في السوق القادم." : "🏠 الأساسيات أكثر من اللازم قليلًا، كان يمكن ادخار جزء منها."],
        [pS === 3 ? "good" : pS ? "mid" : "bad", pS === 3 ? "🎯 هدفي: رائع! دفعت لنفسك أولًا." : pS ? "🎯 هدفي: بداية، لكن عملة واحدة تجعل الطريق طويلًا." : "🎯 هدفي: لم تدخر شيئًا، والهدف سيبتعد."],
        [pE >= 2 ? "good" : "bad", pE === 3 ? "🛟 الطوارئ: أنت مستعد للمفاجآت." : pE === 2 ? "🛟 الطوارئ: مستعد جدًا، وربما أكثر من اللازم." : "🛟 الطوارئ: فارغة! ستعرف قيمتها في محطة المفاجآت."],
        [pF === 3 ? "good" : "mid", pF === 3 ? "🎈 المتعة: مقدار معقول، استمتع بلا ذنب." : "🎈 المتعة: كبيرة، وهذا يقلل فرصتك في الادخار."],
      ];
      const pct = (pN + pS + pE + pF) / 12;
      later(() => finish(1, pct, "planner", lines, before), 200);
    };
    draw();
    say(`هذا مصروفك كاملًا: ${total} ${R}. وزّعه على الجِرار قبل أن ${g("تصرف", "تصرفي")} أي شيء!`, 0);
  }

  /* ================= المحطة 2: السوبرماركت ================= */
  function st2() {
    const before = wallet();
    const budget = S.cash, cfg = C.shop;
    const items = [];
    cfg.needs.forEach((nd) => nd.options.forEach((o, i) => items.push({ key: nd.id + i, kind: "need", need: nd.id, icon: nd.icon, name: nd.name, op: o.label, price: P(o.price), unit: `${(P(o.price) / o.qty).toFixed(2).replace(/\.00$/, "")} ${R} لكل ${o.per}`, best: !!o.best })));
    cfg.temptations.forEach((t) => items.push({ key: t.id, kind: "tempt", icon: t.icon, name: t.name, price: P(t.price), tag: t.tag }));
    const shelf = shuffle(items);
    const cart = new Map(); // key -> item
    let flashTaken = false, flashShown = false, ended = false;
    const m = view(`
      <section class="card" style="display:flex;flex-direction:column;gap:8px">
        <div class="qhead"><span class="eyebrow">المحطة 2 · سباق السوبرماركت</span><span class="num" id="sec" style="font-size:24px">${cfg.seconds}</span></div>
        <div class="timer"><i id="tb"></i></div>
      </section>
      <div class="shop">
        <section class="card" style="min-width:0"><h3 class="title-m" style="margin-bottom:10px">الرفوف</h3><div class="shelf" id="shelf"></div></section>
        <aside class="card cart">
          <h3 class="title-m">🛒 سلتك</h3>
          <ul class="list" id="lst">${cfg.needs.map((n) => `<li data-n="${n.id}">${n.icon} ${n.name}</li>`).join("")}</ul>
          <div class="cart-items" id="ci"></div>
          <div class="total" id="tot"></div>
          <button class="btn gold" id="pay">ادفع وأنهِ التسوق</button>
        </aside>
      </div>`);
    const total = () => [...cart.values()].reduce((a, b) => a + b.price, 0) + (flashTaken ? P(cfg.flash.price) : 0);
    const draw = () => {
      $("#shelf", m).innerHTML = shelf.map((it) => `<button class="item ${cart.has(it.key) ? "in" : ""}" data-k="${it.key}">
        ${it.tag ? `<span class="tag">${it.tag}</span>` : ""}<span class="ic">${it.icon}</span><span class="nm">${it.name}</span>${it.op ? `<span class="op">${it.op}</span>` : ""}
        <span class="pr num">${it.price} ${R}</span>${it.unit ? `<span class="un">${it.unit}</span>` : ""}</button>`).join("");
      const have = new Set([...cart.values()].filter((x) => x.kind === "need").map((x) => x.need));
      $$("#lst li", m).forEach((li) => li.classList.toggle("done", have.has(li.dataset.n)));
      $("#ci", m).innerHTML = [...cart.values()].map((x) => `<button data-r="${x.key}" aria-label="أزل ${x.name}">${x.icon} ✕</button>`).join("") + (flashTaken ? `<span class="chip">🍬×3</span>` : "");
      const t = total();
      $("#tot", m).className = "total" + (t > budget ? " over" : "");
      $("#tot", m).innerHTML = `<span>المجموع</span><span>${money(t)} / ${money(budget)}</span>`;
      $$("[data-k]", m).forEach((b) => (b.onclick = () => toggle(b.dataset.k, b)));
      $$("[data-r]", m).forEach((b) => (b.onclick = () => { cart.delete(b.dataset.r); sfx.tap(); draw(); }));
    };
    const toggle = (k, btn) => {
      if (ended) return;
      const it = items.find((x) => x.key === k);
      if (cart.has(k)) { cart.delete(k); sfx.tap(); draw(); return; }
      if (it.kind === "need") for (const [ck, cv] of cart) if (cv.kind === "need" && cv.need === it.need) { cart.delete(ck); say(`استبدلت ${it.name} بالخيار الآخر. قارنت السعر لكل وحدة؟`); }
      cart.set(k, it); sfx.coin(); fly(btn, $("#tot", m), it.icon);
      if (it.kind === "tempt") say(["هل هذا في قائمتك؟ 🤔", "العروض اللامعة تحب جيبك!", "حاجة أم رغبة؟"][(Math.random() * 3) | 0]);
      if (total() > budget) say("انتبه! المجموع أكبر من المال الذي معك.");
      draw();
    };
    const tm = countdown(cfg.seconds, (f, s) => {
      $("#tb", m).style.transform = `scaleX(${f})`;
      const el = $("#sec", m); if (el.textContent != s) { el.textContent = s; if (s <= 10) sfx.tick(); }
      if (!flashShown && f < 0.6) { flashShown = true; flash(); }
    }, () => checkout(true));
    const flash = () => {
      tm.pause(); sfx.unlock();
      const fm = modal(`<div class="big-ic">⚡🍬</div><h2 class="title-l">${cfg.flash.text}</h2><p class="num" style="font-size:28px">${P(cfg.flash.price)} ${R}</p><div class="timer" style="width:100%"><i id="ftb"></i></div><div class="row" style="justify-content:center"><button class="btn coral" id="fy">أريد العرض!</button><button class="btn ghost" id="fn">لا، شكرًا</button></div>`, "flash");
      const ft = countdown(cfg.flash.seconds, (f) => { const e = $("#ftb", fm); if (e) e.style.transform = `scaleX(${f})`; }, () => close(false));
      const close = (yes) => { ft.stop(); flashTaken = yes; closeModal(); tm.resume(); draw(); yes ? (sfx.coin(), say("اشتريت العرض… هل كانت الحلوى في قائمتك؟")) : (sfx.good(), say("قرار قوي! العرض الخاطف مصمم ليجعلك تشتري بسرعة.")); };
      $("#fy", fm).onclick = () => close(true); $("#fn", fm).onclick = () => close(false);
    };
    const checkout = (timeout) => {
      if (ended) return;
      if (!timeout && total() > budget) { sfx.bad(); say("المبلغ لا يكفي! أزل شيئًا من السلة."); $("#tot", m).animate([{ transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "none" }], { duration: 300 }); return; }
      ended = true; tm.stop();
      let forced = false;
      if (total() > budget) { // انتهى الوقت والمبلغ أكبر: نُعيد الأغلى أولًا
        forced = true; flashTaken = false;
        const sorted = [...cart.values()].sort((a, b) => (a.kind === "tempt" ? -1 : 1) - (b.kind === "tempt" ? -1 : 1) || b.price - a.price);
        for (const it of sorted) { if (total() <= budget) break; cart.delete(it.key); }
      }
      const got = [...cart.values()], needs = got.filter((x) => x.kind === "need"), tempts = got.filter((x) => x.kind === "tempt");
      const covered = new Set(needs.map((x) => x.need)).size, bestN = needs.filter((x) => x.best).length;
      const t = tempts.length + (flashTaken ? 1 : 0);
      const pPri = (covered / cfg.needs.length) * 4, pDec = (bestN / cfg.needs.length) * 4, pImp = [3, 2, 1, 0][Math.min(3, t)], pFl = flashTaken ? 0 : 2, pBud = forced ? 0 : 2;
      addSkill("priorities", pPri, 4); addSkill("decision", pDec, 4); addSkill("impulse", pImp + pFl, 5); addSkill("budget", pBud, 2);
      const spentNeeds = needs.reduce((a, b) => a + b.price, 0), spentImp = tempts.reduce((a, b) => a + b.price, 0) + (flashTaken ? P(cfg.flash.price) : 0);
      S.cash -= spentNeeds + spentImp; S.spend.needs += spentNeeds; S.spend.impulse += spentImp;
      log(2, `اشتريت ${covered} من ${cfg.needs.length} احتياجات، و ${t} مشتريات غير مخطط لها`, covered === cfg.needs.length && t === 0);
      const lines = [
        [covered === cfg.needs.length ? "good" : "bad", covered === cfg.needs.length ? "📝 اشتريت كل ما في القائمة. هذه هي الحاجات!" : `📝 نقصك ${cfg.needs.length - covered} من احتياجات القائمة${budget < P(42) ? "، لأن مبلغ الأساسيات لم يكفِ. تذكّر هذا عند التوزيع القادم." : "."}`],
        [bestN >= 4 ? "good" : bestN >= 2 ? "mid" : "bad", `⚖️ اخترت الأوفر في ${bestN} من ${cfg.needs.length}. السعر لكل وحدة يكشف الأوفر، لا السعر على الملصق.`],
        [t === 0 ? "good" : t === 1 ? "mid" : "bad", t === 0 ? "🛡️ لم تقع في فخ أي عرض لامع. ممتاز!" : `🍬 اشتريت ${t} من الأشياء غير المخطط لها بـ ${spentImp} ${R}. هذه رغبات وليست حاجات.`],
        [forced ? "bad" : "good", forced ? "⏰ انتهى الوقت والمبلغ أكبر من محفظتك، فأعاد الكاشير بعض الأشياء." : `💵 دفعت ${spentNeeds + spentImp} ${R} وبقي معك ${Math.round(S.cash)} ${R}.`],
      ];
      later(() => finish(2, (pPri + pDec + pImp + pFl + pBud) / 15, "shopper", lines, before), 250);
    };
    $("#pay", m).onclick = () => checkout(false);
    draw();
    say(`معك ${Math.round(budget)} ${R}. اشترِ كل ما في القائمة قبل نهاية الوقت، وقارن السعر لكل وحدة!`, 0);
  }

  /* ================= المحطة 3: مدير البيت ================= */
  function st3() {
    const before = wallet(), cfg = C.home, budget = P(cfg.budget);
    const cards = shuffle(cfg.cards);
    let i = 0, paid = 0, correct = 0, busy = false;
    const m = view(`
      <section class="card" style="display:flex;flex-direction:column;gap:10px">
        <div class="qhead"><span class="eyebrow">المحطة 3 · مدير البيت ليوم</span><span id="cnt"></span></div>
        <div class="meter"><div class="qhead" style="font-size:15px"><span>💼 ميزانية البيت</span><span id="bm"></span></div><div class="bar"><i id="bi"></i></div></div>
      </section>
      <section style="display:flex;flex-direction:column;gap:14px">
        <div class="timer"><i id="tb"></i></div>
        <div id="slot" style="min-height:220px"></div>
        <div class="bins">${cfg.bins.map((b) => `<button class="bin ${b.id}" data-b="${b.id}"><span class="ic">${b.icon}</span>${b.name}</button>`).join("")}</div>
        <div id="fb" aria-live="polite"></div>
      </section>`);
    const meter = () => {
      $("#bm", m).innerHTML = `${money(paid)} / ${money(budget)}`;
      const bi = $("#bi", m); bi.style.width = Math.min(100, (paid / budget) * 100) + "%"; bi.classList.toggle("over", paid > budget);
      $("#cnt", m).textContent = `${Math.min(i + 1, cards.length)} / ${cards.length}`;
    };
    let tm;
    const deal = () => {
      if (i >= cards.length) return surprise();
      const c = cards[i]; busy = false; meter();
      $("#slot", m).innerHTML = `<div class="bill" id="bill"><span class="ic">${c.icon}</span><h3 class="title-m">${c.name}</h3><span class="pr num">${P(c.price)} ${R}</span></div>`;
      $("#fb", m).innerHTML = "";
      tm = countdown(cfg.cardSeconds, (f) => ($("#tb", m).style.transform = `scaleX(${f})`), () => pick(null));
    };
    const pick = (bin) => {
      if (busy) return; busy = true; tm && tm.stop();
      const c = cards[i], ok = bin && c.ok.includes(bin);
      if (ok) correct++;
      if (bin === "now") paid += P(c.price);
      ok ? sfx.good() : sfx.bad();
      const bill = $("#bill", m); if (bill && bin) bill.classList.add("out-" + bin);
      $("#fb", m).innerHTML = `<div class="feedback ${ok ? "good" : "bad"}">${ok ? "✔ صحيح! " : bin ? "✖ ليس الأفضل. " : "⏰ انتهى الوقت! "}${c.why}</div>`;
      meter(); i++;
      later(deal, ok ? 1500 : 2600);
    };
    $$("[data-b]", m).forEach((b) => (b.onclick = () => pick(b.dataset.b)));
    const surprise = () => {
      const sp = cfg.surprise; sfx.unlock();
      const mm = modal(`<div class="big-ic">⚡😮</div><h2 class="title-m">مفاجأة!</h2><p style="font-size:18px">${sp.text}</p><div class="choices">${sp.options.map((o, j) => `<button class="choice" data-o="${j}"><span class="k">${"أبج"[j]}</span>${o.text}</button>`).join("")}</div><div id="sfb" style="width:100%"></div>`);
      $$("[data-o]", mm).forEach((b) => (b.onclick = () => {
        const o = sp.options[+b.dataset.o];
        $$("[data-o]", mm).forEach((x) => (x.disabled = true)); b.classList.add(o.score === 2 ? "good" : "bad");
        if (o.pay) paid += P(sp.cost);
        o.score === 2 ? sfx.good() : sfx.bad();
        addSkill("decision", o.score, 2);
        log(3, `فاتورة مفاجئة: ${o.text}`, o.score === 2);
        $("#sfb", mm).innerHTML = `<div class="feedback ${o.score === 2 ? "good" : o.score ? "mid" : "bad"}">${o.feedback}</div><button class="btn gold" id="sx" style="margin-top:10px">متابعة</button>`;
        $("#sx", mm).onclick = () => { closeModal(); end(o.score); };
      }));
    };
    const end = (sScore) => {
      const leftover = budget - paid;
      const reward = leftover > 0 ? Math.round(leftover * cfg.rewardRate) : 0;
      S.save += reward;
      const pPri = (correct / cards.length) * 6, pBud = leftover >= 0 ? 2 : 0;
      addSkill("priorities", pPri, 6); addSkill("budget", pBud, 2);
      log(3, `رتبت ${correct} من ${cards.length} فواتير بشكل صحيح`, correct >= 7);
      const lines = [
        [correct >= 7 ? "good" : correct >= 5 ? "mid" : "bad", `🗂️ رتّبت ${correct} من ${cards.length} فواتير ترتيبًا صحيحًا.`],
        [leftover >= 0 ? "good" : "bad", leftover >= 0 ? `💼 بقي من ميزانية البيت ${leftover} ${R}.` : `💼 تجاوزت ميزانية البيت بـ ${-leftover} ${R}. الدفع لكل شيء الآن يُفرغ الميزانية.`],
        reward ? ["good", `🎁 أسرتك فرحت بحسن إدارتك وأهدتك ربع الوفر: ${reward} ${R} في حصالتك!`] : ["mid", "🎁 لا يوجد وفر هذه المرة، فلا مكافأة من الأسرة."],
      ];
      finish(3, (pPri + pBud + sScore) / 10, "manager", lines, before);
    };
    deal();
    say("لكل فاتورة 10 ثوانٍ. الأهم فالمهم: ما الذي لا يمكن للبيت أن يستغني عنه؟", 0);
  }

  /* ================= المحطة 4: الأسابيع الأربعة ================= */
  function st4() {
    const before = wallet(), cfg = C.weeks, gp = P(goal().price);
    let auto = false, w = 0;
    const m = view(`
      <section class="card" style="display:flex;flex-direction:column;gap:12px">
        <div class="qhead"><span class="eyebrow">المحطة 4 · تحدي الأسابيع الأربعة</span><div class="weekdots" id="wd"></div></div>
        <div class="stairs" id="stairs"></div>
      </section>
      <section class="card" id="stage" style="display:flex;flex-direction:column;gap:12px"></section>`);
    const stairs = () => {
      const lvl = Math.min(5, Math.floor((S.save / gp) * 5));
      $("#stairs", m).innerHTML = [1, 2, 3, 4, 5].map((n) => `<div class="step ${n === 5 ? "goal" : ""} ${n > lvl ? "dim" : ""}" style="height:${n * 19}%">${n === 5 ? goal().icon : n * 20 + "٪"}${n === Math.max(1, lvl) ? `<span class="who">${avatar()}</span>` : ""}</div>`).join("");
      $("#wd", m).innerHTML = [0, 1, 2, 3].map((n) => `<i class="${n < w ? "on" : n === w ? "cur" : ""}"></i>`).join("");
    };
    const stage = (h) => { const st = $("#stage", m); st.innerHTML = h; return st; };
    const start = () => {
      const st = stage(`<h2 class="title-m">قبل أن نبدأ: هل ${g("تريد", "تريدين")} تفعيل الادخار التلقائي؟</h2>
        <button class="toggle" id="tg" aria-pressed="false"><span>💡 «ادفع لنفسك أولًا»: يذهب ${cfg.autoSaveRate * 100}٪ من كل مصروف أسبوعي إلى الحصالة مباشرة</span><span class="sw"></span></button>
        <button class="btn gold big" id="go" style="align-self:center">ابدأ الأسبوع الأول ▶</button>`);
      $("#tg", st).onclick = (e) => { auto = !auto; e.currentTarget.setAttribute("aria-pressed", auto); sfx.tap(); say(auto ? "اختيار المحترفين! المال الذي لا تراه لا تصرفه." : "تمام، ستقرر بنفسك كل أسبوع."); };
      $("#go", st).onclick = () => { addSkill("saving", auto ? 2 : 0, 2); log(4, auto ? "فعّلت الادخار التلقائي" : "لم تفعّل الادخار التلقائي", auto); week(); };
    };
    const pay = (amount) => { // من النقد أولًا ثم الحصالة
      const fromCash = Math.min(S.cash, amount), rest = amount - fromCash;
      S.cash -= fromCash; const fromSave = Math.min(S.save, rest); S.save -= fromSave;
      const unpaid = rest - fromSave; if (unpaid > 0) S.debt += unpaid;
      return fromSave;
    };
    const week = () => {
      stairs();
      const a = P(cfg.allowance), toSave = auto ? Math.round(a * cfg.autoSaveRate) : 0;
      S.save += toSave; S.cash += a - toSave; refreshHud(["cash", "save"]); sfx.coin();
      const ev = cfg.events[w];
      const st = stage(`<p class="eyebrow">الأسبوع ${w + 1} · وصل مصروفك: ${money(a)}${toSave ? ` (ذهب ${toSave} للحصالة تلقائيًا)` : ""}</p>
        <div class="row"><span style="font-size:58px;line-height:1">${ev.icon}</span><div style="min-width:0;flex:1"><h2 class="title-m">${ev.title}</h2><p style="font-size:18px">${ev.text.replace(/\d+ ريال/g, (x) => P(parseInt(x)) + " ريال")}</p></div></div>
        <div class="choices">${ev.options.map((o, j) => { const c = P(o.cost || o.fromSave || o.debt || 0); return `<button class="choice" data-o="${j}"><span class="k">${"أبج"[j]}</span>${o.text}${c ? `<span class="cost">−${c}</span>` : o.toSave ? `<span class="cost" style="color:var(--green)">+${P(o.toSave)} 🐷</span>` : ""}</button>`; }).join("")}</div>
        <div id="wfb"></div>`);
      $$("[data-o]", st).forEach((b) => (b.onclick = () => {
        const o = ev.options[+b.dataset.o];
        $$("[data-o]", st).forEach((x) => (x.disabled = true)); b.classList.add(o.score >= 1.5 ? "good" : "bad");
        let note = "";
        if (o.cost) { const fs = pay(P(o.cost)); if (fs) note = ` (أخذت ${fs} ${R} من الحصالة لأن النقد لم يكفِ)`; }
        if (o.fromSave) { const v = P(o.fromSave), fs = Math.min(S.save, v); S.save -= fs; if (v > fs) pay(v - fs); S.spend.impulse += v; }
        if (o.toSave) S.save += P(o.toSave);
        if (o.toCash) S.cash += P(o.toCash);
        if (o.spendGift) S.spend.impulse += P(ev.gift);
        if (o.debt) S.debt += P(o.debt);
        if (o.cost && ev.skill === "impulse") S.spend.impulse += P(o.cost); else if (o.cost) S.spend.fun += P(o.cost);
        addSkill(ev.skill, o.score, 2);
        log(4, `${ev.title}: ${o.text}`, o.score >= 1.5);
        o.score >= 1.5 ? sfx.good() : sfx.bad();
        if (o.toSave) floatNum(b, "+" + P(o.toSave) + " 🐷");
        refreshHud(["cash", "save"]); stairs();
        $("#wfb", st).innerHTML = `<div class="feedback ${o.score >= 1.5 ? "good" : o.score ? "mid" : "bad"}">${o.feedback}${note}</div><button class="btn gold" id="wn" style="margin-top:10px">${w < 3 ? "الأسبوع التالي ▶" : "نهاية الشهر ▶"}</button>`;
        $("#wn", st).onclick = () => { w++; w < 4 ? week() : wrap(); };
      }));
      say(["أسبوع جديد ومصروف جديد! ماذا ستفعل؟", "انتبه للعدّاد… هل هو حقيقي أم حيلة؟", "هدية! فرصة ذهبية لهدفك.", "«آخر قطعة» من أشهر حيل البيع!"][w], 0);
    };
    const wrap = () => {
      stairs();
      const c = Math.round(S.cash);
      const st = stage(`<h2 class="title-m">انتهى الشهر! بقي معك ${money(c)} نقدًا.</h2><p>كم ${g("تحوّل", "تحوّلين")} منها إلى حصالة الهدف؟</p>
        <div class="row">${[["all", "الكل 🐷"], ["half", "النصف"], ["none", "لا شيء"]].map(([k, t]) => `<button class="btn ${k === "all" ? "gold" : "ghost"}" data-t="${k}" ${!c && k !== "none" ? "disabled" : ""}>${t}</button>`).join("")}</div>`);
      $$("[data-t]", st).forEach((b) => (b.onclick = () => {
        const k = b.dataset.t, amt = k === "all" ? c : k === "half" ? Math.round(c / 2) : 0;
        S.cash -= amt; S.save += amt;
        const pT = !c ? 2 : k === "all" ? 2 : k === "half" ? 1 : 0;
        addSkill("saving", pT, 2); if (amt) { sfx.coin(); floatNum(b, "+" + amt + " 🐷"); }
        const reached = S.save >= gp;
        const lines = [
          [auto ? "good" : "mid", auto ? "⚙️ الادخار التلقائي عمل لصالحك كل أسبوع دون جهد." : "⚙️ جرّب الادخار التلقائي مستقبلًا؛ يجعل الادخار عادة لا قرارًا."],
          ...S.log.filter((l) => l.st === 4).slice(1).map((l) => [l.good ? "good" : "bad", (l.good ? "✔ " : "✖ ") + l.text]),
          [reached ? "good" : "mid", reached ? `🏆 وصلت إلى هدفك: ${goal().name}! حافظ عليه في المحطات القادمة.` : `🎯 حصالتك الآن ${Math.round(S.save)} من ${gp} ${R}.`],
        ];
        later(() => finish(4, pctOf4(), "saver", lines, before), 400);
      }));
    };
    const s0 = { saving: [...S.skills.saving], impulse: [...S.skills.impulse], decision: [...S.skills.decision] };
    const pctOf4 = () => { let a = 0, b = 0; ["saving", "impulse", "decision"].forEach((k) => { a += S.skills[k][0] - s0[k][0]; b += S.skills[k][1] - s0[k][1]; }); return b ? a / b : 0; };
    stairs(); start();
    say(`كل درجة تقربك من ${goal().icon}. الحصالة الآن ${Math.round(S.save)} من ${gp}.`, 0);
  }

  /* ================= المحطة 5: عجلة المفاجآت ================= */
  function st5() {
    const before = wallet(), segs = C.emergencies, cols = ["#1fb1ac", "#f6c443", "#ee6464", "#1b2d66", "#36b871", "#7cc4ef"];
    let round = 0, rot = 0, used = new Set(), aSum = 0, bSum = 0;
    const m = view(`
      <section class="card center" style="display:flex;flex-direction:column;gap:12px">
        <p class="eyebrow">المحطة 5 · عجلة المفاجآت · الجولة <span id="rn">1</span> من 2</p>
        <div class="wheel-wrap"><span class="wheel-pin">🔻</span><canvas id="wh" width="600" height="600"></canvas><span class="wheel-hub">?</span></div>
        <button class="btn gold big" id="spin">أدر العجلة 🎡</button>
      </section>
      <section class="card" id="stage" style="display:none;flex-direction:column;gap:12px"></section>`);
    const cv = $("#wh", m), ctx = cv.getContext("2d"), n = segs.length, arc = (Math.PI * 2) / n;
    segs.forEach((s, i) => {
      ctx.beginPath(); ctx.moveTo(300, 300); ctx.arc(300, 300, 296, i * arc - Math.PI / 2, (i + 1) * arc - Math.PI / 2); ctx.closePath();
      ctx.fillStyle = cols[i]; ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 8; ctx.stroke();
      ctx.save(); ctx.translate(300, 300); ctx.rotate(i * arc + arc / 2 - Math.PI / 2); ctx.font = "70px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(s.icon, 200, 0); ctx.restore();
    });
    const spinBtn = $("#spin", m);
    spinBtn.onclick = () => {
      spinBtn.disabled = true;
      const choices = segs.map((_, i) => i).filter((i) => !used.has(i)), k = choices[(Math.random() * choices.length) | 0]; used.add(k);
      const target = 360 - (k * 360) / n - 360 / n / 2; // اجعل منتصف القطاع تحت المؤشر
      rot = rot - (rot % 360) + 360 * 6 + target;
      cv.style.transform = `rotate(${rot}deg)`;
      let ticks = 0; const tk = setInterval(() => { sfx.tick(); if (++ticks > 26) clearInterval(tk); }, 140); timers.push(() => clearInterval(tk));
      later(() => event(segs[k]), reduced ? 100 : 4100);
    };
    const stg = (h) => { const st = $("#stage", m); st.style.display = "flex"; st.innerHTML = h; st.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" }); return st; };
    const event = (e) => {
      sfx.bad();
      const base = P(e.cost);
      const st = stg(`<div class="row"><span style="font-size:60px;line-height:1">${e.icon}</span><div style="flex:1;min-width:0"><p class="eyebrow">طوارئ!</p><h2 class="title-m">${e.name}</h2><p>تكلفة الإصلاح: ${money(base)} · صندوق طوارئك: ${money(S.emer)}</p></div></div>
        <h3 class="title-m">كيف ${g("ستحل", "ستحلين")} المشكلة؟</h3>
        <div class="choices">${C.emergencySolve.map((o, j) => `<button class="choice" data-o="${j}"><span class="k">${"أبج"[j]}</span>${o.text}${o.mult ? `<span class="cost">${Math.round(base * o.mult)} ${R}</span>` : ""}</button>`).join("")}</div><div id="efb"></div>`);
      $$("[data-o]", st).forEach((b) => (b.onclick = () => {
        const o = C.emergencySolve[+b.dataset.o];
        $$("[data-o]", st).forEach((x) => (x.disabled = true)); b.classList.add(o.score === 2 ? "good" : "bad");
        addSkill("decision", o.score, 2); aSum += o.score;
        o.score === 2 ? sfx.good() : sfx.bad();
        const cost = o.id === "ignore" ? Math.round(base * 1.5) : Math.round(base * o.mult);
        log(5, `${e.name}: ${o.text}`, o.score === 2);
        $("#efb", st).innerHTML = `<div class="feedback ${o.score === 2 ? "good" : o.score ? "mid" : "bad"}">${o.feedback}${o.id === "ignore" ? ` صارت التكلفة ${cost} ${R}.` : ""}</div><button class="btn gold" id="en" style="margin-top:10px">ادفع ${cost} ${R} ▶</button>`;
        $("#en", st).onclick = () => paySource(e, cost);
      }));
      say(S.emer >= base ? "صندوق طوارئك يكفي! هذا هو سبب وجوده." : S.emer > 0 ? "صندوق الطوارئ لا يكفي كاملًا… لكنه سيخفف الضربة." : "صندوق الطوارئ فارغ 😟 من أين ستدفع؟", 0);
    };
    const paySource = (e, cost) => {
      const opts = [
        { id: "emer", text: `من صندوق الطوارئ (${Math.round(S.emer)} ${R})`, ok: S.emer > 0 },
        { id: "save", text: `من حصالة الهدف (${Math.round(S.save)} ${R})`, ok: S.save > 0 },
        { id: "borrow", text: "أقترض من صديق", ok: true },
      ];
      const st = stg(`<h3 class="title-m">من أين ${g("تدفع", "تدفعين")} ${money(cost)}؟</h3><div class="choices">${opts.map((o, j) => `<button class="choice" data-p="${o.id}" ${o.ok ? "" : "disabled"}><span class="k">${"أبج"[j]}</span>${o.text}</button>`).join("")}</div><div id="pfb"></div>`);
      $$("[data-p]", st).forEach((b) => (b.onclick = () => {
        $$("[data-p]", st).forEach((x) => (x.disabled = true));
        let sc, msg, rest = cost;
        if (b.dataset.p === "emer") {
          const u = Math.min(S.emer, rest); S.emer -= u; rest -= u;
          if (rest > 0) { const v = Math.min(S.save, rest); S.save -= v; rest -= v; if (rest > 0) S.debt += rest; sc = 1.5; msg = `غطّى صندوق الطوارئ ${u} ${R}، والباقي خرج من حصالتك${S.debt ? " ودَين" : ""}. صندوق أكبر كان سيحميك أكثر.`; }
          else { sc = 2; msg = "صندوق الطوارئ أنقذ الموقف، وهدفك لم يتأثر! 🛟"; }
        } else if (b.dataset.p === "save") {
          const v = Math.min(S.save, rest); S.save -= v; rest -= v; if (rest > 0) S.debt += rest; sc = S.emer > 0 ? 0.5 : 1; msg = S.emer > 0 ? "كان معك صندوق طوارئ، لكنك أخذت من هدفك! الصندوق موجود لهذه اللحظة." : "حللت المشكلة، لكن هدفك ابتعد. صندوق الطوارئ يحمي أحلامك.";
        } else { S.debt += cost; sc = 0.5; msg = "الاقتراض حل مؤقت، وستعيد المبلغ من مصروفك القادم."; }
        addSkill("emergency", sc, 2); bSum += sc;
        sc >= 1.5 ? sfx.good() : sfx.bad(); refreshHud(["emer", "save"]);
        $("#pfb", st).innerHTML = `<div class="feedback ${sc >= 1.5 ? "good" : sc >= 1 ? "mid" : "bad"}">${msg}</div><button class="btn gold" id="pn" style="margin-top:10px">${round === 0 ? "الجولة الثانية 🎡" : "متابعة ▶"}</button>`;
        $("#pn", st).onclick = () => { round++; if (round < 2) { $("#rn", m).textContent = 2; $("#stage", m).style.display = "none"; spinBtn.disabled = false; window.scrollTo({ top: 0, behavior: "smooth" }); say("استعد… العجلة لم تنتهِ بعد!"); } else refill(); };
      }));
    };
    const refill = () => {
      const amt = P(20), can = S.cash + S.save >= amt;
      const st = stg(`<div class="big-ic" style="font-size:56px;text-align:center">🛟</div><h3 class="title-m">نجوت من المفاجآت! هل ${g("تعيد", "تعيدين")} تعبئة صندوق الطوارئ بـ ${money(amt)} لتكون ${g("جاهزًا", "جاهزة")} للمرة القادمة؟</h3>
        <div class="row"><button class="btn gold" id="ry" ${can ? "" : "disabled"}>نعم، أعبّئه</button><button class="btn ghost" id="rn2">لا</button></div>`);
      const done = (yes) => {
        if (yes) { const c = Math.min(S.cash, amt); S.cash -= c; S.save -= amt - c; S.emer += amt; sfx.coin(); }
        addSkill("emergency", yes ? 1 : 0, 1);
        log(5, yes ? "أعدت تعبئة صندوق الطوارئ" : "لم تعِد تعبئة صندوق الطوارئ", yes);
        const lines = [
          [aSum >= 3 ? "good" : "mid", `🧠 قرارات الحل: ${aSum >= 3 ? "اخترت الحلول العملية بتكلفة معقولة." : "الحل الأغلى أو التجاهل يكلفان أكثر في النهاية."}`],
          [bSum >= 3 ? "good" : bSum >= 2 ? "mid" : "bad", bSum >= 3 ? "🛟 صندوق الطوارئ حمى هدفك. هذه قوة التخطيط!" : "🛟 حين يكون صندوق الطوارئ صغيرًا تدفع أحلامك الثمن. خصص عُشر مصروفك للطوارئ."],
          [yes ? "good" : "mid", yes ? "🔁 أعدت بناء الاحتياطي. عادة المدبّرين!" : "🔁 صندوق الطوارئ يحتاج إعادة تعبئة بعد كل استخدام."],
        ];
        finish(5, (aSum + bSum + (yes ? 1 : 0)) / 9, "ready", lines, before);
      };
      $("#ry", st).onclick = () => done(true); $("#rn2", st).onclick = () => done(false);
    };
    say(`صندوق طوارئك فيه ${Math.round(S.emer)} ${R}. أدر العجلة!`, 0);
  }

  /* ================= المحطة 6: صائد الاحتيال ================= */
  function st6() {
    const before = wallet(), cfg = C.fraud;
    const scams = shuffle(cfg.messages.filter((x) => x.scam)), safes = shuffle(cfg.messages.filter((x) => !x.scam));
    const msgs = shuffle([...scams.slice(0, cfg.rounds - 3), ...safes.slice(0, 3)]);
    let i = 0, correct = 0, combo = 0, best = 0;
    const m = view(`
      <section class="card" style="display:flex;flex-direction:column;gap:8px">
        <div class="qhead"><span class="eyebrow">المحطة 6 · صائد الاحتيال</span><span id="cnt"></span></div>
        <div class="timer"><i id="tb"></i></div>
        <div class="combo" id="cb"></div>
      </section>
      <div class="phone"><div class="notch"></div><div class="scr" id="scr"></div></div>
      <div class="verdict" id="vd"><button class="btn" id="safe" style="--c:var(--green);--cd:#23874f">✅ آمنة</button><button class="btn coral" id="scam">🚫 احتيال</button></div>
      <div id="fb" style="max-width:520px;width:100%;margin:0 auto" aria-live="polite"></div>`);
    let tm, busy = false;
    const next = () => {
      if (i >= msgs.length) return flags();
      busy = false; const x = msgs[i];
      $("#cnt", m).textContent = `${i + 1} / ${msgs.length}`;
      $("#scr", m).innerHTML = `<div class="msg" id="mg"><div class="from">💬 ${x.from}</div><div class="tx">${x.text}</div></div>`;
      $("#fb", m).innerHTML = "";
      tm = countdown(cfg.seconds, (f) => ($("#tb", m).style.transform = `scaleX(${f})`), () => judge(null));
    };
    const judge = (saidScam) => {
      if (busy) return; busy = true; tm.stop();
      const x = msgs[i], ok = saidScam === x.scam;
      if (ok) { correct++; combo++; best = Math.max(best, combo); const bonus = combo * 5; S.xp += bonus; sfx.good(); floatNum($("#mg", m), `+${bonus} ⭐`); refreshHud(["xp"]); }
      else { combo = 0; sfx.bad(); $("#mg", m).classList.add("shake"); }
      const cb = $("#cb", m); cb.textContent = combo >= 2 ? `🔥 سلسلة ×${combo}` : ""; cb.classList.remove("go"); void cb.offsetWidth; cb.classList.add("go");
      $("#fb", m).innerHTML = `<div class="feedback ${ok ? "good" : "bad"}">${ok ? "✔ " : saidScam === null ? "⏰ " : "✖ "}${x.scam ? "احتيال: " : "آمنة: "}${x.why}</div>`;
      i++; later(next, ok ? 1900 : 3000);
    };
    $("#safe", m).onclick = () => judge(false); $("#scam", m).onclick = () => judge(true);
    const flags = () => {
      $("#vd", m).style.display = "none"; $("#cnt", m).textContent = "جولة المحقق"; $("#tb", m).style.transform = "scaleX(0)"; $("#cb", m).textContent = "";
      const parts = cfg.flags.parts, mark = new Set();
      $("#scr", m).innerHTML = `<div class="msg"><div class="from">🕵️ ${cfg.flags.intro}</div><div class="flagmsg" id="fm">${parts.map((p, j) => `<button data-f="${j}">${p.text}</button>`).join("")}</div></div>`;
      $("#fb", m).innerHTML = `<button class="btn gold" id="chk" style="width:100%">تحقّق من إجاباتي 🔍</button>`;
      say("رسالة واحدة فيها عدة علامات احتيال. اكشفها كلها!", 0);
      $$("[data-f]", m).forEach((b) => (b.onclick = () => { const j = +b.dataset.f; mark.has(j) ? mark.delete(j) : mark.add(j); b.classList.toggle("on"); sfx.tap(); }));
      $("#chk", m).onclick = () => {
        let hits = 0, fp = 0; const total = parts.filter((p) => p.flag).length;
        $$("[data-f]", m).forEach((b) => { const j = +b.dataset.f, p = parts[j]; b.disabled = true; b.classList.remove("on"); if (p.flag && mark.has(j)) { hits++; b.classList.add("hit"); } else if (p.flag) b.classList.add("miss"); else if (mark.has(j)) { fp++; b.classList.add("on"); } });
        const fs = Math.max(0, hits - fp) / total;
        hits === total && !fp ? (sfx.win(), confetti(60)) : sfx.good();
        $("#fb", m).innerHTML = `<div class="feedback ${fs >= 0.75 ? "good" : "mid"}">كشفت ${hits} من ${total} علامات.<br>${parts.filter((p) => p.flag).map((p) => "• " + p.why).join("<br>")}</div><button class="btn gold" id="nx" style="width:100%;margin-top:10px">السؤال الأخير ▶</button>`;
        $("#nx", m).onclick = () => after(fs);
      };
    };
    const after = (fs) => {
      const a = cfg.after;
      const mm = modal(`<div class="big-ic">🆘</div><h2 class="title-m">${a.text}</h2><div class="choices">${a.options.map((o, j) => `<button class="choice" data-o="${j}"><span class="k">${"أبج"[j]}</span>${o.text}</button>`).join("")}</div><div id="afb" style="width:100%"></div>`);
      $$("[data-o]", mm).forEach((b) => (b.onclick = () => {
        const o = a.options[+b.dataset.o]; $$("[data-o]", mm).forEach((x) => (x.disabled = true)); b.classList.add(o.score === 2 ? "good" : "bad");
        o.score === 2 ? sfx.good() : sfx.bad(); addSkill("decision", o.score, 2);
        $("#afb", mm).innerHTML = `<div class="feedback ${o.score === 2 ? "good" : "bad"}">${o.feedback}</div><button class="btn gold" id="ax" style="margin-top:10px">إنهاء المحطة</button>`;
        $("#ax", mm).onclick = () => {
          closeModal();
          const pF = (correct / msgs.length) * 6 + fs * 3;
          addSkill("fraud", pF, 9);
          log(6, `كشفت ${correct} من ${msgs.length} رسائل بشكل صحيح`, correct >= 6);
          const lines = [
            [correct >= 6 ? "good" : correct >= 4 ? "mid" : "bad", `📱 حكمت على ${correct} من ${msgs.length} رسائل بشكل صحيح. أطول سلسلة: ${best} 🔥`],
            [fs >= 0.75 ? "good" : "mid", `🕵️ كشفت ${Math.round(fs * 4)} من 4 علامات احتيال في رسالة واحدة.`],
            ["good", "🔐 القاعدة الذهبية: لا رمز، لا كلمة مرور، لا روابط مجهولة. وأخبر أهلك دائمًا."],
          ];
          finish(6, (pF + o.score) / 11, "shield", lines, before);
        };
      }));
    };
    next();
    say("لكل رسالة 12 ثانية. الإجابات الصحيحة المتتالية تضاعف نجومك! 🔥", 0);
  }

  const GAMES = { 1: st1, 2: st2, 3: st3, 4: st4, 5: st5, 6: st6 };

  /* ================= التقرير ================= */
  function analyze() {
    const sk = SKILLS.map((k) => ({ k, name: C.skills[k].name, tip: C.skills[k].tip, v: skillPct(k) }));
    const overall = Math.round(sk.reduce((a, b) => a + b.v, 0) / sk.length);
    const sorted = [...sk].sort((a, b) => b.v - a.v);
    const strengths = sorted.filter((x) => x.v >= 60).slice(0, 3);
    const weak = [...sk].sort((a, b) => a.v - b.v).filter((x) => x.v < 75).slice(0, 3);
    const level = overall >= 80 ? g("مدبّر محترف", "مدبّرة محترفة") : overall >= 60 ? g("مدبّر صاعد", "مدبّرة صاعدة") : g("مدبّر تحت التدريب", "مدبّرة تحت التدريب");
    const a = S.alloc || { needs: 0, save: 0, emergency: 0, fun: 0 };
    const imp = S.spend.impulse, impPct = skillPct("impulse");
    const pattern = a.save + a.emergency >= 30 && impPct >= 70 ? { t: "متوازن ومخطِّط", d: "يخطط قبل أن يصرف، ويقاوم معظم الإغراءات." }
      : a.fun >= 40 || impPct < 50 ? { t: "يميل إلى الإنفاق السريع", d: "تجذبه العروض والرغبات اللحظية، ويحتاج إلى خطة قبل الشراء." }
      : a.save + a.emergency >= 50 ? { t: "مدّخر حذر", d: "يدخر كثيرًا، ويمكنه أن يسمح لنفسه بقليل من المتعة المخطط لها." }
      : { t: "في طريقه إلى التوازن", d: "يتخذ قرارات جيدة أحيانًا، ويحتاج إلى ثبات في الادخار." };
    const gp = P(goal().price), reached = S.save >= gp;
    const fr = skillPct("fraud");
    const fraudLabel = fr >= 80 ? "وعي عالٍ" : fr >= 55 ? "وعي متوسط" : "يحتاج إلى تدريب";
    return { sk, overall, strengths, weak, level, a, imp, pattern, gp, reached, fr, fraudLabel };
  }
  function ring(v) {
    const r = 50, c = 2 * Math.PI * r;
    return `<svg class="score-ring" viewBox="0 0 120 120"><circle cx="60" cy="60" r="${r}" fill="none" stroke="#eef6fd" stroke-width="12"/><circle cx="60" cy="60" r="${r}" fill="none" stroke="#1fb1ac" stroke-width="12" stroke-linecap="round" stroke-dasharray="${(c * v) / 100} ${c}" transform="rotate(-90 60 60)"/><text x="60" y="68" text-anchor="middle" font-family="Baloo Bhaijaan 2, Cairo, sans-serif" font-size="30" font-weight="800" fill="#1b2d66">${v}٪</text></svg>`;
  }
  function parentText(A) {
    const nm = S.name;
    return [
      `ملخص رحلة «دبّرة» لـ ${nm} (${S.grade})`,
      `المستوى: ${A.level} · النتيجة العامة ${A.overall}٪`,
      `الاختبار: قبل الرحلة ${S.pre}/6، وبعدها ${S.post}/6`,
      `نمط الإنفاق: ${A.pattern.t}. ${A.pattern.d}`,
      `الهدف (${goal().name}): ${A.reached ? "تحقق" : `ادّخر ${Math.round(S.save)} من ${A.gp} ${R}`}`,
      `الوعي بالاحتيال: ${A.fraudLabel} (${A.fr}٪)`,
      A.strengths.length ? `نقاط القوة: ${A.strengths.map((x) => x.name).join("، ")}` : "",
      A.weak.length ? `يحتاج إلى تحسين: ${A.weak.map((x) => x.name).join("، ")}` : "",
      "اقتراحات منزلية:",
      ...C.parentTips.map((t) => "- " + t),
    ].filter(Boolean).join("\n");
  }
  function report(celebrate) {
    S.screen = "report"; persist();
    const A = analyze();
    const colorFor = (v) => (v >= 75 ? "var(--green)" : v >= 50 ? "var(--gold)" : "var(--coral)");
    const segs = [["needs", "أساسيات", "#1b2d66"], ["save", "ادخار", "#1fb1ac"], ["emergency", "طوارئ", "#36b871"], ["fun", "متعة", "#f6c443"]];
    const prePct = Math.round((S.pre / 6) * 100), postPct = Math.round((S.post / 6) * 100);
    const m = view(`
      <section class="card report-head">
        <div class="av">${avatar()}</div>
        <div style="min-width:0">
          <p class="eyebrow">التقرير الشخصي · ${esc(S.grade)}</p>
          <h1 class="title-l">${esc(S.name)}: ${A.level}</h1>
          <p class="muted">أنهيت 6 محطات وجمعت ${S.xp} ⭐ وحصلت على ${S.badges.length} من الأوسمة.</p>
        </div>
        ${ring(A.overall)}
      </section>

      <div class="two">
        <section class="card" style="display:flex;flex-direction:column;gap:12px">
          <h2 class="title-m">قبل الرحلة وبعدها</h2>
          <div class="prepost"><div class="pp"><span class="muted">قبل</span><span class="num">${S.pre}/6</span>${prePct}٪</div><div class="pp after"><span class="muted">بعد</span><span class="num">${S.post}/6</span>${postPct}٪</div></div>
          <p style="font-weight:700">${S.post > S.pre ? `تحسّنت معرفتك بـ ${postPct - prePct} نقطة مئوية 🚀` : S.post === S.pre ? (S.post === 6 ? "حافظت على العلامة الكاملة! 🌟" : "حافظت على مستواك، والتطبيق سيرفعه أكثر.") : "النتيجة البعدية أقل قليلًا؛ راجع النصائح بالأسفل."}</p>
        </section>
        <section class="card" style="display:flex;flex-direction:column;gap:12px">
          <h2 class="title-m">هدفك ${goal().icon}</h2>
          <div class="goalbar" style="font-size:16px"><div class="track"><div class="fill" style="width:${Math.min(100, (S.save / A.gp) * 100)}%"></div></div><span class="num">${Math.round(S.save)} / ${A.gp}</span></div>
          <p style="font-weight:700">${A.reached ? `🏆 حققت هدفك: ${goal().name}!` : `ينقصك ${Math.round(A.gp - S.save)} ${R} للوصول إلى ${goal().name}.`}</p>
          ${S.debt > 0 ? `<p class="feedback bad">عليك دَين بقيمة ${Math.round(S.debt)} ${R}. الدَّين يأكل من مصروفك القادم.</p>` : ""}
        </section>
      </div>

      <section class="card" style="display:flex;flex-direction:column;gap:12px">
        <h2 class="title-m">مهاراتك المالية</h2>
        <div class="skills">${A.sk.map((x) => `<div class="skill"><span>${x.name}</span><div class="bar"><i style="width:0;background:${colorFor(x.v)}" data-w="${x.v}"></i></div><span class="v num">${x.v}٪</span></div>`).join("")}</div>
      </section>

      <div class="two">
        <section class="card" style="display:flex;flex-direction:column;gap:10px">
          <h2 class="title-m">نمط الإنفاق: ${A.pattern.t}</h2>
          <p class="muted">${A.pattern.d}</p>
          <div class="split">${segs.map(([k, n, c]) => (A.a[k] ? `<span style="width:${A.a[k]}%;background:${c};${k === "fun" ? "color:#1b2d66" : ""}">${A.a[k]}٪</span>` : "")).join("")}</div>
          <div class="legend">${segs.map(([k, n, c]) => `<span><i style="background:${c}"></i>${n}</span>`).join("")}</div>
          <p style="font-size:15px">صرفت على الاحتياجات ${money(S.spend.needs)}، وعلى مشتريات غير مخطط لها ${money(A.imp)}.</p>
        </section>
        <section class="card" style="display:flex;flex-direction:column;gap:10px">
          <h2 class="title-m">الوعي بالاحتيال: ${A.fraudLabel}</h2>
          <div class="skill" style="grid-template-columns:minmax(0,1fr) 48px"><div class="bar"><i style="width:${A.fr}%;background:${colorFor(A.fr)}"></i></div><span class="v num">${A.fr}٪</span></div>
          <p class="muted">لا رمز تحقق، ولا كلمة مرور، ولا روابط مجهولة. وعند الشك: أخبر والديك.</p>
          <h3 style="font-size:18px;margin-top:6px">أوسمتك</h3>
          <div class="row">${S.badges.length ? S.badges.map((b) => `<span class="badge" style="animation:none">${C.badges[b].icon} ${C.badges[b].name}</span>`).join("") : `<span class="muted">لم تحصل على أوسمة هذه المرة. العب مرة أخرى!</span>`}</div>
        </section>
      </div>

      <div class="two">
        <section class="card" style="display:flex;flex-direction:column;gap:10px">
          <h2 class="title-m">💪 نقاط قوتك</h2>
          ${A.strengths.length ? `<ul class="tips">${A.strengths.map((x) => `<li>${x.name} (${x.v}٪)</li>`).join("")}</ul>` : `<p class="muted">ستظهر نقاط قوتك مع التدريب. كل محطة خطوة!</p>`}
          <h2 class="title-m" style="margin-top:8px">🎯 ${g("جرّب", "جرّبي")} هذا الأسبوع على مصروفك الحقيقي</h2>
          <ul class="tips">${(A.weak.length ? A.weak : A.sk.slice(0, 2)).map((x) => `<li><b>${x.name}:</b> ${x.tip}</li>`).join("")}</ul>
        </section>
        <section class="card" style="display:flex;flex-direction:column;gap:10px">
          <h2 class="title-m">أبرز قراراتك</h2>
          <ul class="tips" style="list-style:none;padding:0">${S.log.slice(0, 9).map((l) => `<li>${l.good ? "✅" : "⚠️"} ${esc(l.text)}</li>`).join("")}</ul>
        </section>
      </div>

      <section class="card parent" style="display:flex;flex-direction:column;gap:10px">
        <p class="eyebrow">لولي الأمر</p>
        <h2 class="title-m">ملخص مختصر عن ${esc(S.name)}</h2>
        <p>${esc(S.name)} ${g("أنهى", "أنهت")} رحلة دبّرة بمستوى <b>${A.level}</b> (${A.overall}٪). نمط الإنفاق: <b>${A.pattern.t}</b>. ${A.strengths.length ? `${g("يتميز", "تتميز")} في ${A.strengths.map((x) => x.name).join(" و")}.` : ""} ${A.weak.length ? `${g("يحتاج", "تحتاج")} إلى دعم في ${A.weak.map((x) => x.name).join(" و")}.` : ""}</p>
        <h3 style="font-size:18px">اقتراحات منزلية بسيطة</h3>
        <ul class="tips">${C.parentTips.map((t) => `<li>${t}</li>`).join("")}</ul>
        <div class="row noprint"><button class="btn" id="cp">📋 انسخ الملخص</button>${inFrame ? "" : `<button class="btn ghost" id="pr">🖨️ اطبع التقرير</button>`}<span id="cpm" class="muted" role="status"></span></div>
        <textarea id="cpt" class="sr" readonly>${esc(parentText(A))}</textarea>
      </section>

      <div class="row noprint" style="justify-content:center"><button class="btn gold big" id="again">رحلة جديدة 🔁</button></div>`);
    later(() => $$(".skill .bar i[data-w]", m).forEach((el) => (el.style.width = el.dataset.w + "%")), 120);
    $("#cp", m).onclick = () => {
      const t = parentText(A), ok = () => ($("#cpm", m).textContent = "تم النسخ ✔");
      const fallback = () => { const ta = $("#cpt", m); ta.classList.remove("sr"); ta.style.cssText = "width:100%;min-height:160px;font:inherit"; ta.select(); $("#cpm", m).textContent = "حدّد النص وانسخه يدويًا"; };
      try { navigator.clipboard.writeText(t).then(ok, fallback); } catch { fallback(); }
    };
    const pr = $("#pr", m); if (pr) pr.onclick = () => window.print();
    $("#again", m).onclick = () => {
      const cm = modal(`<div class="big-ic">🔁</div><h2 class="title-m">${g("تبدأ", "تبدئين")} رحلة جديدة؟</h2><p>سيُحذف تقريرك الحالي من هذا الجهاز.</p><div class="row" style="justify-content:center"><button class="btn coral" id="y">نعم، ابدأ من جديد</button><button class="btn ghost" id="n">تراجع</button></div>`);
      $("#y", cm).onclick = () => { try { localStorage.removeItem(KEY); } catch {} S = fresh(); closeModal(); setup(); };
      $("#n", cm).onclick = closeModal;
    };
    if (celebrate) { confetti(200); sfx.win(); }
    say(celebrate ? `مبروك يا ${esc(S.name)}! هذا تقريرك. ${A.reached ? "وحققت هدفك أيضًا! 🏆" : "اقتربت من هدفك، وستصل إليه في الواقع!"}` : "هذا تقريرك الشخصي.", 9000);
  }

  /* ================= الإقلاع ================= */
  window.claude?.hot?.snapshot?.(() => ({ S: loadSaved() || S })); // آخر حالة محفوظة، لا منتصف محطة
  const boot = (data) => {
    if (data && data.S) { S = data.S; resume(); return; }
    title();
  };
  window.claude?.hot?.ready ? window.claude.hot.ready(boot) : boot(window.claude?.hot?.data ?? {});
})();
