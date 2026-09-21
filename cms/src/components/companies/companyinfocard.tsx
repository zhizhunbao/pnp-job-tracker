'use client'
/**
 * 公司信息卡(2026-09-21 Frank「参考一下公司弹框」「是不是把公司信息放到一个框里,单独放到下面」
 * 「有公司卡的话,上面的显示公司名就可以去掉了」):职位详情页与职位描述弹框在正文下面挂的那张公司卡。
 * 就是公司弹框的「基本信息」卡(同一件 CompanyBasicCard),只换两处:卡标题叫「公司信息」;公司名成公司页真链接
 * (普通左键开公司弹框,在招职位与相似雇主都在那里)并在下面出库里存好的别名。
 * 卡一开照旧经 useCompanySite 报一声点开(等到有真人动作才报):缺资料的公司排进点开优先队列,
 * 译名跟着排进翻译队列(Frank「按铁律:有人看就翻」—— 没人看过的不翻)。
 * 同日 Frank「怎么不探索了」:原先这张卡「简介只查库、不联网现查」,库里没资料的公司只剩一个名字、看不到探索 ——
 * 撤掉,简介与探索进度(排队 → 抓官网 → 整理 → 翻译,查不到再联网现查兜底)与公司弹框一字不差。
 * 同日 Frank「都修」(Konverge:卡开着时工人办完了,卡还停在旧简介):官网那条活办完卡叫这里重取(onSiteDone = p.reload)。
 * 按岗位号取数,与公司弹框同一个接口;没取到(没挂公司 / 接口挂了)整卡不出。
 *
 * @author Frank
 * @time 2026-09-21 16:30:00
 */
import { makeT } from '@/lib/i18n'
import { CompanyBasicCard } from './companybasiccard'
import { LANG_EN, TEXT_NONE } from './constants'
import { aliasOf, hasDescOf, ignoreFlag } from './functions'
import { useCompanyOfJob, useCompanyTrans } from './hooks'
import type { CompanyInfoCardIn } from './types'
import css from './companies.module.css'

/**
 * 渲染公司信息卡。
 *
 * @param props 岗位号、界面语言与点公司名的去处(逐格注释见 CompanyInfoCardIn)。
 * @returns 一张卡;没取到公司时不渲。
 */
export function CompanyInfoCard({ jobId, lang, onOpenCompany }: CompanyInfoCardIn) {
  const t = makeT(lang)
  const p = useCompanyOfJob({ jobId })
  let name = TEXT_NONE
  let brief = TEXT_NONE
  let hasDesc = false
  if (p.data != null) {
    name = p.data.company.name
    brief = p.data.company.aiBrief
    hasDesc = hasDescOf({ company: p.data.company })
  }
  const tr = useCompanyTrans({ name, aiBrief: brief, hasDesc, lang })
  if (p.data == null) {
    return null
  }
  const company = p.data.company
  return (
    <div className={css.body}>
      <CompanyBasicCard company={company}
        t={t}
        lang={lang}
        showTrans={lang !== LANG_EN}
        trans={tr.trans}
        onBusy={ignoreFlag}
        head={t('co.info')}
        alias={aliasOf({ lang, aliasZh: company.aliasZh, aliasKo: company.aliasKo })}
        onOpenCompany={onOpenCompany}
        onSiteDone={p.reload} />
    </div>
  )
}
