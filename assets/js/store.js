/* ============================================================
   Shop Manager — Data Store  (لایه‌ی داده و منطق کسب‌وکار)
   همه‌چیز در حافظه‌ی محلی مرورگر ذخیره می‌شود (بدون سرور).
   ============================================================ */
(function (root) {
  'use strict';
  var Shop = (root.Shop = root.Shop || {});
  var U = Shop.U;

  var KEY = 'shopmanager.db.v4';
  var KEY_BAK = 'shopmanager.backup.v4';
  var DB = null;

  var DEFAULT_ACCOUNT = { username: 'admin', password: 'admin123' };

  /* ---------- داده‌ی نمونه (فقط بار اول) ---------- */
  function seed() {
    var now = Date.now();
    var cats = [
      { id: 'c1', name: 'مواد غذایی', icon: '🛒', color: '#0e9f6e', keywords: ['خوراکی', 'غذا', 'بسته خوراکی', 'خوراک'], order: 1 },
      { id: 'c2', name: 'نوشیدنی', icon: '🥤', color: '#2563eb', keywords: ['آب', 'نوشابه', 'دوغ', 'آبمیوه', 'چای', 'قهوه'], order: 2 },
      { id: 'c3', name: 'لبنیات', icon: '🧀', color: '#f59e0b', keywords: ['شیر', 'ماست', 'پنیر', 'کره', 'خامه'], order: 3 },
      { id: 'c4', name: 'شوینده و بهداشتی', icon: '🧼', color: '#8b5cf6', keywords: ['شامپو', 'صابون', 'مایع', 'دستمال', 'بهداشتی'], order: 4 },
      { id: 'c5', name: 'لوازم‌التحریر', icon: '📚', color: '#ef4444', keywords: ['دفتر', 'خودکار', 'مداد', 'کاغذ'], order: 5 },
      { id: 'c6', name: 'خوراکی و تنقلات', icon: '🍫', color: '#ec4899', keywords: ['چیپس', 'پفک', 'شکلات', 'بیسکویت', 'آجیل'], order: 6 }
    ];
    var raw = [
      ['برنج ایرانی هاشمی ۵ کیلویی', 'c1', 'کیسه', 620000, 795000, 12, 4, 'کارخانه شالی‌کاری', 'قفسه A1'],
      ['روغن مایع سرخ‌کردنی ۱٫۸ لیتری', 'c1', 'بطری', 105000, 132000, 20, 6, 'پخش سراسری', 'قفسه A2'],
      ['ماکارونی ۷۰۰ گرمی رشته‌ای', 'c1', 'بسته', 28000, 38000, 34, 10, 'ماکارونی سازان', 'قفسه A3'],
      ['رب گوجه فرنگی ۸۰۰ گرمی', 'c1', 'قوطی', 62000, 79000, 18, 6, 'صنایع غذایی', 'قفسه A4'],
      ['شکر بسته ۹۰۰ گرمی', 'c1', 'بسته', 32000, 42000, 22, 8, 'پخش مواد غذایی', 'قفسه A5'],
      ['آب معدنی ۱٫۵ لیتری', 'c2', 'بطری', 9500, 15000, 60, 24, 'شرکت آب', 'ویترین'],
      ['نوشابه خانواده ۱٫۵ لیتری', 'c2', 'بطری', 28000, 38000, 40, 12, 'پخش نوشیدنی', 'ویترین'],
      ['چای سیاه شکسته ۵۰۰ گرمی', 'c2', 'بسته', 165000, 210000, 9, 4, 'چای ایران', 'قفسه B1'],
      ['قهوه فوری ۱۰۰ گرمی', 'c2', 'شیشه', 240000, 315000, 5, 2, 'پخش قهوه', 'قفسه B2'],
      ['شیر پرچرب ۱ لیتری', 'c3', 'عدد', 34000, 44000, 16, 8, 'لبنیات دامداران', 'یخچال ۱'],
      ['ماست پرچرب ۲ کیلوگرمی', 'c3', 'ظرف', 98000, 125000, 8, 4, 'لبنیات دامداران', 'یخچال ۱'],
      ['پنیر سفید ۴۰۰ گرمی', 'c3', 'بسته', 88000, 112000, 10, 5, 'پنیر پگاه', 'یخچال ۲'],
      ['کره حیوانی ۱۰۰ گرمی', 'c3', 'بسته', 62000, 79000, 6, 3, 'لبنیات', 'یخچال ۲'],
      ['شامپو گیاهی ۴۰۰ میلی‌لیتر', 'c4', 'عدد', 118000, 155000, 7, 3, 'پخش بهداشتی', 'قفسه C1'],
      ['مایع ظرفشویی ۱ لیتری', 'c4', 'بطری', 76000, 99000, 14, 6, 'پخش بهداشتی', 'قفسه C2'],
      ['دستمال کاغذی ۳۰۰ برگ', 'c4', 'بسته', 52000, 68000, 25, 10, 'پخش کاغذ', 'قفسه C3'],
      ['خمیردندان ۱۰۰ میلی‌لیتری', 'c4', 'عدد', 68000, 89000, 12, 5, 'پخش بهداشتی', 'قفسه C4'],
      ['دفتر مشق ۱۰۰ برگ', 'c5', 'عدد', 42000, 58000, 30, 10, 'لوازم‌التحریر پارس', 'قفسه D1'],
      ['خودکار بیک آبی', 'c5', 'عدد', 12000, 20000, 80, 25, 'لوازم‌التحریر پارس', 'قفسه D2'],
      ['مداد مشکی HB', 'c5', 'عدد', 8000, 14000, 55, 20, 'لوازم‌التحریر پارس', 'قفسه D2'],
      ['چیپس نمکی ۷۰ گرمی', 'c6', 'بسته', 22000, 32000, 48, 15, 'پخش تنقلات', 'قفسه E1'],
      ['شکلات تخته‌ای ۱۰۰ گرمی', 'c6', 'عدد', 48000, 65000, 26, 10, 'پخش تنقلات', 'قفسه E2'],
      ['پفک نمکی ۶۰ گرمی', 'c6', 'بسته', 18000, 27000, 33, 12, 'پخش تنقلات', 'قفسه E1'],
      ['بیسکویت ساقه‌دار', 'c6', 'بسته', 15000, 23000, 41, 12, 'پخش تنقلات', 'قفسه E3'],
      ['نان بربری تازه', 'c1', 'عدد', 25000, 35000, 18, 8, 'نانوایی محله', 'سبد نان'],
      ['تخم مرغ بسته ۹ عددی', 'c3', 'بسته', 78000, 99000, 14, 6, 'مرغداری', 'یخچال ۲']
    ];
    var products = raw.map(function (r, i) {
      var p = {
        id: 'p' + (i + 1),
        sku: 'SKU-' + U.pad(i + 1, 4),
        barcode: Shop.barcode.makeInternalEAN(i + 1),
        name: r[0], categoryId: r[1], unit: r[2],
        cost: r[3], price: r[4], wholesale: U.roundTo(r[4] * 0.94, 1000), tax: 0,
        stock: r[5], minStock: r[6], supplier: r[7], location: r[8],
        brand: '', tags: [], image: '', gallery: [], fp: null,
        description: '', specs: [], variants: [], custom: [],
        active: true, soldTotal: 0, lastSaleAt: null, expiry: null,
        createdAt: now, updatedAt: now
      };
      return p;
    });

    /* چند فروش نمونه در ۳۰ روز گذشته برای اینکه داشبورد زنده باشد */
    var sales = [], moves = [], saleNo = 1;
    for (var d = 29; d >= 0; d--) {
      var cnt = 2 + Math.round(Math.random() * 4);
      for (var k = 0; k < cnt; k++) {
        var at = new Date(now - d * 86400000);
        at.setHours(9 + Math.floor(Math.random() * 11), Math.floor(Math.random() * 60), 0, 0);
        var items = [], sub = 0, pr = 0;
        var picks = 1 + Math.floor(Math.random() * 3);
        var used = {};
        for (var m = 0; m < picks; m++) {
          var idx = Math.floor(Math.random() * products.length);
          if (used[idx]) continue;
          used[idx] = 1;
          var prod = products[idx];
          var qty = 1 + Math.floor(Math.random() * 3);
          if (prod.stock < qty + 2) continue;
          prod.stock -= qty;
          prod.soldTotal += qty;
          prod.lastSaleAt = at.getTime();
          items.push({ pid: prod.id, name: prod.name, qty: qty, price: prod.price, cost: prod.cost, discount: 0 });
          moves.push({
            id: U.uuid('m'), at: at.getTime(), pid: prod.id, type: 'sale', qty: -qty,
            before: prod.stock + qty, after: prod.stock, note: 'فروش (داده‌ی نمونه)', source: 'seed'
          });
          sub += prod.price * qty; pr += (prod.price - prod.cost) * qty;
        }
        if (!items.length) continue;
        var disc = Math.random() < 0.25 ? Math.round(sub * 0.03 / 1000) * 1000 : 0;
        sales.push({
          id: U.uuid('s'), no: saleNo++, at: at.getTime(), items: items,
          subtotal: sub, discount: disc, tax: 0, total: sub - disc, profit: pr - disc,
          payment: Math.random() < 0.7 ? 'cash' : 'card', customer: null, note: '',
          channel: 'pos'
        });
      }
    }
    sales.sort(function (a, b) { return a.at - b.at; });

    return {
      v: 4,
      shop: {
        name: 'فروشگاه نمونه برکت', logo: '🛍️', tagline: 'تازه، سریع و منصفانه',
        phone: '۰۲۱-۱۲۳۴۵۶۷۸', address: 'تهران، خیابان نمونه، پلاک ۱۲',
        currency: 'تومان', instagram: '', whatsapp: '', mapUrl: '',
        hours: 'هر روز ۸ تا ۲۲', notice: 'ارسال رایگان سفارش‌های بالای ۵۰۰ هزار تومان'
      },
      settings: {
        theme: 'emerald',
        admin: (function () {
          var salt = U.makeSalt();
          return { username: DEFAULT_ACCOUNT.username, salt: salt, hash: U.hashPassword(DEFAULT_ACCOUNT.password, salt) };
        })(),
        defaultProfit: 25, rounding: 'none', allowNegativeStock: false,
        lowStockDefault: 5, expiryWarnDays: 30, showPricesToGuests: true,
        firstRun: true
      },
      notify: {
        enabled: false, channel: 'email', target: 'owner@example.com',
        frequency: 'daily', time: '21:00', weekday: 6, dayOfMonth: 1,
        include: { sales: true, profit: true, lowStock: true, value: true, top: true, dead: true, expiry: true, cash: true },
        lastSent: null, history: []
      },
      categories: cats,
      products: products,
      sales: sales,
      movements: moves.slice(-400),
      stocktakes: [],
      messages: [],
      favorites: [], cart: {}, logs: [],
      counters: { product: products.length + 1, sale: saleNo, category: cats.length + 1, barcode: products.length + 1 },
      meta: { createdAt: now, lastBackup: null, installId: U.uuid('inst'), version: 4 }
    };
  }

  /* ---------- بارگذاری/ذخیره ---------- */
  function migrate(db) {
    db.v = db.v || 1;
    if (db.v < 4) {
      /* نسخه‌های قدیمی‌تر: فیلدهای جدید را با مقدار پیش‌فرض پر کن */
      db.shop = db.shop || {};
      db.settings = db.settings || {};
      db.notify = db.notify || { enabled: false, channel: 'none', target: '', frequency: 'daily', time: '21:00', include: {} };
      db.movements = db.movements || [];
      db.stocktakes = db.stocktakes || [];
      db.messages = db.messages || [];
      db.favorites = db.favorites || [];
      db.logs = db.logs || [];
      db.counters = db.counters || { product: 1, sale: 1, category: 1, barcode: 1 };
      (db.products || []).forEach(function (p) {
        p.tags = p.tags || []; p.gallery = p.gallery || []; p.specs = p.specs || [];
        p.variants = p.variants || []; p.custom = p.custom || [];
        p.minStock = p.minStock == null ? (db.settings.lowStockDefault || 5) : p.minStock;
        p.active = p.active !== false;
        if (!p.barcode && Shop.barcode) p.barcode = Shop.barcode.makeInternalEAN(db.counters.barcode++);
      });
      db.v = 4;
    }
    return db;
  }

  function load() {
    if (DB) return DB;
    var db = U.store.get(KEY, null);
    if (!db) {
      db = seed();
      U.store.set(KEY, db);
    } else {
      db = migrate(db);
    }
    DB = db;
    return DB;
  }
  function save() {
    if (!DB) return false;
    var ok = U.store.set(KEY, DB);
    if (!ok) U.toast('حافظه‌ی مرورگر پر شده است؛ از بخش پشتیبان‌گیری، فایل پشتیبان بگیرید.', 'err', 5000);
    /* پشتیبان خودکار روزانه در کلید جداگانه */
    var last = U.store.get('shopmanager.autobak.date', null);
    var today = U.dayKey();
    if (last !== today) {
      try { U.store.set(KEY_BAK, DB); U.store.set('shopmanager.autobak.date', today); } catch (e) { }
    }
    return ok;
  }
  function reset(keepShopInfo) {
    var s = DB && DB.shop;
    var n = DB && DB.notify;
    var acc = DB && DB.settings && DB.settings.admin;
    DB = seed();
    if (keepShopInfo) { DB.shop = s; DB.notify = n || DB.notify; if (acc) DB.settings.admin = acc; }
    save();
    return DB;
  }
  function log(action, detail) {
    DB.logs.unshift({ at: Date.now(), actor: 'مدیر', action: action, detail: detail || '' });
    if (DB.logs.length > 300) DB.logs.length = 300;
  }

  /* ---------- دسته‌بندی‌ها ---------- */
  function listCategories() {
    return DB.categories.slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
  }
  function getCategory(id) {
    for (var i = 0; i < DB.categories.length; i++) if (DB.categories[i].id === id) return DB.categories[i];
    return null;
  }
  function categoryPath(id) {
    var c = getCategory(id), parts = [], guard = 0;
    while (c && guard++ < 6) { parts.unshift(c.name); c = c.parentId ? getCategory(c.parentId) : null; }
    return parts.join(' › ');
  }
  function categoryStats() {
    var map = {};
    DB.categories.forEach(function (c) { map[c.id] = { id: c.id, name: c.name, icon: c.icon, color: c.color, count: 0, stock: 0, value: 0 }; });
    DB.products.forEach(function (p) {
      if (!map[p.categoryId]) return;
      map[p.categoryId].count++;
      map[p.categoryId].stock += p.stock;
      map[p.categoryId].value += p.stock * (p.cost || 0);
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }
  function saveCategory(cat) {
    var c = U.clone(cat || {});
    if (!c.name) throw new Error('نام دسته‌بندی الزامی است');
    if (c.id) {
      var idx = DB.categories.findIndex(function (x) { return x.id === c.id; });
      if (idx < 0) throw new Error('دسته‌بندی پیدا نشد');
      if (c.parentId === c.id) c.parentId = null;
      DB.categories[idx] = Object.assign(DB.categories[idx], c);
      log('ویرایش دسته‌بندی', c.name);
    } else {
      c.id = 'c' + (DB.counters.category++);
      c.keywords = c.keywords || [];
      c.order = c.order == null ? DB.categories.length + 1 : c.order;
      c.color = c.color || '#0e9f6e';
      c.icon = c.icon || '📦';
      DB.categories.push(c);
      log('دسته‌بندی جدید', c.name);
    }
    save();
    return c;
  }
  function removeCategory(id, moveToCategoryId) {
    var used = DB.products.filter(function (p) { return p.categoryId === id; });
    if (used.length && !moveToCategoryId) throw new Error('این دسته ' + U.toFa(used.length) + ' جنس دارد؛ ابتدا دسته‌ی مقصد را انتخاب کنید');
    used.forEach(function (p) { p.categoryId = moveToCategoryId || null; });
    DB.categories = DB.categories.filter(function (c) { return c.id !== id && c.parentId !== id; });
    log('حذف دسته‌بندی', id);
    save();
    return used.length;
  }

  /* ---------- محصولات ---------- */
  function allProducts() { return DB.products; }
  function getProduct(id) {
    for (var i = 0; i < DB.products.length; i++) if (DB.products[i].id === id) return DB.products[i];
    return null;
  }
  function nextBarcode() {
    if (Shop.barcode) return Shop.barcode.makeInternalEAN(DB.counters.barcode);
    return '20000000' + U.pad(DB.counters.barcode, 4);
  }
  function uniqueBarcode(code, selfId) {
    var c = String(U.toEn(code || '')).replace(/\D/g, '');
    if (!c) return nextBarcode();
    var dup = DB.products.filter(function (p) { return p.barcode === c && p.id !== selfId; });
    if (dup.length) throw new Error('این بارکد برای «' + dup[0].name + '» ثبت شده است');
    return c;
  }
  function normalizeProduct(p) {
    var out = Object.assign({}, p);
    out.name = String(out.name || '').trim();
    if (!out.name) throw new Error('نام جنس الزامی است');
    out.cost = Math.max(0, U.num(out.cost));
    out.price = Math.max(0, U.num(out.price));
    out.wholesale = Math.max(0, U.num(out.wholesale));
    out.tax = U.clamp(U.num(out.tax), 0, 100);
    out.stock = U.num(out.stock);
    out.minStock = Math.max(0, U.num(out.minStock));
    out.unit = out.unit || 'عدد';
    out.tags = (out.tags || []).map(function (t) { return String(t).trim(); }).filter(Boolean).slice(0, 12);
    out.specs = (out.specs || []).filter(function (s) { return s && (s.k || s.v); }).slice(0, 20);
    out.custom = (out.custom || []).filter(function (s) { return s && (s.k || s.v); }).slice(0, 12);
    out.variants = (out.variants || []).filter(function (v) { return v && v.name; }).slice(0, 6);
    out.expiry = out.expiry || null;
    return out;
  }
  function saveProduct(p) {
    var data = normalizeProduct(p);
    data.updatedAt = Date.now();
    if (data.id) {
      var idx = DB.products.findIndex(function (x) { return x.id === data.id; });
      if (idx < 0) throw new Error('جنس پیدا نشد');
      var prev = DB.products[idx];
      data.barcode = uniqueBarcode(data.barcode, data.id);
      data.createdAt = prev.createdAt || Date.now();
      data.soldTotal = prev.soldTotal || 0;
      data.lastSaleAt = prev.lastSaleAt || null;
      DB.products[idx] = data;
      if (prev.stock !== data.stock) {
        addMovement(data.id, 'adjust', data.stock - prev.stock, prev.stock, data.stock, 'ویرایش دستی موجودی');
      }
      log('ویرایش جنس', data.name);
    } else {
      data.id = 'p' + (DB.counters.product++);
      data.barcode = uniqueBarcode(data.barcode, null);
      data.createdAt = Date.now();
      data.soldTotal = 0;
      data.image = data.image || '';
      DB.products.push(data);
      if (data.stock) addMovement(data.id, 'in', data.stock, 0, data.stock, 'موجودی اولیه');
      log('جنس جدید', data.name);
    }
    save();
    return data;
  }
  function removeProduct(id) {
    DB.products = DB.products.filter(function (p) { return p.id !== id; });
    DB.movements = DB.movements.filter(function (m) { return m.pid !== id; });
    DB.favorites = DB.favorites.filter(function (f) { return f !== id; });
    delete DB.cart[id];
    log('حذف جنس', id);
    save();
  }
  function addMovement(pid, type, qty, before, after, note) {
    DB.movements.unshift({
      id: U.uuid('m'), at: Date.now(), pid: pid, type: type, qty: qty,
      before: before, after: after, note: note || ''
    });
    if (DB.movements.length > 2000) DB.movements.length = 2000;
  }
  /* تغییر موجودی با ثبت گردش */
  function adjustStock(pid, delta, type, note) {
    var p = getProduct(pid);
    if (!p) throw new Error('جنس پیدا نشد');
    var before = p.stock;
    var after = before + delta;
    if (after < 0 && !DB.settings.allowNegativeStock) throw new Error('موجودی «' + p.name + '» کافی نیست (موجودی: ' + U.toFa(U.group(before)) + ')');
    p.stock = after;
    p.updatedAt = Date.now();
    addMovement(pid, type || 'adjust', delta, before, after, note);
    save();
    return p;
  }
  function setStock(pid, value, note) {
    var p = getProduct(pid);
    if (!p) throw new Error('جنس پیدا نشد');
    return adjustStock(pid, U.num(value) - p.stock, 'stocktake', note || 'انبارگردانی');
  }
  function findByBarcode(code) {
    var c = String(U.toEn(code || '')).replace(/\s/g, '');
    if (!c) return null;
    for (var i = 0; i < DB.products.length; i++) {
      var p = DB.products[i];
      if (p.barcode === c || p.sku === c) return p;
    }
    return null;
  }
  /* جست‌وجو و فیلتر */
  function searchProducts(opt) {
    opt = opt || {};
    var q = opt.q, cat = opt.cat, list = DB.products.slice();
    if (opt.activeOnly) list = list.filter(function (p) { return p.active !== false; });
    if (cat) {
      var kids = DB.categories.filter(function (c) { return c.parentId === cat; }).map(function (c) { return c.id; });
      var ids = [cat].concat(kids);
      list = list.filter(function (p) { return ids.indexOf(p.categoryId) > -1; });
    }
    if (opt.lowOnly) list = list.filter(function (p) { return p.stock <= (p.minStock || 0); });
    if (opt.outOnly) list = list.filter(function (p) { return p.stock <= 0; });
    if (q) {
      list = list.map(function (p) {
        var hay = p.name + ' ' + (p.brand || '') + ' ' + (p.tags || []).join(' ') + ' ' + (p.sku || '') + ' ' + (p.barcode || '') + ' ' + (p.supplier || '');
        return { p: p, s: U.matchScore(q, hay, p.tags) + (p.barcode && String(p.barcode).indexOf(U.toEn(q)) > -1 ? 1 : 0) };
      }).filter(function (x) { return x.s > 0.42; })
        .sort(function (a, b) { return b.s - a.s; })
        .map(function (x) { x.p._score = x.s; return x.p; });
    }
    var sort = opt.sort || 'name';
    var sorters = {
      name: function (a, b) { return a.name.localeCompare(b.name, 'fa'); },
      newest: function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); },
      priceAsc: function (a, b) { return a.price - b.price; },
      priceDesc: function (a, b) { return b.price - a.price; },
      stockAsc: function (a, b) { return a.stock - b.stock; },
      stockDesc: function (a, b) { return b.stock - a.stock; },
      sold: function (a, b) { return (b.soldTotal || 0) - (a.soldTotal || 0); },
      value: function (a, b) { return b.stock * b.cost - a.stock * a.cost; }
    };
    if (!q && sorters[sort]) list.sort(sorters[sort]);
    return list;
  }
  function effectivePrice(p, qty) {
    var price = U.num(p.price);
    var discount = 0;
    return price;
  }
  function priceForQty(p, qty) {
    qty = U.num(qty) || 1;
    var v = (p.variants || []).filter(function (x) { return x.name; });
    return U.num(p.price);
  }
  /* تغییر گروهی قیمت‌ها */
  function bulkPrice(opt) {
    var ids = opt.ids && opt.ids.length ? opt.ids : DB.products.map(function (p) { return p.id; });
    var changed = 0;
    ids.forEach(function (id) {
      var p = getProduct(id);
      if (!p) return;
      var base = opt.basis === 'cost' ? p.cost : p.price;
      var val = 0;
      if (opt.mode === 'pct') val = base * (1 + opt.value / 100);
      else if (opt.mode === 'set') val = opt.value;
      else if (opt.mode === 'add') val = p.price + opt.value;
      else if (opt.mode === 'round') val = p.price;
      if (opt.rounding && opt.rounding !== 'none') {
        var step = opt.rounding === 'up' ? 1000 : opt.rounding === 'up500' ? 500 : 1000;
        val = opt.rounding === 'up' ? Math.ceil(val / step) * step : Math.floor(val / step) * step;
      }
      if (opt.mode !== 'set' && opt.mode !== 'round' && opt.basis === 'cost') {
        /* وقتی پایه قیمت خرید است، باید سود هدف لحاظ شود */
        val = opt.mode === 'pct' ? base * (1 + opt.value / 100) : val;
      }
      val = Math.max(0, Math.round(val));
      if (val !== p.price) { p.price = val; p.updatedAt = Date.now(); changed++; }
    });
    if (changed) { log('تغییر گروهی قیمت', U.toFa(changed) + ' جنس'); save(); }
    return changed;
  }

  /* ---------- فروش ---------- */
  function addSale(input) {
    var items = (input.items || []).map(function (it) {
      var p = getProduct(it.pid);
      if (!p) throw new Error('جنس پیدا نشد');
      var qty = U.num(it.qty);
      if (qty <= 0) throw new Error('تعداد نامعتبر برای «' + p.name + '»');
      if (p.stock < qty && !DB.settings.allowNegativeStock) throw new Error('موجودی «' + p.name + '» کافی نیست (موجودی: ' + U.toFa(U.group(p.stock)) + ')');
      return {
        pid: p.id, name: p.name, qty: qty, price: U.num(it.price != null ? it.price : p.price),
        cost: U.num(p.cost), discount: U.num(it.discount || 0)
      };
    });
    if (!items.length) throw new Error('سبد خالی است');
    var subtotal = U.sum(items, function (i) { return i.price * i.qty - i.discount; });
    var discount = U.num(input.discount || 0);
    var taxPct = U.num(input.taxPct || 0);
    var tax = Math.round((subtotal - discount) * taxPct / 100);
    var total = subtotal - discount + tax;
    var profit = U.sum(items, function (i) { return (i.price - i.cost) * i.qty - i.discount; }) - discount;
    var sale = {
      id: U.uuid('s'), no: DB.counters.sale++, at: Date.now(), items: items,
      subtotal: subtotal, discount: discount, tax: tax, taxPct: taxPct, total: total,
      profit: profit, payment: input.payment || 'cash',
      customer: input.customer || null, note: input.note || '',
      channel: input.channel || 'pos'
    };
    /* موجودی */
    items.forEach(function (it) {
      var p = getProduct(it.pid);
      var before = p.stock;
      p.stock = before - it.qty;
      p.soldTotal = (p.soldTotal || 0) + it.qty;
      p.lastSaleAt = sale.at;
      p.updatedAt = sale.at;
      addMovement(p.id, 'sale', -it.qty, before, p.stock, 'فاکتور ' + U.toFa(sale.no));
    });
    DB.sales.push(sale);
    log('فروش', 'فاکتور ' + U.toFa(sale.no) + ' — ' + U.toman(total));
    save();
    return sale;
  }
  function removeSale(id) {
    var idx = DB.sales.findIndex(function (s) { return s.id === id; });
    if (idx < 0) throw new Error('فاکتور پیدا نشد');
    var sale = DB.sales[idx];
    sale.items.forEach(function (it) {
      var p = getProduct(it.pid);
      if (!p) return;
      var before = p.stock;
      p.stock = before + it.qty;
      p.soldTotal = Math.max(0, (p.soldTotal || 0) - it.qty);
      addMovement(p.id, 'return', it.qty, before, p.stock, 'برگشت فاکتور ' + U.toFa(sale.no));
    });
    DB.sales.splice(idx, 1);
    log('برگشت فروش', 'فاکتور ' + U.toFa(sale.no));
    save();
    return sale;
  }
  function salesInRange(from, to) {
    from = from || 0; to = to || Date.now();
    return DB.sales.filter(function (s) { return s.at >= from && s.at <= to; });
  }

  /* ---------- ماشین‌حساب قیمت ---------- */
  var pricing = {
    margin: function (cost, price) { return price > 0 ? (price - cost) / price * 100 : 0; },
    markup: function (cost, price) { return cost > 0 ? (price - cost) / cost * 100 : 0; },
    fromMargin: function (cost, marginPct) { return marginPct >= 100 ? cost : cost / (1 - marginPct / 100); },
    fromMarkup: function (cost, markupPct) { return cost * (1 + markupPct / 100); },
    /* قیمت پیشنهادی پس از تغییر درصدی */
    /* افزایش/کاهش قیمت: mode='pct' درصدی (پیش‌فرض) یا 'add' مبلغی — همیشه عدد صحیح برمی‌گرداند */
    shift: function (price, amount, mode) {
      price = U.num(price); amount = U.num(amount);
      var v = mode === 'add' ? price + amount : price * (1 + amount / 100);
      return Math.round(v);
    },
    /* اثر تخفیف بر سود */
    discountEffect: function (cost, price, discPct) {
      var newPrice = price * (1 - discPct / 100);
      return {
        newPrice: newPrice, profit: newPrice - cost,
        margin: pricing.margin(cost, newPrice),
        lostProfit: price - newPrice,
        warn: newPrice < cost
      };
    },
    /* حاشیه‌ی سود لازم برای رسیدن به سود هدف با هزینه‌های ثابت */
    breakEven: function (fixedCosts, unitProfit) {
      return unitProfit > 0 ? Math.ceil(fixedCosts / unitProfit) : Infinity;
    },
    round: function (value, mode) {
      value = U.num(value);
      if (mode === 'up1000') return Math.ceil(value / 1000) * 1000;
      if (mode === 'down1000') return Math.floor(value / 1000) * 1000;
      if (mode === 'up500') return Math.ceil(value / 500) * 500;
      if (mode === 'up100') return Math.ceil(value / 100) * 100;
      if (mode === 'down500') return Math.floor(value / 500) * 500;
      return Math.round(value);
    },
    /* فاکتور درصد معکوس: از قیمت نهایی به درصد تغییر */
    reverse: function (oldPrice, newPrice) { return oldPrice > 0 ? (newPrice - oldPrice) / oldPrice * 100 : 0; },
    /* سود مورد انتظار در فروش تعداد مشخص */
    projectProfit: function (cost, price, qty) { return (U.num(price) - U.num(cost)) * U.num(qty); },
    /* تحلیل کامل یک جنس */
    analyze: function (p) {
      var cost = U.num(p.cost), price = U.num(p.price), ws = U.num(p.wholesale);
      var m = pricing.margin(cost, price), mk = pricing.markup(cost, price);
      var daily = 0, d = (p.soldTotal || 0);
      var days = p.lastSaleAt ? Math.max(1, (Date.now() - (p.createdAt || p.lastSaleAt)) / 86400000) : 1;
      daily = (p.soldTotal || 0) / Math.min(365, days);
      var coverDays = daily > 0.01 ? p.stock / daily : null;
      return {
        margin: m, markup: mk, profitUnit: price - cost,
        profitPctOfCost: cost > 0 ? (price - cost) / cost * 100 : 0,
        wholesaleMargin: pricing.margin(cost, ws),
        stockValue: p.stock * cost, retailValue: p.stock * price,
        dailySales: daily, coverDays: coverDays,
        suggested: pricing.round(pricing.fromMarkup(cost, DB.settings.defaultProfit || 25), 'up500'),
        level: (p.stock <= 0 ? 'out' : (p.stock <= (p.minStock || 0) ? 'low' : (coverDays != null && coverDays > 120 ? 'dead' : 'ok')))
      };
    }
  };

  /* ---------- تحلیل و گزارش ---------- */
  function stats(from, to) {
    var sales = salesInRange(from, to);
    var revenue = U.sum(sales, function (s) { return s.total; });
    var profit = U.sum(sales, function (s) { return s.profit; });
    var cost = U.sum(sales, function (s) { return U.sum(s.items, function (i) { return i.cost * i.qty; }); });
    var items = U.sum(sales, function (s) { return U.sum(s.items, function (i) { return i.qty; }); });
    var byDay = {}, byCat = {}, byPayment = { cash: 0, card: 0, credit: 0 }, byProduct = {};
    sales.forEach(function (s) {
      var k = U.dayKey(s.at);
      byDay[k] = byDay[k] || { key: k, revenue: 0, profit: 0, orders: 0, items: 0, at: s.at };
      byDay[k].revenue += s.total; byDay[k].profit += s.profit; byDay[k].orders++; byDay[k].items += U.sum(s.items, function (i) { return i.qty; });
      s.items.forEach(function (i) {
        var p = getProduct(i.pid);
        var cid = p ? p.categoryId : null;
        byCat[cid] = byCat[cid] || { id: cid, name: cid ? categoryPath(cid) : 'بدون دسته', revenue: 0, qty: 0, profit: 0 };
        byCat[cid].revenue += i.price * i.qty; byCat[cid].qty += i.qty;
        byCat[cid].profit += (i.price - i.cost) * i.qty;
        byProduct[i.pid] = byProduct[i.pid] || { pid: i.pid, name: i.name, qty: 0, revenue: 0, profit: 0 };
        byProduct[i.pid].qty += i.qty;
        byProduct[i.pid].revenue += i.price * i.qty;
        byProduct[i.pid].profit += (i.price - i.cost) * i.qty;
      });
      byPayment[s.payment || 'cash'] = (byPayment[s.payment || 'cash'] || 0) + s.total;
    });
    var days = Object.keys(byDay).map(function (k) { return byDay[k]; }).sort(function (a, b) { return a.key < b.key ? -1 : 1; });
    return {
      from: from, to: to, orders: sales.length, items: items,
      revenue: revenue, profit: profit, cost: cost,
      avgOrder: sales.length ? revenue / sales.length : 0,
      margin: revenue > 0 ? profit / revenue * 100 : 0,
      byDay: days, byCat: Object.keys(byCat).map(function (k) { return byCat[k]; }).sort(function (a, b) { return b.revenue - a.revenue; }),
      byPayment: byPayment,
      topProducts: Object.keys(byProduct).map(function (k) { return byProduct[k]; }).sort(function (a, b) { return b.qty - a.qty; }),
      sales: sales
    };
  }
  function stockSummary() {
    var low = [], out = [], dead = [], expiring = [], value = 0, retail = 0, units = 0;
    var now = Date.now(), warnDays = DB.settings.expiryWarnDays || 30;
    DB.products.forEach(function (p) {
      value += p.stock * p.cost; retail += p.stock * p.price; units += p.stock;
      if (p.stock <= 0) out.push(p);
      else if (p.stock <= (p.minStock || 0)) low.push(p);
      if (p.expiry) {
        var d = (new Date(p.expiry).getTime() - now) / 86400000;
        if (((p.expiry + '').length <= 10 ? Math.ceil(d) : Math.ceil(d)) <= warnDays) expiring.push({ p: p, days: Math.ceil(d) });
      }
      var last = p.lastSaleAt || p.createdAt;
      if (p.stock > 0 && last && (now - last) / 86400000 > 90) dead.push({ p: p, days: Math.floor((now - last) / 86400000) });
    });
    return {
      value: value, retail: retail, units: units, count: DB.products.length,
      low: low, out: out, dead: dead.sort(function (a, b) { return b.days - a.days; }),
      expiring: expiring.sort(function (a, b) { return a.days - b.days; }),
      potentialProfit: retail - value
    };
  }
  /* پیش‌بینی نیاز به سفارش بر پایه‌ی میانگین فروش ۳۰ روز */
  function restockSuggestions(daysAhead) {
    daysAhead = daysAhead || 14;
    var st = stats(Date.now() - 30 * 86400000, Date.now());
    var qtyMap = {};
    st.topProducts.forEach(function (t) { qtyMap[t.pid] = t.qty; });
    var out = [];
    DB.products.forEach(function (p) {
      var sold30 = qtyMap[p.id] || 0;
      var perDay = sold30 / 30;
      var need = Math.ceil(perDay * daysAhead);
      var target = need + (p.minStock || 0);
      if (need <= 0 && p.stock > (p.minStock || 0)) return;
      if (p.stock >= target) return;
      out.push({
        p: p, sold30: sold30, perDay: perDay,
        order: Math.max(1, Math.ceil(target - p.stock)),
        cost: Math.max(1, Math.ceil(target - p.stock)) * p.cost,
        urgency: p.stock <= 0 ? 'out' : (p.stock <= (p.minStock || 0) ? 'low' : 'soon')
      });
    });
    return out.sort(function (a, b) { return (b.perDay * (b.p.price - b.p.cost)) - (a.perDay * (a.p.price - a.p.cost)); });
  }
  /* کالاهایی که با هم خریده می‌شوند (پیشنهاد به مشتری) */
  function basketPairs(pid) {
    var pairs = {};
    DB.sales.forEach(function (s) {
      var has = s.items.some(function (i) { return i.pid === pid; });
      if (!has) return;
      s.items.forEach(function (i) {
        if (i.pid === pid) return;
        pairs[i.pid] = (pairs[i.pid] || 0) + i.qty;
      });
    });
    return Object.keys(pairs).map(function (k) {
      return { product: getProduct(k), count: pairs[k] };
    }).filter(function (x) { return x.product; }).sort(function (a, b) { return b.count - a.count; }).slice(0, 4);
  }

  /* ---------- پشتیبان‌گیری ---------- */
  function exportJSON(opt) {
    opt = opt || {};
    var db = U.clone(DB);
    if (opt.withoutImages) {
      db.products.forEach(function (p) { p.image = ''; p.gallery = []; });
    }
    db.exportedAt = Date.now();
    db.meta = db.meta || {};
    db.meta.lastBackup = Date.now();
    DB.meta.lastBackup = Date.now();
    return JSON.stringify(db);
  }
  function importJSON(text, opt) {
    opt = opt || {};
    var data = typeof text === 'string' ? JSON.parse(text) : text;
    if (!data || typeof data !== 'object') throw new Error('ساختار فایل پشتیبان نامعتبر است');
    if (opt.merge) {
      if (data.categories) {
        data.categories.forEach(function (c) {
          if (!DB.categories.some(function (x) { return x.name === c.name; })) DB.categories.push(c);
        });
      }
      if (data.products) {
        data.products.forEach(function (p) {
          var ex = DB.products.filter(function (x) { return x.barcode && x.barcode === p.barcode; })[0];
          if (ex) {
            ex.stock += p.stock || 0;
            ex.price = p.price || ex.price;
            ex.cost = p.cost || ex.cost;
            ex.updatedAt = Date.now();
          } else {
            p.id = 'p' + (DB.counters.product++);
            DB.products.push(p);
          }
        });
      }
      save();
      return { merged: true, products: DB.products.length };
    }
    DB = migrate(data);
    save();
    return { merged: false, products: DB.products.length };
  }
  function csvExportProducts() {
    var rows = DB.products.map(function (p) {
      return [p.name, p.sku, p.barcode, categoryPath(p.categoryId), p.unit, p.cost, p.price, p.wholesale,
      p.stock, p.minStock, p.supplier, p.location, (p.tags || []).join('|'), p.brand, p.description, p.expiry || ''];
    });
    return U.toCSV(rows, ['نام', 'کد کالا', 'بارکد', 'دسته‌بندی', 'واحد', 'قیمت خرید', 'قیمت فروش', 'قیمت عمده', 'موجودی', 'حد بحرانی', 'تأمین‌کننده', 'محل قرارگیری', 'برچسب‌ها', 'برند', 'توضیحات', 'تاریخ انقضا']);
  }
  function csvTemplate() {
    return U.toCSV([
      ['شکلات تلخ ۱۰۰ گرمی', 'SKU-9001', '', 'خوراکی و تنقلات', 'عدد', '48000', '65000', '62000', '20', '5', 'پخش تنقلات', 'قفسه E2', 'شکلات|تلخ', 'برند نمونه', '', ''],
      ['ماست ۲ کیلویی', 'SKU-9002', '', 'لبنیات', 'ظرف', '98000', '125000', '', '10', '4', 'لبنیات دامداران', 'یخچال ۱', 'لبنی|تازه', '', '', '']
    ], ['نام', 'کد کالا', 'بارکد', 'دسته‌بندی', 'واحد', 'قیمت خرید', 'قیمت فروش', 'قیمت عمده', 'موجودی', 'حد بحرانی', 'تأمین‌کننده', 'محل قرارگیری', 'برچسب‌ها', 'برند', 'توضیحات', 'تاریخ انقضا']);
  }
  function csvImportProducts(text) {
    var rows = parseCSV(text);
    if (!rows.length) throw new Error('فایل خالی است');
    var head = rows[0].map(function (h) { return U.norm(h); });
    function col(names) {
      for (var i = 0; i < names.length; i++) {
        var n = U.norm(names[i]);
        for (var j = 0; j < head.length; j++) if (head[j].indexOf(n) > -1) return j;
      }
      return -1;
    }
    var ix = {
      name: col(['نام جنس', 'نام', 'کالا']), sku: col(['کد کالا', 'کد']), barcode: col(['بارکد', 'بارکد']),
      cat: col(['دسته']), unit: col(['واحد']), cost: col(['خرید', 'قیمت خرید']), price: col(['فروش', 'قیمت فروش']),
      ws: col(['عمده']), stock: col(['موجودی', 'تعداد']), min: col(['بحرانی', 'حداقل']),
      sup: col(['تأمین', 'تامین']), loc: col(['محل', 'قفسه']), tags: col(['برچسب']), brand: col(['برند']),
      desc: col(['توضیح']), exp: col(['انقضا'])
    };
    var added = 0, updated = 0, errors = [];
    rows.slice(1).forEach(function (r, i) {
      if (!r.length || !String(r[ix.name] || '').trim()) return;
      try {
        var catName = ix.cat > -1 ? String(r[ix.cat] || '').trim() : '';
        var cat = DB.categories.filter(function (c) { return U.similarity(c.name, catName) > 0.8; })[0];
        if (catName && !cat) cat = saveCategory({ name: catName, icon: '📦', keywords: [] });
        var bc = ix.barcode > -1 ? String(U.toEn(r[ix.barcode] || '')).replace(/\D/g, '') : '';
        var existing = bc ? DB.products.filter(function (p) { return p.barcode === bc; })[0] : null;
        var data = {
          name: String(r[ix.name]).trim(),
          sku: ix.sku > -1 ? String(r[ix.sku] || '').trim() : '',
          barcode: bc,
          categoryId: cat ? cat.id : null,
          unit: ix.unit > -1 && r[ix.unit] ? String(r[ix.unit]).trim() : 'عدد',
          cost: ix.cost > -1 ? U.num(r[ix.cost]) : 0,
          price: ix.price > -1 ? U.num(r[ix.price]) : 0,
          wholesale: ix.ws > -1 ? U.num(r[ix.ws]) : 0,
          stock: ix.stock > -1 ? U.num(r[ix.stock]) : 0,
          minStock: ix.min > -1 ? U.num(r[ix.min]) : (DB.settings.lowStockDefault || 5),
          supplier: ix.sup > -1 ? String(r[ix.sup] || '').trim() : '',
          location: ix.loc > -1 ? String(r[ix.loc] || '').trim() : '',
          tags: ix.tags > -1 ? String(r[ix.tags] || '').split(/[|،,]/).map(function (t) { return t.trim(); }).filter(Boolean) : [],
          brand: ix.brand > -1 ? String(r[ix.brand] || '').trim() : '',
          description: ix.desc > -1 ? String(r[ix.desc] || '').trim() : '',
          expiry: ix.exp > -1 && r[ix.exp] ? String(r[ix.exp]).trim() : null
        };
        if (existing) {
          delete data.barcode;
          saveProduct(Object.assign({}, existing, data));
          updated++;
        } else {
          saveProduct(data);
          added++;
        }
      } catch (e) { errors.push('ردیف ' + U.toFa(i + 2) + ': ' + e.message); }
    });
    return { added: added, updated: updated, errors: errors };
  }
  function parseCSV(text) {
    text = String(text).replace(/^\uFEFF/, '');
    var rows = [], row = [], cell = '', q = false, i = 0;
    var delim = (text.split('\n')[0].split(',').length >= text.split('\n')[0].split(';').length) ? ',' : ';';
    while (i < text.length) {
      var ch = text[i];
      if (q) {
        if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 2; continue; }
        if (ch === '"') { q = false; i++; continue; }
        cell += ch; i++; continue;
      }
      if (ch === '"') { q = true; i++; continue; }
      if (ch === delim) { row.push(cell); cell = ''; i++; continue; }
      if (ch === '\r') { i++; continue; }
      if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i++; continue; }
      cell += ch; i++;
    }
    if (cell.length || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (c) { return String(c).trim() !== ''; }); });
  }

  /* ---------- حساب مدیر ---------- */
  function verifyLogin(username, password) {
    var a = DB.settings.admin || {};
    return U.norm(String(username || '')) === U.norm(a.username || '') &&
      U.hashPassword(password || '', a.salt) === a.hash;
  }
  function seedSalt() { DB.settings.admin.salt = U.makeSalt(); }
  function changeLogin(username, newPassword, currentPassword) {
    if (!verifyLogin(DB.settings.admin.username, currentPassword)) throw new Error('رمز فعلی نادرست است');
    if (!newPassword || String(newPassword).length < 4) throw new Error('رمز جدید باید حداقل ۴ کاراکتر باشد');
    DB.settings.admin.username = String(username || DB.settings.admin.username).trim();
    DB.settings.admin.salt = U.makeSalt();
    DB.settings.admin.hash = U.hashPassword(newPassword, DB.settings.admin.salt);
    log('تغییر رمز مدیر', '');
    save();
  }

  /* ---------- لاگ پیام‌های روزانه ---------- */
  function addMessage(msg) {
    DB.messages.unshift(msg);
    if (DB.messages.length > 200) DB.messages.length = 200;
    save();
    return msg;
  }

  Shop.store = {
    KEY: KEY,
    DEFAULT_ACCOUNT: DEFAULT_ACCOUNT,
    get db() { return load(); },
    load: load, save: save, reset: reset, seed: seed, log: log,
    /* محصولات */
    allProducts: allProducts, getProduct: getProduct, saveProduct: saveProduct, removeProduct: removeProduct,
    searchProducts: searchProducts, findByBarcode: findByBarcode, nextBarcode: nextBarcode,
    adjustStock: adjustStock, setStock: setStock, bulkPrice: bulkPrice, addMovement: addMovement,
    /* دسته‌ها */
    listCategories: listCategories, getCategory: getCategory, categoryPath: categoryPath,
    categoryStats: categoryStats, saveCategory: saveCategory, removeCategory: removeCategory,
    /* فروش */
    addSale: addSale, removeSale: removeSale, salesInRange: salesInRange,
    /* تحلیل */
    stats: stats, stockSummary: stockSummary, restockSuggestions: restockSuggestions, basketPairs: basketPairs,
    pricing: pricing,
    /* پشتیبان */
    exportJSON: exportJSON, importJSON: importJSON,
    csvExportProducts: csvExportProducts, csvImportProducts: csvImportProducts, csvTemplate: csvTemplate,
    parseCSV: parseCSV,
    /* دسترسی مدیر */
    verifyLogin: verifyLogin, changeLogin: changeLogin,
    addMessage: addMessage
  };
})(typeof window !== 'undefined' ? window : globalThis);
