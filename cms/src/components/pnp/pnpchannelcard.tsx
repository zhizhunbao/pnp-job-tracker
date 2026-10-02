'use client'
/**
 * 域内小件:省提名弹框顶上的「本岗能走的通道」卡(一条通道一格:英文官方名 + 界面语言译名灰字)。
 * 2026-09-26 /fe 首页 Frank「止血 + 补完整」看过效果图点头立;条目口径与职位板 PNP 格一致(channelsOf)。
 * 现在一岗单值,卡按清单铺:「一岗列出全部通道」立项后条目直接变多,这里不用改。
 * 2026-09-28 Frank「这个要不要把灰字去掉」「先弄安省的」:一格改成界面语言直白名 + 官方英文原名灰字(见 channelsOf)。
 * 同日晚 Frank「这部分怎么改的这么乱了」「名字都用一个不行么」:条目不再套框;英文名改用省里官方原名(i18n stream.*),
 * 与下面抽选卡本岗那一组同名。
 * 2026-09-30 通道补全批二(Frank「nl 之前不说有个毕业生通道吗?」「列进来,标需先有 EE 档案」「不看工作的也收」):一岗列出全部通道 ——
 * 上段本岗通道 + 其余跟工作有关的(按岗位筛),下段「不要 offer 的通道」(本省不看工作的);每条带条件标签。条目拆成 ChannelRow。
 * 同日晚 Frank「不要 offer 这个也删了,只列本岗能走的通道」:下段撤,卡里只剩本岗能走的通道。
 * 2026-10-01 Frank「这个是不是改成两个子卡片。能走哪个高亮哪个。」「你都改完」(看过效果图):一条一张子卡;卡里同时有 PGWP 互补的两条
 * (NL 技术工人 / 国际毕业生)时标题右边出「你有 PGWP 吗　有 | 没有」分段钮(通用钮桶 seg 档),选哪边亮哪边,再点取消。
 *
 * @author Frank
 * @time 2026-09-26 16:10:00
 */
import { Button, SegGroup } from '@/components/button'
import { ChannelRow } from './channelrow'
import { BTN_SEG, PICK_NO_PGWP, PICK_PGWP } from './constants'
import { channelHitOf } from './functions'
import { useChannelPick } from './hooks'
import type { PnpChannelCardIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染「本岗能走的通道」卡。
 *
 * @param props 取词函数与通道条目。
 * @returns 通道卡。
 */
export function PnpChannelCard({ t, channels }: PnpChannelCardIn) {
  const p = useChannelPick({ channels })
  const items = []
  for (const c of channels) {
    items.push(<ChannelRow key={c.key} c={c} hit={channelHitOf({ c, pick: p.pick })} />)
  }
  return (
    <div className={css.card}>
      <div className={css.chanHead}>
        <span className={css.cardHead}>{t('pnpfacts.streams')}</span>
        {p.show && (
          <span className={css.chanAsk}>
            {t('pnpchan.pgwpAsk')}
            <SegGroup>
              <Button kind={BTN_SEG} sm active={p.pick === PICK_PGWP} onClick={p.pickOf(PICK_PGWP)}>
                {t('pnpchan.pgwpYes')}
              </Button>
              <Button kind={BTN_SEG} sm active={p.pick === PICK_NO_PGWP} onClick={p.pickOf(PICK_NO_PGWP)}>
                {t('pnpchan.pgwpNo')}
              </Button>
            </SegGroup>
          </span>
        )}
      </div>
      <div className={css.chanList}>{items}</div>
    </div>
  )
}
