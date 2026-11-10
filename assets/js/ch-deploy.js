/* ch-deploy.js — 第 5–9 章：跨攝影機、未知人員、資料集、缺口與實驗、參考文獻 */
(function (global) {
  'use strict';
  var D = global.DATA, PM = global.PersonModel, el = U.el, $ = U.$;
  var CH = global.CH = global.CH || {};

  /* ======================= 5 跨攝影機 ======================= */
  var FACTORS = [
    { k: 'light', n: '光照／色偏' },
    { k: 'lowres', n: '遠距低解析' },
    { k: 'occ', n: '遮擋' },
    { k: 'blur', n: '動態模糊／壓縮' },
    { k: 'short', n: '軌跡只有幾幀' }
  ];
  var HEALTH_CUES = [
    { k: 'app', n: '外觀', c: '#2a78d6', base: 0.35 },
    { k: 'face', n: '臉部', c: '#6250d6', base: 1 },
    { k: 'skel', n: '骨架', c: '#eb6834', base: 1 },
    { k: 'sil', n: '輪廓', c: '#1baf7a', base: 1 },
    { k: 'gait', n: '步態', c: '#d55181', base: 1 },
    { k: 'anthro', n: '人體比例', c: '#9a7b12', base: 1 }
  ];
  var PEN = {
    light: { app: 0.45, face: 0.2, skel: 0.05, sil: 0.1, gait: 0.05, anthro: 0 },
    lowres: { app: 0.25, face: 0.9, skel: 0.55, sil: 0.3, gait: 0.3, anthro: 0.5 },
    occ: { app: 0.3, face: 0, skel: 0.5, sil: 0.5, gait: 0.45, anthro: 0.6 },
    blur: { app: 0.15, face: 0.4, skel: 0.25, sil: 0.2, gait: 0.15, anthro: 0.2 },
    short: { app: 0, face: 0, skel: 0.2, sil: 0.1, gait: 0.9, anthro: 0.05 }
  };
  var VIEW_PEN = { app: 0.25, face: 0.5, skel: 0.2, sil: 0.35, gait: 0.4, anthro: 0.25 };
  var cam = { on: {}, yaw: 0, t: 0, raf: 0 };

  CH.camera = {
    init: function () {
      var chips = $('#cam-factors');
      FACTORS.forEach(function (f) {
        var b = U.h('button', { class: 'chip', 'aria-pressed': 'false' }, f.n);
        b.addEventListener('click', function () { cam.on[f.k] = !cam.on[f.k]; b.setAttribute('aria-pressed', !!cam.on[f.k]); drawCams(); drawHealth(); });
        chips.appendChild(b);
      });
      $('#yaw').addEventListener('input', function (e) { cam.yaw = +e.target.value; $('#yaw-out').textContent = cam.yaw + '°'; drawCams(); drawHealth(); });
      drawCams(); drawHealth(); drawProtocols(); drawSynth();
    },
    enter: function () {
      if (U.reduceMotion || cam.raf) return;
      var last = performance.now();
      function step(now) {
        cam.raf = 0;
        if (!document.getElementById('ch-camera').classList.contains('active')) return;
        cam.t += Math.min(0.05, (now - last) / 1000); last = now;
        drawCams();
        cam.raf = requestAnimationFrame(step);
      }
      cam.raf = requestAnimationFrame(step);
    },
    leave: function () { cancelAnimationFrame(cam.raf); cam.raf = 0; }
  };

  var off = document.createElement('canvas');
  function scene(ctx, w, h, yaw, opts) {
    ctx.save();
    ctx.fillStyle = '#d7dccf'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#c3c9b9'; ctx.fillRect(0, h * 0.72, w, h * 0.28);
    ctx.strokeStyle = '#aab19f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, h * 0.72); ctx.lineTo(w, h * 0.72); ctx.stroke();
    // 牆面線條（給視角感）
    ctx.strokeStyle = '#c8cdbf'; ctx.lineWidth = 1;
    for (var i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(i * w / 6, 0); ctx.lineTo(i * w / 6, h * 0.72); ctx.stroke(); }
    var p = global.PEOPLE[2];
    var phi = p.phase0 + 2 * Math.PI * 0.95 * p.cadence * cam.t;
    var view = { yaw: yaw, pitch: 0.18, scale: h * 0.74, x: w * 0.5, y: h * 0.9 };
    if (opts.blur && 'filter' in ctx) ctx.filter = 'blur(2px)';
    PM.renderCanvas(ctx, PM.parts(p, phi, view, 'rgb'), {});
    ctx.filter = 'none';
    if (opts.occ) {
      ctx.fillStyle = '#7d705a'; ctx.fillRect(w * 0.22, h * 0.58, w * 0.56, h * 0.4);
      ctx.fillStyle = '#6a5f4b'; ctx.fillRect(w * 0.22, h * 0.58, w * 0.56, 6);
    }
    if (opts.light) {
      ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(255,170,90,0.55)'; ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = 'rgba(20,10,0,0.18)'; ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }
  function drawCams() {
    var a = $('#cam-a'), b = $('#cam-b');
    var ca = a.getContext('2d');
    scene(ca, a.width, a.height, 0.5, {});
    var cb = b.getContext('2d');
    var yaw = 0.5 + cam.yaw * Math.PI / 180;
    if (cam.on.lowres) {
      off.width = 40; off.height = 30;
      var co = off.getContext('2d');
      co.save(); co.scale(40 / b.width, 30 / b.height);
      scene(co, b.width, b.height, yaw, cam.on);
      co.restore();
      cb.imageSmoothingEnabled = false;
      cb.clearRect(0, 0, b.width, b.height);
      cb.drawImage(off, 0, 0, b.width, b.height);
    } else {
      scene(cb, b.width, b.height, yaw, cam.on);
    }
    if (cam.on.short) {
      cb.fillStyle = 'rgba(28,37,31,.8)'; cb.fillRect(8, 8, 128, 24);
      cb.fillStyle = '#fff'; cb.font = '13px sans-serif'; cb.fillText('只有 3 幀可用', 16, 25);
    }
  }
  function health() {
    return HEALTH_CUES.map(function (c) {
      var v = c.base;
      FACTORS.forEach(function (f) { if (cam.on[f.k]) v *= 1 - PEN[f.k][c.k]; });
      var vd = Math.min(cam.yaw, 180 - cam.yaw * 0.5) / 90; // 0–1
      v *= 1 - VIEW_PEN[c.k] * U.clamp(vd, 0, 1);
      return { c: c, v: v };
    });
  }
  function drawHealth() {
    var svg = U.clear($('#cue-health'));
    var L = 82, W = 270;
    [0, 0.5, 1].forEach(function (t) {
      el('line', { x1: L + t * W, x2: L + t * W, y1: 8, y2: 262, stroke: 'var(--rule-2)' }, svg);
      el('text', { x: L + t * W, y: 278, 'text-anchor': 'middle', 'font-size': 11.5, fill: 'var(--ink-3)', class: 'num', text: (t * 100) + '%' }, svg);
    });
    health().forEach(function (r, i) {
      var y = 14 + i * 42;
      el('text', { x: L - 10, y: y + 15, 'text-anchor': 'end', 'font-size': 13.5, fill: 'var(--ink)', text: r.c.n }, svg);
      el('rect', { x: L, y: y, width: Math.max(2, r.v * W), height: 22, rx: 3, fill: r.c.c }, svg);
      el('text', { x: L + r.v * W + 6, y: y + 16, 'font-size': 12.5, fill: 'var(--ink)', class: 'num', text: Math.round(r.v * 100) + '%' }, svg);
      if (r.c.k === 'app') el('text', { x: L, y: y + 36, 'font-size': 11, fill: 'var(--ink-3)', text: '同制服下本來就只剩 35%' }, svg);
    });
    el('text', { x: 0, y: 296, 'font-size': 11.5, fill: 'var(--ink-3)', text: '可用程度 = 基準 × Π(1 − 各條件扣減)' }, svg);
  }

  function tw(t) { var w = 26; for (var i = 0; i < t.length; i++) w += t.charCodeAt(i) > 255 ? 13 : 7.4; return w; }
  function drawProtocols() {
    var svg = $('#protocols');
    var rows = [
      { id: 'A', n: '同域', tr: ['FGPR'], te: ['FGPR'], q: '程式與方法是否正確', diff: 1 },
      { id: 'B', n: '跨資料集', tr: ['Gait3D', 'CCGR'], te: ['FGPR', 'Industrial-Gait'], q: '換場域後是否崩潰', diff: 3 },
      { id: 'C', n: '合成 → 真實', tr: ['FG-PersonX'], te: ['FGPR', 'Industrial-Gait', 'ConstrID'], q: '合成制服資料是否可轉移', diff: 3 },
      { id: 'D', n: '留一攝影機', tr: ['攝影機 1 … N−1'], te: ['沒看過的攝影機 N'], q: '新攝影機是否可用', diff: 4 }
    ];
    el('text', { x: 76, y: 18, 'font-size': 12.5, fill: 'var(--ink-3)', text: '訓練' }, svg);
    el('text', { x: 400, y: 18, 'font-size': 12.5, fill: 'var(--ink-3)', text: '測試' }, svg);
    el('text', { x: 760, y: 18, 'font-size': 12.5, fill: 'var(--ink-3)', text: '回答的問題 · 接近部署程度' }, svg);
    rows.forEach(function (r, i) {
      var y = 46 + i * 64;
      el('text', { x: 0, y: y + 5, 'font-size': 18, 'font-weight': 700, fill: 'var(--olive)', class: 'num', text: r.id }, svg);
      el('text', { x: 0, y: y + 24, 'font-size': 12, fill: 'var(--ink-2)', text: r.n }, svg);
      var x = 76;
      r.tr.forEach(function (t) { var w = tw(t); el('rect', { x: x, y: y - 12, width: w, height: 26, rx: 13, fill: '#fff', stroke: 'var(--olive)', 'stroke-width': 1.5 }, svg); el('text', { x: x + w / 2, y: y + 5, 'text-anchor': 'middle', 'font-size': 12.5, fill: 'var(--ink)', text: t }, svg); x += w + 8; });
      global.svgArrow(svg, Math.max(x, 300), y + 1, 390, y + 1);
      x = 400;
      r.te.forEach(function (t) { var w = tw(t); el('rect', { x: x, y: y - 12, width: w, height: 26, rx: 13, fill: 'var(--ink)' }, svg); el('text', { x: x + w / 2, y: y + 5, 'text-anchor': 'middle', 'font-size': 12.5, fill: '#fff', text: t }, svg); x += w + 8; });
      el('text', { x: 760, y: y + 5, 'font-size': 13, fill: 'var(--ink)', text: r.q }, svg);
      for (var k = 0; k < 4; k++) el('rect', { x: 760 + k * 22, y: y + 14, width: 18, height: 6, rx: 2, fill: k < r.diff ? 'var(--olive)' : 'var(--rule-2)' }, svg);
    });
  }

  function drawSynth() {
    var svg = $('#synth');
    var levels = ['不可', '不建議', '高', '非常高'];
    var rows = [['大量預訓練', 2], ['罕見條件擴增', 2], ['同制服困難負樣本', 3], ['因果消融：固定衣服只改體型/視角', 3], ['領域適應的來源', 2], ['當作唯一的最終基準', 1], ['宣稱「可部署」', 0]];
    var L = 290, cw = 150;
    levels.forEach(function (n, j) {
      el('text', { x: L + j * cw + cw / 2, y: 18, 'text-anchor': 'middle', 'font-size': 12.5, fill: j < 2 ? 'var(--bad)' : 'var(--good)', 'font-weight': 700, text: n }, svg);
    });
    rows.forEach(function (r, i) {
      var y = 44 + i * 34;
      el('line', { x1: L, x2: L + cw * 4, y1: y, y2: y, stroke: 'var(--rule-2)' }, svg);
      el('text', { x: L - 14, y: y + 5, 'text-anchor': 'end', 'font-size': 13.5, fill: 'var(--ink)', text: r[0] }, svg);
      var cx = L + r[1] * cw + cw / 2;
      el('circle', { cx: cx, cy: y, r: 8, fill: r[1] >= 2 ? 'var(--good)' : 'var(--bad)' }, svg);
      el('text', { x: cx, y: y + 4, 'text-anchor': 'middle', 'font-size': 11, fill: '#fff', 'font-weight': 700, text: r[1] >= 2 ? '✓' : '✕' }, svg);
    });
  }

  /* ======================= 6 未知人員 ======================= */
  var os = { feat: 'app' };
  CH.openset = {
    init: function () {
      os.feat = U.segGroup($('#os-feat'), 'data-f', function (v) { os.feat = v; drawOS(); });
      $('#tau').addEventListener('input', drawOS);
      $('#os-uni').addEventListener('input', drawOS);
      drawOS(); drawFlow();
    }
  };
  function osDists(u) {
    if (os.feat === 'app') { var im = 0.28 + 0.30 * u; return { g: [0.74, 0.07], i: [im, 0.08], k: [Math.min(0.9, im + 0.1), 0.06] }; }
    var im2 = 0.28 + 0.16 * u; return { g: [0.76, 0.06], i: [im2, 0.08], k: [im2 + 0.1, 0.06] };
  }
  function drawOS() {
    var tau = +$('#tau').value, u = +$('#os-uni').value;
    $('#tau-out').textContent = tau.toFixed(2); $('#os-uni-out').textContent = u.toFixed(2);
    var d = osDists(u);
    var svg = U.clear($('#os-svg'));
    var L = 40, R = 585, T = 44, B = 290;
    function X(v) { return L + v * (R - L); }
    var ymax = 7;
    function Y(v) { return B - v / ymax * (B - T); }
    [0, 0.2, 0.4, 0.6, 0.8, 1].forEach(function (v) {
      el('line', { x1: X(v), x2: X(v), y1: T, y2: B, stroke: 'var(--rule-2)' }, svg);
      el('text', { x: X(v), y: B + 16, 'text-anchor': 'middle', 'font-size': 11.5, fill: 'var(--ink-3)', class: 'num', text: v.toFixed(1) }, svg);
    });
    el('line', { x1: L, x2: R, y1: B, y2: B, stroke: 'var(--ink-3)' }, svg);
    el('text', { x: (L + R) / 2, y: B + 36, 'text-anchor': 'middle', 'font-size': 12.5, fill: 'var(--ink-2)', text: '與 gallery 最佳候選的相似度' }, svg);
    var curves = [
      { key: 'i', n: '冒充者（不同人）', c: '#9aa39b', dash: '5 4' },
      { key: 'k', n: '未知人員的最高分', c: '#c93434' },
      { key: 'g', n: '本人', c: '#1c251f' }
    ];
    curves.forEach(function (cv) {
      var m = d[cv.key][0], s = d[cv.key][1], pts = [], area = [];
      for (var v = 0; v <= 1.0001; v += 0.005) {
        var y = U.npdf(v, m, s);
        pts.push(X(v).toFixed(1) + ',' + Y(Math.min(y, ymax)).toFixed(1));
        if (v >= tau && (cv.key === 'g' || cv.key === 'k')) area.push([X(v), Y(Math.min(y, ymax))]);
      }
      if (area.length) {
        var dd = 'M' + area[0][0] + ' ' + B + area.map(function (a) { return 'L' + a[0].toFixed(1) + ' ' + a[1].toFixed(1); }).join('') + 'L' + area[area.length - 1][0] + ' ' + B + 'Z';
        el('path', { d: dd, fill: cv.c, opacity: cv.key === 'g' ? 0.12 : 0.22 }, svg);
      }
      el('polyline', { points: pts.join(' '), fill: 'none', stroke: cv.c, 'stroke-width': 2, 'stroke-dasharray': cv.dash || null }, svg);
    });
    // 閾值
    el('line', { x1: X(tau), x2: X(tau), y1: T, y2: B, stroke: 'var(--ink)', 'stroke-width': 1.6 }, svg);
    el('text', { x: X(tau) + (tau > 0.62 ? -6 : 6), 'text-anchor': tau > 0.62 ? 'end' : 'start', y: T + 12, 'font-size': 12.5, fill: 'var(--ink)', text: 'τ（高於才接受）' }, svg);
    // 圖例
    curves.forEach(function (cv, i) {
      var x = L + 4 + i * 180;
      el('line', { x1: x, x2: x + 22, y1: 12, y2: 12, stroke: cv.c, 'stroke-width': 2.4, 'stroke-dasharray': cv.dash || null }, svg);
      el('text', { x: x + 28, y: 16, 'font-size': 12.5, fill: 'var(--ink-2)', text: cv.n }, svg);
    });
    var tar = 1 - U.ncdf(tau, d.g[0], d.g[1]), far = 1 - U.ncdf(tau, d.k[0], d.k[1]);
    $('#tar').textContent = U.pct(tar); $('#far').textContent = U.pct(far);
    $('#far').style.color = far > 0.2 ? 'var(--bad)' : 'var(--ink)';
    var note;
    if (far > 0.3 && tar > 0.8) note = '閾值太低：大部分已知人員會通過，但有相當比例的陌生人也會被當成某個已知人員。同制服把「未知人員最高分」推得更靠右。';
    else if (tar < 0.6) note = '閾值太高：陌生人幾乎都被擋下，但已知人員也常被拒絕，需要人工確認的量會很大。';
    else note = '這是一個取捨點。實務上會先固定可接受的誤認率（例如 FAR ≤ 1%），再看能保住多少已知人員（DIR@FAR）。';
    if (os.feat === 'fused') note += ' 加入步態後，冒充者分布不再隨制服相似度大幅右移，同一個 τ 下兩個指標都改善——前提是步態品質可用（示意）。';
    $('#os-note').textContent = note;
  }
  function drawFlow() {
    var svg = $('#os-flow'), A = global.svgArrow;
    function node(x, y, w, t, sub, fill, color) {
      el('rect', { x: x, y: y, width: w, height: 50, rx: 8, fill: fill || '#fff', stroke: color || 'var(--ink-3)', 'stroke-width': 1.3 }, svg);
      el('text', { x: x + w / 2, y: y + (sub ? 22 : 30), 'text-anchor': 'middle', 'font-size': 13.5, 'font-weight': 700, fill: fill === 'var(--ink)' ? '#fff' : 'var(--ink)', text: t }, svg);
      if (sub) el('text', { x: x + w / 2, y: y + 39, 'text-anchor': 'middle', 'font-size': 11.5, fill: fill === 'var(--ink)' ? '#dfe3d3' : 'var(--ink-3)', text: sub }, svg);
    }
    function diamond(cx, cy, t) {
      el('path', { d: 'M' + cx + ' ' + (cy - 32) + 'L' + (cx + 66) + ' ' + cy + 'L' + cx + ' ' + (cy + 32) + 'L' + (cx - 66) + ' ' + cy + 'Z', fill: '#fff', stroke: 'var(--ink)', 'stroke-width': 1.3 }, svg);
      el('text', { x: cx, y: cy + 5, 'text-anchor': 'middle', 'font-size': 12.5, fill: 'var(--ink)', text: t }, svg);
    }
    node(0, 60, 110, 'Query 軌跡', '多幀');
    A(svg, 110, 85, 140, 85);
    diamond(208, 85, '品質足夠？');
    A(svg, 208, 117, 208, 168);
    el('text', { x: 216, y: 146, 'font-size': 12, fill: 'var(--bad)', text: '否' }, svg);
    node(130, 170, 156, '等待更多幀', '或交人工確認', '#fbefe9', 'var(--serious, #c93434)');
    A(svg, 274, 85, 316, 85);
    el('text', { x: 282, y: 76, 'font-size': 12, fill: 'var(--good)', text: '是' }, svg);
    node(318, 60, 140, '品質門控融合', '可用的線索才參與');
    A(svg, 458, 85, 488, 85);
    node(490, 60, 120, 'Top-K 檢索', 'gallery');
    A(svg, 610, 85, 640, 85);
    diamond(708, 85, '分數 > τ ？');
    A(svg, 774, 85, 818, 85);
    el('text', { x: 782, y: 76, 'font-size': 12, fill: 'var(--good)', text: '是' }, svg);
    node(820, 60, 136, '已知身分', '輸出 ID + 信心', 'var(--ink)');
    A(svg, 708, 117, 708, 168);
    el('text', { x: 716, y: 146, 'font-size': 12, fill: 'var(--bad)', text: '否' }, svg);
    node(626, 170, 164, '未知人員', '建立暫時 ID、提醒', '#fbefe9', '#c93434');
  }

  /* ======================= 7 資料集 ======================= */
  var dsFilter = 'all', dsSel = 'industrial', dsSort = { k: 'sim', dir: -1 };
  var TYPE_C = { '真實': '#48544b', '合成': '#9a7b12', '混合': '#2a78d6' };
  var FILTERS = [
    { k: 'all', n: '全部', f: function () { return true; } },
    { k: 'gait', n: '可做步態', f: function (d) { return d.tech.gait >= 2; } },
    { k: 'skel', n: '有骨架', f: function (d) { return d.tech.skel >= 2; } },
    { k: 'uni', n: '同制服導向', f: function (d) { return d.tech.uni >= 2; } }
  ];
  CH.datasets = {
    init: function () {
      var chips = $('#ds-filter');
      FILTERS.forEach(function (f) {
        var b = U.h('button', { class: 'chip', 'aria-pressed': f.k === 'all' ? 'true' : 'false' }, f.n);
        b.addEventListener('click', function () { dsFilter = f.k; U.$$('button', chips).forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); drawDsMap(); });
        chips.appendChild(b);
      });
      drawDsMap(); drawDsDetail(); drawDsMatrix(); drawDsTable();
    }
  };
  function drawDsMap() {
    var svg = U.clear($('#ds-map'));
    var L = 110, R = 890, T = 24, B = 400;
    function X(s) { return L + 60 + (s - 1) / 4 * (R - L - 120); }
    function Y(r) { return B - 20 - r / 4 * (B - T - 50); }
    el('rect', { x: (X(4) + X(5)) / 2 + 20, y: T, width: R - (X(4) + X(5)) / 2 - 20, height: (Y(2) + Y(3)) / 2 - T, fill: '#e3e8d6', rx: 6 }, svg);
    el('text', { x: R - 10, y: (Y(2) + Y(3)) / 2 - 10, 'text-anchor': 'end', 'font-size': 13, fill: 'var(--olive)', 'font-weight': 700, text: '最像軍營' }, svg);
    for (var s = 1; s <= 5; s++) {
      el('line', { x1: X(s), x2: X(s), y1: T, y2: B, stroke: 'var(--rule-2)' }, svg);
      el('text', { x: X(s), y: B + 20, 'text-anchor': 'middle', 'font-size': 13, fill: 'var(--ink-3)', text: '★'.repeat(s) }, svg);
    }
    ['合成', '受控', '半受控', '真實', '真實監視器'].forEach(function (n, r) {
      el('line', { x1: L, x2: R, y1: Y(r), y2: Y(r), stroke: 'var(--rule-2)' }, svg);
      el('text', { x: L - 10, y: Y(r) + 4, 'text-anchor': 'end', 'font-size': 13, fill: 'var(--ink-2)', text: n }, svg);
    });
    el('text', { x: (L + R) / 2, y: B + 44, 'text-anchor': 'middle', 'font-size': 13, fill: 'var(--ink-2)', text: '與軍營同制服情境的相似度 →' }, svg);
    el('text', { x: 10, y: T - 6, 'font-size': 13, fill: 'var(--ink-2)', text: '監視器真實度 ↑' }, svg);
    var groups = {};
    D.DATASETS.forEach(function (d) { var k = d.sim + '-' + d.real; (groups[k] = groups[k] || []).push(d); });
    var flt = FILTERS.filter(function (f) { return f.k === dsFilter; })[0].f;
    function rad(d) { return 7 + Math.sqrt(d.ids / 4000) * 26; }
    Object.keys(groups).forEach(function (k) {
      var g = groups[k], tot = 0, xs = [];
      g.forEach(function (d, i) { if (i) tot += 18; xs.push(tot + rad(d)); tot += 2 * rad(d); });
      g.forEach(function (d, i) {
        var r = rad(d);
        var cx = X(d.sim) + xs[i] - tot / 2, cy = Y(d.real);
        if (cx + r > R - 4) cx = R - 4 - r - (g.length - 1 - i) * 0;
        var grp = el('g', { tabindex: 0, role: 'button', 'aria-label': d.name, style: 'cursor:pointer', opacity: flt(d) ? 1 : 0.15 }, svg);
        el('circle', { cx: cx, cy: cy, r: r, fill: TYPE_C[d.type], 'fill-opacity': 0.82, stroke: d.id === dsSel ? 'var(--ink)' : '#fff', 'stroke-width': d.id === dsSel ? 2.5 : 1.5 }, grp);
        if (d.verify) el('circle', { cx: cx, cy: cy, r: r + 3.5, fill: 'none', stroke: 'var(--ink-2)', 'stroke-dasharray': '3 3' }, grp);
        var below = g.length > 1 && i % 2 === 1;
        el('text', { x: cx, y: below ? cy + r + 17 : cy - r - 8, 'text-anchor': 'middle', 'font-size': 13, fill: 'var(--ink)', 'font-weight': d.id === dsSel ? 700 : 400, text: d.name }, grp);
        U.tip(grp, '<b>' + d.name + '</b>（' + d.year + '）<br>' + d.ids.toLocaleString() + ' 人 · ' + d.uniform);
        function go() { dsSel = d.id; drawDsMap(); drawDsDetail(); drawDsTable(); }
        grp.addEventListener('click', go);
        grp.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      });
    });
    var lx = L;
    Object.keys(TYPE_C).forEach(function (t) {
      el('circle', { cx: lx + 6, cy: B + 64, r: 6, fill: TYPE_C[t] }, svg);
      el('text', { x: lx + 16, y: B + 68, 'font-size': 13, fill: 'var(--ink-2)', text: t }, svg); lx += 72;
    });
    el('circle', { cx: lx + 10, cy: B + 64, r: 7, fill: 'none', stroke: 'var(--ink-2)', 'stroke-dasharray': '3 3' }, svg);
    el('text', { x: lx + 22, y: B + 68, 'font-size': 13, fill: 'var(--ink-2)', text: '2026 待核對' }, svg);
    el('text', { x: R, y: B + 68, 'text-anchor': 'end', 'font-size': 12.5, fill: 'var(--ink-3)', text: '點圓圈看詳細資料' }, svg);
  }
  function drawDsDetail() {
    var d = D.DATASETS.filter(function (x) { return x.id === dsSel; })[0];
    $('#ds-detail').innerHTML = '<h3>' + d.name + ' <span class="small muted">' + d.year + ' · ' + d.type + '</span></h3>' +
      (d.verify ? '<p class="small" style="color:var(--warn);margin:0">2026 文獻：數字取自前次報告，待回原文核對</p>' : '') +
      '<dl><dt>人數</dt><dd class="num">' + d.ids.toLocaleString() + '</dd><dt>攝影機/視角</dt><dd>' + d.cams + '</dd><dt>規模</dt><dd>' + d.size + '</dd>' +
      '<dt>服裝設定</dt><dd>' + d.uniform + '</dd><dt>模態</dt><dd>' + d.mod + '</dd><dt>取得方式</dt><dd>' + d.access + '</dd><dt>主要限制</dt><dd>' + d.limit + '</dd>' +
      '<dt>軍營相似度</dt><dd>' + '★'.repeat(d.sim) + '<span class="muted">' + '★'.repeat(5 - d.sim) + '</span></dd></dl>';
  }
  function glyph(v) {
    if (v === 2) return '<svg class="glyph" viewBox="0 0 16 16" aria-label="原生支援"><circle cx="8" cy="8" r="6" fill="var(--ink)"/></svg>';
    if (v === 1) return '<svg class="glyph" viewBox="0 0 16 16" aria-label="可衍生"><circle cx="8" cy="8" r="5.5" fill="none" stroke="var(--ink)" stroke-width="1.6"/></svg>';
    if (v === 0) return '<svg class="glyph" viewBox="0 0 16 16" aria-label="價值有限"><path d="M3 13L13 3" stroke="var(--ink-3)" stroke-width="1.6"/></svg>';
    if (v === 3) return '<span class="tag" style="background:var(--olive);color:#fff;border-color:var(--olive);margin:0">研究空缺</span>';
    return '<span class="muted" aria-label="不適合">—</span>';
  }
  function drawDsMatrix() {
    var h = '<thead><tr><th>資料集</th>' + D.TECH_COLS.map(function (c) { return '<th class="cell">' + c.n + '</th>'; }).join('') + '</tr></thead><tbody>';
    D.DATASETS.forEach(function (d) {
      h += '<tr><td><b>' + d.name + '</b>' + (d.verify ? ' <span class="small" style="color:var(--warn)">待核對</span>' : '') + '</td>' + D.TECH_COLS.map(function (c) { return '<td class="cell">' + glyph(d.tech[c.k]) + '</td>'; }).join('') + '</tr>';
    });
    $('#ds-matrix').innerHTML = h + '</tbody>';
  }
  function drawDsTable() {
    var cols = [['name', '資料集'], ['year', '年份', 'num'], ['type', '類型'], ['ids', '人數', 'num'], ['cams', '攝影機/視角'], ['size', '規模'], ['uniform', '服裝設定'], ['mod', '模態'], ['access', '取得'], ['sim', '軍營相似度', 'num']];
    var list = D.DATASETS.slice().sort(function (a, b) { var x = a[dsSort.k], y = b[dsSort.k]; return (x > y ? 1 : x < y ? -1 : 0) * dsSort.dir; });
    var h = '<thead><tr>' + cols.map(function (c) { var arrow = dsSort.k === c[0] ? (dsSort.dir > 0 ? ' ▲' : ' ▼') : ''; return '<th class="' + (c[2] || '') + '" aria-sort="' + (dsSort.k === c[0] ? (dsSort.dir > 0 ? 'ascending' : 'descending') : 'none') + '"><button data-k="' + c[0] + '">' + c[1] + arrow + '</button></th>'; }).join('') + '</tr></thead><tbody>';
    list.forEach(function (d) {
      h += '<tr' + (d.id === dsSel ? ' class="sel"' : '') + '>' + cols.map(function (c) {
        var v = d[c[0]];
        if (c[0] === 'ids') v = v.toLocaleString();
        if (c[0] === 'sim') v = '★'.repeat(d.sim);
        if (c[0] === 'name') v = '<b>' + v + '</b>' + (d.verify ? ' <span class="small" style="color:var(--warn)">待核對</span>' : '');
        return '<td class="' + (c[2] || '') + '">' + v + '</td>';
      }).join('') + '</tr>';
    });
    var t = $('#ds-table'); t.innerHTML = h + '</tbody>';
    U.$$('th button', t).forEach(function (b) { b.addEventListener('click', function () { var k = b.getAttribute('data-k'); dsSort = { k: k, dir: dsSort.k === k ? -dsSort.dir : -1 }; drawDsTable(); }); });
  }

  /* ======================= 8 缺口與實驗 ======================= */
  var PHASES = [
    { id: 'A', n: '能跑的基準', d: '偵測 → 追蹤 → 軌跡層級 CLIP-ReID / TransReID → Top-K 檢索。先知道「純外觀能做到哪裡」。你現有的 YOLOv7 + FastReID / CLIP-ReID 就在這一層。' },
    { id: 'B', n: '證明同制服真的失效', d: '不要先看 Market / MSMT。建立自己的「同制服、不同人」配對評估，並用 FGPR、ConstrID、Industrial-Gait 做外部驗證。對應實驗 E1。' },
    { id: 'C', n: '只加一個結構線索', d: '先選 SkeletonGait / GPGait 或 GaitBase 其中一個，而不是同時加骨架＋輪廓＋臉＋SMPL。這樣才能回答「新增這個線索是否真的修正外觀的失效」。對應 E2、E3。' },
    { id: 'D', n: '品質感知融合', d: '先做分數層融合證明互補性，再升級到投影 + 學習式門控。MMGaitFormer 提供交叉注意力方向，HAMoBE 提供雙輸入門控方向。對應 E4。' },
    { id: 'E', n: '跨域 + 未知人員', d: '留一攝影機、跨資料集、遮擋與解析度分層、模態缺失、未知身分拒判。對應 E5–E8；最後才看工程成本 E9。' }
  ];
  var SHORT = { cal: 'CAL', ltcc: 'LTCC', fgpr: 'FGPR', mmgaitformer: 'MMGaitFormer', skeletongait: 'SkeletonGait++', hamobe: 'HAMoBE', ramoe: 'RaMoE', opengait: 'OpenGait', gpgait: 'GPGait', fgpersonx: 'FG-PersonX', openworld: 'Open-World ReID' };
  CH.roadmap = {
    init: function () {
      var cols = { proven: ['文獻證實', '原論文實驗直接支持'], inferred: ['合理推論', '由多篇文獻推導的工程判斷'], open: ['待驗證', '沒有直接證據，需要自己實驗'] };
      $('#evidence').innerHTML = Object.keys(cols).map(function (lv) {
        return '<div class="ev-col"><h3><span class="ev ' + lv + '"><i></i></span>' + cols[lv][0] + '</h3><p class="small muted" style="margin-top:0">' + cols[lv][1] + '</p><ul>' +
          D.CLAIMS.filter(function (c) { return c.lv === lv; }).map(function (c) {
            return '<li>' + c.t + '<span class="src">' + (c.src.length ? c.src.map(function (s) { return SHORT[s] || s; }).join('、') + ' · ' : '') + '<a href="#/' + c.ch + '">看相關章節</a></span></li>';
          }).join('') + '</ul></div>';
      }).join('');
      var h = '<thead><tr><th>方法</th>' + D.GAP.cols.map(function (c) { return '<th class="cell">' + c + '</th>'; }).join('') + '</tr></thead><tbody>';
      D.GAP.rows.forEach(function (r) { h += '<tr><td><b>' + r.m + '</b></td>' + r.v.map(function (v) { return '<td class="cell">' + (v === 2 ? '<span title="原論文已測">' + glyph(2) + '</span>' : glyph(v)) + '</td>'; }).join('') + '</tr>'; });
      $('#gap-matrix').innerHTML = h + '</tbody><caption class="small muted" style="caption-side:bottom;text-align:left;padding-top:8px">實心 = 原論文已測　空心 = 可研究　— = 不適用</caption>';
      drawPhases('A');
      $('#exp-tbl').innerHTML = '<thead><tr><th>編號</th><th>問題</th><th>基準</th><th>修改</th><th>必看指標</th></tr></thead><tbody>' +
        D.EXPERIMENTS.map(function (e) { return '<tr><td class="num"><b>' + e.id + '</b></td><td>' + e.q + '</td><td>' + e.base + '</td><td>' + e.mod + '</td><td>' + e.m + '</td></tr>'; }).join('') + '</tbody>';
    }
  };
  function drawPhases(sel) {
    var svg = U.clear($('#phases'));
    var w = 170, gap = 30;
    PHASES.forEach(function (p, i) {
      var x = i * (w + gap), on = p.id === sel;
      var g = el('g', { tabindex: 0, role: 'button', 'aria-label': '階段 ' + p.id + ' ' + p.n, style: 'cursor:pointer' }, svg);
      el('rect', { x: x + 1, y: 40, width: w, height: 92, rx: 8, fill: on ? 'var(--ink)' : '#fff', stroke: 'var(--ink)', 'stroke-width': 1.3 }, g);
      el('text', { x: x + 16, y: 72, 'font-size': 22, 'font-weight': 700, fill: on ? '#fff' : 'var(--olive)', class: 'num', text: p.id }, g);
      el('text', { x: x + 16, y: 104, 'font-size': 14, 'font-weight': 700, fill: on ? '#fff' : 'var(--ink)', text: p.n }, g);
      if (i < PHASES.length - 1) global.svgArrow(svg, x + w + 4, 86, x + w + gap - 2, 86);
      function go() { drawPhases(p.id); }
      g.addEventListener('click', go);
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
    el('text', { x: 0, y: 22, 'font-size': 12.5, fill: 'var(--ink-3)', text: '依序進行，每一步都回答一個可被否證的問題（點選查看）' }, svg);
    el('text', { x: 0, y: 170, 'font-size': 12.5, fill: 'var(--ink-3)', text: '目前位置：第一階段（文獻探索）已完成大部分 → 下一步從 A、B 開始' }, svg);
    var p = PHASES.filter(function (x) { return x.id === sel; })[0];
    $('#phase-detail').innerHTML = '<h3>階段 ' + p.id + '：' + p.n + '</h3><p style="margin:0">' + p.d + '</p>';
  }

  /* ======================= 9 參考文獻 ======================= */
  CH.refs = {
    init: function () {
      var list = Object.keys(D.REFS).map(function (k) { return D.REFS[k]; });
      list.sort(function (a, b) { var ya = parseInt((a.v.match(/\d{4}/) || ['0'])[0], 10), yb = parseInt((b.v.match(/\d{4}/) || ['0'])[0], 10); return yb - ya; });
      $('#refs').innerHTML = list.map(function (r) {
        return '<li><span class="venue">' + r.v + '</span><br>' + (r.u ? '<a href="' + r.u + '" target="_blank" rel="noopener">' + U.esc(r.t) + '</a>' : U.esc(r.t)) + '<br><span class="muted small">' + r.a + '</span></li>';
      }).join('');
    }
  };
})(window);
