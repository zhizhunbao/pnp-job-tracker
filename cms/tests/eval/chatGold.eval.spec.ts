/**
 * 活体金标(真库 + 真 LLM):金标 C01 木匠一句话进、多轮出。
 *
 * 自 tests/int/chatOrchestrate.int.spec.ts 迁入(2026-08-09 对话评测批),断言一字未改。
 * 红 = 信号,不拦 CI —— 本文件不进恒绿网,由 `eval:chat` 命令跑
 * (vitest.eval.config.mts,include tests/eval/**)。
 * 库或朋友模型任一不可用 → 整组 skip(照 chatTools.int.spec.ts 惯例)。
 */
import pg from 'pg'
import { LBL, MONEY_WHY, PROMISE_WHY } from '@/lib/i18n'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { LABEL_CAP } from '@/lib/chat/facts'
import { findEnglishUnits, findForeignScript, findLeaks, findMergedStates, findWordNumbers, guardAnswer } from '@/lib/chat/guards'
import { orchestrate } from '@/lib/chat/orchestrate'
import { resolveNoc, suggestOccupations } from '@/lib/chat/slots'
import { findHedges, findMixedStates, findSameOpening, findShoutedWords } from '@/lib/chat/traces'
import type { Fact } from '@/lib/chat/types'
import { friendLlmReady } from '@/lib/llm/friend'

