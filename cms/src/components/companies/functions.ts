'use client'
/**
 * companies 域的函数:译名取舍、面包屑省格的显示名与地址,
 * 以及公司本体族的派生(简介分节、股别解析、四维依据句、职业名取舍、类名预算)
 * 与手柄工厂(折叠、展开、取数)。
 * 返回手柄工厂 makeGoBack 2026-09-03 随「返回钮全站一件」撤编 —— 它那条 2026-07-28 的理由
 * (公司页从职位板弹框 target="_blank" 打开,新标签页里裸 history.back() 是空操作)
 * 连同行为一起住进 button 桶的 goBackOr/makeBack。
 * 零 JSX 零 hook —— 排版归各 tsx,状态归 hooks.ts,死值归 constants.ts。
 * 2026-08-28 拆域批自 jobs/Company.tsx 重写落位:原文件里的箭头小件(coParseSecs、
 * chColor、parseCoStreams、zhBlock、row…)全部落成这里的具名函数。
 *
 * 「这句是不是『没有』」的收口(`-` / `N/A` / 未提供 那一族)走 lib/jobs 的 `isJdNone`。
 * 2026-08-28 Frank 拍板把它从 components/jobs/Jd.tsx 迁进 lib/jobs:那是**数据口径**不是视图 ——
 * 公司简介与 JD 正文两边都在读它,留在视图层就等于给口径开了个岔。**行为不许复制**。
 *
 * @author Frank
 * @time 2026-08-27 02:10:00
 */
import { isJdNone } from '@/lib/jobs'
import { mapsUrl, provName } from '@/lib/location'
import { track } from '@/lib/track'
import {
  BASE_CITY_PROV_RE, CARD_HEAD_CLS, CARD_MD_CLS, CH_C_AMBER, CH_C_DEEP, CH_C_GRAY, CH_C_GREEN, CH_C_NONE,
  CH_GRADE_AMBER_MIN, CH_GRADE_DEEP_MIN, CH_GRADE_GRAY_MIN, CH_GRADE_GREEN_MIN, CLS_SEP, CO_COUNTRY_ONLY_RE,
  CO_NOT_FOUND_RE, CO_SEC_BASE, CO_SEC_HAS_RE, CO_SEC_KEYS, CO_SEC_MARKS, CO_SEC_SPLIT_RE, CO_STREAM_COUNT_RE,
  CO_STREAM_SPLIT_RE, DASH_EM, DESC_MIN_LEN, FAME_PROVS_MIN, GOV_BODY_RE, GOV_ORG_RE, GOV_PLACE_RE, GRADE_AMBER_MIN,
  GRADE_C_2, GRADE_C_3, GRADE_C_4, GRADE_C_5, GRADE_C_NONE, GRADE_DEEP_GREEN_MIN, GRADE_GREEN_MIN, GRADE_NEUTRAL_MIN,
  HDR_CONTENT_TYPE, HDR_HUMAN, HTTP_OK, HTTP_URL_RE, HUMAN_EVENTS, HUMAN_NO, HUMAN_YES,
  JD_ZH_CLS, JOBS_FIRST_N, JOBS_STEP_N, KEY_ACT_EVIDENCE, KEY_ACT_EVIDENCE_ONE,
  KEY_ACT_TIER_HEAD, KEY_FM_OPEN, KEY_FM_OPEN_ONE, KEY_FM_PROVS, KEY_FM_TIER_HEAD, KEY_FM_WIKI, KEY_SAL_EVIDENCE,
  KEY_SAL_TIER_HEAD, KEY_SP_EVIDENCE, KEY_SP_EVIDENCE_AIP, KEY_SP_TIER_AIP, KEY_SP_TIER_HEAD, KEY_STREAM_AGRI,
  KEY_STREAM_GTS, KEY_STREAM_HIGH, KEY_STREAM_LOW, KEY_STREAM_PR, LANG_EN, LANG_KO, LANG_ZH, LOC_JOIN, METHOD_POST,
  MIME_JSON, NOCS_TOP_N, PROV_LOCALE_ONLY, PROV_PAREN_RE, SEC_PAIR_STEP, SEP_ENUM, SIGN_PLUS, STREAM_AGRI_RE,
  STREAM_GTS_RE, STREAM_HIGH_RE, STREAM_LOW_RE, STREAM_PR_RE, TEXT_NONE, TITLES_CHUNK,
  TRACK_KIND_COMPANY, TRACK_SIMILAR, TRACK_TV_ENTRY, URL_CO_ALIAS, URL_CO_DESC, URL_CO_INFO, URL_CO_TITLES,
  URL_CO_TRANSLATE,
  URL_JOB_HEAD, URL_JOBS_COMPANY, URL_JOBS_ROW_HEAD, URL_PLAN_PR_HEAD, URL_PROV_HEAD, WIKI_PATH_SEP, WIKI_WORD_JOIN,
  WIKI_WORD_SEP, YEAR_ONLY_RE,
  SITE_POLL_MS, SITE_POLLS_MAX, SITE_QUEUED_POLLS_MAX, STAGE_DONE, STAGE_FACTS, STAGE_FETCH, STAGE_FIND, STAGE_LABEL,
  STAGE_OFF, STAGE_ORDER,
  STAGE_QUEUED, STAGE_TRANS, STAGES_ACTIVE, STEP_DONE, STEP_NOW, STEP_WAIT, URL_CO_OPEN, URL_CO_STAGE,
  LAYER_CO, LAYER_JOB, SUB_HOLD,
} from './constants'
import { cssOf } from '@/components/css'
import type {
  ActiveTextIn, AiNoteClsIn, AliasJson, AliasOfIn, BaseZhIn, BriefJson, BriefSecsIn, CanTransIn, ChColorIn,
  CityLocalIn, CompanyAiNoteKind, CompanyBriefFact, CompanyJobFact, CompanyJobRow, CompanyOnlyIn, CompanyStream,
  DeadFlag, DisplayNameIn, FameTextIn, FetchCoTransIn, FlatIn, GoBackFn, HasIdIn, HttpSourcesIn, IsGovIn,
  JobsMoreIn, JobsResetIn,
  JobNocNameIn, JobRowJson, JobsShownIn, JobsToggleLabelIn, LmiaNocNameIn, LmiaNocRow, LmiaRestIn, LoadAliasIn,
  LoadBriefIn, LoadDescTransIn, LoadFn, LoadPanelIn, LoadTitlesIn, LoadTransIn, NocRowsIn, OpenCompanyIn, OpenJobIn,
  PanelBody, PanelBodyIn,
  PanelJson, PanelSlugIn, PeekClickFn,
  PillClsIn, ProvFullOfIn, ProvHrefOfIn, ResolveJobFn, ResolveJobIn, SalaryTextIn, SecKeyIn, SecTextIn, SecZhIn,
  SponsorTextIn, StreamLabel, StreamLabelIn, StreamsIn, SubOrTitleIn, TitlesJson, ToggleIn, TransJson, TvOpenIn,
  UntitledIn, ZhLineClsIn, ZhShownIn,
  OpenSiteIn, ShownStageIn, SitePanel, SitePanelIn, SiteShownIn, SiteStageJson, SiteStep, SiteStepsIn,
  CompanyPeek, OpenCompanyFn, OpenJobFn, PeekStackRef,
  CardTitleIn, MiniSubIn, StoredTitleIn, UntranslatedIn,
} from './types'
import css from './companies.module.css'

/**
 * 公司名后面那条灰字译名。#151 口径:**界面语言的译名作灰注,英文界面不出** ——
 * 英文界面下译名与主文案同语,再挂一遍就是一行两遍。
 *
 * @param x 界面语言与两门译名。
 * @returns 该出的译名;不出时给空串。
 */
export function aliasOf(x: AliasOfIn): string {
  if (x.lang === LANG_ZH) {
    return x.aliasZh
  }
  if (x.lang === LANG_KO) {
    return x.aliasKo
  }
  return TEXT_NONE
}

/**
 * 面包屑省格的显示名(「Ontario(安大略省)」两段式,英文在前的全站口径)。
 *
 * @param x 取词函数与省码。
 * @returns 显示省名;省码缺席时给空串(那一格整个不渲)。
 */
export function provFullOf(x: ProvFullOfIn): string {
  if (x.code === TEXT_NONE) {
    return TEXT_NONE
  }
  return provName({ t: x.t, code: x.code, localeOnly: PROV_LOCALE_ONLY }).replace(PROV_PAREN_RE, TEXT_NONE)
}

/**
 * 面包屑省格的去处:职位板按省筛选(省没有独立页,点它是去看这个省的岗)。
 *
 * @param x 省码。
 * @returns 带筛选参数的职位板地址。
 */
