/**
 * 文案的桶 —— 全站唯一的语言机制:语言是哪几门、怎么判、怎么落盘、怎么取词。
 *
 * 2026-08-22 Frank 拍板改按**语言**分文件:zh.ts(母本)/ en.ts / ko.ts 各装整站一门语言,
 * 域降级为语言文件内的分段横幅;身份+三语一体的块「所有都按域来管理」—— 并进各域的
 * constants.ts,法律/官方资料为此立了新域(lib/legal、lib/official)。
 * 加一门语言 = 加一个语言文件 + 下面 `Lang` 一行 + 装配表七行(tsc 会逐处点名)。
 *
 * 🔴 本目录一律不带 `'use client'`:服务端 page.tsx(SSR 首帧语言、generateMetadata)也 import 它。
 * 老坑 6:服务端组件从 `'use client'` 模块导入常量会拿到 undefined。
 *
 * 边界:**给模型看的提示词不进这里**(system/instructions 归 prompts.ts)——
 * 用户永远看不到它们,也不需要翻译。装配所需的两张表(pathwayNames/nocLabels)从域桶取,
 * 这条边是「i18n 装配 ← 域的映射体」,方向与「域 → i18n 取词」并存但无运行时环(域侧只 import type)。
 *
 * @author Frank
 * @time 2026-08-22 20:00:00
 */

import { caseZh, consultZh, jobsZh, legalZh, quizZh, reportZh, siteZh } from './zh'
import { caseEn, consultEn, jobsEn, legalEn, quizEn, reportEn, siteEn } from './en'
import { caseKo, consultKo, jobsKo, legalKo, quizKo, reportKo, siteKo } from './ko'
import { nocLabels } from '@/lib/jobs'
import { pathwayNames } from '@/lib/pathways'

/**
 * 站点支持的语言码。
 */
export type Lang = 'zh' | 'en' | 'ko'

/**
 * 语言切换器的档位(code 进 makeT,label 是切换器上那个字)。
 * 한 保留(2026-07-19 Frank 拍板):全量文案经本地 qwen3.6 对照 zh/en 校对一轮后亮回。
 */
export const LANGS: { code: Lang; label: string }[] = [
  { code: 'zh', label: '中' },
  { code: 'en', label: 'EN' },
  { code: 'ko', label: '한' },
]

/**
 * 一门语言的扁平词表(key → 文案)。三语对齐由编译器管:en.ts / ko.ts 每块标
 * `Record<keyof typeof xxZh, string>`,漏一条 = tsc 红(缺属性);多一条 = tsc 红(超额属性)。
 */
export type Dict = Record<string, string>

/**
 * localStorage 的语言偏好键(老用户的既有偏好来源,cookie 被清时兜底)。
 */
export const LANG_KEY = 'jobs.lang'

/**
 * 语言偏好 cookie 名。语言也走 cookie(2026-08-03 Frank「英韩版刷新为什么先闪中文」):
 * 原来只存 localStorage —— 服务端读不到,于是 SSR 一律渲中文,浏览器先画中文那一帧,
 * 等水合后才换语言。cookie 服务端读得到 → 首帧就是对的(同列偏好 COLS_COOKIE 的老路)。
 */
export const LANG_COOKIE = 'jt.lang.v1'

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
 * 认得出的语言码留下,认不出的给 null(不猜)。
 *
 * @param raw cookie / localStorage / 正则捕获组里的原料。
 * @returns 语言码;认不出是 null。
 */
export function parseLang(raw: RawLangPref): MaybeLang {
  if (raw === 'zh' || raw === 'en' || raw === 'ko') {
    return raw
  }
  return null
}

/**
 * 首访没偏好时按浏览器语言判(navigator.language 或 Accept-Language 头,同一套判据)。
 * 红线:不许按 IP 判 —— 加拿大华人 IP=加拿大,会被错切英文,浏览器语言才是本人信号。
 * 头都没有(爬虫/直连)→ 站点默认中文,与改造前 useState('zh') 一致。
 *
 * @param raw Accept-Language 头或 navigator.language。
 * @returns 首帧语言。
 */
export function langFromAccept(raw: RawAccept): Lang {
  const n = (raw || '').toLowerCase()
  if (n.startsWith('zh')) {
    return 'zh'
  }
  if (n.startsWith('ko')) {
    return 'ko'
  }
  if (n !== '') {
    return 'en'
  }
  return 'zh'
}

