// Wireframe Kit, шаг 6 (поток оплаты Mayors v1: №8 подтверждение и №10 результат-sheet, 29.09).
// Требует шаги 1–5. Все имена — на английском (правило Влада).
// Добавляет / меняет:
//   WF/Icon external — значок внешнего перехода 24 (RTL: стрелка к верхнему левому углу; рисунок — заглушка);
//   WF/Button — новое свойство Icon (INSTANCE_SWAP) для слота значка (WF/Icon по умолчанию, WF/Icon external);
//   WF/Status icon — 48 → 64 (rescale) + вариант Status=Checking (спиннер: дорожка + дуга);
//   WF/Result status — теперь набор State=Result / State=Checking:
//       Result: Icon 64 → Title (до 2 строк) → What line «что именно» (до 4) → Next line «что дальше» (до 3) / Last payment → Agent button;
//       Checking: спиннер 64 + одна строка 17;
//   WF/Amount block — подпись 15 → Number large → срок 15 (+ Show note — индексация), по правому краю;
//   WF/Scrim — затемнение родителя под sheet (color/action, прозрачность слоя 40 %);
//   WF/Result sheet (State=Result / Checking) — нижний sheet: скруглённый верх, ручка 36 × 4, строка ✕ справа без заголовка,
//       Body (space/8 · margin-screen · between-groups) → WF/Result status → WF/Sticky action bar (без линии) → home indicator.
//       Result — высота по содержимому; Checking — без панели, фиксированная высота (= высоте «оплачено», задаётся в инстансе).
// Уроки шага:
//   • textTruncation ставить ДО maxLines (иначе maxLines сбрасывается в 1);
//   • у скрытого слоя layoutSizing* читается как FIXED/FIXED — это артефакт чтения, проверять на видимом инстансе;
//   • opacity у paint с привязанной переменной теряется в инстансах — затемнение делать прозрачностью слоя;
//   • после правки мастеров проверить FILL у инстансов (здесь не сбросились) и скрыть новые булевы части у старых инстансов (v0: Show next line = off).
const page = figma.root.children.find(p => p.name === 'Wireframe Kit')
await figma.setCurrentPageAsync(page)
const vars = await figma.variables.getLocalVariablesAsync()
const V = n => vars.find(v => v.name === n)
const styles = await figma.getLocalTextStylesAsync()
for (const s of styles) await figma.loadFontAsync(s.fontName)
const S = n => styles.find(s => s.name === n)
const C = n => page.findOne(x => (x.type === 'COMPONENT' || x.type === 'COMPONENT_SET') && x.name === n)
// Системные элементы iPhone — НАСТОЯЩИЕ компоненты Влада (30.09). В Mayors лежат на странице «Page 1» файла вайрфреймов.
// Ищем по id и сверяем key (id в другом файле может принадлежать чужому узлу); не нашли — importComponentByKeyAsync
// (сработает, если компоненты опубликованы библиотекой и она подключена); не вышло — серая заглушка кита WF/* (fallback).
const IOS = {
  statusBar: { id: '171:4616', key: '581bf7daabe66f1ed079d93320338076ca4cedba' },       // Status bar - iPhone, Property 1=dark (тёмные значки, светлый фон)
  statusBarWhite: { id: '171:4614', key: '44188c10269933ae5cf1042c10997421bb78100c' },  // Property 1=white (белые значки — на тёмном фоне / фото)
  homeIndicator: { id: '171:4635', key: '19e856cabe695eee0265995a877e04b12e6528f6' },   // home-indicator 358 × 34 → в кадре растянуть до 390
  keyboard: {                                                                            // Keyboard/Default, 402 шириной → в кадре 390 + дети FILL
    'Phone pad': { id: '171:6327', key: '47b43896a0f5921865bf07ab3d4ac936d2c0415a' },                  // 310, без подсказки
    'Phone pad with suggestion': { id: '171:6333', key: '380125dc417025302ad1ad70edb53e1ea7cf64c1' },  // 346, подсказка кода из SMS
    'Email': { id: '171:6329', key: '176a6ed352a2b0edf24619fe0d23055aae05ba41' },                      // 355, QWERTY + @ + подсказка
    'Text': { id: '171:6331', key: '01ce7f1fde40d25846e079b79f061c1e25352a76' },                       // 306, QWERTY «→»
    'Numbers & symbols': { id: '171:6332', key: 'e00be7b2f81c28a404e901ba1c126fcc769c9619' },          // 306
    'Text dark': { id: '171:6330', key: '0b1bd167e9fbf1adf447b3b58761286065bfc541' },                  // 306, тёмная
    'Text dark with suggestions': { id: '171:6328', key: '02b62cabe3af7569b84a6186839f541f7a268bc6' }  // 350, тёмная, подсказки слов
  }
}
async function iosComp(ref) {
  const n = await figma.getNodeByIdAsync(ref.id)
  if (n && n.type === 'COMPONENT' && n.key === ref.key) return n
  try { return await figma.importComponentByKeyAsync(ref.key) } catch (e) { return null }
}
// Вписать инстанс клавиатуры iPhone в кадр 390: ширина 390, высота компонента, дети фиксированной ширины → FILL (иначе вылезают на 12).
function fitKeyboard(inst, w = 390) { inst.resize(w, inst.height); for (const c of inst.children) if (c.layoutPositioning !== 'ABSOLUTE' && c.layoutSizingHorizontal === 'FIXED' && c.width > 300) c.layoutSizingHorizontal = 'FILL' }
const HI_COMP = (await iosComp(IOS.homeIndicator)) || C('WF/Home indicator') // настоящий home indicator iPhone; нет — заглушка кита
const paint = n => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', V(n))
const setP = (inst, name, val) => { const k = Object.keys(inst.componentProperties).find(k => k === name || k.startsWith(name + '#')); inst.setProperties({ [k]: val }) }
const bind = (node, map) => { for (const [f, v] of Object.entries(map)) node.setBoundVariable(f, V(v)) }
async function text(chars, style, color, name, parent, maxLines) {
  const t = figma.createText(); await t.setTextStyleIdAsync(S(style).id); t.characters = chars; t.fills = [paint(color)]; t.textAlignHorizontal = 'RIGHT'; t.name = name
  parent.appendChild(t); t.textAutoResize = 'HEIGHT'; t.layoutSizingHorizontal = 'FILL'
  if (maxLines) { t.textTruncation = 'ENDING'; t.maxLines = maxLines }
  return t
}
const created = []

