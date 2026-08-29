/**
 * 职位域的全部可变状态:匹配维度包、count/新鲜度/证言微缓存、JD 懒抓的单飞与负缓存。
 * 摆成一个容器对象 —— 这个域一共多少可变状态,一眼数得清;改属性的每一处都写明改哪一格。
 *
 * @author Frank
 * @time 2026-08-22 00:05:00
 */

import type { JobsCache } from './types'

/**
 * 职位域全部的可变状态,就这十一格。
 */
export const CACHE: JobsCache = {
  /**
   * 匹配维度包(pnp/ee 清单,1h TTL;advisor 与 alerts 共用)。开机是空的。
   */
  dims: null,

  /**
   * 首屏 SSR 的整包维度(2026-07-28 Frank「职位板返回有时候老慢了」的根因之一):
   * 首屏每次都重拉 8 张维度表(pnp-occupations ≤5000 行 + ee-categories 2000 +
   * noc-categories 1000…),0.25CPU 小库上就是 1-2 秒 —— 与 /api/jobs 里那层缓存治的是同一个病
   * (2026-07-19「排序 3-4 秒」),当时只治了排序那条路,没治首页。串行实测旁证:同为动态页的
   * /pricing TTFB 0.13s,职位板 1.6~3.4s。维度表随 seed 小时级更新,10 分钟陈旧完全可接受;
   * 单实例部署,进程缓存即全局缓存。**只缓存与用户无关的维度** —— 职位行/总数/更新时间照常现查
   * (页头「更新时间」不能陈旧)。开机是空的。
   */
  ssrDims: null,

  /**
   * WHERE 签名 → 总数微缓存(2026-07-19「排序 3-4 秒」第二刀)。
   */
  counts: new Map(),

  /**
   * 最近核对时刻微缓存。
   */
  checked: null,

  /**
   * 证言三连数缓存(2026-08-03 生产僵死事故后的保险)。
   */
  proof: null,

  /**
   * 热门职业榜缓存(limit → 榜;10 分钟)。
   */
  topNocs: new Map(),

  /**
   * JD 懒抓单飞表。
   */
  jdInflight: new Map(),

  /**
   * JD 懒抓负缓存表。
   */
  jdFailed: new Map(),

  /**
   * 投递邮箱正缓存。
   */
  applyMail: new Map(),

  /**
   * 投递抓取失败负缓存。
   */
  applyFail: new Map(),

  /**
   * jdformat 五节整理的同岗单飞。
   */
  jdFormatInflight: new Map(),

  /**
   * JD 整理版译文缓存。
   */
  jdTransBy: new Map(),
}
