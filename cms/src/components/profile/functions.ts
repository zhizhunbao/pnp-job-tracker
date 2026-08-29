/**
 * profile 域(移民档案)的函数:点选项归属(区间机器 + 三张表的包装)、职业搜索
 * 兜底、逐枚 chip 的 make* 手柄工厂、档案 seed 与保存。2026-08-27 Frank 拍板自
 * account 域拆出;clbActive 族保持标量签名(jobs/OnboardingWizard 经桶在借)。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { hasProfile, normalizeProfile } from '@/lib/jobs'
import {
  BUSY_MARK, CLB_BANDS, CLB_TOP, CRED_INCLUDE, CRS_BANDS, CRS_TOP, HDR_CONTENT_TYPE, HITS_MAX, HTTP_LIMIT,
  HTTP_UNREADABLE, METHOD_PATCH, METHOD_POST, MIME_JSON, NOC_CODE_RE, OB_BRANCHES, OB_PERCENT_MAX, OB_PERCENT_SIGN,
  OB_QUESTION_STATUS, OB_QUESTIONS, OB_SEEN_KEY, OB_SEEN_MARK, OB_STEP_STATUS, PGWP_BANDS, PGWP_TOP, POPULAR_NOCS,
  RESUME_BUSY, RESUME_DONE, RESUME_FAIL, RESUME_FIELD, RESUME_INPUT_RESET, RESUME_LIMIT, RESUME_PREFILL_MAX,
  RESUME_SCAN, SAVED_ERR, SAVED_OK, TEXT_NONE, URL_HOME, URL_MATCH_VIEW, URL_ME, URL_NOC_DESC, URL_RESUME,
  URL_USER_HEAD,
} from './constants'
import type {
  AddTypedFn, AddTypedIn, BandValueIn, CrsModeIn, FileInputEvent, FileOpenIn, LoadNocOptsIn, LoadUserIdIn, MeRespJson,
  NocAdderIn, NocAddFn, NocAddIn, NocDescRespJson, NocDropIn, NocHitsIn, NocLabelIn, NocOpt, NocPickIn, NocsMergeFn,
  NocsMergeIn, NocTitleIn, ObApplyIn, ObBarIn, ObCurrentStepIn, ObDirtyIn, ObFinishFn, ObFinishIn, ObNextLabelIn,
  ObQuestionIn, ObResumeHintIn, ObStep, ObStepsIn, ObTargetIn, OptPickIn, ProfileSeed, ProfileSeedIn, ProvToggleIn,
  ResumeFailIn, ResumePickFn, ResumePickIn, ResumePrefill, ResumeRespJson, ResumeState, ResumeUploadFn,
  ResumeUploadMakeIn, SaveLabelIn, SaveProfileIn, StatusPickIn, StepBackIn, StepNextIn,
} from './types'

/**
 * 造一枚「加输入框里这一个」的按钮手柄:输入框里敲的东西直接加 ——
 * 5 位码按码加,否则加命中的第一条。
 * (原先埋在 input 的 onKeyDown 箭头里 —— 换 field 域的 Search 后,键盘出口归
 *  组件域统一定,这条页面专属行为提成具名函数并给一个显式的钮。)
 *
 * @param x 当前输入、命中清单与加码函数。
 * @returns 点一下加一个职业的手柄。
 */
export function makeAddTyped(x: AddTypedIn): AddTypedFn {
  return function addTyped(): void {
    const v = x.q.trim()
    if (NOC_CODE_RE.test(v)) {
      x.addNoc(v)
      return
    }
    if (x.hits[0] != null) {
      x.addNoc(x.hits[0].noc)
    }
  }
}

/**
 * noc-descriptions 响应 → 职业选项清单(行构造器):缺码的行丢掉(没码没法选),
 * 缺名归一成空串。
 *
 * @param d 接口响应体(归一前)。
 * @returns 洗净的选项清单。
 */
