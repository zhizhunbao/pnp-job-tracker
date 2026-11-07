/**
 * 生成简历域的函数 —— 草稿排成版式(网页预览与 PDF 共用一份排法)、查写不进 PDF 的字、版式画成 PDF(pdf-lib 由 routes 注入)、
 * 浏览器交来的草稿逐格收窄(行构造器)。版式照 Job Bank Resume Builder 的传统模板:姓名居中、联系方式居中、
 * 分区标题大写加横线、条目标题粗体右端起止、下一行灰字机构与地点、描述按要点排;空分区与隐藏条目不印。
 *
 * @author Frank
 * @time 2026-11-07 15:00:00
 */
import { coverLinesOf, makeMeasure, pdfBadCharsOf } from '../apply'
import {
  BASE_LIFT, BODY_H, BODY_SIZE, BULLET, BULLET_RE, BULLET_TEXT_X, BULLET_X, CONTACT_H, CONTACT_SIZE, CV_ITEMS_MAX,
  CV_LINE_MAX, CV_TEXT_MAX, DATE_GAP, DATE_SEP, GRAY, HALF, HEAD_AWARDS, HEAD_CREDS, HEAD_EDU, HEAD_H, HEAD_KEEP, HEAD_SIZE,
  HEAD_SKILLS, HEAD_SUMMARY, HEAD_VOLUNTEER, HEAD_WORK, INK, ITEM_GAP, KIND_NONE, KIND_ONE, KIND_RANGE, LINE_SEP, MARGIN, MONTH_EN, MONTH_MAX, MONTH_MIN,
  MONTH_YEAR_SEP, NAME_H, NAME_SIZE, PAGE_H, PAGE_W, PLACE_SEP, PRESENT, RULE_H, RULE_W, SUB_SEP, TEXT_NONE, TITLE_SIZE, YEAR_RE,
} from './constants'
import type {
  CapIn, CenterRowIn, CvContact, CvContactJson, CvDraft, CvDraftJson, CvEntries, CvEntry, CvEntryJson, CvItems, CvLayout,
  CvLines, CvRows, CvTexts, MaybeCvSection,
  CvPdfFont, CvPdfIn, CvPdfOut, CvRow, CvRowsIn, CvSection, DateIn, EntriesIn, ItemRowsIn, ItemsIn, JoinIn, LineRowsIn,
  ListSectionIn, SectionRowsIn, TextRowsIn, TextSectionIn, WhenIn, WireIn,
} from './types'

// =========================================================================
// 1. 草稿
// =========================================================================

/**
 * 写不进 PDF 的字(Helvetica 只认西文;简历是英文的,中文雇主名要写成英文):只查会印出来的字。
 *
 * @param layout 版式。
 * @returns 去重后的坏字;没有给空数组。
 */
export function cvBadCharsOf(layout: CvLayout): CvTexts {
  const all: string[] = [layout.name]
  for (const c of layout.contact) {
    all.push(c)
  }
  for (const sec of layout.sections) {
    all.push(sec.head)
    for (const line of sec.lines) {
      all.push(line.text)
    }
    for (const item of sec.items) {
      all.push(item.title, item.when, item.sub)
      for (const line of item.lines) {
        all.push(line.text)
      }
    }
  }
  return pdfBadCharsOf(all.join(LINE_SEP))
}

// =========================================================================
// 2. 版式
// =========================================================================

/**
 * 草稿排成版式(分区次序照 Job Bank 传统模板;空分区、隐藏条目、没标题的条目不印)。
 *
 * @param d 草稿。
 * @returns 版式。
 */
