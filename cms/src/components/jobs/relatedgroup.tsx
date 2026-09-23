'use client'
/**
 * 域内小件:相似职位的一组。分组小标题代替逐行标注(同一组三行都写「同省同职业」是重复文案);
 * 行形态不自造 —— 与公司弹框「在招职位」同一个 JobMiniRow(左岗名右薪资城市)。
 * 同公司组的灰字小注留空:组标题已经说了同公司,再贴一遍公司名既重复又在 375 上被截断。
 * 2026-08-28 换装批自 Job.tsx 提出成文件。
 * 2026-09-21 JobMiniRow 改点文件不走 companies 桶:职位描述弹框(advisor)正文下面也接相似职位卡(经 JobModalCards),
 * 而 companies 的桶反过来要 advisor 的弹框,走桶就成环。
 * 2026-09-21 Frank「这个下面显示中文翻译,不要显示公司」:两组的灰字一律改成职位名译名(英文界面不出),同职业组也不再出公司名 ——
 * 上面「同公司组留空」一条随之作废;行交给 companies 的 JobMiniList(同样点文件),译名的存 / 懒翻都在那边。
 * 2026-09-22 Frank「需要一个展开的按钮吧,不应该只显示 6 个吧」「这个地方要显示职位数量吧」:
 * 组标题带总数(照在招职位卡的括号形),收起时先出 firstN 行,「展开其余 N 个 ▾ / 收起 ▴」来回切(原地展开,不跳转)。
 * 2026-09-23 Frank「这个显示 387 但是只能展示 18 个?」选「展开时分页加载」:同省同职业组露完首屏取到的行后
 * 「再展开 N 个」按页向接口续取;展开 / 收起状态收进 useRelatedPages(同公司组照旧一次露完已取的行)。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { Button } from '@/components/button'
import { JobMiniList } from '@/components/companies/jobminilist'
import { cssOf } from '@/components/css'
import { BTN_GHOST, PAREN_L, PAREN_R, TEXT_NONE } from './constants'
import { useRelatedPages } from './hooks'
import type { RelatedGroupIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染相似职位的一组。
 *
 * @param props 组小标题、总数、这一组的行、收起首屏条数、续取岗号、取词函数、界面语言与点一行的去处。
 * @returns 小标题 + 若干行 + 展开 / 收起钮。
 */
export function RelatedGroup({ label, total, rows, firstN, pageJobId, t, lang, onOpenJob }: RelatedGroupIn) {
  const pages = useRelatedPages({ jobId: pageJobId, rows, total, firstN, t })
  return (
    <div>
      <div className={cssOf(css.relGroup)}>
        {label}
        {total > 0 && <span> {PAREN_L}{total}{PAREN_R}</span>}
      </div>
      <JobMiniList rows={pages.shown} lang={lang} onOpenJob={onOpenJob} />
      {pages.moreText !== TEXT_NONE && (
        <Button kind={BTN_GHOST} onClick={pages.onMore} disabled={pages.busy} className={cssOf(css.relMore)}>
          {pages.moreText}
        </Button>
      )}
      {pages.canCollapse && (
        <Button kind={BTN_GHOST} onClick={pages.onCollapse} className={cssOf(css.relMore)}>
          {t('act.collapse')}
        </Button>
      )}
    </div>
  )
}
