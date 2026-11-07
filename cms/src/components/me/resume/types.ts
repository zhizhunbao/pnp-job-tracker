/**
 * me 桶子桶 resume 的形状:简历与求职信两个接口的线格式、整机面板、表格展示行与各函数 / 各件的契约(本桶自声明)。
 * 2026-11-07 自 account 桶在新域重写,线格式逐格照抄。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 「我的简历」原件的元信息(清单接口与上传接口交回的线格式)。
 */
export type ResumeMeta = {
  /**
   * 简历 id。
   */
  id: number

  /**
   * 是不是默认那份(投递时默认附它)。
   */
  isDefault: boolean

  /**
   * 上传时的原文件名。
   */
  fileName: string

  /**
   * MIME(PDF 或 .docx)。
   */
  mime: string

  /**
   * 字节数。
   */
  sizeBytes: number

  /**
   * 上传时刻(ISO 串)。
   */
  uploadedAt: string
}

/**
 * 本人的简历清单(默认那份在最前)。
 */
export type ResumeMetas = ResumeMeta[]

/**
 * 元信息或没有(预览框没开)。
 */
export type MaybeResumeMeta = ResumeMeta | null

/**
 * 简历接口回包的线格式(清单接口成功带 items;失败带 error 码)。
 */
export type ResumeRespJson = {
  /**
   * 清单(清单接口成功时在)。
   */
  items?: ResumeMetas

  /**
   * 错误码(type / size / limit / full / nofile / auth;成功时缺席)。
   */
  error?: string
}

/**
 * 一封求职信(/api/apply/letters 的线格式;只声明真读的格)。
 */
export type LetterMeta = {
  /**
   * 投递行 id(打开 PDF 按它)。
   */
  id: number

  /**
   * 职位 id;null = 职位已删(草稿没法「继续」)。
   */
  jobId: number | null

  /**
   * 职位名。
   */
  title: string

  /**
   * 公司名。
   */
  company: string

  /**
   * 投递状态(draft / sent / replied / bounced)。
   */
  status: string

  /**
   * 写于(ISO)。
   */
  wroteAt: string
}

/**
 * 求职信清单。
 */
export type LetterMetas = LetterMeta[]

/**
 * 求职信清单接口的回包。
 */
export type LettersRespJson = {
  /**
   * 清单;缺席按零条读。
   */
  items?: LetterMeta[]
}

/**
 * 「按 id 造一枚点击手柄」的工厂形(每份拿自己的手柄)。
 */
export type IdHandlerFn = (id: number) => () => void

/**
 * 文件框 change 事件(库类型起本地名)。
 */
export type InputChangeEvent = React.ChangeEvent<HTMLInputElement>

/**
 * 清单区的拖放事件(库类型起本地名)。
 */
export type DivDragEvent = React.DragEvent<HTMLDivElement>

/**
 * 生成简历窗口的开关(形同 cv 桶 CvOpenPanel,本桶自声明)。
 */
export type CvOpenView = {
  /**
   * 开着吗。
   */
  open: boolean

  /**
   * 开。
   */
  onOpen: () => void

  /**
   * 关。
   */
  onClose: () => void

  /**
   * 存成了。
   */
  onSaved: (id: number) => void
}

/**
 * 等着确认的一次删除(2026-10-12 Frank「所有删除按钮不要直接删,先弹框确认是否删除」)。
 */
export type AskDel = {
  /**
   * 要删的那一份的名字(确认框正文)。
   */
  name: string

  /**
   * 确认后真删的手柄。
   */
  run: () => void
}

/**
 * 拨删除确认框的函数(null = 关)。
 */
export type AskSetFn = (v: AskDel | null) => void

/**
 * 删除确认框整机(useAskDel 出)。
 */
export type AskPanel = {
  /**
   * 等着确认的那一次(没有 = null)。
   */
  ask: AskDel | null

  /**
   * 拨确认框。
   */
  setAsk: AskSetFn

  /**
   * 点「删除」:真删并关框。
   */
  onOk: () => void

  /**
   * 点「取消」:关框。
   */
  onCancel: () => void
}

/**
 * 「我的简历」一页的整机入参。
 */
export type ResumeIn = {
  /**
   * 取词。
   */
  t: TFn
}

/**
 * 「我的简历」一页的整机面板(useResume 出)。
 */
