/**
 * notice 域的形状:提醒框的 props 契约。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */

/**
 * 提醒四色(#114 拍板四色四用禁新配色):warn 升级/额度琥珀、err 错误红、
 * info 口径/注记蓝、ok 成功绿。
 */
export type NoticeKind = 'warn' | 'err' | 'info' | 'ok'

/**
 * noticeClsOf 的入参:色与调用方追加类。
 */
export type NoticeClsIn = {
  /**
   * 四色之一。
   */
  kind: NoticeKind

  /**
   * 调用方追加类;null = 没有。
   */
  className: string | null
}

/**
 * Notice 的 props。
 */
export type NoticeIn = {
  /**
   * 四色之一(可省 = info)。
   */
  kind?: NoticeKind

  /**
   * 粗体引导语(可省)。
   */
  lead?: React.ReactNode

  /**
   * 右侧钮槽(可省)。
   */
  action?: React.ReactNode

  /**
   * 调用方几何微调(过渡口,消费页形制化后收)。
   */
  style?: React.CSSProperties

  /**
   * 调用方追加类(过渡口,同上)。
   */
  className?: string

  /**
   * 正文。
   */
  children?: React.ReactNode
}
