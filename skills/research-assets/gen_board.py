# Доска «наши иконки × наборы» (В6) — образец генератора. Рендер: HTML → Chrome headless → PNG (Pillow — обрезка).
# Запуск: python gen_board.py  (ничего не устанавливает; нужен Chrome или Edge).
# Под проект: скопировать рядом с SVG наборов, поправить FONT (путь к шрифту проекта) и map.json (список иконок × наборы).
import json, os, re, subprocess, sys
if hasattr(sys.stdout, "reconfigure"):  # Windows: печатать в UTF-8
    sys.stdout.reconfigure(encoding="utf-8")

from PIL import Image, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = 'file:///C:/Users/USER/Desktop/vlad/font/v2-equal/dist/'
M = json.load(open(os.path.join(HERE, 'map.json'), encoding='utf8'))
INK, ACC, MUTE, LINE = '#1B1B1B', '#063168', '#6B6B6B', '#E6E6E6'
TB_STROKE, IO_STROKE = 1.75, 1.75


def svg(rel, size=24, stroke=None, color=INK, mirror=False):
    p = os.path.join(HERE, rel.replace('/', os.sep))
    if not os.path.exists(p):
        return None
    s = open(p, encoding='utf8').read()
    s = re.sub(r'<\?xml[^>]*>', '', s)
    s = re.sub(r'\swidth="[^"]*"', '', s, count=1)
    s = re.sub(r'\sheight="[^"]*"', '', s, count=1)
    if stroke is not None:
        s = re.sub(r'stroke-width="[^"]*"', f'stroke-width="{stroke}"', s)
    s = s.replace('<svg', f'<svg width="{size}" height="{size}" style="color:{color};flex:none;{"transform:scaleX(-1);" if mirror else ""}"', 1)
    return s


def cell(icon_html, he, weight=500):
    if icon_html is None:
        return f'<td class="gap"><span class="gapmark">нет в наборе</span></td>'
    return f'<td><div class="ic" dir="rtl">{icon_html}<span class="he" style="font-weight:{weight}">{he}</span></div></td>'


def mir(m):
    # зеркалим на доске только то, что в пакете нарисовано под LTR
    return m['key'] in ('external', 'hub-steps')


RTL_TXT = {'yes': 'зеркалить', 'no': 'нет', 'disputed': 'спорно'}

rows = []
for m in M:
    mr = mir(m)
    ph = svg(f"phosphor/regular/{m['ph']}.svg", mirror=mr) if m['ph'] else None
    tb = svg(f"tabler/outline/{m['tb']}.svg", stroke=TB_STROKE, mirror=mr) if m['tb'] else None
    io = svg(f"iconoir/regular/{m['io']}.svg", stroke=IO_STROKE, mirror=mr) if m['io'] else None
    rtl = RTL_TXT[m['rtl']]
    rows.append(f'''<tr><td class="n">{m['id']}</td><td class="ru"><b>{m['ru']}</b><br><span class="slot">{m['slot']}</span></td>
{cell(ph, m['he'])}{cell(tb, m['he'])}{cell(io, m['he'])}
<td class="rtl {m['rtl']}">{rtl}{' · на доске отражена' if mr else ''}</td></tr>''')


def tabbar(setname):
    tabs = [m for m in M if m['tab']]
    out = []
    for i, m in enumerate(tabs):
        active = i == 0
        if setname == 'ph':
            ic = svg(f"phosphor/fill/{m['ph']}-fill.svg", 26, color=ACC) if active else svg(f"phosphor/regular/{m['ph']}.svg", 26, color=MUTE)
        elif setname == 'tb':
            ic = (svg(f"tabler/filled/{m['tbf']}.svg", 26, color=ACC) if m['tbf'] else None) if active else svg(f"tabler/outline/{m['tb']}.svg", 26, TB_STROKE, MUTE)
        else:
            ic = (svg(f"iconoir/solid/{m['ios']}.svg", 26, color=ACC) if m['ios'] else None) if active else svg(f"iconoir/regular/{m['io']}.svg", 26, IO_STROKE, MUTE)
        if ic is None:
            ic = '<span class="miss">нет заливки</span>'
        out.append(f'<div class="tab {"act" if active else ""}">{ic}<span>{m["he"]}</span></div>')
    return '<div class="tabbar" dir="rtl">' + ''.join(out) + '</div>'


def tabbar_all_filled(setname):
    """Все 4 вкладки в заливке — проверка, есть ли пара у каждой."""
    tabs = [m for m in M if m['tab']]
    out = []
    for m in tabs:
        if setname == 'ph':
            ic = svg(f"phosphor/fill/{m['ph']}-fill.svg", 26, color=ACC)
        elif setname == 'tb':
            ic = svg(f"tabler/filled/{m['tbf']}.svg", 26, color=ACC) if m['tbf'] else None
        else:
            ic = svg(f"iconoir/solid/{m['ios']}.svg", 26, color=ACC) if m['ios'] else None
        if ic is None:
            ic = '<span class="miss">нет</span>'
        out.append(f'<div class="tab act">{ic}<span>{m["he"]}</span></div>')
    return '<div class="tabbar" dir="rtl">' + ''.join(out) + '</div>'


