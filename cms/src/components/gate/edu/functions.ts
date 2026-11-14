/**
 * gate 桶子桶 edu 的行为:档案表单「教育经历」几段 —— 起头(答案档的明细或老串 → 几段)、存档(几段 → 明细与教育经历串)、
 * 改一格 / 加一段 / 删一段、三只下拉的选项字、把简历里提取到的教育经历并进几段。
 * 2026-11-12 按「大于 1000 就拆子桶」(样张 apply/letter):gate 的 functions.ts 到 981 行贴线,按关注点切出教育经历几段这一族
 * (函数与注释原样搬来);依赖只许父桶 → 子桶(经本目录 index.ts),子桶不取父桶任何东西,要用的常量各自抄、形状本桶自声明。
 * 教育经历题的两个 tsx(GateEdu / GateEduLine)仍住父桶(它们拼父桶的整机与样式)。
 * 同日 Frank「有年份 还需要时长吗」「简历里能抽出来吧」:三只下拉留着(通道资格要用),但能不让人手选就不让 ——
 * 简历提取多带院校所在地、公立私立、课程时长,并进一段时只填那一段还空着的下拉;手填名称或年份时,时长空着就替他推一个。
 *
 * @author Frank
 * @time 2026-11-12 10:00:00
 */
import { eduRowsOf } from '@/lib/pathways'
import {
  EDU_ABROAD, EDU_AT_NONE, EDU_CRED_LEN, EDU_F_CRED, EDU_F_FROM, EDU_F_KIND, EDU_F_LEN, EDU_F_PROV, EDU_F_SCHOOL,
  EDU_F_TO,
  EDU_KINDS, EDU_LEN_MASTER, EDU_LEN_Y1, EDU_LEN_Y2, EDU_LEN_Y3, EDU_LENS, EDU_LIST_MAX, EDU_MASTER_RE,
  EDU_NON_DIGIT_RE, EDU_PROVS, EDU_SCHOOL_LEN, EDU_SEP, EDU_SPAN_Y1, EDU_SPAN_Y2, EDU_STOP_WORDS,
  EDU_WORD_ALIAS, EDU_WORD_JOIN, EDU_WORD_SEP_RE, EDU_YEAR_LEN, EDU_YEAR_RE,
  GATE_ABROAD_KEY, K_KIND_HEAD, K_LEN_HEAD, K_PROV_HEAD, TEXT_NONE,
} from './constants'
import type {
  EduCellSetIn, EduEntry, EduItemIn, EduLabelIn, EduLenIn, EduMajorIn, EduMajorsIn, EduMergeIn, EduMergeOut, EduPick,
  EduPickIn, EduRowsIn, EduSameIn, EduSeedIn, EduSelIn, EduWordsIn, EduYearsIn,
} from './types'

/**
 * 答案档里的教育经历串 → 界面上的几段(拆法走 lib/pathways 的 eduRowsOf,与服务端推荐同一把尺;一段都没有给一个空段,界面总有一行可选)。
 *
 * @param strs 「所在地.公立私立.时长」串。
 * @returns 几段。
 */
export function eduPicksOf(strs: string[]): EduPick[] {
  const out: EduPick[] = []
  for (const r of eduRowsOf(strs)) {
    out.push(Object.assign(eduBlankOf(), { prov: r.prov, kind: r.kind, len: r.len }))
  }
  if (out.length === 0) {
    out.push(eduBlankOf())
  }
  return out
}

/**
 * 空的一段(三只下拉没选、四格明细没填)。
 *
 * @returns 空段。
 */
function eduBlankOf(): EduPick {
  const s = TEXT_NONE
  return { prov: s, kind: s, len: s, cred: s, school: s, from: s, to: s, major: s }
}

/**
 * 档案里的教育经历 → 表单起头的几段(2026-11-12):有明细按明细(key 拆回三只下拉);只有老的教育经历串就按串起头、明细全空。
 * 同日 Frank「教育经历 和 专业是不是重复了」:各段都还没挂专业的老档案,档案里的专业码按序落进各段(见 eduWithMajorsOf)。
 *
 * @param x 教育经历明细与教育经历串。
 * @returns 几段。
 */
