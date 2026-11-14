/**
 * gate 桶子桶 fill 的形状:提取接口的回包与洗净的提取结果、合并核的出入参、表单那条路要读写的几格、
 * 无界面那条路的各格与要存的补丁、投出后补两格的出入参,和父桶注进来的那一组函数。
 * 2026-11-13 Frank「别等一周啊 都做完」:形状本桶自声明,不取父桶也不取兄弟子桶;工作经历一段、教育经历一段与明细、
 * 提取到的一条教育经历形同子桶 work / edu 的同名形状(喂它们的函数,全格照抄)。
 *
 * @author Frank
 * @time 2026-11-13 21:00:00
 */

/**
 * 工作经历一段(界面上的七格;形同子桶 work 的 WorkPick)。
 */
export type WorkPick = {
  /**
   * 这一段对应的职业码(同一个职业可能有几个码);空列 = 没选。
   */
  nocs: string[]

  /**
   * 职位名称;空串 = 没填。
   */
  title: string

  /**
   * 公司;空串 = 没填。
   */
  org: string

  /**
   * 城市;空串 = 没填。
   */
  city: string

  /**
   * 开始年月;空串 = 没填。
   */
  from: string

  /**
   * 结束年月;空串 = 没填或至今。
   */
  to: string

  /**
   * 做了什么;空串 = 没填。
   */
  desc: string
}

/**
 * 教育经历一段(界面上的三只下拉、四格明细与专业;形同子桶 edu 的 EduPick)。
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
   * 开始年份;空串 = 没填。
   */
  from: string

  /**
   * 结束年份;空串 = 没填或在读。
   */
  to: string

  /**
   * 这一段学的专业(CIP 码);空串 = 没选。
   */
  major: string
}

/**
 * 答案档里教育经历明细的一条(形同子桶 edu 的 EduEntry)。
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
   * 这一段学的专业(CIP 码);没选 = 空串。
   */
  major: string
}

/**
 * 从简历提取的一条教育经历(/api/resume/prefill 的 education 一项;形同子桶 edu 的 PrefillEdu)。
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
 * 接口回包(缺席按空读)。
 */
export type PrefillJson = {
  /**
   * 错误码。
   */
  error?: string

  /**
   * 做过的工作。
   */
  works?: string[]

  /**
   * 专业。
   */
  majors?: string[]

  /**
   * 英文姓名。
   */
  name?: string

  /**
   * 教育经历(2026-11-12)。
   */
  education?: PrefillEdu[]

  /**
   * 几段工作经历(2026-11-12:职业码、职位名称、公司、城市、起止年月、做了什么;服务端已洗)。
   */
  jobs?: WorkPick[]
}

/**
 * 洗净的提取结果。
 */
export type PrefillFact = {
  /**
   * 做过的工作。
   */
  works: string[]

  /**
   * 专业。
   */
  majors: string[]

  /**
   * 英文姓名;没有 = 空串。
   */
  name: string

  /**
   * 教育经历(2026-11-12);没有 = 空列。
   */
  education: PrefillEdu[]

  /**
   * 几段工作经历(2026-11-12);没有 = 空列。
   */
  jobs: WorkPick[]
}

/**
 * 调了一次提取接口的结果。
 */
export type PrefillGot = {
  /**
   * 接口回了成功。
   */
  ok: boolean

  /**
   * 错误码;没有(成功、网络断了、回的不是 JSON)= 空串。
   */
  code: string

  /**
   * 状态码;请求没发出去 = 0。
   */
  status: number

  /**
   * 提取结果(没成 = 各格都空)。
   */
  d: PrefillFact
}

/**
 * 在途或刚取到的一次提取结果;没有 = null。
 */
export type MaybePrefillRun = Promise<PrefillGot> | null

/**
 * 本桶唯一的可变状态:传简历后自己读的那一份提取结果,留给紧跟着打开的修改面板用一次。
 */
export type FillCache = {
  /**
   * 那一份(在途的也算);没有或被用掉了 = null。
   */
  got: MaybePrefillRun

  /**
   * 那一份是什么时候开始取的(毫秒时间戳)。
   */
  at: number
}

/**
 * 从简历填写后的一行提示(形同父桶 FillMsg)。
 */
export type FillMsg = {
  /**
   * 词条键;没有提示 = 空串。
   */
  key: string

  /**
   * 填上了几项。
   */
  n: number

  /**
   * 提示的颜色。
   */
  kind: 'ok' | 'info' | 'err'
}

