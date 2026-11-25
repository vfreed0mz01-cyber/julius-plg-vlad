// Wireframe Kit, шаг 4 (расширение по экрану Mayors №1 «Главная инвестора», 29.09).
// Требует шаги 1–3. Имена новых компонентов, свойств, вариантов и слоёв — на английском (правило Влада 29.09);
// существующие компоненты кита ищутся по текущим (русским) именам.
// Добавляет:
//   стиль WF/Number medium (сумма в карточке, база + 11 = 28 Bold);
//   вариант «Badge=Dot» в WF/Icon button (точка непрочитанного — чат);
//   булево «Show icon» в WF/Button (иконка справа от подписи, RTL);
//   WF/Chevron link · WF/Status chip · WF/Zone header (Control=Link / Arrows) · WF/Task row · WF/Update preview · WF/Project card.
// Урок: resize() сбрасывает primaryAxisSizingMode в FIXED — сначала resize, потом AUTO. Во всех рамках clipsContent = false.
const page = figma.root.children.find(p => p.name === 'Wireframe Kit')
await figma.setCurrentPageAsync(page)
const vars = await figma.variables.getLocalVariablesAsync()
const V = n => vars.find(v => v.name === n)
let styles = await figma.getLocalTextStylesAsync()
for (const s of styles) await figma.loadFontAsync(s.fontName)
await figma.loadFontAsync({ family: 'Heebo', style: 'Bold' })
const C = n => page.findOne(x => (x.type === 'COMPONENT' || x.type === 'COMPONENT_SET') && x.name === n)
const paint = varName => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', V(varName))
const fill = (node, varName) => { node.fills = [paint(varName)] }
const stroke = (node, varName, w = 1) => { node.strokes = [paint(varName)]; node.strokeWeight = w }
const radius = (node, varName) => { for (const c of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) node.setBoundVariable(c, V(varName)) }
const setP = (inst, name, val) => { const k = Object.keys(inst.componentProperties).find(k => k === name || k.startsWith(name + '#')); inst.setProperties({ [k]: val }) }
const created = []
let X = 0, Y = 1000
function place(n) { n.x = X; n.y = Y; X += n.width + 80; if (X > 2400) { X = 0; Y += 300 } created.push(n.id) }

// 1. Текстовый стиль «Number medium»
if (!styles.find(s => s.name === 'WF/Number medium')) {
  const s = figma.createTextStyle(); s.name = 'WF/Number medium'
  s.fontName = { family: 'Heebo', style: 'Bold' }; s.fontSize = 28; s.lineHeight = { unit: 'PERCENT', value: 115 }
  styles = await figma.getLocalTextStylesAsync()
}
const S = n => styles.find(s => s.name === n)
async function text(chars, style, color = 'color/text') {
  const t = figma.createText(); await t.setTextStyleIdAsync(S(style).id)
  t.characters = chars; fill(t, color); t.textAlignHorizontal = 'RIGHT'; return t
}
function frameAL(name, dir) { const f = figma.createFrame(); f.name = name; f.layoutMode = dir; f.fills = []; f.clipsContent = false; return f }

// 2. Кнопка-иконка: вариант «Badge=Dot»
const ib = C('WF/Icon button')
if (!ib.children.find(c => c.name === 'Badge=Dot')) {
  const c = figma.createComponent(); c.name = 'Badge=Dot'; c.resize(48, 48); c.fills = []
  const ic = C('WF/Icon').createInstance(); c.appendChild(ic); ic.x = 12; ic.y = 12; ic.constraints = { horizontal: 'CENTER', vertical: 'CENTER' }
  const dot = figma.createEllipse(); dot.name = 'Dot'; dot.resize(8, 8); fill(dot, 'color/action'); c.appendChild(dot); dot.x = 31; dot.y = 9
  ib.appendChild(c); c.setBoundVariable('width', V('size/touch')); c.setBoundVariable('height', V('size/touch'))
}

// 3. Кнопка: «Show icon» (иконка визуально справа от подписи — RTL)
const btn = C('WF/Button')
if (!Object.keys(btn.componentPropertyDefinitions).some(k => k.startsWith('Show icon'))) {
  const key = btn.addComponentProperty('Show icon', 'BOOLEAN', false)
  for (const v of btn.children) {
    v.itemSpacing = 8
    const ic = C('WF/Icon').createInstance(); v.appendChild(ic)
    ic.children[0].strokes = [paint(v.name.includes('Основная') ? 'color/on-action' : 'color/action')]
    ic.componentPropertyReferences = { visible: key }
  }
}

