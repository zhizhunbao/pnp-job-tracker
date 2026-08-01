// #129(2026-07-25 Frank「把所有功能都加上埋点,基于用户行为数据判断增强哪部分」):
// 功能级 umami 自定义事件统一入口。umami 未注入(本地/屏蔽)= 静默 no-op;
// 事件名扁平 kebab(umami 事件面板按名聚合),data 只放低基数枚举值,不放个人数据(隐私页承诺)。
//
// 2026-08-01(主线 M2 / E7-05)加第二条腿:漏斗那五步同时打到**自己的** /api/track。
// 两个原因:① umami 免费档不开放 API,拉不出数;② 它的脚本会被广告拦截器挡掉,
// 而「锁区曝光」正是要精确计数的那一步。第一方计数只存按天次数,不存任何能识别到人的东西。
// 调用点一律不改:哪些名字算漏斗、归到哪一步,全在 lib/funnel 的白名单里。
import { toFunnelHit } from './funnel'

export const track = (event: string, data?: Record<string, string | number>) => {
  try { (window as unknown as { umami?: { track: (e: string, d?: object) => void } }).umami?.track(event, data) } catch { /* umami absent */ }
  try {
    if (!toFunnelHit(event)) return          // 不是漏斗那五步 → 不打第一方(表只留能读的数)
    const body = JSON.stringify({ event, prop: pickProp(data) })
    // sendBeacon:页面跳走也送得出去(pricing 打开后立刻跳转的场景);不支持就退 fetch keepalive
    if (navigator.sendBeacon?.('/api/track', new Blob([body], { type: 'application/json' }))) return
    void fetch('/api/track', { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(() => {})
  } catch { /* 埋点永远不该弄崩页面 */ }
}

// 只挑得出低基数枚举的那一个值当分组;NOC 这类高基数的不传(会把日聚合表撑成明细表)
const pickProp = (data?: Record<string, string | number>): string | undefined => {
  const v = data?.plan ?? data?.kind ?? data?.card
  return typeof v === 'string' ? v : undefined
}