export function toNocOpts(d: NocDescRespJson): NocOpt[] {
  const out: NocOpt[] = []
  if (d == null || d.docs == null) {
    return out
  }
  for (const row of d.docs) {
    if (row.noc == null || row.noc === '') {
      continue
    }
    let title = ''
    if (row.title != null) {
      title = row.title
    }
    out.push({ noc: row.noc, title })
  }
  return out
}

/**
 * 造一枚拉职业选项全集的手柄:noc-descriptions 维度一次拉取(397 行),
 * 挂载时调一次。网络挂了落空清单 —— 与拉取前的初值同形,搜索兜底只是没得可命中。
 *
 * @param x 选项落格。
 * @returns 拉取手柄。
 */
export function makeLoadNocOpts(x: LoadNocOptsIn): () => Promise<void> {
  return async function loadNocOpts(): Promise<void> {
    try {
      const r = await fetch(URL_NOC_DESC, { credentials: CRED_INCLUDE })
      const d = await r.json() as NocDescRespJson
      x.setOpts(toNocOpts(d))
    } catch {
      x.setOpts([])
    }
  }
}

/**
 * 搜索兜底的命中清单:码前缀或职业名包含都算命中,已选的不再出,最多 HITS_MAX 条。
 * 纯派生,每渲染现算(全集 397 行,一次线性扫,不值得上 memo)。
 *
 * @param x 输入、全集与已选清单。
 * @returns 命中清单;没敲字 = 空。
 */
export function nocHitsOf(x: NocHitsIn): NocOpt[] {
  const s = x.q.trim().toLowerCase()
  const out: NocOpt[] = []
  if (s === '') {
    return out
  }
  for (const o of x.opts) {
    if (out.length >= HITS_MAX) {
      break
    }
    if (x.nocs.includes(o.noc)) {
      continue
    }
    if (o.noc.startsWith(s) || o.title.toLowerCase().includes(s)) {
      out.push(o)
    }
  }
  return out
}

/**
 * 码 → 人话职业名(§3.4 藏码):noc-descriptions 官方名优先 → 热门表的大白话标签
 * → 兜底显示码本身。
 *
 * @param x 码、全集与取词函数。
 * @returns 显示名。
 */
export function nocTitleOf(x: NocTitleIn): string {
  for (const o of x.opts) {
    if (o.noc === x.code && o.title !== '') {
      return o.title
    }
  }
  for (const p of POPULAR_NOCS) {
    if (p.noc === x.code) {
      return x.t(p.key)
    }
  }
  return x.code
}

/**
 * 造一枚「加一个职业」的手柄(热门 chip 与命中行共用):空码与重复不加,
 * 加没加成都清搜索框(与旧 addNoc 同口径)。
 *
 * @param x 码、现清单与两个落格。
 * @returns 点一下加一个的手柄。
 */
export function makeNocAdd(x: NocAddIn): () => void {
  return function addNoc(): void {
    if (x.code !== '' && x.nocs.includes(x.code) === false) {
      x.setNocs(x.nocs.concat(x.code))
    }
    x.setQ(TEXT_NONE)
  }
}

/**
 * 参数化的「加一个职业」(makeAddTyped 的加码口):空码与重复不加,
 * 加没加成都清搜索框 —— 与逐枚 chip 的 makeNocAdd 同一套口径。
 *
 * @param x 现清单与两个落格。
 * @returns 收码就加的手柄。
 */
export function makeNocAdder(x: NocAdderIn): NocAddFn {
  return function addNocByCode(code: string): void {
    if (code !== '' && x.nocs.includes(code) === false) {
      x.setNocs(x.nocs.concat(code))
    }
    x.setQ(TEXT_NONE)
  }
}

/**
 * 造一枚「摘一个职业」的手柄(已选标签的 × 与热门 chip 再点取消共用)。
 *
 * @param x 码、现清单与落格。
 * @returns 点一下摘一个的手柄。
 */
