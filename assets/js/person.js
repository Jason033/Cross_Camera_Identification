/* ============================================================
   person.js — 程序化 3D 人體與步行模型（教學示意，非真實資料）
   - 身體比例以 Drillis & Contini 的人體節段比例為基準（佔身高比例）
   - 每個「人」以少量參數描述：身高、肩寬、腿長比例、步幅、擺臂、膝屈、步頻
   - 產生 3D 關節 → 依攝影機 yaw / pitch 投影 → SVG 或 Canvas 繪製
   ============================================================ */
(function (global) {
  'use strict';

  // 基準節段比例（佔身高 H）
  var BASE = {
    thigh: 0.245, shank: 0.246, foot: 0.11,
    upperArm: 0.186, forearm: 0.146,
    shoulderW: 0.259, hipW: 0.191,
    torso: 0.288, neck: 0.052, head: 0.062
  };

  /** 建立一位人員的參數。p 會覆蓋預設值。 */
  function makePerson(p) {
    return Object.assign({
      id: 'P', H: 1.0, legScale: 1.0, shoulderScale: 1.0, hipScale: 1.0,
      stride: 0.42, armSwing: 0.45, kneeFlex: 0.95, cadence: 1.0, lean: 0.04,
      bounce: 0.012, elbow: 0.35, phase0: 0
    }, p || {});
  }

  /** 在相位 phi（弧度）時的 3D 關節位置。座標：x 側向、y 向上、z 向前。 */
  function joints(p, phi) {
    var H = p.H;
    var th = BASE.thigh * H * p.legScale, sh = BASE.shank * H * p.legScale;
    var ua = BASE.upperArm * H, fa = BASE.forearm * H;
    var sw = BASE.shoulderW * H * p.shoulderScale, hw = BASE.hipW * H * p.hipScale;
    var torso = BASE.torso * H, neck = BASE.neck * H, hr = BASE.head * H;
    var foot = BASE.foot * H;

    function leg(side, ph) {
      var hipA = p.stride * Math.sin(ph);                         // 髖屈伸
      var swing = Math.max(0, Math.sin(ph + Math.PI * 0.42));      // 擺盪期膝屈（髖向前擺時膝最彎）
      var knee = p.kneeFlex * Math.pow(swing, 1.6) + 0.06;
      var hip = [side * hw / 2, 0, 0];
      var kneeP = [hip[0], -th * Math.cos(hipA), th * Math.sin(hipA)];
      var sa = hipA - knee;
      var ankle = [hip[0], kneeP[1] - sh * Math.cos(sa), kneeP[2] + sh * Math.sin(sa)];
      var toeA = sa + Math.PI / 2 - 0.15 * swing;
      var toe = [hip[0], ankle[1] - foot * 0.25 * Math.cos(toeA) * 0.2, ankle[2] + foot * Math.sin(toeA) * 0.9];
      return { hip: hip, knee: kneeP, ankle: ankle, toe: toe };
    }
    var L = leg(1, phi), R = leg(-1, phi + Math.PI);

    // 骨盆起伏：讓最低的腳踝貼地
    var lowest = Math.min(L.ankle[1], R.ankle[1]);
    var pelvisY = -lowest + 0.02 * H + p.bounce * H * Math.cos(2 * phi);
    function lift(o) { for (var k in o) o[k] = [o[k][0], o[k][1] + pelvisY, o[k][2]]; return o; }
    lift(L); lift(R);

    var lean = p.lean;
    var neckBase = [0, pelvisY + torso * Math.cos(lean), torso * Math.sin(lean)];
    var headC = [0, neckBase[1] + neck + hr, neckBase[2] + 0.01 * H];

    function arm(side, ph) {
      var a = -p.armSwing * Math.sin(ph);
      var sh0 = [side * sw / 2, neckBase[1] - 0.02 * H, neckBase[2]];
      var el = [sh0[0] + side * 0.012 * H, sh0[1] - ua * Math.cos(a), sh0[2] + ua * Math.sin(a)];
      var ea = a + p.elbow + 0.15 * Math.max(0, Math.sin(ph));
      var wr = [el[0], el[1] - fa * Math.cos(ea), el[2] + fa * Math.sin(ea)];
      return { shoulder: sh0, elbow: el, wrist: wr };
    }
    var AL = arm(1, phi), AR = arm(-1, phi + Math.PI);

    return {
      head: headC, headR: hr, neck: neckBase, pelvis: [0, pelvisY, 0],
      lHip: L.hip, lKnee: L.knee, lAnkle: L.ankle, lToe: L.toe,
      rHip: R.hip, rKnee: R.knee, rAnkle: R.ankle, rToe: R.toe,
      lSho: AL.shoulder, lElb: AL.elbow, lWri: AL.wrist,
      rSho: AR.shoulder, rElb: AR.elbow, rWri: AR.wrist
    };
  }

  /** 正交投影：yaw 繞垂直軸（0 = 側面，π/2 = 正面），pitch 為俯角。回傳 [sx, sy, depth] */
  function project(pt, yaw, pitch) {
    var cy = Math.cos(yaw), syw = Math.sin(yaw);
    // 讓 yaw=0 時看到人往右走（z 方向映到螢幕 +x）
    var x = pt[2] * cy + pt[0] * syw;
    var d = -pt[0] * cy + pt[2] * syw;
    var y = pt[1];
    var cp = Math.cos(pitch), sp = Math.sin(pitch);
    var y2 = y * cp - d * sp;
    var d2 = y * sp + d * cp;
    return [x, -y2, d2];
  }

  // 骨架節段（COCO 風格的子集）
  var BONES = [
    ['neck', 'pelvis', 'torso'],
    ['lSho', 'rSho', 'shoulders'], ['lHip', 'rHip', 'hips'],
    ['lSho', 'lElb', 'arm'], ['lElb', 'lWri', 'arm'],
    ['rSho', 'rElb', 'arm'], ['rElb', 'rWri', 'arm'],
    ['lHip', 'lKnee', 'leg'], ['lKnee', 'lAnkle', 'leg'], ['lAnkle', 'lToe', 'foot'],
    ['rHip', 'rKnee', 'leg'], ['rKnee', 'rAnkle', 'leg'], ['rAnkle', 'rToe', 'foot']
  ];
  var JOINT_NAMES = ['head', 'neck', 'lSho', 'rSho', 'lElb', 'rElb', 'lWri', 'rWri', 'pelvis', 'lHip', 'rHip', 'lKnee', 'rKnee', 'lAnkle', 'rAnkle'];

  /* ---------- 服裝（國軍常見服裝的示意，配色為近似值）----------
     top / pants：'camo' = 數位迷彩；sleeve：long 長袖 / rolled 捲袖 / short 短袖；legs：long / shorts；
     head：cap 小帽 / helmet 鋼盔 / none 短髮；bulk：上身厚度；jacket：外套蓋過腰 */
  var SKIN = '#c99b78', HAIR = '#1d1b18', HELMET = '#4a5236';
  var OUTFITS = {
    camo: { n: '迷彩服＋小帽', top: 'camo', pants: 'camo', boot: '#1f1d1a', head: 'cap', sleeve: 'long', legs: 'long', bulk: 1 },
    helmet: { n: '迷彩服＋鋼盔', top: 'camo', pants: 'camo', boot: '#1f1d1a', head: 'helmet', sleeve: 'long', legs: 'long', bulk: 1.03 },
    summer: { n: '夏季捲袖', top: 'camo', pants: 'camo', boot: '#1f1d1a', head: 'cap', sleeve: 'rolled', legs: 'long', bulk: 1 },
    winter: { n: '冬季外套', top: '#3f4a2f', pants: 'camo', boot: '#1f1d1a', head: 'cap', sleeve: 'long', legs: 'long', bulk: 1.2, jacket: true },
    casualA: { n: '便服 1', top: '#a8473a', pants: '#2d3a5e', boot: '#d9d6cc', head: 'none', sleeve: 'short', legs: 'long', bulk: 0.97 },
    casualB: { n: '便服 2', top: '#d9d4c6', pants: '#5b5850', boot: '#3a3631', head: 'none', sleeve: 'long', legs: 'long', bulk: 1 },
    pt: { n: '運動服', top: '#4d6b3a', pants: '#1f2124', boot: '#cfd0c8', head: 'none', sleeve: 'short', legs: 'shorts', bulk: 0.94 }
  };

  /**
   * 產生可繪製的「身體零件」清單（已投影、依深度排序）。
   * mode: 'rgb' | 'sil' | 'skel'
   */
  function parts(p, phi, view, mode) {
    var J = joints(p, phi);
    var yaw = view.yaw || 0, pitch = view.pitch || 0, s = view.scale, ox = view.x, oy = view.y;
    var P = {};
    for (var k in J) if (k !== 'headR') {
      var q = project(J[k], yaw, pitch);
      P[k] = [ox + q[0] * s, oy + q[1] * s, q[2]];
    }
    var H = p.H * s;
    var out = [];
    function seg(a, b, w, fill, kind, zbias) {
      out.push({ t: 'line', a: P[a], b: P[b], w: w, c: fill, kind: kind, z: (P[a][2] + P[b][2]) / 2 + (zbias || 0) });
    }
    var O = OUTFITS[p.outfit || 'camo'] || OUTFITS.camo;

    if (mode === 'skel') {
      BONES.forEach(function (b) {
        out.push({ t: 'line', a: P[b[0]], b: P[b[1]], w: Math.max(1.6, H * 0.012), c: null, kind: 'bone', z: (P[b[0]][2] + P[b[1]][2]) / 2 });
      });
      JOINT_NAMES.forEach(function (n) {
        out.push({ t: 'joint', p: P[n], r: Math.max(2.2, H * 0.016), z: P[n][2] + 0.001, name: n });
      });
      out.push({ t: 'head', p: P.head, r: J.headR * s * 0.9, z: P.head[2], hollow: true });
      return out.sort(byZ);
    }

    var sil = mode === 'sil';
    var bulk = O.bulk || 1;
    var limbW = H * 0.062 * (1 + (bulk - 1) * 0.8), legW = H * 0.078, torsoW = H * 0.19 * bulk;
    var bareArm = H * 0.05, bareLeg = H * 0.058;
    // 後側肢體（深度較遠）顏色加深，讓 RGB 圖看得出前後
    function col(c, depth) { if (sil) return null; if (c === 'camo') return depth > 0 ? 'P:camoD' : 'P:camo'; return depth > 0 ? shade(c) : c; }
    function mid(a, b, t) { return [P[a][0] + (P[b][0] - P[a][0]) * t, P[a][1] + (P[b][1] - P[a][1]) * t, P[a][2] + (P[b][2] - P[a][2]) * t]; }
    function segP(a, b, w, fill, kind, zb) { out.push({ t: 'line', a: a, b: b, w: w, c: fill, kind: kind, z: (a[2] + b[2]) / 2 + (zb || 0) }); }
    var lDepth = P.lHip[2] - P.rHip[2];
    var skin = sil ? null : SKIN;

    ['l', 'r'].forEach(function (sd) {
      var dz = sd === 'l' ? lDepth : -lDepth;
      var hip = sd + 'Hip', knee = sd + 'Knee', ank = sd + 'Ankle', toe = sd + 'Toe', sho = sd + 'Sho', elb = sd + 'Elb', wri = sd + 'Wri';
      // 腿
      if (O.legs === 'shorts') {
        seg(hip, knee, bareLeg, skin, 'leg');
        seg(knee, ank, bareLeg * 0.85, skin, 'leg');
        segP(P[hip], mid(hip, knee, 0.5), legW * 1.08, col(O.pants, dz), 'leg', 0.0003);
      } else {
        seg(hip, knee, legW, col(O.pants, dz), 'leg');
        seg(knee, ank, legW * 0.85, col(O.pants, dz), 'leg');
      }
      seg(ank, toe, legW * 0.7, sil ? null : (dz > 0 ? shade(O.boot) : O.boot), 'boot', 0.0005);
      // 手臂
      if (O.sleeve === 'short') {
        seg(sho, elb, bareArm, skin, 'arm');
        seg(elb, wri, bareArm * 0.9, skin, 'arm');
        segP(P[sho], mid(sho, elb, 0.45), limbW * 1.05, col(O.top, dz), 'arm', 0.0003);
      } else if (O.sleeve === 'rolled') {
        seg(sho, elb, limbW, col(O.top, dz), 'arm');
        seg(elb, wri, bareArm * 0.9, skin, 'arm');
        segP(mid(elb, wri, 0), mid(elb, wri, 0.18), limbW * 1.08, col(O.top, dz), 'arm', 0.0003);
      } else {
        seg(sho, elb, limbW, col(O.top, dz), 'arm');
        seg(elb, wri, limbW * 0.9, col(O.top, dz), 'arm');
      }
      out.push({ t: 'dot', p: P[wri], r: limbW * 0.42 * (O.sleeve === 'long' ? 1 : 0.85), c: skin, z: P[wri][2] + 0.0001 });
    });
    // 軀幹：肩到髖
    var cx = (P.lSho[0] + P.rSho[0]) / 2;
    var tw = Math.max(torsoW * 0.62, Math.abs(P.lSho[0] - P.rSho[0]) * bulk);
    out.push({ t: 'torso', a: P.neck, b: P.pelvis, w: tw, c: col(O.top, -1), z: P.neck[2], cx: cx });
    var hemLen = O.jacket ? H * 0.075 : H * 0.02;
    out.push({ t: 'line', a: P.pelvis, b: [P.pelvis[0], P.pelvis[1] - hemLen, P.pelvis[2]], w: tw * 0.95, c: O.jacket ? col(O.top, -1) : col(O.pants, -1), kind: 'hip', z: P.pelvis[2] });
    // 頭與帽：cap 小帽、helmet 鋼盔、none 只有短髮
    out.push({ t: 'head', p: P.head, r: J.headR * s, c: skin, wear: O.head, wearC: sil ? null : (O.head === 'helmet' ? HELMET : O.head === 'cap' ? 'P:camo' : HAIR), z: P.head[2] + 0.002 });
    return out.sort(byZ);
  }
  function byZ(a, b) { return a.z - b.z; }
  function shade(hex) {
    if (!hex || hex.charAt(0) !== '#') return hex;
    var n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return 'rgb(' + Math.round(r * 0.78) + ',' + Math.round(g * 0.78) + ',' + Math.round(b * 0.78) + ')';
  }

  /* ---------- 國軍數位迷彩（示意配色）---------- */
  var CAMO_COLS = ['#5d6b3b', '#7a8350', '#3f4a2c', '#6a5a3c', '#2c2e24'];
  var CAMO_MAP = (function () { // 8×8 格，以固定種子產生成塊的像素迷彩
    var s = 12345, m = [];
    function r() { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }
    for (var y = 0; y < 8; y++) { m[y] = []; for (var x = 0; x < 8; x++) m[y][x] = Math.floor(r() * 5); }
    for (var k = 0; k < 2; k++) for (var y2 = 0; y2 < 8; y2++) for (var x2 = 0; x2 < 8; x2++) if (r() < 0.45) m[y2][x2] = m[y2][(x2 + 7) % 8];
    return m;
  })();
  function cellSize(o) { return Math.max(1, Math.min(6, Math.round((o.w || 10) / 9))); }
  var defsSvg = null, made = {};
  function svgPattern(cs, dark) {
    var id = (dark ? 'camoD-' : 'camo-') + cs;
    if (made[id]) return id;
    if (!defsSvg) {
      defsSvg = document.createElementNS(NS, 'svg');
      defsSvg.setAttribute('width', '0'); defsSvg.setAttribute('height', '0'); defsSvg.setAttribute('aria-hidden', 'true');
      defsSvg.style.position = 'absolute';
      defsSvg.appendChild(document.createElementNS(NS, 'defs'));
      document.body.appendChild(defsSvg);
    }
    var pat = document.createElementNS(NS, 'pattern');
    pat.setAttribute('id', id); pat.setAttribute('patternUnits', 'userSpaceOnUse');
    pat.setAttribute('width', 8 * cs); pat.setAttribute('height', 8 * cs);
    var html = '';
    for (var y = 0; y < 8; y++) for (var x = 0; x < 8; x++) html += '<rect x="' + x * cs + '" y="' + y * cs + '" width="' + (cs + 0.6) + '" height="' + (cs + 0.6) + '" shape-rendering="crispEdges" fill="' + (dark ? shade(CAMO_COLS[CAMO_MAP[y][x]]) : CAMO_COLS[CAMO_MAP[y][x]]) + '"/>';
    pat.innerHTML = html;
    defsSvg.firstChild.appendChild(pat);
    made[id] = true;
    return id;
  }
  function svgFill(c, o) { if (c && c.indexOf('P:') === 0) return 'url(#' + svgPattern(cellSize(o), c === 'P:camoD') + ')'; return c; }
  function canvasFill(ctx, c, o) {
    if (!c || c.indexOf('P:') !== 0) return c;
    var cs = cellSize(o), dark = c === 'P:camoD', key = cs + (dark ? 'd' : '');
    ctx.__camo = ctx.__camo || {};
    if (!ctx.__camo[key]) {
      var t = document.createElement('canvas'); t.width = t.height = 8 * cs;
      var tc = t.getContext('2d');
      for (var y = 0; y < 8; y++) for (var x = 0; x < 8; x++) { tc.fillStyle = dark ? shade(CAMO_COLS[CAMO_MAP[y][x]]) : CAMO_COLS[CAMO_MAP[y][x]]; tc.fillRect(x * cs, y * cs, cs, cs); }
      ctx.__camo[key] = ctx.createPattern(t, 'repeat');
    }
    return ctx.__camo[key];
  }

  /* ---------- 頭部：帽、盔、短髮 ---------- */
  function headSVG(o, silC, op) {
    var x = o.p[0], y = o.p[1], r = o.r, a = op ? ' opacity="' + op + '"' : '';
    var h = '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r) + '" fill="' + (o.c || silC) + '"' + a + '/>';
    var wc = svgFill(o.wearC, { w: r * 2 }) || silC;
    if (o.wear === 'helmet') {
      h += '<path d="M' + f(x - r * 1.28) + ' ' + f(y + r * 0.1) + ' A' + f(r * 1.28) + ' ' + f(r * 1.25) + ' 0 0 1 ' + f(x + r * 1.28) + ' ' + f(y + r * 0.1) + ' L' + f(x + r * 1.42) + ' ' + f(y + r * 0.28) + ' L' + f(x - r * 1.42) + ' ' + f(y + r * 0.28) + 'Z" fill="' + wc + '"' + a + '/>';
    } else if (o.wear === 'cap') {
      h += '<path d="M' + f(x - r * 1.04) + ' ' + f(y - r * 0.12) + ' A' + f(r * 1.04) + ' ' + f(r * 1.04) + ' 0 0 1 ' + f(x + r * 1.04) + ' ' + f(y - r * 0.12) + ' L' + f(x + r * 1.55) + ' ' + f(y - r * 0.05) + ' L' + f(x - r * 1.04) + ' ' + f(y - r * 0.05) + 'Z" fill="' + wc + '"' + a + '/>';
    } else {
      h += '<path d="M' + f(x - r) + ' ' + f(y - r * 0.05) + ' A' + f(r) + ' ' + f(r) + ' 0 0 1 ' + f(x + r) + ' ' + f(y - r * 0.05) + ' Q' + f(x) + ' ' + f(y - r * 0.55) + ' ' + f(x - r) + ' ' + f(y - r * 0.05) + 'Z" fill="' + wc + '"' + a + '/>';
    }
    return h;
  }
  function headCanvas(ctx, o, silC) {
    var x = o.p[0], y = o.p[1], r = o.r;
    ctx.fillStyle = o.c || silC; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = canvasFill(ctx, o.wearC, { w: r * 2 }) || silC;
    ctx.beginPath();
    if (o.wear === 'helmet') { ctx.ellipse(x, y + r * 0.1, r * 1.28, r * 1.25, 0, Math.PI, 0); ctx.lineTo(x + r * 1.42, y + r * 0.28); ctx.lineTo(x - r * 1.42, y + r * 0.28); }
    else if (o.wear === 'cap') { ctx.arc(x, y - r * 0.12, r * 1.04, Math.PI, 0); ctx.lineTo(x + r * 1.55, y - r * 0.05); ctx.lineTo(x - r * 1.04, y - r * 0.05); }
    else { ctx.arc(x, y - r * 0.05, r, Math.PI, 0); ctx.quadraticCurveTo(x, y - r * 0.55, x - r, y - r * 0.05); }
    ctx.fill();
  }

  // ---------- SVG 繪製 ----------
  var NS = 'http://www.w3.org/2000/svg';
  function renderSVG(g, list, style) {
    style = style || {};
    var silC = style.silColor || '#1c251f';
    var boneC = style.boneColor || '#eb6834';
    var op = style.opacity ? ' opacity="' + style.opacity + '"' : '';
    var html = '';
    list.forEach(function (o) {
      if (o.t === 'line') {
        var c = o.kind === 'bone' ? boneC : (svgFill(o.c, o) || silC);
        html += '<line x1="' + f(o.a[0]) + '" y1="' + f(o.a[1]) + '" x2="' + f(o.b[0]) + '" y2="' + f(o.b[1]) + '" stroke="' + c + '" stroke-width="' + f(o.w) + '" stroke-linecap="round"' + op + '/>';
      } else if (o.t === 'torso') {
        var c2 = svgFill(o.c, o) || silC;
        html += '<line x1="' + f(o.a[0]) + '" y1="' + f(o.a[1] + o.w * 0.12) + '" x2="' + f(o.b[0]) + '" y2="' + f(o.b[1] - o.w * 0.05) + '" stroke="' + c2 + '" stroke-width="' + f(o.w) + '" stroke-linecap="round"' + op + '/>';
      } else if (o.t === 'dot') {
        html += '<circle cx="' + f(o.p[0]) + '" cy="' + f(o.p[1]) + '" r="' + f(o.r) + '" fill="' + (o.c || silC) + '"' + op + '/>';
      } else if (o.t === 'joint') {
        html += '<circle cx="' + f(o.p[0]) + '" cy="' + f(o.p[1]) + '" r="' + f(o.r) + '" fill="#fff" stroke="' + boneC + '" stroke-width="1.6"/>';
      } else if (o.t === 'head') {
        if (o.hollow) html += '<circle cx="' + f(o.p[0]) + '" cy="' + f(o.p[1]) + '" r="' + f(o.r) + '" fill="none" stroke="' + boneC + '" stroke-width="1.6"/>';
        else html += headSVG(o, silC, style.opacity);
      }
    });
    g.innerHTML = html;
  }
  function f(n) { return Math.round(n * 10) / 10; }

  // ---------- Canvas 繪製 ----------
  function renderCanvas(ctx, list, style) {
    style = style || {};
    var silC = style.silColor || '#1c251f';
    ctx.lineCap = 'round';
    list.forEach(function (o) {
      if (o.t === 'line' || o.t === 'torso') {
        ctx.strokeStyle = o.kind === 'bone' ? (style.boneColor || '#eb6834') : (canvasFill(ctx, o.c, o) || silC);
        ctx.lineWidth = o.w;
        ctx.beginPath();
        if (o.t === 'torso') { ctx.moveTo(o.a[0], o.a[1] + o.w * 0.12); ctx.lineTo(o.b[0], o.b[1] - o.w * 0.05); }
        else { ctx.moveTo(o.a[0], o.a[1]); ctx.lineTo(o.b[0], o.b[1]); }
        ctx.stroke();
      } else if (o.t === 'dot' || o.t === 'joint') {
        ctx.fillStyle = o.t === 'joint' ? '#fff' : (o.c || silC);
        ctx.beginPath(); ctx.arc(o.p[0], o.p[1], o.r, 0, Math.PI * 2); ctx.fill();
      } else if (o.t === 'head') {
        headCanvas(ctx, o, silC);
      }
    });
  }

  global.PersonModel = {
    BASE: BASE, makePerson: makePerson, joints: joints, project: project,
    parts: parts, renderSVG: renderSVG, renderCanvas: renderCanvas, NS: NS, OUTFITS: OUTFITS
  };
})(window);
