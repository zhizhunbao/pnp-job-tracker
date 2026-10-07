// 「申请步骤」卡(2026-10-02 申请步骤批 1 / 批 2;设计 docs/design/申请步骤-20261002.md):弹框与资讯页同一张卡,数据层 etl/pathways 登记。
// 性质(data/mart 真表,逐条登了步骤的通道):① 每一步都有名字、事实行不露词条键(三语);② 引用 draws 的那一步标 draws,
//       且本省出得了抽选表;③ 资讯页每项的步骤卡 = stepsCardOf 同一份(门槛卡给引用门槛行的事实供字)。
// 金标(手写):阿省机会通道审理一步写「已审到 {日期} 收到的申请」;萨省雇主 offer 通道「雇主递职位审批」挂最近一个月的收件窗口表;
//       阿省科技通道「拿提名,递永居」写 30 天接受提名、60 天递永居(EE 版)。
//       2026-10-03(Frank「都修一下」):萨省现有工签门槛卡不出,「雇主登记」一步照样写经营年限那一句;
//       步骤卡全表不列年收入 / 员工数(那两项只在门槛卡);卑诗卫生局「进池与抽选」写不需要(原句在指南 PDF);
//       爱德华王子岛快速通道「拿提名,递永居」写联邦邀请后 60 天(原句在 IRCC 页)。
// 探针:事实带 streamKey 时按归一键认通道 —— 原名对不上照样出字;拿掉 streamKey 改按原名,同一行就不出(金标分得开两种认法)。
import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

// 测试例外:域内函数直接点文件(桶只走门的规矩不管测试)
import { provStreamItemsOf, stepsCardOf } from '@/components/pnp/functions'
import type { PnpDraw, PnpOps, PnpPathway, PnpReq, PnpStepOp, PnpStepSet } from '@/components/pnp/types'
import { makeT } from '@/lib/i18n'

const mart = <T>(name: string): T[] =>
  JSON.parse(fs.readFileSync(path.resolve(__dirname, `../../../data/mart/${name}.json`), 'utf8'))

/** 步骤卡读的运营统计指标(同 SQL.PNP_STEP_OPS) */
const STEP_METRICS = ['processing_weeks', 'processing_months', 'processing_days', 'assessing_up_to_date',
  'intake_limit', 'intake_used', 'intake_remaining', 'intake_filled']

const PATHWAYS = mart<PnpPathway & { steps: PnpStepSet['steps'], status: string }>('pathways')
  .filter((p) => p.status !== 'closed')
const SETS: PnpStepSet[] = PATHWAYS.filter((p) => p.steps.length > 0).map((p) => ({ key: p.key, steps: p.steps }))
const OPS = mart<PnpOps & PnpStepOp>('pnp_ops_stats')
const STEP_OPS: PnpStepOp[] = OPS.filter((o) => STEP_METRICS.includes(o.metric))
const DRAWS = mart<PnpDraw>('pnp_draws')
const REQS = mart<PnpReq>('pnp_requirements')
const PROVS = [...new Set(PATHWAYS.filter((p) => p.steps.length > 0).map((p) => p.province))]

function itemsOf(province: string, lang: 'zh' | 'en' | 'ko' = 'zh') {
  return provStreamItemsOf({
    t: makeT(lang), lang, province, pathways: PATHWAYS, reqs: REQS, draws: DRAWS, ops: OPS, sets: SETS, stepOps: STEP_OPS,
  })
}