export function cvLayoutOf(d: CvDraft): CvLayout {
  const all: Array<CvSection | null> = [
    textSectionOf({ head: HEAD_SUMMARY, text: d.summary }),
    listSectionOf({ head: HEAD_WORK, list: d.work, kind: KIND_RANGE }),
    listSectionOf({ head: HEAD_EDU, list: d.edu, kind: KIND_RANGE }),
    textSectionOf({ head: HEAD_SKILLS, text: d.skills }),
    listSectionOf({ head: HEAD_CREDS, list: d.creds, kind: KIND_ONE }),
    listSectionOf({ head: HEAD_VOLUNTEER, list: d.volunteer, kind: KIND_RANGE }),
    listSectionOf({ head: HEAD_AWARDS, list: d.awards, kind: KIND_ONE }),
  ]
  for (const e of d.extra) {
    if (e.hidden === false) {
      all.push(textSectionOf({ head: e.title.trim().toUpperCase(), text: e.desc }))
    }
  }
  const sections: CvSection[] = []
  for (const s of all) {
    if (s != null && s.head !== TEXT_NONE) {
      sections.push(s)
    }
  }
  return { name: d.contact.name.trim(), contact: contactLinesOf(d.contact), sections }
}

/**
 * 姓名下的联系方式各行:邮箱、电话、「城市, 省份」(没填的不出)。
 *
 * @param c 联系方式。
 * @returns 各行。
 */
function contactLinesOf(c: CvContact): CvTexts {
  const out: string[] = []
  for (const s of [c.email.trim(), c.phone.trim(), joinOf({ parts: [c.city, c.region], sep: PLACE_SEP })]) {
    if (s !== TEXT_NONE) {
      out.push(s)
    }
  }
  return out
}

/**
 * 段落式分区(简介、技能、自定义分区);没内容给 null。
 *
 * @param x 分区标题与原文。
 * @returns 分区或 null。
 */
function textSectionOf(x: TextSectionIn): MaybeCvSection {
  const lines = cvLinesOf(x.text)
  if (lines.length === 0) {
    return null
  }
  return { head: x.head, items: [], lines }
}

/**
 * 条目式分区;一条能印的都没有给 null。
 *
 * @param x 分区标题、条目与日期写法。
 * @returns 分区或 null。
 */
function listSectionOf(x: ListSectionIn): MaybeCvSection {
  const items = itemsOf({ list: x.list, kind: x.kind })
  if (items.length === 0) {
    return null
  }
  return { head: x.head, items, lines: [] }
}

/**
 * 一个分区里能印的条目(不隐藏、有标题)。
 *
 * @param x 条目与日期写法。
 * @returns 版式条目。
 */
function itemsOf(x: ItemsIn): CvItems {
  const out: CvItems = []
  for (const e of x.list) {
    if (e.hidden || e.title.trim() === TEXT_NONE) {
      continue
    }
    const place = joinOf({ parts: [e.city, e.region], sep: PLACE_SEP })
    out.push({
      title: e.title.trim(),
      when: whenOf({ e, kind: x.kind }),
      sub: joinOf({ parts: [e.org, place], sep: SUB_SEP }),
      lines: cvLinesOf(e.desc),
    })
  }
  return out
}

/**
 * 右端的起止:「Apr 2015 - Sep 2022」「2015 - Present」;一个时间的只写开始那格。
 *
 * @param x 一条与日期写法。
 * @returns 起止;没填空串。
 */
export function whenOf(x: WhenIn): string {
  if (x.kind === KIND_NONE) {
    return TEXT_NONE
  }
  const from = dateOf({ y: x.e.fromY, m: x.e.fromM })
  if (x.kind === KIND_ONE) {
    return from
  }
  let to = dateOf({ y: x.e.toY, m: x.e.toM })
  if (x.e.now) {
    to = PRESENT
  }
  return joinOf({ parts: [from, to], sep: DATE_SEP })
}

/**
 * 一个时间:「Apr 2015」;月份没填只写年,年没填不写。
 *
 * @param x 年与月。
 * @returns 时间;没填空串。
 */
function dateOf(x: DateIn): string {
  if (x.y === TEXT_NONE) {
    return TEXT_NONE
  }
  const m = Number(x.m)
  if (Number.isInteger(m) && m >= MONTH_MIN && m <= MONTH_MAX) {
    return MONTH_EN[m - 1] + MONTH_YEAR_SEP + x.y
  }
  return x.y
}

/**
 * 几段去头尾空格、跳过空的,用分隔连起来。
 *
 * @param x 几段与分隔。
 * @returns 连好的串。
 */
