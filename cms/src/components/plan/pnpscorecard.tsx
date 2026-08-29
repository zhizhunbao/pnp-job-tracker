'use client'
/**
 * plan 域的结构:E12-09 省提名自评打分 + 跨省对照。Frank:「分不够赶紧换省换工作,不要继续耗」。
 *
 * 从 BcSirsCard(只有 BC)改成两省对照 —— **有两个省才谈得上「换哪个省更快」**,这是这块的全部价值。
 * 现有:BC/SK/ON/MB 各自官方分制 + NL EE Skilled Worker 100 分制(67 分申请门槛)。
 *
 * 硬约束(别放宽):
 * ① 分值全部来自 pnp_score_factors(官方分值表),前端一分都不许自己编;算分器在 lib/points;
 * ② 用户只填**一套条件**,各省按各自官方表折算,并把命中的官方原文标签显出来让用户核对;
 * ③ 对照锚只能是官方事实:BC = 真实抽选记录(pnp_draws),SK = 官方申请门槛 ——
 *    没有就写「官方未公布」,不编;
 * ④ 结果只能说「按官方分值表自算」,**不是资格认定**;
 * ⑤ 默认值一律取保守值(非本岗省份的工作地区默认 0 分档),不许用有利默认把分数吹上去。
 *
 * 打分是**关于你这个人**的功能,不绑某一个岗位(Frank 2026-07-27「应该单独弄个功能吧,
 * 不应该放到 pnp 弹框里面」)—— 所以只收一个轻量语境:职业(拿该省在招数)、目标省(排序)、
 * 时薪与城市(BC 的两项按官方规则要用,拿不到就让用户自己填)。全是可选。
 *
 * 卡壳(边框/圆角/内边距)由外层弹框壳提供 —— 这里再画一层就是卡中卡。
 * 答题中不自带标题与进度:题卡外层已经有一个「你的条件 · 已答 n/N」和一条进度条,
 * 这里再来一套就是同一件事说两遍,而且两条进度还各走各的(2026-08-10 Frank 点名)。
 * 2026-08-28 换装批整体重写成小写件形制:出题机器与算分派生下沉 functions.ts、
 * 九格状态收进 hooks.ts、47 处内联样式迁 plan.module.css、排版拆成十四件一件一文件。
 *
 * @author Frank
 * @time 2026-08-28 05:40:00
 */
import { cssOf } from '@/components/css'
import { ScoreInputs } from './scoreinputs'
import { ScoreQuestion } from './scorequestion'
import { ScoreResults } from './scoreresults'
import { usePnpScoreCard } from './hooks'
import { scoreRootClsOf } from './functions'
import type { PnpScoreCardIn } from './types'
import css from './plan.module.css'

/**
 * 渲染省提名自评打分卡。
 *
 * @param props 取词函数、界面语、岗位语境、官方分值表与抽选记录,以及答题段的五个出口。
 * @returns 打分卡;一个省的官方表都没有时不出。
 */
export function PnpScoreCard(props: PnpScoreCardIn) {
  const d = usePnpScoreCard(props)
  if (d.scores.length === 0) {
    return null
  }
  return (
    <div className={scoreRootClsOf(d)}>
      {d.showResults && <h2 className={cssOf(css.psTitle)}>{d.title}</h2>}
      {d.asking && d.question != null && <ScoreQuestion d={d} q={d.question} />}
      {d.inputsShown && <ScoreInputs d={d} />}
      {d.showResults && <ScoreResults d={d} />}
    </div>
  )
}
