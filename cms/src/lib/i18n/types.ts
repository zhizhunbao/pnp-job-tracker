/**
 * i18n 域的形状:语言码、词表、取词函数的契约。
 * (2026-08-24 抽屉化:原全装在 index.ts 的过渡形,Frank「lib 下的 i18n 也需要分抽屉」。)
 *
 * @author Frank
 * @time 2026-08-24 03:30:00
 */

/**
 * 站点支持的语言码。加一门语言 = 这里一格 + 语言文件一个 + functions 装配三处(tsc 逐处点名)。
 */
export type Lang = 'zh' | 'en' | 'ko'

/**
 * 一门语言的扁平词表(key → 文案)。三语对齐由编译器管:en.ts / ko.ts 每块标
 * `Record<keyof typeof xxZh, string>`,漏一条 = tsc 红(缺属性);多一条 = tsc 红(超额属性)。
 */
export type Dict = Record<string, string>

/**
 * 语言码或没有(parseLang 认不出时的返回;首访没偏好也是它)。
 */
export type MaybeLang = Lang | null

/**
 * 语言偏好的原料(cookie / localStorage / 正则捕获组;类型不可信,判定在 parseLang)。
 */
// eslint-disable-next-line local/no-undefined-type -- 语言接缝:调用点有 regex 捕获组(`match(...)?.[1]`),JS 的 undefined 在门口这一格收
export type RawLangPref = string | null | undefined

/**
 * Accept-Language 头或 navigator.language 的原料(headers().get 给 null)。
 */
export type RawAccept = string | null

/**
 * `t(key, vars)` 的插值表({k} → 值)。
 */
export type TVars = Record<string, string | number>

/**
 * 取词函数:`t(key, vars)` 返回当前语言的文案;`lang` 只读字段随函数携带。
 * 语言挂在 t 上是因为分类名这类**来自维度表**的显示名要按语言取列(见 lib/noc catName),
 * 而调用点拿到的往往只有 t —— 挂一个只读字段比给几十处调用签名多传一个参数便宜。
 */
// eslint-disable-next-line local/no-optional -- 取词门面:vars 可省,形态由全站几百个调用点的人体工学定(同 track 特批)
export type TFn = ((key: string, vars?: TVars) => string) & {
  /**
   * 挂载的当前语言(分类名等维度表显示名按它取列,见 lib/noc catName)。
   */
  lang?: Lang
}

/**
 * 每语言一张合并后的扁平词表(装配产物;variables 的单件与 messagesOf 的返回)。
 */
export type Messages = Record<Lang, Dict>

/**
 * `ssrLang` 的返回(SSR 首帧语言)。
 */
export type LangOut = Promise<Lang>
