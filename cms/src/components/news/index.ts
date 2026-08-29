/**
 * news 页面域的桶 —— /news 移民动态列表与 /news/[slug] 单条详情两块视图,
 * 外加两边共用的库行形状与地区取名。
 * 2026-08-26 自 app/(frontend)/news/ 整体迁入(原文件头 @author Claude
 * @time 2026-08-26 19:28:00);2026-08-27 换装批整体重写成小写件形制:
 * shared.ts 拆户(形状进 types.ts、地区顺序进 constants.ts、取名函数进 functions.ts)、
 * 排版拆成 20 个小件一件一文件、状态收进 hooks.ts、main.css 第 11 段整段迁
 * news.module.css。同批壳件上交:整页外框走 shell 桶的 Frame、顶栏与页脚由页面门直接拼
 * (Frank「组装只许在 (frontend) 页面门里」,样张 account),原 NewsShell 的 render-prop
 * 形态随之撤编 —— t/lang 各组件经 useLang 或 props 取。
 * 🔴 桶本身与 types/constants/functions 都**不带 `'use client'`**(老坑 6):
 * 服务端页面(generateMetadata / SQL 取数)与客户端视图共用这几张形状与取名函数。
 * 对应 lib 域:lib/news(速读与翻译两条 HTTP 芯)。
 * 2026-08-29 页面门清闸批:两个门的取数(`load*` 五条)与 meta 截断长度也从这里出 ——
 * 门里只剩取参、`getPayload` + `dbOf` 取池、一行装配与拼大写组件;
 * 同批列表页的 SEO 头收成 NEWS_META(门里除框架定名导出外零函数零常量,内容一律来自桶)。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
export { META_DESC_LEN_MAX, NEWS_META } from './constants'
export { News } from './news'
export { NewsDetail } from './newsdetail'
export {
  loadNewsCards, loadNewsCommentCounts, loadNewsComments, loadNewsHeroes, loadNewsRow, regionNameOf,
} from './functions'
export type { NewsCard, NewsComment, NewsDbRow, NewsHero } from './types'
