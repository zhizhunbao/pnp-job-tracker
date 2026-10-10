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

 * 同日 Frank「这个加载中 怎么跑中间去了」:取数中 / 取挂了也先出卡框与标题,加载行与失败框住卡里(加载区必占位),不再光秃秃夹在两张卡中间。
 * 2026-10-02 Frank「这个怎么改成跳转了啊」「之前设计的 表格呢?」「不是展开收起吗?」「展开如果太多就一次展开 20 个」:回到效果图的三列表(招牌 / 门店 / 法人,带表头);卡底跳雇主板的链接撤,
 * 改原地「展开其他 N 家 ▾」,
 * 一次取 20 家往后接,展开后可收起。
 * 2026-10-02 Frank「全站统一 都改成 展开 20 和 收起。全部统一」:卡底两只钮换成 pager 桶 FoldLine(展开 20 家 → 再展开 20 家 → 展开其余 N 家 → 收起),全站一套。
 * 2026-10-09 N6 批:名单行的招牌换 name 桶 CompanyName(点了经弹框总线叠开公司弹框、译名按界面语自取),
 * 10-02 加的「界面语言」「点招牌的去处」两格随之不再往行里递、从本卡撤。 *
 * @author Frank
 * @time 2026-10-01 14:13:21
 */
import { Loading } from '@/components/loading'
import { Notice } from '@/components/notice'
import { FoldLine } from '@/components/pager'
import { AipEmpRow } from './aipemprow'
import {
  BOX_GAP_NONE, K_AIP_EMP_BRAND, K_AIP_EMP_COLS, K_AIP_EMP_COUNT, K_AIP_EMP_TITLE, K_AIP_EMP_UNIT, K_LOAD_FAILED,
  K_LOADING, NOTICE_ERR, PROV_KEY_HEAD,
} from './constants'
import { boxClsOf } from './functions'
import { useAipEmpCard } from './hooks'
import type { AipEmpCardIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染 AIP 指定雇主清单卡。
 *
 * @param props 取词函数与本岗(2026-10-02 加的界面语言、点招牌的去处两格 10-09 撤)。
 * @returns 卡(本岗雇主与同招牌几家 + 卡底链接);没到出加载行,取挂了出失败框。
 */
export function AipEmpCard({ t, job }: AipEmpCardIn) {
  const p = useAipEmpCard({ t, job })
  const title = t(K_AIP_EMP_TITLE, { prov: t(PROV_KEY_HEAD + job.province) })
  if (p.failed) {
    return (
      <div className={css.card}>
        <div className={css.cardHead}>{title}</div>
        <Notice kind={NOTICE_ERR}>{t(K_LOAD_FAILED)}</Notice>
      </div>
    )
  }
  if (p.ready === false) {
    return (
      <div className={css.card}>
        <div className={css.cardHead}>{title}</div>
        <Loading text={t(K_LOADING)} />
      </div>
    )
  }
  const heads = []
  for (const k of K_AIP_EMP_COLS) {
    heads.push(<span key={k}>{t(k)}</span>)
  }
  const rows = []
  for (const r of p.rows) {
    rows.push(<AipEmpRow key={r.key} r={r} matchRef={p.matchRef} />)
  }
  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        {title}
        <span className={css.count}>{t(K_AIP_EMP_COUNT, { n: p.total })}</span>
      </div>
      {rows.length > 0 && (
        <div className={boxClsOf({ clip: false, gap: BOX_GAP_NONE })}>
          <div className={css.empHead}>{heads}</div>
          {rows}
        </div>
      )}
      {p.brandN > 1 && <div className={css.drawsFoot}>{t(K_AIP_EMP_BRAND, { n: p.brandN })}</div>}
      <FoldLine t={t}
        unit={t(K_AIP_EMP_UNIT)}
        hidden={p.hidden}
        extra={p.extra}
        busy={p.busy}
        onMore={p.onMore}
        onFold={p.onFold} />
    </div>
  )
}
