'use client'
/**
 * 访客向导专业题左栏右边那块(2026-10-05 照掌上高考立):左栏在「热门」= 一张白卡装热门 16 个专业;
 * 在某个大类 = 一个专业类一张可展开白卡(头行 名字 + 「N个专业」+ 箭头,点开专业列在同一张卡里),
 * 只装一个专业的那些专业类合成最后一张、直接点选。还没取到摆 loading 桶那一行。
 * 2026-10-05 自 gate 桶迁入(原 gate/gatemajorpanel.tsx 的 GateMajorPanel,改名 MajorCards:收选择器机器,不收访客向导整机);
 * 同日多选:每一列行收选中的码清单(亮哪几行、满了灰哪几行)。
 * 同日访客第 3 题也用这副两栏(Frank「也改成左右 两部分吗?」「改啊」):白卡浮在灰底上那一圈内衬(本件原先包在外面的一层
 * majors.module.css 的 .majorPanel)收进 tabs 桶 RailTabs 的面板,本件不再包那一层,直接交卡与加载中那一行;值与长相不变。
 *
 * @author Frank
 * @time 2026-10-05 11:20:00
 */
import { FoldCard, ListCard } from '@/components/card'
import { Loading } from '@/components/loading'
import { MAJOR_CAT_HOT, MAJOR_FOLD_ID, MAJOR_LOADING_KEY, MAJOR_N_KEY, TEXT_NONE } from './constants'
import { catNameOf } from './functions'
import { MajorLines } from './majorlines'
import type { MajorPartIn } from './types'

/**
 * 左栏右边那块。
 *
 * @param props 选择器机器、取词函数与界面语言码(见 MajorPartIn 逐格注释)。
 * @returns 热门那一张,或这一大类的专业类白卡。
 */
export function MajorCards({ m, t, lang }: MajorPartIn) {
  if (m.cat === MAJOR_CAT_HOT) {
    if (m.hotLoaded === false) {
      return <Loading text={t(MAJOR_LOADING_KEY)} />
    }
    return (
      <ListCard>
        <MajorLines rows={m.top} mark={TEXT_NONE} codes={m.codes} lang={lang} pickOf={m.pickOf} />
      </ListCard>
    )
  }
  if (m.tree == null) {
    return <Loading text={t(MAJOR_LOADING_KEY)} />
  }
  const cards = []
  for (const grp of m.tree.groups) {
    cards.push(
      <FoldCard key={grp.key}
        title={catNameOf({ titled: grp, lang })}
        count={t(MAJOR_N_KEY, { n: grp.majors.length })}
        open={m.open === grp.key}
        onToggle={m.foldOf(grp.key)}
        bodyId={MAJOR_FOLD_ID + grp.key}>
        <MajorLines rows={grp.majors} mark={TEXT_NONE} codes={m.codes} lang={lang} pickOf={m.pickOf} />
      </FoldCard>,
    )
  }
  return (
    <>
      {cards}
      {m.tree.singles.length > 0 && (
        <ListCard>
          <MajorLines rows={m.tree.singles} mark={TEXT_NONE} codes={m.codes} lang={lang} pickOf={m.pickOf} />
        </ListCard>
      )}
    </>
  )
}
