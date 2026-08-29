/**
 * cases 域(处境页)的自足形状:全部组件的 props 契约都住这里,tsx 签名一行干净
 * (2026-08-27 Frank 拍板:签名里不许摆内联对象类型挂注释 —— 那不是 JSDoc 的家)。
 * 判定核输出的形状(CaseAnswer / PathwayVerdict)**不重抄** —— 几十格的引擎输出,
 * 借名走下面那行逐行特批 import type(先例 i18n 键型护栏)。
 *
 * @author Frank
 * @time 2026-08-27 01:30:00
 */
// eslint-disable-next-line local/no-import-in-leaf -- 引擎输出形状特批(宪法:引用引擎输出的形状走逐行 import type,先例 icons/types):判定核几十格契约,本域只透传不读格
import type { CaseAnswer, PathwayVerdict, VerdictReason } from '@/lib/ruling/server'

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形:键 + 可选插值 —— 宪法 08-25「types 自声明」,
 * 形状本域自己声明,不从别的域取;真参数是 lib/i18n 那个带附加成员的交叉类型,
 * 结构上兜得住)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 界面语言(三字面量各域自抄;引号跟语言走那一格要读它)。
 */
export type CasesLang = 'zh' | 'en' | 'ko'

/**
 * CaseLead(段首 bullet 列)的 props。
 */
export type CaseLeadIn = {
  /**
   * 一条一行的段首说明(空串条目由体内滤掉)。
   */
  lines: string[]
}

/**
 * schema.org 的 ListItem 一条(索引页 JSON-LD 用)。
 */
export type CaseListItem = {
  /**
   * schema.org 类型名,固定 'ListItem'。
   */
  // eslint-disable-next-line local/no-bare-strings -- '@type' 是 schema.org 线格式定死的键名,types.ts 不许 import,只能就地写
  '@type': string

  /**
   * 列表序号(从 1 起)。
   */
  position: number

  /**
   * 列表项名称(中文处境标签 —— 收录主体是中文长尾词)。
   */
  name: string

  /**
   * 处境详情页的绝对链接。
   */
  url: string
}

/**
 * CaseRow(索引页一行)的 props。
 */
export type CaseRowIn = {
  /**
   * 案例编号(C01…;标签文案按它取)。
   */
  id: string

  /**
   * 详情页 slug;空串 = 没有事实层,不出「完整案例」钮 —— 答不了就不假装能答。
   */
  page: string

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * CaseQuote(用户原话卡)的 props。
 */
export type CaseQuoteIn = {
  /**
   * 当前界面语言(引号跟语言走)。
   */
  lang: CasesLang

  /**
   * 案例编号。
   */
  caseId: string

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * CaseMine(「测测我自己的」CTA 卡)的 props。
 */
export type CaseMineIn = {
  /**
   * 案例编号(埋点带上,看哪条处境导流最多)。
   */
  caseId: string

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 通道档位(0 = offer 到手即可走 … 3 = 最慢;判定核的 tier 取值域)。
 * 写在 types 抽屉是因为 functions 的魔数闸不认类型字面量里的 2/3 ——
 * 档位的语义在这里挂说明,签名引用这个名字。
 */
export type CaseTierBand = 0 | 1 | 2 | 3

/**
 * CasePath(一条通道块)的 props。
 */
export type CasePathIn = {
  /**
   * 该通道的判定(结论、档位、理由全来自判定核 —— 一句结论都不是手写的)。
   */
  v: PathwayVerdict

  /**
   * 队列序号;不排序的位置(他问的那条 / 走不通的)给 null 不渲。
   */
  rank: number | null

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 整份处境答案;这里只读在招量(openings)与该省运营数字(ops)两格。
   */
  answer: CaseAnswer
}

/**
 * CaseReason(一条判定理由 bullet)的 props。
 */
export type CaseReasonIn = {
  /**
   * 判定核给的一条理由(官方原句原样挂,页面不改写、不加戏)。
   */
  r: VerdictReason

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * CaseAsked(「他问的那个省」卡)的 props。
 */
export type CaseAskedIn = {
  /**
   * 整份处境答案(读 asked 与 tiers 两格)。
   */
  answer: CaseAnswer

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * CaseOthers(「其余路径」卡)的 props。
 */
export type CaseOthersIn = {
  /**
   * 整份处境答案。
   */
  answer: CaseAnswer

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * CaseBlocked(「现在走不通的」卡)的 props。
 */
export type CaseBlockedIn = {
  /**
   * 整份处境答案(读 excluded 一格)。
   */
  answer: CaseAnswer

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * CaseFirstStep(「第一步」卡)的 props。
 */
export type CaseFirstStepIn = {
  /**
   * 整份处境答案(读 trainable 与 trainableTotal 两格)。
   */
  answer: CaseAnswer

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * Case(处境页正文)的 props。
 */
export type CaseIn = {
  /**
   * 案例编号(标题与原话按它取 i18n)。
   */
  caseId: string

  /**
   * 判定核给的整份答案(一句结论都不是手写的)。
   */
  answer: CaseAnswer
}
