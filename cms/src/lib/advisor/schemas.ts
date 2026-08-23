/**
 * advisor 域的运行时校验:pi 工具的参数 schema。
 * 只有一把 web_fetch,且**零参数** —— 抓哪个 URL 由服务端定死为官网,
 * 模型只决定调不调,不给它填任意 URL 的口子(SSRF 面直接归零)。
 *
 * @author Frank
 * @time 2026-08-23 21:00:00
 */
import { Type } from '@earendil-works/pi-ai'

/**
 * web_fetch 的参数 schema:空对象。
 */
export const WEB_FETCH_PARAMS = Type.Object({})
