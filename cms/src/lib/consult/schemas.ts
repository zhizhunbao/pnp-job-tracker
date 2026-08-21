/**
 * 工具的参数 schema:pi 在 execute 之前按它校验,TS 的入参类型也从它推。
 *
 * 🔴 这里**只声明形状,不做采信**。模型给的职业码要在搜索候选里出现过、省码要在白名单里,
 * 那两道在 `functions.ts` 的采信层 —— schema 的 description 是**求**它填对,白名单才是**拦**它填错。
 * (实测:给省码加一句「two-letter code, e.g. MB」能把 `"Manitoba"` 治成 `"MB"`,但治不了它编一个省。)
 *
 * @author Frank
 * @time 2026-08-19 18:04:11
 */

import { Type } from '@earendil-works/pi-ai'
import { TOOL_DESC } from './prompts'

/**
 * 查职业候选:一个检索词。
 */
export const SEARCH_PARAMS = Type.Object({
  /**
   * 职名。实测模型爱把整句话塞进来,进来之后还会截断。
   */
  query: Type.String({ description: TOOL_DESC.searchQuery }),
})

/**
 * 只要一个职业码的那几把工具(在招岗位、清单收录、EE)。
 */
export const NOC_PARAMS = Type.Object({
  /**
   * 职业码,必须来自搜索结果。
   */
  noc: Type.String({ description: TOOL_DESC.noc }),
})

/**
 * 职业码 + 可选省份清单(门槛、时间线)。
 */
export const NOC_PROVS_PARAMS = Type.Object({
  /**
   * 职业码,必须来自搜索结果。
   */
  noc: Type.String({ description: TOOL_DESC.noc }),

  /**
   * 要看哪几个省。不填 = 全部省。
   */
  provs: Type.Optional(Type.Array(Type.String({ description: TOOL_DESC.prov }))),
})

/**
 * 只要一个省码的那两把工具(抽签、处理时长)。
 */
export const PROV_PARAMS = Type.Object({
  /**
   * 省码。白名单过滤在采信层。
   */
  prov: Type.String({ description: TOOL_DESC.prov }),
})

/**
 * 联邦规则:哪个项目。
 */
export const PERMIT_PARAMS = Type.Object({
  /**
   * 四个联邦项目之一。写成联合类型,模型填别的当场校验失败,省一轮纠正。
   */
  program: Type.Union(
    [Type.Literal('PGWP'), Type.Literal('CEC'), Type.Literal('FSW'), Type.Literal('FST')],
    { description: TOOL_DESC.permit },
  ),
})

/**
 * 计分表:哪一套分。
 */
export const CRS_PARAMS = Type.Object({
  /**
   * CRS 是进池后的排名分,FSW67 是够不够资格进池的选择因素分 —— 官方定义的两套分,不许混。
   */
  grid: Type.Union([Type.Literal('CRS'), Type.Literal('FSW67')], { description: TOOL_DESC.crsGrid }),

  /**
   * 只看某一节,不填 = 整张表。枚举锁死成库里真有的节号(CRS 的 A–D;FSW67 单节不筛)——
   * 自由字符串时模型填 'age' 之类,查空后无限重打同一把工具直到超时(2026-08-21 烟测实撞)。
   */
  section: Type.Optional(
    Type.Union(
      [Type.Literal('A'), Type.Literal('B'), Type.Literal('C'), Type.Literal('D')],
      { description: TOOL_DESC.crsSection },
    ),
  ),
})

/**
 * 主张对账:用户被别人告知的那几句话。
 */
export const CLAIMS_PARAMS = Type.Object({
  /**
   * 职业码。对账要按 TEER 挑门槛行。
   */
  noc: Type.String({ description: TOOL_DESC.noc }),

  /**
   * 每条主张一句,用用户自己的话。
   */
  claims: Type.Array(Type.String({ description: TOOL_DESC.claimText })),
})

/**
 * 路径裁决:**不收任何参数**。
 *
 * 🔴 档案值一律从我们自己存着的槽位闭包取,不给模型编的机会 ——
 * 「缺一个槽 ≠ 有一个默认值」,`married: false` 会直接换一张 CRS 分表。
 */
export const VERDICT_PARAMS = Type.Object({})
