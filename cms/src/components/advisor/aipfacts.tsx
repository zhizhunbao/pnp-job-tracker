'use client'
/**
 * 大西洋试点(AIP)的事实块。批A #134 三态直判(空壳修)—— 未命中也要说,是结论不是空;
 * 名单来源注删(Frank「名单来源也不需要」)。命中清单放开跨省(原限本省):
 * 同雇主在其他大西洋省上榜 = 更强信号,一并列出。
 * E6-09:省里逐条点名「这些职业的 AIP 背书不受理」—— 与雇主是否指定雇主是两件事,两条都要说。
 * 2026-08-28 换装批自 Advisor.tsx 重写落位。
 * 2026-10-01 Frank「这个弹框需要列表,然后高亮雇主」:命中雇主那几行(按名字完全相等对,o/a 经营名对不上就一行不出)撤,
 * 下面改挂 pnp 桶的 AipEmpCard —— 列本省全部 AIP 指定雇主,本岗雇主高亮置顶。
 * 同日 Frank「PNP 弹框 里面的 AIP 部分 提出来,放到 AIP 弹框吗?」「都做吧」:清单卡下面接 pnp 桶的 AipSection —— 本岗能走的 AIP 通道与
 * AIP 抽选卡,原在省提名弹框,原样搬来。
 * 同日三弹框统一(Frank「统一一下 ee pnp aip 弹框的顺序 和 格式」「这个嵌套删了」「改成这种不行吗」,看过效果图「可以,做吧」):
 * 判定卡(直判胶囊 + 省里点名行)撤 —— 能走由通道卡说,走不了由「本岗不满足的门槛」卡说;清单卡挪进 AipSection,整块按
 * 结论 → 门槛 → 名单 → 抽选 排(与省提名、EE 弹框同一骨架)。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { AipSection } from '@/components/pnp'
import type { AdvisorFactsIn } from './types'

/**
 * 渲染 AIP 事实块。
 *
 * @param props 取数包。
 * @returns AIP 弹框整块(结论卡、门槛卡、本省 AIP 指定雇主清单卡与抽选卡)。
 */
export function AipFacts({ f }: AdvisorFactsIn) {
  return <AipSection job={f.job} lang={f.lang} employers={f.desigEmp} />
}
