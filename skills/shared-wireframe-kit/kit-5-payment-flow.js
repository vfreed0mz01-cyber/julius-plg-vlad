// Wireframe Kit, шаг 5 (расширение по потоку оплаты Mayors №7 → №8 → №10, 29.09).
// Требует шаги 1–4. Все имена — на английском (правило Влада).
// Добавляет:
//   WF/Icon close — «✕» 24;
//   WF/Header close — модальная шапка: «✕» справа, заголовок по центру (Show title);
//   WF/Stage marker (Status=Paid/Open/Overdue/Processing/Future) — маркер 24 на оси этапов;
//   WF/Status icon (Status=Paid/Processing/Failed) — значок 48 статус-блока результата;
//   WF/Stage row (State=Collapsed/Expanded) — строка этапа на оси: рельс с маркером справа, текст, сумма слева;
//   WF/Detail row — строка таблицы «лейбл — значение» с волосяной линией снизу;
//   WF/Sticky action bar — липкая панель: одна основная кнопка 350 × 48, отступы 16, волосяная линия сверху;
//   WF/Result status — статус-блок результата: значок → заголовок → пояснение (→ строка / «לכתוב לסוכן»).
// Таблица «Детали платежа» = вертикальный стек WF/Detail row (число строк на №8 и №10 разное).
// Уроки: resize() до *SizingMode; clipsContent = false; разделители — абсолютные прямоугольники (их видимость — булево свойство).
const page = figma.root.children.find(p => p.name === 'Wireframe Kit')
await figma.setCurrentPageAsync(page)
const vars = await figma.variables.getLocalVariablesAsync()
const V = n => vars.find(v => v.name === n)
const styles = await figma.getLocalTextStylesAsync()
for (const s of styles) await figma.loadFontAsync(s.fontName)
const S = n => styles.find(s => s.name === n)
const C = n => page.findOne(x => (x.type === 'COMPONENT' || x.type === 'COMPONENT_SET') && x.name === n)
const paint = varName => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', V(varName))
const fill = (node, varName) => { node.fills = [paint(varName)] }
const stroke = (node, varName, w = 1) => { node.strokes = [paint(varName)]; node.strokeWeight = w }
const radius = (node, varName) => { for (const c of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) node.setBoundVariable(c, V(varName)) }
const setP = (inst, name, val) => { const k = Object.keys(inst.componentProperties).find(k => k === name || k.startsWith(name + '#')); inst.setProperties({ [k]: val }) }
const bind = (node, map) => { for (const [f, v] of Object.entries(map)) node.setBoundVariable(f, V(v)) }
for (const n of page.children.filter(n => n.name.startsWith('WF/') && ['WF/Icon close', 'WF/Header close', 'WF/Stage marker', 'WF/Status icon', 'WF/Stage row', 'WF/Detail row', 'WF/Sticky action bar', 'WF/Result status'].includes(n.name))) n.remove() // перезапуск
const created = []
let X = 0, Y = 1700
function place(n) { n.x = X; n.y = Y; X += n.width + 80; if (X > 2400) { X = 0; Y += 400 } created.push(n.id) }
async function text(chars, style, color = 'color/text', align = 'RIGHT') {
  const t = figma.createText(); await t.setTextStyleIdAsync(S(style).id)
  t.characters = chars; fill(t, color); t.textAlignHorizontal = align; return t
}
function frameAL(name, dir) { const f = figma.createFrame(); f.name = name; f.layoutMode = dir; f.fills = []; f.clipsContent = false; f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'AUTO'; return f }
function wrapText(t, parent, maxLines) { parent.appendChild(t); t.textAutoResize = 'HEIGHT'; t.layoutSizingHorizontal = 'FILL'; if (maxLines) { t.textTruncation = 'ENDING'; t.maxLines = maxLines } }
function divider(parent, where) { // абсолютная волосяная линия у верхнего/нижнего края
  const d = figma.createRectangle(); d.name = 'Divider'; fill(d, 'color/line'); parent.appendChild(d)
  d.layoutPositioning = 'ABSOLUTE'; d.resize(parent.width, 1); d.x = 0; d.y = where === 'top' ? 0 : parent.height - 1
  d.constraints = { horizontal: 'STRETCH', vertical: where === 'top' ? 'MIN' : 'MAX' }; return d
}
const sc = (path, s) => path.replace(/-?\d+(\.\d+)?/g, n => String(+(parseFloat(n) * s).toFixed(2)))
function vec(parent, path, color, w, s) {
  const v = figma.createVector(); v.vectorPaths = [{ windingRule: 'NONE', data: sc(path, s) }]
  stroke(v, color, w * s); v.strokeCap = 'ROUND'; v.strokeJoin = 'ROUND'; parent.appendChild(v); return v
}

