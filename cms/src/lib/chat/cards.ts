// 建档点选卡(2026-08-09 Frank:「做,能让用户手点就别用手输入」)。
//
// 与 slots.ts 的分界:那边从用户的话里**抽**槽位,这边把缺的槽位**摆成可点的卡**。
import { type Claim, type CrsLookupArgs, type CrsResult, PRIVATE_PROMISE, type PermitResult, checkClaims, lookupCoverage, lookupCrs, lookupDraws, lookupEE, lookupJobs, lookupOps, lookupPermit, lookupPlan, lookupThresholds, lookupVerdict } from './tools'
import { AVAIL_SENTENCE, CLAIM_LEAD, FED_FACTOR, LBL, type Lang, PROMISE_WHY, STEP } from '../i18n'
import { DERIVED, VERDICT_CLB_TARGET, claimLabel, commercialClaimLabel, fact, otherClaimLabel, planFacts, sepOf, statusFact, verdictFacts, verdictProfileOf, zhOnly } from './facts'
import { type FederalRuleProgram, isMoneyTalk } from './federal'
import { MAX_FACTS, type OnStep } from './steps'
import type { ChatOption, ChatResult, Fact, ProfileKnown, Slots } from './types'

// ── 建档点选卡(2026-08-09 Frank:「做,能让用户手点就别用手输入」)──────────────
// 普通轮答完,档案还缺槽 → 垫一张点选卡:点选=以用户身份发话=当轮抽槽=D3 只补空回写。
// 一轮只垫一张(优先级 status→prov→clb→edu→expMonths→married→canadaStudy,08-09 Frank
// 「每次都要显示四选一的问题」卡链延长);档案里已有的槽(ProfileKnown)不追问,手填优先。
// 省卡是数据驱动的:只摆**这轮真查到在招数据**的省(答得上的保证,同 followups 一条底线),
// 凑不满两个省就不出省卡;QC 不进卡(QC 走自己的体系不属 PNP,摆进目标省是误导)。
const PROV_ZH: Record<string, [zh: string, en: string, ko: string]> = {
  BC: ['不列颠哥伦比亚', 'British Columbia', '브리티시컬럼비아'], ON: ['安大略', 'Ontario', '온타리오'],
  AB: ['阿尔伯塔', 'Alberta', '앨버타'], SK: ['萨斯喀彻温', 'Saskatchewan', '서스캐처원'],
  MB: ['曼尼托巴', 'Manitoba', '매니토바'], NS: ['新斯科舍', 'Nova Scotia', '노바스코샤'],
  NB: ['新不伦瑞克', 'New Brunswick', '뉴브런즈윅'], NL: ['纽芬兰', 'Newfoundland and Labrador', '뉴펀들랜드'],
  PE: ['爱德华王子岛', 'Prince Edward Island', '프린스에드워드아일랜드'],
}
const provWord = (code: string, lang: Lang): string | null => {
  const row = PROV_ZH[code]
  return row ? row[lang === 'zh' ? 0 : lang === 'en' ? 1 : 2] : null
}
export function slotAskOptions(
  slots: Slots, facts: Fact[], lang: Lang, known: ProfileKnown = {},
): ChatResult['options'] | undefined {
  if (slots.status == null && !known.status) {
    const O: Record<Lang, NonNullable<ChatResult['options']>> = {
      zh: { slotKey: 'status', reason: '记下你现在的身份——通道按它挑', items: [
        { label: '学签在读', consequence: '按毕业后时间线算', sendText: '我还在读书(持学签)' },
        { label: '持工签在工作或找工', consequence: '按在加经验通道算', sendText: '我持工签在加拿大' },
        { label: '人还在境外', consequence: '按境外申请路线算', sendText: '我人还在境外' },
      ] },
      en: { slotKey: 'status', reason: 'Note your status first — pathways are picked by it', items: [
        { label: 'Studying on a study permit', consequence: 'plan on the post-graduation timeline', sendText: 'I am studying in Canada on a study permit.' },
        { label: 'Working on a work permit', consequence: 'Canadian-experience pathways apply', sendText: 'I am working in Canada on a work permit.' },
        { label: 'Still outside Canada', consequence: 'overseas routes apply', sendText: 'I am still outside Canada.' },
      ] },
      ko: { slotKey: 'status', reason: '현재 신분부터 기록하세요 · 통로가 여기서 갈립니다', items: [
        { label: '학생 비자로 재학 중', consequence: '졸업 후 일정으로 계산', sendText: '캐나다에서 학생 비자로 재학 중입니다.' },
        { label: '취업 허가로 근무 또는 구직 중', consequence: '캐나다 경력 통로로 계산', sendText: '취업 허가로 캐나다에 있습니다.' },
        { label: '아직 해외에 있음', consequence: '해외 신청 경로로 계산', sendText: '아직 캐나다 밖에 있습니다.' },
      ] },
    }
    return O[lang]
  }
  if (!slots.provs.length && !known.provs) {
    const top = facts
      .map((f) => ({ f, m: f.tool === 'lookupJobs' && f.value != null ? /^([A-Z]{2}) open postings/.exec(f.label) : null }))
      .filter((x): x is { f: Fact; m: RegExpExecArray } => !!x.m && !!provWord(x.m[1], lang))
      .sort((a, b) => (b.f.value ?? 0) - (a.f.value ?? 0))
      .slice(0, 3)
    if (top.length >= 2) {
      const REASON: Record<Lang, string> = {
        zh: '目标省定一个——门槛和清单按省答', en: 'Pick a target province — requirements and lists are answered per province',
        ko: '목표 주를 하나 정하세요 · 요건과 목록은 주별로 답합니다',
      }
      const item = (code: string, n: number): ChatOption => {
        const w = provWord(code, lang)!
        return lang === 'zh'
          ? { label: `${w}(在招 ${n} 岗)`, consequence: '按这个省接着判', sendText: `我的目标省是${w}` }
          : lang === 'en'
            ? { label: `${w} (${n} open postings)`, consequence: 'continue against this province', sendText: `My target province is ${w}.` }
            : { label: `${w}(공고 ${n}건)`, consequence: '이 주 기준으로 계속 판정', sendText: `제 목표 주는 ${w}입니다.` }
      }
      return { slotKey: 'prov', reason: REASON[lang], items: top.map((x) => item(x.m[1], x.f.value as number)) }
    }
  }
  if (slots.clb == null && !known.clb) {
    const REASON: Record<Lang, string> = {
      zh: '语言到哪档了——各省线按它比对', en: 'Note your language level — provincial lines are compared against it',
      ko: '언어 등급을 기록하세요 · 주별 기준선과 비교합니다',
    }
    const item = (n: number): ChatOption => lang === 'zh'
      ? { label: `CLB ${n}`, sendText: `我的语言成绩是 CLB ${n}` }
      : lang === 'en'
        ? { label: `CLB ${n}`, sendText: `My language level is CLB ${n}.` }
        : { label: `CLB ${n}`, sendText: `제 언어 성적은 CLB ${n}입니다.` }
    return { slotKey: 'clb', reason: REASON[lang], items: [item(5), item(6), item(7)] }
  }
  // ── 卡链延长(2026-08-09 Frank「每次都要显示四选一的问题」):三张收齐后接着收其余能点选的档案槽,
  // 每一轮答完都有下一张建档卡。sendText 全部落在 SLOT_SYSTEM 词表的档位上(edu 七档取最常见三档,
  // 其余走卡自带的自行输入;年龄/几年制/读书省是数字与省名,没法三选,不硬造档位——归反问/自行输入)
  if (slots.edu == null && !known.edu) {
    const O: Record<Lang, NonNullable<ChatResult['options']>> = {
      zh: { slotKey: 'edu', reason: '记下最高学历——联邦和多数省按它给分', items: [
        { label: '两年制大专', consequence: '按大专档计分', sendText: '我的最高学历是两年制大专' },
        { label: '本科', consequence: '按本科档计分', sendText: '我的最高学历是本科' },
        { label: '硕士或以上', consequence: '按硕博档计分', sendText: '我的最高学历是硕士' },
      ] },
      en: { slotKey: 'edu', reason: 'Note your highest education — federal and most provincial grids score it', items: [
        { label: 'Two-year college diploma', consequence: 'scored at the diploma band', sendText: 'My highest education is a two-year college diploma.' },
        { label: "Bachelor's degree", consequence: 'scored at the bachelor band', sendText: "My highest education is a bachelor's degree." },
        { label: "Master's or above", consequence: 'scored at the graduate band', sendText: "My highest education is a master's degree." },
      ] },
      ko: { slotKey: 'edu', reason: '최종 학력을 기록하세요 · 연방과 대부분 주가 점수로 반영합니다', items: [
        { label: '2년제 칼리지 디플로마', consequence: '디플로마 구간으로 계산', sendText: '최종 학력은 2년제 칼리지 디플로마입니다.' },
        { label: '학사', consequence: '학사 구간으로 계산', sendText: '최종 학력은 학사입니다.' },
        { label: '석사 이상', consequence: '석박사 구간으로 계산', sendText: '최종 학력은 석사입니다.' },
      ] },
    }
    return O[lang]
  }
  if (slots.expMonths == null && !known.expMonths) {
    const O: Record<Lang, NonNullable<ChatResult['options']>> = {
      zh: { slotKey: 'expMonths', reason: '记下工作经验——通道门槛按月数比对', items: [
        { label: '还没有工作经验', consequence: '按零经验通道算', sendText: '我还没有工作经验' },
        { label: '满一年', consequence: '按 12 个月比对门槛', sendText: '我有 12 个月工作经验' },
        { label: '满两年', consequence: '按 24 个月比对门槛', sendText: '我有 24 个月工作经验' },
      ] },
      en: { slotKey: 'expMonths', reason: 'Note your work experience — pathway thresholds compare months', items: [
        { label: 'No work experience yet', consequence: 'zero-experience pathways apply', sendText: 'I have no work experience yet.' },
        { label: 'One year', consequence: 'compared against thresholds at 12 months', sendText: 'I have 12 months of work experience.' },
        { label: 'Two years', consequence: 'compared against thresholds at 24 months', sendText: 'I have 24 months of work experience.' },
      ] },
      ko: { slotKey: 'expMonths', reason: '경력을 기록하세요 · 통로 요건은 개월 수로 비교합니다', items: [
        { label: '아직 경력 없음', consequence: '무경력 통로로 계산', sendText: '아직 경력이 없습니다.' },
        { label: '1년', consequence: '12개월 기준으로 비교', sendText: '경력이 12개월 있습니다.' },
        { label: '2년', consequence: '24개월 기준으로 비교', sendText: '경력이 24개월 있습니다.' },
      ] },
    }
    return O[lang]
  }
  if (slots.married == null && !known.married) {
    const O: Record<Lang, NonNullable<ChatResult['options']>> = {
      zh: { slotKey: 'married', reason: '记下配偶随行与否——联邦计分表按它分单双', items: [
        { label: '单身', consequence: '按单人分表算', sendText: '我单身' },
        { label: '配偶随行', consequence: '按随行分表算', sendText: '我已婚,配偶会一起申请' },
        { label: '已婚但配偶不随行', consequence: '按单人分表算', sendText: '我已婚,但配偶不随行' },
      ] },
      en: { slotKey: 'married', reason: 'Note whether a spouse comes along — federal grids split on it', items: [
        { label: 'Single', consequence: 'single grid applies', sendText: 'I am single.' },
        { label: 'Spouse coming along', consequence: 'accompanied grid applies', sendText: 'I am married and my spouse will come along on the application.' },
        { label: 'Married but spouse stays', consequence: 'single grid applies', sendText: 'I am married but my spouse is not coming along.' },
      ] },
      ko: { slotKey: 'married', reason: '배우자 동반 여부를 기록하세요 · 연방 점수표가 여기서 갈립니다', items: [
        { label: '미혼', consequence: '단독 점수표로 계산', sendText: '미혼입니다.' },
        { label: '배우자 동반', consequence: '동반 점수표로 계산', sendText: '기혼이고 배우자도 함께 신청합니다.' },
        { label: '기혼이지만 동반 안 함', consequence: '단독 점수표로 계산', sendText: '기혼이지만 배우자는 동반하지 않습니다.' },
      ] },
    }
    return O[lang]
  }
  if (slots.canadaStudy == null && !known.canadaStudy) {
    const O: Record<Lang, NonNullable<ChatResult['options']>> = {
      zh: { slotKey: 'canadaStudy', reason: '记下是否在加拿大读过书——毕业生通道按它开关', items: [
        { label: '在加拿大读过书', consequence: '毕业生通道可判', sendText: '我在加拿大读过书' },
        { label: '学历都在境外', consequence: '按境外学历通道算', sendText: '我的学历都是在境外读的' },
      ] },
      en: { slotKey: 'canadaStudy', reason: 'Note whether you studied in Canada — graduate pathways switch on it', items: [
        { label: 'Studied in Canada', consequence: 'graduate pathways can be assessed', sendText: 'I studied in Canada.' },
        { label: 'All study outside Canada', consequence: 'overseas-education pathways apply', sendText: 'All my study was outside Canada.' },
      ] },
      ko: { slotKey: 'canadaStudy', reason: '캐나다 학업 여부를 기록하세요 · 졸업생 통로가 여기서 갈립니다', items: [
        { label: '캐나다에서 공부함', consequence: '졸업생 통로 판정 가능', sendText: '캐나다에서 공부한 적이 있습니다.' },
        { label: '모두 해외에서 공부함', consequence: '해외 학력 통로로 계산', sendText: '학업은 모두 캐나다 밖에서 했습니다.' },
      ] },
    }
    return O[lang]
  }
  return undefined
}

