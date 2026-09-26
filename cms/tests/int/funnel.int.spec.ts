// 漏斗五个数(主线 M2 / E7-05):白名单与归一的行为锁死 —— 纯函数,不需要 DB。
// 这张表的价值全在「只留能读的数」:白名单一松,它就变成垃圾桶,以后没人敢读。
import { describe, it, expect } from 'vitest'
import {
  DECISION_STEPS, FUNNEL_STEPS, LEGACY_STEPS, decisionRates, isLocalHost, stepRates, toFunnelHit,
} from '@/lib/funnel'
import { isBotUa } from '@/lib/http'

describe('漏斗事件白名单', () => {
  it('站内既有埋点名归位(调用点一个都不用改名);报告 / 锁区旧名撤后丢弃', () => {
    expect(toFunnelHit({ name: 'modal-jd', prop: null })).toEqual({ event: 'jd-open', prop: '' })
    // 2026-09-26 /fe Frank:报告 / 锁区两步撤出白名单(触发点 08-04 起就没了,库里历史行不动)——
    // 撤前这三条归到 report-open(prop job)、lock-seen(prop jd / rpt),现在旧名进来一律丢
    expect(toFunnelHit({ name: 'plan-job-report', prop: null })).toBeNull()
    expect(toFunnelHit({ name: 'jd-lock-seen', prop: null })).toBeNull()
    expect(toFunnelHit({ name: 'rpt-lock-seen', prop: null })).toBeNull()
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
    // 2026-09-26 /fe Frank:原先拿 rpt-lock-seen(入口名 rpt)测,它随锁区撤出白名单;改拿同样带入口名的 upgrade-open
    expect(toFunnelHit({ name: 'upgrade-open', prop: 'pr' })).toEqual({ event: 'pricing-open', prop: 'pr' })
    expect(toFunnelHit({ name: 'upgrade-open', prop: '31301 registered nurse' })?.prop).toBe('upgrade')   // 带空格=自由文本
    expect(toFunnelHit({ name: 'upgrade-open', prop: 'x'.repeat(40) })?.prop).toBe('upgrade')             // 太长
    expect(toFunnelHit({ name: 'pay-click', prop: '30' })).toEqual({ event: 'pay-click', prop: '30' })
  })

  it('顺序就是漏斗顺序(页面按它排,别在显示层再排一次);旧链残段在前、转化四计数殿后', () => {
    // 2026-08-04:答题卡摘掉全部站内入口、对话挂件成为唯一对话入口 → 加一条**并行**的对话漏斗。
    // 断言从 5 改到 7 是事实变了,不是放宽:前五个仍必须原序在前(stepRates 按下标算相邻转化率),
    // 对话两步**追加在尾部**且不参与前五步的相邻计算 —— 两形态混算会把口径搅成一锅。
    // 2026-08-08(647e891 B5 批):雇主线三事件进白名单(modal-pnp→pnp-employer-click 是 08-22 读数
    // 那条转化边;se-view-jobs 只作参照)—— 同样追加在尾部,当时漏更了这条断言(spec 自那起一直红)。
    // 2026-08-11:PR 评估四步进白名单(先前这页一条数都没有,Frank 问「有人访问吗」只能靠
    // 登录态 umami 一条条翻 session)—— 同样**追加在尾部**,自成一条并行链,不进前五步的相邻计算。
    // 2026-09-04(/fe 雇主模块):雇主板四事件进白名单 —— 它们**不是一条链**,只做计数,
    // 同样追加在尾部,不动前面任何下标切片。
    // 2026-09-10(/fe 省份批收口):把脉段级三事件进白名单(滚到段 / 点子导航 / 切表图年窗,
    // kind 装低基数枚举)—— 同雇主板只计数不成链,追加在尾部。
    // 2026-09-11(城市段重设计批):city-open 进白名单(从城市段落去职位板,
    // kind = main/industry/pilot/dli/search)—— 旧城市卡零埋点 40 天零交互,四表全部挂点;
    // 只计数不成链,城市名永不进 kind,追加在尾部。
    // 2026-09-26(/fe Frank 撤两条死链):report-open / lock-seen 与对话三步(chat-open / chat-answer /
    // chat-feedback)触发点都已不在,撤出;链改按名写死(LEGACY_STEPS / DECISION_STEPS),
    // 这里的顺序从此只管看板行序,不再有下标切片靠它。同日尾部追加转化四计数(只计数不成链)。
    expect([...FUNNEL_STEPS]).toEqual(['jd-open', 'pricing-open', 'pay-click',
      'modal-pnp', 'pnp-employer-click', 'se-view-jobs',
      'dp-open', 'dp-quiz-done', 'dp-score-start', 'dp-score-done',
      'pulse-card', 'pulse-occ', 'pulse-cta',
      'emp-search', 'emp-filter', 'emp-row', 'emp-page',
      'pulse-sec', 'pulse-subnav', 'pulse-series', 'city-open',
      'apply', 'signup', 'checkout', 'weekly-optin'])
  })

  it('链按名写死,每一步都在白名单里;转化四计数不进任何链(2026-09-26)', () => {
    for (const step of [...LEGACY_STEPS, ...DECISION_STEPS]) {
      expect(FUNNEL_STEPS, step).toContain(step)
    }
    expect([...LEGACY_STEPS]).toEqual(['pricing-open', 'pay-click'])
    expect([...DECISION_STEPS]).toEqual(['dp-open', 'dp-quiz-done', 'dp-score-start', 'dp-score-done'])
    for (const step of ['jd-open', 'apply', 'signup', 'checkout', 'weekly-optin']) {
      expect([...LEGACY_STEPS, ...DECISION_STEPS], step).not.toContain(step)
    }
  })

  it('转化四事件归位,prop 只收低基数枚举(投递方式 / 档位 / 开关);邮箱这类自由文本不进分组', () => {
    expect(toFunnelHit({ name: 'apply', prop: 'email' })).toEqual({ event: 'apply', prop: 'email' })
    expect(toFunnelHit({ name: 'apply', prop: 'web' })).toEqual({ event: 'apply', prop: 'web' })
    expect(toFunnelHit({ name: 'signup', prop: null })).toEqual({ event: 'signup', prop: '' })
    expect(toFunnelHit({ name: 'checkout', prop: '30' })).toEqual({ event: 'checkout', prop: '30' })
    expect(toFunnelHit({ name: 'weekly-optin', prop: 'true' })).toEqual({ event: 'weekly-optin', prop: 'true' })
    expect(toFunnelHit({ name: 'weekly-optin', prop: 'false' })).toEqual({ event: 'weekly-optin', prop: 'false' })
    // 邮箱带 @ 与点,过不了 PROP_OK —— 就算哪天调用点传错了,也落不进表
    expect(toFunnelHit({ name: 'apply', prop: 'hr@example.com' })?.prop).toBe('')
  })

  it('把脉页三点击各自归位(2026-09-04),调用点沿用下划线原名', () => {
    expect(toFunnelHit({ name: 'pulse_card_click', prop: '' })).toEqual({ event: 'pulse-card', prop: '' })
    expect(toFunnelHit({ name: 'pulse_occ_click', prop: '' })).toEqual({ event: 'pulse-occ', prop: '' })
    expect(toFunnelHit({ name: 'landing_cta_browse', prop: '' })).toEqual({ event: 'pulse-cta', prop: '' })
  })

  it('PR 评估四步各自归位,且相邻转化率只在本链内算', () => {
    expect(toFunnelHit({ name: 'dp-open', prop: '1' })).toEqual({ event: 'dp-open', prop: '1' })
    expect(toFunnelHit({ name: 'dp-score-done', prop: '' })?.event).toBe('dp-score-done')
    // 100 人打开 → 40 人答完 → 20 人进估分 → 10 人答完
    expect(decisionRates({ 'dp-open': 100, 'dp-quiz-done': 40, 'dp-score-start': 20, 'dp-score-done': 10 }))
      .toEqual([40, 50, 50])
    // 旧五步那条链不受影响
    // 2026-09-26 /fe Frank:旧链撤到只剩「定价 → 付费」一格;jd-open 不接在链头(给了也不参与)
    expect(stepRates({ 'jd-open': 100, 'pricing-open': 5, 'pay-click': 1 }))
      .toEqual([20])
  })

  it('对话形态的三个键撤出白名单,关闭 / 拖动本来就不进', () => {
    // 2026-09-26 /fe Frank:挂件 09-23 摘下、面板无处唤出,对话三步撤出白名单 —— 撤前这三个键
    // 各自归到 chat-open(prop jd)/ chat-answer / chat-feedback(点踩是数据缺口报警器 ——
    // prop 只收 good|bad 这两个枚举,不收自由文本),现在一律丢,库里历史行不动
    expect(toFunnelHit({ name: 'widget-open', prop: 'jd' })).toBeNull()
    expect(toFunnelHit({ name: 'chat-answer', prop: '' })).toBeNull()
    expect(toFunnelHit({ name: 'chat-feedback', prop: 'bad' })).toBeNull()
    expect(toFunnelHit({ name: 'widget-close', prop: '' })).toBeNull()   // 关闭不进表:它不是漏斗的一格
    expect(toFunnelHit({ name: 'widget-drag', prop: '' })).toBeNull()    // 拖动/缩放/重置同理,是交互不是漏斗
  })
})

