/* دبّرة — محرك اللعبة. المحتوى كله في content.js */
(() => {
  "use strict";
  const C = window.DABBRA_CONTENT;
  const KEY = "dabbra-save-v2";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const app = $("#app");
  const mascotEl = $("#mascot");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const inFrame = (() => { try { return window.self !== window.top; } catch { return true; } })();

  /* ================= الحالة ================= */
  const SKILLS = Object.keys(C.skills);
  let S = null, W = null;
  function fresh() {
    const skills = {}; SKILLS.forEach((k) => (skills[k] = [0, 0]));
    return { v: 2, pos: null, picked: [], flags: {}, active: null, bought: false, screen: "title", name: "", gender: "m", band: "young", grade: "", goal: null,
      cash: 0, save: 0, emer: 0, debt: 0, xp: 0, done: {}, stars: {}, badges: [], skills,
      pre: null, post: null, alloc: null, spend: { needs: 0, impulse: 0, fun: 0 }, log: [], sound: true, started: Date.now() };
  }
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
  const loadSaved = () => { try { const d = JSON.parse(localStorage.getItem(KEY)); return d && d.v === 2 ? d : null; } catch { return null; } };

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
    const ws = $("#wsay");
    if (ws) { mascotEl.innerHTML = ""; ws.innerHTML = text ? `${MASCOT_SVG}<div class="bubble" role="status">${text}</div>` : ""; if (text) sayTimer = setTimeout(() => (ws.innerHTML = ""), ms || 8000); return; }
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
  function view(html, cls = "") {
    clearTimers(); closeModal();
    if (W) { W.destroy(); W = null; }
    app.innerHTML = hud() + `<main class="screen ${cls}" id="main">${html}</main>`;
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
        <p class="title-m" style="max-width:34ch">تجوّل في الحي بشخصيتك: استلم مصروفك، ادخل البقالة ومحل النت والبنك، وأنجز المهمات لتصل إلى هدفك!</p>
        <div class="mosaic">${C.stations.map((s) => `<img src="${s.img}" alt="${s.title}">`).join("")}</div>
        <div class="row" style="justify-content:center">
          ${canResume ? `<button class="btn gold big" id="resume">${hasReport ? "اعرض تقريري 📊" : "أكمل رحلتك ▶"}</button>` : ""}
          <button class="btn big ${canResume ? "ghost" : "gold"}" id="new">${canResume ? "رحلة جديدة" : "ابدأ الرحلة ▶"}</button>
        </div>
        <p class="muted" style="font-size:14px">حي كامل تتجول فيه · 12 مهمة · تقرير شخصي في النهاية</p>
      </section>`);
    if (canResume) $("#resume", m).onclick = () => { S = saved; sfx.unlock(); resume(); };
    $("#new", m).onclick = () => { S = fresh(); sfx.tap(); setup(); };
    say("أهلًا! أنا <b>سَنَد</b>، مرشدك في رحلة المال. جاهز للمغامرة؟", 0);
  }
  function resume() {
    if (S.screen === "report") return report();
    if (!S.goal) return pickGoal();
    world();
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
        <button class="btn gold big" id="go" style="align-self:center">التالي: اختر هدفك ▶</button>
      </section>`);
    $$("[data-g]", m).forEach((b) => (b.onclick = () => { S.gender = b.dataset.g; $$("[data-g]", m).forEach((x) => x.classList.toggle("on", x === b)); sfx.tap(); }));
    $$("[data-gr]", m).forEach((b) => (b.onclick = () => { S.grade = b.dataset.gr; S.band = b.dataset.b; $$("[data-gr]", m).forEach((x) => x.classList.toggle("on", x === b)); sfx.tap(); }));
    $("#go", m).onclick = () => {
      const nm = $("#nm", m).value.trim();
      if (!nm) { $("#nm", m).focus(); say("اكتب اسمك أولًا حتى أعرف كيف أناديك 😊"); sfx.bad(); return; }
      if (!S.grade) { say("اختر صفك الدراسي لأجهّز لك المواقف المناسبة."); sfx.bad(); return; }
      S.name = nm; persist(); sfx.good(); pickGoal();
    };
    say("اكتب اسمك واختر شخصيتك وصفك. سأجهّز لك رحلة على مقاسك!", 0);
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
      say(`اختيار رائع! ${goal().icon} ${goal().name} ينتظرك في نهاية الطريق. هيا إلى الحي!`);
      later(world, 700);
    }));
    say("اختر هدفًا يحمّسك. الأغلى أصعب… لكن الوصول إليه أمتع!", 0);
  }

  /* ================= إنهاء المحطة ================= */
  function finish(id, pct, badgeKey, lines, before) {
    const stars = pct >= 0.8 ? 3 : pct >= 0.5 ? 2 : 1;
    const s = mission(id);
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
        <p class="eyebrow">أنجزت المهمة · ${s.icon} ${s.title}</p>
        <div class="stars-big">${[1, 2, 3].map((n) => `<span class="${n <= stars ? "" : "off"}" style="animation-delay:${n * 0.18}s">⭐</span>`).join("")}</div>
        <h2 class="title-l">${head}</h2>
        <p class="pill num">+${gained} ⭐</p>
        ${newBadge ? `<span class="badge">${C.badges[badgeKey].icon} وسام جديد: ${C.badges[badgeKey].name}</span>` : ""}
        <div class="deltas">${dl("cash", "💵", "النقد")}${dl("save", "🐷", "الحصالة")}${dl("emer", "🛟", "الطوارئ")}</div>
        <div class="choices" style="max-width:620px">${lines.map((l) => `<div class="feedback ${l[0]}">${l[1]}</div>`).join("")}</div>
        <button class="btn gold big" id="nx">ارجع إلى الحي ▶</button>
      </section>`);
    if (stars >= 2) { confetti(); sfx.win(); } else sfx.good();
    refreshHud(["xp"]);
    $("#nx", m).onclick = () => world();
    say(stars === 3 ? "واو! ثلاث نجوم! أنا فخور بك 🌟" : stars === 2 ? "عمل جميل! في المهمة القادمة يمكنك الوصول لثلاث نجوم." : "لا بأس! كل مهمة تعلمنا شيئًا. تابع!");
  }

  /* ================= المحطة 1: الجِرار ================= */
  function st1() {
    const before = wallet();
    const total = Math.max(S.cash, P(C.income)), v = total / 10;
    S.cash = 0; S.save = 0; S.emer = 0;
    const put = { needs: 0, save: 0, emergency: 0, fun: 0 };
    let left = 10;
    const m = view(`
      <section class="card center" style="display:flex;flex-direction:column;gap:6px">
        <p class="eyebrow">بنك الادخار · مصنع الجِرار</p>
        <h2 class="title-l">معك ${money(total)}. وزّعها!</h2>
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
        [pN >= 2 ? "good" : "bad", pN === 3 ? "🏠 الأساسيات: ممتاز، مبلغ كافٍ لاحتياجاتك." : n < 4 ? "🏠 الأساسيات قليلة! قد لا يكفيك المال في البقالة." : "🏠 الأساسيات أكثر من اللازم قليلًا، كان يمكن ادخار جزء منها."],
        [pS === 3 ? "good" : pS ? "mid" : "bad", pS === 3 ? "🎯 هدفي: رائع! دفعت لنفسك أولًا." : pS ? "🎯 هدفي: بداية، لكن عملة واحدة تجعل الطريق طويلًا." : "🎯 هدفي: لم تدخر شيئًا، والهدف سيبتعد."],
        [pE >= 2 ? "good" : "bad", pE === 3 ? "🛟 الطوارئ: أنت مستعد للمفاجآت." : pE === 2 ? "🛟 الطوارئ: مستعد جدًا، وربما أكثر من اللازم." : "🛟 الطوارئ: فارغة! ستعرف قيمتها عند أول مفاجأة."],
        [pF === 3 ? "good" : "mid", pF === 3 ? "🎈 المتعة: مقدار معقول، استمتع بلا ذنب." : "🎈 المتعة: كبيرة، وهذا يقلل فرصتك في الادخار."],
      ];
      const pct = (pN + pS + pE + pF) / 12;
      later(() => finish("bank", pct, "planner", lines, before), 200);
    };
    draw();
    say(`هذا مصروفك كاملًا: ${total} ${R}. وزّعه على الجِرار قبل أن ${g("تصرف", "تصرفي")} أي شيء!`, 0);
  }

  /* ================= المحطة 3: مدير البيت ================= */
  function st3() {
    const before = wallet(), cfg = C.home, budget = P(cfg.budget);
    const cards = shuffle(cfg.cards);
    let i = 0, paid = 0, correct = 0, busy = false;
    const m = view(`
      <section class="card" style="display:flex;flex-direction:column;gap:10px">
        <div class="qhead"><span class="eyebrow">مركز الفواتير · مدير البيت ليوم</span><span id="cnt"></span></div>
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
      finish("bills", (pPri + pBud + sScore) / 10, "manager", lines, before);
    };
    deal();
    say("لكل فاتورة 10 ثوانٍ. الأهم فالمهم: ما الذي لا يمكن للبيت أن يستغني عنه؟", 0);
  }

  /* ================= المحطة 5: عجلة المفاجآت ================= */
  function st5() {
    const before = wallet(), segs = C.emergencies, cols = ["#1fb1ac", "#f6c443", "#ee6464", "#1b2d66", "#36b871", "#7cc4ef"];
    let round = 0, rot = 0, used = new Set(), aSum = 0, bSum = 0;
    const m = view(`
      <section class="card center" style="display:flex;flex-direction:column;gap:12px">
        <p class="eyebrow">ورشة الإصلاح · عجلة الأعطال · الجولة <span id="rn">1</span> من 2</p>
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
        finish("repair", (aSum + bSum + (yes ? 1 : 0)) / 9, "ready", lines, before);
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
        <div class="qhead"><span class="eyebrow">محل النت · صائد الاحتيال</span><span id="cnt"></span></div>
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
        $("#afb", mm).innerHTML = `<div class="feedback ${o.score === 2 ? "good" : "bad"}">${o.feedback}</div><button class="btn gold" id="ax" style="margin-top:10px">إنهاء المهمة</button>`;
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
          finish("net", (pF + o.score) / 11, "shield", lines, before);
        };
      }));
    };
    next();
    say("لكل رسالة 12 ثانية. الإجابات الصحيحة المتتالية تضاعف نجومك! 🔥", 0);
  }

  /* ================= عالم الحي ================= */
  const TOWN = C.town;
  const BLD = TOWN.buildings.map((b) => ({ ...b, door: { x: b.door, y: b.y + b.h } }));
  const mission = (id) => C.missions.find((m) => m.id === id);
  const mState = (m) => (S.done[m.id] ? "done" : m.hidden && !S.flags[m.id] ? "hidden" : (m.needs || []).every((n) => S.done[n]) ? "open" : "locked");
  const mTarget = (m) => { if (m.npc) { const n = TOWN.npcs.find((x) => x.id === m.npc); return { x: n.x, y: n.y, icon: m.icon }; } const b = BLD.find((x) => x.id === m.place); return { x: b.door.x, y: b.door.y, icon: m.icon }; };
  const mWhere = (m) => { if (m.npc) { const n = TOWN.npcs.find((x) => x.id === m.npc); return `ابحث عن ${n.name} وعليه علامة ${n.bubble}`; } const b = BLD.find((x) => x.id === m.place); return `${b.name}: ${b.hint}`; };
  const FREE = ["grocery", "bills", "friend", "net", "grandma", "shoes", "stranger"];

  function stageHTML(side, hint) {
    return `<div class="world">
      <div class="stage"><canvas id="wc" aria-label="خريطة الحي"></canvas>
        <div class="wsay" id="wsay" aria-live="polite"></div>
        <div class="joy" id="joy" aria-hidden="true"><i></i></div>
        <button class="btn gold act" id="act" hidden></button>
        <div class="keys">${hint}</div>
      </div>
      <aside class="mpanel">${side}</aside>
    </div>`;
  }
  function townTile(x, y) {
    const { cols, rows } = TOWN;
    if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) return "tree";
    if (y === 7 || y === 8 || y === 16 || y === 17) return "road";
    if ((x === 14 || x === 15) && y >= 9 && y <= 15) return "road";
    if (y === 6 || y === 9 || y === 15 || y === 18) return "walk";
    if ((x === 13 || x === 16) && y >= 10 && y <= 14) return "walk";
    if ((x === 9 || x === 10) && (y === 11 || y === 12)) return "water";
    if (y === 1) return x % 3 === 0 ? "flower" : "grass";
    if (y === 10 && (x === 7 || x === 17 || x === 23)) return "tree";
    if (x >= 7 && x <= 12 && y >= 10 && y <= 14) return (x + y) % 4 === 0 ? "flower" : "grass";
    return "grass";
  }

  function world() {
    S.screen = "world"; persist();
    const side = `<canvas id="mm" width="270" height="180" aria-hidden="true"></canvas>
      <div class="dir" id="dir"></div>
      <h3 class="title-m" style="font-size:19px">📋 مهماتي</h3>
      <ol class="mlist" id="ml"></ol>`;
    const m = view(stageHTML(side, "تحرّك بالأسهم أو اضغط على المكان · مسافة للدخول"), "wide");
    const start = S.pos || { x: 2, y: 6 };
    const npcs = TOWN.npcs.map((n) => ({ ...n, bubbleIcon: n.bubble, bubble: null }));
    const actBtn = $("#act", m); let act = null;
    const setAct = (a) => { act = a; actBtn.hidden = !a; if (a) actBtn.textContent = a.label; };
    const near = (n, x, y) => Math.abs(n.x - x) <= 1 && Math.abs(n.y - y) <= 1;
    const ctxAt = (x, y) => {
      const b = BLD.find((b) => b.door.x === x && b.door.y === y);
      if (b) return { label: `ادخل ${b.name} ${b.icon}`, fn: () => enter(b) };
      const n = npcs.find((n) => near(n, x, y) && mState(mission(n.mission)) === "open");
      if (n) return { label: `تحدّث مع ${n.name} 💬`, fn: () => talk(n) };
      return null;
    };
    let tapped = null;
    W = DabbraWorld.create($("#wc", m), {
      cols: TOWN.cols, rows: TOWN.rows, tileAt: townTile, buildings: BLD, persons: npcs, joy: $("#joy", m),
      player: { x: start.x, y: start.y, gender: S.gender },
      pickups: TOWN.stars.map(([x, y], i) => ({ x, y, i })).filter((k) => !S.picked.includes(k.i)),
      zebras: [{ x: 14, y: 7, w: 2, h: 2 }, { x: 14, y: 16, w: 2, h: 2 }, { x: 3, y: 7, w: 1, h: 2, vertical: true }, { x: 25, y: 7, w: 1, h: 2, vertical: true }],
      lines: [[1, 8, 14, 8], [16, 8, 29, 8], [1, 17, 14, 17], [16, 17, 29, 17], [15, 9, 15, 16]],
      decor: [{ type: "fountain", x: 9, y: 11 }, { type: "bench", x: 8, y: 13, w: 2 }, { type: "bench", x: 11, y: 10, w: 2 }, { type: "label", x: 10, y: 14.6, text: "حديقة الحي", bg: "#2e9e60" }, { type: "icon", x: 22, y: 10, icon: "🚲" }, { type: "icon", x: 5, y: 10, icon: "📮" }, { type: "icon", x: 28, y: 1, icon: "🌳", size: 30 }],
      chip: (b) => { const ms = C.missions.filter((x) => x.place === b.id); if (ms.some((x) => mState(x) === "open")) return "❗"; return ms.length && ms.every((x) => S.done[x.id]) ? "✅" : null; },
      resolveTap: (tx, ty, b) => { tapped = null; if (b) return { x: b.door.x, y: b.door.y }; tapped = npcs.find((n) => n.x === tx && n.y === ty) || null; return null; },
      onArrive: (x, y) => { if (tapped && near(tapped, x, y) && mState(mission(tapped.mission)) === "open") { const n = tapped; tapped = null; return talk(n); } const b = BLD.find((b) => b.door.x === x && b.door.y === y); if (b) enter(b); },
      onTile: (x, y) => { S.pos = { x, y }; setAct(ctxAt(x, y)); steps(); },
      onPickup: (k) => { S.picked.push(k.i); S.xp += 5; sfx.coin(); refreshHud(["xp"]); persist(); floatNum(actBtn.parentElement, "+5 ⭐", "#d99a12"); },
      onAction: () => act && act.fn(),
    });
    actBtn.onclick = () => act && act.fn();
    const mm = $("#mm", m), iv = setInterval(() => W && W.minimap(mm), 150); timers.push(() => clearInterval(iv));

    const steps = () => {
      const el = $("#steps", m); if (!el || !W.target) return;
      const r = W.route, p = W.tile();
      if (!r.length || (r.length === 1 && r[0].x === p.x && r[0].y === p.y)) { el.innerHTML = "📍 وصلت! " + (act ? "اضغط الزر الذهبي أو مفتاح المسافة." : ""); return; }
      const dx = r[0].x - p.x, dy = r[0].y - p.y, arrow = dy < 0 ? "⬆️ للأعلى" : dy > 0 ? "⬇️ للأسفل" : dx > 0 ? "➡️ لليمين" : "⬅️ لليسار";
      el.innerHTML = `${arrow} · تبقّى <b class="num">${r.length}</b> خطوة`;
    };
    const setActive = (id, quiet) => {
      const ms = id && mission(id);
      S.active = ms && mState(ms) === "open" ? id : (C.missions.find((x) => mState(x) === "open") || {}).id || null;
      const a = S.active && mission(S.active);
      W.setTarget(a ? mTarget(a) : null);
      $("#dir", m).innerHTML = a ? `<p class="eyebrow">المهمة الحالية</p><h3 class="title-m">${a.icon} ${a.title}</h3><p>${a.desc}</p><p class="where">📍 ${mWhere(a)}</p><p class="steps" id="steps"></p><p class="muted" style="font-size:13.5px">اتبع النقاط الذهبية على الأرض والسهم الأحمر.</p><button class="btn ghost" id="auto" style="font-size:17px;min-height:44px;padding:8px 16px 6px">🚶 امشِ بي إلى هناك</button>` : `<h3 class="title-m">🎉 أنهيت كل المهمات!</h3>`;
      const au = $("#auto", m); if (au) au.onclick = () => { const t = W.target, p0 = W.tile(), r0 = W.route; if (act && (!r0.length || (r0.length === 1 && r0[0].x === p0.x && r0[0].y === p0.y))) return act.fn(); if (t) { sfx.tap(); tapped = npcs.find((n) => n.x === t.x && n.y === t.y) || null; W.walkTo(t.x, t.y); } };
      list(); steps();
      if (a && !quiet) say(`${a.icon} <b>${a.title}</b>: ${mWhere(a)}.`, 7000);
    };
    const list = () => {
      $("#ml", m).innerHTML = C.missions.filter((x) => mState(x) !== "hidden").map((x) => {
        const st = mState(x), stars = S.stars[x.id] || 0;
        return `<li><button class="mitem ${st} ${S.active === x.id ? "on" : ""}" data-m="${x.id}" ${st === "open" ? "" : st === "done" ? "disabled" : ""}>
          <span class="mi">${st === "locked" ? "🔒" : x.icon}</span><span class="mt">${x.title}</span>
          <span class="ms">${st === "done" ? "⭐".repeat(stars) : st === "open" ? "◀" : ""}</span></button></li>`;
      }).join("");
      $$("[data-m]", m).forEach((b) => (b.onclick = () => {
        const x = mission(b.dataset.m);
        if (mState(x) === "locked") { sfx.bad(); const need = (x.needs || []).filter((n) => !S.done[n]).map((n) => mission(n).title); say(`🔒 هذه المهمة تُفتح بعد: ${need.slice(0, 2).join("، ")}${need.length > 2 ? " وغيرها" : ""}.`); return; }
        sfx.tap(); setActive(x.id);
      }));
      npcs.forEach((n) => (n.bubble = mState(mission(n.mission)) === "open" ? n.bubbleIcon : null));
    };
    const enter = (b) => {
      const ms = C.missions.filter((x) => x.place === b.id), open = ms.find((x) => mState(x) === "open");
      if (open) { sfx.unlock(); return run(open); }
      const nb = npcs.find((n) => near(n, b.door.x, b.door.y) && mState(mission(n.mission)) === "open");
      if (nb) return talk(nb);
      const locked = ms.find((x) => mState(x) === "locked");
      sfx.tap(); say(locked ? `🔒 ${b.name}: أنجز المهمات السابقة أولًا لتُفتح «${locked.title}».` : `لا توجد مهمة في ${b.name} الآن. اختر مهمة من القائمة.`);
    };
    const talk = (n) => { sfx.unlock(); run(mission(n.mission)); };
    const quick = (id, score, msg) => {
      const stars = score >= 0.8 ? 3 : score >= 0.5 ? 2 : 1;
      S.done[id] = true; S.stars[id] = stars; S.xp += stars * 20; persist();
      refreshHud(["xp", "cash", "save"]); W.pause(false);
      stars === 3 ? (confetti(70), sfx.win()) : sfx.good();
      say(`${"⭐".repeat(stars)} ${msg}`, 7000);
      after();
    };
    const after = () => {
      if (!S.flags.repair && FREE.filter((x) => S.done[x]).length >= 3) {
        S.flags.repair = true; persist(); W.pause(true); sfx.bad();
        const em = modal(`<div class="big-ic">🚨</div><h2 class="title-l">طوارئ!</h2><p style="font-size:18px">حدث عطل لم ${g("تتوقعه", "تتوقعيه")}. ${g("أسرع", "أسرعي")} إلى ورشة الإصلاح لتعرف ما الذي جرى!</p><button class="btn coral big" id="eg">إلى الورشة 🔧</button>`);
        $("#eg", em).onclick = () => { closeModal(); W.pause(false); setActive("repair"); };
        return;
      }
      setActive(S.active && !S.done[S.active] ? S.active : null);
    };
    const run = (x) => {
      W.pause(true);
      const ev = C.weeks.events;
      if (x.id === "home") {
        const tot = P(C.income);
        const hm = modal(`<div class="big-ic">👩‍👦</div><h2 class="title-l">مصروف الشهر!</h2><p style="font-size:18px">«تفضّل${g("", "ي")} يا ${esc(S.name)}، هذا مصروفك: <b>${tot} ${R}</b>. دبّره${g("", "يه")} بحكمة!»</p><button class="btn gold big" id="tk">استلم المصروف 🪙</button>`);
        $("#tk", hm).onclick = (e) => { S.cash += tot; fly(e.currentTarget, $("#h-cash"), "🪙"); closeModal(); quick("home", 1, `استلمت ${tot} ${R}. الآن إلى البنك لتوزيعها!`); };
      } else if (x.id === "bank") st1();
      else if (x.id === "grocery") grocery();
      else if (x.id === "bills") st3();
      else if (x.id === "repair") st5();
      else if (x.id === "net") encounter(ev[1], () => st6());
      else if (x.id === "friend") encounter(ev[0], (s) => quick("friend", s / 2, "قرار عند المطعم محسوب."));
      else if (x.id === "grandma") encounter(ev[2], (s) => quick("grandma", s / 2, "شكرًا يا جدتي! 🎁"));
      else if (x.id === "shoes") encounter(ev[3], (s) => quick("shoes", s / 2, "«آخر قطعة» من أشهر حيل البيع."));
      else if (x.id === "stranger") encounter(C.stranger, (s) => quick("stranger", s / 2, "لا تشارك رمزك مع أي أحد!"));
      else if (x.id === "deposit") {
        const c = Math.round(S.cash);
        const dm = modal(`<div class="big-ic">🐷</div><h2 class="title-m">انتهى الشهر! بقي معك ${money(c)} نقدًا.</h2><p>كم ${g("تودع", "تودعين")} منها في حصالة الهدف؟</p><div class="row" style="justify-content:center">${[["all", "الكل 🐷", "gold"], ["half", "النصف", "ghost"], ["none", "لا شيء", "ghost"]].map(([k, t, cl]) => `<button class="btn ${cl}" data-t="${k}" ${!c && k !== "none" ? "disabled" : ""}>${t}</button>`).join("")}</div>`);
        $$("[data-t]", dm).forEach((b) => (b.onclick = () => {
          const k = b.dataset.t, amt = k === "all" ? c : k === "half" ? Math.round(c / 2) : 0, pT = !c || k === "all" ? 2 : k === "half" ? 1 : 0;
          S.cash -= amt; S.save += amt; addSkill("saving", pT, 2); log(7, `أودعت ${amt} ${R} في الحصالة نهاية الشهر`, pT >= 1);
          if (pT === 2 && !S.badges.includes("saver")) S.badges.push("saver");
          closeModal(); quick("deposit", pT / 2, amt ? `أودعت ${amt} ${R}. إلى متجر الأحلام!` : "لم تودع شيئًا. إلى متجر الأحلام!");
        }));
      } else if (x.id === "dream") {
        const gl = goal(), gp = P(gl.price), ok = S.save >= gp;
        const dm = modal(ok ? `<div class="big-ic">${gl.icon}🏆</div><h2 class="title-l">حصالتك تكفي!</h2><p style="font-size:18px">${gl.name} بـ ${gp} ${R}، وفي حصالتك ${Math.round(S.save)} ${R}.</p><button class="btn gold big" id="buy">اشترِ هدفي! 🎉</button>` : `<div class="big-ic">${gl.icon}</div><h2 class="title-l">اقتربت!</h2><p style="font-size:18px">${gl.name} بـ ${gp} ${R}، وفي حصالتك ${Math.round(S.save)} ${R}. ينقصك ${Math.round(gp - S.save)} ${R}.</p><p class="muted">في الواقع، شهر آخر من الادخار يوصلك. شاهد تقريرك لتعرف كيف.</p><button class="btn gold big" id="buy">اعرض تقريري 📊</button>`);
        $("#buy", dm).onclick = () => {
          if (ok) { S.bought = true; if (!S.badges.includes("goal")) S.badges.push("goal"); }
          S.done.dream = true; S.stars.dream = ok ? 3 : 1; S.xp += ok ? 100 : 20; closeModal(); report(true);
        };
      }
    };
    after();
    if (!S.done.home) say(`أهلًا بك في حي دبّرة يا ${esc(S.name)}! اضغط على أي مهمة في القائمة لأدلّك على الطريق.`, 9000);
  }

  /* ---------- موقف سريع مع شخصية ---------- */
  function payOut(amount) { // من النقد أولًا ثم الحصالة ثم دَين
    const fromCash = Math.min(S.cash, amount), rest = amount - fromCash; S.cash -= fromCash;
    const fromSave = Math.min(S.save, rest); S.save -= fromSave; if (rest - fromSave > 0) S.debt += rest - fromSave;
    return fromSave;
  }
  function encounter(ev, done) {
    const txt = ev.text.replace(/\d+ ريال/g, (x) => P(parseInt(x)) + " ريال");
    const mm = modal(`<div class="big-ic">${ev.icon}</div><h2 class="title-m">${ev.title}</h2><p style="font-size:18px">${txt}</p>
      <div class="choices">${ev.options.map((o, j) => { const c = P(o.cost || o.fromSave || o.debt || 0); return `<button class="choice" data-o="${j}"><span class="k">${"أبج"[j]}</span>${o.text}${c ? `<span class="cost">−${c}</span>` : o.toSave ? `<span class="cost" style="color:var(--green)">+${P(o.toSave)} 🐷</span>` : ""}</button>`; }).join("")}</div><div id="efb" style="width:100%"></div>`);
    $$("[data-o]", mm).forEach((b) => (b.onclick = () => {
      const o = ev.options[+b.dataset.o]; let note = "";
      $$("[data-o]", mm).forEach((x) => (x.disabled = true)); b.classList.add(o.score >= 1.5 ? "good" : "bad");
      if (o.cost) { const fs = payOut(P(o.cost)); if (fs) note = ` (أخذت ${fs} ${R} من الحصالة لأن النقد لم يكفِ)`; ev.skill === "impulse" ? (S.spend.impulse += P(o.cost)) : (S.spend.fun += P(o.cost)); }
      if (o.fromSave) { const v = P(o.fromSave), fs = Math.min(S.save, v); S.save -= fs; if (v > fs) payOut(v - fs); S.spend.impulse += v; }
      if (o.toSave) S.save += P(o.toSave);
      if (o.toCash) S.cash += P(o.toCash);
      if (o.spendGift) S.spend.impulse += P(ev.gift);
      if (o.debt) S.debt += P(o.debt);
      addSkill(ev.skill, o.score, 2); log(4, `${ev.title}: ${o.text}`, o.score >= 1.5);
      o.score >= 1.5 ? sfx.good() : sfx.bad(); refreshHud(["cash", "save"]);
      $("#efb", mm).innerHTML = `<div class="feedback ${o.score >= 1.5 ? "good" : o.score ? "mid" : "bad"}">${o.feedback}${note}</div><button class="btn gold" id="eok" style="margin-top:10px">تمام ▶</button>`;
      $("#eok", mm).onclick = () => { closeModal(); done(o.score); };
    }));
  }

  /* ================= داخل البقالة ================= */
  function grocery() {
    const before = wallet(), cfg = C.shop, budget = S.cash, COLS = 17, ROWS = 12, SEC = 110;
    const all = [];
    cfg.needs.forEach((nd) => nd.options.forEach((o, i) => all.push({ key: nd.id + i, kind: "need", need: nd.id, icon: nd.icon, name: nd.name, op: o.label, price: P(o.price), unit: `${(P(o.price) / o.qty).toFixed(2).replace(/\.00$/, "")} ${R} لكل ${o.per}`, best: !!o.best })));
    const tempts = cfg.temptations.map((t) => ({ key: t.id, kind: "tempt", icon: t.icon, name: t.name, price: P(t.price), tagTxt: t.tag }));
    const shelfY = [2, 5, 8], slots = shuffle(shelfY.flatMap((y) => [2, 5, 8, 11, 14].map((x) => ({ x, y })))), stands = [{ x: 4, y: 10 }, { x: 6, y: 10 }];
    const placed = [];
    shuffle([...all, ...tempts.slice(2)]).forEach((it, i) => placed.push({ ...slots[i], icon: it.icon, tag: `${it.price}`, glow: it.kind === "tempt", data: it }));
    tempts.slice(0, 2).forEach((it, i) => placed.push({ ...stands[i], icon: it.icon, tag: `${it.price}`, glow: true, data: it }));
    const cart = new Map(); let flashTaken = false, flashShown = false, ended = false, pending = null, act = null;
    const side = `<div class="qhead"><span class="eyebrow">داخل البقالة</span><span class="num" id="sec" style="font-size:24px">${SEC}</span></div>
      <div class="timer"><i id="tb"></i></div>
      <h3 class="title-m" style="font-size:19px">📝 قائمة المقاضي</h3>
      <ul class="list" id="lst">${cfg.needs.map((n) => `<li data-n="${n.id}">${n.icon} ${n.name}</li>`).join("")}</ul>
      <div class="dir" id="info"><p class="muted">اقترب من أي رف لترى السعر وسعر الوحدة.</p></div>
      <h3 class="title-m" style="font-size:19px">🛒 السلة</h3>
      <div class="cart-items" id="ci"></div><div class="total" id="tot"></div>
      <p class="muted" style="font-size:13.5px">عند الانتهاء اذهب إلى الكاشير 🧑‍💼 وادفع.</p>`;
    const m = view(stageHTML(side, "تحرّك بين الرفوف · مسافة للأخذ أو الإرجاع"), "wide");
    const actBtn = $("#act", m), setAct = (a) => { act = a; actBtn.hidden = !a; if (a) actBtn.textContent = a.label; };
    const total = () => [...cart.values()].reduce((a, b) => a + b.price, 0) + (flashTaken ? P(cfg.flash.price) : 0);
    const draw = () => {
      const have = new Set([...cart.values()].filter((x) => x.kind === "need").map((x) => x.need));
      $$("#lst li", m).forEach((li) => li.classList.toggle("done", have.has(li.dataset.n)));
      $("#ci", m).innerHTML = [...cart.values()].map((x) => `<span class="chip">${x.icon} ${x.price}</span>`).join("") + (flashTaken ? `<span class="chip">🍬×3</span>` : "") || `<span class="muted">فارغة</span>`;
      const t = total(); $("#tot", m).className = "total" + (t > budget ? " over" : ""); $("#tot", m).innerHTML = `<span>المجموع</span><span>${money(t)} / ${money(budget)}</span>`;
      placed.forEach((p) => (p.inCart = cart.has(p.data.key)));
    };
    const toggle = (p) => {
      if (ended) return; const it = p.data;
      if (cart.has(it.key)) { cart.delete(it.key); sfx.tap(); }
      else {
        if (it.kind === "need") for (const [ck, cv] of cart) if (cv.kind === "need" && cv.need === it.need) { cart.delete(ck); say(`بدّلت ${it.name}. قارنت سعر الوحدة؟ 👍`); }
        cart.set(it.key, it); sfx.coin(); floatNum(actBtn, `${it.icon} +${it.price}`, "#138781");
        if (it.kind === "tempt") say(["هل هذا في قائمتك؟ 🤔", "العروض اللامعة تحب جيبك!", "حاجة أم رغبة؟"][(Math.random() * 3) | 0]);
        if (total() > budget) say("انتبه! المجموع أكبر من المال الذي معك.");
      }
      draw(); here();
    };
    const nearest = (x, y) => placed.filter((p) => Math.abs(p.x - x) <= 1 && Math.abs(p.y - y) <= 1).sort((a, b) => Math.abs(a.x - x) + Math.abs(a.y - y) - Math.abs(b.x - x) - Math.abs(b.y - y))[0];
    const here = () => {
      const p = W.tile(), n = nearest(p.x, p.y); placed.forEach((q) => (q.near = q === n));
      if (n) {
        const it = n.data;
        $("#info", m).innerHTML = `<h3 class="title-m">${it.icon} ${it.name}</h3>${it.op ? `<p>${it.op}</p>` : `<p class="feedback bad" style="padding:4px 10px">${it.tagTxt} ليس في قائمتك</p>`}<p class="num" style="font-size:24px;color:var(--teal-dk)">${it.price} ${R}</p>${it.unit ? `<p class="where">⚖️ ${it.unit}</p>` : ""}`;
        setAct({ label: cart.has(it.key) ? `أرجِع ${it.name} للرف ↩` : `أضف ${it.name} للسلة ${it.icon}`, fn: () => toggle(n) });
      } else if (Math.abs(p.x - 12) <= 1 && Math.abs(p.y - 10) <= 1) { $("#info", m).innerHTML = `<h3 class="title-m">🧑‍💼 الكاشير</h3><p>المجموع ${money(total())}</p>`; setAct({ label: "ادفع وأنهِ التسوق 🧾", fn: () => checkout(false) }); }
      else { $("#info", m).innerHTML = `<p class="muted">اقترب من أي رف لترى السعر وسعر الوحدة.</p>`; setAct(null); }
    };
    W = DabbraWorld.create($("#wc", m), {
      cols: COLS, rows: ROWS, bg: "#1b2d66", speed: 4.2, joy: $("#joy", m), player: { x: 8, y: 10, gender: S.gender }, items: placed,
      persons: [{ x: 13, y: 10, gender: "m", body: "#36b871", cap: "#2e9e60", facing: -1 }],
      tileAt: (x, y) => (x === 8 && y === ROWS - 1 ? "exit" : x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1 ? "wall" : shelfY.includes(y) && x >= 2 && x <= 14 ? "shelf" : x === 12 && y === 10 ? "counter" : stands.some((s) => s.x === x && s.y === y) ? "stand" : "floor"),
      decor: [{ type: "label", x: 12.5, y: 9.6, text: "الكاشير", bg: "#1b2d66" }, { type: "icon", x: 12, y: 10, icon: "🧾", size: 22 }],
      resolveTap: (tx, ty) => { pending = placed.find((p) => p.x === tx && p.y === ty) || (tx >= 12 && ty === 10 ? "pay" : null); if (pending === "pay") return { x: 11, y: 10 }; return null; },
      onArrive: (x, y) => { if (pending === "pay") checkout(false); else if (pending && Math.abs(pending.x - x) <= 1 && Math.abs(pending.y - y) <= 1) toggle(pending); pending = null; },
      onTile: () => here(), onAction: () => act && act.fn(),
    });
    actBtn.onclick = () => act && act.fn();
    const tm = countdown(SEC, (f, s) => {
      $("#tb", m).style.transform = `scaleX(${f})`; const el = $("#sec", m); if (el.textContent != s) { el.textContent = s; if (s <= 10) sfx.tick(); }
      if (!flashShown && f < 0.6) { flashShown = true; flash(); }
    }, () => checkout(true));
    const flash = () => {
      tm.pause(); W.pause(true); sfx.unlock();
      const fm = modal(`<div class="big-ic">⚡🍬</div><h2 class="title-l">${cfg.flash.text}</h2><p class="num" style="font-size:28px">${P(cfg.flash.price)} ${R}</p><div class="timer" style="width:100%"><i id="ftb"></i></div><div class="row" style="justify-content:center"><button class="btn coral" id="fy">أريد العرض!</button><button class="btn ghost" id="fn">لا، شكرًا</button></div>`, "flash");
      const ft = countdown(cfg.flash.seconds, (f) => { const e = $("#ftb", fm); if (e) e.style.transform = `scaleX(${f})`; }, () => close(false));
      const close = (yes) => { ft.stop(); flashTaken = yes; closeModal(); tm.resume(); W.pause(false); draw(); yes ? (sfx.coin(), say("اشتريت العرض… هل كانت الحلوى في قائمتك؟")) : (sfx.good(), say("قرار قوي! العرض الخاطف مصمم ليجعلك تشتري بسرعة.")); };
      $("#fy", fm).onclick = () => close(true); $("#fn", fm).onclick = () => close(false);
    };
    const checkout = (timeout) => {
      if (ended) return;
      if (!timeout && total() > budget) { sfx.bad(); say("المبلغ لا يكفي! أرجِع شيئًا إلى الرف."); return; }
      if (!timeout && !cart.size) { sfx.bad(); say("سلتك فارغة! خذ ما في القائمة أولًا."); return; }
      ended = true; tm.stop(); W.pause(true);
      let forced = false;
      if (total() > budget) { forced = true; flashTaken = false; const sorted = [...cart.values()].sort((a, b) => (a.kind === "tempt" ? -1 : 1) - (b.kind === "tempt" ? -1 : 1) || b.price - a.price); for (const it of sorted) { if (total() <= budget) break; cart.delete(it.key); } }
      const got = [...cart.values()], needs = got.filter((x) => x.kind === "need"), tp = got.filter((x) => x.kind === "tempt");
      const covered = new Set(needs.map((x) => x.need)).size, bestN = needs.filter((x) => x.best).length, t = tp.length + (flashTaken ? 1 : 0), N = cfg.needs.length;
      const pPri = (covered / N) * 4, pDec = (bestN / N) * 4, pImp = [3, 2, 1, 0][Math.min(3, t)], pFl = flashTaken ? 0 : 2, pBud = forced ? 0 : 2;
      addSkill("priorities", pPri, 4); addSkill("decision", pDec, 4); addSkill("impulse", pImp + pFl, 5); addSkill("budget", pBud, 2);
      const sN = needs.reduce((a, b) => a + b.price, 0), sI = tp.reduce((a, b) => a + b.price, 0) + (flashTaken ? P(cfg.flash.price) : 0);
      S.cash -= sN + sI; S.spend.needs += sN; S.spend.impulse += sI;
      log(2, `اشتريت ${covered} من ${N} احتياجات، و ${t} مشتريات غير مخطط لها`, covered === N && t === 0);
      const lines = [
        [covered === N ? "good" : "bad", covered === N ? "📝 اشتريت كل ما في القائمة. هذه هي الحاجات!" : `📝 نقصك ${N - covered} من احتياجات القائمة${timeout ? " لأن الوقت انتهى" : budget < P(42) ? " لأن مبلغ الأساسيات لم يكفِ" : ""}.`],
        [bestN >= 4 ? "good" : bestN >= 2 ? "mid" : "bad", `⚖️ اخترت الأوفر في ${bestN} من ${N}. سعر الوحدة يكشف الأوفر، لا السعر على الملصق.`],
        [t === 0 ? "good" : t === 1 ? "mid" : "bad", t === 0 ? "🛡️ لم تقع في فخ أي عرض لامع. ممتاز!" : `🍬 اشتريت ${t} من الأشياء غير المخطط لها بـ ${sI} ${R}. هذه رغبات وليست حاجات.`],
        [forced ? "bad" : "good", forced ? "⏰ انتهى الوقت والمبلغ أكبر من محفظتك، فأعاد الكاشير بعض الأشياء." : `💵 دفعت ${sN + sI} ${R} وبقي معك ${Math.round(S.cash)} ${R}.`],
      ];
      later(() => finish("grocery", (pPri + pDec + pImp + pFl + pBud) / 15, "shopper", lines, before), 250);
    };
    window.__items = () => placed.map((p) => ({ key: p.data.key, x: p.x, y: p.y }));
    draw(); here();
    say(`معك ${Math.round(budget)} ${R}. امشِ بين الرفوف وخذ كل ما في القائمة، ثم ادفع عند الكاشير. الأشياء المتوهجة ليست في القائمة!`, 9000);
  }

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
      `المهمات المنجزة: ${Object.keys(S.done).length} من ${C.missions.length}`,
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
    const m = view(`
      <section class="card report-head">
        <div class="av">${avatar()}</div>
        <div style="min-width:0">
          <p class="eyebrow">التقرير الشخصي · ${esc(S.grade)}</p>
          <h1 class="title-l">${esc(S.name)}: ${A.level}</h1>
          <p class="muted">أنجزت ${Object.keys(S.done).length} مهمة وجمعت ${S.xp} ⭐ وحصلت على ${S.badges.length} من الأوسمة.</p>
        </div>
        ${ring(A.overall)}
      </section>

      <div class="two">
        <section class="card" style="display:flex;flex-direction:column;gap:10px">
          <h2 class="title-m">نجوم المهمات</h2>
          <ul class="tips" style="list-style:none;padding:0;gap:3px">${C.missions.filter((x) => S.done[x.id]).map((x) => `<li style="display:flex;justify-content:space-between;gap:8px"><span>${x.icon} ${x.title}</span><span>${"⭐".repeat(S.stars[x.id] || 0)}</span></li>`).join("")}</ul>
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
