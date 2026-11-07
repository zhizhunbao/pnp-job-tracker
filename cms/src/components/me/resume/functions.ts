/**
 * me 桶子桶 resume 的行为:拉简历清单、上传 / 替换(选文件或拖进来)、设默认、删除(先弹确认框)、开关预览框,
 * 拉求职信清单,外加两张表的列构造与展示行。2026-11-07 自 account 桶在新域重写(Frank「全部在新域重写」):
 * 接口、上限、报错码照旧;卡片网格换成通用表格(名称 / 上传日期 / 大小),行上不放钮,点名字开预览框,
 * 下载 / 设为默认 / 替换文件 / 删除挪进预览框;求职信卡片换成表格(职位 / 公司 / 状态 / 写于)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { cssOf } from '@/components/css'
import { log } from '@/lib/log'
import { ymd } from '@/lib/time'
import {
  BYTES_KB, BYTES_MB, CLS_SEP, COL_COMPANY, COL_DATE, COL_NAME, COL_SIZE, COL_STATUS, COL_TITLE, COL_WROTE, COUNT_SEP,
  CRED_INCLUDE, FIELD_FILE, LETTER_DRAFT_TAG, LETTER_FILE_TAIL, LETTER_SENT_TAG, MB_DIGITS, META_SEP, METHOD_DELETE,
  METHOD_PATCH, METHOD_PUT, MIME_PDF, Q_DL_TAIL, Q_ID_HEAD, Q_VER_MID, RESUME_FILES_MAX, RESUME_MAX_BYTES,
  RF_ERR_FALLBACK, RF_ERR_KEY, RF_ERR_SIZE, ST_DRAFT, TAB_LETTER, TAB_RESUME, TEXT_NONE, UNIT_KB, UNIT_MB,
  URL_APPLY_HEAD, URL_LETTERS, URL_LETTER_FILE_HEAD, URL_RESUME_FILE, URL_RESUME_FILES,
  LETTERS_FAIL_TEXT, LETTERS_LOG_TAG,
} from './constants'
import { LetterCompanyCell } from './lettercompanycell'
import { LetterStatusCell } from './letterstatuscell'
import { LetterTitleCell } from './lettertitlecell'
import { ResumeNameCell } from './resumenamecell'
import type {
  AskIn, AskOkIn, AskSetFn, DivDragEvent, FileDropIn, FilePickIn, IdHandlerFn, InputChangeEvent, LetterCellRow,
  LetterCol, LetterMeta, LetterMetas, LetterRowsIn, LettersLoadIn, LettersRespJson, LetterStatusIn, LetterTag,
  ListClsIn, MaybeResumeMeta, PickerIn, PreviewPickIn, PreviewSetIn, ResumeActIn, ResumeActSendIn, ResumeCellRow,
  ResumeCol, ResumeListLoadIn, ResumeMeta, ResumeMetas, ResumeReloadFn, ResumeRespJson, ResumeRowsIn, ResumeUploadFn,
  ResumeUploadIn, TabItemsIn, TabView, TFn,
} from './types'
import css from './resume.module.css'

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
 * 是 PDF 吗(只有 PDF 能在预览框里画出来;Word 浏览器画不了)。
 *
 * @param m 元信息。
 * @returns 是 PDF。
 */
export function isPdf(m: ResumeMeta): boolean {
  return m.mime === MIME_PDF
}

/**
 * 预览要取的原件地址:拼上传时刻当版本(替换了地址就变)。
 *
 * @param m 元信息。
 * @returns 地址。
 */
export function previewSrcOf(m: ResumeMeta): string {
  return fileUrlOf(m.id) + Q_VER_MID + encodeURIComponent(m.uploadedAt)
}

/**
 * 份数小字「2 / 20」。
 *
 * @param n 现有份数。
 * @returns 小字。
 */
export function countLabelOf(n: number): string {
  return String(n) + COUNT_SEP + String(RESUME_FILES_MAX)
}

