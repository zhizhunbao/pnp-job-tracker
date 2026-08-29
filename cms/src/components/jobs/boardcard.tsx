'use client'
/**
 * 手机卡一张。卡 = 职位 / 公司·地点 / 薪资·时间 / 信号胶囊;每处可点,开对应字段的弹框
 * (与桌面单元格同一条路由)。版式由全站共用的 JobCard 定(2026-08-02 Frank「卡片也用
 * jobtable 的卡片」「以后这个定死」),这里只喂数据与交互。
 * 拍板:免费限额外的岗不显示匹配位(不放锁标,卡片寸土寸金);中位/渠道/NOC 码等低频字段
 * 留给弹窗。#167⑩:胶囊都归卡底那排,右上角只留星标 —— 它是按钮不是胶囊。
 * #167⑦(Frank「这个卡片最好有个更新时间吧,年月日时分秒」):发布时间只有日期没时刻
 * (Job Bank 原样),判断不了「刚抓到还是躺了一天」;更新时间是本站每小时抓取的实际时刻,
 * 精确到秒。**此处必须带标签**:一张卡上两个日期并排,值自己说不清谁是谁 —— #166
 * 「值自证就删标签」的那条例外。
 * 2026-08-28 换装批自 Jobs.tsx 重写落位。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { JobCard } from '@/components/card'
import { DateAge, TimeText } from '@/components/time'
import { COL, GRAIN_MINUTE, SPACE, TEXT_NONE } from './constants'
import {
  boardCardViewOf, makeCardFieldClick, makeCardTitleClick, makeChipClick, makeSaveToggle, someOf,
} from './functions'
import { BoardChip } from './boardchip'
import { CardLocation } from './cardlocation'
import { CardStar } from './cardstar'
import type { BoardCardIn } from './types'

/**
 * 渲染一张手机卡。
 *
 * @param props 整台状态机与这一行。
 * @returns 一张卡。
 */
export function BoardCard({ b, job }: BoardCardIn) {
  const v = boardCardViewOf({ b, job })
  const chips = []
  for (const spec of v.chips) {
    chips.push(<BoardChip key={spec.k} spec={spec} onOpen={makeChipClick({ onField: b.onField, job, spec })} />)
  }
  return (
    <JobCard href={v.href}
      title={{ text: job.title, onClick: makeCardTitleClick({ onDesc: b.onDesc, job }) }}
      note={someOf(v.note)}
      company={{
        text: job.company,
        href: v.companyHref,
        onClick: makeCardFieldClick({ onField: b.onField, job, k: COL.company, title: job.company }),
      }}
      salary={someOf(v.salary)}
      location={v.city !== TEXT_NONE && (
        <CardLocation city={v.cityText}
          prov={v.prov}
          cityHref={v.cityHref}
          provHref={v.provHref}
          onCity={makeCardFieldClick({ onField: b.onField, job, k: COL.city, title: v.cityText })}
          onProv={makeCardFieldClick({ onField: b.onField, job, k: COL.province, title: v.provText })} />
      )}
      date={<DateAge iso={job.datePosted} aging={v.aging} ageText={v.ageText} />}
      action={
        <CardStar label={v.starLabel} star={v.star} saved={v.saved}
          onToggle={makeSaveToggle({ onSave: b.onSave, job })} />
      }
      chips={chips}
      footer={job.lastSeen !== TEXT_NONE && (
        <>{b.t('col.lastSeen')}{SPACE}<TimeText iso={job.lastSeen} grain={GRAIN_MINUTE} /></>
      )} />
  )
}
