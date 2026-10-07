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
import { toJobPlan } from '@/components/jobs'
import { hasProfile, normalizeProfile } from '@/lib/jobs'
import { track } from '@/lib/track'
import {
  CARD_CLS, CLS_SEP, CRED_INCLUDE, EV_WEEKLY,
  HDR_CONTENT_TYPE, METHOD_DELETE, METHOD_PATCH, MIME_JSON, QP_OK,
  BYTES_KB, BYTES_MB, FIELD_FILE, MB_DIGITS, METHOD_PUT, RESUME_MAX_BYTES, RF_ERR_FALLBACK, RF_ERR_KEY, RF_ERR_NONE,
  RF_ERR_SIZE, THUMB_BASE_SCALE, THUMB_PAGE, UNIT_KB, UNIT_MB, URL_RESUME_FILE, URL_RESUME_FILES,
  MIME_PDF as MIME_PDF_TYPE, Q_DL_TAIL, Q_ID_HEAD, Q_VER_MID, RESUME_FILES_MAX, COUNT_SEP, CANVAS_TAG,
  CENTER_DIV, EV_WHEEL, PCT_SIGN, PX, TF_HEAD, TF_MID, TF_SCALE, TF_TAIL, WHEEL_OPTS, ZOOM_HOME, ZOOM_MAX, ZOOM_MIN,
  ZOOM_PCT, ZOOM_PINCH_K, ZOOM_PX_MAX, ZOOM_SETTLE_MS, ZOOM_WHEEL_K,
  QP_OK_ON, QP_SEC, SEC_LABEL_CUT_RE, SEC_TABS,
  TEXT_NONE, URL_ME,
  URL_USER_HEAD,
} from './constants'
import type {
  AskOfIn, DivDragEvent, FileDropIn, FilePickIn, IdHandlerFn, InputChangeEvent, PdfPagesIn, PdfThumbIn, PdfjsOut,
  PickerIn, PreviewOfIn, ResumeActIn, ResumeActSendIn, ResumeListLoadIn, ResumeMeta, ResumeMetas, ResumeReloadFn,
  ResumeRespJson, ResumeUploadFn, ResumeUploadIn, ShowPageIn,
  ApplyViewIn, DivPointerEvent, GripIn, GripViewIn, PageTurnIn, PdfDoc, PdfZoomDrawIn, PtPairIn, WheelBindIn,
  ZoomAtIn, ZoomBox, ZoomClampIn, ZoomHomeIn, ZoomPt, ZoomStepIn, ZoomView, ZoomXY,
  AcctPlan, FlagSetIn, ProOfIn,
  Me, MeRespJson,
  NavLabelIn, SecChangeFn, SecChangeIn, SecItemsIn, SecTabItem,
  RefreshFn, RefreshIn,
  Sec,
  WeeklyToggleFn, WeeklyToggleIn,
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
 * 账户页的分层态(2026-10-06:「我的求职」「我的收藏」点公司名开公司弹框要它)。账户页是纯客户端页,没有页面门
 * 在服务端算好的那份,这里按 /api/users/me 的结果拼:档案用 lib/jobs 的 normalizeProfile / hasProfile、Pro 用 proOf
 * (与服务端 isPro 同口径),交职位桶的 toJobPlan 装配 —— 与各页面门同一套口径;没登录给访客态。
 *
 * @param me 登录人(没登录 = null)。
 * @returns 分层态。
 */
export function planOf(me: Me): AcctPlan {
  if (me == null) {
    const none = normalizeProfile(null)
    return toJobPlan({ user: null, pro: false, profile: none, profileOk: false })
  }
  let raw = null
  if (me.profile != null) {
    raw = me.profile
  }
  let until = null
  if (me.proUntil != null) {
    until = me.proUntil
  }
  const profile = normalizeProfile(raw)
  return toJobPlan({ user: me, pro: proOf({ until }), profile, profileOk: hasProfile(profile) })
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
 * 2026-10-06 加缩放:画布显示尺寸写死成整页大小(放大时重画只换像素,不改版面),文档不再画完即销毁,
 * 交给弹框留着(按新倍数重画要用),弹框关掉时销毁。
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
      canvas.style.width = Math.floor(base.width * fit) + PX
      canvas.style.height = Math.floor(base.height * fit) + PX
      canvas.hidden = i !== THUMB_PAGE
      await page.render({ canvas, viewport }).promise
      canvases.push(canvas)
    }
    x.box.replaceChildren(...canvases)
    x.setDoc(doc)
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
 * 预览视图收进合法范围:倍数夹在上下限之间;平移最多拖到页边贴舞台边(倍数 1 时归零)。
 *
 * @param x 视图与舞台尺寸。
 * @returns 合法视图。
 */
export function clampViewOf(x: ZoomClampIn): ZoomView {
  const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, x.view.zoom))
  const maxX = (x.box.w * (zoom - ZOOM_MIN)) / CENTER_DIV
  const maxY = (x.box.h * (zoom - ZOOM_MIN)) / CENTER_DIV
  return { zoom, x: Math.min(maxX, Math.max(-maxX, x.view.x)), y: Math.min(maxY, Math.max(-maxY, x.view.y)) }
}

