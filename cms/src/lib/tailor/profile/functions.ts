/**
 * tailor 域子桶 profile 的行为:用档案生成基础简历 —— 档案 → 给模型的事实、够不够生成、模型回的内容洗净、
 * 事实与模型写的内容拼成排版用的草稿、额度账的记账号、模型文字清成 PDF 排得了的字。
 * 2026-11-12 Frank「右侧弹 sidebar 用户一项一项填,最后用 sonnet 生成简历,可以选择模板。这部分功能是收费的」。
 * 段数与起止年月只取档案里的(模型只管把字写成英文、把「做了什么」写成要点),模型多回的段不要、少回的段照档案原样出。
 * 全是纯函数,不连库不调模型(路由在父桶 routes.ts)。
 *
 * @author Frank
 * @time 2026-11-12 17:00:00
 */
import {
  BULLET_HEAD, BULLET_MAX, BULLETS_MAX, DASH_RE, DASHES_RE, DATE_LEN, DOTS, ELLIPSIS_RE, HYPHEN, LINE_MAX, LINE_SEP,
  NAME_SEP, NON_LATIN_RE, QUOTE1, QUOTE1_RE, QUOTE2, QUOTE2_RE, REF_SIGN, SCHEMA_ARRAY, SCHEMA_EDU_KEYS, SCHEMA_OBJECT,
  SCHEMA_STRING, SCHEMA_TOP_KEYS, SCHEMA_WORK_KEYS, SKILLS_MAX, SUMMARY_MAX, TEXT_NONE, YM_PARTS_RE,
} from './constants'
import type {
  CredSchool, DraftEntry, DraftIn, EntryIn, FactEdu, FactsIn, FactWork, JsonCell, JsonSchema, ListIn, OutEdu, OutWork,
  ProfileDraft, ProfileFacts, ProfileOut, TextIn, Texts, YmGroups, YmParts,
} from './types'

/**
 * 档案 → 生成简历要的事实:工作经历每段带上职业的英文名(按这一段的第一个码查);教育经历只留写了名称或学校的。
 *
 * @param x 本人的档案与账号邮箱。
 * @returns 事实。
 */
export function profileFactsOf(x: FactsIn): ProfileFacts {
  const work: FactWork[] = []
  for (const w of x.p.cv.work) {
    let occupation = TEXT_NONE
    for (const n of x.p.works) {
      if (occupation === TEXT_NONE && n.code === w.nocs[0]) {
        occupation = n.en
      }
    }
    work.push({ occupation, title: w.title, org: w.org, city: w.city, from: w.from, to: w.to, notes: w.desc })
  }
  const edu: FactEdu[] = []
  for (const e of x.p.eduList) {
    if (e.cred !== TEXT_NONE || e.school !== TEXT_NONE) {
      edu.push({ credential: e.cred, school: e.school, from: e.from, to: e.to })
    }
  }
  const majors: string[] = []
  for (const m of x.p.majors) {
    majors.push(m.en)
  }
  let region = x.p.prov
  if (x.p.city.en === TEXT_NONE) {
    region = TEXT_NONE
  }
  return {
    name: x.p.name.trim(), email: x.email, phone: x.p.cv.phone, link: x.p.cv.link, city: x.p.city.en, region, work, edu,
    majors: majors.join(NAME_SEP), skills: x.p.cv.skills,
  }
}

/**
 * 档案够不够生成一份简历:有英文姓名,且工作经历与教育经历至少有一样。
 *
 * @param f 事实。
 * @returns 够 true。
 */
export function isProfileReady(f: ProfileFacts): boolean {
  return f.name !== TEXT_NONE && (f.work.length > 0 || f.edu.length > 0)
}

/**
 * 给模型的 user 消息:工作经历、教育经历、专业与技能(联系方式不给模型)。
 *
 * @param f 事实。
 * @returns JSON 串。
 */
export function profileUserOf(f: ProfileFacts): string {
  return JSON.stringify({ work: f.work, edu: f.edu, majors: f.majors, skills: f.skills })
}

/**
 * 模型输出的 JSON 模式(Anthropic 结构化输出;work / edu 与输入的几段一一对应、同序)。
 *
 * @returns JSON 模式。
 */
