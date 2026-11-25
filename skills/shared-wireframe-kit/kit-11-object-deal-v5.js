// Wireframe Kit, шаг 11 (пачка «объект и сделка» Mayors по листам v5 №5 / №6 / №11 + №41 и v4 №39, 30.09).
// Требует шаги 1–10. Все имена — на английском. Запускать ЧАСТЯМИ (A … F) отдельными вызовами use_figma:
// каждая часть = HEADER + тело части. Все части идемпотентны (проверяют, сделано ли уже).
//
// Что делает:
//   A. WF/Button — баг kit-8: подчёркивание ушло во все варианты. Причина: textDecoration у текстов разных вариантов,
//      привязанных к ОДНОМУ TEXT-свойству, общий (проверено ещё раз: цикл «NONE всем, UNDERLINE у Link» даёт одно значение всем).
//      Лечение: у Type=Link своё TEXT-свойство «Link label» (подчёркнут только Link). ВНИМАНИЕ: при перепривязке
//      переопределения текста в существующих инстансах Link сбрасываются на значение по умолчанию — перед запуском
//      записать тексты инстансов Link и вернуть их через «Link label» (в Mayors: 5 кадров №3 / №4, WF/Status line Type=Link,
//      Retry в WF/File row — возвращены).
//   B. WF/Section header → набор Size=Default / Small (Small: заголовок 17 semibold — «בטיפול», «מה קורה בשלב», «הושלם» на №41).
//      В листах он назван «WF/Section title»: в ките это WF/Section header (имя не меняли — стоит в утверждённых кадрах).
//      WF/Chevron link → набор Size=Default / Small (Small: 15 Regular, color/action + шеврон, зона 48 — «נשלחו 2 קבצים…» №39, «ועוד N» №6).
//      WF/Stage marker → + Status=Incomplete (пройден, не всё сделано: кольцо + половина заливки; глиф-стадия «часть» ✓ система А).
//   C. WF/Progress bar (350 × 8, заполнение СПРАВА НАЛЕВО: auto-layout с выравниванием вправо, значение = ширина слоя Fill в инстансе).
//      WF/Value row (подпись 15 справа ↔ значение 17 Regular слева, мин. 44, волосяная линия) — деньги №6.
//   D. WF/Task row — строка статуса FILL, выравнивание вправо, Action переносится (правка критика №11: перенос по умолчанию).
//      WF/Property card — денежная строка (Show money: «מחיר רכישה» + число 15 Regular; Show rent: «· שכירות 8,200 ₪ לחודש» в той же
//      строке; Show rent below — аренда строкой ниже), тип строкой ниже, строка статуса = [статус объекта][хвост][чип Action]
//      (Show action; Action первым справа), Show status below — статус объекта второй строкой при переполнении.
//      Новые булевы по умолчанию выключены — старые кадры v3 не меняются.
//   E. WF/Stage row — у Type=Stage строка-итог (Show summary: [фраза 15][WF/Status chip], Show summary chip) и шеврон (Show chevron);
//      новый вариант Type=Current: залитая строка текущего шага (название 17 semibold до 2 строк → 4 → мета 15 → 8 → строка-итог),
//      шеврон слева по центру, мин. 118, маркер Open на оси.
//   F. WF/Action object — объект-действие №6: заливка color/surface, «נדרש ממך» 17 semibold → 8 → 1–3 WF/Task row
//      (Show row 2 / Show row 3) → «ועוד N» (WF/Chevron link Size=Small, Show more).
//   G. WF/Sticky action bar — Show hint: подсказка 15 над кнопкой внутри панели (№39 v4).
//   WF/Status chip Tone=Neutral уже есть (kit-10) — «פתוח» дальше 7 дней.

// ===== HEADER (вставлять перед каждой частью) =====
const page = figma.root.children.find(p => p.name === 'Wireframe Kit')
await figma.setCurrentPageAsync(page)
const vars = await figma.variables.getLocalVariablesAsync()
const V = n => vars.find(v => v.name === n)
const styles = await figma.getLocalTextStylesAsync()
for (const s of styles) await figma.loadFontAsync(s.fontName)
const S = n => styles.find(s => s.name === n)
const C = n => page.findOne(x => (x.type === 'COMPONENT' || x.type === 'COMPONENT_SET') && x.name === n)
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
// после combineAsVariants: оставить по одному свойству на имя, перепривязать, лишнее удалить
function tidy(set, refsFor) {
  const keep = {}
  for (const [k, d] of Object.entries(set.componentPropertyDefinitions)) { if (d.type === 'VARIANT') continue; const nm = k.split('#')[0]; if (!keep[nm]) keep[nm] = k }
  for (const v of set.children) refsFor(v, keep)
  for (const [k, d] of Object.entries(set.componentPropertyDefinitions)) if (d.type !== 'VARIANT' && keep[k.split('#')[0]] !== k) set.deleteComponentProperty(k)
  return keep
}
const created = [], changed = []
const Y0 = 4200
// ===== /HEADER =====

