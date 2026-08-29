'use client'
/**
 * 域内小件:手机卡上的一枚通道胶囊。胶囊统一规格(08-10 Frank「所有胶囊的风格可以改成一样的吗」):
 * 几何对齐,语义色是数据(一个字段一套色),三个色值在样式里一处定死。
 * #175:不可点的连 onClick 也摘 —— 挂上 stopPropagation 会吞整卡点击(点了没反应)。
 * 2026-08-28 换装批自 Jobs.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { chipClsOf, titleOrNone } from './functions'
import type { BoardChipIn } from './types'

/**
 * 渲染一枚通道胶囊。
 *
 * @param props 胶囊规格与点开对应弹框的手柄(不可点时给 null)。
 * @returns 一枚胶囊。
 */
export function BoardChip({ spec, onOpen }: BoardChipIn) {
  if (onOpen == null) {
    return <span title={titleOrNone(spec.tip)} className={chipClsOf(spec)}>{spec.text}</span>
  }
  return (
    <span title={titleOrNone(spec.tip)} onClick={onOpen} className={chipClsOf(spec)}>{spec.text}</span>
  )
}