export function eduFormRowsOf(x: EduSeedIn): EduPick[] {
  const out: EduPick[] = []
  for (const e of x.list) {
    for (const p of eduPicksOf([e.key])) {
      out.push({
        prov: p.prov, kind: p.kind, len: p.len, cred: e.cred, school: e.school, from: e.from, to: e.to, major: e.major,
      })
    }
  }
  if (out.length === 0) {
    return eduWithMajorsOf({ rows: eduPicksOf(x.strs), codes: x.majors })
  }
  return eduWithMajorsOf({ rows: out, codes: x.majors })
}

/**
 * 界面上的几段 → 答案档的教育经历明细(2026-11-12):三只下拉选全了才有 key;年份不是四位数字的不存;全空的段不存;至多 EDU_LIST_MAX 条。
 *
 * @param rows 几段。
 * @returns 教育经历明细。
 */
export function eduListOf(rows: EduPick[]): EduEntry[] {
  const out: EduEntry[] = []
  for (const r of rows) {
    const key = eduStrsOf([r]).join(TEXT_NONE)
    const e = {
      key, cred: r.cred.trim(), school: r.school.trim(), from: eduYearOf(r.from), to: eduYearOf(r.to), major: r.major,
    }
    if (e.key + e.cred + e.school + e.from + e.to + e.major !== TEXT_NONE && out.length < EDU_LIST_MAX) {
      out.push(e)
    }
  }
  return out
}

/**
 * 存档时的年份:四位数字才留,否则空串。
 *
 * @param v 输入框里的字。
 * @returns 年份或空串。
 */
function eduYearOf(v: string): string {
  if (EDU_YEAR_RE.test(v)) {
    return v
  }
  return TEXT_NONE
}

/**
 * 界面上的几段 → 存档串(只收三格都选了的段;选了一半的不存)。
 *
 * @param rows 几段。
 * @returns 「所在地.公立私立.时长」串。
 */
export function eduStrsOf(rows: EduPick[]): string[] {
  const out: string[] = []
  for (const r of rows) {
    if (r.prov !== TEXT_NONE && r.kind !== TEXT_NONE && r.len !== TEXT_NONE) {
      out.push(r.prov + EDU_SEP + r.kind + EDU_SEP + r.len)
    }
  }
  return out
}

/**
 * 造「改某段某格」的手柄。
 *
 * @param x 第几段哪一格、现在的几段与落格。
 * @returns 下拉的 onChange。
 */
export function makeEduPick(x: EduPickIn): (v: string) => void {
  return function pickEdu(v: string): void {
    const out: EduPick[] = []
    for (const [i, r] of x.edu.entries()) {
      if (i !== x.cell.i) {
        out.push(r)
      } else {
        out.push(eduCellSetOf({ row: r, f: x.cell.f, v }))
      }
    }
    x.setEdu(out)
  }
}

/**
 * 一段改一格。
 * 2026-11-12 Frank「简历里能抽出来吧」:改的是名称、开始年份或结束年份,而这一段的时长下拉还空着,就按名称与年份替他推一个
 * (推法见 eduLenOf);下拉一旦有值(推出来的或他自己选的)就再也不自动改。
 *
 * @param x 这一段、哪一格与新值。
 * @returns 改过的一段。
 */