export function provHrefOf(x: ProvHrefOfIn): string {
  return URL_PROV_HEAD + encodeURIComponent(x.code)
}

/**
 * 把带五节标记的文本切成「标记 → 正文」。`split` 带捕获组,结果是
 * 「前言, 标记, 正文, 标记, 正文…」,所以从下标 1 起两个两个取。
 * 存量散文(整段没有标记)切出来是空表,由调用方按散文渲。
 *
 * @param x 简介原文或译文。
 * @returns 标记到正文的表。
 */
export function briefSecsOf(x: BriefSecsIn): Record<string, string> {
  const parts = x.text.split(CO_SEC_SPLIT_RE)
  const secs: Record<string, string> = {}
  for (let i = 1; i + 1 <= parts.length - 1; i += SEC_PAIR_STEP) {
    const mark = parts[i]
    const body = parts[i + 1]
    if (mark != null) {
      let text = TEXT_NONE
      if (body != null) {
        text = body.trim()
      }
      secs[mark] = text
    }
  }
  return secs
}

/**
 * 取某一节的正文(缺节给空串 —— 缺项不占卡,宁可留空)。
 *
 * @param x 分节表与节标记。
 * @returns 该节正文。
 */
export function secTextOf(x: SecTextIn): string {
  const body = x.secs[x.mark]
  if (body == null) {
    return TEXT_NONE
  }
  return body.trim()
}

/**
 * 取某一节小标题的文案键(表里没有这个标记时给空串)。
 *
 * @param x 节标记。
 * @returns 文案键。
 */
export function secKeyOf(x: SecKeyIn): string {
  const key = CO_SEC_KEYS[x.mark]
  if (key == null) {
    return TEXT_NONE
  }
  return key
}

/**
 * 这一节有没有内容(「-」「N/A」「未提供」这类都算没有,缺项不占卡)。
 * 2026-09-14 两条扩:模型答「查不到」那族句子(CO_NOT_FOUND_RE)算没有;「所在地」只写 Canada 算没有。
 *
 * @param x 分节表与节标记。
 * @returns 有没有。
 */
export function hasSecOf(x: SecTextIn): boolean {
  const text = secTextOf(x)
  if (isJdNone(text) || CO_NOT_FOUND_RE.test(text)) {
    return false
  }
  if (x.mark === CO_SEC_BASE && CO_COUNTRY_ONLY_RE.test(text)) {
    return false
  }
  return true
}

/**
 * 整篇简介有没有一节能出(2026-09-14:五节全是「查不到」或整篇无标记且是「查不到」= 简介卡整张不出,
 * 不剩一个只有标题的空卡)。
 *
 * @param brief 简介原文。
 * @returns 有没有可出的节。
 */
export function hasAnyBriefSecOf(brief: string): boolean {
  if (CO_SEC_HAS_RE.test(brief) === false) {
    return isJdNone(brief.trim()) === false && CO_NOT_FOUND_RE.test(brief) === false
  }
  const secs = briefSecsOf({ text: brief })
  for (const mark of CO_SEC_MARKS) {
    if (hasSecOf({ secs, mark })) {
      return true
    }
  }
  return false
}

/**
 * 这一节的中文对照(#185:英文段下挂译文段)。译文缺、译文是「没有」、
 * 译文与原文逐字相同,三种都不挂 —— 挂了就是一行说两遍。
 *
 * @param x 译文分节表、节标记与本节原文。
 * @returns 该挂的译文;不挂时给空串。
 */
export function secZhOf(x: SecZhIn): string {
  const zh = secTextOf({ secs: x.tSecs, mark: x.mark })
  if (zh === TEXT_NONE || isJdNone(zh) || zh === x.en || YEAR_ONLY_RE.test(x.en.trim())) {
    return TEXT_NONE
  }
  return zh
}

/**
 * 名录厚简介够不够长(≥120 字才算有正文可读;不够长的按没有算,让位 K 调查五节)。
 *
 * @param x 公司档案。
 * @returns 有没有厚简介。
 */
export function hasDescOf(x: CompanyOnlyIn): boolean {
  return x.company.description.length >= DESC_MIN_LEN
}

/**
 * 担保记录深块出不出:有 LMIA 获批岗位,或者是 AIP 指定雇主;2026-09-13 晚起雇主池里的指定雇主(AIP / RCIP / FCIP)也出 ——
 * 板上说指定、落点页得能看见。
 *
 * @param x 公司档案。
 * @returns 出不出。
 */
export function showSponsorOf(x: CompanyOnlyIn): boolean {
  if (x.company.designatedPrograms.length > 0) {
    return true
  }
  let positions = 0
  if (x.company.lmiaPositions != null) {
    positions = x.company.lmiaPositions
  }
  if (positions > 0) {
    return true
  }
  const detail = x.company.scoreDetail
  if (detail == null || detail.sponsor == null || detail.sponsor.v == null) {
    return false
  }
  return detail.sponsor.v.aip
}

/**
 * 缓存的 K 调查简介里有没有「所在地」那一节(#199:DB 有精确地址时它让位,
 * DB 只有省级时反过来由它顶上,所以要先知道它在不在)。
 *
 * @param x 简介正文。
 * @returns 有没有。
 */
export function hasBaseSecOf(x: BriefSecsIn): boolean {
  return hasSecOf({ secs: briefSecsOf({ text: x.text }), mark: CO_SEC_BASE })
}

/**
 * 公司所在市(2026-09-14 Frank「加上省市」):companies 表没有市列,取该司在招岗里第一座城;没岗给空串。
 *
 * @param x 公司档案。
 * @returns 城市名或空串。
 */
export function cityOf(x: CompanyOnlyIn): string {
  for (const j of x.company.jobs) {
    if (j.city !== TEXT_NONE) {
      return j.city
    }
  }
  return TEXT_NONE
}

/**
 * 「所在地」节的本地对照行(2026-09-14 Frank「这个需要加逗号吧」:模型把「Vancouver, British Columbia」译成
 * 「不列颠哥伦比亚省温哥华市」一串):AI 那句是「市, 省」形且市在本公司在招岗里有这一市时,
 * 拼「市译名, 省译名」(市译名取 cities 表核定,没核定照英文);拼出来和原句一样(英文界面)或对不上给空串。
 *
 * @param x 取词函数、界面语言与公司档案。
 * @returns 对照行;'' = 照模型译文。
 */
export function baseZhOf(x: BaseZhIn): string {
  const base = baseTextOf({ text: x.company.aiBrief })
  const m = BASE_CITY_PROV_RE.exec(base)
  if (m == null || m.groups == null || m.groups.city == null) {
    return TEXT_NONE
  }
  const city = m.groups.city.trim().toLowerCase()
  for (const j of x.company.jobs) {
    if (j.city.toLowerCase() === city && j.province !== TEXT_NONE) {
      const prov = provFullOf({ t: x.t, code: j.province })
      if (prov === TEXT_NONE) {
        return TEXT_NONE
      }
      const out = cityLocalOf({ j, lang: x.lang }) + LOC_JOIN + prov
      if (out === base) {
        return TEXT_NONE
      }
      return out
    }
  }
  return TEXT_NONE
}

/**
 * 在招岗一行的市名界面语版:中 / 韩界面取核定译名,没核定或英文界面照英文。
 *
 * @param x 这一行与界面语言。
 * @returns 市名。
 */
function cityLocalOf(x: CityLocalIn): string {
  if (x.lang === LANG_ZH && x.j.cityZh !== TEXT_NONE) {
    return x.j.cityZh
  }
  if (x.lang === LANG_KO && x.j.cityKo !== TEXT_NONE) {
    return x.j.cityKo
  }
  return x.j.city
}

/**
 * 维基链接的词条名(路径最后一段解码、下划线换空格):基本信息卡「维基百科」行的钮面,整条 URL 太长一行放不下。
 *
 * @param url 维基链接。
 * @returns 词条名;解不出照最后一段。
 */
export function wikiTitleOf(url: string): string {
  const last = url.split(WIKI_PATH_SEP).pop()
  if (last == null || last === TEXT_NONE) {
    return url
  }
  try {
    return decodeURIComponent(last).split(WIKI_WORD_SEP).join(WIKI_WORD_JOIN)
  } catch {
    return last
  }
}

/**
 * 基本信息卡的省码:与 cityOf 取同一行在招岗的省(2026-09-14 Frank「这个省不对啊」:BDO 档案省 AB、市却取到最新岗的 Toronto);
 * 没有带市的岗才退回档案省。
 *
 * @param x 公司档案。
 * @returns 省码;'' = 没有。
 */
