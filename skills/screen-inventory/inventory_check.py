#!/usr/bin/env python3
"""Инвентарь экрана: считает, из чего собран кадр, и сравнивает с порогами (скилл screen-inventory, 23.10).

Зачем: «грязно» — это не вкус, а несогласованность, и она считается. Критик и дизайнер раньше ставили ✓
от руки; здесь считает скрипт. Режим Б (✓ Влад 23.10): таблица идёт Владу всегда, экран не возвращается
автоматически — пороги калибруются по живым экранам.

Запуск:
  inventory_check.py <inventory.json> [--profile mobile-card|desktop-table|desktop-dense]
                     [--premium] [--layered] [--thresholds <path>] [--md out.md]
Вход — JSON из inventory.js (обход кадра через use_figma). Профиль — из карты композиции экрана.
Пороги: --thresholds <path>; иначе 03-design/thresholds.json проекта (ищется вверх от cwd и от JSON);
иначе thresholds.json плагина рядом со скриптом.
Выход — markdown-таблица «показатель · факт · порог · ✓/✗ · где» + списки находок. Код выхода всегда 0.

Показатели:
  weights        — сколько весов шрифта (Regular / Medium / Bold …)
  sizes          — сколько кеглей (округление до 0.5)
  size_contrast  — самый крупный кегль / основной (кегль с наибольшим числом знаков); 0.7.6
  Стиль (веса, кегли, цвета, радиусы, тени, обводки, % без переменной) считается без узлов внутри экземпляров DS.
  greys          — сколько нейтральных цветов текста (хрома ≤ порога)
  text_colors    — сколько цветов текста всего
  radius_classes — классы радиусов: 0 · малый (≤ 6) · средний (7–14) · крупный (15–28) · пилюля/круг
                   (считается, сколько разных значений внутри классов; пилюля = r ≥ min(w,h)/2)
  accent_hues    — сколько ненейтральных оттенков заливок (кластер по тону ±N°), картинки не считаются
  shadow_nodes   — узлов с внешней тенью
  double_dress   — узлов, у которых одновременно тень + обводка (две «одежды»)
  stroke_weights — сколько толщин обводок
  same_pair_run  — самая длинная серия подряд одинаковых пар «заголовок + подпись»
  clone_siblings — самая длинная группа соседних блоков с одинаковой структурой (карточки-клоны)
  heroes         — крупных образов (картинка / эллипс со стороной ≥ hero_min_side)
  primary_buttons— залитых акцентом кнопок во всю ширину (первичные действия)
  control_rows   — ряды контролов (кнопки/чипы/табы) с разной высотой
  unbound_pct    — доля заливок/радиусов без привязки к переменной
"""
import json
import math
import sys
from collections import Counter, defaultdict

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')  # Windows-консоль в cp1255 ломает кириллицу и ✓

HERE = __file__.rsplit('/', 1)[0] if '/' in __file__ else __file__.rsplit('\\', 1)[0]


# ---------- цвет ----------
def hex_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def srgb_lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def oklch(h):
    r, g, b = (srgb_lin(c) for c in hex_rgb(h))
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l, m, s = (x ** (1 / 3) if x > 0 else 0 for x in (l, m, s))
    L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s
    a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s
    bb = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
    C = math.hypot(a, bb)
    H = (math.degrees(math.atan2(bb, a)) + 360) % 360
    return L, C, H


# ---------- помощники ----------
def solid(fills):
    for f in fills or []:
        if f.get('kind') == 'solid' and f.get('a', 1) > 0.05:
            return f
    return None


def has_image(fills):
    return any(f.get('kind') in ('image', 'gradient') for f in fills or [])


def radius_class(r, w, h):
    if isinstance(r, list):
        r = max(r)
    if r is None or r <= 0:
        return None
    if w and h and r >= min(w, h) / 2 - 0.5:
        return 'pill'
    if r <= 6:
        return 'small'
    if r <= 14:
        return 'mid'
    return 'large'


