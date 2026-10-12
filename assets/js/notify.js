/* ============================================================
   Shop Manager — Notification Engine (اطلاع‌رسانی خودکار)
   بدون سرور: زمان‌بند در مرورگر + کانال‌های رایگان
   (ایمیل، واتساپ، پیامک، تلگرام، نوتیفیکیشن مرورگر، وبهوک)
   ============================================================ */
(function (root) {
  'use strict';
  var Shop = (root.Shop = root.Shop || {});
  var U = Shop.U, S = Shop.store;

  /* ---------- محاسبه‌ی بازه‌ی گزارش ---------- */
  function rangeFor(frequency, now) {
    now = now || Date.now();
    var end = now, start;
    var today = U.jalali(now);
    if (frequency === 'daily') {
      var d = new Date(now); d.setHours(0, 0, 0, 0);
      start = d.getTime();
    } else if (frequency === 'weekly') {
      start = new Date(now - 7 * 86400000).getTime();
    } else if (frequency === 'biweekly') {
      start = new Date(now - 14 * 86400000).getTime();
    } else {
      start = new Date(now - 30 * 86400000).getTime();
    }
    return { start: start, end: end, label: labelFor(frequency, start, end) };
  }
  function labelFor(frequency, start, end) {
    var names = { daily: 'روزانه', weekly: 'هفتگی', biweekly: 'دوهفته‌ای', monthly: 'ماهانه' };
    return (names[frequency] || 'گزارش') + ' — ' + U.jDate(start) + ' تا ' + U.jDate(end);
  }

  /* ---------- ساخت داده‌ی گزارش ---------- */
  function buildReport(frequency, now) {
    var r = rangeFor(frequency, now);
    var st = S.stats(r.start, r.end);
    var sum = S.stockSummary();
    var restock = S.restockSuggestions(14);
    var prevRange = { start: r.start - (r.end - r.start), end: r.start };
    var prev = S.stats(prevRange.start, prevRange.end);
    var growth = prev.revenue > 0 ? (st.revenue - prev.revenue) / prev.revenue * 100 : null;

    var top = st.topProducts.slice(0, 5);
    var slow = st.topProducts.slice().sort(function (a, b) { return a.qty - b.qty; }).slice(0, 3);
    return {
      shop: S.db.shop, at: now || Date.now(), range: r, stats: st,
      stock: { value: sum.value, retail: sum.retail, units: sum.units, count: sum.count },
      low: sum.low.slice(0, 10), out: sum.out.slice(0, 10), dead: sum.dead.slice(0, 5),
      expiring: sum.expiring.slice(0, 8), restock: restock.slice(0, 8), restockCount: restock.length,
      top: top, slow: slow, growth: growth, prevRevenue: prev.revenue,
      cash: st.byPayment.cash || 0, card: st.byPayment.card || 0, credit: st.byPayment.credit || 0,
      categories: st.byCat.slice(0, 5)
    };
  }

  /* ---------- متن گزارش ---------- */
  function renderText(rep, opt) {
    opt = opt || {};
    var inc = (S.db.notify && S.db.notify.include) || {};
    var t = [];
    var freq = S.db.notify.frequency || 'daily';
    var title = { daily: 'گزارش پایان روز', weekly: 'گزارش هفتگی', biweekly: 'گزارش دوهفته‌ای', monthly: 'گزارش ماهانه' }[freq] || 'گزارش فروش';
    t.push('📊 ' + title + ' — ' + (rep.shop.name || 'فروشگاه'));
    t.push('🗓 ' + U.jDateLong(rep.at) + ' — ساعت ' + U.jTime(rep.at));
    t.push('📅 بازه: ' + rep.range.label);
    t.push('');

    if (inc.sales !== false) {
      t.push('💰 فروش: ' + U.toman(rep.stats.revenue, rep.shop.currency) + '  (' + U.toFa(rep.stats.orders) + ' فاکتور)');
      if (rep.growth != null) {
        t.push('   ' + (rep.growth >= 0 ? '🔺' : '🔻') + ' نسبت به بازه‌ی قبل: ' + U.percent(Math.abs(rep.growth)) + (rep.growth >= 0 ? ' افزایش' : ' کاهش'));
      }
    }
    if (inc.profit !== false) {
      t.push('📈 سود برآوردی: ' + U.toman(rep.stats.profit, rep.shop.currency) + '  (' + U.percent(rep.stats.margin) + ' حاشیه)');
    }
    if (inc.sales !== false) {
      t.push('🧾 میانگین هر فاکتور: ' + U.toman(rep.stats.avgOrder, rep.shop.currency));
      t.push('🔢 تعداد اقلام فروخته‌شده: ' + U.toFa(U.group(rep.stats.items)) + ' عدد');
      t.push('💵 نقد: ' + U.toman(rep.cash) + '   💳 کارتی: ' + U.toman(rep.card) + (rep.credit ? '   📝 نسیه: ' + U.toman(rep.credit) : ''));
    }
    if (inc.top !== false && rep.top.length) {
      t.push('');
      t.push('🏆 پرفروش‌ترین‌ها:');
      rep.top.forEach(function (x, i) { t.push('   ' + U.toFa(i + 1) + '. ' + x.name + ' — ' + U.toFa(U.group(x.qty)) + ' عدد'); });
    }
    if (inc.lowStock !== false) {
      t.push('');
      if (rep.out.length) {
        t.push('❌ ناموجود (' + U.toFa(rep.out.length) + ' قلم):');
        rep.out.forEach(function (p) { t.push('   • ' + p.name); });
      }
      if (rep.low.length) {
        t.push('⚠️ کم‌موجود (' + U.toFa(rep.low.length) + ' قلم):');
        rep.low.forEach(function (p) { t.push('   • ' + p.name + ' — ' + U.toFa(U.group(p.stock)) + ' ' + p.unit); });
      }
      if (!rep.out.length && !rep.low.length) t.push('✅ موجودی همه‌ی اقلام در حد مطلوب است.');
    }
    if (inc.expiry !== false && rep.expiring.length) {
      t.push('');
      t.push('🧊 نزدیک تاریخ انقضا:');
      rep.expiring.forEach(function (x) {
        t.push('   • ' + x.p.name + ' — ' + (x.days <= 0 ? 'منقضی شده!' : U.toFa(x.days) + ' روز مانده'));
      });
    }
    if (inc.dead !== false && rep.dead.length) {
      t.push('');
      t.push('🐢 راکد (بیش از ۹۰ روز بدون فروش):');
      rep.dead.forEach(function (x) { t.push('   • ' + x.p.name + ' — ' + U.toFa(x.days) + ' روز'); });
    }
    if (inc.value !== false) {
      t.push('');
      t.push('🏷 ارزش موجودی انبار (به قیمت خرید): ' + U.toman(rep.stock.value, rep.shop.currency));
      t.push('   ارزش فروش موجودی: ' + U.toman(rep.stock.retail, rep.shop.currency) + '  |  سود بالقوه: ' + U.toman(rep.stock.retail - rep.stock.value, rep.shop.currency));
      t.push('   تعداد اقلام: ' + U.toFa(rep.stock.count) + ' جنس / ' + U.toFa(U.group(rep.stock.units)) + ' عدد در انبار');
    }
    if (rep.restock.length) {
      t.push('');
      t.push('📦 پیشنهاد سفارش برای ۲ هفته‌ی آینده (' + U.toFa(rep.restockCount) + ' قلم):');
      rep.restock.forEach(function (x) {
        t.push('   • ' + x.p.name + ' → ' + U.toFa(U.group(x.order)) + ' ' + x.p.unit +
          ' (فروش ۳۰ روز: ' + U.toFa(x.sold30) + ')' + (x.urgency === 'out' ? ' ❗' : ''));
      });
    }
    if (opt.footer !== false) {
      t.push('');
      t.push('— ارسال خودکار از «مدیر فروشگاه»');
    }
    return t.join('\n');
  }

  function renderHtml(rep) {
    var rows = [];
    function row(k, v) { rows.push('<tr><th>' + U.esc(k) + '</th><td>' + v + '</td></tr>'); }
    row('بازه', U.esc(rep.range.label));
    row('فروش', '<b>' + U.toman(rep.stats.revenue, rep.shop.currency) + '</b> در ' + U.toFa(rep.stats.orders) + ' فاکتور');
    row('سود برآوردی', U.toman(rep.stats.profit, rep.shop.currency) + ' (' + U.percent(rep.stats.margin) + ')');
    row('میانگین فاکتور', U.toman(rep.stats.avgOrder, rep.shop.currency));
    row('نقد / کارتی / نسیه', U.toman(rep.cash) + ' / ' + U.toman(rep.card) + ' / ' + U.toman(rep.credit));
    row('ارزش انبار', U.toman(rep.stock.value, rep.shop.currency) + ' (سود بالقوه ' + U.toman(rep.stock.retail - rep.stock.value) + ')');
    row('ناموجود', rep.out.length ? rep.out.map(function (p) { return U.esc(p.name); }).join('، ') : 'ندارد');
    row('کم‌موجود', rep.low.length ? rep.low.map(function (p) { return U.esc(p.name) + ' (' + U.toFa(p.stock) + ')'; }).join('، ') : 'ندارد');
    if (rep.top.length) row('پرفروش‌ترین', rep.top.map(function (x) { return U.esc(x.name) + ' ×' + U.toFa(x.qty); }).join('، '));
    if (rep.expiring.length) row('نزدیک انقضا', rep.expiring.map(function (x) { return U.esc(x.p.name) + ' (' + U.toFa(x.days) + ' روز)'; }).join('، '));
    if (rep.restock.length) row('پیشنهاد سفارش', rep.restock.map(function (x) { return U.esc(x.p.name) + ' → ' + U.toFa(x.order) + ' ' + U.esc(x.p.unit); }).join('، '));
    return '<div dir="rtl" style="font-family:Tahoma,sans-serif;background:#f6f8f9;padding:18px">' +
      '<h2 style="color:#0e9f6e">📊 گزارش فروش ' + U.esc(rep.shop.name) + '</h2>' +
      '<p style="color:#667">' + U.jDateLong(rep.at) + ' — ' + U.esc(rep.range.label) + '</p>' +
      '<table cellpadding="8" cellspacing="0" style="border-collapse:collapse;background:#fff;min-width:420px">' +
      rows.map(function (r) { return r.replace('<tr>', '<tr style="border-bottom:1px solid #eee">').replace('<th>', '<th align="right" style="color:#667;font-weight:normal">'); }).join('') +
      '</table><p style="color:#667;font-size:12px">ارسال خودکار از «مدیر فروشگاه»</p></div>';
  }

  /* ---------- زمان‌بند ---------- */
  function parseTime(str) {
    var m = String(U.toEn(str || '21:00')).match(/(\d{1,2})\s*[:.]?\s*(\d{1,2})?/);
    var h = m ? U.clamp(parseInt(m[1], 10), 0, 23) : 21;
    var mi = m && m[2] ? U.clamp(parseInt(m[2], 10), 0, 59) : 0;
    return { h: h, m: mi };
  }
  /* آیا الان زمان ارسال است؟ */
  function isDue(now) {
    now = now || new Date();
    var n = S.db.notify;
    if (!n.enabled) return { due: false, reason: 'اطلاع‌رسانی خاموش است' };
    var tm = parseTime(n.time);
    var todayKey = U.dayKey(now);
    if (n.lastSentDay === todayKey) return { due: false, reason: 'امروز ارسال شده است' };
    var cur = now.getHours() * 60 + now.getMinutes();
    if (cur < tm.h * 60 + tm.m) return { due: false, reason: 'هنوز به ساعت ' + U.toFa(n.time) + ' نرسیده' };
    /* فرکانس */
    var lastAt = n.lastSent ? new Date(n.lastSent) : null;
    var daysSince = lastAt ? Math.floor((now - lastAt) / 86400000) : 999;
    if (n.frequency === 'daily') {
      if (lastAt && U.dayKey(lastAt) === todayKey) return { due: false, reason: 'امروز ارسال شده است' };
    } else if (n.frequency === 'weekly') {
      var wd = (now.getDay() + 1) % 7; /* شنبه = ۰ */
      if (wd !== (n.weekday == null ? 6 : n.weekday)) return { due: false, reason: 'روز هفته مطابق نیست' };
      if (daysSince < 6) return { due: false, reason: 'کمتر از یک هفته از ارسال قبل گذشته' };
    } else if (n.frequency === 'biweekly') {
      if (daysSince < 13) return { due: false, reason: 'دوره‌ی دو هفته‌ای کامل نشده' };
    } else if (n.frequency === 'monthly') {
      var jm = U.jalali(now).jd;
      if (jm !== (n.dayOfMonth == null ? 1 : n.dayOfMonth)) return { due: false, reason: 'روز ماه مطابق نیست' };
      if (daysSince < 27) return { due: false, reason: 'دوره‌ی ماهانه کامل نشده' };
    }
    return { due: true, reason: 'زمان ارسال رسیده است' };
  }
  function nextDue(now) {
    now = now || new Date();
    var n = S.db.notify, tm = parseTime(n.time);
    var d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), tm.h, tm.m, 0, 0);
    if (n.frequency === 'daily') {
      if (d <= now || U.dayKey(d) === U.dayKey(n.lastSent || 0)) d.setDate(d.getDate() + 1);
    } else if (n.frequency === 'weekly') {
      var target = n.weekday == null ? 6 : n.weekday;
      while (((d.getDay() + 1) % 7) !== target || d <= now) d.setDate(d.getDate() + 1);
    } else if (n.frequency === 'biweekly') {
      while (d <= now) d.setDate(d.getDate() + 1);
      if (n.lastSent) {
        var min = new Date(new Date(n.lastSent).getTime() + 13 * 86400000);
        while (d < min) d.setDate(d.getDate() + 1);
      }
    } else {
      var day = n.dayOfMonth == null ? 1 : n.dayOfMonth;
      var guard = 0;
      while (U.jalali(d).jd !== day || d <= now) { d.setDate(d.getDate() + 1); if (guard++ > 400) break; }
    }
    return d;
  }
  function markSent(channel, target, ok, detail) {
    var n = S.db.notify;
    n.lastSent = Date.now();
    n.lastSentDay = U.dayKey();
    n.history = n.history || [];
    n.history.unshift({ at: Date.now(), channel: channel || n.channel, target: target || n.target, ok: ok !== false, detail: detail || '' });
    if (n.history.length > 50) n.history.length = 50;
    S.save();
  }

  /* ---------- کانال‌ها ---------- */
  function channelLabel(ch) {
    return {
      email: 'ایمیل', whatsapp: 'واتساپ', sms: 'پیامک', telegram: 'تلگرام',
      browser: 'اعلان مرورگر', webhook: 'وبهوک/بات', copy: 'کپی متن', emailjs: 'ایمیل خودکار (EmailJS)'
    }[ch] || ch;
  }
  function buildLink(channel, target, subject, body) {
    var enc = encodeURIComponent;
    switch (channel) {
      case 'email':
        return 'mailto:' + enc(target || '') + '?subject=' + enc(subject || 'گزارش فروش') + '&body=' + enc(body);
      case 'whatsapp': {
        var digits = String(U.toEn(target || '')).replace(/[^\d]/g, '');
        return 'https://wa.me/' + digits + '?text=' + enc(body);
      }
      case 'sms': {
        var d2 = String(U.toEn(target || '')).replace(/[^\d+]/g, '');
        return 'sms:' + d2 + '?&body=' + enc(body);
      }
      case 'telegram': {
        var tg = String(target || '').replace(/^@/, '');
        return tg ? ('https://t.me/' + tg) : ('https://t.me/share/url?url=' + enc('https://t.me') + '&text=' + enc(body));
      }
      default: return '';
    }
  }
  /* ارسال از راه ایمیل خودکار (EmailJS — رایگان، بدون سرور) */
  function sendViaEmailJS(rep, cfg, text) {
    return new Promise(function (res, rej) {
      if (!cfg || !cfg.serviceId || !cfg.templateId || !cfg.publicKey) {
        return rej(new Error('تنظیمات EmailJS کامل نیست (Service ID، Template ID و Public Key لازم است)'));
      }
      var payload = {
        service_id: cfg.serviceId,
        template_id: cfg.templateId,
        user_id: cfg.publicKey,
        template_params: {
          to_email: cfg.to || (S.db.notify.target || ''),
          shop_name: rep.shop.name, subject: cfg.subject || ('گزارش فروش ' + rep.shop.name),
          report_text: text, report_html: renderHtml(rep),
          revenue: U.group(rep.stats.revenue), profit: U.group(rep.stats.profit),
          orders: rep.stats.orders, low_count: rep.low.length, out_count: rep.out.length
        }
      };
      var xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://api.emailjs.com/api/v1.0/email/send', true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) res(true);
        else rej(new Error('EmailJS: ' + xhr.status + ' ' + xhr.responseText));
      };
      xhr.onerror = function () { rej(new Error('خطای شبکه در ارسال ایمیل (اتصال اینترنت و صحت کلیدها را بررسی کنید)')); };
      xhr.send(JSON.stringify(payload));
    });
  }
  function sendViaWebhook(rep, url, text) {
    return new Promise(function (res, rej) {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onload = function () { (xhr.status >= 200 && xhr.status < 300) ? res(true) : rej(new Error('وبهوک: کد ' + xhr.status)); };
      xhr.onerror = function () { rej(new Error('خطای شبکه در وبهوک')); };
      xhr.send(JSON.stringify({
        shop: rep.shop.name, at: rep.at, range: rep.range.label,
        revenue: rep.stats.revenue, profit: rep.stats.profit, orders: rep.stats.orders,
        low: rep.low.map(function (p) { return p.name; }), out: rep.out.map(function (p) { return p.name; }),
        stockValue: rep.stock.value, text: text
      }));
    });
  }
  function notifyBrowser(rep, text) {
    return new Promise(function (res) {
      if (!root.Notification) return res(false);
      var fire = function () {
        try {
          new root.Notification('گزارش فروش ' + rep.shop.name, { body: text.slice(0, 240), dir: 'rtl', lang: 'fa' });
          res(true);
        } catch (e) { res(false); }
      };
      if (root.Notification.permission === 'granted') fire();
      else if (root.Notification.requestPermission) root.Notification.requestPermission().then(function (p) { p === 'granted' ? fire() : res(false); });
      else res(false);
    });
  }

  /* ارسال با کانال تنظیم‌شده */
  function send(opt) {
    opt = opt || {};
    var rep = opt.report || buildReport(S.db.notify.frequency || 'daily');
    var text = renderText(rep);
    var n = S.db.notify;
    var channel = opt.channel || n.channel;
    var target = opt.target || n.target;
    var subject = 'گزارش ' + (rep.shop.name || 'فروشگاه') + ' — ' + U.jDate(rep.at);

    return notifyBrowser(rep, text).catch(function () { return false; }).then(function () {
      switch (channel) {
        case 'browser':
          markSent(channel, '', true);
          return { ok: true, mode: 'native', message: 'اعلان مرورگر ارسال شد' };
        case 'copy':
          return U.copy(text).then(function () {
            markSent(channel, '', true);
            return { ok: true, mode: 'native', message: 'متن گزارش کپی شد' };
          });
        case 'emailjs':
          return sendViaEmailJS(rep, n.emailjs || {}, text).then(function () {
            markSent(channel, target, true);
            return { ok: true, mode: 'api', message: 'ایمیل گزارش ارسال شد' };
          });
        case 'webhook':
          return sendViaWebhook(rep, target, text).then(function () {
            markSent(channel, target, true);
            return { ok: true, mode: 'api', message: 'وبهوک با موفقیت فراخوانی شد' };
          });
        default: {
          var link = buildLink(channel, target, subject, text);
          markSent(channel, target, true, 'لینک آماده شد');
          return { ok: true, mode: 'link', link: link, text: text, message: 'آماده‌ی ارسال در ' + channelLabel(channel) };
        }
      }
    });
  }

  /* ---------- زمان‌سنج پس‌زمینه ---------- */
  var timer = null, lastChecked = 0;
  function start(intervalMs) {
    stop();
    var tick = function () {
      var now = new Date();
      var d = isDue(now);
      if (d.due) {
        var n = S.db.notify;
        var mode = n.channel;
        var auto = (mode === 'emailjs' || mode === 'webhook' || mode === 'browser' || mode === 'copy');
        if (auto) {
          send({}).then(function (r) {
            U.toast('گزارش خودکار ارسال شد (' + channelLabel(mode) + ')', 'ok', 4000);
          }).catch(function (e) {
            U.toast('ارسال خودکار ناموفق بود: ' + e.message + ' — متن گزارش کپی شد تا دستی بفرستید.', 'err', 6000);
            markSent(mode, n.target, false, e.message);
          });
        } else if (n.time && n.autoOpen !== false) {
          /* کانال‌های لینکی: پنجره‌ی ارسال را باز کن */
          U.toast('زمان گزارش رسیده است — پنجره‌ی ارسال باز می‌شود', 'info', 4000);
          send({}).then(function (r) {
            if (r.link) { try { root.open(r.link, '_blank'); } catch (e) { } }
          });
        }
      }
      lastChecked = Date.now();
      if (Shop.dash && Shop.dash.refreshNotifyStatus) Shop.dash.refreshNotifyStatus();
    };
    timer = setInterval(tick, intervalMs || 60000);
    setTimeout(tick, 4000);
    return timer;
  }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }

  Shop.notify = {
    rangeFor: rangeFor, buildReport: buildReport, renderText: renderText, renderHtml: renderHtml,
    parseTime: parseTime, isDue: isDue, nextDue: nextDue, markSent: markSent,
    channelLabel: channelLabel, buildLink: buildLink,
    send: send, sendViaEmailJS: sendViaEmailJS, sendViaWebhook: sendViaWebhook, notifyBrowser: notifyBrowser,
    start: start, stop: stop,
    get lastChecked() { return lastChecked; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
