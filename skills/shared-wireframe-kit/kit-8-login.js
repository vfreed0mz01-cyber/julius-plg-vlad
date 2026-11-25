// Wireframe Kit, шаг 8 (поток входа Mayors №2 сплэш → №3 вход → №4 код, 29.09).
// Требует шаги 1–7. Все имена — на английском.
// Добавляет / меняет:
//   WF/Header back — булевы Show title и Show back (№3: обе off — пустая строка 56; №4: только «назад»);
//   WF/Button — варианты Type=Link (ссылка 17, подчёркнутая, без полей, зона 48) и Type=Disabled (серая заливка, контрастная подпись);
//   WF/Action title (Align=Right / Center) — крупный заголовок действия 32 Bold в контенте (стиль WF/Action title), до 2 строк;
//       Right — заголовок как начало текстовой группы (вход), Center — опора композиции (№8). Критерий Влада 29.09;
//   WF/Logo placeholder — заглушка словесного знака «Mayors» 180 × 56;
//   WF/Loading dots — три точки (сплэш, только при долгой проверке);
//   WF/Icon info — «i» 24;
//   WF/Login field (Mode=Phone / Email) — подпись 15 → поле 350 × 56 в фокусе, внутри LTR-остров [+972 ▾ | номер 20] / [адрес 17] + курсор;
//   WF/OTP cell (State=Empty / Filled / Focus) — ячейка 48 × 56, цифра 28;
//   WF/OTP cells — 6 ячеек 3 + 3 (space/8, space/24), 344, LTR; ячейки — выставленные инстансы;
//   WF/Status line (Type=Countdown / Link / Error) — строка под полем кода;
//   WF/Keyboard (Type=Phone pad 291 / Phone pad with suggestion 335 / Email 336) — ЗАГЛУШКА системной клавиатуры, только
//       если нет настоящих клавиатур iPhone Влада (30.09 заменены: IOS.keyboard — Phone pad 310 / with suggestion 346 / Email 355).
// Уроки шага: клон варианта внутри набора теряет componentPropertyReferences — перепривязать (Label#…, Show icon#…, Icon#…);
//   textDecoration на тексте со стилем сбрасывается при перепривязке — ставить после; значения свойств по умолчанию общие для
//   всех вариантов набора — тексты режима (Email) задавать в инстансе.
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
const setP = (inst, name, val) => { const k = Object.keys(inst.componentProperties).find(k => k === name || k.startsWith(name + '#')); inst.setProperties({ [k]: val }) }
const key = (owner, name) => Object.keys(owner.componentPropertyDefinitions).find(k => k.startsWith(name + '#'))
async function T(chars, style, color, name, align = 'LEFT') { const t = figma.createText(); await t.setTextStyleIdAsync(S(style).id); t.characters = chars; t.fills = [paint(color)]; t.textAlignHorizontal = align; t.name = name; return t }
function AL(name, dir) { const f = figma.createFrame(); f.name = name; f.layoutMode = dir; f.fills = []; f.clipsContent = false; f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'AUTO'; return f }
function cursor() { const r = figma.createRectangle(); r.name = 'Cursor'; r.resize(2, 24); r.fills = [paint('color/action')]; return r }
function setLayout(set, dir = 'HORIZONTAL') { set.layoutMode = dir; set.itemSpacing = 24; set.paddingLeft = set.paddingRight = set.paddingTop = set.paddingBottom = 16; set.fills = []; set.primaryAxisSizingMode = 'AUTO'; set.counterAxisSizingMode = 'AUTO'; set.clipsContent = false }
const created = []

// 1. Header back — Show title / Show back
const hb = C('WF/Header back')
const hbTitle = hb.findOne(n => n.type === 'TEXT'), hbBack = hb.findOne(n => n.name === 'Back')
if (!key(hb, 'Show title')) hbTitle.componentPropertyReferences = Object.assign({}, hbTitle.componentPropertyReferences, { visible: hb.addComponentProperty('Show title', 'BOOLEAN', true) })
if (!key(hb, 'Show back')) hbBack.componentPropertyReferences = { visible: hb.addComponentProperty('Show back', 'BOOLEAN', true) }

