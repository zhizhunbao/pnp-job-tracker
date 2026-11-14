'use client'
/**
 * apply 桶的投出后「接着投这几个」(2026-11-09 Frank「照此做」,「我的」第一批:真人投一封就走,这张卡在成功页直接接下一岗)。
 * 取的是今日推荐;没有推荐整卡不出。
 * 同日 Frank 定的投递动线:改取与刚投那一岗同省、同职业、有投递邮箱、没投过的岗,按新旧排;
 * 第一条是主按钮「下一个:职位名」,点了原地换成那一岗的投递框。不自动跳、不提前生成。
 * 2026-11-13 Frank「同城优先,其次同省」「3 到 5 个」:接口改成同城排前、最多 5 条,这里照样全出。
 * 同日 Frank「下面不是有 apply 了吗」:第一条的主按钮「下一个:职位名」撤,每一条都是职位名、公司、地点加「投递」。
 *
 * @author Frank
 * @time 2026-11-09 16:00:00
 */
import { Loading } from '@/components/loading'
import { CARD_HEAD_CLS, CARD_MD_CLS, NEXT_HEAD_KEY } from './constants'
import { useNextPicks } from './hooks'
import { NextPickRow } from './nextpickrow'
import type { NextPicksIn } from './types'

/**
 * 一张分区卡:卡头与几行职位。
 *
 * @param props 取词函数与刚投的职位 id。
 * @returns 分区卡;没有同类岗给空。
 */
export function NextPicks({ t, jobId }: NextPicksIn) {
  const p = useNextPicks(jobId)
  if (p.done && p.rows.length === 0) {
    return null
  }
  const rows = []
  for (const r of p.rows) {
    rows.push(<NextPickRow key={r.id} p={r} lang={p.lang} pos={rows.length + 1} t={t} />)
  }
  return (
    <div className={CARD_MD_CLS}>
      <div className={CARD_HEAD_CLS}>{t(NEXT_HEAD_KEY)}</div>
      {p.done === false && <Loading text={t(NEXT_HEAD_KEY)} />}
      {rows}
    </div>
  )
}
