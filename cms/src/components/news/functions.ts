/**
 * news 域的函数:地区取名与配图、类名预算、列表与评论的分组排序、正文分段,
 * 以及状态机器要用的手柄工厂与三个接口的在途工作者。零 JSX 零 hook ——
 * 排版归各件的 tsx,状态归 hooks.ts,死值归 constants.ts。
 * 🔴 本文件**不带 `'use client'`**(老坑 6):服务端页面(generateMetadata)要用
 * regionNameOf 拼标题,标了指令就把它锁进客户端边界。
 * 2026-08-27 换装批自 News.tsx 的组件体与 shared.ts 拆户而来;原 `newsRegionName` /
 * `newsPublisher` 按七词表更名 `regionNameOf` / `publisherOf`(纯派生 = `xxxOf`)。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { PROV_NAME } from '@/lib/stats'
import { cssOf } from '@/components/css'
import {
  API_COMMENTS, API_NEWS_SUMMARIZE, API_NEWS_TRANSLATE, ARIA_SLIDE_HEAD, AVATAR_FALLBACK, BOLT_PREFIX,
  CHIPS_SCOPE_CLS, CLS_CARD_HOVER, CLS_ROW_HOVER, CLS_SEP, CLS_TAP_PAD, CRED_INCLUDE, DATE_MMDD_FROM,
  HDR_CONTENT_TYPE, IMP_MIN, LANG_KO, LANG_ZH, METHOD_POST, MIME_JSON, NEWS_REGIONS, PARA_SEP_RE,
  PUBLISHER_FEDERAL, PUBLISHER_PROV_HEAD, PUBLISHER_QC, REGION_FEDERAL, REGION_IMG_CODES, REGION_IMG_HEAD,
  REGION_IMG_TAIL, REGION_QC, REPLIES_OPEN_MAX, SIDE_MAX, SLIDE_MS, STATE_BUSY, STATE_ERR, STATE_IDLE,
  STATE_SENT, TEXT_CANADA, TEXT_IRCC, TEXT_NONE, TIP_SEP, URL_NEWS_HEAD,
} from './constants'
import type {
  ClickFn, CommentCountIn, CommentSubmitIn, CommentsOfIn, DateIn, DayGroupsOfIn, DeadIn, ExpandLabelIn,
  ExpandToggleIn, FirstIn, GenBody, GenTextIn, HeroSummaryOfIn, ImgClsIn, ImpTipOfIn, ImportanceIn, InitialOfIn,
  LangCache, LangCacheAtIn, NewsComment, NewsDayGroup, NewsHero, NextIn, OfficialIn, OnIn, ParasOfIn, PauseIn,
  PickFn, PinnedIn, PostCommentIn, PresentRegionsOfIn, PutLangCacheIn, RegionIn, RegionLabelOfIn, RegionPickIn,
  RepliesAtIn, ReplySubmitIn, ReplyToggleIn, SendDisabledIn, ShownItemsOfIn, SlideAriaIn, SlidePickIn,
  NewsCard, SlideTimerIn, SlidesAtIn, SlugIn, SmallIn, StepIn, SumClickIn, SumLabelIn, TextChangeFn,
  TextChangeIn, ThreadOpenIn, TransAtOfIn, TransClickIn, TransLabelIn,
} from './types'
import css from './news.module.css'

/**
 * 地区显示名:省用省全名,联邦给空串 —— 联邦档在各处另有自己的说法
 * (地区标走 i18n 的「联邦」,图块走 IRCC / Canada),这里不替它们决定。
 *
 * @param x 地区码。
 * @returns 省全名;联邦与未收录的省码给原样/空串。
 */
export function regionNameOf(x: RegionIn): string {
  if (x.region === REGION_FEDERAL) {
    return TEXT_NONE
  }
  const name = PROV_NAME[x.region]
  if (name == null) {
    return x.region
  }
  return name
}

/**
 * 地区标与筛选药丸上的字:联邦走 i18n 的词,省走省全名。
 *
 * @param x 取词函数与地区码。
 * @returns 这一格该显示的地区名。
 */
export function regionLabelOf(x: RegionLabelOfIn): string {
  if (x.region === REGION_FEDERAL) {
    return x.t('news.federal')
  }
  return regionNameOf({ region: x.region })
}

/**
 * © 出处方(转载姿势四件套之一):联邦 = 加拿大政府;QC 用官方法文名;其余省政府。
 *
 * @param x 地区码。
 * @returns 出处方全名。
 */
export function publisherOf(x: RegionIn): string {
  if (x.region === REGION_FEDERAL) {
    return PUBLISHER_FEDERAL
  }
  if (x.region === REGION_QC) {
    return PUBLISHER_QC
  }
  return PUBLISHER_PROV_HEAD + regionNameOf({ region: x.region })
}

/**
 * 地标图地址。#206(第 26 轮体检):NB/NL/PE 没有地标图,原来照拼路径 → 404 裂图
 * (全站唯一 4xx)。缺图退联邦通用图,不拿别省照片冒充。
 *
 * @param x 地区码。
 * @returns 本站静态地标图的地址。
 */
