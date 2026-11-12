/* ourplay.js — 第 4 章「我們的做法」的動畫說明
   以 flowplay.js 的播放器與繪圖工具，畫出我們系統每一步的具體設定（數字與 steps.js 的起始設定一致）。
   場景名稱以 o_ 開頭；播放時每幕約 9 秒。圖中數字除了設定值以外皆為示意。 */
(function (global) {
  'use strict';
  if (!global.FlowPlay) return;
  var K = FlowPlay.kit, S = FlowPlay.SCN;
  var W = K.W, IDC = K.IDC, SC = K.SC, INK = K.INK, INK3 = K.INK3, OLIVE = K.OLIVE, PAPER = K.PAPER;
  var T = K.T, R = K.R, Ln = K.Ln, Ci = K.Ci, arrow = K.arrow, person = K.person, camera = K.camera, bars = K.bars, net = K.net, db = K.db,
    thumb = K.thumb, caption = K.caption, panel = K.panel, star = K.star, chip = K.chip, faceIcon = K.faceIcon, seg = K.seg, ease = K.ease, lerp = K.lerp, rnd = K.rnd, op = K.op;
  var GOOD = '#0c8a0c', BAD = '#c93434', WARN = '#b97e00';
  function g_(o, s) { return '<g' + op(o) + '>' + s + '</g>'; }
  function tick(x, y, h, c, w, o) { return Ln(x, y, x, y + h, c, w || 2, { op: o }); }
  function gauss(x, m, s) { return Math.exp(-(x - m) * (x - m) / (2 * s * s)); }
  function path(fn, x0, x1, n) { var p = []; for (var i = 0; i <= n; i++) { var x = x0 + (x1 - x0) * i / n; p.push(x.toFixed(1) + ',' + fn(x).toFixed(1)); } return p.join(' '); }
  function tree(x, y, r) { return Ci(x, y, r, { f: '#7fa36a' }) + R(x - 5, y + r - 6, 10, 26, { f: '#7a5a3a', rx: 1 }); }
  function gate(x) { return R(x, 120, 12, 120, { f: '#6f7a71' }) + R(x + 70, 120, 12, 120, { f: '#6f7a71' }) + R(x - 14, 150, 18, 26, { f: '#3a423c', rx: 2 }); }

  /* ======================= 整體 ======================= */
  S.o_day = function (t) {
    var g = T(150, 40, '白天：10 台路邊攝影機照常錄影', { size: 13, w: 1 });
    for (var i = 0; i < 4; i++) { g += camera(60 + i * 62, 80, 0.9) + Ci(72 + i * 62, 68, 3.5, { f: BAD, op: (Math.floor(t * 8) % 2) ? 1 : 0.25 }); }
    var hr = Math.floor(lerp(6, 22, seg(t, 0, 0.55)));
    g += R(40, 120, 220, 54, { f: '#fff', s: '#c5ccc2' }) + T(150, 155, (hr < 10 ? '0' : '') + hr + ':00', { size: 24, w: 1 });
    g += T(150, 200, '錄影存在錄影主機', { size: 12, c: INK3 }) + R(40, 210, 220, 14, { f: '#fff', s: '#c5ccc2' }) + R(40, 210, 220 * seg(t, 0, 0.55), 14, { f: '#2a78d6', op: 0.6 });
    g += g_(seg(t, 0.55, 0.65), T(470, 40, '☾ 夜間批次處理', { size: 14, w: 1, c: '#9a7b12' }) + arrow(270, 150, 320, 150));
    var names = ['偵測', '追蹤', '特徵', '融合', '時空', '分群', '名冊'];
    for (i = 0; i < 7; i++) {
      var on = seg(t, 0.62 + i * 0.05, 0.66 + i * 0.05), y = 58 + i * 30;
      g += R(330, y, 280, 24, { f: on > 0.5 ? '#fff' : PAPER, s: on > 0.5 ? SC[i + 1] : '#dde2da', sw: on > 0.5 ? 2 : 1 }) + T(346, y + 17, '①②③④⑤⑥⑦'[i], { size: 15, c: SC[i + 1], w: 1 }) + T(368, y + 17, names[i], { size: 13, a: 'start', op: 0.5 + on * 0.5 });
      if (on > 0.5) g += R(440, y + 8, 160 * on, 8, { f: SC[i + 1], op: 0.5 });
    }
    return g + caption(320, 292, '白天錄影；晚上一次跑完七步。離線處理能看完整段影片，比邊錄邊算準');
  };
  S.o_output = function (t) {
    var g = R(30, 30, 380, 240, { f: '#fff', s: '#dde2da' });
    var B = [['營門', 70, 230], ['連部', 170, 90], ['餐廳', 330, 80], ['操場', 360, 220], ['寢室', 200, 230]];
    B.forEach(function (b) { g += R(b[1] - 28, b[2] - 14, 56, 28, { f: PAPER, s: '#c5ccc2' }) + T(b[1], b[2] + 5, b[0], { size: 11, c: INK3 }); });
    var P = [[[70, 230], [170, 90], [330, 80], [360, 220]], [[70, 230], [200, 230], [330, 80]], [[200, 230], [360, 220]]];
    P.forEach(function (pts, k) {
      var u = seg(t, k * 0.15, k * 0.15 + 0.5), n = pts.length - 1, m = u * n, j = Math.min(n - 1, Math.floor(m)), f = m - j, d = '';
      for (var q = 0; q <= j; q++) d += (q ? ' L' : 'M') + (pts[q][0] + k * 4) + ',' + (pts[q][1] + k * 4);
      var x = lerp(pts[j][0], pts[j + 1][0], f) + k * 4, y = lerp(pts[j][1], pts[j + 1][1], f) + k * 4;
      g += '<path d="' + d + ' L' + x + ',' + y + '" fill="none" stroke="' + IDC[k] + '" stroke-width="3"' + (k === 2 ? ' stroke-dasharray="6 4"' : '') + '/>' + Ci(x, y, 6, { f: IDC[k] });
    });
    var L = [['王大明', '營門 07:02 → 連部 07:10 → 餐廳 11:58 → 操場 15:30', IDC[0]], ['李志強', '營門 07:05 → 寢室 07:20 → 餐廳 12:03', IDC[1]], ['未知-#3', '寢室 13:10 → 操場 13:25（低信心，待覆核）', IDC[2]]];
    L.forEach(function (l, k) { var o = seg(t, 0.5 + k * 0.12, 0.6 + k * 0.12); g += g_(o, chip(430, 44 + k * 80, 70, l[2], l[0]) + K.wrap(l[1], 14).slice(0, 3).map(function (s, q) { return T(430, 76 + k * 80 + q * 16, s, { size: 11, a: 'start', c: INK3 }); }).join('')); });
    return g + caption(320, 292, '交出：每個人何時、經過哪些地點；虛線是低信心的連結（示意）');
  };

  /* ======================= ① 攝影機與偵測 ======================= */
  S.o1_resize = function (t) {
    var g = R(30, 60, 300, 169, { f: '#fff', s: '#c5ccc2' }) + T(180, 52, '原始畫面 1920×1080', { size: 12, c: INK3 });
    [[110, 200, 1.3], [200, 190, 1.1], [280, 170, 0.7]].forEach(function (p, i) { g += person(p[0], p[1], p[2], 0.5 + i, { mark: IDC[i] }); });
    g += R(262, 120, 12, 60, { f: '#9aa39a', rx: 1 });
    g += arrow(340, 145, 380, 145, INK3, { op: seg(t, 0.1, 0.2) }) + T(360, 135, '縮放', { size: 11, c: INK3, op: seg(t, 0.1, 0.2) });
    var o = seg(t, 0.15, 0.3);
    g += g_(o, R(390, 40, 210, 210, { f: '#e9ece6', s: '#c5ccc2' }) + R(390, 86, 210, 118, { f: '#fff' }) + T(495, 32, 'YOLOX-S 輸入 640×640', { size: 12, c: INK3 }));
    [[447, 191, 0.9, 0.93], [507, 185, 0.77, 0.88], [561, 172, 0.5, 0.18]].forEach(function (p, i) {
      g += g_(o, person(p[0], p[1], p[2], 0.5 + i, { mark: IDC[i] }));
      var b = seg(t, 0.35 + i * 0.12, 0.45 + i * 0.12), low = p[3] < 0.5;
      g += g_(b, R(p[0] - 14 * p[2], p[1] - 54 * p[2], 28 * p[2], 58 * p[2], { s: low ? WARN : IDC[i], sw: 2, dash: low ? '3 2' : null }) + T(p[0], p[1] - 58 * p[2], p[3].toFixed(2), { size: 10, c: low ? WARN : IDC[i], w: 1 }));
    });
    g += R(548, 150, 7, 36, { f: '#9aa39a', rx: 1 });
    g += g_(seg(t, 0.75, 0.85), T(495, 272, '被擋住的人分數低（0.18），也照樣輸出', { size: 12, c: WARN, w: 1 }));
    return g + caption(180, 272, '信心 ≥ 0.1 的框都輸出', {});
  };
  S.o1_fps = function (t) {
    var g = T(40, 50, '攝影機 30 fps', { size: 12, a: 'start', c: INK3 }), n = 60, k = Math.round(n * seg(t, 0.05, 0.6));
    for (var i = 0; i < n; i++) { var keep = i % 6 === 0; g += tick(40 + i * 9.4, 62, keep ? 34 : 22, keep && i < k ? '#2a78d6' : '#c5ccc2', keep && i < k ? 3 : 1.4); }
    g += T(40, 116, '每 6 幀取 1 幀 → 5 fps 送去偵測與追蹤', { size: 13, a: 'start', w: 1, c: '#2a78d6', op: seg(t, 0.2, 0.35) });
    g += T(600, 116, '人每 0.2 秒只走約 30 cm，追蹤仍穩', { size: 11, a: 'end', c: INK3, op: seg(t, 0.3, 0.45) });
    var o = seg(t, 0.55, 0.7);
    g += g_(o, T(40, 160, '連續 10 秒沒人 → 降到 1 fps', { size: 13, a: 'start', w: 1, c: OLIVE }));
    for (i = 0; i < 20; i++) g += g_(o, tick(40 + i * 28, 172, i % 5 === 0 ? 30 : 16, i % 5 === 0 ? OLIVE : '#dde2da', i % 5 === 0 ? 3 : 1));
    g += g_(seg(t, 0.75, 0.9), R(40, 230, 560 * 0.2, 18, { f: '#2a78d6', op: 0.75 }) + R(40, 230, 560, 18, { s: '#c5ccc2' }) + T(40 + 560 * 0.2 + 8, 244, '偵測算力只需約 20%（營區多數時段畫面沒人，實際更省）', { size: 12, a: 'start' }));
    return g + caption(320, 288, '偵測、追蹤用低幀率；步態需要的連續畫面，到第 3 步再回原始影片取');
  };
  S.o1_minh = function (t) {
    var g = camera(60, 60, 1.3) + '<path d="M80,70 L630,30 L630,280 L80,95Z" fill="#2a78d6" fill-opacity=".05"/>' + Ln(100, 260, 620, 210, '#dde2da', 3);
    var P = [[200, 255, 3.4, '180 像素', GOOD], [380, 236, 1.4, '75 像素', GOOD], [560, 214, 0.55, '28 像素', BAD]];
    P.forEach(function (p, i) {
      var o = seg(t, i * 0.15, i * 0.15 + 0.15);
      g += g_(o, person(p[0], p[1], p[2], 0.4 + i, { mark: IDC[i] }) + Ln(p[0] + 30 * p[2] + 8, p[1], p[0] + 30 * p[2] + 8, p[1] - 52 * p[2], p[4], 2) + T(p[0] + 30 * p[2] + 14, p[1] - 22 * p[2], p[3], { size: 12, a: 'start', c: p[4], w: 1 }));
    });
    var x = seg(t, 0.55, 0.7);
    g += g_(x, T(560, 160, '✗', { size: 34, c: BAD, w: 1 }) + T(560, 130, '人高 < 40 像素 → 不送後續', { size: 12, c: BAD, w: 1 }));
    return g + caption(320, 288, '太小的人形任何線索都抽不出來，送進去只會增加錯誤');
  };

  /* ======================= ② 追蹤成片段 ======================= */
  S.o2_bytetrack = function (t) {
    var g = panel(30, 30, 360, 230, '目前這一幀') + R(286, 110, 40, 130, { f: '#b9c0b5', rx: 2 }) + T(306, 104, '牆', { size: 11, c: INK3 });
    var P = [[100, 230, 0.92], [190, 230, 0.85], [300, 230, 0.31]];
    P.forEach(function (p, i) {
      g += person(p[0], p[1], 1.9, 0.5 + i, { mark: IDC[i] });
      g += R(p[0] - 24, p[1] - 110, 48, 114, { s: '#9aa39a', sw: 1.5, dash: '5 4', op: seg(t, 0.05, 0.2) });
      var hi = p[2] >= 0.5, o = hi ? seg(t, 0.25 + i * 0.08, 0.35 + i * 0.08) : seg(t, 0.6, 0.72);
      g += g_(o, R(p[0] - 20, p[1] - 104, 40, 108, { s: hi ? IDC[i] : WARN, sw: 2.5 }) + T(p[0], p[1] - 110, (hi ? '高分 ' : '低分 ') + p[2], { size: 11, c: hi ? IDC[i] : WARN, w: 1 }));
    });
    g += T(530, 60, '虛線＝卡爾曼濾波預測的位置', { size: 12, c: INK3, op: seg(t, 0.05, 0.2) });
    g += g_(seg(t, 0.25, 0.4), R(420, 80, 200, 64, { f: '#fff', s: '#2a78d6' }) + T(520, 104, '第 1 輪', { size: 13, w: 1, c: '#2a78d6' }) + T(520, 126, '高分框（≥ 0.5）先配對', { size: 12 }));
    g += g_(seg(t, 0.55, 0.7), R(420, 160, 200, 74, { f: '#fff8e1', s: WARN }) + T(520, 184, '第 2 輪', { size: 13, w: 1, c: WARN }) + T(520, 204, '剩下的軌跡配低分框（0.1–0.5）', { size: 12 }) + T(520, 222, '→ 撿回被擋住的人', { size: 12, c: GOOD, w: 1 }));
    return g + caption(320, 288, 'ByteTrack：一般追蹤器會丟掉低分框，被擋住的人就斷掉');
  };
  S.o2_buffer = function (t) {
    var g = R(0, 230, W, 4, { f: '#dde2da', rx: 0 }), x = lerp(80, 560, t), hid = x > 270 && x < 390;
    g += person(x, 228, 1.7, t * 26, { mark: IDC[0], op: hid ? 0 : 1 });
    if (hid) g += R(x - 18, 132, 36, 98, { s: '#9aa39a', dash: '5 4' }) + T(x, 120, '保留中 ' + (2 - (x - 270) / 120 * 1.6).toFixed(1) + ' 秒', { size: 12, c: INK3, w: 1 });
    else g += chip(x - 26, 112, 52, IDC[0], 'ID 1');
    g += tree(330, 170, 62);
    if (x >= 390) g += T(x, 100, '接回同一個 ID ✓', { size: 12, c: GOOD, w: 1 });
    g += g_(seg(t, 0.85, 0.95), T(320, 268, '超過 2 秒才出現 → 開新片段（之後由第 6 步分群接回）', { size: 13, w: 1 }));
    return g + caption(320, 290, '軌跡保留 2 秒（5 fps 下 10 幀）：短暫遮擋接回；太長會把不同人接在一起');
  };
  S.o2_purify = function (t) {
    var g = T(40, 44, '一段片段裡，兩人交錯時被接成同一條', { size: 13, a: 'start', w: 1 });
    var cut = 330, done = seg(t, 0.6, 0.7);
    g += R(40, 60, cut - 40 - done * 6, 22, { f: done > 0.5 ? IDC[0] : '#9aa39a' }) + R(cut + done * 6, 60, 560 - cut, 22, { f: done > 0.5 ? IDC[1] : '#9aa39a' });
    for (var i = 0; i < 12; i++) { var x = 50 + i * 46; g += thumb(x, 92, 30, 40, i < 6 ? 0 : 1, { op: 0.9 }); }
    var hy = function (x) { return x < cut ? 190 : 214; };
    g += T(36, 180, '身高中位數', { size: 11, a: 'end', c: INK3 }) + '<polyline points="' + path(function (x) { return hy(x) + Math.sin(x / 9) * 2; }, 40, 600, 80) + '" fill="none" stroke="#9a7b12" stroke-width="2"/>' + T(160, 182, '174 cm', { size: 11, c: '#9a7b12' }) + T(480, 230, '166 cm', { size: 11, c: '#9a7b12' });
    g += T(36, 258, '外觀距離', { size: 11, a: 'end', c: INK3 }) + '<polyline points="' + path(function (x) { return 262 - 26 * Math.exp(-(x - cut) * (x - cut) / 300) - Math.sin(x / 7) * 2; }, 40, 600, 100) + '" fill="none" stroke="#2a78d6" stroke-width="2"/>';
    var wx = lerp(40, 520, seg(t, 0.05, 0.55));
    g += R(wx, 150, 80, 120, { s: OLIVE, sw: 2, dash: '4 3', op: 1 - done }) + T(wx + 40, 146, '前窗｜後窗', { size: 10, c: OLIVE, op: 1 - done });
    g += g_(seg(t, 0.5, 0.6), Ln(cut, 56, cut, 270, BAD, 2.5, { dash: '6 4' }) + T(cut + 8, 150, '突變 → 切開', { size: 12, a: 'start', c: BAD, w: 1 }));
    return g + caption(320, 292, '前後兩窗比身高、外觀、位置；任一項突變就切開——寧可多切，分群會再接回');
  };

  /* ======================= ③ 身分線索特徵 ======================= */
  S.o3_quality = function (t) {
    var r = rnd(21), q = [], g = T(40, 40, '片段 #213 的 16 幀（每幀依框大小、遮擋、模糊打品質分數）', { size: 12, a: 'start', c: INK3 });
    for (var i = 0; i < 16; i++) q.push(Math.round(30 + r() * 68));
    var top = q.slice().sort(function (a, b) { return b - a; })[7];
    q.forEach(function (v, i) {
      var x = 40 + i * 35, pick = v >= top && t > 0.45, o = seg(t, i * 0.015, i * 0.015 + 0.1);
      g += g_(o, R(x, 52, 30, 44, { f: '#fff', s: pick ? GOOD : '#c5ccc2', sw: pick ? 2.5 : 1 }) + person(x + 15, 92, 0.72, i, { mark: IDC[0], op: v < 50 ? 0.4 : 1 }) + R(x + 3, 102, 24 * v / 100, 6, { f: pick ? GOOD : '#9aa39a' }));
    });
    g += g_(seg(t, 0.45, 0.55), T(320, 132, '取品質最好的 8 幀', { size: 13, w: 1, c: GOOD }));
    g += g_(seg(t, 0.55, 0.65), arrow(320, 140, 320, 166) + net(220, 200, 200, 60, '#2a78d6', 'SOLIDER Swin-S（256×128）'));
    g += g_(seg(t, 0.7, 0.8), arrow(424, 200, 452, 200) + bars(460, 230, 10, 10, 60, '#2a78d6', 1, 3) + T(520, 252, '品質加權平均', { size: 11, c: INK3 }));
    return g + caption(320, 290, '逐幀全算太慢；模糊、被擋住的幀少算或不算');
  };
  S.o3_gaitwin = function (t) {
    var g = T(40, 50, '片段（5 fps）', { size: 12, a: 'start', c: INK3 });
    for (var i = 0; i < 24; i++) g += tick(40 + i * 23, 60, 26, i >= 8 && i < 14 ? '#d55181' : '#c5ccc2', i >= 8 && i < 14 ? 3 : 1.5);
    g += R(40 + 8 * 23 - 4, 56, 6 * 23, 34, { s: '#d55181', sw: 1.5, dash: '4 3', op: seg(t, 0.1, 0.2) }) + T(40 + 11 * 23, 106, '品質夠的一段（行走 2 秒）', { size: 11, c: '#d55181', op: seg(t, 0.1, 0.2) });
    g += g_(seg(t, 0.25, 0.35), arrow(290, 112, 290, 140, '#d55181') + T(300, 130, '回到原始影片', { size: 12, a: 'start', c: '#d55181', w: 1 }));
    var k = Math.round(30 * seg(t, 0.35, 0.65));
    for (i = 0; i < 30; i++) g += tick(150 + i * 9.5, 150, 22, i < k ? '#d55181' : '#eee', 2);
    g += T(40, 166, '連續 30 幀（≥ 15 fps）', { size: 12, a: 'start', c: INK3, op: seg(t, 0.35, 0.45) });
    for (i = 0; i < 6; i++) g += person(170 + i * 50, 250, 1.1, i * 1.05, { sil: 1, op: seg(t, 0.6 + i * 0.03, 0.65 + i * 0.03) });
    g += g_(seg(t, 0.75, 0.85), arrow(470, 220, 500, 220) + net(505, 220, 100, 60, '#d55181', 'DeepGaitV2'));
    return g + caption(320, 292, '不到 1 個步態週期（約 1 秒連續行走）的片段不算步態');
  };
  S.o3_gates = function (t) {
    var g = thumb(40, 60, 70, 100, 0) + T(75, 182, '片段 #213', { size: 12, w: 1 }) + T(75, 200, '路邊、中距離', { size: 11, c: INK3 }) + T(75, 216, '連續走 3 秒', { size: 11, c: INK3 });
    var C = [['外觀（同日）', '人框夠大、沒被擋住', 1, '#2a78d6'], ['換裝特徵 CAL', '同上', 1, '#2a78d6'], ['步態', '連續行走 ≥ 1 個步態週期', 1, '#d55181'], ['臉', '兩眼間距 ≥ 10 像素、品質夠', 0, '#6250d6', '（6 像素）'], ['身高', '全身可見、腳點清楚', 1, '#9a7b12'], ['名牌', '人框高 ≥ 300 像素（近距點位）', 0, '#4f5c30', '（120 像素）']];
    C.forEach(function (c, i) {
      var y = 46 + i * 38, o = seg(t, 0.08 + i * 0.1, 0.16 + i * 0.1);
      g += T(150, y + 16, c[0], { size: 13, a: 'start', w: 1, c: c[3] }) + T(270, y + 16, c[1], { size: 12, a: 'start', c: INK3 });
      g += g_(o, Ci(500, y + 11, 10, { f: c[2] ? GOOD : '#c5ccc2' }) + T(516, y + 16, c[2] ? '採用' : '不用' + c[4], { size: 12, a: 'start', c: c[2] ? GOOD : BAD, w: 1 }));
    });
    return g + T(320, 288, '這段片段有 4 條線索可用；看不到的線索不硬算', { size: 14, w: 1, op: seg(t, 0.75, 0.9) });
  };
  S.o3_cal = function (t) {
    var g = panel(40, 40, 150, 200, '08:00　迷彩服') + person(115, 230, 2.6, 0.3, { mark: IDC[0] }) + panel(450, 40, 150, 200, '16:30　運動服') + person(525, 230, 2.6, 0.3, { mark: IDC[0], body: '#3b5b8c' });
    g += g_(seg(t, 0.1, 0.25), Ln(196, 110, 444, 110, BAD, 2.5, { dash: '7 5' }) + T(320, 100, '外觀 SOLIDER：0.22（像不同人）', { size: 13, c: BAD, w: 1 }));
    g += g_(seg(t, 0.35, 0.5), Ln(196, 150, 444, 150, GOOD, 3) + T(320, 140, '換裝 CAL：0.74', { size: 13, c: GOOD, w: 1 }));
    g += g_(seg(t, 0.5, 0.6), Ln(196, 190, 444, 190, GOOD, 3) + T(320, 180, '步態 0.69　身高差 1 cm', { size: 13, c: GOOD, w: 1 }));
    g += g_(seg(t, 0.7, 0.85), T(320, 268, '外觀只在同一天、同一套服裝內使用；換裝靠 CAL、步態、臉、身高', { size: 13, w: 1 }));
    return g + caption(320, 290, 'CAL 訓練時懲罰「能分出同一人不同衣服」的特徵；需要營區自收的換裝資料');
  };

  /* ======================= ④ 融合成證據 ======================= */
  S.o4_kde = function (t) {
    var X0 = 60, X1 = 400, Y0 = 230, sx = function (v) { return X0 + (X1 - X0) * v; };
    var gi = function (x) { return Y0 - 150 * gauss((x - X0) / (X1 - X0), 0.32, 0.11); }, ge = function (x) { return Y0 - 120 * gauss((x - X0) / (X1 - X0), 0.7, 0.12); };
    var g = Ln(X0, Y0, X1, Y0, INK3, 1) + T((X0 + X1) / 2, Y0 + 20, '步態比對分數', { size: 12, c: INK3 });
    g += '<polyline points="' + path(gi, X0, X1, 80) + '" fill="none" stroke="#9aa39a" stroke-width="2.5"/>' + T(sx(0.22), 72, '不同人時的分數', { size: 11, c: INK3 });
    g += '<polyline points="' + path(ge, X0, X1, 80) + '" fill="none" stroke="' + GOOD + '" stroke-width="2.5"/>' + T(sx(0.8), 100, '同一人時的分數', { size: 11, c: GOOD });
    var s = lerp(0.35, 0.62, ease(seg(t, 0.2, 0.6))), x = sx(s), hG = Y0 - ge(x), hI = Y0 - gi(x), lr = (hG / 120) / Math.max(0.02, hI / 150) * (150 / 120) * (0.11 / 0.12);
    g += g_(seg(t, 0.15, 0.25), Ln(x, 60, x, Y0, '#d55181', 2) + Ci(x, ge(x), 5, { f: GOOD }) + Ci(x, gi(x), 5, { f: '#9aa39a' }) + T(x, 54, '這次 ' + s.toFixed(2), { size: 12, c: '#d55181', w: 1 }));
    g += g_(seg(t, 0.4, 0.55), R(420, 70, 190, 130, { f: '#fff', s: '#c5ccc2' }) + T(515, 96, '似然比 = 綠點高度 ÷ 灰點高度', { size: 11, c: INK3 }) + T(515, 128, '= ' + lr.toFixed(1), { size: 20, w: 1 }) + T(515, 160, '證據 = log(似然比) = ' + (Math.log(lr) >= 0 ? '+' : '') + Math.log(lr).toFixed(1), { size: 13, w: 1, c: Math.log(lr) >= 0 ? GOOD : BAD }) + T(515, 184, '正：支持同一人；負：支持不同人', { size: 11, c: INK3 }));
    return g + caption(320, 288, '每條線索各用 ≥ 1,000 對「同人／不同人」分數估兩個分布（核密度估計）');
  };
  S.o4_strata = function (t) {
    var g = '', P = [['品質好（清楚、全身）', 0.3, 0.72, 0.08, '+2.6', GOOD], ['品質差（模糊、遠）', 0.42, 0.58, 0.14, '+0.4', WARN]];
    P.forEach(function (p, i) {
      var x0 = 40 + i * 300, x1 = x0 + 260, Y0 = 210, sx = function (v) { return x0 + (x1 - x0) * v; }, o = seg(t, i * 0.3, i * 0.3 + 0.2);
      var gi = function (x) { return Y0 - 110 * gauss((x - x0) / (x1 - x0), p[1], p[3]); }, ge = function (x) { return Y0 - 110 * gauss((x - x0) / (x1 - x0), p[2], p[3]); };
      g += g_(o, panel(x0 - 10, 40, 280, 200, '') + T(x0 + 130, 62, p[0], { size: 13, w: 1 }) + Ln(x0, Y0, x1, Y0, INK3, 1) + '<polyline points="' + path(gi, x0, x1, 60) + '" fill="none" stroke="#9aa39a" stroke-width="2"/><polyline points="' + path(ge, x0, x1, 60) + '" fill="none" stroke="' + GOOD + '" stroke-width="2"/>' +
        Ln(sx(0.62), 70, sx(0.62), Y0, '#d55181', 2) + T(sx(0.62), Y0 + 18, '同一個分數 0.62', { size: 11, c: '#d55181' }) + T(x0 + 130, 260, '證據 ' + p[4], { size: 18, w: 1, c: p[5] }));
    });
    return g + caption(320, 290, '先分「好／差」兩級各估一組分布：畫面差時兩分布靠在一起，證據自動變小，不必手調權重');
  };
  S.o4_sum = function (t) {
    var E = [['外觀（同日）', 1.2, '#2a78d6'], ['換裝 CAL', 0.8, '#2a78d6'], ['步態', 2.1, '#d55181'], ['臉', 0, '#6250d6', '看不到：0（不加不扣）'], ['身高', -0.4, '#9a7b12'], ['時空（第 5 步）', 1.5, '#eb6834'], ['刷卡', 1, '#4f5c30', '上限 +2']];
    var cx = 320, u = 24, g = Ln(cx, 40, cx, 250, INK3, 1) + Ln(cx + 6 * u, 40, cx + 6 * u, 250, BAD, 1, { dash: '3 3' }) + Ln(cx - 6 * u, 40, cx - 6 * u, 250, BAD, 1, { dash: '3 3' }) + T(cx + 6 * u, 34, '+6 上限', { size: 10, c: BAD }) + T(cx - 6 * u, 34, '−6 下限', { size: 10, c: BAD }), sum = 0;
    E.forEach(function (e, i) {
      var y = 48 + i * 26, o = seg(t, 0.05 + i * 0.07, 0.12 + i * 0.07), w = e[1] * u * o;
      g += T(cx - 6 * u - 8, y + 13, e[0], { size: 12, a: 'end' }) + (e[1] >= 0 ? R(cx, y, w, 18, { f: e[2] }) : R(cx + w, y, -w, 18, { f: e[2] })) + (e[3] ? T(cx + Math.max(w, 0) + 8, y + 13, e[3], { size: 11, a: 'start', c: INK3, op: o }) : T(cx + Math.max(w, 0) + 6, y + 13, (e[1] > 0 ? '+' : '') + e[1], { size: 11, a: 'start', c: INK3, op: o }));
      sum += e[1];
    });
    var f = seg(t, 0.62, 0.8);
    g += g_(f, Ln(40, 236, 600, 236, '#dde2da', 1) + T(cx - 6 * u - 8, 262, '總證據', { size: 13, a: 'end', w: 1 }) + R(cx, 248, sum * u * f, 20, { f: INK }) + T(cx + sum * u + 10, 263, '+' + sum.toFixed(1) + ' 很可能同一人', { size: 13, a: 'start', w: 1, c: GOOD }));
    return g + caption(320, 292, '各線索證據相加；每項限制在 ±6，避免單一線索蓋過其他；刷卡最多 +2，不能蓋過影像');
  };

  /* ======================= ⑤ 時空約束 ======================= */
  S.o5_walk = function (t) {
    var g = R(30, 30, 400, 230, { f: '#fff', s: '#dde2da' }) + '<path d="M90,80 L90,200 L370,200" fill="none" stroke="#dde2da" stroke-width="18" stroke-linecap="round"/>';
    g += camera(70, 60, 1, { label: '' }) + T(110, 64, '攝影機 A', { size: 11, a: 'start', c: INK3 }) + camera(390, 180, 1) + T(390, 222, '攝影機 B', { size: 11, c: INK3 }) + T(230, 222, '最短路線 120 公尺', { size: 12, c: INK3 });
    var u = ease(seg(t, 0.05, 0.4)), x = u < 0.3 ? 90 : lerp(90, 370, (u - 0.3) / 0.7), y = u < 0.3 ? lerp(80, 200, u / 0.3) : 200;
    g += person(x, y + 8, 0.8, t * 30, { mark: IDC[0] });
    g += R(450, 40, 170, 70, { f: PAPER, s: '#c5ccc2' }) + T(535, 64, '最短步行時間', { size: 12, c: INK3 }) + T(535, 94, '120 ÷ 3 m/s = 40 秒', { size: 14, w: 1 });
    g += g_(seg(t, 0.45, 0.55), R(450, 126, 170, 70, { f: '#fff', s: '#c5ccc2' }) + T(535, 150, 'A 離開 10:00:00', { size: 12 }) + T(535, 172, '另一段在 B 出現 10:00:15', { size: 12 }) + T(535, 190, '只差 15 秒', { size: 12, c: BAD, w: 1 }));
    g += g_(seg(t, 0.65, 0.8), T(535, 230, '15 < 40 → 不可能是同一人', { size: 14, w: 1, c: BAD }) + T(535, 252, '（3 m/s 已容許小跑）', { size: 11, c: INK3 }));
    return g + caption(320, 288, '不可能配對只排除、不加分，所以不會引入新的錯誤');
  };
  S.o5_overlap = function (t) {
    var g = panel(30, 30, 270, 150, '攝影機 3（寢室走廊）') + panel(340, 30, 270, 150, '攝影機 7（操場）');
    g += person(165, 168, 1.8, t * 20, { mark: IDC[0] }) + chip(140, 60, 50, '#9aa39a', '片段 a') + person(475, 168, 1.8, t * 20 + 1, { mark: IDC[0] }) + chip(450, 60, 50, '#9aa39a', '片段 b');
    var X0 = 80, sx = function (s) { return X0 + s * 50; };
    g += T(40, 216, 'a', { size: 12, w: 1 }) + R(sx(0), 206, sx(5) - sx(0), 12, { f: '#2a78d6', op: seg(t, 0.1, 0.2) }) + T(40, 240, 'b', { size: 12, w: 1 }) + R(sx(2), 230, sx(8) - sx(2), 12, { f: '#eb6834', op: seg(t, 0.2, 0.3) });
    g += g_(seg(t, 0.35, 0.5), R(sx(2), 200, sx(5) - sx(2), 48, { f: BAD, op: 0.15 }) + T((sx(2) + sx(5)) / 2, 264, '同時 3 秒', { size: 11, c: BAD, w: 1 }));
    for (var s = 0; s <= 10; s += 2) g += T(sx(s), 196, '10:03:' + (10 + s), { size: 9, c: INK3 });
    g += g_(seg(t, 0.55, 0.7), R(450, 200, 170, 60, { f: '#fff', s: BAD, sw: 2 }) + T(535, 224, '重疊 > 1 秒、視野不重疊', { size: 12 }) + T(535, 246, '→ 不可能是同一人', { size: 13, w: 1, c: BAD }));
    return g + caption(320, 290, '容許 1 秒內的重疊，是為了容忍攝影機之間的時鐘誤差（要求同步誤差 < 1 秒）');
  };
  S.o5_hist = function (t) {
    var r = rnd(4), g = T(40, 40, 'A → B：兩週內的出入時間差（每 10 秒一格，自動統計）', { size: 12, a: 'start', c: INK3 });
    var H = [1, 3, 9, 7, 3, 4, 12, 16, 10, 5, 2, 1, 1, 0, 1], k = Math.round(15 * seg(t, 0.05, 0.45));
    for (var i = 0; i < 15; i++) if (i < k) g += R(60 + i * 30, 220 - H[i] * 9, 24, H[i] * 9, { f: '#eb6834', op: 0.6 });
    g += Ln(56, 220, 512, 220, INK3, 1);
    for (i = 0; i <= 14; i += 2) g += T(72 + i * 30, 236, (i * 10) + '', { size: 10, c: INK3 });
    g += T(520, 236, '秒', { size: 10, c: INK3 });
    var smooth = function (x) { var v = (x - 60) / 30; return 220 - 9 * (9 * gauss(v, 2.6, 0.9) + 16 * gauss(v, 7.2, 1.1)); };
    g += g_(seg(t, 0.4, 0.5), '<polyline points="' + path(smooth, 60, 510, 90) + '" fill="none" stroke="' + INK + '" stroke-width="2"/>' + T(150, 120, '小跑', { size: 11, c: INK3 }) + T(290, 64, '步行', { size: 11, c: INK3 }));
    g += g_(seg(t, 0.55, 0.65), Ln(60 + 7.4 * 30, 60, 60 + 7.4 * 30, 220, GOOD, 2, { dash: '4 3' }) + T(530, 110, '新的一對差 74 秒', { size: 12, a: 'start' }) + T(530, 128, '→ 常見，證據 +1.5', { size: 12, a: 'start', c: GOOD, w: 1 }));
    g += g_(seg(t, 0.72, 0.82), T(530, 168, '差 200 秒', { size: 12, a: 'start' }) + T(530, 186, '→ 少見，證據 −0.8', { size: 12, a: 'start', c: BAD, w: 1 }));
    return g + caption(320, 288, '轉移時間可從出入事件自動學（不需校正）；分布允許多峰，先用 2 週資料');
  };

  /* ======================= ⑥ 分群 ======================= */
  S.o6_merge = function (t) {
    var L = [80, 140, 200, 260, 340, 400, 470, 540], lid = [0, 0, 0, 1, 1, 2, 2, 2], g = '', base = 236, tauY = 120;
    L.forEach(function (x, i) { g += R(x - 18, base, 36, 14, { f: IDC[lid[i]], rx: 7 }) + T(x, base + 30, '片段 ' + String.fromCharCode(97 + i), { size: 10, c: INK3 }); });
    var M = [[0, 1, 200, 80, 140], [3, 4, 190, 260, 340], [5, 6, 180, 400, 470], [2, 3, 0, 200, 300, 'block'], [0, 2, 160, 110, 200], [5, 7, 150, 435, 540], [0, 5, 96, 155, 487]];
    M.forEach(function (m, i) {
      var o = seg(t, 0.06 + i * 0.1, 0.14 + i * 0.1);
      if (m[5] === 'block') { g += g_(o * (1 - seg(t, 0.45, 0.5)), Ln(m[3], base - 4, m[4], base - 4, BAD, 2.5, { dash: '5 4' }) + T((m[3] + m[4]) / 2, base - 12, '✗ c 與 d 同時出現 → 不准合併', { size: 11, c: BAD, w: 1 })); return; }
      var above = m[2] < tauY;
      g += g_(above ? o * 0.35 : o, '<path d="M' + m[3] + ',' + base + ' V' + m[2] + ' H' + m[4] + ' V' + base + '" fill="none" stroke="' + (above ? '#9aa39a' : INK) + '" stroke-width="2"' + (above ? ' stroke-dasharray="4 3"' : '') + '/>');
    });
    g += Ln(40, tauY, 600, tauY, '#9a7b12', 1.5, { dash: '6 4' }) + T(600, tauY - 6, '門檻 τ：證據低於它就停止合併', { size: 11, a: 'end', c: '#9a7b12', w: 1 });
    g += T(320, 40, '每一步合併「平均證據最高」的兩群（約束式平均連結凝聚分群）', { size: 13, w: 1 });
    return g + caption(320, 292, '結果：3 群＝3 個人；最後一次合併證據不夠（虛線），不執行');
  };
  S.o6_tau = function (t) {
    var X0 = 70, X1 = 420, Y0 = 230, f = function (x) { var v = (x - X0) / (X1 - X0); return Y0 - 150 * (0.5 + 0.42 * gauss(v, 0.55, 0.2)); };
    var g = Ln(X0, Y0, X1, Y0, INK3, 1) + Ln(X0, Y0, X0, 50, INK3, 1) + T((X0 + X1) / 2, Y0 + 22, '門檻 τ（低 → 高）', { size: 12, c: INK3 }) + T(X0 - 8, 60, 'BCubed F', { size: 11, a: 'end', c: INK3 });
    g += '<polyline points="' + path(f, X0, X1, 80) + '" fill="none" stroke="#9a7b12" stroke-width="2.5"/>';
    var x = lerp(X0, X1, seg(t, 0.05, 0.6)), best = X0 + 0.55 * (X1 - X0);
    g += Ci(x, f(x), 6, { f: '#9a7b12' }) + Ln(x, f(x), x, Y0, '#9a7b12', 1, { dash: '3 3' });
    g += g_(seg(t, 0.6, 0.72), star(best, f(best) - 14, 10, GOOD) + T(best, f(best) - 30, '取最高點', { size: 12, c: GOOD, w: 1 }));
    g += T(130, 120, 'τ 太低：亂併（混人）', { size: 11, c: BAD, op: seg(t, 0.1, 0.2) }) + T(400, 120, 'τ 太高：拆太碎', { size: 11, c: BAD, op: seg(t, 0.45, 0.55) });
    g += g_(seg(t, 0.7, 0.85), R(450, 70, 170, 130, { f: '#fff', s: '#c5ccc2' }) + T(535, 96, '怎麼定 τ', { size: 13, w: 1 }) + T(535, 122, '用一天的人工標註掃描', { size: 12 }) + T(535, 144, '取 BCubed F 最高者', { size: 12 }) + T(535, 172, '季節、服裝會漂移', { size: 11, c: INK3 }) + T(535, 190, '→ 每月重估一次', { size: 11, c: INK3 }));
    return g + caption(320, 290, '門檻不憑感覺訂，用自己的標註資料找');
  };
  S.o6_late = function (t) {
    var C = [[330, 110], [470, 170], [380, 235]], g = R(250, 40, 360, 240, { f: '#fff', s: '#dde2da' }) + R(30, 60, 190, 200, { f: PAPER, s: '#c5ccc2', dash: '5 4' }) + T(125, 80, '先不參加主分群', { size: 12, w: 1 }) + T(125, 98, '（< 1 秒或低信心的片段）', { size: 11, c: INK3 });
    C.forEach(function (c, k) { g += Ci(c[0], c[1], 40, { s: IDC[k], dash: '5 4' }); for (var j = 0; j < 4; j++) g += R(c[0] - 22 + (j % 2) * 26, c[1] - 12 + Math.floor(j / 2) * 16, 18, 10, { f: IDC[k], rx: 5 }); });
    for (var i = 0; i < 3; i++) {
      var u = ease(seg(t, 0.25 + i * 0.15, 0.4 + i * 0.15)), x = lerp(80 + i * 40, C[i][0] + 26, u), y = lerp(140 + i * 30, C[i][1] + 22, u);
      g += R(x - 9, y - 5, 18, 10, { f: u > 0.95 ? IDC[i] : '#9aa39a', rx: 5, s: '#6f7a71', sw: 1, dash: '2 2' });
    }
    g += R(116, 226, 18, 10, { f: '#9aa39a', rx: 5, s: '#6f7a71', dash: '2 2' }) + g_(seg(t, 0.75, 0.85), T(125, 252, '證據不足 → 保留為「未歸群」', { size: 11, c: WARN, w: 1 }));
    return g + caption(320, 296, '低信心片段最後才嘗試併入；併不進去也不丟——系統要報人數');
  };
  S.o6_rates = function (t) {
    var M = [['準確率', '群裡沒混進別人', 0.96, '≥ 95%', GOOD], ['召回率', '同一人的片段都在群裡', 0.92, '先量現況', '#2a78d6'], ['擴散率', '同一人被拆成幾群', 0.13, '越低越好', WARN], ['人數誤差', '系統人數 vs 實際', 0.04, '±10% 以內', '#9a7b12']], g = '';
    M.forEach(function (m, i) {
      var x = 40 + i * 150, o = ease(seg(t, i * 0.12, i * 0.12 + 0.35)), h = 120 * m[2] * o;
      g += panel(x, 40, 130, 220, '') + T(x + 65, 64, m[0], { size: 15, w: 1 }) + T(x + 65, 84, m[1], { size: 10.5, c: INK3 }) + R(x + 40, 230 - h, 50, h, { f: m[4], op: 0.85 }) + T(x + 65, 222 - h, (m[2] * 100 * o).toFixed(0) + '%', { size: 13, w: 1 }) + T(x + 65, 250, '目標 ' + m[3], { size: 11, c: INK3 });
    });
    return g + caption(320, 290, '人數數對不代表分對，所以四個數一起報（E7；數值為示意）');
  };

  /* ======================= ⑦ 比對名冊 ======================= */
  S.o7_gallery = function (t) {
    var r = rnd(8), g = '', sh = seg(t, 0.3, 0.55);
    for (var i = 0; i < 180; i++) { var x = 40 + (i % 18) * 20 + r() * 6, y = 50 + Math.floor(i / 18) * 20 + r() * 6, keep = i % 3 === 0; g += Ci(x, y, 5, { f: keep ? '#4f5c30' : '#9aa39a', op: keep ? 1 : 1 - sh * 0.85 }); }
    g += T(220, 270, sh < 0.5 ? '全營名冊（示意 540 人）' : '只留「當日在營、或當日刷卡進營」：180 人', { size: 13, w: 1 });
    g += g_(seg(t, 0.6, 0.75), R(430, 80, 190, 130, { f: '#fff', s: '#c5ccc2' }) + T(525, 106, '為什麼要縮小', { size: 13, w: 1 }) + T(525, 132, '比的人越多', { size: 12 }) + T(525, 152, '剛好很像的陌生人越多', { size: 12 }) + T(525, 180, '名單小 → 誤認少', { size: 13, w: 1, c: GOOD }));
    return g + caption(320, 292, '借用機場登機門的做法：只和此時可能出現的人比');
  };
  S.o7_margin = function (t) {
    var A = t < 0.5, u = A ? seg(t, 0, 0.45) : seg(t, 0.5, 0.95), sc = A ? [7.1, 3.0, 1.2] : [4.2, 3.5, 1.0], g = '';
    for (var i = 4; i >= 0; i--) g += thumb(40 + i * 8, 70 + i * 8, 50, 70, 0);
    g += T(90, 186, '群內品質最好的 5 段', { size: 11, c: INK3 }) + T(320, 40, A ? '情況一：第一名明顯領先' : '情況二：前兩名很接近', { size: 14, w: 1 });
    ['王大明', '李志強', '陳建宏'].forEach(function (n, k) {
      var y = 70 + k * 50, o = seg(u, k * 0.15, k * 0.15 + 0.2), w = sc[k] * 26 * o;
      g += T(250, y + 18, n, { size: 13, a: 'end', op: o }) + R(260, y + 4, w, 20, { f: k === 0 ? (A ? GOOD : WARN) : '#c5ccc2' }) + T(266 + w, y + 19, '+' + sc[k].toFixed(1), { size: 12, a: 'start', c: INK3, op: o });
    });
    var d = sc[0] - sc[1], f = seg(u, 0.6, 0.8);
    g += g_(f, T(320, 240, '第一名 − 第二名 = ' + d.toFixed(1) + (d >= 2 ? ' ≥ 2' : ' < 2'), { size: 14, w: 1 }) + T(320, 266, d >= 2 ? '→ 接受：王大明' : '→ 標「待確認」交人工', { size: 15, w: 1, c: d >= 2 ? GOOD : WARN }));
    return g + caption(320, 290, '間隔 2 約等於 7 倍似然比；接受門檻依「陌生人誤認率 1%」設定');
  };
  S.o7_card = function (t) {
    var g = gate(300) + R(0, 240, W, 4, { f: '#dde2da', rx: 0 });
    var xa = lerp(120, 520, seg(t, 0.05, 0.55)), xb = lerp(40, 440, seg(t, 0.15, 0.65));
    g += person(xa, 238, 1.6, t * 26, { mark: IDC[0] }) + person(xb, 238, 1.6, t * 26 + 1, { mark: IDC[3] });
    g += Ci(295, 163, 20, { f: GOOD, op: seg(t, 0.18, 0.22) * (1 - seg(t, 0.28, 0.32)) * 0.6 }) + T(295, 110, '刷卡：王大明的卡', { size: 12, w: 1, op: seg(t, 0.2, 0.3) });
    var X0 = 80, sx = function (s) { return X0 + s * 40; };
    g += g_(seg(t, 0.6, 0.7), Ln(X0, 40, sx(12), 40, INK3, 1) + tick(sx(0), 32, 16, GOOD, 3) + T(sx(0), 28, '刷卡', { size: 10, c: GOOD }) + Ci(sx(1), 40, 5, { f: IDC[0] }) + T(sx(1), 62, '+1 秒', { size: 10, c: IDC[0] }) + Ci(sx(6), 40, 5, { f: IDC[3] }) + T(sx(6), 62, '+6 秒', { size: 10, c: IDC[3] }));
    g += g_(seg(t, 0.72, 0.85), R(440, 30, 180, 70, { f: '#fff', s: '#c5ccc2' }) + T(530, 54, '藍：最接近刷卡 → +1', { size: 12, c: IDC[0], w: 1 }) + T(530, 76, '粉：較遠 → +0.3', { size: 12, c: IDC[3] }) + T(530, 94, '（上限 +2，只能加分）', { size: 10, c: INK3 }));
    return g + caption(320, 288, '±2 分鐘內同門口的群才加刷卡證據；多人同時通過時依時間接近程度分配');
  };
  S.o7_tail = function (t) {
    var g = panel(30, 30, 280, 230, '規則一：疑似尾隨') + panel(330, 30, 280, 230, '規則二：疑似代刷');
    var x = lerp(60, 280, seg(t, 0.05, 0.45));
    g += R(150, 100, 8, 100, { f: '#6f7a71' }) + R(200, 100, 8, 100, { f: '#6f7a71' }) + person(x, 200, 1.3, t * 26, { mark: IDC[0] }) + person(x - 34, 200, 1.3, t * 26 + 1, { mark: IDC[2] });
    g += g_(seg(t, 0.4, 0.5), T(170, 228, '刷卡 1 次、10 秒內通過 2 群', { size: 12, w: 1, c: BAD }) + T(170, 248, '→ 標「疑似尾隨」', { size: 12, c: BAD }));
    g += g_(seg(t, 0.5, 0.6), R(350, 70, 110, 70, { f: '#fff', s: INK3, rx: 6 }) + faceIcon(380, 105, 20) + T(430, 100, '卡主', { size: 11, c: INK3 }) + T(430, 118, '王大明', { size: 12, w: 1 }) + faceIcon(540, 105, 26, { diff: 1, s: '#6250d6' }) + T(540, 150, '刷卡者（近距臉）', { size: 11, c: INK3 }));
    g += g_(seg(t, 0.65, 0.78), Ln(464, 105, 512, 105, BAD, 2.5, { dash: '5 4' }) + T(470, 200, '臉和卡主不符', { size: 12, w: 1, c: BAD }) + T(470, 220, '→ 標「疑似代刷」', { size: 12, c: BAD }));
    return g + caption(320, 288, '只標記、不自動判定，交人工查證；門口的這部分可評估直接採購商用功能');
  };
  S.o7_out = function (t) {
    var C = [['王大明', '確認', GOOD, '證據 +7.1，間隔 4.1；全天路徑已連起來'], ['未知-#3', '不在名冊', '#6f7a71', '最高只有 +1.2，低於接受門檻'], ['待確認', '李志強？陳建宏？', WARN, '前兩名只差 0.7，交人工確認']], g = '';
    C.forEach(function (c, i) {
      var y = 40 + i * 78, o = seg(t, i * 0.2, i * 0.2 + 0.2);
      g += g_(o, R(60, y, 520, 64, { f: '#fff', s: c[2], sw: 2 }) + thumb(72, y + 6, 36, 52, i === 0 ? 0 : i + 1) + T(124, y + 28, c[0], { size: 16, a: 'start', w: 1, c: c[2] }) + T(124, y + 50, c[1], { size: 12, a: 'start', c: INK3 }) + T(300, y + 38, c[3], { size: 12, a: 'start' }));
    });
    return g + caption(320, 290, '每一群得到三種結果之一；「未知」和「待確認」都會留在報表上');
  };

  /* ======================= 身分四層 ======================= */
  S.o_layer1 = function (t) {
    var r = rnd(2), g = '';
    for (var c = 0; c < 4; c++) { g += camera(70 + c * 150, 50, 0.8) + T(70 + c * 150, 80, '攝影機 ' + (c + 1), { size: 10, c: INK3 }); }
    for (var i = 0; i < 48; i++) { var o = seg(t, i * 0.012, i * 0.012 + 0.08), x = 40 + (i % 4) * 150 + r() * 100, y = 100 + Math.floor(i / 4) * 13 + r() * 4; g += R(x, y, 14 + r() * 30, 8, { f: '#8d968e', rx: 2, op: o * 0.8 }); }
    return g + T(320, 274, '一天約 1,240 段片段（示意）：每段只知道「同一台攝影機、同一個人的一小段」', { size: 13, w: 1, op: seg(t, 0.6, 0.75) });
  };
  S.o_layer2 = function (t) {
    var r = rnd(6), g = '', cen = [];
    for (var k = 0; k < 6; k++) cen.push([90 + (k % 3) * 200, 100 + Math.floor(k / 3) * 110]);
    var u = ease(seg(t, 0.1, 0.6));
    for (var i = 0; i < 36; i++) { var k2 = i % 6, x0 = 40 + r() * 560, y0 = 50 + r() * 200; g += R(lerp(x0, cen[k2][0] + (r() - 0.5) * 60, u) - 8, lerp(y0, cen[k2][1] + (r() - 0.5) * 40, u) - 4, 16, 8, { f: u > 0.9 ? '#2a78d6' : '#8d968e', rx: 2, op: 0.85 }); }
    cen.forEach(function (c, k) { g += Ci(c[0], c[1], 46, { s: '#2a78d6', dash: '5 4', op: seg(t, 0.6, 0.7) }) + T(c[0], c[1] - 52, '日內 ID ' + (k + 1), { size: 11, c: '#2a78d6', op: seg(t, 0.65, 0.75) }); });
    return g + caption(320, 290, '同日分群：所有線索＋時空約束 → 「今天的同一個人」（日內匿名 ID）');
  };
  S.o_layer3 = function (t) {
    var g = panel(40, 40, 220, 210, '11/10') + panel(380, 40, 220, 210, '11/11');
    g += person(150, 200, 2.2, 0.3, { mark: '#2a78d6' }) + chip(110, 70, 80, '#2a78d6', '日內 ID 4') + person(490, 200, 2.2, 0.3, { mark: '#2a78d6', body: '#3b5b8c' }) + chip(450, 70, 80, '#2a78d6', '日內 ID 9');
    g += g_(seg(t, 0.15, 0.3), Ln(265, 120, 375, 120, BAD, 2, { dash: '6 4' }) + T(320, 112, '外觀 ✗ 不用', { size: 12, c: BAD, w: 1 }));
    g += g_(seg(t, 0.35, 0.5), Ln(265, 160, 375, 160, GOOD, 3) + T(320, 152, '臉＋步態＋身高 ✓', { size: 12, c: GOOD, w: 1 }));
    g += g_(seg(t, 0.6, 0.75), chip(250, 214, 140, OLIVE, '全域匿名 ID 27') + T(320, 268, '跨日只用跨日穩定的線索，門檻比同日高', { size: 13, w: 1 }));
    return g + caption(320, 292, '跨日連結：隔天衣服可能不同，外觀不可靠');
  };
  S.o_layer4 = function (t) {
    var g = '';
    for (var i = 0; i < 6; i++) { var y = 50 + i * 36, known = i < 4, o = seg(t, i * 0.08, i * 0.08 + 0.12); g += g_(o, chip(50, y, 110, OLIVE, '全域 ID ' + (27 + i)) + arrow(168, y + 7, 240, y + 7, known ? GOOD : '#9aa39a') + (known ? R(250, y - 4, 120, 22, { f: '#fff', s: GOOD }) + T(310, y + 11, K.NAMES[i] || '張家豪', { size: 12, w: 1 }) : R(250, y - 4, 120, 22, { f: '#fff', s: '#9aa39a', dash: '4 3' }) + T(310, y + 11, '未知-#' + (i - 3), { size: 12, c: INK3 }))); }
    g += g_(seg(t, 0.6, 0.75), R(410, 60, 200, 150, { f: '#fff', s: '#c5ccc2' }) + T(510, 86, '識別只在最後一步', { size: 13, w: 1 }) + T(510, 112, '名冊不完整：軌跡仍成立', { size: 12 }) + T(510, 134, '刷卡被代刷：影像為準', { size: 12 }) + T(510, 156, '證據不足：保持「未知」', { size: 12 }) + T(510, 186, '用整群多段比，不用單段', { size: 11, c: INK3 }));
    return g + caption(320, 290, '前三層是「分類」（不需名冊），最後一層才是「識別」');
  };

  /* ======================= 成果：查詢與覆核 ======================= */
  S.o_query = function (t) {
    var g = R(40, 40, 260, 40, { f: '#fff', s: '#2a78d6', sw: 2 }) + T(56, 66, '查詢：王大明　11/10', { size: 14, a: 'start', w: 1 });
    var E = [['07:02', '營門（刷卡＋臉）', 1], ['07:10', '連部前道路', 0], ['11:58', '餐廳入口（名牌）', 1], ['13:20', '— 無資料（盲區）—', -1], ['15:30', '操場', 0]];
    E.forEach(function (e, i) {
      var y = 100 + i * 34, o = seg(t, 0.1 + i * 0.1, 0.2 + i * 0.1);
      g += g_(o, Ci(60, y, 6, { f: e[2] < 0 ? '#fff' : IDC[0], s: IDC[0], dash: e[2] < 0 ? '2 2' : null }) + (i < 4 ? Ln(60, y + 6, 60, y + 28, IDC[0], 2, { dash: '2 3' }) : '') + T(76, y + 5, e[0], { size: 13, a: 'start', w: 1 }) + T(130, y + 5, e[1], { size: 12, a: 'start', c: e[2] < 0 ? INK3 : INK }) + (e[2] > 0 ? T(290, y + 5, '身分錨點', { size: 10, a: 'end', c: GOOD, w: 1 }) : ''));
    });
    g += g_(seg(t, 0.55, 0.7), panel(330, 40, 280, 230, '每一筆都能點開看原始畫面') + thumb(350, 80, 70, 96, 0) + thumb(436, 80, 70, 96, 0) + thumb(522, 80, 70, 96, 0) + T(470, 206, '07:02 營門　07:10 連部　11:58 餐廳', { size: 11, c: INK3 }) + T(470, 236, '可追溯：每個判定都有證據', { size: 12, w: 1 }));
    return g + caption(320, 292, '事後查詢特定人員：列出何時、在哪裡，盲區明確標示「沒有資料」');
  };
  S.o_review = function (t) {
    var g = thumb(50, 70, 60, 86, 2) + thumb(230, 70, 60, 86, 2) + Ln(116, 113, 224, 113, WARN, 2.5, { dash: '6 4' }) + T(170, 104, '證據 +2.1', { size: 12, c: WARN, w: 1 }) + T(170, 186, '低信心的連結', { size: 12, c: INK3 });
    g += g_(seg(t, 0.2, 0.35), arrow(300, 113, 350, 113) + R(360, 50, 250, 140, { f: '#fff', s: '#c5ccc2' }) + T(485, 76, '人工覆核', { size: 14, w: 1 }) + T(485, 102, '兩段是同一人嗎？', { size: 12 }));
    g += g_(seg(t, 0.4, 0.5), R(390, 120, 80, 36, { f: '#eef7ee', s: GOOD }) + T(430, 144, '✓ 是', { size: 14, c: GOOD, w: 1 }) + R(500, 120, 80, 36, { f: '#fff', s: '#c5ccc2' }) + T(540, 144, '✗ 不是', { size: 14, c: INK3 }));
    g += g_(seg(t, 0.6, 0.75), arrow(485, 196, 485, 226, GOOD) + T(485, 248, '加入每週的半監督訓練（抑制混群）', { size: 13, w: 1, c: GOOD }) + T(485, 270, '覆核結果也抽樣複核', { size: 11, c: INK3 }));
    return g + caption(220, 240, '人工確認的結果回饋給模型', {});
  };

  /* ======================= 動畫規格 ======================= */
  var SPECS = {
    all: { title: '第一版系統：從錄影到交出成果', sub: '白天照常錄影，夜間依序跑完七步；前六步不需名冊，名冊與刷卡只在最後一步參與。', keyLabel: '整體邏輯', key: '先分類、再識別：前六步回答「今天有幾個不同的人、各去過哪裡」，第七步才對到名冊。名冊不完整或刷卡被代刷時，路徑仍然成立。',
      flow: [['營區的一天', '10 台路邊攝影機照常錄影，晚上一次處理', 0, 'o_day'], ['偵測', 'YOLOX-S；畫面縮到 640；5 fps', 1, 'o1_resize'], ['追蹤成片段', 'ByteTrack 兩輪匹配，撿回被擋住的人', 2, 'o2_bytetrack'], ['身分線索', '每段片段先檢查哪些線索可用', 3, 'o3_gates'], ['融合成證據', '各線索換成同一把尺再相加', 4, 'o4_sum'], ['時空約束', '走不到的就不可能是同一人', 5, 'o5_walk'], ['分群', '約束式平均連結凝聚分群', 6, 'o6_merge'], ['比對名冊', '第一名明顯領先才接受', 7, 'o7_margin'], ['交出成果', '每人的時間與地點；低信心待覆核', 0, 'o_output']] },
    s1: { title: '① 攝影機與偵測：YOLOX-S', sub: '每一幀找出畫面中的人。設定：輸入 640、5 fps、信心 ≥ 0.1、人高 ≥ 40 像素、空場降頻。', keyLabel: '這一步的重點', key: '寧可多給低分框，讓追蹤去撿；太小的人形直接不送，省算力也少錯誤。',
      flow: [['縮放與偵測', '1080p 縮到 640×640；信心 ≥ 0.1 都輸出', 1, 'o1_resize'], ['抽幀', '偵測與追蹤用 5 fps；空場 10 秒降到 1 fps', 1, 'o1_fps'], ['最小人高', '人框高 < 40 像素不送後續步驟', 1, 'o1_minh']] },
    s2: { title: '② 追蹤成片段：ByteTrack＋片段淨化', sub: '同一台攝影機裡把同一人的框串成片段。設定：高分 0.5、低分 0.1、保留 2 秒、片段淨化寧可多切。', keyLabel: '這一步的重點', key: '同制服時外觀幫不上忙，追蹤只靠位置與運動；寧可多切幾段，也不讓一段片段混兩個人。',
      flow: [['兩輪匹配', '高分框先配，剩下的軌跡再配低分框', 2, 'o2_bytetrack'], ['短暫遮擋接回', '軌跡保留 2 秒（10 幀）', 2, 'o2_buffer'], ['片段淨化', '前後窗比身高、外觀、位置，突變就切開', 2, 'o2_purify']] },
    s3: { title: '③ 身分線索特徵', sub: '外觀 SOLIDER Swin-S、換裝 CAL、步態 DeepGaitV2＋RTMPose、臉 AdaFace＋MagFace、身高、名牌。', keyLabel: '這一步的重點', key: '每條線索都有「可用條件」，看不到就不算；外觀只在同一天內可信，換裝靠 CAL、步態、臉、身高。',
      flow: [['挑好幀算外觀', '每段取品質最好的 8 幀', 3, 'o3_quality'], ['步態回原始影片', '取連續 30 幀（≥ 15 fps）', 3, 'o3_gaitwin'], ['線索的可用條件', '臉：兩眼間距 ≥ 10 像素；名牌：人高 ≥ 300 像素', 3, 'o3_gates'], ['換裝怎麼連', '外觀失效時靠 CAL、步態、身高', 3, 'o3_cal']] },
    s4: { title: '④ 換成同一種證據（融合）', sub: '品質加權片段聚合 → 各線索校準成似然比 → 依品質分層 → 相加。', keyLabel: '這一步的重點', key: '把不同單位的分數換成同一把尺；缺的線索為 0，品質差的自動變小；每一項貢獻多少一目了然。',
      flow: [['分數換成證據', '同人／不同人兩個分布的高度比，取對數', 4, 'o4_kde'], ['依品質分層', '好、差兩級各估一組分布', 4, 'o4_strata'], ['相加與上限', '每項 ±6；看不到為 0；刷卡最多 +2', 4, 'o4_sum']] },
    s5: { title: '⑤ 時空約束', sub: '不可能配對規則＋攝影機兩兩的轉移時間分布。', keyLabel: '這一步的重點', key: '時空規則只排除不可能的配對，不會引入新錯誤；轉移時間分布從資料自動學，當作第 4 步的一項證據。',
      flow: [['走不到', '時間差 < 距離 ÷ 3 m/s → 不可能', 5, 'o5_walk'], ['同時出現在兩處', '重疊 > 1 秒、視野不重疊 → 不可能', 5, 'o5_overlap'], ['轉移時間分布', '每 10 秒一格，自動統計 2 週', 5, 'o5_hist']] },
    s6: { title: '⑥ 分群：片段聚成人', sub: '約束式平均連結凝聚分群；門檻 τ 用標註資料掃描。', keyLabel: '這一步的重點', key: '每步合併證據最強的兩群，違反時空約束的不准合併；低信心片段最後才處理；成果用四個數一起報。',
      flow: [['合併過程', '平均連結；約束擋下不可能的合併', 6, 'o6_merge'], ['門檻 τ 怎麼定', '一天的標註掃描，取 BCubed F 最高', 6, 'o6_tau'], ['低信心片段', '最後才併；併不進去保留為未歸群', 6, 'o6_late'], ['成果怎麼評', '準確率、召回率、擴散率、人數誤差', 6, 'o6_rates']] },
    s7: { title: '⑦ 比對名冊（刷卡輔助）', sub: '整群多證據比對＋第一第二名間隔＋刷卡輔助與一致性檢查。', keyLabel: '這一步的重點', key: '先縮小名單、用整群比；前兩名太接近就交人工；刷卡只能加分，和影像不符時以影像為準並列入待查。',
      flow: [['縮小比對名單', '只和當日在營或刷卡進營的人比', 7, 'o7_gallery'], ['間隔門檻', '第一名 − 第二名 ≥ 2 才接受', 7, 'o7_margin'], ['刷卡證據', '±2 分鐘、同門口；依時間接近程度分配', 7, 'o7_card'], ['尾隨與代刷', '只標記、不自動判定', 7, 'o7_tail'], ['三種結果', '確認、未知-#N、待確認', 7, 'o7_out']] },
    layers: { title: '身分的四層：從片段到真實身分', sub: '片段 → 日內匿名 ID → 全域匿名 ID → 身分。前三層是分類，最後一層才是識別。', keyLabel: '為什麼要分層', key: '分類不需名冊，所以名冊不完整、刷卡被代刷時，系統照樣能數人、畫軌跡；識別用整群多段證據，比單段穩定。',
      flow: [['片段', '單攝影機追蹤的輸出', 2, 'o_layer1'], ['日內匿名 ID', '同一天的同一人', 6, 'o_layer2'], ['全域匿名 ID', '跨日的同一人', 6, 'o_layer3'], ['身分', '比對名冊；不足就是未知', 7, 'o_layer4']] },
    output: { title: '系統要交出的成果', sub: '每個人何時、經過哪些地點；可事後查詢；低信心的連結交人工覆核。', keyLabel: '交付重點', key: '每個判定都可追溯到原始畫面與證據；盲區和低信心的部分明確標示，不假裝知道。',
      flow: [['路徑總覽', '平面圖上的每人軌跡', 0, 'o_output'], ['事後查詢', '指定人員與日期，列出時間與地點', 0, 'o_query'], ['人工覆核', '低信心連結交人工，結果回饋訓練', 0, 'o_review']] }
  };
  function play(id) { var s = SPECS[id]; if (s) FlowPlay.open({ title: s.title, sub: s.sub, flow: s.flow, keyLabel: s.keyLabel, key: s.key, ours: true }); }
  function btn(id, label, cls) { return '<button type="button" class="fp-btn' + (cls ? ' ' + cls : '') + '" data-op="' + id + '" title="用動畫逐步說明"><i></i>' + label + '</button>'; }

  var CH = global.CH = global.CH || {};
  CH.ourplay = {
    init: function () {
      var sec = document.getElementById('ch-approach');
      if (!sec || sec.getAttribute('data-op-ready')) return;
      sec.setAttribute('data-op-ready', '1');
      var t = document.getElementById('v1-table');
      if (t) t.insertAdjacentHTML('beforebegin', '<div class="op-hero">' + btn('all', '動畫：第一版系統從頭到尾（約 1.5 分鐘）', 'big') + '<span class="small muted">每一步的細節，點下表各列右邊的「細看」</span></div>');
      if (t && t.tHead) {
        t.tHead.rows[0].insertAdjacentHTML('beforeend', '<th>動畫</th>');
        Array.prototype.forEach.call(t.tBodies[0].rows, function (r, i) { r.insertAdjacentHTML('beforeend', '<td>' + btn('s' + (i + 1), '細看') + '</td>'); });
      }
      var L = document.getElementById('sys-layers'), O = document.getElementById('out-map');
      if (L) L.closest('figure').querySelector('.plate-head').insertAdjacentHTML('beforeend', btn('layers', '動畫說明'));
      if (O) O.closest('figure').querySelector('.plate-head').insertAdjacentHTML('beforeend', btn('output', '動畫說明'));
      sec.addEventListener('click', function (e) { var b = e.target.closest('[data-op]'); if (b) play(b.getAttribute('data-op')); });
    }
  };
  global.OurPlay = { play: play, SPECS: SPECS };
})(window);