function joinOf(x: JoinIn): string {
  const kept: string[] = []
  for (const p of x.parts) {
    const s = p.trim()
    if (s !== TEXT_NONE) {
      kept.push(s)
    }
  }
  return kept.join(x.sep)
}

/**
 * 多行格拆成各行:去头尾空格、丢空行,行首 - * • 去掉后按要点排。
 *
 * @param text 原文。
 * @returns 各行。
 */
export function cvLinesOf(text: string): CvLines {
  const out: CvLines = []
  for (const raw of text.split(LINE_SEP)) {
    const line = raw.trim()
    if (line === TEXT_NONE) {
      continue
    }
    const bullet = BULLET_RE.test(line)
    out.push({ text: line.replace(BULLET_RE, TEXT_NONE).trim(), bullet })
  }
  return out
}

// =========================================================================
// 3. PDF
// =========================================================================

/**
 * 版式画成 PDF(Letter 纸、四分之三英寸边距、Helvetica;放不下自动换页,分区标题不落单在页底;
 * 不写生成时刻,同一份重渲逐字节相同)。字先过 `cvBadCharsOf`,坏字到这里会被 pdf-lib 抛错。
 *
 * @param x 注进来的 pdf-lib 与版式。
 * @returns PDF 字节。
 */
export async function cvPdfOf<F extends CvPdfFont, C>(x: CvPdfIn<F, C>): CvPdfOut {
  const doc = await x.pdf.PDFDocument.create({ updateMetadata: false })
  const reg = await doc.embedFont(x.pdf.StandardFonts.Helvetica)
  const bold = await doc.embedFont(x.pdf.StandardFonts.HelveticaBold)
  const ink = x.pdf.rgb(INK, INK, INK)
  const gray = x.pdf.rgb(GRAY, GRAY, GRAY)
  const rows = cvRowsOf({
    layout: x.layout,
    m: {
      name: makeMeasure({ font: bold, size: NAME_SIZE }),
      contact: makeMeasure({ font: reg, size: CONTACT_SIZE }),
      head: makeMeasure({ font: bold, size: HEAD_SIZE }),
      title: makeMeasure({ font: bold, size: TITLE_SIZE }),
      body: makeMeasure({ font: reg, size: BODY_SIZE }),
    },
  })
  let page = doc.addPage([PAGE_W, PAGE_H])
  let y = PAGE_H - MARGIN
  for (const row of rows) {
    if (y - row.h - row.keep < MARGIN) {
      page = doc.addPage([PAGE_W, PAGE_H])
      y = PAGE_H - MARGIN
    }
    y -= row.h
    for (const part of row.parts) {
      let font = reg
      if (part.bold) {
        font = bold
      }
      let color = ink
      if (part.gray) {
        color = gray
      }
      page.drawText(part.text, { x: part.x, y: y + BASE_LIFT, size: part.size, font, color })
    }
    if (row.rule) {
      const ly = y + RULE_H
      page.drawLine({ start: { x: MARGIN, y: ly }, end: { x: PAGE_W - MARGIN, y: ly }, thickness: RULE_W, color: ink })
    }
  }
  return doc.save()
}

/**
 * 版式排成一行行(纯排版,不碰 pdf-lib;量宽函数注进来)。
 *
 * @param x 版式与量宽函数。
 * @returns 从上到下各行。
 */
export function cvRowsOf(x: CvRowsIn): CvRows {
  let rows: CvRow[] = []
  if (x.layout.name !== TEXT_NONE) {
    rows.push(centerRowOf({ text: x.layout.name, measure: x.m.name, size: NAME_SIZE, h: NAME_H, bold: true }))
  }
  for (const c of x.layout.contact) {
    rows.push(centerRowOf({ text: c, measure: x.m.contact, size: CONTACT_SIZE, h: CONTACT_H, bold: false }))
  }
  for (const sec of x.layout.sections) {
    rows = rows.concat(sectionRowsOf({ sec, m: x.m }))
  }
  return rows
}

/**
 * 居中的一行(姓名、联系方式)。
 *
 * @param x 字、量宽、字号、行高与粗细。
 * @returns 一行。
 */
