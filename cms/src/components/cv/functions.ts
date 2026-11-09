/**
 * 生成简历桶的函数 —— 草稿的复制与改一格(不用对象展开,字段写全)、本地存草稿、首开时从档案带联系方式、
 * 列表里的起止写法、表单校验、各手柄工厂、「导入职责」取数、存成简历。
 *
 * @author Frank
 * @time 2026-11-07 16:00:00
 */
import { CV_TEXT_MAX, cvBadCharsOf, cvLayoutOf, toCvDraft } from '@/lib/cv'
import {
  BULLET_HEAD, CRED_INCLUDE, CV_LIST, DATES_NONE, DATES_ONE, DRAFT_KEY, E_CHARS, ERR_AUTH, ERR_CHARS, ERR_FULL,
  ERR_LIMIT, ERR_NAME, ERR_NET, ERR_NONE, ERR_REQ, ERR_YEAR, HDR_CONTENT_TYPE, HTTP_CONFLICT, HTTP_TOO_MANY,
  HTTP_UNAUTHORIZED, KEY_DESC, LINE_SEP, METHOD_POST, MIME_JSON, MONTH_KEY_HEAD, MONTH_PAD, NEW_INDEX, PAD_CHAR,
  PLACE_SEP, TEXT_NONE, URL_BUILD, URL_DUTIES, URL_ME, URL_PROFILE, YEAR_RE, YM_SEP,
} from './constants'
import type {
  ActFn, AreaFn, ContactWithIn, CvCells, CvContact, CvContactKey, CvDraft, CvEntry, CvEntryKey, CvListKey,
  CvSavedIn, CvTextKey, DraftContactIn, DraftListIn, DraftTextIn, DutiesJson, DutyState, DutyWithIn, EntryAt,
  EntryErrIn, EntryWithIn, FlagSetIn, FormTitleIn, LoadDutiesIn, LoadFirstIn, MeJson, PeriodIn, PfJson, SaveErrIn,
  SaveJson, SetFn, TextFn, TFn, WithDescIn, YmIn,
  ProfileMergeIn, ProfileMergeOut,
} from './types'
import { contactFilledOf, entriesWithNamesOf, loadProfileLists } from './prefill'

/**
 * 空的联系方式。
 *
 * @returns 五格全空。
 */
export function blankContactOf(): CvContact {
  return { name: TEXT_NONE, email: TEXT_NONE, phone: TEXT_NONE, city: TEXT_NONE, region: TEXT_NONE }
}

/**
 * 新草稿(只有联系方式)。
 *
 * @param c 联系方式。
 * @returns 草稿。
 */
export function newDraftOf(c: CvContact): CvDraft {
  return {
    contact: c,
    summary: TEXT_NONE,
    work: [],
    edu: [],
    skills: TEXT_NONE,
    creds: [],
    volunteer: [],
    awards: [],
    extra: [],
  }
}

/**
 * 空的一条。
 *
 * @returns 各格全空。
 */
function blankEntryOf(): CvEntry {
  return {
    title: TEXT_NONE,
org: TEXT_NONE,
city: TEXT_NONE,
region: TEXT_NONE,
fromY: TEXT_NONE,
fromM: TEXT_NONE,
toY: TEXT_NONE,
    toM: TEXT_NONE,
now: false,
desc: TEXT_NONE,
hidden: false,
  }
}

/**
 * 复制一条。
 *
 * @param e 原来的一条。
 * @returns 新的一条(字段写全)。
 */
function copyEntry(e: CvEntry): CvEntry {
  return {
    title: e.title,
org: e.org,
city: e.city,
region: e.region,
fromY: e.fromY,
fromM: e.fromM,
toY: e.toY,
toM: e.toM,
    now: e.now,
desc: e.desc,
hidden: e.hidden,
  }
}

/**
 * 一条改一格。
 *
 * @param x 原来的一条、哪一格与新值。
 * @returns 新的一条。
 */
function entryWith(x: EntryWithIn): CvEntry {
  const out = copyEntry(x.e)
  out[x.key] = x.v
  return out
}

/**
 * 联系方式改一格。
 *
 * @param x 原来的联系方式、哪一格与新值。
 * @returns 新的联系方式。
 */