export function homeProvinceOf(x: CompanyOnlyIn): string {
  for (const j of x.company.jobs) {
    if (j.city !== TEXT_NONE && j.province !== TEXT_NONE) {
      return j.province
    }
  }
  return x.company.province
}

/**
 * 基本信息卡「总部」行:AI 简介「所在地」一节的正文。
 * 沿革(原 hasOfficialPlaceOf:有官方地点就不出 AI 简介的「所在地」节):2026-09-14 Frank「AI 探索的所在地不对啊」先改成换显官方地点;同日晚「是 AI 查到的地址,如果和上面的不一致,
 * 可以不显示吗」改成省对不上才藏(baseConflictOf);再晚「这个老不稳定 地址」(Micromatter:官方 Surrey、AI 说 Burnaby,
 * 省对上市对不上照样出)定为:官方地点在,这一节就不出 —— 省 / 市两行已是官方地点,AI 那句只会添乱。
 * 2026-09-19 Frank「省 市 去掉,改成 总部 和 在招地 两个」(Compass Group Canada 实拍:省 / 市取的是某一条岗的
 * Windsor NS,看着像总部):两种地点各挂各的名字就不打架了 —— AI 查到的「所在地」提上来当「总部」行(本函数,
 * 原 hasOfficialPlaceOf 退役);提上来了简介里就不再重复出那一节(岗位地点那一行「在招地」同日晚撤)。
 * 一律照 AI 原句的英文(同日 Frank「不要用 中文」:原先中 / 韩界面拼核定译名,出来是「渥太华, Ontario」半中半英)。
 * 同日 Frank「这不是胡说吗」(SOTI 总部写成 Ottawa,真身 Mississauga —— 那条简介没有出处,是模型裸答)、
 * 「拿不到总部的就先 -」:只认有出处的简介;没有出处 / 没缓存 / 没这一节一律给「—」(那一行照出)。
 * 2026-09-20 真总部进库(官网页面原句核对过的街址 / 市 / 省,官网没标的退 Wikidata):库里有就先用它,没有才走上面那条 AI 简介的老路。
 *
 * @param x 取词函数、界面语言与公司档案。
 * @returns 总部一行的文案;拿不到给「—」。
 */
export function hqOf(x: BaseZhIn): string {
  if (x.company.hq !== TEXT_NONE) {
    return x.company.hq
  }
  if (x.company.aiSources.length === 0) {
    return DASH_EM
  }
  const base = baseTextOf({ text: x.company.aiBrief })
  if (base === TEXT_NONE) {
    return DASH_EM
  }
  return base
}

/**
 * 公司弹框正文首帧要不要先藏(2026-09-14 Frank「所以肯定是渲染了好几次」:aiBusy 初值 false、由 CompanyAiSection 的
 * effect 事后回报,首帧正文先露一下再被藏 —— 那一闪就是它)。要懒抓 AI 简介的那一档(没厚简介、没缓存简介、有名字,
 * 与 CompanyIntro 的分支同序)首帧就按在途算。
 *
 * @param x 公司档案。
 * @returns 要懒抓 = true。
 */
export function needsAiFetchOf(x: CompanyOnlyIn): boolean {
  return hasDescOf(x) === false && x.company.aiBrief === TEXT_NONE && x.company.name !== TEXT_NONE
}

/**
 * AI 简介里的「所在地」正文(2026-09-14 Frank「这种地址有冲突的怎么解决」:公司没留街址时,
 * 地址行先取它,再退岗位所在省;取了就不再在简介里重复出那一段)。
 *
 * @param x 简介原文。
 * @returns 所在地文本;没有或写着「无」给空串。
 */
export function baseTextOf(x: BriefSecsIn): string {
  const text = secTextOf({ secs: briefSecsOf({ text: x.text }), mark: CO_SEC_BASE })
  if (isJdNone(text)) {
    return TEXT_NONE
  }
  return text
}

/**
 * 身份区(官网/地址/行业/行业段/维基)有没有东西可显 —— 一格都没有时那条分隔线不出。
 *
 * @param x 公司档案与算好的地址。
 * @returns 有没有。
 */
export function hasIdOf(x: HasIdIn): boolean {
  if (x.company.website !== TEXT_NONE || x.addr !== TEXT_NONE) {
    return true
  }
  return x.company.industry !== TEXT_NONE || x.company.sectors !== TEXT_NONE || x.company.wikiUrl !== TEXT_NONE
}

/**
 * 弹框里「显示中文对照」钮出不出(#196 放宽):AI 简介可翻,**或**在招职位有
 * 界面语译名可显 —— 原先只认 AI 简介,于是「名录厚简介 + 在招译名」的公司没钮,
 * 译名却无条件冒出来。英文界面一律不出(译名与主文案同语)。
 *
 * @param x 公司档案与界面语言。
 * @returns 出不出。
 */
export function canTransOf(x: CanTransIn): boolean {
  if (x.lang === LANG_EN || x.company == null) {
    return false
  }
  if (hasDescOf({ company: x.company }) === false) {
    return true
  }
  for (const job of x.company.jobs) {
    let zh = job.nocTitleKo
    if (x.lang === LANG_ZH) {
      zh = job.nocTitleZh
    }
    if (zh !== TEXT_NONE && zh.toLowerCase() !== job.title.toLowerCase()) {
      return true
    }
  }
  return false
}

/**
 * 「完整页 ↗」的 slug:职位行上带的优先(它是这次点进来的那家),
 * 取数回来的公司行兜底;都没有就不出这个钮(不做死链)。
 *
 * @param x 职位行上的 slug 与取到的公司档案。
 * @returns slug;没有时给空串。
 */
export function panelSlugOf(x: PanelSlugIn): string {
  if (x.jobSlug !== TEXT_NONE) {
    return x.jobSlug
  }
  if (x.company == null) {
    return TEXT_NONE
  }
  return x.company.slug
}

/**
 * 弹框顶部药丸钮的类名(开着的那个换蓝底蓝字)。药丸形自带一份本域的类:
 * 它压在 button 域的 `.btn`/`.ghost` 之上,加倍写抬权重、不赌打包顺序(先例 account）。
 *
 * @param x 开合。
 * @returns 类名。
 */
export function pillClsOf(x: PillClsIn): string {
  if (x.on) {
    return cssOf(css.pill) + CLS_SEP + cssOf(css.pillOn)
  }
  return cssOf(css.pill)
}

/**
 * 担保档色阶(与列表「通道」列同源;未评/无记录给浅灰 ——
 * 🔴 无记录 ≠ 不担保,色阶上也不给负判定的暗示)。
 *
 * @param x 档位。
 * @returns 色值。
 */
export function chColorOf(x: ChColorIn): string {
  if (x.grade == null) {
    return CH_C_NONE
  }
  if (x.grade >= CH_GRADE_DEEP_MIN) {
    return CH_C_DEEP
  }
  if (x.grade >= CH_GRADE_GREEN_MIN) {
    return CH_C_GREEN
  }
  if (x.grade >= CH_GRADE_GRAY_MIN) {
    return CH_C_GRAY
  }
  if (x.grade >= CH_GRADE_AMBER_MIN) {
    return CH_C_AMBER
  }
  return CH_C_NONE
}

/**
 * 一股 LMIA 的显示名与技能类判定(技能股 = High Wage / GTS / PR,match.ts 口径;
 * 前端只展示不判定)。认不出的股渲原名,不硬塞进已知的五档。
 *
 * @param x 股别原名与取词函数。
 * @returns 显示名与技能类标记。
 */
export function streamLabelOf(x: StreamLabelIn): StreamLabel {
  const low = x.name.toLowerCase()
  if (STREAM_HIGH_RE.test(low)) {
    return { label: x.t(KEY_STREAM_HIGH), skilled: true }
  }
  if (STREAM_GTS_RE.test(low)) {
    return { label: x.t(KEY_STREAM_GTS), skilled: true }
  }
  if (STREAM_PR_RE.test(low)) {
    return { label: x.t(KEY_STREAM_PR), skilled: true }
  }
  if (STREAM_LOW_RE.test(low)) {
    return { label: x.t(KEY_STREAM_LOW), skilled: false }
  }
  if (STREAM_AGRI_RE.test(low)) {
    return { label: x.t(KEY_STREAM_AGRI), skilled: false }
  }
  return { label: x.name, skilled: false }
}

/**
 * LMIA 股别串解析(「High Wage 58 · Low Wage 1008」→ 逐股)。
 *
 * @param x 股别串与取词函数。
 * @returns 逐股的展示行;串为空时是空表。
 */
