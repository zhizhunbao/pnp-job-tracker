'use client'
/**
 * 域内小件:S2 三榜分层(按用户决策顺序)。加载中出占位块(自上而下渲染铁律,
 * 2026-08-06「为什么下面的内容先刷出来」);数据到了但榜全空才整块不渲染
 * (绝不拿存量榜顶包)。
 * 伞标题(2026-08-08 二次拍板):外层文字与二级导航项「职业榜」完全一致,
 * 四张分榜各自的题降级为子标题;榜题带涨跌箭头(收缩红↓/增长绿↑,同日 Frank 拍板)。
 * 2026-08-28 换装批自 Pulse.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import {
  ARROW_DOWN, ARROW_UP, ID_BOARDS, ID_BOARD_BACKUP, ID_BOARD_COOLING, ID_BOARD_HEATING, ID_BOARD_MINE,
  PH_BOARDS,
} from './constants'
import { boardsEmptyOf } from './functions'
import { Band } from './band'
import { OccBoardSec } from './occboardsec'
import { Placeholder } from './placeholder'
import { Sec } from './sec'
import type { BoardsSectionIn } from './types'
import css from './start.module.css'

/**
 * 渲染三榜分层区。
 *
 * @param props 取词函数、界面语言、四张榜与可提名省份表。
 * @returns 白底色带;数据到了而四张榜全空时给 null。
 */
export function BoardsSection({ t, lang, boards, nocProvs }: BoardsSectionIn) {
  if (boards != null && boardsEmptyOf(boards)) {
    return null
  }
  const items = []
  if (boards != null) {
    if (boards.mine.length > 0) {
      items.push(<OccBoardSec key={ID_BOARD_MINE} t={t} lang={lang} nocProvs={nocProvs} rows={boards.mine}
        title={t('pulse.b1a')} gap={false} showProvs={false} deadCol flatDelta />)
    }
    if (boards.backup.length > 0) {
      items.push(<OccBoardSec key={ID_BOARD_BACKUP} t={t} lang={lang} nocProvs={nocProvs} rows={boards.backup}
        title={t('pulse.b1')} gap={boards.mine.length > 0} showProvs={false} deadCol={false} flatDelta={false} />)
    }
    if (boards.cooling.length > 0) {
      items.push(<OccBoardSec key={ID_BOARD_COOLING} t={t} lang={lang} nocProvs={nocProvs} rows={boards.cooling}
        title={<>{t('pulse.b2')} <span className={css.arrowDown}>{ARROW_DOWN}</span></>}
        gap showProvs deadCol={false} flatDelta={false} />)
    }
    if (boards.heating.length > 0) {
      items.push(<OccBoardSec key={ID_BOARD_HEATING} t={t} lang={lang} nocProvs={nocProvs} rows={boards.heating}
        title={<>{t('pulse.b3')} <span className={css.arrowUp}>{ARROW_UP}</span></>}
        gap showProvs deadCol={false} flatDelta={false} />)
    }
  }
  return (
    <Band white id={ID_BOARDS}>
      <Sec title={t('pulse.nav.boards')}>
        {boards == null && <Placeholder size={PH_BOARDS} />}
        {items}
      </Sec>
    </Band>
  )
}
