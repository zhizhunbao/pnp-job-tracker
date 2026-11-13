/**
 * tailor 域子桶 profile 的形状:读档案的那几格、给模型的事实、模型回的内容与排版用的草稿。
 * 形状本桶自声明、只声明真读的格(档案来自 lib/quiz 的 loadQuizProfile,草稿交给 lib/cv 的 toCvDraft)。
 *
 * @author Frank
 * @time 2026-11-12 17:00:00
 */

/**
 * 模型回的 JSON 一格(形同父桶 JsonCell)。
 */
export type JsonCell = string | number | boolean | null | JsonCell[] | { [key: string]: JsonCell }

/**
 * 档案里一个带码的名字(只读英文名与码)。
 */
export type SrcName = {
  /**
   * 码(职业五位码 / 专业码)。
   */
  code: string

  /**
   * 英文名。
   */
  en: string
}

/**
 * 档案里工作经历的一段(形同 lib/quiz CvWork)。
 */
export type SrcWork = {
  /**
   * 这一段对应的职业码。
   */
  nocs: string[]

  /**
   * 职位名称。
   */
  title: string

  /**
   * 公司。
   */
  org: string

  /**
   * 城市。
   */
  city: string

  /**
   * 开始年月(2021 或 2021-03);没填空串。
   */
  from: string

  /**
   * 结束年月;空串 = 至今或没填。
   */
  to: string

  /**
   * 做了什么(用户自己的话)。
   */
  desc: string
}

/**
 * 档案里教育经历的一条(只读四格)。
 */
export type SrcEdu = {
  /**
   * 证书或学历名称。
   */
  cred: string

  /**
   * 学校。
   */
  school: string

  /**
   * 开始年份;没填空串。
   */
  from: string

  /**
   * 结束年份;没填空串。
   */
  to: string
}

/**
 * 本人的档案(lib/quiz 的 QuizProfile 里真读的格)。
 */
export type ProfileSrc = {
  /**
   * 英文姓名(投递署名);没填空串。
   */
  name: string

  /**
   * 现居省码;没答空串。
   */
  prov: string

  /**
   * 现居城市(只读英文名;没选空串)。
   */
  city: SrcName

  /**
   * 专业。
   */
  majors: SrcName[]

  /**
   * 做过的工作(职业码与英文名)。
   */
  works: SrcName[]

  /**
   * 教育经历明细。
   */
  eduList: SrcEdu[]

  /**
   * 简历资料。
   */
  cv: {
    /**
     * 工作经历几段。
     */
    work: SrcWork[]

    /**
     * 电话。
     */
    phone: string

    /**
     * 个人链接。
     */
    link: string

    /**
     * 技能,一行一项。
     */
    skills: string
  }
}

/**
 * profileFactsOf 的入参。
 */
export type FactsIn = {
  /**
   * 本人的档案。
   */
  p: ProfileSrc

  /**
   * 账号邮箱。
   */
  email: string
}

/**
 * 给模型的一段工作经历。
 */
export type FactWork = {
  /**
   * 职业的英文名(职位名称没填时模型用它);没选职业空串。
   */
  occupation: string

  /**
   * 职位名称。
   */
  title: string

  /**
   * 公司。
   */
  org: string

  /**
   * 城市。
   */
  city: string

  /**
   * 开始年月。
   */
  from: string

  /**
   * 结束年月;空串 = 至今或没填。
   */
  to: string

  /**
   * 做了什么(用户自己的话)。
   */
  notes: string
}

/**
 * 给模型的一条教育经历。
 */
export type FactEdu = {
  /**
   * 证书或学历名称。
   */
  credential: string

  /**
   * 学校。
   */
  school: string

  /**
   * 开始年份。
   */
  from: string

  /**
   * 结束年份。
   */
  to: string
}

/**
 * 生成简历要的全部事实(联系方式不给模型,排版时直接用)。
 */
export type ProfileFacts = {
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
   * 个人链接。
   */
  link: string

  /**
   * 城市英文名。
   */
  city: string

  /**
   * 省码。
   */
  region: string

  /**
   * 工作经历几段,新的在前。
   */
  work: FactWork[]

  /**
   * 教育经历几条。
   */
  edu: FactEdu[]

  /**
   * 专业英文名,逗号连成一串;没有空串。
   */
  majors: string

  /**
   * 技能,一行一项。
   */
  skills: string
}

