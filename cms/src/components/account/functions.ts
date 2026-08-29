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
import { KEY_ENTER, KEY_ESCAPE,
  BUSY_MARK, CARD_CLS, CLS_SEP, CRED_INCLUDE, EMAIL_AT, EV_CHECKOUT, EV_WEEKLY, FAV_NOTE_KEY, FAV_TITLE_KEY,
  HDR_CONTENT_TYPE, METHOD_DELETE, METHOD_PATCH, METHOD_POST, MIME_JSON, PLAN_30, PLAN_90, Q_SEARCH_HEAD, QP_OK,
  QP_OK_ON, QP_SEC, SEC_LABEL_CUT_RE, SEC_TABS, SJ_NOTE_KEY, SJ_STATUS_DEFAULT, SJ_STATUS_TABS, SJ_TITLE_KEY,
  TEXT_NONE, URL_CHECKOUT, URL_LOGOUT, URL_ME, URL_SAVED_JOB_HEAD, URL_SAVED_JOBS_LIST, URL_SAVED_SEARCH_HEAD,
  URL_SAVED_SEARCHES_LIST, URL_USER_HEAD,
} from './constants'
import type {
  ArchViewLabelIn, BuyBtnClsIn, BuyFn, BuyIn, BuyPickFn, BuyPickIn, BuyPlan, CheckoutRespJson, FlagSetIn,
  JobRemoveIn, JobStatusChangeFn, JobStatusChangeIn, LoadSavedJobsIn, LoadSearchesIn, LogoutIn, Me, MeRespJson,
  NarrowClsIn, NavBtnClsIn, NavLabelIn, NickEditIn, NickKeyFn, NickKeyIn, NickSaveLabelIn, NickShownIn, ProOfIn,
  RefreshFn, RefreshIn, ResumeClearIn, ResumeHookIn, SavedJobFact, SavedJobsRespJson, SavedSearchesRespJson,
  SavedSearchFact, SaveNickIn, SearchDelIn, SearchHrefIn, Sec, SecPickFn, SecPickIn, SjStatus, SjTitleKeys,
  SjTitleKeysIn, UmamiWindow, WeeklyToggleFn, WeeklyToggleIn,
} from './types'
import css from './account.module.css'

/**
 * 造一枚昵称框的键盘手柄:Enter 存、Esc 取消。
 *
 * @param x 存昵称与退出编辑两个动作。
 * @returns 挂到输入框 onKeyDown 上的手柄。
 */
