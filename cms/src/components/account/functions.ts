/**
 * 账户页(/account)从组件体里迁出来的函数。
 * 2026-08-26 Frank 立「tsx 组件体内不许声明内嵌函数」:逐项事件手柄用 makeXxx 工厂
 * (样张 select 的 optionLabelOf / makeSelectChange),闭包变量改 XxxIn 显式入参。
 * 同日续:页面「纯拼装门」改造批把 page.tsx 的内联样式迁进 account.module.css,
 * 窄屏/选中/档位三处分叉不写三目,改成这里的 clsOf 按布尔拼修饰类。
 *
 * @author Frank
 * @time 2026-08-26 15:28:17
 */
import { cssOf } from '@/components/css'
import { resetAnswersMemory } from '@/lib/quiz'
import {
  CARD_CLS,
  CLS_SEP,
  CRED_INCLUDE,
  EMAIL_AT,
  EV_CHECKOUT,
  HDR_CONTENT_TYPE,
  METHOD_PATCH,
  METHOD_POST,
  MIME_JSON,
  NICK_BUSY_MARK,
  PLAN_30,
  PLAN_90,
  QP_OK,
  QP_OK_ON,
  QP_SEC,
  SEC_LABEL_CUT_RE,
  SEC_TABS,
  TEXT_NONE,
  URL_CHECKOUT,
  URL_LOGOUT,
  URL_ME,
  URL_USER_HEAD,
} from './constants'
import type {
  AddTypedFn,
  AddTypedIn,
  BuyBtnClsIn,
  BuyFn,
  BuyIn,
  BuyPickFn,
  BuyPickIn,
  BuyPlan,
  CheckoutRespJson,
  LogoutIn,
  Me,
  MeRespJson,
  NarrowClsIn,
  NavBtnClsIn,
  NavLabelIn,
  NickEditIn,
  NickKeyFn,
  NickKeyIn,
  NickSaveLabelIn,
  NickShownIn,
  ProOfIn,
  RefreshFn,
  RefreshIn,
  SaveNickIn,
  Sec,
  SecPickFn,
  SecPickIn,
  UmamiWindow,
} from './types'
import css from './account.module.css'

/**
 * 造一枚「加输入框里这一个」的按钮手柄:输入框里敲的东西直接加 ——
 * 5 位码按码加,否则加命中的第一条。
 * (原先埋在 input 的 onKeyDown 箭头里 —— 换 field 域的 Search 后,键盘出口归
 *  组件域统一定,这条页面专属行为提成具名函数并给一个显式的钮。)
 *
 * @param x 当前输入、命中清单与加码函数。
 * @returns 点一下加一个职业的手柄。
 */
export function makeAddTyped(x: AddTypedIn): AddTypedFn {
  return function addTyped(): void {
    const v = x.q.trim()
    if (/^\d{5}$/.test(v)) {
      x.addNoc(v)
      return
    }
    if (x.hits[0] != null) {
      x.addNoc(x.hits[0].noc)
    }
  }
}

/**
 * 造一枚昵称框的键盘手柄:Enter 存、Esc 取消。
 *
 * @param x 存昵称与退出编辑两个动作。
 * @returns 挂到输入框 onKeyDown 上的手柄。
 */
export function makeNickKey(x: NickKeyIn): NickKeyFn {
  return function onNickKey(e: { key: string }): void {
    if (e.key === 'Enter') {
      x.saveNick()
    }
    if (e.key === 'Escape') {
      x.setNick(null)
    }
  }
}

/**
 * 两列容器的类名预算:基座 + 窄屏修饰(窄屏两列改上下叠)。
 *
 * @param x 是不是窄屏。
 * @returns 拼好的 className。
 */
export function columnsClsOf(x: NarrowClsIn): string {
  const cls = [cssOf(css.columns)]
  if (x.narrow) {
    cls.push(cssOf(css.columnsNarrow))
  }
  return cls.join(CLS_SEP)
}

/**
 * 左列 sidebar 卡的类名预算:全局白卡壳 + 本域密度 + 窄屏修饰(窄屏变顶部横排条)。
 *
 * @param x 是不是窄屏。
 * @returns 拼好的 className。
 */
export function sideClsOf(x: NarrowClsIn): string {
  const cls = [CARD_CLS, cssOf(css.side)]
  if (x.narrow) {
    cls.push(cssOf(css.sideNarrow))
  }
  return cls.join(CLS_SEP)
}

/**
 * 右列内容卡的类名预算:全局白卡壳 + 本域基座 + 窄屏修饰(窄屏吃满整宽)。
 *
 * @param x 是不是窄屏。
 * @returns 拼好的 className。
 */
export function mainClsOf(x: NarrowClsIn): string {
  const cls = [CARD_CLS, cssOf(css.main)]
  if (x.narrow) {
    cls.push(cssOf(css.mainNarrow))
  }
  return cls.join(CLS_SEP)
}