export function regionImgOf(x: RegionIn): string {
  const code = x.region.toLowerCase()
  if (REGION_IMG_CODES.includes(code)) {
    return REGION_IMG_HEAD + code + REGION_IMG_TAIL
  }
  return REGION_IMG_HEAD + REGION_FEDERAL + REGION_IMG_TAIL
}

/**
 * 列表图块兜底字标的主行:联邦给 IRCC,省给两位省码(位置窄,放不下全名)。
 *
 * @param x 地区码。
 * @returns 主行的字。
 */
export function tileCodeOf(x: RegionIn): string {
  if (x.region === REGION_FEDERAL) {
    return TEXT_IRCC
  }
  return x.region
}

/**
 * 头条大图兜底字标:联邦给 IRCC,省给省全名(那一格横向有的是位置)。
 *
 * @param x 地区码。
 * @returns 字标的字。
 */
export function heroCodeOf(x: RegionIn): string {
  if (x.region === REGION_FEDERAL) {
    return TEXT_IRCC
  }
  return regionNameOf({ region: x.region })
}

/**
 * 图上的地名(列表兜底副行与头条角标共用):联邦的「地区」就是加拿大本身。
 *
 * @param x 地区码。
 * @returns 地名。
 */
export function regionPlaceOf(x: RegionIn): string {
  if (x.region === REGION_FEDERAL) {
    return TEXT_CANADA
  }
  return regionNameOf({ region: x.region })
}

/**
 * 这条动态够不够挂红「重要」徽标(P1f 收窄:只给满分)。
 *
 * @param x AI 重要度;null = 没评过。
 * @returns 挂不挂。
 */
export function isImportant(x: ImportanceIn): boolean {
  if (x.importance == null) {
    return false
  }
  return x.importance >= IMP_MIN
}

/**
 * 重要度徽标的悬停提示。#216(第 27 轮体检):importanceNote 是数据层生成的**中文**理由,
 * 英/韩界面悬停会漏出中文(实测 12 处)。非中文界面只挂口径声明,不拿中文当国际文案;
 * 要真给三语,得在数据层把 note 翻好(翻译管线另立项)。
 * 两截原先用「·」拼(属性也是 UI 文案,no-dot 硬规矩),现在一行一条。
 *
 * @param x 取词函数、界面语言与中文理由。
 * @returns 悬停提示全文。
 */
export function impTipOf(x: ImpTipOfIn): string {
  const lines: string[] = []
  if (x.lang === LANG_ZH && x.note != null && x.note !== TEXT_NONE) {
    lines.push(x.note)
  }
  lines.push(x.t('news.aiScore'))
  return lines.join(TIP_SEP)
}

/**
 * 地区标的类名(联邦换红档)。
 *
 * @param x 地区码。
 * @returns 拼好的 className。
 */
export function regionClsOf(x: RegionIn): string {
  const cls = [cssOf(css.region)]
  if (x.region === REGION_FEDERAL) {
    cls.push(cssOf(css.regionFed))
  }
  return cls.join(CLS_SEP)
}

/**
 * 缺图兜底的一省一色(列表图块用:底色 + 字色)。查表不是比较 —— 地区码只在表里
 * 出现一次,表外的地区走中性灰,不猜配色。
 *
 * @param x 地区码。
 * @returns 那一档配色类。
 */
export function mutedClsOf(x: RegionIn): string {
  const table: Record<string, string> = {
    federal: cssOf(css.mutedFederal),
    ON: cssOf(css.mutedOn),
    BC: cssOf(css.mutedBc),
    AB: cssOf(css.mutedAb),
    SK: cssOf(css.mutedSk),
    MB: cssOf(css.mutedMb),
    QC: cssOf(css.mutedQc),
    NS: cssOf(css.mutedNs),
  }
  const hit = table[x.region]
  if (hit == null) {
    return cssOf(css.mutedOther)
  }
  return hit
}

/**
 * 缺图兜底的一省一渐变(头条大图用)。表外的地区走中性灰渐变。
 *
 * @param x 地区码。
 * @returns 那一档渐变类。
 */
export function gradClsOf(x: RegionIn): string {
  const table: Record<string, string> = {
    federal: cssOf(css.gradFederal),
    ON: cssOf(css.gradOn),
    BC: cssOf(css.gradBc),
    AB: cssOf(css.gradAb),
    SK: cssOf(css.gradSk),
    MB: cssOf(css.gradMb),
    QC: cssOf(css.gradQc),
    NS: cssOf(css.gradNs),
  }
  const hit = table[x.region]
  if (hit == null) {
    return cssOf(css.gradOther)
  }
  return hit
}

/**
 * 列表图块的类名:图挂了才叠兜底字标那一档与配色。
 *
 * @param x 地区码与图挂没挂。
 * @returns 拼好的 className。
 */