export function makeNocDrop(x: NocDropIn): () => void {
  return function dropNoc(): void {
    const next: string[] = []
    for (const c of x.nocs) {
      if (c !== x.code) {
        next.push(c)
      }
    }
    x.setNocs(next)
  }
}

/**
 * 造一枚分型 chip 的点击手柄(E11-04):可不选,点同一项 = 取消。
 *
 * @param x 这枚代表的分型、现值与落格。
 * @returns 点选手柄。
 */
export function makeStatusPick(x: StatusPickIn): () => void {
  return function pickStatus(): void {
    if (x.status === x.slug) {
      x.setStatus(TEXT_NONE)
      return
    }
    x.setStatus(x.slug)
  }
}

/**
 * 造一枚区间档 chip 的点击手柄:点了把这档的值报出去(点 null 值档 = 清空该字段)。
 *
 * @param x 这枚代表的值与上报口。
 * @returns 点选手柄。
 */
export function makeOptPick(x: OptPickIn): () => void {
  return function pickOpt(): void {
    x.onPick(x.value)
  }
}

/**
 * 造一枚目标省 chip 的点击手柄:多选,再点取消。
 *
 * @param x 这枚代表的省码、现清单与落格。
 * @returns 点选手柄。
 */
export function makeProvToggle(x: ProvToggleIn): () => void {
  return function toggleProv(): void {
    if (x.provs.includes(x.prov)) {
      const next: string[] = []
      for (const p of x.provs) {
        if (p !== x.prov) {
          next.push(p)
        }
      }
      x.setProvs(next)
      return
    }
    x.setProvs(x.provs.concat(x.prov))
  }
}

/**
 * 造一枚 EE 分两段式第一段的点击手柄:切「算过/没算过」;切到没算过时把分清掉
 * (数据完整性:没算过就不留分)。
 *
 * @param x 这枚代表哪一段与两个落格。
 * @returns 点选手柄。
 */
export function makeCrsMode(x: CrsModeIn): () => void {
  return function pickCrsMode(): void {
    x.setCrsCalc(x.on)
    if (x.on === false) {
      x.setCrs(null)
    }
  }
}

/**
 * 区间归属的机器:从低到高找第一个「严格小于上界」的档,全不中给顶档锚值。
 * clb/crs/pgwp 三张归属表共用(表在 constants,值域都是整数,闭界换开界不漏值)。
 *
 * @param x 精确值、档表与顶档锚值。
 * @returns 命中档的锚值。
 */
export function bandValueOf(x: BandValueIn): number {
  for (const b of x.bands) {
    if (x.v < b.below) {
      return b.value
    }
  }
  return x.top
}

/**
 * CLB 存值 → 高亮哪档(区间归属)。jobs 的 OnboardingWizard 经桶在借,
 * 签名保持标量入参不动(改成 In 对象要连外域调用点一起改)。
 *
 * @param v 档案里的 CLB 精确值;null = 没填。
 * @returns 该高亮的档锚值;没填 = null。
 */
export function clbActive(v: number | null): number | null {
  if (v == null) {
    return null
  }
  return bandValueOf({ v, bands: CLB_BANDS, top: CLB_TOP })
}

/**
 * CRS 存值 → 高亮哪档(区间归属;存的是下界,见 constants 的 CRS_OPTS)。
 * 同 clbActive,签名保持标量入参。
 *
 * @param v 档案里的 CRS 值;null = 没填。
 * @returns 该高亮的档锚值;没填 = null。
 */
export function crsActive(v: number | null): number | null {
  if (v == null) {
    return null
  }
  return bandValueOf({ v, bands: CRS_BANDS, top: CRS_TOP })
}

/**
 * 工签剩余月数 → 高亮哪档(区间归属)。同 clbActive,签名保持标量入参。
 *
 * @param v 档案里的剩余月数;null = 没填。
 * @returns 该高亮的档锚值;没填 = null。
 */
