// Wireframe Kit, шаг 7 (поток оплаты Mayors, проход 2 после критика экрана и решений Влада, 29.09).
// Требует шаги 1–6 (включая блок «по центру» в конце kit-6). Все имена — на английском.
// Меняет:
//   WF/Caption — 14 → 15 (параметр STATE «вторичный 15»; согласовано лидом). Проверено: №1 и №7 не поехали (+1…2 px по высоте);
//   WF/Status icon, Status=Paid — контур, как Processing / Failed (кольцо color/bg + обводка color/action той же толщины, галочка color/action);
//   WF/Icon chat — значок чата 24 (добавлен критиком экрана; здесь — воспроизведение, если его нет);
//   WF/Result status (State=Result) — What line и Next line до 2 строк; Last payment «זה היה התשלום האחרון — כל הלוח שולם.»;
//       Agent button — по умолчанию WF/Icon chat, Show icon = on;
//   WF/Result status (State=Checking) — Texts (space/4): «Checking line» 17 + «Checking note» 15 вторичным
//       («אפשר לסגור — נעדכן אותך בהודעה»), новое свойство Checking note; всё по центру;
//   WF/Result sheet (State=Checking) — высота по содержимому (~256), Body HUG, выравнивание сверху (раньше — фикс 438 + центр по вертикали).
// Уроки: textTruncation до maxLines; смена стиля текста меняет высоты везде — после неё скриншот №1 и №7.
const page = figma.root.children.find(p => p.name === 'Wireframe Kit')
await figma.setCurrentPageAsync(page)
const vars = await figma.variables.getLocalVariablesAsync()
const V = n => vars.find(v => v.name === n)
const styles = await figma.getLocalTextStylesAsync()
for (const s of styles) await figma.loadFontAsync(s.fontName)
const S = n => styles.find(s => s.name === n)
const C = n => page.findOne(x => (x.type === 'COMPONENT' || x.type === 'COMPONENT_SET') && x.name === n)
const paint = n => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', V(n))
const setP = (inst, name, val) => { const k = Object.keys(inst.componentProperties).find(k => k === name || k.startsWith(name + '#')); inst.setProperties({ [k]: val }) }
const changed = []

// 1. Вторичный текст 15
S('WF/Caption').fontSize = 15

// 2. Значок «оплачено» — контур
const si = C('WF/Status icon')
const V_ = st => si.children.find(c => c.name === 'Status=' + st)
const procRing = V_('Processing').findOne(n => n.name === 'Ring')
const paidRing = V_('Paid').findOne(n => n.name === 'Ring')
paidRing.fills = [paint('color/bg')]; paidRing.strokes = [paint('color/action')]; paidRing.strokeWeight = procRing.strokeWeight; paidRing.strokeAlign = procRing.strokeAlign
V_('Paid').findOne(n => n.name === 'Check').strokes = [paint('color/action')]
si.description = 'Значок 64 статус-блока результата оплаты. Все варианты — контур одного веса (кольцо + знак): галочка / часы / «!» / Checking — спиннер. Вес и цвет успеха — Дизайн.'
changed.push(si.id)

// 3. Значок чата (если его ещё нет)
let chat = C('WF/Icon chat')
if (!chat) {
  chat = figma.createComponent(); chat.name = 'WF/Icon chat'; chat.resize(24, 24); chat.fills = []; chat.clipsContent = false
  const g = figma.createVector(); g.name = 'Glyph'
  g.vectorPaths = [{ windingRule: 'NONE', data: 'M 4 5 L 20 5 L 20 16 L 9 16 L 5 20 L 5 16 L 4 16 Z' }]
  g.strokes = [paint('color/action')]; g.strokeWeight = 2; g.strokeJoin = 'ROUND'; chat.appendChild(g); g.x = 4; g.y = 5
  chat.x = 0; chat.y = 2440
}
const btn = C('WF/Button'); const kIcon = Object.keys(btn.componentPropertyDefinitions).find(k => k.startsWith('Icon#'))
const pref = btn.componentPropertyDefinitions[kIcon].preferredValues || []
if (!pref.some(p => p.key === chat.key)) btn.editComponentProperty(kIcon, { preferredValues: [...pref, { type: 'COMPONENT', key: chat.key }] })

