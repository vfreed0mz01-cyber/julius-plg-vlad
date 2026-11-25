// inventory.js — обход кадра экрана в Figma (скилл screen-inventory, 23.10).
// Запуск: вставить в use_figma целиком, в конце заменить FRAME_ID. Возвращает JSON-строку:
// её сохранить как 04-critic/inventory/<экран>.json и прогнать inventory_check.py.
// Ничего не меняет в файле — только читает.
// Кадр не на текущей странице → перед вызовом: await figma.setCurrentPageAsync(<страница кадра>)
// (getNodeById синхронный и в режиме dynamic-page видит только загруженные страницы).
//
// Что собирает по каждому узлу: тип, имя, bbox (абсолютный), радиус, заливки (цвет/картинка/градиент),
// обводка, эффекты (тени), auto-layout, привязки к переменным; у текста — кегль, вес, цвет, длина.
// Mixed-значения текста берутся по первому символу (getRange*).

function inventory(frameId) {
  const root = figma.getNodeById(frameId);
  if (!root) return JSON.stringify({ error: 'node not found: ' + frameId });

  const hex = (c) => '#' + [c.r, c.g, c.b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('').toUpperCase();

  const paints = (p) => {
    if (!Array.isArray(p)) return [{ kind: 'mixed' }];
    return p.filter(x => x.visible !== false).map(x => {
      if (x.type === 'SOLID') return { kind: 'solid', hex: hex(x.color), a: x.opacity == null ? 1 : +x.opacity.toFixed(2) };
      if (x.type === 'IMAGE') return { kind: 'image' };
      if (x.type.startsWith('GRADIENT')) return { kind: 'gradient', stops: (x.gradientStops || []).map(s => hex(s.color)) };
      return { kind: x.type.toLowerCase() };
    });
  };

  const radius = (n) => {
    if ('cornerRadius' in n && n.cornerRadius !== figma.mixed) return n.cornerRadius;
    if ('topLeftRadius' in n) return [n.topLeftRadius, n.topRightRadius, n.bottomRightRadius, n.bottomLeftRadius];
    return null;
  };

  const bound = (n) => {
    const b = n.boundVariables || {};
    return Object.keys(b).filter(k => b[k] && (Array.isArray(b[k]) ? b[k].length : true));
  };

  const out = [];
  const rb = root.absoluteBoundingBox || { x: 0, y: 0, width: root.width, height: root.height };
  const walk = (n, depth, parentId) => {
    if (n.visible === false) return;
    const bb = n.absoluteBoundingBox;
    const rec = {
      id: n.id, type: n.type, name: n.name, depth, parent: parentId,
      x: bb ? +(bb.x - rb.x).toFixed(1) : null, y: bb ? +(bb.y - rb.y).toFixed(1) : null,
      w: bb ? +bb.width.toFixed(1) : null, h: bb ? +bb.height.toFixed(1) : null,
      opacity: 'opacity' in n ? +n.opacity.toFixed(2) : 1,
      radius: radius(n),
      fills: 'fills' in n ? paints(n.fills) : [],
      strokes: 'strokes' in n ? paints(n.strokes) : [],
      strokeW: 'strokeWeight' in n && n.strokeWeight !== figma.mixed ? n.strokeWeight : null,
      effects: 'effects' in n ? n.effects.filter(e => e.visible !== false).map(e => ({ type: e.type, r: e.radius || 0, hex: e.color ? hex(e.color) : null, a: e.color ? +e.color.a.toFixed(2) : null })) : [],
      layout: 'layoutMode' in n ? n.layoutMode : null,
      gap: 'itemSpacing' in n ? n.itemSpacing : null,
      pad: 'paddingTop' in n ? [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft] : null,
      bound: bound(n),
      children: 'children' in n ? n.children.filter(c => c.visible !== false).length : 0,
      sig: 'children' in n ? n.children.filter(c => c.visible !== false).map(c => c.type[0] + (c.type === 'TEXT' ? 't' : '')).join('') : '',
    };
    if (n.type === 'TEXT') {
      const len = n.characters.length;
      rec.len = len;
      rec.text = n.characters.slice(0, 40);
      rec.size = n.fontSize !== figma.mixed ? n.fontSize : (len ? n.getRangeFontSize(0, 1) : null);
      const fn = n.fontName !== figma.mixed ? n.fontName : (len ? n.getRangeFontName(0, 1) : null);
      rec.font = fn ? fn.family : null;
      rec.weight = fn ? fn.style : null;
      rec.lh = n.lineHeight !== figma.mixed && n.lineHeight && n.lineHeight.unit === 'PIXELS' ? n.lineHeight.value : null;
      rec.align = n.textAlignHorizontal;
      rec.style = n.textStyleId && n.textStyleId !== figma.mixed ? (figma.getStyleById(n.textStyleId) || {}).name || null : null;
    }
    out.push(rec);
    if ('children' in n) n.children.forEach(c => walk(c, depth + 1, n.id));
  };
  walk(root, 0, null);
  return JSON.stringify({ frame: { id: root.id, name: root.name, w: root.width, h: root.height }, nodes: out });
}

return inventory('FRAME_ID');
