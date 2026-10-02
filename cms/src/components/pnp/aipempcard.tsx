'use client'
/**
 * 域内小件:AIP 指定雇主清单卡(本省名单 + 本岗雇主高亮置顶 + 末尾展开开关;形照职业清单卡 StreamCard)。
 * 2026-10-01 Frank「这个弹框需要列表,然后高亮雇主」:AIP 弹框原先只有一行判定与按名字完全相等对出的命中行(o/a 经营名对不上就一行不出),
 * 改成列出本省全部 AIP 指定雇主、本岗雇主那一行高亮;高亮按数据层打标的口径(法定名或 o/a 经营名)。
 * 名单还没到(职位板后台在取)或不是大西洋省,不出卡。
 *
 * 2026-10-02 三弹框统一第 3 步(Frank「这是不是 拆成人能看懂表格比较好」「不需要一次查询 1574 家吧」「可以,做吧」):卡里只列本岗雇主那一行与同招牌的几家(弹框打开才取,useAipEmpCard),
 * 同招牌不止一家时卡底写一行家数;
 * 末尾「展开其他 N 个」改成链接「本省全部指定雇主 ›」跳雇主板(AIP + 本省,分页)。取挂了出失败框,没到出加载行。
 *
 * @author Frank
 * @time 2026-10-01 14:13:21
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { Loading } from '@/components/loading'
import { Notice } from '@/components/notice'
import { AipEmpRow } from './aipemprow'
import {
  BOX_GAP_NONE, K_AIP_EMP_ALL, K_AIP_EMP_BRAND, K_AIP_EMP_COUNT, K_AIP_EMP_TITLE, K_LOAD_FAILED, K_LOADING, NOTICE_ERR,
  PLAIN_BTN_KIND, PROV_KEY_HEAD,
} from './constants'
import { boxClsOf } from './functions'
import { useAipEmpCard } from './hooks'
import type { AipEmpCardIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染 AIP 指定雇主清单卡。
 *
 * @param props 取词函数与本岗。
 * @returns 卡(本岗雇主与同招牌几家 + 卡底链接);没到出加载行,取挂了出失败框。
 */
export function AipEmpCard({ t, job }: AipEmpCardIn) {
  const p = useAipEmpCard({ job })
  if (p.failed) {
    return <Notice kind={NOTICE_ERR}>{t(K_LOAD_FAILED)}</Notice>
  }
  if (p.ready === false) {
    return <Loading text={t(K_LOADING)} />
  }
  const rows = []
  for (const r of p.rows) {
    rows.push(<AipEmpRow key={r.key} r={r} matchRef={p.matchRef} />)
  }
  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        {t(K_AIP_EMP_TITLE, { prov: t(PROV_KEY_HEAD + job.province) })}
        <span className={css.count}>{t(K_AIP_EMP_COUNT, { n: p.total })}</span>
      </div>
      {rows.length > 0 && <div className={boxClsOf({ clip: false, gap: BOX_GAP_NONE })}>{rows}</div>}
      {p.brandN > 1 && <div className={css.drawsFoot}>{t(K_AIP_EMP_BRAND, { n: p.brandN })}</div>}
      <Button kind={PLAIN_BTN_KIND} className={cssOf(css.foldMore)} href={p.href}>{t(K_AIP_EMP_ALL)}</Button>
    </div>
  )
}
