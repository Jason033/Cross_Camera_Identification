/* ch-others.js — 依 others.js 產生第 3 章「別人怎麼做」：架構類型、對照表、各系統的流程卡片 */
(function (global) {
  'use strict';
  var $ = U.$, P = global.PATTERNS, O = global.OTHERS, CATS = global.OTHER_CATS;
  var CH = global.CH = global.CH || {};
  var NUM = ['額外', '①', '②', '③', '④', '⑤', '⑥', '⑦'];
  var STEPN = ['我們的七步沒有這一步', '攝影機與偵測', '追蹤成片段', '身分線索特徵', '融合', '時空約束', '分群', '比對名冊'];
  var EV = { proven: '<span class="ev proven"><i></i>文獻證實</span>', inferred: '<span class="ev inferred"><i></i>廠商或專利描述</span>' };
  var ROM = ['一', '二', '三', '四', '五', '六'];
  var SHORT = ['', '偵測', '追蹤', '特徵', '融合', '時空', '分群', '名冊'];
  var PN = {}, PR = {}; P.forEach(function (p, i) { PN[p.id] = p.n; PR[p.id] = ROM[i]; });
  function rows(head, data, fn) { return '<thead><tr>' + head.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' + data.map(fn).join('') + '</tbody>'; }

  function flow(list) {
    return '<ol class="pflow">' + list.map(function (f) {
      return '<li class="ps' + f[2] + '"><span class="sb" title="對應我們的：' + STEPN[f[2]] + '">' + NUM[f[2]] + '</span><b>' + f[0] + '</b>' + (f[1] ? '<span>' + f[1] + '</span>' : '') + '</li>';
    }).join('') + '</ol>';
  }
  function dot(v) { return '<i class="lvd' + (v === 'g' ? ' f' : v === 'm' ? ' h' : '') + '"></i>'; }

  CH.others = {
    init: function () {
      var pb = $('#patterns');
      if (!pb) return;
      // 架構類型
      pb.innerHTML = P.map(function (p, i) {
        return '<article class="pat"><header><span class="pat-n num">' + ROM[i] + '</span><b>' + p.n + '</b></header>' +
          '<p class="small muted" style="margin:0 0 6px">代表：' + p.who + '</p>' + flow(p.flow) +
          '<dl class="pat-dl"><dt>優點</dt><dd>' + p.good + '</dd><dt>弱點</dt><dd>' + p.bad + '</dd><dt>在我們系統</dt><dd><b>' + p.ours + '</b></dd></dl></article>';
      }).join('');
      // 對照表
      var th = '<thead><tr><th>系統</th><th>類型</th>' + [1, 2, 3, 4, 5, 6, 7].map(function (i) { return '<th class="cell" title="' + STEPN[i] + '">' + NUM[i] + '<small>' + SHORT[i] + '</small></th>'; }).join('') + '<th class="cell">同制服</th><th class="cell">換裝</th></tr></thead>';
      $('#oth-matrix').innerHTML = th + '<tbody>' + O.map(function (s) {
        return '<tr><td><a href="#/others?o=' + s.id + '" class="ojump" data-o="' + s.id + '"><b>' + s.n + '</b></a></td><td class="small">' + (s.pattern ? '架構' + PR[s.pattern] + '：' + PN[s.pattern].replace(/（.*）/, '') : '單一方法研究') + '</td>' +
          s.cover.s.map(function (v) { return '<td class="cell">' + dot(v) + '</td>'; }).join('') + '<td class="cell">' + dot(s.cover.uni) + '</td><td class="cell">' + dot(s.cover.cloth) + '</td></tr>';
      }).join('') + '<tr class="ours"><td><b>本專案（第一版）</b></td><td class="small">一＋三＋四＋五＋六</td>' + [1, 2, 3, 4, 5, 6, 7].map(function () { return '<td class="cell">' + dot('g') + '</td>'; }).join('') + '<td class="cell">' + dot('m') + '</td><td class="cell">' + dot('m') + '</td></tr></tbody>';
      U.$$('.ojump').forEach(function (a) {
        a.addEventListener('click', function (e) { e.preventDefault(); var t = document.getElementById('oth-' + a.getAttribute('data-o')); if (t) t.scrollIntoView({ behavior: U.reduceMotion ? 'auto' : 'smooth', block: 'start' }); });
      });
      // 面向總覽、評估、治理、啟示
      $('#oth-facets').innerHTML = rows(['面向', '要回答的問題', '代表', '結論'], global.FACETS, function (f) {
        return '<tr><td><b>' + f[0] + '</b></td><td>' + f[1] + '</td><td class="small">' + f[2] + '</td><td>' + f[3] + '</td></tr>';
      });
      $('#oth-metrics').innerHTML = rows(['指標', '衡量什麼', '誰在用', '我們用在哪'], global.OTHER_METRICS, function (r) {
        return '<tr><td><b>' + r[0] + '</b></td><td>' + r[1] + '</td><td class="small">' + r[2] + '</td><td>' + r[3] + '</td></tr>';
      });
      $('#oth-gov').innerHTML = rows(['做法', '別人怎麼做', '我們可以怎麼做'], global.OTHER_GOV, function (r) {
        return '<tr><td><b>' + r[0] + '</b></td><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>';
      });
      var L = global.OTHER_LESSONS.slice().sort(function (a, b) { return a[0] - b[0]; });
      $('#oth-lessons').innerHTML = rows(['步驟', '別人的做法', '來自', '我們怎麼做'], L, function (r) {
        return '<tr><td class="cell"><a href="#/methods?s=' + r[0] + '" class="num" title="' + STEPN[r[0]] + '">' + NUM[r[0]] + '</a></td><td><b>' + r[1] + '</b></td><td class="small">' + r[2] + '</td><td>' + r[3] + '</td></tr>';
      });
      // 各系統卡片
      Object.keys(CATS).forEach(function (c) {
        var box = $('#oth-' + c);
        if (!box) return;
        box.innerHTML = O.filter(function (s) { return s.cat === c; }).map(function (s) {
          return '<article class="osys" id="oth-' + s.id + '">' +
            '<header><b>' + s.n + '</b>' + (s.pattern ? '<span class="otag">架構' + PR[s.pattern] + '：' + PN[s.pattern] + '</span>' : '<span class="otag">單一方法研究</span>') + EV[s.ev] + '</header>' +
            '<p class="small muted" style="margin:0">' + s.who + '</p>' +
            '<p class="ogoal"><b>要解決：</b>' + s.goal + '</p>' +
            '<h4>流程（圓圈數字＝對應我們的第幾步；「額外」＝我們的七步沒有）</h4>' + flow(s.flow) +
            '<p class="okey"><b>核心概念：</b>' + s.key + '</p>' +
            '<div class="obg"><div><h4>我們可以借用</h4><ul>' + s.borrow.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div>' +
            '<div><h4>不適合我們之處</h4><ul>' + s.gap.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div></div>' +
            '<p class="osrc">出處：' + s.src.map(function (x) { return '<a href="' + x[1] + '" target="_blank" rel="noopener">' + x[0] + '</a>'; }).join('、') + '</p>' +
            '</article>';
        }).join('');
      });
    },
    enter: function () {
      var m = (location.hash.split('?')[1] || '').match(/o=([a-z]+)/);
      if (m) setTimeout(function () { var t = document.getElementById('oth-' + m[1]); if (t) t.scrollIntoView({ block: 'start' }); }, 80);
    }
  };
})(window);
