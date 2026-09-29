'use client'
/**
 * 域内小件:省提名弹框顶上的「本岗能走的通道」卡(一条通道一格:英文官方名 + 界面语言译名灰字)。
 * 2026-09-26 /fe 首页 Frank「止血 + 补完整」看过效果图点头立;条目口径与职位板 PNP 格一致(channelsOf)。
 * 现在一岗单值,卡按清单铺:「一岗列出全部通道」立项后条目直接变多,这里不用改。
 * 2026-09-28 Frank「这个要不要把灰字去掉」「先弄安省的」:一格改成界面语言直白名 + 官方英文原名灰字(见 channelsOf)。
 * 同日晚 Frank「这部分怎么改的这么乱了」「名字都用一个不行么」:条目不再套框;英文名改用省里官方原名(i18n stream.*),
 * 与下面抽选卡本岗那一组同名。
 *
 * @author Frank
 * @time 2026-09-26 16:10:00
 */
import { TEXT_NONE } from './constants'
import { channelClsOf } from './functions'
import type { PnpChannelCardIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染「本岗能走的通道」卡。
 *
 * @param props 取词函数与通道条目。
 * @returns 通道卡。
 */
export function PnpChannelCard({ t, channels }: PnpChannelCardIn) {
  const items = []
  for (const c of channels) {
    items.push(
      <div key={c.key} className={channelClsOf()}>
        {c.name}
        {c.sub !== TEXT_NONE && <span className={css.zh}>{c.sub}</span>}
      </div>,
    )
  }
  return (
    <div className={css.card}>
      <div className={css.cardHead}>{t('pnpfacts.streams')}</div>
      {items}
    </div>
  )
}
