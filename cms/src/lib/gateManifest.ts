// 门槛闸的**词汇表** —— 类型与人话名(设计:docs/design/通道判定口径根治-20260812.md §3.1)。
//
// 🔴 这一层回答的是「**闸有哪几类、每类怎么记**」;**哪条通道有哪几道闸**已于 2026-08-15 搬进
//    `lib/pathways/<通道>.ts`(一条通道一个文件,Frank「不要混在一起」),读它请走 `pathways` 的 gateOf。
//    闸的**数值**(CLB 6 / 24 个月)一律在 pnp_requirements,两处都不许抄数字。
//
// 为什么要有「闸的清单」这一层:判定核只看门槛行的话,只能发现「它有行的那些门槛里你缺哪一项」,
// 发现不了「它压根没有行的那类门槛」—— 于是「没有行 ⇒ 没有闸 ⇒ open」,实测五个画像 15 条结论
// 全是「能走」,含「从没来过加拿大的海外护士 → NLPNP 国际毕业生排进前三」。
//
// 取证方式(铁律 URL→数据→SQL):策略文件里的每一句 quote 都来自 `data/crawl/<slug>/html_cache`
// 的官方页,用 `etl/scan_gate_quotes.py` 捞候选句后人工核定。**不猜 URL、不凭印象、不拿文档记忆当库。**
//
// 三态与举证责任:
//   required     —— 官方明写要(必带 quote)
//   notRequired  —— ① 官方明写不要(带 quote);或 ② **读过该通道的资格页、页上没有这一类闸**
//                   (带 url+fetched,basis='absent')。后者是可证伪的断言:我们指名读了哪一页、哪天读的。
//   unknown      —— 没有资格页可读,**或**该页自己声明「完整条件见别处」而别处没抓到 → 本站未收录。
//                   与「官方不要求」意思相反(CLAUDE.md 铁律),不许混。

export type GateKey = 'offer' | 'statusInCanada' | 'credentialCanada' | 'fieldMatch' | 'french'

/** statusInCanada 闸「问的是什么」(2026-08-15 拆分)。「境内身份」一个词底下其实是三种官方要求:
 *  AB/PE 要**有效工签**、NL 指名 **PGWP**、NB/MB 要**住在/受雇于该省** —— 先前统统拿
 *  「人在不在加拿大」(inCanada)判,于是学签在读被 AB 的工签闸放行、安省居民被 MB 的
 *  「曼省在职」闸放行。required 的 statusInCanada 闸必须标注,引擎按标注去档案里取对应的答案。 */
export type StatusAsk = 'workPermit' | 'pgwp' | 'provResidence' | 'provEmployment'

export type GateRule =
  | { need: 'required'; quote: string; url: string; fetched: string; note?: string; asks?: StatusAsk }
  | { need: 'notRequired'; quote: string; url: string; fetched: string; note?: string }
  | { need: 'notRequired'; basis: 'absent'; url: string; fetched: string; note?: string }
  | { need: 'unknown'; why: 'no-source' | 'criteria-elsewhere'; url?: string; fetched?: string; note?: string }

/** 三类闸的人话名(题面与结论共用一份,前端不另写) */
export const GATE_LABEL: Record<GateKey, { zh: string; en: string; ko: string }> = {
  offer: { zh: 'job offer', en: 'job offer', ko: '잡 오퍼' },
  statusInCanada: { zh: '境内身份', en: 'status in Canada', ko: '캐나다 체류 신분' },
  credentialCanada: { zh: '加拿大学历', en: 'Canadian credential', ko: '캐나다 학력' },
  // 2026-08-15 第四类闸(Frank「毕业生干厨师靠谱吗?跨专业了怎么弄」):NL 国际毕业生官方要求
  // 岗位与所学专业相关。先前只是一枚灰提醒胶囊,答不上就当没有障碍 —— 与工签闸同一种病,收成真闸。
  fieldMatch: { zh: '专业对口', en: 'field of study match', ko: '전공 일치' },
  // 2026-08-15 第五类闸:FCIP 要 NCLC 5 **法语**四项。站里那道语言题问的是 CLB(英语的尺子),
  // 拿它当 NCLC 用 = 把不会法语的人判成达标再推去法语社区,故单开一闸、单问一题。
  french: { zh: '法语 NCLC 5', en: 'French NCLC 5', ko: '프랑스어 NCLC 5' },
}

/** statusInCanada 按 asks 拆开后的人话名(结论文案用它,不再统称「境内身份」) */
export const ASK_LABEL: Record<StatusAsk, { zh: string; en: string; ko: string }> = {
  workPermit: { zh: '有效工签', en: 'work permit', ko: '유효한 취업 허가' },
  pgwp: { zh: '毕业工签 PGWP', en: 'PGWP', ko: 'PGWP' },
  provResidence: { zh: '在该省居住', en: 'residence in the province', ko: '해당 주 거주' },
  provEmployment: { zh: '在该省在职', en: 'employment in the province', ko: '해당 주 재직' },
}
