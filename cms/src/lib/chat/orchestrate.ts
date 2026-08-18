/**
 * 对话编排层 v1(设计《对话即产品-20260803》§二/§三/§四,C2 批)。
 *
 * 三步流水线:抽槽位(LLM 只"听懂") → 调 C1 工具层(数字与判定的唯一来源) → 合成人话(LLM 只"说人话")。
 *
 * 本层自己的三条铁律:
 *   ① **出口校验硬拦**(guardAnswer):答复里的每一个数字必须能在 facts 里找到出处,
 *      靠的是回读比对,不是"在 prompt 里求模型别编"。违规 → 重试一次 → 再违规就降级成事实清单。
 *      宁可给一张能溯源的清单,也不给一句编出来的话。
 *   ② 工具层的四态(ok / not-published / not-collected / not-applicable)一路带到 prompt,
 *      **"官方不公布"和"本站没收录"不许在答复里合并成"没有"**;但**枚举值本身不许见客**
 *      (findLeaks:意思照说,代码照拦)。同一道出口还拦中/韩答复里的英文速记(findEnglishUnits)、
 *      按句截断长度(clampAnswer:朋友服务不收 max_tokens),并给没有 fact 撑腰的推断性措辞留痕(findHedges)。
 *   ③ 依赖职业的问题拿不到 5 位 NOC 就反问,**绝不猜职业码** —— 猜错一位,下面所有职业工具都在答另一个人的问题；
 *      PGWP / CEC / FSW / FST 规则与 CRS / FSW67 分表不依赖职业,纯问这些时不强迫用户补 NOC。
 *
 * 形状照 lib/resumeMatch.ts:纯函数 + 显式 pool 入参,路由只负责鉴权/限流/错误码。
 * ⚠️ 朋友服务(qwen3.6)prompt 上限 6000 字符(实测 400,system 不占额),所以 facts **先压平再压缩**
 * 才喂模型:工具返回的整坨 JSON 一次就能把额度撑爆(resume-match 真简历事故同一个坑)。
 */
import { LlmError, completeText } from '../llm'
import { parseLlmJson } from '../resumeMatch'
import { LBL, type Lang, STEP } from '../i18n'
import * as SQL from '../db/sql'
import { buildPgwpCombineAnswer, isOddsQuestion, isPgwpCombineQuestion, isPlanQuestion, mergeRememberedSlots, synthMessages } from './answer'
import { collectFacts, slotAskOptions } from './cards'
import { permitOptions, verdictFollowups } from './facts'
import { FEDERAL_TOPIC_SHIFT_RE, MIN_PROFILE_SLOTS, asksWhichProvince, crsLookups, federalRuleProgramsForTurn, isPathQuestion } from './federal'
import { buildFollowups, citeFacts } from './followups'
import { findAlienProvinces, findEnglishUnits, findFactCopied, findFactEq, findForeignScript, findLeaks, findMergedStates, findUnbackedCoverage, findUngroundedClaims, findUnitMismatch, findWordNumbers, guardAnswer, missingClaimLines, tidy } from './guards'
import { memoPool } from './normalize'
import { SLOT_SYSTEM, answerMeta, answerUsage, askOccupation, bareNocCandidates, filledProfileSlots, isUsageQuestion, literalNoc, metaTopicOf, normalizeSlots, resolveNoc, studyFieldOf, suggestOccupations } from './slots'
import { MAX_TEXT, MIN_TEXT, type OnStep, SYNTH_STALL_MS, isFollowupTurn } from './steps'
import { clampAnswer, factSheet, makeSentenceGate, sentenceBlockers } from './stream'
import { BULLET_LINE, dropTrailingHedge, findHedges, findMixedStates, findSameOpening, findShoutedWords } from './traces'
import type { ChatResult, ChatTurn, ProfileKnown, Slots } from './types'
import { LEN_CAP, localizeUnits } from './wording'

// ── 主流程 ──────────────────────────────────────────────────────────────────

