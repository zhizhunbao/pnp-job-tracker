/**
 * 投递框求职信页的行为:信的单选项(这一岗的草稿、上传的、改写的、不附)、改信、
 * 上传求职信抽字、按职位改写(不是 Pro 弹升级框,Pro 开对照框)。
 * 2026-10-10 Frank「大于 1000 就 拆 子桶」:apply 桶首个子桶。父桶 functions.ts 超 1000 行,按关注点切出求职信页这一族
 * (信的单选项、上传求职信抽字、按职位改写);依赖只许父桶 → 子桶(经本目录 index.ts),子桶不取父桶任何东西,
 * 要用的常量各自抄、形状本桶自声明。求职信页与对照框两个 tsx 仍住父桶(它们拼父桶的分区卡、单选行与样式)。
 * 同日 Frank「两处都改吧」:单选项不再列给别的岗写过的信(信里是别家公司名),只列这一岗的草稿、本次在框里上传 / 改写的、
 * 不附求职信 —— 拉写过的信那一族(loadLetters / pastOptsOf、信清单接口地址、「写于」小注与键头、两格 past 状态)撤回。
 *
 * @author Frank
 * @time 2026-10-10 18:00:00
 */
import { coverFileOf, coverNormOf } from '@/lib/apply'
import {
  CRED_INCLUDE, DRAFT_SUB_KEY, ERR_CODES, ERR_KEY_HEAD, ERR_KEY_UPLOAD, ERR_KEY_WRITE, ERR_NONE, E_PRO, FIELD_FILE,
  HDR_CONTENT_TYPE, METHOD_POST, MIME_JSON, OPT_AI, OPT_DRAFT, OPT_NONE, OPT_UP_HEAD, REWRITE_KEY,
  TEXT_NONE, UPLOADED_KEY, URL_EXTRACT, URL_LETTER,
} from './constants'
import type {
  ExtractJson, LetterCells, LetterJson, LetterOpt, LetterPickOfFn, LetterStart, LetterUploadIn,
  OptsTextIn, PickOptIn,
} from './types'

/**
 * 造改信的手柄(2026-10-10:选中那一项的正文跟着改,换项再回来还在)。
 *
 * @param c 整机的可变格。
 * @returns 文本框 onChange。
 */
export function makeLetterChange(c: LetterCells): (e: React.ChangeEvent<HTMLTextAreaElement>) => void {
  return function onLetter(e: React.ChangeEvent<HTMLTextAreaElement>): void {
    c.setLetter(e.target.value)
    c.setMine(optsWithTextOf({ opts: c.mine, key: c.pick, text: e.target.value }))
  }
}

/**
 * 换掉某一项的正文。
 *
 * @param x 几项、哪一项与新正文。
 * @returns 换好的几项。
 */
export function optsWithTextOf(x: OptsTextIn): LetterOpt[] {
  const out: LetterOpt[] = []
  for (const o of x.opts) {
    if (o.key === x.key) {
      out.push({ key: o.key, name: o.name, subKey: o.subKey, subAt: o.subAt, text: x.text })
    } else {
      out.push(o)
    }
  }
  return out
}

/**
 * 起始的「这一岗」几项:草稿里有信就是一项,没有就空。
 *
 * @param s 起始态。
 * @returns 几项。
 */
export function draftOptsOf(s: LetterStart): LetterOpt[] {
  if (s.cover.trim() === TEXT_NONE) {
    return []
  }
  return [{ key: OPT_DRAFT, name: coverFileOf(s.job.company), subKey: DRAFT_SUB_KEY, subAt: TEXT_NONE, text: s.cover }]
}

/**
 * 起始选中哪一项:这一岗草稿里有信就选它,没有就「不附求职信」(10-10 Frank:没传过求职信的默认不附)。
 *
 * @param cover 草稿里的信。
 * @returns 选项键。
 */
export function firstPickOf(cover: string): string {
  if (cover.trim() === TEXT_NONE) {
    return OPT_NONE
  }
  return OPT_DRAFT
}

/**
 * 造「选求职信某一项」的手柄工厂。
 *
 * @param c 整机的可变格。
 * @returns 按项造手柄的工厂。
 */
export function makeLetterPickOf(c: LetterCells): LetterPickOfFn {
  return function letterPickOf(o: LetterOpt): () => void {
    return function pickLetter(): void {
      pickOpt({ cells: c, opt: o, put: false })
    }
  }
}

/**
 * 选中一项:信换成它的正文、收起就地改、清掉提示;新写的 / 新传的顺带放进「这一岗」几项(同键换掉,没有就排最前)。
 *
 * @param x 整机的可变格、那一项与要不要放进去。
 * @returns 无。
 */
