/* محرك عالم دبّرة: خريطة بلاطات من أعلى، شخصية تتحرك بالأسهم أو عصا اللمس أو النقر، وكاميرا تتبعها، ومسار إرشادي إلى الهدف */
window.DabbraWorld = (() => {
  "use strict";
  const T = 48;
  const SOLID = new Set(["wall", "shelf", "counter", "stand", "tree", "water", "void"]);
  const FONT = '"Baloo Bhaijaan 2", "Cairo", "Cairo Local", sans-serif';

  /* ---------- رسم الأشخاص ---------- */
  function person(c, x, y, o) {
    const s = o.s || 1, t = o.t || 0, f = o.facing || 1;
    const step = o.moving ? Math.sin(t * 14) : 0, bob = o.moving ? Math.abs(Math.sin(t * 14)) * 2 : Math.sin(t * 2) * 0.8;
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = "rgba(20,30,60,.22)"; c.beginPath(); c.ellipse(0, 0, 14, 5, 0, 0, 7); c.fill();
    c.translate(0, -bob);
    // الأرجل
    c.fillStyle = "#3b2f2a";
    c.fillRect(-7 + step * 3, -8, 5, 8); c.fillRect(2 - step * 3, -8, 5, 8);
    // الجسم
    const body = o.body || (o.gender === "f" ? "#24306a" : "#ffffff");
    c.fillStyle = body; c.strokeStyle = o.gender === "f" ? "#16204a" : "#c9d4e6"; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(-11, -8); c.quadraticCurveTo(-12, -30, -7, -33); c.lineTo(7, -33); c.quadraticCurveTo(12, -30, 11, -8); c.closePath(); c.fill(); c.stroke();
    // الذراعان
    c.strokeStyle = body === "#ffffff" ? "#e3e9f3" : body; c.lineWidth = 5; c.lineCap = "round";
    c.beginPath(); c.moveTo(-10, -28); c.lineTo(-12 - step * 2, -16); c.moveTo(10, -28); c.lineTo(12 + step * 2, -16); c.stroke();
    // الرأس
    const skin = o.skin || "#f1c7a0";
    if (o.gender === "f") {
      c.fillStyle = o.scarf || "#1d2a5c"; c.beginPath(); c.arc(0, -42, 13, 0, 7); c.fill();
      c.beginPath(); c.moveTo(-12, -40); c.lineTo(-13, -30); c.lineTo(13, -30); c.lineTo(12, -40); c.fill();
      c.fillStyle = skin; c.beginPath(); c.ellipse(f * 1.5, -41, 8, 9, 0, 0, 7); c.fill();
    } else {
      c.fillStyle = skin; c.beginPath(); c.arc(0, -42, 10, 0, 7); c.fill();
      if (o.cap) { c.fillStyle = o.cap; c.beginPath(); c.arc(0, -46, 10, Math.PI, 0); c.fill(); c.fillRect(f > 0 ? 0 : -15, -47, 15, 4); }
      else { // غترة حمراء وعقال
        c.fillStyle = "#ffffff"; c.beginPath(); c.moveTo(-12, -46); c.quadraticCurveTo(0, -60, 12, -46); c.lineTo(13, -30); c.lineTo(8, -33); c.lineTo(8, -44); c.lineTo(-8, -44); c.lineTo(-8, -33); c.lineTo(-13, -30); c.closePath(); c.fill();
        c.fillStyle = "#d8443b"; for (let i = -10; i <= 10; i += 4) for (let j = -54; j <= -32; j += 4) if ((i + j) % 8 === 0 && (Math.abs(i) > 7 || j < -45)) c.fillRect(i, j, 2, 2);
        c.strokeStyle = "#1a1a1a"; c.lineWidth = 3; c.beginPath(); c.ellipse(0, -50, 9, 3, 0, 0, 7); c.stroke();
      }
    }
    // العينان
    c.fillStyle = "#1b2d66"; c.beginPath(); c.arc(-3.5 + f * 2, -41, 1.8, 0, 7); c.arc(3.5 + f * 2, -41, 1.8, 0, 7); c.fill();
    c.restore();
  }

  /* ---------- بلاطات ---------- */
  function hash(x, y) { return ((x * 73856093) ^ (y * 19349663)) >>> 0; }
  function tile(c, x, y, t) {
    const px = x * T, py = y * T, h = hash(x, y);
    const grass = () => { c.fillStyle = (x + y) % 2 ? "#a3dc80" : "#9bd577"; c.fillRect(px, py, T, T); if (h % 5 === 0) { c.strokeStyle = "#7fbf5c"; c.lineWidth = 2; c.beginPath(); c.moveTo(px + 12, py + 30); c.lineTo(px + 14, py + 22); c.moveTo(px + 18, py + 30); c.lineTo(px + 17, py + 23); c.stroke(); } };
    switch (t) {
      case "grass": grass(); break;
      case "walk": c.fillStyle = "#ece2cf"; c.fillRect(px, py, T, T); c.strokeStyle = "#d9ccb3"; c.lineWidth = 1; c.strokeRect(px + 0.5, py + 0.5, T / 2, T / 2); c.strokeRect(px + T / 2 + 0.5, py + T / 2 + 0.5, T / 2 - 1, T / 2 - 1); break;
      case "road": c.fillStyle = "#596377"; c.fillRect(px, py, T, T); if (h % 7 === 0) { c.fillStyle = "#535d70"; c.fillRect(px + 10, py + 14, 6, 4); } break;
      case "tree": grass(); c.fillStyle = "#7a5230"; c.fillRect(px + 20, py + 26, 8, 16); c.fillStyle = "rgba(0,0,0,.15)"; c.beginPath(); c.ellipse(px + 24, py + 42, 16, 5, 0, 0, 7); c.fill();
        c.fillStyle = "#3f9d4f"; [[24, 20, 16], [14, 26, 11], [34, 26, 11]].forEach(([a, b, r]) => { c.beginPath(); c.arc(px + a, py + b, r, 0, 7); c.fill(); });
        c.fillStyle = "#5cbf68"; c.beginPath(); c.arc(px + 20, py + 15, 7, 0, 7); c.fill(); break;
      case "flower": grass(); ["#ee6464", "#f6c443", "#ffffff", "#c38bff"].forEach((col, i) => { const a = px + 8 + ((h >> i) % 30), b = py + 8 + ((h >> (i + 3)) % 30); c.fillStyle = col; c.beginPath(); c.arc(a, b, 4, 0, 7); c.fill(); c.fillStyle = "#f6c443"; c.beginPath(); c.arc(a, b, 1.5, 0, 7); c.fill(); }); break;
      case "water": grass(); break;
      case "floor": c.fillStyle = (x + y) % 2 ? "#f6f1e6" : "#ede5d3"; c.fillRect(px, py, T, T); break;
      case "exit": c.fillStyle = "#36b871"; c.fillRect(px, py, T, T); c.fillStyle = "#2e9e60"; for (let i = 4; i < T; i += 8) c.fillRect(px + i, py + 4, 3, T - 8); break;
      case "wall": c.fillStyle = "#2b3c70"; c.fillRect(px, py, T, T); c.fillStyle = "#3a4d88"; c.fillRect(px, py, T, 10); break;
      case "shelf": c.fillStyle = "#ede5d3"; c.fillRect(px, py, T, T); c.fillStyle = "#b9875a"; c.fillRect(px + 2, py + 4, T - 4, T - 8); c.fillStyle = "#d8a97a"; c.fillRect(px + 2, py + 4, T - 4, 6); c.fillStyle = "#9c6f46"; c.fillRect(px + 2, py + T / 2, T - 4, 3); break;
      case "counter": c.fillStyle = "#ede5d3"; c.fillRect(px, py, T, T); c.fillStyle = "#7d8fb0"; c.fillRect(px + 2, py + 6, T - 4, T - 12); c.fillStyle = "#a9b8d3"; c.fillRect(px + 2, py + 6, T - 4, 7); break;
      case "stand": c.fillStyle = (x + y) % 2 ? "#f6f1e6" : "#ede5d3"; c.fillRect(px, py, T, T); c.fillStyle = "#ee6464"; c.beginPath(); c.arc(px + T / 2, py + T / 2, 19, 0, 7); c.fill(); c.fillStyle = "#fff"; c.beginPath(); c.arc(px + T / 2, py + T / 2, 13, 0, 7); c.fill(); break;
      default: c.fillStyle = "#1b2d66"; c.fillRect(px, py, T, T);
    }
  }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function building(c, b) {
    const px = b.x * T, py = b.y * T, w = b.w * T, h = b.h * T, roofH = Math.min(h * 0.42, 70);
    c.fillStyle = "rgba(20,30,60,.18)"; rr(c, px + 8, py + 10, w - 4, h - 4, 10); c.fill();
    c.fillStyle = b.wall; rr(c, px + 4, py + roofH - 8, w - 8, h - roofH + 4, 6); c.fill();
    c.fillStyle = b.roof; rr(c, px, py, w, roofH, 10); c.fill();
    c.fillStyle = "rgba(255,255,255,.14)"; for (let i = 0; i < w; i += 22) c.fillRect(px + i, py + 4, 10, roofH - 8);
    // نوافذ
    const wy = py + roofH + 6, wh = Math.max(14, h - roofH - 44);
    for (let i = 0; i < b.w; i++) { const cx = b.x + i; if (cx === b.door.x) continue; c.fillStyle = "#ffffff"; rr(c, cx * T + 8, wy, T - 16, wh, 4); c.fill(); c.fillStyle = "#9fd3f2"; rr(c, cx * T + 11, wy + 3, T - 22, wh - 6, 3); c.fill(); c.fillStyle = "rgba(255,255,255,.6)"; c.fillRect(cx * T + 13, wy + 5, 4, wh - 10); }
    // باب ومظلة
    const dx = b.door.x * T, dh = 34;
    if (b.awning) { for (let i = 0; i < 4; i++) { c.fillStyle = i % 2 ? "#ffffff" : b.awning; c.beginPath(); c.moveTo(dx - 4 + i * 14, py + h - dh - 14); c.lineTo(dx + 10 + i * 14, py + h - dh - 14); c.lineTo(dx + 10 + i * 14, py + h - dh - 4); c.arc(dx + 3 + i * 14, py + h - dh - 4, 7, 0, Math.PI); c.fill(); } }
    c.fillStyle = b.doorColor || "#7a4b2a"; rr(c, dx + 9, py + h - dh, T - 18, dh, 4); c.fill();
    c.fillStyle = "#f6c443"; c.beginPath(); c.arc(dx + T - 15, py + h - dh / 2, 2.5, 0, 7); c.fill();
    // لافتة
    c.font = `800 19px ${FONT}`; c.direction = "rtl"; c.textAlign = "center"; c.textBaseline = "middle";
    const label = `${b.icon}  ${b.name}`, tw = Math.min(w - 12, c.measureText(label).width + 26);
    c.fillStyle = "#ffffff"; rr(c, px + w / 2 - tw / 2, py + roofH / 2 - 17, tw, 34, 12); c.fill();
    c.strokeStyle = b.roof; c.lineWidth = 3; c.stroke();
    c.fillStyle = "#1b2d66"; c.fillText(label, px + w / 2, py + roofH / 2 + 1, w - 20);
    // عتبة الباب
    c.fillStyle = "#e3cfa6"; rr(c, b.door.x * T + 6, b.door.y * T + 4, T - 12, 14, 5); c.fill();
  }

  /* ---------- المحرك ---------- */
  function create(cv, cfg) {
    const W = cfg.cols, H = cfg.rows, ctx = cv.getContext("2d");
    const tiles = new Array(W * H), bmap = new Array(W * H).fill(null);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) tiles[y * W + x] = cfg.tileAt(x, y);
    (cfg.buildings || []).forEach((b) => { for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) bmap[y * W + x] = b; });
    const persons = cfg.persons || [], items = cfg.items || [], pickups = cfg.pickups || [];
    const solidAt = (x, y) => x < 0 || y < 0 || x >= W || y >= H || SOLID.has(tiles[y * W + x]) || !!bmap[y * W + x] || persons.some((p) => p.solid !== false && Math.floor(p.x) === x && Math.floor(p.y) === y);
    const P = { x: cfg.player.x + 0.5, y: cfg.player.y + 0.5, facing: 1, moving: false, gender: cfg.player.gender };
    let path = null, target = null, tpath = [], paused = false, dead = false, t = 0, last = performance.now(), lastTile = "";
    const keys = new Set(); let joy = null;

    // خلفية ثابتة مرسومة مرة واحدة
    const OS = Math.min(1.5, window.devicePixelRatio || 1), off = document.createElement("canvas");
    off.width = W * T * OS; off.height = H * T * OS;
    function prerender() {
      const c = off.getContext("2d"); c.setTransform(OS, 0, 0, OS, 0, 0);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) tile(c, x, y, tiles[y * W + x]);
      (cfg.zebras || []).forEach((z) => { c.fillStyle = "rgba(255,255,255,.85)"; for (let i = 0; i < (z.vertical ? z.h : z.w) * T; i += 12) z.vertical ? c.fillRect(z.x * T + 6, z.y * T + i, z.w * T - 12, 6) : c.fillRect(z.x * T + i, z.y * T + 6, 6, z.h * T - 12); });
      (cfg.lines || []).forEach((l) => { c.strokeStyle = "rgba(255,255,255,.75)"; c.lineWidth = 3; c.setLineDash([16, 14]); c.beginPath(); c.moveTo(l[0] * T, l[1] * T); c.lineTo(l[2] * T, l[3] * T); c.stroke(); c.setLineDash([]); });
      (cfg.decor || []).forEach((d) => {
        if (d.type === "fountain") { const cx = (d.x + 1) * T, cy = (d.y + 1) * T; c.fillStyle = "#c9d6e3"; c.beginPath(); c.arc(cx, cy, T * 0.95, 0, 7); c.fill(); c.fillStyle = "#5cb8e6"; c.beginPath(); c.arc(cx, cy, T * 0.78, 0, 7); c.fill(); c.fillStyle = "#c9d6e3"; c.beginPath(); c.arc(cx, cy, 10, 0, 7); c.fill(); }
        if (d.type === "bench") { c.fillStyle = "#9c6f46"; rr(c, d.x * T + 4, d.y * T + 16, T * (d.w || 1) - 8, 14, 4); c.fill(); c.fillStyle = "#7a5230"; c.fillRect(d.x * T + 8, d.y * T + 30, 4, 8); c.fillRect((d.x + (d.w || 1)) * T - 12, d.y * T + 30, 4, 8); }
        if (d.type === "label") { c.font = `800 15px ${FONT}`; c.direction = "rtl"; c.textAlign = "center"; c.textBaseline = "middle"; const tw = c.measureText(d.text).width + 20; c.fillStyle = d.bg || "#1b2d66"; rr(c, d.x * T - tw / 2, d.y * T - 13, tw, 26, 10); c.fill(); c.fillStyle = "#fff"; c.fillText(d.text, d.x * T, d.y * T + 1); }
        if (d.type === "icon") { c.font = `${d.size || 26}px serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(d.icon, (d.x + 0.5) * T, (d.y + 0.5) * T); }
      });
      (cfg.buildings || []).forEach((b) => building(c, b));
    }
    prerender();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => !dead && prerender());

    // البحث عن مسار (عرضي أولًا؛ الشبكة صغيرة)
    function bfs(sx, sy, gx, gy) {
      if (sx === gx && sy === gy) return [{ x: gx, y: gy }];
      const prev = new Int32Array(W * H).fill(-1), q = [sy * W + sx]; prev[sy * W + sx] = sy * W + sx;
      while (q.length) {
        const i = q.shift(), x = i % W, y = (i / W) | 0;
        if (x === gx && y === gy) { const out = []; let k = i; while (k !== sy * W + sx) { out.push({ x: k % W, y: (k / W) | 0 }); k = prev[k]; } return out.reverse(); }
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, j = ny * W + nx; if (nx >= 0 && ny >= 0 && nx < W && ny < H && prev[j] < 0 && !solidAt(nx, ny)) { prev[j] = i; q.push(j); } }
      }
      return null;
    }
    const ptile = () => ({ x: Math.floor(P.x), y: Math.floor(P.y) });
    function approach(x, y) {
      if (!solidAt(x, y)) return { x, y };
      const p = ptile(); let best = null, bd = 1e9;
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]]) { const nx = x + dx, ny = y + dy; if (!solidAt(nx, ny)) { const d = Math.hypot(nx - p.x, ny - p.y); if (d < bd) { bd = d; best = { x: nx, y: ny }; } } }
      return best;
    }
    function repath() { if (!target) { tpath = []; return; } const p = ptile(), a = approach(target.x, target.y); tpath = a ? bfs(p.x, p.y, a.x, a.y) || [] : []; }

    // الإدخال
    const onKey = (e) => {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      const k = e.code;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"].includes(k)) { e.preventDefault(); e.type === "keydown" ? keys.add(k) : keys.delete(k); }
      if (e.type === "keydown" && (k === "Space" || k === "Enter" || k === "KeyE") && !e.repeat) { if (document.activeElement && document.activeElement.tagName === "BUTTON" && k !== "KeyE") return; e.preventDefault(); cfg.onAction && cfg.onAction(); }
    };
    addEventListener("keydown", onKey); addEventListener("keyup", onKey);
    const blur = () => keys.clear(); addEventListener("blur", blur);
    let z = 1, vw = 0, vh = 0, dpr = 1, cam = { x: 0, y: 0 };
    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1); const r = cv.getBoundingClientRect();
      cv.width = Math.max(1, r.width * dpr); cv.height = Math.max(1, r.height * dpr);
      z = Math.max(0.68, Math.min(1.25, Math.min(r.width / (14 * T), r.height / (9 * T)) * 1.15));
      vw = r.width / z; vh = r.height / z;
    }
    const ro = new ResizeObserver(resize); ro.observe(cv); resize();
    // النقر للتحرك
    let down = null;
    cv.addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY }; });
    cv.addEventListener("pointerup", (e) => {
      if (!down || paused) return; if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 12) return; down = null;
      const r = cv.getBoundingClientRect(), wx = (e.clientX - r.left) / z + cam.x, wy = (e.clientY - r.top) / z + cam.y;
      let tx = Math.floor(wx / T), ty = Math.floor(wy / T);
      const res = cfg.resolveTap ? cfg.resolveTap(tx, ty, bmap[ty * W + tx]) : null;
      const goal = res || approach(tx, ty); if (!goal) return;
      const p = ptile(); path = bfs(p.x, p.y, goal.x, goal.y); tapMark = { x: goal.x, y: goal.y, t: 0 };
    });
    let tapMark = null;
    if (cfg.joy) {
      const j = cfg.joy, knob = j.firstElementChild;
      const mv = (e) => { const r = j.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; let dx = e.clientX - cx, dy = e.clientY - cy; const m = Math.hypot(dx, dy), R = r.width / 2; if (m > R) { dx = (dx / m) * R; dy = (dy / m) * R; } knob.style.transform = `translate(${dx}px, ${dy}px)`; joy = m > 8 ? { x: dx / R, y: dy / R } : null; };
      j.onpointerdown = (e) => { j.setPointerCapture(e.pointerId); mv(e); };
      j.onpointermove = (e) => { if (j.hasPointerCapture(e.pointerId)) mv(e); };
      j.onpointerup = j.onpointercancel = () => { joy = null; knob.style.transform = ""; };
    }

    // الحركة
    function tryMove(nx, ny) {
      const r = 0.28;
      const free = (x, y) => !solidAt(Math.floor(x - r), Math.floor(y - r)) && !solidAt(Math.floor(x + r), Math.floor(y - r)) && !solidAt(Math.floor(x - r), Math.floor(y + r)) && !solidAt(Math.floor(x + r), Math.floor(y + r));
      if (free(nx, P.y)) P.x = nx; if (free(P.x, ny)) P.y = ny;
    }
    function update(dt) {
      t += dt; if (tapMark) tapMark.t += dt;
      if (paused) { P.moving = false; return; }
      let vx = 0, vy = 0;
      if (keys.has("ArrowLeft") || keys.has("KeyA")) vx -= 1; if (keys.has("ArrowRight") || keys.has("KeyD")) vx += 1;
      if (keys.has("ArrowUp") || keys.has("KeyW")) vy -= 1; if (keys.has("ArrowDown") || keys.has("KeyS")) vy += 1;
      if (joy) { vx = joy.x; vy = joy.y; }
      const sp = (cfg.speed || 4.6) * dt;
      if (vx || vy) {
        path = null; tapMark = null; const m = Math.max(1, Math.hypot(vx, vy)); tryMove(P.x + (vx / m) * sp, P.y + (vy / m) * sp);
        P.moving = true; if (Math.abs(vx) > 0.2) P.facing = vx > 0 ? 1 : -1;
      } else if (path && path.length) {
        const n = path[0], tx = n.x + 0.5, ty = n.y + 0.5, dx = tx - P.x, dy = ty - P.y, d = Math.hypot(dx, dy);
        if (d <= sp) { P.x = tx; P.y = ty; path.shift(); if (!path.length) { path = null; tapMark = null; cfg.onArrive && cfg.onArrive(n.x, n.y); } }
        else { P.x += (dx / d) * sp; P.y += (dy / d) * sp; }
        P.moving = true; if (Math.abs(dx) > 0.05) P.facing = dx > 0 ? 1 : -1;
      } else P.moving = false;
      const p = ptile(), key = p.x + "," + p.y;
      if (key !== lastTile) { lastTile = key; repath(); cfg.onTile && cfg.onTile(p.x, p.y); }
      for (let i = pickups.length - 1; i >= 0; i--) { const k = pickups[i]; if (Math.hypot(k.x + 0.5 - P.x, k.y + 0.5 - P.y) < 0.6) { pickups.splice(i, 1); cfg.onPickup && cfg.onPickup(k); } }
    }

    // الرسم
    function render() {
      const rw = cv.width / dpr, rh = cv.height / dpr;
      const WW = W * T, HH = H * T, px = P.x * T, py = P.y * T;
      cam.x = WW <= vw ? (WW - vw) / 2 : Math.max(0, Math.min(WW - vw, px - vw / 2));
      cam.y = HH <= vh ? (HH - vh) / 2 : Math.max(0, Math.min(HH - vh, py - vh / 2));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = cfg.bg || "#7fbf5c"; ctx.fillRect(0, 0, rw, rh);
      ctx.setTransform(dpr * z, 0, 0, dpr * z, -cam.x * dpr * z, -cam.y * dpr * z);
      ctx.drawImage(off, 0, 0, off.width, off.height, 0, 0, WW, HH);
      // مسار الإرشاد
      if (target && tpath.length) {
        tpath.forEach((n, i) => { const ph = (t * 3 - i * 0.35) % 2; const a = 0.35 + 0.5 * Math.max(0, Math.sin(ph * Math.PI)); ctx.fillStyle = `rgba(246,196,67,${a})`; ctx.beginPath(); ctx.arc((n.x + 0.5) * T, (n.y + 0.5) * T, 7, 0, 7); ctx.fill(); ctx.strokeStyle = `rgba(217,154,18,${a})`; ctx.lineWidth = 2; ctx.stroke(); });
      }
      if (target) {
        const a = approach(target.x, target.y) || target, cx = (a.x + 0.5) * T, cy = (a.y + 0.5) * T, pulse = 1 + Math.sin(t * 5) * 0.12;
        ctx.strokeStyle = "#f6c443"; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(cx, cy + 8, 22 * pulse, 10 * pulse, 0, 0, 7); ctx.stroke();
        const ay = (target.y + 0.5) * T - 46 - Math.abs(Math.sin(t * 4)) * 12, ax = (target.x + 0.5) * T;
        ctx.fillStyle = "#ee6464"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ax - 14, ay - 18); ctx.lineTo(ax + 14, ay - 18); ctx.lineTo(ax + 14, ay - 4); ctx.lineTo(ax + 22, ay - 4); ctx.lineTo(ax, ay + 16); ctx.lineTo(ax - 22, ay - 4); ctx.lineTo(ax - 14, ay - 4); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      if (tapMark) { ctx.strokeStyle = `rgba(31,177,172,${Math.max(0, 1 - tapMark.t)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc((tapMark.x + 0.5) * T, (tapMark.y + 0.5) * T, 10 + tapMark.t * 14, 0, 7); ctx.stroke(); }
      // شارات حالة المباني
      (cfg.buildings || []).forEach((b) => { const ch = cfg.chip && cfg.chip(b); if (!ch) return; const x = (b.x + b.w / 2) * T, y = b.y * T - 4 + Math.sin(t * 3) * 2; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, 16, 0, 7); ctx.fill(); ctx.strokeStyle = "#1b2d66"; ctx.lineWidth = 2.5; ctx.stroke(); ctx.font = "18px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(ch, x, y + 1); });
      // الأغراض والالتقاطات
      items.forEach((it) => {
        const cx = (it.x + 0.5) * T, cy = (it.y + 0.5) * T;
        if (it.glow) { ctx.fillStyle = `rgba(238,100,100,${0.16 + 0.12 * Math.sin(t * 6)})`; ctx.beginPath(); ctx.arc(cx, cy, 26, 0, 7); ctx.fill(); }
        if (it.near) { ctx.strokeStyle = "#1fb1ac"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, 22, 0, 7); ctx.stroke(); }
        ctx.font = "26px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(it.icon, cx, cy - 4);
        ctx.font = `800 11px ${FONT}`; ctx.fillStyle = "#fff"; const tw = ctx.measureText(it.tag).width + 8; rr(ctx, cx - tw / 2, cy + 10, tw, 15, 5); ctx.fill(); ctx.fillStyle = "#1b2d66"; ctx.fillText(it.tag, cx, cy + 18);
        if (it.inCart) { ctx.fillStyle = "#36b871"; ctx.beginPath(); ctx.arc(cx + 16, cy - 16, 9, 0, 7); ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = "bold 12px sans-serif"; ctx.fillText("✓", cx + 16, cy - 15); }
      });
      pickups.forEach((k) => { const cx = (k.x + 0.5) * T, cy = (k.y + 0.5) * T - 6 + Math.sin(t * 4 + k.x) * 4, sq = Math.abs(Math.cos(t * 3 + k.y)); ctx.fillStyle = "rgba(0,0,0,.15)"; ctx.beginPath(); ctx.ellipse(cx, (k.y + 0.5) * T + 10, 9, 3, 0, 0, 7); ctx.fill(); ctx.fillStyle = "#d99a12"; ctx.beginPath(); ctx.ellipse(cx, cy, 11 * sq + 2, 11, 0, 0, 7); ctx.fill(); ctx.fillStyle = "#f6c443"; ctx.beginPath(); ctx.ellipse(cx, cy, 8 * sq + 1, 8, 0, 0, 7); ctx.fill(); });
      // الأشخاص مرتبين حسب العمق
      const all = persons.map((p) => ({ p, y: p.y + 0.5 })).concat([{ me: true, y: P.y }]).sort((a, b) => a.y - b.y);
      all.forEach((o) => {
        if (o.me) { person(ctx, P.x * T, P.y * T + 14, { gender: P.gender, facing: P.facing, moving: P.moving, t, s: 1.05 }); return; }
        const p = o.p, x = (p.x + 0.5) * T, y = (p.y + 0.5) * T + 14;
        if (p.cart) { ctx.font = "34px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(p.cart, x + (p.cartDx || 30), y - 18); }
        person(ctx, x, y, { gender: p.gender, body: p.body, scarf: p.scarf, cap: p.cap, facing: p.facing || -1, t: t + p.x, s: 0.95 });
        if (p.bubble) { const by = y - 76 + Math.sin(t * 3 + p.x) * 3; ctx.fillStyle = "#fff"; rr(ctx, x - 18, by - 16, 36, 30, 10); ctx.fill(); ctx.strokeStyle = "#1b2d66"; ctx.lineWidth = 2; ctx.stroke(); ctx.font = "18px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(p.bubble, x, by); }
      });
      // سهم الحافة حين يكون الهدف خارج الشاشة
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (target) {
        const sx = ((target.x + 0.5) * T - cam.x) * z, sy = ((target.y + 0.5) * T - cam.y) * z;
        if (sx < 20 || sy < 20 || sx > rw - 20 || sy > rh - 20) {
          const cx = rw / 2, cy = rh / 2, ang = Math.atan2(sy - cy, sx - cx), ex = cx + Math.cos(ang) * (rw / 2 - 40), ey = cy + Math.sin(ang) * (rh / 2 - 40);
          ctx.save(); ctx.translate(ex, ey); ctx.fillStyle = "#1b2d66"; ctx.beginPath(); ctx.arc(0, 0, 24, 0, 7); ctx.fill(); ctx.strokeStyle = "#f6c443"; ctx.lineWidth = 4; ctx.stroke();
          ctx.rotate(ang); ctx.fillStyle = "#f6c443"; ctx.beginPath(); ctx.moveTo(34, 0); ctx.lineTo(22, -9); ctx.lineTo(22, 9); ctx.fill(); ctx.restore();
          ctx.font = "20px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(target.icon || "⭐", ex, ey + 1);
        }
      }
    }
    function loop(now) { if (dead) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; update(dt); render(); requestAnimationFrame(loop); }
    requestAnimationFrame(loop);

    window.__dbg = (x, y, r) => ({ x: r.left + ((x + 0.5) * T - cam.x) * z, y: r.top + ((y + 0.5) * T - cam.y) * z });
    return {
      T, player: P, persons, items, pickups, solidAt, bfs,
      tile: ptile,
      setTarget(tg) { target = tg; repath(); },
      get target() { return target; },
      get route() { return tpath; },
      pause(v) { paused = v; if (v) { keys.clear(); path = null; } },
      walkTo(x, y) { const a = approach(x, y); if (!a) return; const p = ptile(); path = bfs(p.x, p.y, a.x, a.y); },
      minimap(mc, scale, extra) {
        const c = mc.getContext("2d"); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, mc.width, mc.height);
        c.drawImage(off, 0, 0, mc.width, mc.height);
        const s = mc.width / W;
        if (target) { c.fillStyle = "#ee6464"; c.beginPath(); c.arc((target.x + 0.5) * s, (target.y + 0.5) * s, 3 + Math.sin(t * 6) * 1.5 + 2, 0, 7); c.fill(); }
        c.fillStyle = "#fff"; c.strokeStyle = "#1b2d66"; c.lineWidth = 2; c.beginPath(); c.arc(P.x * s, P.y * s, 4, 0, 7); c.fill(); c.stroke();
      },
      destroy() { dead = true; ro.disconnect(); removeEventListener("keydown", onKey); removeEventListener("keyup", onKey); removeEventListener("blur", blur); },
    };
  }
  return { create, person };
})();