/**
 * 节导航钮的类名预算:基座 + 选中修饰(淡靛底 + 品牌蓝字 + 半粗)。
 *
 * @param x 这一枚是不是当前节。
 * @returns 拼好的 className。
 */
export function navBtnClsOf(x: NavBtnClsIn): string {
  const cls = [cssOf(css.navBtn)]
  if (x.active) {
    cls.push(cssOf(css.navBtnActive))
  }
  return cls.join(CLS_SEP)
}

/**
 * 侧栏标签该显示什么:节标题裁掉括号里的说明。侧栏标签复用各节标题键,
 * 而「升级 Pro(一次性时长包…)」整条进侧栏太长,会把 190px 的一列撑破。
 *
 * @param x 该节的标题原文。
 * @returns 裁过并去掉首尾空白的短标签;裁不出东西时给空串。
 */
export function navLabelOf(x: NavLabelIn): string {
  const head = x.label.split(SEC_LABEL_CUT_RE)[0]
  if (head == null) {
    return TEXT_NONE
  }
  return head.trim()
}

/**
 * 造一枚节钮的点击手柄:点了就切到它代表的那一节。
 *
 * @param x 这一枚代表哪一节、点了往哪报。
 * @returns 挂到钮上的 onClick 手柄。
 */
export function makeSecPick(x: SecPickIn): SecPickFn {
  return function pickSec(): void {
    x.onPick(x.sec)
  }
}

/**
 * 身份行显示的名字:昵称优先,昵称空(没设过或只有空白)就回退成邮箱的 @ 前缀。
 *
 * @param x 昵称与邮箱。
 * @returns 显示名;邮箱里连 @ 都没有时给空串。
 */
export function nickShownOf(x: NickShownIn): string {
  if (x.displayName != null) {
    const named = x.displayName.trim()
    if (named !== '') {
      return named
    }
  }
  const head = x.email.split(EMAIL_AT)[0]
  if (head == null) {
    return TEXT_NONE
  }
  return head
}

/**
 * 昵称保存钮的钮面文字:存的过程中换成省略号(占位不跳动),否则是「保存」。
 *
 * @param x 忙态与取词函数。
 * @returns 钮面文字。
 */
export function nickSaveLabelOf(x: NickSaveLabelIn): string {
  if (x.busy) {
    return NICK_BUSY_MARK
  }
  return x.t('acct.nickSave')
}

/**
 * 时长包购买钮的类名预算:基座 + 档位配色(查表,键完整性由 Record<BuyPlan, string>
 * 管着)+ 忙态压暗。
 *
 * @param x 档位与忙态。
 * @returns 拼好的 className。
 */
export function buyBtnClsOf(x: BuyBtnClsIn): string {
  const planCls: Record<BuyPlan, string> = {
    [PLAN_30]: cssOf(css.buyBtn30),
    [PLAN_90]: cssOf(css.buyBtn90),
  }
  const cls = [cssOf(css.buyBtn), planCls[x.plan]]
  if (x.busy) {
    cls.push(cssOf(css.buyBtnBusy))
  }
  return cls.join(CLS_SEP)
}

/**
 * 造一枚购买钮的点击手柄:点了就按它代表的档发起 Checkout。
 *
 * @param x 这一枚买哪一档、点了往哪报。
 * @returns 挂到钮上的 onClick 手柄。
 */
export function makeBuyPick(x: BuyPickIn): BuyPickFn {
  return function pickPlan(): void {
    x.onBuy(x.plan)
  }
}

/**
 * Stripe 回跳成功标记:地址栏带 `?ok=1` 才算付成(E3-03;别的值一律当没付,
 * 到期日由 webhook 拨,前端只出提示)。
 *
 * @returns 回跳带成功标记 = true。
 */
export function okFlagOf(): boolean {
  return new URLSearchParams(window.location.search).get(QP_OK) === QP_OK_ON
}

/**
 * 账户下拉深链(E11-02):`?sec=`(profile/favs/sjobs/saved/buy/overview)直落对应节。
 * 白名单就是 SEC_TABS 的键 —— 不在表里的值不认,返回 null 让页面留在默认节。
 *
 * @returns 深链点名的节;没带或不认识是 null。
 */
export function secLinkOf(): Sec | null {
  const s = new URLSearchParams(window.location.search).get(QP_SEC)
  if (s == null) {
    return null
  }
  for (const tab of SEC_TABS) {
    if (tab.sec === s) {
      return tab.sec
    }
  }
  return null
}

/**
 * 造一枚重查登录态的手柄:GET /api/users/me(带 cookie),响应体按 MeRespJson
 * 跨边界断言收形。网络错/解析错一律按未登录读(与改造前 `.catch(setMe(null))`
 * 同口径),checked 成败都落 —— 不落页面会卡在空白。
 *
 * @param x 要拨的两格 state。
 * @returns 重查手柄(登入登出、存昵称之后都要调)。
 */
