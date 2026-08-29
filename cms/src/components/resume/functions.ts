/**
 * resume 域(简历对照 JD)的函数:两列的列声明、类名与记号的预算、三条接口的调用手柄
 * 工厂,以及把线格式洗成展示行的行构造器。零 JSX 零 hook —— 排版归各 tsx,
 * 状态归 hooks.ts,死值归 constants.ts。
 * 2026-08-28 换装批自 ResumeMatchModal.tsx 的组件体内闭包函数整体迁出:闭包变量改
 * XxxIn 显式入参,逐项手柄走 makeXxx 工厂(闸 local/no-nested-function)。
 *
 * @author Frank
 * @time 2026-08-28 17:53:00
 */
import { track } from '@/lib/track'
import { cssOf } from '@/components/css'
import {
  BUSY_MARK, CLS_SEP, COL_REQ_KEY, COL_REQ_WIDTH, COL_RES_KEY, CRED_INCLUDE, EV_MATCH_RUN, EXT_SEP, FIELD_FILE,
  FILE_ERR_KEY, FILE_ERR_KEY_DEFAULT, HDR_CONTENT_TYPE, HIT_MARK, MATCH_ERR_KEY, MATCH_ERR_KEY_DEFAULT,
  METHOD_POST, MIME_JSON, MISS_MARK, TEXT_EXTS, TEXT_NONE, URL_EXTRACT, URL_MATCH, URL_ME, URL_PRICING,
} from './constants'
import { MatchResCell } from './matchrescell'
import type {
  BusyMarkIn, CheckChangeFn, CleanupFn, ClickFn, ErrKeyIn, ExtOfIn, ExtractFileIn, ExtractRespJson,
  IsTextFileIn, LiveFlag, LoadArchiveIn, MatchBodyIn, MatchCol, MatchColsIn, MatchFact, MatchRespJson,
  MatchRowFact, MeRespJson, PickFileNowIn, PrefillFn, PrefillIn, ReadPickedFileIn,
  RunClsIn, RunIn, SaveToggleIn, ToMatchFactIn, ToMatchRowIn, UploadClsIn,
} from './types'
import css from './resume.module.css'

/**
 * 结果表的两列:左边工作要求(原文直出)、右边简历现状(记号 + 备注,色档在行上算好)。
 *
 * @param x 取词函数。
 * @returns 两列的列声明。
 */
export function matchColsOf(x: MatchColsIn): MatchCol<MatchRowFact>[] {
  return [
    { key: COL_REQ_KEY, label: x.t('rm.colReq'), width: COL_REQ_WIDTH, render: matchReqOf },
    { key: COL_RES_KEY, label: x.t('rm.colRes'), render: MatchResCell },
  ]
}

/**
 * 左列单元格:这条工作要求的原文(整列一个形态,不用单独的单元格组件)。
 *
 * @param r 这一行展示行。
 * @returns 要求原文。
 */
export function matchReqOf(r: MatchRowFact): string {
  return r.req
}

/**
 * 结果表的行身份(按名次编 —— 要求原文可能重复,不拿它当键)。
 *
 * @param r 这一行展示行。
 * @returns 行键。
 */
export function matchRowKeyOf(r: MatchRowFact): string {
  return r.key
}

/**
 * 钮文字前的忙碌记号(点下去到结果回来之间挂着)。
 *
 * @param x 正忙着没有。
 * @returns 记号;不忙时给空串。
 */
export function busyMarkOf(x: BusyMarkIn): string {
  if (x.on) {
    return BUSY_MARK
  }
  return TEXT_NONE
}

/**
 * 上传钮的类名预算:本域钮形 + 读取中的变浅档。
 *
 * @param x 文件正在读没有。
 * @returns 拼好的 className。
 */
export function uploadClsOf(x: UploadClsIn): string {
  const cls = [cssOf(css.uploadBtn)]
  if (x.reading) {
    cls.push(cssOf(css.dim))
  }
  return cls.join(CLS_SEP)
}

/**
 * 对照钮的类名预算:本域钮形 + 请求在飞时的变浅档。
 *
 * @param x 对照请求在飞没有。
 * @returns 拼好的 className。
 */
export function runClsOf(x: RunClsIn): string {
  const cls = [cssOf(css.runBtn)]
  if (x.busy) {
    cls.push(cssOf(css.dim))
  }
  return cls.join(CLS_SEP)
}

/**
 * 打码区升级钮的去处:定价页,来路记成 `from=match`(这个功能带来多少付费点击要数得清)。
 *
 * @returns 无。
 */
export function goPricing(): void {
  window.location.href = URL_PRICING
}

/**
 * 造「打开就预填存档」的 effect 体(E11-08):已登录且用户还没自己动过手,才拉一次
 * 档案里存下的简历正文。返回的清理函数把「还在场」的旗子放倒 —— 弹框关了就不再拨 state。
 *
 * @param x 动手旗子与两个落格。
 * @returns effect 体(返回清理)。
 */