// 1. «✕»
const xi = figma.createComponent(); xi.name = 'WF/Icon close'; xi.resize(24, 24); xi.fills = []; xi.clipsContent = false
const xv = vec(xi, 'M 6 6 L 18 18 M 18 6 L 6 18', 'color/action', 2, 1); xv.x = 6; xv.y = 6
xi.description = 'Закрыть (модальный поток). RTL: стоит справа — в той же точке, что «назад».'
place(xi)

// 2. Модальная шапка: [пусто 48][заголовок][✕ 48]
const hc = figma.createComponent(); hc.name = 'WF/Header close'; hc.layoutMode = 'HORIZONTAL'; hc.resize(390, 56)
hc.primaryAxisSizingMode = 'FIXED'; hc.counterAxisSizingMode = 'FIXED'; hc.primaryAxisAlignItems = 'SPACE_BETWEEN'; hc.counterAxisAlignItems = 'CENTER'
hc.paddingLeft = hc.paddingRight = 12; fill(hc, 'color/bg'); hc.clipsContent = false
const hcs = figma.createFrame(); hcs.name = 'Action (empty)'; hcs.resize(48, 48); hcs.fills = []; hc.appendChild(hcs)
const hct = await text('כותרת', 'WF/Body strong', 'color/text', 'CENTER'); hct.name = 'Title'; hc.appendChild(hct)
const hcb = frameAL('Close', 'HORIZONTAL'); hcb.resize(48, 48); hcb.primaryAxisSizingMode = 'FIXED'; hcb.counterAxisSizingMode = 'FIXED'
hcb.primaryAxisAlignItems = 'CENTER'; hcb.counterAxisAlignItems = 'CENTER'; hcb.appendChild(xi.createInstance()); hc.appendChild(hcb)
bind(hcb, { width: 'size/touch', height: 'size/touch' })
hct.componentPropertyReferences = { characters: hc.addComponentProperty('Title', 'TEXT', 'כותרת'), visible: hc.addComponentProperty('Show title', 'BOOLEAN', true) }
hc.description = 'Шапка модального потока (оплата): «✕» справа, заголовок действия по центру. Без заголовка — экран результата.'
place(hc)

// 3–4. Глифы статуса: маркер оси 24 и значок результата 48
async function glyphSet(setName, kinds, size) {
  const s = size / 24, comps = []
  for (const k of kinds) {
    const c = figma.createComponent(); c.name = 'Status=' + k; c.resize(size, size); c.fills = []; c.clipsContent = false
    const e = figma.createEllipse(); e.name = 'Ring'; e.resize(20 * s, 20 * s); e.x = 2 * s; e.y = 2 * s; c.appendChild(e)
    if (k === 'Paid') { fill(e, 'color/action'); const v = vec(c, 'M 7.5 12.5 L 10.5 15.5 L 16.5 9', 'color/on-action', 2, s); v.x = 7.5 * s; v.y = 9 * s; v.name = 'Check' }
    else {
      fill(e, 'color/bg'); stroke(e, k === 'Future' ? 'color/text-secondary' : 'color/action', (k === 'Future' ? 1 : 2) * s); e.strokeAlign = 'INSIDE'
      if (k === 'Overdue' || k === 'Failed') {
        const v = vec(c, 'M 12 7 L 12 13', 'color/action', 2, s); v.x = 12 * s; v.y = 7 * s; v.name = 'Exclamation'
        const d = figma.createEllipse(); d.name = 'Dot'; d.resize(2.6 * s, 2.6 * s); d.x = 10.7 * s; d.y = 15.2 * s; fill(d, 'color/action'); c.appendChild(d)
      }
      if (k === 'Processing') { const v = vec(c, 'M 12 7.5 L 12 12 L 15.5 14', 'color/action', 1.75, s); v.x = 12 * s; v.y = 7.5 * s; v.name = 'Clock hands' }
    }
    comps.push(c)
  }
  const set = figma.combineAsVariants(comps, page); set.name = setName
  set.layoutMode = 'HORIZONTAL'; set.itemSpacing = 16; set.paddingLeft = set.paddingRight = set.paddingTop = set.paddingBottom = 16; set.fills = []
  set.primaryAxisSizingMode = 'AUTO'; set.counterAxisSizingMode = 'AUTO'; set.clipsContent = false
  return set
}
const mk = await glyphSet('WF/Stage marker', ['Paid', 'Open', 'Overdue', 'Processing', 'Future'], 24)
mk.description = 'Маркер этапа на оси: שולם — залитый круг с галочкой; פתוח — кольцо; באיחור — кольцо с «!»; בעיבוד — кольцо с часами; עתידי — тонкое кольцо. Статус всегда ещё и словом.'
place(mk)
const si = await glyphSet('WF/Status icon', ['Paid', 'Processing', 'Failed'], 48)
si.description = 'Значок 48 статус-блока результата оплаты: галочка / часы / «!» (нейтральный, не красная тревога). Цвет — дело Дизайна.'
place(si)
const MK = st => mk.children.find(v => v.name === 'Status=' + st)