/**
 * 子桶 work 的 workFilledOf 的入参(全格照抄)。
 */
export type WorkFillIn = {
  /**
   * 现在的几段。
   */
  rows: WorkPick[]

  /**
   * 从简历提取到的几段。
   */
  jobs: WorkPick[]

  /**
   * 从简历提取到的职业码。
   */
  codes: string[]
}

/**
 * 子桶 work 的 workFilledOf 的返回(全格照抄)。
 */
export type WorkFillOut = {
  /**
   * 填过之后的几段。
   */
  rows: WorkPick[]

  /**
   * 填上了没有。
   */
  filled: boolean

  /**
   * 这一次从简历带进来的职业码。
   */
  codes: string[]
}

/**
 * 子桶 work 的 workFormRowsOf 的入参(全格照抄)。
 */
export type WorkSeedIn = {
  /**
   * 档案里存过的几段。
   */
  list: WorkPick[]

  /**
   * 老的职业码。
   */
  nocs: string[]
}

/**
 * 子桶 edu 的 eduMergedOf 的入参(全格照抄)。
 */
export type EduMergeIn = {
  /**
   * 现在的几段。
   */
  rows: EduPick[]

  /**
   * 从简历提取的几条。
   */
  items: PrefillEdu[]
}

/**
 * 子桶 edu 的 eduMergedOf 的返回(全格照抄)。
 */
export type EduMergeOut = {
  /**
   * 并进去之后的几段。
   */
  rows: EduPick[]

  /**
   * 并进去了几条。
   */
  n: number
}

/**
 * 子桶 edu 的 eduWithMajorsOf 的入参(全格照抄)。
 */
export type EduMajorsIn = {
  /**
   * 现在的几段。
   */
  rows: EduPick[]

  /**
   * 要落进各段的专业码。
   */
  codes: string[]
}

/**
 * 子桶 edu 的 eduFormRowsOf 的入参(全格照抄)。
 */
export type EduSeedIn = {
  /**
   * 教育经历明细。
   */
  list: EduEntry[]

  /**
   * 教育经历串。
   */
  strs: string[]

  /**
   * 档案里的专业码。
   */
  majors: string[]
}

/**
 * 父桶 fromKeptOf 的入参(全格照抄)。
 */
export type FromKeptIn = {
  /**
   * 现有标记。
   */
  marks: string[]

  /**
   * 现在的专业。
   */
  majors: string[]

  /**
   * 现在做过的工作。
   */
  workNocs: string[]

  /**
   * 现在的英文姓名。
   */
  name: string
}

/**
 * 同步旧档案的入参(父桶 syncOldProfile)。
 */
export type OldSyncIn = {
  /**
   * 想做的工作(职业码)。
   */
  nocs: string[]

  /**
   * 现居省码;空串 = 没答或在境外。
   */
  prov: string
}

/**
 * 档案里的简历资料(形同父桶 GateCv)。
 */
export type FillCv = {
  /**
   * 工作经历几段。
   */
  work: WorkPick[]

  /**
   * 电话。
   */
  phone: string

  /**
   * 个人链接。
   */
  link: string

  /**
   * 技能。
   */
  skills: string

  /**
   * 简历模板。
   */
  tpl: string
}

/**
 * 服务端那份档案里本桶真读的格(父桶的起始答案 GateEditSeed 喂得进来)。
 */
export type FillSeed = {
  /**
   * 专业码。
   */
  majors: string[]

  /**
   * 想做的工作(职业码)。
   */
  nocs: string[]

  /**
   * 现居省码;空串 = 没答或在境外。
   */
  prov: string

  /**
   * 答的是「加拿大境外」。
   */
  abroad: boolean

  /**
   * 英文姓名;空串 = 没填。
   */
  name: string

  /**
   * 教育经历串。
   */
  edu: string[]

  /**
   * 教育经历明细。
   */
  eduList: EduEntry[]

  /**
   * 做过的工作(职业码)。
   */
  workNocs: string[]

  /**
   * 来自简历的标记。
   */
  fromResume: string[]

  /**
   * 简历资料。
   */
  cv: FillCv
}

/**
 * 服务端那份档案或没有(没登录、取不到)。
 */
export type MaybeFillSeed = FillSeed | null

/**
 * 父桶注进来的那一组函数(子桶不取父桶、不取兄弟子桶:合并规则住子桶 work / edu,存取住父桶与子桶 seed)。
 */
