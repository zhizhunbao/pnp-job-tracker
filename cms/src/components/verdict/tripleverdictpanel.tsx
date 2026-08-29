'use client'
/**
 * verdict 域的结构:一键三合一判定面板(#287 批D,设计
 * docs/design/一键三合一判定-20260809.md §5)。2026-08-10 并入 /plan/pr 主页面,
 * 不再在页面上自动套第二层弹窗 —— 本件是页面上的一段,不是弹框。
 *
 * 卡序照 design/PR评估页三步重设计-20260812.md §2 与 §3 效果图:
 * ① 本职位(岗位事实 + 职业匹配判定)② 雇主资质 ③ 你的条件 ④ 你的初步方案(页面给的整块)。
 * 撤掉的几样各自留了记录:「判定结论」头条卡 2026-08-14 Frank 拍板删(「没有用」——
 * 结论句与下方逐项判定重复,只留错误留痕行);「省提名政策」卡与「差距与时间评估」
 * 付费锁卡 2026-08-13 先删(政策卡常年只剩一句「已收录门槛中无阻碍项」,
 * 锁卡在卖还看不见的东西,[[pricing]] 不卖还不存在的东西 —— 判定引擎与付费闸后端原样);
 * 「粗筛信号,非资格认定」脚注 2026-08-14 拍板删(以当日指令为准,全站页脚的法律免责仍兜底)。
 * 三关的**免费/付费口径一个字没动**:结论句与「你这边」那条闸来自 pathVerdict,
 * 与同一页上免费的「你的初步方案」同源;逐项差值(差几分/差几个月)仍在 paid 行里锁着。
 * 三关第三关 2026-08-12 由「个人条件」改称「你这边」(审计 A3):页面上那张问卷回显卡
 * 叫「你的条件」,两块同屏名字打架 —— 这一关是**判定**,不是又一个输入面。
 * 2026-08-28 换装批自 TripleVerdictModal.tsx 整体重写成小写件形制:
 * 三张卡与瓦片各成一件、取数进 hooks.ts、取词与派生进 functions.ts、
 * 内联样式与 <style> 注入逐格迁 verdict.module.css。
 *
 * @author Frank
 * @time 2026-08-28 17:55:00
 */
import { AnswerCard } from './answercard'
import { EmployerFacts } from './employerfacts'
import { JobFacts } from './jobfacts'
import { VerdictSkeleton } from './verdictskeleton'
import { hasProfileOf, makeProvDisp, tOf } from './functions'
import { useVerdict } from './hooks'
import type { TripleVerdictPanelIn } from './types'
import css from './verdict.module.css'

/**
 * 渲染三关判定面板。
 *
 * @param props 这份岗、界面语言、两个插槽与四只手柄(逐格注释见 TripleVerdictPanelIn)。
 * @returns 判定卡组。
 */
export function TripleVerdictPanel({
  job, lang, profileComplete = false, refreshKey = 0, initial, countPills, answerList = [],
  planSlot, scoreSlot, onBuildProfile, onEditAnswers,
}: TripleVerdictPanelIn) {
  const t = tOf({ lang })
  const panel = useVerdict({ jobId: job.id, refreshKey, initial })
  return (
    <>
      {panel.err && <div className={css.err}>{t('tv.err')}</div>}
      <JobFacts t={t} lang={lang} job={job} wire={panel.wire} />
      <EmployerFacts t={t} lang={lang} job={job} wire={panel.wire} />
      {panel.wire != null && (
        <AnswerCard t={t}
          hasProfile={hasProfileOf({ wire: panel.wire, profileComplete })}
          countPills={countPills}
          answerList={answerList}
          provLabel={makeProvDisp({ t })}
          scoreSlot={scoreSlot}
          onBuildProfile={onBuildProfile}
          onEditAnswers={onEditAnswers}
          prefill={t('tv.ask', { co: job.company })} />
      )}
      {planSlot}
      {panel.wire == null && panel.err === false && <VerdictSkeleton />}
    </>
  )
}
