/* ============================================================
   Shop Manager — Barcode Engine (Code128B / EAN-13 / Code39)
   بدون هیچ کتابخانه بیرونی — کاملاً آفلاین
   ============================================================ */
(function (root) {
  'use strict';
  var Shop = (root.Shop = root.Shop || {});

  /* جدول استاندارد Code128 (107 الگو — عرض میله/فاصله) */
  var C128 = [
    '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
    '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
    '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
    '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
    '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
    '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
    '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
    '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
    '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
    '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
    '114131', '311141', '411131', '211412', '211214', '211232', '2331112'
  ];

  /* کدگذاری یک رشته با Code128B → رشته ماژول‌های 0/1 */
  function code128Modules(text) {
    text = String(text == null ? '' : text);
    if (!text) text = '0';
    var codes = [104]; // START B
    for (var i = 0; i < text.length; i++) {
      var c = text.charCodeAt(i);
      if (c < 32 || c > 126) c = 32; // کاراکتر غیرمجاز → فاصله
      codes.push(c - 32);
    }
    var sum = codes[0];
    for (var j = 1; j < codes.length; j++) sum += codes[j] * j;
    codes.push(sum % 103); // Check digit
    codes.push(106);       // STOP

    var bits = '';
    for (var k = 0; k < codes.length; k++) {
      var pat = C128[codes[k]];
      for (var p = 0; p < pat.length; p++) {
        bits += new Array(parseInt(pat[p], 10) + 1).join(p % 2 ? '0' : '1');
      }
    }
    return bits;
  }

  /* رسم بارکد به صورت SVG (بدون وابستگی) */
  function barcodeSVG(text, opts) {
    opts = opts || {};
    var mods = opts.module || 2;                 // عرض هر ماژول (px)
    var height = opts.height || 70;
    var showText = opts.text !== false;
    var fontSize = opts.fontSize || 13;
    var bits = code128Modules(text);
    var width = (bits.length + 2) * mods;
    var textH = showText ? fontSize + 6 : 0;

    var rects = '';
    var x = 0;
    while (x < bits.length) {
      if (bits[x] === '1') {
        var run = 1;
        while (bits[x + run] === '1') run++;
        rects += '<rect x="' + (x * mods + mods) + '" y="0" width="' + (run * mods) + '" height="' + height + '" fill="#111"/>';
        x += run;
      } else x++;
    }
    var label = showText
      ? '<text x="' + width / 2 + '" y="' + (height + fontSize + 1) + '" text-anchor="middle" ' +
        'font-family="monospace" font-size="' + fontSize + '" fill="#111" letter-spacing="1">' + esc(text) + '</text>'
      : '';

    return '<svg class="bc-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + (height + textH + 8) +
      '" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="بارکد ' + esc(text) + '">' +
      '<rect width="100%" height="100%" fill="#fff"/>' + rects + label + '</svg>';
  }

  /* بارکد EAN-13 (اختیاری — برای محصولات با کد ۱۳ رقمی) */
  function ean13Valid(code) {
    code = String(code || '').replace(/\D/g, '');
    if (code.length !== 13) return false;
    var s = 0;
    for (var i = 0; i < 12; i++) s += parseInt(code[i], 10) * (i % 2 ? 3 : 1);
    return (10 - (s % 10)) % 10 === parseInt(code[12], 10);
  }

  function ean13CheckDigit(code12) {
    var s = 0;
    for (var i = 0; i < 12; i++) s += parseInt(code12[i], 10) * (i % 2 ? 3 : 1);
    return (10 - (s % 10)) % 10;
  }

  /* تولید کد داخلی فروشگاه: پیش‌شماره 200 + شماره ترتیبی ۹ رقمی + رقم کنترل */
  function makeInternalEAN(seq) {
    var base = '200' + String(seq).replace(/\D/g, '').padStart(9, '0').slice(-9);
    return base + ean13CheckDigit(base);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  Shop.barcode = {
    table: C128,
    modules: code128Modules,
    svg: barcodeSVG,
    ean13Valid: ean13Valid,
    ean13CheckDigit: ean13CheckDigit,
    makeInternalEAN: makeInternalEAN,
    /* تصویر PNG به صورت dataURL (برای چاپ یا دانلود) */
    toDataURL: function (text, opts) {
      opts = opts || {};
      var mods = 2, height = 90, bits = code128Modules(text);
      var quiet = 10 * mods;
      var w = bits.length * mods + quiet * 2, h = height + (opts.text === false ? 20 : 44);
      var cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      var g = cv.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#111';
      var x = 0;
      while (x < bits.length) {
        if (bits[x] === '1') {
          var run = 1;
          while (bits[x + run] === '1') run++;
          g.fillRect(quiet + x * mods, 10, run * mods, height);
          x += run;
        } else x++;
      }
      if (opts.text !== false) {
        g.fillStyle = '#111'; g.font = '14px monospace'; g.textAlign = 'center';
        g.fillText(String(text), w / 2, height + 30);
      }
      return cv.toDataURL('image/png');
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
