/**
 * gate 桶子桶 edu 的形状:教育经历一段、答案档里的一条明细、从简历提取的一条,与各函数入参。
 * 2026-11-12 按「大于 1000 就拆子桶」(样张 apply/letter):形状本桶自声明、只声明真读的格,不取父桶;
 * 与父桶同名的(EduPick / EduEntry / EduSeedIn / PrefillEdu / TFn)同形,只有本子桶函数在用的入参形状自父桶搬来。
 *
 * @author Frank
 * @time 2026-11-12 10:00:00
 */

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形:键 + 可选插值;本桶自抄,types 不许 import)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 教育经历一段(界面上的三格;存档时拼成「所在地.公立私立.时长」串)。形同父桶 EduPick。
 * 2026-11-12 Frank「这部分不能直接显示具体的年份和学历 证书吗?」:多四格明细(名称、学校、起止年份),都选填。
 */
export type EduPick = {
  /**
   * 院校所在地:省码或 abroad;空串 = 没选。
   */
  prov: string

  /**
   * public / private;空串 = 没选。
   */
  kind: string

  /**
   * y1 / y2 / y3 / master;空串 = 没选。
   */
  len: string

  /**
   * 证书或学历名称;空串 = 没填。
   */
  cred: string

  /**
   * 学校;空串 = 没填。
   */
  school: string

  /**
   * 开始年份(输入中可能不足四位);空串 = 没填。
   */
  from: string

  /**
   * 结束年份;空串 = 没填或在读。
   */
  to: string

  /**
   * 这一段学的专业(CIP 码;2026-11-12 Frank「教育经历 和 专业是不是重复了」:专业并进每一段,档案的专业由各段汇出);空串 = 没选。
   */
  major: string
}

/**
 * 答案档里教育经历明细的一条(形同 lib/quiz EduItem 与父桶 EduEntry,本桶自声明)。
 */
export type EduEntry = {
  /**
   * 「所在地.公立私立.时长」串;三只下拉没选全 = 空串。
   */
  key: string

  /**
   * 证书或学历名称。
   */
  cred: string

  /**
   * 学校。
   */
  school: string

  /**
   * 开始年份(四位数字)或空串。
   */
  from: string

  /**
   * 结束年份(四位数字)或空串。
   */
  to: string

  /**
   * 这一段学的专业(CIP 码;2026-11-12);没选 = 空串。
   */
  major: string
}

/**
 * eduFormRowsOf 的入参:档案里的教育经历明细与老的教育经历串。
 */
export type EduSeedIn = {
  /**
   * 教育经历明细;空列 = 还没存过明细。
   */
  list: EduEntry[]

  /**
   * 教育经历串(没有明细时按它起头)。
   */
  strs: string[]

  /**
   * 档案里的专业码(2026-11-12:各段都还没挂专业的老档案,按序落进各段,多出的补成新段)。
   */
  majors: string[]
}

/**
 * makeEduPick 的入参。
 */
export type EduPickIn = {
  /**
   * 第几段与哪一格。
   */
  cell: EduCellIn

  /**
   * 现在的几段。
   */
  edu: EduPick[]

  /**
   * 写几段。
   */
  setEdu: (v: EduPick[]) => void
}

/**
 * 「改某段某格」的入参(形同父桶 EduCellIn)。
 */
export type EduCellIn = {
  /**
   * 第几段。
   */
  i: number

  /**
   * 哪一格:prov / kind / len;2026-11-12 起还有 cred / school / from / to。
   */
  f: string
}

/**
 * eduCellSetOf 的入参。
 */
export type EduCellSetIn = {
  /**
   * 这一段。
   */
  row: EduPick

  /**
   * 哪一格:prov / kind / len / cred / school / from / to。
   */
  f: string

  /**
   * 新值。
   */
  v: string
}

/**
 * eduLenOf 的入参(2026-11-12 Frank「简历里能抽出来吧」:按名称与年份推课程时长)。
 */
export type EduLenIn = {
  /**
   * 证书或学历名称。
   */
  cred: string

  /**
   * 开始年份(输入中可能不足四位)。
   */
  from: string

  /**
   * 结束年份(输入中可能不足四位)。
   */
  to: string
}

