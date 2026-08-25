/**
 * #129(2026-07-25 Frank「把所有功能都加上埋点,基于用户行为数据判断增强哪部分」):
 * 功能级 umami 自定义事件统一入口。umami 未注入(本地/屏蔽)= 静默 no-op;
 * 事件名扁平 kebab(umami 事件面板按名聚合),data 只放低基数枚举值,不放个人数据(隐私页承诺)。
 *
 * 2026-08-01(主线 M2 / E7-05)加第二条腿:漏斗那几步同时打到**自己的** /api/funnel/track。
 * 两个原因:① umami 免费档不开放 API,拉不出数;② 它的脚本会被广告拦截器挡掉,
 * 而「锁区曝光」正是要精确计数的那一步。第一方计数只存按天次数,不存任何能识别到人的东西。
 * 调用点一律不改:哪些名字算漏斗、归到哪一步,全在 lib/funnel 的白名单里。
 *
 * @author Frank
 * @time 2026-08-22 19:27:15
 */

import { toFunnelHit } from '../funnel'
import { JSON_MIME, METHOD_POST, PROP_NONE, TRACK_URL } from './constants'
import type { MaybeTrackData, TrackData, UmamiLike } from './types'

/**
 * 只挑得出低基数枚举的那一个值当分组;NOC 这类高基数的不传(会把日聚合表撑成明细表)。
 *
 * @param data 埋点附加值。
 * @returns 低基数分组值;没有则空串。
 */
function pickProp(data: MaybeTrackData): string {
  if (data == null) {
    return PROP_NONE
  }
  let v: string | number | null = null
  if (data.plan != null) {
    v = data.plan
  } else if (data.kind != null) {
    v = data.kind
  } else if (data.card != null) {
    v = data.card
  }
  if (typeof v === 'string') {
    return v
  }
  return PROP_NONE
}

/**
 * 上报一条功能事件(umami + 命中漏斗白名单时的第一方 /api/funnel/track)。
 * 埋点永远不该弄崩页面 —— 两条腿各自吞错。
 * sendBeacon 优先:页面跳走也送得出去(pricing 打开后立刻跳转的场景);不支持退 fetch keepalive。
 *
 * @param event 扁平 kebab 事件名。
 * @param data 低基数枚举附加值。
 * @returns 无。
 */
// eslint-disable-next-line local/one-parameter, local/no-optional -- 72 个调用点的埋点门面:接口形态(两参、第二参可省)由消费端人体工学定,同 callbacks 例外逻辑(2026-08-22 入闸时特批)
export function track(event: string, data?: TrackData): void {
  try {
    // eslint-disable-next-line local/no-double-assertion, local/no-unknown-type -- window 上第三方脚本挂的全局:形状由 umami 定,两步断言是唯一的读法
    const w = window as unknown as UmamiLike
    if (w.umami != null) {
      w.umami.track(event, data)
    }
  } catch {
    return trackFirstParty(event, data)
  }
  return trackFirstParty(event, data)
}

/**
 * 第一方那条腿(漏斗白名单命中才打)。
 *
 * @param event 事件名。
 * @param data 附加值。
 * @returns 无。
 */
// eslint-disable-next-line local/one-parameter, local/no-optional -- 同 track 的门面形态,只作它的内部半步
function trackFirstParty(event: string, data?: TrackData): void {
  try {
    if (toFunnelHit({ name: event, prop: null }) == null) {
      return
    }
    let d: TrackData | null = null
    if (data != null) {
      d = data
    }
    let prop: string | null = pickProp(d)
    if (prop === '') {
      prop = null
    }
    const body = JSON.stringify({ event, prop })
    if (typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(TRACK_URL, new Blob([body], { type: JSON_MIME }))) {
      return
    }
    void fetch(TRACK_URL, { method: METHOD_POST, body, headers: { 'content-type': JSON_MIME }, keepalive: true }).catch(ignoreTrackFailure)
  } catch {
    return
  }
}

/**
 * 第一方上报失败的吞错(埋点不崩页面、也不刷屏)。
 *
 * @param _e 捕到的错误(不用)。
 * @returns 无。
 */
function ignoreTrackFailure(_e: Error): void {
  return
}
