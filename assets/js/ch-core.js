/* ch-core.js — 第 0–2 章：總覽、問題定義、身分線索 */
(function (global) {
  'use strict';
  var PM = global.PersonModel, D = global.DATA, el = U.el, $ = U.$;
  var CH = global.CH = global.CH || {};

  // 五位同制服人員（參數刻意不同，用來示範非衣服線索）
  var PEOPLE = global.PEOPLE = [
    PM.makePerson({ id: 'A', H: 1.00, legScale: 1.03, shoulderScale: 1.05, stride: 0.46, armSwing: 0.50, kneeFlex: 1.05, cadence: 0.92, phase0: 0.0 }),
    PM.makePerson({ id: 'B', H: 0.93, legScale: 0.95, shoulderScale: 0.94, stride: 0.38, armSwing: 0.30, kneeFlex: 0.85, cadence: 1.10, phase0: 1.3, lean: 0.08 }),
    PM.makePerson({ id: 'C', H: 1.06, legScale: 1.07, shoulderScale: 1.00, stride: 0.50, armSwing: 0.62, kneeFlex: 1.0, cadence: 0.84, phase0: 2.6, lean: 0.02 }),
    PM.makePerson({ id: 'D', H: 0.97, legScale: 0.98, shoulderScale: 1.13, stride: 0.40, armSwing: 0.40, kneeFlex: 0.92, cadence: 1.00, phase0: 3.9, hipScale: 1.1 }),
    PM.makePerson({ id: 'E', H: 1.02, legScale: 0.97, shoulderScale: 0.98, stride: 0.44, armSwing: 0.22, kneeFlex: 0.98, cadence: 1.04, phase0: 5.0, lean: 0.06 })
  ];
  var ID_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#c98500', '#6250d6'];
  var ID_SHAPES = ['circle', 'square', 'triangle', 'diamond', 'cross'];

  function legRatio(p) { return (PM.BASE.thigh + PM.BASE.shank) * p.legScale; }
  function shoRatio(p) { return PM.BASE.shoulderW * p.shoulderScale; }

  /* ======================= 0 總覽：同制服行進隊列 ======================= */
  var hero = { lens: 'rgb', playing: !U.reduceMotion, t: 3.2, raf: 0, last: 0 };
  var CAPTIONS = {
    rgb: '攝影機畫面：五人同款制服、同款帽子。若模型主要靠衣服顏色與紋理來判斷身分，這五個人的特徵幾乎相同——判別維度消失了。',
    sil: '輪廓：去掉顏色只剩人形。身高與體型差異開始浮現；但制服寬鬆程度、背包裝備也會改變輪廓，所以輪廓仍有一部分「衣服依賴」。',
    skel: '骨架：關節點與肢段。腿長、肩寬、走路時膝蓋彎曲的時機都不受制服顏色影響——前提是姿態估計器在這個解析度下還估得準。',
    anthro: '人體比例：腿長／身高、肩寬／身高。比例跨視角相對穩定，但必須先有可靠的尺度與姿態，遠距時誤差會放大。',
    gait: '步態軌跡：最近 1.2 秒腳踝的運動軌跡。步幅、抬腳高度、步頻不同，形成的環形也不同——這就是步態辨識的直覺。需要連續影格。'
  };

  CH.home = {
    init: function () {
      var svg = $('#lineup');
      el('line', { x1: 20, x2: 980, y1: 362, y2: 362, stroke: 'var(--rule)', 'stroke-width': 1.5 }, svg);
      hero.groups = PEOPLE.map(function (p, i) {
        var g = el('g', {}, svg);
        var trail = el('g', {}, g);
        var body = el('g', {}, g);
        var over = el('g', {}, g);
        var lab = el('text', { x: 100 + i * 200, y: 392, 'text-anchor': 'middle', 'font-size': 15, fill: 'var(--ink-2)' }, g);
        return { trail: trail, body: body, over: over, lab: lab };
      });
      hero.lens = U.segGroup($('#lens'), 'data-lens', function (v) { hero.lens = v; drawHero(); });
      var btn = $('#lineup-play');
      function syncBtn() { btn.textContent = hero.playing ? '暫停' : '播放'; btn.setAttribute('aria-pressed', hero.playing ? 'true' : 'false'); }
      btn.addEventListener('click', function () { hero.playing = !hero.playing; syncBtn(); if (hero.playing) loop(); });
      syncBtn();
      drawHero();
    },
    enter: function () { if (hero.playing) loop(); },
    leave: function () { cancelAnimationFrame(hero.raf); hero.raf = 0; }
  };
  function loop() {
    if (hero.raf) return;
    hero.last = performance.now();
    function step(now) {
      hero.raf = 0;
      if (!hero.playing || !document.getElementById('ch-home').classList.contains('active')) return;
      hero.t += Math.min(0.05, (now - hero.last) / 1000); hero.last = now;
      drawHero();
      hero.raf = requestAnimationFrame(step);
    }
    hero.raf = requestAnimationFrame(step);
  }
  function phaseAt(p, t) { return p.phase0 + 2 * Math.PI * 0.95 * p.cadence * t; }

  function drawHero() {
    var lens = hero.lens;
    $('#lens-caption').textContent = CAPTIONS[lens];
    PEOPLE.forEach(function (p, i) {
      var G = hero.groups[i];
      var view = { yaw: 0.42, pitch: 0.06, scale: 285, x: 100 + i * 200, y: 362 };
      var phi = phaseAt(p, hero.t);
      var mode = lens === 'rgb' ? 'rgb' : lens === 'sil' ? 'sil' : 'skel';
      var style = {};
      if (lens === 'anthro') style = { boneColor: '#9a7b12' };
      if (lens === 'gait') style = { boneColor: '#b9a3ad' };
      PM.renderSVG(G.body, PM.parts(p, phi, view, mode), style);
      U.clear(G.trail); U.clear(G.over);
      G.lab.textContent = '人員 ' + p.id;

      if (lens === 'gait') {
        ['lAnkle', 'rAnkle'].forEach(function (jn, k) {
          var pts = [];
          for (var s = 0; s <= 36; s++) {
            var tt = hero.t - 1.2 + s * (1.2 / 36);
            var J = PM.joints(p, phaseAt(p, tt));
            var q = PM.project(J[jn], view.yaw, view.pitch);
            pts.push((view.x + q[0] * view.scale).toFixed(1) + ',' + (view.y + q[1] * view.scale).toFixed(1));
          }
          el('polyline', { points: pts.join(' '), fill: 'none', stroke: '#d55181', 'stroke-width': 2.4, 'stroke-linejoin': 'round', opacity: k ? 0.45 : 0.95 }, G.trail);
        });
      }
      if (lens === 'anthro') {
        var J = PM.joints(p, phi);
        var hip = PM.project(J.lHip, view.yaw, view.pitch), top = PM.project(J.head, view.yaw, view.pitch);
        var x0 = view.x - 62, yTop = view.y + (top[1] - J.headR * 1.0) * view.scale, yHip = view.y + hip[1] * view.scale;
        // 身高與腿長標尺
        bracket(G.over, x0, yTop, view.y, '#9a7b12');
        bracket(G.over, x0 + 12, yHip, view.y, '#9a7b12');
        var ls = PM.project(J.lSho, view.yaw, view.pitch), rs = PM.project(J.rSho, view.yaw, view.pitch);
        el('line', { x1: view.x + ls[0] * view.scale, y1: view.y + ls[1] * view.scale - 16, x2: view.x + rs[0] * view.scale, y2: view.y + rs[1] * view.scale - 16, stroke: '#9a7b12', 'stroke-width': 2 }, G.over);
        G.lab.textContent = '';
        var t1 = el('text', { x: view.x, y: 386, 'text-anchor': 'middle', 'font-size': 13.5, fill: 'var(--ink)', class: 'num' }, G.over);
        t1.textContent = '腿長 ' + legRatio(p).toFixed(3) + 'H';
        var t2 = el('text', { x: view.x, y: 402, 'text-anchor': 'middle', 'font-size': 13.5, fill: 'var(--ink-2)', class: 'num' }, G.over);
        t2.textContent = '肩寬 ' + shoRatio(p).toFixed(3) + 'H';
      }
    });
  }
  function bracket(g, x, y1, y2, c) {
    el('path', { d: 'M' + (x + 5) + ' ' + y1 + 'H' + x + 'V' + y2 + 'H' + (x + 5), fill: 'none', stroke: c, 'stroke-width': 1.6 }, g);
  }

  /* ======================= 1 問題定義 ======================= */
  var OUTFITS = [
    { n: '便服 1', c: '#b54a3c' }, { n: '便服 2', c: '#2d3a66' }, { n: '便服 3', c: '#9a9488' },
    { n: '迷彩服', c: '#4f5c30', uni: true }, { n: '軍便服', c: '#7a7451', uni: true }
  ];
  var GRID_DS = [
    { id: 'gen', n: '一般 ReID', cells: [[0, 0], [1, 1], [2, 2], [3, 0], [4, 1]], pos: 'none',
      txt: '<h3>一般 ReID（Market-1501 等）</h3><p>每人一套衣服，而且不同人幾乎都穿不同衣服。模型用「衣服＝身分」這條捷徑就能拿高分。</p><p class="small muted">兩人碰巧穿同色衣服時（第 1 與第 4 列）就容易錯配——這正是同制服的極端版本。</p>' },
    { id: 'cc', n: 'LTCC / PRCC（換衣）', cells: [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2], [2, 0], [3, 0], [3, 2], [4, 1], [4, 0]], pos: 'row', ltccFix: true,
      txt: '<h3>換衣 ReID</h3><p>同一列裡跨欄配對：<b>同一人換衣後還認得出來嗎？</b></p><p>LTCC 官方明確假設不同人不穿完全相同的服裝；PRCC 的 A/B 攝影機同衣、C 攝影機換衣。兩者都<b>沒有</b>測「同一欄裡分辨不同人」。</p><p class="small"><span class="ev proven"><i></i>文獻證實</span>（LTCC、PRCC 資料集說明）</p>' },
    { id: 'fgpr', n: 'FGPR（同制服）', cells: [[0, 3], [1, 3], [2, 3], [3, 4], [4, 4]], pos: 'col',
      txt: '<h3>FGPR：同制服細粒度 ReID</h3><p>把人分成制服組，同組的人穿相同衣服：358 人、716 段影片、5 個視角。</p><p>難點從「配對同一列」變成<b>「在同一欄裡把不同列分開」</b>——衣服完全提供不了負樣本的區分。</p><p class="small"><span class="ev proven"><i></i>文獻證實</span>（Yin et al., IJCV 2020）</p>' },
    { id: 'camp', n: '軍營實際情境', cells: [[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [0, 4], [2, 4], [4, 4], [1, 0]], pos: 'both',
      txt: '<h3>軍營：兩個問題同時存在</h3><p>多數時間全員穿迷彩服（同一欄分辨不同人），但也會換穿軍便服、休假穿便服（同一列跨欄配對）。</p><p>所以系統同時需要：<b>同制服時拉開不同人</b>，以及<b>換裝時仍連結同一人</b>。現有資料集沒有一個同時涵蓋兩者。</p><p class="small"><span class="ev inferred"><i></i>合理推論</span></p>' }
  ];

  CH.problem = {
    init: function () {
      // --- 身分 × 服裝矩陣 ---
      var chips = $('#grid-ds');
      GRID_DS.forEach(function (d, i) {
        var b = U.h('button', { class: 'chip', 'aria-pressed': i === 2 ? 'true' : 'false', 'data-id': d.id }, d.n);
        b.addEventListener('click', function () {
          U.$$('button', chips).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
          drawGrid(d);
        });
        chips.appendChild(b);
      });
      drawGrid(GRID_DS[2]);

      // --- 特徵空間 ---
      var space = 'app';
      space = U.segGroup($('#space-sel'), 'data-space', function (v) { space = v; drawSpace(); });
      var uni = $('#uni');
      uni.addEventListener('input', drawSpace);
      function drawSpace() { $('#uni-out').textContent = (+uni.value).toFixed(2); renderSpace(space, +uni.value); }
      drawSpace();

      // --- 表 ---
      var rows = [
        ['FGPR', '是：同組相同制服', '半受控多攝影機', 'proven', '直接證據'],
        ['FG-PersonX', '是：制服群組（合成）', '否', 'inferred', '概念直接、部署證據間接'],
        ['Industrial-Gait', '工人標準工作服 + 安全帽', '是：工業閘口', 'inferred', '高度相似的實務場景（J. Imaging 2026）'],
        ['ConstrID', '安全帽、反光背心、相似穿著', '是：營建工地監視器', 'inferred', '高度相關（2026）'],
        ['LTCC', '否：假設不同人不穿相同服裝', '模擬多攝影機', 'open', '不直接'],
        ['PRCC', '否：同一人 A/B 同衣、C 換衣', '受控', 'open', '不直接'],
        ['CCVID', '否：每人 2–5 套衣服', '影片基準', 'open', '不直接，但時間線索有用'],
        ['MEVID', '否：73 天內 9 個日期換衣', '是：33 個視角', 'open', '最接近多日跨攝影機'],
        ['DeepChange', '否：真實長期換衣', '是：17 台戶外攝影機、12 個月', 'open', '場域真實度高，但非制服']
      ];
      var LV = { proven: '<span class="ev proven"><i></i>直接</span>', inferred: '<span class="ev inferred"><i></i>間接</span>', open: '<span class="ev open"><i></i>不測</span>' };
      $('#direct-tbl').innerHTML = '<thead><tr><th>資料集</th><th>不同人、同／相似服裝？</th><th>真實監視器</th><th>對同制服的證據</th><th>判斷</th></tr></thead><tbody>' +
        rows.map(function (r) { return '<tr><td><b>' + r[0] + '</b></td><td>' + r[1] + '</td><td>' + r[2] + '</td><td>' + LV[r[3]] + '</td><td>' + r[4] + '</td></tr>'; }).join('') + '</tbody>';
    }
  };

  function drawGrid(d) {
    var svg = U.clear($('#id-grid'));
    var x0 = 92, y0 = 50, cw = 88, rh = 58;
    OUTFITS.forEach(function (o, j) {
      el('text', { x: x0 + j * cw + cw / 2, y: 30, 'text-anchor': 'middle', 'font-size': 13, fill: o.uni ? 'var(--olive)' : 'var(--ink-2)', 'font-weight': o.uni ? 700 : 400, text: o.n }, svg);
    });
    // 制服欄底色
    el('rect', { x: x0 + 3 * cw, y: y0 - 6, width: cw * 2, height: rh * 5 + 4, fill: '#dfe3d3', rx: 6 }, svg);
    var on = {};
    d.cells.forEach(function (c) { on[c[0] + '-' + c[1]] = true; });
    for (var i = 0; i < 5; i++) {
      el('text', { x: x0 - 14, y: y0 + i * rh + rh / 2 + 4, 'text-anchor': 'end', 'font-size': 13.5, fill: 'var(--ink)', text: '人員 ' + 'ABCDE'[i] }, svg);
      for (var j = 0; j < 5; j++) {
        var cx = x0 + j * cw + cw / 2, cy = y0 + i * rh + rh / 2;
        var active = on[i + '-' + j];
        el('rect', { x: cx - 38, y: cy - 24, width: 76, height: 48, rx: 5, fill: active ? '#fff' : 'transparent', stroke: active ? 'var(--ink)' : 'var(--rule)', 'stroke-width': active ? 1.4 : 1, 'stroke-dasharray': active ? null : '3 3' }, svg);
        if (active) miniPerson(svg, cx, cy + 18, OUTFITS[j].c, 0.9 + i * 0.03);
      }
    }
    // 配對示意
    var g = el('g', {}, svg);
    if (d.pos === 'row' || d.pos === 'both') {
      // 同一列的正樣本連線
      var rowsDone = {};
      d.cells.forEach(function (c) { (rowsDone[c[0]] = rowsDone[c[0]] || []).push(c[1]); });
      Object.keys(rowsDone).forEach(function (r) {
        var cols = rowsDone[r].slice().sort(); if (cols.length < 2) return;
        var y = y0 + r * rh + rh / 2 - 26;
        var xa = x0 + cols[0] * cw + cw / 2, xb = x0 + cols[cols.length - 1] * cw + cw / 2;
        el('path', { d: 'M' + xa + ' ' + y + 'Q' + (xa + xb) / 2 + ' ' + (y - 14) + ' ' + xb + ' ' + y, fill: 'none', stroke: 'var(--c-app)', 'stroke-width': 1.8 }, g);
      });
    }
    if (d.pos === 'col' || d.pos === 'both') {
      var colMap = {};
      d.cells.forEach(function (c) { if (OUTFITS[c[1]].uni) (colMap[c[1]] = colMap[c[1]] || []).push(c[0]); });
      Object.keys(colMap).forEach(function (cj) {
        var rs = colMap[cj].slice().sort(); if (rs.length < 2) return;
        var x = x0 + cj * cw + cw - 6;
        var ya = y0 + rs[0] * rh + 8, yb = y0 + rs[rs.length - 1] * rh + rh - 8;
        el('path', { d: 'M' + (x - 4) + ' ' + ya + 'H' + x + 'V' + yb + 'H' + (x - 4), fill: 'none', stroke: 'var(--bad)', 'stroke-width': 1.8 }, g);
      });
    }
    // 圖例
    var ly = y0 + 5 * rh + 26;
    el('path', { d: 'M' + x0 + ' ' + ly + 'q20 -10 40 0', fill: 'none', stroke: 'var(--c-app)', 'stroke-width': 1.8 }, svg);
    el('text', { x: x0 + 48, y: ly + 4, 'font-size': 12.5, fill: 'var(--ink-2)', text: '要連起來（同一人）' }, svg);
    el('path', { d: 'M' + (x0 + 200) + ' ' + (ly - 8) + 'h4v16h-4', fill: 'none', stroke: 'var(--bad)', 'stroke-width': 1.8 }, svg);
    el('text', { x: x0 + 212, y: ly + 4, 'font-size': 12.5, fill: 'var(--ink-2)', text: '要分開（不同人、同衣服）' }, svg);
    $('#grid-explain').innerHTML = d.txt;
  }
  function miniPerson(svg, cx, base, color, s) {
    var hgt = 40 * s;
    el('circle', { cx: cx, cy: base - hgt + 4, r: 4.2, fill: '#c99b78' }, svg);
    el('line', { x1: cx, y1: base - hgt + 10, x2: cx, y2: base - hgt * 0.45, stroke: color, 'stroke-width': 9, 'stroke-linecap': 'round' }, svg);
    el('line', { x1: cx - 3, y1: base - hgt * 0.45, x2: cx - 5, y2: base, stroke: color, 'stroke-width': 4.5, 'stroke-linecap': 'round', opacity: 0.85 }, svg);
    el('line', { x1: cx + 3, y1: base - hgt * 0.45, x2: cx + 5, y2: base, stroke: color, 'stroke-width': 4.5, 'stroke-linecap': 'round', opacity: 0.85 }, svg);
  }

  // ---- 特徵空間模擬 ----
  var SPACE_PTS = (function () {
    var r = U.rng(20261110), out = [];
    var clothC = [[-0.62, 0.48], [0.58, 0.55], [0.05, -0.66], [-0.55, -0.42], [0.62, -0.30]];
    var residual = [[0.10, 0.05], [-0.06, 0.09], [0.04, -0.10], [-0.09, -0.04], [0.07, -0.02]];
    for (var i = 0; i < 5; i++) {
      var ang = i / 5 * Math.PI * 2 + 0.4;
      var gaitC = [Math.cos(ang) * 0.52, Math.sin(ang) * 0.52];
      for (var k = 0; k < 10; k++) {
        out.push({ id: i, cloth: clothC[i], res: residual[i], gaitC: gaitC,
          na: [U.gauss(r) * 0.055, U.gauss(r) * 0.055], ng: [U.gauss(r) * 0.12, U.gauss(r) * 0.12] });
      }
    }
    return out;
  })();
  function spaceCoords(space, u) {
    return SPACE_PTS.map(function (p) {
      var ax = U.lerp(p.cloth[0], 0, u) + p.res[0] * u + p.na[0];
      var ay = U.lerp(p.cloth[1], 0, u) + p.res[1] * u + p.na[1];
      var gx = p.gaitC[0] + p.ng[0], gy = p.gaitC[1] + p.ng[1];
      if (space === 'app') return { id: p.id, v: [ax, ay] };
      if (space === 'gait') return { id: p.id, v: [gx, gy] };
      return { id: p.id, v: [ax, ay, gx * 0.85, gy * 0.85] };
    });
  }
  function pca2(pts) {
    var n = pts.length, d = pts[0].v.length, mean = [];
    for (var j = 0; j < d; j++) { mean[j] = 0; pts.forEach(function (p) { mean[j] += p.v[j] / n; }); }
    var X = pts.map(function (p) { return p.v.map(function (x, j) { return x - mean[j]; }); });
    var C = []; for (var a = 0; a < d; a++) { C[a] = []; for (var b = 0; b < d; b++) { var s = 0; X.forEach(function (x) { s += x[a] * x[b]; }); C[a][b] = s / n; } }
    function power(M) { var v = []; for (var i = 0; i < d; i++) v[i] = 1 / (i + 1); for (var it = 0; it < 80; it++) { var w = []; for (var i2 = 0; i2 < d; i2++) { w[i2] = 0; for (var k = 0; k < d; k++) w[i2] += M[i2][k] * v[k]; } var nn = Math.sqrt(w.reduce(function (s, x) { return s + x * x; }, 0)) || 1; v = w.map(function (x) { return x / nn; }); } var lam = 0; for (var i3 = 0; i3 < d; i3++) for (var k2 = 0; k2 < d; k2++) lam += v[i3] * M[i3][k2] * v[k2]; return { v: v, l: lam }; }
    var e1 = power(C); var C2 = C.map(function (row, i) { return row.map(function (x, j) { return x - e1.l * e1.v[i] * e1.v[j]; }); }); var e2 = power(C2);
    return X.map(function (x) { return [x.reduce(function (s, xi, i) { return s + xi * e1.v[i]; }, 0), x.reduce(function (s, xi, i) { return s + xi * e2.v[i]; }, 0)]; });
  }
  function rank1(pts) {
    var ok = 0;
    pts.forEach(function (p, i) {
      var best = 1e9, bid = -1;
      pts.forEach(function (q, j) { if (i === j) return; var s = 0; for (var k = 0; k < p.v.length; k++) s += (p.v[k] - q.v[k]) * (p.v[k] - q.v[k]); if (s < best) { best = s; bid = q.id; } });
      if (bid === p.id) ok++;
    });
    return ok / pts.length;
  }
  function sepRatio(pts) {
    var d = pts[0].v.length, C = [];
    for (var i = 0; i < 5; i++) { C[i] = []; for (var k = 0; k < d; k++) C[i][k] = 0; }
    pts.forEach(function (p) { for (var k = 0; k < d; k++) C[p.id][k] += p.v[k] / 10; });
    var intra = 0; pts.forEach(function (p) { intra += Math.sqrt(p.v.reduce(function (s, x, k) { return s + (x - C[p.id][k]) * (x - C[p.id][k]); }, 0)) / pts.length; });
    var inter = 0, c = 0; for (var a = 0; a < 5; a++) for (var b = a + 1; b < 5; b++) { inter += Math.sqrt(C[a].reduce(function (s, x, k) { return s + (x - C[b][k]) * (x - C[b][k]); }, 0)); c++; }
    return (inter / c) / intra;
  }
  function shape(g, kind, x, y, r, fill) {
    var a = { fill: fill, stroke: '#fff', 'stroke-width': 1.2 };
    if (kind === 'circle') return el('circle', Object.assign({ cx: x, cy: y, r: r }, a), g);
    if (kind === 'square') return el('rect', Object.assign({ x: x - r * 0.9, y: y - r * 0.9, width: r * 1.8, height: r * 1.8 }, a), g);
    if (kind === 'triangle') return el('path', Object.assign({ d: 'M' + x + ' ' + (y - r * 1.15) + 'L' + (x + r * 1.05) + ' ' + (y + r * 0.75) + 'L' + (x - r * 1.05) + ' ' + (y + r * 0.75) + 'Z' }, a), g);
    if (kind === 'diamond') return el('path', Object.assign({ d: 'M' + x + ' ' + (y - r * 1.2) + 'L' + (x + r * 1.2) + ' ' + y + 'L' + x + ' ' + (y + r * 1.2) + 'L' + (x - r * 1.2) + ' ' + y + 'Z' }, a), g);
    return el('path', Object.assign({ d: 'M' + (x - r) + ' ' + (y - r * 0.35) + 'h' + r * 0.65 + 'v-' + r * 0.65 + 'h' + r * 0.7 + 'v' + r * 0.65 + 'h' + r * 0.65 + 'v' + r * 0.7 + 'h-' + r * 0.65 + 'v' + r * 0.65 + 'h-' + r * 0.7 + 'v-' + r * 0.65 + 'h-' + r * 0.65 + 'Z' }, a), g);
  }
  global.drawShape = shape;

  function renderSpace(space, u) {
    var svg = U.clear($('#space'));
    var pts = spaceCoords(space, u);
    var xy = space === 'fused' ? pca2(pts) : pts.map(function (p) { return p.v; });
    var W = 520, H = 380, cx = W / 2, cy = 190, sc = 210;
    sc = 180; if (space === 'fused') sc = 160;
    el('rect', { x: 10, y: 10, width: W - 20, height: H - 50, fill: '#fff', stroke: 'var(--rule-2)' }, svg);
    el('line', { x1: cx, x2: cx, y1: 18, y2: H - 48, stroke: 'var(--rule-2)' }, svg);
    el('line', { x1: 18, x2: W - 18, y1: cy, y2: cy, stroke: 'var(--rule-2)' }, svg);
    var g = el('g', {}, svg);
    pts.forEach(function (p, i) {
      var x = U.clamp(cx + xy[i][0] * sc, 18, W - 18), y = U.clamp(cy - xy[i][1] * sc, 18, H - 48);
      var s = shape(g, ID_SHAPES[p.id], x, y, 6, ID_COLORS[p.id]);
      s.setAttribute('tabindex', '-1');
      U.tip(s, '<b>人員 ' + 'ABCDE'[p.id] + '</b> 的一段軌跡');
    });
    // 圖例
    for (var i = 0; i < 5; i++) {
      shape(svg, ID_SHAPES[i], 26 + i * 76, H - 18, 6, ID_COLORS[i]);
      el('text', { x: 38 + i * 76, y: H - 13, 'font-size': 13, fill: 'var(--ink-2)', text: '人員 ' + 'ABCDE'[i] }, svg);
    }
    var lab = { app: '外觀嵌入（2 維示意）', gait: '步態嵌入（2 維示意）', fused: '外觀 ⊕ 步態（4 維，PCA 投影到 2 維）' }[space];
    el('text', { x: 20, y: 30, 'font-size': 12.5, fill: 'var(--ink-3)', text: lab }, svg);
    var r1 = rank1(pts), sr = sepRatio(pts);
    $('#r1').textContent = U.pct(r1);
    $('#sep').textContent = sr.toFixed(2);
    var notes = {
      app: u < 0.3 ? '衣服不同時，外觀群集彼此遠離——一般 ReID 的舒適區。' : u < 0.8 ? '制服越像，群集往中心擠。殘餘線索（鞋、髮型、配件）還撐著一點距離。' : '幾乎相同制服：外觀群集重疊，只剩殘餘線索。最近鄰開始配錯人。',
      gait: '步態不受制服影響，所以拉動滑桿不會改變這張圖；但每群較散——步態估計本身雜訊較大，單獨使用也不完美。',
      fused: '把兩個空間串接起來：外觀負責衣服不同時的區分，步態在同制服時接手。這是「互補」的幾何直覺，不代表實際模型一定如此。'
    };
    $('#space-note').textContent = notes[space];
  }

  /* ======================= 2 身分線索 ======================= */
  var CUE_VIEW = { yaw: 0.5, pitch: 0.05, scale: 330, x: 230, y: 392 };
  var cueState = { id: 'skel', t: 0.6 };

  CH.cues = {
    init: function () {
      var chips = $('#cue-chips');
      ['app', 'face', 'skel', 'sil', 'gait', 'anthro', 'smpl'].forEach(function (id) {
        var c = D.CUES.filter(function (x) { return x.id === id; })[0];
        var b = U.h('button', { class: 'chip', 'data-id': id, 'aria-pressed': id === cueState.id ? 'true' : 'false' }, '<span class="sw-dot" style="--c:' + c.color + '"></span>' + c.name);
        b.addEventListener('click', function () { selectCue(id); });
        chips.appendChild(b);
      });
      selectCue(cueState.id);
      // 步態對照
      var m = U.segGroup($('#strip-mode'), 'data-m', drawStrip);
      drawStrip(m);
      drawCueHeat();
    }
  };
  function selectCue(id) {
    cueState.id = id;
    U.$$('#cue-chips button').forEach(function (b) {
      var bid = b.getAttribute('data-id');
      var match = bid === id || (id === 'clip' && bid === 'app') || (id === 'head' && bid === 'face') || (id === 'pose' && bid === 'gait') || (id === 'body' && bid === 'sil');
      b.setAttribute('aria-pressed', match ? 'true' : 'false');
    });
    drawCueFig(id);
    var c = D.CUES.filter(function (x) { return x.id === id; })[0];
    var bars = D.CUE_PROPS.map(function (pp) {
      var v = c.props[pp.k], fav = pp.good === 'low' ? 4 - v : v;
      return '<div style="display:grid;grid-template-columns:72px 1fr 34px;gap:8px;align-items:center;font-size:13px"><span class="muted">' + pp.name + '</span><span style="height:8px;background:var(--rule-2);border-radius:4px;position:relative"><span style="position:absolute;left:0;top:0;bottom:0;width:' + (fav / 4 * 100) + '%;background:var(--olive);border-radius:4px"></span></span><span class="num">' + ['極低', '低', '中', '高', '極高'][v] + '</span></div>';
    }).join('');
    $('#cue-detail').innerHTML = '<h3>' + c.name + '</h3><p style="margin-top:0">' + c.what + '</p>' +
      '<dl><dt>主要失效</dt><dd>' + c.fail + '</dd><dt>互補對象</dt><dd>' + c.pair + '</dd></dl>' +
      '<div style="margin-top:14px;display:grid;gap:6px">' + bars + '</div><p class="small muted" style="margin-top:8px">長條越長＝對同制服情境越有利。</p>';
    U.$$('#cue-heat .row').forEach(function (r) { r.setAttribute('opacity', r.getAttribute('data-id') === id ? 1 : 0.55); });
  }

  function drawCueFig(id) {
    var svg = U.clear($('#cue-fig'));
    var p = PEOPLE[0], v = CUE_VIEW, phi = cueState.t;
    el('line', { x1: 40, x2: 520, y1: v.y, y2: v.y, stroke: 'var(--rule)', 'stroke-width': 1.5 }, svg);
    var g = el('g', {}, svg), over = el('g', {}, svg);
    var J = PM.joints(p, phi);
    function P(n) { var q = PM.project(J[n], v.yaw, v.pitch); return [v.x + q[0] * v.scale, v.y + q[1] * v.scale]; }
    function note(x, y, txt, color, anchor) {
      el('text', { x: x, y: y, 'font-size': 13.5, fill: color || 'var(--ink)', 'text-anchor': anchor || 'start', text: txt }, over);
    }
    var mode = { app: 'rgb', clip: 'rgb', face: 'rgb', head: 'rgb', skel: 'skel', pose: 'skel', sil: 'sil', body: 'sil', gait: 'sil', anthro: 'skel', smpl: 'skel' }[id];
    var style = {};
    if (id === 'anthro' || id === 'smpl') style.boneColor = '#9a7b12';
    if (id === 'pose') style.boneColor = '#d55181';
    if (id === 'gait') {
      // 多重曝光：同一人的 5 個時間點
      for (var k = 4; k >= 1; k--) {
        var gg = el('g', { opacity: 0.12 + 0.08 * (4 - k) }, g);
        PM.renderSVG(gg, PM.parts(p, phi - k * 0.55, v, 'sil'), { silColor: '#d55181' });
      }
    }
    var body = el('g', {}, g);
    PM.renderSVG(body, PM.parts(p, phi, v, mode), style);
    var head = P('head');

    if (id === 'app' || id === 'clip') {
      [['帽子', head[0] + 30, head[1] - 30], ['上衣迷彩', P('lSho')[0] + 50, P('lSho')[1] + 40], ['褲子', P('lKnee')[0] + 40, P('lKnee')[1] - 10], ['鞋', P('lToe')[0] + 34, P('lToe')[1] - 4]].forEach(function (a) {
        el('circle', { cx: a[1] - 26, cy: a[2] - 4, r: 3, fill: 'var(--c-app)' }, over);
        el('line', { x1: a[1] - 26, y1: a[2] - 4, x2: a[1] - 4, y2: a[2] - 4, stroke: 'var(--c-app)' }, over);
        note(a[1], a[2], a[0], 'var(--c-app)');
      });
      note(300, 60, '同制服：前三項全員相同', 'var(--ink-2)');
      note(300, 80, '只剩鞋、髮型、配件差異', 'var(--ink-2)');
    }
    if (id === 'face' || id === 'head') {
      el('rect', { x: head[0] - 30, y: head[1] - 32, width: 62, height: 62, fill: 'none', stroke: 'var(--c-face)', 'stroke-width': 2 }, over);
      note(head[0] + 42, head[1] - 10, '臉部 / 頭部區域', 'var(--c-face)');
      note(head[0] + 42, head[1] + 10, '在 1080p 監視器、10 公尺外', 'var(--ink-2)');
      note(head[0] + 42, head[1] + 28, '常只剩 15–25 像素寬', 'var(--ink-2)');
      note(300, 300, '背面、軍帽、口罩 → 直接缺失', 'var(--ink-2)');
    }
    if (id === 'skel' || id === 'pose') {
      ['lKnee', 'rKnee', 'lElb', 'lAnkle'].forEach(function (n) { var q = P(n); el('circle', { cx: q[0], cy: q[1], r: 9, fill: 'none', stroke: style.boneColor || 'var(--c-skel)', 'stroke-width': 1.2, 'stroke-dasharray': '2 2' }, over); });
      note(300, 70, '17 個關節點 × T 幀', 'var(--ink)');
      note(300, 90, '張量 T × 17 × 2（+ 信心值）', 'var(--ink-2)');
      if (id === 'pose') { note(300, 120, '動態：膝角、擺臂角隨時間變化', 'var(--c-gait)'); }
      note(300, 300, '失效：關節漂移、左右互換', 'var(--ink-2)');
    }
    if (id === 'sil' || id === 'body') {
      note(300, 70, '人形二值遮罩', 'var(--c-sil)');
      note(300, 90, '常見輸入 64 × 44 × T', 'var(--ink-2)');
      note(300, 300, '失效：分割錯誤、背包、寬鬆外套', 'var(--ink-2)');
    }
    if (id === 'gait') {
      note(300, 70, '步態 = 時間序列中的身分', 'var(--c-gait)');
      note(300, 90, '步幅、步頻、身體起伏、擺臂', 'var(--ink-2)');
      note(300, 300, '需要人在走路、軌跡夠長', 'var(--ink-2)');
    }
    if (id === 'anthro') {
      var sx = 70;
      var top = [0, head[1] - 34], hip = P('lHip');
      bracket(over, sx, top[1], v.y, '#9a7b12'); note(sx - 6, (top[1] + v.y) / 2, '身高 H', '#9a7b12', 'end');
      bracket(over, sx + 18, hip[1], v.y, '#9a7b12'); note(sx + 30, hip[1] + 40, '腿長 ' + legRatio(p).toFixed(2) + 'H', '#9a7b12');
      var ls = P('lSho'), rs = P('rSho');
      el('line', { x1: ls[0], y1: ls[1] - 14, x2: rs[0], y2: rs[1] - 14, stroke: '#9a7b12', 'stroke-width': 2 }, over);
      note(Math.max(ls[0], rs[0]) + 10, ls[1] - 18, '肩寬 ' + shoRatio(p).toFixed(2) + 'H', '#9a7b12');
      note(300, 290, '基準比例：Drillis & Contini', 'var(--ink-2)');
      note(300, 308, '大腿 .245H、小腿 .246H、肩 .259H', 'var(--ink-2)');
    }
    if (id === 'smpl') {
      // 以膠囊體表示 3D 體積
      [['lHip', 'lKnee', 22], ['lKnee', 'lAnkle', 18], ['rHip', 'rKnee', 22], ['rKnee', 'rAnkle', 18], ['lSho', 'lElb', 15], ['lElb', 'lWri', 13], ['rSho', 'rElb', 15], ['rElb', 'rWri', 13], ['neck', 'pelvis', 56]].forEach(function (s) {
        var a = P(s[0]), b = P(s[1]);
        el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: '#9a7b12', 'stroke-width': s[2], 'stroke-linecap': 'round', opacity: 0.18 }, g);
      });
      note(300, 70, 'SMPL：形狀 β（10 維）＋ 姿態 θ', '#9a7b12');
      note(300, 90, '拆開衣服、姿態、紋理', 'var(--ink-2)');
      note(300, 300, '失效：單眼重建誤差、遠距低解析', 'var(--ink-2)');
    }
  }

  function drawStrip(m) {
    var svg = U.clear($('#strip'));
    var who = [PEOPLE[0], PEOPLE[1]];
    who.forEach(function (p, r) {
      var y = 150 + r * 190;
      el('text', { x: 8, y: y - 90, 'font-size': 14, fill: 'var(--ink)', 'font-weight': 700, text: '人員 ' + p.id }, svg);
      el('text', { x: 8, y: y - 72, 'font-size': 12.5, fill: 'var(--ink-3)', class: 'num', text: '腿長 ' + legRatio(p).toFixed(2) + 'H · 步頻 ×' + p.cadence.toFixed(2) }, svg);
      el('line', { x1: 170, x2: 990, y1: y, y2: y, stroke: 'var(--rule-2)' }, svg);
      var trace = [];
      for (var i = 0; i < 8; i++) {
        var t = i * 0.13, phi = 2 * Math.PI * 0.95 * p.cadence * t;
        var x = 230 + i * 104;
        var g = el('g', {}, svg);
        PM.renderSVG(g, PM.parts(p, phi, { yaw: 0, pitch: 0, scale: 118, x: x, y: y }, m), {});
        el('text', { x: x, y: y + 16, 'text-anchor': 'middle', 'font-size': 11.5, fill: 'var(--ink-3)', class: 'num', text: 't=' + t.toFixed(2) + 's' }, svg);
      }
      // 腳踝前後位置曲線（連續）
      for (var s = 0; s <= 140; s++) {
        var tt = s / 140 * 0.91, ph = 2 * Math.PI * 0.95 * p.cadence * tt;
        var J = PM.joints(p, ph);
        trace.push((230 + tt / 0.13 * 104).toFixed(1) + ',' + (y + 44 - J.lAnkle[2] * 50).toFixed(1));
      }
      el('polyline', { points: trace.join(' '), fill: 'none', stroke: m === 'skel' ? 'var(--c-gait)' : 'var(--ink-3)', 'stroke-width': 1.8 }, svg);
    });
    el('text', { x: 990, y: 412, 'text-anchor': 'end', 'font-size': 12, fill: 'var(--ink-3)', text: '曲線：左腳踝前後位置隨時間變化（週期 = 步頻）' }, svg);
  }

  function drawCueHeat() {
    var svg = $('#cue-heat');
    var RAMP = ['#eef0e6', '#cfd6b4', '#a7b47c', '#76874a', '#4f5c30'];
    var x0 = 150, y0 = 46, cw = 98, rh = 33;
    D.CUE_PROPS.forEach(function (pp, j) {
      var t = el('text', { x: x0 + j * cw + cw / 2, y: 26, 'text-anchor': 'middle', 'font-size': 13, fill: 'var(--ink)', 'font-weight': 700, text: pp.name }, svg);
      el('text', { x: x0 + j * cw + cw / 2, y: 40, 'text-anchor': 'middle', 'font-size': 10.5, fill: 'var(--ink-3)', text: pp.good === 'low' ? '低較好' : '高較好' }, svg);
    });
    D.CUES.forEach(function (c, i) {
      var row = el('g', { class: 'row', 'data-id': c.id, tabindex: 0, role: 'button', 'aria-label': c.name, style: 'cursor:pointer' }, svg);
      el('circle', { cx: 14, cy: y0 + i * rh + rh / 2, r: 5, fill: c.hex }, row);
      el('text', { x: 26, y: y0 + i * rh + rh / 2 + 5, 'font-size': 14, fill: 'var(--ink)', text: c.name }, row);
      D.CUE_PROPS.forEach(function (pp, j) {
        var v = c.props[pp.k], fav = pp.good === 'low' ? 4 - v : v;
        var r = el('rect', { x: x0 + j * cw + 1, y: y0 + i * rh + 1, width: cw - 2, height: rh - 2, rx: 3, fill: RAMP[fav] }, row);
        el('text', { x: x0 + j * cw + cw / 2, y: y0 + i * rh + rh / 2 + 5, 'text-anchor': 'middle', 'font-size': 12.5, fill: fav >= 3 ? '#fff' : 'var(--ink)', text: ['極低', '低', '中', '高', '極高'][v] }, row);
        U.tip(r, '<b>' + c.name + ' · ' + pp.name + '</b>：' + ['極低', '低', '中', '高', '極高'][v] + '<br>' + pp.tip);
      });
      function go() { selectCue(c.id); document.getElementById('cue-fig').scrollIntoView({ behavior: U.reduceMotion ? 'auto' : 'smooth', block: 'center' }); }
      row.addEventListener('click', go);
      row.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
    svg.setAttribute('viewBox', '0 0 ' + (x0 + cw * 7 + 4) + ' ' + (y0 + rh * D.CUES.length + 6));
  }
})(window);