// ===== A. WF/Button — «Link label» =====
{
  const set = C('WF/Button')
  if (!key(set, 'Link label')) {
    const link = set.children.find(v => v.name === 'Type=Link')
    const kL = set.addComponentProperty('Link label', 'TEXT', 'קישור')
    const lt = link.findOne(n => n.name === 'Label'); lt.componentPropertyReferences = { characters: kL }
    for (const v of set.children) v.findOne(n => n.name === 'Label').textDecoration = v.name === 'Type=Link' ? 'UNDERLINE' : 'NONE'
    set.description = (set.description || '') + ' Type=Link — своё текстовое свойство «Link label» (подчёркнут только Link; у текстов одного TEXT-свойства в разных вариантах textDecoration общий). (kit-11)'
    changed.push(set.id)
  }
}

// ===== B. Section header Size, Chevron link Size, Stage marker Incomplete =====
{
  let sh = C('WF/Section header')
  if (sh.type === 'COMPONENT') {
    const x = sh.x, y = sh.y
    sh.name = 'Size=Default'
    const sm = sh.clone(); sm.name = 'Size=Small'
    const set = figma.combineAsVariants([sh, sm], page); set.name = 'WF/Section header'; setLayout(set, 'VERTICAL'); set.x = x; set.y = y
    tidy(set, (v, k) => { const [lnk, ttl] = v.children; lnk.componentPropertyReferences = { characters: k['Link'], visible: k['Show link'] }; ttl.componentPropertyReferences = { characters: k['Title'] } })
    const smv = set.children.find(v => v.name === 'Size=Small'); await smv.children[1].setTextStyleIdAsync(S('WF/Body strong').id)
    set.description = 'Заголовок секции: Size=Default — 20 semibold (WF/Section title); Size=Small — 17 semibold, тише (группы «בטיפול», «מה קורה בשלב», «הושלם» на №41). Ссылка справа-налево — Show link. В листах решений — «WF/Section title». (kit-11)'
    changed.push(set.id)
  }
  let cl = C('WF/Chevron link')
  if (cl.type === 'COMPONENT') {
    const x = cl.x, y = cl.y
    cl.name = 'Size=Default'
    const sm = cl.clone(); sm.name = 'Size=Small'
    const set = figma.combineAsVariants([cl, sm], page); set.name = 'WF/Chevron link'; setLayout(set, 'VERTICAL'); set.x = x; set.y = y
    tidy(set, (v, k) => { v.findOne(n => n.type === 'TEXT').componentPropertyReferences = { characters: k['Text'] } })
    const smv = set.children.find(v => v.name === 'Size=Small'); await smv.findOne(n => n.type === 'TEXT').setTextStyleIdAsync(S('WF/Caption').id)
    set.description = 'Ссылка с шевроном «вперёд» (слева), зона 48. Size=Default — 17 semibold; Size=Small — 15 Regular (ранг 3: «נשלחו 2 קבצים ב-…» на №39, «ועוד N» в объекте-действии №6). Цвет — color/action. (kit-11)'
    changed.push(set.id)
  }
  const mk = C('WF/Stage marker')
  if (!mk.children.find(v => v.name === 'Status=Incomplete')) {
    const open = mk.children.find(v => v.name === 'Status=Open')
    const inc = open.clone(); mk.appendChild(inc); inc.name = 'Status=Incomplete'
    const half = figma.createEllipse(); half.name = 'Half'; inc.appendChild(half); half.resize(20, 20); half.x = 2; half.y = 2
    half.arcData = { startingAngle: -Math.PI / 2, endingAngle: Math.PI / 2, innerRadius: 0 }; half.fills = [paint('color/action')]
    mk.description = (mk.description || '') + ' Status=Incomplete — шаг пройден, но не всё сделано (есть открытый пункт «נדחה» / «הוחזר»): кольцо + половина заливки, без галочки (глиф-стадия «часть», ✓ система А). (kit-11)'
    changed.push(mk.id)
  }
}

