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
import { track } from '@/lib/track'
import {
  CARD_CLS, CLS_SEP, CRED_INCLUDE, EV_WEEKLY, FAV_NOTE_KEY, FAV_TITLE_KEY,
  HDR_CONTENT_TYPE, METHOD_DELETE, METHOD_PATCH, MIME_JSON, Q_SEARCH_HEAD, QP_OK,
  BYTES_KB, BYTES_MB, FIELD_FILE, MB_DIGITS, METHOD_PUT, RESUME_MAX_BYTES, RF_ERR_FALLBACK, RF_ERR_KEY, RF_ERR_NONE,
  RF_ERR_SIZE, THUMB_BASE_SCALE, THUMB_PAGE, UNIT_KB, UNIT_MB, URL_RESUME_FILE, URL_RESUME_FILES,
  MIME_PDF as MIME_PDF_TYPE, Q_DL_TAIL, Q_ID_HEAD, Q_VER_MID, RESUME_FILES_MAX, COUNT_SEP, CANVAS_TAG,
  QP_OK_ON, QP_SEC, SEC_LABEL_CUT_RE, SEC_TABS, SJ_NOTE_KEY, SJ_STATUS_DEFAULT, SJ_STATUS_TABS, SJ_TITLE_KEY,
  TEXT_NONE, URL_ME, URL_SAVED_JOB_HEAD, URL_SAVED_JOBS_LIST,
  URL_USER_HEAD,
} from './constants'
import type {
  AskOfIn, DivDragEvent, FileDropIn, FilePickIn, IdHandlerFn, InputChangeEvent, PdfPagesIn, PdfThumbIn, PdfjsOut,
  PickerIn, PreviewOfIn, ResumeActIn, ResumeActSendIn, ResumeListLoadIn, ResumeMeta, ResumeMetas, ResumeReloadFn,
  ResumeRespJson, ResumeUploadFn, ResumeUploadIn, ShowPageIn,
  FlagSetIn, ProOfIn,
  JobRemoveIn, JobStatusChangeFn, JobStatusChangeIn, LoadSavedJobsIn, Me, MeRespJson,
  NavLabelIn, SecChangeFn, SecChangeIn, SecItemsIn, SecTabItem,
  RefreshFn, RefreshIn, SavedJobFact, SavedJobsRespJson,
  SearchHrefIn, Sec, SjStatus, SjTitleKeys,
  SjTitleKeysIn, WeeklyToggleFn, WeeklyToggleIn,
} from './types'
import css from './account.module.css'

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
 * 页签条的清单:节表逐项取标题(标题键与节标题同一个,裁掉括号说明)。
 *
 * @param x 取词函数。
 * @returns 页签清单。
 */
export function secTabItemsOf(x: SecItemsIn): SecTabItem[] {
  const out: SecTabItem[] = []
  for (const tab of SEC_TABS) {
    out.push({ key: tab.sec, label: navLabelOf({ label: x.t(tab.labelKey) }) })
  }
  return out
}

/**
 * 造页签切换手柄:页签条交回的是字符串键,只有节表里有的才切过去。
 *
 * @param x 切节回调。
 * @returns 交给页签条的 onChange。
 */
export function makeSecChange(x: SecChangeIn): SecChangeFn {
  return function changeSec(key: string): void {
    for (const tab of SEC_TABS) {
      if (tab.sec === key) {
        x.onPick(tab.sec)
      }
    }
  }
}

/**
 * 整张白卡的类名:全局白卡壳 + 本域去内衬(页签条贴卡顶,内衬交给页签条与内容区各自留)。
 *
 * @returns 拼好的 className。
 */
