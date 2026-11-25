// Wireframe Kit, шаг 10 (пачка «объект и сделка» Mayors: №5 Мои объекты → №6 Детали → №11 Шаги покупки → №39 Загрузка, 30.09).
// Требует шаги 1–9. Все имена — на английском.
// Добавляет / меняет:
//   WF/Status chip → набор Tone=Neutral / Action / Waiting / Done. В вайрфрейме тона выглядят ОДИНАКОВО — Tone несёт только смысл
//       для Дизайна (Action = нужно твоё действие; Waiting = ждём других; Done = сделано). Значок — слот: INSTANCE_SWAP «Icon»
//       (по умолчанию WF/Icon) + Show icon. Символов в тексте статуса нет нигде (правило Влада 30.09: «מושכר ✓» — слоп);
//   WF/Photo placeholder → набор State=Photo / Fallback. Fallback — заливка color/surface + значок-заглушка 32 по центру, без подписи
//       (объект без фото / фото ещё грузится; та же высота, что у фото);
//   WF/Stage row — вариантное свойство Type=Stage / Group (Group: маркер Paid, «N שלבים הושלמו» 17 + ссылка «להצגה» 15 — свойство Link),
//       булевы Show amount (ось шагов №11 без суммы) и Show meta (шаг без даты / оценки: строка 72, название по центру по вертикали —
//       через minHeight колонки Texts, чтобы строки №7 не сдвинулись);
//   WF/Task row — булево Show context (на №11 объект и шаг уже названы), строка комментария Comment (Show comment, 1 строка «…»),
//       строка статуса «Status line» = [Action 15][WF/Status chip] (Show action). Цвет Action — в инстансе (действие — color/action,
//       пояснение «מיכל תבדוק…» — color/text-secondary);
//   WF/Property card — карточка объекта №5: фото 350 × 160 → 12 → название 17 semibold (до 2 строк) → 4 → «יחידה · тип · комнаты» 15
//       → 8 → WF/Status chip (Show status). Без рамки и заливки: контейнер — само фото. Вся карточка — зона нажатия;
//   WF/File row (Mode=Edit / View) — файл на №39: [корзина 48][имя 17 / статус][превью 48]; статус = WF/Status chip + «60%» 15 +
//       тонкая полоса (Show progress) / «נסה שוב» (Show retry). View — без корзины;
//   WF/Rejection note — причина отказа (№39 «נדחה»): заливка color/surface, слот значка + «מיכל:» 15 → комментарий 17 целиком → дата 15;
//   WF/System action sheet — СЕРАЯ ЗАГЛУШКА системного меню iOS (не наш компонент): 3 строки + «ביטול» + home indicator.
//   WF/List row — превью [Subtitle][WF/Status chip] (Show status), превью до 2 строк, мин. 80, волосяная линия (хаб №6).
// WF/Source tile НЕ делаем (две плитки сняты Владом 30.09).
// Уроки шага: combineAsVariants над существующим компонентом сохраняет его id — инстансы на №1 и №7 не отваливаются,
//   ключи свойств меняются (Text#8:5 → Text#91:0), но переопределения в инстансах (№1 «חסר», «חדש», подписи фото) сохранились — проверено;
//   textDecoration у текстов разных вариантов, привязанных к одному TEXT-свойству, общий — для ссылки заводить своё свойство;
//   ОТКРЫТО: у WF/Button (kit-8, Type=Link) подчёркивание по той же причине ушло во ВСЕ варианты — новые инстансы Text / Secondary /
//   Primary приходят подчёркнутыми; в кадрах kit-10 снято переопределением textDecoration = NONE. Лечится своим свойством у Link;
//   клон варианта внутри набора теряет componentPropertyReferences — перепривязывать; textTruncation ставить ДО maxLines.
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
const radius = (n, v) => { for (const c of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) n.setBoundVariable(c, V(v)) }
const bind = (node, map) => { for (const [f, v] of Object.entries(map)) node.setBoundVariable(f, V(v)) }
const setP = (inst, name, val) => { const k = Object.keys(inst.componentProperties).find(k => k === name || k.startsWith(name + '#')); inst.setProperties({ [k]: val }) }
const key = (owner, name) => Object.keys(owner.componentPropertyDefinitions).find(k => k === name || k.startsWith(name + '#'))
async function T(chars, style, color, name, align = 'RIGHT') { const t = figma.createText(); await t.setTextStyleIdAsync(S(style).id); t.characters = chars; t.fills = [paint(color)]; t.textAlignHorizontal = align; t.name = name; return t }
function AL(name, dir) { const f = figma.createFrame(); f.name = name; f.layoutMode = dir; f.fills = []; f.clipsContent = false; f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'AUTO'; return f }
function wrap(t, parent, maxLines) { parent.appendChild(t); t.textAutoResize = 'HEIGHT'; t.layoutSizingHorizontal = 'FILL'; if (maxLines) { t.textTruncation = 'ENDING'; t.maxLines = maxLines } }
function setLayout(set, dir = 'HORIZONTAL') { set.layoutMode = dir; set.itemSpacing = 24; set.paddingLeft = set.paddingRight = set.paddingTop = set.paddingBottom = 16; set.fills = []; set.primaryAxisSizingMode = 'AUTO'; set.counterAxisSizingMode = 'AUTO'; set.clipsContent = false }
function hairline(n) { n.strokes = [paint('color/line')]; n.strokeAlign = 'INSIDE'; n.strokeTopWeight = 0; n.strokeLeftWeight = 0; n.strokeRightWeight = 0; n.strokeBottomWeight = 1 }
const created = [], changed = []
const Y0 = 3700

