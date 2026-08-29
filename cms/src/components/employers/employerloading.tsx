'use client'
/**
 * 雇主板的加载条:高度常驻占位,转圈与文字只在懒取时出 ——
 * 不这么写就会出现「行没了又回来」的跳动(数据在换的那一瞬间版式塌一截)。
 * 2026-08-27 换装批自 Employers.tsx 的加载段提出成文件,转圈的关键帧随之从
 * 组件尾部那段 `<style>` 字符串迁进 employers.module.css。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import type { EmployerLoadingIn } from './types'
import css from './employers.module.css'

/**
 * 加载条。
 *
 * @param props 懒取态与取词函数(见 EmployerLoadingIn 逐格注释)。
 * @returns 常驻高度的一条,懒取时带转圈与文字。
 */
export function EmployerLoading({ loading, t }: EmployerLoadingIn) {
  return (
    <div className={css.loadBar}>
      {loading && (
        <>
          <span className={css.spin} />
          {t('loading')}
        </>
      )}
    </div>
  )
}
