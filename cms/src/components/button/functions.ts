/**
 * button 域的纯函数(零 JSX 零 hook)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { cssOf } from '@/components/css'
import { ACTION_KINDS, CLS_SEP } from './constants'
import type { BtnClsIn, ButtonKind } from './types'
import css from './button.module.css'

/**
 * 按钮的类名预算:基座 + 尺寸档 + 变体 + 调用方追加类。
 * 变体与类**同名**,按需取一格 —— 不急切构造全表:十二个控件钮变体是规划位
 * (2026-08-24 拍板,调用点迁移批未做,类未写),急切构造会让首个按钮渲染就撞上
 * 规划位的缺类;按需取则只校验真用到的那一格,用到缺类仍当场炸(cssOf 的口径)。
 * sm/lg 都传按 sm 算。
 *
 * @param x 变体与尺寸档。
 * @returns 拼好的 className。
 */
export function btnClsOf(x: BtnClsIn): string {
  const cls = []
  // 基座只给**行动钮**:控件钮的形状由自己那一档定死,套上基座反而要一条条盖回去。
  if (isAction(x.kind)) {
    cls.push(cssOf(css.btn))
    if (x.sm) {
      cls.push(cssOf(css.sm))
    } else if (x.lg) {
      cls.push(cssOf(css.lg))
    }
  } else {
    cls.push(cssOf(css.ctl))
  }
  cls.push(cssOf(css[x.kind]))
  if (x.active) {
    cls.push(cssOf(css.on))
  }
  if (x.className != null) {
    cls.push(x.className)
  }
  return cls.join(CLS_SEP)
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
