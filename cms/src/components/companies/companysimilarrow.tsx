'use client'
/**
 * 相似雇主的一行:公司名蓝链 + 右侧灰字(担保档名 + 在招数)。
 * 档色与列表「通道」列同源色阶 —— 🔴 未评/无记录给浅灰,不给负判定的暗示。
 * 2026-08-28 拆域批自 jobs/Company.tsx 的 similar.map 体重写成件。
 *
 * style 白名单:担保档色是数据算出来的运行时值,不是静态样式。
 * 2026-09-14 Frank「相似雇主要加翻译」「这些相似雇主的中文名都加上懒加载翻译」:名下第二行出中 / 韩别名,
 * 库里没有的开框懒翻一次落库(useCompanyAlias)。
 * 2026-09-14 Frank「这些都删了」:行右的「近期办过 LMIA / 办过 LMIA」担保档字撤,只留在招数(档位仍是排序键)。
 * 2026-09-19 Frank「这种里面的链接都改成弹框显示」:给了 onOpenCompany 就拦普通左键开公司弹框,链接本身不动。
 * 2026-09-22 Frank「公司所在城市,是不是也加一下灰字」:行右在招数下面第二行出主市灰字(紧凑格「市, 省码」)。
 * 2026-10-09 N6 批(Frank「职位名、公司名、地点同形,省市分开」「城市 和 省份 点击 跳 google 地图」「弹框里再点叠一层,关只关顶层」):
 * 公司名换全站名字组件 name 桶 CompanyName —— 英文蓝链在上、别名灰字在下(别名照旧 useCompanyAlias 懒取、照旧跟中文对照开关走,
 * 取到的是界面语那一份,中 / 韩两格递同一个),点了经弹框总线**叠开**公司弹框(原先在公司弹框里是同框换一家,改叠一层);
 * 行右主市的「市, 省码」一格拆成市、省两个名字(CityName / ProvName,各自英文蓝链 + 界面语灰字,点了去 Google 地图;
 * 相似雇主行不带市的译名,市只出英文)。递下来的 onOpenCompany / newTab 两格从此不读,上游接线另批清;
 * 本桶的 simCityOf、makeOpenCompany 与别名灰字类 .simAlias 随之退役(09-14「相似雇主要加翻译」那条见上,形照旧)。
 * 2026-10-09 N6b 批:上游接线清了 —— props 里 onOpenCompany / newTab 两格撤(09-19「给了 onOpenCompany 就拦普通左键开公司弹框」至此连形状一起退役)。
 *
 * @author Frank
 * @time 2026-08-28 18:13:09
 */
import { cssOf } from '@/components/css'
import { CityName, CompanyName, ProvName } from '@/components/name'
import { TEXT_NONE } from './constants'
import { aliasOf, zhShownOf } from './functions'
import { useCompanyAlias } from './hooks'
import type { CompanySimilarRowIn } from './types'
import css from './companies.module.css'

/**
 * 相似雇主一行。
 *
 * @param props 这一家、取词函数、界面语言与中文对照开关(逐格注释见 CompanySimilarRowIn)。
 * @returns 一行。
 */
export function CompanySimilarRow({ employer, t, lang, showTrans }: CompanySimilarRowIn) {
  const alias = useCompanyAlias({
    name: employer.name, lang, cached: aliasOf({ lang, aliasZh: employer.aliasZh, aliasKo: employer.aliasKo }),
  }).alias
  const sub = zhShownOf({ show: showTrans, text: alias })
  return (
    <div className={css.simRow}>
      <span className={cssOf(css.simName)}>
        <CompanyName name={employer.name} slug={employer.slug} zh={sub} ko={sub} />
      </span>
      <span className={css.simMeta}>
        {employer.openCount > 0 && (
          <span className={css.simOpen}>{t('co.openJobs')} {employer.openCount}</span>
        )}
        {employer.city !== TEXT_NONE && (
          <span className={css.simCity}>
            <CityName city={employer.city} province={employer.province} zh={TEXT_NONE} ko={TEXT_NONE} />
            {employer.province !== TEXT_NONE && <ProvName code={employer.province} />}
          </span>
        )}
      </span>
    </div>
  )
}
