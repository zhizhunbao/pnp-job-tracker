/**
 * me 桶子桶 base 的形状:简历接口的线格式、「基础简历」卡的整机面板与各函数 / 各件的契约(本桶自声明)。
 * 2026-11-12 自子桶 resume 裁出重写,为档案与简历并页(2026-11-11 Frank「只留一份上传的吧。因为之后都可以按岗位改写」
 * 「左边我的档案,右面我的简历」);线格式只声明真读的格。
 *
 * @author Frank
 * @time 2026-11-12 10:00:00
 */

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 简历原件的元信息(清单接口交回的线格式;只声明真读的格)。
 */
export type ResumeMeta = {
  /**
   * 简历 id。
   */
  id: number

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
 * 本人的简历清单(2026-11-11 起至多一条)。
 */
export type ResumeMetas = ResumeMeta[]

/**
 * 元信息或没有(还没上传过)。
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
   * 错误码(type / size / limit / nofile / auth;成功时缺席)。
   */
  error?: string
}

/**
 * 文件框 change 事件(库类型起本地名)。
 */
export type InputChangeEvent = React.ChangeEvent<HTMLInputElement>

/**
 * 卡身的拖放事件(库类型起本地名)。
 */
export type DivDragEvent = React.DragEvent<HTMLDivElement>

/**
 * 等着确认的一次动作(删除或替换;2026-10-12 Frank「所有删除按钮不要直接删,先弹框确认是否删除」,替换同理)。
 */
export type Ask = {
  /**
   * 现有那一份的名字(确认框正文)。
   */
  name: string

  /**
   * 确认后才跑的手柄。
   */
  run: () => void
}

/**
 * 拨确认框的函数(null = 关)。
 */
export type AskSetFn = (v: Ask | null) => void

/**
 * 确认框整机(useAsk 出;删除与替换各一台)。
 */
export type AskPanel = {
  /**
   * 等着确认的那一次(没有 = null)。
   */
  ask: Ask | null

  /**
   * 拨确认框。
   */
  setAsk: AskSetFn

  /**
   * 点确认:跑那一次并关框。
   */
  onOk: () => void

  /**
   * 点「取消」:关框。
   */
  onCancel: () => void
}

/**
 * 「基础简历」卡的整机入参。
 */
export type BaseIn = {
  /**
   * 取词。
   */
  t: TFn
}

/**
 * 「基础简历」卡的整机面板(useBase 出)。
 */
export type BasePanel = {
  /**
   * 窄屏(卡头不出「生成简历」)。
   */
  narrow: boolean

  /**
   * 清单拉回来了吗(没拉回来先占位,不闪上传区)。
   */
  checked: boolean

  /**
   * 那一份上传的简历(清单第一条;还没上传过 = null)。
   */
  file: MaybeResumeMeta

  /**
   * 正在上传吗。
   */
  busy: boolean

  /**
   * 报错的字(已按界面语取好;空串 = 没错)。
   */
  err: string

  /**
   * 有文件拖在卡身上方吗(描边变蓝)。
   */
  dragOn: boolean

  /**
   * 隐藏文件框挂上 / 卸下时的回调(元素收进状态,点钮时替用户去点它)。
   */
  onInputMount: (el: HTMLInputElement | null) => void

  /**
   * 「上传简历 / 选择文件」:打开文件选择器(还没有简历时用)。
   */
  onAdd: () => void

  /**
   * 文件框选好文件(有简历 = 替换它,没有 = 新加)。
   */
  onPick: (e: InputChangeEvent) => void

  /**
   * 文件拖进 / 悬在卡身上方。
   */
  onDragOver: (e: DivDragEvent) => void

  /**
   * 文件拖离卡身。
   */
  onDragLeave: () => void

  /**
   * 文件放进卡身(有简历先弹替换确认框,没有直接传)。
   */
  onDrop: (e: DivDragEvent) => void

  /**
   * 「替换文件」:先弹确认框,确认了才打开文件选择器。
   */
  onReplace: () => void

  /**
   * 「删除」:先弹确认框,确认了才真删。
   */
  onDelete: () => void

  /**
   * 删除确认框整机。
   */
  del: AskPanel

  /**
   * 替换确认框整机。
   */
  rep: AskPanel

  /**
   * 点「生成简历」(2026-11-12:发页面事件,档案那一半打开修改面板 —— 生成并进了它的末段)。
   */
  onBuild: () => void
}