export function makeNickKey(x: NickKeyIn): NickKeyFn {
  return function onNickKey(e): void {
    if (e.key === KEY_ENTER) {
      x.saveNick()
    }
    if (e.key === KEY_ESCAPE) {
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
    return BUSY_MARK
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

/**
 * 「先本地改、后台跟投」写法的静默口:收藏改状态/移除、周报开关、清简历、删订阅
 * 都是先把本地 state 拨好再发请求 —— 请求挂了不回滚、不出话术,下次刷新自会对齐
 * (E9-01 立的旧口径,2026-08-27 换装批原样保留)。catch 里调它,静默是**点名的**,
 * 不是忘了处理。
 */
export function ignoreWriteErr(): void {
  return
}

/**
 * 收藏节抬头的两把 i18n 键:favs 纯列表视图用 fav.*,求职看板视图用 sj.*(#62A)。
 *
 * @param x 是不是 favs 视图。
 * @returns 标题键与小注键。
 */
export function sjTitleKeysOf(x: SjTitleKeysIn): SjTitleKeys {
  if (x.favs) {
    return { title: FAV_TITLE_KEY, note: FAV_NOTE_KEY }
  }
  return { title: SJ_TITLE_KEY, note: SJ_NOTE_KEY }
}

/**
 * saved-jobs 响应 → 收藏行清单(行构造器):id 洗成串,快照缺格归一成空串,
 * 看板状态不认识的值按 wish 读(与旧渲染 `status || 'wish'` 同口径)。
 *
 * @param d 接口响应体(归一前)。
 * @returns 洗净的收藏行。
 */
export function toSavedJobs(d: SavedJobsRespJson): SavedJobFact[] {
  const out: SavedJobFact[] = []
  if (d == null || d.docs == null) {
    return out
  }
  for (const row of d.docs) {
    let title = ''
    if (row.title != null) {
      title = row.title
    }
    let company = ''
    if (row.company != null) {
      company = row.company
    }
    let st: SjStatus = SJ_STATUS_DEFAULT
    for (const tab of SJ_STATUS_TABS) {
      if (tab.st === row.status) {
        st = tab.st
      }
    }
    out.push({ id: String(row.id), title, company, status: st })
  }
  return out
}

/**
 * 造一枚拉收藏岗清单的手柄(E9-01),挂载时调一次。网络挂了落空清单
 * (与旧 `.catch(setItems([]))` 同口径 —— null 是「还在拉」,空数组才是「没有」)。
 *
 * @param x 清单落格。
 * @returns 拉取手柄。
 */
export function makeLoadSavedJobs(x: LoadSavedJobsIn): () => Promise<void> {
  return async function loadSavedJobs(): Promise<void> {
    try {
      const r = await fetch(URL_SAVED_JOBS_LIST, { credentials: CRED_INCLUDE })
      const d = await r.json() as SavedJobsRespJson
      x.setItems(toSavedJobs(d))
    } catch {
      x.setItems([])
    }
  }
}

/**
 * 造一枚收藏行状态下拉的 change 手柄(E9-01):先本地重建这一行,再 PATCH 跟投
 * (失败静默,口径见 ignoreWriteErr)。
 *
 * @param x 这一行的 id、现清单与落格。
 * @returns 下拉 change 手柄。
 */
export function makeJobStatusChange(x: JobStatusChangeIn): JobStatusChangeFn {
  return async function changeJobStatus(e): Promise<void> {
    let st: SjStatus = SJ_STATUS_DEFAULT
    for (const tab of SJ_STATUS_TABS) {
      if (tab.st === e.target.value) {
        st = tab.st
      }
    }
    const next: SavedJobFact[] = []
    for (const row of x.items) {
      if (row.id === x.id) {
        next.push({ id: row.id, title: row.title, company: row.company, status: st })
      } else {
        next.push(row)
      }
    }
    x.setItems(next)
    try {
      await fetch(URL_SAVED_JOB_HEAD + x.id, {
        method: METHOD_PATCH,
        credentials: CRED_INCLUDE,
        headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
        body: JSON.stringify({ status: st }),
      })
    } catch {
      ignoreWriteErr()
    }
  }
}

/**
 * 造一枚移除收藏的手柄(× 钮):先本地移除,再 DELETE 跟投(失败静默,
 * 口径见 ignoreWriteErr)。
 *
 * @param x 这一行的 id、现清单与落格。
 * @returns 点一下移除的手柄。
 */
export function makeJobRemove(x: JobRemoveIn): () => Promise<void> {
  return async function removeJob(): Promise<void> {
    const next: SavedJobFact[] = []
    for (const row of x.items) {
      if (row.id !== x.id) {
        next.push(row)
      }
    }
    x.setItems(next)
    try {
      await fetch(URL_SAVED_JOB_HEAD + x.id, { method: METHOD_DELETE, credentials: CRED_INCLUDE })
    } catch {
      ignoreWriteErr()
    }
  }
}

/**
 * 造一枚周报开关的 change 手柄(E9-02b):显示语义取反(勾 = 订阅,存的是退订),
 * 先拨本地,发 umami 的订阅/退订事件(统计对象由环境注入,没有就不发、发挂了不挡),
 * 再 PATCH 跟投(失败静默)。
 *
 * @param x 登录人 id 与退订落格。
 * @returns 勾选框 change 手柄。
 */
export function makeWeeklyToggle(x: WeeklyToggleIn): WeeklyToggleFn {
  return async function toggleWeekly(e): Promise<void> {
    const optOut = e.target.checked === false
    x.setOptOut(optOut)
    const w = window as UmamiWindow
    try {
      if (w.umami != null) {
        w.umami.track(EV_WEEKLY, { on: String(optOut === false) })
      }
    } catch {
      ignoreWriteErr()
    }
    try {
      await fetch(URL_USER_HEAD + x.userId, {
        method: METHOD_PATCH,
        credentials: CRED_INCLUDE,
        headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
        body: JSON.stringify({ weeklyOptOut: optOut }),
      })
    } catch {
      ignoreWriteErr()
    }
  }
}

/**
 * 收藏行「查看」链接的去处:回职位板按职位名搜。
 *
 * @param x 职位名快照。
 * @returns 拼好的 href。
 */
export function jobSearchHrefOf(x: SearchHrefIn): string {
  return Q_SEARCH_HEAD + encodeURIComponent(x.title)
}

/**
 * saved-searches 响应 → 订阅行清单(行构造器):id 洗成串、名字缺格归一成空串、
 * 没发过提醒 = null(格子在,记的就是「没有」)。
 *
 * @param d 接口响应体(归一前)。
 * @returns 洗净的订阅行。
 */
export function toSavedSearches(d: SavedSearchesRespJson): SavedSearchFact[] {
  const out: SavedSearchFact[] = []
  if (d == null || d.docs == null) {
    return out
  }
  for (const row of d.docs) {
    let name = ''
    if (row.name != null) {
      name = row.name
    }
    let at: string | null = null
    if (row.lastNotifiedAt != null && row.lastNotifiedAt !== '') {
      at = row.lastNotifiedAt
    }
    out.push({ id: String(row.id), name, lastNotifiedAt: at })
  }
  return out
}

/**
 * 造一枚拉已存筛选清单的手柄(E5-03),挂载时与删除后各调一次。
 * 网络挂了落空清单(与旧口径一致)。
 *
 * @param x 清单落格。
 * @returns 拉取手柄。
 */
export function makeLoadSearches(x: LoadSearchesIn): () => Promise<void> {
  return async function loadSearches(): Promise<void> {
    try {
      const r = await fetch(URL_SAVED_SEARCHES_LIST, { credentials: CRED_INCLUDE })
      const d = await r.json() as SavedSearchesRespJson
      x.setItems(toSavedSearches(d))
    } catch {
      x.setItems([])
    }
  }
}

/**
 * 造一枚删已存筛选的手柄:DELETE(失败静默)后重拉一遍清单(与旧 `del → load`
 * 同口径 —— 删除以服务端为准,不做本地乐观移除)。
 *
 * @param x 这一行的 id 与重拉手柄。
 * @returns 点一下删除的手柄。
 */
export function makeSearchDel(x: SearchDelIn): () => Promise<void> {
  return async function delSearch(): Promise<void> {
    try {
      await fetch(URL_SAVED_SEARCH_HEAD + x.id, { method: METHOD_DELETE, credentials: CRED_INCLUDE })
    } catch {
      ignoreWriteErr()
    }
    x.refresh()
  }
}

/**
 * 简历正文格的初值:去掉首尾空白,没档 = 空串(空串即「没存过」的显示分支)。
 *
 * @param x 父页递来的档案两格。
 * @returns 正文初值。
 */
export function resumeCurSeedOf(x: ResumeHookIn): string {
  if (x.text == null) {
    return TEXT_NONE
  }
  return x.text.trim()
}

/**
 * 简历存档时刻格的初值:没档 = 空串。
 *
 * @param x 父页递来的档案两格。
 * @returns 时刻初值(ISO 或空串)。
 */
export function resumeAtSeedOf(x: ResumeHookIn): string {
  if (x.savedAt == null) {
    return TEXT_NONE
  }
  return x.savedAt
}

/**
 * 造一枚真清简历的手柄(E11-08):先本地移除四格(照 SavedJobsList 的先例),
 * 再 PATCH 把 resumeText/resumeSavedAt 抹成 null(失败静默 —— 本地已移除,
 * 失败下次刷新自会显出来)。
 *
 * @param x 登录人 id 与四个落格。
 * @returns 「确认清除」的手柄。
 */
export function makeResumeClear(x: ResumeClearIn): () => Promise<void> {
  return async function clearResume(): Promise<void> {
    x.setCur(TEXT_NONE)
    x.setAt(TEXT_NONE)
    x.setOpen(false)
    x.setSure(false)
    try {
      await fetch(URL_USER_HEAD + x.userId, {
        method: METHOD_PATCH,
        credentials: CRED_INCLUDE,
        headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
        body: JSON.stringify({ profile: { resumeText: null, resumeSavedAt: null } }),
      })
    } catch {
      ignoreWriteErr()
    }
  }
}

/**
 * 简历展开/收起钮的钮面二选一。
 *
 * @param x 展开态与取词函数。
 * @returns 钮面文字。
 */
export function archViewLabelOf(x: ArchViewLabelIn): string {
  if (x.open) {
    return x.t('rm.arch.hide')
  }
  return x.t('rm.arch.view')
}

/**
 * 造一枚「把一个布尔格拨成定值」的通用小手柄:简历的展开/收起、二次确认的亮/熄
 * 都是它 —— 四枚钮各造一个工厂只会得到四份同文。
 *
 * @param x 拨哪格、拨成什么。
 * @returns 点一下拨过去的手柄。
 */
export function makeFlagSet(x: FlagSetIn): () => void {
  return function setFlag(): void {
    x.set(x.v)
  }
}
