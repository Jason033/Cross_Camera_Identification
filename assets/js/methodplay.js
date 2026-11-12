/* methodplay.js — 第 2 章「方法總覽」每張方法卡的動畫說明
   主要方法（有「怎麼運作」）：輸入 → 處理 → 訓練 → 輸出 → 在我們的條件下，最後是關鍵差異。
     輸入、訓練、輸出、條件用共用場景（內容來自 steps.js 的卡片資料）；「處理」是各方法的核心，每個方法一個專屬圖解。
   其他方法：一句話概念 → 判定理由。
   場景名稱以 m_ 開頭；其餘沿用 flowplay.js（x_）與 ourplay.js（o_）已有的場景。 */
(function (global) {
  'use strict';
  if (!global.FlowPlay) return;
  var K = FlowPlay.kit, S = FlowPlay.SCN;
  var W = K.W, IDC = K.IDC, SC = K.SC, INK = K.INK, INK3 = K.INK3, OLIVE = K.OLIVE, SKIN = K.SKIN, PAPER = K.PAPER;
  var T = K.T, R = K.R, Ln = K.Ln, Ci = K.Ci, arrow = K.arrow, person = K.person, camera = K.camera, bars = K.bars, net = K.net, db = K.db,
    thumb = K.thumb, caption = K.caption, panel = K.panel, star = K.star, chip = K.chip, faceIcon = K.faceIcon, seg = K.seg, ease = K.ease, lerp = K.lerp, rnd = K.rnd, op = K.op, wrap = K.wrap;
  var GOOD = '#0c8a0c', BAD = '#c93434', WARN = '#b97e00', BLUE = '#2a78d6', PURP = '#6250d6', PINK = '#d55181', ORNG = '#eb6834', GOLD = '#9a7b12';
  function g_(o, s) { return '<g' + op(o) + '>' + s + '</g>'; }
  function lines(x, y, s, n, o) { return wrap(s, n).slice(0, o && o.max || 4).map(function (l, k) { return T(x, y + k * (o && o.lh || 18), l, Object.assign({ size: 12, a: 'middle', c: INK3 }, o || {})); }).join(''); }
  function gauss(x, m, s) { return Math.exp(-(x - m) * (x - m) / (2 * s * s)); }
  function path(fn, x0, x1, n) { var p = []; for (var i = 0; i <= n; i++) { var x = x0 + (x1 - x0) * i / n; p.push(x.toFixed(1) + ',' + fn(x).toFixed(1)); } return p.join(' '); }
  /** 骨架小人：(x,y) 腳底 */
  var KP = [[0, -50], [0, -42], [-7, -40], [7, -40], [-10, -30], [10, -30], [-12, -20], [12, -20], [-4, -22], [4, -22], [-5, -11], [5, -11], [-6, 0], [6, 0]];
  var SK = [[0, 1], [1, 2], [1, 3], [2, 4], [3, 5], [4, 6], [5, 7], [2, 8], [3, 9], [8, 9], [8, 10], [9, 11], [10, 12], [11, 13]];
  function stick(x, y, s, ph, c, o) {
    var p = KP.map(function (q, i) { var sw = (i >= 10 ? (i % 2 ? -1 : 1) * Math.sin(ph) * 4 : i === 6 || i === 7 ? (i % 2 ? 1 : -1) * Math.sin(ph) * 3 : 0); return [x + (q[0] + sw) * s, y + q[1] * s]; });
    var g = '';
    SK.forEach(function (e) { g += Ln(p[e[0]][0], p[e[0]][1], p[e[1]][0], p[e[1]][1], c || ORNG, 2); });
    p.forEach(function (q) { g += Ci(q[0], q[1], 2.2, { f: '#fff', s: c || ORNG, sw: 1.5 }); });
    return g_(o, g);
  }
  function lock(x, y, c) { return R(x, y, 16, 12, { f: c || INK3, rx: 2 }) + '<path d="M' + (x + 3) + ',' + y + ' v-4 a5,5 0 0,1 10,0 v4" fill="none" stroke="' + (c || INK3) + '" stroke-width="2"/>'; }

  /* ======================= 共用場景 ======================= */
  S.m_in = function (t, st) {
    var p = st.p || {}, k = p.kind, g = '', o = function (i) { return seg(t, i * 0.08, i * 0.08 + 0.2); };
    var sz = +(((p.text || '').match(/(\d{3,4})(?:[×x–-]\d{3,4})?/) || [])[1] || 0);
    if (k === 'frame' || k === 'boxes') {
      var fw = sz ? Math.max(150, Math.min(460, 460 * sz / 1080 * 1.6)) : 460, fs = fw / 460, fx = 320 - fw / 2, fh = 210 * fs;
      if (sz) g += R(90, 40, 460, 210, { s: '#dde2da', dash: '4 4' }) + T(548, 262, '原始 1080p', { size: 10, a: 'end', c: INK3 });
      g += R(fx, 40, fw, fh, { f: '#fff', s: '#c5ccc2' }) + T(320, 34, (k === 'frame' ? '整張畫面' : '每一幀的偵測框') + (sz ? '，縮到 ' + sz : ''), { size: 12, c: INK3 });
      [[200, 230, 1.6], [330, 220, 1.3], [460, 200, 0.9]].map(function (q) { return [320 + (q[0] - 320) * fs, 40 + (q[1] - 40) * fs, q[2] * fs]; }).forEach(function (q, i) { g += g_(o(i), person(q[0], q[1], q[2], 0.5 + i, { mark: IDC[i] }) + (k === 'boxes' ? R(q[0] - 14 * q[2], q[1] - 54 * q[2], 28 * q[2], 58 * q[2], { s: IDC[i], sw: 2 }) + T(q[0], q[1] - 58 * q[2], (0.9 - i * 0.2).toFixed(2), { size: 10, c: IDC[i], w: 1 }) : '')); });
    } else if (k === 'crop') {
      var sq = /384×384/.test(p.text || ''), cw = sq ? 200 : 100;
      g += R(320 - cw / 2, 40, cw, 200, { f: '#fff', s: '#c5ccc2' }) + person(320, 232, 3.7, 0.4, { mark: IDC[0] }) + T(320, 258, sq ? '384 像素' : '128 像素', { size: 11, c: INK3 }) + T(326 + cw / 2, 144, sq ? '384 像素' : '256 像素', { size: 11, a: 'start', c: INK3 }) + T(320, 30, sq ? '全身影像（正方形，含臉）' : '人形裁切（由第 1 步的框切出）', { size: 12, c: INK3 });
    } else if (k === 'seq') {
      for (var i = 0; i < 7; i++) g += g_(o(i), R(70 + i * 72, 70, 60, 120, { f: '#111' }) + person(100 + i * 72, 180, 1.9, i * 0.9, { sil: 1, body: '#fff' }).replace(/fill="#1c251f"/g, 'fill="#fff"').replace(/stroke="#1c251f"/g, 'stroke="#fff"'));
      g += T(320, 216, '同一片段連續的黑白剪影（64×44）', { size: 12, c: INK3 });
    } else if (k === 'skel') {
      for (i = 0; i < 6; i++) g += stick(90 + i * 92, 200, 2.4, i * 1.1, ORNG, o(i));
      g += T(320, 236, '關節點序列（17 點 × 連續幀）', { size: 12, c: INK3 });
    } else if (k === 'face') {
      g += R(250, 50, 140, 140, { f: '#fff', s: PURP, sw: 2 }) + faceIcon(320, 120, 48);
      [[303, 113], [337, 113], [320, 127], [306, 140], [334, 140]].forEach(function (q, i) { g += Ci(q[0], q[1], 4, { s: PURP, sw: 2, op: o(i) }); });
      g += T(320, 214, '依 5 個特徵點對齊的 112×112 臉', { size: 12, c: INK3 });
    } else if (k === 'scores') {
      [['外觀', 0.62, BLUE], ['步態', 0.71, PINK], ['臉', 0.88, PURP], ['身高差', 0.3, GOLD]].forEach(function (c, i) { g += g_(o(i), T(220, 82 + i * 42, c[0], { size: 13, a: 'end', w: 1, c: c[2] }) + R(232, 68 + i * 42, 240 * c[1], 20, { f: c[2], op: 0.8 }) + T(240 + 240 * c[1], 83 + i * 42, c[1].toFixed(2), { size: 12, a: 'start', c: INK3 })); });
      g += T(320, 250, '各線索各自的比對分數（單位、範圍都不同）', { size: 12, c: INK3 });
    } else if (k === 'tracklets') {
      for (i = 0; i < 3; i++) g += camera(90, 70 + i * 60, 0.8) + T(120, 74 + i * 60, '攝影機 ' + 'ACE'[i], { size: 11, a: 'start', c: INK3 });
      var r = rnd(3); for (i = 0; i < 9; i++) { var x = 200 + r() * 300, y = 60 + (i % 3) * 60; g += R(x, y, 40 + r() * 60, 14, { f: IDC[i % 5], rx: 3, op: o(i) * 0.85 }); }
      g += T(350, 250, '片段：攝影機、開始與結束時間、各線索特徵', { size: 12, c: INK3 });
    } else if (k === 'group') {
      for (i = 4; i >= 0; i--) g += thumb(90 + i * 8, 60 + i * 8, 60, 84, 0);
      g += T(130, 190, '一整群片段', { size: 12, c: INK3 }) + arrow(220, 110, 290, 110);
      K.NAMES.forEach(function (n, j) { g += g_(o(j), R(310, 50 + j * 46, 150, 36, { f: '#fff', s: '#c5ccc2' }) + faceIcon(334, 68 + j * 46, 12) + T(400, 73 + j * 46, n, { size: 13, w: 1 })); });
      g += T(390, 250, '名冊（每人有註冊特徵）', { size: 12, c: INK3 });
    } else if (k === 'videos') {
      ['#4f5c30', '#4f5c30', '#3b5b8c', '#5a6b8a'].forEach(function (b, j) { g += g_(o(j), R(80 + j * 125, 60, 100, 150, { f: '#fff', s: '#c5ccc2' }) + person(130 + j * 125, 200, 2.4, 0.3, { mark: IDC[0], body: b }) + T(130 + j * 125, 230, ['迷彩小帽', '鋼盔', '運動服', '冬季外套'][j], { size: 12, c: INK3 })); });
      g += T(320, 46, '每位人員、每種服裝各走幾段', { size: 12, c: INK3 });
    } else {
      g += T(320, 140, p.label || '輸入', { size: 16, w: 1 });
    }
    return g;
  };
  S.m_out = function (t, st) {
    var p = st.p || {}, k = p.kind, c = p.c || BLUE, u = seg(t, 0.1, 0.7), g = '';
    if (k === 'boxes') { g += R(120, 50, 400, 190, { f: '#fff', s: '#c5ccc2' }); [[220, 220, 1.5], [340, 210, 1.2], [450, 190, 0.8]].forEach(function (q, i) { g += person(q[0], q[1], q[2], 0.5, { mark: IDC[i] }) + R(q[0] - 14 * q[2], q[1] - 54 * q[2], 28 * q[2], 58 * q[2], { s: IDC[i], sw: 2.5, op: seg(t, i * 0.15, i * 0.15 + 0.2) }) + T(q[0], q[1] - 58 * q[2], '人 ' + (0.92 - i * 0.06).toFixed(2), { size: 11, c: IDC[i], w: 1, op: seg(t, i * 0.15, i * 0.15 + 0.2) }); }); }
    else if (k === 'tracklets') { for (var i = 0; i < 3; i++) g += T(150, 90 + i * 50, 'ID ' + (i + 1), { size: 13, a: 'end', w: 1, c: IDC[i] }) + R(160, 76 + i * 50, 380 * u * (0.7 + i * 0.1), 18, { f: IDC[i] }); }
    else if (k === 'vec') { var dm = +(((p.text || '').match(/(\d+)\s*維/) || [])[1] || 0), nb = dm ? Math.max(8, Math.min(32, Math.round(dm / 64))) : 18; g += bars(320 - nb * 7.5, 190, nb, 12, 120, c, u, 9) + T(320, 222, dm ? dm + ' 維向量' : (p.text ? p.text.replace(/（.*?）/g, '') : '特徵向量（一串數字）'), { size: 14, w: 1 }); }
    else if (k === 'kp') { g += stick(320, 240, 3.8, 0.4, ORNG, u) + T(320, 270, '17 個關節點座標＋信心值', { size: 12, c: INK3 }); }
    else if (k === 'evidence') { g += Ln(320, 60, 320, 230, INK3, 1) + R(320, 120, 180 * u, 34, { f: INK }) + T(330 + 180 * u, 143, '+' + (5 * u).toFixed(1), { size: 18, a: 'start', w: 1 }) + T(320, 256, '一個總證據值：正數支持同一人，負數支持不同人', { size: 12, c: INK3 }); }
    else if (k === 'prob') { var a = Math.PI * (1 - 0.93 * u); g += '<path d="M220,200 A100,100 0 0,1 420,200" fill="none" stroke="#dde2da" stroke-width="16"/>' + '<path d="M220,200 A100,100 0 0,1 ' + (320 + 100 * Math.cos(a)).toFixed(1) + ',' + (200 - 100 * Math.sin(a)).toFixed(1) + '" fill="none" stroke="' + GOOD + '" stroke-width="16"/>' + T(320, 190, (0.93 * u).toFixed(2), { size: 26, w: 1 }) + T(320, 236, '同一人的機率', { size: 13, c: INK3 }); }
    else if (k === 'clusters') { var r = rnd(5); [[180, 140], [320, 140], [460, 140]].forEach(function (q, j) { g += Ci(q[0], q[1], 50, { s: IDC[j], dash: '5 4', op: u }); for (var m = 0; m < 5; m++) g += R(lerp(80 + r() * 480, q[0] - 25 + (m % 3) * 18, u) - 7, lerp(60 + r() * 160, q[1] - 14 + Math.floor(m / 3) * 18, u) - 4, 14, 8, { f: IDC[j], rx: 4 }); }); g += T(320, 240, '每一群＝一個人（匿名 ID）', { size: 13, c: INK3 }); }
    else if (k === 'identity') { [['王大明', GOOD], ['未知-#3', '#6f7a71'], ['待確認', WARN]].forEach(function (q, j) { g += g_(seg(t, j * 0.15, j * 0.15 + 0.2), R(120 + j * 140, 100, 120, 60, { f: '#fff', s: q[1], sw: 2 }) + T(180 + j * 140, 136, q[0], { size: 15, w: 1, c: q[1] })); }); }
    else if (k === 'height') { g += person(240, 250, 3.8, 0.2, { mark: IDC[1] }) + Ln(300, 250, 300, lerp(250, 70, u), GOLD, 3) + T(330, 150, (lerp(0, 172, u)).toFixed(0) + ' cm ± 5', { size: 24, a: 'start', w: 1, c: GOLD }) + T(330, 180, '片段的身高中位數與不確定度', { size: 12, a: 'start', c: INK3 }); }
    else if (k === 'plan') { g += R(220, 50, 200, 200, { f: '#fff', s: '#c5ccc2' }); for (i = 1; i < 4; i++) g += Ln(220 + i * 50, 50, 220 + i * 50, 250, '#eee', 1) + Ln(220, 50 + i * 50, 420, 50 + i * 50, '#eee', 1); g += Ci(lerp(250, 380, u), lerp(220, 90, u), 7, { f: ORNG }) + T(320, 272, '平面圖座標（公尺）', { size: 12, c: INK3 }); }
    else if (k === 'protos') { for (i = 0; i < 4; i++) g += g_(seg(t, i * 0.12, i * 0.12 + 0.2), bars(80 + i * 140, 170, 8, 9, 60, IDC[i % 5], 1, 30 + i) + T(120 + i * 140, 196, ['迷彩小帽', '鋼盔', '運動服', '冬季外套'][i], { size: 11, c: INK3 })); g += T(320, 70, '王大明的 4 個「原型」（每種服裝一個）', { size: 14, w: 1 }); }
    else if (k === 'constraints') { [['片段 12 × 片段 40', '同時出現'], ['片段 7 × 片段 33', '走不到'], ['片段 18 × 片段 21', '同時出現']].forEach(function (q, j) { g += g_(seg(t, j * 0.15, j * 0.15 + 0.2), R(170, 70 + j * 50, 300, 36, { f: '#fff', s: BAD }) + T(190, 93 + j * 50, '✗ ' + q[0], { size: 13, a: 'start', w: 1 }) + T(450, 93 + j * 50, q[1], { size: 12, a: 'end', c: BAD })); }); g += T(320, 250, '不可能配對清單（交給第 6 步分群）', { size: 12, c: INK3 }); }
    else if (k === 'model') { g += R(250, 90, 140, 80, { f: '#fff', s: PURP, sw: 2.5 }) + T(320, 136, '更新後的模型', { size: 14, w: 1, c: PURP }) + '<path d="M250,190 A80,40 0 0,0 390,190" fill="none" stroke="' + PURP + '" stroke-width="2" stroke-dasharray="5 4"/>' + T(320, 250, '用分群結果再訓練，反覆幾輪', { size: 12, c: INK3, op: u }); }
    else g += T(320, 140, p.label || '輸出', { size: 16, w: 1 });
    var chips = [];
    if (p.res && p.res !== '—') chips.push(['成績', p.res]);
    if (p.cost && p.cost !== '—') chips.push(['算力', p.cost]);
    chips.forEach(function (q, i) { var y = 6 + i * 24; g += g_(seg(t, 0.55 + i * 0.1, 0.7 + i * 0.1), R(80, y, 480, 20, { f: '#fff', s: '#c5ccc2', rx: 10 }) + T(96, y + 14, q[0], { size: 11, a: 'start', w: 1, c: q[0] === '成績' ? GOOD : ORNG }) + T(130, y + 14, q[1].length > 40 ? q[1].slice(0, 39) + '…' : q[1], { size: 11, a: 'start' })); });
    return g;
  };
  S.m_train = function (t, st) {
    var s = (st.p && st.p.text) || '', none = /^不需訓練/.test(s), g = '';
    if (none) {
      g += R(250, 90, 140, 80, { f: '#fff', s: GOOD, sw: 2.5 }) + T(320, 128, '不需訓練', { size: 18, w: 1, c: GOOD }) + T(320, 152, '直接用', { size: 12, c: INK3 });
      return g + lines(320, 214, s, 26, { size: 13, c: INK, max: 3 });
    }
    var ds = (s.match(/COCO|LUPerson|WIDER FACE|Gait3D|GREW|MSMT17|CCVID|LTCC|PRCC|SMPL|營區|自建|標註|同人／不同人/) || ['訓練資料'])[0];
    g += g_(seg(t, 0, 0.2), R(60, 110, 110, 70, { f: '#fff', s: '#c5ccc2' }) + R(66, 104, 110, 70, { f: '#fff', s: '#c5ccc2' }) + R(72, 98, 110, 70, { f: '#fff', s: INK3 }) + T(127, 138, ds, { size: 13, w: 1 }) + T(127, 156, '資料', { size: 11, c: INK3 }));
    g += g_(seg(t, 0.15, 0.3), arrow(190, 134, 240, 134) + R(250, 100, 120, 70, { f: '#fff', s: PURP, sw: 2 }) + T(310, 140, '模型', { size: 15, w: 1, c: PURP }));
    var a = t * Math.PI * 4;
    g += g_(seg(t, 0.3, 0.45), '<path d="M380,120 C440,80 440,190 380,150" fill="none" stroke="' + ORNG + '" stroke-width="2.5"/>' + Ci(410 + 18 * Math.cos(a), 135 + 22 * Math.sin(a), 4, { f: ORNG }) + T(470, 140, '損失 → 調整', { size: 12, a: 'start', c: ORNG, w: 1 }));
    return g + g_(seg(t, 0.4, 0.6), lines(320, 214, s, 30, { size: 13, c: INK, max: 4 }));
  };
  var DIMS = [['ang', '路邊俯角'], ['cloth', '換裝'], ['grp', '5 人交錯'], ['cpu', 'CPU 算力'], ['lic', '軍用授權']];
  var LV = { g: ['✓', GOOD], m: ['△', WARN], b: ['✗', BAD], n: ['—', '#9aa39a'] };
  S.m_us = function (t, st) {
    var us = (st.p && st.p.us) || {}, g = T(320, 34, '在我們的條件下', { size: 14, w: 1 });
    DIMS.forEach(function (d, i) {
      var v = us[d[0]] || ['n', '—'], y = 52 + i * 44, o = seg(t, 0.05 + i * 0.12, 0.15 + i * 0.12);
      g += g_(o, R(40, y, 560, 38, { f: '#fff', s: '#dde2da' }) + T(56, y + 25, d[1], { size: 13, a: 'start', w: 1 }) + Ci(160, y + 19, 13, { f: LV[v[0]][1] }) + T(160, y + 25, LV[v[0]][0], { size: 15, w: 1, c: '#fff' }) + T(184, y + 25, v[1].length > 34 ? v[1].slice(0, 33) + '…' : v[1], { size: 12, a: 'start' }));
    });
    return g + caption(320, 290, '✓ 有利　△ 有條件　✗ 不利　— 不適用');
  };
  var TAGC = { use: ['第一版採用', '#0c8a0c'], base: ['對照基準', '#2a78d6'], try: ['之後試用', '#b97e00'], ref: ['參考思路', '#6f7a71'], skip: ['暫不採用', '#c93434'] };
  S.m_verdict = function (t, st) {
    var p = st.p || {}, tg = TAGC[p.tag] || TAGC.ref;
    return g_(seg(t, 0, 0.2), R(240, 50, 160, 46, { f: tg[1], rx: 23 }) + T(320, 80, tg[0], { size: 18, w: 1, c: '#fff' })) + g_(seg(t, 0.2, 0.4), lines(320, 136, p.fit || '', 28, { size: 15, c: INK, max: 5, lh: 26 }));
  };
  S.m_idea = function (t, st) {
    var p = st.p || {};
    return g_(seg(t, 0, 0.2), T(320, 80, p.name || '', { size: 22, w: 1 }) + (p.v ? T(320, 106, p.v, { size: 12, c: INK3 }) : '')) + g_(seg(t, 0.2, 0.4), lines(320, 150, p.idea || '', 26, { size: 15, c: INK, max: 4, lh: 26 }));
  };

  /* ======================= ① 偵測 ======================= */
  S.m_yolox = function (t) {
    var g = R(40, 40, 250, 200, { f: '#fff', s: '#c5ccc2' }) + person(150, 220, 2.6, 0.4, { mark: IDC[0] }) + T(165, 34, '特徵圖上的每一個點', { size: 12, c: INK3 });
    for (var i = 0; i < 8; i++) for (var j = 0; j < 6; j++) { var hit = i === 3 && j === 2; g += Ci(62 + i * 30, 58 + j * 32, hit ? 6 : 3, { f: hit ? ORNG : '#c5ccc2' }); }
    var u = ease(seg(t, 0.15, 0.45));
    g += R(lerp(152, 118, u), lerp(122, 80, u), lerp(0, 66, u), lerp(0, 142, u), { s: ORNG, sw: 2.5 }) + T(165, 262, '不用預設錨框：這一點直接預測框的位置與大小', { size: 12, c: ORNG, w: 1, op: seg(t, 0.3, 0.45) });
    g += g_(seg(t, 0.5, 0.6), arrow(300, 140, 340, 140) + R(350, 110, 70, 60, { f: '#fff', s: INK3 }) + T(385, 144, '共用特徵', { size: 11 }));
    g += g_(seg(t, 0.6, 0.75), arrow(424, 130, 460, 90, BLUE) + arrow(424, 150, 460, 190, ORNG) + R(466, 66, 150, 46, { f: '#fff', s: BLUE }) + T(541, 88, '分類頭：是人嗎？', { size: 12, w: 1, c: BLUE }) + T(541, 104, '→ 0.93', { size: 11, c: INK3 }) + R(466, 168, 150, 46, { f: '#fff', s: ORNG }) + T(541, 190, '回歸頭：框在哪？', { size: 12, w: 1, c: ORNG }) + T(541, 206, '→ x, y, 寬, 高', { size: 11, c: INK3 }));
    return g + caption(470, 262, '「解耦頭」：分類與定位分開預測', {});
  };
  S.m_yolov7 = function (t) {
    var g = R(60, 40, 260, 220, { f: '#fff', s: '#c5ccc2' }) + person(190, 236, 2.9, 0.4, { mark: IDC[0] });
    var A = [[60, 60], [44, 110], [80, 150]], pick = 2, u = ease(seg(t, 0.45, 0.75));
    A.forEach(function (a, i) {
      var o = seg(t, i * 0.1, i * 0.1 + 0.15), sel = i === pick && t > 0.4, w = sel ? lerp(a[0], 66, u) : a[0], h = sel ? lerp(a[1], 152, u) : a[1];
      g += R(190 - w / 2, 160 - h / 2, w, h, { s: sel ? ORNG : '#9aa39a', sw: sel ? 2.5 : 1.5, dash: sel && u > 0.9 ? null : '5 4', op: sel ? 1 : o * (1 - seg(t, 0.4, 0.5) * 0.7) });
    });
    g += g_(seg(t, 0, 0.2), T(470, 70, '每個位置先放幾個預設形狀的框（錨框）', { size: 13, w: 1 }));
    g += g_(seg(t, 0.4, 0.55), T(470, 120, '挑最接近的那個', { size: 13 }) + T(470, 146, '只預測「偏移多少、放大多少」', { size: 13, c: ORNG, w: 1 }));
    g += g_(seg(t, 0.75, 0.9), T(470, 200, '錨框要配合資料調整', { size: 12, c: INK3 }) + T(470, 222, '（YOLOX 不需要這一步）', { size: 12, c: INK3 }));
    return g;
  };
  S.m_nanodet = function (t) {
    var g = R(40, 50, 128, 128, { f: '#fff', s: '#c5ccc2' }) + person(104, 168, 1.6, 0.4, { mark: IDC[0] }) + T(104, 196, '320×320 輸入', { size: 12, c: INK3 }) + R(190, 40, 150, 150, { f: '#fff', s: '#c5ccc2', op: 0.5 }) + T(265, 206, '（YOLOX：640×640）', { size: 11, c: INK3 });
    var B = [['NanoDet-Plus-m', 1, GOOD, '1.17M 參數'], ['YOLOX-S', 0.22, BLUE, '9M 參數']];
    g += T(480, 50, '每秒能處理的幀數（相對）', { size: 12, c: INK3 });
    B.forEach(function (b, i) { var w = 200 * b[1] * ease(seg(t, 0.2 + i * 0.1, 0.6)); g += T(470, 92 + i * 56, b[0], { size: 13, a: 'end', w: 1, c: b[2] }) + R(480, 78 + i * 56, w, 22, { f: b[2], op: 0.8 }) + T(480, 120 + i * 56, b[3], { size: 11, a: 'start', c: INK3 }); });
    g += g_(seg(t, 0.65, 0.8), T(470, 230, '代價：精度低一截、遠處小人容易漏', { size: 13, w: 1, c: WARN }));
    return g + caption(320, 290, '為手機和 CPU 設計：伺服器只有 CPU 且太慢時的備案');
  };

  /* ======================= ② 追蹤 ======================= */
  S.m_ocsort = function (t) {
    var g = R(30, 30, 580, 230, { f: '#fff', s: '#dde2da' }) + R(300, 60, 80, 170, { f: '#b9c0b5', rx: 3 }) + T(340, 54, '遮擋', { size: 11, c: INK3 });
    var P = function (u) { return u < 0.5 ? [lerp(80, 300, u / 0.5), 200] : [lerp(300, 340, (u - 0.5) / 0.5), lerp(200, 80, (u - 0.5) / 0.5)]; };
    var pts = []; for (var k = 0; k <= 30; k++) { var q = P(k / 30); pts.push(q[0] + ',' + q[1]); }
    g += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + BLUE + '" stroke-width="2" stroke-dasharray="2 5" opacity=".5"/>';
    var u = seg(t, 0, 0.75), p = P(u);
    if (!(p[0] >= 300 && p[0] <= 380 && u < 0.97)) g += person(p[0], p[1] + 10, 1.1, t * 30, { mark: IDC[0] });
    g += g_(seg(t, 0.35, 0.5), Ln(300, 200, 540, 200, '#9aa39a', 2, { dash: '6 4' }) + R(520, 170, 30, 40, { s: '#9aa39a', dash: '4 3' }) + T(540, 160, '卡爾曼預測：一直往前', { size: 11, c: INK3 }));
    g += g_(seg(t, 0.72, 0.85), '<path d="M300,200 Q330,150 340,80" fill="none" stroke="' + GOOD + '" stroke-width="3"/>' + T(400, 130, '重新看到時，用前後觀測補一段虛擬軌跡', { size: 12, a: 'start', c: GOOD, w: 1 }) + T(400, 150, '重新校正，ID 不換', { size: 12, a: 'start', c: GOOD }));
    return g + caption(320, 290, '比 ByteTrack 更能處理「停下來又走」「突然轉彎」');
  };

  /* ======================= ③ 外觀 ======================= */
  S.m_solider = function (t) {
    var lam = (Math.sin(t * Math.PI * 2 - Math.PI / 2) + 1) / 2, g = R(60, 40, 140, 220, { f: '#fff', s: '#c5ccc2' }) + person(130, 250, 4.2, 0.3, { mark: IDC[0] });
    g += '<g opacity="' + (1 - lam).toFixed(2) + '">' + [[110, 120], [150, 140], [125, 170], [148, 105], [112, 200]].map(function (q) { return Ci(q[0], q[1], 9, { f: ORNG, op: 0.55 }); }).join('') + '</g>';
    g += stick(130, 252, 4.1, 0.3, BLUE, lam);
    g += T(400, 60, '同一個模型，多一個控制值 λ', { size: 14, w: 1 }) + Ln(280, 110, 520, 110, '#c5ccc2', 6) + Ci(lerp(280, 520, lam), 110, 11, { f: OLIVE }) + T(280, 136, 'λ = 0', { size: 12, c: INK3 }) + T(520, 136, 'λ = 1', { size: 12, c: INK3 });
    g += T(280, 170, '偏重紋理（衣服花紋）', { size: 12, c: ORNG, w: 1, op: 0.4 + (1 - lam) * 0.6 }) + T(520, 170, '偏重人體結構', { size: 12, c: BLUE, w: 1, op: 0.4 + lam * 0.6 });
    g += T(400, 220, '一般 ReID 建議 0–0.2；同制服時可以實驗把 λ 調高', { size: 13, w: 1 });
    return g + caption(400, 250, '預訓練用無標註行人（LUPerson）＋人體部位偽標籤', {});
  };
  S.m_clipreid = function (t) {
    var s2 = t > 0.5, g = T(320, 34, s2 ? '階段二：固定文字特徵，微調影像編碼器' : '階段一：凍結兩個編碼器，只學每個 ID 的文字 token', { size: 14, w: 1 });
    g += R(60, 60, 90, 130, { f: '#fff', s: '#c5ccc2' }) + person(105, 180, 2.1, 0.3, { mark: IDC[0] }) + arrow(156, 125, 196, 125);
    g += R(200, 90, 130, 70, { f: s2 ? '#fdf0e6' : '#e9ece6', s: s2 ? ORNG : INK3, sw: 2 }) + T(265, 122, '影像編碼器', { size: 13, w: 1 }) + T(265, 142, 'ViT-B/16', { size: 11, c: INK3 }) + (s2 ? T(265, 82, '微調中', { size: 11, c: ORNG, w: 1 }) : lock(310, 96));
    g += R(420, 200, 190, 56, { f: '#e9ece6', s: INK3, sw: 2 }) + T(515, 225, '文字編碼器', { size: 13, w: 1 }) + lock(588, 206);
    var tk = seg(t, 0.1, 0.3);
    g += T(515, 284, '「A photo of a ', { size: 12, a: 'end', c: INK3 }) + R(518, 270, 26, 20, { f: s2 ? '#c5ccc2' : PURP, op: tk }) + R(548, 270, 26, 20, { f: s2 ? '#c5ccc2' : PURP, op: tk }) + T(580, 284, ' person」', { size: 12, a: 'start', c: INK3 });
    g += arrow(515, 196, 515, 160, INK3, { op: tk }) + Ci(470, 125, 18, { s: PURP, sw: 2 }) + Ci(560, 125, 18, { s: BLUE, sw: 2 }) + T(470, 129, '文', { size: 12, c: PURP }) + T(560, 129, '圖', { size: 12, c: BLUE }) + arrow(334, 125, 448, 125, BLUE);
    g += g_(seg(t, 0.2, 0.35), '<path d="M488,125 L542,125" stroke="' + GOOD + '" stroke-width="3" stroke-dasharray="4 3"/>' + T(515, 105, '對比：同 ID 拉近', { size: 11, c: GOOD }));
    return g + caption(220, 240, s2 ? '再用 ID、三元組、圖→文損失微調' : '紫色方塊＝可學的文字 token', {});
  };
  S.m_mim = function (t) {
    var g = R(80, 40, 120, 220, { f: '#fff', s: '#c5ccc2' }) + person(140, 250, 4.2, 0.3, { mark: IDC[0] }), r = rnd(13), m = [];
    for (var i = 0; i < 32; i++) m.push(r() < 0.45);
    var fill = seg(t, 0.4, 0.8);
    for (i = 0; i < 32; i++) { var x = 80 + (i % 4) * 30, y = 40 + Math.floor(i / 4) * 27.5; g += R(x, y, 30, 27.5, { f: 'none', s: '#fff', sw: 1, rx: 0 }); if (m[i]) g += R(x + 1, y + 1, 28, 25.5, { f: '#9aa39a', rx: 0, op: 1 - fill * ((i % 7) / 7 < fill ? 1 : 0) }); }
    g += T(140, 280, '遮住約一半的影像塊', { size: 12, c: INK3 });
    g += g_(seg(t, 0.2, 0.35), arrow(212, 150, 262, 150) + net(270, 150, 100, 110, PURP, 'ViT-S/16'));
    g += g_(seg(t, 0.4, 0.55), T(470, 100, '① 把遮住的部分補回來', { size: 13, w: 1 }) + T(470, 122, '（學會「人體長什麼樣」）', { size: 11, c: INK3 }));
    g += g_(seg(t, 0.6, 0.75), T(470, 170, '② 同一人的兩張圖特徵要接近', { size: 13, w: 1 }) + T(470, 192, '（判別式對比學習）', { size: 11, c: INK3 }));
    return g + caption(470, 240, '同為自監督預訓練，模型比 SOLIDER 小', {});
  };
  S.m_osnet = function (t) {
    var g = R(40, 90, 70, 110, { f: '#fff', s: '#c5ccc2' }) + person(75, 192, 1.8, 0.3, { mark: IDC[0] });
    var Wt = [0.15, 0.45, 0.3, 0.1];
    for (var i = 0; i < 4; i++) {
      var y = 50 + i * 56, o = seg(t, i * 0.08, i * 0.08 + 0.15);
      g += g_(o, arrow(116, 145, 170, y + 20) + R(176, y, 120, 40, { f: '#fff', s: BLUE }) + Ci(206, y + 20, 4 + i * 3.5, { s: BLUE, sw: 1.5 }) + T(256, y + 25, ['小範圍', '中', '大', '更大'][i], { size: 12 }));
      var w = 120 * Wt[i] * seg(t, 0.4, 0.65);
      g += g_(seg(t, 0.35, 0.45), arrow(300, y + 20, 340, y + 20) + R(350, y + 10, w, 20, { f: ORNG }) + T(356 + w, y + 25, '權重 ' + Wt[i], { size: 11, a: 'start', c: INK3 }));
    }
    g += g_(seg(t, 0.65, 0.8), T(530, 100, '「閘門」依輸入', { size: 13, w: 1 }) + T(530, 122, '決定各分支信多少', { size: 13, w: 1 }) + arrow(530, 140, 530, 170) + bars(480, 240, 8, 9, 50, BLUE, 1, 4));
    return g + caption(320, 290, '同時看細節（鞋）和整體（體型），參數只有 SOLIDER 的 1/20');
  };

  /* ======================= ③ 換裝 ======================= */
  S.m_cal = function (t) {
    var acc = lerp(0.92, 0.34, ease(seg(t, 0.35, 0.85))), g = '';
    [OLIVE, '#3b5b8c'].forEach(function (b, i) { g += R(40, 50 + i * 110, 70, 100, { f: '#fff', s: '#c5ccc2' }) + person(75, 142 + i * 110, 1.7, 0.3, { mark: IDC[0], body: b }) + T(75, 164 + i * 110, i ? '運動服' : '迷彩服', { size: 10, c: INK3 }); });
    g += arrow(116, 150, 150, 150) + net(156, 150, 100, 110, INK3, '骨幹') + arrow(262, 150, 296, 150) + bars(300, 175, 8, 8, 50, BLUE, 1, 3);
    g += arrow(380, 135, 420, 90, BLUE) + R(426, 60, 180, 50, { f: '#fff', s: BLUE }) + T(516, 82, 'ID 分類器：這是誰？', { size: 12, w: 1, c: BLUE }) + T(516, 100, '→ 都是王大明 ✓', { size: 11, c: GOOD });
    g += arrow(380, 165, 420, 210, ORNG) + R(426, 186, 180, 64, { f: '#fff', s: ORNG }) + T(516, 208, '衣服分類器：穿哪套？', { size: 12, w: 1, c: ORNG }) + T(516, 228, '猜對率 ' + Math.round(acc * 100) + '%', { size: 13, w: 1 }) + R(446, 236, 140 * acc, 6, { f: ORNG });
    g += g_(seg(t, 0.25, 0.4), '<path d="M520,260 C520,285 340,285 340,185" fill="none" stroke="' + BAD + '" stroke-width="2" stroke-dasharray="5 4"/>' + T(430, 296, '衣服對抗損失：特徵若能分出衣服，就懲罰骨幹', { size: 12, c: BAD, w: 1 }));
    return g;
  };
  S.m_clip3d = function (t) {
    var g = T(170, 36, '教師（只在訓練時用）', { size: 13, w: 1, c: PURP });
    g += g_(seg(t, 0.05, 0.2), R(50, 50, 240, 50, { f: '#fff', s: PURP }) + T(170, 72, 'CLIP 文字描述', { size: 12, w: 1 }) + T(170, 90, '「高、偏瘦、男性」等不隨衣服變的屬性', { size: 11, c: INK3 }));
    g += g_(seg(t, 0.15, 0.3), R(50, 112, 240, 110, { f: '#fff', s: PURP }) + T(170, 132, '3D 人體（SMPL）體型參數', { size: 12, w: 1 }) + person(120, 210, 1.5, 0, { sil: 1, op: 0.5 }) + '<ellipse cx="120" cy="178" rx="16" ry="34" fill="none" stroke="' + PURP + '" stroke-width="1.5" stroke-dasharray="3 3"/>' + bars(160, 200, 8, 9, 40, PURP, 1, 6));
    g += g_(seg(t, 0.35, 0.5), arrow(296, 130, 360, 130, PURP) + T(328, 120, '蒸餾', { size: 12, c: PURP, w: 1 }));
    g += g_(seg(t, 0.45, 0.6), R(370, 80, 230, 110, { f: '#fff', s: BLUE, sw: 2 }) + T(485, 104, '學生：ResNet-50', { size: 13, w: 1, c: BLUE }) + T(485, 126, '推論只要一張彩色圖', { size: 12 }) + bars(420, 176, 10, 9, 36, BLUE, 1, 6));
    return g + caption(320, 280, '比 CAL 更明確地「看體型」；也是 BRIAR 系統的體型模組');
  };

  /* ======================= ③ 步態 ======================= */
  function p3d(t, base) {
    var g = '';
    for (var i = 5; i >= 0; i--) g += R(40 + i * 8, 70 + i * 8, 54, 100, { f: '#111', op: 0.9 }) + person(67 + i * 8, 162 + i * 8, 1.5, i, { sil: 1 }).replace(/#1c251f/g, '#fff');
    g += T(70, 236, '剪影序列', { size: 12, c: INK3 }) + arrow(150, 125, 186, 125);
    if (base) g += g_(seg(t, 0.1, 0.25), R(192, 80, 120, 90, { f: '#fff', s: PINK, sw: 2 }) + T(252, 118, '逐幀 2D 卷積', { size: 13, w: 1, c: PINK }) + T(252, 140, '（每幀各自算）', { size: 11, c: INK3 }));
    else g += g_(seg(t, 0.1, 0.25), R(192, 70, 120, 50, { f: '#fff', s: PINK, sw: 2 }) + T(252, 100, '2D：空間', { size: 13, w: 1, c: PINK }) + R(192, 130, 120, 50, { f: '#fff', s: PINK, sw: 2 }) + T(252, 160, '1D：時間', { size: 13, w: 1, c: PINK }) + T(252, 200, '偽 3D 卷積（較深的殘差網路）', { size: 11, c: INK3 }));
    g += g_(seg(t, 0.35, 0.5), arrow(318, 125, 352, 125) + R(358, 95, 90, 60, { f: '#fff', s: INK3 }) + T(403, 122, '時間最大池化', { size: 11 }) + T(403, 140, '（整段壓成一張）', { size: 10, c: INK3 }));
    var u = seg(t, 0.55, 0.8);
    g += g_(seg(t, 0.5, 0.6), arrow(452, 125, 486, 125));
    for (i = 0; i < 6; i++) g += R(494, 62 + i * 22, 50, 18, { f: PINK, op: u * (0.4 + i * 0.1) }) + arrow(548, 71 + i * 22, 566, 71 + i * 22, INK3, { op: u }) + R(570, 64 + i * 22, 30 * u, 14, { f: PINK });
    g += T(550, 210, '水平切帶，各自池化後串接', { size: 11, c: INK3, op: u });
    return g + caption(320, 280, base ? '最省的步態模型（每幀約 1.18 GFLOPs），當對照' : '比 GaitBase 深、多了時間卷積；精度與算力最平衡');
  }
  S.m_p3d = function (t) { return p3d(t, false); };
  S.m_gaitbase = function (t) { return p3d(t, true); };
  S.m_simcc = function (t) {
    var g = R(80, 40, 140, 220, { f: '#fff', s: '#c5ccc2' }) + person(150, 250, 4.2, 0.3, { mark: IDC[0], op: 0.5 }), jx = 186, jy = 130;
    var u = seg(t, 0.1, 0.5);
    for (var i = 0; i < 28; i++) { var x = 80 + i * 5, h = 40 * gauss(x, jx, 6) * u + 2; g += R(x, 270 - h, 4, h, { f: ORNG, op: 0.8 }); }
    for (i = 0; i < 44; i++) { var y = 40 + i * 5, w = 40 * gauss(y, jy, 6) * u + 2; g += R(222, y, w, 4, { f: BLUE, op: 0.8 }); }
    g += g_(seg(t, 0.5, 0.65), Ln(jx, jy, jx, 268, ORNG, 1, { dash: '3 3' }) + Ln(jx, jy, 262, jy, BLUE, 1, { dash: '3 3' }) + Ci(jx, jy, 6, { f: '#fff', s: ORNG, sw: 3 }));
    g += g_(seg(t, 0.15, 0.3), T(440, 90, '把 x、y 座標', { size: 14, w: 1 }) + T(440, 114, '各當成一排格子的「分類題」', { size: 14, w: 1 }));
    g += g_(seg(t, 0.55, 0.7), T(440, 170, '橘：x 在哪一格　藍：y 在哪一格', { size: 12, c: INK3 }) + T(440, 196, '峰值交會處就是關節（右手腕）', { size: 12, c: INK3 }));
    return g + caption(440, 250, '比傳統熱圖法省算力，CPU 上可即時', {});
  };
  S.m_skelgait = function (t) {
    var g = R(60, 50, 110, 180, { f: '#111' }) + person(115, 220, 3.2, 0.6, { sil: 1 }).replace(/#1c251f/g, '#fff') + T(115, 250, '剪影', { size: 12, c: INK3 });
    g += R(200, 50, 110, 180, { f: '#fff', s: '#c5ccc2' }) + stick(255, 222, 3.4, 0.6, ORNG) + T(255, 250, '關節點畫成的骨架熱圖', { size: 12, c: INK3 });
    var u = ease(seg(t, 0.3, 0.6));
    g += g_(seg(t, 0.3, 0.4), arrow(320, 140, 360, 140));
    g += R(370, 50, 110, 180, { f: '#111', op: u }) + '<g opacity="' + u.toFixed(2) + '">' + person(425, 220, 3.2, 0.6, { sil: 1 }).replace(/#1c251f/g, '#fff') + stick(425, 222, 3.4, 0.6, ORNG) + '</g>' + T(425, 250, '疊在一起', { size: 12, c: INK3, op: u });
    g += g_(seg(t, 0.65, 0.8), arrow(486, 140, 516, 140) + net(520, 140, 90, 90, PINK, '骨幹'));
    return g + caption(320, 284, '剪影黏在一起時看不清的手腳，由骨架補上');
  };
  S.m_gpgait = function (t) {
    var g = '', u = ease(seg(t, 0.15, 0.55));
    [[110, 230, 1.6, -0.3], [200, 180, 2.4, 0.2], [80, 140, 1.2, 0.5]].forEach(function (q, i) {
      var x = lerp(q[0], 300, u), y = lerp(q[1], 220, u), s = lerp(q[2], 2.6, u), rot = lerp(q[3], 0, u) * 57.3;
      g += '<g transform="rotate(' + rot.toFixed(1) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')">' + stick(x, y, s, i, IDC[i], 1 - u * 0.5) + '</g>';
    });
    g += T(200, 40, '不同位置、大小、方向的骨架', { size: 12, c: INK3, op: 1 - u }) + T(300, 40, '平移、縮放、旋轉到統一座標（HOT）', { size: 13, w: 1, op: u });
    g += g_(seg(t, 0.55, 0.7), arrow(360, 160, 400, 160) + R(406, 110, 100, 100, { f: '#fff', s: ORNG }) + T(456, 140, '描述子（HOD）', { size: 11, w: 1 }) + T(456, 162, '關節、骨段', { size: 11 }) + T(456, 180, '角度', { size: 11 }));
    g += g_(seg(t, 0.7, 0.85), arrow(510, 160, 530, 160) + Ci(560, 130, 6, { f: ORNG }) + Ci(590, 160, 6, { f: ORNG }) + Ci(560, 190, 6, { f: ORNG }) + Ln(560, 130, 590, 160, ORNG, 1.5) + Ln(590, 160, 560, 190, ORNG, 1.5) + Ln(560, 130, 560, 190, ORNG, 1.5) + T(575, 220, '圖卷積', { size: 11, c: INK3 }));
    return g + caption(320, 284, '換資料集時掉得少；代價是正規化把身高資訊也拿掉了');
  };

  /* ======================= ③ 臉 ======================= */
  S.m_adaface = function (t) {
    var g = '', F = [['清楚的臉', 0, 1, '特徵長', '多學難樣本', GOOD], ['模糊的臉', 3, 0.45, '特徵短', '少學難樣本', WARN]];
    g += '<defs><filter id="mblur"><feGaussianBlur stdDeviation="3"/></filter></defs>';
    F.forEach(function (f, i) {
      var y = 50 + i * 120, o = seg(t, i * 0.25, i * 0.25 + 0.2);
      g += g_(o, (f[1] ? '<g filter="url(#mblur)">' : '<g>') + faceIcon(90, y + 45, 34) + '</g>' + T(90, y + 100, f[0], { size: 12, c: INK3 }) + arrow(136, y + 45, 176, y + 45) +
        R(186, y + 32, 200 * f[2] * seg(t, i * 0.25 + 0.1, i * 0.25 + 0.3), 24, { f: PURP }) + T(186, y + 24, '特徵長度＝影像品質的估計', { size: 11, a: 'start', c: INK3 }) + T(400, y + 50, f[3], { size: 12, a: 'start', w: 1 }) + arrow(450, y + 45, 486, y + 45, f[5]) + R(492, y + 26, 120, 38, { f: '#fff', s: f[5], sw: 2 }) + T(552, y + 50, f[4], { size: 13, w: 1, c: f[5] }));
    });
    return g + caption(320, 290, '「自適應邊界」：不讓辨識不出的臉帶壞模型——專為低品質臉設計');
  };
  S.m_magface = function (t) {
    var cx = 160, cy = 160, g = Ci(cx, cy, 70, { s: '#c5ccc2', dash: '5 4' }) + T(cx, cy + 92, '品質門檻', { size: 11, c: INK3 }), V = [[-0.4, 110, 0], [0.2, 125, 0], [0.9, 50, 3], [1.4, 40, 4], [2.4, 100, 0], [3.2, 30, 5]];
    V.forEach(function (v, i) { var L = v[1] * ease(seg(t, i * 0.06, i * 0.06 + 0.3)), x = cx + L * Math.cos(v[0]), y = cy - L * Math.sin(v[0]); g += arrow(cx, cy, x, y, L > 70 ? PURP : '#9aa39a'); });
    g += g_(seg(t, 0.45, 0.6), T(420, 90, '特徵的方向＝是誰', { size: 14, w: 1 }) + T(420, 120, '特徵的長度＝這張臉清不清楚', { size: 14, w: 1, c: PURP }));
    g += g_(seg(t, 0.65, 0.8), T(420, 170, '圈內（太短）的臉不採用', { size: 13, c: WARN, w: 1 }) + T(420, 196, '不用另外訓練品質模型，幾乎零成本', { size: 12, c: INK3 }));
    return g;
  };
  S.m_scrfd = function (t) {
    var g = R(40, 40, 400, 220, { f: '#fff', s: '#c5ccc2' }), P = [[100, 220, 1.6], [190, 200, 1.1], [270, 180, 0.8], [340, 170, 0.6], [400, 160, 0.45]];
    P.forEach(function (q, i) {
      g += person(q[0], q[1], q[2], 0.4 + i, { mark: IDC[i % 5] });
      var o = seg(t, 0.1 + i * 0.1, 0.2 + i * 0.1), hy = q[1] - 42 * q[2], r = 7 * q[2];
      g += g_(o, R(q[0] - r - 2, hy - r - 2, 2 * r + 4, 2 * r + 4, { s: PURP, sw: 1.8 }) + (q[2] > 0.7 ? Ci(q[0] - r * 0.4, hy - r * 0.2, 1.5, { f: PURP }) + Ci(q[0] + r * 0.4, hy - r * 0.2, 1.5, { f: PURP }) + Ci(q[0], hy + r * 0.2, 1.5, { f: PURP }) : ''));
    });
    g += g_(seg(t, 0.55, 0.7), T(540, 100, '連小臉也找得到', { size: 14, w: 1 }) + T(540, 126, '每張臉輸出框＋5 個特徵點', { size: 12 }) + T(540, 150, '→ 直接交給 AdaFace 對齊', { size: 12, c: PURP, w: 1 }));
    return g + caption(320, 290, '輕量臉部偵測器：骨幹與偵測頭以神經架構搜尋調整過');
  };

  /* ======================= ③ 身高 ======================= */
  S.m_pinhole = function (t) {
    var g = Ln(30, 250, 610, 250, '#c5ccc2', 2) + Ln(80, 250, 80, 70, INK3, 2, { dash: '4 3' }) + camera(80, 62, 1.2) + T(60, 160, '架高 h', { size: 12, a: 'end', c: INK3 });
    var px = lerp(260, 470, ease(seg(t, 0, 0.3))), H = 120;
    g += person(px, 250, 2.6, t * 10, { mark: IDC[1] });
    g += g_(seg(t, 0.3, 0.45), Ln(96, 62, px, 250, ORNG, 2) + T((96 + px) / 2 + 10, 170, '看到腳的角度 → 距離', { size: 12, a: 'start', c: ORNG, w: 1 }));
    g += g_(seg(t, 0.5, 0.65), Ln(96, 62, px, 250 - H, BLUE, 2) + T(px - 20, 110, '看到頭頂的角度', { size: 12, a: 'end', c: BLUE, w: 1 }));
    g += g_(seg(t, 0.65, 0.8), Ln(px + 34, 250, px + 34, 250 - H, GOLD, 3) + T(px + 44, 200, '身高', { size: 13, a: 'start', w: 1, c: GOLD }) + T(px + 44, 220, '172 cm', { size: 13, a: 'start', w: 1, c: GOLD }));
    return g + caption(320, 288, '已知架高與俯角就能算；沒有校正資料時，可用多位行人的頭腳點反推');
  };

  /* ======================= ④ 融合 ======================= */
  S.m_zscore = function (t) {
    var u = ease(seg(t, 0.2, 0.6)), D = [['步態（0–1）', PINK, 0.25, 0.08], ['臉（0–100）', PURP, 0.55, 0.18], ['外觀（−1–1）', BLUE, 0.8, 0.05]], g = '';
    D.forEach(function (d, i) {
      var y = 70 + i * 66, m = lerp(d[2], 0.5, u), s = lerp(d[3], 0.1, u), x0 = 140, x1 = 410;
      g += T(132, y + 30, d[0], { size: 12, a: 'end', c: d[1], w: 1 }) + Ln(x0, y + 40, x1, y + 40, '#dde2da', 1) + '<polyline points="' + path(function (x) { return y + 40 - 36 * gauss((x - x0) / (x1 - x0), m, s); }, x0, x1, 80) + '" fill="none" stroke="' + d[1] + '" stroke-width="2.5"/>';
    });
    g += T(275, 40, u < 0.5 ? '原始分數：範圍、單位都不同' : 'Z-score：減平均、除標準差後放在同一把尺', { size: 13, w: 1 });
    g += g_(seg(t, 0.65, 0.8), R(430, 80, 180, 140, { f: '#fff', s: WARN }) + T(520, 106, '問題', { size: 13, w: 1, c: WARN }) + T(520, 132, '分布不對稱時會失真', { size: 12 }) + T(520, 156, '看不到的線索要另外處理', { size: 12 }) + T(520, 186, '→ 只當對照基準', { size: 12, c: INK3 }));
    return g + caption(320, 290, '最簡單的融合方法：正規化後依固定權重相加');
  };
  S.m_gate = function (t) {
    var I = [['外觀分數', BLUE], ['步態分數', PINK], ['臉分數', PURP], ['臉品質', '#9aa39a'], ['缺線索遮罩', '#9aa39a']], g = '';
    I.forEach(function (n, i) { var y = 50 + i * 46; g += g_(seg(t, i * 0.05, i * 0.05 + 0.15), Ci(140, y, 10, { f: n[1] }) + T(124, y + 4, n[0], { size: 12, a: 'end' })); for (var j = 0; j < 4; j++) g += Ln(150, y, 290, 70 + j * 46, '#c5ccc2', 1, { op: seg(t, 0.25, 0.4) }); });
    for (var j = 0; j < 4; j++) g += Ci(300, 70 + j * 46, 10, { f: '#fff', s: INK3, op: seg(t, 0.25, 0.4) }) + Ln(310, 70 + j * 46, 420, 140, '#c5ccc2', 1, { op: seg(t, 0.4, 0.5) });
    g += g_(seg(t, 0.45, 0.6), Ci(430, 140, 16, { f: GOOD }) + T(456, 136, '同一人的機率', { size: 12, a: 'start' }) + T(456, 156, '0.91', { size: 16, a: 'start', w: 1 }));
    g += g_(seg(t, 0.65, 0.8), R(400, 200, 220, 64, { f: '#fff', s: '#c5ccc2' }) + T(510, 224, '能學到線索之間的互動', { size: 12, w: 1 }) + T(510, 246, '例：臉清楚時外觀幾乎不用看', { size: 11, c: INK3 }));
    return g + caption(320, 290, '邏輯迴歸或兩層小網路；需要較多同人／不同人的成對資料');
  };

  /* ======================= ⑤ 時空 ======================= */
  S.m_streid = function (t) {
    var g = T(150, 40, '攝影機 A → B 的轉移時間分布', { size: 12, c: INK3 }), H = [1, 3, 8, 14, 10, 5, 2, 1, 1], k = Math.round(9 * seg(t, 0, 0.35));
    for (var i = 0; i < k; i++) g += R(50 + i * 24, 200 - H[i] * 9, 20, H[i] * 9, { f: ORNG, op: 0.7 });
    g += Ln(46, 200, 270, 200, INK3, 1) + T(160, 220, '時間差（秒）', { size: 11, c: INK3 });
    var C = [['候選 1', 0.82, 3, '常見'], ['候選 2', 0.85, 8, '少見']];
    C.forEach(function (c, i) {
      var y = 70 + i * 100, o = seg(t, 0.4 + i * 0.15, 0.55 + i * 0.15), st = H[c[2]] / 14, fin = 1 / (1 + Math.exp(-6 * (c[1] * st - 0.3)));
      g += g_(o, Ln(60 + c[2] * 24, 60, 60 + c[2] * 24, 200, i ? BAD : GOOD, 2, { dash: '4 3' }) + R(300, y, 310, 76, { f: '#fff', s: '#c5ccc2' }) + T(316, y + 22, c[0], { size: 13, a: 'start', w: 1 }) + T(316, y + 44, '外觀相似度 ' + c[1].toFixed(2) + '　轉移時間 ' + c[3] + '（' + st.toFixed(2) + '）', { size: 12, a: 'start' }) + T(316, y + 66, '→ 合成分數 ' + fin.toFixed(2), { size: 13, a: 'start', w: 1, c: i ? BAD : GOOD }));
    });
    return g + caption(320, 290, '外觀差不多時，轉移時間決定誰比較可能；不改任何模型，只多查一張表');
  };

  /* ======================= ⑥ 分群 ======================= */
  S.m_clustercontrast = function (t) {
    var r = rnd(17), cen = [[170, 100], [460, 110], [320, 220]], g = '', u = ease(seg(t, 0.35, 0.8));
    cen.forEach(function (c, k) { g += star(c[0], c[1], 14, IDC[k], seg(t, 0.1, 0.25)) + T(c[0], c[1] - 22, '群 ' + (k + 1) + ' 的中心（記憶庫）', { size: 11, c: IDC[k], op: seg(t, 0.1, 0.25) }); });
    for (var i = 0; i < 18; i++) { var k = i % 3, x0 = cen[k][0] + (r() - 0.5) * 170, y0 = cen[k][1] + (r() - 0.5) * 110, x = lerp(x0, cen[k][0] + (x0 - cen[k][0]) * 0.35, u), y = lerp(y0, cen[k][1] + (y0 - cen[k][1]) * 0.35, u); g += Ci(x, y, 5, { f: IDC[k], op: 0.85 }); }
    g += g_(seg(t, 0.35, 0.5), T(560, 250, '拉近自己的中心', { size: 12, a: 'end', c: GOOD, w: 1 }) + T(560, 270, '推開其他群的中心', { size: 12, a: 'end', c: BAD, w: 1 }));
    return g + caption(260, 290, '分群 → 對比學習 → 再分群，反覆幾輪；不需人工標註', {});
  };
  S.m_hdbscan = function (t) {
    var r = rnd(23), g = R(30, 30, 580, 230, { f: '#fff', s: '#dde2da' }), C = [[150, 110, 40], [330, 190, 30], [480, 100, 35]], o = seg(t, 0.4, 0.6);
    C.forEach(function (c, k) { for (var i = 0; i < 12; i++) { var a = r() * 6.28, d = r() * c[2]; g += Ci(c[0] + d * Math.cos(a), c[1] + d * Math.sin(a), 4.5, { f: o > 0.5 ? IDC[k] : '#9aa39a' }); } g += Ci(c[0], c[1], c[2] + 12, { s: IDC[k], dash: '5 4', op: o }); });
    for (var i = 0; i < 9; i++) g += Ci(60 + r() * 520, 50 + r() * 190, 4, { f: '#fff', s: '#9aa39a', sw: 1.5 });
    g += g_(seg(t, 0.6, 0.75), T(320, 56, '密的地方成群；稀疏的點標成「雜訊」不硬分', { size: 13, w: 1 }));
    return g + caption(320, 288, '不用事先給群數；但密度不均時參數難調');
  };
  S.m_ise = function (t) {
    var g = '', C = [[230, 150, IDC[0]], [410, 150, IDC[1]]], r = rnd(31);
    C.forEach(function (c) { for (var i = 0; i < 10; i++) g += Ci(c[0] + (r() - 0.5) * 90, c[1] + (r() - 0.5) * 110, 5, { f: c[2] }); });
    g += g_(seg(t, 0.25, 0.4), Ln(320, 60, 320, 240, BAD, 1.5, { dash: '4 4' }) + T(320, 52, '兩群靠得很近，邊界容易混', { size: 12, c: BAD }));
    for (var i = 0; i < 6; i++) { var o = seg(t, 0.45 + i * 0.05, 0.5 + i * 0.05); g += Ci(290 + (i % 2) * 8, 90 + i * 25, 6, { s: IDC[0], sw: 2, op: o }) + Ci(342 - (i % 2) * 8, 90 + i * 25, 6, { s: IDC[1], sw: 2, op: o }); }
    g += g_(seg(t, 0.75, 0.85), T(320, 268, '空心點＝生成的「邊界樣本」，幫模型把兩群分開', { size: 13, w: 1 }));
    return g + caption(320, 292, '混群嚴重時才試');
  };
  S.m_online = function (t) {
    var C = [[160, 140, 0], [320, 160, 1], [480, 130, 2]], g = T(320, 40, '每天的新片段，直接併入已有的人，不必全部重算', { size: 13, w: 1 });
    C.forEach(function (c) { g += Ci(c[0], c[1], 44, { s: IDC[c[2]], dash: '5 4' }) + T(c[0], c[1] + 5, '全域 ID ' + (c[2] + 27), { size: 11, c: IDC[c[2]], w: 1 }); });
    var D = [[0, 1], [2, 1], [1, 1], [-1, 0]];
    D.forEach(function (d, i) {
      var u = ease(seg(t, 0.15 + i * 0.15, 0.3 + i * 0.15)), tx = d[0] < 0 ? 560 : C[d[0]][0] + 20, ty = d[0] < 0 ? 240 : C[d[0]][1] + 22;
      g += R(lerp(80 + i * 60, tx, u) - 9, lerp(270, ty, u) - 5, 18, 10, { f: d[0] < 0 ? '#9aa39a' : IDC[C[d[0]][2]], rx: 5 });
    });
    g += g_(seg(t, 0.75, 0.85), T(560, 222, '新的人 → 新 ID', { size: 11, c: INK3 }));
    return g + caption(320, 290, '跨日長期使用時才需要');
  };
  S.m_gnn = function (t) {
    var r = rnd(41), P = [], g = R(30, 30, 580, 230, { f: '#fff', s: '#dde2da' });
    for (var i = 0; i < 12; i++) P.push([70 + r() * 500, 60 + r() * 180, i % 3]);
    P.forEach(function (p, i) { P.forEach(function (q, j) { if (j <= i) return; var d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d > 170) return; var same = p[2] === q[2]; g += Ln(p[0], p[1], q[0], q[1], same && t > 0.5 ? IDC[p[2]] : '#c5ccc2', same && t > 0.5 ? 3 : 1, { op: same ? 1 : 1 - seg(t, 0.5, 0.7) * 0.8 }); }); });
    P.forEach(function (p) { g += Ci(p[0], p[1], 7, { f: t > 0.5 ? IDC[p[2]] : '#9aa39a' }); });
    g += T(320, 52, t < 0.5 ? '每個片段連到最近的幾個鄰居' : '網路預測每條連線「是不是同一人」', { size: 13, w: 1 });
    return g + caption(320, 288, '百萬筆資料時很強；我們每天只有數百人，規模優勢用不上');
  };

  /* ======================= ⑦ 名冊 ======================= */
  S.m_enroll = function (t) {
    var B = [OLIVE, '#5b6b3a', '#3b5b8c', '#5a6b8a'], N = ['迷彩小帽', '鋼盔', '運動服', '冬季外套'], g = T(320, 34, '王大明：在營區自己的攝影機前，每種服裝各走 2 次', { size: 13, w: 1 });
    B.forEach(function (b, i) {
      var x = 50 + i * 140, o = seg(t, i * 0.1, i * 0.1 + 0.15);
      g += g_(o, R(x, 50, 110, 120, { f: '#fff', s: '#c5ccc2' }) + person(x + 35, 160, 1.7, t * 20, { mark: IDC[0], body: b }) + person(x + 78, 160, 1.7, t * 20 + 1, { mark: IDC[0], body: b }) + T(x + 55, 186, N[i], { size: 12, c: INK3 }));
      g += g_(seg(t, 0.5 + i * 0.08, 0.6 + i * 0.08), arrow(x + 55, 196, x + 55, 214) + bars(x + 20, 262, 7, 8, 40, IDC[i], 1, 50 + i));
    });
    return g + caption(320, 290, '每種服裝一個「原型」；和實際畫面同條件，比證件照有效得多');
  };
  S.m_sapiens = function (t) {
    var blur = t > 0.5, g = R(60, 40, 150, 230, { f: '#fff', s: '#c5ccc2' }) + person(135, 262, 4.6, 0.3, { mark: IDC[0] });
    if (blur) g += R(110, 30, 50, 52, { f: '#9aa39a', rx: 6, op: 0.85 }) + T(135, 22, '臉看不清', { size: 11, c: BAD, w: 1 });
    g += R(108, 34, 54, 52, { s: PURP, sw: 2, dash: '4 3' }) + R(98, 80, 74, 80, { s: BLUE, sw: 2, dash: '4 3' }) + R(70, 34, 130, 232, { s: GOLD, sw: 2, dash: '4 3' });
    var Wt = blur ? [0.1, 0.4, 0.5] : [0.6, 0.25, 0.15], N = [['臉', PURP], ['上半身', BLUE], ['全身', GOLD]];
    g += T(420, 50, blur ? '臉看不清時：自動偏向全身' : '看得到臉時：以臉為主', { size: 14, w: 1 });
    N.forEach(function (n, i) { var w = 200 * Wt[i] * ease(seg(blur ? (t - 0.5) * 2 : t * 2, 0.1, 0.5)); g += T(300, 102 + i * 50, n[0], { size: 13, a: 'end', w: 1, c: n[1] }) + R(310, 86 + i * 50, w, 24, { f: n[1] }) + T(316 + w, 103 + i * 50, (Wt[i] * 100).toFixed(0) + '%', { size: 12, a: 'start', c: INK3 }); });
    return g + caption(420, 260, '單一模型同時處理臉與全身（「視網膜補丁」分配影像塊）', {});
  };

  /* ======================= 其他方法用 ======================= */
  S.m_transreid = function (t) {
    var g = R(50, 60, 110, 170, { f: '#fff', s: '#c5ccc2' }) + person(105, 220, 2.8, 0.3, { mark: IDC[0] });
    for (var i = 0; i < 8; i++) g += R(190 + i * 30, 120, 24, 24, { f: BLUE, op: 0.7 * seg(t, i * 0.03, i * 0.03 + 0.1) });
    g += T(310, 110, '影像塊 token', { size: 11, c: INK3 });
    g += g_(seg(t, 0.35, 0.5), R(190, 160, 110, 26, { f: ORNG }) + T(245, 178, '攝影機 3', { size: 12, c: '#fff', w: 1 }) + R(310, 160, 110, 26, { f: GOLD }) + T(365, 178, '視角：側面', { size: 12, c: '#fff', w: 1 }));
    g += g_(seg(t, 0.55, 0.7), arrow(436, 150, 470, 150) + R(476, 110, 130, 80, { f: '#fff', s: INK3 }) + T(541, 146, 'Transformer', { size: 13, w: 1 }) + T(541, 168, '學會扣掉攝影機偏差', { size: 11, c: INK3 }));
    return g + caption(320, 280, '把「哪台攝影機、什麼視角」也當成輸入，顯式學習偏差');
  };
  S.m_parts = function (t) {
    var g = '', P = [[150, 0], [450, 1]];
    P.forEach(function (p) { g += R(p[0] - 70, 40, 140, 220, { f: '#fff', s: '#c5ccc2' }) + person(p[0], 250, 4.2, 0.3, { mark: IDC[0] }); });
    g += R(380, 170, 140, 90, { f: '#b9c0b5', rx: 2 }) + T(450, 220, '被擋住', { size: 12, c: INK3 });
    var Z = [[60, 100, '頭', 1], [110, 165, '軀幹', 1], [170, 260, '腿', 0]];
    Z.forEach(function (z, i) {
      var o = seg(t, 0.15 + i * 0.2, 0.3 + i * 0.2), c = z[3] ? GOOD : '#9aa39a';
      g += g_(o, R(82, z[0], 136, z[1] - z[0], { s: c, sw: 2, dash: '4 3' }) + R(382, z[0], 136, z[1] - z[0], { s: c, sw: 2, dash: '4 3' }) + T(300, (z[0] + z[1]) / 2 + 5, z[3] ? z[2] + '：比 ✓' : z[2] + '：一邊看不到，不比', { size: 13, w: 1, c: z[3] ? GOOD : INK3 }));
    });
    return g + caption(320, 288, '分部位比對，只比雙方都看得到的部位');
  };

  /* ======================= 其他方法的專屬圖解 ======================= */
  function hard(s, n) { var out = [], cur = '', P = '，。；、：）」』！？,.;:)'; String(s || '').split('').forEach(function (ch) { if (cur.length >= n && P.indexOf(ch) < 0 && !(/[A-Za-z0-9.\-+]/.test(ch) && /[A-Za-z0-9.\-+]$/.test(cur) && cur.length < n + 5)) { out.push(cur); cur = ''; } cur += ch; }); if (cur) out.push(cur); return out; }
  function hl(x, y, s, n, o) { o = o || {}; var L = hard(s, n); if (L.length > (o.max || 4)) { L = L.slice(0, o.max || 4); L[L.length - 1] = L[L.length - 1].slice(0, -1) + '…'; } return L.map(function (l, k) { return T(x, y + k * (o.lh || 15), l, { size: o.size || 11, a: o.a || 'middle', c: o.c || INK, w: o.w }); }).join(''); }
  function badge(x, y, txt, c) { return R(x, y, txt.length * 12 + 18, 22, { f: c, rx: 11 }) + T(x + (txt.length * 12 + 18) / 2, y + 15, txt, { size: 11.5, c: '#fff', w: 1 }); }

  S.m_aim = function (t) {
    var g = T(320, 30, '因果圖：衣服同時影響「看起來」與特徵', { size: 13, w: 1 });
    var N = [['身分', 160, 90, GOOD], ['衣服', 160, 210, ORNG], ['特徵', 400, 150, BLUE]];
    N.forEach(function (n) { g += Ci(n[1], n[2], 34, { f: '#fff', s: n[3], sw: 2.5 }) + T(n[1], n[2] + 5, n[0], { size: 14, w: 1, c: n[3] }); });
    g += arrow(194, 100, 366, 140, GOOD) + arrow(194, 200, 366, 160, ORNG);
    var cutO = seg(t, 0.35, 0.5);
    g += g_(cutO, Ln(270, 165, 290, 195, BAD, 4) + Ln(290, 165, 270, 195, BAD, 4) + T(280, 225, '因果介入：扣掉衣服這條路', { size: 12, c: BAD, w: 1 }));
    g += g_(seg(t, 0.6, 0.75), R(460, 90, 160, 120, { f: '#fff', s: '#c5ccc2' }) + T(540, 114, 'PRCC 換衣 R1', { size: 12, c: INK3 }) + T(500, 146, 'AIM', { size: 12, a: 'end' }) + R(506, 134, 57.9 * 1.5, 14, { f: BLUE }) + T(500, 176, 'CAL', { size: 12, a: 'end' }) + R(506, 164, 55.2 * 1.5, 14, { f: '#9aa39a' }) + T(540, 200, '只小幅勝過', { size: 11, c: INK3 }));
    return g + caption(320, 288, '想法漂亮，但增益小，不值得多花成本');
  };
  S.m_crfiqa = function (t) {
    var g = star(180, 120, 14, GOOD) + T(180, 98, '自己類別的中心', { size: 11, c: GOOD }) + star(460, 120, 14, '#9aa39a') + T(460, 98, '最近的別人中心', { size: 11, c: INK3 });
    var A = [[205, 135, '清楚的臉', GOOD, '品質高'], [330, 150, '模糊的臉', WARN, '品質低']];
    A.forEach(function (a, i) {
      var o = seg(t, 0.15 + i * 0.25, 0.3 + i * 0.25);
      g += g_(o, Ci(a[0], a[1], 7, { f: a[3] }) + Ln(a[0], a[1], 180, 120, GOOD, 1.5, { dash: '3 3' }) + Ln(a[0], a[1], 460, 120, '#9aa39a', 1.5, { dash: '3 3' }) + T(a[0], a[1] + 24, a[2] + ' → ' + a[4], { size: 12, w: 1, c: a[3] }));
    });
    g += g_(seg(t, 0.65, 0.8), T(320, 220, '品質＝離自己中心多近、離別人中心多遠的比例', { size: 13, w: 1 }) + badge(258, 240, '授權：非商用', BAD));
    return g;
  };
  S.m_kpr = function (t) {
    var g = R(220, 40, 200, 220, { f: '#fff', s: ORNG, sw: 2 }) + T(320, 34, '一個框裡有兩個人', { size: 12, c: INK3 });
    var f = seg(t, 0.4, 0.6);
    g += person(290, 250, 3.6, 0.3, { mark: IDC[0] }) + person(360, 250, 3.4, 1.2, { mark: IDC[3], op: 1 - f * 0.75 });
    [[290, 100], [290, 150], [275, 200], [305, 200], [290, 240]].forEach(function (q, i) { g += Ci(q[0], q[1], 6, { f: '#fff', s: GOOD, sw: 3, op: seg(t, 0.1 + i * 0.05, 0.15 + i * 0.05) }); });
    g += g_(seg(t, 0.15, 0.3), T(470, 110, '綠點＝關鍵點提示', { size: 13, a: 'start', w: 1, c: GOOD }) + T(470, 132, '告訴模型「要看的是這個人」', { size: 12, a: 'start' }));
    g += g_(seg(t, 0.6, 0.75), T(470, 180, '後面那個人被淡化', { size: 12, a: 'start', c: INK3 }) + badge(470, 210, '授權含軍事限制', BAD));
    return g + caption(320, 290, '只有出入口人群擠在一起時才需要');
  };
  S.m_hamobe = function (t) {
    var g = R(30, 100, 110, 90, { f: '#e9ece6', s: INK3, sw: 2 }) + T(85, 140, 'CLIP ViT-L/14', { size: 11, w: 1 }) + T(85, 160, '（凍結、很大）', { size: 10, c: INK3 }) + R(118, 106, 16, 12, { f: INK3, rx: 2 });
    var E = [['外觀專家', BLUE, 0.2], ['體型專家', GOLD, 0.35], ['步態專家', PINK, 0.45]];
    E.forEach(function (e, i) { var y = 50 + i * 80, o = seg(t, 0.1 + i * 0.08, 0.2 + i * 0.08); g += g_(o, arrow(144, 145, 194, y + 24) + R(200, y, 120, 48, { f: '#fff', s: e[1], sw: 2 }) + T(260, y + 29, e[0], { size: 13, w: 1, c: e[1] })); var w = 120 * e[2] * seg(t, 0.5, 0.7); g += g_(seg(t, 0.45, 0.55), arrow(324, y + 24, 364, y + 24) + R(370, y + 14, w, 20, { f: e[1] }) + T(376 + w, y + 29, '權重 ' + e[2], { size: 11, a: 'start', c: INK3 })); });
    g += g_(seg(t, 0.4, 0.5), T(440, 30, '雙輸入門控：依這段影片決定信哪位專家', { size: 12, c: INK3 }));
    g += g_(seg(t, 0.7, 0.85), badge(470, 250, '需要大 GPU', BAD));
    return g + caption(260, 290, '最接近「依情況選線索」的研究；真實跨日換衣（MEVID）R1 仍只有約兩成', {});
  };
  S.m_botr50 = function (t) {
    var g = R(40, 80, 130, 120, { f: '#fff', s: BLUE, sw: 2 }) + T(105, 136, 'ResNet-50', { size: 14, w: 1, c: BLUE }) + T(105, 158, '約 25M 參數', { size: 11, c: INK3 });
    var L = ['學習率預熱', '隨機擦除', '標籤平滑', '最後一層不降採樣', 'BNNeck', '中心點損失'];
    L.forEach(function (s, i) { var o = seg(t, 0.1 + i * 0.08, 0.18 + i * 0.08); g += g_(o, T(230, 60 + i * 30, '✓ ' + s, { size: 13, a: 'start', c: GOOD })); });
    g += g_(seg(t, 0.65, 0.8), R(440, 90, 180, 90, { f: '#fff', s: '#c5ccc2' }) + T(530, 118, 'Market R1 94.5', { size: 14, w: 1 }) + T(530, 144, '你們已有', { size: 12 }) + T(530, 166, '新方法至少要贏它', { size: 12, c: GOOD, w: 1 }));
    return g + caption(320, 290, '一組訓練技巧讓普通骨幹變成強基準——當回歸基準');
  };
  S.m_yolo26 = function (t) {
    var g = R(40, 70, 170, 130, { f: '#fff', s: '#c5ccc2' }) + person(90, 190, 1.6, 0.4, { mark: IDC[0] }) + person(160, 180, 1.2, 1, { mark: IDC[1] }) + R(77, 104, 26, 90, { s: BLUE, sw: 2 }) + R(150, 116, 20, 68, { s: BLUE, sw: 2 });
    g += T(125, 222, 'COCO 40.9 · 2.4M · CPU 38.9 ms', { size: 11, c: INK3 });
    g += g_(seg(t, 0.25, 0.4), arrow(220, 135, 270, 135) + R(280, 105, 120, 60, { f: '#fff', s: INK3 }) + T(340, 131, '以網路服務', { size: 12 }) + T(340, 150, '提供給使用者', { size: 12 }));
    g += g_(seg(t, 0.5, 0.65), arrow(406, 135, 446, 135, BAD) + R(452, 95, 170, 80, { f: '#fff3f3', s: BAD, sw: 2 }) + T(537, 122, 'AGPL-3.0', { size: 14, w: 1, c: BAD }) + T(537, 144, '可能要公開', { size: 12 }) + T(537, 162, '整個系統的原始碼', { size: 12 }));
    return g + caption(320, 280, '技術不差，但有乾淨的替代品（YOLOX），就不必冒授權風險');
  };
  S.m_botsort = function (t) {
    var C = [['卡爾曼＋框重疊', '和 ByteTrack 相同', GOOD, '✓'], ['相機運動補償', '攝影機會動時才有用；營區固定 → 無益', BAD, '✗'], ['外觀 ReID', '同制服時幫助小，還多一個模型', WARN, '△']], g = T(320, 30, 'BoT-SORT ＝ 三個零件', { size: 14, w: 1 });
    C.forEach(function (c, i) { var y = 50 + i * 72, o = seg(t, 0.1 + i * 0.2, 0.25 + i * 0.2); g += g_(o, R(60, y, 520, 60, { f: '#fff', s: c[2], sw: 2 }) + T(80, y + 26, c[0], { size: 14, a: 'start', w: 1 }) + T(80, y + 47, c[1], { size: 12, a: 'start', c: INK3 }) + T(555, y + 38, c[3], { size: 24, w: 1, c: c[2] })); });
    return g + caption(320, 284, 'MOT17 分數較高，但多出來的兩個零件在營區用不上');
  };
  S.m_mobileface = function (t) {
    var u = ease(seg(t, 0.1, 0.5)), g = R(60, 60, 200 * u, 200 * u, { f: PURP, op: 0.15, s: PURP }) + T(160, 280, 'R100（AdaFace 等）', { size: 12, c: PURP, op: u });
    g += R(300, 230 - 20, 20, 20, { f: GOOD }) + T(310, 280, 'MobileFaceNet', { size: 12, w: 1, c: GOOD }) + T(310, 198, '0.99M', { size: 12, w: 1, c: GOOD });
    g += g_(seg(t, 0.5, 0.65), T(470, 100, '不到 100 萬參數', { size: 15, w: 1 }) + T(470, 126, 'LFW 99.55（清楚的臉）', { size: 12 }) + T(470, 160, '近距點位臉很多、', { size: 12, c: INK3 }) + T(470, 180, '算力不夠時的備案', { size: 12, c: INK3 }));
    return g;
  };
  S.m_pplr = function (t) {
    var g = R(40, 60, 100, 190, { f: '#fff', s: '#c5ccc2' }) + person(90, 240, 3.2, 0.3, { mark: IDC[0] });
    [['頭', 70, 105], ['上身', 108, 170], ['下身', 172, 245]].forEach(function (p, i) { g += R(44, p[1], 92, p[2] - p[1], { s: IDC[i], sw: 1.5, dash: '3 3', op: seg(t, 0.1 + i * 0.08, 0.2 + i * 0.08) }); });
    var V = [['整體：群 4', GOOD], ['頭：群 4', GOOD], ['上身：群 4', GOOD], ['下身：群 7', BAD]];
    V.forEach(function (v, i) { var o = seg(t, 0.3 + i * 0.08, 0.4 + i * 0.08); g += g_(o, R(200, 60 + i * 40, 150, 30, { f: '#fff', s: v[1] }) + T(275, 80 + i * 40, v[0], { size: 13, c: v[1], w: 1 })); });
    g += g_(seg(t, 0.7, 0.85), T(480, 120, '多數部位同意 → 保留標籤', { size: 13, w: 1, c: GOOD }) + T(480, 150, '不一致的部位 → 降低權重', { size: 13, w: 1, c: BAD }));
    return g + caption(320, 290, '用身體各部位互相校正偽標籤的無監督訓練');
  };
  S.m_instruct = function (t) {
    var A = t < 0.5, g = R(60, 60, 120, 190, { f: '#fff', s: '#c5ccc2' }) + person(120, 240, 3.4, 0.3, { mark: IDC[0] });
    g += A ? Ci(120, 100, 26, { s: PURP, sw: 3 }) + R(92, 196, 56, 46, { s: PURP, sw: 2.5, dash: '4 3' }) : R(90, 120, 60, 86, { s: ORNG, sw: 3 });
    g += R(220, 90, 360, 50, { f: '#fff', s: A ? PURP : ORNG, sw: 2 }) + T(240, 121, '指令：' + (A ? '找同一個人，忽略衣服' : '找穿同樣衣服的人'), { size: 14, a: 'start', w: 1 });
    g += T(400, 180, A ? '→ 模型看臉、髮型、鞋' : '→ 模型看衣服', { size: 13, c: A ? PURP : ORNG, w: 1 });
    g += g_(seg(t % 0.5 * 2, 0.4, 0.7), badge(340, 220, '訓練資料限非商用', BAD));
    return g + caption(320, 290, '一個模型、用文字切換要比對的屬性');
  };
  S.m_3dinvar = function (t) {
    var g = R(40, 60, 110, 190, { f: '#fff', s: '#c5ccc2' }) + person(95, 240, 3.2, 0.3, { mark: IDC[0] }) + T(95, 270, '單張照片', { size: 11, c: INK3 });
    g += g_(seg(t, 0.15, 0.3), arrow(156, 150, 196, 150) + R(200, 70, 120, 170, { f: '#fff', s: GOLD }) + person(260, 230, 3, 0.3, { op: 0.5 }) + '<ellipse cx="260" cy="150" rx="34" ry="78" fill="none" stroke="' + GOLD + '" stroke-dasharray="4 3"/>' + T(260, 260, '重建 3D 穿衣人體', { size: 11, c: INK3 }));
    g += g_(seg(t, 0.4, 0.55), arrow(326, 150, 366, 150) + R(370, 70, 110, 170, { f: '#fff', s: GOLD, sw: 2 }) + person(425, 230, 3, 0, { sil: 1 }) + T(425, 260, '拆掉衣服、姿態', { size: 11, c: INK3 }));
    g += g_(seg(t, 0.6, 0.75), arrow(486, 150, 516, 150) + T(570, 140, '只留體型', { size: 14, w: 1, c: GOLD }) + T(570, 164, 'CCVID R1 70.2', { size: 11, c: INK3 }) + T(570, 182, '與 CAL 融合 84.3', { size: 11, c: GOOD }));
    return g + caption(320, 290, '訓練需要 3D 重建，流程複雜，暫作參考');
  };
  S.m_ccaf = function (t) {
    var g = R(60, 50, 130, 210, { f: '#fff', s: '#c5ccc2' }) + person(125, 250, 3.8, 0.3, { mark: IDC[0] });
    var P = [['頭', 90, 72, 70, '#6250d6'], ['上衣', 120, 102, 80, ORNG], ['褲', 190, 104, 50, GOLD], ['鞋', 240, 106, 14, '#555']];
    P.forEach(function (p, i) { g += R(125 - p[3] / 2, p[1] - 22, p[3], 40, { f: p[4], op: 0.3 * seg(t, 0.1 + i * 0.08, 0.2 + i * 0.08), rx: 4 }) + T(210, p[1] + 2, p[0], { size: 12, a: 'start', c: p[4], w: 1, op: seg(t, 0.1 + i * 0.08, 0.2 + i * 0.08) }); });
    g += g_(seg(t, 0.4, 0.55), arrow(260, 150, 310, 150) + R(316, 110, 120, 80, { f: '#fff', s: INK3 }) + T(376, 146, 'CLIP＋人體解析', { size: 12, w: 1 }) + T(376, 166, '壓低衣服區域', { size: 11, c: INK3 }));
    g += g_(seg(t, 0.65, 0.8), T(530, 130, 'PRCC 換衣 R1 70.4', { size: 13, w: 1, c: GOOD }) + T(530, 154, '（目前最高）', { size: 11, c: INK3 }) + badge(470, 180, '沒有釋出程式碼', BAD));
    return g + caption(320, 290, '先把人分成頭、上衣、褲、鞋，再讓模型少看衣服');
  };
  S.m_dskc = function (t) {
    var g = T(320, 30, '新場域一個接一個來，模型跟著更新', { size: 13, w: 1 });
    for (var i = 0; i < 3; i++) {
      var x = 70 + i * 190, o = seg(t, i * 0.25, i * 0.25 + 0.2), gone = t > i * 0.25 + 0.3 && i < 2;
      g += g_(o, R(x, 60, 130, 80, { f: '#fff', s: '#c5ccc2' }) + T(x + 65, 84, ['第 1 個月', '第 2 個月', '第 3 個月'][i], { size: 12, w: 1 }) + thumb(x + 20, 92, 26, 40, i) + thumb(x + 52, 92, 26, 40, i + 1) + thumb(x + 84, 92, 26, 40, i + 2));
      if (gone) g += R(x, 60, 130, 80, { f: PAPER, op: 0.75 }) + T(x + 65, 108, '舊影像已刪除', { size: 11, c: INK3 });
      g += g_(o, arrow(x + 65, 146, x + 65, 176) + R(x + 15, 180, 100, 40, { f: '#fff', s: PURP }) + T(x + 65, 205, '模型 v' + (i + 1), { size: 12, w: 1, c: PURP }));
      if (i < 2) g += g_(o, arrow(x + 118, 200, x + 202, 200, PURP));
    }
    return g + caption(320, 262, '不保留舊影像也能累積知識：契合隱私需求，但仍屬研究', {});
  };

  /* ======================= 在我們的條件下：闖關 ======================= */
  S.m_gauntlet = function (t, st) {
    var us = (st.p && st.p.us) || {}, G = [], stop = -1, g = '';
    DIMS.forEach(function (d, i) { var v = us[d[0]] || ['n', '—']; G.push(v); if (stop < 0 && v[0] === 'b') stop = i; });
    var X = function (i) { return 90 + i * 115; }, endX = stop >= 0 ? X(stop) - 34 : 600;
    var px = lerp(20, endX, ease(seg(t, 0, 0.7)));
    g += Ln(10, 150, 630, 150, '#dde2da', 6);
    DIMS.forEach(function (d, i) {
      var v = G[i], c = LV[v[0]][1], reached = px >= X(i) - 36 || (stop === i && t > 0.68), after = stop >= 0 && i > stop && t > 0.72, o = after ? 0.45 : 1;
      g += g_(o, R(X(i) - 18, 90, 36, 120, { f: reached || after ? c : '#dde2da', op: reached || after ? 0.25 : 1, s: reached || after ? c : '#c5ccc2', sw: 2, rx: 4 }) + T(X(i), 80, d[1], { size: 12, w: 1 }));
      if (reached || after) g += g_(o, T(X(i), 158, LV[v[0]][0], { size: 22, w: 1, c: c }) + hl(X(i), 230, v[1], 7, { size: 10.5, max: 4, lh: 14, c: INK }));
    });
    g += person(px, 172, 1.2, t * 30, { mark: IDC[0] }) + chip(Math.max(4, Math.min(566, px - 34)), 40, 68, OLIVE, (st.p.name || '').replace(/（.*?）/g, '').slice(0, 9));
    if (stop >= 0 && t > 0.7) g += g_(seg(t, 0.7, 0.8), R(X(stop) - 60, 2, 120, 26, { f: BAD, rx: 13 }) + T(X(stop), 20, '卡在這一關', { size: 13, w: 1, c: '#fff' }));
    else if (t > 0.72) g += g_(seg(t, 0.72, 0.82), R(250, 2, 140, 26, { f: GOOD, rx: 13 }) + T(320, 20, '全部通過（△ 要注意）', { size: 12, w: 1, c: '#fff' }));
    return g;
  };

  /* ======================= 每張卡要播什麼 ======================= */
  var CORE = {
    'YOLOX-S': 'm_yolox', 'YOLOv7（你現有）': 'm_yolov7', 'NanoDet-Plus-m': 'm_nanodet', 'ByteTrack': 'o2_bytetrack', '片段淨化（自行實作）': 'o2_purify', 'OC-SORT': 'm_ocsort',
    'SOLIDER Swin-S': 'm_solider', 'CLIP-ReID ViT-B/16': 'm_clipreid', 'PersonViT ViT-S/16': 'm_mim', 'OSNet x1.0': 'm_osnet', 'CAL': 'm_cal', 'CLIP3DReID': 'm_clip3d',
    'DeepGaitV2-P3D': 'm_p3d', 'RTMPose（MMPose）': 'm_simcc', 'GaitBase': 'm_gaitbase', 'SkeletonGait++': 'm_skelgait', 'GPGait': 'm_gpgait',
    'AdaFace R100': 'm_adaface', 'MagFace': 'm_magface', 'SCRFD-2.5GF': 'm_scrfd', '單目身高估計（自行實作）': 'm_pinhole',
    '似然比融合（對數相加）': 'o4_kde', '品質條件化（依品質調整證據）': 'o4_strata', '品質加權片段聚合': 'o3_quality', 'Z-score／Min-Max 正規化後加總': 'm_zscore', '小型學習式門控': 'm_gate',
    'st-ReID': 'm_streid', '不可能配對規則（cannot-link）': 'o5_walk', '畫面座標轉平面圖（單應性）': 'calib',
    '約束式平均連結凝聚分群': 'o6_merge', 'Cluster Contrast': 'm_clustercontrast', 'HDBSCAN': 'm_hdbscan', 'ISE': 'm_ise', 'OGMC 線上分群': 'm_online',
    '整群多證據比對＋第一第二名間隔': 'o7_margin', '刷卡紀錄當輔助證據與一致性檢查': 'o7_card', '在營區攝影機下建立註冊資料': 'm_enroll', 'SapiensID': 'm_sapiens',
    // 其他方法（一句話）
    'YOLO26n': 'm_yolo26', 'DanceTrack（外觀一樣時的追蹤基準）': 'x_dance', 'BoT-SORT': 'm_botsort', 'PU-ReID（穿制服的人員再辨識）': 'x_ortho', 'SC-ReID（同衣服人員再辨識）': 'x_sameclothes',
    'TransReID': 'm_transreid', 'BoT（BagTricks）R50': 'm_botr50', 'AIM': 'm_aim', 'BigGait（ViT-S）': 'x_frozen', 'MobileFaceNet': 'm_mobileface', 'CR-FIQA': 'm_crfiqa',
    'BPBreID': 'm_parts', 'KPR': 'm_kpr', '姓名條文字辨識（偵測＋OCR）': 'x_tag', '階級章與臂章分類': 'x_tag', 'FarSight／BRIAR 融合': 'x_quality_gate', 'HAMoBE': 'm_hamobe',
    'AI City Challenge 多攝影機追蹤方法': 'x_anchor_cluster', 'PPLR': 'm_pplr', '圖神經網路分群（Linkage-GCN、STAR-FC 等）': 'm_gnn', '門禁防尾隨與刷卡比臉': 'x_cardface', '開放世界 ReID': 'o7_out', 'Instruct-ReID': 'm_instruct', '3DInvarReID': 'm_3dinvar', 'CCAF': 'm_ccaf', 'DSKC': 'm_dskc'
  };
  var IN = { 1: 'frame', 2: 'boxes', 4: 'scores', 5: 'tracklets', 6: 'tracklets', 7: 'group' };
  var INX = { app: 'crop', cc: 'crop', gait: 'seq', face: 'face', body: 'tracklets' };
  var OUT = { 1: 'boxes', 2: 'tracklets', 4: 'evidence', 5: 'constraints', 6: 'clusters', 7: 'identity' };
  var OUTX = { app: 'vec', cc: 'vec', gait: 'vec', face: 'vec', body: 'height' };
  var OVR = {
    'RTMPose（MMPose）': ['crop', 'kp'], 'GPGait': ['skel', 'vec'], 'SCRFD-2.5GF': ['frame', 'boxes'], '小型學習式門控': ['scores', 'prob'], 'st-ReID': ['tracklets', 'prob'], '畫面座標轉平面圖（單應性）': ['frame', 'plan'],
    'Cluster Contrast': ['tracklets', 'model'], '在營區攝影機下建立註冊資料': ['videos', 'protos'], 'SapiensID': ['crop', 'vec'], '品質加權片段聚合': ['tracklets', 'vec'], '片段淨化（自行實作）': ['tracklets', 'tracklets']
  };
  var GC = { app: BLUE, cc: BLUE, gait: PINK, face: PURP, body: GOLD };
  var STEPN = ['', '攝影機與偵測', '追蹤成片段', '身分線索特徵', '融合成證據', '時空約束', '分群', '比對名冊'];
  var DK = FlowPlay.DURK; DK.m_in = 5000; DK.m_out = 5000; DK.m_train = 6000; DK.m_us = 7500; DK.m_gauntlet = 9500; DK.m_verdict = 6500; DK.m_idea = 6000;

  function spec(st, g, c) {
    var m = CH.steps.info(c), nm = c.m || (c.x && c.x.n) || m.n, h = c.how, core = CORE[nm], gk = g.key;
    var mline = '第 ' + st.id + ' 步「' + STEPN[st.id] + '」' + (g.n ? '・' + g.n : '') + ' 的候選方法';
    if (h) {
      var io = OVR[nm] || [INX[gk] || IN[st.id], OUTX[gk] || OUT[st.id]];
      var flow = [];
      if (h.in) flow.push(['輸入', h.in, st.id, 'm_in', { kind: io[0], text: h.in }]);
      flow.push(['處理', h.proc || c.idea, st.id, core || 'm_idea', { name: m.n, v: m.v, idea: c.idea }]);
      if (h.train) flow.push(['訓練', h.train, st.id, 'm_train', { text: h.train }]);
      if (h.out) flow.push(['輸出', h.out, st.id, 'm_out', { kind: io[1], c: GC[gk] || BLUE, text: h.out, res: m.res, cost: m.cost }]);
      if (c.us) flow.push(['在我們的條件下', '依序闖五關：路邊俯角、換裝、5 人交錯、CPU 算力、軍用授權；遇到 ✗ 就卡住', st.id, 'm_gauntlet', { us: c.us, name: m.n }]);
      return { title: m.n, sub: c.idea, flow: flow, keyLabel: '關鍵差異', key: h.key || c.idea, m: mline };
    }
    return { title: m.n, sub: c.idea, m: mline, keyLabel: '判定理由', key: c.fit || '',
      flow: [['概念', c.idea, st.id, core || 'm_idea', { name: m.n, v: m.v, idea: c.idea }], ['判定', c.fit || '', st.id, 'm_verdict', { tag: c.tag, fit: c.fit }]] };
  }

  var CH = global.CH = global.CH || {};
  CH.methodplay = {
    init: function () {
      var sec = document.getElementById('ch-methods');
      if (!sec || sec.getAttribute('data-mp-ready')) return;
      sec.setAttribute('data-mp-ready', '1');
      sec.addEventListener('click', function (e) {
        var b = e.target.closest('[data-mp]'); if (!b) return;
        var p = b.getAttribute('data-mp').split('-').map(Number), st = global.STEPS.filter(function (s) { return s.id === p[0]; })[0], g = st.groups[p[1]], c = g.cards[p[2]];
        FlowPlay.open(spec(st, g, c));
      });
    }
  };
  global.MethodPlay = { spec: spec, CORE: CORE };
})(window);
