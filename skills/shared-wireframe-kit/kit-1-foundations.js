// Wireframe Kit, шаг 1: страница, переменные, текстовые стили.
// Запуск: use_figma в Figma design-файле проекта. Значения переменных — из STATE.md → «Параметры вайрфреймов проекта».
// PARAMS можно переопределить под проект перед запуском.
const PARAMS = {
  marginScreen: 20, gutter: 16, gapInGroup: 12, gapBetweenGroups: 32, touch: 48,
  bodySize: 17, font: 'Heebo',
  // Скругления — нейтральный дефолт вайрфреймов (решение Влада 29.09). Финальные задаёт команда Дизайна по рефам.
  radiusControl: 4, radiusContainer: 8,
  space: [4, 8, 12, 16, 24, 32, 40, 48],
}
const hex = (h) => ({ r: parseInt(h.slice(1, 3), 16) / 255, g: parseInt(h.slice(3, 5), 16) / 255, b: parseInt(h.slice(5, 7), 16) / 255 })
let page = figma.root.children.find(p => p.name === 'Wireframe Kit')
if (!page) { page = figma.createPage(); page.name = 'Wireframe Kit' }
const existing = (await figma.variables.getLocalVariableCollectionsAsync()).find(c => c.name === 'WF')
if (existing) return { error: 'Коллекция WF уже есть — кит уже создан' }
const col = figma.variables.createVariableCollection('WF')
const mode = col.modes[0].modeId
col.renameMode(mode, 'Проект')
const ids = {}
const colors = {
  'color/bg': '#FFFFFF', 'color/surface': '#F2F2F2', 'color/placeholder': '#D9D9D9', 'color/line': '#E3E3E3',
  'color/text-secondary': '#6E6E6E', 'color/text': '#2B2B2B', 'color/action': '#111111', 'color/on-action': '#FFFFFF',
}
for (const [n, v] of Object.entries(colors)) {
  const x = figma.variables.createVariable(n, col, 'COLOR'); x.setValueForMode(mode, hex(v))
  x.scopes = n.startsWith('color/text') || n === 'color/on-action' ? ['TEXT_FILL', 'SHAPE_FILL', 'STROKE_COLOR'] : ['FRAME_FILL', 'SHAPE_FILL', 'STROKE_COLOR']
  ids[n] = x.id
}
const nums = {
  'layout/margin-screen': PARAMS.marginScreen, 'layout/gutter': PARAMS.gutter,
  'gap/in-group': PARAMS.gapInGroup, 'gap/between-groups': PARAMS.gapBetweenGroups, 'size/touch': PARAMS.touch,
  'radius/control': PARAMS.radiusControl, 'radius/container': PARAMS.radiusContainer,
}
for (const s of PARAMS.space) nums['space/' + s] = s
for (const [n, v] of Object.entries(nums)) {
  const x = figma.variables.createVariable(n, col, 'FLOAT'); x.setValueForMode(mode, v)
  x.scopes = n.startsWith('radius') ? ['CORNER_RADIUS'] : n === 'size/touch' ? ['WIDTH_HEIGHT'] : ['GAP']
  ids[n] = x.id
}
// Текстовые стили
const F = PARAMS.font, B = PARAMS.bodySize
const styles = [
  ['WF/Screen title', 'Bold', B + 7, 1.25],
  ['WF/Section title', 'SemiBold', B + 3, 1.3],
  ['WF/Number large', 'Bold', B + 15, 1.1],
  ['WF/Body', 'Regular', B, 1.45],
  ['WF/Body strong', 'SemiBold', B, 1.45],
  ['WF/Button', 'SemiBold', B, 1.2],
  ['WF/Caption', 'Regular', B - 3, 1.4],
  ['WF/Label', 'Medium', B - 5, 1.3],
]
const styleIds = {}
for (const [n, st, size, lh] of styles) {
  await figma.loadFontAsync({ family: F, style: st })
  const s = figma.createTextStyle(); s.name = n
  s.fontName = { family: F, style: st }; s.fontSize = size; s.lineHeight = { unit: 'PERCENT', value: lh * 100 }
  styleIds[n] = s.id
}
return { page: page.id, collection: col.id, variables: ids, styles: styleIds }