// 2. Button — Link и Disabled
const btn = C('WF/Button')
const kLabel = key(btn, 'Label'), kShowIcon = key(btn, 'Show icon'), kIcon = key(btn, 'Icon')
function rewire(v) { v.findOne(n => n.type === 'TEXT').componentPropertyReferences = { characters: kLabel }; const i = v.findOne(n => n.type === 'INSTANCE'); if (i) i.componentPropertyReferences = { visible: kShowIcon, mainComponent: kIcon } }
if (!btn.children.find(c => c.name === 'Type=Link')) {
  const l = btn.children.find(c => c.name === 'Type=Text').clone(); btn.appendChild(l); l.name = 'Type=Link'; l.paddingLeft = 0; l.paddingRight = 0; rewire(l)
  l.findOne(n => n.type === 'TEXT').textDecoration = 'UNDERLINE'
}
if (!btn.children.find(c => c.name === 'Type=Disabled')) {
  const d = btn.children.find(c => c.name === 'Type=Primary').clone(); btn.appendChild(d); d.name = 'Type=Disabled'; rewire(d)
  d.fills = [paint('color/placeholder')]; d.findOne(n => n.type === 'TEXT').fills = [paint('color/text')]
}

// 3. Action title
const at = []
for (const al of ['Right', 'Center']) {
  const c = figma.createComponent(); c.name = 'Align=' + al; c.layoutMode = 'VERTICAL'; c.resize(350, 40); c.counterAxisSizingMode = 'FIXED'; c.primaryAxisSizingMode = 'AUTO'; c.fills = []; c.clipsContent = false
  c.counterAxisAlignItems = al === 'Right' ? 'MAX' : 'CENTER'
  const t = await T('כותרת', 'WF/Action title', 'color/text', 'Title', al === 'Right' ? 'RIGHT' : 'CENTER'); c.appendChild(t); t.textAutoResize = 'HEIGHT'; t.layoutSizingHorizontal = 'FILL'; t.textTruncation = 'ENDING'; t.maxLines = 2
  at.push(c)
}
const atSet = figma.combineAsVariants(at, page); atSet.name = 'WF/Action title'; setLayout(atSet)
const kAT = atSet.addComponentProperty('Title', 'TEXT', 'כותרת'); for (const c of atSet.children) c.findOne(n => n.type === 'TEXT').componentPropertyReferences = { characters: kAT }
atSet.description = 'Крупный заголовок действия в контенте (32 Bold), до 2 строк. Right — начало текстовой группы (вход №3, №4); Center — опора композиции над воздухом (№8).'
atSet.x = 0; atSet.y = 2800; created.push(atSet.id)