/**
 * 读整机面板的件的 props(卡、卡头、上传区)。
 */
export type BasePartIn = {
  /**
   * 「基础简历」整机面板。
   */
  b: BasePanel

  /**
   * 取词。
   */
  t: TFn
}

/**
 * 有简历时那几件(文件名与预览、操作排)的 props。
 */
export type BaseFileIn = {
  /**
   * 「基础简历」整机面板。
   */
  b: BasePanel

  /**
   * 那一份简历。
   */
  m: ResumeMeta

  /**
   * 取词。
   */
  t: TFn
}

/**
 * BaseInput 的 props(回调逐格收)。
 */
export type BaseInputIn = {
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
 * 报错的字(errTextOf)的入参。
 */
export type ErrTextIn = {
  /**
   * 报错文案键(空串 = 没错)。
   */
  err: string

  /**
   * 取词。
   */
  t: TFn
}

/**
 * 卡身的类名(bodyClsOf)入参。
 */
export type BodyClsIn = {
  /**
   * 有文件悬在上方吗。
   */
  on: boolean

  /**
   * 空态上传区(虚线框)还是有简历(只在拖到上方时亮描边)。
   */
  empty: boolean
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
 * 拉一次清单(上传 / 删除 / 生成之后都重拉)。
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
   * 替换哪一份(现有那一份的 id;null = 还没有,新加)。
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
 * 拖放悬停 / 拖离工厂(makeDragOver / makeDragLeave)的入参。
 */
export type DragSetIn = {
  /**
   * 拖放高亮落格。
   */
  setDragOn: (v: boolean) => void
}

/**
 * 拖放落下工厂(makeFileDrop)的入参。
 */
export type FileDropIn = {
  /**
   * 现有那一份(有 = 先弹替换确认框)。
   */
  file: MaybeResumeMeta

  /**
   * 一次上传。
   */
  upload: ResumeUploadFn

  /**
   * 拖放高亮落格。
   */
  setDragOn: (v: boolean) => void

  /**
   * 拨替换确认框。
   */
  setAsk: AskSetFn
}

/**
 * 「确认后把拖进来的那个文件传上去」(makeUploadRun)的入参。
 */
export type UploadRunIn = {
  /**
   * 一次上传。
   */
  upload: ResumeUploadFn

  /**
   * 拖进来的那个文件。
   */
  file: File
}

/**
 * 打开文件选择器工厂(makePicker)的入参。
 */
export type PickerIn = {
  /**
   * 隐藏文件框(还没挂上是 null)。
   */
  input: HTMLInputElement | null
}

/**
 * 「替换文件」先弹确认框(makeReplaceAsk)的入参。
 */
export type ReplaceAskIn = {
  /**
   * 现有那一份(没有 = 不动)。
   */
  file: MaybeResumeMeta

  /**
   * 隐藏文件框(还没挂上是 null)。
   */
  input: HTMLInputElement | null

  /**
   * 拨替换确认框。
   */
  setAsk: AskSetFn
}

/**
 * 真删(makeDelete / sendDelete)要的两样:重拉与报错落格。
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
 * 「删除」先弹确认框(makeDeleteAsk)的入参。
 */
export type DeleteAskIn = {
  /**
   * 现有那一份(没有 = 不动)。
   */
  file: MaybeResumeMeta

  /**
   * 拨删除确认框。
   */
  setAsk: AskSetFn

  /**
   * 重拉与报错落格。
   */
  act: ResumeActIn
}

/**
 * 真删工厂(makeDelete)与那一次请求(sendDelete)的入参。
 */
export type DeleteIn = {
  /**
   * 重拉与报错落格。
   */
  act: ResumeActIn

  /**
   * 删哪一份。
   */
  id: number
}

/**
 * 确认框确认钮(makeAskOk)的入参。
 */
export type AskOkIn = {
  /**
   * 等着确认的那一次。
   */
  ask: Ask | null

  /**
   * 拨框手柄。
   */
  setAsk: AskSetFn
}