// 5. Строка этапа на оси
const railTop = { Collapsed: 12, Expanded: 14 }
const rowVariants = []
for (const state of ['Collapsed', 'Expanded']) {
  const r = figma.createComponent(); r.name = 'State=' + state; r.layoutMode = 'HORIZONTAL'; r.resize(350, 72)
  r.primaryAxisSizingMode = 'FIXED'; r.counterAxisSizingMode = 'AUTO'; r.counterAxisAlignItems = 'MIN'; r.fills = []; r.clipsContent = false
  bind(r, { itemSpacing: 'gap/in-group' })
  // Body: [сумма][тексты]
  const body = frameAL('Body', 'HORIZONTAL'); body.counterAxisAlignItems = 'MIN'; r.appendChild(body)
  body.layoutSizingHorizontal = 'FILL'; body.layoutSizingVertical = 'HUG'; bind(body, { itemSpacing: 'layout/gutter' })
  // Сумма у всех строк в одной вертикали: у свёрнутых слева отступ 16 = внутренний отступ заливки раскрытого этапа.
  if (state === 'Collapsed') { bind(body, { paddingTop: 'gap/in-group', paddingBottom: 'gap/in-group', paddingLeft: 'space/16' }); body.minHeight = 72 }
  else { bind(body, { paddingTop: 'space/16', paddingBottom: 'space/16', paddingLeft: 'space/16', paddingRight: 'space/16' }); fill(body, 'color/surface'); radius(body, 'radius/container') }
  const amt = await text('0 ₪', state === 'Collapsed' ? 'WF/Body' : 'WF/Body strong', 'color/text', 'LEFT'); amt.name = 'Amount'
  amt.textAutoResize = 'HEIGHT'; amt.resize(110, amt.height)
  const col = frameAL('Texts', 'VERTICAL'); col.counterAxisAlignItems = 'MAX'
  if (state === 'Collapsed') {
    body.appendChild(amt); amt.layoutSizingHorizontal = 'FIXED'; body.appendChild(col); col.layoutSizingHorizontal = 'FILL'
    bind(col, { itemSpacing: 'space/4' })
    const t = await text('שם השלב', 'WF/Body'); t.name = 'Title'; wrapText(t, col, 2)
    const m = await text('תאריך · סטטוס', 'WF/Caption', 'color/text-secondary'); m.name = 'Meta'; wrapText(m, col, 1)
    const dv = divider(body, 'bottom'); dv.x = 16; dv.resize(body.width - 16, 1); dv.constraints = { horizontal: 'STRETCH', vertical: 'MAX' }
  } else {
    // Раскрытый: сумма в первой строке рядом с метаданными, срок 20 — на всю ширину (иначе переносится в колонке 156)
    body.appendChild(col); col.layoutSizingHorizontal = 'FILL'
    bind(col, { itemSpacing: 'space/8' })
    const topRow = frameAL('Top row', 'HORIZONTAL'); topRow.counterAxisAlignItems = 'BASELINE'; col.appendChild(topRow); topRow.layoutSizingHorizontal = 'FILL'; bind(topRow, { itemSpacing: 'layout/gutter' })
    topRow.appendChild(amt); amt.layoutSizingHorizontal = 'FIXED'
    const m = await text('שלב · N מתוך M', 'WF/Caption', 'color/text-secondary'); m.name = 'Meta'; wrapText(m, topRow, 2)
    const dg = frameAL('Deadline group', 'VERTICAL'); dg.counterAxisAlignItems = 'MAX'; col.appendChild(dg); dg.layoutSizingHorizontal = 'FILL'; bind(dg, { itemSpacing: 'space/4' })
    const d = await text('לתשלום עד', 'WF/Section title'); d.name = 'Deadline'; wrapText(d, dg, 2)
    const dy = await text('עוד N ימים', 'WF/Caption', 'color/text-secondary'); dy.name = 'Days'; wrapText(dy, dg, 1)
  }
  // Rail: ось + маркер (фикс-подфрейм)
  const rail = figma.createFrame(); rail.name = 'Rail'; rail.resize(24, 72); rail.fills = []; rail.clipsContent = false
  const top = railTop[state]
  const lt = figma.createRectangle(); lt.name = 'Line top'; lt.resize(2, top); lt.x = 11; lt.y = 0; fill(lt, 'color/placeholder'); rail.appendChild(lt); lt.constraints = { horizontal: 'CENTER', vertical: 'MIN' }
  const lb = figma.createRectangle(); lb.name = 'Line bottom'; lb.resize(2, 72 - top - 24); lb.x = 11; lb.y = top + 24; fill(lb, 'color/placeholder'); rail.appendChild(lb); lb.constraints = { horizontal: 'CENTER', vertical: 'STRETCH' }
  const mi = MK(state === 'Collapsed' ? 'Paid' : 'Open').createInstance(); mi.name = 'Marker'; rail.appendChild(mi); mi.x = 0; mi.y = top; mi.constraints = { horizontal: 'MIN', vertical: 'MIN' }
  r.appendChild(rail); rail.layoutSizingVertical = 'FILL'
  mi.isExposedInstance = true
  rowVariants.push(r)
}
const sr = figma.combineAsVariants(rowVariants, page); sr.name = 'WF/Stage row'
sr.layoutMode = 'VERTICAL'; sr.itemSpacing = 24; sr.paddingLeft = sr.paddingRight = sr.paddingTop = sr.paddingBottom = 16; sr.fills = []
sr.primaryAxisSizingMode = 'AUTO'; sr.counterAxisSizingMode = 'AUTO'; sr.clipsContent = false
const kTitle = sr.addComponentProperty('Title', 'TEXT', 'שם השלב')
const kMeta = sr.addComponentProperty('Meta', 'TEXT', 'תאריך · סטטוס')
const kAmt = sr.addComponentProperty('Amount', 'TEXT', '0 ₪')
const kDl = sr.addComponentProperty('Deadline', 'TEXT', 'לתשלום עד')
const kDays = sr.addComponentProperty('Days', 'TEXT', 'עוד N ימים')
const kDiv = sr.addComponentProperty('Show divider', 'BOOLEAN', true)
const kLt = sr.addComponentProperty('Show line top', 'BOOLEAN', true)
const kLb = sr.addComponentProperty('Show line bottom', 'BOOLEAN', true)
for (const v of sr.children) {
  const q = n => v.findOne(x => x.name === n)
  q('Amount').componentPropertyReferences = { characters: kAmt }
  q('Meta').componentPropertyReferences = { characters: kMeta }
  if (q('Title')) q('Title').componentPropertyReferences = { characters: kTitle }
  if (q('Deadline')) q('Deadline').componentPropertyReferences = { characters: kDl }
  if (q('Days')) q('Days').componentPropertyReferences = { characters: kDays }
  if (q('Divider')) q('Divider').componentPropertyReferences = { visible: kDiv }
  q('Line top').componentPropertyReferences = { visible: kLt }
  q('Line bottom').componentPropertyReferences = { visible: kLb }
}
sr.description = 'Строка этапа на оси (RTL): справа рельс 24 с маркером, текст, слева сумма (одна вертикаль сумм, 110). Collapsed: название 17 до 2 строк + «дата · статус» 15, мин. 72, разделитель снизу. Expanded — раскрытый этап (ранг 1): единственная заливка, метаданные → срок 20 (фокус) → «עוד N ימים». Маркер — выставленный инстанс WF/Stage marker.'
place(sr)

