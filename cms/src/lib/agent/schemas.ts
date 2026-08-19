/**
 * 三个工具的参数 schema:pi 在 execute 之前按它校验,TS 的入参类型也从它推。
 *
 * @author Frank
 * @time 2026-08-19 03:28:12
 */

import { Type } from '@earendil-works/pi-ai'
import { TOOL_DESC } from './prompts'

// search 的参数:模型拼的检索词。
export const SEARCH_PARAMS = Type.Object({
  query: Type.String({ description: TOOL_DESC.searchQuery }),
})

// set_slots 的参数:NOC(可为 null)、省码、一句理由。
export const SET_SLOTS_PARAMS = Type.Object({
  noc: Type.Union([Type.String(), Type.Null()], { description: TOOL_DESC.setSlotsNoc }),
  provinces: Type.Optional(Type.Array(Type.String(), { description: TOOL_DESC.setSlotsProvinces })),
  reason: Type.Optional(Type.String({ description: TOOL_DESC.setSlotsReason })),
})

// give_up 的参数:一句「为什么放弃」,可不填。
export const GIVE_UP_PARAMS = Type.Object({ reason: Type.Optional(Type.String()) })
