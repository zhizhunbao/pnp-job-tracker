/**
 * colors 域的死值:全站配色的**映射表**,不是真值 —— 真值只有一份,在 main.css 的 :root
 * (2026-08-17 Frank「不应该迁移到 main.css 里吗」搬过去的)。
 * 这里留着是因为全站约 450 处 tsx 还在用 `background: UI.primary` 写内联样式。
 * 映射成 var() 而不是复制一份十六进制:调用点一个字不用改,值也不会有第二份。
 * 内联样式吃 var() 没问题;拼透明度那种写法(`${UI.primary}22`)吃不了,
 * 已在 SectionTabs 用 color-mix 替掉,以后也别再写。
 * 每迁完一个组件文件,它对 UI 的引用随之消失;等引用归零,本域删除。
 * (2026-08-24 自 ui/colors.ts 迁入成域;通道档色阶的阈值也住这。)
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */

/**
 * 配色映射表(键 = 语义名,值 = main.css :root 变量的 var() 引用)。
 */
export const UI = {
  /**
   * 主品牌蓝(普通行动)。
   */
  primary: 'var(--primary)',

  /**
   * 深一档的品牌蓝(hover/强调)。
   */
  primaryDeep: 'var(--primary-deep)',

  /**
   * 危险红。
   */
  danger: 'var(--danger)',

  /**
   * 警示琥珀(升级/额度,也是付费色)。
   */
  warn: 'var(--warn)',

  /**
   * 通过绿。
   */
  ok: 'var(--ok)',

  /**
   * 主文字色。
   */
  text: 'var(--text)',

  /**
   * 次级文字灰。
   */
  text2: 'var(--text2)',

  /**
   * 三级文字浅灰(注/小字)。
   */
  text3: 'var(--text3)',

  /**
   * 边框灰。
   */
  border: 'var(--border)',

  /**
   * 更浅的分隔细线。
   */
  hairline: 'var(--hairline)',

  /**
   * 页面底灰。
   */
  bg: 'var(--bg)',

  /**
   * 卡片白。
   */
  card: 'var(--card)',
} as const

/**
 * 通道档色阶阈值:≥5 深绿(E12-08:5/4 绿深浅、3 默认、2 琥珀、1/缺 灰;
 * 移民通道档与公司担保档共用同一套 —— 都是「1-5 档」,一个值一种颜色只该定义一次)。
 */
export const GRADE_DEEP_GREEN_MIN = 5

/**
 * 通道档色阶阈值:≥4 绿。
 */
export const GRADE_GREEN_MIN = 4

/**
 * 通道档色阶阈值:≥3 默认灰黑。
 */
export const GRADE_NEUTRAL_MIN = 3

/**
 * 通道档色阶阈值:≥2 琥珀。
 */
export const GRADE_AMBER_MIN = 2