/**
 * opts.onStep  = 工具轨迹(见文件上方 STEP 那段的三条铁律)。不传 = 今天的行为,一步不变。
 *                事件按**真实阶段边界**发:读懂问题 → 认出职业 → 每个工具返回 → 开始组织答复。
 * opts.onDelta = 答复正文的**逐句**增量(见 makeSentenceGate:一句过了逐句门才发)。不传 = 整段落地才给。
 * opts.onReset = 已经发出去的正文作废,前端清屏(撞了门要重试 / 降级 / 补位把前面重截了)。
 *                它是**撤回**不是进度,只在真要重画时发。
 */
export async function orchestrate(
  rawPool: any, input: {
    text: string; lang: Lang; history?: ChatTurn[]; context?: unknown
    profileContext?: unknown; profileKnown?: ProfileKnown
  },
  opts?: { onStep?: OnStep; onDelta?: (s: string) => void; onReset?: () => void },
): Promise<ChatResult> {
  const text = (input.text || '').trim().slice(0, MAX_TEXT)
  const lang: Lang = (['zh', 'en', 'ko'] as const).includes(input.lang) ? input.lang : 'en'
  // 🔵 D2:首轮仍是四字门;我们刚问完一句(history 里有 assistant 轮)时短答放行 —— 见 isFollowupTurn。
  //    空串永远拦:那不是短答,是没答。
  // 🔵 四字门是按英文字符数定的 —— 中/韩双字就是一个完整职业(「护士」「厨师」「목수」),
  //    2026-08-09 Frank 实撞:冷启动发「护士」被回「你做什么工作」,用户刚说完职业就被装没听见。
  //    CJK 文本 ≥2 字即放行进抽槽:真是「你好」这类寒暄,后面 noOcc/候选路照旧接得住。
  const cjkOk = text.length >= 2 && /[㐀-鿿가-힣]/.test(text)
  if (!text || (text.length < MIN_TEXT && !cjkOk && !isFollowupTurn(input.history))) {
    throw new ChatError('tooShort', 'input too short')
  }
  const pool = memoPool(rawPool)
  const onStep = opts?.onStep
  const S = STEP[lang]

  // ① 抽槽位
  onStep?.({ phase: 'read', text: S.read })
  let raw: string
  try {
    const hist = (input.history ?? []).slice(-6).map((h) => `${h.role}: ${h.content.slice(0, h.role === 'assistant' ? 320 : 240)}`).join('\n')
    raw = await completeText([
      { role: 'system', content: SLOT_SYSTEM },
      { role: 'user', content: (hist ? `EARLIER:\n${hist}\n\nNOW: ` : '') + text },
    ], { maxTokens: 400, provider: 'friend', ...(SYNTH_STALL_MS > 0 ? { stallMs: SYNTH_STALL_MS } : {}) })
  } catch (e) {
    // 🔴 **抽槽这一发也要装闸**(2026-08-09 生产实录 chat_logs 20:29 那条:整轮 47.9s 才报 busy ——
    //    合成只占其中 25s,前面 23s 卡在这儿没人管)。它是第一发,冷启/排队最先砸的就是它。
    //    等不来字 → 同样报「系统繁忙」:这时连职业都还没认出来,没有任何东西可降级。
    if (e instanceof LlmError && e.code === 'timeout') {
      console.log(`[chat] slots timeout (stallMs=${SYNTH_STALL_MS}) → busy (${e.message.slice(0, 120)})`)
      throw new ChatError('busy', `slot extraction timed out: ${e.message}`)
    }
    throw new ChatError('llm', e instanceof LlmError ? e.message : String(e))
  }
  const parsed = parseLlmJson(raw)
  if (!parsed) throw new ChatError('llm', `slot parse failed: ${raw.slice(0, 160)}`)
  // 登录档案跨刷新可用；同一会话的上一轮比档案新；本轮用户明确说的值优先级最高。
  let merged = mergeRememberedSlots(
    normalizeSlots(parsed), input.history?.length ? input.context : null, input.profileContext, text,
  )
  // 🔴 claims 只能来自用户自己的话(2026-08-06 生产实录 #36/#37):抽槽模型会把 EARLIER 里
  //    assistant 的句子 —— 我们自己上一轮的答复 —— 抽成「你听到的」主张,见客层回头把自家门槛行
  //    当中介报价对账(「报价本身不能证明…」)。SLOT_SYSTEM 里那条规则是软的,这道闸是硬的:
  //    主张文本(掐头 60 字、去空白)出现在任何一条 assistant 历史里就整条丢弃。
  //    误伤面算过:用户真把我们的话复述回来问「真的吗」,那也不是第三方主张,丢了正确。
  if (merged.claims.length && input.history?.length) {
    const squash = (s: string) => s.replace(/\s+/g, '')
    const ours = input.history.filter((h) => h.role === 'assistant').map((h) => squash(h.content))
    const own = merged.claims.filter((c) => {
      const t = squash(c.text).slice(0, 60)
      return t.length < 6 || !ours.some((a) => a.includes(t))
    })
    if (own.length !== merged.claims.length) merged = { ...merged, claims: own }
  }
  // 他原话里打出来的 5 位码压过模型和上下文:那是**他自己指定的那一条**(多半是点了我们摆的候选 chip),
  // 再去 pg_trgm 猜一次就是拿相似度覆盖一个确定值(见 literalNoc 上面那段实测)。
  let typed = literalNoc(text)
  // 🔴 K08:裸码(没写 NOC 字样)同权,但先过 noc_descriptions 验真——裸五位数可能是工资,
  //    库里实存才算码(见 bareNocCandidates 那段)。fixture 池不认这条 SQL → catch 折空行 → 行为与旧链一致。
  if (!typed) {
    const bare = bareNocCandidates(text)
    if (bare.length) {
      const { rows } = await pool.query(SQL.NOC_CODES_EXIST, [bare])
        .catch(() => ({ rows: [] as { noc: string }[] }))
      const real = new Set(rows.map((r: { noc: string }) => String(r.noc)))
      typed = bare.find((n) => real.has(n)) ?? null
      if (typed) console.log(`[chat] bare noc ${typed} confirmed in noc_descriptions (candidates=${bare.join(',')})`)
    }
  }
  const draft = typed && typed !== merged.noc ? { ...merged, noc: typed } : merged
  // 联邦规则/分表不依赖职业。路由判据只读用户原话,不拿模型猜的 topic 当开关。
  const federalPrograms = federalRuleProgramsForTurn(text, input.history)
  const crs = crsLookups(text)
  const federalOnlyOk = federalPrograms.length > 0 || crs.length > 0
  // 纯联邦政策追问不需要职业。即使抽槽模型凭空塞进 NOC，也不能因此启动 jobs/省份/EE 全套工具；
  // 只有 NOW 明确同时问岗位、雇主、省提名等第二主题时，才允许进入职业分支。
  const federalRulesOnly = federalOnlyOk && !FEDERAL_TOPIC_SHIFT_RE.test(text)

  // ② 职名 → 5 位 NOC(拿不到就反问,绝不猜)
  const hit = federalRulesOnly ? null
    : draft.noc ? { noc: draft.noc, title: '' } : await resolveNoc(pool, draft.occText)
  if (!hit && !federalOnlyOk) {
    // 🔴 说了专业没说职位名 → **反问得有用**,别让他撞死路(见 studyFieldOf 上面那段)。
    //    候选一条都查不到才回落 noOcc:「随便打了句问候」照旧走原路。
    const field = studyFieldOf(text) || draft.occText
    const opts = field ? await suggestOccupations(pool, field, lang) : []
    if (opts.length) {
      console.log(`[chat] study field "${field}" → ${opts.map((o) => o.noc).join(',')} (asked which occupation)`)
      return askOccupation(field, opts, lang)
    }
    // 🔴 问的是「这张表是什么、对我有什么用」→ 答用法再把话头递回职业(D1;见 isUsageQuestion 上面那段)。
    //    放在候选反问**之后**:说得出专业的人,给他真候选比给他一段说明有用。
    if (isUsageQuestion(text)) {
      console.log(`[chat] usage question answered without occupation lang=${lang}`)
      return answerUsage(text, lang, draft)
    }
    // 🔴 问的是「你这个对话本身怎么回事」(没选项 / 你能干什么 / 怎么用)→ 写死的一句 + 递回职业
    //    (2026-08-10;见 metaTopicOf 上面那段)。**排在 usage 之后**:主语是我们那几张表的归 usage。
    const meta = metaTopicOf(text)
    if (meta) {
      console.log(`[chat] meta question answered without occupation topic=${meta} lang=${lang}`)
      return answerMeta(meta, lang, draft)
    }
    throw new ChatError('noOcc', 'occupation not resolved', { ...draft, noc: null })
  }
  const slots: Slots = {
    ...draft,
    noc: hit?.noc ?? null,
    occText: draft.occText || hit?.title || '',
  }

  // ③ 调工具 → Fact[]
  // 职业名先算出来:轨迹第二格要报「认出的是谁」,而 NOC 一确定这一格就是既成事实(工具还没跑)。
  if (hit) {
    const occHint = `${hit.title || slots.occText} (NOC ${slots.noc})`
    onStep?.({ phase: 'occ', text: S.occ(occHint) })
  }
  // 🔴 路径裁决的触发判据(C5c),两条同时成立才算,缺一不可:
  //   ① 他问的就是「我走哪条路」(isPathQuestion 只读原话,不看模型猜的槽 —— 同 federalRulePrograms 那条原则);
  //   ② 档案槽有值的够 MIN_PROFILE_SLOTS 个 —— 不够就不硬算:判出来的十三条几乎全是 needs-info,
  //      与其把「判不了」说十三遍,不如反问一句该补的槽(followups 见下面 askSlots)。
  //   另外还要 hit:通道判定处处依赖 NOC/TEER,拿不到 5 位码就反问,这条铁律在这儿一样管用。
  const verdictOn = !!hit && isPathQuestion(text) && filledProfileSlots(slots).length >= MIN_PROFILE_SLOTS
  // 问的是「要多久 / 哪条更快」才算时间线(判据是纯函数,不问模型:topic 归模型猜的那些坑已经踩够了)
  const { facts, title } = await collectFacts(pool, slots, null, lang, onStep, {
    plan: !!hit && isPlanQuestion(text) && !isOddsQuestion(text), federalPrograms, crs,
    allProvs: asksWhichProvince(text), verdict: verdictOn,
  })
  const occ = hit ? `${title || hit.title || slots.occText} (NOC ${slots.noc})` : ''

  // ④ 合成 + 出口校验(违规重试一次,再违规降级成事实清单)
  //    三道硬拦:数字溯源(guard) / 内部码泄露(findLeaks) / 中韩答复里的英文速记(findEnglishUnits);
  //    一道留痕:推断性措辞(findHedges)—— 只报警不拦,误杀正常表述比漏一句更贵。
  const synOpts = {
    zeroExp: slots.expMonths === 0, hasClaims: slots.claims.length > 0, hasVerdict: verdictOn,
    occ, history: input.history, federalPrograms,
  }
  // 合成层与出口校验使用同一份用户证据。历史只收 user 轮，不能拿 assistant 自己说过的数字背书。
  const userEvidence = [...(input.history ?? []).filter((h) => h.role === 'user').slice(-5).map((h) => h.content), text].join('\n')
  let scripted = federalPrograms.includes('PGWP') && isPgwpCombineQuestion(text, input.history)
    ? buildPgwpCombineAnswer(facts, lang, userEvidence)
    : ''
  if (scripted) {
    const scriptBad = sentenceBlockers(scripted, facts, lang, userEvidence, slots)
    if (scriptBad.length) {
      console.error(`[chat] PGWP scripted answer failed its own guards: ${scriptBad.join(',')}`)
      scripted = ''
    }
  }
  let answer = scripted
  let bad: string[] = []
  let banned: string[] = []
  let sameOpen: string[] = []          // 句式雷同:重试一次就认命(降级比它难看得多),不进降级判据
  let passed = ''                      // 最近一次**过了硬拦**的答复(句式重试的退路)
  let firedLast: string[] = []         // 最后一次撞到的检查名(降级日志要报「因为哪一道」,不是只报「降级了」)
  // 🔵 逐句门(见 makeSentenceGate):只有**第一稿**流 —— 重试稿要么是撞了门的补救、要么是软重写,
  //    两种都是「把刚才那段推翻重写」,流出去只会让用户读到两遍不一样的话。
  //    slots 一并交给它:闸A(归因)判的是「这句话替他说了他没说过的属性」,没有槽就判不了。
  const gate = opts?.onDelta && !scripted ? makeSentenceGate(facts, lang, userEvidence, slots) : null
  let gateBad: string[] = []           // 流到一半撞了门:这一稿作废,照旧走重试/降级
  let streamed = false                 // 真往前端发过字(撤回时要通知前端清屏)
  let streamOk = false                 // 这一稿是「逐句门全过」的那一稿:收尾只补尾巴,不重画
  onStep?.({ phase: 'write', text: S.write })
  if (scripted) opts?.onDelta?.(scripted)
  for (let attempt = 0; attempt < (scripted ? 0 : 2); attempt++) {
    const live = Boolean(gate) && attempt === 0
    try {
      const t0 = Date.now()
      let ttft = 0
      let acc = ''
      const raw2 = await completeText(
        synthMessages(facts, text, lang, { ...synOpts, ...(attempt ? { forbid: bad, banned, sameOpen } : {}) }),
        { maxTokens: 900, provider: 'friend', ...(SYNTH_STALL_MS > 0 ? { stallMs: SYNTH_STALL_MS } : {}), onDelta: (chunk) => {
          if (!ttft) ttft = Date.now() - t0
          if (!live || gateBad.length) return
          acc += chunk
          if (!/[。！？；!?;.\n]/.test(chunk)) return      // 这一块里连一个断句记号都没有,不必回读整段
          const r = gate!.push(acc)
          if (r.blocked.length) {
            gateBad = r.blocked
            console.log(`[chat] sentence gate blocked noc=${slots.noc} lang=${lang} hits=${r.blocked.join(',')}`)
            if (streamed) { opts?.onReset?.(); streamed = false }   // 已经发出去的那截作废:让前端清屏,别读半段
          } else if (r.text) { streamed = true; opts!.onDelta!(r.text) }
        } },
      )
      console.log(`[chat] synth attempt=${attempt + 1} noc=${slots.noc} ttft=${ttft}ms total=${Date.now() - t0}ms out=${raw2.length}ch`)
      const cleaned = dropTrailingHedge(clampAnswer(localizeUnits(tidy(raw2), lang), lang), lang)
      if (cleaned.dropped.length) console.log(`[chat] dropped trailing advice noc=${slots.noc} sentences=${JSON.stringify(cleaned.dropped)}`)
      answer = cleaned.text
    } catch (e) {
      const code = e instanceof LlmError ? e.code : undefined
      const why = e instanceof Error ? e.message.slice(0, 120) : String(e)
      // 报码不报数:timeout 可能是停摆闸(stallMs)、也可能是硬上限或上游 504 —— 别在日志里替它猜是哪一个
      if (code === 'timeout') {
        // 🔴 等不来字 = **报「系统繁忙」,不发事实清单**(Frank 08-09 拍板)。
        //    唯一例外:上一稿本来就是干净的(只是想重写得好看点),那就把它发出去 —— 手里有能用的答复还报错是纯亏。
        if (passed) {
          console.log(`[chat] synth timeout on rewrite (stallMs=${SYNTH_STALL_MS}) noc=${slots.noc} → keep the clean draft`)
          answer = passed; bad = []; banned = []; break
        }
        console.log(`[chat] synth timeout (stallMs=${SYNTH_STALL_MS}) attempt=${attempt + 1} noc=${slots.noc} → busy (${why})`)
        throw new ChatError('busy', `synthesis timed out: ${why}`, slots)
      }
      // 掉线/上游炸了这类**不是等待**的失败照旧降级:facts 已经查到了,给清单比给错误页强。
      // 哪一稿挂了都算(原来只认第一稿,重写那稿挂了就整轮抛错)。
      if (facts.length) {
        console.log(`[chat] synth failed attempt=${attempt + 1} noc=${slots.noc} → fact sheet (${why})`)
        answer = ''; bad = []; break
      }
      throw new ChatError('llm', e instanceof LlmError ? e.message : String(e))
    }
    // 🔴 **哪一道检查、第几次** —— 逐道具名(2026-08-05 Frank:降级率是根因指标,修呈现只是化妆)。
    //    原来六道检查被并成 leaks/units 两坨,日志里看得见「撞了」看不见「撞的是谁」,
    //    于是没人知道该松哪一道、该改哪条 RULE。名字就是这几个函数名,别再另起别名。
    const g = guardAnswer(answer, facts, userEvidence)
    const fired: [string, string[]][] = ([
      ['guard', g.bad],
      ['leak', findLeaks(answer)],
      ['factEq', findFactEq(answer)],
      ['factCopy', findFactCopied(answer, facts)],       // ← 六道里唯一**跨句才判得了的**(要数够三条)
      // 「某省清单收了这个职业」但 facts 里没有那个省的 coverage —— 数字 guard 一个字都拦不住,
      // 而它错的是**资格前提**(2026-08-05 实录:SK 一条 coverage 都没有,答复照样说「萨省清单收录该职业」)。
      // 归进硬拦(leaks 那一组):重试一次,再犯就降级成事实清单 —— 宁可朴素,不发一句凭空的资格结论。
      ['coverage', findUnbackedCoverage(answer, facts, lang)],
      // 🔴 2026-08-09 两道新硬拦(33102 三轮实测,非数字断言此前无闸门):
      //   attrib = 第二人称陈述态说了一个我们手上没有值的属性(「你说过没有经验」/「你现在的分数」);
      //   unitNum = 数字对上了但**单位是编的**(「short by 6 months」借用户那句「CLB 6」的 6 过了数字闸)。
      //   都归硬拦:重试一次,再犯就降级成事实清单 —— 宁可朴素,不发一句替他编的自述。
      ['attrib', findUngroundedClaims(answer, slots, userEvidence)],
      ['unitNum', findUnitMismatch(answer, facts, userEvidence)],
      // K03 省名串台(2026-08-09 治病批,基线 R08 实录冒 NB):省名凭空出现=资格前提级错,归硬拦
      ['provDrift', findAlienProvinces(answer, facts, userEvidence, slots)],
      ['enUnits', findEnglishUnits(answer, lang, facts)],
      ['cjkNum', findWordNumbers(answer, lang, facts, userEvidence)],
      ['script', findForeignScript(answer, lang)],
    ] as [string, string[]][]).filter(([, v]) => v.length)
    const leaks = fired.filter(([k]) => k === 'leak' || k === 'factEq' || k === 'factCopy' || k === 'coverage'
      || k === 'attrib' || k === 'unitNum' || k === 'provDrift').flatMap(([, v]) => v)
    const units = fired.filter(([k]) => k === 'enUnits' || k === 'cjkNum' || k === 'script').flatMap(([, v]) => v)
    const hedges = findHedges(answer, lang)
    if (hedges.length) console.log(`[chat] hedge warn noc=${slots.noc} words=${hedges.join(',')}`)
    // 提示词的大写强调漏进答复(`**WE** do not have a record…`):只留痕 —— 治本在提示词那头,
    // 这里是复查。硬拦它会为了一个 OK/AND 把一段好答复顶成事实清单,不划算。
    const shouted = findShoutedWords(answer, facts)
    if (shouted.length) console.log(`[chat] shouted-caps warn noc=${slots.noc} words=${shouted.join(',')}`)
    const merged = [...findMergedStates(answer, facts, lang), ...findMixedStates(answer, lang)]
    if (merged.length) console.log(`[chat] state-merge warn noc=${slots.noc} ${merged.join(' | ')}`)
    // 🔵 流出去的那一稿:除了 factCopy,每一道都在流的过程中逐句判过了,这里是整段复查
    //    (留手的那一两句也得过这一关)。**factCopy 不参与放行** —— 它跨句才判得了,而拦它就得把
    //    用户已经读到的字全撤回;Frank 拍板的取舍正是这条:偶尔容忍啰嗦,绝不容忍编造的数字。
    if (live && !gateBad.length && !fired.some(([k]) => k !== 'factCopy')) {
      bad = []; banned = []
      streamOk = true
      const warn = [...fired.map(([k, v]) => `${k}(${v.length})`), ...findSameOpening(answer, lang).map((k) => `sameOpening(${k})`)]
      if (warn.length) console.log(`[chat] streamed draft kept, cross-sentence warn noc=${slots.noc} lang=${lang} ${warn.join(',')}`)
      break
    }
    // 流过一半却没能原样留下(尾巴撞了检查 / 中途撞了门)→ 立刻通知前端清屏,别让他盯着一段马上要被替换的字
    if (streamed) { console.log(`[chat] stream retracted noc=${slots.noc}`); opts?.onReset?.(); streamed = false }
    if (g.ok && !leaks.length && !units.length) {
      bad = []; banned = []
      passed = answer                       // 过了硬拦的稿子先存着:重写万一崩了,退回它比降级强
      // 硬拦全过 → 只剩「说得顺不顺」:连着三句同一个开头、或一句话焊了两种状态,重写一次
      // (**不进降级判据**:降级成事实清单比这两样难看得多;第二稿还这样就发出去,留痕给读日志的人)
      const soft = attempt ? [] : [...findSameOpening(answer, lang), ...findMixedStates(answer, lang)]
      if (!soft.length) { sameOpen = []; break }
      sameOpen = soft
      console.log(`[chat] soft rewrite noc=${slots.noc} hits=${soft.join(' | ')}`)
      continue
    }
    bad = g.bad
    banned = [...leaks, ...units].slice(0, 10)
    firedLast = fired.map(([k, v]) => `${k}(${v.length})`)
    console.log(`[chat] exit-check hit attempt=${attempt + 1} noc=${slots.noc} lang=${lang} `
      + `fired=${firedLast.join(',')} nums=${g.bad.join(',')} strings=${banned.join(',')} answer=${answer.slice(0, 200)}`)
  }
  // 🔴 模型漏掉的主张,出口自己补(见 missingClaimLines 上面那段:prompt 压不住,就别再指望 prompt)。
  //    先把模型那段按「留出补位长度」重新截一次 —— 见客字数上限不能因为补位被顶破。
  if (answer && !bad.length && !banned.length) {
    const miss = missingClaimLines(answer, facts, lang)
    if (miss.length) {
      const sep = lang === 'en' ? ' ' : ''
      const end = lang === 'en' ? '. ' : '。'
      const tail = miss.map((l) => `${l}${end}`).join(sep).trim()
      const head = clampAnswer(answer, lang, Math.max(120, LEN_CAP[lang] - tail.length - 2))
      // 🔴 补位落在项目符号后面要另起一段:直接续在 `- …` 那行后面,补回来的主张会被渲染**进那一条项目里**
      //    (前端只按行首 `- ` 认项),读者看到的就是一条又臭又长的清单项,而不是一句独立的话。
      answer = `${head}${BULLET_LINE.test(head.split('\n').pop() ?? '') ? '\n\n' : sep}${tail}`
      console.log(`[chat] claim lines re-attached noc=${slots.noc} n=${miss.length}`)
    }
  }
  let degraded = false
  // 句式重写这一轮翻了车(第一稿本来是干净的)→ 退回第一稿,不许因为「不够好看」把能用的答复扔了降级
  if ((bad.length || banned.length || !answer) && passed) {
    console.log(`[chat] same-opening rewrite failed, keeping the first clean draft noc=${slots.noc}`)
    answer = passed; bad = []; banned = []
  }
  if (bad.length || banned.length || !answer) {
    if (!facts.length) throw new ChatError('guard', 'no facts to fall back on', slots)
    degraded = true
    console.log(`[chat] degraded to fact sheet noc=${slots.noc} lang=${lang} facts=${facts.length} `
      + `reason=${firedLast.join(',') || (answer ? 'unknown' : 'no-answer')} bad=${bad.join(',')}`)
    answer = factSheet(facts, lang)
    // 🔴 降级分支**必须过同一道出口检查**,否则它就是所有红线的后门(2026-08-04:兜底把英文内部标签
    //    `apprentice-friendly openings…` / `index scope note` 直接吐给了用户)。
    //    这里是我们自己写的字,查出问题 = 代码 bug,不是模型违规 —— 所以不重试、不再降级,响亮报错留痕。
    const sheetBad = [
      ...findLeaks(answer), ...findEnglishUnits(answer, lang, facts), ...findWordNumbers(answer, lang),
      ...findForeignScript(answer, lang), ...findMergedStates(answer, facts, lang), ...findHedges(answer, lang),
      // 我们自己的 label 里用大写做强调,模型照抄(en 的 listEx 曾经写作 EXCLUDES)—— 降级清单没有模型
      // 兜底那一层,写错就是原样见客,所以这道在这儿也要跑一遍
      ...findShoutedWords(answer, facts),
    ]
    if (sheetBad.length) console.error(`[chat] 🔴 FACT SHEET LEAKS (数据层 label 没本地化) noc=${slots.noc} lang=${lang} bad=${sheetBad.join(',')}`)
  }
  // 🔵 逐句门收尾:补发「留手的那一两句」+ missingClaimLines 补回来的主张。
  //    对不上前缀(补位把前面重截了)→ 撤回让最终事件整段重画:宁可闪一下,不许前后两截对不上。
  if (streamOk && gate) {
    const add = gate.tail(answer)
    if (add) opts?.onDelta?.(add)
    else if (add === null) { console.log(`[chat] stream tail mismatch, repainting noc=${slots.noc}`); opts?.onReset?.() }
  } else if (streamed) opts?.onReset?.()
  // 出处标注在最后一步(要拿最终答复回读);追问只从「这次真查到了数据」的工具里出。
  // 降级成事实清单时**整张清单就是答复**,所以有出处的全标上 —— 那种时候出处正是唯一能点的东西。
  const out = degraded ? facts.map((f) => ({ ...f, cited: Boolean(f.evidence.url) })) : citeFacts(answer, facts)
  console.log(`[chat] cited ${out.filter((f) => f.cited).length}/${out.length} facts noc=${slots.noc} degraded=${degraded}`)
  // 🔴 裁决已出但**身份不明**时点名问工签(§4.5 → C6 选项卡):NL 国际毕业生这类通道的前提是
  //    有效工签,而库里没有这条门槛行 —— 判定层说不出口的前提,由选项卡替它问(需要决定才弹,
  //    宁缺勿滥)。**不再同时塞进 followups**:那些 chip 点击=以用户身份发这句话,而这句是
  //    助手问用户的,语义拧着;选项卡的三张选项才是它的正确形态(2026-08-06 dev 实测两处重复)。
  // 裁决前置的工签卡优先;普通轮垫建档点选卡(能点选就不让打字,一轮一张,档案已有的槽不问)
  const options = federalRulesOnly ? undefined
    : verdictOn && slots.status == null
      ? permitOptions(lang)
      : slotAskOptions(slots, facts, lang, input.profileKnown)
  // 🔴 问了「走哪条路」却没判 = 档案槽不够。这时**反问缺的那几个槽**排在追问最前面:
  //    不补槽就不会有裁决,推别的追问等于把他领去一个答不了他这个问题的地方。
  //    点选卡这轮在收的那个槽除外(2026-08-09 Frank 截图:CLB 卡和「你的语言考到 CLB 几?」
  //    同屏两问)——卡是它的正确形态,同槽的文字反问不再重复出。
  const dupAsk = options?.slotKey ? (LBL[lang].vAsk as Record<string, string>)[options.slotKey] : undefined
  const askSlots = (isPathQuestion(text) && !verdictOn ? verdictFollowups(slots, lang) : []).filter((q) => q !== dupAsk)
  const followups = federalRulesOnly ? []
    : [...askSlots, ...buildFollowups(facts, lang, text, slots.occText)].slice(0, 3)
  return { answer, slots, facts: out, followups, ...(options ? { options } : {}), ...(degraded ? { degraded: true } : {}) }
}

// busy = 模型那头等不来字(停摆闸响/上游超时)。**不降级成事实清单**(2026-08-09 Frank 拍板
// 「不用降级 就显示稍后再试,系统繁忙」):等太久之后再塞一张表格,读的人只会更烦。
type ChatErrorCode = 'tooShort' | 'noOcc' | 'llm' | 'guard' | 'busy'

export class ChatError extends Error {
  code: ChatErrorCode
  slots?: Slots
  constructor(code: ChatErrorCode, msg: string, slots?: Slots) { super(msg); this.name = 'ChatError'; this.code = code; this.slots = slots }
}
