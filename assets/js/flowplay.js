/* flowplay.js — 第 3 章的「動畫說明」播放器
   每張架構卡、系統卡的流程（flow），逐步用圖像動畫播放：開頭 → 每一步一幕 → 核心概念。
   每一步依名稱與說明的關鍵字，自動選一種場景（攝影機、追蹤、特徵、融合、時空、分群、比對、刷卡……）。
   完全離線：只用 SVG 字串繪製，不載入任何外部資源。 */
(function (global) {
  'use strict';
  var W = 640, H = 300;
  var SC = ['#8a948a', '#2a78d6', '#1baf7a', '#6250d6', '#d55181', '#eb6834', '#9a7b12', '#4f5c30'];
  var IDC = ['#2a78d6', '#eb6834', '#1baf7a', '#d55181', '#9a7b12'];
  var NUM = ['額外', '①', '②', '③', '④', '⑤', '⑥', '⑦'];
  var STEPN = ['我們的七步沒有這一步', '攝影機與偵測', '追蹤成片段', '身分線索特徵', '融合成證據', '時空約束', '分群', '比對名冊'];
  var INK = '#1c251f', INK3 = '#6f7a71', OLIVE = '#4f5c30', SKIN = '#c99b78', PAPER = '#f6f7f3';
  var NAMES = ['王大明', '李志強', '陳建宏', '林俊傑'];

  /* ---------------- 繪圖小工具 ---------------- */
  function cl(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function ease(t) { t = cl(t); return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function seg(t, a, b) { return cl((t - a) / (b - a)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function rnd(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function op(o) { return o == null || o >= 1 ? '' : ' opacity="' + (+o).toFixed(3) + '"'; }
  function T(x, y, s, o) {
    o = o || {};
    return '<text x="' + x + '" y="' + y + '" font-size="' + (o.size || 13) + '" text-anchor="' + (o.a || 'middle') + '" fill="' + (o.c || INK) + '"' + (o.w ? ' font-weight="700"' : '') + op(o.op) + '>' + esc(s) + '</text>';
  }
  function R(x, y, w, h, o) {
    o = o || {};
    return '<rect x="' + x + '" y="' + y + '" width="' + Math.max(0, w) + '" height="' + Math.max(0, h) + '" rx="' + (o.rx == null ? 3 : o.rx) + '" fill="' + (o.f || 'none') + '"' +
      (o.s ? ' stroke="' + o.s + '" stroke-width="' + (o.sw || 1.5) + '"' : '') + (o.dash ? ' stroke-dasharray="' + o.dash + '"' : '') + op(o.op) + (o.filter ? ' filter="url(#' + o.filter + ')"' : '') + '/>';
  }
  function Ln(x1, y1, x2, y2, c, w, o) {
    o = o || {};
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + (c || INK3) + '" stroke-width="' + (w || 1.5) + '"' + (o.dash ? ' stroke-dasharray="' + o.dash + '"' : '') + ' stroke-linecap="round"' + op(o.op) + '/>';
  }
  function Ci(x, y, r, o) {
    o = o || {};
    return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + (o.f || 'none') + '"' + (o.s ? ' stroke="' + o.s + '" stroke-width="' + (o.sw || 1.5) + '"' : '') + (o.dash ? ' stroke-dasharray="' + o.dash + '"' : '') + op(o.op) + '/>';
  }
  function arrow(x1, y1, x2, y2, c, o) {
    c = c || INK3; o = o || {};
    var a = Math.atan2(y2 - y1, x2 - x1), s = 7;
    return '<g' + op(o.op) + '>' + Ln(x1, y1, x2, y2, c, 1.8, o) +
      '<path d="M' + x2 + ',' + y2 + ' L' + (x2 - s * Math.cos(a - 0.45)) + ',' + (y2 - s * Math.sin(a - 0.45)) + ' L' + (x2 - s * Math.cos(a + 0.45)) + ',' + (y2 - s * Math.sin(a + 0.45)) + 'Z" fill="' + c + '"/></g>';
  }
  /** 穿制服的人：(x,y) 為腳底；s 縮放；ph 步行相位；o.mark 胸前身分色；o.sil 剪影 */
  function person(x, y, s, ph, o) {
    o = o || {}; s = s || 1;
    var sw = Math.sin(ph || 0), body = o.sil ? INK : (o.body || OLIVE), skin = o.sil ? INK : SKIN, lw = 3.2 * s;
    var g = '<g' + op(o.op) + '>';
    g += Ln(x - 2 * s, y - 14 * s, x - 2 * s + sw * 6 * s, y, body, lw) + Ln(x + 2 * s, y - 14 * s, x + 2 * s - sw * 6 * s, y, body, lw);
    g += Ln(x - 6 * s, y - 33 * s, x - 6 * s - sw * 5 * s, y - 19 * s, body, lw * 0.85) + Ln(x + 6 * s, y - 33 * s, x + 6 * s + sw * 5 * s, y - 19 * s, body, lw * 0.85);
    g += R(x - 7 * s, y - 36 * s, 14 * s, 23 * s, { f: body, rx: 3 * s });
    g += Ci(x, y - 42 * s, 5.5 * s, { f: skin });
    if (!o.sil) g += R(x - 6 * s, y - 49 * s, 12 * s, 4 * s, { f: '#3c4723', rx: 1.5 * s });
    if (o.mark) g += R(x - 4 * s, y - 31 * s, 8 * s, 5 * s, { f: o.mark, rx: 1 });
    return g + '</g>';
  }
  function camera(x, y, s, o) {
    s = s || 1; o = o || {};
    return '<g' + op(o.op) + '>' + R(x - 16 * s, y - 9 * s, 26 * s, 18 * s, { f: '#3a423c', rx: 3 }) + '<path d="M' + (x + 10 * s) + ',' + (y - 5 * s) + ' L' + (x + 20 * s) + ',' + (y - 10 * s) + ' L' + (x + 20 * s) + ',' + (y + 10 * s) + ' L' + (x + 10 * s) + ',' + (y + 5 * s) + 'Z" fill="#3a423c"/>' +
      Ln(x - 4 * s, y - 9 * s, x - 4 * s, y - 18 * s, '#3a423c', 3 * s) + (o.label ? T(x, y + 24 * s, o.label, { size: 12, c: INK3 }) : '') + '</g>';
  }
  function bars(x, y, n, bw, h, c, prog, seed, o) {
    var r = rnd(seed), g = '', k = Math.round(n * cl(prog));
    for (var i = 0; i < n; i++) {
      var v = 0.2 + 0.8 * r();
      if (i < k) g += R(x + i * (bw + 3), y - v * h, bw, v * h, { f: c, rx: 1 });
    }
    g += Ln(x - 2, y, x + n * (bw + 3), y, INK3, 1);
    return g + (o && o.label ? T(x + n * (bw + 3) / 2, y + 18, o.label, { size: 12, c: INK3 }) : '');
  }
  function net(x, y, w, h, c, label, o) {
    return '<g' + op(o && o.op) + '><path d="M' + x + ',' + (y - h / 2) + ' L' + (x + w) + ',' + (y - h / 4) + ' L' + (x + w) + ',' + (y + h / 4) + ' L' + x + ',' + (y + h / 2) + 'Z" fill="' + c + '" fill-opacity=".14" stroke="' + c + '" stroke-width="1.5"/>' + T(x + w / 2, y + 4, label || '模型', { size: 12, c: c, w: 1 }) + '</g>';
  }
  function db(x, y, w, h, c, label) {
    var rx = w / 2, ry = 8;
    return '<path d="M' + (x - rx) + ',' + y + ' v' + h + ' a' + rx + ',' + ry + ' 0 0 0 ' + w + ',0 v' + (-h) + '" fill="#fff" stroke="' + c + '" stroke-width="1.6"/>' +
      '<ellipse cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" fill="#fff" stroke="' + c + '" stroke-width="1.6"/>' + (label ? T(x, y + h + 26, label, { size: 12, c: INK3 }) : '');
  }
  function thumb(x, y, w, h, idx, o) {
    o = o || {};
    return '<g' + op(o.op) + '>' + R(x, y, w, h, { f: '#fff', s: o.s || '#c5ccc2', sw: o.sw || 1.2 }) + person(x + w / 2, y + h - 4, (h - 8) / 52, 0.4, { mark: IDC[idx % 5] }) + '</g>';
  }
  function wrap(s, n) {
    var out = [], line = '';
    String(s).split('').forEach(function (ch) { line += ch; if (line.length >= n && /[，。；、：）」—\s]/.test(ch)) { out.push(line); line = ''; } else if (line.length >= n + 6) { out.push(line); line = ''; } });
    if (line) out.push(line);
    return out;
  }
  function caption(x, y, s, o) { return T(x, y, s, Object.assign({ size: 13, c: INK3 }, o || {})); }

  /* ---------------- 場景 ---------------- */
  var SCN = {};
  SCN.cam = function (t) {
    var g = '<path d="M108,70 L630,22 L630,290 L108,92Z" fill="#2a78d6" fill-opacity=".06"/>' + camera(84, 80, 1.6, { label: '監視器' });
    for (var i = 0; i < 3; i++) {
      var x = 260 + i * 120 + t * 40, y = 200 + (i % 2) * 34, s = 1.25 + (i % 2) * 0.2;
      g += person(x, y, s, t * 18 + i * 2, { mark: IDC[i] });
      var show = seg(t, 0.25 + i * 0.13, 0.35 + i * 0.13);
      if (show > 0) g += R(x - 13 * s, y - 54 * s, 26 * s, 58 * s, { s: IDC[i], sw: 2, op: show }) + T(x, y - 58 * s, '人 ' + (0.93 - i * 0.04).toFixed(2), { size: 11, c: IDC[i], op: show, w: 1 });
    }
    return g + caption(320, 288, '每一幀找出畫面中的人，各給一個框與信心分數');
  };
  SCN.track = function (t) {
    var g = R(30, 30, 580, 190, { f: '#fff', s: '#dde2da' }) + camera(52, 50, 0.9);
    var paths = [[90, 180, 560, 120], [120, 110, 540, 190], [80, 150, 470, 70]];
    for (var i = 0; i < 3; i++) {
      var p = paths[i], pts = [];
      for (var k = 0; k <= 16; k++) { var u = t * k / 16; pts.push(lerp(p[0], p[2], u) + ',' + (lerp(p[1], p[3], u) + Math.sin(u * 7 + i) * 6)); }
      g += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + IDC[i] + '" stroke-width="3" stroke-opacity=".5" stroke-dasharray="2 5" stroke-linecap="round"/>';
      var x = lerp(p[0], p[2], t), y = lerp(p[1], p[3], t) + Math.sin(t * 7 + i) * 6;
      g += person(x, y + 16, 0.9, t * 22 + i, { mark: IDC[i] }) + T(x, y - 38, 'ID ' + (i + 1), { size: 11, c: IDC[i], w: 1 });
      g += R(110, 238 + i * 16, 470 * t * (0.8 + i * 0.07), 10, { f: IDC[i], op: 0.8 }) + T(100, 247 + i * 16, '片段 ' + (i + 1), { size: 11, a: 'end', c: IDC[i] });
    }
    return g;
  };
  function featScene(t, c, label, left) {
    var g = R(40, 60, 100, 170, { f: '#fff', s: '#c5ccc2' }) + (left || person(90, 220, 2.6, 0.5, { mark: IDC[0] }));
    g += arrow(150, 145, 196, 145, INK3, { op: seg(t, 0.1, 0.25) }) + net(205, 145, 110, 120, c, label, { op: seg(t, 0.15, 0.35) });
    g += arrow(322, 145, 368, 145, INK3, { op: seg(t, 0.35, 0.45) });
    g += bars(380, 200, 16, 12, 110, c, seg(t, 0.4, 0.95), 7, { label: '特徵向量（一串數字）' });
    return g;
  }
  SCN.feat = function (t) { return featScene(t, '#2a78d6', '外觀模型') + caption(320, 288, '把人形裁切變成一串數字；同一人的數字應該接近'); };
  SCN.face = function (t) {
    var p = 0.5 + 0.5 * Math.sin(t * 12);
    var g = R(30, 50, 140, 190, { f: '#fff', s: '#c5ccc2' }) + person(100, 235, 3.2, 0.2, { mark: IDC[0] }) + R(76, 76, 48, 48, { s: '#6250d6', sw: 2 + p, op: seg(t, 0.05, 0.2) });
    g += arrow(178, 120, 220, 120, INK3, { op: seg(t, 0.2, 0.3) });
    var fo = seg(t, 0.25, 0.4);
    g += '<g' + op(fo) + '>' + R(230, 70, 100, 100, { f: '#fff', s: '#6250d6', sw: 1.5 }) + Ci(280, 120, 34, { f: SKIN }) + Ci(268, 112, 3, { f: INK }) + Ci(292, 112, 3, { f: INK }) + Ln(270, 135, 290, 135, INK, 2) + '</g>';
    [[268, 112], [292, 112], [280, 123], [270, 135], [290, 135]].forEach(function (q, i) { g += Ci(q[0], q[1], 3.5, { s: '#6250d6', sw: 2, op: seg(t, 0.35 + i * 0.04, 0.4 + i * 0.04) }); });
    g += T(280, 190, '對齊 5 個特徵點', { size: 12, c: INK3, op: fo });
    g += arrow(340, 120, 380, 120, INK3, { op: seg(t, 0.55, 0.6) }) + bars(392, 170, 14, 12, 100, '#6250d6', seg(t, 0.58, 0.95), 11, { label: '臉部特徵' });
    return g + caption(320, 288, '臉夠大、夠正才採用；換衣服也不受影響');
  };
  SCN.gait = function (t) {
    var g = '';
    for (var i = 0; i < 6; i++) g += person(70 + i * 56, 170, 1.7, i * 1.05, { sil: 1, op: seg(t, i * 0.07, i * 0.07 + 0.08) });
    g += T(210, 200, '連續 30 幀的人形剪影（只看形狀與動作）', { size: 12, c: INK3, op: seg(t, 0.1, 0.3) });
    g += arrow(400, 120, 440, 120, INK3, { op: seg(t, 0.45, 0.55) }) + bars(452, 170, 11, 12, 100, '#d55181', seg(t, 0.5, 0.95), 5, { label: '步態特徵' });
    return g + caption(320, 288, '走路的節奏、擺臂、步幅不隨衣服改變');
  };
  SCN.pose = function (t) {
    var kp = [[150, 70], [150, 92], [125, 98], [175, 98], [115, 140], [185, 140], [110, 178], [190, 178], [138, 168], [162, 168], [132, 220], [168, 220], [128, 262], [172, 262]];
    var sk = [[0, 1], [1, 2], [1, 3], [2, 4], [3, 5], [4, 6], [5, 7], [2, 8], [3, 9], [8, 9], [8, 10], [9, 11], [10, 12], [11, 13]];
    var g = person(150, 268, 4.1, 0.25, { op: 0.25 }), k = Math.round(14 * seg(t, 0.05, 0.6));
    sk.forEach(function (e) { if (e[0] < k && e[1] < k) g += Ln(kp[e[0]][0], kp[e[0]][1], kp[e[1]][0], kp[e[1]][1], '#eb6834', 3); });
    for (var i = 0; i < k; i++) g += Ci(kp[i][0], kp[i][1], 4.5, { f: '#fff', s: '#eb6834', sw: 2 });
    g += arrow(240, 150, 290, 150, INK3, { op: seg(t, 0.6, 0.7) });
    g += '<g' + op(seg(t, 0.65, 0.8)) + '>' + T(300, 120, '關節完整度：' + Math.round(100 * seg(t, 0.6, 1)) + '%', { a: 'start', size: 15, w: 1 }) + T(300, 148, '→ 用來挑好幀、估身高、切開混在一起的片段', { a: 'start', size: 13, c: INK3 }) + '</g>';
    return g + caption(320, 288, '找出 17 個關節點的位置');
  };
  SCN.tag = function (t) {
    var g = R(40, 40, 300, 210, { f: OLIVE, rx: 10 }) + '<g opacity=".35">' + [0, 1, 2, 3, 4, 5, 6, 7].map(function (i) { return R(50 + (i * 37) % 270, 55 + (i * 53) % 170, 40, 22, { f: '#2e3720', rx: 8 }); }).join('') + '</g>';
    g += R(90, 110, 130, 40, { f: '#e8e2c8', rx: 2 }) + T(155, 137, '王大明', { size: 20, w: 1 }) + T(155, 100, '姓名條', { size: 11, c: '#e8e2c8' });
    g += '<path d="M265,100 l18,12 l18,-12 M265,116 l18,12 l18,-12" stroke="#e8c84a" stroke-width="5" fill="none"/>' + T(283, 148, '階級章', { size: 11, c: '#e8e2c8' });
    var sy = lerp(105, 155, (t * 3) % 1);
    if (t < 0.6) g += Ln(84, sy, 226, sy, '#ff4d4d', 2.5, { op: 0.9 });
    var o = seg(t, 0.55, 0.7);
    g += arrow(350, 145, 395, 145, INK3, { op: o }) + '<g' + op(o) + '>' + R(405, 95, 200, 100, { f: '#fff', s: '#4f5c30' }) + T(505, 128, '讀出：王大明', { size: 16, w: 1 }) + T(505, 155, '階級：上士', { size: 13, c: INK3 }) + T(505, 182, '→ 名冊候選只剩 1 人', { size: 13, c: '#0c8a0c', w: 1 }) + '</g>';
    return g + caption(320, 288, '同制服仍有個別記號；只在近距點位讀得到');
  };
  SCN.body = function (t) {
    var g = person(180, 262, 4.2, 0.2, { mark: IDC[1] }), top = 262 - 4.2 * 47, h = seg(t, 0.1, 0.6);
    g += Ln(250, 262, 250, lerp(262, top, h), '#9a7b12', 3);
    for (var i = 0; i <= 8; i++) { var yy = 262 - i * (262 - top) / 8; if (yy >= lerp(262, top, h)) g += Ln(244, yy, 256, yy, '#9a7b12', 2); }
    g += Ln(150, top, 262, top, '#9a7b12', 1, { dash: '4 4', op: seg(t, 0.55, 0.65) });
    g += '<g' + op(seg(t, 0.6, 0.75)) + '>' + T(290, 120, '172 cm ± 5', { a: 'start', size: 24, w: 1, c: '#9a7b12' }) + T(290, 150, '由攝影機高度、俯角與頭腳位置算出', { a: 'start', size: 13, c: INK3 }) + T(290, 176, '只能排除「不可能的人」，不能單獨定身分', { a: 'start', size: 13, c: INK3 }) + '</g>';
    return g;
  };
  SCN.restore = function (t) {
    var b = (4 * (1 - seg(t, 0.25, 0.85))).toFixed(2);
    var g = '<defs><filter id="fpblur"><feGaussianBlur stdDeviation="' + b + '"/></filter><filter id="fpblur0"><feGaussianBlur stdDeviation="4"/></filter></defs>';
    g += R(60, 50, 160, 200, { f: '#fff', s: '#c5ccc2' }) + '<g filter="url(#fpblur0)">' + person(140, 240, 3.4, 0.3, { mark: IDC[2] }) + '</g>' + T(140, 270, '遠距、大氣擾動', { size: 12, c: INK3 });
    g += arrow(232, 150, 300, 150, INK3) + T(266, 140, '還原', { size: 12, c: INK3 });
    g += R(320, 50, 160, 200, { f: '#fff', s: '#2a78d6' }) + '<g filter="url(#fpblur)">' + person(400, 240, 3.4, 0.3, { mark: IDC[2] }) + '</g>' + T(400, 270, '以「辨識得出」為目標', { size: 12, c: INK3 });
    return g;
  };
  SCN.calib = function (t) {
    var g = '<path d="M60,240 L260,240 L210,80 L110,80Z" fill="#fff" stroke="#c5ccc2" stroke-width="1.5"/>';
    for (var i = 1; i < 4; i++) { g += Ln(lerp(60, 110, i / 4), lerp(240, 80, i / 4), lerp(260, 210, i / 4), lerp(240, 80, i / 4), '#dde2da', 1) + Ln(lerp(60, 260, i / 4), 240, lerp(110, 210, i / 4), 80, '#dde2da', 1); }
    g += T(160, 266, '攝影機畫面（有透視）', { size: 12, c: INK3 });
    g += R(400, 70, 180, 180, { f: '#fff', s: '#c5ccc2' });
    for (i = 1; i < 4; i++) g += Ln(400 + i * 45, 70, 400 + i * 45, 250, '#dde2da', 1) + Ln(400, 70 + i * 45, 580, 70 + i * 45, '#dde2da', 1);
    g += T(490, 266, '平面圖（公尺）', { size: 12, c: INK3 });
    var u = ease(t), y = lerp(230, 95, u), half = lerp(95, 45, u);
    g += Ci(160 + half * 0.3, y, 6, { f: '#eb6834' }) + Ci(490 + 40, lerp(240, 80, u), 6, { f: '#eb6834' });
    g += arrow(275, 160, 385, 160, INK3) + T(330, 150, '單應性轉換', { size: 12, c: INK3 });
    return g;
  };
  SCN.st = function (t, st) {
    var imp = /不可能|同時/.test(st.n + st.d);
    var g = R(30, 30, 380, 230, { f: '#fff', s: '#dde2da' }) + '<path d="M80,90 C160,90 200,220 360,210" fill="none" stroke="#dde2da" stroke-width="16" stroke-linecap="round"/>';
    g += camera(70, 70, 1, { label: '攝影機 A' }) + camera(380, 236, 1, { label: '' }) + T(380, 210, '攝影機 B', { size: 12, c: INK3 });
    var u = ease(seg(t, 0, imp ? 0.55 : 0.75));
    var bx = Math.pow(1 - u, 3) * 80 + 3 * Math.pow(1 - u, 2) * u * 160 + 3 * (1 - u) * u * u * 200 + u * u * u * 360;
    var by = Math.pow(1 - u, 3) * 90 + 3 * Math.pow(1 - u, 2) * u * 90 + 3 * (1 - u) * u * u * 220 + u * u * u * 210;
    g += person(bx, by + 10, 0.8, t * 25, { mark: IDC[0] });
    g += R(440, 40, 170, 40, { f: PAPER, s: '#c5ccc2' }) + T(525, 66, '經過 ' + Math.round(u * 48) + ' 秒', { size: 15, w: 1 });
    var hb = [2, 5, 9, 14, 10, 6, 3, 1], hk = Math.round(8 * seg(t, 0.2, 0.8));
    g += T(525, 110, 'A → B 的轉移時間分布', { size: 12, c: INK3 });
    for (var i = 0; i < hk; i++) g += R(452 + i * 19, 220 - hb[i] * 7, 15, hb[i] * 7, { f: '#eb6834', op: 0.75 });
    g += Ln(448, 220, 610, 220, INK3, 1) + T(530, 238, '秒', { size: 11, c: INK3 });
    if (imp) {
      var o = seg(t, 0.6, 0.75);
      g += '<g' + op(o) + '>' + person(110, 110, 0.8, 0, { mark: IDC[1] }) + person(340, 210, 0.8, 0, { mark: IDC[1] }) + Ln(110, 125, 340, 205, '#c93434', 2, { dash: '5 4' }) + T(225, 150, '同一時間出現在兩處 → 不可能是同一人', { size: 13, c: '#c93434', w: 1 }) + '</g>';
    }
    return g + caption(320, 288, '時間與位置可以排除不可能的配對，並給出「走過去要多久」的證據');
  };
  SCN.cluster = function (t) {
    var r = rnd(42), g = R(30, 30, 580, 230, { f: '#fff', s: '#dde2da' });
    var cen = [[150, 100], [310, 200], [470, 100], [540, 210]], u = ease(seg(t, 0.1, 0.7));
    if (t > 0.68) cen.forEach(function (c, k) { g += Ci(c[0], c[1], 42, { s: IDC[k], sw: 1.5, dash: '5 4', op: seg(t, 0.68, 0.8) }); });
    for (var i = 0; i < 14; i++) {
      var k = i % 4, x0 = 60 + r() * 520, y0 = 50 + r() * 190, jx = (r() - 0.5) * 44, jy = (r() - 0.5) * 44;
      var x = lerp(x0, cen[k][0] + jx, u), y = lerp(y0, cen[k][1] + jy, u);
      g += R(x - 9, y - 5, 18, 10, { f: IDC[k], rx: 5, op: 0.85 });
    }
    var lo = seg(t, 0.82, 0.97);
    g += R(lerp(240, cen[1][0] + 18, lo) - 9, lerp(70, cen[1][1] - 10, lo) - 5, 18, 10, { f: lo > 0.95 ? IDC[1] : '#9aa39a', rx: 5, s: '#6f7a71', sw: 1, dash: '2 2' });
    if (t < 0.82) g += T(240, 58, '品質差的片段：最後才指派', { size: 11, c: INK3 });
    return g + caption(320, 288, '每個小色塊是一段片段；把證據最強的兩群反覆合併，聚成「一人一群」');
  };
  SCN.fuse = function (t) {
    var src = [['臉', '#6250d6', 0.9, '品質高'], ['步態', '#d55181', 0.6, '品質中'], ['外觀', '#2a78d6', 0.25, '品質低（同制服）']];
    var g = '', acc = 0, u = ease(seg(t, 0.35, 0.8));
    src.forEach(function (s, i) {
      var y = 60 + i * 62, w = s[2] * 150;
      g += T(70, y + 18, s[0], { size: 14, a: 'end', w: 1, c: s[1] }) + R(80, y, w, 26, { f: s[1], op: 1 - u * 0.6 }) + T(80 + w + 8, y + 18, s[3], { size: 11, a: 'start', c: INK3 });
      g += R(lerp(80, 380 + acc, u), lerp(y, 200, u), w * 0.7, 26, { f: s[1], op: seg(t, 0.35, 0.4) });
      acc += w * 0.7;
    });
    g += '<g' + op(seg(t, 0.75, 0.9)) + '>' + R(380, 196, acc, 34, { s: INK, sw: 1.5, rx: 2 }) + T(460, 256, '總證據 = 各線索證據相加', { size: 14, w: 1 }) + T(460, 278, '品質低的線索自動變小', { size: 12, c: INK3 }) + '</g>';
    return g + T(460, 160, '各線索換成同一把尺（證據）再相加', { size: 13, c: INK3, op: seg(t, 0.2, 0.35) });
  };
  SCN.index = function (t) {
    var g = db(330, 90, 110, 110, '#2a78d6', '索引資料庫');
    for (var i = 0; i < 4; i++) { var u = (t * 1.6 + i * 0.25) % 1; g += thumb(lerp(40, 280, u), 110 + (i % 2) * 40, 34, 46, i, { op: u < 0.9 ? 1 : (1 - u) * 10 }); }
    for (i = 0; i < 5; i++) g += bars(430, 92 + i * 22, 12, 7, 16, '#2a78d6', seg(t, i * 0.15, i * 0.15 + 0.15), 20 + i);
    return g + caption(320, 288, '每一次出現都先抽特徵存起來，不必當下判斷是誰');
  };
  SCN.search = function (t) {
    var g = R(40, 80, 90, 130, { f: '#fff', s: '#eb6834', sw: 2 }) + person(85, 200, 2, 0.4, { mark: IDC[1] }) + T(85, 232, '查詢', { size: 12, c: INK3 });
    g += arrow(140, 145, 200, 145) + db(250, 100, 80, 80, '#2a78d6') + arrow(300, 145, 350, 145, INK3, { op: seg(t, 0.2, 0.3) });
    [0.92, 0.81, 0.64, 0.42].forEach(function (s, i) {
      var o = seg(t, 0.3 + i * 0.12, 0.4 + i * 0.12);
      g += '<g' + op(o) + '>' + thumb(370, 50 + i * 56, 34, 48, i === 0 ? 1 : i + 1, { s: i === 0 ? '#0c8a0c' : null, sw: i === 0 ? 2.5 : 1 }) + R(414, 66 + i * 56, s * 150, 14, { f: i === 0 ? '#0c8a0c' : '#c5ccc2' }) + T(414 + s * 150 + 6, 78 + i * 56, s.toFixed(2), { size: 12, a: 'start', c: INK3 }) + '</g>';
    });
    return g + caption(320, 288, '依相似度排出所有可能的畫面，再由人確認');
  };
  SCN.match = function (t, st) {
    var g = '';
    for (var i = 3; i >= 0; i--) g += thumb(60 + i * 10, 80 + i * 10, 52, 74, 0);
    g += T(100, 196, '一整群片段', { size: 12, c: INK3 });
    var sc = [0.86, 0.41, 0.33, 0.12], best = seg(t, 0.65, 0.8);
    NAMES.forEach(function (n, k) {
      var y = 46 + k * 52, o = seg(t, 0.1 + k * 0.1, 0.2 + k * 0.1);
      g += Ln(170, 130, 400, y + 20, k === 0 && best > 0 ? '#0c8a0c' : '#c5ccc2', 1 + sc[k] * 5, { op: o });
      g += '<g' + op(o) + '>' + R(405, y, 170, 40, { f: '#fff', s: k === 0 && best > 0 ? '#0c8a0c' : '#c5ccc2', sw: k === 0 && best > 0 ? 2.5 : 1.2 }) + T(445, y + 26, n, { size: 14, w: 1 }) + T(560, y + 26, sc[k].toFixed(2), { size: 13, a: 'end', c: INK3 }) + '</g>';
    });
    g += T(320, 268, '第一名明顯高於第二名才接受；否則回答「未知」或交人工', { size: 13, w: 1, op: best });
    return g;
  };
  SCN.card = function (t, st) {
    var g = R(0, 240, W, 4, { f: '#dde2da', rx: 0 }) + R(300, 120, 12, 120, { f: '#6f7a71' }) + R(370, 120, 12, 120, { f: '#6f7a71' }) + R(286, 150, 18, 26, { f: '#3a423c', rx: 2 });
    var walk = t < 0.4 ? lerp(80, 270, t / 0.4) : t < 0.58 ? 270 : lerp(270, 560, (t - 0.58) / 0.42);
    var swipe = seg(t, 0.4, 0.5) * (1 - seg(t, 0.55, 0.6));
    g += Ci(295, 163, 22, { f: '#1baf7a', op: swipe * 0.5 }) + person(walk, 238, 1.8, t < 0.4 || t > 0.58 ? t * 26 : 0, { mark: IDC[0] });
    var tag = seg(t, 0.48, 0.58);
    g += '<g' + op(tag) + '>' + R(walk - 52, 120, 104, 26, { f: '#fff', s: '#4f5c30', sw: 1.5 }) + T(walk, 138, (st && st.p && st.p.label) || '卡號 1023　王大明', { size: 11, w: 1 }) + '</g>';
    g += camera(560, 70, 1.2) + '<path d="M540,80 L330,200 L460,240Z" fill="#2a78d6" fill-opacity=".05"/>';
    return g + caption(320, 280, '刷卡的這一刻，把身分綁到攝影機看到的這個人身上；之後靠影像接續');
  };
  SCN.sensor = function (t) {
    var x = lerp(70, 220, t), g = person(x, 230, 1.8, t * 24, { mark: IDC[0] }) + R(x + 9, 168, 8, 14, { f: '#3a423c', rx: 2 });
    for (var i = 0; i < 3; i++) { var r = ((t * 3 + i / 3) % 1) * 50; g += Ci(x + 13, 175, r, { s: '#6250d6', sw: 1.5, op: 1 - r / 50 }); }
    g += R(300, 50, 310, 200, { f: '#fff', s: '#dde2da' }) + T(455, 72, '兩條時間序列越來越吻合 → 綁定為同一人', { size: 12, c: INK3 });
    var a = [], b = [], m = seg(t, 0.2, 0.9);
    for (var k = 0; k <= 40; k++) { var xx = 315 + k * 7, v = Math.sin(k / 4) * 40 + Math.sin(k / 1.7) * 10; a.push(xx + ',' + (160 + v)); b.push(xx + ',' + (160 + lerp(Math.cos(k / 3) * 50, v, m) + 6)); }
    g += '<polyline points="' + a.join(' ') + '" fill="none" stroke="#1baf7a" stroke-width="2.5"/><polyline points="' + b.join(' ') + '" fill="none" stroke="#6250d6" stroke-width="2.5" stroke-dasharray="5 3"/>';
    return g + T(330, 236, '— 影像推算', { size: 11, a: 'start', c: '#1baf7a' }) + T(430, 236, '- - 感測器量到', { size: 11, a: 'start', c: '#6250d6' });
  };
  SCN.human = function (t) {
    var g = R(150, 40, 340, 170, { f: '#2c332e', rx: 8 }) + R(310, 210, 20, 22, { f: '#6f7a71' });
    for (var i = 0; i < 4; i++) {
      g += thumb(172 + i * 78, 70, 60, 86, i);
      var o = seg(t, 0.25 + i * 0.15, 0.35 + i * 0.15);
      g += T(202 + i * 78, 186, i === 3 ? '？' : '✓', { size: 22, w: 1, c: i === 3 ? '#e8b100' : '#3fd13f', op: o });
    }
    g += person(320, 300, 2.4, 0, { op: 0.9 });
    return g + caption(470, 262, '人工確認也會錯：記錄信心並定期抽查', { a: 'middle' });
  };
  SCN.del = function (t) {
    var u = ease(seg(t, 0.2, 0.75));
    var g = '<g' + op(1 - seg(t, 0.75, 0.95)) + '>' + R(lerp(150, 410, u), lerp(90, 140, u), 60, 76, { f: '#fff', s: INK3 }) + Ln(lerp(162, 422, u), lerp(110, 160, u), lerp(198, 458, u), lerp(110, 160, u), INK3, 2) + Ln(lerp(162, 422, u), lerp(126, 176, u), lerp(198, 458, u), lerp(126, 176, u), INK3, 2) + '</g>';
    g += R(400, 150, 80, 90, { f: '#fff', s: INK3, sw: 2 }) + R(392, 140, 96, 10, { f: INK3 }) + Ci(220, 230, 22, { s: INK3, sw: 2 }) + Ln(220, 230, 220, 216, INK3, 2) + Ln(220, 230, 232, 236, INK3, 2);
    return g + caption(320, 288, '用完即刪、訂好保存期限');
  };
  SCN.alert = function (t) {
    var g = R(0, 240, W, 4, { f: '#dde2da', rx: 0 }) + R(300, 120, 12, 120, { f: '#6f7a71' }) + R(370, 120, 12, 120, { f: '#6f7a71' }) + R(286, 150, 18, 26, { f: '#3a423c', rx: 2 });
    var x = lerp(120, 520, t);
    g += person(x, 238, 1.7, t * 26, { mark: IDC[0] }) + person(x - 44, 238, 1.7, t * 26 + 1, { mark: IDC[3] });
    g += Ci(295, 163, 20, { f: '#1baf7a', op: seg(t, 0.3, 0.35) * (1 - seg(t, 0.4, 0.45)) * 0.5 });
    var a = seg(t, 0.55, 0.65), sh = Math.sin(t * 80) * 4 * a;
    g += '<g' + op(a) + '>' + '<path transform="translate(' + (90 + sh) + ',60)" d="M0,30 Q0,0 20,0 Q40,0 40,30 L46,38 L-6,38Z" fill="#c93434"/>' + T(320, 80, '刷卡 1 次　通過 2 人', { size: 18, w: 1, c: '#c93434' }) + T(320, 104, '→ 列入待查', { size: 13, c: '#c93434' }) + '</g>';
    return g;
  };
  SCN.eval = function (t) {
    var m = [['IDF1', 0.78, '#2a78d6'], ['HOTA', 0.66, '#1baf7a'], ['聚檔準確率', 0.83, '#9a7b12'], ['擴散率', 0.22, '#c93434']], g = Ln(80, 240, 580, 240, INK3, 1);
    m.forEach(function (r, i) { var h = r[1] * 170 * ease(seg(t, i * 0.12, i * 0.12 + 0.4)); g += R(120 + i * 115, 240 - h, 60, h, { f: r[2], op: 0.85 }) + T(150 + i * 115, 258, r[0], { size: 12 }) + T(150 + i * 115, 232 - h, (r[1] * 100 * ease(seg(t, i * 0.12, i * 0.12 + 0.4))).toFixed(0) + '%', { size: 12, c: INK3 }); });
    return g + caption(320, 286, '示意數字：每個指標回答不同的問題');
  };
  SCN.train = function (t) {
    var g = R(260, 110, 120, 70, { f: '#fff', s: '#6250d6', sw: 2 }) + T(320, 150, '模型', { size: 15, w: 1, c: '#6250d6' });
    var a = t * Math.PI * 2;
    g += '<path d="M240,145 A80,80 0 1,1 400,145" fill="none" stroke="#c5ccc2" stroke-width="2" stroke-dasharray="4 4"/>' + Ci(320 + 80 * Math.cos(a - Math.PI), 145 + 80 * Math.sin(a - Math.PI), 6, { f: '#6250d6' });
    [[150, 80], [150, 210], [490, 80], [490, 210]].forEach(function (p, i) {
      var bad = i === 3, o = seg(t, i * 0.1, i * 0.1 + 0.15);
      g += '<g' + op(o) + '>' + R(p[0] - 50, p[1] - 16, 100, 32, { f: '#fff', s: bad ? '#c93434' : '#c5ccc2' }) + T(p[0], p[1] + 5, bad ? '偽標籤：群 2？' : '偽標籤：群 ' + (i + 1), { size: 12 }) + '</g>';
      if (bad) g += T(p[0] + 60, p[1] + 8, '✗', { size: 24, w: 1, c: '#c93434', op: seg(t, 0.6, 0.7) }) + T(p[0], p[1] + 40, '違反「同時出現」→ 剔除', { size: 11, c: '#c93434', op: seg(t, 0.65, 0.75) });
    });
    return g + caption(320, 288, '用分群結果當標籤重新訓練，並以約束剔除錯的標籤');
  };
  SCN.generic = function (t, st, i) {
    var c = SC[st.s] || SC[0];
    return Ci(320, 120, 52 * ease(seg(t, 0, 0.3)), { f: c, op: 0.15 }) + T(320, 136, NUM[st.s], { size: st.s ? 46 : 22, c: c, w: 1, op: seg(t, 0.1, 0.3) }) +
      wrap(st.n, 18).map(function (l, k) { return T(320, 214 + k * 24, l, { size: 18, w: 1, op: seg(t, 0.2, 0.4) }); }).join('');
  };
  SCN.intro = function (t, f) {
    var g = T(320, 70, f.title, { size: 22, w: 1, op: seg(t, 0, 0.2) }) + wrap(f.sub, 34).slice(0, 3).map(function (l, k) { return T(320, 104 + k * 22, l, { size: 14, c: INK3, op: seg(t, 0.1, 0.3) }); }).join('');
    var n = f.steps.length, w = Math.min(120, 560 / n);
    f.steps.forEach(function (s, k) {
      var x = 320 - (n * w) / 2 + k * w, o = seg(t, 0.3 + k * 0.08, 0.4 + k * 0.08), c = SC[s[2]];
      var xs = /^x_/.test(s[3] || '');
      g += '<g' + op(o) + '>' + R(x + 4, 190, w - 8, 56, { f: xs ? '#fff8e1' : '#fff', s: c, sw: xs ? 3 : 2 }) + (xs ? star(x + w - 10, 194, 8, '#e8a600') : '') + T(x + w / 2, 212, NUM[s[2]], { size: s[2] ? 18 : 11, c: c, w: 1 }) + T(x + w / 2, 236, s[0].length > Math.floor((w - 10) / 11) ? s[0].slice(0, Math.floor((w - 10) / 11) - 1) + '…' : s[0], { size: 11 }) + '</g>';
      if (k < n - 1) g += arrow(x + w - 4, 218, x + w + 4, 218, INK3, { op: o });
    });
    return g + caption(320, 280, ours ? '圓圈數字＝我們系統的第幾步' : '圓圈數字＝對應我們的第幾步　★＝它和別人不同的地方（會放慢講解）', { op: seg(t, 0.6, 0.8) });
  };
  SCN.key = function (t, f) {
    var g = '<g' + op(seg(t, 0, 0.2)) + '><path d="M320,40 a30,30 0 0,1 18,54 v12 h-36 v-12 a30,30 0 0,1 18,-54Z" fill="#f2c94c" stroke="#9a7b12" stroke-width="2"/>' + R(304, 110, 32, 6, { f: '#9a7b12' }) + '</g>';
    g += T(320, 146, f.label, { size: 14, w: 1, c: '#9a7b12', op: seg(t, 0.1, 0.25) });
    return g + wrap(f.text, 30).slice(0, 5).map(function (l, k) { return T(320, 178 + k * 24, l, { size: 15, op: seg(t, 0.2 + k * 0.08, 0.3 + k * 0.08) }); }).join('');
  };

  /* ================================================================
     客製場景（x_ 開頭）：各方法「和別人不同的那一步」
     ================================================================ */
  function panel(x, y, w, h, label) { return R(x, y, w, h, { f: '#fff', s: '#dde2da' }) + (label ? T(x + 8, y + 16, label, { size: 11, a: 'start', c: INK3 }) : ''); }
  function star(x, y, r, c, o) {
    var p = [];
    for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; p.push((x + rr * Math.cos(a)).toFixed(1) + ',' + (y + rr * Math.sin(a)).toFixed(1)); }
    return '<polygon points="' + p.join(' ') + '" fill="' + c + '"' + op(o) + '/>';
  }
  function chip(x, y, w, c, label, o) { return '<g' + op(o) + '>' + R(x, y, w, 14, { f: c, rx: 7 }) + (label ? T(x + w / 2, y + 11, label, { size: 10, c: '#fff', w: 1 }) : '') + '</g>'; }
  function folder(x, y, w, h, c, label) { return '<path d="M' + x + ',' + (y + 8) + ' h' + (w * 0.35) + ' l6,-8 h' + (w * 0.65 - 6) + ' v' + (h) + ' h' + (-w) + 'Z" fill="#fff" stroke="' + c + '" stroke-width="1.6"/>' + (label ? T(x + w / 2, y + h + 24, label, { size: 11, c: INK3 }) : ''); }
  function faceIcon(x, y, r, o) { o = o || {}; return '<g' + op(o.op) + '>' + Ci(x, y, r, { f: SKIN, s: o.s, sw: 2 }) + Ci(x - r * 0.35, y - r * 0.15, r * 0.1, { f: INK }) + Ci(x + r * 0.35, y - r * 0.15, r * 0.1, { f: INK }) + Ln(x - r * 0.3, y + r * 0.4, x + r * 0.3, y + r * (o.diff ? 0.25 : 0.4), INK, 1.6) + '</g>'; }
  function curve(x, y, w, amp, seed, c, dash) {
    var r = rnd(seed), ph = r() * 6, f2 = 1 + r(), pts = [];
    for (var k = 0; k <= 30; k++) pts.push((x + k * w / 30).toFixed(1) + ',' + (y + Math.sin(k / 4 + ph) * amp + Math.sin(k / f2 + ph) * amp * 0.3).toFixed(1));
    return '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + c + '" stroke-width="2.2"' + (dash ? ' stroke-dasharray="5 3"' : '') + '/>';
  }

  /* 架構一：跨攝影機把片段連成全域 ID */
  SCN.x_mtmc_link = function (t) {
    var g = panel(30, 30, 260, 150, '攝影機 A　10:00–10:05') + panel(350, 30, 260, 150, '攝影機 B　10:01–10:07'), ord = [2, 0, 1];
    for (var k = 0; k < 3; k++) {
      var on = seg(t, 0.25 + k * 0.17, 0.35 + k * 0.17), ya = 62 + k * 38, yb = 62 + ord.indexOf(k) * 38;
      g += R(50, ya, 200, 16, { f: on > 0.5 ? IDC[k] : '#c5ccc2' }) + R(370 + k * 20, yb, 200 - k * 20, 16, { f: on > 0.5 ? IDC[k] : '#c5ccc2' });
      g += Ln(252, ya + 8, 368 + k * 20, yb + 8, IDC[k], 2.5, { op: on, dash: '6 4' });
      g += T(320, 220 + k * 22, '全域 ID ' + (k + 1) + '：A 的片段 ' + (k + 1) + ' → B 的片段 ' + (ord.indexOf(k) + 1), { size: 13, c: IDC[k], op: on, w: 1 });
    }
    return g + caption(320, 290, '把不同攝影機的片段配對起來，同一人得到一個全域 ID');
  };
  /* 架構二：同制服時排序失效 */
  SCN.x_search_uni = function (t) {
    var g = R(30, 70, 90, 130, { f: '#fff', s: '#eb6834', sw: 2 }) + person(75, 190, 2, 0.4, { mark: IDC[1] }) + T(75, 222, '要找的人', { size: 12, c: INK3 }) + arrow(130, 135, 170, 135);
    [0.81, 0.80, 0.80, 0.79, 0.79].forEach(function (s, i) {
      var o = seg(t, 0.1 + i * 0.1, 0.2 + i * 0.1), y = 40 + i * 46;
      g += '<g' + op(o) + '>' + thumb(185, y, 30, 42, i === 3 ? 1 : (i + 2) % 5) + R(225, y + 14, s * 260, 14, { f: '#c5ccc2' }) + T(230 + s * 260, y + 26, s.toFixed(2), { size: 12, a: 'start', c: INK3 }) + (i === 3 ? T(560, y + 26, '← 正確的人', { size: 12, a: 'start', c: '#0c8a0c', w: 1 }) : '') + '</g>';
    });
    return g + T(380, 280, '同制服時，前幾名分數幾乎一樣，正確的人可能排第四', { size: 14, w: 1, c: '#c93434', op: seg(t, 0.65, 0.8) });
  };
  /* 架構三、BRIAR：品質估計決定權重 */
  SCN.x_quality_gate = function (t) {
    var cues = [['臉', '#6250d6', 0.2, '臉太小、太糊'], ['步態', '#d55181', 0.85, '連續走了 3 秒'], ['體型', '#9a7b12', 0.6, '全身可見']], g = '';
    cues.forEach(function (c, i) {
      var y = 60 + i * 74, q = c[2] * ease(seg(t, 0.1 + i * 0.1, 0.4 + i * 0.1)), a = Math.PI * (1 - q);
      g += T(60, y + 6, c[0], { size: 15, w: 1, c: c[1] }) + '<path d="M100,' + (y + 14) + ' A26,26 0 0,1 152,' + (y + 14) + '" fill="none" stroke="#dde2da" stroke-width="7"/>' +
        Ln(126, y + 14, 126 + 22 * Math.cos(a), y + 14 - 22 * Math.sin(a), c[1], 3) + T(126, y + 32, '品質 ' + Math.round(q * 100), { size: 11, c: INK3 }) + T(170, y + 10, c[3], { size: 12, a: 'start', c: INK3 });
      var w = 160 * c[2] * seg(t, 0.55, 0.8);
      g += arrow(290, y + 6, 330, y + 6, INK3, { op: seg(t, 0.5, 0.6) }) + R(340, y - 6, w, 22, { f: c[1] }) + T(340 + w + 6, y + 10, '權重 ' + c[2].toFixed(2), { size: 12, a: 'start', c: INK3, op: seg(t, 0.7, 0.8) });
    });
    return g + caption(320, 290, '先估每條線索這一次拍得好不好，再決定信它幾分——臉看不清就少算');
  };
  /* 架構四：營區地圖上的檢查點 */
  SCN.x_checkpoint_map = function (t) {
    var N = [['營門', 80, 230, 1], ['餐廳', 300, 80, 1], ['操場', 520, 90, 0], ['寢室', 540, 230, 0]], g = R(30, 30, 580, 240, { f: '#fff', s: '#dde2da' });
    for (var i = 0; i < 3; i++) g += Ln(N[i][1], N[i][2], N[i + 1][1], N[i + 1][2], '#c5ccc2', 3, { dash: '7 6' });
    var u = ease(t) * 3, k = Math.min(2, Math.floor(u)), f = u - k, x = lerp(N[k][1], N[k + 1][1], f), y = lerp(N[k][2], N[k + 1][2], f);
    N.forEach(function (n, j) {
      g += n[3] ? R(n[1] - 24, n[2] - 16, 48, 32, { f: '#eef2e4', s: OLIVE, sw: 2 }) : Ci(n[1], n[2], 10, { f: '#fff', s: '#c5ccc2' });
      g += T(n[1], n[2] + (n[3] ? 5 : 28), n[0], { size: 12, w: n[3] ? 1 : 0 });
      if (n[3] && u >= j - 0.02) g += T(n[1], n[2] - 24, '✓ 身分確認', { size: 12, c: '#0c8a0c', w: 1 });
    });
    g += person(x, y + 8, 0.75, t * 30, { mark: IDC[0] });
    return g + T(420, 175, '檢查點之間：只知道「有人經過」', { size: 12, c: INK3 }) + caption(320, 292, '在營門、餐廳等必經點用臉、名牌、刷卡確認身分');
  };
  /* 架構五：每晚把出現聚成檔案 */
  SCN.x_archive = function (t) {
    var g = '';
    for (var i = 0; i < 6; i++) { var u = (t * 1.5 + i / 6) % 1; g += thumb(lerp(30, 230, u), 60 + (i % 3) * 60, 26, 36, i % 3, { op: u < 0.85 ? 1 : (1 - u) * 6 }); }
    g += db(280, 90, 70, 90, '#2a78d6', '所有出現') + T(280, 52, '☾ 每晚', { size: 14, w: 1, c: '#9a7b12', op: seg(t, 0.3, 0.45) });
    for (var k = 0; k < 3; k++) {
      var n = Math.round(lerp(3, 14 - k * 3, seg(t, 0.4, 0.9)));
      g += folder(390 + k * 78, 90, 64, 70, IDC[k], '') + T(422 + k * 78, 140, n + ' 次', { size: 14, w: 1, c: IDC[k] }) + T(422 + k * 78, 186, '檔案 ' + (k + 1), { size: 11, c: INK3 });
      g += arrow(320, 135, 386 + k * 78, 120, IDC[k], { op: seg(t, 0.4, 0.55) });
    }
    return g + caption(320, 290, '不必當下判斷是誰；定期把同一人的所有出現聚成一個檔案');
  };
  /* 架構六、Vi-Fi：軌跡與感測器整體配對 */
  SCN.x_bind_assign = function (t) {
    var g = T(110, 40, '影像軌跡', { size: 12, c: INK3 }) + T(530, 40, '感測器', { size: 12, c: INK3 }), sc = [[0.9, 0.3, 0.2], [0.35, 0.2, 0.85], [0.25, 0.8, 0.3]];
    for (var i = 0; i < 3; i++) {
      g += thumb(90, 60 + i * 72, 40, 56, i);
      g += R(500, 74 + i * 72, 60, 30, { f: '#fff', s: '#6250d6' }) + T(530, 94 + i * 72, '裝置 ' + 'ABC'[i], { size: 12 });
      for (var j = 0; j < 3; j++) {
        var best = sc[i][j] > 0.7, o = best ? lerp(0.25, 1, seg(t, 0.55, 0.75)) : lerp(0.6, 0.15, seg(t, 0.55, 0.75));
        g += Ln(134, 88 + i * 72, 496, 89 + j * 72, best && t > 0.55 ? IDC[i] : '#9aa39a', best && t > 0.55 ? 3.5 : 1, { op: o * seg(t, 0.1, 0.3) });
      }
    }
    return g + caption(320, 290, '每條軌跡和每個感測器都算吻合度，再選「整體最吻合」的一對一配對');
  };
  /* NVIDIA：共存重新指派 */
  SCN.x_coexist = function (t) {
    var g = panel(40, 40, 360, 210, '攝影機 2　10:03:15'), bad = seg(t, 0.3, 0.42), fix = seg(t, 0.55, 0.7);
    g += person(170, 220, 2, 0.3, { mark: IDC[0] }) + person(270, 220, 2, 1.5, { mark: IDC[3] });
    g += chip(140, 92, 60, IDC[0], '群 A') + chip(240, 92, 60, fix > 0.5 ? IDC[1] : IDC[0], fix > 0.5 ? '群 B' : '群 A');
    g += '<g' + op(bad * (1 - fix)) + '>' + Ln(200, 99, 240, 99, '#c93434', 3) + T(220, 80, '衝突', { size: 13, c: '#c93434', w: 1 }) + '</g>';
    g += '<g' + op(bad) + '>' + T(420, 90, '同一時間、同一畫面的兩人', { size: 13, a: 'start', w: 1 }) + T(420, 112, '不可能是同一人', { size: 13, a: 'start', w: 1, c: '#c93434' }) + '</g>';
    g += '<g' + op(fix) + '>' + T(420, 160, '依「外觀距離＋時空距離」', { size: 13, a: 'start' }) + T(420, 182, '用匈牙利演算法重新分配', { size: 13, a: 'start' }) + T(420, 214, '可反覆數輪直到沒有衝突', { size: 12, a: 'start', c: INK3 }) + '</g>';
    return g;
  };
  /* AI City 2023：錨點引導分群 */
  SCN.x_anchor_cluster = function (t) {
    var r = rnd(9), A = [[150, 110], [330, 200], [500, 100]], g = R(30, 30, 580, 230, { f: '#fff', s: '#dde2da' });
    A.forEach(function (a, k) { g += star(a[0], a[1], 13, IDC[k], seg(t, 0.05 + k * 0.08, 0.15 + k * 0.08)); });
    g += T(320, 52, '★ 錨點：長而清楚、最有把握的片段', { size: 12, c: INK3, op: seg(t, 0.1, 0.25) });
    for (var i = 0; i < 12; i++) {
      var x = 60 + r() * 520, y = 70 + r() * 170, k = 0, d = 1e9;
      A.forEach(function (a, j) { var dd = (a[0] - x) * (a[0] - x) + (a[1] - y) * (a[1] - y); if (dd < d) { d = dd; k = j; } });
      var on = seg(t, 0.3 + i * 0.02, 0.4 + i * 0.02), moved = i === 4 && t > 0.75;
      if (moved) k = (k + 1) % 3;
      g += Ln(x, y, A[k][0], A[k][1], IDC[k], 1, { op: on * 0.6 }) + R(x - 8, y - 5, 16, 10, { f: on > 0.5 ? IDC[k] : '#9aa39a', rx: 5, s: moved ? '#c93434' : null, sw: 2 });
      if (i === 4) g += T(x, y - 12, '時空不一致 → 改派', { size: 11, c: '#c93434', w: 1, op: seg(t, 0.72, 0.8) });
    }
    return g + caption(320, 288, '先找出有把握的錨點，其他片段依附到最近的錨點，再用時空一致性修正');
  };
  /* Avigilon：外觀失效 → 加臉 */
  SCN.x_addface = function (t) {
    var g = panel(60, 60, 150, 190, '第 1 天　迷彩服') + person(135, 240, 2.6, 0.3, { mark: IDC[0] });
    g += panel(430, 60, 150, 190, '第 2 天　運動服') + person(505, 240, 2.6, 0.3, { mark: IDC[0], body: '#3b5b8c' });
    g += '<g' + op(seg(t, 0.1, 0.25)) + '>' + Ln(215, 200, 425, 200, '#c93434', 2.5, { dash: '7 5' }) + T(320, 192, '外觀相似度 0.21 ✗', { size: 14, c: '#c93434', w: 1 }) + '</g>';
    var f = seg(t, 0.45, 0.6);
    g += '<g' + op(f) + '>' + R(108, 76, 54, 54, { s: '#6250d6', sw: 2.5 }) + R(478, 76, 54, 54, { s: '#6250d6', sw: 2.5 }) + Ln(165, 103, 475, 103, '#0c8a0c', 3) + T(320, 95, '加購臉部模組：0.91 ✓ 同一人', { size: 14, c: '#0c8a0c', w: 1 }) + '</g>';
    return g + caption(320, 288, '業界處理換衣的標準答案：外觀找不到時改用臉');
  };
  /* BriefCam：條件篩選 */
  SCN.x_filters = function (t) {
    var F = [['顏色：綠色迷彩', 1238, '全員迷彩，幾乎沒篩掉'], ['大小：成人', 620, ''], ['速度：步行', 180, ''], ['方向：往東', 42, '']], g = T(110, 40, '篩選條件', { size: 13, c: INK3 }), n = 1240;
    F.forEach(function (f, i) {
      var on = seg(t, 0.1 + i * 0.18, 0.2 + i * 0.18);
      g += R(40, 56 + i * 52, 200, 38, { f: on > 0.5 ? '#eef2e4' : '#fff', s: on > 0.5 ? OLIVE : '#c5ccc2' }) + T(56, 80 + i * 52, (on > 0.5 ? '☑ ' : '☐ ') + f[0], { size: 13, a: 'start' });
      if (f[2]) g += T(250, 80 + i * 52, f[2], { size: 12, a: 'start', c: '#c93434', op: on });
      if (on > 0.5) n = f[1];
    });
    g += T(500, 120, '符合的畫面', { size: 13, c: INK3 }) + T(500, 170, n.toLocaleString(), { size: 40, w: 1 });
    return g + caption(320, 288, '依顏色、大小、速度、方向縮小範圍——同制服時顏色條件沒有用');
  };
  /* 海康威視：屬性全部相同 */
  SCN.x_attrs = function (t) {
    var A = ['上衣：綠迷彩', '褲子：綠迷彩', '帽子：小帽', '背包：無'], g = '';
    for (var i = 0; i < 5; i++) {
      g += person(80 + i * 120, 120, 1.6, 0.4 + i, { mark: IDC[i] });
      A.forEach(function (a, k) { g += T(80 + i * 120, 146 + k * 18, a, { size: 11, c: INK3, op: seg(t, 0.15 + k * 0.1, 0.25 + k * 0.1) }); });
    }
    var o = seg(t, 0.62, 0.75);
    g += R(28, 132, 584, 82, { s: '#c93434', sw: 2, dash: '6 4', op: o }) + T(320, 250, '五個人的屬性完全相同 → 分不出誰是誰', { size: 15, c: '#c93434', w: 1, op: o });
    return g + caption(320, 288, '屬性搜尋靠衣著差異；全員迷彩服時全部失效');
  };
  /* 銀河水滴：遠距、背對 */
  SCN.x_gait_far = function (t) {
    var g = camera(60, 70, 1.3) + Ln(80, 230, 560, 230, '#dde2da', 2), x = lerp(430, 520, t);
    g += person(x, 228, 0.9, t * 24, { sil: 1 }) + T(x, 168, '背對、臉被遮住', { size: 11, c: INK3 });
    g += Ln(90, 250, 480, 250, INK3, 1) + Ln(90, 244, 90, 256, INK3, 1) + Ln(480, 244, 480, 256, INK3, 1) + T(285, 268, '約 50 公尺（廠商宣稱）', { size: 12, c: INK3 });
    g += '<g' + op(seg(t, 0.35, 0.5)) + '>' + R(170, 50, 220, 120, { f: '#fff', s: '#d55181' }) + T(280, 72, '步態比對', { size: 12, c: '#d55181', w: 1 });
    for (var i = 0; i < 5; i++) g += person(195 + i * 40, 150, 1.2, i * 1.2, { sil: 1, op: 0.85 });
    g += '</g>' + T(280, 200, '→ 資料庫中最像：0.94', { size: 14, w: 1, op: seg(t, 0.65, 0.8) });
    return g + caption(320, 292, '臉看不到時，靠走路方式辨識');
  };
  /* PU-ReID：雙分支 */
  SCN.x_twobranch = function (t) {
    var g = R(40, 70, 90, 150, { f: '#fff', s: '#c5ccc2' }) + person(85, 210, 2.3, 0.3, { mark: IDC[0] });
    g += arrow(140, 145, 190, 145) + net(200, 145, 90, 100, INK3, '骨幹');
    g += arrow(300, 135, 350, 90, OLIVE, { op: seg(t, 0.2, 0.35) }) + arrow(300, 155, 350, 200, '#2a78d6', { op: seg(t, 0.2, 0.35) });
    g += '<g' + op(seg(t, 0.3, 0.45)) + '>' + bars(365, 105, 12, 10, 50, OLIVE, 1, 3) + T(430, 125, '制服分支：學「穿什麼」', { size: 13, c: OLIVE, w: 1 }) + '</g>';
    g += '<g' + op(seg(t, 0.45, 0.6)) + '>' + bars(365, 225, 12, 10, 50, '#2a78d6', 1, 8) + T(430, 245, '身分分支：學「是誰」', { size: 13, c: '#2a78d6', w: 1 }) + '</g>';
    return g + caption(320, 290, '一張圖分成兩條特徵：制服資訊和身分資訊分開放');
  };
  /* PU-ReID：正交損失 */
  SCN.x_ortho = function (t) {
    var cx = 200, cy = 220, L = 150, a0 = 0.5, a1 = Math.PI / 2, a = lerp(a0, a1, ease(seg(t, 0.15, 0.65)));
    var g = Ln(cx, cy, cx + 200, cy, '#dde2da', 1) + Ln(cx, cy, cx, cy - 190, '#dde2da', 1);
    g += arrow(cx, cy, cx + L, cy, OLIVE) + T(cx + L + 10, cy + 5, '制服特徵', { size: 13, a: 'start', c: OLIVE, w: 1 });
    g += arrow(cx, cy, cx + L * Math.cos(a), cy - L * Math.sin(a), '#2a78d6') + T(cx + L * Math.cos(a) + 8, cy - L * Math.sin(a) - 6, '身分特徵', { size: 13, a: 'start', c: '#2a78d6', w: 1 });
    g += '<path d="M' + (cx + 34) + ',' + cy + ' A34,34 0 0,0 ' + (cx + 34 * Math.cos(a)) + ',' + (cy - 34 * Math.sin(a)) + '" fill="none" stroke="#9a7b12" stroke-width="2"/>' + T(cx + 48, cy - 22, Math.round(a * 180 / Math.PI) + '°', { size: 13, c: '#9a7b12', w: 1 });
    g += '<g' + op(seg(t, 0.65, 0.8)) + '>' + T(420, 110, '正交損失：逼兩條特徵互相垂直', { size: 14, a: 'start', w: 1 }) + T(420, 136, '＝身分特徵裡不再含制服資訊', { size: 13, a: 'start', c: INK3 }) + T(420, 172, '比對時只用身分特徵', { size: 13, a: 'start', c: '#2a78d6', w: 1 }) + '</g>';
    return g;
  };
  /* SC-ReID：大家同衣時看細節 */
  SCN.x_sameclothes = function (t) {
    var g = '', spots = [[0, -42, '臉、髮型'], [0, -2, '鞋'], [0, -24, '體型']];
    for (var i = 0; i < 4; i++) {
      var x = 110 + i * 140, s = 2.4 + (i % 2) * 0.25;
      g += person(x, 230, s, 0.3, {}) + R(x - 7, 228, 14, 5, { f: ['#222', '#7a5230', '#222', '#444'][i] });
      spots.forEach(function (p, k) { var o = seg(t, 0.2 + k * 0.15, 0.3 + k * 0.15); g += Ci(x + p[0], 230 + p[1] * s, k === 2 ? 22 : 12, { s: '#eb6834', sw: 2, op: o }); });
    }
    g += T(320, 50, '所有人穿同一套衣服', { size: 14, w: 1 }) + T(320, 72, '模型只能看：臉、髮型、鞋子、體型', { size: 13, c: '#eb6834', w: 1, op: seg(t, 0.2, 0.5) });
    return g + caption(320, 290, '在完全同衣的資料上訓練與評估，逼模型學個人細節');
  };
  /* ICSM：三種評估情境 */
  SCN.x_three_eval = function (t) {
    var C = [['一般', [OLIVE, '#8a6d3b', '#3b5b8c']], ['換衣', ['#3b5b8c', OLIVE, OLIVE]], ['資料庫只有同衣服', [OLIVE, OLIVE, OLIVE]]], g = '';
    C.forEach(function (c, i) {
      var x = 40 + i * 200, o = seg(t, i * 0.25, i * 0.25 + 0.2);
      g += '<g' + op(o) + '>' + panel(x, 40, 180, 230, '') + T(x + 90, 62, c[0], { size: 14, w: 1 }) + R(x + 70, 72, 40, 56, { f: '#fff', s: '#eb6834', sw: 2 }) + person(x + 90, 124, 1, 0.3, { mark: IDC[1] }) + arrow(x + 90, 134, x + 90, 156);
      for (var k = 0; k < 3; k++) g += R(x + 14 + k * 54, 164, 44, 62, { f: '#fff', s: k === 0 ? '#0c8a0c' : '#c5ccc2', sw: k === 0 ? 2.5 : 1 }) + person(x + 36 + k * 54, 222, 1.05, 0.3, { mark: IDC[k === 0 ? 1 : k + 2], body: c[1][k] });
      g += T(x + 90, 250, k === 0 ? '' : '綠框＝正確的人', { size: 11, c: INK3 }) + '</g>';
    });
    return g + caption(320, 292, '分開報「一般」「換衣」「同衣」三種成績——我們兩種難題都要');
  };
  /* Industrial-Gait：凍結的大型視覺模型 */
  SCN.x_frozen = function (t) {
    var g = '';
    for (var i = 0; i < 4; i++) g += thumb(30 + i * 14, 80 + i * 10, 44, 62, 0, { op: seg(t, i * 0.06, i * 0.06 + 0.1) });
    g += T(70, 190, '原始彩色畫面', { size: 12, c: INK3 }) + T(70, 206, '（不先做剪影）', { size: 11, c: INK3 }) + arrow(120, 120, 160, 120);
    g += R(170, 60, 190, 120, { f: '#e9ece6', s: INK3, sw: 2 }) + T(265, 110, '大型視覺模型', { size: 15, w: 1 }) + T(265, 132, 'DINOv3（凍結，不重訓）', { size: 12, c: INK3 });
    g += R(334, 66, 18, 14, { f: INK3, rx: 2 }) + '<path d="M337,66 v-5 a6,6 0 0,1 12,0 v5" fill="none" stroke="' + INK3 + '" stroke-width="2"/>';
    var gl = 0.5 + 0.5 * Math.sin(t * 14);
    g += arrow(366, 120, 400, 120) + R(408, 92, 90, 56, { f: '#fdf0f5', s: '#d55181', sw: 1.5 + gl * 1.5 }) + T(453, 116, '步態頭', { size: 13, w: 1, c: '#d55181' }) + T(453, 134, '（只訓練這裡）', { size: 11, c: INK3 });
    g += arrow(504, 120, 530, 120) + bars(540, 150, 6, 9, 60, '#d55181', seg(t, 0.5, 0.9), 4);
    return g + caption(320, 280, '借用大模型已學會的視覺知識，只訓練小小的步態頭');
  };
  /* DanceTrack：外觀一樣、靠運動 */
  SCN.x_dance = function (t) {
    var g = R(30, 30, 380, 230, { f: '#fff', s: '#dde2da' });
    for (var i = 0; i < 3; i++) {
      var x = 90 + i * 110 + Math.sin(t * 6 + i * 2) * 50, y = 200 + Math.cos(t * 5 + i) * 18;
      var vx = Math.cos(t * 6 + i * 2) * 50 * 6 * 0.06, vy = -Math.sin(t * 5 + i) * 18 * 5 * 0.06;
      g += person(x, y, 1.5, t * 30 + i, { mark: '#9aa39a' }) + arrow(x, y - 40, x + vx * 3, y - 40 + vy * 3, IDC[i], { op: seg(t, 0.2, 0.35), dash: '4 3' }) + T(x, y - 88, 'ID ' + (i + 1), { size: 12, w: 1, c: IDC[i] });
    }
    g += T(510, 50, '外觀特徵', { size: 13, c: INK3 });
    for (i = 0; i < 3; i++) g += bars(440, 90 + i * 40, 12, 9, 26, IDC[i], 1, 77);
    g += T(510, 225, '三人幾乎一樣 → 幫助小', { size: 12, c: '#c93434', w: 1, op: seg(t, 0.3, 0.45) }) + T(510, 248, '虛線箭頭＝運動預測', { size: 12, c: INK3, op: seg(t, 0.5, 0.6) });
    return g + caption(220, 288, '外觀一樣時，追蹤靠運動模型與姿態才不會換錯人');
  };
  /* SoccerNet：背號 */
  SCN.x_jersey = function (t) {
    var g = R(60, 70, 120, 150, { f: '#2a78d6', rx: 14 }) + Ci(120, 52, 22, { f: SKIN }) + T(120, 170, '10', { size: 64, w: 1, c: '#fff' });
    var sy = lerp(110, 190, (t * 3) % 1);
    if (t < 0.5) g += Ln(70, sy, 170, sy, '#ff4d4d', 2.5);
    g += arrow(195, 145, 250, 145, INK3, { op: seg(t, 0.45, 0.55) }) + '<g' + op(seg(t, 0.5, 0.65)) + '>' + R(260, 110, 150, 70, { f: '#fff', s: '#2a78d6' }) + T(335, 140, '背號 10', { size: 18, w: 1 }) + T(335, 164, '→ 名單上的 10 號', { size: 12, c: '#0c8a0c', w: 1 }) + '</g>';
    g += '<g' + op(seg(t, 0.7, 0.85)) + '>' + R(450, 70, 120, 150, { f: '#2a78d6', rx: 14 }) + Ci(510, 52, 22, { f: SKIN }) + R(470, 120, 80, 50, { f: '#9aa39a', rx: 4 }) + T(510, 245, '背號被擋住 → 回答「看不到」', { size: 12, c: INK3 }) + '</g>';
    return g + caption(320, 290, '同隊球衣一樣，就讀衣服上的個別記號（背號）');
  };
  /* 監獄：個別記號 */
  SCN.x_marks = function (t) {
    var g = person(170, 270, 4.6, 0.2, { body: '#d9822b' }), M = [[170, 98, 18, '臉上的疤痕', 300, 80], [150, 150, 22, '衣服上的編號 A1023', 300, 140], [205, 175, 14, '手臂刺青', 300, 200]];
    g += R(140, 140, 40, 18, { f: '#fff', rx: 2 }) + T(160, 153, 'A1023', { size: 10, w: 1 }) + Ln(160, 92, 168, 104, '#7a3b2e', 2) + Ci(206, 178, 5, { f: '#2f4f6f' });
    M.forEach(function (m, i) { var o = seg(t, 0.15 + i * 0.2, 0.3 + i * 0.2); g += Ci(m[0], m[1], m[2], { s: '#c93434', sw: 2.5, op: o }) + Ln(m[0] + m[2], m[1], m[4] - 6, m[5] - 4, '#c93434', 1.5, { op: o }) + T(m[4], m[5], m[3], { size: 14, a: 'start', w: 1, op: o }); });
    return g + caption(320, 292, '囚服一樣時不追衣服，找每個人的個別記號');
  };
  /* 工地：安全帽圖案 */
  SCN.x_helmet = function (t) {
    var P = ['stripe', 'dot', 'star', 'num'], g = '';
    P.forEach(function (p, i) {
      var x = 110 + i * 140, o = seg(t, i * 0.15, i * 0.15 + 0.2);
      g += faceIcon(x, 160, 34) + '<path d="M' + (x - 44) + ',140 A44,40 0 0,1 ' + (x + 44) + ',140Z" fill="#f2c94c" stroke="#9a7b12" stroke-width="2"/>';
      g += '<g' + op(o) + '>' + (p === 'stripe' ? R(x - 40, 118, 80, 8, { f: '#2a78d6', rx: 0 }) : p === 'dot' ? Ci(x, 118, 9, { f: '#c93434' }) : p === 'star' ? star(x, 118, 11, '#1baf7a') : T(x, 126, '07', { size: 18, w: 1 })) + T(x, 228, '工人 ' + 'ABCD'[i], { size: 13, w: 1 }) + '</g>';
    });
    return g + caption(320, 280, '安全帽款式一樣，貼不同圖案就能分人');
  };
  /* 防尾隨：刷卡比臉 */
  SCN.x_cardface = function (t) {
    var g = R(60, 70, 180, 112, { f: '#fff', s: INK3, rx: 8 }) + faceIcon(110, 120, 28) + T(190, 110, '卡主', { size: 12, c: INK3 }) + T(190, 132, '王大明', { size: 15, w: 1 }) + T(150, 204, '刷的這張卡', { size: 12, c: INK3 });
    g += camera(400, 70, 1) + R(360, 90, 150, 120, { f: '#fff', s: '#6250d6' }) + faceIcon(435, 150, 34, { diff: 1 }) + T(435, 230, '門口攝影機拍到的人', { size: 12, c: INK3 });
    var o = seg(t, 0.35, 0.5);
    g += '<g' + op(o) + '>' + Ln(245, 126, 355, 150, '#c93434', 2.5, { dash: '6 4' }) + T(300, 120, '0.32', { size: 14, w: 1, c: '#c93434' }) + '</g>';
    g += T(320, 270, '臉和卡主不符 → 拒絕通行或列入待查（疑似代刷）', { size: 15, w: 1, c: '#c93434', op: seg(t, 0.6, 0.75) });
    return g;
  };
  /* 工地：頭部＋身體 */
  SCN.x_headbody = function (t) {
    var g = '';
    [0, 1].forEach(function (i) {
      var x = 110 + i * 150;
      g += person(x, 250, 2.6, 0.3 + i, { body: '#e8742a' }) + R(x - 20, 150, 40, 70, { s: '#2a78d6', sw: 2, op: seg(t, 0.1, 0.2) }) + R(x - 18, 102, 36, 34, { s: '#eb6834', sw: 2.5, op: seg(t, 0.45, 0.55) });
    });
    g += T(470, 60, '身體特徵', { size: 13, c: '#2a78d6', w: 1 }) + bars(400, 110, 12, 9, 34, '#2a78d6', 1, 5) + bars(400, 150, 12, 9, 34, '#2a78d6', 1, 5);
    g += T(560, 135, '幾乎一樣', { size: 12, c: '#c93434', op: seg(t, 0.2, 0.3) });
    g += '<g' + op(seg(t, 0.5, 0.65)) + '>' + T(470, 186, '加上頭部特徵', { size: 13, c: '#eb6834', w: 1 }) + bars(400, 226, 12, 9, 30, '#eb6834', 1, 13) + bars(400, 262, 12, 9, 30, '#eb6834', 1, 71) + T(560, 250, '分得開', { size: 12, c: '#0c8a0c', w: 1 }) + '</g>';
    return g + caption(320, 292, '外觀相似時，頭部是被低估的線索（研究中身分交換降為 0）');
  };
  /* AI City 2024 冠軍：重疊抑制 */
  SCN.x_overlap = function (t) {
    var g = panel(40, 40, 560, 210, ''), xa = lerp(140, 460, t), xb = lerp(500, 180, t), near = 1 - Math.min(1, Math.abs(xa - xb) / 120);
    g += person(xa, 222, 2.2, t * 24, { mark: IDC[0] }) + person(xb, 226, 2.2, t * 24 + 1, { mark: IDC[1] });
    g += R(xa - 28, 100, 56, 128, { s: IDC[0], sw: 2 }) + R(xb - 28, 104, 56, 128, { s: IDC[1], sw: 2 });
    g += '<g' + op(near) + '>' + T(320, 72, '兩框重疊：容易被當成同一人', { size: 13, c: '#c93434', w: 1 }) + T(320, 92, '重疊抑制 → 同一幀重疊的兩人不合併', { size: 13, w: 1 }) + '</g>';
    return g + caption(320, 288, '交錯走過後，兩人仍保有各自的片段，不會互換或併在一起');
  };
  /* AI City 2024 冠軍：挑代表影像 */
  SCN.x_bestframe = function (t) {
    var Q = [40, 55, 95, 30, 88, 60, 20, 70], best = [2, 4], g = T(320, 50, '同一段片段的 8 幀', { size: 13, c: INK3 });
    Q.forEach(function (q, i) {
      var x = 40 + i * 72, o = seg(t, i * 0.04, i * 0.04 + 0.1), pick = best.indexOf(i) >= 0 && t > 0.6;
      g += '<g' + op(o) + '>' + R(x, 70, 60, 100, { f: '#fff', s: pick ? '#0c8a0c' : '#c5ccc2', sw: pick ? 3 : 1 }) + person(x + 30, 164, 1.7, i, { mark: IDC[0], op: q < 35 ? 0.35 : 1 });
      if (q < 50 && q >= 35) g += R(x + 4, 110, 52, 40, { f: '#9aa39a', op: 0.85 });
      g += T(x + 30, 190, '關節 ' + q + '%', { size: 11, c: q > 80 ? '#0c8a0c' : INK3, op: seg(t, 0.3, 0.45) }) + '</g>';
    });
    g += T(320, 230, '選關節最完整、沒被擋住的幀當代表 → 只用它們算外觀特徵', { size: 14, w: 1, op: seg(t, 0.6, 0.75) });
    return g + caption(320, 284, '被擋住、太糊的幀不算，特徵才乾淨');
  };
  /* AI City 2024 冠軍：品質差的片段最後指派 */
  SCN.x_late = function (t) {
    var C = [[330, 110], [470, 170], [380, 230]], g = R(250, 40, 360, 240, { f: '#fff', s: '#dde2da' }) + R(30, 60, 170, 200, { f: PAPER, s: '#c5ccc2', dash: '5 4' }) + T(115, 80, '待指派（太短、太糊）', { size: 12, c: INK3 });
    C.forEach(function (c, k) { g += Ci(c[0], c[1], 40, { s: IDC[k], dash: '5 4' }); for (var j = 0; j < 4; j++) g += R(c[0] - 22 + (j % 2) * 26, c[1] - 12 + Math.floor(j / 2) * 16, 18, 10, { f: IDC[k], rx: 5 }); });
    for (var i = 0; i < 3; i++) {
      var u = ease(seg(t, 0.3 + i * 0.18, 0.45 + i * 0.18)), x = lerp(80 + i * 40, C[i][0] + 26, u), y = lerp(130 + i * 40, C[i][1] + 22, u);
      g += R(x - 9, y - 5, 18, 10, { f: u > 0.95 ? IDC[i] : '#9aa39a', rx: 5, s: '#6f7a71', sw: 1, dash: '2 2' });
    }
    return g + caption(320, 296, '先用好片段把群建好，品質差的片段最後才分到最接近的群，不讓它們帶歪分群');
  };
  /* 公安聚檔：兩段式比對 */
  SCN.x_twostage = function (t) {
    var g = '<path d="M60,60 L280,60 L220,200 L120,200Z" fill="#2a78d6" fill-opacity=".12" stroke="#2a78d6" stroke-width="1.6"' + op(seg(t, 0, 0.15)) + '/>';
    g += T(170, 50, '1,000,000 張', { size: 14, w: 1 }) + T(170, 135, '短特徵粗篩', { size: 14, w: 1, c: '#2a78d6' }) + T(170, 160, '（快、不精確）', { size: 11, c: INK3 }) + T(170, 222, '剩 50 張', { size: 14, w: 1, op: seg(t, 0.25, 0.4) });
    g += arrow(290, 130, 340, 130, INK3, { op: seg(t, 0.4, 0.5) });
    g += '<path d="M350,90 L540,90 L480,190 L410,190Z" fill="#6250d6" fill-opacity=".12" stroke="#6250d6" stroke-width="1.6"' + op(seg(t, 0.45, 0.6)) + '/>';
    g += T(445, 80, '50 張', { size: 14, w: 1, op: seg(t, 0.45, 0.6) }) + T(445, 140, '長特徵精比', { size: 14, w: 1, c: '#6250d6', op: seg(t, 0.5, 0.6) }) + T(445, 212, '→ 歸到正確的檔', { size: 14, w: 1, c: '#0c8a0c', op: seg(t, 0.7, 0.8) });
    return g + caption(320, 280, '先用便宜的特徵快速排除大部分，再用貴的特徵精確比對');
  };
  /* 公安聚檔：準確、召回、擴散 */
  SCN.x_3rates = function (t) {
    var g = '', cols = [['準確率', '檔裡混進別人', [0, 0, 0, 1]], ['召回率', '同一人有照片沒聚進來', [0, 0, 0]], ['擴散率', '同一人被拆成多個檔', [2, 2]]];
    cols.forEach(function (c, i) {
      var x = 50 + i * 200, o = seg(t, i * 0.25, i * 0.25 + 0.2);
      g += '<g' + op(o) + '>';
      if (i < 2) { g += folder(x, 70, 130, 110, INK3); c[2].forEach(function (k, j) { g += thumb(x + 10 + j * 28, 100, 24, 34, k, { s: i === 0 && k === 1 ? '#c93434' : null, sw: 2.5 }); }); }
      if (i === 1) g += thumb(x + 140, 200, 24, 34, 0, { s: '#c93434', sw: 2.5 }) + T(x + 152, 252, '漏掉', { size: 11, c: '#c93434' });
      if (i === 2) [0, 1, 2].forEach(function (j) { g += folder(x + j * 46, 70 + j * 40, 40, 34, IDC[2]) + thumb(x + 9 + j * 46, 80 + j * 40, 20, 26, 2); });
      g += T(x + 65, 230, c[0], { size: 15, w: 1 }) + T(x + 65, 252, c[1], { size: 12, c: INK3 }) + '</g>';
    });
    return g + caption(320, 288, '三個數各管一種錯：混人、漏人、拆人');
  };
  /* Apple：臉與上半身的組合 */
  SCN.x_facebody = function (t) {
    var C = [['臉＋上半身都有', 0.65, 0.35, ''], ['臉被擋住', 0, 1, ''], ['隔天換了衣服', 1, 0.08, '上半身不可靠']], g = '';
    C.forEach(function (c, i) {
      var x = 40 + i * 200, o = seg(t, i * 0.3, i * 0.3 + 0.15);
      g += '<g' + op(o) + '>' + panel(x, 40, 180, 230, '') + T(x + 90, 64, c[0], { size: 14, w: 1 });
      g += person(x + 90, 180, 1.9, 0.3, { mark: IDC[0], body: i === 2 ? '#3b5b8c' : null });
      if (i === 1) g += R(x + 76, 82, 28, 26, { f: '#6f7a71', rx: 4 });
      g += T(x + 20, 214, '臉', { size: 12, a: 'start', c: '#6250d6', w: 1 }) + R(x + 60, 204, 100 * c[1], 12, { f: '#6250d6' }) + T(x + 20, 238, '上半身', { size: 12, a: 'start', c: '#2a78d6', w: 1 }) + R(x + 60, 228, 100 * c[2], 12, { f: '#2a78d6' });
      g += T(x + 90, 262, c[3] || (i === 0 ? '兩者加權相加' : '只用上半身'), { size: 11, c: INK3 }) + '</g>';
    });
    return g + caption(320, 292, '看得到臉就以臉為主；看不到就用上半身——但上半身只在當天有效');
  };
  /* Apple：增量分群 */
  SCN.x_incremental = function (t) {
    var C = [[160, 170, 12], [320, 190, 8], [480, 165, 15]], g = T(560, 60, '☾ 充電時', { size: 14, w: 1, c: '#9a7b12' });
    C.forEach(function (c, k) { var add = k === 1 ? 1 : 2, n = c[2] + Math.round(add * seg(t, 0.4, 0.9)); g += Ci(c[0], c[1], 50, { s: IDC[k], dash: '5 4' }) + T(c[0], c[1] + 6, n + ' 張', { size: 16, w: 1, c: IDC[k] }); });
    for (var i = 0; i < 5; i++) {
      var k = [0, 2, 1, 0, 2][i], u = ease(seg(t, 0.15 + i * 0.12, 0.35 + i * 0.12)), x = lerp(150 + i * 80, C[k][0] + (i - 2) * 10, u), y = lerp(50, C[k][1] - 22, u);
      g += thumb(x - 12, y - 16, 24, 32, k, { op: 1 - seg(t, 0.4 + i * 0.12, 0.45 + i * 0.12) * 0.7 });
    }
    return g + T(150, 60, '新照片', { size: 12, c: INK3 }) + caption(320, 288, '新照片併進已有的群，不必每次全部重算');
  };
  /* Face Body Voice：先高精度再放寬 */
  SCN.x_highprec = function (t) {
    var r = rnd(5), P = [], g = R(30, 30, 580, 230, { f: '#fff', s: '#dde2da' });
    for (var i = 0; i < 12; i++) P.push([80 + (i % 4) * 140 + r() * 40, 80 + Math.floor(i / 4) * 70 + r() * 30, i % 4]);
    var r1 = seg(t, 0.1, 0.35), r2 = seg(t, 0.55, 0.8);
    P.forEach(function (p, i) { P.forEach(function (q, j) { if (j <= i || p[2] !== q[2]) return; var d = Math.abs(p[1] - q[1]); var first = d < 80; g += Ln(p[0], p[1], q[0], q[1], IDC[p[2]], first ? 3 : 1.5, { op: first ? r1 : r2, dash: first ? null : '4 3' }); }); });
    P.forEach(function (p) { g += Ci(p[0], p[1], 8, { f: (r1 > 0.5 ? IDC[p[2]] : '#9aa39a') }); });
    g += T(320, 52, t < 0.5 ? '第 1 輪：只連非常確定的（實線）' : '第 2 輪：放寬門檻（虛線）', { size: 14, w: 1 });
    return g + caption(320, 288, '先求「不聚錯」，再逐步放寬求「聚得全」');
  };
  /* 美軍 DBIDS：衛哨掃描、依警戒等級 */
  SCN.x_guard = function (t) {
    var hi = t > 0.5, g = person(130, 250, 2.6, 0, {}) + R(160, 150, 26, 40, { f: '#3a423c', rx: 4 }) + R(164, 156, 18, 14, { f: '#8fd0ff', rx: 2 });
    g += person(250, 250, 2.6, 0, { mark: IDC[0] }) + R(196, 160, 40, 26, { f: '#fff', s: INK3, rx: 3 }) + T(216, 177, 'ID', { size: 11, w: 1 });
    g += R(380, 50, 220, 70, { f: '#fff', s: '#c5ccc2' }) + T(490, 74, '警戒等級', { size: 12, c: INK3 }) + T(490, 104, hi ? '升高' : '平時', { size: 22, w: 1, c: hi ? '#c93434' : '#0c8a0c' });
    g += R(380, 140, 220, 100, { f: '#fff', s: '#c5ccc2' }) + T(490, 168, '✓ 掃證件條碼', { size: 14 }) + T(490, 196, (hi ? '✓' : '—') + ' 加掃指紋', { size: 14, c: hi ? INK : '#9aa39a' }) + T(490, 224, '→ 回傳照片與狀態', { size: 12, c: INK3 });
    return g + caption(320, 290, '在營門確認一次；檢查強度依警戒等級調整');
  };
  /* 機場：縮小比對名單 */
  SCN.x_smallgallery = function (t) {
    var r = rnd(3), g = '', shrink = seg(t, 0.25, 0.5);
    for (var i = 0; i < 160; i++) { var x = 40 + r() * 330, y = 50 + r() * 200, keep = i % 9 === 0; g += Ci(x, y, 3.5, { f: keep ? '#2a78d6' : '#9aa39a', op: keep ? 1 : 1 - shrink * 0.85 }); }
    g += T(205, 42, shrink < 0.5 ? '機場所有旅客（數萬人）' : '只留這班機的旅客（約 300 人）', { size: 13, w: 1 });
    var m = seg(t, 0.6, 0.75);
    g += '<g' + op(m) + '>' + faceIcon(480, 120, 34, { s: '#2a78d6' }) + T(480, 180, '登機門拍到的臉', { size: 12, c: INK3 }) + arrow(440, 140, 380, 160, '#0c8a0c') + T(500, 230, '名單小 → 誤認少', { size: 15, w: 1, c: '#0c8a0c' }) + '</g>';
    return g + caption(320, 288, '每個檢查點只和「此時應該出現在這裡的人」比對');
  };
  /* 機場：報到 1:1 註冊 */
  SCN.x_enroll11 = function (t) {
    var g = R(50, 70, 150, 110, { f: '#1f3b63', rx: 8 }) + R(64, 92, 54, 66, { f: '#fff', rx: 2 }) + faceIcon(91, 125, 20) + T(160, 110, '護照', { size: 13, c: '#fff', w: 1 });
    g += camera(330, 60, 1) + faceIcon(330, 135, 34, { s: '#6250d6' }) + T(330, 190, '現場拍的臉', { size: 12, c: INK3 });
    g += '<g' + op(seg(t, 0.25, 0.4)) + '>' + Ln(206, 125, 290, 130, '#0c8a0c', 3) + T(248, 116, '1:1 ✓', { size: 14, w: 1, c: '#0c8a0c' }) + '</g>';
    g += '<g' + op(seg(t, 0.5, 0.65)) + '>' + arrow(370, 135, 420, 135) + R(430, 90, 170, 90, { f: '#fff', s: '#9a7b12', sw: 2 }) + T(515, 118, '單一憑證', { size: 15, w: 1, c: '#9a7b12' }) + T(515, 142, '臉的特徵＋訂位資料', { size: 12 }) + T(515, 164, '之後各關卡都用它', { size: 11, c: INK3 }) + '</g>';
    return g + caption(320, 280, '報到時把臉和證件、訂位綁在一起，只做一次');
  };
  /* Amazon Go：脫外套，代碼不變 */
  SCN.x_jacket = function (t) {
    var off = seg(t, 0.35, 0.6), x = lerp(80, 360, t);
    var body = off < 0.5 ? '#5a6b8a' : OLIVE;
    var g = R(0, 238, W, 4, { f: '#dde2da', rx: 0 }) + person(x, 236, 2.2, t * 24, { body: body }) + chip(x - 30, 100, 60, '#9a7b12', '代碼 #A7');
    if (off > 0 && off < 1) g += T(x, 90, '脫外套', { size: 12, c: INK3 });
    g += panel(430, 50, 180, 170, '外觀特徵') + bars(450, 130, 10, 10, 50, '#5a6b8a', 1, 31, {}) + '<g' + op(off) + '>' + bars(450, 200, 10, 10, 50, OLIVE, 1, 62) + '</g>';
    g += T(520, 245, '特徵更新，代碼不變', { size: 13, w: 1, op: seg(t, 0.6, 0.75) });
    return g + caption(320, 288, '靠畫面連續性知道還是同一人，所以外觀變了就更新特徵，不會斷');
  };
  /* Red Wolf：顏色分級 */
  SCN.x_colorcode = function (t) {
    var C = [['#1baf7a', '可通行'], ['#e8b100', '需盤查'], ['#c93434', '需扣留']], g = '';
    C.forEach(function (c, i) { var x = 130 + i * 190, o = seg(t, i * 0.2, i * 0.2 + 0.2); g += '<g' + op(o) + '>' + person(x, 220, 2.2, 0.3) + Ci(x, 70, 20, { f: c[0] }) + T(x, 250, c[1], { size: 15, w: 1, c: c[0] }) + '</g>'; });
    return g + caption(320, 288, '依資料庫紀錄給出三種結果（國際特赦組織報告所述）');
  };
  /* Vi-Fi／ViTag：把軌跡翻成感測訊號 */
  SCN.x_translate = function (t) {
    var g = panel(30, 50, 150, 160, '影像軌跡') + '<path d="M50,180 C80,120 110,160 160,80" fill="none" stroke="#1baf7a" stroke-width="3"/>';
    g += arrow(186, 130, 220, 130) + net(228, 130, 80, 90, '#6250d6', '翻譯網路');
    g += arrow(314, 130, 340, 130, INK3, { op: seg(t, 0.15, 0.25) }) + '<g' + op(seg(t, 0.2, 0.35)) + '>' + curve(350, 70, 90, 14, 4, '#6250d6', 1) + T(395, 46, '預測：這人的手機應量到', { size: 11, c: '#6250d6' }) + '</g>';
    var best = seg(t, 0.65, 0.8);
    ['A', 'B', 'C'].forEach(function (k, i) {
      var y = 140 + i * 48, o = seg(t, 0.35 + i * 0.08, 0.45 + i * 0.08), hit = i === 1;
      g += '<g' + op(o) + '>' + curve(350, y, 90, 12, hit ? 4 : 10 + i * 3, hit && best > 0.5 ? '#0c8a0c' : '#9aa39a') + T(455, y + 5, '手機 ' + k + (hit ? '　最吻合 ✓' : ''), { size: 12, a: 'start', c: hit && best > 0.5 ? '#0c8a0c' : INK3, w: hit ? 1 : 0 }) + '</g>';
    });
    return g + caption(320, 292, '把影像換成「手機該量到的訊號」，再和每支手機實測的訊號比');
  };
  /* UWB 識別證定位 */
  SCN.x_uwb = function (t) {
    var A = [[60, 50], [580, 50], [60, 250], [580, 250]], x = lerp(180, 440, t), y = 160 + Math.sin(t * 6) * 30, g = R(40, 30, 560, 240, { f: '#fff', s: '#dde2da' });
    A.forEach(function (a) { var d = Math.sqrt((a[0] - x) * (a[0] - x) + (a[1] - y) * (a[1] - y)); g += Ci(a[0], a[1], d, { s: '#6250d6', sw: 1, op: 0.35 }) + '<path d="M' + a[0] + ',' + (a[1] - 10) + ' l9,16 h-18Z" fill="#6250d6"/>'; });
    g += person(x, y + 30, 1.3, t * 24, { body: '#e8742a' }) + Ci(x, y - 34, 4, { f: '#c93434' }) + Ci(x, y - 30, 14, { s: '#c93434', dash: '3 3' });
    return g + T(x, y - 50, '±50 cm', { size: 12, w: 1, c: '#c93434' }) + caption(320, 292, '四角的基地台量距離、交會出位置；準，但要裝基地台、標籤可借用');
  };
  /* 攝影機拓撲：從時間差找出峰 */
  SCN.x_xcorr = function (t) {
    var r = rnd(11), g = T(40, 50, 'A 離開', { size: 12, a: 'start', c: INK3 }) + T(40, 100, 'B 進入', { size: 12, a: 'start', c: INK3 }) + Ln(100, 46, 600, 46, '#dde2da', 1) + Ln(100, 96, 600, 96, '#dde2da', 1);
    var ev = []; for (var i = 0; i < 14; i++) ev.push(100 + r() * 430);
    ev.forEach(function (e, i) { var o = seg(t, i * 0.02, i * 0.02 + 0.05); g += Ln(e, 38, e, 54, IDC[0], 2.5, { op: o }); if (i % 3) g += Ln(e + 45, 88, e + 45, 104, IDC[1], 2.5, { op: o }); });
    for (i = 0; i < 7; i++) { var nx = 110 + r() * 480; g += Ln(nx, 88, nx, 104, '#9aa39a', 2, { op: seg(t, 0.2, 0.3) }); }
    var H2 = [3, 4, 3, 5, 4, 14, 5, 3, 4, 3], k = Math.round(10 * seg(t, 0.3, 0.8));
    g += T(320, 136, '所有「A 離開 → B 進入」的時間差', { size: 12, c: INK3 });
    for (i = 0; i < k; i++) g += R(160 + i * 32, 250 - H2[i] * 7, 26, H2[i] * 7, { f: i === 5 ? '#eb6834' : '#c5ccc2' });
    g += Ln(150, 250, 490, 250, INK3, 1) + T(349, 268, '45 秒', { size: 12, c: '#eb6834', w: 1, op: seg(t, 0.75, 0.85) });
    return g + T(500, 160, '真正相連的兩台', { size: 13, a: 'start', op: seg(t, 0.75, 0.85) }) + T(500, 182, '會出現明顯的峰', { size: 13, a: 'start', op: seg(t, 0.75, 0.85) }) + caption(320, 292, '不用知道誰是誰，只看時間差的統計就能學出攝影機關係');
  };
  /* 新場域調適：用約束剔除錯的偽標籤 */
  SCN.x_constraint_clean = function (t) {
    var g = Ci(260, 150, 110, { s: IDC[0], dash: '6 4' }) + T(260, 30, '偽標籤：群 1', { size: 13, w: 1, c: IDC[0] });
    var L = [['攝影機 1　10:02', 200, 110], ['攝影機 2　10:05', 300, 110], ['攝影機 3　10:02', 220, 190], ['攝影機 4　10:09', 310, 190]];
    var bad = seg(t, 0.35, 0.5), out = ease(seg(t, 0.6, 0.85));
    L.forEach(function (l, i) {
      var x = l[1], y = l[2];
      if (i === 2) { x = lerp(x, 470, out); y = lerp(y, 220, out); }
      g += R(x - 44, y - 13, 88, 26, { f: '#fff', s: (i === 0 || i === 2) && bad > 0.5 && out < 1 ? '#c93434' : IDC[0], sw: 2 }) + T(x, y + 4, l[0], { size: 11 });
    });
    g += '<g' + op(bad * (1 - out)) + '>' + Ln(200, 123, 220, 177, '#c93434', 2, { dash: '4 3' }) + T(120, 160, '同時在兩處 ✗', { size: 12, c: '#c93434', w: 1 }) + '</g>';
    g += T(470, 260, '踢出群 1', { size: 12, c: '#c93434', op: out });
    return g + caption(320, 292, '自我訓練的偽標籤若違反時空約束，就剔除再訓練');
  };
  /* 超級辨識員：篩選 */
  SCN.x_test = function (t) {
    var S = [62, 71, 58, 93, 66, 89, 74, 95, 60, 70], g = T(320, 44, '臉部辨識測驗成績', { size: 13, c: INK3 }) + Ln(60, 240, 580, 240, INK3, 1);
    S.forEach(function (s, i) { var h = s * 1.8 * ease(seg(t, 0.05, 0.5)), top = s > 85 && t > 0.6; g += R(70 + i * 50, 240 - h, 34, h, { f: top ? '#0c8a0c' : '#c5ccc2' }) + (top ? T(87 + i * 50, 232 - h, '★', { size: 14, c: '#0c8a0c' }) : ''); });
    return g + caption(320, 280, '只挑測驗前幾名進專職小組——人也有能力差異，所以先測驗');
  };
  /* 法庭步態：逐項比較 */
  SCN.x_gait_compare = function (t) {
    var g = panel(40, 40, 160, 180, '監視器影片') + person(120, 210, 2.4, t * 20, { sil: 1 }) + panel(440, 40, 160, 180, '被告') + person(520, 210, 2.4, t * 20 + 0.3, { sil: 1 });
    [['步幅', '✓'], ['擺臂', '✓'], ['腳尖外八', '？'], ['身體前傾', '✓']].forEach(function (r, i) { var o = seg(t, 0.15 + i * 0.12, 0.25 + i * 0.12); g += T(290, 80 + i * 32, r[0], { size: 14, a: 'start', op: o }) + T(380, 80 + i * 32, r[1], { size: 16, w: 1, c: r[1] === '✓' ? '#0c8a0c' : '#e8b100', op: o }); });
    g += '<g' + op(seg(t, 0.7, 0.85)) + '>' + R(230, 220, 180, 40, { s: '#c93434', sw: 2.5, rx: 6 }) + T(320, 246, '只能當支持性證據', { size: 15, w: 1, c: '#c93434' }) + '</g>';
    return g + caption(320, 290, '沒有公開的錯誤率，所以法院不讓步態單獨定案');
  };

  SCN.x_tag = SCN.tag; SCN.x_alert = SCN.alert;

  /* 依步驟文字選場景；順序代表優先序 */
  var RULES = [
    ['alert', /警示|警告|扣留|人比卡多|不一致就/], ['card', /刷卡|讀卡|識別證|QR|卡號|條碼|閘|咽喉/], ['sensor', /手機|Wi-Fi|訊號|UWB|感測/],
    ['restore', /還原|大氣/], ['tag', /名牌|階級章|背號|編號|文字|OCR|圖案|姓名/], ['gait', /步態|走路|剪影/], ['pose', /姿態|關節/],
    ['face', /臉/], ['body', /身高|體型/], ['del', /刪除|消失|保存期限/], ['human', /人工|專家|警員|篩選人員|看影片|法院|意見|佐證/],
    ['eval', /評分|IDF1|HOTA|評估|評測|基準/], ['train', /訓練|偽標籤|自我/], ['calib', /校正|單應性|3D|座標|三角/],
    ['st', /轉移時間|時空|拓撲|統計相依|出入事件|不可能|約束|時間差/], ['cluster', /分群|聚類|聚檔|聚成|合併|指派|接合|重疊|分組|群/],
    ['fuse', /融合|加權|權重|距離/], ['search', /查詢|搜尋|排序/], ['index', /索引|入庫|資料庫|Elasticsearch/],
    ['match', /比對|辨識|1:N|名冊|檔案|貼標籤|身分|配對/], ['track', /追蹤|片段|軌跡|連續/], ['cam', /偵測|攝影機|抓拍|拍|感知|裁切/],
    ['feat', /特徵|外觀|ReID|編碼|骨幹|網路|分支|損失|模型/]
  ];
  var BYSTEP = ['generic', 'cam', 'track', 'feat', 'fuse', 'st', 'cluster', 'match'];
  function pick(f) {
    if (f[3] && SCN[f[3]]) return f[3];
    var s = f[0] + '　' + (f[1] || '');
    for (var i = 0; i < RULES.length; i++) if (RULES[i][1].test(f[0])) return RULES[i][0];
    for (i = 0; i < RULES.length; i++) if (RULES[i][1].test(s)) return RULES[i][0];
    return BYSTEP[f[2]] || 'generic';
  }

  /* ---------------- 播放器 ---------------- */
  var ours = false, M, frames = [], idx = 0, t0 = 0, playing = false, raf = 0, last = null;
  var DUR = { intro: 4000, key: 6500, step: 3800, x: 7500, o: 9000 };

  function build() {
    M = document.createElement('div');
    M.className = 'fp-modal'; M.hidden = true;
    M.innerHTML = '<div class="fp-box" role="dialog" aria-modal="true" aria-labelledby="fp-title">' +
      '<header><b id="fp-title"></b><button type="button" class="fp-x" aria-label="關閉">✕</button></header>' +
      '<svg class="fp-stage" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="流程動畫"></svg>' +
      '<div class="fp-cap"><span class="fp-sb"></span><div><span class="fp-x-badge" hidden>★ 它和別人不同的地方</span><b class="fp-n"></b><p class="fp-d"></p><p class="fp-m"></p></div></div>' +
      '<div class="fp-ctl"><button type="button" data-a="prev" aria-label="上一步">◀◀</button><button type="button" data-a="play" class="fp-play" aria-label="播放或暫停">❚❚</button><button type="button" data-a="next" aria-label="下一步">▶▶</button><div class="fp-prog"></div></div>' +
      '</div>';
    document.body.appendChild(M);
    M.addEventListener('click', function (e) {
      if (e.target === M || e.target.closest('.fp-x')) return close();
      var b = e.target.closest('[data-a]'); if (b) act(b.getAttribute('data-a'));
      var s = e.target.closest('[data-i]'); if (s) go(+s.getAttribute('data-i'));
    });
    document.addEventListener('keydown', function (e) {
      if (M.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === ' ') { e.preventDefault(); act('play'); }
      else if (e.key === 'ArrowRight') act('next');
      else if (e.key === 'ArrowLeft') act('prev');
    });
  }
  function act(a) {
    if (a === 'play') { if (!playing && idx === frames.length - 1 && elapsed() >= dur(frames[idx])) go(0); else setPlay(!playing); }
    else if (a === 'next') go(Math.min(frames.length - 1, idx + 1));
    else if (a === 'prev') go(Math.max(0, idx - 1));
  }
  function dur(f) { return f.o ? DUR.o : f.x ? DUR.x : DUR[f.type] || DUR.step; }
  function elapsed() { return playing ? performance.now() - t0 : (last || 0); }
  function setPlay(p) {
    if (p && !playing) t0 = performance.now() - (last || 0);
    if (!p && playing) last = performance.now() - t0;
    playing = p;
    M.querySelector('.fp-play').textContent = p ? '❚❚' : '▶';
    if (p) loop();
  }
  function go(i) { idx = i; last = 0; t0 = performance.now(); caption2(); render(playing ? 0 : 1); }
  function caption2() {
    var f = frames[idx], c = SC[f.s || 0];
    M.querySelector('.fp-sb').textContent = f.type === 'step' ? NUM[f.s] : f.type === 'intro' ? '開始' : '重點';
    M.querySelector('.fp-sb').style.cssText = 'color:' + (f.type === 'step' ? c : '#9a7b12') + ';border-color:' + (f.type === 'step' ? c : '#9a7b12');
    M.querySelector('.fp-n').textContent = f.type === 'step' ? f.n : f.type === 'intro' ? f.title : f.label;
    M.querySelector('.fp-d').textContent = f.type === 'step' ? (f.d || '') : f.type === 'intro' ? f.sub : f.text;
    M.querySelector('.fp-m').textContent = f.type !== 'step' ? '' : ours ? (f.s ? '我們的第 ' + f.s + ' 步：' + STEPN[f.s] : '整體流程') : '對應我們的' + (f.s ? '第 ' + f.s + ' 步：' + STEPN[f.s] : '：' + STEPN[0]) + (f.x ? '' : '　（各系統做法相近，快速帶過）');
    M.querySelector('.fp-x-badge').hidden = !f.x;
    M.querySelector('.fp-cap').classList.toggle('xs', !!f.x);
    M.querySelector('.fp-prog').innerHTML = frames.map(function (g, k) {
      var col = g.type === 'step' ? SC[g.s] : '#9a7b12';
      return '<button type="button" data-i="' + k + '" class="' + (k === idx ? 'on' : k < idx ? 'done' : '') + (g.x ? ' x' : '') + '" style="--c:' + col + '" title="' + esc(g.type === 'step' ? g.n : g.type === 'intro' ? '開始' : '重點') + '"><i></i></button>';
    }).join('');
  }
  function render(t) {
    var f = frames[idx];
    var svg = f.type === 'intro' ? SCN.intro(t, f) : f.type === 'key' ? SCN.key(t, f) : (SCN[f.kind] || SCN.generic)(t, f, idx);
    M.querySelector('.fp-stage').innerHTML = '<rect width="' + W + '" height="' + H + '" fill="' + PAPER + '"/>' + svg;
    var bar = M.querySelector('.fp-prog .on i'); if (bar) bar.style.width = (cl(t) * 100) + '%';
  }
  function loop() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function step() {
      if (!playing || M.hidden) return;
      var e = performance.now() - t0, d = dur(frames[idx]);
      render(global.U && U.reduceMotion ? 1 : Math.min(1, e / (d * 0.8)));
      if (e >= d) {
        if (idx < frames.length - 1) { go(idx + 1); } else { last = d; setPlay(false); return; }
      }
      raf = requestAnimationFrame(step);
    });
  }
  function open(spec) {
    if (!M) build();
    ours = !!spec.ours;
    frames = [{ type: 'intro', title: spec.title, sub: spec.sub, steps: spec.flow }]
      .concat(spec.flow.map(function (f) { var k = pick(f); return { type: 'step', n: f[0], d: f[1], s: f[2], kind: k, x: /^x_/.test(k), o: /^o_/.test(k), p: f[4] }; }))
      .concat([{ type: 'key', label: spec.keyLabel, text: spec.key }]);
    M.querySelector('#fp-title').textContent = spec.title;
    M.hidden = false; document.body.classList.add('fp-open');
    playing = false; go(0); setPlay(true);
    M.querySelector('.fp-play').focus();
  }
  function close() { setPlay(false); M.hidden = true; document.body.classList.remove('fp-open'); }

  global.FlowPlay = { open: open, pick: pick, SCN: SCN, kit: { W: W, H: H, SC: SC, IDC: IDC, NAMES: NAMES, INK: INK, INK3: INK3, OLIVE: OLIVE, SKIN: SKIN, PAPER: PAPER, cl: cl, ease: ease, seg: seg, lerp: lerp, rnd: rnd, op: op, T: T, R: R, Ln: Ln, Ci: Ci, arrow: arrow, person: person, camera: camera, bars: bars, net: net, db: db, thumb: thumb, wrap: wrap, caption: caption, panel: panel, star: star, chip: chip, folder: folder, faceIcon: faceIcon, curve: curve } };
})(window);
