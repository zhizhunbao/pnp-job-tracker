'use client'
/**
 * 职位框 / 公司框的全站宿主(2026-10-09 N 批,Frank「一个全站宿主,并掉各页那 5 套」「别放到 advisor 吧」):
 * 挂在全站骨架上(GateSync、ApplyHost 旁),全站只有它持一个弹框栈;职位板、职位页、公司页、雇主板、「我的」原先各自的
 * 栈与 PeekStack 撤,改发弹框总线(modal 桶 usePeekBus / PeekContext)。层的渲染照旧是 advisor 的 PeekStack。
 *
 * @author Frank
 * @time 2026-10-09 06:00:00
 */
import { PeekStack } from '@/components/advisor'
import { usePeekHost } from './hooks'

/**
 * 全站宿主。
 *
 * @returns 栈里各层的弹框;一层都没开什么都不渲。
 */
export function PeekHost() {
  const h = usePeekHost()
  return <PeekStack stack={h.stack} lang={h.lang} plan={h.plan} nocDesc={h.nocDesc} />
}
