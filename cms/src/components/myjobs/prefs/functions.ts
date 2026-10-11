/**
 * myjobs 子桶 prefs 的函数(2026-10-10 批 2「新岗推送」卡:拉 / 存「把推荐和收藏动态发到邮箱」的频率与收件邮箱)。
 * 父桶 functions.ts 逼近 1000 行闸,按关注点切出这一族(照 apply/letter 子桶首例);依赖只许父桶 → 子桶(经本目录 index.ts),
 * 子桶不取父桶任何东西,要用的常量各自抄、形状本桶自声明。卡本身(push.tsx)仍住父桶(拼父桶的分区卡与样式)。
 *
 * @author Frank
 * @time 2026-10-10 20:00:00
 */
import { toast } from '@/components/toast'
import { track } from '@/lib/track'
import {
  CRED_INCLUDE, EMAIL_MAX, EV_PUSH, E_EMAIL, FREQ_KEYS, FREQ_OFF, HDR_CONTENT_TYPE, METHOD_POST, MIME_JSON, PUT_MAIL,
  PUT_PENDING, TEXT_NONE, TOAST_ERR, TOAST_OK, TOAST_WARN, URL_PUSH,
} from './constants'
import type {
  FreqLabelFn, LoadPushIn, PushNoteIn, PushPrefsJson, PushSaveJson, PushToast, SavePushIn, TFn,
} from './types'

/**
 * 造「拉一次推送设置」。
 *
 * @param x 落格。
 * @returns 拉设置的函数。
 */
export function makeLoadPush(x: LoadPushIn): () => Promise<void> {
  return async function loadPush(): Promise<void> {
    try {
      const r = await fetch(URL_PUSH, { credentials: CRED_INCLUDE })
      if (r.ok === false) {
        x.setFailed(true)
        return
      }
      const d = await r.json() as PushPrefsJson
      x.setFreq(freqInOf(d))
      let email = TEXT_NONE
      if (d.email != null) {
        email = d.email
      }
      x.setEmail(email)
      x.setReady(true)
    } catch {
      x.setFailed(true)
    }
  }
}

/**
 * 接口的频率 → 下拉的值(off / 缺席 / 认不得 = 空串,即「不发」档)。
 *
 * @param d 设置回包。
 * @returns 下拉的值。
 */
export function freqInOf(d: PushPrefsJson): string {
  if (d.freq == null || d.freq === FREQ_OFF || FREQ_KEYS[d.freq] == null) {
    return TEXT_NONE
  }
  return d.freq
}

/**
 * 下拉的值 → 接口的频率(空串 = off)。
 *
 * @param v 下拉的值。
 * @returns 接口的频率。
 */
export function freqOutOf(v: string): string {
  if (v === TEXT_NONE) {
    return FREQ_OFF
  }
  return v
}

/**
 * 造频率下拉的选项字。
 *
 * @param t 取词函数。
 * @returns 值 → 字。
 */
export function makeFreqLabel(t: TFn): FreqLabelFn {
  return function freqLabel(v: string): string {
    const key = FREQ_KEYS[v]
    if (key == null) {
      return v
    }
    return t(key)
  }
}

/**
 * 造「点保存」:POST 设置;回包 saved 出「已保存」,pending 出「点 X 收到的链接后生效」,mail 出「确认信没发出去」,
 * 邮箱格式不对 / 别的失败各出一句(不静默)。
 *
 * @param x 频率、邮箱、取词函数与两个落格。
 * @returns 点击手柄。
 */
export function makeSavePush(x: SavePushIn): () => Promise<void> {
  return async function savePush(): Promise<void> {
    const email = x.email.trim()
    if (email === TEXT_NONE || email.length > EMAIL_MAX) {
      x.setNote(x.t('mj.pushBad'))
      return
    }
    x.setBusy(true)
    x.setNote(TEXT_NONE)
    try {
      const r = await fetch(URL_PUSH, {
        method: METHOD_POST,
        credentials: CRED_INCLUDE,
        headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
        body: JSON.stringify({ freq: freqOutOf(x.freq), email }),
      })
      const d = await r.json() as PushSaveJson
      if (d.error === E_EMAIL) {
        x.setNote(x.t('mj.pushBad'))
      } else {
        toast(pushToastOf({ d, ok: r.ok, email, t: x.t }))
      }
      if (r.ok) {
        track(EV_PUSH, { on: String(freqOutOf(x.freq) !== FREQ_OFF) })
      }
    } catch {
      toast({ kind: TOAST_ERR, title: x.t('mj.pushFail'), detail: TEXT_NONE })
    }
    x.setBusy(false)
  }
}

/**
 * 存设置回包 → 那一句。
 * 2026-10-11 批 5「提示统一 + 顶栏铃铛」:那一句从卡里挪到右上角提示(改名 pushToastOf);邮箱格式不对要他改框,
 * 照旧贴在邮箱框下面(调用方先判掉,不进这里)。换了邮箱 = 确认信已发出 + 灰字「点 <邮箱> 收到的链接后生效」。
 *
 * @param x 回包、HTTP 成没成、邮箱与取词函数。
 * @returns 一条提示。
 */
export function pushToastOf(x: PushNoteIn): PushToast {
  if (x.ok === false) {
    return { kind: TOAST_ERR, title: x.t('mj.pushFail'), detail: TEXT_NONE }
  }
  if (x.d.result === PUT_PENDING) {
    return { kind: TOAST_OK, title: x.t('mj.pushMailSent'), detail: x.t('mj.pushPending', { e: x.email }) }
  }
  if (x.d.result === PUT_MAIL) {
    return { kind: TOAST_WARN, title: x.t('mj.pushMailFail'), detail: TEXT_NONE }
  }
  return { kind: TOAST_OK, title: x.t('mj.pushSaved'), detail: TEXT_NONE }
}
