/**
 * start 域(/start 就业把脉首页)的运行时状态:一份服务端进程内缓存。
 * 装的是**与用户无关的聚合**,Render 单实例、进程缓存即全局缓存;
 * 逐用户的两格(预选省、抓取时刻)不进这里 —— 前者按会话算,后者由
 * lib/jobs/queries 自带 30s 缓存。
 * 2026-09-04 重构:职业筛与分类联动的两张字典缓存随筛选下拉一起撤,只剩首页聚合一格。
 *
 * ⚠️ 写成一个容器对象而不是几个 `export let`:后者跨模块是只读活绑定,
 * 别的文件里赋值当场编译错;改属性才合法,顺带逼着每一处写明「我在改哪一格状态」。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import type { StartCache, StartGlobal } from './types'

/**
 * 进程全局对象(本域只读写它上面 offer2prStartCache 一格)。
 * 🔵 2026-11-06 Frank「改成共用」:缓存容器挂 globalThis —— Next 里 /start 页面门与 /api/stats/pulse 路由属不同打包层,
 * 各加载一份本模块,原先各有一个 CACHE,每 10 分钟各冷查一遍首页聚合(生产构建实测:页面冷查后接口又冷查 4 秒、堆 +25MB),
 * 单飞也只在各自那份里生效。挂到进程全局上,两边拿同一个对象:过期后只冷查一遍。首例写法(此前全站缓存都住模块级)。
 */
const G: StartGlobal = globalThis

if (G.offer2prStartCache == null) {
  G.offer2prStartCache = {
    /**
     * 首页聚合;null = 没拉过。
     */
    home: null,

    /**
     * 正在查的那一份首页聚合(单飞;2026-11-05);null = 没在查。
     */
    homeLoad: null,
  }
}

/**
 * 本域全部可变状态。一格 TTL 缓存(时长见 constants 的 HOME_TTL_MS):
 * home 装首页那一大份聚合(判决证据 / 担保雇主 / 省卡 / 逐日在招量,10 分钟)。
 * 2026-11-06 起是挂在 globalThis 上的那一个对象(见上),页面门与路由共用。
 */
export const CACHE: StartCache = G.offer2prStartCache
