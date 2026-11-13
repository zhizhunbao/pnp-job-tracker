/**
 * me 桶子桶 base 的行为:拉简历清单取那一份、上传 / 替换(选文件或拖进来)、删除,替换与删除都先弹确认框。
 * 2026-11-12 自子桶 resume 裁出重写,为档案与简历并页(2026-11-11 Frank「只留一份上传的吧。因为之后都可以按岗位改写」
 * 「左边我的档案,右面我的简历」):接口、上限、报错码照旧;有了那一份之后,再传一律替换它(PUT 带它的 id)。
 *
 * @author Frank
 * @time 2026-11-12 10:00:00
 */
import { cssOf } from '@/components/css'
import { ymd } from '@/lib/time'
import {
  BYTES_KB, BYTES_MB, CARD_HEAD_CLS, CLS_SEP, CRED_INCLUDE, EV_BUILD, EV_UPLOADED, FIELD_FILE, MB_DIGITS, METHOD_DELETE,
  METHOD_PUT, MIME_PDF, Q_DL_TAIL, Q_ID_HEAD, Q_VER_MID, RESUME_MAX_BYTES, RF_ERR_FALLBACK, RF_ERR_KEY, RF_ERR_SIZE,
  TEXT_NONE, UNIT_KB, UNIT_MB, URL_RESUME_FILE, URL_RESUME_FILES,
} from './constants'
import type {
  AskOkIn, AskSetFn, BodyClsIn, DeleteAskIn, DeleteIn, DivDragEvent, DragSetIn, ErrTextIn, FileDropIn, FilePickIn,
  InputChangeEvent, MaybeResumeMeta, PickerIn, ReplaceAskIn, ResumeListLoadIn, ResumeMeta, ResumeMetas,
  ResumeReloadFn, ResumeRespJson, ResumeUploadFn, ResumeUploadIn, UploadRunIn,
} from './types'
import css from './base.module.css'

/**
 * 那一份原件的地址:带 id;下载再带 dl。
 *
 * @param id 简历 id。
 * @returns 地址。
 */
export function fileUrlOf(id: number): string {
  return URL_RESUME_FILE + Q_ID_HEAD + String(id)
}

/**
 * 那一份原件的下载地址。
 *
 * @param id 简历 id。
 * @returns 地址。
 */
export function downloadUrlOf(id: number): string {
  return fileUrlOf(id) + Q_DL_TAIL
}

/**
 * 是 PDF 吗(只有 PDF 能在卡里画出来;Word 浏览器画不了)。
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
 * 上传日期的显示串(年-月-日)。
 *
 * @param m 那一份简历。
 * @returns 日期。
 */
export function dateLabelOf(m: ResumeMeta): string {
  return ymd(m.uploadedAt)
}

/**
 * 清单 → 那一份上传的简历(第一条;一条都没有 = null)。
 *
 * @param items 清单。
 * @returns 那一份或 null。
 */
export function fileOf(items: ResumeMetas): MaybeResumeMeta {
  for (const m of items) {
    return m
  }
  return null
}

/**
 * 再传时替换哪一份:现有那一份的 id;还没有 = null(新加)。
 *
 * @param file 现有那一份。
 * @returns id 或 null。
 */
export function replaceIdOf(file: MaybeResumeMeta): number | null {
  if (file == null) {
    return null
  }
  return file.id
}

/**
 * 报错的字:文案键按界面语取好;没错给空串。
 *
 * @param x 文案键与取词。
 * @returns 字或空串。
 */
export function errTextOf(x: ErrTextIn): string {
  if (x.err === TEXT_NONE) {
    return TEXT_NONE
  }
  return x.t(x.err)
}

/**
 * 卡头的类名:全局卡头类管字号字重,本桶的类补成一行(标题在左、钮在右)。
 *
 * @returns 拼好的 className。
 */
export function headClsOf(): string {
  return CARD_HEAD_CLS + CLS_SEP + cssOf(css.head)
}

/**
 * 卡身的类名:有简历时只在拖到上方时亮描边;空态是虚线上传区,拖到上方描边变蓝。
 *
 * @param x 悬停否与空态否。
 * @returns 拼好的 className。
 */