function centerRowOf(x: CenterRowIn): CvRow {
  const part = { text: x.text, x: (PAGE_W - x.measure(x.text)) / HALF, size: x.size, bold: x.bold, gray: false }
  return { h: x.h, keep: 0, parts: [part], rule: false }
}

/**
 * 一个分区:标题、横线、各条或各段落行。
 *
 * @param x 分区与量宽函数。
 * @returns 各行。
 */
function sectionRowsOf(x: SectionRowsIn): CvRows {
  const head = { text: x.sec.head, x: MARGIN, size: HEAD_SIZE, bold: true, gray: false }
  let rows: CvRow[] = [{ h: HEAD_H, keep: HEAD_KEEP, parts: [head], rule: false }, { h: RULE_H, keep: 0, parts: [], rule: true }]
  for (const line of x.sec.lines) {
    rows = rows.concat(lineRowsOf({ line, measure: x.m.body }))
  }
  for (const [i, item] of x.sec.items.entries()) {
    if (i > 0) {
      rows.push({ h: ITEM_GAP, keep: 0, parts: [], rule: false })
    }
    rows = rows.concat(itemRowsOf({ item, m: x.m }))
  }
  return rows
}

/**
 * 一条:粗体标题(右端起止;标题太长折到起止左边)、灰字机构与地点、描述各行。
 *
 * @param x 一条与量宽函数。
 * @returns 各行。
 */
function itemRowsOf(x: ItemRowsIn): CvRows {
  const width = PAGE_W - MARGIN - MARGIN
  let whenW = 0
  if (x.item.when !== TEXT_NONE) {
    whenW = x.m.body(x.item.when) + DATE_GAP
  }
  const titleLines = coverLinesOf({ text: x.item.title, measure: x.m.title, maxWidth: width - whenW })
  let rows: CvRow[] = []
  for (const [i, t] of titleLines.entries()) {
    const parts = [{ text: t, x: MARGIN, size: TITLE_SIZE, bold: true, gray: false }]
    if (i === 0 && x.item.when !== TEXT_NONE) {
      parts.push({ text: x.item.when, x: PAGE_W - MARGIN - x.m.body(x.item.when), size: BODY_SIZE, bold: false, gray: false })
    }
    rows.push({ h: BODY_H, keep: 0, parts, rule: false })
  }
  if (x.item.sub !== TEXT_NONE) {
    rows = rows.concat(textRowsOf({ text: x.item.sub, measure: x.m.body, x: MARGIN, size: BODY_SIZE, h: BODY_H, bold: false, gray: true }))
  }
  for (const line of x.item.lines) {
    rows = rows.concat(lineRowsOf({ line, measure: x.m.body }))
  }
  return rows
}

/**
 * 描述或段落的一行:要点行首出记号、正文缩进对齐;普通行顶格。
 *
 * @param x 一行字与正文量宽。
 * @returns 折好的各行。
 */
function lineRowsOf(x: LineRowsIn): CvRows {
  if (x.line.bullet === false) {
    return textRowsOf({ text: x.line.text, measure: x.measure, x: MARGIN, size: BODY_SIZE, h: BODY_H, bold: false, gray: false })
  }
  const rows = textRowsOf({
    text: x.line.text, measure: x.measure, x: MARGIN + BULLET_TEXT_X, size: BODY_SIZE, h: BODY_H, bold: false, gray: false,
  })
  const first = rows[0]
  if (first != null) {
    first.parts.unshift({ text: BULLET, x: MARGIN + BULLET_X, size: BODY_SIZE, bold: false, gray: false })
  }
  return rows
}

/**
 * 一段字从某个左起点折到版心右缘。
 *
 * @param x 字、量宽、左起点、字号、行高、粗细与灰度。
 * @returns 各行。
 */
function textRowsOf(x: TextRowsIn): CvRows {
  const rows: CvRow[] = []
  for (const t of coverLinesOf({ text: x.text, measure: x.measure, maxWidth: PAGE_W - MARGIN - x.x })) {
    rows.push({ h: x.h, keep: 0, parts: [{ text: t, x: x.x, size: x.size, bold: x.bold, gray: x.gray }], rule: false })
  }
  return rows
}