// 1. WF/Status chip → набор Tone
let chip = C('WF/Status chip')
if (chip.type === 'COMPONENT') {
  const kText0 = key(chip, 'Text'), kShow0 = key(chip, 'Show icon')
  chip.name = 'Tone=Neutral'
  const vs = [chip]
  for (const tone of ['Action', 'Waiting', 'Done']) { const c = chip.clone(); c.name = 'Tone=' + tone; vs.push(c) }
  const set = figma.combineAsVariants(vs, page); set.name = 'WF/Status chip'; setLayout(set); set.x = 200; set.y = 1000
  // перепривязка (клоны могли потерять ссылки)
  const kT = key(set, 'Text') || set.addComponentProperty('Text', 'TEXT', 'סטטוס')
  const kS = key(set, 'Show icon') || set.addComponentProperty('Show icon', 'BOOLEAN', true)
  const kI = key(set, 'Icon') || set.addComponentProperty('Icon', 'INSTANCE_SWAP', C('WF/Icon').id)
  for (const v of set.children) {
    v.findOne(n => n.type === 'TEXT').componentPropertyReferences = { characters: kT }
    v.findOne(n => n.type === 'INSTANCE').componentPropertyReferences = { visible: kS, mainComponent: kI }
  }
  // лишние дубли свойств после объединения
  for (const k of Object.keys(set.componentPropertyDefinitions)) if (k !== kT && k !== kS && k !== kI && set.componentPropertyDefinitions[k].type !== 'VARIANT') set.deleteComponentProperty(k)
  set.description = 'Статус словами — отдельный элемент, без символов в тексте (✓ Влад 30.09). Tone — смысл для Дизайна, в вайрфрейме тона одинаковы: Neutral — факт; Action — нужно твоё действие (заплатить, загрузить заново); Waiting — ждём других (проверка, обработка); Done — сделано. Значок — слот (Icon), заглушка. Вид (чип / точка + слово / строка) — Дизайн, визуальный ресерч «статус».'
  chip = set; changed.push(set.id)
}