describe('申请步骤卡', () => {
  it('真表:每条登了步骤的通道,每一步有名字、事实行不露词条键(三语);引用 draws 的那一步标 draws 且本省出得了抽选表', () => {
    expect(SETS.length).toBeGreaterThan(0)
    for (const lang of ['zh', 'en', 'ko'] as const) {
      for (const prov of PROVS) {
        for (const it of itemsOf(prov, lang)) {
          const set = SETS.find((s) => s.key === it.key)
          if (set == null) {
            expect(it.steps).toBeNull()
            continue
          }
          expect(it.steps?.steps.length).toBe(set.steps.length)
          // 2026-10-03 资讯页签四分:「申请步骤」页签上步骤卡前面没有门槛卡报通道名 —— 卡标题 = 通道官方原名、灰字 = 界面语言名(同门槛卡那一对)
          expect([it.steps?.title, it.steps?.sub]).toEqual([it.gate.title, it.gate.sub])
          expect(it.steps?.title).not.toBe(makeT(lang)('pnpstep.head'))
          // 2026-10-04 互跳钮:门槛卡 →「申请步骤」页签、步骤卡 →「通道」页签,都带省码与通道编号(落地页预选省份、滚到同一条通道)
          expect(it.gate.jump?.href).toBe(`/steps?prov=${prov}#${it.key}`)
          expect(it.steps?.jump?.href).toBe(`/streams?prov=${prov}#${it.key}`)
          it.steps?.steps.forEach((step, i) => {
            expect(step.name).not.toMatch(/^pnpstep\./)
            for (const line of step.lines) {
              expect(line.text).not.toMatch(/pnpstep\./)
            }
            const wantsDraws = (set.steps[i]?.facts ?? []).some((f) => f.ref === 'draws')
            expect(step.draws).toBe(wantsDraws)
            if (wantsDraws) {
              expect(it.draws).not.toBeNull()
            }
          })
        }
      }
    }
  })

  it('金标:阿省机会通道审理一步写审理游标;萨省雇主 offer 挂收件窗口表;阿省科技通道 EE 版两条期限', () => {
    const ab = itemsOf('AB')
    const aos = ab.find((x) => x.key === 'ab-opportunity')?.steps
    const review = aos?.steps.find((s) => s.name === '省里审批')
    expect(review?.lines.map((l) => l.text))
      .toEqual([expect.stringMatching(/^已审到 \d{4}-\d{2}-\d{2} 收到的申请\(截至 \d{4}-\d{2}-\d{2}\)$/)])
    const draw = aos?.steps.find((s) => s.draws)
    expect([draw?.name, draw?.stuck]).toEqual(['进池与抽选', true])
    const tech = ab.find((x) => x.key === 'ab-accelerated-tech')?.steps
    expect(tech?.steps.at(-1)?.lines.map((l) => l.text)).toEqual(['30 天内在 EE 系统接受提名', '收到联邦邀请后 60 天内递永居'])
    const eo = itemsOf('SK').find((x) => x.key === 'sk-employment-offer')?.steps
    const epa = eo?.steps.find((s) => s.name === '雇主递职位审批')
    expect(epa?.table?.corner).toMatch(/^\d{1,2} 月窗口$/)
    expect(epa?.table?.rows.length).toBeGreaterThan(0)
    const ewp = itemsOf('SK').find((x) => x.key === 'sk-existing-work-permit')
    const channel = PATHWAYS.find((p) => p.key === 'sk-existing-work-permit')
    expect([ewp?.gate.rows, ewp?.gate.source?.href]).toEqual([[], channel?.url])
    expect(ewp?.steps?.steps.find((s) => s.name === '雇主登记')?.lines.map((l) => l.text)).toEqual(['在本省经营满 24 个月'])
    const ha = itemsOf('BC').find((x) => x.key === 'bc-health-authority')?.steps
    expect(ha?.steps.find((s) => s.name === '进池与抽选')?.lines.map((l) => l.text)).toEqual(['不需要:持 offer 直接申请'])
    const pe = itemsOf('PE').find((x) => x.key === 'pe-express-entry')?.steps
    expect(pe?.steps.at(-1)?.lines.map((l) => l.text)).toEqual(['收到联邦邀请后 60 天内递永居'])
  })

  it('真表:步骤卡全表不列年收入 / 员工数(雇主那一步只出经营年限那一句)', () => {
    for (const prov of PROVS) {
      for (const it of itemsOf(prov)) {
        for (const step of it.steps?.steps ?? []) {
          for (const line of step.lines) {
            expect(line.text).not.toMatch(/^(年收入|全职员工) ≥/)
          }
        }
      }
    }
  })

  it('探针:事实带 streamKey 按归一键认通道,原名对不上照样出字;拿掉 streamKey 按原名就不出', () => {
    const op: PnpStepOp = {
      province: 'AB', metric: 'assessing_up_to_date', scope: 'Accelerated Tech Pathway (long official note)',
      streamKey: 'accelerated tech pathway', value: null, valueText: '2026-06-23', period: '', asOf: '2026-09-23',
    }
    const channel = PATHWAYS.find((p) => p.key === 'ab-accelerated-tech') ?? null
    const card = (fact: PnpStepSet['steps'][number]['facts'][number]) => stepsCardOf({
      t: makeT('zh'), province: 'AB', channel, stepOps: [op], reqs: [], who: { province: 'AB', noc: '', teer: null },
      sets: [{ key: 'ab-accelerated-tech', steps: [{ step: 'review', who: 'province', none: false, stuck: false, facts: [fact] }] }],
    })
    const byKey = card({ ref: 'processing', metric: 'assessing_up_to_date', streamKey: 'accelerated tech pathway' })
    expect(byKey?.steps[0]?.lines.map((l) => l.text)).toEqual(['已审到 2026-06-23 收到的申请(截至 2026-09-23)'])
    // 弹框那张照旧写「申请步骤」、不出灰字(2026-10-03 资讯页签四分只改页签上那张)
    expect([byKey?.title, byKey?.sub, byKey?.jump]).toEqual(['申请步骤', '', null])
    const byScope = card({ ref: 'processing', metric: 'assessing_up_to_date', scope: 'Accelerated Tech Pathway' })
    expect(byScope?.steps[0]?.lines).toEqual([])
  })
})