// =========================================================================
// 行构造器(浏览器交来的草稿逐格收窄:不是字符串当没填、超长截断、年月不合规当没填、每分区最多几条)
// =========================================================================

/**
 * 线上的草稿收成干净草稿。
 *
 * @param j 线上的草稿。
 * @returns 草稿。
 */
export function toCvDraft(j: CvDraftJson): CvDraft {
  let contact: CvContactJson = {}
  if (j.contact != null) {
    contact = j.contact
  }
  return {
    contact: toCvContact(contact),
    summary: capOf({ v: j.summary, max: CV_TEXT_MAX }),
    work: entriesOf({ v: j.work }),
    edu: entriesOf({ v: j.edu }),
    skills: capOf({ v: j.skills, max: CV_TEXT_MAX }),
    creds: entriesOf({ v: j.creds }),
    volunteer: entriesOf({ v: j.volunteer }),
    awards: entriesOf({ v: j.awards }),
    extra: entriesOf({ v: j.extra }),
  }
}

/**
 * 线上的联系方式收窄。
 *
 * @param c 线上的联系方式。
 * @returns 联系方式。
 */
export function toCvContact(c: CvContactJson): CvContact {
  return {
    name: capOf({ v: c.name, max: CV_LINE_MAX }),
    email: capOf({ v: c.email, max: CV_LINE_MAX }),
    phone: capOf({ v: c.phone, max: CV_LINE_MAX }),
    city: capOf({ v: c.city, max: CV_LINE_MAX }),
    region: capOf({ v: c.region, max: CV_LINE_MAX }),
  }
}

/**
 * 线上的一个分区收窄(不是数组当空;每分区最多几条)。
 *
 * @param x 线上的一个分区。
 * @returns 各条。
 */
function entriesOf(x: EntriesIn): CvEntries {
  const out: CvEntries = []
   
  if (x.v == null || Array.isArray(x.v) === false) {
    return out
  }
  for (const e of x.v.slice(0, CV_ITEMS_MAX)) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- 线格式:数组里可能混着不是对象的值
    if (typeof e === 'object' && e != null) {
      out.push(toCvEntry(e))
    }
  }
  return out
}

/**
 * 线上的一条收窄。
 *
 * @param e 线上的一条。
 * @returns 一条。
 */
export function toCvEntry(e: CvEntryJson): CvEntry {
  return {
    title: capOf({ v: e.title, max: CV_LINE_MAX }),
    org: capOf({ v: e.org, max: CV_LINE_MAX }),
    city: capOf({ v: e.city, max: CV_LINE_MAX }),
    region: capOf({ v: e.region, max: CV_LINE_MAX }),
    fromY: yearOf({ v: e.fromY }),
    fromM: monthOf({ v: e.fromM }),
    toY: yearOf({ v: e.toY }),
    toM: monthOf({ v: e.toM }),
    now: e.now === true,
    desc: capOf({ v: e.desc, max: CV_TEXT_MAX }),
    hidden: e.hidden === true,
  }
}

/**
 * 线上的一格字:不是字符串当没填,超长截断。
 *
 * @param x 线上的值与上限。
 * @returns 字。
 */
function capOf(x: CapIn): string {
  if (typeof x.v !== 'string') {
    return TEXT_NONE
  }
  return x.v.slice(0, x.max)
}

/**
 * 线上的年:四位数字才认。
 *
 * @param x 线上的值。
 * @returns 年;不合规空串。
 */
function yearOf(x: WireIn): string {
  if (typeof x.v === 'string' && YEAR_RE.test(x.v)) {
    return x.v
  }
  return TEXT_NONE
}

/**
 * 线上的月:1~12 才认。
 *
 * @param x 线上的值。
 * @returns 月;不合规空串。
 */
function monthOf(x: WireIn): string {
  if (typeof x.v !== 'string') {
    return TEXT_NONE
  }
  const m = Number(x.v)
  if (Number.isInteger(m) && m >= MONTH_MIN && m <= MONTH_MAX) {
    return String(m)
  }
  return TEXT_NONE
}