def is_control(n, names):
    nm = (n.get('name') or '').lower()
    return any(k in nm for k in names)


def rows_by_y(nodes, tol=6):
    """группирует узлы по абсолютному y (одна строка = пересечение по вертикали)."""
    rows = []
    for n in sorted(nodes, key=lambda z: z['y'] or 0):
        for row in rows:
            if abs((row[0]['y'] or 0) - (n['y'] or 0)) <= tol:
                row.append(n)
                break
        else:
            rows.append([n])
    return rows


# ---------- расчёт ----------
def analyze(data, th):
    nodes = data['nodes']
    frame = data['frame']
    byid = {n['id']: n for n in nodes}
    all_texts = [n for n in nodes if n['type'] == 'TEXT' and n.get('size')]
    all_shapes = [n for n in nodes if n['type'] in ('FRAME', 'RECTANGLE', 'ELLIPSE', 'COMPONENT', 'INSTANCE', 'VECTOR', 'GROUP')]
    # 0.7.6: экземпляр DS (INSTANCE) — один блок; его стиль и всё внутри — забота сборщика DS, в показатели стиля не входит.
    in_ds = set()
    for n in nodes:
        a = n
        while a is not None:
            if a['type'] == 'INSTANCE':
                in_ds.add(n['id']); break
            a = byid.get(a['parent']) if a.get('parent') else None
    texts = [n for n in all_texts if n['id'] not in in_ds]
    shapes = [n for n in all_shapes if n['id'] not in in_ds]
    where = defaultdict(list)
    where['_ds'] = [f'{len(in_ds)} узлов внутри экземпляров DS ({len([n for n in nodes if n["type"] == "INSTANCE" and n.get("parent") not in in_ds])} экз.) — стиль не считается; вопросы к ним — сборщику DS']

    # веса / кегли
    weights = Counter(t['weight'] for t in texts if t.get('weight'))
    sizes = Counter(round(t['size'] * 2) / 2 for t in texts)
    for w, c in weights.items():
        where['weights'].append(f'{w}×{c}')
    for s, c in sorted(sizes.items()):
        where['sizes'].append(f'{s:g}×{c}')
    # контраст иерархии (0.7.6): герой / основной; основной — кегль с наибольшим числом знаков, хром не влияет
    by_chars = Counter()
    for tt in all_texts:
        by_chars[round(tt['size'] * 2) / 2] += tt.get('len') or 1
    body = by_chars.most_common(1)[0][0] if by_chars else 0
    hero = max(by_chars) if by_chars else 0
    size_contrast = (hero / body) if body else 0
    where['size_contrast'] = [f'герой {hero:g} / основной {body:g}']

    # цвета текста
    tcols = Counter()
    for t in texts:
        f = solid(t['fills'])
        if f:
            tcols[f['hex']] += 1
    greys = [h for h in tcols if oklch(h)[1] <= th['neutral_chroma_max']]
    where['greys'] = [f'{h}×{tcols[h]}' for h in greys]
    where['text_colors'] = [f'{h}×{c}' for h, c in tcols.most_common()]

    # радиусы
    rvals = defaultdict(set)
    for n in shapes:
        cls = radius_class(n.get('radius'), n.get('w'), n.get('h'))
        if cls and cls != 'pill':
            r = n['radius'] if not isinstance(n['radius'], list) else max(n['radius'])
            rvals[cls].add(r)
        elif cls == 'pill':
            rvals['pill'].add('pill')
    radius_classes = sum(len(v) for v in rvals.values())
    where['radius_classes'] = [f'{k}: {sorted(v, key=str)}' for k, v in rvals.items()]

    # акцентные оттенки заливок (кроме текста и картинок)
    hues = []
    for n in shapes:
        if has_image(n['fills']):
            continue
        f = solid(n['fills'])
        if not f:
            continue
        L, C, H = oklch(f['hex'])
        if C > th['neutral_chroma_max']:
            hues.append((H, f['hex'], n['name']))
    clusters = []
    for H, hx, nm in sorted(hues):
        for cl in clusters:
            if min(abs(cl['h'] - H), 360 - abs(cl['h'] - H)) <= th['hue_cluster_deg']:
                cl['hex'].add(hx); cl['n'] += 1
                break
        else:
            clusters.append({'h': H, 'hex': {hx}, 'n': 1, 'name': nm})
    where['accent_hues'] = [f"{round(c['h'])}° {sorted(c['hex'])[:3]}×{c['n']}" for c in clusters]

    # тени, одежда, обводки
    shadow_nodes = [n for n in shapes if any(e['type'] == 'DROP_SHADOW' for e in n.get('effects', []))]
    double = [n for n in shadow_nodes if solid(n.get('strokes'))]
    strokew = Counter(n['strokeW'] for n in shapes if solid(n.get('strokes')) and n.get('strokeW'))
    where['shadow_nodes'] = [n['name'] for n in shadow_nodes][:8]
    where['double_dress'] = [n['name'] for n in double][:8]
    where['stroke_weights'] = [f'{k}px×{v}' for k, v in strokew.items()]

    # серия одинаковых пар «заголовок + подпись»
    pairs = []
    ts = sorted(all_texts, key=lambda t: (t['y'] or 0, -(t['x'] or 0)))
    for a, b in zip(ts, ts[1:]):
        if a['size'] and b['size'] and a['size'] > b['size'] and 0 <= (b['y'] or 0) - (a['y'] or 0) <= a['size'] * 2.2:
            pairs.append((round(a['size']), a.get('weight'), round(b['size']), b.get('weight'), a['y']))
    best_run, run, prev = 0, 0, None
    for p in pairs:
        key = p[:4]
        run = run + 1 if key == prev else 1
        prev = key
        best_run = max(best_run, run)
    where['same_pair_run'] = [f'{p[0]}/{p[1]} + {p[2]}/{p[3]} @y{p[4]:.0f}' for p in pairs][:6]

    # блоки-клоны: соседние дети одного родителя с одинаковой сигнатурой структуры
    clone_max, clone_where = 0, []
    kids = defaultdict(list)
    for n in nodes:
        if n['parent'] and n['parent'] not in in_ds and n['type'] in ('FRAME', 'INSTANCE', 'COMPONENT', 'GROUP') and n['children'] >= 2:
            kids[n['parent']].append(n)
    for pid, ks in kids.items():
        sig = Counter(k['sig'] for k in ks)
        for s, c in sig.items():
            if c > clone_max:
                clone_max, clone_where = c, [f"{byid[pid]['name']} → {c}×[{s}]"]
    where['clone_siblings'] = clone_where

    # герои
    heroes = [n for n in nodes if (n['type'] == 'ELLIPSE' or has_image(n['fills'])) and n.get('w') and min(n['w'], n['h']) >= th['hero_min_side']]
    where['heroes'] = [f"{n['name']} {n['w']:.0f}×{n['h']:.0f}" for n in heroes]

    # первичные кнопки
    prim = []
    for n in all_shapes:
        if not is_control(n, th['control_names']):
            continue
        f = solid(n['fills'])
        if f and oklch(f['hex'])[1] > th['neutral_chroma_max'] and n.get('w') and n['w'] >= frame['w'] * 0.6:
            prim.append(n)
        elif f and oklch(f['hex'])[0] < 0.3 and n.get('w') and n['w'] >= frame['w'] * 0.6:
            prim.append(n)  # чёрная/тёмная во всю ширину — тоже первичная
    where['primary_buttons'] = [n['name'] for n in prim]

    # ряды контролов разной высоты
    ctrls = [n for n in all_shapes if is_control(n, th['control_names']) and n.get('h') and 24 <= n['h'] <= 80]
    bad_rows = []
    for row in rows_by_y(ctrls):
        hs = {round(n['h']) for n in row}
        if len(row) >= 2 and max(hs) - min(hs) > th['control_row_height_tol']:
            bad_rows.append(f"y{row[0]['y']:.0f}: {sorted(hs)}")
    where['control_rows'] = bad_rows

    # --- гейты недобора и плотности (0.6.1, из ресерча 23.10: Taste rules.mjs, Hallmark gates 77/79, app-screens.md) ---
    # пустота кадра: доля площади, не занятой содержимым (текст, картинка, цветная заливка ≠ фону)
    bg = solid(byid[frame['id']]['fills']) if frame['id'] in byid else None
    bg_hex = bg['hex'] if bg else None
    content = []
    for n in nodes:
        if n['type'] == 'TEXT' or has_image(n['fills']):
            content.append(n); continue
        f = solid(n['fills'])
        if f and f['hex'] != bg_hex and n['type'] != 'FRAME' or (f and f['hex'] != bg_hex and n['type'] == 'FRAME' and n['children'] == 0):
            content.append(n)
    cell = 8
    gw, gh = max(1, int(frame['w'] // cell)), max(1, int(frame['h'] // cell))
    grid = bytearray(gw * gh)
    for n in content:
        if n['x'] is None or not n['w']:
            continue
        x0, y0 = max(0, int(n['x'] // cell)), max(0, int(n['y'] // cell))
        x1, y1 = min(gw, int((n['x'] + n['w']) // cell) + 1), min(gh, int((n['y'] + n['h']) // cell) + 1)
        for yy in range(y0, y1):
            grid[yy * gw + x0:yy * gw + x1] = b'\x01' * (x1 - x0)
    void_pct = round(100 * (1 - sum(grid) / len(grid)))
    # разрывы: самый большой вертикальный зазор между соседними строками содержимого (без таббара снизу)
    rows_y = sorted({int(n['y']) for n in content if n['y'] is not None and n['h']} | {int(n['y'] + n['h']) for n in content if n['y'] is not None and n['h']})
    occ = [False] * (gh + 1)
    for n in content:
        if n['y'] is None or not n['h']:
            continue
        for yy in range(max(0, int(n['y'] // cell)), min(gh, int((n['y'] + n['h']) // cell) + 1)):
            occ[yy] = True
    gap_max, run, gap_at = 0, 0, 0
    first = next((i for i, o in enumerate(occ) if o), 0)
    last = max((i for i, o in enumerate(occ) if o), default=0)
    for i in range(first, last + 1):
        if not occ[i]:
            run += 1
            if run > gap_max:
                gap_max, gap_at = run, (i - run + 1) * cell
        else:
            run = 0
    blank_gap = gap_max * cell
    where['void_pct'] = [f'{void_pct}% кадра без содержимого']
    where['blank_gap'] = [f'{blank_gap}px @y{gap_at}'] if blank_gap else []

    # ведущая цифра: самый крупный числовой текст ≥ 1.3× следующего числового
    nums = sorted({round(t['size']) for t in all_texts if any(ch.isdigit() for ch in (t.get('text') or ''))}, reverse=True)
    lead_ratio = round(nums[0] / nums[1], 2) if len(nums) >= 2 else (9.9 if nums else 0)
    where['lead_ratio'] = [f'числа: {nums[:4]}']

    # иконки в кружках: эллипс ≤ 56 с одним ребёнком-иконкой
    icon_chips = [n for n in nodes if n['type'] == 'ELLIPSE' and n.get('w') and n['w'] <= 56]
    circ = [n for n in nodes if n['type'] in ('FRAME', 'INSTANCE') and n.get('w') and n['w'] <= 56 and n.get('h') and abs(n['w'] - n['h']) < 2
            and radius_class(n.get('radius'), n['w'], n['h']) == 'pill' and n['children'] == 1 and not has_image(n['fills']) and solid(n['fills'])]
    icon_chips = icon_chips + circ
    where['icon_chips'] = [n['name'] for n in icon_chips][:8]

    # высота строк списка: у самой длинной группы клонов — разброс и диапазон
    row_h = None
    if clone_where:
        pid_name = clone_where[0].split(' → ')[0]
        for pid, ks in kids.items():
            if byid[pid]['name'] == pid_name:
                sig_top = Counter(k['sig'] for k in ks).most_common(1)[0][0]
                hs = [k['h'] for k in ks if k['sig'] == sig_top and k.get('h')]
                if hs:
                    row_h = (round(min(hs)), round(max(hs)))
    where['row_h'] = [f'{row_h[0]}–{row_h[1]}px' if row_h else 'списка нет']

    # непривязанные значения
    fillable = [n for n in shapes if solid(n['fills']) and not has_image(n['fills'])]
    unbound = [n for n in fillable if 'fills' not in n.get('bound', [])]
    unbound_pct = round(100 * len(unbound) / len(fillable)) if fillable else 0
    where['unbound_pct'] = [n['name'] for n in unbound][:8]

    facts = {
        'weights': len(weights), 'sizes': len(sizes), 'size_contrast': round(size_contrast, 1),
        'greys': len(greys), 'text_colors': len(tcols), 'radius_classes': radius_classes,
        'accent_hues': len(clusters), 'shadow_nodes': len(shadow_nodes), 'double_dress': len(double),
        'stroke_weights': len(strokew), 'same_pair_run': best_run, 'clone_siblings': clone_max,
        'heroes': len(heroes), 'primary_buttons': len(prim), 'control_rows': len(bad_rows),
        'unbound_pct': unbound_pct,
        'void_pct': void_pct, 'blank_gap': blank_gap, 'lead_ratio': lead_ratio, 'icon_chips': len(icon_chips),
        'row_h': row_h,
    }
    return facts, where


LIMITS = {  # показатель → (ключ порога, направление)
    'weights': ('weights_max', '<='), 'sizes': ('sizes_max', '<='), 'size_contrast': ('size_contrast_min', '>='),
    'greys': ('greys_max', '<='), 'text_colors': ('text_colors_max', '<='), 'radius_classes': ('radius_classes_max', '<='),
    'accent_hues': ('accent_hues_max', '<='), 'shadow_nodes': ('shadow_nodes_max', '<='), 'double_dress': ('double_dress_max', '<='),
    'stroke_weights': ('stroke_weights_max', '<='), 'same_pair_run': ('same_pair_run_max', '<='),
    'clone_siblings': ('clone_siblings_max', '<='), 'heroes': ('heroes_max', '<='), 'primary_buttons': ('primary_buttons_max', '<='),
    'control_rows': (None, '== 0'), 'unbound_pct': ('unbound_pct_max', '<='),
    'void_pct': ('void_pct_max', '<='), 'blank_gap': ('blank_gap_max', '<='), 'lead_ratio': ('lead_ratio_min', '>='),
    'icon_chips': ('icon_chips_max', '<='), 'row_h': ('row_h_range', 'range'),
}

LABELS = {
    'weights': 'веса шрифта', 'sizes': 'кегли', 'size_contrast': 'контраст: герой / основной', 'greys': 'серые текста',
    'text_colors': 'цвета текста', 'radius_classes': 'радиусы (значений)', 'accent_hues': 'акцентные оттенки',
    'shadow_nodes': 'узлов с тенью', 'double_dress': 'тень + обводка на узле', 'stroke_weights': 'толщины обводок',
    'same_pair_run': 'одинаковая пара подряд', 'clone_siblings': 'блоки-клоны подряд', 'heroes': 'крупных образов',
    'primary_buttons': 'первичных кнопок', 'control_rows': 'рядов контролов разной высоты', 'unbound_pct': '% заливок без переменной',
    'void_pct': '% кадра без содержимого (недобор)', 'blank_gap': 'самый большой разрыв, px (недобор)',
    'lead_ratio': 'ведущая цифра / следующая', 'icon_chips': 'иконок в кружках', 'row_h': 'высота строк списка, px',
}


def report(facts, where, prof, profile_name, mods):
    ok_all = True
    lines = [f'## Инвентарь экрана · профиль `{profile_name}`' + (f' + {", ".join(mods)}' if mods else ''), '',
             '| показатель | факт | порог | | где |', '|---|---|---|---|---|']
    for k, (tk, op) in LIMITS.items():
        f = facts[k]
        if tk is None:
            lim, ok = 0, f == 0
        elif op == 'range':
            lim = prof.get(tk)
            if f is None or lim is None:
                ok, f = True, f or '—'
            else:
                ok = lim[0] <= f[0] and f[1] <= lim[1]
                f = f'{f[0]}–{f[1]}'
        else:
            lim = prof[tk]
            ok = f <= lim if op == '<=' else f >= lim
        ok_all &= ok
        mark = '✓' if ok else '✗'
        if op == 'range':
            shown = f'{lim[0]}–{lim[1]}' if lim else '—'
            if not lim:
                mark = '·'
        else:
            shown = '—' if (tk and lim >= 99) else (f'{op} {lim}' if tk else '= 0')
            if tk and lim >= 99:
                mark = '·'
        lines.append(f'| {LABELS[k]} | {f} | {shown} | {mark} | {"; ".join(map(str, where.get(k, [])))[:160]} |')
    lines += ['', f"**Внутри DS:** {'; '.join(where.get('_ds', []))}."]
    lines += ['', f'**Итог:** {"в порогах" if ok_all else "есть превышения — см. ✗"}. Режим Б: таблица идёт Владу вместе с экраном; '
              'превышение — не возврат, а строка в отчёте с объяснением дизайнера (почему оправдано) или правкой.']
    return '\n'.join(lines)


def main(argv):
    if len(argv) < 2 or argv[1] in ('-h', '--help'):
        print(__doc__); return 0
    path = argv[1]
    profile = 'mobile-card'
    mods, md_out, th_path = [], None, None
    i = 2
    while i < len(argv):
        a = argv[i]
        if a == '--profile':
            profile = argv[i + 1]; i += 1
        elif a == '--premium':
            mods.append('premium')
        elif a == '--layered':
            mods.append('layered')
        elif a == '--thresholds':
            th_path = argv[i + 1]; i += 1
        elif a == '--md':
            md_out = argv[i + 1]; i += 1
        i += 1
    import os
    if not th_path:
        # пороги проекта: 03-design/thresholds.json, ищем вверх от cwd и от папки JSON
        for start in (os.getcwd(), os.path.dirname(os.path.abspath(path))):
            d = start
            while not th_path:
                cand = os.path.join(d, '03-design', 'thresholds.json')
                if os.path.isfile(cand):
                    th_path = cand
                parent = os.path.dirname(d)
                if parent == d:
                    break
                d = parent
            if th_path:
                break
    if not th_path:
        th_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'thresholds.json')
    th = json.load(open(th_path, encoding='utf-8'))
    print(f'Пороги: {th_path}')
    prof = dict(th['profiles'][profile])
    for m in mods:
        mod = dict(th['modifiers'][m])
        by = mod.pop('by_profile', {})
        prof.update(mod)
        prof.update(by.get(profile, {}))
    data = json.load(open(path, encoding='utf-8'))
    if 'error' in data:
        print('ОШИБКА:', data['error']); return 0
    facts, where = analyze(data, {**th, **prof})  # профиль поверх корня: control_row_height_tol и др. лежат в профиле
    text = report(facts, where, prof, profile, mods)
    print(text)
    if md_out:
        open(md_out, 'w', encoding='utf-8').write(text + '\n')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
