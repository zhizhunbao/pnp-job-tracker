'use client'
/**
 * 整理版的一节:小标题 + 按档渲的正文。六档的判据在 functions 的 jdSecModeOf
 * (「怎么投」三档、薪资兜底、整节缺、有内容)。
 * 2026-08-28 换装批自 Jd.tsx 的 JdFormattedView 体内提出成文件。
 * 2026-09-14 Frank「未提及不需要显示」「这个删掉吧。投递只能用我的前往投递按钮」:「原帖未提及」的节整节不渲;
 * 「怎么投」整节不渲(链接 / 邮箱 / 行文三档都不出,投递出口只留投递栏的钮;JdApplyLines 件随撤)。
 * 2026-09-14 Frank「这个地点应该是可以点击跳到 google map 的」:「工作地点」节的英文行链 Google 地图。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { mapsUrl } from '@/lib/location'
import { JD_SEC_APPLY, JD_SEC_LOC, SEC_MODE, TARGET_BLANK, TEXT_NONE } from './constants'
import { jdLocationTextOf, jdLocationZhTextOf } from './functions'
import { JdSecLines } from './jdseclines'
import { JdZhLine } from './jdzhline'
import type { JdSectionIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染整理版的一节。
 *
 * @param props 这一节的展示行。
 * @returns 一节。
 */
export function JdSection({ sec }: JdSectionIn) {
  if (sec.mode === SEC_MODE.none || sec.m === JD_SEC_APPLY) {
    return null
  }
  return (
    <div className={cssOf(css.sec)}>
      {sec.head !== TEXT_NONE && <div className={cssOf(css.secHead)}>{sec.head}</div>}
      {sec.mode === SEC_MODE.payFallback && (
        <ul className={cssOf(css.bullets)}><li>{sec.payFallback}<JdZhLine zh={sec.payFallbackZh} /></li></ul>
      )}
      {sec.mode === SEC_MODE.lines && sec.m === JD_SEC_LOC && (
        <div className={cssOf(css.indent)}>
          <LinkButton href={mapsUrl(jdLocationTextOf(sec))} target={TARGET_BLANK} className={cssOf(css.jdLink)}>
            {jdLocationTextOf(sec)}
          </LinkButton>
          <JdZhLine zh={jdLocationZhTextOf(sec)} />
        </div>
      )}
      {sec.mode === SEC_MODE.lines && sec.m !== JD_SEC_LOC && (
        <>
          {sec.payFallback !== TEXT_NONE && (
            <ul className={cssOf(css.bullets)}><li>{sec.payFallback}<JdZhLine zh={sec.payFallbackZh} /></li></ul>
          )}
          <JdSecLines pairs={sec.pairs} bullets={sec.bullets} />
        </>
      )}
    </div>
  )
}
