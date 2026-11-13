/**
 * gate 桶子桶 cv 的形状:生成出来的一份简历、一行提示、接口回包与各函数入参。
 * 2026-11-12 Frank「最后用 sonnet 生成简历,可以选择模板」:形状本桶自声明,不取父桶。
 *
 * @author Frank
 * @time 2026-11-12 18:00:00
 */

/**
 * 生成出来、还没存的一份简历。
 */
export type CvDoc = {
  /**
   * 浏览器里的临时地址(预览与下载用)。
   */
  url: string

  /**
   * 文件名。
   */
  fileName: string

  /**
   * PDF 文件(设为我的简历时上传它)。
   */
  file: File
}

/**
 * 生成出来的一份简历或没有。
 */
export type MaybeCvDoc = CvDoc | null

/**
 * 一行提示。
 */
export type CvMsg = {
  /**
   * 词条键;空串 = 不出。
   */
  key: string

  /**
   * 颜色:ok / info / err。
   */
  kind: 'ok' | 'info' | 'err'
}

/**
 * 生成接口的回包(线格式:成功带 pdf / fileName / left,失败带 error)。
 */
export type CvGenJson = {
  /**
   * PDF 的 base64。
   */
  pdf?: string

  /**
   * 文件名。
   */
  fileName?: string

  /**
   * 还剩几个额度。
   */
  left?: number

  /**
   * 错误码。
   */
  error?: string
}

/**
 * 额度查询接口的回包。
 */
export type CreditJson = {
  /**
   * 还剩几个额度。
   */
  left?: number
}

/**
 * loadCvLeft 的入参。
 */
export type CvLeftIn = {
  /**
   * 落「还剩几个额度」。
   */
  setLeft: (v: number) => void
}

/**
 * makeCvGen 的入参。
 */
export type CvGenIn = {
  /**
   * 选的模板。
   */
  tpl: string

  /**
   * 先存档案、存成了再跑后面那一步(父桶整机给)。
   */
  saveThen: (after: () => void) => () => void

  /**
   * 上一份生成出来的(重新生成时把它的临时地址收回)。
   */
  doc: MaybeCvDoc

  /**
   * 落「生成中」。
   */
  setBusy: (v: boolean) => void

  /**
   * 落提示。
   */
  setMsg: (v: CvMsg) => void

  /**
   * 落生成出来的那一份(预览框随之开)。
   */
  setDoc: (v: MaybeCvDoc) => void

  /**
   * 落「升级框开没开」。
   */
  setUpgrade: (v: boolean) => void

  /**
   * 落「还剩几个额度」。
   */
  setLeft: (v: number) => void
}

/**
 * makeCvSet 的入参。
 */
export type CvSetIn = {
  /**
   * 生成出来的那一份。
   */
  doc: MaybeCvDoc

  /**
   * 落「正在存」。
   */
  setSaving: (v: boolean) => void

  /**
   * 落提示。
   */
  setMsg: (v: CvMsg) => void

  /**
   * 落生成出来的那一份(存成了关预览框)。
   */
  setDoc: (v: MaybeCvDoc) => void
}

/**
 * runCvSet 的入参。
 */
export type CvSetRunIn = {
  /**
   * 要存的那一份。
   */
  doc: CvDoc

  /**
   * makeCvSet 的入参。
   */
  x: CvSetIn
}

/**
 * makeCvDocClose 的入参。
 */
export type CvDocCloseIn = {
  /**
   * 生成出来的那一份。
   */
  doc: MaybeCvDoc

  /**
   * 落生成出来的那一份。
   */
  setDoc: (v: MaybeCvDoc) => void
}

/**
 * cvDocOf 的入参。
 */
export type CvDocIn = {
  /**
   * PDF 的 base64。
   */
  pdf: string

  /**
   * 文件名。
   */
  fileName: string
}