/**
 * 模型写的一段工作经历(洗过)。
 */
export type OutWork = {
  /**
   * 英文职位名称。
   */
  title: string

  /**
   * 英文公司名。
   */
  org: string

  /**
   * 英文城市名。
   */
  city: string

  /**
   * 要点。
   */
  bullets: string[]
}

/**
 * 模型写的一条教育经历(洗过)。
 */
export type OutEdu = {
  /**
   * 英文证书或学历名称。
   */
  credential: string

  /**
   * 英文学校名。
   */
  school: string
}

/**
 * 模型写的内容(洗过;work / edu 与事实的几段按下标对应)。
 */
export type ProfileOut = {
  /**
   * 简介。
   */
  summary: string

  /**
   * 各段工作经历。
   */
  work: OutWork[]

  /**
   * 各条教育经历。
   */
  edu: OutEdu[]

  /**
   * 技能。
   */
  skills: string[]
}

/**
 * profileDraftOf 的入参。
 */
export type DraftIn = {
  /**
   * 事实。
   */
  f: ProfileFacts

  /**
   * 模型写的内容。
   */
  out: ProfileOut
}

/**
 * 排版用草稿里的一条(lib/cv 线上形状 CvEntryJson 里用到的格)。
 */
export type DraftEntry = {
  /**
   * 标题。
   */
  title: string

  /**
   * 机构。
   */
  org: string

  /**
   * 城市。
   */
  city: string

  /**
   * 开始年。
   */
  fromY: string

  /**
   * 开始月(1~12;没有空串)。
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
   * 描述(要点一行一条)。
   */
  desc: string
}

/**
 * 排版用的草稿(lib/cv 线上形状 CvDraftJson 里用到的格)。
 */
export type ProfileDraft = {
  /**
   * 联系方式。
   */
  contact: {
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
     * 省份。
     */
    region: string
  }

  /**
   * 简介。
   */
  summary: string

  /**
   * 工作经历。
   */
  work: DraftEntry[]

  /**
   * 教育经历。
   */
  edu: DraftEntry[]

  /**
   * 技能(一行一条)。
   */
  skills: string
}

/**
 * entryOf 的入参。
 */
export type EntryIn = {
  /**
   * 标题。
   */
  title: string

  /**
   * 机构。
   */
  org: string

  /**
   * 城市。
   */
  city: string

  /**
   * 开始(2021 或 2021-03)。
   */
  from: string

  /**
   * 结束;空串 = 没填。
   */
  to: string

  /**
   * 结束空着算不算「至今」(工作经历算,教育经历不算)。
   */
  open: boolean

  /**
   * 描述。
   */
  desc: string
}

/**
 * 年月拆成的两格。
 */
export type YmParts = {
  /**
   * 年;没有空串。
   */
  y: string

  /**
   * 月(1~12 的数字串);没有空串。
   */
  m: string
}

/**
 * 一串字。
 */
export type Texts = string[]

/**
 * 给模型的输出形状(JSON 模式;交给 lib/llm 的 anthropicSchema)。
 */
export type JsonSchema = { [key: string]: JsonCell }

/**
 * 年月正则的具名捕获组。
 */
export type YmGroups = {
  /**
   * 年。
   */
  y: string

  /**
   * 月(两位;只写了年时缺席)。
   */
  m?: string
}

/**
 * orgOf 的入参。
 */
export type CredSchool = {
  /**
   * 证书或学历名称;没有空串。
   */
  cred: string

  /**
   * 学校;没有空串。
   */
  school: string
}

/**
 * textOf 的入参。
 */
export type TextIn = {
  /**
   * 模型回的一格(对象里没这个键 = 缺席)。
   */
  v?: JsonCell

  /**
   * 至多几个字。
   */
  max: number
}

/**
 * listOf 的入参。
 */
export type ListIn = {
  /**
   * 模型回的一格(对象里没这个键 = 缺席)。
   */
  v?: JsonCell

  /**
   * 一项至多几个字。
   */
  max: number

  /**
   * 至多几项。
   */
  n: number
}
