/* util.js — 小型工具：SVG 產生、提示框、亂數、統計 */
(function (global) {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /** 建立 SVG 元素：el('rect', {x:1}, parent) */
  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) {
      if (k === 'text') n.textContent = attrs[k];
      else if (attrs[k] !== undefined && attrs[k] !== null) n.setAttribute(k, attrs[k]);
    }
    if (parent) parent.appendChild(n);
    return n;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); return n; }
  function h(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (html !== undefined) n.innerHTML = html;
    return n;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ---------- 提示框 ----------
  var tipEl;
  function tip(target, htmlFn) {
    tipEl = tipEl || document.getElementById('tip');
    function show(e) {
      tipEl.innerHTML = typeof htmlFn === 'function' ? htmlFn() : htmlFn;
      tipEl.classList.add('on'); move(e);
    }
    function move(e) {
      var x = e.clientX, y = e.clientY;
      if (e.touches && e.touches[0]) { x = e.touches[0].clientX; y = e.touches[0].clientY; }
      if (x === undefined) { var r = target.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top; }
      var w = tipEl.offsetWidth, hh = tipEl.offsetHeight;
      var left = Math.min(window.innerWidth - w - 8, Math.max(8, x + 14));
      var top = y - hh - 12; if (top < 8) top = y + 18;
      tipEl.style.left = left + 'px'; tipEl.style.top = top + 'px';
    }
    function hide() { tipEl.classList.remove('on'); }
    target.addEventListener('mouseenter', show);
    target.addEventListener('mousemove', move);
    target.addEventListener('mouseleave', hide);
    target.addEventListener('focus', show);
    target.addEventListener('blur', hide);
  }

  // ---------- 分段按鈕群組 ----------
  function segGroup(root, attr, onChange) {
    var btns = $$('button', root);
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        onChange(b.getAttribute(attr));
      });
    });
    var cur = btns.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })[0] || btns[0];
    return cur.getAttribute(attr);
  }

  // ---------- 固定種子亂數 ----------
  function rng(seed) {
    var s = seed >>> 0;
    return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function gauss(r) { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  // ---------- 統計 ----------
  function npdf(x, m, s) { var z = (x - m) / s; return Math.exp(-0.5 * z * z) / (s * Math.sqrt(2 * Math.PI)); }
  function erf(x) { var t = 1 / (1 + 0.3275911 * Math.abs(x)); var y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; }
  function ncdf(x, m, s) { return 0.5 * (1 + erf((x - m) / (s * Math.SQRT2))); }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function pct(x) { return (x * 100).toFixed(1) + '%'; }

  var reduceMotion = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  global.U = { $: $, $$: $$, el: el, clear: clear, h: h, esc: esc, tip: tip, segGroup: segGroup, rng: rng, gauss: gauss, npdf: npdf, ncdf: ncdf, clamp: clamp, lerp: lerp, pct: pct, reduceMotion: reduceMotion, NS: NS };
})(window);