/**
 * 还能再加吗(不到上限)。
 *
 * @param n 现有份数。
 * @returns 能加。
 */
export function canAddOf(n: number): boolean {
  return n < RESUME_FILES_MAX
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
 * 预览框开着的那一份:按 id 从清单里现取(替换、设默认之后跟着新的走;删了取不到 = 框关掉)。
 *
 * @param x 清单与开着哪一份。
 * @returns 那一份;没开或已删为 null。
 */
export function previewMetaOf(x: PreviewPickIn): MaybeResumeMeta {
  for (const m of x.items) {
    if (m.id === x.id) {
      return m
    }
  }
  return null
}

/**
 * 简历清单区的类名:有清单时只在拖到上方时亮描边;空态是虚线上传区,拖到上方描边变蓝。
 *
 * @param x 悬停否与空态否。
 * @returns 拼好的 className。
 */
export function listClsOf(x: ListClsIn): string {
  let base = cssOf(css.list)
  if (x.empty) {
    base = cssOf(css.drop)
  }
  if (x.on) {
    return base + CLS_SEP + cssOf(css.dropOn)
  }
  return base
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
      keepOldList()
    }
    x.setChecked(true)
  }
}

/**
 * 拉清单挂了的静默口:清单保持上一次的样子(第一次就是空,落上传区),不出话术 ——
 * 静默是**点名的**(原 account 桶 ignoreWriteErr 的同一口径),不是忘了处理。
 *
 * @returns 无。
 */