/**
 * makeEduLabel 的入参。
 */
export type EduLabelIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 哪一格:prov / kind / len。
   */
  f: string
}

/**
 * makeEduAdd / makeEduRemove 的入参。
 */
export type EduRowsIn = {
  /**
   * 现在的几段。
   */
  edu: EduPick[]

  /**
   * 写几段。
   */
  setEdu: (v: EduPick[]) => void

  /**
   * 第几段(删用;加时给 0)。
   */
  i: number
}

/**
 * 从简历提取的一条教育经历(/api/resume/prefill 的 education 一项)。形同父桶 PrefillEdu。
 * 2026-11-12 Frank「简历里能抽出来吧」:多三格 —— 院校所在地、公立私立、课程时长。
 */
export type PrefillEdu = {
  /**
   * 证书或学历名称。
   */
  credential: string

  /**
   * 学校。
   */
  school: string

  /**
   * 开始年份或空串。
   */
  from: string

  /**
   * 结束年份或空串。
   */
  to: string

  /**
   * 院校所在地:省码或 abroad;简历看不出 = 空串。
   */
  prov: string

  /**
   * public / private;简历看不出 = 空串。
   */
  kind: string

  /**
   * y1 / y2 / y3 / master;简历看不出 = 空串。
   */
  len: string
}

/**
 * eduMergedOf 的入参。
 */
export type EduMergeIn = {
  /**
   * 表单里现在的几段。
   */
  rows: EduPick[]

  /**
   * 从简历提取的几条。
   */
  items: PrefillEdu[]
}

/**
 * eduMergedOf 的返回。
 */
export type EduMergeOut = {
  /**
   * 并进去之后的几段。
   */
  rows: EduPick[]

  /**
   * 并进去了几条(新放进一段的,和给已有那一段补上了空格的,都算)。
   */
  n: number
}

/**
 * isEduKnown / eduPlacedOf 的入参。
 */
export type EduItemIn = {
  /**
   * 现在的几段。
   */
  rows: EduPick[]

  /**
   * 从简历提取的一条。
   */
  it: PrefillEdu
}

/**
 * isEduSame 的入参(2026-11-13:表单里的一段和提取到的一条是不是同一段教育经历)。
 */
export type EduSameIn = {
  /**
   * 表单里的一段。
   */
  row: EduPick

  /**
   * 从简历提取的一条。
   */
  it: PrefillEdu
}

/**
 * isEduWordsIn 的入参(2026-11-13:一串词是不是全在另一串里)。
 */
export type EduWordsIn = {
  /**
   * 要查的那串词。
   */
  part: string[]

  /**
   * 拿来对的那串词。
   */
  all: string[]
}

/**
 * isEduYearOk 的入参(2026-11-13:两边的一个年份冲不冲突)。
 */
export type EduYearsIn = {
  /**
   * 表单里那一段的年份;空串 = 没填。
   */
  a: string

  /**
   * 从简历提取到的年份;空串或不是四位数字 = 没有。
   */
  b: string
}

/**
 * eduSelOf 的入参(2026-11-12:一只下拉并进来之后取什么值)。
 */
export type EduSelIn = {
  /**
   * 这一段这只下拉现在的值;空串 = 还没选。
   */
  have: string

  /**
   * 从简历提取到的值;空串 = 简历看不出。
   */
  got: string

  /**
   * 这只下拉的选项。
   */
  opts: string[]
}

/**
 * eduWithMajorsOf 的入参。
 */
export type EduMajorsIn = {
  /**
   * 现在的几段。
   */
  rows: EduPick[]

  /**
   * 要落进各段的专业码,按序。
   */
  codes: string[]
}

/**
 * makeEduMajor 的入参(专业选择框里点了一个专业)。
 */
export type EduMajorIn = {
  /**
   * 现在的几段。
   */
  rows: EduPick[]

  /**
   * 写几段。
   */
  setRows: (v: EduPick[]) => void

  /**
   * 正在给第几段选;没在选 = EDU_AT_NONE。
   */
  at: number

  /**
   * 写「正在给第几段选」(选完关框)。
   */
  setAt: (v: number) => void
}