function contactWith(x: ContactWithIn): CvContact {
  const out: CvContact = { name: x.c.name, email: x.c.email, phone: x.c.phone, city: x.c.city, region: x.c.region }
  out[x.key] = x.v
  return out
}

/**
 * 复制草稿(各分区清单是新数组,条目共享 —— 条目只整条替换,不原地改)。
 *
 * @param d 原来的草稿。
 * @returns 新草稿。
 */
function copyDraft(d: CvDraft): CvDraft {
  return {
    contact: d.contact,
summary: d.summary,
work: d.work.slice(),
edu: d.edu.slice(),
skills: d.skills,
creds: d.creds.slice(),
    volunteer: d.volunteer.slice(),
awards: d.awards.slice(),
extra: d.extra.slice(),
  }
}

/**
 * 草稿换一个分区的条目。
 *
 * @param x 原来的草稿、哪个分区与新的条目。
 * @returns 新草稿。
 */
function draftWithList(x: DraftListIn): CvDraft {
  const out = copyDraft(x.d)
  out[x.key] = x.list
  return out
}

/**
 * 草稿换一段(简介或技能)。
 *
 * @param x 原来的草稿、哪一段与新的字。
 * @returns 新草稿。
 */
function draftWithText(x: DraftTextIn): CvDraft {
  const out = copyDraft(x.d)
  out[x.key] = x.v
  return out
}

/**
 * 草稿换联系方式。
 *
 * @param x 原来的草稿与新的联系方式。
 * @returns 新草稿。
 */
function draftWithContact(x: DraftContactIn): CvDraft {
  const out = copyDraft(x.d)
  out.contact = x.c
  return out
}

/**
 * 读本地存的草稿(逐格收窄,与服务端同一个行构造器);没有、坏了、存储不让读都给 null。
 *
 * @returns 草稿或 null。
 */
function readDraft(): CvDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (raw == null) {
      return null
    }
    const j: object | null = JSON.parse(raw)
    if (typeof j !== 'object' || j == null) {
      return null
    }
    return toCvDraft(j)
  } catch {
    return null
  }
}

/**
 * 草稿存到本地(关了窗口、刷了页面再开还在)。存储不让写(隐私模式)就不存:草稿照样在窗口里,只是关了不留。
 *
 * @param d 草稿。
 * @returns 无。
 */
export function writeDraft(d: CvDraft): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(d))
  } catch {
    return
  }
}

/**
 * 首开:本地有草稿用草稿,没有就从我的档案(英文姓名、城市、省份)与账号(邮箱)带联系方式起一份新的。
 *
 * @param x 设草稿与设拿到了。
 * @returns 无。
 */
export async function loadFirst(x: LoadFirstIn): Promise<void> {
  const saved = readDraft()
  if (saved != null) {
    x.setDraft(saved)
  } else {
    const [c, lists] = await Promise.all([prefillOf(), loadProfileLists()])
    x.setDraft(draftWithProfile({ d: newDraftOf(c), c, lists }).draft)
  }
  x.setLoaded(true)
}

/**
 * 从我的档案与账号带联系方式;取不到的格空着(用户在窗口里看得见、自己填)。
 *
 * @returns 联系方式。
 */
async function prefillOf(): Promise<CvContact> {
  const c = blankContactOf()
  try {
    const r = await fetch(URL_PROFILE, { credentials: CRED_INCLUDE })
    const j = await r.json() as PfJson
    if (j.profile != null) {
      if (typeof j.profile.name === 'string') {
        c.name = j.profile.name
      }
      if (j.profile.city != null && typeof j.profile.city.en === 'string') {
        c.city = j.profile.city.en
      }
      if (typeof j.profile.prov === 'string') {
        c.region = j.profile.prov
      }
    }
  } catch {
    c.name = TEXT_NONE
  }
  try {
    const r = await fetch(URL_ME, { credentials: CRED_INCLUDE })
    const j = await r.json() as MeJson
    if (j.user != null && typeof j.user.email === 'string') {
      c.email = j.user.email
    }
  } catch {
    c.email = TEXT_NONE
  }
  return c
}

