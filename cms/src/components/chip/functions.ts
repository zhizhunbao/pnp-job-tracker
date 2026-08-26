/**
 * chip 域的纯函数(零 JSX 零 hook)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import {
  CHIP_BG_OFF, CHIP_BG_ON, CHIP_BORDER_HOT, CHIP_BORDER_OFF, CHIP_BORDER_ON, CHIP_C_HOT, CHIP_C_OFF, CHIP_C_ON,
  CHIP_CURSOR, CHIP_FONT_SIZE, CHIP_PADDING, CHIP_RADIUS, CHIP_WHITE_SPACE, CLS_SEP, FONT_WEIGHT_OFF, FONT_WEIGHT_ON,
} from './constants'
import type { ChipClsIn } from './types'
import css from './chip.module.css'

/**
 * 筛选药丸的类名预算:基座 + 选中/强调红(选中优先 —— 两个都真时只叠选中)。
 *
 * @param x 两个态开关。
 * @returns 拼好的 className。
 */
export function chipClsOf(x: ChipClsIn): string {
  const out = [css.chip]
  if (x.active) {
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