export type ResumePanel = {
  /**
   * 窄屏(窄屏清单出成一条条,页标题右边只留「上传简历」)。
   */
  narrow: boolean

  /**
   * 当前页签(resume / letter)。
   */
  tab: string

  /**
   * 换页签。
   */
  onTab: (key: string) => void

  /**
   * 简历清单拉回来了吗(没拉回来先占位,不闪上传区)。
   */
  checked: boolean

  /**
   * 本人的简历清单(默认那份在最前)。
   */
  items: ResumeMetas

  /**
   * 正在上传吗。
   */
  busy: boolean

  /**
   * 报错文案键(空串 = 没错)。
   */
  err: string

  /**
   * 有文件拖在清单区上方吗(描边变蓝)。
   */
  dragOn: boolean

  /**
   * 预览框开着哪一份(null = 没开;按 id 从清单里现取,替换 / 设默认后跟着变,删了就关)。
   */
  preview: MaybeResumeMeta

  /**
   * 隐藏文件框挂上 / 卸下时的回调(元素收进状态,点钮时替用户去点它)。
   */
  onInputMount: (el: HTMLInputElement | null) => void

  /**
   * 「上传简历 / 选择文件」:新加一份。
   */
  onAdd: () => void

  /**
   * 文件框选好文件。
   */
  onPick: (e: InputChangeEvent) => void

  /**
   * 文件拖进 / 悬在清单区上方。
   */
  onDragOver: (e: DivDragEvent) => void

  /**
   * 文件拖离清单区。
   */
  onDragLeave: () => void

  /**
   * 文件放进清单区。
   */
  onDrop: (e: DivDragEvent) => void

  /**
   * 某一份的「替换文件」手柄。
   */
  replaceOf: IdHandlerFn

  /**
   * 删除确认框整机。
   */
  ask: AskPanel

  /**
   * 某一份的真删手柄(确认框里点「删除」才跑)。
   */
  deleteOf: IdHandlerFn

  /**
   * 某一份的「设为默认」手柄。
   */
  defaultOf: IdHandlerFn

  /**
   * 某一份的「打开预览框」手柄(点文件名)。
   */
  previewOf: IdHandlerFn

  /**
   * 关预览框。
   */
  onPreviewClose: () => void

  /**
   * 生成简历窗口的开关(存成了重拉清单)。
   */
  cv: CvOpenView

  /**
   * 求职信清单拉回来了吗。
   */
  lettersChecked: boolean

  /**
   * 求职信清单拉失败了(出「没加载出来」,不说「还没有求职信」)。
   */
  lettersFailed: boolean

  /**
   * 求职信清单(拉失败按空)。
   */
  letters: LetterMetas

  /**
   * 简历表的展示行(宽屏表格与窄屏清单共用)。
   */
  resumeRows: ResumeCellRow[]

  /**
   * 求职信表的展示行(宽屏表格与窄屏清单共用)。
   */
  letterRows: LetterCellRow[]
}

/**
 * 读整机面板的件的 props(页标题右边的钮、正文、清单)。
 */
export type ResumePartIn = {
  /**
   * 「我的简历」整机面板。
   */
  r: ResumePanel

  /**
   * 取词。
   */
  t: TFn
}

/**
 * 预览框的 props。
 */
export type ResumePreviewIn = {
  /**
   * 「我的简历」整机面板。
   */
  r: ResumePanel

  /**
   * 开着的那一份。
   */
  m: ResumeMeta

  /**
   * 取词。
   */
  t: TFn
}

/**
 * ResumeInput 的 props(回调逐格收)。
 */
export type ResumeInputIn = {
  /**
   * 文件框挂上 / 卸下的回调(签名由 React 的 ref 属性定死)。
   */
  onMount: (el: HTMLInputElement | null) => void

  /**
   * 选好文件。
   */
  onPick: (e: InputChangeEvent) => void
}

/**
 * 简历表(与窄屏清单)的一行展示行(洗好的值 + 点名字的手柄)。
 */
export type ResumeCellRow = {
  /**
   * 行身份(简历 id)。
   */
  key: string

  /**
   * 文件名。
   */
  name: string

  /**
   * 是不是默认那份。
   */
  isDefault: boolean

  /**
   * 「默认」胶囊的字。
   */
  defaultText: string

  /**
   * 上传日期(年-月-日)。
   */
  date: string

  /**
   * 大小(如 148 KB)。
   */
  size: string

  /**
   * 点名字:开预览框。
   */
  onOpen: () => void
}

/**
 * 求职信表(与窄屏清单)的一行展示行。
 */
