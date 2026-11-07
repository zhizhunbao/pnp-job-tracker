// @vitest-environment node
// 生成简历(2026-11-07;lib/cv 版式与 PDF、lib/noc「导入职责」排序)。
// 性质:① 分区次序照 Job Bank 传统模板;空分区、隐藏条目、没标题的条目不印;自定义分区一条一个分区、标题大写;
//       ② 起止写法:「Apr 2015 - Sep 2022」、至今写 Present、一个时间只写开始、没月份只写年、没年份不写;
//       ③ 多行格:行首 - * \u2022 中点按要点排并去掉记号,空行丢掉;
//       ④ 线格式收窄:不是字符串当没填、超长截断、年月不合规当没填、不是数组当空、每分区最多 20 条、非对象条目跳过;
//       ⑤ 坏字只查会印出来的字(隐藏条目里的中文不拦);
//       ⑥ 真 pdf-lib 画得出、抽回文字含姓名与分区标题、同一份渲两次逐字节相同、长描述自动换页、每行都在版心里;
//       ⑦ 导入职责排序:示例职位名一字不差排最前,命中名报的是那个示例名;LIKE 元字符转义。
// 探针:itemsOf 不判 hidden → ① 红;whenOf 丢 now → ② 红;BULLET_RE 去掉中点 → ③ 红;yearOf 不判四位 → ④ 红;
//       cvBadCharsOf 改查草稿全文 → ⑤ 红;updateMetadata 改 true → ⑥ 逐字节红;rankedOf 只看职业名 → ⑦ 红。
import * as PdfLib from 'pdf-lib'
import { PDFParse } from 'pdf-parse'
import { describe, expect, it } from 'vitest'

import { MARGIN, PAGE_W } from '@/lib/cv/constants'
import { cvBadCharsOf, cvLayoutOf, cvLinesOf, cvPdfOf, cvRowsOf, toCvDraft, whenOf } from '@/lib/cv/functions'
import type { CvDraft, CvEntry } from '@/lib/cv/types'
import { LIKE_ESCAPE, LIKE_SPECIAL_RE } from '@/lib/noc/constants'
import { nocDutyHitsOf } from '@/lib/noc/functions'

function entry(over: Partial<CvEntry>): CvEntry {
  return {
    title: '', org: '', city: '', region: '', fromY: '', fromM: '', toY: '', toM: '', now: false, desc: '', hidden: false,
    ...over,
  }
}

function draft(over: Partial<CvDraft>): CvDraft {
  return {
    contact: { name: 'Peng Wang', email: 'p@test.local', phone: '', city: 'Nepean', region: 'ON' },
    summary: '', work: [], edu: [], skills: '', creds: [], volunteer: [], awards: [], extra: [],
    ...over,
  }
}

const FULL = draft({
  summary: 'Data engineer with 10 years of experience.',
  work: [
    entry({ title: 'Big data architect', org: 'Huan Tech', city: 'Guangzhou', region: 'China', fromY: '2015', fromM: '4', toY: '2022', toM: '9', desc: '- Built pipelines\n\n* Led a team' }),
    entry({ title: 'Hidden job', hidden: true }),
    entry({ title: '   ', org: 'No title' }),
  ],
  edu: [entry({ title: 'AI Software Development', org: 'Algonquin College', fromY: '2025', fromM: '1', toY: '2026', toM: '4' })],
  skills: 'Python\nSQL',
  creds: [entry({ title: 'NGINX Administrator', org: 'F5', fromY: '2021' })],
  extra: [entry({ title: 'Languages', desc: 'English, Mandarin' }), entry({ title: 'Secret', desc: 'x', hidden: true })],
})

describe('版式', () => {
  it('① 分区次序、空分区与隐藏条目不印、自定义分区标题大写', () => {
    const l = cvLayoutOf(FULL)
    expect(l.sections.map((s) => s.head)).toEqual([
      'PROFESSIONAL SUMMARY', 'WORK EXPERIENCE', 'EDUCATION', 'SKILLS', 'PROFESSIONAL CREDENTIALS', 'LANGUAGES',
    ])
    const work = l.sections[1]
    expect(work?.items.map((i) => i.title)).toEqual(['Big data architect'])
    expect(work?.items[0]?.sub).toBe('Huan Tech \u2022 Guangzhou, China')
    expect(l.contact).toEqual(['p@test.local', 'Nepean, ON'])
  })

  it('② 起止写法', () => {
    const e = entry({ fromY: '2015', fromM: '4', toY: '2022', toM: '9' })
    expect(whenOf({ e, kind: 'range' })).toBe('Apr 2015 - Sep 2022')
    expect(whenOf({ e: { ...e, now: true }, kind: 'range' })).toBe('Apr 2015 - Present')
    expect(whenOf({ e, kind: 'one' })).toBe('Apr 2015')
    expect(whenOf({ e: { ...e, fromM: '' }, kind: 'one' })).toBe('2015')
    expect(whenOf({ e: entry({}), kind: 'range' })).toBe('')
    expect(whenOf({ e, kind: 'none' })).toBe('')
  })

  it('③ 要点记号与空行', () => {
    expect(cvLinesOf('- a\n* b\n\u2022 c\n\u00b7 d\n\n  plain  ')).toEqual([
      { text: 'a', bullet: true }, { text: 'b', bullet: true }, { text: 'c', bullet: true }, { text: 'd', bullet: true },
      { text: 'plain', bullet: false },
    ])
  })
})

