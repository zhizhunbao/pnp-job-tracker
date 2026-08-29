/**
 * legal 域(法务四页正文)的自足形状:三语文档的形、三件视图的 props 契约、
 * 段落切片与两个派生函数的入参。
 * 文档形状(LegalDoc)**本域自己声明**,不从 lib/legal 取 —— 宪法 08-25「types 自声明」:
 * 只声明本域真读的那几格,结构相同即兼容,下层多一格不必跟着改,真读不到会当场 tsc 红。
 * 整页外框、顶栏、页脚都不在这里:那是页面门的拼装(<Frame><Header/><视图/><Footer/></Frame>),
 * 本域只出 Frame 轨里的那块白卡。
 *
 * @author Frank
 * @time 2026-08-27 23:08:05
 */

/**
 * 界面语言(三字面量各域自抄;法务正文按语言整份取一份)。
 */
export type LegalLang = 'zh' | 'en' | 'ko'

/**
 * 法务正文的一节。
 */
export type LegalDocSection = {
  /**
   * 节标题。
   */
  h: string

  /**
   * 节内段落(每段可能带一个支持邮箱占位记号)。
   */
  body: string[]
}

/**
 * 一页法务正文(三语字典里的一门语言那份)。内容各页自带三语字典(章节数组),
 * lib/i18n 只管 UI 壳 —— 法务长文不进全局字典。
 */
export type LegalDoc = {
  /**
   * 页标题。
   */
  title: string

  /**
   * 更新日(展示原文,不再格式化)。
   */
  updated: string

  /**
   * 正文各节。
   */
  sections: LegalDocSection[]
}

/**
 * Legal(法务页正文白卡)的 props。
 */
export type LegalIn = {
  /**
   * 三语正文字典(按当前界面语言整份取一份)。
   */
  docs: Record<LegalLang, LegalDoc>

  /**
   * 标题前的图标;可省 —— /about 不带图标(三个法务页各带自己那枚)。
   */
  icon?: React.ReactNode
}

/**
 * LegalSection(正文一节)的 props。
 */
export type LegalSectionIn = {
  /**
   * 这一节的标题与段落。
   */
  section: LegalDocSection
}

/**
 * LegalParagraph(正文一段)的 props。
 */
export type LegalParagraphIn = {
  /**
   * 段落原文(含支持邮箱占位记号)。
   */
  text: string
}

/**
 * 段落按支持邮箱占位记号切开后的一片。
 */
export type LegalPart = {
  /**
   * 这一片的纯文本(记号在段首或段尾时是空串,照样渲以保住前后间距)。
   */
  text: string

  /**
   * 这一片后面是否紧跟一个支持邮箱链接(末片不跟 —— 切片数永远比记号数多一)。
   */
  email: boolean
}

/**
 * emailPartsOf 的入参:一段正文原文。
 */
export type EmailPartsOfIn = {
  /**
   * 段落原文。
   */
  text: string
}

/**
 * mailtoOf 的入参:支持邮箱地址。
 */
export type MailtoOfIn = {
  /**
   * 支持邮箱地址。
   */
  email: string
}
