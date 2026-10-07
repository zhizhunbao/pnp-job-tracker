/**
 * chip 域的纯函数(零 JSX 零 hook)。
 * 2026-10-05 大号胶囊占位的类名 chipSkelClsOf 随 ChipSkel 撤(访客第 3 题改左右两栏,Frank「也改成左右 两部分吗?」「改啊」;
 * 原注要点:基座 + 六档宽之一按第几颗循环取,模数取类名数组的长度,不另立死值)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { cssOf } from '@/components/css'
import {
  CHIP_BG_OFF, CHIP_BG_ON, CHIP_BORDER_HOT, CHIP_BORDER_OFF, CHIP_BORDER_ON, CHIP_C_HOT, CHIP_C_OFF, CHIP_C_ON,
  CHIP_CURSOR, CHIP_FONT_SIZE, CHIP_PADDING, CHIP_RADIUS, CHIP_WHITE_SPACE, CLS_SEP, FONT_WEIGHT_OFF, FONT_WEIGHT_ON,
  MARK_NONE,
} from './constants'
import type { ChipClsIn, LineClsIn, MarkParts, MarkPartsIn, TileClsIn } from './types'
import css from './chip.module.css'

/**
 * 筛选药丸的类名预算:基座 + 选中/强调红(选中优先 —— 两个都真时只叠选中)。
 *
 * @param x 两个态开关。
 * @returns 拼好的 className。
 */
export function chipClsOf(x: ChipClsIn): string {
  const out = [css.chip]
  if (x.lg) {
    out.push(css.lg)
  }
  if (x.lg && x.active) {
    out.push(css.lgOn)
  } else if (x.active) {
    out.push(css.active)
  } else if (x.hot) {
    out.push(css.hot)
  }
  if (x.extra != null) {
    out.push(x.extra)
  }
  return out.join(CLS_SEP)
}

/**
 * 药丸样式对象(**过渡导出**:十几处调用方还在把它 spread 进自己的 style 拼整行筛选带,
 * 值与上面三个类逐格相等 —— 各消费页形制化改用 Chip 组件/类后本函数退役)。
 * 签名沿旧 API(双参 + 默认值),不改是为了 spread 调用方一个字不用动。
 *
 * @param active 是否选中。
 * @param hot 是否强调红。
 * @returns 行内样式对象。
 */
// eslint-disable-next-line local/one-parameter -- 旧 API 的签名:十几处 spread 调用方按位置传参,改签名要动它们全部;消费页类化批一起收
export function chipStyle(active: boolean, hot = false): React.CSSProperties {
  let border = CHIP_BORDER_OFF
  let background = CHIP_BG_OFF
  let color = CHIP_C_OFF
  let fontWeight = FONT_WEIGHT_OFF
  if (active) {
    border = CHIP_BORDER_ON
    background = CHIP_BG_ON
    color = CHIP_C_ON
    fontWeight = FONT_WEIGHT_ON
  } else if (hot) {
    border = CHIP_BORDER_HOT
    color = CHIP_C_HOT
  }
  return {
    border,
    background,
    color,
    fontWeight,
    borderRadius: CHIP_RADIUS,
    padding: CHIP_PADDING,
    fontSize: CHIP_FONT_SIZE,
    cursor: CHIP_CURSOR,
    whiteSpace: CHIP_WHITE_SPACE,
  }
}

/**
 * 选择格的类名:基座 + 形态 + 跨列 + 选中。
 * 2026-10-04 付费闭环访客四题改版首例(照抄智联选身份大卡、Airbnb 房型图标格;调研截图见设计稿)。
 * 2026-10-05 跨列(占满整行)那一档删(Frank「加拿大境外怎么是长条的」,唯一的用户改回普通格子)。
 *
 * @param x 选中、大卡形两个开关。
 * @returns 类名串。
 */
export function tileClsOf(x: TileClsIn): string {
  const out = [css.tile]
  if (x.card) {
    out.push(css.card)
  }
  if (x.active) {
    out.push(css.tileOn)
  }
  return out.join(CLS_SEP)
}

/**
 * 一行选项的类名:基座 + 选中叠主色(2026-10-05 ChipLine 立)。
 * 同日多一档点不动(叠灰字;选中优先 —— 选中的行不会点不动,两个都真时只叠选中)。
 *
 * @param x 选中没有、点不动没有。
 * @returns 类名串。
 */
export function lineClsOf(x: LineClsIn): string {
  if (x.active) {
    return cssOf(css.line) + CLS_SEP + cssOf(css.lineOn)
  }
  if (x.off) {
    return cssOf(css.line) + CLS_SEP + cssOf(css.lineOff)
  }
  return cssOf(css.line)
}

/**
 * 把一行文字切成命中前 / 命中 / 命中后三截(不分大小写找检索词第一处;空检索词或找不到 = 整行在 pre)。
 * 只做显示:搜索命中是服务端按八档比的(可能命中的是另一门语言的名字或官方长名),这里找不到就不标,不另判命中。
 *
 * @param x 整行文字与检索词。
 * @returns 三截。
 */
export function markPartsOf(x: MarkPartsIn): MarkParts {
  const mark = x.mark.trim()
  if (mark === MARK_NONE) {
    return { pre: x.label, hit: MARK_NONE, post: MARK_NONE }
  }
  const at = x.label.toLowerCase().indexOf(mark.toLowerCase())
  if (at < 0) {
    return { pre: x.label, hit: MARK_NONE, post: MARK_NONE }
  }
  return { pre: x.label.slice(0, at), hit: x.label.slice(at, at + mark.length), post: x.label.slice(at + mark.length) }
}