describe('线格式收窄', () => {
  it('④ 不是字符串当没填、超长截断、年月不合规当没填、不是数组当空、最多 20 条', () => {
    const d = toCvDraft({
      contact: { name: 123 as unknown as string, email: 'x'.repeat(500) },
      work: [
        { title: 'A', fromY: '15', fromM: '13', toY: '2020', toM: '02', now: 'yes' as unknown as boolean },
        'junk' as unknown as object,
        ...Array.from({ length: 30 }, (_, i) => ({ title: 'T' + i })),
      ],
      edu: 'nope' as unknown as [],
    })
    expect(d.contact.name).toBe('')
    expect(d.contact.email.length).toBe(120)
    expect(d.work.length).toBe(19)
    expect(d.work[0]).toMatchObject({ fromY: '', fromM: '', toY: '2020', toM: '2', now: false })
    expect(d.edu).toEqual([])
  })
})

describe('坏字', () => {
  it('⑤ 只查会印出来的字', () => {
    const shown = draft({ work: [entry({ title: 'Engineer', org: '广州公司' })] })
    expect(cvBadCharsOf(cvLayoutOf(shown))).toEqual(['广', '州', '公', '司'])
    const hidden = draft({ work: [entry({ title: 'Engineer', org: '广州公司', hidden: true })] })
    expect(cvBadCharsOf(cvLayoutOf(hidden))).toEqual([])
  })
})

describe('PDF', () => {
  it('⑥ 画得出、抽得回、逐字节稳定、长了换页、每行在版心里', async () => {
    const layout = cvLayoutOf(FULL)
    const a = await cvPdfOf({ pdf: PdfLib, layout })
    const b = await cvPdfOf({ pdf: PdfLib, layout })
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true)
    const text = (await new PDFParse({ data: new Uint8Array(a) }).getText()).text
    for (const s of ['Peng Wang', 'WORK EXPERIENCE', 'Big data architect', 'Apr 2015 - Sep 2022', 'Built pipelines']) {
      expect(text).toContain(s)
    }
    expect(text).not.toContain('Hidden job')
    const long = draft({ work: [entry({ title: 'Job', desc: Array.from({ length: 120 }, (_, i) => '- duty ' + i).join('\n') })] })
    const doc = await PdfLib.PDFDocument.load(await cvPdfOf({ pdf: PdfLib, layout: cvLayoutOf(long) }))
    expect(doc.getPageCount()).toBeGreaterThan(1)
    const pd = await PdfLib.PDFDocument.create()
    const reg = await pd.embedFont(PdfLib.StandardFonts.Helvetica)
    const bold = await pd.embedFont(PdfLib.StandardFonts.HelveticaBold)
    const words = Array.from({ length: 60 }, (_, i) => 'word' + i).join(' ')
    const wide = cvLayoutOf(draft({ work: [entry({ title: words, fromY: '2020', desc: words })] }))
    const m = (f: PdfLib.PDFFont, size: number) => (s: string) => f.widthOfTextAtSize(s, size)
    const rows = cvRowsOf({ layout: wide, m: { name: m(bold, 18), contact: m(reg, 10), head: m(bold, 11), title: m(bold, 10.5), body: m(reg, 10) } })
    for (const r of rows) {
      for (const p of r.parts) {
        const w = (p.bold ? bold : reg).widthOfTextAtSize(p.text, p.size)
        expect(p.x).toBeGreaterThanOrEqual(MARGIN)
        expect(p.x + w).toBeLessThanOrEqual(PAGE_W - MARGIN + 0.01)
      }
    }
  })
})

describe('导入职责排序', () => {
  const row = (noc: string, title: string, examples: string[]) => ({ noc, title, duties: 'Do A\n\nDo B', examples: examples.join('\n') })
  it('⑦ 示例名一字不差排最前、命中名是那个示例名、职责拆条', () => {
    const hits = nocDutyHitsOf({
      q: 'Data Engineer',
      rows: [
        row('21223', 'Database analysts and data engineers', ['database analyst']),
        row('21211', 'Data scientists', ['big data engineer', 'data engineer']),
      ],
    })
    expect(hits.map((h) => h.noc)).toEqual(['21211', '21223'])
    expect(hits[0]?.hit).toBe('data engineer')
    expect(hits[0]?.duties).toEqual(['Do A', 'Do B'])
  })
  it('⑦ LIKE 元字符转义', () => {
    expect('50%_off\\'.replace(LIKE_SPECIAL_RE, LIKE_ESCAPE)).toBe('50\\%\\_off\\\\')
  })
})
