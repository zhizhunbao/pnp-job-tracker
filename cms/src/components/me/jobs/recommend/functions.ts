/**
 * me 桶子桶 jobs 的子桶 recommend —— 「今日推荐」这一页签的行为:推荐取数、换一批、推荐原因胶囊、通道两行名、显示更多与打码行量位。
 * 2026-10-12 Frank「你分的那些都不算子领域」「recommend 吧」:推荐原因、通道名、显示更多 / 打码行、推荐取数是「今日推荐」这一节,
 * 并成一个子桶。2026-11-07 随「我的求职」在新域重写(父桶 functions 过 1000 行闸,照旧切出这一族;「删除」(不再推)撤)。
 * 依赖只许父桶 → 子桶,子桶不取父桶,常量各自抄、形状本桶自声明。
 * 2026-11-07 Frank「现在都按 Azure 的来」:打码行与盖在上面的大钮撤(量位跟着撤),免费号锁住的条数改在表下一行说
 * (「还有 N 条推荐」+「解锁其余 N 条」主钮);「显示更多」只管没列出来的真行。
 * 2026-11-09 Frank「推荐原因删掉」:推荐原因胶囊那一族撤(表格改出中位时薪、vs 中位两列,显示串在本桶 wageViewOf)。
 * 2026-11-11 Frank「别一次性推荐 50 个」「不需要解锁其余」(任务书第 47 条):每天 10 条全给,换一批、显示更多、解锁那一行撤;
 * 加表下「看全部同类职位」的去处 boardHrefOf(同日 Frank「这个也删掉」,又撤)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { openApply, rememberFrom } from '@/components/apply'
import { homeProvinceOf } from '@/lib/location'
import {
  FROM_PICKS,
  ACT_CLICK, ATTR_HREF, HDR_CONTENT_TYPE, JOB_HREF_HEAD, JOB_LINK_SEL, METHOD_POST, MIME_JSON, URL_PICK_ACT,
  CRED_INCLUDE, TEXT_NONE, URL_PICKS,
  URL_PICKS_FRESH, MED_HEAD, MED_TAIL, VS_PCT, VS_PLUS,
  FIT_CHECK_KEY, FIT_HARD_KEY, FIT_KEY_SEP, FIT_LABEL_KEY, FIT_LEVEL_KEY, FIT_NOTE_KEY, FIT_TAG_VARIANT,
  FIT_VARIANT_NONE,
  FIT_MARK_CLOSED, FIT_MARK_OPEN, GOAL_PR, NOTE_NONE, TAG_CHECK,
  GOAL_DEFAULT, NEED_KEY, NEED_SEP_KEY,
} from './constants'
import type {
  OpenApplyIn,
  PickClickEvent,
  LoadPicksIn, PickItem, PicksFact, PicksRespJson,
  TitledItem, WageView, WageViewIn,
  Bullets, FitFact, FitToggleIn, FitVariant, FitView, FitViewIn, NeedTextIn,
} from './types'

/**
 * 造「拉一次推荐」:带上浏览器按时区预选的省(他没答所在省时服务端用它);失败拨「拉失败了」。
 * 2026-10-11:这一页答过档案(fresh)就让服务端不用当天缓存、按新答案现算。
 *
 * @param x 两个落格与要不要现算。
 * @returns 拉推荐的函数。
 */
export function makeLoadPicks(x: LoadPicksIn): () => Promise<void> {
  return async function loadPicks(): Promise<void> {
    let url = URL_PICKS + homeProvinceOf()
    if (x.fresh) {
      url += URL_PICKS_FRESH
    }
    try {
      const r = await fetch(url, { credentials: CRED_INCLUDE })
      if (r.ok === false) {
        x.setFailed(true)
        return
      }
      x.setFailed(false)
      x.setData(toPicksFact(await r.json() as PicksRespJson))
    } catch {
      x.setFailed(true)
    }
  }
}

/**
 * 推荐回包 → 推荐(行构造器:缺席按空读)。2026-11-07 回包里锁住给看的那几条(locked)不再读 —— 打码行撤了。
 * 2026-11-11 任务书第 41 到 46 条:多读各行推荐指数、目标、有没有职业依据(缺席按有)、要补的档案项、出的是不是低档。
 *
 * @param d 回包。
 * @returns 推荐。
 */
