/* ch-others.js — 依 others.js 產生「別人怎麼做」：一條線看所有系統、架構類型、依架構分組的系統卡片、對照表、可借用的做法 */
(function (global) {
  'use strict';
  var $ = U.$, P = global.PATTERNS, O = global.OTHERS, CATS = global.OTHER_CATS;
  var CH = global.CH = global.CH || {};
  // 步驟名稱一律讀 PIPE.OURS（0 = 我們的七步沒有這一步）
  var PIPE = global.PIPE;
  var NUM = { get: function (i) { return i ? PIPE.step(i).sym : '額外'; } };
  var STEPN = { get: function (i) { return i ? PIPE.step(i).n : '我們的七步沒有這一步'; } };
  var SHORT = { get: function (i) { return PIPE.step(i).short; } };
  var EV = { proven: '<span class="ev proven"><i></i>文獻證實</span>', inferred: '<span class="ev inferred"><i></i>廠商或專利描述</span>' };
  // 架構一律用名稱（不編號）；短名 p.s 由資料提供，沒有時拿全名去掉括號
  var PN = {}, PS = {}; P.forEach(function (p) { PN[p.id] = p.n; PS[p.id] = p.s || p.n.replace(/（.*）/, ''); });
  var STATE = { adopt: '採用', test: '實驗驗證', later: '之後再說' };
  function rows(head, data, fn) { return '<thead><tr>' + head.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' + data.map(fn).join('') + '</tbody>'; }

  /** 步驟條（D3）：每格放在系統層 9 欄的位置上；跳過、合併、額外、★ 特色用標記表示；點格子展開說明 */
  function strip(o) { return global.PipeView.sysstrip(o.flow, o.sys); }
  function play(k, id) { return global.PipeView.btn('anim', 'data-fp="' + k + ':' + id + '"'); }
  // 動畫第一幕：系統（或架構）在 9 欄系統層上的位置（sys_line）；其餘幕沿用原 flow
  function withLine(o) { return [['在這條資料流上的位置', '灰＝跳過、跨欄＝合併、橘＝額外、★＝特色', 0, 'sys_line', { pre: true, flow: o.flow, sys: o.sys }]].concat(o.flow); }
  function dot(v) { return '<i class="lvd' + (v === 'g' ? ' f' : v === 'm' ? ' h' : '') + '"></i>'; }

  function card(s) {
    var cat = (CATS[s.cat] || '').split('：')[0]; // 領域只當標籤
    return '<article class="osys" id="oth-' + s.id + '">' +
      '<header><b>' + s.n + '</b>' + (cat ? '<span class="otag">領域：' + cat + '</span>' : '') + EV[s.ev] + play('sys', s.id) + '</header>' +
      '<p class="small muted" style="margin:0">' + s.who + '</p>' +
      '<p class="ogoal"><b>要解決：</b>' + s.goal + '</p>' +
      '<h4>它在這條資料流上的位置（灰＝跳過、跨欄＝合併、橘＝額外、★＝特色；點格子看說明）</h4>' + strip(s) +
      '<p class="okey"><b>核心概念：</b>' + s.key + '</p>' +
      '<div class="obg"><div><h4>我們可以借用</h4><ul>' + s.borrow.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div>' +
      '<div><h4>不適合我們之處</h4><ul>' + s.gap.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div></div>' +
      '<p class="osrc">出處：' + s.src.map(function (x) { return '<a href="' + x[1] + '" target="_blank" rel="noopener">' + x[0] + '</a>'; }).join('、') + '</p>' +
      '</article>';
  }

  CH.others = {
    init: function () {
      var pb = $('#patterns');
      if (!pb) return;
      // 架構類型
      pb.innerHTML = P.map(function (p) {
        return '<article class="pat" id="pat-' + p.id + '"><header><b>' + p.n + '</b>' + play('pat', p.id) + '</header>' +
          '<p class="small muted" style="margin:0 0 6px">代表：' + p.who + '</p>' + strip(p) +
          '<dl class="pat-dl"><dt>優點</dt><dd>' + p.good + '</dd><dt>弱點</dt><dd>' + p.bad + '</dd><dt>在我們系統</dt><dd><b>' + p.ours + '</b></dd></dl></article>';
      }).join('');
      // 對照表
      $('#oth-matrix').innerHTML = global.PipeView.matrixHTML(O, PS);
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
      // 「第 4 章」狀態欄：資料（第 5、6 格）還沒補齊時整欄省略
      var hasState = L.every(function (r) { return r[4] && STATE[r[4]]; });
      var head = ['步驟', '別人的做法', '來自', '我們怎麼做'];
      if (hasState) head.push(PIPE.text('{{ch:approach|num}}'));
      $('#oth-lessons').innerHTML = rows(head, L, function (r) {
        var st = hasState ? '<td class="small"><span class="lstate ' + r[4] + '">' + STATE[r[4]] + '</span>' + (r[5] ? '<br>' + PIPE.fmt(r[5]) : '') + '</td>' : '';
        return '<tr><td class="cell"><a href="#/methods?s=' + r[0] + '" class="num" title="' + STEPN.get(r[0]) + '">' + NUM.get(r[0]) + '</a></td><td><b>' + r[1] + '</b></td><td class="small">' + r[2] + '</td><td>' + r[3] + '</td>' + st + '</tr>';
      });
      // 動畫說明
      var sec = $('#ch-others');
      sec.addEventListener('click', function (e) {
        var b = e.target.closest('.fp-btn');
        if (!b || !global.FlowPlay) return;
        var k = b.getAttribute('data-fp').split(':');
        if (k[0] === 'pat') {
          var i = P.map(function (p) { return p.id; }).indexOf(k[1]), p = P[i];
          FlowPlay.open({ title: p.n, sub: '代表：' + p.who, flow: withLine(p), keyLabel: '在我們的系統', key: p.ours + '。優點：' + p.good + '；弱點：' + p.bad + '。' });
        } else {
          var s = O.filter(function (x) { return x.id === k[1]; })[0];
          FlowPlay.open({ title: s.n, sub: '要解決：' + s.goal, flow: withLine(s), keyLabel: '核心概念', key: s.key });
        }
      });
      // 一條線：系統步驟尺（D2）與我們的組合（D4）
      var ruler = $('#sys-ruler');
      if (ruler) global.PipeView.sysRuler(ruler);
      var combo = $('#combo-strip');
      if (combo) global.PipeView.comboStrip(combo, PS);
      // 各系統卡片：依架構分組（最後一組是不屬於任何架構的單項研究與支撐技術）
      var groups = P.map(function (p) { return { id: p.id, title: p.n, lead: p.lead, list: O.filter(function (s) { return s.pattern === p.id; }) }; });
      groups.push({ id: 'none', title: '不是完整系統：單項研究與支撐技術', lead: global.OTHER_NONE_LEAD || '', list: O.filter(function (s) { return !s.pattern; }) });
      $('#oth-groups').innerHTML = groups.filter(function (g) { return g.list.length; }).map(function (g) {
        return '<h3 id="oth-grp-' + g.id + '">' + g.title + '</h3>' + (g.lead ? '<p>' + g.lead + '</p>' : '') +
          '<div class="osys-list" id="oth-g-' + g.id + '">' + g.list.map(card).join('') + '</div>';
      }).join('');
    },
    enter: function () {
      var m = (location.hash.split('?')[1] || '').match(/o=([a-z]+)/);
      if (m) setTimeout(function () { var t = document.getElementById('oth-' + m[1]); if (t) t.scrollIntoView({ block: 'start' }); }, 80);
    }
  };
})(window);