export function streamsOf(x: StreamsIn): CompanyStream[] {
  if (x.streams === TEXT_NONE) {
    return []
  }
  const out: CompanyStream[] = []
  for (const part of x.streams.split(CO_STREAM_SPLIT_RE)) {
    const one = part.trim()
    if (one !== TEXT_NONE) {
      const m = one.match(CO_STREAM_COUNT_RE)
      let rawName = one
      let count = TEXT_NONE
      if (m != null && m.groups != null && m.groups.name != null && m.groups.count != null) {
        rawName = m.groups.name.trim()
        count = m.groups.count
      }
      const named = streamLabelOf({ name: rawName, t: x.t })
      out.push({ label: named.label, count, skilled: named.skilled })
    }
  }
  return out
}

/**
 * 政府/公共机构判定(Frank 2026-07-24):强信号名称关键词,宁可漏标不错标。
 *
 * @param x 公司名。
 * @returns 是不是政府/公共机构。
 */
export function isGovCompany(x: IsGovIn): boolean {
  if (x.name === TEXT_NONE) {
    return false
  }
  if (GOV_BODY_RE.test(x.name) || GOV_PLACE_RE.test(x.name)) {
    return true
  }
  return GOV_ORG_RE.test(x.name)
}

/**
 * 只留真的 http(s) 链接(#191「看来源」折叠列的是可点的网页,存量里混过非链接的字串)。
 *
 * @param x 来源网页原列。
 * @returns 可点的来源。
 */
export function httpSourcesOf(x: HttpSourcesIn): string[] {
  const out: string[] = []
  for (const url of x.sources) {
    if (HTTP_URL_RE.test(url)) {
      out.push(url)
    }
  }
  return out
}

/**
 * 担保维的档名文案键:有 LMIA 记录按档位取,AIP 指定但无记录走专句。
 *
 * @param x 担保维与取词函数。
 * @returns 文案键。
 */
export function sponsorTierKeyOf(x: SponsorTextIn): string {
  if (x.dim.v != null && x.dim.v.total > 0) {
    return KEY_SP_TIER_HEAD + String(x.dim.g)
  }
  return KEY_SP_TIER_AIP
}

/**
 * 担保维的依据句(近两年获批总数 + 技能股 + 最近季度;无记录走 AIP 专句)。
 *
 * @param x 担保维与取词函数。
 * @returns 依据句。
 */
export function sponsorEvidenceOf(x: SponsorTextIn): string {
  const v = x.dim.v
  if (v == null || v.total === 0) {
    return x.t(KEY_SP_EVIDENCE_AIP)
  }
  let skilled = 0
  if (v.skilled != null) {
    skilled = v.skilled
  }
  let quarter = DASH_EM
  if (v.q !== TEXT_NONE) {
    quarter = v.q
  }
  return x.t(KEY_SP_EVIDENCE, { total: v.total, n: skilled, q: quarter })
}

/**
 * 活跃度维的档名文案键。
 *
 * @param x 活跃度维与取词函数。
 * @returns 文案键。
 */
export function activeTierKeyOf(x: ActiveTextIn): string {
  return KEY_ACT_TIER_HEAD + String(x.dim.g)
}

/**
 * 活跃度维的依据句(在招 N 个岗、近 30 天新发 M 个;只在招 1 个走单数句)。
 *
 * @param x 活跃度维与取词函数。
 * @returns 依据句。
 */
export function activeEvidenceOf(x: ActiveTextIn): string {
  let open = 0
  let new30 = 0
  if (x.dim.v != null) {
    open = x.dim.v.open
    new30 = x.dim.v.new30
  }
  if (open === 1) {
    return x.t(KEY_ACT_EVIDENCE_ONE, { open, n: new30 })
  }
  return x.t(KEY_ACT_EVIDENCE, { open, n: new30 })
}

/**
 * 薪资维的档名文案键。
 *
 * @param x 薪资维与取词函数。
 * @returns 文案键。
 */
export function salaryTierKeyOf(x: SalaryTextIn): string {
  return KEY_SAL_TIER_HEAD + String(x.dim.g)
}

/**
 * 薪资维的依据句(相对同职业中位的百分比;正数自己补正号 —— 不补看不出高还是低)。
 *
 * @param x 薪资维与取词函数。
 * @returns 依据句。
 */
export function salaryEvidenceOf(x: SalaryTextIn): string {
  let pct = String(x.dim.v)
  if (x.dim.v >= 0) {
    pct = SIGN_PLUS + String(x.dim.v)
  }
  return x.t(KEY_SAL_EVIDENCE, { pct })
}

/**
 * 知名度维的档名文案键。
 *
 * @param x 知名度维与取词函数。
 * @returns 文案键。
 */
export function fameTierKeyOf(x: FameTextIn): string {
  return KEY_FM_TIER_HEAD + String(x.dim.g)
}

/**
 * 知名度维的依据句(维基条目 / 跨省在招 / 在招岗数,有几条列几条,顿号连)。
 *
 * @param x 知名度维与取词函数。
 * @returns 依据句;一条都没有时给空串(那一格空着)。
 */
export function fameEvidenceOf(x: FameTextIn): string {
  const v = x.dim.v
  if (v == null) {
    return TEXT_NONE
  }
  const parts: string[] = []
  if (v.wiki !== TEXT_NONE) {
    parts.push(x.t(KEY_FM_WIKI))
  }
  if (v.provs >= FAME_PROVS_MIN) {
    parts.push(x.t(KEY_FM_PROVS, { n: v.provs }))
  }
  if (v.open === 1) {
    parts.push(x.t(KEY_FM_OPEN_ONE, { n: v.open }))
  }
  if (v.open > 1) {
    parts.push(x.t(KEY_FM_OPEN, { n: v.open }))
  }
  return parts.join(SEP_ENUM)
}

/**
 * 在招岗名下的 NOC 译名(#200 Frank「岗位名称中文翻译默认都加上」):
 * 界面语言的译名优先,没有就退回官方英文名。
 *
 * @param x 在招一行与界面语言。
 * @returns 译名。
 */
export function jobNocNameOf(x: JobNocNameIn): string {
  if (x.lang === LANG_ZH && x.job.nocTitleZh !== TEXT_NONE) {
    return x.job.nocTitleZh
  }
  if (x.lang === LANG_KO && x.job.nocTitleKo !== TEXT_NONE) {
    return x.job.nocTitleKo
  }
  return x.job.nocTitle
}

/**
 * 岗名下那条灰字小注:NOC 译名与岗名重复(大小写不计)时不出 —— 一行说两遍。
 *
 * @param x 在招一行与界面语言。
 * @returns 小注;不出时给空串。
 */
export function jobSubOf(x: JobNocNameIn): string {
  const name = jobNocNameOf(x)
  if (name === TEXT_NONE) {
    return TEXT_NONE
  }
  if (name.toLowerCase() === x.job.title.toLowerCase()) {
    return TEXT_NONE
  }
  return name
}

/**
 * 获批职业的显示名(界面语言优先;没有译名的渲裸码)。
 *
 * @param x 获批职业一行与界面语言。
 * @returns 职业名;没有名字时给空串(调用方改渲裸码)。
 */
export function lmiaNocNameOf(x: LmiaNocNameIn): string {
  if (x.lang === LANG_ZH && x.row.titleZh !== TEXT_NONE) {
    return x.row.titleZh
  }
  if (x.lang === LANG_KO && x.row.titleKo !== TEXT_NONE) {
    return x.row.titleKo
  }
  return x.row.title
}

/**
 * 基本信息卡里那行公司名称(Frank 2026-07-24「一直显示方便用户看」):
 * 有界面语译名显译名,否则显原名 —— 标题会截断长名,这行给全名。
 *
 * @param x 界面语言与公司档案。
 * @returns 显示名。
 */
export function displayNameOf(x: DisplayNameIn): string {
  const alias = aliasOf({ lang: x.lang, aliasZh: x.company.aliasZh, aliasKo: x.company.aliasKo })
  if (alias !== TEXT_NONE) {
    return alias
  }
  return x.company.name
}

/**
 * 在招职位这一屏渲哪几行(#198:首显 8,原地展开不跳转;2026-09-20 起一批一批露,不再一次全铺)。
 *
 * @param x 在招行与现在露几条。
 * @returns 这一屏要渲的行。
 */
export function jobsShownOf(x: JobsShownIn): CompanyJobRow[] {
  return x.jobs.slice(0, x.n)
}

/**
 * 获批职业逐行列出的那几行(#286:Top 6 逐行)。
 *
 * @param x 获批职业行。
 * @returns 前 6 行。
 */
export function topNocsOf(x: NocRowsIn): LmiaNocRow[] {
  return x.rows.slice(0, NOCS_TOP_N)
}