export function makePrefill(x: PrefillIn): PrefillFn {
  return function startPrefill(): CleanupFn {
    const live: LiveFlag = { on: true }
    void loadArchive({ live, touched: x.touched, setResume: x.setResume, setArchAt: x.setArchAt })
    return function stopPrefill(): void {
      live.on = false
    }
  }
}

/**
 * makePrefill 的真身(async;外壳只把 Promise 收掉)。拉不到就什么都不做 ——
 * 存档只是便利,不挡功能(2026-08-03 的口径:失败静默,页面照旧是今天的老样子)。
 * 用户已经自己贴过或传过的,一律不拿存档去盖。
 *
 * @param x 在场旗子、动手旗子与两个落格。
 * @returns 无。
 */
async function loadArchive(x: LoadArchiveIn): Promise<void> {
  let text = TEXT_NONE
  let at = TEXT_NONE
  try {
    const r = await fetch(URL_ME, { credentials: CRED_INCLUDE })
    const d = await r.json() as MeRespJson
    if (d != null && d.user != null && d.user.profile != null) {
      if (d.user.profile.resumeText != null) {
        text = d.user.profile.resumeText.trim()
      }
      if (d.user.profile.resumeSavedAt != null) {
        at = d.user.profile.resumeSavedAt
      }
    }
  } catch {
    return
  }
  if (x.live.on === false || x.touched.current || text === TEXT_NONE) {
    return
  }
  x.setResume(text)
  x.setArchAt(at)
}

/**
 * 造存档勾选的切换手柄(默认不勾是 E11-08 的隐私红线:不勾 = 行为同以前,简历只在内存里)。
 *
 * @param x 勾选态的落格。
 * @returns 切换手柄。
 */
export function makeSaveToggle(x: SaveToggleIn): CheckChangeFn {
  return function onSaveToggle(e: React.ChangeEvent<HTMLInputElement>): void {
    x.setSave(e.target.checked)
  }
}

/**
 * usePickFile 的真身(async;外壳只把 Promise 收掉)。读完清空选择框的值 ——
 * 不清的话同一个文件再选一次不会触发改值事件。
 * 2026-08-29 refs 批:外壳(原 makePickFile)迁去 hooks.ts 改成 usePickFile,
 * 这个真身留在纯件这边,只多一个 export。
 *
 * @param x 选中的文件、取词函数、动手旗子、选择框 ref 与四个落格。
 * @returns 无。
 */
export async function pickFile(x: PickFileNowIn): Promise<void> {
  x.touched.current = true
  x.setArchAt(TEXT_NONE)
  x.setErr(TEXT_NONE)
  x.setReading(true)
  await readPickedFile({ file: x.file, t: x.t, setResume: x.setResume, setErr: x.setErr })
  x.setReading(false)
  if (x.fileRef.current != null) {
    x.fileRef.current.value = TEXT_NONE
  }
}

/**
 * 把选中的文件读成文本回填粘贴框:md/txt 浏览器直读,其余(pdf/docx)交给服务端解析。
 * 回填而不是直接送去对照 —— 用户看得见、能删改。
 *
 * @param x 选中的文件、取词函数与两个落格。
 * @returns 无。
 */
async function readPickedFile(x: ReadPickedFileIn): Promise<void> {
  if (isTextFile({ ext: extOf({ name: x.file.name }) })) {
    try {
      const text = await x.file.text()
      x.setResume(text.trim())
    } catch {
      x.setErr(x.t(FILE_ERR_KEY_DEFAULT))
    }
    return
  }
  await extractFile({ file: x.file, t: x.t, setResume: x.setResume, setErr: x.setErr })
}

/**
 * 判断这个后缀浏览器自己读不读得了。
 *
 * @param x 小写后缀。
 * @returns 直读得了就 true。
 */
export function isTextFile(x: IsTextFileIn): boolean {
  return TEXT_EXTS.includes(x.ext)
}

/**
 * 取文件名的小写后缀(不带点)。没有点的文件名给空串 —— 那种一律走服务端解析。
 *
 * @param x 文件名。
 * @returns 小写后缀;没有后缀时给空串。
 */
export function extOf(x: ExtOfIn): string {
  const at = x.name.lastIndexOf(EXT_SEP)
  if (at < 0) {
    return TEXT_NONE
  }
  return x.name.slice(at + 1).toLowerCase()
}

/**
 * 送服务端抽纯文本(E11-07 的解析器,原件内存即弃不落盘)。抽不出来就按错误码说实话:
 * 扫描件让他直接粘贴、超大让他换文件,别笼统报一句「稍后再试」。
 *
 * @param x 选中的文件、取词函数与两个落格。
 * @returns 无。
 */
async function extractFile(x: ExtractFileIn): Promise<void> {
  const fd = new FormData()
  fd.append(FIELD_FILE, x.file)
  let d: ExtractRespJson | null = null
  try {
    const r = await fetch(URL_EXTRACT, { method: METHOD_POST, credentials: CRED_INCLUDE, body: fd })
    d = await r.json() as ExtractRespJson
  } catch {
    d = null
  }
  if (d != null && d.text != null && d.text !== TEXT_NONE) {
    x.setResume(d.text)
    return
  }
  let code = TEXT_NONE
  if (d != null && d.error != null) {
    code = d.error
  }
  x.setErr(x.t(fileErrKeyOf({ code })))
}

