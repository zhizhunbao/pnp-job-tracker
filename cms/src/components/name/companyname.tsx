'use client'
/**
 * 公司名两行(2026-10-09 N 批):英文公司名蓝链在上、界面语译名灰字在下;普通左键叠开公司框,Ctrl 点新标签开公司页。
 * 没有公司页(slug 空)的就是黑字不可点;池键(`n:` 开头,AIP 名单里对不上公司表的)只开公司框、不给整页链接(N6 补)。
 *
 * @author Frank
 * @time 2026-10-09 09:00:00
 */
import { useLang } from '@/components/i18n'
import { usePeekBus } from '@/components/modal'
import { TEXT_NONE, URL_COMPANY_HEAD } from './constants'
import { isPoolKey, makeCoPeek, subOf } from './functions'
import { Name } from './name'
import type { CoLayer, CompanyNameIn } from './types'

/**
 * 公司名两行。
 *
 * @param props 公司名、slug 与两种译名。
 * @returns 两行(或一行)。
 */
export function CompanyName({ name, slug, zh, ko }: CompanyNameIn) {
  const [lang] = useLang()
  const bus = usePeekBus<CoLayer>()
  const sub = subOf({ lang, zh, ko })
  return (
    <>
      {slug === TEXT_NONE && <Name en={name} sub={sub} />}
      {slug !== TEXT_NONE && isPoolKey(slug) && (
        <Name en={name} sub={sub} onOpen={makeCoPeek({ push: bus.push, co: { slug, name } })} />
      )}
      {slug !== TEXT_NONE && isPoolKey(slug) === false && (
        <Name en={name} sub={sub} href={URL_COMPANY_HEAD + slug}
          onOpen={makeCoPeek({ push: bus.push, co: { slug, name } })} />
      )}
    </>
  )
}