// 4. WF/Chevron link: [‹][текст 17] — переход, зона нажатия 48
const ln = figma.createComponent(); ln.name = 'WF/Chevron link'; ln.layoutMode = 'HORIZONTAL'; ln.resize(120, 48)
ln.primaryAxisSizingMode = 'AUTO'; ln.counterAxisSizingMode = 'FIXED'; ln.counterAxisAlignItems = 'CENTER'; ln.fills = []; ln.minWidth = 48; ln.clipsContent = false
ln.setBoundVariable('height', V('size/touch')); ln.setBoundVariable('itemSpacing', V('space/4'))
const lchev = C('WF/Chevron forward (RTL, left)').createInstance(); ln.appendChild(lchev); lchev.children[0].strokes = [paint('color/action')]
const lt = await text('לכל הפרטים', 'WF/Button', 'color/action'); ln.appendChild(lt)
lt.componentPropertyReferences = { characters: ln.addComponentProperty('Text', 'TEXT', 'לכל הפרטים') }
ln.description = 'Ссылка-переход: текст 17 + шеврон «вперёд» слева (RTL). Зона нажатия 48.'
place(ln)

// 5. WF/Status chip: [текст][иконка 16] — статус словами, высота 28
const ch = figma.createComponent(); ch.name = 'WF/Status chip'; ch.layoutMode = 'HORIZONTAL'; ch.resize(80, 28)
ch.primaryAxisSizingMode = 'AUTO'; ch.counterAxisSizingMode = 'FIXED'; ch.counterAxisAlignItems = 'CENTER'; ch.primaryAxisAlignItems = 'CENTER'; ch.clipsContent = false
ch.paddingLeft = ch.paddingRight = 10; radius(ch, 'radius/control'); ch.setBoundVariable('itemSpacing', V('space/4'))
fill(ch, 'color/bg'); stroke(ch, 'color/line', 1); ch.strokeAlign = 'INSIDE'
const ct = await text('סטטוס', 'WF/Caption', 'color/text'); ch.appendChild(ct)
const cic = C('WF/Icon').createInstance(); ch.appendChild(cic); cic.rescale(16 / 24)
ct.componentPropertyReferences = { characters: ch.addComponentProperty('Text', 'TEXT', 'סטטוס') }
cic.componentPropertyReferences = { visible: ch.addComponentProperty('Show icon', 'BOOLEAN', true) }
ch.description = 'Статус словами (не только цветом). Иконка — заглушка, смысл в аннотации.'
place(ch)