/**
 * 抽文本接口的错误码 → 文案键。
 *
 * @param x 接口给的错误码。
 * @returns 文案键;码不认识时给兜底键。
 */
export function fileErrKeyOf(x: ErrKeyIn): string {
  const key = FILE_ERR_KEY[x.code]
  if (key == null) {
    return FILE_ERR_KEY_DEFAULT
  }
  return key
}

/**
 * 造对照钮的点击手柄(埋点在真身里打:每次调用都要数得清,#102 账单教训)。
 *
 * @param x 取词函数、这个岗的两格、简历正文、语言、存档勾选与三个落格。
 * @returns 点击手柄。
 */
export function makeRun(x: RunIn): ClickFn {
  return function onRun(): void {
    void runMatch(x)
  }
}

/**
 * makeRun 的真身(async;外壳只把 Promise 收掉)。成败都要把忙碌位放下来 ——
 * 卡在忙碌态的钮点不动,用户以为页面死了。
 *
 * @param x 同 makeRun 的入参。
 * @returns 无。
 */
async function runMatch(x: RunIn): Promise<void> {
  x.setBusy(true)
  x.setErr(TEXT_NONE)
  track(EV_MATCH_RUN)
  let d: MatchRespJson | null = null
  try {
    const r = await fetch(URL_MATCH, {
      method: METHOD_POST,
      credentials: CRED_INCLUDE,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: matchBodyOf({ jobId: x.jobId, jd: x.jd, resume: x.resume, lang: x.lang, save: x.save }),
    })
    d = await r.json() as MatchRespJson
  } catch {
    d = null
  }
  if (d != null && d.error == null && d.visible != null) {
    x.setRes(toMatchFact({ json: d }))
    x.setBusy(false)
    return
  }
  let code = TEXT_NONE
  if (d != null && d.error != null) {
    code = d.error
  }
  x.setErr(x.t(matchErrKeyOf({ code })))
  x.setBusy(false)
}

/**
 * 拼对照请求的 JSON 体。
 *
 * @param x 这个岗的两格、简历正文、语言与存档勾选。
 * @returns 序列化好的请求体。
 */
export function matchBodyOf(x: MatchBodyIn): string {
  return JSON.stringify({ jobId: x.jobId, jd: x.jd, resume: x.resume, lang: x.lang, save: x.save })
}

/**
 * 对照接口的错误码 → 文案键。每个错误码说自己的实话(2026-08-03 Frank 实撞:
 * noJd 被笼统报成「稍后再试」,而重试根本没用)。
 *
 * @param x 接口给的错误码。
 * @returns 文案键;码不认识时给兜底键(那多半是上游抽风,重试可能有用)。
 */
export function matchErrKeyOf(x: ErrKeyIn): string {
  const key = MATCH_ERR_KEY[x.code]
  if (key == null) {
    return MATCH_ERR_KEY_DEFAULT
  }
  return key
}

/**
 * 把对照接口的响应洗成整份展示结果:缺席的数字按 0 读、缺席的重写建议按空串读
 * (免费档本来就不生成),剩余次数保住 null —— 付费档不限次,那一行整个不出。
 *
 * @param x 对照接口的响应体。
 * @returns 洗净的整份对照结果。
 */
export function toMatchFact(x: ToMatchFactIn): MatchFact {
  const rows: MatchRowFact[] = []
  let i = 0
  if (x.json.visible != null) {
    for (const row of x.json.visible) {
      rows.push(toMatchRow({ row, index: i }))
      i = i + 1
    }
  }
  let lockedN = 0
  if (x.json.lockedN != null) {
    lockedN = x.json.lockedN
  }
  let hitN = 0
  if (x.json.hitN != null) {
    hitN = x.json.hitN
  }
  let total = 0
  if (x.json.total != null) {
    total = x.json.total
  }
  let rewrite = TEXT_NONE
  if (x.json.rewrite != null) {
    rewrite = x.json.rewrite
  }
  let left: number | null = null
  if (x.json.left != null) {
    left = x.json.left
  }
  let saved = false
  if (x.json.saved === true) {
    saved = true
  }
  return { rows, lockedN, hitN, total, rewrite, left, saved }
}

/**
 * 把线上的一条要求洗成展示行:记号与色档类在这里算完,单元格组件只管渲。
 *
 * @param x 线上那一条与它的名次。
 * @returns 一条展示行。
 */
export function toMatchRow(x: ToMatchRowIn): MatchRowFact {
  let req = TEXT_NONE
  if (x.row.req != null) {
    req = x.row.req
  }
  let note = TEXT_NONE
  if (x.row.note != null) {
    note = x.row.note
  }
  let mark = MISS_MARK
  let cls = cssOf(css.miss)
  if (x.row.hit === true) {
    mark = HIT_MARK
    cls = cssOf(css.hit)
  }
  return { key: String(x.index), req, text: mark + note, cls }
}
