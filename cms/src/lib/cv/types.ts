/**
 * 生成简历域的形状 —— 草稿(用户填的)、线格式(浏览器交来的,逐格判后才用)、版式(网页预览与 PDF 共用)、
 * 注进来的 pdf-lib(本域不 import 它,由 routes 注入;照 apply 域求职信 PDF 的形)。
 *
 * @author Frank
 * @time 2026-11-07 15:00:00
 */

// =========================================================================
// 1. 草稿
// =========================================================================

/**
 * 联系方式(从我的档案带过来,可改)。
 */
export type CvContact = {
  /**
   * 英文姓名。
   */
  name: string

  /**
   * 邮箱。
   */
  email: string

  /**
   * 电话。
   */
  phone: string

  /**
   * 城市。
   */
  city: string

  /**
   * 省份或国家。
   */
  region: string
}

/**
 * 分区里的一条(工作、教育、证书、志愿、奖项、自定义分区共用一个形;哪格出现由分区定)。
 */
export type CvEntry = {
  /**
   * 职位名 / 专业名称 / 证书名 / 角色 / 奖项名 / 自定义分区名。
   */
  title: string

  /**
   * 雇主 / 学校 / 颁发机构 / 志愿机构。
   */
  org: string

  /**
   * 城市。
   */
  city: string

  /**
   * 省份或国家。
   */
  region: string

  /**
   * 开始年(四位;没填空串)。
   */
  fromY: string

  /**
   * 开始月(1~12;没填空串)。
   */
  fromM: string

  /**
   * 结束年。
   */
  toY: string

  /**
   * 结束月。
   */
  toM: string

  /**
   * 至今。
   */
  now: boolean

  /**
   * 描述(一行一条;行首 - * • 按要点排)。
   */
  desc: string

  /**
   * 隐藏(留着不印)。
   */
  hidden: boolean
}

/**
 * 一份简历的草稿。
 */
export type CvDraft = {
  /**
   * 联系方式。
   */
  contact: CvContact

  /**
   * 个人简介。
   */
  summary: string

  /**
   * 工作经历。
   */
  work: CvEntry[]

  /**
   * 教育经历。
   */
  edu: CvEntry[]

  /**
   * 技能(一行一条)。
   */
  skills: string

  /**
   * 证书执照。
   */
  creds: CvEntry[]

  /**
   * 志愿经历。
   */
  volunteer: CvEntry[]

  /**
   * 奖项荣誉。
   */
  awards: CvEntry[]

  /**
   * 自定义分区(一条一个分区:title 是分区名,desc 是内容)。
   */
  extra: CvEntry[]
}

/**
 * 一个分区的条目。
 */
export type CvEntries = CvEntry[]

/**
 * 几段字(联系方式各行、坏字)。
 */
export type CvTexts = string[]

/**
 * 日期的写法:起止(工作、教育、志愿)/ 一个时间(证书、奖项)/ 不写(自定义分区)。
 */
export type CvDateKind = 'range' | 'one' | 'none'

/**
 * 一行字(多行格拆出来的)。
 */
export type CvLine = {
  /**
   * 字(去掉了要点记号)。
   */
  text: string

  /**
   * 按要点排。
   */
  bullet: boolean
}

/**
 * 几行字。
 */
export type CvLines = CvLine[]

// =========================================================================
// 2. 线格式(浏览器交来的草稿;各格在线上都可能缺,逐格判后才用)
// =========================================================================

/**
 * 线上的联系方式。
 */
export type CvContactJson = {
  /**
   * 英文姓名。
   */
  name?: string

  /**
   * 邮箱。
   */
  email?: string

  /**
   * 电话。
   */
  phone?: string

  /**
   * 城市。
   */
  city?: string

  /**
   * 省份或国家。
   */
  region?: string
}

/**
 * 线上的一条。
 */
export type CvEntryJson = {
  /**
   * 标题。
   */
  title?: string

  /**
   * 机构。
   */
  org?: string

  /**
   * 城市。
   */
  city?: string

  /**
   * 省份或国家。
   */
  region?: string

  /**
   * 开始年。
   */
  fromY?: string

  /**
   * 开始月。
   */
  fromM?: string

  /**
   * 结束年。
   */
  toY?: string

  /**
   * 结束月。
   */
  toM?: string

  /**
   * 至今。
   */
  now?: boolean

  /**
   * 描述。
   */
  desc?: string

  /**
   * 隐藏。
   */
  hidden?: boolean
}

