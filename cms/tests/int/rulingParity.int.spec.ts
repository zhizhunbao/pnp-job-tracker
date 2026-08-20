/**
 * 临时探针(验完即删):`lib/ruling` 新写的判定件与老 `lib/verdict` 的**结果必须逐字相同**。
 *
 * 照 2026-08-20 定的办法 —— 新的写完先打真数据验过,验过了才换消费者。
 */
import { describe, expect, it } from 'vitest'
import { getDb } from '@/lib/db/database'
import { loadVerdictTables } from '@/lib/ruling/functions'
import { matchDesignation as freshMatch } from '@/lib/ruling/functions'
import { loadVerdictData } from '@/lib/chat'
import { matchDesignation as oldMatch } from '@/lib/verdict/designationMatch'
import { employerVerdict as freshEmp } from '@/lib/ruling/functions'
import { employerVerdict as oldEmp } from '@/lib/verdict/employerVerdict'
import { pathVerdict as freshPath, jobPathways as freshJobs, pathLevers as freshLevers } from '@/lib/ruling/functions'
import { pathVerdict as oldPath, jobPathways as oldJobs, pathLevers as oldLevers } from '@/lib/verdict/pathVerdict'
import type { VerdictProfile } from '@/lib/ruling/types'

const LIVE = Boolean(process.env.DATABASE_URI)

describe.skipIf(!LIVE)('ruling 与 verdict 结果对拍', () => {
  it('六张底表逐字相同', async () => {
    const db = await getDb()
    const [fresh, old] = await Promise.all([loadVerdictTables(db), loadVerdictData(db)])
    const keys = ['requirements', 'occupations', 'draws', 'scoreFactors', 'eeGrid', 'designatedEmployers'] as const
    for (const k of keys) {
      expect(JSON.stringify(fresh[k]), k).toBe(JSON.stringify(old[k]))
    }
    console.log(`六表对齐:${keys.map((k) => `${k}=${fresh[k].length}`).join(' ')}`)
  }, 180_000)

  it('名录匹配:拿真名录逐家对拍(含多配的连锁)', async () => {
    const db = await getDb()
    const { designatedEmployers: rows } = await loadVerdictTables(db)
    expect(rows.length).toBeGreaterThan(0)

    // 用名录里每一家自己的名字去反查:命中数、命中行、名录名三项都要一致
    let checked = 0
    let multi = 0
    for (const one of rows) {
      const a = freshMatch({ companyName: one.name, rows })
      const b = oldMatch(one.name, rows)
      expect(a.count, one.name).toBe(b.count)
      expect(a.source, one.name).toBe(b.source)
      expect(a.row?.name ?? null, one.name).toBe(b.row?.name ?? null)
      checked += 1
      if (a.count >= 2) multi += 1
    }
    // 岗位上挂的营业名(而不是法定全称)也要对上 —— o/a 段展开正是为它
    for (const probe of ['Grand View Manor', 'Tim Hortons', 'Sobeys', '不存在的公司名']) {
      const a = freshMatch({ companyName: probe, rows })
      const b = oldMatch(probe, rows)
      expect(a.count, probe).toBe(b.count)
      expect(a.row?.name ?? null, probe).toBe(b.row?.name ?? null)
    }
    console.log(`名录对拍:${checked} 家全一致,其中多配 ${multi} 家`)
  }, 180_000)

  it('雇主判定:各省 × 各种事实组合逐格对拍', async () => {
    const db = await getDb()
    const { requirements: reqs } = await loadVerdictTables(db)
    const provs = ['BC', 'AB', 'SK', 'MB', 'ON', 'NS', 'NB', 'NL', 'PE']
    const factsList = [
      { foundedYear: 2019, registryStatus: null, staffEst: 12, staffEstSrc: null, sector: null },
      { foundedYear: null, registryStatus: null, staffEst: null, staffEstSrc: null, sector: null },
      { foundedYear: 2024, registryStatus: null, staffEst: 1, staffEstSrc: null, sector: null },
      { foundedYear: 1990, registryStatus: null, staffEst: 900, staffEstSrc: null, sector: 'public' },
    ]
    let n = 0
    for (const province of provs) {
      for (const facts of factsList) {
        const a = freshEmp({ facts, province, reqs, nowYear: 2026 })
        const b = oldEmp(facts, province, reqs, 2026)
        expect(JSON.stringify(a), province + JSON.stringify(facts)).toBe(JSON.stringify(b))
        n += 1
      }
    }
    console.log(`雇主判定对拍:${n} 组全一致`)
  }, 180_000)

  it('通道判定:多套档案 × 全量底表逐字对拍', async () => {
    const db = await getDb()
    const data = await loadVerdictTables(db)
    const base: VerdictProfile = {
      age: null, married: null, clb: null, edu: null, eduYears: null, canadaStudy: null,
      studyProvince: null, noc: null, teer: null, expCanadaMonths: null, expForeignMonths: null,
      foreignExpSelfEmployed: null, status: null, province: null,
      hasOffer: null, inCanada: null, fieldMatch: null, frenchOk: null, permit: null,
    }
    const profiles: VerdictProfile[] = [
      base,
      { ...base, noc: '72310', teer: 2, clb: 6, expCanadaMonths: 0, expForeignMonths: 36, hasOffer: true, inCanada: true, province: 'ON', permit: 'pgwp' },
      { ...base, noc: '21232', teer: 1, clb: 9, age: 29, married: false, edu: 'bachelor', canadaStudy: true, studyProvince: 'ON', expCanadaMonths: 12, hasOffer: false, inCanada: true, permit: 'work' },
      { ...base, noc: '33102', teer: 3, clb: 4, expCanadaMonths: 24, hasOffer: true, inCanada: false, province: 'NS', foreignExpSelfEmployed: true },
      { ...base, noc: '72310', teer: 2, clb: 8, expCanadaMonths: 36, hasOffer: true, inCanada: true, province: 'MB', fieldMatch: true, frenchOk: false, permit: 'study' },
    ]
    for (const [i, p] of profiles.entries()) {
      expect(JSON.stringify(freshPath(p, data)), `档案 ${i}`).toBe(JSON.stringify(oldPath(p, data)))
      expect(JSON.stringify(freshLevers(p, data, { clbTarget: 8 })), `杠杆 ${i}`).toBe(JSON.stringify(oldLevers(p, data, { clbTarget: 8 })))
    }
    for (const [noc, teer] of [['72310', 2], ['21232', 1], ['33102', 3], [null, null]] as const) {
      expect(JSON.stringify(freshJobs(noc, teer, data)), `职业 ${noc}`).toBe(JSON.stringify(oldJobs(noc, teer, data)))
    }
    console.log(`PATHVERDICT_OK profiles=${profiles.length}`)
  }, 300_000)
})