// ===== C. WF/Progress bar, WF/Value row =====
{
  if (!C('WF/Progress bar')) {
    const pb = figma.createComponent(); pb.name = 'WF/Progress bar'; pb.layoutMode = 'HORIZONTAL'; pb.primaryAxisSizingMode = 'FIXED'; pb.counterAxisSizingMode = 'FIXED'; pb.resize(350, 8)
    pb.primaryAxisAlignItems = 'MAX'; pb.fills = [paint('color/line')]; radius(pb, 'radius/control'); pb.clipsContent = true
    const fl = figma.createRectangle(); fl.name = 'Fill'; fl.fills = [paint('color/action')]; pb.appendChild(fl); fl.resize(52.5, 8); fl.layoutSizingVertical = 'FILL'
    pb.description = 'Полоса доли (№6: оплачено от цены). 350 × 8, заполнение СПРАВА НАЛЕВО (RTL): доля = ширина слоя Fill в инстансе (15 % = 52.5). Полная — Fill на всю ширину. Вид и цвет — Дизайн. (kit-11)'
    pb.x = 0; pb.y = Y0; created.push(pb.id)
  }
  if (!C('WF/Value row')) {
    const vr = figma.createComponent(); vr.name = 'WF/Value row'; vr.layoutMode = 'HORIZONTAL'; vr.resize(350, 44); vr.primaryAxisSizingMode = 'FIXED'; vr.counterAxisSizingMode = 'AUTO'; vr.minHeight = 44
    vr.counterAxisAlignItems = 'CENTER'; vr.fills = []; vr.clipsContent = false; bind(vr, { itemSpacing: 'space/16', paddingTop: 'space/8', paddingBottom: 'space/8' }); hairline(vr)
    const val = await T('0 ₪', 'WF/Body', 'color/text', 'Value', 'LEFT'); vr.appendChild(val)
    const lab = await T('תווית', 'WF/Caption', 'color/text-secondary', 'Label'); wrap(lab, vr)
    val.componentPropertyReferences = { characters: vr.addComponentProperty('Value', 'TEXT', '0 ₪') }
    lab.componentPropertyReferences = { characters: vr.addComponentProperty('Label', 'TEXT', 'תווית') }
    vr.description = 'Строка «подпись — значение» (деньги №6): подпись 15 серым справа, значение 17 Regular слева (не жирнее фактов), мин. 44, волосяная линия снизу. Прогнозная строка — слово «תחזית» первым в подписи. (kit-11)'
    vr.x = 420; vr.y = Y0; created.push(vr.id)
  }
}

