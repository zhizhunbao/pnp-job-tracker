'use client'
/**
 * 多雇主对比视图(D3 / E5-06):维度当行 × 雇主当列(stats compare 转置先例)。
 * 免费态走 ⑤ 价值时刻先例(价值点 + 模糊样例 + 升级钮,真值不出服务端);
 * 付费态给全维度 + 「与我的匹配」计数行。
 * 🔴 红线:摆事实、高亮差异,不下结论;LMIA = 历史事实 ≠ 担保(口径注 ce.note);
 * 缺数渲横杠不猜。
 * 整页外框(顶栏 / 页脚 / 灰底纵向列)2026-08-27 起归页面门去拼(shell 桶的 Frame),
 * 本件只是正文那一段。
 * 2026-08-27 换装批整体重写:洗展示行、维度行进 functions、三块正文各自成件。
 * 2026-09-03 Frank「所有主页面都不应该有返回按钮」:对比页是工具主页,标题上方的返回撤掉
 * (去雇主板的入口留在结果区的「去雇主板」钮)。
 * 同日「所有的 table 右上角都应该有一个更新时间」:更新时刻由页面门 SSR 取好递进来,
 * 两个分支各自把它挂到自己那张表的正上方(付费态真表、免费态样例表)。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { useLang } from '@/components/i18n'
import { IconScale } from '@/components/icons'
import { Shell } from '@/components/shell'
import { COMPARE_SHELL_TOP_PX } from './constants'
import { CompareDemo } from './comparedemo'
import { CompareResult } from './compareresult'
import { compareDimsOf, toCompareCellRows, withMatchOf } from './functions'
import type { CompareIn } from './types'
import css from './employers.module.css'

/**
 * 对比页正文:标题 + 口径注,底下按付费态给样例或真表。
 *
 * @param props 要对照的雇主、付费态与登录态(见 CompareIn 逐格注释)。
 * @returns 对比页正文。
 */
export function Compare({ rows, pro, loggedIn, updatedAt }: CompareIn) {
  const [lang, , t] = useLang()
  let body = <CompareDemo t={t} loggedIn={loggedIn} updatedAt={updatedAt} />
  if (pro) {
    const dims = compareDimsOf({ t, withMatch: withMatchOf(rows) })
    body = <CompareResult rows={toCompareCellRows({ rows, t, lang })} dims={dims} t={t} updatedAt={updatedAt} />
  }
  return (
    <Shell top={COMPARE_SHELL_TOP_PX}>
      <h1 className={css.compareH1}><IconScale /> {t('ce.title')}</h1>
      <div className={css.compareNote}>{t('ce.note')}</div>
      {body}
    </Shell>
  )
}
