/* pipeview.js — 把 PIPE 的資料畫成圖：主圖（D1，三種 mode）、系統步驟尺（D2）、步驟條（D3）與組合條（D4）、迷你地圖與黏頂列（D5）、
   槽位表（D6）、部署架構（D7）、日常時間軸（D8）、決策流程與身分狀態圖（D9、D10，通用 PipeView.flow）、資料表（D11）。
   其他章節模組（ch-steps、ch-others、ch-plan）呼叫 PipeView 的函式；CH.pipeview 只負責「元素存在才畫」的圖與動畫迴圈。
   主圖的各站小圖與導覽膠囊仍在 ch-fusion.js（ArchViz.master）。 */
(function (global) {
  'use strict';
  var PIPE = global.PIPE, CH = global.CH = global.CH || {};
  var el = U.el, $ = U.$, esc = U.esc;
  function fmt(s) { return PIPE.fmt(s); }
  function stepOf(id) { return PIPE.step(id); }
  function stepHref(id) { return id === 'Q' ? '#/approach?a=out-map' : '#/methods?s=' + id; }
  // 系統層步驟 id → 我們的步驟（OURS 的索引）
  var SYS_IDS = PIPE.SYS.map(function (z) { return z.id; });
  function oursOfSys(id) { for (var i = 0; i < PIPE.OURS.length; i++) if ((PIPE.OURS[i].sys || []).indexOf(id) >= 0) return PIPE.OURS[i]; return null; }
  function lic(k) { var L = (global.R.LIC || {})[k] || global.R.LIC.unk; return '<span class="lic" style="--c:' + L.c + '" title="' + esc(L.d) + '"><i></i>' + L.n + '</span>'; }

  /* ======================= D1 主圖 ======================= */
  var masters = [];
  /** root 內建立按鈕列、SVG、詳情區。mode：home／ours／compact；o.tour 為導覽按鈕的 id（可省略） */
  function master(root, o) {
    o = o || {};
    var mode = o.mode || 'home', compact = mode === 'compact';
    U.clear(root);
    var steps = compact ? null : U.h('div', { class: 'seg arch-steps', role: 'group', 'aria-label': '選擇步驟' });
    var wrap = U.h('div', { class: 'tbl-wrap' });
    var svg = el('svg', { viewBox: '0 0 1000 480', role: 'img', 'aria-label': '從攝影機到身分：系統層的 9 步對到我們的 ①–⑦ 與 Q', style: 'min-width:820px' });
    wrap.appendChild(svg);
    var detail = compact ? null : U.h('div', { class: 'detail arch-detail', 'aria-live': 'polite' });
    if (steps) root.appendChild(steps);
    root.appendChild(wrap);
    if (detail) root.appendChild(detail);
    var tourBtn = !compact && o.tour ? document.getElementById(o.tour) : null;
    var inst = global.ArchViz.master({ svg: svg, mode: mode, steps: steps, tourBtn: tourBtn, detail: detail });
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-pv-op]');
      if (b && global.OurPlay) global.OurPlay.play(b.getAttribute('data-pv-op'));
    });
    masters.push({ inst: inst, ch: o.chapter || (root.closest('.chapter') || {}).id });
    return inst;
  }

  /* ======================= D2 系統步驟尺（HTML 格線，寬度不足時在 .tbl-wrap 內捲） ======================= */
  function legend() {
    return '<p class="ss-legend small"><span class="ss-key ss-skip">—</span> 跳過：這個系統沒有這一步　<span class="ss-key ss-merge">合併</span> 一個方塊同時做了幾步　<span class="ss-key ss-extra">額外</span> 這條線上沒有的步驟　<span class="ss-key ss-x">★ 特色</span> 它和別人不同的地方</p>';
  }
  function sysRuler(root) {
    var h = '<div class="sr-grid"><p class="sr-cap" style="grid-column:1/-1">系統層：每個人員追蹤或辨識系統都有的 9 步</p>';
    PIPE.SYS.forEach(function (z, i) {
      h += '<div class="sr-c" style="grid-column:' + (i + 1) + '" title="' + esc(z.d) + '"><b>' + z.n + '</b><span>' + z.d + '</span><em>產出：' + z.out + '</em></div>';
    });
    h += '<p class="sr-cap" style="grid-column:1/-1">對到我們的步驟</p>';
    PIPE.OURS.forEach(function (o) {
      var ix = (o.sys || []).map(function (x) { return SYS_IDS.indexOf(x); }).sort(function (a, b) { return a - b; });
      h += '<a class="sr-o" href="' + stepHref(o.id) + '" style="grid-column:' + (ix[0] + 1) + '/span ' + ix.length + '" title="' + esc(o.n) + '"><span class="num">' + o.sym + '</span> ' + o.short + '</a>';
    });
    h += '</div>';
    root.innerHTML = '<div class="tbl-wrap"><div class="sr-scroll">' + h + '</div></div>' + legend();
  }

  /* ======================= D3 步驟條、D4 組合條 ======================= */
  /** flow 與 sys 等長；回傳 HTML。meta[i] = {cls, pat}：組合條用 */
  function sysstrip(flow, sys, o) {
    o = o || {};
    var NC = SYS_IDS.length, items = flow.map(function (f, i) {
      return { name: f[0], desc: f[1] || '', star: /^x_/.test(f[3] || ''), s: sys[i], m: (o.meta || [])[i] || {} };
    });
    var extraAfter = {}, lastCol = -1;
    items.forEach(function (it) {
      if (it.s === 'extra') { it.extra = true; it.after = lastCol; (extraAfter[lastCol] = extraAfter[lastCol] || []).push(it); return; }
      var arr = Array.isArray(it.s) ? it.s : [it.s];
      var ix = arr.map(function (x) { return SYS_IDS.indexOf(x); }).filter(function (x) { return x >= 0; }).sort(function (a, b) { return a - b; });
      if (!ix.length) { if (global.console) console.error('步驟條：無法對到系統層步驟 ' + it.name + '（' + it.s + '）'); it.runs = []; return; }
      it.merged = arr.length > 1;
      it.runs = []; var run = [ix[0]];
      for (var k = 1; k < ix.length; k++) { if (ix[k] === ix[k - 1] + 1) run.push(ix[k]); else { it.runs.push(run); run = [ix[k]]; } }
      it.runs.push(run);
      lastCol = ix[ix.length - 1];
    });
    var tracks = [], trackOf = [], extraTrack = {};
    if (extraAfter[-1]) { extraTrack[-1] = tracks.length; tracks.push('e'); }
    for (var c = 0; c < NC; c++) {
      trackOf[c] = tracks.length; tracks.push('c');
      if (extraAfter[c]) { extraTrack[c] = tracks.length; tracks.push('e'); }
    }
    var nextRow = tracks.map(function () { return 2; }), cells = [], used = [];
    items.forEach(function (it) {
      if (it.extra) { var t = extraTrack[it.after]; cells.push({ t0: t, t1: t, row: nextRow[t]++, it: it, extra: true }); return; }
      it.runs.forEach(function (run, ri) {
        var t0 = trackOf[run[0]], t1 = trackOf[run[run.length - 1]], row = 2, t;
        for (t = t0; t <= t1; t++) row = Math.max(row, nextRow[t]);
        for (t = t0; t <= t1; t++) nextRow[t] = row + 1;
        cells.push({ t0: t0, t1: t1, row: row, it: it, cont: ri > 0, merge: it.merged });
        run.forEach(function (cc) { used[cc] = true; });
      });
    });
    var rows = Math.max.apply(null, nextRow);
    var h = '';
    for (c = 0; c < NC; c++) h += '<div class="ss-h" style="grid-column:' + (trackOf[c] + 1) + ';grid-row:1">' + PIPE.SYS[c].n + '</div>';
    for (c = 0; c < NC; c++) if (!used[c]) h += '<div class="ss-c ss-skip" style="grid-column:' + (trackOf[c] + 1) + ';grid-row:2/' + rows + '" title="這個系統沒有「' + PIPE.SYS[c].n + '」這一步">—</div>';
    cells.forEach(function (cl) {
      var it = cl.it, cls = 'ss-c' + (cl.extra ? ' ss-extra' : '') + (cl.merge ? ' ss-merge' : '') + (it.star ? ' ss-x' : '') + (it.m.cls ? ' ' + it.m.cls : '');
      var tags = (cl.extra ? '<i class="ss-tag">額外</i>' : '') + (cl.merge ? '<i class="ss-tag">合併</i>' : '') + (it.star ? '<i class="ss-star" title="它和別人不同的地方">★ 特色</i>' : '');
      h += '<div class="' + cls + '" style="grid-column:' + (cl.t0 + 1) + '/' + (cl.t1 + 2) + ';grid-row:' + cl.row + '" tabindex="0" role="button" aria-expanded="false" title="' + esc(it.desc || it.name) + '"' +
        (it.m.pat ? ' data-pat="' + it.m.pat + '"' : '') + '><b>' + it.name + '</b>' + tags + (it.desc && !cl.cont ? '<span class="ss-d">' + it.desc + '</span>' : cl.cont ? '<span class="ss-d">（同上，合併的方塊）</span>' : '') + '</div>';
    });
    var tpl = tracks.map(function (t) { return t === 'e' ? 'minmax(0,.8fr)' : 'minmax(0,1fr)'; }).join(' ');
    return '<div class="tbl-wrap"><div class="sysstrip" style="grid-template-columns:' + tpl + '">' + h + '</div></div>';
  }
  function comboStrip(root, PS) {
    var pats = {}; global.PATTERNS.forEach(function (p) { pats[p.id] = p; });
    var flow = [], sys = [], meta = [];
    PIPE.COMBO.forEach(function (c) {
      var ids = [];
      c.steps.forEach(function (s) { (stepOf(s).sys || []).forEach(function (z) { if (ids.indexOf(z) < 0) ids.push(z); }); });
      var syms = c.steps.map(function (s) { return stepOf(s).sym; }).join('');
      flow.push([(PS[c.pat] || c.pat) + '　' + syms, '']); sys.push(ids.length > 1 ? ids : ids[0]); meta.push({ cls: 'pc-' + c.pat, pat: c.pat });
    });
    var list = PIPE.COMBO.map(function (c) {
      var p = pats[c.pat];
      return '<li><a class="cp pc-' + c.pat + '" href="#pat-' + c.pat + '" data-pat="' + c.pat + '">' + PS[c.pat] + '</a>' + c.steps.map(function (s) { return '<span class="num">' + stepOf(s).sym + '</span>'; }).join('') + ' ' + (p ? fmt(p.ours) : '') + '</li>';
    }).join('');
    root.innerHTML = sysstrip(flow, sys, { meta: meta }) + '<ul class="combo-list">' + list + '</ul>';
  }
  function matrixHTML(systems, PS) {
    function dot(v) { return '<i class="lvd' + (v === 'g' ? ' f' : v === 'm' ? ' h' : '') + '"></i>'; }
    function lv(s, z, ix) { // 每格程度沿用 cover.s（依該欄對到的我們步驟取值）
      if (z.id === 'query') return (s.sys || []).some(function (x) { return x === 'query' || (Array.isArray(x) && x.indexOf('query') >= 0); }) ? 'g' : 'b';
      return s.cover.s[ix];
    }
    function oursIx(z) { for (var i = 0; i < 7; i++) if ((PIPE.OURS[i].sys || []).indexOf(z.id) >= 0) return i; return 0; }
    var th = '<thead><tr><th>系統</th><th>架構</th>' + PIPE.SYS.map(function (z) { return '<th class="cell" title="' + esc(z.d) + '">' + z.n + '</th>'; }).join('') + '<th class="cell">同制服</th><th class="cell">換裝</th></tr></thead>';
    return th + '<tbody>' + systems.map(function (s) {
      return '<tr><td><a href="#/others?o=' + s.id + '" class="ojump" data-o="' + s.id + '"><b>' + s.n + '</b></a></td><td class="small">' + (s.pattern ? PS[s.pattern] : '單一方法研究') + '</td>' +
        PIPE.SYS.map(function (z) { return '<td class="cell">' + dot(lv(s, z, oursIx(z))) + '</td>'; }).join('') + '<td class="cell">' + dot(s.cover.uni) + '</td><td class="cell">' + dot(s.cover.cloth) + '</td></tr>';
    }).join('') + '<tr class="ours"><td><b>本專案（第一版）</b></td><td class="small">多種架構的組合</td>' + PIPE.SYS.map(function () { return '<td class="cell">' + dot('g') + '</td>'; }).join('') + '<td class="cell">' + dot('m') + '</td><td class="cell">' + dot('m') + '</td></tr></tbody>';
  }

  /* ======================= D5 迷你地圖與黏頂列、D6 槽位表 ======================= */
  function stepsRow(cur, cls) {
    return '<ol class="' + cls + '">' + PIPE.OURS.map(function (o) {
      return '<li' + (String(o.id) === String(cur) ? ' class="cur" aria-current="step"' : '') + '><a href="' + stepHref(o.id) + '" title="' + esc(o.n) + '"><span class="num">' + o.sym + '</span><b>' + o.short + '</b><small>' + o.out + '</small></a></li>';
    }).join('') + '</ol>';
  }
  function minimap(n) {
    var slots = PIPE.SLOTS[n] || [];
    return stepsRow(n, 'mm-steps') + '<ol class="mm-slots" aria-label="這一步的固定槽位">' + slots.map(function (s) {
      return '<li><a href="#" data-slot="' + s.id + '" data-s="' + n + '" title="' + esc(s.d || s.n) + '">' + s.n + '</a></li>';
    }).join('') + '</ol>';
  }
  var CIRC = { 1: '①', 2: '②', 3: '③', 4: '④', 5: '⑤', 6: '⑥', 7: '⑦' };
  function cellHTML(slotId, v, o) { // o：{base, diff}
    var txt = v, mark = '';
    if (v && typeof v === 'object') { txt = v.v; mark = v.mark || ''; }
    if (txt === undefined || txt === null || txt === '') txt = '—';
    var cls = o.base ? 'slot-base' : o.diff ? 'slot-diff' : 'slot-same', inner;
    if (mark === 'skip') { inner = '<span class="sk">—</span>'; return '<td class="' + cls + ' slot-skip" data-slot="' + slotId + '"' + (txt !== '—' ? ' title="' + esc(txt) + '"' : ' title="這個方法沒有這一格"') + '>' + (o.diff ? '<i class="st">★</i>' : '') + inner + '</td>'; }
    else if (mark === 'merge') inner = '<span class="mg">⇢ 合併：</span>' + esc(txt);
    else inner = esc(txt);
    return '<td class="' + cls + (mark ? ' slot-' + mark : '') + '" data-slot="' + slotId + '">' + (o.diff ? '<i class="st">★</i>' : '') + inner + '</td>';
  }
  /** 主要卡：steps.js 的群組裡有 how 的卡 */
  function mainCards(g) { return g.cards.filter(function (c) { return c.how; }); }
  function baseOf(key) { return PIPE.base(key); }
  function cardKey(c) { return c.m || (c.x && c.x.n); }
  function cardInfo(c) { return CH.steps && CH.steps.info ? CH.steps.info(c) : (c.x || { n: c.m, lic: 'unk' }); }
  function slotRowsFor(step, g, gi, key) {
    var slots = PIPE.SLOTS[step.id], b = baseOf(key), rows = [], cards = mainCards(g), hasExtra = false;
    if (!b) return null;
    var sid = step.id;
    function ref(c) { return 'mc-' + sid + '-' + gi + '-' + g.cards.indexOf(c); }
    if (b.card) {
      var bc = cards.filter(function (c) { return cardKey(c) === b.card; })[0];
      var bd = b.data;
      if (!bd || !bc) return null;
      rows.push({ name: cardKey(bc), ref: ref(bc), data: bd, base: true, c: bc });
      cards.forEach(function (c) { var d = PIPE.slotsOf(c); if (c !== bc && d) rows.push({ name: cardKey(c), ref: ref(c), data: d, c: c }); });
    } else {
      var sl = {}; Object.keys(b.ours).forEach(function (k) { sl[k] = b.ours[k][0]; });
      var from = {}; Object.keys(b.ours).forEach(function (k) { from[k] = b.ours[k][1]; });
      rows.push({ name: '我們的基準組合', ref: '', data: { slots: sl, diff: [] }, base: true, from: from, combo: true });
      cards.forEach(function (c) { var d = PIPE.slotsOf(c); if (d) rows.push({ name: cardKey(c), ref: ref(c), data: d, c: c, part: !!(d.part && d.part.length) }); });
    }
    rows.forEach(function (r) { if (r.data.slots.extra) hasExtra = true; });
    return { slots: slots, rows: rows, hasExtra: hasExtra, nonBase: rows.length - 1 };
  }
  function rowHTML(r, slots, hasExtra, grpLabel) {
    var d = r.data, h = '<tr' + (r.base ? ' class="slot-first"' : '') + '><th scope="row" class="slot-name">';
    if (r.ref) h += '<a href="#" data-card="' + r.ref + '">' + esc(r.name) + '</a>'; else h += '<b>' + esc(r.name) + '</b>';
    if (r.base) h += '<span class="mtag" style="--c:#4f5c30">基準</span>';
    if (r.part) h += '<span class="mtag" style="--c:#0c8a0c">組成</span>';
    h += '</th>';
    slots.forEach(function (s) {
      var diff = !r.base && (d.diff || []).indexOf(s.id) >= 0;
      var cell = cellHTML(s.id, d.slots[s.id], { base: r.base, diff: diff });
      if (r.from && r.from[s.id] && d.slots[s.id] !== undefined) cell = cell.replace('</td>', '<small class="from">來自 ' + esc(r.from[s.id]) + '</small></td>');
      h += cell;
    });
    if (hasExtra) {
      var ex = d.slots.extra;
      h += ex ? '<td class="slot-diff slot-extra" data-slot="extra"><i class="st">★</i><b class="ex">額外：' + esc(ex.n || '') + '</b>' + esc(ex.v) + '</td>' : '<td class="slot-same"></td>';
    }
    h += '<td>' + (r.c ? lic(cardInfo(r.c).lic) : '') + '</td></tr>';
    return h;
  }
  function slotHead(slots, hasExtra, first) {
    return '<thead><tr><th>' + (first || '方法') + '</th>' + slots.map(function (s) { return '<th data-slot="' + s.id + '" title="' + esc(s.d || s.n) + '">' + s.n + '</th>'; }).join('') + (hasExtra ? '<th data-slot="extra">額外</th>' : '') + '<th>授權</th></tr></thead>';
  }
  var CAP = '<caption>★ ＝ 與第一列不同的地方；— ＝ 這個方法沒有這一格；⇢ ＝ 合併到別的格</caption>';
  /** 每組（步驟）的槽位表；沒有可比的列（只有基準一列）就不畫 */
  function slotTable(step, g, gi, force) {
    var key = step.id === 3 ? '3:' + g.key : String(step.id), t = slotRowsFor(step, g, gi, key);
    if (!t || (t.nonBase < 1 && !force)) return '';
    var solo = t.nonBase < 1; // 這一組只有一個主要方法：沒有可比的列，只顯示基準（供並排比較按鈕有位置可放）
    return '<table class="tbl slot-tbl' + (solo ? ' slot-solo' : '') + '" data-s="' + step.id + '" data-g="' + (g.key || gi) + '">' + (solo ? '<caption>這一組只有一個主要方法，沒有可比的列；其他方法見下方小卡</caption>' : CAP) + slotHead(t.slots, t.hasExtra) +
      '<tbody>' + t.rows.map(function (r) { return rowHTML(r, t.slots, t.hasExtra); }).join('') + '</tbody></table>';
  }
  /** ③ 總表：七組共用同一組槽位，依組分段（每組自己的基準列） */
  function slotOverview(step) {
    var slots = PIPE.SLOTS[step.id], body = '', hasExtra = false, tabs = [];
    step.groups.forEach(function (g, gi) {
      var t = slotRowsFor(step, g, gi, '3:' + g.key);
      if (!t) return;
      tabs.push({ g: g, t: t });
      if (t.hasExtra) hasExtra = true;
    });
    tabs.forEach(function (x) {
      var n = slots.length + 2 + (hasExtra ? 1 : 0);
      body += '<tr class="slot-grp"><th colspan="' + n + '"><a href="#" data-grp="' + x.g.key + '">' + CIRC[step.id] + ' ' + x.g.n + '</a></th></tr>';
      x.t.rows.forEach(function (r) { body += rowHTML(r, slots, hasExtra); });
    });
    return CAP + slotHead(slots, hasExtra, '方法（依組）') + '<tbody>' + body + '</tbody>';
  }

  /* ======================= 通用流程圖（D7、D9、D10） ======================= */
  var TONE = {
    base: { f: '#fff', s: 'var(--ink-3)' }, good: { f: '#e3efe0', s: 'var(--good)' }, warn: { f: '#f6ecd0', s: 'var(--warn)' },
    mute: { f: '#eef0eb', s: 'var(--ink-3)', dash: '4 3' }, bad: { f: '#f6dcdc', s: 'var(--bad)', dash: '4 3' }, test: { f: '#fbf8ea', s: 'var(--warn)' },
    db: { f: '#e6ebd6', s: 'var(--olive)' }, ext: { f: 'var(--paper)', s: 'var(--ink-3)', dash: '4 3' }, ink: { f: 'var(--ink)', s: 'var(--ink)', c: '#fff' }
  };
  function toneOf(n) {
    var t = n.t || '';
    if (n.kind === 'cue') return { f: 'color-mix(in srgb, ' + n.color + ' 18%, #fff)', s: n.color };
    if (n.kind === 'flag') return TONE.bad;
    if (/待確認/.test(t)) return TONE.warn;
    if (/^(已)?確認/.test(t) || n.kind === 'use') return TONE.good;
    if (/未知|未歸群/.test(t) || n.kind === 'skip') return TONE.mute;
    if (n.kind === 'test') return TONE.test;
    if (n.kind === 'db') return TONE.db;
    if (n.kind === 'out') return TONE.good;
    if (n.kind === 'ext') return TONE.ext;
    if (n.kind === 'start') return TONE.ink;
    return TONE.base;
  }
  /** cfg 引用 {cfg:[步,'項目']} → steps.js 的設定列 [項目, 設定, 理由] */
  function cfgRow(ref) {
    if (!ref || !ref.cfg) return null;
    var st = (global.STEPS || [])[ref.cfg[0] - 1], r = st && st.choice.cfg.filter(function (x) { return x[0] === ref.cfg[1]; })[0];
    if (!r && global.console) console.error('找不到設定：' + ref.cfg.join(':'));
    return r || null;
  }
  function wrapText(t, per) {
    var out = [], s = String(t);
    while (s.length > per) { out.push(s.slice(0, per)); s = s.slice(per); }
    out.push(s);
    return out;
  }
  /** spec = {nodes:[{id,kind,t,col,row,cfg,note,d,step,steps,parts}], edges:[{from,to,label,kind}]}；opts = {nw, nh, gx, gy, minw} */
  function flow(root, spec, opts) {
    opts = opts || {};
    var NW = opts.nw || 140, NH = opts.nh || 42, GX = opts.gx || 46, GY = opts.gy || 22, PAD = 14, per = Math.floor((NW - 14) / 12.5);
    var nodes = {}, cols = 0, rowsN = 0;
    spec.nodes.forEach(function (n) {
      nodes[n.id] = n; cols = Math.max(cols, n.col + 1); rowsN = Math.max(rowsN, n.row + 1);
      n.lines = wrapText(n.t, per);
      n.h = Math.max(NH, 16 + n.lines.length * 16 + (n.parts ? n.parts.length * 19 + 4 : 0));
    });
    var rowH = [], rowY = [], y = PAD, r;
    for (r = 0; r < rowsN; r++) { rowH[r] = NH; spec.nodes.forEach(function (n) { if (n.row === r) rowH[r] = Math.max(rowH[r], n.h); }); }
    for (r = 0; r < rowsN; r++) { rowY[r] = y; y += rowH[r] + GY; }
    var W = PAD * 2 + cols * NW + (cols - 1) * GX + (opts.padR || 0), H = y - GY + PAD;
    spec.nodes.forEach(function (n) { n.x = PAD + n.col * (NW + GX); n.y = rowY[n.row] + (rowH[n.row] - n.h) / 2; n.w = NW; n.cx = n.x + NW / 2; n.cy = n.y + n.h / 2; });
    U.clear(root);
    var wrap = U.h('div', { class: 'tbl-wrap flowchart' }), svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': opts.label || spec.title || '流程圖', style: 'min-width:' + Math.min(W, opts.minw || 600) + 'px;max-width:' + Math.round(W * 1.12) + 'px' });
    wrap.appendChild(svg); root.appendChild(wrap);
    var info = U.h('div', { class: 'flow-info detail', 'aria-live': 'polite' }, '<span class="muted">點任一個方塊看說明</span>');
    root.appendChild(info);
    // 箭頭（先畫，方塊蓋在上面）
    function head(x, y, dir) { // 箭頭尖端在 (x, y)，dir：r、l、u、d
      var d = { r: 'l-6 -4m6 4l-6 4', l: 'l6 -4m-6 4l6 4', d: 'l-4 -6m4 6l4 -6', u: 'l-4 6m4 -6l4 6' }[dir];
      return 'M' + x + ' ' + y + d;
    }
    (spec.edges || []).forEach(function (e) {
      var a = nodes[e.from], b = nodes[e.to];
      if (!a || !b) { if (global.console) console.error('流程圖：找不到節點 ' + e.from + '→' + e.to); return; }
      var col = e.kind === 'feedback' ? 'var(--olive)' : e.kind === 'dash' ? 'var(--bad)' : 'var(--ink-3)', dash = (e.kind === 'feedback' || e.kind === 'dash') ? '5 4' : null;
      var d, hd, lx, ly, anchor = 'middle', dx = b.col - a.col, dy = b.row - a.row;
      if (dx > 0) {
        var x1 = a.x + NW, y1 = a.cy, x2 = b.x, y2 = b.cy, xm = (x1 + x2) / 2;
        d = dy === 0 ? 'M' + x1 + ' ' + y1 + 'H' + (x2 - 1) : 'M' + x1 + ' ' + y1 + 'C' + xm + ' ' + y1 + ' ' + xm + ' ' + y2 + ' ' + (x2 - 1) + ' ' + y2;
        hd = head(x2, y2, 'r');
        lx = xm; ly = (y1 + y2) / 2 - 5;
        if (dy === 0 && e.label && e.label.length * 11 > GX - 6) { lx = xm; ly = Math.min(a.y, b.y) - 5; }
        if (e.label === '是' || e.label === '否') { lx = x1 + 7; ly = y1 + (e.label === '是' ? -6 : 14); anchor = 'start'; } // 是在線上方、否在線下方，貼著起點
        else if (dy !== 0) { lx = x1 + 7; ly = y1 + (dy > 0 ? 14 : -6); anchor = 'start'; }
      } else if (dx === 0) {
        if (Math.abs(dy) === 1) {
          var sy = dy > 0 ? a.y + a.h : a.y, ty = dy > 0 ? b.y : b.y + b.h;
          d = 'M' + a.cx + ' ' + sy + 'V' + (ty + (dy > 0 ? -1 : 1)); hd = head(a.cx, ty, dy > 0 ? 'd' : 'u');
          lx = a.cx + 6; ly = (sy + ty) / 2 + 4; anchor = 'start';
        } else {
          var rx = a.x + NW, bulge = 26, ya = a.cy, yb = b.cy;
          d = 'M' + rx + ' ' + ya + 'C' + (rx + bulge) + ' ' + ya + ' ' + (rx + bulge) + ' ' + yb + ' ' + (rx + 1) + ' ' + yb; hd = head(rx, yb, 'l');
          lx = rx + bulge + 4; ly = (ya + yb) / 2; anchor = 'start';
        }
      } else { // 往回的箭頭（回饋）：先下／上，再往左
        var sy2 = dy >= 0 ? a.y + a.h : a.y;
        d = 'M' + a.cx + ' ' + sy2 + 'V' + b.cy + 'H' + (b.x + NW + 1); hd = head(b.x + NW, b.cy, 'l');
        lx = (a.cx + b.x + NW) / 2; ly = b.cy - 6;
      }
      el('path', { d: d, fill: 'none', stroke: col, 'stroke-width': 1.6, 'stroke-dasharray': dash }, svg);
      el('path', { d: hd, fill: 'none', stroke: col, 'stroke-width': 1.6 }, svg);
      if (e.label) el('text', { x: lx, y: ly, 'text-anchor': anchor, 'font-size': 11, 'font-weight': 700, fill: col === 'var(--ink-3)' ? 'var(--ink-2)' : col, 'paint-order': 'stroke', stroke: 'var(--sheet)', 'stroke-width': 4, text: e.label }, svg);
    });
    spec.nodes.forEach(function (n) {
      var tn = toneOf(n), g = el('g', { tabindex: 0, role: 'button', 'aria-label': n.t, style: 'cursor:pointer' }, svg);
      el('rect', { x: n.x, y: n.y, width: NW, height: n.h, rx: n.kind === 'test' ? 18 : 7, fill: tn.f, stroke: tn.s, 'stroke-width': 1.5, 'stroke-dasharray': tn.dash || null }, g);
      n.lines.forEach(function (ln, i) { el('text', { x: n.cx, y: n.y + 20 + i * 16, 'text-anchor': 'middle', 'font-size': 12.5, 'font-weight': 700, fill: tn.c || 'var(--ink)', text: ln }, g); });
      if (n.parts) n.parts.forEach(function (p, i) {
        var py = n.y + 12 + n.lines.length * 16 + i * 19;
        el('rect', { x: n.x + 8, y: py, width: NW - 16, height: 16, rx: 3, fill: '#fff', stroke: 'var(--rule)' }, g);
        el('text', { x: n.cx, y: py + 12, 'text-anchor': 'middle', 'font-size': 10.5, fill: 'var(--ink-2)', text: p.t }, g);
      });
      function body() {
        var rc = cfgRow(n.cfg), h = '<b>' + esc(n.t) + '</b>';
        if (n.d) h += '<p style="margin:2px 0 0">' + fmt(n.d) + '</p>';
        if (n.note) h += '<p style="margin:2px 0 0">' + fmt(n.note) + '</p>';
        if (rc) h += '<p style="margin:2px 0 0"><b>' + esc(rc[0]) + '：</b>' + fmt(rc[1]) + (rc[2] ? '<br><span class="muted">' + fmt(rc[2]) + '</span>' : '') + '</p>';
        var st = n.steps || (n.step ? [n.step] : []);
        if (st.length) h += '<p style="margin:4px 0 0" class="small">對應：' + st.map(function (s) { return fmt('{{step:' + s + '|short}}'); }).join('、') + '</p>';
        return h;
      }
      U.tip(g, function () { var rc = cfgRow(n.cfg); return rc ? '<b>' + esc(rc[0]) + '</b><br>' + fmt(rc[1]) : esc(n.d || n.note || n.t); });
      function pick() { info.innerHTML = body(); }
      g.addEventListener('click', pick);
      g.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(); } });
    });
    return { svg: svg, info: info };
  }

  /* ======================= D7 部署、D8 日常時間軸、D10 身分狀態圖、D11 資料表 ======================= */
  function deploy(root) {
    var D = PIPE.DEPLOY;
    D.nodes.forEach(function (n) { if (!n.kind) n.kind = 'proc'; });
    flow(root, D, { nw: 122, nh: 44, gx: 56, gy: 26, label: '部署架構：攝影機、錄影主機、營區伺服器、資料庫與查詢介面', minw: 760 });
  }
  function idStates(root) {
    var S = PIPE.ID_STATES;
    flow(root, S, { nw: 150, nh: 44, gx: 60, gy: 22, padR: 120, label: '身分狀態圖：從片段到已確認、待確認、未知', minw: 640 });
  }
  function decision(root, key) {
    var D = PIPE.DECISIONS[key];
    flow(root, D, { nw: key === 'identify' ? 160 : 150, nh: key === 'gate' ? 34 : 44, gx: 70, gy: key === 'gate' ? 10 : 24, padR: 0, label: D.title, minw: 600 });
  }
  function daily(root) {
    var A = PIPE.DAILY, W = 960, X0 = 20, hw = (W - 2 * X0) / 24, H = 330;
    function hx(h) { return X0 + h * hw; }
    U.clear(root);
    var wrap = U.h('div', { class: 'tbl-wrap flowchart' }), svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': '一天 24 小時的日常運作與每週回饋（時間為示意）', style: 'min-width:700px' });
    wrap.appendChild(svg); root.appendChild(wrap);
    var info = U.h('div', { class: 'flow-info detail' }, '<span class="muted">滑過或點任一個色塊看說明；時間都是示意，不是實測</span>');
    root.appendChild(info);
    function t(x, y, s, o) { return el('text', Object.assign({ x: x, y: y, 'font-size': 12, fill: 'var(--ink)', text: s }, o || {}), svg); }
    t(X0, 16, '一天（24 小時）　時間為示意', { 'font-weight': 700 });
    for (var h = 0; h <= 24; h += 3) {
      el('line', { x1: hx(h), x2: hx(h), y1: 30, y2: 40, stroke: 'var(--ink-3)' }, svg);
      t(hx(h), 54, (h % 24 < 10 ? '0' : '') + (h % 24) + ':00', { 'text-anchor': 'middle', 'font-size': 10.5, fill: 'var(--ink-3)', class: 'num' });
    }
    el('line', { x1: X0, x2: W - X0, y1: 40, y2: 40, stroke: 'var(--ink-3)' }, svg);
    var BAND = { day: ['#f3e9bd', '#b97e00', 66], night: ['#d9e0ef', '#2a78d6', 66], morning: ['#e3efe0', '#0c8a0c', 134] };
    function show(a) {
      var rc = a.cfg ? cfgRow(a) : null;
      info.innerHTML = '<b>' + esc(a.t) + '</b>' + (a.mark ? '　<span class="ev inferred"><i></i>' + a.mark + '</span>' : '') + '<p style="margin:2px 0 0">' + fmt(a.d) + '</p>' +
        (rc ? '<p style="margin:2px 0 0"><b>' + esc(rc[0]) + '：</b>' + fmt(rc[1]) + '</p>' : '') +
        (a.steps ? '<p class="small" style="margin:4px 0 0">對應：' + a.steps.map(function (s) { return fmt('{{step:' + s + '|short}}'); }).join('、') + '</p>' : '');
    }
    A.filter(function (a) { return a.band !== 'week'; }).forEach(function (a) {
      var b = BAND[a.band], spans = a.from < a.to ? [[a.from, a.to]] : [[a.from, 24], [0, a.to]];
      var g = el('g', { tabindex: 0, role: 'button', 'aria-label': a.t, style: 'cursor:pointer' }, svg);
      spans.forEach(function (s, i) {
        el('rect', { x: hx(s[0]), y: b[2], width: (s[1] - s[0]) * hw, height: 34, rx: 4, fill: b[0], stroke: b[1] }, g);
        if ((s[1] - s[0]) * hw > 90 || a.band === 'morning') t(hx(s[0]) + (s[1] - s[0]) * hw / 2, b[2] + (a.band === 'morning' ? -7 : 22), a.t + (i === 0 && spans.length > 1 ? '（接隔天）' : ''), { 'text-anchor': 'middle', 'font-size': a.band === 'morning' ? 11.5 : 12.5, 'font-weight': 700, fill: 'var(--ink)' });
      });
      g.addEventListener('click', function () { show(a); }); g.addEventListener('mouseenter', function () { show(a); });
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(a); } });
    });
    t(X0, 200, '每週（回饋）　人工覆核的結果回到系統', { 'font-weight': 700 });
    var wk = A.filter(function (a) { return a.band === 'week'; }), ww = (W - 2 * X0 - (wk.length - 1) * 16) / wk.length;
    var rv = A.filter(function (a) { return a.id === 'review'; })[0], BUS = 216, WY = 226;
    var c0 = X0 + ww / 2, c1 = X0 + (wk.length - 1) * (ww + 16) + ww / 2, rx = rv ? hx((rv.from + rv.to) / 2) : c0;
    if (rv) el('path', { d: 'M' + rx + ' 168V' + BUS + 'M' + Math.min(c0, rx) + ' ' + BUS + 'H' + Math.max(c1, rx), fill: 'none', stroke: 'var(--olive)', 'stroke-dasharray': '4 3', 'stroke-width': 1.5 }, svg);
    wk.forEach(function (a, i) {
      var x = X0 + i * (ww + 16), g = el('g', { tabindex: 0, role: 'button', 'aria-label': a.t, style: 'cursor:pointer' }, svg);
      el('path', { d: 'M' + (x + ww / 2) + ' ' + BUS + 'V' + (WY - 1) + 'm-4 -6l4 6l4 -6', fill: 'none', stroke: 'var(--olive)', 'stroke-width': 1.5 }, g);
      el('rect', { x: x, y: WY, width: ww, height: 60, rx: 7, fill: '#e6ebd6', stroke: 'var(--olive)' }, g);
      wrapText(a.t, Math.floor((ww - 16) / 13)).forEach(function (ln, k) { t(x + ww / 2, WY + 26 + k * 16, ln, { 'text-anchor': 'middle', 'font-weight': 700, 'font-size': 12.5 }); });
      g.addEventListener('click', function () { show(a); }); g.addEventListener('mouseenter', function () { show(a); });
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(a); } });
    });
    t(W - X0, 320, '下一週的模型與門檻更新後，再跑每天的夜間批次', { 'text-anchor': 'end', 'font-size': 11.5, fill: 'var(--ink-3)' });
  }
  function dataStore(root) {
    var gov = (global.OTHER_GOV || []).filter(function (r) { return r[0] === PIPE.STORE_NOTE.gov; })[0];
    root.innerHTML = '<thead><tr><th>資料</th><th>哪一步產生</th><th>存在哪</th><th>保存期限</th><th>誰可看</th></tr></thead><tbody>' + PIPE.STORE.map(function (r) {
      return '<tr><td><b>' + r.data + '</b></td><td>' + fmt('{{step:' + r.step + '|short}}') + '</td><td>' + r.where + '</td><td>' + r.keep + '</td><td>' + r.who + '</td></tr>';
    }).join('') + '</tbody>';
    var note = document.getElementById('data-store-note');
    if (note && gov) note.innerHTML = '別人怎麼做（' + gov[0] + '）：' + gov[1] + '。我們可以怎麼做：' + gov[2] + '。';
  }

  global.PipeView = { master: master, sysRuler: sysRuler, sysstrip: sysstrip, comboStrip: comboStrip, matrixHTML: matrixHTML, minimap: minimap, stepsRow: stepsRow,
    slotTable: slotTable, slotOverview: slotOverview, flow: flow, deploy: deploy, daily: daily, decision: decision, idStates: idStates, dataStore: dataStore, legend: legend };

  /* ======================= CH.pipeview：元素存在才畫；動畫迴圈；黏頂列 ======================= */
  var loop = { raf: 0, t: 0, last: 0 }, drawn = false, stickyOn = false;
  function stickyUpdate() {
    var bar = document.getElementById('mm-sticky'), s1 = document.getElementById('step-1'), s7 = document.getElementById('step-7');
    if (!bar || !s1 || !s7) return;
    var top = 56, show = s1.getBoundingClientRect().top < top && s7.getBoundingClientRect().bottom > top + 10, cur = 1;
    if (show) {
      for (var i = 1; i <= 7; i++) { var e = document.getElementById('step-' + i); if (e && e.getBoundingClientRect().top <= 120) cur = i; }
      U.$$('li', bar).forEach(function (li, k) { var on = k === cur - 1; li.classList.toggle('cur', on); if (on) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });
    }
    bar.classList.toggle('on', show);
  }
  var tick = 0;
  function onScroll() { if (tick) return; tick = requestAnimationFrame(function () { tick = 0; stickyUpdate(); }); }
  function flash(cells) {
    cells.forEach(function (c) { c.classList.add('col-hl'); });
    setTimeout(function () { cells.forEach(function (c) { c.classList.remove('col-hl'); }); }, 1800);
  }
  function wireClicks() {
    document.addEventListener('click', function (e) {
      var t = e.target;
      var cell = t.closest && t.closest('.sysstrip .ss-c');
      if (cell && !cell.classList.contains('ss-skip')) {
        if (e.target.closest('a')) return;
        var pat = cell.getAttribute('data-pat');
        if (pat) { var pe = document.getElementById('pat-' + pat); if (pe) pe.scrollIntoView({ behavior: U.reduceMotion ? 'auto' : 'smooth', block: 'start' }); return; }
        var open = cell.classList.toggle('open'); cell.setAttribute('aria-expanded', open ? 'true' : 'false');
        return;
      }
      var cp = t.closest && t.closest('.combo-list a[data-pat]');
      if (cp) { e.preventDefault(); var pe2 = document.getElementById('pat-' + cp.getAttribute('data-pat')); if (pe2) pe2.scrollIntoView({ behavior: U.reduceMotion ? 'auto' : 'smooth', block: 'start' }); return; }
      var ca = t.closest && t.closest('a[data-card]');
      if (ca) { e.preventDefault(); var ce = document.getElementById(ca.getAttribute('data-card')); if (ce) { ce.scrollIntoView({ behavior: U.reduceMotion ? 'auto' : 'smooth', block: 'start' }); ce.classList.add('mc-hl'); setTimeout(function () { ce.classList.remove('mc-hl'); }, 1800); } return; }
      var ga = t.closest && t.closest('a[data-grp]');
      if (ga) { e.preventDefault(); var ge = document.querySelector('.step-cards[data-s="3"][data-g="' + ga.getAttribute('data-grp') + '"]'); if (ge) ge.scrollIntoView({ behavior: U.reduceMotion ? 'auto' : 'smooth', block: 'start' }); return; }
      var sa = t.closest && t.closest('.mm-slots a[data-slot]');
      if (sa) { // 點槽位：捲到本節槽位表並讓該欄閃一下
        e.preventDefault();
        var sec = sa.closest('section.step'), tb = sec && sec.querySelector('.slot-tbl'), id = sa.getAttribute('data-slot');
        if (!tb) tb = document.getElementById('slot-overview');
        if (tb) { tb.scrollIntoView({ behavior: U.reduceMotion ? 'auto' : 'smooth', block: 'start' }); flash(U.$$('[data-slot="' + id + '"]', tb)); }
      }
    });
  }
  CH.pipeview = {
    init: function () {
      var P = {}; global.PATTERNS.forEach(function (p) { P[p.id] = p.s || p.n.replace(/（.*）/, ''); });
      if (document.getElementById('master-home')) master(document.getElementById('master-home'), { mode: 'home', tour: 'master-home-tour', chapter: 'ch-home' });
      if (document.getElementById('master-methods')) master(document.getElementById('master-methods'), { mode: 'compact', chapter: 'ch-methods' });
      if (document.getElementById('master-approach')) master(document.getElementById('master-approach'), { mode: 'ours', tour: 'master-approach-tour', chapter: 'ch-approach' });
      if (document.getElementById('deploy-arch')) deploy(document.getElementById('deploy-arch'));
      if (document.getElementById('daily-timeline')) daily(document.getElementById('daily-timeline'));
      ['gate', 'shape', 'identify'].forEach(function (k) { var e = document.getElementById({ gate: 'dec-gate', shape: 'dec-shape', identify: 'dec-identify' }[k]); if (e) decision(e, k); });
      if (document.getElementById('data-store')) dataStore(document.getElementById('data-store'));
      var bar = document.getElementById('mm-sticky');
      if (bar) bar.innerHTML = stepsRow(0, 'mm-steps');
      wireClicks();
    },
    enter: function () {
      var act = document.querySelector('.chapter.active');
      if (act && act.id === 'ch-methods') { window.addEventListener('scroll', onScroll, { passive: true }); stickyUpdate(); }
      if (U.reduceMotion || loop.raf) return;
      loop.last = performance.now();
      function step(now) {
        loop.raf = 0;
        var cur = document.querySelector('.chapter.active'), any = false;
        var dt = Math.min(0.05, (now - loop.last) / 1000); loop.last = now; loop.t += dt;
        masters.forEach(function (m) { if (cur && cur.id === m.ch) { any = true; m.inst.tick(dt, loop.t); } });
        if (any) loop.raf = requestAnimationFrame(step);
      }
      loop.raf = requestAnimationFrame(step);
    },
    leave: function () {
      cancelAnimationFrame(loop.raf); loop.raf = 0;
      window.removeEventListener('scroll', onScroll);
      var bar = document.getElementById('mm-sticky'); if (bar) bar.classList.remove('on');
    }
  };
})(window);
