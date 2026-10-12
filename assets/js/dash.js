/* ============================================================
   Shop Manager — Admin Panel (پنل صاحب فروشگاه)
   ورود با نام کاربری/رمز + ۱۲ بخش مدیریتی
   ============================================================ */
(function (root) {
  'use strict';
  var Shop = (root.Shop = root.Shop || {});
  var U = Shop.U, UI = Shop.ui, N = Shop.notify, NLP = Shop.nlp;
  function DB() { return Shop.store.db; }
  function S() { return Shop.store; }

  var PAGES = [
    { id: 'dashboard', title: 'داشبورد', icon: 'dash' },
    { id: 'pos', title: 'فروش سریع (صندوق)', icon: 'cart' },
    { id: 'products', title: 'اجناس فروشگاه', icon: 'box' },
    { id: 'categories', title: 'دسته‌بندی‌ها', icon: 'tag' },
    { id: 'stock', title: 'انبار و موجودی', icon: 'wallet' },
    { id: 'invoices', title: 'فاکتورها و فروش', icon: 'clock' },
    { id: 'calculator', title: 'ماشین‌حساب قیمت', icon: 'calc' },
    { id: 'messages', title: 'پیام پایان روز', icon: 'msg' },
    { id: 'notify', title: 'اطلاع‌رسانی خودکار', icon: 'bell' },
    { id: 'settings', title: 'تنظیمات فروشگاه', icon: 'gear' },
    { id: 'backup', title: 'پشتیبان‌گیری', icon: 'download' },
    { id: 'help', title: 'راهنما و انتشار', icon: 'sparkles' }
  ];

  var state = {
    page: 'dashboard',
    pos: { cart: [], discount: 0, taxPct: 0, payment: 'cash', customer: { name: '', phone: '' }, lastSale: null },
    productFilter: { q: '', cat: '', sort: 'name', lowOnly: false },
    stockFilter: { tab: 'low' },
    notifyPreview: null, msgPreview: null, stocktake: null
  };

  /* ================= ورود ================= */
  function renderLogin(host) {
    host.innerHTML = '';
    var wrap = U.el('div', { class: 'login-wrap' });
    wrap.innerHTML =
      '<div class="login-card card">' +
      '<div class="center mb"><div style="font-size:2.6rem">' + (DB().shop.logo || '🛍️') + '</div>' +
      '<h1 style="margin:6px 0 2px">ورود مدیر فروشگاه</h1>' +
      '<p class="muted small">' + U.esc(DB().shop.name || '') + ' — پنل مدیریت</p></div>' +
      '<div class="field"><label class="lbl">نام کاربری</label><input id="lgUser" class="input" placeholder="admin" autocomplete="username"></div>' +
      '<div class="field"><label class="lbl">رمز عبور</label><input id="lgPass" class="input" type="password" placeholder="••••••" autocomplete="current-password"></div>' +
      '<label class="switch mb"><input type="checkbox" id="lgRemember" checked><span class="slider"></span><span class="switch-lbl">مرا تا بستن مرورگر به خاطر بسپار</span></label>' +
      '<button class="btn btn-primary btn-block btn-lg" id="lgBtn">ورود به پنل</button>' +
      '<div class="alert alert-info small mt">اولین ورود: نام کاربری <b>admin</b> و رمز <b>admin123</b> (بعد از ورود در «تنظیمات» تغییرش دهید).</div>' +
      '<div class="row between mt"><a href="index.html" class="small">← رفتن به بخش مشتریان</a>' +
      '<button class="btn btn-ghost btn-sm" id="lgReset">رمز را فراموش کرده‌ام</button></div>' +
      '</div>';
    host.appendChild(wrap);
    var u = U.$('#lgUser', host), p = U.$('#lgPass', host);
    if (U.store.session.get('shop.session', false)) u.value = DB().settings.admin.username;
    U.$('#lgBtn', host).addEventListener('click', function () { doLogin(u.value, p.value); });
    [u, p].forEach(function (i) { i.addEventListener('keydown', function (e) { if (e.key === 'Enter') doLogin(u.value, p.value); }); });
    U.$('#lgReset', host).addEventListener('click', function () {
      U.confirm('رمز عبور به «admin123» و نام کاربری به «admin» بازمی‌گردد. اطلاعات اجناس و فروش دست‌نخورده می‌ماند. ادامه می‌دهید؟', { danger: true, okText: 'بازنشانی رمز' }).then(function (ok) {
        if (!ok) return;
        var salt = U.makeSalt();
        DB().settings.admin = { username: 'admin', salt: salt, hash: U.hashPassword('admin123', salt) };
        S().save();
        U.toast('رمز بازنشانی شد — با admin / admin123 وارد شوید', 'ok', 4000);
        u.value = 'admin'; p.value = '';
      });
    });
    setTimeout(function () { u.focus(); }, 120);
  }
  function doLogin(user, pass) {
    if (S().verifyLogin(user, pass)) {
      state.authed = true;
      U.store.session.set('shop.session', true);
      U.toast('خوش آمدید 👋', 'ok');
      U.$('#loginHost').classList.add('hidden');
      U.$('#appHost').classList.remove('hidden');
      buildShell();
      go(hashPage() || 'dashboard');
    } else {
      U.toast('نام کاربری یا رمز عبور نادرست است', 'err');
    }
  }
  function hashPage() {
    var h = (location.hash || '').replace('#/', '').replace('#', '');
    return PAGES.some(function (p) { return p.id === h; }) ? h : null;
  }

  /* ================= پوسته ================= */
  function buildShell() {
    var host = U.$('#appHost');
    host.innerHTML = '';
    var shell = U.el('div', { class: 'app-shell' });
    var sidebar = U.el('aside', { class: 'sidebar', id: 'sidebar' });
    var brand = U.el('div', { class: 'side-brand' });
    brand.innerHTML = '<span class="logo" data-shop-logo>' + (DB().shop.logo || '🛍️') + '</span>' +
      '<div><b data-shop-name>' + U.esc(DB().shop.name) + '</b><span>پنل مدیریت</span></div>';
    sidebar.appendChild(brand);

    PAGES.forEach(function (p) {
      var b = U.el('button', { class: 'nav-item', dataset: { page: p.id } }, [UI.icon(p.icon, 18)]);
      b.appendChild(U.el('span', { text: p.title }));
      if (p.id === 'products' || p.id === 'stock') {
        var alertCount = DB().products.filter(function (x) { return x.stock <= (x.minStock || 0); }).length;
        if (alertCount) b.appendChild(U.el('span', { class: 'nav-badge', text: U.toFa(alertCount) }));
      }
      if (p.id === 'messages') {
        var newOrders = DB().messages.filter(function (x) { return x.type === 'order' && x.status === 'new'; }).length;
        if (newOrders) b.appendChild(U.el('span', { class: 'nav-badge', text: U.toFa(newOrders) }));
      }
      b.addEventListener('click', function () { go(p.id); });
      sidebar.appendChild(b);
    });
    var logout = U.el('button', { class: 'nav-item', style: { marginTop: 'auto' } }, [UI.icon('logout', 18), U.el('span', { text: 'خروج از حساب' })]);
    logout.addEventListener('click', function () {
      state.authed = false;
      U.store.session.del('shop.session');
      U.$('#appHost').classList.add('hidden');
      U.$('#loginHost').classList.remove('hidden');
      renderLogin(U.$('#loginHost'));
    });
    sidebar.appendChild(logout);

    var main = U.el('main', { class: 'main' });
    var topbar = U.el('div', { class: 'topbar' });
    var mt = U.el('button', { class: 'icon-btn mobile-toggle' }, [UI.icon('menu', 18)]);
    mt.addEventListener('click', function () { sidebar.classList.toggle('open'); });
    topbar.appendChild(mt);
    topbar.appendChild(U.el('h2', { id: 'pageTitle', text: 'داشبورد' }));
    topbar.appendChild(U.el('div', { class: 'grow' }));
    var bell = U.el('button', { class: 'icon-btn', title: 'هشدار موجودی' }, [UI.icon('bell', 18)]);
    bell.addEventListener('click', function () { go('stock'); state.stockFilter.tab = 'low'; });
    var themeBtn = U.el('button', { class: 'icon-btn', title: 'تغییر تم' }, [UI.icon('image', 18)]);
    themeBtn.addEventListener('click', function () {
      var themes = ['emerald', 'ocean', 'grape', 'sunset', 'night'];
      var cur = DB().settings.theme || 'emerald';
      var next = themes[(themes.indexOf(cur) + 1) % themes.length];
      DB().settings.theme = next; S().save(); UI.applyTheme(); UI.shopInfo();
      U.toast('تم: ' + next, 'info');
    });
    var addBtn = U.el('button', { class: 'btn btn-primary btn-sm' }, [UI.icon('plus', 16), U.el('span', { text: 'جنس جدید' })]);
    addBtn.addEventListener('click', function () { editProduct(null); });
    var storeLink = U.el('a', { class: 'btn btn-ghost btn-sm', href: 'index.html' }, [UI.icon('link', 16), U.el('span', { text: 'بخش مشتریان' })]);
    topbar.appendChild(addBtn); topbar.appendChild(bell); topbar.appendChild(themeBtn); topbar.appendChild(storeLink);
    main.appendChild(topbar);
    var pageHost = U.el('div', { id: 'pageHost' });
    main.appendChild(pageHost);
    shell.appendChild(sidebar); shell.appendChild(main);
    host.appendChild(shell);
    state.pageHost = pageHost;
    renderPage(state.page);
  }

  function go(page) {
    state.page = page;
    if (location.hash !== '#/' + page) location.hash = '#/' + page;
    if (state.pageHost) renderPage(page);
    var sb = U.$('#sidebar');
    if (sb && root.innerWidth < 1000) sb.classList.remove('open');
  }
  function renderPage(page) {
    var host = state.pageHost;
    if (!host) return;
    var p = PAGES.filter(function (x) { return x.id === page; })[0] || PAGES[0];
    U.$('#pageTitle').textContent = p.title;
    U.$$('.nav-item').forEach(function (b) { b.classList.toggle('active', b.dataset.page === p.id); });
    host.innerHTML = '';
    var renderers = {
      dashboard: renderDashboard, pos: renderPos, products: renderProducts, categories: renderCategories,
      stock: renderStock, invoices: renderInvoices, calculator: renderCalculator, messages: renderMessages,
      notify: renderNotify, settings: renderSettings, backup: renderBackup, help: renderHelp
    };
    renderers[p.id](host);
    U.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ================= داشبورد ================= */
  function renderDashboard(host) {
    var now = Date.now();
    var today = S().stats(new Date().setHours(0, 0, 0, 0), now);
    var week = S().stats(now - 7 * 86400000, now);
    var month = S().stats(now - 30 * 86400000, now);
    var sum = S().stockSummary();

    var grid = U.el('div', { class: 'stats-grid' });
    grid.appendChild(UI.statCard({ label: 'فروش امروز', value: U.moneyShort(today.revenue), sub: U.toFa(today.orders) + ' فاکتور • سود ' + U.moneyShort(today.profit), icon: 'wallet', tone: 'primary' }));
    grid.appendChild(UI.statCard({ label: 'فروش ۷ روز', value: U.moneyShort(week.revenue), sub: 'سود ' + U.moneyShort(week.profit) + ' • حاشیه ' + U.percent(week.margin), icon: 'chart' }));
    grid.appendChild(UI.statCard({ label: 'فروش ۳۰ روز', value: U.moneyShort(month.revenue), sub: U.toFa(month.items) + ' قلم کالا فروخته شد', icon: 'chart', tone: 'info' }));
    grid.appendChild(UI.statCard({ label: 'ارزش موجودی انبار', value: U.moneyShort(sum.value), sub: U.toFa(sum.count) + ' جنس • سود بالقوه ' + U.moneyShort(sum.potentialProfit), icon: 'box', tone: 'primary' }));
    grid.appendChild(UI.statCard({ label: 'کم‌موجود / ناموجود', value: U.toFa(sum.low.length) + ' / ' + U.toFa(sum.out.length), sub: 'برای سفارش‌گذاری بررسی کنید', icon: 'warn', tone: sum.out.length ? 'err' : 'warn' }));
    grid.appendChild(UI.statCard({ label: 'راکد (بیش از ۹۰ روز)', value: U.toFa(sum.dead.length) + ' قلم', sub: 'سرمایه‌ی خواب‌رفته: ' + U.moneyShort(U.sum(sum.dead.slice(0, 40), function (x) { return x.p.stock * x.p.cost; })), icon: 'clock', tone: 'info' }));
    host.appendChild(grid);

    var row = U.el('div', { class: 'grid-2' });
    var c1 = U.el('div', { class: 'card' });
    c1.appendChild(UI.section('روند فروش ۱۴ روز اخیر', 'chart'));
    var days = [];
    for (var i = 13; i >= 0; i--) {
      var d0 = new Date(now - i * 86400000);
      var st = S().stats(d0.setHours(0, 0, 0, 0), new Date(now - i * 86400000).setHours(23, 59, 59, 999));
      var j = U.jalali(new Date(now - i * 86400000));
      days.push({ x: U.toFa(j.jd), y: st.revenue, label: U.jDate(new Date(now - i * 86400000)) });
    }
    c1.appendChild(UI.lineChart(days, { height: 220 }));
    row.appendChild(c1);

    var c2 = U.el('div', { class: 'card' });
    c2.appendChild(UI.section('پرفروش‌ترین اقلام (۳۰ روز)', 'chart'));
    c2.appendChild(UI.barChart(month.topProducts.slice(0, 7).map(function (t) {
      return { label: t.name, value: t.qty, color: 'var(--primary)' };
    }), { money: false }));
    if (!month.topProducts.length) c2.appendChild(U.el('div', { class: 'empty', text: 'هنوز فروشی ثبت نشده' }));
    row.appendChild(c2);
    host.appendChild(row);

    var row2 = U.el('div', { class: 'grid-2' });
    var c3 = U.el('div', { class: 'card' });
    c3.appendChild(UI.section('فروش به تفکیک دسته', 'tag'));
    c3.appendChild(UI.donut(month.byCat.slice(0, 6).map(function (c) { return { label: c.name, value: Math.round(c.revenue) }; })));
    row2.appendChild(c3);

    var c4 = U.el('div', { class: 'card' });
    c4.appendChild(UI.section('اقلام کم‌موجود و ناموجود', 'warn'));
    var list = U.el('div', { class: 'col gap-xs' });
    var items = sum.out.concat(sum.low).slice(0, 9);
    if (!items.length) list.appendChild(U.el('div', { class: 'alert alert-ok', text: '✅ همه‌ی اقلام موجودی کافی دارند.' }));
    items.forEach(function (p) {
      var r = U.el('div', { class: 'row gap-sm between', style: { borderBottom: '1px dashed var(--line)', paddingBottom: '6px' } });
      r.innerHTML = '<span class="grow truncate">' + U.esc(p.name) + '</span>' + UI.stockPill(p);
      var b = U.el('button', { class: 'btn btn-ghost btn-sm', text: '+ افزایش' });
      b.addEventListener('click', function () { quickStock(p); });
      r.appendChild(b);
      list.appendChild(r);
    });
    c4.appendChild(list);
    var restock = S().restockSuggestions(14);
    if (restock.length) {
      c4.appendChild(UI.section('پیشنهاد سفارش (۱۴ روز آینده)', 'cart'));
      c4.appendChild(UI.barChart(restock.slice(0, 6).map(function (x) {
        return { label: x.p.name, value: x.order, color: 'var(--accent)' };
      }), { money: false }));
      var print = U.el('button', { class: 'btn btn-outline btn-sm' }, [UI.icon('print', 15), U.el('span', { text: 'چاپ لیست سفارش' })]);
      print.addEventListener('click', function () { printRestock(restock); });
      c4.appendChild(print);
    }
    row2.appendChild(c4);
    host.appendChild(row2);

    if (sum.expiring.length) {
      var c5 = U.el('div', { class: 'card' });
      c5.appendChild(UI.section('نزدیک تاریخ انقضا', 'clock'));
      var t = U.el('div', { class: 'chips' });
      sum.expiring.forEach(function (x) {
        t.appendChild(U.el('span', { class: 'chip', html: U.esc(x.p.name) + ' — <b>' + (x.days <= 0 ? 'منقضی' : U.toFa(x.days) + ' روز') + '</b>' }));
      });
      c5.appendChild(t);
      host.appendChild(c5);
    }
    var newOrders = DB().messages.filter(function (x) { return x.type === 'order' && x.status === 'new'; });
    if (newOrders.length) {
      var oc = U.el('div', { class: 'card', style: { borderInlineStart: '4px solid var(--danger)' } });
      oc.appendChild(UI.section('🛎️ ' + U.toFa(newOrders.length) + ' سفارش آنلاین تأییدنشده', 'cart'));
      oc.appendChild(U.el('div', { class: 'small muted', html: newOrders.slice(0, 4).map(function (o) { return '• ' + U.esc((o.customer && o.customer.name) || 'مشتری') + ' — ' + U.money(o.total || 0) + ' (' + U.jTime(o.at) + ')'; }).join('<br>') }));
      var goOrders = U.el('button', { class: 'btn btn-primary btn-sm mt-sm', html: UI.iconHTML('cart', 15) + ' مشاهده و تأیید سفارش‌ها' });
      goOrders.addEventListener('click', function () { go('messages'); });
      oc.appendChild(goOrders);
      host.appendChild(oc);
    }

    var acts = U.el('div', { class: 'card' });
    acts.appendChild(UI.section('کارهای سریع', 'sparkles'));
    var rowA = U.el('div', { class: 'chips' });
    [['فروش سریع', 'pos', 'cart'], ['جنس جدید', null, 'plus'], ['پیام پایان روز', 'messages', 'msg'], ['ماشین‌حساب قیمت', 'calculator', 'calc'],
    ['پشتیبان‌گیری', 'backup', 'download'], ['اطلاع‌رسانی', 'notify', 'bell']].forEach(function (a) {
      var b = U.el('button', { class: 'chip' }, [UI.icon(a[2], 15), U.el('span', { text: a[0] })]);
      b.addEventListener('click', function () { a[1] ? go(a[1]) : editProduct(null); });
      rowA.appendChild(b);
    });
    acts.appendChild(rowA);
    host.appendChild(acts);
  }
  function printRestock(list) {
    var shop = DB().shop;
    var html = '<div class="inv-head"><div><h1>' + U.esc(shop.name) + '</h1><div class="l-meta">لیست سفارش خرید — ' + U.jDateLong() + '</div></div><div class="logo">📦</div></div>' +
      '<table><thead><tr><th>#</th><th>کالا</th><th>تأمین‌کننده</th><th>موجودی فعلی</th><th>فروش ۳۰ روز</th><th>پیشنهاد سفارش</th><th>هزینه تقریبی</th></tr></thead><tbody>' +
      list.map(function (x, i) {
        return '<tr><td>' + U.toFa(i + 1) + '</td><td>' + U.esc(x.p.name) + '</td><td>' + U.esc(x.p.supplier || '—') + '</td><td>' +
          U.toFa(U.group(x.p.stock)) + '</td><td>' + U.toFa(x.sold30) + '</td><td><b>' + U.toFa(U.group(x.order)) + ' ' + U.esc(x.p.unit) + '</b></td><td>' + U.toman(x.cost) + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<div class="totals"><div class="grand"><span>جمع تقریبی خرید</span><span>' + U.toman(U.sum(list, function (x) { return x.cost; })) + '</span></div></div>';
    UI.printHTML(html, 'لیست سفارش');
  }
  function quickStock(p) {
    U.prompt('چند عدد به موجودی «' + p.name + '» اضافه شود؟ (برای کاهش عدد منفی وارد کنید)', '10').then(function (v) {
      if (v == null || v === '') return;
      try {
        S().adjustStock(p.id, U.num(v), 'in', 'افزایش سریع از داشبورد');
        U.toast('موجودی به‌روز شد: ' + U.toFa(S().getProduct(p.id).stock), 'ok');
        renderPage(state.page);
      } catch (e) { U.toast(e.message, 'err'); }
    });
  }

  /* ================= فروش سریع (POS) ================= */
  function renderPos(host) {
    var wrap = U.el('div', { class: 'pos-layout' });
    var left = U.el('div', { class: 'card' });
    var search = U.el('input', { class: 'input', placeholder: 'جست‌وجوی جنس یا اسکن بارکد…', value: state.pos.q || '' });
    var scanBtn = U.el('button', { class: 'btn btn-ghost' }, [UI.icon('scan', 17), U.el('span', { text: 'بارکد' })]);
    scanBtn.addEventListener('click', function () {
      UI.scanModal(function (code) {
        var p = S().findByBarcode(code);
        if (!p) return U.toast('جنسی با بارکد ' + code + ' پیدا نشد', 'warn');
        addToCart(p, 1);
        renderPage('pos');
      });
    });
    var head = U.el('div', { class: 'row gap-sm mb' }, [search, scanBtn]);
    left.appendChild(head);
    var gridHost = U.el('div', { class: 'pos-products' });
    left.appendChild(gridHost);

    var right = U.el('div', { class: 'card' });
    right.innerHTML = '<div class="card-head"><h3>' + UI.iconHTML('cart', 18) + ' سبد فروش</h3></div>';
    var cartHost = U.el('div', { id: 'cartHost' });
    right.appendChild(cartHost);

    function drawGrid() {
      var list = S().searchProducts({ q: search.value, sort: 'sold', activeOnly: true }).slice(0, 60);
      gridHost.innerHTML = '';
      if (!list.length) gridHost.appendChild(U.el('div', { class: 'empty', text: 'جنسی پیدا نشد' }));
      list.forEach(function (p) {
        var it = U.el('div', { class: 'pos-item' });
        it.innerHTML = (p.image ? '<img src="' + p.image + '" style="width:100%;height:78px;object-fit:cover;border-radius:8px;margin-bottom:6px">' : '<div style="font-size:1.6rem">' + (S().getCategory(p.categoryId) ? S().getCategory(p.categoryId).icon : '📦') + '</div>') +
          '<div class="p-name">' + U.esc(p.name) + '</div>' +
          '<div class="p-price">' + U.money(p.price) + '</div>' +
          '<div class="p-stock">موجودی: ' + U.toFa(U.group(p.stock)) + ' ' + U.esc(p.unit) + '</div>';
        it.addEventListener('click', function () { addToCart(p, 1); });
        gridHost.appendChild(it);
      });
    }
    function addToCart(p, qty) {
      var line = state.pos.cart.filter(function (c) { return c.pid === p.id; })[0];
      if (line) line.qty += qty;
      else state.pos.cart.push({ pid: p.id, name: p.name, qty: qty, price: p.price, cost: p.cost, unit: p.unit, discount: 0 });
      drawCart();
      U.toast(p.name + ' به سبد اضافه شد', 'ok', 1200);
    }
    function drawCart() {
      var c = state.pos.cart;
      cartHost.innerHTML = '';
      if (!c.length) {
        cartHost.appendChild(U.el('div', { class: 'empty' }, [
          U.el('span', { class: 'empty-illustration', text: '🛒' }),
          U.el('div', { text: 'برای شروع، روی جنس‌ها در سمت راست بزنید' })
        ]));
        return;
      }
      c.forEach(function (line, idx) {
        var row = U.el('div', { class: 'cart-line' });
        row.innerHTML = '<span class="c-name"><b>' + U.esc(line.name) + '</b><br><small class="muted">' + U.money(line.price) + ' × ' + U.toFa(line.qty) + ' = ' + U.money(line.price * line.qty) + '</small></span>';
        var qb = U.el('div', { class: 'qty-box' });
        var minus = U.el('button', { text: '−' }), plus = U.el('button', { text: '+' });
        var inp = U.el('input', { value: U.toFa(line.qty), inputmode: 'numeric' });
        minus.addEventListener('click', function () { line.qty = Math.max(1, line.qty - 1); inp.value = U.toFa(line.qty); drawCart(); });
        plus.addEventListener('click', function () { line.qty++; inp.value = U.toFa(line.qty); drawCart(); });
        inp.addEventListener('change', function () { line.qty = Math.max(1, U.num(inp.value)); inp.value = U.toFa(line.qty); drawCart(); });
        qb.appendChild(minus); qb.appendChild(inp); qb.appendChild(plus);
        row.appendChild(qb);
        var rm = U.el('button', { class: 'icon-btn round', html: UI.iconHTML('x', 14) });
        rm.addEventListener('click', function () { c.splice(idx, 1); drawCart(); });
        row.appendChild(rm);
        cartHost.appendChild(row);
      });

      var sub = U.sum(c, function (l) { return l.price * l.qty; });
      var totals = U.el('div', { class: 'totals-box' });
      totals.innerHTML = '<div class="totals-row"><span>جمع کالاها</span><b>' + U.toman(sub) + '</b></div>';
      cartHost.appendChild(totals);

      var discInput = U.el('input', { class: 'input input-sm', placeholder: 'تخفیف (مبلغ)', value: state.pos.discount ? U.group(state.pos.discount) : '' });
      var taxInput = U.el('input', { class: 'input input-sm', placeholder: 'مالیات ٪', value: state.pos.taxPct || '' });
      var paySel = U.el('select', { class: 'input input-sm' }, [
        U.el('option', { value: 'cash', text: 'نقدی', selected: state.pos.payment === 'cash' }),
        U.el('option', { value: 'card', text: 'کارتی', selected: state.pos.payment === 'card' }),
        U.el('option', { value: 'credit', text: 'نسیه / دفتری', selected: state.pos.payment === 'credit' })
      ]);
      var cName = U.el('input', { class: 'input input-sm', placeholder: 'نام مشتری (اختیاری)', value: state.pos.customer.name });
      function recalc() {
        state.pos.discount = U.num(discInput.value);
        state.pos.taxPct = U.num(taxInput.value);
        state.pos.payment = paySel.value;
        state.pos.customer.name = cName.value;
        var d = U.clamp(state.pos.discount, 0, sub);
        var tax = Math.round((sub - d) * state.pos.taxPct / 100);
        var total = sub - d + tax;
        grand.innerHTML = '<span>قابل پرداخت</span><span>' + U.toman(total) + '</span>';
        profitLine.textContent = 'سود برآوردی این فاکتور: ' + U.toman(U.sum(c, function (l) { return (l.price - l.cost) * l.qty; }) - d);
      }
      [discInput, taxInput, cName].forEach(function (i) { i.addEventListener('input', recalc); });
      paySel.addEventListener('change', recalc);
      var grid2 = U.el('div', { class: 'row gap-sm wrap mt-sm' }, [discInput, taxInput, paySel]);
      cartHost.appendChild(grid2);
      cartHost.appendChild(U.el('div', { class: 'mt-sm' }, [cName]));
      var grand = U.el('div', { class: 'totals-row grand' });
      var profitLine = U.el('div', { class: 'small muted mt-sm' });
      cartHost.appendChild(grand); cartHost.appendChild(profitLine);
      var submit = U.el('button', { class: 'btn btn-primary btn-block btn-lg mt' }, [UI.icon('check', 18), U.el('span', { text: 'ثبت فروش' })]);
      submit.addEventListener('click', function () { checkout(false); });
      var submitPrint = U.el('button', { class: 'btn btn-accent btn-block mt-sm' }, [UI.icon('print', 17), U.el('span', { text: 'ثبت و چاپ فاکتور' })]);
      submitPrint.addEventListener('click', function () { checkout(true); });
      cartHost.appendChild(submit); cartHost.appendChild(submitPrint);
      var clear = U.el('button', { class: 'btn btn-ghost btn-block btn-sm mt-sm', text: 'خالی کردن سبد' });
      clear.addEventListener('click', function () { state.pos.cart = []; state.pos.discount = 0; drawCart(); });
      cartHost.appendChild(clear);
      recalc();
    }
    function checkout(printIt) {
      try {
        var sale = S().addSale({
          items: state.pos.cart.map(function (l) { return { pid: l.pid, qty: l.qty, price: l.price, discount: l.discount || 0 }; }),
          discount: state.pos.discount, taxPct: state.pos.taxPct, payment: state.pos.payment,
          customer: state.pos.customer.name ? { name: state.pos.customer.name, phone: state.pos.customer.phone } : null,
          channel: 'pos', note: 'صندوق فروشگاه'
        });
        state.pos.cart = []; state.pos.discount = 0; state.pos.taxPct = 0; state.pos.customer = { name: '', phone: '' };
        U.toast('فاکتور ' + U.toFa(sale.no) + ' ثبت شد — ' + U.toman(sale.total), 'ok', 3200);
        if (printIt) UI.printInvoice(sale);
        drawCart();
      } catch (e) { U.toast(e.message, 'err', 4000); }
    }

    search.addEventListener('input', U.debounce(function () {
      /* اگر ورودی دقیقاً بارکد باشد، مستقیم اضافه کن */
      var p = S().findByBarcode(search.value.trim());
      if (p) { addToCart(p, 1); search.value = ''; drawGrid(); return; }
      drawGrid();
    }, 220));
    search.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var list = S().searchProducts({ q: search.value, activeOnly: true });
        if (list.length) { addToCart(list[0], 1); search.value = ''; drawGrid(); }
      }
    });
    wrap.appendChild(left); wrap.appendChild(right);
    host.appendChild(wrap);
    drawGrid(); drawCart();
    setTimeout(function () { if (root.innerWidth > 700) search.focus(); }, 120);
  }

  /* ================= اجناس ================= */
  function renderProducts(host) {
    var f = state.productFilter;
    var toolbar = U.el('div', { class: 'card tight' });
    var row = U.el('div', { class: 'row gap-sm wrap' });
    var q = U.el('input', { class: 'input input-sm', placeholder: 'جست‌وجو (نام، برند، کد، بارکد، برچسب)…', value: f.q, style: { minWidth: '220px', flex: '1 1 220px' } });
    var catSel = U.el('select', { class: 'input input-sm', style: { minWidth: '150px' } });
    catSel.appendChild(U.el('option', { value: '', text: 'همه‌ی دسته‌ها' }));
    S().listCategories().forEach(function (c) { catSel.appendChild(U.el('option', { value: c.id, text: (c.icon || '') + ' ' + c.name, selected: f.cat === c.id })); });
    var sortSel = U.el('select', { class: 'input input-sm' });
    [['name', 'نام'], ['newest', 'جدیدترین'], ['stockAsc', 'کمترین موجودی'], ['priceDesc', 'گران‌ترین'], ['sold', 'پرفروش‌ترین'], ['value', 'بیشترین ارزش انبار']]
      .forEach(function (o) { sortSel.appendChild(U.el('option', { value: o[0], text: 'مرتب: ' + o[1], selected: f.sort === o[0] })); });
    var lowChk = U.el('label', { class: 'switch' }, [U.el('input', { type: 'checkbox', checked: f.lowOnly }), U.el('span', { class: 'slider' }), U.el('span', { class: 'switch-lbl', text: 'فقط کم‌موجودها' })]);
    var addBtn = U.el('button', { class: 'btn btn-primary btn-sm' }, [UI.icon('plus', 16), U.el('span', { text: 'افزودن جنس' })]);
    var scanBtn = U.el('button', { class: 'btn btn-ghost btn-sm' }, [UI.icon('scan', 16), U.el('span', { text: 'بارکد' })]);
    var impBtn = U.el('button', { class: 'btn btn-ghost btn-sm' }, [UI.icon('upload', 16), U.el('span', { text: 'ورود از اکسل/CSV' })]);
    var expBtn = U.el('button', { class: 'btn btn-ghost btn-sm' }, [UI.icon('download', 16), U.el('span', { text: 'خروجی CSV' })]);
    var bulkBtn = U.el('button', { class: 'btn btn-ghost btn-sm' }, [UI.icon('calc', 16), U.el('span', { text: 'تغییر گروهی قیمت' })]);
    var labelsBtn = U.el('button', { class: 'btn btn-ghost btn-sm' }, [UI.icon('print', 16), U.el('span', { text: 'چاپ برچسب همه' })]);

    row.appendChild(q); row.appendChild(catSel); row.appendChild(sortSel); row.appendChild(lowChk);
    row.appendChild(addBtn); row.appendChild(scanBtn); row.appendChild(impBtn); row.appendChild(expBtn); row.appendChild(bulkBtn); row.appendChild(labelsBtn);
    toolbar.appendChild(row);
    host.appendChild(toolbar);

    var tableHost = U.el('div', { class: 'card' });
    host.appendChild(tableHost);

    function rowsFor() {
      return S().searchProducts({ q: f.q, cat: f.cat, sort: f.sort, lowOnly: f.lowOnly });
    }
    var tbl = UI.table({
      rows: rowsFor(), searchable: false, perPage: 20, sort: 'name', dir: 'asc',
      sorters: {
        name: function (a, b) { return a.name.localeCompare(b.name, 'fa'); },
        price: function (a, b) { return a.price - b.price; },
        cost: function (a, b) { return a.cost - b.cost; },
        stock: function (a, b) { return a.stock - b.stock; },
        margin: function (a, b) { return (a.price - a.cost) / (a.price || 1) - (b.price - b.cost) / (b.price || 1); },
        value: function (a, b) { return a.stock * a.cost - b.stock * b.cost; }
      },
      columns: [
        {
          key: 'name', title: 'جنس', render: function (p) {
            var cat = S().getCategory(p.categoryId);
            return '<div class="row gap-sm">' +
              (p.image ? '<img src="' + p.image + '" style="width:42px;height:42px;border-radius:10px;object-fit:cover">' : '<span style="width:42px;height:42px;border-radius:10px;background:var(--primary-soft);display:inline-flex;align-items:center;justify-content:center;font-size:1.2rem">' + (cat ? cat.icon : '📦') + '</span>') +
              '<div><div class="bold">' + U.esc(p.name) + '</div><div class="small muted">' + U.esc(cat ? cat.name : 'بدون دسته') + (p.brand ? ' • ' + U.esc(p.brand) : '') + ' • ' + U.esc(p.sku || '') + '</div></div></div>';
          }
        },
        { key: 'cost', title: 'خرید', render: function (p) { return U.money(p.cost); } },
        { key: 'price', title: 'فروش', render: function (p) { return '<b>' + U.money(p.price) + '</b>'; } },
        {
          key: 'margin', title: 'سود', render: function (p) {
            var m = S().pricing.margin(p.cost, p.price);
            var cls = m < 8 ? 'err' : (m < 15 ? 'warn' : 'ok');
            return '<span class="pill pill-' + cls + '">' + U.percent(m) + '</span>';
          }
        },
        {
          key: 'stock', title: 'موجودی', render: function (p) {
            return U.toFa(U.group(p.stock)) + ' ' + U.esc(p.unit) + ' ' + UI.stockPill(p);
          }
        },
        { key: 'value', title: 'ارزش', render: function (p) { return U.moneyShort(p.stock * p.cost); } },
        {
          key: 'actions', title: 'عملیات', render: function (p) {
            var box = U.el('div', { class: 'row gap-xs' });
            function ib(icon, title, fn, cls) {
              var b = U.el('button', { class: 'icon-btn ' + (cls || ''), title: title, html: UI.iconHTML(icon, 16) });
              b.addEventListener('click', fn);
              return b;
            }
            box.appendChild(ib('edit', 'ویرایش', function () { editProduct(p); }));
            box.appendChild(ib('scan', 'بارکد و برچسب', function () { showBarcode(p); }));
            box.appendChild(ib('print', 'چاپ برچسب', function () { UI.printLabels([p], { copies: 1 }); }));
            box.appendChild(ib('plus', 'افزایش موجودی', function () { quickStock(p); }));
            box.appendChild(ib('trash', 'حذف', function () {
              U.confirm('جنس «' + p.name + '» حذف شود؟ این کار قابل بازگشت نیست (پیشنهاد: از پشتیبان‌گیری استفاده کنید).', { danger: true, okText: 'حذف' }).then(function (ok) {
                if (ok) { S().removeProduct(p.id); U.toast('حذف شد', 'ok'); refresh(); }
              });
            }, 'danger'));
            return box;
          }
        }
      ],
      empty: 'جنسی یافت نشد — با دکمه‌ی «افزودن جنس» شروع کنید'
    });
    tableHost.appendChild(tbl.el);

    function refresh() {
      tbl.setRows(rowsFor());
      /* نشان‌های هشدار نوار کناری */
      U.$$('.nav-item').forEach(function (b) {
        if (b.dataset.page !== 'products' && b.dataset.page !== 'stock') return;
        var old = b.querySelector('.nav-badge'); if (old) old.remove();
        var cnt = DB().products.filter(function (x) { return x.stock <= (x.minStock || 0); }).length;
        if (cnt) b.appendChild(U.el('span', { class: 'nav-badge', text: U.toFa(cnt) }));
      });
    }
    q.addEventListener('input', U.debounce(function () { f.q = q.value; refresh(); }, 250));
    catSel.addEventListener('change', function () { f.cat = catSel.value; refresh(); });
    sortSel.addEventListener('change', function () { f.sort = sortSel.value; refresh(); });
    lowChk.addEventListener('change', function () { f.lowOnly = lowChk.querySelector('input').checked; refresh(); });
    addBtn.addEventListener('click', function () { editProduct(null); });
    scanBtn.addEventListener('click', function () {
      UI.scanModal(function (code) {
        var p = S().findByBarcode(code);
        if (p) { showBarcode(p); } else { U.toast('جنسی با این بارکد نبود — فرم جنس جدید با همین بارکد باز می‌شود', 'info', 3500); editProduct(null, { barcode: code }); }
      });
    });
    impBtn.addEventListener('click', importCSV);
    expBtn.addEventListener('click', function () {
      U.download('اجناس-' + U.jDate() + '.csv', S().csvExportProducts(), 'text/csv;charset=utf-8');
      U.toast('فایل CSV ذخیره شد', 'ok');
    });
    bulkBtn.addEventListener('click', function () { bulkPriceModal(refresh); });
    labelsBtn.addEventListener('click', function () {
      var list = rowsFor();
      if (!list.length) return U.toast('جنسی برای چاپ نیست', 'warn');
      U.prompt('برای هر جنس چند برچسب چاپ شود؟', '1').then(function (v) {
        if (v == null) return;
        UI.printLabels(list, { copies: Math.max(1, U.num(v)) });
      });
    });
  }

  /* فرم افزودن/ویرایش جنس */
  function editProduct(p, preset) {
    var isNew = !p;
    var cats = S().listCategories();
    var tabs = ['اطلاعات پایه', 'قیمت و سود', 'موجودی و انبار', 'عکس و شناسایی هوشمند', 'جزئیات بیشتر'];
    var tabIdx = 0;
    preset = preset || {};
    var draft = p ? U.clone(p) : {
      id: null, name: preset.name || '', categoryId: preset.categoryId || (cats[0] ? cats[0].id : null), unit: 'عدد', cost: 0, price: 0, wholesale: 0,
      tax: 0, stock: 0, minStock: DB().settings.lowStockDefault || 5, supplier: '', location: '',
      brand: '', tags: [], image: '', gallery: [], description: '', specs: [], variants: [], custom: [],
      barcode: preset && preset.barcode ? preset.barcode : S().nextBarcode(), sku: '', expiry: null, fp: null, active: true
    };
    if (!draft.barcode) draft.barcode = S().nextBarcode();

    var body = U.el('div', {});
    var tabsBar = U.el('div', { class: 'chips mb' });
    var content = U.el('div', {});
    var forms = {};

    var fBase = UI.form({
      fields: [
        { key: 'name', label: 'نام جنس', value: draft.name, full: true, placeholder: 'مثال: شکلات تلخ ۱۰۰ گرمی' },
        { key: 'categoryId', label: 'دسته‌بندی', type: 'select', value: draft.categoryId || '', options: cats.map(function (c) { return { value: c.id, label: (c.icon || '') + ' ' + c.name }; }).concat([{ value: '', label: '— بدون دسته —' }]) },
        { key: 'brand', label: 'برند / تولیدکننده', value: draft.brand },
        { key: 'sku', label: 'کد کالا (SKU)', value: draft.sku, placeholder: 'اختیاری' },
        { key: 'unit', label: 'واحد فروش', type: 'select', value: draft.unit, options: ['عدد', 'بسته', 'کیلوگرم', 'گرم', 'لیتر', 'بطری', 'قوطی', 'شیشه', 'ظرف', 'قرص', 'کارتن', 'کیسه', 'جعبه'].map(function (u) { return { value: u, label: u }; }) },
        { key: 'barcode', label: 'بارکد', value: draft.barcode, help: 'برای ساخت برچسب و اسکن در صندوق استفاده می‌شود.' },
        { key: 'tags', label: 'برچسب‌ها / نام‌های دیگر', type: 'tags', value: draft.tags, full: true, help: 'با کاما جدا کنید؛ در جست‌وجو و پیام پایان روز هم استفاده می‌شوند.' },
        { key: 'description', label: 'توضیحات', type: 'textarea', value: draft.description, full: true }
      ]
    });

    var fPrice = U.el('div', {});
    var calcHost = U.el('div', {});
    var fPricing = UI.form({
      fields: [
        { key: 'cost', label: 'قیمت خرید (تومان)', type: 'money', value: draft.cost },
        { key: 'price', label: 'قیمت فروش (تومان)', type: 'money', value: draft.price },
        { key: 'wholesale', label: 'قیمت عمده', type: 'money', value: draft.wholesale },
        { key: 'tax', label: 'مالیات (٪)', type: 'number', value: draft.tax },
        { key: 'marginView', label: 'محاسبه‌ی سریع', full: true, type: 'hidden' }
      ]
    });
    var analy = U.el('div', { class: 'alert alert-info small' });
    function refreshAnalysis() {
      var cost = fPricing.fields.cost.get(), price = fPricing.fields.price.get();
      var m = S().pricing.margin(cost, price), mk = S().pricing.markup(cost, price);
      var sug = S().pricing.round(S().pricing.fromMarkup(cost, DB().settings.defaultProfit || 25), 'up500');
      analy.innerHTML = 'سود هر واحد: <b>' + U.toman(price - cost) + '</b> • حاشیه‌ی سود: <b>' + U.percent(m) + '</b> • درصد روی خرید: <b>' + U.percent(mk) + '</b>' +
        (cost && (!price || Math.abs(price - sug) > 500) ? ' <br><button class="btn btn-ghost btn-sm mt-sm" id="useSug">استفاده از قیمت پیشنهادی: ' + U.toman(sug) + '</button>' : '') +
        (price && price < cost ? '<br><b class="pill pill-err">قیمت فروش کمتر از قیمت خرید است!</b>' : '');
      var b = U.$('#useSug', analy);
      if (b) b.addEventListener('click', function () { fPricing.fields.price.set(sug); refreshAnalysis(); calc.setPrice(sug); });
    }
    ['cost', 'price'].forEach(function (k) {
      fPricing.fields[k].el.addEventListener('input', function () {
        refreshAnalysis();
        calc.setCost(fPricing.fields.cost.get());
        calc.setPrice(fPricing.fields.price.get());
      });
    });
    var calc = UI.priceCalc({
      cost: draft.cost, price: draft.price, applyText: 'ثبت این قیمت در فرم',
      onApply: function (val) { fPricing.fields.price.set(val); refreshAnalysis(); U.toast('قیمت جدید در فرم ثبت شد', 'ok'); }
    });
    calcHost.appendChild(U.el('div', { class: 'muted small mb', text: 'برای افزایش/کاهش درصدی سریع قیمت از این ماشین‌حساب استفاده کنید (پایه‌ی محاسبه را می‌توانید قیمت خرید بگذارید تا قیمت پیشنهادی با سود دلخواه ساخته شود).' }));
    calcHost.appendChild(calc.el);
    var rounding = U.el('div', { class: 'chips mt-sm' });
    [['up1000', 'گرد به هزار بالا'], ['down1000', 'گرد به هزار پایین'], ['up500', 'گرد به ۵۰۰'], ['up100', 'گرد به ۱۰۰']].forEach(function (r) {
      var b = U.el('button', { class: 'chip', text: r[1] });
      b.addEventListener('click', function () {
        var v = S().pricing.round(fPricing.fields.price.get(), r[0]);
        fPricing.fields.price.set(v); calc.setPrice(v); refreshAnalysis();
      });
      rounding.appendChild(b);
    });
    calcHost.appendChild(rounding);
    fPrice.appendChild(fPricing.el); fPrice.appendChild(analy); fPrice.appendChild(calcHost);
    fPricing.fields.marginView.el.parentNode.classList.add('hidden');

    var fStock = UI.form({
      fields: [
        { key: 'stock', label: 'موجودی فعلی', type: 'number', value: draft.stock },
        { key: 'minStock', label: 'حد بحرانی (هشدار)', type: 'number', value: draft.minStock, hint: 'وقتی موجودی به این عدد یا کمتر رسید، در داشبورد و گزارش‌ها هشدار داده می‌شود.' },
        { key: 'supplier', label: 'تأمین‌کننده', value: draft.supplier },
        { key: 'location', label: 'محل قرارگیری در فروشگاه', value: draft.location, placeholder: 'مثال: قفسه A2 / یخچال ۱' },
        { key: 'expiry', label: 'تاریخ انقضا (شمسی)', value: draft.expiry, placeholder: '۱۴۰۵/۱۲/۲۹ یا خالی', help: 'خالی بگذارید اگر تاریخ انقضا ندارد.' },
        { key: 'active', label: 'نمایش در فروشگاه مشتریان', type: 'checkbox', value: draft.active !== false, hint: 'در سایت مشتریان دیده شود' }
      ]
    });

    var fImg = U.el('div', {});
    var picker = UI.imagePicker({
      value: draft.image,
      onImage: function (dataUrl, st) { draft.image = dataUrl; draft.fp = st.fp || draft.fp; },
      onApply: function (mode, rep) {
        var sug = rep.suggestion;
        if (mode === 'all') {
          fBase.fields.name.set(sug.name);
          fBase.fields.tags.set(sug.tags);
          fStock.fields.expiry.set(draft.expiry || '');
          var uSel = fBase.fields.unit; uSel.set(sug.unit);
          if (sug.categoryId) fBase.fields.categoryId.set(sug.categoryId);
          var specBox = forms.specs;
          if (specBox) specBox.addRow({ k: 'رنگ', v: sug.colorName + ' (' + sug.color + ')' });
          if (specBox) specBox.addRow({ k: 'شکل', v: sug.shape });
          if (rep.features && rep.features.clusters && rep.features.clusters[0]) {
            specBox && specBox.addRow({ k: 'رنگ غالب (خودکار)', v: rep.features.clusters[0].name });
          }
          U.toast('فرم با پیشنهاد هوش تصویر پر شد — بازبینی کنید', 'ok', 3200);
        } else if (mode === 'name') fBase.fields.name.set(sug.name);
        else if (mode === 'tags') fBase.fields.tags.set(sug.tags);
        else if (mode === 'color') {
          var sb = forms.specs;
          if (sb) { sb.addRow({ k: 'رنگ', v: sug.colorName }); sb.addRow({ k: 'پالت', v: sug.palette.map(function (p) { return p.name + ' ' + p.hex; }).join('، ') }); }
        }
        updateBarcodePreview();
      },
      onPick: function (cat) {
        if (forms.specs) forms.specs.addRow({ k: 'دسته پیشنهادی تصویر', v: cat.name + ' (' + Math.round(cat.share * 100) + '٪)' });
      }
    });
    fImg.appendChild(picker.el);
    var bcPreview = U.el('div', { class: 'card tight mt' });
    fImg.appendChild(bcPreview);
    function updateBarcodePreview() {
      var code = fBase.fields.barcode.get() || S().nextBarcode();
      bcPreview.innerHTML = '<div class="muted small mb-sm">پیش‌نمایش برچسب (بارکد + نام + قیمت):</div>' +
        '<div style="max-width:280px">' + UI.labelHTML({ name: fBase.fields.name.get() || draft.name || 'نام جنس', barcode: code, price: fPricing.fields.price.get() }) + '</div>' +
        '<div class="row gap-sm mt-sm"><button class="btn btn-outline btn-sm" id="bcPrint">چاپ برچسب</button>' +
        '<button class="btn btn-ghost btn-sm" id="bcNew">ساخت بارکد جدید</button>' +
        '<button class="btn btn-ghost btn-sm" id="bcDl">دانلود تصویر بارکد</button></div>';
      U.$('#bcPrint', bcPreview).addEventListener('click', function () {
        UI.printLabels([{ name: fBase.fields.name.get(), barcode: code, price: fPricing.fields.price.get() }], { copies: 1 });
      });
      U.$('#bcNew', bcPreview).addEventListener('click', function () {
        var c = S().nextBarcode();
        fBase.fields.barcode.set(c); updateBarcodePreview();
      });
      U.$('#bcDl', bcPreview).addEventListener('click', function () {
        try {
          var url = Shop.barcode.toDataURL(code, {});
          var a = U.el('a', { href: url, download: 'barcode-' + code + '.png' });
          document.body.appendChild(a); a.click(); a.remove();
        } catch (e) { U.toast('دانلود تصویر ممکن نشد', 'err'); }
      });
    }
    fBase.fields.barcode.el.addEventListener('input', updateBarcodePreview);
    fBase.fields.name.el.addEventListener('input', updateBarcodePreview);
    fPricing.fields.price.el.addEventListener('input', updateBarcodePreview);

    /* جزئیات بیشتر: مشخصات کلید/مقدار + تنوع‌ها */
    var specsHost = U.el('div', {});
    var kv = UI.form({ fields: [] });
    var specRows = U.el('div', {});
    var specList = (draft.specs || []).slice();
    function drawSpecs() {
      specRows.innerHTML = '';
      specList.forEach(function (s, i) {
        var r = U.el('div', { class: 'row gap-sm mb-sm' });
        var k = U.el('input', { class: 'input input-sm', placeholder: 'عنوان (مثلاً وزن)', value: s.k });
        var v = U.el('input', { class: 'input input-sm', placeholder: 'مقدار (مثلاً ۱۰۰ گرم)', value: s.v });
        k.addEventListener('input', function () { specList[i].k = k.value; });
        v.addEventListener('input', function () { specList[i].v = v.value; });
        var rm = U.el('button', { class: 'icon-btn', html: UI.iconHTML('x', 14) });
        rm.addEventListener('click', function () { specList.splice(i, 1); drawSpecs(); });
        r.appendChild(k); r.appendChild(v); r.appendChild(rm);
        specRows.appendChild(r);
      });
    }
    drawSpecs();
    var addSpec = U.el('button', { class: 'btn btn-ghost btn-sm' }, [UI.icon('plus', 15), U.el('span', { text: 'افزودن مشخصه' })]);
    addSpec.addEventListener('click', function () { specList.push({ k: '', v: '' }); drawSpecs(); });
    specsHost.appendChild(U.el('div', { class: 'muted small mb-sm', text: 'هر جزئیاتی که برای این جنس مهم است را اینجا ثبت کنید (وزن، ابعاد، رنگ، کشور سازنده و…). این مشخصات در صفحه‌ی مشتری نمایش داده می‌شود.' }));
    specsHost.appendChild(specRows); specsHost.appendChild(addSpec);
    specsHost.appendChild(U.el('div', { class: 'section-head' }, [U.el('h3', { text: 'گالری تصاویر' })]));
    var galleryHost = U.el('div', { class: 'row gap-sm wrap' });
    (draft.gallery || []).forEach(function (g, i) {
      var d = U.el('div', { style: { position: 'relative' } });
      d.innerHTML = '<img src="' + g + '" style="width:76px;height:76px;object-fit:cover;border-radius:12px;border:1px solid var(--line)">';
      var rm = U.el('button', { class: 'icon-btn round', style: { position: 'absolute', top: '-6px', insetInlineEnd: '-6px' }, html: UI.iconHTML('x', 12) });
      rm.addEventListener('click', function () { draft.gallery.splice(i, 1); editProduct.refreshGallery(); });
      d.appendChild(rm);
      galleryHost.appendChild(d);
    });
    var galInput = U.el('input', { type: 'file', accept: 'image/*', multiple: true, class: 'hidden' });
    var galBtn = U.el('button', { class: 'btn btn-ghost btn-sm' }, [UI.icon('image', 15), U.el('span', { text: 'افزودن تصویر' })]);
    galBtn.addEventListener('click', function () { galInput.click(); });
    galInput.addEventListener('change', function () {
      Array.prototype.slice.call(galInput.files).forEach(function (file) {
        U.readImage(file).then(function (f) { return Shop.vision.prepare(f.dataUrl); }).then(function (prep) {
          draft.gallery.push(prep.dataUrl);
          editProduct.refreshGallery();
        });
      });
    });
    galleryHost.appendChild(galBtn); galleryHost.appendChild(galInput);
    specsHost.appendChild(galleryHost);
    forms.specs = {
      addRow: function (o) { specList.push({ k: o.k, v: o.v }); drawSpecs(); }
    };

    var tabForms = [fBase.el, fPrice, fStock.el, fImg, specsHost];
    tabs.forEach(function (t, i) {
      var b = U.el('button', { class: 'chip' + (i === 0 ? ' chip-primary' : ''), text: t });
      b.addEventListener('click', function () {
        tabIdx = i;
        U.$$('.chip', tabsBar).forEach(function (x, j) { x.classList.toggle('chip-primary', j === i); });
        U.$$('.tab-panel', content).forEach(function (x, j) { x.classList.toggle('hidden', j !== i); });
      });
      tabsBar.appendChild(b);
    });
    tabForms.forEach(function (el, i) {
      var p2 = U.el('div', { class: 'tab-panel' + (i === 0 ? '' : ' hidden') }, [el]);
      content.appendChild(p2);
    });
    body.appendChild(tabsBar); body.appendChild(content);

    var saveBtn = U.el('button', { class: 'btn btn-primary' }, [UI.icon('check', 17), U.el('span', { text: isNew ? 'ثبت جنس جدید' : 'ذخیره تغییرات' })]);
    var delBtn = U.el('button', { class: 'btn btn-danger', text: 'حذف جنس' });
    delBtn.classList.toggle('hidden', isNew);
    delBtn.addEventListener('click', function () {
      U.confirm('جنس «' + (draft.name || '') + '» حذف شود؟', { danger: true, okText: 'حذف' }).then(function (ok) {
        if (!ok) return;
        S().removeProduct(draft.id);
        m.close(); U.toast('حذف شد', 'ok'); renderPage('products');
      });
    });
    var foot = U.el('div', { class: 'row gap-sm wrap' }, [saveBtn, delBtn]);
    saveBtn.addEventListener('click', function () {
      try {
        var data = Object.assign({}, draft, fBase.values(), fPricing.values(), fStock.values());
        delete data.marginView;
        data.specs = specList;
        data.tags = Array.isArray(data.tags) ? data.tags : String(data.tags || '').split(/[،,]/).map(function (s) { return s.trim(); }).filter(Boolean);
        data.image = draft.image;
        data.fp = draft.fp || data.fp;
        data.gallery = draft.gallery || [];
        var saved = S().saveProduct(data);
        U.toast(isNew ? 'جنس جدید ثبت شد ✅' : 'تغییرات ذخیره شد ✅', 'ok');
        m.close();
        renderPage(state.page === 'pos' ? 'products' : state.page);
        if (!isNew) { }
        draft.id = saved.id;
      } catch (e) { U.toast(e.message, 'err', 4200); }
    });
    var m = U.modal({ title: (isNew ? 'افزودن جنس جدید' : 'ویرایش: ' + p.name), content: body, footer: foot, size: 'lg' });
    refreshAnalysis(); updateBarcodePreview();
    editProduct.refreshGallery = function () {
      galleryHost.innerHTML = '';
      (draft.gallery || []).forEach(function (g, i) {
        var d = U.el('div', { style: { position: 'relative' } });
        d.innerHTML = '<img src="' + g + '" style="width:76px;height:76px;object-fit:cover;border-radius:12px;border:1px solid var(--line)">';
        var rm = U.el('button', { class: 'icon-btn round', style: { position: 'absolute', top: '-6px', insetInlineEnd: '-6px' }, html: UI.iconHTML('x', 12) });
        rm.addEventListener('click', function () { draft.gallery.splice(i, 1); editProduct.refreshGallery(); });
        d.appendChild(rm);
        galleryHost.appendChild(d);
      });
      galleryHost.appendChild(galBtn); galleryHost.appendChild(galInput);
    };
    return m;
  }

  function showBarcode(p) {
    var body = U.el('div', { class: 'center' });
    body.innerHTML = '<div style="max-width:340px;margin:0 auto">' + UI.labelHTML(p) + '</div>' +
      '<div class="muted small mt">کد: <b>' + U.esc(p.barcode) + '</b>' + (Shop.barcode.ean13Valid(p.barcode) ? ' — بارکد استاندارد EAN-13 ✅' : '') + '</div>' +
      '<div class="muted small">همین عدد را در فیلد جست‌وجوی بخش مشتریان هم می‌توانید بزنید.</div>' +
      '<div class="row gap-sm wrap mt center" style="justify-content:center">' +
      '<button class="btn btn-primary btn-sm" id="bPrint">چاپ برچسب</button>' +
      '<button class="btn btn-ghost btn-sm" id="bCopy">کپی کد</button>' +
      '<button class="btn btn-ghost btn-sm" id="bDown">دانلود PNG</button>' +
      '<a class="btn btn-ghost btn-sm" href="index.html?code=' + encodeURIComponent(p.barcode) + '" target="_blank">صفحه‌ی مشتری</a>' +
      '</div>';
    var m = U.modal({ title: 'بارکد و برچسب «' + p.name + '»', content: body });
    U.$('#bPrint', body).addEventListener('click', function () { UI.printLabels([p], { copies: 1 }); });
    U.$('#bCopy', body).addEventListener('click', function () { U.copy(p.barcode).then(function () { U.toast('کد کپی شد', 'ok'); }); });
    U.$('#bDown', body).addEventListener('click', function () {
      var url = Shop.barcode.toDataURL(p.barcode, {});
      U.download('barcode-' + p.barcode + '.png', null, null) || 0;
      var a = U.el('a', { href: url, download: 'barcode-' + p.barcode + '.png' });
      document.body.appendChild(a); a.click(); a.remove();
    });
  }

  /* تغییر گروهی قیمت */
  function bulkPriceModal(after) {
    var mode = U.el('select', { class: 'input' }, [
      U.el('option', { value: 'pct', text: 'درصدی (٪) — مثال: ۱۰٪ گران‌تر' }),
      U.el('option', { value: 'add', text: 'مبلغ ثابت (تومان) — مثال: ۵۰۰۰ بیشتر' }),
      U.el('option', { value: 'set', text: 'قیمت ثابت برای همه (تومان)' })
    ]);
    var value = U.el('input', { class: 'input', inputmode: 'numeric', placeholder: 'مقدار (مثلاً 10 یا -5 برای کاهش)' });
    var basis = U.el('select', { class: 'input' }, [
      U.el('option', { value: 'price', text: 'بر پایه‌ی قیمت فروش فعلی' }),
      U.el('option', { value: 'cost', text: 'بر پایه‌ی قیمت خرید (قیمت = خرید + درصد)' })
    ]);
    var scope = U.el('select', { class: 'input' });
    scope.appendChild(U.el('option', { value: '', text: 'همه‌ی اجناس' }));
    S().listCategories().forEach(function (c) { scope.appendChild(U.el('option', { value: c.id, text: 'دسته: ' + c.name })); });
    scope.appendChild(U.el('option', { value: 'low', text: 'فقط کم‌موجودها' }));
    var rounding = U.el('select', { class: 'input' }, [
      U.el('option', { value: 'none', text: 'بدون گرد کردن' }),
      U.el('option', { value: 'up1000', text: 'گرد به هزار (بالا)' }),
      U.el('option', { value: 'down1000', text: 'گرد به هزار (پایین)' }),
      U.el('option', { value: 'up500', text: 'گرد به ۵۰۰ (بالا)' })
    ]);
    var body = U.el('div', { class: 'col gap-sm' });
    body.appendChild(U.el('div', { class: 'alert alert-warn small', text: '⚠️ این عملیات روی همه‌ی اجناس انتخاب‌شده اعمال می‌شود. پیش از اجرا از «پشتیبان‌گیری» فایل بگیرید.' }));
    [['نوع تغییر', mode], ['مقدار', value], ['مبنای محاسبه', basis], ['روی کدام اجناس؟', scope], ['گرد کردن', rounding]].forEach(function (x) {
      var w = U.el('div', {});
      w.appendChild(U.el('label', { class: 'lbl', text: x[0] }));
      w.appendChild(x[1]);
      body.appendChild(w);
    });
    var apply = U.el('button', { class: 'btn btn-primary' }, [UI.icon('calc', 16), U.el('span', { text: 'اعمال و مشاهده‌ی نتیجه' })]);
    var foot = U.el('div', { class: 'row gap-sm' }, [apply]);
    var m = U.modal({ title: 'تغییر گروهی قیمت‌ها', content: body, footer: foot });
    apply.addEventListener('click', function () {
      var v = U.num(value.value);
      if (mode.value !== 'round' && !v && mode.value !== 'set') return U.toast('مقدار را وارد کنید', 'warn');
      var ids = null;
      if (scope.value === 'low') ids = DB().products.filter(function (x) { return x.stock <= (x.minStock || 0); }).map(function (x) { return x.id; });
      else if (scope.value) ids = DB().products.filter(function (x) { return x.categoryId === scope.value; }).map(function (x) { return x.id; });
      var count = (ids ? ids.length : DB().products.length);
      U.confirm('قیمت ' + U.toFa(count) + ' جنس تغییر می‌کند. تأیید می‌کنید؟', { okText: 'اعمال کن' }).then(function (ok) {
        if (!ok) return;
        try {
          var n = S().bulkPrice({ ids: ids, mode: mode.value, value: v, basis: basis.value, rounding: rounding.value });
          U.toast(U.toFa(n) + ' قیمت به‌روز شد', 'ok');
          m.close();
          if (after) after();
        } catch (e) { U.toast(e.message, 'err'); }
      });
    });
  }

  /* ورود از CSV/اکسل */
  function importCSV() {
    var body = U.el('div', {});
    body.innerHTML = '<div class="alert alert-info small">فایل CSV (خروجی اکسل) را انتخاب کنید. ستون‌های پشتیبانی‌شده: نام، کد کالا، بارکد، دسته‌بندی، واحد، قیمت خرید، قیمت فروش، قیمت عمده، موجودی، حد بحرانی، تأمین‌کننده، محل قرارگیری، برچسب‌ها، برند، توضیحات، تاریخ انقضا.<br>ردیف اول باید سرستون باشد.</div>' +
      '<div class="row gap-sm wrap mb"><button class="btn btn-primary btn-sm" id="pickBtn">انتخاب فایل</button>' +
      '<button class="btn btn-ghost btn-sm" id="tplBtn">دانلود نمونه (قالب)</button>' +
      '<button class="btn btn-ghost btn-sm" id="pasteBtn">چسباندن متن جدول</button></div>' +
      '<div id="impResult"></div>';
    var input = U.el('input', { type: 'file', accept: '.csv,text/csv,text/plain', class: 'hidden' });
    body.appendChild(input);
    var m = U.modal({ title: 'ورود اجناس از CSV', content: body });
    U.$('#pickBtn', body).addEventListener('click', function () { input.click(); });
    U.$('#tplBtn', body).addEventListener('click', function () {
      U.download('قالب-اجناس.csv', S().csvTemplate(), 'text/csv;charset=utf-8');
    });
    U.$('#pasteBtn', body).addEventListener('click', function () {
      U.prompt('متن جدول (مقادیر با کاما یا Tab جدا شده باشند)', '', { type: 'textarea' }).then(function (txt) {
        if (!txt) return;
        run(txt);
      });
    });
    function run(text) {
      try {
        var r = S().csvImportProducts(text);
        U.$('#impResult', body).innerHTML = '<div class="alert alert-ok">' + U.toFa(r.added) + ' جنس جدید افزوده شد و ' + U.toFa(r.updated) + ' جنس به‌روزرسانی شد.</div>' +
          (r.errors.length ? '<div class="alert alert-warn small">' + r.errors.slice(0, 8).join('<br>') + '</div>' : '');
        U.toast('ورود انجام شد', 'ok');
        renderPage('products');
      } catch (e) { U.toast(e.message, 'err', 4000); }
    }
    input.addEventListener('change', function () {
      var f = input.files[0];
      if (!f) return;
      var fr = new FileReader();
      fr.onload = function () { run(fr.result); };
      fr.readAsText(f, 'utf-8');
    });
  }

  /* ================= دسته‌بندی‌ها ================= */
  function renderCategories(host) {
    var stats = S().categoryStats();
    var card = U.el('div', { class: 'card' });
    var head = U.el('div', { class: 'card-head' });
    head.innerHTML = '<h3>' + UI.iconHTML('tag', 18) + ' دسته‌بندی‌های فروشگاه</h3>';
    var addBtn = U.el('button', { class: 'btn btn-primary btn-sm' }, [UI.icon('plus', 16), U.el('span', { text: 'دسته‌بندی جدید' })]);
    addBtn.addEventListener('click', function () { catEditor(null); });
    head.appendChild(addBtn);
    card.appendChild(head);
    card.appendChild(U.el('div', { class: 'muted small mb', text: 'با دسته‌بندی‌ها، دسترسی به اجناس در پنل و در فروشگاه مشتریان سریع‌تر می‌شود. هر دسته می‌تواند زیر‌دسته هم داشته باشد.' }));

    var tbl = UI.table({
      rows: stats, perPage: 50, searchable: true, searchText: function (s) { return s.name; },
      sort: 'value', dir: 'desc',
      sorters: { name: function (a, b) { return a.name.localeCompare(b.name, 'fa'); }, count: function (a, b) { return a.count - b.count; }, stock: function (a, b) { return a.stock - b.stock; }, value: function (a, b) { return a.value - b.value; } },
      columns: [
        { key: 'name', title: 'دسته', render: function (c) { return '<span style="font-size:1.2rem">' + (c.icon || '📦') + '</span> <b>' + U.esc(c.name) + '</b>' + (S().getCategory(c.id) && S().getCategory(c.id).parentId ? ' <span class="pill pill-info">زیر‌دسته‌ی ' + U.esc(S().getCategory(S().getCategory(c.id).parentId).name) + '</span>' : ''); } },
        { key: 'count', title: 'تعداد اجناس', render: function (c) { return U.toFa(c.count) + ' جنس'; } },
        { key: 'stock', title: 'تعداد موجود', render: function (c) { return U.toFa(U.group(c.stock)) + ' عدد'; } },
        { key: 'value', title: 'ارزش انبار', render: function (c) { return U.money(c.value); } },
        {
          key: 'actions', title: 'عملیات', render: function (c) {
            var box = U.el('div', { class: 'row gap-xs' });
            function ib(icon, title, fn) {
              var b = U.el('button', { class: 'icon-btn', title: title, html: UI.iconHTML(icon, 16) });
              b.addEventListener('click', fn);
              return b;
            }
            box.appendChild(ib('edit', 'ویرایش', function () { catEditor(S().getCategory(c.id)); }));
            box.appendChild(ib('box', 'مشاهده‌ی اجناس', function () {
              state.productFilter.cat = c.id; go('products');
            }));
            box.appendChild(ib('trash', 'حذف', function () {
              var others = S().listCategories().filter(function (x) { return x.id !== c.id; });
              var sel = U.el('select', { class: 'input' });
              sel.appendChild(U.el('option', { value: '', text: '— بدون دسته (حذف بدون جایگزین) —' }));
              others.forEach(function (o) { sel.appendChild(U.el('option', { value: o.id, text: o.name })); });
              var body = U.el('div', {});
              body.innerHTML = '<p class="muted">اگر می‌خواهید اجناس این دسته حذف نشوند، دسته‌ی مقصد را انتخاب کنید:</p>';
              body.appendChild(sel);
              var foot = U.el('div', { class: 'row gap-sm' }, [U.el('button', {
                class: 'btn btn-danger', text: 'حذف دسته', onclick: function () {
                  try {
                    var n = S().removeCategory(c.id, sel.value || null);
                    U.toast('دسته حذف شد' + (n ? ' — ' + U.toFa(n) + ' جنس به دسته‌ی جدید منتقل شد' : ''), 'ok');
                    mm.close(); renderPage('categories');
                  } catch (e) { U.toast(e.message, 'err', 4000); }
                }
              })]);
              var mm = U.modal({ title: 'حذف دسته‌بندی «' + c.name + '»', content: body, footer: foot });
            }));
            return box;
          }
        }
      ],
      empty: 'دسته‌بندی‌ای ثبت نشده'
    });
    card.appendChild(tbl.el);
    host.appendChild(card);
  }
  function catEditor(cat) {
    var isNew = !cat;
    var cats = S().listCategories().filter(function (c) { return !cat || c.id !== cat.id; });
    var f = UI.form({
      fields: [
        { key: 'name', label: 'نام دسته', value: cat ? cat.name : '', full: true },
        { key: 'icon', label: 'آیکن (اموجی)', value: cat ? cat.icon : '📦', placeholder: '📦 🥤 🧼 📚 …' },
        { key: 'color', label: 'رنگ', type: 'text', value: cat ? cat.color : '#0e9f6e' },
        { key: 'parentId', label: 'زیرمجموعه‌ی', type: 'select', value: cat && cat.parentId ? cat.parentId : '', options: [{ value: '', label: '— دسته‌ی اصلی —' }].concat(cats.map(function (c) { return { value: c.id, label: c.name }; })) },
        { key: 'order', label: 'ترتیب نمایش', type: 'number', value: cat ? cat.order : cats.length + 1 },
        { key: 'keywords', label: 'کلمات کلیدی (برای تطبیق هوشمند)', type: 'tags', value: cat ? cat.keywords : [], full: true, help: 'مثال: لبنی، ماست، پنیر — این کلمات در «تحلیل تصویر» و «پیام پایان روز» برای تشخیص دسته استفاده می‌شوند.' }
      ]
    });
    var save = U.el('button', {
      class: 'btn btn-primary', html: UI.iconHTML('check', 16) + ' ذخیره', onclick: function () {
        try {
          var v = f.values();
          v.id = cat ? cat.id : null;
          S().saveCategory(v);
          U.toast('ذخیره شد', 'ok'); m.close(); renderPage('categories');
        } catch (e) { U.toast(e.message, 'err'); }
      }
    });
    var m = U.modal({ title: isNew ? 'دسته‌بندی جدید' : 'ویرایش دسته‌بندی', content: f.el, footer: U.el('div', { class: 'row gap-sm' }, [save]) });
  }

  /* ================= انبار ================= */
  function renderStock(host) {
    var sum = S().stockSummary();
    var grid = U.el('div', { class: 'stats-grid' });
    grid.appendChild(UI.statCard({ label: 'ارزش انبار (خرید)', value: U.moneyShort(sum.value), sub: U.toFa(U.group(sum.units)) + ' عدد کالا', icon: 'box', tone: 'primary' }));
    grid.appendChild(UI.statCard({ label: 'ارزش فروش موجودی', value: U.moneyShort(sum.retail), sub: 'سود بالقوه ' + U.moneyShort(sum.potentialProfit), icon: 'chart' }));
    grid.appendChild(UI.statCard({ label: 'کم‌موجود', value: U.toFa(sum.low.length), sub: 'نیاز به سفارش', icon: 'warn', tone: 'warn' }));
    grid.appendChild(UI.statCard({ label: 'ناموجود', value: U.toFa(sum.out.length), sub: 'فوراً سفارش دهید', icon: 'warn', tone: 'err' }));
    host.appendChild(grid);

    var tabs = [['low', 'کم‌موجود و ناموجود'], ['all', 'همه‌ی اجناس'], ['moves', 'گردش انبار'], ['stocktake', 'انبارگردانی'], ['expiry', 'تاریخ انقضا']];
    var chips = U.el('div', { class: 'chips mb' });
    tabs.forEach(function (t) {
      var b = U.el('button', { class: 'chip' + (state.stockFilter.tab === t[0] ? ' chip-primary' : ''), text: t[1] });
      b.addEventListener('click', function () { state.stockFilter.tab = t[0]; renderPage('stock'); });
      chips.appendChild(b);
    });
    host.appendChild(chips);
    var body = U.el('div', { class: 'card' });
    host.appendChild(body);

    if (state.stockFilter.tab === 'low' || state.stockFilter.tab === 'all') {
      var rows = state.stockFilter.tab === 'low' ? sum.out.concat(sum.low) : DB().products.slice();
      var tbl = UI.table({
        rows: rows, perPage: 25, searchable: true, searchText: function (p) { return p.name + ' ' + p.barcode + ' ' + p.location; },
        sort: 'stock', dir: 'asc', sorters: { name: function (a, b) { return a.name.localeCompare(b.name, 'fa'); }, stock: function (a, b) { return a.stock - b.stock; }, value: function (a, b) { return a.stock * a.cost - b.stock * b.cost; } },
        columns: [
          { key: 'name', title: 'جنس', render: function (p) { return '<b>' + U.esc(p.name) + '</b><div class="small muted">' + U.esc(p.location || '') + (p.supplier ? ' • ' + U.esc(p.supplier) : '') + '</div>'; } },
          { key: 'stock', title: 'موجودی', render: function (p) { return U.toFa(U.group(p.stock)) + ' ' + U.esc(p.unit) + ' ' + UI.stockPill(p); } },
          { key: 'minStock', title: 'حد بحرانی', render: function (p) { return U.toFa(p.minStock || 0); } },
          { key: 'value', title: 'ارزش', render: function (p) { return U.money(p.stock * p.cost); } },
          {
            key: 'actions', title: 'تغییر موجودی', render: function (p) {
              var box = U.el('div', { class: 'row gap-xs' });
              var inp = U.el('input', { class: 'input input-sm', style: { width: '76px' }, placeholder: 'تعداد' });
              var add = U.el('button', { class: 'btn btn-primary btn-sm', text: 'افزودن' });
              var rem = U.el('button', { class: 'btn btn-ghost btn-sm', text: 'کاهش' });
              function apply(sign) {
                var v = U.num(inp.value);
                if (!v) return U.toast('تعداد را وارد کنید', 'warn');
                try {
                  S().adjustStock(p.id, sign * v, sign > 0 ? 'in' : 'out', sign > 0 ? 'افزایش دستی' : 'کاهش دستی');
                  U.toast('موجودی «' + p.name + '»: ' + U.toFa(S().getProduct(p.id).stock), 'ok');
                  renderPage('stock');
                } catch (e) { U.toast(e.message, 'err', 4000); }
              }
              add.addEventListener('click', function () { apply(1); });
              rem.addEventListener('click', function () { apply(-1); });
              box.appendChild(inp); box.appendChild(add); box.appendChild(rem);
              return box;
            }
          }
        ],
        empty: 'موردی نیست — عالی!'
      });
      body.appendChild(tbl.el);
    }

    if (state.stockFilter.tab === 'moves') {
      var moves = DB().movements.slice(0, 400).map(function (m) {
        var p = S().getProduct(m.pid);
        return Object.assign({}, m, { pname: p ? p.name : 'حذف‌شده' });
      });
      var typeLabel = { in: '📦 افزایش', out: '📤 کاهش', sale: '🟢 فروش', return: '↩️ مرجوعی', waste: '🗑️ ضایعات', adjust: '✏️ اصلاح', stocktake: '🧮 انبارگردانی' };
      body.appendChild(UI.table({
        rows: moves, perPage: 25, searchable: true, searchText: function (m) { return m.pname + ' ' + m.note; },
        sort: 'at', dir: 'desc', sorters: { at: function (a, b) { return a.at - b.at; }, qty: function (a, b) { return Math.abs(a.qty) - Math.abs(b.qty); } },
        columns: [
          { key: 'at', title: 'زمان', render: function (m) { return '<span class="nowrap">' + U.jDate(m.at) + ' ' + U.jTime(m.at) + '</span>'; } },
          { key: 'pname', title: 'جنس', render: function (m) { return U.esc(m.pname); } },
          { key: 'type', title: 'نوع', render: function (m) { return typeLabel[m.type] || m.type; } },
          { key: 'qty', title: 'تغییر', render: function (m) { return '<b style="color:' + (m.qty > 0 ? 'var(--primary)' : 'var(--danger)') + '">' + (m.qty > 0 ? '+' : '−') + U.toFa(Math.abs(m.qty)) + '</b>'; } },
          { key: 'after', title: 'موجودی پس از تغییر', render: function (m) { return U.toFa(m.after); } },
          { key: 'note', title: 'توضیح', render: function (m) { return '<span class="muted small">' + U.esc(m.note || '') + '</span>'; } }
        ]
      }).el);
    }

    if (state.stockFilter.tab === 'stocktake') {
      body.appendChild(UI.section('انبارگردانی (شمارش فیزیکی)', 'calc'));
      body.appendChild(U.el('div', { class: 'alert alert-info small', text: 'موجودی واقعی قفسه‌ها را وارد کنید؛ سامانه تفاوت‌ها را محاسبه و اعمال می‌کند و یک گزارش انبارگردانی ثبت می‌شود.' }));
      var hostRows = U.el('div', {});
      var list = DB().products.slice(0, 300);
      var inputs = {};
      var tbl = UI.table({
        rows: list, perPage: 30, searchable: true, searchText: function (p) { return p.name + ' ' + (p.location || ''); },
        columns: [
          { key: 'name', title: 'جنس', render: function (p) { return '<b>' + U.esc(p.name) + '</b><div class="small muted">' + U.esc(p.location || '') + '</div>'; } },
          { key: 'stock', title: 'موجودی سیستم', render: function (p) { return U.toFa(p.stock) + ' ' + U.esc(p.unit); } },
          {
            key: 'counted', title: 'شمارش واقعی', render: function (p) {
              var i = U.el('input', { class: 'input input-sm', style: { width: '90px' }, inputmode: 'numeric', placeholder: '—' });
              inputs[p.id] = i;
              return i;
            }
          }
        ]
      });
      body.appendChild(tbl.el);
      var applyBtn = U.el('button', { class: 'btn btn-primary mt' }, [UI.icon('check', 17), U.el('span', { text: 'اعمال نتایج شمارش' })]);
      applyBtn.addEventListener('click', function () {
        var changes = [];
        Object.keys(inputs).forEach(function (pid) {
          if (!inputs[pid].value.trim()) return;
          var p = S().getProduct(pid);
          var counted = U.num(inputs[pid].value);
          if (counted !== p.stock) changes.push({ pid: pid, name: p.name, expected: p.stock, counted: counted, diff: counted - p.stock });
        });
        if (!changes.length) return U.toast('تفاوتی برای اعمال نیست', 'info');
        U.confirm(U.toFa(changes.length) + ' جنس تفاوت دارد. اعمال شود؟', { okText: 'اعمال' }).then(function (ok) {
          if (!ok) return;
          changes.forEach(function (c) { S().setStock(c.pid, c.counted, 'انبارگردانی'); });
          DB().stocktakes.unshift({ id: U.uuid('st'), at: Date.now(), items: changes });
          S().save();
          U.toast('انبارگردانی ثبت شد (' + U.toFa(changes.length) + ' اصلاح)', 'ok', 3500);
          renderPage('stock');
        });
      });
      body.appendChild(applyBtn);
    }

    if (state.stockFilter.tab === 'expiry') {
      body.appendChild(UI.section('اجناس دارای تاریخ انقضا', 'clock'));
      var withExp = DB().products.filter(function (p) { return p.expiry; });
      if (!withExp.length) body.appendChild(U.el('div', { class: 'empty', text: 'برای هیچ جنسی تاریخ انقضا ثبت نشده — در فرم ویرایش هر جنس می‌توانید وارد کنید.' }));
      else body.appendChild(UI.table({
        rows: withExp, perPage: 25,
        columns: [
          { key: 'name', title: 'جنس', render: function (p) { return U.esc(p.name); } },
          { key: 'expiry', title: 'تاریخ انقضا', render: function (p) { return U.toFa(U.toEn(String(p.expiry))); } },
          {
            key: 'days', title: 'وضعیت', render: function (p) {
              var d = Math.ceil((new Date(p.expiry).getTime() - Date.now()) / 86400000);
              if (isNaN(d)) return '<span class="pill pill-muted">نامشخص</span>';
              return d < 0 ? '<span class="pill pill-err">منقضی (' + U.toFa(Math.abs(d)) + ' روز)</span>' : (d < 30 ? '<span class="pill pill-warn">' + U.toFa(d) + ' روز مانده</span>' : '<span class="pill pill-ok">' + U.toFa(d) + ' روز</span>');
            }
          },
          { key: 'stock', title: 'موجودی', render: function (p) { return U.toFa(p.stock); } }
        ]
      }).el);
    }
  }

  /* ================= فاکتورها ================= */
  function renderInvoices(host) {
    var filter = U.el('div', { class: 'card tight' });
    var row = U.el('div', { class: 'row gap-sm wrap' });
    var from = U.el('input', { type: 'date', class: 'input input-sm' });
    var to = U.el('input', { type: 'date', class: 'input input-sm' });
    var q = U.el('input', { class: 'input input-sm', placeholder: 'جست‌وجو در نام کالا…' });
    var expBtn = U.el('button', { class: 'btn btn-ghost btn-sm' }, [UI.icon('download', 15), U.el('span', { text: 'خروجی CSV فروش' })]);
    row.appendChild(U.el('span', { class: 'muted small', text: 'از:' })); row.appendChild(from);
    row.appendChild(U.el('span', { class: 'muted small', text: 'تا:' })); row.appendChild(to);
    row.appendChild(q); row.appendChild(expBtn);
    filter.appendChild(row);
    host.appendChild(filter);
    var body = U.el('div', { class: 'card' });
    host.appendChild(body);

    function list() {
      var f = from.value ? new Date(from.value).getTime() : 0;
      var t = to.value ? new Date(to.value).setHours(23, 59, 59, 999) : Date.now();
      var rows = S().salesInRange(f, t);
      if (q.value) {
        var nq = U.norm(q.value);
        rows = rows.filter(function (s) {
          return s.items.some(function (i) { return U.norm(i.name).indexOf(nq) > -1; }) || String(s.no) === U.toEn(q.value);
        });
      }
      return rows.slice().sort(function (a, b) { return b.at - a.at; });
    }
    function draw() {
      body.innerHTML = '';
      var rows = list();
      var st = { revenue: U.sum(rows, function (s) { return s.total; }), profit: U.sum(rows, function (s) { return s.profit; }) };
      var g = U.el('div', { class: 'stats-grid' });
      g.appendChild(UI.statCard({ label: 'تعداد فاکتور', value: U.toFa(rows.length), icon: 'clock' }));
      g.appendChild(UI.statCard({ label: 'فروش بازه', value: U.moneyShort(st.revenue), tone: 'primary', icon: 'wallet' }));
      g.appendChild(UI.statCard({ label: 'سود بازه', value: U.moneyShort(st.profit), icon: 'chart' }));
      body.appendChild(g);
      var tbl = UI.table({
        rows: rows, perPage: 20, sort: 'at', dir: 'desc',
        sorters: { at: function (a, b) { return a.at - b.at; }, total: function (a, b) { return a.total - b.total; }, profit: function (a, b) { return a.profit - b.profit; } },
        columns: [
          { key: 'no', title: 'شماره', render: function (s) { return '<b>#' + U.toFa(s.no) + '</b>'; } },
          { key: 'at', title: 'تاریخ و ساعت', render: function (s) { return '<span class="nowrap">' + U.jDate(s.at) + ' — ' + U.jTime(s.at) + '</span>'; } },
          { key: 'items', title: 'اقلام', render: function (s) { return U.toFa(s.items.length) + ' قلم <div class="small muted truncate" style="max-width:230px">' + U.esc(s.items.map(function (i) { return i.name; }).join('، ')) + '</div>'; } },
          { key: 'payment', title: 'پرداخت', render: function (s) { return { cash: '<span class="pill pill-ok">نقدی</span>', card: '<span class="pill pill-info">کارتی</span>', credit: '<span class="pill pill-warn">نسیه</span>' }[s.payment] || s.payment; } },
          { key: 'total', title: 'مبلغ', render: function (s) { return '<b>' + U.money(s.total) + '</b>'; } },
          { key: 'profit', title: 'سود', render: function (s) { return U.money(s.profit); } },
          {
            key: 'actions', title: 'عملیات', render: function (s) {
              var box = U.el('div', { class: 'row gap-xs' });
              function ib(icon, title, fn) {
                var b = U.el('button', { class: 'icon-btn', title: title, html: UI.iconHTML(icon, 16) });
                b.addEventListener('click', fn);
                return b;
              }
              box.appendChild(ib('print', 'چاپ فاکتور', function () { UI.printInvoice(s); }));
              box.appendChild(ib('search', 'مشاهده‌ی جزئیات', function () {
                var b2 = U.el('div', {});
                b2.innerHTML = UI.invoiceHTML(s);
                U.modal({ title: 'فاکتور #' + U.toFa(s.no), content: b2, size: 'lg' });
              }));
              box.appendChild(ib('trash', 'برگشت فاکتور', function () {
                U.confirm('فاکتور #' + U.toFa(s.no) + ' برگشت داده شود؟ موجودی اجناس به حالت قبل برمی‌گردد.', { danger: true, okText: 'برگشت فاکتور' }).then(function (ok) {
                  if (!ok) return;
                  try { S().removeSale(s.id); U.toast('فاکتور برگشت داده شد', 'ok'); draw(); }
                  catch (e) { U.toast(e.message, 'err'); }
                });
              }));
              return box;
            }
          }
        ],
        empty: 'فاکتوری در این بازه نیست'
      });
      body.appendChild(tbl.el);
    }
    from.addEventListener('change', draw); to.addEventListener('change', draw);
    q.addEventListener('input', U.debounce(draw, 250));
    expBtn.addEventListener('click', function () {
      var rows = list().map(function (s) {
        return [s.no, U.jDate(s.at), U.jTime(s.at), s.items.map(function (i) { return i.name + '×' + i.qty; }).join(' | '), s.total, s.profit, s.payment];
      });
      U.download('فروش-' + U.jDate() + '.csv', U.toCSV(rows, ['شماره', 'تاریخ', 'ساعت', 'اقلام', 'مبلغ', 'سود', 'پرداخت']), 'text/csv;charset=utf-8');
    });
    draw();
  }

  /* ================= ماشین‌حساب قیمت ================= */
  function renderCalculator(host) {
    var grid = U.el('div', { class: 'grid-2' });
    var left = U.el('div', { class: 'card' });
    left.appendChild(UI.section('ماشین‌حساب قیمت‌گذاری', 'calc'));
    left.appendChild(U.el('div', { class: 'muted small mb', text: 'قیمت خرید و قیمت فروش هر جنس را وارد کنید یا با دکمه‌های درصدی، قیمت را کم و زیاد کنید.' }));
    var costI = U.el('input', { class: 'input', inputmode: 'numeric', placeholder: 'قیمت خرید (تومان)' });
    var priceI = U.el('input', { class: 'input', inputmode: 'numeric', placeholder: 'قیمت فروش (تومان)' });
    var targetMargin = U.el('input', { class: 'input', inputmode: 'numeric', placeholder: 'حاشیه‌ی سود هدف (٪) — مثلاً ۲۵' });
    var result = U.el('div', { class: 'alert alert-info' });
    function recalc() {
      var c = U.num(costI.value), p = U.num(priceI.value), tm = U.num(targetMargin.value) || DB().settings.defaultProfit || 25;
      var pr = S().pricing;
      var sugMarkup = pr.fromMarkup(c, tm), sugMargin = pr.fromMargin(c, tm);
      var disc = pr.discountEffect(c, p, 10);
      result.innerHTML =
        '<div class="calc-line"><span>سود هر واحد</span><b>' + U.toman(p - c) + '</b></div>' +
        '<div class="calc-line"><span>حاشیه‌ی سود (Margin)</span><b>' + U.percent(pr.margin(c, p)) + '</b></div>' +
        '<div class="calc-line"><span>درصد روی قیمت خرید (Markup)</span><b>' + U.percent(pr.markup(c, p)) + '</b></div>' +
        '<hr style="border:none;border-top:1px dashed var(--line)">' +
        '<div class="calc-line"><span>قیمت برای ' + U.percent(tm, 0) + ' سود روی خرید</span><b>' + U.toman(sugMarkup) + '</b></div>' +
        '<div class="calc-line"><span>قیمت برای ' + U.percent(tm, 0) + ' حاشیه‌ی سود</span><b>' + U.toman(sugMargin) + '</b></div>' +
        '<hr style="border:none;border-top:1px dashed var(--line)">' +
        '<div class="calc-line"><span>اگر ۱۰٪ تخفیف بدهید، سود هر واحد</span><b>' + U.toman(disc.profit) + ' (' + U.percent(disc.margin) + ')</b></div>' +
        (disc.warn ? '<div class="alert alert-err small">با این تخفیف، فروش زیر قیمت خرید می‌رود!</div>' : '');
    }
    [costI, priceI, targetMargin].forEach(function (i) { i.addEventListener('input', recalc); });
    var f = UI.form({
      fields: [
        { key: 'cost', label: 'قیمت خرید', type: 'money', value: 0 },
        { key: 'price', label: 'قیمت فروش', type: 'money', value: 0 },
        { key: 'target', label: 'حاشیه‌ی سود هدف (٪)', value: DB().settings.defaultProfit || 25 }
      ]
    });
    var calc = UI.priceCalc({
      onApply: function (v) {
        f.fields.price.set(v);
        costI.value = U.group(U.num(f.fields.cost.get()));
        priceI.value = U.group(v);
        recalc();
        U.toast('قیمت محاسبه‌شده آماده است — برای ثبت روی جنس، از جدول سمت راست استفاده کنید.', 'info', 3500);
      },
      applyText: 'انتقال به محاسبات'
    });
    [costI, priceI].forEach(function (i) {
      i.addEventListener('input', U.debounce(function () {
        f.fields.cost.set(U.num(costI.value));
        f.fields.price.set(U.num(priceI.value));
        calc.setCost(U.num(costI.value)); calc.setPrice(U.num(priceI.value));
      }, 260));
    });
    var quick = U.el('div', { class: 'grid-2' });
    quick.appendChild(U.el('div', {}, [f.el]));
    quick.appendChild(U.el('div', {}, [calc.el]));
    left.appendChild(quick);
    left.appendChild(result);
    recalc();

    var right = U.el('div', { class: 'card' });
    right.appendChild(UI.section('اعمال روی اجناس', 'tag'));
    right.appendChild(U.el('div', { class: 'muted small mb', text: 'یک جنس انتخاب کنید تا قیمت پیشنهادی را مستقیم روی آن ثبت کنید، یا از «تغییر گروهی قیمت» برای همه/یک دسته استفاده کنید.' }));
    var sel = U.el('select', { class: 'input' });
    sel.appendChild(U.el('option', { value: '', text: '— انتخاب جنس —' }));
    DB().products.slice().sort(function (a, b) { return a.name.localeCompare(b.name, 'fa'); }).forEach(function (p) {
      sel.appendChild(U.el('option', { value: p.id, text: p.name + ' — فعلی: ' + U.group(p.price) }));
    });
    var current = U.el('div', { class: 'alert alert-info small' });
    sel.addEventListener('change', function () {
      var p = S().getProduct(sel.value);
      if (!p) { current.innerHTML = ''; return; }
      var pr = S().pricing;
      current.innerHTML = '<b>' + U.esc(p.name) + '</b><br>خرید: ' + U.toman(p.cost) + ' • فروش: ' + U.toman(p.price) +
        ' • حاشیه: ' + U.percent(pr.margin(p.cost, p.price)) + '<br>قیمت پیشنهادی برای ' + U.percent(DB().settings.defaultProfit || 25, 0) + ' سود روی خرید: <b>' + U.toman(pr.round(pr.fromMarkup(p.cost, DB().settings.defaultProfit || 25), 'up500')) + '</b>';
      calc.setCost(p.cost); calc.setPrice(p.price);
      costI.value = U.group(p.cost); priceI.value = U.group(p.price); recalc();
    });
    var savePrice = U.el('button', { class: 'btn btn-primary btn-block mt' }, [UI.icon('check', 16), U.el('span', { text: 'ثبت قیمت فعلی روی این جنس' })]);
    savePrice.addEventListener('click', function () {
      var p = S().getProduct(sel.value);
      if (!p) return U.toast('اول یک جنس انتخاب کنید', 'warn');
      var v = U.num(priceI.value);
      p.price = v; p.updatedAt = Date.now();
      S().save(); S().log('تغییر قیمت', p.name + ' → ' + U.toman(v));
      U.toast('قیمت «' + p.name + '» به ' + U.toman(v) + ' تغییر کرد', 'ok', 3200);
      renderPage('calculator');
    });
    var bulk = U.el('button', { class: 'btn btn-outline btn-block mt-sm' }, [UI.icon('calc', 16), U.el('span', { text: 'تغییر گروهی قیمت (درصدی)' })]);
    bulk.addEventListener('click', function () { bulkPriceModal(function () { renderPage('calculator'); }); });
    right.appendChild(sel); right.appendChild(current); right.appendChild(savePrice); right.appendChild(bulk);
    right.appendChild(U.el('div', { class: 'section-head' }, [U.el('h3', { text: 'بررسی سود همه‌ی اجناس' })]));
    var risky = U.el('div', {});
    var bad = DB().products.map(function (p) {
      return { p: p, margin: S().pricing.margin(p.cost, p.price), markup: S().pricing.markup(p.cost, p.price) };
    }).sort(function (a, b) { return a.margin - b.margin; }).slice(0, 10);
    risky.appendChild(UI.table({
      rows: bad, perPage: 10, searchable: false,
      columns: [
        { key: 'p', title: 'جنس', render: function (x) { return U.esc(x.p.name); } },
        { key: 'margin', title: 'حاشیه', render: function (x) { return '<span class="pill pill-' + (x.margin < 8 ? 'err' : x.margin < 15 ? 'warn' : 'ok') + '">' + U.percent(x.margin) + '</span>'; } },
        { key: 'cost', title: 'خرید', render: function (x) { return U.money(x.p.cost); } },
        { key: 'price', title: 'فروش', render: function (x) { return U.money(x.p.price); } },
        { key: 'edit', title: '', render: function (x) { var b = U.el('button', { class: 'btn btn-ghost btn-sm', text: 'اصلاح' }); b.addEventListener('click', function () { editProduct(x.p); }); return b; } }
      ],
      empty: 'موردی نیست'
    }).el);
    right.appendChild(risky);
    grid.appendChild(left); grid.appendChild(right);
    host.appendChild(grid);
  }


  /* ================= سفارش‌های آنلاین مشتریان ================= */
  function ordersCard() {
    var box = U.el('div', { class: 'card' });
    var orders = DB().messages.filter(function (x) { return x.type === 'order'; });
    var head = UI.section('سفارش‌های آنلاین مشتریان', 'cart');
    var badge = U.el('span', { class: 'pill ' + (orders.filter(function (o) { return o.status === 'new'; }).length ? 'pill-err' : 'pill-muted'), text: U.toFa(orders.filter(function (o) { return o.status === 'new'; }).length) + ' سفارش جدید' });
    head.appendChild(badge);
    box.appendChild(head);
    if (!orders.length) {
      box.appendChild(U.el('div', { class: 'alert alert-info small', html: 'سفارش‌هایی که مشتریان در بخش «فروشگاه» ثبت می‌کنند اینجا نمایش داده می‌شود و با یک کلیک به فروش و کسر موجودی تبدیل می‌شود.' }));
      return box;
    }
    orders.slice(0, 12).forEach(function (o) {
      var state = o.status || 'new';
      var card = U.el('div', { class: 'alert ' + (state === 'new' ? 'alert-warn' : (state === 'confirmed' ? 'alert-ok' : 'alert-info')) });
      var stPill = state === 'new' ? '<span class="pill pill-err">جدید</span>' : (state === 'confirmed' ? '<span class="pill pill-ok">تأیید و ثبت شد</span>' : '<span class="pill pill-muted">رد شد</span>');
      card.innerHTML = '<div class="row between wrap gap-sm"><b>' + U.esc((o.customer && o.customer.name) || 'مشتری') + '</b>' + stPill + '</div>' +
        '<div class="small muted">' + U.jDateTime(o.at) + ' • ' + ({ pickup: 'تحویل حضوری', delivery: 'ارسال', inquiry: 'رزرو' }[o.orderType] || '') +
        (o.customer && o.customer.phone ? ' • ☎ ' + U.toFa(U.toEn(o.customer.phone)) : '') + '</div>' +
        '<div class="mt-sm">' + (o.items || []).map(function (i) { return '<span class="chip small">' + U.esc(i.name) + ' × ' + U.toFa(i.qty) + '</span>'; }).join(' ') + '</div>' +
        '<div class="bold mt-sm">جمع: ' + U.money(o.total || 0) + '</div>' +
        (o.note ? '<div class="small muted">توضیح مشتری: ' + U.esc(o.note) + '</div>' : '');
      var row = U.el('div', { class: 'row gap-sm wrap mt-sm' });
      if (state === 'new') {
        var ok = U.el('button', { class: 'btn btn-primary btn-sm', html: UI.iconHTML('check', 15) + ' تأیید و کسر از انبار' });
        ok.addEventListener('click', function () {
          U.confirm('این سفارش به فروش تبدیل شود و از موجودی انبار کسر گردد؟', { okText: 'تأیید سفارش' }).then(function (yes) {
            if (!yes) return;
            try {
              var sale = S().addSale({
                items: (o.items || []).map(function (i) { return { pid: i.pid, qty: i.qty, price: i.price }; }),
                payment: 'cash', customer: o.customer || null, channel: 'online',
                note: 'سفارش آنلاین سایت (#' + o.id.slice(-4).toUpperCase() + ')'
              });
              o.status = 'confirmed'; o.saleNo = sale.no; S().save();
              U.toast('سفارش تأیید شد — فاکتور #' + U.toFa(sale.no) + ' (' + U.toman(sale.total) + ')', 'ok', 4200);
              renderPage('messages');
              U.confirm('فاکتور چاپ شود؟', { okText: 'چاپ فاکتور' }).then(function (p2) { if (p2) UI.printInvoice(sale); });
            } catch (e) { U.toast(e.message, 'err', 4500); }
          });
        });
        var no = U.el('button', { class: 'btn btn-ghost btn-sm', text: 'رد سفارش' });
        no.addEventListener('click', function () {
          o.status = 'rejected'; S().save(); U.toast('سفارش رد شد', 'info'); renderPage('messages');
        });
        row.appendChild(ok); row.appendChild(no);
      }
      if (o.customer && o.customer.phone) {
        var wa = U.el('a', { class: 'btn btn-ghost btn-sm', target: '_blank', html: UI.iconHTML('msg', 15) + ' واتساپ مشتری' });
        wa.href = 'https://wa.me/' + U.toEn(o.customer.phone).replace(/[^0-9]/g, '').replace(/^0/, '98');
        row.appendChild(wa);
      }
      var pr = U.el('button', { class: 'btn btn-ghost btn-sm', html: UI.iconHTML('print', 15) + ' چاپ لیست' });
      pr.addEventListener('click', function () {
        UI.printHTML('<div class="inv-head"><div><h1>سفارش مشتری</h1><div class="l-meta">' + U.jDateTime(o.at) + '</div></div><div class="logo">🧾</div></div>' +
          '<p>مشتری: ' + U.esc((o.customer && o.customer.name) || '') + (o.customer && o.customer.phone ? ' — ' + U.toFa(U.toEn(o.customer.phone)) : '') + '</p>' +
          '<table><thead><tr><th>#</th><th>کالا</th><th>تعداد</th><th>قیمت</th><th>جمع</th></tr></thead><tbody>' +
          (o.items || []).map(function (i, k) { return '<tr><td>' + U.toFa(k + 1) + '</td><td>' + U.esc(i.name) + '</td><td>' + U.toFa(i.qty) + '</td><td>' + U.money(i.price) + '</td><td>' + U.money(i.price * i.qty) + '</td></tr>'; }).join('') +
          '</tbody></table><div class="totals"><div class="grand"><span>جمع</span><span>' + U.money(o.total || 0) + '</span></div></div>', 'سفارش مشتری');
      });
      row.appendChild(pr);
      card.appendChild(row);
      box.appendChild(card);
    });
    return box;
  }

  /* ================= پیام پایان روز ================= */
  function renderMessages(host) {
    host.appendChild(ordersCard());
    var card = U.el('div', { class: 'card' });
    card.appendChild(UI.section('ثبت فروش و موجودی با پیام پایان روز', 'msg'));
    card.appendChild(U.el('div', { class: 'alert alert-info small', html: 'کافی است آخر شب بنویسید چه چیزی فروختید، چه چیزی اضافه شد یا چه چیزی خراب شد. سامانه خودش جنس، تعداد و نوع عملیات را تشخیص می‌دهد و موجودی انبار را به‌روز می‌کند.<br><b>نمونه:</b> «امروز ۳ تا نوشابه فروختم و ۵ عدد آب معدنی اضافه شد»' }));
    var ta = U.el('textarea', { class: 'input', rows: 5, placeholder: 'متن پیام پایان روز…' });
    card.appendChild(ta);
    var exChips = U.el('div', { class: 'chips mt-sm' });
    NLP.EXAMPLES.forEach(function (ex) {
      var b = U.el('button', { class: 'chip small', text: ex.length > 46 ? ex.slice(0, 46) + '…' : ex });
      b.addEventListener('click', function () { ta.value = (ta.value ? ta.value + '\n' : '') + ex; });
      exChips.appendChild(b);
    });
    card.appendChild(U.el('div', { class: 'muted small mt-sm', text: 'نمونه‌ها (برای درج کلیک کنید):' }));
    card.appendChild(exChips);
    var parseBtn = U.el('button', { class: 'btn btn-primary mt' }, [UI.icon('sparkles', 17), U.el('span', { text: 'تحلیل پیام' })]);
    var voiceBtn = U.el('button', { class: 'btn btn-ghost mt' }, [UI.icon('msg', 17), U.el('span', { text: 'گفتن با میکروفون' })]);
    var row = U.el('div', { class: 'row gap-sm' }, [parseBtn, voiceBtn]);
    card.appendChild(row);
    var prevHost = U.el('div', { class: 'mt' });
    card.appendChild(prevHost);
    host.appendChild(card);

    /* میکروفون (Web Speech API در مرورگرهای پشتیبان) */
    voiceBtn.addEventListener('click', function () {
      var SR = root.SpeechRecognition || root.webkitSpeechRecognition;
      if (!SR) return U.toast('مرورگر شما تشخیص گفتار ندارد؛ می‌توانید متن را تایپ کنید (در Chrome اندروید کار می‌کند).', 'warn', 4200);
      var rec = new SR();
      rec.lang = 'fa-IR'; rec.interimResults = true; rec.continuous = false;
      U.toast('🎤 بگویید…', 'info', 2000);
      rec.onresult = function (e) {
        var txt = Array.prototype.map.call(e.results, function (r) { return r[0].transcript; }).join(' ');
        ta.value = txt;
      };
      rec.onerror = function () { U.toast('خطا در تشخیص گفتار', 'err'); };
      try { rec.start(); } catch (e) { }
    });

    parseBtn.addEventListener('click', function () {
      var text = ta.value.trim();
      if (!text) return U.toast('متنی وارد کنید یا از نمونه‌ها استفاده کنید', 'warn');
      var parsed = NLP.parse(text, {});
      state.msgPreview = { text: text, parsed: parsed };
      drawPreview();
    });

    function drawPreview() {
      prevHost.innerHTML = '';
      var pv = state.msgPreview;
      if (!pv) return;
      var parsed = pv.parsed;
      if (!parsed.items.length && !parsed.unresolved.length) {
        prevHost.appendChild(U.el('div', { class: 'alert alert-warn', text: 'چیزی از پیام استخراج نشد.' }));
        return;
      }
      var tbl = U.el('table', { class: 'table' });
      tbl.innerHTML = '<thead><tr><th>جنس</th><th>عملیات</th><th>تعداد</th><th>اثر روی موجودی</th><th>اطمینان</th><th></th></tr></thead>';
      var tb = U.el('tbody');
      parsed.items.forEach(function (it, idx) {
        var tr = U.el('tr');
        var opSel = U.el('select', { class: 'input input-sm' });
        NLP.OPS.forEach(function (o) { opSel.appendChild(U.el('option', { value: o.key, text: o.tag + ' ' + o.label, selected: o.key === it.op })); });
        opSel.addEventListener('change', function () {
          var o = NLP.OPS.filter(function (x) { return x.key === opSel.value; })[0];
          it.op = o.key; it.sign = o.sign; it.opLabel = o.label; it.tag = o.tag;
          pv.edited = true; drawPreview();
        });
        var qty = U.el('input', { class: 'input input-sm', style: { width: '80px' }, value: U.toFa(it.qty), inputmode: 'numeric' });
        qty.addEventListener('change', function () { it.qty = Math.abs(U.num(qty.value) || 1); pv.edited = true; drawPreview(); });
        tr.innerHTML = '<td><b>' + U.esc(it.name) + '</b><div class="small muted">' + U.esc(it.raw.slice(0, 60)) + '</div></td>';
        var td2 = U.el('td'); td2.appendChild(opSel); tr.appendChild(td2);
        var td3 = U.el('td'); td3.appendChild(qty); tr.appendChild(td3);
        var effect = it.op === 'count' ? ('انتقال به ' + U.toFa(it.qty) + ' ' + it.unit) :
          (it.sign > 0 ? 'افزایش ' + U.toFa(it.qty) : 'کاهش ' + U.toFa(it.qty)) + ' ' + it.unit + ' (موجودی فعلی ' + U.toFa(it.stockBefore) + ')';
        tr.appendChild(U.el('td', { class: 'small', text: effect }));
        var conf = it.matchScore >= 0.75 ? 'ok' : (it.matchScore >= 0.55 ? 'warn' : 'err');
        tr.appendChild(U.el('td', { html: '<span class="pill pill-' + conf + '">' + U.percent(it.matchScore * 100, 0) + '</span>' + (it.qtyDetected ? '' : ' <span class="pill pill-info">۱ پیش‌فرض</span>') }));
        var rm = U.el('button', { class: 'icon-btn', html: UI.iconHTML('x', 14) });
        rm.addEventListener('click', function () {
          pv.parsed.items.splice(idx, 1);
          pv.edited = true; drawPreview();
        });
        var td6 = U.el('td'); td6.appendChild(rm); tr.appendChild(td6);
        tb.appendChild(tr);
      });
      tbl.appendChild(tb);
      prevHost.appendChild(tbl);

      if (parsed.unresolved.length) {
        prevHost.appendChild(U.el('div', { class: 'alert alert-warn' }));
        var lastP = prevHost.lastChild;
        lastP.innerHTML = '<b>موارد نامشخص</b> (جنس در کاتالوگ پیدا نشد):<br>' +
          parsed.unresolved.map(function (u) { return '• «' + U.esc(u.raw) + '»'; }).join('<br>') +
          '<div class="small mt-sm">با دکمه‌ی زیر می‌توانید جنس جدید بسازید یا نام را در کاتالوگ اصلاح کنید.</div>';
        var addNew = U.el('button', { class: 'btn btn-ghost btn-sm mt-sm', html: UI.iconHTML('plus', 15) + ' افزودن جنس جدید از مورد نامشخص' });
        addNew.addEventListener('click', function () {
          var first = parsed.unresolved[0];
          var guess = (first.suggestion || first.raw || '').replace(/^['«]|[»']$/g, '').trim();
          editProduct(null, { name: guess.slice(0, 60) });
        });
        lastP.appendChild(addNew);
      }

      var summary = U.el('div', { class: 'alert alert-ok' });
      summary.innerHTML = 'این پیام باعث می‌شود: <b>' + U.toFa(parsed.saleQty) + '</b> فروش، <b>' + U.toFa(parsed.restockQty) +
        '</b> افزایش موجودی، <b>' + U.toFa(parsed.wasteQty) + '</b> ضایعات، <b>' + U.toFa(parsed.returnQty) + '</b> مرجوعی' +
        (parsed.countQty ? ' و <b>' + U.toFa(parsed.countQty) + '</b> ردیف شمارش موجودی' : '') + ' ثبت شود.';
      prevHost.appendChild(summary);

      var paySel = U.el('select', { class: 'input input-sm' }, [U.el('option', { value: 'cash', text: 'پرداخت نقدی' }), U.el('option', { value: 'card', text: 'کارت' }), U.el('option', { value: 'credit', text: 'نسیه' })]);
      var applyBtn = U.el('button', { class: 'btn btn-primary' }, [UI.icon('check', 17), U.el('span', { text: 'اعمال روی انبار و فروش' })]);
      applyBtn.addEventListener('click', function () {
        U.confirm('موجودی انبار مطابق این پیام به‌روز شود؟', { okText: 'اعمال کن' }).then(function (ok) {
          if (!ok) return;
          try {
            var res = NLP.apply(parsed, { raw: pv.text, payment: paySel.value });
            U.toast('ثبت شد — ' + U.toFa(res.applied.length) + ' مورد' + (res.errors.length ? ' (' + res.errors.length + ' خطا)' : ''), res.errors.length ? 'warn' : 'ok', 4200);
            if (res.errors.length) res.errors.forEach(function (e) { U.toast(e, 'err', 5000); });
            ta.value = ''; state.msgPreview = null; drawPreview();
            renderPage('messages');
          } catch (e) { U.toast(e.message, 'err', 4200); }
        });
      });
      prevHost.appendChild(U.el('div', { class: 'row gap-sm wrap' }, [paySel, applyBtn]));
    }

    if (state.msgPreview) drawPreview();

    var hist = U.el('div', { class: 'card' });
    hist.appendChild(UI.section('پیام‌های ثبت‌شده', 'clock'));
    if (!DB().messages.length) hist.appendChild(U.el('div', { class: 'empty', text: 'هنوز پیامی ثبت نشده' }));
    else {
      DB().messages.slice(0, 20).forEach(function (m) {
        var d = U.el('div', { class: 'alert alert-info small' });
        d.innerHTML = '<b>' + U.jDateTime(m.at) + '</b> — ' + U.toFa((m.items || []).length) + ' مورد ثبت شد' +
          '<div class="muted">' + U.esc((m.raw || '').slice(0, 160)) + '</div>' +
          '<div>' + (m.items || []).map(function (i) { return '<span class="chip small">' + U.esc(i.name) + ' ' + U.toFa(i.qty) + '</span>'; }).join(' ') + '</div>';
        hist.appendChild(d);
      });
    }
    host.appendChild(hist);
  }

  /* ================= اطلاع‌رسانی ================= */
  function renderNotify(host) {
    var n = DB().notify;
    var card = U.el('div', { class: 'card' });
    card.appendChild(UI.section('اطلاع‌رسانی خودکار وضعیت فروشگاه', 'bell'));
    card.appendChild(U.el('div', { class: 'alert alert-info small', html: 'ساعت و بازه را شما تعیین می‌کنید؛ سامانه در آن ساعت یک گزارش کامل («مو به مو») از وضعیت فروشگاه می‌سازد و با روش انتخابی برای شما می‌فرستد.<br>اگر مرورگر روی این دستگاه باز باشد، ارسال در همان لحظه انجام می‌شود؛ برای اطمینان می‌توانید هر زمان دکمه‌ی «ارسال آزمایشی» را بزنید.' }));

    var f = UI.form({
      fields: [
        { key: 'enabled', label: 'اطلاع‌رسانی روشن باشد', type: 'checkbox', value: n.enabled, hint: 'فعال / غیرفعال' },
        {
          key: 'channel', label: 'روش اطلاع‌رسانی', type: 'select', value: n.channel, options: [
            { value: 'email', label: '📧 ایمیل (پنجره‌ی ارسال باز می‌شود — draft آماده)' },
            { value: 'whatsapp', label: '💬 واتساپ (ارسال به شماره‌ی شما)' },
            { value: 'sms', label: '📱 پیامک' },
            { value: 'telegram', label: '✈️ تلگرام' },
            { value: 'emailjs', label: '🤖 ایمیل خودکار بدون باز کردن پنجره (EmailJS رایگان)' },
            { value: 'webhook', label: '🔗 وبهوک به یک ربات/سرویس (URL)' },
            { value: 'browser', label: '🔔 اعلان مرورگر روی همین دستگاه' },
            { value: 'copy', label: '📋 فقط کپی متن گزارش' }
          ]
        },
        { key: 'target', label: 'مقصد (ایمیل / شماره / آیدی / URL)', value: n.target, full: true, help: 'برای واتساپ و پیامک شماره با کد کشور (مثال: 989121234567)، برای تلگرام آیدی بدون @، برای وبهوک آدرس کامل https://…' },
        {
          key: 'frequency', label: 'بازه‌ی گزارش', type: 'select', value: n.frequency, options: [
            { value: 'daily', label: 'روزانه' }, { value: 'weekly', label: 'هفتگی' },
            { value: 'biweekly', label: 'هر دو هفته' }, { value: 'monthly', label: 'ماهانه' }
          ]
        },
        { key: 'time', label: 'ساعت ارسال', value: n.time, placeholder: 'مثال: 21:30' },
        {
          key: 'weekday', label: 'روز هفته (برای گزارش هفتگی)', type: 'select', value: n.weekday,
          options: U.JDAYS.map(function (d, i) { return { value: i, label: d }; })
        },
        { key: 'dayOfMonth', label: 'روز ماه (برای گزارش ماهانه — شمسی)', type: 'number', value: n.dayOfMonth }
      ]
    });
    card.appendChild(f.el);

    var inc = n.include || {};
    card.appendChild(UI.section('چه چیزهایی در گزارش باشد؟', 'check'));
    var incBox = U.el('div', { class: 'chips' });
    var INC = [['sales', 'فروش و تعداد فاکتور'], ['profit', 'سود و حاشیه'], ['lowStock', 'کم‌موجود و ناموجود'], ['value', 'ارزش انبار'],
    ['top', 'پرفروش‌ترین‌ها'], ['dead', 'اجناس راکد'], ['expiry', 'نزدیک انقضا'], ['cash', 'تفکیک نقد/کارتی/نسیه']];
    INC.forEach(function (x) {
      var on = inc[x[0]] !== false;
      var b = U.el('button', { class: 'chip' + (on ? ' chip-primary' : ''), text: x[1] });
      b.addEventListener('click', function () {
        var cur = inc[x[0]] !== false;
        inc[x[0]] = !cur;
        b.classList.toggle('chip-primary', !cur);
      });
      incBox.appendChild(b);
    });
    card.appendChild(incBox);

    /* EmailJS */
    var ej = n.emailjs || {};
    var ejBox = U.el('div', { class: 'card tight mt' });
    ejBox.appendChild(UI.section('تنظیمات ایمیل خودکار (اختیاری — EmailJS)', 'sparkles'));
    ejBox.appendChild(U.el('div', { class: 'muted small mb', html: 'با یک حساب رایگان در <b>emailjs.com</b> سه مقدار زیر را بگیرید تا ایمیل گزارش، بدون باز شدن پنجره‌ی ایمیل، خودکار ارسال شود. مقدارهای قالب: <code>report_text</code>، <code>report_html</code>، <code>shop_name</code>، <code>revenue</code>، <code>profit</code>' }));
    var ejf = UI.form({
      fields: [
        { key: 'serviceId', label: 'Service ID', value: ej.serviceId || '', half: true },
        { key: 'templateId', label: 'Template ID', value: ej.templateId || '', half: true },
        { key: 'publicKey', label: 'Public Key', value: ej.publicKey || '', half: true },
        { key: 'to', label: 'ایمیل مقصد', value: ej.to || n.target || '', half: true }
      ]
    });
    ejBox.appendChild(ejf.el);
    card.appendChild(ejBox);

    var saveBtn = U.el('button', { class: 'btn btn-primary' }, [UI.icon('check', 17), U.el('span', { text: 'ذخیره‌ی تنظیمات' })]);
    saveBtn.addEventListener('click', function () {
      var v = f.values();
      Object.assign(n, {
        enabled: v.enabled, channel: v.channel, target: v.target, frequency: v.frequency,
        time: v.time, weekday: U.num(v.weekday), dayOfMonth: U.num(v.dayOfMonth)
      });
      n.include = inc;
      n.emailjs = ejf.values();
      if (n.channel === 'browser' && root.Notification && root.Notification.permission !== 'granted') {
        root.Notification.requestPermission();
      }
      S().save();
      N.start();
      U.toast('تنظیمات ذخیره شد', 'ok');
      renderPage('notify');
    });
    var testBtn = U.el('button', { class: 'btn btn-outline' }, [UI.icon('bell', 17), U.el('span', { text: 'ارسال آزمایشی همین حالا' })]);
    testBtn.addEventListener('click', function () {
      var v = f.values();
      Object.assign(n, { channel: v.channel, target: v.target, frequency: v.frequency, time: v.time });
      n.emailjs = ejf.values();
      S().save();
      testBtn.disabled = true;
      N.send({}).then(function (r) {
        testBtn.disabled = false;
        if (r.link) {
          U.toast(r.message, 'ok');
          try { root.open(r.link, '_blank'); } catch (e) { }
        } else U.toast(r.message, 'ok');
        renderPage('notify');
      }).catch(function (e) {
        testBtn.disabled = false;
        U.toast(e.message, 'err', 5000);
      });
    });
    card.appendChild(U.el('div', { class: 'row gap-sm wrap mt' }, [saveBtn, testBtn]));
    host.appendChild(card);

    /* پیش‌نمایش گزارش */
    var prev = U.el('div', { class: 'card' });
    prev.appendChild(UI.section('پیش‌نمایش گزارش (همین حالا ساخته می‌شود)', 'chart'));
    var rep = N.buildReport(n.frequency || 'daily');
    var pre = U.el('pre', { class: 'report-pre', text: N.renderText(rep) });
    prev.appendChild(pre);
    var dl = U.el('button', { class: 'btn btn-ghost btn-sm mt-sm', html: UI.iconHTML('download', 15) + ' دانلود متن گزارش' });
    dl.addEventListener('click', function () { U.download('گزارش-' + U.jDate() + '.txt', N.renderText(rep), 'text/plain;charset=utf-8'); });
    prev.appendChild(dl);
    host.appendChild(prev);

    /* وضعیت */
    var st = U.el('div', { class: 'card' });
    st.appendChild(UI.section('وضعیت ارسال', 'clock'));
    var due = N.isDue(new Date());
    st.innerHTML += '<div class="alert alert-' + (n.enabled ? 'ok' : 'warn') + '">' +
      (n.enabled ? 'اطلاع‌رسانی روشن است.' : 'اطلاع‌رسانی خاموش است — برای فعال‌سازی تیک «اطلاع‌رسانی روشن باشد» را بزنید.') +
      '<br>ارسال بعدی: <b>' + U.jDateLong(N.nextDue()) + ' — ساعت ' + U.toFa(U.jTime(N.nextDue())) + '</b>' +
      '<br>آخرین ارسال: ' + (n.lastSent ? U.jDateTime(n.lastSent) : 'هنوز ارسال نشده') +
      '<br>وضعیت زمان‌بند: ' + (due.due ? '🟢 زمان ارسال رسیده' : '⏳ ' + U.esc(due.reason)) + '</div>';
    if (n.history && n.history.length) {
      var h = U.el('div', {});
      h.appendChild(U.el('div', { class: 'muted small mb-sm', text: 'تاریخچه‌ی ارسال‌ها:' }));
      n.history.slice(0, 8).forEach(function (x) {
        h.appendChild(U.el('div', { class: 'row between small', style: { borderBottom: '1px dashed var(--line)', padding: '5px 0' }, html: '<span>' + U.jDateTime(x.at) + ' — ' + U.esc(N.channelLabel(x.channel)) + '</span><span>' + (x.ok ? '<span class="pill pill-ok">موفق</span>' : '<span class="pill pill-err">ناموفق</span>') + '</span>' }));
      });
      st.appendChild(h);
    }
    st.appendChild(U.el('div', { class: 'alert alert-info small mt', text: 'یادآوری: چون این سامانه بدون سرور کار می‌کند، ارسال خودکار در لحظه‌ی مقرر وقتی انجام می‌شود که مرورگرِ همین دستگاه باز باشد. برای اطمینان، گزارش را هر شب با یک کلیک هم می‌فرستد؛ می‌توانید برنامه‌ریز ویندوز را هم روی باز کردن همین صفحه تنظیم کنید.' }));
    host.appendChild(st);
  }

  /* ================= تنظیمات ================= */
  function renderSettings(host) {
    var shop = DB().shop, set = DB().settings;
    var card = U.el('div', { class: 'card' });
    card.appendChild(UI.section('اطلاعات فروشگاه', 'gear'));
    var f = UI.form({
      fields: [
        { key: 'name', label: 'نام فروشگاه', value: shop.name, half: true },
        { key: 'logo', label: 'لوگو (اموجی)', value: shop.logo, half: true },
        { key: 'tagline', label: 'شعار / توضیح کوتاه', value: shop.tagline, full: true },
        { key: 'phone', label: 'تلفن فروشگاه', value: shop.phone, half: true },
        { key: 'whatsapp', label: 'شماره واتساپ (با کد کشور)', value: shop.whatsapp, half: true },
        { key: 'address', label: 'آدرس', value: shop.address, full: true },
        { key: 'hours', label: 'ساعات کاری', value: shop.hours, half: true },
        { key: 'currency', label: 'واحد پول', value: shop.currency || 'تومان', half: true },
        { key: 'instagram', label: 'اینستاگرام (آیدی)', value: shop.instagram, half: true },
        { key: 'mapUrl', label: 'لینک نقشه (گوگل/بلد)', value: shop.mapUrl, half: true },
        { key: 'notice', label: 'پیام بالای سایت مشتریان', value: shop.notice, full: true }
      ]
    });
    card.appendChild(f.el);

    card.appendChild(UI.section('پیش‌فرض‌های فروش', 'tag'));
    var f2 = UI.form({
      fields: [
        { key: 'defaultProfit', label: 'درصد سود پیش‌فرض روی قیمت خرید (٪)', type: 'number', value: set.defaultProfit, half: true, hint: 'در ماشین‌حساب قیمت و پیشنهادها استفاده می‌شود.' },
        { key: 'lowStockDefault', label: 'حد بحرانی پیش‌فرض موجودی', type: 'number', value: set.lowStockDefault, half: true },
        { key: 'expiryWarnDays', label: 'هشدار انقضا (چند روز قبل)', type: 'number', value: set.expiryWarnDays, half: true },
        { key: 'allowNegativeStock', label: 'اجازه‌ی موجودی منفی', type: 'checkbox', value: set.allowNegativeStock, hint: 'معمولاً لازم نیست' },
        { key: 'showPricesToGuests', label: 'نمایش قیمت‌ها به مشتریان', type: 'checkbox', value: set.showPricesToGuests !== false, hint: 'در فروشگاه مشتریان' }
      ]
    });
    card.appendChild(f2.el);

    card.appendChild(UI.section('ظاهر سایت', 'image'));
    var themeBox = U.el('div', { class: 'chips mb' });
    [['emerald', 'سبز زمرد', '#0e9f6e'], ['ocean', 'آبی اقیانوس', '#0a7ea4'], ['grape', 'بنفش', '#7c3aed'], ['sunset', 'قرمز غروب', '#e11d48'], ['night', 'شب (تیره)', '#34d399']].forEach(function (t) {
      var b = U.el('button', { class: 'chip' + (set.theme === t[0] ? ' chip-primary' : '') }, [
        U.el('i', { style: { width: '12px', height: '12px', borderRadius: '4px', background: t[2], display: 'inline-block' } }),
        U.el('span', { text: t[1] })
      ]);
      b.addEventListener('click', function () {
        set.theme = t[0]; S().save(); UI.applyTheme(); UI.shopInfo();
        U.$$('.chip', themeBox).forEach(function (x) { x.classList.remove('chip-primary'); });
        b.classList.add('chip-primary');
        U.toast('تم اعمال شد', 'ok', 1500);
      });
      themeBox.appendChild(b);
    });
    card.appendChild(themeBox);

    var saveBtn = U.el('button', { class: 'btn btn-primary' }, [UI.icon('check', 17), U.el('span', { text: 'ذخیره‌ی تنظیمات' })]);
    saveBtn.addEventListener('click', function () {
      Object.assign(shop, f.values());
      Object.assign(set, f2.values());
      S().save(); UI.applyTheme(); UI.shopInfo();
      U.toast('تنظیمات ذخیره شد ✅', 'ok');
      renderPage('settings');
    });
    card.appendChild(saveBtn);
    host.appendChild(card);

    /* امنیت */
    var sec = U.el('div', { class: 'card' });
    sec.appendChild(UI.section('نام کاربری و رمز عبور', 'gear'));
    var sf = UI.form({
      fields: [
        { key: 'username', label: 'نام کاربری', value: DB().settings.admin.username, half: true },
        { key: 'current', label: 'رمز فعلی', type: 'password', value: '', half: true },
        { key: 'next', label: 'رمز جدید', type: 'password', value: '', half: true }
      ]
    });
    sec.appendChild(sf.el);
    var chBtn = U.el('button', { class: 'btn btn-primary' }, [UI.icon('check', 16), U.el('span', { text: 'تغییر رمز' })]);
    chBtn.addEventListener('click', function () {
      try {
        var v = sf.values();
        S().changeLogin(v.username, v.next, v.current);
        U.toast('رمز عبور تغییر کرد ✅ — در ورود بعدی استفاده کنید', 'ok', 4000);
      } catch (e) { U.toast(e.message, 'err'); }
    });
    sec.appendChild(chBtn);
    host.appendChild(sec);

    /* خطرناک */
    var danger = U.el('div', { class: 'card' });
    danger.appendChild(UI.section('منطقه‌ی خطر', 'warn'));
    danger.appendChild(U.el('div', { class: 'alert alert-warn small', text: 'این عملیات برگشت‌پذیر نیست. قبل از انجام، از بخش «پشتیبان‌گیری» فایل بگیرید.' }));
    var resetBtn = U.el('button', { class: 'btn btn-danger' }, [UI.icon('trash', 16), U.el('span', { text: 'بازنشانی به داده‌ی نمونه' })]);
    resetBtn.addEventListener('click', function () {
      U.confirm('همه‌ی اجناس، فروش‌ها و تنظیمات پاک و داده‌ی نمونه بازگردانده شود؟', { danger: true, okText: 'بله، بازنشانی کن' }).then(function (ok) {
        if (!ok) return;
        S().reset(false);
        U.toast('بازنشانی انجام شد', 'ok');
        location.reload();
      });
    });
    var clearBtn = U.el('button', { class: 'btn btn-ghost' }, [UI.icon('trash', 16), U.el('span', { text: 'پاک کردن کامل اجناس و فروش' })]);
    clearBtn.addEventListener('click', function () {
      U.confirm('همه‌ی اجناس و فروش‌ها پاک شود (اطلاعات فروشگاه و رمز می‌ماند)؟', { danger: true, okText: 'پاک کن' }).then(function (ok) {
        if (!ok) return;
        DB().products = []; DB().sales = []; DB().movements = []; DB().messages = []; DB().cart = {};
        DB().counters.product = 1; DB().counters.barcode = 1;
        S().save();
        U.toast('پاک شد — فروشگاه خالی آماده‌ی کار است', 'ok');
        renderPage('settings');
      });
    });
    danger.appendChild(U.el('div', { class: 'row gap-sm wrap' }, [resetBtn, clearBtn]));
    host.appendChild(danger);
  }

  /* ================= پشتیبان‌گیری ================= */
  function renderBackup(host) {
    var card = U.el('div', { class: 'card' });
    card.appendChild(UI.section('پشتیبان‌گیری و بازیابی', 'download'));
    var usage = U.store.usage();
    card.appendChild(U.el('div', { class: 'alert alert-info small', html: 'همه‌ی اطلاعات (اجناس، عکس‌ها، فروش‌ها، تنظیمات) در همین مرورگر ذخیره می‌شود. برای اطمینان، هر چند وقت یک‌بار فایل پشتیبان بگیرید و در جای امن (ایمیل/فلش/درایو) نگه دارید.<br>حجم مصرفی حافظه: <b>' + U.prettyBytes(usage) + '</b> — آخرین پشتیبان: ' + (DB().meta.lastBackup ? U.jDateTime(DB().meta.lastBackup) : 'ندارد')}));
    var full = U.el('button', { class: 'btn btn-primary' }, [UI.icon('download', 16), U.el('span', { text: 'دانلود پشتیبان کامل (JSON)' })]);
    full.addEventListener('click', function () {
      U.download('پشتیبان-فروشگاه-' + U.jDate().replace(/\//g, '-') + '.json', S().exportJSON({}), 'application/json');
      U.toast('فایل پشتیبان دانلود شد', 'ok');
    });
    var light = U.el('button', { class: 'btn btn-ghost' }, [UI.icon('download', 16), U.el('span', { text: 'پشتیبان بدون عکس‌ها (سبک‌تر)' })]);
    light.addEventListener('click', function () {
      U.download('پشتیبان-سبک-' + U.jDate().replace(/\//g, '-') + '.json', S().exportJSON({ withoutImages: true }), 'application/json');
    });
    card.appendChild(U.el('div', { class: 'row gap-sm wrap' }, [full, light]));

    card.appendChild(UI.section('بازیابی از فایل', 'upload'));
    var mode = U.el('select', { class: 'input input-sm', style: { maxWidth: '380px' } }, [
      U.el('option', { value: 'replace', text: 'جایگزینی کامل اطلاعات با فایل' }),
      U.el('option', { value: 'merge', text: 'ادغام با اطلاعات فعلی (جمع کردن موجودی‌ها)' })
    ]);
    var fileIn = U.el('input', { type: 'file', accept: '.json,application/json', class: 'hidden' });
    var pick = U.el('button', { class: 'btn btn-outline' }, [UI.icon('upload', 16), U.el('span', { text: 'انتخاب فایل پشتیبان' })]);
    pick.addEventListener('click', function () { fileIn.click(); });
    fileIn.addEventListener('change', function () {
      var f = fileIn.files[0]; if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        U.confirm('بازیابی انجام شود؟ ' + (mode.value === 'replace' ? 'اطلاعات فعلی جایگزین می‌شود.' : 'موجودی‌ها جمع می‌شوند.'), { okText: 'بازیابی' }).then(function (ok) {
          if (!ok) return;
          try {
            var r = S().importJSON(fr.result, { merge: mode.value === 'merge' });
            U.toast('بازیابی انجام شد — ' + U.toFa(r.products) + ' جنس', 'ok', 4000);
            UI.shopInfo(); renderPage('backup');
          } catch (e) { U.toast('فایل نامعتبر است: ' + e.message, 'err', 5000); }
        });
      };
      fr.readAsText(f, 'utf-8');
    });
    card.appendChild(U.el('div', { class: 'col gap-sm' }, [mode, U.el('div', {}, [pick, fileIn])]));

    card.appendChild(UI.section('خروجی اکسل (CSV)', 'chart'));
    var csv1 = U.el('button', { class: 'btn btn-ghost' }, [UI.icon('download', 16), U.el('span', { text: 'خروجی اجناس' })]);
    csv1.addEventListener('click', function () { U.download('اجناس-' + U.jDate() + '.csv', S().csvExportProducts(), 'text/csv;charset=utf-8'); });
    var csv2 = U.el('button', { class: 'btn btn-ghost' }, [UI.icon('download', 16), U.el('span', { text: 'خروجی فروش‌ها' })]);
    csv2.addEventListener('click', function () {
      var rows = DB().sales.map(function (s) {
        return [s.no, U.jDate(s.at), U.jTime(s.at), s.items.map(function (i) { return i.name + ' ×' + i.qty; }).join(' | '), s.subtotal, s.discount, s.tax, s.total, s.profit, s.payment, s.customer ? s.customer.name : ''];
      });
      U.download('فروش‌ها-' + U.jDate() + '.csv', U.toCSV(rows, ['شماره', 'تاریخ', 'ساعت', 'اقلام', 'جمع', 'تخفیف', 'مالیات', 'پرداختی', 'سود', 'روش پرداخت', 'مشتری']), 'text/csv;charset=utf-8');
    });
    var csv3 = U.el('button', { class: 'btn btn-ghost' }, [UI.icon('download', 16), U.el('span', { text: 'خروجی گردش انبار' })]);
    csv3.addEventListener('click', function () {
      var rows = DB().movements.map(function (m) {
        var p = S().getProduct(m.pid);
        return [U.jDate(m.at), U.jTime(m.at), p ? p.name : '', m.type, m.qty, m.after, m.note];
      });
      U.download('گردش-انبار-' + U.jDate() + '.csv', U.toCSV(rows, ['تاریخ', 'ساعت', 'جنس', 'نوع', 'تغییر', 'موجودی پس از', 'توضیح']), 'text/csv;charset=utf-8');
    });
    card.appendChild(U.el('div', { class: 'row gap-sm wrap' }, [csv1, csv2, csv3]));
    host.appendChild(card);

    var logs = U.el('div', { class: 'card' });
    logs.appendChild(UI.section('رویدادهای اخیر سیستم', 'clock'));
    if (!DB().logs.length) logs.appendChild(U.el('div', { class: 'empty', text: 'رویدادی ثبت نشده' }));
    DB().logs.slice(0, 40).forEach(function (l) {
      logs.appendChild(U.el('div', { class: 'small', style: { borderBottom: '1px dashed var(--line)', padding: '5px 0' }, text: U.jDateTime(l.at) + ' — ' + l.action + (l.detail ? ' (' + l.detail + ')' : '') }));
    });
    host.appendChild(logs);
  }

  /* ================= راهنما ================= */
  function renderHelp(host) {
    var card = U.el('div', { class: 'card' });
    card.appendChild(UI.section('راهنمای سریع کار با سامانه', 'sparkles'));
    card.innerHTML += [
      '<h4>۱) شروع سریع (۵ دقیقه)</h4>',
      '<ol class="help-list">',
      '<li>در «تنظیمات فروشگاه»، نام و لوگوی فروشگاه و شماره‌ی واتساپ خود را وارد کنید.</li>',
      '<li>در «دسته‌بندی‌ها» دسته‌های خودتان را بسازید (مثلاً لبنیات، نوشیدنی، لوازم‌التحریر…).</li>',
      '<li>در «اجناس فروشگاه» اجناس را یکی‌یکی (یا گروهی با CSV) وارد کنید؛ عکس هر جنس را آپلود کنید و دکمه‌ی «تحلیل هوشمند تصویر» را بزنید.</li>',
      '<li>در «اطلاع‌رسانی خودکار»، روش و ساعت دلخواهتان را تنظیم کنید و «ارسال آزمایشی» را بزنید.</li>',
      '</ol>',
      '<h4>۲) تحلیل هوشمند تصویر چطور کار می‌کند؟</h4>',
      '<p class="muted">عکس جنس را آپلود می‌کنید و سامانه همان‌جا روی دستگاه شما تصویر را بررسی می‌کند: پس‌زمینه را جدا می‌کند، شکل، رنگ، بافت و جزئیات را می‌سنجد و <b>نام، دسته‌بندی، برچسب‌ها، رنگ و واحد</b> پیشنهاد می‌دهد. هیچ اطلاعاتی به اینترنت فرستاده نمی‌شود. اگر چند گزینه نزدیک به هم بود، هر چهار گزینه با درصد نمایش داده می‌شود و انتخاب با شماست؛ می‌توانید یک‌کلیکی فرم را پر کنید.</p>',
      '<h4>۳) پیام پایان روز</h4>',
      '<p class="muted">آخر شب در بخش «پیام پایان روز» بنویسید: «۳ تا نوشابه فروختم و ۵ عدد آب معدنی اضافه شد». سامانه جنس، تعداد و نوع عملیات را می‌فهمد، روی انبار اعمال می‌کند و فاکتور فروش را هم ثبت می‌کند. اگر جنسی را نشناخت، در فهرست «نامشخص» می‌آورد تا سریع اضافه‌اش کنید.</p>',
      '<h4>۴) ماشین‌حساب قیمت (درصدی)</h4>',
      '<p class="muted">در فرم هر جنس یا صفحه‌ی «ماشین‌حساب قیمت»، با دکمه‌های ‎+۵٪‎، ‎−۱۰٪‎، درصد دلخواه و گرد کردن، قیمت را سریع تنظیم کنید؛ سود و حاشیه‌ی سود همان لحظه محاسبه می‌شود. برای تغییر قیمت گروهی، «تغییر گروهی قیمت» را بزنید (همه یا یک دسته).</p>',
      '<h4>۵) بارکد و برچسب</h4>',
      '<p class="muted">هر جنس یک بارکد استاندارد دارد (قابل ساخت مجدد). با «چاپ برچسب» می‌توانید برچسب قیمت با بارکد چاپ کنید. مشتری هم می‌تواند همان کد را در فروشگاه آنلاین جست‌وجو کند تا جزئیات را ببیند. اگر بارکدخوان (اسکنر) دارید، در «فروش سریع» دکمه‌ی بارکد را بزنید.</p>',
      '<h4>۶) دو بخش سایت</h4>',
      '<ul class="help-list"><li><b>admin.html</b> → پنل صاحب فروشگاه (با نام کاربری و رمز).</li>',
      '<li><b>index.html</b> → فروشگاه برای مشتریان: جست‌وجو، دسته‌بندی، سبد خرید، ثبت سفارش واتساپی، لیست علاقه‌مندی و مقایسه.</li></ul>',
      '<h4>۷) انتشار روی GitHub (رایگان، بدون پیش‌نیاز)</h4>',
      '<ol class="help-list">',
      '<li>یک مخزن (Repository) جدید در GitHub بسازید — مثلاً <code>my-shop</code>.</li>',
      '<li>همه‌ی فایل‌های این پوشه را در مخزن آپلود کنید (Add file → Upload files).</li>',
      '<li>به Settings → Pages بروید؛ در بخش Build and deployment، شاخه‌ی <code>main</code> و پوشه‌ی <code>/ (root)</code> را انتخاب و Save کنید. (فایل <code>.github/workflows/pages.yml</code> هم گذاشته شده تا خودکار منتشر شود.)</li>',
      '<li>پس از چند دقیقه آدرس سایت شما فعال می‌شود: <code>https://USERNAME.github.io/my-shop/</code> — پنل مدیریت در همان آدرس با <code>/admin.html</code>.</li>',
      '</ol>',
      '<p class="muted">نکته: چون سایت روی GitHub Pages اجرا می‌شود، همه‌چیز روی همان مرورگر ذخیره می‌شود؛ برای دستگاه‌های دیگر از فایل پشتیبان استفاده کنید (یا پروژه را در GitHub Codespaces اجرا کنید تا اطلاعات مشترک شود). این سامانه هیچ سرور، دیتابیس یا نصبی لازم ندارد.</p>',
      '<h4>۸) پرسش‌های رایج</h4>',
      '<p class="muted"><b>اطلاعات کجاست؟</b> در حافظه‌ی مرورگر (localStorage) و در پشتیبان‌های خودکار روزانه.<br>',
      '<b>اگر مرورگر را پاک کنم؟</b> فایل پشتیبان JSON را بازیابی کنید.<br>',
      '<b>چند کاربر می‌توانند هم‌زمان؟</b> برای یک دستگاه اصلی عالی است؛ برای چند دستگاه، پشتیبان‌گیری/بازیابی یا اجرای نسخه‌ی Codespaces راه‌حل است.<br>',
      '<b>بدون اینترنت کار می‌کند؟</b> بله؛ همه‌ی امکانات آفلاین است (پس از اولین بارگذاری، Service Worker آن را کش می‌کند).</p>'
    ].join('');
    host.appendChild(card);
    var t = U.el('div', { class: 'card' });
    t.appendChild(UI.section('فهرست امکانات پیاده‌شده', 'check'));
    t.innerHTML += '<ul class="help-list">' +
      ['مدیریت تعداد اجناس و انبار با گردش کامل موجودی', 'مدیریت قیمت اجناس (خرید، فروش، عمده، مالیات)',
        'ماشین‌حساب درصدی قیمت + تغییر گروهی قیمت', 'تحلیل هوشمند تصویر (نام، دسته، رنگ، برچسب) — کاملاً آفلاین',
        'طراحی ساده و سریع برای کار روزمره + رابط زیبا و جذب‌کننده', 'دسته‌بندی چندسطحی با کلمات کلیدی',
        'جزئیات کامل هر جنس + بارکد و برچسب چاپی', 'اطلاع‌رسانی خودکار روزانه/هفتگی/ماهانه در ساعت مشخص به ایمیل/واتساپ/پیامک/تلگرام/وبهوک',
        'ثبت فروش و موجودی با پیام پایان روز (تشخیص متن فارسی)', 'دو بخش: پنل مدیر (رمزدار) و فروشگاه مشتری',
        'صندوق فروش سریع (POS) با اسکن بارکد', 'فاکتور چاپی با مبلغ به حروف',
        'گزارش‌ها: روند فروش، پرفروش‌ترین‌ها، راکدها، سود، ارزش انبار', 'انبارگردانی و هشدار کم‌موجودی و انقضا',
        'پشتیبان‌گیری/بازیابی JSON و خروجی/ورودی CSV', 'قابل نصب روی موبایل (PWA) و کارکرد آفلاین'
      ].map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>';
    host.appendChild(t);
  }

  /* ================= راه‌اندازی ================= */
  function refreshNotifyStatus() {
    if (!state.pageHost) return;
    if (state.page === 'notify') {
      var el = U.$('#notifyStatus');
      if (el) { }
    }
  }

  function init() {
    S().load();
    UI.applyTheme();
    UI.shopInfo();
    UI.initInstall();
    UI.initOffline();
    N.start();
    if (U.store.session.get('shop.session', false)) {
      U.$('#loginHost').classList.add('hidden');
      U.$('#appHost').classList.remove('hidden');
      state.authed = true;
      buildShell();
      go(hashPage() || 'dashboard');
    } else {
      renderLogin(U.$('#loginHost'));
    }
    root.addEventListener('hashchange', function () {
      var p = hashPage();
      if (p && state.authed && p !== state.page) { state.page = p; renderPage(p); }
    });
  }
  Shop.dash = { init: init, go: go, editProduct: editProduct, refreshNotifyStatus: refreshNotifyStatus, state: state };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof window !== 'undefined' ? window : globalThis);
