/**
 * table 域的死值:拖列与量宽的几个门槛数。
 *
 * @author Frank
 * @time 2026-08-24 02:30:00
 */

/**
 * 拖列宽下限(px)—— 再窄列头字都挤没了。
 */
export const COL_W_MIN = 60

/**
 * 拖列起点兜底宽(px):th 还没量到宽时用。
 */
export const COL_W_FALLBACK = 100

/**
 * 量宽百分比小数位(锁列用:auto 量真实宽 → 换算百分比锁 fixed 布局)。
 */
export const PCT_DECIMALS = 3

/**
 * 量宽签名的列间分隔符(列 key 拼串比对;数据换了才重量)。
 */
export const SIG_SEP = '|'

/**
 * 量宽签名里列串与行数的分界。
 */
export const SIG_TAIL = '#'

/**
 * 排序标记:降序。
 */
export const MARK_DESC = ' ▼'

/**
 * 排序标记:升序。
 */
export const MARK_ASC = ' ▲'

/**
 * 排序标记:本列可排但未排(灰提示)。
 */
export const MARK_HINT = ' ⇅'

/**
 * 单元格空值兜底(取不到值时显示,同 row 域口径)。
 */
export const EMPTY_MARK = '—'

/**
 * 指针移动事件名(拖列宽:按下后在窗口级跟手,平台定值)。
 */
export const EV_POINTERMOVE = 'pointermove'

/**
 * 指针松开事件名(拖列宽收尾)。
 */
export const EV_POINTERUP = 'pointerup'

/**
 * 对齐档:右(数字列;缺省左)。
 */
export const ALIGN_RIGHT = 'right'

/**
 * 拼 className 时各类之间的分隔符,`cls()` 用它把基类和一串开关修饰类连起来
 * (表壳、表头、单元格三处都走那一个函数)。HTML 的 class 属性按**空白**切词,
 * 一个空格就是一次分隔 —— 写错不会报错,只会让基类和修饰类粘成一个谁也匹配不上的
 * 长类名,表当场掉回没有边框、没有对齐、没有排序态的裸 table。
 * ⚠️ 与上面 SIG_SEP 的 `|` 是两回事:那个切的是量宽签名里的列 key,这个切的是类名。
 */
export const CLS_SEP = ' '

/**
 * 量完列宽后锁死的表格布局。fixed 让列宽只由第一行(与 colgroup)决定,
 * 后面几百行再长的单元格也不会把列撑开 —— 这正是「百分比固定布局永不横滚」的实现。
 */
export const LAYOUT_LOCKED = 'fixed'

/**
 * 列宽的单位。用百分比而不是像素:容器宽度随视口变,百分比跟着变,
 * 像素不跟 —— 手机上就会横滚。
 */
export const PCT_UNIT = '%'
