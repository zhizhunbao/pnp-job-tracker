/**
 * 测试用的判定引擎装配件:把 ruling 的 pathVerdict 适配成 consult 的注入形状。
 * 与 consult/routes.ts 里的 judgeVerdictAdapter 同一件事 —— 测试也是装配层,
 * 装配的形状只写这一份,五个 spec 共用。
 *
 * @author Frank
 * @time 2026-08-25 22:30:00
 */
import { pathVerdict } from '@/lib/ruling/server'
import type { VerdictData as RulingVerdictData } from '@/lib/ruling'
import type { JudgeVerdictIn, PathwayVerdict } from '@/lib/consult'

/**
 * 注入判定引擎的适配器。🔴 **跨边界断言,原因说清楚**(2026-08-25 撤跨域 type 批):
 * consult 的 `VerdictData` 是不透明透传格(本域零处读它),而 pathVerdict 要 ruling
 * 自己的底表形状 —— 两个类型没有共同属性,断言只住这一行;profile 与返回行是
 * 全格照抄/子集声明,结构兼容不经断言。
 *
 * @param input consult 侧的判定入参。
 * @returns 判定行(consult 只读子集)。
 */
export function judgeWithRuling(input: JudgeVerdictIn): PathwayVerdict[] {
  return pathVerdict({ profile: input.profile, data: input.data as RulingVerdictData })
}