// ===== D. WF/Task row (перенос), WF/Property card (деньги, строка статуса) =====
{
  const tr = C('WF/Task row')
  const sl = tr.findOne(n => n.name === 'Status line')
  if (sl.layoutSizingHorizontal !== 'FILL') {
    sl.layoutSizingHorizontal = 'FILL'; sl.primaryAxisAlignItems = 'MAX'; sl.counterAxisAlignItems = 'CENTER'
    const act = sl.findOne(n => n.name === 'Action'); act.textAutoResize = 'HEIGHT'; act.layoutSizingHorizontal = 'FILL'
    tr.description += ' Строка статуса — на всю ширину, прижата вправо, текст Action переносится (правка критика №11). (kit-11)'
    changed.push(tr.id)
  }
  const pc = C('WF/Property card')
  if (!pc.findOne(n => n.name === 'Money')) {
    const chip = C('WF/Status chip')
    const texts = pc.findOne(n => n.name === 'Texts'), info = pc.findOne(n => n.name === 'Info')
    const kMoney = pc.addComponentProperty('Show money', 'BOOLEAN', false), kRent = pc.addComponentProperty('Show rent', 'BOOLEAN', false), kRentB = pc.addComponentProperty('Show rent below', 'BOOLEAN', false)
    const kPL = pc.addComponentProperty('Price label', 'TEXT', 'מחיר רכישה'), kPV = pc.addComponentProperty('Price', 'TEXT', '2,450,000 ₪')
    const kRL = pc.addComponentProperty('Rent label', 'TEXT', 'שכירות'), kRV = pc.addComponentProperty('Rent', 'TEXT', '8,200 ₪ לחודש')
    // ссылки на свойства ставятся только ПОСЛЕ вставки слоя в компонент
    async function pair(name, parent, idx, kl, kv, l, v) {
      const g = AL(name, 'HORIZONTAL'); g.counterAxisAlignItems = 'BASELINE'; g.setBoundVariable('itemSpacing', V('space/4'))
      if (idx === null) parent.appendChild(g); else parent.insertChild(idx, g)
      const tv = await T(v, 'WF/Caption', 'color/text', 'Value'); const tl = await T(l, 'WF/Caption', 'color/text-secondary', 'Label')
      g.appendChild(tv); g.appendChild(tl); tv.componentPropertyReferences = { characters: kv }; tl.componentPropertyReferences = { characters: kl }; return g
    }
    const money = AL('Money', 'HORIZONTAL'); money.counterAxisAlignItems = 'BASELINE'; money.setBoundVariable('itemSpacing', V('space/4'))
    texts.insertChild(1, money)
    const rent = await pair('Rent', money, null, kRL, kRV, 'שכירות', '8,200 ₪ לחודש'); rent.componentPropertyReferences = { visible: kRent }
    const sep = await T('·', 'WF/Caption', 'color/text-secondary', 'Separator'); money.appendChild(sep); sep.componentPropertyReferences = { visible: kRent }
    const price = await pair('Price', money, null, kPL, kPV, 'מחיר רכישה', '2,450,000 ₪')
    money.componentPropertyReferences = { visible: kMoney }
    const rentB = await pair('Rent below', texts, 2, kRL, kRV, 'שכירות', '8,200 ₪ לחודש'); rentB.componentPropertyReferences = { visible: kRentB }
    // строка статуса: [статус объекта][хвост действия][чип Action] — Action первым справа
    const oldSt = pc.findOne(n => n.name === 'Status'); const kShow = key(pc, 'Show status')
    const line = AL('Status line', 'HORIZONTAL'); line.counterAxisAlignItems = 'CENTER'; line.setBoundVariable('itemSpacing', V('space/8'))
    info.appendChild(line); line.componentPropertyReferences = { visible: kShow }
    line.appendChild(oldSt); oldSt.componentPropertyReferences = { visible: pc.addComponentProperty('Show object status', 'BOOLEAN', true) }
    const kAct = pc.addComponentProperty('Show action', 'BOOLEAN', false)
    const tail = await T('12 ימים', 'WF/Caption', 'color/text-secondary', 'Action tail'); line.appendChild(tail)
    tail.componentPropertyReferences = { characters: pc.addComponentProperty('Action tail', 'TEXT', '12 ימים'), visible: pc.addComponentProperty('Show action tail', 'BOOLEAN', false) }
    const ac = chip.children.find(c => c.name === 'Tone=Action').createInstance(); ac.name = 'Action'; line.appendChild(ac); setP(ac, 'Text', 'נדרש מסמך'); ac.isExposedInstance = true
    ac.componentPropertyReferences = { visible: kAct }
    const below = chip.children.find(c => c.name === 'Tone=Neutral').createInstance(); below.name = 'Status below'; info.appendChild(below); below.isExposedInstance = true
    below.componentPropertyReferences = { visible: pc.addComponentProperty('Show status below', 'BOOLEAN', false) }
    pc.description = 'Карточка объекта (№5, v5): фото 350 × 160 → 12 → название 17 semibold до 2 строк → 4 → ДЕНЕЖНАЯ СТРОКА 15 (Show money: подпись серым «מחיר רכישה» + число Regular; Show rent: « · שכירות 8,200 ₪ לחודש» в той же строке; не влезает — Show rent below: аренда строкой ниже, Show rent = off) → 4 → тип и комнаты 15 → 8 → строка статуса (Show status): [статус объекта (Show object status)][хвост (Show action tail)][чип Action (Show action) — первым справа]. Статус объекта не влез — Show object status = off + Show status below. Без рамки и заливки — контейнер само фото. Вся карточка → №6. (kit-11)'
    changed.push(pc.id)
  }
}

