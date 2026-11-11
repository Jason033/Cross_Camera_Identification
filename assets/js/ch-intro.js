/* ch-intro.js — 總覽頁的系統全景與名詞表、第 1 章的「ReID 怎麼評分」入門圖 */
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
    init: function () { U.segGroup($('#primer-sel'), 'data-p', function (v) { drawPrimer(v); }); drawPrimer('good'); }
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
})(window);
