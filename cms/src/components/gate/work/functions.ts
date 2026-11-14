/**
 * gate 桶子桶 work 的行为:档案表单「做过的工作」几段 —— 起头(档案里的几段或老的职业码 → 几段)、存档(几段 → 工作经历与职业码)、
 * 改一格 / 加一段 / 删一段、给某一段选职业。
 * 2026-11-12 Frank「右侧弹 sidebar 用户一项一项填,能搜索的就弹框搜索,最后用 sonnet 生成简历」:「做过的工作」原先只是一串职业码,
 * 生成简历缺公司、时间和做了什么;改成一段一个框,职位匹配读的职业码由各段汇出。依赖只许父桶 → 子桶(经本目录 index.ts)。
 *
 * @author Frank
 * @time 2026-11-12 16:00:00
 */
import { shortOcc } from '@/components/quiz'
import {
  K_WORK_NOW, TEXT_NONE, WORK_AT_NONE, WORK_DESC_LEN, WORK_F_CITY, WORK_F_DESC, WORK_F_FROM, WORK_F_ORG,
  WORK_F_TITLE,
  WORK_F_TO,
  WORK_LINE_LEN, WORK_NAME_WAIT, WORK_NOCS_MAX,
  WORK_ROWS_MAX, WORK_SUM_SEP, WORK_YM_BAD_RE, WORK_YM_LEN,
  WORK_YM_RE, WORK_YM_SEP,
} from './constants'
import type {
  WorkCellPickIn, WorkCellSetIn, WorkFillIn, WorkFillOut,
  WorkLine, WorkLinesIn, WorkMatchIn, WorkMergedIn, WorkNamesIn, WorkOccIn, WorkOccOpenIn, WorkPick,
  WorkRowsIn, WorkSeedIn, WorkSumIn,
} from './types'

/**
 * 空的一段。
 *
 * @returns 空段。
 */
function workBlankOf(): WorkPick {
  const s = TEXT_NONE
  return { nocs: [], title: s, org: s, city: s, from: s, to: s, desc: s }
}

/**
 * 一串职业码 → 一码一段(别的格空着;老档案起头与「从简历填写」用)。
 *
 * @param codes 职业码。
 * @returns 几段。
 */
export function workRowsFromCodes(codes: string[]): WorkPick[] {
  const out: WorkPick[] = []
  for (const code of codes.slice(0, WORK_ROWS_MAX)) {
    out.push(Object.assign(workBlankOf(), { nocs: [code] }))
  }
  return out
}

/**
 * 「从简历填写」把提取到的工作经历填进几段(2026-11-12 Frank「都改完」):只填空着的 —— 现有几段里哪怕有一格明细
 * (职位名称、公司、城市、起止年月、做了什么)是用户填过的,就一格不动。都没填过时:提取到了几段就用它们
 * (每段带公司、时间和职责),原来只挂了职业、且那个职业不在提取结果里的段接在后面;没提取到几段、现有各段也没挂职业,
 * 就按提取到的职业码一码一段。
 *
 * @param x 现在的几段、提取到的几段与提取到的职业码。
 * @returns 填过之后的几段、填上了没有与这一次带进来的职业码。
 */
export function workFilledOf(x: WorkFillIn): WorkFillOut {
  for (const r of x.rows) {
    if (r.title + r.org + r.city + r.from + r.to + r.desc !== TEXT_NONE) {
      return { rows: x.rows, filled: false, codes: [] }
    }
  }
  if (x.jobs.length > 0) {
    const rows = workListOf(x.jobs)
    const codes = workNocsOf(rows)
    for (const r of x.rows) {
      const fresh = r.nocs.length > 0 && r.nocs.every(function isNew(n: string): boolean {
        return codes.includes(n) === false
      })
      if (fresh && rows.length < WORK_ROWS_MAX) {
        rows.push(r)
      }
    }
    return { rows, filled: rows.length > 0, codes }
  }
  if (workNocsOf(x.rows).length === 0 && x.codes.length > 0) {
    return { rows: workRowsFromCodes(x.codes), filled: true, codes: x.codes }
  }
  return { rows: x.rows, filled: false, codes: [] }
}

/**
 * 档案里的工作经历 → 表单起头的几段:存过几段按几段;没存过、只有老的职业码就一码一段;都没有给一个空段(界面总有一框可填)。
 *
 * @param x 档案里的几段与职业码。
 * @returns 几段。
 */