export function pgwpActive(v: number | null): number | null {
  if (v == null) {
    return null
  }
  return bandValueOf({ v, bands: PGWP_BANDS, top: PGWP_TOP })
}

/**
 * 档案表单各格 state 的初值包:返回用户已填精确值原样保留(state 初值 = 精确值,
 * 不点不覆盖 —— E5-00 数据完整性);码清单滤掉空串。
 *
 * @param x 档案初值(没档 = null)。
 * @returns 逐格初值。
 */
export function profileSeedOf(x: ProfileSeedIn): ProfileSeed {
  const seed: ProfileSeed = { status: TEXT_NONE, nocs: [], clb: null, crs: null, crsCalc: false, provs: [], pgwp: null }
  if (x.initial == null) {
    return seed
  }
  if (x.initial.currentStatus != null) {
    seed.status = x.initial.currentStatus
  }
  if (x.initial.nocCodes != null) {
    for (const c of x.initial.nocCodes) {
      if (c !== '') {
        seed.nocs.push(c)
      }
    }
  }
  if (x.initial.clb != null) {
    seed.clb = x.initial.clb
  }
  if (x.initial.crs != null) {
    seed.crs = x.initial.crs
    seed.crsCalc = true
  }
  if (x.initial.targetProvinces != null) {
    for (const p of x.initial.targetProvinces) {
      if (p !== '') {
        seed.provs.push(p)
      }
    }
  }
  if (x.initial.pgwpMonthsLeft != null) {
    seed.pgwp = x.initial.pgwpMonthsLeft
  }
  return seed
}

/**
 * 造一枚存整份档案的手柄(E5-00 §3.2):PATCH `/api/users/:id` 的 profile 一格,
 * 分型空串存 null、没算过 EE 分就不管手上残值存 null;成败都落 Notice 态,不静默。
 *
 * @param x 档案现值全套与三个落格。
 * @returns 保存手柄。
 */
export function makeSaveProfile(x: SaveProfileIn): () => Promise<void> {
  return async function saveProfile(): Promise<void> {
    x.setBusy(true)
    x.setSaved(TEXT_NONE)
    let statusOut: string | null = null
    if (x.status !== '') {
      statusOut = x.status
    }
    let crsOut: number | null = null
    if (x.crsCalc) {
      crsOut = x.crs
    }
    try {
      const r = await fetch(URL_USER_HEAD + x.userId, {
        method: METHOD_PATCH,
        credentials: CRED_INCLUDE,
        headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
        body: JSON.stringify({ profile: {
          currentStatus: statusOut,
          nocCodes: x.nocs,
          clb: x.clb,
          crs: crsOut,
          targetProvinces: x.provs,
          pgwpMonthsLeft: x.pgwp,
          profileUpdatedAt: new Date().toISOString(),
        } }),
      })
      if (r.ok) {
        x.setSaved(SAVED_OK)
        if (x.onSaved != null) {
          x.onSaved()
        }
      } else {
        x.setSaved(SAVED_ERR)
      }
    } catch {
      x.setSaved(SAVED_ERR)
    } finally {
      x.setBusy(false)
    }
  }
}

/**
 * 档案保存钮的钮面文字:存的过程中换成省略号(占位不跳动),否则是「保存」。
 *
 * @param x 忙态与取词函数。
 * @returns 钮面文字。
 */
export function profileSaveLabelOf(x: SaveLabelIn): string {
  if (x.busy) {
    return BUSY_MARK
  }
  return x.t('prof.save')
}

/**
 * 本次向导要走哪几步(§2.5 分叉):第一步永远是分型,后面几步照分型的分支表接上。
 * 还没选分型(或选的分型不在表里)就只有第一步 —— 选完当场变长,进度条跟着变。
 *
 * @param x 分型现值。
 * @returns 从第一步排到最后一步的步骤清单。
 */
export function obStepsOf(x: ObStepsIn): ObStep[] {
  const out: ObStep[] = [OB_STEP_STATUS]
  for (const b of OB_BRANCHES) {
    if (b.slug === x.status) {
      for (const s of b.steps) {
        out.push(s)
      }
    }
  }
  return out
}

