/* ch-steps.js — 依 steps.js 的資料，產生第 2 章的方法卡片與各步結論、第 3 章的第一版元件表、總覽的一頁摘要 */
(function (global) {
  'use strict';
  var $ = U.$, R = global.R, S = global.STEPS, TAG = global.TAGS;
  var CH = global.CH = global.CH || {};
  var BY = {}; R.METHODS2.forEach(function (m) { BY[m.n] = m; });
  var NUM = ['①', '②', '③', '④', '⑤', '⑥', '⑦'];

  function info(c) { return c.x || BY[c.m] || { n: c.m, v: '', res: '', cost: '', lic: 'unk', url: '' }; }
  function lic(k) { var L = R.LIC[k] || R.LIC.unk; return '<span class="lic" style="--c:' + L.c + '" title="' + U.esc(L.d) + '"><i></i>' + L.n + '</span>'; }
  function tag(t) { return '<span class="mtag" style="--c:' + TAG[t][1] + '">' + TAG[t][0] + '</span>'; }

  function card(c) {
    var m = info(c), im = c.impl || {};
    var name = m.url ? '<a href="' + m.url + '" target="_blank" rel="noopener">' + U.esc(m.n) + '</a>' : U.esc(m.n);
    var rows = [['程式碼', im.code], ['預訓練權重', im.w], ['輸入格式', im.input], ['環境與相容性', im.env], ['第一步怎麼試', im.first], ['注意', im.note]]
      .filter(function (r) { return r[1] && r[1] !== '—'; });
    return '<article class="mcard t-' + c.tag + '">' +
      '<header><b>' + name + '</b>' + (m.v ? '<span class="mv">' + m.v + '</span>' : '') + tag(c.tag) + '</header>' +
      '<p class="mi">' + c.idea + '</p>' +
      '<dl class="mf">' + (m.res ? '<dt>成績</dt><dd>' + m.res + '</dd>' : '') + (m.cost ? '<dt>算力</dt><dd>' + m.cost + '</dd>' : '') + '<dt>授權</dt><dd>' + lic(m.lic) + '</dd></dl>' +
      '<p class="mfit"><b>對我們：</b>' + c.fit + '</p>' +
      (rows.length ? '<details class="mimpl"><summary>實作資訊</summary><dl>' + rows.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; }).join('') + '</dl></details>' : '') +
      '</article>';
  }

  CH.steps = {
    init: function () {
      S.forEach(function (st) {
        var q = $('.step-q[data-s="' + st.id + '"]');
        if (q) q.innerHTML = '<div class="sq"><span>要解決什麼</span><p>' + st.q + '</p></div><div class="sq"><span>怎麼挑</span><p>' + st.pick + '</p></div>';
        st.groups.forEach(function (g, gi) {
          var box = $('.step-cards[data-s="' + st.id + '"][data-g="' + (g.key || gi) + '"]');
          if (!box) return;
          box.innerHTML = (g.n ? '<h3>' + g.n + '</h3>' : '') + (g.lead ? '<p>' + g.lead + '</p>' : '') +
            '<div class="mgrid">' + g.cards.map(card).join('') + '</div>';
        });
        var ch = $('.step-choice[data-s="' + st.id + '"]');
        if (ch) ch.innerHTML = '<h3>我們的選擇</h3><dl>' +
          '<dt>' + tag('use') + '</dt><dd>' + st.choice.v1 + '</dd>' +
          '<dt>' + tag('try') + '</dt><dd>' + st.choice.later + '</dd>' +
          '<dt>' + tag('skip') + '</dt><dd>' + st.choice.not + '</dd></dl>';
      });
      // 第 3 章：第一版元件表
      var t = $('#v1-table');
      if (t) t.innerHTML = '<thead><tr><th>步驟</th><th>第一版用什麼</th><th>授權</th><th>現況</th><th>算力</th><th>之後再加</th></tr></thead><tbody>' +
        S.map(function (st) {
          return '<tr><td><a href="#/methods?s=' + st.id + '"><b>' + NUM[st.id - 1] + ' ' + st.n + '</b></a></td><td>' + st.table.use + '</td><td>' + st.table.lic + '</td><td>' + st.table.have + '</td><td>' + st.table.cost + '</td><td class="small">' + st.choice.later + '</td></tr>';
        }).join('') + '</tbody>';
      var nl = $('#not-list');
      if (nl) nl.innerHTML = S.map(function (st) { return '<li><b>' + NUM[st.id - 1] + ' ' + st.n + '：</b>' + st.choice.not + '</li>'; }).join('');
      // 總覽：一頁摘要
      var hv = $('#home-v1');
      if (hv) hv.innerHTML = S.map(function (st) {
        return '<a class="hv" href="#/methods?s=' + st.id + '"><span class="num">' + NUM[st.id - 1] + '</span><b>' + st.n + '</b><span>' + st.table.use + '</span></a>';
      }).join('');
      // 標籤說明
      U.$$('.tag-legend').forEach(function (el) { el.innerHTML = Object.keys(TAG).map(tag).join(' ') + '<span class="small muted">　卡片右上角標示我們對這個方法的判定；點方法名可開出處，展開「實作資訊」看程式碼、權重、輸入格式與第一步怎麼試。</span>'; });
    }
  };
})(window);
