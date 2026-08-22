// 文案的桶 —— 全站唯一的语言机制:语言是哪几门、怎么判、怎么落盘、怎么取词。
//
// 2026-08-22 Frank 拍板改按**语言**分文件:zh.ts(母本)/ en.ts / ko.ts 各装整站一门语言,
// 域降级为语言文件内的分段横幅;身份+三语一体的块(RES/法务长文/官方名映射/显示函数)在 labels.ts。
// 加一门语言 = 加一个语言文件 + 下面 `Lang` 一行 + 装配表七行(tsc 会逐处点名)。
//
// 🔴 本目录一律不带 `'use client'`:服务端 page.tsx(SSR 首帧语言、generateMetadata)也 import 它。
//    老坑 6:服务端组件从 `'use client'` 模块导入常量会拿到 undefined。
//
// 边界:**给模型看的提示词不进这里**(system/instructions 归 prompts.ts)——
// 用户永远看不到它们,也不需要翻译。
import { caseZh, consultZh, jobsZh, legalZh, quizZh, reportZh, siteZh } from './zh'
import { caseEn, consultEn, jobsEn, legalEn, quizEn, reportEn, siteEn } from './en'
import { caseKo, consultKo, jobsKo, legalKo, quizKo, reportKo, siteKo } from './ko'
import { nocLabels, pathwayNames } from './labels'

// ── 语言 ────────────────────────────────────────────────────────────────────
export type Lang = 'zh' | 'en' | 'ko'
export const LANGS: { code: Lang; label: string }[] = [
  { code: 'zh', label: '中' },
  { code: 'en', label: 'EN' },
  // 한 保留(2026-07-19 Frank 拍板):全量文案经本地 qwen3.6 对照 zh/en 校对一轮后亮回
  { code: 'ko', label: '한' },
]

export type Dict = Record<string, string>
// 三语对齐仍是编译器管:en.ts / ko.ts 每块标 `Record<keyof typeof xxZh, string>`,
// 漏一条 = tsc 红(缺属性);多一条 = tsc 红(超额属性)。
// (旧 `Domain<Z>` 类型随六域文件一起退役 —— 唯一消费者就是它们。)

// ── 首访判语与落盘 ──────────────────────────────────────────────────────────
export const LANG_KEY = 'jobs.lang'
// ── 语言也走 cookie(2026-08-03 Frank「英韩版刷新为什么先闪中文」):
// 原来只存 localStorage —— 服务端读不到,于是 SSR 一律渲中文,浏览器先画中文那一帧,
// 等水合后才换语言。cookie 服务端读得到 → 首帧就是对的(同列偏好 COLS_COOKIE 的老路)。
// localStorage 继续写:它是老用户的既有偏好来源,且 cookie 被清时还能兜住。
export const LANG_COOKIE = 'jt.lang.v1'
export const parseLang = (raw: string | null | undefined): Lang | null =>
  raw === 'zh' || raw === 'en' || raw === 'ko' ? raw : null
/** 首访没偏好时按浏览器语言判(navigator.language 或 Accept-Language 头,同一套判据)。
 *  红线:不许按 IP 判 —— 加拿大华人 IP=加拿大,会被错切英文,浏览器语言才是本人信号。 */
export const langFromAccept = (raw: string | null | undefined): Lang => {
  const n = (raw || '').toLowerCase()
  if (n.startsWith('zh')) return 'zh'
  if (n.startsWith('ko')) return 'ko'
  return n ? 'en' : 'zh'   // 头都没有(爬虫/直连)→ 站点默认中文,与改造前 useState('zh') 一致
}
/** 显式切换语言时落盘:localStorage(既有)+ cookie(给 SSR 看)。一年期,path=/ 全站通用。 */
export const saveLang = (l: Lang): void => {
  try { localStorage.setItem(LANG_KEY, l) } catch { /* ignore */ }
  try { document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax` } catch { /* ignore */ }
}

// ── 取词 ────────────────────────────────────────────────────────────────────
// 三个语言文件的同名块装配回「域 × 语言」,再合并成每语言一张扁平表。
// 合并顺序与改版前逐字一致(report → pathwayNames → caseCopy → jobs → nocLabels → site → consult → quiz → legal)。
const report: Record<Lang, Dict> = { zh: reportZh, en: reportEn, ko: reportKo }
const jobs: Record<Lang, Dict> = { zh: jobsZh, en: jobsEn, ko: jobsKo }
const site: Record<Lang, Dict> = { zh: siteZh, en: siteEn, ko: siteKo }
const consult: Record<Lang, Dict> = { zh: consultZh, en: consultEn, ko: consultKo }
const quiz: Record<Lang, Dict> = { zh: quizZh, en: quizEn, ko: quizKo }
const legal: Record<Lang, Dict> = { zh: legalZh, en: legalEn, ko: legalKo }
const caseCopy: Record<Lang, Dict> = { zh: caseZh, en: caseEn, ko: caseKo }
const PARTS: Record<Lang, Dict>[] = [report, pathwayNames, caseCopy, jobs, nocLabels, site, consult, quiz, legal]
const MESSAGES = Object.fromEntries(
  LANGS.map(({ code }) => [code, Object.assign({}, ...PARTS.map((p) => p[code]))]),
) as Record<Lang, Dict>

export type TFn = ((key: string, vars?: Record<string, string | number>) => string) & { lang?: Lang }

// 取词:缺失回退 zh,再回退 key 本身;支持 {var} 插值。
export function makeT(lang: Lang): TFn {
  const dict = MESSAGES[lang] || MESSAGES.zh
  const t: TFn = (key, vars) => {
    let s = dict[key] ?? MESSAGES.zh[key] ?? key
    if (vars) for (const k of Object.keys(vars)) s = s.split(`{${k}}`).join(String(vars[k]))
    return s
  }
  // 语言挂在 t 上:分类名这类**来自维度表**的显示名要按语言取列(见 lib/noc catName),
  // 而调用点拿到的往往只有 t —— 挂一个只读字段比给几十处调用签名多传一个参数便宜
  t.lang = lang
  return t
}

// ── 身份+三语一体的块与显示函数(见 labels.ts 文件头;各自的段头注释也在那边)──
// 含:显示助手(官方名/数据层值 → 界面词)、法务四页正文、官方分值表译名与门槛闸人话名、
// 官方资源导航(name/url 是身份)、对话轨迹的见客文案(消费者是 lib/consult 的 step;
// 旧链 15 个文案块 2026-08-21 随 lib/chat 整域删了)。
export {
  askLabels, CONSULT_STEP, CONSULT_STEP_OCC, drawStreamNote, dropProvPrefix, eeDisplay, eeKeyDisplay,
  gateLabels, legalDocs, type LegalDoc, officialLabel, officialLabels, reqStreamDisplay, RES, type Res,
  streamDisplay,
} from './labels'