/**
 * 当前停在哪一步:步数往步表上夹一次再取 —— 用户在后面几步回头换了分型,
 * 步表会变短,原来的步数就可能落在表外。取不到按第一步算(步表永远有第一步)。
 *
 * @param x 步表与走到第几步。
 * @returns 当前这一步问什么。
 */
export function obCurrentStepOf(x: ObCurrentStepIn): ObStep {
  const cur = x.steps[Math.min(x.step, x.steps.length - 1)]
  if (cur == null) {
    return OB_STEP_STATUS
  }
  return cur
}

/**
 * 这一步的问句文案键;步名与问句表对不上时退回第一问,不让题面开天窗。
 *
 * @param x 当前这一步。
 * @returns 问句的文案键。
 */
export function obQuestionKeyOf(x: ObQuestionIn): string {
  let key: string = OB_QUESTION_STATUS
  for (const q of OB_QUESTIONS) {
    if (q.step === x.step) {
      key = q.key
    }
  }
  return key
}

/**
 * 进度条填充的宽度:走到第几步占总步数的比例(第一步就见得到一格,所以步数加一)。
 * 只有宽度一格是运行时算出来的,其余长相都在样式表里。
 *
 * @param x 走到第几步与总共几步。
 * @returns 只有宽度一格的运行时样式。
 */
export function obBarStyleOf(x: ObBarIn): React.CSSProperties {
  const pct = Math.round(((x.step + 1) / x.total) * OB_PERCENT_MAX)
  return { width: pct + OB_PERCENT_SIGN }
}

/**
 * 进度条下面那句价值行:从投递流里开的向导只说「以后有相似的岗自动进你邮箱」——
 * dd24-#109 的口径,投递流里按下终键的实际动作是继续投递,不许再许诺「看匹配」。
 *
 * @param x 是不是从投递流里开的与取词函数。
 * @returns 价值行文案。
 */
export function obValueTextOf(x: ObApplyIn): string {
  if (x.apply) {
    return x.t('ob.valueApply')
  }
  return x.t('ob.value')
}

/**
 * 主钮的钮面文字:没走到最后一步就是「下一步」;最后一步上按场次给终键文案
 * (投递流那句说的是继续投递,理由同价值行)。
 *
 * @param x 是不是最后一步、是不是从投递流里开的与取词函数。
 * @returns 钮面文字。
 */
export function obNextLabelOf(x: ObNextLabelIn): string {
  if (x.isLast === false) {
    return x.t('ob.next')
  }
  if (x.apply) {
    return x.t('ob.finishApply')
  }
  return x.t('ob.finish')
}

/**
 * 上传钮右边那句灰字:六个解析态各有各的话,失败的三种要说清是哪一种失败
 * (次数用完 / 读不到文字 / 别的),用户才知道下一步该干什么。
 *
 * @param x 解析态、识别到几个方向与取词函数。
 * @returns 提示语。
 */
export function obResumeHintOf(x: ObResumeHintIn): string {
  if (x.state === RESUME_BUSY) {
    return x.t('ob.resume.busy')
  }
  if (x.state === RESUME_DONE) {
    return x.t('ob.resume.done', { n: x.count })
  }
  if (x.state === RESUME_SCAN) {
    return x.t('ob.resume.scan')
  }
  if (x.state === RESUME_LIMIT) {
    return x.t('ob.resume.limit')
  }
  if (x.state === RESUME_FAIL) {
    return x.t('ob.resume.fail')
  }
  return x.t('ob.resume.hint')
}

/**
 * 当前登录人的响应 → 人的编号(行构造器):没登录、缺号都落 null。
 *
 * @param d 接口响应体(归一前)。
 * @returns 人的编号;没登录 = null。
 */
export function toUserId(d: MeRespJson): string | number | null {
  if (d == null || d.user == null || d.user.id == null) {
    return null
  }
  return d.user.id
}

