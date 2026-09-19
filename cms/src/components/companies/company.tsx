'use client'
/**
 * companies 域的结构:/companies/[slug] 公司详情整页正文。
 * E8-11 B1(Frank「以弹框为准,一个来源」):公司详情页 = 壳(面包屑/H1/JSON-LD 由 page.tsx
 * 出 JSON-LD)+ CompanyBody 同源骨架。骨架与公司弹框**同一组件同一份 CompanyDetail**
 * (改一处两边生效,CompanyBody 拆分前住在 JobsTable 里);排版随弹框换 JD 扁平 ——
 * 原「一节一卡」多卡壳退役(#187「先只改弹框」的另一半在此收口)。
 * 三条铁律(E8-09 §1)不变:一页一域、一条信息一个家、公司页全事实层免费。
 * 语言/文案全站一处(LangProvider),初值由服务端 cookie 定,所以正文自己接 useLang。
 * 2026-08-27 换装批自 Company.tsx 整体重写成小写件形制(内联样式逐格迁类、
 * 散值进 constants、三目与闭包函数进 functions);同日 Frank 走查再收一刀 ——
 * 壳件(整页容器 / 顶栏 / 页脚)拼装归页面门(样张 account),本件只出 Shell 轨往下的视图,
 * `loggedIn` 随顶栏一起退出本件的契约。
 * 2026-09-03 Frank「所有的详情页面的返回按钮都在右上,样式和位置应该是固定统一的」:
 * 头卡右上角那颗自绘返回钮撤,改递 Shell 的 back 槽(button 桶 BackButton,落点仍是 URL_BACK)。
 * 2026-09-14 Frank「返回按钮放到卡片右上角」「完整页面也加上加载中」「所有懒加载翻译完了,再显示页面」
 * 「这个公司名要加中文翻译」:返回钮进标题卡右上角(照职位详情页);别名从名后小字改成名下一行,库里没有的
 * 懒翻一次;懒翻没收尾前整页只出转圈行。同日「这个 nav 对么」「雇主 nav 加省市和公司行业」:面包屑「雇主 › 省(链雇主板按省)› 市 › 行业 › 公司」;
 * 「这个地方的中文翻译呢」:中 / 韩界面简介默认带对照。
 * 2026-09-19 Frank「这个跳转一个干巴巴的加载中太难看了吧」:等译名的这一会儿不再是空页左上角一行字 —— 先出标题卡
 * (公司名 + 返回),下面一张白卡占位、转圈居中;「所有懒加载翻译完了再显示正文」那条不变。
 * 2026-09-19 Frank「这种里面的链接都改成弹框显示…现在点击是跳页面,要想看其他的还得点回来」:在招职位 / 相似雇主
 * 点了不再跳走 —— 页上叠开职位描述弹框 / 公司弹框(与职位板同两件);链接本身还在(爬虫、Ctrl 点新标签照旧)。
 * 两个弹框点 advisor 的**文件**不走桶:那只桶的完整弹框反过来要本桶的 CompanyPanel,走桶就成环。
 *
 * @author Frank
 * @time 2026-08-27 02:10:00
 */
import { ActModal } from '@/components/advisor/actmodal'
import { CompanyModal } from '@/components/advisor/companymodal'
import { BackButton, LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { useLang } from '@/components/i18n'
import { CompanyBody } from './companybody'
import { Loading } from '@/components/loading'
import { Notice } from '@/components/notice'
import { Shell } from '@/components/shell'
import {
  BROAD_KEY_HEAD, CRUMB_SEP, LANG_EN, NOC_DESC_NONE, NOTICE_KIND_INFO, SHELL_TOP, TEXT_NONE, URL_BACK, URL_EMPLOYERS,
  URL_EMPLOYERS_PROV,
} from './constants'
import { aliasOf, cityOf, provFullOf } from './functions'
import { useCompanyAlias, useCompanyPeek } from './hooks'
import type { CompanyIn } from './types'
import css from './companies.module.css'

/**
 * 公司详情页正文。
 *
 * @param props 公司档案、相似雇主、数据更新时刻与分层态(逐格注释见 CompanyIn)。
 * @returns 正文(Shell 轨 + 面包屑 + 头卡 + CompanyBody 卡组)。
 */
export function Company({ company, similar = [], updatedAt, plan }: CompanyIn) {
  const [lang, , t] = useLang()
  const peek = useCompanyPeek()
  const aliasPanel = useCompanyAlias({
    name: company.name, lang, cached: aliasOf({ lang, aliasZh: company.aliasZh, aliasKo: company.aliasKo }),
  })
  const alias = aliasPanel.alias
  if (aliasPanel.settled === false) {
    return (
      <Shell top={SHELL_TOP}>
        <div className={css.track}>
          <div className={css.headCard}>
            <div className={cssOf(css.cardBack)}>
              <BackButton fallback={URL_BACK} label={t('detail.back')} />
            </div>
            <h1 className={css.h1}>{company.name}</h1>
          </div>
          <div className={`${css.headCard} ${css.waitCard}`}><Loading text={t('act.loadingText')} /></div>
        </div>
      </Shell>
    )
  }
  return (
    <Shell top={SHELL_TOP}>
      <div className={css.track}>
        <div className={css.crumb}>
          <LinkButton href={URL_EMPLOYERS} className={cssOf(css.crumbLink)}>{t('nav.employers')}</LinkButton>
          {company.province !== TEXT_NONE && <>
            {CRUMB_SEP}
            <LinkButton href={URL_EMPLOYERS_PROV + company.province} className={cssOf(css.crumbLink)}>
              {provFullOf({ t, code: company.province })}
            </LinkButton>
          </>}
          {cityOf({ company }) !== TEXT_NONE && <>
            {CRUMB_SEP}
            <span className={css.crumbNow}>{cityOf({ company })}</span>
          </>}
          {company.industry !== TEXT_NONE && <>
            {CRUMB_SEP}
            <span className={css.crumbNow}>{t(BROAD_KEY_HEAD + company.industry)}</span>
          </>}
          {CRUMB_SEP}
          <span className={css.crumbNow}>{t('co.crumb')}</span>
        </div>
        <div className={css.headCard}>
          <div className={cssOf(css.cardBack)}>
            <BackButton fallback={URL_BACK} label={t('detail.back')} />
          </div>
          <h1 className={css.h1}>{company.name}</h1>
          {alias !== TEXT_NONE && <div className={css.h1Sub}>{alias}</div>}
        </div>
        <CompanyBody company={company} similar={similar} t={t} lang={lang} updatedAt={updatedAt}
          showTrans={lang !== LANG_EN}
          onOpenJob={peek.onOpenJob}
          onOpenCompany={peek.onOpenCompany} />
        {company.jobs.length === 0 && <Notice kind={NOTICE_KIND_INFO}>{t('co.notFound')}</Notice>}
      </div>
      {peek.co != null && (
        <CompanyModal slug={peek.co.slug} name={peek.co.name} lang={lang}
          onOpenJob={peek.onOpenJob}
          onOpenCompany={peek.onOpenCompany}
          onClose={peek.onCloseCo} />
      )}
      {peek.job != null && (
        <ActModal key={peek.job.id} job={peek.job} lang={lang} plan={plan} nocDesc={NOC_DESC_NONE}
          onClose={peek.onCloseJob} />
      )}
    </Shell>
  )
}
