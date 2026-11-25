#!/usr/bin/env python3
"""Шлагбаум сдачи экрана критику (скилл design-screen, §2 шаг 9; идея — Stageshow --gate, ✓ Влад 07.11).

Дизайнер не отдаёт экран критику, пока записка не прошла проверку. Скрипт проверяет форму записки,
а не вкус: что все разделы заполнены, каждый ✗ инвентаря закрыт, все пять диагнозов названы,
картинка «рядом с донором» существует, записаны отступления от донора и проверка «чужое убрано», и «Не проверено» не пустое.

Запуск:
  handover_check.py <экран>-handover.md [--inventory <таблица .md из inventory_check --md>]
Выход: список нарушений и код 1, или «сдача разрешена» и код 0.
"""
import os
import re
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

SECTIONS = ['Донор', 'Рядом с донором', 'Отступил от донора', 'Чужое убрано', 'Что поменял', 'Инвентарь ✗', 'Диагнозы',
            'Проверено', 'Не проверено', 'Где сомневаюсь']
DIAGNOSES = ['перегружено', 'вайрфрейм', 'в коробке', 'плоско', 'пресно']
BAD_REASONS = ['так в рефе', 'как в рефе', 'красивее', 'так красивее']
IMG_EXT = ('.png', '.jpg', '.jpeg', '.webp')


def split_sections(text):
    text = re.sub(r'<!--.*?-->', '', text, flags=re.S)
    out, cur = {}, None
    for line in text.splitlines():
        m = re.match(r'^##\s+(.+?)\s*$', line)
        if m:
            cur = m.group(1)
            out[cur] = []
        elif cur is not None and line.strip():
            out[cur].append(line.strip())
    return out


def find_file(rel, note_dir):
    rel = rel.strip().strip('`')
    d = note_dir
    while True:
        cand = os.path.join(d, rel)
        if os.path.isfile(cand):
            return cand
        parent = os.path.dirname(d)
        if parent == d:
            return None
        d = parent


def failed_metrics(inv_path):
    labels = []
    for line in open(inv_path, encoding='utf-8'):
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        if len(cells) >= 4 and cells[3] == '✗':
            labels.append(cells[0])
    return labels


def main(argv):
    if len(argv) < 2 or argv[1] in ('-h', '--help'):
        print(__doc__)
        return 0
    note = argv[1]
    inv = argv[argv.index('--inventory') + 1] if '--inventory' in argv else None
    errs = []
    text = open(note, encoding='utf-8').read()
    note_dir = os.path.dirname(os.path.abspath(note))
    secs = split_sections(text)

    for s in SECTIONS:
        if s not in secs:
            errs.append(f'нет раздела «## {s}»')
        elif not secs[s]:
            errs.append(f'раздел «{s}» пуст')
    for s, lines in secs.items():
        for ln in lines:
            if re.search(r'<[^<>]{1,80}>', ln):
                errs.append(f'«{s}»: не заполнено — {ln[:90]}')

    # картинка рядом с рефом
    imgs = re.findall(r'[\w./\\-]+(?:' + '|'.join(re.escape(e) for e in IMG_EXT) + ')',
                      ' '.join(secs.get('Рядом с донором', [])), flags=re.I)
    if 'Рядом с донором' in secs:
        if not imgs:
            errs.append('«Рядом с донором»: нет пути к картинке (.png / .jpg)')
        for p in imgs:
            if not find_file(p, note_dir):
                errs.append(f'«Рядом с донором»: файл не найден — {p}')

    # диагнозы: все пять, каждый «нет» или «починил»
    dlines = secs.get('Диагнозы', [])
    for d in DIAGNOSES:
        line = next((l for l in dlines if re.match(r'^[-*]?\s*' + re.escape(d) + r'\s*:', l, flags=re.I)), None)
        if not line:
            errs.append(f'«Диагнозы»: не назван «{d}»')
            continue
        val = line.split(':', 1)[1].strip().lower()
        if not (val.startswith('нет') or 'починил' in val):
            errs.append(f'«Диагнозы»: «{d}» — нужно «нет» или «был → починил: …», сейчас: {val[:60]}')

    # инвентарь: каждый ✗ закрыт
    ilines = secs.get('Инвентарь ✗', [])
    for ln in ilines:
        low = ln.lower()
        if 'оправдано' in low and any(b in low for b in BAD_REASONS):
            errs.append(f'«Инвентарь ✗»: «так в рефе / красивее» — не причина: {ln[:90]}')
    if inv:
        if not os.path.isfile(inv):
            errs.append(f'таблица инвентаря не найдена: {inv}')
        else:
            for lab in failed_metrics(inv):
                hit = [l for l in ilines if lab.lower() in l.lower()
                       and ('починил' in l.lower() or 'оправдано' in l.lower())]
                if not hit:
                    errs.append(f'«Инвентарь ✗»: ✗ «{lab}» не закрыт строкой «починил / оправдано»')
    else:
        print('Внимание: без --inventory ✗ инвентаря не сверены с таблицей.')

    if errs:
        print('Сдача НЕ разрешена — исправить и запустить снова:')
        for e in errs:
            print(' ✗', e)
        return 1
    print('сдача разрешена')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