// 2. WF/Photo placeholder → набор State
let photo = C('WF/Photo placeholder')
if (photo.type === 'COMPONENT') {
  photo.name = 'State=Photo'
  const fb = figma.createComponent(); fb.name = 'State=Fallback'; fb.resize(350, 180); fb.fills = [paint('color/surface')]; fb.clipsContent = false
  const ic = C('WF/Icon').createInstance(); ic.name = 'Building icon'; fb.appendChild(ic); ic.rescale(32 / 24); ic.x = (350 - 32) / 2; ic.y = (180 - 32) / 2; ic.constraints = { horizontal: 'CENTER', vertical: 'CENTER' }
  const set = figma.combineAsVariants([photo, fb], page); set.name = 'WF/Photo placeholder'; setLayout(set); set.x = 1372; set.y = 0
  set.description = 'Фото-заглушка. Photo — крест + подпись на иврите, что там будет. Fallback — нет фото / фото ещё грузится: нейтральная заливка + значок здания 32 (заглушка) по центру, без текста, тот же размер.'
  photo = set; changed.push(set.id)
}
const photoV = st => photo.children.find(c => c.name === 'State=' + st)

// 3. WF/Stage row — Type=Group, Show amount, Show meta
const sr = C('WF/Stage row')
if (!sr.children.find(c => c.name.includes('Type=Group'))) {
  const col = sr.children.find(c => c.name === 'State=Collapsed'), exp = sr.children.find(c => c.name === 'State=Expanded')
  const kAm = key(sr, 'Show amount') || sr.addComponentProperty('Show amount', 'BOOLEAN', true)
  const kMe = key(sr, 'Show meta') || sr.addComponentProperty('Show meta', 'BOOLEAN', true)
  col.findOne(n => n.name === 'Amount').componentPropertyReferences = { characters: key(sr, 'Amount'), visible: kAm }
  exp.findOne(n => n.name === 'Amount').componentPropertyReferences = { characters: key(sr, 'Amount'), visible: kAm }
  col.findOne(n => n.name === 'Meta').componentPropertyReferences = { characters: key(sr, 'Meta'), visible: kMe }
  const tx = col.findOne(n => n.name === 'Texts'); tx.minHeight = 48; tx.primaryAxisAlignItems = 'CENTER' // без Meta: строка 72, название по центру
  col.name = 'State=Collapsed, Type=Stage'; exp.name = 'State=Expanded, Type=Stage'
  const g = col.clone(); sr.appendChild(g); g.name = 'State=Collapsed, Type=Group'
  const refs = { Title: 'characters', Meta: 'characters', Amount: 'characters' }
  g.findOne(n => n.name === 'Title').componentPropertyReferences = { characters: key(sr, 'Title') }
  // Ссылка группы — СВОЁ текстовое свойство Link: у текстов, привязанных к одному TEXT-свойству в разных вариантах,
  // textDecoration оказался общим (подчёркивание Group уходило в Stage). Поэтому Meta → Link.
  const gm = g.findOne(n => n.name === 'Meta'); gm.name = 'Link'
  gm.componentPropertyReferences = { characters: sr.addComponentProperty('Link', 'TEXT', 'להצגה'), visible: kMe }
  gm.fills = [paint('color/action')]
  for (const v of sr.children) { const m = v.findOne(n => n.name === 'Meta' || n.name === 'Link'); m.textDecoration = v.name.includes('Group') ? 'UNDERLINE' : 'NONE' }
  g.findOne(n => n.name === 'Amount').componentPropertyReferences = { characters: key(sr, 'Amount'), visible: kAm }
  g.findOne(n => n.name === 'Divider').componentPropertyReferences = { visible: key(sr, 'Show divider') }
  g.findOne(n => n.name === 'Line top').componentPropertyReferences = { visible: key(sr, 'Show line top') }
  g.findOne(n => n.name === 'Line bottom').componentPropertyReferences = { visible: key(sr, 'Show line bottom') }
  const gmk = g.findOne(n => n.name === 'Marker'); gmk.swapComponent(C('WF/Stage marker').children.find(c => c.name === 'Status=Paid'))
  sr.description += ' Type=Group — строка-группа свёрнутых пройденных шагов (№11): маркер «пройдено», «N שלבים הושלמו» 17 + ссылка «להצגה» 15; тап раскрывает ранние шаги на месте. Show amount = off — ось шагов без суммы. Show meta = off — шаг без даты / оценки: строка 72, название по центру. (kit-10)'
  changed.push(sr.id)
}

