'use client'
/**
 * 常见案例索引页正文(2026-08-13 Frank:「这个是不是放到其他页面比较好」——
 * 16 条处境在决策页占了大半屏,决策页要的是动线不是阅览室)。骨架照 /resources:
 * 1320 轨 + banner + 白卡;壳件(Header/Footer)由页面门拼,本件只出正文轨。
 * 内链职责从 /plan/pr 挪来(2026-08-13):处境详情页要被爬到,靠这一页 +
 * 顶栏资料库入口。2026-08-27 换装批自 Cases.tsx(PascalCase 迁移存量)整体重写。
 *
 * @author Frank
 * @time 2026-08-27 01:30:00
 */
import { BANNER_IMGS, Banner } from '@/components/banner'
import { IconMap } from '@/components/icons'
import { useLang } from '@/components/i18n'
import { SectionTabs } from '@/components/tabs'
import { CASES } from '@/lib/ruling'
import { BANNER_MODULE, LIB_URL_CASES, LIB_URL_OCC, LIB_URL_RESOURCES } from './constants'
import { CaseRow } from './caserow'
import css from './cases.module.css'

/**
 * 索引页正文(banner + 16 行处境)。
 *
 * @returns 正文轨。
 */
export function Cases() {
  const [, , t] = useLang()
  const rows = []
  for (const c of CASES) {
    rows.push(<CaseRow key={c.id} id={c.id} page={c.page} t={t} />)
  }
  return (
    <div className={css.track}>
      <Banner module={BANNER_MODULE}
        icon={<IconMap />}
        title={t('dp.cases')}
        sub={t('dp.casesSub')}
        images={BANNER_IMGS.library} />
      <SectionTabs tabs={[
        { href: LIB_URL_OCC, label: t('dir.occ.title'), active: false },
        { href: LIB_URL_RESOURCES, label: t('res.entry'), active: false },
        { href: LIB_URL_CASES, label: t('dp.cases'), active: true },
      ]} />
      <div className={css.indexCard}>{rows}</div>
    </div>
  )
}
