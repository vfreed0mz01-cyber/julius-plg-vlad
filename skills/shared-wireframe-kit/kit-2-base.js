// Wireframe Kit, шаг 2: базовые компоненты (иконка-заглушка, бейдж, кнопка-иконка, кнопка, чип, фото-заглушка, аватар, метка аннотации).
// Требует шаг 1 (коллекция WF и стили WF/*). RTL: текст выравнивается вправо.
const page = figma.root.children.find(p => p.name === 'Wireframe Kit')
await figma.setCurrentPageAsync(page)
const vars = await figma.variables.getLocalVariablesAsync()
const V = n => vars.find(v => v.name === n)
const styles = await figma.getLocalTextStylesAsync()
const S = n => styles.find(s => s.name === n)
for (const s of styles) await figma.loadFontAsync(s.fontName)
const fill = (node, varName) => { node.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', V(varName))] }
const stroke = (node, varName, w = 1) => { node.strokes = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', V(varName))]; node.strokeWeight = w }
async function text(chars, style, color = 'color/text') {
  const t = figma.createText(); await t.setTextStyleIdAsync(S(style).id)
  t.characters = chars; fill(t, color); t.textAlignHorizontal = 'RIGHT'; return t
}
const created = []
let X = 0
function place(n, w = 200) { n.x = X; n.y = 0; X += Math.max(n.width, w) + 80; created.push(n.id) }

// Иконка-заглушка 24
const icon = figma.createComponent(); icon.name = 'WF/Icon'; icon.resize(24, 24); icon.fills = []
const circ = figma.createEllipse(); circ.resize(20, 20); circ.x = 2; circ.y = 2; circ.fills = []; stroke(circ, 'color/text', 1.5)
icon.appendChild(circ); icon.description = 'Заглушка иконки. Смысл иконки — подписью рядом или в аннотации.'
place(icon, 60)

// Бейдж
const badge = figma.createComponent(); badge.name = 'WF/Badge'
badge.layoutMode = 'HORIZONTAL'; badge.primaryAxisSizingMode = 'AUTO'; badge.counterAxisSizingMode = 'AUTO'
badge.paddingLeft = badge.paddingRight = 6; badge.paddingTop = badge.paddingBottom = 1; badge.cornerRadius = 10; badge.minWidth = 20
badge.primaryAxisAlignItems = 'CENTER'; fill(badge, 'color/action')
const bt = await text('3', 'WF/Label', 'color/on-action'); bt.textAlignHorizontal = 'CENTER'; badge.appendChild(bt)
const bk = badge.addComponentProperty('Count', 'TEXT', '3'); bt.componentPropertyReferences = { characters: bk }
place(badge, 60)

// Кнопка-иконка 48 (варианты: без бейджа / с бейджем)
const ibVariants = []
for (const withBadge of [false, true]) {
  const c = figma.createComponent(); c.name = 'Badge=' + (withBadge ? 'Count' : 'None')
  c.resize(48, 48); c.fills = []
  c.setBoundVariable('width', V('size/touch')); c.setBoundVariable('height', V('size/touch'))
  const ic = icon.createInstance(); c.appendChild(ic); ic.x = 12; ic.y = 12
  ic.constraints = { horizontal: 'CENTER', vertical: 'CENTER' }
  if (withBadge) { const b = badge.createInstance(); c.appendChild(b); b.x = 26; b.y = 6 }
  ibVariants.push(c)
}
const ib = figma.combineAsVariants(ibVariants, page); ib.name = 'WF/Icon button'
ib.layoutMode = 'HORIZONTAL'; ib.itemSpacing = 24; ib.paddingLeft = ib.paddingRight = ib.paddingTop = ib.paddingBottom = 16; ib.fills = []
place(ib)

// Кнопка: Основная / Вторичная / Текст
const btnVariants = []
for (const kind of ['Primary', 'Secondary', 'Text']) {
  const c = figma.createComponent(); c.name = 'Type=' + kind
  // resize() до *SizingMode — иначе ширина снова FIXED 160, и текстовая кнопка не встаёт в правую вертикаль
  c.layoutMode = 'HORIZONTAL'; c.resize(160, 48); c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'FIXED'
  c.primaryAxisAlignItems = 'CENTER'; c.counterAxisAlignItems = 'CENTER'
  c.setBoundVariable('height', V('size/touch'))
  // Text: справа 0 — подпись на линии текста (RTL); зона нажатия добирается высотой 48 и отступом слева
  if (kind === 'Text') { c.paddingRight = 0; c.paddingLeft = 8 } else c.paddingLeft = c.paddingRight = 20
  c.setBoundVariable('topLeftRadius', V('radius/control')); c.setBoundVariable('topRightRadius', V('radius/control'))
  c.setBoundVariable('bottomLeftRadius', V('radius/control')); c.setBoundVariable('bottomRightRadius', V('radius/control'))
  if (kind === 'Primary') fill(c, 'color/action'); else c.fills = []
  if (kind === 'Secondary') stroke(c, 'color/action', 1.5)
  const t = await text('כפתור', 'WF/Button', kind === 'Primary' ? 'color/on-action' : 'color/action')
  t.textAlignHorizontal = 'CENTER'; if (kind === 'Text') t.textDecoration = 'UNDERLINE'
  c.appendChild(t); btnVariants.push(c)
}
const btn = figma.combineAsVariants(btnVariants, page); btn.name = 'WF/Button'
btn.layoutMode = 'HORIZONTAL'; btn.itemSpacing = 24; btn.paddingLeft = btn.paddingRight = btn.paddingTop = btn.paddingBottom = 16; btn.fills = []
const btk = btn.addComponentProperty('Label', 'TEXT', 'כפתור')
for (const v of btn.children) v.findOne(n => n.type === 'TEXT').componentPropertyReferences = { characters: btk }
place(btn)

// Чип: Обычный / Выбран
const chipVariants = []
for (const sel of [false, true]) {
  const c = figma.createComponent(); c.name = 'Selected=' + (sel ? 'Yes' : 'No')
  c.layoutMode = 'HORIZONTAL'; c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'FIXED'
  c.primaryAxisAlignItems = 'CENTER'; c.counterAxisAlignItems = 'CENTER'; c.resize(80, 36)
  c.paddingLeft = c.paddingRight = 16; c.cornerRadius = 18
  if (sel) fill(c, 'color/action'); else { c.fills = []; stroke(c, 'color/line', 1) }
  const t = await text('סינון', 'WF/Caption', sel ? 'color/on-action' : 'color/text'); t.textAlignHorizontal = 'CENTER'
  c.appendChild(t); chipVariants.push(c)
}
const chip = figma.combineAsVariants(chipVariants, page); chip.name = 'WF/Chip'
chip.layoutMode = 'HORIZONTAL'; chip.itemSpacing = 24; chip.paddingLeft = chip.paddingRight = chip.paddingTop = chip.paddingBottom = 16; chip.fills = []
const chk = chip.addComponentProperty('Label', 'TEXT', 'סינון')
for (const v of chip.children) v.findOne(n => n.type === 'TEXT').componentPropertyReferences = { characters: chk }
place(chip)

// Фото-заглушка (растягивается)
const img = figma.createComponent(); img.name = 'WF/Photo placeholder'; img.resize(350, 180); fill(img, 'color/placeholder')
img.setBoundVariable('topLeftRadius', V('radius/container')); img.setBoundVariable('topRightRadius', V('radius/container'))
img.setBoundVariable('bottomLeftRadius', V('radius/container')); img.setBoundVariable('bottomRightRadius', V('radius/container'))
img.clipsContent = true
for (const [x1, y1, x2, y2] of [[0, 0, 350, 180], [0, 180, 350, 0]]) {
  const l = figma.createVector(); l.vectorPaths = [{ windingRule: 'NONE', data: `M ${x1} ${y1} L ${x2} ${y2}` }]
  stroke(l, 'color/bg', 1); l.constraints = { horizontal: 'SCALE', vertical: 'SCALE' }; img.appendChild(l)
}
const it = await text('תמונה', 'WF/Label', 'color/text-secondary'); it.textAlignHorizontal = 'CENTER'
img.appendChild(it); it.x = (350 - it.width) / 2; it.y = (180 - it.height) / 2; it.constraints = { horizontal: 'CENTER', vertical: 'CENTER' }
const ik = img.addComponentProperty('Caption', 'TEXT', 'תמונה'); it.componentPropertyReferences = { characters: ik }
img.description = 'Заглушка фото. Подпись — что будет на фото (на иврите).'
place(img)

// Аватар 40
const av = figma.createComponent(); av.name = 'WF/Avatar'; av.resize(40, 40); av.cornerRadius = 20; fill(av, 'color/placeholder')
place(av, 60)

// Метка аннотации (для аннотаций ВНЕ фрейма)
const an = figma.createComponent(); an.name = 'WF/Annotation marker'
an.layoutMode = 'HORIZONTAL'; an.primaryAxisSizingMode = 'FIXED'; an.counterAxisSizingMode = 'FIXED'; an.resize(28, 28)
an.primaryAxisAlignItems = 'CENTER'; an.counterAxisAlignItems = 'CENTER'; an.cornerRadius = 14
an.fills = [{ type: 'SOLID', color: { r: 1, g: 0.42, b: 0.17 } }]
const at = await text('1', 'WF/Label', 'color/on-action'); at.textAlignHorizontal = 'CENTER'; an.appendChild(at)
const ak = an.addComponentProperty('Number', 'TEXT', '1'); at.componentPropertyReferences = { characters: ak }
an.description = 'Оранжевая метка — единственный цвет в файле, только для аннотаций вне экрана.'
place(an, 60)

return { created }
