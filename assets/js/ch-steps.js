/* ch-steps.js — 依 steps.js 的資料，產生方法總覽每一節的「我們選」徽章、路線地圖、方法卡片與我們的選擇，以及我們的做法的第一版元件表 */
(function (global) {
  'use strict';
  var $ = U.$, R = global.R, S = global.STEPS, TAG = global.TAGS, PIPE = global.PIPE;
  var CH = global.CH = global.CH || {};
  var BY = {}; R.METHODS2.forEach(function (m) { BY[m.n] = m; });
  // 符號與步驟名稱讀 PIPE.OURS（全站唯一寫法）
  function sym(id) { return PIPE.step(id).sym; }
  function nm(id) { return PIPE.step(id).n; }
  var DIMS = [['ang', '路邊俯角'], ['cloth', '換裝'], ['grp', '5 人交錯'], ['cpu', 'CPU 算力'], ['lic', '軍用授權']];
  var LV = { g: ['✓', '有利'], m: ['△', '有條件'], b: ['✗', '不利'], n: ['—', '不適用'] };

  function info(c) { return c.x || BY[c.m] || { n: c.m, v: '', res: '', cost: '', lic: 'unk', url: '' }; }
  function lic(k) { var L = R.LIC[k] || R.LIC.unk; return '<span class="lic" style="--c:' + L.c + '" title="' + U.esc(L.d) + '"><i></i>' + L.n + '</span>'; }
  function tag(t) { return '<span class="mtag" style="--c:' + TAG[t][1] + '">' + TAG[t][0] + '</span>'; }
  function name(m) { return m.url ? '<a href="' + m.url + '" target="_blank" rel="noopener">' + U.esc(m.n) + '</a>' : U.esc(m.n); }
  function impl(im) {
    var rows = [['程式碼', im.code], ['預訓練權重', im.w], ['輸入格式', im.input], ['環境與相容性', im.env], ['第一步怎麼試', im.first], ['注意', im.note]]
      .filter(function (r) { return r[1] && r[1] !== '—'; });
    return rows.length ? '<details class="mimpl"><summary>實作資訊</summary><dl>' + rows.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; }).join('') + '</dl></details>' : '';
  }

  /** 主要方法：怎麼運作 ＋ 在我們的條件下 */
  function pbtn(id) { return '<button type="button" class="fp-btn" data-mp="' + id + '" title="用動畫說明這個方法怎麼運作"><i></i>動畫</button>'; }
  function wide(c, id) {
    var m = info(c), h = c.how || {}, us = c.us || {};
    var flow = [['輸入', h.in], ['處理', h.proc], ['訓練', h.train], ['輸出', h.out]].filter(function (r) { return r[1]; });
    return '<article class="mcard wide t-' + c.tag + '">' +
      '<header><b>' + name(m) + '</b>' + (m.v ? '<span class="mv">' + m.v + '</span>' : '') + tag(c.tag) + (id ? pbtn(id) : '') + '</header>' +
      '<p class="mi">' + c.idea + '</p>' +
      '<div class="mw">' +
        '<div>' + (h.key ? '<p class="mkey"><b>關鍵差異：</b>' + h.key + '</p>' : '') +
          '<details class="mhow"' + (c.tag === 'use' || c.tag === 'base' ? ' open' : '') + '><summary>怎麼運作：輸入 → 處理 → 訓練 → 輸出</summary><ol class="flow">' + flow.map(function (r) { return '<li><span>' + r[0] + '</span>' + r[1] + '</li>'; }).join('') + '</ol></details></div>' +
        '<div><h4>在我們的條件下</h4><table class="us">' + DIMS.map(function (d) {
            var v = us[d[0]] || ['n', '—'];
            return '<tr class="u-' + v[0] + '"><th>' + d[1] + '</th><td class="ul" title="' + LV[v[0]][1] + '">' + LV[v[0]][0] + '</td><td>' + v[1] + '</td></tr>';
          }).join('') + '</table>' +
          '<dl class="mf">' + (m.res ? '<dt>成績</dt><dd>' + m.res + '</dd>' : '') + (m.cost ? '<dt>算力</dt><dd>' + m.cost + '</dd>' : '') + '<dt>授權</dt><dd>' + lic(m.lic) + '</dd></dl></div>' +
      '</div>' + impl(c.impl || {}) + '</article>';
  }
  /** 次要方法：一句話 */
  function small(c, id) {
    var m = info(c);
    return '<article class="mcard t-' + c.tag + '"><header><b>' + name(m) + '</b>' + (m.v ? '<span class="mv">' + m.v + '</span>' : '') + tag(c.tag) + (id ? pbtn(id) : '') + '</header>' +
      '<p class="mi">' + c.idea + '</p>' + (m.res ? '<p class="small muted" style="margin:0 0 4px">' + m.res + '</p>' : '') + '<p class="mfit"><b>判定理由：</b>' + c.fit + '</p></article>';
  }

  /** 「我們選」徽章：choice.v1 的第一個子句（以「；」「（」「。」「→」切），超過 29 字截斷加「…」 */
  function pickText(st) {
    var t = PIPE.text(st.choice.v1).split(/[；（。→]/)[0].replace(/[，、\s]+$/, '');
    return t.length > 30 ? t.slice(0, 29) + '…' : t;
  }
  /** 我們的選擇 v1：含「；」拆成條列、含「→」拆成流程鏈（只改渲染，不改資料） */
  function v1html(v) {
    if (v.indexOf('；') >= 0) return '<ul class="cv1-list">' + v.split('；').map(function (x) { return '<li>' + x.replace(/。$/, '') + '</li>'; }).join('') + '</ul>';
    if (v.indexOf('→') >= 0) return '<ol class="chain">' + v.split('→').map(function (x) { return '<li>' + x.trim().replace(/。$/, '') + '</li>'; }).join('') + '</ol>';
    return '<p class="cv1">' + v + '</p>';
  }
  function cfgRow(r, key) { return '<tr' + (key ? ' class="cfg-key"' : '') + '><td><b>' + r[0] + '</b></td><td>' + (key ? '<b>' + r[1] + '</b>' : r[1]) + '</td><td class="small">' + r[2] + '</td></tr>'; }
  var CFGHEAD = '<thead><tr><th>項目</th><th>設定</th><th>理由</th></tr></thead>';
  /** 起始設定：PIPE.OURS[n].key 列出的關鍵列加粗置頂，其餘收進「其餘設定」 */
  function cfgHtml(st) {
    var keys = (PIPE.step(st.id) || {}).key || [], c = st.choice.cfg;
    var top = keys.map(function (k) { return c.filter(function (r) { return r[0] === k; })[0]; }).filter(Boolean);
    var rest = c.filter(function (r) { return top.indexOf(r) < 0; });
    if (!top.length) return '<table class="tbl cfg">' + CFGHEAD + '<tbody>' + c.map(function (r) { return cfgRow(r); }).join('') + '</tbody></table>';
    return '<table class="tbl cfg">' + CFGHEAD + '<tbody>' + top.map(function (r) { return cfgRow(r, 1); }).join('') + '</tbody></table>' +
      (rest.length ? '<details class="more cfg-rest"><summary>其餘設定（' + rest.length + ' 項）</summary><div class="more-body"><table class="tbl cfg">' + CFGHEAD + '<tbody>' + rest.map(function (r) { return cfgRow(r); }).join('') + '</tbody></table></div></details>' : '');
  }

  CH.steps = { info: info,
    init: function () {
      S.forEach(function (st) {
        var pk = $('.step-pick[data-s="' + st.id + '"]');
        if (pk) pk.innerHTML = '<span class="sp-l">我們選：</span><a class="sp-v" href="#/methods?a=choice-' + st.id + '">' + pickText(st) + '</a>';
        var q = $('.step-q[data-s="' + st.id + '"]');
        if (q) {
          q.innerHTML = '<div class="sq-row"><div class="sq"><span>要解決什麼</span><p>' + st.q + '</p></div><div class="sq"><span>怎麼挑</span><p>' + st.pick + '</p></div></div>' +
            (st.routes ? '<div class="routes"><h4>路線地圖：這一步有哪幾種做法</h4><table class="tbl rt"><thead><tr><th>路線</th><th>做法</th><th>優點</th><th>缺點</th><th></th></tr></thead><tbody>' +
              st.routes.map(function (r) { return '<tr' + (r.pick ? ' class="pk"' : '') + '><td><b>' + r.n + '</b></td><td>' + r.how + '</td><td>' + r.pro + '</td><td>' + r.con + '</td><td>' + (r.pick ? '<span class="mtag" style="--c:#0c8a0c">採用</span>' : '') + '</td></tr>'; }).join('') +
              '</tbody></table></div>' : '');
        }
        st.groups.forEach(function (g, gi) {
          var box = $('.step-cards[data-s="' + st.id + '"][data-g="' + (g.key || gi) + '"]');
          if (!box) return;
          var main = g.cards.filter(function (c) { return c.how; }), rest = g.cards.filter(function (c) { return !c.how; });
          var restTags = []; rest.forEach(function (c) { if (restTags.indexOf(c.tag) < 0) restTags.push(c.tag); });
          var restLabel = restTags.map(function (t) { return TAG[t][0]; }).join('／');
          box.innerHTML = (g.n ? '<h3>' + sym(st.id) + ' ' + g.n + '</h3>' : '') + (g.lead ? '<p>' + g.lead + '</p>' : '') +
            main.map(function (c) { return wide(c, st.id + '-' + gi + '-' + g.cards.indexOf(c)); }).join('') +
            (rest.length ? '<details class="more rest-more"><summary>' + (main.length ? '其他 ' + rest.length + ' 個方法' : rest.length + ' 個方法') + '（' + restLabel + '）</summary><div class="more-body"><div class="mgrid">' + rest.map(function (c) { return small(c, st.id + '-' + gi + '-' + g.cards.indexOf(c)); }).join('') + '</div></div></details>' : '');
        });
        var ch = $('.step-choice[data-s="' + st.id + '"]');
        if (ch) {
          var c = st.choice;
          ch.innerHTML = '<h3>我們的選擇</h3><div class="cv1-row">' + tag('use') + '</div>' + v1html(c.v1) +
            (c.cfg ? '<h4>起始設定（建議值，用自建資料調整）</h4>' + cfgHtml(st) : '') +
            (c.pass ? '<h4>怎樣算通過</h4><ul class="pass">' + c.pass.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' : '') +
            '<dl><dt>' + tag('try') + '</dt><dd>' + c.later + '</dd><dt>' + tag('skip') + '</dt><dd>' + c.not + '</dd></dl>';
        }
      });
      // 第 4 章：第一版元件表
      var t = $('#v1-table');
      if (t) t.innerHTML = '<thead><tr><th>步驟</th><th>第一版用什麼</th><th>授權</th><th>現況</th><th>算力</th><th>之後再加</th></tr></thead><tbody>' +
        S.map(function (st) {
          return '<tr><td><a href="#/methods?s=' + st.id + '"><b>' + sym(st.id) + ' ' + nm(st.id) + '</b></a></td><td>' + st.table.use + '</td><td>' + st.table.lic + '</td><td>' + st.table.have + '</td><td>' + st.table.cost + '</td><td class="small">' + st.choice.later + '</td></tr>';
        }).join('') + '</tbody>';
      var nl = $('#not-list');
      if (nl) nl.innerHTML = S.map(function (st) { return '<li><b>' + sym(st.id) + ' ' + nm(st.id) + '：</b>' + st.choice.not + '</li>'; }).join('');
      // 總覽：一頁摘要
      var hv = $('#home-v1');
      if (hv) hv.innerHTML = S.map(function (st) {
        return '<a class="hv" href="#/methods?s=' + st.id + '"><span class="num">' + sym(st.id) + '</span><b>' + nm(st.id) + '</b><span>' + st.table.use + '</span></a>';
      }).join('');
      // 標籤說明與按鈕圖例（圖例只寫一份資料：PIPE.BUTTONS）
      U.$$('.tag-legend').forEach(function (el) {
        el.innerHTML = '<div>' + Object.keys(TAG).map(tag).join(' ') + '</div>' +
          '<p class="small muted" style="margin:6px 0 0">方法卡上的 ✓ 有利　△ 有條件　✗ 不利，是在我們條件下的判斷。點方法名可開出處；展開「實作資訊」看程式碼、權重、輸入格式與第一步怎麼試。</p>';
      });
      U.$$('.btn-legend').forEach(function (el) {
        el.innerHTML = '<ul>' + PIPE.BUTTONS.map(function (b) { return '<li><span class="bl-b">' + b.label + '</span><span class="small muted">' + b.d + '</span></li>'; }).join('') + '</ul>';
      });
    }
  };
})(window);
