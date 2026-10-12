/* ============================================================
   Shop Manager — UI Kit  (اجزای مشترک رابط کاربری)
   بدون کتابخانه بیرونی: آیکن SVG، جدول، نمودار، برچسب، فاکتور،
   انتخابگر تصویر با تحلیل هوشمند و ماشین‌حساب قیمت.
   ============================================================ */
(function (root) {
  'use strict';
  var Shop = (root.Shop = root.Shop || {});
  var U = Shop.U;

  var ICONS = {
    dash: 'M3 13h8V3H3v10zm10 8h8V11h-8v10zM3 21h8v-6H3v6zm10-12h8V3h-8v6z',
    box: 'M21 8l-9-5-9 5 9 5 9-5zm-18 2.5l8 4.5v7l-8-4.5v-7zm10 11.5v-7l8-4.5v7l-8 4.5z',
    tag: 'M21.4 11.6l-9-9C12 2.2 11.5 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .5.2 1 .6 1.4l9 9c.4.4.9.6 1.4.6s1-.2 1.4-.6l7-7c.4-.4.6-.9.6-1.4s-.2-1-.6-1.4zM6.5 8C5.7 8 5 7.3 5 6.5S5.7 5 6.5 5 8 5.7 8 6.5 7.3 8 6.5 8z',
    cart: 'M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM7.2 14.6l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49L19.1 4h-.01l-1.1 2-2.76 5H8.53l-.13-.27L6.16 6l-.95-2-.94-2H1v2h2l3.6 7.59-1.35 2.45C4.52 15.37 5.48 17 7 17h12v-2H7.42c-.14 0-.25-.11-.22-.4z',
    bell: 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5S10.5 3.17 10.5 4v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z',
    gear: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
    calc: 'M19 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 16H8v-2h4v2zm0-4H8v-2h4v2zm5 4h-4v-2h4v2zm0-4h-4v-2h4v2zm1-5H6V5h12v4z',
    chart: 'M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zm5.6 8H19v6h-2.8v-6z',
    plus: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
    edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
    trash: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
    print: 'M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z',
    download: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z',
    upload: 'M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z',
    image: 'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0-1.1 0 0 0 1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z',
    search: 'M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
    x: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
    check: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
    star: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
    heart: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
    link: 'M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z',
    logout: 'M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z',
    menu: 'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
    msg: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z',
    scan: 'M9.5 6.5v3h-3v-3h3M11 5H5v6h6V5zm-1.5 9.5v3h-3v-3h3M11 13H5v6h6v-6zm6.5-6.5v3h-3v-3h3M19 5h-6v6h6V5zm-6 8h1.5v1.5H13V13zm1.5 1.5H16V16h-1.5v-1.5zM16 13h1.5v1.5H16V13zm-3 3h1.5v1.5H13V16zm1.5 1.5H16V19h-1.5v-1.5zM16 16h1.5v1.5H16V16zm1.5-1.5H19V16h-1.5v-1.5zm0 3H19V19h-1.5v-1.5zM19 13h-1.5v1.5H19V13z',
    wallet: 'M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
    clock: 'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z',
    warn: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
    sparkles: 'M12 2l1.6 4.4L18 8l-4.4 1.6L12 14l-1.6-4.4L6 8l4.4-1.6L12 2zM5 14l.9 2.1L8 17l-2.1.9L5 20l-.9-2.1L2 17l2.1-.9L5 14zm13 0l.9 2.1L21 17l-2.1.9L18 20l-.9-2.1L15 17l2.1-.9L18 14z'
  };

  function icon(name, size, cls) {
    var p = ICONS[name] || ICONS.box;
    var svg = '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" width="' + (size || 20) + '" height="' + (size || 20) + '" aria-hidden="true"><path d="' + p + '"/></svg>';
    var span = document.createElement('span');
    span.className = 'ico';
    span.innerHTML = svg;
    return span;
  }
  function iconHTML(name, size, cls) {
    var p = ICONS[name] || ICONS.box;
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" width="' + (size || 20) + '" height="' + (size || 20) + '" aria-hidden="true"><path d="' + p + '"/></svg>';
  }

  /* ---------- تم ---------- */
  function applyTheme() {
    var theme = (Shop.store.db.settings && Shop.store.db.settings.theme) || 'emerald';
    document.documentElement.setAttribute('data-theme', theme);
  }
  function shopInfo() {
    var s = Shop.store.db.shop || {};
    U.$$('[data-shop-name]').forEach(function (el) { el.textContent = s.name || 'فروشگاه من'; });
    U.$$('[data-shop-logo]').forEach(function (el) { el.textContent = s.logo || '🛍️'; });
    U.$$('[data-shop-tagline]').forEach(function (el) { el.textContent = s.tagline || ''; });
    U.$$('[data-shop-phone]').forEach(function (el) { el.textContent = s.phone || ''; });
    U.$$('[data-shop-address]').forEach(function (el) { el.textContent = s.address || ''; });
    U.$$('[data-shop-hours]').forEach(function (el) { el.textContent = s.hours || ''; });
    U.$$('[data-shop-notice]').forEach(function (el) { el.textContent = s.notice || ''; el.style.display = s.notice ? '' : 'none'; });
    if (s.phone) {
      U.$$('[data-shop-tel]').forEach(function (a) { a.href = 'tel:' + U.toEn(String(s.phone).replace(/[^\d+]/g, '')); });
    }
    if (s.whatsapp) U.$$('[data-shop-wa]').forEach(function (a) { a.href = 'https://wa.me/' + U.toEn(String(s.whatsapp).replace(/\D/g, '')); });
  }

  /* ---------- نشان‌ها ---------- */
  function stockPill(p) {
    var st = p.stock <= 0 ? ['ناموجود', 'err'] : (p.stock <= (p.minStock || 0) ? ['کم‌موجود', 'warn'] : ['موجود', 'ok']);
    if (st[1] === 'warn' && p.stock > (p.minStock || 0) * 1.5) st = ['موجود', 'ok'];
    return '<span class="pill pill-' + st[1] + '">' + st[0] + '</span>';
  }
  function badge(text, type, iconName) {
    return '<span class="pill pill-' + (type || 'info') + '">' + (iconName ? iconHTML(iconName, 13) : '') + ' ' + U.esc(text) + '</span>';
  }

  /* ---------- جدول ---------- */
  function table(spec) {
    var state = { sort: spec.sort || null, dir: spec.dir || 'desc', page: 1, perPage: spec.perPage || 25 };
    var wrap = U.el('div', { class: 'table-wrap' });
    var toolbar = U.el('div', { class: 'table-tools' });
    var searchInput = null;
    if (spec.searchable) {
      searchInput = U.el('input', { class: 'input input-sm', type: 'search', placeholder: 'جست‌وجو در جدول…' });
      toolbar.appendChild(U.el('div', { class: 'grow' }, [searchInput]));
    }
    var countEl = U.el('span', { class: 'muted small' });
    toolbar.appendChild(countEl);
    wrap.appendChild(toolbar);

    var tbl = U.el('table', { class: 'table' });
    var thead = U.el('thead'), tbody = U.el('tbody');
    tbl.appendChild(thead); tbl.appendChild(tbody);
    wrap.appendChild(tbl);
    var pager = U.el('div', { class: 'pager' });
    wrap.appendChild(pager);

    function currentRows() {
      var rows = spec.rows.slice();
      var q = searchInput ? U.norm(searchInput.value) : '';
      if (q) rows = rows.filter(function (r) { return U.norm(spec.searchText ? spec.searchText(r) : JSON.stringify(r)).indexOf(q) > -1; });
      if (state.sort && spec.sorters && spec.sorters[state.sort]) {
        rows.sort(function (a, b) {
          var v = spec.sorters[state.sort](a, b);
          return state.dir === 'asc' ? v : -v;
        });
      }
      return rows;
    }
    function render() {
      thead.innerHTML = '';
      var tr = U.el('tr');
      spec.columns.forEach(function (col) {
        var th = U.el('th', { class: col.class || '' }, [U.el('span', { text: col.title })]);
        if (spec.sorters && spec.sorters[col.key]) {
          th.classList.add('sortable');
          if (state.sort === col.key) th.classList.add(state.dir === 'asc' ? 'asc' : 'desc');
          th.addEventListener('click', function () {
            if (state.sort === col.key) state.dir = state.dir === 'asc' ? 'desc' : 'asc';
            else { state.sort = col.key; state.dir = 'desc'; }
            render();
          });
        }
        tr.appendChild(th);
      });
      thead.appendChild(tr);

      var rows = currentRows();
      var pages = Math.max(1, Math.ceil(rows.length / state.perPage));
      state.page = U.clamp(state.page, 1, pages);
      var slice = rows.slice((state.page - 1) * state.perPage, state.page * state.perPage);
      tbody.innerHTML = '';
      if (!slice.length) {
        tbody.appendChild(U.el('tr', {}, [U.el('td', { colspan: spec.columns.length }, [
          U.el('div', { class: 'empty', text: spec.empty || 'موردی یافت نشد' })
        ])]));
      }
      slice.forEach(function (row) {
        var trr = U.el('tr');
        if (spec.rowAttrs) Object.keys(spec.rowAttrs(row)).forEach(function (k) { trr.setAttribute(k, spec.rowAttrs(row)[k]); });
        spec.columns.forEach(function (col) {
          var td = U.el('td', { class: (col.class || '') + ' col-' + col.key });
          var v = col.render ? col.render(row) : row[col.key];
          if (v && v.nodeType) td.appendChild(v);
          else td.innerHTML = v == null ? '' : v;
          if (col.title) td.setAttribute('data-label', col.title);
          trr.appendChild(td);
        });
        if (spec.onRowClick) trr.addEventListener('click', function (e) {
          if (e.target.closest('button,a,input,select')) return;
          spec.onRowClick(row);
        });
        tbody.appendChild(trr);
      });
      countEl.textContent = U.toFa(rows.length) + ' مورد';
      pager.innerHTML = '';
      if (pages > 1) {
        var prev = U.el('button', { class: 'btn btn-ghost btn-sm', text: 'قبلی', disabled: state.page === 1 }, []);
        prev.addEventListener('click', function () { state.page--; render(); });
        pager.appendChild(prev);
        pager.appendChild(U.el('span', { class: 'muted small', text: 'صفحه ' + U.toFa(state.page) + ' از ' + U.toFa(pages) }));
        var next = U.el('button', { class: 'btn btn-ghost btn-sm', text: 'بعدی', disabled: state.page === pages });
        next.addEventListener('click', function () { state.page++; render(); });
        pager.appendChild(next);
      }
    }
    if (searchInput) searchInput.addEventListener('input', U.debounce(function () { state.page = 1; render(); }, 200));
    render();
    return { el: wrap, render: render, setRows: function (r) { spec.rows = r; render(); } };
  }

  /* ---------- نمودارها (SVG خالص) ---------- */
  function lineChart(values, opt) {
    opt = opt || {};
    var w = opt.width || 700, h = opt.height || 200, pad = { t: 14, r: 12, b: 26, l: 46 };
    if (!values.length) return U.el('div', { class: 'empty', text: 'داده‌ای نیست' });
    var max = Math.max.apply(null, values.map(function (v) { return v.y; })) * 1.15 || 1;
    var iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
    var step = values.length > 1 ? iw / (values.length - 1) : iw;
    var pts = values.map(function (v, i) {
      return [pad.l + i * step, pad.t + ih - (v.y / max) * ih];
    });
    var path = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    var area = path + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + (pad.t + ih) + ' L' + pts[0][0].toFixed(1) + ' ' + (pad.t + ih) + ' Z';
    var grid = '', labels = '';
    for (var g = 0; g <= 4; g++) {
      var y = pad.t + ih * g / 4;
      grid += '<line x1="' + pad.l + '" y1="' + y + '" x2="' + (w - pad.r) + '" y2="' + y + '" stroke="var(--line)" stroke-width="1"/>';
      labels += '<text x="' + (pad.l - 8) + '" y="' + (y + 4) + '" text-anchor="end" font-size="10" fill="var(--muted)">' + U.moneyShort(max * (4 - g) / 4) + '</text>';
    }
    var xlabels = '';
    var every = Math.ceil(values.length / 7);
    values.forEach(function (v, i) {
      if (i % every) return;
      xlabels += '<text x="' + pts[i][0].toFixed(1) + '" y="' + (h - 6) + '" text-anchor="middle" font-size="10" fill="var(--muted)">' + U.esc(v.x) + '</text>';
    });
    var dots = opt.points === false ? '' : pts.map(function (p, i) {
      return '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3" fill="var(--primary)"><title>' + U.esc((values[i].label || values[i].x) + ': ' + U.toman(values[i].y)) + '</title></circle>';
    }).join('');
    var svg = '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" role="img">' +
      '<defs><linearGradient id="lg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--primary)" stop-opacity=".34"/><stop offset="1" stop-color="var(--primary)" stop-opacity="0"/></linearGradient></defs>' +
      grid + '<path d="' + area + '" fill="url(#lg1)"/>' +
      '<path d="' + path + '" fill="none" stroke="var(--primary)" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>' +
      dots + labels + xlabels + '</svg>';
    var box = U.el('div', { class: 'chart-box' });
    box.innerHTML = svg;
    return box;
  }
  function barChart(items, opt) {
    opt = opt || {};
    if (!items.length) return U.el('div', { class: 'empty', text: 'داده‌ای نیست' });
    var max = Math.max.apply(null, items.map(function (i) { return i.value; })) || 1;
    var list = U.el('div', { class: 'bars' });
    items.forEach(function (it) {
      var row = U.el('div', { class: 'bar-row' });
      row.innerHTML = '<span class="bar-label">' + U.esc(it.label) + '</span>' +
        '<span class="bar-track"><i style="width:' + Math.max(2, it.value / max * 100).toFixed(1) + '%;background:' + (it.color || 'var(--primary)') + '"></i></span>' +
        '<span class="bar-value">' + (opt.money === false ? U.toFa(U.group(it.value)) : U.moneyShort(it.value)) + '</span>';
      list.appendChild(row);
    });
    return list;
  }
  function donut(items, opt) {
    opt = opt || {};
    var total = U.sum(items, function (i) { return i.value; }) || 1;
    var colors = opt.colors || ['var(--primary)', '#2563eb', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#ec4899'];
    var r = 54, c = 2 * Math.PI * r, offset = 0;
    var circles = items.map(function (it, i) {
      var frac = it.value / total;
      var seg = '<circle r="' + r + '" cx="80" cy="80" fill="none" stroke="' + (it.color || colors[i % colors.length]) + '" stroke-width="26" ' +
        'stroke-dasharray="' + (frac * c).toFixed(2) + ' ' + c.toFixed(2) + '" stroke-dashoffset="' + (-offset * c).toFixed(2) + '" transform="rotate(-90 80 80)"><title>' + U.esc(it.label) + ': ' + U.percent(frac * 100) + '</title></circle>';
      offset += frac;
      return seg;
    }).join('');
    var box = U.el('div', { class: 'donut-box' });
    box.innerHTML = '<svg viewBox="0 0 160 160" class="donut">' + circles + '</svg>' +
      '<div class="donut-legend">' + items.map(function (it, i) {
        return '<div class="legend-row"><i style="background:' + (it.color || colors[i % colors.length]) + '"></i><span class="grow">' + U.esc(it.label) + '</span><b>' + (opt.money === false ? U.toFa(U.group(it.value)) : U.moneyShort(it.value)) + '</b></div>';
      }).join('') + '</div>';
    return box;
  }

  /* ---------- چاپ ---------- */
  function printHTML(html, title) {
    var frame = U.el('iframe', { class: 'print-frame', title: title || 'print' });
    document.body.appendChild(frame);
    var doc = frame.contentWindow.document;
    doc.open();
    doc.write('<!doctype html><html dir="rtl" lang="fa"><head><meta charset="utf-8"><title>' + U.esc(title || 'چاپ') + '</title>' +
      '<style>' + printCSS() + '</style></head><body>' + html + '</body></html>');
    doc.close();
    setTimeout(function () {
      try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch (e) { U.toast('چاپ ممکن نشد؛ از Ctrl+P استفاده کنید', 'warn'); }
      setTimeout(function () { frame.remove(); }, 1500);
    }, 350);
  }
  function printCSS() {
    return [
      '@page{size:A4;margin:12mm}',
      'body{font-family:Tahoma,"Iranian Sans",sans-serif;color:#111;direction:rtl}',
      'h1,h2,h3{margin:0 0 6px}',
      '.inv-head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0e9f6e;padding-bottom:8px;margin-bottom:12px}',
      '.inv-head .logo{font-size:30px}',
      'table{width:100%;border-collapse:collapse;margin:10px 0;font-size:12px}',
      'th,td{border:1px solid #ccc;padding:6px 8px;text-align:right}',
      'th{background:#f1f5f4}',
      '.totals{margin-top:8px;font-size:13px}',
      '.totals div{display:flex;justify-content:space-between;padding:3px 0}',
      '.totals .grand{font-weight:bold;border-top:2px solid #0e9f6e;margin-top:6px;padding-top:6px;font-size:15px}',
      '.words{background:#f7faf9;border:1px dashed #cbd5d2;padding:8px;border-radius:6px;margin:10px 0;font-size:12px}',
      '.label{border:1px dashed #999;border-radius:6px;padding:8px;text-align:center;page-break-inside:avoid}',
      '.labels{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}',
      '.l-name{font-size:11px;font-weight:bold;margin:2px 0;height:28px;overflow:hidden}',
      '.l-price{font-size:12px;font-weight:bold}',
      '.l-meta{font-size:9px;color:#555}',
      '.bc{width:100%;height:52px}',
      '.foot{margin-top:14px;font-size:11px;color:#555;border-top:1px dashed #bbb;padding-top:8px;display:flex;justify-content:space-between}',
      '.no-print{display:none}'
    ].join('\n');
  }
  function labelHTML(p, opt) {
    opt = opt || {};
    return '<div class="label" style="width:' + (opt.width || '100%') + '">' +
      '<div class="l-name">' + U.esc(p.name) + '</div>' +
      '<div class="bc">' + Shop.barcode.svg(p.barcode, { text: false, height: 44, module: 2 }) + '</div>' +
      '<div class="l-meta">' + U.esc(p.barcode) + '</div>' +
      '<div class="l-price">' + U.toman(p.price, Shop.store.db.shop.currency) + '</div>' +
      (opt.showShop === false ? '' : '<div class="l-meta">' + U.esc(Shop.store.db.shop.name) + '</div>') +
      '</div>';
  }
  function printLabels(products, opt) {
    opt = opt || {};
    var copies = Math.max(1, U.num(opt.copies || 1));
    var list = [];
    products.forEach(function (p) { for (var i = 0; i < copies; i++) list.push(p); });
    var html = '<div class="inv-head"><div><h1>' + U.esc(Shop.store.db.shop.name) + '</h1>' +
      '<div class="l-meta">برچسب قیمت و بارکد — ' + U.jDateLong() + ' — ' + U.toFa(list.length) + ' عدد</div></div>' +
      '<div class="logo">' + (Shop.store.db.shop.logo || '🏷️') + '</div></div>' +
      '<div class="labels">' + list.map(function (p) { return labelHTML(p, opt); }).join('') + '</div>';
    printHTML(html, 'برچسب‌های قیمت');
  }
  function invoiceHTML(sale, opt) {
    opt = opt || {};
    var shop = Shop.store.db.shop;
    var rows = sale.items.map(function (i, idx) {
      return '<tr><td>' + U.toFa(idx + 1) + '</td><td>' + U.esc(i.name) + '</td><td>' + U.toFa(U.group(i.qty)) + '</td>' +
        '<td>' + U.money(i.price) + '</td><td>' + U.money(i.price * i.qty - (i.discount || 0)) + '</td></tr>';
    }).join('');
    var pay = { cash: 'نقدی', card: 'کارتی', credit: 'نسیه' }[sale.payment] || sale.payment;
    return '<div class="inv-head"><div><h1>' + U.esc(shop.name) + '</h1>' +
      '<div class="l-meta">' + U.esc(shop.address || '') + (shop.phone ? ' — تلفن: ' + U.esc(shop.phone) : '') + '</div></div>' +
      '<div style="text-align:center"><div class="logo">' + (shop.logo || '🧾') + '</div>' +
      '<div class="l-meta">' + Shop.barcode.svg('INV' + sale.no, { text: false, height: 34, module: 1.6 }) + '</div></div></div>' +
      '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px">' +
      '<span>شماره فاکتور: <b>' + U.toFa(sale.no) + '</b></span>' +
      '<span>تاریخ: ' + U.jDateLong(sale.at) + ' — ' + U.jTime(sale.at) + '</span>' +
      '<span>نوع پرداخت: <b>' + pay + '</b></span></div>' +
      (sale.customer && sale.customer.name ? '<div class="l-meta">خریدار: ' + U.esc(sale.customer.name) + (sale.customer.phone ? ' — ' + U.esc(sale.customer.phone) : '') + '</div>' : '') +
      '<table><thead><tr><th style="width:34px">#</th><th>شرح کالا</th><th style="width:60px">تعداد</th><th style="width:100px">قیمت واحد</th><th style="width:120px">جمع</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div class="totals">' +
      '<div><span>جمع کل</span><b>' + U.toman(sale.subtotal, shop.currency) + '</b></div>' +
      (sale.discount ? '<div><span>تخفیف</span><b>' + U.toman(sale.discount, shop.currency) + '</b></div>' : '') +
      (sale.tax ? '<div><span>مالیات (' + U.percent(sale.taxPct || 0, 0) + ')</span><b>' + U.toman(sale.tax, shop.currency) + '</b></div>' : '') +
      '<div class="grand"><span>مبلغ قابل پرداخت</span><span>' + U.toman(sale.total, shop.currency) + '</span></div></div>' +
      '<div class="words">به حروف: ' + U.moneyInWords(sale.total, shop.currency) + '</div>' +
      '<div class="foot"><span>از خرید شما سپاسگزاریم 🌹</span><span>' + U.esc(shop.hours || '') + '</span><span>مدیر فروشگاه</span></div>';
  }
  function printInvoice(sale, opt) { printHTML(invoiceHTML(sale, opt), 'فاکتور فروش ' + U.toFa(sale.no)); }

  /* ---------- انتخابگر تصویر + تحلیل هوشمند ---------- */
  function imagePicker(opt) {
    opt = opt || {};
    var state = { dataUrl: opt.value || '', analysis: null, fp: null, prepared: null };
    var box = U.el('div', { class: 'img-picker' });
    var preview = U.el('div', { class: 'img-preview' + (state.dataUrl ? ' has' : '') });
    if (state.dataUrl) preview.innerHTML = '<img src="' + state.dataUrl + '" alt="تصویر جنس">';
    else preview.innerHTML = '<div class="img-empty">' + iconHTML('image', 30) + '<span>عکس جنس را بکشید و رها کنید<br><small>یا کلیک کنید / با دوربین بگیرید / Ctrl+V بچسبانید</small></span></div>';

    var input = U.el('input', { type: 'file', accept: 'image/*', capture: 'environment', class: 'hidden' });
    var report = U.el('div', { class: 'ai-report hidden' });
    var actions = U.el('div', { class: 'row gap-sm wrap' });
    var analyzeBtn = U.el('button', {
      class: 'btn btn-primary btn-sm', type: 'button',
      html: iconHTML('sparkles', 16) + ' تحلیل هوشمند تصویر'
    });
    var removeBtn = U.el('button', { class: 'btn btn-ghost btn-sm', type: 'button', html: iconHTML('x', 15) + ' حذف عکس' });
    actions.appendChild(analyzeBtn); actions.appendChild(removeBtn);

    box.appendChild(preview); box.appendChild(input); box.appendChild(actions); box.appendChild(report);

    function setImage(dataUrl) {
      state.dataUrl = dataUrl;
      preview.classList.add('has');
      preview.innerHTML = '<img src="' + dataUrl + '" alt="تصویر جنس">';
      report.classList.add('hidden');
      state.analysis = null;
      if (opt.onImage) opt.onImage(dataUrl, state);
    }
    function handleFile(file) {
      var raw = '';
      U.readImage(file).then(function (f) {
        raw = f.dataUrl;
        return Shop.vision.prepare(f.dataUrl);
      }).then(function (prep) {
        state.prepared = prep;
        setImage(prep.dataUrl || raw);
      }).catch(function (e) { U.toast(e.message, 'err'); });
    }
    preview.addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function () { if (input.files[0]) handleFile(input.files[0]); });
    removeBtn.addEventListener('click', function () {
      state.dataUrl = ''; state.analysis = null; state.fp = null; state.prepared = null;
      preview.classList.remove('has');
      preview.innerHTML = '<div class="img-empty">' + iconHTML('image', 30) + '<span>عکس جنس را بکشید و رها کنید</span></div>';
      report.classList.add('hidden');
      if (opt.onImage) opt.onImage('', state);
    });
    ['dragenter', 'dragover'].forEach(function (ev) {
      preview.addEventListener(ev, function (e) { e.preventDefault(); preview.classList.add('drag'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      preview.addEventListener(ev, function (e) { e.preventDefault(); preview.classList.remove('drag'); });
    });
    preview.addEventListener('drop', function (e) {
      var f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) handleFile(f);
    });
    document.addEventListener('paste', function (e) {
      if (!img_paste_active) return;
      var items = (e.clipboardData || {}).items || [];
      for (var i = 0; i < items.length; i++) {
        if (items[i].type && items[i].type.indexOf('image') === 0) { handleFile(items[i].getAsFile()); break; }
      }
    });
    var img_paste_active = false;
    box.addEventListener('mouseenter', function () { img_paste_active = true; });
    box.addEventListener('mouseleave', function () { img_paste_active = false; });

    analyzeBtn.addEventListener('click', function () {
      if (!state.dataUrl) return U.toast('اول یک عکس انتخاب کنید', 'warn');
      analyzeBtn.disabled = true;
      analyzeBtn.innerHTML = iconHTML('sparkles', 16) + ' در حال تحلیل…';
      Shop.vision.analyze(state.dataUrl, { dict: Shop.store.listCategories() }).then(function (rep) {
        state.analysis = rep;
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = iconHTML('sparkles', 16) + ' تحلیل دوباره';
        if (!rep.ok) {
          report.classList.remove('hidden');
          report.innerHTML = '<div class="alert alert-warn">' + U.esc(rep.error) + '</div>';
          return;
        }
        state.fp = rep.fp;
        renderReport(rep);
        if (opt.onAnalysis) opt.onAnalysis(rep);
        U.toast('تحلیل انجام شد — پیشنهادها را بررسی کنید', 'ok');
      }).catch(function (e) {
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = iconHTML('sparkles', 16) + ' تحلیل هوشمند تصویر';
        U.toast('تحلیل تصویر ممکن نشد: ' + e.message, 'err');
      });
    });

    function renderReport(rep) {
      var c = rep.candidates;
      var html = '<div class="ai-head">' + iconHTML('sparkles', 18) + ' تحلیل تصویر (کاملاً روی همین دستگاه — بدون ارسال به اینترنت)</div>';
      html += '<div class="ai-chips">' + c.map(function (x, i) {
        return '<button type="button" class="chip ' + (i === 0 ? 'chip-primary' : '') + '" data-pick="' + x.key + '">' +
          x.icon + ' ' + U.esc(x.name) + ' <b>' + U.percent(x.share * 100, 0) + '</b></button>';
      }).join('') + '</div>';
      if (rep.ambiguous) html += '<div class="alert alert-warn small">تصویر میان چند دسته مشترک است؛ دقیق‌ترین گزینه را انتخاب کنید.</div>';
      html += '<div class="ai-summary">' + U.esc(rep.summary) + '</div>';
      html += '<div class="row gap-sm wrap ai-actions">';
      html += '<button type="button" class="btn btn-primary btn-sm" data-apply="all">' + iconHTML('check', 15) + ' پرکردن خودکار فرم</button>';
      html += '<button type="button" class="btn btn-ghost btn-sm" data-apply="name">فقط نام</button>';
      html += '<button type="button" class="btn btn-ghost btn-sm" data-apply="tags">فقط برچسب‌ها</button>';
      html += '<button type="button" class="btn btn-ghost btn-sm" data-apply="color">فقط رنگ و پالت</button>';
      html += '</div>';
      html += '<div class="palette">' + rep.suggestion.palette.map(function (p) {
        return '<span class="swatch" style="background:' + p.hex + '" title="' + U.esc(p.name) + ' — ' + U.percent(p.pct * 100, 0) + '"></span>';
      }).join('') + '<span class="muted small">رنگ غالب: ' + U.esc(rep.suggestion.colorName) + ' — ' + rep.suggestion.color + '</span></div>';
      if (rep.best.why && rep.best.why.length) {
        html += '<ul class="ai-why">' + rep.best.why.map(function (w) { return '<li>' + U.esc(w) + '</li>'; }).join('') + '</ul>';
      }
      if (rep.warnings.length) {
        html += '<div class="alert alert-warn small">' + rep.warnings.map(function (w) { return '• ' + U.esc(w); }).join('<br>') + '</div>';
      }
      report.innerHTML = html;
      report.classList.remove('hidden');
      U.$$('[data-pick]', report).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var key = btn.getAttribute('data-pick');
          var chosen = rep.candidates.filter(function (x) { return x.key === key; })[0] || rep.best;
          U.$$('[data-pick]', report).forEach(function (b) { b.classList.remove('chip-primary'); });
          btn.classList.add('chip-primary');
          if (opt.onPick) opt.onPick(chosen, rep);
        });
      });
      U.$$('[data-apply]', report).forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (opt.onApply) opt.onApply(btn.getAttribute('data-apply'), rep);
        });
      });
    }

    return {
      el: box, state: state,
      setImage: setImage,
      clear: function () { removeBtn.click(); },
      analyze: function () { analyzeBtn.click(); }
    };
  }

  /* ---------- ماشین‌حساب قیمت (درصدی) ---------- */
  function priceCalc(opt) {
    opt = opt || {};
    var st = {
      cost: U.num(opt.cost || 0),
      price: U.num(opt.price || 0),
      basis: 'price',   /* price | cost */
      rounding: 'none'
    };
    var box = U.el('div', { class: 'calc' });
    var displayLbl = U.el('div', { class: 'calc-lbl', text: 'قیمت فروش' });
    var display = U.el('div', { class: 'calc-display', text: U.money(st.price) });
    var costRow = U.el('div', { class: 'calc-row' });
    costRow.innerHTML = '<label class="lbl">قیمت خرید</label>';
    var costInput = U.el('input', { class: 'input input-sm', inputmode: 'numeric', value: st.price ? '' : '' });
    costRow.appendChild(costInput);

    var pad = U.el('div', { class: 'calc-pad' });
    [['7', '8', '9', '+۵٪'], ['4', '5', '6', '−۵٪'], ['1', '2', '3', '+۱۰٪'], ['0', '۰۰۰', 'C', '−۱۰٪'],
    ['+٪ دلخواه', '−٪ دلخواه', '⌫', '='], ['+۵۰ هزار', '−۵۰ هزار', '+۱۰۰ هزار', 'گرد کن']].forEach(function (row) {
      row.forEach(function (k) {
        var b = U.el('button', { type: 'button', class: 'calc-key', text: k });
        b.addEventListener('click', function () { press(k); });
        pad.appendChild(b);
      });
    });

    var info = U.el('div', { class: 'calc-info' });
    var applyBtn = U.el('button', {
      class: 'btn btn-primary btn-block', type: 'button', html: iconHTML('check', 16) + (opt.applyText || 'اعمال قیمت جدید')
    });
    applyBtn.addEventListener('click', function () {
      if (opt.onApply) opt.onApply(st.price, st);
    });

    var history = U.el('div', { class: 'calc-history' });

    function render() {
      display.textContent = U.money(st.price);
      displayLbl.textContent = (st.basis === 'cost' ? 'قیمت پیشنهادی بر پایه‌ی قیمت خرید' : 'قیمت فروش');
      var m = Shop.store.pricing;
      var margin = m.margin(st.cost, st.price), markup = m.markup(st.cost, st.price);
      info.innerHTML =
        '<div class="calc-line"><span>سود هر واحد</span><b>' + U.toman(st.price - st.cost) + '</b></div>' +
        '<div class="calc-line"><span>حاشیه‌ی سود (Margin)</span><b>' + U.percent(margin) + '</b></div>' +
        '<div class="calc-line"><span>درصد روی خرید (Markup)</span><b>' + U.percent(markup) + '</b></div>' +
        '<div class="calc-line"><span>قیمت خرید</span><b>' + U.toman(st.cost) + '</b></div>' +
        (margin < 0 ? '<div class="alert alert-err small">قیمت فروش از قیمت خرید کمتر است!</div>' :
          margin < 8 && st.cost ? '<div class="alert alert-warn small">حاشیه‌ی سود کمتر از ۸٪ — بازنگری کنید.</div>' : '');
      if (st.rounding !== 'none') info.innerHTML += '<div class="muted small">گرد کردن: ' + U.esc({ up1000: 'به بالا (هزار تومان)', down1000: 'به پایین (هزار تومان)', up500: 'به بالا (۵۰۰ تومان)', up100: 'به بالا (۱۰۰ تومان)' }[st.rounding] || '') + '</div>';
    }
    function press(k) {
      var m = Shop.store.pricing;
      if (/^\d$/.test(k)) { st.price = st.price * 10 + parseInt(k, 10); }
      else if (k === '۰۰۰') { st.price = st.price * 1000; }
      else if (k === 'C') { st.price = 0; }
      else if (k === '⌫') { st.price = Math.floor(st.price / 10); }
      else if (k === '=') { }
      else if (k === '%دلخواه+' || k === '+٪ دلخواه') {
        U.prompt('چند درصد افزایش؟', '10').then(function (v) {
          if (v == null || v === '') return;
          st.price = m.round(st.price * (1 + U.num(v) / 100), st.rounding === 'none' ? 'none' : st.rounding);
          push('افزایش ' + U.percent(U.num(v), 0)); render();
        });
      } else if (k === '−٪ دلخواه') {
        U.prompt('چند درصد کاهش؟', '10').then(function (v) {
          if (v == null || v === '') return;
          st.price = m.round(st.price * (1 - U.num(v) / 100), st.rounding === 'none' ? 'none' : st.rounding);
          push('کاهش ' + U.percent(U.num(v), 0)); render();
        });
      } else if (/^[+−]\d+/.test(k)) {
        if (k.indexOf('٪') > -1) {
          var pct = U.num(k.replace(/[^\d.]/g, ''));
          var sign = k[0] === '−' ? -1 : 1;
          st.price = m.round(st.price * (1 + sign * pct / 100), st.rounding === 'none' ? 'none' : st.rounding);
          push((sign > 0 ? 'افزایش ' : 'کاهش ') + U.percent(pct, 0));
        } else {
          var amt = U.num(k.replace(/[^\d]/g, '')) * 1000;
          var sg = k[0] === '−' ? -1 : 1;
          st.price = Math.max(0, st.price + sg * amt);
          push((sg > 0 ? '+' : '−') + U.moneyShort(amt));
        }
      } else if (k.replace(/[^\d]/g, '') && k.indexOf('گرد') === 0) {
        st.price = m.round(st.price, 'up1000');
        push('گرد به هزار');
      } else if (k.indexOf('حالا') > -1) { st.rounding = 'up1000'; st.price = m.round(st.price, 'up1000'); push('گرد به هزار'); }
      render();
    }
    function push(what) {
      var d = U.el('div', { class: 'calc-hist-row' });
      d.innerHTML = '<span>' + U.esc(what) + '</span><b>' + U.money(st.price) + '</b>';
      history.prepend(d);
      while (history.children.length > 6) history.lastChild.remove();
      if (opt.onChange) opt.onChange(st.price, st);
    }
    costInput.addEventListener('input', function () {
      st.cost = U.num(costInput.value);
      if (st.basis === 'cost' && st.cost) st.price = Shop.store.pricing.round(Shop.store.pricing.fromMarkup(st.cost, Shop.store.db.settings.defaultProfit || 25), st.rounding === 'none' ? 'none' : st.rounding);
      render();
      if (opt.onChange) opt.onChange(st.price, st);
    });

    var roundSel = U.el('select', { class: 'input input-sm' }, [
      U.el('option', { value: 'none', text: 'بدون گرد کردن' }),
      U.el('option', { value: 'up1000', text: 'گرد به بالا (هزار)' }),
      U.el('option', { value: 'down1000', text: 'گرد به پایین (هزار)' }),
      U.el('option', { value: 'up500', text: 'گرد به بالا (۵۰۰)' }),
      U.el('option', { value: 'up100', text: 'گرد به بالا (۱۰۰)' })
    ]);
    roundSel.addEventListener('change', function () { st.rounding = roundSel.value; if (roundSel.value !== 'none') st.price = Shop.store.pricing.round(st.price, roundSel.value); render(); });

    var basisSel = U.el('select', { class: 'input input-sm' }, [
      U.el('option', { value: 'price', text: 'پایه: قیمت فعلی' }),
      U.el('option', { value: 'cost', text: 'پایه: قیمت خرید + سود' })
    ]);
    basisSel.addEventListener('change', function () { st.basis = basisSel.value; render(); });

    box.appendChild(displayLbl); box.appendChild(display);
    box.appendChild(costRow);
    box.appendChild(U.el('div', { class: 'row gap-sm wrap' }, [basisSel, roundSel]));
    box.appendChild(pad);
    box.appendChild(info);
    box.appendChild(applyBtn);
    box.appendChild(history);

    /* پیش‌تنظیم از جنس */
    if (opt.cost) { costInput.value = U.group(opt.cost); }
    if (opt.price) st.price = U.num(opt.price);
    render();

    return { el: box, state: st, setPrice: function (v) { st.price = U.num(v); render(); }, setCost: function (v) { st.cost = U.num(v); costInput.value = U.group(v); render(); } };
  }

  /* ---------- فرم‌ساز ---------- */
  function form(spec) {
    var box = U.el('div', { class: 'form-grid' });
    var fields = {};
    (spec.fields || []).forEach(function (f) {
      var wrap = U.el('div', { class: 'field ' + (f.full ? 'full' : '') + (f.half ? ' half' : '') });
      if (f.type !== 'hidden') {
        var lbl = U.el('label', { class: 'lbl', text: f.label });
        if (f.hint) lbl.innerHTML += ' <span class="hint" title="' + U.attr(f.hint) + '">ⓘ</span>';
        wrap.appendChild(lbl);
      }
      var input;
      if (f.type === 'select') {
        input = U.el('select', { class: 'input' });
        (f.options || []).forEach(function (o) {
          input.appendChild(U.el('option', { value: o.value, text: o.label, selected: String(o.value) === String(f.value) }));
        });
      } else if (f.type === 'textarea') {
        input = U.el('textarea', { class: 'input', rows: f.rows || 2, placeholder: f.placeholder || '' });
        input.value = f.value == null ? '' : f.value;
      } else if (f.type === 'checkbox') {
        input = U.el('label', { class: 'switch' }, [
          U.el('input', { type: 'checkbox', checked: !!f.value }),
          U.el('span', { class: 'slider' }),
          U.el('span', { class: 'switch-lbl', text: f.hint || '' })
        ]);
        input = input;
      } else if (f.type === 'money' || f.type === 'number') {
        input = U.el('input', { class: 'input', inputmode: 'numeric', value: f.value == null ? '' : (f.type === 'money' ? U.group(f.value) : f.value), placeholder: f.placeholder || '' });
        if (f.type === 'money') {
          input.addEventListener('input', U.debounce(function () {
            var caretEnd = input.selectionStart === input.value.length;
            input.value = U.group(U.num(input.value));
            if (caretEnd) input.setSelectionRange(input.value.length, input.value.length);
          }, 350));
        }
      } else if (f.type === 'tags') {
        input = U.el('input', { class: 'input', value: (f.value || []).join('، '), placeholder: f.placeholder || 'با کاما جدا کنید' });
      } else {
        input = U.el('input', { class: 'input', type: f.type || 'text', value: f.value == null ? '' : f.value, placeholder: f.placeholder || '' });
      }
      if (f.type === 'checkbox') fields[f.key] = { el: input, get: function () { return input.querySelector('input').checked; }, set: function (v) { input.querySelector('input').checked = !!v; }, type: f.type };
      else fields[f.key] = {
        el: input, type: f.type, spec: f,
        get: function () {
          if (f.type === 'money' || f.type === 'number') return U.num(input.value);
          if (f.type === 'tags') return String(input.value).split(/[،,]/).map(function (s) { return s.trim(); }).filter(Boolean);
          return input == null ? '' : (input.value == null ? '' : input.value);
        },
        set: function (v) {
          if (f.type === 'money') input.value = U.group(v);
          else if (f.type === 'tags') input.value = (v || []).join('، ');
          else if (f.type === 'select') input.value = v;
          else input.value = v == null ? '' : v;
        }
      };
      wrap.appendChild(input);
      if (f.help) wrap.appendChild(U.el('div', { class: 'muted small', text: f.help }));
      box.appendChild(wrap);
    });
    return {
      el: box, fields: fields,
      values: function () {
        var v = {};
        Object.keys(fields).forEach(function (k) { v[k] = fields[k].get(); });
        return v;
      },
      setValues: function (obj) {
        Object.keys(obj).forEach(function (k) { if (fields[k]) fields[k].set(obj[k]); });
      }
    };
  }

  /* ---------- انواع بندی ---------- */
  function alertBox(text, type) {
    return '<div class="alert alert-' + (type || 'info') + '">' + text + '</div>';
  }
  function section(title, iconName, extra) {
    var h = U.el('div', { class: 'section-head' });
    h.innerHTML = '<h3>' + (iconName ? iconHTML(iconName, 18) : '') + ' ' + U.esc(title) + '</h3>';
    if (extra) h.appendChild(extra);
    return h;
  }
  function statCard(o) {
    var c = U.el('div', { class: 'stat ' + (o.tone ? 'stat-' + o.tone : '') });
    c.innerHTML = '<div class="stat-top">' + (o.icon ? iconHTML(o.icon, 18) : '') + '<span>' + U.esc(o.label) + '</span></div>' +
      '<div class="stat-value">' + o.value + '</div>' +
      (o.sub ? '<div class="stat-sub">' + o.sub + '</div>' : '');
    return c;
  }

  /* ---------- اسکنر بارکد (ورود دستی/دوربین) ---------- */
  function scanModal(cb) {
    var input = U.el('input', { class: 'input input-lg', placeholder: 'بارکد یا کد کالا را وارد کنید…', autofocus: true });
    var cameraBox = U.el('div', { class: 'cam-box' });
    var body = U.el('div', { class: 'col gap-sm' }, [
      U.el('div', { class: 'muted small', text: 'می‌توانید از بارکدخوان (اسکنر) استفاده کنید؛ عدد در همین کادر تایپ می‌شود.' }),
      input,
      cameraBox
    ]);
    var foot = U.el('div', { class: 'row gap-sm' }, [
      U.el('button', { class: 'btn btn-primary', text: 'جست‌وجو', onclick: function () { if (input.value.trim()) { var v0 = input.value.trim(); stopCam(); m.close(); cb(v0); } } }),
      U.el('button', { class: 'btn btn-ghost', text: 'انصراف', onclick: function () { stopCam(); m.close(); } })
    ]);
    var m = U.modal({ title: 'اسکن / ورود بارکد', content: body, footer: foot });
    var stream = null, raf = null;
    var camBtn = U.el('button', { class: 'btn btn-ghost btn-sm', html: iconHTML('scan', 16) + ' روشن کردن دوربین' });
    cameraBox.appendChild(camBtn);
    camBtn.addEventListener('click', function () {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return U.toast('دوربین در این مرورگر پشتیبانی نمی‌شود', 'warn');
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(function (s) {
        stream = s;
        var video = U.el('video', { class: 'cam-video', autoplay: true, playsinline: true, muted: true });
        cameraBox.innerHTML = '';
        cameraBox.appendChild(video);
        video.srcObject = s;
        cameraBox.appendChild(U.el('div', { class: 'muted small', text: 'بارکد را مقابل دوربین بگیرید…' }));
        if ('BarcodeDetector' in root) {
          var det = new root.BarcodeDetector({ formats: ['ean_13', 'code_128', 'code_39', 'ean_8', 'upc_a', 'upc_e', 'itf', 'qr_code'] });
          var scanLoop = function () {
            if (!stream) return;
            det.detect(video).then(function (codes) {
              if (codes && codes.length) {
                var val = codes[0].rawValue;
                stopCam();
                m.close();
                U.toast('بارکد خوانده شد: ' + val, 'ok');
                cb(val);
                return;
              }
              raf = requestAnimationFrame(scanLoop);
            }).catch(function () { raf = requestAnimationFrame(scanLoop); });
          };
          raf = requestAnimationFrame(scanLoop);
        } else {
          cameraBox.appendChild(U.el('div', { class: 'alert alert-warn small', text: 'مرورگر شما خواندن خودکار بارکد از دوربین را پشتیبانی نمی‌کند؛ عدد را دستی وارد کنید یا از اسکنر استفاده کنید.' }));
        }
      }).catch(function () { U.toast('دسترسی به دوربین ممکن نشد', 'err'); });
    });
    function stopCam() {
      if (raf) cancelAnimationFrame(raf);
      if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
      stream = null;
    }
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && input.value.trim()) { var v = input.value.trim(); stopCam(); m.close(); cb(v); }
    });
    setTimeout(function () { input.focus(); }, 100);
    return m;
  }

  /* ---------- ورودی تاریخ شمسی ---------- */
  function dateInput(value, opt) {
    opt = opt || {};
    var cur = value ? U.jalali(value) : U.jalali();
    var years = [], months = [], days = [];
    var yw = U.el('select', { class: 'input input-sm' });
    for (var y = cur.jy - 3; y <= cur.jy + 3; y++) yw.appendChild(U.el('option', { value: y, text: U.toFa(y), selected: y === cur.jy }));
    var mw = U.el('select', { class: 'input input-sm' });
    U.JMONTHS.forEach(function (m, i) { mw.appendChild(U.el('option', { value: i + 1, text: m, selected: i + 1 === cur.jm })); });
    var dw = U.el('select', { class: 'input input-sm' });
    function fillDays() {
      var m = +mw.value, y = +yw.value, cnt = m <= 6 ? 31 : (m <= 11 ? 30 : (isLeap(y) ? 30 : 29));
      dw.innerHTML = '';
      for (var d = 1; d <= cnt; d++) dw.appendChild(U.el('option', { value: d, text: U.toFa(d), selected: d === cur.jd }));
    }
    function isLeap(jy) {
      var a = jy % 33;
      return [1, 5, 9, 13, 17, 22, 26, 30].indexOf(a) > -1;
    }
    fillDays();
    mw.addEventListener('change', fillDays); yw.addEventListener('change', fillDays);
    var el = U.el('div', { class: 'row gap-xs' }, [yw, mw, dw]);
    return {
      el: el,
      get: function () { return U.jalaliToDate(+yw.value, +mw.value, +dw.value, 12, 0).getTime(); },
      clear: function () { }
    };
  }

  /* ---------- نوار نصب اپلیکیشن ---------- */
  function initInstall() {
    var deferred = null;
    root.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferred = e;
      var btn = U.$('#installBtn');
      if (btn) {
        btn.classList.remove('hidden');
        btn.addEventListener('click', function () {
          deferred.prompt();
          deferred.userChoice.then(function () { btn.classList.add('hidden'); deferred = null; });
        });
      }
    });
  }
  function initOffline() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol === 'file:') return;
    navigator.serviceWorker.register('sw.js').then(function () {
      U.toast('برنامه برای استفاده‌ی آفلاین آماده شد', 'info', 2200);
    }).catch(function () { });
  }

  Shop.ui = {
    ICONS: ICONS, icon: icon, iconHTML: iconHTML,
    applyTheme: applyTheme, shopInfo: shopInfo,
    stockPill: stockPill, badge: badge, alertBox: alertBox, section: section, statCard: statCard,
    table: table, lineChart: lineChart, barChart: barChart, donut: donut,
    printHTML: printHTML, printLabels: printLabels, printInvoice: printInvoice, invoiceHTML: invoiceHTML, labelHTML: labelHTML,
    imagePicker: imagePicker, priceCalc: priceCalc, form: form, scanModal: scanModal, dateInput: dateInput,
    initInstall: initInstall, initOffline: initOffline,
    money: U.money, toman: U.toman
  };
})(typeof window !== 'undefined' ? window : globalThis);