// 1. Значок внешнего перехода
const ic = figma.createComponent(); ic.name = 'WF/Icon external'; ic.resize(24, 24); ic.fills = []; ic.clipsContent = false
const gl = figma.createVector(); gl.name = 'Glyph'
gl.vectorPaths = [{ windingRule: 'NONE', data: 'M 6 13 L 6 20 L 20 20 L 20 6 L 13 6 M 9 3 L 3 3 L 3 9 M 14 14 L 3 3' }]
gl.strokes = [paint('color/action')]; gl.strokeWeight = 2; gl.strokeCap = 'ROUND'; gl.strokeJoin = 'ROUND'; ic.appendChild(gl); gl.x = 3; gl.y = 3
ic.description = 'Значок внешнего перехода (уход во внешний сервис — шлюз оплаты). RTL: стрелка к верхнему левому углу. Рисунок — заглушка, решает Дизайн. В основной кнопке перекрашивается в color/on-action.'
ic.x = 0; ic.y = 2400; created.push(ic.id)

// 2. WF/Button: слот значка — INSTANCE_SWAP
const btn = C('WF/Button')
let kIcon = Object.keys(btn.componentPropertyDefinitions).find(k => k.startsWith('Icon#'))
if (!kIcon) kIcon = btn.addComponentProperty('Icon', 'INSTANCE_SWAP', C('WF/Icon').id, { preferredValues: [{ type: 'COMPONENT', key: C('WF/Icon').key }, { type: 'COMPONENT', key: ic.key }] })
for (const v of btn.children) { const i = v.findOne(n => n.type === 'INSTANCE' && n.name === 'WF/Icon'); i.componentPropertyReferences = Object.assign({}, i.componentPropertyReferences, { mainComponent: kIcon }) }