/**
 * 并成一行的余量(#286:Top 6 之外的行数不逐行列)。
 *
 * @param x 获批职业行。
 * @returns 余下的行。
 */
export function restNocsOf(x: NocRowsIn): LmiaNocRow[] {
  return x.rows.slice(NOCS_TOP_N)
}

/**
 * 余量那一行的岗位数合计。
 *
 * @param x 余下的行。
 * @returns 合计岗位数。
 */
export function restPositionsOf(x: LmiaRestIn): number {
  let n = 0
  for (const row of x.rest) {
    n += row.positions
  }
  return n
}

/**
 * 简介外壳的类名:扁平态只留节距,卡壳态是全站白卡。
 *
 * @param x 扁平态。
 * @returns 类名。
 */
export function briefWrapClsOf(x: FlatIn): string {
  if (x.flat) {
    return cssOf(css.flatSec)
  }
  return CARD_MD_CLS
}

/**
 * 简介标题的类名:扁平态走 JD 次级头,卡壳态是全站卡标题。
 *
 * @param x 扁平态。
 * @returns 类名。
 */
export function briefHeadClsOf(x: FlatIn): string {
  if (x.flat) {
    return cssOf(css.flatHead)
  }
  return CARD_HEAD_CLS
}

/**
 * 简介一节外框的类名(#188 扁平态对齐 JD 整理版:节距收到 2)。
 *
 * @param x 扁平态。
 * @returns 类名。
 */
export function secClsOf(x: FlatIn): string {
  if (x.flat) {
    return cssOf(css.sec) + CLS_SEP + cssOf(css.secFlat)
  }
  return cssOf(css.sec)
}

/**
 * 简介节内小标题的类名(#188 扁平态:粗体深灰不缩进,与 JD 次级头同款)。
 *
 * @param x 扁平态。
 * @returns 类名。
 */
export function secHeadClsOf(x: FlatIn): string {
  if (x.flat) {
    return cssOf(css.secHead) + CLS_SEP + cssOf(css.secHeadFlat)
  }
  return cssOf(css.secHead)
}

/**
 * 简介节内正文的类名(扁平态统一缩进 14,与 JD 正文同值)。
 *
 * @param x 扁平态。
 * @returns 类名。
 */
export function secBodyClsOf(x: FlatIn): string {
  if (x.flat) {
    return cssOf(css.flatBody)
  }
  return cssOf(css.secBody)
}

/**
 * AI 检索声明行的类名(三处同一套,只有外边距按位置分三档)。
 *
 * @param x 位置档。
 * @returns 类名。
 */
export function aiNoteClsOf(x: AiNoteClsIn): string {
  const kindCls: Record<CompanyAiNoteKind, string> = {
    brief: cssOf(css.aiBrief),
    lazy: cssOf(css.aiLazy),
    panel: cssOf(css.aiPanel),
  }
  return cssOf(css.ai) + CLS_SEP + kindCls[x.kind]
}

/**
 * 中文对照行的类名(蓝竖条走全局 `.jdZh`,几何微调与散文的换行保留是本域的类)。
 *
 * @param x 散文态。
 * @returns 类名。
 */
export function zhLineClsOf(x: ZhLineClsIn): string {
  if (x.prose) {
    return JD_ZH_CLS + CLS_SEP + cssOf(css.zhLine) + CLS_SEP + cssOf(css.zhProse)
  }
  return JD_ZH_CLS + CLS_SEP + cssOf(css.zhLine)
}

/**
 * 在招职位卡「再展开」钮的钮面:这一下会多露几条(不够一批就是剩下的条数)。
 * 沿革:2026-09-14 Frank「加一个收起的功能」时是一枚展开 / 收起两用钮(原 jobsToggleLabelOf);
 * 2026-09-20「这种最好不要一次性展开 449 个」拆成「再展开」与「收起」两枚。
 *
 * @param x 取词函数与折着的岗数。
 * @returns 钮面文案。
 */
export function jobsMoreLabelOf(x: JobsToggleLabelIn): string {
  if (x.hidden < JOBS_STEP_N) {
    return x.t('act.showMore', { n: x.hidden })
  }
  return x.t('act.showMore', { n: JOBS_STEP_N })
}

/**
 * 「再展开」钮的点击手柄:多露一批。
 *
 * @param x 现在露几条与落格。
 * @returns 点击手柄。
 */
export function makeJobsMore(x: JobsMoreIn): GoBackFn {
  return function more(): void {
    x.set(x.n + JOBS_STEP_N)
  }
}

/**
 * 「收起」钮的点击手柄:回到首屏那几条。
 *
 * @param x 落格。
 * @returns 点击手柄。
 */
export function makeJobsReset(x: JobsResetIn): GoBackFn {
  return function reset(): void {
    x.set(JOBS_FIRST_N)
  }
}

/**
 * 折叠钮的点击手柄(「看来源」这类开合)。
 *
 * @param x 现值与落格。
 * @returns 点击手柄。
 */
export function makeToggle(x: ToggleIn): GoBackFn {
  return function toggle(): void {
    x.set(x.on === false)
  }
}

/**
 * 点迷你职位行的手柄:叠开 JD 弹框(把整行交回上层)。
 * 2026-09-19 Frank「这种里面的链接都改成弹框显示…现在点击是跳页面,要想看其他的还得点回来」:行仍是真链接
 * (爬虫与新标签开页照旧),普通左键拦下开弹框;整行没载入的现取一次,取不到就照链接去详情页。
 *
 * @param x 岗位号、已载入的整行与上层回调。
 * @returns 链接的 onClick。
 */
export function makeOpenJob(x: OpenJobIn): PeekClickFn {
  return function openJob(e: React.MouseEvent): void {
    if (isPlainClick(e) === false) {
      return
    }
    e.preventDefault()
    if (x.row != null) {
      x.onOpenJob(x.row)
      return
    }
    function read(r: Response): Promise<JobRowJson> {
      if (r.ok) {
        return r.json()
      }
      return Promise.resolve(null)
    }
    function fall(): void {
      window.location.assign(URL_JOB_HEAD + String(x.id))
    }
    function land(row: JobRowJson): void {
      if (row == null) {
        fall()
        return
      }
      x.onOpenJob(row)
    }
    fetch(URL_JOBS_ROW_HEAD + String(x.id)).then(read).then(land).catch(fall)
  }
}

/**
 * 点相似雇主的手柄:开公司弹框(已在公司弹框里 = 同框换一家);拦法同 makeOpenJob。
 *
 * @param x 这一家与上层回调。
 * @returns 链接的 onClick。
 */
export function makeOpenCompany(x: OpenCompanyIn): PeekClickFn {
  return function openCompany(e: React.MouseEvent): void {
    if (isPlainClick(e) === false) {
      return
    }
    e.preventDefault()
    x.onOpenCompany(x.peek)
  }
}

/**
 * 埋点:点了相似雇主卡里的一家(2026-09-21 Frank「给相似雇主卡加个点击埋点」)。挂在卡的行区外层,
 * 普通点开弹框、Ctrl / ⌘ 点开新标签都记一次(中键不触发 click,不记;挂法照相似职位卡的 trackRelated)。
 *
 * @returns 无。
 */
export function trackSimilar(): void {
  track(TRACK_SIMILAR)
}

/**
 * 是不是「普通左键」:按着 Ctrl / ⌘ / Shift / Alt、或非左键的一律放行给链接(新标签开页的习惯不破)。
 *
 * @param e 点击事件。
 * @returns 是普通左键。
 */
function isPlainClick(e: React.MouseEvent): boolean {
  return e.button === 0 && e.metaKey === false && e.ctrlKey === false && e.shiftKey === false && e.altKey === false
}

/**
 * 按岗位号把已载入的整行喂回来(JD 弹框要整份 JobRow;没载入这一行时给 null)。
 *
 * @param x 已载入的职位行。
 * @returns 回查函数。
 */
export function makeResolveJob(x: ResolveJobIn): ResolveJobFn {
  return function resolveJob(id: number): CompanyJobFact | null {
    for (const row of x.jobs) {
      if (Number(row.id) === id) {
        return row
      }
    }
    return null
  }
}

/**
 * 判定卡入口的点击手柄(#287 批D:带岗位号去判定页;先埋点再跳)。
 *
 * @param x 岗位号。
 * @returns 点击手柄。
 */
export function makeTvOpen(x: TvOpenIn): GoBackFn {
  return function openTv(): void {
    track(TRACK_TV_ENTRY, { kind: TRACK_KIND_COMPANY })
    window.location.assign(URL_PLAN_PR_HEAD + String(x.jobId))
  }
}

