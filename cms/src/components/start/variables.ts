/**
 * start 域(/start 就业把脉首页)的运行时状态:三份服务端进程内缓存。
 * 三份装的都是**与用户无关的聚合**,Render 单实例、进程缓存即全局缓存;
 * 逐用户的两格(预选省、抓取时刻)不进这里 —— 前者按会话算,后者由
 * lib/jobs/queries 自带 30s 缓存。
 *
 * ⚠️ 写成一个容器对象而不是几个 `export let`:后者跨模块是只读活绑定,
 * 别的文件里赋值当场编译错;改属性才合法,顺带逼着每一处写明「我在改哪一格状态」。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import type { StartCache } from './types'

/**
 * 本域全部可变状态。三格都是 TTL 缓存(时长见 constants 的 HOME_TTL_MS / DICT_TTL_MS):
 * home 装首页那一大份聚合(判决证据 / 抽选 / 政策 / 省卡 / 橱窗,10 分钟);
 * occOpts 与 catOpts 装职业筛与分类联动的字典(1 小时,旧货架页同款手法)。
 */
export const CACHE: StartCache = {
  /**
   * 首页聚合;null = 没拉过。
   */
  home: null,

  /**
   * 职业筛 datalist 候选;null = 没拉过。
   */
  occOpts: null,

  /**
   * 职业筛联动的中/小类名;null = 没拉过。
   */
  catOpts: null,
}
