#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ساخت نسخه‌ی تک‌فایلی (single-file) از سایت، برای اجرای بدون آپلود یا پیش‌نمایش سریع.

خروجی‌ها:
  shop/single-store.html   ← فروشگاه مشتریان (index.html + CSS + JS به‌صورت درون‌خطی)
  shop/single-admin.html   ← پنل مدیر
اجرا:  python3 tools/build-single.py
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def read(p):
    with open(os.path.join(ROOT, p), 'r', encoding='utf-8') as f:
        return f.read()

def inline(html):
    def css_sub(m):
        href = m.group(1)
        if href.startswith(('http://', 'https://', '//')):
            return m.group(0)
        return '<style>\n' + read(href) + '\n</style>'
    html = re.sub(r'<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>', lambda m: css_sub(m), html)

    def js_sub(m):
        src = m.group(1)
        if src.startswith(('http://', 'https://', '//')):
            return m.group(0)
        code = read(src)
        # جلوگیری از بسته‌شدن زودهنگام تگ script
        code = code.replace('</script', '<\\/script')
        return '<script>\n/* ==== ' + src + ' ==== */\n' + code + '\n</script>'
    html = re.sub(r'<script[^>]*src="([^"]+)"[^>]*>\s*</script>', lambda m: js_sub(m), html)

    # حذف manifest و آیکن‌های بیرونی (در نسخه‌ی تک‌فایلی لازم نیست)
    html = re.sub(r'<link[^>]*rel="manifest"[^>]*>\s*', '', html)
    html = re.sub(r'<link[^>]*rel="(icon|apple-touch-icon)"[^>]*>\s*', '', html)
    # Service Worker در نسخه‌ی تک‌فایلی غیرفعال می‌شود
    html = html.replace("UI.initOffline();", "/* نسخه‌ی تک‌فایلی: Service Worker غیرفعال است */")
    return html

def build(src, dst, title, note):
    if not os.path.exists(os.path.join(ROOT, src)):
        print('⚠️  پیدا نشد:', src)
        return
    html = inline(read(src))
    head_end = html.index('</head>')   # فقط هد سند اصلی (نه رشته‌های داخل کدهای JS)
    html = html[:head_end] + '  <meta name="generator" content="build-single.py — نسخه‌ی تک‌فایلی">\n' + html[head_end:]
    banner = ('<!-- ✂️ این فایل به‌صورت خودکار از %s ساخته شده است (نسخه‌ی تک‌فایلی).\n'
              '     %s\n'
              '     برای ساخت مجدد: python3 tools/build-single.py -->\n') % (src, note)
    html = html.replace('<!DOCTYPE html>', '<!DOCTYPE html>\n' + banner, 1)
    with open(os.path.join(ROOT, dst), 'w', encoding='utf-8') as f:
        f.write(html)
    print('✅ %-22s %8.1f کیلوبایت' % (dst, os.path.getsize(os.path.join(ROOT, dst)) / 1024))

if __name__ == '__main__':
    print('ساخت نسخه‌های تک‌فایلی…')
    build('index.html', 'single-store.html', 'فروشگاه مشتریان', 'بدون نیاز به سرور؛ فقط روی فایل دوبار کلیک کنید.')
    build('admin.html', 'single-admin.html', 'پنل مدیر', 'بدون نیاز به سرور؛ فقط روی فایل دوبار کلیک کنید.')
    print('تمام.')