// 4. WF/Task row — Show context, Comment, Status line [Action][chip]
const tr = C('WF/Task row')
if (!tr.findOne(n => n.name === 'Status line')) {
  const texts = tr.findOne(n => n.name === 'Texts')
  tr.findOne(n => n.name === 'Context').componentPropertyReferences = { characters: key(tr, 'Context'), visible: tr.addComponentProperty('Show context', 'BOOLEAN', true) }
  const cm = await T('מיכל: הערה', 'WF/Caption', 'color/text-secondary', 'Comment'); texts.insertChild(2, cm); cm.textAutoResize = 'HEIGHT'; cm.layoutSizingHorizontal = 'FILL'; cm.textTruncation = 'ENDING'; cm.maxLines = 1
  cm.componentPropertyReferences = { characters: tr.addComponentProperty('Comment', 'TEXT', 'מיכל: הערה'), visible: tr.addComponentProperty('Show comment', 'BOOLEAN', false) }
  const sl = AL('Status line', 'HORIZONTAL'); sl.counterAxisAlignItems = 'CENTER'; sl.setBoundVariable('itemSpacing', V('space/8'))
  texts.appendChild(sl)
  const act = await T('פעולה', 'WF/Caption', 'color/text-secondary', 'Action'); sl.appendChild(act)
  sl.appendChild(tr.findOne(n => n.name === 'Status'))
  act.componentPropertyReferences = { characters: tr.addComponentProperty('Action', 'TEXT', 'פעולה'), visible: tr.addComponentProperty('Show action', 'BOOLEAN', false) }
  tr.description = 'Задача: описание 17 (до 2 строк, «…»), контекст 15 (Show context; на №11 скрыт — объект и шаг названы), комментарий 15 в 1 строку (Show comment — «נדחה»), строка статуса [Action 15][WF/Status chip]. Цвет Action — в инстансе: действие — color/action, пояснение — color/text-secondary. Шеврон скрыт у задачи-оплаты. (kit-10)'
  changed.push(tr.id)
}

// 5. WF/Property card
const pc = figma.createComponent(); pc.name = 'WF/Property card'; pc.layoutMode = 'VERTICAL'; pc.resize(350, 200); pc.counterAxisSizingMode = 'FIXED'; pc.primaryAxisSizingMode = 'AUTO'; pc.counterAxisAlignItems = 'MAX'; pc.fills = []; pc.clipsContent = false
pc.setBoundVariable('itemSpacing', V('gap/in-group'))
const pph = photoV('Photo').createInstance(); pph.name = 'Photo'; pc.appendChild(pph); pph.resize(350, 160); pph.layoutSizingHorizontal = 'FILL'; setP(pph, 'Caption', 'תמונת הנכס'); pph.isExposedInstance = true
const info = AL('Info', 'VERTICAL'); info.counterAxisAlignItems = 'MAX'; info.setBoundVariable('itemSpacing', V('space/8')); pc.appendChild(info); info.layoutSizingHorizontal = 'FILL'
const ptx = AL('Texts', 'VERTICAL'); ptx.counterAxisAlignItems = 'MAX'; ptx.setBoundVariable('itemSpacing', V('space/4')); info.appendChild(ptx); ptx.layoutSizingHorizontal = 'FILL'
const pT = await T('Residence 21', 'WF/Body strong', 'color/text', 'Title'); wrap(pT, ptx, 2)
const pD = await T("יחידה 1204 · דירה · 2 חד'", 'WF/Caption', 'color/text-secondary', 'Details'); wrap(pD, ptx)
const pS = chip.children.find(c => c.name === 'Tone=Neutral').createInstance(); pS.name = 'Status'; info.appendChild(pS); setP(pS, 'Show icon', true); pS.isExposedInstance = true
pT.componentPropertyReferences = { characters: pc.addComponentProperty('Title', 'TEXT', 'Residence 21') }
pD.componentPropertyReferences = { characters: pc.addComponentProperty('Details', 'TEXT', "יחידה 1204 · דירה · 2 חד'") }
pS.componentPropertyReferences = { visible: pc.addComponentProperty('Show status', 'BOOLEAN', false) }
pc.description = 'Карточка объекта (№5): фото 350 × 160 первым → 12 → название 17 semibold до 2 строк → 4 → «יחידה · тип · комнаты» 15 → 8 → WF/Status chip (Show status: аренда у בנוי, «ממתין למסירת המפתח»). Без рамки и заливки — контейнер само фото. Нет фото — Photo: State=Fallback. Вся карточка — зона нажатия → №6, шеврона нет (как WF/Project card).'
pc.x = 0; pc.y = Y0; created.push(pc.id)

