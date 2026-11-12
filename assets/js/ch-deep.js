/* ch-deep.js — 第 2–4 章的「技術深入」區段（第二輪研究） */
(function (global) {
  'use strict';
  var el = U.el, $ = U.$, R = global.R, G = global.Geom;
  var CH = global.CH;

  // ---------- 共用：水平長條圖 ----------
  var TAGC = { pick: '#4f5c30', have: '#2a78d6', bad: '#c93434', ghost: '#d5dad0' };
  /** rows: [label, value, tag?, extra?]  o: {x, y, w, labelW, max, rowH, fmt, title, unit} */
  function hbar(svg, rows, o) {
    var x0 = (o.x || 0) + o.labelW, y = o.y || 0, rh = o.rowH || 26, w = o.w, max = o.max || 100;
    if (o.title) { el('text', { x: o.x || 0, y: y + 14, 'font-size': 13.5, 'font-weight': 700, fill: 'var(--ink)', text: o.title }, svg); y += 26; }
    var ticks = o.ticks || [0, max / 2, max];
    ticks.forEach(function (t) {
      el('line', { x1: x0 + t / max * w, x2: x0 + t / max * w, y1: y - 4, y2: y + rows.length * rh, stroke: 'var(--rule-2)' }, svg);
      el('text', { x: x0 + t / max * w, y: y + rows.length * rh + 14, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--ink-3)', class: 'num', text: t + (o.unit || '') }, svg);
    });
    rows.forEach(function (r, i) {
      var yy = y + i * rh, v = r[1], tag = r[2];
      el('text', { x: x0 - 8, y: yy + rh / 2 + 4, 'text-anchor': 'end', 'font-size': 12.5, fill: 'var(--ink)', 'font-weight': tag === 'pick' || tag === 'have' ? 700 : 400, text: r[0] }, svg);
      var bw = Math.max(1.5, Math.min(v, max) / max * w);
      el('rect', { x: x0, y: yy + 4, width: bw, height: rh - 9, rx: 3, fill: TAGC[tag] || '#8d968e' }, svg);
      el('text', { x: x0 + bw + 6, y: yy + rh / 2 + 4, 'font-size': 12.5, fill: 'var(--ink)', class: 'num', text: (o.fmt ? o.fmt(v) : (v >= 100 ? v : v.toFixed(1))) + (r[3] ? '  ' + r[3] : '') }, svg);
    });
    return y + rows.length * rh + 20;
  }
  global.hbar = hbar;

  function wrapInit(id, fn) {
    var orig = CH[id].init;
    CH[id].init = function () { orig.apply(this, arguments); try { fn(); } catch (e) { console.error('深入區段失敗：' + id, e); } };
  }
  function evBadge(lv) {
    return { proven: '<span class="ev proven"><i></i>文獻證實</span>', inferred: '<span class="ev inferred"><i></i>合理推論</span>', open: '<span class="ev open"><i></i>待驗證</span>' }[lv] || '';
  }
  function linkList(urls) {
    return urls.map(function (u) { var m = u.match(/(\d{4}\.\d{4,5})/), h = m ? 'arXiv ' + m[1] : u.replace(/^https?:\/\//, '').split('/')[0]; if (/thecvf/.test(u)) { var f = u.split('/').pop().replace(/_paper\.pdf|\.pdf|\.html/, '').split('_'); h = 'CVF：' + f.slice(0, 2).join(' '); } return '<a href="' + u + '" target="_blank" rel="noopener">' + h + '</a>'; }).join('、');
  }
  function sliderRow(box, id, label, min, max, step, val, fmt, onInput) {
    var d = U.h('div', { class: 'slider' }, '<label for="' + id + '">' + label + '</label><output class="num" id="' + id + '-o"></output><input type="range" id="' + id + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '">');
    box.appendChild(d);
    var inp = $('#' + id, d), out = $('#' + id + '-o', d);
    function upd() { out.textContent = fmt(+inp.value); }
    inp.addEventListener('input', function () { upd(); onInput(+inp.value); });
    upd();
    return inp;
  }

  /* ======================= 第 2 章：可行性計算器 ======================= */
  var RES = { '720p': [1280, 720], '1080p': [1920, 1080], '4MP': [2560, 1440], '4K': [3840, 2160] };
  var fz = { H: 4, pitch: 25, hfov: 90, res: '1080p', h: 1.72, d: 10 };
  var ZC = { good: '#0c8a0c', warn: '#e0a93a', bad: '#e3e5df', out: 'url(#hatch)' };
  var ZN = { good: '可用', warn: '邊緣', bad: '不可用', out: '不在畫面' };

  function camObj() { var r = RES[fz.res]; return { H: fz.H, pitch: fz.pitch, hfov: fz.hfov, W: r[0], Hpx: r[1] }; }
  function zonesAt(d) {
    var m = G.measure(camObj(), { d: d, h: fz.h });
    var bodyDep = Math.atan2(fz.H - fz.h / 2, d) * 180 / Math.PI;
    if (!m.inFrame) return { m: m, z: { face: 'out', reid: 'out', gait: 'out', height: 'out' }, bodyDep: bodyDep };
    var z = {};
    z.face = (m.eyeDist >= 15 && m.faceDepress <= 20) ? 'good' : (m.eyeDist >= 10 && m.faceDepress <= 30) ? 'warn' : 'bad';
    z.reid = m.personPx >= 128 ? 'good' : m.personPx >= 64 ? 'warn' : 'bad';
    z.gait = (m.personPx >= 64 && bodyDep <= 30) ? 'good' : (m.personPx >= 48 && bodyDep <= 45) ? 'warn' : 'bad';
    z.height = m.personPx >= 100 ? 'good' : m.personPx >= 60 ? 'warn' : 'bad';
    return { m: m, z: z, bodyDep: bodyDep };
  }
  var DMIN = 1, DMAX = 40;
  function initFeas() {
    var box = $('#feas-ctrl');
    sliderRow(box, 'fz-h', '架設高度', 2, 10, 0.5, fz.H, function (v) { return v.toFixed(1) + ' m'; }, function (v) { fz.H = v; drawFeas(); });
    sliderRow(box, 'fz-p', '俯角', 0, 60, 1, fz.pitch, function (v) { return v + '°'; }, function (v) { fz.pitch = v; drawFeas(); });
    sliderRow(box, 'fz-f', '水平視角', 30, 110, 1, fz.hfov, function (v) { return v + '°'; }, function (v) { fz.hfov = v; drawFeas(); });
    sliderRow(box, 'fz-ht', '人的身高', 1.6, 1.9, 0.01, fz.h, function (v) { return v.toFixed(2) + ' m'; }, function (v) { fz.h = v; drawFeas(); });
    var sel = U.h('div', { class: 'slider' }, '<label for="fz-r">解析度</label><span></span><select id="fz-r" style="grid-column:1/-1;margin:2px 0 8px">' + Object.keys(RES).map(function (k) { return '<option' + (k === fz.res ? ' selected' : '') + '>' + k + '</option>'; }).join('') + '</select>');
    box.appendChild(sel);
    $('#fz-r').addEventListener('change', function (e) { fz.res = e.target.value; drawFeas(); });
    var svg = $('#feas-chart');
    function pick(e) {
      var r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 640;
      if (x < 80 || x > 620) return;
      fz.d = Math.round((DMIN + (x - 80) / 540 * (DMAX - DMIN)) * 2) / 2; drawFeas();
    }
    svg.addEventListener('pointermove', pick);
    svg.addEventListener('pointerdown', pick);
    drawFeas();
  }
  function drawFeas() {
    var svg = U.clear($('#feas-chart'));
    var defs = el('defs', {}, svg);
    var pat = el('pattern', { id: 'hatch', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
    el('rect', { width: 6, height: 6, fill: '#f0f1ec' }, pat);
    el('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: '#c5ccc2', 'stroke-width': 2 }, pat);
    var L = 80, W = 540;
    function X(d) { return L + (d - DMIN) / (DMAX - DMIN) * W; }
    var rows = [['face', '人臉'], ['reid', '外觀 ReID'], ['gait', '步態'], ['height', '身高估計']];
    var samples = [];
    for (var d = DMIN; d <= DMAX + 1e-9; d += 0.25) samples.push({ d: d, r: zonesAt(d) });
    el('text', { x: 0, y: 14, 'font-size': 13, 'font-weight': 700, fill: 'var(--ink)', text: '各線索在不同水平距離的可用程度' }, svg);
    rows.forEach(function (rw, i) {
      var y = 26 + i * 28;
      el('text', { x: L - 8, y: y + 15, 'text-anchor': 'end', 'font-size': 12.5, fill: 'var(--ink)', text: rw[1] }, svg);
      var run = null;
      function flush(endD) { if (!run) return; el('rect', { x: X(run.d0), y: y + 2, width: Math.max(0.5, X(endD) - X(run.d0)), height: 20, fill: ZC[run.z] }, svg); }
      samples.forEach(function (s, k) {
        var z = s.r.z[rw[0]];
        if (!run || run.z !== z) { flush(s.d); run = { z: z, d0: s.d }; }
        if (k === samples.length - 1) flush(DMAX);
      });
    });
    // 圖例
    var lx = L;
    ['good', 'warn', 'bad', 'out'].forEach(function (k) {
      el('rect', { x: lx, y: 142, width: 12, height: 12, fill: ZC[k], stroke: k === 'bad' ? '#c5ccc2' : 'none' }, svg);
      el('text', { x: lx + 17, y: 152, 'font-size': 12, fill: 'var(--ink-2)', text: ZN[k] }, svg); lx += 80;
    });
    // 子圖 A：人高像素
    function panel(y0, h, title, key, maxV, lines) {
      el('text', { x: 0, y: y0 - 8, 'font-size': 13, 'font-weight': 700, fill: 'var(--ink)', text: title }, svg);
      function Y(v) { return y0 + h - Math.min(v, maxV) / maxV * h; }
      el('line', { x1: L, x2: L + W, y1: y0 + h, y2: y0 + h, stroke: 'var(--ink-3)' }, svg);
      [0, maxV / 2, maxV].forEach(function (t) { el('text', { x: L - 6, y: Y(t) + 4, 'text-anchor': 'end', 'font-size': 11, fill: 'var(--ink-3)', class: 'num', text: Math.round(t) }, svg); });
      lines.forEach(function (ln, k) {
        el('line', { x1: L, x2: L + W, y1: Y(ln[0]), y2: Y(ln[0]), stroke: ln[2], 'stroke-dasharray': '4 3' }, svg);
        el('text', { x: L + W - k * 170, y: Y(ln[0]) - 3, 'text-anchor': 'end', 'font-size': 11, fill: ln[2], text: ln[1] }, svg);
      });
      var pts = samples.filter(function (s) { return s.r.m.inFrame || s.r.m.partial; }).map(function (s) { return X(s.d).toFixed(1) + ',' + Y(s.r.m[key]).toFixed(1); });
      el('polyline', { points: pts.join(' '), fill: 'none', stroke: 'var(--ink)', 'stroke-width': 2 }, svg);
    }
    panel(190, 100, '人形高度（像素）', 'personPx', 400, [[128, '128：常用 ReID 輸入高度', '#2a78d6'], [64, '64：步態輪廓輸入高度', '#d55181']]);
    panel(335, 90, '兩眼間距（像素）', 'eyeDist', 40, [[15, '15', '#0c8a0c'], [10, '10：受控實驗仍 95%', '#b97e00'], [5, '5：掉到 27%', '#c93434']]);
    // x 軸
    [1, 5, 10, 15, 20, 25, 30, 35, 40].forEach(function (t) { el('text', { x: X(t), y: 448, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--ink-3)', class: 'num', text: t + ' m' }, svg); });
    el('text', { x: L + W / 2, y: 466, 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--ink-2)', text: '人與攝影機的水平距離（移動滑鼠或點圖上任一處查看該距離）' }, svg);
    // 游標
    el('line', { x1: X(fz.d), x2: X(fz.d), y1: 24, y2: 430, stroke: 'var(--ink)', 'stroke-width': 1, 'stroke-dasharray': '2 2' }, svg);
    drawSide(); readout();
  }
  function drawSide() {
    var svg = U.clear($('#feas-side'));
    var sc = 8.4, x0 = 22, g = 100;
    el('line', { x1: 0, x2: 380, y1: g, y2: g, stroke: 'var(--ink-3)' }, svg);
    el('line', { x1: x0, x2: x0, y1: g, y2: g - fz.H * sc, stroke: 'var(--ink)', 'stroke-width': 3 }, svg);
    el('rect', { x: x0 - 4, y: g - fz.H * sc - 6, width: 16, height: 9, rx: 2, fill: 'var(--ink)' }, svg);
    var gr = G.groundRange(camObj());
    var cy = g - fz.H * sc;
    var aTop = (fz.pitch - gr.vfov / 2) * Math.PI / 180, aBot = (fz.pitch + gr.vfov / 2) * Math.PI / 180;
    function ray(a) { var len = 420; if (a > 0.001) len = Math.min(len, (g - cy) / Math.sin(a)); return [x0 + Math.cos(a) * len, cy + Math.sin(a) * len]; }
    var p1 = ray(aTop), p2 = ray(aBot);
    var dPath = 'M' + x0 + ' ' + cy + 'L' + p1[0] + ' ' + p1[1] + (p1[1] < g - 0.5 ? 'L380 ' + p1[1] + 'L380 ' + g : '') + 'L' + p2[0] + ' ' + p2[1] + 'Z';
    el('path', { d: dPath, fill: '#2a78d6', opacity: 0.1 }, svg);
    el('line', { x1: x0, y1: cy, x2: p1[0], y2: p1[1], stroke: '#2a78d6', 'stroke-width': 1 }, svg);
    el('line', { x1: x0, y1: cy, x2: p2[0], y2: p2[1], stroke: '#2a78d6', 'stroke-width': 1 }, svg);
    var px = x0 + fz.d * sc;
    if (px < 375) {
      el('line', { x1: px, x2: px, y1: g, y2: g - fz.h * sc, stroke: 'var(--olive)', 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
      el('circle', { cx: px, cy: g - fz.h * sc - 3, r: 3.5, fill: 'var(--olive)' }, svg);
      el('line', { x1: x0, y1: cy, x2: px, y2: g - (fz.h - 0.11) * sc, stroke: 'var(--ink-3)', 'stroke-dasharray': '3 3' }, svg);
    }
    el('text', { x: 0, y: 12, 'font-size': 11.5, fill: 'var(--ink-3)', text: '側視示意；藍色為垂直視野，綠色為目前查看的人' }, svg);
    el('text', { x: 376, y: g + 15, 'text-anchor': 'end', 'font-size': 11, fill: 'var(--ink-3)', text: '最近可見地面 ' + (isFinite(gr.near) ? gr.near.toFixed(1) + ' m' : '—') + (isFinite(gr.far) ? '，最遠 ' + gr.far.toFixed(0) + ' m' : '，遠端到地平線') }, svg);
  }
  function readout() {
    var r = zonesAt(fz.d), m = r.m;
    function z(k) { return '<b style="color:' + (r.z[k] === 'good' ? 'var(--good)' : r.z[k] === 'warn' ? 'var(--warn)' : 'var(--ink-3)') + '">' + ZN[r.z[k]] + '</b>'; }
    $('#feas-read').innerHTML = '<div style="border-top:1px solid var(--rule);margin-top:8px;padding-top:8px"><b>距離 ' + fz.d.toFixed(1) + ' m 時</b></div>' +
      '<div class="kv" style="margin-top:4px">' +
      '<span class="k">人形高度</span><span class="num">' + Math.round(m.personPx) + ' px</span>' +
      '<span class="k">兩眼間距</span><span class="num">' + m.eyeDist.toFixed(1) + ' px</span>' +
      '<span class="k">看臉的俯角</span><span class="num">' + m.faceDepress.toFixed(0) + '°</span>' +
      '<span class="k">每公尺像素</span><span class="num">' + Math.round(m.ppm) + ' px/m</span>' +
      '<span class="k">身高每像素誤差</span><span class="num">約 ' + (100 * fz.h / Math.max(1, m.personPx)).toFixed(1) + ' cm</span>' +
      '</div><div class="kv" style="margin-top:8px"><span class="k">人臉</span>' + z('face') + '<span class="k">外觀 ReID</span>' + z('reid') + '<span class="k">步態</span>' + z('gait') + '<span class="k">身高</span>' + z('height') + '</div>';
  }

  /* ---------- 證據卡 ---------- */
  var ccCur = 'face';
  function drawBriar() {
    var svg = $('#briar');
    hbar(svg, R.CH_BRIAR.map(function (r) { return [r.n, r.a, r.n === '三者融合' ? 'pick' : '']; }), { x: 0, labelW: 90, w: 300, rowH: 34, max: 100, title: '臉可見' });
    hbar(svg, R.CH_BRIAR.map(function (r) { return [r.n, r.b, r.n === '三者融合' ? 'pick' : r.n === '臉' ? 'bad' : '']; }), { x: 460, labelW: 90, w: 300, rowH: 34, max: 100, title: '臉受限（較像營區監視器）' });
  }
  /* 線索入門的合併表：8 種線索 × （是什麼／用到它的方法組／換裝後／系統中的角色／理由／驗證實驗）。
     每列 id = cue-role-<key>，是各線索注意事項的唯一出處（其他地方只放 {{cav:…}} 連結）。缺的格寫「—」。 */
  var CUE_ROWS = [
    { key: 'app', n: '外觀', c: 'var(--c-app)', what: '衣服顏色、紋理、配件', grp: '{{grp:3:app}}',
      cloth: '失效（只在同一天、同一套服裝內可靠）', role: '日內關聯主力',
      why: '同一天的鞋、背包、袖口仍有差異；跨日不可靠。衣服以外的殘餘細部外觀沒有公開證據，靠自建資料判斷（待驗證，E1 附帶分析）', exp: '{{exp:E1|id}}、{{exp:E2|id}}' },
    { key: 'sil', n: '輪廓', c: 'var(--c-sil)', what: '剪影：哪些像素屬於這個人（原始表示，本身不是身分特徵）', grp: '動態：{{grp:3:gait}}（剪影序列）；靜態：{{grp:3:shape}}（FSAM）',
      cloth: '大致有效；冬季外套、鋼盔會改變輪廓', role: '—', why: '—', exp: '—' },
    { key: 'skel', n: '骨架', c: 'var(--c-skel)', what: '關節點與肢段（由 RTMPose 估出）', grp: '動態：{{grp:3:gait}}（SkeletonGait++、GPGait）；靜態：{{grp:3:shape}}（肢體比例、骨架序列再辨識）',
      cloth: '有效；但遠距時關節估不準', role: '—', why: '—', exp: '—' },
    { key: 'shape', n: '體型／3D', c: 'var(--c-3d)', what: '身材比例：肩寬、胖瘦、腿長比', grp: '{{grp:3:shape}}（3DSL、肢體比例）；{{grp:3:cc}}裡的 CLIP3DReID、3DInvarReID 也靠它',
      cloth: '有效；厚外套會干擾估計', role: '暫不採用（SMPL 3D 重建）', why: 'BRIAR 中最弱；重建需 GPU', exp: '—' },
    { key: 'body', n: '身高', c: 'var(--c-3d)', what: '幾公分（唯一有絕對大小的）', grp: '{{grp:3:body}}（攝影機幾何）；輪廓與骨架都已縮放，算不出身高',
      cloth: '有效；鋼盔約高 2–3 cm，可修正', role: '弱先驗', why: '誤差約 5–6 cm，與人群散佈相近，只能過濾候選；單目估計的誤差範圍約 4–9 cm', exp: '併入 {{exp:E3|id}}' },
    { key: 'gait', n: '步態', c: 'var(--c-gait)', what: '走路的動作：步幅、擺臂、步頻', grp: '{{grp:3:gait}}（從輪廓或骨架的連續畫面學）',
      cloth: '有效；跑步和走路不同', role: '副線（臉不可用時）', why: 'BRIAR 臉受限時步態 61.2% vs 臉 30.7%；高俯角需微調', exp: '{{exp:E5|id}}' },
    { key: 'face', n: '臉', c: 'var(--c-face)', what: '臉部特徵', grp: '{{grp:3:face}}（近距點位）',
      cloth: '有效', role: '主線，限近距點位', why: '最強的身分資訊，但監視對監視 R1 只有 35%，俯角超過 30° 急降', exp: '{{exp:E4|id}}' },
    { key: 'tag', n: '制服記號', c: 'var(--olive)', what: '姓名條、階級章', grp: '{{grp:3:tag}}（近距點位）',
      cloth: '只在穿迷彩服時有', role: '—', why: '—', exp: '—' }
  ];
  function cueDecision() {
    $('#cue-decision').innerHTML = '<thead><tr><th>線索</th><th>是什麼</th><th>用到它的方法組</th><th>換裝後</th><th>系統中的角色</th><th>理由</th><th>驗證實驗</th></tr></thead><tbody>' +
      CUE_ROWS.map(function (r) {
        return '<tr id="cue-role-' + r.key + '"><td><span class="sw-dot" style="--c:' + r.c + '"></span><b>' + r.n + '</b></td><td>' + r.what + '</td><td class="small">' + r.grp + '</td><td>' + r.cloth + '</td><td>' + r.role + '</td><td>' + r.why + '</td><td class="num">' + r.exp + '</td></tr>';
      }).join('') + '</tbody>';
  }

  wrapInit('cues', function () { if ($('#feas-chart')) initFeas(); if ($('#briar')) drawBriar(); if ($('#cue-decision')) cueDecision(); });

  /* ======================= 第 2 章：方法總表與比較 ======================= */
  var mtFam = 'all', mtLic = 'all', mtQ = '';
  function initMT() {
    var fam = $('#mt-fam'), lic = $('#mt-lic');
    function mk(box, key, val, label, cur, set) {
      var b = U.h('button', { class: 'chip', 'aria-pressed': val === cur ? 'true' : 'false' }, label);
      b.addEventListener('click', function () { set(val); U.$$('button', box).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); drawMT(); });
      box.appendChild(b);
    }
    mk(fam, 'f', 'all', '全部族群', mtFam, function (v) { mtFam = v; });
    Object.keys(R.FAM2).forEach(function (k) { mk(fam, 'f', k, R.FAM2[k], mtFam, function (v) { mtFam = v; }); });
    mk(lic, 'l', 'all', '全部授權', mtLic, function (v) { mtLic = v; });
    Object.keys(R.LIC).forEach(function (k) { mk(lic, 'l', k, '<span class="lic" style="--c:' + R.LIC[k].c + '"><i></i>' + R.LIC[k].n + '</span>', mtLic, function (v) { mtLic = v; }); });
    $('#mt-q').addEventListener('input', function (e) { mtQ = e.target.value.trim().toLowerCase(); drawMT(); });
    drawMT();
  }
  function drawMT() {
    var list = R.METHODS2.filter(function (m) {
      return (mtFam === 'all' || m.fam === mtFam) && (mtLic === 'all' || m.lic === mtLic) &&
        (!mtQ || (m.n + m.res + m.verdict + m.input).toLowerCase().indexOf(mtQ) >= 0);
    });
    var h = '<thead><tr><th>方法</th><th>出處</th><th>族群</th><th>輸入</th><th>關鍵結果</th><th>規模／算力</th><th>授權</th><th>對本專案</th></tr></thead><tbody>';
    if (!list.length) h += '<tr><td colspan="8" class="muted">沒有符合條件的方法。換個篩選條件試試。</td></tr>';
    list.forEach(function (m) {
      var L = R.LIC[m.lic];
      h += '<tr><td><b><a href="' + m.url + '" target="_blank" rel="noopener">' + U.esc(m.n) + '</a></b></td><td class="small">' + m.v + '</td><td class="small">' + R.FAM2[m.fam] + '</td><td class="small">' + m.input + '</td><td>' + m.res + '</td><td class="small">' + m.cost + '</td>' +
        '<td><span class="lic" style="--c:' + L.c + '" title="' + U.esc(L.d) + '"><i></i>' + L.n + '</span></td><td class="small">' + m.verdict + '</td></tr>';
    });
    $('#mt-table').innerHTML = h + '</tbody>';
  }
  function methodCharts() {
    hbar($('#ch-msmt'), R.CH_MSMT.map(function (r) { return [r[0], r[1], r[2]]; }), { x: 0, labelW: 190, w: 260, rowH: 34, max: 100, title: 'mAP %（實心綠 = 建議起步；藍 = 你已有）' });
    hbar($('#ch-gait'), R.CH_GAIT.map(function (r) { return [r[0], r[1], r[3], r[2]]; }), { x: 0, labelW: 190, w: 200, rowH: 32, max: 100, title: 'Rank-1 %（右側為算力）' });
    var svg = $('#ch-mevid');
    var y = hbar(svg, [['HAMoBE · CCVID 換衣', 87.6, 'ghost']], { x: 0, labelW: 170, w: 280, rowH: 34, max: 100, title: '同一方法在不同基準' });
    hbar(svg, R.CH_MEVID.map(function (r) { return [r[0] + ' · MEVID', r[1], r[0] === 'HAMoBE' ? 'pick' : 'bad']; }), { x: 0, y: y + 4, labelW: 170, w: 280, rowH: 30, max: 100, title: 'MEVID 換衣 Rank-1 %（真實多日）' });
    var s2 = $('#ch-uda');
    var x0 = 210, w = 260;
    el('rect', { x: x0 + 77 / 100 * w, y: 30, width: 4 / 100 * w, height: R.CH_UDA.length * 30, fill: '#4f5c30', opacity: 0.18 }, s2);
    el('text', { x: x0 + 79 / 100 * w, y: 26, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--olive)', text: '有標註 77–81' }, s2);
    hbar(s2, R.CH_UDA.map(function (r) { return [r[0], r[1]]; }), { x: 0, y: 30, labelW: x0, w: w, rowH: 30, max: 100 });
  }
  wrapInit('methods', function () { if ($('#mt-table')) initMT(); if ($('#ch-msmt')) methodCharts(); });

  /* ======================= 第 3 章：約束式分群 ======================= */
  var CAMS = ['攝影機 1（營門）', '攝影機 2（集合場）', '攝影機 3（餐廳）'];
  var MINT = [[0, 3, 6], [3, 0, 4], [6, 4, 0]]; // 分鐘
  var CLU_COL = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948', '#7a8a3a', '#3fa0b5', '#a0522d', '#8e6bd6'];
  var TRK = (function () {
    var r = U.rng(31337), out = [];
    for (var p = 0; p < 6; p++) {
      var t = 5 + r() * 25, cam = Math.floor(r() * 3), n = 4 + Math.floor(r() * 3);
      for (var k = 0; k < n; k++) {
        var dur = 2 + r() * 5;
        out.push({ p: p, cam: cam, t0: t, t1: t + dur });
        var next = Math.floor(r() * 3);
        t = t + dur + MINT[cam][next] + 4 + r() * 40;
        cam = next;
        if (t > 230) break;
      }
    }
    out.sort(function (a, b) { return a.t0 - b.t0; });
    var z = [];
    for (var i = 0; i < out.length; i++) { z[i] = []; for (var j = 0; j < out.length; j++) z[i][j] = j < i ? z[j][i] : U.gauss(r); }
    return { list: out, z: z };
  })();
  var clu = { tau: 0.45, sep: 0.16, cl: true, step: -1, raf: 0 };
  function cannot(a, b) {
    if (a.t0 < b.t1 && b.t0 < a.t1) return true;
    var first = a.t1 <= b.t0 ? a : b, second = first === a ? b : a;
    return (second.t0 - first.t1) < MINT[first.cam][second.cam];
  }
  function whyNot(a, b) { return (a.t0 < b.t1 && b.t0 < a.t1) ? '同一時間出現在兩處' : '換攝影機的速度比最短步行時間還快'; }
  /** 平均連結凝聚分群，並記錄每一步（供播放） */
  function runCluster() {
    var T = TRK.list, n = T.length, S = [], CL = [];
    for (var i = 0; i < n; i++) { S[i] = []; CL[i] = []; for (var j = 0; j < n; j++) {
      var same = T[i].p === T[j].p;
      S[i][j] = i === j ? 1 : U.clamp((same ? 0.5 + clu.sep / 2 : 0.5 - clu.sep / 2) + 0.08 * TRK.z[i][j], 0, 1);
      CL[i][j] = i !== j && cannot(T[i], T[j]);
    } }
    var C = []; for (var k = 0; k < n; k++) C.push([k]);
    var colOf = {}, nextCol = 0, hist = [];
    function key(c) { return Math.min.apply(null, c); }
    function snap() { return C.map(function (c) { return { m: c.slice(), col: c.length > 1 ? colOf[key(c)] : -1 }; }); }
    var snaps = [snap()];
    for (;;) {
      var best = -1, bi = -1, bj = -1, blk = null;
      for (var a = 0; a < C.length; a++) for (var b = a + 1; b < C.length; b++) {
        var bad = null, sum = 0;
        for (var x = 0; x < C[a].length; x++) for (var y = 0; y < C[b].length; y++) {
          if (!bad && CL[C[a][x]][C[b][y]]) bad = [C[a][x], C[b][y]];
          sum += S[C[a][x]][C[b][y]];
        }
        var avg = sum / (C[a].length * C[b].length);
        if (bad && clu.cl) { if (avg >= clu.tau && (!blk || avg > blk.avg)) blk = { i: bad[0], j: bad[1], avg: avg }; continue; }
        if (avg > best) { best = avg; bi = a; bj = b; }
      }
      if (bi < 0 || best < clu.tau) { hist.push({ stop: true, best: best, blk: blk && blk.avg > best ? blk : null }); break; }
      // 連線：兩群之間最像的一對
      var pi = C[bi][0], pj = C[bj][0], ps = -1;
      C[bi].forEach(function (x) { C[bj].forEach(function (y) { if (S[x][y] > ps) { ps = S[x][y]; pi = x; pj = y; } }); });
      var ka = key(C[bi]), kb = key(C[bj]), kn = Math.min(ka, kb);
      var col = colOf[ka] !== undefined && C[bi].length > 1 ? colOf[ka] : colOf[kb] !== undefined && C[bj].length > 1 ? colOf[kb] : nextCol++;
      if (C[bi].length > 1 && C[bj].length > 1) col = colOf[kn];
      C[bi] = C[bi].concat(C[bj]); C.splice(bj, 1);
      colOf[kn] = col;
      hist.push({ i: pi, j: pj, avg: best, blk: blk && blk.avg > best ? blk : null });
      snaps.push(snap());
    }
    return { C: C, hist: hist, snaps: snaps };
  }
  function metrics(C) {
    var T = TRK.list, n = T.length, lab = [];
    C.forEach(function (c, ci) { c.forEach(function (i) { lab[i] = ci; }); });
    var P = 0, Rr = 0;
    for (var i = 0; i < n; i++) {
      var sc = 0, sp = 0, both = 0;
      for (var j = 0; j < n; j++) { var c1 = lab[j] === lab[i], p1 = T[j].p === T[i].p; if (c1) sc++; if (p1) sp++; if (c1 && p1) both++; }
      P += both / sc; Rr += both / sp;
    }
    P /= n; Rr /= n;
    var merged = C.filter(function (c) { var s = {}; c.forEach(function (i) { s[T[i].p] = 1; }); return Object.keys(s).length > 1; }).length;
    var frag = 0;
    for (var p = 0; p < 6; p++) { var cs = {}; T.forEach(function (t, i) { if (t.p === p) cs[lab[i]] = 1; }); frag += Object.keys(cs).length - 1; }
    return { k: C.length, P: P, R: Rr, F: 2 * P * Rr / (P + Rr), merged: merged, frag: frag, lab: lab };
  }
  var CR = null;
  function recompute() { CR = runCluster(); clu.step = CR.snaps.length - 1; var s = $('#clu-step'); s.max = clu.step; s.value = clu.step; }
  function initClu() {
    var box = $('#clu-ctrl');
    var c1 = U.h('div'), c2 = U.h('div'), c3 = U.h('div');
    box.appendChild(c1); box.appendChild(c2); box.appendChild(c3);
    sliderRow(c1, 'clu-tau', '合併門檻 τ（越高越不敢合併）', 0.35, 0.75, 0.01, clu.tau, function (v) { return v.toFixed(2); }, function (v) { clu.tau = v; stopPlay(); recompute(); drawClu(); });
    sliderRow(c1, 'clu-sep', '線索可分性（同制服下很低）', 0.04, 0.4, 0.01, clu.sep, function (v) { return v.toFixed(2); }, function (v) { clu.sep = v; stopPlay(); recompute(); drawClu(); });
    c2.innerHTML = '<label class="chk"><input type="checkbox" id="clu-cl" checked> 使用時空約束</label><p class="small muted" style="margin:4px 0 0">同時出現在兩處、或兩台攝影機間移動得比最短步行時間還快的片段，禁止併成同一人。</p>';
    $('#clu-cl').addEventListener('change', function (e) { clu.cl = e.target.checked; stopPlay(); recompute(); drawClu(); });
    c3.id = 'clu-stats';
    $('#clu-step').addEventListener('input', function (e) { stopPlay(); clu.step = +e.target.value; drawClu(); });
    $('#clu-play').addEventListener('click', function () { if (clu.raf) { stopPlay(); return; } play(); });
    $('#clu-end').addEventListener('click', function () { stopPlay(); clu.step = CR.snaps.length - 1; $('#clu-step').value = clu.step; drawClu(); });
    recompute(); drawClu();
  }
  function stopPlay() { if (clu.raf) clearTimeout(clu.raf); clu.raf = 0; var b = $('#clu-play'); if (b) b.textContent = '▶ 播放合併過程'; }
  function play() {
    var b = $('#clu-play'); b.textContent = '❚❚ 暫停';
    if (clu.step >= CR.snaps.length - 1) clu.step = 0;
    function next() {
      $('#clu-step').value = clu.step; drawClu();
      if (clu.step >= CR.snaps.length - 1 || !document.getElementById('ch-methods').classList.contains('active')) { stopPlay(); return; }
      clu.step++;
      clu.raf = setTimeout(next, U.reduceMotion ? 50 : 650);
    }
    next();
  }
  function drawClu() {
    var snap = CR.snaps[clu.step], C = snap.map(function (s) { return s.m; }), M = metrics(C), T = TRK.list;
    var colOfT = []; snap.forEach(function (s) { s.m.forEach(function (i) { colOfT[i] = s.col; }); });
    var svg = U.clear($('#clu-svg'));
    var L = 140, W = 820;
    function X(t) { return L + t / 240 * W; }
    CAMS.forEach(function (c, i) {
      var y = 30 + i * 90;
      el('rect', { x: L, y: y, width: W, height: 70, fill: i % 2 ? '#fff' : '#f9faf7', stroke: 'var(--rule-2)' }, svg);
      el('text', { x: L - 10, y: y + 40, 'text-anchor': 'end', 'font-size': 12.5, fill: 'var(--ink)', text: c }, svg);
    });
    for (var h = 0; h <= 4; h++) {
      el('text', { x: X(h * 60), y: 316, 'text-anchor': 'middle', 'font-size': 11.5, fill: 'var(--ink-3)', class: 'num', text: (8 + h) + ':00' }, svg);
      el('line', { x1: X(h * 60), x2: X(h * 60), y1: 26, y2: 302, stroke: 'var(--rule-2)' }, svg);
    }
    var laneEnd = [[], [], []], pos = [];
    T.forEach(function (t, i) {
      var lanes = laneEnd[t.cam], sub = 0;
      while (lanes[sub] !== undefined && lanes[sub] > t.t0 - 1) sub++;
      lanes[sub] = t.t1;
      var y = 30 + t.cam * 90 + 6 + (sub % 2) * 32, w = Math.max(14, X(t.t1) - X(t.t0));
      pos[i] = [X(t.t0) + w / 2, y];
      var col = colOfT[i] < 0 ? '#b8bfb5' : CLU_COL[colOfT[i] % CLU_COL.length];
      var g = el('g', {}, svg);
      el('rect', { x: X(t.t0), y: y, width: w, height: 26, rx: 4, fill: col }, g);
      el('text', { x: X(t.t0) + w / 2, y: y + 17, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: '#fff', text: 'ABCDEF'[t.p] }, g);
      U.tip(g, '真實身分 <b>' + 'ABCDEF'[t.p] + '</b>；系統分到匿名 ID <b>#' + (M.lab[i] + 1) + '</b><br>' + CAMS[t.cam] + '，' + fmtT(t.t0) + '–' + fmtT(t.t1));
    });
    function arc(i, j, stroke, dash, w) {
      var a = pos[i], b = pos[j], mx = (a[0] + b[0]) / 2, my = Math.min(a[1], b[1]) - 22 - Math.abs(a[0] - b[0]) * 0.06;
      el('path', { d: 'M' + a[0] + ' ' + a[1] + ' Q' + mx + ' ' + my + ' ' + b[0] + ' ' + b[1], fill: 'none', stroke: stroke, 'stroke-width': w, 'stroke-dasharray': dash }, svg);
      return [mx, (a[1] + b[1]) / 2 / 2 + my / 2];
    }
    var ev = clu.step > 0 ? CR.hist[clu.step - 1] : null, last = clu.step === CR.snaps.length - 1, stop = CR.hist[CR.hist.length - 1];
    var msg = '';
    if (ev) {
      arc(ev.i, ev.j, 'var(--ink)', null, 2.4);
      msg = '第 ' + clu.step + ' 步：平均證據 ' + ev.avg.toFixed(2) + ' 最高的兩群合併（黑線）。';
    } else msg = '開始：每段片段各自一群（灰色）。每一步把「平均證據最高」的兩群合併。';
    var blk = ev ? ev.blk : (last ? stop.blk : null);
    if (last && stop.stop) { msg += (ev ? ' ' : '') + '停止：剩下最像的一對只有 ' + (stop.best > 0 ? stop.best.toFixed(2) : '—') + '，低於門檻 τ = ' + clu.tau.toFixed(2) + '。'; blk = stop.blk || blk; }
    var blkStep = clu.step;
    if (!blk && last) { for (var hi = CR.hist.length - 1; hi >= 0; hi--) if (CR.hist[hi].blk) { blk = CR.hist[hi].blk; blkStep = hi + 1; break; } }
    if (blk) {
      var m = arc(blk.i, blk.j, 'var(--bad)', '5 4', 2);
      el('text', { x: m[0], y: m[1] + 4, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: 'var(--bad)', text: '✕', 'paint-order': 'stroke', stroke: '#fff', 'stroke-width': 3 }, svg);
      msg += ' <span style="color:var(--bad);font-weight:700">紅虛線' + (blkStep !== clu.step ? '（第 ' + blkStep + ' 步）' : '') + '：這一對的證據 ' + blk.avg.toFixed(2) + ' 比當步合併的還高，但兩段' + whyNot(T[blk.i], T[blk.j]) + '，被約束擋下。</span>';
    }
    $('#clu-msg').innerHTML = msg;
    $('#clu-step-o').textContent = clu.step + ' / ' + (CR.snaps.length - 1);
    el('text', { x: L, y: 16, 'font-size': 12.5, fill: 'var(--ink-3)', text: '條內字母 = 真實身分；顏色 = 系統分出的匿名 ID（同色同 ID；灰色 = 尚未併入任何群）' }, svg);
    var ok = M.k === 6;
    $('#clu-stats').innerHTML = '<div class="stat-row"><div><div class="stat num" style="color:' + (last ? (ok ? 'var(--good)' : 'var(--bad)') : 'var(--ink)') + '">' + M.k + '</div><div class="stat-l">目前的群數（真實 6 人）</div></div>' +
      '<div><div class="stat num">' + M.F.toFixed(2) + '</div><div class="stat-l">BCubed F</div></div></div>' +
      '<div class="kv"><span class="k">誤併的群（混到兩人以上）</span><span class="num" style="color:' + (M.merged ? 'var(--bad)' : 'var(--ink)') + '">' + M.merged + '</span><span class="k">同一人被拆開的次數</span><span class="num">' + M.frag + '</span></div>';
  }
  function fmtT(t) { var m = Math.round(t), h = 8 + Math.floor(m / 60); return h + ':' + ('0' + (m % 60)).slice(-2); }

  function stChart() {
    var svg = $('#st-chart');
    R.CH_ST.forEach(function (r, i) {
      hbar(svg, [['只用外觀', r.a], ['+ 時空約束', r.b, 'pick']], { x: i * 450, labelW: 100, w: 280, rowH: 32, max: 100, title: r.n + ' Rank-1 %' });
    });
  }
  wrapInit('fusion', function () { if ($('#st-chart')) stChart(); if ($('#clu-svg')) initClu(); });
})(window);