export function tileClsOf(x: ImgClsIn): string {
  const cls = [cssOf(css.tile)]
  if (x.dead) {
    cls.push(cssOf(css.tileFallback))
    cls.push(mutedClsOf({ region: x.region }))
  }
  return cls.join(CLS_SEP)
}

/**
 * 兜底字标主行的类名(联邦四个字母要小一档)。
 *
 * @param x 地区码。
 * @returns 拼好的 className。
 */
export function tileCodeClsOf(x: RegionIn): string {
  const cls = [cssOf(css.tileCode)]
  if (x.region === REGION_FEDERAL) {
    cls.push(cssOf(css.tileCodeFed))
  }
  return cls.join(CLS_SEP)
}

/**
 * 头条图区的类名:图挂了才叠兜底那一档与渐变。
 *
 * @param x 地区码与图挂没挂。
 * @returns 拼好的 className。
 */
export function heroClsOf(x: ImgClsIn): string {
  const cls = [cssOf(css.hero)]
  if (x.dead) {
    cls.push(cssOf(css.heroFallback))
    cls.push(gradClsOf({ region: x.region }))
  }
  return cls.join(CLS_SEP)
}

/**
 * 轮播箭头的类名(左右各贴一边)。
 *
 * @param x 是不是「下一张」那一枚。
 * @returns 拼好的 className。
 */
export function arrowClsOf(x: NextIn): string {
  const cls = [cssOf(css.arrow)]
  if (x.next) {
    cls.push(cssOf(css.arrowNext))
    return cls.join(CLS_SEP)
  }
  cls.push(cssOf(css.arrowPrev))
  return cls.join(CLS_SEP)
}

/**
 * 圆点视觉本体的类名(当前那一张亮起来)。
 *
 * @param x 是不是当前这一张。
 * @returns 拼好的 className。
 */
export function dotInClsOf(x: OnIn): string {
  const cls = [cssOf(css.dotIn)]
  if (x.on) {
    cls.push(cssOf(css.dotInOn))
  }
  return cls.join(CLS_SEP)
}

/**
 * 头条右列一条的类名:第二条起在上方加分隔线;整条可点走全局 hover 规范类。
 *
 * @param x 是不是第一条。
 * @returns 拼好的 className。
 */
export function sideItemClsOf(x: FirstIn): string {
  const cls = [CLS_ROW_HOVER, cssOf(css.sideItem)]
  if (x.first === false) {
    cls.push(cssOf(css.sideItemSep))
  }
  return cls.join(CLS_SEP)
}

/**
 * 时间线一条的类名(整卡可点走全局 hover 规范类;白卡三格本域自足)。
 *
 * @returns 拼好的 className。
 */
export function rowClsOf(): string {
  return [CLS_CARD_HOVER, cssOf(css.row)].join(CLS_SEP)
}

/**
 * 地区筛选行的类名:全局作用域类 + 本域排布类(手机触控靶那条限定规则要前者当前缀)。
 *
 * @returns 拼好的 className。
 */
export function chipsClsOf(): string {
  return [CHIPS_SCOPE_CLS, cssOf(css.chips)].join(CLS_SEP)
}

/**
 * 筛选药丸自己的追加类(全局触控靶规范类,不是本域的哈希名)。
 *
 * @returns 类名。
 */
export function chipClsOf(): string {
  return CLS_TAP_PAD
}

/**
 * 一座楼的类名(官方置顶楼是蓝底卡)。
 *
 * @param x 是不是置顶楼。
 * @returns 拼好的 className。
 */
export function threadClsOf(x: PinnedIn): string {
  const cls = [cssOf(css.thread)]
  if (x.pinned) {
    cls.push(cssOf(css.threadPinned))
  }
  return cls.join(CLS_SEP)
}

/**
 * 头像的类名(官方号换品牌蓝)。
 *
 * @param x 是不是官方号发的。
 * @returns 拼好的 className。
 */
export function avatarClsOf(x: OfficialIn): string {
  const cls = [cssOf(css.cmtAv)]
  if (x.official) {
    cls.push(cssOf(css.cmtAvOfficial))
  }
  return cls.join(CLS_SEP)
}

/**
 * 昵称的类名(官方号换蓝字)。
 *
 * @param x 是不是官方号发的。
 * @returns 拼好的 className。
 */
export function authorClsOf(x: OfficialIn): string {
  const cls = [cssOf(css.cmtName)]
  if (x.official) {
    cls.push(cssOf(css.cmtNameOfficial))
  }
  return cls.join(CLS_SEP)
}

/**
 * 「回复」钮的类名(回复框正开在这一条上时加重)。
 *
 * @param x 回复框开着没。
 * @returns 拼好的 className。
 */
export function replyBtnClsOf(x: OnIn): string {
  const cls = [cssOf(css.cmtReply)]
  if (x.on) {
    cls.push(cssOf(css.cmtReplyOn))
  }
  return cls.join(CLS_SEP)
}