export function toPicksFact(d: PicksRespJson): PicksFact {
  let picks: PickItem[] = []
  if (d.picks != null) {
    picks = d.picks
  }
  let fits: FitFact[] = []
  if (d.fits != null) {
    fits = d.fits
  }
  let goal = GOAL_DEFAULT
  if (d.goal != null) {
    goal = d.goal
  }
  let need: string[] = []
  if (d.need != null) {
    need = d.need
  }
  return { picks, fits, goal, basis: d.basis !== false, need, lowOnly: d.lowOnly === true }
}

/**
 * 「要补哪几项」那一句里的项名(身份、语言成绩、工作年限,按界面语,用同补全档案提示条的分隔符连起来)。
 *
 * @param x 要补的档案项与取词函数。
 * @returns 连好的项名。
 */
export function needTextOf(x: NeedTextIn): string {
  const names: string[] = []
  for (const k of x.need) {
    names.push(x.t(NEED_KEY + k))
  }
  return names.join(x.t(NEED_SEP_KEY))
}

/**
 * 中位时薪与 vs 中位两格的显示(2026-11-09 Frank「这部分加进 table 吧」「这个地方都显示 时薪吧」;同职位板那两列的形)。
 *
 * @param x 时薪中位与高出中位的百分比。
 * @returns 两格显示串与是不是低于中位。
 */
export function wageViewOf(x: WageViewIn): WageView {
  return { med: medTextOf(x.hourly), vs: vsTextOf(x.pct), down: x.pct != null && x.pct < 0 }
}

/**
 * 中位时薪显示串(「$N/hr」);没有中位给空串。
 *
 * @param n 本省同职业时薪中位。
 * @returns 显示串。
 */
export function medTextOf(n: number | null): string {
  if (n == null || n <= 0) {
    return TEXT_NONE
  }
  return MED_HEAD + String(n) + MED_TAIL
}

/**
 * vs 中位显示串(高于或持平带加号,低于自带减号);没有百分比给空串。
 *
 * @param n 薪资高出中位的百分比。
 * @returns 显示串。
 */
export function vsTextOf(n: number | null): string {
  if (n == null) {
    return TEXT_NONE
  }
  if (n >= 0) {
    return VS_PLUS + String(n) + VS_PCT
  }
  return String(n) + VS_PCT
}

/**
 * 懒翻职位名要看的行:看得见的推荐(还没拉到给 null)。2026-11-07 打码行撤,锁住的不再翻。
 *
 * @param data 推荐整包。
 * @returns 带职位名的行。
 */
export function titledPicksOf(data: PicksFact | null): TitledItem[] | null {
  if (data == null) {
    return null
  }
  const out: TitledItem[] = []
  for (const p of data.picks) {
    out.push({ title: p.title, titleZh: p.titleZh, titleKo: p.titleKo })
  }
  return out
}

/**
 * 推荐清单里看得见的那几条(还没拉到给 null;公司名懒翻表的入参)。
 *
 * @param data 推荐整包。
 * @returns 看得见的推荐;没拉到给 null。
 */
export function picksOf(data: PicksFact | null): PickItem[] | null {
  if (data == null) {
    return null
  }
  return data.picks
}

/**
 * 推荐指数的显示(2026-11-11 Frank「不要弹框了」「直接那一列,列 bullets」):档的字与色,加几条要点。
 * 同日「bullets 要不点击 high 那个按钮时候才显示」:要点默认收着,点胶囊在原地展开,胶囊上带一个箭头。
 *
 * @param x 服务端下发的推荐指数与取词函数。
 * @returns 显示。
 */
export function fitViewOf(x: FitViewIn): FitView {
  const levelText = x.t(FIT_LEVEL_KEY + x.fact.level)
  let mark = FIT_MARK_CLOSED
  if (x.open) {
    mark = FIT_MARK_OPEN
  }
  return {
    levelText,
    variant: fitVariantOf(x.fact.level),
    bullets: bulletsOf(x),
    open: x.open,
    mark,
    aria: x.t('mj.fit.aria', { lv: levelText }),
  }
}