// ===== E. WF/Stage row — строка-итог у Type=Stage, вариант Type=Current =====
{
  const sr = C('WF/Stage row'), chip = C('WF/Status chip')
  const st = sr.children.find(v => v.name === 'State=Collapsed, Type=Stage')
  if (!st.findOne(n => n.name === 'Summary line')) {
    const kSum = sr.addComponentProperty('Summary', 'TEXT', 'נדרשים ממך 2 מסמכים')
    const kShowSum = sr.addComponentProperty('Show summary', 'BOOLEAN', false)
    const kSumChip = sr.addComponentProperty('Show summary chip', 'BOOLEAN', true)
    const kChev = sr.addComponentProperty('Show chevron', 'BOOLEAN', false)
    const body = st.findOne(n => n.name === 'Body'), texts = st.findOne(n => n.name === 'Texts')
    const mkSum = async (parent, pad) => {
      const s = AL('Summary line', 'HORIZONTAL'); s.counterAxisAlignItems = 'CENTER'; s.primaryAxisAlignItems = 'MAX'; s.setBoundVariable('itemSpacing', V('space/8'))
      if (pad) s.setBoundVariable('paddingTop', V(pad))
      parent.appendChild(s); s.layoutSizingHorizontal = 'FILL'
      const tx = await T('נדרשים ממך 2 מסמכים', 'WF/Caption', 'color/text', 'Summary'); s.appendChild(tx); tx.textAutoResize = 'HEIGHT'; tx.layoutSizingHorizontal = 'FILL'
      tx.componentPropertyReferences = { characters: kSum }
      const c = chip.children.find(v => v.name === 'Tone=Action').createInstance(); c.name = 'Summary status'; s.appendChild(c); setP(c, 'Text', 'נדחה'); c.isExposedInstance = true
      c.componentPropertyReferences = { visible: kSumChip }
      return s
    }
    const s1 = await mkSum(texts, 'space/4'); s1.componentPropertyReferences = { visible: kShowSum }
    const slot = AL('Chevron slot', 'VERTICAL'); slot.primaryAxisAlignItems = 'CENTER'; body.insertChild(0, slot); slot.layoutAlign = 'STRETCH'
    const ch = C('WF/Chevron forward (RTL, left)').createInstance(); ch.name = 'Chevron'; slot.appendChild(ch)
    slot.layoutSizingVertical = 'FILL' // после вставки шеврона: иначе слот снова обнимает содержимое и шеврон уходит к верху
    slot.componentPropertyReferences = { visible: kChev }
    // Type=Current
    const exp = sr.children.find(v => v.name === 'State=Expanded, Type=Stage')
    const cur = figma.createComponent(); cur.name = 'State=Collapsed, Type=Current'; cur.layoutMode = 'HORIZONTAL'; cur.resize(350, 118); cur.primaryAxisSizingMode = 'FIXED'; cur.counterAxisSizingMode = 'AUTO'
    cur.fills = []; cur.clipsContent = false; cur.itemSpacing = 12
    sr.appendChild(cur)
    const cb = AL('Body', 'HORIZONTAL'); cb.fills = [paint('color/surface')]; radius(cb, 'radius/container'); cb.counterAxisAlignItems = 'CENTER'; cb.minHeight = 118
    bind(cb, { paddingTop: 'space/16', paddingBottom: 'space/16', paddingLeft: 'space/16', paddingRight: 'space/16', itemSpacing: 'gap/in-group' })
    cur.appendChild(cb); cb.layoutSizingHorizontal = 'FILL'
    const cch = C('WF/Chevron forward (RTL, left)').createInstance(); cch.name = 'Chevron'; cb.appendChild(cch)
    const ct = AL('Texts', 'VERTICAL'); ct.counterAxisAlignItems = 'MAX'; ct.setBoundVariable('itemSpacing', V('space/4')); cb.appendChild(ct); ct.layoutSizingHorizontal = 'FILL'
    const ttl = await T('שם השלב', 'WF/Body strong', 'color/text', 'Title'); wrap(ttl, ct, 2); ttl.componentPropertyReferences = { characters: key(sr, 'Title') }
    const met = await T('עכשיו', 'WF/Caption', 'color/text-secondary', 'Meta'); wrap(met, ct); met.componentPropertyReferences = { characters: key(sr, 'Meta') }
    const s2 = await mkSum(ct, 'space/4')
    const rail = exp.findOne(n => n.name === 'Rail').clone(); cur.appendChild(rail); rail.layoutAlign = 'STRETCH'
    rail.findOne(n => n.name === 'Line top').componentPropertyReferences = { visible: key(sr, 'Show line top') }
    rail.findOne(n => n.name === 'Line bottom').componentPropertyReferences = { visible: key(sr, 'Show line bottom') }
    rail.findOne(n => n.name === 'Marker').swapComponent(C('WF/Stage marker').children.find(c => c.name === 'Status=Open'))
    sr.description += ' Type=Stage: строка-итог (Show summary: [фраза 15 «נדרשים ממך 2 מסמכים»][WF/Status chip худшего статуса, Show summary chip]) и шеврон слева (Show chevron) — у ЛЮБОГО шага с пунктами инвестора (№11 v5); пройденный с открытым пунктом — маркер Status=Incomplete, Show meta = off. Type=Current — текущий шаг: единственная заливка, название 17 semibold до 2 строк → 4 → мета 15 «עכשיו · יעד: …» → 8 → строка-итог; шеврон слева по центру; мин. 118; вся строка → №41. (kit-11)'
    changed.push(sr.id)
  }
}