/**
 * 造一枚拉当前登录人的手柄:向导要拿到编号才知道档案存给谁。拉不到落 null ——
 * 那时向导照常走完,只是不存档,不弹错也不卡住(没登录的人本来也能看完这一问一答)。
 *
 * @param x 编号落格。
 * @returns 拉取手柄。
 */
export function makeLoadUserId(x: LoadUserIdIn): () => Promise<void> {
  return async function loadUserId(): Promise<void> {
    try {
      const r = await fetch(URL_ME, { credentials: CRED_INCLUDE })
      const d = await r.json() as MeRespJson
      x.setUid(toUserId(d))
    } catch {
      x.setUid(null)
    }
  }
}

/**
 * 造一枚上传并解析简历的手柄(E11-07):解析结果只当**预填建议**,不静默入库 ——
 * 识别出的职业候选列进职业步供挑选、前两个替用户预选,英语水平读得出就预选;
 * 用户最后按不按保存,决定权仍在他手上。失败一律回退手动点选,不阻断向导。
 *
 * @param x 解析态、候选、已选职业与英语水平四个落格。
 * @returns 收一份文件就传的手柄。
 */
export function makeResumeUpload(x: ResumeUploadMakeIn): ResumeUploadFn {
  return async function uploadResume(f: File): Promise<void> {
    x.setState(RESUME_BUSY)
    try {
      const fd = new FormData()
      fd.append(RESUME_FIELD, f)
      const r = await fetch(URL_RESUME, { method: METHOD_POST, credentials: CRED_INCLUDE, body: fd })
      if (r.ok === false) {
        x.setState(resumeFailStateOf({ status: r.status }))
        return
      }
      const got = toResumePrefill(await r.json() as ResumeRespJson)
      x.setCandidates(got.candidates)
      if (got.candidates.length > 0) {
        x.setNocs(makeNocsMerge({ candidates: got.candidates }))
      }
      if (got.clb != null) {
        x.setClb(got.clb)
      }
      x.setState(RESUME_DONE)
    } catch {
      x.setState(RESUME_FAIL)
    }
  }
}

/**
 * 上传失败的响应码 → 说哪一句:次数用完、读不到文字,其余一律按「没解析成」。
 * 分开说是因为用户的下一步不一样 —— 次数用完只能明天再来,扫描件该换一份文件。
 *
 * @param x 响应码。
 * @returns 该落的解析态。
 */
export function resumeFailStateOf(x: ResumeFailIn): ResumeState {
  if (x.status === HTTP_LIMIT) {
    return RESUME_LIMIT
  }
  if (x.status === HTTP_UNREADABLE) {
    return RESUME_SCAN
  }
  return RESUME_FAIL
}

/**
 * 简历解析的响应 → 预填建议(行构造器):缺码的候选丢掉(没码没法选),缺名归一成空串;
 * 英语水平读不出落 null —— 那时不动用户已经点过的档,宁可留空也不瞎猜。
 *
 * @param d 接口响应体(归一前)。
 * @returns 洗净的预填建议。
 */
export function toResumePrefill(d: ResumeRespJson): ResumePrefill {
  const out: ResumePrefill = { candidates: [], clb: null }
  if (d == null) {
    return out
  }
  if (d.nocCandidates != null) {
    for (const row of d.nocCandidates) {
      if (row.noc == null || row.noc === '') {
        continue
      }
      let title = ''
      if (row.title != null) {
        title = row.title
      }
      out.candidates.push({ noc: row.noc, title })
    }
  }
  if (d.clb != null) {
    out.clb = d.clb
  }
  return out
}

/**
 * 造一枚把预选合并进已选职业清单的更新函数:只预选前两个候选,已经在清单里的不再加。
 * 写成「拿最新一份清单再合并」的形态,是因为解析要十几秒,这期间用户很可能已经自己
 * 点了几个 —— 拿上传那一刻的旧清单去覆盖,会把他刚点的抹掉。
 *
 * @param x 这次解析出的候选。
 * @returns 收现清单、还回合并后清单的更新函数。
 */