/**
 * 输入框的类名(楼中楼的回复框小一档)。
 *
 * @param x 是不是回复框。
 * @returns 拼好的 className。
 */
export function textareaClsOf(x: SmallIn): string {
  const cls = [cssOf(css.textarea)]
  if (x.small) {
    cls.push(cssOf(css.textareaSm))
  }
  return cls.join(CLS_SEP)
}

/**
 * 发送钮的类名(楼中楼的小一档)。
 *
 * @param x 是不是回复框那一枚。
 * @returns 拼好的 className。
 */
export function sendClsOf(x: SmallIn): string {
  const cls = [cssOf(css.send)]
  if (x.small) {
    cls.push(cssOf(css.sendSm))
  }
  return cls.join(CLS_SEP)
}

/**
 * 详情页两枚药丸钮的类名(对照开着时亮起来)。
 *
 * @param x 亮着没。
 * @returns 拼好的 className。
 */
export function pillClsOf(x: OnIn): string {
  const cls = [cssOf(css.pill)]
  if (x.on) {
    cls.push(cssOf(css.pillOn))
  }
  return cls.join(CLS_SEP)
}

/**
 * 一条动态详情页的地址。
 *
 * @param x slug。
 * @returns 详情页地址。
 */
export function newsHrefOf(x: SlugIn): string {
  return URL_NEWS_HEAD + x.slug
}

/**
 * 右列小卡上的短日期(只留月-日,横向省位置)。
 *
 * @param x 完整日期。
 * @returns 截短后的日期。
 */
export function shortDateOf(x: DateIn): string {
  return x.date.slice(DATE_MMDD_FROM)
}

/**
 * 这条动态的过审评论数(查不到算 0 —— 这里的「没有」就是零条,不是缺数据)。
 *
 * @param x 计数表与 slug。
 * @returns 评论条数。
 */
export function commentCountOf(x: CommentCountIn): number {
  const n = x.counts[x.slug]
  if (n == null) {
    return 0
  }
  return n
}

/**
 * 头条大卡上那段 AI 速读:按界面语言取,英文界面没有(原文即英文)。
 *
 * @param x 界面语言与这一张头条。
 * @returns 速读正文;没有时给空串。
 */
export function heroAiSummaryOf(x: HeroSummaryOfIn): string {
  let hit: string | null = null
  if (x.lang === LANG_ZH) {
    hit = x.hero.summaryZh
  }
  if (x.lang === LANG_KO) {
    hit = x.hero.summaryKo
  }
  if (hit == null) {
    return TEXT_NONE
  }
  return hit
}

/**
 * 头条大卡上那段摘要:AI 速读优先,没有就退官方摘要,再没有就整段不渲。
 *
 * @param x 界面语言与这一张头条。
 * @returns 摘要正文;两样都没有时给空串。
 */
export function heroSummaryOf(x: HeroSummaryOfIn): string {
  const ai = heroAiSummaryOf(x)
  if (ai !== TEXT_NONE) {
    return ai
  }
  if (x.hero.excerpt == null) {
    return TEXT_NONE
  }
  return x.hero.excerpt
}

/**
 * 当前这一张头条(序号对条数取模;一条都没有时给 null)。
 *
 * @param x 全部头条与当前序号。
 * @returns 当前这一张;没有时给 null。
 */
export function slideAtOf(x: SlidesAtIn): NewsHero | null {
  if (x.slides.length === 0) {
    return null
  }
  const hit = x.slides[x.idx % x.slides.length]
  if (hit == null) {
    return null
  }
  return hit
}

/**
 * 右列那几条:全部头条里去掉当前正在大卡上的那一张,取前 4 条。
 *
 * @param x 全部头条与当前序号。
 * @returns 右列条目。
 */
export function sideSlidesOf(x: SlidesAtIn): NewsHero[] {
  const cur = x.idx % x.slides.length
  const out: NewsHero[] = []
  for (let i = 0; i < x.slides.length; i += 1) {
    const s = x.slides[i]
    if (i !== cur && s != null && out.length < SIDE_MAX) {
      out.push(s)
    }
  }
  return out
}

/**
 * 本页真有条目的地区(没有条目的地区不出筛选药丸)。
 *
 * @param x 全部列表条目。
 * @returns 按 chips 展示顺序排好的地区码。
 */
export function presentRegionsOf(x: PresentRegionsOfIn): string[] {
  const seen = new Set<string>()
  for (const item of x.items) {
    seen.add(item.region)
  }
  const out: string[] = []
  for (const code of NEWS_REGIONS) {
    if (seen.has(code)) {
      out.push(code)
    }
  }
  return out
}

/**
 * 时间线要显示的条目。#210(第 26 轮体检):头条区那 5 条(1 大 + 4 小)在下方时间线里
 * 又出现一遍,同页同一条读两次。头条区只在未筛选时显示 → 未筛选时把这 5 条剔掉;
 * 筛选态头条不显,列表照旧全给。
 *
 * @param x 全部条目、头条那几条与当前筛选。
 * @returns 时间线要显示的条目。
 */