/**
 * 线上的草稿。
 */
export type CvDraftJson = {
  /**
   * 联系方式。
   */
  contact?: CvContactJson

  /**
   * 个人简介。
   */
  summary?: string

  /**
   * 工作经历。
   */
  work?: CvEntryJson[]

  /**
   * 教育经历。
   */
  edu?: CvEntryJson[]

  /**
   * 技能。
   */
  skills?: string

  /**
   * 证书执照。
   */
  creds?: CvEntryJson[]

  /**
   * 志愿经历。
   */
  volunteer?: CvEntryJson[]

  /**
   * 奖项荣誉。
   */
  awards?: CvEntryJson[]

  /**
   * 自定义分区。
   */
  extra?: CvEntryJson[]
}

/**
 * `capOf` 的入参。
 */
export type CapIn = {
  /**
   * 线上的值(可能缺、可能不是字符串)。
   */
  v?: string

  /**
   * 最长几个字。
   */
  max: number
}

/**
 * `yearOf` / `monthOf` 的入参。
 */
export type WireIn = {
  /**
   * 线上的值(可能缺、可能不是字符串)。
   */
  v?: string
}

/**
 * `entriesOf` 的入参。
 */
export type EntriesIn = {
  /**
   * 线上的一个分区(可能缺、可能不是数组)。
   */
  v?: CvEntryJson[]
}

// =========================================================================
// 3. 版式(网页预览与 PDF 共用)
// =========================================================================

/**
 * 版式里的一条。
 */
export type CvItem = {
  /**
   * 标题。
   */
  title: string

  /**
   * 右端的起止(没有空串)。
   */
  when: string

  /**
   * 标题下一行:机构与地点(没有空串)。
   */
  sub: string

  /**
   * 描述各行。
   */
  lines: CvLine[]
}

/**
 * 版式里的一个分区:条目式(工作、教育……)或段落式(简介、技能、自定义分区)。
 */
export type CvSection = {
  /**
   * 分区标题(大写英文)。
   */
  head: string

  /**
   * 条目(段落式为空)。
   */
  items: CvItem[]

  /**
   * 段落各行(条目式为空)。
   */
  lines: CvLine[]
}

/**
 * 一个分区的版式条目。
 */
export type CvItems = CvItem[]

/**
 * 各分区。
 */
export type CvSections = CvSection[]

/**
 * 一个分区或没有(空分区不印)。
 */
export type MaybeCvSection = CvSection | null

/**
 * 一份简历的版式。
 */
export type CvLayout = {
  /**
   * 姓名。
   */
  name: string

  /**
   * 姓名下的联系方式各行。
   */
  contact: string[]

  /**
   * 各分区(空分区与隐藏条目已去掉)。
   */
  sections: CvSection[]
}

/**
 * `itemsOf` 的入参。
 */
export type ItemsIn = {
  /**
   * 一个分区的条目。
   */
  list: CvEntry[]

  /**
   * 日期写法。
   */
  kind: CvDateKind
}

/**
 * `listSectionOf` 的入参。
 */
export type ListSectionIn = {
  /**
   * 分区标题。
   */
  head: string

  /**
   * 一个分区的条目。
   */
  list: CvEntry[]

  /**
   * 日期写法。
   */
  kind: CvDateKind
}

/**
 * `textSectionOf` 的入参。
 */
export type TextSectionIn = {
  /**
   * 分区标题。
   */
  head: string

  /**
   * 段落原文。
   */
  text: string
}

/**
 * `dateOf` 的入参。
 */
export type DateIn = {
  /**
   * 年。
   */
  y: string

  /**
   * 月。
   */
  m: string
}

/**
 * `whenOf` 的入参。
 */
export type WhenIn = {
  /**
   * 一条。
   */
  e: CvEntry

  /**
   * 日期写法。
   */
  kind: CvDateKind
}

/**
 * `joinOf` 的入参。
 */
