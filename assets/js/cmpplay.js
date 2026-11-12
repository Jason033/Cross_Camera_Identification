/* cmpplay.js — 第 2 章「並排比較」動畫：同一組的方法放在一起，直接比差在哪
   每組幾幕：原理一覽 → 文獻成績（標明資料集）→ 營區情境（推論）→ 需要什麼、授權 → 在我們的條件下（矩陣）→ 結論
   文獻數字取自 research.js／steps.js；營區情境沒有公開結果，畫面上標「推論」。 */
(function (global) {
  'use strict';
  if (!global.FlowPlay) return;
  var K = FlowPlay.kit, S = FlowPlay.SCN;
  var IDC = K.IDC, INK = K.INK, INK3 = K.INK3, OLIVE = K.OLIVE, PAPER = K.PAPER;
  var T = K.T, R = K.R, Ln = K.Ln, Ci = K.Ci, arrow = K.arrow, person = K.person, camera = K.camera, thumb = K.thumb, caption = K.caption, panel = K.panel, star = K.star, chip = K.chip, faceIcon = K.faceIcon, seg = K.seg, ease = K.ease, lerp = K.lerp, rnd = K.rnd, op = K.op, wrap = K.wrap;
  var GOOD = '#0c8a0c', BAD = '#c93434', WARN = '#b97e00', BLUE = '#2a78d6', PURP = '#6250d6', PINK = '#d55181', ORNG = '#eb6834', GOLD = '#9a7b12';
  var TAGC = { use: ['第一版採用', '#0c8a0c'], base: ['對照基準', '#2a78d6'], try: ['之後試用', '#b97e00'], ref: ['參考思路', '#6f7a71'], skip: ['暫不採用', '#c93434'] };
  var LV = { g: ['✓', GOOD], m: ['△', WARN], b: ['✗', BAD], n: ['—', '#9aa39a'] };
  function g_(o, s) { return '<g' + op(o) + '>' + s + '</g>'; }
  function cut(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function hard(s, n) { var out = [], cur = '', P = '，。；、：）」』！？,.;:)'; String(s || '').split('').forEach(function (ch) { if (cur.length >= n && P.indexOf(ch) < 0 && !(/[A-Za-z0-9.\-+]/.test(ch) && /[A-Za-z0-9.\-+]$/.test(cur) && cur.length < n + 5)) { out.push(cur); cur = ''; } cur += ch; }); if (cur) out.push(cur); return out; }
  function lines(x, y, s, n, o) { o = o || {}; var L = hard(s, n); if (L.length > (o.max || 4)) { L = L.slice(0, o.max || 4); L[L.length - 1] = L[L.length - 1].slice(0, -1) + '…'; } return L.map(function (l, k) { return T(x, y + k * (o.lh || 16), l, { size: o.size || 11, a: o.a || 'middle', c: o.c || INK, w: o.w }); }).join(''); }
  function evTag(ev) { return ev === 'proven' ? R(530, 10, 100, 20, { f: INK, rx: 10 }) + T(580, 24, '文獻數字', { size: 11, c: '#fff', w: 1 }) : R(530, 10, 100, 20, { f: '#fff', s: WARN, rx: 10 }) + T(580, 24, '推論・待實測', { size: 11, c: WARN, w: 1 }); }
  var CARDS = {};
  function card(n) {
    if (CARDS[n]) return CARDS[n];
    var r = null;
    (global.STEPS || []).forEach(function (st) { st.groups.forEach(function (g) { g.cards.forEach(function (c) { if ((c.m || (c.x && c.x.n)) === n) r = { st: st, g: g, c: c, m: CH.steps.info(c) }; }); }); });
    return (CARDS[n] = r);
  }
  function short(n) { return n.replace(/（.*?）/g, '').replace(/ ViT-[BS]\/16| x1\.0| Swin-S| R100|-2\.5GF|-Plus-m|-P3D/g, ''); }

  /* ======================= 共用的比較場景 ======================= */
  S.c_idea = function (t, st) {
    var p = st.p, n = p.cols.length, w = (600 - (n - 1) * 8) / n, cpl = Math.max(6, Math.floor((w - 16) / 12)), g = '';
    p.cols.forEach(function (col, i) {
      var x = 20 + i * (w + 8), o = seg(t, i * 0.1, i * 0.1 + 0.2), tg = TAGC[col.tag] || TAGC.ref, pick = col.tag === 'use';
      g += g_(o, R(x, 34, w, 236, { f: pick ? '#f4f9f0' : '#fff', s: pick ? GOOD : '#c5ccc2', sw: pick ? 2.5 : 1.2 }) +
        lines(x + w / 2, 56, short(col.n), cpl, { size: 13, w: 1, max: 2, lh: 17 }) +
        R(x + w / 2 - 38, 82, 76, 18, { f: tg[1], rx: 9 }) + T(x + w / 2, 95, tg[0], { size: 10.5, c: '#fff', w: 1 }) +
        (col.inp ? T(x + w / 2, 120, '輸入：' + cut(col.inp, cpl - 3), { size: 10.5, c: INK3 }) : '') +
        Ln(x + 10, 130, x + w - 10, 130, '#dde2da', 1) + lines(x + w / 2, 150, col.idea, cpl, { size: 11.5, max: 7, lh: 17 }));
    });
    return g;
  };
  S.c_bars = function (t, st) {
    var p = st.p, rows = p.rows, max = p.max || Math.max.apply(null, rows.map(function (r) { return r[1] || 0; })) * 1.15, g = evTag(p.ev) + T(20, 24, p.metric, { size: 14, a: 'start', w: 1 });
    var vals = rows.filter(function (r) { return r[1] != null; }).map(function (r) { return r[1]; }), best = p.better === 'low' ? Math.min.apply(null, vals) : Math.max.apply(null, vals), rh = Math.min(40, 220 / rows.length);
    rows.forEach(function (r, i) {
      var y = 46 + i * rh, o = ease(seg(t, 0.05 + i * 0.08, 0.35 + i * 0.08)), w = r[1] == null ? 0 : 380 * (r[1] / max) * o, isb = r[1] === best;
      g += T(176, y + rh / 2 + 4, cut(short(r[0]), 15), { size: 12, a: 'end', w: isb ? 1 : 0 });
      if (r[1] == null) g += R(186, y + 6, 380, rh - 12, { f: '#fff', s: '#c5ccc2', dash: '4 3' }) + T(196, y + rh / 2 + 4, r[2] || '未收錄', { size: 11, a: 'start', c: INK3 });
      else g += R(186, y + 6, w, rh - 12, { f: isb ? GOOD : (r[3] || '#9aa39a'), op: 0.85 }) + T(192 + w, y + rh / 2 + 4, r[2] || String(r[1]) + (p.unit || ''), { size: 12, a: 'start', w: isb ? 1 : 0 });
    });
    return g + (p.note ? caption(320, 290, p.note) : '');
  };
  S.c_req = function (t, st) {
    var p = st.p, nc = p.cols.length, cw = (600 - 150) / nc, rh = Math.min(42, 230 / p.rows.length), g = '';
    p.cols.forEach(function (c, j) { g += T(170 + j * cw + cw / 2, 34, c, { size: 12, w: 1, c: INK3 }); });
    p.rows.forEach(function (r, i) {
      var y = 44 + i * rh, o = seg(t, 0.05 + i * 0.1, 0.18 + i * 0.1);
      g += g_(o, R(20, y, 600, rh - 4, { f: i % 2 ? '#fff' : PAPER, rx: 2 }) + T(30, y + rh / 2 + 2, cut(short(r[0]), 12), { size: 12.5, a: 'start', w: 1 }));
      r.slice(1).forEach(function (cell, j) {
        var lv = /^[gmb] /.test(cell) ? cell[0] : null, txt = lv ? cell.slice(2) : cell, x = 170 + j * cw;
        g += g_(o, (lv ? Ci(x + 12, y + rh / 2 - 2, 7, { f: LV[lv][1] }) : '') + T(x + (lv ? 24 : cw / 2), y + rh / 2 + 2, cut(txt, Math.floor((cw - (lv ? 28 : 8)) / 11)), { size: 11.5, a: lv ? 'start' : 'middle', c: lv ? INK : INK3 }));
      });
    });
    return g + (p.note ? caption(320, 292, p.note) : '');
  };
  var DIMS = [['ang', '路邊俯角'], ['cloth', '換裝'], ['grp', '5 人交錯'], ['cpu', 'CPU 算力'], ['lic', '軍用授權']];
  S.c_matrix = function (t, st) {
    var p = st.p, rows = p.names.map(card).filter(function (x) { return x && x.c.us; }), rh = Math.min(44, 220 / rows.length), cw = 86, g = T(320, 22, '在我們的條件下', { size: 14, w: 1 });
    DIMS.forEach(function (d, j) { g += T(200 + j * cw + cw / 2, 44, d[1], { size: 12, w: 1, c: INK3 }); });
    rows.forEach(function (r, i) {
      var y = 54 + i * rh, o = seg(t, 0.05 + i * 0.12, 0.2 + i * 0.12), tg = TAGC[r.c.tag] || TAGC.ref;
      g += g_(o, R(20, y, 610, rh - 4, { f: i % 2 ? '#fff' : PAPER, rx: 2 }) + R(26, y + rh / 2 - 7, 6, 14, { f: tg[1], rx: 2 }) + T(38, y + rh / 2 + 2, cut(short(r.m.n), 12), { size: 12, a: 'start', w: 1 }));
      DIMS.forEach(function (d, j) { var v = (r.c.us[d[0]] || ['n'])[0]; g += g_(o, R(204 + j * cw, y + 4, cw - 8, rh - 12, { f: LV[v][1], op: 0.16, rx: 4 }) + T(200 + j * cw + cw / 2, y + rh / 2 + 4, LV[v][0], { size: 16, w: 1, c: LV[v][1] })); });
    });
    return g + caption(320, 292, '✓ 有利　△ 有條件　✗ 不利（細節見各卡片）');
  };

  /* ======================= 各組的情境比較（推論） ======================= */
  S.c_det = function (t) {
    var M = [['YOLOX-S', [1, 1, 1], '26.8 GFLOPs', 'Apache-2.0', GOOD], ['YOLOv7', [1, 1, 1], '較重', 'GPL-3.0', BAD], ['NanoDet', [1, 1, 0], 'CPU 5–8 ms', 'Apache-2.0', GOOD], ['YOLO26n', [1, 1, 1], 'CPU 38.9 ms', 'AGPL-3.0', BAD]], g = evTag('inferred') + T(20, 24, '同一個畫面：近、中、遠三個人', { size: 14, a: 'start', w: 1 });
    M.forEach(function (m, i) {
      var x = 20 + i * 152, P = [[x + 34, 168, 1], [x + 84, 152, 0.6], [x + 124, 138, 0.32]];
      g += R(x, 44, 144, 136, { f: '#fff', s: '#c5ccc2' });
      P.forEach(function (q, k) { g += person(q[0], q[1], q[2], 0.4 + k, { mark: IDC[k] }); var o = seg(t, 0.15 + k * 0.15, 0.25 + k * 0.15); g += m[1][k] ? R(q[0] - 14 * q[2], q[1] - 54 * q[2], 28 * q[2], 58 * q[2], { s: IDC[k], sw: 2, op: o }) : Ci(q[0], q[1] - 26 * q[2], 14, { s: BAD, sw: 2, dash: '3 2', op: o }) + T(q[0], q[1] - 46 * q[2] - 6, '漏', { size: 11, c: BAD, w: 1, op: o }); });
      g += T(x + 72, 200, m[0], { size: 13, w: 1 }) + T(x + 72, 220, m[2], { size: 11, c: INK3 }) + g_(seg(t, 0.6, 0.75), R(x + 22, 230, 100, 20, { f: m[4], rx: 10, op: 0.9 }) + T(x + 72, 244, m[3], { size: 11, c: '#fff', w: 1 }));
    });
    return g + caption(320, 284, '輕量模型最容易漏掉遠處的小人；授權是另一道門檻');
  };
  S.c_trk = function (t) {
    var M = [['ByteTrack', 'swap', '轉彎後換了 ID（推論）'], ['OC-SORT', 'ok', '停走與轉彎都接得住'], ['BoT-SORT', 'reid', '接得住，但多一個外觀模型；同制服時外觀幫助小']], g = evTag('inferred') + T(20, 24, '同制服兩人交錯，其中一人停下後轉彎', { size: 14, a: 'start', w: 1 });
    M.forEach(function (m, i) {
      var x = 20 + i * 204, u = seg(t, 0, 0.8), ax = u < 0.45 ? lerp(x + 20, x + 100, u / 0.45) : x + 100, ay = u < 0.55 ? 170 : lerp(170, 70, (u - 0.55) / 0.45), bx = lerp(x + 180, x + 20, u);
      g += R(x, 44, 196, 160, { f: '#fff', s: '#c5ccc2' }) + person(ax, ay + 20, 0.9, t * 30, { mark: '#9aa39a' }) + person(bx, 190, 0.9, t * 30 + 1, { mark: '#9aa39a' });
      var sw = m[1] === 'swap' && u > 0.65;
      g += chip(ax - 22, ay - 44, 44, sw ? BAD : IDC[0], sw ? 'ID 3' : 'ID 1') + chip(bx - 22, 128, 44, IDC[1], 'ID 2');
      if (m[1] === 'reid') g += g_(seg(t, 0.2, 0.3), R(x + 130, 52, 58, 18, { f: PURP, rx: 9 }) + T(x + 159, 65, '+ReID', { size: 10, c: '#fff', w: 1 }));
      g += T(x + 98, 224, m[0], { size: 13, w: 1 }) + g_(seg(t, 0.7, 0.85), lines(x + 98, 244, m[2], 16, { size: 11, c: m[1] === 'swap' ? BAD : INK3, max: 2 }));
    });
    return g + caption(320, 290, '同制服時外觀幫不上忙（DanceTrack 的結論），追蹤主要靠運動模型');
  };
  S.c_facepipe = function (t) {
    var g = T(20, 24, '三個方法不是互相取代，而是串成一條線', { size: 14, a: 'start', w: 1 });
    var ST = [['SCRFD', '找臉＋5 個點', 150, '注意：授權非商用，正式版要換'], ['MagFace', '這張臉能不能用', 300, '替代：CR-FIQA（非商用）'], ['AdaFace', '比對是誰', 450, '備案：MobileFaceNet（輕量）']];
    g += R(30, 70, 70, 90, { f: '#fff', s: '#c5ccc2' }) + person(65, 154, 1.6, 0.3, { mark: IDC[0] }) + T(65, 178, '近距畫面', { size: 11, c: INK3 });
    ST.forEach(function (s, i) { g += arrow(s[2] - 44, 110, s[2] - 6, 110) + R(s[2], 80, 100, 60, { f: '#fff', s: PURP, sw: 2 }) + T(s[2] + 50, 106, s[0], { size: 14, w: 1, c: PURP }) + T(s[2] + 50, 126, s[1], { size: 11 }) + lines(s[2] + 50, 166, s[3], 9, { size: 10.5, c: INK3, max: 3, lh: 14 }); });
    g += arrow(556, 110, 586, 110) + T(606, 104, '身分', { size: 12, w: 1 });
    var u = seg(t, 0.05, 0.5);
    g += faceIcon(lerp(60, 600, u), 240, 14, { s: GOOD }) + T(lerp(60, 600, u), 270, '清楚的臉', { size: 11, c: GOOD });
    var v = seg(t, 0.4, 0.75), bx = lerp(60, 340, v);
    g += '<g opacity=".8">' + faceIcon(bx, 240, 14, { s: WARN }) + '</g>' + (v >= 1 ? T(340, 214, '品質不足 → 不採用', { size: 12, c: WARN, w: 1 }) + Ln(330, 222, 350, 258, BAD, 3) : T(bx, 270, '模糊的臉', { size: 11, c: WARN }));
    return g;
  };
  S.c_fuse = function (t) {
    var g = T(20, 24, '同一組輸入：臉看不到、步態品質低', { size: 14, a: 'start', w: 1 }) + evTag('inferred');
    [['外觀', '0.60（品質中）', BLUE], ['步態', '0.70（品質低）', PINK], ['臉', '看不到', '#9aa39a']].forEach(function (c, i) { g += R(40 + i * 190, 40, 170, 30, { f: '#fff', s: c[2] }) + T(125 + i * 190, 60, c[0] + '：' + c[1], { size: 12, w: 1, c: c[2] }); });
    var M = [['Z-score 加總', 0.25, BAD, '臉當 0 分 → 總分被拉低，誤判不同人'], ['似然比＋品質', 0.72, GOOD, '臉證據 0；步態證據因品質低自動變小'], ['學習式門控', 0.6, WARN, '訓練資料有這種情況就準，沒見過就不穩'], ['FarSight／HAMoBE', 0.75, WARN, '處理得好，但要多個 GPU 大模型']];
    M.forEach(function (m, i) {
      var x = 20 + i * 152, o = seg(t, 0.2 + i * 0.12, 0.35 + i * 0.12), w = 120 * m[1] * ease(o);
      g += g_(o, R(x, 90, 144, 180, { f: '#fff', s: '#c5ccc2' }) + T(x + 72, 112, m[0], { size: 12.5, w: 1 }) + R(x + 12, 128, 120, 14, { f: '#eee' }) + R(x + 12, 128, w, 14, { f: m[2] }) + T(x + 72, 162, '同一人的判斷', { size: 10.5, c: INK3 }) + lines(x + 72, 190, m[3], 11, { size: 11, max: 4 }));
    });
    return g + caption(320, 290, '真實情況常常缺線索、品質不一，融合方法要能自然處理');
  };
  S.c_clu = function (t) {
    var r = rnd(19), base = [];
    for (var i = 0; i < 15; i++) base.push(i < 12 ? [i % 3, (r() - 0.5) * 40, (r() - 0.5) * 34] : [-1, r() * 110 - 55, r() * 90 - 45]);
    var M = [['凝聚分群（約束）', 'agg', '3 群；1 段證據不足 → 未歸群'], ['HDBSCAN', 'hdb', '3 群；稀疏的點標成雜訊，不分'], ['OGMC 線上', 'onl', '第二天的新片段直接併入'], ['圖神經網路', 'gnn', '要大量標註訓練；我們規模用不上']], g = '';
    M.forEach(function (m, i) {
      var x = 20 + i * 152, cx = [x + 40, x + 104, x + 72], cy = [90, 90, 160], u = ease(seg(t, 0.1, 0.55));
      g += R(x, 30, 144, 190, { f: '#fff', s: '#c5ccc2' });
      base.forEach(function (b, k) {
        var x0 = x + 72 + (k * 37 % 120) - 60, y0 = 120 + (k * 53 % 140) - 70, tx, ty, col = '#9aa39a';
        if (b[0] >= 0) { tx = cx[b[0]] + b[1] * 0.5; ty = cy[b[0]] + b[2] * 0.5; col = m[1] === 'gnn' && u < 0.99 ? '#9aa39a' : IDC[b[0]]; }
        else { tx = x + 72 + b[1]; ty = 120 + b[2]; }
        var px = m[1] === 'gnn' ? x0 : lerp(x0, tx, u), py = m[1] === 'gnn' ? y0 : lerp(y0, ty, u);
        if (m[1] === 'onl' && k > 9 && t < 0.6) return;
        g += Ci(px, py, 4.5, { f: b[0] < 0 ? '#fff' : (m[1] === 'gnn' ? '#9aa39a' : col), s: b[0] < 0 ? '#9aa39a' : null, sw: 1.5 });
      });
      if (m[1] !== 'gnn') cx.forEach(function (c, k) { g += Ci(c, cy[k], 30, { s: IDC[k], dash: '4 3', op: seg(t, 0.55, 0.65) }); });
      if (m[1] === 'agg') g += g_(seg(t, 0.6, 0.7), T(x + 72, 212, '○ 未歸群：1 段', { size: 10.5, c: WARN }));
      if (m[1] === 'hdb') g += g_(seg(t, 0.6, 0.7), T(x + 72, 212, '○ 雜訊：3 段', { size: 10.5, c: WARN }));
      if (m[1] === 'onl') g += g_(seg(t, 0.6, 0.7), T(x + 72, 212, '＋ 新片段併入', { size: 10.5, c: GOOD }));
      if (m[1] === 'gnn') g += T(x + 72, 125, '需訓練', { size: 16, w: 1, c: BAD, op: seg(t, 0.3, 0.45) });
      g += T(x + 72, 240, m[0], { size: 12.5, w: 1 }) + g_(seg(t, 0.7, 0.85), lines(x + 72, 260, m[2], 12, { size: 10.5, c: INK3, max: 2, lh: 14 }));
    });
    return g;
  };
  S.c_routes = function (t) {
    var M = [['封閉集 Top-1', [['訪客', '李志強', 0], ['王大明（單段角度差）', '王大明', 1]]], ['開放集門檻', [['訪客', '未知', 1], ['王大明（單段角度差）', '未知（漏認）', 0]]], ['整群多證據（採用）', [['訪客', '未知', 1], ['王大明（整群 5 段）', '王大明', 1]]]], g = T(20, 24, '同樣兩個人：一位不在名冊的訪客、一位已註冊的官兵', { size: 14, a: 'start', w: 1 });
    M.forEach(function (m, i) {
      var x = 20 + i * 204, pick = i === 2;
      g += R(x, 40, 196, 230, { f: pick ? '#f4f9f0' : '#fff', s: pick ? GOOD : '#c5ccc2', sw: pick ? 2.5 : 1.2 }) + T(x + 98, 64, m[0], { size: 13.5, w: 1 });
      m[1].forEach(function (q, k) {
        var y = 84 + k * 90, o = seg(t, 0.15 + i * 0.15 + k * 0.06, 0.3 + i * 0.15 + k * 0.06);
        g += thumb(x + 12, y, 40, 56, k ? 0 : 3) + T(x + 60, y + 18, q[0], { size: 10.5, a: 'start', c: INK3 }) + g_(o, T(x + 60, y + 44, '→ ' + q[1], { size: 13, a: 'start', w: 1, c: q[2] ? GOOD : BAD }) + T(x + 182, y + 44, q[2] ? '✓' : '✗', { size: 16, a: 'end', w: 1, c: q[2] ? GOOD : BAD }));
      });
    });
    return g + caption(320, 292, '封閉集一定說出一個名字；開放集會說「不認識」；用整群比較不會因單段太差而漏認');
  };

  S.c_shape = function (t) {
    var Rw = [['輪廓', '#1baf7a', ['g', 'g', 'm']], ['骨架比例', ORNG, ['g', 'm', 'b']], ['3D 體型', GOLD, ['g', 'b', 'b']]], D = [['近（人高 300 像素）', 1.6], ['中（120 像素）', 0.9], ['遠（50 像素）', 0.45]], g = evTag('inferred') + T(20, 24, '同一個人在不同距離：三種表示還剩多少資訊', { size: 14, a: 'start', w: 1 });
    D.forEach(function (d, j) { var x = 220 + j * 140; g += person(x, 110, d[1], 0.3, { mark: IDC[0] }) + T(x, 128, d[0], { size: 11, c: INK3 }); });
    Rw.forEach(function (r, i) {
      var y = 150 + i * 42;
      g += T(150, y + 22, r[0], { size: 13, a: 'end', w: 1, c: r[1] });
      r[2].forEach(function (v, j) { var x = 220 + j * 140, o = seg(t, 0.15 + i * 0.15 + j * 0.05, 0.25 + i * 0.15 + j * 0.05); g += g_(o, R(x - 56, y + 4, 112, 30, { f: LV[v][1], op: 0.16, rx: 4 }) + T(x, y + 25, LV[v][0], { size: 18, w: 1, c: LV[v][1] })); });
    });
    return g + caption(320, 290, '越遠越只剩輪廓；骨架比例在中距就開始不準，3D 體型需要近距高解析');
  };

  /* ======================= 比較規格 ======================= */
  function cols(names) { return names.map(function (n) { var c = card(n); return c ? { n: c.m.n, tag: c.c.tag, idea: (c.c.how && c.c.how.key) || c.c.idea, inp: c.m.input || '' } : { n: n, tag: 'ref', idea: '' }; }); }
  var CMP = {
    '1-0': { title: '偵測器並排比較', names: ['YOLOX-S', 'YOLOv7（你現有）', 'NanoDet-Plus-m', 'YOLO26n'], frames: [
      ['它們怎麼做', 'c_idea'], ['COCO 精度', 'c_bars', { metric: 'COCO 精度（mAP／AP）', ev: 'proven', rows: [['YOLOX-S', 40.5], ['YOLOv7', 51.4], ['NanoDet-Plus-m', 28.7, '27.0–30.4'], ['YOLO26n', 40.9]], max: 60, note: 'COCO 是一般場景的基準，不是營區；但相對高低有參考價值' }],
      ['營區畫面', 'c_det'], ['速度、授權、角色', 'c_req', { cols: ['速度／算力', '授權', '我們怎麼用'], rows: [['YOLOX-S', '26.8 GFLOPs', 'g Apache-2.0', '第一版'], ['YOLOv7（你現有）', '較重', 'b GPL-3.0', '研究期對照'], ['NanoDet-Plus-m', 'CPU 5–8 ms', 'g Apache-2.0', 'CPU 太慢時替代'], ['YOLO26n', 'CPU 38.9 ms', 'b AGPL-3.0', '不採用']] }], ['在我們的條件下', 'c_matrix']],
      key: 'YOLOv7 精度最高但 GPL 授權；YOLOX-S 精度夠、授權乾淨、好微調，第一版採用；NanoDet 只在 CPU 太慢時替代；YOLO26n 有 AGPL 風險。' },
    '2-0': { title: '追蹤器並排比較', names: ['ByteTrack', 'OC-SORT', 'BoT-SORT'], frames: [
      ['它們怎麼做', 'c_idea'], ['MOT17 成績', 'c_bars', { metric: 'MOT17 IDF1（一般行人，衣著各異）', ev: 'proven', rows: [['ByteTrack', 77.3], ['OC-SORT', null, '此處未收錄'], ['BoT-SORT', 80.2]], max: 100, note: 'BoT-SORT 多出的分數主要來自外觀 ReID——同制服時這部分幫助小' }],
      ['同制服交錯', 'c_trk'], ['需要什麼', 'c_req', { cols: ['額外模型', '固定攝影機', '算力'], rows: [['ByteTrack', 'g 不需要', 'g 適用', 'g 可忽略'], ['OC-SORT', 'g 不需要', 'g 適用', 'g 單 CPU >700 FPS'], ['BoT-SORT', 'b 要 ReID 模型', 'b 相機運動補償無用', 'm 多一個模型']] }], ['在我們的條件下', 'c_matrix', { names: ['ByteTrack', 'OC-SORT'] }]],
      key: '同制服時外觀幫不上忙，選純運動追蹤：ByteTrack 撿回被擋住的人；斷段太多（停走、轉彎）時換 OC-SORT。兩者都要配片段淨化。' },
    '3-0': { title: '外觀 ReID 並排比較', names: ['SOLIDER Swin-S', 'CLIP-ReID ViT-B/16', 'PersonViT ViT-S/16', 'OSNet x1.0'], frames: [
      ['它們怎麼做', 'c_idea'], ['MSMT17 精度', 'c_bars', { metric: 'MSMT17 mAP（衣著各異的街景）', ev: 'proven', rows: [['SOLIDER', 76.9], ['CLIP-ReID', 73.4], ['PersonViT', 74.3], ['OSNet', 52.9], ['TransReID', 67.8]], max: 90, note: '這是「衣服不同」的基準；同制服時所有方法都會下降，必須用營區資料微調' }],
      ['模型大小', 'c_bars', { metric: '參數量（越小，CPU 上越快）', ev: 'proven', better: 'low', rows: [['SOLIDER（Swin-S）', 50, '約 50M'], ['CLIP-ReID（ViT-B）', 86, '約 86M'], ['PersonViT（ViT-S）', 22, '約 22M'], ['OSNet', 2.2, '2.2M（0.98 GFLOPs）'], ['BoT R50（現有）', 25, '約 25M']], max: 100, note: '依骨幹的公開參數量；實際速度要在營區伺服器上量' }],
      ['在我們的條件下', 'c_matrix']],
      key: 'SOLIDER 精度最高，而且能用 λ 偏重人體結構，第一版採用；PersonViT 精度接近、模型小一半以上，是太慢時的替代；OSNet 最快但精度低一截；CLIP-ReID 當對照。' },
    '3-1': { title: '換裝方法並排比較', names: ['CAL', 'CLIP3DReID', 'AIM', '3DInvarReID', 'CCAF'], frames: [
      ['它們怎麼做', 'c_idea'], ['PRCC 換衣成績', 'c_bars', { metric: 'PRCC 換衣 Rank-1', ev: 'proven', rows: [['CAL', 55.2], ['CLIP3DReID', 60.6], ['AIM', 57.9], ['3DInvarReID', null, '只有 CCVID：70.2（與 CAL 融合 84.3）'], ['CCAF', 70.4]], max: 85, note: '換衣基準的人數與服裝種類都少；營區換裝型態要自己收資料驗證' }],
      ['需要什麼', 'c_req', { cols: ['訓練需要', '推論算力', '程式碼／授權'], rows: [['CAL', 'g 衣服標籤', 'g R50', 'g 可用'], ['CLIP3DReID', 'm CLIP＋3D 教師', 'g R50', 'm 待查'], ['AIM', 'g 衣服標籤', 'g R50 級', 'm 待查'], ['3DInvarReID', 'b 3D 重建、訓練複雜', 'm', 'm 待查'], ['CCAF', 'm 人體解析＋CLIP', 'b CLIP ViT-B', 'b 無程式碼']] }],
      ['在我們的條件下', 'c_matrix']],
      key: 'CCAF 數字最高但沒有程式碼；CLIP3DReID 比 CAL 高約 5 點、更看體型，但訓練較複雜；AIM 只小幅勝過 CAL。第一版用 CAL：簡單、推論和一般 ReID 一樣快，但要自收換裝資料。' },
    '3-2': { title: '步態方法並排比較', names: ['DeepGaitV2-P3D', 'GaitBase', 'SkeletonGait++', 'GPGait', 'BigGait（ViT-S）'], frames: [
      ['它們怎麼做', 'c_idea'], ['Gait3D 成績', 'c_bars', { metric: 'Gait3D Rank-1（野外步態）', ev: 'proven', rows: [['DeepGaitV2', 74.4], ['GaitBase', 64.6], ['SkeletonGait++', 77.6], ['GPGait', 22.5], ['BigGait', null, '此資料集未收錄']], max: 90 }],
      ['GREW 成績', 'c_bars', { metric: 'GREW Rank-1（更大的野外資料）', ev: 'proven', rows: [['DeepGaitV2', 77.7], ['GaitBase', 60.1], ['SkeletonGait++', 85.8], ['GPGait', 53.6], ['BigGait', null, '跨域：SUSTech1K 64.7（GaitBase 16.8）']], max: 95 }],
      ['需要什麼', 'c_req', { cols: ['輸入', '算力', '換資料集', '授權'], rows: [['DeepGaitV2-P3D', '剪影', 'g 2.9 GFLOPs', 'm', 'm 學術'], ['GaitBase', '剪影', 'g 1.18／幀', 'b 掉很多', 'm 學術'], ['SkeletonGait++', '剪影＋骨架', 'm 多跑姿態', 'm', 'm 學術'], ['GPGait', '只有骨架', 'g 小', 'g 掉得少', 'm 待查'], ['BigGait（ViT-S）', '原始彩色', 'b 12.7 GFLOPs', 'g 跨域強', 'm 學術']] }],
      ['在我們的條件下', 'c_matrix', { names: ['DeepGaitV2-P3D', 'GaitBase', 'SkeletonGait++', 'GPGait'] }]],
      key: 'SkeletonGait++ 分數最高但要多跑姿態；DeepGaitV2 精度與算力最平衡，第一版採用；GaitBase 最省當對照；GPGait 換資料集掉得少但絕對分數低；BigGait 跨域強但需 GPU。注意 OpenGait 系列授權僅限學術。' },
    '3-4': { title: '靜態體型並排比較', names: ['肢體比例（由骨架估計，自行實作）', 'FSAM（輪廓體型引導外觀）', '3DSL（從單張圖學 3D 體型）', '骨架序列再辨識（MG-SCR、Hi-MPC、MoCos 等）', '人體量測軟生物特徵（Barbosa 2012、Nambiar 等）'], frames: [
      ['它們怎麼做', 'c_idea'], ['換衣成績', 'c_bars', { metric: 'PRCC 換衣 Rank-1（體型類方法）', ev: 'proven', rows: [['FSAM（輪廓）', 54.5, '約 54.5（待核對）'], ['3DSL（3D）', 51.3, '約 51.3（待核對）'], ['CLIP3DReID（3D，見 3B）', 60.6], ['CAL（對照，見 3B）', 55.2, '55.2', BLUE], ['肢體比例', null, '沒有公開成績，要自己量']], max: 80, note: 'FSAM、3DSL 的數字來自第三方整理，尚未對照原論文' }],
      ['不同距離', 'c_shape'], ['需要什麼', 'c_req', { cols: ['表示', '需要什麼', '一般監視器', '授權'], rows: [['肢體比例（由骨架估計，自行實作）', '骨架', 'g RTMPose 已在跑', 'm 中近距＋透視修正', 'g 自行實作'], ['FSAM（輪廓體型引導外觀）', '輪廓', 'm 訓練需分割＋姿態', 'm 推論只用外觀流', 'm 待查'], ['3DSL（從單張圖學 3D 體型）', '3D', 'b 3D 重建輔助訓練', 'm', 'm 待查'], ['骨架序列再辨識（MG-SCR、Hi-MPC、MoCos 等）', '骨架序列', 'm', 'b 多為深度攝影機結果', 'm 待查'], ['人體量測軟生物特徵（Barbosa 2012、Nambiar 等）', '量測值', 'm', 'b 多為深度攝影機結果', '—']] }]],
      key: '靜態體型只能當弱證據。第一版先用骨架算肢體比例（RTMPose 已在跑、幾乎零成本），和身高合成「體型組」；FSAM、3DSL 證明輪廓與 3D 體型可用於換裝，但訓練成本高、成績和 CAL 相當；骨架再辨識與人體量測多以深度攝影機驗證，不能直接套用。' },
    '3-3': { title: '臉部方法並排比較', names: ['SCRFD-2.5GF', 'MagFace', 'AdaFace R100', 'MobileFaceNet', 'CR-FIQA'], frames: [
      ['它們怎麼做', 'c_idea'], ['它們怎麼搭配', 'c_facepipe'],
      ['角色、算力、授權', 'c_req', { cols: ['角色', '算力', '授權'], rows: [['SCRFD-2.5GF', '找臉＋5 點', 'g 2.5 GFLOPs', 'b 非商用'], ['MagFace', '認臉＋品質分數', 'm R100', 'g 寬鬆'], ['AdaFace R100', '認臉（低品質強）', 'm R100', 'g 寬鬆'], ['MobileFaceNet', '輕量認臉', 'g 0.99M', 'm 待查'], ['CR-FIQA', '品質評估', 'm R50／R100', 'b 非商用']] }],
      ['在我們的條件下', 'c_matrix', { names: ['AdaFace R100', 'MagFace', 'SCRFD-2.5GF'] }]],
      key: 'SCRFD 找臉 → MagFace 判斷這張臉能不能用 → AdaFace 比對。MobileFaceNet 是算力不夠時的備案；CR-FIQA 因非商用改用 MagFace。SCRFD 授權也是非商用，正式系統需找替代。' },
    '4-0': { title: '融合方法並排比較', names: ['似然比融合（對數相加）', 'Z-score／Min-Max 正規化後加總', '小型學習式門控', 'FarSight／BRIAR 融合', 'HAMoBE'], frames: [
      ['它們怎麼做', 'c_idea'], ['缺線索時', 'c_fuse'],
      ['需要什麼', 'c_req', { cols: ['需要的資料', '缺線索時', '算力'], rows: [['似然比融合（對數相加）', 'g 每線索 ≥1,000 對', 'g 自然為 0', 'g 可忽略'], ['Z-score／Min-Max 正規化後加總', 'g 平均與標準差', 'b 要另外處理', 'g 可忽略'], ['小型學習式門控', 'm 大量成對資料', 'g 可學', 'g 低'], ['FarSight／BRIAR 融合', 'b 大量資料', 'g 品質導引', 'b 多個 GPU 模型'], ['HAMoBE', 'b 大量資料', 'g 門控', 'b CLIP ViT-L']] }],
      ['BRIAR 的實證', 'c_bars', { metric: 'BRIAR：臉受限時的 TAR@0.1%FAR', ev: 'proven', rows: [['只用臉', 30.7], ['臉＋步態＋體型融合', 65.0]], max: 80, unit: '%', note: '多線索加品質導引的效果有實證；我們用輕量版的同一個概念' }],
      ['在我們的條件下', 'c_matrix', { names: ['似然比融合（對數相加）', '品質條件化（依品質調整證據）', 'Z-score／Min-Max 正規化後加總', '小型學習式門控'] }]],
      key: '似然比＋品質分層：缺線索自然為 0、品質差自動變小、每項貢獻看得見，資料需求也最小，第一版採用；Z-score 當對照；學習式門控等資料夠多再試；FarSight、HAMoBE 是藍圖，整套搬不動。' },
    '5-0': { title: '時空方法並排比較', names: ['不可能配對規則（cannot-link）', 'st-ReID', '畫面座標轉平面圖（單應性）'], frames: [
      ['它們怎麼做', 'c_idea'], ['st-ReID 的實證', 'c_bars', { metric: 'st-ReID：加入時空後的 Rank-1', ev: 'proven', rows: [['Market：只用外觀', 91.2, '91.2', BLUE], ['Market：加時空', 97.2], ['Duke：只用外觀', 83.8, '83.8', BLUE], ['Duke：加時空', 94.0, '94.0', GOOD]], max: 100, note: '同一套外觀模型，只多查一張轉移時間表就大幅提升' }],
      ['需要什麼', 'c_req', { cols: ['需要什麼', '作用', '會引入錯誤嗎'], rows: [['不可能配對規則（cannot-link）', 'g 步行時間表', '排除不可能', 'g 不會（只排除）'], ['st-ReID', 'm 轉移時間統計', '加減分', 'm 分布不準時會'], ['畫面座標轉平面圖（單應性）', 'b 每台 4 點對應', '畫平面圖路徑', 'm 校正誤差']] }],
      ['在我們的條件下', 'c_matrix']],
      key: '不可能配對規則只排除、不加分，最安全；轉移時間分布當{{step:4|short}}的一項證據；單應性只在需要畫平面圖路徑時再加——三者是搭配，不是互斥。' },
    '6-0': { title: '分群方法並排比較', names: ['約束式平均連結凝聚分群', 'HDBSCAN', 'OGMC 線上分群', '圖神經網路分群（Linkage-GCN、STAR-FC 等）'], frames: [
      ['它們怎麼做', 'c_idea'], ['同一批片段', 'c_clu'],
      ['無監督訓練方法', 'c_bars', { metric: '用分群結果訓練模型：MSMT17 mAP（無標註）', ev: 'proven', rows: [['Cluster Contrast', 38.2], ['ISE', 35.0], ['PPLR', 42.2]], max: 60, note: '這三個是「用分群結果再訓練外觀模型」，和上面的分群演算法搭配使用' }],
      ['在我們的條件下', 'c_matrix', { names: ['約束式平均連結凝聚分群', 'HDBSCAN', 'OGMC 線上分群', 'Cluster Contrast', 'ISE'] }]],
      key: '約束式凝聚分群最容易加入「不可能配對」、每一步可解釋，第一版採用；HDBSCAN 會留下雜訊點不硬分，可當對照；OGMC 用在跨日長期；圖神經網路在我們的規模用不上。' },
    '7-0': { title: '比對名冊：三種路線並排', names: ['整群多證據比對＋第一第二名間隔', '刷卡紀錄當輔助證據與一致性檢查', '在營區攝影機下建立註冊資料', 'SapiensID'], frames: [
      ['三種路線', 'c_routes'], ['我們用的元件', 'c_idea'], ['在我們的條件下', 'c_matrix']],
      key: '封閉集一定會說出一個名字，陌生人會被認錯；開放集能說「不認識」；再用整群多段證據比，才不會因單段角度差而漏認。刷卡與註冊資料是搭配的元件。' }
  };
  var DK = FlowPlay.DURK; ['c_idea', 'c_req', 'c_matrix'].forEach(function (k) { DK[k] = 9000; }); DK.c_bars = 8000; ['c_det', 'c_trk', 'c_facepipe', 'c_fuse', 'c_clu', 'c_routes', 'c_shape'].forEach(function (k) { DK[k] = 9500; });

  function spec(id) {
    var c = CMP[id], sid = +id.split('-')[0], st = (global.STEPS || []).filter(function (s) { return s.id === sid; })[0], g = st && st.groups[+id.split('-')[1]];
    return { title: c.title, sub: '同一組方法放在一起比：' + c.names.map(short).join('、'), keyLabel: '結論', key: c.key, m: '{{step:' + sid + '}}' + (g && g.n ? '・' + g.n : '') + '・並排比較',
      flow: c.frames.map(function (f) { var p = f[2] || {}; if (f[1] === 'c_idea') p = { cols: cols(c.names) }; if (f[1] === 'c_matrix' && !p.names) p = { names: c.names }; return [f[0], '', sid, f[1], p]; }) };
  }

  var CH = global.CH = global.CH || {};
  CH.cmpplay = {
    init: function () {
      var sec = document.getElementById('ch-methods');
      if (!sec || sec.getAttribute('data-cmp-ready')) return;
      sec.setAttribute('data-cmp-ready', '1');
      Object.keys(CMP).forEach(function (id) {
        var p = id.split('-'), st = global.STEPS.filter(function (s) { return s.id === +p[0]; })[0], g = st.groups[+p[1]];
        var box = sec.querySelector('.step-cards[data-s="' + p[0] + '"][data-g="' + (g.key || p[1]) + '"]');
        if (!box) return;
        var html = '<div class="cmp-bar"><button type="button" class="fp-btn big" data-cmp="' + id + '"><i></i>並排比較：' + CMP[id].names.length + ' 個方法差在哪</button><span class="small muted">' + CMP[id].names.map(short).join('、') + '</span></div>';
        // 插在槽位表正上方（組標題與導言之後）；這一組沒有槽位表時，插在第一張方法卡之前
        var first = box.querySelector('.slot-tbl') || box.querySelector('.mcard');
        if (first) first.insertAdjacentHTML('beforebegin', html); else box.insertAdjacentHTML('beforeend', html);
      });
      sec.addEventListener('click', function (e) { var b = e.target.closest('[data-cmp]'); if (b) FlowPlay.open(spec(b.getAttribute('data-cmp'))); });
    }
  };
  global.CmpPlay = { spec: spec, CMP: CMP };
})(window);
