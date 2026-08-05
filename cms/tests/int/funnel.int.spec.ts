// 漏斗五个数(主线 M2 / E7-05):白名单与归一的行为锁死 —— 纯函数,不需要 DB。
// 这张表的价值全在「只留能读的数」:白名单一松,它就变成垃圾桶,以后没人敢读。
import { describe, it, expect } from 'vitest'
import { FUNNEL_STEPS, isLocalHost, stepRates, toFunnelHit } from '@/lib/funnel'

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

  // 2026-08-03 第一次读这张表撞到的洞:站内唯一直链 /pricing 的入口是报告锁区那个 CTA,
  // 而 /pricing 页面从来没发过 `pricing-open`(只有两个弹框在发)—— 于是「报告 → 定价」这条
  // **主转化边整条不计数**,第 4 步恒为 0。补上之后来路走 `?from=rpt-<卡>`,这里锁住它过得了白名单。
  it('报告锁区来的定价页带来路,四张卡的 from 都过得了低基数白名单', () => {
    for (const card of ['pr', 'job', 'prov', 'career']) {
      expect(toFunnelHit('pricing-open', `rpt-${card}`)).toEqual({ event: 'pricing-open', prop: `rpt-${card}` })
    }
    expect(toFunnelHit('pricing-open', 'direct')).toEqual({ event: 'pricing-open', prop: 'direct' })
    // 来路是 URL 参数 = 用户可随手改 → 脏值退回入口名,不许污染这张低基数表
    expect(toFunnelHit('pricing-open', 'rpt pr <script>')?.prop).toBe('pricing')
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

  it('顺序就是漏斗顺序(页面按它排,别在显示层再排一次);旧五步在前、对话两步在后', () => {
    // 2026-08-04:答题卡摘掉全部站内入口、对话挂件成为唯一对话入口 → 加一条**并行**的对话漏斗。
    // 断言从 5 改到 7 是事实变了,不是放宽:前五个仍必须原序在前(stepRates 按下标算相邻转化率),
    // 对话两步**追加在尾部**且不参与前五步的相邻计算 —— 两形态混算会把口径搅成一锅。
    expect([...FUNNEL_STEPS]).toEqual(['jd-open', 'report-open', 'lock-seen', 'pricing-open', 'pay-click', 'chat-open', 'chat-answer', 'chat-feedback'])
  })

  it('对话形态的三个键各自归位,不串进旧五步', () => {
    expect(toFunnelHit('widget-open', 'jd')).toEqual({ event: 'chat-open', prop: 'jd' })
    expect(toFunnelHit('chat-answer', '')?.event).toBe('chat-answer')
    // 点踩是数据缺口报警器 —— prop 只收 good|bad 这两个枚举,不收自由文本
    expect(toFunnelHit('chat-feedback', 'bad')).toEqual({ event: 'chat-feedback', prop: 'bad' })
    expect(toFunnelHit('widget-close', '')).toBeNull()   // 关闭不进表:它不是漏斗的一格
    expect(toFunnelHit('widget-drag', '')).toBeNull()    // 拖动/缩放/重置同理,是交互不是漏斗
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