// 6. WF/Zone header: Control=Link / Arrows. Справа заголовок 20, слева ссылка 17 или листание. Строка 48.
const hv = []
for (const kind of ['Link', 'Arrows']) {
  const c = figma.createComponent(); c.name = 'Control=' + kind; c.layoutMode = 'HORIZONTAL'; c.resize(350, 48)
  c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'AUTO'; c.minHeight = 48; c.clipsContent = false
  c.primaryAxisAlignItems = 'SPACE_BETWEEN'; c.counterAxisAlignItems = 'CENTER'; c.fills = []
  if (kind === 'Link') {
    const lk = frameAL('Link', 'HORIZONTAL'); lk.resize(60, 48); lk.primaryAxisSizingMode = 'AUTO'; lk.counterAxisSizingMode = 'FIXED'
    lk.counterAxisAlignItems = 'CENTER'; lk.setBoundVariable('height', V('size/touch'))
    const t = await text('הכל', 'WF/Button', 'color/action'); t.textDecoration = 'UNDERLINE'; t.name = 'Link text'; lk.appendChild(t); c.appendChild(lk)
  } else {
    const ctrl = frameAL('Paging', 'HORIZONTAL'); ctrl.primaryAxisSizingMode = 'AUTO'; ctrl.counterAxisSizingMode = 'AUTO'; ctrl.counterAxisAlignItems = 'CENTER'
    for (const [nm, comp] of [['Next', 'WF/Chevron forward (RTL, left)'], ['Previous', 'WF/Chevron back (RTL, right)']]) {
      const b = frameAL(nm, 'HORIZONTAL'); b.resize(48, 48); b.primaryAxisAlignItems = 'CENTER'; b.counterAxisAlignItems = 'CENTER'
      b.setBoundVariable('width', V('size/touch')); b.setBoundVariable('height', V('size/touch'))
      b.appendChild(C(comp).createInstance()); ctrl.appendChild(b)
    }
    const cnt = await text('1 / 3', 'WF/Caption', 'color/text-secondary'); cnt.name = 'Counter'; ctrl.appendChild(cnt)
    ctrl.setBoundVariable('itemSpacing', V('space/4')); c.appendChild(ctrl)
  }
  const tt = await text('כותרת אזור', 'WF/Section title'); tt.name = 'Title'; c.appendChild(tt)
  hv.push(c)
}
const hs = figma.combineAsVariants(hv, page); hs.name = 'WF/Zone header'
hs.layoutMode = 'VERTICAL'; hs.itemSpacing = 24; hs.paddingLeft = hs.paddingRight = hs.paddingTop = hs.paddingBottom = 16; hs.fills = []
hs.primaryAxisSizingMode = 'AUTO'; hs.counterAxisSizingMode = 'AUTO'
const kT = hs.addComponentProperty('Title', 'TEXT', 'כותרת אזור')
const kL = hs.addComponentProperty('Link', 'TEXT', 'הכל')
const kLv = hs.addComponentProperty('Show link', 'BOOLEAN', true)
const kC = hs.addComponentProperty('Counter', 'TEXT', '1 / 3')
for (const v of hs.children) {
  v.findOne(n => n.name === 'Title').componentPropertyReferences = { characters: kT }
  const l = v.findOne(n => n.name === 'Link text'); if (l) { l.componentPropertyReferences = { characters: kL }; v.findOne(n => n.name === 'Link').componentPropertyReferences = { visible: kLv } }
  const c = v.findOne(n => n.name === 'Counter'); if (c) c.componentPropertyReferences = { characters: kC }
}
hs.description = 'Заголовок зоны над содержимым: справа заголовок 20, слева ссылка 17 (зона 48) или листание ленты (стрелки 48 + счётчик). Строка 48.'
place(hs)

// общие для строк
function textCol(parent, gapVar) {
  const col = frameAL('Texts', 'VERTICAL'); col.counterAxisAlignItems = 'MAX'; col.primaryAxisSizingMode = 'AUTO'; parent.appendChild(col)
  col.layoutSizingHorizontal = 'FILL'; col.layoutSizingVertical = 'HUG'; col.setBoundVariable('itemSpacing', V(gapVar)); return col
}
function wrap(t, col, maxLines) { col.appendChild(t); t.textAutoResize = 'HEIGHT'; t.layoutSizingHorizontal = 'FILL'; t.textTruncation = 'ENDING'; t.maxLines = maxLines }
function rowBase(name, minH) {
  const r = figma.createComponent(); r.name = name; r.layoutMode = 'HORIZONTAL'; r.resize(350, minH); r.clipsContent = false
  r.primaryAxisSizingMode = 'FIXED'; r.counterAxisSizingMode = 'AUTO'; r.minHeight = minH; r.counterAxisAlignItems = 'CENTER'; r.fills = []
  r.setBoundVariable('itemSpacing', V('gap/in-group')); r.setBoundVariable('paddingTop', V('gap/in-group')); r.setBoundVariable('paddingBottom', V('gap/in-group'))
  stroke(r, 'color/line', 1); r.strokeAlign = 'INSIDE'; r.strokeTopWeight = 0; r.strokeLeftWeight = 0; r.strokeRightWeight = 0; r.strokeBottomWeight = 1
  return r
}

