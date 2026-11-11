/* ch-fusion.js — 第 3 章（系統架構）：整體技術架構導覽、融合層級、品質門控、分數換證據、分群演算法選擇 */
(function (global) {
  'use strict';
  var PM = global.PersonModel, el = U.el, $ = U.$, R = global.R;
  var CH = global.CH = global.CH || {};
  var P = global.PEOPLE;
  var C = { app: '#2a78d6', sil: '#1baf7a', skel: '#eb6834', face: '#6250d6', gait: '#d55181', body: '#9a7b12', ink: '#1c251f' };
  var anim = { raf: 0, t: 0, last: 0 }, ARCH = null;

  CH.fusion = {
    init: function () { ARCH = makeArch({ svg: '#arch', steps: '#arch-steps', tour: '#arch-tour', detail: '#arch-detail', here: 'system' }); initLevels(); initGate(); initNorm(); drawTree(); },
    enter: function () {
      if (U.reduceMotion || anim.raf) return;
      anim.last = performance.now();
      function step(now) {
        anim.raf = 0;
        if (!document.getElementById('ch-system').classList.contains('active')) return;
        var dt = Math.min(0.05, (now - anim.last) / 1000); anim.last = now; anim.t += dt;
        ARCH.tick(dt, anim.t); tickLevels(); drawGateScene();
        anim.raf = requestAnimationFrame(step);
      }
      anim.raf = requestAnimationFrame(step);
    },
    leave: function () { cancelAnimationFrame(anim.raf); anim.raf = 0; }
  };

  function txt(p, x, y, s, o) { return el('text', Object.assign({ x: x, y: y, 'font-size': 12, fill: 'var(--ink)', text: s }, o || {}), p); }
  function evB(lv) { return { proven: '<span class="ev proven"><i></i>文獻證實</span>', inferred: '<span class="ev inferred"><i></i>合理推論</span>', open: '<span class="ev open"><i></i>待驗證</span>' }[lv]; }

  /* ======================= 整體技術架構（全站共用，總覽頁也用） ======================= */
  var ST = [
    { n: '多台攝影機', tok: '影格', grp: 0,
      one: '營區各處的攝影機錄下一整天的影片，夜間批次處理。',
      io: '影片 → 每秒抽 2–5 幀', why: '同一個人會在不同攝影機、不同時間出現；角度、光線、距離都不同，所以同一人看起來可能像另一個人。', ev: 'proven' },
    { n: '追蹤成片段', tok: '片段 #17', grp: 0,
      one: '偵測器框出每個人，追蹤器把同一台攝影機裡連續的框串成一段「片段」。片段內一定是同一人，之後都以片段為單位處理。',
      io: '人框 → 片段（數秒到數十秒）', why: '單一幀的資訊太少，也算不出步態；片段可以累積多幀，並挑出畫質最好的幾幀。', ev: 'proven' },
    { n: '三位專家＋品質', tok: '3 份特徵', grp: 1,
      one: '每段片段分別送進外觀、輪廓步態、骨架步態等專家，各得一個特徵；同時估計這段畫面對每種線索「可不可信」的品質分數 q。',
      io: '片段 → {外觀, 輪廓, 骨架, 臉…} 特徵＋品質 q', why: '沒有一種線索在所有畫面都可靠（第 2 章的六類方法比較）。品質 q 讓後面的步驟知道該信誰：解析度、遮擋、幀數、俯角都會影響。', ev: 'inferred' },
    { n: '換成同一種證據', tok: '證據 +4.0', grp: 1,
      one: '兩段片段比對時，各專家給的相似度單位不同。先換算成「證據」：同一人時看到這個分數的機率，比上不同人時的機率（取對數）。各項證據可以直接相加；看不到的線索該項為 0。',
      io: '各線索相似度＋品質 q → 一個總證據值（可換成「同一人的機率」）', why: '直接把 0.8 的外觀分數和 12 的步態距離相加沒有意義；換成證據後，每一項都代表「多支持同一人幾分」。', ev: 'proven' },
    { n: '時空約束', tok: '通過約束', grp: 2,
      one: '同一個人不可能同時在兩處，也不可能比最短步行時間更快地從一台攝影機走到另一台。違反的配對直接否決，不論長得多像。',
      io: '攝影機位置＋時間戳 → 「不可能是同一人」的配對清單', why: '這條線索完全不看衣服，所以同制服時特別值錢。公開資料上只加時間與相機 ID，Rank-1 就從 91.2 升到 97.2（st-ReID）。', ev: 'proven' },
    { n: '約束式分群', tok: '匿名 #2', grp: 2,
      one: '把一天所有片段，由最像的一對開始逐步合併成群；違反約束的合併跳過。最後每一群就是一個「匿名的人」。',
      io: '所有片段的兩兩證據＋約束 → 今日人數、每人的片段與軌跡', why: '這一步不需要資料庫，就能回答「今天出現過幾個不同的人、各自去過哪裡」。要同時報純度：人數數對不代表沒有把兩個人併在一起。', ev: 'inferred' },
    { n: '比對註冊庫', tok: '人員 C', grp: 3,
      one: '把整群（多段證據）拿去和註冊人員比對；分數不夠高、或第一名和第二名太接近，就標「未知」，不硬配。',
      io: '匿名的人 → 已註冊身分，或「未知-#N」', why: '用整群比對比單段穩定；營區會有訪客與新進人員，系統必須能說「不認識」。', ev: 'inferred' }
  ];
  // 每一步在哪一章詳細介紹，以及對應的系統階段（研究資料 R.STAGES，含演算法選項與評估指標）
  var CHN = { cues: '第 2 章 線索與方法', system: '第 3 章 系統架構', deploy: '第 4 章 部署條件', plan: '第 5 章 驗證與推進' };
  var WHERE = ['deploy', 'system', 'cues', 'system', 'system', 'system', 'system'];
  var SIDS = [['s1'], ['s2'], ['s3'], ['s4'], ['s5'], ['s6', 's7'], ['s8', 's9']];
  var GRP = [['感知', 'var(--ink-3)'], ['融合', C.app], ['分類', '#1baf7a'], ['識別', 'var(--ink)']];
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
          var b = U.h('button', { 'data-i': String(i), 'aria-pressed': i === 0 ? 'true' : 'false' }, '<span class="num">' + (i + 1) + '</span> ' + s.n);
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
    var link = WHERE[i] !== AR.o.here ? '<dt>詳見</dt><dd><a href="#/' + WHERE[i] + '">' + CHN[WHERE[i]] + ' →</a></dd>' : '';
    $(AR.o.detail).innerHTML = '<div class="arch-num num">' + (i + 1) + '</div><div><h3 style="margin:0 0 4px">' + s.n + '　' + evB(s.ev) + '</h3><p style="margin:0 0 8px">' + s.one + '</p><dl>' +
      '<dt>輸入 → 輸出</dt><dd>' + s.io + '</dd><dt>為什麼需要</dt><dd>' + s.why + '</dd>' + more + link + '</dl></div>';
  }

  function drawArch() {
    var svg = U.clear($(AR.o.svg)), inst = AR;
    AR.boxes = []; AR.frames = [];
    ST.forEach(function (s, i) {
      var x = bx(i), g = el('g', { tabindex: 0, role: 'button', 'aria-label': (i + 1) + ' ' + s.n, style: 'cursor:pointer' }, svg);
      el('circle', { cx: x + BW / 2, cy: 16, r: 11, fill: 'var(--ink)' }, g);
      txt(g, x + BW / 2, 20.5, String(i + 1), { 'text-anchor': 'middle', fill: '#fff', 'font-weight': 700, 'font-size': 13, class: 'num' });
      txt(g, x + BW / 2, 47, s.n, { 'text-anchor': 'middle', 'font-weight': 700, 'font-size': 13.5 });
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
    [[0, 1, 0], [2, 3, 1], [4, 5, 2], [6, 6, 3]].forEach(function (b) {
      var x1 = bx(b[0]) + 4, x2 = bx(b[1]) + BW - 4, gg = GRP[b[2]];
      el('path', { d: 'M' + x1 + ' ' + (BY + BH + 10) + 'v6H' + x2 + 'v-6', fill: 'none', stroke: gg[1], 'stroke-width': 1.6 }, svg);
      txt(svg, (x1 + x2) / 2, BY + BH + 32, gg[0], { 'text-anchor': 'middle', 'font-weight': 700, fill: gg[1], 'font-size': 12.5 });
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
      [['營門', 0, 0.35], ['中庭', 2, 1.2], ['餐廳', 1, 2.6]].forEach(function (c, k) {
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
      [['營門 08:02–08:05', 0, '#2a78d6'], ['中庭 08:11–08:12', 2, '#1baf7a'], ['餐廳 12:03–12:06', 1, '#eb6834']].forEach(function (c, k) {
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
      var N = [[x + 30, y + 40, '營門'], [x + 96, y + 60, '中庭'], [x + 52, y + 132, '餐廳']];
      [[0, 1, '3 分'], [1, 2, '4 分'], [0, 2, '6 分']].forEach(function (e) {
        var a = N[e[0]], b = N[e[1]];
        el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: 'var(--rule)', 'stroke-width': 2 }, g);
        txt(g, (a[0] + b[0]) / 2 + (e[2] === '6 分' ? -18 : 4), (a[1] + b[1]) / 2 + 2, e[2], { 'font-size': 10.5, fill: 'var(--ink-3)', class: 'num' });
      });
      N.forEach(function (n) { el('circle', { cx: n[0], cy: n[1], r: 13, fill: '#fff', stroke: 'var(--ink)', 'stroke-width': 1.5 }, g); txt(g, n[0], n[1] + 4, n[2], { 'text-anchor': 'middle', 'font-size': 9.5 }); });
      txt(g, x + 8, y + 172, '最短步行時間', { 'font-size': 10.5, fill: 'var(--ink-3)' });
      [['營門 8:05→餐廳 8:07', '2 分 < 6 分', false], ['中庭 8:12→餐廳 12:03', '時間足夠', true]].forEach(function (c, k) {
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

  /* ======================= 融合發生在哪一層 ======================= */
  var LV = {
    feature: { n: '特徵層融合', col: 1, how: '把各專家的特徵向量接起來（或用交叉注意力互相混合），再訓練一個模型輸出身分。',
      plus: '資訊最完整，線索之間能互相補充細節（例：MMGaitFormer 讓骨架與輪廓互相查詢）。',
      minus: '需要「同一批人、每種線索都齊全」的成對訓練資料；任何一條線索缺了，接起來的向量就少一段。',
      fit: '第二階段、自有資料夠多之後再考慮。', miss: ['✕ 接起來的向量缺一段，要補值或重新訓練', 'var(--bad)'] },
    score: { n: '分數層融合', col: 2, rec: true, how: '各專家各自比對、各給一個分數；分數校準成「證據」後再相加。',
      plus: '專家可以分開訓練、分開升級；缺的線索直接不加；看得到每一項貢獻多少，好解釋、好除錯。',
      minus: '專家之間沒有特徵層的互動，少了互補細節。',
      fit: '建議的第一步：校準＋對數似然比相加（研究報告的建議基線）。', miss: ['✓ 缺的那一項不加，其他照算', 'var(--good)'] },
    decision: { n: '決策層融合', col: 3, how: '各專家先各自判斷「是不是同一人」，再投票。',
      plus: '最簡單，模組完全獨立。',
      minus: '分數一旦變成「是／否」就丟掉大部分資訊：無法分辨「非常像」和「有點像」。',
      fit: '不建議作為主要方法。', miss: ['△ 少一票；剩下兩票意見不同時無從決定', 'var(--warn)'] }
  };
  var LVS = { lv: 'score', miss: false, paths: [], parts: [] };
  var COLX = [70, 300, 530, 740, 920], LANEY = [80, 150, 220], MIDY = 150;
  function initLevels() {
    U.segGroup($('#lv-sel'), 'data-lv', function (v) { LVS.lv = v; drawLevels(); });
    $('#lv-miss').addEventListener('change', function (e) { LVS.miss = e.target.checked; drawLevels(); });
    drawLevels();
  }
  function drawLevels() {
    var svg = U.clear($('#levels')), L = LV[LVS.lv], mx = COLX[L.col];
    var names = ['影像', '特徵', '分數', '決策', '結果'];
    names.forEach(function (n, i) {
      el('line', { x1: COLX[i], x2: COLX[i], y1: 34, y2: 262, stroke: 'var(--rule-2)', 'stroke-dasharray': '3 4' }, svg);
      txt(svg, COLX[i], 22, n, { 'text-anchor': 'middle', 'font-weight': 700, 'font-size': 13, fill: 'var(--ink-2)' });
    });
    var lanes = [['外觀', C.app], ['輪廓', C.sil], ['骨架', C.skel]];
    // 合併點的強調
    el('rect', { x: mx - 40, y: 40, width: 126, height: 216, rx: 10, fill: L.rec ? '#e3efe0' : '#eef0eb', stroke: L.rec ? 'var(--good)' : 'var(--ink-3)', 'stroke-dasharray': L.rec ? null : '4 3' }, svg);
    txt(svg, mx + 23, 274, '在這裡合併', { 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: L.rec ? 'var(--good)' : 'var(--ink-2)' });
    LVS.paths = [];
    lanes.forEach(function (ln, k) {
      var y = LANEY[k], miss = LVS.miss && k === 2;
      var d = 'M' + (COLX[0] - 40) + ' ' + y + ' H' + (mx + 22) + ' C' + (mx + 50) + ' ' + y + ' ' + (mx + 46) + ' ' + MIDY + ' ' + (mx + 74) + ' ' + MIDY + ' H' + (COLX[4] - 30);
      var p = el('path', { d: d, fill: 'none', stroke: miss ? '#c5ccc2' : ln[1], 'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0.85, 'stroke-dasharray': miss ? '6 6' : null }, svg);
      if (!miss) LVS.paths.push({ p: p, c: ln[1], len: p.getTotalLength() });
      txt(svg, COLX[0] - 44, y + 4, ln[0], { 'text-anchor': 'end', 'font-size': 12.5, 'font-weight': 700, fill: miss ? 'var(--ink-3)' : ln[1] });
      // 每欄的符號（合併前）
      for (var i = 0; i <= L.col; i++) icon(svg, i, COLX[i], y, ln[1], miss, ['0.62', '0.74', '0.81'][k]);
      if (miss) txt(svg, COLX[0] + 34, y - 10, '這段看不到骨架', { 'font-size': 11.5, fill: 'var(--bad)' });
    });
    el('path', { d: 'M' + (mx + 74) + ' ' + MIDY + ' H' + (COLX[4] - 30), stroke: 'var(--ink)', 'stroke-width': 6, 'stroke-linecap': 'round' }, svg);
    for (var i = L.col + 1; i < 4; i++) icon(svg, i, COLX[i], MIDY, 'var(--ink)', false);
    // 結果
    el('rect', { x: COLX[4] - 30, y: MIDY - 22, width: 66, height: 44, rx: 8, fill: 'var(--ink)' }, svg);
    txt(svg, COLX[4] + 3, MIDY - 2, '同一人？', { 'text-anchor': 'middle', fill: '#fff', 'font-size': 12, 'font-weight': 700 });
    txt(svg, COLX[4] + 3, MIDY + 14, 'P = 0.93', { 'text-anchor': 'middle', fill: '#dfe3d3', 'font-size': 11, class: 'num' });
    if (LVS.miss) {
      el('rect', { x: mx - 120 + 23, y: 286, width: 240, height: 26, rx: 5, fill: '#fff', stroke: L.miss[1] }, svg);
      txt(svg, mx + 23, 303, L.miss[0], { 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: L.miss[1] });
    }
    LVS.parts = [];
    var g = el('g', {}, svg);
    LVS.paths.forEach(function (pp, k) { for (var j = 0; j < 4; j++) LVS.parts.push({ pp: pp, off: (j / 4 + k * 0.08) % 1, n: el('circle', { r: 3.6, fill: '#fff', stroke: pp.c, 'stroke-width': 2 }, g) }); });
    tickLevels();
    $('#lv-detail').innerHTML = '<h3 style="margin-top:0">' + L.n + (L.rec ? '　<span class="rec">建議起步</span>' : '') + '</h3><p style="margin:0 0 6px">' + L.how + '</p><dl>' +
      '<dt>優點</dt><dd>' + L.plus + '</dd><dt>代價</dt><dd>' + L.minus + '</dd><dt>何時用</dt><dd>' + L.fit + '</dd><dt>缺線索時</dt><dd style="color:' + L.miss[1] + ';font-weight:700">' + L.miss[0] + '</dd></dl>';
  }
  function icon(svg, col, x, y, c, miss, val) {
    var f = miss ? '#e3e5df' : c;
    if (col === 0) { el('rect', { x: x - 14, y: y - 11, width: 28, height: 22, rx: 3, fill: '#fff', stroke: f, 'stroke-width': 1.6 }, svg); el('circle', { cx: x, cy: y, r: 5, fill: f }, svg); }
    else if (col === 1) { for (var b = 0; b < 6; b++) el('rect', { x: x - 18 + b * 6, y: y - 10, width: 5, height: 20, fill: f, opacity: [0.9, 0.4, 0.7, 0.3, 0.8, 0.5][b] }, svg); }
    else if (col === 2) { el('rect', { x: x - 20, y: y - 11, width: 40, height: 22, rx: 11, fill: '#fff', stroke: f, 'stroke-width': 1.6 }, svg); txt(svg, x, y + 4, miss ? '—' : (val || '0.93'), { 'text-anchor': 'middle', 'font-size': 11, class: 'num', fill: miss ? 'var(--ink-3)' : 'var(--ink)' }); }
    else { el('circle', { cx: x, cy: y, r: 11, fill: '#fff', stroke: f, 'stroke-width': 1.6 }, svg); txt(svg, x, y + 4.5, miss ? '?' : '✓', { 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: miss ? 'var(--ink-3)' : c }); }
  }
  function tickLevels() {
    LVS.parts.forEach(function (q) {
      var u = (q.off + anim.t * 0.12) % 1, pt = q.pp.p.getPointAtLength(u * q.pp.len);
      q.n.setAttribute('cx', pt.x.toFixed(1)); q.n.setAttribute('cy', pt.y.toFixed(1));
    });
  }

  /* ======================= 品質門控 ======================= */
  var MODS = [
    { k: 'app', n: '外觀', c: C.app, g: 0.83, i: 0.80 },
    { k: 'skel', n: '骨架', c: C.skel, g: 0.80, i: 0.55 },
    { k: 'sil', n: '輪廓', c: C.sil, g: 0.76, i: 0.60 },
    { k: 'face', n: '臉部', c: C.face, g: 0.92, i: 0.35 }
  ];
  var SCENES = {
    front: { app: 0.9, skel: 0.9, sil: 0.85, face: 0.9, yaw: Math.PI / 2, s: 0.78, note: '條件良好：每條線索都可靠，三種策略都能排對。' },
    back: { app: 0.8, skel: 0.85, sil: 0.8, face: 0, yaw: -Math.PI / 2, s: 0.78, note: '看不到臉：等權平均仍把 1/4 的權重分給「不存在的臉」，被稀釋；品質門控把它關掉，差距最大。' },
    far: { app: 0.6, skel: 0.25, sil: 0.45, face: 0, yaw: 0.6, s: 0.3, low: 5, note: '遠距低解析：姿態先壞，外觀又分不出同制服——沒有任何策略救得回來。正確做法是拒判，或等更多幀（第 6 章）。' },
    occ: { app: 0.55, skel: 0.35, sil: 0.3, face: 0.6, yaw: 1.1, s: 0.78, occ: true, note: '下半身被擋：骨架與輪廓開始誤導；門控把權重移到還看得清的臉。' }
  };
  var FIXED_W = { app: 0.3, skel: 0.15, sil: 0.15, face: 0.4 };
  var GS = { s: 'back' };
  function q(k) { return SCENES[GS.s][k]; }
  function simOf(m, which, qq) { var base = which === 'g' ? m.g : m.i, bias = which === 'g' ? -0.05 : 0.15; return 0.5 + (base - 0.5) * qq + bias * (1 - qq); }
  function fuse(strategy) {
    var w = {}, sum = 0;
    MODS.forEach(function (m) { var v = strategy === 'mean' ? 1 : strategy === 'fixed' ? FIXED_W[m.k] : q(m.k); w[m.k] = v; sum += v; });
    var G = 0, I = 0;
    MODS.forEach(function (m) {
      w[m.k] = sum ? w[m.k] / sum : 0;
      var gs = q(m.k) > 0 ? simOf(m, 'g', q(m.k)) : 0.5, is = q(m.k) > 0 ? simOf(m, 'i', q(m.k)) : 0.5;
      G += w[m.k] * gs; I += w[m.k] * is;
    });
    return { w: w, G: G, I: I };
  }
  var gateCtx;
  function initGate() {
    gateCtx = VK.hiDPI($('#gate-cam'), 320, 240);
    U.segGroup($('#scene'), 'data-s', function (s) { GS.s = s; drawGate(); drawGateScene(); });
    drawGate(); drawGateScene();
  }
  var off = document.createElement('canvas');
  function drawGateScene() {
    var sc = SCENES[GS.s], ctx = gateCtx, W = 320, H = 240, p = P[2];
    function paint(c, w, h) {
      VK.backdrop(c, w, h);
      var v = { yaw: sc.yaw, pitch: 0.12, scale: h * sc.s, x: w * 0.5, y: h * 0.92 };
      PM.renderCanvas(c, PM.parts(p, VK.phase(p, anim.t), v, 'rgb'), {});
      if (sc.occ) { c.fillStyle = '#7d705a'; c.fillRect(w * 0.18, h * 0.6, w * 0.64, h * 0.4); c.fillStyle = '#6a5f4b'; c.fillRect(w * 0.18, h * 0.6, w * 0.64, h * 0.025); }
    }
    if (sc.low) {
      off.width = Math.round(W / sc.low); off.height = Math.round(H / sc.low);
      paint(off.getContext('2d'), off.width, off.height);
      ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(off, 0, 0, W, H); ctx.restore();
    } else paint(ctx, W, H);
    var tag = { front: '正面、近距', back: '背對攝影機', far: '遠距、低解析', occ: '下半身被擋' }[GS.s];
    VK.rr(ctx, 8, H - 30, 96, 22, 4); ctx.fillStyle = 'rgba(28,37,31,.82)'; ctx.fill();
    VK.label(ctx, 56, H - 14.5, tag, { align: 'center', size: 12, color: '#fff', bold: true });
    MODS.forEach(function (m, i) {
      var x = 8 + i * 76, y = 8, qq = q(m.k);
      VK.rr(ctx, x, y, 70, 22, 4); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill();
      ctx.fillStyle = m.c; ctx.beginPath(); ctx.arc(x + 11, y + 11, 4.5, 0, 7); ctx.fill();
      VK.label(ctx, x + 20, y + 15.5, m.n + ' ' + (qq > 0 ? qq.toFixed(1) : '✕'), { size: 11.5, bold: true, color: qq > 0.6 ? '#1c251f' : qq > 0 ? '#b97e00' : '#c93434' });
    });
  }
  function drawGate() {
    var svg = U.clear($('#gate-svg'));
    var rowY = function (i) { return 64 + i * 44; };
    txt(svg, 0, 18, '線索與品質', { 'font-weight': 700, 'font-size': 13 });
    MODS.forEach(function (m, i) {
      var y = rowY(i), qq = q(m.k);
      txt(svg, 0, y + 4, m.n, { 'font-size': 13, 'font-weight': 700, fill: m.c });
      el('rect', { x: 40, y: y - 6, width: 60, height: 10, rx: 2, fill: '#eef0eb' }, svg);
      el('rect', { x: 40, y: y - 6, width: 60 * qq, height: 10, rx: 2, fill: qq > 0.6 ? 'var(--good)' : qq > 0 ? 'var(--warn)' : 'none' }, svg);
      if (!qq) txt(svg, 44, y + 3, '看不到', { 'font-size': 10.5, fill: 'var(--bad)' });
    });
    txt(svg, 0, 250, '條寬 = 這條線索', { 'font-size': 11.5, fill: 'var(--ink-3)' });
    txt(svg, 0, 266, '分到的權重', { 'font-size': 11.5, fill: 'var(--ink-3)' });
    var strat = [['mean', '等權平均'], ['fixed', '固定權重'], ['gate', '品質門控']];
    strat.forEach(function (s, j) {
      var x0 = 120 + j * 160, r = fuse(s[0]), nodeX = x0 + 112, nodeY = 130, tot = 96, cum = nodeY - tot / 2;
      txt(svg, x0 + 70, 18, s[1], { 'text-anchor': 'middle', 'font-weight': 700, 'font-size': 13.5 });
      if (s[0] === 'gate') txt(svg, x0 + 70, 34, '依品質 q 分配', { 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--ink-3)' });
      else if (s[0] === 'fixed') txt(svg, x0 + 70, 34, '事先訂好', { 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--ink-3)' });
      else txt(svg, x0 + 70, 34, '每條都 1/4', { 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--ink-3)' });
      MODS.forEach(function (m, i) {
        var w = r.w[m.k] * tot, y = rowY(i);
        if (w < 0.5) { el('line', { x1: x0, x2: x0 + 20, y1: y, y2: y, stroke: 'var(--rule)', 'stroke-dasharray': '2 3' }, svg); return; }
        var y1 = cum + w / 2; cum += w;
        var miss = q(m.k) === 0;
        el('path', { d: 'M' + x0 + ' ' + y + ' C' + (x0 + 60) + ' ' + y + ' ' + (nodeX - 50) + ' ' + y1 + ' ' + nodeX + ' ' + y1, fill: 'none', stroke: miss ? '#c5ccc2' : m.c, 'stroke-width': w, opacity: miss ? 0.9 : 0.75 }, svg);
        if (miss) txt(svg, x0 + 2, y + w / 2 + 13, '↑ 分給看不到的臉', { 'font-size': 10.5, fill: 'var(--bad)', 'font-weight': 700 });
      });
      el('rect', { x: nodeX, y: nodeY - tot / 2 - 2, width: 8, height: tot + 4, rx: 3, fill: 'var(--ink)' }, svg);
      var ok = r.G > r.I, dm = r.G - r.I;
      el('rect', { x: x0 + 8, y: 236, width: 128, height: 46, rx: 6, fill: ok ? '#e3efe0' : '#f6dcdc' }, svg);
      txt(svg, x0 + 72, 256, ok ? '✓ 本人排第一' : '✗ 冒充者排第一', { 'text-anchor': 'middle', 'font-weight': 700, 'font-size': 13, fill: ok ? 'var(--good)' : 'var(--bad)' });
      txt(svg, x0 + 72, 274, '差距 ' + (dm >= 0 ? '+' : '') + dm.toFixed(3), { 'text-anchor': 'middle', 'font-size': 11.5, class: 'num', fill: 'var(--ink-2)' });
    });
    $('#gate-note').textContent = SCENES[GS.s].note;
  }

  /* ======================= 分數換成證據 ======================= */
  var NM = [
    { n: '臉部', c: C.face, unit: '餘弦相似度', lo: -0.2, hi: 1, hiGood: true, g: [0.55, 0.13], i: [0.22, 0.13], ex: 0.47, half: false },
    { n: '步態', c: C.gait, unit: '特徵距離', lo: 0, hi: 25, hiGood: false, g: [9, 2.8], i: [14, 3.2], ex: 10.5, half: false },
    { n: '身高', c: C.body, unit: '身高差（cm）', lo: 0, hi: 20, hiGood: false, g: [0, 1.8], i: [0, 7], ex: 2.0, half: true }
  ];
  function dens(m, x, which) { var p = which === 'g' ? m.g : m.i; return (m.half ? 2 : 1) * U.npdf(x, p[0], p[1]); }
  function llr(m, x) { return U.clamp(Math.log(Math.max(1e-12, dens(m, x, 'g'))) - Math.log(Math.max(1e-12, dens(m, x, 'i'))), -6, 6); }
  var NV = { v: 'raw' };
  function initNorm() {
    U.segGroup($('#norm-view'), 'data-v', function (v) { NV.v = v; drawNorm(); });
    drawNorm(); drawNormCards();
  }
  function drawNorm() {
    var svg = U.clear($('#norm-svg')), raw = NV.v === 'raw';
    var PW = 262, GAPX = 25, top = 40, ph = 150, PAD = 16;
    if (raw) {
      NM.forEach(function (m, k) {
        var x0 = PAD + k * (PW + GAPX), X = function (v) { return x0 + (v - m.lo) / (m.hi - m.lo) * PW; };
        txt(svg, x0, 16, m.n + '：' + m.unit, { 'font-weight': 700, 'font-size': 13, fill: m.c });
        curvePair(svg, m, X, top, ph, function (x) { return x; }, m.lo, m.hi);
        axis(svg, x0, PW, top + ph, [m.lo, (m.lo + m.hi) / 2, m.hi]);
        txt(svg, m.hiGood ? x0 + PW : x0, top + ph + 34, m.hiGood ? '越大越像 →' : '← 越小越像', { 'text-anchor': m.hiGood ? 'end' : 'start', 'font-size': 11.5, fill: 'var(--ink-2)', 'font-weight': 700 });
        marker(svg, X(m.ex), top, ph, m.c, '這一對：' + m.ex);
      });
      txt(svg, PAD, 268, '三種分數單位不同、範圍不同、方向甚至相反。0.47 + 10.5 + 2.0 = 12.97 沒有任何意義。', { 'font-size': 13, fill: 'var(--bad)', 'font-weight': 700 });
      txt(svg, PAD, 290, '實線 = 同一人時的分數分布　虛線 = 不同人（同制服）時的分數分布', { 'font-size': 12, fill: 'var(--ink-3)' });
    } else {
      var W = 3 * PW + 2 * GAPX - 216, L = PAD, X = function (v) { return L + (v + 6) / 12 * W; }, rh = 74;
      txt(svg, PAD, 16, '全部換成同一把尺：證據（對數似然比）', { 'font-weight': 700, 'font-size': 13 });
      var total = 0;
      NM.forEach(function (m, k) {
        var y0 = 30 + k * rh;
        txt(svg, W + 14, y0 + 30, m.n, { 'font-weight': 700, 'font-size': 13, fill: m.c });
        // 把原始分數的分布轉到證據軸（數值積分）
        ['g', 'i'].forEach(function (w) {
          var bins = new Array(61).fill(0), N = 600;
          for (var s = 0; s <= N; s++) { var x = m.lo + (m.hi - m.lo) * s / N, b = Math.round((llr(m, x) + 6) * 5); bins[b] += dens(m, x, w) * (m.hi - m.lo) / N; }
          bins[0] = 0; bins[60] = 0;
          var sm = bins.map(function (v, i) { return ((bins[i - 1] || 0) + 2 * v + (bins[i + 1] || 0)) / 4; });
          var mx = Math.max.apply(null, sm) || 1, d = '';
          sm.forEach(function (v, i) { d += (i ? 'L' : 'M') + X(i / 5 - 6).toFixed(1) + ' ' + (y0 + 56 - v / mx * 44).toFixed(1); });
          el('path', { d: d, fill: 'none', stroke: m.c, 'stroke-width': 2, 'stroke-dasharray': w === 'i' ? '5 4' : null, opacity: w === 'i' ? 0.75 : 1 }, svg);
        });
        el('line', { x1: X(-6), x2: X(6), y1: y0 + 56, y2: y0 + 56, stroke: 'var(--rule)' }, svg);
        var e = llr(m, m.ex); total += e;
        marker(svg, X(e), y0 + 8, 48, m.c, (e >= 0 ? '+' : '') + e.toFixed(1));
      });
      el('line', { x1: X(0), x2: X(0), y1: 28, y2: 30 + 3 * rh - 12, stroke: 'var(--ink-3)' }, svg);
      axis(svg, L, W, 30 + 3 * rh - 12, [-6, -3, 0, 3, 6], true);
      txt(svg, X(-6), 30 + 3 * rh + 22, '← 支持「不同人」', { 'font-size': 11.5, fill: 'var(--bad)', 'font-weight': 700 });
      txt(svg, X(6), 30 + 3 * rh + 22, '支持「同一人」 →', { 'text-anchor': 'end', 'font-size': 11.5, fill: 'var(--good)', 'font-weight': 700 });
      // 加總
      var sx = W + 70;
      txt(svg, sx, 52, '這一對的總證據', { 'font-weight': 700, 'font-size': 13 });
      var yy = 76;
      NM.forEach(function (m) { var e = llr(m, m.ex); txt(svg, sx, yy, m.n, { fill: m.c, 'font-size': 12.5, 'font-weight': 700 }); txt(svg, sx + 130, yy, (e >= 0 ? '+' : '') + e.toFixed(2), { 'text-anchor': 'end', class: 'num', 'font-size': 13 }); yy += 22; });
      el('line', { x1: sx, x2: sx + 130, y1: yy - 12, y2: yy - 12, stroke: 'var(--ink)' }, svg);
      txt(svg, sx, yy + 6, '總和', { 'font-weight': 700, 'font-size': 13 });
      txt(svg, sx + 130, yy + 6, (total >= 0 ? '+' : '') + total.toFixed(2), { 'text-anchor': 'end', class: 'num', 'font-size': 14, 'font-weight': 700, fill: total >= 0 ? 'var(--good)' : 'var(--bad)' });
      var p = 1 / (1 + Math.exp(-total));
      txt(svg, sx, yy + 32, '同一人的機率 ≈ ' + Math.round(p * 100) + '%', { 'font-size': 12.5, 'font-weight': 700 });
      txt(svg, sx, yy + 54, '（假設先驗 1:1、線索獨立）', { 'font-size': 11, fill: 'var(--ink-3)' });
      txt(svg, sx, yy + 84, '看不到的線索 = 0', { 'font-size': 12, fill: 'var(--ink-2)' });
      txt(svg, sx, yy + 102, '不加也不扣', { 'font-size': 12, fill: 'var(--ink-2)' });
    }
  }
  function curvePair(svg, m, X, top, ph) {
    ['g', 'i'].forEach(function (w) {
      var d = '', N = 80, mx = 0, pts = [];
      for (var s = 0; s <= N; s++) { var x = m.lo + (m.hi - m.lo) * s / N, v = dens(m, x, w); pts.push([x, v]); mx = Math.max(mx, dens(m, m.half ? 0 : (w === 'g' ? m.g[0] : m.i[0]), w)); }
      pts.forEach(function (pt, i) { d += (i ? 'L' : 'M') + X(pt[0]).toFixed(1) + ' ' + (top + ph - pt[1] / mx * (ph - 10)).toFixed(1); });
      el('path', { d: d, fill: 'none', stroke: m.c, 'stroke-width': 2, 'stroke-dasharray': w === 'i' ? '5 4' : null, opacity: w === 'i' ? 0.75 : 1 }, svg);
    });
  }
  function axis(svg, x0, w, y, ticks, signed) {
    el('line', { x1: x0, x2: x0 + w, y1: y, y2: y, stroke: 'var(--ink-3)' }, svg);
    var lo = ticks[0], hi = ticks[ticks.length - 1];
    ticks.forEach(function (t) { var x = x0 + (t - lo) / (hi - lo) * w; el('line', { x1: x, x2: x, y1: y, y2: y + 4, stroke: 'var(--ink-3)' }, svg); txt(svg, x, y + 16, (signed && t > 0 ? '+' : '') + (Math.round(t * 10) / 10), { 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--ink-3)', class: 'num' }); });
  }
  function marker(svg, x, top, h, c, label) {
    el('line', { x1: x, x2: x, y1: top, y2: top + h, stroke: 'var(--ink)', 'stroke-width': 1.6 }, svg);
    el('circle', { cx: x, cy: top, r: 4, fill: 'var(--ink)' }, svg);
    txt(svg, x + 6, top + 4, label, { 'font-size': 11.5, 'font-weight': 700, 'paint-order': 'stroke', stroke: 'var(--sheet)', 'stroke-width': 3 });
  }
  function drawNormCards() {
    var shapes = {
      'Min-Max': function (x) { return x; }, 'Z-score': function (x) { return U.clamp((x - 0.5) * 1.6 + 0.5, 0, 1); },
      'Tanh': function (x) { return 0.5 * (Math.tanh(5 * (x - 0.5)) + 1); }, '似然比 LR': function (x) { return U.clamp(0.5 + 0.9 * Math.sign(x - 0.5) * Math.pow(Math.abs(x - 0.5) * 2, 1.6) / 2, 0, 1); },
      'Platt 校準': function (x) { return 1 / (1 + Math.exp(-10 * (x - 0.55))); }, 'Isotonic': function (x) { return Math.min(1, Math.floor(x * 5 + 0.3) / 5); }
    };
    var rec = { '似然比 LR': '建議', 'Platt 校準': '少量標註即可' };
    $('#norm-cards').innerHTML = R.NORM.map(function (r) {
      var f = shapes[r[0]], d = '';
      for (var i = 0; i <= 30; i++) { var x = i / 30; d += (i ? 'L' : 'M') + (4 + x * 72).toFixed(1) + ' ' + (44 - f(x) * 40).toFixed(1); }
      return '<div class="ncard' + (rec[r[0]] === '建議' ? ' on' : '') + '"><svg viewBox="0 0 80 48" aria-hidden="true"><path d="M4 44H76M4 4V44" stroke="#c5ccc2" fill="none"/><path d="' + d + '" stroke="' + (rec[r[0]] === '建議' ? '#0c8a0c' : '#1c251f') + '" stroke-width="2" fill="none"/></svg>' +
        '<div><b>' + r[0] + '</b>' + (rec[r[0]] ? ' <span class="rec">' + rec[r[0]] + '</span>' : '') + '<code>' + U.esc(r[1]) + '</code><span>' + r[2] + '</span></div></div>';
    }).join('');
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