function eduCellSetOf(x: EduCellSetIn): EduPick {
  const out: EduPick = Object.assign({}, x.row)
  if (x.f === EDU_F_PROV) {
    out.prov = x.v
  }
  if (x.f === EDU_F_KIND) {
    out.kind = x.v
  }
  if (x.f === EDU_F_LEN) {
    out.len = x.v
  }
  if (x.f === EDU_F_CRED) {
    out.cred = x.v.slice(0, EDU_CRED_LEN)
  }
  if (x.f === EDU_F_SCHOOL) {
    out.school = x.v.slice(0, EDU_SCHOOL_LEN)
  }
  if (x.f === EDU_F_FROM) {
    out.from = x.v.replace(EDU_NON_DIGIT_RE, TEXT_NONE).slice(0, EDU_YEAR_LEN)
  }
  if (x.f === EDU_F_TO) {
    out.to = x.v.replace(EDU_NON_DIGIT_RE, TEXT_NONE).slice(0, EDU_YEAR_LEN)
  }
  if (x.row.len === TEXT_NONE && (x.f === EDU_F_CRED || x.f === EDU_F_FROM || x.f === EDU_F_TO)) {
    out.len = eduLenOf({ cred: out.cred, from: out.from, to: out.to })
  }
  return out
}

/**
 * 按名称与起止年份推课程时长(2026-11-12 Frank「有年份 还需要时长吗」「简历里能抽出来吧」):名称里有 master / mba / phd /
 * doctor / doctorate 这样的整词(不分大小写)= 硕士及以上;否则两个年份都是四位数字时看相差几年 —— 0 或 1 年 = 一年以内,
 * 2 年 = 两年,3 年及以上 = 三年及以上;别的情况(年份没填全、结束早于开始)推不出,给空串。
 *
 * @param x 名称与起止年份。
 * @returns y1 / y2 / y3 / master;推不出空串。
 */
function eduLenOf(x: EduLenIn): string {
  if (EDU_MASTER_RE.test(x.cred)) {
    return EDU_LEN_MASTER
  }
  if (EDU_YEAR_RE.test(x.from) === false || EDU_YEAR_RE.test(x.to) === false) {
    return TEXT_NONE
  }
  const span = Number(x.to) - Number(x.from)
  if (span < 0) {
    return TEXT_NONE
  }
  if (span <= EDU_SPAN_Y1) {
    return EDU_LEN_Y1
  }
  if (span === EDU_SPAN_Y2) {
    return EDU_LEN_Y2
  }
  return EDU_LEN_Y3
}

/**
 * 造教育经历下拉的选项字:所在地 = 省名(国外单独一个词),公立私立 / 时长 = 各自词条。
 *
 * @param x 取词函数与哪一格。
 * @returns 选项值 → 显示字。
 */
export function makeEduLabel(x: EduLabelIn): (v: string) => string {
  return function eduLabel(v: string): string {
    if (x.f === EDU_F_PROV && v === EDU_ABROAD) {
      return x.t(GATE_ABROAD_KEY)
    }
    if (x.f === EDU_F_PROV) {
      return x.t(K_PROV_HEAD + v)
    }
    if (x.f === EDU_F_KIND) {
      return x.t(K_KIND_HEAD + v)
    }
    return x.t(K_LEN_HEAD + v)
  }
}

/**
 * 造「+ 再加一段」。
 *
 * @param x 现在的几段与落格。
 * @returns 点击手柄。
 */
export function makeEduAdd(x: EduRowsIn): () => void {
  return function addEdu(): void {
    x.setEdu(x.edu.concat([eduBlankOf()]))
  }
}

/**
 * 造「删第几段」(只剩一段时清空那一段,界面总留一行)。
 *
 * @param x 现在的几段、落格与第几段。
 * @returns 点击手柄。
 */
export function makeEduRemove(x: EduRowsIn): () => void {
  return function removeEdu(): void {
    const out: EduPick[] = []
    for (const [i, r] of x.edu.entries()) {
      if (i !== x.i) {
        out.push(r)
      }
    }
    if (out.length === 0) {
      out.push(eduBlankOf())
    }
    x.setEdu(out)
  }
}

