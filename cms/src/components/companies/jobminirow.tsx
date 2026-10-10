'use client'
/**
 * 卡片内职位列表的**唯一行形态**(2026-08-11 抽出):左 = 岗名蓝链 + 灰字小注,
 * 右 = 薪资 + 城市。原本只长在公司弹框「在招职位」里;职位详情页下架岗的「相似职位」
 * 要同一副皮,于是抽成组件两处共用 —— 照 JobBody「一骨架两处」先例,样式逐像素照搬。
 * #200(Frank「技能岗显示有什么意义」):裸通道档标签撤(无表头没上下文);
 * 通道信号在主表「通道」列与职位弹框里。
 * 2026-08-28 拆域批自 jobs/Company.tsx 重写落位(消费方 jobs/Job.tsx 只改 import 行)。
 * 2026-09-19 Frank「这种里面的链接都改成弹框显示」:岗名一律是真链接(原先弹框内能开 JD 的行换成钮、丢了 href);
 * 给了 onOpenJob 就拦普通左键叠开职位描述弹框,整行没载入的点了现取。
 * 2026-09-22 Frank「即使没显示出来薪资,也要占位吧。地点怎么跑上去了」:右侧薪资行一律渲(没薪资渲不折行空格占住行高),
 * 城市恒在第二行,各行对齐。
 * 2026-10-09 N6 批(Frank「这部分组件能不能全站统一」「按这种为模版」「职位名、公司名、地点同形」「城市 和 省份 点击 跳 google 地图」):
 * 本行的「岗名蓝链 + 灰字」就是全站名字两行的模板,形收进 name 桶后这里反过来用它 —— 岗名换 JobName(灰字照旧调用方算好递进来;
 * 普通左键经弹框总线按岗位号叠开职位框,Ctrl 点新标签开职位页),右下城市换 CityName(英文蓝链 + 界面语市名灰字,点了去 Google 地图,
 * 多收省码与两种市名译名三格)。职位框改由总线按号现取,递下来的 onOpenJob / row / newTab 三格从此不读,上游接线另批清;
 * 本桶只为这一行活着的链接件 CompanyLink(08-28 收成一件的「弹框里新开页、页面上同标签」链接,09-19 多一格 onClick)随之退役,
 * makeOpenJob 还有「我的」页与投递队列在用,留着。
 * 2026-10-09 N6b 批:上游接线清了 —— props 里 onOpenJob / row / newTab 三格撤(09-19 Frank「这种里面的链接都改成弹框显示」那一对手柄:
 * 原 `onOpen` 只有已载入整行才给,换成 onOpenJob + row,没载入的点了按号现取 `/api/jobs/row`);「我的」页与投递队列也换了 JobName,
 * makeOpenJob 随之退役。
 *
 * @author Frank
 * @time 2026-08-28 18:13:09
 */
import { cssOf } from '@/components/css'
import { CityName, JobName } from '@/components/name'
import { CLS_SEP, TEXT_NONE } from './constants'
import { payShownOf } from './functions'
import type { JobMiniRowIn } from './types'
import css from './companies.module.css'

/**
 * 一行迷你职位。
 *
 * @param props 岗位号、岗名、灰字与右侧薪资、城市(逐格注释见 JobMiniRowIn)。
 * @returns 一行。
 */
export function JobMiniRow({
  id,
  title,
  sub = TEXT_NONE,
  salaryText = TEXT_NONE,
  city = TEXT_NONE,
  province = TEXT_NONE,
  cityZh = TEXT_NONE,
  cityKo = TEXT_NONE,
}: JobMiniRowIn) {
  return (
    <div className={css.jobRow}>
      <span className={cssOf(css.jobL) + CLS_SEP + cssOf(css.jobLink)}>
        <JobName id={id} title={title} sub={sub} />
      </span>
      <span className={css.jobR}>
        <div className={css.jobPay}>{payShownOf(salaryText)}</div>
        <div className={css.jobCity}>
          {city !== TEXT_NONE && <CityName city={city} province={province} zh={cityZh} ko={cityKo} />}
        </div>
      </span>
    </div>
  )
}
