'use client'
/**
 * city 域的结构:城市页的两张链接表 —— 最新职位(进职位详情页)、主要雇主(进公司页)。
 * 2026-09-20 站内链接批三(Frank「按你推荐来」「都改完」):城市页此前零出站链接,进来的人与爬虫都没有下一步;
 * 表形照全站基准(通用 Table),自 City 体外立件(那一个函数过了行数上限)。
 *
 * @author Frank
 * @time 2026-09-20 16:20:00
 */
import { Table } from '@/components/table'
import { Updated } from '@/components/time'
import { empLinkColsOf, empLinkRowKeyOf, jobLinkColsOf, jobLinkRowKeyOf } from './functions'
import type { CityEmployerIn, CityJobIn, CityLinksIn } from './types'
import css from './city.module.css'

/**
 * 两张链接表。
 *
 * @param props 两份清单、取词函数与更新时刻(逐格注释见 CityLinksIn)。
 * @returns 至多两张白卡;清单空的那张不出。
 */
export function CityLinks({ jobs, employers, t, updatedAt }: CityLinksIn) {
  return (
    <>
      {jobs.length > 0 && (
        <div className={css.card}>
          <div className={css.secHead}>
            <h2 className={css.secTitle}>{t('city.latest')}</h2>
            <Updated iso={updatedAt} t={t} />
          </div>
          <Table<CityJobIn> rows={jobs} cols={jobLinkColsOf({ t })} rowKey={jobLinkRowKeyOf} />
        </div>
      )}
      {employers.length > 0 && (
        <div className={css.card}>
          <div className={css.secHead}>
            <h2 className={css.secTitle}>{t('city.topEmp')}</h2>
            <Updated iso={updatedAt} t={t} />
          </div>
          <Table<CityEmployerIn> rows={employers} cols={empLinkColsOf({ t })} rowKey={empLinkRowKeyOf} />
        </div>
      )}
    </>
  )
}
