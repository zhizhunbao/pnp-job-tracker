/**
 * auth 域的纯函数与提交流(零 JSX 零 hook)。四条认证流(登录/注册/找回/重置)
 * 收在 runAuthFlow 一个入口:组件只摆状态,收 AuthFlowOut 三种收场。
 * 全走 Payload 自带 REST(httpOnly cookie),特权字段由 Users collection 字段级锁保护。
 *
 * @author Frank
 * @time 2026-08-24 01:30:00
 */
import { fieldsOf, missingFields, pullAndMerge, readAnswers } from '@/lib/quiz'
import {
  AVATAR_PALETTE,
  HTTP_BAD_REQUEST,
  MODE_FORGOT,
  MODE_REGISTER,
  MODE_RESET,
  PW_LV_MEDIUM,
  PW_LV_STRONG,
  PW_LV_WEAK,
  QUIZ_PATH,
  HASH_BASE,
  LOCALE_DEFAULT,
  LOCALE_KEY,
  PW_CLASSES_MEDIUM,
  PW_CLASSES_STRONG,
  PW_LONG_LEN,
  PW_MIN_LEN,
} from './constants'
import type { AuthFlowIn, AuthFlowOut, FinishAuthIn, PwLevel, QuizDestIn, RegisterErrIn, UmamiHost } from './types'

/**
 * 密码强度(注册/重置时实时提示):0 太短(不可提交)/ 1 弱 / 2 中 / 3 强。
 * 服务端只强制长度,强度条是引导不是闸门。
 *
 * @param pw 密码。
 * @returns 强度档。
 */
export function pwStrength(pw: string): PwLevel {
  if (pw.length < PW_MIN_LEN) {
    return 0
  }
  const res = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/]
  let classes = 0
  for (const re of res) {
    if (re.test(pw)) {
      classes = classes + 1
    }
  }
  if (classes >= PW_CLASSES_STRONG || (classes >= PW_CLASSES_MEDIUM && pw.length >= PW_LONG_LEN)) {
    return PW_LV_STRONG
  }
  if (classes >= PW_CLASSES_MEDIUM) {
    return PW_LV_MEDIUM
  }
  return PW_LV_WEAK
}

/**
 * 字符串 → 色板里的稳定色(同一人恒定色;经典 31 进制 hash)。
 *
 * @param s 名字/邮箱(调用方已小写)。
 * @returns 十六进制色。
 */
export function stableColor(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i = i + 1) {
    h = (h * HASH_BASE + s.charCodeAt(i)) >>> 0
  }
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length]
}

/**
 * 读界面语言(localStorage 的 jobs.lang,与 lib/i18n 同源;读不到给 zh)。
 *
 * @returns 语言码。
 */
export function localeOf(): string {
  try {
    const v = localStorage.getItem(LOCALE_KEY)
    if (v != null && v !== '') {
      return v
    }
    return LOCALE_DEFAULT
  } catch {
    return LOCALE_DEFAULT
  }
}

/**
 * 登录/注册后要不要先补统一基础问卷:已有完整本地答案的用户不重复打扰(给 null),
 * 否则给 /plan/pr 的问卷地址。/plan/pr 自己就是问卷宿主:保留 job 参数原地展开;
 * 其它页面用 next 在答完后回跳。
 *
 * @param x 调用方指定的回跳路径。
 * @returns 问卷地址,或 null(不用补)。
 */
export function quizDestinationOf(x: QuizDestIn): string | null {
  const a = readAnswers()
  if (a.nocs.length > 0 && missingFields(fieldsOf('pr', 'basic', 0, a), a).length === 0) {
    return null
  }
  let raw = window.location.pathname + window.location.search
  if (x.returnTo != null && x.returnTo !== '') {
    raw = x.returnTo
  }
  let safe = '/'
  if (/^\/(?!\/)/.test(raw)) {
    safe = raw
  }
  const from = new URL(safe, window.location.origin)
  const out = new URL(QUIZ_PATH, window.location.origin)
  out.searchParams.set('quiz', '1')
  if (from.pathname === QUIZ_PATH) {
    const job = from.searchParams.get('job')
    if (job != null && job !== '') {
      out.searchParams.set('job', job)
    }
  } else {
    out.searchParams.set('next', from.pathname + from.search + from.hash)
  }
  return out.pathname + out.search
}

/**
 * 认证成功后的收尾:先拉服务端答案档与本地合并(新者胜;服务端无档则把浏览器旧答案
 * 送上去 —— dp.authGate「注册后答案自动存档」兑现处;失败不拦登录)。必须等它:
 * 下面读的就是合并后的答案。然后有问卷缺口先跳问卷,否则调 onDone 回原操作。
 * afterLogin=true:登录刚成功,迹象 cookie(#311 匿名不发请求的闸)还没置位,这一调必须绕闸发出。
 *
 * @param x 回跳路径与完成回调。
 * @returns 无(可能整页跳转)。
 */