export function keepOldList(): void {
  return
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
    x.setErr(TEXT_NONE)
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
    el.value = TEXT_NONE
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
 * 造拖放悬停手柄:必须拦默认行为,浏览器才肯把 drop 交给清单区;顺手亮起描边。
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
 * 造「上传简历 / 选择文件」手柄:记下「新加」,替用户去点藏起来的文件框。
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
 * 造「确认删除」工厂:服务端删成功才重拉(删的是原件,失败不能假装删了)。
 * 2026-10-12 起它是删除确认框「删除」钮跑的真删(makeAsk 递进框里)。
 *
 * @param x 重拉与报错落格。
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
 * @param x 重拉与报错落格。
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
 * 删除 / 设默认共用的一次请求:成功重拉清单并清报错,失败(含网络断)出「没成功,稍后再试」。
 *
 * @param y 落格、地址与方法。
 * @returns 请求结束时 resolve。
 */
export async function sendResumeAct(y: ResumeActSendIn): Promise<void> {
  try {
    const r = await fetch(y.url, { method: y.method, credentials: CRED_INCLUDE })
    if (r.ok) {
      y.x.setErr(TEXT_NONE)
      await y.x.reload()
      return
    }
  } catch {
    y.x.setErr(RF_ERR_FALLBACK)
    return
  }
  y.x.setErr(RF_ERR_FALLBACK)
}

/**
 * 造「开预览框」工厂:按 id 记下开着哪一份(点文件名)。
 *
 * @param x 开着哪一份的落格。
 * @returns 按 id 出手柄的工厂。
 */
export function makePreviewOf(x: PreviewSetIn): IdHandlerFn {
  return function previewOf(id: number): () => void {
    return function openPreview(): void {
      x.setPreviewId(id)
    }
  }
}

/**
 * 造「关预览框」手柄。
 *
 * @param x 开着哪一份的落格。
 * @returns 关闭手柄。
 */
export function makePreviewClose(x: PreviewSetIn): () => void {
  return function closePreview(): void {
    x.setPreviewId(null)
  }
}

/**
 * 造「点删除」(2026-10-12 Frank「所有删除按钮不要直接删,先弹框确认是否删除」):
 * 不直接删,先拨开删除确认框,确认了才跑真删的手柄。
 *
 * @param x 拨框手柄、名字与真删手柄。
 * @returns 点击手柄。
 */
export function makeAsk(x: AskIn): () => void {
  return function ask(): void {
    x.setAsk({ name: x.name, run: x.run })
  }
}

/**
 * 造删除确认框「删除」钮:真删再关框。
 *
 * @param x 等着确认的那一次与拨框手柄。
 * @returns 点击手柄。
 */
export function makeAskOk(x: AskOkIn): () => void {
  return function askOk(): void {
    if (x.ask != null) {
      x.ask.run()
    }
    x.setAsk(null)
  }
}

/**
 * 造删除确认框「取消」:关框。
 *
 * @param setAsk 拨框手柄。
 * @returns 点击手柄。
 */
export function makeAskClose(setAsk: AskSetFn): () => void {
  return function askClose(): void {
    setAsk(null)
  }
}

/**
 * 造「拉求职信清单」:失败落「拉失败了」并留痕(2026-11-07:不再按空清单读,免得说「还没有求职信」)。
 *
 * @param x 两个落格。
 * @returns 拉的函数。
 */
export function makeLettersLoad(x: LettersLoadIn): () => Promise<void> {
  return async function loadLetters(): Promise<void> {
    try {
      const r = await fetch(URL_LETTERS, { credentials: CRED_INCLUDE })
      if (r.ok === false) {
        log({ tag: LETTERS_LOG_TAG, text: LETTERS_FAIL_TEXT + String(r.status) })
        x.setFailed(true)
        return
      }
      x.setItems(toLetterMetas(await r.json() as LettersRespJson))
    } catch (e) {
      log({ tag: LETTERS_LOG_TAG, text: LETTERS_FAIL_TEXT + String(e) })
      x.setFailed(true)
    } finally {
      x.setChecked(true)
    }
  }
}

/**
 * 回包 → 求职信清单(缺席按空)。
 *
 * @param d 回包。
 * @returns 清单。
 */
export function toLetterMetas(d: LettersRespJson): LetterMetas {
  if (d.items == null) {
    return []
  }
  return d.items
}

/**
 * 这一封是草稿吗。
 *
 * @param m 这一封。
 * @returns 是草稿。
 */
export function isLetterDraft(m: LetterMeta): boolean {
  return m.status === ST_DRAFT
}

/**
 * 点职位名去哪儿:草稿「继续」去投递框(职位删了给空串,没法继续),发出去的「打开」信的 PDF。
 *
 * @param m 这一封。
 * @returns 地址或空串。
 */
export function letterHrefOf(m: LetterMeta): string {
  if (isLetterDraft(m) === false) {
    return URL_LETTER_FILE_HEAD + String(m.id) + LETTER_FILE_TAIL
  }
  if (m.jobId == null) {
    return TEXT_NONE
  }
  return URL_APPLY_HEAD + String(m.jobId)
}

/**
 * 状态胶囊的字:草稿 / 已投递。
 *
 * @param x 这一封与取词。
 * @returns 字。
 */
export function letterStatusOf(x: LetterStatusIn): string {
  if (isLetterDraft(x.m)) {
    return x.t('mj.draft')
  }
  return x.t('ap.applied')
}

/**
 * 页签条两项:「简历 n / 20」「求职信 n」(份数是灰色小字;清单没拉回来不出数)。
 *
 * @param x 整机面板与取词。
 * @returns 两项。
 */
export function tabItemsOf(x: TabItemsIn): TabView[] {
  let resumeBadge = TEXT_NONE
  if (x.r.checked) {
    resumeBadge = countLabelOf(x.r.items.length)
  }
  let letterBadge = TEXT_NONE
  if (x.r.lettersChecked) {
    letterBadge = String(x.r.letters.length)
  }
  return [
    { key: TAB_RESUME, label: x.t('ap.resume'), badge: resumeBadge },
    { key: TAB_LETTER, label: x.t('rl.title'), badge: letterBadge },
  ]
}

/**
 * 简历清单 → 展示行。
 *
 * @param x 清单、开预览框的工厂与取词。
 * @returns 展示行。
 */
export function resumeRowsOf(x: ResumeRowsIn): ResumeCellRow[] {
  const out: ResumeCellRow[] = []
  for (const m of x.items) {
    out.push({
      key: String(m.id),
      name: m.fileName,
      isDefault: m.isDefault,
      defaultText: x.t('rf.default'),
      date: ymd(m.uploadedAt),
      size: sizeLabelOf(m.sizeBytes),
      onOpen: x.previewOf(m.id),
    })
  }
  return out
}

/**
 * 简历表的三列:名称 / 上传日期 / 大小(行上不放钮;点名称开预览框)。
 *
 * @param t 取词。
 * @returns 列组。
 */
export function resumeColsOf(t: TFn): ResumeCol[] {
  return [
    { key: COL_NAME, label: t('rf.col.name'), render: ResumeNameCell, nowrap: false },
    { key: COL_DATE, label: t('rf.col.date'), render: resumeDateOf, nowrap: true },
    { key: COL_SIZE, label: t('rf.col.size'), render: resumeSizeOf, nowrap: true },
  ]
}

/**
 * 上传日期格。
 *
 * @param r 展示行。
 * @returns 年-月-日。
 */
export function resumeDateOf(r: ResumeCellRow): string {
  return r.date
}

/**
 * 大小格。
 *
 * @param r 展示行。
 * @returns 大小。
 */
export function resumeSizeOf(r: ResumeCellRow): string {
  return r.size
}

/**
 * 窄屏清单里名字下面那一行:「上传日期, 大小」。
 *
 * @param r 展示行。
 * @returns 一行灰字。
 */
export function resumeMetaLineOf(r: ResumeCellRow): string {
  return r.date + META_SEP + r.size
}

/**
 * 简历表的行身份。
 *
 * @param r 展示行。
 * @returns 简历 id。
 */
export function resumeKeyOf(r: ResumeCellRow): string {
  return r.key
}

/**
 * 求职信清单 → 展示行。
 *
 * @param x 清单与取词。
 * @returns 展示行。
 */
export function letterRowsOf(x: LetterRowsIn): LetterCellRow[] {
  const out: LetterCellRow[] = []
  for (const m of x.items) {
    out.push({
      key: String(m.id),
      title: m.title,
      company: m.company,
      draft: isLetterDraft(m),
      statusText: letterStatusOf({ m, t: x.t }),
      tag: letterTagOf(isLetterDraft(m)),
      href: letterHrefOf(m),
      wrote: ymd(m.wroteAt),
    })
  }
  return out
}

/**
 * 求职信表的四列:职位 / 公司 / 状态 / 写于(点职位名 = 原卡片上的「继续」或「打开」)。
 *
 * @param t 取词。
 * @returns 列组。
 */
export function letterColsOf(t: TFn): LetterCol[] {
  return [
    { key: COL_TITLE, label: t('col.title'), render: LetterTitleCell, nowrap: false },
    { key: COL_COMPANY, label: t('col.company'), render: LetterCompanyCell, nowrap: false },
    { key: COL_STATUS, label: t('col.status'), render: LetterStatusCell, nowrap: true },
    { key: COL_WROTE, label: t('rl.col.wrote'), render: letterWroteOf, nowrap: true },
  ]
}

/**
 * 写于格。
 *
 * @param r 展示行。
 * @returns 年-月-日。
 */
export function letterWroteOf(r: LetterCellRow): string {
  return r.wrote
}

/**
 * 求职信表的行身份。
 *
 * @param r 展示行。
 * @returns 投递行 id。
 */
export function letterKeyOf(r: LetterCellRow): string {
  return r.key
}

/**
 * 求职信状态胶囊的档:草稿灰、已投递绿。
 *
 * @param draft 是草稿吗。
 * @returns 胶囊档。
 */
export function letterTagOf(draft: boolean): LetterTag {
  if (draft) {
    return LETTER_DRAFT_TAG
  }
  return LETTER_SENT_TAG
}