function pickOpt(x: PickOptIn): void {
  if (x.put) {
    const mine: LetterOpt[] = [x.opt]
    for (const o of x.cells.mine) {
      if (o.key !== x.opt.key) {
        mine.push(o)
      }
    }
    x.cells.setMine(mine)
  }
  x.cells.setPick(x.opt.key)
  x.cells.setLetter(x.opt.text)
  x.cells.setEditing(false)
  x.cells.setErr(ERR_NONE)
}



/**
 * 造求职信卡头「按职位改写」:不是 Pro 弹升级框(不设试用);Pro 开三栏对照框、按这一岗写一封。
 *
 * @param c 整机的可变格。
 * @returns 点击手柄。
 */
export function makeLetterRewrite(c: LetterCells): () => void {
  return function onLetterRewrite(): void {
    if (c.pro === false) {
      c.setUpsell(true)
      return
    }
    void rewrite(c)
  }
}

/**
 * 造简历卡头「按职位改写」:不是 Pro 弹升级框;Pro 出「即将上线」(本批只做求职信的改写)。
 *
 * @param c 整机的可变格。
 * @returns 点击手柄。
 */
export function makeResumeRewrite(c: LetterCells): () => void {
  return function onResumeRewrite(): void {
    if (c.pro === false) {
      c.setUpsell(true)
      return
    }
    c.setSoon(true)
  }
}

/**
 * 按这一岗的 JD 与选用的简历写一封,摆进对照框(原来的 = 点改写那一刻的信;写不成框里出一行原因)。
 *
 * @param c 整机的可变格。
 * @returns 无。
 */
async function rewrite(c: LetterCells): Promise<void> {
  const before = c.letter
  c.setRw({ busy: true, before, jd: TEXT_NONE, after: TEXT_NONE, err: ERR_NONE })
  let got: LetterJson = {}
  try {
    const r = await fetch(URL_LETTER, {
      method: METHOD_POST,
      credentials: CRED_INCLUDE,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: JSON.stringify({ jobId: c.job.id, resumeId: c.resumeId, senderName: c.name.trim() }),
    })
    got = await r.json() as LetterJson
  } catch {
    got = {}
  }
  if (got.error === E_PRO) {
    c.setRw(null)
    c.setUpsell(true)
    return
  }
  if (got.ai !== true || typeof got.text !== 'string') {
    c.setRw({ busy: false, before, jd: TEXT_NONE, after: TEXT_NONE, err: writeErrOf(got) })
    return
  }
  let jd = TEXT_NONE
  if (typeof got.jd === 'string') {
    jd = got.jd
  }
  c.setRw({ busy: false, before, jd, after: got.text, err: ERR_NONE })
}

/**
 * 写信接口的失败 → 词条键(署名 / 简历 / 限额照接口的码,其余一律「没写成」)。
 *
 * @param got 回包。
 * @returns 词条键。
 */
function writeErrOf(got: LetterJson): string {
  if (typeof got.error === 'string' && ERR_CODES.includes(got.error)) {
    return ERR_KEY_HEAD + got.error
  }
  return ERR_KEY_WRITE
}

/**
 * 造对照框「用这一版」:改写后的那封成一项(附件名同这一岗)、选中、关框。
 *
 * @param c 整机的可变格。
 * @returns 点击手柄。
 */
export function makeRwUse(c: LetterCells): () => void {
  return function onRwUse(): void {
    if (c.rw == null) {
      return
    }
    const name = coverFileOf(c.job.company)
    const opt = { key: OPT_AI, name, subKey: REWRITE_KEY, subAt: TEXT_NONE, text: c.rw.after }
    pickOpt({ cells: c, opt, put: true })
    c.setRw(null)
  }
}

/**
 * 传一封求职信(父桶的文件框 onChange 调):走简历抽字那个接口(不另建表),抽出来的字成新的一项并选中;抽不成给「上传没成功」。
 *
 * @param x 整机的可变格与文件。
 * @returns 无。
 */
export async function uploadLetter(x: LetterUploadIn): Promise<void> {
  const c = x.cells
  c.setLetterBusy(true)
  c.setErr(ERR_NONE)
  const form = new FormData()
  form.append(FIELD_FILE, x.file)
  let got: ExtractJson = {}
  try {
    const r = await fetch(URL_EXTRACT, { method: METHOD_POST, credentials: CRED_INCLUDE, body: form })
    got = await r.json() as ExtractJson
  } catch {
    got = {}
  }
  c.setLetterBusy(false)
  if (typeof got.text !== 'string') {
    c.setErr(ERR_KEY_UPLOAD)
    return
  }
  const at = new Date().toISOString()
  const opt = { key: OPT_UP_HEAD + at, name: x.file.name, subKey: UPLOADED_KEY, subAt: at, text: coverNormOf(got.text) }
  pickOpt({ cells: c, opt, put: true })
}
