/* app.js — 以網址 # 切換章節（file:// 可用）。
   每章由一個或多個模組組成，第一次進入時才初始化；另負責自動圖號、章內目錄與名詞解釋。 */
(function () {
  'use strict';
  var ORDER = ['home', 'problem', 'methods', 'others', 'approach', 'plan', 'appendix', 'refs'];
  var MODS = {
    home: ['home', 'intro', 'steps'], problem: ['problem', 'primer'], methods: ['fusion', 'cues', 'methods', 'openset', 'steps'],
    others: ['others'], approach: ['system', 'steps', 'server'], plan: ['roadmap', 'validation', 'camera'], appendix: ['datasets', 'methods', 'roadmap', 'qc', 'camera'], refs: ['refs']
  };
  // 舊網址（舊版 13 章）導到新章節
  var ALIAS = { cues: 'methods', fusion: 'methods', openset: 'methods', system: 'approach', camera: 'plan', deploy: 'plan', validation: 'plan', datasets: 'appendix', qc: 'appendix', roadmap: 'plan' };
  var inited = {}, current = null;

  function each(id, fn) { (MODS[id] || []).forEach(function (k) { var m = window.CH[k]; if (m) fn(m, k); }); }
  function show(id) {
    id = ALIAS[id] || id;
    if (ORDER.indexOf(id) < 0) id = 'home';
    if (current) each(current, function (m) { if (m.leave) m.leave(); });
    ORDER.forEach(function (k) { document.getElementById('ch-' + k).classList.toggle('active', k === id); });
    U.$$('#toc a').forEach(function (a) {
      if (a.getAttribute('href') === '#/' + id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    each(id, function (m, k) {
      if (inited[k]) return;
      inited[k] = true;
      try { m.init(); } catch (e) { console.error('模組初始化失敗：' + k, e); }
    });
    each(id, function (m) { if (m.enter) m.enter(); });
    current = id;
    var sec = document.getElementById('ch-' + id);
    document.title = sec.getAttribute('data-title') + '｜同制服跨攝影機辨識';
    pager(id);
    window.scrollTo(0, 0);
    var cur = document.querySelector('#toc a[aria-current]');
    if (cur && cur.scrollIntoView && window.innerWidth <= 820) cur.scrollIntoView({ block: 'nearest', inline: 'center' });
  }
  function pager(id) {
    var i = ORDER.indexOf(id), p = document.getElementById('pager'), h = '';
    function title(k) { return document.getElementById('ch-' + k).getAttribute('data-title'); }
    if (i > 0) h += '<a href="#/' + ORDER[i - 1] + '"><span>上一章</span>' + title(ORDER[i - 1]) + '</a>';
    if (i < ORDER.length - 1) h += '<a class="next" href="#/' + ORDER[i + 1] + '"><span>下一章</span>' + title(ORDER[i + 1]) + '</a>';
    p.innerHTML = h;
  }

  /* ---------- 圖號：每章依出現順序自動編號（總覽頁不編） ---------- */
  function numberFigures() {
    ORDER.forEach(function (k, ci) {
      var n = 0;
      U.$$('#ch-' + k + ' .plate-title .fig').forEach(function (f) {
        if (f.textContent.trim() && f.textContent.indexOf('圖') < 0) return; // 例如「範本」
        if (ci === 0) { f.textContent = ''; return; }
        f.textContent = '圖 ' + (k === 'appendix' ? 'A' : ci) + '.' + (++n);
      });
    });
  }

  /* ---------- 章內目錄 ---------- */
  function chapterTOC() {
    ORDER.forEach(function (k) {
      var sec = document.getElementById('ch-' + k), head = sec.querySelector('.ch-head');
      var hs = U.$$('h2', sec).filter(function (h) { return !h.closest('.deep'); });
      if (!head || hs.length < 3) return;
      var nav = U.h('nav', { class: 'ch-toc', 'aria-label': '本章內容' });
      nav.appendChild(U.h('span', { class: 'ch-toc-l' }, '本章內容'));
      hs.forEach(function (h, i) {
        var t = h.textContent, circ = /^[①-⑦]/.test(t);
        // 已有步驟編號（①–⑦）的標題就沿用它，不再加字母
        var lab = circ ? t.charAt(0) : String.fromCharCode(65 + i), rest = circ ? t.slice(1).trim() : t;
        var btn = U.h('button', { type: 'button' }, '<span class="num">' + lab + '</span>' + rest);
        btn.addEventListener('click', function () { h.scrollIntoView({ behavior: U.reduceMotion ? 'auto' : 'smooth', block: 'start' }); });
        nav.appendChild(btn);
        if (!circ) h.insertAdjacentHTML('afterbegin', '<span class="h2-mark num">' + lab + '</span>');
      });
      head.parentNode.insertBefore(nav, head.nextSibling);
    });
  }

  /* ---------- 名詞解釋：每章第一次出現加上虛線底線與提示 ---------- */
  function glossify() {
    var G = window.GLOSS || [];
    var SKIP = { SCRIPT: 1, BUTTON: 1, A: 1, H1: 1, H2: 1, H3: 1, LABEL: 1, OUTPUT: 1, SUMMARY: 1, B: 0 };
    ORDER.forEach(function (k) {
      if (k === 'home' || k === 'refs') return;
      var sec = document.getElementById('ch-' + k), seen = {};
      var blocks = U.$$('p, li, .plate-note', sec).filter(function (b) { return !b.closest('svg, .ch-toc, .tbl, button'); });
      blocks.forEach(function (b) {
        var walker = document.createTreeWalker(b, NodeFilter.SHOW_TEXT, null), nodes = [], n;
        while ((n = walker.nextNode())) {
          var p = n.parentNode, bad = false;
          while (p && p !== b) { if (SKIP[p.tagName] || (p.classList && p.classList.contains('gl'))) { bad = true; break; } p = p.parentNode; }
          if (!bad) nodes.push(n);
        }
        nodes.forEach(function (node) {
          G.forEach(function (g, gi) {
            if (seen[gi] || !node.parentNode) return;
            for (var j = 0; j < g.m.length; j++) {
              var pos = node.nodeValue.indexOf(g.m[j]);
              if (pos < 0) continue;
              // 英文詞避免吃到更長單字的一部分
              if (/^[A-Za-z]/.test(g.m[j]) && /[A-Za-z]/.test(node.nodeValue.charAt(pos + g.m[j].length) || '')) continue;
              var after = node.splitText(pos), rest = after.splitText(g.m[j].length);
              var span = U.h('span', { class: 'gl', tabindex: '0' });
              span.textContent = after.nodeValue;
              after.parentNode.replaceChild(span, after);
              U.tip(span, '<b>' + g.t + '</b><br>' + g.d);
              seen[gi] = true;
              node = rest;
              break;
            }
          });
        });
      });
    });
  }

  function route() {
    var parts = (location.hash.replace(/^#\/?/, '') || 'home').split('?'), id = parts[0];
    if (ALIAS[id]) { location.replace('#/' + ALIAS[id]); return; }
    if (id !== current) show(id);
    if (id === current && /o=/.test(parts[1] || '') && window.CH.others) window.CH.others.enter();
    var m = (parts[1] || '').match(/s=(\d)/);
    if (m) {
      var t = document.getElementById('step-' + m[1]);
      // 剛切換章節時版面還在排，先跳一次、稍後再對齊一次
      if (t) { setTimeout(function () { t.scrollIntoView({ block: 'start' }); }, 30); setTimeout(function () { t.scrollIntoView({ block: 'start' }); }, 400); }
    }
  }
  numberFigures(); chapterTOC(); glossify();
  window.addEventListener('hashchange', route);
  route();
})();
