/* app.js — 以網址 # 切換章節（file:// 可用），章節第一次進入時才初始化 */
(function () {
  'use strict';
  var ORDER = ['home', 'problem', 'cues', 'methods', 'fusion', 'camera', 'openset', 'datasets', 'system', 'validation', 'qc', 'roadmap', 'refs'];
  var inited = {}, current = null;

  function show(id) {
    if (ORDER.indexOf(id) < 0) id = 'home';
    if (current && window.CH[current] && window.CH[current].leave) window.CH[current].leave();
    ORDER.forEach(function (k) {
      var sec = document.getElementById('ch-' + k);
      sec.classList.toggle('active', k === id);
    });
    U.$$('#toc a').forEach(function (a) {
      if (a.getAttribute('href') === '#/' + id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    var mod = window.CH[id];
    if (mod && !inited[id]) {
      try { mod.init(); } catch (e) { console.error('章節初始化失敗：' + id, e); }
      inited[id] = true;
    }
    if (mod && mod.enter) mod.enter();
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
  function route() { show((location.hash.replace(/^#\/?/, '') || 'home').split('?')[0]); }
  window.addEventListener('hashchange', route);
  route();
})();