# полоса штрихов: одна иконка (здание) разной толщины рядом со словом Julius
def stroke_strip():
    cells = []
    for lab, html in [
        ('Phosphor Thin 0.75', svg('phosphor/thin/buildings-thin.svg')),
        ('Phosphor Light 1.125', svg('phosphor/light/buildings-light.svg')),
        ('Phosphor Regular 1.5', svg('phosphor/regular/buildings.svg')),
        ('Phosphor Bold 2.25', svg('phosphor/bold/buildings-bold.svg')),
        ('Tabler 1.5', svg('tabler/outline/building-skyscraper.svg', stroke=1.5)),
        ('Tabler 1.75', svg('tabler/outline/building-skyscraper.svg', stroke=1.75)),
        ('Tabler 2 (по умолч.)', svg('tabler/outline/building-skyscraper.svg', stroke=2)),
        ('Iconoir 1.5 (по умолч.)', svg('iconoir/regular/city.svg', stroke=1.5)),
        ('Iconoir 1.75', svg('iconoir/regular/city.svg', stroke=1.75)),
    ]:
        cells.append(f'<div class="sc"><div class="ic" dir="rtl">{html}<span class="he" style="font-weight:300">הנכסים</span></div>'
                     f'<div class="ic" dir="rtl">{html}<span class="he" style="font-weight:500">הנכסים</span></div>'
                     f'<div class="ic" dir="rtl">{html}<span class="he" style="font-weight:700">הנכסים</span></div><div class="cap">{lab}</div></div>')
    return '<div class="strip">' + ''.join(cells) + '</div>'


def status64():
    items = [('glyph-done', 'שולם'), ('glyph-waiting', 'בעיבוד'), ('glyph-action', 'לא בוצע'), ('spinner', 'בודקים…')]
    by = {m['key']: m for m in M}
    out = []
    for setname, lab in [('ph', 'Phosphor Light (≈ 3.0 на 64)'), ('tb', 'Tabler 1.25 (≈ 3.3 на 64)'), ('io', 'Iconoir 1.25 (≈ 3.3 на 64)')]:
        cs = []
        for k, he in items:
            m = by[k]
            if setname == 'ph':
                h = svg(f"phosphor/light/{m['ph']}-light.svg", 64)
            elif setname == 'tb':
                h = svg(f"tabler/outline/{m['tb']}.svg", 64, 1.25) if m['tb'] else None
            else:
                h = svg(f"iconoir/regular/{m['io']}.svg", 64, 1.25) if m['io'] else None
            h = h or '<span class="miss" style="width:64px;height:64px;display:inline-flex;align-items:center;justify-content:center">нет</span>'
            cs.append(f'<div class="s64">{h}<span dir="rtl" class="he" style="font-weight:700;font-size:24px">{he}</span></div>')
        out.append(f'<div class="row64"><div class="cap64">{lab}</div>{"".join(cs)}</div>')
    return ''.join(out)


cov = {}
for s, k in [('ph', 'ph'), ('tb', 'tb'), ('io', 'io')]:
    cov[s] = sum(1 for m in M if m[k])
tabfill = {'ph': 4, 'tb': sum(1 for m in M if m['tab'] and m['tbf']), 'io': sum(1 for m in M if m['tab'] and m['ios'])}