export function workFormRowsOf(x: WorkSeedIn): WorkPick[] {
  let out: WorkPick[] = []
  for (const w of x.list) {
    out.push({ nocs: w.nocs.slice(), title: w.title, org: w.org, city: w.city, from: w.from, to: w.to, desc: w.desc })
  }
  if (out.length === 0) {
    out = workRowsFromCodes(x.nocs)
  }
  if (out.length === 0) {
    out.push(workBlankOf())
  }
  return out
}

/**
 * 界面上的几段 → 要存的工作经历:各格去首尾空白;年月不合形的不存;七格全空的段不存;至多 WORK_ROWS_MAX 段。
 *
 * @param rows 几段。
 * @returns 工作经历。
 */
export function workListOf(rows: WorkPick[]): WorkPick[] {
  const out: WorkPick[] = []
  for (const r of rows) {
    const w: WorkPick = {
      nocs: r.nocs.slice(),
      title: r.title.trim(),
      org: r.org.trim(),
      city: r.city.trim(),
      from: workYmOf(r.from),
      to: workYmOf(r.to),
      desc: r.desc.trim(),
    }
    const text = w.title + w.org + w.city + w.from + w.to + w.desc
    if ((w.nocs.length > 0 || text !== TEXT_NONE) && out.length < WORK_ROWS_MAX) {
      out.push(w)
    }
  }
  return out
}

/**
 * 存档时的年月:合形才留,否则空串。
 *
 * @param v 输入框里的字。
 * @returns 年月或空串。
 */
function workYmOf(v: string): string {
  const s = v.trim()
  if (WORK_YM_RE.test(s)) {
    return s
  }
  return TEXT_NONE
}

/**
 * 几段 → 做过的工作(职业码,按段的先后,重复的只留一个;职位匹配读它)。
 *
 * @param rows 几段。
 * @returns 职业码。
 */
export function workNocsOf(rows: WorkPick[]): string[] {
  const out: string[] = []
  for (const r of rows) {
    for (const n of r.nocs) {
      if (out.includes(n) === false) {
        out.push(n)
      }
    }
  }
  return out
}

/**
 * 造「改某段某格」的手柄。
 *
 * @param x 第几段哪一格、现在的几段与落格。
 * @returns 输入框的 onChange。
 */
export function makeWorkCell(x: WorkCellPickIn): (v: string) => void {
  return function pickWorkCell(v: string): void {
    const out: WorkPick[] = []
    for (const [i, r] of x.rows.entries()) {
      if (i !== x.cell.i) {
        out.push(r)
      } else {
        out.push(workCellSetOf({ row: r, f: x.cell.f, v }))
      }
    }
    x.setRows(out)
  }
}

/**
 * 一段改一格:一行字的格截到上限;年月只留数字和连字符。
 *
 * @param x 这一段、哪一格与新值。
 * @returns 改过的一段。
 */
function workCellSetOf(x: WorkCellSetIn): WorkPick {
  const out: WorkPick = Object.assign({}, x.row)
  if (x.f === WORK_F_TITLE) {
    out.title = x.v.slice(0, WORK_LINE_LEN)
  }
  if (x.f === WORK_F_ORG) {
    out.org = x.v.slice(0, WORK_LINE_LEN)
  }
  if (x.f === WORK_F_CITY) {
    out.city = x.v.slice(0, WORK_LINE_LEN)
  }
  if (x.f === WORK_F_FROM) {
    out.from = x.v.replace(WORK_YM_BAD_RE, TEXT_NONE).slice(0, WORK_YM_LEN)
  }
  if (x.f === WORK_F_TO) {
    out.to = x.v.replace(WORK_YM_BAD_RE, TEXT_NONE).slice(0, WORK_YM_LEN)
  }
  if (x.f === WORK_F_DESC) {
    out.desc = x.v.slice(0, WORK_DESC_LEN)
  }
  return out
}

/**
 * 造「+ 再加一段」(新的一段加在最前:简历上新的在前)。
 *
 * @param x 现在的几段与落格。
 * @returns 点击手柄。
 */
export function makeWorkAdd(x: WorkRowsIn): () => void {
  return function addWork(): void {
    x.setRows([workBlankOf()].concat(x.rows))
  }
}