/**
 * 造「点推荐指数胶囊」:这一行的要点展开着就收起,收着就展开(别的行不动)。
 *
 * @param x 行身份与展开状态。
 * @returns 点击手柄。
 */
export function makeFitToggle(x: FitToggleIn): () => void {
  return function toggleFit(): void {
    const next: string[] = []
    for (const k of x.fold.open) {
      if (k !== x.key) {
        next.push(k)
      }
    }
    if (next.length === x.fold.open.length) {
      next.push(x.key)
    }
    x.fold.setOpen(next)
  }
}

/**
 * 档 → 胶囊色档(表里没有的给灰)。
 *
 * @param level 档。
 * @returns 色档。
 */
export function fitVariantOf(level: string): FitVariant {
  const v = FIT_TAG_VARIANT[level]
  if (v == null) {
    return FIT_VARIANT_NONE
  }
  return v
}

/**
 * 几条要点:拿 PR 先写一条「硬性条件符合」,需自行核对的硬性条件各一条;再是匹配情况各项的说明(缺数据的不列)。
 *
 * @param x 服务端下发的推荐指数与取词函数。
 * @returns 要点,一行一条。
 */
export function bulletsOf(x: FitViewIn): Bullets {
  const out: Bullets = []
  if (x.fact.goal === GOAL_PR) {
    out.push(x.t(FIT_HARD_KEY))
  }
  for (const l of x.fact.hard) {
    if (l.tag === TAG_CHECK) {
      out.push(x.t(FIT_CHECK_KEY, { k: x.t(FIT_LABEL_KEY + l.key) }))
    }
  }
  for (const l of x.fact.soft) {
    if (l.note !== NOTE_NONE) {
      out.push(x.t(FIT_NOTE_KEY + l.key + FIT_KEY_SEP + l.note, l.vars))
    }
  }
  return out
}

/**
 * 上报「点了今天推的这一岗」(点职位名或点投递;2026-11-11 任务书第 48 条)。只为记录,失败不挡用户。
 *
 * @param jobId 职位 id。
 * @returns 无。
 */
export function reportPickClick(jobId: number): void {
  void fetch(URL_PICK_ACT, {
    method: METHOD_POST,
    credentials: CRED_INCLUDE,
    keepalive: true,
    headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
    body: JSON.stringify({ jobId, act: ACT_CLICK }),
  }).catch(skipReportFailure)
}

/**
 * 上报失败的吞错:推荐记录少一次点击,不打扰用户(同 lib/track 的 ignoreTrackFailure)。
 *
 * @param _e 捕到的错误(不用)。
 * @returns 无。
 */
export function skipReportFailure(_e: Error): void {
  return
}

/**
 * 推荐表上点到职位名链接就上报一次点击(链接照常叠开职位框;点别处不报)。
 *
 * @param e 点击事件。
 * @returns 无。
 */
export function onPickListClick(e: PickClickEvent): void {
  if ((e.target instanceof Element) === false) {
    return
  }
  const a = e.target.closest(JOB_LINK_SEL)
  if (a == null) {
    return
  }
  const id = Number(String(a.getAttribute(ATTR_HREF)).slice(JOB_HREF_HEAD.length))
  if (Number.isInteger(id) && id > 0) {
    reportPickClick(id)
  }
}

/**
 * 造「点投递 / 继续」:就地弹投递框(2026-10-09 A 批;原先是去「我的求职」投递区的链接)。
 *
 * 2026-11-11 任务书第 48 条:开框前记下投递入口;从今日推荐点的再上报一次「点了这一岗」。
 *
 * @param x 职位号与投递入口。
 * @returns 点击手柄。
 */
export function makeOpenApply(x: OpenApplyIn): () => void {
  return function openIt(): void {
    rememberFrom({ jobId: x.jobId, from: x.from })
    if (x.from === FROM_PICKS) {
      reportPickClick(x.jobId)
    }
    openApply(x.jobId)
  }
}
