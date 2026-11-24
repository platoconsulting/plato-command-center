// Plato Consulting LLC - Agent Command Center (demo mode)
// Pixel map is drawn at 384x240 "game pixels" and scaled up crisply.
(() => {
  'use strict';

  window.addEventListener('error', (e) => {
    const box = document.getElementById('err');
    if (box) { box.hidden = false; box.textContent = 'Error: ' + e.message; }
  });

  const P = window.PLATO;
  const W = 384, H = 240;
  const cv = document.getElementById('map');
  const ctx = cv.getContext('2d');
  let S = 3;

  // ---------- helpers ----------
  const $ = (s) => document.querySelector(s);
  const rand = (a, b) => a + Math.random() * (b - a);
  const randi = (a, b) => Math.floor(rand(a, b + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fill = (s, v) => s.replace(/\{(\w+)\}/g, (m, k) => (v[k] !== undefined ? v[k] : m));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const jobId = (n) => '#' + String(n).padStart(4, '0');
  const hexA = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };
  const clockStr = () => new Date().toLocaleTimeString([], { hour12: false });

  // ---------- world layout ----------
  const ROOMS = [
    { name: 'INTAKE', x: 8, y: 22, w: 112, h: 94, color: '#3be8ff', row: 0 },
    { name: 'RESEARCH LAB', x: 136, y: 22, w: 112, h: 94, color: '#41ff8a', row: 0 },
    { name: 'ANALYSIS BAY', x: 264, y: 22, w: 112, h: 94, color: '#ffa23b', row: 0 },
    { name: "WRITERS' ROOM", x: 264, y: 136, w: 112, h: 94, color: '#ff4fd8', row: 1 },
    { name: 'QA DECK', x: 136, y: 136, w: 112, h: 94, color: '#ffe14f', row: 1 },
    { name: 'CLIENT DOCK', x: 8, y: 136, w: 112, h: 94, color: '#5b8cff', row: 1 },
  ];

  // Conveyor: a U shape. Left to right along the top row, down, then right to left along the bottom row.
  const BX0 = 16, BX1 = 342, BY0 = 100, BY1 = 158;
  const SEG1 = BX1 - BX0, SEG2 = BY1 - BY0;
  const PATH_END = SEG1 + SEG2 + SEG1;
  const SPEED = 30; // game px per second
  function posAt(s) {
    if (s <= SEG1) return { x: BX0 + s, y: BY0 };
    if (s <= SEG1 + SEG2) return { x: BX1, y: BY0 + (s - SEG1) };
    return { x: BX1 - (s - SEG1 - SEG2), y: BY1 };
  }
  const sForX = (x, row) => (row === 0 ? x - BX0 : SEG1 + SEG2 + (BX1 - x));
  const STATION_X = [64, 192, 300, 300, 192, 64];
  const BASE_WORK = [2.5, 6, 5, 6, 4, 2.5];
  const STATIONS = ROOMS.map((r, i) => {
    const s = sForX(STATION_X[i], r.row);
    const p = posAt(s);
    return { s, x: p.x, y: p.y, room: i, busy: null };
  });

  // ---------- agents ----------
  const agents = P.AGENTS.map((a) => ({ ...a }));
  ROOMS.forEach((room, ri) => {
    const crew = agents.filter((a) => a.room === ri);
    crew.forEach((a, k) => {
      const deskX = Math.round(room.x + (room.w * (k + 1)) / (crew.length + 1));
      const tableY = room.row === 0 ? room.y + 20 : room.y + 76;
      const homeY = room.row === 0 ? tableY + 15 : tableY - 1;
      const done = randi(14, 42);
      Object.assign(a, {
        slot: k, deskX, tableY, homeX: deskX, homeY,
        x: deskX, y: homeY, tx: deskX, ty: homeY, dir: 1,
        state: 'idle', job: null, anim: Math.random() * 10,
        wanderT: rand(3, 12), pauseT: 0,
        done, qSum: done * (a.skill + rand(-1, 1)),
      });
    });
  });
  const avgQ = (a) => a.qSum / a.done;
  const tierOf = (a) => { const q = avgQ(a); return q >= 95 ? 'S' : q >= 92 ? 'A' : q >= 89 ? 'B' : 'C'; };

  function workSpot(a) {
    const st = STATIONS[a.room];
    const off = a.slot === 0 ? -11 : 11;
    return { x: st.x + off, y: ROOMS[a.room].row === 0 ? st.y - 4 : st.y + 14 };
  }
  function wanderTarget(a) {
    const r = ROOMS[a.room];
    const y0 = r.row === 0 ? r.y + 42 : r.y + 42;
    const y1 = r.row === 0 ? r.y + 68 : r.y + 64;
    return { x: rand(r.x + 10, r.x + r.w - 10), y: rand(y0, y1) };
  }
  function statusText(a) {
    switch (a.state) {
      case 'walk': return 'Heading to the line';
      case 'work': return 'Working job ' + jobId(a.job.id);
      case 'return': return 'Returning to desk';
      case 'wander': case 'pause': return 'Stretching legs';
      default: return 'At desk';
    }
  }

  function stepAgent(a, dt) {
    a.anim += dt;
    if (a.state === 'walk' || a.state === 'wander' || a.state === 'return') {
      const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy), v = 34 * dt;
      if (Math.abs(dx) > 0.5) a.dir = dx < 0 ? -1 : 1;
      if (d <= v) {
        a.x = a.tx; a.y = a.ty;
        if (a.state === 'walk') a.state = 'work';
        else if (a.state === 'wander') { a.state = 'pause'; a.pauseT = rand(1, 2.5); }
        else { a.state = 'idle'; a.wanderT = rand(6, 16); }
      } else { a.x += (dx / d) * v; a.y += (dy / d) * v; }
    } else if (a.state === 'pause') {
      a.pauseT -= dt;
      if (a.pauseT <= 0) { a.state = 'return'; a.tx = a.homeX; a.ty = a.homeY; }
    } else if (a.state === 'idle') {
      a.wanderT -= dt;
      if (a.wanderT <= 0) { const p = wanderTarget(a); a.state = 'wander'; a.tx = p.x; a.ty = p.y; }
    }
  }

  // ---------- jobs ----------
  let jobs = [];
  const pending = [];
  const shipped = [];
  let nextId = 1, t = 0, autoT = 4, flash = 0, hoursSaved = 0;

  function makeJob(type, client, brief) {
    const d = P.DELIVERABLES[type];
    const clean = (brief || '').trim().replace(/\s+/g, ' ');
    const topic = clean ? clean.slice(0, 90) : pick(d.topics);
    return {
      id: nextId++, type, client, brief: clean, topic,
      s: 0, stage: 0, state: 'moving', progress: 0, workTime: 1,
      agent: null, crew: [], qa: 0, created: t,
    };
  }
  function vars(j, a, extra) {
    return Object.assign({
      agent: a ? a.name : '', client: j.client, type: P.DELIVERABLES[j.type].label,
      topic: j.topic, id: jobId(j.id), n: randi(10, 28), m: randi(3, 9),
      words: randi(900, 3200).toLocaleString(), sec: P.DELIVERABLES[j.type].sections.length,
    }, extra || {});
  }

  function submitJob(job, quiet) {
    pending.push(job);
    if (!quiet) log(0, `Job ${jobId(job.id)} received: ${P.DELIVERABLES[job.type].label} for ${job.client}.`);
    updateKpis();
  }
  function releasePending() {
    if (!pending.length) return;
    if (jobs.some((j) => j.s < 14)) return;
    jobs.push(pending.shift());
  }

  function beginStage(j) {
    const st = STATIONS[j.stage];
    const free = agents.filter((a) => a.room === j.stage && !a.job);
    if (!free.length || (st.busy && st.busy !== j)) { j.state = 'waiting'; return; }
    const a = free.sort((p, q) => (p.state === 'idle' ? 0 : 1) - (q.state === 'idle' ? 0 : 1))[0];
    const spot = workSpot(a);
    st.busy = j;
    j.state = 'working'; j.agent = a; j.progress = 0;
    j.workTime = BASE_WORK[j.stage] * rand(0.75, 1.3);
    a.job = j; a.state = 'walk'; a.tx = spot.x; a.ty = spot.y;
    log(j.stage, fill(pick(P.STAGE_LOGS[j.stage].start), vars(j, a)));
    if (selected === a) renderInspector();
  }

  function finishStage(j) {
    const a = j.agent, st = STATIONS[j.stage];
    const q = Math.round(clamp(a.skill + rand(-4, 3), 78, 99));
    a.done++; a.qSum += q;
    j.crew[j.stage] = a.name;
    if (j.stage === 4) j.qa = q;
    log(j.stage, fill(pick(P.STAGE_LOGS[j.stage].done), vars(j, a, { q })));
    a.job = null; a.state = 'return'; a.tx = a.homeX; a.ty = a.homeY;
    st.busy = null;
    j.agent = null; j.stage++; j.state = 'moving';
    renderTiers();
    if (selected === a) renderInspector();
  }

  function ship(j) {
    j.state = 'shipped';
    j.shippedAt = t;
    j.shippedClock = clockStr();
    shipped.unshift(j);
    hoursSaved += P.DELIVERABLES[j.type].hours;
    flash = 1;
    log(5, `${jobId(j.id)} SHIPPED to ${j.client}: ${P.DELIVERABLES[j.type].label}.`, true);
    renderShipped();
    updateKpis();
  }

  function stepJobs(dt) {
    jobs.sort((p, q) => q.s - p.s);
    for (let i = 0; i < jobs.length; i++) {
      const j = jobs[i];
      const ahead = i > 0 ? jobs[i - 1] : null;
      if (j.state === 'moving') {
        const target = j.stage < STATIONS.length ? STATIONS[j.stage].s : PATH_END;
        let lim = target;
        if (ahead) lim = Math.min(lim, ahead.s - 11);
        j.s = Math.max(j.s, Math.min(lim, j.s + SPEED * dt));
        if (j.s >= target - 0.01) {
          j.s = target;
          if (j.stage < STATIONS.length) beginStage(j); else ship(j);
        }
      } else if (j.state === 'waiting') {
        beginStage(j);
      } else if (j.state === 'working') {
        if (j.agent.state === 'work') {
          j.progress += dt;
          if (j.progress >= j.workTime) finishStage(j);
        }
      }
    }
    jobs = jobs.filter((j) => j.state !== 'shipped');
  }

  function autopilot(dt) {
    if (!$('#fAuto').checked) return;
    autoT -= dt;
    if (autoT > 0) return;
    autoT = rand(11, 19);
    if (jobs.length + pending.length >= 6) return;
    const type = pick(Object.keys(P.DELIVERABLES));
    submitJob(makeJob(type, pick(P.CLIENTS)));
  }

  // ---------- static art (drawn once) ----------
  function makeBg() {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const img = g.createImageData(W, H);
    const blobs = [
      [40, 210, 110, [120, 30, 170]], [350, 30, 120, [190, 30, 130]],
      [210, 120, 150, [30, 25, 100]], [370, 225, 80, [255, 60, 150]], [120, 20, 70, [40, 90, 200]],
    ];
    const bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let r = 6, gg = 5, b = 14;
        for (const [bx, by, rad, col] of blobs) {
          const d2 = (x - bx) ** 2 + (y - by) ** 2;
          const k = Math.exp(-d2 / (rad * rad)) * 0.5;
          r += col[0] * k; gg += col[1] * k; b += col[2] * k;
        }
        const dz = (bayer[y & 3][x & 3] / 16 - 0.5) * 16;
        const q = (v) => clamp(Math.round((v + dz) / 10) * 10, 0, 255);
        const o = (y * W + x) * 4;
        img.data[o] = q(r); img.data[o + 1] = q(gg); img.data[o + 2] = q(b); img.data[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    for (let i = 0; i < 150; i++) {
      g.fillStyle = Math.random() < 0.2 ? '#9fb6ff' : '#e8ecff';
      g.globalAlpha = rand(0.35, 1);
      g.fillRect(randi(0, W - 1), randi(0, H - 1), 1, 1);
    }
    g.globalAlpha = 1;
    return c;
  }

  function makeStatic() {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const r = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    const FLOOR = '#101425', GRID = '#161b30', WALL_O = '#23283a', WALL_I = '#4b536d', WALL_H = '#6b7493';

    for (const room of ROOMS) {
      r(room.x - 4, room.y - 4, room.w + 8, room.h + 8, WALL_O);
      r(room.x - 2, room.y - 2, room.w + 4, room.h + 4, WALL_I);
      r(room.x - 2, room.y - 2, room.w + 4, 1, WALL_H);
      r(room.x, room.y, room.w, room.h, FLOOR);
      for (let gx = room.x + 8; gx < room.x + room.w; gx += 8) r(gx, room.y, 1, room.h, GRID);
      for (let gy = room.y + 8; gy < room.y + room.h; gy += 8) r(room.x, gy, room.w, 1, GRID);
      r(room.x, room.y, room.w, 10, hexA(room.color, 0.16));
      r(room.x, room.y + 10, room.w, 1, hexA(room.color, 0.7));
      // rivets
      for (const [vx, vy] of [[room.x - 3, room.y - 3], [room.x + room.w + 1, room.y - 3], [room.x - 3, room.y + room.h + 1], [room.x + room.w + 1, room.y + room.h + 1]]) r(vx, vy, 2, 2, WALL_H);
    }

    // corridors where the belt passes between rooms
    const hCorr = (x0, x1, y) => {
      r(x0, y - 7, x1 - x0, 14, FLOOR);
      r(x0, y - 8, x1 - x0, 1, WALL_I); r(x0, y + 7, x1 - x0, 1, WALL_I);
      r(x0, y - 9, x1 - x0, 1, WALL_O); r(x0, y + 8, x1 - x0, 1, WALL_O);
    };
    hCorr(118, 138, BY0); hCorr(246, 266, BY0);
    hCorr(118, 138, BY1); hCorr(246, 266, BY1);
    r(BX1 - 7, 114, 14, 26, FLOOR);
    r(BX1 - 8, 114, 1, 26, WALL_I); r(BX1 + 7, 114, 1, 26, WALL_I);
    r(BX1 - 9, 114, 1, 26, WALL_O); r(BX1 + 8, 114, 1, 26, WALL_O);

    // belt base
    const BELT = '#1c2134', EDGE = '#3a4260';
    r(BX0, BY0 - 4, SEG1 + 4, 8, BELT); r(BX0, BY0 - 5, SEG1 + 5, 1, EDGE); r(BX0, BY0 + 4, SEG1 - 4, 1, EDGE);
    r(BX1 - 4, BY0 - 4, 8, SEG2 + 8, BELT); r(BX1 + 4, BY0 - 5, 1, SEG2 + 10, EDGE); r(BX1 - 5, BY0 + 4, 1, SEG2 - 8, EDGE);
    r(BX0, BY1 - 4, SEG1 + 4, 8, BELT); r(BX0, BY1 + 4, SEG1 + 5, 1, EDGE); r(BX0, BY1 - 5, SEG1 - 4, 1, EDGE);

    // hatches: job feed (intake) and airlock (dock)
    const hatch = (y, col) => {
      r(6, y - 7, 10, 14, '#2c3247'); r(7, y - 6, 8, 12, '#0a0d18');
      r(7, y - 6, 8, 1, col); r(7, y + 5, 8, 1, col);
      for (let k = 0; k < 3; k++) r(9, y - 3 + k * 3, 4, 1, '#3a4260');
    };
    hatch(BY0, '#3be8ff'); hatch(BY1, '#5b8cff');

    // decorations
    const R0 = ROOMS;
    // intake: inbox trays
    for (let k = 0; k < 3; k++) { r(R0[0].x + 70 + k * 12, R0[0].y + 84, 9, 6, '#2f3752'); r(R0[0].x + 71 + k * 12, R0[0].y + 83, 7, 2, '#e8ecff'); }
    // research: bookshelf
    r(R0[1].x + 6, R0[1].y + 84, 40, 9, '#3b2f2a');
    const books = ['#41ff8a', '#3be8ff', '#ffa23b', '#ff4fd8', '#ffe14f', '#5b8cff'];
    for (let k = 0; k < 12; k++) r(R0[1].x + 8 + k * 3, R0[1].y + 85 + (k % 3 === 0 ? 1 : 0), 2, 6 - (k % 3 === 0 ? 1 : 0), books[k % books.length]);
    // analysis: wall display frame (bars animate per frame)
    r(R0[2].x + 8, R0[2].y + 84, 34, 10, '#59617a'); r(R0[2].x + 9, R0[2].y + 85, 32, 8, '#0a0d18');
    // plants
    const plant = (x, y) => {
      r(x, y + 5, 6, 4, '#7a4a2a'); r(x + 1, y + 9, 4, 1, '#5a3420');
      r(x + 1, y + 1, 4, 4, '#2fbf5a'); r(x, y + 2, 1, 2, '#2fbf5a'); r(x + 5, y + 2, 1, 2, '#2fbf5a'); r(x + 2, y, 2, 1, '#41ff8a');
    };
    plant(R0[3].x + 4, R0[3].y + 80); plant(R0[3].x + R0[3].w - 10, R0[3].y + 80);
    plant(R0[1].x + R0[1].w - 10, R0[1].y + 82); plant(R0[0].x + 4, R0[0].y + 34);
    // qa: server rack
    r(R0[4].x + R0[4].w - 14, R0[4].y + 64, 10, 24, '#2f3752');
    for (let k = 0; k < 5; k++) r(R0[4].x + R0[4].w - 13, R0[4].y + 66 + k * 4, 8, 2, '#0a0d18');
    // dock: shuttle pad
    r(R0[5].x + 74, R0[5].y + 34, 30, 24, '#1a2036');
    r(R0[5].x + 76, R0[5].y + 36, 26, 1, '#ffe14f'); r(R0[5].x + 76, R0[5].y + 55, 26, 1, '#ffe14f');
    r(R0[5].x + 84, R0[5].y + 40, 10, 14, '#dfe6f5'); r(R0[5].x + 86, R0[5].y + 38, 6, 2, '#dfe6f5');
    r(R0[5].x + 87, R0[5].y + 43, 4, 3, '#5b8cff'); r(R0[5].x + 82, R0[5].y + 50, 2, 4, '#ff5f6d'); r(R0[5].x + 94, R0[5].y + 50, 2, 4, '#ff5f6d');
    return c;
  }

  const bgLayer = makeBg();
  const staticLayer = makeStatic();
  const twinkles = Array.from({ length: 26 }, () => ({ x: randi(0, W - 1), y: randi(0, H - 1), p: rand(0, 6) }));

  // ---------- per-frame drawing ----------
  const r = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), w, h); };

  function drawDesk(a) {
    const x = a.deskX, ty = a.tableY, c = ROOMS[a.room].color;
    r(x - 9, ty, 18, 4, '#2f3752'); r(x - 9, ty + 4, 18, 1, '#1a1f30');
    r(x - 8, ty + 5, 1, 2, '#1a1f30'); r(x + 7, ty + 5, 1, 2, '#1a1f30');
    r(x - 5, ty - 7, 10, 7, '#59617a');
    const on = a.state === 'idle';
    r(x - 4, ty - 6, 8, 5, on ? '#0b1a16' : '#0a0d18');
    if (on) {
      const k = Math.floor(a.anim * 5);
      r(x - 3, ty - 5, 2 + (k % 5), 1, c);
      r(x - 3, ty - 3, 2 + ((k + 3) % 5), 1, hexA(c, 0.7));
    } else {
      r(x - 3, ty - 4, 1, 1, hexA(c, 0.35));
    }
  }

  function drawAgent(a) {
    const x = Math.round(a.x), y = Math.round(a.y), c = ROOMS[a.room].color;
    const moving = a.state === 'walk' || a.state === 'wander' || a.state === 'return';
    const step = moving ? Math.floor(a.anim * 8) % 2 : 0;
    const bob = a.state === 'work' ? Math.floor(a.anim * 6) % 2 : 0;
    r(x - 3, y, 7, 1, 'rgba(0,0,0,.5)');
    // legs
    r(x - 2, y - 3, 2, step ? 2 : 3, '#9aa3b8');
    r(x + 1, y - 3, 2, step ? 3 : 2, '#9aa3b8');
    // body
    r(x - 3, y - 6 - bob, 7, 3, c);
    r(x - 3, y - 4 - bob, 7, 1, 'rgba(0,0,0,.35)');
    // arms (raised and pumping while working)
    if (a.state === 'work') {
      const k = Math.floor(a.anim * 10) % 2;
      r(x - 4, y - 8 + k - bob, 1, 3, '#dfe6f5'); r(x + 4, y - 7 - k - bob, 1, 3, '#dfe6f5');
    } else {
      r(x - 4, y - 6 - bob, 1, 3, '#dfe6f5'); r(x + 4, y - 6 - bob, 1, 3, '#dfe6f5');
    }
    // helmet + visor
    r(x - 2, y - 10 - bob, 5, 1, '#dfe6f5');
    r(x - 3, y - 9 - bob, 7, 3, '#dfe6f5');
    r(x - 2 + (a.dir < 0 ? -1 : 1), y - 8 - bob, 4, 1, c);
    // antenna
    r(x, y - 12 - bob, 1, 2, '#9aa3b8');
    r(x, y - 13 - bob, 1, 1, Math.floor(a.anim * 2) % 2 ? c : '#ffffff');
  }

  function drawCrate(j) {
    const p = posAt(j.s), col = P.DELIVERABLES[j.type].color;
    const x = Math.round(p.x), y = Math.round(p.y);
    r(x - 4, y - 3, 8, 7, '#05040b');
    r(x - 3, y - 3, 7, 6, col);
    r(x - 3, y, 7, 1, 'rgba(0,0,0,.35)');
    r(x - 3, y - 3, 7, 1, 'rgba(255,255,255,.35)');
  }

  function drawStation(st) {
    const room = ROOMS[st.room], c = room.color, x = st.x, y = st.y;
    const busy = !!st.busy && st.busy.state === 'working';
    r(x - 7, y - 10, 14, 3, '#59617a');
    r(x - 7, y - 7, 2, 12, '#59617a'); r(x + 5, y - 7, 2, 12, '#59617a');
    r(x - 6, y - 9, 12, 1, '#7d86a3');
    const blink = Math.floor(t * 4) % 2;
    r(x - 3, y - 9, 2, 1, busy ? (blink ? c : '#ffffff') : hexA(c, 0.5));
    r(x + 1, y - 9, 2, 1, busy ? (blink ? '#ffffff' : c) : hexA(c, 0.5));
    if (busy) {
      const j = st.busy;
      const p = clamp(j.progress / j.workTime, 0, 1);
      r(x - 7, y - 14, 14, 3, '#05040b');
      r(x - 6, y - 13, Math.max(1, Math.round(12 * p)), 1, c);
      if (j.agent && j.agent.state === 'work' && Math.random() < 0.6) {
        r(x + randi(-4, 4), y + randi(-5, 2), 1, 1, Math.random() < 0.5 ? '#ffffff' : c);
      }
    }
  }

  let hovered = null, selected = null;

  function drawTag(a, col) {
    ctx.font = '4px "Press Start 2P", monospace';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    const w = Math.ceil(ctx.measureText(a.name).width) + 4;
    const x = Math.round(clamp(a.x - w / 2, 2, W - w - 2)), y = Math.round(a.y - 21);
    r(x, y, w, 7, '#05040b');
    r(x, y + 7, w, 1, col);
    ctx.fillStyle = col;
    ctx.fillText(a.name, x + 2, y + 2);
  }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bgLayer, 0, 0, W * S, H * S);
    ctx.drawImage(staticLayer, 0, 0, W * S, H * S);
    ctx.setTransform(S, 0, 0, S, 0, 0);

    for (const s of twinkles) {
      const v = (Math.sin(t * 2 + s.p) + 1) / 2;
      if (v > 0.75) r(s.x, s.y, 1, 1, `rgba(255,255,255,${(v - 0.75) * 4})`);
    }

    // belt rollers
    const off = (t * SPEED) % 6;
    for (let s = off; s < PATH_END; s += 6) {
      const p = posAt(s);
      if (s <= SEG1 || s > SEG1 + SEG2) r(p.x, p.y - 3, 1, 6, '#2a3150');
      else r(p.x - 3, p.y, 6, 1, '#2a3150');
    }

    // analysis wall display bars
    const ar = ROOMS[2];
    for (let k = 0; k < 7; k++) {
      const h = 1 + Math.round((Math.sin(t * 1.5 + k * 0.9) + 1) * 2.5);
      r(ar.x + 11 + k * 4, ar.y + 92 - h, 3, h, k % 2 ? '#ffa23b' : '#ffe14f');
    }

    for (const st of STATIONS) drawStation(st);
    for (const a of agents) if (ROOMS[a.room].row === 0) drawDesk(a);
    for (const j of jobs) drawCrate(j);
    const sorted = [...agents].sort((p, q) => p.y - q.y);
    for (const a of sorted) drawAgent(a);
    for (const a of agents) if (ROOMS[a.room].row === 1) drawDesk(a);

    // airlock flash on ship
    if (flash > 0) {
      r(4, BY1 - 9, 14, 18, `rgba(91,140,255,${flash * 0.8})`);
      r(0, BY1 - 1, 8, 2, `rgba(255,255,255,${flash})`);
    }

    // labels
    ctx.font = '5px "Press Start 2P", monospace';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    for (const room of ROOMS) {
      ctx.fillStyle = room.color;
      ctx.fillText(room.name, room.x + 3, room.y + 3);
    }
    ctx.fillStyle = '#41ff8a';
    ctx.fillText('PLATO CONSULTING // DELIVERY LINE 01', 8, 7);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#8790b8';
    ctx.fillText(`${jobs.length + pending.length} ON LINE`, W - 8, 7);
    ctx.textAlign = 'left';

    if (hovered && hovered !== selected) drawTag(hovered, '#dbe3ff');
    if (selected) {
      drawTag(selected, ROOMS[selected.room].color);
      const x = Math.round(selected.x), y = Math.round(selected.y), c = '#ffffff';
      r(x - 6, y - 15, 2, 1, c); r(x - 6, y - 15, 1, 2, c);
      r(x + 5, y - 15, 2, 1, c); r(x + 6, y - 15, 1, 2, c);
      r(x - 6, y + 2, 2, 1, c); r(x - 6, y + 1, 1, 2, c);
      r(x + 5, y + 2, 2, 1, c); r(x + 6, y + 1, 1, 2, c);
    }
  }

  // ---------- canvas sizing + input ----------
  function resize() {
    const cssW = cv.getBoundingClientRect().width || cv.parentElement.clientWidth || 1152;
    const dpr = window.devicePixelRatio || 1;
    S = Math.max(2, Math.round((cssW * dpr) / W));
    cv.width = W * S; cv.height = H * S;
  }
  window.addEventListener('resize', resize);
  resize();

  function agentAt(e) {
    const rect = cv.getBoundingClientRect();
    const ix = ((e.clientX - rect.left) / rect.width) * W;
    const iy = ((e.clientY - rect.top) / rect.height) * H;
    let best = null, bd = 99;
    for (const a of agents) {
      if (Math.abs(a.x - ix) <= 6 && iy >= a.y - 14 && iy <= a.y + 3) {
        const d = Math.abs(a.x - ix) + Math.abs(a.y - 6 - iy);
        if (d < bd) { bd = d; best = a; }
      }
    }
    return best;
  }
  cv.addEventListener('mousemove', (e) => { hovered = agentAt(e); cv.style.cursor = hovered ? 'pointer' : 'crosshair'; });
  cv.addEventListener('mouseleave', () => { hovered = null; });
  cv.addEventListener('click', (e) => { const a = agentAt(e); select(a || null); });

  function select(a) {
    selected = a;
    renderInspector();
    renderTiers();
  }

  // ---------- UI panels ----------
  const logEl = $('#log');
  function log(stage, text, isShip) {
    const room = ROOMS[stage];
    const div = document.createElement('div');
    if (isShip) div.className = 'ship';
    div.innerHTML = `<span class="t">${clockStr()}</span><span class="st" style="color:${room.color}">${esc(room.name.split(' ')[0].replace("'", ''))}</span><span>${esc(text)}</span>`;
    const atBottom = logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight < 30;
    logEl.appendChild(div);
    while (logEl.children.length > 120) logEl.firstChild.remove();
    if (atBottom) logEl.scrollTop = logEl.scrollHeight;
  }

  function renderInspector() {
    const el = $('#inspector');
    const a = selected;
    if (!a) {
      el.innerHTML = '<div class="insp-empty">Click any agent on the map, or a name in the rankings, to open their file.</div>';
      return;
    }
    const room = ROOMS[a.room];
    const task = a.job
      ? `${a.state === 'walk' ? 'Heading to' : 'Working'} ${jobId(a.job.id)}: ${P.DELIVERABLES[a.job.type].label} for ${a.job.client}`
      : 'No job right now. Waiting for the next crate.';
    el.innerHTML = `
      <div class="insp-top">
        <div class="avatar" style="background:${room.color}">${esc(a.name[0])}</div>
        <div><div class="insp-name" style="color:${room.color}">${esc(a.name)}</div><div class="insp-role">${esc(a.role)}</div></div>
      </div>
      <dl class="insp-rows">
        <dt>Station</dt><dd>${esc(room.name)}</dd>
        <dt>Status</dt><dd>${esc(statusText(a))}</dd>
        <dt>Jobs done</dt><dd>${a.done}</dd>
        <dt>Avg QA (demo)</dt><dd>${avgQ(a).toFixed(1)} / 100</dd>
        <dt>Tier</dt><dd>${tierOf(a)}</dd>
      </dl>
      <div class="insp-task">${esc(task)}</div>`;
  }

  const TIER_COLORS = { S: '#ff5f6d', A: '#ffa23b', B: '#ffe14f', C: '#41ff8a' };
  function renderTiers() {
    const el = $('#tiers');
    el.innerHTML = ['S', 'A', 'B', 'C'].map((tier) => {
      const list = agents.filter((a) => tierOf(a) === tier).sort((p, q) => avgQ(q) - avgQ(p));
      const chips = list.length
        ? list.map((a) => `<button type="button" class="chip${a === selected ? ' sel' : ''}" data-agent="${esc(a.name)}" style="border-color:${ROOMS[a.room].color}">${esc(a.name)}<b>${avgQ(a).toFixed(1)}</b></button>`).join('')
        : '<span class="tier-empty">nobody yet</span>';
      return `<div class="tier"><div class="tier-label" style="background:${TIER_COLORS[tier]}">${tier}</div><div class="tier-row">${chips}</div></div>`;
    }).join('');
  }
  $('#tiers').addEventListener('click', (e) => {
    const b = e.target.closest('[data-agent]');
    if (b) select(agents.find((a) => a.name === b.dataset.agent));
  });

  function renderShipped() {
    const el = $('#shipped');
    if (!shipped.length) {
      el.innerHTML = '<div class="ship-empty">Nothing shipped yet. The first deliverable lands in about a minute.</div>';
      return;
    }
    el.innerHTML = shipped.slice(0, 40).map((j) => {
      const d = P.DELIVERABLES[j.type];
      return `<button type="button" class="ship-item" data-job="${j.id}">
        <i style="background:${d.color}"></i>
        <span>${esc(d.label)}<small>${esc(j.client)} &middot; ${jobId(j.id)} &middot; ${j.shippedClock}</small></span>
        <span class="q">QA ${j.qa}</span>
      </button>`;
    }).join('');
  }
  $('#shipped').addEventListener('click', (e) => {
    const b = e.target.closest('[data-job]');
    if (b) openDoc(shipped.find((j) => j.id === Number(b.dataset.job)));
  });

  function updateKpis() {
    $('#kShipped').textContent = shipped.length;
    $('#kLine').textContent = jobs.length + pending.length;
    const n = Math.min(shipped.length, 20);
    $('#kCycle').textContent = n
      ? Math.round(shipped.slice(0, n).reduce((acc, j) => acc + (j.shippedAt - j.created), 0) / n) + 's'
      : '--';
    $('#kHours').textContent = hoursSaved;
    $('#queueHint').textContent = pending.length ? `${pending.length} queued` : '';
  }

  // ---------- deliverable preview ----------
  const STAGE_NAMES = ['Intake', 'Research', 'Analysis', 'Writing', 'QA', 'Delivery'];
  let openJob = null;
  function docData(j) {
    const d = P.DELIVERABLES[j.type];
    const v = { client: j.client, topic: j.topic };
    return {
      label: d.label, color: d.color,
      title: `${d.label}: ${j.client}`,
      date: new Date().toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' }),
      sections: d.sections.map(([h, b]) => [fill(h, v), fill(b, v)]),
      crew: j.crew.map((name, i) => `${STAGE_NAMES[i]}: ${name}`),
    };
  }
  function openDoc(j) {
    if (!j) return;
    openJob = j;
    const d = docData(j);
    $('#docBody').innerHTML = `
      <span class="tag" style="background:${d.color}">${esc(d.label.toUpperCase())}</span>
      <h2>${esc(d.title)}</h2>
      <div class="meta">Prepared by Plato Consulting LLC &middot; ${esc(d.date)} &middot; Job ${jobId(j.id)} &middot; QA ${j.qa}/100</div>
      <div class="note">Demo output. These are the section outlines the line produces; live mode will have Claude write the full content.</div>
      <p class="brief"><b>Brief:</b> ${esc(j.topic)}</p>
      ${d.sections.map(([h, b]) => `<h3>${esc(h.toUpperCase())}</h3><p>${esc(b)}</p>`).join('')}
      <div class="crew">Crew &middot; ${esc(d.crew.join('  >  '))}</div>`;
    const dlg = $('#doc');
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  }
  function closeDoc() { const dlg = $('#doc'); if (dlg.open) dlg.close ? dlg.close() : dlg.removeAttribute('open'); }
  $('#docClose').addEventListener('click', closeDoc);
  $('#doc').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeDoc(); });
  $('#docDownload').addEventListener('click', () => {
    if (!openJob) return;
    const j = openJob, d = docData(j);
    const md = [
      `# ${d.title}`, '',
      `Prepared by Plato Consulting LLC, ${d.date}. Job ${jobId(j.id)}. QA ${j.qa}/100.`, '',
      `> Demo output. Section outlines only; live mode will have Claude write the full content.`, '',
      `**Brief:** ${j.topic}`, '',
      ...d.sections.flatMap(([h, b]) => [`## ${h}`, '', b, '']),
      `---`, '', `Crew: ${d.crew.join(' > ')}`, '',
    ].join('\n');
    const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${d.label}-${j.client}`.replace(/[^\w-]+/g, '-').replace(/-+/g, '-') + '.md';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  // ---------- form ----------
  const fType = $('#fType');
  fType.innerHTML = Object.entries(P.DELIVERABLES).map(([k, d]) => `<option value="${k}">${esc(d.label)}</option>`).join('');
  $('#legend').innerHTML = Object.values(P.DELIVERABLES).map((d) => `<span><i style="background:${d.color}"></i>${esc(d.label)}</span>`).join('');
  $('#jobForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const client = $('#fClient').value.trim();
    if (!client) { $('#fClient').focus(); return; }
    submitJob(makeJob(fType.value, client, $('#fBrief').value));
    $('#fBrief').value = '';
    const btn = e.target.querySelector('.run');
    btn.classList.remove('sent'); void btn.offsetWidth; btn.classList.add('sent');
  });

  // ---------- boot ----------
  // Two jobs already in flight so the line is busy on first load.
  const warm = makeJob('proposal', 'Northwind Logistics');
  warm.s = STATIONS[1].s; warm.stage = 1; warm.crew[0] = 'HERMES'; warm.created = -12;
  jobs.push(warm);
  submitJob(makeJob('research', 'Blue Mesa Clinics'), true);
  log(0, 'Line online. 10 agents at their stations.');

  renderInspector();
  renderTiers();
  renderShipped();
  updateKpis();

  function tick(dt) {
    t += dt;
    releasePending();
    stepJobs(dt);
    for (const a of agents) stepAgent(a, dt);
    autopilot(dt);
    flash = Math.max(0, flash - dt * 1.5);
  }

  // Test switch: open index.html#ff=180 to fast-forward 180 seconds of line time on load.
  const ff = /#ff=(\d+)/.exec(location.hash);
  if (ff) for (let i = 0, n = Math.min(3600, Number(ff[1])) * 20; i < n; i++) tick(0.05);
  if (/doc/.test(location.hash) && shipped.length) openDoc(shipped[0]);

  let last = performance.now(), uiT = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    tick(dt);
    uiT -= dt;
    if (uiT <= 0) {
      uiT = 0.5;
      $('#clock').textContent = clockStr();
      updateKpis();
      if (selected) renderInspector();
    }
    draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