// 3. WF/Status icon: 64 + Checking
const si = C('WF/Status icon')
for (const c of si.children) if (c.width < 60) c.rescale(64 / c.width)
const chkIcon = figma.createComponent(); chkIcon.name = 'Status=Checking'; chkIcon.resize(64, 64); chkIcon.fills = []; chkIcon.clipsContent = false
{ const s = 64 / 24
  const tr = figma.createEllipse(); tr.name = 'Track'; tr.resize(20 * s, 20 * s); tr.x = tr.y = 2 * s; tr.fills = []; tr.strokes = [paint('color/line')]; tr.strokeWeight = 2 * s; tr.strokeAlign = 'INSIDE'; chkIcon.appendChild(tr)
  const arc = figma.createEllipse(); arc.name = 'Spinner arc'; arc.resize(20 * s, 20 * s); arc.x = arc.y = 2 * s; arc.fills = []; arc.strokes = [paint('color/action')]; arc.strokeWeight = 2 * s; arc.strokeAlign = 'INSIDE'; arc.strokeCap = 'ROUND'
  arc.arcData = { startingAngle: -Math.PI / 2, endingAngle: 0, innerRadius: 1 }; chkIcon.appendChild(arc) }
si.appendChild(chkIcon)
si.description = 'Значок 64 статус-блока результата оплаты: галочка / часы / «!» (нейтральный) / Checking — спиннер «проверяем» на месте будущего значка. Цвет — дело Дизайна.'

// 4. WF/Result status → набор State=Result / Checking
const rs = C('WF/Result status')
const texts = rs.findOne(n => n.name === 'Texts')
const what = texts.findOne(n => n.name === 'Text'); what.name = 'What line'
rs.editComponentProperty(Object.keys(rs.componentPropertyDefinitions).find(k => k.startsWith('Text#')), { name: 'What line' })
what.textTruncation = 'ENDING'; what.maxLines = 4
const ttl = texts.findOne(n => n.name === 'Title'); ttl.textTruncation = 'ENDING'; ttl.maxLines = 2
const nx = figma.createText(); await nx.setTextStyleIdAsync(S('WF/Body').id); nx.characters = 'מה יקרה עכשיו'; nx.fills = [paint('color/text')]; nx.textAlignHorizontal = 'RIGHT'; nx.name = 'Next line'
texts.insertChild(texts.children.indexOf(what) + 1, nx); nx.textAutoResize = 'HEIGHT'; nx.layoutSizingHorizontal = 'FILL'; nx.textTruncation = 'ENDING'; nx.maxLines = 3
nx.componentPropertyReferences = { characters: rs.addComponentProperty('Next line', 'TEXT', 'מה יקרה עכשיו'), visible: rs.addComponentProperty('Show next line', 'BOOLEAN', true) }
{ const old = texts.findOne(n => n.name === 'Last payment'); const idx = texts.children.indexOf(old); const ref = old.componentPropertyReferences; old.remove()
  const lp = figma.createText(); await lp.setTextStyleIdAsync(S('WF/Body').id); lp.characters = 'זה היה התשלום האחרון על הנכס הזה — כל הלוח שולם.'; lp.fills = [paint('color/text')]; lp.textAlignHorizontal = 'RIGHT'; lp.name = 'Last payment'
  texts.insertChild(idx, lp); lp.textAutoResize = 'HEIGHT'; lp.layoutSizingHorizontal = 'FILL'; lp.textTruncation = 'ENDING'; lp.maxLines = 2; lp.componentPropertyReferences = ref }
