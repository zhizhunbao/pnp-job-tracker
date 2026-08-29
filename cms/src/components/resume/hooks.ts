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
import { makePrefill, makeRun, makeSaveToggle, pickFile } from './functions'
import type {
  ClickFn, FilePickFn, MatchFact, PickFileIn, ResumeChangeIn, ResumeMatchHookIn, ResumeMatchPanel, TextChangeFn,
  UploadClickIn,
} from './types'

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
    onResumeChange: useResumeChange({ touched, setResume, setArchAt }),
    onPickFile: usePickFile({ t, touched, fileRef, setResume, setArchAt, setErr, setReading }),
    onUpload: useUploadClick({ fileRef }),
    onSaveToggle: makeSaveToggle({ setSave }),
    onRun: makeRun({ t, jobId: x.jobId, jd: x.jd, resume, lang, save, setBusy, setErr, setRes }),
  }
}

/**
 * 造粘贴框的改值手柄:敲一个字就算「用户自己动过手」,同时撤掉存档小注 ——
 * 框里的已经不是存档那一份了。
 * 2026-08-29 refs 批自 functions.ts 的 makeResumeChange 原样迁入:渲染期把 ref
 * 递给普通函数会被 react-hooks/refs 判成「渲染期读 ref」,收 ref 的工厂一律改 use*
 * 住进本抽屉(闸只认名字,体一个字没动)。
 *
 * @param x 动手旗子与两个落格。
 * @returns 改值手柄。
 */
export function useResumeChange(x: ResumeChangeIn): TextChangeFn {
  return function onResumeChange(e: React.ChangeEvent<HTMLTextAreaElement>): void {
    x.touched.current = true
    x.setArchAt(TEXT_NONE)
    x.setResume(e.target.value)
  }
}

/**
 * 造选完文件的手柄(2026-08-03 Frank 把上传从 G3 二期提上来):没选到文件就什么都不做。
 * 2026-08-29 refs 批自 functions.ts 的 makePickFile 原样迁入(理由同 useResumeChange);
 * 真身 pickFile 留在 functions.ts。
 *
 * @param x 取词函数、动手旗子、选择框 ref 与四个落格。
 * @returns 选完文件的手柄。
 */
export function usePickFile(x: PickFileIn): FilePickFn {
  return function onPickFile(e: React.ChangeEvent<HTMLInputElement>): void {
    if (e.target.files == null) {
      return
    }
    const file = e.target.files.item(0)
    if (file == null) {
      return
    }
    void pickFile({
      file,
      t: x.t,
      touched: x.touched,
      fileRef: x.fileRef,
      setResume: x.setResume,
      setArchAt: x.setArchAt,
      setErr: x.setErr,
      setReading: x.setReading,
    })
  }
}

/**
 * 造上传钮的点击手柄:去点那个不出面的文件选择框,系统窗才弹得出来。
 * 2026-08-29 refs 批自 functions.ts 的 makeUploadClick 原样迁入(理由同 useResumeChange)。
 *
 * @param x 文件选择框的 ref。
 * @returns 点击手柄。
 */
export function useUploadClick(x: UploadClickIn): ClickFn {
  return function onUpload(): void {
    if (x.fileRef.current == null) {
      return
    }
    x.fileRef.current.click()
  }
}