export type LetterCellRow = {
  /**
   * 行身份(投递行 id)。
   */
  key: string

  /**
   * 职位名。
   */
  title: string

  /**
   * 公司名。
   */
  company: string

  /**
   * 是草稿吗(点职位名:草稿去投递框接着写,发出去的开 PDF)。
   */
  draft: boolean

  /**
   * 状态胶囊的字(草稿 / 已投递)。
   */
  statusText: string

  /**
   * 状态胶囊的档(草稿灰、已投递绿)。
   */
  tag: LetterTag

  /**
   * 点职位名去哪儿(草稿 = 投递框深链,发出去的 = 信的 PDF);职位删了的草稿为空串(不可点)。
   */
  href: string

  /**
   * 写于(年-月-日)。
   */
  wrote: string
}

/**
 * 简历表的一列(通用 Table 的 Col 子集,本桶自声明)。
 */
export type ResumeCol = {
  /**
   * 列身份。
   */
  key: string

  /**
   * 表头文案。
   */
  label: string

  /**
   * 单元格渲染。
   */
  render: (r: ResumeCellRow) => React.ReactNode

  /**
   * 单元格不换行。
   */
  nowrap: boolean
}

/**
 * 求职信表的一列(通用 Table 的 Col 子集,本桶自声明)。
 */
export type LetterCol = {
  /**
   * 列身份。
   */
  key: string

  /**
   * 表头文案。
   */
  label: string

  /**
   * 单元格渲染。
   */
  render: (r: LetterCellRow) => React.ReactNode

  /**
   * 单元格不换行。
   */
  nowrap: boolean
}

/**
 * 简历展示行(resumeRowsOf)的入参。
 */
export type ResumeRowsIn = {
  /**
   * 简历清单。
   */
  items: ResumeMetas

  /**
   * 开预览框的工厂。
   */
  previewOf: IdHandlerFn

  /**
   * 取词。
   */
  t: TFn
}

/**
 * 求职信展示行(letterRowsOf)的入参。
 */
export type LetterRowsIn = {
  /**
   * 求职信清单。
   */
  items: LetterMetas

  /**
   * 取词。
   */
  t: TFn
}

/**
 * 状态胶囊的字(letterStatusOf)的入参。
 */
export type LetterStatusIn = {
  /**
   * 这一封。
   */
  m: LetterMeta

  /**
   * 取词。
   */
  t: TFn
}

/**
 * 页签条(tabItemsOf)的入参。
 */
export type TabItemsIn = {
  /**
   * 「我的简历」整机面板。
   */
  r: ResumePanel

  /**
   * 取词。
   */
  t: TFn
}

/**
 * 页签条的一项(形状照 tabs 桶的 TabItem 抄,本桶自声明)。
 */
export type TabView = {
  /**
   * 页签身份键。
   */
  key: string

  /**
   * 页签文字。
   */
  label: string

  /**
   * 灰色小字(份数);没有给空串。
   */
  badge: string
}

/**
 * 拉简历清单工厂(makeResumeListLoad)的入参。
 */
export type ResumeListLoadIn = {
  /**
   * 清单落格。
   */
  setItems: (v: ResumeMetas) => void

  /**
   * 「拉回来了」落格。
   */
  setChecked: (v: boolean) => void
}

/**
 * 拉一次清单(上传 / 删除 / 设默认之后都重拉)。
 */
export type ResumeReloadFn = () => Promise<void>

/**
 * 一次上传(makeResumeUpload 造出的函数)。
 */
export type ResumeUploadFn = (file: File) => Promise<void>

/**
 * 上传工厂(makeResumeUpload)的入参。
 */
export type ResumeUploadIn = {
  /**
   * 替换哪一份(null = 新加一份)。
   */
  replaceId: number | null

  /**
   * 成功后重拉清单。
   */
  reload: ResumeReloadFn

  /**
   * 在途落格。
   */
  setBusy: (v: boolean) => void

  /**
   * 报错落格(文案键;空串清掉)。
   */
  setErr: (v: string) => void
}

/**
 * 文件框选好文件的工厂(makeFilePick)的入参。
 */
export type FilePickIn = {
  /**
   * 一次上传。
   */
  upload: ResumeUploadFn
}

/**
 * 拖放上传工厂(makeFileDrop / makeDragOver / makeDragLeave)的入参。
 */
export type FileDropIn = {
  /**
   * 一次上传。
   */
  upload: ResumeUploadFn

  /**
   * 拖放高亮落格。
   */
  setDragOn: (v: boolean) => void
}

