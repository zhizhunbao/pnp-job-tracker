/**
 * pnp 域的桶 —— 省提名(PNP)与联邦 EE 的事实区块:通道清单、本省抽选、职业类别、
 * AIP 背书、匹配判定。红线在这个域里落地 ——
 * **粗筛信号,不是资格认定**:命中与否都只陈列官方事实与出处。
 * 消费者跨了三个页面域(职位板的 EE 休眠判定、公司页的背书卡、字段顾问的事实块),
 * 所以它自己成域,不再寄住在 jobs。
 * 2026-08-28 自 components/jobs 拆域迁入(Pnp.tsx 原样搬;PathwaysCard.tsx 同批查实
 * 全仓零代码消费者 —— 入口早已按 Frank「没人点」摘除 —— 带证退役删除);
 * 同日换装批整体重写成小写件形制:排版拆成 22 个小件一件一文件、状态收进 hooks.ts、
 * 内联样式与 main.css 第 16 段整段抄进 pnp.module.css、裸 <a>/<button> 改经 button 族。
 * 🔴 桶门这 13 个名字与签名**冻结**:消费者是还没换装的 jobs 旧件与字段顾问,归波 B。
 * 域内小件(抽选行/清单行/判定卡/依据链的格)不出桶。
 *
 * ── 本域退役过的两件(记录随换装批自 Pnp.tsx 迁来,一字未改)──
 * 2026-07-26:「移民通道」钮下架后,批A #134 的三行直判汇总卡(ChannelVerdicts)随之退役 ——
 * 它是 PNP/EE/AIP 三列的汇总,而三列各自点开就有更具体的弹框(命中清单名、清单展开、本省公告)。
 * 想拿回来:revert 那次 commit 即可(组件全文在 git 史里)。
 * 2026-07-26 Frank「移民通道…没必要显示,内容放到其他字段」:E12-08 三维档拆解弹框整块退役 ——
 * 通道档=PNP/EE/AIP 三列已逐条直判、薪资质量=vs 中位列、雇佣质量=雇佣列,三行全是重复
 * (一条信息只出现一次)。档位数据照常入库(排序/筛选仍用),只是不再单独占一个弹框与一枚按钮;
 * 唯一调用方没了,/api/scoredetail 同批下架(免费额度池少一个消费端,池子本身不变)。
 * 对应 lib 域:lib/pathways、lib/jobs(match 一族)。
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */
export { EeCategorySection } from './eecategorysection'
export { MeansForMe } from './meansforme'
export { NewsLatestBlock } from './newslatestblock'
export { PnpDrawsBlock } from './pnpdrawsblock'
export { PnpListSection } from './pnplistsection'
export { SponsorLeadCard } from './sponsorleadcard'
export { STREAM_REFORM } from './constants'
export { VerdictPill } from './verdictpill'
export { aipBlockOf, aipVerdictOf, eeIsDormant, eeLastDraw, normName } from './functions'
