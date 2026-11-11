/* ch-methods.js — 方法解剖台（第 2 章）、方法版圖（附錄） */
(function (global) {
  'use strict';
  var R = global.R, el = U.el, $ = U.$;
  var CH = global.CH = global.CH || {};
  var P = global.PEOPLE;
  var CW = 150, CHH = 200; // 每格畫布的邏輯尺寸

  /* ======================= 六類方法 ======================= */
  var FAMS = [
    { id: 'app', n: '外觀 ReID', c: '#2a78d6', reps: ['TransReID', 'CLIP-ReID', 'SOLIDER', 'PersonViT'],
      idea: '把裁切的人像切成小方塊，用 Transformer 學「這個人看起來長什麼樣」。',
      learns: '衣服顏色與紋理、髮型、鞋、配件。圖中的示意只用「區塊平均色」、沒有經過訓練，所以接近亂猜；用同制服資料微調的真實模型會學到鞋、體型、配件等細節，表現好得多。',
      needs: '單張影像即可', fails: ['換裝', '光線不同', '同制服（未微調時）'],
      num: [['MSMT17 mAP（衣著各異的街景）', '73.4–80.8', 'proven'], ['Industrial-Gait 工作服＋安全帽，RGB Rank-1', '88.3（待核對）', 'inferred']],
      score: 2, verdict: '同一套服裝之內（同一天、沒換裝）仍是有用的線索，微調後可抓鞋、配件等細節；換裝後失效，不能用來跨服裝連結。',
      lic: '寬鬆（MIT／Apache）', cost: '低' },
    { id: 'cal', n: '去衣服化', c: '#6b8fc4', reps: ['CAL', 'AIM', 'FSAM'],
      idea: '另訓一個「衣服分類器」，再逼主模型的特徵騙過它，讓特徵不再帶衣服資訊。',
      learns: '同一人換了衣服，特徵仍要一樣。前提是訓練資料裡同一人有好幾套衣服。圖中以「壓低衣服顏色、保留體型輪廓」示意。',
      needs: '單張影像＋衣服標籤（同一人多套服裝的訓練資料）', fails: ['全員同服時分不開不同人', '訓練資料沒有換裝'],
      num: [['PRCC 換衣 Rank-1', '55.2（CAL）', 'proven'], ['MEVID 真實跨日換衣 Rank-1', '3.5（CAL）', 'proven']],
      score: 3, verdict: '本專案有同一天換裝的需求，這類方法處理的正是「換裝後連得起同一人」那一半；但對「同服裝時分開不同人」幫助有限。需要在營區收集同一人穿多套服裝的訓練資料。',
      lic: '寬鬆（CAL：Apache）', cost: '低' },
    { id: 'sil', n: '輪廓步態', c: '#1baf7a', reps: ['GaitBase', 'DeepGaitV2', 'SwinGait'],
      idea: '把每幀的人切成黑白剪影，疊起來看身形與走路時形狀的變化。',
      learns: '身形輪廓與步態節奏；與衣服顏色無關，但寬鬆衣物、背包會改變輪廓。',
      needs: '連續影片（約 1 個步態週期以上）＋人形分割', fails: ['遠距低解析', '下半身遮擋', '軌跡太短'],
      num: [['Gait3D Rank-1（39 台相機、野外）', '74.4（DeepGaitV2-P3D）', 'proven']],
      score: 3, verdict: '建議的第一個步態模組。授權僅限學術，正式系統需取得授權或重新實作。',
      lic: '僅學術（OpenGait）', cost: '中：11M 參數、2.9 GFLOPs' },
    { id: 'skel', n: '骨架步態', c: '#eb6834', reps: ['GPGait', 'SkeletonGait'],
      idea: '先估出關節點，把骨架移到原點、縮放到同一身高，再學關節怎麼動。',
      learns: '腿長比例、膝蓋彎曲、步幅、擺臂、步頻。正規化時身高資訊會被拿掉。',
      needs: '連續影片＋姿態估計', fails: ['遠距低解析（關節估不準）', '遮擋', '俯角過大'],
      num: [['Gait3D Rank-1', '22.5（GPGait）', 'proven'], ['GREW Rank-1', '53.6（GPGait）', 'proven']],
      score: 3, verdict: '不受衣服顏色影響，但上游姿態估計是瓶頸。適合作輔助模態，與輪廓互補。',
      lic: '未確認', cost: '小（不含姿態估計）' },
    { id: 'body', n: '3D 體型', c: '#9a7b12', reps: ['3DInvarReID', 'CLIP3DReID'],
      idea: '從影像擬合 3D 人體，把姿態、衣服、紋理拆掉，只留下「體型」。',
      learns: '身高、腿長、肩寬、髖寬這類不隨衣服改變的身體尺寸。',
      needs: '單張即可（訓練需 3D 監督）', fails: ['遠距低解析（重建誤差大）', '寬鬆衣物'],
      num: [['CCVID 換衣 Rank-1', '84.5（CLIP3DReID）', 'proven'], ['3DInvarReID 單用 → 與 CAL 融合', '70.2 → 84.3', 'proven']],
      score: 2, verdict: '理論上最接近穩定的身體身分。高架遠距的重建誤差未知，適合當第二批實驗。',
      lic: '未確認', cost: '推論輕（R50 學生）；訓練複雜' },
    { id: 'fuse', n: '多專家融合', c: '#1c251f', reps: ['HAMoBE', 'FarSight'],
      idea: '同時跑外觀、體型、步態三位專家，再由「門控」依畫面情況決定各信幾分。',
      learns: '每位專家各學一種線索；門控學「這段影片哪個線索比較可靠」。',
      needs: '影片', fails: ['算力（凍結 CLIP ViT-L/14）', '全部線索同時失效時救不回'],
      num: [['MEVID 真實跨日換衣 Rank-1', '20.1（HAMoBE；舊方法 < 6）', 'proven'], ['BRIAR 臉受限 TAR@0.1%FAR', '臉 30.7 → 三模態 65.0', 'proven']],
      score: 3, verdict: '最接近「依情況選線索」的思路，是本章第 4 步（融合）的參考。弱伺服器需改成小型專家＋分數層融合。',
      lic: '未確認', cost: '高（大模型骨幹）' }
  ];
  var FAM = {}; FAMS.forEach(function (f) { FAM[f.id] = f; });
  var CONDS = ['view', 'light', 'outfit', 'far'];
  // 示意門控：依畫面情況調整各專家權重（光線不同、換裝時外觀降權；遠距時步態降權）
  var GATE = { view: { app: 0.3, body: 0.3, gait: 0.4 }, light: { app: 0.1, body: 0.35, gait: 0.55 }, outfit: { app: 0.05, body: 0.35, gait: 0.6 }, far: { app: 0.3, body: 0.45, gait: 0.25 } };

  /* ======================= 特徵快取與距離 ======================= */
  var FC = null;
  function feats() {
    if (FC) return FC;
    var cams = { c1: VK.CAM1, view: VK.CAM2.view, light: VK.CAM2.light, outfit: VK.CAM2.outfit, far: VK.CAM2.far };
    FC = { app: {}, sil: {}, skel: {}, body: {} };
    Object.keys(cams).forEach(function (k) {
      FC.app[k] = P.map(function (p) { return VK.featApp(p, cams[k]); });
      FC.sil[k] = P.map(function (p) { return VK.featSil(p, cams[k]); });
      FC.skel[k] = P.map(function (p) { return VK.featSkel(p, cams[k]); });
      FC.body[k] = P.map(function (p) { return VK.featBody(p, cams[k]); });
    });
    FC.skStd = VK.std(FC.skel.c1.map(function (f) { return f.raw; }));
    FC.bdStd = VK.std(FC.body.c1.map(function (f) { return f.raw; }));
    FC.skMu = mean(FC.skel.c1.map(function (f) { return f.raw; }));
    FC.bdMu = mean(FC.body.c1.map(function (f) { return f.raw; }));
    return FC;
  }
  function mean(rows) { return rows[0].map(function (_, j) { return rows.reduce(function (s, r) { return s + r[j]; }, 0) / rows.length; }); }
  function vec(type, k, i) {
    var F = feats();
    if (type === 'app') return F.app[k][i].v;
    if (type === 'sil') return F.sil[k][i].v;
    if (type === 'skel') return VK.scaled(F.skel[k][i].raw, F.skStd);
    return VK.scaled(F.body[k][i].raw, F.bdStd);
  }
  function rawDists(type, qi, cond) { var q = vec(type, 'c1', qi); return P.map(function (_, j) { return VK.dist(q, vec(type, cond, j)); }); }
  function med(a) { var s = a.slice().sort(function (x, y) { return x - y; }); return s[Math.floor(s.length / 2)]; }
  function norm(a) { var m = med(a) || 1; return a.map(function (x) { return x / m; }); }
  /** 回傳攝影機 2 上 5 個人與查詢者的距離 */
  function dists(fid, qi, cond) {
    if (fid === 'app') return rawDists('app', qi, cond);
    // 去衣服化示意：壓低衣服顏色、保留體型輪廓
    if (fid === 'cal') { var ca = norm(rawDists('app', qi, cond)), cs = norm(rawDists('sil', qi, cond)); return ca.map(function (x, j) { return 0.3 * x + 0.7 * cs[j]; }); }
    if (fid === 'sil' || fid === 'skel' || fid === 'body') return rawDists(fid, qi, cond);
    var g = GATE[cond], a = norm(rawDists('app', qi, cond)), b = norm(rawDists('body', qi, cond)),
      s = norm(rawDists('sil', qi, cond)), k = norm(rawDists('skel', qi, cond));
    return a.map(function (_, j) { return g.app * a[j] + g.body * b[j] + g.gait * (s[j] + k[j]) / 2; });
  }
  function rankOf(d, qi) { return d.filter(function (x, j) { return j !== qi && x <= d[qi]; }).length + 1; }
  function hardest(d, qi) { var best = -1; d.forEach(function (x, j) { if (j !== qi && (best < 0 || x < d[best])) best = j; }); return best; }

  /* ======================= 狀態 ======================= */
  var A = { fam: 'app', qi: 0, cond: 'view', t: 1.2, raf: 0, playing: !U.reduceMotion, cells: [] };

  CH.methods = {
    init: function () {
      buildFamTabs(); buildCtrls(); buildGrid(); drawAll(); if ($('#land')) initLandscape();
      var btn = $('#ana-play');
      function sync() { btn.textContent = A.playing ? '暫停' : '播放'; btn.setAttribute('aria-pressed', A.playing ? 'true' : 'false'); }
      btn.addEventListener('click', function () { A.playing = !A.playing; sync(); if (A.playing) loop(); });
      sync();
    },
    enter: function () { if (A.playing) loop(); },
    leave: function () { cancelAnimationFrame(A.raf); A.raf = 0; }
  };
  function loop() {
    if (A.raf) return;
    var last = performance.now();
    function step(now) {
      A.raf = 0;
      if (!A.playing || !document.getElementById('ch-methods').classList.contains('active')) return;
      A.t += Math.min(0.05, (now - last) / 1000); last = now;
      drawCells(true);
      A.raf = requestAnimationFrame(step);
    }
    A.raf = requestAnimationFrame(step);
  }

  function buildFamTabs() {
    var box = $('#ana-fam');
    FAMS.forEach(function (f) {
      var b = U.h('button', { 'data-f': f.id, 'aria-pressed': f.id === A.fam ? 'true' : 'false' }, '<span class="sw" style="background:' + f.c + '"></span>' + f.n);
      box.appendChild(b);
    });
    U.segGroup(box, 'data-f', function (v) { setFam(v); });
  }
  function setFam(v) {
    A.fam = v;
    U.$$('#ana-fam button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-f') === v ? 'true' : 'false'); });
    buildGrid(); drawAll();
  }
  function setCond(v) {
    A.cond = v;
    U.$$('#ana-cond button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-c') === v ? 'true' : 'false'); });
    buildGrid(); drawAll();
  }
  function buildCtrls() {
    var c = $('#ana-cond');
    CONDS.forEach(function (k) { c.appendChild(U.h('button', { 'data-c': k, 'aria-pressed': k === A.cond ? 'true' : 'false' }, VK.CAM2[k].n)); });
    U.segGroup(c, 'data-c', function (v) { setCond(v); });
    var q = $('#ana-q');
    P.forEach(function (p, i) { q.appendChild(U.h('button', { 'data-q': String(i), 'aria-pressed': i === A.qi ? 'true' : 'false' }, p.id)); });
    U.segGroup(q, 'data-q', function (v) { A.qi = +v; buildGrid(); drawAll(); });
  }

  /* ======================= 解剖台格線 ======================= */
  function rows() {
    var d = dists(A.fam, A.qi, A.cond), imp = hardest(d, A.qi), c2 = VK.CAM2[A.cond];
    return [
      { role: '查詢', sub: '攝影機 1', pi: A.qi, p: P[A.qi], cam: VK.CAM1, k: 'c1' },
      { role: '本人', sub: '攝影機 2', pi: A.qi, p: P[A.qi], cam: c2, k: A.cond, good: true },
      { role: '最像的冒充者', sub: '攝影機 2・同制服', pi: imp, p: P[imp], cam: c2, k: A.cond, bad: true }
    ];
  }
  function buildGrid() {
    var f = FAM[A.fam], st = STAGES[A.fam], grid = U.clear($('#ana-grid'));
    grid.style.setProperty('--n', st.length);
    grid.appendChild(U.h('div', { class: 'ana-corner' }, ''));
    st.forEach(function (s, i) {
      grid.appendChild(U.h('div', { class: 'ana-sh' + (i === st.length - 1 ? ' last' : '') }, '<span class="num">' + (i + 1) + '</span><b>' + s[0] + '</b><small>' + s[1] + '</small>'));
    });
    A.cells = [];
    rows().forEach(function (r) {
      grid.appendChild(U.h('div', { class: 'ana-rl' + (r.good ? ' good' : r.bad ? ' bad' : '') }, '<b>' + r.role + '</b><span>人員 ' + r.p.id + '</span><small>' + r.sub + '</small>'));
      st.forEach(function (s, i) {
        var cell = U.h('div', { class: 'ana-cell' + (i === st.length - 1 ? ' last' : '') });
        var cv = document.createElement('canvas');
        cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', '人員 ' + r.p.id + '：' + s[0]);
        cell.appendChild(cv); grid.appendChild(cell);
        A.cells.push({ cv: cv, ctx: VK.hiDPI(cv, CW, CHH), fn: s[2], row: r, anim: s[3] !== false });
      });
    });
  }
  function drawCells(animOnly) {
    A.cells.forEach(function (c) {
      if (animOnly && !c.anim) return;
      var ctx = c.ctx;
      ctx.save(); ctx.clearRect(0, 0, CW, CHH); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, CW, CHH);
      try { c.fn(ctx, CW, CHH, c.row, A.t); } catch (e) { console.error(e); }
      ctx.restore();
    });
  }
  function drawAll() { drawCells(false); drawRank(); drawInfo(); }

  /* ---------- 共用的格內繪圖 ---------- */
  var CROP = { x: 37, y: 6, w: 76, h: 152 };
  function inRect(ctx, r, fn) { ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip(); ctx.translate(r.x, r.y); fn(); ctx.restore(); }
  function caption(ctx, s, color) { ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fillRect(0, CHH - 27, CW, 27); VK.label(ctx, CW / 2, CHH - 12, s, { align: 'center', size: 11.5, color: color || '#48544b' }); }
  function cropRGB(ctx, row, t, extra) { inRect(ctx, CROP, function () { VK.frame(ctx, CROP.w, CROP.h, row.p, t, row.cam, Object.assign({ kind: 'crop' }, extra || {})); }); ctx.strokeStyle = '#c5ccc2'; ctx.lineWidth = 1; ctx.strokeRect(CROP.x + 0.5, CROP.y + 0.5, CROP.w - 1, CROP.h - 1); }
  function cellRect(i) { var cw = CROP.w / 4, ch = CROP.h / 8; return { x: CROP.x + (i % 4) * cw, y: CROP.y + Math.floor(i / 4) * ch, w: cw, h: ch }; }

  function sInput(ctx, W, H, row, t) {
    VK.frame(ctx, W, H, row.p, t, row.cam, { kind: 'scene' });
    var v = VK.view(row.p, W, H, row.cam, 'scene'), J = VK.joints2D(row.p, t, v, 0);
    var xs = [], ys = [];
    for (var k in J) if (k !== 'headR') { xs.push(J[k][0]); ys.push(J[k][1]); }
    var x0 = Math.min.apply(null, xs) - 9, x1 = Math.max.apply(null, xs) + 9, y0 = Math.min.apply(null, ys) - J.headR - 5, y1 = Math.max.apply(null, ys) + 5;
    ctx.setLineDash([4, 3]); ctx.strokeStyle = '#1c251f'; ctx.lineWidth = 1.4; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0); ctx.setLineDash([]);
    VK.rr(ctx, 5, 5, row.k === 'c1' ? 58 : 58, 18, 3); ctx.fillStyle = 'rgba(28,37,31,.82)'; ctx.fill();
    VK.label(ctx, 34, 18, row.k === 'c1' ? '攝影機 1' : '攝影機 2', { align: 'center', size: 11, color: '#fff' });
    if (row.cam.low > 1) VK.label(ctx, W - 6, H - 8, '解析度 1/4', { align: 'right', size: 11, color: '#fff', halo: 'rgba(28,37,31,.7)' });
  }

  /* 外觀 */
  function sPatch(ctx, W, H, row, t) {
    cropRGB(ctx, row, t);
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1;
    for (var i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(CROP.x + i * CROP.w / 4, CROP.y); ctx.lineTo(CROP.x + i * CROP.w / 4, CROP.y + CROP.h); ctx.stroke(); }
    for (var j = 1; j < 8; j++) { ctx.beginPath(); ctx.moveTo(CROP.x, CROP.y + j * CROP.h / 8); ctx.lineTo(CROP.x + CROP.w, CROP.y + j * CROP.h / 8); ctx.stroke(); }
    var c = cellRect(Math.floor(t * 5) % 32);
    ctx.strokeStyle = '#2a78d6'; ctx.lineWidth = 2.2; ctx.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
    caption(ctx, '每塊變成一個 token');
  }
  /** 示意注意力：以剪影在每塊的佔比估計（與光線無關），軀幹區塊再加重 */
  function attn(row) {
    var f = feats().sil[row.k][row.pi], out = [];
    for (var i = 0; i < 32; i++) {
      var cx = i % 4, cy = Math.floor(i / 4), s = 0, n = 0;
      for (var y = cy * 4; y < cy * 4 + 4; y++) for (var x = Math.floor(cx * 5.5); x < Math.floor((cx + 1) * 5.5); x++) { s += f.gei[y * f.W + x]; n++; }
      out.push(U.clamp((s / n) * 2.2 * (cy >= 2 && cy <= 4 ? 1.25 : 1), 0, 1));
    }
    return out;
  }
  function sAttn(ctx, W, H, row, t) {
    cropRGB(ctx, row, t);
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(CROP.x, CROP.y, CROP.w, CROP.h);
    var a = attn(row), pulse = 0.85 + 0.15 * Math.sin(t * 3);
    a.forEach(function (v, i) { var c = cellRect(i); ctx.fillStyle = 'rgba(42,120,214,' + (v * 0.8 * pulse).toFixed(3) + ')'; ctx.fillRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2); });
    caption(ctx, '注意力多落在制服上', '#2a78d6');
  }
  function mosaic(ctx, cols, x, y, cw, ch) {
    cols.forEach(function (c, i) { ctx.fillStyle = VK.rgb(c); ctx.fillRect(x + (i % 4) * cw, y + Math.floor(i / 4) * ch, cw - 1.5, ch - 1.5); });
  }
  function sAppEmb(ctx, W, H, row) {
    var cols = feats().app[row.k][row.pi].cols;
    mosaic(ctx, cols, 39, 8, 18, 18.5);
    caption(ctx, '32 塊平均色（示意）');
  }

  /* 去衣服化 */
  function sClothTag(ctx, W, H, row, t) {
    cropRGB(ctx, row, t);
    VK.rr(ctx, 8, 116, 134, 40, 5); ctx.fillStyle = 'rgba(255,255,255,.93)'; ctx.fill(); ctx.strokeStyle = '#6b8fc4'; ctx.lineWidth = 1.4; ctx.stroke();
    VK.label(ctx, 75, 132, '衣服標籤', { align: 'center', size: 11, color: '#6f7a71' });
    VK.label(ctx, 75, 149, '迷彩服（第 1 套）', { align: 'center', size: 12.5, bold: true, color: '#6b8fc4' });
    caption(ctx, '訓練時需要衣服標籤');
  }
  function sClothCls(ctx, W, H, row, t) {
    VK.label(ctx, 8, 20, '衣服分類器輸出', { size: 12, bold: true });
    var pt = row.cam.outfit === 'pt', classes = [['迷彩服', pt ? 0 : 1], ['運動服', pt ? 1 : 0], ['冬季外套', 0]];
    classes.forEach(function (c, i) {
      var y = 34 + i * 26;
      VK.label(ctx, 8, y + 13, c[0], { size: 11.5, color: '#48544b' });
      ctx.fillStyle = '#eef0eb'; ctx.fillRect(62, y + 2, 78, 14);
      ctx.fillStyle = c[1] ? '#6b8fc4' : '#c5ccc2'; ctx.fillRect(62, y + 2, Math.max(2, 78 * c[1]), 14);
    });
    var change = A.cond === 'outfit';
    VK.rr(ctx, 8, 118, 134, 50, 5); ctx.fillStyle = '#eef3fa'; ctx.fill();
    VK.label(ctx, 75, 138, change ? '查詢與候選換了裝' : '三列穿同一套', { align: 'center', size: 12, bold: true, color: '#6b8fc4' });
    VK.label(ctx, 75, 156, change ? '要學會忽略衣服差異' : '沒有衣服差異可對抗', { align: 'center', size: 11.5, color: '#48544b' });
    caption(ctx, change ? '對抗損失在這裡派上用場' : '對抗損失 ≈ 0', change ? '#0c8a0c' : '#c93434');
  }
  function sCalEmb(ctx, W, H, row) { sAppEmb(ctx, W, H, row); ctx.fillStyle = '#fff'; ctx.fillRect(0, CHH - 26, CW, 26); caption(ctx, '壓低衣服、保留體型（示意）', '#6b8fc4'); }

  /* 輪廓步態 */
  var silCv = document.createElement('canvas'); silCv.width = 22; silCv.height = 32;
  var silCtx = silCv.getContext('2d');
  function sSeg(ctx, W, H, row, t) {
    VK.frame(silCtx, 22, 32, row.p, t, row.cam, { kind: 'crop', mode: 'sil', bg: 'white', style: { silColor: '#1c251f' } });
    ctx.imageSmoothingEnabled = false; ctx.drawImage(silCv, CROP.x - 7, CROP.y, 88, 128 * 1.1875);
    ctx.strokeStyle = '#c5ccc2'; ctx.strokeRect(CROP.x - 6.5, CROP.y + 0.5, 87, 151);
    caption(ctx, '每幀一張黑白剪影');
  }
  function drawGEI(ctx, f, x, y, cw, ch) {
    for (var yy = 0; yy < f.H; yy++) for (var xx = 0; xx < f.W; xx++) { ctx.fillStyle = VK.gray(f.gei[yy * f.W + xx]); ctx.fillRect(x + xx * cw, y + yy * ch, cw + 0.3, ch + 0.3); }
  }
  function sGEI(ctx, W, H, row, t) {
    var f = feats().sil[row.k][row.pi];
    drawGEI(ctx, f, CROP.x - 7, CROP.y, 4, 4.75);
    caption(ctx, '一個週期的剪影平均');
  }
  function sHPP(ctx, W, H, row) {
    var f = feats().sil[row.k][row.pi];
    drawGEI(ctx, f, 10, CROP.y, 3.6, 4.75);
    for (var b = 0; b < 8; b++) {
      var y = CROP.y + b * 19;
      ctx.strokeStyle = b % 2 ? '#1baf7a' : '#7fd3b3'; ctx.lineWidth = 1.2; ctx.strokeRect(10.5, y + 0.5, 79, 18);
      var m = f.bands[b].reduce(function (s, x) { return s + x; }, 0) / 4;
      ctx.fillStyle = '#1baf7a'; ctx.fillRect(96, y + 4, Math.max(1.5, m * 90), 10);
    }
    caption(ctx, '切 8 條水平帶各自池化');
  }
  function sSilEmb(ctx, W, H, row) {
    var f = feats().sil[row.k][row.pi];
    f.bands.forEach(function (bd, b) { bd.forEach(function (v, k) { ctx.fillStyle = VK.gray(v * 1.3); ctx.fillRect(35 + k * 20, 8 + b * 19, 18.5, 17.5); }); });
    caption(ctx, '8 帶 × 4 段（示意）');
  }

  /* 骨架步態 */
  function sPose(ctx, W, H, row, t) {
    VK.frame(ctx, W, H, row.p, t, row.cam, { kind: 'scene' });
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(0, 0, W, H);
    var v = VK.view(row.p, W, H, row.cam, 'scene'), r = U.rng(Math.floor(t * 12) * 97 + row.pi * 7 + (row.cam.low > 1 ? 1 : 0));
    skelLines(ctx, VK.joints2D(row.p, t, v, VK.poseNoise(row.cam) * 1.4, r), '#eb6834', 2.2);
    if (row.cam.low > 1) VK.label(ctx, W / 2, 22, '關節在跳動', { align: 'center', size: 12, bold: true, color: '#c93434' });
    caption(ctx, '估出 17 個關節點');
  }
  var BONES = [['neck', 'pelvis'], ['lSho', 'rSho'], ['lHip', 'rHip'], ['lSho', 'lElb'], ['lElb', 'lWri'], ['rSho', 'rElb'], ['rElb', 'rWri'], ['lHip', 'lKnee'], ['lKnee', 'lAnkle'], ['rHip', 'rKnee'], ['rKnee', 'rAnkle']];
  function skelLines(ctx, J, c, w) {
    ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round';
    BONES.forEach(function (b) { ctx.beginPath(); ctx.moveTo(J[b[0]][0], J[b[0]][1]); ctx.lineTo(J[b[1]][0], J[b[1]][1]); ctx.stroke(); });
    ctx.beginPath(); ctx.arc(J.head[0], J.head[1], J.headR, 0, 7); ctx.stroke();
    ctx.fillStyle = '#fff';
    ['lKnee', 'rKnee', 'lAnkle', 'rAnkle', 'lElb', 'rElb', 'lHip', 'rHip', 'lSho', 'rSho'].forEach(function (k) { ctx.beginPath(); ctx.arc(J[k][0], J[k][1], 2.4, 0, 7); ctx.fill(); ctx.stroke(); });
  }
  function hotView(row) { return VK.view(row.p, CW, CHH, row.cam, 'crop', 0.72); }
  function sHOT(ctx, W, H, row, t) {
    ctx.strokeStyle = '#eef0eb'; ctx.lineWidth = 1;
    for (var x = 0; x <= W; x += 15) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H - 26); ctx.stroke(); }
    for (var y = 0; y <= H - 26; y += 15) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    var v = hotView(row), nz = VK.poseNoise(row.cam), T = VK.cyc(row.p);
    ['lAnkle', 'rAnkle'].forEach(function (jn, k) {
      ctx.strokeStyle = k ? 'rgba(213,81,129,.4)' : 'rgba(213,81,129,.9)'; ctx.lineWidth = 1.8; ctx.beginPath();
      for (var s = 0; s <= 24; s++) { var tt = t - T + s * T / 24, J = VK.joints2D(row.p, tt, v, nz, U.rng(Math.floor(tt * 12) * 97 + row.pi * 7 + row.cam.low)); s ? ctx.lineTo(J[jn][0], J[jn][1]) : ctx.moveTo(J[jn][0], J[jn][1]); }
      ctx.stroke();
    });
    skelLines(ctx, VK.joints2D(row.p, t, v, nz, U.rng(Math.floor(t * 12) * 97 + row.pi * 7 + row.cam.low)), '#eb6834', 2);
    caption(ctx, '置中、縮成同一身高');
  }
  function sSeries(ctx, W, H, row, t) {
    var s = feats().skel[row.k][row.pi].series, x0 = 12, x1 = W - 8, y0 = 30, y1 = 150;
    VK.label(ctx, 8, 18, '膝蓋彎曲角度', { size: 12, bold: true });
    ctx.strokeStyle = '#dde2da'; ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, y0 + 0.5, x1 - x0, y1 - y0);
    function Y(v) { return y1 - U.clamp(v / 1.4, 0, 1) * (y1 - y0); }
    [['kl', '#eb6834'], ['kr', 'rgba(235,104,52,.45)']].forEach(function (k) {
      ctx.strokeStyle = k[1]; ctx.lineWidth = 2; ctx.beginPath();
      for (var i = 0; i <= s.length; i++) { var v = s[i % s.length][k[0]], x = x0 + i / s.length * (x1 - x0); i ? ctx.lineTo(x, Y(v)) : ctx.moveTo(x, Y(v)); }
      ctx.stroke();
    });
    var T = VK.cyc(row.p), cx = x0 + ((t % T) / T) * (x1 - x0);
    ctx.strokeStyle = '#1c251f'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, y0); ctx.lineTo(cx, y1); ctx.stroke();
    VK.label(ctx, x0, y1 + 14, '一個步態週期 →', { size: 11, color: '#6f7a71' });
    caption(ctx, '實線左膝・淡線右膝');
  }
  function zBars(ctx, names, z, color, y0, rh) {
    names.forEach(function (n, i) {
      var y = y0 + i * rh, cx = 96, v = U.clamp(z[i], -2.5, 2.5) / 2.5 * 48;
      VK.label(ctx, 8, y + 11, n, { size: 11, color: '#48544b' });
      ctx.fillStyle = '#eef0eb'; ctx.fillRect(48, y + 2, 96, 11);
      ctx.fillStyle = color; ctx.fillRect(Math.min(cx, cx + v), y + 2, Math.max(1.5, Math.abs(v)), 11);
      ctx.fillStyle = '#1c251f'; ctx.fillRect(cx - 0.5, y, 1, 15);
    });
  }
  function sSkEmb(ctx, W, H, row) {
    var F = feats(), raw = F.skel[row.k][row.pi].raw;
    zBars(ctx, VK.SK_NAMES, raw.map(function (v, i) { return (v - F.skMu[i]) / F.skStd[i]; }), '#eb6834', 12, 24);
    caption(ctx, '與五人平均的差（標準化）');
  }

  /* 3D 體型 */
  function sFit(ctx, W, H, row, t) {
    var cam = Object.assign({}, row.cam, { yaw: row.cam.yaw + t * 0.9 });
    VK.frame(ctx, W, H - 22, row.p, t, cam, { kind: 'crop', mode: 'sil', bg: 'white', fill: 0.86, style: { silColor: '#b6bdb2' } });
    var v = VK.view(row.p, W, H - 22, cam, 'crop', 0.86);
    var J = VK.joints2D(row.p, t, v, 0);
    ctx.globalAlpha = 0.9; skelLines(ctx, J, '#8b7317', 1.2); ctx.globalAlpha = 1;
    caption(ctx, '擬合 3D 人體（旋轉檢視）');
  }
  function sCanon(ctx, W, H, row) {
    var p = row.p, cam = { yaw: Math.PI / 2, pitch: 0, low: 1 }, v = VK.view(p, W, H - 30, cam, 'scene');
    v.scale = (H - 30) * 0.86; v.y = H - 34;
    var parts = PersonModel.parts(Object.assign({}, p, { armSwing: 0, stride: 0, kneeFlex: 0, bounce: 0 }), 0, v, 'sil');
    PersonModel.renderCanvas(ctx, parts, { silColor: '#b6bdb2' });
    var J = PersonModel.joints(p, 0), pr = function (k) { var q = PersonModel.project(J[k], cam.yaw, 0); return [v.x + q[0] * v.scale, v.y + q[1] * v.scale]; };
    var top = pr('head')[1] - J.headR * v.scale, ls = pr('lSho'), rs = pr('rSho'), lh = pr('lHip'), rh = pr('rHip');
    ctx.strokeStyle = '#9a7b12'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(14, top); ctx.lineTo(8, top); ctx.lineTo(8, v.y); ctx.lineTo(14, v.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ls[0], ls[1] - 9); ctx.lineTo(rs[0], rs[1] - 9); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lh[0], lh[1] + 3); ctx.lineTo(rh[0], rh[1] + 3); ctx.stroke();
    caption(ctx, '去掉姿態、衣服、紋理');
  }
  function sBodyEmb(ctx, W, H, row) {
    var F = feats(), raw = F.body[row.k][row.pi].raw;
    zBars(ctx, VK.BODY_NAMES, raw.map(function (v, i) { return (v - F.bdMu[i]) / F.bdStd[i]; }), '#9a7b12', 24, 30);
    if (row.cam.low > 1) VK.label(ctx, W / 2, 150, '低解析 → 誤差變大', { align: 'center', size: 11.5, bold: true, color: '#c93434' });
    caption(ctx, '體型參數（標準化）');
  }

  /* 多專家融合 */
  function sVideo(ctx, W, H, row, t) {
    [-0.5, -0.25, 0].forEach(function (dt, i) {
      var o = (2 - i) * 9;
      ctx.save(); ctx.translate(o, 18 - o * 0.9); ctx.beginPath(); ctx.rect(0, 0, W - 22, H - 52); ctx.clip();
      ctx.scale((W - 22) / W, (H - 52) / H);
      VK.frame(ctx, W, H, row.p, t + dt, row.cam, { kind: 'scene' });
      ctx.restore();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.strokeRect(o, 18 - o * 0.9, W - 22, H - 52);
    });
    caption(ctx, '16 幀影片片段');
  }
  function sCLIP(ctx, W, H, row, t) {
    var cols = feats().app[row.k][row.pi].cols;
    cols.forEach(function (c, i) {
      var r = cellRect(i), l = (c[0] + c[1] + c[2]) / 765, sh = 0.08 * Math.sin(t * 2 + i * 1.7);
      ctx.fillStyle = 'hsl(' + (205 + l * 30) + ',55%,' + Math.round((28 + l * 45 + sh * 20)) + '%)';
      ctx.fillRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    });
    caption(ctx, '凍結 CLIP 的特徵圖');
  }
  function sExperts(ctx, W, H, row, t) {
    var F = feats();
    VK.label(ctx, 8, 16, '外觀', { size: 11.5, bold: true, color: '#2a78d6' });
    mosaic(ctx, F.app[row.k][row.pi].cols.slice(0, 16), 58, 6, 9, 9);
    VK.label(ctx, 8, 70, '體型', { size: 11.5, bold: true, color: '#9a7b12' });
    var raw = F.body[row.k][row.pi].raw;
    raw.forEach(function (v, i) { var z = (v - F.bdMu[i]) / F.bdStd[i]; ctx.fillStyle = '#9a7b12'; var hh = 8 + U.clamp(z, -2, 2) * 7; ctx.fillRect(60 + i * 18, 84 - hh, 13, hh); });
    VK.label(ctx, 8, 116, '步態', { size: 11.5, bold: true, color: '#d55181' });
    var s = F.skel[row.k][row.pi].series;
    ctx.strokeStyle = '#d55181'; ctx.lineWidth = 1.8; ctx.beginPath();
    s.forEach(function (q, i) { var x = 58 + i / (s.length - 1) * 82, y = 130 - q.kl * 20; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
    caption(ctx, '三位專家各算一份');
  }
  function sGate(ctx, W, H, row, t) {
    var g = GATE[A.cond], items = [['外觀', g.app, '#2a78d6'], ['體型', g.body, '#9a7b12'], ['步態', g.gait, '#d55181']];
    VK.label(ctx, 8, 18, '門控給的權重', { size: 12, bold: true });
    items.forEach(function (it, i) {
      var y = 34 + i * 36;
      VK.label(ctx, 8, y + 13, it[0], { size: 11.5, color: '#48544b' });
      ctx.fillStyle = it[2]; ctx.fillRect(42, y + 2, 72 * it[1] / 0.6, 14);
      VK.label(ctx, 42 + 72 * it[1] / 0.6 + 4, y + 13.5, Math.round(it[1] * 100) + '%', { size: 11.5, bold: true, color: '#1c251f' });
    });
    caption(ctx, A.cond === 'far' ? '遠距：步態降權' : A.cond === 'light' ? '光線不同：外觀降權' : A.cond === 'outfit' ? '換裝：外觀幾乎不信' : '依畫面品質調整');
  }
  function sFuseEmb(ctx, W, H, row) {
    var g = GATE[A.cond], F = feats(), x = 12, total = 126;
    [['app', '#2a78d6'], ['body', '#9a7b12'], ['gait', '#d55181']].forEach(function (k) {
      var w = total * g[k[0]];
      for (var i = 0; i < 8; i++) {
        var val = k[0] === 'app' ? (F.app[row.k][row.pi].cols[i * 4 + 1][1] / 255) : k[0] === 'body' ? 0.5 + 0.2 * ((F.body[row.k][row.pi].raw[i % 4] - F.bdMu[i % 4]) / F.bdStd[i % 4]) : 0.5 + 0.15 * ((F.skel[row.k][row.pi].raw[i % 6] - F.skMu[i % 6]) / F.skStd[i % 6]);
        ctx.globalAlpha = U.clamp(0.25 + val * 0.7, 0.15, 1); ctx.fillStyle = k[1];
        ctx.fillRect(x, 20 + i * 16, Math.max(2, w - 2), 14);
      }
      ctx.globalAlpha = 1; x += w;
    });
    caption(ctx, '寬度 = 權重（示意）');
  }

  // [名稱, 形狀說明, 繪圖, 是否動畫]
  var STAGES = {
    app: [['輸入影像', '一幀＋偵測框', sInput], ['裁切・切塊', '256×128 → 16×8 塊', sPatch], ['Transformer 注意力', '哪些塊最重要', sAttn], ['外觀嵌入', '768 維向量', sAppEmb, false]],
    cal: [['輸入影像', '一幀＋偵測框', sInput], ['裁切＋衣服標籤', '訓練時才需要', sClothTag], ['衣服分類器（對抗）', '想讓特徵騙過它', sClothCls, false], ['去衣服化嵌入', '2048 維向量', sCalEmb, false]],
    sil: [['輸入影片', '≥ 1 個步態週期', sInput], ['人形分割', '每幀一張剪影', sSeg], ['時間池化', '步態能量圖', sGEI, false], ['水平切條', '頭、胸、腿分開學', sHPP, false], ['步態嵌入', '各帶串接', sSilEmb, false]],
    skel: [['輸入影片', '≥ 1 個步態週期', sInput], ['姿態估計', 'T × 17 × 2 關節點', sPose], ['正規化（HOT）', '移除位置與尺寸', sHOT], ['關節時序', '圖卷積的輸入', sSeries], ['步態嵌入', '動作特徵', sSkEmb, false]],
    body: [['輸入影像', '單張即可', sInput], ['3D 人體擬合', '姿態＋體型參數', sFit], ['拆解', '只留體型', sCanon, false], ['體型嵌入', '身體尺寸', sBodyEmb, false]],
    fuse: [['輸入影片', 'T = 16 幀', sVideo], ['凍結大模型', 'CLIP ViT-L/14', sCLIP], ['三位專家', '外觀・體型・步態', sExperts, false], ['門控', '決定各信幾分', sGate, false], ['融合嵌入', '加權合併', sFuseEmb, false]]
  };

  /* ---------- 排名結果 ---------- */
  function drawRank() {
    var svg = U.clear($('#ana-rank')), d = dists(A.fam, A.qi, A.cond), rk = rankOf(d, A.qi), imp = hardest(d, A.qi);
    var order = d.map(function (x, j) { return j; }).sort(function (a, b) { return d[a] - d[b]; });
    var mx = Math.max.apply(null, d) * 1.08, L = 112, W = 300;
    el('text', { x: 0, y: 16, 'font-size': 13.5, 'font-weight': 700, fill: 'var(--ink)', text: '攝影機 2 裡的五個人，誰最像查詢的人？' }, svg);
    el('text', { x: 0, y: 34, 'font-size': 12, fill: 'var(--ink-3)', text: '長條 = 與查詢的特徵距離，越短越像。由上而下就是系統給的排名。' }, svg);
    order.forEach(function (j, r) {
      var y = 50 + r * 30, self = j === A.qi;
      el('text', { x: 0, y: y + 15, 'font-size': 12.5, fill: 'var(--ink-3)', class: 'num', text: '#' + (r + 1) }, svg);
      el('text', { x: 26, y: y + 15, 'font-size': 13, 'font-weight': self ? 700 : 400, fill: self ? 'var(--ink)' : 'var(--ink-2)', text: '人員 ' + P[j].id + (self ? '（本人）' : '') }, svg);
      el('rect', { x: L, y: y + 3, width: Math.max(2, d[j] / mx * W), height: 16, rx: 3, fill: self ? 'var(--ink)' : j === imp ? 'var(--bad)' : '#b8bfb5' }, svg);
      el('text', { x: L + d[j] / mx * W + 6, y: y + 15, 'font-size': 12, fill: 'var(--ink-2)', class: 'num', text: d[j].toFixed(2) }, svg);
    });
    var ok = rk === 1, ratio = d[imp] / d[A.qi];
    el('text', { x: 0, y: 222, 'font-size': 20, 'font-weight': 700, fill: ok ? 'var(--good)' : 'var(--bad)', text: ok ? '✓ 本人排第 1' : '✗ 本人排第 ' + rk }, svg);
    el('text', { x: 0, y: 244, 'font-size': 12.5, fill: 'var(--ink-2)', text: '分離度（最像冒充者距離 ÷ 本人距離）= ' + ratio.toFixed(2) }, svg);
    el('text', { x: 0, y: 262, 'font-size': 12, fill: 'var(--ink-3)', text: ratio < 1 ? '小於 1：冒充者比本人更像，系統會認錯人。' : ratio < 1.1 ? '接近 1：勉強分開，換個雜訊就可能翻盤。' : '大於 1.1：有明確差距。' }, svg);
  }
  function drawInfo() {
    var f = FAM[A.fam];
    var stars = '●●●●'.slice(0, f.score) + '○○○○'.slice(0, 4 - f.score);
    var ev = { proven: '<span class="ev proven"><i></i>論文報告</span>', inferred: '<span class="ev inferred"><i></i>合理推論</span>' };
    $('#ana-info').innerHTML =
      '<p class="ana-idea">' + f.idea + '</p>' +
      '<div class="ana-reps">' + f.reps.map(function (r) { return '<span class="tag">' + r + '</span>'; }).join('') + '</div>' +
      '<dl>' +
      '<dt>學到什麼</dt><dd>' + f.learns + '</dd>' +
      '<dt>需要</dt><dd>' + f.needs + '</dd>' +
      '<dt>何時失效</dt><dd>' + f.fails.map(function (x) { return '<span class="fail">' + x + '</span>'; }).join('') + '</dd>' +
      '<dt>文獻數字</dt><dd>' + f.num.map(function (n) { return n[0] + '：<b class="num">' + n[1] + '</b> ' + ev[n[2]]; }).join('<br>') + '</dd>' +
      '<dt>同制服價值</dt><dd><span class="num stars">' + stars + '</span>　' + f.verdict + '</dd>' +
      '<dt>授權・算力</dt><dd>' + f.lic + '；' + f.cost + '</dd>' +
      '</dl>';
  }

  /* ======================= 方法版圖（55 個方法） ======================= */
  var LANES = ['det', 'st', 'app', 'vid', 'part', 'cc', 'uni', 'gait', 'mm', 'face', 'uda', 'life'];
  var PICK = ['st-ReID', 'PersonViT ViT-S/16', 'SOLIDER Swin-S', 'DeepGaitV2-P3D', 'Cluster Contrast', 'ByteTrack', 'CLIP3DReID', 'MagFace', 'YOLOX-S'];
  var HAVE = ['BoT（BagTricks）R50', 'CLIP-ReID ViT-B/16', 'YOLOv7（你現有）'];
  var LAYER = { det: '1 看見人', st: '2 時空約束', app: '3 外觀', vid: '3 外觀', part: '3 外觀', cc: '4 衣服以外', uni: '4 衣服以外', gait: '4 衣服以外', mm: '5 融合', face: '4 衣服以外', uda: '6 少標註', life: '6 少標註' };
  var landSel = null;
  function initLandscape() { drawLand(); }
  function yearOf(m) { var y = (m.v.match(/(20\d\d)/) || [0, 2023])[1]; return +y; }
  function drawLand() {
    var svg = U.clear($('#land')), L = 150, Rr = 960, T = 34, rh = 38, y0 = 2018, y1 = 2026;
    function X(y) { return L + (y - y0 + 0.5) / (y1 - y0 + 1) * (Rr - L); }
    for (var y = y0; y <= y1; y++) {
      el('line', { x1: X(y) - (Rr - L) / (y1 - y0 + 1) / 2, x2: X(y) - (Rr - L) / (y1 - y0 + 1) / 2, y1: T - 6, y2: T + LANES.length * rh, stroke: 'var(--rule-2)' }, svg);
      el('text', { x: X(y), y: T - 12, 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--ink-3)', class: 'num', text: y }, svg);
    }
    var groups = {};
    R.METHODS2.forEach(function (m) { var k = m.fam + '|' + yearOf(m); (groups[k] = groups[k] || []).push(m); });
    LANES.forEach(function (fk, i) {
      var y = T + i * rh;
      el('rect', { x: 0, y: y, width: Rr, height: rh - 2, fill: i % 2 ? 'transparent' : 'rgba(255,255,255,.55)' }, svg);
      el('text', { x: L - 12, y: y + rh / 2 + 3, 'text-anchor': 'end', 'font-size': 12.5, fill: 'var(--ink)', text: R.FAM2[fk] }, svg);
    });
    Object.keys(groups).forEach(function (k) {
      var fk = k.split('|')[0], yr = +k.split('|')[1], li = LANES.indexOf(fk), list = groups[k];
      list.forEach(function (m, j) {
        var cx = X(yr) + (j - (list.length - 1) / 2) * 15, cy = T + li * rh + rh / 2 - 1;
        var pick = PICK.indexOf(m.n) >= 0, have = HAVE.indexOf(m.n) >= 0, sel = landSel === m.n;
        var g = el('g', { tabindex: 0, role: 'button', 'aria-label': m.n, style: 'cursor:pointer' }, svg);
        var c = R.LIC[m.lic].c;
        if (have) el('rect', { x: cx - 6.5, y: cy - 6.5, width: 13, height: 13, transform: 'rotate(45 ' + cx + ' ' + cy + ')', fill: c, stroke: 'var(--ink)', 'stroke-width': sel ? 2.6 : 1.4 }, g);
        else el('circle', { cx: cx, cy: cy, r: pick ? 7.5 : 5.5, fill: c, stroke: pick || sel ? 'var(--ink)' : '#fff', 'stroke-width': sel ? 3 : pick ? 2.2 : 1.2, opacity: pick || have ? 1 : 0.8 }, g);
        U.tip(g, '<b>' + U.esc(m.n) + '</b>　' + m.v + '<br>' + m.res + '<br>授權：' + R.LIC[m.lic].n + '　算力：' + m.cost + '<br>' + m.verdict);
        function go() { landSel = m.n; drawLand(); }
        g.addEventListener('click', go);
        g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      });
    });
    // 標註建議與已有
    var labelled = {};
    R.METHODS2.forEach(function (m) {
      if (PICK.indexOf(m.n) < 0 && HAVE.indexOf(m.n) < 0) return;
      var li = LANES.indexOf(m.fam), list = groups[m.fam + '|' + yearOf(m)], j = list.indexOf(m);
      var cx = X(yearOf(m)) + (j - (list.length - 1) / 2) * 15, cy = T + li * rh + rh / 2 - 1;
      var key = li + '|' + yearOf(m), dy = labelled[key] ? -13 : 0; labelled[key] = 1;
      el('text', { x: cx + 10, y: cy + 4 + dy, 'font-size': 11.5, 'font-weight': 700, fill: 'var(--ink)', text: m.n.replace('（BagTricks）', '').replace('（你現有）', ''), 'paint-order': 'stroke', stroke: 'var(--sheet)', 'stroke-width': 3 }, svg);
    });
    var m = R.METHODS2.filter(function (x) { return x.n === landSel; })[0];
    $('#land-detail').innerHTML = m ? '<h3 style="margin-top:0">' + U.esc(m.n) + ' <span class="small muted">' + m.v + '・' + R.FAM2[m.fam] + '</span></h3><dl>' +
      '<dt>輸入</dt><dd>' + m.input + '</dd><dt>關鍵結果</dt><dd>' + m.res + '</dd><dt>規模／算力</dt><dd>' + m.cost + '</dd>' +
      '<dt>授權</dt><dd><span class="lic" style="--c:' + R.LIC[m.lic].c + '"><i></i>' + R.LIC[m.lic].n + '</span>　' + R.LIC[m.lic].d + '</dd><dt>對本專案</dt><dd>' + m.verdict + '</dd>' +
      '<dt>在系統的哪一層</dt><dd>' + LAYER[m.fam] + '</dd><dt>出處</dt><dd><a href="' + m.url + '" target="_blank" rel="noopener">' + m.url.replace(/^https?:\/\//, '').split('/').slice(0, 2).join('/') + '</a></dd></dl>'
      : '<p class="small muted" style="margin:0">點任一個點看細節。粗框圓點 = 建議起步；菱形 = 你們已有；顏色 = 授權。</p>';
  }

  // 評估協定圖（第 4 章）仍使用這兩個小工具
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
  global.MethodLab = { dists: dists, feats: feats, FAMS: FAMS, rankOf: rankOf };
})(window);
