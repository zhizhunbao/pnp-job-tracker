'use client'
/**
 * 进度板的一张横卡(2026-10-08 照五家参考站共同形):左公司首字母块;中职位名(叠开职位描述弹框)、公司(开公司弹框)、城市;
 * 右边状态胶囊 / 薪资 + 日期一行;再右「简历」「求职信」两个链接;最右一颗钮:草稿 / 待投「继续」、收藏能投的「投递」、其余「打开」,
 * 收藏多一个「取消收藏」文字钮。手机上同一张卡按格子竖排(类里的 grid-template-areas)。
 * 2026-10-07 Frank「这两个应该弹框啊」:职位名点了叠开职位描述弹框、不跳页(原由本桶 makePushJob / LAYER_JOB 往弹框栈上叠职位层)。
 * 2026-10-09 N6 批(Frank「职位名、公司名、地点同形,省市分开」「城市 和 省份 点击 跳 google 地图」):职位名、公司名、城市、省份
 * 四格换 name 桶的现成件(JobName / CompanyName / CityName / ProvName)—— 英文在上、界面语译名灰字在下;职位名、公司名点了
 * 由件自己往弹框总线上推一层(本桶原 titleOpenOf / companyOpenOf / makePushCo / makePushJob 一并退役),城市、省份去 Google 地图;
 * 原「中文主文案 + 灰注 英文名 省码」拼一格(cityLabelOf)撤,市和省各一份。职位删了的职位名照旧不可点(Name 黑字)。
 *
 * @author Frank
 * @time 2026-10-08 16:00:00
 */
import { Button, LinkButton } from '@/components/button'
import { CityName, CompanyName, JobName, Name, ProvName } from '@/components/name'
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
          {r.jobId != null && <JobName id={r.jobId} title={r.title} sub={TEXT_NONE} />}
          {r.jobId == null && <Name en={r.title} sub={TEXT_NONE} />}
        </div>
        <div className={css.co}>
          <CompanyName name={r.company} slug={r.companySlug} zh={TEXT_NONE} ko={TEXT_NONE} />
        </div>
        <div className={css.sub}>
          {r.city !== TEXT_NONE && <CityName city={r.city} province={r.province} zh={r.cityZh} ko={r.cityKo} />}
          {r.province !== TEXT_NONE && <ProvName code={r.province} />}
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
          <Button kind={PRIMARY_KIND} sm onClick={r.onContinue}>{r.continueText}</Button>
        )}
        {r.continueHref === TEXT_NONE && r.applyHref !== TEXT_NONE && (
          <Button kind={PRIMARY_KIND} sm onClick={r.onApply}>{r.applyText}</Button>
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