/**
 * 「上传 / 替换」打开文件选择器工厂(makeAdd / makePickerOf)的入参。
 */
export type PickerIn = {
  /**
   * 隐藏文件框(还没挂上是 null)。
   */
  input: HTMLInputElement | null

  /**
   * 记下这次选完文件替换哪一份(null = 新加)。
   */
  setReplaceId: (v: number | null) => void
}

/**
 * 按 id 动库的几个工厂(删除 / 设默认)的入参。
 */
export type ResumeActIn = {
  /**
   * 成功后重拉清单。
   */
  reload: ResumeReloadFn

  /**
   * 报错落格。
   */
  setErr: (v: string) => void
}

/**
 * 删除 / 设默认共用的一次请求(sendResumeAct)的入参。
 */
export type ResumeActSendIn = {
  /**
   * 重拉与报错落格。
   */
  x: ResumeActIn

  /**
   * 请求地址(带 id)。
   */
  url: string

  /**
   * 请求方法(DELETE / PATCH)。
   */
  method: string
}

/**
 * 按 id 记下开着哪一份的工厂(makePreviewOf / makePreviewClose)的入参。
 */
export type PreviewSetIn = {
  /**
   * 开着哪一份的落格(null = 关)。
   */
  setPreviewId: (v: number | null) => void
}

/**
 * 开着的那一份(previewOf)的入参。
 */
export type PreviewPickIn = {
  /**
   * 简历清单。
   */
  items: ResumeMetas

  /**
   * 开着哪一份(null = 没开)。
   */
  id: number | null
}

/**
 * 造「点删除先弹确认框」(makeAsk)的入参。
 */
export type AskIn = {
  /**
   * 拨确认框。
   */
  setAsk: AskSetFn

  /**
   * 要删的那一份的名字。
   */
  name: string

  /**
   * 确认后真删的手柄。
   */
  run: () => void
}

/**
 * 删除确认框「删除」钮(makeAskOk)的入参。
 */
export type AskOkIn = {
  /**
   * 等着确认的那一次。
   */
  ask: AskDel | null

  /**
   * 拨框手柄。
   */
  setAsk: AskSetFn
}

/**
 * 拉求职信清单(makeLettersLoad)的入参。
 */
export type LettersLoadIn = {
  /**
   * 清单落格。
   */
  setItems: (v: LetterMetas) => void

  /**
   * 「拉回来了」落格。
   */
  setChecked: (v: boolean) => void

  /**
   * 「拉失败了」落格(2026-11-07:失败不再按空清单读 —— 新版空清单会说「还没有求职信」,那是替失败编事实)。
   */
  setFailed: (v: boolean) => void
}

/**
 * 求职信整机(useLetters)的面板。
 */
export type LettersPanel = {
  /**
   * 清单拉回来了吗。
   */
  checked: boolean

  /**
   * 清单。
   */
  items: LetterMetas

  /**
   * 拉失败了。
   */
  failed: boolean
}

/**
 * 简历清单区的类名(listClsOf)入参。
 */
export type ListClsIn = {
  /**
   * 有文件悬在上方吗。
   */
  on: boolean

  /**
   * 空态上传区(虚线框)还是有清单(只在拖到上方时亮描边)。
   */
  empty: boolean
}

/**
 * 简历名字件(ResumeName)的 props。
 */
export type ResumeNameIn = {
  /**
   * 文件名。
   */
  name: string

  /**
   * 是不是默认那份。
   */
  isDefault: boolean

  /**
   * 「默认」胶囊的字。
   */
  defaultText: string

  /**
   * 点名字:开预览框。
   */
  onOpen: () => void
}

/**
 * 手机清单里一份简历(ResumeItem)的 props。
 */
export type ResumeItemIn = {
  /**
   * 展示行。
   */
  row: ResumeCellRow
}

/**
 * 求职信职位名件(LetterTitle)的 props。
 */
export type LetterTitleIn = {
  /**
   * 职位名。
   */
  title: string

  /**
   * 去处(空串 = 不可点)。
   */
  href: string

  /**
   * 是草稿吗(草稿站内去投递框,发出去的新标签页开 PDF)。
   */
  draft: boolean
}

/**
 * 手机清单里一封求职信(LetterItem)的 props。
 */
export type LetterItemIn = {
  /**
   * 展示行。
   */
  row: LetterCellRow
}

/**
 * 求职信状态胶囊的档(tag 桶 TagVariant 的子集:草稿灰、已投递绿)。
 */
export type LetterTag = 'gray' | 'ok'
