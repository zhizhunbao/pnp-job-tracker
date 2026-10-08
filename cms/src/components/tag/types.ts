/**
 * tag 域的形状:状态标签的 props 契约。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */

/**
 * 标签变体(七种,一种一套配色,值 = 把脉页胶囊那套):region 省/地区(绿)、federal 联邦(青)、imp 重要/紧(红)、
 * warn 关注/中(黄)、ok 通过/易(绿)、pro 付费层(金)、gray 中性事实标签(灰)。
 * 2026-10-04 加第八种 pick 已选(浅主色;访客四题改版收口:向导里回显已选职业的标签原借 region 绿,语义是省 / 地区,
 * 效果图是浅主色 —— 与选中的选择格、大号胶囊同一套颜色)。
 */
export type TagVariant = 'region' | 'federal' | 'imp' | 'warn' | 'ok' | 'pro' | 'gray' | 'pick' | 'info' | 'bad'

/**
 * Tag 的 props。
 */
export type TagIn = {
  /**
   * 变体(可省 = region)。
   */
  variant?: TagVariant

  /**
   * 悬停提示(原生 title 属性;可省)。
   */
  title?: string

  /**
   * 文字后面带一颗 × 摘除钮(可省 = 纯标签,不可点;2026-10-05 带删钮的标签收进本桶:首访向导 / 访客第 3 题的已选职业、
   * 访客第 2 题的已选专业同一枚,原 × 住 profile 桶的 OnboardingTags)。
   */
  del?: TagDel

  /**
   * 标签文字。
   */
  children: React.ReactNode
}

/**
 * 标签上那颗 × 摘除钮的规格(2026-10-05 立)。
 */
export type TagDel = {
  /**
   * 读屏名(界面语,如「移除 {名字}」;钮面只有一个 ×,读屏只能靠它说出摘的是哪一枚)。
   */
  aria: string

  /**
   * 点 ×:摘掉这一枚(调用方给)。
   */
  onClick: () => void
}

/**
 * TagRow(已选标签一行:定高一行、放不下横着滚)的 props(2026-10-05 立,自 majors 桶已选专业那一行收来)。
 */
export type TagRowIn = {
  /**
   * 行首的灰字小标(如「已选 2/3」「已选 5 个」;2026-10-05 Frank「这部分要不要加一个 已选 的标识」立)。
   */
  label: string

  /**
   * 行里的标签(一般是带 × 摘除钮的 pick 档 Tag;顺序即渲染顺序)。
   */
  children: React.ReactNode
}

/**
 * TagFold(可折叠的一排标签)的 props。
 */
export type TagFoldIn = {
  /**
   * 全部标签文字(顺序即渲染顺序;同一排里不重复)。
   */
  items: string[]

  /**
   * 收着时露前几枚。
   */
  first: number

  /**
   * 这一排标签的变体。
   */
  variant: TagVariant

  /**
   * 界面语取词函数(展开 / 收起钮面由 pager 桶 FoldLine 现拼;2026-10-02 Frank「全站统一 都改成 展开 20 和 收起。全部统一」,原「展开钮 / 收起钮两枚现成钮面」撤)。
   */
  t: TagT

  /**
   * 展开钮的量词(调用方取好词,如「个」)。
   */
  unit: string
}

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形:键 + 可选插值;本域自抄,types 不许 import)。
 */
export type TagT = (key: string, vars?: Record<string, string | number>) => string

/**
 * tagsShownOf 的入参:全部标签、默认露几枚与已展开几枚。
 */
export type TagsShownIn = {
  /**
   * 全部标签文字。
   */
  items: string[]

  /**
   * 收着时露前几枚。
   */
  first: number

  /**
   * 已展开几枚(收着为 0)。
   */
  extra: number
}