html = f'''<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>
@font-face{{font-family:Julius;font-weight:300;src:url({FONT}Julius-v1-equal-Light.woff2) format("woff2")}}
@font-face{{font-family:Julius;font-weight:500;src:url({FONT}Julius-v1-equal-Medium.woff2) format("woff2")}}
@font-face{{font-family:Julius;font-weight:700;src:url({FONT}Julius-v1-equal-Bold.woff2) format("woff2")}}
body{{margin:0;padding:40px;background:#fff;color:{INK};font-family:"Segoe UI",Arial,sans-serif;width:1400px}}
h1{{font-size:28px;margin:0 0 6px}} h2{{font-size:20px;margin:36px 0 10px}}
.sub{{color:{MUTE};font-size:14px;margin-bottom:8px;line-height:1.45}}
table{{border-collapse:collapse;width:100%}} td,th{{border-bottom:1px solid {LINE};padding:10px 12px;vertical-align:middle;text-align:left}}
th{{font-size:14px;color:{MUTE};font-weight:600}}
.n{{color:{MUTE};font-size:13px;width:24px}} .ru{{font-size:14px;width:330px}} .slot{{color:{MUTE};font-size:12px}}
.ic{{display:flex;align-items:center;gap:8px;justify-content:flex-start}}
.he{{font-family:Julius,"Segoe UI",sans-serif;font-size:17px;line-height:24px;color:{INK}}}
.gap{{background:#FAFAFA}} .gapmark{{color:#A0522D;font-size:13px}}
.rtl{{font-size:13px;width:150px}} .rtl.yes{{color:{ACC};font-weight:600}} .rtl.disputed{{color:#A0522D}}
.tabbars{{display:flex;gap:28px;flex-wrap:wrap}} .tbw{{width:420px}} .tbw .cap{{font-size:14px;margin:8px 0 6px;color:{MUTE}}}
.tabbar{{display:flex;justify-content:space-around;border-top:1px solid {LINE};padding:8px 0 6px;width:390px;background:#fff}}
.tab{{display:flex;flex-direction:column;align-items:center;gap:3px;font-family:Julius,"Segoe UI";font-size:13px;color:{MUTE};font-weight:500;width:90px}}
.tab.act{{color:{ACC};font-weight:700}} .miss{{font-family:"Segoe UI";font-size:11px;color:#A0522D;height:26px;display:flex;align-items:center}}
.strip{{display:flex;gap:14px;flex-wrap:wrap}} .sc{{border:1px solid {LINE};padding:10px 12px;display:flex;flex-direction:column;gap:6px}}
.cap{{font-size:12px;color:{MUTE}}}
.row64{{display:flex;align-items:center;gap:40px;padding:14px 0;border-bottom:1px solid {LINE}}} .cap64{{width:230px;font-size:14px;color:{MUTE}}}
.s64{{display:flex;flex-direction:column;align-items:center;gap:10px;width:150px}}
</style></head><body>
<h1>В6 · Иконки Mayors × 3 набора</h1>
<div class="sub">Базовый стиль С1 «Тёплый журнальный» (белый фон, акцент #063168). Подпись — <b>Julius Medium 17</b> (основной текст мобайла), иконка 24. Штрих Julius (замер по TTF): Light ≈ 0.07 em · Medium ≈ 0.12 em (верт.) / 0.10 (гор.) · Bold ≈ 0.175 em → на 17 px: 1.2 / 2.0–1.75 / 3.0 px.<br>
Phosphor — Regular (штрих 1.5 на 24, фиксирован весом) · Tabler — outline, штрих выставлен 1.75 · Iconoir — regular, штрих выставлен 1.75. Иконки в RTL-ориентации: «назад» → вправо, «вперёд» → влево; «на доске отражена» — отражено из LTR-оригинала.</div>

<h2>1 · Штрих ↔ вес Julius (одна иконка, подписи Light / Medium / Bold 17)</h2>
{stroke_strip()}

<h2>2 · Таббар: активная вкладка — заливка акцентом, остальные — контур</h2>
<div class="tabbars">
<div class="tbw"><div class="cap">И1 Phosphor · Fill + Regular</div>{tabbar('ph')}<div class="cap">все 4 в заливке (пара есть у каждой?)</div>{tabbar_all_filled('ph')}</div>
<div class="tbw"><div class="cap">И2 Tabler · Filled + Outline 1.75</div>{tabbar('tb')}<div class="cap">все 4 в заливке</div>{tabbar_all_filled('tb')}</div>
<div class="tbw"><div class="cap">И3 Iconoir · Solid + Regular 1.75</div>{tabbar('io')}<div class="cap">все 4 в заливке</div>{tabbar_all_filled('io')}</div>
</div>

<h2>3 · Наш список (27) × наборы</h2>
<table><tr><th>#</th><th>Иконка · слот кита</th><th>И1 Phosphor Regular</th><th>И2 Tabler 1.75</th><th>И3 Iconoir 1.75</th><th>RTL</th></tr>
{''.join(rows)}
<tr><td></td><td class="ru"><b>Покрытие</b> (готовая иконка в наборе)</td><td><b>{cov['ph']} / 27</b> · заливка таббара {tabfill['ph']}/4</td><td><b>{cov['tb']} / 27</b> · заливка таббара {tabfill['tb']}/4</td><td><b>24 / 27</b> + 1 замена (PDF → page) · заливка таббара {tabfill['io']}/4</td><td></td></tr>
</table>

<h2>4 · Статус-значок 64 (результат оплаты №10, sheet 39а) + заголовок Julius Bold 24</h2>
{status64()}
</body></html>'''

out_html = os.path.join(HERE, 'board-icons.html')
open(out_html, 'w', encoding='utf8').write(html)

chrome = None
for c in [r'C:\Program Files\Google\Chrome\Application\chrome.exe', r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe']:
    if os.path.exists(c):
        chrome = c
        break
png = os.path.join(HERE, 'board-icons.png')
subprocess.run([chrome, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2',
                '--allow-file-access-from-files', '--window-size=1480,4200', f'--screenshot={png}',
                'file:///' + out_html.replace('\\', '/')], check=True, capture_output=True, timeout=120)
im = Image.open(png).convert('RGB')
bg = Image.new('RGB', im.size, (255, 255, 255))
bb = ImageChops.difference(im, bg).getbbox()
im.crop((0, 0, im.size[0], min(im.size[1], bb[3] + 80))).save(png, optimize=True)
print('ok', png, Image.open(png).size, cov, tabfill)
