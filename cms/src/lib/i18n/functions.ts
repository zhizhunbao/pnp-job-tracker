/**
 * i18n 域的行为:判语、落盘、装配与取词。
 * (2026-08-24 抽屉化自 index.ts;装配序与 08-22 改版时逐字一致。)
 *
 * 🔴 本目录一律不带 `'use client'`:服务端 page.tsx(SSR 首帧语言、generateMetadata)
 * 也 import 它。老坑 6:服务端组件从 `'use client'` 模块导入常量会拿到 undefined。
 * 装配所需的两张表(pathwayNames/nocLabels)从域桶取,这条边是「i18n 装配 ← 域的映射体」,
 * 方向与「域 → i18n 取词」并存但无运行时环(域侧只 import type)。
 *
 * @author Frank
 * @time 2026-08-24 03:30:00
 */
import { caseZh, consultZh, jobsZh, legalZh, pteZh, quizZh, reportZh, siteZh } from './zh'
import { caseEn, consultEn, jobsEn, legalEn, pteEn, quizEn, reportEn, siteEn } from './en'
import { caseKo, consultKo, jobsKo, legalKo, pteKo, quizKo, reportKo, siteKo } from './ko'
import { nocLabels } from '@/lib/jobs'
import { pathwayNames } from '@/lib/pathways'
import { ACCEPT_NONE, COOKIE_EQ, COOKIE_PATH_AGE, COOKIE_SAMESITE, LANG_COOKIE, LANG_COOKIE_MAX_AGE_S, LANG_EN, LANG_KEY, LANG_KO, LANG_ZH, LANGS, VAR_L, VAR_R } from './constants'
import { CACHE } from './variables'
import type { Dict, Lang, Messages, MaybeLang, RawAccept, RawLangPref, TFn, TVars } from './types'

/**
 * 认得出的语言码留下,认不出的给 null(不猜)。
 *
 * @param raw cookie / localStorage / 正则捕获组里的原料。
 * @returns 语言码;认不出是 null。
 */
export function parseLang(raw: RawLangPref): MaybeLang {
  if (raw === LANG_ZH || raw === LANG_EN || raw === LANG_KO) {
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
  const n = (raw || ACCEPT_NONE).toLowerCase()
  if (n.startsWith(LANG_ZH)) {
    return LANG_ZH
  }
  if (n.startsWith(LANG_KO)) {
    return LANG_KO
  }
  if (n !== '') {
    return LANG_EN
  }
  return LANG_ZH
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
  storeLocalLang(l)
  storeCookieLang(l)
}

/**
 * localStorage 落盘(独立吞错:它被禁不影响 cookie 那一半)。
 *
 * @param l 用户选的语言。
 * @returns 无。
 */
function storeLocalLang(l: Lang): void {
  try {
    localStorage.setItem(LANG_KEY, l)
  } catch {
    return
  }
}

/**
 * cookie 落盘(独立吞错;SSR 首帧语言靠它)。
 *
 * @param l 用户选的语言。
 * @returns 无。
 */
function storeCookieLang(l: Lang): void {
  try {
    document.cookie = LANG_COOKIE + COOKIE_EQ + l + COOKIE_PATH_AGE + LANG_COOKIE_MAX_AGE_S + COOKIE_SAMESITE
  } catch {
    return
  }
}

/**
 * 造一门语言的取词函数:缺失回退 zh,再回退 key 本身;支持 {var} 插值。
 *
 * @param lang 界面语言。
 * @returns 取词函数(带 lang 只读字段)。
 */
export function makeT(lang: Lang): TFn {
  const all = messagesOf()
  const dict = all[lang]

  // eslint-disable-next-line local/no-optional, local/one-parameter -- TFn 的形态(两参、第二参可省)由全站调用点定,见 TFn 的特批
  function take(key: string, vars?: TVars): string {
    let s = dict[key]
    if (s == null) {
      s = all.zh[key]
    }
    if (s == null) {
      s = key
    }
    if (vars != null) {
      for (const k of Object.keys(vars)) {
        s = s.split(VAR_L + k + VAR_R).join(String(vars[k]))
      }
    }
    return s
  }

  const t: TFn = take
  t.lang = lang
  return t
}

/**
 * 合并词表单件:首调装配一次进 CACHE,之后直接给。
 * 三个语言文件的同名块装配回「域 × 语言」的一组表;合并顺序与 08-22 改版前逐字一致
 * (report → pathwayNames → caseCopy → jobs → nocLabels → site → consult → quiz → legal),
 * 后并的块同键覆盖先并的 —— 与旧版展开一致。
 *
 * @returns 每语言一张合并后的扁平表。
 */
function messagesOf(): Messages {
  if (CACHE.messages != null) {
    return CACHE.messages
  }
  const report: Record<Lang, Dict> = { zh: reportZh, en: reportEn, ko: reportKo }
  const jobs: Record<Lang, Dict> = { zh: jobsZh, en: jobsEn, ko: jobsKo }
  const site: Record<Lang, Dict> = { zh: siteZh, en: siteEn, ko: siteKo }
  const consult: Record<Lang, Dict> = { zh: consultZh, en: consultEn, ko: consultKo }
  const quiz: Record<Lang, Dict> = { zh: quizZh, en: quizEn, ko: quizKo }
  const legal: Record<Lang, Dict> = { zh: legalZh, en: legalEn, ko: legalKo }
  const caseCopy: Record<Lang, Dict> = { zh: caseZh, en: caseEn, ko: caseKo }
  const pte: Record<Lang, Dict> = { zh: pteZh, en: pteEn, ko: pteKo }
  const parts: Record<Lang, Dict>[] = [report, pathwayNames, caseCopy, jobs, nocLabels, site, consult, quiz, legal, pte]
  const merged: Messages = { zh: {}, en: {}, ko: {} }
  for (const part of parts) {
    for (const one of LANGS) {
      Object.assign(merged[one.code], part[one.code])
    }
  }
  CACHE.messages = merged
  return merged
}
