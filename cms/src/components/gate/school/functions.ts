/**
 * gate 桶子桶 school 的行为:教育经历那一段「搜学校」—— 打字落格并记下在搜哪一段、防抖搜指定院校名单、
 * 选中一所后把校名、所在省、公立私立填进那一段。
 * 2026-11-12:院校名单在库里(dli),学校那一格边打边搜;名单里没有的(国外的、没收录的)照常手填,什么都不拦。
 * 依赖只许父桶 → 子桶(经本目录 index.ts)。
 *
 * @author Frank
 * @time 2026-11-12 19:30:00
 */
import { GUEST_LOG, log } from '@/lib/log'
import {
  K_KIND_HEAD, KIND_PRIVATE, KIND_PUBLIC, LANG_ZH, SCHOOL_AT_NONE, SCHOOL_DEBOUNCE_MS, SCHOOL_LEN, SCHOOL_PROVS,
  SCHOOL_Q_MIN, SUB_SEP, TEXT_NONE, URL_SCHOOLS,
} from './constants'
import type {
  DeadFlag, SchoolHit, SchoolLoadIn, SchoolPickIn, SchoolQIn, SchoolRow, SchoolSearchIn, SchoolsJson, SchoolSubIn,
  SchoolTypeIn,
} from './types'

/**
 * 正在搜的那一段的检索词:那一段学校格里的字(去首尾空白);没在搜 = 空串。
 *
 * @param x 现在的几段与正在搜第几段。
 * @returns 检索词。
 */
export function schoolQOf(x: SchoolQIn): string {
  const row = x.rows[x.at]
  if (row == null) {
    return TEXT_NONE
  }
  return row.school.trim()
}

/**
 * 造搜学校的启动器(检索词一变跑一次):不够起搜的词就地清空结果、不发请求;够了停手 SCHOOL_DEBOUNCE_MS 才发。
 * 换词 / 卸载由收尾器掐计时器、作废在途那一发。
 *
 * @param x 检索词与结果落格。
 * @returns 启动器(返回收尾器)。
 */
export function makeSchoolSearch(x: SchoolSearchIn): () => () => void {
  return function startSchoolSearch(): () => void {
    const flag: DeadFlag = { dead: false }
    if (x.q.length < SCHOOL_Q_MIN) {
      x.setHits([])
      return function stopNothing(): void {
        flag.dead = true
      }
    }
    const timer = setTimeout(function fireSchoolSearch(): void {
      void loadSchoolHits({ q: x.q, setHits: x.setHits, flag })
    }, SCHOOL_DEBOUNCE_MS)
    return function stopSchoolSearch(): void {
      flag.dead = true
      clearTimeout(timer)
    }
  }
}

/**
 * 取搜到的学校;取不到按没搜到(学校照常手填),留痕。
 *
 * @param x 检索词、落格与存活标记。
 * @returns 无。
 */
async function loadSchoolHits(x: SchoolLoadIn): Promise<void> {
  let hits: SchoolHit[] = []
  try {
    const r = await fetch(URL_SCHOOLS + encodeURIComponent(x.q))
    const j = await r.json() as SchoolsJson
    if (r.ok && Array.isArray(j.schools)) {
      hits = j.schools
    }
  } catch (e) {
    log({ tag: GUEST_LOG.tag, text: GUEST_LOG.editSave + String(e) })
  }
  if (x.flag.dead === false) {
    x.setHits(hits)
  }
}

/**
 * 造学校格的打字手柄工厂:落进那一段的学校格,并记下在搜这一段(结果摆在它下面)。
 *
 * @param x 现在的几段与两个落格。
 * @returns 第几段 → 输入框的 onChange。
 */
export function makeSchoolTypeOf(x: SchoolTypeIn): (i: number) => (v: string) => void {
  return function schoolTypeOf(i: number): (v: string) => void {
    return function typeSchool(v: string): void {
      const out: SchoolRow[] = []
      for (const [k, r] of x.rows.entries()) {
        if (k === i) {
          out.push(Object.assign({}, r, { school: v.slice(0, SCHOOL_LEN) }))
        } else {
          out.push(r)
        }
      }
      x.setRows(out)
      x.setAt(i)
    }
  }
}

/**
 * 造「点一所搜到的学校」的手柄工厂:校名换成名单里的写法;所在省是下拉认得的省码就填上,公立私立照名单填
 * (名单是官方的,选中即以它为准);选上就收起结果。
 *
 * @param x 现在的几段、正在搜第几段与两个落格。
 * @returns 一所学校 → 点击手柄。
 */
export function makeSchoolPickOf(x: SchoolPickIn): (hit: SchoolHit) => () => void {
  return function schoolPickOf(hit: SchoolHit): () => void {
    return function pickSchool(): void {
      const out: SchoolRow[] = []
      for (const [k, r] of x.rows.entries()) {
        if (k === x.at) {
          let prov = r.prov
          if (SCHOOL_PROVS.includes(hit.prov)) {
            prov = hit.prov
          }
          let kind = KIND_PRIVATE
          if (hit.isPublic) {
            kind = KIND_PUBLIC
          }
          out.push(Object.assign({}, r, { school: hit.name, prov, kind }))
        } else {
          out.push(r)
        }
      }
      x.setRows(out)
      x.setAt(SCHOOL_AT_NONE)
    }
  }
}

/**
 * 结果行的灰字:中文界面先出中文译名(有的话),再出省码与公立 / 私立。
 *
 * @param x 一所学校、界面语与取词。
 * @returns 灰字。
 */
export function schoolSubOf(x: SchoolSubIn): string {
  const parts: string[] = []
  if (x.lang === LANG_ZH && x.hit.nameZh !== TEXT_NONE) {
    parts.push(x.hit.nameZh)
  }
  if (x.hit.prov !== TEXT_NONE) {
    parts.push(x.hit.prov)
  }
  let kind = KIND_PRIVATE
  if (x.hit.isPublic) {
    kind = KIND_PUBLIC
  }
  parts.push(x.t(K_KIND_HEAD + kind))
  return parts.join(SUB_SEP)
}
