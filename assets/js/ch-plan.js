/* ch-plan.js — 第 4 章（身分四層、輸出、算力）與第 5 章（驗證與資料蒐集、品控與月報） */
(function (global) {
  'use strict';
  var el = U.el, $ = U.$, R = global.R;
  var CH = global.CH;
  var arrow = function (s, a, b, c, d) { global.svgArrow(s, a, b, c, d); };
  function evBadge(lv) {
    return { proven: '<span class="ev proven"><i></i>文獻證實</span>', inferred: '<span class="ev inferred"><i></i>合理推論</span>', open: '<span class="ev open"><i></i>待驗證</span>' }[lv] || '';
  }
  function table(id, head, rows, fmt) {
    $('#' + id).innerHTML = '<thead><tr>' + head.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) { return '<tr>' + r.map(function (c, i) { return '<td>' + (fmt ? fmt(c, i, r) : (i === 0 ? '<b>' + c + '</b>' : c)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody>';
  }
  function txt(svg, x, y, t, o) { return el('text', Object.assign({ x: x, y: y, 'font-size': 12.5, fill: 'var(--ink)', text: t }, o || {}), svg); }

  /* ======================= 8 系統假想 ======================= */
  CH.system = {
    init: function () {
      if ($('#id-states')) drawStates(); if ($('#bud-svg')) initBudget(); if ($('#out-map')) initOut();
      if ($('#fail-tbl')) table('fail-tbl', ['失敗方式', '成因', '對策'], R.FAILS);
    }
  };
  // D10 身分狀態圖（取代原本的 #sys-layers）；「身分的四層」動畫按鈕掛在圖標題列，由 ourplay 的 data-op 委派處理
  function drawStates() {
    var box = $('#id-states');
    global.PipeView.idStates(box);
    var head = box.closest('figure') && box.closest('figure').querySelector('.plate-head');
    if (head && !head.querySelector('[data-op="layers"]')) head.insertAdjacentHTML('beforeend', global.PipeView.btn('anim', 'data-op="' + global.PIPE.ID_STATES.anim + '"'));
  }
  // ---- 算力試算 ----
  var bud = { cams: 10, hrs: 24, occ: 40, fps: 5, det: 38.9, dec: 4, crops: 1600, reid: 15, win: 10, proc: 1 };
  function initBudget() {
    var box = $('#bud-ctrl');
    var defs = [
      ['cams', '攝影機數', 1, 60, 1, function (v) { return v + ' 台'; }],
      ['hrs', '每台每日錄影', 1, 24, 1, function (v) { return v + ' 小時'; }],
      ['occ', '有人出現的時段比例', 5, 100, 5, function (v) { return v + '%'; }],
      ['fps', '偵測抽幀', 1, 10, 1, function (v) { return v + ' fps'; }],
      ['det', '偵測每幀耗時', 5, 200, 0.1, function (v) { return v.toFixed(1) + ' ms'; }],
      ['dec', '解碼每幀耗時（假設）', 1, 20, 0.5, function (v) { return v + ' ms'; }],
      ['win', '夜間處理窗口', 2, 24, 1, function (v) { return v + ' 小時'; }],
      ['proc', '並行程序（核心）數', 1, 16, 1, function (v) { return v; }]
    ];
    defs.forEach(function (d) {
      var row = U.h('div', { class: 'slider' }, '<label for="bud-' + d[0] + '">' + d[1] + '</label><output class="num" id="bud-' + d[0] + '-o"></output><input type="range" id="bud-' + d[0] + '" min="' + d[2] + '" max="' + d[3] + '" step="' + d[4] + '" value="' + bud[d[0]] + '">');
      box.appendChild(row);
      var inp = $('#bud-' + d[0]), out = $('#bud-' + d[0] + '-o');
      function upd() { out.textContent = d[5](+inp.value); }
      inp.addEventListener('input', function () { bud[d[0]] = +inp.value; upd(); drawBudget(); });
      upd();
    });
    drawBudget();
  }
  function drawBudget() {
    var svg = U.clear($('#bud-svg'));
    var perDec = 3600 * 25 * bud.dec / 1000 / 60;
    var perDet = 3600 * bud.fps * bud.det / 1000 / 60 * bud.occ / 100;
    var perReid = bud.crops * bud.reid / 1000 / 60 * bud.occ / 100;
    var camH = bud.cams * bud.hrs;
    var need = camH * (perDec + perDet + perReid) / 60; // 小時
    var cap = bud.win * bud.proc;
    var max = Math.max(need, cap) * 1.15, L = 30, W = 540;
    function X(v) { return L + v / max * W; }
    txt(svg, 0, 18, '每日需要的處理時間 vs 夜間可用時間（小時）', { 'font-weight': 700, 'font-size': 13 });
    var parts = [['解碼', camH * perDec / 60, '#8d968e'], ['偵測', camH * perDet / 60, '#2a78d6'], ['ReID', camH * perReid / 60, '#d55181']];
    var x = L;
    parts.forEach(function (p) {
      var w = p[1] / max * W;
      el('rect', { x: x, y: 50, width: Math.max(0.5, w - 2), height: 44, fill: p[2] }, svg);
      if (w > 46) txt(svg, x + 6, 77, p[0], { fill: '#fff', 'font-size': 12, 'font-weight': 700 });
      x += w;
    });
    txt(svg, L, 42, '需要', { 'font-size': 12, fill: 'var(--ink-2)' });
    txt(svg, x + 6, 77, need.toFixed(1) + ' h', { class: 'num', 'font-weight': 700 });
    el('rect', { x: L, y: 124, width: cap / max * W, height: 30, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1.6, 'stroke-dasharray': '5 3' }, svg);
    txt(svg, L, 118, '可用（窗口 × 程序數）', { 'font-size': 12, fill: 'var(--ink-2)' });
    txt(svg, X(cap) + 6, 144, cap.toFixed(0) + ' h', { class: 'num', 'font-weight': 700 });
    el('line', { x1: X(cap), x2: X(cap), y1: 36, y2: 160, stroke: 'var(--ink)', 'stroke-dasharray': '2 3' }, svg);
    var ok = need <= cap;
    txt(svg, 0, 196, ok ? '✓ 夜間可以處理完' : '✗ 處理不完：需要約 ' + Math.ceil(need / bud.win) + ' 個並行程序，或降低抽幀、跳過空場', { 'font-weight': 700, fill: ok ? 'var(--good)' : 'var(--bad)', 'font-size': 14 });
    txt(svg, 0, 224, '每相機小時：解碼 ' + perDec.toFixed(1) + ' 分 + 偵測 ' + perDet.toFixed(1) + ' 分 + ReID ' + perReid.toFixed(1) + ' 分', { 'font-size': 12.5, fill: 'var(--ink-2)', class: 'num' });
    txt(svg, 0, 246, '每日錄影總量 ' + camH + ' 相機小時；單程序每夜約可處理 ' + Math.floor(bud.win * 60 / (perDec + perDet + perReid)) + ' 相機小時', { 'font-size': 12.5, fill: 'var(--ink-2)', class: 'num' });
    txt(svg, 0, 276, '假設影片 25 fps 且全部解碼；偵測與 ReID 只在有人的時段執行；ReID 每相機小時 1,600 張裁切、每張 15 ms。', { 'font-size': 11.5, fill: 'var(--ink-3)' });
  }

  // ---- 輸出示意 ----
  var PLACES = { gate: [70, 300, '營門'], yard: [260, 200, '集合場'], mess: [440, 290, '餐廳'], dorm: [120, 90, '寢室'], office: [420, 90, '連部'] };
  var CAMS = [['C1', 124, 318], ['C2', 314, 218], ['C3', 494, 308], ['C4', 174, 108], ['C5', 474, 108]];
  var PEOPLE = [
    { n: '已註冊 A-0231', known: true, conf: 0.94, path: [['dorm', '06:42', 'C4', .9], ['yard', '06:55', 'C2', .8], ['mess', '07:10', 'C3', .92], ['yard', '07:48', 'C2', .7], ['office', '08:05', 'C5', .88], ['mess', '12:02', 'C3', .9], ['office', '12:50', 'C5', .86]] },
    { n: '已註冊 B-1187', known: true, conf: 0.81, path: [['dorm', '06:50', 'C4', .85], ['yard', '07:02', 'C2', .55], ['gate', '07:30', 'C1', .9], ['gate', '17:12', 'C1', .88], ['yard', '17:25', 'C2', .5], ['dorm', '17:40', 'C4', .8]] },
    { n: '未知-#7', known: false, conf: 0.62, path: [['gate', '09:14', 'C1', .9], ['yard', '09:21', 'C2', .6], ['office', '09:33', 'C5', .7], ['yard', '10:40', 'C2', .45], ['gate', '10:52', 'C1', .85]] }
  ];
  var outSel = 0;
  function initOut() {
    var seg = $('#out-person');
    PEOPLE.forEach(function (p, i) {
      var b = U.h('button', { 'aria-pressed': i === 0 ? 'true' : 'false' }, p.n);
      b.addEventListener('click', function () { outSel = i; U.$$('button', seg).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); drawOut(); });
      seg.appendChild(b);
    });
    drawOut();
  }
  function drawOut() {
    var svg = U.clear($('#out-map'));
    el('rect', { x: 0, y: 0, width: 560, height: 380, fill: '#eef0ea', rx: 6 }, svg);
    el('path', { d: 'M70 330 V200 H260 V90 M260 200 H440 V90 M260 200 V290 H440', fill: 'none', stroke: '#d5dad0', 'stroke-width': 26, 'stroke-linejoin': 'round' }, svg);
    Object.keys(PLACES).forEach(function (k) {
      var p = PLACES[k];
      el('rect', { x: p[0] - 46, y: p[1] - 26, width: 92, height: 52, rx: 4, fill: '#fff', stroke: 'var(--ink-3)' }, svg);
      txt(svg, p[0], p[1] + 5, p[2], { 'text-anchor': 'middle', 'font-size': 13 });
    });
    CAMS.forEach(function (c) {
      el('circle', { cx: c[1], cy: c[2], r: 9, fill: 'var(--ink)' }, svg);
      txt(svg, c[1], c[2] + 4, c[0], { 'text-anchor': 'middle', 'font-size': 9.5, fill: '#fff', 'font-weight': 700 });
    });
    var P = PEOPLE[outSel], col = P.known ? '#4f5c30' : '#c93434';
    var cnt = {}, pos = P.path.map(function (s) {
      var p = PLACES[s[0]], k = cnt[s[0]] = (cnt[s[0]] || 0) + 1;
      return [p[0] - 36 + (k - 1) * 22, p[1] - 40];
    });
    for (var i = 1; i < pos.length; i++) {
      var low = P.path[i][3] < 0.6;
      el('line', { x1: pos[i - 1][0], y1: pos[i - 1][1], x2: pos[i][0], y2: pos[i][1], stroke: col, 'stroke-width': 2.2, 'stroke-dasharray': low ? '5 4' : null, opacity: 0.75 }, svg);
    }
    pos.forEach(function (q, i) {
      el('circle', { cx: q[0], cy: q[1], r: 10, fill: '#fff', stroke: col, 'stroke-width': 2 }, svg);
      txt(svg, q[0], q[1] + 4, String(i + 1), { 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: col, class: 'num' });
    });
    txt(svg, 10, 370, '實線 = 高信心連結　虛線 = 低信心（進人工覆核）', { 'font-size': 11.5, fill: 'var(--ink-2)' });
    var rows = P.path.map(function (s, i) {
      return '<tr><td class="num">' + (i + 1) + '</td><td class="num">' + s[1] + '</td><td>' + PLACES[s[0]][2] + '（' + s[2] + '）</td><td class="num" style="color:' + (s[3] < 0.6 ? 'var(--bad)' : 'var(--ink)') + '">' + Math.round(s[3] * 100) + '%</td></tr>';
    }).join('');
    $('#out-side').innerHTML = '<div class="stat-row"><div><div class="stat num">214</div><div class="stat-l">11/03–11/09 獨立人數（區間 205–223）</div></div></div>' +
      '<p style="margin:4px 0 8px"><b>' + P.n + '</b>　' + (P.known ? '已比對到資料庫（整群信心 ' + Math.round(P.conf * 100) + '%）' : '<span style="color:var(--bad)">資料庫查無此人，出現 3 天後提示人工註冊</span>') + '</p>' +
      '<table class="tbl"><thead><tr><th>#</th><th>時間</th><th>地點</th><th>連結信心</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  /* ======================= 9 驗證與資料蒐集 ======================= */
  CH.validation = {
    init: function () {
      drawSetup(); drawSched(); drawCov(); drawSplit(); drawExp('E1');
      table('val-metrics', ['功能', '指標', '注意'], R.METRICS);
      table('plan-tbl', ['月份', '查核點', '可驗證的交付物', '推進的成熟度'], R.PLAN6);
    }
  };
  function drawSetup() {
    var svg = $('#val-setup'), g = 250, sc = 30, x0 = 60;
    el('line', { x1: 20, x2: 620, y1: g, y2: g, stroke: 'var(--ink-3)' }, svg);
    el('line', { x1: x0, x2: x0, y1: g, y2: g - 3.5 * sc, stroke: 'var(--ink)', 'stroke-width': 4 }, svg);
    el('rect', { x: x0 - 6, y: g - 3.5 * sc - 9, width: 24, height: 12, rx: 2, fill: 'var(--ink)' }, svg);
    var cy = g - 3.5 * sc, a1 = 12 * Math.PI / 180, a2 = 48 * Math.PI / 180;
    el('path', { d: 'M' + x0 + ' ' + cy + ' L' + (x0 + 3.5 * sc / Math.tan(a1)) + ' ' + g + ' L' + (x0 + 3.5 * sc / Math.tan(a2)) + ' ' + g + ' Z', fill: '#2a78d6', opacity: 0.1 }, svg);
    txt(svg, x0 + 14, cy - 14, '主機位：高 3–5 m、俯角 20–40°', { 'font-weight': 700 });
    txt(svg, x0 + 14, cy + 4, '解析度與壓縮設定照營區監視器', { 'font-size': 11.5, fill: 'var(--ink-2)' });
    [5, 10, 15].forEach(function (d) {
      var x = x0 + d * sc;
      el('line', { x1: x, x2: x, y1: g, y2: g + 8, stroke: 'var(--ink-3)' }, svg);
      txt(svg, x, g + 22, d + ' m', { 'text-anchor': 'middle', 'font-size': 11.5, fill: 'var(--ink-3)', class: 'num' });
      el('line', { x1: x, x2: x, y1: g, y2: g - 1.72 * sc, stroke: 'var(--olive)', 'stroke-width': 5, 'stroke-linecap': 'round' }, svg);
      el('circle', { cx: x, cy: g - 1.72 * sc - 4, r: 5, fill: 'var(--olive)' }, svg);
    });
    txt(svg, x0 + 10 * sc, g + 42, '近、中、遠三段距離都要拍到；走直線、轉彎、交會、短暫遮擋', { 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--ink-2)' });
    el('rect', { x: 620, y: g - 1.2 * sc, width: 16, height: 10, rx: 2, fill: 'var(--c-face)' }, svg);
    txt(svg, 612, g - 1.2 * sc + 9, '參考機（只用於標註）', { 'font-size': 11.5, fill: 'var(--c-face)', 'text-anchor': 'end' });
    // 右側：俯視配置
    var ox = 690, oy = 30;
    el('rect', { x: ox, y: oy, width: 280, height: 220, rx: 6, fill: '#fff', stroke: 'var(--rule)' }, svg);
    txt(svg, ox + 12, oy + 20, '俯視：3–4 個機位，視野不重疊', { 'font-size': 12, 'font-weight': 700 });
    el('path', { d: 'M' + (ox + 30) + ' ' + (oy + 180) + ' H' + (ox + 250) + ' M' + (ox + 140) + ' ' + (oy + 180) + ' V' + (oy + 50) + ' M' + (ox + 140) + ' ' + (oy + 110) + ' H' + (ox + 250), fill: 'none', stroke: '#d5dad0', 'stroke-width': 18 }, svg);
    [[ox + 40, oy + 160, 'C1'], [ox + 150, oy + 70, 'C2'], [ox + 240, oy + 95, 'C3'], [ox + 240, oy + 165, 'C4']].forEach(function (c) {
      el('circle', { cx: c[0], cy: c[1], r: 9, fill: 'var(--ink)' }, svg);
      txt(svg, c[0], c[1] + 4, c[2], { 'text-anchor': 'middle', 'font-size': 9.5, fill: '#fff', 'font-weight': 700 });
    });
    txt(svg, ox + 12, oy + 210, '走廊、樓梯口、門口；記錄兩兩之間最短步行時間', { 'font-size': 11, fill: 'var(--ink-3)' });
  }
  function drawSched() {
    var svg = $('#val-sched');
    txt(svg, 0, 16, '拍攝日程：5 個拍攝日，分散在 3 週以上', { 'font-weight': 700, 'font-size': 13 });
    var days = ['一', '二', '三', '四', '五'], shoot = { '0-0': 1, '0-3': 2, '1-1': 3, '2-0': 4, '2-4': 5 };
    for (var w = 0; w < 3; w++) {
      txt(svg, 0, 62 + w * 56, '第 ' + (w + 1) + ' 週', { 'font-size': 12, fill: 'var(--ink-2)' });
      for (var d = 0; d < 5; d++) {
        var x = 60 + d * 80, y = 40 + w * 56, k = shoot[w + '-' + d];
        if (!w) txt(svg, x + 34, 34, '週' + days[d], { 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--ink-3)' });
        el('rect', { x: x, y: y, width: 70, height: 42, rx: 5, fill: k ? 'var(--olive)' : '#fff', stroke: 'var(--rule)' }, svg);
        if (k) txt(svg, x + 35, y + 26, '第 ' + k + ' 次', { 'text-anchor': 'middle', 'font-size': 12, fill: '#fff', 'font-weight': 700 });
      }
    }
    txt(svg, 0, 224, '第 4、5 次與第 1 次間隔超過兩週，用來測「長期」跨日。', { 'font-size': 12, fill: 'var(--ink-2)' });
    txt(svg, 0, 244, '人數：建議 30–40 人（25 位註冊 + 10–15 位未註冊干擾者）；', { 'font-size': 12, fill: 'var(--ink-2)' });
    txt(svg, 0, 262, '辦公室人少時，先 10–15 人做 TRL 3 概念驗證也可以。', { 'font-size': 12, fill: 'var(--ink-2)' });
  }
  function drawCov() {
    var svg = $('#val-cov');
    txt(svg, 0, 16, '變因矩陣：每人每日跑「基準 + 隨機 2 項」', { 'font-weight': 700, 'font-size': 13 });
    var cov = ['改戴鋼盔', '換運動服（同一天內）', '冬季外套／夏季捲袖', '手持物或背包', '走路速度（慢／快）'];
    var pick = [[0, 2], [1, 3], [0, 4], [2, 3], [1, 4]];
    for (var d = 0; d < 5; d++) txt(svg, 210 + d * 52, 40, '第' + (d + 1) + '次', { 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--ink-3)' });
    txt(svg, 190, 70, '基準（迷彩服＋小帽）', { 'text-anchor': 'end', 'font-size': 12 });
    for (var d0 = 0; d0 < 5; d0++) el('circle', { cx: 210 + d0 * 52, cy: 66, r: 8, fill: 'var(--ink)' }, svg);
    cov.forEach(function (c, i) {
      var y = 100 + i * 30;
      txt(svg, 190, y + 4, c, { 'text-anchor': 'end', 'font-size': 12 });
      for (var d = 0; d < 5; d++) {
        var on = pick[d].indexOf(i) >= 0;
        el('circle', { cx: 210 + d * 52, cy: y, r: 8, fill: on ? 'var(--olive)' : '#fff', stroke: on ? 'none' : 'var(--rule)' }, svg);
      }
    });
    txt(svg, 0, 262, '避免組合爆炸，又讓每種變因都至少出現兩次。', { 'font-size': 12, fill: 'var(--ink-2)' });
  }
  function drawSplit() {
    var svg = $('#val-split');
    var groups = ['訓練用人員（約 12 人）', '測試：已註冊（約 15 人）', '測試：未註冊（約 10 人）'];
    var C = { train: '#a7b47c', gal: '#2a78d6', qry: '#eb6834', hold: 'url(#hold)', none: '#f0f1ec' };
    var defs = el('defs', {}, svg), pat = el('pattern', { id: 'hold', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
    el('rect', { width: 6, height: 6, fill: '#48544b' }, pat); el('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: '#8d968e', 'stroke-width': 2 }, pat);
    var L = 190, cw = 37;
    for (var d = 0; d < 5; d++) {
      txt(svg, L + d * 4 * cw + 2 * cw, 18, '第 ' + (d + 1) + ' 天', { 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--ink-2)' });
      for (var c = 0; c < 4; c++) txt(svg, L + (d * 4 + c) * cw + cw / 2, 36, 'C' + (c + 1), { 'text-anchor': 'middle', 'font-size': 10.5, fill: 'var(--ink-3)' });
    }
    groups.forEach(function (gname, gi) {
      var y = 46 + gi * 46;
      txt(svg, L - 10, y + 24, gname, { 'text-anchor': 'end', 'font-size': 12.5 });
      for (var d = 0; d < 5; d++) for (var c = 0; c < 4; c++) {
        var k;
        if (d === 4 || c === 3) k = 'hold';
        else if (gi === 0) k = 'train';
        else if (gi === 1) k = d < 2 ? 'gal' : 'qry';
        else k = d < 2 ? 'none' : 'qry';
        el('rect', { x: L + (d * 4 + c) * cw + 1, y: y, width: cw - 3, height: 36, rx: 3, fill: C[k] }, svg);
      }
    });
    var lg = [['train', '訓練／微調'], ['gal', 'Gallery（早期日）'], ['qry', 'Query（後期日）'], ['hold', '最終保留：整天 + 整個機位'], ['none', '不使用']];
    var lx = L;
    lg.forEach(function (l) {
      el('rect', { x: lx, y: 196, width: 14, height: 14, rx: 2, fill: C[l[0]], stroke: l[0] === 'none' ? 'var(--rule)' : 'none' }, svg);
      txt(svg, lx + 20, 208, l[1], { 'font-size': 12, fill: 'var(--ink-2)' }); lx += l[1].length * 12.5 + 40;
    });
    txt(svg, L, 240, '人員不重疊（訓練與測試不同人）；Gallery 與 Query 跨日；未註冊者只出現在 Query，用來測「查無此人」。', { 'font-size': 12, fill: 'var(--ink-2)' });
  }
  function drawExp(sel) {
    var svg = U.clear($('#val-exp'));
    var phases = [['基準', ['E1', 'E2']], ['單一線索', ['E3', 'E4', 'E5']], ['融合與系統', ['E6', 'E10', 'E11', 'E7', 'E8', 'E9']]];
    var x = 0, w = 84, gap = 10;
    phases.forEach(function (ph, pi) {
      var x0 = x;
      ph[1].forEach(function (id) {
        var e = R.EXPS.filter(function (z) { return z.id === id; })[0], on = id === sel;
        var g = el('g', { tabindex: 0, role: 'button', 'aria-label': id + ' ' + e.q, style: 'cursor:pointer' }, svg);
        el('rect', { x: x + 1, y: 40, width: w, height: 120, rx: 8, fill: on ? 'var(--ink)' : '#fff', stroke: 'var(--ink)', 'stroke-width': 1.3 }, g);
        txt(g, x + 12, 66, id, { 'font-size': 18, 'font-weight': 700, fill: on ? '#fff' : 'var(--olive)', class: 'num' });
        var q = e.q, lines = [q.slice(0, 6), q.slice(6, 12), q.slice(12)].filter(Boolean);
        lines.forEach(function (l, k) { txt(g, x + 12, 92 + k * 18, l, { 'font-size': 12.5, fill: on ? '#fff' : 'var(--ink)' }); });
        function go() { drawExp(id); }
        g.addEventListener('click', go);
        g.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(); } });
        x += w + gap;
      });
      el('path', { d: 'M' + (x0 + 4) + ' 30 v-6 H' + (x - gap - 4) + ' v6', fill: 'none', stroke: 'var(--ink-3)' }, svg);
      txt(svg, (x0 + x - gap) / 2, 16, ph[0], { 'text-anchor': 'middle', 'font-weight': 700, 'font-size': 12.5, fill: 'var(--ink-2)' });
      if (pi < 2) { arrow(svg, x - gap + 2, 100, x + 14, 100); x += 18; }
    });
    txt(svg, 0, 196, '對應本章的六個月查核點：第 2 月 E1、第 3 月 E2–E3、第 4 月 E4–E5、第 5 月 E10、E11 與 E7、第 6 月 E9', { 'font-size': 12, fill: 'var(--ink-3)' });
    var e = R.EXPS.filter(function (z) { return z.id === sel; })[0];
    $('#val-exp-d').innerHTML = '<h3 style="margin-top:0">' + e.id + '：' + e.q + '</h3><dl><dt>基準</dt><dd>' + e.base + '</dd><dt>改變</dt><dd>' + e.mod + '</dd><dt>必看指標</dt><dd>' + e.m + '</dd><dt>通過／停止</dt><dd>' + e.go + '</dd></dl>';
  }

  /* ======================= 10 品控與月報 ======================= */
  var KEY = 'ccid-module-trl-v1';
  var mod = load();
  function load() {
    var def = {}; R.MODULES.forEach(function (m) { def[m.k] = m.cur; });
    try { var s = global.localStorage && localStorage.getItem(KEY); if (s) return Object.assign(def, JSON.parse(s)); } catch (e) { /* 部分瀏覽器在 file:// 下禁止儲存 */ }
    return def;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(mod)); } catch (e) { /* 忽略 */ } }
  CH.qc = {
    init: function () {
      drawMod();
      $('#mod-reset').addEventListener('click', function () { R.MODULES.forEach(function (m) { mod[m.k] = m.cur; }); save(); drawMod(); });
      table('trl-tbl', ['TRL', '名稱', 'AI／軟體可作為證據的成果'], R.TRL, function (c, i) { return i === 0 ? '<b class="num">' + c + '</b>' : (i === 1 ? '<b>' + c + '</b>' : c); });
      drawMLTRL(3);
      $('#fw-tbl').innerHTML = '<thead><tr><th>框架</th><th>內容</th><th>對你的用途</th><th>證據</th></tr></thead><tbody>' +
        R.FRAMEWORKS.map(function (f) { return '<tr><td><b><a href="' + f.src + '" target="_blank" rel="noopener">' + f.n + '</a></b></td><td>' + f.d + '</td><td>' + f.use + '</td><td>' + evBadge(f.lv) + '</td></tr>'; }).join('') + '</tbody>';
      table('gate-tbl', ['縮寫', '中文（常見譯法）', '目的', '對 TRL 1–3 研究專案'], R.GATES);
      $('#report-tpl').textContent = REPORT;
      $('#copy-report').addEventListener('click', function () {
        var btn = this;
        function done() { btn.textContent = '已複製'; setTimeout(function () { btn.textContent = '複製範本'; }, 1600); }
        if (navigator.clipboard && global.isSecureContext) navigator.clipboard.writeText(REPORT).then(done, fallback); else fallback();
        function fallback() {
          var ta = document.createElement('textarea'); ta.value = REPORT; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); done(); } catch (e) { btn.textContent = '請手動選取複製'; }
          document.body.removeChild(ta);
        }
      });
    }
  };
  function drawMod() {
    var svg = U.clear($('#mod-svg'));
    var L = 150, cw = 72, rh = 36, top = 34, maxL = 6;
    for (var t = 1; t <= maxL; t++) txt(svg, L + (t - 0.5) * cw, 22, 'TRL ' + t, { 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--ink-2)', class: 'num' });
    var minV = 9, weakest = [];
    R.MODULES.forEach(function (m) { if (mod[m.k] < minV) { minV = mod[m.k]; weakest = [m.n]; } else if (mod[m.k] === minV) weakest.push(m.n); });
    R.MODULES.forEach(function (m, i) {
      var y = top + i * rh, v = mod[m.k];
      txt(svg, L - 10, y + 22, m.n, { 'text-anchor': 'end', 'font-size': 13 });
      for (var t = 1; t <= maxL; t++) {
        var on = t <= v;
        var r = el('rect', { x: L + (t - 1) * cw + 2, y: y + 4, width: cw - 4, height: rh - 8, rx: 4, fill: on ? (v === minV ? '#c93434' : '#4f5c30') : '#fff', stroke: on ? 'none' : 'var(--rule)', style: 'cursor:pointer', tabindex: 0, role: 'button', 'aria-label': m.n + ' 設為 TRL ' + t }, svg);
        (function (k, lvl) {
          function go() { mod[k] = lvl; save(); drawMod(); }
          r.addEventListener('click', go);
          r.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
        })(m.k, t);
        U.tip(r, '<b>' + m.n + '</b>：' + m.note);
      }
    });
    var ys = top + R.MODULES.length * rh + 10;
    el('line', { x1: 0, x2: L + maxL * cw, y1: ys - 4, y2: ys - 4, stroke: 'var(--ink)' }, svg);
    txt(svg, L - 10, ys + 22, '系統整體', { 'text-anchor': 'end', 'font-size': 13.5, 'font-weight': 700 });
    for (var t2 = 1; t2 <= maxL; t2++) el('rect', { x: L + (t2 - 1) * cw + 2, y: ys + 4, width: cw - 4, height: rh - 8, rx: 4, fill: t2 <= minV ? 'var(--ink)' : '#fff', stroke: t2 <= minV ? 'none' : 'var(--rule)' }, svg);
    $('#mod-side').innerHTML = '<div class="stat num" style="font-size:44px">TRL ' + minV + '</div><div class="stat-l">系統整體（= 最低模組）</div>' +
      '<p style="margin-top:14px"><b>拉住系統的模組：</b><br>' + weakest.join('、') + '</p>' +
      '<p class="small muted">紅色是目前最弱的模組。下一個查核點應優先推進它們，而不是把已領先的模組做得更好。</p>';
  }
  function drawMLTRL(sel) {
    var svg = U.clear($('#mltrl-svg'));
    var w = 92, gap = 6;
    txt(svg, 0, 14, 'MLTRL', { 'font-size': 12, 'font-weight': 700, fill: 'var(--ink-2)' });
    txt(svg, 0, 184, '傳統 TRL', { 'font-size': 12, 'font-weight': 700, fill: 'var(--ink-2)' });
    var trlX = function (t) { return (t - 1) * (w + gap) + w / 2 + (w + gap) / 2; };
    for (var t = 1; t <= 9; t++) {
      el('rect', { x: trlX(t) - 40, y: 150, width: 80, height: 28, rx: 4, fill: '#fff', stroke: 'var(--ink-3)' }, svg);
      txt(svg, trlX(t), 169, 'TRL ' + t, { 'text-anchor': 'middle', 'font-size': 12, class: 'num' });
    }
    var map = [[1, 1], [1, 2], [2, 3], [3, 3], [4, 4], [4, 5], [5, 6], [6, 7], [7, 8], [9, 9]];
    R.MLTRL.forEach(function (m, i) {
      var x = i * (w + gap), on = i === sel;
      var mid = (map[i][0] + map[i][1]) / 2;
      el('path', { d: 'M' + (x + w / 2) + ' 82 C' + (x + w / 2) + ' 115 ' + trlX(mid) + ' 115 ' + trlX(mid) + ' 148', fill: 'none', stroke: on ? 'var(--ink)' : 'var(--rule)', 'stroke-width': on ? 2 : 1 }, svg);
      var g = el('g', { tabindex: 0, role: 'button', 'aria-label': 'MLTRL ' + m[0] + ' ' + m[1], style: 'cursor:pointer' }, svg);
      el('rect', { x: x + 1, y: 24, width: w, height: 58, rx: 6, fill: on ? 'var(--ink)' : (i <= 3 ? '#e3e8d6' : '#fff'), stroke: 'var(--ink)', 'stroke-width': 1.2 }, g);
      txt(g, x + 10, 46, String(m[0]), { 'font-size': 16, 'font-weight': 700, fill: on ? '#fff' : 'var(--olive)', class: 'num' });
      txt(g, x + 10, 70, m[1], { 'font-size': 12, fill: on ? '#fff' : 'var(--ink)' });
      function go() { drawMLTRL(i); }
      g.addEventListener('click', go);
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
    txt(svg, 0, 204, '綠底 = 你目前所在範圍（MLTRL 0–3）', { 'font-size': 11.5, fill: 'var(--ink-3)' });
    var m2 = R.MLTRL[sel];
    $('#mltrl-d').innerHTML = '<h3 style="margin-top:0">MLTRL ' + m2[0] + '：' + m2[1] + '</h3><dl><dt>要求與證據</dt><dd>' + m2[2] + '</dd><dt>對應傳統 TRL</dt><dd>' + m2[3] + '（推論）</dd></dl>';
  }

  var REPORT = [
    '【跨攝影機同制服辨識】研發月報　　年　月',
    '',
    '一、本月結論（一句話）',
    '　目前系統 TRL：＿（最低模組：＿＿）；較上月變動：＿；證據：＿＿',
    '',
    '二、工作項目與進度',
    '　工作項目｜預定累計進度｜實際累計進度｜差異原因',
    '',
    '三、查核點狀態',
    '　編號｜內容（具體、可驗證、可量化）｜預定日期｜狀態｜佐證檔案',
    '',
    '四、本月成果',
    '　1. 實驗結果表：資料集版本｜模型版本｜指標（同日／跨日分開）｜與基準差異',
    '　2. 可重現資訊：程式碼版本（commit）｜隨機種子｜執行環境',
    '　3. 失敗與負面結果（照列）',
    '',
    '五、模組成熟度自評',
    '　模組｜目前 TRL｜下一級進入條件｜缺口｜預計達成月份',
    '　人形偵測／單相機追蹤／外觀特徵／人臉／步態／時空約束／同日分群／跨日連結／開集識別',
    '',
    '六、資料管理',
    '　資料來源｜授權｜機敏分級｜去識別化｜儲存位置｜受測者同意狀態',
    '',
    '七、問題與對策',
    '　問題｜影響｜對策｜負責人｜期限',
    '',
    '八、風險登錄',
    '　技術風險｜資料風險｜授權風險（GPL／非商用權重）｜資安風險｜進度風險',
    '',
    '九、下月計畫與資源需求',
    '',
    '十、需主管決定的事項',
    '　（例：是否申請營區真實影片以進入 TRL 4）'
  ].join('\n');
})(window);
