'use client'
/**
 * news 域的状态机器:图挂了的兜底、头条轮播、地区筛选、评论区表单、详情页的
 * 速读与对照。体内不留函数体 —— 带口径的步骤全在 ./functions 的工厂里
 * (注释即它们的 JSDoc),这里只剩 useState、具名 effect 壳与工厂装配
 * (形制同 chat 的 useChatBox 与 account 的 useAccountPage)。
 * 2026-08-27 换装批自 News.tsx 的五个组件体收进来。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { useEffect, useState } from 'react'
import { useLang } from '@/components/i18n'
import { SLIDE_MIN, STATE_IDLE, STEP_NEXT, STEP_PREV, TEXT_NONE } from './constants'
import {
  langCacheAt, makeCommentSubmit, makeDead, makeExpandToggleOf, makePause, makeRegionAll, makeRegionPickOf,
  makeReplySubmit, makeReplyToggleOf, makeSlidePickOf, makeSlideTimer, makeStep, makeSumClick, makeTextChange,
  makeTransClick,
} from './functions'
import type {
  CarouselIn, CarouselPanel, CommentsHookIn, CommentsPanel, DeadImagePanel, GenState, LangCache, NewsDetailHookIn,
  NewsDetailPanel, NewsFilterPanel, PostState,
} from './types'

/**
 * 图挂没挂的一格状态(列表图块与头条大图各挂一台)。缺图不留裂图:
 * 换成本域的兜底字标那一版(#206 的口径,不拿别省照片冒充)。
 *
 * @returns 图挂没挂 + 交给 `<img onError>` 的回调。
 */
export function useDeadImage(): DeadImagePanel {
  const [dead, setDead] = useState(false)
  return { dead, onError: makeDead({ setDead }) }
}

/**
 * 头条轮播整机(v5 恢复轮播 —— Frank 2026-07-18「这部分应该加个轮播的功能」):
 * 5s 自动 + 圆点 + 箭头,hover 暂停,单条不轮。
 *
 * @param x 头条总条数。
 * @returns 当前张 + 四只手柄 + 圆点手柄工厂。
 */
export function useCarousel(x: CarouselIn): CarouselPanel {
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(function autoSlide() {
    if (x.total < SLIDE_MIN || paused) {
      return
    }
    return makeSlideTimer({ total: x.total, setIdx })()
  }, [x.total, paused])

  let cur = 0
  if (x.total > 0) {
    cur = idx % x.total
  }

  return {
    cur,
    onPrev: makeStep({ delta: STEP_PREV, total: x.total, setIdx }),
    onNext: makeStep({ delta: STEP_NEXT, total: x.total, setIdx }),
    onEnter: makePause({ setPaused, on: true }),
    onLeave: makePause({ setPaused, on: false }),
    pickOf: makeSlidePickOf({ setIdx }),
  }
}

/**
 * 列表页的地区筛选整机。「只看重要」那个筛选已删(Frank 2026-07-18「这个去掉」);
 * 重要度徽标与头条梯队保留。
 *
 * @returns 界面语言、当前筛选与两只手柄。
 */
export function useNewsFilter(): NewsFilterPanel {
  const [lang, , t] = useLang()
  const [region, setRegion] = useState(TEXT_NONE)
  return {
    t,
    lang,
    region,
    onAll: makeRegionAll({ setRegion }),
    pickOf: makeRegionPickOf({ setRegion }),
  }
}

/**
 * 评论区整机:顶层表单 + 楼中楼回复框 + 折叠展开。发出去的每一条都落成 pending,
 * 人工审核过了才公开(信任边界:不学匿名直发)。
 *
 * @param x 这条动态的 slug。
 * @returns 表单状态与手柄。
 */
export function useComments(x: CommentsHookIn): CommentsPanel {
  const [body, setBody] = useState(TEXT_NONE)
  const [state, setState] = useState<PostState>(STATE_IDLE)
  const [replyTo, setReplyTo] = useState<number | null>(null)
  const [replyBody, setReplyBody] = useState(TEXT_NONE)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  return {
    body,
    state,
    replyTo,
    replyBody,
    expanded,
    onChange: makeTextChange({ setBody, state, setState }),
    onSubmit: makeCommentSubmit({ slug: x.slug, body, state, setState, setBody }),
    onReplyChange: makeTextChange({ setBody: setReplyBody, state, setState }),
    onReplySubmit: makeReplySubmit({
      slug: x.slug,
      replyTo,
      replyBody,
      state,
      setState,
      setReplyBody,
      setReplyTo,
    }),
    replyToggleOf: makeReplyToggleOf({ replyTo, setReplyTo, setReplyBody }),
    expandToggleOf: makeExpandToggleOf({ setExpanded }),
  }
}

/**
 * 详情页整机:AI 速读按需生成(P1f)与懒翻译(P1e,Frank 终版「线上实时」)。
 * 两样都是 per-lang 缓存 —— SSR 带下的那份命中就秒显,缺了才调接口,
 * 服务端写回 DB = 永久缓存。
 *
 * @param x 这条动态的库行(带 SSR 已有的速读与译文)。
 * @returns 界面语言、两样的现值与状态、两只手柄。
 */
export function useNewsDetail(x: NewsDetailHookIn): NewsDetailPanel {
  const [lang, , t] = useLang()
  const [transOn, setTransOn] = useState(false)
  const [transCache, setTransCache] = useState<LangCache>({
    zh: x.row.bodyZh,
    ko: x.row.bodyKo,
    en: null,
  })
  const [trState, setTrState] = useState<GenState>(STATE_IDLE)
  const [sumCache, setSumCache] = useState<LangCache>({
    zh: x.row.summaryZh,
    ko: x.row.summaryKo,
    en: x.row.summaryEn,
  })
  const [sumState, setSumState] = useState<GenState>(STATE_IDLE)

  const trans = langCacheAt({ cache: transCache, lang })
  const summary = langCacheAt({ cache: sumCache, lang })

  return {
    t,
    lang,
    transOn,
    trans,
    trState,
    summary,
    sumState,
    onSum: makeSumClick({ slug: x.row.slug, lang, sumState, setSumState, setSumCache, sumCache }),
    onTrans: makeTransClick({
      slug: x.row.slug,
      lang,
      transOn,
      trans,
      trState,
      setTransOn,
      setTrState,
      setTransCache,
      transCache,
    }),
  }
}