export function bodyClsOf(x: BodyClsIn): string {
  let base = cssOf(css.body)
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
 * 造「拉清单」的函数:挂载拉一次,上传 / 删除 / 生成之后再拉。拉失败也拨「拉回来了」,落到上传区 ——
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
 * 静默是**点名的**(子桶 resume 的同一口径),不是忘了处理。
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
 * 带 replaceId 就替换现有那一份,否则新加;成功重拉清单并清掉报错;失败按错误码出文案,原来的不动。
 * 2026-11-12 Frank「这个应该是自动填的吧」:成功后发一个页面事件,档案那一半听到、档案还有空格就打开修改面板自动从简历填写。
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
        window.dispatchEvent(new Event(EV_UPLOADED))
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
 * 点「生成简历」(2026-11-12 Frank「和我修改简历那一部分合并一下」):发一个页面事件,档案那一半听到就打开修改面板
 * (生成简历在它的末段)。
 *
 * @returns 无。
 */
export function fireBuild(): void {
  window.dispatchEvent(new Event(EV_BUILD))
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
 * 造拖放落下手柄:拦住浏览器默认的「打开这个文件」,取第一个文件。还没有简历直接传;
 * 已有一份 = 替换,先弹替换确认框(旧的一换就没了,不让一次误拖把它盖掉),确认了才传。
 *
 * @param x 现有那一份、一次上传、高亮落格与拨替换确认框。
 * @returns drop 手柄。
 */
export function makeFileDrop(x: FileDropIn): (e: DivDragEvent) => void {
  return function dropFile(e: DivDragEvent): void {
    e.preventDefault()
    x.setDragOn(false)
    const dropped = e.dataTransfer.files.item(0)
    if (dropped == null) {
      return
    }
    if (x.file == null) {
      void x.upload(dropped)
      return
    }
    x.setAsk({ name: x.file.fileName, run: makeUploadRun({ upload: x.upload, file: dropped }) })
  }
}

/**
 * 造「确认后把拖进来的那个文件传上去」的手柄(替换确认框的确认钮跑它)。
 *
 * @param x 一次上传与那个文件。
 * @returns 点击手柄。
 */
export function makeUploadRun(x: UploadRunIn): () => void {
  return function uploadDropped(): void {
    void x.upload(x.file)
  }
}

/**
 * 造拖放悬停手柄:必须拦默认行为,浏览器才肯把 drop 交给卡身;顺手亮起描边。
 *
 * @param x 高亮落格。
 * @returns dragover 手柄。
 */
export function makeDragOver(x: DragSetIn): (e: DivDragEvent) => void {
  return function dragOver(e: DivDragEvent): void {
    e.preventDefault()
    x.setDragOn(true)
  }
}

/**
 * 造拖离手柄:熄掉描边。
 *
 * @param x 高亮落格。
 * @returns dragleave 手柄。
 */
export function makeDragLeave(x: DragSetIn): () => void {
  return function dragLeave(): void {
    x.setDragOn(false)
  }
}

/**
 * 造「打开文件选择器」手柄:替用户去点藏起来的文件框(「上传简历 / 选择文件」直接用;替换确认后也跑它)。
 *
 * @param x 文件框。
 * @returns 点击手柄。
 */
export function makePicker(x: PickerIn): () => void {
  return function openPicker(): void {
    if (x.input != null) {
      x.input.click()
    }
  }
}

/**
 * 造「替换文件」手柄:不直接开文件选择器,先弹替换确认框(正文 = 现有文件名),确认了才开。
 *
 * @param x 现有那一份、文件框与拨替换确认框。
 * @returns 点击手柄。
 */
export function makeReplaceAsk(x: ReplaceAskIn): () => void {
  return function askReplace(): void {
    if (x.file == null) {
      return
    }
    x.setAsk({ name: x.file.fileName, run: makePicker({ input: x.input }) })
  }
}

/**
 * 造「删除」手柄(2026-10-12 Frank「所有删除按钮不要直接删,先弹框确认是否删除」):
 * 不直接删,先弹删除确认框,确认了才跑真删。
 *
 * @param x 现有那一份、拨删除确认框、重拉与报错落格。
 * @returns 点击手柄。
 */
export function makeDeleteAsk(x: DeleteAskIn): () => void {
  return function askDelete(): void {
    if (x.file == null) {
      return
    }
    x.setAsk({ name: x.file.fileName, run: makeDelete({ act: x.act, id: x.file.id }) })
  }
}

/**
 * 造真删手柄(删除确认框「删除」钮跑它)。
 *
 * @param x 重拉、报错落格与删哪一份。
 * @returns 点击手柄。
 */
export function makeDelete(x: DeleteIn): () => void {
  return function deleteResume(): void {
    void sendDelete(x)
  }
}

/**
 * 真删的那一次请求:服务端删成功才重拉并清报错(删的是原件,失败不能假装删了);失败(含网络断)出「没成功,稍后再试」。
 *
 * @param x 重拉、报错落格与删哪一份。
 * @returns 请求结束时 resolve。
 */
export async function sendDelete(x: DeleteIn): Promise<void> {
  try {
    const r = await fetch(fileUrlOf(x.id), { method: METHOD_DELETE, credentials: CRED_INCLUDE })
    if (r.ok) {
      x.act.setErr(TEXT_NONE)
      await x.act.reload()
      return
    }
  } catch {
    x.act.setErr(RF_ERR_FALLBACK)
    return
  }
  x.act.setErr(RF_ERR_FALLBACK)
}

/**
 * 造确认框确认钮:跑等着的那一次再关框。
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
 * 造确认框「取消」:关框。
 *
 * @param setAsk 拨框手柄。
 * @returns 点击手柄。
 */
export function makeAskClose(setAsk: AskSetFn): () => void {
  return function askClose(): void {
    setAsk(null)
  }
}