// ===== F. WF/Action object =====
{
  if (!C('WF/Action object')) {
    const tr = C('WF/Task row'), cl = C('WF/Chevron link')
    const ao = figma.createComponent(); ao.name = 'WF/Action object'; ao.layoutMode = 'VERTICAL'; ao.resize(350, 200); ao.counterAxisSizingMode = 'FIXED'; ao.primaryAxisSizingMode = 'AUTO'; ao.counterAxisAlignItems = 'MAX'; ao.clipsContent = false
    ao.fills = [paint('color/surface')]; radius(ao, 'radius/container'); bind(ao, { paddingTop: 'space/16', paddingBottom: 'space/16', paddingLeft: 'space/16', paddingRight: 'space/16', itemSpacing: 'space/8' })
    const ttl = await T('נדרש ממך', 'WF/Body strong', 'color/text', 'Title'); wrap(ttl, ao)
    ttl.componentPropertyReferences = { characters: ao.addComponentProperty('Title', 'TEXT', 'נדרש ממך') }
    const rows = AL('Rows', 'VERTICAL'); rows.counterAxisAlignItems = 'MAX'; ao.appendChild(rows); rows.layoutSizingHorizontal = 'FILL'
    for (let i = 1; i <= 3; i++) {
      const r = tr.createInstance(); r.name = 'Row ' + i; rows.appendChild(r); r.layoutSizingHorizontal = 'FILL'; r.isExposedInstance = true
      if (i > 1) r.componentPropertyReferences = { visible: ao.addComponentProperty('Show row ' + i, 'BOOLEAN', false) }
    }
    const more = cl.children.find(v => v.name === 'Size=Small').createInstance(); more.name = 'More'; ao.appendChild(more); setP(more, 'Text', 'ועוד 1'); more.isExposedInstance = true
    more.componentPropertyReferences = { visible: ao.addComponentProperty('Show more', 'BOOLEAN', false) }
    ao.description = 'Объект-действие «נדרש ממך» (№6): единственная заливка экрана, 350, отступ 16. Заголовок 17 semibold → 8 → 1–3 строки WF/Task row (Show context = on, мин. 80, волосяные линии, шеврон слева; документы → №41, оплата → №7) → «ועוד N» (Show more) → №11. Порядок строк: באיחור → נדחה → חסר / לא נשלח → פתוח. Нет требований — компонента нет, на его месте строка 15 «כרגע לא נדרש ממך דבר». (kit-11)'
    ao.x = 900; ao.y = Y0; created.push(ao.id)
  }
}

// ===== G. WF/Sticky action bar — строка подсказки внутри панели (№39 v4) =====
{
  const sb = C('WF/Sticky action bar')
  if (!sb.findOne(n => n.name === 'Hint')) {
    const h = await T('מחכים לסיום ההעלאה', 'WF/Caption', 'color/text-secondary', 'Hint')
    sb.insertChild(0, h); h.textAutoResize = 'HEIGHT'; h.layoutSizingHorizontal = 'FILL'
    sb.setBoundVariable('itemSpacing', V('space/8')) // скрытая подсказка зазора не даёт — утверждённые №1 / №7 не меняются (80)
    h.componentPropertyReferences = { characters: sb.addComponentProperty('Hint', 'TEXT', 'מחכים לסיום ההעלאה'), visible: sb.addComponentProperty('Show hint', 'BOOLEAN', false) }
    sb.description = (sb.description || '') + ' Show hint — строка 15 над кнопкой ВНУТРИ панели: почему кнопка неактивна / таймаут отправки (№39 v4, критик находка 2; как пояснение в группе с кнопкой на ✓ №8). Панель растёт вверх: 16 + 22 + 8 + 48 + 16 = 110. (kit-11)'
    changed.push(sb.id)
  }
}

return { created, changed }