// 4. Logo placeholder, Loading dots, Icon info
const lg = figma.createComponent(); lg.name = 'WF/Logo placeholder'; lg.layoutMode = 'HORIZONTAL'; lg.resize(180, 56); lg.primaryAxisSizingMode = 'FIXED'; lg.counterAxisSizingMode = 'FIXED'; lg.primaryAxisAlignItems = 'CENTER'; lg.counterAxisAlignItems = 'CENTER'; lg.clipsContent = false
lg.fills = [paint('color/surface')]; radius(lg, 'radius/container'); lg.appendChild(await T('Mayors', 'WF/Section title', 'color/text', 'Wordmark', 'CENTER'))
lg.description = 'Заглушка логотипа (словесный знак «Mayors»). Рисунок, цвет и размер — Дизайн.'; lg.x = 820; lg.y = 2800; created.push(lg.id)
const ld = figma.createComponent(); ld.name = 'WF/Loading dots'; ld.layoutMode = 'HORIZONTAL'; ld.primaryAxisSizingMode = 'AUTO'; ld.counterAxisSizingMode = 'AUTO'; ld.fills = []; ld.clipsContent = false; ld.setBoundVariable('itemSpacing', V('space/8'))
for (let i = 0; i < 3; i++) { const d = figma.createEllipse(); d.name = 'Dot ' + (i + 1); d.resize(8, 8); d.fills = [paint(i === 0 ? 'color/action' : 'color/placeholder')]; ld.appendChild(d) }
ld.description = 'Три точки загрузки (сплэш: только при проверке дольше ~1,5 с), под лого.'; ld.x = 1080; ld.y = 2800; created.push(ld.id)
const inf = figma.createComponent(); inf.name = 'WF/Icon info'; inf.resize(24, 24); inf.fills = []; inf.clipsContent = false
{ const r = figma.createEllipse(); r.name = 'Ring'; r.resize(20, 20); r.x = 2; r.y = 2; r.fills = []; r.strokes = [paint('color/action')]; r.strokeWeight = 2; r.strokeAlign = 'INSIDE'; inf.appendChild(r)
  const d = figma.createEllipse(); d.name = 'Dot'; d.resize(2.6, 2.6); d.x = 10.7; d.y = 6.8; d.fills = [paint('color/action')]; inf.appendChild(d)
  const s = figma.createVector(); s.name = 'Stem'; s.vectorPaths = [{ windingRule: 'NONE', data: 'M 0 0 L 0 6' }]; s.strokes = [paint('color/action')]; s.strokeWeight = 2; s.strokeCap = 'ROUND'; inf.appendChild(s); s.x = 12; s.y = 11 }
inf.x = 104; inf.y = 2440; created.push(inf.id)

// 5. Login field
const lf = []
for (const mode of ['Phone', 'Email']) {
  const c = figma.createComponent(); c.name = 'Mode=' + mode; c.layoutMode = 'VERTICAL'; c.resize(350, 90); c.counterAxisSizingMode = 'FIXED'; c.primaryAxisSizingMode = 'AUTO'; c.counterAxisAlignItems = 'MAX'; c.fills = []; c.clipsContent = false; c.setBoundVariable('itemSpacing', V('space/8'))
  const lab = await T(mode === 'Phone' ? 'מספר טלפון' : 'כתובת אימייל', 'WF/Caption', 'color/text-secondary', 'Field label', 'RIGHT'); c.appendChild(lab); lab.textAutoResize = 'HEIGHT'; lab.layoutSizingHorizontal = 'FILL'
  const box = AL('Field', 'HORIZONTAL'); box.counterAxisAlignItems = 'CENTER'; box.fills = [paint('color/bg')]; box.strokes = [paint('color/action')]; box.strokeWeight = 2; box.strokeAlign = 'INSIDE'; radius(box, 'radius/control')
  c.appendChild(box); box.layoutSizingHorizontal = 'FILL'; box.counterAxisSizingMode = 'FIXED'; box.resize(350, 56)
  for (const [p, v] of [['paddingLeft', 'space/16'], ['paddingRight', 'space/16'], ['itemSpacing', 'space/12']]) box.setBoundVariable(p, V(v))
  if (mode === 'Phone') {
    const cc = AL('Country code', 'HORIZONTAL'); cc.counterAxisAlignItems = 'CENTER'; cc.setBoundVariable('itemSpacing', V('space/8')); box.appendChild(cc); cc.layoutSizingVertical = 'FILL'
    cc.appendChild(await T('+972', 'WF/Body', 'color/text', 'Code'))
    const ch = figma.createVector(); ch.name = 'Chevron down'; ch.vectorPaths = [{ windingRule: 'NONE', data: 'M 0 0 L 5 5 L 10 0' }]; ch.strokes = [paint('color/action')]; ch.strokeWeight = 2; ch.strokeCap = 'ROUND'; ch.strokeJoin = 'ROUND'; cc.appendChild(ch)
    const dv = figma.createRectangle(); dv.name = 'Divider'; dv.resize(1, 24); dv.fills = [paint('color/line')]; box.appendChild(dv)
    const inp = AL('Phone input', 'HORIZONTAL'); inp.counterAxisAlignItems = 'CENTER'; inp.itemSpacing = 1; box.appendChild(inp); inp.layoutSizingHorizontal = 'FILL'
    inp.appendChild(await T('050-1234567', 'WF/Section title', 'color/text', 'Value')); inp.appendChild(cursor())
  } else {
    const inp = AL('Email input', 'HORIZONTAL'); inp.counterAxisAlignItems = 'CENTER'; inp.itemSpacing = 1; box.appendChild(inp); inp.layoutSizingHorizontal = 'FILL'
    inp.appendChild(await T('dana.levi@gmail.com', 'WF/Body', 'color/text', 'Value')); inp.appendChild(cursor())
  }
  lf.push(c)
}
const lfSet = figma.combineAsVariants(lf, page); lfSet.name = 'WF/Login field'; setLayout(lfSet)
const kL = lfSet.addComponentProperty('Label', 'TEXT', 'מספר טלפון'), kV = lfSet.addComponentProperty('Value', 'TEXT', '050-1234567'), kC = lfSet.addComponentProperty('Code', 'TEXT', '+972'), kCur = lfSet.addComponentProperty('Show cursor', 'BOOLEAN', true)
for (const c of lfSet.children) { c.findOne(n => n.name === 'Field label').componentPropertyReferences = { characters: kL }; c.findOne(n => n.name === 'Value').componentPropertyReferences = { characters: kV }; const cd = c.findOne(n => n.name === 'Code'); if (cd) cd.componentPropertyReferences = { characters: kC }; c.findOne(n => n.name === 'Cursor').componentPropertyReferences = { visible: kCur } }
lfSet.description = 'Поле входа (№3): подпись 15 над полем (8) → поле 350 × 56 в фокусе. Внутри — LTR-остров: Phone [+972 ▾ | номер 20], Email [адрес 17]. Ошибка / неактивно — после утверждения. Тексты режима Email задавать в инстансе.'
lfSet.x = 0; lfSet.y = 2950; created.push(lfSet.id)

