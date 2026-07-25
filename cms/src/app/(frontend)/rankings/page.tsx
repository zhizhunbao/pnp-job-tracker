// 第25轮 #120:/rankings 裸路径原 404(站内零内链,但直输 URL/外发贴链接会踩)→ 302 到周榜。
import { redirect } from 'next/navigation'

export default function RankingsIndex() {
  redirect('/rankings/weekly-top')
}
