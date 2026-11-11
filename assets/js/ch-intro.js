/* ch-intro.js — 總覽頁的系統全景與名詞表；第 1 章的「營區場景 × 線索」與「ReID 怎麼評分」入門圖 */
(function (global) {
  'use strict';
  var PM = global.PersonModel, el = U.el, $ = U.$;
  var CH = global.CH = global.CH || {};
  var P = global.PEOPLE;

  /* ======================= 總覽：系統全景＋名詞 ======================= */
  var intro = { raf: 0, t: 0, pano: null };
  CH.intro = {
    init: function () {
      intro.pano = global.ArchViz.make({ svg: '#pano', tour: '#pano-tour', detail: '#pano-detail', here: 'home' });
      var G = global.GLOSS || [];
      $('#gloss-grid').innerHTML = G.filter(function (g) { return g.core; }).map(function (g) { return '<div class="gcard"><b>' + g.t + '</b><span>' + g.d + '</span></div>'; }).join('');
      $('#gloss-all').innerHTML = G.map(function (g) { return '<dt>' + g.t + '</dt><dd>' + g.d + '</dd>'; }).join('');
    },
    enter: function () {
      if (U.reduceMotion || intro.raf) return;
      var last = performance.now();
      function step(now) {
        intro.raf = 0;
        if (!document.getElementById('ch-home').classList.contains('active')) return;
        var dt = Math.min(0.05, (now - last) / 1000); last = now; intro.t += dt;
        intro.pano.tick(dt, intro.t);
        intro.raf = requestAnimationFrame(step);
      }
      intro.raf = requestAnimationFrame(step);
    },
    leave: function () { cancelAnimationFrame(intro.raf); intro.raf = 0; }
  };

  /* ======================= 第 1 章：查詢、排序與評分 ======================= */
  // 資料庫排序：字母 = 真實身分；查詢是人員 A
  var RANKS = {
    good: { ids: 'AABACDEB', note: '本人的三段畫面排在第 1、2、4 名：Rank-1 命中，mAP 也高。' },
    mid: { ids: 'ABCADAEB', note: '第一名是本人，Rank-1 一樣算命中；但另外兩段排到第 4、6 名，AP 就掉了。這就是為什麼兩個指標都要看。' },
    bad: { ids: 'BCADAEAB', note: '同制服時，最像的常常是穿一樣衣服的別人：第一名是人員 B，Rank-1 失敗，AP 也很低。若查詢的人根本不在資料庫裡，第一名一定是錯的——這是第 3 章「識別」要處理的開放集問題。' }
  };
  var CAMBG = ['#d7dccf', '#d9d2c2', '#cfd6d8'];
  CH.primer = {
    init: function () { U.segGroup($('#primer-sel'), 'data-p', function (v) { drawPrimer(v); }); drawPrimer('good'); drawSceneMx(); }
  };
  function person(g, p, x, y, h, yaw) {
    var fg = el('g', {}, g);
    PM.renderSVG(fg, PM.parts(p, p.phase0 + 1.1, { yaw: yaw, pitch: 0.12, scale: h * p.H, x: x, y: y }, 'rgb'), {});
  }
  function txt(p, x, y, s, o) { return el('text', Object.assign({ x: x, y: y, 'font-size': 12, fill: 'var(--ink)', text: s }, o || {}), p); }
  function drawPrimer(k) {
    var svg = U.clear($('#primer')), sc = RANKS[k], ids = sc.ids.split('');
    var idx = { A: 0, B: 1, C: 2, D: 3, E: 4 };
    // 查詢
    txt(svg, 0, 18, '查詢', { 'font-weight': 700, 'font-size': 14 });
    el('rect', { x: 0, y: 28, width: 110, height: 150, rx: 6, fill: CAMBG[0], stroke: 'var(--ink)', 'stroke-width': 2 }, svg);
    person(svg, P[0], 55, 168, 118, 0.45);
    txt(svg, 55, 198, '攝影機 1・人員 A', { 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--ink-2)' });
    // 箭頭
    el('path', { d: 'M122 103 H170 m-7 -6 l7 6 l-7 6', fill: 'none', stroke: 'var(--ink-3)', 'stroke-width': 1.8 }, svg);
    txt(svg, 146, 90, '比對嵌入', { 'text-anchor': 'middle', 'font-size': 11.5, fill: 'var(--ink-3)' });
    txt(svg, 146, 124, '依相似度排序', { 'text-anchor': 'middle', 'font-size': 11.5, fill: 'var(--ink-3)' });
    txt(svg, 190, 18, '資料庫（其他攝影機拍到的畫面），由最像排到最不像', { 'font-weight': 700, 'font-size': 14 });
    var hits = 0, precs = [];
    ids.forEach(function (id, r) {
      var x = 190 + r * 98, hit = id === 'A';
      if (hit) { hits++; precs.push([hits, r + 1]); }
      txt(svg, x + 44, 44, '#' + (r + 1), { 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: r === 0 ? 'var(--ink)' : 'var(--ink-3)', class: 'num' });
      el('rect', { x: x, y: 52, width: 88, height: 126, rx: 6, fill: CAMBG[(r % 2) + 1], stroke: hit ? 'var(--good)' : '#b8bfb5', 'stroke-width': hit ? 3 : 1.2 }, svg);
      person(svg, P[idx[id]], x + 44, 170, 98, 0.9 + (r % 3) * 0.35);
      txt(svg, x + 44, 198, '人員 ' + id + (hit ? '（本人）' : ''), { 'text-anchor': 'middle', 'font-size': 12, 'font-weight': hit ? 700 : 400, fill: hit ? 'var(--good)' : 'var(--ink-2)' });
      txt(svg, x + 44, 216, '相似度 ' + (0.91 - r * 0.05).toFixed(2), { 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--ink-3)', class: 'num' });
      if (hit) {
        el('rect', { x: x + 14, y: 226, width: 60, height: 24, rx: 12, fill: '#e3efe0' }, svg);
        txt(svg, x + 44, 242, hits + ' / ' + (r + 1), { 'text-anchor': 'middle', 'font-size': 12.5, 'font-weight': 700, fill: 'var(--good)', class: 'num' });
      }
    });
    txt(svg, 190, 266, '綠色小框：找到第 k 段本人時，前 r 名裡有幾段是本人（這一刻的精確率 k / r）', { 'font-size': 11.5, fill: 'var(--ink-3)' });
    // 指標
    var r1 = ids[0] === 'A', ap = precs.reduce(function (s, q) { return s + q[0] / q[1]; }, 0) / precs.length;
    el('line', { x1: 0, x2: 980, y1: 280, y2: 280, stroke: 'var(--rule)' }, svg);
    txt(svg, 0, 312, 'Rank-1：', { 'font-size': 15, 'font-weight': 700 });
    txt(svg, 66, 312, r1 ? '✓ 命中（第一名是本人）' : '✗ 失敗（第一名是別人）', { 'font-size': 15, 'font-weight': 700, fill: r1 ? 'var(--good)' : 'var(--bad)' });
    txt(svg, 380, 312, '這個查詢的 AP = (' + precs.map(function (q) { return q[0] + '/' + q[1]; }).join(' + ') + ') ÷ ' + precs.length + ' = ' + ap.toFixed(2), { 'font-size': 15, 'font-weight': 700, class: 'num' });
    txt(svg, 980, 312, '所有查詢的 AP 平均 = mAP', { 'text-anchor': 'end', 'font-size': 12.5, fill: 'var(--ink-3)' });
    $('#primer-note').textContent = sc.note;
  }

  /* ======================= 第 1 章：營區場景 × 身分線索 ======================= */
  var SC_COLS = [['外觀', '同服裝內', '#2a78d6'], ['臉', '', '#6250d6'], ['體型', '身高比例', '#9a7b12'], ['步態', '', '#d55181'], ['時空', '攝影機間', '#1c251f'], ['刷卡', '輔助', '#6f7a71']];
  var SC_ROWS = [
    { n: '營門出入', o: '迷彩服、便服（收假）、運動服', d: '排隊互相遮擋、停下刷卡不走動', v: [1, 2, 1, 1, 2, 2],
      t: ['同一套服裝之內可用；收假穿便服時外觀差異大', '若門口有近距攝影機：正面、距離近，是全營區最好的身分錨點', '排隊時互相遮擋，全身不一定看得到', '走幾步就停下刷卡，序列短', '進出時間精確，可接上營內的路徑', '有，但可能代刷：只當輔助證據，與影像不符時列入待查'] },
    { n: '營區道路', o: '迷彩服、鋼盔、運動服', d: '遠距、俯角、跨攝影機角度差', v: [1, 0, 1, 2, 2, 0],
      t: ['同一套服裝之內可用；距離遠時細節少', '距離遠、俯角大，幾乎拍不清臉', '可估身高，單目誤差約 5–6 cm，只能當弱證據', '側面連續行走，是步態條件最好的場景', '攝影機之間的最短步行時間是很強、且不看衣服的線索', '一般沒有'] },
    { n: '走廊、寢室外', o: '迷彩服、運動服、冬季外套', d: '接近垂直的俯角；常在這裡換裝', v: [1, 1, 0, 1, 2, 0],
      t: ['寢室是常見的換裝地點：進去穿迷彩服、出來可能已換運動服', '距離近，但俯角接近垂直，多半只拍到帽頂或頭頂', '俯角太大，身高與比例估不準', '空間窄、能連續走的距離短', '寢室進出常是一天路徑的起點與終點', '一般沒有'] },
    { n: '餐廳、中山室', o: '迷彩服、冬季外套', d: '坐姿、遮擋、室內燈光', v: [1, 1, 0, 0, 1, 0],
      t: ['同一套服裝之內可用；室內可能脫帽', '坐著面向攝影機時有機會拍到', '坐著或被桌椅擋住，看不到全身', '大多坐著或站著排隊，沒有在走路', '同時在場的人多，約束擋不了誰', '一般沒有'] },
    { n: '集合場（小團體）', o: '迷彩服、鋼盔', d: '同時多人、同服裝', v: [1, 0, 1, 1, 1, 0],
      t: ['全員同服裝，只剩細節可用', '距離遠', '站立時全身可見，可估身高與比例', '集合時多半站著，走動段短', '多人同時同地，約束幾乎沒有作用', '一般沒有'] },
    { n: '操場、體能', o: '運動服', d: '跑步；換裝前後要連起來', v: [1, 0, 2, 0, 1, 0],
      t: ['全員運動服；只能在換裝之後的時段內互相連結', '距離遠、動作大', '運動服貼身，輪廓最清楚', '跑步和走路的步態不同，現有模型多以走路訓練', '操場出入口可接上換裝前後的路徑', '一般沒有'] },
    { n: '夜間一般照明', o: '各種', d: '範圍邊界：看不清時允許「無法判定」', v: [0, 0, 1, 1, 1, 0], edge: true,
      t: ['顏色失真、雜訊大', '幾乎不可用', '路燈下輪廓仍可能看得到', '輪廓清楚時仍可用', '仍可用', '一般沒有'] }
  ];
  var scSel = { r: 0, c: -1 };
  function drawSceneMx() {
    var svg = U.clear($('#scene-mx')), L = 150, cw = 80, T = 52, rh = 48;
    SC_COLS.forEach(function (c, j) {
      var x = L + j * cw + cw / 2;
      txt(svg, x, 20, c[0], { 'text-anchor': 'middle', 'font-weight': 700, 'font-size': 13.5, fill: c[2] });
      if (c[1]) txt(svg, x, 37, c[1], { 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--ink-3)' });
    });
    SC_ROWS.forEach(function (r, i) {
      var y = T + i * rh, sel = scSel.r === i;
      if (r.edge) el('line', { x1: 0, x2: L + 6 * cw, y1: y - 2, y2: y - 2, stroke: 'var(--rule)', 'stroke-dasharray': '4 4' }, svg);
      el('rect', { x: 0, y: y + 2, width: L + 6 * cw, height: rh - 6, rx: 6, fill: sel ? '#fff' : 'transparent', stroke: sel ? 'var(--ink)' : 'none' }, svg);
      var lg = el('g', { tabindex: 0, role: 'button', 'aria-label': r.n, style: 'cursor:pointer' }, svg);
      txt(lg, 8, y + 22, r.n, { 'font-weight': 700, 'font-size': 13, fill: r.edge ? 'var(--ink-3)' : 'var(--ink)' });
      txt(lg, 8, y + 38, r.o, { 'font-size': 10.5, fill: 'var(--ink-3)' });
      bind(lg, function () { scSel = { r: i, c: -1 }; drawSceneMx(); });
      r.v.forEach(function (v, j) {
        var cx = L + j * cw + cw / 2, cy = y + rh / 2 - 1, c = SC_COLS[j][2];
        var g = el('g', { tabindex: 0, role: 'button', 'aria-label': r.n + '、' + SC_COLS[j][0] + '：' + ['幾乎用不上', '有限', '可用'][v], style: 'cursor:pointer' }, svg);
        el('rect', { x: cx - 24, y: cy - 17, width: 48, height: 34, rx: 6, fill: 'transparent', stroke: sel && scSel.c === j ? 'var(--ink)' : 'none', 'stroke-width': 2 }, g);
        el('circle', { cx: cx, cy: cy, r: 10, fill: v === 2 ? c : '#fff', stroke: c, 'stroke-width': 2, opacity: r.edge ? 0.6 : 1 }, g);
        if (v === 1) el('path', { d: 'M' + cx + ' ' + (cy - 10) + ' A10 10 0 0 0 ' + cx + ' ' + (cy + 10) + ' Z', fill: c, opacity: r.edge ? 0.6 : 1 }, g);
        bind(g, function () { scSel = { r: i, c: j }; drawSceneMx(); });
      });
    });
    var r = SC_ROWS[scSel.r];
    var lv = ['<i class="lvd"></i> 幾乎用不上', '<i class="lvd h"></i> 有限', '<i class="lvd f"></i> 可用'];
    $('#scene-d').innerHTML = '<h3 style="margin-top:0">' + r.n + '</h3><dl><dt>常見服裝</dt><dd>' + r.o + '</dd><dt>主要困難</dt><dd>' + r.d + '</dd></dl>' +
      '<ul class="sc-list">' + SC_COLS.map(function (c, j) { return '<li' + (scSel.c === j ? ' class="on"' : '') + '><span class="sw-dot" style="--c:' + c[2] + '"></span><b>' + c[0] + '</b> <span class="muted small">' + lv[r.v[j]] + '</span><br>' + r.t[j] + '</li>'; }).join('') + '</ul>';
  }
  function bind(g, fn) { g.addEventListener('click', fn); g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } }); }
})(window);
