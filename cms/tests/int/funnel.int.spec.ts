// 漏斗五个数(主线 M2 / E7-05):白名单与归一的行为锁死 —— 纯函数,不需要 DB。
// 这张表的价值全在「只留能读的数」:白名单一松,它就变成垃圾桶,以后没人敢读。
import { describe, it, expect } from 'vitest'
import { FUNNEL_STEPS, decisionRates, isLocalHost, stepRates, toFunnelHit } from '@/lib/funnel'

describe('漏斗事件白名单', () => {
  it('站内既有埋点名归到五步(调用点一个都不用改名)', () => {
    expect(toFunnelHit({ name: 'modal-jd', prop: null })).toEqual({ event: 'jd-open', prop: '' })
    expect(toFunnelHit({ name: 'plan-job-report', prop: null })).toEqual({ event: 'report-open', prop: 'job' })
    expect(toFunnelHit({ name: 'jd-lock-seen', prop: null })).toEqual({ event: 'lock-seen', prop: 'jd' })
    expect(toFunnelHit({ name: 'rpt-lock-seen', prop: null })).toEqual({ event: 'lock-seen', prop: 'rpt' })
    expect(toFunnelHit({ name: 'upgrade-open', prop: null })).toEqual({ event: 'pricing-open', prop: 'upgrade' })
  })

  // 2026-08-02 收口:第 1 步先前**根本没有调用点**(详情页没埋),库里只有第 3 步有数、分母是空的。
  // 详情页那个「点了看报告」不再算第 2 步 —— 同一次跳转报告页自己也会记一次,留着就是双计。
  it('第 1 步分弹框与整页;详情页的「点了看报告」不进漏斗(报告态真渲染才算打开)', () => {
    expect(toFunnelHit({ name: 'jd-open', prop: 'page' })).toEqual({ event: 'jd-open', prop: 'page' })
    expect(toFunnelHit({ name: 'modal-jd', prop: 'modal' })).toEqual({ event: 'jd-open', prop: 'modal' })
    expect(toFunnelHit({ name: 'jd-report-open', prop: null })).toBeNull()
  })

  // 2026-08-03 第一次读这张表撞到的洞:站内唯一直链 /pricing 的入口是报告锁区那个 CTA,
  // 而 /pricing 页面从来没发过 `pricing-open`(只有两个弹框在发)—— 于是「报告 → 定价」这条
  // **主转化边整条不计数**,第 4 步恒为 0。补上之后来路走 `?from=rpt-<卡>`,这里锁住它过得了白名单。
  it('报告锁区来的定价页带来路,四张卡的 from 都过得了低基数白名单', () => {
    for (const card of ['pr', 'job', 'prov', 'career']) {
      expect(toFunnelHit({ name: 'pricing-open', prop: `rpt-${card}` })).toEqual({ event: 'pricing-open', prop: `rpt-${card}` })
    }
    expect(toFunnelHit({ name: 'pricing-open', prop: 'direct' })).toEqual({ event: 'pricing-open', prop: 'direct' })
    // 来路是 URL 参数 = 用户可随手改 → 脏值退回入口名,不许污染这张低基数表
    expect(toFunnelHit({ name: 'pricing-open', prop: 'rpt pr <script>' })?.prop).toBe('pricing')
  })

  it('白名单之外一律丢掉(埋点调用点几十处,全塞进来这张表就没法读了)', () => {
    for (const junk of ['save-job', 'ai-read-jd', 'cat-translate', '', 'DROP TABLE', null, 42]) {
      expect(toFunnelHit({ name: junk, prop: null })).toBeNull()
    }
  })

  it('prop 只收低基数枚举:NOC、公司名、搜索词这类高基数值一律退回入口名', () => {
    expect(toFunnelHit({ name: 'rpt-lock-seen', prop: 'pr' })).toEqual({ event: 'lock-seen', prop: 'pr' })
    expect(toFunnelHit({ name: 'rpt-lock-seen', prop: '31301 registered nurse' })?.prop).toBe('rpt')   // 带空格=自由文本
    expect(toFunnelHit({ name: 'rpt-lock-seen', prop: 'x'.repeat(40) })?.prop).toBe('rpt')             // 太长
    expect(toFunnelHit({ name: 'pay-click', prop: '30' })).toEqual({ event: 'pay-click', prop: '30' })
  })

  it('顺序就是漏斗顺序(页面按它排,别在显示层再排一次);旧五步在前、对话三步居中、雇主线三步在后', () => {
    // 2026-08-04:答题卡摘掉全部站内入口、对话挂件成为唯一对话入口 → 加一条**并行**的对话漏斗。
    // 断言从 5 改到 7 是事实变了,不是放宽:前五个仍必须原序在前(stepRates 按下标算相邻转化率),
    // 对话两步**追加在尾部**且不参与前五步的相邻计算 —— 两形态混算会把口径搅成一锅。
    // 2026-08-08(647e891 B5 批):雇主线三事件进白名单(modal-pnp→pnp-employer-click 是 08-22 读数
    // 那条转化边;se-view-jobs 只作参照)—— 同样追加在尾部,当时漏更了这条断言(spec 自那起一直红)。
    // 2026-08-11:PR 评估四步进白名单(先前这页一条数都没有,Frank 问「有人访问吗」只能靠
    // 登录态 umami 一条条翻 session)—— 同样**追加在尾部**,自成一条并行链,不进前五步的相邻计算。
    expect([...FUNNEL_STEPS]).toEqual(['jd-open', 'report-open', 'lock-seen', 'pricing-open', 'pay-click',
      'chat-open', 'chat-answer', 'chat-feedback', 'modal-pnp', 'pnp-employer-click', 'se-view-jobs',
      'dp-open', 'dp-quiz-done', 'dp-score-start', 'dp-score-done'])
  })

  it('PR 评估四步各自归位,且相邻转化率只在本链内算', () => {
    expect(toFunnelHit({ name: 'dp-open', prop: '1' })).toEqual({ event: 'dp-open', prop: '1' })
    expect(toFunnelHit({ name: 'dp-score-done', prop: '' })?.event).toBe('dp-score-done')
    // 100 人打开 → 40 人答完 → 20 人进估分 → 10 人答完
    expect(decisionRates({ 'dp-open': 100, 'dp-quiz-done': 40, 'dp-score-start': 20, 'dp-score-done': 10 }))
      .toEqual([40, 50, 50])
    // 旧五步那条链不受影响
    expect(stepRates({ 'jd-open': 100, 'report-open': 50, 'lock-seen': 25, 'pricing-open': 5, 'pay-click': 1 }))
      .toEqual([50, 50, 20, 20])
  })

  it('对话形态的三个键各自归位,不串进旧五步', () => {
    expect(toFunnelHit({ name: 'widget-open', prop: 'jd' })).toEqual({ event: 'chat-open', prop: 'jd' })
    expect(toFunnelHit({ name: 'chat-answer', prop: '' })?.event).toBe('chat-answer')
    // 点踩是数据缺口报警器 —— prop 只收 good|bad 这两个枚举,不收自由文本
    expect(toFunnelHit({ name: 'chat-feedback', prop: 'bad' })).toEqual({ event: 'chat-feedback', prop: 'bad' })
    expect(toFunnelHit({ name: 'widget-close', prop: '' })).toBeNull()   // 关闭不进表:它不是漏斗的一格
    expect(toFunnelHit({ name: 'widget-drag', prop: '' })).toBeNull()    // 拖动/缩放/重置同理,是交互不是漏斗
  })
})

describe('转化率', () => {
  it('分母为 0 给 null —— 显示层出「—」,不许出 0% 或 NaN', () => {
    expect(stepRates({})).toEqual([null, null, null, null])
    const r = stepRates({ 'jd-open': 200, 'report-open': 50, 'lock-seen': 25, 'pricing-open': 0, 'pay-click': 0 })
    expect(r).toEqual([25, 50, 0, null])   // 最后一格分母 0 → null,不是 0%
  })
})

describe('开发流量不进表', () => {
  it('本机来源一律不计 —— dev 直连生产库,验一次版式就会多几条假数', () => {
    for (const h of ['localhost:3000', 'LOCALHOST', '127.0.0.1:3000', '[::1]', '0.0.0.0:8080']) {
      expect(isLocalHost(h), h).toBe(true)
    }
    for (const h of ['offer2pr.com', 'www.offer2pr.com', 'pnp-cms.onrender.com', '']) {
      expect(isLocalHost(h), h).toBe(false)
    }
  })
})