export function makeRefresh(x: RefreshIn): RefreshFn {
  return async function refresh(): Promise<void> {
    try {
      const r = await fetch(URL_ME, { credentials: CRED_INCLUDE })
      const d = await r.json() as MeRespJson
      let user: Me = null
      if (d != null && d.user != null) {
        user = d.user
      }
      x.setMe(user)
    } catch {
      x.setMe(null)
    } finally {
      x.setChecked(true)
    }
  }
}

/**
 * 造一枚退出登录的手柄:POST 登出清服务端会话,再清手上那份答案内存,最后重查一次。
 * 答案跟着会话一起丢是 2026-08-16 的拍板(缓存撤了之后答案住内存):不清的话,
 * 同一浏览器换个号登录,上一个人的答案会被当成「他的」推到新账号名下。
 *
 * @param x 重查手柄。
 * @returns 登出手柄。
 */
export function makeLogout(x: LogoutIn): () => Promise<void> {
  return async function logout(): Promise<void> {
    await fetch(URL_LOGOUT, { method: METHOD_POST, credentials: CRED_INCLUDE })
    resetAnswersMemory()
    await x.refresh()
  }
}

/**
 * 造一枚进昵称编辑态的手柄(E11-01):编辑种子 = 现显示名,没有显示名从空串起编
 * (与改造前 `me.displayName || ''` 同口径)。
 *
 * @param x 当前登录人与编辑值的落格。
 * @returns 点铅笔的手柄。
 */
export function makeNickEdit(x: NickEditIn): () => void {
  return function onNickEdit(): void {
    let seed = TEXT_NONE
    if (x.me != null && x.me.displayName != null) {
      seed = x.me.displayName
    }
    x.setNick(seed)
  }
}

/**
 * 造一枚存昵称的手柄(E11-01):PATCH `/api/users/:id`(本人可改),成功后重查并
 * 退出编辑态;失败不动编辑值 —— 留在编辑态,可重试。
 *
 * @param x 编辑现值、登录人与三个落格。
 * @returns 保存手柄。
 */
export function makeSaveNick(x: SaveNickIn): () => Promise<void> {
  return async function saveNick(): Promise<void> {
    if (x.nick == null || x.me == null) {
      return
    }
    x.setNickBusy(true)
    try {
      await fetch(URL_USER_HEAD + x.me.id, {
        method: METHOD_PATCH,
        credentials: CRED_INCLUDE,
        headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
        body: JSON.stringify({ displayName: x.nick.trim() }),
      })
      await x.refresh()
      x.setNick(null)
    } catch {
      x.setNickBusy(false)
      return
    }
    x.setNickBusy(false)
  }
}

/**
 * 造一枚发起购买的手柄(E3-03):前端只拿 Checkout URL 跳转,成功回跳 /account?ok=1。
 * 先发 umami 的 checkout 事件(E7-02;统计对象由环境注入,按 UmamiWindow 跨边界断言收形,
 * 没有就不发、发挂了不挡购买);响应体按 CheckoutRespJson 收形,`r.ok` 假或 url
 * 缺席/空串都算失败出话术(与改造前 `!d?.url` 同口径),不静默。
 *
 * @param x 取词函数与两格 state。
 * @returns 发起购买的手柄(收 30/90 档位)。
 */
export function makeBuy(x: BuyIn): BuyFn {
  return async function buy(plan: BuyPlan): Promise<void> {
    x.setBuying(true)
    x.setBuyErr(TEXT_NONE)
    const w = window as UmamiWindow
    try {
      if (w.umami != null) {
        w.umami.track(EV_CHECKOUT, { plan })
      }
    } catch {
      x.setBuyErr(TEXT_NONE)
    }
    try {
      const r = await fetch(URL_CHECKOUT, {
        method: METHOD_POST,
        credentials: CRED_INCLUDE,
        headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
        body: JSON.stringify({ plan }),
      })
      let d: CheckoutRespJson | null = null
      try {
        d = await r.json() as CheckoutRespJson
      } catch {
        d = null
      }
      if (r.ok === false || d == null || d.url == null || d.url === TEXT_NONE) {
        x.setBuyErr(x.t('acct.payErr'))
        return
      }
      window.location.href = d.url
    } catch {
      x.setBuyErr(x.t('acct.payErr'))
    } finally {
      x.setBuying(false)
    }
  }
}

/**
 * Pro 在期判定:proUntil 有值且晚于现在。空串与 null 都按免费读
 * (与改造前 `!!me?.proUntil && new Date(…) > new Date()` 同口径)。
 *
 * @param x 当前登录人。
 * @returns Pro 在期 = true。
 */
export function proOf(x: ProOfIn): boolean {
  if (x.me == null || x.me.proUntil == null || x.me.proUntil === TEXT_NONE) {
    return false
  }
  return new Date(x.me.proUntil) > new Date()
}
