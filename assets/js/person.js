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
    var U = global.UNIFORM || { top: '#4f5c30', topDark: '#3c4723', pants: '#4a5530', pantsDark: '#353e22', boot: '#24221d', skin: '#c99b78', cap: '#3f4a26' };

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
    var limbW = H * 0.062, legW = H * 0.078, torsoW = H * 0.19;
    // 後側肢體（深度較遠）顏色加深，讓 RGB 圖看得出前後
    function col(front, back, depth) { return sil ? null : (depth > 0 ? back : front); }
    var lDepth = P.lHip[2] - P.rHip[2];

    ['l', 'r'].forEach(function (sd) {
      var dz = sd === 'l' ? lDepth : -lDepth;
      var pc = col(U.pants, U.pantsDark, dz), tc = col(U.top, U.topDark, dz);
      seg(sd + 'Hip', sd + 'Knee', legW, pc, 'leg');
      seg(sd + 'Knee', sd + 'Ankle', legW * 0.85, pc, 'leg');
      seg(sd + 'Ankle', sd + 'Toe', legW * 0.7, sil ? null : U.boot, 'boot', 0.0005);
      seg(sd + 'Sho', sd + 'Elb', limbW, tc, 'arm');
      seg(sd + 'Elb', sd + 'Wri', limbW * 0.9, tc, 'arm');
      out.push({ t: 'dot', p: P[sd + 'Wri'], r: limbW * 0.42, c: sil ? null : U.skin, z: P[sd + 'Wri'][2] + 0.0001 });
    });
    // 軀幹：肩到髖的四邊形
    var cx = (P.lSho[0] + P.rSho[0]) / 2;
    var torsoPoly = [P.lSho, P.rSho, P.rHip, P.lHip];
    var tw = Math.max(torsoW * 0.62, Math.abs(P.lSho[0] - P.rSho[0]));
    out.push({ t: 'torso', a: P.neck, b: P.pelvis, w: tw, poly: torsoPoly, c: sil ? null : U.top, z: P.neck[2], cx: cx });
    out.push({ t: 'line', a: P.pelvis, b: [P.pelvis[0], P.pelvis[1] - H * 0.02, P.pelvis[2]], w: tw * 0.95, c: sil ? null : U.pants, kind: 'hip', z: P.pelvis[2] });
    // 頭與帽
    out.push({ t: 'head', p: P.head, r: J.headR * s, c: sil ? null : U.skin, cap: sil ? null : U.cap, z: P.head[2] + 0.002 });
    return out.sort(byZ);
  }
  function byZ(a, b) { return a.z - b.z; }

  // ---------- SVG 繪製 ----------
  var NS = 'http://www.w3.org/2000/svg';
  function renderSVG(g, list, style) {
    style = style || {};
    var silC = style.silColor || '#1c251f';
    var boneC = style.boneColor || '#eb6834';
    var html = '';
    list.forEach(function (o) {
      if (o.t === 'line') {
        var c = o.kind === 'bone' ? boneC : (o.c || silC);
        html += '<line x1="' + f(o.a[0]) + '" y1="' + f(o.a[1]) + '" x2="' + f(o.b[0]) + '" y2="' + f(o.b[1]) + '" stroke="' + c + '" stroke-width="' + f(o.w) + '" stroke-linecap="round"' + (style.opacity ? ' opacity="' + style.opacity + '"' : '') + '/>';
      } else if (o.t === 'torso') {
        var c2 = o.c || silC;
        html += '<line x1="' + f(o.a[0]) + '" y1="' + f(o.a[1] + o.w * 0.12) + '" x2="' + f(o.b[0]) + '" y2="' + f(o.b[1] - o.w * 0.05) + '" stroke="' + c2 + '" stroke-width="' + f(o.w) + '" stroke-linecap="round"' + (style.opacity ? ' opacity="' + style.opacity + '"' : '') + '/>';
      } else if (o.t === 'dot') {
        html += '<circle cx="' + f(o.p[0]) + '" cy="' + f(o.p[1]) + '" r="' + f(o.r) + '" fill="' + (o.c || silC) + '"' + (style.opacity ? ' opacity="' + style.opacity + '"' : '') + '/>';
      } else if (o.t === 'joint') {
        html += '<circle cx="' + f(o.p[0]) + '" cy="' + f(o.p[1]) + '" r="' + f(o.r) + '" fill="#fff" stroke="' + boneC + '" stroke-width="1.6"/>';
      } else if (o.t === 'head') {
        if (o.hollow) {
          html += '<circle cx="' + f(o.p[0]) + '" cy="' + f(o.p[1]) + '" r="' + f(o.r) + '" fill="none" stroke="' + boneC + '" stroke-width="1.6"/>';
        } else {
          html += '<circle cx="' + f(o.p[0]) + '" cy="' + f(o.p[1]) + '" r="' + f(o.r) + '" fill="' + (o.c || silC) + '"' + (style.opacity ? ' opacity="' + style.opacity + '"' : '') + '/>';
          // 帽子：上半圓 + 帽簷
          var capC = o.cap || silC;
          html += '<path d="M' + f(o.p[0] - o.r * 1.04) + ' ' + f(o.p[1] - o.r * 0.12) + ' A' + f(o.r * 1.04) + ' ' + f(o.r * 1.04) + ' 0 0 1 ' + f(o.p[0] + o.r * 1.04) + ' ' + f(o.p[1] - o.r * 0.12) + ' L' + f(o.p[0] + o.r * 1.55) + ' ' + f(o.p[1] - o.r * 0.05) + ' L' + f(o.p[0] - o.r * 1.04) + ' ' + f(o.p[1] - o.r * 0.05) + 'Z" fill="' + capC + '"' + (style.opacity ? ' opacity="' + style.opacity + '"' : '') + '/>';
        }
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
        ctx.strokeStyle = o.kind === 'bone' ? (style.boneColor || '#eb6834') : (o.c || silC);
        ctx.lineWidth = o.w;
        ctx.beginPath();
        if (o.t === 'torso') { ctx.moveTo(o.a[0], o.a[1] + o.w * 0.12); ctx.lineTo(o.b[0], o.b[1] - o.w * 0.05); }
        else { ctx.moveTo(o.a[0], o.a[1]); ctx.lineTo(o.b[0], o.b[1]); }
        ctx.stroke();
      } else if (o.t === 'dot' || o.t === 'joint') {
        ctx.fillStyle = o.t === 'joint' ? '#fff' : (o.c || silC);
        ctx.beginPath(); ctx.arc(o.p[0], o.p[1], o.r, 0, Math.PI * 2); ctx.fill();
      } else if (o.t === 'head') {
        ctx.fillStyle = o.c || silC;
        ctx.beginPath(); ctx.arc(o.p[0], o.p[1], o.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = o.cap || silC;
        ctx.beginPath(); ctx.arc(o.p[0], o.p[1] - o.r * 0.12, o.r * 1.04, Math.PI, 0); ctx.lineTo(o.p[0] + o.r * 1.55, o.p[1] - o.r * 0.05); ctx.lineTo(o.p[0] - o.r * 1.04, o.p[1] - o.r * 0.05); ctx.fill();
      }
    });
  }

  global.PersonModel = {
    BASE: BASE, makePerson: makePerson, joints: joints, project: project,
    parts: parts, renderSVG: renderSVG, renderCanvas: renderCanvas, NS: NS
  };
})(window);
