/* geom.js — 攝影機幾何：由架設高度、俯角、視角、解析度推算人形與臉部像素
   針孔模型；地面為平面；人站立；臉寬約 0.15 m、身高可調。 */
(function (global) {
  'use strict';
  var D2R = Math.PI / 180;

  /** cam: {H 架高 m, pitch 俯角 deg, hfov deg, W px, Hpx px}; person: {d 水平距離 m, h 身高 m, lateral 側向偏移 m} */
  function measure(cam, person) {
    var aspect = cam.W / cam.Hpx;
    var fx = (cam.W / 2) / Math.tan(cam.hfov / 2 * D2R);
    var vfov = 2 * Math.atan(Math.tan(cam.hfov / 2 * D2R) / aspect);
    var fy = fx; // 方形像素
    var th = cam.pitch * D2R;
    function yOf(zUp) { // zUp: 該點離地高度
      var a = Math.atan2(cam.H - zUp, person.d); // 俯角
      return cam.Hpx / 2 + fy * Math.tan(a - th);
    }
    var yFeet = yOf(0), yHead = yOf(person.h), yEye = yOf(person.h - 0.11);
    var personPx = yFeet - yHead;
    var slant = Math.sqrt(person.d * person.d + Math.pow(cam.H - (person.h - 0.11), 2));
    // 臉部：以光軸方向距離近似
    var faceDepress = Math.atan2(cam.H - (person.h - 0.11), person.d) / D2R;
    var depth = slant * Math.cos(faceDepress * D2R - th);
    var faceW = fx * 0.15 / depth;
    var eyeDist = fx * 0.063 / depth;
    var ppm = fx / depth; // 每公尺像素（臉部附近）
    var inFrame = yHead >= 0 && yFeet <= cam.Hpx;
    var partial = !inFrame && yHead < cam.Hpx && yFeet > 0;
    return {
      personPx: personPx, faceW: faceW, eyeDist: eyeDist, ppm: ppm, faceDepress: faceDepress,
      yFeet: yFeet, yHead: yHead, inFrame: inFrame, partial: partial, vfov: vfov / D2R, fx: fx
    };
  }

  /** 地面上可見範圍（近端、遠端水平距離） */
  function groundRange(cam) {
    var aspect = cam.W / cam.Hpx;
    var vfov = 2 * Math.atan(Math.tan(cam.hfov / 2 * D2R) / aspect);
    var th = cam.pitch * D2R;
    var nearA = th + vfov / 2, farA = th - vfov / 2;
    var near = cam.H / Math.tan(Math.min(nearA, 89.9 * D2R));
    var far = farA <= 0 ? Infinity : cam.H / Math.tan(farA);
    return { near: near, far: far, vfov: vfov / D2R };
  }

  global.Geom = { measure: measure, groundRange: groundRange };
})(window);