// 4. Статус-блок
const rs = C('WF/Result status')
const res = rs.children.find(c => c.name === 'State=Result')
for (const n of ['What line', 'Next line']) { const t = res.findOne(x => x.name === n); t.textTruncation = 'ENDING'; t.maxLines = 2 }
res.findOne(x => x.name === 'Last payment').characters = 'זה היה התשלום האחרון — כל הלוח שולם.'
const ag = res.findOne(x => x.name === 'Agent button'); setP(ag, 'Icon', chat.id); setP(ag, 'Show icon', true)
const ck = rs.children.find(c => c.name === 'State=Checking')
if (!ck.findOne(x => x.name === 'Texts')) {
  const line = ck.findOne(x => x.name === 'Checking line')
  const tx = figma.createFrame(); tx.name = 'Texts'; tx.layoutMode = 'VERTICAL'; tx.fills = []; tx.clipsContent = false; tx.counterAxisAlignItems = 'CENTER'; tx.primaryAxisSizingMode = 'AUTO'
  ck.appendChild(tx); tx.layoutSizingHorizontal = 'FILL'; tx.layoutSizingVertical = 'HUG'; tx.setBoundVariable('itemSpacing', V('space/4'))
  tx.appendChild(line); line.layoutSizingHorizontal = 'FILL'; line.textTruncation = 'ENDING'; line.maxLines = 2
  const nt = figma.createText(); await nt.setTextStyleIdAsync(S('WF/Caption').id); nt.characters = 'אפשר לסגור — נעדכן אותך בהודעה'
  nt.fills = [paint('color/text-secondary')]; nt.textAlignHorizontal = 'CENTER'; nt.name = 'Checking note'
  tx.appendChild(nt); nt.textAutoResize = 'HEIGHT'; nt.layoutSizingHorizontal = 'FILL'; nt.textTruncation = 'ENDING'; nt.maxLines = 2
  nt.componentPropertyReferences = { characters: rs.addComponentProperty('Checking note', 'TEXT', 'אפשר לסגור — נעדכן אותך בהודעה') }
}
rs.description = 'Статус-блок результата оплаты, ПО ЦЕНТРУ. State=Result: значок 64 (контур) → 12 → заголовок-статус (до 2 строк, фокус) → 8 → What line «сумма + короткий этап» (17, до 2) → 8 → Next line (17, до 2) или Last payment → 12 → «לכתוב לסוכן» (WF/Icon chat). State=Checking: спиннер 64 → 12 → строка 17 → 4 → строка 15.'
changed.push(rs.id)

// 5. Sheet «проверяем» — по содержимому
const rsh = C('WF/Result sheet')
const shC = rsh.children.find(c => c.name === 'State=Checking')
const body = shC.findOne(x => x.name === 'Body'); body.layoutSizingVertical = 'HUG'; body.primaryAxisAlignItems = 'MIN'
shC.primaryAxisSizingMode = 'AUTO'
rsh.description = 'Нижний sheet результата оплаты (№10) поверх экрана, где начата оплата; под ним — WF/Scrim. Статус по центру, кнопка на всю ширину, ✕ справа. Оба варианта — высота по содержимому (≤ 80 % кадра): Result — статус + панель; Checking — спиннер + две строки, без панели (~256); при итоге sheet плавно вырастает.'
changed.push(rsh.id)
// Инстансы Checking с ручной фиксированной высотой вернуть к HUG
for (const i of await shC.getInstancesAsync()) if (i.parent && i.parent.layoutMode && i.parent.layoutMode !== 'NONE') i.layoutSizingVertical = 'HUG'

// Заголовок действия крупно в контенте, по центру (Влад 29.09, №8 вариант Б): Heebo Bold 32 / 40.
{
  await figma.loadFontAsync({ family: 'Heebo', style: 'Bold' })
  const all = await figma.getLocalTextStylesAsync()
  if (!all.find(s => s.name === 'WF/Action title')) {
    const st = figma.createTextStyle(); st.name = 'WF/Action title'; st.fontName = { family: 'Heebo', style: 'Bold' }; st.fontSize = 32
    st.lineHeight = { unit: 'PIXELS', value: 40 }
    st.description = 'Заголовок действия крупно в контенте, по центру (Влад 29.09, №8). Экран действия с малым содержанием: собирает верх экрана.'
  }
}

return { changed }
