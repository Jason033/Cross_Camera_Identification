/* ch-methods.js — 第 3–4 章：方法地圖、特徵融合 */
(function (global) {
  'use strict';
  var D = global.DATA, el = U.el, $ = U.$;
  var CH = global.CH = global.CH || {};
  var FAM = {}; D.FAMILIES.forEach(function (f) { FAM[f.id] = f; });
  var CUE = {}; D.CUES.forEach(function (c) { CUE[c.id] = c; });

  /* ======================= 3 方法地圖 ======================= */
  var INPUT_LEVEL = { transreid: 0, clipreid: 0, cal: 0, fsam: 0, aio: 0, ramoe: 0, snr: 0, fgpr: 1, hamobe: 1, gpgait: 2, skeletongait: 2, gaitbase: 2, mmgaitformer: 2, '3dinvar': 3 };
  var LEVEL_NAMES = ['單張 RGB', 'RGB 影片', '影片 + 姿態估計／分割', '3D 人體重建'];
  var famOn = {}; D.FAMILIES.forEach(function (f) { famOn[f.id] = true; });
  var curMethod = 'gpgait';

  CH.methods = {
    init: function () {
      var chips = $('#fam-chips');
      D.FAMILIES.forEach(function (f) {
        var b = U.h('button', { class: 'chip', 'aria-pressed': 'true' }, '<span class="sw-dot" style="--c:' + f.color + '"></span>' + f.name);
        b.addEventListener('click', function () { famOn[f.id] = !famOn[f.id]; b.setAttribute('aria-pressed', famOn[f.id]); drawMap(); });
        chips.appendChild(b);
      });
      var sel = $('#method-sel');
      D.METHODS.forEach(function (m) { var o = document.createElement('option'); o.value = m.id; o.textContent = m.name + '（' + m.venue + '）'; sel.appendChild(o); });
      sel.value = curMethod;
      sel.addEventListener('change', function () { selectMethod(sel.value); });
      drawMap(); selectMethod(curMethod); drawNums();
    }
  };

  function drawMap() {
    var svg = U.clear($('#method-map'));
    var L = 190, R = 940, T = 40, B = 440;
    var colW = (R - L) / 5, rowH = (B - T) / 4;
    function X(cd) { return L + (4 - cd) * colW + colW / 2; }
    // 推薦區
    el('rect', { x: L + 3 * colW, y: T + rowH * 1, width: colW * 2, height: rowH * 2, fill: '#e3e8d6', rx: 6 }, svg);
    el('text', { x: L + 5 * colW - 10, y: T + rowH + 20, 'text-anchor': 'end', 'font-size': 13, fill: 'var(--olive)', 'font-weight': 700, text: '同制服首選區' }, svg);
    el('text', { x: L + 5 * colW - 10, y: T + rowH + 38, 'text-anchor': 'end', 'font-size': 12, fill: 'var(--olive)', text: '衣服依賴低、一般 RGB 影片可取得' }, svg);
    for (var r = 0; r < 4; r++) {
      el('line', { x1: L, x2: R, y1: T + r * rowH, y2: T + r * rowH, stroke: 'var(--rule-2)' }, svg);
      el('text', { x: L - 12, y: T + r * rowH + rowH / 2 + 4, 'text-anchor': 'end', 'font-size': 13, fill: 'var(--ink-2)', text: LEVEL_NAMES[r] }, svg);
    }
    el('line', { x1: L, x2: R, y1: B, y2: B, stroke: 'var(--ink-3)' }, svg);
    ['極高', '高', '中', '低', '極低'].forEach(function (n, i) {
      el('text', { x: L + i * colW + colW / 2, y: B + 20, 'text-anchor': 'middle', 'font-size': 12.5, fill: 'var(--ink-2)', text: n }, svg);
    });
    el('text', { x: L, y: B + 42, 'font-size': 12.5, fill: 'var(--ink-3)', text: '← 衣服依賴高' }, svg);
    el('text', { x: R, y: B + 42, 'text-anchor': 'end', 'font-size': 12.5, fill: 'var(--ink-3)', text: '衣服依賴低 →' }, svg);
    el('text', { x: 18, y: T - 14, 'font-size': 12.5, fill: 'var(--ink-3)', text: '輸入需求 ↓' }, svg);

    var cells = {};
    D.METHODS.forEach(function (m) { var k = m.clothDep + '-' + INPUT_LEVEL[m.id]; (cells[k] = cells[k] || []).push(m); });
    Object.keys(cells).forEach(function (k) {
      var list = cells[k], n = list.length;
      list.forEach(function (m, i) {
        var lv = INPUT_LEVEL[m.id];
        var cx = X(m.clothDep) - 52, cy = T + lv * rowH + rowH / 2 + (i - (n - 1) / 2) * 21;
        var g = el('g', { tabindex: 0, role: 'button', 'aria-label': m.name, style: 'cursor:pointer', opacity: famOn[m.fam] ? 1 : 0.15 }, svg);
        var sel = m.id === curMethod;
        el('circle', { cx: cx, cy: cy, r: sel ? 7.5 : 6, fill: FAM[m.fam].color, stroke: sel ? 'var(--ink)' : '#fff', 'stroke-width': sel ? 2.2 : 1.5 }, g);
        el('text', { x: cx + 12, y: cy + 4.5, 'font-size': 13.5, fill: 'var(--ink)', 'font-weight': sel ? 700 : 400, text: m.name.split('（')[0] }, g);
        U.tip(g, '<b>' + m.name + '</b>（' + m.venue + '）<br>' + m.problem + '<br>輸入：' + m.input);
        function go() { $('#method-sel').value = m.id; selectMethod(m.id); }
        g.addEventListener('click', go);
        g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      });
    });
  }

  function selectMethod(id) {
    curMethod = id;
    var m = D.METHODS.filter(function (x) { return x.id === id; })[0];
    var fam = FAM[m.fam];
    var KIND = { in: '輸入', pre: '前處理', model: '模型', train: '訓練用', emb: '輸出嵌入', match: '比對' };
    var html = '';
    m.stages.forEach(function (s, i) {
      if (i) html += '<div class="arrow" aria-hidden="true"><svg width="22" height="14"><path d="M0 7h16M12 2l6 5-6 5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></div>';
      var barC = (s.k === 'model' || s.k === 'emb') ? fam.color : (s.k === 'train' ? 'transparent' : 'var(--rule)');
      html += '<div class="stage' + (s.k === 'train' ? ' train' : '') + '"><span class="bar" style="background:' + barC + '"></span><span class="small muted">' + KIND[s.k] + '</span><b>' + U.esc(s.t) + '</b>' + (s.s ? '<span class="shape">' + U.esc(s.s) + '</span>' : '') + '</div>';
    });
    $('#pipe').innerHTML = html;
    var ref = D.REFS[m.ref];
    var cueTags = m.cue.map(function (c) { return '<span class="tag"><span class="sw-dot" style="--c:' + CUE[c].color + ';width:8px;height:8px"></span> ' + CUE[c].name + '</span>'; }).join('');
    var stars = '●●●●'.slice(0, m.uniform) + '○○○○'.slice(0, 4 - m.uniform);
    $('#method-detail').innerHTML = '<h3>' + m.name + ' <span class="muted small">' + m.venue + '</span></h3>' +
      '<dl>' +
      '<dt>解決的問題</dt><dd>' + m.problem + '</dd>' +
      '<dt>輸入</dt><dd>' + m.input + '</dd>' +
      '<dt>真正學到的</dt><dd>' + m.learns + '</dd>' +
      '<dt>依賴線索</dt><dd>' + cueTags + '</dd>' +
      '<dt>優點</dt><dd>' + m.plus + '</dd>' +
      '<dt>限制</dt><dd>' + m.minus + '</dd>' +
      (m.result ? '<dt>代表結果</dt><dd>' + m.result + ' <span class="ev proven"><i></i>論文報告</span></dd>' : '') +
      '<dt>同制服價值</dt><dd><span class="num" aria-label="' + m.uniform + ' / 4">' + stars + '</span>　' + m.uniformNote + '</dd>' +
      '<dt>出處</dt><dd>' + ref.a + '，' + (ref.u ? '<a href="' + ref.u + '" target="_blank" rel="noopener">' + ref.t + '</a>' : ref.t) + '</dd>' +
      '</dl>';
    drawMap();
  }

  function drawNums() {
    var svg = $('#nums');
    var panels = [
      { t: 'CAL · CCVID 換衣協定', bars: [['Rank-1', 81.7], ['mAP', 79.6]] },
      { t: 'MMGaitFormer · CASIA-B 換衣條件', bars: [['Rank-1', 94.8]] },
      { t: 'Industrial-Gait · RGB 研究', bars: [['Rank-1', 88.3], ['Rank-5', 98.3]], verify: true }
    ];
    var pw = 290;
    panels.forEach(function (p, i) {
      var x0 = 10 + i * (pw + 15), g = el('g', {}, svg);
      el('text', { x: x0, y: 22, 'font-size': 14, 'font-weight': 700, fill: 'var(--ink)', text: p.t }, g);
      if (p.verify) el('text', { x: x0, y: 40, 'font-size': 12, fill: 'var(--warn)', text: '2026 · 待核對' }, g);
      var L = x0 + 60, W = pw - 110;
      [0, 50, 100].forEach(function (v) {
        el('line', { x1: L + v / 100 * W, x2: L + v / 100 * W, y1: 52, y2: 52 + 2 * 46, stroke: 'var(--rule-2)' }, g);
        el('text', { x: L + v / 100 * W, y: 52 + 2 * 46 + 16, 'text-anchor': 'middle', 'font-size': 11.5, fill: 'var(--ink-3)', class: 'num', text: v + '%' }, g);
      });
      p.bars.forEach(function (b, j) {
        var y = 60 + j * 46;
        el('text', { x: L - 8, y: y + 18, 'text-anchor': 'end', 'font-size': 13, fill: 'var(--ink-2)', text: b[0] }, g);
        el('rect', { x: L, y: y, width: b[1] / 100 * W, height: 26, rx: 3, fill: p.verify ? 'none' : 'var(--ink-2)', stroke: p.verify ? 'var(--ink-2)' : 'none', 'stroke-dasharray': p.verify ? '4 3' : null, 'stroke-width': 1.5 }, g);
        el('text', { x: L + b[1] / 100 * W + 6, y: y + 18, 'font-size': 14, fill: 'var(--ink)', class: 'num', text: b[1].toFixed(1) }, g);
      });
    });
  }

  /* ======================= 4 特徵融合 ======================= */
  var MODS = [
    { k: 'app', n: '外觀', c: '#2a78d6', g: 0.83, i: 0.80 },
    { k: 'skel', n: '骨架', c: '#eb6834', g: 0.80, i: 0.55 },
    { k: 'sil', n: '輪廓', c: '#1baf7a', g: 0.76, i: 0.60 },
    { k: 'face', n: '臉部', c: '#6250d6', g: 0.92, i: 0.35 }
  ];
  var SCENES = {
    front: { app: 0.9, skel: 0.9, sil: 0.85, face: 0.9, note: '條件良好：每個模態都可靠，三種策略都能排對。' },
    back: { app: 0.8, skel: 0.85, sil: 0.8, face: 0, note: '看不到臉：等權與固定權重仍把權重分給「不存在的臉」，被稀釋；品質門控把它遮掉，邊際最大。' },
    far: { app: 0.6, skel: 0.25, sil: 0.45, face: 0, note: '遠距低解析：姿態估計先壞，外觀又分不出同制服——沒有任何融合策略救得回來。正確做法是拒判或等待更多幀（見第 6 章）。' },
    occ: { app: 0.55, skel: 0.35, sil: 0.3, face: 0.6, note: '下半身遮擋：骨架與輪廓品質下降且開始誤導；門控把權重移到還可信的臉部。' }
  };
  var FIXED_W = { app: 0.3, skel: 0.15, sil: 0.15, face: 0.4 };
  var q = Object.assign({}, SCENES.front);

  function simOf(m, which, qq) {
    var base = which === 'g' ? m.g : m.i, bias = which === 'g' ? -0.05 : 0.15;
    return 0.5 + (base - 0.5) * qq + bias * (1 - qq);
  }
  function fuse(strategy) {
    var w = {}, sum = 0;
    MODS.forEach(function (m) {
      var v = strategy === 'mean' ? 1 : strategy === 'fixed' ? FIXED_W[m.k] : q[m.k];
      w[m.k] = v; sum += v;
    });
    var G = 0, I = 0;
    MODS.forEach(function (m) {
      w[m.k] = sum ? w[m.k] / sum : 0;
      var gs = q[m.k] > 0 ? simOf(m, 'g', q[m.k]) : 0.5, is = q[m.k] > 0 ? simOf(m, 'i', q[m.k]) : 0.5;
      G += w[m.k] * gs; I += w[m.k] * is;
    });
    return { w: w, G: G, I: I };
  }

  CH.fusion = {
    init: function () {
      drawAlign();
      var box = $('#q-sliders');
      MODS.forEach(function (m) {
        var d = U.h('div', { class: 'slider' }, '<label for="q-' + m.k + '"><span class="sw-dot" style="--c:' + m.c + '"></span> ' + m.n + ' 品質</label><output id="q-' + m.k + '-o" class="num"></output><input id="q-' + m.k + '" type="range" min="0" max="1" step="0.05">');
        box.appendChild(d);
        $('#q-' + m.k, d).addEventListener('input', function (e) { q[m.k] = +e.target.value; q.note = '自訂品質：觀察哪個策略的邊際先變成負數。'; drawFusion(); });
      });
      U.segGroup($('#scene'), 'data-s', function (s) { q = Object.assign({}, SCENES[s]); syncSliders(); drawFusion(); });
      syncSliders(); drawFusion();
      var rows = [
        ['串接 Concatenation', 'z = [z₁; z₂; z₃]', '最簡單的基準', '不知道哪個特徵壞了', '必做基準'],
        ['共享投影', 'Pᵢ(zᵢ) → 512D', '統一維度與尺度', '仍需對齊損失', '高'],
        ['固定加權', 'z = Σ wᵢ zᵢ', '簡單、可解釋', '同一組權重不適合每台攝影機', '中'],
        ['注意力', '特徵自選重要 token', '彈性大', '資料與計算量大', '高'],
        ['交叉注意力', '骨架 query 輪廓（反之亦然）', '顯式交換互補資訊', '對對齊誤差敏感', '高（MMGaitFormer 類）'],
        ['門控 Gating', 'w = g(q₁, q₂, …)', '依品質動態調整', '門控塌縮（永遠只選一個）', '非常高'],
        ['專家混合 MoE', '多專家 + 路由器', '模態專業化', '訓練複雜', '非常高（HAMoBE、RaMoE）'],
        ['分數融合', 'score = Σ wᵢ sᵢ', '直接接現成模型', '沒有特徵層互動', '第一個實驗最適合'],
        ['決策層融合', '各自判斷再投票', '好除錯、模組化', '幾乎沒有協同效果', '部署友善']
      ];
      $('#fusion-tbl').innerHTML = '<thead><tr><th>策略</th><th>核心概念</th><th>優點</th><th>主要問題</th><th>同制服評價</th></tr></thead><tbody>' +
        rows.map(function (r) { return '<tr><td><b>' + r[0] + '</b></td><td style="font-family:var(--num)">' + r[1] + '</td><td>' + r[2] + '</td><td>' + r[3] + '</td><td>' + r[4] + '</td></tr>'; }).join('') + '</tbody>';
    }
  };
  function syncSliders() {
    MODS.forEach(function (m) { $('#q-' + m.k).value = q[m.k]; });
  }

  function drawFusion() {
    MODS.forEach(function (m) { $('#q-' + m.k + '-o').textContent = q[m.k].toFixed(2); });
    var svg = U.clear($('#fusion-svg'));
    var L = 110, R = 560, lo = 0.3, hi = 1.0;
    function X(v) { return L + (v - lo) / (hi - lo) * (R - L); }
    // 標題
    el('text', { x: 0, y: 18, 'font-size': 13.5, 'font-weight': 700, fill: 'var(--ink)', text: '各模態相似度（query 對兩位候選人）' }, svg);
    // 圖例
    el('circle', { cx: L + 250, cy: 14, r: 5.5, fill: 'var(--ink)' }, svg);
    el('text', { x: L + 260, y: 18, 'font-size': 12.5, fill: 'var(--ink-2)', text: '本人' }, svg);
    drawShape(svg, 'triangle', L + 310, 14, 6, 'var(--bad)');
    el('text', { x: L + 320, y: 18, 'font-size': 12.5, fill: 'var(--ink-2)', text: '同制服冒充者' }, svg);
    [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0].forEach(function (v) {
      el('line', { x1: X(v), x2: X(v), y1: 30, y2: 400, stroke: 'var(--rule-2)' }, svg);
      el('text', { x: X(v), y: 412, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--ink-3)', class: 'num', text: v.toFixed(1) }, svg);
    });
    MODS.forEach(function (m, i) {
      var y = 48 + i * 36;
      el('text', { x: L - 10, y: y + 4, 'text-anchor': 'end', 'font-size': 13, fill: 'var(--ink)', text: m.n }, svg);
      el('circle', { cx: 12, cy: y, r: 4.5, fill: m.c }, svg);
      if (q[m.k] <= 0) { el('text', { x: X(0.5), y: y + 4, 'font-size': 12.5, fill: 'var(--ink-3)', text: '缺失（看不到）' }, svg); return; }
      var gs = simOf(m, 'g', q[m.k]), is = simOf(m, 'i', q[m.k]);
      el('line', { x1: X(gs), x2: X(is), y1: y, y2: y, stroke: gs >= is ? 'var(--ink-3)' : 'var(--bad)', 'stroke-width': 2 }, svg);
      el('circle', { cx: X(gs), cy: y, r: 5.5, fill: 'var(--ink)' }, svg);
      drawShape(svg, 'triangle', X(is), y, 6, 'var(--bad)');
    });
    el('line', { x1: 0, x2: R + 30, y1: 196, y2: 196, stroke: 'var(--rule)' }, svg);
    el('text', { x: 0, y: 220, 'font-size': 13.5, 'font-weight': 700, fill: 'var(--ink)', text: '融合後分數' }, svg);
    var strat = [['mean', '等權平均'], ['fixed', '固定權重'], ['gate', '品質門控']];
    var wHtml = '<h3 style="font-size:15px">各策略分給模態的權重</h3>';
    strat.forEach(function (s, i) {
      var r = fuse(s[0]), y = 248 + i * 50, ok = r.G > r.I;
      el('text', { x: L - 10, y: y + 4, 'text-anchor': 'end', 'font-size': 13.5, fill: 'var(--ink)', text: s[1] }, svg);
      el('line', { x1: X(r.G), x2: X(r.I), y1: y, y2: y, stroke: ok ? 'var(--ink-3)' : 'var(--bad)', 'stroke-width': 2.2 }, svg);
      el('circle', { cx: X(r.G), cy: y, r: 6.5, fill: 'var(--ink)' }, svg);
      drawShape(svg, 'triangle', X(r.I), y, 7, 'var(--bad)');
      el('text', { x: L - 10, y: y + 22, 'text-anchor': 'end', 'font-size': 12, fill: ok ? 'var(--good)' : 'var(--bad)', 'font-weight': 700, text: (ok ? '✓ 本人第一' : '✗ 冒充者第一') + '  ' + (r.G - r.I >= 0 ? '+' : '') + (r.G - r.I).toFixed(3) }, svg);
      // 權重堆疊條
      wHtml += '<div style="margin:8px 0 2px;font-size:13px">' + s[1] + '</div><div style="display:flex;gap:2px;height:14px">';
      MODS.forEach(function (m) { if (r.w[m.k] > 0.001) wHtml += '<span title="' + m.n + ' ' + (r.w[m.k] * 100).toFixed(0) + '%" style="flex:' + r.w[m.k] + ';background:' + m.c + ';border-radius:3px"></span>'; });
      wHtml += '</div><div class="small muted num" style="font-size:12px">' + MODS.map(function (m) { return m.n + ' ' + (r.w[m.k] * 100).toFixed(0) + '%'; }).join('　') + '</div>';
    });
    wHtml += '<p class="small" style="margin-top:12px">' + q.note + '</p>';
    $('#fusion-weights').innerHTML = wHtml;
  }

  function drawAlign() {
    var svg = $('#align');
    var ins = [['骨架專家', 256, '#eb6834', 'GPGait / SkeletonGait'], ['輪廓專家', 512, '#1baf7a', 'GaitBase'], ['外觀專家', 768, '#2a78d6', 'CLIP-ReID']];
    ins.forEach(function (d, i) {
      var y = 40 + i * 80;
      el('text', { x: 0, y: y - 8, 'font-size': 13.5, 'font-weight': 700, fill: 'var(--ink)', text: d[0] }, svg);
      el('text', { x: 0, y: y + 32, 'font-size': 11.5, fill: 'var(--ink-3)', text: d[3] }, svg);
      el('rect', { x: 0, y: y, width: d[1] / 768 * 170, height: 16, fill: d[2], rx: 2 }, svg);
      el('text', { x: d[1] / 768 * 170 + 6, y: y + 13, 'font-size': 12.5, fill: 'var(--ink-2)', class: 'num', text: d[1] + 'D' }, svg);
      arrow(svg, 240, y + 8, 290, y + 8);
      box(svg, 292, y - 6, 112, 28, '線性投影 →512', '#fff');
      arrow(svg, 404, y + 8, 430, y + 8);
      box(svg, 432, y - 6, 92, 28, 'LayerNorm', '#fff');
      el('rect', { x: 540, y: y, width: 110, height: 16, fill: d[2], rx: 2, opacity: 0.85 }, svg);
      el('text', { x: 595, y: y + 31, 'text-anchor': 'middle', 'font-size': 11.5, fill: 'var(--ink-3)', class: 'num', text: '512D · 同尺度' }, svg);
      arrow(svg, 652, y + 8, 712, 140);
    });
    box(svg, 714, 102, 120, 76, '', '#fff');
    el('text', { x: 774, y: 132, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: 'var(--ink)', text: '品質門控' }, svg);
    el('text', { x: 774, y: 152, 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--ink-3)', text: 'w = g(q, mask)' }, svg);
    // 品質輸入
    el('text', { x: 774, y: 222, 'text-anchor': 'middle', 'font-size': 12.5, fill: 'var(--ink-2)', text: '品質分數 q：姿態 .9 / 輪廓 .6 / 外觀 .8' }, svg);
    el('text', { x: 774, y: 240, 'text-anchor': 'middle', 'font-size': 12.5, fill: 'var(--ink-2)', text: '缺失遮罩：臉 = 0（不參與）' }, svg);
    arrow(svg, 774, 212, 774, 182);
    arrow(svg, 834, 140, 870, 140);
    el('rect', { x: 872, y: 132, width: 100, height: 16, fill: 'var(--ink)', rx: 2 }, svg);
    el('text', { x: 922, y: 168, 'text-anchor': 'middle', 'font-size': 12.5, fill: 'var(--ink)', 'font-weight': 700, text: '身分嵌入 512D' }, svg);
    el('text', { x: 0, y: 290, 'font-size': 12.5, fill: 'var(--ink-3)', text: '條長 ∝ 維度。直接相加 256 + 512 + 768 在數學上不成立；即使投影到同維度，分布與語意幾何仍不同。' }, svg);
  }
  function arrow(svg, x1, y1, x2, y2) {
    el('line', { x1: x1, y1: y1, x2: x2, y2: y2, stroke: 'var(--ink-3)', 'stroke-width': 1.4 }, svg);
    var a = Math.atan2(y2 - y1, x2 - x1);
    el('path', { d: 'M' + x2 + ' ' + y2 + 'L' + (x2 - 8 * Math.cos(a - 0.4)) + ' ' + (y2 - 8 * Math.sin(a - 0.4)) + 'L' + (x2 - 8 * Math.cos(a + 0.4)) + ' ' + (y2 - 8 * Math.sin(a + 0.4)) + 'Z', fill: 'var(--ink-3)' }, svg);
  }
  function box(svg, x, y, w, hh, t, fill) {
    el('rect', { x: x, y: y, width: w, height: hh, rx: 5, fill: fill, stroke: 'var(--ink-3)' }, svg);
    if (t) el('text', { x: x + w / 2, y: y + hh / 2 + 4.5, 'text-anchor': 'middle', 'font-size': 12.5, fill: 'var(--ink)', text: t }, svg);
  }
  global.svgArrow = arrow; global.svgBox = box;
})(window);