/**
 * 以某点为不动点缩放:那一点下面的内容缩放前后待在原处(滚轮以鼠标位置为中心、「+ / −」以舞台中心)。
 *
 * @param x 视图、倍率、不动点与舞台尺寸。
 * @returns 缩放后的合法视图。
 */
export function zoomAtOf(x: ZoomAtIn): ZoomView {
  const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, x.view.zoom * x.factor))
  const k = zoom / x.view.zoom
  return clampViewOf({
    view: { zoom, x: x.at.x - k * (x.at.x - x.view.x), y: x.at.y - k * (x.at.y - x.view.y) },
    box: x.box,
  })
}

/**
 * 两点距离。
 *
 * @param x 两点。
 * @returns 距离。
 */
export function distOf(x: PtPairIn): number {
  return Math.hypot(x.a.x - x.b.x, x.a.y - x.b.y)
}

/**
 * 两点中点。
 *
 * @param x 两点。
 * @returns 中点。
 */
export function midOf(x: PtPairIn): ZoomXY {
  return { x: (x.a.x + x.b.x) / CENTER_DIV, y: (x.a.y + x.b.y) / CENTER_DIV }
}

/**
 * 拖动 / 捏合中的视图:一指 = 平移(跟手);两指 = 按两指距离比缩放,开始时两指中点下的内容跟着现在的中点走。
 *
 * @param x 这次手势与舞台尺寸。
 * @returns 合法视图。
 */
export function gripViewOf(x: GripViewIn): ZoomView {
  const g = x.grip
  const [f0, f1] = g.from
  const [n0, n1] = g.now
  if (f0 == null || n0 == null) {
    return g.start
  }
  if (f1 == null || n1 == null) {
    return clampViewOf({
      view: { zoom: g.start.zoom, x: g.start.x + n0.x - f0.x, y: g.start.y + n0.y - f0.y },
      box: x.box,
    })
  }
  const d0 = distOf({ a: f0, b: f1 })
  if (d0 === 0) {
    return g.start
  }
  const m0 = midOf({ a: f0, b: f1 })
  const m1 = midOf({ a: n0, b: n1 })
  const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, (g.start.zoom * distOf({ a: n0, b: n1 })) / d0))
  const k = zoom / g.start.zoom
  return clampViewOf({
    view: { zoom, x: m1.x - k * (m0.x - g.start.x), y: m1.y - k * (m0.y - g.start.y) },
    box: x.box,
  })
}

/**
 * 倍数的百分比字样。
 *
 * @param view 视图。
 * @returns 如「150%」。
 */
export function zoomPctOf(view: ZoomView): string {
  return Math.round(view.zoom * ZOOM_PCT) + PCT_SIGN
}

/**
 * 视图的 CSS transform 串(以放页容器中心为原点:先平移再缩放)。
 *
 * @param view 视图。
 * @returns transform 串。
 */
export function transformOf(view: ZoomView): string {
  return TF_HEAD + view.x + TF_MID + view.y + TF_SCALE + view.zoom + TF_TAIL
}

/**
 * 把视图套到放页容器上(容器归 pdf.js 独占,React 不管它的样式,这里直接写)。
 *
 * @param x 容器与视图。
 * @returns 无。
 */
