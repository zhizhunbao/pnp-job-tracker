/**
 * 病例卡登记表(对话评测批,docs/implementation/对话闭环-批AB/07_对话评测批.md §8)——机器版。
 *
 * 测试域资产(Case-Harness §2.1 硬边界):生产包不引用,不进 cms/src。
 * 症状一律是 STATUS/实施文档在册的**实测原文**,不许登推测。
 * 维护规矩:新病灶一经实测,先登卡再修;状态翻 treated 必须指到恒绿网用例,指不到不许翻。
 *
 * 检查器(checkCards)只做「一眼可判」的机械检查——省名对不上事实、未收录被编成推断、
 * 自述被当主张……判不动的(K04 口径压扁)只在报告里把全文摆给人读,不硬装成机器结论
 * (判定层铁律同款:LLM/正则都不下它下不了的结论)。
 */

export type CardLayer = 'slots' | 'synth' | 'gate' | 'facts' | 'ops'
export type CardStatus = 'treated' | 'partial' | 'open' | 'ops'
export type DiseaseCard = {
  id: string
  symptom: string
  layer: CardLayer
  status: CardStatus
  /** 恒绿网用例 / 批跑检查器指针(人读) */
  guard: string
}

export const DISEASE_CARDS: DiseaseCard[] = [
  { id: 'K01', layer: 'synth', status: 'treated',
    symptom: '把没答过的经验/CRS 说成「你的」(08-09 批A 实测三句原句=chatGuardAttr 金标 BAD1-3,闸A 即为治它而建)',
    guard: '闸A 金标=chatGuardAttr.int.spec 三句产原句+中文态两查;批跑残留=sentenceBlockers 复跑,attr 类命中记 K01' },
  { id: 'K02', layer: 'synth', status: 'open',
    symptom: '「本站未收录…表明其不在特定类别抽选中」——未收录被编成否定推断(08-04 实测)',
    guard: 'eval 检查器(未收录+推断连词句式);根治=Case-Harness D3 availability 一等字段' },
  { id: 'K03', layer: 'synth', status: 'treated',
    symptom: '省名串台:「新不伦瑞克省 NL NLPNP International Graduate」;基线 R08 凭空冒 NB(治病批 08 治)',
    guard: 'findAlienProvinces 逐句闸+fired provDrift 硬拦;chatCure.int.spec 金标;盲区=同在 facts 的两省方向说反(语义,不装作能管);eval 检查器保持当第二眼' },
  { id: 'K04', layer: 'synth', status: 'open',
    symptom: '「要求这份工作至少给到中位」压成「申请人年薪门槛」——口径压扁(chat_logs #36/#37 同串实测)',
    guard: 'eval 检查器(申请人+年薪+门槛连写)+ 报告全文人审' },
  { id: 'K05', layer: 'slots', status: 'treated',
    symptom: '「手里的 PGWP 还有效」被抽成 claims;基线 R11 点选卡 sendText「我持有有效的 PGWP 工签」同病(治病批 08 治 claims 半边;「没触发裁决」=status 抽取方差另记)',
    guard: 'isSelfStatement 扩身份自述(SELF_STATUS_RE);chatCure.int.spec 金标;eval 检查器保持当第二眼' },
  { id: 'K06', layer: 'slots', status: 'treated',
    symptom: '自家 assistant 历史被抽成 claims,门槛行被当中介报价回怼(chat_logs #36/#37 实录)',
    guard: '60 字硬闸(orchestrate);chatVerdict.int.spec 回归(误抽的死、真主张活)' },
  { id: 'K07', layer: 'gate', status: 'treated',
    symptom: 'echo「CLB 6」放行「short by 6 months」——数字同、单位类不同的漏缝',
    guard: '闸B findUnitMismatch;chatGuardAttr.int.spec 金标' },
  { id: 'K08', layer: 'slots', status: 'treated',
    symptom: '「33102 (PSW)」裸码开头被抽槽模型抄成 31102(chat_logs #94 实录;基线 R18 两跑同错;治病批 08 治)',
    guard: 'bareNocCandidates+noc_descriptions 验真压过模型(裸码扩围带库验证记账销);chatCure.int.spec 金标;模板侧=chatExamples 回归;corpus R18 活体在守' },
  { id: 'K09', layer: 'ops', status: 'ops',
    symptom: '朋友服务 prompt 前缀缓存:同题重问返回旧稿(08-05 实测)',
    guard: '运维卡:批跑器不改用户原文不加 cache-buster;生产验收换句式;服务侧谈缓存开关' },
  { id: 'K10', layer: 'facts', status: 'treated',
    symptom: 'availability 占位符当人话喂出→英文把「一个 EE 类别都不在」说反成「都能走」',
    guard: 'AVAIL_SENTENCE 成句;chatOrchestrate.int.spec ① 组+findLeaks 恒绿网在守' },
  { id: 'K11', layer: 'gate', status: 'treated',
    symptom: '追问轮短答「没工作」被 tooShort 误杀;「护士」二字冷启动被四字门误杀(chat_logs #52/#104 实录)',
    guard: 'isFollowupTurn 放行+首轮 CJK≥2;chatGate.int.spec 回归;corpus R15/R16 活体复验' },
  { id: 'K12', layer: 'synth', status: 'open',
    symptom: '组稿偶发不点名 tier0 最快通道(PLAYBOOK 是提示词不是闸,08-05 实测)',
    guard: 'corpus 金标句 mustMatch(C01 形状答复须点名 tier0 通道);根治候选=结论句模板化(批C 记账)' },
  { id: 'K13', layer: 'slots', status: 'open',
    symptom: '反问轮自己猜 NOC:「studying IT」句抽槽落了 41101(08-09 基线批跑 chatGold 实录;活体金标历史红的真身)',
    guard: 'chatGold.eval.spec「反问轮绝不许自己猜一个 NOC」断言在批跑层守;发生率看逐轮基线' },
]

