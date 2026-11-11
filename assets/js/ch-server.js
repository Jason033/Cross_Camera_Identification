/* ch-server.js — 第 3 章「營區伺服器跑不跑得動」：輸入任一台伺服器的公開規格，估算第一版流程能支援幾台攝影機
   做法：
     1. 每個運算步驟有一個單位成本：CPU 為「參考核心（i7-8700，約 4.3 GHz、AVX2）」的毫秒數，GPU 為「T4」的毫秒數。
     2. 依輸入規格換算：CPU 速度 = 時脈 ÷ 4.3 ×（AVX-512 為 1.3、ARM 為 0.5）；GPU 速度 = FP16 Tensor TFLOPS ÷ 65（T4）。
     3. 每相機小時的工作量 × 單位成本 → CPU 時間 ÷（核心數 × 速度 × 70% 效率）、GPU 時間、硬體解碼時間，取最慢者。
   所有數字都是粗估（誤差可能到 2 倍），用來比較與找瓶頸；採購前請以實測取代。 */
(function (global) {
  'use strict';
  var el = U.el, $ = U.$;
  var CH = global.CH = global.CH || {};
  var REF_GHZ = 4.3, REF_TF = 65;

  /* ---------- 範例伺服器（代表型號為常見產品線；規格取公開資料，標「待確認」者為粗估） ---------- */
  var PRESETS = [
    { id: 'A', n: '小型塔式伺服器', ex: 'Dell PowerEdge T350、HPE ProLiant ML30；Xeon E-2378（8 核）', cores: 8, ghz: 2.6, isa: 'avx2', tf: 0, vram: 0, dec: 0, note: '時脈以基本時脈計（保守）' },
    { id: 'B', n: '2U 機架伺服器（雙 CPU）', ex: 'Dell PowerEdge R750、HPE DL380 Gen10 Plus；2× Xeon Silver 4314（共 32 核）', cores: 32, ghz: 2.4, isa: 'avx512', tf: 0, vram: 0, dec: 0, note: '機房常見主力機型' },
    { id: 'C', n: '機架伺服器＋NVIDIA T4', ex: '同 B，加裝 T4（16 GB、70 W、單槽半高）', cores: 32, ghz: 2.4, isa: 'avx512', tf: 65, vram: 16, dec: 38, note: 'T4 官方標示可同時解 38 路 1080p' },
    { id: 'D', n: '機架伺服器＋NVIDIA L4', ex: '同 B，加裝 L4（24 GB、72 W、單槽）', cores: 32, ghz: 2.4, isa: 'avx512', tf: 121, vram: 24, dec: 55, note: '解碼路數為粗估（待確認）' },
    { id: 'E', n: '工作站＋RTX A4000', ex: 'Dell Precision 5860、HP Z4 G5；約 14 核 CPU＋RTX A4000（16 GB）', cores: 14, ghz: 3.2, isa: 'avx512', tf: 77, vram: 16, dec: 30, note: '解碼路數為粗估（待確認）；GeForce 卡驅動授權限制資料中心部署' },
    { id: 'F', n: 'Jetson AGX Orin 邊緣盒', ex: 'NVIDIA Jetson AGX Orin 64GB（12 核 ARM＋整合 GPU）；每個點位一台', cores: 12, ghz: 2.2, isa: 'arm', tf: 23, vram: 32, dec: 16, note: 'GPU 換算值與解碼路數為粗估（待確認）' }
  ];

  /* ---------- 單位成本 ---------- */
  var COST = {
    dec: { n: '影片解碼（1080p H.264，每幀）', cpu: 4, gpu: null, src: '假設（研究報告）：軟體解碼約 3–5 ms／幀／核心；有硬體解碼器時改走解碼器' },
    det_s: { n: '偵測 YOLOX-S（640，每幀）', cpu: 600, gpu: 4, src: 'FLOPs 換算：NanoDet-Plus-m 在 i7-8700 為 8.32 ms（1.52 GFLOPs）、YOLO26s 在 T4 為 2.5 ms（20.9 GFLOPs），依 YOLOX-S 26.8 GFLOPs 換算' },
    det_t: { n: '偵測 YOLOX-Tiny（416，每幀）', cpu: 150, gpu: 1.5, src: 'FLOPs 換算（6.45 GFLOPs）' },
    det_n: { n: '偵測 NanoDet-Plus-m（416，每幀）', cpu: 50, gpu: 1, src: '文獻實測：i7-8700 為 8.32 ms（6 核，換算成核心毫秒）' },
    pose: { n: '姿態 RTMPose-m（每個人形）', cpu: 60, gpu: 1.5, src: '文獻實測：i7-11700 約 90 FPS，換算成參考核心毫秒' },
    reid: { n: '外觀 SOLIDER Swin-S（每張裁切）', cpu: 130, gpu: 1.5, src: 'FLOPs 換算（Swin-S 在 256×128 約 5.7 GFLOPs）' },
    seg: { n: '人形分割（步態用，每幀）', cpu: 300, gpu: 3, src: '假設：輕量分割模型的 CPU 數據本次未查到（待確認）' },
    gait: { n: '步態 DeepGaitV2-P3D（每段 30 幀）', cpu: 600, gpu: 5, src: '假設：依 2.9 GFLOPs 粗估（待確認是每幀或每段）' },
    face: { n: '臉部 AdaFace R50（每張臉）', cpu: 140, gpu: 2, src: 'FLOPs 換算（IResNet-50 約 6.3 GFLOPs）' },
    misc: { n: '前後處理、追蹤、比對（每個偵測幀）', cpu: 5, gpu: null, src: '假設：縮放、追蹤、寫檔等；ByteTrack 本身可忽略' }
  };
  var DET_N = { det_s: 'YOLOX-S', det_t: 'YOLOX-Tiny', det_n: 'NanoDet-Plus' };
  var LAB = { dec: '解碼', det: '偵測', seg: '人形分割', reid: '外觀特徵', pose: '姿態', gait: '步態', face: '臉部', misc: '前後處理' };

  var st = { cams: 20, occ: 40, win: 10, det: 'det_s', gait: true, face: true };
  var mine = Object.assign({ n: '你的伺服器' }, PRESETS[2]);

  function workload() {
    var p = st.occ / 100, trk = 500 * p, seq = st.gait ? trk * 0.5 : 0, det = 3600 * (p * 5 + (1 - p) * 1);
    return { dec: 3600 * 25, det: det, pose: trk * 16, reid: trk * 8, seg: seq * 30, gait: seq, face: st.face ? trk * 0.2 * 5 : 0, misc: det };
  }
  function speed(d) { return d.ghz / REF_GHZ * (d.isa === 'avx512' ? 1.3 : d.isa === 'arm' ? 0.5 : 1); }
  /** 一台伺服器處理一個相機小時的時間（秒）與分項 */
  function perCamHour(d) {
    var W = workload(), g = d.tf > 0 ? d.tf / REF_TF : 0, cpuMs = 0, gpuMs = 0, decS = 0, parts = {};
    function add(key, cnt, ck) {
      var c = COST[ck || key];
      if (g && c.gpu != null) { var v = cnt * c.gpu / g; gpuMs += v; parts[key] = ['gpu', v]; }
      else { var m = cnt * c.cpu / speed(d); cpuMs += m; parts[key] = ['cpu', m]; }
    }
    if (d.dec > 0) { decS = W.dec / (d.dec * 30); parts.dec = ['dec', decS * 1000]; } else add('dec', W.dec);
    add('det', W.det, st.det); add('pose', W.pose); add('reid', W.reid); add('seg', W.seg); add('gait', W.gait); add('face', W.face); add('misc', W.misc);
    var cpuS = cpuMs / 1000 / (d.cores * 0.7), gpuS = gpuMs / 1000, wall = Math.max(cpuS, gpuS, decS);
    var bott = wall === decS ? '影片解碼' : wall === gpuS ? 'GPU 推論' : 'CPU';
    if (bott === 'CPU') { var top = Object.keys(parts).filter(function (k) { return parts[k][0] === 'cpu'; }).sort(function (a, b) { return parts[b][1] - parts[a][1]; })[0]; bott += '（主要是' + LAB[top] + '）'; }
    return { wall: wall, cpuS: cpuS, gpuS: gpuS, decS: decS, bott: bott, parts: parts };
  }
  function capacity(d) { var r = perCamHour(d), camH = st.win * 3600 / r.wall; return { r: r, camH: camH, cams: camH / 24 }; }
  function fmtC(v) { return v >= 10 ? Math.round(v) : v.toFixed(1); }

  CH.server = {
    init: function () {
      if (!$('#srv-svg')) return;
      buildWorkloadCtrls();
      buildMyServer();
      $('#srv-basis').innerHTML = '<thead><tr><th>運算</th><th class="num">CPU（參考核心毫秒）</th><th class="num">GPU（T4 毫秒）</th><th>依據</th></tr></thead><tbody>' +
        Object.keys(COST).map(function (k) { var c = COST[k]; return '<tr><td>' + c.n + '</td><td class="num">' + c.cpu + '</td><td class="num">' + (c.gpu == null ? '—' : c.gpu) + '</td><td class="small">' + c.src + '</td></tr>'; }).join('') + '</tbody>';
      draw();
    }
  };

  function slider(box, id, label, min, max, step, obj, key, fmt) {
    var d = U.h('div', { class: 'slider' }, '<label for="' + id + '">' + label + '</label><output class="num" id="' + id + '-o"></output><input type="range" id="' + id + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + obj[key] + '">');
    box.appendChild(d);
    var inp = $('#' + id, d), out = $('#' + id + '-o', d);
    inp.addEventListener('input', function () { obj[key] = +inp.value; out.textContent = fmt(obj[key]); draw(); });
    out.textContent = fmt(obj[key]);
  }
  function buildWorkloadCtrls() {
    var box = $('#srv-ctrl');
    slider(box, 'srv-cams', '營區攝影機數（每台每天錄 24 小時）', 2, 80, 1, st, 'cams', function (v) { return v + ' 台'; });
    slider(box, 'srv-occ', '畫面裡有人的時段比例', 10, 100, 5, st, 'occ', function (v) { return v + '%'; });
    slider(box, 'srv-win', '每晚可用的處理時間', 4, 24, 1, st, 'win', function (v) { return v + ' 小時'; });
    box.appendChild(U.h('div', { class: 'ctl-row' }, '<label for="srv-det">偵測器</label><span></span><select id="srv-det"><option value="det_s">YOLOX-S（第一版建議）</option><option value="det_t">YOLOX-Tiny（較輕）</option><option value="det_n">NanoDet-Plus（最輕，召回較差）</option></select>'));
    $('#srv-det').addEventListener('change', function (e) { st.det = e.target.value; draw(); });
    box.appendChild(U.h('div', {}, '<label class="chk"><input type="checkbox" id="srv-gait" checked> 步態（含人形分割）</label><label class="chk"><input type="checkbox" id="srv-face" checked> 臉部（近距點位）</label>'));
    $('#srv-gait').addEventListener('change', function (e) { st.gait = e.target.checked; draw(); });
    $('#srv-face').addEventListener('change', function (e) { st.face = e.target.checked; draw(); });
  }

  /* ---------- 你的伺服器：輸入公開規格 ---------- */
  var FIELDS = [
    ['cores', 'CPU 總核心數', '實體核心數；雙 CPU 要相加', 1, 256, 1],
    ['ghz', 'CPU 時脈（GHz）', '持續全核心時脈；查不到就填基本時脈（保守）', 1, 5.5, 0.1],
    ['tf', 'GPU FP16 Tensor TFLOPS', '原廠規格表的 FP16 Tensor 數字，取「不含稀疏」的值；沒有 GPU 填 0', 0, 400, 1],
    ['vram', 'GPU 記憶體（GB）', '沒有 GPU 填 0', 0, 96, 1],
    ['dec', '硬體解碼：可同時解幾路 1080p30', 'NVIDIA 規格表或 Video Codec SDK 支援表；沒有或不確定填 0（改用 CPU 解碼）', 0, 200, 1]
  ];
  function buildMyServer() {
    var box = $('#my-srv');
    box.appendChild(U.h('div', { class: 'ctl-row' }, '<label for="my-pre">從範例帶入</label><span></span><select id="my-pre">' + PRESETS.map(function (p, i) { return '<option value="' + i + '"' + (i === 2 ? ' selected' : '') + '>' + p.id + '　' + p.n + '</option>'; }).join('') + '</select>'));
    var grid = U.h('div', { class: 'my-grid' });
    FIELDS.forEach(function (f) {
      grid.appendChild(U.h('label', { class: 'my-f' }, '<b>' + f[1] + '</b><input type="number" id="my-' + f[0] + '" min="' + f[3] + '" max="' + f[4] + '" step="' + f[5] + '"><span>' + f[2] + '</span>'));
    });
    grid.appendChild(U.h('label', { class: 'my-f' }, '<b>CPU 指令集</b><select id="my-isa"><option value="avx2">x86，AVX2（多數 CPU）</option><option value="avx512">x86，支援 AVX-512</option><option value="arm">ARM（Jetson 等）</option></select><span>Intel ARK「指令集延伸」欄位；AMD Zen 4 以後也支援 AVX-512</span>'));
    box.appendChild(grid);
    function fill(p) { FIELDS.forEach(function (f) { $('#my-' + f[0]).value = p[f[0]]; }); $('#my-isa').value = p.isa; Object.assign(mine, p, { n: '你的伺服器' }); }
    function read() { FIELDS.forEach(function (f) { var v = parseFloat($('#my-' + f[0]).value); mine[f[0]] = isFinite(v) ? Math.max(f[3], v) : 0; }); mine.isa = $('#my-isa').value; mine.cores = Math.max(1, mine.cores); mine.ghz = Math.max(1, mine.ghz); draw(); }
    $('#my-pre').addEventListener('change', function (e) { fill(PRESETS[+e.target.value]); draw(); });
    U.$$('input, select', grid).forEach(function (i) { i.addEventListener('input', read); i.addEventListener('change', read); });
    fill(PRESETS[2]);
  }

  function draw() {
    var all = PRESETS.concat([mine]), caps = all.map(capacity);
    drawChart(all, caps);
    drawTable(caps);
    drawMine(caps[caps.length - 1]);
  }
  function drawChart(all, caps) {
    var svg = U.clear($('#srv-svg')), L = 210, W = 330, rh = 42, T = 40;
    var mx = Math.max(10, Math.ceil(Math.max(st.cams * 1.25, Math.min(Math.max.apply(null, caps.map(function (c) { return c.cams; })), st.cams * 3)) / 10) * 10);
    function X(v) { return L + Math.min(v, mx) / mx * W; }
    el('text', { x: 0, y: 18, 'font-size': 13.5, 'font-weight': 700, fill: 'var(--ink)', text: '能支援幾台攝影機（每台每天 24 小時錄影）' }, svg);
    [0, mx / 2, mx].forEach(function (v) {
      el('line', { x1: X(v), x2: X(v), y1: T - 6, y2: T + all.length * rh, stroke: 'var(--rule-2)' }, svg);
      el('text', { x: X(v), y: T + all.length * rh + 16, 'text-anchor': 'middle', 'font-size': 11.5, fill: 'var(--ink-3)', class: 'num', text: Math.round(v) + ' 台' }, svg);
    });
    el('line', { x1: X(st.cams), x2: X(st.cams), y1: T - 10, y2: T + all.length * rh + 4, stroke: 'var(--ink)', 'stroke-width': 2, 'stroke-dasharray': '5 4' }, svg);
    el('text', { x: X(st.cams), y: T - 14, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: 'var(--ink)', text: '需要 ' + st.cams + ' 台' }, svg);
    all.forEach(function (d, i) {
      var c = caps[i], y = T + i * rh, ok = c.cams >= st.cams, me = i === all.length - 1;
      if (me) el('rect', { x: -2, y: y + 1, width: L + W + 4, height: rh - 4, rx: 5, fill: '#fff', stroke: 'var(--ink)' }, svg);
      el('text', { x: 4, y: y + 17, 'font-size': 13, 'font-weight': 700, fill: 'var(--ink)', text: me ? '★ 你的伺服器' : d.id + '　' + d.n }, svg);
      var sub = d.cores + ' 核 ' + d.ghz + ' GHz' + (d.tf ? '＋GPU ' + d.tf + ' TFLOPS' : '，無 GPU');
      el('text', { x: 4, y: y + 32, 'font-size': 11, fill: 'var(--ink-3)', text: sub }, svg);
      el('rect', { x: L, y: y + 8, width: Math.max(2, X(c.cams) - L), height: 20, rx: 3, fill: ok ? 'var(--good)' : c.cams >= st.cams * 0.5 ? 'var(--warn)' : 'var(--bad)', opacity: 0.85 }, svg);
      var lab = fmtC(c.cams) + ' 台' + (d.id === 'F' && !me ? '／每台' : '') + (c.cams > mx ? ' →' : ''), inside = X(c.cams) > L + W - 90;
      el('text', { x: inside ? X(c.cams) - 6 : X(c.cams) + 6, y: y + 23, 'text-anchor': inside ? 'end' : 'start', 'font-size': 12.5, 'font-weight': 700, fill: inside ? '#fff' : 'var(--ink)', class: 'num', text: lab }, svg);
    });
  }
  function drawTable(caps) {
    $('#srv-tbl').innerHTML = '<thead><tr><th>範例等級</th><th>代表型號</th><th>規格（計算用）</th><th class="num">可支援</th><th>瓶頸</th></tr></thead><tbody>' +
      PRESETS.map(function (p, i) {
        var c = caps[i], ok = c.cams >= st.cams;
        return '<tr' + (ok ? ' class="ok"' : '') + '><td><b>' + p.id + '　' + p.n + '</b></td><td class="small">' + p.ex + '<br><span class="muted">' + p.note + '</span></td><td class="small num">' + p.cores + ' 核 × ' + p.ghz + ' GHz（' + { avx2: 'AVX2', avx512: 'AVX-512', arm: 'ARM' }[p.isa] + '）' + (p.tf ? '<br>GPU ' + p.tf + ' TFLOPS、' + p.vram + ' GB、解碼 ' + p.dec + ' 路' : '') + '</td><td class="num"><b>' + fmtC(c.cams) + ' 台</b></td><td class="small">' + c.r.bott + '</td></tr>';
      }).join('') + '</tbody>';
  }
  function drawMine(c) {
    var r = c.r, need = st.cams, n = Math.ceil(need / Math.max(0.05, c.cams));
    var warn = [];
    if (mine.tf > 0 && mine.vram > 0 && mine.vram < 8) warn.push('GPU 記憶體不到 8 GB：偵測、外觀、步態、臉部模型同時載入可能放不下，需分批輪流跑。');
    if (mine.tf > 0 && mine.dec === 0) warn.push('有 GPU 但解碼填 0：影片改由 CPU 解碼，常會變成瓶頸；請查這張卡的硬體解碼能力。');
    var bars = [['CPU', r.cpuS], ['GPU', r.gpuS], ['硬體解碼', r.decS]].filter(function (b) { return b[1] > 0; });
    var mx = Math.max.apply(null, bars.map(function (b) { return b[1]; }));
    var cfg = DET_N[st.det] + (st.gait ? '＋步態' : '') + (st.face ? '＋臉部' : '');
    var gbDay = st.cams * 24 * 3600 * 3e6 / 8 / 1e9;
    $('#my-out').innerHTML =
      '<div class="my-res"><div><div class="stat num" style="color:' + (c.cams >= need ? 'var(--good)' : 'var(--bad)') + '">' + fmtC(c.cams) + ' 台</div><div class="stat-l">可支援的攝影機（需要 ' + need + ' 台）</div></div>' +
      '<div><div class="stat num">' + Math.round(c.camH) + '</div><div class="stat-l">每晚可處理的相機小時</div></div>' +
      '<div><div class="stat num" style="font-size:22px">' + (c.cams >= need ? '一台就夠' : '需 ' + n + ' 台') + '</div><div class="stat-l">這種規格要幾台</div></div></div>' +
      '<p style="margin:10px 0 4px"><b>瓶頸：</b>' + r.bott + '。處理一個相機小時需要：</p>' +
      bars.map(function (b) { return '<div class="my-bar"><span>' + b[0] + '</span><i style="width:' + (b[1] / mx * 100).toFixed(1) + '%;background:' + (b[1] === mx ? 'var(--ink)' : '#b8bfb5') + '"></i><em class="num">' + (b[1] >= 60 ? (b[1] / 60).toFixed(1) + ' 分' : b[1].toFixed(0) + ' 秒') + '</em></div>'; }).join('') +
      (warn.length ? '<ul class="my-warn">' + warn.map(function (w) { return '<li>' + w + '</li>'; }).join('') + '</ul>' : '') +
      '<p class="small muted" style="margin:8px 0 0">設定：' + cfg + '，有人時段 ' + st.occ + '%、每晚 ' + st.win + ' 小時（在上方圖表調整）。影片儲存：1080p H.264 約 2–4 Mbps，' + st.cams + ' 台每天約 ' + Math.round(gbDay * 0.67) + '–' + Math.round(gbDay * 1.33) + ' GB。</p>';
  }
})(window);
