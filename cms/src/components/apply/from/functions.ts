/**
 * apply 桶的子桶 from 的行为:记下这一封投递是从哪个页面发起的(2026-11-11 任务书第 48 条)。
 * 各入口开投递框之前调一次;写成一枚留一天的 cookie,存草稿与发送的请求自动带上,服务端记进 applications.entry。
 *
 * @author Frank
 * @time 2026-11-11 23:50:00
 */
import { FROM_COOKIE, FROM_COOKIE_TAIL, FROM_EQ, FROM_SEP } from './constants'
import type { FromIn } from './types'

/**
 * 记投递入口(同一岗后记的盖掉先记的)。
 *
 * @param x 职位 id 与入口。
 * @returns 无。
 */
export function rememberFrom(x: FromIn): void {
  document.cookie = FROM_COOKIE + FROM_EQ + String(x.jobId) + FROM_SEP + x.from + FROM_COOKIE_TAIL
}
