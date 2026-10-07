'use client'
/**
 * 访客向导第二题「你学的是什么专业?」:上面一排热门具体专业、下面一个搜索框与搜索结果(都是 chip 桶 Chip 的 lg 档,
 * 选中浅主色 + ✓),单选,点了亮、不自动往下走,存 CIP 2021 class 码。
 * (改版立时首句是「十二枚大号胶囊……单选,点了亮、不自动往下走」;A2 起换成热门 + 搜索,收口时首句照现状改写。)
 * 2026-10-04 访客四题改版立 —— 暂列现有十二大类;「热门具体专业 + 搜索」归 A2,本批不做。
 * 同日收口:点选手柄借 profile 桶的 makeOptPick(「点了报值」全站一份)。
 * 2026-10-04 A2 重做(Frank「改」:用户只知道自己读的专业名,十三格统计口径找不到):上面一排热门具体专业(大号胶囊,
 * 名字按界面语言挑,没译成回退英文;选中的若不在热门里排到最前、亮着),下面一个搜索框(search 桶现成件;防抖 300ms,
 * 中日韩字 1 个起、其余 2 个起),结果同样是大号胶囊(最多 20)。单选,存 CIP 2021 class 码。热门没到先用 chip 桶的
 * 大号胶囊占位占满格子;接口回空就只剩搜索框。题里不加解释性文字,只有搜索框的占位提示。机器在 hooks 的 useGateMajors。
 * 同日收口(审查):热门、结果两排各写一遍的胶囊循环收成 GateMajorPills 一件(占位、选中、按界面语挑名都在它里头),
 * 胶囊排的类由 chip 桶 ChipRow 出(原本桶 .pills 与 quiz 桶 .pillsLg 两份逐格相同);结果那一排摆什么由 majorHitsOf 判。
 * 同日收口审查(英文手机实测:十六个官方英文专业名把搜索框挤到 812 高的屏外,结果摆在热门下面,一条都看不见):
 * 照第 3 题 OccPicker 的顺序改成搜索框在上;够起搜的词一落下,框下面换成结果那一排、热门收起(不是叠在热门上面 ——
 * 结果紧贴框下,粘底钮区上面看得见);删回不够起搜的词,热门回来。结果那一排包一层读屏礼让播报区,搜索在途摆占位
 * (MAJOR_HIT_SKEL_N 颗,同第 3 题大号档)。不加新文案(没搜到时那一排空着,不出空态句)。
 * 2026-10-05 照掌上高考改版(Frank「参考掌上高考啊」「可以,做吧」;效果图 docs/design/img/访客专业题-掌上高考版-*):
 * 搜索框照旧在最上;没在搜时下面是两栏 —— 左栏 热门 + 16 大类(tabs 桶 RailTabs),右边见 GateMajorPanel;
 * 在搜时两栏整块换成单列结果(一行一个,检索词那一截标主色,在途摆 loading 桶那一行)。热门与结果都从胶囊换成行
 * (GateMajorPills 撤,换 GateMajorLines);上面「占位颗数」那几句随之作废。
 * 2026-10-05 弹框开拖动(Frank「这个框也可以拖动,放大缩小吧」):两栏与结果单列都是自己滚的区,挂 data-nodrag ——
 * 按住滚动条拖、在列表里按下不会把整个弹框拖走(拖弹框按白卡的空白处与题面)。
 * 2026-10-05 自 gate 桶迁入(原 gate/gatemajors.tsx 的 GateMajors,改名 MajorPicker;上面提到的 GateMajorPanel /
 * GateMajorLines 现为本桶的 MajorCards / MajorLines,useGateMajors 现为 useMajorPicker):选择器自成一域,不认识访客向导 ——
 * 只收选择器机器、取词函数与界面语言码;题面、粘底钮区、答案落格都归宿主。
 * 同日改多选(Frank「现在点了专业没法取消,而且不能选多个吗」「在哪里显示已选的专业呢」;上面几处「单选」作废):
 * 至多 3 个,点选中的那一行摘掉;满了没选的行灰着点不动。搜索框上面多一行已选标签(MajorPicked,位置与长相照第 3 题
 * 已选职业那一行),一行到底、放不下横着滚;它在的时候两栏 / 结果单列让出同样的高(见 majors.module.css 的 .picked),
 * 白卡总高不跳。
 * 同日 Frank 看了本地「放到搜索框下面吧」:已选一行挪到搜索框下面(搜索框与两栏 / 结果单列之间;浏览与在搜两种状态同一个位置),
 * 上面「搜索框上面多一行已选标签」「位置照第 3 题」两句里的位置作废,长相照旧。
 * 同日访客第 3 题要改成同一副左右两栏:两栏外层与结果单列那两个定高区(定高、贴白卡边、上下细线、结果单列区内滚、
 * 有已选一行时让高、data-nodrag)收进 pane 桶 Pane(list 格分两种,belowTags 格 = 已选一行在不在,与 MajorPicked 渲不渲同一判);
 * 左栏宽 --rail-w 改挂在本件竖排上(majors.module.css 的 .picker)。上面「挂 data-nodrag」现由 Pane 挂;
 * 「见 majors.module.css 的 .picked」现为 tag 桶 TagRow(已选一行)与 Pane 的 belowTags 格(让高)。
 * 同日竖排外层收进 pane 桶 PaneStack(第 3 题 quiz 桶 OccRail 的竖排与本件逐格相同,块间距与 Pane 让高同住 pane.module.css):
 * 本件不再自己包竖排 div,只把左栏宽类(majors.module.css 的 .picker,现只剩 --rail-w)当 railCls 递过去。
 *
 * @author Frank
 * @time 2026-10-04 02:10:00
 */
