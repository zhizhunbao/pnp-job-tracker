/**
 * 提醒列表(2026-11-08「我的」清单第 5、6、16 条):提醒名、改条件的链接、按条件提醒的发信间隔与退订链接。
 *
 * @author Frank
 * @time 2026-11-08 23:50:00
 */
import { describe, expect, it } from 'vitest'
import { alertBtnKeyOf, alertHrefOf, alertNameOf, alertOkKeyOf } from '@/components/jobs/functions'
import { EMAIL_SHELL, UNSUB_SAVED } from '@/lib/alerts/constants'

describe('提醒名', () => {
  it('金标:只拼有值的文字条件;一个条件都没有用兜底字;超长截到 80', () => {
    expect(alertNameOf({ filters: { q: 'cook', fProv: 'Ontario', fCity: '', fPnp: true }, all: 'ALL' })).toBe('cook, Ontario')
    expect(alertNameOf({ filters: { q: '', fPnp: false }, all: 'ALL' })).toBe('ALL')
    expect(alertNameOf({ filters: { q: 'x'.repeat(200) }, all: 'ALL' })).toHaveLength(80)
  })
})

describe('改条件的链接', () => {
  it('金标:筛选格的键翻回 URL 参数名,空值不带,提醒号在', () => {
    expect(alertHrefOf({ id: '44', filters: { q: 'cook', fProv: 'Ontario', fCity: '' } }))
      .toBe('/jobs?alert=44&q=cook&prov=Ontario')
  })

  it('性质:职位板不认的键不进链接', () => {
    expect(alertHrefOf({ id: '1', filters: { notAFilter: 'x' } })).toBe('/jobs?alert=1')
  })
})

describe('新建与更新', () => {
  it('金标:有提醒号是更新,没有是新建', () => {
    expect(alertBtnKeyOf('')).toBe('ss.alert')
    expect(alertBtnKeyOf('44')).toBe('ss.update')
    expect(alertOkKeyOf('')).toBe('ss.savedOk')
    expect(alertOkKeyOf('44')).toBe('ss.updated')
  })
})

describe('退订', () => {
  it('金标:匹配信和按条件提醒信的底部是真的退订链接,不再让人去账户页找', () => {
    expect(EMAIL_SHELL).toContain('<a href="{unsubUrl}"')
    expect(UNSUB_SAVED).toBe('Unsubscribe')
  })
})
