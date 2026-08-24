/**
 * button 域的纯函数(零 JSX 零 hook)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { ACTION_KINDS } from './constants'
import type { BtnClsIn, ButtonKind } from './types'
import css from './button.module.css'

/**
 * 按钮的类名预算:基座 + 尺寸档 + 变体 + 调用方追加类。
 * 变体 → 类是查表(键完整性由 Record<ButtonKind, string> 管);sm/lg 都传按 sm 算。
 *
 * @param x 变体与尺寸档。
 * @returns 拼好的 className。
 */
export function btnClsOf(x: BtnClsIn): string {
  const kindCls: Record<ButtonKind, string> = {
    primary: css.primary,
    pro: css.pro,
    secondary: css.secondary,
    ai: css.ai,
    ghost: css.ghost,
    danger: css.danger,
    icon: css.icon,
    iconGhost: css.iconGhost,
    box: css.box,
    step: css.step,
    tab: css.tab,
    drop: css.drop,
    seg: css.seg,
    menu: css.menu,
    groupRow: css.groupRow,
    dot: css.dot,
    linkText: css.linkText,
    linkDim: css.linkDim,
  }
  const cls = []
  // 基座只给**行动钮**:控件钮的形状由自己那一档定死,套上基座反而要一条条盖回去。
  if (isAction(x.kind)) {
    cls.push(css.btn)
    if (x.sm) {
      cls.push(css.sm)
    } else if (x.lg) {
      cls.push(css.lg)
    }
  } else {
    cls.push(css.ctl)
  }
  cls.push(kindCls[x.kind])
  if (x.active) {
    cls.push(css.on)
  }
  if (x.className != null) {
    cls.push(x.className)
  }
  return cls.join(' ')
}

/**
 * 是不是行动钮(六个带颜色语义的);其余是控件钮,形状由自己那一档定。
 *
 * @param kind 变体。
 * @returns 是行动钮吗。
 */
function isAction(kind: ButtonKind): boolean {
  return ACTION_KINDS.includes(kind)
}

/**
 * 「浏览器返回」的统一行为(2026-07-28 Frank 实报「职位板返回有时候老慢了,而且还不生效」)。
 * 不生效的根因:详情页/公司页站内一律 target="_blank" 打开,新标签页里
 * `history.length === 1` 且 rel="noreferrer" 抹掉 referrer —— `history.back()` 是**空操作**,
 * 用户点了页面纹丝不动(生产实测:history_length=1、点后 URL 不变)。
 * 无处可回时落回 fallback;职位板带 ?back=1 回放筛选快照(与详情页 × 同一口径,
 * 快照存 localStorage 跨标签页通用)。
 *
 * @param fallback 无历史可回时跳转的地址。
 * @returns 无。
 */
export function goBackOr(fallback: string) {
  if (typeof window === 'undefined') {
    return
  }
  if (window.history.length > 1) {
    window.history.back()
  } else {
    window.location.href = fallback
  }
}