/**
 * 显式切换语言时落盘:localStorage(既有)+ cookie(给 SSR 看)。一年期,path=/ 全站通用。
 * 两个 catch 都静默:隐私模式/禁 cookie 下写不进是常态,语言落盘失败页面照常
 * (下次访问回到判语),留痕只会刷屏(同 track 的埋点吞错先例)。
 *
 * @param l 用户选的语言。
 * @returns 无。
 */
export function saveLang(l: Lang): void {
  try {
    localStorage.setItem(LANG_KEY, l)
  } catch {}
  try {
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`
  } catch {}
}

/**
 * 三个语言文件的同名块装配回「域 × 语言」的一组表。
 * 合并顺序与改版前逐字一致(report → pathwayNames → caseCopy → jobs → nocLabels → site → consult → quiz → legal)。
 */
const report: Record<Lang, Dict> = { zh: reportZh, en: reportEn, ko: reportKo }

/**
 * 职位板块。
 */
const jobs: Record<Lang, Dict> = { zh: jobsZh, en: jobsEn, ko: jobsKo }

/**
 * 站点壳块。
 */
const site: Record<Lang, Dict> = { zh: siteZh, en: siteEn, ko: siteKo }

/**
 * 顾问块。
 */
const consult: Record<Lang, Dict> = { zh: consultZh, en: consultEn, ko: consultKo }

/**
 * 答题块。
 */
const quiz: Record<Lang, Dict> = { zh: quizZh, en: quizEn, ko: quizKo }

/**
 * 法务块。
 */
const legal: Record<Lang, Dict> = { zh: legalZh, en: legalEn, ko: legalKo }

/**
 * 案例库块。
 */
const caseCopy: Record<Lang, Dict> = { zh: caseZh, en: caseEn, ko: caseKo }

/**
 * 装配序(唯一的真相:改并块顺序只改这里)。
 */
const PARTS: Record<Lang, Dict>[] = [report, pathwayNames, caseCopy, jobs, nocLabels, site, consult, quiz, legal]

/**
 * 每语言一张合并后的扁平表(按 PARTS 序 Object.assign,后并的块同键覆盖先并的 —— 与旧版展开一致)。
 */
const MESSAGES: Record<Lang, Dict> = { zh: {}, en: {}, ko: {} }
for (const part of PARTS) {
  for (const one of LANGS) {
    Object.assign(MESSAGES[one.code], part[one.code])
  }
}

/**
 * `t(key, vars)` 的插值表({k} → 值)。
 */
export type TVars = Record<string, string | number>

/**
 * 取词函数:`t(key, vars)` 返回当前语言的文案;`lang` 只读字段随函数携带。
 * 语言挂在 t 上是因为分类名这类**来自维度表**的显示名要按语言取列(见 lib/noc catName),
 * 而调用点拿到的往往只有 t —— 挂一个只读字段比给几十处调用签名多传一个参数便宜。
 */
// eslint-disable-next-line local/no-optional -- 取词门面:vars 可省、lang 是挂载字段,形态由全站几百个调用点的人体工学定(同 track 特批)
export type TFn = ((key: string, vars?: TVars) => string) & { lang?: Lang }

/**
 * `ssrLang` 的返回(SSR 首帧语言)。
 */
export type LangOut = Promise<Lang>

/**
 * 造一门语言的取词函数:缺失回退 zh,再回退 key 本身;支持 {var} 插值。
 *
 * @param lang 界面语言。
 * @returns 取词函数(带 lang 只读字段)。
 */
export function makeT(lang: Lang): TFn {
  const dict = MESSAGES[lang] || MESSAGES.zh

  // eslint-disable-next-line local/no-optional, local/one-parameter -- TFn 的形态(两参、第二参可省)由全站调用点定,见 TFn 的特批
  function take(key: string, vars?: TVars): string {
    let s = dict[key]
    if (s == null) {
      s = MESSAGES.zh[key]
    }
    if (s == null) {
      s = key
    }
    if (vars != null) {
      for (const k of Object.keys(vars)) {
        s = s.split(`{${k}}`).join(String(vars[k]))
      }
    }
    return s
  }

  const t: TFn = take
  t.lang = lang
  return t
}
