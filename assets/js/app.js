/* ============================================================
   Shop Manager — Customer Storefront (بخش مشتریان)
   جست‌وجو • دسته‌بندی • سبد خرید • علاقه‌مندی • مقایسه •
   دستیار خرید تصویری • ثبت سفارش (واتساپ/کپی/چاپ)
   ============================================================ */
(function (root) {
  'use strict';
  var Shop = (root.Shop = root.Shop || {});
  var U = Shop.U, UI = Shop.ui;
  function DB() { return Shop.store.db; }
  function S() { return Shop.store; }

  var state = {
    q: '', cat: '', sort: 'newest', onlyAvailable: false, maxPrice: 0,
    view: 'grid', compare: [], viewed: [], page: 1, perPage: 24,
    order: null, ai: null
  };

  /* ---------- ساخت چیدمان ---------- */
  function build() {
    var app = U.$('#storeApp');
    app.innerHTML = '';
    var shop = DB().shop;

    /* هدر */
    var header = U.el('header', { class: 'store-header no-print' });
    var container = U.el('div', { class: 'container' });
    var top = U.el('div', { class: 'store-top' });
    var brand = U.el('div', { class: 'store-brand' });
    brand.innerHTML = '<span class="logo" data-shop-logo>' + (shop.logo || '🛍️') + '</span>' +
      '<div><b data-shop-name>' + U.esc(shop.name) + '</b><span data-shop-tagline>' + U.esc(shop.tagline || '') + '</span></div>';
    var actions = U.el('div', { class: 'store-actions' });
    var favBtn = U.el('button', { class: 'icon-btn round', title: 'علاقه‌مندی‌های من', html: UI.iconHTML('heart', 18) });
    var compareBtn = U.el('button', { class: 'icon-btn round', title: 'مقایسه', html: UI.iconHTML('chart', 18) });
    var orderBtn = U.el('button', { class: 'icon-btn round', title: 'سبد خرید', html: UI.iconHTML('cart', 18) });
    var cartCount = U.el('span', { class: 'cart-count hidden', text: '۰' });
    orderBtn.appendChild(cartCount);
    var aiBtn = U.el('button', { class: 'btn btn-accent btn-sm', html: UI.iconHTML('sparkles', 16) + ' پیدا کردن جنس با عکس' });
    actions.appendChild(aiBtn); actions.appendChild(favBtn); actions.appendChild(compareBtn); actions.appendChild(orderBtn);
    top.appendChild(brand); top.appendChild(actions);
    container.appendChild(top);

    /* نوار جست‌وجو */
    var searchWrap = U.el('div', { class: 'store-search' });
    var searchInput = U.el('input', { class: 'input', placeholder: 'نام جنس، برند یا بارکد را بنویسید…', value: state.q });
    searchWrap.appendChild(U.el('span', { class: 'search-ico', html: UI.iconHTML('search', 20) }));
    searchWrap.appendChild(searchInput);
    container.appendChild(searchWrap);

    var notice = U.el('div', { class: 'center' });
    notice.innerHTML = '<span class="store-notice" data-shop-notice>' + U.esc(shop.notice || '🛒 سفارش آنلاین یا تلفنی — تحویل سریع') + '</span>';
    container.appendChild(notice);

    if (shop.hours || shop.phone) {
      var info = U.el('div', { class: 'center small', style: { marginTop: '4px', opacity: '.92' } });
      info.innerHTML = [shop.hours ? '🕒 ' + U.esc(shop.hours) : '', shop.phone ? '☎ ' + U.toFa(U.toEn(shop.phone)) : '', shop.address ? '📍 ' + U.esc(shop.address) : ''].filter(Boolean).join('  •  ');
      container.appendChild(info);
    }
    header.appendChild(container);
    app.appendChild(header);

    /* بدنه */
    var main = U.el('div', { class: 'container' });
    /* بنر */
    var banner = U.el('div', { class: 'hero-banner' });
    banner.innerHTML = '<span class="h-emoji">🛍️</span><div class="grow"><b>خرید آسان و سریع</b>' +
      '<div class="small" style="opacity:.92">جنس‌ها را انتخاب کنید، سبد را ببندید و سفارش را با واتساپ بفرستید — یا حضوری بیایید تحویل بگیرید.</div></div>' +
      '<button class="btn btn-accent btn-sm" id="bnOrder">مشاهده‌ی سبد خرید</button>';
    main.appendChild(banner);

    /* دستیار خرید */
    var aiCard = U.el('div', { class: 'shop-ai no-print' });
    aiCard.innerHTML = '<div class="ai-head">' + UI.iconHTML('sparkles', 18) + ' دستیار خرید: عکس جنس را بفرستید یا بنویسید چه می‌خواهید</div>';
    var aiRow = U.el('div', { class: 'row gap-sm wrap' });
    var aiText = U.el('input', { class: 'input input-sm', style: { flex: '1 1 240px' }, placeholder: 'مثال: نوشیدنی سرد، ماست ۹۰۰ گرمی، دفتر ۱۰۰ برگ…' });
    var aiFile = U.el('input', { type: 'file', accept: 'image/*', class: 'hidden' });
    var aiPic = U.el('button', { class: 'btn btn-outline btn-sm', html: UI.iconHTML('image', 15) + ' فرستادن عکس' });
    var aiGo = U.el('button', { class: 'btn btn-primary btn-sm', html: UI.iconHTML('search', 15) + ' جست‌وجو' });
    aiRow.appendChild(aiText); aiRow.appendChild(aiPic); aiRow.appendChild(aiGo); aiRow.appendChild(aiFile);
    aiCard.appendChild(aiRow);
    var aiResult = U.el('div', { class: 'mt-sm' });
    aiCard.appendChild(aiResult);
    main.appendChild(aiCard);

    /* دسته‌بندی + مرتب‌سازی */
    var catScroll = U.el('div', { class: 'cat-scroll no-print' });
    main.appendChild(catScroll);

    var toolbar = U.el('div', { class: 'sa-toolbar' });
    var countLbl = U.el('span', { class: 'sa-count' });
    var sortPills = U.el('div', { class: 'sort-pills' });
    [['newest', 'جدیدترین'], ['cheap', 'ارزان‌ترین'], ['expensive', 'گران‌ترین'], ['sold', 'محبوب‌ترین'], ['discount', 'تخفیف‌ها']].forEach(function (s) {
      var b = U.el('button', { class: 'chip small', text: s[1] });
      b.dataset.sort = s[0];
      b.addEventListener('click', function () { state.sort = s[0]; state.page = 1; draw(); });
      sortPills.appendChild(b);
    });
    var availBtn = U.el('button', { class: 'chip small', text: 'فقط موجود' });
    availBtn.addEventListener('click', function () { state.onlyAvailable = !state.onlyAvailable; availBtn.classList.toggle('chip-primary', state.onlyAvailable); state.page = 1; draw(); });
    toolbar.appendChild(countLbl); toolbar.appendChild(sortPills); toolbar.appendChild(availBtn);
    main.appendChild(toolbar);

    var grid = U.el('div', { class: 'prod-grid' });
    main.appendChild(grid);
    var pager = U.el('div', { class: 'pager' });
    main.appendChild(pager);

    /* بخش‌های پایین */
    var recentBox = U.el('div', { class: 'mt' });
    main.appendChild(recentBox);

    app.appendChild(main);

    /* پاورقی */
    var footer = U.el('footer', { class: 'store-footer no-print' });
    var f = U.el('div', { class: 'container' });
    f.innerHTML = '<div data-shop-logo style="font-size:2rem">' + (shop.logo || '🛍️') + '</div>' +
      '<b data-shop-name>' + U.esc(shop.name) + '</b>' +
      '<div class="f-links">' +
      (shop.phone ? '<a href="tel:' + U.toEn(shop.phone) + '">☎ تماس</a>' : '') +
      (shop.whatsapp ? '<a href="https://wa.me/' + U.toEn(shop.whatsapp).replace(/[^0-9]/g, '') + '" target="_blank">💬 واتساپ</a>' : '') +
      (shop.instagram ? '<a href="https://instagram.com/' + U.esc(shop.instagram) + '" target="_blank">📸 اینستاگرام</a>' : '') +
      (shop.mapUrl ? '<a href="' + U.esc(shop.mapUrl) + '" target="_blank">🗺️ مسیر روی نقشه</a>' : '') +
      '<a href="admin.html">🔐 ورود مدیر فروشگاه</a>' +
      '</div>' +
      '<div class="small" data-shop-info>' + [shop.address, shop.hours].filter(Boolean).map(U.esc).join(' — ') + '</div>' +
      '<div class="small mt-sm">قدرت‌گرفته از سامانه‌ی مدیریت فروشگاه — بدون سرور، امن و آفلاین</div>';
    footer.appendChild(f);
    app.appendChild(footer);

    var compareBar = U.el('div', { class: 'compare-bar no-print' });
    app.appendChild(compareBar);

    /* اتصال‌ها */
    searchInput.addEventListener('input', U.debounce(function () {
      var v = searchInput.value.trim();
      var p = S().findByBarcode(v);
      if (p) { openProduct(p); searchInput.value = ''; return; }
      state.q = v; state.page = 1; draw();
    }, 260));
    orderBtn.addEventListener('click', openCart);
    favBtn.addEventListener('click', openFavorites);
    compareBtn.addEventListener('click', function () { compareBar.querySelector('button') ? showCompare() : U.toast('برای مقایسه، روی آیکن ⇄ کارت جنس‌ها بزنید', 'info', 3200); });
    U.$('#bnOrder', banner).addEventListener('click', openCart);
    aiPic.addEventListener('click', function () { aiFile.click(); });
    aiFile.addEventListener('change', function () {
      var file = aiFile.files[0]; if (!file) return;
      aiResult.innerHTML = '<div class="alert alert-info small">در حال بررسی تصویر… (همه‌چیز روی دستگاه خودتان انجام می‌شود)</div>';
      var prepared = null;
      U.readImage(file)
        .then(function (f) { return Shop.vision.prepare(f.dataUrl); })
        .then(function (prep) { prepared = prep; return Shop.vision.analyze(prep.dataUrl); })
        .then(function (rep) {
          aiResult.innerHTML = '';
          if (!rep || !rep.ok) {
            aiResult.innerHTML = '<div class="alert alert-warn small">' + U.esc((rep && rep.error) || 'تحلیل تصویر ممکن نشد') + ' — به‌جای آن نام جنس را بنویسید.</div>';
            return;
          }
          var sug = rep.suggestion;
          var words = [sug.name].concat(sug.tags || []).concat([sug.colorName, sug.shape]).filter(Boolean).join(' ');
          /* ۱) جست‌وجوی عکس‌محور با امضای تصویر (اگر برای اجناس عکس تحلیل‌شده وجود داشته باشد) */
          var byImage = rep.fp && Shop.vision.similar ? Shop.vision.similar(rep.fp, DB().products.filter(function (p) { return p.fp && p.active !== false; }), 46).map(function (x) { return x.product; }) : [];
          var list = byImage.length ? byImage : matchProducts(words, { categoryId: sug.categoryId, color: sug.color });
          aiResult.innerHTML = '<div class="ai-summary">حدس سامانه: <b>' + U.esc(sug.name) + '</b> • دسته: ' + U.esc(sug.categoryName || '—') +
            ' • رنگ: ' + U.esc(sug.colorName) + ' • شکل: ' + U.esc(sug.shape) +
            '<br><span class="small muted">' + (byImage.length ? 'بر اساس مقایسه‌ی تصویری، نزدیک‌ترین جنسی که فروشگاه دارد:' : 'بر اساس مشخصات تصویر، این جنس‌ها را پیشنهاد می‌کنم:') + '</span></div>';
          var box = U.el('div', { class: 'row gap-sm wrap mt-sm' });
          var img = U.el('div', { class: 'ai-thumbs' });
          img.innerHTML = '<img src="' + (prepared ? prepared.dataUrl : '') + '">';
          box.appendChild(img);
          var btn = U.el('button', { class: 'btn btn-primary btn-sm', html: UI.iconHTML('search', 15) + ' جست‌وجو با «' + U.esc(sug.name) + '»' });
          btn.addEventListener('click', function () {
            var si = U.$('.store-search input');
            if (si) si.value = sug.name;
            state.q = sug.name; state.page = 1; draw();
            U.scrollTo({ top: 620, behavior: 'smooth' });
          });
          box.appendChild(btn);
          aiResult.appendChild(box);
          if (!list.length) aiResult.innerHTML += '<div class="alert alert-warn small mt-sm">جنسی مشابه پیدا نشد؛ می‌توانید نام دیگری امتحان کنید یا با فروشگاه تماس بگیرید.</div>';
          else aiResult.appendChild(productRow(list.slice(0, 6), 'نزدیک‌ترین جنس‌ها به عکس شما'));
          if (rep.ambiguous) aiResult.innerHTML += '<div class="alert alert-info small mt-sm">تصویر میان چند دسته مشترک بود؛ اگر نتیجه دقیق نیست، نام جنس را جست‌وجو کنید.</div>';
        })
        .catch(function (e) { aiResult.innerHTML = '<div class="alert alert-err small">خطا در بررسی عکس: ' + U.esc(e.message) + '</div>'; });
    });

    aiGo.addEventListener('click', function () {
      var v = aiText.value.trim();
      if (!v) return U.toast('نام جنس یا توضیح کوتاه را بنویسید', 'warn');
      searchInput.value = v; state.q = v; state.page = 1; draw();
      U.scrollTo({ top: 520, behavior: 'smooth' });
    });
    aiText.addEventListener('keydown', function (e) { if (e.key === 'Enter') aiGo.click(); });

    state.el = {
      grid: grid, pager: pager, countLbl: countLbl, sortPills: sortPills, catScroll: catScroll,
      recentBox: recentBox, cartCount: cartCount, compareBar: compareBar, availBtn: availBtn
    };

    /* بارکد در آدرس؟ index.html?code=… */
    var m = location.search.match(/[?&]code=([^&]+)/);
    if (m) {
      var code = decodeURIComponent(m[1]);
      var p = S().findByBarcode(code);
      if (p) setTimeout(function () { openProduct(p); }, 350);
      else U.toast('جنسی با بارکد ' + U.toFa(U.toEn(code)) + ' پیدا نشد', 'warn', 4000);
    }
    draw();
    updateCartBadge();
    UI.initInstall();
    UI.initOffline();
  }

  /* ---------- فیلتر و رسم ---------- */
  function currentList() {
    var list = S().searchProducts({ q: state.q, cat: state.cat, activeOnly: true });
    if (state.onlyAvailable) list = list.filter(function (p) { return p.stock > 0; });
    var sorters = {
      newest: function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); },
      cheap: function (a, b) { return a.price - b.price; },
      expensive: function (a, b) { return b.price - a.price; },
      sold: function (a, b) { return (b.soldTotal || 0) - (a.soldTotal || 0); },
      discount: function (a, b) { return (b.soldTotal || 0) - (a.soldTotal || 0); }
    };
    if (!state.q) list = list.slice().sort(sorters[state.sort] || sorters.newest);
    return list;
  }
  function draw() {
    var el = state.el;
    /* دسته‌ها */
    el.catScroll.innerHTML = '';
    var all = U.el('button', { class: 'chip' + (state.cat ? '' : ' chip-primary'), html: UI.iconHTML('box', 15) + ' همه‌ی اجناس' });
    all.addEventListener('click', function () { state.cat = ''; state.page = 1; draw(); });
    el.catScroll.appendChild(all);
    S().listCategories().filter(function (c) { return !c.parentId; }).forEach(function (c) {
      var sub = S().listCategories().filter(function (x) { return x.parentId === c.id; });
      var cnt = S().searchProducts({ cat: c.id, activeOnly: true }).length;
      var b = U.el('button', { class: 'chip' + (state.cat === c.id ? ' chip-primary' : '') }, [
        U.el('span', { text: (c.icon || '📦') + ' ' + c.name }), U.el('b', { text: U.toFa(cnt) })
      ]);
      b.addEventListener('click', function () { state.cat = state.cat === c.id ? '' : c.id; state.page = 1; draw(); });
      el.catScroll.appendChild(b);
      sub.forEach(function (s2) {
        var cnt2 = S().searchProducts({ cat: s2.id, activeOnly: true }).length;
        var b2 = U.el('button', { class: 'chip small' + (state.cat === s2.id ? ' chip-primary' : '') }, [
          U.el('span', { text: '↳ ' + (s2.icon || '') + ' ' + s2.name }), U.el('b', { text: U.toFa(cnt2) })
        ]);
        b2.addEventListener('click', function () { state.cat = state.cat === s2.id ? '' : s2.id; state.page = 1; draw(); });
        el.catScroll.appendChild(b2);
      });
    });
    U.$$('.chip', el.sortPills).forEach(function (b) { b.classList.toggle('chip-primary', b.dataset.sort === state.sort); });
    el.availBtn.classList.toggle('chip-primary', state.onlyAvailable);

    var list = currentList();
    var totalPages = Math.max(1, Math.ceil(list.length / state.perPage));
    state.page = U.clamp(state.page, 1, totalPages);
    var pageItems = list.slice((state.page - 1) * state.perPage, state.page * state.perPage);
    el.countLbl.innerHTML = U.toFa(list.length) + ' جنس' + (state.q ? ' برای «' + U.esc(state.q) + '»' : '');

    el.grid.innerHTML = '';
    if (!list.length) {
      el.grid.appendChild(U.el('div', { class: 'card', style: { gridColumn: '1 / -1' } }, [
        U.el('span', { class: 'empty-illustration', text: '🔍' }),
        U.el('div', { class: 'center bold', text: 'جنسی با این مشخصات پیدا نشد' }),
        U.el('div', { class: 'center muted small mt-sm', text: 'می‌توانید نام دیگری امتحان کنید، بارکد را بزنید، یا فیلتر «فقط موجود» را بردارید.' })
      ]));
    }
    pageItems.forEach(function (p) { el.grid.appendChild(card(p)); });

    /* صفحه‌بندی */
    el.pager.innerHTML = '';
    if (totalPages > 1) {
      var prev = U.el('button', { class: 'btn btn-ghost btn-sm', text: '‹ قبلی' });
      prev.disabled = state.page === 1;
      prev.addEventListener('click', function () { state.page--; draw(); U.scrollTo({ top: 620, behavior: 'smooth' }); });
      var lbl = U.el('span', { class: 'muted small', text: 'صفحه‌ی ' + U.toFa(state.page) + ' از ' + U.toFa(totalPages) });
      var next = U.el('button', { class: 'btn btn-ghost btn-sm', text: 'بعدی ›' });
      next.disabled = state.page === totalPages;
      next.addEventListener('click', function () { state.page++; draw(); U.scrollTo({ top: 620, behavior: 'smooth' }); });
      el.pager.appendChild(next); el.pager.appendChild(lbl); el.pager.appendChild(prev);
    }

    /* اخیراً دیده‌شده‌ها */
    el.recentBox.innerHTML = '';
    var viewed = state.viewed.map(function (id) { return S().getProduct(id); }).filter(Boolean);
    if (viewed.length) el.recentBox.appendChild(productRow(viewed.slice(0, 8), 'اخیراً دیده‌اید'));

    drawCompareBar();
  }

  function card(p) {
    var cat = S().getCategory(p.categoryId);
    var fav = (DB().favorites || []).indexOf(p.id) > -1;
    var inCompare = state.compare.indexOf(p.id) > -1;
    var c = U.el('div', { class: 'prod-card' });
    var thumb = U.el('div', { class: 'prod-thumb' });
    thumb.innerHTML = p.image ? '<img src="' + p.image + '" alt="' + U.esc(p.name) + '" loading="lazy">' : '<span>' + (cat ? cat.icon : '📦') + '</span>';
    if (p.stock <= 0) thumb.appendChild(U.el('span', { class: 'prod-ribbon', text: 'ناموجود' }));
    else if (p.stock <= (p.minStock || 0)) thumb.appendChild(U.el('span', { class: 'prod-ribbon', style: { background: 'var(--warn)' }, text: 'آخرین موجودی' }));
    var favBtn = U.el('button', { class: 'prod-fav' + (fav ? ' on' : ''), title: 'افزودن به علاقه‌مندی', html: UI.iconHTML('heart', 16) });
    favBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var arr = DB().favorites || (DB().favorites = []);
      var i = arr.indexOf(p.id);
      if (i > -1) arr.splice(i, 1); else arr.push(p.id);
      S().save();
      favBtn.classList.toggle('on', i < 0);
      U.toast(i < 0 ? '❤️ به علاقه‌مندی‌ها اضافه شد' : 'از علاقه‌مندی‌ها حذف شد', 'ok', 1600);
    });
    thumb.appendChild(favBtn);
    c.appendChild(thumb);

    var body = U.el('div', { class: 'prod-body' });
    body.innerHTML = '<div class="prod-name">' + U.esc(p.name) + '</div>' +
      '<div class="prod-price">' + (DB().settings.showPricesToGuests === false ? 'قیمت در فروشگاه' : U.money(p.price)) +
      (p.wholesale ? ' <s title="قیمت عمده">' + U.money(p.wholesale) + '</s>' : '') + '</div>' +
      '<div class="prod-meta"><span>' + U.esc(cat ? cat.name : '') + '</span><span>' + (p.stock > 0 ? 'موجود' : 'ناموجود') + '</span></div>';
    var foot = U.el('div', { class: 'row gap-xs mt-sm' });
    var add = U.el('button', { class: 'btn btn-primary btn-sm grow', html: UI.iconHTML('cart', 15) + ' افزودن' });
    add.addEventListener('click', function (e) { e.stopPropagation(); addToCart(p, 1); });
    var cmp = U.el('button', { class: 'icon-btn', title: 'مقایسه', html: UI.iconHTML('chart', 15) });
    cmp.addEventListener('click', function (e) {
      e.stopPropagation();
      var i = state.compare.indexOf(p.id);
      if (i > -1) state.compare.splice(i, 1);
      else {
        if (state.compare.length >= 4) return U.toast('حداکثر ۴ جنس را می‌توانید مقایسه کنید', 'warn');
        state.compare.push(p.id);
      }
      cmp.style.color = state.compare.indexOf(p.id) > -1 ? 'var(--primary)' : '';
      drawCompareBar();
    });
    if (inCompare) cmp.style.color = 'var(--primary)';
    var info = U.el('button', { class: 'icon-btn', title: 'جزئیات', html: UI.iconHTML('search', 15) });
    info.addEventListener('click', function (e) { e.stopPropagation(); openProduct(p); });
    foot.appendChild(add); foot.appendChild(cmp); foot.appendChild(info);
    body.appendChild(foot);
    c.appendChild(body);
    c.addEventListener('click', function () { openProduct(p); });
    return c;
  }

  function productRow(items, title) {
    var box = U.el('div', { class: 'card' });
    box.appendChild(UI.section(title, 'star'));
    var row = U.el('div', { class: 'row gap-sm wrap' });
    items.forEach(function (p) {
      var d = U.el('div', { style: { width: '150px', cursor: 'pointer' } });
      d.innerHTML = '<div class="prod-thumb" style="border-radius:12px;aspect-ratio:1">' + (p.image ? '<img src="' + p.image + '">' : '<span>' + ((S().getCategory(p.categoryId) || {}).icon || '📦') + '</span>') + '</div>' +
        '<div class="small bold truncate mt-sm">' + U.esc(p.name) + '</div><div class="small" style="color:var(--primary-dark)">' + U.money(p.price) + '</div>';
      d.addEventListener('click', function () { openProduct(p); });
      row.appendChild(d);
    });
    box.appendChild(row);
    return box;
  }

  /* ---------- صفحه‌ی جزئیات جنس ---------- */
  function openProduct(p) {
    var cat = S().getCategory(p.categoryId);
    state.viewed = [p.id].concat(state.viewed.filter(function (x) { return x !== p.id; })).slice(0, 12);
    var body = U.el('div', {});
    var imgs = [p.image].concat(p.gallery || []).filter(Boolean);
    var gallery = U.el('div', { class: 'mb' });
    if (imgs.length) {
      var big = U.el('div', { class: 'prod-thumb', style: { borderRadius: '16px', aspectRatio: '16/10', fontSize: '3.4rem' } });
      big.innerHTML = '<img src="' + imgs[0] + '" alt="' + U.esc(p.name) + '">';
      gallery.appendChild(big);
      if (imgs.length > 1) {
        var thumbs = U.el('div', { class: 'row gap-sm wrap mt-sm' });
        imgs.forEach(function (g, i) {
          var t = U.el('img', { src: g, style: { width: '58px', height: '58px', objectFit: 'cover', borderRadius: '10px', border: i === 0 ? '2px solid var(--primary)' : '1px solid var(--line)', cursor: 'pointer' } });
          t.addEventListener('click', function () { big.innerHTML = '<img src="' + g + '">'; });
          thumbs.appendChild(t);
        });
        gallery.appendChild(thumbs);
      }
    } else {
      gallery.innerHTML = '<div class="prod-thumb" style="border-radius:16px;aspect-ratio:16/8;font-size:4rem"><span>' + (cat ? cat.icon : '📦') + '</span></div>';
    }
    body.appendChild(gallery);

    var info = U.el('div', {});
    var priceHtml = DB().settings.showPricesToGuests === false ? '<span class="muted small">برای اطلاع از قیمت تماس بگیرید</span>' :
      '<div class="prod-price" style="font-size:1.6rem">' + U.money(p.price) + '</div>' +
      (p.wholesale ? '<div class="small muted">قیمت عمده: <b>' + U.money(p.wholesale) + '</b></div>' : '');
    var stockTxt = p.stock > 0 ? (p.stock <= (p.minStock || 0) ? '<span class="pill pill-warn">آخرین موجودی — ' + U.toFa(U.group(p.stock)) + ' ' + U.esc(p.unit) + '</span>' : '<span class="pill pill-ok">موجود در فروشگاه</span>')
      : '<span class="pill pill-err">فعلاً ناموجود</span>';
    info.innerHTML = '<div class="row gap-sm wrap mb">' + stockTxt + (cat ? '<span class="chip small">' + (cat.icon || '') + ' ' + U.esc(cat.name) + '</span>' : '') +
      (p.brand ? '<span class="chip small">برند: ' + U.esc(p.brand) + '</span>' : '') + '</div>' +
      priceHtml +
      (p.description ? '<p class="mt">' + U.esc(p.description) + '</p>' : '');
    if ((p.tags || []).length) {
      var tg = U.el('div', { class: 'chips mt-sm' });
      p.tags.forEach(function (t) {
        var b = U.el('button', { class: 'chip small', text: '#' + t });
        b.addEventListener('click', function () {
          m.close(); state.q = t; state.page = 1;
          var si = U.$('.store-search input'); if (si) si.value = t;
          draw(); U.scrollTo({ top: 620, behavior: 'smooth' });
        });
        tg.appendChild(b);
      });
      info.appendChild(tg);
    }
    body.appendChild(info);

    /* مشخصات */
    var specRows = (p.specs || []).slice();
    if (p.brand) specRows.unshift({ k: 'برند', v: p.brand });
    if (p.sku) specRows.push({ k: 'کد کالا', v: p.sku });
    if (p.origin) specRows.push({ k: 'کشور سازنده', v: p.origin });
    if (specRows.length) {
      body.appendChild(UI.section('مشخصات کامل', 'box'));
      var t = U.el('table', { class: 'compare-table' });
      specRows.forEach(function (s) {
        var tr = U.el('tr');
        tr.innerHTML = '<th style="width:160px">' + U.esc(s.k) + '</th><td>' + U.esc(s.v) + '</td>';
        t.appendChild(tr);
      });
      body.appendChild(t);
    }

    /* بارکد */
    body.appendChild(UI.section('بارکد جنس (برای پیدا کردن سریع در فروشگاه)', 'scan'));
    var bc = U.el('div', { class: 'row gap-sm wrap', style: { alignItems: 'center' } });
    bc.innerHTML = '<div style="background:#fff;padding:8px;border:1px solid var(--line);border-radius:10px;max-width:230px">' + Shop.barcode.svg(p.barcode, { width: 210, height: 64, showText: true }) + '</div>' +
      '<div class="small muted">کد: <b style="direction:ltr;display:inline-block">' + U.esc(p.barcode) + '</b><br>همین کد را در نوار جست‌وجوی بالای صفحه بزنید تا این جنس باز شود.</div>';
    body.appendChild(bc);

    /* اقلام مرتبط */
    var related = S().searchProducts({ cat: p.categoryId, activeOnly: true }).filter(function (x) { return x.id !== p.id; }).slice(0, 6);
    if (related.length) {
      body.appendChild(UI.section('جنسی که با این خریده می‌شود', 'tag'));
      var pr = U.el('div', { class: 'row gap-sm wrap' });
      var shown = S().basketPairs(p.id).slice(0, 3).map(function (x) { return x.product; }).filter(Boolean);
      if (!shown.length) shown = related.slice(0, 3);
      shown.forEach(function (rp) {
        var chip = U.el('button', { class: 'chip', html: (rp.image ? '<img src="' + rp.image + '" style="width:22px;height:22px;border-radius:6px;object-fit:cover">' : '📦') + ' ' + U.esc(rp.name) + ' — ' + U.money(rp.price) });
        chip.addEventListener('click', function () { m.close(); openProduct(rp); });
        pr.appendChild(chip);
      });
      body.appendChild(pr);
    }

    /* دکمه‌ها */
    var addBtn = U.el('button', { class: 'btn btn-primary btn-lg grow', html: UI.iconHTML('cart', 18) + ' افزودن به سبد خرید' });
    addBtn.addEventListener('click', function () { addToCart(p, 1); });
    var waBtn = U.el('button', { class: 'btn btn-ghost btn-lg', html: UI.iconHTML('msg', 18) + ' پرسیدن از فروشگاه' });
    waBtn.addEventListener('click', function () {
      var text = 'سلام، درباره‌ی این جنس سؤال داشتم:\n' + p.name + ' (' + p.barcode + ')';
      var w = DB().shop.whatsapp;
      if (w) root.open('https://wa.me/' + U.toEn(w).replace(/[^0-9]/g, '') + '?text=' + encodeURIComponent(text), '_blank');
      else U.copy(text).then(function () { U.toast('متن پرسش کپی شد — به فروشگاه پیام بدهید', 'ok', 3200); });
    });
    var fbtn = U.el('button', { class: 'btn btn-ghost btn-lg', html: UI.iconHTML('heart', 18) });
    fbtn.addEventListener('click', function () {
      var arr = DB().favorites || (DB().favorites = []);
      var i = arr.indexOf(p.id);
      if (i > -1) arr.splice(i, 1); else arr.push(p.id);
      S().save();
      U.toast(i < 0 ? 'به علاقه‌مندی‌ها اضافه شد' : 'حذف شد', 'ok', 1600);
    });
    var foot = U.el('div', { class: 'row gap-sm wrap' }, [addBtn, waBtn, fbtn]);
    var m = U.modal({ title: p.name, content: body, footer: foot, size: 'lg' });
    draw();
    return m;
  }

  /* ---------- سبد خرید ---------- */
  function cart() {
    var c = DB().cart || (DB().cart = {});
    return c;
  }
  function cartLines() {
    var c = cart();
    return Object.keys(c).map(function (pid) {
      var p = S().getProduct(pid);
      if (!p) { delete c[pid]; return null; }
      return { p: p, qty: c[pid] };
    }).filter(Boolean);
  }
  function addToCart(p, qty) {
    var c = cart();
    c[p.id] = (c[p.id] || 0) + qty;
    if (c[p.id] > p.stock && !DB().settings.allowNegativeStock) {
      c[p.id] = p.stock;
      if (p.stock <= 0) { delete c[p.id]; S().save(); updateCartBadge(); U.toast('این جنس فعلاً موجود نیست', 'warn'); return; }
      U.toast('بیشتر از موجودی انبار نمی‌شود — حداکثر ' + U.toFa(p.stock) + ' عدد', 'warn', 3200);
    }
    S().save();
    updateCartBadge();
    U.toast('🛒 ' + p.name + ' به سبد اضافه شد', 'ok', 1800);
    var drawer = U.$('.drawer.cart-drawer');
    if (drawer && drawer.classList.contains('open')) openCart();
  }
  function setQty(pid, qty) {
    var c = cart();
    var p = S().getProduct(pid);
    qty = U.num(qty);
    if (qty <= 0 || !p) delete c[pid];
    else c[pid] = Math.min(qty, DB().settings.allowNegativeStock ? qty : p.stock);
    S().save(); updateCartBadge();
  }
  function cartTotals() {
    var lines = cartLines();
    var subtotal = U.sum(lines, function (l) { return l.p.price * l.qty; });
    return { lines: lines, subtotal: subtotal, count: U.sum(lines, function (l) { return l.qty; }), grand: subtotal };
  }
  function updateCartBadge() {
    if (!state.el) return;
    var n = cartTotals().count;
    state.el.cartCount.textContent = U.toFa(n);
    state.el.cartCount.classList.toggle('hidden', !n);
  }
  function openCart() {
    var old = U.$('.drawer.cart-drawer');
    if (old) old.remove();
    var d = U.el('div', { class: 'drawer cart-drawer' });
    var head = U.el('div', { class: 'drawer-head' });
    head.innerHTML = '<h3 style="margin:0">' + UI.iconHTML('cart', 18) + ' سبد خرید</h3>';
    var closeBtn = U.el('button', { class: 'icon-btn', html: UI.iconHTML('x', 16) });
    closeBtn.addEventListener('click', function () { closeDrawer(d); });
    head.appendChild(closeBtn);
    var bodyEl = U.el('div', { class: 'drawer-body' });
    var footEl = U.el('div', { class: 'drawer-foot' });
    d.appendChild(head); d.appendChild(bodyEl); d.appendChild(footEl);
    document.body.appendChild(d);
    setTimeout(function () { d.classList.add('open'); }, 20);

    function draw2() {
      var t = cartTotals();
      bodyEl.innerHTML = '';
      if (!t.lines.length) {
        bodyEl.innerHTML = '<div class="fav-empty">' + UI.iconHTML('cart', 30) + '<div class="mt-sm">سبد خرید شما خالی است</div><div class="small">از بین جنس‌ها انتخاب کنید تا اینجا بیاید.</div></div>';
        footEl.innerHTML = '';
        return;
      }
      t.lines.forEach(function (l) {
        var row = U.el('div', { class: 'cart-line' });
        row.innerHTML = (l.p.image ? '<img src="' + l.p.image + '" style="width:46px;height:46px;border-radius:10px;object-fit:cover">' : '<span style="font-size:1.4rem">📦</span>') +
          '<span class="c-name"><b>' + U.esc(l.p.name) + '</b><br><small class="muted">' + U.money(l.p.price) + ' × ' + U.toFa(l.qty) + ' = ' + U.money(l.p.price * l.qty) + '</small></span>';
        var qb = U.el('div', { class: 'qty-box' });
        var minus = U.el('button', { text: '−' }), plus = U.el('button', { text: '+' });
        var inp = U.el('input', { value: U.toFa(l.qty), inputmode: 'numeric' });
        minus.addEventListener('click', function () { setQty(l.p.id, l.qty - 1); draw2(); });
        plus.addEventListener('click', function () { addToCart(l.p, 1); draw2(); });
        inp.addEventListener('change', function () { setQty(l.p.id, U.num(inp.value)); draw2(); });
        qb.appendChild(minus); qb.appendChild(inp); qb.appendChild(plus);
        row.appendChild(qb);
        var rm = U.el('button', { class: 'icon-btn round', html: UI.iconHTML('x', 14) });
        rm.addEventListener('click', function () { setQty(l.p.id, 0); draw2(); });
        row.appendChild(rm);
        bodyEl.appendChild(row);
      });
      var sumRow = U.el('div', { class: 'totals-box' });
      sumRow.innerHTML = '<div class="totals-row"><span>تعداد اقلام</span><b>' + U.toFa(t.count) + '</b></div>' +
        '<div class="totals-row grand"><span>جمع سبد</span><span>' + U.money(t.grand) + '</span></div>';
      bodyEl.appendChild(sumRow);

      /* فرم سفارش */
      bodyEl.appendChild(UI.section('اطلاعات سفارش', 'msg'));
      var nameI = U.el('input', { class: 'input input-sm mb-sm', placeholder: 'نام و نام خانوادگی', value: U.store.get('shop.guestName', '') || '' });
      var phoneI = U.el('input', { class: 'input input-sm mb-sm', placeholder: 'شماره تماس', inputmode: 'tel', value: U.store.get('shop.guestPhone', '') || '' });
      var typeSel = U.el('select', { class: 'input input-sm mb-sm' }, [
        U.el('option', { value: 'pickup', text: 'حضوری در فروشگاه تحویل می‌گیرم' }),
        U.el('option', { value: 'delivery', text: 'ارسال با پیک/پست (تلفنی هماهنگ شود)' }),
        U.el('option', { value: 'inquiry', text: 'فقط رزرو کنم، بعداً می‌آیم' })
      ]);
      var noteI = U.el('textarea', { class: 'input input-sm', rows: 2, placeholder: 'توضیح سفارش (اختیاری) — مثال: تا ساعت ۷ عصر آماده باشد' });
      [nameI, phoneI, typeSel, noteI].forEach(function (x) { bodyEl.appendChild(x); });

      /* دکمه‌های ثبت */
      var orderBtn = U.el('button', { class: 'btn btn-primary btn-block btn-lg', html: UI.iconHTML('check', 18) + ' ثبت سفارش' });
      var waOrder = U.el('button', { class: 'btn btn-accent btn-block mt-sm', html: UI.iconHTML('msg', 17) + ' ثبت و ارسال به واتساپ فروشگاه' });
      var copyOrder = U.el('button', { class: 'btn btn-ghost btn-block btn-sm mt-sm', html: UI.iconHTML('download', 15) + ' کپی متن سفارش' });
      var printBtn = U.el('button', { class: 'btn btn-ghost btn-block btn-sm mt-sm', html: UI.iconHTML('print', 15) + ' چاپ لیست خرید' });
      footEl.innerHTML = '';
      footEl.appendChild(orderBtn); footEl.appendChild(waOrder); footEl.appendChild(copyOrder); footEl.appendChild(printBtn);

      function collect() {
        var t2 = cartTotals();
        return {
          name: nameI.value.trim(), phone: phoneI.value.trim(), type: typeSel.value, note: noteI.value.trim(),
          lines: t2.lines.map(function (l) { return { pid: l.p.id, name: l.p.name, qty: l.qty, price: l.p.price, unit: l.p.unit, barcode: l.p.barcode }; }),
          subtotal: t2.subtotal, count: t2.count
        };
      }
      function orderText(o) {
        var lines = o.lines.map(function (l, i) { return U.toFa(i + 1) + ') ' + l.name + ' × ' + U.toFa(l.qty) + ' ' + l.unit + ' = ' + U.money(l.price * l.qty); });
        return '🧾 سفارش از سایت ' + DB().shop.name + '\n' +
          'مشتری: ' + (o.name || 'مهمان') + (o.phone ? ' — ' + U.toFa(U.toEn(o.phone)) : '') + '\n' +
          'نوع تحویل: ' + ({ pickup: 'حضوری', delivery: 'ارسال', inquiry: 'رزرو' }[o.type] || o.type) + '\n' +
          lines.join('\n') + '\n' +
          'جمع: ' + U.money(o.subtotal) + '\n' +
          (o.note ? 'توضیح: ' + o.note + '\n' : '') +
          'زمان: ' + U.jDateLong() + ' — ' + U.jTime(Date.now());
      }
      function registerOrder(o) {
        var msg = {
          id: U.uuid('ord'), at: Date.now(), type: 'order', raw: orderText(o),
          customer: { name: o.name, phone: o.phone }, orderType: o.type, note: o.note,
          items: o.lines.map(function (l) { return { pid: l.pid, name: l.name, qty: l.qty, price: l.price, op: 'order' }; }),
          total: o.subtotal, status: 'new'
        };
        S().addMessage(msg);
        return msg;
      }
      function finish(msg) {
        U.store.set('shop.guestName', msg.customer.name || '');
        U.store.set('shop.guestPhone', msg.customer.phone || '');
        DB().cart = {};
        S().save();
        updateCartBadge();
        draw2();
        /* صفحه‌ی تأیید */
        bodyEl.innerHTML = '';
        footEl.innerHTML = '';
        var ok = U.el('div', { class: 'center' });
        ok.innerHTML = '<div style="font-size:3rem">✅</div>' +
          '<h3>سفارش شما ثبت شد</h3>' +
          '<p class="muted small">فروشنده سفارش را می‌بیند و برای هماهنگی با شما تماس می‌گیرد.<br>شماره‌ی سفارش: <b>' + U.toFa(msg.id.slice(-4).toUpperCase()) + '</b></p>' +
          '<div class="alert alert-info small" style="text-align:right"><b>خلاصه‌ی سفارش</b><pre style="white-space:pre-wrap;margin:6px 0 0;font-family:var(--font)">' + U.esc(msg.raw) + '</pre></div>';
        var again = U.el('button', { class: 'btn btn-primary', text: 'ادامه‌ی خرید' });
        again.addEventListener('click', function () { closeDrawer(d); });
        var wa = U.el('a', { class: 'btn btn-accent', target: '_blank', html: UI.iconHTML('msg', 16) + ' ارسال همین سفارش در واتساپ' });
        wa.href = waLinkFor(msg.raw);
        ok.appendChild(U.el('div', { class: 'row gap-sm wrap', style: { justifyContent: 'center' } }, [again, wa]));
        bodyEl.appendChild(ok);
      }
      orderBtn.addEventListener('click', function () {
        var o = collect();
        if (!o.lines.length) return;
        if (!o.name) return U.toast('نام خود را بنویسید تا فروشنده سفارش را بشناسد', 'warn');
        finish(registerOrder(o));
      });
      waOrder.addEventListener('click', function () {
        var o = collect();
        if (!o.lines.length) return;
        var msg = registerOrder(o);
        try { root.open(waLinkFor(msg.raw), '_blank'); } catch (e) { }
        U.toast('سفارش ثبت شد و متن آن برای واتساپ آماده است', 'ok', 3600);
        finish(msg);
      });
      copyOrder.addEventListener('click', function () {
        U.copy(orderText(collect())).then(function () { U.toast('متن سفارش کپی شد', 'ok'); });
      });
      printBtn.addEventListener('click', function () {
        var o = collect();
        UI.printHTML('<div class="inv-head"><div><h1>' + U.esc(DB().shop.name) + '</h1><div class="l-meta">لیست خرید مشتری — ' + U.jDateLong() + '</div></div></div>' +
          '<p>مشتری: ' + U.esc(o.name) + (o.phone ? ' — ' + U.toFa(U.toEn(o.phone)) : '') + '</p>' +
          '<table><thead><tr><th>#</th><th>کالا</th><th>تعداد</th><th>قیمت واحد</th><th>جمع</th></tr></thead><tbody>' +
          o.lines.map(function (l, i) { return '<tr><td>' + U.toFa(i + 1) + '</td><td>' + U.esc(l.name) + '</td><td>' + U.toFa(l.qty) + ' ' + U.esc(l.unit) + '</td><td>' + U.money(l.price) + '</td><td>' + U.money(l.price * l.qty) + '</td></tr>'; }).join('') +
          '</tbody></table><div class="totals"><div class="grand"><span>جمع کل</span><span>' + U.money(o.subtotal) + '</span></div></div>', 'لیست خرید');
      });
    }
    draw2();
  }
  function waLinkFor(text) {
    var w = U.toEn(DB().shop.whatsapp || DB().shop.phone || '').replace(/[^0-9]/g, '');
    return w ? 'https://wa.me/' + w + '?text=' + encodeURIComponent(text) : 'https://wa.me/?text=' + encodeURIComponent(text);
  }
  function closeDrawer(d) {
    d.classList.remove('open');
    setTimeout(function () { d.remove(); }, 260);
  }

  /* ---------- علاقه‌مندی ---------- */
  function openFavorites() {
    var old = U.$('.drawer.fav-drawer');
    if (old) old.remove();
    var d = U.el('div', { class: 'drawer fav-drawer' });
    var head = U.el('div', { class: 'drawer-head' });
    head.innerHTML = '<h3 style="margin:0">' + UI.iconHTML('heart', 18) + ' علاقه‌مندی‌های من</h3>';
    var closeBtn = U.el('button', { class: 'icon-btn', html: UI.iconHTML('x', 16) });
    closeBtn.addEventListener('click', function () { closeDrawer(d); });
    head.appendChild(closeBtn);
    var bodyEl = U.el('div', { class: 'drawer-body' });
    var lines = (DB().favorites || []).map(function (id) { return S().getProduct(id); }).filter(Boolean);
    if (!lines.length) bodyEl.innerHTML = '<div class="fav-empty">' + UI.iconHTML('heart', 30) + '<div class="mt-sm">هنوز چیزی را نشان نکرده‌اید</div><div class="small">روی قلب کارت هر جنس بزنید تا اینجا ذخیره شود.</div></div>';
    lines.forEach(function (p) {
      var row = U.el('div', { class: 'cart-line' });
      row.innerHTML = (p.image ? '<img src="' + p.image + '" style="width:46px;height:46px;border-radius:10px;object-fit:cover">' : '<span style="font-size:1.4rem">📦</span>') +
        '<span class="c-name"><b>' + U.esc(p.name) + '</b><br><small class="muted">' + U.money(p.price) + '</small></span>';
      var add = U.el('button', { class: 'btn btn-primary btn-sm', text: 'افزودن' });
      add.addEventListener('click', function () { addToCart(p, 1); });
      var rm = U.el('button', { class: 'icon-btn round', html: UI.iconHTML('x', 14) });
      rm.addEventListener('click', function () {
        var arr = DB().favorites; arr.splice(arr.indexOf(p.id), 1); S().save(); closeDrawer(d); openFavorites();
      });
      row.appendChild(add); row.appendChild(rm);
      bodyEl.appendChild(row);
    });
    d.appendChild(head); d.appendChild(bodyEl);
    document.body.appendChild(d);
    setTimeout(function () { d.classList.add('open'); }, 20);
  }

  /* ---------- مقایسه ---------- */
  function drawCompareBar() {
    var bar = state.el && state.el.compareBar;
    if (!bar) return;
    bar.innerHTML = '';
    var items = state.compare.map(function (id) { return S().getProduct(id); }).filter(Boolean);
    bar.classList.toggle('show', items.length > 0);
    if (!items.length) return;
    bar.appendChild(U.el('div', { class: 'row gap-sm wrap grow', html: items.map(function (p) { return '<span class="chip small">' + U.esc(p.name) + '</span>'; }).join('') + '<span class="small muted">' + U.toFa(items.length) + ' جنس انتخاب شده</span>' }));
    var go = U.el('button', { class: 'btn btn-primary btn-sm', text: 'مقایسه کن' });
    go.addEventListener('click', showCompare);
    var clr = U.el('button', { class: 'btn btn-ghost btn-sm', text: 'پاک کردن' });
    clr.addEventListener('click', function () { state.compare = []; drawCompareBar(); draw(); });
    bar.appendChild(go); bar.appendChild(clr);
  }
  function showCompare() {
    var items = state.compare.map(function (id) { return S().getProduct(id); }).filter(Boolean);
    if (items.length < 2) return U.toast('برای مقایسه حداقل دو جنس انتخاب کنید', 'warn');
    var keys = [];
    items.forEach(function (p) {
      (p.specs || []).forEach(function (s) { if (keys.indexOf(s.k) < 0) keys.push(s.k); });
    });
    var rows = [
      ['قیمت', function (p) { return U.money(p.price); }],
      ['قیمت عمده', function (p) { return p.wholesale ? U.money(p.wholesale) : '—'; }],
      ['دسته', function (p) { var c = S().getCategory(p.categoryId); return c ? c.name : '—'; }],
      ['برند', function (p) { return p.brand || '—'; }],
      ['موجودی', function (p) { return p.stock > 0 ? U.toFa(U.group(p.stock)) + ' ' + p.unit : 'ناموجود'; }],
      ['واحد', function (p) { return p.unit; }],
      ['توضیح', function (p) { return p.description ? p.description.slice(0, 90) : '—'; }]
    ].concat(keys.map(function (k) {
      return [k, function (p) { var s = (p.specs || []).filter(function (x) { return x.k === k; })[0]; return s ? s.v : '—'; }];
    }));
    var t = U.el('table', { class: 'compare-table' });
    t.innerHTML = '<thead><tr><th></th>' + items.map(function (p) {
      return '<th>' + (p.image ? '<img src="' + p.image + '" style="width:54px;height:54px;object-fit:cover;border-radius:10px">' : '📦') + '<div>' + U.esc(p.name) + '</div></th>';
    }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr><th>' + U.esc(r[0]) + '</th>' + items.map(function (p) { return '<td>' + U.esc(String(r[1](p))) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody>';
    var body = U.el('div', {});
    body.appendChild(t);
    var addAll = U.el('button', { class: 'btn btn-primary mt', html: UI.iconHTML('cart', 16) + ' افزودن همه به سبد' });
    addAll.addEventListener('click', function () {
      items.forEach(function (p) { if (p.stock > 0) addToCart(p, 1); });
      m.close();
    });
    var m = U.modal({ title: 'مقایسه‌ی اجناس', content: body, footer: U.el('div', {}, [addAll]), size: 'lg' });
  }

  /* ---------- جست‌وجوی هوشمند متن/تصویر ---------- */
  function matchProducts(words, opt) {
    opt = opt || {};
    var list = S().searchProducts({ q: words, activeOnly: true });
    if (list.length) return list;
    var terms = U.norm(words).split(/[\s،,]+/).filter(function (t) { return t.length > 1; });
    var scored = DB().products.filter(function (p) { return p.active !== false; }).map(function (p) {
      var hay = U.norm([p.name, p.brand, (p.tags || []).join(' '), p.description, p.categoryId].join(' '));
      var s = U.sum(terms, function (t) { return hay.indexOf(t) > -1 ? 1 : 0; });
      if (opt.categoryId && p.categoryId === opt.categoryId) s += 1.2;
      return { p: p, s: s };
    }).filter(function (x) { return x.s > 0; }).sort(function (a, b) { return b.s - a.s; });
    return scored.map(function (x) { return x.p; });
  }

  /* ---------- راه‌اندازی ---------- */
  function init() {
    S().load();
    UI.applyTheme();
    UI.shopInfo();
    build();
    /* پیشنهادها برای مشتری: پرفروش‌ها را هم زیر صفحه نشان بده */
    var top = S().stats(Date.now() - 30 * 86400000, Date.now()).topProducts.slice(0, 6)
      .map(function (t) { return S().getProduct(t.pid); }).filter(function (p) { return p && p.active !== false; });
    if (top.length) {
      var app = U.$('#storeApp');
      var box = productRow(top, 'محبوب‌ترین‌های این فروشگاه');
      app.insertBefore(box, U.$('.store-footer'));
    }
  }
  Shop.app = { init: init, state: state, openProduct: openProduct, addToCart: addToCart, build: build };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof window !== 'undefined' ? window : globalThis);
