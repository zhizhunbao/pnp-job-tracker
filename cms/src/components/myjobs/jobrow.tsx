'use client'
/**
 * 进度板的一张横卡(2026-10-08 照五家参考站共同形):左公司首字母块;中职位名(叠开职位描述弹框)、公司(开公司弹框)、城市;
 * 右边状态胶囊 / 薪资 + 日期一行;再右「简历」「求职信」两个链接;最右一颗钮:草稿 / 待投「继续」、收藏能投的「投递」、其余「打开」,
 * 收藏多一个「取消收藏」文字钮。手机上同一张卡按格子竖排(类里的 grid-template-areas)。
 *
 * @author Frank
 * @time 2026-10-08 16:00:00
 */
import { Button, LinkButton } from '@/components/button'
import { Tag } from '@/components/tag'
import { CLOSED_TAG, OPEN_KIND, PRIMARY_KIND, TAG_NONE, TARGET_BLANK, TEXT_KIND, TEXT_NONE } from './constants'
import { avaClsOf } from './functions'
import type { JobRowIn } from './types'
import css from './myjobs.module.css'

/**
 * 渲染一张横卡。
 *
 * @param props 这一行的展示行。
 * @returns 横卡。
 */
export function JobRow({ r }: JobRowIn) {
  return (
    <div className={css.row} data-row={r.key}>
      <div className={avaClsOf({ cls: r.avatarCls })}>{r.avatar}</div>
      <div className={css.main}>
        <div className={css.rowTitle}>
          {r.href !== TEXT_NONE && (
            <LinkButton href={r.href} onClick={r.onTitle} className={css.title}>{r.title}</LinkButton>
          )}
          {r.href === TEXT_NONE && <span className={css.title}>{r.title}</span>}
        </div>
        <div className={css.co}>
          {r.onCompany != null && (
            <Button kind={TEXT_KIND} className={css.coLink} onClick={r.onCompany}>{r.company}</Button>
          )}
          {r.onCompany == null && r.company}
        </div>
        <div className={css.sub}>
          {r.cityName}
          {r.cityNote !== TEXT_NONE && <span className={css.cityNote}>{r.cityNote}</span>}
        </div>
      </div>
      <div className={css.meta}>
        <div className={css.pills}>
          {r.statusTag !== TAG_NONE && <Tag variant={r.statusTag}>{r.statusText}</Tag>}
          {r.closed && <Tag variant={CLOSED_TAG}>{r.closedText}</Tag>}
          {r.salary !== TEXT_NONE && <span className={css.pay}>{r.salary}</span>}
        </div>
        {r.dateText !== TEXT_NONE && <div className={css.date}>{r.dateText}</div>}
      </div>
      <div className={css.files}>
        {r.resumeHref !== TEXT_NONE && (
          <LinkButton href={r.resumeHref} target={TARGET_BLANK}>{r.resumeText}</LinkButton>
        )}
        {r.coverHref !== TEXT_NONE && <LinkButton href={r.coverHref} target={TARGET_BLANK}>{r.coverText}</LinkButton>}
      </div>
      <div className={css.acts}>
        {r.continueHref !== TEXT_NONE && (
          <Button kind={PRIMARY_KIND} sm href={r.continueHref}>{r.continueText}</Button>
        )}
        {r.continueHref === TEXT_NONE && r.applyHref !== TEXT_NONE && (
          <Button kind={PRIMARY_KIND} sm href={r.applyHref}>{r.applyText}</Button>
        )}
        {r.continueHref === TEXT_NONE && r.applyHref === TEXT_NONE && r.href !== TEXT_NONE && (
          <Button kind={OPEN_KIND} sm href={r.href}>{r.openText}</Button>
        )}
        {r.onUnsave != null && (
          <Button kind={TEXT_KIND} className={css.unsave} onClick={r.onUnsave}>{r.unsaveText}</Button>
        )}
      </div>
    </div>
  )
}
