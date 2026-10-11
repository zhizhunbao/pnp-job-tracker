/**
 * notify 组件桶的形状:通知清单的线格式与洗净形、铃铛整机面板、各件的 props。
 *
 * @author Frank
 * @time 2026-10-11 10:00:00
 */

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形,本域自声明)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 通知一条(与 lib/notify 的 NotifyRow 同形,本域自抄)。
 */
export type NotifyItem = {
  /**
   * 种类:reply / bounced / sent / picks。
   */
  kind: string

  /**
   * 指向哪一行:回信 = 信 id,退信 / 已发出 = 投递行 id,今日推荐 = 0。
   */
  id: number

  /**
   * 公司名(今日推荐空串)。
   */
  label: string

  /**
   * 今日推荐几条(别的种类 0)。
   */
  n: number

  /**
   * 发生的时刻(ISO)。
   */
  at: string

  /**
   * 比上次看铃铛新。
   */
  unseen: boolean
}

/**
 * GET /api/notify 的回包(线格式:缺席按空读)。
 */
export type NotifyRespJson = {
  /**
   * 清单。
   */
  items?: NotifyItem[]

  /**
   * 几条没看过。
   */
  unseen?: number
}

/**
 * 通知清单(洗净)。
 */
export type NotifyFact = {
  /**
   * 清单,新的在前。
   */
  items: NotifyItem[]

  /**
   * 几条没看过(铃铛上的红色数字)。
   */
  unseen: number
}

/**
 * Bell 的 props。
 */
export type BellIn = {
  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * useBell 的入参。
 */
export type BellHookIn = {
  /**
   * 钮 + 面板的外框(点外面关;组件里起的 ref)。
   */
  ref: React.RefObject<HTMLSpanElement | null>
}

/**
 * 铃铛整机面板。
 */
export type BellPanel = {
  /**
   * 清单(还没拉回来 = null)。
   */
  data: NotifyFact | null

  /**
   * 拉失败了。
   */
  failed: boolean

  /**
   * 面板开着。
   */
  open: boolean

  /**
   * 开 / 关面板(开的那一下记「看过了」)。
   */
  toggle: () => void

  /**
   * 关面板。
   */
  close: () => void
}

/**
 * BellPop(面板)的 props。
 */
export type BellPopIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 清单(还没拉回来 = null)。
   */
  data: NotifyFact | null

  /**
   * 拉失败了。
   */
  failed: boolean

  /**
   * 关面板(Esc)。
   */
  onClose: () => void
}

/**
 * BellRow(面板里一条)的 props。
 */
export type BellRowIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这一条。
   */
  item: NotifyItem
}

/**
 * makeLoadNotify 的入参。
 */
export type LoadNotifyIn = {
  /**
   * 写清单。
   */
  setData: (v: NotifyFact | null) => void

  /**
   * 拨「拉失败了」。
   */
  setFailed: (v: boolean) => void
}

/**
 * makeBellToggle 的入参。
 */
export type BellToggleIn = {
  /**
   * 面板开着没有。
   */
  open: boolean

  /**
   * 拨开合。
   */
  setOpen: (v: boolean) => void

  /**
   * 现在的清单。
   */
  data: NotifyFact | null

  /**
   * 写清单。
   */
  setData: (v: NotifyFact | null) => void
}

/**
 * itemTextOf 的入参。
 */
export type ItemTextIn = {
  /**
   * 这一条。
   */
  item: NotifyItem

  /**
   * 取词函数。
   */
  t: TFn
}
