#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
palette.py — цветовая анатомия скриншота для Ресерча визуального (В5).
Нужен только Pillow (numpy не нужен). Python 3.8+.

Что делает (по одному скриншоту экрана или кропу):
  * поверхности (фон, карточки, панели) — hex, OKLCH, доля площади, где лежат;
  * нейтрали и «чернила» (текст, линии) — на какой поверхности стоят и контраст WCAG;
  * хроматические цвета (кандидаты в акцент и статусы) — семья тона, доля, места;
  * доли по площади БЕЗ фото (фото определяются автоматически или задаются --exclude);
  * тёмные зоны (таббар, плашки, тёмная тема).

Все координаты во входе и выходе — в pt (пиксели делятся на --scale).
Mobbin iOS отдаёт @3x: scale определяется по ширине автоматически (1170/1179/1290… → 3).

Примеры:
  python palette.py shot.png
  python palette.py shot.png --scale 3 --crop 0,120,393,260 --json out.json
  python palette.py shot.png --exclude 0,90,393,240          # вручную исключить фото
  python palette.py shot.png --pick 40,212 --pick 200,212    # цвет в точке (pt)
  python palette.py shot.png --scan-row 212                  # отрезки цвета вдоль строки: поля, ширины
  python palette.py shot.png --scan-col 196
  python palette.py --pair "#1A1A1A" "#F4F1EC"              # контраст двух цветов
  python palette.py mobbin.webp --mobbin                     # отрезать полосу Mobbin 40 pt снизу
  python palette.py shot.png --text 16,120,300,60            # контраст текста (ядро чернил) и высоты строк
  python palette.py --font Julius-Medium.ttf --font "Inter[opsz,wght].ttf"   # глифы, цифры, штрих по весам

Координаты во всех флагах — в pt исходной картинки (и с --crop тоже).
Фото достраивается до прямоугольника (небо / вода у края фото не уходят в «акцент»); --photo-tiles — по-старому.