/**
 * 造「删第几段」(只剩一段时清空那一段,界面总留一框)。
 *
 * @param x 现在的几段、落格与第几段。
 * @returns 点击手柄。
 */
export function makeWorkRemove(x: WorkRowsIn): () => void {
  return function removeWork(): void {
    const out: WorkPick[] = []
    for (const [i, r] of x.rows.entries()) {
      if (i !== x.i) {
        out.push(r)
      }
    }
    if (out.length === 0) {
      out.push(workBlankOf())
    }
    x.setRows(out)
  }
}

/**
 * 造「点某一段的选职业」的手柄工厂:记下正在给第几段选(框随之开),并把选职业控件里已选的码换成这一段的。
 *
 * @param x 现在的几段、落格与控件的整份替换口。
 * @returns 第几段 → 点击手柄。
 */
export function makeWorkOccOpenOf(x: WorkOccOpenIn): (i: number) => () => void {
  return function workOccOpenOf(i: number): () => void {
    return function openWorkOcc(): void {
      const row = x.rows[i]
      if (row != null) {
        x.onReplace(row.nocs)
        x.setAt(i)
      }
    }
  }
}

/**
 * 造「选职业框里点了一个职业」的手柄:一段只挂一个职业 —— 新点上的码整份替掉这一段原来的(同一个职业的几个码一起来),
 * 选上就关框;点掉已选的 = 这一段不挂职业,框不关。一次点上来的码多过 WORK_NOCS_MAX(点了「全选」)这一下不算,这一段不动。
 *
 * @param x 现在的几段、落格、正在给第几段选与它的落格。
 * @returns 选职业控件的 onChange。
 */
export function makeWorkOcc(x: WorkOccIn): (next: string[]) => void {
  return function pickWorkOcc(next: string[]): void {
    const out: WorkPick[] = []
    let picked = false
    for (const [i, r] of x.rows.entries()) {
      if (i !== x.at) {
        out.push(r)
      } else {
        const fresh: string[] = []
        for (const n of next) {
          if (r.nocs.includes(n) === false) {
            fresh.push(n)
          }
        }
        picked = fresh.length > 0 && fresh.length <= WORK_NOCS_MAX
        let nocs = r.nocs
        if (picked) {
          nocs = fresh
        } else if (fresh.length === 0) {
          nocs = next
        }
        out.push(Object.assign({}, r, { nocs }))
      }
    }
    x.setRows(out)
    if (picked) {
      x.setAt(WORK_AT_NONE)
    }
  }
}

/**
 * 造「关选职业框」。
 *
 * @param setAt 「正在给第几段选」的落格。
 * @returns 点击手柄。
 */
export function makeWorkOccClose(setAt: (v: number) => void): () => void {
  return function closeWorkOcc(): void {
    setAt(WORK_AT_NONE)
  }
}

/**
 * 各段职业那一格的字(2026-11-12):这一段挂的第一个码在名字表里的短名;没选职业、名字还没取到 = 空串。
 *
 * @param x 几段与名字表。
 * @returns 与几段一一对应的字。
 */
export function workNamesOf(x: WorkNamesIn): string[] {
  const out: string[] = []
  for (const r of x.rows) {
    let name: string = TEXT_NONE
    const head = r.nocs[0]
    if (head != null) {
      const got = x.titles[head]
      if (got != null && got !== TEXT_NONE) {
        name = shortOcc(got)
      }
    }
    out.push(name)
  }
  return out
}

/**
 * 做过的工作 → 摘要行:一段一行,什么都没填的段不出;职业从简历来的挂「来自简历」。
 * 2026-11-13 Frank「一起修」(起因:他档案里三段只有职业、没有公司和时间,摘要成了三行一模一样的「软件开发」):
 * 字一样的几行合成一行,后面写「N 段」(见 workMergedOf)。
 * 同日 Frank「这个三段是什么意思」:「N 段」看不懂,撤 —— 字一样的只出一行,不写段数。
 * 同日 Frank「中国的职业和加拿大的职业名字不一样怎么办」→「做」:修改档案里一段两行 —— 用户自己的职位名称黑字,
 * 它对上的加拿大职业全名灰字(见 workMatchLineOf);公司、起止年月不在档案里出。生成简历弹框照旧一行连排(full)。
 * 同日 Frank「来自简历不是删掉吗」:这一格不再挂「来自简历」胶囊(每行都挂一样的一颗,只添乱),上面第一句的后半句作废;
 * 判这一段是不是从简历来的那只函数随之删。档案里记的标记本身照旧存着,只是这里不显示。
 *
 * @param x 几段、各段职业的字、标记与取词。
 * @returns 摘要行。
 */
