/**
 * button 域的形状:按钮的 props 契约与类名预算入参。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */

/**
 * 按钮变体。全站的钮都在这个域里(2026-08-24 Frank 拍板「用我自己的 button 域
 * 把所有 button 管理起来」;「页面本身就有这么多按钮,18 个变体怎么了」)——
 * 变体多不是坏事,是如实反映页面上真有这么多种钮,而且每一种都有名字有注释、
 * 值在一个 css 里,不再散成 20 个文件各写各的。
 *
 * ── 六个**行动钮**(有颜色语义,按「这个动作有多重」选)──
 * primary 普通行动蓝 / pro 付费琥珀 / secondary 白底描边 / ai AI 功能靛蓝 /
 * ghost 弱操作幽灵 / danger 危险红。
 *
 * ── 十二个**控件钮**(形状由所在控件定,颜色语义不适用)──
 * icon 弹框窗口钮(灰底方角 30) / iconGhost 悬浮清除钮(透明底 hover 才显) /
 * box 描边方钮(汉堡/抽屉关闭,44 触控靶) / step 翻页箭头(描边小方) /
 * tab 选项卡页签(下划线态) / drop 下拉触发器(纯文字带 caret) /
 * seg 分段钮(语言切换那种挤成一组的) / menu 菜单条目(通栏左对齐) /
 * groupRow 抽屉分组行(通栏两端排开 44 高) / dot 轮播圆点(6px 透明热区) /
 * linkText 文字钮(蓝字无底,如「返回登录」) / linkDim 弱文字钮(灰字,如「忘记密码」)。
 */
export type ButtonKind =
  | 'primary' | 'pro' | 'secondary' | 'ai' | 'ghost' | 'danger'
  | 'icon' | 'iconGhost' | 'box' | 'step' | 'tab' | 'drop'
  | 'seg' | 'menu' | 'groupRow' | 'dot' | 'linkText' | 'linkDim'

/**
 * Button 的 props。
 */
export type ButtonIn = {
  /**
   * 变体(可省 = primary)。
   */
  kind?: ButtonKind

  /**
   * 小一号档。
   */
  sm?: boolean

  /**
   * 大一号档(与 sm 互斥,都传按 sm 算)。
   */
  lg?: boolean

  /**
   * 禁用(禁用时 href 形态也退回 <button>)。
   */
  disabled?: boolean

  /**
   * 点击回调(可省 = 纯链接形态)。
   */
  onClick?: () => void

  /**
   * 传了就渲成 <a>(内链要被爬到);禁用时不生效。
   */
  href?: string

  /**
   * <a> 的 target(传了自动补 rel="noreferrer")。
   */
  target?: string

  /**
   * 悬停提示(原生 title 属性;可省)。
   */
  title?: string

  /**
   * 无障碍名(纯图标钮必须给 —— 读屏只能靠它说出这个钮是干什么的)。
   */
  ariaLabel?: string

  /**
   * 当前态(页签/分段/下拉触发器的高亮:亮起来那一档)。
   */
  active?: boolean

  /**
   * 弹层类钮的展开态(挂 aria-expanded,读屏才知道点开没)。
   */
  expanded?: boolean

  /**
   * 弹层类钮的 aria-haspopup 值(菜单钮给 'menu')。
   */
  haspopup?: 'menu'

  /**
   * 语义角色(页签给 'tab' —— WAI-ARIA 的选项卡模式要它)。
   */
  role?: 'tab'

  /**
   * 键盘序号(页签组里只有当前项进 Tab 序列,其余 -1)。
   */
  tabIndex?: number

  /**
   * 元素 id(页签与面板靠它对上 aria-controls)。
   */
  id?: string

  /**
   * 受控的面板 id(页签指向自己那一面)。
   */
  ariaControls?: string

  /**
   * 选中态(页签的 aria-selected)。
   */
  ariaSelected?: boolean

  /**
   * 键盘事件(页签组的 ← → Home End 导航)。
   */
  onKeyDown?: (e: React.KeyboardEvent) => void

  /**
   * 元素 ref(页签组要把焦点移过去)。
   */
  btnRef?: (el: HTMLButtonElement | null) => void

  /**
   * 表单内的钮默认是 submit —— 传 'button' 明确不提交(表单里的辅助钮必给)。
   */
  type?: 'button' | 'submit'

  /**
   * 调用方几何微调(宽度/边距这类;过渡口 —— 消费页形制化后逐个收进各页的类)。
   */
  style?: React.CSSProperties

  /**
   * 调用方追加类(过渡口,同上)。
   */
  className?: string

  /**
   * 钮文字。
   */
  children: React.ReactNode
}

/**
 * btnClsOf 的入参:变体与尺寸档。
 */
export type BtnClsIn = {
  /**
   * 变体。
   */
  kind: ButtonKind

  /**
   * 小一号档。
   */
  sm: boolean

  /**
   * 大一号档。
   */
  lg: boolean

  /**
   * 当前态(页签/分段/下拉触发器亮起来那一档)。
   */
  active: boolean

  /**
   * 调用方追加类;null = 没有。
   */
  className: string | null
}

/**
 * BackButton 的 props。
 */
export type BackButtonIn = {
  /**
   * 返回目标(真 <a>,要能被爬、能整页导航)。
   */
  href: string

  /**
   * 钮文字(过 i18n 的词)。
   */
  label: string
}

/**
 * LinkButton 的 props。
 */
export type LinkButtonIn = {
  /**
   * 去处(真 <a>:要被爬到、能新开页/中键点;这是它存在的理由)。
   * 可缺的唯一场景:onClick 拦截链的遗留形态(能给尽量给 —— 没 href 爬虫看不见它)。
   */
  href?: string

  /**
   * 点击回调(拦截成弹框/回放历史这类;可省)。
   */
  onClick?: (e: React.MouseEvent) => void

  /**
   * 新开页目标(传了自动补 rel="noreferrer" —— 这条原先在三处逐字抄)。
   */
  target?: string

  /**
   * 悬停提示(原生 title 属性;可省)。
   */
  title?: string

  /**
   * 长相归调用域(link 只管标签语义,不管样式)。
   */
  className?: string

  /**
   * 无障碍名(图标链接这类没有可读文本时传)。
   */
  ariaLabel?: string

  /**
   * 调用方几何微调(Button href 形态的过渡口;消费页形制化后收)。
   */
  style?: React.CSSProperties

  /**
   * 链接内容。
   */
  children: React.ReactNode
}
