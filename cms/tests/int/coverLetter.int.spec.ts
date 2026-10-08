// @vitest-environment node
// 站内投递 · 求职信与代发的纯函数(2026-10-07 B2;lib/apply)。
// 2026-10-07 改判:信由模型按 JD 写(「我的模板」与按位置换回占位撤),① ②③ 改读作「兜底模板填完不剩占位」。
// 性质:① 填空记下的位置里正是填进去的值,换回占位回到模板原文(模板里本来没有本岗名字时);
//       ② 改信时位置跟着挪:改动在前整体平移、改动在后不动、改到值本身那一处作废;服务端核位置只认「位置里正是那个值」;
//       ③ 不做全文替换:信里另有一个含职位名的词(Cook → Cooking)不会被换成占位;
//       ④ 字符判定与 pdf-lib 真编码器在整个 BMP 上逐码点一致;
//       ⑤ 排版每行宽度不超过版心,超长词硬断;同一封 PDF 渲两次逐字节相同(幂等键才不撞),抽回文字等于原信;
//       ⑥ 发件显示名里没有 CR、LF、<、>、";测试号收件方一定被改写;幂等键随内容变;
//       ⑦ Svix 验签:正确签名过、篡改体 / 时间戳偏差 301 秒 / 错密钥都不过;退信种类只认永久退信与投诉。
// 探针:spansAfterEditOf 不平移 → ② 红;WINANSI_EXTRA 删一个字 → ④ 红;updateMetadata 改 true → ⑤ 逐字节红;
//       recipientOf 不认 @test.local → ⑥ 红;isSvixValid 不判时间戳 → ⑦ 红。
import { createHmac } from 'node:crypto'
import * as PdfLib from 'pdf-lib'
import { PDFParse } from 'pdf-parse'
import { describe, expect, it } from 'vitest'

import {
  bounceKindOf, coverFillOf, coverLinesOf, coverPdfOf, idemKeyOf, isSenderName, isSvixValid,
  mailTextOf, pdfBadCharsOf, recipientOf, resumeFileOf, coverFileOf, senderFromOf, letterCleanOf, letterMessagesOf, letterProviderOf,
} from '@/lib/apply/functions'
import { COVER_DEFAULT } from '@/lib/apply/constants'

const JOB = { title: 'Cook', company: 'Pie Wood Ltd.', name: 'Zhang San' }

describe('求职信兜底模板(2026-10-07 起信由模型按 JD 写,模板只在写不成时兜底)', () => {
  it('① 填完不剩占位,三处都换成本岗的值', () => {
    const t = coverFillOf({ template: COVER_DEFAULT, ...JOB })
    expect(t).not.toContain('{{')
    expect(t).toContain('the Cook position at Pie Wood Ltd.,')
    expect(t.endsWith('Sincerely,\nZhang San')).toBe(true)
  })
})

describe('字符', () => {
  it('④ pdfBadCharsOf 与 pdf-lib 真编码器在整个 BMP 上一致', async () => {
    const doc = await PdfLib.PDFDocument.create({ updateMetadata: false })
    const font = await doc.embedFont(PdfLib.StandardFonts.Helvetica)
    for (let c = 0; c < 0x10000; c++) {
      if (c >= 0xd800 && c <= 0xdfff) continue
      const ch = String.fromCharCode(c)
      if (ch === '\n') continue
      let ok = true
      try { font.encodeText(ch) } catch { ok = false }
      expect(pdfBadCharsOf(ch).length === 0, 'U+' + c.toString(16)).toBe(ok)
    }
  }, 60_000)

  it('署名:西文字母、空格与 .\'- 才合规', () => {
    expect(isSenderName('Zhang San')).toBe(true)
    expect(isSenderName("Zoë O'Neil-Bélanger")).toBe(true)
    expect(isSenderName('张三')).toBe(false)
    expect(isSenderName('Łukasz')).toBe(false)
    expect(isSenderName('A')).toBe(false)
    expect(isSenderName('a<b>')).toBe(false)
  })

  it('坏字去重、按出现先后', () => {
    expect(pdfBadCharsOf('Hi 张三张 😀 é')).toEqual(['张', '三', '😀'])
  })
})

describe('PDF', () => {
  it('⑤ 每行不超过版心、超长词硬断', () => {
    const measure = (s: string) => s.length * 6
    const long = 'x'.repeat(200) + ' short words here ' + 'word '.repeat(80)
    const lines = coverLinesOf({ text: long + '\n\nend', measure, maxWidth: 468 })
    for (const l of lines) expect(measure(l)).toBeLessThanOrEqual(468)
    expect(lines.join('')).toContain('x'.repeat(78))
    expect(lines).toContain('')
  })

  it('⑤ 同一封渲两次逐字节相同,抽回文字等于原信;长信自动分页', async () => {
    const text = coverFillOf({ template: COVER_DEFAULT, ...JOB })
    const a = await coverPdfOf({ pdf: PdfLib, text })
    const b = await coverPdfOf({ pdf: PdfLib, text })
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true)
    const parsed = await new PDFParse({ data: new Uint8Array(a) }).getText()
    const norm = (s: string) => s.replace(/\s+/g, ' ').replace(/-- \d+ of \d+ --/g, '').trim()
    expect(norm(parsed.text)).toBe(norm(text))
    const longText = Array.from({ length: 80 }, (_, i) => 'Paragraph ' + i).join('\n')
    const doc = await PdfLib.PDFDocument.load(await coverPdfOf({ pdf: PdfLib, text: longText }))
    expect(doc.getPageCount()).toBeGreaterThan(1)
  })
})

