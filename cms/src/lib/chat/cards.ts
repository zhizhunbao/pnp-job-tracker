// 建档点选卡(2026-08-09 Frank:「做,能让用户手点就别用手输入」)。
//
// 与 slots.ts 的分界:那边从用户的话里**抽**槽位,这边把缺的槽位**摆成可点的卡**。
import { type Claim, type CrsLookupArgs, checkClaims, lookupCoverage, lookupCrs, lookupDraws, lookupEE, lookupJobs, lookupOps, lookupPermit, lookupPlan, lookupThresholds, lookupVerdict } from './tools'
import { type Lang, STEP } from '../i18n'
import { VERDICT_CLB_TARGET, claimsFacts, coverageFacts, crsFacts, drawsFacts, eeFacts, federalRuleFacts, jobsFacts, opsFacts, planFacts, thresholdsFacts, verdictFacts, verdictProfileOf } from './facts'
import { type FederalRuleProgram } from './federal'
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

  // ①0 路径裁决 → ① 在招岗位 → ①b 时间线 → ①c 联邦规则/计分档 → ②③④⑤⑥⑦ 省级与对账。
  // 前四格排在最前是因为**他问的就是那几句**(走哪条路 / 哪儿有岗 / 要多久 / 联邦怎么算),
  // 而超预算是从尾巴砍的:排在后面等于最该答的那句反被省级清单挤掉。
  // 每一格**怎么**摆(封顶、口径、那几条红线)在 facts.ts 各自的函数里 —— 这儿只管调哪几个、摆哪一格。
  // script = 抽到的槽里会改变「怎么摆」的那几样;各渲染器只声明自己真用到的字段。
  const script = { noc, zeroExp, provs: slots.provs, claims: slots.claims }
  const out: Fact[] = [
    ...(verdict ? verdictFacts(verdict, lang) : []),
    ...jobsFacts(jobs, named, script, lang),
    ...(plan ? planFacts(plan, lang) : []),
    ...federalRuleFacts(federal, lang),
    ...crsFacts(grids, lang),
    ...coverageFacts(coverage, script, lang),
    ...thresholdsFacts(thresholds, script, lang),
    ...drawsFacts(draws, lang),
    ...opsFacts(ops, lang),
    ...eeFacts(ee, lang),
    ...claimsFacts(claims, script, lang),
  ]
  return { facts: out.slice(0, MAX_FACTS), teer: thresholds.teer, title: thresholds.title }
}