describe('转化率', () => {
  it('分母为 0 给 null —— 显示层出「—」,不许出 0% 或 NaN', () => {
    // 2026-09-26 /fe Frank:旧链只剩一格,「中间一格分母为 0」这条性质改拿 PR 评估链锁
    expect(stepRates({})).toEqual([null])
    expect(stepRates({ 'pricing-open': 0, 'pay-click': 0 })).toEqual([null])
    const r = decisionRates({ 'dp-open': 200, 'dp-quiz-done': 50, 'dp-score-start': 0, 'dp-score-done': 0 })
    expect(r).toEqual([25, 0, null])   // 最后一格分母 0 → null,不是 0%
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

// 2026-09-26 /fe Frank:近 30 天第一方 jd-open 32,722 次、Umami 173 次,09-13 一天 5,004 次(不是 Googlebot,
// 它同期日抓 200~400)—— 路由只挡了本机。机器人 UA 与空 UA 回 204 不落库,UA 判完即弃。
// 金标:真人三大件(桌面 Chrome / macOS Safari / iOS Chrome)外加 iOS Safari、Android Chrome、Firefox、Edge 放行;
// 爬虫 / 无头浏览器 / 脚本客户端 / 空串 / 没有这个头一律拦。
const HUMAN_UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.7339.101 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:141.0) Gecko/20100101 Firefox/141.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',
]

const BOT_UAS = [
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/140.0.0.0 Safari/537.36',
  'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot',
  'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
  'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)',
  'Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)',
  'python-requests/2.32.3',
  'curl/8.7.1',
  'Mediapartners-Google',
  'Go-http-client/1.1',
  'node',
  'axios/1.7.7',
  'Mozilla/5.0 (compatible; Bytespider; spider-feedback@bytedance.com)',
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  'WhatsApp/2.23.20.0 A',
  'Wget/1.21.4',
  'Java/17.0.2',
  'okhttp/4.12.0',
  'PostmanRuntime/7.39.0',
  'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 Chrome-Lighthouse',
]

describe('机器人流量不进表', () => {
  it('真浏览器一律放行', () => {
    for (const ua of HUMAN_UAS) {
      expect(isBotUa({ ua }), ua).toBe(false)
    }
  })

  it('爬虫、无头浏览器、脚本客户端一律拦', () => {
    for (const ua of BOT_UAS) {
      expect(isBotUa({ ua }), ua).toBe(true)
    }
  })

  it('空串、全空白、没有这个头都当机器人(真浏览器每个请求都带 UA)', () => {
    for (const ua of ['', '   ', null]) {
      expect(isBotUa({ ua }), String(ua)).toBe(true)
    }
  })

  it('大小写不改判定(爬虫自报名大小写五花八门)', () => {
    for (const ua of BOT_UAS) {
      expect(isBotUa({ ua: ua.toUpperCase() }), ua).toBe(true)
      expect(isBotUa({ ua: ua.toLowerCase() }), ua).toBe(true)
    }
    for (const ua of HUMAN_UAS) {
      expect(isBotUa({ ua: ua.toLowerCase() }), ua).toBe(false)
    }
  })
})