// 6. WF/File row
const fr = []
for (const mode of ['Edit', 'View']) {
  const c = figma.createComponent(); c.name = 'Mode=' + mode; c.layoutMode = 'HORIZONTAL'; c.resize(350, 72); c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'AUTO'; c.minHeight = 72; c.counterAxisAlignItems = 'CENTER'; c.fills = []; c.clipsContent = false
  bind(c, { itemSpacing: 'gap/in-group', paddingTop: 'gap/in-group', paddingBottom: 'gap/in-group' }); hairline(c)
  if (mode === 'Edit') {
    const del = AL('Delete', 'HORIZONTAL'); del.primaryAxisSizingMode = 'FIXED'; del.counterAxisSizingMode = 'FIXED'; del.resize(48, 48); del.primaryAxisAlignItems = 'CENTER'; del.counterAxisAlignItems = 'CENTER'; bind(del, { width: 'size/touch', height: 'size/touch' })
    const di = C('WF/Icon').createInstance(); di.name = 'Trash icon'; del.appendChild(di); c.appendChild(del)
  }
  const tx = AL('Texts', 'VERTICAL'); tx.counterAxisAlignItems = 'MAX'; tx.setBoundVariable('itemSpacing', V('space/4')); c.appendChild(tx); tx.layoutSizingHorizontal = 'FILL'
  const nm = await T('צילום 1', 'WF/Body', 'color/text', 'Name'); wrap(nm, tx, 1)
  const sl = AL('Status line', 'HORIZONTAL'); sl.counterAxisAlignItems = 'CENTER'; sl.setBoundVariable('itemSpacing', V('space/8')); tx.appendChild(sl)
  const rt = C('WF/Button').children.find(v => v.name === 'Type=Link').createInstance(); rt.name = 'Retry'; sl.appendChild(rt); setP(rt, 'Label', 'נסה שוב')
  const pct = await T('60%', 'WF/Caption', 'color/text-secondary', 'Percent'); sl.appendChild(pct)
  const st = chip.children.find(v => v.name === 'Tone=Done').createInstance(); st.name = 'Status'; sl.appendChild(st); setP(st, 'Text', 'הועלה'); st.isExposedInstance = true
  const bar = figma.createFrame(); bar.name = 'Progress'; bar.fills = [paint('color/line')]; bar.clipsContent = false; tx.appendChild(bar); bar.resize(200, 4); bar.layoutSizingHorizontal = 'FILL'; bar.cornerRadius = 2
  const val = figma.createRectangle(); val.name = 'Value'; val.fills = [paint('color/action')]; bar.appendChild(val); val.resize(bar.width * 0.6, 4); val.x = bar.width * 0.4; val.y = 0; val.cornerRadius = 2; val.constraints = { horizontal: 'SCALE', vertical: 'STRETCH' }
  const pv = photoV('Photo').createInstance(); pv.name = 'Preview'; c.appendChild(pv); pv.resize(48, 48); setP(pv, 'Caption', 'תמונה'); pv.isExposedInstance = true
  fr.push(c)
}
const frSet = figma.combineAsVariants(fr, page); frSet.name = 'WF/File row'; setLayout(frSet, 'VERTICAL')
const kN = frSet.addComponentProperty('Name', 'TEXT', 'צילום 1'), kP = frSet.addComponentProperty('Percent', 'TEXT', '60%')
const kSP = frSet.addComponentProperty('Show progress', 'BOOLEAN', false), kSR = frSet.addComponentProperty('Show retry', 'BOOLEAN', false), kSS = frSet.addComponentProperty('Show status', 'BOOLEAN', true)
for (const v of frSet.children) {
  v.findOne(n => n.name === 'Name').componentPropertyReferences = { characters: kN }
  v.findOne(n => n.name === 'Percent').componentPropertyReferences = { characters: kP, visible: kSP }
  v.findOne(n => n.name === 'Progress').componentPropertyReferences = { visible: kSP }
  v.findOne(n => n.name === 'Retry').componentPropertyReferences = { visible: kSR }
  v.findOne(n => n.name === 'Status line').componentPropertyReferences = { visible: kSS }
}
frSet.description = 'Файл на №39: [корзина 48][имя 17 в 1 строку / статус][превью 48 справа]. Статус — WF/Status chip: «מעלה» (Waiting) + «60%» + полоса (Show progress) · «הועלה» (Done) · «לא הועלה» (Action) + «נסה שוב» 48 (Show retry). Имя файла — LTR, в финале обрезка в середине (в Figma — «…» в конце). Mode=View — без корзины (просмотр «בבדיקה» / «התקבל»).'
frSet.x = 420; frSet.y = Y0; created.push(frSet.id)

