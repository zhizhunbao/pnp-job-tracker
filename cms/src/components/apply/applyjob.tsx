'use client'
/**
 * 投递页顶上的本岗职位卡(card 桶 JobCard):职位名链回职位页、公司、城市与省码;已投递时右上挂绿色「已投递」。
 * 2026-10-07 投递并进「我的求职」:发出后投递区收起、记录进下面的表,绿标随之撤。
 * 2026-10-09 投递弹框换 section 形(Frank「这个地方英文,中文灰字 没有啊」「最好改成 section 布局吧,类似于其他的弹框」):
 * 照公司弹框「基本信息」那一块 —— 白卡分区 + 小标题「职位信息」+ 四行键值(职位、公司、城市、省份;市和省分开),
 * 每格英文在上、界面语译名灰字在下。原 JobCard 职位卡(职位名链回职位页、城市省码拼一格)撤;框已叠在职位页上,不再链回。
 * 同日 N 批(Frank「这部分组件能不能全站统一」「而且这些英文应该是可以点击的」):四格换全站名字组件(name 桶 Name;本桶原
 * ApplyName 退役)—— 职位名点了叠开职位框、公司名点了叠开公司框(弹框总线,叠在投递框上),城市、省份点了新标签开 Google 地图。
 * 四格各用 name 桶的现成件(JobName / CompanyName / CityName / ProvName),取名与点击的行为全站只住那一处。
 *
 * @author Frank
 * @time 2026-10-07 03:00:00
 */
import { useLang } from '@/components/i18n'
import { CityName, CompanyName, JobName, ProvName } from '@/components/name'
import { Row } from '@/components/row'
import { CARD_HEAD_CLS, CARD_MD_CLS, ROW_KEYS, SEC_JOB_KEY, TEXT_NONE } from './constants'
import type { ApplyJobIn } from './types'

/**
 * 「职位信息」分区。
 *
 * @param props 本岗与职位名灰字。
 * @returns 白卡分区。
 */
export function ApplyJob({ job, titleSub }: ApplyJobIn) {
  const [, , t] = useLang()
  return (
    <div className={CARD_MD_CLS}>
      <div className={CARD_HEAD_CLS}>{t(SEC_JOB_KEY)}</div>
      <div>
        <Row k={t(ROW_KEYS.title)}><JobName id={job.id} title={job.title} sub={titleSub} /></Row>
        {job.company !== TEXT_NONE && (
          <Row k={t(ROW_KEYS.company)}>
            <CompanyName name={job.company} slug={job.companySlug} zh={job.companyZh} ko={job.companyKo} />
          </Row>
        )}
        {job.city !== TEXT_NONE && (
          <Row k={t(ROW_KEYS.city)}>
            <CityName city={job.city} province={job.province} zh={job.cityZh} ko={job.cityKo} />
          </Row>
        )}
        {job.province !== TEXT_NONE && <Row k={t(ROW_KEYS.province)}><ProvName code={job.province} /></Row>}
      </div>
    </div>
  )
}
