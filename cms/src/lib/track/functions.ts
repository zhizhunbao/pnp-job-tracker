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
 * 2026-09-26 /fe Frank:投递 / 注册成功 / 发起付款 / 周报开关四处原先绕过本门直调 window.umami,
 * 并进本门后第一方表也有数;同日添自排除开关(Umami 官方键 + `?notrack=` 网址开关,见 syncTrackSwitch),
 * 键在 = 第一方那条腿也不发,Umami 那条腿由它自己的脚本判。
 *
 * @author Frank
 * @time 2026-08-22 19:27:15
 */

import { toFunnelHit } from '../funnel'
import { log, TRACK_LOG } from '../log'
import {
  JSON_MIME, METHOD_POST, NOTRACK_OFF, NOTRACK_ON, P_NOTRACK, PROP_NONE, TRACK_URL, UMAMI_OFF_KEY, UMAMI_OFF_NONE,
  UMAMI_OFF_VAL,
} from './constants'
import type { MaybeTrackData, TrackData, UmamiLike } from './types'
import { HDR_CONTENT_TYPE_LC } from '../http'

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
 * 第一方那条腿(漏斗白名单命中才打;这台设备自排除了就不打 —— 2026-09-26 /fe Frank)。
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
    if (isTrackOff()) {
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
    void fetch(TRACK_URL, { method: METHOD_POST, body, headers: { [HDR_CONTENT_TYPE_LC]: JSON_MIME }, keepalive: true }).catch(ignoreTrackFailure)
  } catch {
    return
  }
}

/**
 * 这台设备自排除了吗:Umami 官方键有值 = 不计(键由 syncTrackSwitch 按网址开关写;判法跟 Umami 同口径,
 * 空串算没关)。读 localStorage 会抛(无痕模式 / 站点数据被禁)—— 抛了留痕、照常计数:读不到开关
 * 就当没开,宁可多记一条也不丢(同漏斗域 HOST_NONE 的方向)。
 *
 * @returns 自排除了 = true。
 */
function isTrackOff(): boolean {
  try {
    const v = localStorage.getItem(UMAMI_OFF_KEY)
    return v != null && v !== UMAMI_OFF_NONE
  } catch (e) {
    log({ tag: TRACK_LOG.tag, text: TRACK_LOG.offReadFailed + String(e) })
    return false
  }
}

/**
 * 只挑得出低基数枚举的那一个值当分组;NOC 这类高基数的不传(会把日聚合表撑成明细表)。
 * 2026-09-26 /fe Frank:转化四事件入第一方表,补认两格 —— mode(投递方式 email|web)与
 * on(周报开关 true|false);邮箱、公司名、岗位号不在任何一格里,永不进分组。
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
  } else if (data.mode != null) {
    v = data.mode
  } else if (data.on != null) {
    v = data.on
  }
  if (typeof v === 'string') {
    return v
  }
  return PROP_NONE
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

/**
 * 网址自排除开关:地址带 `?notrack=1` 就写 Umami 官方键(这台设备从此两套口径都不计),`?notrack=0` 删键
 * 恢复;别的值或不带参数什么都不动。iOS Chrome 没有控制台,这是手机上写 localStorage 的唯一办法
 * (2026-09-26 /fe Frank:本人两台设备占近 30 天全站浏览 47%,各点一次即可)。
 * 读写抛了(无痕模式会抛)留痕,不拦页面。
 *
 * @returns 无。
 */
export function syncTrackSwitch(): void {
  try {
    const v = new URLSearchParams(window.location.search).get(P_NOTRACK)
    if (v === NOTRACK_ON) {
      localStorage.setItem(UMAMI_OFF_KEY, UMAMI_OFF_VAL)
    } else if (v === NOTRACK_OFF) {
      localStorage.removeItem(UMAMI_OFF_KEY)
    }
  } catch (e) {
    log({ tag: TRACK_LOG.tag, text: TRACK_LOG.switchFailed + String(e) })
  }
}
