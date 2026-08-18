/**
 * 对话编排层(C2;设计《对话即产品-20260803》§四剧本 / §八验收金标)。
 *
 * 两组:
 *  ① **纯函数组**(照旧,本文件):出口校验 guardAnswer + 槽位归一 + prompt 预算。
 *     guard 是本批最重要的一件东西 —— 它不能靠"prompt 里求模型守规矩",必须有测试证明它抓得到编造的数字。
 *  ② **活体金标(真库 + 真 LLM)已迁 tests/eval/chatGold.eval.spec.ts**(2026-08-09 对话评测批,批跑层):
 *     红 = 信号不拦 CI,由 `eval:chat` 命令跑。
 */
import { describe, expect, it } from 'vitest'

import {
  askOccupation, asksWhichProvince, claimLabel, clampAnswer, collectFacts, dropTrailingHedge, factsBlock, factSheet, fieldSearchTerm,
  commercialClaimLabel,
  findEnglishUnits, findFactCopied, findFactDump, findHedges, findForeignScript, findLeaks, findMergedStates,
  findMixedStates, findSameOpening, findShoutedWords, findUnbackedCoverage, findWordNumbers, guardAnswer, isMoneyTalk, isSelfStatement,
  LABEL_CAP, literalNoc, localizeUnits, makeSentenceGate, mergeFollowupSlots, missingClaimLines, normalizeSlots, otherClaimLabel,
  sayFact, stripMd, studyFieldOf, tidy, type Fact, type OccOption,
} from '@/lib/chatOrchestrate'
import { makeT, type Lang, LBL, MONEY_WHY, PROMISE_WHY } from '@/lib/i18n'

// 金标原话(设计《案例库-问题与结果先行-20260803》C01)
const C01 = '我亚岗昆木匠毕业,还没工作,中介说曼省有合作公司让我去曼省,要收 2 万'

// 旧英文标签词汇表:中/韩文界面里出现其中任何一个 = 有人把英文 label 漏给了用户
const INTERNAL_EN = /\b(apprentice-friendly|openings|postings|occupation list|index scope|scope note|official requirements|latest draw|invitations|operational stats|federal EE categor|provinces whose|verdict|short=|eoi_pool|processing_weeks|nominations_ytd|allocation|remaining)\b/i
// 四态成句(与 lib 的 AVAIL_SENTENCE 对齐;测试是第二双眼睛,故意在这里独立写一遍)
const AVAIL_SENTENCE_SAMPLE_ALL = {
  zh: {
    'not-published': '官方不公布这项数据(不是本站没查到)',
    'not-collected': '本站尚未收录这项数据(不是官方没有)',
    'not-applicable': '不适用:该省不走省提名这套制度',
  },
  en: {
    'not-published': 'the government does not publish this (not that we failed to find it)',
    'not-collected': 'our site has not indexed this yet (not that the government has none)',
    'not-applicable': 'not applicable: this province is outside the provincial nominee system',
  },
  ko: {
    'not-published': '정부가 공개하지 않는 항목입니다(본 사이트가 못 찾은 것이 아닙니다)',
    'not-collected': '본 사이트가 아직 수집하지 않았습니다(정부에 자료가 없다는 뜻이 아닙니다)',
    'not-applicable': '해당 없음: 이 주는 주정부 이민 제도 밖입니다',
  },
} as const
const AVAIL_SENTENCE_SAMPLE: Record<Lang, string> = {
  zh: AVAIL_SENTENCE_SAMPLE_ALL.zh['not-published'],
  en: AVAIL_SENTENCE_SAMPLE_ALL.en['not-published'],
  ko: AVAIL_SENTENCE_SAMPLE_ALL.ko['not-published'],
}
// 两条状态不同的主张(兜底清单里也得各说各的)
const CLAIM_LEAD: Record<Lang, string> = {
  zh: '有人跟你说「要收 2 万」——', en: 'You were told "they charge 20k" — ', ko: '「2만을 받는다」라고 들으셨습니다 — ',
}
const CLAIM_LEAD2: Record<Lang, string> = {
  zh: '有人跟你说「曼省有合作公司」——', en: 'You were told "there is a partner company in MB" — ', ko: '「MB에 협력 회사가 있다」라고 들으셨습니다 — ',
}

const f = (over: Partial<Fact>): Fact => ({
  tool: 'lookupJobs', label: 'MB apprentice-friendly openings for NOC 72310', value: 3, valueText: '', unit: 'jobs',
  evidence: { url: '/?prov=MB&q=72310', fetched: '2026-08-04' }, ...over,
})

// ── ① 纯函数:出口校验 ────────────────────────────────────────────────────
describe('guardAnswer(出口校验)', () => {
  const facts = [
    f({}),
    f({ tool: 'lookupOps', label: 'AB eoi_pool — Alberta Opportunity Stream', value: 23056, unit: 'people', evidence: { url: 'https://www.alberta.ca/aaip-processing-information', fetched: '2026-08-04' } }),
    f({ tool: 'lookupThresholds', label: 'MB requirement experience (applicant)', value: 12, valueText: 'verdict=fail short=12', unit: 'months', evidence: { url: 'https://immigratemanitoba.com/x', fetched: '2026-08-01' } }),
  ]

  it('facts 里的数字放行(含千分位逗号这类格式变体)', () => {
    expect(guardAnswer('曼省只有 3 个带训岗;阿省池子里压着 23,056 人。', facts).ok).toBe(true)
    expect(guardAnswer('Alberta has 23056 people in the pool as of 2026-08-04.', facts).ok).toBe(true)
  })

  it('🔴 编造的数字必须抓得到(这条是本批的立身之本)', () => {
    // 三种典型编法:凭空的岗位数、自己算的百分比、自己加的总数
    const g = guardAnswer('全国有 77 个带训岗,曼省 3 个;被捞概率约 3.6%,萨省名额还剩 812 个。', facts)
    expect(g.ok).toBe(false)
    expect(g.bad).toContain('77')
    expect(g.bad).toContain('3.6')
    expect(g.bad).toContain('812')
    expect(g.bad).not.toContain('3')            // 3 是 facts 里的真数,不该被误伤
  })

  it('白名单只有两项:行首列表序号、用户自己说过的数字', () => {
    // ① 行首序号是排版不是主张 —— 位置可判定
    expect(guardAnswer('1. 先找带训岗\n2. 攒满经验', facts).ok).toBe(true)
    // 同一个数字写在句子中间就不再是序号,照抓(白名单不是"小数字放行")
    expect(guardAnswer('这个职业全国只有 2 家雇主。', facts).ok).toBe(false)
    // ② 复述用户自己写的数字不算编造
    expect(guardAnswer('中介要收的 2 万不是官方费用。', facts).ok).toBe(false)
    expect(guardAnswer('中介要收的 2 万不是官方费用。', facts, C01).ok).toBe(true)
  })

  it('单位换算只认「月 ↔ 年整除」这一种同义写法', () => {
    expect(guardAnswer('曼省要求同一雇主连续满 1 年。', facts).ok).toBe(true)   // 12 months = 1 year
    expect(guardAnswer('曼省要求同一雇主连续满 2 年。', facts).ok).toBe(false)
  })

  it('facts 为空时,任何数字都不许出现', () => {
    expect(guardAnswer('曼省有 3 个岗。', []).ok).toBe(false)
    expect(guardAnswer('你现在缺的是第一份算数的工作。', []).ok).toBe(true)
  })
})

// ── ①' 纯函数:见客三道检查(内部码 / 英文速记 / 推断性措辞)+ 长度收口 ──────
// 🔴 「哪个省…」必须全省查(chat_logs id=17 实录:用户一个省名都没提,抽槽把 BC 编了进去,
//    于是门槛只查了 BC 一个省,答复写出「各省省提名均要求工作经验」—— 只看一个省下的全称判断)。
//    判据只读用户原话,不看模型猜的槽位(同 federalRulePrograms 那条既定原则)。
describe('「哪个省」这类问题要全省查', () => {
  it('三语的问法都认得出来', () => {
    for (const q of ['哪个省的省提名不要求工作经验?', '哪些省收我这个职业?', '我该选哪一个省?',
      '哪几个省对木匠最松', 'which province should I pick?', 'What provinces list my occupation?',
      '어느 주가 좋을까요?']) {
      expect(asksWhichProvince(q), q).toBe(true)
    }
  })

  it('点名了具体省份的问句不算(那种就该只查他问的省)', () => {
    for (const q of ['曼省对木匠的要求是什么?', 'What does Manitoba require?', '我在安省,毕业后能留下吗?',
      '省提名要多久?', '中介说包省提名可信吗?']) {
      expect(asksWhichProvince(q), q).toBe(false)
    }
  })
})

// 🔴 「某省清单收了这个职业」是**资格前提**,说错了后面每个数字都在答另一个人的问题;
//    而它是纯文字断言,guardAnswer(只查数字)和 findMergedStates(只查四态)两道都不管。
//    下面的正反例全部来自 chat_logs 的真实答复(2026-08-05 那 6 条),不是编的:
//    第一版判据在这 6 条上是 1 真 3 假,三条假的形态都留在这儿当护栏。
describe('清单主张必须有 coverage fact 撑腰', () => {
  const cov = (prov: string): Fact => ({
    tool: 'lookupCoverage', label: `${prov} 的官方职业清单收了 NOC 72310: MPNP In-Demand`,
    value: null, valueText: '', unit: 'list', evidence: { url: 'https://x', fetched: '2026-08-05' },
  })
  const other: Fact = {
    tool: 'lookupThresholds', label: 'SK 要求申请人的工作经验满', value: 12, valueText: '', unit: 'months',
    evidence: { url: 'https://y', fetched: '2026-08-05' },
  }

  it('🔴 真实事故:facts 里 SK 一条 coverage 都没有,答复却说「萨省清单收录该职业」', () => {
    const answer = '- 曼省清单收录该职业,技工通道需 6 个月工作经验\n- 萨省清单收录该职业,要求 12 个月工作经验'
    expect(findUnbackedCoverage(answer, [cov('MB'), other], 'zh').join(' ')).toContain('SK')
  })

  it('有 coverage fact 的省照过,不误伤', () => {
    const answer = '曼省 MPNP In-Demand Occupations List 收录了木匠职业。'
    expect(findUnbackedCoverage(answer, [cov('MB')], 'zh')).toEqual([])
  })

  it('🔴 否定句不是主张:「本站未收录 NS 是否发布额外官方清单」不许算', () => {
    const answer = '本站未收录新斯科舍省是否发布额外官方清单的信息。'
    expect(findUnbackedCoverage(answer, [cov('MB')], 'zh')).toEqual([])
  })

  it('🔴 「本站尚未收录…对比数据」也是否定句', () => {
    const answer = '本站尚未收录关于曼省和萨省移民难易度的对比数据。'
    expect(findUnbackedCoverage(answer, [cov('MB')], 'zh')).toEqual([])
  })

  it('🔴 英文要按句点断句:「1 in BC. The list of provinces…」不是在说 BC 的清单', () => {
    const answer = 'the apprentice-friendly opening counts are 1 in ON and 1 in BC. '
      + 'The list of provinces covering this role is settled by checking their official tech pathways.'
    expect(findUnbackedCoverage(answer, [cov('AB')], 'en')).toEqual([])
  })

  it('隔壁子句的省不被清单词牵连', () => {
    expect(findUnbackedCoverage('BC 有 234 个岗位,比曼省多;BC 清单收录该职业。', [cov('BC')], 'zh')).toEqual([])
  })
})