/** lookupPermit 的真返回 → 对话 facts。rule 的数字与原句共用同一条 evidence；null 只摆原文,不补 0。 */
function federalRuleFacts(results: PermitResult[], lang: Lang): Fact[] {
  const T = LBL[lang]
  const out: Fact[] = []
  for (const r of results) {
    if (r.availability !== 'ok') {
      out.push(statusFact('lookupPermit', `${r.program} ${T.federalRule}`, r.availability, zhOnly(r.note, lang), '', lang))
      continue
    }
    for (const rule of r.rules) {
      const name = FED_FACTOR[lang][rule.factor] ?? T.federalRule
      out.push(fact('lookupPermit', `${rule.program} ${name}`, rule.value,
        rule.valueText, rule.unit, rule.evidence))
    }
    for (const gap of r.gaps) {
      const note = lang === 'zh' ? gap.note
        : lang === 'en'
          ? 'IRCC states the program-combination rule and the 3-year permit band separately, but does not connect the combined length to that band.'
          : 'IRCC는 과정 합산 규정과 3년 허가 구간을 따로 제시하지만, 합산한 기간을 그 구간에 연결하지 않습니다.'
      out.push(fact('lookupPermit', `${r.program} ${T.federalGap}`, null, note, 'rule', gap.evidence[0] ?? DERIVED))
    }
  }
  return out
}