export function applyViewTo(x: ApplyViewIn): void {
  x.box.style.transform = transformOf(x.view)
}

/**
 * 指针在舞台里的位置(相对舞台中心)。
 *
 * @param e 指针事件。
 * @returns 位置。
 */
export function gripPtOf(e: DivPointerEvent): ZoomPt {
  const r = e.currentTarget.getBoundingClientRect()
  return { id: e.pointerId, x: e.clientX - r.left - r.width / CENTER_DIV, y: e.clientY - r.top - r.height / CENTER_DIV }
}

/**
 * 舞台尺寸。
 *
 * @param el 舞台。
 * @returns 宽高。
 */
export function stageBoxOf(el: HTMLDivElement): ZoomBox {
  const r = el.getBoundingClientRect()
  return { w: r.width, h: r.height }
}

/**
 * 手指 / 鼠标按下:抓住指针(移出舞台也收得到),以当前视图与各指位置重新起算这次手势。
 *
 * @param x 当前视图、手势与两个落格。
 * @returns 按下手柄。
 */
export function makeGripDown(x: GripIn): (e: DivPointerEvent) => void {
  return function onGripDown(e: DivPointerEvent): void {
    e.currentTarget.setPointerCapture(e.pointerId)
    const pts: ZoomPt[] = []
    if (x.grip != null) {
      pts.push(...x.grip.now)
    }
    pts.push(gripPtOf(e))
    x.setGrip({ start: x.view, from: pts, now: pts })
  }
}

/**
 * 手指 / 鼠标移动:更新这根指的位置,按手势算视图(没按着就不管)。
 *
 * @param x 当前视图、手势与两个落格。
 * @returns 移动手柄。
 */
export function makeGripMove(x: GripIn): (e: DivPointerEvent) => void {
  return function onGripMove(e: DivPointerEvent): void {
    const g = x.grip
    if (g == null) {
      return
    }
    const pt = gripPtOf(e)
    const now: ZoomPt[] = []
    for (const p of g.now) {
      if (p.id === pt.id) {
        now.push(pt)
      } else {
        now.push(p)
      }
    }
    const next = { start: g.start, from: g.from, now }
    x.setGrip(next)
    x.setView(gripViewOf({ grip: next, box: stageBoxOf(e.currentTarget) }))
  }
}

/**
 * 手指 / 鼠标抬起或被打断:去掉这根指;还剩手指就以当前视图重新起算(两指变一指时不跳)。
 *
 * @param x 当前视图、手势与两个落格。
 * @returns 抬起手柄。
 */
export function makeGripUp(x: GripIn): (e: DivPointerEvent) => void {
  return function onGripUp(e: DivPointerEvent): void {
    const g = x.grip
    if (g == null) {
      return
    }
    const rest: ZoomPt[] = []
    for (const p of g.now) {
      if (p.id !== e.pointerId) {
        rest.push(p)
      }
    }
    if (rest.length === 0) {
      x.setGrip(null)
      return
    }
    x.setGrip({ start: x.view, from: rest, now: rest })
  }
}

/**
 * 滚轮系数:触控板捏合(带 ctrlKey)用大系数,鼠标滚轮用小系数。
 *
 * @param ctrl 带 ctrlKey 吗。
 * @returns 系数。
 */
export function wheelKOf(ctrl: boolean): number {
  if (ctrl) {
    return ZOOM_PINCH_K
  }
  return ZOOM_WHEEL_K
}

/**
 * 在舞台上挂滚轮缩放(以鼠标位置为中心;拦掉浏览器默认的滚动与整页缩放)。
 * 要非被动监听才能拦,React 的 onWheel 是被动的,所以原生挂;按上一刻视图算,连滚几格不丢。
 *
 * @param x 舞台与改视图。
 * @returns 解绑函数。
 */
export function makeWheelBind(x: WheelBindIn): () => void {
  function onWheel(e: WheelEvent): void {
    e.preventDefault()
    const r = x.stage.getBoundingClientRect()
    const at = { x: e.clientX - r.left - r.width / CENTER_DIV, y: e.clientY - r.top - r.height / CENTER_DIV }
    const factor = Math.exp(-e.deltaY * wheelKOf(e.ctrlKey))
    x.setView(function nextView(v: ZoomView): ZoomView {
      return zoomAtOf({ view: v, factor, at, box: { w: r.width, h: r.height } })
    })
  }
  x.stage.addEventListener(EV_WHEEL, onWheel, WHEEL_OPTS)
  return function unbindWheel(): void {
    x.stage.removeEventListener(EV_WHEEL, onWheel)
  }
}

