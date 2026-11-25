// Wireframe Kit, шаг 9 (правка потока оплаты под Дубай, 29–30.09). Требует шаги 1–8.
// Меняет:
//   WF/Stage row, State=Expanded — новый текст «Construction progress» (WF/Caption 15, color/text-secondary, до 2 строк) последним
//       в колонке Texts (space/8 → ровно 8 под «עוד N ימים»); свойства TEXT «Construction progress» и BOOLEAN «Show construction»
//       (по умолчанию ВЫКЛ. — остальные экземпляры не меняются);
//   WF/Stage row, State=Collapsed — Meta до 2 строк (было 1): дубайские сроки «12 חודשים אחרי המסירה · עתידי» не влезали в строку
//       и обрезали слово статуса;
//   WF/Result status, State=Result — текст Last payment по листу: «זה היה התשלום האחרון בלוח — הדירה שולמה במלואה.».
const page = figma.root.children.find(p => p.name === 'Wireframe Kit')
await figma.setCurrentPageAsync(page)
const vars = await figma.variables.getLocalVariablesAsync()
const V = n => vars.find(v => v.name === n)
const styles = await figma.getLocalTextStylesAsync()
for (const s of styles) await figma.loadFontAsync(s.fontName)
const S = n => styles.find(s => s.name === n)
const C = n => page.findOne(x => (x.type === 'COMPONENT' || x.type === 'COMPONENT_SET') && x.name === n)
const paint = n => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', V(n))

const sr = C('WF/Stage row')
const ex = sr.children.find(c => c.name === 'State=Expanded')
const texts = ex.findOne(n => n.name === 'Texts')
if (!texts.findOne(n => n.name === 'Construction progress')) {
  const cp = figma.createText(); await cp.setTextStyleIdAsync(S('WF/Caption').id)
  cp.characters = 'הבנייה: 35% הושלמו · עודכן 01.09.2026'; cp.fills = [paint('color/text-secondary')]; cp.textAlignHorizontal = 'RIGHT'; cp.name = 'Construction progress'
  texts.appendChild(cp); cp.textAutoResize = 'HEIGHT'; cp.layoutSizingHorizontal = 'FILL'; cp.textTruncation = 'ENDING'; cp.maxLines = 2
  cp.componentPropertyReferences = {
    characters: sr.addComponentProperty('Construction progress', 'TEXT', 'הבנייה: 35% הושלמו · עודכן 01.09.2026'),
    visible: sr.addComponentProperty('Show construction', 'BOOLEAN', false)
  }
}
const colMeta = sr.children.find(c => c.name === 'State=Collapsed').findOne(n => n.name === 'Meta')
colMeta.textTruncation = 'ENDING'; colMeta.maxLines = 2
sr.description += ' Expanded + Show construction — строка готовности стройки 15 вторичным, 8 под «עוד N ימים»; по умолчанию выкл. Collapsed Meta — до 2 строк. (kit-9)'

const rs = C('WF/Result status').children.find(c => c.name === 'State=Result')
rs.findOne(n => n.name === 'Last payment').characters = 'זה היה התשלום האחרון בלוח — הדירה שולמה במלואה.'

return { changed: [sr.id, rs.id] }