export function profileSchemaOf(): JsonSchema {
  const str = { type: SCHEMA_STRING }
  const strs = { type: SCHEMA_ARRAY, items: str }
  const work = {
    type: SCHEMA_OBJECT,
    additionalProperties: false,
    required: SCHEMA_WORK_KEYS,
    properties: { title: str, org: str, city: str, bullets: strs },
  }
  const edu = {
    type: SCHEMA_OBJECT,
    additionalProperties: false,
    required: SCHEMA_EDU_KEYS,
    properties: { credential: str, school: str },
  }
  return {
    type: SCHEMA_OBJECT,
    additionalProperties: false,
    required: SCHEMA_TOP_KEYS,
    properties: {
      summary: str,
      work: { type: SCHEMA_ARRAY, items: work },
      edu: { type: SCHEMA_ARRAY, items: edu },
      skills: strs,
    },
  }
}

/**
 * 额度账里这一次生成的记账号:负的八位日期(UTC)。同一天再生成是同一个号,不另扣;职位 id 都是正数,不会撞。
 *
 * @param nowMs 现在(毫秒)。
 * @returns 记账号。
 */
export function profileRefOf(nowMs: number): number {
  return REF_SIGN * Number(new Date(nowMs).toISOString().slice(0, DATE_LEN).replace(DASH_RE, TEXT_NONE))
}

/**
 * 模型回的 JSON → 洗净的内容(信任边界的值级清洗全在这里):不是对象给全空;各格不是字符串当没写、清成排得了的字、截到上限。
 *
 * @param c 模型回的 JSON。
 * @returns 洗净的内容。
 */
export function toProfileOut(c: JsonCell): ProfileOut {
  const out: ProfileOut = { summary: TEXT_NONE, work: [], edu: [], skills: [] }
  if (c == null || typeof c !== 'object' || Array.isArray(c)) {
    return out
  }
  out.summary = textOf({ v: c.summary, max: SUMMARY_MAX })
  if (Array.isArray(c.work)) {
    for (const w of c.work) {
      out.work.push(toOutWork(w))
    }
  }
  if (Array.isArray(c.edu)) {
    for (const e of c.edu) {
      out.edu.push(toOutEdu(e))
    }
  }
  out.skills = listOf({ v: c.skills, max: LINE_MAX, n: SKILLS_MAX })
  return out
}

/**
 * 模型回的一段工作经历 → 洗净的一段(不是对象给全空,位置照占 —— 段按下标与事实对应)。
 *
 * @param c 模型回的一项。
 * @returns 一段。
 */
function toOutWork(c: JsonCell): OutWork {
  if (c == null || typeof c !== 'object' || Array.isArray(c)) {
    return { title: TEXT_NONE, org: TEXT_NONE, city: TEXT_NONE, bullets: [] }
  }
  return {
    title: textOf({ v: c.title, max: LINE_MAX }),
    org: textOf({ v: c.org, max: LINE_MAX }),
    city: textOf({ v: c.city, max: LINE_MAX }),
    bullets: listOf({ v: c.bullets, max: BULLET_MAX, n: BULLETS_MAX }),
  }
}

/**
 * 模型回的一条教育经历 → 洗净的一条(不是对象给全空,位置照占)。
 *
 * @param c 模型回的一项。
 * @returns 一条。
 */
function toOutEdu(c: JsonCell): OutEdu {
  if (c == null || typeof c !== 'object' || Array.isArray(c)) {
    return { credential: TEXT_NONE, school: TEXT_NONE }
  }
  return { credential: textOf({ v: c.credential, max: LINE_MAX }), school: textOf({ v: c.school, max: LINE_MAX }) }
}

/**
 * 模型回的一格字:不是字符串当没写;清成排得了的字,去首尾空白,截到上限。
 *
 * @param x 一格与上限。
 * @returns 字或空串。
 */
function textOf(x: TextIn): string {
  if (typeof x.v !== 'string') {
    return TEXT_NONE
  }
  return latinOf(x.v).slice(0, x.max)
}

/**
 * 模型回的一格清单:不是数组给空列;逐项过 textOf,空的不要,至多 n 项。
 *
 * @param x 一格、单项上限与项数上限。
 * @returns 清单。
 */
function listOf(x: ListIn): Texts {
  const out: string[] = []
  if (Array.isArray(x.v)) {
    for (const c of x.v) {
      const s = textOf({ v: c, max: x.max })
      if (s !== TEXT_NONE && out.length < x.n) {
        out.push(s)
      }
    }
  }
  return out
}

/**
 * 清成 PDF 排得了的字(Helvetica 只认西文):弯引号、破折号、省略号换成键盘上的写法,其余非西文字符清掉,去首尾空白。
 *
 * @param s 原字。
 * @returns 清过的字。
 */
