'use client'
/**
 * news 域的结构:/news/[slug] 单条动态详情整块视图(E12-06 v3)—— 官方英文原文直贴 +
 * ©四件套 + 逐段对照翻译 + 评论区(登录可评,审核后显示)。
 * 外轨 = Shell 1320(宽度统一拍板);阅读列 860 居中保行长可读。
 * 2026-08-27 换装批自 News.tsx 整体重写成小写件形制:壳件(整页外框/顶栏/页脚)拼装
 * 归页面门(样张 account),本件只出 Shell 轨往下的视图;速读与懒翻译的状态收进
 * hooks.ts 的 useNewsDetail。
 * 2026-09-03 Frank「详情页返回按钮都在右上,样式位置固定统一」:返回改递 Shell 的 back 槽
 * (button 桶 BackButton,goBackOr 落 /news),不再在正文卡上方左侧自摆一行。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { BackButton } from '@/components/button'
import { Shell } from '@/components/shell'
import { COMMENTS_ON, SHELL_TOP_DETAIL, URL_NEWS } from './constants'
import { CommentsSection } from './commentssection'
import { useNewsDetail } from './hooks'
import { NewsArticle } from './newsarticle'
import type { NewsDetailIn } from './types'
import css from './news.module.css'

/**
 * 单条动态详情整块视图。
 *
 * @param props 这条动态的库行、过审评论与登录态。
 * @returns 正文(Shell 轨往下)。
 */
export function NewsDetail({ row, comments, loggedIn }: NewsDetailIn) {
  const d = useNewsDetail({ row })
  return (
    <Shell top={SHELL_TOP_DETAIL} back={<BackButton fallback={URL_NEWS} label={d.t('detail.back')} />}>
      <div className={css.track}>
        <NewsArticle t={d.t}
          lang={d.lang}
          row={row}
          summary={d.summary}
          sumState={d.sumState}
          transOn={d.transOn}
          trans={d.trans}
          trState={d.trState}
          onSum={d.onSum}
          onTrans={d.onTrans} />
        {COMMENTS_ON && (
          <CommentsSection t={d.t} slug={row.slug} comments={comments} loggedIn={loggedIn} />
        )}
      </div>
    </Shell>
  )
}
