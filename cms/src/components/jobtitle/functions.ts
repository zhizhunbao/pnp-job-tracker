/**
 * jobtitle 域的纯函数与取数:职位名底下那行灰字挑哪个,没有的去哪懒翻。
 * 批量那一半(makeLoadTitles / untranslatedOf / storedTitleOf)2026-09-23 自 companies 桶搬来,
 * 按岗那一半(makeLoadTitleTrans)同日自 advisor 桶搬来,行为一字未改;titleSubOf / lazyTitleOf 同日新写。
 *
 * @author Frank
 * @time 2026-09-23 01:45:57
 */
import {
  HDR_CONTENT_TYPE, LANG_EN, LANG_KO, LANG_ZH, METHOD_POST, MIME_JSON, TEXT_NONE, TITLES_CHUNK, URL_API_JOBS_TITLE,
} from './constants'
import type {
  DeadFlag, LazyTitleIn, LoadFn, LoadTitlesIn, LoadTitleTransIn, StoredTitleIn, TitleSubIn, TitlesJson, TitleTransJson,
  UntranslatedIn,
} from './types'

/**
 * 职位名底下那行灰字的全站口径(2026-09-23 Frank「统一成标题译名」「应该优先使用详情下的翻译 更准吧」):
 * 这一岗库里存好的标题译名(详情页 / 弹框按岗带正文翻的,多词标题批量翻的也落在这)→ 懒翻回来的 → 职业名兜底;
 * 与岗名一样(忽略大小写)的那一档跳过;英文界面不出。职位板手机卡、职位详情页、公司页在招清单、相关职位行都走这一个。
 *
 * @param x 这一行、界面语言、懒翻回来的译名与职业名。
 * @returns 灰字;都没有给空串。
 */
export function titleSubOf(x: TitleSubIn): string {
  if (x.lang === LANG_EN) {
    return TEXT_NONE
  }
  for (const cand of [storedTitleOf({ row: x.row, lang: x.lang }), x.lazy, x.noc]) {
    if (cand !== TEXT_NONE && cand.toLowerCase() !== x.row.title.toLowerCase()) {
      return cand
    }
  }
  return TEXT_NONE
}

/**
 * 批量译名表里这一岗名的译名。
 *
 * @param x 译名表与职位名。
 * @returns 译名;表里没有给空串。
 */
export function lazyTitleOf(x: LazyTitleIn): string {
  const got = x.map[x.title]
  if (got == null) {
    return TEXT_NONE
  }
  return got
}

/**
 * 一组职位行里库里还没有界面语言译名的岗名(去重;英文界面给空表 —— 不用翻)。
 *
 * @param x 这一组的行与界面语言。
 * @returns 要懒翻的岗名。
 */
export function untranslatedOf(x: UntranslatedIn): string[] {
  const out: string[] = []
  if (x.lang === LANG_EN) {
    return out
  }
  for (const row of x.rows) {
    if (storedTitleOf({ row, lang: x.lang }) !== TEXT_NONE || out.includes(row.title)) {
      continue
    }
    out.push(row.title)
  }
  return out
}

/**
 * 一行库里存好的界面语言译名(中 / 韩;其余给空串)。
 *
 * @param x 这一行与界面语言。
 * @returns 译名;没有给空串。
 */
export function storedTitleOf(x: StoredTitleIn): string {
  if (x.lang === LANG_ZH) {
    return x.row.titleZh
  }
  if (x.lang === LANG_KO) {
    return x.row.titleKo
  }
  return TEXT_NONE
}

/**
 * 批量懒翻职位名(2026-09-14 Frank「这个翻译老是翻译不全啊」:在招清单里没 NOC 译名的行一次发齐);失败静默。
 * 2026-09-19 在招岗放开 50 条上限:接口一次只收 TITLES_CHUNK 条,超了按它分批发,回来的译名并进同一张表。
 *
 * @param x 一组职位名、界面语言与落格。
 * @returns 取数函数(带死旗)。
 */
export function makeLoadTitles(x: LoadTitlesIn): LoadFn {
  return function loadTitles(flag: DeadFlag): void {
    function read(r: Response): Promise<TitlesJson> {
      return r.json().catch(none)
    }
    function none(): null {
      return null
    }
    const got: Record<string, string> = {}
    function land(j: TitlesJson): void {
      if (flag.dead || j == null || j.ok !== true || j.texts == null) {
        return
      }
      const merged: Record<string, string> = {}
      for (const k of Object.keys(got)) {
        merged[k] = String(got[k])
      }
      for (const k of Object.keys(j.texts)) {
        got[k] = String(j.texts[k])
        merged[k] = String(j.texts[k])
      }
      x.setMap(merged)
    }
    function fall(): void {
      return
    }
    for (let i = 0; i < x.titles.length; i += TITLES_CHUNK) {
      fetch(URL_API_JOBS_TITLE, {
        method: METHOD_POST,
        headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
        body: JSON.stringify({ titles: x.titles.slice(i, i + TITLES_CHUNK), lang: x.lang }),
      }).then(read).then(land).catch(fall)
    }
  }
}

/**
 * 职位名懒翻(2026-09-14 Frank「这个翻译呢」):打 /api/jobs/title,回来落格;失败静默(标题下就不出副题)。
 *
 * @param x 职位名、界面语言与落格。
 * @returns 取数函数。
 */
export function makeLoadTitleTrans(x: LoadTitleTransIn): () => void {
  async function pump(): Promise<void> {
    const res = await fetch(URL_API_JOBS_TITLE, {
      method: METHOD_POST,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: JSON.stringify({ title: x.title, lang: x.lang, id: x.id }),
    })
    const d: TitleTransJson = await res.json()
    if (d == null || d.ok !== true || d.text == null || d.text === TEXT_NONE) {
      return
    }
    x.setText(d.text)
  }
  function fail(): void {
    return
  }
  return function loadTitleTrans(): void {
    pump().catch(fail)
  }
}