/**
 * K 调查简介的懒查(#158 Frank 2026-07-19 批:首开自动调查,命中缓存秒回)。
 * 查不到/掉线一律落 null —— 整块消失不留孤儿,不拿空壳假装查过。
 * 2026-09-21 分两步(Frank「怎么不探索了」):先一律只查库(零点几秒,卡上什么都不出);库里没有、又放开了现查,
 * 这一页有过真人动作就当场联网现查(没有就等第一个真人动作),现查在途经 setLive 报给卡 ——「AI 调查中…」只在这一拍出。
 * 原先一次请求两件事都办,卡分不清是在查库还是在调查:查库那一拍闪一下「AI 调查中…」,真调查的十几秒反倒什么都没有。
 *
 * @param x 公司名、三个落格与放不放开现查。
 * @returns effect 里调用的取数函数(带取消标记)。
 */
export function makeLoadBrief(x: LoadBriefIn): LoadFn {
  return function loadBrief(flag: DeadFlag): void {
    const human = humanActiveOf()
    function read(r: Response): Promise<BriefJson> {
      if (r.ok && r.status === HTTP_OK) {
        return r.json()
      }
      return Promise.resolve(null)
    }
    function land(j: BriefJson): void {
      if (flag.dead) {
        return
      }
      const fact = briefFactOf(j)
      x.setFact(fact)
      x.setLoading(false)
      x.setLive(false)
      if (fact == null && x.storedOnly === false && humanActiveOf()) {
        askAgain()
        return
      }
      if (fact == null && x.storedOnly === false) {
        for (const ev of HUMAN_EVENTS) {
          window.addEventListener(ev, askAgain, { once: true, passive: true })
        }
      }
    }
    function landAgain(j: BriefJson): void {
      if (flag.dead) {
        return
      }
      x.setLive(false)
      const fact = briefFactOf(j)
      if (fact == null) {
        return
      }
      x.setFact(fact)
    }
    function askAgain(): void {
      for (const ev of HUMAN_EVENTS) {
        window.removeEventListener(ev, askAgain)
      }
      if (flag.dead) {
        return
      }
      x.setLive(true)
      fetch(URL_CO_INFO, {
        method: METHOD_POST,
        headers: { [HDR_CONTENT_TYPE]: MIME_JSON, [HDR_HUMAN]: HUMAN_YES },
        body: JSON.stringify({ name: x.company }),
      }).then(read).then(landAgain).catch(ignoreAgain)
    }
    function ignoreAgain(): void {
      if (flag.dead) {
        return
      }
      x.setLive(false)
    }
    function fall(): void {
      if (flag.dead) {
        return
      }
      x.setFact(null)
      x.setLoading(false)
      x.setLive(false)
    }
    fetch(URL_CO_INFO, {
      method: METHOD_POST,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON, [HDR_HUMAN]: humanMarkOf(human) },
      body: JSON.stringify({ name: x.company, storedOnly: true }),
    }).then(read).then(land).catch(fall)
  }
}

/**
 * 官网那条工种:公司卡被真人点开报一声,简介区是空的就接着隔一会儿问一次进度(2026-09-20 Frank「就是 AI 探索的时候,显示 抓取官网,
 * 然后才是生成内容 和 翻译」;设计稿 docs/design/点开优先抓取与纠错-20260920.md)。这一页还没有过真人动作的先等第一个动作再报
 * (无头爬虫永远不报,队列不被灌);池里没有这家 / 接口挂了 / 一直排队中(工人不在线)/ 问满次数 → 记成「不再等」,简介走现查兜底。
 *
 * @param x 公司名、要不要等结果与面板落格。
 * @returns effect 里调用的函数(带取消标记)。
 */
export function makeOpenSite(x: OpenSiteIn): LoadFn {
  return function openSite(flag: DeadFlag): void {
    let polls = 0
    function read(r: Response): Promise<SiteStageJson | null> {
      if (r.ok && r.status === HTTP_OK) {
        return r.json()
      }
      return Promise.resolve(null)
    }
    function fall(): void {
      if (flag.dead === false) {
        x.setSite(sitePanelOf({ json: null, off: true }))
      }
    }
    function ask(): void {
      if (flag.dead) {
        return
      }
      polls += 1
      fetch(URL_CO_STAGE, {
        method: METHOD_POST, headers: { [HDR_CONTENT_TYPE]: MIME_JSON }, body: JSON.stringify({ name: x.name }),
      }).then(read).then(land).catch(fall)
    }
    function land(j: SiteStageJson | null): void {
      if (flag.dead) {
        return
      }
      const site = sitePanelOf({ json: j, off: false })
      const stuck = site.stage === STAGE_QUEUED && polls >= SITE_QUEUED_POLLS_MAX
      if (isSiteActive(site.stage) && (stuck || polls >= SITE_POLLS_MAX)) {
        x.setSite(sitePanelOf({ json: j, off: true }))
        return
      }
      x.setSite(site)
      if (x.wait && isSiteActive(site.stage)) {
        window.setTimeout(ask, SITE_POLL_MS)
      }
    }
    function send(): void {
      for (const ev of HUMAN_EVENTS) {
        window.removeEventListener(ev, send)
      }
      if (flag.dead) {
        return
      }
      fetch(URL_CO_OPEN, {
        method: METHOD_POST,
        headers: { [HDR_CONTENT_TYPE]: MIME_JSON, [HDR_HUMAN]: HUMAN_YES },
        body: JSON.stringify({ name: x.name }),
      }).then(read).then(land).catch(fall)
    }
    if (humanActiveOf()) {
      send()
      return
    }
    for (const ev of HUMAN_EVENTS) {
      window.addEventListener(ev, send, { once: true, passive: true })
    }
  }
}

/**
 * 进度接口的响应 → 面板;没回来 / stage 是空的(池里没有这家)/ 强制不再等 → stage 记 off,其余格照回来的。
 *
 * @param x 原始形状与强制标记。
 * @returns 面板。
 */
export function sitePanelOf(x: SitePanelIn): SitePanel {
  const out: SitePanel = { stage: STAGE_OFF, website: TEXT_NONE, hq: TEXT_NONE, hqSource: TEXT_NONE }
  if (x.json == null) {
    return out
  }
  if (typeof x.json.website === 'string') {
    out.website = x.json.website
  }
  if (typeof x.json.hq === 'string') {
    out.hq = x.json.hq
  }
  if (typeof x.json.hqSource === 'string') {
    out.hqSource = x.json.hqSource
  }
  if (x.off === false && typeof x.json.stage === 'string' && x.json.stage !== TEXT_NONE) {
    out.stage = x.json.stage
  }
  return out
}

/**
 * 这一步是不是还在办(卡上出进度行、钩子继续问)。
 *
 * @param stage 办到哪一步。
 * @returns 还在办 = true。
 */
export function isSiteActive(stage: string): boolean {
  return STAGES_ACTIVE.includes(stage)
}

/**
 * 卡上显示的那一步:队列里还在办的照队列;简介到了、中 / 韩译文还在途 = 翻译;其余 = 没有进度行('')。
 *
 * @param x 队列里的步、简介到了没、译文在途没。
 * @returns 显示的步;'' = 不出进度行。
 */
export function shownStageOf(x: ShownStageIn): string {
  if (x.hasFact === false) {
    if (isSiteActive(x.stage)) {
      return x.stage
    }
    return TEXT_NONE
  }
  if (x.transWait && x.stage === STAGE_DONE) {
    return STAGE_TRANS
  }
  return TEXT_NONE
}

/**
 * 进度行的步骤:排队中只出一步;其余按序(本来没官网的多「查找官网」,中 / 韩界面多「翻译」),当前步之前的算做完。
 *
 * @param x 显示的步、有没有官网与界面语言。
 * @returns 步骤清单。
 */
export function siteStepsOf(x: SiteStepsIn): SiteStep[] {
  if (x.stage === STAGE_QUEUED) {
    return [{ key: STAGE_QUEUED, label: STAGE_LABEL.queued, state: STEP_NOW }]
  }
  const out: SiteStep[] = []
  let state = STEP_DONE
  for (const key of STAGE_ORDER) {
    if (key === STAGE_FIND && x.hasSite && x.stage !== STAGE_FIND) {
      continue
    }
    if (key === STAGE_TRANS && (x.lang == null || x.lang === LANG_EN)) {
      continue
    }
    if (key === x.stage) {
      out.push({ key, label: stageLabelOf(key), state: STEP_NOW })
      state = STEP_WAIT
      continue
    }
    out.push({ key, label: stageLabelOf(key), state })
  }
  return out
}

/**
 * 步骤键 → 词条键。
 *
 * @param key 步骤键。
 * @returns 词条键。
 */