export type FillFns = {
  /**
   * 把提取到的工作经历填进几段(子桶 work)。
   */
  workFilledOf: (x: WorkFillIn) => WorkFillOut

  /**
   * 档案里的工作经历 → 表单起头的几段(子桶 work)。
   */
  workFormRowsOf: (x: WorkSeedIn) => WorkPick[]

  /**
   * 几段 → 要存的工作经历(子桶 work)。
   */
  workListOf: (rows: WorkPick[]) => WorkPick[]

  /**
   * 几段 → 做过的工作的职业码(子桶 work)。
   */
  workNocsOf: (rows: WorkPick[]) => string[]

  /**
   * 把提取到的教育经历并进几段(子桶 edu)。
   */
  eduMergedOf: (x: EduMergeIn) => EduMergeOut

  /**
   * 几段 → 专业码(子桶 edu)。
   */
  eduMajorsOf: (rows: EduPick[]) => string[]

  /**
   * 把专业码落进几段(子桶 edu)。
   */
  eduWithMajorsOf: (x: EduMajorsIn) => EduPick[]

  /**
   * 档案里的教育经历 → 表单起头的几段(子桶 edu)。
   */
  eduFormRowsOf: (x: EduSeedIn) => EduPick[]

  /**
   * 几段 → 要存的教育经历明细(子桶 edu)。
   */
  eduListOf: (rows: EduPick[]) => EduEntry[]

  /**
   * 保存时留下的「来自简历」标记(父桶)。
   */
  fromKeptOf: (x: FromKeptIn) => string[]

  /**
   * 英文姓名填了但不合规(父桶)。
   */
  nameBadOf: (name: string) => boolean

  /**
   * 取服务端那份档案(子桶 seed,父桶在装配点断言)。
   */
  pullSeed: () => Promise<MaybeFillSeed>

  /**
   * 存英文姓名;没存上抛错(父桶)。
   */
  saveName: (name: string) => Promise<void>

  /**
   * 把职业与省同步进旧档案(父桶)。
   */
  syncOld: (x: OldSyncIn) => Promise<void>
}

/**
 * 表单里「做过的工作」那一段本桶读写的格。
 */
export type FillFormWork = {
  /**
   * 几段。
   */
  work: WorkPick[]

  /**
   * 整份写几段。
   */
  setWork: (v: WorkPick[]) => void
}

/**
 * 表单 edit 段里本桶读写的格。
 */
export type FillFormEdit = {
  /**
   * 英文姓名。
   */
  name: string

  /**
   * 落英文姓名。
   */
  onName: (v: string) => void

  /**
   * 教育经历几段。
   */
  edu: EduPick[]

  /**
   * 整份写教育经历几段。
   */
  setEdu: (v: EduPick[]) => void

  /**
   * 「做过的工作」的几段。
   */
  w: FillFormWork
}

/**
 * 表单整机里本桶读写的格(父桶的 GatePanel 喂得进来)。
 */
export type FillForm = {
  /**
   * 来自简历的标记。
   */
  fromResume: string[]

  /**
   * 落来自简历的标记。
   */
  setFromResume: (v: string[]) => void

  /**
   * 表单的 edit 段。
   */
  edit: FillFormEdit
}

/**
 * makeResumeFill 的入参。
 */
export type ResumeFillIn = {
  /**
   * 表单状态。
   */
  g: FillForm

  /**
   * 落「取数中」。
   */
  setBusy: (v: boolean) => void

  /**
   * 落提示。
   */
  setMsg: (v: FillMsg) => void

  /**
   * 父桶注进来的函数。
   */
  fns: FillFns
}

/**
 * applyPrefill 的入参。
 */
export type ApplyPrefillIn = {
  /**
   * 手柄。
   */
  x: ResumeFillIn

  /**
   * 提取结果。
   */
  d: PrefillFact
}

/**
 * prefillMergedOf(合并核)的入参:现在的各格与提取结果。
 */
export type PrefillMergeIn = {
  /**
   * 「做过的工作」现在的几段。
   */
  work: WorkPick[]

  /**
   * 教育经历现在的几段。
   */
  edu: EduPick[]

  /**
   * 现在的英文姓名。
   */
  name: string

  /**
   * 现有的「来自简历」标记。
   */
  marks: string[]

  /**
   * 提取结果。
   */
  d: PrefillFact

  /**
   * 父桶注进来的函数。
   */
  fns: FillFns
}

/**
 * prefillMergedOf(合并核)的返回:填过之后的各格。
 */