describe('答复见客检查(不连模型)', () => {
  // 一段"四条毛病齐活"的假答复:内部码 + 英文单位 + 推断性措辞
  const DIRTY = 'MB 要求 THE EMPLOYER 已经营满 3 years,BC: 15 jobs。'
    + '这条是 NOT-PUBLISHED,那条 NOT-COLLECTED;另见 INDEX SCOPE 说明与 evidence。'
    + '木匠通常要求法语能力,竞争激烈,建议尽快决定。'

  it('内部状态码与字段名一律抓得到(枚举值是我们的,不是人话)', () => {
    const leaks = findLeaks(DIRTY)
    expect(leaks).toEqual(expect.arrayContaining(['NOT-PUBLISHED', 'NOT-COLLECTED', 'evidence']))
    expect(leaks.some((x) => /index\s+scope/i.test(x))).toBe(true)
    // 说的是同一个意思、没有代码 —— 必须放行(语义要留、代码要走)
    expect(findLeaks('这个数字官方不公布;那个本站还没收录,不是没有。')).toEqual([])
  })

  it('中文答复里的英文单位:数字后面的就地换掉,裸着的速记报出来', () => {
    expect(localizeUnits('BC: 15 jobs,雇主要经营满 3 years。', 'zh')).toBe('BC: 15 个岗位,雇主要经营满 3 年。')
    expect(findEnglishUnits(DIRTY, 'zh')).toEqual([])                 // 都是「数字+单位」,机械修得掉
    expect(findEnglishUnits('MB latest draw cutoff 是 632 分。', 'zh'))
      .toEqual(expect.arrayContaining(['cutoff']))                     // 裸着的速记 = 整句抄了 FACTS
    expect(findEnglishUnits('BC has 15 jobs and the employer needs 3 years.', 'en')).toEqual([])   // 英文答复不查这条
    // 🔴 官方清单名照留(判据是「它在 facts 里出现过」,不是词表):Vacancies 撞过单位词表,把一段好答复顶成了兜底
    const nsFact = f({ tool: 'lookupCoverage', unit: 'list', value: null, label: 'NS 职业清单收录了 NOC 72310: Nova Scotia Critical Vacancies' })
    expect(findEnglishUnits('NS 清单收录了这个职业:Nova Scotia Critical Vacancies。', 'zh', [nsFact])).toEqual([])
    // 没在 facts 里出现过的英文速记 = 没有豁免(cutoff 不是单位词,机械替换救不了它,只能重写)
    expect(findEnglishUnits('这个职业的 cutoff 很高。', 'zh', [nsFact])).toEqual(['cutoff'])
    expect(localizeUnits('The employer needs 3 years.', 'en')).toBe('The employer needs 3 years.')
  })

  // 🔴 guard 按阿拉伯数字比对,中文数字是它的盲区:「曼省有三份」换成「八份」它也看不出来
  it('中文数字写的数量要抓出来(guard 的盲区,不然编的数字绕过去了)', () => {
    expect(findWordNumbers('你缺的是第一份工作,曼省有三份,BC 有十五份。', 'zh'))
      .toEqual(expect.arrayContaining(['三份', '十五份']))
    expect(findWordNumbers('你缺的是第一份工作。', 'zh')).toEqual([])          // 序数是 RULE 2 要的,不算
    // 「一 / 两」是冠词和约数,不是数量 —— 收了就天天误杀(剧本第一句就带「一份算数的工作」)
    expect(findWordNumbers('你缺的是一份算数的工作,两三个省都可以。', 'zh')).toEqual([])
    expect(findWordNumbers('每三个月开一轮。', 'zh')).toEqual([])              // 「每三个月」是频率不是数量
    expect(findWordNumbers('曼省有 3 个岗位,雇主经营满 3 年。', 'zh')).toEqual([])  // 阿拉伯数字 = guard 管得着
    expect(findWordNumbers('中介要收的两万不是官方费用。', 'zh')).toEqual([])   // 钱数是用户自己说的,不收
    expect(findWordNumbers('MB has three openings.', 'en')).toEqual([])
  })

  it('中文数字有同单位事实或用户历史作证时放行，不能跨单位借数', () => {
    const facts: Fact[] = [{
      tool: 'lookupPermit', label: 'PGWP 工签长度', value: 36, valueText: '', unit: 'months',
      evidence: { url: 'https://canada.ca/pgwp', fetched: '2026-08-10' },
    }]
    const echo = '两个 1 年课程能不能换 3 年 PGWP'
    expect(findWordNumbers('满三年可获三十六个月工签。', 'zh', facts, echo)).toEqual([])
    expect(findWordNumbers('曼省有三份岗位。', 'zh', facts, echo)).toEqual(['三份'])
  })

  it('推断性措辞留痕(只报警不拦,免得误杀正常表述)', () => {
    expect(findHedges(DIRTY, 'zh')).toEqual(expect.arrayContaining(['通常', '竞争激烈', '建议尽快']))
    expect(findHedges('曼省官方清单收了这个职业,学徒岗 3 个。', 'zh')).toEqual([])
    expect(findHedges('This stream is highly competitive and we recommend acting fast.', 'en'))
      .toEqual(expect.arrayContaining(['highly competitive', 'we recommend']))
  })

  // 🔴 「官方不公布」≠「本站还没收录」——这套系统的立身之本,合并就是撒谎
  it('两条状态不同的主张被揉成一句 → 抓得到(吞掉 / 揉句两种)', () => {
    // label 就是一句能照抄的成品(数据层写好,模型不翻译)
    const claimFacts = [
      f({ tool: 'checkClaims', value: null, unit: 'claim', valueText: '', label: '别人跟他说的:「要收 2 万」→ 本站尚未收录这项数据(不是官方没有)' }),
      f({ tool: 'checkClaims', value: null, unit: 'claim', valueText: '', label: '别人跟他说的:「中介说曼省有合作公司让我去曼省」→ 官方不公布这项数据(不是本站没查到)' }),
    ]
    // 实录回归原话:两件事一句话带过,只剩「未收集」一种说法
    const merged = '关于中介收取 2 万费用及所谓合作公司的说法,本站未收集此类数据。'
    const w = findMergedStates(merged, claimFacts, 'zh')
    expect(w).toContain('swallowed:not-published')                    // ⓐ「官方不公布」被吞了
    expect(w.some((x) => x.startsWith('merged:'))).toBe(true)         // ⓑ 一句盖了两条状态不同的主张
    // 分开说、各用各的说法 = 干净
    expect(findMergedStates('中介收 2 万这种收费,本站尚未收录。至于所谓合作公司名单,官方不公布这类信息。', claimFacts, 'zh')).toEqual([])
    // 只有一种状态时不啰嗦(没有可混的对象)
    expect(findMergedStates(merged, [claimFacts[0]], 'zh')).toEqual([])
  })

  it('结尾那句劝告砍掉,带数字的句子一律不动(砍不掉有出处的事实)', () => {
    const facts = '曼省学徒岗 3 个,BC 有 15 个。曼省官方在需职业清单收了木匠这个职业。最近一轮分数线 632 分,发了 74 个邀请。'
    const r = dropTrailingHedge(`${facts}建议直接去核实,勿轻信中介承诺。`, 'zh')
    expect(r.text).toBe(facts)
    expect(r.dropped).toEqual(['建议直接去核实,勿轻信中介承诺。'])
    // 带数字 = 可能带事实 → 一个字都不许动
    expect(dropTrailingHedge(`${facts}建议看那 632 分的分数线。`, 'zh').dropped).toEqual([])
    // 正常事实结尾照旧不动
    expect(dropTrailingHedge(facts, 'zh').dropped).toEqual([])
    // 全篇就一句劝告时也不砍(砍到只剩个开头,不如留着让人看见毛病)
    expect(dropTrailingHedge('建议尽快决定。', 'zh').dropped).toEqual([])
  })

  it('长度按句截断:宁可少说一句,不许留半句', () => {
    const long = '第一句话在这里。'.repeat(20)                          // 160 字
    const cut = clampAnswer(long, 'zh', 50)
    expect(cut.length).toBeLessThanOrEqual(50)
    expect(cut.endsWith('。')).toBe(true)
    expect(clampAnswer('短句子。', 'zh', 600)).toBe('短句子。')
    // 小数点不是句末:3.6 不许被劈成两截
    expect(clampAnswer('概率 3.6 个点。后面这句砍掉。', 'zh', 12)).toBe('概率 3.6 个点。')
  })

  it('降级清单也是见客文案:内部码换人话、单位换用户语言', () => {
    const sheet = factSheet([f({ label: 'MB occupation list', valueText: 'NOT-PUBLISHED (the government does not publish this)', value: null })], 'zh')
    expect(findLeaks(sheet)).toEqual([])
    expect(sheet).toContain('官方不公布')
    expect(factSheet([f({})], 'zh')).toContain('3 个岗位')
  })

  // 🔴 降级路径 = 我们自己写的字。模型偶尔违规还能拦,兜底泄露是自己漏的。
  // 连模型的测试只能测「这一次」(实测同一道题换三个指纹:v1 红 v2 绿 v3 绿),所以这条**不连模型**。
  it('降级清单三语都见客:没有英文内部标签、没有内部码', () => {
    // 按 collectFacts 的拼法造一份 facts(标签词汇全取自同一张 LBL 表)
    const sheetFacts = (lang: Lang): Fact[] => {
      const T = LBL[lang]
      const ev = { url: 'https://immigratemanitoba.com/x', fetched: '2026-08-04' }
      const mk = (tool: string, label: string, value: number | null, valueText: string, unit: string): Fact =>
        ({ tool, label, value, valueText, unit, evidence: ev })
      return [
        mk('lookupJobs', `MB ${T.apprOpenings} (NOC 72310)`, 3, '', 'jobs'),
        mk('lookupJobs', `QC ${T.openPostings} (NOC 72310) ${T.qcOutside}`, 5, '', 'jobs'),
        mk('lookupJobs', T.indexNote, null, `${T.checked} 2026-08-04`, 'note'),
        mk('lookupCoverage', `MB ${T.listIn} NOC 72310: MPNP In-Demand Occupations List`, null, lang === 'zh' ? 'MB 在需职业' : '', 'list'),
        mk('lookupCoverage', `NB ${T.occList}`, null, AVAIL_SENTENCE_SAMPLE[lang], 'status'),
        // 门槛行的 label 是**半句话**,值接上去就是一句(prompt 与兜底清单共用 sayFact)
        mk('lookupThresholds', `MB ${T.factor.empYears}`, 3, '', 'years'),
        mk('lookupThresholds', `MB ${T.factor.experience}`, 12, `${T.fail},${T.short} 12`, 'months'),
        mk('lookupDraws', `MB ${T.drawCut} Skilled Worker Stream (MPNP EOI) 2026-07-30`, 632, 'MPNP EOI', 'points'),
        mk('lookupDraws', `MB ${T.drawInv} 2026-07-30`, 74, '', 'invitations'),
        mk('lookupOps', `AB ${T.opsKeys.eoi_pool_total}`, 23056, '2026-08-04', 'people'),
        // 库里的单位我们枚举不全(实测漏过 nominations),认不出的一律不印,别把英文丢给用户
        mk('lookupOps', `MB ${T.opsKeys.nominations_ytd}`, 2673, '2026-08-04', 'nominations'),
        mk('lookupOps', `MB ${T.opsKeys.allocation}`, 6239, '2026', 'certificates-of-nomination'),
        mk('lookupEE', `${T.eeCat} trade ${T.drawCut} 2026-04-02`, 477, 'trade', 'CRS'),
        mk('checkClaims', `${CLAIM_LEAD[lang]}${AVAIL_SENTENCE_SAMPLE_ALL[lang]['not-collected']}`, null, '', 'claim'),
        mk('checkClaims', `${CLAIM_LEAD2[lang]}${AVAIL_SENTENCE_SAMPLE_ALL[lang]['not-published']}${lang === 'en' ? '. ' : '。'}${PROMISE_WHY[lang]}`, null, '', 'claim'),
        mk('checkClaims', T.unsaid, null, 'BC NS', 'list'),
      ]
    }
    for (const lang of ['zh', 'en', 'ko'] as const) {
      const sheet = factSheet(sheetFacts(lang), lang)
      expect(findLeaks(sheet), `${lang} 兜底泄露内部码:\n${sheet}`).toEqual([])
      expect(findEnglishUnits(sheet, lang, sheetFacts(lang)), `${lang} 兜底裸着英文速记:\n${sheet}`).toEqual([])
      // 官方专名(MPNP In-Demand Occupations List / Skilled Worker Stream)准许留英文,内部标签一个都不许留
      if (lang !== 'en') expect(sheet, `${lang} 兜底里还有英文内部标签:\n${sheet}`).not.toMatch(INTERNAL_EN)
      // 兜底也走正常答复的同一道出口:数量不许写成中文数字、两条主张不许共用一个说法、不许有推断性措辞
      expect(findWordNumbers(sheet, lang), `${lang} 兜底把数量写成了中文数字:\n${sheet}`).toEqual([])
      expect(findForeignScript(sheet, lang), `${lang} 兜底里掺了别的语言:\n${sheet}`).toEqual([])
      expect(findMergedStates(sheet, sheetFacts(lang), lang), `${lang} 兜底把两条状态揉在一起了:\n${sheet}`).toEqual([])
      expect(findHedges(sheet, lang), `${lang} 兜底里有推断性措辞:\n${sheet}`).toEqual([])
    }
  })

  // ── 🔴 可读性(2026-08-05 Frank 实测挂件:「这个现在根本不可读」)────────────────────
  it('markdown 记号一个都不许见客(C1 的 note 里带着 **,它进 prompt / 兜底清单 / 出处表)', () => {
    // chatTools.ts 的原句(ON coverage note),生产实录里原样显示给了用户
    const raw = 'ON 官方**不公布**职业清单(2026-06 改制后排除集为空)'
    expect(stripMd(raw)).toBe('ON 官方不公布职业清单(2026-06 改制后排除集为空)')
    expect(stripMd('# 小标题\n`code`\n* 项目')).toBe('小标题\ncode\n- 项目')
    // 模型那头也走同一份词表(tidy 复用 stripMd,两处别各写各的)
    expect(tidy('**加粗**与 `等宽`')).toBe('加粗与 等宽')
    // 剥的是记号不是数字:guard 的账一分不能变
    expect(stripMd('**3** 个岗位')).toBe('3 个岗位')
  })

  // ── 🔴 允许的两样 / 禁掉的四样(2026-08-06,RULE 5 松绑)────────────────────────
  //
  // 前端 ChatText(3ebe64c)只认**空行分段**与**行首 `- `**。所以出口这道清洗的判据只有一条:
  // **渲染得出来的留着,渲染不出来的剥掉**。留错一样 = 裸记号见客;剥错一样 = 渲染器白装(那正是
  // 「格式乱」的病根 —— 提示词禁掉列表 + 出口全剥,答复只能是一坨长文)。两个方向都得有测试。
  it('🔴 允许的两样活着出去:行首 `- ` 与空行分段,tidy 不许顺手吃掉', () => {
    const listed = '曼省清单收了这个职业。\n\n- 雇主要经营满 3 年\n- 语言要到 CLB 5\n- 经验要满 12 个月\n\n中介那句话谁也核不了。'
    expect(tidy(listed), 'tidy 把列表记号或分段吃掉了').toBe(listed)
    // 空行只压不删:三个以上空行压成一个(排版),一个空行原样留着(那是分段)
    expect(tidy('第一段。\n\n\n\n第二段。')).toBe('第一段。\n\n第二段。')
    // 别家的项目符号归一成我们这一种(渲染器只认 `- `),不是剥掉
    expect(tidy('* 星号项\n+ 加号项\n• 圆点项')).toBe('- 星号项\n- 加号项\n- 圆点项')
    // 编号列表 → 项目符号:渲染器不认 `1.`,而行首序号又撞 guard 的白名单(按位置放行,不查 facts)
    expect(tidy('1. 第一件\n2) 第二件')).toBe('- 第一件\n- 第二件')
    expect(guardAnswer(tidy('1. 先找带训岗\n2. 攒满经验'), []).ok, '归一后行首序号不该再留在正文里').toBe(true)
    // 剥的是记号不是内容:数字与字一个不少(guard 的账不能因为排版变)
    expect(tidy('- **3** 个岗位')).toBe('- 3 个岗位')
    // 🔴 第一条项目粘在上一句后面(实测中文 C01 原样):句末标点后紧跟 `- ` 一律补换行,
    //    否则渲染器只认得后两条,同一份清单被劈成两半
    expect(tidy('你缺的是第一段算数的工作。- MB 有 3 个岗\n- SK 有 6 个岗'))
      .toBe('你缺的是第一段算数的工作。\n- MB 有 3 个岗\n- SK 有 6 个岗')
    expect(tidy('You can check these yourself: - BC asks for 24 months'))
      .toBe('You can check these yourself:\n- BC asks for 24 months')
    // 但句子中间的连字符不是项目符号(减号、区间、复合词一个都不许被劈成列表)
    expect(tidy('这份工作 3 - 5 年经验都收。')).toBe('这份工作 3 - 5 年经验都收。')
    expect(tidy('BC requires 5 CLB - not 4.')).toBe('BC requires 5 CLB - not 4.')
    // 🔴 出口那道砍劝告的工序也不许顺手改排版(实测 C01:模型交回来的空行是对的,是我们自己拼没了)
    const paged = '你缺的是第一段算数的工作。\n\n- MB 有 3 个岗\n- SK 有 6 个岗\n\n曼省要求语言到 5 CLB。'
    expect(dropTrailingHedge(paged, 'zh').text, '砍劝告那一步把空行吃掉了').toBe(paged)
  })

  it('🔴 禁掉的四样若出现,现有检查抓得到(标题 / 加粗 / 表格 / 编号)', () => {
    // ① 标题、② 加粗:tidy 原地剥掉记号,一个都到不了读者眼前
    expect(tidy('## 小标题\n正文**加粗**在此')).toBe('小标题\n正文加粗在此')
    expect(tidy('答复里不该有 `等宽`')).toBe('答复里不该有 等宽')
    // ③ 表格:表格的内容按定义就是逐行抄 FACTS —— findFactDump 的 ⓐ(`=`)和 ⓑ(≥3 条 label 被逐字抄)
    const T = LBL.zh
    const tf: Fact[] = [
      f({ tool: 'lookupJobs', label: `MB ${T.apprOpenings} (NOC 72310)`, value: 3, unit: 'jobs', valueText: '' }),
      f({ tool: 'lookupJobs', label: `BC ${T.apprOpenings} (NOC 72310)`, value: 20, unit: 'jobs', valueText: '' }),
      f({ tool: 'lookupJobs', label: `SK ${T.apprOpenings} (NOC 72310)`, value: 13, unit: 'jobs', valueText: '' }),
    ]
    const table = `| 项目 | 值 |\n| ${tf[0].label} | 3 |\n| ${tf[1].label} | 20 |\n| ${tf[2].label} | 13 |`
    expect(findFactDump(table, tf).length, `逐行抄 FACTS 的表格没抓到:\n${table}`).toBeGreaterThan(0)
    expect(findFactDump('MB 要求申请人的语言达到 = 5 CLB', tf).length, '`=` 那个形状没抓到').toBeGreaterThan(0)
    // 🔴 但门槛行不算「抄」:它的 label 是**半句话**,值接上去就是一句人话,照着说正是我们要的形状
    //    (实测 C07 英文:四条 BC 门槛落进 bucket A 列表,老判据一判三中,把一稿好答复顶了回去)
    const thr: Fact[] = [
      f({ tool: 'lookupThresholds', label: `BC ${LBL.en.factor.experience}`, value: 24, unit: 'months', valueText: '' }),
      f({ tool: 'lookupThresholds', label: `BC ${LBL.en.factor.empYears}`, value: 1, unit: 'years', valueText: '' }),
      f({ tool: 'lookupThresholds', label: `BC ${LBL.en.factor.empStaff}`, value: 5, unit: 'people', valueText: '' }),
    ]
    const bucketA = `Here is what you can check.\n\n- ${thr[0].label} 24 months\n- ${thr[1].label} 1 year\n- ${thr[2].label} 5 staff`
    expect(findFactDump(bucketA, thr), `门槛行落进列表被误判成「在背清单」:\n${bucketA}`).toEqual([])
    // ④ 编号列表:归一成项目符号(见上一条)—— 行首序号不再有绕过 guard 的机会
    expect(tidy('1. MB 有 3 个岗')).toBe('- MB 有 3 个岗')
  })

  // 🔴 列表项天然句式相近,那正是列表的用处 —— 收窄检查,不放弃列表
  it('句式雷同这道检查不误伤列表:项目符号不算「在念表格」,散文照旧抓', () => {
    // bucket A 按 RULE 0b 就该围着问题里那个省写 → 三条项目全以省名起头,老判据会一判三中
    const listed = '曼省的官方清单收了木匠。\n\n- MB 要求雇主已经营满 3 年\n- MB 要求申请人的语言达到 5 CLB\n- MB 要求申请人的工作经验满 12 个月\n\n中介那句话谁也核不了。'
    expect(findSameOpening(listed, 'zh'), `列表被误判成「在念表格」:\n${listed}`).toEqual([])
    const enListed = 'Manitoba does list carpenters.\n\n- MB asks the employer for 3 years\n- MB asks you for 5 CLB\n- MB asks for 12 months of experience\n\nNobody can check what the agent promised.'
    expect(findSameOpening(enListed, 'en'), `英文列表被误判:\n${enListed}`).toEqual([])
    // 同样三句话,写成散文就还是「在念表格」—— 这道红线一个字没松
    expect(findSameOpening('MB 要求雇主已经营满 3 年。MB 要求申请人的语言达到 5 CLB。MB 要求申请人的工作经验满 12 个月。', 'zh').length)
      .toBeGreaterThan(0)
    // 隔着一份清单的两句不叫「连着」:列表把连号打断
    expect(findSameOpening('MB 要求雇主已经营满 3 年。\n- 一条项目\n- 两条项目\nMB 要求申请人的语言达到 5 CLB。MB 要求经验满 12 个月。', 'zh')).toEqual([])
  })

  it('长度上限按「行」收:项目符号一条算一行,超了照样截(不给「一省一行」开后门)', () => {
    // 1 句答题 + 4 行清单 + 2 条主张 + 1 句收口 = 8 行,现在的口径下不许被截掉
    const eight = ['这份工作曼省的清单收了。', '- 雇主经营满 3 年', '- 语言到 CLB 5', '- 经验满 12 个月', '- 岗位 3 个',
      '中介说的合作公司谁也核不了。', '要收 2 万这条官方不公布。', '公司开了几年问雇主就知道。'].join('\n')
    expect(clampAnswer(eight, 'zh'), `八行的正常答复被截了:\n${clampAnswer(eight, 'zh')}`).toBe(eight)
    // 一省一行摞十四条 = 老毛病换了张脸,照截
    const dump = Array.from({ length: 14 }, (_, i) => `- 第 ${i} 个省有岗位`).join('\n')
    expect(clampAnswer(dump, 'zh').split('\n').filter((l) => l.trim()).length).toBeLessThanOrEqual(11)
  })

  it('降级清单排得能读:说明是人话、主张排最前、四态行不拖着长注、管道注不进清单', () => {
    const ev = { url: 'https://immigratemanitoba.com/x', fetched: '2026-08-04' }
    const facts: Fact[] = [
      { tool: 'lookupJobs', label: LBL.zh.indexNote, value: null, valueText: '查询时间 2026-08-04', unit: 'note', evidence: ev },
      { tool: 'lookupThresholds', label: `MB ${LBL.zh.factor.empYears}`, value: 3, valueText: '', unit: 'years', evidence: ev },
      {
        tool: 'lookupCoverage', label: `NB ${LBL.zh.occList}`, value: null, unit: 'status', evidence: ev,
        valueText: `${AVAIL_SENTENCE_SAMPLE.zh} — 这里是 C1 的两百字取证注(注里还套着括号),见客清单不该拖着它`,
      },
      { tool: 'checkClaims', label: `${CLAIM_LEAD.zh}${AVAIL_SENTENCE_SAMPLE.zh}`, value: null, valueText: '', unit: 'claim', evidence: ev },
    ]
    const sheet = factSheet(facts, 'zh')
    const lines = sheet.split('\n')
    // ① 开场白只说与他有关的那一半,不讲我们的 guard 叫什么(实录原话「模型这次没能守住…这条线」)
    expect(lines[0]).not.toMatch(/模型|守住|校验|guard/i)
    expect(lines[0]).toContain('出处')
    // ② 别人跟他说的话排最前 —— 他就是为这个来的(存储序里它排最后)
    expect(lines[1]).toContain(CLAIM_LEAD.zh)
    // ③ 四态行留状态那半句、砍掉后面的取证注;④ 索引口径注整条不进
    expect(sheet).toContain(AVAIL_SENTENCE_SAMPLE.zh)
    expect(sheet).not.toContain('两百字取证注')
    expect(sheet).not.toContain(LBL.zh.indexNote)
    // 条数封顶:再多没人读得完
    expect(factSheet(Array.from({ length: 30 }, () => f({})), 'zh').split('\n').length).toBeLessThanOrEqual(15)
  })

  // ── 🔴 喂给模型的形状:给它表格它就还你表格(2026-08-05,Frank「这回答不像人话」)──────
  it('FACTS 里一个 `=` 都不许有,门槛行读出来就是一句话', () => {
    const T = LBL.zh
    const facts: Fact[] = [
      f({ label: `MB ${T.apprOpenings} (NOC 72310)`, value: 3, unit: 'jobs', valueText: '' }),
      f({ tool: 'lookupThresholds', label: `NS ${T.factor.language}`, value: 5, unit: 'CLB', valueText: '' }),
      f({ tool: 'lookupThresholds', label: `NS ${T.factor.empYears}`, value: 2, unit: 'years', valueText: '' }),
      f({ tool: 'lookupCoverage', label: `NS ${T.occList}`, value: null, unit: 'status', valueText: AVAIL_SENTENCE_SAMPLE.zh }),
    ]
    const block = factsBlock(facts, 4000, 'zh')
    // ① `=` 是表格的形状,prompt 里彻底没有(出口的 findFactDump 也认这个字符)
    expect(block, `FACTS 里还留着 = :\n${block}`).not.toContain('=')
    expect(factSheet(facts, 'zh'), '兜底清单里还留着 =').not.toContain('=')
    // ② 门槛行:label 是半句话,值接上去就是整句(不是「字段名 = 值」);CLB 分制名在前(「6 CLB」是病句,2026-08-06 §4.5)
    expect(sayFact(facts[1], 'zh')).toBe('NS 要求申请人的语言达到 CLB 5')
    expect(sayFact(facts[2], 'zh')).toBe('NS 要求雇主(不是申请人)已经营满 2 年')
    // ③ 计数行:名目 + 冒号 + 值;四态行:主语 + 冒号 + 成句
    expect(sayFact(facts[0], 'zh')).toBe('MB 现在可带学徒的在招岗位 (NOC 72310): 3 个岗位')
    expect(sayFact(facts[3], 'zh')).toBe(`NS 的官方职业清单: ${AVAIL_SENTENCE_SAMPLE.zh}`)
    // ④ 英文单复数:喂进去 `1 jobs`,抄出来就是「1 jobs in ON」
    expect(sayFact(f({ label: 'ON open postings right now', value: 1, unit: 'jobs', valueText: '' }), 'en')).toBe('ON open postings right now: 1 job')
    // ⑤ 钱要 $ + 千分位(2026-08-06 生产实录「薪资至少 100006」裸奔);guard 的 normNum 剥逗号,账仍对得上
    expect(sayFact(f({ tool: 'lookupThresholds', label: `BC ${T.factor.income}`, value: 31264, unit: 'CAD/yr', valueText: '' }), 'zh'))
      .toBe('BC 要求申请人家庭的收入达到 $31,264/年')
    expect(sayFact(f({ tool: 'lookupThresholds', label: `ON ${LBL.en.factor.wage}`, value: 100006, unit: 'CAD/yr', valueText: '' }), 'en'))
      .toBe('ON requires this job to pay at least $100,006/yr')
  })

  // 🔴 同一个句式连着三句 = 在念表格(数字全对、无内部码、无 `=`,前面每一道都放行)
  it('句式雷同抓得到:同一开头连出 3 句、或连着三句都以省份起头', () => {
    const zh3 = 'NS 要求申请人的语言达到 5 CLB。NS 要求申请人的工作经验满 12 个月。NS 要求雇主已经营满 2 年。'
    expect(findSameOpening(zh3, 'zh').length, `没抓到中文的三连同句式:\n${zh3}`).toBeGreaterThan(0)
    expect(findSameOpening('NS 要求申请人的语言达到 5 CLB。NS 要求雇主已经营满 2 年。', 'zh')).toEqual([])   // 两句不算
    const en3 = 'NS requires 5 CLB. NS requires 12 months of experience. NS requires the employer to have 2 years.'
    expect(findSameOpening(en3, 'en').length, `没抓到英文的三连同句式:\n${en3}`).toBeGreaterThan(0)
    // 一省一句:每句开头都不一样,按前两个词判一条都抓不到 —— 所以省份起头一律归成同一个 key
    const perProv = 'Ontario requires 5 CLB. British Columbia requires 4 CLB. Alberta requires 5 CLB and 24 months.'
    expect(findSameOpening(perProv, 'en'), '一省一句没抓到').toContain('PROV')
    // 正常人话不许误杀(句子长短、开头各不相同)
    expect(findSameOpening('老板的承诺无法核实,因为没有任何一级政府公布这种名单。你现在就能核的有三件:雇主经营满 2 年、语言到 5 CLB、12 个月经验。前一条问老板公司开了几年就知道。', 'zh')).toEqual([])
  })

  // 🔴 一句话焊两种状态 = 那条红线的最后一道机械网(ⓐⓑ 只看主张行,这条谁的行都不看,只看一句话说了几种态)。
  //    这条断言**必须双向**:2026-08-07 补了英文断句的 ASCII `.` —— 那是在放宽一条红线,
  //    所以「两句各说各态 = 干净」和「一句焊两态 = 照旧抓得到」得同时钉死,三语各一例。
  it('一句话里同时挂着两种状态 → 抓得到;两句各说各态 → 干净', () => {
    // ── ① 焊在一句里:三语各一例,判据一个字没松
    expect(findMixedStates('至于该省是否有职业清单或抽选记录,官方不公布这项数据且本站尚未收录。', 'zh').length,
      '中文:一句焊两态没抓到').toBeGreaterThan(0)
    expect(findMixedStates('The government does not publish the NS list, and our site has not indexed its draw history.', 'en').length,
      '英文:一句焊两态没抓到').toBeGreaterThan(0)
    expect(findMixedStates('정부가 공개하지 않으며 본 사이트도 아직 수집하지 않았습니다.', 'ko').length,
      '한국어:一句焊两态没抓到').toBeGreaterThan(0)

    // ── ② 分开说、各说各的 = 干净(误报的代价是白烧一次软重写,2026-08-07 实测 C07 英文撞上)
    expect(findMixedStates('NS 的职业清单官方不公布。NS 的抽选记录本站尚未收录。', 'zh')).toEqual([])
    // 🔴 病根就在这一条:英文句末是 ASCII `.`,原来的断句不认它 → 两句被当成一句 → 误判成焊了两态
    expect(findMixedStates('The government does not publish the BC list. Our site has not indexed the draw history yet.', 'en'),
      '英文两句各说各态被误判成焊了两态(断句没认 ASCII 句号)').toEqual([])
    expect(findMixedStates('정부가 공개하지 않는 항목입니다. 본 사이트가 아직 수집하지 않았습니다.', 'ko'),
      '한국어两句各说各态被误判').toEqual([])
    // 项目符号(答复里唯一允许的列表形态)也是各说各的一行
    expect(findMixedStates('- The government does not publish this\n- Our site has not indexed this yet', 'en')).toEqual([])

    // ── ③ 放宽断句不许放出漏网之鱼:小数点后面没空白 = 不是句末,那一句照旧整句判
    expect(findMixedStates('The cutoff moved 3.6 points, the government does not publish this and our site has not indexed it.', 'en').length,
      '小数点把一句劈成两半 → 焊两态漏了').toBeGreaterThan(0)
    expect(findMixedStates('MB 现在有 3 个岗位。', 'zh')).toEqual([])
  })

  // 🔴 主张一条都不许静默丢掉:prompt 压不住(实测模型在「一条一句」和「这两条承诺都核不了」之间反复横跳,
  //    后者把读者自己说的「2 万」整个吞掉),所以出口自己补
  it('答复没交代到的主张,出口把我们写好的那句补回来', () => {
    const claim = (label: string) => f({ tool: 'checkClaims', unit: 'claim', value: null, valueText: '', label })
    const fee = claim(`你听到的「要收 2 万」这句话——${AVAIL_SENTENCE_SAMPLE.zh}。${MONEY_WHY.zh}`)
    const coop = claim(`你听到的「中介说曼省有合作公司」这句话——${AVAIL_SENTENCE_SAMPLE.zh}。${PROMISE_WHY.zh}`)
    // ① 两条揉成一句、读者自己说的那个数被吞掉 → 吞掉的那条补回来
    //    (「合作公司」那条的碎片「中介」「合作」还在句子里,算交代过了 —— 宁可漏补,不重复啰嗦)
    const back = missingClaimLines('这两条承诺都无法核实，因为官方不公布中介的收费或合作名单。', [fee, coop], 'zh')
    expect(back).toHaveLength(1)
    expect(back[0]).toContain('2 万')
    // ② 照抄了原话(CLAIM LINES 的常态)→ 不重复补
    expect(missingClaimLines(`${fee.label}。${coop.label}。`, [fee, coop], 'zh')).toEqual([])
    // ③ 改了措辞但把原话碎片和状态都说到了 → 也算交代过
    const paraphrased = '中介说要收 2 万,官方不公布这项数据;所谓合作公司的名单,中介与雇主之间的合作官方同样不公布。'
    expect(missingClaimLines(paraphrased, [fee], 'zh')).toEqual([])
    // ④ 英文主张也得认得出来(claimKeys 只切中韩文,英文会被全判成「没说」→ 每次都重复补一遍)
    const enFee = claim(`On what you were told ("the agent wants 20k"): ${AVAIL_SENTENCE_SAMPLE.en}. ${MONEY_WHY.en}`)
    expect(missingClaimLines('The agent wants 20k, and the government does not publish what agents charge.', [enFee], 'en')).toEqual([])
    expect(missingClaimLines('Nothing about that can be checked.', [enFee], 'en')).toHaveLength(1)
  })

  // 🔴 对中介的杀手锏不许断在词中间(2026-08-07 实测 C14 英文:`…, not a private promi.`)。
  //    320 帽只会从尾巴上砍,而尾巴恰恰是**我们自己写的见客文案**;该截的是长度不可控的原话。
  it('主张行超长时截的是原话,解释句一个字不少', () => {
    // 测试是第二双眼睛:引导词照 lib 的样子独立写一遍,不 import 过来自己核对自己
    const LEAD: Record<Lang, [string, string, string]> = {
      zh: ['你听到的「', '」这句话', '——'],
      en: ['On what you were told ("', '")', ': '],
      ko: ['「', '」라고 들으신 건', ' — '],
    }
    // 用户可以说很长 —— 原话长度不可控,正是这条规则存在的理由
    const LONG: Record<Lang, string> = {
      // 都带上金额:otherClaimLabel 那一路要走**收费**分岔(没提钱的主张不许挂金额解释,那是另一条测试守的)
      zh: '中介说他在曼省有合作公司,还说包 offer 包提名,要收我 2 万块。'.repeat(3),
      en: 'the agent says they have a partner company in Manitoba and a guaranteed nomination for 20000 dollars. '.repeat(3),
      ko: '중개인이 매니토바에 협력 회사가 있고 지명을 보장한다며 수수료 2만원을 요구했습니다. '.repeat(3),
    }
    for (const lang of ['zh', 'en', 'ko'] as const) {
      const [lead, close, dash] = LEAD[lang]
      const sep = lang === 'en' ? '. ' : '。'
      for (const [name, why] of [['PROMISE_WHY', PROMISE_WHY[lang]], ['MONEY_WHY', MONEY_WHY[lang]]] as const) {
        const rest = `${dash}${AVAIL_SENTENCE_SAMPLE_ALL[lang]['not-published']}${sep}${why}`
        // 固定部分(引导词 + 四态成句 + 解释句)吃光额度 = 原话没地方站,MIN_QUOTE 兜底会顶破帽子。
        // 这条断言就是那份契约:见客解释句再写长,先在这里红,不许红在用户屏幕上。
        expect(LABEL_CAP - (lead.length + close.length + rest.length),
          `${lang}/${name}:固定部分吃光了 320 额度,原话没地方站了`).toBeGreaterThanOrEqual(24)

        const line = claimLabel(lead, LONG[lang], close, rest)
        // ① 帽还在 —— 修法不是把 320 调大(那只是把同一刀推到更长的下一句上)
        expect(line.length, `${lang}/${name}:主张行破了 ${LABEL_CAP} 帽(${line.length})`).toBeLessThanOrEqual(LABEL_CAP)
        // ② 杀手锏整句都在,而且收在句尾(`… not a private promi.` 就是这条红的形状)
        expect(line, `${lang}/${name}:解释句被截了\n${line}`).toContain(why)
        expect(line.endsWith(why), `${lang}/${name}:解释句没收在句尾\n${line}`).toBe(true)
        // ③ 截的是原话,而且留了痕 —— 别让用户以为我们改了他的话
        expect(line, `${lang}/${name}:截了原话却没留省略号\n${line}`).toContain('…')
        expect(line, `${lang}/${name}:原话整段搬进来了(该截没截)`).not.toContain(LONG[lang])
        // ④ 放得下就一个字都别动(短原话不许被安上一个莫名其妙的省略号)
        const short = claimLabel(lead, lang === 'zh' ? '中介说包过' : 'the agent says it is guaranteed', close, rest)
        expect(short, `${lang}/${name}:短原话被无故截了\n${short}`).not.toContain('…')
        expect(short.endsWith(why), `${lang}/${name}:短原话那条的解释句也丢了\n${short}`).toBe(true)
      }
      // 生产路径复验一遍:topic='other' 的主张只从 otherClaimLabel 出来
      const money = otherClaimLabel(LONG[lang], lang)
      expect(money.length, `${lang}:otherClaimLabel 破了 ${LABEL_CAP} 帽`).toBeLessThanOrEqual(LABEL_CAP)
      expect(money.endsWith(MONEY_WHY[lang]), `${lang}:otherClaimLabel 的金额解释被截了\n${money}`).toBe(true)
    }
  })

  it('标签词表本身就得是用户语言(数据层的单一来源,别让下游各自去翻)', () => {
    for (const lang of ['zh', 'ko'] as const) {
      const T = LBL[lang]
      // 私人承诺那句也是见客文案,一并体检(它以前是 C1 的中文硬编码,现在归本层三语字典)
      const all = [...Object.values(T).flatMap((v) => (typeof v === 'string' ? [v] : Object.values(v))), PROMISE_WHY[lang]].join('\n')
      expect(all, `${lang} 的标签词表里混着英文内部说法`).not.toMatch(INTERNAL_EN)
    }
  })

  // 🔴 88% 是英文流量:C1 的 note/why 全是中文硬编码,漏一句英文用户就当页面坏了。
  // findEnglishUnits 只管「英文漏进中文」,这条管反向。
  it('中文漏进英文答复要抓得到(反向的中英夹生)', () => {
    expect(findForeignScript('MB has 3 apprentice-friendly openings. 这类主张本站核不了。', 'en'))
      .toEqual(['这类主张本站核不了'])
    expect(findForeignScript('MB has 3 apprentice-friendly openings for NOC 72310.', 'en')).toEqual([])
    // 官方专名都是拉丁字母,英文答复里没有留汉字的正当理由
    expect(findForeignScript('The MPNP In-Demand Occupations List covers NOC 72310.', 'en')).toEqual([])
    expect(findForeignScript('曼省有 3 个岗位。', 'zh')).toEqual([])                    // 中文答复里的中文当然没问题
    expect(findForeignScript('曼省有 3 个岗位,본 사이트 미수집。', 'zh')).toContain('미수집')
  })

  // 私人承诺那句是这产品对中介的杀手锏 —— 三语都得有,不能让英文用户读到半句中文
  it('私人承诺的解释句三语齐全,且不掺别的语言', () => {
    for (const lang of ['zh', 'en', 'ko'] as const) {
      const line = PROMISE_WHY[lang]
      expect(line.length, `${lang} 的私人承诺解释句缺了`).toBeGreaterThan(20)
      expect(findForeignScript(line, lang), `${lang} 的私人承诺解释句掺了别的语言:${line}`).toEqual([])
    }
  })

  // 🔴 「查过了但没命中」以前直接把内部占位符 `ok` 喂了出去,英文答复因此把「一个类别都不在」
  //    说成了「都能走」(2026-08-05 实测 C06 英文)。这句是见客文案,三语都得有、都得是人话。
  it('「查过了没命中」三语齐全,不是一个 ok', () => {
    for (const lang of ['zh', 'en', 'ko'] as const) {
      const line = LBL[lang].noneFound
      expect(line.length, `${lang} 的「没命中」句缺了`).toBeGreaterThan(8)
      expect(line, `${lang} 的「没命中」句还是内部占位符`).not.toMatch(/^ok$/i)
      expect(findForeignScript(line, lang), `${lang} 的「没命中」句掺了别的语言:${line}`).toEqual([])
    }
  })
})

