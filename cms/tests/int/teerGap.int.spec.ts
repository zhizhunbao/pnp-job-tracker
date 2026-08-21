// 确定性回归:**TEER 不知道,按 TEER 划范围的门槛行就整条消失**——不打 LLM,不靠网关。
//
// 2026-08-21 实测的病:同一句「木匠在 BC 对语言有什么要求」,
// 不给 profile 答「四项各 CLB 4」,给了 profile.noc 答「官方并未列出语言分数线」。
// 后者是假话 —— 库里就有「CLB 4 in each of the four competencies (NOC TEER 2, 3, 4 or 5)」。
// 病灶是 consult 的 `nocOf` 只在「模型挑的码 ≠ 手上的码」时才补 teer,
// 预填的码一进来就相等 → teer 一路 null → teerHit 挑不出行 → 语言要求从事实里消失。
// 这里钉住那条因果链的两端:① 72310 的 teer 库里查得到;② teer=null 时 teerHit 拒绝该行。
import { describe, expect, it } from 'vitest'
import { getDb } from '@/lib/db/server'
import { teerHit } from '@/lib/gauge'
import type { Requirement } from '@/lib/gauge'
import { SQL } from '@/lib/db'

// BC 那条语言行的适用范围,照库里的原样
const TEER_SCOPED = { appliesTeer: '2,3,4,5' } as Requirement

describe('teer 缺失会吃掉按 TEER 划范围的门槛行', () => {
  it('72310 的 teer 在库里是 2 —— 所以 boxFor 拿得到,不必等模型去搜', async () => {
    const db = await getDb()
    const { rows } = await db.query(SQL.NOC_TITLE_TEER, ['72310'])
    expect(rows[0]?.teer == null ? null : Number(rows[0].teer)).toBe(2)
  })

  it('同一行:teer=2 适用,teer=null 直接被拒 —— 拒掉就等于这条要求不存在', () => {
    expect(teerHit({ r: TEER_SCOPED, teer: 2 })).toBe(true)
    expect(teerHit({ r: TEER_SCOPED, teer: null })).toBe(false)
  })
})
