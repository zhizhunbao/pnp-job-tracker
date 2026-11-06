/**
 * queue 页面域的桶 —— /queue 管理员队列页(2026-11-05 Frank「我能看到所有在排队的任务」「其他账号看不到」):
 * 四种排队一页看清 —— ETL 调度单元(etl_units,本机 docker 各容器上报)、投递待发(applications)、
 * 公司官网抓取与雇主译名翻译(employer_explore 两个工种);2026-11-06 加「最近跑完」(etl_unit_runs 历史)。
 * 页面门要的件从这里出:门禁角色、条数上限、六个行构造器与整块看板的洗行、正文视图。
 * 对应 lib 域:lib/queue(只管调度器上报那一条写入)。
 *
 * @author Frank
 * @time 2026-11-05 23:30:00
 */
export { QUEUE_ROWS, ROLE_ADMIN, RUNS_ROWS } from './constants'
export { Queue } from './queue'
export { toAliasFact, toApplyFact, toNowIso, toQueueBoard, toRunFact, toSiteFact, toUnitFact } from './functions'
