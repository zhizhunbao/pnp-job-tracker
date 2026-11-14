/**
 * gate 桶子桶 cv 的行为:修改面板末段「生成简历」—— 取剩余额度、生成(先存档案再调接口)、设为我的简历(走上传那条路替换)、
 * 下载、关预览。
 * 2026-11-12 Frank「右侧弹 sidebar 用户一项一项填,最后用 sonnet 生成简历,可以选择模板。这部分功能是收费的」。
 * 生成出来的只在浏览器里(临时地址),用户点「设为我的简历」才存;依赖只许父桶 → 子桶。
 *
 * @author Frank
 * @time 2026-11-12 18:00:00
 */
import { toast } from '@/components/toast'
import { GUEST_LOG, log } from '@/lib/log'
import {
  CRED_INCLUDE, CV_ERR_KEYS, EV_RESUME, FIELD_FILE, HDR_CONTENT_TYPE, K_CV_FAIL, K_CV_SET_FAIL, K_CV_SET_OK,
  METHOD_POST, METHOD_PUT, MIME_JSON, MIME_PDF, MSG_ERR, MSG_INFO, MSG_OK, STATUS_PAY, TAG_A, TEXT_NONE, URL_CREDIT,
  URL_CV_GEN, URL_RESUME_FILE,
} from './constants'
import type {
  CreditJson, CvDoc, CvDocCloseIn, CvDocIn, CvGenIn, CvGenJson, CvLeftIn, CvMsg, CvSetIn, CvSetRunIn, MaybeCvDoc,
} from './types'

/**
 * 取本人还剩几个改写额度(钮旁那句用);取不到就不落(那句不出)。
 *
 * @param x 落格。
 * @returns 无。
 */
export async function loadCvLeft(x: CvLeftIn): Promise<void> {
  try {
    const r = await fetch(URL_CREDIT, { credentials: CRED_INCLUDE })
    const j = await r.json() as CreditJson
    if (r.ok && typeof j.left === 'number') {
      x.setLeft(j.left)
    }
  } catch (e) {
    log({ tag: GUEST_LOG.tag, text: GUEST_LOG.editSave + String(e) })
  }
}

/**
 * 造「生成简历」的点击手柄:先存档案(生成读的是库里的档案),存成了再调生成接口。
 *
 * @param x 模板、先存再跑的口、上一份与各落格。
 * @returns 点击手柄。
 */
export function makeCvGen(x: CvGenIn): () => void {
  return x.saveThen(function genAfterSave(): void {
    x.setBusy(true)
    x.setMsg({ key: TEXT_NONE, kind: MSG_INFO })
    void runCvGen(x)
  })
}

/**
 * 调生成接口:成了落那一份(预览框随之开)与剩余额度;额度用完开升级框;别的失败摆一行提示并留痕。
 *
 * @param x 同 makeCvGen。
 * @returns 无。
 */
async function runCvGen(x: CvGenIn): Promise<void> {
  try {
    const r = await fetch(URL_CV_GEN, {
      method: METHOD_POST,
      credentials: CRED_INCLUDE,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: JSON.stringify({ tpl: x.tpl }),
    })
    const j = await r.json() as CvGenJson
    if (r.ok && typeof j.pdf === 'string' && typeof j.fileName === 'string') {
      dropCvDoc(x.doc)
      x.setDoc(cvDocOf({ pdf: j.pdf, fileName: j.fileName }))
      if (typeof j.left === 'number') {
        x.setLeft(j.left)
      }
    } else if (r.status === STATUS_PAY) {
      x.setUpgrade(true)
    } else {
      x.setMsg(cvErrOf(j.error))
    }
  } catch (e) {
    log({ tag: GUEST_LOG.tag, text: GUEST_LOG.editSave + String(e) })
    x.setMsg({ key: K_CV_FAIL, kind: MSG_ERR })
  }
  x.setBusy(false)
}

/**
 * 接口错误码 → 提示。
 *
 * @param code 错误码(线格式,可能缺席)。
 * @returns 提示。
 */
function cvErrOf(code: string | undefined): CvMsg {
  let key = K_CV_FAIL
  if (code != null && CV_ERR_KEYS[code] != null) {
    key = CV_ERR_KEYS[code]
  }
  return { key, kind: MSG_ERR }
}

/**
 * 接口回的 base64 → 浏览器里的一份(文件与临时地址)。
 *
 * @param x base64 与文件名。
 * @returns 一份简历。
 */
function cvDocOf(x: CvDocIn): CvDoc {
  const bin = atob(x.pdf)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i)
  }
  const file = new File([bytes], x.fileName, { type: MIME_PDF })
  return { url: URL.createObjectURL(file), fileName: x.fileName, file }
}

/**
 * 收回一份的临时地址(换新的一份、关预览时;没有就不动)。
 *
 * @param doc 那一份或没有。
 * @returns 无。
 */
function dropCvDoc(doc: MaybeCvDoc): void {
  if (doc != null) {
    URL.revokeObjectURL(doc.url)
  }
}

/**
 * 造「设为我的简历」的点击手柄:走上传那条路(已有基础简历的是替换它);存成了关预览、摆一行「已设为我的简历」,
 * (2026-11-13 Frank「这个能不能全站统一一下」「都换」:操作成功一律右上角提示,绿色成功条撤,「已设为我的简历」改右上角提示)
 * 并发页面事件让「基础简历」卡重拉;没存上预览不关、摆一行提示。
 *
 * @param x 生成出来的那一份与各落格。
 * @returns 点击手柄。
 */
export function makeCvSet(x: CvSetIn): () => void {
  return function setCvAsResume(): void {
    if (x.doc != null) {
      x.setSaving(true)
      void runCvSet({ doc: x.doc, x })
    }
  }
}

/**
 * 上传那一份。
 *
 * @param y 那一份与 makeCvSet 的入参。
 * @returns 无。
 */
async function runCvSet(y: CvSetRunIn): Promise<void> {
  const form = new FormData()
  form.append(FIELD_FILE, y.doc.file)
  let ok = false
  try {
    const r = await fetch(URL_RESUME_FILE, { method: METHOD_PUT, credentials: CRED_INCLUDE, body: form })
    ok = r.ok
  } catch (e) {
    log({ tag: GUEST_LOG.tag, text: GUEST_LOG.editSave + String(e) })
  }
  y.x.setSaving(false)
  if (ok) {
    dropCvDoc(y.doc)
    y.x.setDoc(null)
    toast({ kind: MSG_OK, title: y.x.t(K_CV_SET_OK) })
    window.dispatchEvent(new Event(EV_RESUME))
  } else {
    y.x.setMsg({ key: K_CV_SET_FAIL, kind: MSG_ERR })
  }
}

/**
 * 造「下载」的点击手柄:用临时链接把那一份存到本机。
 *
 * @param doc 生成出来的那一份或没有。
 * @returns 点击手柄。
 */
export function makeCvDownload(doc: MaybeCvDoc): () => void {
  return function downloadCv(): void {
    if (doc != null) {
      const a = document.createElement(TAG_A)
      a.href = doc.url
      a.download = doc.fileName
      a.click()
    }
  }
}

/**
 * 造「关预览框」:收回临时地址,那一份不留。
 *
 * @param x 生成出来的那一份与落格。
 * @returns 点击手柄。
 */
export function makeCvDocClose(x: CvDocCloseIn): () => void {
  return function closeCvDoc(): void {
    dropCvDoc(x.doc)
    x.setDoc(null)
  }
}
