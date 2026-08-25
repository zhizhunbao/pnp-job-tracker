/**
 * 答题域的 HTTP 芯(第十一抽屉):/api/quiz(入口三问的只读分发器)与
 * /api/quiz/answers(答案档存取,2026-08-15 Frank「答案入库绑账号」)。
 * 分发器四条分支的进程内缓存全在 CACHE(variables);热门清单的 SWR 缓存件也住本文件
 * (instrumentation 预热与请求路径写同一份状态)。
 * 答案红线:答案是用户隐私,只回本人 —— id 一律取自 cookie 鉴权结果,不收任何参数。
 * quizAnswersPutRoute 体内 `await req.json() as AnswersBody` 是跨边界断言:
 * 网络来的 body 先按声明形状收下,逐格判空验形后才用。
 *
 * @author Frank
 * @time 2026-08-19 02:12:57
 */
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getDb } from '../db/server'
import { BAD_REQUEST, TOO_LARGE, UNAUTHORIZED } from '../http'
import { loadBroadNocs, loadNocOpenCounts, loadQuizFacts, loadTopNocs, searchNocByTitle } from '../jobs/server'
import { getTopNocsCached, makeFactsStore, swallowFactsError } from './functions'
import { getUserOrNull } from '../quota/server'
import {
  ANSWERS_LEN_MAX, BROAD_CACHE_MAX, BROAD_LEN_MAX, BROAD_LIMIT, COUNTS_CACHE_MAX, COUNTS_N_MAX, COUNTS_SEP,
  E_AUTH, E_BAD, E_PARAM, E_TOO_BIG, FACTS_CACHE_MAX, PARAM_NONE, P_BROAD, P_COUNTS, P_NOC, P_Q, P_TOP, Q_LEN_MAX,
  TOP_N_DEFAULT, TTL,
} from './constants'
import { loadAnswers, saveAnswers } from './functions'
import { CACHE } from './variables'
import type {
  AnswersBody, DropFn, FactsStoreFn, FirstStoreFn, Json, StoreFn, TopOut, TopRows, UnflagFn,
} from './types'
import type { Db } from '../db'

/**
 * GET /api/quiz:入口三问的只读分发器(付费漏斗重设计-20260726)。匿名可用 ——
 * 结果本就免费,注册闸在结果之后。五条分支按参数分发:
 * ?q=厨师 → 职业搜索(NOC 候选);?broad=技工 → 点中大类后取该类清单(TTL 缓存);
 * ?top=N → 按在招量排的热门职业(SWR,4 万岗 GROUP BY 实测 3.6s 必须缓存);
 * ?counts=a,b → 这些 NOC 的在招/可提名数(第 2 题热门按钮挂真数,TTL 缓存);
 * ?noc=63200 → 免费事实卡(SWR:命中含过期先回,过期删格后台刷;零在招回 null 是正常态)。
 *
 * @param req 请求。
 * @returns 各分支的 json;主参数全缺 400。
 */