export function shownItemsOf(x: ShownItemsOfIn): NewsCard[] {
  const heroSlugs = new Set<string>()
  for (const h of x.hero) {
    heroSlugs.add(h.slug)
  }
  const out: NewsCard[] = []
  for (const item of x.items) {
    if (x.region !== TEXT_NONE && item.region === x.region) {
      out.push(item)
    }
    if (x.region === TEXT_NONE && heroSlugs.has(item.slug) === false) {
      out.push(item)
    }
  }
  return out
}

/**
 * 按日分组(条目已按日期倒序,同日保持库里的原序 = 官方发布序)。
 *
 * @param x 要分组的条目。
 * @returns 一天一组。
 */
export function dayGroupsOf(x: DayGroupsOfIn): NewsDayGroup[] {
  const out: NewsDayGroup[] = []
  for (const item of x.items) {
    const last = out[out.length - 1]
    if (last != null && last.day === item.date) {
      last.items.push(item)
    } else {
      out.push({ day: item.date, items: [item] })
    }
  }
  return out
}

/**
 * 正文分段:空行分段,段内的单个换行留给渲染层保真。
 *
 * @param x 全文;null = 没有。
 * @returns 分好的段(空段丢掉)。
 */
export function parasOf(x: ParasOfIn): string[] {
  if (x.text == null) {
    return []
  }
  const out: string[] = []
  for (const raw of x.text.split(PARA_SEP_RE)) {
    const p = raw.trim()
    if (p !== TEXT_NONE) {
      out.push(p)
    }
  }
  return out
}

/**
 * 第 i 段的对照译文(对照没开、或译文没这么多段时给 null —— 超长稿只翻前段,
 * 尾段只显英文)。
 *
 * @param x 译文段、段序与对照开关。
 * @returns 这一段的译文;没有时给 null。
 */
export function transAtOf(x: TransAtOfIn): string | null {
  if (x.on === false) {
    return null
  }
  const hit = x.paras[x.i]
  if (hit == null || hit === TEXT_NONE) {
    return null
  }
  return hit
}

/**
 * 译文比原文多出来的尾段(不吞)。
 *
 * @param x 译文段、原文段数与对照开关。
 * @returns 尾段清单。
 */
export function tailTransOf(x: TransAtOfIn): string[] {
  if (x.on === false) {
    return []
  }
  return x.paras.slice(x.i)
}

/**
 * 顶层楼:置顶先、再时间倒序、同日按 id 倒序。
 *
 * @param x 全部过审评论。
 * @returns 排好序的顶层楼。
 */
export function topCommentsOf(x: CommentsOfIn): NewsComment[] {
  const tops: NewsComment[] = []
  for (const c of x.comments) {
    if (c.parentId == null) {
      tops.push(c)
    }
  }
  tops.sort(byPinnedThenNewest)
  return tops
}

/**
 * 楼主排序:置顶先、再时间倒序、同日新 id 在前。
 *
 * @param a 前一条。
 * @param b 后一条。
 * @returns 负数 a 在前,正数 b 在前。
 */
// eslint-disable-next-line local/one-parameter -- 签名由外部库/语言定死(Array.prototype.sort 的比较器,宪法钦定逐行特批形态)
function byPinnedThenNewest(a: NewsComment, b: NewsComment): number {
  const pa = pinRank({ pinned: a.pinned })
  const pb = pinRank({ pinned: b.pinned })
  if (pa !== pb) {
    return pb - pa
  }
  if (a.date !== b.date) {
    if (a.date < b.date) {
      return 1
    }
    return -1
  }
  return b.id - a.id
}

/**
 * 置顶位的排序值(置顶 1、普通 0 —— 比较器里不写布尔减法)。
 *
 * @param x 是不是置顶楼。
 * @returns 排序值。
 */
function pinRank(x: PinnedIn): number {
  if (x.pinned) {
    return 1
  }
  return 0
}

/**
 * 楼内回复按爹分组(SSR 给的就是时间正序,分组即得)。
 *
 * @param x 全部过审评论。
 * @returns 顶层楼 id → 它的回复。
 */
export function repliesOf(x: CommentsOfIn): Map<number, NewsComment[]> {
  const out = new Map<number, NewsComment[]>()
  for (const c of x.comments) {
    if (c.parentId != null) {
      const list = out.get(c.parentId)
      if (list == null) {
        out.set(c.parentId, [c])
      } else {
        list.push(c)
      }
    }
  }
  return out
}

/**
 * 某座楼的回复(没有就是空列)。
 *
 * @param x 分组表与楼 id。
 * @returns 这座楼的回复。
 */
export function repliesAtOf(x: RepliesAtIn): NewsComment[] {
  const list = x.table.get(x.id)
  if (list == null) {
    return []
  }
  return list
}

/**
 * 楼内回复是不是展开态:≤3 条恒展开,更多的看用户点没点「展开」。
 *
 * @param x 回复条数、楼 id 与展开集合。
 * @returns 展开着没。
 */