/** lookupCrs 的真返回 → 对话 facts。两套 grid 的名字长在每一行里,不让模型把分值混加。 */
function crsFacts(results: CrsResult[], lang: Lang): Fact[] {
  const T = LBL[lang]
  const out: Fact[] = []
  for (const r of results) {
    const title = r.grid === 'FSW67' ? T.fswPoint : T.crsPoint
    if (r.availability !== 'ok') {
      out.push(statusFact('lookupCrs', title, r.availability, zhOnly(r.note, lang), '', lang))
      continue
    }
    // 口径注不带数字,但必须进 prompt:CRS 与 FSW67 绝不能相加。出处仍逐行挂在实际分值上。
    out.push(fact('lookupCrs', title, null, zhOnly(r.note, lang), 'note', DERIVED))
    for (const row of r.rows.slice(0, 16)) {
      const band = [row.factor, row.criterion, row.columnLabel].filter(Boolean).join(' — ')
      out.push(fact('lookupCrs', `${title}: ${band}`, row.points,
        row.points == null ? row.pointsText : '', 'points', row.evidence))
    }
  }
  return out
}

/**
 * 剧本(设计 §四):`expMonths === 0` 必加学徒岗计数;有 claims 必调 checkClaims。
 * 顺序即优先级 —— 超预算时从尾巴砍,砍掉的是补充信号不是主线。
 * `lang`:四态在这一层就写成用户语言的成句(AVAIL_SENTENCE),模型只照抄不翻译。
 */
