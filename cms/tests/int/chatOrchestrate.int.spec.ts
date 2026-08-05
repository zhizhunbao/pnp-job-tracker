/**
 * 对话编排层(C2;设计《对话即产品-20260803》§四剧本 / §八验收金标)。
 *
 * 两组:
 *  ① **纯函数组**(永远跑):出口校验 guardAnswer + 槽位归一 + prompt 预算。
 *     guard 是本批最重要的一件东西 —— 它不能靠"prompt 里求模型守规矩",必须有测试证明它抓得到编造的数字。
 *  ② **金标 C01 木匠**(需要 DATABASE_URI + 朋友模型):木匠原话一句话进 → NOC/省/claims 抽得出、
 *     学徒岗计数与 MB 清单命中在 facts 里、答复里的每个数字都溯得回 facts。
 *     库或模型任一不可用 → 整组 skip(照 chatTools.int.spec.ts 惯例,别让 CI 因朋友服务挂了变红)。
 */
import pg from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  AVAIL_MARKERS, clampAnswer, dropTrailingHedge, factsBlock, factSheet, findEnglishUnits, findHedges,
  findForeignScript, findLeaks, findMergedStates, findMixedStates, findSameOpening, findWordNumbers,
  guardAnswer, LBL, localizeUnits, missingClaimLines, normalizeSlots,
  MONEY_WHY, orchestrate, PROMISE_WHY, resolveNoc, sayFact, stripMd, tidy,
  type ChatLang, type Fact,
} from '@/lib/chatOrchestrate'
import { friendLlmReady } from '@/lib/friendLlm'