// 7. WF/Rejection note
const rn = figma.createComponent(); rn.name = 'WF/Rejection note'; rn.layoutMode = 'VERTICAL'; rn.resize(350, 120); rn.counterAxisSizingMode = 'FIXED'; rn.primaryAxisSizingMode = 'AUTO'; rn.counterAxisAlignItems = 'MAX'; rn.clipsContent = false
rn.fills = [paint('color/surface')]; radius(rn, 'radius/container'); bind(rn, { paddingTop: 'space/16', paddingBottom: 'space/16', paddingLeft: 'space/16', paddingRight: 'space/16', itemSpacing: 'space/8' })
const rh = AL('Header', 'HORIZONTAL'); rh.counterAxisAlignItems = 'CENTER'; rh.setBoundVariable('itemSpacing', V('space/8')); rn.appendChild(rh)
const ra = await T('מיכל:', 'WF/Caption', 'color/text-secondary', 'Author'); rh.appendChild(ra)
const ri = C('WF/Icon').createInstance(); ri.name = 'Icon slot'; rh.appendChild(ri)
const rc = await T('הערת הסוכן', 'WF/Body', 'color/text', 'Comment'); wrap(rc, rn)
const rd = await T('12.09.2026', 'WF/Caption', 'color/text-secondary', 'Date'); wrap(rd, rn)
ra.componentPropertyReferences = { characters: rn.addComponentProperty('Author', 'TEXT', 'מיכל:') }
rc.componentPropertyReferences = { characters: rn.addComponentProperty('Comment', 'TEXT', 'הערת הסוכן') }
rd.componentPropertyReferences = { characters: rn.addComponentProperty('Date', 'TEXT', '12.09.2026') }
ri.componentPropertyReferences = { mainComponent: rn.addComponentProperty('Icon', 'INSTANCE_SWAP', C('WF/Icon').id) }
rn.description = 'Причина отказа (№39, вариант «נדחה»): единственная заливка экрана. Слот значка + автор 15 → комментарий агента 17 целиком → дата 15. Без красного, без «!» в тексте — вид Дизайн.'
rn.x = 900; rn.y = Y0; created.push(rn.id)