const chk = figma.createComponent(); chk.name = 'State=Checking'; chk.layoutMode = 'VERTICAL'; chk.resize(350, 100)
chk.counterAxisSizingMode = 'FIXED'; chk.primaryAxisSizingMode = 'AUTO'; chk.counterAxisAlignItems = 'MAX'; chk.fills = []; chk.clipsContent = false; bind(chk, { itemSpacing: 'gap/in-group' })
const spin = chkIcon.createInstance(); spin.name = 'Icon'; chk.appendChild(spin)
const cl = await text('בודקים את סטטוס התשלום…', 'WF/Body', 'color/text', 'Checking line', chk, 2)
rs.name = 'State=Result'
const rsSet = figma.combineAsVariants([rs, chk], page); rsSet.name = 'WF/Result status'
rsSet.layoutMode = 'HORIZONTAL'; rsSet.itemSpacing = 24; rsSet.paddingLeft = rsSet.paddingRight = rsSet.paddingTop = rsSet.paddingBottom = 16; rsSet.fills = []
rsSet.primaryAxisSizingMode = 'AUTO'; rsSet.counterAxisSizingMode = 'AUTO'; rsSet.clipsContent = false; rsSet.x = 0; rsSet.y = 2100
cl.componentPropertyReferences = { characters: rsSet.addComponentProperty('Checking line', 'TEXT', 'בודקים את סטטוס התשלום…') }
rsSet.description = 'Статус-блок результата оплаты, по правому краю. State=Result: значок 64 → 12 → заголовок-статус (до 2 строк, фокус) → 8 → What line (17, до 4) → 8 → Next line (17, до 3) или Last payment → 12 → «לכתוב לסוכן». State=Checking: спиннер 64 + одна строка 17.'
// старые инстансы (v0) не должны получить новую строку
for (const i of await rs.getInstancesAsync()) { if (i.layoutSizingHorizontal !== 'FILL' && i.parent && i.parent.layoutMode && i.parent.layoutMode !== 'NONE') i.layoutSizingHorizontal = 'FILL'; setP(i, 'Show next line', false) }

// 5. Блок суммы
const ab = figma.createComponent(); ab.name = 'WF/Amount block'; ab.layoutMode = 'VERTICAL'; ab.resize(350, 100)
ab.counterAxisSizingMode = 'FIXED'; ab.primaryAxisSizingMode = 'AUTO'; ab.counterAxisAlignItems = 'MAX'; ab.fills = []; ab.clipsContent = false; bind(ab, { itemSpacing: 'space/4' })
const aL = await text('סכום לתשלום', 'WF/Caption', 'color/text-secondary', 'Label', ab, 1)
const aA = await text('0 ₪', 'WF/Number large', 'color/text', 'Amount', ab, 1)
const aD = await text('לתשלום עד', 'WF/Caption', 'color/text', 'Due', ab, 2)
const aN = await text('הסכום עודכן לפי מדד תשומות הבנייה', 'WF/Caption', 'color/text-secondary', 'Note', ab, 2)
aL.componentPropertyReferences = { characters: ab.addComponentProperty('Label', 'TEXT', 'סכום לתשלום') }
aA.componentPropertyReferences = { characters: ab.addComponentProperty('Amount', 'TEXT', '0 ₪') }
aD.componentPropertyReferences = { characters: ab.addComponentProperty('Due', 'TEXT', 'לתשלום עד') }
aN.componentPropertyReferences = { characters: ab.addComponentProperty('Note', 'TEXT', 'הסכום עודכן לפי מדד תשומות הבנייה'), visible: ab.addComponentProperty('Show note', 'BOOLEAN', false) }
ab.description = 'Блок суммы экрана подтверждения (ранг 1), по правому краю: подпись 15 → 4 → крупное число (Number large, одна строка) → 4 → срок 15 (до 2 строк; просрочка — «היה לתשלום עד… · באיחור N ימים»). Show note — строка об индексации.'
ab.x = 104; ab.y = 2400; created.push(ab.id)

// 6. Затемнение
const sc = figma.createComponent(); sc.name = 'WF/Scrim'; sc.resize(390, 844); sc.clipsContent = false
sc.fills = [paint('color/action')]; sc.opacity = 0.4
sc.description = 'Затемнение родительского экрана под нижним sheet (color/action, прозрачность слоя 40 %). На весь кадр.'
sc.x = 534; sc.y = 2400; created.push(sc.id)