// eslint-disable-next-line local/function-length -- 五分支分发器:每支 4~10 行各自完结、互不共享中间量;拆出去每支都得带 db + 缓存格两个参(违 one-parameter)或再造五个 In 型,读的人反而要翻
export async function quizRoute(req: Request): Promise<Response> {
  const sp = new URL(req.url).searchParams
  const db = await getDb()
  let q = PARAM_NONE
  const qParam = sp.get(P_Q)
  if (qParam != null) {
    q = qParam.slice(0, Q_LEN_MAX)
  }
  if (q !== '') {
    return Response.json({ candidates: await searchNocByTitle({ db: db, q: q }) })
  }
  let broad = PARAM_NONE
  const broadParam = sp.get(P_BROAD)
  if (broadParam != null) {
    broad = broadParam.trim().slice(0, BROAD_LEN_MAX)
  }
  if (broad !== '') {
    const bHit = CACHE.broadBy.get(broad)
    if (bHit != null && Date.now() - bHit.at < TTL) {
      return Response.json({ top: bHit.rows })
    }
    const rows = await loadBroadNocs({ db: db, broad: broad, limit: BROAD_LIMIT })
    if (CACHE.broadBy.size >= BROAD_CACHE_MAX) {
      CACHE.broadBy.clear()
    }
    CACHE.broadBy.set(broad, { at: Date.now(), rows: rows })
    return Response.json({ top: rows })
  }
  const topParam = sp.get(P_TOP)
  if (topParam != null && topParam !== '') {
    let n = Number(topParam)
    if (Number.isFinite(n) === false || n <= 0) {
      n = TOP_N_DEFAULT
    }
    return Response.json({ top: await getTopNocsCached({ db: db, n: n, load: loadTopNocs }) })
  }
  const countsParam = sp.get(P_COUNTS)
  const countsList: string[] = []
  if (countsParam != null) {
    for (const piece of countsParam.split(COUNTS_SEP)) {
      const c = piece.trim()
      if (c !== '' && countsList.length < COUNTS_N_MAX) {
        countsList.push(c)
      }
    }
  }
  if (countsList.length > 0) {
    const key = countsList.slice().sort().join(COUNTS_SEP)
    const cHit = CACHE.countsBy.get(key)
    if (cHit != null && Date.now() - cHit.at < TTL) {
      return Response.json({ counts: cHit.counts })
    }
    const counts = await loadNocOpenCounts({ db: db, nocs: countsList })
    if (CACHE.countsBy.size >= COUNTS_CACHE_MAX) {
      CACHE.countsBy.clear()
    }
    CACHE.countsBy.set(key, { at: Date.now(), counts: counts })
    return Response.json({ counts: counts })
  }
  let noc = PARAM_NONE
  const nocParam = sp.get(P_NOC)
  if (nocParam != null) {
    noc = nocParam.trim()
  }
  if (noc === '') {
    return Response.json({ error: E_PARAM }, { status: BAD_REQUEST })
  }
  const fHit = CACHE.factsBy.get(noc)
  if (fHit != null) {
    if (Date.now() - fHit.at >= TTL) {
      CACHE.factsBy.delete(noc)
      loadQuizFacts({ db: db, noc: noc }).then(makeFactsStore(noc)).catch(swallowFactsError)
    }
    return Response.json({ facts: fHit.facts })
  }
  const facts = await loadQuizFacts({ db: db, noc: noc })
  if (facts != null && CACHE.factsBy.size < FACTS_CACHE_MAX) {
    CACHE.factsBy.set(noc, { at: Date.now(), facts: facts })
  }
  return Response.json({ facts: facts })
}

/**
 * GET /api/quiz/answers:取本人答案档。注册闸文案 dp.authGate「注册后答案自动存档」,
 * 存的就是这份:users.answers(jsonb,列由 docs/sql/account-answers.sql 手写添加)。
 *
 * @param _req 请求(不读参数;身份从 cookie 头取)。
 * @returns { answers };未登录 401。
 */
export async function quizAnswersGetRoute(_req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  const payload = await getPayload({ config: await config })
  const answers = await loadAnswers({ payload: payload, userId: user.id })
  return Response.json({ answers })
}

/**
 * PUT /api/quiz/answers:整档覆盖,body={basic,score},服务端补 updatedAt。
 * 合并判新旧(新者胜)在客户端 —— 本端点只做存取,不做裁决。POST 是它的 beacon 别名
 * (2026-08-16:sendBeacon 只能 POST,送的和 PUT 一模一样;没有它「答完最后一题就
 * 关页面」那一下会丢)—— 壳里同一 handler 挂两个方法。
 *
 * @param req 请求(body 是两份答案档)。
 * @returns { ok, updatedAt };未登录 401、形状不对 400、超 64KB 413。
 */
export async function quizAnswersPutRoute(req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  let body: AnswersBody | null = null
  try {
    body = await req.json() as AnswersBody
  } catch {
    body = null
  }
  let basic: Json | null = null
  let score: Json | null = null
  if (body != null) {
    if (typeof body.basic === 'object' && body.basic != null) {
      basic = body.basic
    }
    if (typeof body.score === 'object' && body.score != null) {
      score = body.score
    }
  }
  if (basic == null || score == null) {
    return Response.json({ error: E_BAD }, { status: BAD_REQUEST })
  }
  if (JSON.stringify(body).length > ANSWERS_LEN_MAX) {
    return Response.json({ error: E_TOO_BIG }, { status: TOO_LARGE })
  }
  const updatedAt = new Date().toISOString()
  const payload = await getPayload({ config: await config })
  await saveAnswers({ payload: payload, userId: user.id, basic: basic, score: score, updatedAt: updatedAt })
  return Response.json({ ok: true, updatedAt })
}