function stageLabelOf(key: string): string {
  if (key === STAGE_FIND) {
    return STAGE_LABEL.find
  }
  if (key === STAGE_FETCH) {
    return STAGE_LABEL.fetch
  }
  if (key === STAGE_FACTS) {
    return STAGE_LABEL.facts
  }
  return STAGE_LABEL.trans
}

/**
 * 卡上「官网」行的值:工人这回找到 / 纠对的优先,没有用公司档案里的。
 *
 * @param x 公司档案与面板。
 * @returns 官网;'' = 没有。
 */
export function siteWebsiteOf(x: SiteShownIn): string {
  if (x.site.website !== TEXT_NONE) {
    return x.site.website
  }
  return x.company.website
}

/**
 * 卡上「总部」行的字:工人这回整理出来的真总部优先,没有照旧(hqOf)。
 *
 * @param x 公司档案、面板、取词函数与界面语言。
 * @returns 总部一行字。
 */
export function siteHqOf(x: SiteShownIn): string {
  if (x.site.hq !== TEXT_NONE) {
    return x.site.hq
  }
  return hqOf({ t: x.t, lang: x.lang, company: x.company })
}

/**
 * 卡上「总部」行点开的去处 = Google 地图(2026-09-21 Frank「这个点开应该是打开 google 地图吧」,与「地址」行、雇主板总部列同一个去处;
 * 原先点开是出处页 —— 官网上写着这个总部的那一页 / Wikidata 条目,09-20 起的口径,随之作废)。拿不到(「—」)不成链。
 *
 * @param text 总部一行字。
 * @returns 地图网址;'' = 不成链。
 */
export function hqMapOf(text: string): string {
  if (text === TEXT_NONE || text === DASH_EM) {
    return TEXT_NONE
  }
  return mapsUrl(text)
}

/**
 * 这一页有没有过真人动作(浏览器自己记的:点过、按过键、触过屏才算;只渲染不操作的无头浏览器是 false)。
 * 来由见 HDR_HUMAN。老浏览器没有这个接口的按「有过」算 —— 宁可多查一次,不挡真人。
 *
 * @returns 有过 = true。
 */
function humanActiveOf(): boolean {
  if (navigator.userActivation == null) {
    return true
  }
  return navigator.userActivation.hasBeenActive
}

/**
 * 标记头的值。
 *
 * @param human 这一页有没有过真人动作。
 * @returns 标记值。
 */
function humanMarkOf(human: boolean): string {
  if (human) {
    return HUMAN_YES
  }
  return HUMAN_NO
}

/**
 * 现查接口的响应 → 查到的简介;没查到给 null(整块不出,不拿空壳假装查过)。
 *
 * @param j 接口响应。
 * @returns 简介或 null。
 */
function briefFactOf(j: BriefJson): CompanyBriefFact | null {
  if (j == null || j.brief == null || j.brief === TEXT_NONE) {
    return null
  }
  let website = TEXT_NONE
  let fetched = TEXT_NONE
  let sources: string[] = []
  if (j.website != null) {
    website = j.website
  }
  if (j.fetched != null) {
    fetched = j.fetched
  }
  if (j.sources != null) {
    sources = j.sources
  }
  return { brief: j.brief, website, sources, fetched }
}

/**
 * 批量懒翻职位名(2026-09-14 Frank「这个翻译老是翻译不全啊」:在招清单里没 NOC 译名的行一次发齐);失败静默。
 * 2026-09-19 在招岗放开 50 条上限:接口一次只收 TITLES_CHUNK 条,超了按它分批发,回来的译名并进同一张表。
 *
 * @param x 一组职位名、界面语言与落格。
 * @returns 取数函数(带死旗)。
 */
export function makeLoadTitles(x: LoadTitlesIn): LoadFn {
  return function loadTitles(flag: DeadFlag): void {
    function read(r: Response): Promise<TitlesJson> {
      return r.json().catch(none)
    }
    function none(): null {
      return null
    }
    const got: Record<string, string> = {}
    function land(j: TitlesJson): void {
      if (flag.dead || j == null || j.ok !== true || j.texts == null) {
        return
      }
      const merged: Record<string, string> = {}
      for (const k of Object.keys(got)) {
        merged[k] = String(got[k])
      }
      for (const k of Object.keys(j.texts)) {
        got[k] = String(j.texts[k])
        merged[k] = String(j.texts[k])
      }
      x.setMap(merged)
    }
    function fall(): void {
      return
    }
    for (let i = 0; i < x.titles.length; i += TITLES_CHUNK) {
      fetch(URL_CO_TITLES, {
        method: METHOD_POST,
        headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
        body: JSON.stringify({ titles: x.titles.slice(i, i + TITLES_CHUNK), lang: x.lang }),
      }).then(read).then(land).catch(fall)
    }
  }
}

/**
 * 在招清单里没 NOC 译名的职位名(去重),交给批量懒翻。
 *
 * @param x 在招岗与界面语言。
 * @returns 要翻的一组职位名。
 */
export function untitledOf(x: UntitledIn): string[] {
  const out: string[] = []
  for (const job of x.jobs) {
    if (jobSubOf({ job, lang: x.lang }) !== TEXT_NONE || out.includes(job.title)) {
      continue
    }
    out.push(job.title)
  }
  return out
}

/**
 * 在招清单一行的副题:有 NOC 译名用它,没有就用懒翻出来的标题译名,都没有给空串。
 *
 * @param x NOC 译名、职位名与译名表。
 * @returns 副题。
 */
export function subOrTitleOf(x: SubOrTitleIn): string {
  if (x.sub !== TEXT_NONE) {
    return x.sub
  }
  const got = x.map[x.title]
  if (got == null) {
    return TEXT_NONE
  }
  return got
}

/**
 * 懒翻公司名(2026-09-14 Frank「公司名也做一个懒加载翻译」):打 /api/employers/alias,回来落格;失败静默(英文名照旧)。
 *
 * @param x 公司名、界面语言与落格。
 * @returns 取数函数(带死旗)。
 */
export function makeLoadAlias(x: LoadAliasIn): LoadFn {
  return function loadAlias(flag: DeadFlag): void {
    function read(r: Response): Promise<AliasJson> {
      return r.json().catch(none)
    }
    function none(): null {
      return null
    }
    function land(j: AliasJson): void {
      if (flag.dead) {
        return
      }
      x.onSettled(true)
      if (j == null || j.ok !== true || j.alias == null || j.alias === TEXT_NONE) {
        return
      }
      x.setAlias(j.alias)
    }
    function fall(): void {
      if (flag.dead) {
        return
      }
      x.onSettled(true)
    }
    fetch(URL_CO_ALIAS, {
      method: METHOD_POST,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: JSON.stringify({ name: x.name, lang: x.lang }),
    }).then(read).then(land).catch(fall)
  }
}

/**
 * 官网简介懒翻(2026-09-14 Frank「这个也没加翻译」):打 /api/employers/desc;失败静默(只显英文)。
 *
 * @param x 公司名、界面语言与落格。
 * @returns 取数函数(带死旗)。
 */
export function makeLoadDescTrans(x: LoadDescTransIn): LoadFn {
  return function loadDescTrans(flag: DeadFlag): void {
    function read(r: Response): Promise<TransJson> {
      return r.json().catch(none)
    }
    function none(): null {
      return null
    }
    function land(j: TransJson): void {
      if (flag.dead || j == null || j.ok !== true || j.text == null || j.text === TEXT_NONE) {
        return
      }
      x.setTrans(j.text)
    }
    function fall(): void {
      return
    }
    fetch(URL_CO_DESC, {
      method: METHOD_POST,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: JSON.stringify({ name: x.name, lang: x.lang }),
    }).then(read).then(land).catch(fall)
  }
}

/**
 * 公司简介的懒翻(#185 中文对照:拿到存一份切换零延迟)。
 * 翻不出来就不落格 —— 原文照旧显示,不拿半截译文顶上去。
 * 2026-09-16 Frank「可以,就这样做」(公司弹框不再等翻译):hold 档两段式 —— 首拍只查库(在途 setPending,正文留白半秒内回),
 * 存好的译文与正文一起铺;没存再现场翻(setBusy,正文已铺,译文后到)。非 hold 档(详情页)直接翻。
 * 2026-09-17 留白封顶 HOLD_MAX_MS = 800ms:到点先铺正文(Frank 实拍整框空白「怎么变成空白的了」:留白等的是一次网络请求,
 * 慢了 / 挂了就是一块白板),查库结果回来照常补。
 * 2026-09-17 Frank「自动拨开去掉,但是后台要自动翻译」:开关默认关,正文没必要再为「只查库」留白 —— hold / setPending / HOLD_MAX_MS
 * 三样撤;两段式留下(先只查库,存好的零延迟;没存再现翻,setBusy 让页眉开关在拨开时显「翻译中…」),弹框与详情页同一条路。
 *
 * @param x 公司名、语言与两个落格。
 * @returns effect 里调用的取数函数(带取消标记)。
 */
