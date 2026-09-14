'use client'
/**
 * 基本信息卡(#197 合并):身份(名称/官网/地址)与公司简介同一张卡 ——
 * 原先两张卡各带一个标题,说的是同一件事。标题「基本信息」与在招/担保卡同款
 * (Frank 2026-07-24);身份与简介之间一条横线(2026-07-23 效果图「中间横线可以」)。
 * #199(Frank「有精确地址就优先显数据库的」):DB 有精确地址(带街号/邮编)→ 显 DB 地址、
 * AI「所在地」节让位;DB 只有省级则反过来让位 AI 的市级所在地。地址可点跳 Google Map
 * (与主表地点格同源 mapsUrl)。
 * #200:AI 检索声明从卡片上方的浮注挪进卡内、接在简介内容前(卡片化后浮注显孤)。
 * 2026-08-28 拆域批自 jobs/Company.tsx 重写落位。
 * 2026-09-14 Frank「也去掉」:卡题旁的「知名企业 ↗」章撤。
 * 2026-09-14 Frank「基本信息部分默认要带地址」:地址行不再因 AI 简介里有「所在地」段而省略,一律出(无街址时退省名)。
 * 2026-09-14 Frank「这个也不需要显示」「这种地址有冲突的怎么解决」:「✨ AI 检索整理(非官方自述)+ 日期」一行撤;
 * 同日「删掉」:「官网为自动检索匹配…」那句注撤。「这个地方用英文名」:公司名称行只出英文名(别名在页眉副题);「加上省市」「这个地点不一致这种怎么处理」:「省」「市」两行 =
 * 招聘地点(companies.region 全名 / 该司在招岗的第一座城);
 * 「地址」只在库里有街址时出(与简介之间的分割线只看有没有简介,身份行至少有公司名,Frank「横线又没了????」);AI 简介的「所在地」是模型查到的总部,留在简介段里不冒充地址(两种地点各归各,不再互相顶替)。
 *
 * @author Frank
 * @time 2026-08-28 18:13:09
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconMap } from '@/components/icons'
import { Row } from '@/components/row'
import { CompanyIntro } from './companyintro'
import {
  CARD_HEAD_CLS, CARD_MD_CLS, CLS_SEP, LINK_CLS, TARGET_BLANK,
  TEXT_NONE,
} from './constants'
import {
  baseConflictOf, baseZhOf, cityOf, hasDescOf, hasIdOf, homeProvinceOf, isGovCompany, provFullOf,
} from './functions'
import type { CompanyBasicCardIn } from './types'
import { mapsUrl } from '@/lib/location'
import css from './companies.module.css'

/**
 * 基本信息卡。
 *
 * @param props 公司档案、取词函数、界面语言与对照三格(逐格注释见 CompanyBasicCardIn)。
 * @returns 一张卡;身份与简介都没有时整卡不渲。
 */
export function CompanyBasicCard({ company, t, lang, showTrans, trans, hideTopInfo, onBusy }: CompanyBasicCardIn) {
  const hasDesc = hasDescOf({ company })
  const briefCached = hasDesc === false && company.aiBrief !== TEXT_NONE
  const addr = company.address
  const hasRealAddr = company.address !== TEXT_NONE
  const prov = homeProvinceOf({ company })
  const hasId = hasIdOf({ company, addr }) || prov !== TEXT_NONE
  const hasBody = hasDesc || briefCached || company.name !== TEXT_NONE
  if (hasId === false && hasBody === false) {
    return null
  }
  return (
    <div className={CARD_MD_CLS}>
      <div className={CARD_HEAD_CLS}>
        {t('co.basic')}
        {hideTopInfo && isGovCompany({ name: company.name }) && (
          <span className={cssOf(css.badge) + CLS_SEP + cssOf(css.badgeGov) + CLS_SEP + cssOf(css.badgeInHead)}>
            {t('co.gov')}
          </span>
        )}
      </div>
      <div>
        <Row k={t('co.name')}>{company.name}</Row>
        {company.website !== TEXT_NONE && (
          <Row k={t('act.site')}>
            <LinkButton href={company.website}
              target={TARGET_BLANK}
              className={cssOf(css.siteLink) + CLS_SEP + LINK_CLS}>
              {company.website}
            </LinkButton>
          </Row>
        )}
        {prov !== TEXT_NONE && <Row k={t('col.province')}>{provFullOf({ t, code: prov })}</Row>}
        {cityOf({ company }) !== TEXT_NONE && <Row k={t('col.city')}>{cityOf({ company })}</Row>}
        {addr !== TEXT_NONE && (
          <Row k={t('act.addr')}>
            <LinkButton href={mapsUrl(addr)}
              target={TARGET_BLANK}
              className={cssOf(css.link12) + CLS_SEP + LINK_CLS}>
              <IconMap /> {addr}
            </LinkButton>
          </Row>
        )}
      </div>
      {hasBody && <div className={css.hr} />}
      <CompanyIntro company={company}
        t={t}
        lang={lang}
        showTrans={showTrans}
        trans={trans}
        skipBase={hasRealAddr || baseConflictOf({ t, company })}
        baseZh={baseZhOf({ t, lang, company })}
        onBusy={onBusy} />
    </div>
  )
}