// 8. WF/System action sheet — заглушка системного меню
const sa = figma.createComponent(); sa.name = 'WF/System action sheet'; sa.layoutMode = 'VERTICAL'; sa.resize(390, 300); sa.counterAxisSizingMode = 'FIXED'; sa.primaryAxisSizingMode = 'AUTO'; sa.fills = []; sa.clipsContent = false
bind(sa, { paddingLeft: 'space/8', paddingRight: 'space/8', itemSpacing: 'space/8' })
async function sysGroup(name, labels, strong) {
  const g = AL(name, 'VERTICAL'); g.fills = [paint('color/surface')]; radius(g, 'radius/container'); sa.appendChild(g); g.layoutSizingHorizontal = 'FILL'
  for (let i = 0; i < labels.length; i++) {
    const r = AL('Option ' + (i + 1), 'HORIZONTAL'); r.primaryAxisAlignItems = 'CENTER'; r.counterAxisAlignItems = 'CENTER'; g.appendChild(r); r.layoutSizingHorizontal = 'FILL'; r.counterAxisSizingMode = 'FIXED'; r.resize(374, 56)
    if (i < labels.length - 1) hairline(r)
    r.appendChild(await T(labels[i], strong ? 'WF/Body strong' : 'WF/Body', 'color/text-secondary', 'Label', 'CENTER'))
  }
  return g
}
await sysGroup('Options', ['צילום תמונה או סרטון', 'ספריית תמונות', 'בחירת קובץ'], false)
await sysGroup('Cancel', ['ביטול'], true)
const shi = HI_COMP.createInstance(); shi.name = 'Home indicator'; sa.appendChild(shi); shi.layoutSizingHorizontal = 'FILL'; shi.fills = []
sa.description = 'ЗАГЛУШКА системного action sheet iOS (Android — системный выбор). НЕ наш компонент: тексты и порядок задаёт система, на языке телефона. Мы передаём только допустимые типы (фото, PDF). Серым, без стиля.'
sa.x = 1340; sa.y = Y0; created.push(sa.id)

// 9. WF/List row — строка-вход хаба №6: превью = [Subtitle][WF/Status chip] (Show status; статус в начале превью, RTL — справа),
//    превью до 2 строк, волосяная линия снизу (Show divider), мин. высота 80 (лист №6). До kit-10 компонент нигде не использовался.
const lr = C('WF/List row')
if (!lr.findOne(n => n.name === 'Preview')) {
  const texts = lr.findOne(n => n.name === 'Texts'), sub = texts.children[1]
  sub.name = 'Subtitle'; texts.children[0].name = 'Title'
  const pv = AL('Preview', 'HORIZONTAL'); pv.counterAxisAlignItems = 'MIN'; pv.setBoundVariable('itemSpacing', V('space/8'))
  texts.appendChild(pv); pv.layoutSizingHorizontal = 'FILL'
  pv.componentPropertyReferences = { visible: key(lr, 'Show subtitle') }
  sub.componentPropertyReferences = { characters: key(lr, 'Subtitle') }
  pv.appendChild(sub); sub.textAutoResize = 'HEIGHT'; sub.layoutSizingHorizontal = 'FILL'; sub.textTruncation = 'ENDING'; sub.maxLines = 2
  const st = chip.children.find(c => c.name === 'Tone=Neutral').createInstance(); st.name = 'Status'; pv.appendChild(st); st.isExposedInstance = true
  st.componentPropertyReferences = { visible: lr.addComponentProperty('Show status', 'BOOLEAN', false) }
  texts.setBoundVariable('itemSpacing', V('space/4'))
  lr.minHeight = 80; hairline(lr)
  lr.description = 'Строка-вход: значок 24 справа, заголовок 17 semibold, превью 15 до 2 строк (в начале превью — WF/Status chip, Show status), шеврон «вперёд» слева. Мин. 80, волосяная линия снизу. Вся строка — зона нажатия. (kit-10)'
  changed.push(lr.id)
}

return { created, changed, chipDefs: Object.keys(chip.componentPropertyDefinitions), photoDefs: Object.keys(photo.componentPropertyDefinitions), srDefs: Object.keys(sr.componentPropertyDefinitions), trDefs: Object.keys(tr.componentPropertyDefinitions) }
