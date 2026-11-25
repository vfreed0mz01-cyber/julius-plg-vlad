// Wireframe Kit, шаг 3: составные компоненты мобайла (RTL).
// Статус-бар и домашний индикатор — только заглушки-fallback, если нет настоящих компонентов iPhone (IOS ниже); шевроны, шапка корня и «назад», строка списка, заголовок секции, число с подписью, таббар.
// Требует шаги 1–2. Порядок детей в горизонтальных auto-layout — ВИЗУАЛЬНЫЙ слева направо (т.е. для RTL логический порядок перевёрнут).
const page = figma.root.children.find(p => p.name === 'Wireframe Kit')
await figma.setCurrentPageAsync(page)
// фикс шага 2: наборы вариантов обнимают содержимое
for (const n of page.children) if (n.type === 'COMPONENT_SET') { n.primaryAxisSizingMode = 'AUTO'; n.counterAxisSizingMode = 'AUTO'; n.counterAxisAlignItems = 'CENTER' }
const vars = await figma.variables.getLocalVariablesAsync()
const V = n => vars.find(v => v.name === n)
const styles = await figma.getLocalTextStylesAsync()
const S = n => styles.find(s => s.name === n)
for (const s of styles) await figma.loadFontAsync(s.fontName)
const C = n => page.findOne(x => (x.type === 'COMPONENT' || x.type === 'COMPONENT_SET') && x.name === n)
const variant = (setName, props) => C(setName).children.find(v => Object.entries(props).every(([k, val]) => v.name.includes(`${k}=${val}`)))
const fill = (node, varName) => { node.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', V(varName))] }
const stroke = (node, varName, w = 1) => { node.strokes = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', V(varName))]; node.strokeWeight = w }
async function text(chars, style, color = 'color/text') {
  const t = figma.createText(); await t.setTextStyleIdAsync(S(style).id)
  t.characters = chars; fill(t, color); t.textAlignHorizontal = 'RIGHT'; return t
}
function hbox(name, gap = 0) { const f = figma.createComponent(); f.name = name; f.layoutMode = 'HORIZONTAL'; f.itemSpacing = gap; f.fills = []; f.counterAxisAlignItems = 'CENTER'; return f }
const created = []
let Y = 300, X = 0
function place(n) { n.x = X; n.y = Y; X += n.width + 80; if (X > 2400) { X = 0; Y += 260 } created.push(n.id) }

// Шевроны
async function chevron(name, dir) {
  const c = figma.createComponent(); c.name = name; c.resize(24, 24); c.fills = []
  const v = figma.createVector()
  v.vectorPaths = [{ windingRule: 'NONE', data: dir === 'right' ? 'M 9 6 L 15 12 L 9 18' : 'M 15 6 L 9 12 L 15 18' }]
  stroke(v, 'color/text', 2); v.strokeCap = 'ROUND'; v.strokeJoin = 'ROUND'; c.appendChild(v); return c
}
const back = await chevron('WF/Chevron back (RTL, right)', 'right'); place(back)
const fwd = await chevron('WF/Chevron forward (RTL, left)', 'left'); place(fwd)

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

// Статус-бар и домашний индикатор: если настоящие компоненты iPhone есть — заглушки НЕ создаём, кадры ставят IOS.* напрямую.
const realSB = await iosComp(IOS.statusBar), realHI = await iosComp(IOS.homeIndicator)
if (!realSB) {
  // Статус-бар — ЗАГЛУШКА (fallback)
  const sb = hbox('WF/Status bar'); sb.resize(390, 47); sb.primaryAxisSizingMode = 'FIXED'; sb.counterAxisSizingMode = 'FIXED'
  sb.primaryAxisAlignItems = 'SPACE_BETWEEN'; sb.paddingLeft = sb.paddingRight = 24; fill(sb, 'color/bg')
  const time = await text('9:41', 'WF/Body strong'); sb.appendChild(time)
  const sysIcons = figma.createFrame(); sysIcons.resize(66, 12); sysIcons.cornerRadius = 3; fill(sysIcons, 'color/placeholder'); sb.appendChild(sysIcons)
  place(sb)
}
if (!realHI) {
  // Домашний индикатор — ЗАГЛУШКА (fallback)
  const hi = figma.createComponent(); hi.name = 'WF/Home indicator'; hi.resize(390, 34); fill(hi, 'color/bg')
  const bar = figma.createRectangle(); bar.resize(134, 5); bar.cornerRadius = 3; fill(bar, 'color/action'); hi.appendChild(bar); bar.x = 128; bar.y = 21
  bar.constraints = { horizontal: 'CENTER', vertical: 'MAX' }
  place(hi)
}

// Шапка корня вкладки: [уведомления] [заголовок] [чат] — RTL: чат справа, уведомления слева
const hr = hbox('WF/Header root'); hr.resize(390, 56); hr.primaryAxisSizingMode = 'FIXED'; hr.counterAxisSizingMode = 'FIXED'
hr.primaryAxisAlignItems = 'SPACE_BETWEEN'; hr.paddingLeft = hr.paddingRight = 12; fill(hr, 'color/bg')
const notif = variant('WF/Icon button', { 'Badge': 'Count' }).createInstance(); hr.appendChild(notif)
const htitle = await text('ראשי', 'WF/Body strong'); htitle.textAlignHorizontal = 'CENTER'; hr.appendChild(htitle)
const chat = variant('WF/Icon button', { 'Badge': 'None' }).createInstance(); hr.appendChild(chat)
const hrk = hr.addComponentProperty('Title', 'TEXT', 'ראשי'); htitle.componentPropertyReferences = { characters: hrk }
hr.description = 'Корень вкладки: чат справа, уведомления слева (со счётчиком). Смысл иконок — в аннотации.'
place(hr)

// Шапка «назад»: [место под действие 48] [заголовок] [назад →]
const hb = hbox('WF/Header back'); hb.resize(390, 56); hb.primaryAxisSizingMode = 'FIXED'; hb.counterAxisSizingMode = 'FIXED'
hb.primaryAxisAlignItems = 'SPACE_BETWEEN'; hb.paddingLeft = hb.paddingRight = 12; fill(hb, 'color/bg')
const spacer = figma.createFrame(); spacer.resize(48, 48); spacer.fills = []; spacer.name = 'Action (empty)'; hb.appendChild(spacer)
const btitle = await text('כותרת', 'WF/Body strong'); btitle.textAlignHorizontal = 'CENTER'; hb.appendChild(btitle)
const backBtn = figma.createFrame(); backBtn.name = 'Back'; backBtn.resize(48, 48); backBtn.fills = []
backBtn.layoutMode = 'HORIZONTAL'; backBtn.primaryAxisAlignItems = 'CENTER'; backBtn.counterAxisAlignItems = 'CENTER'
backBtn.appendChild(back.createInstance()); hb.appendChild(backBtn)
const hbk = hb.addComponentProperty('Title', 'TEXT', 'כותרת'); btitle.componentPropertyReferences = { characters: hbk }
place(hb)

// Строка списка: [шеврон/значение] [тексты FILL] [иконка/аватар]
const li = hbox('WF/List row', 12); li.resize(350, 72); li.primaryAxisSizingMode = 'FIXED'; li.counterAxisSizingMode = 'AUTO'
li.paddingTop = li.paddingBottom = 12; li.minHeight = 64
li.appendChild(fwd.createInstance())
const col = figma.createFrame(); col.name = 'Texts'; col.layoutMode = 'VERTICAL'; col.itemSpacing = 2; col.fills = []
col.counterAxisAlignItems = 'MAX'; li.appendChild(col); col.layoutSizingHorizontal = 'FILL'; col.layoutSizingVertical = 'HUG'
const lt = await text('כותרת השורה', 'WF/Body strong'); col.appendChild(lt); lt.layoutSizingHorizontal = 'FILL'
const ls = await text('תיאור משני', 'WF/Caption', 'color/text-secondary'); col.appendChild(ls); ls.layoutSizingHorizontal = 'FILL'
li.appendChild(C('WF/Icon').createInstance())
const k1 = li.addComponentProperty('Title', 'TEXT', 'כותרת השורה'); lt.componentPropertyReferences = { characters: k1 }
const k2 = li.addComponentProperty('Subtitle', 'TEXT', 'תיאור משני'); ls.componentPropertyReferences = { characters: k2 }
const k3 = li.addComponentProperty('Show subtitle', 'BOOLEAN', true); ls.componentPropertyReferences = { characters: k2, visible: k3 }
place(li)

// Заголовок секции: [ссылка «все»] [заголовок]
const sh = hbox('WF/Section title'); sh.resize(350, 32); sh.primaryAxisSizingMode = 'FIXED'; sh.counterAxisSizingMode = 'AUTO'
sh.primaryAxisAlignItems = 'SPACE_BETWEEN'; sh.counterAxisAlignItems = 'BASELINE'
const sl = await text('הכל', 'WF/Caption', 'color/action'); sl.textDecoration = 'UNDERLINE'; sh.appendChild(sl)
const st = await text('כותרת מקטע', 'WF/Section title'); sh.appendChild(st)
const s1 = sh.addComponentProperty('Title', 'TEXT', 'כותרת מקטע'); st.componentPropertyReferences = { characters: s1 }
const s2 = sh.addComponentProperty('Link', 'TEXT', 'הכל'); const s3 = sh.addComponentProperty('Show link', 'BOOLEAN', true)
sl.componentPropertyReferences = { characters: s2, visible: s3 }
place(sh)

// Число с подписью (подпись над числом, выравнивание вправо)
const kpi = figma.createComponent(); kpi.name = 'WF/Stat'; kpi.layoutMode = 'VERTICAL'; kpi.itemSpacing = 4; kpi.fills = []
kpi.primaryAxisSizingMode = 'AUTO'; kpi.counterAxisSizingMode = 'AUTO'; kpi.counterAxisAlignItems = 'MAX'
const kl = await text('שווי התיק', 'WF/Caption', 'color/text-secondary'); kpi.appendChild(kl)
const kn = await text('₪ 4,850,000', 'WF/Number large'); kpi.appendChild(kn)
const kc = await text('+3.2% מאז הרבעון הקודם', 'WF/Caption', 'color/text-secondary'); kpi.appendChild(kc)
const q1 = kpi.addComponentProperty('Caption', 'TEXT', 'שווי התיק'); kl.componentPropertyReferences = { characters: q1 }
const q2 = kpi.addComponentProperty('Count', 'TEXT', '₪ 4,850,000'); kn.componentPropertyReferences = { characters: q2 }
const q3 = kpi.addComponentProperty('Context', 'TEXT', '+3.2% מאז הרבעון הקודם'); const q4 = kpi.addComponentProperty('Show context', 'BOOLEAN', true)
kc.componentPropertyReferences = { characters: q3, visible: q4 }
kpi.description = 'Число никогда без подписи; контекст (дата, изменение) — по возможности.'
place(kpi)

// Таббар: 4 вкладки, RTL — первая вкладка справа. Варианты = какая активна.
const tabNames = ['ראשי', 'הנכסים שלי', 'אנליטיקה', 'פרופיל'] // логический порядок (справа налево)
const tbVariants = []
for (let a = 0; a < 4; a++) {
  const c = figma.createComponent(); c.name = 'Active tab=' + (a + 1)
  c.layoutMode = 'HORIZONTAL'; c.resize(390, 60); c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'FIXED'
  fill(c, 'color/bg'); c.strokes = []; stroke(c, 'color/line', 1); c.strokeAlign = 'INSIDE'
  c.strokeTopWeight = 1; c.strokeBottomWeight = 0; c.strokeLeftWeight = 0; c.strokeRightWeight = 0
  for (let i = 3; i >= 0; i--) { // визуально слева направо: 4,3,2,1
    const tab = figma.createFrame(); tab.name = 'Tab ' + (i + 1); tab.layoutMode = 'VERTICAL'; tab.itemSpacing = 4; tab.fills = []
    tab.primaryAxisAlignItems = 'CENTER'; tab.counterAxisAlignItems = 'CENTER'; c.appendChild(tab)
    tab.layoutSizingHorizontal = 'FILL'; tab.layoutSizingVertical = 'FILL'
    tab.appendChild(C('WF/Icon').createInstance())
    const t = await text(tabNames[i], i === a ? 'WF/Label' : 'WF/Label', i === a ? 'color/action' : 'color/text-secondary')
    t.textAlignHorizontal = 'CENTER'; if (i === a) t.fontName = { family: 'Heebo', style: 'Bold' }
    t.name = 'Label ' + (i + 1); tab.appendChild(t)
  }
  tbVariants.push(c)
}
const tb = figma.combineAsVariants(tbVariants, page); tb.name = 'WF/Tab bar'
tb.layoutMode = 'VERTICAL'; tb.itemSpacing = 24; tb.paddingLeft = tb.paddingRight = tb.paddingTop = tb.paddingBottom = 16; tb.fills = []
tb.primaryAxisSizingMode = 'AUTO'; tb.counterAxisSizingMode = 'AUTO'
const tabKeys = []
for (let i = 0; i < 4; i++) tabKeys.push(tb.addComponentProperty('Tab ' + (i + 1), 'TEXT', tabNames[i]))
for (const v of tb.children) for (let i = 0; i < 4; i++) v.findOne(n => n.name === 'Label ' + (i + 1)).componentPropertyReferences = { characters: tabKeys[i] }
tb.description = 'RTL: вкладка 1 (главная) справа. Подписи всегда. Активная — самым тёмным и жирным.'
place(tb)

return { created }