/**
 * 列表里一条的起止:「2015-04 至 2022-09」「2015-04 至 至今」;一个时间的只写开始那格。
 *
 * @param x 一条、日期写法与取词函数。
 * @returns 起止;没填空串。
 */
export function periodOf(x: PeriodIn): string {
  if (x.kind === DATES_NONE) {
    return TEXT_NONE
  }
  const from = ymOf({ y: x.e.fromY, m: x.e.fromM })
  if (x.kind === DATES_ONE) {
    return from
  }
  let to = ymOf({ y: x.e.toY, m: x.e.toM })
  if (x.e.now) {
    to = x.t('cv.now')
  }
  if (from === TEXT_NONE) {
    return to
  }
  if (to === TEXT_NONE) {
    return from
  }
  return from + x.t('cv.to') + to
}

/**
 * 「2015-04」;月份没填只写年,年没填不写。
 *
 * @param x 年与月。
 * @returns 年月。
 */
function ymOf(x: YmIn): string {
  if (x.y === TEXT_NONE) {
    return TEXT_NONE
  }
  if (x.m === TEXT_NONE) {
    return x.y
  }
  return x.y + YM_SEP + x.m.padStart(MONTH_PAD, PAD_CHAR)
}

/**
 * 「城市, 省份」(没填的不出)。
 *
 * @param e 一条或联系方式(有 city、region 两格的)。
 * @returns 地点;都没填空串。
 */
export function placeOf(e: CvContact | CvEntry): string {
  const kept: string[] = []
  for (const s of [e.city.trim(), e.region.trim()]) {
    if (s !== TEXT_NONE) {
      kept.push(s)
    }
  }
  return kept.join(PLACE_SEP)
}

/**
 * 造月份下拉的显示名函数(「4 月」「Apr」)。
 *
 * @param t 取词函数。
 * @returns 值 → 显示名。
 */
export function makeMonthLabel(t: TFn): (v: string) => string {
  return function monthLabel(v: string): string {
    return t(MONTH_KEY_HEAD + v)
  }
}

/**
 * 填一条的窗口标题:「添加工作经历」「修改工作经历」。
 *
 * @param x 取词函数、是不是新加与分区名。
 * @returns 标题。
 */
export function formTitleOf(x: FormTitleIn): string {
  if (x.isNew) {
    return x.t('cv.form.add', { s: x.s })
  }
  return x.t('cv.form.edit', { s: x.s })
}

/**
 * 描述还能写几个字。
 *
 * @param desc 描述。
 * @returns 剩余字数(千分位)。
 */
export function leftOf(desc: string): string {
  return Math.max(0, CV_TEXT_MAX - desc.length).toLocaleString()
}

/**
 * 一条能不能存:名称必填、该分区机构必填;年份填了就得是四位数字。
 *
 * @param x 正在填的一条与分区配置。
 * @returns 错误词条;能存给空串。
 */
function entryErrOf(x: EntryErrIn): string {
  if (x.e.title.trim() === TEXT_NONE || (x.conf.orgReq && x.e.org.trim() === TEXT_NONE)) {
    return ERR_REQ
  }
  for (const y of [x.e.fromY, x.e.toY]) {
    if (y !== TEXT_NONE && YEAR_RE.test(y) === false) {
      return ERR_YEAR
    }
  }
  return ERR_NONE
}

/**
 * 关掉所有表单(联系方式、段落、一条)与导入职责那块,清表单错误。
 *
 * @param c 整机的格。
 * @returns 无。
 */
function closeForms(c: CvCells): void {
  c.setEntry(null)
  c.setContact(null)
  c.setText(null)
  c.setFormErr(ERR_NONE)
  c.setDuty(closedDutyOf())
}

/**
 * 收起的导入职责那块。
 *
 * @returns 各格归零。
 */
export function closedDutyOf(): DutyState {
  return { open: false, q: TEXT_NONE, hits: [], pick: 0, checked: [], done: TEXT_NONE }
}

/**
 * 导入职责那块换选中的职业与勾选(其余照旧)。
 *
 * @param x 原来那块、新勾选与新选中。
 * @returns 新的那块。
 */