export type JoinIn = {
  /**
   * 几段(空串跳过)。
   */
  parts: string[]

  /**
   * 分隔。
   */
  sep: string
}

// =========================================================================
// 4. PDF(pdf-lib 由 routes 注入;本域 functions 不 import 它)
// =========================================================================

/**
 * pdf-lib 的字体(只用到量字宽)。外部库定死的签名。
 */
export type CvPdfFont = {
  /**
   * 一段字在某字号下的宽(pt)。外部规定两参。
   */
  widthOfTextAtSize(text: string, size: number): number
}

/**
 * pdf-lib `drawText` 的选项(只用到的格;外部库形状,各格在库里都是可选的)。
 * 字体 F、颜色 C 是 pdf-lib 自己的类型(本文件不许 import,由调用处推断带进来)。
 */
export type CvDrawOpts<F extends CvPdfFont, C> = {
  /**
   * 左起点(pt)。
   */
  x?: number

  /**
   * 基线高度(pt,从页底量)。
   */
  y?: number

  /**
   * 字号。
   */
  size?: number

  /**
   * 字体。
   */
  font?: F

  /**
   * 颜色。
   */
  color?: C
}

/**
 * 一个点(pt)。
 */
export type CvPoint = {
  /**
   * 横。
   */
  x: number

  /**
   * 纵(从页底量)。
   */
  y: number
}

/**
 * pdf-lib `drawLine` 的选项(只用到的格;外部库形状)。
 */
export type CvLineOpts<C> = {
  /**
   * 起点。
   */
  start: CvPoint

  /**
   * 终点。
   */
  end: CvPoint

  /**
   * 粗细。
   */
  thickness?: number

  /**
   * 颜色。
   */
  color?: C
}

/**
 * pdf-lib 的一页(只用到写字与画线)。
 */
export type CvPdfPage<F extends CvPdfFont, C> = {
  /**
   * 写一行字。外部规定两参。
   */
  drawText(text: string, options: CvDrawOpts<F, C>): void

  /**
   * 画一条线。
   */
  drawLine(options: CvLineOpts<C>): void

  /**
   * 画一个实心矩形(现代款页顶的色条)。
   */
  drawRectangle(options: CvRectOpts<C>): void
}

/**
 * pdf-lib `drawRectangle` 的选项(只用到的格;外部库形状)。
 */
export type CvRectOpts<C> = {
  /**
   * 左下角的横坐标(pt)。
   */
  x: number

  /**
   * 左下角的纵坐标(pt,从页底量)。
   */
  y: number

  /**
   * 宽(pt)。
   */
  width: number

  /**
   * 高(pt)。
   */
  height: number

  /**
   * 填充色。
   */
  color: C
}

/**
 * `PDFDocument.create` 的选项(只用到的格)。
 */
export type CvCreateOpts = {
  /**
   * 不写生成 / 修改时刻(同一份重渲逐字节相同)。
   */
  updateMetadata: boolean
}

/**
 * pdf-lib 的文档(只用到的三个方法)。
 */
export type CvPdfDoc<F extends CvPdfFont, C> = {
  /**
   * 嵌标准字体。
   */
  embedFont(name: string): Promise<F>

  /**
   * 加一页(宽高 pt)。
   */
  addPage(size: [number, number]): CvPdfPage<F, C>

  /**
   * 存成字节。
   */
  save(): Promise<Uint8Array>
}

/**
 * 注进来的 pdf-lib(`import * as PdfLib from 'pdf-lib'` 原样传进来)。
 */
export type CvPdfLib<F extends CvPdfFont, C> = {
  /**
   * 文档类(只用 create)。
   */
  PDFDocument: {
    /**
     * 新建空文档。
     */
    create(options: CvCreateOpts): Promise<CvPdfDoc<F, C>>
  }

  /**
   * 标准字体名表(只用两种 Helvetica)。
   */
  StandardFonts: {
    /**
     * Helvetica(WinAnsi 编码)。
     */
    Helvetica: string

    /**
     * Helvetica 粗体。
     */
    HelveticaBold: string
  }

  /**
   * 造一个 RGB 颜色(各分量 0~1)。外部规定三参。
   */
  rgb(red: number, green: number, blue: number): C
}

