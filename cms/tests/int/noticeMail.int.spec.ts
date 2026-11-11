/**
 * 通知信外壳与灌库清译文(2026-11-11):改登录邮箱确认信、忘记密码信套 lib/mail 的通知信,全英文;
 * 整理版变了,同一行的中韩译文在灌库时清空。
 *
 * @author Frank
 * @time 2026-11-11 04:00:00
 */
import { describe, expect, it, vi } from 'vitest'

import { SQL } from '@/lib/db'
import { noticeHtmlOf, noticeTextOf } from '@/lib/mail'

vi.mock('payload', () => ({ getPayload: async () => ({}), getFieldsToSign: () => ({}), jwtSign: async () => ({}) }))
vi.mock('@/payload.config', () => ({ default: Promise.resolve({}) }))
vi.mock('next/headers', () => ({ cookies: async () => ({}) }))

// 测试例外:域内函数直接点文件
const { emailConfirmHtml } = await import('@/lib/auth/functions')

const CJK_RE = /[぀-ヿ㐀-鿿가-힯]/
const IN = { site: 'https://offer2pr.com', kicker: 'Password reset', head: 'Reset your password', text: 'Valid for 1 hour.', cta: 'Reset password', href: 'https://offer2pr.com/?reset=abc' }

describe('通知信', () => {
  it('金标:外壳、标题、按钮链接、页脚都在,不带退订', () => {
    const html = noticeHtmlOf(IN)
    expect(html).toContain('>Password reset</td>')
    expect(html).toContain('>Reset your password</h1>')
    expect(html).toContain('<a href="https://offer2pr.com/?reset=abc"')
    expect(html).toContain('If you did not ask for this, you can ignore this email.')
    expect(html).not.toContain('Unsubscribe')
    expect(html.includes('float:')).toBe(false)
  })

  it('金标:纯文本版带标题与链接', () => {
    const text = noticeTextOf(IN)
    expect(text.split('\n')[0]).toBe('Reset your password')
    expect(text).toContain('Reset password: https://offer2pr.com/?reset=abc')
  })

  it('性质:改登录邮箱确认信全英文,链接原样带上', () => {
    const html = emailConfirmHtml('https://offer2pr.com/api/auth/email/confirm?u=1&t=x')
    expect(CJK_RE.test(html)).toBe(false)
    expect(html).toContain('<a href="https://offer2pr.com/api/auth/email/confirm?u=1&t=x"')
    expect(html).toContain('>Confirm your new sign-in email</h1>')
  })
})

describe('灌库:整理版变了清译文', () => {
  it('金标:两列译文都带「整理版变了才清」的分支,没变保旧值', () => {
    const suffix = SQL.jobsUpsertSuffix({ cols: ['external_id', 'title', 'jd_formatted'], fixed: ['external_id'], coalesce: ['jd_formatted'] })
    const changed = 'jobs.jd_formatted IS DISTINCT FROM COALESCE(EXCLUDED.jd_formatted, jobs.jd_formatted)'
    expect(suffix).toContain('jd_trans_zh=CASE WHEN ' + changed + ' THEN NULL ELSE jobs.jd_trans_zh END')
    expect(suffix).toContain('jd_trans_ko=CASE WHEN ' + changed + ' THEN NULL ELSE jobs.jd_trans_ko END')
  })
})
