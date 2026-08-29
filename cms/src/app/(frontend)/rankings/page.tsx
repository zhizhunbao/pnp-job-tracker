/**
 * /rankings 裸路径的门。第 25 轮 #120:这条路径原本 404(站内零内链,但直输 URL 或
 * 外发贴里的链接会踩)→ 302 到周榜,周榜是这一组榜单的落点。
 * 2026-08-28 换装批顺手把文件头那行 `//` 注释换成 JSDoc(闸 jsdoc-comments-only),
 * 一个字没改。
 *
 * @author Frank
 * @time 2026-08-28 12:49:56
 */
import { redirect } from 'next/navigation'

import { URL_WEEKLY_TOP } from '@/components/rankings'

/**
 * 裸路径的门:只有一次跳转。
 *
 * @returns 无(整条路径重定向到周榜)。
 */
export default function RankingsIndex() {
  redirect(URL_WEEKLY_TOP)
}
