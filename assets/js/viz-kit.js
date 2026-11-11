/* ============================================================
   viz-kit.js — 第 3、4 章共用：把程序化人物畫成各種「中間表示」，
   並從畫出來的像素與關節實際計算玩具特徵（教學示意，不是任何模型的輸出）
   ============================================================ */
(function (global) {
  'use strict';
  var PM = global.PersonModel;
  var BG = '#d7dccf', FLOOR = '#c3c9b9', WALL = '#c8cdbf';
  var scratch = document.createElement('canvas');
  var fx = document.createElement('canvas');
  var fxc = fx.getContext('2d', { willReadFrequently: true });

  function cyc(p) { return 1 / (0.95 * p.cadence); }
  function phase(p, t) { return p.phase0 + 2 * Math.PI * 0.95 * p.cadence * t; }

  /* ---------- 攝影機條件 ----------
     yaw：0 = 側面；pitch：俯角；tint：色偏燈光；low：解析度縮小倍數 */
  // 參考常見路邊監視器：架高 3–4 m、俯角約 20–26°。攝影機 2 = 角度不同，再各加一個條件（不累加）
  var CAM1 = { key: 'c1', yaw: 0.45, pitch: 0.35, tint: false, low: 1 };
  var CAM2 = {
    view: { key: 'view', yaw: 0.85, pitch: 0.45, tint: false, low: 1, n: '角度不同' },
    light: { key: 'light', yaw: 0.85, pitch: 0.45, tint: true, low: 1, n: '角度＋光線' },
    outfit: { key: 'outfit', yaw: 0.85, pitch: 0.45, tint: false, low: 1, outfit: 'pt', n: '角度＋換裝' },
    far: { key: 'far', yaw: 0.85, pitch: 0.45, tint: false, low: 4, n: '角度＋遠距' }
  };

  function backdrop(ctx, w, h) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = FLOOR; ctx.fillRect(0, h * 0.78, w, h * 0.22);
    ctx.strokeStyle = WALL; ctx.lineWidth = Math.max(1, w / 160);
    for (var i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(i * w / 4, 0); ctx.lineTo(i * w / 4, h * 0.78); ctx.stroke(); }
  }
  function tint(ctx, w, h) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(255,170,90,0.55)'; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = 'rgba(20,10,0,0.16)'; ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  /** 視圖：crop = 依偵測框正規化（每人等高）；scene = 真實比例（高的人比較大） */
  function view(p, w, h, cam, kind, fill) {
    fill = fill || 0.82;
    var s = kind === 'crop' ? h * fill / (0.98 * p.H) : h * 0.6;
    var foot = kind === 'crop' ? h * (0.5 + fill / 2) : h * 0.9;
    return { yaw: cam.yaw, pitch: cam.pitch, scale: s, x: w / 2, y: foot };
  }

  /**
   * 畫一幀。o: {kind:'scene'|'crop', mode:'rgb'|'sil'|'skel', bg:'scene'|'white'|'none', fill, style, noLow}
   * 低解析：先畫在小畫布再放大（不平滑），讓特徵也真的變粗。
   */
  function frame(ctx, w, h, p, t, cam, o) {
    o = o || {};
    var low = o.noLow ? 1 : (cam.low || 1);
    if (low > 1) {
      var sw = Math.max(4, Math.round(w / low)), sh = Math.max(6, Math.round(h / low));
      scratch.width = sw; scratch.height = sh;
      var sc = scratch.getContext('2d');
      frame(sc, sw, sh, p, t, cam, Object.assign({}, o, { noLow: true }));
      ctx.save(); ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, w, h); ctx.drawImage(scratch, 0, 0, w, h); ctx.restore();
      return;
    }
    var bg = o.bg || 'scene';
    if (bg === 'scene') backdrop(ctx, w, h);
    else if (bg === 'white') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }
    var v = view(p, w, h, cam, o.kind || 'crop', o.fill);
    var pp = cam.outfit ? Object.assign({}, p, { outfit: cam.outfit }) : p;
    var parts = PM.parts(pp, phase(p, t), v, o.mode || 'rgb');
    if (o.mode === 'skel') drawSkel(ctx, parts, o.style || {});
    else PM.renderCanvas(ctx, parts, o.style || {});
    if (cam.tint && (o.mode || 'rgb') === 'rgb' && !o.noTint) tint(ctx, w, h);
  }
  function drawSkel(ctx, list, st) {
    var bc = st.boneColor || '#eb6834';
    ctx.lineCap = 'round';
    list.forEach(function (o) {
      if (o.t === 'line') { ctx.strokeStyle = bc; ctx.lineWidth = o.w; ctx.beginPath(); ctx.moveTo(o.a[0], o.a[1]); ctx.lineTo(o.b[0], o.b[1]); ctx.stroke(); }
      else if (o.t === 'joint') { ctx.fillStyle = '#fff'; ctx.strokeStyle = bc; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(o.p[0], o.p[1], o.r, 0, 7); ctx.fill(); ctx.stroke(); }
      else if (o.t === 'head') { ctx.strokeStyle = bc; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(o.p[0], o.p[1], o.r, 0, 7); ctx.stroke(); }
    });
  }

  /** 2D 關節（螢幕座標），可加姿態估計雜訊 */
  function joints2D(p, t, v, noise, r) {
    var J = PM.joints(p, phase(p, t)), out = {};
    for (var k in J) if (k !== 'headR') {
      var q = PM.project(J[k], v.yaw, v.pitch);
      out[k] = [v.x + q[0] * v.scale + (noise ? U.gauss(r) * noise * v.scale : 0), v.y + q[1] * v.scale + (noise ? U.gauss(r) * noise * v.scale : 0)];
    }
    out.headR = J.headR * v.scale;
    return out;
  }
  function poseNoise(cam) { return cam.low > 1 ? 0.035 : 0.006; }
  function seedOf(p, cam, extra) { var s = 7; (p.id + '|' + cam.yaw + '|' + cam.low + '|' + (cam.outfit || '') + (extra || '')).split('').forEach(function (c) { s = s * 31 + c.charCodeAt(0) >>> 0; }); return s; }

  /* ======================= 玩具特徵 ======================= */
  var NF = 16; // 每個步態週期取 16 幀
  function cycleTimes(p) { var T = cyc(p), a = []; for (var i = 0; i < NF; i++) a.push(i * T / NF); return a; }

  /** 外觀：4×8 區塊平均色（16 幀平均） */
  function featApp(p, cam) {
    var W = 16, H = 32, acc = new Float64Array(96);
    fx.width = W; fx.height = H;
    cycleTimes(p).forEach(function (t) {
      frame(fxc, W, H, p, t, cam, { kind: 'crop', bg: 'scene' });
      var d = fxc.getImageData(0, 0, W, H).data;
      for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
        var cell = Math.floor(y / 4) * 4 + Math.floor(x / 4), i = (y * W + x) * 4;
        acc[cell * 3] += d[i]; acc[cell * 3 + 1] += d[i + 1]; acc[cell * 3 + 2] += d[i + 2];
      }
    });
    var n = NF * 16, cols = [];
    for (var c = 0; c < 32; c++) cols.push([acc[c * 3] / n, acc[c * 3 + 1] / n, acc[c * 3 + 2] / n]);
    var v = []; cols.forEach(function (c) { v.push(c[0] / 255, c[1] / 255, c[2] / 255); });
    return { v: v, cols: cols };
  }

  /** 輪廓：22×32 二值輪廓 → 時間平均（步態能量圖 GEI）→ 8 條水平帶 */
  function featSil(p, cam) {
    var W = 22, H = 32, gei = new Float64Array(W * H);
    fx.width = W; fx.height = H;
    cycleTimes(p).forEach(function (t) {
      frame(fxc, W, H, p, t, cam, { kind: 'crop', mode: 'sil', bg: 'white', style: { silColor: '#000' } });
      var d = fxc.getImageData(0, 0, W, H).data;
      for (var i = 0; i < W * H; i++) gei[i] += (d[i * 4] < 128 ? 1 : 0) / NF;
    });
    var bands = [];
    for (var b = 0; b < 8; b++) {
      var row = [];
      for (var k = 0; k < 4; k++) { // 每條帶分 4 段（左外、左內、右內、右外）
        var s = 0, n = 0;
        for (var y = b * 4; y < b * 4 + 4; y++) for (var x = Math.floor(k * W / 4); x < Math.floor((k + 1) * W / 4); x++) { s += gei[y * W + x]; n++; }
        row.push(s / n);
      }
      bands.push(row);
    }
    return { v: Array.prototype.slice.call(gei), gei: gei, W: W, H: H, bands: bands };
  }

  /** 骨架：2D 關節 → HOT 式正規化（平移、以身高縮放）→ 步態描述子 */
  var SK_NAMES = ['腿長比', '膝屈', '步幅', '擺臂', '前傾', '步頻'];
  function featSkel(p, cam) {
    var r = U.rng(seedOf(p, cam, 'sk')), v = view(p, 200, 260, cam, 'crop'), nz = poseNoise(cam);
    var legR = [], knee = [], stride = [], arm = [], sho = [], lean = [], series = [];
    function ang(a, b, c) { var v1 = [a[0] - b[0], a[1] - b[1]], v2 = [c[0] - b[0], c[1] - b[1]]; var cs = (v1[0] * v2[0] + v1[1] * v2[1]) / (Math.hypot(v1[0], v1[1]) * Math.hypot(v2[0], v2[1]) + 1e-9); return Math.PI - Math.acos(U.clamp(cs, -1, 1)); }
    function d(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
    cycleTimes(p).forEach(function (t) {
      var J = joints2D(p, t, v, nz, r);
      var hgt = Math.max(J.lAnkle[1], J.rAnkle[1]) - (J.head[1] - J.headR);
      legR.push((d(J.lHip, J.lKnee) + d(J.lKnee, J.lAnkle) + d(J.rHip, J.rKnee) + d(J.rKnee, J.rAnkle)) / 2 / hgt);
      var kl = ang(J.lHip, J.lKnee, J.lAnkle), kr = ang(J.rHip, J.rKnee, J.rAnkle);
      knee.push(kl, kr);
      stride.push((J.lAnkle[0] - J.rAnkle[0]) / hgt);
      arm.push((J.lWri[0] - J.lSho[0]) / hgt);
      sho.push(d(J.lSho, J.rSho) / hgt);
      lean.push((J.neck[0] - J.pelvis[0]) / hgt);
      series.push({ kl: kl, kr: kr, s: (J.lAnkle[0] - J.rAnkle[0]) / hgt });
    });
    function mean(a) { return a.reduce(function (x, y) { return x + y; }, 0) / a.length; }
    function range(a) { return Math.max.apply(null, a) - Math.min.apply(null, a); }
    var vals = [mean(legR), Math.max.apply(null, knee), range(stride), range(arm), mean(lean), p.cadence * (1 + U.gauss(r) * (cam.low > 1 ? 0.04 : 0.01))];
    return { raw: vals, series: series };
  }

  /** 3D 體型：擬合後的身高與比例（估計誤差隨視角與解析度增加） */
  var BODY_NAMES = ['身高', '腿長比', '肩寬比', '髖寬比'];
  function featBody(p, cam) {
    var r = U.rng(seedOf(p, cam, 'bd')), e = cam.low > 1 ? 0.08 : 0.04;
    // 衣服會撐大或縮小可見的體型；鋼盔讓頭頂偏高
    var O = PM.OUTFITS[cam.outfit || p.outfit || 'camo'] || {}, bk = 1 + ((O.bulk || 1) - 1) * 0.8, hb = O.head === 'helmet' ? 1.02 : 1;
    return { raw: [p.H * hb * (1 + U.gauss(r) * e), p.legScale * (1 + U.gauss(r) * e), p.shoulderScale * bk * (1 + U.gauss(r) * e * 2), p.hipScale * bk * (1 + U.gauss(r) * e * 2)] };
  }

  function dist(a, b) { var s = 0; for (var i = 0; i < a.length; i++) s += (a[i] - b[i]) * (a[i] - b[i]); return Math.sqrt(s); }
  function std(rows) {
    var n = rows.length, m = rows[0].length, out = [];
    for (var j = 0; j < m; j++) { var mu = 0; rows.forEach(function (r) { mu += r[j]; }); mu /= n; var s = 0; rows.forEach(function (r) { s += (r[j] - mu) * (r[j] - mu); }); out.push(Math.max(Math.sqrt(s / n), 1e-3)); }
    return out;
  }
  function scaled(v, s) { return v.map(function (x, i) { return x / s[i]; }); }

  /* ---------- 小型繪圖工具 ---------- */
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function label(ctx, x, y, s, o) {
    o = o || {};
    ctx.font = (o.bold ? '700 ' : '') + (o.size || 13) + 'px "Noto Sans TC","Microsoft JhengHei","PingFang TC",sans-serif';
    ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic';
    if (o.halo) { ctx.lineWidth = 3; ctx.strokeStyle = o.halo; ctx.strokeText(s, x, y); }
    ctx.fillStyle = o.color || '#1c251f'; ctx.fillText(s, x, y);
  }
  function rgb(c, k) { k = k || 1; return 'rgb(' + Math.round(c[0] * k) + ',' + Math.round(c[1] * k) + ',' + Math.round(c[2] * k) + ')'; }
  function gray(v) { var g = Math.round(255 - U.clamp(v, 0, 1) * 230); return 'rgb(' + g + ',' + g + ',' + g + ')'; }
  function hiDPI(cv, w, h) { var r = Math.min(2, global.devicePixelRatio || 1); cv.width = w * r; cv.height = h * r; var c = cv.getContext('2d'); c.setTransform(r, 0, 0, r, 0, 0); return c; }

  global.VK = {
    BG: BG, CAM1: CAM1, CAM2: CAM2, cyc: cyc, phase: phase, view: view, frame: frame, backdrop: backdrop, tint: tint,
    joints2D: joints2D, poseNoise: poseNoise, seedOf: seedOf, drawSkel: drawSkel,
    featApp: featApp, featSil: featSil, featSkel: featSkel, featBody: featBody, SK_NAMES: SK_NAMES, BODY_NAMES: BODY_NAMES,
    dist: dist, std: std, scaled: scaled, rr: rr, label: label, rgb: rgb, gray: gray, hiDPI: hiDPI
  };
})(window);