// 6. OTP cell / cells
const cells = []
for (const st of ['Empty', 'Filled', 'Focus']) {
  const c = figma.createComponent(); c.name = 'State=' + st; c.layoutMode = 'HORIZONTAL'; c.resize(48, 56); c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'FIXED'; c.primaryAxisAlignItems = 'CENTER'; c.counterAxisAlignItems = 'CENTER'; c.clipsContent = false; c.itemSpacing = 1
  c.fills = [paint('color/bg')]; c.strokes = [paint(st === 'Focus' ? 'color/action' : st === 'Filled' ? 'color/text-secondary' : 'color/line')]; c.strokeWeight = st === 'Focus' ? 2 : 1; c.strokeAlign = 'INSIDE'; radius(c, 'radius/control')
  const d = await T('0', 'WF/Number medium', 'color/text', 'Digit', 'CENTER'); c.appendChild(d); if (st !== 'Filled') d.visible = false
  if (st === 'Focus') c.appendChild(cursor())
  cells.push(c)
}
const cellSet = figma.combineAsVariants(cells, page); cellSet.name = 'WF/OTP cell'; setLayout(cellSet)
const kD = cellSet.addComponentProperty('Digit', 'TEXT', '0'); for (const c of cellSet.children) c.findOne(n => n.name === 'Digit').componentPropertyReferences = { characters: kD }
cellSet.x = 800; cellSet.y = 2950; created.push(cellSet.id)
const oc = figma.createComponent(); oc.name = 'WF/OTP cells'; oc.layoutMode = 'HORIZONTAL'; oc.primaryAxisSizingMode = 'AUTO'; oc.counterAxisSizingMode = 'AUTO'; oc.fills = []; oc.clipsContent = false; oc.setBoundVariable('itemSpacing', V('space/24'))
const dig = ['4', '8', '2', '9', '', ''], sts = ['Filled', 'Filled', 'Filled', 'Filled', 'Focus', 'Empty']
for (let g = 0; g < 2; g++) { const grp = AL('Group ' + (g + 1), 'HORIZONTAL'); grp.setBoundVariable('itemSpacing', V('space/8')); oc.appendChild(grp)
  for (let i = g * 3; i < g * 3 + 3; i++) { const inst = cellSet.children.find(c => c.name === 'State=' + sts[i]).createInstance(); inst.name = 'Cell ' + (i + 1); grp.appendChild(inst); if (dig[i]) setP(inst, 'Digit', dig[i]); inst.isExposedInstance = true } }