// 6. Строка таблицы «лейбл — значение»
const dr = figma.createComponent(); dr.name = 'WF/Detail row'; dr.layoutMode = 'HORIZONTAL'; dr.resize(350, 56)
dr.primaryAxisSizingMode = 'FIXED'; dr.counterAxisSizingMode = 'AUTO'; dr.minHeight = 56; dr.counterAxisAlignItems = 'BASELINE'; dr.fills = []; dr.clipsContent = false
bind(dr, { paddingTop: 'space/16', paddingBottom: 'space/16', itemSpacing: 'layout/gutter' })
const dv = await text('ערך', 'WF/Body', 'color/text', 'LEFT'); dv.name = 'Value'; wrapText(dv, dr, 3)
const dl = await text('תווית', 'WF/Caption', 'color/text-secondary'); dl.name = 'Label'; dr.appendChild(dl)
dl.textAutoResize = 'HEIGHT'; dl.resize(124, dl.height); dl.layoutSizingHorizontal = 'FIXED'; dl.textTruncation = 'ENDING'; dl.maxLines = 1
const drDiv = divider(dr, 'bottom')
dv.componentPropertyReferences = { characters: dr.addComponentProperty('Value', 'TEXT', 'ערך') }
dl.componentPropertyReferences = { characters: dr.addComponentProperty('Label', 'TEXT', 'תווית') }
drDiv.componentPropertyReferences = { visible: dr.addComponentProperty('Show divider', 'BOOLEAN', true) }
dr.description = 'Строка «чека» (экраны подтверждения и результата): справа лейбл 15 (124, не переносится), слева значение 17 — одна вертикаль значений, перенос до 3 строк. Волосяная линия между строками (у последней скрыть), без внешней рамки. Таблица = стек этих строк.'
place(dr)

