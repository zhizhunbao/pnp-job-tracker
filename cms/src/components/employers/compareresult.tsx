'use client'
/**
 * 对比页付费态的正文:选了不足两家时给空态引导回名录(一家没什么好「对比」的),
 * 够两家就出手机卡 + 桌面表,底下挂「回名录」与「清空对比」两枚钮。
 * 2026-08-27 换装批自 Compare.tsx 的付费分支提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { Notice } from '@/components/notice'
import { BTN_GHOST, BTN_SECONDARY, COMPARE_MIN_ROWS, EMP_URL, NOTICE_INFO } from './constants'
import { CompareCards } from './comparecards'
import { CompareTable } from './comparetable'
import { clearCompare } from './functions'
import type { CompareResultIn } from './types'
import css from './employers.module.css'

/**
 * 对比页付费态的正文。
 *
 * @param props 展示行、维度行与取词函数(见 CompareResultIn 逐格注释)。
 * @returns 空态引导,或卡 + 表 + 两枚钮。
 */
export function CompareResult({ rows, dims, t }: CompareResultIn) {
  if (rows.length < COMPARE_MIN_ROWS) {
    return (
      <Notice kind={NOTICE_INFO}
        action={<Button kind={BTN_SECONDARY} sm href={EMP_URL}>{t('ce.goDir')}</Button>}>
        {t('ce.empty')}
      </Notice>
    )
  }
  return (
    <>
      <CompareCards rows={rows} dims={dims} />
      <CompareTable rows={rows} dims={dims} />
      <div className={css.compareActions}>
        <Button kind={BTN_SECONDARY} sm href={EMP_URL}>{t('ce.goDir')}</Button>
        <Button kind={BTN_GHOST} sm onClick={clearCompare} className={cssOf(css.compareClear)}>
          {t('ce.clear')}
        </Button>
      </div>
    </>
  )
}