// ── ①'' 纯函数:逐句门控(答复按句流出去)────────────────────────────────────
//
// 判据一句话(Frank 2026-08-08):**永不让用户看见编出来的数字,偶尔容忍啰嗦。**
// 所以这一组只证三件事:编的数字那一句发不出去 / 跨句的毛病不拦只留痕 / 断句中英文都不断在词中间。
describe('逐句门控(一句过了才发给前端)', () => {
  const gateFacts = [
    f({}),                                                                   // MB 学徒岗 3
    f({ label: 'BC apprentice-friendly openings for NOC 72310', value: 15 }),
    f({ tool: 'lookupThresholds', label: 'MB requirement experience (applicant)', value: 12, valueText: '', unit: 'months' }),
  ]
  /** 一个字一个字喂(比真 SSE 的分块更狠:任何一块都可能停在词中间),收下每一次放行的增量。 */
  const drip = (raw: string, lang: Lang, facts = gateFacts, echo = '') => {
    const gate = makeSentenceGate(facts, lang, echo)
    const out: string[] = []
    const seen: string[] = []                 // 每一次放行之后「已经见客」的全文
    let blocked: string[] = []
    for (let i = 1; i <= raw.length; i++) {
      const r = gate.push(raw.slice(0, i))
      if (r.blocked.length) { blocked = r.blocked; break }
      if (r.text) { out.push(r.text); seen.push(gate.released) }
    }
    return { gate, out, seen, blocked, released: gate.released }
  }

  // 🔴 这一条是整批的立身之本:流出去 ≠ 松开 guard
  it('一句里出现 facts 里没有的数字 → 这一句发不出去(前面那句照发)', () => {
    const r = drip('曼省学徒岗有 3 个。全国一共 77 个。', 'zh')
    expect(r.blocked).toContain('77')
    expect(r.released).toBe('曼省学徒岗有 3 个。')      // 前一句是干净的,照发
    expect(r.out.join('')).not.toContain('77')          // 编的那个数字一个字都没漏出去
  })

  it('内部码 / 语言混用 / 一句焊两态:哪一道都拦得住(用的就是原来那几个函数)', () => {
    expect(drip('这条是 NOT-PUBLISHED 的。', 'zh').blocked).toContain('NOT-PUBLISHED')
    expect(drip('BC has 15 openings. The list is 官方不公布 for now.', 'en').blocked.length).toBeGreaterThan(0)
    const mixed = `这项${AVAIL_SENTENCE_SAMPLE_ALL.zh['not-published']},而那项${AVAIL_SENTENCE_SAMPLE_ALL.zh['not-collected']}。`
    expect(drip(mixed, 'zh').blocked.some((x) => x.startsWith('mixed:'))).toBe(true)
    // `=` 是 FACTS 行的形状,一句就能判 → 进逐句门;三条 label 被逐字抄要数够三条,进不来(见下一条)
    expect(drip('MB requirement experience (applicant) = 12 months.', 'en').blocked.length).toBeGreaterThan(0)
  })

  it('🟡 跨句才判得了的(逐行抄、连着三句同开头)只留痕,不拦', () => {
    const enFacts = [
      f({ label: 'MB apprentice-friendly openings for NOC 72310', value: 3 }),
      f({ label: 'BC apprentice-friendly openings for NOC 72310', value: 15 }),
      f({ label: 'ON apprentice-friendly openings for NOC 72310', value: 7 }),
    ]
    const dump = 'MB apprentice-friendly openings for NOC 72310 is 3. '
      + 'BC apprentice-friendly openings for NOC 72310 is 15. '
      + 'ON apprentice-friendly openings for NOC 72310 is 7.'
    const r = drip(dump, 'en', enFacts)
    expect(r.blocked).toEqual([])                       // 逐句门放行 —— 它判不了「抄了几条」
    expect(dump.startsWith(r.released)).toBe(true)
    // 末句以「数字 + .」收尾 → 按 SENT_END 压着不发(在写的可能是 `7.5`),收尾那一下补齐
    expect(r.released + (r.gate.tail(dump) ?? '')).toBe(dump)
    expect(findFactCopied(dump, enFacts)).toHaveLength(3)   // 但整段那一关照旧看得见(日志留痕)
    // 连着三句同一个开头:同样只留痕
    const same = '曼省官方清单收了这个职业。曼省官方清单每年更新。曼省官方清单在官网能查到。'
    expect(drip(same, 'zh').blocked).toEqual([])
    expect(findSameOpening(same, 'zh').length).toBeGreaterThan(0)
  })

  // 🔴 上一轮(2579202)刚踩过「断在词中间」的坑,这条把它焊进逐句门。
  //    判据不是「结尾一定是句号」(行首 `- ` 那种项目行,尾巴的换行会被 trim 掉),
  //    而是**断点落在最终答复的空白/句末标点上** —— 那才是「没断在词中间」的原话。
  it('断句中英文都成立:每一次放行都不在词/数字中间断', () => {
    const zh = '曼省学徒岗有 3 个。BC 有 15 个。雇主要求经验满 12 个月。'
    const en = 'MB has 3 openings. BC has 15 openings.\n- BC apprentice openings: 15 jobs\nThe employer requires 12 months of experience.'
    for (const [raw, lang] of [[zh, 'zh'], [en, 'en']] as [string, Lang][]) {
      const r = drip(raw, lang)
      const final = clampAnswer(localizeUnits(tidy(raw), lang), lang)
      expect(r.blocked).toEqual([])
      expect(r.out.length, `${lang} 一句都没流出去`).toBeGreaterThan(1)   // 真的是分几次流的,不是最后一次性给
      for (const s of r.seen) {
        expect(final.startsWith(s), `${lang} 流出去的不是最终答复的前缀:\n流=${s}\n终=${final}`).toBe(true)
        // 断点合法有且只有两种:自己以句末标点收口(中文「…。」后面直接接下一句),或者下一个字是空白
        expect(/[。！？；!?;.]$/.test(s) || /\s/.test(final[s.length] ?? ' '),
          `${lang} 断在了词中间:${s}|${final.slice(s.length, s.length + 8)}`).toBe(true)
      }
      // 收尾:补发剩下的那截,拼起来 = 整段答复,一个字不多不少
      expect(r.out.join('') + (r.gate.tail(final) ?? '')).toBe(final)
    }
  })

  // 小数点是 SENT_SPLIT 早就处理过的坑,逐句门这头也不许把它当句末(会发出去半个数字)
  it('英文小数不当句末:`3.6` 不许被劈成两截发出去', () => {
    const facts = [f({ label: 'MB draw cutoff', value: 3.6, unit: '%' })]
    const r = drip('The rate is 3.6% right now. Nothing else is published.', 'en', facts)
    expect(r.blocked).toEqual([])
    for (const s of r.seen) expect(s).not.toMatch(/3\.$/)
  })

  // dropTrailingHedge 会砍掉结尾那一两句劝告 —— 先发再删 = 用户读到了我们打算删掉的建议
  it('结尾那句劝告不许先发出去(它待会儿要被砍掉)', () => {
    const body = '曼省学徒岗有 3 个。BC 有 15 个。'
    const r = drip(`${body}建议尽快决定,务必核实。`, 'zh')
    expect(r.released).toBe(body)
    expect(r.out.join('')).not.toContain('建议尽快')
  })
})

