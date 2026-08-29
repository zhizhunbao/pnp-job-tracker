'use client'
/**
 * 域内小件:列表左侧的地标图块。v5 主视觉是真实地标照(Frank 2026-07-18「整个真实的
 * 图片进来,大小裁剪也要包含」);图挂了退 v4 淡色字标,副行一行内截断(联邦全名在
 * 96px 宽里会折三行撑破定高的教训)。致谢挂 img 的 title(Frank「水印去掉」,
 * CC BY/BY-SA 的致谢不能全删,挪 hover)。
 * 2026-08-27 换装批自 News.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { IMG_CREDIT } from './constants'
import { regionImgOf, regionPlaceOf, tileClsOf, tileCodeClsOf, tileCodeOf } from './functions'
import { useDeadImage } from './hooks'
import type { ListTileIn } from './types'
import css from './news.module.css'

/**
 * 渲染列表左侧的地标图块。
 *
 * @param props 地区码。
 * @returns 地标图;图挂了给淡色字标。
 */
export function ListTile({ region }: ListTileIn) {
  const img = useDeadImage()
  if (img.dead) {
    return (
      <div className={tileClsOf({ region, dead: true })}>
        <div className={tileCodeClsOf({ region })}>{tileCodeOf({ region })}</div>
        <div className={css.tileSub}>{regionPlaceOf({ region })}</div>
      </div>
    )
  }
  return (
    <div className={tileClsOf({ region, dead: false })}>
      {/* eslint-disable-next-line @next/next/no-img-element -- 本站静态地标图:不需要 next/image 的优化,且要原生 onError 走缺图兜底 */}
      <img className={css.tileImg} src={regionImgOf({ region })} alt="" title={IMG_CREDIT} onError={img.onError} />
    </div>
  )
}