export function latinOf(s: string): string {
  return s.replace(QUOTE1_RE, QUOTE1).replace(QUOTE2_RE, QUOTE2).replace(DASHES_RE, HYPHEN).replace(ELLIPSIS_RE, DOTS)
    .replace(NON_LATIN_RE, TEXT_NONE).trim()
}

/**
 * 事实 + 模型写的内容 → 排版用的草稿:段数与起止年月只取事实里的;每段的字用模型写的英文,模型那一格空着就用事实里的原字
 * (清成排得了的字);职位名称两边都空的用职业的英文名。技能用模型写的,模型没写就用用户填的。
 *
 * @param x 事实与模型写的内容。
 * @returns 草稿。
 */
export function profileDraftOf(x: DraftIn): ProfileDraft {
  const work: DraftEntry[] = []
  for (const [i, w] of x.f.work.entries()) {
    let o: OutWork = { title: TEXT_NONE, org: TEXT_NONE, city: TEXT_NONE, bullets: [] }
    const got = x.out.work[i]
    if (got != null) {
      o = got
    }
    const bullets: string[] = []
    for (const b of o.bullets) {
      bullets.push(BULLET_HEAD + b)
    }
    work.push(entryOf({
      title: firstOf([o.title, latinOf(w.title), latinOf(w.occupation)]), org: firstOf([o.org, latinOf(w.org)]),
      city: firstOf([o.city, latinOf(w.city)]), from: w.from, to: w.to, open: true, desc: bullets.join(LINE_SEP),
    }))
  }
  const edu: DraftEntry[] = []
  for (const [i, e] of x.f.edu.entries()) {
    let o: OutEdu = { credential: TEXT_NONE, school: TEXT_NONE }
    const got = x.out.edu[i]
    if (got != null) {
      o = got
    }
    const cred = firstOf([o.credential, latinOf(e.credential)])
    const school = firstOf([o.school, latinOf(e.school)])
    edu.push(entryOf({
      title: firstOf([cred, school]), org: orgOf({ cred, school }), city: TEXT_NONE, from: e.from, to: e.to, open: false,
      desc: TEXT_NONE,
    }))
  }
  let skills = x.out.skills.join(LINE_SEP)
  if (skills === TEXT_NONE) {
    skills = latinOf(x.f.skills)
  }
  return {
    contact: { name: x.f.name, email: x.f.email, phone: latinOf(x.f.phone), city: x.f.city, region: x.f.region },
    summary: x.out.summary, work, edu, skills,
  }
}

/**
 * 几个候选里第一个不空的;都空给空串。
 *
 * @param list 候选,按优先序。
 * @returns 第一个不空的。
 */
function firstOf(list: Texts): string {
  for (const s of list) {
    if (s !== TEXT_NONE) {
      return s
    }
  }
  return TEXT_NONE
}

/**
 * 教育经历一条的机构那一格:证书名和学校都有时是学校(标题是证书名);只有一样时那一样已作标题,这一格空着。
 *
 * @param x 证书名与学校。
 * @returns 机构。
 */
function orgOf(x: CredSchool): string {
  if (x.cred !== TEXT_NONE) {
    return x.school
  }
  return TEXT_NONE
}

/**
 * 一条的排版格:年月拆成年与月;工作经历结束空着而开始填了算「至今」。
 *
 * @param x 标题、机构、城市、起止、结束空着算不算至今与描述。
 * @returns 一条。
 */
function entryOf(x: EntryIn): DraftEntry {
  const from = ymOf(x.from)
  const to = ymOf(x.to)
  return {
    title: x.title, org: x.org, city: x.city, fromY: from.y, fromM: from.m, toY: to.y, toM: to.m,
    now: x.open && from.y !== TEXT_NONE && to.y === TEXT_NONE, desc: x.desc,
  }
}

/**
 * 「2021」或「2021-03」拆成年与月(月去掉前导零;没有空串)。
 *
 * @param s 年月。
 * @returns 年与月。
 */
function ymOf(s: string): YmParts {
  const got = YM_PARTS_RE.exec(s)
  if (got == null || got.groups == null) {
    return { y: TEXT_NONE, m: TEXT_NONE }
  }
  const g = got.groups as YmGroups
  let m = TEXT_NONE
  if (g.m != null) {
    m = String(Number(g.m))
  }
  return { y: g.y, m }
}