export function isThreadOpen(x: ThreadOpenIn): boolean {
  if (x.count <= REPLIES_OPEN_MAX) {
    return true
  }
  return x.expanded.has(x.id)
}

/**
 * 头像上的首字母(昵称为空时给占位符)。
 *
 * @param x 脱敏昵称。
 * @returns 一个大写字母。
 */
export function initialOf(x: InitialOfIn): string {
  const first = x.name.slice(0, 1)
  if (first === TEXT_NONE) {
    return AVATAR_FALLBACK
  }
  return first.toUpperCase()
}

/**
 * 从 per-lang 缓存里取当前语言那份。空串按「没有」算 —— 库里存下一份空译文/空速读
 * 不等于生成过,消费端照旧该出生成钮、不该渲一个空框。
 *
 * @param x 缓存与界面语言。
 * @returns 那一门的正文;没有时给 null。
 */
export function langCacheAt(x: LangCacheAtIn): string | null {
  let hit: string | null = x.cache.en
  if (x.lang === LANG_ZH) {
    hit = x.cache.zh
  }
  if (x.lang === LANG_KO) {
    hit = x.cache.ko
  }
  if (hit === TEXT_NONE) {
    return null
  }
  return hit
}

/**
 * 往 per-lang 缓存里写一门(逐格重装 —— 不用对象展开)。
 *
 * @param x 现缓存、要写的那一门与正文。
 * @returns 新缓存。
 */
export function putLangCache(x: PutLangCacheIn): LangCache {
  const next: LangCache = { zh: x.cache.zh, ko: x.cache.ko, en: x.cache.en }
  if (x.lang === LANG_ZH) {
    next.zh = x.text
  }
  if (x.lang === LANG_KO) {
    next.ko = x.text
  }
  if (x.lang !== LANG_ZH && x.lang !== LANG_KO) {
    next.en = x.text
  }
  return next
}

/**
 * 造「图挂了」的回调:换成兜底字标那一版,不留裂图。
 *
 * @param x 图挂没挂的落格。
 * @returns 图加载失败的回调。
 */
export function makeDead(x: DeadIn): ClickFn {
  return function onError(): void {
    x.setDead(true)
  }
}

/**
 * 造轮播翻页手柄(前后各一只;条数取模,首尾相接)。
 *
 * @param x 步长、条数与当前张落格。
 * @returns 翻页手柄。
 */
export function makeStep(x: StepIn): ClickFn {
  return function step(): void {
    x.setIdx(function move(i: number): number {
      return (i + x.delta + x.total) % x.total
    })
  }
}

/**
 * 造圆点手柄的工厂:给它第几颗,换一只只管切到那一张的手柄。
 *
 * @param x 当前张落格。
 * @returns 逐颗圆点的手柄工厂。
 */
export function makeSlidePickOf(x: SlidePickIn): PickFn {
  return function pickOf(i: number): ClickFn {
    return function pick(): void {
      x.setIdx(i)
    }
  }
}

/**
 * 造暂停开关(鼠标进来暂停、离开恢复)。
 *
 * @param x 暂停位落格与要写的值。
 * @returns 开关手柄。
 */
export function makePause(x: PauseIn): ClickFn {
  return function pause(): void {
    x.setPaused(x.on)
  }
}

/**
 * 效果体:5s 自动换片(单条不轮、hover 暂停时不装表)。
 *
 * @param x 条数与当前张落格。
 * @returns 效果体(返回清理)。
 */
export function makeSlideTimer(x: SlideTimerIn): () => () => void {
  return function startSlide(): () => void {
    const id = setInterval(function tick(): void {
      x.setIdx(function next(i: number): number {
        return (i + 1) % x.total
      })
    }, SLIDE_MS)
    return function stopSlide(): void {
      clearInterval(id)
    }
  }
}

/**
 * 造地区筛选手柄的工厂:给它地区码,换一只只管切到那个地区的手柄。
 *
 * @param x 当前筛选落格。
 * @returns 逐地区的手柄工厂。
 */
export function makeRegionPickOf(x: RegionPickIn): (code: string) => ClickFn {
  return function pickOf(code: string): ClickFn {
    return function pick(): void {
      x.setRegion(code)
    }
  }
}

/**
 * 造「全部」手柄(清掉地区筛选)。
 *
 * @param x 当前筛选落格。
 * @returns 「全部」的点击手柄。
 */
export function makeRegionAll(x: RegionPickIn): ClickFn {
  return function all(): void {
    x.setRegion(TEXT_NONE)
  }
}

/**
 * 造输入框改值手柄:敲字的同时把上一次的成功/失败提示撤掉。
 *
 * @param x 正文落格、提交状态与状态落格。
 * @returns 改值手柄。
 */
export function makeTextChange(x: TextChangeIn): TextChangeFn {
  return function onChange(e: React.ChangeEvent<HTMLTextAreaElement>): void {
    x.setBody(e.target.value)
    if (x.state === STATE_SENT || x.state === STATE_ERR) {
      x.setState(STATE_IDLE)
    }
  }
}

