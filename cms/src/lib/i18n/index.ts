// 文案的桶 —— 全站唯一的语言机制:语言是哪几门、怎么判、怎么落盘、怎么取词。
//
// 为什么单独存在:文案本身按领域分在 report/jobs/site/chat/quiz/legal 六个文件里,
// 而**语言这套机器只该有一份**。加一门语言只改下面 `Lang` 那一行 —— 六个领域文件会被
// tsc 逐个点名(它们的导出都标了 `Domain<typeof zh>`),不需要任何检查脚本。
//
// 🔴 本目录一律不带 `'use client'`:服务端 page.tsx(SSR 首帧语言、generateMetadata)也 import 它。
//    老坑 6:服务端组件从 `'use client'` 模块导入常量会拿到 undefined。
//
// 边界:**给模型看的提示词不进这里**(system/instructions 归 prompts.ts)——
// 用户永远看不到它们,也不需要翻译。
import { report, pathwayNames, caseCopy } from './report'
import { jobs, nocLabels } from './jobs'
import { site } from './site'
import { chat } from './chat'
import { quiz } from './quiz'
import { legal } from './legal'

// ── 语言 ────────────────────────────────────────────────────────────────────
export type Lang = 'zh' | 'en' | 'ko'
export const LANGS: { code: Lang; label: string }[] = [
  { code: 'zh', label: '中' },
  { code: 'en', label: 'EN' },
  // 한 保留(2026-07-19 Frank 拍板):全量文案经本地 qwen3.6 对照 zh/en 校对一轮后亮回
  { code: 'ko', label: '한' },
]

export type Dict = Record<string, string>
/** 一个领域的三语字典:zh 是母本,其余语言按它的键逐条对齐。
 *  漏一条 = tsc 红(缺属性);多一条 = tsc 红(超额属性);
 *  加一门语言 = 只改上面的 `Lang`,六个领域文件的导出会挨个报缺哪门语言。
 *  —— 这就是「能让编译器管的别写脚本管」在文案上的落法。 */
export type Domain<Z extends Record<string, string>> = Record<Lang, Record<keyof Z, string>>

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
// 领域文件合并成一张扁平表。这段**不枚举语言** —— 加一门语言时它一个字都不用改。
const PARTS: Record<Lang, Dict>[] = [report, pathwayNames, caseCopy, jobs, nocLabels, site, chat, quiz, legal]
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

// ── 显示助手:官方名/数据层值 → 界面词。跟它映射的那批键住同一个文件,这里只作转出 ──
export { drawStreamNote, streamDisplay, reqStreamDisplay, eeDisplay, eeKeyDisplay } from './jobs'
export { dropProvPrefix } from './site'
// ── 不走 t() 的整块文案:法务四页正文(一页一个整体,见 legal.ts 文件头) ──
export { legalDocs, type LegalDoc } from './legal'
// ── 不走 t() 的表:官方分值表原文的译名、门槛闸的人话名(见 report.ts 各自的段头) ──
export { officialLabel, officialLabels, gateLabels, askLabels } from './report'
// ── 官方资源导航(name/url 是身份、use 是三语文案,整条住一起,见 site.ts)──
export { RES, type Res } from './site'
// ── 对话与顾问的见客文案(整块,不走 t();编排逻辑与检测器仍在 chatOrchestrate)──
export {
  ASK_OCC, AVAIL_SENTENCE, CLAIM_LEAD, FED_FACTOR, FOLLOWUPS, LBL, META_ANSWER, MONEY_WHY,
  OCC_PICK, PROMISE_WHY, SAVED_LBL, SAVED_TAIL, SHEET_HEAD, STEP, USAGE_ASK, USAGE_WHAT,
  type LabelDict,
} from './chat'
