/**
 * advisor 域的 HTTP 芯(第十一抽屉):POST /api/advisor。
 * 与老 api/advisor 的行为级差异只有一个(设计文档「二、契约变更」):body.job 整包
 * **不再采信** —— 事实一律服务端现查(fetchJobById / loadNocDuties / loadProvince·CityCard /
 * companyRow),前端伪造「PNP-eligible: yes」的洞随之关闭;其余(闸、缓存、限流、
 * 前导话闸、响应头)逐字保形。生成走 pi 循环(runAdvisor):简单场景空工具集≈一发,
 * company 挂 web_fetch(2026-08-23 Frank 拍板全场景上循环)。
 *
 * 体内三处只能就地交代的点(routes 体内不落注释,记在这):
 * ① `await req.json() as AdvisorWire` 与 `user.profile as ProfileJson` 都是跨边界断言 ——
 *   前者网络 body 按声明形状收下逐格判后才用;后者是同一 jsonb 在 quota 与 jobs 两个域
 *   各自声明的视图,normalizeProfile 逐格收窄后才用。
 * ② 联网调查(companyRow/investigateCompany)套 try/catch:调查层任何异常不拦初判,
 *   降级路径 = 「资料不足」反编兜底(老链同口径,catch 回 null 留痕于 X 行为差)。
 * ③ 流式错误:pi 循环起流后才可能失败 —— 一个字都没吐时 controller.error(前端 read
 *   拒绝走 error 态),吐过字则收流;老链的 502 只存在于「连上游都连不上」那一刻,
 *   循环制下没有等价时点,eval 对拍盯前端可见行为。
 *
 * @author Frank
 * @time 2026-08-23 21:30:00
 */
import { getDb } from '../db/server'
import { BAD_REQUEST, NOT_FOUND, TOO_MANY } from '../http'
import { hasProfile, match, normalizeProfile, reasonEn, statusEn } from '../jobs'
import type { MatchDims, ProfileJson } from '../jobs'
import {
  fetchJobById, jobDescription, loadCityCard, loadMatchDims, loadProvinceCard,
} from '../jobs/server'
import { companyRow, investigateCompany } from '../employers/server'
import type { CompanyResearch } from '../employers/server'
import { loadNocDuties } from '../noc/server'
import { PRO_ADVISOR_DAILY } from '../quota'
import { checkLimit, freeGate, getUser, isPro } from '../quota/server'
import { friendLlmReady } from '../llm'
import {
  CACHE_HIT, CACHE_MISS, CO_NAME_LEN_MAX, E_BAD_JSON, E_LLM_DOWN, E_NOT_FOUND,
  E_RATE_LIMITED, ENV_DAILY_CAP, F_CITY_READ, F_COMPANY, F_IMMIGRATION, F_JD_READ, F_OCC_READ,
  F_PROV_READ, F_TITLE, GATE_BUF_MAX, GATE_MARK, GLOBAL_DAILY_CAP_DEFAULT, HTTP_RE, ID_SEP,
  JD_LEN_MAX, JD_NO, JD_YES, PREDICT_CHAT, PREDICT_COMPANY, PREDICT_DEFAULT, PREDICT_SIMPLE,
  PROV_CODE_RE, QUOTA_KEY_GLOBAL, QUOTA_KEY_PRO_PREFIX, SIMPLE_FIELDS,
} from './constants'
import {
  blankOf, cacheKeyOf, chatPromptOf, chatSystemOf, cityFactsOf, cleanMessages, headersOf, langOf,
  makeLocJob, makeOccJob, matchJobOf, profileFactsOf, promptOf, provFactsOf, readerCtxOf,
  runAdvisor, systemOf, toAdvisorJob, webFetchToolOf,
} from './functions'
import type { AdvisorJob, AdvisorWire, DeltaFn, ToolList, WebResearch } from './types'
import { CACHE } from './variables'

