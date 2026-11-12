/* ch-fusion.js — 整體技術架構（第 2 章與總覽共用）、分群演算法選擇流程 */
(function (global) {
  'use strict';
  var PM = global.PersonModel, el = U.el, $ = U.$, R = global.R;
  var CH = global.CH = global.CH || {};
  var P = global.PEOPLE;
  var C = { app: '#2a78d6', sil: '#1baf7a', skel: '#eb6834', face: '#6250d6', gait: '#d55181', body: '#9a7b12', ink: '#1c251f' };
  var anim = { raf: 0, t: 0, last: 0 }, ARCH = null;

  CH.fusion = {
    init: function () { ARCH = makeArch({ svg: '#arch', steps: '#arch-steps', tour: '#arch-tour', detail: '#arch-detail', here: 'methods', anchor: true }); drawTree(); },
    enter: function () {
      if (U.reduceMotion || anim.raf) return;
      anim.last = performance.now();
      function step(now) {
        anim.raf = 0;
        if (!document.getElementById('ch-methods').classList.contains('active')) return;
        var dt = Math.min(0.05, (now - anim.last) / 1000); anim.last = now; anim.t += dt;
        ARCH.tick(dt, anim.t);
        anim.raf = requestAnimationFrame(step);
      }
      anim.raf = requestAnimationFrame(step);
    },
    leave: function () { cancelAnimationFrame(anim.raf); anim.raf = 0; }
  };

  function txt(p, x, y, s, o) { return el('text', Object.assign({ x: x, y: y, 'font-size': 12, fill: 'var(--ink)', text: s }, o || {}), p); }
  function evB(lv) { return { proven: '<span class="ev proven"><i></i>文獻證實</span>', inferred: '<span class="ev inferred"><i></i>合理推論</span>', open: '<span class="ev open"><i></i>待驗證</span>' }[lv]; }

  /* ======================= 整體技術架構（全站共用，總覽頁也用） ======================= */
  // 七站的名稱與說明讀 PIPE.OURS（one／io／why／ev／tok 在 pipeline.js）；大階段讀 PIPE.STAGE_GROUPS
  var PIPE = global.PIPE;
  var ST = PIPE.OURS.filter(function (o) { return o.id !== 'Q'; });
  // 每一步在哪一章詳細介紹，以及對應的系統階段（研究資料 R.STAGES，含演算法選項與評估指標）
  var WHERE = ['methods', 'methods', 'methods', 'methods', 'methods', 'methods', 'methods'];
  var SIDS = [['s1'], ['s2'], ['s3'], ['s4'], ['s5'], ['s6', 's7'], ['s8', 's9']];
  var GRPC = ['var(--ink-3)', C.app, '#1baf7a', 'var(--ink)', 'var(--ink-3)']; // 與 PIPE.STAGE_GROUPS 同序
  var AR = null; // 目前操作中的架構圖實例（各站小圖畫進它）
  var BX = 4, BW = 122, GAP = 20, BY = 58, BH = 276;
  function bx(i) { return BX + i * (BW + GAP); }
  function use(inst, fn) { var prev = AR; AR = inst; try { return fn(); } finally { AR = prev; } }

  /** 建立一張架構圖。o = { svg, steps, tour, detail, here }（選擇器；here = 所在章節） */
  function makeArch(o) {
    var inst = { o: o, sel: 0, tour: !U.reduceMotion, tokT: 0, figs: [] };
    use(inst, function () {
      if (o.steps) {
        var steps = $(o.steps);
        ST.forEach(function (s, i) {
          var b = U.h('button', { 'data-i': String(i), 'aria-pressed': i === 0 ? 'true' : 'false' }, '<span class="num">' + (i + 1) + '</span> ' + s.short);
          b.addEventListener('click', function () { use(inst, function () { AR.tour = false; syncTourBtn(); selectSt(i, true); }); });
          steps.appendChild(b);
        });
      }
      $(o.tour).addEventListener('click', function () { use(inst, function () { AR.tour = !AR.tour; syncTourBtn(); }); });
      syncTourBtn();
      drawArch(); selectSt(0, true);
    });
    inst.tick = function (dt, t) { use(inst, function () { tickArch(dt, t); }); };
    return inst;
  }
  function syncTourBtn() { var tb = $(AR.o.tour); tb.textContent = AR.tour ? '暫停導覽' : '自動導覽'; tb.setAttribute('aria-pressed', AR.tour ? 'true' : 'false'); }
  function selectSt(i, jump) {
    AR.sel = i;
    if (jump) { AR.tokT = i * 2.4 + 1.0; if (AR.tok) placeToken(); }
    if (AR.o.steps) U.$$(AR.o.steps + ' button').forEach(function (b) { b.setAttribute('aria-pressed', +b.getAttribute('data-i') === i ? 'true' : 'false'); });
    AR.boxes.forEach(function (g, k) { g.setAttribute('opacity', k === i ? 1 : 0.38); });
    AR.frames.forEach(function (r, k) { r.setAttribute('stroke', k === i ? 'var(--ink)' : 'var(--rule)'); r.setAttribute('stroke-width', k === i ? 2.2 : 1); });
    var s = ST[i], stg = (R.STAGES || []).filter(function (x) { return SIDS[i].indexOf(x.id) >= 0; });
    var more = '';
    if (AR.o.here !== 'home' && stg.length) {
      more = '<dt>演算法選項</dt><dd>' + stg.map(function (x) { return (stg.length > 1 ? '<b>' + x.n + '：</b>' : '') + x.alg; }).join('<br>') + '</dd>' +
        '<dt>評估指標</dt><dd>' + stg.map(function (x) { return (stg.length > 1 ? '<b>' + x.n + '：</b>' : '') + x.m; }).join('<br>') + '</dd>';
    }
    var link = AR.o.anchor ? '<dt>候選方法</dt><dd><a href="#/methods?s=' + (i + 1) + '" class="jump">往下看這一步有哪些方法、我們選哪個 ↓</a></dd>'
      : '<dt>候選方法</dt><dd><a href="#/methods?s=' + (i + 1) + '">' + PIPE.text('{{ch:methods}}：{{step:' + (i + 1) + '|short}} →') + '</a></dd>';
    $(AR.o.detail).innerHTML = '<div class="arch-num num">' + (i + 1) + '</div><div><h3 style="margin:0 0 4px">' + s.n + '　' + evB(s.ev) + '</h3><p style="margin:0 0 8px">' + PIPE.fmt(s.one) + '</p><dl>' +
      '<dt>輸入 → 輸出</dt><dd>' + PIPE.fmt(s.io) + '</dd><dt>為什麼需要</dt><dd>' + PIPE.fmt(s.why) + '</dd>' + more + link + '</dl></div>';
  }

  function drawArch() {
    var svg = U.clear($(AR.o.svg)), inst = AR;
    AR.boxes = []; AR.frames = [];
    ST.forEach(function (s, i) {
      var x = bx(i), g = el('g', { tabindex: 0, role: 'button', 'aria-label': (i + 1) + ' ' + s.short, style: 'cursor:pointer' }, svg);
      el('circle', { cx: x + BW / 2, cy: 16, r: 11, fill: 'var(--ink)' }, g);
      txt(g, x + BW / 2, 20.5, String(i + 1), { 'text-anchor': 'middle', fill: '#fff', 'font-weight': 700, 'font-size': 13, class: 'num' });
      txt(g, x + BW / 2, 47, s.short, { 'text-anchor': 'middle', 'font-weight': 700, 'font-size': 13.5 });
      var fr = el('rect', { x: x + 0.5, y: BY, width: BW, height: BH, rx: 8, fill: '#fff', stroke: 'var(--rule)' }, g);
      AR.frames.push(fr);
      var inner = el('g', {}, g);
      AR.boxes.push(inner);
      MINI[i](inner, x, BY);
      if (i < ST.length - 1) {
        var ay = BY + BH / 2;
        el('path', { d: 'M' + (x + BW + 4) + ' ' + ay + 'h' + (GAP - 9) + 'm-5 -4l5 4l-5 4', fill: 'none', stroke: 'var(--ink-3)', 'stroke-width': 1.6 }, svg);
      }
      function go() { use(inst, function () { AR.tour = false; syncTourBtn(); selectSt(i, true); }); }
      g.addEventListener('click', go);
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
    // 分組括號
    PIPE.STAGE_GROUPS.forEach(function (gp, gi) {
      var ids = gp[1].filter(function (x) { return x !== 'Q'; });
      if (!ids.length) return; // 輸出（Q）在這張圖沒有方塊
      var x1 = bx(ids[0] - 1) + 4, x2 = bx(ids[ids.length - 1] - 1) + BW - 4, col = GRPC[gi];
      el('path', { d: 'M' + x1 + ' ' + (BY + BH + 10) + 'v6H' + x2 + 'v-6', fill: 'none', stroke: col, 'stroke-width': 1.6 }, svg);
      txt(svg, (x1 + x2) / 2, BY + BH + 32, gp[0], { 'text-anchor': 'middle', 'font-weight': 700, fill: col, 'font-size': 12.5 });
    });
    // 片段的旅程
    var ty = 420;
    txt(svg, 4, ty - 20, '跟著一段片段走完全程：', { 'font-size': 12, fill: 'var(--ink-3)' });
    el('line', { x1: bx(0) + BW / 2, x2: bx(6) + BW / 2, y1: ty, y2: ty, stroke: 'var(--rule)', 'stroke-width': 3, 'stroke-linecap': 'round' }, svg);
    ST.forEach(function (s, i) { el('circle', { cx: bx(i) + BW / 2, cy: ty, r: 4, fill: 'var(--sheet)', stroke: 'var(--ink-3)', 'stroke-width': 1.5 }, svg); });
    AR.tok = el('g', {}, svg);
    AR.tokR = el('rect', { x: -38, y: -13, width: 76, height: 26, rx: 13, fill: 'var(--ink)' }, AR.tok);
    AR.tokDots = el('g', {}, AR.tok);
    AR.tokT_ = txt(AR.tok, 0, 4.5, '', { 'text-anchor': 'middle', fill: '#fff', 'font-weight': 700, 'font-size': 12 });
    placeToken();
  }
  function placeToken() {
    var per = 2.4, n = ST.length, T = AR.tokT % (per * n), i = Math.floor(T / per), f = T - i * per;
    var move = 0.7, x;
    if (f < move && i > 0) { var k = f / move; k = k * k * (3 - 2 * k); x = U.lerp(bx(i - 1), bx(i), k) + BW / 2; }
    else x = bx(i) + BW / 2;
    var stI = (f < move * 0.5 && i > 0) ? i - 1 : i;
    AR.tok.setAttribute('transform', 'translate(' + x + ',420)');
    AR.tokT_.textContent = ST[stI].tok;
    var w = Math.max(64, ST[stI].tok.length * 12.5 + 22);
    AR.tokR.setAttribute('x', -w / 2); AR.tokR.setAttribute('width', w);
    AR.tokR.setAttribute('fill', stI >= 6 ? 'var(--good)' : stI === 5 ? '#eb6834' : 'var(--ink)');
    U.clear(AR.tokDots);
    if (stI >= 2 && stI <= 3) [C.app, C.sil, C.skel].forEach(function (c, k) { el('circle', { cx: -w / 2 + 2 + k * 9 - 8, cy: -14, r: 4, fill: c }, AR.tokDots); });
    return stI;
  }
  function tickArch(dt, t) {
    if (AR.tour) {
      AR.tokT += dt;
      var s = placeToken();
      if (s !== AR.sel) selectSt(s, false);
    }
    AR.figs.forEach(function (f) {
      PM.renderSVG(f.g, PM.parts(f.p, VK.phase(f.p, t), f.v, 'rgb'), {});
    });
    if (AR.clu) drawCluDots(t);
  }
  global.ArchViz = { make: makeArch };

  /* ---- 各站的小圖 ---- */
  var MINI = [
    function (g, x, y) { // 攝影機
      AR.figs = [];
      [['營門', 0, 0.35], ['集合場', 2, 1.2], ['餐廳', 1, 2.6]].forEach(function (c, k) {
        var yy = y + 10 + k * 89, cx = x + 8;
        el('rect', { x: cx, y: yy, width: 106, height: 78, rx: 4, fill: '#d7dccf' }, g);
        el('rect', { x: cx, y: yy + 58, width: 106, height: 20, fill: '#c3c9b9' }, g);
        var fg = el('g', {}, g);
        var p = P[c[1]];
        AR.figs.push({ g: fg, p: p, v: { yaw: c[2], pitch: 0.15, scale: 48 * p.H, x: cx + 53, y: yy + 70 } });
        el('rect', { x: cx + 3, y: yy + 3, width: 30, height: 15, rx: 2, fill: 'rgba(28,37,31,.8)' }, g);
        txt(g, cx + 18, yy + 14, c[0], { 'text-anchor': 'middle', fill: '#fff', 'font-size': 10.5 });
        el('circle', { cx: cx + 98, cy: yy + 10, r: 3, fill: '#c93434' }, g);
      });
    },
    function (g, x, y) { // 片段
      [['營門 08:02–08:05', 0, '#2a78d6'], ['集合場 08:11–08:12', 2, '#1baf7a'], ['餐廳 12:03–12:06', 1, '#eb6834']].forEach(function (c, k) {
        var yy = y + 14 + k * 88, p = P[c[1]];
        txt(g, x + 8, yy + 6, c[0], { 'font-size': 10.5, fill: 'var(--ink-2)' });
        for (var f = 0; f < 4; f++) {
          var fx = x + 8 + f * 27;
          el('rect', { x: fx, y: yy + 12, width: 24, height: 50, rx: 2, fill: '#e3e7de', stroke: c[2], 'stroke-width': 1.4 }, g);
          var fg = el('g', {}, g);
          PM.renderSVG(fg, PM.parts(p, f * 1.4, { yaw: 0.4, pitch: 0.1, scale: 40, x: fx + 12, y: yy + 57 }, 'rgb'), {});
        }
        txt(g, x + 8, yy + 76, '片段 #' + [17, 23, 41][k], { 'font-size': 11, 'font-weight': 700 });
      });
    },
    function (g, x, y) { // 專家＋品質
      var rows = [['外觀', C.app, 0.8, 'rgb'], ['輪廓', C.sil, 0.6, 'sil'], ['骨架', C.skel, 0.9, 'skel']];
      var r = U.rng(5);
      rows.forEach(function (rw, k) {
        var yy = y + 12 + k * 86;
        el('rect', { x: x + 8, y: yy, width: 30, height: 56, rx: 3, fill: '#f2f4ef' }, g);
        var fg = el('g', {}, g);
        PM.renderSVG(fg, PM.parts(P[2], 1.1, { yaw: 0.4, pitch: 0.1, scale: 46, x: x + 23, y: yy + 52 }, rw[3]), rw[3] === 'sil' ? { silColor: C.sil } : rw[3] === 'skel' ? { boneColor: C.skel } : {});
        txt(g, x + 44, yy + 11, rw[0], { 'font-size': 12, 'font-weight': 700, fill: rw[1] });
        for (var b = 0; b < 10; b++) el('rect', { x: x + 44 + b * 7, y: yy + 17, width: 6, height: 16, fill: rw[1], opacity: (0.2 + r() * 0.8).toFixed(2) }, g);
        txt(g, x + 44, yy + 48, '品質 q', { 'font-size': 10.5, fill: 'var(--ink-3)' });
        el('rect', { x: x + 80, y: yy + 40, width: 34, height: 9, rx: 2, fill: '#eef0eb' }, g);
        el('rect', { x: x + 80, y: yy + 40, width: 34 * rw[2], height: 9, rx: 2, fill: rw[2] > 0.7 ? 'var(--good)' : 'var(--warn)' }, g);
      });
    },
    function (g, x, y) { // 證據
      var items = [['外觀', 0.3, C.app], ['輪廓', 1.4, C.sil], ['骨架', 2.3, C.skel], ['臉', 0, C.face]];
      txt(g, x + 8, y + 20, '片段 #17 vs #41', { 'font-size': 11, fill: 'var(--ink-2)' });
      var x0 = x + 44, sc = 13, cum = 0;
      el('line', { x1: x0, x2: x0, y1: y + 30, y2: y + 196, stroke: 'var(--ink-3)' }, g);
      items.forEach(function (it, k) {
        var yy = y + 36 + k * 34;
        txt(g, x + 8, yy + 13, it[0], { 'font-size': 11.5, fill: it[2], 'font-weight': 700 });
        if (!it[1]) { txt(g, x0 + 4, yy + 13, '看不到＝0', { 'font-size': 10.5, fill: 'var(--ink-3)' }); return; }
        el('rect', { x: x0 + cum * sc, y: yy + 2, width: it[1] * sc, height: 15, rx: 2, fill: it[2] }, g);
        cum += it[1];
      });
      el('line', { x1: x + 8, x2: x + BW - 8, y1: y + 176, y2: y + 176, stroke: 'var(--ink)' }, g);
      txt(g, x + 8, y + 194, '總證據', { 'font-size': 11.5, 'font-weight': 700 });
      el('rect', { x: x0, y: y + 200, width: cum * sc, height: 15, rx: 2, fill: 'var(--good)' }, g);
      txt(g, x + 8, y + 236, '+4.0 → 同一人', { 'font-size': 12, 'font-weight': 700, fill: 'var(--good)' });
      txt(g, x + 8, y + 254, '機率約 98%', { 'font-size': 12, fill: 'var(--ink-2)' });
    },
    function (g, x, y) { // 時空約束
      var N = [[x + 30, y + 40, '營門'], [x + 96, y + 60, '集合場'], [x + 52, y + 132, '餐廳']];
      [[0, 1, '3 分'], [1, 2, '4 分'], [0, 2, '6 分']].forEach(function (e) {
        var a = N[e[0]], b = N[e[1]];
        el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: 'var(--rule)', 'stroke-width': 2 }, g);
        txt(g, (a[0] + b[0]) / 2 + (e[2] === '6 分' ? -18 : 4), (a[1] + b[1]) / 2 + 2, e[2], { 'font-size': 10.5, fill: 'var(--ink-3)', class: 'num' });
      });
      N.forEach(function (n) { el('circle', { cx: n[0], cy: n[1], r: 13, fill: '#fff', stroke: 'var(--ink)', 'stroke-width': 1.5 }, g); txt(g, n[0], n[1] + 4, n[2], { 'text-anchor': 'middle', 'font-size': 9.5 }); });
      txt(g, x + 8, y + 172, '最短步行時間', { 'font-size': 10.5, fill: 'var(--ink-3)' });
      [['營門 8:05→餐廳 8:07', '2 分 < 6 分', false], ['集合場 8:12→餐廳 12:03', '時間足夠', true]].forEach(function (c, k) {
        var yy = y + 190 + k * 42;
        txt(g, x + 8, yy, c[0], { 'font-size': 10.5 });
        txt(g, x + 8, yy + 16, (c[2] ? '✓ ' : '✕ 不可能　') + c[1], { 'font-size': 11, 'font-weight': 700, fill: c[2] ? 'var(--good)' : 'var(--bad)' });
      });
    },
    function (g, x, y) { // 分群
      var r = U.rng(11), dots = [];
      var cen = [[x + 34, y + 60], [x + 90, y + 92], [x + 46, y + 150]];
      var col = ['#2a78d6', '#eb6834', '#1baf7a'];
      for (var i = 0; i < 15; i++) {
        var c = i % 3;
        dots.push({ c: c, sx: x + 14 + r() * 94, sy: y + 24 + r() * 160, tx: cen[c][0] + (r() - 0.5) * 28, ty: cen[c][1] + (r() - 0.5) * 28, n: el('circle', { r: 5.5, stroke: '#fff', 'stroke-width': 1.2 }, g) });
      }
      AR.cluLink = el('line', { stroke: 'var(--bad)', 'stroke-width': 1.6, 'stroke-dasharray': '3 3' }, g);
      AR.cluX = txt(g, 0, 0, '✕', { 'font-size': 12, 'font-weight': 700, fill: 'var(--bad)', 'text-anchor': 'middle' });
      AR.cluLab = txt(g, x + 8, y + 214, '', { 'font-size': 12, 'font-weight': 700 });
      txt(g, x + 8, y + 236, '紅虛線：被約束擋下', { 'font-size': 10.5, fill: 'var(--bad)' });
      txt(g, x + 8, y + 254, '的合併', { 'font-size': 10.5, fill: 'var(--bad)' });
      AR.clu = { dots: dots, col: col };
      drawCluDots(0);
    },
    function (g, x, y) { // 識別
      [['匿名 #1', '人員 A', '0.93', true, '#2a78d6'], ['匿名 #2', '人員 C', '0.88', true, '#eb6834'], ['匿名 #3', '未知-#1', '最高 0.41', false, '#1baf7a']].forEach(function (c, k) {
        var yy = y + 14 + k * 84;
        el('circle', { cx: x + 16, cy: yy + 12, r: 7, fill: c[4] }, g);
        txt(g, x + 28, yy + 16, c[0], { 'font-size': 11.5 });
        el('path', { d: 'M' + (x + 16) + ' ' + (yy + 22) + 'v12h8', fill: 'none', stroke: 'var(--ink-3)' }, g);
        el('rect', { x: x + 26, y: yy + 26, width: 88, height: 40, rx: 5, fill: c[3] ? '#e3efe0' : '#f6dcdc', stroke: c[3] ? 'var(--good)' : 'var(--bad)' }, g);
        txt(g, x + 34, yy + 43, c[1], { 'font-size': 12.5, 'font-weight': 700, fill: c[3] ? 'var(--good)' : 'var(--bad)' });
        txt(g, x + 34, yy + 59, c[3] ? '相似度 ' + c[2] : c[2] + ' < 門檻', { 'font-size': 10.5, fill: 'var(--ink-2)' });
      });
    }
  ];
  function drawCluDots(t) {
    var k = (Math.sin(t * 0.9) + 1) / 2; k = k * k * (3 - 2 * k);
    var D = AR.clu.dots;
    D.forEach(function (d) {
      var x = U.lerp(d.sx, d.tx, k), y = U.lerp(d.sy, d.ty, k);
      d.n.setAttribute('cx', x.toFixed(1)); d.n.setAttribute('cy', y.toFixed(1));
      d.n.setAttribute('fill', k > 0.55 ? AR.clu.col[d.c] : '#8d968e');
    });
    var a = D[0], b = D[1];
    var on = k > 0.3;
    AR.cluLink.setAttribute('x1', a.n.getAttribute('cx')); AR.cluLink.setAttribute('y1', a.n.getAttribute('cy'));
    AR.cluLink.setAttribute('x2', b.n.getAttribute('cx')); AR.cluLink.setAttribute('y2', b.n.getAttribute('cy'));
    AR.cluLink.setAttribute('opacity', on ? 1 : 0); AR.cluX.setAttribute('opacity', on ? 1 : 0);
    AR.cluX.setAttribute('x', ((+a.n.getAttribute('cx') + +b.n.getAttribute('cx')) / 2).toFixed(1));
    AR.cluX.setAttribute('y', ((+a.n.getAttribute('cy') + +b.n.getAttribute('cy')) / 2 + 4).toFixed(1));
    AR.cluLab.textContent = k > 0.55 ? '→ 今日 3 個人' : '15 段片段';
  }

  /* ======================= 分群演算法怎麼選 ======================= */
  function drawTree() {
    var svg = U.clear($('#clu-tree'));
    function node(x, y, w, h, t, o) {
      o = o || {};
      el('rect', { x: x, y: y, width: w, height: h, rx: o.q ? 18 : 8, fill: o.fill || '#fff', stroke: o.stroke || 'var(--ink)', 'stroke-width': o.sw || 1.4 }, svg);
      t.split('|').forEach(function (s, i, a) { txt(svg, x + w / 2, y + h / 2 + 5 + (i - (a.length - 1) / 2) * 17, s, { 'text-anchor': 'middle', 'font-size': o.fs || 13, 'font-weight': i === 0 ? 700 : 400, fill: o.color || 'var(--ink)' }); });
    }
    function link(x1, y1, x2, y2, lab) {
      el('path', { d: 'M' + x1 + ' ' + y1 + ' C' + x1 + ' ' + (y1 + y2) / 2 + ' ' + x2 + ' ' + (y1 + y2) / 2 + ' ' + x2 + ' ' + y2, fill: 'none', stroke: 'var(--ink-3)', 'stroke-width': 1.5 }, svg);
      if (lab) txt(svg, (x1 + x2) / 2 + (x2 > x1 ? 14 : -14), (y1 + y2) / 2 - 6, lab, { 'font-size': 12, 'font-weight': 700, fill: 'var(--ink-2)', 'text-anchor': x2 > x1 ? 'start' : 'end', 'paint-order': 'stroke', stroke: 'var(--sheet)', 'stroke-width': 4 });
    }
    node(330, 10, 300, 46, '每天要分的人有多少？', { q: true, fill: 'var(--ink)', color: '#fff', stroke: 'var(--ink)' });
    link(420, 56, 200, 110, '數十到數百（營區）'); link(540, 56, 770, 110, '數十萬以上');
    node(60, 110, 280, 46, '需要「不可能同時在兩處」|這類約束？', { q: true });
    node(640, 110, 270, 58, '圖神經網路分群|Linkage-GCN、STAR-FC', { stroke: 'var(--ink-3)', color: 'var(--ink-2)' });
    txt(svg, 775, 186, '規模優勢用不上；需自有標註微調', { 'text-anchor': 'middle', 'font-size': 11.5, fill: 'var(--ink-3)' });
    link(150, 156, 110, 214, '需要'); link(260, 156, 390, 214, '不需要');
    node(10, 214, 240, 66, '約束式平均連結凝聚|免訓練、最容易加約束', { fill: '#e3efe0', stroke: 'var(--good)', sw: 2.2 });
    txt(svg, 130, 300, '★ 建議首選（上方實驗台的演算法）', { 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: 'var(--good)' });
    node(290, 214, 210, 66, 'HDBSCAN / Infomap|自動決定群數', { stroke: 'var(--ink-3)' });
    txt(svg, 395, 300, '離群點要另報為「低信心」', { 'text-anchor': 'middle', 'font-size': 11.5, fill: 'var(--ink-3)' });
    el('line', { x1: 0, x2: 960, y1: 326, y2: 326, stroke: 'var(--rule)', 'stroke-dasharray': '4 4' }, svg);
    txt(svg, 4, 362, '跨日之後：', { 'font-size': 12.5, 'font-weight': 700 });
    node(80, 334, 300, 46, '線上分群（OGMC）|新資料進來不必整批重聚', { stroke: C.app, color: 'var(--ink)' });
    node(420, 334, 300, 46, '學合併停止半徑（Ball Cluster）|同時估出人數', { stroke: 'var(--ink-3)' });
  }
})(window);
