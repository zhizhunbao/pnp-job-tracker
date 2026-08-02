// 漏斗五个数(主线 M2 / E7-05):白名单与归一的行为锁死 —— 纯函数,不需要 DB。
// 这张表的价值全在「只留能读的数」:白名单一松,它就变成垃圾桶,以后没人敢读。
import { describe, it, expect } from 'vitest'
import { FUNNEL_STEPS, stepRates, toFunnelHit } from '@/lib/funnel'

describe('漏斗事件白名单', () => {
  it('站内既有埋点名归到五步(调用点一个都不用改名)', () => {
    expect(toFunnelHit('modal-jd')).toEqual({ event: 'jd-open', prop: '' })
    expect(toFunnelHit('plan-job-report')).toEqual({ event: 'report-open', prop: 'job' })
    expect(toFunnelHit('jd-lock-seen')).toEqual({ event: 'lock-seen', prop: 'jd' })
    expect(toFunnelHit('rpt-lock-seen')).toEqual({ event: 'lock-seen', prop: 'rpt' })
    expect(toFunnelHit('upgrade-open')).toEqual({ event: 'pricing-open', prop: 'upgrade' })
  })

  // 2026-08-02 收口:第 1 步先前**根本没有调用点**(详情页没埋),库里只有第 3 步有数、分母是空的。
  // 详情页那个「点了看报告」不再算第 2 步 —— 同一次跳转报告页自己也会记一次,留着就是双计。
  it('第 1 步分弹框与整页;详情页的「点了看报告」不进漏斗(报告态真渲染才算打开)', () => {
    expect(toFunnelHit('jd-open', 'page')).toEqual({ event: 'jd-open', prop: 'page' })
    expect(toFunnelHit('modal-jd', 'modal')).toEqual({ event: 'jd-open', prop: 'modal' })
    expect(toFunnelHit('jd-report-open')).toBeNull()
  })

  it('白名单之外一律丢掉(埋点调用点几十处,全塞进来这张表就没法读了)', () => {
    for (const junk of ['save-job', 'ai-read-jd', 'cat-translate', '', 'DROP TABLE', null, 42]) {
      expect(toFunnelHit(junk as unknown)).toBeNull()
    }
  })

  it('prop 只收低基数枚举:NOC、公司名、搜索词这类高基数值一律退回入口名', () => {
    expect(toFunnelHit('rpt-lock-seen', 'pr')).toEqual({ event: 'lock-seen', prop: 'pr' })
    expect(toFunnelHit('rpt-lock-seen', '31301 registered nurse')?.prop).toBe('rpt')   // 带空格=自由文本
    expect(toFunnelHit('rpt-lock-seen', 'x'.repeat(40))?.prop).toBe('rpt')             // 太长
    expect(toFunnelHit('pay-click', '30')).toEqual({ event: 'pay-click', prop: '30' })
  })

  it('五步顺序就是漏斗顺序(页面按它排,别在显示层再排一次)', () => {
    expect([...FUNNEL_STEPS]).toEqual(['jd-open', 'report-open', 'lock-seen', 'pricing-open', 'pay-click'])
  })
})

describe('转化率', () => {
  it('分母为 0 给 null —— 显示层出「—」,不许出 0% 或 NaN', () => {
    expect(stepRates({})).toEqual([null, null, null, null])
    const r = stepRates({ 'jd-open': 200, 'report-open': 50, 'lock-seen': 25, 'pricing-open': 0, 'pay-click': 0 })
    expect(r).toEqual([25, 50, 0, null])   // 最后一格分母 0 → null,不是 0%
  })
})
