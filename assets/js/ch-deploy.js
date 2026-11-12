/* ch-deploy.js — 評估協定與合成資料、資料集、證據板與研究空缺、參考文獻 */
(function (global) {
  'use strict';
  var D = global.DATA, PM = global.PersonModel, el = U.el, $ = U.$;
  var CH = global.CH = global.CH || {};

  /* ======================= 評估協定與合成資料 ======================= */
  CH.camera = {
    init: function () { if ($('#protocols')) drawProtocols(); if ($('#synth')) drawSynth(); }
  };

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
    el('text', { x: lx + 22, y: B + 68, 'font-size': 13, fill: 'var(--ink-2)', text: '部分數字待核對' }, svg);
    el('text', { x: R, y: B + 68, 'text-anchor': 'end', 'font-size': 12.5, fill: 'var(--ink-3)', text: '點圓圈看詳細資料' }, svg);
  }
  function drawDsDetail() {
    var d = D.DATASETS.filter(function (x) { return x.id === dsSel; })[0];
    $('#ds-detail').innerHTML = '<h3>' + d.name + ' <span class="small muted">' + d.year + ' · ' + d.type + '</span></h3>' +
      (d.verify ? '<p class="small" style="color:var(--warn);margin:0">已確認存在（' + (d.src || '') + '）；部分數字取自前次報告，待回原文核對</p>' : (d.src ? '<p class="small muted" style="margin:0">' + d.src + '</p>' : '')) +
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
      h += '<tr><td><b>' + d.name + '</b>' + (d.verify ? ' <span class="small" style="color:var(--warn)">部分待核對</span>' : '') + '</td>' + D.TECH_COLS.map(function (c) { return '<td class="cell">' + glyph(d.tech[c.k]) + '</td>'; }).join('') + '</tr>';
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
        if (c[0] === 'name') v = '<b>' + v + '</b>' + (d.verify ? ' <span class="small" style="color:var(--warn)">部分待核對</span>' : '');
        return '<td class="' + (c[2] || '') + '">' + v + '</td>';
      }).join('') + '</tr>';
    });
    var t = $('#ds-table'); t.innerHTML = h + '</tbody>';
    U.$$('th button', t).forEach(function (b) { b.addEventListener('click', function () { var k = b.getAttribute('data-k'); dsSort = { k: k, dir: dsSort.k === k ? -dsSort.dir : -1 }; drawDsTable(); }); });
  }

  /* ======================= 證據板與研究空缺（第 5 章） ======================= */
  var SHORT = { adaface: 'AdaFace', farsight: 'BRIAR 融合', gunel: 'Günel 2019', mevid: 'MEVID', clustercontrast: 'Cluster Contrast', cal: 'CAL', ltcc: 'LTCC', fgpr: 'FGPR', mmgaitformer: 'MMGaitFormer', skeletongait: 'SkeletonGait++', hamobe: 'HAMoBE', ramoe: 'RaMoE', opengait: 'OpenGait', gpgait: 'GPGait', fgpersonx: 'FG-PersonX', openworld: 'Open-World ReID' };
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
    }
  };
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
