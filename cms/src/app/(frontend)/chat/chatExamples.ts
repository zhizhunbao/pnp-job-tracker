// D4 修复(docs/design/对话闭环总设计-20260809.md §2):挂件空态示例句三态动态化。
// 纯函数 —— 不摸网络/DOM,输入登录态+档案槽位(+ 只读 t 用来把省份/职业码译成人话),
// 输出 3 条「i18n key + params」,由 ChatBox 自己 t(key, params) 渲成句子。
// 三档(设计 §2 分批 A):
//   ① 匿名:ANON 三句写死,句句自带具体职业(保证不撞编排层 noOcc 闸,D1 撞过一次)。
//   ② 注册未建档:REG 三句写死但携带槽值示范(职业/CLB/目标省/PGWP)——句子本身就是
//      「边问边建档」的样本,用户照着改一改发出去,编排层就能从文本里抽到槽。
//   ③ 已建档:从真实档案生成,只挑「有值」的槽拼句;候选凑不满 3 条时用②档句子补位。
//      候选优先级对齐真人 33102 案例(docs/design/一键三合一判定-20260809.md §2):
//      PGWP 倒计时 → 职业×目标省(2 省起比对,1 省问有没有戏)→ 语言×目标省缺口。
//      🔴 三个候选**全部要求职业名可解析并织进句里**:编排层只有档案「写方向」(profileFill 回写),
//      没有「读方向」(档案槽不作抽槽输入)—— 句里无职业的首轮提问必撞 noOcc 闸(D1 只放行用法类问句)。
//      occ 解析不出 → 候选整条跳过,由②档句子补位(②档句句自带职业)。档案读方向归批C 判定层再议。
import { POPULAR_NOCS } from '../account/profileOptions'
import type { TFn } from '../jobs/i18n'

export type ChatProfile = {
  currentStatus?: string | null
  nocCodes?: string[] | null
  clb?: number | null
  crs?: number | null
  targetProvinces?: string[] | null
  pgwpMonthsLeft?: number | null
}

export type ExampleItem = { key: string; params?: Record<string, string | number> }

const ANON: ExampleItem[] = [{ key: 'chat.ex1' }, { key: 'chat.ex2' }, { key: 'chat.ex3' }]
const REG: ExampleItem[] = [{ key: 'chat.ex.reg1' }, { key: 'chat.ex.reg2' }, { key: 'chat.ex.reg3' }]

// NOC → 人话职业名:复用账户页已有的热门职业数据源(profileOptions.POPULAR_NOCS),不另开翻译表。
// 该源里少数标签带「中文名 / 英文缩写」(如 prof.job.psw),塞进整句会撞站规的禁「/」杂糅 ——
// 取斜杠前半截即可,不是新造一份数据。查不到的 NOC(热门集外)整条候选直接跳过,不瞎猜职业名。
const nocTitle = (t: TFn, code: string): string | null => {
  const key = POPULAR_NOCS.find((p) => p.noc === code)?.key
  if (!key) return null
  return t(key).split(' / ')[0].trim()
}

export function pickExamples(loggedIn: boolean, profile: ChatProfile | null | undefined, t: TFn): ExampleItem[] {
  if (!loggedIn) return ANON
  const p = profile ?? {}
  const provs = (p.targetProvinces ?? []).filter((x): x is string => !!x)
  const nocs = (p.nocCodes ?? []).filter((x): x is string => !!x)
  const occ = nocs.map((noc) => ({ noc, title: nocTitle(t, noc) })).find((x) => x.title)

  const cands: ExampleItem[] = []
  if (occ && p.pgwpMonthsLeft != null) {
    cands.push({ key: 'chat.ex.pgwp', params: { title: occ.title!, noc: occ.noc, m: p.pgwpMonthsLeft } })
  }
  if (occ && provs.length >= 2) {
    cands.push({ key: 'chat.ex.occCmp', params: { noc: occ.noc, title: occ.title!, prov: t('pr.' + provs[0]), prov2: t('pr.' + provs[1]) } })
  } else if (occ && provs.length === 1) {
    cands.push({ key: 'chat.ex.occProv', params: { noc: occ.noc, title: occ.title!, prov: t('pr.' + provs[0]) } })
  }
  if (occ && p.clb != null && provs.length >= 1) {
    cands.push({ key: 'chat.ex.clbProv', params: { title: occ.title!, noc: occ.noc, clb: p.clb, prov: t('pr.' + provs[0]) } })
  }

  const out = cands.slice(0, 3)
  for (const r of REG) {
    if (out.length >= 3) break
    out.push(r)
  }
  return out
}

// 埋点用短标签(track('chat-example', {kind}))—— 取 key 最后一段,'chat.ex.occProv' → 'occProv'
export const exampleKind = (key: string): string => key.split('.').pop() || key