export function sheetClsOf(): string {
  return [CARD_CLS, cssOf(css.sheet)].join(CLS_SEP)
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
 * 2026-09-23 SEC_TABS 撤到三节后白名单跟着收窄成 resume/favs/sjobs:旧链接带
 * `?sec=overview|profile|saved|buy` 进来一律返回 null,页面停在默认节「我的简历」,不报错不白屏。
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
 * 2026-09-26 /fe Frank:订阅/退订事件改走统一上报门 lib/track(umami + 第一方漏斗,两条腿各自吞错,
 * 照旧不挡 PATCH)—— 原先直调 window.umami,被拦截器挡掉就没了;开关值 on 记成第一方的低基数分组。
 *
 * @param x 登录人 id 与退订落格。
 * @returns 勾选框 change 手柄。
 */
export function makeWeeklyToggle(x: WeeklyToggleIn): WeeklyToggleFn {
  return async function toggleWeekly(e): Promise<void> {
    const optOut = e.target.checked === false
    x.setOptOut(optOut)
    track(EV_WEEKLY, { on: String(optOut === false) })
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

/**
 * 「我的订阅」节的 Pro 判定:到期日在此刻之后(时长包语义,没有订阅状态机)。
 * 2026-10-04 随「我的订阅」节立;与 components/header 的 proOf、lib/quota 的 isPro 同一口径(各域一份,收拢另立批)。
 *
 * @param x 到期日。
 * @returns 是 Pro。
 */
export function proOf(x: ProOfIn): boolean {
  if (x.until == null || x.until === '') {
    return false
  }
  return new Date(x.until) > new Date()
}

/**
 * 某一份原件的地址:带 id;下载再带 dl。
 *
 * @param id 简历 id。
 * @returns 地址。
 */
export function fileUrlOf(id: number): string {
  return URL_RESUME_FILE + Q_ID_HEAD + String(id)
}

/**
 * 某一份原件的下载地址。
 *
 * @param id 简历 id。
 * @returns 地址。
 */
export function downloadUrlOf(id: number): string {
  return fileUrlOf(id) + Q_DL_TAIL
}

/**
 * 缩略图 / 预览要取的原件地址:Word 不画(给空串),PDF 拼上传时刻当版本(替换了地址就变)。
 *
 * @param x 元信息。
 * @returns 地址或空串。
 */
export function thumbSrcOf(x: ResumeMeta): string {
  if (x.mime !== MIME_PDF_TYPE) {
    return RF_ERR_NONE
  }
  return fileUrlOf(x.id) + Q_VER_MID + encodeURIComponent(x.uploadedAt)
}

/**
 * 份数小字「2 / 5」。
 *
 * @param n 现有份数。
 * @returns 小字。
 */
export function countLabelOf(n: number): string {
  return String(n) + COUNT_SEP + String(RESUME_FILES_MAX)
}

/**
 * 还能再加吗(不到 5 份)。
 *
 * @param n 现有份数。
 * @returns 能加。
 */
export function canAddOf(n: number): boolean {
  return n < RESUME_FILES_MAX
}

/**
 * 回包 → 清单(没带 items 的一律当空)。
 *
 * @param d 回包。
 * @returns 清单。
 */
export function toResumeMetas(d: ResumeRespJson): ResumeMetas {
  if (d.items == null) {
    return []
  }
  return d.items
}

/**
 * 造「拉清单」的函数:挂载拉一次,上传 / 删除 / 设默认之后再拉。拉失败也拨「拉回来了」,落到上传区 ——
 * 宁可让人再传一次,也不让占位一直转着(真没登录时页面门早就跳走了)。
 *
 * @param x 两个落格。
 * @returns 拉一次的函数。
 */
export function makeResumeListLoad(x: ResumeListLoadIn): ResumeReloadFn {
  return async function loadResumeList(): Promise<void> {
    try {
      const r = await fetch(URL_RESUME_FILES, { credentials: CRED_INCLUDE })
      if (r.ok) {
        x.setItems(toResumeMetas(await r.json() as ResumeRespJson))
      }
    } catch {
      ignoreWriteErr()
    }
    x.setChecked(true)
  }
}

/**
 * 服务端错误码 → 报错文案键(表里没有的落「没成功,稍后再试」)。
 *
 * @param code 错误码。
 * @returns 文案键。
 */
export function rfErrKeyOf(code: string): string {
  const k = RF_ERR_KEY[code]
  if (k == null) {
    return RF_ERR_FALLBACK
  }
  return k
}

/**
 * 造「上传一份」的函数:太大的在浏览器里先挡(不白传);其余交给服务端判(类型按文件头判,浏览器判不准)。
 * 带 replaceId 就替换那一份,否则新加;成功重拉清单并清掉报错;失败按错误码出文案,原来的不动。
 *
 * @param x 替换哪一份、重拉与两个落格。
 * @returns 一次上传。
 */
export function makeResumeUpload(x: ResumeUploadIn): ResumeUploadFn {
  return async function uploadResume(file: File): Promise<void> {
    if (file.size > RESUME_MAX_BYTES) {
      x.setErr(rfErrKeyOf(RF_ERR_SIZE))
      return
    }
    x.setBusy(true)
    x.setErr(RF_ERR_NONE)
    const form = new FormData()
    form.append(FIELD_FILE, file)
    let url = URL_RESUME_FILE
    if (x.replaceId != null) {
      url = fileUrlOf(x.replaceId)
    }
    try {
      const r = await fetch(url, { method: METHOD_PUT, credentials: CRED_INCLUDE, body: form })
      if (r.ok) {
        await x.reload()
      } else {
        x.setErr(rfErrKeyOf(String((await r.json() as ResumeRespJson).error)))
      }
    } catch {
      x.setErr(RF_ERR_FALLBACK)
    }
    x.setBusy(false)
  }
}

/**
 * 造文件框 change 手柄:取第一个文件上传,随后清空文件框(同一个文件再选一次也能触发)。
 *
 * @param x 一次上传。
 * @returns change 手柄。
 */
export function makeFilePick(x: FilePickIn): (e: InputChangeEvent) => void {
  return function pickFile(e: InputChangeEvent): void {
    const el = e.currentTarget
    let file: File | null = null
    if (el.files != null) {
      file = el.files.item(0)
    }
    el.value = RF_ERR_NONE
    if (file != null) {
      void x.upload(file)
    }
  }
}

/**
 * 造拖放落下手柄:拦住浏览器默认的「打开这个文件」,取第一个文件上传(拖进来一律新加)。
 *
 * @param x 一次上传与高亮落格。
 * @returns drop 手柄。
 */
export function makeFileDrop(x: FileDropIn): (e: DivDragEvent) => void {
  return function dropFile(e: DivDragEvent): void {
    e.preventDefault()
    x.setDragOn(false)
    const file = e.dataTransfer.files.item(0)
    if (file != null) {
      void x.upload(file)
    }
  }
}

/**
 * 造拖放悬停手柄:必须拦默认行为,浏览器才肯把 drop 交给上传区;顺手亮起描边。
 *
 * @param x 高亮落格(upload 不用)。
 * @returns dragover 手柄。
 */
export function makeDragOver(x: FileDropIn): (e: DivDragEvent) => void {
  return function dragOver(e: DivDragEvent): void {
    e.preventDefault()
    x.setDragOn(true)
  }
}

/**
 * 造拖离手柄:熄掉描边。
 *
 * @param x 高亮落格(upload 不用)。
 * @returns dragleave 手柄。
 */
export function makeDragLeave(x: FileDropIn): () => void {
  return function dragLeave(): void {
    x.setDragOn(false)
  }
}

/**
 * 造「选择文件 / 添加简历」手柄:记下「新加」,替用户去点藏起来的文件框。
 *
 * @param x 文件框与「替换哪一份」落格。
 * @returns 点击手柄。
 */
export function makeAdd(x: PickerIn): () => void {
  return function addResume(): void {
    x.setReplaceId(null)
    if (x.input != null) {
      x.input.click()
    }
  }
}

/**
 * 造「替换文件」工厂:按 id 记下替换哪一份,再打开文件选择器。
 *
 * @param x 文件框与「替换哪一份」落格。
 * @returns 按 id 出手柄的工厂。
 */
export function makePickerOf(x: PickerIn): IdHandlerFn {
  return function replaceOf(id: number): () => void {
    return function replaceResume(): void {
      x.setReplaceId(id)
      if (x.input != null) {
        x.input.click()
      }
    }
  }
}

/**
 * 造「删除」工厂:按 id 亮二次确认,顺手清掉上一次留下的报错(那句话说的是上一个操作)。
 *
 * @param x 两个落格。
 * @returns 按 id 出手柄的工厂。
 */
export function makeAskOf(x: AskOfIn): IdHandlerFn {
  return function askOf(id: number): () => void {
    return function askDelete(): void {
      x.setErr(RF_ERR_NONE)
      x.setSure(id)
    }
  }
}

/**
 * 造「确认删除」工厂:服务端删成功才重拉(删的是原件,失败不能假装删了)。
 *
 * @param x 重拉与两个落格。
 * @returns 按 id 出手柄的工厂。
 */
export function makeDeleteOf(x: ResumeActIn): IdHandlerFn {
  return function deleteOf(id: number): () => void {
    return function deleteResume(): void {
      void sendResumeAct({ x, url: fileUrlOf(id), method: METHOD_DELETE })
    }
  }
}

/**
 * 造「设为默认」工厂。
 *
 * @param x 重拉与两个落格。
 * @returns 按 id 出手柄的工厂。
 */
export function makeDefaultOf(x: ResumeActIn): IdHandlerFn {
  return function defaultOf(id: number): () => void {
    return function setDefault(): void {
      void sendResumeAct({ x, url: fileUrlOf(id), method: METHOD_PATCH })
    }
  }
}

/**
 * 删除 / 设默认共用的一次请求:熄确认、发请求,成功重拉清单并清报错,失败出「没成功,稍后再试」。
 *
 * @param y 落格、地址与方法。
 * @returns 请求结束时 resolve。
 */
export async function sendResumeAct(y: ResumeActSendIn): Promise<void> {
  y.x.setSure(null)
  try {
    const r = await fetch(y.url, { method: y.method, credentials: CRED_INCLUDE })
    if (r.ok) {
      y.x.setErr(RF_ERR_NONE)
      await y.x.reload()
      return
    }
  } catch {
    ignoreWriteErr()
  }
  y.x.setErr(RF_ERR_FALLBACK)
}

/**
 * 造「预览」工厂:按这一份开弹框。
 *
 * @param x 预览落格。
 * @returns 按元信息出手柄的工厂。
 */
export function makePreviewOf(x: PreviewOfIn): (m: ResumeMeta) => () => void {
  return function previewOf(m: ResumeMeta): () => void {
    return function openPreview(): void {
      x.setPreview(m)
    }
  }
}

/**
 * 造「取消」手柄:熄掉删除的二次确认。
 *
 * @param x 落格(只用 setSure)。
 * @returns 点击手柄。
 */
export function makeSureClear(x: AskOfIn): () => void {
  return function cancelSure(): void {
    x.setSure(null)
  }
}

/**
 * 造「关预览」手柄。
 *
 * @param x 预览落格。
 * @returns 关闭手柄。
 */
export function makePreviewClose(x: PreviewOfIn): () => void {
  return function closePreview(): void {
    x.setPreview(null)
  }
}

/**
 * 字节数 → 人看的大小(不到 1 MB 写 KB 取整,否则 MB 一位小数)。
 *
 * @param bytes 字节数。
 * @returns 例:148 KB、1.2 MB。
 */
export function sizeLabelOf(bytes: number): string {
  if (bytes < BYTES_MB) {
    return String(Math.max(1, Math.round(bytes / BYTES_KB))) + UNIT_KB
  }
  return (bytes / BYTES_MB).toFixed(MB_DIGITS) + UNIT_MB
}

/**
 * 懒加载 pdf.js 并指好 worker(只有「我的简历」真有 PDF 时才下载;worker 跑在独立线程,解析大文件不卡页面)。
 *
 * @returns pdf.js 模块。
 */
export async function loadPdfjs(): PdfjsOut {
  const pdfjs = await import('pdfjs-dist')
  if (pdfjs.GlobalWorkerOptions.workerSrc === RF_ERR_NONE) {
    // eslint-disable-next-line local/no-bare-strings -- 打包器只认 new URL 里的字面量路径(换成常量就找不到 worker 文件)
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
  }
  return pdfjs
}

/**
 * 用 pdf.js 把原件第一页画进画布(按画布显示宽度 × 设备像素比,高清屏不糊)。
 * 画不出来(加密、损坏)就留着白纸占位 —— 文件本身没问题,预览与下载照常可用。
 *
 * @param x 画布、地址与「画好了」落格。
 * @returns 画完(或放弃)时 resolve。
 */
export async function renderPdfThumb(x: PdfThumbIn): Promise<void> {
  try {
    const pdfjs = await loadPdfjs()
    const task = pdfjs.getDocument({ url: x.src })
    const doc = await task.promise
    const page = await doc.getPage(THUMB_PAGE)
    const base = page.getViewport({ scale: THUMB_BASE_SCALE })
    const viewport = page.getViewport({ scale: (x.canvas.clientWidth / base.width) * window.devicePixelRatio })
    x.canvas.width = Math.floor(viewport.width)
    x.canvas.height = Math.floor(viewport.height)
    await page.render({ canvas: x.canvas, viewport }).promise
    await task.destroy()
    x.setReady(true)
  } catch {
    ignoreWriteErr()
  }
}

/**
 * 预览弹框:把原件逐页画进容器。每页按「容器里放得下的整页」缩放(宽、高取小者,不出滚动条;
 * 高清屏按设备像素比画),只露第一页,其余藏着等翻页。容器是本函数独占的一块(React 不往里放子节点),
 * 所以直接往里追加画布。画不出来(加密、损坏)拨「画不了」,弹框出一句改下载。
 *
 * @param x 容器、地址与三个落格。
 * @returns 画完(或放弃)时 resolve。
 */
export async function renderPdfPages(x: PdfPagesIn): Promise<void> {
  try {
    const pdfjs = await loadPdfjs()
    const task = pdfjs.getDocument({ url: x.src })
    const doc = await task.promise
    const boxW = x.box.clientWidth
    const boxH = x.box.clientHeight
    const canvases: HTMLCanvasElement[] = []
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const base = page.getViewport({ scale: THUMB_BASE_SCALE })
      const fit = Math.min(boxW / base.width, boxH / base.height)
      const viewport = page.getViewport({ scale: fit * window.devicePixelRatio })
      const canvas = document.createElement(CANVAS_TAG)
      canvas.className = cssOf(css.rfPage)
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)
      canvas.hidden = i !== THUMB_PAGE
      await page.render({ canvas, viewport }).promise
      canvases.push(canvas)
    }
    await task.destroy()
    x.box.replaceChildren(...canvases)
    x.setCount(doc.numPages)
    x.setReady(true)
  } catch {
    x.setFailed(true)
  }
}

/**
 * 只露第 index 页(翻页时调;容器里的画布按顺序就是页序)。
 *
 * @param x 容器与第几页。
 * @returns 无。
 */
export function showPdfPage(x: ShowPageIn): void {
  for (const [i, el] of Array.from(x.box.children).entries()) {
    if (el instanceof HTMLElement) {
      el.hidden = i !== x.index
    }
  }
}

/**
 * 上传区的类名:基座 + 拖放悬停时的蓝色描边。
 *
 * @param on 有文件悬在上方吗。
 * @returns 拼好的 className。
 */
export function dropClsOf(on: boolean): string {
  if (on) {
    return cssOf(css.rfDrop) + CLS_SEP + cssOf(css.rfDropOn)
  }
  return cssOf(css.rfDrop)
}
