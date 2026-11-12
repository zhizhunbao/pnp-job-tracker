/**
 * review 子桶 jdonly 的行为:只取职位描述,和不做事的两只手柄。
 * 2026-11-11 Frank「这两个能共用一个样式和弹框吗」:基础简历投递屏改用三栏外框,右栏的职位描述要自己取一次;
 * review 的 functions.ts 贴着 1000 行的线,这几件切成子桶。依赖只许 review → 本子桶(经 index.ts),本子桶不取 review 的任何东西。
 *
 * @author Frank
 * @time 2026-11-12 03:00:00
 */
import { CRED_INCLUDE, TEXT_NONE, URL_STATE } from './constants'
import type { JdLoadIn, JdStateJson, NoopFn } from './types'

/**
 * 取这一岗的职位描述(取不到留空,那张卡就是空的,不挡投递)。
 *
 * @param x 职位 id 与落格。
 * @returns 无。
 */
export async function loadJdOnly(x: JdLoadIn): Promise<void> {
  try {
    const r = await fetch(URL_STATE + String(x.jobId), { credentials: CRED_INCLUDE })
    const d = await r.json() as JdStateJson
    if (typeof d.jd === 'string') {
      x.setJd(d.jd)
    }
  } catch {
    x.setJd(TEXT_NONE)
  }
}

/**
 * 不做事的「点高亮」(基础简历那一屏没有核对结果,职位描述里没有可点的高亮)。
 *
 * @param _n 序号(不用)。
 * @returns 无。
 */
export function noopPick(_n: number): void {
  return
}

/**
 * 不做事的「点没覆盖的要求」手柄工厂(同上:没有核对结果)。
 *
 * @param _r 要求(不用)。
 * @returns 不做事的手柄。
 */
export function noopFixOf(_r: object): NoopFn {
  return noopFix
}

/**
 * 不做事。
 *
 * @returns 无。
 */
function noopFix(): void {
  return
}
