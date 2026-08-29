'use client'
/**
 * resume 域的状态机器:useResumeMatch 一台管整个弹框(存档预填、粘贴、上传、对照)。
 * 一台机器不拆 —— 这些状态互相咬合(传文件要回填粘贴框、贴文本要撤掉存档小注、
 * 对照要读粘贴框与勾选态),拆开就得互相穿参数。
 * 体内不留函数体 —— 带口径的步骤全在 ./functions 的工厂里(注释即它们的 JSDoc),
 * 这里只剩 useState、具名 effect 壳与工厂装配(形制同 account 的 useAccountPage
 * 与 news 的 useComments)。
 * 2026-08-28 换装批自 ResumeMatchModal.tsx 的组件体收进来。
 *
 * @author Frank
 * @time 2026-08-28 17:53:00
 */
import { useEffect, useRef, useState } from 'react'
import { useLang } from '@/components/i18n'
import { TEXT_NONE } from './constants'
import {
  makePickFile, makePrefill, makeResumeChange, makeRun, makeSaveToggle, makeUploadClick,
} from './functions'
import type { MatchFact, ResumeMatchHookIn, ResumeMatchPanel } from './types'

/**
 * 简历对照弹框整机。存档预填(E11-08)只在已登录且用户还没自己动手时跑一次:
 * `save` 勾选默认关是隐私红线,`archAt` 记的是预填那份的存档时刻,
 * `touched` 记的是用户已经自己贴过或传过 —— 别拿存档盖掉他的输入。
 *
 * @param x 这个岗的 id 与 JD、登录态。
 * @returns 弹框三屏要的整块面板:状态 + 手柄。
 */
export function useResumeMatch(x: ResumeMatchHookIn): ResumeMatchPanel {
  const [lang, , t] = useLang()
  const [resume, setResume] = useState(TEXT_NONE)
  const [busy, setBusy] = useState(false)
  const [reading, setReading] = useState(false)
  const [err, setErr] = useState(TEXT_NONE)
  const [archAt, setArchAt] = useState(TEXT_NONE)
  const [save, setSave] = useState(false)
  const [res, setRes] = useState<MatchFact | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const touched = useRef(false)

  useEffect(function prefillArchive() {
    if (x.loggedIn === false) {
      return
    }
    return makePrefill({ touched, setResume, setArchAt })()
  }, [x.loggedIn])

  return {
    t,
    resume,
    busy,
    reading,
    err,
    archAt,
    save,
    res,
    fileRef,
    onResumeChange: makeResumeChange({ touched, setResume, setArchAt }),
    onPickFile: makePickFile({ t, touched, fileRef, setResume, setArchAt, setErr, setReading }),
    onUpload: makeUploadClick({ fileRef }),
    onSaveToggle: makeSaveToggle({ setSave }),
    onRun: makeRun({ t, jobId: x.jobId, jd: x.jd, resume, lang, save, setBusy, setErr, setRes }),
  }
}
