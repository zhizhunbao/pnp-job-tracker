'use client'
/**
 * me 桶子桶 resume 的结构:「简历」页签的内容(效果图 2.3:一张表 名称 / 上传日期 / 大小,行上不放钮,点名称开预览框;
 * 手机 1.4:一条条,名字下面一行「上传日期, 大小」)。清单没回来先占位;一份都没有出上传区。
 * 整块是拖放区:文件拖到上方描边变蓝,放下即上传(同原上传区;有清单时照样能拖)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { cssOf } from '@/components/css'
import { Table } from '@/components/table'
import { listClsOf, resumeColsOf, resumeKeyOf } from './functions'
import { ResumeDrop } from './resumedrop'
import { ResumeItem } from './resumeitem'
import type { ResumePartIn } from './types'
import css from './resume.module.css'

/**
 * 「简历」页签的内容。
 *
 * @param props 「我的简历」整机面板与取词。
 * @returns 占位、上传区、表或一条条。
 */
export function ResumeList({ r, t }: ResumePartIn) {
  if (r.checked === false) {
    return <div className={cssOf(css.skel)} />
  }
  const empty = r.items.length === 0
  const rows = []
  if (r.narrow) {
    for (const row of r.resumeRows) {
      rows.push(<ResumeItem key={row.key} row={row} />)
    }
  }
  return (
    <div className={listClsOf({ on: r.dragOn, empty })}
      onDragOver={r.onDragOver}
      onDragLeave={r.onDragLeave}
      onDrop={r.onDrop}>
      {empty && <ResumeDrop r={r} t={t} />}
      {empty === false && r.narrow && rows}
      {empty === false && r.narrow === false && (
        <Table cols={resumeColsOf(t)} rows={r.resumeRows} rowKey={resumeKeyOf} bare />
      )}
    </div>
  )
}
