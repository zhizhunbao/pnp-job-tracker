'use client'
/**
 * jobtitle 域的两台懒翻:一组职位名批量翻(useTitleMap,2026-09-23 自 companies 桶搬来)、
 * 一岗按岗翻(useTitleTrans,同日自 advisor 桶搬来;cached 改传这一岗库里存好的译名)。
 *
 * @author Frank
 * @time 2026-09-23 01:45:57
 */
import { useEffect, useState } from 'react'
import { LANG_EN, TEXT_NONE, TITLES_KEY_SEP } from './constants'
import { makeLoadTitles, makeLoadTitleTrans } from './functions'
import type { DeadFlag, TitleMapHookIn, TitleTransHookIn } from './types'

/**
 * 一组职位名的译名表(2026-09-14):组合变了就再打一次接口;英文界面或空组不打。
 *
 * @param x 要翻的一组与界面语言。
 * @returns 职位名 → 译名(还没回来是空表)。
 */
export function useTitleMap(x: TitleMapHookIn): Record<string, string> {
  const [map, setMap] = useState<Record<string, string>>({})
  const key = x.titles.join(TITLES_KEY_SEP)
  const lang = x.lang
  const want = key !== TEXT_NONE && lang !== LANG_EN

  useEffect(function loadTitles() {
    const flag: DeadFlag = { dead: false }
    if (want) {
      makeLoadTitles({ titles: key.split(TITLES_KEY_SEP), lang, setMap })(flag)
    }
    return function stop(): void {
      flag.dead = true
    }
  }, [want, key, lang])

  return map
}

/**
 * 一岗标题下的副题:库里存好的直接用;没有且界面非英文,懒翻一次这一岗的标题(2026-09-14 Frank「这个翻译呢」;
 * 歧义标题服务端带着正文按岗翻、只写回这一岗)。职位弹框与职位详情页共用(2026-09-23)。
 *
 * @param x 职位名、岗位号、界面语言、库里存好的译名与重译代数。
 * @returns 副题;'' = 还没有。
 */
export function useTitleTrans(x: TitleTransHookIn): string {
  const [text, setText] = useState(x.cached)
  const [prevCached, setPrevCached] = useState(x.cached)
  if (prevCached !== x.cached) {
    setPrevCached(x.cached)
    setText(x.cached)
  }
  const [prevGen, setPrevGen] = useState(x.gen)
  if (prevGen !== x.gen) {
    setPrevGen(x.gen)
    setText(TEXT_NONE)
  }
  const title = x.title
  const id = x.id
  const lang = x.lang
  const want = text === TEXT_NONE && title !== TEXT_NONE && lang !== LANG_EN

  useEffect(function loadTitle() {
    if (want) {
      makeLoadTitleTrans({ title, id, lang, setText })()
    }
  }, [want, title, id, lang])

  return text
}
