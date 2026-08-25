/**
 * 判定域的 HTTP 芯(第十一抽屉):/api/ruling/verdict(一键三合一判定卡)与
 * /api/ruling/pathways(职位详情页通道卡)。/api/ruling/profile(PR 问卷初筛)的
 * 翻译层 parseProfileBody、组装层 buildProfileWire 全在 functions,芯只管取数与回传。
 * rulingVerdictPostRoute 体内 `await req.json() as VerdictBody` 是跨边界断言:
 * 网络来的 body 先按声明形状收下,逐格判后才用。
 *
 * @author Frank
 * @time 2026-08-23 05:40:00
 */
import { BAD_REQUEST } from '../http'
import { getDb } from '../db/server'
import { getUser, isPro } from '../quota/server'
import { loadOccCompetition } from '../jobs/server'
import { loadPilotQuota } from '../pathways/server'
import { E_ANSWERS_REQUIRED, E_NOC_REQUIRED, NOC5_RE, NO_TEXT, P_JOB, P_NOC, P_TEER, TEER_MAX } from './constants'
import { buildProfileWire, getVerdictData, jobPathways, loadProvinceCompetition, parseProfileBody, tripleWireOf } from './functions'
import type { ClientAnswers, ProfileBody, TripleWireResult, VerdictBody } from './types'

/**
 * GET /api/ruling/verdict?job=<id>:#287 一键三合一判定卡(批D),无档案态。
 * 组装与付费闸都在判定域(同一份 wire 也给 /plan/pr 的 SSR 首屏用,两处同一条口径 ——
 * 一处改口径另一处跟不上,是最容易静默漂的那种 bug)。
 *
 * @param req 请求(?job=岗位 id)。
 * @returns 三合一判定卡 json;域层裁决的错误照其状态码回。
 */
export async function rulingVerdictGetRoute(req: Request): Promise<Response> {
  function nullSession(_e: Error): null {
    return null
  }
  const user = await getUser(req.headers).catch(nullSession)
  return wireRespond(await tripleWireOf({ id: Number(new URL(req.url).searchParams.get(P_JOB)), answers: null, user: user, pro: isPro(user) }))
}

/**
 * POST /api/ruling/verdict:同上,带本地答案 —— 匿名可用(2026-08-12 Frank「匿名也可以
 * 访问」),个人关靠答案才判得出来。登录用户的服务端档案逐槽优先,答案只补它缺的那几样 ——
 * 落过档的不被本地旧答案覆盖。
 *
 * @param req 请求(body 是 { job, answers })。
 * @returns 三合一判定卡 json。
 */
export async function rulingVerdictPostRoute(req: Request): Promise<Response> {
  let body: VerdictBody | null = null
  try {
    body = await req.json() as VerdictBody
  } catch {
    body = null
  }
  let id = Number.NaN
  let answers: ClientAnswers = null
  if (body != null) {
    id = Number(body.job)
    if (typeof body.answers === 'object' && body.answers != null) {
      answers = body.answers
    }
  }
  function nullSession(_e: Error): null {
    return null
  }
  const user = await getUser(req.headers).catch(nullSession)
  return wireRespond(await tripleWireOf({ id: id, answers: answers, user: user, pro: isPro(user) }))
}

/**
 * GET /api/ruling/pathways?noc=72310&teer=2:职位详情页通道卡(C6)的只读数据。
 * 返回 13 条通道的职业级事实(经验门槛月数/口径/清单点名/清单排除),不含任何个人档案 ——
 * 个性化排序在对话里(pathVerdict),卡片无档案态只做通用序。
 * 详情页是全站流量最大的页,判定层六张表禁每请求现算(prod-pool-wedge 教训)——
 * getVerdictData 的进程内 10 分钟缓存与 /api/ruling/verdict 共用同一份。
 * 门槛表空(库还没灌)= 本站缺口 → 空名单,卡片整卡不渲,不出空壳。
 *
 * @param req 请求(?noc=五位码 &teer=0..5)。
 * @returns { rows };noc 非法 400。
 */
export async function rulingPathwaysRoute(req: Request): Promise<Response> {
  const sp = new URL(req.url).searchParams
  let noc = NO_TEXT
  const nocParam = sp.get(P_NOC)
  if (nocParam != null) {
    noc = nocParam.trim()
  }
  if (NOC5_RE.test(noc) === false) {
    return Response.json({ error: E_NOC_REQUIRED }, { status: BAD_REQUEST })
  }
  const teerRaw = Number(sp.get(P_TEER))
  let teer: number | null = null
  if (Number.isInteger(teerRaw) && teerRaw >= 0 && teerRaw <= TEER_MAX) {
    teer = teerRaw
  }
  const data = await getVerdictData()
  if (data.requirements.length === 0) {
    return Response.json({ rows: [] })
  }
  return Response.json({ rows: jobPathways({ noc: noc, teer: teer, data: data }) })
}

/**
 * 判定 wire → 响应(GET 与 POST 共用;域层的错误照其状态码回)。
 *
 * @param wire 判定域组装好的 wire 或错误。
 * @returns 响应。
 */
// eslint-disable-next-line local/routes-shape -- GET/POST 两个 handler 共用的收尾小件,非 HTTP 芯本体
function wireRespond(wire: TripleWireResult): Response {
  // eslint-disable-next-line local/no-bare-strings -- `in` 的类型窄化只认字面量(TS 限制):提成常量后 WireError 分支就窄化不出来了
  if ('error' in wire) {
    return Response.json({ error: wire.error }, { status: wire.status })
  }
  return Response.json(wire)
}

/**
 * POST /api/ruling/profile：PR 问卷完成后的个人路径初筛。只把统一题库答案翻成
 * VerdictProfile 再调判定层；不依赖具体职位或雇主（具体岗位判定仍走
 * /api/ruling/verdict，作为第二层验证）。翻译/验形/组装的口径决策全在
 * parseProfileBody 与 buildProfileWire 的 JSDoc 里，芯只做四样取数与回传。
 * nocs 全量回传（2026-08-16「要支持多个职位类别」）。
 *
 * @param req 请求（body 是 { answers, ticks, rows, wage, areaI }）。
 * @returns { noc, nocs, rows, excluded, outside }；缺答案包/缺职业码 400。
 */
export async function rulingProfileRoute(req: Request): Promise<Response> {
  let body: ProfileBody | null = null
  try {
    body = await req.json() as ProfileBody
  } catch {
    body = null
  }
  const parsed = parseProfileBody(body)
  if (parsed == null) {
    return Response.json({ error: E_ANSWERS_REQUIRED }, { status: BAD_REQUEST })
  }
  if (parsed.noc === '') {
    return Response.json({ error: E_NOC_REQUIRED }, { status: BAD_REQUEST })
  }
  let occNocs = parsed.nocs
  if (occNocs.length === 0) {
    occNocs = [parsed.noc]
  }
  const db = await getDb()
  const [data, comp, occRows, pilotQuota] = await Promise.all([
    getVerdictData(), loadProvinceCompetition(db),
    loadOccCompetition({ db: db, nocs: occNocs }), loadPilotQuota(db),
  ])
  const wire = buildProfileWire({
    profile: parsed.profile, data: data, comp: comp,
    occRows: occRows, pilotQuota: pilotQuota, targets: parsed.targets,
  })
  return Response.json({ noc: parsed.noc, nocs: occNocs, rows: wire.rows, excluded: wire.excluded, outside: wire.outside })
}
