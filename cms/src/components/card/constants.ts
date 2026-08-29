/**
 * card 域的死值。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */

/**
 * 打码行的占位假词(真内容服务端不下发,这里渲染的是固定占位,糊掉后只见纹理;
 * 三句轮着用,行与行的长短才像真的)。
 */
export const BLUR_FILL = [
  '屏蔽的结论文字示例这里是一句完整的结论',
  '屏蔽的结论示例文字这一行也是一句结论',
  '屏蔽的一句结论文字示例内容占位',
]

/**
 * 升级卡悬浮阈值:打码行数 ≥ 这个数,ProCard 悬浮正中;不足则卡放码尾
 * (卡不许盖住超过一半的码,Frank 拍)。
 */
export const OVERLAY_MIN = 4

/**
 * 白卡壳的全局类名。描边 + 圆角 + 白底那份真身写在 main.css 第 9 段的全局层
 * (`.card { background/border/border-radius }`;2026-08-17 从 ui/Card.tsx 迁出、
 * 08-18 连同 25 处调用方一起收口 —— 原先散在 10 处逐字符抄写)。分界:全局那条只管
 * 描边+圆角+白底,padding 各页密度不同留给调用方,本域在它之上再叠自己的密度类。
 * 它是全局层的类、不是 CSS Module 生成的哈希名,所以取不到 `css.card`,只能按这个
 * 固定字符串拼;另有 6 处消费页也直接写它,改名要连它们一起改。
 */
export const CARD_CLS = 'card'

/**
 * 键值条目「不加额外类」时的空类名:普通条目就占网格里一格,不需要任何修饰类;
 * 只有 wide 条目才换成占整行的那个类。用空串而不是 null,是因为 className 属性
 * 收的是字符串,而 `class=""` 与不写 class 在 DOM 上等价。
 */
export const CELL_CLS_NONE = ''

/**
 * 定制样式钮的统一底座(2026-08-26 Frank「<button 这种不允许直接使用」——
 * 裸 <button> 一律改经 button 族):ghost 底最素,视觉全由本域的加倍类定形,
 * Button 只出统一的语义与可达性(disabled/aria)。
 */
export const PLAIN_BTN_KIND = 'ghost'
