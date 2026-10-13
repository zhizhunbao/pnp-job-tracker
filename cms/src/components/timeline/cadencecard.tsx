'use client'
/**
 * 域内小件:一张抽选节奏卡(2026-10-12 抽选页三段式起一条通道一张;官方一次抽选同时覆盖几条通道的合一张,
 * 灰字列出覆盖了哪几条)。整卡可点 —— 点它把下面的事件流筛到这张卡统计的那几条抽选流并滚过去。
 * 诚实红线:卡上只报**历史统计**(最近抽选 / 距今 / 平均间隔 / 今年次数与人数 / 今年提名),不预测下一次。
 * 2026-08-28 换装批自 Timeline.tsx 的节奏卡提出成文件;原先手搓的 role/tabIndex/
 * 回车空格键盘手柄随「整卡经 Button」一并退役,键盘可达由标签自己保证。
 * 2026-10-12 重排(Frank 看「AB AAIP」那张「这个卡片是不是 重新 设计一下」起,一路拍到定稿):
 * 名字英文黑字 + 译名灰字;数字一格一条(格名黑字、数字灰字不加粗),不再用「·」串成一行;
 * 「历次抽选」那行假链接撤(整卡本来就能点);右上角名次;状态只看「距今」的颜色与状态胶囊,左边色带撤。
 *
 * @author Frank
 * @time 2026-08-28 12:43:06
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { CARD_BTN_KIND } from './constants'
import { cadenceCellsOf, cardGrayOf, cardNameEnOf } from './functions'
import { NameLines } from './namelines'
import { ProvTag } from './provtag'
import { StatGrid } from './statgrid'
import { StatusTag } from './statustag'
import type { CadenceCardIn } from './types'
import css from './timeline.module.css'

/**
 * 渲染一张节奏卡。
 *
 * @param props 取词函数、界面语、这张卡与点击手柄。
 * @returns 整卡钮。
 */
export function CadenceCard({ t, lang, card, onClick }: CadenceCardIn) {
  return (
    <Button kind={CARD_BTN_KIND} onClick={onClick} className={cssOf(css.card)}>
      <span className={css.miniBody}>
        <span className={css.cardHead}>
          <NameLines en={cardNameEnOf({ t, lang, card })} gray={cardGrayOf({ t, lang, card })} />
          <ProvTag t={t} prov={card.prov} />
        </span>
        <StatGrid cells={cadenceCellsOf({ t, lang, card })} />
        <StatusTag t={t} status={card.status} />
      </span>
    </Button>
  )
}