export function makeLoadTrans(x: LoadTransIn): LoadFn {
  return function loadTrans(flag: DeadFlag): void {
    function land(text: string): void {
      if (flag.dead) {
        return
      }
      x.setBusy(false)
      if (text !== TEXT_NONE) {
        x.setTrans(text)
      }
    }
    function full(): Promise<void> {
      x.setBusy(true)
      return fetchCoTrans({ company: x.company, lang: x.lang, storedOnly: false }).then(land)
    }
    function afterStored(text: string): Promise<void> {
      if (flag.dead) {
        return Promise.resolve()
      }
      if (text !== TEXT_NONE) {
        x.setTrans(text)
        return Promise.resolve()
      }
      return full()
    }
    fetchCoTrans({ company: x.company, lang: x.lang, storedOnly: true }).then(afterStored)
  }
}

/**
 * 拉一次简介译文;没存(storedOnly 那一拍 404)、翻挂、掉线都给空串。
 *
 * @param x 公司名、语言与只不只查库。
 * @returns 译文;没有给空串。
 */
function fetchCoTrans(x: FetchCoTransIn): Promise<string> {
  function none(): null {
    return null
  }
  function read(r: Response): Promise<TransJson> {
    return r.json().catch(none)
  }
  function textOf(j: TransJson): string {
    if (j == null || j.ok !== true || j.text == null) {
      return TEXT_NONE
    }
    return j.text
  }
  function fall(): string {
    return TEXT_NONE
  }
  return fetch(URL_CO_TRANSLATE, {
    method: METHOD_POST,
    headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
    body: JSON.stringify({ name: x.company, lang: x.lang, storedOnly: x.storedOnly }),
  }).then(read).then(textOf).catch(fall)
}

/**
 * 不关心在途态的落格(useCompanyAi 那条懒抓路径自己算在途,不要这两格)。
 *
 * @param _on 在途没。
 * @returns 无。
 */
export function ignoreFlag(_on: boolean): void {
  return
}

/**
 * 对照行跟开关走:关着给空串(行不出)。
 *
 * @param x 出不出与对照行文本。
 * @returns 文本或空串。
 */
export function zhShownOf(x: ZhShownIn): string {
  if (x.show) {
    return x.text
  }
  return TEXT_NONE
}

/**
 * 公司弹框取数(E8-11 B1:与 /companies/[slug] 页面同一份数据,免额度)。
 *
 * @param x 岗位号与两个落格。
 * @returns effect 里调用的取数函数(带取消标记)。
 */
function panelBodyOf(x: PanelBodyIn): PanelBody {
  if (x.slug !== TEXT_NONE) {
    return { jobId: null, slug: x.slug }
  }
  return { jobId: x.jobId, slug: null }
}

export function makeLoadPanel(x: LoadPanelIn): LoadFn {
  return function loadPanel(flag: DeadFlag): void {
    function read(r: Response): Promise<PanelJson> {
      if (r.ok) {
        return r.json()
      }
      return Promise.resolve(null)
    }
    function land(j: PanelJson): void {
      if (flag.dead) {
        return
      }
      let data = null
      if (j != null && j.company != null) {
        data = { company: j.company, similar: j.similar }
      }
      x.setData(data)
      x.setLoading(false)
    }
    function fall(): void {
      if (flag.dead) {
        return
      }
      x.setData(null)
      x.setLoading(false)
    }
    fetch(URL_JOBS_COMPANY, {
      method: METHOD_POST,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: JSON.stringify(panelBodyOf({ jobId: x.jobId, slug: x.slug })),
    }).then(read).then(land).catch(fall)
  }
}

/**
 * 通道档(1-5)→ 档色:5 深绿、4 绿、3 默认灰黑、2 琥珀、1/缺 灰。
 * 2026-08-30 自退役的 colors 域迁入改名 gradeColorOf(纯派生归 xxxOf;体逐字未动)。
 * (scoreColor 0-100 版随加权分退役;签名沿旧 API 收 undefined —— 存量调用方
 * 有直接传可选字段的,收窄留给消费页形制化批。)
 *
 * @param g 档位;null/undefined = 缺档。
 * @returns 十六进制色(值与名字都在 constants,这里只做阈值判定)。
 */

export function gradeColorOf(g: number | null | undefined): string {
  if (g == null) {
    return GRADE_C_NONE
  }
  if (g >= GRADE_DEEP_GREEN_MIN) {
    return GRADE_C_5
  }
  if (g >= GRADE_GREEN_MIN) {
    return GRADE_C_4
  }
  if (g >= GRADE_NEUTRAL_MIN) {
    return GRADE_C_3
  }
  if (g >= GRADE_AMBER_MIN) {
    return GRADE_C_2
  }
  return GRADE_C_NONE
}

/**
 * 弹框栈上「叠开一条职位」的手柄(2026-09-21 公司页:在招职位点一行往上叠)。
 *
 * @param stack 弹框栈。
 * @returns 手柄。
 */
export function makePushJobLayer(stack: PeekStackRef): OpenJobFn {
  return function pushJobLayer(j: CompanyJobFact): void {
    stack.push({ kind: LAYER_JOB, job: j })
  }
}

/**
 * 弹框栈上「叠开一家公司」的手柄(公司页:相似雇主点一家往上叠)。
 *
 * @param stack 弹框栈。
 * @returns 手柄。
 */
export function makePushCoLayer(stack: PeekStackRef): OpenCompanyFn {
  return function pushCoLayer(peek: CompanyPeek): void {
    stack.push({ kind: LAYER_CO, co: peek })
  }
}

/**
 * 基本信息卡的标题:调用方递了就用它(职位页 / 职位弹框递「公司信息」,2026-09-21),没递用「基本信息」。
 *
 * @param x 取词函数与调用方递的标题。
 * @returns 标题。
 */
export function cardTitleOf(x: CardTitleIn): string {
  if (x.head === TEXT_NONE) {
    return x.t('co.basic')
  }
  return x.head
}

/**
 * 一组职位行底下那行灰字(2026-09-21 Frank「这个下面显示中文翻译,不要显示公司」):界面语言的职位名译名 ——
 * 库里存好的优先,没有用懒翻回来的;英文界面、译名与岗名一样(忽略大小写)、都没有 → 不出。
 * 口径与职位描述弹框标题下那行同源(2026-09-14「标题下那行一律是标题译名」,不放职业分类名)。
 * 2026-09-21 中 / 韩界面这一行一律占着(Frank「然后页面在一部分一部分渲染出来」,闪的第 6 处):译名还没到 / 没有 /
 * 与岗名一样时出一个不换行空格(SUB_HOLD),行高照留,懒翻到了只换字不把下面顶走。
 *
 * @param x 这一行、界面语言与懒翻表。
 * @returns 灰字;英文界面给空串(不出这一行),中 / 韩没有译名给占位空格。
 */
export function miniSubOf(x: MiniSubIn): string {
  if (x.lang === LANG_EN) {
    return TEXT_NONE
  }
  let got = storedTitleOf({ row: x.row, lang: x.lang })
  if (got === TEXT_NONE) {
    const lazy = x.map[x.row.title]
    if (lazy != null) {
      got = lazy
    }
  }
  if (got === TEXT_NONE || got.toLowerCase() === x.row.title.toLowerCase()) {
    return SUB_HOLD
  }
  return got
}

/**
 * 一组职位行里库里还没有界面语言译名的岗名(去重;英文界面给空表 —— 不用翻)。
 *
 * @param x 这一组的行与界面语言。
 * @returns 要懒翻的岗名。
 */
export function untranslatedOf(x: UntranslatedIn): string[] {
  const out: string[] = []
  if (x.lang === LANG_EN) {
    return out
  }
  for (const row of x.rows) {
    if (storedTitleOf({ row, lang: x.lang }) !== TEXT_NONE || out.includes(row.title)) {
      continue
    }
    out.push(row.title)
  }
  return out
}

/**
 * 一行库里存好的界面语言译名(中 / 韩;其余给空串)。
 *
 * @param x 这一行与界面语言。
 * @returns 译名;没有给空串。
 */
function storedTitleOf(x: StoredTitleIn): string {
  if (x.lang === LANG_ZH) {
    return x.row.titleZh
  }
  if (x.lang === LANG_KO) {
    return x.row.titleKo
  }
  return TEXT_NONE
}