describe('槽位归一 / prompt 预算(模型输出不可信)', () => {
  it('省份认码也认中英文别名,认不出的丢掉(宁可少一个省,不许把 NB 当 NS)', () => {
    const s = normalizeSlots({ occ_en: 'carpenter', provs: ['曼省', 'bc', 'Nova Scotia', '火星省'], exp_months: 0, status: 'graduated' })
    expect(s.provs).toEqual(['MB', 'BC', 'NS'])
    expect(s.expMonths).toBe(0)
    expect(s.status).toBe('graduated')
  })

  it('NOC 只认用户写出来的 5 位码,模型瞎填的一律丢(拿不到码宁可反问)', () => {
    expect(normalizeSlots({ occ_en: 'carpenter', noc: '7231' }).noc).toBeNull()
    expect(normalizeSlots({ occ_en: 'carpenter', noc: 'carpenter' }).noc).toBeNull()
    expect(normalizeSlots({ occ_en: 'carpenter', noc: '72310' }).noc).toBe('72310')
  })

  // 🔴 候选 chip 里的码是**我们自己写进去的**,回读它是正则的活,不该再押模型一次
  //    (2026-08-05 实测:模型把 noc 留空 → 回落 pg_trgm → 21222 落到隔壁 21221)。
  it('原话里 literally 打出的 5 位 NOC 认得出来(三语 chip 都带它)', () => {
    expect(literalNoc('Look it up for Information systems specialists (NOC 21222)')).toBe('21222')
    expect(literalNoc('按信息系统专业人员(NOC 21222)查')).toBe('21222')
    expect(literalNoc('정보 시스템 전문가(NOC 21222) 기준으로 조회해 주세요')).toBe('21222')
    expect(literalNoc('noc:72310')).toBe('72310')
  })

  it('不是码的数字一个都不许当码(月薪/年份/位数不对的都得放过)', () => {
    expect(literalNoc('我在安省做木匠,月薪 42000')).toBeNull()
    expect(literalNoc('NOC 7231')).toBeNull()          // 4 位不是码
    expect(literalNoc('NOC 723101')).toBeNull()        // 6 位也不是
    expect(literalNoc('')).toBeNull()
  })

  it('多轮滚动继承已确认职业/身份/经验，不靠最后两句文本重新猜', () => {
    const previous = {
      noc: '72310', occText: 'carpenter', provs: ['MB'], expMonths: 0, status: 'graduated',
      claims: [{ text: '中介说包提名', topic: 'private-promise' }],
    }
    const next = mergeFollowupSlots(normalizeSlots({}), previous, '那语言要求呢?')
    expect(next).toMatchObject({ noc: '72310', occText: 'carpenter', provs: ['MB'], expMonths: 0, status: 'graduated' })
    // 旧主张不跟着每个追问重复对账。
    expect(next.claims).toEqual([])
  })

  it('多轮明确换职业就清旧 NOC；问其他省就不把旧省塞回来', () => {
    const previous = { noc: '72310', occText: 'carpenter', provs: ['MB'], expMonths: 6, status: 'working', claims: [] }
    const changed = mergeFollowupSlots(normalizeSlots({ occ_en: 'cook' }), previous, '如果我改做厨师呢?')
    expect(changed).toMatchObject({ noc: null, occText: 'cook', provs: ['MB'], expMonths: 6, status: 'working' })

    const elsewhere = mergeFollowupSlots(normalizeSlots({}), previous, '那其他省呢?')
    expect(elsewhere.noc).toBe('72310')
    expect(elsewhere.provs).toEqual([])
  })

  // 🔴 私人承诺按**原话**改判:topic 是模型猜的(实测同一句给过 ops,也给过 other),
  // 而落 other 就绕开 checkClaims,被硬写成「本站尚未收录」——正确的话是「政府根本不公布这种名单」。
  it('私人承诺按原话改判进 private-promise,不信模型给的 topic', () => {
    const t = (text: string, topic = 'other') => normalizeSlots({ claims: [{ text, topic }] }).claims[0]?.topic
    // 金标那句:模型判成 other(实录)/ ops(实录),原话都得把它拉回 private-promise
    expect(t('中介说曼省有合作公司让我去曼省')).toBe('private-promise')
    expect(t('中介说曼省有合作公司让我去曼省', 'ops')).toBe('private-promise')
    expect(t('他说有内部渠道,包过')).toBe('private-promise')
    expect(t('中介说能包曼省木匠 offer 和省提名')).toBe('private-promise')
    expect(t('中介说他认识移民官,走关系能快')).toBe('private-promise')
    expect(t('the agent says they have a partner company in MB', 'jobs')).toBe('private-promise')
    // 能对账的事实主张不许被这条规则吃掉(它们各有各的官方表)
    expect(t('朋友说萨省两个月就下来了', 'ops')).toBe('ops')
    expect(t('中介说曼省缺木匠', 'coverage')).toBe('coverage')
    // 收费仍然落 other:本站真没有这类数据,和「政府不公布」是两回事
    expect(t('中介要收 2 万', 'cost')).toBe('other')
    // 模型自己就分对了也认
    expect(t('说是有内部名额', 'private-promise')).toBe('private-promise')
  })

  // 🔴 用户自己的问句被当成「别人跟你说的」→ checkClaims 给它一个「本站尚未收录」→ 答复第一句
  //    变成一句没主语的「本站尚未收录这项数据」(2026-08-05 实测 C06)。别人说的话不会是个问句。
  it('问句不是主张:用户自己那句问话不许进 claims', () => {
    const texts = (raw: any[]) => normalizeSlots({ claims: raw }).claims.map((c) => c.text)
    expect(texts([{ text: '毕业后能留下来吗', topic: 'ops' }])).toEqual([])
    expect(texts([{ text: 'Can I stay after I graduate?', topic: 'ops' }])).toEqual([])
    expect(texts([{ text: '졸업 후에 남을 수 있을까요?', topic: 'ops' }])).toEqual([])
    // 真的是别人说的那句照旧留着
    expect(texts([{ text: '中介说曼省有合作公司', topic: 'other' }])).toEqual(['中介说曼省有合作公司'])
  })

  it('claims:认得的 topic 留着,认不得的落 other(不硬塞给某个工具去「核」)', () => {
    const s = normalizeSlots({ claims: [
      { text: '中介说曼省清单收我', topic: 'coverage', province: '曼省' },
      { text: '中介要收 2 万', topic: 'cost', province: '曼省' },     // 收费不归任何工具管
      { text: '' },
    ] })
    expect(s.claims).toHaveLength(2)
    expect(s.claims[0].topic).toBe('coverage')
    expect(s.claims[0].province).toBe('MB')
    // 落 coverage 就会出现「问的是收费、答的是清单收录」——各说各话比不答更糟
    expect(s.claims[1].topic).toBe('other')
  })

  // 🔴 自述家庭状况不是主张(2026-08-06 实测:「老婆和两个孩子一起过来」被抽成一条 claim,
  //    还被安上一句「这条金额谁也核不了」——用户压根没提钱)。主张 = 转述别人说的话。
  it('自述家庭状况不进 claims,别人说的照旧留着', () => {
    const texts = (raw: any[]) => normalizeSlots({ claims: raw }).claims.map((c) => c.text)
    expect(texts([{ text: '老婆和两个孩子一起过来', topic: 'ops' }])).toEqual([])
    expect(texts([{ text: 'my wife and two kids are coming with me', topic: 'ops' }])).toEqual([])
    expect(texts([{ text: '아내와 아이 둘이 함께 옵니다', topic: 'ops' }])).toEqual([])
    // 同一件事**由别人说出口**就是主张(判据是有没有转述标记,不是有没有提到家人)
    expect(texts([{ text: '中介说我老婆和孩子可以一起过来', topic: 'ops' }]))
      .toEqual(['中介说我老婆和孩子可以一起过来'])
    expect(texts([{ text: 'the agent told me my family can come too', topic: 'ops' }])).toHaveLength(1)
    // 跟家人无关的主张一条都不许被这条规则吃掉
    expect(texts([{ text: '曼省有合作公司', topic: 'other' }])).toEqual(['曼省有合作公司'])
    expect(isSelfStatement('老婆和两个孩子一起过来')).toBe(true)
    expect(isSelfStatement('中介说曼省有合作公司')).toBe(false)
  })

  it('收费是交易判断,不冒充“官方不公布”;没提钱的主张也不许被安上报价', () => {
    expect(isMoneyTalk('中介要收 2 万')).toBe(true)
    expect(isMoneyTalk('An agent wants $20k for the offer')).toBe(true)
    expect(isMoneyTalk('중개인이 수수료를 요구합니다')).toBe(true)
    expect(isMoneyTalk('老婆和两个孩子一起过来')).toBe(false)
    expect(isMoneyTalk('老板说帮我办')).toBe(false)
    for (const lang of ['zh', 'en', 'ko'] as const) {
      const money = otherClaimLabel(lang === 'zh' ? '中介要收 2 万' : 'the agent wants 20k', lang)
      expect(money, `${lang} 收费主张丢了交易判断`).toContain(MONEY_WHY[lang])
      expect(money, `${lang} 收费主张不该冒充政府数据缺口`).not.toContain(AVAIL_SENTENCE_SAMPLE_ALL[lang]['not-published'])
      expect(money, `${lang} 收费主张不该冒充本站数据缺口`).not.toContain(AVAIL_SENTENCE_SAMPLE_ALL[lang]['not-collected'])
      const plain = otherClaimLabel(lang === 'zh' ? '老板会帮我办手续' : 'my boss will handle the paperwork', lang)
      expect(plain, `${lang} 给没提钱的主张安了一句金额解释`).not.toContain(MONEY_WHY[lang])
      expect(plain).toContain(AVAIL_SENTENCE_SAMPLE_ALL[lang]['not-collected'])
    }
  })

  it('收费与包办承诺只合成一条结论,不重复“无法核实”四态话术', () => {
    for (const lang of ['zh', 'en', 'ko'] as const) {
      const line = commercialClaimLabel([
        lang === 'zh' ? '中介要收 2 万' : 'the agent wants 20k',
        lang === 'zh' ? '中介说包 offer 和省提名' : 'the agent guarantees the offer and nomination',
      ], lang)
      expect(line).toContain(PROMISE_WHY[lang])
      expect(line.match(new RegExp(PROMISE_WHY[lang].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))).toHaveLength(1)
      expect(line).not.toContain(AVAIL_SENTENCE_SAMPLE_ALL[lang]['not-published'])
      expect(line).not.toContain(AVAIL_SENTENCE_SAMPLE_ALL[lang]['not-collected'])
    }
  })

  it('预设问题不替用户编报价,只问包办承诺是否可信', () => {
    for (const lang of ['zh', 'en', 'ko'] as const) {
      const preset = makeT(lang)('chat.ex3')
      expect(preset).not.toMatch(/2\s*万|20\s*k|20[,.]?000|2만/iu)
      expect(preset.length).toBeGreaterThan(20)
    }
  })

  it('真实 collectFacts + 空库:收费与包办经过完整组件仍只落一条决策结论', async () => {
    let queries = 0
    const emptyPool = { query: async () => { queries++; return { rows: [] } } }
    const r = await collectFacts(emptyPool, {
      noc: '72310', occText: 'carpenter', provs: ['MB'], expMonths: null, status: null,
      claims: [
        { text: '中介说能包曼省木匠 offer 和省提名', topic: 'private-promise', province: 'MB' },
        { text: '中介要收 2 万', topic: 'other', province: 'MB' },
      ],
    }, 2, 'zh')
    const commercial = r.facts.filter((x) => x.unit === 'claim' && /包曼省|2 万/.test(x.label))
    expect(queries).toBeGreaterThan(0) // 跑的是真 lookup/collectFacts,不是静态复刻 label
    expect(commercial).toHaveLength(1)
    expect(commercial[0].label).toContain(PROMISE_WHY.zh)
    expect(commercial[0].label).not.toMatch(/官方不公布|本站尚未收录|无法核实|谁也核不了/)
  })

  // 🔴 官方流名自带省码(「BC PNP Skills Immigration…」)时门槛 fact 渲成「BC BC PNP…」的结巴
  //    (2026-08-09 手机 375 对话出处展开态实见)。流名以省码开头就不再前置省码;
  //    判据是词边界 —— NB「New Brunswick…」这类以省**全名**开头的照旧带码,BCIT 之类不误伤。
  it('真实 collectFacts:流名自带省码不再前置,省全名开头的照旧带码', async () => {
    const BC_GUIDE = 'https://www.welcomebc.ca/immigrate-to-b-c/bc-pnp-si-program-guide-pdf'
    const requirement = (over: Record<string, unknown>) => ({
      province: 'BC', program: 'PNP', stream: 'BC PNP Skills Immigration (all streams)',
      subject: 'applicant', factor: 'language', op: '>=', value: 4, value_text: '', unit: 'CLB',
      applies_teer: '', applies_noc: '', excludes_noc: '', applies_area: '', applies_condition: '',
      applies_family_size: null, basis: '', label: 'CLB 4 or higher', section: 'Language',
      effective: '2026-06-10', url: BC_GUIDE, page_url: 'https://www.welcomebc.ca/immigrate-to-b-c/for-workers',
      fetched: '2026-08-07', ...over,
    })
    const pool = { query: async (sql: string) => sql.includes('FROM pnp_requirements q ORDER BY province, seq')
      ? { rows: [
        // 真实政策形状:BC 两条通道都以省码开头;NB 两条通道以省全名开头
        requirement({}),
        requirement({ stream: 'BC PNP Skilled Worker stream', factor: 'experience', value: 24, unit: 'months',
          label: '2 years of directly related work experience', section: 'Skilled Worker' }),
        requirement({ province: 'NB', stream: 'New Brunswick Skilled Worker stream (Experience / Graduates / Priority Occupations)',
          value: 5, url: 'https://www2.gnb.ca/content/gnb/en/gateways/immigration.html', page_url: '' }),
        requirement({ province: 'NB', stream: 'New Brunswick Skilled Worker stream — New Brunswick Experience pathway',
          factor: 'experience', value: 12, unit: 'months', label: '12 months of work experience',
          url: 'https://www2.gnb.ca/content/gnb/en/gateways/immigration.html', page_url: '' }),
      ] }
      : { rows: [] } }
    const r = await collectFacts(pool, { noc: '63200', occText: 'cook', provs: ['BC', 'NB'], expMonths: null, status: null, claims: [] }, 3, 'zh')
    const thr = r.facts.filter((x) => x.tool === 'lookupThresholds')
    expect(thr.length).toBeGreaterThanOrEqual(4)
    // BC:流名开头已是省码,标签直接用流名,不再渲成「BC BC PNP…」
    expect(thr.some((x) => x.label.startsWith(`BC PNP Skills Immigration (all streams) ${LBL.zh.factor.language}`))).toBe(true)
    expect(thr.every((x) => !x.label.startsWith('BC BC'))).toBe(true)
    // NB:流名以省全名开头(不是省码「NB」),照旧前置省码 —— 词边界判据管的就是这条边
    expect(thr.some((x) => x.label.startsWith('NB New Brunswick Skilled Worker stream'))).toBe(true)
  })

  // 🔴 提示词里的大写强调被抄进答复(实测英文首句 `**WE** do not have a record…`)
  it('答复里的裸大写抓得到,公认缩写与省码不误杀', () => {
    expect(findShoutedWords('WE do not have a record of that permit.')).toEqual(['WE'])
    expect(findShoutedWords('You MUST reach CLB 5 and NEVER pay upfront.'))
      .toEqual(expect.arrayContaining(['MUST', 'NEVER']))
    // 公认缩写 + 省份两位码 + 专有名词大小写 = 正常表述,一个都不许报
    expect(findShoutedWords('Your CRS and CLB matter for EE, PNP, PGWP, LMIA, NOC and TEER in ON, BC and NS.')).toEqual([])
    expect(findShoutedWords('The MPNP In-Demand Occupations List covers Nova Scotia carpenters.')).toEqual([])
    expect(findShoutedWords('曼省官方清单收了这个职业,雇主要经营满 3 年。')).toEqual([])
    // facts 里出现过的大写 = 官方原名里的缩写,照旧放行(判据同 findEnglishUnits 的专名豁免)
    const eoi = f({ label: 'MB latest draw cutoff Skilled Worker Stream (MPNP EOI) 2026-07-30', value: 632, unit: 'points' })
    expect(findShoutedWords('The latest MPNP EOI draw cutoff was 632.', [eoi])).toEqual([])
  })

  // 🔴 「说了专业但没说职位名」不能是死路(实测 `studying IT at a Toronto college, can I stay?` → noOcc)
  it('专业词抽得出来,问候语照旧抽不出(不落死路 ≠ 瞎猜)', () => {
    expect(studyFieldOf('studying IT at a Toronto college, can I stay?')).toBe('IT')
    expect(studyFieldOf('I am majoring in computer science, no job yet')).toBe('computer science')
    expect(studyFieldOf('Just finished a diploma in nursing at Seneca.')).toBe('nursing')
    expect(studyFieldOf('我在多伦多的学院读 IT,毕业后能留下来吗')).toBe('IT')
    expect(studyFieldOf('护理专业毕业,还没工作')).toBe('护理')
    expect(studyFieldOf('요리 전공인데 남을 수 있나요?')).toBe('요리')
    // 🔴 「随便打了句问候」照旧抽不出专业 → orchestrate 回落 noOcc(这条改动不许把它变成瞎猜)
    expect(studyFieldOf('hello there, anyone here?')).toBe('')
    expect(studyFieldOf('你好啊')).toBe('')
    // 学校/学历本身不是专业
    expect(studyFieldOf('Ontario college grad, no job yet')).toBe('')
  })

  it('专业 → 检索词只翻译「拿去查什么」,认不出的宁可空手(不许瞎编职业)', () => {
    expect(fieldSearchTerm('IT')).toBe('information technology')
    expect(fieldSearchTerm('计算机')).toBe('computer science')
    expect(fieldSearchTerm('护理')).toBe('nursing')
    expect(fieldSearchTerm('nursing')).toBe('nursing')          // 拉丁长词原样查
    expect(fieldSearchTerm('火星学')).toBe('')                   // 认不出的中文 → 空 → 一个候选都查不到 → noOcc
    expect(fieldSearchTerm('x')).toBe('')
  })

  it('反问文案:三语成句、点名候选职业、chip 带官方名(下一轮靠它落回 5 位码)', () => {
    const opts: OccOption[] = [
      { noc: '21222', title: 'Information systems specialists', label: '信息系统专家' },
      { noc: '21220', title: 'Cybersecurity specialists', label: '网络安全专家' },
    ]
    const zh = askOccupation('IT', opts, 'zh')
    expect(zh.answer).toContain('信息系统专家')
    expect(zh.answer).toContain('网络安全专家')
    expect(zh.slots.noc, '反问轮绝不许自己填一个 NOC').toBeNull()
    expect(zh.facts).toEqual([])                                 // 没查工具就没有事实,不许摆出处
    expect(zh.followups).toHaveLength(2)
    // chip 里带 5 位码:下一轮抽槽位靠「用户自己打出了 5 位数字」落回同一条职业,不走相似度重猜
    expect(zh.followups[0]).toContain('21222')
    expect(zh.followups[0]).toContain('信息系统专家')
    expect(findLeaks(zh.answer)).toEqual([])
    expect(findWordNumbers(zh.answer, 'zh')).toEqual([])
    for (const lang of ['zh', 'en', 'ko'] as const) {
      const en = lang === 'en' ? opts.map((o) => ({ ...o, label: o.title })) : opts
      const r = askOccupation('IT', en, lang)
      expect(r.answer.length, `${lang} 反问文案缺了`).toBeGreaterThan(20)
      expect(findLeaks(r.answer), `${lang} 反问文案泄露内部码`).toEqual([])
      expect(findShoutedWords(r.answer), `${lang} 反问文案里有裸大写`).toEqual([])
      if (lang === 'en') expect(findForeignScript(r.answer, 'en'), '英文反问文案掺了中文').toEqual([])
    }
  })

  it('facts 压缩有预算:塞不下就停(朋友服务 6000 字符硬上限,别整坨 JSON 喂过去)', () => {
    const many = Array.from({ length: 200 }, (_, i) => f({ label: `L${i} `.repeat(10) }))
    expect(factsBlock(many, 500).length).toBeLessThanOrEqual(500)
    expect(factsBlock(many, 500).split('\n').length).toBeGreaterThan(0)
  })
})
