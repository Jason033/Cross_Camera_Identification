/* ch-fusion.js — 整體技術架構（第 2 章與總覽共用）、分群演算法選擇流程 */
(function (global) {
  'use strict';
  var PM = global.PersonModel, el = U.el, $ = U.$, R = global.R;
  var CH = global.CH = global.CH || {};
  var P = global.PEOPLE;
  var C = { app: '#2a78d6', sil: '#1baf7a', skel: '#eb6834', face: '#6250d6', gait: '#d55181', body: '#9a7b12', ink: '#1c251f' };
  

  // 第 3 章只剩分群演算法選擇流程；整體架構圖改由 pipeview.js 以 ArchViz.master 畫在 #master-*
  CH.fusion = { init: function () { if ($('#clu-tree')) drawTree(); } };

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
    if (!$(o.svg)) return { tick: function () {}, stub: true }; // 舊呼叫者的畫布已被主圖取代（總覽 #pano、第 3 章 #arch）
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
  /* ======================= 主圖（D1）：系統尺＋我們的 ①–⑦、Q ＝ 由 makeArch 改造 =======================
     三種 mode：home（總覽，含導覽與詳情）、ours（第 4 章，每步多一行關鍵設定）、compact（第 3 章，無導覽、無詳情，點步驟跳到 #step-N）。
     各站小圖沿用 MINI（縮到 BW≈106）；由 pipeview.js 的 PipeView.master 建立外框與詳情區後呼叫。 */
  var STM = PIPE.OURS; // ①–⑦＋Q（8 站）
  var MBX = 13, MBW = 106, MGAP = 18, MS = 106 / 122, MBY = 108, MBH = 240;
  function mx(i) { return MBX + i * (MBW + MGAP); }
  function mcx(i) { return mx(i) + MBW / 2; }
  function oursIdx(sysId) { for (var i = 0; i < STM.length; i++) if ((STM[i].sys || []).indexOf(sysId) >= 0) return i; return -1; }
  function sysFirstVersion(i) { // 第一版選擇：steps.js 的 table.use（Q 沒有）
    var st = (global.STEPS || [])[i];
    return st && st.table ? st.table.use : '';
  }
  function cfgRows(i) { // OURS.key 指到 steps.js cfg 的「項目」名，取其設定文字
    var st = (global.STEPS || [])[i], keys = STM[i].key || [];
    if (!st || !st.choice || !st.choice.cfg) return [];
    return keys.map(function (k) { return st.choice.cfg.filter(function (r) { return r[0] === k; })[0]; }).filter(Boolean);
  }
  function makeMaster(o) {
    // o = { svg, mode, steps（按鈕列）, tourBtn, detail }（皆為元素）
    var inst = { o: o, sel: 0, tour: o.mode !== 'compact' && !U.reduceMotion, tokT: 0, figs: [], master: true };
    use(inst, function () {
      if (o.steps) {
        STM.forEach(function (s, i) {
          var b = U.h('button', { type: 'button', 'data-i': String(i), 'aria-pressed': i === 0 ? 'true' : 'false' }, '<span class="num">' + s.sym + '</span> ' + s.short);
          b.addEventListener('click', function () { use(inst, function () { AR.tour = false; syncTourM(); selectM(i, true); }); });
          o.steps.appendChild(b);
        });
      }
      if (o.tourBtn) o.tourBtn.addEventListener('click', function () { use(inst, function () { AR.tour = !AR.tour; syncTourM(); }); });
      syncTourM();
      drawMaster();
      if (o.mode !== 'compact') selectM(0, true);
    });
    inst.tick = function (dt, t) { use(inst, function () { tickMaster(dt, t); }); };
    return inst;
  }
  function syncTourM() {
    var tb = AR.o.tourBtn;
    if (!tb) return;
    tb.textContent = AR.tour ? '❚❚ 暫停' : '▶ 播放';
    tb.setAttribute('aria-pressed', AR.tour ? 'true' : 'false');
  }
  function selectM(i, jump) {
    AR.sel = i;
    if (jump) { AR.tokT = i * 2.4 + 1.0; if (AR.tok) placeTokenM(); }
    if (AR.o.steps) U.$$('button', AR.o.steps).forEach(function (b) { b.setAttribute('aria-pressed', +b.getAttribute('data-i') === i ? 'true' : 'false'); });
    AR.boxes.forEach(function (g, k) { g.setAttribute('opacity', k === i ? 1 : 0.4); });
    AR.frames.forEach(function (r, k) { r.setAttribute('stroke', k === i ? 'var(--ink)' : 'var(--rule)'); r.setAttribute('stroke-width', k === i ? 2.2 : 1); });
    AR.rcells.forEach(function (list, k) { list.forEach(function (r) { r.setAttribute('fill', k === i ? '#e3e9d2' : '#fff'); r.setAttribute('stroke', k === i ? 'var(--ink)' : 'var(--rule)'); }); });
    AR.rbr.forEach(function (p, k) { p.setAttribute('stroke', k === i ? 'var(--ink)' : 'var(--ink-3)'); p.setAttribute('stroke-width', k === i ? 2 : 1.2); });
    if (AR.o.detail) AR.o.detail.innerHTML = detailM(i);
  }
  function detailM(i) {
    var s = STM[i], q = s.id === 'Q', mode = AR.o.mode;
    var one = s.one || (q ? PIPE.sys('query').d + '。系統的輸出給人看、給人查，也讓人把低信心的結果覆核回來。' : ''), io = s.io || (q ? '身分與軌跡 → 報表、事後查詢、人工覆核' : '');
    var why = s.why || (q ? '前面所有步驟的結果要變成人看得懂、查得到的東西，並留一條人工覆核的路。' : '');
    var first = sysFirstVersion(i), rows = cfgRows(i);
    var methods = q ? '#/approach?a=out-map' : '#/methods?s=' + s.id;
    var setting = mode === 'ours' ? (q ? '#/approach?a=out-map' : '#/methods?a=choice-' + s.id) : '#/approach?a=master-approach';
    var cfg = (mode === 'ours' && rows.length) ? '<dt>我們的設定</dt><dd>' + rows.map(function (r) { return '<b>' + r[0] + '：</b>' + r[1]; }).join('<br>') + '</dd>' : '';
    return '<div class="arch-num num">' + s.sym + '</div><div><h3 style="margin:0 0 4px">' + s.n + (s.ev ? '　' + evB(s.ev) : '') + '</h3><p style="margin:0 0 8px">' + PIPE.fmt(one) + '</p><dl>' +
      '<dt>輸入 → 輸出</dt><dd>' + PIPE.fmt(io) + '</dd><dt>為什麼需要</dt><dd>' + PIPE.fmt(why) + '</dd>' +
      (first ? '<dt>第一版選擇</dt><dd>' + first + '</dd>' : '') + cfg + '</dl>' +
      '<p class="pv-links"><a class="pv-link" href="' + methods + '">看方法</a><button type="button" class="fp-btn" data-pv-op="' + s.play + '" title="開一個視窗，逐步播放這個方法、系統或步驟"><i></i>動畫</button><a class="pv-link" href="' + setting + '">我們的設定</a></p></div>';
  }
  function drawMaster() {
    var o = AR.o, svg = U.clear(o.svg), inst = AR, ours = o.mode === 'ours', tok = o.mode !== 'compact';
    var F = MBY + MBH + (ours ? 84 : 0), H = F + (tok ? 150 : 112), N = STM.length;
    svg.setAttribute('viewBox', '0 0 1000 ' + H);
    AR.boxes = []; AR.frames = []; AR.rcells = []; AR.rbr = []; AR.F = F;
    STM.forEach(function () { AR.rcells.push([]); });
    // 系統層的 9 步尺
    txt(svg, MBX, 11, '系統層：每個系統都有的 9 步，括號對到下方我們的步驟', { 'font-size': 10.5, fill: 'var(--ink-3)' });
    var cnt = {}, cxs = STM.map(function () { return []; });
    PIPE.SYS.forEach(function (z) {
      var mi = oursIdx(z.id), n = (STM[mi].sys || []).length, k = cnt[mi] || 0, w = n > 1 ? (MBW - 2) / n : MBW, x0 = mx(mi) + k * (w + 2);
      cnt[mi] = k + 1;
      var g = el('g', { style: 'cursor:pointer' }, svg);
      el('title', { text: z.n + '：' + z.d + '（產出：' + z.out + '）' }, g);
      AR.rcells[mi].push(el('rect', { x: x0, y: 16, width: w, height: 24, rx: 3, fill: '#fff', stroke: 'var(--rule)' }, g));
      txt(g, x0 + w / 2, 32, z.n, { 'text-anchor': 'middle', 'font-size': n > 1 ? 10.5 : 11.5, 'font-weight': 700, fill: 'var(--ink-2)' });
      cxs[mi].push(x0 + w / 2);
      g.addEventListener('click', function () { act(mi); });
    });
    STM.forEach(function (s, i) {
      var c = cxs[i], d = c.length > 1 ? 'M' + c[0] + ' 41v5H' + c[c.length - 1] + 'v-5M' + mcx(i) + ' 46v9' : 'M' + c[0] + ' 41v14';
      AR.rbr.push(el('path', { d: d, fill: 'none', stroke: 'var(--ink-3)', 'stroke-width': 1.2 }, svg));
    });
    function act(i) {
      if (o.mode === 'compact') { location.hash = i === N - 1 ? '#/approach?a=out-map' : '#/methods?s=' + STM[i].id; return; }
      use(inst, function () { AR.tour = false; syncTourM(); selectM(i, true); });
    }
    // 下排：我們的步驟
    STM.forEach(function (s, i) {
      var x = mx(i), cx = mcx(i), g = el('g', { tabindex: 0, role: o.mode === 'compact' ? 'link' : 'button', 'aria-label': s.sym + ' ' + s.short, style: 'cursor:pointer' }, svg);
      el('circle', { cx: cx, cy: 70, r: 11, fill: 'var(--ink)' }, g);
      txt(g, cx, 74.5, s.id === 'Q' ? 'Q' : String(s.id), { 'text-anchor': 'middle', fill: '#fff', 'font-weight': 700, 'font-size': 13, class: 'num' });
      txt(g, cx, 100, s.short, { 'text-anchor': 'middle', 'font-weight': 700, 'font-size': 14 });
      var fr = el('rect', { x: x + 0.5, y: MBY, width: MBW, height: MBH, rx: 8, fill: '#fff', stroke: 'var(--rule)' }, g);
      AR.frames.push(fr);
      var inner = el('g', { transform: 'translate(' + x + ' ' + MBY + ') scale(' + MS.toFixed(4) + ') translate(' + (-x) + ' ' + (-MBY) + ')' }, g);
      AR.boxes.push(g);
      MINI[i](inner, x, MBY);
      g.addEventListener('click', function () { act(i); });
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(i); } });
      if (i < N - 1) { // 箭頭上寫「這一步交給下一步的產出物」
        el('path', { d: 'M' + (cx + 14) + ' 70h91m-5 -4l5 4l-5 4', fill: 'none', stroke: 'var(--ink-3)', 'stroke-width': 1.6 }, svg);
        txt(svg, (cx + mcx(i + 1)) / 2, 62, s.out, { 'text-anchor': 'middle', 'font-size': 10.5, fill: 'var(--ink-2)' });
      }
    });
    // 圖上沒有方塊的輸出：Q 的產出物寫在方塊右上
    // ours：每步下方的關鍵設定（OURS.key → steps.js cfg 文字）
    if (ours) STM.forEach(function (s, i) {
      var rows = cfgRows(i).slice(0, 2);
      var fo = el('foreignObject', { x: mx(i), y: MBY + MBH + 6, width: MBW, height: 74 }, svg);
      var d = document.createElement('div');
      d.className = 'mk';
      d.innerHTML = rows.length ? rows.map(function (r) { return '<p><b>' + r[0] + '</b>' + U.esc(r[1].length > 22 ? r[1].slice(0, 21) + '…' : r[1]) + '</p>'; }).join('') : '<p class="muted">' + (s.id === 'Q' ? '報表、查詢、覆核' : '') + '</p>';
      fo.appendChild(d);
    });
    // ⑤ 的兩個去向：轉移時間 → ④ 的證據；不可能配對 → ⑥
    var c4 = mcx(3), c5 = mcx(4), c6 = mcx(5);
    function curve(x1, x2, dash, col) {
      el('path', { d: 'M' + x1 + ' ' + (F + 4) + 'C' + x1 + ' ' + (F + 34) + ' ' + x2 + ' ' + (F + 34) + ' ' + x2 + ' ' + (F + 6) + 'm-4 8l4 -8l4 8', fill: 'none', stroke: col, 'stroke-width': 1.7, 'stroke-dasharray': dash || null }, svg);
    }
    curve(c5 - 10, c4 + 6, '5 4', C.skel);
    txt(svg, (c4 + c5) / 2 - 2, F + 50, '轉移時間 → 證據', { 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: C.skel });
    curve(c5 + 10, c6 - 6, null, 'var(--bad)');
    txt(svg, (c5 + c6) / 2 + 2, F + 50, '不可能配對', { 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: 'var(--bad)' });
    // 名冊、刷卡從下方進 ⑦
    var x7 = mx(6);
    [['人員名冊', x7], ['門禁刷卡', x7 + MBW / 2 + 2]].forEach(function (c) {
      var w = MBW / 2 - 2;
      el('rect', { x: c[1], y: F + 32, width: w, height: 22, rx: 4, fill: 'var(--paper)', stroke: 'var(--ink-3)', 'stroke-dasharray': '3 2' }, svg);
      txt(svg, c[1] + w / 2, F + 47, c[0], { 'text-anchor': 'middle', 'font-size': 10.5, fill: 'var(--ink-2)' });
      el('path', { d: 'M' + (c[1] + w / 2) + ' ' + (F + 32) + 'V' + (F + 6) + 'm-4 6l4 -6l4 6', fill: 'none', stroke: 'var(--ink-3)', 'stroke-width': 1.5 }, svg);
    });
    // 大階段括號
    PIPE.STAGE_GROUPS.forEach(function (gp, gi) {
      var ids = gp[1].map(function (x) { return x === 'Q' ? N - 1 : x - 1; });
      var x1 = mx(ids[0]) + 3, x2 = mx(ids[ids.length - 1]) + MBW - 3, col = GRPC[gi];
      el('path', { d: 'M' + x1 + ' ' + (F + 70) + 'v6H' + x2 + 'v-6', fill: 'none', stroke: col, 'stroke-width': 1.6 }, svg);
      txt(svg, (x1 + x2) / 2, F + 94, gp[0], { 'text-anchor': 'middle', 'font-weight': 700, fill: col, 'font-size': 12.5 });
    });
    if (!tok) return;
    // 片段的旅程（自動導覽）
    var ty = F + 134;
    txt(svg, MBX, ty - 20, '跟著一段片段走完全程：', { 'font-size': 12, fill: 'var(--ink-3)' });
    el('line', { x1: mcx(0), x2: mcx(N - 1), y1: ty, y2: ty, stroke: 'var(--rule)', 'stroke-width': 3, 'stroke-linecap': 'round' }, svg);
    STM.forEach(function (s, i) { el('circle', { cx: mcx(i), cy: ty, r: 4, fill: 'var(--sheet)', stroke: 'var(--ink-3)', 'stroke-width': 1.5 }, svg); });
    AR.ty = ty;
    AR.tok = el('g', {}, svg);
    AR.tokR = el('rect', { x: -38, y: -13, width: 76, height: 26, rx: 13, fill: 'var(--ink)' }, AR.tok);
    AR.tokDots = el('g', {}, AR.tok);
    AR.tokT_ = txt(AR.tok, 0, 4.5, '', { 'text-anchor': 'middle', fill: '#fff', 'font-weight': 700, 'font-size': 12 });
    placeTokenM();
  }
  function placeTokenM() {
    var per = 2.4, n = STM.length, T = AR.tokT % (per * n), i = Math.floor(T / per), f = T - i * per;
    var move = 0.7, x;
    if (f < move && i > 0) { var k = f / move; k = k * k * (3 - 2 * k); x = U.lerp(mcx(i - 1), mcx(i), k); }
    else x = mcx(i);
    var stI = (f < move * 0.5 && i > 0) ? i - 1 : i, label = STM[stI].tok || '報表';
    AR.tok.setAttribute('transform', 'translate(' + x + ',' + AR.ty + ')');
    AR.tokT_.textContent = label;
    var w = Math.max(64, label.length * 12.5 + 22);
    AR.tokR.setAttribute('x', -w / 2); AR.tokR.setAttribute('width', w);
    AR.tokR.setAttribute('fill', stI >= 6 ? 'var(--good)' : stI === 5 ? '#eb6834' : 'var(--ink)');
    U.clear(AR.tokDots);
    if (stI >= 2 && stI <= 3) [C.app, C.sil, C.skel].forEach(function (c, k) { el('circle', { cx: -w / 2 + 2 + k * 9 - 8, cy: -14, r: 4, fill: c }, AR.tokDots); });
    return stI;
  }
  function tickMaster(dt, t) {
    if (AR.tour && AR.tok) {
      AR.tokT += dt;
      var s = placeTokenM();
      if (s !== AR.sel) selectM(s, false);
    }
    AR.figs.forEach(function (f) { PM.renderSVG(f.g, PM.parts(f.p, VK.phase(f.p, t), f.v, 'rgb'), {}); });
    if (AR.clu) drawCluDots(t);
  }
  global.ArchViz = { make: makeArch, master: makeMaster };

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
    },
    function (g, x, y) { // 查詢輸出：報表、事後查詢、人工覆核
      el('rect', { x: x + 8, y: y + 12, width: 106, height: 20, rx: 10, fill: '#fff', stroke: 'var(--ink-3)' }, g);
      txt(g, x + 20, y + 26, '人員 C ・ 5/12', { 'font-size': 10.5, fill: 'var(--ink-2)' });
      el('circle', { cx: x + 100, cy: y + 22, r: 4, fill: 'none', stroke: 'var(--ink-3)', 'stroke-width': 1.5 }, g);
      [['08:02', '營門', false], ['08:11', '集合場', false], ['12:03', '餐廳', true]].forEach(function (r, k) {
        var yy = y + 46 + k * 34;
        el('rect', { x: x + 8, y: yy, width: 106, height: 28, rx: 4, fill: r[2] ? '#f6ecd0' : '#f2f4ef', stroke: r[2] ? 'var(--warn)' : 'var(--rule)' }, g);
        txt(g, x + 16, yy + 18, r[0], { 'font-size': 11, 'font-weight': 700, class: 'num' });
        txt(g, x + 54, yy + 18, r[1], { 'font-size': 11 });
        if (r[2]) txt(g, x + 106, yy + 18, '?', { 'font-size': 13, 'font-weight': 700, fill: 'var(--warn)', 'text-anchor': 'end' });
      });
      txt(g, x + 8, y + 164, '低信心 → 人工覆核', { 'font-size': 10.5, fill: 'var(--warn)', 'font-weight': 700 });
      el('rect', { x: x + 8, y: y + 176, width: 48, height: 22, rx: 4, fill: '#e3efe0', stroke: 'var(--good)' }, g);
      txt(g, x + 32, y + 191, '✓ 是', { 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: 'var(--good)' });
      el('rect', { x: x + 64, y: y + 176, width: 48, height: 22, rx: 4, fill: '#fff', stroke: 'var(--rule)' }, g);
      txt(g, x + 88, y + 191, '✗ 不是', { 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--ink-3)' });
      txt(g, x + 8, y + 232, '事後查詢指定人員與日期', { 'font-size': 10.5, fill: 'var(--ink-3)' });
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