export async function finishAuth(x: FinishAuthIn) {
  await pullAndMerge(true).catch(function ignore() {
    // 网络失败:答案仍在浏览器,下次改动重试
    return null
  })
  const destination = quizDestinationOf({ returnTo: x.returnTo })
  if (destination != null) {
    window.location.assign(destination)
    return
  }
  x.onDone()
}

/**
 * Google 整页 OAuth 的跳转地址(E9-04b):优先问卷缺口地址,其次调用方 returnTo,
 * 最后当前页。
 *
 * @param x 调用方回跳路径。
 * @returns 带 returnTo 的 /api/auth/google 地址。
 */
export function googleHrefOf(x: QuizDestIn): string {
  let rt = window.location.pathname + window.location.search
  const qd = quizDestinationOf(x)
  if (qd != null) {
    rt = qd
  } else if (x.returnTo != null && x.returnTo !== '') {
    rt = x.returnTo
  }
  return '/api/auth/google?returnTo=' + encodeURIComponent(rt)
}

/**
 * 提交钮的文案键(按态)。
 *
 * @param mode 当前态。
 * @returns i18n 键。
 */
export function submitKeyOf(mode: string): string {
  const keys: Record<string, string> = {
    login: 'acct.login',
    register: 'acct.submitReg',
    forgot: 'acct.forgotSend',
    reset: 'acct.resetBtn',
  }
  const k = keys[mode]
  if (k == null) {
    return 'acct.login'
  }
  return k
}

/**
 * 注册失败 → 报错文案键:Payload 400 响应体带字段级错误 ——
 * email 相关 = 已注册,password 相关 = 密码不合格,其余走 generic。
 *
 * @param x 状态码与响应体串。
 * @returns i18n 键。
 */
export function registerErrKeyOf(x: RegisterErrIn): string {
  if (x.status === HTTP_BAD_REQUEST && /email|already|registered|exist/i.test(x.body)) {
    return 'acct.err.exists'
  }
  if (x.status === HTTP_BAD_REQUEST && /password/i.test(x.body)) {
    return 'acct.err.weakPw'
  }
  return 'acct.err.generic'
}

/**
 * 注册成功打点(umami 是站外脚本挂的全局,拿不到就算了)。
 *
 * @returns 无。
 */
export function trackSignup() {
  try {
    // 外部脚本注入的全局形状(UmamiHost),断言收在这一处。
    const w = window as UmamiHost
    if (w.umami != null) {
      w.umami.track('signup')
    }
  } catch {
    return
  }
}

/**
 * 一次提交的完整流程(按 mode 分四条):
 * · forgot:发找回邮件(防枚举 —— 不看响应,一律「若已注册则已发出」);
 * · reset:设新密码,成功即登录态(Payload set-cookie);
 * · register:注册(随档存界面语言)→ 接着走登录;
 * · login:登录。
 *
 * @param x 提交现场。
 * @returns 三种收场之一(sent / done / err)。
 */
export async function runAuthFlow(x: AuthFlowIn): Promise<AuthFlowOut> {
  if (x.mode === MODE_FORGOT) {
    await fetch('/api/users/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: x.email }),
    }).catch(function ignore() {
      return null
    })
    return { kind: 'sent', errKey: null }
  }
  if (x.mode === MODE_RESET) {
    if (x.pw.length < PW_MIN_LEN) {
      return { kind: 'err', errKey: 'acct.err.weakPw' }
    }
    let token = ''
    if (x.resetToken != null) {
      token = x.resetToken
    }
    const r = await fetch('/api/users/reset-password', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password: x.pw }),
    })
    if (r.ok === false) {
      return { kind: 'err', errKey: 'acct.resetBad' }
    }
    return { kind: 'done', errKey: null }
  }
  if (x.mode === MODE_REGISTER) {
    if (x.pw.length < PW_MIN_LEN) {
      return { kind: 'err', errKey: 'acct.err.weakPw' }
    }
    const r = await fetch('/api/users', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: x.email, password: x.pw, locale: x.locale }),
    })
    if (r.ok === false) {
      let body = ''
      try {
        body = JSON.stringify(await r.json())
      } catch {
        body = ''
      }
      return { kind: 'err', errKey: registerErrKeyOf({ status: r.status, body }) }
    }
    trackSignup()
  }
  const r2 = await fetch('/api/users/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: x.email, password: x.pw }),
  })
  if (r2.ok === false) {
    return { kind: 'err', errKey: 'acct.err.cred' }
  }
  return { kind: 'done', errKey: null }
}

/**
 * 登出(失败也整页刷新 —— cookie 已失效时刷新同样落到匿名态)。
 *
 * @returns 无(整页刷新)。
 */
export async function logout() {
  try {
    await fetch('/api/users/logout', { method: 'POST', credentials: 'include' })
  } catch {
    // 网络失败也照刷:刷新后按真实 cookie 态渲染
  }
  window.location.reload()
}