export function workLinesOf(x: WorkLinesIn): WorkLine[] {
  const out: WorkLine[] = []
  for (const [i, row] of x.rows.entries()) {
    let occ: string = TEXT_NONE
    const got = x.names[i]
    if (got != null) {
      occ = got
    }
    if (occ === TEXT_NONE && row.nocs.length > 0) {
      occ = WORK_NAME_WAIT
    }
    let line: WorkLine = { key: String(i), name: workSumOf({ row, name: occ, t: x.t }), sub: TEXT_NONE, from: false }
    if (x.full === false) {
      line = workMatchLineOf({ row, key: String(i), titles: x.titles })
    }
    if (line.name !== TEXT_NONE) {
      out.push(line)
    }
  }
  return workMergedOf({ lines: out })
}

/**
 * 修改档案里一段工作的两行:职位名称(用户自己的叫法)黑字在上,它对上的加拿大职业全名灰字在下;
 * 没填职位名称的,职业全名顶上来当黑字、不出灰字;选了职业但名字还没取到先占位。两样都没有 = 空行(不出)。
 * 2026-11-13 Frank「中文格式都用 中文」「做过工作 用 加拿大的工作来表示吧,然后灰字用从简历里提取的工作」:两行对调 ——
 * 加拿大职业(界面语的名字)黑字在上,职位名称灰字在下;没挂职业的段,职位名称顶上来当黑字。上面第一句的上下作废。
 *
 * @param x 这一段、行键与名字表。
 * @returns 一行。
 */
function workMatchLineOf(x: WorkMatchIn): WorkLine {
  let occ: string = TEXT_NONE
  const head = x.row.nocs[0]
  if (head != null) {
    occ = WORK_NAME_WAIT
    const got = x.titles[head]
    if (got != null && got !== TEXT_NONE) {
      occ = got
    }
  }
  const title = x.row.title.trim()
  if (occ === TEXT_NONE) {
    return { key: x.key, name: title, sub: TEXT_NONE, from: false }
  }
  return { key: x.key, name: occ, sub: title, from: false }
}

/**
 * 字一样(黑字、灰字都一样)的摘要行只出一行:留头一次出现的位置与行键。
 * 2026-11-13 Frank「两个软件开发吗」(起因:从简历填写带进「软件开发 / Java Developer」后,他原来存的那段只有职业的
 * 「软件开发」还单独占一行):同一个黑字已经有带灰字的行时,不带灰字的那行不出 —— 它没有多说任何东西。
 *
 * @param x 一段一行的摘要行。
 * @returns 合过的摘要行。
 */
function workMergedOf(x: WorkMergedIn): WorkLine[] {
  const titled: string[] = []
  for (const l of x.lines) {
    if (l.sub !== TEXT_NONE) {
      titled.push(l.name)
    }
  }
  const out: WorkLine[] = []
  const seen: string[] = []
  for (const l of x.lines) {
    const id = l.name + WORK_SUM_SEP + l.sub
    const bare = l.sub === TEXT_NONE && titled.includes(l.name)
    if (bare === false && seen.includes(id) === false) {
      seen.push(id)
      out.push(l)
    }
  }
  return out
}

/**
 * 一段工作经历的摘要:职位名称(没填用职业的字)、公司、起止年月里填了的连成一行;结束空着而开始填了写「至今」。
 *
 * @param x 这一段、职业的字与取词。
 * @returns 摘要;什么都没填 = 空串。
 */
function workSumOf(x: WorkSumIn): string {
  const r = x.row
  let head = r.title.trim()
  if (head === TEXT_NONE) {
    head = x.name
  }
  let when = r.from.trim()
  if (when !== TEXT_NONE) {
    let to = r.to.trim()
    if (to === TEXT_NONE) {
      to = x.t(K_WORK_NOW)
    }
    when = when + WORK_YM_SEP + to
  }
  const picked: string[] = []
  for (const s of [head, r.org.trim(), when]) {
    if (s !== TEXT_NONE) {
      picked.push(s)
    }
  }
  return picked.join(WORK_SUM_SEP)
}
