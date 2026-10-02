'use client'
/**
 * 字段顾问弹框:点表格里的一格 → 开这一格背后的事实。
 * E8-10:入参从 24 值的 field 改为 3 值的 group;field 保留仅用于「打开时锚到哪一节」
 * 与该行高亮,不再参与内容分支。
 * 「对我意味着什么」(E5-00)个人相关性放最上,依据链同源 match();#161
 * (Frank「公司显示这些信息也不合适吧」):公司面板不渲它 —— 表里七个维度
 * (职业方向/所在省/省提名粗筛/EE/技能层级/薪资)全是**岗位级**事实,挂在
 * 「Agilent Technologies」这个标题下答非所问(用户点公司是想了解公司)。岗位级判定留在岗位面板。
 * 建档 CTA 删(2026-07-25 Frank「这个去掉没什么意义」);免责/AI 声明不进弹框
 * (2026-07-06 用户拍板:合规统一在 footer 说明)。
 * 2026-08-28 换装批自 Advisor.tsx 重写落位(浮层机器与三台状态机迁 hooks,
 * 页眉/钮栏/正文/AI 卡各成一件)。
 * 2026-09-14 Frank「按钮都去掉」:字段弹框的钮条撤(FieldActs 件随撤);中 / 韩界面对照默认开(hooks)。
 * 2026-09-16 Frank「公司的也对照改一下」:公司组页眉译名行右端挂中文对照开关(通用件 Switch,状态 = 既有的 showZh),
 * 公司弹框正文的对照行随它开合;与职位描述弹框同一副样子。
 * 2026-09-26 /fe 首页 Frank:省提名清单与抽选两张整表不再随首屏内联,本框打开时自己懒取(usePnpData):
 * 正文读两表的组(PNP_DATA_GROUPS)等两表到齐再渲,等的时候出全站统一的加载行(Loading),取挂了出红色提醒框;
 * 别的组(公司、分类……)照旧当场出。
 * 2026-09-28 并壳(Frank「别并存啊」):壳换成 modal 桶的 Modal(窗口形);窗口钮走本域 WinActs,Esc 由 Modal 按打开先后排号接。
 * 同日标题下灰字改走全站口径(标题译名,与职位描述弹框同一台 useTitleTrans;09-23「统一成标题译名」那批漏了字段弹框)。
 * 同日 Frank「AI 顾问卡删了吧」:移民组那张 AI 长文卡(总开关 07-25 起一直关着)连同长文机器删掉。
 * 同日省提名弹框自立(Frank「pnp 弹框自己管自己」):省提名组不再经本框(职位板直开 pnp 桶的 PnpModal);
 * 整表懒取随之迁进 pnp 桶(usePnpData),本框别的组照旧读清单 / 抽选两表,配额 / 门槛两表不再进取数包。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { storedTitleOf, useTitleTrans } from '@/components/jobtitle'
import { Loading } from '@/components/loading'
import { Modal } from '@/components/modal'
import { Notice } from '@/components/notice'
import { MeansForMe, usePnpData } from '@/components/pnp'
import { makeT } from '@/lib/i18n'
import {
  ADV_PANEL_H, ADV_PANEL_W, ADV_PREF, GROUP_IMMIGRATION, NOTICE_ERR, PNP_DATA_GROUPS,
} from './constants'
import { AdvisorBody } from './advisorbody'
import { AdvisorHead } from './advisorhead'
import { companyRefreshOf, fieldPageOf, headSubOf, modalTitleOf, planClbOf, transTitleOf } from './functions'
import { useAdvisorModal } from './hooks'
import type { AdvisorFacts, AdvisorModalIn } from './types'
import { WinActs } from './winacts'

/**
 * 渲染字段顾问弹框。
 *
 * @param props 分组、入口格、这一岗、标题、语言、分层态、五张维度表与两个回调(省提名两表本框自己懒取)。
 * @returns 浮层。
 */
export function AdvisorModal({
  group,
  field,
  job,
  title,
  lang,
  plan,
  news,
  eeOcc,
  nocDesc,
  onClose,
  onOpenJob,
  onOpenCompany,
}: AdvisorModalIn) {
  const t = makeT(lang)
  const m = useAdvisorModal({ group, field, job, lang })
  const pnp = usePnpData({ enabled: PNP_DATA_GROUPS.has(group) })
  const trans = useTitleTrans({
    title: transTitleOf({ group, job }), id: job.id, lang, cached: storedTitleOf({ row: job, lang }), gen: m.gen,
  })
  const f: AdvisorFacts = {
    job,
    lang,
    pnpOcc: pnp.occ,
    pnpDraws: pnp.draws,
    news,
    profileClb: planClbOf({ plan }),
    eeOcc,
    nocDesc,
    showZh: m.showZh,
  }
  const head = (
    <AdvisorHead t={t} group={group}
      title={modalTitleOf({ group, job, title })}
      sub={headSubOf({ group, trans, companyAlias: m.companyAlias })}
      ctl={null} />
  )
  return (
    <Modal onClose={onClose}
      win={{ head, memo: ADV_PREF, w: ADV_PANEL_W, h: ADV_PANEL_H, jd: false }}
      actions={(
        <WinActs t={t} onRefresh={companyRefreshOf({ plan, group, job, onDone: m.onRetranslated })}
          pageHref={fieldPageOf({ group, slug: job.companySlug })} />
      )}>
      {pnp.ready === false && pnp.failed === false && <Loading text={t('act.loadingText')} />}
      {pnp.failed && <Notice kind={NOTICE_ERR}>{t('de.loadFailed')}</Notice>}
      {pnp.ready && group === GROUP_IMMIGRATION && (
        <MeansForMe job={job} lang={lang} plan={plan} pnpOcc={pnp.occ} eeOcc={eeOcc} nocDesc={nocDesc} />
      )}
      {pnp.ready && (
        <AdvisorBody group={group} field={field}
          companyJobs={m.companyJobs}
          onOpenJob={onOpenJob}
          onOpenCompany={onOpenCompany}
          onCompanyAlias={m.onCompanyAlias}
          onCompanyTransBusy={m.onTransBusy}
          gen={m.gen}
          f={f} />
      )}
    </Modal>
  )
}