// 7. WF/Task row: [‹][описание / контекст / статус][иконка 24]. Мин. 80, разделитель снизу.
const tr = rowBase('WF/Task row', 80)
const trChev = C('WF/Chevron forward (RTL, left)').createInstance(); tr.appendChild(trChev)
const trCol = textCol(tr, 'space/4')
const d = await text('תיאור המשימה', 'WF/Body'); d.name = 'Description'; wrap(d, trCol, 2)
const cx = await text('נכס · שלב', 'WF/Caption', 'color/text-secondary'); cx.name = 'Context'; wrap(cx, trCol, 1)
const st = ch.createInstance(); st.name = 'Status'; trCol.appendChild(st); setP(st, 'Show icon', false); st.isExposedInstance = true
const trIc = C('WF/Icon').createInstance(); trIc.name = 'Type icon'; tr.appendChild(trIc)
d.componentPropertyReferences = { characters: tr.addComponentProperty('Description', 'TEXT', 'תיאור המשימה') }
cx.componentPropertyReferences = { characters: tr.addComponentProperty('Context', 'TEXT', 'נכס · שלב') }
trChev.componentPropertyReferences = { visible: tr.addComponentProperty('Show chevron', 'BOOLEAN', true) }
tr.description = 'Задача: описание 17 (до 2 строк, «…»), контекст 15 (1 строка), статус словами. Шеврон скрыт у «בבדיקה».'
place(tr)

// 8. WF/Update preview: [миниатюра 72][текст до 2 строк / «חדש» + дата]. Мин. 96.
const up = rowBase('WF/Update preview', 96)
const th = C('WF/Photo placeholder').createInstance(); th.name = 'Thumbnail'; up.appendChild(th); th.resize(72, 72); setP(th, 'Подпись', 'תמונה'); th.isExposedInstance = true
const upCol = textCol(up, 'space/4')
const ut = await text('טקסט העדכון', 'WF/Body'); ut.name = 'Text'; wrap(ut, upCol, 2)
const meta = frameAL('Meta', 'HORIZONTAL'); meta.counterAxisAlignItems = 'CENTER'; meta.primaryAxisSizingMode = 'AUTO'; meta.counterAxisSizingMode = 'AUTO'
meta.setBoundVariable('itemSpacing', V('space/8')); upCol.appendChild(meta)
const nw = ch.createInstance(); nw.name = 'New'; meta.appendChild(nw); setP(nw, 'Show icon', false); setP(nw, 'Text', 'חדש')
const dt = await text('היום, 14:32', 'WF/Caption', 'color/text-secondary'); dt.name = 'Date'; meta.appendChild(dt)
ut.componentPropertyReferences = { characters: up.addComponentProperty('Text', 'TEXT', 'טקסט העדכון') }
dt.componentPropertyReferences = { characters: up.addComponentProperty('Date', 'TEXT', 'היום, 14:32') }
nw.componentPropertyReferences = { visible: up.addComponentProperty('Show new', 'BOOLEAN', true) }
th.componentPropertyReferences = { visible: up.addComponentProperty('Show thumbnail', 'BOOLEAN', true) }
up.description = 'Превью апдейта: текст первым (справа), миниатюра = первое фото. Без медиа — миниатюра скрыта. Метка «חדש» словом.'
place(up)

// 9. WF/Project card: фото 300×169 (16:9), под ним заголовок до 2 строк и «החל מ-…»
const pc = figma.createComponent(); pc.name = 'WF/Project card'; pc.layoutMode = 'VERTICAL'; pc.resize(300, 240); pc.clipsContent = false
pc.primaryAxisSizingMode = 'AUTO'; pc.counterAxisSizingMode = 'FIXED'; pc.counterAxisAlignItems = 'MAX'; pc.fills = []
pc.setBoundVariable('itemSpacing', V('gap/in-group'))
const ph = C('WF/Photo placeholder').createInstance(); ph.name = 'Photo'; pc.appendChild(ph); ph.resize(300, 169); setP(ph, 'Подпись', 'הדמיית הפרויקט'); ph.isExposedInstance = true
const pcCol = textCol(pc, 'space/4')
const pt = await text('שם הפרויקט', 'WF/Body strong'); pt.name = 'Title'; wrap(pt, pcCol, 2)
const pp = await text('החל מ-0 ₪', 'WF/Caption', 'color/text-secondary'); pp.name = 'Price'; wrap(pp, pcCol, 1)
pt.componentPropertyReferences = { characters: pc.addComponentProperty('Title', 'TEXT', 'שם הפרויקט') }
pp.componentPropertyReferences = { characters: pc.addComponentProperty('Price', 'TEXT', 'החל מ-0 ₪') }
pc.description = 'Проект в ленте: название под фото (не на фото — читаемость иврита), до 2 строк. Тап → детали проекта.'
place(pc)

return { created }
