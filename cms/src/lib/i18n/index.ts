/**
 * i18n 域的浏览器安全门 —— 门里只有转发(2026-08-24 抽屉化:原「index 装机器」的
 * 过渡形退役,机器进 functions、形状进 types、死值进 constants、合并表单件进 variables;
 * 三语文件 zh/en/ko 是货照旧)。
 *
 * 2026-08-22 Frank 拍板按**语言**分文件:zh.ts(母本)/ en.ts / ko.ts 各装整站一门语言,
 * 域降级为语言文件内的分段横幅;身份+三语一体的块「所有都按域来管理」—— 并进各域的
 * constants.ts,法律/官方资料为此立了新域(lib/legal、lib/official)。
 * 加一门语言 = 语言文件一个 + types 的 Lang 一格 + constants 档位一行 + functions 装配三处
 * (tsc 会逐处点名)。
 *
 * 边界:**给模型看的提示词不进这里**(system/instructions 归 prompts.ts)——
 * 用户永远看不到它们,也不需要翻译。
 *
 * @author Frank
 * @time 2026-08-22 20:00:00
 */
export { LANG_COOKIE, LANG_KEY, LANGS } from './constants'
export { langFromAccept, makeT, parseLang, saveLang } from './functions'
export type { Dict, Lang, LangOut, MaybeLang, RawAccept, RawLangPref, TFn, TVars } from './types'