// 7. Липкая панель действия
const sb = figma.createComponent(); sb.name = 'WF/Sticky action bar'; sb.layoutMode = 'VERTICAL'; sb.resize(390, 80)
sb.primaryAxisSizingMode = 'AUTO'; sb.counterAxisSizingMode = 'FIXED'; sb.counterAxisAlignItems = 'MAX'; fill(sb, 'color/bg'); sb.clipsContent = false
bind(sb, { paddingTop: 'space/16', paddingBottom: 'space/16', paddingLeft: 'layout/margin-screen', paddingRight: 'layout/margin-screen' })
const sbb = C('WF/Button').children.find(v => v.name === 'Type=Primary').createInstance(); sbb.name = 'Button'; sb.appendChild(sbb); sbb.layoutSizingHorizontal = 'FILL'
setP(sbb, 'Label', 'פעולה ראשית')
const sbDiv = divider(sb, 'top')
sbDiv.componentPropertyReferences = { visible: sb.addComponentProperty('Show divider', 'BOOLEAN', true) }
sbb.isExposedInstance = true
sb.description = 'Липкая панель потока оплаты: ровно одна основная кнопка 350 × 48, 16 + 48 + 16 = 80, фон экрана. Волосяная линия сверху — только когда под панелью есть контент. Один компонент на №7, №8, №10.'
place(sb)

// 8. Статус-блок результата
const rs = figma.createComponent(); rs.name = 'WF/Result status'; rs.layoutMode = 'VERTICAL'; rs.resize(350, 200)
rs.counterAxisSizingMode = 'FIXED'; rs.primaryAxisSizingMode = 'AUTO'; rs.counterAxisAlignItems = 'MAX'; rs.fills = []; rs.clipsContent = false
bind(rs, { itemSpacing: 'gap/in-group' })
const ri = si.children.find(v => v.name === 'Status=Paid').createInstance(); ri.name = 'Icon'; rs.appendChild(ri)
const rt = frameAL('Texts', 'VERTICAL'); rt.counterAxisAlignItems = 'MAX'; rs.appendChild(rt); rt.layoutSizingHorizontal = 'FILL'; bind(rt, { itemSpacing: 'space/8' })
const rtt = await text('סטטוס התשלום', 'WF/Screen title'); rtt.name = 'Title'; wrapText(rtt, rt, 2)
const rtx = await text('מה קרה ומה יקרה עכשיו', 'WF/Body'); rtx.name = 'Text'; wrapText(rtx, rt, 4)
const rtl = await text('זה היה התשלום האחרון על הנכס הזה.', 'WF/Body'); rtl.name = 'Last payment'; wrapText(rtl, rt, 2)
const rab = C('WF/Button').children.find(v => v.name === 'Type=Text').createInstance(); rab.name = 'Agent button'; rs.appendChild(rab)
setP(rab, 'Label', 'לכתוב לסוכן'); setP(rab, 'Show icon', true); rab.layoutSizingHorizontal = 'HUG'
rtt.componentPropertyReferences = { characters: rs.addComponentProperty('Title', 'TEXT', 'סטטוס התשלום') }
rtx.componentPropertyReferences = { characters: rs.addComponentProperty('Text', 'TEXT', 'מה קרה ומה יקרה עכשיו') }
rtl.componentPropertyReferences = { visible: rs.addComponentProperty('Show last payment', 'BOOLEAN', false) }
rab.componentPropertyReferences = { visible: rs.addComponentProperty('Show agent button', 'BOOLEAN', false) }
ri.isExposedInstance = true; rab.isExposedInstance = true
rs.description = 'Статус-блок экрана результата оплаты, по правому краю: значок 48 (WF/Status icon) → заголовок-статус 24 (фокус) → пояснение 17 до 4 строк → «последний платёж» (оплачено) или «לכתוב לסוכן» (не прошло).'
place(rs)

return { created }