/**
 * POST /api/advisor:场景解读(初判 / 各速读 / 字段解释 / 多轮追问),纯文本流式回。
 * 顺序照老链:鉴权 → freeGate → 服务端取事实 → 档案/处境注入 → 缓存 → 成本限流 →
 * JD/联网调查 → pi 循环 → 前导话闸 → 缓存写回。
 *
 * @param req 请求(body 是 AdvisorWire)。
 * @returns 文本流;402/429 由闸给,400 坏 body,404 标识查无。
 */
export async function advisorRoute(req: Request): Promise<Response> {
  let wire: AdvisorWire
  try {
    wire = await req.json() as AdvisorWire
  } catch {
    return new Response(E_BAD_JSON, { status: BAD_REQUEST })
  }
  let field = F_TITLE
  if (typeof wire.field === 'string' && wire.field !== '') {
    field = wire.field
  }
  const lang = langOf(wire)
  let bodyId = ''
  if (typeof wire.id === 'string') {
    bodyId = wire.id
  }
  const messages = cleanMessages(wire)
  const isChat = messages.length > 0

  const user = await getUser(req.headers)
  const pro = isPro(user)
  const gate = freeGate({ user, headers: req.headers })
  if (gate.block != null) {
    return gate.block
  }

  const db = await getDb()
  let rawProfile: ProfileJson | null = null
  if (user != null && user.profile != null) {
    rawProfile = user.profile as ProfileJson
  }
  const p = normalizeProfile(rawProfile)
  const profileOk = pro && hasProfile(p)
  let dims: MatchDims = { pnpOccupations: [], eeCategories: [] }
  if (profileOk) {
    dims = await loadMatchDims(db)
  }

  let job: AdvisorJob | null = null
  let keyId = bodyId
  if (field === F_OCC_READ) {
    const duties = await loadNocDuties({ db, noc: bodyId })
    let d = ''
    let r = ''
    if (duties != null) {
      d = duties.duties
      r = duties.requirements
    }
    job = makeOccJob({ noc: bodyId, duties: d, requirements: r })
  } else if (field === F_PROV_READ) {
    const code = bodyId.toUpperCase()
    if (PROV_CODE_RE.test(code)) {
      const card = await loadProvinceCard({ db, code })
      let facts = ''
      if (card != null) {
        facts = provFactsOf({ code, card })
      }
      job = makeLocJob({ province: code, facts })
    }
  } else if (field === F_CITY_READ) {
    const parts = bodyId.split(ID_SEP)
    const city = blankOf(parts[0])
    const prov = blankOf(parts[1]).toUpperCase()
    const district = blankOf(parts[2])
    if (city !== '' && PROV_CODE_RE.test(prov)) {
      const card = await loadCityCard({ db, city, prov, district })
      job = makeLocJob({ province: prov, facts: cityFactsOf({ city, prov, district, card }) })
    }
  } else {
    const id = Number(bodyId)
    if (Number.isFinite(id)) {
      const row = await fetchJobById({ db, id, pro, profile: p, profileOk, matchDims: dims })
      if (row != null) {
        job = toAdvisorJob(row)
        if (field === F_COMPANY) {
          keyId = blankOf(job.company).toLowerCase()
        }
      }
    }
  }
  if (job == null) {
    return new Response(E_NOT_FOUND, { status: NOT_FOUND })
  }

  let pf = ''
  let userId: string | null = null
  if (user != null) {
    if (profileOk) {
      const m = match({ profile: p, job: matchJobOf(job), dims })
      pf = profileFactsOf({
        nocCodes: p.nocCodes, clb: p.clb, crs: p.crs, targetProvinces: p.targetProvinces,
        pgwpMonthsLeft: p.pgwpMonthsLeft, level: m.level, score: m.score, reasons: m.reasons.map(reasonEn),
      })
    }
    pf = pf + readerCtxOf(statusEn(p.currentStatus))
    if (pf !== '') {
      userId = String(user.id)
    }
  }

  const key = cacheKeyOf({ field, keyId, lang, userId })
  if (isChat === false) {
    const cached = CACHE.readsBy.get(key)
    if (cached != null) {
      return new Response(cached, { headers: headersOf({ gate: gate.headers, cache: CACHE_HIT, jd: null }) })
    }
  }

  const quotas: [string, number][] = [[QUOTA_KEY_GLOBAL, Number(process.env[ENV_DAILY_CAP] || GLOBAL_DAILY_CAP_DEFAULT)]]
  if (pro && user != null) {
    quotas.push([QUOTA_KEY_PRO_PREFIX + String(user.id), PRO_ADVISOR_DAILY])
  }
  if (checkLimit(quotas) === false) {
    return new Response(E_RATE_LIMITED, { status: TOO_MANY })
  }

  let jd = ''
  if (field === F_TITLE || field === F_IMMIGRATION || field === F_JD_READ || isChat) {
    jd = (await jobDescription({ db, applyUrl: blankOf(job.applyUrl).trim() })).slice(0, JD_LEN_MAX)
  }

  let web: WebResearch | null = null
  const coName = blankOf(job.company).trim()
  if (field === F_COMPANY && isChat === false && coName !== '' && coName.length <= CO_NAME_LEN_MAX && friendLlmReady()) {
    try {
      const row = await companyRow({ db, name: coName })
      if (row != null) {
        const hasStored = blankOf(job.companyDescription).trim() !== '' || blankOf(job.companySectors).trim() !== ''
        let research: CompanyResearch | null = row.cached
        if (research == null && hasStored === false) {
          research = await investigateCompany({ db, id: row.id, name: coName })
        }
        if (research != null) {
          web = { brief: research.brief, sources: research.sources }
        }
      }
    } catch {
      web = null
    }
  }

  let system = systemOf(lang)
  let prompt = ''
  if (isChat) {
    system = chatSystemOf({ job, jd, lang, pf })
    prompt = chatPromptOf({ messages })
  } else {
    prompt = promptOf({ field, job, jd, lang, pf, web })
  }

  let numPredict = PREDICT_DEFAULT
  if (isChat) {
    numPredict = PREDICT_CHAT
  } else if (SIMPLE_FIELDS.includes(field)) {
    numPredict = PREDICT_SIMPLE
  } else if (field === F_COMPANY) {
    numPredict = PREDICT_COMPANY
  }

  let tools: ToolList = []
  if (field === F_COMPANY && isChat === false && HTTP_RE.test(blankOf(job.officialUrl))) {
    tools = webFetchToolOf({ url: blankOf(job.officialUrl) })
  }

  const gated = field === F_COMPANY && isChat === false
  const state = { open: gated === false, buf: '', full: '' }
  const enc = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller): void {
      function emit(text: string): void {
        if (text === '') {
          return
        }
        state.full += text
        controller.enqueue(enc.encode(text))
      }

      const onDelta: DeltaFn = function gateDelta(chunk: string): void {
        if (state.open) {
          emit(chunk)
          return
        }
        state.buf += chunk
        const i = state.buf.indexOf(GATE_MARK)
        if (i >= 0) {
          state.open = true
          emit(state.buf.slice(i))
          state.buf = ''
        } else if (state.buf.length > GATE_BUF_MAX) {
          state.open = true
          emit(state.buf)
          state.buf = ''
        }
      }

      function done(): void {
        if (state.open === false && state.buf !== '') {
          emit(state.buf)
        }
        if (isChat === false && state.full.trim() !== '') {
          CACHE.readsBy.set(key, state.full)
        }
        controller.close()
      }

      function failed(): void {
        if (state.full === '') {
          controller.error(new Error(E_LLM_DOWN))
          return
        }
        controller.close()
      }
      runAdvisor({ system, prompt, tools, maxTokens: numPredict, onDelta }).then(done).catch(failed)
    },
  })
  let jdMark = JD_NO
  if (jd !== '') {
    jdMark = JD_YES
  }
  return new Response(stream, { headers: headersOf({ gate: gate.headers, cache: CACHE_MISS, jd: jdMark }) })
}
