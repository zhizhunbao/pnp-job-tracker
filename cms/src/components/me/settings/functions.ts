/**
 * me 桶子桶 settings 的行为:开关面板、提交改密码 / 改登录邮箱、结果码 → 一句报错。
 *
 * @author Frank
 * @time 2026-11-07 23:55:00
 */
import { toast } from '@/components/toast'
import {
  CRED_INCLUDE, E_MATCH, E_NET, E_WEAK, ERR_KEY, HDR_CONTENT_TYPE, METHOD_POST, MIME_JSON, NET_KEY, PROVIDER_GOOGLE,
  PW_MASK, PW_MIN_LEN, TEXT_NONE, TOAST_OK, URL_EMAIL, URL_PW,
} from './constants'
import type {
  ErrOfIn, PanelSetIn, PostOut, PostSettingsIn, PostRespJson, PwValueIn, SettingsMe, SubmitIn,
} from './types'

/**
 * 造「开 / 关面板」:先清表单与报错,再拨面板。
 *
 * @param x 开哪个、拨面板与清表单。
 * @returns 点击手柄。
 */
export function makePanel(x: PanelSetIn): () => void {
  return function setPanelTo(): void {
    x.reset()
    x.setPanel(x.key)
  }
}

/**
 * 造「提交修改密码」:前端先判新密码长度与两次一致,再交服务端核对当前密码。
 *
 * @param x 取词、三个密码格与落格。
 * @returns 点击手柄。
 */
export function makeSubmitPw(x: SubmitIn): () => void {
  return function submitPw(): void {
    void runPw(x)
  }
}

/**
 * 提交修改密码的那一趟。
 *
 * @param x 同 makeSubmitPw。
 * @returns 无。
 */
export async function runPw(x: SubmitIn): Promise<void> {
  if (x.next.length < PW_MIN_LEN) {
    x.setErr(errOf({ t: x.t, code: E_WEAK }))
    return
  }
  if (x.next !== x.again) {
    x.setErr(errOf({ t: x.t, code: E_MATCH }))
    return
  }
  x.setBusy(true)
  const code = await postSettings({ url: URL_PW, body: { current: x.cur, next: x.next } })
  x.setBusy(false)
  if (code !== TEXT_NONE) {
    x.setErr(errOf({ t: x.t, code }))
    return
  }
  toast({ kind: TOAST_OK, title: x.t('set.pwOk') })
  x.close()
}

/**
 * 造「提交修改登录邮箱」:服务端核对当前密码后往新邮箱发确认信,点了才生效。
 *
 * @param x 取词、新邮箱、当前密码与落格。
 * @returns 点击手柄。
 */
export function makeSubmitEmail(x: SubmitIn): () => void {
  return function submitEmail(): void {
    void runEmail(x)
  }
}

/**
 * 提交修改登录邮箱的那一趟。
 *
 * @param x 同 makeSubmitEmail。
 * @returns 无。
 */
export async function runEmail(x: SubmitIn): Promise<void> {
  x.setBusy(true)
  const code = await postSettings({ url: URL_EMAIL, body: { email: x.email, current: x.cur } })
  x.setBusy(false)
  if (code !== TEXT_NONE) {
    x.setErr(errOf({ t: x.t, code }))
    return
  }
  toast({ kind: TOAST_OK, title: x.t('set.emSent', { e: x.email.trim() }) })
  x.close()
}

/**
 * 发一次账户设置请求:成功给空串;服务端不过关给它的结果码;网络断了给 net。
 *
 * @param x 接口与请求体。
 * @returns 结果码(成功是空串)。
 */
export async function postSettings(x: PostSettingsIn): PostOut {
  try {
    const r = await fetch(x.url, {
      method: METHOD_POST,
      credentials: CRED_INCLUDE,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: JSON.stringify(x.body),
    })
    if (r.ok) {
      return TEXT_NONE
    }
    const d = await r.json() as PostRespJson
    if (typeof d.error === 'string') {
      return d.error
    }
    return E_NET
  } catch {
    return E_NET
  }
}

/**
 * 结果码 → 一句报错(认不得的落「没成功,稍后再试」)。
 *
 * @param x 取词与结果码。
 * @returns 报错。
 */
export function errOf(x: ErrOfIn): string {
  const key = ERR_KEY[x.code]
  if (key == null) {
    return x.t(NET_KEY)
  }
  return x.t(key)
}

/**
 * 是不是 Google 登录的账号(密码是建号时随机生成的,本人不知道;登录邮箱跟 Google 账号绑着)。
 *
 * @param me 当前用户。
 * @returns 是 Google 账号。
 */
export function isGoogleOf(me: SettingsMe): boolean {
  return me.loginProvider === PROVIDER_GOOGLE
}

/**
 * 「密码」那一行的值:Google 账号写「用 Google 登录」,其余打一排点(只是显示)。
 *
 * @param x 取词与是不是 Google 账号。
 * @returns 显示的值。
 */
export function pwValueOf(x: PwValueIn): string {
  if (x.google) {
    return x.t('set.google')
  }
  return PW_MASK
}

