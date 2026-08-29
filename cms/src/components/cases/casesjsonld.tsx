/**
 * 域内小件:索引页的 ItemList 结构化数据(rich result)。不带 `'use client'` ——
 * 由服务端页面门直接渲染,内容是死的,进不了客户端包才对。拼装在 functions 的
 * casesJsonLd(单一来源 lib/ruling 的 CASES:页面列的和喂给搜索引擎的是同一份)。
 * 2026-08-29 页面规范化批自页面门提出成件(页面只许拼大写组件,裸 script 不留在门里;
 * 形照抄 resources 的 ResJsonLd)。
 *
 * @author Frank
 * @time 2026-08-29 04:30:00
 */
import { MIME_LD_JSON } from './constants'
import { casesJsonLd } from './functions'

/**
 * 渲染索引页 ItemList 的 JSON-LD 脚本。
 *
 * @returns 结构化数据脚本标签。
 */
export function CasesJsonLd() {
  return (
    <script type={MIME_LD_JSON} dangerouslySetInnerHTML={{ __html: casesJsonLd() }} />
  )
}