/**
 * 量一段字宽的函数。
 */
export type CvMeasureFn = (text: string) => number

/**
 * 各种字的量宽函数(姓名、联系方式、分区标题、条目标题、正文)。
 */
export type CvMeasures = {
  /**
   * 姓名(粗体大字)。
   */
  name: CvMeasureFn

  /**
   * 联系方式。
   */
  contact: CvMeasureFn

  /**
   * 分区标题(粗体)。
   */
  head: CvMeasureFn

  /**
   * 条目标题(粗体)。
   */
  title: CvMeasureFn

  /**
   * 正文。
   */
  body: CvMeasureFn
}

/**
 * 一行里的一段字。
 */
export type CvPart = {
  /**
   * 字。
   */
  text: string

  /**
   * 左起点(pt)。
   */
  x: number

  /**
   * 字号。
   */
  size: number

  /**
   * 粗体。
   */
  bold: boolean

  /**
   * 灰字。
   */
  gray: boolean
}

/**
 * 排好的一行(从上往下画;放不下就换页)。
 */
export type CvRow = {
  /**
   * 这一行占多高。
   */
  h: number

  /**
   * 这一行之后还要一起放下多高(分区标题不落单)。
   */
  keep: number

  /**
   * 这一行的几段字。
   */
  parts: CvPart[]

  /**
   * 这一行是一条横线。
   */
  rule: boolean
}

/**
 * 排好的各行。
 */
export type CvRows = CvRow[]

/**
 * `cvRowsOf` 的入参。
 */
export type CvRowsIn = {
  /**
   * 版式。
   */
  layout: CvLayout

  /**
   * 量宽函数。
   */
  m: CvMeasures
}

/**
 * `sectionRowsOf` 的入参。
 */
export type SectionRowsIn = {
  /**
   * 一个分区。
   */
  sec: CvSection

  /**
   * 量宽函数。
   */
  m: CvMeasures
}

/**
 * `itemRowsOf` 的入参。
 */
export type ItemRowsIn = {
  /**
   * 一条。
   */
  item: CvItem

  /**
   * 量宽函数。
   */
  m: CvMeasures
}

/**
 * `lineRowsOf` 的入参。
 */
export type LineRowsIn = {
  /**
   * 一行字。
   */
  line: CvLine

  /**
   * 正文量宽。
   */
  measure: CvMeasureFn
}

/**
 * `textRowsOf` 的入参。
 */
export type TextRowsIn = {
  /**
   * 一段字。
   */
  text: string

  /**
   * 量宽。
   */
  measure: CvMeasureFn

  /**
   * 左起点(pt)。
   */
  x: number

  /**
   * 字号。
   */
  size: number

  /**
   * 行高。
   */
  h: number

  /**
   * 粗体。
   */
  bold: boolean

  /**
   * 灰字。
   */
  gray: boolean
}

/**
 * `centerRowOf` 的入参。
 */
export type CenterRowIn = {
  /**
   * 字。
   */
  text: string

  /**
   * 量宽。
   */
  measure: CvMeasureFn

  /**
   * 字号。
   */
  size: number

  /**
   * 行高。
   */
  h: number

  /**
   * 粗体。
   */
  bold: boolean
}

/**
 * `cvPdfOf` 的入参。
 */
export type CvPdfIn<F extends CvPdfFont, C> = {
  /**
   * 注进来的 pdf-lib。
   */
  pdf: CvPdfLib<F, C>

  /**
   * 版式。
   */
  layout: CvLayout
}

/**
 * `pdfOf` 的入参:注进来的 pdf-lib、版式与要不要主色。
 */
export type CvDrawIn<F extends CvPdfFont, C> = {
  /**
   * 注进来的 pdf-lib。
   */
  pdf: CvPdfLib<F, C>

  /**
   * 版式。
   */
  layout: CvLayout

  /**
   * 现代款:页顶色条,姓名、分区标题与标题下的横线用主色;传统款 false。
   */
  accent: boolean
}

/**
 * `cvPdfOf` 的返回(PDF 字节)。
 */
export type CvPdfOut = Promise<Uint8Array>