export async function collectFacts(
  pool: any, slots: Slots, teerHint?: number | null, lang: Lang = 'en', onStep?: OnStep,
  opts: {
    plan?: boolean; federalPrograms?: FederalRuleProgram[]; crs?: CrsLookupArgs[]; allProvs?: boolean
    /** 路径裁决(C5c)。触发判据在 orchestrate:问的是「走哪条路」且档案槽够用 —— 纯函数判,不问模型。 */
    verdict?: boolean
  } = {},
): Promise<{ facts: Fact[]; teer: number | null; title: string }> {
  const noc = slots.noc ?? ''
  const zeroExp = slots.expMonths === 0
  const provs = slots.provs.filter((p) => p !== 'QC')
  const checkable = slots.claims.filter((c) => c.topic !== 'other')
  const S = STEP[lang]
  // 轨迹只在**这一步真的返回了**才发(挂在各自的 promise 上,不是先发再查)——铁律③。
  const tap = <T>(p: Promise<T>, text: (r: T) => string): Promise<T> =>
    (onStep ? p.then((r) => { onStep({ phase: 'tool', text: text(r) }); return r }) : p)
  const federalPs = opts.federalPrograms ?? []
  const crsQs = opts.crs ?? []
  const federalQuery = Promise.all(federalPs.map((program) => tap(lookupPermit(pool, { program }), () => S.permit(program))))
  const crsQuery = Promise.all(crsQs.map((q) => tap(lookupCrs(pool, q), () => S.crs(String(q.grid)))))

  // PGWP / CEC / FSW / FST 规则与两套联邦分表都不依赖职业。纯问这些题时没有 NOC 是正常输入,
  // 不许为了沿用省提名工具而编一个职业码,也不该把用户赶去回答无关的职业问题。
  if (!/^\d{5}$/.test(noc)) {
    const [federal, grids] = await Promise.all([federalQuery, crsQuery])
    return { facts: [...federalRuleFacts(federal, lang), ...crsFacts(grids, lang)].slice(0, MAX_FACTS), teer: null, title: '' }
  }

  const [jobs, coverage, thresholds, ee, claims, federal, grids] = await Promise.all([
    tap(lookupJobs(pool, { noc }), (r) => S.jobs(r.rows.length)),
    tap(lookupCoverage(pool, { noc }), (r) => S.coverage(r.provinces.length)),
    tap(lookupThresholds(pool, {
      // allProvs:他问的是「哪个省」→ 候选集必须是全部省(见 asksWhichProvince 上面那段实录),
      // 摆哪几个由下面的排序决定,不由抽槽那几个省决定 —— 尤其它还可能是模型编的。
      noc, teer: teerHint, provs: provs.length && !opts.allProvs ? provs : undefined,
      profile: slots.expMonths == null ? undefined : { totalExpMonths: slots.expMonths, ...(zeroExp ? { canadianExpMonths: 0 } : {}) },
    }), (r) => S.thresholds(r.provinces.map((p) => p.province).join(' ') || String(noc))),
    tap(lookupEE(pool, { noc }), () => S.ee),
    // 只要有人跟他说过话就调:**第三格「他没提的省」不依赖主张能不能核**(它算的是全九省覆盖)。
    // 原来按 checkable.length 开关 —— 一旦主张全落 'other'(收费类),第三格整个消失,
    // 而那格恰恰是这个产品的杀手锏(中介只会说他有渠道的那个省)。
    slots.claims.length
      ? tap(checkClaims(pool, { noc, teer: teerHint, claims: checkable as Claim[] }),
        (r) => S.claims(r.checked.length + r.uncheckable.length))
      : Promise.resolve(null),
    federalQuery,
    crsQuery,
  ])
  // 🔴 时间线只在**他真的问了「要多久 / 哪条快」**时才算(orchestrate 用 isPlanQuestion 判,纯函数)。
  //    没问就不算:多铺三条时间线只会把答复挤成一张表,而这一层最贵的教训就是「材料不是提纲」。
  //    哪几个省:他点过名的优先;一个省都没点时退到**官方清单收了这个职业**的省 —— 那是可证的信号,
  //    不是我们随手挑三个(PNP_PROVINCES 的前三个只是声明顺序,拿它当默认等于替他选省)。
  const planProvs = !opts.plan ? [] : (provs.length
    ? provs
    : coverage.provinces.filter((c) => c.availability === 'ok' && c.hits.some((h) => h.type !== 'ineligible')).map((c) => c.province)
  ).slice(0, 3)
  const [draws, ops, named, plan, verdict] = await Promise.all([
    Promise.all(provs.slice(0, 3).map((p) => tap(lookupDraws(pool, { prov: p, limit: 1 }), () => S.draws(p)))),
    Promise.all(provs.slice(0, 3).map((p) => tap(lookupOps(pool, { prov: p }), () => S.ops(p)))),
    // 点名过的省即使一个岗都没有也必须出现在 facts 里(C1 契约:「0 也得让他看见」)——
    // apprentice=true 会把 0 的省过滤掉,金标里「曼省 3 个,全国垫底」恰恰要的就是那个小数字。
    Promise.all(slots.provs.slice(0, 3).map((p) => lookupJobs(pool, { noc, prov: p }))),
    // 它内部会把上面那几个 lookup 再调一遍(同参 SQL 走 memoPool 的缓存,不多打一次库),
    // 换来的是**装配入参这件事只有一处**:哪张表喂给 buildPlan 的哪一段,只在 C1 里说一遍。
    planProvs.length
      ? tap(lookupPlan(pool, {
        noc, teer: teerHint, provs: planProvs,
        profile: slots.expMonths == null ? undefined : { totalExpMonths: slots.expMonths, ...(zeroExp ? { canadianExpMonths: 0 } : {}) },
      }), () => S.plan(planProvs.join(' ')))
      : Promise.resolve(null),
    // 🔴 只在他真的问了「走哪条路」时才判(orchestrate 用 isPathQuestion + 档案槽计数判,纯函数)。
    //    teer 用 lookupThresholds 查出来的那一个:通道门槛按 TEER 挑行,自己再算一次迟早两处不一致。
    opts.verdict
      ? tap(lookupVerdict(pool, verdictProfileOf(slots, thresholds.teer), { clbTarget: VERDICT_CLB_TARGET }),
        (r) => S.verdict(r.pathways.length))
      : Promise.resolve(null),
  ])

  const out: Fact[] = []
  const T = LBL[lang]
  // ①0 路径裁决。排在**最前面**是因为他问「走哪条路」时,这几条就是答案本身;
  //     facts 塞不下时是从尾巴上砍的,排在后面等于最该答的那句反而被省级清单挤掉(同 planFacts 的理由)。
  if (verdict) out.push(...verdictFacts(verdict, lang))
  // ① 在招岗位。这是零经验剧本里的第一句话「缺的不是选省,是第一份算数的岗」——
  //    所以给的必须是**这个职业真实的在招盘子**,不是它的某个子集。
  // 🔴 **材料不是提纲**:同一种数字给八个省,模型必然一省写一句(2026-08-04 生产实录:问「中介收 2 万值不值」,
  //    答复里八行省份岗位数)。零经验剧本要的是全国盘子,那时给全 10 省;其余情形
  //    只给点名省 + 前几名(追问「哪个省岗位最多」照样答得了),把「省份点名册」这条诱惑掐掉。
  //    零经验给 6 个(点名省已在最前,去重后仍在):原来是 8,配的是按学徒岗排序;排序键换成真实在招后
  //    一度改成全给 10,实测立刻撞回这条老教训 —— 模型把十个省摆成一句话,还顺手加了一句
  //    「这些省份的清单也收录了该职业」(SK 里 72310 一行都没有)。给多少材料就会被摊成多长的提纲。
  //    小省(NL 18 个岗)进不来是对的:它的价值不在岗位数,在于它有 Day 0 通道 —— 那是 pnp_requirements
  //    该说的话,不该靠把岗位榜拉长来夹带。
  const jobRows = [...named.flatMap((j) => j.rows), ...jobs.rows]
    .filter((r, i, a) => a.findIndex((x) => x.province === r.province) === i)   // 点名省在前,去重
    .slice(0, zeroExp ? 6 : 4)
  for (const r of jobRows) {
    // QC 不属 PNP:数字照给(职位板真有这些岗),但标签自带这句,免得答复把它当成一条省提名路
    const qc = r.province === 'QC' ? ` ${T.qcOutside}` : ''
    // 🔴 主数永远是**总在招**(2026-08-05 改;旧版零经验时只给 apprentice,把安省 129 说成 4):
    //    「雇主明说不要经验」是更好上手的一档,但它是子集 —— 未声明经验要求 ≠ 要经验,
    //    替雇主写一条他没写的门槛,等于把用户的机会面砍掉九成。
    out.push(fact('lookupJobs', `${r.province} ${T.openPostings} (NOC ${noc})${qc}`, r.open, '', 'jobs', r.evidence))
    // 🔴 **一行一个数**。第一版把子集写进同一条 label(`…(NOC 72310;其中不要经验的 4)` = 24),
    //    实测模型立刻串省:facts 是 MB 总 24/子集 4、BC 总 234/子集 15,它写成
    //    「曼省无经验岗位 24 个,BC 省 15 个」—— 拿 MB 的总数配 BC 的子集,两个数都在 facts 里,guard 全放行。
    //    所以子集单独成行,而且**只给他点名的省**:那几个省才是他会照着行动的,其余省多给一个数
    //    只是又一次「材料变提纲」的机会。
    if (zeroExp && r.apprentice > 0 && slots.provs.includes(r.province)) {
      out.push(fact('lookupJobs', `${r.province} ${T.apprSub} (NOC ${noc})`, r.apprentice, '', 'jobs', r.evidence))
    }
  }
  if (jobs.rows.length) out.push(fact('lookupJobs', T.indexNote, null, `${T.checked} ${jobs.checkedAt.slice(0, 10)}`, 'note', { url: '/', fetched: jobs.checkedAt }))
  // ①b 时间线(只在他问了「要多久 / 哪条快」时才有)。排在这么前面是因为**那时它就是答案**:
  //     facts 塞不下时是从尾巴上砍的,排在后面等于问一句最该答的话反而被清单挤掉。
  if (plan) out.push(...planFacts(plan, lang))
  // ①c 用户点名才查的联邦规则 / 计分档。排在主线前部,避免真问题被省级补充事实挤出 40 条上限。
  out.push(...federalRuleFacts(federal, lang), ...crsFacts(grids, lang))
  // ② 省清单命中/四态
  for (const c of coverage.provinces) {
    if (c.hits.length) {
      for (const h of c.hits.slice(0, 2)) {
        // h.label 是库里的中文显示名(「MB 在需职业」);官方原名 h.stream 本身就是英文,en/ko 有它就够了
        out.push(fact('lookupCoverage', `${c.province} ${h.type === 'ineligible' ? T.listEx : T.listIn} NOC ${noc}: ${h.stream}`, null, zhOnly(h.label, lang), 'list', h.evidence))
      }
    // exclusion = 主线按 offer/TEER 或排除清单判断,没有“这份职业清单收不收”这一问。
    // lookupCoverage 的策略说明没有逐 NOC evidence,不把它包装成一条“官方不公布”见客事实；
    // 真正可核的 offer/TEER/雇主门槛由紧接着的 lookupThresholds 提供并逐行挂官方出处。
    } else if (slots.provs.includes(c.province) && c.coverage !== 'exclusion') {
      out.push(statusFact('lookupCoverage', `${c.province} ${T.occList}`, c.availability, zhOnly(c.note, lang), c.hits[0]?.evidence.url ?? '', lang))
    }
  }
  // ③ 官方门槛(只摆被点名省的;need 是官方数,verdict 出自 rules.ts,本层不改)
  // 🔴 **材料不是提纲**(和上面岗位数同一条教训):没点名省时 lookupThresholds 会把九个省全给回来,
  //    九省 × 四行 = 三十多条门槛,模型必然一省一句地念(2026-08-05 实测 C14 英文,一句话点了九个省)。
  //    点过名的省排前,最多三个 —— 追问「别的省什么要求」照样答得了,「省份点名册」这条诱惑掐掉。
  // 🔴 `need == null` 不等于没话说:`verdict==='pass'` 且没有数字 = **官方明说这条通道不设这项门槛**
  //    (rules.ts 里 op='none' 那支)。旧的 `need != null` 把这一整类信号滤掉了,于是
  //    「0 经验去哪个省」永远得到「各省都要求经验」—— 而 NL International Graduate 的官方清单里
  //    根本没有经验这一项。**「没有门槛」和「没查到门槛」在用户那里意思相反**,不能一起丢。
  const speaks = (x: { need: number | null; verdict: string }) => x.need != null || x.verdict === 'pass'
  // 不设经验门槛的省,对 0 经验的人就是答案本身 —— 让它跟点名省一起排在前面,别被 slice(0,3) 切掉
  const waivesExp = (p: { rows: { factor: string; need: number | null; verdict: string }[] }) =>
    zeroExp && p.rows.some((x) => x.factor === 'experience' && x.need == null && x.verdict === 'pass')
  const rank = (p: (typeof thresholds.provinces)[number]) =>
    Number(slots.provs.includes(p.province)) * 2 + Number(waivesExp(p))
  const thrProvs = [...thresholds.provinces].sort((a, b) => rank(b) - rank(a)).slice(0, 3)
  for (const p of thrProvs) {
    if (p.availability !== 'ok') { out.push(statusFact('lookupThresholds', `${p.province} ${T.officialReq}`, p.availability, zhOnly(p.note, lang), '', lang)); continue }
    const streams = new Set(p.rows.filter(speaks).map((x) => x.stream).filter(Boolean))
    for (const r of p.rows.filter(speaks).slice(0, 4)) {
      // verdict/short 也是内部速记(verdict= 在泄露词表里),同样在这一层就换成人话。
      // 🔴 「未判定」且没差额 = 一个字的信息都没有,却会被模型抄成「具体未判定」这种废话
      //    (2026-08-05 实录 C13 中文答复最后半句)。没话说就别给材料 —— 少给比多写一条 RULE 管用。
      const v = r.verdict === 'unknown' && r.short == null ? '' : (T[r.verdict as 'pass' | 'fail' | 'unknown'] ?? '')
      // 同省规则若来自多条官方通道，必须把通道名写进事实。否则模型会把 EDI 雇主门槛、SWM 在职时长
      // 和职业清单语言档硬拼成一条“同时满足”的路线；每个数字虽有出处，组合起来仍是假话。
      const streamName = streams.size > 1 ? r.stream ?? '' : ''
      // 官方流名有的自带省码(「BC PNP Skills Immigration…」),再前置省码就渲成「BC BC PNP…」的结巴;
      // 词边界匹配,「BCIT」这类以省码开头的普通词不受影响。
      const head = streamName
        ? (new RegExp(`^${p.province}\\b`).test(streamName) ? streamName : `${p.province} ${streamName}`)
        : p.province
      // 🔴 「不设这项门槛」和「要求满 N」是**意思相反**的两句话,不能共用 factor 那套模板 ——
      //    套上去会写出「NL 要求申请人的工作经验满」后面跟一个空值,把这条通道最值钱的性质说反。
      //    没有对应译法的因素退回原模板(宁可少说一句,不许说反)。
      const none = r.need == null && r.verdict === 'pass' && T.factorNone[r.factor]
      if (none) { out.push(fact('lookupThresholds', `${head} ${none}`, null, '', 'rule', r.evidence)); continue }
      // 🔴 languageExempt 的值不一定是等级:ON 那行 value=3 unit=years(官方原句「毕业 3 年内免语言考试」),
      //    套 factor 模板会拼出「规定申请人可以豁免语言的等级是 3 years」—— 年限被读成 CLB 等级,意思全错。
      //    年限型整句在这儿拼好(值嵌句中,guard 收 label 里的数,账不变);等级型豁免行照旧走 factor 模板。
      if (r.factor === 'languageExempt' && /^years?$/i.test(r.unit ?? '') && r.need != null) {
        out.push(fact('lookupThresholds', `${head} ${T.exemptYears(r.need)}`, null, '', 'rule', r.evidence)); continue
      }
      // 差额跟着单位走:CAD 类差额也要 $ + 千分位(值那头 sayFact 管,这条注文只能在这儿管)
      const short = r.short == null ? '' : `,${T.short} ${/^CAD\b/i.test(r.unit ?? '') ? `$${r.short.toLocaleString('en-US')}` : r.short}`
      out.push(fact('lookupThresholds', `${head} ${T.factor[r.factor] ?? r.factor}`, r.need,
        `${v}${short}`, r.unit, r.evidence))
    }
  }
  // ④ 抽选史(最近一轮)
  for (const d of draws) {
    if (d.availability !== 'ok' || !d.rows.length) { out.push(statusFact('lookupDraws', `${d.province} ${T.draws}`, d.availability, zhOnly(d.note, lang), '', lang)); continue }
    const r = d.rows[0]
    if (r.score != null) out.push(fact('lookupDraws', `${d.province} ${T.drawCut} ${r.stream} (${r.scale}) ${r.drawDate}`, r.score, r.scale, 'points', r.evidence))
    if (r.invitations != null) out.push(fact('lookupDraws', `${d.province} ${T.drawInv} ${r.drawDate}`, r.invitations, '', 'invitations', r.evidence))
  }
  // ⑤ 运营统计(等多久 / 名额 / 池子);value=null 的抑制值原样带走,绝不折成 0
  const OPS_KEYS = ['eoi_pool_total', 'eoi_pool', 'allocation', 'remaining', 'nominations_ytd', 'processing_weeks']
  for (const o of ops) {
    if (o.availability !== 'ok') { out.push(statusFact('lookupOps', `${o.province} ${T.opsStats}`, o.availability, zhOnly(o.note, lang), o.officialUrl, lang)); continue }
    const picked = o.metrics.filter((m) => OPS_KEYS.includes(m.key)).sort((a, b) => OPS_KEYS.indexOf(a.key) - OPS_KEYS.indexOf(b.key)).slice(0, 6)
    for (const m of picked) {
      // m.key 是库里的内部指标码(eoi_pool_total…),照抄出去就是见客事故;scope 是官方原文,保留
      out.push(fact('lookupOps', `${o.province} ${T.opsKeys[m.key] ?? m.key}${m.scope ? ` — ${m.scope}` : ''}`, m.value, m.value == null ? zhOnly(m.valueText, lang) : `${m.asOf || m.period}`, m.unit, m.evidence))
    }
  }
  // ⑥ 联邦 EE(独立信号,不是省提名的一条路)
  if (ee.availability === 'ok' && ee.matched) {
    for (const r of ee.rows.slice(0, 2)) out.push(fact('lookupEE', `${T.eeCat} ${r.category} ${T.drawCut} ${r.drawDate}`, r.drawCrs, zhOnly(r.label, lang), 'CRS', r.evidence))
  } else {
    out.push(statusFact('lookupEE', T.eeAll, ee.availability, zhOnly(ee.note, lang), '', lang))
  }
  // ⑦ 第三方说法对账。私人报价/包办不是一项政府数据:所有商业话术只给一条判断,
  //    不套「官方不公布」,也不让收费与承诺各重复一遍同义空话。
  const [lead, close, dash] = CLAIM_LEAD[lang]
  const commercial = slots.claims.filter((c) => c.topic === 'private-promise' || isMoneyTalk(c.text))
  if (commercial.length) {
    out.push(fact('checkClaims', commercialClaimLabel(commercial.map((c) => c.text), lang), null, '', 'claim', { url: '/', fetched: '' }))
  }
  for (const c of slots.claims.filter((x) => x.topic === 'other' && !isMoneyTalk(x.text))) {
    out.push(fact('checkClaims', otherClaimLabel(c.text, lang), null, '', 'claim', { url: '/', fetched: '' }))
  }
  if (claims) {
    for (const c of [...claims.checked, ...claims.uncheckable]) {
      // availability='ok' 时**不往 label 里塞 why**:why 是工具层的长取证注(实测 200+ 字),
      // 塞进来会被 fact() 的 120 字截断,给用户一句断在半截的话。why 留在 valueText 给前端出处用。
      // ok = 工具层有数据可对照。why 是 C1 的长取证注(200+ 字),塞进 label 会被 120 字截成半句话,
      // 所以这里给一句自己的短话,把用户引到答复里已经摆出的官方数字上;why 照旧留在 valueText 给前端出处。
      const state = `${dash}${c.availability === 'ok' ? T.claimOk : AVAIL_SENTENCE[lang][c.availability]}`
      // 私人承诺的解释句取**本层三语字典**,不取 C1 的 why(那是中文硬编码)。判据用 C1 同一个正则,
      // 不新写词表;topic 已在 normalizeSlots 改判过,这里再核一次原话纯属保险。
      // 其余主张:C1 的 why 是中文取证注,只给中文用户,且长的(个别 note 200+ 字)不进见客文案 —— 会被截成半句话。
      // 四态成句照旧放最前 —— 它是出口校验认状态的锚点,不能被解释句顶掉。
      const sep = sepOf(lang)
      const isPromise = c.claim.topic === 'private-promise' || PRIVATE_PROMISE.test(c.claim.text || '')
      if (isPromise) continue
      const why = zhOnly(c.why, lang).trim()
      // availability='ok' 时连 why 都不要:T.claimOk 已经把「这条能拿下面的官方数字对照」说完了,
      // 再接一句 C1 的「这条能对照:上面是本站职位板索引里的在招数」就是同一句话说两遍(2026-08-05 实测)。
      const tail = isPromise ? `${sep}${PROMISE_WHY[lang]}`
        : (c.availability !== 'ok' && why && why.length <= 80 ? `${sep}${why}` : '')
      // 🔴 原话按剩余额度截(claimLabel):四态成句与解释句是我们自己的见客文案,一个字都不许被 320 帽砍掉
      out.push(fact('checkClaims', claimLabel(lead, c.claim.text, close, `${state}${tail}`), null, zhOnly(c.why, lang), 'claim',
        { url: c.claim.province ? `/?prov=${c.claim.province}` : '/', fetched: '' }))
    }
    // 他点过名的省不许进第三格:checkClaims 只认它收到的那几条主张的省份,
    // 落 'other' 的主张(「曼省有合作公司」若被判成收费类)带的省它看不见 —— 这里补齐。
    const named = new Set([...slots.provs, ...slots.claims.map((c) => c.province).filter(Boolean) as string[]])
    const unsaid = claims.unsaid.filter((u) => !named.has(u.province))
    if (unsaid.length) {
      out.push(fact('checkClaims', T.unsaid, null,
        unsaid.map((u) => u.province).join(' '), 'list', { url: '/', fetched: '' }))
    }
  }
  return { facts: out.slice(0, MAX_FACTS), teer: thresholds.teer, title: thresholds.title }
}