// 7. Нижний sheet результата
const variants = []
for (const st of ['Result', 'Checking']) {
  const sh = figma.createComponent(); sh.name = 'State=' + st; sh.layoutMode = 'VERTICAL'; sh.resize(390, 438)
  sh.counterAxisSizingMode = 'FIXED'; sh.primaryAxisSizingMode = st === 'Result' ? 'AUTO' : 'FIXED'; sh.counterAxisAlignItems = 'MAX'; sh.clipsContent = false
  sh.fills = [paint('color/bg')]; bind(sh, { topLeftRadius: 'radius/container', topRightRadius: 'radius/container' })
  const h = C('WF/Header close').createInstance(); h.name = 'Header'; sh.appendChild(h); h.layoutSizingHorizontal = 'FILL'; setP(h, 'Show title', false); h.fills = []
  const body = figma.createFrame(); body.name = 'Body'; body.layoutMode = 'VERTICAL'; body.fills = []; body.clipsContent = false; body.counterAxisAlignItems = 'MAX'; body.primaryAxisSizingMode = 'AUTO'
  sh.appendChild(body); body.layoutSizingHorizontal = 'FILL'; body.layoutSizingVertical = st === 'Checking' ? 'FILL' : 'HUG'
  bind(body, { paddingTop: 'space/8', paddingBottom: 'gap/between-groups', paddingLeft: 'layout/margin-screen', paddingRight: 'layout/margin-screen' })
  const r = rsSet.children.find(c => c.name === 'State=' + st).createInstance(); r.name = 'Result status'; body.appendChild(r); r.layoutSizingHorizontal = 'FILL'; r.isExposedInstance = true
  if (st === 'Result') { const b = C('WF/Sticky action bar').createInstance(); b.name = 'Action bar'; sh.appendChild(b); b.layoutSizingHorizontal = 'FILL'; setP(b, 'Show divider', false); b.isExposedInstance = true; setP(b.findOne(n => n.name === 'Button'), 'Label', 'הבנתי') }
  const hi = HI_COMP.createInstance(); hi.name = 'Home indicator'; sh.appendChild(hi); hi.layoutSizingHorizontal = 'FILL'
  const g = figma.createRectangle(); g.name = 'Grabber'; g.resize(36, 4); g.fills = [paint('color/placeholder')]; g.cornerRadius = 2
  sh.appendChild(g); g.layoutPositioning = 'ABSOLUTE'; g.x = 177; g.y = 6; g.constraints = { horizontal: 'CENTER', vertical: 'MIN' }
  variants.push(sh)
}
const rsh = figma.combineAsVariants(variants, page); rsh.name = 'WF/Result sheet'
rsh.layoutMode = 'HORIZONTAL'; rsh.itemSpacing = 24; rsh.paddingLeft = rsh.paddingRight = rsh.paddingTop = rsh.paddingBottom = 16; rsh.fills = []
rsh.primaryAxisSizingMode = 'AUTO'; rsh.counterAxisSizingMode = 'AUTO'; rsh.clipsContent = false; rsh.counterAxisAlignItems = 'MAX'; rsh.x = 1004; rsh.y = 2400
rsh.description = 'Нижний sheet результата оплаты (№10) поверх экрана, где начата оплата; под ним — WF/Scrim. Result — высота по содержимому (≤ 80 % кадра); Checking — без панели, фиксированная высота = высоте «оплачено» (задать в инстансе), чтобы sheet не прыгал.'
created.push(rsh.id)

// Короткий статус — ПО ЦЕНТРУ (Влад 29.09, увидев кадры: «почему всё приклеено к правой части… где видано, чтоб спиннер был справа»).
// Правая вертикаль — только для длинного содержания (№7, №8). Кнопка на всю ширину, ✕ справа.
// (rsSet объявлен выше, в шаге 4 — повторный const давал SyntaxError; исправлено сборщиком)
for (const comp of rsSet.children) {
  comp.counterAxisAlignItems = 'CENTER'
  for (const f of comp.findAll(n => n.type === 'FRAME' && n.layoutMode === 'VERTICAL')) f.counterAxisAlignItems = 'CENTER'
  for (const t of comp.findAll(n => n.type === 'TEXT')) t.textAlignHorizontal = 'CENTER'
}
for (const v of rsh.children) {
  const b = v.findOne(n => n.name === 'Body'); if (!b) continue
  b.counterAxisAlignItems = 'CENTER'
  if (v.name === 'State=Checking') b.primaryAxisAlignItems = 'CENTER' // спиннер — в оптическом центре sheet, не у шапки (P17)
}

return { created }