function dutyWith(x: DutyWithIn): DutyState {
  return { open: x.d.open, q: x.d.q, hits: x.d.hits, pick: x.pick, checked: x.checked, done: x.d.done }
}

/**
 * 描述后面接上导入的职责(一条一行,行首要点记号;原来有字就另起一行接)。
 *
 * @param x 原来的描述与各条职责。
 * @returns 新描述。
 */
function withDesc(x: WithDescIn): string {
  const add: string[] = []
  for (const line of x.lines) {
    add.push(BULLET_HEAD + line)
  }
  const head = x.desc.trimEnd()
  if (head === TEXT_NONE) {
    return add.join(LINE_SEP)
  }
  return head + LINE_SEP + add.join(LINE_SEP)
}

/**
 * 「修改」联系方式。
 *
 * @param c 整机的格。
 * @returns 手柄。
 */
export function makeContactEdit(c: CvCells): ActFn {
  return function onContactEdit(): void {
    c.setFormErr(ERR_NONE)
    c.setContact(c.draft.contact)
  }
}

/**
 * 联系方式各格的改值手柄。
 *
 * @param c 整机的格。
 * @returns 格 → 手柄。
 */
export function makeContactFieldOf(c: CvCells): (key: CvContactKey) => TextFn {
  return function contactFieldOf(key: CvContactKey): TextFn {
    return function onField(v: string): void {
      if (c.contact != null) {
        c.setContact(contactWith({ c: c.contact, key, v }))
      }
    }
  }
}

/**
 * 存联系方式(英文姓名必填)。
 *
 * @param c 整机的格。
 * @returns 手柄。
 */
export function makeContactSave(c: CvCells): ActFn {
  return function onContactSave(): void {
    if (c.contact == null) {
      return
    }
    if (c.contact.name.trim() === TEXT_NONE) {
      c.setFormErr(ERR_REQ)
      return
    }
    c.setDraft(draftWithContact({ d: c.draft, c: c.contact }))
    c.setErr(ERR_NONE)
    closeForms(c)
  }
}

/**
 * 「添加 / 修改」简介或技能。
 *
 * @param c 整机的格。
 * @returns 段 → 手柄。
 */
export function makeTextEditOf(c: CvCells): (key: CvTextKey) => ActFn {
  return function textEditOf(key: CvTextKey): ActFn {
    return function onTextEdit(): void {
      c.setFormErr(ERR_NONE)
      c.setText({ key, v: c.draft[key] })
    }
  }
}

/**
 * 段落改值。
 *
 * @param c 整机的格。
 * @returns 手柄。
 */
export function makeTextArea(c: CvCells): AreaFn {
  return function onTextArea(e: React.ChangeEvent<HTMLTextAreaElement>): void {
    if (c.text != null) {
      c.setText({ key: c.text.key, v: e.target.value })
    }
  }
}

/**
 * 存段落。
 *
 * @param c 整机的格。
 * @returns 手柄。
 */
export function makeTextSave(c: CvCells): ActFn {
  return function onTextSave(): void {
    if (c.text != null) {
      c.setDraft(draftWithText({ d: c.draft, key: c.text.key, v: c.text.v }))
    }
    closeForms(c)
  }
}

/**
 * 某个分区「添加」一条。
 *
 * @param c 整机的格。
 * @returns 分区 → 手柄。
 */
export function makeAddOf(c: CvCells): (list: CvListKey) => ActFn {
  return function addOf(list: CvListKey): ActFn {
    return function onAdd(): void {
      c.setFormErr(ERR_NONE)
      c.setDuty(closedDutyOf())
      c.setEntry({ list, index: NEW_INDEX, v: blankEntryOf() })
    }
  }
}

/**
 * 某一条「修改」。
 *
 * @param c 整机的格。
 * @returns 位置 → 手柄。
 */
export function makeEditOf(c: CvCells): (at: EntryAt) => ActFn {
  return function editOf(at: EntryAt): ActFn {
    return function onEdit(): void {
      const e = c.draft[at.list][at.index]
      if (e != null) {
        c.setFormErr(ERR_NONE)
        c.setDuty(closedDutyOf())
        c.setEntry({ list: at.list, index: at.index, v: copyEntry(e) })
      }
    }
  }
}

