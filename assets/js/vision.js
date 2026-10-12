/* ============================================================
   Shop Manager — Vision Engine v2 (تحلیل هوشمند تصویر، آفلاین)
   ۱۰۰٪ روی مرورگر — بدون سرور، بدون API و بدون هزینه.

   روش کار:
   ۱) پس‌زمینه با پرکردن سیل‌آسا از حاشیه جدا می‌شود (سوژه = آنچه می‌ماند)
   ۲) ویژگی‌های هندسی (شکل، تقارن، گردن، حفره، بافت) و رنگی استخراج می‌شود
   ۳) هر دسته‌بندی «دروازه» + «امتیاز وزنی» دارد و در نهایت با softmax
      به درصد اطمینان تبدیل می‌شود.
   ============================================================ */
(function (root) {
  'use strict';
  var Shop = (root.Shop = root.Shop || {});
  var U = Shop.U;

  function lum(r, g, b) { return 0.299 * r + 0.587 * g + 0.114 * b; }
  function medians(arr) {
    var a = arr.slice().sort(function (x, y) { return x - y; }), m = a.length >> 1;
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  }
  function avg(arr) { var s = 0; for (var i = 0; i < arr.length; i++) s += arr[i]; return arr.length ? s / arr.length : 0; }

  /* ============ ۱) قالب‌های هندسی (Shape Templates) ============
     برای هر ردیف از جعبه‌ی احاطه‌کننده، «نیم‌عرض» قالب را برمی‌گرداند
     (نسبت به پهنای کل). v = پیشرفت عمودی ۰ تا ۱
  ============================================================ */
  var TEMPLATES = {
    rect: function () { return 0.5; },
    ellipse: function (v) { var d = (v - 0.5) / 0.5; return 0.5 * Math.sqrt(Math.max(0, 1 - d * d)); },
    bottle: function (v) {
      if (v < 0.2) return 0.135;
      if (v < 0.46) return 0.135 + (v - 0.2) / 0.26 * 0.365;
      return 0.5;
    },
    jar: function (v) {
      if (v < 0.14) return 0.3;
      if (v < 0.34) return 0.3 + (v - 0.14) / 0.2 * 0.2;
      return 0.5;
    },
    cone: function (v) { return 0.1 + 0.4 * Math.pow(v, 0.75); },
    coneInv: function (v) { return 0.5 - 0.32 * Math.pow(v, 0.9); }
  };
  TEMPLATES.rrect1 = function (v) { return roundRectHalf(v, 0.1); };
  TEMPLATES.rrect3 = function (v) { return roundRectHalf(v, 0.3); };
  function roundRectHalf(v, r) {
    if (v < r) return 0.5 - r + Math.sqrt(Math.max(0, r * r - (r - v) * (r - v)));
    if (v > 1 - r) return 0.5 - r + Math.sqrt(Math.max(0, r * r - (v - (1 - r)) * (v - (1 - r))));
    return 0.5;
  }
  var TNAMES = {
    rect: 'مستطیلی', rrect1: 'لبه‌گرد', rrect3: 'کپسولی', ellipse: 'گرد',
    bottle: 'بطری‌شکل', jar: 'شیشه‌ای', cone: 'مخروطی', coneInv: 'قیفی'
  };

  /* تشابه قالب‌ها با سایه‌ی واقعی (IoU روی ردیف‌ها حول مرکز) */
  function templateIoUs(rowSpan, bw, bh) {
    var out = {}, cx = (bw - 1) / 2, names = Object.keys(TEMPLATES), t, y;
    for (t = 0; t < names.length; t++) out[names[t]] = { inter: 0, uni: 0 };
    for (y = 0; y < bh; y++) {
      var span = rowSpan[y];
      if (!span) continue;
      var v = (y + 0.5) / bh;
      for (t = 0; t < names.length; t++) {
        var half = TEMPLATES[names[t]](v) * bw;
        if (half < 0.5) continue;
        var lo = cx - half, hi = cx + half;
        var inter = Math.max(0, Math.min(span.r, hi) - Math.max(span.l, lo) + 1);
        out[names[t]].inter += inter;
        out[names[t]].uni += (span.r - span.l + 1) + (hi - lo + 1) - inter;
      }
    }
    var iou = {};
    for (t = 0; t < names.length; t++) {
      var o = out[names[t]];
      iou[names[t]] = o.uni > 0 ? U.clamp(o.inter / o.uni, 0, 1) : 0;
    }
    return iou;
  }

  /* ============ ۲) استخراج ویژگی‌ها ============ */
  function features(pix, w, h, opts) {
    opts = opts || {};
    if (w < 4 || h < 4) return null;
    var i, x, y, k, o;

    /* رنگ پس‌زمینه = میانه‌ی حاشیه */
    var bR = [], bG = [], bB = [], bL = [];
    for (x = 0; x < w; x++) {
      o = x * 4; bR.push(pix[o]); bG.push(pix[o + 1]); bB.push(pix[o + 2]); bL.push(lum(pix[o], pix[o + 1], pix[o + 2]));
      o = ((h - 1) * w + x) * 4; bR.push(pix[o]); bG.push(pix[o + 1]); bB.push(pix[o + 2]); bL.push(lum(pix[o], pix[o + 1], pix[o + 2]));
    }
    for (y = 0; y < h; y++) {
      o = (y * w) * 4; bR.push(pix[o]); bG.push(pix[o + 1]); bB.push(pix[o + 2]); bL.push(lum(pix[o], pix[o + 1], pix[o + 2]));
      o = (y * w + w - 1) * 4; bR.push(pix[o]); bG.push(pix[o + 1]); bB.push(pix[o + 2]); bL.push(lum(pix[o], pix[o + 1], pix[o + 2]));
    }
    var bg = { r: medians(bR), g: medians(bG), b: medians(bB) };
    var bgMeanL = avg(bL);
    var bgStd = Math.sqrt(avg(bL.map(function (v) { return Math.pow(v - bgMeanL, 2); })));
    var bgTol = U.clamp(32 + bgStd * 1.1, 32, 92);

    var bgMask = new Uint8Array(w * h), segmented = !opts.noSeg;
    if (!opts.noSeg) {
      var isBg = function (o2) {
        var dr = pix[o2] - bg.r, dg = pix[o2 + 1] - bg.g, db = pix[o2 + 2] - bg.b;
        return Math.sqrt(dr * dr + dg * dg + db * db) < bgTol;
      };
      var stack = [], guard = 0;
      for (x = 0; x < w; x++) { stack.push(x, 0, x, h - 1); }
      for (y = 0; y < h; y++) { stack.push(0, y, w - 1, y); }
      while (stack.length && guard++ < w * h * 5) {
        var py = stack.pop(), px = stack.pop(), kk = py * w + px;
        if (bgMask[kk] || !isBg(kk * 4)) continue;
        bgMask[kk] = 1;
        if (px > 0) stack.push(px - 1, py);
        if (px < w - 1) stack.push(px + 1, py);
        if (py > 0) stack.push(px, py - 1);
        if (py < h - 1) stack.push(px, py + 1);
      }
    }

    var fg = new Uint8Array(w * h), fgCount = 0;
    var minX = w, maxX = -1, minY = h, maxY = -1;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      k = y * w + x;
      if (!bgMask[k]) {
        fg[k] = 1; fgCount++;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
    if (!fgCount) return null;
    var bw = Math.max(1, maxX - minX + 1), bh = Math.max(1, maxY - minY + 1);
    var fill = fgCount / (bw * bh), ar = bh / bw, subjectRatio = fgCount / (w * h);

    /* پروفایل ردیف/ستون */
    var rowW = new Array(bh), rowSpan = new Array(bh);
    for (y = 0; y < bh; y++) {
      var c = 0, l = -1, r = -1;
      for (x = 0; x < bw; x++) if (fg[(minY + y) * w + (minX + x)]) { c++; if (l < 0) l = x; r = x; }
      rowW[y] = c; rowSpan[y] = c ? { l: l, r: r } : null;
    }
    var maxW = Math.max.apply(null, rowW) || 1;
    function rowAt(p) { return rowW[U.clamp(Math.round((bh - 1) * p), 0, bh - 1)] / maxW; }
    var neck = rowAt(0.05), topW = rowAt(0.1), botW = rowAt(0.9), midW = rowAt(0.5);
    /* کمر = باریک‌ترین مقطع «بدنه» (پایین‌تر از شانه‌ها) */
    var waist = 1;
    for (y = Math.round(bh * 0.4); y <= Math.round(bh * 0.9); y++) waist = Math.min(waist, rowW[y] / maxW);
    var belly = 0;
    for (y = Math.round(bh * 0.2); y <= Math.round(bh * 0.8); y++) belly = Math.max(belly, rowW[y] / maxW);
    var rowVar = 0;
    for (y = 1; y < bh; y++) rowVar += Math.abs(rowW[y] - rowW[y - 1]);
    rowVar = (rowVar / Math.max(1, bh >> 2)) / maxW;

    /* دیواره‌های صاف */
    var tolSide = Math.max(1, bw * 0.06), tolCap = Math.max(1, bh * 0.06);
    var lf = 0, rf = 0, tf = 0, bf = 0, rowsN = 0;
    var minYs = new Array(bw).fill(h), maxYs = new Array(bw).fill(-1);
    for (y = 0; y < bh; y++) {
      var sp = rowSpan[y]; if (!sp) continue;
      rowsN++;
      if (sp.l <= tolSide) lf++;
      if (sp.r >= bw - 1 - tolSide) rf++;
      for (x = sp.l; x <= sp.r; x++) { if (y < minYs[x]) minYs[x] = y; if (y > maxYs[x]) maxYs[x] = y; }
    }
    for (x = 0; x < bw; x++) {
      if (minYs[x] >= h) continue;
      if (minYs[x] <= tolCap) tf++;
      if (maxYs[x] >= bh - 1 - tolCap) bf++;
    }
    var sideFlat = rowsN ? (lf + rf) / (2 * rowsN) : 0;
    var capFlat = bw ? (tf + bf) / (2 * bw) : 0;
    var straightness = Math.max(sideFlat, capFlat);
    var curviness = 1 - straightness;

    /* تقارن */
    var same = 0, diff = 0;
    for (y = 0; y < bh; y++) for (x = 0; x < Math.floor(bw / 2); x++) {
      var a2 = fg[(minY + y) * w + (minX + x)], b2 = fg[(minY + y) * w + (minX + bw - 1 - x)];
      if (a2 && b2) same++; else if (a2 || b2) diff++;
    }
    var sym = same + diff ? same / (same + diff) : 0;

    /* اشتراک لبه‌ی جعبه */
    var edgeHit = 0, edgeTot = 0;
    for (x = 0; x < bw; x++) {
      edgeTot += 2;
      if (fg[minY * w + minX + x]) edgeHit++;
      if (fg[maxY * w + minX + x]) edgeHit++;
    }
    for (y = 1; y < bh - 1; y++) {
      edgeTot += 2;
      if (fg[(minY + y) * w + minX]) edgeHit++;
      if (fg[(minY + y) * w + maxX]) edgeHit++;
    }
    var borderOcc = edgeHit / Math.max(1, edgeTot);

    /* گوشه‌ها */
    var cr = Math.max(2, Math.round(Math.min(bw, bh) * 0.16)), cf = 0, cfT = 0;
    [[minX, minY], [maxX - cr + 1, minY], [minX, maxY - cr + 1], [maxX - cr + 1, maxY - cr + 1]].forEach(function (p) {
      for (y = 0; y < cr; y++) for (x = 0; x < cr; x++) {
        var xx = p[0] + x, yy = p[1] + y;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        cfT++; if (fg[yy * w + xx]) cf++;
      }
    });
    var cornerFill = cfT ? cf / cfT : 0;

    /* حفره‌ها */
    var innerBg = 0, holes = 0, seen = new Uint8Array(w * h);
    for (y = minY; y <= maxY; y++) for (x = minX; x <= maxX; x++) {
      k = y * w + x;
      if (fg[k] || seen[k] || bgMask[k]) continue;
      var st = [x, y], cnt = 0, g2 = 0;
      while (st.length && g2++ < 40000) {
        var yy2 = st.pop(), xx2 = st.pop(), kk2 = yy2 * w + xx2;
        if (xx2 < minX || yy2 < minY || xx2 > maxX || yy2 > maxY) continue;
        if (seen[kk2] || fg[kk2] || bgMask[kk2]) continue;
        seen[kk2] = 1; cnt++;
        st.push(xx2 - 1, yy2, xx2 + 1, yy2, xx2, yy2 - 1, xx2, yy2 + 1);
      }
      if (cnt > 6) { holes++; innerBg += cnt; }
    }

    /* لبه، بافت، سایه‌ی استوانه‌ای، براقیت */
    var gray = new Float32Array(w * h);
    for (i = 0; i < w * h; i++) gray[i] = lum(pix[i * 4], pix[i * 4 + 1], pix[i * 4 + 2]);
    var mags = [], edgeN = 0, hiEdge = 0;
    var colSum = new Float64Array(bw), colCnt = new Float64Array(bw);
    var glint = 0, veryBright = 0;
    for (y = minY; y <= maxY; y++) {
      for (x = minX; x <= maxX; x++) {
        k = y * w + x; if (!fg[k]) continue;
        colSum[x - minX] += gv0(k); colCnt[x - minX]++;
      }
    }
    function gv0(kk) { return gray[kk]; }
    for (y = minY + 1; y < maxY; y++) for (x = minX + 1; x < maxX; x++) {
      if (!fg[y * w + x]) continue;
      var gx = gray[(y - 1) * w + x + 1] + 2 * gray[y * w + x + 1] + gray[(y + 1) * w + x + 1]
        - gray[(y - 1) * w + x - 1] - 2 * gray[y * w + x - 1] - gray[(y + 1) * w + x - 1];
      var gy2 = gray[(y + 1) * w + x - 1] + 2 * gray[(y + 1) * w + x] + gray[(y + 1) * w + x + 1]
        - gray[(y - 1) * w + x - 1] - 2 * gray[(y - 1) * w + x] - gray[(y - 1) * w + x + 1];
      var mag = Math.sqrt(gx * gx + gy2 * gy2);
      edgeN++; mags.push(mag);
      if (mag > 55) hiEdge++;
    }
    var magStep = Math.max(1, Math.ceil(mags.length / 5000));
    var sampled = mags.filter(function (_, ii) { return ii % magStep === 0; });
    var meanMag = avg(sampled);
    var stdMag = Math.sqrt(avg(sampled.map(function (v) { return Math.pow(v - meanMag, 2); })));
    var edgeDensity = edgeN ? hiEdge / edgeN : 0;
    var edgeStrength = U.clamp(meanMag / 120, 0, 1);
    var texture = U.clamp(stdMag / 120, 0, 1);

    /* پروفایل روشنایی ستون → تشخیص سطح منحنی (استوانه/کره) */
    var prof = [];
    for (x = 0; x < bw; x++) if (colCnt[x] > 1) prof.push(colSum[x] / colCnt[x]);
    var cylShade = 0;
    if (prof.length > 6) {
      var pm = avg(prof);
      var pd = Math.sqrt(avg(prof.map(function (v) { return Math.pow(v - pm, 2); })));
      if (pd > 3) {
        var qs = [], n2 = prof.length;
        for (i = 0; i < n2; i++) { var u = (i + 0.5) / n2; qs.push(Math.sqrt(Math.max(0, 1 - Math.pow(2 * u - 1, 2)))); }
        var qm = avg(qs);
        var qd = Math.sqrt(avg(qs.map(function (v) { return Math.pow(v - qm, 2); })));
        var cov = 0;
        for (i = 0; i < n2; i++) cov += (prof[i] - pm) * (qs[i] - qm);
        cylShade = U.clamp((cov / (n2 * Math.max(1e-6, pd * qd))), 0, 1);
      }
    }

    /* رنگ */
    var sr = 0, sg = 0, sb = 0, sS = 0, sV = 0, colorfulness = 0, lums = [], hist = {};
    for (y = minY; y <= maxY; y++) for (x = minX; x <= maxX; x++) {
      k = y * w + x; if (!fg[k]) continue;
      o = k * 4;
      var r = pix[o], g = pix[o + 1], b3 = pix[o + 2];
      sr += r; sg += g; sb += b3;
      var mx = Math.max(r, g, b3), mn = Math.min(r, g, b3);
      colorfulness += (mx - mn) / 255;
      sV += mx / 255;
      sS += mx ? (mx - mn) / mx : 0;
      lums.push(lum(r, g, b3));
      var q = ((r >> 4) << 8) | ((g >> 4) << 4) | (b3 >> 4);
      hist[q] = (hist[q] || 0) + 1;
    }
    var mR = sr / fgCount, mG = sg / fgCount, mB = sb / fgCount;
    var meanLum = avg(lums);
    var contrast = Math.sqrt(avg(lums.map(function (v) { return Math.pow(v - meanLum, 2); }))) / 255;

    var bins = Object.keys(hist).map(function (k3) {
      var q2 = +k3;
      return { r: (((q2 >> 8) & 15) << 4) + 8, g: (((q2 >> 4) & 15) << 4) + 8, b: ((q2 & 15) << 4) + 8, n: hist[k3] };
    }).sort(function (p, q3) { return q3.n - p.n; });
    var clusters = [];
    bins.forEach(function (bn) {
      for (var ci = 0; ci < clusters.length; ci++) {
        var cl = clusters[ci];
        if (U.colorDist(bn, cl) < 92) {
          var tot = cl.n + bn.n;
          cl.r = (cl.r * cl.n + bn.r * bn.n) / tot;
          cl.g = (cl.g * cl.n + bn.g * bn.n) / tot;
          cl.b = (cl.b * cl.n + bn.b * bn.n) / tot;
          cl.n = tot; return;
        }
      }
      clusters.push({ r: bn.r, g: bn.g, b: bn.b, n: bn.n });
    });
    clusters.sort(function (p, q3) { return q3.n - p.n; });
    var dominantPct = clusters.length ? clusters[0].n / fgCount : 1;
    clusters = clusters.slice(0, 5).map(function (cl) {
      return {
        hex: U.rgbToHex(cl.r, cl.g, cl.b), name: U.colorName({ r: cl.r, g: cl.g, b: cl.b }),
        pct: cl.n / fgCount, rgb: { r: cl.r, g: cl.g, b: cl.b }
      };
    });
    var domC = clusters[0] || { hex: U.rgbToHex(mR, mG, mB), name: U.colorName({ r: mR, g: mG, b: mB }), rgb: { r: mR, g: mG, b: mB } };
    var domHsv = U.rgbToHsv(domC.rgb.r, domC.rgb.g, domC.rgb.b);
    var colorVar = 0, cnt2 = 0, step2 = Math.max(1, Math.floor(fgCount / 3000));
    for (k = 0; k < w * h; k++) {
      if (!fg[k] || cnt2++ % step2) continue;
      o = k * 4;
      colorVar += Math.pow(pix[o] - mR, 2) + Math.pow(pix[o + 1] - mG, 2) + Math.pow(pix[o + 2] - mB, 2);
    }
    colorVar = cnt2 ? colorVar / (cnt2 * 3 * 255 * 255) : 0;

    /* تشابه قالب‌ها */
    var iou = templateIoUs(rowSpan, bw, bh);
    var bestShape = 'rect', bestIou = 0;
    Object.keys(iou).forEach(function (nm2) { if (iou[nm2] > bestIou) { bestIou = iou[nm2]; bestShape = nm2; } });
    var roundness = U.clamp(0.65 * iou.ellipse + 0.35 * band(fill, 0.7, 0.85, 0.18), 0, 1);
    var cylinder = U.clamp(0.42 * Math.max(iou.rrect1, iou.rrect3) + 0.28 * sideFlat + 0.16 * capFlat + 0.14 * cylShade, 0, 1);
    var boxy = U.clamp(0.5 * Math.max(iou.rect, iou.rrect1) + 0.3 * cornerFill + 0.2 * capFlat, 0, 1);
    /* بازتاب = پیکسل‌هایی که خیلی روشن‌تر از میانگین خود جنس‌اند (نورهای نقطه‌ای) */
    var lumStd = Math.sqrt(avg(lums.map(function (v) { return Math.pow(v - meanLum, 2); }))) || 0;
    var hiTh = Math.max(205, meanLum + 1.6 * lumStd);
    var spec = 0, sampled2 = 0;
    for (y = minY; y <= maxY; y++) for (x = minX; x <= maxX; x++) {
      k = y * w + x; if (!fg[k]) continue;
      sampled2++;
      if (gray[k] > hiTh) spec++;
    }
    var glintShare = sampled2 ? spec / sampled2 : 0;
    var glossiness = U.clamp(glintShare * 7, 0, 1);
    var uniformity = U.clamp(1 - colorVar * 3.2, 0, 1);

    return {
      w: w, h: h, bbox: { x: minX, y: minY, w: bw, h: bh }, segmented: segmented,
      ar: ar, fill: fill, borderOcc: borderOcc, cornerFill: cornerFill, sym: sym,
      neck: neck, topW: topW, botW: botW, midW: midW, waist: waist, belly: belly,
      rowVar: rowVar, sideFlat: sideFlat, capFlat: capFlat, straightness: straightness, curviness: curviness,
      holes: holes, holeArea: innerBg / fgCount,
      edgeDensity: edgeDensity, edgeStrength: edgeStrength, texture: texture,
      brightness: sV / fgCount, saturation: sS / fgCount, colorfulness: colorfulness / fgCount,
      contrast: contrast, meanRgb: U.rgbToHex(mR, mG, mB), colorVar: colorVar, uniformity: uniformity,
      glintShare: glintShare, glossiness: glossiness, cylShade: cylShade,
      domPct: dominantPct, domColor: domC.hex, domColorName: domC.name,
      domHue: domHsv.h, domSat: domHsv.s, domVal: domHsv.v,
      clusters: clusters, subjectRatio: subjectRatio, iou: iou,
      bestShape: bestShape, bestIou: bestIou, irregularity: 1 - bestIou,
      roundness: roundness, cylinder: cylinder, boxy: boxy,
      bgColor: U.rgbToHex(bg.r, bg.g, bg.b), bgLight: bgMeanL > 127, bgTol: bgTol
    };
  }

  /* ============ ۳) ابزارهای امتیازدهی ============ */
  function band(v, lo, hi, soft) {
    if (v >= lo && v <= hi) return 1;
    var d = v < lo ? lo - v : v - hi;
    return Math.max(0, 1 - d / (soft || 0.3));
  }
  function gt(v, t, soft) { return v >= t ? 1 : Math.max(0, 1 - (t - v) / (soft || 0.3)); }
  function lt(v, t, soft) { return v <= t ? 1 : Math.max(0, 1 - (v - t) / (soft || 0.3)); }
  function hueIn(h, a, b) { return a <= b ? (h >= a && h <= b) : (h >= a || h <= b); }
  function gate() {
    var m = 1;
    for (var i = 0; i < arguments.length; i++) m *= arguments[i];
    return U.clamp(m, 0.06, 1);
  }
  function maxv() { return Math.max.apply(null, arguments); }

  /* ============ ۴) دسته‌بندی: خانواده‌ی شکل + امتیاز رنگی/بافتی ============
     مرحله ۱) خانواده‌ی سیلوئت با argmax روی IoU قالب‌ها تعیین می‌شود (تصمیم قطعی)
     مرحله ۲) هر دسته فقط در خانواده‌های سازگار با خودش امتیاز کامل می‌گیرد
  ============================================================ */
  function familyOf(f) {
    var iou = f.iou, fam = 'irregular', best = 0;
    function take(name, val) { if (val > best) { best = val; fam = name; } }
    var rectish = Math.max(iou.rect, iou.rrect1, iou.rrect3);
    take('rectish', rectish);                                   /* جعبه/قوطی/کارتن/بسته */
    /* بطری/شیشه: گردن باریک + دیواره‌ی کناری صاف (هلال و کج‌شکل رد می‌شود) */
    take('bottle', iou.bottle * (f.neck < 0.8 ? 1 : 0.4) * (f.sideFlat > 0.4 ? 1 : 0.35));
    take('jar', iou.jar * (f.neck < 0.92 ? 1 : 0.35) * (f.sideFlat > 0.36 ? 1 : 0.35));
    take('sphere', iou.ellipse);
    take('cone', iou.cone);
    take('funnel', iou.coneInv);
    if (best < 0.86) return { fam: 'irregular', conf: 1 - best };
    return { fam: fam, conf: best };
  }

  function F(spec) { return function (f) { var v = f.fam ? (spec[f.fam] || 0.2) : 0.5; return v; }; }

  var C = [];

  /* --- نوشیدنی و بطری --- */
  C.push({
    key: 'bottle', name: 'نوشیدنی و بطری', short: 'نوشیدنی', unit: 'عدد', icon: '🥤',
    kw: ['نوشیدنی', 'آب', 'بطری', 'شربت', 'دوغ', 'آبمیوه', 'نوشابه', 'روغن', 'ماءالشعیر', 'شیر'],
    fam: F({ bottle: 1, jar: 0.62, rectish: 0.45, irregular: 0.3 }),
    gate: function (f) { return gate((f.domVal < 0.26 && f.domSat < 0.18) ? 0.45 : 1); },
    checks: function (f) {
      return [
        [0.3, gt(f.iou.bottle, 0.8, 0.26)], [0.18, band(f.ar, 1.2, 5, 0.5)],
        [0.16, gt(f.sym, 0.6, 0.3)], [0.14, lt(f.cornerFill, 0.65, 0.3)],
        [0.12, maxv(gt(f.cylShade, 0.3, 0.3), gt(f.glossiness, 0.25, 0.3))],
        [0.1, band(f.fill, 0.32, 0.93, 0.22)]
      ];
    },
    why: function (f) {
      var r = [];
      if (f.iou.bottle > 0.8) r.push('قالب بطری: گردن باریک + بدنه‌ی پهن');
      if (f.glossiness > 0.25 || f.cylShade > 0.3) r.push('سطح براق/منحنی بطری');
      return r;
    }
  });

  /* --- قوطی و کنسرو (استوانه) --- */
  C.push({
    key: 'can', name: 'قوطی و کنسرو', short: 'قوطی', unit: 'عدد', icon: '🥫',
    kw: ['قوطی', 'کنسرو', 'کمپوت', 'حبوبات', 'تن ماهی', 'رب', 'تن'],
    fam: F({ rectish: 1, jar: 0.7, bottle: 0.35, irregular: 0.35 }),
    checks: function (f) {
      return [
        [0.26, gt(f.cylinder, 0.8, 0.24)], [0.22, gt(f.capFlat, 0.7, 0.3)],
        [0.2, maxv(gt(f.cylShade, 0.38, 0.3), gt(f.glossiness, 0.3, 0.3))],
        [0.16, gt(f.sideFlat, 0.66, 0.3)], [0.16, band(f.ar, 1.0, 2.6, 0.5)]
      ];
    },
    why: function (f) {
      var r = [];
      if (f.sideFlat > 0.66) r.push('دیواره‌های کناری صاف و موازی');
      if (f.cylShade > 0.38) r.push('سایه‌روشن استوانه‌ای');
      if (f.glossiness > 0.3) r.push('بازتاب فلزی');
      return r;
    }
  });

  /* --- ظرف و شیشه --- */
  C.push({
    key: 'jar', name: 'ظرف و شیشه', short: 'ظرف', unit: 'عدد', icon: '🫙',
    kw: ['شیشه', 'ظرف', 'مربا', 'عسل', 'ترشی', 'ادویه', 'سرکه', 'سس', 'خامه'],
    fam: F({ jar: 1, bottle: 0.8, rectish: 0.8, sphere: 0.35 }),
    gate: function (f) { return gate((f.domVal < 0.26 && f.domSat < 0.18) ? 0.5 : 1); },
    checks: function (f) {
      return [
        [0.32, gt(f.iou.jar, 0.78, 0.28)], [0.2, band(f.neck, 0.3, 0.92, 0.25)],
        [0.18, gt(f.waist, 0.72, 0.25)], [0.16, gt(f.curviness, 0.3, 0.3)],
        [0.14, maxv(gt(f.cylShade, 0.3, 0.3), gt(f.glossiness, 0.28, 0.3))]
      ];
    },
    why: function (f) {
      var r = [];
      if (f.iou.jar > 0.78) r.push('دهانه‌ی کمی باریک با بدنه‌ی پهن');
      if (f.waist > 0.72) r.push('بدنه‌ی یکنواخت');
      return r;
    }
  });

  /* --- بسته‌بندی و جعبه (مقوا/کارتن) --- */
  C.push({
    key: 'box', name: 'بسته‌بندی و جعبه', short: 'بسته', unit: 'عدد', icon: '📦',
    kw: ['جعبه', 'بسته', 'کارتن', 'پاکت', 'بسته‌بندی', 'زعفران', 'چای', 'پودر', 'شکر'],
    fam: F({ rectish: 1, irregular: 0.45 }),
    gate: function (f) { return gate(lt(f.glossiness, 0.4, 0.3), gt(f.domVal, 0.3, 0.3), lt(f.colorfulness, 0.34, 0.3)); },
    checks: function (f) {
      return [
        [0.28, gt(f.boxy, 0.8, 0.24)], [0.2, gt(f.cornerFill, 0.3, 0.3)],
        [0.16, gt(f.capFlat, 0.58, 0.3)], [0.14, band(f.ar, 0.45, 2.2, 0.5)],
        [0.12, maxv(hueIn(f.domHue, 10, 60) ? 1 : 0.2, gt(f.edgeStrength, 0.22, 0.3))],
        [0.1, lt(f.glossiness, 0.3, 0.3)]
      ];
    },
    why: function (f) {
      var r = [];
      if (f.boxy > 0.8) r.push('چهارضلعی منظم با گوشه‌های پرشده');
      if (hueIn(f.domHue, 10, 60)) r.push('رنگ مقوایی/کاغذی');
      return r;
    }
  });

  /* --- میوه و سبزیجات (گرد) --- */
  C.push({
    key: 'fruit', name: 'میوه و سبزیجات', short: 'میوه', unit: 'کیلوگرم', icon: '🍎',
    kw: ['میوه', 'سبزی', 'سیب', 'پرتقال', 'نارنگی', 'گوجه', 'لیمو', 'انار', 'تازه', 'خیار', 'موز', 'هویج', 'سیب‌زمینی', 'پیاز'],
    fam: F({ sphere: 1, irregular: 0.55, funnel: 0.3, cone: 0.35 }),
    gate: function (f) { return gate(gt(f.saturation, 0.16, 0.25), lt(f.glossiness, 0.55, 0.3), lt(f.edgeStrength, 0.48, 0.25)); },
    checks: function (f) {
      return [
        [0.3, gt(f.roundness, 0.84, 0.18)], [0.2, gt(f.saturation, 0.28, 0.26)],
        [0.16, lt(f.sideFlat, 0.5, 0.3)], [0.14, lt(f.edgeDensity, 0.12, 0.2)],
        [0.1, gt(f.colorVar, 0.004, 0.02)], [0.1, band(f.fill, 0.58, 0.95, 0.22)]
      ];
    },
    why: function (f) {
      var r = [];
      if (f.roundness > 0.84) r.push('سایه‌ی گرد و پرحجم');
      if (f.saturation > 0.28) r.push('رنگ زنده و طبیعی');
      if (f.sideFlat < 0.5) r.push('بدون دیواره‌ی صاف (شکل مدور)');
      return r;
    }
  });

  /* --- میوه/سبزی کشیده --- */
  C.push({
    key: 'produce', name: 'میوه و سبزیجات', short: 'میوه', unit: 'کیلوگرم', icon: '🥕',
    kw: ['موز', 'خیار', 'هویج', 'بادمجان', 'کدو', 'فلفل', 'کلم', 'سبزی', 'لوبیا', 'ذرت'],
    fam: F({ irregular: 1, funnel: 0.65, cone: 0.55, sphere: 0.45 }),
    gate: function (f) {
      var elongated = f.ar > 1.3 || f.ar < 0.75;
      return gate((elongated ? 1 : 0.35), gt(f.saturation, 0.16, 0.3), lt(f.edgeDensity, 0.16, 0.2));
    },
    checks: function (f) {
      return [
        [0.32, gt(f.saturation, 0.26, 0.3)], [0.26, gt(f.irregularity, 0.08, 0.2)],
        [0.22, lt(f.sym, 0.94, 0.2)], [0.2, lt(f.edgeDensity, 0.1, 0.2)]
      ];
    },
    why: function () { return ['کشیدگی/انحنای طبیعی محصول تازه']; }
  });

  /* --- نان و شیرینی --- */
  C.push({
    key: 'bakery', name: 'نان و شیرینی', short: 'نان', unit: 'عدد', icon: '🍞',
    kw: ['نان', 'شیرینی', 'کیک', 'بیسکویت', 'کلوجه', 'خشکبار', 'تخمه', 'قهوه'],
    fam: F({ irregular: 1, sphere: 0.85, rectish: 0.3, funnel: 0.45 }),
    gate: function (f) {
      return gate((hueIn(f.domHue, 5, 62) ? 1 : 0.18), band(f.saturation, 0.06, 0.68, 0.25), lt(f.glossiness, 0.5, 0.3));
    },
    checks: function (f) {
      return [
        [0.3, hueIn(f.domHue, 15, 55) ? 1 : 0.25], [0.3, gt(f.edgeStrength, 0.26, 0.24)],
        [0.2, gt(f.texture, 0.2, 0.3)], [0.12, gt(f.irregularity, 0.04, 0.2)],
        [0.08, band(f.brightness, 0.26, 0.86, 0.25)]
      ];
    },
    why: function (f) {
      var r = [];
      if (hueIn(f.domHue, 15, 55)) r.push('رنگ طلایی/قهوه‌ای');
      if (f.edgeStrength > 0.24) r.push('بافت سطحی زبر');
      return r;
    }
  });

  /* --- مواد غذایی بسته‌بندی‌شده --- */
  C.push({
    key: 'packaged', name: 'مواد غذایی بسته‌بندی‌شده', short: 'بسته خوراکی', unit: 'عدد', icon: '🛒',
    kw: ['چیپس', 'پفک', 'شکلات', 'ماکارونی', 'برنج', 'روغن', 'خوراکی', 'بیسکویت', 'آدامس', 'نبات', 'آجیل'],
    fam: F({ rectish: 0.95, irregular: 0.75, jar: 0.65, sphere: 0.3 }),
    gate: function (f) { return gate(gt(f.colorfulness, 0.1, 0.22), gt(f.edgeDensity, 0.026, 0.06)); },
    checks: function (f) {
      return [
        [0.3, gt(f.edgeDensity, 0.055, 0.055)], [0.26, gt(f.colorfulness, 0.18, 0.25)],
        [0.18, lt(f.uniformity, 0.82, 0.3)], [0.14, maxv(gt(f.contrast, 0.18, 0.3), gt(f.glossiness, 0.3, 0.3))],
        [0.12, gt(f.fill, 0.55, 0.3)]
      ];
    },
    why: function (f) {
      var r = [];
      if (f.edgeDensity > 0.055) r.push('نوشته/طرح چاپی روی بسته');
      if (f.colorfulness > 0.18) r.push('رنگ‌بندی متنوع بسته');
      return r;
    }
  });

  /* --- کالای دیجیتال و برقی --- */
  C.push({
    key: 'electronics', name: 'کالای دیجیتال و برقی', short: 'کالای دیجیتال', unit: 'عدد', icon: '🔌',
    kw: ['دیجیتال', 'برقی', 'شارژر', 'کابل', 'هدفون', 'باتری', 'لامپ', 'سیم', 'پاوربانک', 'موس'],
    fam: F({ rectish: 1, bottle: 0.45, irregular: 0.85, sphere: 0.3 }),
    gate: function (f) {
      var dark = f.domVal < 0.5 && f.domSat < 0.55, gray = f.domSat < 0.22;
      return gate(((dark || gray) ? 1 : 0.15), lt(f.edgeDensity, 0.18, 0.2), lt(f.colorfulness, 0.26, 0.3));
    },
    checks: function (f) {
      return [
        [0.28, (f.domVal < 0.45 || f.domSat < 0.18) ? 1 : 0.25], [0.24, gt(f.edgeStrength, 0.18, 0.3)],
        [0.2, lt(f.edgeDensity, 0.1, 0.2)], [0.16, gt(f.glossiness, 0.15, 0.3)],
        [0.12, gt(f.fill, 0.45, 0.3)]
      ];
    },
    why: function (f) {
      var r = [];
      if (f.domVal < 0.45) r.push('رنگ تیره/مشکی');
      else if (f.domSat < 0.18) r.push('سطح بی‌رنگ و براق');
      if (f.glossiness > 0.15) r.push('بازتاب نور روی سطح');
      return r;
    }
  });

  /* --- ظروف و لوازم آشپزخانه --- */
  C.push({
    key: 'kitchen', name: 'ظروف و لوازم آشپزخانه', short: 'ظرف آشپزخانه', unit: 'عدد', icon: '🍽️',
    kw: ['بشقاب', 'قاشق', 'لیوان', 'قابلمه', 'آشپزخانه', 'چاقو', 'سیخ', 'سینی', 'پارچ'],
    fam: F({ sphere: 1, rectish: 0.75, jar: 0.65, irregular: 0.5 }),
    gate: function (f) { return gate(lt(f.saturation, 0.3, 0.3), gt(f.brightness, 0.2, 0.3), lt(f.colorfulness, 0.26, 0.3), (f.domVal < 0.24 && f.domSat > 0.3) ? 0.5 : 1); },
    checks: function (f) {
      return [
        [0.28, lt(f.saturation, 0.22, 0.3)], [0.24, gt(f.sym, 0.6, 0.3)],
        [0.24, maxv(gt(f.roundness, 0.7, 0.25), f.holes > 0 ? 1 : 0)],
        [0.24, gt(f.curviness, 0.28, 0.3)]
      ];
    },
    why: function (f) {
      var r = [];
      if (f.saturation < 0.22) r.push('رنگ خنثی و سطح فلزی/سفالی');
      if (f.holes > 0) r.push('دارای حفره/دسته');
      else if (f.roundness > 0.7) r.push('شکل مدور (بشقاب/سینی)');
      return r;
    }
  });

  /* --- کیف و چرم --- */
  C.push({
    key: 'leather', name: 'کیف و چرم', short: 'کیف', unit: 'عدد', icon: '👜',
    kw: ['کیف', 'چرم', 'کمربند', 'کفش', 'بند', 'جلد', 'دستکش'],
    fam: F({ irregular: 1, rectish: 0.5, sphere: 0.45, funnel: 0.5 }),
    gate: function (f) {
      return gate((hueIn(f.domHue, 5, 60) ? 1 : 0.2), lt(f.domVal, 0.8, 0.2), lt(f.edgeDensity, 0.14, 0.2));
    },
    checks: function (f) {
      return [
        [0.32, hueIn(f.domHue, 8, 52) ? 1 : 0.2], [0.24, band(f.brightness, 0.1, 0.68, 0.3)],
        [0.18, band(f.saturation, 0.08, 0.72, 0.25)], [0.14, gt(f.irregularity, 0.05, 0.2)],
        [0.12, lt(f.glossiness, 0.42, 0.3)]
      ];
    },
    why: function (f) { return hueIn(f.domHue, 8, 52) && f.domVal < 0.8 ? ['رنگ قهوه‌ای چرمی'] : ['بافت یکنواخت سطح']; }
  });

  /* --- پوشاک و پارچه --- */
  C.push({
    key: 'clothing', name: 'پوشاک و پارچه', short: 'پوشاک', unit: 'عدد', icon: '👕',
    kw: ['پوشاک', 'لباس', 'تی‌شرت', 'شلوار', 'جوراب', 'روسری', 'پارچه', 'ملحفه', 'حوله'],
    fam: F({ irregular: 1, funnel: 0.9, cone: 0.45, sphere: 0.3 }),
    gate: function (f) {
      return gate(lt(f.edgeDensity, 0.07, 0.2), lt(f.colorVar, 0.12, 0.2), lt(f.glossiness, 0.35, 0.3), lt(f.bestIou, 0.9, 0.1));
    },
    checks: function (f) {
      return [
        [0.32, lt(f.edgeDensity, 0.05, 0.2)], [0.28, lt(f.colorVar, 0.07, 0.2)],
        [0.24, lt(f.straightness, 0.66, 0.3)], [0.16, band(f.fill, 0.32, 0.9, 0.25)]
      ];
    },
    why: function (f) {
      var r = [];
      if (f.edgeDensity < 0.05) r.push('سطح یکدست و بدون جزئیات تیز');
      if (f.colorVar < 0.07) r.push('رنگ‌آمیزی کاملاً یکنواخت');
      if (f.straightness < 0.66) r.push('لبه‌های غیرهندسی (دوخت/چین)');
      return r;
    }
  });

  /* --- بهداشتی و آرایشی --- */
  C.push({
    key: 'cosmetic', name: 'بهداشتی و آرایشی', short: 'محصول بهداشتی', unit: 'عدد', icon: '🧴',
    kw: ['بهداشتی', 'آرایشی', 'کرم', 'شامپو', 'صابون', 'عطر', 'دستمال', 'مسواک', 'خمیردندان', 'دئودورانت'],
    fam: F({ rectish: 0.95, jar: 0.95, bottle: 0.85, sphere: 0.5, irregular: 0.45 }),
    gate: function (f) {
      return gate(gt(f.brightness, 0.4, 0.3), lt(f.colorfulness, 0.32, 0.3), lt(f.edgeStrength, 0.46, 0.3));
    },
    checks: function (f) {
      return [
        [0.26, gt(f.brightness, 0.58, 0.3)], [0.24, lt(f.edgeStrength, 0.26, 0.3)],
        [0.2, maxv(gt(f.cylShade, 0.28, 0.3), gt(f.glossiness, 0.28, 0.3), gt(f.iou.rrect3, 0.8, 0.25))],
        [0.16, gt(f.sym, 0.6, 0.3)], [0.14, band(f.saturation, 0.05, 0.66, 0.3)]
      ];
    },
    why: function (f) {
      var r = [];
      if (f.brightness > 0.58) r.push('رنگ روشن و سطح صاف بسته');
      if (f.cylShade > 0.28 || f.glossiness > 0.28) r.push('سطح منحنی یا براق');
      return r;
    }
  });

  /* --- لوازم‌التحریر و کتاب --- */
  C.push({
    key: 'stationery', name: 'لوازم‌التحریر و کتاب', short: 'لوازم‌التحریر', unit: 'عدد', icon: '📚',
    kw: ['دفتر', 'کتاب', 'خودکار', 'لوازم‌التحریر', 'کاغذ', 'مداد', 'پاک‌کن', 'پرونده'],
    fam: F({ rectish: 1, irregular: 0.4, sphere: 0.25 }),
    gate: function (f) {
      return gate(lt(f.saturation, 0.28, 0.3), gt(f.domVal, 0.7, 0.25), lt(f.colorfulness, 0.24, 0.3), lt(f.glossiness, 0.42, 0.3));
    },
    checks: function (f) {
      return [
        [0.3, gt(f.boxy, 0.76, 0.25)], [0.26, gt(f.domVal, 0.85, 0.2)],
        [0.22, lt(f.saturation, 0.16, 0.25)], [0.12, band(f.ar, 1.1, 1.8, 0.5)],
        [0.1, lt(f.edgeDensity, 0.09, 0.2)]
      ];
    },
    why: function (f) { return f.boxy > 0.76 ? ['مستطیل منظم با سطح کاغذی روشن'] : ['سطح روشن و کم‌رنگ']; }
  });

  function categorize(f) {
    f.fam = familyOf(f).fam;
    var famInfo = familyOf(f);
    var raw = C.map(function (cl) {
      var g = cl.gate ? cl.gate(f) : 1;
      var fw = cl.fam ? cl.fam(f) : 1;
      var checks = cl.checks(f), wsum = 0, ssum = 0;
      checks.forEach(function (c) { wsum += c[0]; ssum += c[0] * U.clamp(c[1], 0, 1); });
      return {
        key: cl.key, name: cl.name, short: cl.short, unit: cl.unit, icon: cl.icon, kw: cl.kw,
        family: fw,
        score: U.clamp((wsum ? ssum / wsum : 0) * g * fw, 0, 1),
        why: cl.why ? cl.why(f).slice(0, 3) : []
      };
    });
    var merged = [];
    raw.slice().sort(function (a, b) { return b.score - a.score; }).forEach(function (c) {
      var prev = merged.filter(function (m) { return m.name === c.name; })[0];
      if (prev) { if (c.score > prev.score) { prev.score = c.score; prev.why = c.why; prev.key = c.key; } return; }
      merged.push(c);
    });
    var ranked = merged.sort(function (a, b) { return b.score - a.score; });
    var top = ranked[0], second = ranked[1] || { score: 0 };
    var margin = top.score - second.score;
    var conf = U.clamp(top.score, 0, 1) * (0.4 + 0.6 * U.clamp(margin / 0.15, 0, 1));
    if (!f.segmented) conf *= 0.8;
    ranked.forEach(function (c, i) { c.share = i === 0 ? 1 : U.clamp(c.score / Math.max(0.01, top.score), 0, 1); });
    return {
      ranked: ranked, best: top, confidence: U.clamp(conf, 0, 0.97),
      margin: margin, ambiguous: margin < 0.06 || top.score < 0.45,
      family: famInfo.fam, familyConf: famInfo.conf
    };
  }

  /* ============ ۵) پیشنهاد نام/تگ/واحد ============ */
  function shapeWord(f) {
    if (f.bestIou < 0.66) return 'نامنظم';
    return TNAMES[f.bestShape] || 'متقارن';
  }

  function buildSuggestion(f, cat, dict) {
    var shape = shapeWord(f);
    var name = (cat.short + ' ' + f.domColorName + ' ' + shape).replace(/\s+/g, ' ').trim();
    var tags = U.uniq([f.domColorName, cat.name, shape].filter(Boolean));
    f.clusters.slice(1, 3).forEach(function (c) { if (c.pct > 0.12) tags.push(c.name); });
    if (f.holes > 0) tags.push('دسته‌دار');
    if (f.glossiness > 0.35) tags.push('براق');

    var categoryHint = null, bestScore = 0;
    (dict || []).forEach(function (c) {
      if (!c) return;
      var sc = 0, kws = c.keywords || [];
      cat.kw.forEach(function (k) {
        if (U.similarity(k, c.name) > 0.7) sc += 0.55;
        kws.forEach(function (kk) { if (U.similarity(k, kk) > 0.72) sc += 0.4; });
      });
      if (sc > bestScore) { bestScore = sc; categoryHint = c; }
    });
    return {
      name: name, tags: tags.slice(0, 6), unit: cat.unit, shape: shape,
      color: f.domColor, colorName: f.domColorName, palette: f.clusters,
      categoryId: categoryHint ? categoryHint.id : null,
      categoryName: categoryHint ? categoryHint.name : null,
      categoryScore: +bestScore.toFixed(2)
    };
  }

  function summarize(f, cat, sug) {
    var p = ['شکل: ' + (sug.shape || ''), 'رنگ غالب: ' + f.domColorName + ' (' + f.domColor + ')'];
    if (f.clusters[1] && f.clusters[1].pct > 0.12) p.push('رنگ دوم: ' + f.clusters[1].name);
    p.push('پرشدگی قاب: ' + U.toFa(Math.round(f.subjectRatio * 100)) + '٪');
    p.push(f.holes > 0 ? U.toFa(f.holes) + ' حفره/دسته' : 'بدون حفره داخلی');
    p.push('بافت: ' + (f.edgeStrength > 0.42 ? 'پرجزئیات' : f.edgeStrength > 0.22 ? 'متوسط' : 'صاف'));
    if (f.cylShade > 0.4) p.push('سطح منحنی/استوانه‌ای');
    if (f.glossiness > 0.3) p.push('سطح براق');
    return p.join(' • ');
  }

  /* ============ ۵ب) پایپ‌لاین تصویر → گزارش ============ */
  function analyzePixels(pix, w, h, opts) {
    opts = opts || {};
    if (!pix) return { ok: false, error: 'داده تصویر خالی است', lowQuality: true };
    var fSeg = opts.noSeg ? null : features(pix, w, h, {});
    var useNoSeg = false;
    if (!fSeg) useNoSeg = true;
    else if (fSeg.subjectRatio < 0.06 || (1 - fSeg.subjectRatio) < 0.03) useNoSeg = true;
    var f = useNoSeg ? features(pix, w, h, { noSeg: true }) : fSeg;
    if (!f) return { ok: false, error: 'نتوانستم شکلی در تصویر تشخیص دهم', lowQuality: true };
    if (f.subjectRatio < 0.02) {
      return {
        ok: false, lowQuality: true, features: f,
        error: 'سوژه‌ی اصلی پیدا نشد؛ عکس را طوری بگیرید که جنس وسط قاب و پس‌زمینه ساده باشد.'
      };
    }
    var cls = categorize(f), cat = cls.ranked[0], warns = [];
    if (!f.segmented) warns.push('پس‌زمینه از جنس جدا نشد (سفید روی سفید یا پس‌زمینه‌ی شلوغ)؛ نتیجه تقریبی است.');
    if (f.subjectRatio < 0.12) warns.push('جنس بخش کوچکی از قاب را پر کرده — عکس نزدیک‌تر بگیرید.');
    if (f.subjectRatio > 0.9) warns.push('حاشیه‌ی تصویر کم است؛ برای تشخیص دقیق‌تر جنس را وسط قاب بگیرید.');
    if (f.brightness < 0.12 || f.brightness > 0.95) warns.push('نور تصویر نامتعادل است؛ عکس در نور روز نتیجه‌ی بهتری می‌دهد.');
    if (cls.ambiguous) warns.push('تصویر میان چند دسته مشترک است؛ یکی از گزینه‌های پیشنهادی را انتخاب یا دسته را دستی تنظیم کنید.');
    var suggestion = buildSuggestion(f, cat, opts.dict);
    return {
      ok: true, features: f, candidates: cls.ranked.slice(0, 4), best: cat,
      confidence: cls.confidence, margin: cls.margin, ambiguous: cls.ambiguous,
      suggestion: suggestion, warnings: warns, summary: summarize(f, cat, suggestion)
    };
  }

  /* ============ ۶) امضای تصویر (جست‌وجوی کالای مشابه) ============ */
  function fingerprint(pix, w, h) {
    var bits = [], i, j, cellW = w / 16, cellH = h / 16;
    for (i = 0; i < 16; i++) for (j = 0; j < 16; j++) {
      var sum = 0, n = 0;
      for (var y = Math.floor(i * cellH); y < Math.floor((i + 1) * cellH); y++)
        for (var x = Math.floor(j * cellW); x < Math.floor((j + 1) * cellW); x++) {
          var o = (y * w + x) * 4; sum += lum(pix[o], pix[o + 1], pix[o + 2]); n++;
        }
      bits.push(n ? sum / n : 0);
    }
    var mean = bits.reduce(function (a, b) { return a + b; }, 0) / bits.length;
    var bin = bits.map(function (v) { return v > mean ? 1 : 0; });
    var hex = '';
    for (i = 0; i < 256; i += 4) hex += parseInt('' + bin[i] + bin[i + 1] + bin[i + 2] + bin[i + 3], 2).toString(16);
    return hex;
  }
  function hamming(a, b) {
    if (!a || !b || a.length !== b.length) return 999;
    var d = 0;
    for (var i = 0; i < a.length; i++) {
      var x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
      d += (x & 1) + ((x >> 1) & 1) + ((x >> 2) & 1) + ((x >> 3) & 1);
    }
    return d;
  }

  /* ============ ۷) کار با canvas ============ */
  var AW = 150;
  var TW = 40, TH = 40;
  var PW = 640;

  function drawTo(dataUrl, maxW, maxH) {
    return new Promise(function (res, rej) {
      var img = new Image();
      img.onload = function () {
        try {
          var ratio = img.width / img.height;
          var w = maxW, h = maxH;
          if (ratio > 1) h = Math.round(maxW / ratio); else w = Math.round(maxH * ratio);
          w = Math.max(2, Math.min(w, maxW)); h = Math.max(2, Math.min(h, maxH));
          var cv = document.createElement('canvas');
          cv.width = w; cv.height = h;
          var ctx = cv.getContext('2d');
          ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          res({ pix: ctx.getImageData(0, 0, w, h).data, w: w, h: h });
        } catch (e) { rej(e); }
      };
      img.onerror = function () { rej(new Error('تصویر قابل خواندن نیست')); };
      img.src = dataUrl;
    });
  }

  Shop.vision = {
    analyzePixels: analyzePixels,
    features: features,
    categorize: categorize,
    shapeWord: shapeWord,
    fingerprint: fingerprint,
    hamming: hamming,
    CLASSES: C,
    AW: AW,

    /* تحلیل کامل تصویر آپلودشده */
    analyze: function (dataUrl, opts) {
      opts = opts || {};
      return drawTo(dataUrl, AW, AW).then(function (im) {
        var rep = analyzePixels(im.pix, im.w, im.h, opts);
        return drawTo(dataUrl, TW, TH).then(function (fp) {
          rep.fp = fingerprint(fp.pix, fp.w, fp.h);
          return rep;
        }).catch(function () { return rep; });
      });
    },
    prepare: function (dataUrl) {
      return U.compressImage(dataUrl, PW, 0.78).catch(function () { return { dataUrl: dataUrl, w: 0, h: 0 }; });
    },
    similar: function (fp, list, threshold) {
      var th = threshold == null ? 40 : threshold;
      return (list || []).map(function (p) { return { product: p, dist: hamming(fp, p.fp) }; })
        .filter(function (x) { return x.dist <= th; })
        .sort(function (a, b) { return a.dist - b.dist; });
    },
    thumb: drawTo
  };
})(typeof window !== 'undefined' ? window : globalThis);
