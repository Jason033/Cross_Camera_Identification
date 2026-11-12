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
  var hero = { lens: 'rgb', outfit: 'camo', playing: !U.reduceMotion, t: 3.2, raf: 0, last: 0 };
  var MIX = ['camo', 'helmet', 'winter', 'pt', 'summer'];
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
      hero.outfit = U.segGroup($('#outfit-sel'), 'data-o', function (v) { hero.outfit = v; drawHero(); });
      var btn = $('#lineup-play');
      function syncBtn() { btn.textContent = hero.playing ? '❚❚ 暫停' : '▶ 播放'; btn.setAttribute('aria-pressed', hero.playing ? 'true' : 'false'); }
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
    var ON = { camo: '', helmet: '鋼盔：頭形變大、頭頂被遮住，身高估計會偏高。', summer: '夏季捲袖：前臂露出，袖口位置與顏色都變了。', winter: '冬季外套：上身變厚、蓋過腰，肩寬與體型估計會被衣服撐大。', pt: '運動服：顏色、輪廓、鞋子全變了——外觀模型會把同一人當成另一個人，骨架與步態則幾乎不受影響。', mix: '同一天的不同時段：五人各穿不同服裝。系統必須把「穿迷彩服的 A」和「穿運動服的 A」連成同一人。' };
    var base = (lens === 'rgb' && hero.outfit !== 'camo') ? '攝影機畫面：' + (hero.outfit === 'mix' ? '同一天裡，五人各穿不同服裝。' : '五人換上同一套服裝，彼此仍然幾乎一樣。') : CAPTIONS[lens];
    $('#lens-caption').textContent = base + (ON[hero.outfit] ? '　【服裝】' + ON[hero.outfit] : '');
    PEOPLE.forEach(function (p0, i) {
      var p = Object.assign({}, p0, { outfit: hero.outfit === 'mix' ? MIX[i] : hero.outfit });
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
  // 矩陣的欄：兩套便服 + 營區四種常見服裝（皆為同款，屬「制服」）
  var OUTFITS = [
    { k: 'casualA', n: '便服 1' }, { k: 'casualB', n: '便服 2' },
    { k: 'camo', n: '迷彩小帽', uni: true }, { k: 'helmet', n: '鋼盔', uni: true }, { k: 'winter', n: '冬季外套', uni: true }, { k: 'pt', n: '運動服', uni: true }
  ];
  var GRID_DS = [
    { id: 'gen', n: '一般 ReID', cells: [[0, 0], [1, 1], [2, 0], [3, 1], [4, 0]], pos: 'none',
      txt: '<h3>一般 ReID（Market-1501 等）</h3><p>每人一套便服，而且不同人幾乎都穿不同衣服。模型用「衣服＝身分」這條捷徑就能拿高分。</p><p class="small muted">兩人碰巧穿同一套衣服時（例如第 1、3、5 列）就容易錯配——這正是同制服的極端版本。</p>' },
    { id: 'cc', n: 'LTCC / PRCC（換衣）', cells: [[0, 0], [0, 1], [1, 0], [1, 1], [2, 1], [3, 0], [3, 1], [4, 0]], pos: 'row', ltccFix: true,
      txt: '<h3>換衣 ReID</h3><p>同一列裡跨欄配對：<b>同一人換衣後還認得出來嗎？</b></p><p>LTCC 官方明確假設不同人不穿完全相同的服裝；PRCC 的 A/B 攝影機同衣、C 攝影機換衣。兩者都<b>沒有</b>測「同一欄裡分辨不同人」。</p><p class="small"><span class="ev proven"><i></i>文獻證實</span>（LTCC、PRCC 資料集說明）</p>' },
    { id: 'fgpr', n: 'FGPR（同制服）', cells: [[0, 2], [1, 2], [2, 2], [3, 3], [4, 3]], pos: 'col',
      txt: '<h3>FGPR：同制服細粒度 ReID</h3><p>把人分成制服組，同組的人穿相同衣服：358 人、716 段影片、5 個視角。</p><p>難點從「配對同一列」變成<b>「在同一欄裡把不同列分開」</b>——衣服完全提供不了負樣本的區分。</p><p class="small"><span class="ev proven"><i></i>文獻證實</span>（Yin et al., IJCV 2020）</p>' },
    { id: 'camp', n: '本專案：營區', cells: [[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [0, 5], [1, 5], [2, 3], [3, 4], [4, 5], [4, 3]], pos: 'both',
      txt: '<h3>本專案：同一天、同一群人、多種服裝</h3><p>平常全員穿迷彩服加小帽（同一欄要分開不同人）；同一天內又會換鋼盔、冬季外套或運動服（同一列要連成同一人）。</p><p>所以系統同時要做到：<b>同服裝時分得開不同人</b>，以及<b>換裝後仍連得起同一人</b>。現有公開資料集沒有一個同時涵蓋兩者。</p><p class="small"><span class="ev inferred"><i></i>合理推論</span>（本專案需求）</p>' }
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
    var x0 = 84, y0 = 50, cw = 78, rh = 58;
    OUTFITS.forEach(function (o, j) {
      el('text', { x: x0 + j * cw + cw / 2, y: 30, 'text-anchor': 'middle', 'font-size': 13, fill: o.uni ? 'var(--olive)' : 'var(--ink-2)', 'font-weight': o.uni ? 700 : 400, text: o.n }, svg);
    });
    // 制服欄底色
    el('rect', { x: x0 + 2 * cw, y: y0 - 6, width: cw * 4, height: rh * 5 + 4, fill: '#dfe3d3', rx: 6 }, svg);
    var on = {};
    d.cells.forEach(function (c) { on[c[0] + '-' + c[1]] = true; });
    for (var i = 0; i < 5; i++) {
      el('text', { x: x0 - 14, y: y0 + i * rh + rh / 2 + 4, 'text-anchor': 'end', 'font-size': 13.5, fill: 'var(--ink)', text: '人員 ' + 'ABCDE'[i] }, svg);
      for (var j = 0; j < OUTFITS.length; j++) {
        var cx = x0 + j * cw + cw / 2, cy = y0 + i * rh + rh / 2;
        var active = on[i + '-' + j];
        el('rect', { x: cx - 34, y: cy - 24, width: 68, height: 48, rx: 5, fill: active ? '#fff' : 'transparent', stroke: active ? 'var(--ink)' : 'var(--rule)', 'stroke-width': active ? 1.4 : 1, 'stroke-dasharray': active ? null : '3 3' }, svg);
        if (active) miniPerson(svg, cx, cy + 21, OUTFITS[j].k, i);
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
  function miniPerson(svg, cx, base, outfit, i) {
    var p = Object.assign({}, PEOPLE[i], { outfit: outfit }), g = el('g', {}, svg);
    PM.renderSVG(g, PM.parts(p, p.phase0 + 1.2, { yaw: 0.5, pitch: 0.1, scale: 40, x: cx, y: base }, 'rgb'), {});
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

})(window);