/**
 * 造顶层评论的提交手柄(发成功就清空输入框)。
 *
 * @param x 这条动态的 slug、输入框现值、提交状态与两个落格。
 * @returns 提交手柄。
 */
export function makeCommentSubmit(x: CommentSubmitIn): ClickFn {
  return function submit(): void {
    void submitComment(x)
  }
}

/**
 * makeCommentSubmit 的真身(async;外壳只把 Promise 收掉)。
 *
 * @param x 同 makeCommentSubmit 的入参。
 * @returns 无。
 */
async function submitComment(x: CommentSubmitIn): Promise<void> {
  const text = x.body.trim()
  if (text === TEXT_NONE || x.state === STATE_BUSY) {
    return
  }
  x.setState(STATE_BUSY)
  const ok = await postComment({ slug: x.slug, body: text, parent: null })
  if (ok === false) {
    x.setState(STATE_ERR)
    return
  }
  x.setState(STATE_SENT)
  x.setBody(TEXT_NONE)
}

/**
 * 造楼中楼回复的提交手柄(发成功就清空回复框并收起)。
 *
 * @param x 这条动态的 slug、所回复的楼、回复框现值、提交状态与三个落格。
 * @returns 提交手柄。
 */
export function makeReplySubmit(x: ReplySubmitIn): ClickFn {
  return function submitReply(): void {
    void submitReplyNow(x)
  }
}

/**
 * makeReplySubmit 的真身(async;外壳只把 Promise 收掉)。
 *
 * @param x 同 makeReplySubmit 的入参。
 * @returns 无。
 */
async function submitReplyNow(x: ReplySubmitIn): Promise<void> {
  const text = x.replyBody.trim()
  if (text === TEXT_NONE || x.state === STATE_BUSY) {
    return
  }
  x.setState(STATE_BUSY)
  const ok = await postComment({ slug: x.slug, body: text, parent: x.replyTo })
  if (ok === false) {
    x.setState(STATE_ERR)
    return
  }
  x.setState(STATE_SENT)
  x.setReplyBody(TEXT_NONE)
  x.setReplyTo(null)
}

/**
 * 发一条评论(顶层或回复)。落库为 pending,人工审核过了才公开。
 *
 * @param x slug、正文与所回复的楼。
 * @returns 发出去了没(失败不静默:调用方据此挂错误提示)。
 */
async function postComment(x: PostCommentIn): Promise<boolean> {
  try {
    const r = await fetch(API_COMMENTS, {
      method: METHOD_POST,
      credentials: CRED_INCLUDE,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: commentBodyOf(x),
    })
    return r.ok
  } catch {
    return false
  }
}

/**
 * 评论请求体。顶层评论**不带** parent 这个键(与 payload 那条「空 = 顶层」的口径对齐),
 * 回复才带。
 *
 * @param x slug、正文与所回复的楼。
 * @returns 序列化好的请求体。
 */
function commentBodyOf(x: PostCommentIn): string {
  if (x.parent == null) {
    return JSON.stringify({ newsSlug: x.slug, body: x.body })
  }
  return JSON.stringify({ newsSlug: x.slug, body: x.body, parent: x.parent })
}

/**
 * 造回复框开关手柄的工厂:给它楼 id,换一只开/关那座楼回复框的手柄
 * (再点一次是收起;每次开都从空框开始)。
 *
 * @param x 现开着的楼、两个落格。
 * @returns 逐楼的手柄工厂。
 */
export function makeReplyToggleOf(x: ReplyToggleIn): PickFn {
  return function toggleOf(id: number): ClickFn {
    return function toggle(): void {
      if (x.replyTo === id) {
        x.setReplyTo(null)
      } else {
        x.setReplyTo(id)
      }
      x.setReplyBody(TEXT_NONE)
    }
  }
}

/**
 * 造「展开 N 条回复 / 收起」手柄的工厂。
 *
 * @param x 展开集合落格。
 * @returns 逐楼的手柄工厂。
 */
export function makeExpandToggleOf(x: ExpandToggleIn): PickFn {
  return function toggleOf(id: number): ClickFn {
    return function toggle(): void {
      x.setExpanded(function flip(s: Set<number>): Set<number> {
        const next = new Set(s)
        if (next.has(id)) {
          next.delete(id)
        } else {
          next.add(id)
        }
        return next
      })
    }
  }
}

/**
 * 造 AI 速读的点击手柄(按需生成 → 写库 → 落进本地缓存)。
 *
 * @param x slug、界面语言、状态现值与两个落格。
 * @returns 点击手柄。
 */
export function makeSumClick(x: SumClickIn): ClickFn {
  return function onSum(): void {
    void fetchSummary(x)
  }
}

/**
 * makeSumClick 的真身(async;外壳只把 Promise 收掉)。
 *
 * @param x 同 makeSumClick 的入参。
 * @returns 无。
 */
