/**
 * 专业域的 HTTP 芯(第十一抽屉):/api/majors —— 访客四题第 2 题「读的什么专业」的取数口
 * (热门胶囊 / 搜索全部 CIP 2021 专业 / 按码回显)。公开只读;整表进程内缓存,三种筛法都在内存里做。
 * 表还没建(DDL 没跑)时回空清单(取数已留痕),不 500。
 * 2026-10-05 加选择器两支(专业题照掌上高考做):?cats=1 左栏大类清单、?cat=<键> 一个大类的树;同样随整表缓存,不每请求现算。
 *
 * @author Frank
 * @time 2026-10-04 02:14:05
 */
import { getDb } from '../db/server'
import { BAD_REQUEST } from '../http'
import { CODE_LEN_MAX, E_PARAM, P_CAT, P_CATS, P_CODE, P_Q, P_TOP, PARAM_NONE, Q_LEN_MAX } from './constants'
import { getMajorCats, getMajors, getMajorTree, majorOf, searchMajorsOf, topMajorsOf } from './functions'

/**
 * GET /api/majors:三条分支按参数分发(优先级 code → q → top):
 * ?code=52.0203 → { major }(查无此码是 null);?q=会计 → { majors }(英 / 中 / 韩名包含匹配,前 20);
 * ?top=1 → { majors }(热门清单,按名次)。
 * 2026-10-05 加两支,优先级改 code → q → cat → cats → top(原三支的行为不变):
 * ?cat=fin → { groups, singles }(不认识 / 不合形的键是空树,200);?cats=1 → { cats }(catOrder 序)。
 *
 * @param req 请求。
 * @returns 各分支的 json;五个参数都没带 400。
 */
export async function majorsRoute(req: Request): Promise<Response> {
  const sp = new URL(req.url).searchParams
  let code = PARAM_NONE
  const codeParam = sp.get(P_CODE)
  if (codeParam != null) {
    code = codeParam.trim().slice(0, CODE_LEN_MAX)
  }
  let q = PARAM_NONE
  const qParam = sp.get(P_Q)
  if (qParam != null) {
    q = qParam.trim().slice(0, Q_LEN_MAX)
  }
  let top = PARAM_NONE
  const topParam = sp.get(P_TOP)
  if (topParam != null) {
    top = topParam.trim()
  }
  let cat = PARAM_NONE
  const catParam = sp.get(P_CAT)
  if (catParam != null) {
    cat = catParam.trim()
  }
  let cats = PARAM_NONE
  const catsParam = sp.get(P_CATS)
  if (catsParam != null) {
    cats = catsParam.trim()
  }
  if (code === '' && q === '' && top === '' && cat === '' && cats === '') {
    return Response.json({ error: E_PARAM }, { status: BAD_REQUEST })
  }
  const db = await getDb()
  if (code !== '') {
    return Response.json({ major: majorOf({ rows: await getMajors(db), code: code }) })
  }
  if (q !== '') {
    return Response.json({ majors: searchMajorsOf({ rows: await getMajors(db), q: q }) })
  }
  if (cat !== '') {
    return Response.json(await getMajorTree({ db: db, cat: cat }))
  }
  if (cats !== '') {
    return Response.json({ cats: await getMajorCats(db) })
  }
  return Response.json({ majors: topMajorsOf(await getMajors(db)) })
}