/**
 * 某一条「隐藏 / 显示」。
 *
 * @param c 整机的格。
 * @returns 位置 → 手柄。
 */
export function makeHideOf(c: CvCells): (at: EntryAt) => ActFn {
  return function hideOf(at: EntryAt): ActFn {
    return function onHide(): void {
      const list = c.draft[at.list].slice()
      const e = list[at.index]
      if (e == null) {
        return
      }
      const flipped = copyEntry(e)
      flipped.hidden = e.hidden === false
      list[at.index] = flipped
      c.setDraft(draftWithList({ d: c.draft, key: at.list, list }))
    }
  }
}

/**
 * 某一条「删除」:先弹确认框(2026-10-12 Frank「所有删除按钮不要直接删,先弹框确认是否删除」)。
 *
 * @param c 整机的格。
 * @returns 位置 → 手柄。
 */
export function makeDelOf(c: CvCells): (at: EntryAt) => ActFn {
  return function delOf(at: EntryAt): ActFn {
    return function onDel(): void {
      c.setAsk(at)
    }
  }
}

/**
 * 确认框里点「删除」。
 *
 * @param c 整机的格。
 * @returns 手柄。
 */
export function makeDelOk(c: CvCells): ActFn {
  return function onDelOk(): void {
    if (c.ask != null) {
      const list = c.draft[c.ask.list].slice()
      list.splice(c.ask.index, 1)
      c.setDraft(draftWithList({ d: c.draft, key: c.ask.list, list }))
    }
    c.setAsk(null)
  }
}

/**
 * 一条各格的改值手柄。
 *
 * @param c 整机的格。
 * @returns 格 → 手柄。
 */
export function makeEntryFieldOf(c: CvCells): (key: CvEntryKey) => TextFn {
  return function entryFieldOf(key: CvEntryKey): TextFn {
    return function onField(v: string): void {
      if (c.entry != null) {
        c.setEntry({ list: c.entry.list, index: c.entry.index, v: entryWith({ e: c.entry.v, key, v }) })
      }
    }
  }
}

/**
 * 描述改值。
 *
 * @param c 整机的格。
 * @returns 手柄。
 */
export function makeDescArea(c: CvCells): AreaFn {
  return function onDescArea(e: React.ChangeEvent<HTMLTextAreaElement>): void {
    if (c.entry != null) {
      const v = entryWith({ e: c.entry.v, key: KEY_DESC, v: e.target.value })
      c.setEntry({ list: c.entry.list, index: c.entry.index, v })
    }
  }
}

/**
 * 「至今」勾选。
 *
 * @param c 整机的格。
 * @returns 手柄。
 */
export function makeEntryNow(c: CvCells): (e: React.ChangeEvent<HTMLInputElement>) => void {
  return function onEntryNow(e: React.ChangeEvent<HTMLInputElement>): void {
    if (c.entry != null) {
      const v = copyEntry(c.entry.v)
      v.now = e.target.checked
      c.setEntry({ list: c.entry.list, index: c.entry.index, v })
    }
  }
}

/**
 * 存一条(新加的接在分区末尾,改的原位替换)。
 *
 * @param c 整机的格。
 * @returns 手柄。
 */
export function makeEntrySave(c: CvCells): ActFn {
  return function onEntrySave(): void {
    const ed = c.entry
    if (ed == null) {
      return
    }
    const err = entryErrOf({ e: ed.v, conf: CV_LIST[ed.list] })
    if (err !== ERR_NONE) {
      c.setFormErr(err)
      return
    }
    const list = c.draft[ed.list].slice()
    if (ed.index === NEW_INDEX) {
      list.push(ed.v)
    } else {
      list[ed.index] = ed.v
    }
    c.setDraft(draftWithList({ d: c.draft, key: ed.list, list }))
    closeForms(c)
  }
}

/**
 * 关表单不存。
 *
 * @param c 整机的格。
 * @returns 手柄。
 */
export function makeFormClose(c: CvCells): ActFn {
  return function onFormClose(): void {
    closeForms(c)
  }
}

