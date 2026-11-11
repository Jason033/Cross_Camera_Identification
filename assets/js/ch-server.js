/* ch-server.js — 第 3 章「營區伺服器跑不跑得動」：常見伺服器等級 × 第一版流程的估算
   估算方法：每個運算步驟的單位成本（CPU 核心毫秒或 GPU 毫秒）× 每相機小時的工作量，
   再依各等級的核心數、GPU 速度、硬體解碼能力換算成每晚可處理的相機小時。
   所有數字都是粗估（誤差可能到 2 倍），用來比較等級與找瓶頸；採購前請以實測取代。 */
(function (global) {
  'use strict';
  var el = U.el, $ = U.$;
  var CH = global.CH = global.CH || {};

  /* ---------- 伺服器等級（代表型號為常見產品線，實際以單位採購規格為準） ---------- */
  var TIERS = [
    { id: 'A', n: '小型塔式伺服器', ex: 'Dell PowerEdge T350、HPE ProLiant ML30 等；Intel Xeon E-2300 系列 8 核',
      spec: '8 核 CPU、32–64 GB 記憶體、無 GPU', cores: 8, gpu: 0, nvdec: 0, note: '許多單位現有的檔案或應用伺服器屬於這級' },
    { id: 'B', n: '2U 機架伺服器（雙 CPU）', ex: 'Dell PowerEdge R750、HPE ProLiant DL380 Gen10 Plus、Lenovo SR650 V2 等；2× Xeon Silver 4314（16 核）',
      spec: '32 核 CPU、128 GB 以上記憶體、無 GPU', cores: 32, gpu: 0, nvdec: 0, note: '機房常見的主力機型' },
    { id: 'C', n: '機架伺服器＋入門推論卡', ex: '同 B，加裝 NVIDIA T4（16 GB、70 W、單槽半高）',
      spec: '32 核 CPU＋T4；T4 硬體解碼約可同時解 38 路 1080p30', cores: 32, gpu: 1.0, nvdec: 1140, note: 'T4 幾乎所有機架伺服器都能裝，不需額外供電' },
    { id: 'D', n: '機架伺服器＋新一代推論卡', ex: '同 B，加裝 NVIDIA L4（24 GB、72 W、單槽）',
      spec: '32 核 CPU＋L4；算力約為 T4 的 1.5–2 倍', cores: 32, gpu: 1.8, nvdec: 1600, note: 'T4 的後繼卡；解碼能力為粗估（待確認）' },
    { id: 'E', n: '工作站＋專業顯示卡', ex: 'Dell Precision 5860、HP Z4 G5 等；NVIDIA RTX A4000（16 GB）',
      spec: '12–16 核 CPU＋RTX A4000', cores: 14, gpu: 1.2, nvdec: 900, note: '適合研發階段；消費級 GeForce 卡的驅動授權限制資料中心部署，正式系統不建議' },
    { id: 'F', n: '邊緣運算盒（每個點位一台）', ex: 'NVIDIA Jetson AGX Orin 64GB／Orin NX 16GB',
      spec: '8–12 核 ARM＋整合 GPU；每台負責 2–4 台攝影機', cores: 8, gpu: 0.35, nvdec: 500, arm: true, note: '分散在各點位處理，只回傳特徵；需另外維運多台設備' }
  ];

  /* ---------- 單位成本 ---------- */
  // cpu：一個現代 x86 核心的毫秒數；gpu：T4 等級 GPU 的毫秒數（FP16、批次推論）
  var COST = {
    dec: { n: '影片解碼（1080p H.264，每幀）', cpu: 4, gpu: null, src: '假設（研究報告）：軟體解碼約 3–5 ms／幀／核心；有 GPU 時改用硬體解碼器' },
    det_s: { n: '偵測 YOLOX-S（640，每幀）', cpu: 600, gpu: 4, src: 'FLOPs 換算：NanoDet-Plus-m 在 i7-8700 為 8.32 ms（1.52 GFLOPs）、YOLO26s 在 T4 為 2.5 ms（20.9 GFLOPs），依 YOLOX-S 26.8 GFLOPs 換算' },
    det_t: { n: '偵測 YOLOX-Tiny（416，每幀）', cpu: 150, gpu: 1.5, src: 'FLOPs 換算（6.45 GFLOPs）' },
    det_n: { n: '偵測 NanoDet-Plus-m（416，每幀）', cpu: 50, gpu: 1, src: '文獻實測：i7-8700 為 8.32 ms（以 6 核換算成核心毫秒）' },
    pose: { n: '姿態 RTMPose-m（每個人形）', cpu: 60, gpu: 1.5, src: '文獻實測：i7-11700 約 90 FPS，換算成核心毫秒' },
    reid: { n: '外觀 SOLIDER Swin-S（每張裁切）', cpu: 130, gpu: 1.5, src: 'FLOPs 換算（Swin-S 在 256×128 約 5.7 GFLOPs）' },
    seg: { n: '人形分割（步態用，每幀）', cpu: 300, gpu: 3, src: '假設：輕量分割模型的 CPU 數據本次未查到（待確認）' },
    gait: { n: '步態 DeepGaitV2-P3D（每段 30 幀）', cpu: 600, gpu: 5, src: '假設：依 2.9 GFLOPs 粗估（待確認是每幀或每段）' },
    face: { n: '臉部 AdaFace R50（每張臉）', cpu: 140, gpu: 2, src: 'FLOPs 換算（IResNet-50 約 6.3 GFLOPs）' },
    misc: { n: '前後處理、追蹤、比對（每個偵測幀）', cpu: 5, gpu: null, src: '假設：縮放、追蹤、寫檔等；ByteTrack 本身可忽略' }
  };
  var DET_N = { det_s: 'YOLOX-S', det_t: 'YOLOX-Tiny', det_n: 'NanoDet-Plus' };

  var st = { cams: 20, occ: 40, win: 10, det: 'det_s', gait: true, face: true };

  /** 每相機小時的工作量 */
  function workload() {
    var p = st.occ / 100, trk = 500 * p;           // 有人比例 40% 時約 200 段片段／相機小時
    var seq = st.gait ? trk * 0.5 : 0;             // 一半的片段品質夠做步態
    return {
      dec: 3600 * 25,                               // 全部解碼（壓縮影片無法任意跳幀）
      det: 3600 * (p * 5 + (1 - p) * 1),            // 有人 5 fps、沒人 1 fps
      pose: trk * 16, reid: trk * 8, seg: seq * 30, gait: seq,
      face: st.face ? trk * 0.2 * 5 : 0,            // 約 20% 的片段經過近距點位，每段 5 張臉
      misc: 3600 * (p * 5 + (1 - p) * 1)
    };
  }
  /** 某等級處理一個相機小時的時間（秒），以及各部分 */
  function perCamHour(t) {
    var W = workload(), dk = st.det;
    var cpuMs = 0, gpuMs = 0, decS = 0, parts = {};
    function add(key, cnt, costKey) {
      var c = COST[costKey || key];
      if (t.gpu && c.gpu != null) { var g = cnt * c.gpu / t.gpu; gpuMs += g; parts[key] = { gpu: g }; }
      else { var m = cnt * c.cpu * (t.arm ? 2 : 1); cpuMs += m; parts[key] = { cpu: m }; }
    }
    if (t.nvdec) { decS = W.dec / t.nvdec; parts.dec = { dec: decS * 1000 }; }
    else add('dec', W.dec);
    add('det', W.det, dk); add('pose', W.pose); add('reid', W.reid); add('seg', W.seg); add('gait', W.gait); add('face', W.face); add('misc', W.misc);
    var cpuS = cpuMs / 1000 / (t.cores * 0.7), gpuS = gpuMs / 1000;
    var wall = Math.max(cpuS, gpuS, decS);
    var bott = wall === decS ? '影片解碼' : wall === gpuS ? 'GPU 推論' : 'CPU';
    if (bott === 'CPU') { var top = Object.keys(parts).filter(function (k) { return parts[k].cpu; }).sort(function (a, b) { return parts[b].cpu - parts[a].cpu; })[0]; bott += '（主要是' + ({ dec: '解碼', det: '偵測', seg: '人形分割', reid: '外觀特徵', pose: '姿態', gait: '步態', face: '臉部', misc: '前後處理' }[top]) + '）'; }
    return { wall: wall, cpuS: cpuS, gpuS: gpuS, decS: decS, bott: bott };
  }
  function capacity(t) {
    var r = perCamHour(t), camH = st.win * 3600 / r.wall;
    return { r: r, camH: camH, cams: camH / 24 };
  }

  CH.server = {
    init: function () {
      if (!$('#srv-svg')) return;
      var box = $('#srv-ctrl');
      function slider(id, label, min, max, step, key, fmt) {
        var d = U.h('div', { class: 'slider' }, '<label for="' + id + '">' + label + '</label><output class="num" id="' + id + '-o"></output><input type="range" id="' + id + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + st[key] + '">');
        box.appendChild(d);
        var inp = $('#' + id, d), out = $('#' + id + '-o', d);
        function upd() { st[key] = +inp.value; out.textContent = fmt(st[key]); draw(); }
        inp.addEventListener('input', upd); out.textContent = fmt(st[key]);
      }
      slider('srv-cams', '營區攝影機數（每台每天錄 24 小時）', 2, 80, 1, 'cams', function (v) { return v + ' 台'; });
      slider('srv-occ', '畫面裡有人的時段比例', 10, 100, 5, 'occ', function (v) { return v + '%'; });
      slider('srv-win', '每晚可用的處理時間', 4, 24, 1, 'win', function (v) { return v + ' 小時'; });
      var sel = U.h('div', { class: 'ctl-row' }, '<label for="srv-det">偵測器</label><span></span><select id="srv-det"><option value="det_s">YOLOX-S（第一版建議）</option><option value="det_t">YOLOX-Tiny（較輕）</option><option value="det_n">NanoDet-Plus（最輕，召回較差）</option></select>');
      box.appendChild(sel);
      $('#srv-det').addEventListener('change', function (e) { st.det = e.target.value; draw(); });
      var chk = U.h('div', {}, '<label class="chk"><input type="checkbox" id="srv-gait" checked> 步態（含人形分割）</label><label class="chk"><input type="checkbox" id="srv-face" checked> 臉部（近距點位）</label>');
      box.appendChild(chk);
      $('#srv-gait').addEventListener('change', function (e) { st.gait = e.target.checked; draw(); });
      $('#srv-face').addEventListener('change', function (e) { st.face = e.target.checked; draw(); });
      $('#srv-basis').innerHTML = '<thead><tr><th>運算</th><th class="num">CPU（核心毫秒）</th><th class="num">GPU（T4 毫秒）</th><th>依據</th></tr></thead><tbody>' +
        Object.keys(COST).map(function (k) { var c = COST[k]; return '<tr><td>' + c.n + '</td><td class="num">' + c.cpu + '</td><td class="num">' + (c.gpu == null ? '—' : c.gpu) + '</td><td class="small">' + c.src + '</td></tr>'; }).join('') + '</tbody>';
      draw();
    }
  };

  function draw() {
    var svg = U.clear($('#srv-svg')), L = 210, W = 330, rh = 46, T = 40;
    var caps = TIERS.map(capacity), mx = Math.max(st.cams * 1.25, Math.max.apply(null, caps.map(function (c) { return Math.min(c.cams, st.cams * 4); })));
    mx = Math.max(10, Math.ceil(mx / 10) * 10);
    function X(v) { return L + Math.min(v, mx) / mx * W; }
    el('text', { x: 0, y: 18, 'font-size': 13.5, 'font-weight': 700, fill: 'var(--ink)', text: '每一級能支援幾台攝影機（每台每天 24 小時錄影）' }, svg);
    [0, mx / 2, mx].forEach(function (v) {
      el('line', { x1: X(v), x2: X(v), y1: T - 6, y2: T + TIERS.length * rh, stroke: 'var(--rule-2)' }, svg);
      el('text', { x: X(v), y: T + TIERS.length * rh + 16, 'text-anchor': 'middle', 'font-size': 11.5, fill: 'var(--ink-3)', class: 'num', text: Math.round(v) + ' 台' }, svg);
    });
    el('line', { x1: X(st.cams), x2: X(st.cams), y1: T - 10, y2: T + TIERS.length * rh + 4, stroke: 'var(--ink)', 'stroke-width': 2, 'stroke-dasharray': '5 4' }, svg);
    el('text', { x: X(st.cams), y: T - 14, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: 'var(--ink)', text: '需要 ' + st.cams + ' 台' }, svg);
    TIERS.forEach(function (t, i) {
      var c = caps[i], y = T + i * rh, ok = c.cams >= st.cams;
      el('text', { x: 0, y: y + 16, 'font-size': 13, 'font-weight': 700, fill: 'var(--ink)', text: t.id + '　' + t.n }, svg);
      el('text', { x: 0, y: y + 32, 'font-size': 11, fill: 'var(--ink-3)', text: t.spec.length > 22 ? t.spec.slice(0, 22) + '…' : t.spec }, svg);
      el('rect', { x: L, y: y + 6, width: Math.max(2, X(c.cams) - L), height: 22, rx: 3, fill: ok ? 'var(--good)' : c.cams >= st.cams * 0.5 ? 'var(--warn)' : 'var(--bad)', opacity: 0.85 }, svg);
      var lab = (c.cams >= 10 ? Math.round(c.cams) : c.cams.toFixed(1)) + ' 台' + (t.id === 'F' ? '（每台盒子）' : '') + (c.cams > mx ? ' →' : '');
      var inside = X(c.cams) > L + W - 90;
      el('text', { x: inside ? X(c.cams) - 6 : X(c.cams) + 6, y: y + 22, 'text-anchor': inside ? 'end' : 'start', 'font-size': 12.5, 'font-weight': 700, fill: inside ? '#fff' : 'var(--ink)', class: 'num', text: lab }, svg);
    });
    // 表格
    $('#srv-tbl').innerHTML = '<thead><tr><th>等級</th><th>代表型號</th><th class="num">每晚可處理</th><th class="num">可支援</th><th>瓶頸</th><th>適合</th></tr></thead><tbody>' +
      TIERS.map(function (t, i) {
        var c = caps[i], ok = c.cams >= st.cams;
        var fit = t.id === 'F' ? '每 ' + Math.max(1, Math.floor(c.cams)) + ' 台攝影機配一台；共需約 ' + Math.ceil(st.cams / Math.max(0.5, c.cams)) + ' 台' : ok ? '可處理全部 ' + st.cams + ' 台' : '需 ' + Math.ceil(st.cams / Math.max(0.1, c.cams)) + ' 台這級的機器，或降低設定';
        return '<tr' + (ok ? ' class="ok"' : '') + '><td><b>' + t.id + '　' + t.n + '</b><br><span class="small muted">' + t.spec + '</span></td><td class="small">' + t.ex + '<br><span class="muted">' + t.note + '</span></td><td class="num">' + Math.round(c.camH) + ' 相機小時</td><td class="num"><b>' + (c.cams >= 10 ? Math.round(c.cams) : c.cams.toFixed(1)) + ' 台</b></td><td class="small">' + c.r.bott + '</td><td class="small">' + fit + '</td></tr>';
      }).join('') + '</tbody>';
    var cfg = DET_N[st.det] + (st.gait ? '＋步態' : '') + (st.face ? '＋臉部' : '');
    var best = TIERS.filter(function (t, i) { return t.id !== 'F' && caps[i].cams >= st.cams; })[0];
    var gbDay = st.cams * 24 * 3600 * 3e6 / 8 / 1e9;
    $('#srv-read').innerHTML = '<p style="margin:0 0 6px"><b>目前設定：</b>' + cfg + '，' + st.cams + ' 台攝影機、有人時段 ' + st.occ + '%、每晚 ' + st.win + ' 小時。</p>' +
      '<p style="margin:0 0 6px"><b>結論：</b>' + (best ? '最低需要 <b>' + best.id + '　' + best.n + '</b>（' + best.ex.split('；')[0] + '）。' : '單台伺服器都不夠：考慮多台、加 GPU，或改用較輕的偵測器、關掉步態。') + '</p>' +
      '<p class="small muted" style="margin:0">影片儲存：1080p H.264 約 2–4 Mbps，' + st.cams + ' 台每天約 ' + Math.round(gbDay * 0.67) + '–' + Math.round(gbDay * 1.33) + ' GB；處理前要先能從錄影主機讀出檔案。</p>';
  }
})(window);