oc.description = 'Поле кода: 6 ячеек 3 + 3, 344, всегда слева направо; для системы — одно поле «одноразовый код».'
oc.x = 1100; oc.y = 2950; created.push(oc.id)

// 7. Status line
const linkV = btn.children.find(v => v.name === 'Type=Link'), failV = C('WF/Status icon').children.find(v => v.name === 'Status=Failed')
const sl = []
for (const ty of ['Countdown', 'Link', 'Error']) {
  const c = figma.createComponent(); c.name = 'Type=' + ty; c.layoutMode = 'HORIZONTAL'; c.resize(350, 26); c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'AUTO'; c.primaryAxisAlignItems = 'MAX'; c.counterAxisAlignItems = 'CENTER'; c.fills = []; c.clipsContent = false; c.setBoundVariable('itemSpacing', V('space/8'))
  if (ty === 'Link') { const b = linkV.createInstance(); b.name = 'Link'; c.appendChild(b); setP(b, 'Label', 'שליחת קוד חדש'); b.isExposedInstance = true }
  else { const t = await T(ty === 'Countdown' ? 'אפשר לשלוח קוד חדש בעוד 30 שניות' : 'הקוד שגוי. נשארו עוד 2 ניסיונות.', 'WF/Caption', ty === 'Countdown' ? 'color/text-secondary' : 'color/text', 'Text', 'RIGHT'); c.appendChild(t); t.textAutoResize = 'HEIGHT'; t.layoutSizingHorizontal = 'FILL'
    if (ty === 'Error') { const ic = failV.createInstance(); ic.name = 'Icon'; ic.rescale(20 / 64); c.appendChild(ic) } }
  sl.push(c)
}
const slSet = figma.combineAsVariants(sl, page); slSet.name = 'WF/Status line'; setLayout(slSet, 'VERTICAL')
const kTx = slSet.addComponentProperty('Text', 'TEXT', 'אפשר לשלוח קוד חדש בעוד 30 שניות'); for (const c of slSet.children) { const t = c.findOne(n => n.name === 'Text'); if (t) t.componentPropertyReferences = { characters: kTx } }
slSet.x = 1500; slSet.y = 2950; created.push(slSet.id)

