/**
 * 档案导入简历的行为:拉档案里的两张清单、把名字补进简历条目(已有的不重复)。
 *
 * @author Frank
 * @time 2026-11-09 01:00:00
 */
import { toast } from '@/components/toast'
import {
  CRED_INCLUDE, IMPORT_DONE_KEY, IMPORT_FAIL_KEY, IMPORT_NONE_KEY, IMPORT_TOAST_ERR, IMPORT_TOAST_OK, TEXT_NONE,
  URL_PROFILE,
} from './constants'
import type {
  ContactFillIn, EntriesWithNamesIn, EntriesWithNamesOut, FillableContact, ProfileImportIn, ProfileLists,
  ProfileListsJson, ProfileNameJson, TitledEntry,
} from './types'

/**
 * 线格式的名字清单 → 英文名清单(空的丢掉)。
 *
 * @param rows 名字清单。
 * @returns 英文名。
 */
export function enNamesOf(rows: ProfileNameJson[] | null | undefined): string[] {
  const out: string[] = []
  if (rows == null) {
    return out
  }
  for (const r of rows) {
    if (typeof r.en === 'string' && r.en !== TEXT_NONE) {
      out.push(r.en)
    }
  }
  return out
}

/**
 * 拉档案里能进简历的两张清单。
 *
 * @returns 两张清单;拉不到为 null(不算「档案是空的」)。
 */
export async function loadProfileLists(): Promise<ProfileLists | null> {
  try {
    const r = await fetch(URL_PROFILE, { credentials: CRED_INCLUDE })
    if (r.ok === false) {
      return null
    }
    const j = await r.json() as ProfileListsJson
    if (j.profile == null) {
      return null
    }
    return { works: enNamesOf(j.profile.works), majors: enNamesOf(j.profile.majors) }
  } catch {
    return null
  }
}

/**
 * 把名字补进条目:同名(不分大小写)的不重复,新条目只填名字,其余格由用户补。
 *
 * @param x 名字、已有条目与造空条目。
 * @returns 新清单与新加条数。
 */
export function entriesWithNamesOf<E extends TitledEntry>(x: EntriesWithNamesIn<E>): EntriesWithNamesOut<E> {
  const seen = new Set<string>()
  const list: E[] = []
  for (const e of x.have) {
    seen.add(e.title.trim().toLowerCase())
    list.push(e)
  }
  let added = 0
  for (const name of x.names) {
    const key = name.trim().toLowerCase()
    if (seen.has(key) === false) {
      seen.add(key)
      const e = x.blank()
      e.title = name
      list.push(e)
      added += 1
    }
  }
  return { list, added }
}

/**
 * 空着的联系方式用档案补上,填过的不动。
 *
 * @param x 现有联系方式与档案带来的。
 * @returns 联系方式。
 */
export function contactFilledOf<C extends FillableContact>(x: ContactFillIn<C>): C {
  const out = x.have
  if (out.name === TEXT_NONE) {
    out.name = x.from.name
  }
  if (out.city === TEXT_NONE) {
    out.city = x.from.city
  }
  if (out.region === TEXT_NONE) {
    out.region = x.from.region
  }
  return out
}

/**
 * 造「从档案导入」:并入后右上角说导入了几条;档案拉不到说没成功。
 *
 * @param x 拉取函数、取词与落格。
 * @returns 点击手柄。
 */
export function makeProfileImport<D>(x: ProfileImportIn<D>): () => void {
  return function onImport(): void {
    void runProfileImport(x)
  }
}

/**
 * 导入的本体。
 *
 * @param x 拉取函数、取词与落格。
 * @returns 无。
 */
export async function runProfileImport<D>(x: ProfileImportIn<D>): Promise<void> {
  x.setImporting(true)
  const m = await x.load()
  x.setImporting(false)
  if (m == null) {
    toast({ kind: IMPORT_TOAST_ERR, title: x.t(IMPORT_FAIL_KEY) })
    return
  }
  x.setDraft(m.draft)
  if (m.added > 0) {
    toast({ kind: IMPORT_TOAST_OK, title: x.t(IMPORT_DONE_KEY, { n: m.added }) })
  } else {
    toast({ kind: IMPORT_TOAST_OK, title: x.t(IMPORT_NONE_KEY) })
  }
}
