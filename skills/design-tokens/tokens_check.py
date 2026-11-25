#!/usr/bin/env python3
"""Проверка tokens.json команды Дизайна.

Чеки:
  SOURCE   — у каждого токена есть непустое поле "source" (откуда значение);
  STOCK    — значение цвета не совпадает (Δ по каналу < 8) со стоковыми hex
             Tailwind / Material / Bootstrap / Google / чистых CSS;
  PURE     — нет 100 %-насыщенных «чистых» hex (#FF0000 и т. п.);
  CONTRAST — пары из "pairs" проходят WCAG AA (text 4.5, large 3, ui 3).

Плюс утилиты OKLCH для построения шкал:
  tokens_check.py tokens.json            — все чеки, код выхода 1 при нарушениях
  tokens_check.py --oklch '#063168'      — hex → oklch(L C H)
  tokens_check.py --hex 0.32 0.11 262    — oklch → hex (с клипом в sRGB)
  tokens_check.py --ratio '#063168' '#FFFFFF'

Формат tokens.json (минимум):
{
  "color": {
    "primitive": {"navy-900": {"value": "#063168", "source": "бренд заказчика"}},
    "semantic":  {"accent/fill": {"value": "{navy-900}", "source": "...", "use": "..."}}
  },
  "pairs": [["ink/1", "surface/page", "text"]],
  "type": {...}, "space": {...}, "radius": {...}   # у каждого листа value + source
}
Ссылка "{name}" разрешается сначала в semantic, потом в primitive.
"""
import json
import math
import sys

if hasattr(sys.stdout, "reconfigure"):  # Windows cp1255 / cp1251: печатать в UTF-8 и с python -I
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

STOCK = """
0000FF FF0000 00FF00 FFA500 808080
60A5FA 3B82F6 2563EB 818CF8 6366F1 4F46E5 A78BFA 8B5CF6 7C3AED 34D399 10B981 059669
4ADE80 22C55E 16A34A FBBF24 F59E0B D97706 F87171 EF4444 DC2626 F472B6 EC4899 2DD4BF
14B8A6 38BDF8 0EA5E9 64748B 94A3B8 475569 334155 1E293B 0F172A F1F5F9 E2E8F0 CBD5E1
6B7280 9CA3AF 4B5563 374151 1F2937 111827 F3F4F6 E5E7EB D1D5DB
2196F3 1976D2 4CAF50 F44336 FF9800 9C27B0 3F51B5 009688 FFEB3B 607D8B 795548
0D6EFD DC3545 198754 FFC107 6C757D 0DCAF0
4285F4 1A73E8 34A853 EA4335 FBBC05
""".split()
MIN_RATIO = {"text": 4.5, "large": 3.0, "ui": 3.0}


def hex_rgb(h):
    h = h.strip().lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def lin(c):
    c /= 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def ratio(a, b):
    la = sum(k * lin(v) for k, v in zip((0.2126, 0.7152, 0.0722), hex_rgb(a)))
    lb = sum(k * lin(v) for k, v in zip((0.2126, 0.7152, 0.0722), hex_rgb(b)))
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def to_oklch(h):
    r, g, b = (lin(v) for v in hex_rgb(h))
    l = (0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b) ** (1 / 3)
    m = (0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b) ** (1 / 3)
    s = (0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b) ** (1 / 3)
    L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s
    A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s
    B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
    return L, math.hypot(A, B), math.degrees(math.atan2(B, A)) % 360


def from_oklch(L, C, H):
    A, B = C * math.cos(math.radians(H)), C * math.sin(math.radians(H))
    l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3
    m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3
    s = (L - 0.0894841775 * A - 1.2914855480 * B) ** 3
    rgb = (4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
           -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
           -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)

    def enc(c):
        c = min(max(c, 0.0), 1.0)
        c = 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055
        return round(c * 255)
    return "#" + "".join(f"{enc(c):02X}" for c in rgb)


def leaves(node, path=""):
    if isinstance(node, dict) and "value" in node:
        yield path, node
    elif isinstance(node, dict):
        for k, v in node.items():
            yield from leaves(v, f"{path}.{k}" if path else k)


def main(path):
    data = json.load(open(path, encoding="utf-8"))
    prim = data.get("color", {}).get("primitive", {})
    sem = data.get("color", {}).get("semantic", {})

    def resolve(v, depth=0):
        if isinstance(v, str) and v.startswith("{") and depth < 8:
            name = v.strip("{}")
            tok = sem.get(name) or prim.get(name)
            if tok is None:
                raise KeyError(v)
            return resolve(tok["value"], depth + 1)
        return v

    issues = []
    for p, tok in leaves({k: v for k, v in data.items() if k not in ("pairs", "meta")}):
        if not str(tok.get("source", "")).strip():
            issues.append(f"SOURCE: {p} — нет источника")
        if p.startswith("color."):
            try:
                v = resolve(tok["value"])
            except KeyError as e:
                issues.append(f"REF: {p} → {e} не найден")
                continue
            if not (isinstance(v, str) and v.startswith("#")):
                continue
            rgb = hex_rgb(v)
            for s in STOCK:
                if all(abs(a - b) < 8 for a, b in zip(rgb, hex_rgb(s))):
                    issues.append(f"STOCK: {p} = {v} ≈ #{s} (библиотечный дефолт)")
                    break
            if max(rgb) == 255 and min(rgb) == 0:
                issues.append(f"PURE: {p} = {v} (100 % насыщенность)")
    for fg, bg, kind in data.get("pairs", []):
        try:
            a, b = resolve(sem[fg]["value"]), resolve(sem[bg]["value"])
        except KeyError as e:
            issues.append(f"PAIR: {fg} / {bg} — нет токена {e}")
            continue
        r = ratio(a, b)
        need = MIN_RATIO.get(kind, 4.5)
        mark = "ok " if r >= need else "FAIL"
        print(f"{mark} {fg} on {bg}: {r:.2f}:1 (нужно {need}, {kind})")
        if r < need:
            issues.append(f"CONTRAST: {fg} on {bg} = {r:.2f}:1 < {need}")
    print("\n".join(issues) if issues else "LINT: чисто")
    return 1 if issues else 0


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a:
        print(__doc__)
        sys.exit(2)
    if a[0] == "--oklch":
        L, C, H = to_oklch(a[1])
        print(f"oklch({L:.3f} {C:.3f} {H:.1f})")
    elif a[0] == "--hex":
        print(from_oklch(*map(float, a[1:4])))
    elif a[0] == "--ratio":
        print(f"{ratio(a[1], a[2]):.2f}:1")
    else:
        sys.exit(main(a[0]))
