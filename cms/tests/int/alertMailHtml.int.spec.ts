/**
 * 提醒邮件的版式(2026-11-10 Frank「统一成英文吧」「格式也美化一下」「现在用户看着跟诈骗网站似的」):
 * 四种信与确认信共用一个外壳,全英文;页脚交代为什么收到;职位一块一条。
 *
 * @author Frank
 * @time 2026-11-10 20:40:00
 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('payload', () => ({ getPayload: async () => ({}) }))
vi.mock('@/payload.config', () => ({ default: Promise.resolve({}) }))

// 测试例外:域内函数直接点文件
const {
  confirmMailHtml, confirmMailText, dailyHtml, dailyText, emailHtml, emailText, weeklyHtml, weeklyProfileHtml, weeklyProfileText, weeklyText,
} = await import('@/lib/alerts/body/functions')
const { alertHeadersOf } = await import('@/lib/alerts/functions')

const UNSUB = 'https://offer2pr.com/api/alerts/unsub?u=1&t=x'
const CJK_RE = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/

const PROFILE_IN = {
  rows: [
    { id: 11, title: 'technical delivery manager - information technology (IT)', company: 'Telna', sal: '$200K to $210K a year', where: 'Toronto, ON', pnp: true },
    { id: 12, title: 'data engineer', company: 'Clientserver Tech Systems', sal: '', where: '', pnp: false },
    { id: null, title: 'cybersecurity analyst', company: 'Visfuture Inc.', sal: '$48 an hour', where: 'Markham, ON', pnp: false },
  ],
  stat: { newN: 10 },
  dimsOf: () => 'Computer and information systems managers (ON)',
  unsubUrl: UNSUB,
}
const DAILY_IN = {
  picks: [{ id: 21, title: 'line cook', company: 'Golden Wok', city: 'Ottawa', province: 'ON', salary: '$19 an hour' }] as never,
  unsubUrl: UNSUB,
}
const SAVED_IN = {
  items: [{ title: 'baker', company: 'Maple Bakery', open: true }, { title: 'cook', company: 'Diner', open: false }],
  newN: 4, unsubUrl: UNSUB,
}
const MATCH_IN = {
  rows: [{ id: 31, title: 'Web Developer', company_name: 'Acme', city: 'Ottawa', province: 'ON', salary_text: '$40 an hour' }] as never,
  drawLines: ['New draw: "General" cutoff 520 — your CRS 530 is 10 above'], unsubUrl: UNSUB,
}
const CONFIRM_URL = 'https://offer2pr.com/api/alerts/confirm?u=1&t=y'
const profile = weeklyProfileHtml(PROFILE_IN)
const daily = dailyHtml(DAILY_IN)
const saved = weeklyHtml(SAVED_IN)
const match = emailHtml(MATCH_IN)
const confirm = confirmMailHtml(CONFIRM_URL)
const ALERTS = [profile, daily, saved, match]
const profileText = weeklyProfileText(PROFILE_IN)
const dailyTextBody = dailyText(DAILY_IN)
const savedText = weeklyText(SAVED_IN)
const matchText = emailText(MATCH_IN)
const confirmText = confirmMailText(CONFIRM_URL)
const ALERT_TEXTS = [profileText, dailyTextBody, savedText, matchText]
const TAG_RE = /<[a-z/][^>]*>/i

describe('提醒邮件版式', () => {
  it('性质:五封信都没有中日韩文字,也没有间隔号', () => {
    for (const html of [...ALERTS, confirm]) {
      expect(CJK_RE.test(html)).toBe(false)
      expect(html.includes('\u00b7')).toBe(false)
    }
  })

  it('性质:提醒类四封的页脚都交代为什么收到,并带退订与设置链接', () => {
    for (const html of ALERTS) {
      expect(html).toContain('You are receiving this email because')
      expect(html).toContain('<a href="' + UNSUB + '"')
      expect(html).toContain('/account" style="color:#4b5563">Alert settings</a>')
    }
  })

  it('金标:档案周报的标题只说新职位数,可提名只挂在符合的那一行', () => {
    expect(profile).toContain('10 new jobs for you this week')
    expect(profile).toContain('Matched to your profile: Computer and information systems managers (ON)')
    expect(profile.split('PNP-eligible').length - 1).toBe(1)
    expect(profile).toContain('View all 10 jobs')
    expect(profile).not.toContain('92K')
  })

  it('金标:全小写的词首字母大写,带大写的词与虚词不动;有 id 才带链接', () => {
    expect(profile).toContain('<a href="https://offer2pr.com/jobs/12"')
    expect(profile).toContain('>Data Engineer</a>')
    expect(profile).toContain('>Technical Delivery Manager - Information Technology (IT)</a>')
    expect(daily).toContain('>Line Cook</a>')
    expect(profile).toContain('<span style="font-weight:600;color:#111827">Cybersecurity Analyst</span>')
  })

  it('金标:收藏周报用 Open / Closed 标签,确认信不带退订', () => {
    expect(saved).toContain('>Open</span>')
    expect(saved).toContain('>Closed</span>')
    expect(confirm).toContain('Confirm email')
    expect(confirm).not.toContain('Unsubscribe')
  })
})

describe('提醒邮件的抬头与一键退订(2026-11-11)', () => {
  it('性质:五封信的 HTML 都不用 float(Outlook 桌面版不认),抬头小字在右对齐的格子里', () => {
    for (const html of [...ALERTS, confirm]) {
      expect(html.includes('float:')).toBe(false)
      expect(html).toContain('<td align="right" style="font-size:12px;line-height:28px;color:#dbeafe">')
    }
  })

  it('金标:一键退订两个邮件头,网址用尖括号包着、是 https、不带 mailto', () => {
    expect(alertHeadersOf(UNSUB)).toEqual({
      'List-Unsubscribe': '<' + UNSUB + '>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    })
  })
})

describe('提醒邮件的纯文本版(2026-11-11)', () => {
  it('性质:五封都没有 HTML 标签、中日韩文字与间隔号', () => {
    for (const text of [...ALERT_TEXTS, confirmText]) {
      expect(TAG_RE.test(text)).toBe(false)
      expect(CJK_RE.test(text)).toBe(false)
      expect(text.includes('·')).toBe(false)
    }
  })

  it('性质:提醒类四封的页脚都交代为什么收到,并带退订与设置链接;确认信不带退订', () => {
    for (const text of ALERT_TEXTS) {
      expect(text).toContain('You are receiving this email because')
      expect(text).toContain('Unsubscribe: ' + UNSUB)
      expect(text).toContain('Alert settings: https://offer2pr.com/account')
    }
    expect(confirmText).not.toContain('Unsubscribe')
    expect(confirmText).toContain('Confirm email: ' + CONFIRM_URL)
  })

  it('金标:档案周报 = 标题、范围、每个职位一行(可提名只挂符合的那行,有 id 才带链接)、查看全部的链接', () => {
    const lines = profileText.split('\n')
    expect(lines[0]).toBe('10 new jobs for you this week')
    expect(lines).toContain('Matched to your profile: Computer and information systems managers (ON)')
    expect(lines).toContain('- Technical Delivery Manager - Information Technology (IT), Telna, Toronto, ON, $200K to $210K a year [PNP-eligible] https://offer2pr.com/jobs/11')
    expect(lines).toContain('- Data Engineer, Clientserver Tech Systems https://offer2pr.com/jobs/12')
    expect(lines).toContain('- Cybersecurity Analyst, Visfuture Inc., Markham, ON, $48 an hour')
    expect(lines).toContain('View all 10 jobs: https://offer2pr.com')
  })

  it('金标:每日推送、收藏周报、匹配信各自的行', () => {
    expect(dailyTextBody).toContain('- Line Cook, Golden Wok, Ottawa, ON, $19 an hour https://offer2pr.com/jobs/21')
    expect(savedText).toContain('- Baker, Maple Bakery [Open]')
    expect(savedText).toContain('- Cook, Diner [Closed]')
    expect(savedText).toContain('4 new jobs were posted this week in the fields you saved.')
    expect(matchText).toContain('New draw: "General" cutoff 520')
    expect(matchText).toContain('- Web Developer, Acme, Ottawa, ON, $40 an hour https://offer2pr.com/jobs/31')
  })
})
