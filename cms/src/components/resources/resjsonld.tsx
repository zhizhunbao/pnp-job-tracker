/**
 * 域内小件:整页的 ItemList 结构化数据(rich result)。不带 `'use client'` ——
 * 它由服务端页面门直接渲染,内容是死的,进不了客户端包才对。
 * 单一来源就是 lib/official 的 RES(页面上看得见的和喂给搜索引擎的是同一份),
 * 拼装在 functions 的 resItemListJsonOf。
 * 2026-08-28 换装批自页面门提出成件(页面只许拼大写组件,裸 script 不留在门里)。
 *
 * @author Frank
 * @time 2026-08-28 12:39:03
 */
import { MIME_LD_JSON } from './constants'
import { resItemListJsonOf } from './functions'

/**
 * 渲染 ItemList 的 JSON-LD 脚本。
 *
 * @returns 结构化数据脚本标签。
 */
export function ResJsonLd() {
  return (
    <script type={MIME_LD_JSON} dangerouslySetInnerHTML={{ __html: resItemListJsonOf() }} />
  )
}
