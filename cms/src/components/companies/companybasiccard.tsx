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
 * 2026-09-18 Frank「类别应该放到基本信息吧」:「政府机构」绿章撤(详情页正文顶那一行、弹框卡题旁那一枚都撤,
 * companytopinfo.tsx 随之退役),改成身份行里的「类别」一行,紧跟公司名称;不是政府机构的不出这一行。
 * 2026-09-19 Frank「省 市 去掉,改成 总部 和 在招地 两个」(Compass Group Canada 实拍:省 / 市取到某一条岗的 Windsor NS,
 * 看着像总部):「省」「市」两行撤,换「总部」(AI 简介的「所在地」提上来,没缓存不出)与「在招地」两行;
 * 09-14 那条「AI 所在地留在简介段里」随之作废 —— 提成「总部」行后简介里不再重复出那一节。
 * 同日 Frank「拿不到总部的就先 -」:总部行一律出,拿不到出「—」(值包一层 span:Row 通用件见「—」整行不出,这一行特意要出);缓存着的简介里「所在地」节一律不再出
 * (有出处的已提成总部行,没出处的是模型裸答不算数,「这不是胡说吗」)。
 * 同日晚 Frank「公司详情的在招地 去掉吧,没有意义」:「在招地」行撤(连同它的取数链),岗位在哪看下面的在招职位卡。
 * 2026-09-20 真总部进库:「总部」行先用库里的真总部(官网页面原句核对过的,官网没标的退 Wikidata),值点开就是出处那一页;
 * 库里没有的照旧走有出处的 AI 简介,不成链。
 * 2026-09-21 职位页 / 职位弹框也挂这张卡(Frank「参考一下公司弹框」「是不是把公司信息放到一个框里,单独放到下面」,经 CompanyInfoCard):
 * 卡标题可换(「公司信息」)、公司名可成链接(点了开公司弹框)并在下面出库里存好的别名;
 * 公司弹框与公司页不递这几格,一字不变。简介与探索进度与公司弹框同一套(同日 Frank「怎么不探索了」)。
 * 同日 Frank「这个点开应该是打开 google 地图吧」:「总部」行点开改成 Google 地图(与「地址」行同一个去处),上面 09-20「点开就是出处那一页」作废。
 * 同日 Frank「都修」(Konverge:职位弹框里的卡开着时工人办完了,卡还停在旧简介、没官网没总部):一律问进度到办完,
 * 铺着简介的卡办完叫宿主整卡重取(onSiteDone,siteDoneOf 判);简介区空着的那一档照旧由 CompanyAiSection 自己补。
 * 同日 Frank「这个地址有重复啊」(YES Employment Services 实拍:总部、地址、简介「所在地」同一处说了三遍)「AI 下面那个不用显示地址是吧」:
 * 简介「所在地」节一律不出(原先只在简介缓存着时才藏,点开那一刻工人办完、懒查回来的简介漏了;总部行是「—」时剩下的「所在地」
 * 只可能是没出处的模型答案,按 09-19 本就不算数)—— 所在地对照行(baseZh)的接线随之闲置,清理另立批次;
 * 「地址」行和总部重复时不出(同一个加拿大省、同一座市、又不比总部细,addrShownOf),美国总部、没写省的总部一律两行都出
 * (「有的公司 总部 和 地址不一样啊」「总部是美国,地址是加拿大也有可能啊」)。
 * 同日 Frank「这两个现在显示格式不一样」:「总部」「地址」两行共用 CompanyPlace(地图图标 + 同一字号),地址行按 09-20「都带上国家」补 Canada。
 *
 * @author Frank
 * @time 2026-08-28 18:13:09
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { Row } from '@/components/row'
import { CompanyIntro } from './companyintro'
import { CompanyNameCell } from './companynamecell'
import { CompanyPlace } from './companyplace'
import {
  CARD_HEAD_CLS, CARD_MD_CLS, CLS_SEP, LINK_CLS, TARGET_BLANK,
  TEXT_NONE,
} from './constants'
import {
  addrShownOf, baseZhOf, cardTitleOf, hasDescOf, hasIdOf, homeProvinceOf, hqMapOf, ignoreDone, isGovCompany,
  siteDoneOf, siteHqOf, siteWebsiteOf, wikiTitleOf,
} from './functions'
import { useCompanySite } from './hooks'
import type { CompanyBasicCardIn } from './types'
import { mapsUrl } from '@/lib/location'
import css from './companies.module.css'

/**
 * 基本信息卡。
 *
 * @param props 公司档案、取词函数、界面语言、对照三格与职位页那几格(逐格注释见 CompanyBasicCardIn)。
 * @returns 一张卡;身份与简介都没有时整卡不渲。
 */
export function CompanyBasicCard({
  company, t, lang, showTrans, trans, onBusy, head = TEXT_NONE, alias, onOpenCompany, onSiteDone = ignoreDone,
}: CompanyBasicCardIn) {
  const hasDesc = hasDescOf({ company })
  const briefCached = hasDesc === false && company.aiBrief !== TEXT_NONE
  const prov = homeProvinceOf({ company })
  const onDone = siteDoneOf({ fn: onSiteDone, settled: hasDesc || briefCached })
  const site = useCompanySite({ name: company.name, onDone })
  const hq = siteHqOf({ company, site, t, lang })
  const addr = addrShownOf({ addr: company.address, hq })
  const website = siteWebsiteOf({ company, site, t, lang })
  const hasId = hasIdOf({ company, addr: company.address }) || prov !== TEXT_NONE
  const hasBody = hasDesc || briefCached || company.name !== TEXT_NONE
  if (hasId === false && hasBody === false) {
    return null
  }
  return (
    <div className={CARD_MD_CLS}>
      <div className={CARD_HEAD_CLS}>{cardTitleOf({ t, head })}</div>
      <div>
        <Row k={t('co.name')}>
          <CompanyNameCell company={company} alias={alias} onOpenCompany={onOpenCompany} />
        </Row>
        {isGovCompany({ name: company.name }) && <Row k={t('co.sector')}>{t('co.gov')}</Row>}
        {website !== TEXT_NONE && (
          <Row k={t('act.site')}>
            <LinkButton href={website}
              target={TARGET_BLANK}
              className={cssOf(css.siteLink) + CLS_SEP + LINK_CLS}>
              {website}
            </LinkButton>
          </Row>
        )}
        {company.careersUrl !== TEXT_NONE && (
          <Row k={t('co.careers')}>
            <LinkButton href={company.careersUrl}
              target={TARGET_BLANK}
              className={cssOf(css.siteLink) + CLS_SEP + LINK_CLS}>
              {company.careersUrl}
            </LinkButton>
          </Row>
        )}
        {company.wikiUrl !== TEXT_NONE && (
          <Row k={t('co.wiki')}>
            <LinkButton href={company.wikiUrl}
              target={TARGET_BLANK}
              className={cssOf(css.siteLink) + CLS_SEP + LINK_CLS}>
              {wikiTitleOf(company.wikiUrl)}
            </LinkButton>
          </Row>
        )}
        <Row k={t('co.hq')}><CompanyPlace text={hq} href={hqMapOf(hq)} /></Row>
        {addr !== TEXT_NONE && <Row k={t('act.addr')}><CompanyPlace text={addr} href={mapsUrl(addr)} /></Row>}
      </div>
      {hasBody && <div className={css.hr} />}
      <CompanyIntro company={company}
        t={t}
        lang={lang}
        showTrans={showTrans}
        trans={trans}
        skipBase
        baseZh={baseZhOf({ t, lang, company })}
        onBusy={onBusy}
        stage={site.stage} />
    </div>
  )
}