Ограничения (честно): кластеры — эвристика; сглаживание текста может дать «лишний серый»
(помечается «возможно сглаживание»); у сжатых webp/jpg hex плавает на 1–3 единицы.
Сомнительное — перепроверять через --pick.
"""
import argparse
import json
import math
import sys
from collections import deque

try:
    from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageStat
except ImportError:  # pragma: no cover
    sys.exit("Нужен Pillow: python -m pip install pillow")

for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        try:
            _stream.reconfigure(encoding="utf-8")
        except Exception:
            pass

# ---------------------------------------------------------------- цвет


def _lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


LIN = [_lin(i) for i in range(256)]


def rel_lum(rgb):
    r, g, b = rgb
    return 0.2126 * LIN[r] + 0.7152 * LIN[g] + 0.0722 * LIN[b]


def contrast(a, b):
    la, lb = rel_lum(a), rel_lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def wcag(ratio):
    """Вердикт по WCAG 2.x: текст 4.5, крупный текст и нетекстовое 3."""
    if ratio >= 4.5:
        return "AA текст"
    if ratio >= 3.0:
        return "AA только крупный / нетекст"
    return "ниже AA"


def oklab(rgb):
    r, g, b = (LIN[v] for v in rgb)
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l_, m_, s_ = (math.copysign(abs(x) ** (1 / 3), x) for x in (l, m, s))
    L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
    A = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
    B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
    return L, A, B


def oklch(rgb):
    L, A, B = oklab(rgb)
    C = math.hypot(A, B)
    H = math.degrees(math.atan2(B, A)) % 360
    return L, C, H


def oklch_str(rgb):
    L, C, H = oklch(rgb)
    if C < 0.005:
        return "oklch(%.1f%% 0 0)" % (L * 100)
    return "oklch(%.1f%% %.3f %.0f)" % (L * 100, C, H)


def hexs(rgb):
    return "#%02X%02X%02X" % tuple(rgb)


def parse_hex(s):
    s = s.strip().lstrip("#")
    if len(s) == 3:
        s = "".join(ch * 2 for ch in s)
    if len(s) != 6:
        raise ValueError("ожидаю #RRGGBB, получил %r" % s)
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def hue_family(rgb):
    L, C, H = oklch(rgb)
    if C < 0.025:
        if C >= 0.008:
            tint = "тёплый" if (H < 120 or H >= 330) else "холодный"
            return "нейтраль (%s оттенок)" % tint
        return "нейтраль"
    for lo, hi, name in (
        (0, 45, "красный"), (45, 80, "оранжевый / терракот"), (80, 115, "жёлтый / охра"),
        (115, 170, "зелёный"), (170, 215, "бирюзовый"), (215, 280, "синий"),
        (280, 320, "фиолетовый"), (320, 360, "розовый"),
    ):
        if lo <= H < hi:
            return name
    return "?"


def is_neutral(rgb):
    return oklch(rgb)[1] < 0.025


def dist_lab(a, b):
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))


# ---------------------------------------------------------------- загрузка

IOS3 = {1125, 1170, 1179, 1206, 1242, 1284, 1290, 1320}
IOS2 = {640, 750, 828, 2880, 2560}  # 2880 / 2560 — веб-скрины @2x


def load_rgb(path):
    im = Image.open(path)
    try:
        im.seek(0)  # анимированные gif / webp — первый кадр
    except Exception:
        pass
    im.load()
    if im.mode in ("I;16", "I;16B", "I;16L", "I", "F"):
        im = im.convert("I").point(lambda v: v * (1 / 256.0)).convert("L")
    if im.mode in ("RGBA", "LA", "PA") or (im.mode == "P" and "transparency" in im.info):
        im = im.convert("RGBA")
        bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
        bg.alpha_composite(im)
        im = bg
    return im.convert("RGB")


def auto_scale(w):
    if w in IOS3:
        return 3, "ширина %d px → iOS @3x" % w
    if w in IOS2:
        return 2, "ширина %d px → @2x" % w
    return 1, "ширина %d px не похожа на @2x/@3x → считаю 1 px = 1 pt (задай --scale, если это не так)" % w


def parse_box(s, scale):
    x, y, w, h = (float(v) for v in s.split(","))
    return (int(round(x * scale)), int(round(y * scale)),
            int(round((x + w) * scale)), int(round((y + h) * scale)))


# ---------------------------------------------------------------- фото


def detect_photo(im, tile, rect=True):
    """Плитки, похожие на фото: много разных цветов и нет двух доминирующих.
    rect=True — область фото достраивается до прямоугольника (см. ниже).
    Возвращает маску 'L' (255 = фото)."""
    W, H = im.size
    q = im.point(lambda v: v & 0xF8)
    cols, rows = (W + tile - 1) // tile, (H + tile - 1) // tile
    flag = [[False] * cols for _ in range(rows)]
    for r in range(rows):
        for c in range(cols):
            box = (c * tile, r * tile, min((c + 1) * tile, W), min((r + 1) * tile, H))
            n = (box[2] - box[0]) * (box[3] - box[1])
            if n < tile * tile // 2:
                continue
            cs = q.crop(box).getcolors(n) or []
            if len(cs) < 24:
                continue
            cs.sort(reverse=True)
            top2 = sum(x[0] for x in cs[:2]) / float(n)
            if top2 < 0.6:
                flag[r][c] = True
    # убрать одиночные плитки (иконки, эмодзи, текст на цвете)
    keep = [[False] * cols for _ in range(rows)]
    for r in range(rows):
        for c in range(cols):
            if not flag[r][c]:
                continue
            nb = 0
            for dr in (-1, 0, 1):
                for dc in (-1, 0, 1):
                    if (dr or dc) and 0 <= r + dr < rows and 0 <= c + dc < cols and flag[r + dr][c + dc]:
                        nb += 1
            keep[r][c] = nb >= 3
    mask = Image.new("L", im.size, 0)
    d = ImageDraw.Draw(mask)
    if not rect:
        for r in range(rows):
            for c in range(cols):
                if keep[r][c]:
                    d.rectangle((c * tile, r * tile, (c + 1) * tile - 1, (r + 1) * tile - 1), fill=255)
        return mask
    # фото — прямоугольник: плоское небо / вода внутри и у края фото плитками не ловятся
    # (мало цветов) и попадают в «акцент» → берём рамку области и дотягиваем край,
    # пока полоса за ним хроматическая и не плоская (продолжение неба / воды, не кнопка и не фон)
    rects = []
    seen = [[False] * cols for _ in range(rows)]
    for r in range(rows):
        for c in range(cols):
            if not keep[r][c] or seen[r][c]:
                continue
            q = deque([(r, c)])
            seen[r][c] = True
            r0 = r1 = r
            c0 = c1 = c
            while q:
                y, x = q.popleft()
                r0, r1, c0, c1 = min(r0, y), max(r1, y), min(c0, x), max(c1, x)
                for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                    if 0 <= ny < rows and 0 <= nx < cols and keep[ny][nx] and not seen[ny][nx]:
                        seen[ny][nx] = True
                        q.append((ny, nx))
            rects.append([r0, r1, c0, c1])
    tint = {}

    def cont(r, c):
        k = (r, c)
        if k not in tint:
            box = (c * tile, r * tile, min((c + 1) * tile, W), min((r + 1) * tile, H))
            st = ImageStat.Stat(im.crop(box))
            mean = tuple(int(round(v)) for v in st.mean)
            tint[k] = oklch(mean)[1] >= 0.025 and max(st.stddev) >= 1.0
        return tint[k]

    def strip_ok(cells):
        cells = list(cells)
        return bool(cells) and sum(1 for rc in cells if cont(*rc)) >= 0.7 * len(cells)

    for rc in rects:
        grown = True
        while grown:
            grown = False
            r0, r1, c0, c1 = rc
            if r0 > 0 and strip_ok((r0 - 1, x) for x in range(c0, c1 + 1)):
                rc[0] -= 1; grown = True
            if r1 < rows - 1 and strip_ok((r1 + 1, x) for x in range(c0, c1 + 1)):
                rc[1] += 1; grown = True
            if c0 > 0 and strip_ok((y, c0 - 1) for y in range(r0, r1 + 1)):
                rc[2] -= 1; grown = True
            if c1 < cols - 1 and strip_ok((y, c1 + 1) for y in range(r0, r1 + 1)):
                rc[3] += 1; grown = True
        r0, r1, c0, c1 = rc
        d.rectangle((c0 * tile, r0 * tile, min((c1 + 1) * tile, W) - 1, min((r1 + 1) * tile, H) - 1), fill=255)
    return mask


# ---------------------------------------------------------------- кластеры

SENTINEL = (3, 1, 2)


def cluster_colors(im, include, thr=0.035, min_share=0.001, min_share_chroma=0.0002):
    """Кластеры цветов внутри маски include (255 = считать)."""
    work = im.copy()
    if include is not None:
        work.paste(SENTINEL, mask=ImageChops.invert(include))
    colors = work.getcolors(work.size[0] * work.size[1])
    colors = [(n, c) for n, c in colors if c != SENTINEL]
    total = sum(n for n, _ in colors)
    if total == 0:
        return [], 0
    # 1) бины 5 бит на канал: сумма, мода
    bins = {}
    for n, c in colors:
        k = (c[0] >> 3, c[1] >> 3, c[2] >> 3)
        b = bins.get(k)
        if b is None:
            bins[k] = [n, n * c[0], n * c[1], n * c[2], c, n]
        else:
            b[0] += n
            b[1] += n * c[0]
            b[2] += n * c[1]
            b[3] += n * c[2]
            if n > b[5]:
                b[4], b[5] = c, n
    # 2) жадное слияние бинов в OKLab
    clusters = []
    for b in sorted(bins.values(), key=lambda x: -x[0]):
        mean = (b[1] / b[0], b[2] / b[0], b[3] / b[0])
        lab = oklab(tuple(int(round(v)) for v in mean))
        best, bd = None, thr
        for cl in clusters:
            d = dist_lab(lab, cl["lab"])
            if d < bd:
                best, bd = cl, d
        if best is None:
            clusters.append({"n": b[0], "s": [b[1], b[2], b[3]], "mode": b[4], "mode_n": b[5], "lab": lab})
        else:
            best["n"] += b[0]
            for i in range(3):
                best["s"][i] += b[1 + i]
            if b[5] > best["mode_n"]:
                best["mode"], best["mode_n"] = b[4], b[5]
    out = []
    for cl in clusters:
        share = cl["n"] / float(total)
        chromatic = math.hypot(cl["lab"][1], cl["lab"][2]) >= 0.025
        if share < (min_share_chroma if chromatic else min_share):
            continue
        out.append({
            "rgb": tuple(cl["mode"]),
            "mean": tuple(int(round(v / cl["n"])) for v in cl["s"]),
            "px": cl["n"],
            "share": share,
            "peak": cl["mode_n"] / float(cl["n"]),
        })
    out.sort(key=lambda x: -x["share"])
    return out, total


def color_mask(im, rgb, include, tol):
    diff = ImageChops.difference(im, Image.new("RGB", im.size, tuple(rgb)))
    r, g, b = diff.split()
    m = ImageChops.lighter(ImageChops.lighter(r, g), b)
    m = m.point(lambda v: 255 if v <= tol else 0)
    if include is not None:
        m = ImageChops.darker(m, include)
    return m


def grid_of(mask, cell):
    W, H = mask.size
    gw, gh = max(1, W // cell), max(1, H // cell)
    small = mask.resize((gw, gh), Image.BOX)
    data = small.get_flattened_data() if hasattr(small, "get_flattened_data") else small.getdata()
    return list(data), gw, gh


def components(vals, gw, gh, thr, cell, scale, limit=6, min_cells=1):
    """Связные области ячеек со значением >= thr → рамки в pt."""
    seen = bytearray(gw * gh)
    boxes = []
    for i, v in enumerate(vals):
        if v < thr or seen[i]:
            continue
        q = deque([i])
        seen[i] = 1
        x0 = x1 = i % gw
        y0 = y1 = i // gw
        cnt = 0
        while q:
            j = q.popleft()
            cnt += 1
            x, y = j % gw, j // gw
            x0, x1, y0, y1 = min(x0, x), max(x1, x), min(y0, y), max(y1, y)
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < gw and 0 <= ny < gh:
                    k = ny * gw + nx
                    if not seen[k] and vals[k] >= thr:
                        seen[k] = 1
                        q.append(k)
        k = cell / float(scale)
        boxes.append((cnt, (round(x0 * k), round(y0 * k), round((x1 - x0 + 1) * k), round((y1 - y0 + 1) * k))))
    boxes = [b for b in boxes if b[0] >= min_cells]
    boxes.sort(key=lambda b: -b[0])
    return [b for _, b in boxes[:limit]], len(boxes)


def between(c, a, b, thr=0.03):
    """c лежит на отрезке a–b в OKLab (признак сглаживания текста)."""
    pa, pb, pc = oklab(a), oklab(b), oklab(c)
    ab = [y - x for x, y in zip(pa, pb)]
    L2 = sum(v * v for v in ab)
    if L2 == 0:
        return False
    t = sum((pc[i] - pa[i]) * ab[i] for i in range(3)) / L2
    if t <= 0.05 or t >= 0.95:
        return False
    proj = [pa[i] + t * ab[i] for i in range(3)]
    return dist_lab(pc, proj) < thr


# ---------------------------------------------------------------- анализ


def analyse(im, scale, include_user, auto_photo=True, cell_pt=4, photo_rect=True):
    W, H = im.size
    cell = max(2, int(round(cell_pt * scale)))
    include = include_user
    photo_mask = None
    photo_boxes, photo_share = [], 0.0
    if auto_photo:
        photo_mask = detect_photo(im, max(8, int(round(8 * scale))), rect=photo_rect)
        inc = ImageChops.invert(photo_mask)
        include = inc if include is None else ImageChops.darker(include, inc)
        pv, gw, gh = grid_of(photo_mask, cell)
        photo_boxes, _ = components(pv, gw, gh, 128, cell, scale, limit=4)
        hist = photo_mask.histogram()
        photo_share = hist[255] / float(W * H)
    if include_user is not None:
        hist = include_user.histogram()
        excl = hist[0] / float(W * H)
    else:
        excl = 0.0

    clusters, total = cluster_colors(im, include)
    if not clusters:
        return {"error": "после исключения фото не осталось пикселей интерфейса"}

    # сглаживание: цвет между двумя более крупными кластерами и «размазанный»
    peaks = sorted(c["peak"] for c in clusters[:6])
    med_peak = peaks[len(peaks) // 2] if peaks else 0
    for i, c in enumerate(clusters):
        c["aa"] = False
        bigger = clusters[:i]
        if c["share"] > 0.08 or len(bigger) < 2:
            continue
        if c["peak"] >= 0.5 * med_peak:
            continue
        for a in range(len(bigger)):
            for b in range(a + 1, len(bigger)):
                if between(c["rgb"], bigger[a]["rgb"], bigger[b]["rgb"]):
                    c["aa"] = True
                    break
            if c["aa"]:
                break

    # маски и сетки — в разрешении 1 px = 1 pt
    tol = 10
    Wp, Hp = max(1, int(round(W / scale))), max(1, int(round(H / scale)))
    cpt = max(2, int(round(cell_pt)))
    area_pt = float(Wp * Hp)
    inc_pt = include.resize((Wp, Hp), Image.BOX) if include is not None else None
    ui_pt = (inc_pt.point(lambda v: 1 if v >= 128 else 0).histogram()[1]) if inc_pt is not None else area_pt
    ui_pt = max(ui_pt, 1)
    for c in clusters:
        m = color_mask(im, c["rgb"], include, tol).resize((Wp, Hp), Image.BOX)
        c["grid"], gw, gh = grid_of(m, cpt)
        big = c["share"] >= 0.03
        c["places"], c["n_places"] = components(c["grid"], gw, gh, 20, cpt, 1, min_cells=4 if big else 1)
        # «чернила» (текст, линии, значки) = тонкие части маски: то, что исчезает при открытии окном 5 pt
        solid = m.point(lambda v: 255 if v >= 100 else 0)
        opened = solid.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5))
        ink = ImageChops.subtract(solid, opened)
        c["ink_share"] = ink.histogram()[255] / float(ui_pt)
        c["ink_grid"], _, _ = grid_of(ink, cpt)
        c["neutral"] = is_neutral(c["rgb"])
        c["family"] = hue_family(c["rgb"])
        c["L"] = oklch(c["rgb"])[0]

    surfaces = [c for c in clusters if c["share"] >= 0.03 and not c["aa"]]
    if not surfaces:
        surfaces = clusters[:1]
    sids = set(id(s) for s in surfaces)

    # на какой поверхности стоят «чернила» каждого цвета (в т.ч. цвета поверхности, если он же текст)
    for c in clusters:
        c["as_ink"] = (id(c) not in sids) or c["ink_share"] >= 0.001
        c["on"] = None
        if not c["as_ink"]:
            continue
        cells = [i for i, v in enumerate(c["ink_grid"]) if v > 0] or [i for i, v in enumerate(c["grid"]) if v > 0]
        best, bs = None, 0
        for s in clusters:
            if s is c or s["share"] < 0.01 or (id(c) not in sids and s["share"] < c["share"] * 1.5):
                continue
            score = sum(s["grid"][i] for i in cells)
            if score > bs:
                best, bs = s, score
        c["on"] = best

    # тёмные зоны
    gray = im.convert("L")
    if include is not None:
        gray = ImageChops.lighter(gray, ImageChops.invert(include))  # исключённое → белое
    gv, gw, gh = grid_of(gray, cell)
    dark_vals = [255 if v < 60 else 0 for v in gv]
    dark_boxes, _ = components(dark_vals, gw, gh, 128, cell, scale, min_cells=6)
    dark_share = sum(1 for v in dark_vals if v) / float(len(dark_vals))

    bg = surfaces[0]
    chroma = [c for c in clusters if not c["neutral"] and not c["aa"]]
    families = {}
    for c in chroma:
        families[c["family"]] = families.get(c["family"], 0) + c["share"]
        c["near_photo"] = any(near(pb, b) for pb in photo_boxes if pb[2] * pb[3] >= 1600 for b in c["places"][:4])

    return {
        "size_px": [W, H], "scale": scale, "size_pt": [round(W / scale), round(H / scale)],
        "photo_share": photo_share, "photo_boxes": photo_boxes, "excluded_share": excl,
        "ui_px": total, "clusters": clusters, "surfaces": surfaces, "bg": bg,
        "chroma": chroma, "families": families,
        "dark_share": dark_share, "dark_boxes": dark_boxes,
        "theme": "тёмная" if bg["L"] < 0.4 else "светлая",
    }


def near(a, b, gap=8):
    """рамки (x, y, w, h) в pt касаются или ближе gap."""
    return not (a[0] + a[2] + gap < b[0] or b[0] + b[2] + gap < a[0] or
                a[1] + a[3] + gap < b[1] or b[1] + b[3] + gap < a[1])


def shift_res(res, ox, oy):
    """координаты мест — обратно в систему исходной картинки (после --crop)."""
    if not (ox or oy) or "error" in res:
        return
    sh = lambda bs: [(b[0] + ox, b[1] + oy, b[2], b[3]) for b in bs]
    res["photo_boxes"] = sh(res["photo_boxes"])
    res["dark_boxes"] = sh(res["dark_boxes"])
    for c in res["clusters"]:
        c["places"] = sh(c["places"])


def fmt_box(b):
    return "x%d y%d %d×%d" % tuple(b)


def report(res):
    if "error" in res:
        print("Ошибка:", res["error"])
        return
    p = print
    p("# Цветовая анатомия")
    p("Размер: %d×%d px → %d×%d pt (scale %s). Тема: %s." % (
        res["size_px"][0], res["size_px"][1], res["size_pt"][0], res["size_pt"][1], res["scale"], res["theme"]))
    p("Фото (авто): %.0f%% площади%s. Исключено вручную: %.0f%%. Доли ниже — от площади интерфейса без фото." % (
        res["photo_share"] * 100,
        (" — " + "; ".join(fmt_box(b) for b in res["photo_boxes"])) if res["photo_boxes"] else "",
        res["excluded_share"] * 100))
    p("")
    p("## Поверхности (≥ 3%)")
    p("| hex | OKLCH | доля | семья | где (pt) |")
    p("|---|---|---|---|---|")
    for s in res["surfaces"]:
        p("| %s | %s | %.1f%% | %s | %s |" % (hexs(s["rgb"]), oklch_str(s["rgb"]), s["share"] * 100, s["family"],
                                            "; ".join(fmt_box(b) for b in s["places"][:3]) + (" …" if s["n_places"] > 3 else "")))
    p("")
    p("## Прочие цвета (текст, линии, значки, мелкие плашки) — контраст к поверхности под ними")
    p("| hex | OKLCH | доля | семья | стоит на | контраст | WCAG | заметка |")
    p("|---|---|---|---|---|---|---|---|")
    sids = set(id(s) for s in res["surfaces"])
    for c in res["clusters"]:
        if not c["as_ink"] or c["on"] is None:
            continue
        on = c["on"]
        r = contrast(c["rgb"], on["rgb"])
        if id(c) in sids and r < 1.5:
            continue  # стык двух поверхностей, а не текст
        note = "возможно сглаживание, проверь --pick" if c["aa"] else ""
        if id(c) in sids:
            note = (note + "; " if note else "") + "это и цвет поверхности"
        p("| %s | %s | %.2f%% | %s | %s | %.2f | %s | %s |" % (
            hexs(c["rgb"]), oklch_str(c["rgb"]), c["share"] * 100, c["family"], hexs(on["rgb"]), r, wcag(r), note))
    p("")
    p("## Хроматика (кандидаты в акцент и статусы)")
    if not res["chroma"]:
        p("Хроматических цветов в интерфейсе нет (цвет, если есть, живёт только в фото).")
    else:
        p("Семей тона: %d — %s." % (len(res["families"]), ", ".join(
            "%s %.1f%%" % (k, v * 100) for k, v in sorted(res["families"].items(), key=lambda x: -x[1]))))
        p("| hex | OKLCH | доля | семья | мест | где (pt) | заметка |")
        p("|---|---|---|---|---|---|---|")
        for c in res["chroma"]:
            p("| %s | %s | %.2f%% | %s | %d | %s | %s |" % (
                hexs(c["rgb"]), oklch_str(c["rgb"]), c["share"] * 100, c["family"], c["n_places"],
                "; ".join(fmt_box(b) for b in c["places"][:4]) + (" …" if c["n_places"] > 4 else ""),
                "у края фото — небо / вода? проверь глазами, при нужде --exclude" if c.get("near_photo") else ""))
        p("Акцент-кандидат: %s (%s). Что это (кнопка, статус, ссылка) — определить глазами по местам." % (
            hexs(res["chroma"][0]["rgb"]), res["chroma"][0]["family"]))
    p("")
    neutral = sum(c["share"] for c in res["clusters"] if c["neutral"] and c["L"] >= 0.5)
    dark = sum(c["share"] for c in res["clusters"] if c["neutral"] and c["L"] < 0.5)
    chrom = sum(c["share"] for c in res["chroma"])
    p("## Доли по площади (без фото)")
    p("Светлые нейтрали %.0f%% · тёмные нейтрали %.0f%% · хроматика %.1f%%." % (neutral * 100, dark * 100, chrom * 100))
    p("")
    p("## Тёмные зоны")
    if res["dark_boxes"]:
        p("%.0f%% площади; крупнейшие: %s" % (res["dark_share"] * 100, "; ".join(fmt_box(b) for b in res["dark_boxes"])))
    else:
        p("Нет.")


def to_json(res):
    if "error" in res:
        return res

    def cl(c):
        return {"hex": hexs(c["rgb"]), "oklch": oklch_str(c["rgb"]), "share": round(c["share"], 4),
                "family": c["family"], "neutral": c["neutral"], "maybe_antialias": c["aa"],
                "ink_share": round(c["ink_share"], 4), "near_photo": c.get("near_photo", False),
                "on": hexs(c["on"]["rgb"]) if c.get("on") else None,
                "contrast_to_on": round(contrast(c["rgb"], c["on"]["rgb"]), 2) if c.get("on") else None,
                "places_pt": c["places"]}
    return {
        "size_px": res["size_px"], "scale": res["scale"], "theme": res["theme"],
        "photo_share": round(res["photo_share"], 3), "photo_boxes_pt": res["photo_boxes"],
        "surfaces": [cl(s) for s in res["surfaces"]],
        "clusters": [cl(c) for c in res["clusters"]],
        "families": {k: round(v, 4) for k, v in res["families"].items()},
        "dark_share": round(res["dark_share"], 3), "dark_boxes_pt": res["dark_boxes"],
    }


# ---------------------------------------------------------------- утилиты замера


def pick(im, x, y, scale):
    """цвет в точке (pt, система im); None — точка вне картинки."""
    X, Y = int(round(x * scale)), int(round(y * scale))
    if not (0 <= X < im.size[0] and 0 <= Y < im.size[1]):
        return None
    r = max(0, int(scale) // 2)
    box = (max(0, X - r), max(0, Y - r), min(im.size[0], X + r + 1), min(im.size[1], Y + r + 1))
    cs = im.crop(box).getcolors(10000) or [(1, im.getpixel((X, Y)))]
    cs.sort(reverse=True)
    return cs[0][1]


def text_block(im, box, scale):
    """Текстовый блок (box в px): фон = мода кольца вокруг, чернила = «ядро» (самые далёкие от фона
    пиксели, ≥ 85% максимума — без сглаживания), контраст WCAG, строки: высота над базовой, шаг базовых."""
    W, H = im.size
    x0, y0, x1, y1 = max(0, box[0]), max(0, box[1]), min(W, box[2]), min(H, box[3])
    if x1 - x0 < 2 or y1 - y0 < 2:
        return None
    px = im.load()
    ring = {}
    for x in range(max(0, x0 - 4), min(W, x1 + 4)):
        for y in (y0 - 4, y0 - 2, y1 + 1, y1 + 3):
            if 0 <= y < H:
                c = px[x, y]
                ring[c] = ring.get(c, 0) + 1
    for y in range(max(0, y0 - 4), min(H, y1 + 4)):
        for x in (x0 - 4, x0 - 2, x1 + 1, x1 + 3):
            if 0 <= x < W:
                c = px[x, y]
                ring[c] = ring.get(c, 0) + 1
    if not ring:
        return None
    bg = max(ring, key=ring.get)
    pts, maxd = [], 0.0
    for y in range(y0, y1):
        for x in range(x0, x1):
            c = px[x, y]
            dd = math.sqrt(sum((a - b) ** 2 for a, b in zip(c, bg)))
            maxd = max(maxd, dd)
            pts.append((dd, c, y))
    if maxd < 20:
        return None
    core = [p for p in pts if p[0] >= 0.85 * maxd]
    ink = tuple(int(round(sum(p[1][i] for p in core) / len(core))) for i in range(3))
    rows = {}
    for dd, _, y in pts:
        if dd >= 0.5 * maxd:
            rows[y] = rows.get(y, 0) + 1
    ys = sorted(rows)
    lines, cur = [], [ys[0]]
    for y in ys[1:]:
        if y - cur[-1] > max(2, int(scale)):
            lines.append(cur)
            cur = [y]
        else:
            cur.append(y)
    lines.append(cur)
    out = []
    for L in lines:
        prof = [rows.get(y, 0) for y in range(L[0], L[-1] + 1)]
        mx = max(prof)
        base = L[0] + max(i for i, v in enumerate(prof) if v >= 0.25 * mx)
        out.append((L[0], L[-1], base))
    hmax = max(b - t for t, b, _ in out)
    out = [l for l in out if (l[1] - l[0]) >= 0.25 * hmax]
    return {"bg": bg, "ink": ink, "contrast": contrast(ink, bg),
            "lines": [((base - t + 1) / scale, base / scale) for t, b, base in out],
            "pitch": [(out[i + 1][2] - out[i][2]) / scale for i in range(len(out) - 1)]}


def scan(im, pos, scale, axis):
    """Отрезки одного цвета вдоль строки (axis='row') или столбца — для замера полей и ширин."""
    W, H = im.size
    p = int(round(pos * scale))
    if axis == "row":
        p = min(max(p, 0), H - 1)
        line = [im.getpixel((x, p)) for x in range(W)]
    else:
        p = min(max(p, 0), W - 1)
        line = [im.getpixel((p, y)) for y in range(H)]
    segs = []
    start, cur = 0, line[0]
    for i in range(1, len(line) + 1):
        if i == len(line) or max(abs(a - b) for a, b in zip(line[i], cur)) > 12:
            segs.append([start, i, cur])
            if i < len(line):
                start, cur = i, line[i]
    # склеить отрезки короче 1 pt (сглаживание)
    merged = []
    for s in segs:
        if merged and (s[1] - s[0]) < scale:
            merged[-1][1] = s[1]
        else:
            merged.append(s)
    return [((a / scale), (b / scale), c) for a, b, c in merged]


# ---------------------------------------------------------------- шрифт

NEED = "אבגדהוזחטיכךלמםנןסעפףצץקרשת־0123456789₪%.,:;/·–—…×׳״()"


def stem_em(path, wght=None):
    """толщина вертикального штриха / кегль (em), Pillow: медиана тёмных отрезков в середине глифа."""
    from PIL import ImageFont
    f = ImageFont.truetype(path, 1000)
    if wght is not None:
        vals = []
        for a in f.get_variation_axes():
            n = a.get("name", b"")
            n = n.decode("utf-8", "ignore") if isinstance(n, bytes) else str(n)
            vals.append(max(a["minimum"], min(a["maximum"], wght)) if n.lower().startswith("weight") or n == "wght" else a["default"])
        f.set_variation_by_axes(vals)
    for ch in "lוI1":
        im = Image.new("L", (1400, 1400), 255)
        ImageDraw.Draw(im).text((200, 1100), ch, font=f, fill=0, anchor="ls")
        b = ImageChops.invert(im).getbbox()
        if not b:
            continue
        px, ym, runs = im.load(), (b[1] + b[3]) // 2, []
        for y in range(ym - 15, ym + 15):
            run = 0
            for x in range(b[0], b[2] + 2):
                if px[x, y] < 128:
                    run += 1
                elif run:
                    runs.append(run)
                    run = 0
        if runs:
            runs.sort()
            return runs[len(runs) // 2] / 1000.0, ch
    return None, None


def font_check(path, need, sizes=(15, 17, 24)):
    print("# Шрифт: %s" % path)
    try:
        import logging
        from fontTools.ttLib import TTFont
        logging.getLogger("fontTools").setLevel(logging.ERROR)
    except ImportError:
        TTFont = None
        print("fontTools не установлен (python -m pip install fonttools) — покрытие глифов, табличные цифры,"
              " кернинг и оси пропущены; штрих считаю Pillow.")
    axes = {}
    if TTFont:
        try:
            f = TTFont(path, lazy=True)
        except Exception as e:
            print("Не читается как TTF / OTF: %s (скачался HTML вместо шрифта? woff2 — сначала распаковать)\n" % e)
            return
        cmap = f.getBestCmap() or {}
        axes = {a.axisTag: (a.minValue, a.defaultValue, a.maxValue) for a in f["fvar"].axes} if "fvar" in f else {}
        print("Имя: %s · глифов в cmap: %d · usWeightClass: %s · оси: %s" % (
            f["name"].getDebugName(4), len(cmap), f["OS/2"].usWeightClass if "OS/2" in f else "?",
            ", ".join("%s %g–%g" % (k, v[0], v[2]) for k, v in axes.items()) or "нет"))
        miss = sorted(set(ch for ch in need if not ch.isspace() and ord(ch) not in cmap), key=need.index)
        print("Нет из нужных (%d из %d): %s" % (len(miss), len(set(need)), " ".join(miss) or "—"))
        lat = sum(1 for o in range(0x41, 0x5B) if o in cmap)
        print("Латиница A–Z: %d / 26 · ₪: %s" % (lat, "есть" if 0x20AA in cmap else "НЕТ"))
        if all(ord(d) in cmap for d in "0123456789"):
            ws = set(f["hmtx"][cmap[ord(d)]][0] for d in "0123456789")
            print("Цифры: %s" % ("равной ширины (табличные по умолчанию)" if len(ws) == 1 else "пропорциональные, ширины %s" % sorted(ws)))
        feats = set()
        for t in ("GPOS", "GSUB"):
            if t in f and f[t].table.FeatureList:
                feats |= set(r.FeatureTag for r in f[t].table.FeatureList.FeatureRecord)
        print("Кернинг: %s · фичи: %s" % ("есть" if ("kern" in f or "kern" in feats) else "НЕТ",
                                         " ".join(sorted(feats)) or "нет"))
    try:
        if "wght" in axes or (not TTFont and "[" in path):
            lo, hi = axes.get("wght", (100, 400, 900))[0::2]
            print("Штрих по весам (вариативный; для подбора веса партнёра под штрих шрифта проекта):")
            for w in range(int(math.ceil(lo / 100.0) * 100), int(hi) + 1, 100):
                r, ch = stem_em(path, w)
                print("  %d: штрих %.3f em (%s) · при %s pt ≈ %s pt" % (
                    w, r, ch, "/".join(map(str, sizes)), " / ".join("%.2f" % (r * z) for z in sizes)))
        else:
            r, ch = stem_em(path)
            print("Штрих: %.3f em (по «%s») · при %s pt ≈ %s pt — иконку подбирать к этому штриху (research-assets)" % (
                r, ch, "/".join(map(str, sizes)), " / ".join("%.2f" % (r * z) for z in sizes)))
    except Exception as e:  # pragma: no cover
        print("Штрих не измерен: %s" % e)
    print("")


# ---------------------------------------------------------------- main


def main(argv=None):
    ap = argparse.ArgumentParser(description="Цветовая анатомия скриншота (Pillow, без numpy). "
                                 "Все координаты (--crop, --exclude, --pick, --scan-*, --text) — в pt исходной картинки.")
    ap.add_argument("image", nargs="?")
    ap.add_argument("--scale", default="auto", help="px на pt: auto | 1 | 2 | 3")
    ap.add_argument("--mobbin", action="store_true", help="отрезать снизу полосу Mobbin 40 pt (#2F2F2F, «curated by Mobbin») у image_url")
    ap.add_argument("--crop", help="x,y,w,h в pt — анализировать только эту область")
    ap.add_argument("--exclude", action="append", default=[], help="x,y,w,h в pt — исключить (фото, карта); можно много раз")
    ap.add_argument("--no-auto-photo", action="store_true", help="не искать фото автоматически")
    ap.add_argument("--photo-tiles", action="store_true", help="фото — только пёстрые плитки, без достройки до прямоугольника (старое поведение)")
    ap.add_argument("--cell", type=float, default=4, help="ячейка сетки для мест и фона, pt (по умолчанию 4)")
    ap.add_argument("--json", help="сохранить результат в JSON")
    ap.add_argument("--pick", action="append", default=[], help="x,y в pt — цвет в точке")
    ap.add_argument("--scan-row", type=float, action="append", default=[], help="y в pt — отрезки цвета вдоль строки")
    ap.add_argument("--scan-col", type=float, action="append", default=[], help="x в pt — отрезки цвета вдоль столбца")
    ap.add_argument("--text", action="append", default=[], help="x,y,w,h в pt — текстовый блок: фон, чернила (ядро), контраст WCAG, высота строк, шаг базовых")
    ap.add_argument("--pair", nargs=2, metavar=("FG", "BG"), help="контраст двух hex")
    ap.add_argument("--font", action="append", default=[], help="TTF / OTF — проверка шрифта: глифы, ₪, цифры, кернинг (fontTools), штрих по весам (Pillow)")
    ap.add_argument("--need", default=NEED, help="символы, которые должны быть в шрифте (для --font); по умолчанию иврит, цифры, ₪ и знаки")
    a = ap.parse_args(argv)

    for fp in a.font:
        font_check(fp, a.need)
    if a.pair:
        fg, bg = parse_hex(a.pair[0]), parse_hex(a.pair[1])
        r = contrast(fg, bg)
        print("%s на %s: %.2f:1 — %s | %s · %s" % (hexs(fg), hexs(bg), r, wcag(r), oklch_str(fg), oklch_str(bg)))
    if not a.image:
        if a.pair or a.font:
            return 0
        ap.error("нужен файл картинки, --pair или --font")

    im = load_rgb(a.image)
    if a.scale == "auto":
        scale, why = auto_scale(im.size[0])
    else:
        scale, why = float(a.scale), "задан вручную"
        if scale == int(scale):
            scale = int(scale)
    print("scale = %s (%s)" % (scale, why))
    if a.mobbin:
        cut = int(round(40 * scale))
        if im.size[1] > cut * 4:
            im = im.crop((0, 0, im.size[0], im.size[1] - cut))
            print("--mobbin: снизу отрезано %d px (40 pt)" % cut)

    ox = oy = 0.0
    if a.crop:
        box = parse_box(a.crop, scale)
        box = (max(0, box[0]), max(0, box[1]), min(im.size[0], box[2]), min(im.size[1], box[3]))
        if box[2] - box[0] < 2 or box[3] - box[1] < 2:
            sys.exit("--crop вне картинки")
        im = im.crop(box)
        ox, oy = box[0] / float(scale), box[1] / float(scale)

    def xy(s_):
        x, y = (float(v) for v in s_.split(","))
        return x - ox, y - oy

    def rbox(s_):
        x, y, w, h = (float(v) for v in s_.split(","))
        return parse_box("%s,%s,%s,%s" % (x - ox, y - oy, w, h), scale)

    for s_ in a.pick:
        x, y = xy(s_)
        c = pick(im, x, y, scale)
        if c is None:
            print("pick %s pt → вне картинки%s" % (s_, " (кропа)" if a.crop else ""))
            continue
        print("pick %s pt → %s %s (%s)" % (s_, hexs(c), oklch_str(c), hue_family(c)))
    for y in a.scan_row:
        print("строка y=%s pt:" % y)
        for s0, s1, c in scan(im, y - oy, scale, "row"):
            print("  %6.1f–%6.1f pt (%5.1f)  %s" % (s0 + ox, s1 + ox, s1 - s0, hexs(c)))
    for x in a.scan_col:
        print("столбец x=%s pt:" % x)
        for s0, s1, c in scan(im, x - ox, scale, "col"):
            print("  %6.1f–%6.1f pt (%5.1f)  %s" % (s0 + oy, s1 + oy, s1 - s0, hexs(c)))
    for s_ in a.text:
        t = text_block(im, rbox(s_), scale)
        if t is None:
            print("text %s pt → текста не видно (или вне картинки)" % s_)
            continue
        print("text %s pt → чернила %s на %s: %.2f:1 — %s" % (s_, hexs(t["ink"]), hexs(t["bg"]), t["contrast"], wcag(t["contrast"])))
        for i, (hgt, base) in enumerate(t["lines"]):
            print("  строка %d: высота над базовой %.1f pt (кегль ≈ %.0f, если это цифры / заглавные ≈ 0.7 кегля) · базовая y %.1f" % (
                i + 1, hgt, hgt / 0.7, base + oy))
        if t["pitch"]:
            print("  шаг базовых (высота строки): %s pt" % " / ".join("%.1f" % v for v in t["pitch"]))
    if a.pick or a.scan_row or a.scan_col or a.text:
        return 0

    include = None
    if a.exclude:
        include = Image.new("L", im.size, 255)
        d = ImageDraw.Draw(include)
        for e in a.exclude:
            b = rbox(e)
            d.rectangle((b[0], b[1], b[2] - 1, b[3] - 1), fill=0)

    res = analyse(im, scale, include, auto_photo=not a.no_auto_photo, cell_pt=a.cell, photo_rect=not a.photo_tiles)
    shift_res(res, ox, oy)
    if a.crop:
        print("Кроп: x%g y%g — координаты ниже в системе исходной картинки." % (ox, oy))
    report(res)
    if a.json:
        with open(a.json, "w", encoding="utf-8") as f:
            json.dump(to_json(res), f, ensure_ascii=False, indent=1)
        print("\nJSON → %s" % a.json)
    return 0


if __name__ == "__main__":
    sys.exit(main())
