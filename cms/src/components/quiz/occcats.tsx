'use client'
/**
 * quiz 域的结构:选职业的分类导航。旧版「分类 + 胶囊」浏览恢复:桌面用文字页签,
 * 手机用单行下拉;完整目录后台按需加载,热门首屏不等它,所以刷新速度仍保持这一版的
 * 快速路径。桌面/手机哪一版出得来由 OccStyle 那段样式的媒体查询定。
 * 2026-08-28 换装批自 OccPicker.tsx 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 04:10:00
 */
import { Button } from '@/components/button'
import { BTN_TYPE, CLS_OCC_CAT_SEL, CLS_OCC_CAT_TABS, PLAIN_BTN_KIND, TEXT_NONE } from './constants'
import { catLabelOf, catTabClsOf } from './functions'
import type { OccCatsIn } from './types'

/**
 * 渲染分类下拉与分类页签。
 *
 * @param props 取词函数、当前分类、全部分类与两只手柄。
 * @returns 分类导航。
 */
export function OccCats({ t, cat, cats, onSelect, pickOf }: OccCatsIn) {
  const opts = []
  const tabs = []
  for (const slug of [TEXT_NONE, ...cats]) {
    opts.push(<option key={slug} value={slug}>{catLabelOf({ t, slug })}</option>)
    tabs.push(
      <Button key={slug}
        kind={PLAIN_BTN_KIND}
        type={BTN_TYPE}
        className={catTabClsOf({ on: cat === slug })}
        onClick={pickOf(slug)}>
        {catLabelOf({ t, slug })}
      </Button>,
    )
  }
  return (
    <>
      <select className={CLS_OCC_CAT_SEL} value={cat} aria-label={t('mkt.broad')} onChange={onSelect}>
        {opts}
      </select>
      <div className={CLS_OCC_CAT_TABS}>{tabs}</div>
    </>
  )
}