export type PrefillMergeOut = {
  /**
   * 「做过的工作」的几段(没填就是原来那几段)。
   */
  work: WorkPick[]

  /**
   * 工作经历填上了没有。
   */
  workFilled: boolean

  /**
   * 教育经历的几段(并进了提取到的教育经历与专业)。
   */
  edu: EduPick[]

  /**
   * 英文姓名(没填就是原来的)。
   */
  name: string

  /**
   * 英文姓名填上了没有。
   */
  nameFilled: boolean

  /**
   * 标记(原有的加这一次的)。
   */
  marks: string[]

  /**
   * 填上了几项。
   */
  n: number
}

/**
 * autoCellsOf / autoFilledOf 的入参:服务端那份档案、提取结果与父桶注进来的函数。
 */
export type AutoCellsIn = {
  /**
   * 服务端那份档案。
   */
  seed: FillSeed

  /**
   * 提取结果。
   */
  d: PrefillFact

  /**
   * 父桶注进来的函数。
   */
  fns: FillFns
}

/**
 * 表单会存进答案档的那几格(只列「从简历填写」动得到的)与英文姓名。
 */
export type AutoCells = {
  /**
   * 专业码。
   */
  majors: string[]

  /**
   * 教育经历串(由明细派生)。
   */
  fitEdu: string[]

  /**
   * 教育经历明细。
   */
  eduList: EduEntry[]

  /**
   * 做过的工作(职业码)。
   */
  workNocs: string[]

  /**
   * 来自简历的标记。
   */
  fromResume: string[]

  /**
   * 简历资料。
   */
  cv: FillCv

  /**
   * 英文姓名;空串 = 没有。
   */
  name: string
}

/**
 * 答案档里的一格(比两格一样不一样用)。
 */
export type AutoCell = string[] | EduEntry[] | FillCv

/**
 * isCellDiff 的入参。
 */
export type CellDiffIn = {
  /**
   * 原来的。
   */
  a: AutoCell

  /**
   * 填过之后的。
   */
  b: AutoCell
}

/**
 * 要存进答案档的补丁:只放真变了的格(缺席 = 这一格不写;lib/quiz 的 saveBasics 整格覆盖补丁里的格)。
 */
export type AutoPatch = {
  /**
   * 专业码。
   */
  majors?: string[]

  /**
   * 教育经历串。
   */
  fitEdu?: string[]

  /**
   * 教育经历明细。
   */
  eduList?: EduEntry[]

  /**
   * 做过的工作(职业码)。
   */
  workNocs?: string[]

  /**
   * 来自简历的标记。
   */
  fromResume?: string[]

  /**
   * 简历资料。
   */
  cv?: FillCv
}

/**
 * autoFilledOf 的返回。
 */
export type AutoFilledOut = {
  /**
   * 填过之后的各格。
   */
  cells: AutoCells

  /**
   * 要存进答案档的补丁(只有真变了的格)。
   */
  patch: AutoPatch

  /**
   * 要存的英文姓名;不用存 = 空串。
   */
  name: string

  /**
   * 填上了至少一项。
   */
  filled: boolean
}

/**
 * autoSavedOf 的入参。
 */
export type AutoSaveIn = {
  /**
   * 提取结果。
   */
  d: PrefillFact

  /**
   * 父桶注进来的函数。
   */
  fns: FillFns
}

/**
 * applyPatchOf 的入参。
 */
export type ApplyFillIn = {
  /**
   * 刚投的职位的职业码;没有 = 空串。
   */
  noc: string

  /**
   * 刚投的职位的省码;没有 = 空串。
   */
  prov: string

  /**
   * 现居省能取的值。
   */
  provs: string[]

  /**
   * 服务端那份档案。
   */
  seed: FillSeed
}

/**
 * 投出后要补的格(缺席 = 这一格不写)。
 */
export type ApplyPatch = {
  /**
   * 想做的工作(职业码)。
   */
  nocs?: string[]

  /**
   * 现居省码。
   */
  resProv?: string
}

/**
 * runApplyAuto 的入参。
 */
export type ApplyAutoIn = {
  /**
   * 刚投的职位的职业码;没有 = 空串。
   */
  noc: string

  /**
   * 刚投的职位的省码;没有 = 空串。
   */
  prov: string

  /**
   * 现居省能取的值。
   */
  provs: string[]

  /**
   * 父桶注进来的函数。
   */
  fns: FillFns
}