/**
 * 展开 / 收起「导入职责」(展开时检索词带上已填的职位名)。
 *
 * @param c 整机的格。
 * @returns 手柄。
 */
export function makeDutyToggle(c: CvCells): ActFn {
  return function onDutyToggle(): void {
    if (c.duty.open || c.entry == null) {
      c.setDuty(closedDutyOf())
      return
    }
    c.setDuty({ open: true, q: c.entry.v.title, hits: [], pick: 0, checked: [], done: TEXT_NONE })
  }
}

/**
 * 改检索词。
 *
 * @param c 整机的格。
 * @returns 手柄。
 */
export function makeDutyQ(c: CvCells): TextFn {
  return function onDutyQ(v: string): void {
    const d = c.duty
    c.setDuty({ open: d.open, q: v, hits: d.hits, pick: d.pick, checked: d.checked, done: d.done })
  }
}

/**
 * 选某个职业(换职业清空勾选)。
 *
 * @param c 整机的格。
 * @returns 下标 → 手柄。
 */
export function makeDutyPickOf(c: CvCells): (i: number) => ActFn {
  return function dutyPickOf(i: number): ActFn {
    return function onPick(): void {
      c.setDuty(dutyWith({ d: c.duty, checked: [], pick: i }))
    }
  }
}

/**
 * 勾 / 取消某条职责。
 *
 * @param c 整机的格。
 * @returns 下标 → 手柄。
 */
export function makeDutyCheckOf(c: CvCells): (i: number) => ActFn {
  return function dutyCheckOf(i: number): ActFn {
    return function onCheck(): void {
      const checked: number[] = []
      for (const k of c.duty.checked) {
        if (k !== i) {
          checked.push(k)
        }
      }
      if (c.duty.checked.includes(i) === false) {
        checked.push(i)
      }
      c.setDuty(dutyWith({ d: c.duty, checked, pick: c.duty.pick }))
    }
  }
}

/**
 * 把勾的职责(按官方次序)接到描述后面,收起那块。
 *
 * @param c 整机的格。
 * @returns 手柄。
 */
export function makeDutyImport(c: CvCells): ActFn {
  return function onDutyImport(): void {
    const hit = c.duty.hits[c.duty.pick]
    if (c.entry == null || hit == null) {
      return
    }
    const lines: string[] = []
    for (const [i, d] of hit.duties.entries()) {
      if (c.duty.checked.includes(i)) {
        lines.push(d)
      }
    }
    const desc = withDesc({ desc: c.entry.v.desc, lines })
    c.setEntry({ list: c.entry.list, index: c.entry.index, v: entryWith({ e: c.entry.v, key: KEY_DESC, v: desc }) })
    c.setDuty(closedDutyOf())
  }
}

/**
 * 关删除确认框。
 *
 * @param setAsk 设删除确认框。
 * @returns 手柄。
 */
export function makeAskClose(setAsk: SetFn<EntryAt | null>): ActFn {
  return function onDelCancel(): void {
    setAsk(null)
  }
}

/**
 * 开 / 关一个开关(预览、生成简历窗口)。
 *
 * @param x 设开关与要设的值。
 * @returns 手柄。
 */
export function makeFlagSet(x: FlagSetIn): ActFn {
  return function onFlagSet(): void {
    x.set(x.v)
  }
}

/**
 * 生成简历存成了:关窗口,交宿主(重拉清单、投递框选中新的那份)。
 *
 * @param x 设窗口开关与宿主的回调。
 * @returns 手柄。
 */
export function makeCvSaved(x: CvSavedIn): (id: number) => void {
  return function onCvSaved(id: number): void {
    x.setOpen(false)
    x.onDone(id)
  }
}

/**
 * 「导入职责」按检索词找职业;取不到当没找到(那块出「没找到」,用户换个说法)。
 * 回来时检索词已经变了(用户接着打字)就丢掉这次的结果,不回写旧检索词。
 *
 * @param x 检索词与设那块的函数。
 * @returns 无。
 */