// 8. Keyboard. Настоящие клавиатуры iPhone Влада (IOS.keyboard) есть — заглушку НЕ создаём: кадр ставит инстанс
//    (await iosComp(IOS.keyboard['Phone pad' | 'Phone pad with suggestion' | 'Email'])).createInstance() + fitKeyboard(inst).
//    Подсказка кода в 'Phone pad with suggestion' — тексты «Title» / «Text» во «Frame 2» (шрифт SF Pro Text недоступен →
//    сменить на SF Pro того же начертания перед правкой). У Email подсказка — текст «Passwords».
//    Нет настоящих — серая заглушка WF/Keyboard (fallback), как раньше.
const realKB = await iosComp(IOS.keyboard['Phone pad'])
if (!realKB) {
  const kb = []
  for (const [ty, h, sug] of [['Phone pad', 291, false], ['Phone pad with suggestion', 335, true], ['Email', 336, true]]) {
    const c = figma.createComponent(); c.name = 'Type=' + ty; c.layoutMode = 'VERTICAL'; c.resize(390, h); c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'FIXED'; c.fills = [paint('color/surface')]; c.clipsContent = false
    if (sug) { const bar = figma.createFrame(); bar.name = 'Suggestion bar'; bar.layoutMode = 'HORIZONTAL'; bar.primaryAxisAlignItems = 'CENTER'; bar.counterAxisAlignItems = 'CENTER'; bar.fills = []; bar.clipsContent = false; c.appendChild(bar); bar.layoutSizingHorizontal = 'FILL'; bar.resize(390, 44); bar.counterAxisSizingMode = 'FIXED'
      bar.appendChild(await T("קוד מ'הודעות' 482913", 'WF/Body strong', 'color/text', 'Suggestion', 'CENTER'))
      const dv = figma.createRectangle(); dv.name = 'Divider'; dv.resize(390, 1); dv.fills = [paint('color/line')]; bar.appendChild(dv); dv.layoutPositioning = 'ABSOLUTE'; dv.x = 0; dv.y = 43; dv.constraints = { horizontal: 'STRETCH', vertical: 'MAX' } }
    const keys = figma.createFrame(); keys.name = 'Keys (system placeholder)'; keys.fills = [paint('color/placeholder')]; keys.opacity = 0.5; keys.clipsContent = false; c.appendChild(keys); keys.layoutSizingHorizontal = 'FILL'; keys.layoutSizingVertical = 'FILL'
    const hi = HI_COMP.createInstance(); hi.name = 'Home indicator'; c.appendChild(hi); hi.layoutSizingHorizontal = 'FILL'; hi.fills = []
    kb.push(c)
  }
  const kbSet = figma.combineAsVariants(kb, page); kbSet.name = 'WF/Keyboard'; setLayout(kbSet); kbSet.counterAxisAlignItems = 'MAX'
  const kS = kbSet.addComponentProperty('Suggestion', 'TEXT', "קוד מ'הודעות' 482913"); for (const v of kbSet.children) { const t = v.findOne(n => n.name === 'Suggestion'); if (t) t.componentPropertyReferences = { characters: kS } }
  kbSet.description = 'ЗАГЛУШКА системной клавиатуры iOS (одна точка замены на компоненты iPhone Влада). Только высота: Phone pad 291 · Phone pad with suggestion 335 · Email 336.'
  kbSet.x = 0; kbSet.y = 3150; created.push(kbSet.id)
}

return { created }

// ---- Правки критика входа (04-critic/02-04-screen.md), согласованы лидом, 30.09 ----
// Запускать отдельно после основного блока (или вставить перед `return`).
// 1. WF/Header back: зона Back 48 × 48 (size/touch), стрелка прижата к внешнему краю (MAX, RTL) — как ✕ в WF/Header close.
//    Стрелка остаётся на x 354; заголовок теперь точно по центру (обе боковые зоны по 48).
// 2. WF/Button: текстовые слои всех вариантов «כפתור» → «Label» (привязка к свойству Label сохраняется — меняется только имя слоя).
// 3. WF/OTP cell, State=Empty: рамка color/line (1,28 : 1 к фону) → color/text-secondary (5,1 : 1).
/*
{
  const page = figma.root.children.find(p => p.name === 'Wireframe Kit'); await figma.setCurrentPageAsync(page)
  const vars = await figma.variables.getLocalVariablesAsync(); const V = n => vars.find(v => v.name === n)
  const paint = n => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', V(n))
  const C = n => page.findOne(x => (x.type === 'COMPONENT' || x.type === 'COMPONENT_SET') && x.name === n)
  const back = C('WF/Header back').findOne(n => n.name === 'Back')
  back.primaryAxisSizingMode = 'FIXED'; back.counterAxisSizingMode = 'FIXED'; back.resize(48, 48); back.primaryAxisAlignItems = 'MAX'; back.counterAxisAlignItems = 'CENTER'
  back.setBoundVariable('width', V('size/touch')); back.setBoundVariable('height', V('size/touch'))
  for (const v of C('WF/Button').children) v.findOne(n => n.type === 'TEXT').name = 'Label'
  C('WF/OTP cell').children.find(c => c.name === 'State=Empty').strokes = [paint('color/text-secondary')]
}
*/