/**
 * 从简历提取的教育经历并进表单的几段(2026-11-12):名称和学校都没有的不要;已有同名称同学校的一段(不分大小写)不再加,
 * 只补那一段还空着的下拉和年份(见 eduToppedOf),补上了也算并进去一条;
 * 否则放进第一段四格明细全空的(三只下拉照留),没有就在末尾加一段(到 EDU_LIST_MAX 段为止)。用户填过明细的段一格不动。
 * 2026-11-12 Frank「简历里能抽出来吧」:提取到的一条还带院校所在地、公立私立、课程时长,放进一段时只填那一段还空着的下拉,
 * 他选过的下拉不动(见 eduPlacedOf / eduSelOf)。
 *
 * @param x 现在的几段与提取到的几条。
 * @returns 并进去之后的几段与并进去了几条。
 */
export function eduMergedOf(x: EduMergeIn): EduMergeOut {
  let rows = x.rows
  let n = 0
  for (const it of x.items) {
    const named = it.credential.trim() !== TEXT_NONE || it.school.trim() !== TEXT_NONE
    if (named && isEduKnown({ rows, it })) {
      const topped = eduToppedOf({ rows, it })
      if (JSON.stringify(topped) !== JSON.stringify(rows)) {
        n++
      }
      rows = topped
    } else if (named) {
      rows = eduPlacedOf({ rows, it })
      if (isEduKnown({ rows, it })) {
        n++
      }
    }
  }
  return { rows, n }
}

/**
 * 表单里是不是已有同名称同学校的一段(去首尾空白、不分大小写)。
 * 2026-11-13:「同一段」怎么判收到 isEduSame 一处,这里和 eduToppedOf 都用它。
 *
 * @param x 现在的几段与提取到的一条。
 * @returns 已有 true。
 */
function isEduKnown(x: EduItemIn): boolean {
  for (const r of x.rows) {
    if (isEduSame({ row: r, it: x.it })) {
      return true
    }
  }
  return false
}

/**
 * 表单里的一段和提取到的一条是不是同一段教育经历(2026-11-13 Frank 截图:档案里同一段学历出现两次,只是写法不同 ——
 * 「Graduate Certificate in AI Software Development」与「AI Software Development (Graduate Certificate)」,
 * 「Bachelor of Engineering - Telecommunications Engineering」与只差横线的另一种写法;模型每次提取的名称写法不一样,
 * 逐字比就当成新的一段):学校名相等(去首尾空白、不分大小写),且名称的词一样(见 eduWordsOf,不管标点、虚词和先后)。
 * 不拿「同校同年份」当同一段 —— 同校同年读两个专业的人会被误合。
 * 同日 Frank 截图「还有重复」(档案里是「Bachelor of Engineering - Telecommunications Engineering」,换了一份简历后模型只提取出
 * 「Bachelor of Engineering」,又多加一段):名称的词不全一样时,一边的词全在另一边里(只是写得短一些),且两边的年份不冲突
 * (见 isEduYearOk),也算同一段;年份对不上的仍是两段(同校先后拿两个「Graduate Certificate」的人不误合)。
 *
 * @param x 表单里的一段与提取到的一条。
 * @returns 同一段 true。
 */
function isEduSame(x: EduSameIn): boolean {
  if (x.row.school.trim().toLowerCase() !== x.it.school.trim().toLowerCase()) {
    return false
  }
  const a = eduWordsOf(x.row.cred)
  const b = eduWordsOf(x.it.credential)
  if (a.join(EDU_WORD_JOIN) === b.join(EDU_WORD_JOIN)) {
    return true
  }
  if (a.length === 0 || b.length === 0) {
    return false
  }
  if (isEduWordsIn({ part: a, all: b }) === false && isEduWordsIn({ part: b, all: a }) === false) {
    return false
  }
  return isEduYearOk({ a: x.row.from, b: x.it.from }) && isEduYearOk({ a: x.row.to, b: x.it.to })
}

/**
 * 一串词是不是全在另一串里。
 *
 * @param x 短的那串与长的那串。
 * @returns 全在 true。
 */
function isEduWordsIn(x: EduWordsIn): boolean {
  for (const w of x.part) {
    if (x.all.includes(w) === false) {
      return false
    }
  }
  return true
}