// ── 检查器 ───────────────────────────────────────────────────────────────────

export type CardHit = { card: string; detail: string }
export type EvalOutcome = {
  /** 本轮之前所有 user 原话 + 本轮原话(省名来源之一:他自己提过的省不算串台) */
  questions: string
  answer: string
  /** facts 的 label+valueText 拼接(省名来源之二) */
  factsText: string
  lang: 'zh' | 'en' | 'ko'
  claims: { text: string }[]
  /** sentenceBlockers 复跑的残留(引擎出口闸的第二双眼睛) */
  residual: string[]
}

/** 省名词表:code 正则区分大小写(\bON\b 不许命中英文 on),全名不区分。 */
const PROVS: [string, RegExp, RegExp][] = [
  ['AB', /\bAB\b/, /Alberta|阿尔伯塔|阿省|앨버타/i],
  ['BC', /\bBC\b/, /British Columbia|不列颠哥伦比亚|卑诗|비씨|브리티시/i],
  ['MB', /\bMB\b/, /Manitoba|曼尼托巴|曼省|매니토바/i],
  ['SK', /\bSK\b/, /Saskatchewan|萨斯喀彻温|萨省|서스캐처원/i],
  ['ON', /\bON\b/, /Ontario|安大略|安省|온타리오/i],
  ['QC', /\bQC\b/, /Quebec|Québec|魁北克|퀘벡/i],
  ['NB', /\bNB\b/, /New Brunswick|新不伦瑞克|新布伦瑞克|뉴브런즈윅/i],
  ['NS', /\bNS\b/, /Nova Scotia|新斯科舍|노바스코샤/i],
  ['NL', /\bNL\b/, /Newfoundland|纽芬兰|뉴펀들랜드/i],
  ['PE', /\bPE\b|\bPEI\b/, /Prince Edward|爱德华王子岛|프린스에드워드/i],
  ['YT', /\bYT\b/, /Yukon|育空/i],
  ['NT', /\bNT\b/, /Northwest Territories|西北地区/i],
  ['NU', /\bNU\b/, /Nunavut|努纳武特/i],
]
const provsIn = (s: string): Set<string> => {
  const out = new Set<string>()
  for (const [code, codeRe, nameRe] of PROVS) if (codeRe.test(s) || nameRe.test(s)) out.add(code)
  return out
}

/** K02:未收录/not indexed 后面跟推断连词 = 把「本站缺口」编成了「官方否定」。 */
const K02_RE = [
  /(?:尚?未收录|没有收录|未收錄)[^。;!?\n]{0,40}(?:表明|说明|意味着|因此|所以|证明)/,
  /not (?:indexed|collected|recorded)[^.!?\n]{0,60}(?:indicates?|suggests?|means|therefore|proves?)/i,
]

/** K04:把岗位工资口径写成申请人的年薪门槛。 */
const K04_RE = /(?:申请人|applicant)[^。.!?\n]{0,10}(?:年薪|薪资|工资|salary|wage)[^。.!?\n]{0,8}(?:门槛|threshold|requirement)/i

/** K05:claims 应装「别人对他说的话」;第一人称自述句进了 claims = 抽槽装错桶。 */
const K05_RE = /^\s*(?:我|本人|I\s|I'm\b|I've\b)/i

export function checkCards(o: EvalOutcome): CardHit[] {
  const hits: CardHit[] = []
  for (const r of o.residual) {
    if (/^(?:exp|crs|clb|age|edu|status):/.test(r)) hits.push({ card: 'K01', detail: `闸A 残留:${r}` })
  }
  for (const re of K02_RE) {
    const m = re.exec(o.answer)
    if (m) hits.push({ card: 'K02', detail: `未收录被编成推断:「${m[0].slice(0, 60)}」` })
  }
  const allowed = provsIn(o.factsText + '\n' + o.questions)
  for (const p of provsIn(o.answer)) {
    if (!allowed.has(p)) hits.push({ card: 'K03', detail: `答复提及 ${p},facts 与问句均无此省` })
  }
  const k4 = K04_RE.exec(o.answer)
  if (k4) hits.push({ card: 'K04', detail: `疑似口径压扁:「${k4[0].slice(0, 60)}」` })
  for (const c of o.claims) {
    if (K05_RE.test(c.text)) hits.push({ card: 'K05', detail: `第一人称自述进了 claims:「${c.text.slice(0, 40)}」` })
  }
  return hits
}