const URI = process.env.DATABASE_URI || ''
const CARPENTER = '72310'
// 金标原话(设计《案例库-问题与结果先行-20260803》C01)
const C01 = '我亚岗昆木匠毕业,还没工作,中介说曼省有合作公司让我去曼省,要收 2 万'
// 同一道题的英文版(88% 流量走这条路)
const EN01 = 'I just finished carpentry at Algonquin, no work experience yet. An agent says they have a partner company in Manitoba and wants 20k.'

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
const AVAIL_SENTENCE_SAMPLE: Record<ChatLang, string> = {
  zh: AVAIL_SENTENCE_SAMPLE_ALL.zh['not-published'],
  en: AVAIL_SENTENCE_SAMPLE_ALL.en['not-published'],
  ko: AVAIL_SENTENCE_SAMPLE_ALL.ko['not-published'],
}
// 两条状态不同的主张(兜底清单里也得各说各的)
const CLAIM_LEAD: Record<ChatLang, string> = {
  zh: '有人跟你说「要收 2 万」——', en: 'You were told "they charge 20k" — ', ko: '「2만을 받는다」라고 들으셨습니다 — ',
}
const CLAIM_LEAD2: Record<ChatLang, string> = {
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
    const sheetFacts = (lang: ChatLang): Fact[] => {
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
    // ② 门槛行:label 是半句话,值接上去就是整句(不是「字段名 = 值」)
    expect(sayFact(facts[1], 'zh')).toBe('NS 要求申请人的语言达到 5 CLB')
    expect(sayFact(facts[2], 'zh')).toBe('NS 要求雇主(不是申请人)已经营满 2 年')
    // ③ 计数行:名目 + 冒号 + 值;四态行:主语 + 冒号 + 成句
    expect(sayFact(facts[0], 'zh')).toBe('MB 现在可带学徒的在招岗位 (NOC 72310): 3 个岗位')
    expect(sayFact(facts[3], 'zh')).toBe(`NS 的官方职业清单: ${AVAIL_SENTENCE_SAMPLE.zh}`)
    // ④ 英文单复数:喂进去 `1 jobs`,抄出来就是「1 jobs in ON」
    expect(sayFact(f({ label: 'ON open postings right now', value: 1, unit: 'jobs', valueText: '' }), 'en')).toBe('ON open postings right now: 1 job')
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

  // 🔴 一句话焊两种状态 = 那条红线的最后一道机械网(ⓐⓑ 只看主张行,这条谁的行都不看,只看一句话说了几种态)
  it('一句话里同时挂着两种状态 → 抓得到', () => {
    expect(findMixedStates('至于该省是否有职业清单或抽选记录,官方不公布这项数据且本站尚未收录。', 'zh').length).toBeGreaterThan(0)
    // 分开说、各说各的 = 干净
    expect(findMixedStates('NS 的职业清单官方不公布。NS 的抽选记录本站尚未收录。', 'zh')).toEqual([])
    expect(findMixedStates('The government does not publish the NS list, and our site has not indexed its draw history.', 'en').length).toBeGreaterThan(0)
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

  // 🔴 私人承诺按**原话**改判:topic 是模型猜的(实测同一句给过 ops,也给过 other),
  // 而落 other 就绕开 checkClaims,被硬写成「本站尚未收录」——正确的话是「政府根本不公布这种名单」。
  it('私人承诺按原话改判进 private-promise,不信模型给的 topic', () => {
    const t = (text: string, topic = 'other') => normalizeSlots({ claims: [{ text, topic }] }).claims[0]?.topic
    // 金标那句:模型判成 other(实录)/ ops(实录),原话都得把它拉回 private-promise
    expect(t('中介说曼省有合作公司让我去曼省')).toBe('private-promise')
    expect(t('中介说曼省有合作公司让我去曼省', 'ops')).toBe('private-promise')
    expect(t('他说有内部渠道,包过')).toBe('private-promise')
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

  it('facts 压缩有预算:塞不下就停(朋友服务 6000 字符硬上限,别整坨 JSON 喂过去)', () => {
    const many = Array.from({ length: 200 }, (_, i) => f({ label: `L${i} `.repeat(10) }))
    expect(factsBlock(many, 500).length).toBeLessThanOrEqual(500)
    expect(factsBlock(many, 500).split('\n').length).toBeGreaterThan(0)
  })
})

// ── ② 金标 C01 木匠(真库 + 真模型)──────────────────────────────────────
const live = URI && friendLlmReady() ? describe : describe.skip
live('金标 C01 木匠(一句话进,多轮出)', () => {
  let pool: any
  beforeAll(() => { pool = new pg.Pool({ connectionString: URI, max: 3 }) })
  afterAll(async () => { await pool?.end() })

  it('职名 → 5 位 NOC:carpenter 落到 72310,认不出的一律 null(不猜)', async () => {
    expect((await resolveNoc(pool, 'carpenter'))?.noc).toBe(CARPENTER)
    expect(await resolveNoc(pool, 'zzzzqqqq')).toBeNull()
    expect(await resolveNoc(pool, 'ab')).toBeNull()
  }, 30_000)

  // 🔴 88% 的流量是英文,而 C1 的 note/why 全是中文硬编码 —— 中文漏进英文答复只有真跑一次才看得见。
  // 断言只挑「漏了就不能上线」的:不掺中文、无内部码、数字溯得回 facts。
  it('英文同一道题:一个中文字都不许漏进去', async () => {
    const r = await orchestrate(pool, { text: EN01, lang: 'en' })
    expect(findForeignScript(r.answer, 'en'), `英文答复里混进了中文:
${r.answer}`).toEqual([])
    expect(findLeaks(r.answer), `英文答复泄露内部码:
${r.answer}`).toEqual([])
    expect(guardAnswer(r.answer, r.facts, EN01).ok, `英文答复里有溯不回 facts 的数字:
${r.answer}`).toBe(true)
    // 🔴 像人话的两条机械底线:不许是表格(`=`)、不许连着三句一个句式(含一省一句)
    expect(r.answer, `英文答复里出现了 = (那是 FACTS 行的形状):\n${r.answer}`).not.toContain('=')
    expect(findSameOpening(r.answer, 'en'), `英文答复连着三句一个句式(在念表格):\n${r.answer}`).toEqual([])
    expect(findMixedStates(r.answer, 'en'), `英文答复把两种状态焊进了一句:\n${r.answer}`).toEqual([])
    expect(r.answer.length).toBeGreaterThan(40)
    // facts 也不许带中文进英文 prompt(病根在这儿,不在模型)
    const zhInFacts = r.facts.filter((x) => findForeignScript(`${x.label} ${x.valueText}`, 'en').length)
    expect(zhInFacts.map((x) => `${x.label} | ${x.valueText}`), '英文会话的 facts 里带了中文').toEqual([])
    console.log(`
──── 金标 C01 英文答复(${r.answer.length} 字符)────
${r.answer}
────────────────────────────
`)
  }, 180_000)

  it('木匠原话:槽位抽得出、facts 有学徒岗与 MB 清单命中、答复数字全溯得回 facts', async () => {
    const r = await orchestrate(pool, { text: C01, lang: 'zh' })

    // 槽位:只做"听懂"
    expect(r.slots.noc).toBe(CARPENTER)
    expect(r.slots.provs).toContain('MB')
    expect(r.slots.claims.length).toBeGreaterThan(0)
    expect(r.slots.expMonths).toBe(0)

    // 剧本:0 经验 → 必须有学徒岗计数
    const appr = r.facts.filter((x) => x.tool === 'lookupJobs' && x.label.includes(LBL.zh.apprOpenings))
    expect(appr.length, '0 经验没调出学徒岗计数 —— 剧本没生效').toBeGreaterThan(0)
    expect(appr.every((x) => typeof x.value === 'number')).toBe(true)
    // 他点名的省必须在里面(哪怕垫底/为 0):金标那句「曼省 3 个,全国垫底」就靠这一条
    expect(appr.some((x) => x.label.startsWith('MB ')), '点名的 MB 没出现在学徒岗计数里').toBe(true)

    // MB 清单命中(中介说的那个省,库里真有具名命中)
    const mb = r.facts.find((x) => x.tool === 'lookupCoverage' && x.label.startsWith('MB ') && x.label.includes(LBL.zh.listIn))
    expect(mb, 'facts 里没有 MB 清单命中').toBeTruthy()
    expect(mb!.evidence.url).toBeTruthy()

    // 对账第三格:他没提的省列得出来
    const unsaid = r.facts.find((x) => x.tool === 'checkClaims' && x.label === LBL.zh.unsaid)
    expect(unsaid, 'checkClaims 的 unsaid 没进 facts').toBeTruthy()
    expect(unsaid!.valueText).toMatch(/BC|NS/)
    expect(unsaid!.valueText).not.toMatch(/MB/)          // 他说过的不进第三格

    // 中介那句话进得来:每条主张都在 facts 里有交代(核到 / 核不了,都不许静默丢掉)
    const claimFacts = r.facts.filter((x) => x.tool === 'checkClaims' && x.unit === 'claim')
    expect(claimFacts.length, '主张一条都没进 facts').toBeGreaterThanOrEqual(r.slots.claims.length)
    // 四态在**数据层**就写成了成句(模型只照抄,不许自己翻译枚举)
    expect(claimFacts.some((x) => /官方不公布|本站尚未收录/.test(x.label)), `主张行没带成句四态:\n${claimFacts.map((x) => x.label).join('\n')}`).toBe(true)

    // 每个带数字的 fact 都挂得住出处(铁律 ①,与 C1 同一把尺)
    for (const x of r.facts) if (x.value != null) expect(x.evidence.url, x.label).toBeTruthy()

    // 🔴 出口:答复里的数字全在 facts 里(编排层已经拦过一道,这里是回读复验)
    expect(guardAnswer(r.answer, r.facts, C01).ok, `答复里有溯不回 facts 的数字:${JSON.stringify(guardAnswer(r.answer, r.facts, C01).bad)}\n${r.answer}`).toBe(true)
    expect(r.answer.length).toBeGreaterThan(40)
    expect(r.followups.length).toBeGreaterThan(0)

    // 🔴 见客三条(内部码 / 中英混杂 / 长度)——都是「读一遍就不能发出去」的毛病
    expect(findLeaks(r.answer), `答复里泄露了内部码:\n${r.answer}`).toEqual([])
    expect(findEnglishUnits(r.answer, 'zh', r.facts), `中文答复里裸着英文速记:\n${r.answer}`).toEqual([])
    expect(findWordNumbers(r.answer, 'zh'), `数量写成了中文数字,guard 就看不见了:\n${r.answer}`).toEqual([])
    expect(r.answer.length, `答复超长(见客上限 600 字):\n${r.answer}`).toBeLessThanOrEqual(600)
    // 🔴 像人话:不是表格(`=`)、不是三连同句式(含一省一句)、不是一句焊两种状态
    expect(r.answer, `答复里出现了 = (那是 FACTS 行的形状):\n${r.answer}`).not.toContain('=')
    expect(findSameOpening(r.answer, 'zh'), `连着三句一个句式(在念表格):\n${r.answer}`).toEqual([])
    expect(findMixedStates(r.answer, 'zh'), `一句话焊了两种状态:\n${r.answer}`).toEqual([])
    // 推断性措辞只留痕不拦,所以这里也只打印(读日志的人自己判断,别为过测试砍事实)
    const hedges = findHedges(r.answer, 'zh')
    if (hedges.length) console.log(`[金标] 推断性措辞留痕:${hedges.join(',')}`)

    // 🔴 四态不许合并。**期望值从 facts 里读,不写死**:哪条主张落哪个态由 C1 工具层 + 当天库里的数据决定
    // (2026-08-04 就变过一次:MB 运营数据进库后,「合作公司」那条从 not-published 变成了 ok),
    // 写死状态的测试测的是那一天的库,不是这条链的正确性。要守的不变量是:**每条主张各说各的态,两条不共用一个说法**。
    expect(findMergedStates(r.answer, r.facts, 'zh'), `四态被揉在一起了:\n${r.answer}`).toEqual([])
    const sents = r.answer.split(/(?<=[。！？\n])/).filter((s) => s.trim())
    const AVS = ['not-published', 'not-collected', 'not-applicable'] as const
    const stateOf = (fx: Fact) => AVS.find((av) => `${fx.label} ${fx.valueText}`.includes(AVAIL_SENTENCE_SAMPLE_ALL.zh[av]))
    // 找答复里交代这条主张的那句话:**按意思找,不按原字找** —— 模型会改写措辞
    // (实录把「合作公司」写成了「合作名单」),盯着原字会把一句正确的答复判成没交代。
    const claimSay = (factFrag: string, sentRe: RegExp) => {
      const fx = r.facts.find((x) => x.unit === 'claim' && x.label.includes(factFrag))
      if (!fx) return { fx, want: undefined, said: undefined, sent: undefined }
      const sent = sents.find((s) => sentRe.test(s))
      const want = stateOf(fx)
      return { fx, want, sent, said: want && sent ? AVAIL_MARKERS.zh[want].find((m) => sent.includes(m)) : undefined }
    }
    const coop = claimSay('合作公司', /合作|内部渠道|私下承诺|走关系/)
    const fee = claimSay('2 万', /万/)
    // 🔴 「合作公司」这条现在是**确定的**:PRIVATE_PROMISE 按原话改判,不看模型给的 topic,
    //    所以它必然落 private-promise → not-published。「政府根本不公布这种名单,谁承诺都没依据」
    //    才是对中介那句话的正确回答;说成「本站尚未收录」等于把锅揽到自己身上。
    expect(coop.fx, 'facts 里没有「合作公司」那条主张').toBeTruthy()
    expect(coop.want, `「合作公司」必须落 not-published(私人承诺桶),实际:${coop.want}\n${coop.fx?.label}`).toBe('not-published')
    expect(coop.sent, `答复没交代「合作公司」那条:\n${r.answer}`).toBeTruthy()
    expect(coop.said, `「合作公司」得说成「官方不公布」,答复没这么说:\n${coop.sent}`).toBeTruthy()
    // 收费那条:槽位模型偶尔会把两句并成一条主张,所以按「存在才断言」守。
    // 🔴 2026-08-04 改判:收费**不是**「本站尚未收录」(那句读起来像「我们回头会收录」),
    //    而是**没有任何一级政府公布中介的收费与承诺** → not-published + MONEY_WHY。
    //    生产实录里英文用户问「An agent wants $20k … Worth it?」被答成 "our site has not indexed this yet",
    //    等于把中介最爱钻的空子替他堵上了嘴。要守的不变量仍是:**收费与私人承诺不共用一句解释**。
    if (fee.fx && fee.fx !== coop.fx) {
      expect(fee.want, `「2 万」应是 not-published(官方不公布中介收费),实际:${fee.want}`).toBe('not-published')
      expect(fee.fx.label, `「2 万」那条没带上「谁也核不了」的解释:\n${fee.fx.label}`).toContain(MONEY_WHY.zh)
      expect(coop.fx!.label, '「合作公司」那条该带 PROMISE_WHY,不是 MONEY_WHY').toContain(PROMISE_WHY.zh)
      expect(fee.sent, `答复没交代「2 万」那条:\n${r.answer}`).toBeTruthy()
      expect(fee.said, `「2 万」得说成「官方不公布」:\n${fee.sent}`).toBeTruthy()
    }

    // 关键事实仍在:短是目标,丢事实不是。数字从 facts 里取(库里数会变,不写死)
    const keep = (x: Fact | undefined, why: string) => {
      if (!x || x.value == null) return          // 该 fact 本轮没查到 → 不强求答复提它
      expect(r.answer, `${why}(fact=${x.label}=${x.value})丢了:\n${r.answer}`).toContain(String(x.value))
    }
    keep(appr.find((x) => x.label.startsWith('MB ')), 'MB 学徒岗计数')
    // 语言门槛:label 现在是半句话(「MB 要求申请人的语言达到」),CLB 在单位里 —— 按 factor 词表找,别按 CLB 找
    keep(r.facts.find((x) => x.tool === 'lookupThresholds' && x.label.includes(LBL.zh.factor.language)), 'MB 语言门槛 CLB')
    keep(r.facts.find((x) => x.tool === 'lookupThresholds' && x.label.includes(LBL.zh.factor.empYears)), '雇主经营年限')
    keep(r.facts.find((x) => x.tool === 'lookupEE'), '联邦 EE trade 通道分数')
    // MB 清单命中:中介推的那个省站不站得住,全靠这句(说了省名不算,得说清单收了这个职业)
    expect(r.answer, `MB 清单命中没说:\n${r.answer}`).toMatch(/清单|列表|在需|MPNP/)

    console.log(`\n──── 金标 C01 答复全文(${r.answer.length} 字)────\n${r.answer}\n────────────────────────────\n`)
  }, 180_000)
})
