/**
 * header 域的纯函数(零 JSX 零 hook)。
 *
 * @author Frank
 * @time 2026-08-24 08:00:00
 */
import { ACCT_IN, ACCT_OUT, EMAIL_UNKNOWN } from './constants'
import type { AcctState, AcctUser, MeJson, WithOnIn } from './types'
import css from './header.module.css'

/**
 * 类名 + 当前态:亮就叠 .on 修饰类。样式在 css,tsx 里只剩「这一项亮不亮」的布尔,
 * 不再逐属性写三元(前身是 ui/cx —— 单消费者收回,再形制化成单参)。
 *
 * @param x 基类与开关。
 * @returns 拼好的 className。
 */
export function withOn(x: WithOnIn): string {
  if (x.on) {
    return `${x.base} ${css.on}`
  }
  return x.base
}

/**
 * 空身份壳(loading/out 态的 u)。
 *
 * @returns 四格全空的身份。
 */
export function emptyUser(): AcctUser {
  return { email: EMAIL_UNKNOWN, displayName: null, avatar: null, pro: false }
}

/**
 * Pro 判定:到期日在此刻之后。
 *
 * @param proUntil 到期日(ISO 串);null/空 = 免费号。
 * @returns 是否 Pro。
 */
export function proOf(proUntil: string | null): boolean {
  if (proUntil == null || proUntil === '') {
    return false
  }
  return new Date(proUntil) > new Date()
}

/**
 * /api/users/me 响应 → 账户状态(有 email = 登录态并洗出四格;否则未登录)。
 *
 * @param d 接口响应。
 * @returns 账户状态。
 */
export function meToAcct(d: MeJson): AcctState {
  const u = d.user
  if (u == null || u.email == null || u.email === '') {
    return { state: ACCT_OUT, u: emptyUser() }
  }
  let displayName: string | null = null
  if (u.displayName != null) {
    displayName = u.displayName
  }
  let avatar: string | null = null
  if (u.avatar != null) {
    avatar = u.avatar
  }
  let proUntil: string | null = null
  if (u.proUntil != null) {
    proUntil = u.proUntil
  }
  return { state: ACCT_IN, u: { email: u.email, displayName, avatar, pro: proOf(proUntil) } }
}

/**
 * 登录弹框按需载(点开才下载那份 JS,手法同 ChatLauncher;header 常驻包不背它)。
 *
 * @returns AuthModal 组件模块。
 */
export function loadAuthModal() {
  return import('@/components/auth').then(pickAuthModal)
}

/**
 * 从 auth 桶里挑出 AuthModal(dynamic 的取件回调)。
 *
 * @param m auth 桶模块。
 * @returns AuthModal。
 */
// eslint-disable-next-line local/no-bare-strings -- 同上:`typeof import()` 的说明符是类型位,TS 只收字面量
function pickAuthModal(m: typeof import('@/components/auth')) {
  return m.AuthModal
}
