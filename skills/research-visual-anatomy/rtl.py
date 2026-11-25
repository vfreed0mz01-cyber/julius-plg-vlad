# rtl.py (скилл research-visual-anatomy; из запуска В Mayors, 30.09).
# Простой рендер RTL-строки из «прогонов» без raqm: прогоны в логическом порядке,
# каждый — (текст, шрифт, цвет[, трекинг_em]). Иврит внутри прогона разворачивается,
# LTR-прогоны (цифры, латиница, ₪) рисуются как есть. Кладутся справа налево по общей базовой линии.
# Зачем: Pillow без libraqm рисует иврит задом наперёд. Пример:
#   from rtl import draw_rtl
#   draw_rtl(d, x_right=380, base=60, runs=[('שולם עד כה ', f_he, ink), ({'ltr': [('₪', f_lat, ink), ('1,250,000', f_he, ink)]})])
#   (dict {'ltr': [...]} — LTR-группа внутри RTL-строки: сумма, латиница; прогон — (текст, шрифт, цвет[, трекинг_em]))
# Если в Pillow есть raqm (features.check('raqm') → True, типично Linux / macOS), он сам развернёт иврит
# ещё раз → шрифты грузить с layout_engine=ImageFont.Layout.BASIC (или брать font() ниже).
import sys
if hasattr(sys.stdout, "reconfigure"):  # Windows: печатать в UTF-8
    sys.stdout.reconfigure(encoding="utf-8")
import re
from PIL import ImageFont
HEB = re.compile(r'[֐-׿]')


def font(path, size):
    """шрифт для rtl.py: всегда базовая раскладка (без raqm), иначе иврит развернётся дважды."""
    return ImageFont.truetype(path, size, layout_engine=ImageFont.Layout.BASIC)

def is_rtl(t):
    return bool(HEB.search(t))

def vis(t):
    # развернуть ивритский прогон; вложенные числа внутри него сохранить LTR
    if not is_rtl(t):
        # чисто нейтральный прогон (пробелы, точки, ₪) в RTL-потоке — разворачиваем
        return t if re.search(r'[A-Za-z0-9]', t) else t[::-1]
    parts = re.findall(r'[0-9][0-9,.%:\-]*[0-9%]?|[^0-9]+', t)
    out = []
    for p in reversed(parts):
        out.append(p if re.match(r'[0-9]', p) else p[::-1])
    s = ''.join(out)
    # зеркальные скобки
    return s.translate(str.maketrans('()', ')('))

def run_width(text, f, track=0.0):
    t = vis(text)
    if not track:
        return f.getlength(t)
    return sum(f.getlength(ch) for ch in t) + track * f.size * (len(t) - 1)

def draw_run(d, x_left, base, text, f, fill, track=0.0):
    t = vis(text)
    if not track:
        d.text((x_left, base), t, font=f, fill=fill, anchor='ls')
        return
    x = x_left
    for ch in t:
        d.text((x, base), ch, font=f, fill=fill, anchor='ls')
        x += f.getlength(ch) + track * f.size

def draw_rtl(d, x_right, base, runs):
    """runs: [(text, font, fill, track?)] в логическом порядке. Возвращает левую границу."""
    x = x_right
    for r in runs:
        if isinstance(r, dict):  # LTR-группа внутри RTL-строки
            w = sum(run_width(q[0], q[1], q[3] if len(q) > 3 else 0.0) for q in r['ltr'])
            x -= w
            draw_ltr(d, x, base, r['ltr'])
            continue
        text, f, fill = r[0], r[1], r[2]
        track = r[3] if len(r) > 3 else 0.0
        w = run_width(text, f, track)
        x -= w
        draw_run(d, x, base, text, f, fill, track)
    return x

def draw_ltr(d, x_left, base, runs):
    x = x_left
    for r in runs:
        text, f, fill = r[0], r[1], r[2]
        track = r[3] if len(r) > 3 else 0.0
        draw_run(d, x, base, text, f, fill, track)
        x += run_width(text, f, track)
    return x