/**
 * 两边的一个年份冲不冲突:有一边没填(或不是四位数字)不算冲突;两边都有就得相等。
 *
 * @param x 表单里那一段的年份与提取到的年份。
 * @returns 不冲突 true。
 */
function isEduYearOk(x: EduYearsIn): boolean {
  const a = eduYearOf(x.a)
  const b = eduYearOf(x.b)
  return a === TEXT_NONE || b === TEXT_NONE || a === b
}

/**
 * 证书或学历名称 → 拿来比的一串词:小写,按字母数字以外的字拆开,去掉虚词(EDU_STOP_WORDS)和重复的,排好序再连起来。
 * 缩写先展开成它代表的几个词再比(EDU_WORD_ALIAS:AI 与 Artificial Intelligence 算同一个说法)。
 * 2026-11-13:交出排好序的词(不再连成一串),isEduSame 还要拿它比「一边的词全在另一边里」。
 *
 * @param cred 证书或学历名称。
 * @returns 排好序的词;一个词都没有空列。
 */
function eduWordsOf(cred: string): string[] {
  const out: string[] = []
  for (const raw of cred.toLowerCase().split(EDU_WORD_SEP_RE)) {
    let words = [raw]
    const alias = EDU_WORD_ALIAS[raw]
    if (alias != null) {
      words = alias
    }
    for (const w of words) {
      if (w !== TEXT_NONE && EDU_STOP_WORDS.includes(w) === false && out.includes(w) === false) {
        out.push(w)
      }
    }
  }
  return out.sort()
}

/**
 * 已有同名称同学校的那一段:三只下拉和两个年份里还空着的,用提取到的值补上;填过的照留,名称和学校不动
 * (2026-11-12:11-12 上午那一版只抽名称、学校和年份,那时候填过的人再点一次「从简历填写」,下拉要能补上)。
 *
 * @param x 现在的几段与提取到的一条。
 * @returns 补过之后的几段。
 */
function eduToppedOf(x: EduItemIn): EduPick[] {
  const out: EduPick[] = []
  let done = false
  for (const r of x.rows) {
    if (done === false && isEduSame({ row: r, it: x.it })) {
      done = true
      let from = r.from
      if (from === TEXT_NONE) {
        from = eduYearOf(x.it.from)
      }
      let to = r.to
      if (to === TEXT_NONE) {
        to = eduYearOf(x.it.to)
      }
      const prov = eduSelOf({ have: r.prov, got: x.it.prov, opts: EDU_PROVS })
      const kind = eduSelOf({ have: r.kind, got: x.it.kind, opts: EDU_KINDS })
      const len = eduSelOf({ have: r.len, got: x.it.len, opts: EDU_LENS })
      out.push({ prov, kind, len, cred: r.cred, school: r.school, from, to, major: r.major })
    } else {
      out.push(r)
    }
  }
  return out
}

/**
 * 把提取到的一条放进几段:第一段四格明细全空的接住它(末尾先备一段空的,没用上不留;已到 EDU_LIST_MAX 段则不备)。
 * 2026-11-12 Frank「简历里能抽出来吧」:接住它的那一段,三只下拉里还空着的填上提取到的值;已经选了的照留。
 *
 * @param x 现在的几段与提取到的一条。
 * @returns 放过之后的几段。
 */
function eduPlacedOf(x: EduItemIn): EduPick[] {
  const out: EduPick[] = []
  let done = false
  for (const [i, r] of x.rows.concat([eduBlankOf()]).slice(0, EDU_LIST_MAX).entries()) {
    if (done === false && r.cred + r.school + r.from + r.to === TEXT_NONE) {
      done = true
      const cred = x.it.credential.trim().slice(0, EDU_CRED_LEN)
      const school = x.it.school.trim().slice(0, EDU_SCHOOL_LEN)
      const from = eduYearOf(x.it.from)
      const prov = eduSelOf({ have: r.prov, got: x.it.prov, opts: EDU_PROVS })
      const kind = eduSelOf({ have: r.kind, got: x.it.kind, opts: EDU_KINDS })
      const len = eduSelOf({ have: r.len, got: x.it.len, opts: EDU_LENS })
      out.push({ prov, kind, len, cred, school, from, to: eduYearOf(x.it.to), major: r.major })
    } else if (i < x.rows.length) {
      out.push(r)
    }
  }
  return out
}

