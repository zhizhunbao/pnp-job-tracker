/**
 * gate 桶子桶 seed 的行为:自己取本人的档案,拼成修改面板的起始答案。
 * 2026-11-12:投递第 1 步的「生成简历」改开修改面板(生成简历并进了它的末段),那里手里没有档案,由面板的外壳先取。
 * 依赖只许父桶 → 子桶(经本目录 index.ts)。
 *
 * @author Frank
 * @time 2026-11-12 20:00:00
 */
import { GUEST_LOG, log } from '@/lib/log'
import { CRED_INCLUDE, URL_PROFILE } from './constants'
import type { Codes, SeedCodes, SeedJson, SeedLoadIn, SeedOut, SeedProfile } from './types'

/**
 * 取档案并落起始答案;没登录、接口挂了落「取不到」,留痕。
 *
 * @param x 两个落格。
 * @returns 无。
 */
export async function loadSeed(x: SeedLoadIn): Promise<void> {
  try {
    const r = await fetch(URL_PROFILE, { credentials: CRED_INCLUDE })
    const j = await r.json() as SeedJson
    if (r.ok && j.profile != null) {
      x.setSeed(seedOf(j.profile))
      return
    }
  } catch (e) {
    log({ tag: GUEST_LOG.tag, text: GUEST_LOG.editSave + String(e) })
  }
  x.setFailed(true)
}

/**
 * 档案 → 起始答案(带码的名字只取码,城市取英文名)。
 *
 * @param p 档案。
 * @returns 起始答案。
 */
export function seedOf(p: SeedProfile): SeedOut {
  return {
    goal: p.goal,
    majors: codesOf(p.majors),
    nocs: codesOf(p.nocs),
    prov: p.prov,
    abroad: p.abroad,
    city: p.city.en,
    name: p.name,
    who: p.who,
    edu: p.edu,
    eduList: p.eduList,
    workNocs: codesOf(p.works),
    matchBy: p.matchBy,
    matchMode: p.matchMode,
    fromResume: p.fromResume,
    cv: p.cv,
  }
}

/**
 * 带码的名字 → 码。
 *
 * @param names 带码的名字。
 * @returns 码。
 */
function codesOf(names: SeedCodes): Codes {
  const out: Codes = []
  for (const n of names) {
    out.push(n.code)
  }
  return out
}
