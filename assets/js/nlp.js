/* ============================================================
   Shop Manager — End-of-Day NLP Engine
   پیام پایان روز مالک مغازه را می‌خواند، جنس و تعداد و نوع عملیات را
   درمی‌آورد و موجودی انبار را خودکار به‌روز می‌کند.
   نمونه: «امروز ۳ تا نوشابه خانواده فروختم، ۵ عدد آب معدنی اضافه شد،
          یک ماست خراب شد دور ریختم»
   ============================================================ */
(function (root) {
  'use strict';
  var Shop = (root.Shop = root.Shop || {});
  var U = Shop.U, S = Shop.store;

  /* ---------- واژه‌های عددی فارسی ---------- */
  var ONES = {
    'صفر': 0, 'یک': 1, 'دو': 2, 'سه': 3, 'چهار': 4, 'پنج': 5, 'شش': 6, 'هفت': 7, 'هشت': 8, 'نه': 9, 'ده': 10,
    'یازده': 11, 'دوازده': 12, 'سیزده': 13, 'چهارده': 14, 'پانزده': 15, 'شانزده': 16, 'هفده': 17, 'هجده': 18, 'نوزده': 19,
    'بیست': 20, 'سی': 30, 'چهل': 40, 'پنجاه': 50, 'شصت': 60, 'هفتاد': 70, 'هشتاد': 80, 'نود': 90,
    'صد': 100, 'یکصد': 100, 'دویست': 200, 'سیصد': 300, 'چهارصد': 400, 'پانصد': 500, 'ششصد': 600, 'هفتصد': 700, 'هشتصد': 800, 'نهصد': 900,
    'هزار': 1000, 'نیم': 0.5, 'یه': 1, 'یك': 1
  };
  var NUM_UNITS = ['عدد', 'تا', 'دانه', 'بسته', 'کارتن', 'کیلو', 'کیلوگرم', 'گرم', 'لیتر', 'بطری', 'قوطی', 'شیشه', 'قرص', 'جعبه', 'بکس', 'شرابه', 'نفر'];

  function wordsToNumber(tokens) {
    var total = 0, cur = 0, found = false, isHalf = false;
    tokens.forEach(function (tk) {
      var v = ONES[tk];
      if (v == null) return;
      found = true;
      if (v === 0.5) { isHalf = true; return; }
      if (v === 1000) { total += (cur || 1) * 1000; cur = 0; }
      else if (v >= 100) { cur += v; }
      else cur += v;
    });
    if (!found) return null;
    var n = total + cur;
    if (isHalf) n = (n || 1) - 0.5;
    return n;
  }

  /* ---------- الگوهای عملیات ---------- */
  var OPS = [
    {
      key: 'sale', label: 'فروش', sign: -1, tag: '🟢',
      words: ['فروختم', 'فروختیم', 'فروش', 'فروشرفت', 'فروش رفت', 'فروخته شد', 'بفروش', 'حراج', 'مشتری خرید', 'خرید مشتری', 'دادم', 'رفت', 'خریداری شد', 'سفارش']
    },
    {
      key: 'restock', label: 'افزایش موجودی', sign: 1, tag: '📦',
      words: ['اضافه', 'اضافه شد', 'اضافه کردم', 'خریدم', 'خریداری کردم', 'رسید', 'آوردم', 'وارد شد', 'تحویل', 'بار', 'تخلیه', 'پر شد', 'پرکردم', 'گرفتم']
    },
    {
      key: 'waste', label: 'ضایعات', sign: -1, tag: '🗑️',
      words: ['خراب', 'خراب شد', 'ضایعات', 'دور ریختم', 'ریختم دور', 'منقضی', 'تاریخ گذشته', 'پوسید', 'باطل', 'شکست', 'آفت']
    },
    {
      key: 'return', label: 'مرجوعی', sign: 1, tag: '↩️',
      words: ['مرجوع', 'مرجوعی', 'برگشت', 'پس داد', 'پس آورد', 'پس دادن', 'عودت']
    },
    {
      key: 'count', label: 'شمارش موجودی', sign: 0, tag: '🧮',
      words: ['شمارش', 'شمردم', 'شماره‌گیری', 'انبارگردانی', 'موجودی هست', 'موجودی دارم', 'موجودی',
        'موجودی شد', 'باقی مانده', 'باقی‌مانده', 'باقی', 'مانده', 'مونده', 'باقیش']
    }
  ];
  /* کلماتی که «خرید» را از فروش جدا می‌کند (مشتری خرید = فروش) */
  function hasWord(hay, needle) {
    /* واژه‌های کوتاه باید مرز واژه داشته باشند تا «انبار» با «بار» یکی نشود */
    if (needle.length <= 4) {
      var re = new RegExp('(^|[^\\u0600-\\u06FF])' + needle + '([^\\u0600-\\u06FF]|$)');
      return re.test(hay) || hay.split(/\s+/).some(function (t) { return t === needle; });
    }
    return hay.indexOf(needle) > -1;
  }
  var OP_ORDER = ['count', 'sale', 'restock', 'waste', 'return'];
  function byKey(k) { return OPS.filter(function (x) { return x.key === k; })[0]; }
  function opFor(clause) {
    var n = ' ' + U.norm(clause) + ' ';
    for (var oi = 0; oi < OP_ORDER.length; oi++) {
      var op = byKey(OP_ORDER[oi]);
      if (!op) continue;
      for (var j = 0; j < op.words.length; j++) {
        var w = U.norm(op.words[j]);
        if (hasWord(n, w)) {
          if (op.key === 'sale' && w.indexOf('خرید') > -1 && n.indexOf('مشتری') < 0) continue;
          return op;
        }
      }
    }
    return null;
  }

  /* ---------- تقسیم پیام به بندها ---------- */
  var NUM_WORDS_RE = null;
  function looksLikeQuantity(token) {
    if (!token) return false;
    if (/^(\d+(?:[.,]\d+)?)(k|هزار)?$/.test(token)) return true;
    if (ONES[token] != null) return true;
    if (NUM_UNITS.indexOf(token) > -1) return true;
    return false;
  }
  function splitClauses(text) {
    var parts = String(U.toEn(text || '')).split(/[\n\r؛;،,٫.]+/);
    var out = [];
    parts.forEach(function (part) {
      var tokens = part.trim().split(/\s+/);
      var buf = [];
      tokens.forEach(function (tk, i) {
        if (tk === 'و' && (looksLikeQuantity(tokens[i + 1]) || looksLikeQuantity(tokens[i + 2]))) {
          if (buf.length) out.push(buf.join(' '));
          buf = [];
          return;
        }
        buf.push(tk);
      });
      if (buf.length) out.push(buf.join(' '));
    });
    return out.map(function (c) { return c.trim(); }).filter(function (c) { return c.length > 1; });
  }

  /* ---------- استخراج تعداد ---------- */
  /* واژه‌هایی که نشان می‌دهند عدد بخشی از «نام/اندازه‌ی» جنس است، نه تعداد */
  var SIZE_SUFFIX = ['گرمی', 'کیلویی', 'کیلوگرمی', 'لیتری', 'میلیلیتری', 'سیسی', 'سانتیمتری', 'متری',
    'اینچی', 'واتی', 'آمپری', 'درصدی', 'کالری', 'نفره', 'سانتی'];
  /* واژه‌های فعل که عدد را به عملیات مربوط می‌کنند */
  var VERB_HINT = ['فروختم', 'فروش', 'فروخته', 'فروخت', 'اضافه', 'آوردم', 'خریدم', 'بردم', 'شد', 'شده', 'کردم',
    'خراب', 'ریخت', 'مرجوع', 'برگشت', 'شمردم', 'شمارش', 'باقی', 'مونده', 'مانده', 'گرفتم', 'سفارش', 'دادم'];

  function isVerbTok(t) {
    for (var i = 0; i < VERB_HINT.length; i++) if (t.indexOf(VERB_HINT[i]) > -1) return true;
    for (var k = 0; k < OPS.length; k++) {
      for (var j = 0; j < OPS[k].words.length; j++) {
        var w = U.norm(OPS[k].words[j]);
        if (t === w || t.indexOf(w) === 0 || w.indexOf(t) === 0) return true;
      }
    }
    return false;
  }

  /* عدد را از جمله بیرون می‌کشد: «دو تا ماست ۹۰۰ گرمی فروختم» → عدد ۲ (نه ۹۰۰ که اندازه‌ی جنس است) */
  function extractQty(clause) {
    var norm = U.norm(clause);
    var tokens = norm.split(/\s+/).filter(Boolean);
    var verbIdx = -1;
    for (var v = 0; v < tokens.length; v++) { if (isVerbTok(tokens[v])) { verbIdx = v; break; } }

    function scoreOf(val, endIdx, isWord) {
      var next = tokens[endIdx + 1] || '';
      var s = 0;
      if (SIZE_SUFFIX.indexOf(next) > -1) s -= 4;
      else if (NUM_UNITS.indexOf(next) > -1) s += 3;
      if (val >= 500 && SIZE_SUFFIX.indexOf(next) === -1 && NUM_UNITS.indexOf(next) === -1) s -= 2;
      if (val <= 100) s += 1;
      else if (val <= 400) s += 0.2;
      if (isWord) s += 0.5;
      if (verbIdx > -1) {
        var d = Math.abs(endIdx - verbIdx);
        if (d <= 2) s += 1.5; else if (d <= 4) s += 0.5;
      }
      return s;
    }

    var cands = [];
    /* ۱) عدد با رقم */
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i].replace(/,/g, '');
      var m = t.match(/^(\d+(?:\.\d+)?)(k|هزار)?$/);
      if (!m) continue;
      var val = parseFloat(m[1]) * (m[2] ? 1000 : 1);
      cands.push({ val: val, start: i, end: i, score: scoreOf(val, i, false) });
    }
    /* ۲) عدد با حرف (دو، سه، یه، نیم…) */
    var j = 0;
    while (j < tokens.length) {
      if (ONES[tokens[j]] == null) { j++; continue; }
      var parts = [], k2 = j, last = j;
      while (k2 < tokens.length) {
        if (ONES[tokens[k2]] != null) { parts.push(tokens[k2]); last = k2; k2++; }
        else if (tokens[k2] === 'و' && ONES[tokens[k2 + 1]] != null) { k2++; }
        else break;
      }
      var wv = wordsToNumber(parts);
      if (wv) cands.push({ val: wv, start: j, end: last, score: scoreOf(wv, last, true) });
      j = Math.max(k2, j + 1);
    }

    if (!cands.length) return { qty: null, rest: tokens.join(' '), tokens: tokens, detected: false };
    cands.sort(function (a, b) { return b.score - a.score || a.start - b.start; });
    var best = cands[0];
    if (best.score < -1) return { qty: null, rest: tokens.join(' '), tokens: tokens, detected: false };
    var used = {};
    for (var u = best.start; u <= best.end; u++) used[u] = true;
    if (tokens[best.end + 1] && NUM_UNITS.indexOf(tokens[best.end + 1]) > -1 && SIZE_SUFFIX.indexOf(tokens[best.end + 1]) === -1) used[best.end + 1] = true;
    var rest = tokens.filter(function (tk, idx) {
      if (used[idx]) return false;
      if (NUM_UNITS.indexOf(tk) > -1 && SIZE_SUFFIX.indexOf(tk) === -1) return false;
      return true;
    });
    return { qty: best.val, rest: rest.join(' '), tokens: rest, detected: true };
  }

  function stripOpWords(phrase) {
    var toks = U.norm(phrase).split(/\s+/);
    var out = toks.filter(function (t) {
      if (!t) return false;
      for (var i = 0; i < OPS.length; i++) {
        for (var j = 0; j < OPS[i].words.length; j++) {
          var w = U.norm(OPS[i].words[j]);
          if (t === w) return false;
          /* «فروختم»/«اضافه»/«کردم» و مانند آن */
          if (w.indexOf(' ') < 0 && w.length >= 4 && (t.indexOf(w) === 0 || t === w)) return false;
        }
      }
      if (['انبار', 'جنس', 'کالا', 'امروز', 'دیروز', 'جدید', 'هم', 'باز', 'قلم', 'مورد', 'از', 'به', 'برای', 'در', 'با'].indexOf(t) > -1) return false;
      return true;
    });
    return out.join(' ');
  }

  /* ---------- تطبیق با کاتالوگ ---------- */
  function matchProduct(phrase, products, threshold) {
    if (!phrase) return null;
    var normPhrase = U.norm(phrase);
    var digits = normPhrase.match(/\d+/g) || [];
    /* عددها معمولاً «اندازه/وزن» جنس‌اند (۹۰۰ گرمی) نه بخشی از نام؛ پس در امتیاز پایه بی‌اثر می‌شوند
       و فقط به‌عنوان امتیاز کمکی برای تشخیص بین دو بسته‌ی هم‌نام استفاده می‌شوند. */
    var phraseNoD = normPhrase.replace(/\d+/g, ' ').replace(/\s+/g, ' ').trim() || normPhrase;
    var words = phraseNoD.split(' ').filter(function (w) { return w.length > 2; });
    var best = null, bestScore = 0;

    products.forEach(function (p) {
      var pn = U.norm(p.name);
      var pnNoD = pn.replace(/\d+/g, ' ').replace(/\s+/g, ' ').trim() || pn;
      var hay = pnNoD + ' ' + U.norm(p.brand || '') + ' ' + U.norm(p.supplier || '');
      var score = U.matchScore(phraseNoD, hay, (p.tags || []).concat([p.sku || '']));

      var hits = words.filter(function (w) { return pnNoD.indexOf(w) > -1; }).length;
      if (words.length) score = Math.max(score, hits / Math.max(2, words.length * 0.7));

      var bestWord = 0;
      words.forEach(function (w) {
        var s2 = U.similarity(w, pnNoD.length > 24 ? pnNoD.slice(0, 24) : pnNoD);
        if (pnNoD.indexOf(w) > -1) s2 = Math.max(s2, 0.92);
        if (s2 > bestWord) bestWord = s2;
      });
      score = Math.max(score, bestWord * 0.85);

      if (digits.length) {
        var pd = pn.match(/\d+/g) || [];
        var hitD = digits.filter(function (d) { return pd.indexOf(d) > -1; }).length;
        if (hitD) score += 0.12 * (hitD / digits.length);
      }
      if (p.barcode && normPhrase.indexOf(U.norm(p.barcode)) > -1) score = 1.5;
      if (score > bestScore) { bestScore = score; best = p; }
    });
    if (bestScore < (threshold || 0.42)) return null;
    return { product: best, score: Math.min(1, bestScore) };
  }

  /* ---------- تحلیل کامل ---------- */
  function parse(text, opt) {
    opt = opt || {};
    var products = opt.products || S.db.products.filter(function (p) { return p.active !== false; });
    var clauses = splitClauses(text);
    var items = [], unresolved = [];
    var lastProduct = null, lastOp = null;

    clauses.forEach(function (clause) {
      var qtyInfo = extractQty(clause);
      var op = opFor(clause) || lastOp;   /* اگر بند عملیات ندارد، از بند قبلی ارث می‌برد */
      if (op) lastOp = op;
      var phrase = stripOpWords(qtyInfo.rest) || qtyInfo.rest;
      var hit = matchProduct(phrase, products, opt.threshold);
      /* اگر جنس پیدا نشد ولی بند قبلی جنس داشت و این بند «تعداد خالی» است */
      if (!hit && lastProduct && qtyInfo.qty != null && (!phrase || phrase.length < 3)) {
        hit = { product: lastProduct, score: 0.5 };
      }
      if (!hit && phrase) {
        hit = matchProduct(phrase.split(' ').slice(0, 3).join(' '), products, 0.5);
      }
      if (hit && hit.product) lastProduct = hit.product;

      if (!hit || !hit.product) {
        unresolved.push({ raw: clause, qty: qtyInfo.qty, suggestion: phrase });
        return;
      }
      var opFinal = op || (opt.defaultOp ? byKey(opt.defaultOp) : null) || byKey('sale') || OPS[0];
      var p = hit.product;
      items.push({
        pid: p.id, name: p.name, unit: p.unit, price: p.price, cost: p.cost,
        qty: qtyInfo.qty == null ? 1 : Math.abs(qtyInfo.qty),
        op: opFinal.key, opLabel: opFinal.label, sign: opFinal.sign, tag: opFinal.tag,
        raw: clause, matchScore: hit.score,
        qtyDetected: qtyInfo.qty != null,
        stockBefore: p.stock
      });
    });

    /* ادغام اقلام تکراری با عملیات یکسان */
    var merged = [];
    items.forEach(function (it) {
      var ex = merged.filter(function (m) { return m.pid === it.pid && m.op === it.op; })[0];
      if (ex) { ex.qty += it.qty; ex.raw += ' | ' + it.raw; return; }
      merged.push(it);
    });

    return {
      items: merged, unresolved: unresolved,
      saleQty: U.sum(merged.filter(function (i) { return i.op === 'sale'; }), function (i) { return i.qty; }),
      restockQty: U.sum(merged.filter(function (i) { return i.op === 'restock'; }), function (i) { return i.qty; }),
      wasteQty: U.sum(merged.filter(function (i) { return i.op === 'waste'; }), function (i) { return i.qty; }),
      returnQty: U.sum(merged.filter(function (i) { return i.op === 'return'; }), function (i) { return i.qty; }),
      countQty: U.sum(merged.filter(function (i) { return i.op === 'count'; }), function (i) { return i.qty; })
    };
  }

  /* ---------- اجرای نتیجه روی انبار ---------- */
  function apply(parsed, opt) {
    opt = opt || {};
    if (!parsed || !parsed.items || !parsed.items.length) throw new Error('چیزی برای ثبت پیدا نشد');
    var applied = [], errors = [], saleAdded = null;
    var saleItems = parsed.items.filter(function (i) { return i.op === 'sale'; });

    if (saleItems.length) {
      try {
        saleAdded = S.addSale({
          items: saleItems.map(function (i) { return { pid: i.pid, qty: i.qty, price: i.price }; }),
          payment: opt.payment || 'cash',
          note: opt.note || 'ثبت خودکار از پیام پایان روز',
          channel: 'message'
        });
        saleItems.forEach(function (i) { applied.push({ name: i.name, op: 'sale', qty: i.qty }); });
      } catch (e) {
        errors.push('فروش: ' + e.message);
      }
    }
    parsed.items.filter(function (i) { return i.op !== 'sale'; }).forEach(function (i) {
      try {
        if (i.op === 'restock') { S.adjustStock(i.pid, i.qty, 'in', 'افزایش از پیام پایان روز'); applied.push({ name: i.name, op: 'restock', qty: i.qty }); }
        else if (i.op === 'waste') { S.adjustStock(i.pid, -i.qty, 'waste', 'ضایعات از پیام پایان روز'); applied.push({ name: i.name, op: 'waste', qty: i.qty }); }
        else if (i.op === 'return') { S.adjustStock(i.pid, i.qty, 'return', 'مرجوعی از پیام پایان روز'); applied.push({ name: i.name, op: 'return', qty: i.qty }); }
        else if (i.op === 'count') { S.setStock(i.pid, i.qty, 'شمارش از پیام پایان روز'); applied.push({ name: i.name, op: 'count', qty: i.qty }); }
      } catch (e) { errors.push(i.name + ': ' + e.message); }
    });

    var msg = S.addMessage({
      id: U.uuid('msg'), at: Date.now(), raw: opt.raw || '',
      items: parsed.items.map(function (i) { return { pid: i.pid, name: i.name, op: i.op, qty: i.qty }; }),
      unresolved: parsed.unresolved, saleId: saleAdded ? saleAdded.id : null,
      errors: errors
    });
    return { applied: applied, errors: errors, sale: saleAdded, message: msg };
  }

  /* ---------- نمونه‌های آماده (برای راهنما در رابط کاربری) ---------- */
  var EXAMPLES = [
    'امروز ۳ تا نوشابه خانواده فروختم و ۵ عدد آب معدنی اضافه شد',
    '۱۲ عدد نان فروش رفت، ۲ بسته پنیر خراب شد دور ریختم',
    'شمارش انبار: نوشابه خانواده ۱۰، آب معدنی ۳۰',
    '۴ تا ماست فروختم و ۶ تا ماست جدید آوردم، یک دستمال مرجوعی برگشت'
  ];

  Shop.nlp = {
    parse: parse, apply: apply, splitClauses: splitClauses, stripOpWords: stripOpWords,
    wordsToNumber: wordsToNumber, extractQty: extractQty, matchProduct: matchProduct,
    OPS: OPS, EXAMPLES: EXAMPLES,
    opLabel: function (key) { var o = OPS.filter(function (x) { return x.key === key; })[0]; return o ? o.label : key; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