import { cssOf } from '@/components/css'
import { Loading } from '@/components/loading'
import { Pane, PaneStack } from '@/components/pane'
import { Search } from '@/components/search'
import { RailTabs } from '@/components/tabs'
import {
  ARIA_LIVE_POLITE, MAJOR_CATS_KEY, MAJOR_HOT_KEY, MAJOR_LOADING_KEY, MAJOR_PH_KEY, MAJOR_RAIL_ID,
} from './constants'
import { majorHitsOf, railItemsOf } from './functions'
import { MajorCards } from './majorcards'
import { MajorLines } from './majorlines'
import { MajorPicked } from './majorpicked'
import type { MajorPickerIn } from './types'
import css from './majors.module.css'

/**
 * 专业题的答题区。
 *
 * @param props 选择器机器、取词函数与界面语言码(见 MajorPickerIn 逐格注释)。
 * @returns 搜索框 + 已选一行 + 单列结果(在搜时)或左栏两栏(没在搜时)。
 */
export function MajorPicker({ picker, t, lang }: MajorPickerIn) {
  const m = picker
  return (
    <PaneStack railCls={cssOf(css.picker)}>
      <Search value={m.q} onChange={m.onSearch} placeholder={t(MAJOR_PH_KEY)} />
      <MajorPicked m={m} t={t} lang={lang} />
      {m.searchOn && (
        <Pane list belowTags={m.picked.length > 0} live={ARIA_LIVE_POLITE}>
          <MajorLines rows={majorHitsOf({ searchOn: m.searchOn, searching: m.searching, hits: m.hits })}
            mark={m.q} codes={m.codes} lang={lang} pickOf={m.pickOf} />
          {m.searching && <Loading text={t(MAJOR_LOADING_KEY)} />}
        </Pane>
      )}
      {m.searchOn === false && (
        <Pane list={false} belowTags={m.picked.length > 0}>
          <RailTabs items={railItemsOf({ cats: m.cats, lang, hot: t(MAJOR_HOT_KEY) })}
            value={m.cat} onChange={m.onCat} ariaLabel={t(MAJOR_CATS_KEY)} idPrefix={MAJOR_RAIL_ID}>
            <MajorCards m={m} t={t} lang={lang} />
          </RailTabs>
        </Pane>
      )}
    </PaneStack>
  )
}