async function fetchSummary(x: SumClickIn): Promise<void> {
  if (x.sumState === STATE_BUSY) {
    return
  }
  x.setSumState(STATE_BUSY)
  const text = await genTextOf({ url: API_NEWS_SUMMARIZE, slug: x.slug, lang: x.lang })
  if (text == null) {
    x.setSumState(STATE_ERR)
    return
  }
  x.setSumCache(putLangCache({ cache: x.sumCache, lang: x.lang, text }))
  x.setSumState(STATE_IDLE)
}

/**
 * 造对照开关的点击手柄:开着就关、有译文就开、都没有才去翻。
 *
 * @param x slug、界面语言、开关与缓存的现值与落格。
 * @returns 点击手柄。
 */
export function makeTransClick(x: TransClickIn): ClickFn {
  return function onTrans(): void {
    if (x.transOn) {
      x.setTransOn(false)
      return
    }
    if (x.trans != null) {
      x.setTransOn(true)
      return
    }
    void fetchTranslation(x)
  }
}

/**
 * makeTransClick 里「去翻一份」那条路(async;外壳只把 Promise 收掉)。
 *
 * @param x 同 makeTransClick 的入参。
 * @returns 无。
 */
async function fetchTranslation(x: TransClickIn): Promise<void> {
  if (x.trState === STATE_BUSY) {
    return
  }
  x.setTrState(STATE_BUSY)
  const text = await genTextOf({ url: API_NEWS_TRANSLATE, slug: x.slug, lang: x.lang })
  if (text == null) {
    x.setTrState(STATE_ERR)
    return
  }
  x.setTransCache(putLangCache({ cache: x.transCache, lang: x.lang, text }))
  x.setTrState(STATE_IDLE)
  x.setTransOn(true)
}

/**
 * 速读与翻译共用的取文:服务端生成后写回库,这里只把正文接回来。
 * 出错不静默 —— 给 null,调用方翻成 err 档挂提示。
 *
 * @param x 接口地址、slug 与语言。
 * @returns 生成好的正文;失败给 null。
 */
async function genTextOf(x: GenTextIn): Promise<string | null> {
  try {
    const r = await fetch(x.url, {
      method: METHOD_POST,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: JSON.stringify({ slug: x.slug, lang: x.lang }),
    })
    const d = await r.json() as GenBody
    if (r.ok === false || d == null || d.ok === false) {
      return null
    }
    if (d.summary != null) {
      return d.summary
    }
    if (d.body != null) {
      return d.body
    }
    return null
  } catch {
    return null
  }
}

/**
 * 「置顶」标的类名(在「官方」标那一档上换配色)。
 *
 * @returns 拼好的 className。
 */
export function pinnedTagClsOf(): string {
  return [cssOf(css.cmtTag), cssOf(css.cmtTagPinned)].join(CLS_SEP)
}

/**
 * 译文尾段的类名(它没有原文段包着,自己补下边距)。
 *
 * @returns 拼好的 className。
 */
export function transTailClsOf(): string {
  return [cssOf(css.trans), cssOf(css.transTail)].join(CLS_SEP)
}

/**
 * 「展开 N 条回复」/「收起」的钮面。
 *
 * @param x 取词函数、展开态与回复条数。
 * @returns 钮面文字。
 */
export function expandLabelOf(x: ExpandLabelIn): string {
  if (x.open) {
    return x.t('news.cmt.collapse')
  }
  return x.t('news.cmt.expand', { n: x.count })
}

/**
 * AI 速读钮的钮面(生成中换成等待文案)。
 *
 * @param x 取词函数与生成状态。
 * @returns 钮面文字。
 */
export function sumLabelOf(x: SumLabelIn): string {
  if (x.state === STATE_BUSY) {
    return x.t('news.sumBusy')
  }
  return BOLT_PREFIX + x.t('news.aiSum')
}

/**
 * 对照开关的钮面(翻译中 → 等待文案;开着 → 关掉;关着 → 打开)。
 *
 * @param x 取词函数、翻译状态与开关态。
 * @returns 钮面文字。
 */
export function transLabelOf(x: TransLabelIn): string {
  if (x.state === STATE_BUSY) {
    return x.t('news.trBusy')
  }
  if (x.on) {
    return x.t('news.trOff')
  }
  return x.t('news.trOn')
}

/**
 * 发送钮禁不禁用:空输入不给发,在途中不给重复发。
 *
 * @param x 输入框现值与提交状态。
 * @returns 禁用吗。
 */
export function isSendDisabled(x: SendDisabledIn): boolean {
  if (x.body.trim() === TEXT_NONE) {
    return true
  }
  return x.state === STATE_BUSY
}

/**
 * 轮播圆点的无障碍名(读屏要说得出这是第几张)。
 *
 * @param x 第几颗(从 0 数)。
 * @returns 无障碍名。
 */
export function slideAriaOf(x: SlideAriaIn): string {
  return ARIA_SLIDE_HEAD + String(x.i + 1)
}