export function makeNocsMerge(x: NocsMergeIn): NocsMergeFn {
  return function mergeNocs(prev: string[]): string[] {
    const out: string[] = []
    for (const c of prev) {
      out.push(c)
    }
    for (const cand of x.candidates.slice(0, RESUME_PREFILL_MAX)) {
      if (out.includes(cand.noc) === false) {
        out.push(cand.noc)
      }
    }
    return out
  }
}

/**
 * 造一枚「选完文件」的回调(签名由 React 的 onChange 定死):把文件交出去传,
 * 随后把文件框清空 —— 不清的话,用户再选同一份文件不会触发变更,看着像点了没反应。
 *
 * @param x 拿到文件交给谁。
 * @returns 变更回调。
 */
export function makeResumePick(x: ResumePickIn): ResumePickFn {
  return function pickResume(e: FileInputEvent): void {
    const list = e.target.files
    if (list != null) {
      const one = list[0]
      if (one != null) {
        x.onUpload(one)
      }
    }
    e.target.value = RESUME_INPUT_RESET
  }
}

/**
 * 造一枚「去点那个藏起来的文件框」的手柄:上传钮是自家钮形,真正的文件框藏着,
 * 点钮 = 替用户点它。还没挂上就什么也不做。
 *
 * @param x 文件框元素。
 * @returns 点钮手柄。
 */
export function makeFileOpen(x: FileOpenIn): () => void {
  return function openFile(): void {
    if (x.el != null) {
      x.el.click()
    }
  }
}

/**
 * 造一枚向导里「选上一个职业」的手柄:空码与重复不加。与档案表单的 makeNocAdd
 * 差在不清搜索框 —— 向导是零打字点选,压根没有搜索框可清。
 *
 * @param x 码、现清单与落格。
 * @returns 点一下选上一个的手柄。
 */
export function makeNocPick(x: NocPickIn): () => void {
  return function pickNoc(): void {
    if (x.code !== '' && x.nocs.includes(x.code) === false) {
      x.setNocs(x.nocs.concat(x.code))
    }
  }
}

/**
 * 已选职业码 → 显示什么(§3.4 藏码):热门表的大白话标签优先,其次是简历识别出的
 * 官方英文类名,都没有才显示码本身。向导里没有职业维度全集(那是档案表单才拉的),
 * 所以这里的取名路子与表单的 nocTitleOf 不同。
 *
 * @param x 码、这次的简历候选与取词函数。
 * @returns 显示名。
 */
export function obNocLabelOf(x: NocLabelIn): string {
  for (const p of POPULAR_NOCS) {
    if (p.noc === x.code) {
      return x.t(p.key)
    }
  }
  for (const c of x.candidates) {
    if (c.noc === x.code && c.title !== '') {
      return c.title
    }
  }
  return x.code
}

/**
 * 造一枚「往后走一步」的手柄:最后一步上按下就是落地(存档并走人),
 * 否则步数加一;步数往步表上夹一次,换过分型也不会走出表外。
 *
 * @param x 位置、总步数、步数落格与落地手柄。
 * @returns 下一步手柄。
 */
export function makeStepNext(x: StepNextIn): () => void {
  return function goNext(): void {
    if (x.isLast) {
      x.finish()
      return
    }
    x.setStep(Math.min(x.step + 1, x.total - 1))
  }
}

/**
 * 造一枚「回上一步」的手柄:第一步上回不动。
 *
 * @param x 位置与步数落格。
 * @returns 上一步手柄。
 */
export function makeStepBack(x: StepBackIn): () => void {
  return function goBack(): void {
    x.setStep(Math.max(0, x.step - 1))
  }
}