const URI = process.env.DATABASE_URI || ''
const CARPENTER = '72310'
// 金标原话(设计《案例库-问题与结果先行-20260803》C01)
const C01 = '我亚岗昆木匠毕业,还没工作,中介说曼省有合作公司让我去曼省,要收 2 万'
// 同一道题的英文版(88% 流量走这条路)
const EN01 = 'I just finished carpentry at Algonquin, no work experience yet. An agent says they have a partner company in Manitoba and wants 20k.'
// 2026-08-06 实测撞死路的那句原话:说的是**在读专业**,不是职位名
const STUDY_EN = 'studying IT at a Toronto college, can I stay?'
// 2026-08-06 实测:家庭状况被抽成主张,还被接上了一句「这条金额谁也核不了」(用户压根没提钱)
const FAMILY_ZH = '我在萨省做厨师,老婆和两个孩子一起过来,现在能申请省提名吗?'

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

  // 🔴 「说了专业但没说职位名」是转化杀手:挂件第一条示例就是这个形状(说 software dev 能答、
  //    说读 IT 就答不了)。实测原话进,不许再以 noOcc 死路收场,候选还必须真是库里查出来的。
  it('说了在读专业:反问得有用,候选来自库(实测原话)', async () => {
    const opts = await suggestOccupations(pool, 'IT', 'en')
    expect(opts.length, '库里查不出「读 IT」的候选职业').toBeGreaterThan(0)
    for (const o of opts) expect(o.noc).toMatch(/^\d{5}$/)

    const r = await orchestrate(pool, { text: STUDY_EN, lang: 'en' })
    expect(r.slots.noc, '🔴 反问轮绝不许自己猜一个 NOC').toBeNull()
    expect(r.answer.length, `反问文案太短:\n${r.answer}`).toBeGreaterThan(20)
    expect(r.followups.length, '反问没给候选职业 —— 又是一条死路').toBeGreaterThan(0)
    // 候选必须是库里那几条(不是现编的)
    expect(r.followups.some((q) => opts.some((o) => q.includes(o.title))), `候选不在库里查到的那几条里:\n${r.followups.join('\n')}`).toBe(true)
    expect(findLeaks(r.answer), `反问里泄露内部码:\n${r.answer}`).toEqual([])
    expect(findShoutedWords(r.answer), `反问里有裸大写:\n${r.answer}`).toEqual([])
    expect(findForeignScript(r.answer, 'en'), `英文反问混进了中文:\n${r.answer}`).toEqual([])
    console.log(`\n──── 「读 IT」反问(${r.answer.length} 字符)────\n${r.answer}\n候选:${r.followups.join(' | ')}\n────────────────\n`)

    // 🔴 点了候选那一轮必须真的落回 5 位码 —— 不然「反问」只是把死路推后一轮
    const pick = await orchestrate(pool, {
      text: r.followups[0], lang: 'en',
      history: [{ role: 'user', content: STUDY_EN }, { role: 'assistant', content: r.answer }],
    })
    // 摆出去的和查回来的必须是**同一条**职业(chip 里的 5 位码就是为这个)
    expect(pick.slots.noc, `点了候选落到了别的职业:${r.followups[0]}`).toBe(opts[0].noc)
    expect(pick.facts.length, '点了候选却一条事实都没查').toBeGreaterThan(0)
    console.log(`\n──── 点「${r.followups[0]}」之后(NOC ${pick.slots.noc})────\n${pick.answer}\n────────────────\n`)
  }, 180_000)

  // 🔴 替用户编他没说过的事:说错数字还能改口,把「你被人告知过某个价钱」强加给他不能。
  it('自述家庭状况:不进 claims,也不许扯出一个他没提过的价钱(实测原话)', async () => {
    const r = await orchestrate(pool, { text: FAMILY_ZH, lang: 'zh' })
    expect(r.slots.claims.filter((c) => /老婆|孩子|家人/.test(c.text)), `家庭状况被当成了主张:${JSON.stringify(r.slots.claims)}`).toEqual([])
    const money = r.facts.filter((x) => x.label.includes(MONEY_WHY.zh))
    expect(money.map((x) => x.label), '用户没提钱,facts 里却挂上了金额解释').toEqual([])
    expect(r.answer, `答复替用户编了一个价钱:\n${r.answer}`).not.toContain('金额')
    expect(guardAnswer(r.answer, r.facts, FAMILY_ZH).ok, `答复里有溯不回 facts 的数字:\n${r.answer}`).toBe(true)
    console.log(`\n──── 家庭状况那句的答复(${r.answer.length} 字)────\n${r.answer}\n────────────────\n`)
  }, 180_000)

  // 🔴 88% 的流量是英文,而 C1 的 note/why 全是中文硬编码 —— 中文漏进英文答复只有真跑一次才看得见。
  // 断言只挑「漏了就不能上线」的:不掺中文、无内部码、数字溯得回 facts。
  it('英文同一道题:一个中文字都不许漏进去', async () => {
    // 顺带把**逐句流**在真库真模型下验一遍(英文是断句最难的一档:`.` 得后跟空白才算句末)
    const seen: string[] = []          // 每一次放行之后已经见客的全文
    let acc = ''
    let resets = 0
    const r = await orchestrate(pool, { text: EN01, lang: 'en' }, {
      onDelta: (d) => { acc += d; seen.push(acc) },
      onReset: () => { resets++; acc = ''; seen.length = 0 },
    })
    // 流出去的每一截都必须:① 不在词/数字中间断;② 自己就过得了数字回查与内部码
    for (const s of seen) {
      expect(guardAnswer(s, r.facts, EN01).ok, `流出去的一截里有溯不回 facts 的数字:\n${s}`).toBe(true)
      expect(findLeaks(s), `流出去的一截泄露内部码:\n${s}`).toEqual([])
      if (!resets && r.answer.startsWith(s)) {
        expect(/[\s.!?;]/.test(r.answer[s.length] ?? ' '), `英文流出去的一截断在了词中间:${s.slice(-20)}|${r.answer.slice(s.length, s.length + 8)}`).toBe(true)
      }
    }
    // 撤回过就不作前缀要求(那正是撤回的意思);没撤回过则流出去的必须是最终答复的前缀
    if (!resets) expect(r.answer.startsWith(acc), `流出去的不是最终答复的前缀:\n流=${acc}\n终=${r.answer}`).toBe(true)
    console.log(`[stream] deltas=${seen.length} resets=${resets} streamed=${acc.length}/${r.answer.length}ch`)
    expect(findForeignScript(r.answer, 'en'), `英文答复里混进了中文:
${r.answer}`).toEqual([])
    expect(findLeaks(r.answer), `英文答复泄露内部码:
${r.answer}`).toEqual([])
    // 🔴 提示词里的大写强调被抄进答复(实测首句 `**WE** do not have a record…`)——英文答复才看得见
    expect(findShoutedWords(r.answer, r.facts), `英文答复里有裸大写(提示词的强调漏出来了):
${r.answer}`).toEqual([])
    expect(guardAnswer(r.answer, r.facts, EN01).ok, `英文答复里有溯不回 facts 的数字:
${r.answer}`).toBe(true)
    // 🔴 像人话的两条机械底线:不许是表格(`=`)、不许连着三句一个句式(含一省一句)
    expect(r.answer, `英文答复里出现了 = (那是 FACTS 行的形状):\n${r.answer}`).not.toContain('=')
    expect(findSameOpening(r.answer, 'en'), `英文答复连着三句一个句式(在念表格):\n${r.answer}`).toEqual([])
    expect(findMixedStates(r.answer, 'en'), `英文答复把两种状态焊进了一句:\n${r.answer}`).toEqual([])
    expect(r.answer.length).toBeGreaterThan(40)
    // 🔴 对中介的杀手锏必须整句活着(实测 C14 英文断成 `…, not a private promi.`):
    //    英文是三语里最挤的一档 —— 主张行带上 PROMISE_WHY 就顶着 320 帽,真跑一次才看得见谁被砍
    for (const fx of r.facts.filter((x) => x.unit === 'claim' && x.label.includes(PROMISE_WHY.en.slice(0, 24)))) {
      expect(fx.label, `私人承诺那句被 ${LABEL_CAP} 帽截了(该截的是原话):\n${fx.label}`).toContain(PROMISE_WHY.en)
    }
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

    // 剧本:0 经验 → 必须有在招岗位计数,而且给的是**真实盘子**
    // 🔴 2026-08-05 改判据:旧版只认「可带学徒的在招岗位」那个子集,于是安省 129 个在招被报成 4 个,
    //    NL 更是整省不出现。现在主数必须是总在招(open),学徒数以子集形式随行。
    const sub = r.facts.filter((x) => x.tool === 'lookupJobs' && x.label.includes(LBL.zh.apprSub))
    const jobs = r.facts.filter((x) => x.tool === 'lookupJobs' && x.label.includes(LBL.zh.openPostings))
    expect(jobs.length, '0 经验没调出在招岗位计数 —— 剧本没生效').toBeGreaterThan(0)
    expect(jobs.every((x) => typeof x.value === 'number')).toBe(true)
    expect(r.facts.some((x) => x.label.includes(LBL.zh.apprOpenings)),
      '还在用旧的「可带学徒的在招岗位」当主口径').toBe(false)
    // 他点名的省必须在里面(哪怕垫底/为 0):金标那句「曼省 3 个,全国垫底」就靠这一条
    expect(jobs.some((x) => x.label.startsWith('MB ')), '点名的 MB 没出现在在招岗位计数里').toBe(true)
    // 「不要经验」的子集只给他点名的省,而且**单独成行**(一行两个数会被模型串省,实测过)
    expect(sub.every((x) => r.slots.provs.some((p) => x.label.startsWith(`${p} `))),
      `子集给到了他没点名的省:\n${sub.map((x) => x.label).join('\n')}`).toBe(true)
    // 主数必须是真实在招而不是子集:同一个省的总数 ≥ 子集(库里数天天变,不写死具体值)
    for (const s of sub) {
      const prov = s.label.slice(0, 2)
      const total = jobs.find((x) => x.label.startsWith(`${prov} `))
      expect(total, `${prov} 只有子集没有总数`).toBeTruthy()
      expect(total!.value ?? 0, `${prov} 总在招(${total!.value})小于「不要经验」子集(${s.value})`)
        .toBeGreaterThanOrEqual(s.value ?? 0)
    }

    // MB 清单命中(中介说的那个省,库里真有具名命中)
    const mb = r.facts.find((x) => x.tool === 'lookupCoverage' && x.label.startsWith('MB ') && x.label.includes(LBL.zh.listIn))
    expect(mb, 'facts 里没有 MB 清单命中').toBeTruthy()
    expect(mb!.evidence.url).toBeTruthy()

    // 对账第三格:他没提的省列得出来
    const unsaid = r.facts.find((x) => x.tool === 'checkClaims' && x.label === LBL.zh.unsaid)
    expect(unsaid, 'checkClaims 的 unsaid 没进 facts').toBeTruthy()
    expect(unsaid!.valueText).toMatch(/BC|NS/)
    expect(unsaid!.valueText).not.toMatch(/MB/)          // 他说过的不进第三格

    // 中介那句话进得来:每条主张都在 facts 里有交代(核到 / 核不了,都不许静默丢掉)。
    // 🔴 按**原话有没有落地**判,不按行数判:`commercialClaimLabel`(2026-08-05 起)有意把
    //    「包合作公司」与「收 2 万」合成一条交易判断 —— 两条主张一行,是设计不是丢失
    //    (「不让收费与承诺各重复一遍同义空话」)。数行数会把这次合并误判成静默丢弃;
    //    真正要守的是「他说的每一句都还在」,顺带盯住 claimLabel 那把 320 帽别把第二句截没了。
    const claimFacts = r.facts.filter((x) => x.tool === 'checkClaims' && x.unit === 'claim')
    expect(claimFacts.length, '主张一条都没进 facts').toBeGreaterThan(0)
    const claimBlob = claimFacts.map((x) => x.label).join('\n')
    for (const c of r.slots.claims) {
      expect(claimBlob, `这条主张被静默丢掉了:「${c.text}」\n现有主张行:\n${claimBlob}`).toContain(c.text.slice(0, 6))
    }
    // 商业话术那行带的是交易判断而非四态(collectFacts ⑦「私人报价/包办不是一项政府数据」)——
    // 它的成句断言在下面 §商业话术合成一条 那几行,这里不重复。

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

    // 私人交易话术不是一项政府数据:收费与合作/包办只生成一条决策结论,不套四态、不重复“无法核实”。
    expect(findMergedStates(r.answer, r.facts, 'zh'), `四态被揉在一起了:\n${r.answer}`).toEqual([])
    const commercial = r.facts.filter((x) => x.unit === 'claim' && /合作公司|2 万/.test(x.label))
    expect(commercial, `商业话术没有合成一条:\n${commercial.map((x) => x.label).join('\n')}`).toHaveLength(1)
    expect(commercial[0].label).toContain(PROMISE_WHY.zh)
    expect(commercial[0].label).not.toMatch(/官方不公布|本站尚未收录|无法核实|谁也核不了/)
    expect(r.answer, `答复没有直接判断收费/承诺能否证明结果:\n${r.answer}`).toMatch(/不能证明|不能当作|不是官方保证/)
    expect(r.answer, `答复又退回“全都无法核实”的空话:\n${r.answer}`).not.toMatch(/这两项.*无法核实|全部.*无法核实|官方不公布这项数据|谁也核不了/)

    // 关键事实仍在:短是目标,丢事实不是。数字从 facts 里取(库里数会变,不写死)。
    // 🔴 判据是**覆盖率不是逐条**(2026-08-05 改):答复只有四五个 bullet,facts 有二十条,
    //    要求四条关键事实**全中**是过度指定 —— 实测三次分别丢掉不同的一条(477 / 5 CLB),
    //    那是模型在有限篇幅里的取舍,不是「丢事实」。要守的是「别把关键面全丢了」,所以按条数卡下限。
    //    MB 在招岗位数单独硬卡:他点名的省的盘子是这一轮的主结论,丢了这条整段就没意义了。
    const key: [Fact | undefined, string][] = [
      [jobs.find((x) => x.label.startsWith('MB ')), 'MB 在招岗位数'],
      // 语言门槛:label 现在是半句话(「MB 要求申请人的语言达到」),CLB 在单位里 —— 按 factor 词表找,别按 CLB 找
      [r.facts.find((x) => x.tool === 'lookupThresholds' && x.label.includes(LBL.zh.factor.language)), 'MB 语言门槛 CLB'],
      [r.facts.find((x) => x.tool === 'lookupThresholds' && x.label.includes(LBL.zh.factor.empYears)), '雇主经营年限'],
      [r.facts.find((x) => x.tool === 'lookupEE'), '联邦 EE trade 通道分数'],
    ]
    const present = key.filter(([x]) => x?.value != null && r.answer.includes(String(x.value)))
    const asked = key.filter(([x]) => x?.value != null)
    expect(present.length, `关键事实丢太多(${present.length}/${asked.length}):\n`
      + asked.map(([x, why]) => `${present.some(([y]) => y === x) ? '✓' : '✗'} ${why}=${x!.value}`).join('\n')
      + `\n${r.answer}`).toBeGreaterThanOrEqual(Math.max(2, asked.length - 1))
    const mbJobs = jobs.find((x) => x.label.startsWith('MB '))
    if (mbJobs?.value != null) {
      expect(r.answer, `他点名的 MB 的在招盘子丢了(=${mbJobs.value}):\n${r.answer}`).toContain(String(mbJobs.value))
    }
    // MB 清单命中:中介推的那个省站不站得住,全靠这句(说了省名不算,得说清单收了这个职业)
    expect(r.answer, `MB 清单命中没说:\n${r.answer}`).toMatch(/清单|列表|在需|MPNP/)

    console.log(`\n──── 金标 C01 答复全文(${r.answer.length} 字)────\n${r.answer}\n────────────────────────────\n`)
  }, 180_000)
})