/**
 * 一只下拉并进来之后的值(2026-11-12):这一段已经选了的照留;空着的才用提取到的值,且只认这只下拉的选项,别的当没有。
 *
 * @param x 这一段现在的值、提取到的值与这只下拉的选项。
 * @returns 下拉的值;没有空串。
 */
function eduSelOf(x: EduSelIn): string {
  if (x.have !== TEXT_NONE) {
    return x.have
  }
  if (x.opts.includes(x.got)) {
    return x.got
  }
  return TEXT_NONE
}

/**
 * 几段 → 档案的专业码(2026-11-12:专业并进教育经历的每一段,档案的专业由各段汇出):按段的先后,重复的只留一个。
 *
 * @param rows 几段。
 * @returns 专业码。
 */
export function eduMajorsOf(rows: EduPick[]): string[] {
  const out: string[] = []
  for (const r of rows) {
    if (r.major !== TEXT_NONE && out.includes(r.major) === false) {
      out.push(r.major)
    }
  }
  return out
}

/**
 * 把一串专业码落进几段(老档案起头与「从简历填写」用):只在各段都还没挂专业时才落 —— 已经有哪一段挂了专业,原样不动;
 * 按序一码一段,段不够的在末尾补空段(到 EDU_LIST_MAX 段为止,再多的不要)。
 * 2026-11-13 Frank「一起修」(起因:他档案里 Cloud Development 那段挂了「人工智能」、AI Software Development 那段挂了
 * 「云计算」—— 专业清单的先后和教育经历的先后不是一回事,按序套就套反了):不再猜哪个专业属于哪一段。
 * 只有一段教育经历时第一个码落给它(没得错配);有两段以上时现有各段原样不动。落不进现有段的码各占末尾一个空段
 * (只挂专业,让人自己挪),专业一个不丢;上面「按序一码一段」作废。
 *
 * @param x 现在的几段与专业码。
 * @returns 落过之后的几段。
 */
export function eduWithMajorsOf(x: EduMajorsIn): EduPick[] {
  if (x.codes.length === 0 || eduMajorsOf(x.rows).length > 0) {
    return x.rows
  }
  const out: EduPick[] = []
  let rest = x.codes
  const only = x.rows[0]
  const head = x.codes[0]
  if (x.rows.length === 1 && only != null && head != null) {
    out.push(Object.assign({}, only, { major: head }))
    rest = x.codes.slice(1)
  } else {
    for (const r of x.rows) {
      out.push(r)
    }
  }
  for (const code of rest) {
    if (out.length < EDU_LIST_MAX) {
      out.push(Object.assign({}, eduBlankOf(), { major: code }))
    }
  }
  return out
}

/**
 * 造「专业选择框里点了一个专业」的手柄:一段只挂一个专业 —— 新点上的码替掉这一段原来的,选上就关框;
 * 点掉已选的 = 这一段不挂专业,框不关。
 *
 * @param x 现在的几段、落格、正在给第几段选与它的落格。
 * @returns 专业选择器的 onChange。
 */
export function makeEduMajor(x: EduMajorIn): (next: string[]) => void {
  return function pickEduMajor(next: string[]): void {
    const out: EduPick[] = []
    let picked = false
    for (const [i, r] of x.rows.entries()) {
      if (i !== x.at) {
        out.push(r)
      } else {
        let major = TEXT_NONE
        for (const code of next) {
          if (code !== r.major) {
            major = code
            picked = true
          }
        }
        out.push(Object.assign({}, r, { major }))
      }
    }
    x.setRows(out)
    if (picked) {
      x.setAt(EDU_AT_NONE)
    }
  }
}