/**
 * 造一枚走完向导的手柄:先记「弹过了」,再存档,最后交还调用方或整页跳转。
 * 三处顺序不能换 —— 记号先落,后面存档挂了、页面跳走了都不会重弹。
 * 存档只在**拿得到登录人**且**用户真填了东西**时发生(dd24-#107 的保险丝:
 * 一路跳过等于没东西可存,更不许拿一堆空值覆盖人家已有的档案)。
 * 从投递流里开的向导保存完交还调用方继续投递(E9-04),不跳转。
 *
 * @param x 登录人编号、六格档案值、忙态落格与投递流回调。
 * @returns 落地手柄。
 */
export function makeOnboardingFinish(x: ObFinishIn): ObFinishFn {
  return async function finishOnboarding(): Promise<void> {
    obMarkSeen()
    const dirty = obDirtyOf({
      status: x.status,
      nocs: x.nocs,
      clb: x.clb,
      crs: x.crs,
      crsCalc: x.crsCalc,
      provs: x.provs,
      pgwp: x.pgwp,
    })
    if (x.userId != null && dirty) {
      await makeSaveProfile({
        userId: x.userId,
        status: x.status,
        nocs: x.nocs,
        clb: x.clb,
        crs: x.crs,
        crsCalc: x.crsCalc,
        provs: x.provs,
        pgwp: x.pgwp,
        setBusy: x.setSaving,
        setSaved: dropSaveState,
        onSaved: null,
      })()
    }
    if (x.onFinished != null) {
      x.onFinished()
      return
    }
    window.location.href = obTargetOf({ nocs: x.nocs, crs: x.crs, crsCalc: x.crsCalc, provs: x.provs })
  }
}

/**
 * 记下「首访引导已经弹过」:走完就记 —— 存档挂了、一路跳过没东西可存,同样算弹过
 * (这一问一答用户已经看过了,再弹一次只会烦人)。存不进去(无痕模式、存储被禁)
 * 就随它去:代价只是下次再弹一次,不值得为它中断向导。
 *
 * @returns 无。
 */
export function obMarkSeen(): void {
  try {
    localStorage.setItem(OB_SEEN_KEY, OB_SEEN_MARK)
  } catch {
    return
  }
}

/**
 * 用户到底填没填东西:六格里有任何一格有值就算填了。没算过快速通道分时,
 * 手上那格残分不算数(与存档时的口径一致 —— 没算过就不留分)。
 *
 * @param x 六格档案值。
 * @returns 填了 = true。
 */
export function obDirtyOf(x: ObDirtyIn): boolean {
  if (x.status !== '' || x.nocs.length > 0 || x.clb != null) {
    return true
  }
  if (x.crsCalc && x.crs != null) {
    return true
  }
  return x.provs.length > 0 || x.pgwp != null
}

/**
 * 走完之后整页跳去哪:够得上匹配就跳带匹配视图的职位板(服务端重算后直接亮匹配度),
 * 否则回职位板首页。够不够得上由 lib/jobs 的同一把尺子判,本域不另立一套口径 ——
 * 那把尺子只读职业、分数、目标省三格,所以只喂这三格。
 * 根域直出:职位板就在根路径。
 *
 * @param x 判定真读的三格(外加「算过没」,决定那格分算不算数)。
 * @returns 要跳的地址。
 */
export function obTargetOf(x: ObTargetIn): string {
  let crsOut: number | null = null
  if (x.crsCalc) {
    crsOut = x.crs
  }
  if (hasProfile(normalizeProfile({ nocCodes: x.nocs, crs: crsOut, targetProvinces: x.provs }))) {
    return URL_MATCH_VIEW
  }
  return URL_HOME
}

/**
 * 存档落地态的空落格:向导没有保存提示条 —— 存完就整页跳走或交还投递流,提示条挂不住;
 * 存挂了也放行不卡住用户(与旧件同口径)。存档手柄的落格是必填的,给它一个明写的去处,
 * 好过让人以为这里漏了一格。
 *
 * @returns 无。
 */
export function dropSaveState(): void {
  return
}
