/* ============================================================
   Shop Manager — Core Utilities (Util)
   ابزارهای پایه: DOM، عدد، تاریخ شمسی، رنگ، ذخیره‌سازی، هش
   ============================================================ */
(function (root) {
  'use strict';
  var Shop = (root.Shop = root.Shop || {});
  var U = {};

  /* ---------- DOM ---------- */
  U.$ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  U.$$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  U.el = function (tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'class') node.className = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'text') node.textContent = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2), v);
        else if (k === 'dataset' && typeof v === 'object') Object.assign(node.dataset, v);
        else node.setAttribute(k, v);
      });
    }
    (Array.isArray(children) ? children : children != null ? [children] : []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  };

  U.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  U.attr = U.esc;

  /* ---------- اعداد و پول ---------- */
  var FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

  U.toFa = function (s) {
    return String(s == null ? '' : s).replace(/[0-9]/g, function (d) { return FA_DIGITS[+d]; });
  };
  U.toEn = function (s) {
    if (s == null) return '';
    return String(s)
      .replace(/[\u06F0-\u06F9]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); })
      .replace(/[\u0660-\u0669]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); });
  };
  U.num = function (v) {
    var n = parseFloat(U.toEn(String(v).replace(/[٬,\s\u066c]/g, '')));
    return isFinite(n) ? n : 0;
  };
  U.group = function (n) {
    n = Math.round(U.num(n));
    var s = String(Math.abs(n)), out = '', c = 0;
    for (var i = s.length - 1; i >= 0; i--) { out = s[i] + out; if (++c % 3 === 0 && i > 0) out = ',' + out; }
    return (n < 0 ? '-' : '') + out;
  };
  U.money = function (n, withDigits) {
    var s = U.group(n);
    return withDigits === false ? s : U.toFa(s);
  };
  U.toman = function (n, currency) {
    return U.money(n) + ' ' + (currency || 'تومان');
  };
  U.percent = function (n, digits) { return U.toFa(Number(n).toFixed(digits == null ? 1 : digits)) + '٪'; };
  U.roundTo = function (n, step) { step = step || 1; return Math.round(U.num(n) / step) * step; };
  U.clamp = function (n, a, b) { return Math.min(b, Math.max(a, n)); };

  /* ---------- رشته و شباهت (for جست‌وجوی هوشمند) ---------- */
  U.norm = function (s) {
    return U.toEn(String(s == null ? '' : s))
      .replace(/[\u064A\u0649]/g, '\u06CC')   // ي/ى → ی
      .replace(/\u0643/g, '\u06A9')           // ك → ک
      .replace(/[\u0623\u0625\u0622]/g, '\u0627')
      .replace(/[\u0629]/g, '\u0647')
      .replace(/[\u064B-\u0652\u0640\u200c\u200f\u200e]/g, '')
      .replace(/[آأإ]/g, 'ا')
      .replace(/\s+/g, ' ')
      .trim().toLowerCase();
  };
  U.lev = function (a, b) {
    a = U.norm(a); b = U.norm(b);
    if (a === b) return 0;
    var m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    var prev = new Array(n + 1), cur = new Array(n + 1), i, j;
    for (j = 0; j <= n; j++) prev[j] = j;
    for (i = 1; i <= m; i++) {
      cur[0] = i;
      for (j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      var tmp = prev; prev = cur; cur = tmp;
    }
    return prev[n];
  };
  U.similarity = function (a, b) {
    a = U.norm(a); b = U.norm(b);
    if (!a || !b) return 0;
    if (a === b) return 1;
    if (a.indexOf(b) === 0 || b.indexOf(a) === 0) return 0.94;
    if (a.indexOf(b) > -1 || b.indexOf(a) > -1) return 0.86;
    var d = U.lev(a, b);
    return Math.max(0, 1 - d / Math.max(a.length, b.length));
  };
  /* امتیاز تطبیق چندکلمه‌ای (جست‌وجوی فارسی) */
  U.matchScore = function (query, text, tags) {
    var q = U.norm(query); if (!q) return 0;
    var t = U.norm(text);
    var words = q.split(' ').filter(Boolean);
    var score = 0, i;
    for (i = 0; i < words.length; i++) {
      var w = words[i];
      if (t.indexOf(w) === 0) score += 1.2;
      else if (t.indexOf(w) > -1) score += 0.95;
      else {
        var best = 0, tw = t.split(' ');
        for (var k = 0; k < tw.length; k++) {
          var s = U.similarity(w, tw[k]);
          if (s > best) best = s;
        }
        if (best > 0.68) score += best * 0.8;
      }
    }
    (tags || []).forEach(function (tag) {
      for (var k = 0; k < words.length; k++) if (U.similarity(words[k], tag) > 0.8) score += 0.5;
    });
    return score / (words.length || 1);
  };

  U.slug = function (s) {
    return U.norm(s).replace(/[^a-z0-9\u0600-\u06FF]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'item';
  };
  U.uuid = function (p) {
    var r = (Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
    return (p || 'id') + '_' + r;
  };
  U.pad = function (n, len) { n = String(n); while (n.length < (len || 2)) n = '0' + n; return n; };
  U.titleCase = function (s) { return String(s || '').replace(/\S+/g, function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }); };

  /* ---------- تاریخ شمسی (بدون کتابخانه) ---------- */
  var div = function (a, b) { return ~~(a / b); };
  var mod = function (a, b) { return a - ~~(a / b) * b; };
  var BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];

  function jalCal(jy, withoutLeap) {
    var bl = BREAKS.length, gy = jy + 621, leapJ = -14, jp = BREAKS[0], jm, jump = 0, leap = 0, n, i;
    for (i = 1; i < bl; i += 1) {
      jm = BREAKS[i]; jump = jm - jp;
      if (jy < jm) break;
      leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
      jp = jm;
    }
    n = jy - jp;
    leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
    if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
    var leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
    var march = 20 + leapJ - leapG;
    if (!withoutLeap) {
      if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
      leap = mod(mod(n + 1, 33) - 1, 4);
      if (leap === -1) leap = 4;
    }
    return { leap: leap, gy: gy, march: march };
  }
  function g2d(gy, gm, gd) {
    var d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
    d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
    return d;
  }
  function d2g(jdn) {
    var j = 4 * jdn + 139361631;
    j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
    var i = div(mod(j, 1461), 4) * 5 + 308;
    var gd = div(mod(i, 153), 5) + 1;
    var gm = mod(div(i, 153), 12) + 1;
    var gy = div(j, 1461) - 100100 + div(8 - gm, 6);
    return { gy: gy, gm: gm, gd: gd };
  }
  function j2d(jy, jm, jd) {
    var r = jalCal(jy, true);
    return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
  }
  function d2j(jdn) {
    var gy = d2g(jdn).gy, jy = gy - 621, r = jalCal(jy, false), jdn1f = g2d(gy, 3, r.march), k;
    k = jdn - jdn1f;
    if (k >= 0) {
      if (k <= 185) return { jy: jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
      k -= 186;
    } else {
      jy -= 1; k += 179;
      if (r.leap === 1) k += 1;
    }
    return { jy: jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
  }
  var JMONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  var JDAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];

  U.jalali = function (date) {
    date = date ? new Date(date) : new Date();
    var g = d2g(g2d(date.getFullYear(), date.getMonth() + 1, date.getDate()));
    var j = d2j(g2d(date.getFullYear(), date.getMonth() + 1, date.getDate()));
    return { jy: j.jy, jm: j.jm, jd: j.jd, gy: g.gy, gm: g.gm, gd: g.gd, weekday: date.getDay() };
  };
  U.jalaliToDate = function (jy, jm, jd, h, mi) {
    var g = d2g(j2d(jy, jm, jd));
    return new Date(g.gy, g.gm - 1, g.gd, h || 0, mi || 0, 0);
  };
  U.jDate = function (date) {
    var j = U.jalali(date);
    return U.toFa(j.jy + '/' + U.pad(j.jm) + '/' + U.pad(j.jd));
  };
  U.jDateLong = function (date) {
    var j = U.jalali(date);
    return JDAYS[new Date(date || Date.now()).getDay()] + ' ' + U.toFa(j.jd) + ' ' + JMONTHS[j.jm - 1] + ' ' + U.toFa(j.jy);
  };
  U.jTime = function (date) {
    var d = date ? new Date(date) : new Date();
    return U.toFa(U.pad(d.getHours()) + ':' + U.pad(d.getMinutes()));
  };
  U.jDateTime = function (date) { return U.jDate(date) + ' — ' + U.jTime(date); };
  U.dayKey = function (date) {
    var d = date ? new Date(date) : new Date();
    return d.getFullYear() + '-' + U.pad(d.getMonth() + 1) + '-' + U.pad(d.getDate());
  };
  U.weekKey = function (date) {
    var d = new Date(date || Date.now());
    var day = (d.getDay() + 1) % 7; // شنبه = 0
    var sat = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
    return U.dayKey(sat);
  };
  U.relTime = function (ts) {
    var diff = (Date.now() - new Date(ts).getTime()) / 1000;
    if (diff < 60) return 'همین حالا';
    if (diff < 3600) return U.toFa(Math.floor(diff / 60)) + ' دقیقه پیش';
    if (diff < 86400) return U.toFa(Math.floor(diff / 3600)) + ' ساعت پیش';
    if (diff < 604800) return U.toFa(Math.floor(diff / 86400)) + ' روز پیش';
    return U.jDate(ts);
  };
  U.JMONTHS = JMONTHS;
  U.JDAYS = JDAYS;

  /* ---------- رنگ ---------- */
  U.hexToRgb = function (hex) {
    hex = String(hex || '#888').replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(hex, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  };
  U.rgbToHex = function (r, g, b) {
    return '#' + [r, g, b].map(function (v) {
      var s = Math.round(U.clamp(v, 0, 255)).toString(16); return s.length === 1 ? '0' + s : s;
    }).join('');
  };
  U.rgbToHsv = function (r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, h = 0;
    if (d) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
    }
    h = Math.round(h * 60); if (h < 0) h += 360;
    return { h: h, s: max ? d / max : 0, v: max };
  };
  U.colorDist = function (a, b) {
    return Math.sqrt(Math.pow(a.r - b.r, 2) + Math.pow(a.g - b.g, 2) + Math.pow(a.b - b.b, 2));
  };
  /* نام فارسی رنگ از روی HSV — سبک، معنایی و انسانی */
  U.colorName = function (rgb) {
    var hsv = U.rgbToHsv(rgb.r, rgb.g, rgb.b), h = hsv.h, s = hsv.s, v = hsv.v;
    if (v < 0.16) return 'مشکی';
    if (s < 0.09) return v > 0.88 ? 'سفید' : v > 0.62 ? 'نقره‌ای' : 'خاکستری';
    if (s < 0.22 && v > 0.72) return 'کرم';
    if (h < 12 || h >= 345) return v < 0.5 ? 'زرشکی' : 'قرمز';
    if (h < 22) return 'نارنجی قرمز';
    if (h < 38) return v > 0.85 && s < 0.6 ? 'هلویی' : 'نارنجی';
    if (h < 48) return 'کهربایی';
    if (h < 62) return s < 0.45 ? 'بژ' : 'زرد';
    if (h < 85) return 'سبز لیمویی';
    if (h < 160) return s < 0.3 ? 'سبز روشن' : 'سبز';
    if (h < 190) return 'فیروزه‌ای';
    if (h < 215) return s < 0.35 ? 'آبی روشن' : 'آبی';
    if (h < 250) return 'سرمه‌ای';
    if (h < 285) return 'بنفش';
    if (h < 320) return s < 0.4 ? 'یاسی' : 'ارغوانی';
    return s < 0.4 ? 'صورتی' : 'سرخابی';
  };
  U.lighten = function (hex, amt) {
    var c = U.hexToRgb(hex);
    return U.rgbToHex(c.r + (255 - c.r) * amt, c.g + (255 - c.g) * amt, c.b + (255 - c.b) * amt);
  };

  /* ---------- زمان‌بند، آبونمان رویداد ---------- */
  U.debounce = function (fn, ms) {
    var t; return function () {
      var a = arguments, self = this;
      clearTimeout(t); t = setTimeout(function () { fn.apply(self, a); }, ms || 250);
    };
  };
  U.throttle = function (fn, ms) {
    var last = 0, tm; return function () {
      var now = Date.now(), a = arguments, self = this;
      if (now - last > (ms || 200)) { last = now; fn.apply(self, a); }
      else { clearTimeout(tm); tm = setTimeout(function () { last = Date.now(); fn.apply(self, a); }, ms); }
    };
  };

  /* ---------- ذخیره‌سازی (با پشتیبان حافظه‌ای) ---------- */
  var mem = {};
  var LS_OK = (function () { try { root.localStorage.setItem('__t', '1'); root.localStorage.removeItem('__t'); return true; } catch (e) { return false; } })();
  U.LS_OK = LS_OK;
  U.store = {
    get: function (k, def) {
      try {
        var raw = LS_OK ? root.localStorage.getItem(k) : mem[k];
        if (raw == null) return def;
        return JSON.parse(raw);
      } catch (e) { return def; }
    },
    set: function (k, v) {
      var raw = JSON.stringify(v);
      if (LS_OK) {
        try { root.localStorage.setItem(k, raw); return true; }
        catch (e) { mem[k] = raw; return false; }   /* حافظه‌ی مرورگر پر است */
      }
      mem[k] = raw;   /* محیط بدون localStorage (تست) */
      return true;
    },
    del: function (k) { try { if (LS_OK) root.localStorage.removeItem(k); } catch (e) { } delete mem[k]; },
    usage: function () {
      if (!LS_OK) return 0;
      var total = 0;
      try {
        for (var i = 0; i < root.localStorage.length; i++) {
          var k = root.localStorage.key(i);
          total += (k.length + (root.localStorage.getItem(k) || '').length) * 2;
        }
      } catch (e) { }
      return total;
    },
    session: {
      get: function (k, def) {
        try { var v = root.sessionStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return mem['s_' + k] != null ? JSON.parse(mem['s_' + k]) : def; }
      },
      set: function (k, v) {
        try { root.sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { mem['s_' + k] = JSON.stringify(v); }
      },
      del: function (k) { try { root.sessionStorage.removeItem(k); } catch (e) { } delete mem['s_' + k]; }
    }
  };

  /* ---------- SHA-256 خالص (بدون WebCrypto — روی هر مرورگری کار می‌کند) ---------- */
  function rrot(x, n) { return (x >>> n) | (x << (32 - n)); }
  U.sha256 = function (ascii) {
    ascii = String(ascii);
    // تبدیل به UTF-8
    var utf8 = unescape(encodeURIComponent(ascii));
    var bytes = [];
    for (var i = 0; i < utf8.length; i++) bytes.push(utf8.charCodeAt(i));
    var K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var l = bytes.length;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    var bitLenHi = Math.floor(l / 536870912), bitLenLo = (l * 8) >>> 0;
    [bitLenHi, bitLenLo].forEach(function (v) {
      bytes.push((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255);
    });
    for (var off = 0; off < bytes.length; off += 64) {
      var w = new Array(64), j;
      for (j = 0; j < 16; j++) w[j] = (bytes[off + j * 4] << 24) | (bytes[off + j * 4 + 1] << 16) | (bytes[off + j * 4 + 2] << 8) | bytes[off + j * 4 + 3];
      for (j = 16; j < 64; j++) {
        var s0 = rrot(w[j - 15], 7) ^ rrot(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        var s1 = rrot(w[j - 2], 17) ^ rrot(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) >>> 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (j = 0; j < 64; j++) {
        var S1 = rrot(e, 6) ^ rrot(e, 11) ^ rrot(e, 25);
        var ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + K[j] + w[j]) >>> 0;
        var S0 = rrot(a, 2) ^ rrot(a, 13) ^ rrot(a, 22);
        var mj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + mj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0;
        d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    return H.map(function (x) { return ('00000000' + x.toString(16)).slice(-8); }).join('');
  };
  U.hashPassword = function (password, salt) {
    var h = salt + '|' + password + '|shop-manager';
    for (var i = 0; i < 800; i++) h = U.sha256(h + i);
    return h;
  };
  U.makeSalt = function () { return U.uuid('s') + Math.random().toString(36).slice(2, 10); };


  /* ---------- عدد به حروف فارسی (برای فاکتور) ---------- */
  U.numInWords = function (num) {
    num = Math.round(Math.abs(U.num(num)));
    if (!isFinite(num)) return '';
    if (num === 0) return 'صفر';
    var yekan = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
    var dahgan = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
    var dah = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
    var sadgan = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
    function three(n) {
      var parts = [], s = Math.floor(n / 100), r = n % 100;
      if (s) parts.push(sadgan[s]);
      if (r >= 10 && r < 20) parts.push(dah[r - 10]);
      else {
        var d = Math.floor(r / 10), y = r % 10;
        if (d) parts.push(dahgan[d]);
        if (y) parts.push(yekan[y]);
      }
      return parts.join(' و ');
    }
    var groups = [{ v: 1000000000, name: 'میلیارد' }, { v: 1000000, name: 'میلیون' }, { v: 1000, name: 'هزار' }];
    var out = [], rest = num;
    groups.forEach(function (g) {
      var q = Math.floor(rest / g.v);
      if (q) { out.push(three(q) + ' ' + g.name); rest %= g.v; }
    });
    if (rest) out.push(three(rest));
    return out.join(' و ');
  };
  U.moneyInWords = function (n, currency) { return U.numInWords(n) + ' ' + (currency || 'تومان'); };

  /* ---------- کوتاه‌سازی مبلغ ---------- */
  U.moneyShort = function (n) {
    n = U.num(n);
    var a = Math.abs(n);
    if (a >= 1e9) return U.toFa((n / 1e9).toFixed(a >= 1e10 ? 0 : 1).replace(/\.0$/, '')) + ' میلیارد';
    if (a >= 1e6) return U.toFa((n / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, '')) + ' میلیون';
    if (a >= 1000) return U.toFa((n / 1000).toFixed(a >= 1e4 ? 0 : 1).replace(/\.0$/, '')) + ' هزار';
    return U.money(n);
  };

  /* ---------- فرود/گزارش ---------- */
  U.download = function (filename, content, mime) {
    try {
      var blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
      return true;
    } catch (e) { return false; }
  };
  U.toCSV = function (rows, headers) {
    var esc = function (v) {
      var s = String(v == null ? '' : v);
      return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    var out = [];
    if (headers) out.push(headers.map(esc).join(','));
    rows.forEach(function (r) { out.push(r.map(esc).join(',')); });
    return '\uFEFF' + out.join('\r\n'); // BOM برای اکسل فارسی
  };
  U.copy = function (text) {
    return new Promise(function (res, rej) {
      if (root.navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(res, function () { rej(); });
      } else {
        try {
          var ta = document.createElement('textarea');
          ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
          document.body.appendChild(ta); ta.select();
          var okCopy = false;
          try { okCopy = document.execCommand && document.execCommand('copy'); } catch (e2) { okCopy = false; }
          ta.remove();
          if (okCopy === false && !(document.execCommand)) {
            /* مرورگرهای قدیمی یا محیط‌های محدود: متن را برای کپی دستی نشان بده */
            U.prompt('کپی خودکار ممکن نشد؛ متن زیر را با Ctrl+C کپی کنید:', text, { type: 'textarea', okText: 'متوجه شدم' });
          }
          res();
        } catch (e) { rej(e); }
      }
    });
  };

  /* ---------- تصویر: فشرده‌سازی و تحلیل پایه ---------- */
  U.readImage = function (input) {
    return new Promise(function (res, rej) {
      var f = input && input.files ? input.files[0] : input;
      if (!f) return rej(new Error('فایلی انتخاب نشده است'));
      if (!/^image\//.test(f.type)) return rej(new Error('فایل انتخاب‌شده تصویر نیست'));
      var fr = new FileReader();
      fr.onload = function () { res({ dataUrl: fr.result, name: f.name || '', size: f.size, type: f.type }); };
      fr.onerror = function () { rej(new Error('خطا در خواندن فایل')); };
      fr.readAsDataURL(f);
    });
  };
  /* تغییر اندازه + فشرده‌سازی به JPEG برای ذخیره سبک */
  U.compressImage = function (dataUrl, maxSide, quality) {
    return new Promise(function (res) {
      var img = new Image();
      img.onload = function () {
        var w = img.width, h = img.height, m = maxSide || 420;
        if (w > m || h > m) { var k = m / Math.max(w, h); w = Math.round(w * k); h = Math.round(h * k); }
        try {
          var cv = document.createElement('canvas');
          cv.width = w; cv.height = h;
          var ctx = cv.getContext('2d');
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          res({ dataUrl: cv.toDataURL('image/jpeg', quality || 0.72), w: w, h: h });
        } catch (e) { res({ dataUrl: dataUrl, w: img.width, h: img.height }); }
      };
      img.onerror = function () { res({ dataUrl: dataUrl, w: 0, h: 0 }); };
      img.src = dataUrl;
    });
  };

  /* ---------- UI: توست، مودال، تأیید ---------- */
  U.toast = function (msg, type, ms) {
    var host = U.$('#toasts') || (function () {
      var h = U.el('div', { id: 'toasts', class: 'toasts' }); document.body.appendChild(h); return h;
    })();
    var icons = { ok: '✔', err: '✕', warn: '!', info: 'i' };
    var t = U.el('div', { class: 'toast toast-' + (type || 'ok') }, [
      U.el('span', { class: 'toast-ico', text: icons[type] || '✔' }),
      U.el('span', { class: 'toast-msg', text: msg })
    ]);
    host.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('in'); });
    setTimeout(function () {
      t.classList.remove('in');
      setTimeout(function () { t.remove(); }, 300);
    }, ms || 2800);
  };

  U.modal = function (opts) {
    opts = opts || {};
    var back = U.el('div', { class: 'modal-back' });
    var box = U.el('div', { class: 'modal ' + (opts.size === 'lg' ? 'modal-lg' : '') });
    var head = U.el('div', { class: 'modal-head' }, [
      U.el('h3', { text: opts.title || '' }),
      U.el('button', { class: 'icon-btn', 'aria-label': 'بستن', html: '✕', onclick: close })
    ]);
    var body = U.el('div', { class: 'modal-body' });
    if (typeof opts.content === 'string') body.innerHTML = opts.content;
    else if (opts.content) body.appendChild(opts.content);
    box.appendChild(head); box.appendChild(body);
    if (opts.footer) {
      var foot = U.el('div', { class: 'modal-foot' });
      foot.appendChild(opts.footer);
      box.appendChild(foot);
    }
    back.appendChild(box);
    document.body.appendChild(back);
    document.body.classList.add('no-scroll');
    requestAnimationFrame(function () { back.classList.add('in'); });

    function close() {
      back.classList.remove('in');
      document.body.classList.remove('no-scroll');
      setTimeout(function () { back.remove(); }, 220);
      if (opts.onClose) opts.onClose();
    }
    back.addEventListener('mousedown', function (e) { if (e.target === back) close(); });
    document.addEventListener('keydown', function esc2(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc2); }
    });
    return { close: close, body: body, el: box };
  };

  U.confirm = function (message, opts) {
    opts = opts || {};
    return new Promise(function (res) {
      /* نکته: باید پیش از بستن مودال پاسخ داده شود، چون بستن مودال onClose را صدا می‌زند */
      var settled = false;
      function finish(v) { if (settled) return; settled = true; res(v); }
      var ok = U.el('button', {
        class: 'btn ' + (opts.danger ? 'btn-danger' : 'btn-primary'), text: opts.okText || 'تأیید',
        onclick: function () { finish(true); m.close(); }
      });
      var cancel = U.el('button', { class: 'btn btn-ghost', text: 'انصراف', onclick: function () { finish(false); m.close(); } });
      var foot = U.el('div', { class: 'row gap-sm' }, [ok, cancel]);
      var m = U.modal({ title: opts.title || 'تأیید عملیات', content: '<p class="muted">' + U.esc(message) + '</p>', footer: foot, onClose: function () { finish(false); } });
    });
  };

  U.prompt = function (message, def, opts) {
    opts = opts || {};
    return new Promise(function (res) {
      var settled = false;
      function finish(v) { if (settled) return; settled = true; res(v); }
      var isArea = opts.type === 'textarea';
      var input = isArea
        ? U.el('textarea', { class: 'input', rows: opts.rows || 6, placeholder: opts.placeholder || '' })
        : U.el('input', { class: 'input', value: def == null ? '' : def, type: opts.type || 'text', placeholder: opts.placeholder || '' });
      if (isArea && def != null) input.value = def;
      var wrap = U.el('div', { class: 'col gap-sm' }, [U.el('label', { class: 'lbl', text: message }), input]);
      var ok = U.el('button', {
        class: 'btn btn-primary', text: opts.okText || 'ثبت', onclick: function () { finish(input.value); m.close(); }
      });
      var foot = U.el('div', { class: 'row gap-sm' }, [ok, U.el('button', { class: 'btn btn-ghost', text: 'انصراف', onclick: function () { finish(null); m.close(); } })]);
      var m = U.modal({ title: opts.title || 'ورود اطلاعات', content: wrap, footer: foot, onClose: function () { finish(null); } });
      setTimeout(function () { input.focus(); input.select(); }, 60);
      if (!isArea) input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { finish(input.value); m.close(); } });
    });
  };

  /* ---------- متفرقه ---------- */
  U.groupBy = function (arr, keyFn) {
    return arr.reduce(function (acc, x) {
      var k = keyFn(x); (acc[k] = acc[k] || []).push(x); return acc;
    }, {});
  };
  U.sum = function (arr, fn) { return arr.reduce(function (a, x) { return a + (fn ? fn(x) : x); }, 0); };
  U.uniq = function (arr) { return arr.filter(function (x, i) { return arr.indexOf(x) === i; }); };
  U.clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  U.scrollTo = function (opts) {
    try { if (root.scrollTo) root.scrollTo(opts); } catch (e) { }
  };
  U.prettyBytes = function (b) {
    if (b < 1024) return U.toFa(Math.round(b)) + ' بایت';
    if (b < 1048576) return U.toFa((b / 1024).toFixed(1)) + ' کیلوبایت';
    return U.toFa((b / 1048576).toFixed(2)) + ' مگابایت';
  };
  U.chunk = function (arr, n) {
    var out = []; for (var i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out;
  };

  Shop.U = U;
})(typeof window !== 'undefined' ? window : globalThis);