describe('代发', () => {
  it('⑥ 发件显示名防头注入', () => {
    for (const n of ['Ann "x" <a@b.c>', 'Bob\r\nBcc: x@y.z', 'Zoë\\Q']) {
      const from = senderFromOf(n)
      const shown = from.slice(0, from.indexOf(' via Offer2PR'))
      expect(shown).not.toMatch(/[\r\n<>"]/)
    }
    expect(senderFromOf('Zoë Smith')).toBe('Zoe Smith via Offer2PR <apply@offer2pr.com>')
  })

  it('⑥ 测试号一定改投,真号投雇主', () => {
    expect(recipientOf({ userEmail: 'qa1@test.local', employerEmail: 'hr@acme.ca' })).toBe('delivered@resend.dev')
    expect(recipientOf({ userEmail: 'QA-Bounce@TEST.local', employerEmail: 'hr@acme.ca' })).toBe('bounced@resend.dev')
    expect(recipientOf({ userEmail: 'a@gmail.com', employerEmail: 'hr@acme.ca' })).toBe('hr@acme.ca')
  })

  it('⑥ 幂等键随内容变、同内容不变', async () => {
    const a = await idemKeyOf({ appId: 5, parts: ['x', 'y'] })
    expect(a).toMatch(/^apply-5-[0-9a-f]{16}$/)
    expect(await idemKeyOf({ appId: 5, parts: ['x', 'y'] })).toBe(a)
    expect(await idemKeyOf({ appId: 5, parts: ['x', 'z'] })).not.toBe(a)
  })

  it('附件名与正文', () => {
    expect(resumeFileOf({ name: 'Zoë Smith', mime: 'application/pdf' })).toBe('Zoe_Smith_Resume.pdf')
    expect(coverFileOf('Pie Wood Ltd.')).toBe('Cover_Letter_Pie_Wood_Ltd.pdf')
    expect(coverFileOf('饺子馆')).toBe('Cover_Letter.pdf')
    const body = mailTextOf({ title: 'Cook', city: 'Steinbach', province: 'MB', name: 'Zhang San' })
    expect(body).toContain('apply for your "Cook" position in Steinbach, MB. Please find')
    expect(mailTextOf({ title: 'Cook', city: '', province: '', name: 'Z Q' })).toContain('"Cook" position. Please')
    expect(body).toContain('Best regards,\nZhang San')
  })
})

describe('退信回调', () => {
  const secretRaw = Buffer.from('0123456789abcdef0123456789abcdef')
  const secret = 'whsec_' + secretRaw.toString('base64')
  const sign = (id: string, ts: string, body: string) =>
    'v1,' + createHmac('sha256', secretRaw).update(id + '.' + ts + '.' + body).digest('base64')
  const body = JSON.stringify({ type: 'email.bounced', data: { email_id: 'abc', bounce: { type: 'Permanent' } } })

  it('⑦ 正确签名过,篡改 / 超时 / 错密钥不过', async () => {
    const now = 1_800_000_000
    const ts = String(now)
    const sigs = 'v1,AAAA ' + sign('msg_1', ts, body)
    expect(await isSvixValid({ secret, id: 'msg_1', ts, sigs, body, nowS: now })).toBe(true)
    expect(await isSvixValid({ secret, id: 'msg_1', ts, sigs, body: body + ' ', nowS: now })).toBe(false)
    expect(await isSvixValid({ secret, id: 'msg_1', ts, sigs, body, nowS: now + 301 })).toBe(false)
    expect(await isSvixValid({ secret: 'whsec_' + Buffer.from('x').toString('base64'), id: 'msg_1', ts, sigs, body, nowS: now })).toBe(false)
  })

  it('⑦ 只认永久退信与投诉 / 抑制', () => {
    expect(bounceKindOf(JSON.parse(body))).toBe('bounced')
    expect(bounceKindOf({ type: 'email.bounced', data: { bounce: { type: 'Transient' } } })).toBe('')
    expect(bounceKindOf({ type: 'email.complained' })).toBe('suppressed')
    expect(bounceKindOf({ type: 'email.delivered' })).toBe('')
  })
})

describe('按 JD 写信(2026-10-07)', () => {
  it('模型原文洗一遍:think 段、markdown、写不进 PDF 的字都去掉,多余空行压成一个', () => {
    const raw = '<think>plan</think>**Dear Hiring Manager,**\n\n\n\nI can cook 🍳 well — trust me.\r\n\nSincerely,\nZoë Q'
    const out = letterCleanOf(raw)
    expect(out).toBe('Dear Hiring Manager,\n\nI can cook  well — trust me.\n\nSincerely,\nZoë Q')
    expect(pdfBadCharsOf(out)).toEqual([])
  })

  it('整轮消息:系统提示里署名换好,用户消息带职位 / 公司 / 地点 / JD / 简历,JD 与简历截到上限', () => {
    const m = letterMessagesOf({
      title: 'Cook', company: 'Pie Wood', city: 'Steinbach', province: 'MB', jd: 'x'.repeat(9000),
      resume: 'y'.repeat(12000), name: 'Zhang San',
    })
    expect(m[0]!.role).toBe('system')
    expect(m[0]!.content).toContain('"Zhang San" on the last line')
    expect(m[1]!.content).toContain('JOB TITLE: Cook')
    expect(m[1]!.content).toContain('LOCATION: Steinbach, MB')
    expect(m[1]!.content.length).toBeLessThan(17000)
    expect(m[0]!.content.length + m[1]!.content.length).toBeLessThan(20000)
  })

  it('模型通道随环境变量切,认不得的按 friend', () => {
    expect(letterProviderOf('anthropic')).toBe('anthropic')
    expect(letterProviderOf('ollama')).toBe('ollama')
    expect(letterProviderOf('')).toBe('friend')
    expect(letterProviderOf('gpt')).toBe('friend')
  })
})