export async function loadDuties(x: LoadDutiesIn): Promise<void> {
  let hits: DutiesJson = {}
  try {
    const r = await fetch(URL_DUTIES + encodeURIComponent(x.q.trim()))
    if (r.ok) {
      hits = await r.json() as DutiesJson
    }
  } catch {
    hits = {}
  }
  let items = hits.items
  if (Array.isArray(items) === false || items == null) {
    items = []
  }
  const got = items
  x.setDuty(function applyHits(prev: DutyState): DutyState {
    if (prev.open === false || prev.q !== x.q) {
      return prev
    }
    return { open: true, q: prev.q, hits: got, pick: 0, checked: [], done: x.q }
  })
}

/**
 * 存成简历:先在本地查姓名与坏字(省一趟来回),再交服务端排 PDF 存成一份。
 *
 * @param c 整机的格。
 * @returns 手柄。
 */
export function makeSave(c: CvCells): ActFn {
  return function onSave(): void {
    void save(c)
  }
}

/**
 * 存成简历的流程。
 *
 * @param c 整机的格。
 * @returns 无。
 */
async function save(c: CvCells): Promise<void> {
  const layout = cvLayoutOf(c.draft)
  if (layout.name === TEXT_NONE) {
    c.setErr(ERR_NAME)
    return
  }
  const bad = cvBadCharsOf(layout)
  if (bad.length > 0) {
    c.setChars(bad)
    c.setErr(ERR_CHARS)
    return
  }
  c.setSaving(true)
  c.setErr(ERR_NONE)
  let body: SaveJson = {}
  let status = 0
  try {
    const r = await fetch(URL_BUILD, {
      method: METHOD_POST,
credentials: CRED_INCLUDE,
headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: JSON.stringify({ draft: c.draft }),
    })
    status = r.status
    body = await r.json() as SaveJson
  } catch {
    body = {}
  }
  c.setSaving(false)
  if (body.meta != null && typeof body.meta.id === 'number') {
    c.onSaved(body.meta.id)
    return
  }
  if (body.error === E_CHARS && Array.isArray(body.chars)) {
    c.setChars(body.chars)
  }
  c.setErr(saveErrOf({ status, body }))
}

/**
 * 存失败的错误词条。
 *
 * @param x 状态码与响应。
 * @returns 错误词条。
 */
function saveErrOf(x: SaveErrIn): string {
  if (x.status === HTTP_UNAUTHORIZED) {
    return ERR_AUTH
  }
  if (x.status === HTTP_CONFLICT) {
    return ERR_FULL
  }
  if (x.status === HTTP_TOO_MANY) {
    return ERR_LIMIT
  }
  if (x.body.error === E_CHARS) {
    return ERR_CHARS
  }
  return ERR_NET
}

/**
 * 草稿并入档案(2026-11-08 清单第 8 条):做过的工作进工作经历、专业进教育经历,已有的不重复;档案拉不到草稿不动。
 *
 * @param x 草稿、档案的联系方式与两张清单。
 * @returns 新草稿与新加条数。
 */
export function draftWithProfile(x: ProfileMergeIn): ProfileMergeOut {
  if (x.lists == null) {
    return { draft: x.d, added: 0 }
  }
  const work = entriesWithNamesOf({ names: x.lists.works, have: x.d.work, blank: blankEntryOf })
  const edu = entriesWithNamesOf({ names: x.lists.majors, have: x.d.edu, blank: blankEntryOf })
  return {
    draft: {
      contact: contactFilledOf({ have: x.d.contact, from: x.c }),
      summary: x.d.summary,
      work: work.list,
      edu: edu.list,
      skills: x.d.skills,
      creds: x.d.creds,
      volunteer: x.d.volunteer,
      awards: x.d.awards,
      extra: x.d.extra,
    },
    added: work.added + edu.added,
  }
}

/**
 * 拉档案并把草稿并进去(「从档案导入」用);档案拉不到为 null。
 *
 * @param d 现有草稿。
 * @returns 结果或 null。
 */
export async function mergeProfileInto(d: CvDraft): Promise<ProfileMergeOut | null> {
  const [c, lists] = await Promise.all([prefillOf(), loadProfileLists()])
  if (lists == null) {
    return null
  }
  return draftWithProfile({ d, c, lists })
}