/**
 * 「+ / −」钮:以舞台中心为不动点乘一个倍率。
 *
 * @param x 舞台、改视图与倍率。
 * @returns 点击手柄。
 */
export function makeZoomStep(x: ZoomStepIn): () => void {
  return function onZoomStep(): void {
    const stage = x.stage
    if (stage == null) {
      return
    }
    x.setView(function nextView(v: ZoomView): ZoomView {
      return zoomAtOf({ view: v, factor: x.factor, at: { x: 0, y: 0 }, box: stageBoxOf(stage) })
    })
  }
}

/**
 * 回整页(点百分比、双击舞台)。
 *
 * @param x 改视图。
 * @returns 点击手柄。
 */
export function makeZoomHome(x: ZoomHomeIn): () => void {
  return function onZoomHome(): void {
    x.setView(ZOOM_HOME)
  }
}

/**
 * 翻页:换页并回整页(放大的位置对下一页没意义)。
 *
 * @param x 两个落格。
 * @returns 翻页手柄。
 */
export function makePageTurn(x: PageTurnIn): (p: number) => void {
  return function onPage(p: number): void {
    x.setIndex(p)
    x.setView(ZOOM_HOME)
  }
}

/**
 * 按新倍数重画当前页:新画布显示尺寸不变、像素按「整页大小 × 倍数 × 设备像素比」(长边封顶),
 * 画好后替换旧画布 —— 缩放中先拉伸旧画面,停下后字变清楚。已经够清楚(缩小回来)就不画。
 *
 * @param x 文档、容器、第几页与倍数。
 * @returns 画完(或放弃)时 resolve。
 */
export async function renderPdfZoom(x: PdfZoomDrawIn): Promise<void> {
  try {
    const old = x.box.children[x.index]
    if (old instanceof HTMLCanvasElement === false) {
      return
    }
    const page = await x.doc.getPage(x.index + 1)
    const base = page.getViewport({ scale: THUMB_BASE_SCALE })
    const want = (old.clientWidth / base.width) * x.zoom * window.devicePixelRatio
    const scale = Math.min(want, ZOOM_PX_MAX / Math.max(base.width, base.height))
    if (Math.floor(base.width * scale) <= old.width) {
      return
    }
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement(CANVAS_TAG)
    canvas.className = old.className
    canvas.style.width = old.style.width
    canvas.style.height = old.style.height
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    await page.render({ canvas, viewport }).promise
    canvas.hidden = old.hidden
    old.replaceWith(canvas)
  } catch {
    ignoreWriteErr()
  }
}

/**
 * 缩放停下 ZOOM_SETTLE_MS 后再重画(倍数一直在变时不画;effect 清理时取消没开始的那次)。
 *
 * @param x 文档、容器、第几页与倍数。
 * @returns 取消函数。
 */
export function makeZoomRedraw(x: PdfZoomDrawIn): () => void {
  function redraw(): void {
    void renderPdfZoom(x)
  }
  const timer = window.setTimeout(redraw, ZOOM_SETTLE_MS)
  return function cancelRedraw(): void {
    window.clearTimeout(timer)
  }
}

/**
 * 弹框关掉(或换文件)时销毁文档,放掉 worker 里的内存。
 *
 * @param doc 文档。
 * @returns 销毁函数。
 */
export function makeDocDrop(doc: PdfDoc): () => void {
  return function dropDoc(): void {
    void doc.loadingTask.destroy()
  }
}

/**
 * 预览舞台的类名:基座 + 放大后的抓手光标。
 *
 * @param zoomed 放大了吗。
 * @returns 拼好的 className。
 */
export function stageClsOf(zoomed: boolean): string {
  if (zoomed) {
    return cssOf(css.rfStage) + CLS_SEP + cssOf(css.rfStageZoomed)
  }
  return cssOf(css.rfStage)
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
