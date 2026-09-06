/**
 * 官方资料域的形状 —— 本域自己声明。
 *
 * @author Frank
 * @time 2026-08-22 22:00:00
 */

import type { Db } from '../db'

/**
 * 界面语言码(镜像 i18n 的 Lang;types 是叶子不 import,加语言时 i18n 装配处 tsc 会点名)。
 */
export type LangCode = 'zh' | 'en' | 'ko'

/**
 * 一条官方资源:`name`/`url` 是身份,`use` 是三语用途说明 —— 拆开会让
 * 「这条资源说什么」跨两个文件(2026-08-17 自 app/(frontend)/resources/data.ts 整体搬来,E4-05)。
 */
export type Res = {
  /**
   * 资源名(身份,官方原名)。
   */
  name: string

  /**
   * 三语用途说明。
   */
  use: Record<LangCode, string>

  /**
   * 官方 URL(身份;人工核对现行有效)。
   */
  url: string
}

/**
 * 资源导航的一个分组(cat 分组名 + 组内资源)。
 */
export type ResGroup = {
  /**
   * 分组名(federal/provincial/authority…)。
   */
  cat: string

  /**
   * 组内资源。
   */
  items: Res[]
}

/**
 * `officialLabel` 的入参。
 */
export type RuleDbRow = {
  /**
   * 省码(联邦段 FED)。
   */
  province: string | null

  /**
   * 通道码(AIP / RCIP / FCIP / PGWP / CEC / FSW / FST / PR-fees;省行多为空)。
   */
  program: string | null

  /**
   * 分流(省提名的类别名,或 teer-0-1 这类适用档)。
   */
  stream: string | null

  /**
   * 人话标签(英文,数据层抄官方页时写的)。
   */
  label: string | null

  /**
   * 官方原句(quote-anchored)。
   */
  value_text: string | null

  /**
   * 官方页 URL。
   */
  url: string | null
}

/**
 * 通道门槛一行(对外)。
 */
export type RuleRow = {
  /**
   * 分流('' = 不分)。
   */
  stream: string

  /**
   * 人话标签(英文)。
   */
  label: string

  /**
   * 官方原句。
   */
  quote: string

  /**
   * 官方页 URL。
   */
  url: string
}

/**
 * 一个通道(或一省)的门槛清单。
 */
export type RuleGroup = {
  /**
   * 组键:联邦段 = 通道码,省段 = 省码(锚点与文案键都按它)。
   */
  key: string

  /**
   * 省码(联邦段 FED)。
   */
  province: string

  /**
   * 通道码(省段空串)。
   */
  program: string

  /**
   * 门槛行,按库内 seq 序。
   */
  rows: RuleRow[]
}

/**
 * 分组清单。
 */
export type RuleGroups = RuleGroup[]

/**
 * `loadRuleGroups` 的出参(连库现查,异步)。
 */
export type RuleGroupsOut = Promise<RuleGroups>

/**
 * `toRuleGroupSeed` 的出参:分组前的一行。
 */
export type RuleGroupSeed = {
  /**
   * 组键。
   */
  key: string

  /**
   * 省码。
   */
  province: string

  /**
   * 通道码。
   */
  program: string

  /**
   * 洗净的行。
   */
  row: RuleRow
}

/**
 * `loadRuleGroups` 的入参。
 */
export type LoadRuleGroupsIn = {
  /**
   * 能打 SQL 的东西(池由页面门注入)。
   */
  db: Db
}

/**
 * `officialLabel` 的入参。
 */
export type OfficialLabelIn = {
  /**
   * 官方英文原句。
   */
  raw: string

  /**
   * 界面语言(调用端的 `t.lang`,宽字符串;不认识的语言查表落空后回落原文)。
   */
  lang: string
}
