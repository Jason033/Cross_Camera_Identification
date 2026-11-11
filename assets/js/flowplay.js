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
  SCN.card = function (t) {
    var g = R(0, 240, W, 4, { f: '#dde2da', rx: 0 }) + R(300, 120, 12, 120, { f: '#6f7a71' }) + R(370, 120, 12, 120, { f: '#6f7a71' }) + R(286, 150, 18, 26, { f: '#3a423c', rx: 2 });
    var walk = t < 0.4 ? lerp(80, 270, t / 0.4) : t < 0.58 ? 270 : lerp(270, 560, (t - 0.58) / 0.42);
    var swipe = seg(t, 0.4, 0.5) * (1 - seg(t, 0.55, 0.6));
    g += Ci(295, 163, 22, { f: '#1baf7a', op: swipe * 0.5 }) + person(walk, 238, 1.8, t < 0.4 || t > 0.58 ? t * 26 : 0, { mark: IDC[0] });
    var tag = seg(t, 0.48, 0.58);
    g += '<g' + op(tag) + '>' + R(walk - 52, 120, 104, 26, { f: '#fff', s: '#4f5c30', sw: 1.5 }) + T(walk, 138, '卡號 1023　王大明', { size: 11, w: 1 }) + '</g>';
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
      g += '<g' + op(o) + '>' + R(x + 4, 190, w - 8, 56, { f: '#fff', s: c, sw: 2 }) + T(x + w / 2, 212, NUM[s[2]], { size: s[2] ? 18 : 11, c: c, w: 1 }) + T(x + w / 2, 236, s[0].length > 7 ? s[0].slice(0, 7) + '…' : s[0], { size: 11 }) + '</g>';
      if (k < n - 1) g += arrow(x + w - 4, 218, x + w + 4, 218, INK3, { op: o });
    });
    return g + caption(320, 280, '圓圈數字＝對應我們的第幾步', { op: seg(t, 0.6, 0.8) });
  };
  SCN.key = function (t, f) {
    var g = '<g' + op(seg(t, 0, 0.2)) + '><path d="M320,40 a30,30 0 0,1 18,54 v12 h-36 v-12 a30,30 0 0,1 18,-54Z" fill="#f2c94c" stroke="#9a7b12" stroke-width="2"/>' + R(304, 110, 32, 6, { f: '#9a7b12' }) + '</g>';
    g += T(320, 146, f.label, { size: 14, w: 1, c: '#9a7b12', op: seg(t, 0.1, 0.25) });
    return g + wrap(f.text, 30).slice(0, 5).map(function (l, k) { return T(320, 178 + k * 24, l, { size: 15, op: seg(t, 0.2 + k * 0.08, 0.3 + k * 0.08) }); }).join('');
  };

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
  var M, frames = [], idx = 0, t0 = 0, playing = false, raf = 0, last = null;
  var DUR = { intro: 4000, key: 6500, step: 5200 };

  function build() {
    M = document.createElement('div');
    M.className = 'fp-modal'; M.hidden = true;
    M.innerHTML = '<div class="fp-box" role="dialog" aria-modal="true" aria-labelledby="fp-title">' +
      '<header><b id="fp-title"></b><button type="button" class="fp-x" aria-label="關閉">✕</button></header>' +
      '<svg class="fp-stage" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="流程動畫"></svg>' +
      '<div class="fp-cap"><span class="fp-sb"></span><div><b class="fp-n"></b><p class="fp-d"></p><p class="fp-m"></p></div></div>' +
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
  function dur(f) { return DUR[f.type] || DUR.step; }
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
    M.querySelector('.fp-m').textContent = f.type === 'step' ? '對應我們的' + (f.s ? '第 ' + f.s + ' 步：' + STEPN[f.s] : '：' + STEPN[0]) : '';
    M.querySelector('.fp-prog').innerHTML = frames.map(function (g, k) {
      var col = g.type === 'step' ? SC[g.s] : '#9a7b12';
      return '<button type="button" data-i="' + k + '" class="' + (k === idx ? 'on' : k < idx ? 'done' : '') + '" style="--c:' + col + '" title="' + esc(g.type === 'step' ? g.n : g.type === 'intro' ? '開始' : '重點') + '"><i></i></button>';
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
    frames = [{ type: 'intro', title: spec.title, sub: spec.sub, steps: spec.flow }]
      .concat(spec.flow.map(function (f) { return { type: 'step', n: f[0], d: f[1], s: f[2], kind: pick(f) }; }))
      .concat([{ type: 'key', label: spec.keyLabel, text: spec.key }]);
    M.querySelector('#fp-title').textContent = spec.title;
    M.hidden = false; document.body.classList.add('fp-open');
    playing = false; go(0); setPlay(true);
    M.querySelector('.fp-play').focus();
  }
  function close() { setPlay(false); M.hidden = true; document.body.classList.remove('fp-open'); }

  global.FlowPlay = { open: open, pick: pick };
})(window);
