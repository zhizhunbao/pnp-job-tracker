/**
 * pte 域的行为:取数(方案 A 注入连接池)、行构造器、题单与单题的派生、WFD 逐词对照、
 * 浏览器朗读与录音的接缝、三台状态机器的手柄工厂、评论的收发。
 * 🔴 本文件**不带 `'use client'`**:服务端页面门 import 取数那几只;浏览器 API(speechSynthesis /
 * MediaRecorder / localStorage)只在手柄工厂体内碰,由 hooks 在客户端调。
 * 2026-09-03 批二新立(设计稿 docs/design/PTE刷题-20260903.md)。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { cssOf } from '@/components/css'
import { SQL, count, numOrNull, queryRowsOrEmpty, text, textOrNull } from '@/lib/db'
import {
  ALIGN_LEFT, API_COMMENTS, API_PTE_DONE, BRACKET_L, BRACKET_R, CLOCK_PAD, CLOCK_SEP, CLS_SEP, COL_ACT, COL_NUM,
  COL_SEEN, COL_TEXT, COL_TIMES, CRED_INCLUDE, DASH, DATE_LEN, DAY_MS, DESC_LEN_MAX, DICT_API, DICT_BUSY, DICT_EDGE_PX,
  DICT_GAP_PX, DICT_ID, DICT_IDLE, DICT_LINE_SEP, DICT_MIN_LEN, DICT_NONE, DICT_OK, DICT_TAG_KEY, DICT_W_PX, DONE_KEY,
  ELLIPSIS, EMPTY_DONE, EV_MOUSEUP, EV_TOUCHEND, FORM_KEY, FORM_KV, FORM_SEP, GATE_LOGIN, GATE_NONE, GATE_UPGRADE,
  HASH, HDR_CONTENT_TYPE, ID_SEP, INST_KEY, ITEM_DESC_TPL, ITEM_TITLE_TPL, KIND_EXAM, KIND_NOTE, LANG_EN, LANG_KO,
  LANG_ZH, LIKE_ANY, LIST_DESC_TPL, LIST_TITLE_TPL, MARK_TAG, METHOD_POST, METHOD_PUT, MIME_JSON, MS_PER_MIN,
  NAV_CENTER_DIV, NAV_ID_PREFIX, NAV_TEXT_LEN, NOTE_HINT_KEY, NOT_FOUND_TITLE, NUM_HEAD, NUM_RE, PAD_CHAR, PAGE_STEP,
  PAREN_L, PAREN_R, PHASE_ANSWERING, PHASE_CHECKED, PHASE_READY, PREP_S, PTE_META, PUNCT_RE, QID_SEP,
  QUOTA_KEY, QUOTA_MAX, RATE_DIGITS, RATE_HEAD, RATE_STEPS, REC_CAP_S, REC_MIME, REC_STATE_INACTIVE, SECTION_KEY,
  SECTION_ORDER, SEC_PER_MIN, SPK_GUARD_MS, SPK_NONE, STATE_BUSY, STATE_ERR, STATE_IDLE, STATE_SENT, TAG_SEP,
  TEXT_NONE, TEXT_TOKEN_RE, TICK_MS, TIER_CLS_HEAD, TIER_EASY_TAGS, TIER_FRQ_MIN, TIER_NONE, TIER_ORDER, TIER_TAGS,
  TIME_SEP, TITLE_LEN_MAX, TTS_GUARD_BASE_MS, TTS_LANG, TTS_LANG_HEAD, TTS_MS_PER_WORD, TTS_RATE, T_RA, UNDERSCORE,
  URL_PTE, URL_SEP, VAR_N, VAR_NUM, VAR_TEXT, VAR_TITLE, VAR_TYPE, WORD_RE, WORD_SPLIT_RE, WORD_TRIM, W_ACT, W_NUM,
  W_SEEN, W_TEXT, W_TIMES,
} from './constants'
import { CACHE } from './variables'
import css from './pte.module.css'
import { ActCell } from './actcell'
import { NumCell } from './numcell'
import { SeenCell } from './seencell'
import { TextCell } from './textcell'
import { TimesCell } from './timescell'
import type {
  AgoTextIn, AudioEndedIn, BracketIn, CanPlayIn, CellRowsIn, ChunkSinkFn, ClickFn, ClockIn, ColsOfIn, CommentsOfKindIn,
  DaysAgoIn, DeadFlag, DictApiBody, DictCloseIn, DictEntry, DictForm, DictFormsIn, DictLinesIn, DictLookupIn, DictPos,
  DictPosIn, DictTagKeyIn, DiffIn, DiffOut, DiffToken, DomEventFn, DoneClsIn, DoneResBody, DoneSyncIn, EffectFn,
  ExamCountsIn, ExamOpenIn, ExamSubmitIn, GateCloseIn, GatedPlayIn, GatedStartIn, GatedSubmitIn, HintIn, HoverWordIn,
  InputChangeIn, IsDoneIn, ItemHrefIn, ItemMetaIn, LcsAtIn, ListMetaIn, ListTiersIn, LookupNowIn, MarkDoneIn,
  MaybeHref, MicIn, MoreIn, NavPickIn, NavRowsIn, NavScrollIn, NavTextIn, NeighborsIn, NeighborsOut, NoteSubmitIn,
  PhaseSetIn, PhonIn, PlayIn, PlayUrlIn, PostCommentIn, PteCellRow, PteCol, PteComment, PteCommentDbRow, PteCommentsIn,
  PteDictTagDbRow, PteExamCount, PteExamCountDbRow, PteItem, PteItemLoadIn, PteListDbRow, PteListIn, PteMeta,
  PteOneDbRow, PteQuestion, PteQuestionIn, PteRow, PteRowIn, PteSection, PteTiersIn, PteType, PteTypeDbRow, PteTypesIn,
  QidOfIn, QuotaDoc, RateAudioIn, RateTextIn, RecallsIn, RecorderHandle, RecorderStopFn, RecorderStopIn, RedoIn,
  SaveDoneIn, SectionLabelIn, SectionsIn, SeekAudioIn, SeenCountIn, SeenTextIn, SelectedWord, SelectionWatchIn,
  SetBoolIn, SetBoolValIn, SettleDictIn, SpeakIn, SpeakWordIn, SpkClsIn, StartRecIn, StartRecorderIn, SubmitIn,
  TextChangeFn, TextChangeIn, TextPart, TextPartsIn, TextShownIn, TickerIn, TierOfIn, TimeTextIn, ToggleIn, TypeAtIn,
  TypeCodeIn, TypeLabelIn, TypeNameIn, WordCountIn,
} from './types'

/**
 * 题型维度(按考试序)。表还没建时给空清单(页面照渲不 500,与 news 的护栏同口径)。
 *
 * @param x 数据库连接。
 * @returns 题型清单。
 */
export async function loadPteTypes(x: PteTypesIn): Promise<PteType[]> {
  return queryRowsOrEmpty({ db: x.db, sql: SQL.PTE_TYPES, params: [], map: toPteType })
}

/**
 * 一型的题单:抓取行 + 自家考试记录聚合合并(考过次数相加、最近考过取近),按题单序。
 * 题型段任意大小写;查不到型给空清单。
 *
 * @param x 数据库连接与路由里的题型段。
 * @returns 洗净的题单行。
 */
export async function loadPteList(x: PteListIn): Promise<PteRow[]> {
  const code = typeCodeOf({ type: x.type })
  const own = await examCountsOf({ db: x.db, type: code })
  const raw = await queryRowsOrEmpty({ db: x.db, sql: SQL.PTE_LIST, params: [code], map: keepListRow })
  const out: PteRow[] = []
  for (const row of raw) {
    out.push(toPteRow({ row, own }))
  }
  return out
}

/**
 * 单题 + 沿题单序的前后邻 + 位置;查无此题给 null(门据此 notFound)。
 *
 * @param x 数据库连接与路由里的两段。
 * @returns 装配好的单题;查无是 null。
 */
export async function loadPteItem(x: PteItemLoadIn): Promise<PteItem | null> {
  let rows: PteOneDbRow[] = []
  if (NUM_RE.test(x.id)) {
    rows = await queryRowsOrEmpty({
      db: x.db, sql: SQL.PTE_ONE_NUM, params: [typeCodeOf({ type: x.type }), x.id], map: keepOneRow,
    })
  } else {
    rows = await queryRowsOrEmpty({
      db: x.db, sql: SQL.PTE_ONE, params: [qidOf({ type: x.type, id: x.id })], map: keepOneRow,
    })
  }
  let row: PteOneDbRow | null = null
  for (const r of rows) {
    row = r
  }
  if (row == null) {
    return null
  }
  const qid = text(row.qid)
  const list = await loadPteList({ db: x.db, type: x.type })
  let listed: PteRow | null = null
  for (const r of list) {
    if (r.qid === qid) {
      listed = r
    }
  }
  const nb = neighborsOf({ rows: list, qid })
  return {
    q: toPteQuestion({ row, listed }),
    prevHref: nb.prevHref,
    nextHref: nb.nextHref,
    index: nb.index,
    rows: list,
    tiers: await loadPteTiers({ db: x.db, text: text(row.text) }),
    total: list.length,
  }
}

/**
 * 题下过审评论(考试记录 + 留言,时间倒序)。列还没建(DDL 未跑)时给空清单。
 *
 * @param x 数据库连接与题键。
 * @returns 评论清单。
 */
export async function loadPteComments(x: PteCommentsIn): Promise<PteComment[]> {
  return queryRowsOrEmpty({ db: x.db, sql: SQL.PTE_COMMENTS, params: [x.qid], map: toPteComment })
}

/**
 * 一型的自家考试记录聚合(按 qid)。列还没建时给空表。
 *
 * @param x 数据库连接与题型码。
 * @returns qid → 聚合。
 */
async function examCountsOf(x: ExamCountsIn): Promise<Map<string, PteExamCount>> {
  const pattern = LIKE_ANY + QID_SEP + x.type + QID_SEP + LIKE_ANY
  const rows = await queryRowsOrEmpty({ db: x.db, sql: SQL.PTE_EXAM_COUNTS, params: [pattern], map: keepCountRow })
  const out = new Map<string, PteExamCount>()
  for (const r of rows) {
    out.set(r.qid, toPteExamCount(r))
  }
  return out
}

/**
 * 题型库行 → 题型。
 *
 * @param r 库行。
 * @returns 题型。
 */
export function toPteType(r: PteTypeDbRow): PteType {
  return {
    code: text(r.code),
    section: text(r.section),
    seq: count(r.seq),
    nameZh: text(r.nameZh),
    nameEn: text(r.nameEn),
    nameKo: text(r.nameKo),
    audio: r.audio === true,
    weight: count(r.weight),
    count: count(r.n),
  }
}


/**
 * 题单库行原样过手(queryRows 要一只映射;真正的清洗在 toPteRow,它还要自家聚合)。
 *
 * @param r 库行。
 * @returns 同一行。
 */
function keepListRow(r: PteListDbRow): PteListDbRow {
  return r
}

/**
 * 单题库行原样过手(同上,清洗在 toPteQuestion)。
 *
 * @param r 库行。
 * @returns 同一行。
 */
function keepOneRow(r: PteOneDbRow): PteOneDbRow {
  return r
}

/**
 * 聚合库行原样过手(清洗在 toPteExamCount;qid 是键,在 examCountsOf 里读)。
 *
 * @param r 库行。
 * @returns 同一行。
 */
function keepCountRow(r: PteExamCountDbRow): PteExamCountDbRow {
  return r
}

/**
 * 自家聚合库行 → 聚合。
 *
 * @param r 库行。
 * @returns 聚合。
 */
export function toPteExamCount(r: PteExamCountDbRow): PteExamCount {
  return { n: count(r.n), last: textOrNull(r.last) }
}

/**
 * 题单库行 + 自家聚合 → 题单行。考过次数 = 抓取(票数有就用票数,否则回忆条数)+ 自家条数;
 * 最近考过 = 两边取近;seen 空且自家也没有 = null(不折)。
 *
 * @param x 库行与自家聚合表。
 * @returns 题单行。
 */
export function toPteRow(x: PteRowIn): PteRow {
  const r = x.row
  const qid = text(r.qid)
  const own = x.own.get(qid)
  let times = count(r.seenN)
  const votes = numOrNull(r.votes)
  if (votes != null && votes > times) {
    times = votes
  }
  let seen = textOrNull(r.seen)
  if (own != null) {
    times = times + own.n
    if (own.last != null && (seen == null || own.last > seen)) {
      seen = own.last
    }
  }
  return {
    qid,
    type: text(r.type),
    href: itemHrefOf({ type: text(r.type), num: text(r.num) }),
    num: text(r.num),
    text: text(r.text),
    predicted: r.predicted === true,
    seen,
    times,
  }
}

/**
 * 单题库行 → 单题(seen / times 用题单里合并好的那份;不在题单里就按库行洗)。
 *
 * @param x 库行与题单里对应的行。
 * @returns 单题。
 */
export function toPteQuestion(x: PteQuestionIn): PteQuestion {
  let base = x.listed
  if (base == null) {
    base = toPteRow({ row: x.row, own: new Map() })
  }
  return {
    qid: base.qid,
    type: base.type,
    href: base.href,
    num: base.num,
    text: text(x.row.text),
    predicted: base.predicted,
    seen: base.seen,
    times: base.times,
    answer: textOrNull(x.row.answer),
    audioUrl: textOrNull(x.row.audioUrl),
  }
}

/**
 * 评论库行 → 评论。
 *
 * @param r 库行。
 * @returns 评论。
 */
export function toPteComment(r: PteCommentDbRow): PteComment {
  return {
    id: count(r.id),
    kind: text(r.kind),
    examDate: textOrNull(r.examDate),
    examCity: text(r.examCity),
    authorName: text(r.authorName),
    body: text(r.body),
    date: text(r.date),
  }
}

/**
 * 路由题型段 → 题型码(大写)。
 *
 * @param x 路由段。
 * @returns 题型码。
 */
export function typeCodeOf(x: TypeCodeIn): string {
  return x.type.toUpperCase()
}

/**
 * 路由两段 → 题键:`wfd` + `ynwac-11` → `ynwac:WFD:11`(源内 id 自己可能带 `-`,只切第一刀)。
 *
 * @param x 题型段与题段。
 * @returns 题键。
 */
export function qidOf(x: QidOfIn): string {
  const cut = x.id.indexOf(ID_SEP)
  if (cut < 0) {
    return x.id
  }
  const source = x.id.slice(0, cut)
  const id = x.id.slice(cut + ID_SEP.length)
  return source + QID_SEP + typeCodeOf({ type: x.type }) + QID_SEP + id
}

/**
 * 题型 + 站内题号 → 单题页地址:`/pte/wfd/11`(2026-09-04 Frank「id 应该我们基于自己的规则生成」,来源 id 退出 URL)。
 *
 * @param x 题键。
 * @returns 地址。
 */
export function itemHrefOf(x: ItemHrefIn): string {
  return URL_PTE + URL_SEP + x.type.toLowerCase() + URL_SEP + x.num
}

/**
 * 题型码 → 题单页地址。
 *
 * @param x 题型码。
 * @returns 地址。
 */
export function listHrefOf(x: TypeCodeIn): string {
  return URL_PTE + URL_SEP + x.type.toLowerCase()
}

/**
 * 按码找题型;没有给 null。
 *
 * @param x 题型清单与码。
 * @returns 题型或 null。
 */
export function typeAt(x: TypeAtIn): PteType | null {
  for (const t of x.types) {
    if (t.code === x.code) {
      return t
    }
  }
  return null
}

/**
 * 题型的本语人话名(主文案;英文全名与缩写是灰字小注)。
 *
 * @param x 题型与界面语言。
 * @returns 人话名。
 */
export function typeNameOf(x: TypeNameIn): string {
  if (x.lang === LANG_ZH) {
    return x.type.nameZh
  }
  if (x.lang === LANG_KO) {
    return x.type.nameKo
  }
  return x.type.nameEn
}

/**
 * 日期串距今天数(向下取整;今天 = 0;未来的日期也给 0)。
 *
 * @param x 日期串。
 * @returns 天数。
 */
export function daysAgoOf(x: DaysAgoIn): number {
  const then = new Date(x.iso).getTime()
  if (Number.isFinite(then) === false) {
    return 0
  }
  const days = Math.floor((Date.now() - then) / DAY_MS)
  if (days < 0) {
    return 0
  }
  return days
}

/**
 * 「今天」/「N 天前」;null 给「暂无记录」。
 *
 * @param x 取词函数与日期。
 * @returns 文案。
 */
export function agoTextOf(x: AgoTextIn): string {
  if (x.iso == null) {
    return x.t('pte.none')
  }
  const n = daysAgoOf({ iso: x.iso })
  if (n === 0) {
    return x.t('pte.today')
  }
  return x.t('pte.ago', { n })
}

/**
 * 「今天考过」/「N 天前考过」;null 给空串(卡片那格不出)。
 *
 * @param x 取词函数与最近考过日。
 * @returns 文案。
 */
export function seenTextOf(x: SeenTextIn): string {
  if (x.seen == null) {
    return TEXT_NONE
  }
  const n = daysAgoOf({ iso: x.seen })
  if (n === 0) {
    return x.t('pte.seenToday')
  }
  return x.t('pte.seenAgo', { n })
}



/**
 * 题型按栏分组(Speaking / Writing / Reading / Listening 定序;栏内按 seq;没归栏的型落最后一栏)。
 *
 * @param x 题型维度。
 * @returns 一栏一组(空栏不出)。
 */
export function sectionsOf(x: SectionsIn): PteSection[] {
  const out: PteSection[] = []
  for (const section of SECTION_ORDER) {
    const types: PteType[] = []
    for (const t of x.types) {
      if (t.section === section) {
        types.push(t)
      }
    }
    if (types.length > 0) {
      out.push({ section, types })
    }
  }
  return out
}


/**
 * 栏名(本语);表里没有的栏给原串。
 *
 * @param x 取词函数与栏。
 * @returns 栏名。
 */
export function sectionLabelOf(x: SectionLabelIn): string {
  const key = SECTION_KEY[x.section]
  if (key == null) {
    return x.section
  }
  return x.t(key)
}




/**
 * 有无 href:null 给空串(Button 收到空串退回 <button>,配 disabled 就是「没有邻题」的灰钮)。
 *
 * @param h 地址或 null。
 * @returns 地址或空串。
 */
export function hrefOrNone(h: MaybeHref): string {
  if (h == null) {
    return TEXT_NONE
  }
  return h
}


/**
 * 练过判定。
 *
 * @param x 练过集与题键。
 * @returns 练过。
 */
export function isDone(x: IsDoneIn): boolean {
  return x.done.has(x.qid)
}

/**
 * 洗净行 → 展示行(文案在这里算好,单元格与卡只放)。
 *
 * @param x 取词函数、行与练过集。
 * @returns 展示行。
 */
export function cellRowsOf(x: CellRowsIn): PteCellRow[] {
  const out: PteCellRow[] = []
  for (const r of x.rows) {
    const done = isDone({ done: x.done, qid: r.qid })
    out.push({
      qid: r.qid,
      href: r.href,
      num: NUM_HEAD + r.num,
      numN: Number(r.num),
      seenIso: r.seen,
      text: r.text,
      textCls: textCellClsOf({ done }),
      seenText: seenTextOf({ t: x.t, seen: r.seen }),
      times: r.times,
      actText: x.t('pte.go'),
      parts: textPartsOf({ text: r.text, tiers: x.tiers }),
      onHoverWord: x.onHoverWord,
      done,
    })
  }
  return out
}

/**
 * 桌面表五列(百分比固定版式,永不横滚)。2026-09-04 Frank 三改:押题列撤(「每行都是押题有什么意义」)、
 * 练过列撤(「有必要在这显示吗」)、末列加操作钮(「最后一列加一个操作按钮」);五列全左对齐(「全部靠左还是
 * 全部居中」,站规优先左对齐)。render 收整行递给哑单元格 —— 表格库定的调法。
 *
 * @param x 取词函数。
 * @returns 列声明。
 */
export function colsOf(x: ColsOfIn): PteCol[] {
  return [
    { key: COL_NUM, label: x.t('pte.col.num'), width: W_NUM, align: ALIGN_LEFT, render: NumCell, sort: numSortOf },
    { key: COL_TEXT, label: x.t('pte.col.text'), width: W_TEXT, align: ALIGN_LEFT, render: TextCell, sort: textSortOf },
    { key: COL_SEEN, label: x.t('pte.col.seen'), width: W_SEEN, align: ALIGN_LEFT, render: SeenCell, sort: seenSortOf },
    {
      key: COL_TIMES, label: x.t('pte.col.n'), width: W_TIMES, align: ALIGN_LEFT, render: TimesCell, sort: timesSortOf,
    },
    {
      key: COL_ACT, label: x.t('pte.col.act'), width: W_ACT, align: ALIGN_LEFT, render: ActCell, sort: numSortOf,
    },
  ]
}

/**
 * 题号列排序取值。
 *
 * @param r 展示行。
 * @returns 题号数值。
 */
function numSortOf(r: PteCellRow): number {
  return r.numN
}

/**
 * 题面列排序取值。
 *
 * @param r 展示行。
 * @returns 题面。
 */
function textSortOf(r: PteCellRow): string {
  return r.text
}

/**
 * 最近考过列排序取值(没记录排最后)。
 *
 * @param r 展示行。
 * @returns 日期串或 null。
 */
function seenSortOf(r: PteCellRow): string | null {
  return r.seenIso
}

/**
 * 考过次数列排序取值。
 *
 * @param r 展示行。
 * @returns 次数。
 */
function timesSortOf(r: PteCellRow): number {
  return r.times
}



/**
 * 表格行身份(库定的双参签名;第二参是序号,本域不用)。
 *
 * @param r 展示行。
 * @returns 题键。
 */
export function rowKeyOf(r: PteCellRow): string {
  return r.qid
}

/**
 * 沿题单序找前后邻与位置;不在题单里(比如被窗口筛掉的题)给 0 与两个 null。
 *
 * @param x 题单与当前题键。
 * @returns 前后邻地址与序。
 */
export function neighborsOf(x: NeighborsIn): NeighborsOut {
  let at = -1
  let i = 0
  for (const r of x.rows) {
    if (r.qid === x.qid) {
      at = i
    }
    i = i + 1
  }
  if (at < 0) {
    return { prevHref: null, nextHref: null, index: 0 }
  }
  let prevHref: string | null = null
  const prev = x.rows.at(at - 1)
  if (at > 0 && prev != null) {
    prevHref = prev.href
  }
  let nextHref: string | null = null
  const next = x.rows.at(at + 1)
  if (next != null) {
    nextHref = next.href
  }
  return { prevHref, nextHref, index: at + 1 }
}

/**
 * 秒 → `m:ss`。
 *
 * @param x 秒数。
 * @returns 时钟串。
 */
export function clockOf(x: ClockIn): string {
  const m = Math.floor(x.seconds / SEC_PER_MIN)
  const s = x.seconds % SEC_PER_MIN
  return String(m) + CLOCK_SEP + String(s).padStart(CLOCK_PAD, PAD_CHAR)
}

/**
 * 对词用的归一:去标点、小写。
 *
 * @param w 原词。
 * @returns 归一后的词。
 */
function normWord(w: string): string {
  return w.replace(PUNCT_RE, TEXT_NONE).toLowerCase()
}

/**
 * 切词(空白切,去空)。
 *
 * @param s 句子。
 * @returns 词清单。
 */
function wordsOf(s: string): string[] {
  const out: string[] = []
  for (const w of s.trim().split(WORD_SPLIT_RE)) {
    if (w !== TEXT_NONE) {
      out.push(w)
    }
  }
  return out
}

/**
 * WFD 逐词对照:最长公共子序列对齐,你写的里不在公共子序列上的词标红;
 * 对 = 公共子序列长度,错 = 原句词数 − 对(漏词与错词都算错)。
 *
 * @param x 你写的与原句。
 * @returns 逐词标记与两个数。
 */
export function diffOf(x: DiffIn): DiffOut {
  const a = wordsOf(x.typed)
  const b = wordsOf(x.text)
  const na = a.map(normWord)
  const nb = b.map(normWord)
  const cols = b.length + 1
  const lcs = new Map<number, number>()
  for (let i = a.length - 1; i >= 0; i = i - 1) {
    for (let j = b.length - 1; j >= 0; j = j - 1) {
      let best = Math.max(lcsAt({ lcs, cols, i: i + 1, j }), lcsAt({ lcs, cols, i, j: j + 1 }))
      if (na.at(i) === nb.at(j)) {
        best = lcsAt({ lcs, cols, i: i + 1, j: j + 1 }) + 1
      }
      lcs.set(i * cols + j, best)
    }
  }
  const tokens: DiffToken[] = []
  let i = 0
  let j = 0
  let ok = 0
  while (i < a.length && j < b.length) {
    if (na.at(i) === nb.at(j)) {
      tokens.push({ w: text(a.at(i)), ok: true })
      ok = ok + 1
      i = i + 1
      j = j + 1
    } else if (lcsAt({ lcs, cols, i: i + 1, j }) >= lcsAt({ lcs, cols, i, j: j + 1 })) {
      tokens.push({ w: text(a.at(i)), ok: false })
      i = i + 1
    } else {
      j = j + 1
    }
  }
  while (i < a.length) {
    tokens.push({ w: text(a.at(i)), ok: false })
    i = i + 1
  }
  return { tokens, ok, bad: b.length - ok }
}

/**
 * 公共子序列表取值;表外(越界的哨兵格)是 0。
 *
 * @param x 表、列数与坐标。
 * @returns 长度。
 */
function lcsAt(x: LcsAtIn): number {
  const v = x.lcs.get(x.i * x.cols + x.j)
  if (v == null) {
    return 0
  }
  return v
}

/**
 * 题单页 SEO 头。
 *
 * @param x 题型与题数。
 * @returns 元数据。
 */
export function pteListMetaOf(x: ListMetaIn): PteMeta {
  if (x.type == null) {
    return { title: NOT_FOUND_TITLE, description: TEXT_NONE, robots: { index: false } }
  }
  return {
    title: LIST_TITLE_TPL.replace(VAR_TYPE, x.type.nameEn),
    description: LIST_DESC_TPL.replace(VAR_N, String(x.n)).replace(VAR_TYPE, x.type.nameEn),
    robots: { index: true },
  }
}

/**
 * 单题页 SEO 头(标题带题型英文名与题号;描述是题面前 150 字)。
 *
 * @param x 题与题型。
 * @returns 元数据;查无禁收录。
 */
export function pteItemMetaOf(x: ItemMetaIn): PteMeta {
  if (x.item == null || x.type == null) {
    return { title: NOT_FOUND_TITLE, description: TEXT_NONE, robots: { index: false } }
  }
  const q = x.item.q
  return {
    title: ITEM_TITLE_TPL.replace(VAR_TYPE, x.type.nameEn).replace(VAR_NUM, q.num)
      .replace(VAR_TITLE, q.text.slice(0, TITLE_LEN_MAX)),
    description: ITEM_DESC_TPL.replace(VAR_TYPE, x.type.nameEn).replace(VAR_NUM, q.num)
      .replace(VAR_TEXT, q.text.slice(0, DESC_LEN_MAX)),
    robots: { index: true },
  }
}

/**
 * 题单页默认 SEO 头(没有题型段的 `/pte`)。
 *
 * @returns 元数据。
 */
export function pteMetaOf(): PteMeta {
  return { title: PTE_META.title, description: PTE_META.description, robots: { index: true } }
}

/**
 * 读练过集。
 *
 * @returns 题键集;读不到给空集。
 */
export function loadDone(): Set<string> {
  try {
    const raw = localStorage.getItem(DONE_KEY)
    if (raw == null) {
      return new Set()
    }
    const arr = JSON.parse(raw) as string[]
    return new Set(arr)
  } catch {
    return new Set()
  }
}

/**
 * 练过集的快照(useSyncExternalStore 的 getSnapshot):原串没变给同一引用,变了才重建。
 *
 * @returns 题键集。
 */
export function doneSnapshotOf(): Set<string> {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(DONE_KEY)
  } catch {
    raw = null
  }
  if (raw === CACHE.doneRaw) {
    return CACHE.done
  }
  CACHE.doneRaw = raw
  CACHE.done = loadDone()
  return CACHE.done
}

/**
 * 服务端快照:空集(SSR 没有 localStorage;水合后再换真值)。
 *
 * @returns 空集。
 */
export function doneServerSnapshotOf(): Set<string> {
  return EMPTY_DONE
}

/**
 * 今日已用配额的快照(useSyncExternalStore 的 getSnapshot;原始值可直接比较):
 * 读 localStorage 的档,不是今天的算 0,坏档算 0。
 *
 * @returns 已用次数。
 */
export function quotaSnapshotOf(): number {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(QUOTA_KEY)
  } catch {
    raw = null
  }
  if (raw == null) {
    return 0
  }
  const doc = quotaDocOf(raw)
  if (doc.day !== todayOf()) {
    return 0
  }
  return doc.n
}

/**
 * 服务端的配额快照(SSR 没有 localStorage,一律 0)。
 *
 * @returns 0。
 */
export function quotaServerSnapshotOf(): number {
  return 0
}

/**
 * 配额档原串 → 档(解析失败或形状不对给「今天 0 次」)。
 *
 * @param raw 原串。
 * @returns 档。
 */
function quotaDocOf(raw: string): QuotaDoc {
  try {
    const v = JSON.parse(raw) as QuotaDoc
    if (typeof v.day === 'string' && typeof v.n === 'number') {
      return { day: v.day, n: v.n }
    }
  } catch {
    return { day: todayOf(), n: 0 }
  }
  return { day: todayOf(), n: 0 }
}

/**
 * 今日配额 +1 并叫醒订阅者(与练过集共用 listeners)。
 *
 * @returns 无。
 */
function bumpQuota(): void {
  const doc: QuotaDoc = { day: todayOf(), n: quotaSnapshotOf() + 1 }
  try {
    localStorage.setItem(QUOTA_KEY, JSON.stringify(doc))
  } catch {
    return
  }
  for (const cb of CACHE.listeners) {
    cb()
  }
}

/**
 * 造带配额闸的「播题目」:只在准备段的那一下过闸(那一下 = 开始作答);其余段位原样播。
 *
 * @param x 闸的入参、是否在准备段与真播。
 * @returns 手柄。
 */
export function makeGatedStart(x: GatedStartIn): ClickFn {
  if (x.active === false) {
    return x.run
  }
  return makeGatedSubmit({ pro: x.pro, loggedIn: x.loggedIn, used: x.used, submit: x.run, setGate: x.setGate })
}

/**
 * 造带配额闸的播题目(准备段那一下算开始作答;其余段位原样播)—— usePteAnswer 的装配一行。
 *
 * @param x 闸与播的入参。
 * @returns 手柄。
 */
export function makeGatedPlay(x: GatedPlayIn): ClickFn {
  return makeGatedStart({
    pro: x.pro,
    loggedIn: x.loggedIn,
    used: x.used,
    setGate: x.setGate,
    active: x.audioType && x.phase === PHASE_READY,
    run: makePlay({ q: x.q, audioType: x.audioType, phase: x.phase, setPlaying: x.setPlaying, setPhase: x.setPhase }),
  })
}

/**
 * 造单行输入手柄(收 input 的 change —— React 定的签名)。
 *
 * @param x 落格。
 * @returns 手柄。
 */
export function makeInputChange(x: InputChangeIn): (e: React.ChangeEvent<HTMLInputElement>) => void {
  return function change(e: React.ChangeEvent<HTMLInputElement>): void {
    x.set(e.target.value)
  }
}

/**
 * 造开「考过」弹框手柄:考试日置今天再开。
 *
 * @param x 两个落格。
 * @returns 手柄。
 */
export function makeExamOpen(x: ExamOpenIn): ClickFn {
  return function open(): void {
    x.setDate(todayOf())
    x.setOpen(true)
  }
}

/**
 * 造关闸手柄(闸态回 none)。
 *
 * @param x 落闸。
 * @returns 手柄。
 */
export function makeGateClose(x: GateCloseIn): ClickFn {
  return function gateClose(): void {
    x.setGate(GATE_NONE)
  }
}

/**
 * 造带配额闸的「开始作答」:Pro 直接过;免费用户今日未满 +1 再放行,满了不放行、开闸
 * (未登录 → 注册框,已登录 → 升级框)。闸设在开始那一下(点麦克风 / 播题目),不设在停止提交
 * (2026-09-04 Frank「录音没法停,一点就弹框」)。
 *
 * @param x Pro / 登录态 / 已用 / 真提交 / 落闸。
 * @returns 手柄。
 */
export function makeGatedSubmit(x: GatedSubmitIn): ClickFn {
  return function gatedSubmit(): void {
    if (x.pro === false && x.used >= QUOTA_MAX) {
      if (x.loggedIn) {
        x.setGate(GATE_UPGRADE)
      } else {
        x.setGate(GATE_LOGIN)
      }
      return
    }
    if (x.pro === false) {
      bumpQuota()
    }
    x.submit()
  }
}

/**
 * 造「能不能播」的快照函数(浏览器有朗读或题带直链;服务端一律 false)。
 *
 * @param x 题的音频直链。
 * @returns getSnapshot。
 */
export function makeCanPlaySnapshot(x: CanPlayIn): () => boolean {
  return function canPlay(): boolean {
    return canSpeak() || x.audioUrl != null
  }
}

/**
 * 服务端「能不能播」快照:false(按钮先禁着,水合后再亮)。
 *
 * @returns false。
 */
export function serverFalseOf(): boolean {
  return false
}

/**
 * 服务端「今天」快照:空串(时区在浏览器,水合后再填)。
 *
 * @returns 空串。
 */
export function serverEmptyOf(): string {
  return TEXT_NONE
}

/**
 * 外部状态的订阅(useSyncExternalStore 要一只;「能不能播」「今天」没有变更事件,交回空退订)。
 *
 * @param cb 变更回调(不会被调)。
 * @returns 退订函数。
 */
export function subscribeNone(cb: () => void): () => void {
  if (cb == null) {
    return noop
  }
  return noop
}

/**
 * 练过集的订阅:saveDone 之后叫醒(与库并集回来、交卷记练过都走 saveDone)。
 *
 * @param cb 变更回调。
 * @returns 退订函数。
 */
export function subscribeDone(cb: () => void): () => void {
  CACHE.listeners.add(cb)
  return function unsubscribe(): void {
    CACHE.listeners.delete(cb)
  }
}

/**
 * 写练过集。
 *
 * @param x 题键集。
 * @returns 无。
 */
export function saveDone(x: SaveDoneIn): void {
  try {
    localStorage.setItem(DONE_KEY, JSON.stringify(Array.from(x.done)))
  } catch {
    return
  }
  for (const cb of CACHE.listeners) {
    cb()
  }
}

/**
 * 记一题练过(读 → 加 → 写)。
 *
 * @param qid 题键。
 * @returns 无。
 */
export function markDone(x: MarkDoneIn): void {
  const done = loadDone()
  done.add(x.qid)
  saveDone({ done })
  if (x.loggedIn) {
    void putDone(done)
  }
}

/**
 * 把本机练过集 PUT 到库,交回并集(失败给 null,不留痕 —— 下次挂载会再并一次)。
 *
 * @param done 本机练过集。
 * @returns 并集或 null。
 */
async function putDone(done: Set<string>): Promise<string[] | null> {
  try {
    const r = await fetch(API_PTE_DONE, {
      method: METHOD_PUT,
      credentials: CRED_INCLUDE,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: JSON.stringify({ done: Array.from(done) }),
    })
    if (r.ok === false) {
      return null
    }
    const b = await r.json() as DoneResBody
    if (Array.isArray(b.done) === false) {
      return null
    }
    return b.done
  } catch {
    return null
  }
}

/**
 * 练过档同步 effect 工厂:登录态挂载后把本机练过集 PUT 上去,拿回并集落回本机(浏览器与库两边取并)。
 *
 * @param x 登录态。
 * @returns effect 体。
 */
export function makeDoneSync(x: DoneSyncIn): EffectFn {
  return function sync(): () => void {
    if (x.loggedIn) {
      void syncDoneNow()
    }
    return noop
  }
}

/**
 * makeDoneSync 的真身。
 *
 * @returns 无。
 */
async function syncDoneNow(): Promise<void> {
  const merged = await putDone(loadDone())
  if (merged == null) {
    return
  }
  saveDone({ done: new Set(merged) })
}


/**
 * 造「置真」手柄(开框)。
 *
 * @param x 落格。
 * @returns 手柄。
 */
export function makeOpen(x: SetBoolIn): ClickFn {
  return function open(): void {
    x.set(true)
  }
}

/**
 * 造「置假」手柄(关框)。
 *
 * @param x 落格。
 * @returns 手柄。
 */
export function makeClose(x: SetBoolIn): ClickFn {
  return function close(): void {
    x.set(false)
  }
}

/**
 * 造布尔开关手柄。
 *
 * @param x 现值与落格。
 * @returns 手柄。
 */
export function makeToggle(x: ToggleIn): ClickFn {
  return function toggle(): void {
    x.set(x.on === false)
  }
}

/**
 * 造「显示更多」手柄。
 *
 * @param x 现值与落格。
 * @returns 手柄。
 */
export function makeMore(x: MoreIn): ClickFn {
  return function more(): void {
    x.setShown(x.shown + PAGE_STEP)
  }
}

/**
 * 浏览器能不能朗读(speechSynthesis 在;服务端渲染时 window 没有 → false)。
 *
 * @returns 能。
 */
export function canSpeak(): boolean {
  if (globalThis.window == null) {
    return false
  }
  return globalThis.window.speechSynthesis != null
}

/**
 * 朗读一句英文(挑一个英文声音;读完回调)。
 *
 * @param x 句子与读完回调。
 * @returns 无。
 */
export function speak(x: SpeakIn): void {
  if (canSpeak() === false) {
    x.onEnd()
    return
  }
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(x.text)
  u.lang = TTS_LANG
  u.rate = TTS_RATE
  for (const v of synth.getVoices()) {
    if (v.lang.startsWith(TTS_LANG_HEAD)) {
      u.voice = v
      break
    }
  }
  const once = makeOnce(x.onEnd)
  u.onend = once
  u.onerror = once
  synth.speak(u)
  window.setTimeout(once, TTS_GUARD_BASE_MS + wordCountOf({ s: x.text }) * TTS_MS_PER_WORD)
}

/**
 * 只放行一次的回调:朗读的 onend / onerror / 兜底定时器三条路谁先到谁算,后到的不再进作答段
 * (没有声音的浏览器 onend 永远不来,兜底定时器按词数估个时长把人放进作答段)。
 *
 * @param cb 真回调。
 * @returns 只走一次的壳。
 */
function makeOnce(cb: ClickFn): ClickFn {
  let fired = false
  return function once(): void {
    if (fired) {
      return
    }
    fired = true
    cb()
  }
}

/**
 * 停止朗读。
 *
 * @returns 无。
 */
export function stopSpeak(): void {
  if (canSpeak()) {
    window.speechSynthesis.cancel()
  }
  if (CACHE.audio != null) {
    CACHE.audio.pause()
    CACHE.audio = null
  }
}

/**
 * 造「播题目 / 再听一遍」手柄:准备段播完进作答段(音频型);作答段再听不换段。
 *
 * @param x 题、段位与两个落格。
 * @returns 手柄。
 */
export function makePlay(x: PlayIn): ClickFn {
  return function play(): void {
    x.setPlaying(true)
    if (x.q.audioUrl != null) {
      playUrl({ url: x.q.audioUrl, onEnd: makePlayEnd(x) })
      return
    }
    speak({
      text: x.q.text,
      onEnd: makePlayEnd(x),
    })
  }
}







/**
 * 播放条:播完 —— 落「不在播」再叫外部回调。
 *
 * @param x 落格与回调。
 * @returns 手柄。
 */
export function makeAudioEnded(x: AudioEndedIn): ClickFn {
  return function ended(): void {
    x.setPlaying(false)
    x.onEnd()
  }
}

/**
 * 把「布尔落某值」包成无参手柄(audio 的 play / pause 事件同步在播态)。
 *
 * @param x 落格与值。
 * @returns 手柄。
 */
export function makeSetBool(x: SetBoolValIn): ClickFn {
  return function set(): void {
    x.set(x.value)
  }
}

/**
 * 下一档倍速(按 RATE_STEPS 循环)。
 *
 * @param x 现倍速。
 * @returns 下一档。
 */
export function nextRateOf(x: RateTextIn): number {
  const at = RATE_STEPS.indexOf(x.rate)
  const cand = RATE_STEPS[at + 1]
  if (cand != null) {
    return cand
  }
  const first = RATE_STEPS[0]
  if (first == null) {
    return x.rate
  }
  return first
}

/**
 * 倍速文案「x1.0」。
 *
 * @param x 倍速。
 * @returns 文案。
 */
export function rateTextOf(x: RateTextIn): string {
  return RATE_HEAD + x.rate.toFixed(RATE_DIGITS)
}

/**
 * 播放条的时间「00:12 / 00:17」。
 *
 * @param x 当前秒与总秒。
 * @returns 文案。
 */
export function timeTextOf(x: TimeTextIn): string {
  return clockOf({ seconds: Math.floor(x.cur) }) + TIME_SEP + clockOf({ seconds: Math.floor(x.dur) })
}

/**
 * 造麦克风钮手柄:准备段开录(进作答段,录音随段起),作答段停止提交。
 *
 * @param x 段位、进作答与停止提交。
 * @returns 手柄。
 */
export function makeMic(x: MicIn): ClickFn {
  return function mic(): void {
    if (x.phase === PHASE_READY) {
      x.toAnswering()
      return
    }
    if (x.phase === PHASE_ANSWERING) {
      x.onStopRec()
    }
  }
}

/**
 * 播直链音频(批三:自合成 mp3 由 /api/pte/audio 吐;一次只留一个在播,播完 / 出错都回调一次)。
 *
 * @param x 直链与播完回调。
 * @returns 无。
 */
export function playUrl(x: PlayUrlIn): void {
  stopSpeak()
  const a = new Audio(x.url)
  const once = makeOnce(x.onEnd)
  a.onended = once
  a.onerror = once
  CACHE.audio = a
  void a.play().catch(once)
}

/**
 * 播完的回调:落「不在播」;音频型在准备段听完就进作答段。
 *
 * @param x 同 makePlay。
 * @returns 回调。
 */
export function makePlayEnd(x: PlayIn): ClickFn {
  return function ended(): void {
    x.setPlaying(false)
    if (x.audioType && x.phase === PHASE_READY) {
      x.setPhase(PHASE_ANSWERING)
    }
  }
}

/**
 * 造段位落格手柄(跳过准备 / 进作答)。
 *
 * @param x 落格与目标段位。
 * @returns 手柄。
 */
export function makePhaseSet(x: PhaseSetIn): ClickFn {
  return function set(): void {
    x.setPhase(x.phase)
  }
}

/**
 * 造多行文本框输入手柄。
 *
 * @param x 落格。
 * @returns 手柄。
 */
export function makeTextChange(x: TextChangeIn): TextChangeFn {
  return function onChange(e: React.ChangeEvent<HTMLTextAreaElement>): void {
    x.set(e.target.value)
  }
}


/**
 * 起录音:要麦克风 → MediaRecorder 攒块;拿不到就回调 onDenied 并给 null。
 * 只在本机录本机放,不上传(上传是评分的事,评分不做就不传)。
 *
 * @param x 拿不到麦克风的回调。
 * @returns 录音机句柄;拿不到是 null。
 */
export async function startRecorder(x: StartRecorderIn): Promise<RecorderHandle | null> {
  let stream: MediaStream | null = null
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  } catch {
    x.onDenied()
    return null
  }
  const rec = new MediaRecorder(stream)
  const chunks: Blob[] = []
  rec.ondataavailable = makeChunkSink(chunks)
  rec.start()
  return { stop: makeRecorderStop({ rec, chunks, stream }) }
}

/**
 * 攒录音块的回调。
 *
 * @param chunks 块清单。
 * @returns 回调。
 */
function makeChunkSink(chunks: Blob[]): ChunkSinkFn {
  return function sink(e: BlobEvent): void {
    if (e.data.size > 0) {
      chunks.push(e.data)
    }
  }
}

/**
 * 造停止函数:停机 → 关麦 → 拼 blob → 回放地址。
 *
 * @param x 录音机、块与媒体流。
 * @returns 停止函数。
 */
function makeRecorderStop(x: RecorderStopIn): RecorderStopFn {
  return function stop(): Promise<string | null> {
    return new Promise(function settle(resolve: (u: string | null) => void): void {
      x.rec.onstop = function onStop(): void {
        for (const track of x.stream.getTracks()) {
          track.stop()
        }
        if (x.chunks.length === 0) {
          resolve(null)
          return
        }
        resolve(URL.createObjectURL(new Blob(x.chunks, { type: REC_MIME })))
      }
      if (x.rec.state === REC_STATE_INACTIVE) {
        resolve(null)
        return
      }
      x.rec.stop()
    })
  }
}

/**
 * 造提交手柄:停录(有的话)→ 落回放 → 进对照 → 记练过。
 *
 * @param x 题键、录音机与三个落格。
 * @returns 手柄。
 */
export function makeSubmit(x: SubmitIn): ClickFn {
  return function submit(): void {
    void submitNow(x)
  }
}

/**
 * makeSubmit 的真身(async;外壳只把 Promise 收掉)。
 *
 * @param x 同 makeSubmit。
 * @returns 无。
 */
async function submitNow(x: SubmitIn): Promise<void> {
  stopSpeak()
  if (x.rec != null) {
    const url = await x.rec.stop()
    x.setRecUrl(url)
    x.setRec(null)
  }
  x.setRecording(false)
  x.setPhase(PHASE_CHECKED)
  markDone({ qid: x.qid, loggedIn: x.loggedIn })
}

/**
 * 造重做手柄:清作答痕迹,回到这型的起点段(RA 回准备倒计时;其余回准备段等播放)。
 *
 * @param x 落格们与准备秒数。
 * @returns 手柄。
 */
export function makeRedo(x: RedoIn): ClickFn {
  return function redo(): void {
    stopSpeak()
    x.setTyped(TEXT_NONE)
    x.setRecUrl(null)
    x.setRec(null)
    x.setMicDenied(false)
    x.setElapsed(0)
    x.setTextShown(false)
    x.setPrepLeft(x.prepS)
    x.setPhase(PHASE_READY)
  }
}

/**
 * 起录音 effect 工厂:该录就要麦克风起机,拿不到落标记;不该录什么都不做。
 *
 * @param x 该不该录与三个落格。
 * @returns effect 体。
 */
export function makeStartRec(x: StartRecIn): EffectFn {
  return function start(): () => void {
    if (x.should) {
      void startRecNow(x)
    }
    return noop
  }
}

/**
 * makeStartRec 的真身。
 *
 * @param x 同 makeStartRec。
 * @returns 无。
 */
async function startRecNow(x: StartRecIn): Promise<void> {
  const rec = await startRecorder({ onDenied: makeDenied(x) })
  if (rec == null) {
    return
  }
  x.setRec(rec)
  x.setRecording(true)
}

/**
 * 麦克风拒绝的回调。
 *
 * @param x 同 makeStartRec。
 * @returns 回调。
 */
function makeDenied(x: StartRecIn): ClickFn {
  return function denied(): void {
    x.setMicDenied(true)
  }
}

/**
 * 录音上限秒数(RA 40 / RS 15 / ASQ 10;WFD 0 = 不录)。
 *
 * @param x 题型码。
 * @returns 秒。
 */
export function recCapOf(x: TypeCodeIn): number {
  const s = REC_CAP_S[x.type]
  if (s == null) {
    return 0
  }
  return s
}

/**
 * 题型 → 官方一句指令的词键。
 *
 * @param x 题型码。
 * @returns 词键(没有的型给空串)。
 */
export function instKeyOf(x: TypeCodeIn): string {
  const k = INST_KEY[x.type]
  if (k == null) {
    return TEXT_NONE
  }
  return k
}

/**
 * 词数(空白切,去空)。
 *
 * @param x 句子。
 * @returns 词数。
 */
export function wordCountOf(x: WordCountIn): number {
  return wordsOf(x.s).length
}

/**
 * 题面该不该露:非音频型一直露;音频型作答段点了「显示原句」才露;对照段露(WFD 除外,
 * 它的原句由逐词对照件出)。
 *
 * @param x 型、开关、段位。
 * @returns 露。
 */
export function isTextShown(x: TextShownIn): boolean {
  if (x.audio === false) {
    return true
  }
  if (x.phase === PHASE_CHECKED) {
    return x.wfd === false
  }
  return x.textShown
}


/**
 * 题面格类名(练过的原先灰字;2026-09-04 Frank「这个不要高亮」撤,入参留着与卡类名同形)。
 *
 * @param x 练过。
 * @returns 类名串。
 */
export function textCellClsOf(_x: DoneClsIn): string {
  return cssOf(css.cellText)
}

/**
 * 手机卡类名(练过的灰掉)。
 *
 * @param x 练过。
 * @returns 类名串。
 */
export function cardClsOf(x: DoneClsIn): string {
  const out = [cssOf(css.mCard)]
  if (x.done) {
    out.push(cssOf(css.doneRow))
  }
  return out.join(CLS_SEP)
}

/**
 * 原句框类名(句框 + 淡灰底)。
 *
 * @returns 类名串。
 */
export function origBoxClsOf(): string {
  return cssOf(css.box) + CLS_SEP + cssOf(css.boxOrig)
}

/**
 * 按码找题型;没有给一个空壳(码当名,不炸页)。
 *
 * @param x 题型清单与码。
 * @returns 题型。
 */
export function typeAtOr(x: TypeAtIn): PteType {
  const found = typeAt(x)
  if (found != null) {
    return found
  }
  return {
    code: x.code,
    section: TEXT_NONE,
    seq: 0,
    nameZh: x.code,
    nameEn: x.code,
    nameKo: x.code,
    audio: x.code !== T_RA,
    weight: 0,
    count: 0,
  }
}

/**
 * 秒表 effect 工厂:每秒加一,到上限停并回调。返回 effect 体(内含清理)。
 *
 * @param x 现值、落格、上限与到点回调。
 * @returns effect 体。
 */
export function makeTicker(x: TickerIn): EffectFn {
  return function tick(): () => void {
    if (x.active === false) {
      return noop
    }
    if (x.cap > 0 && x.value >= x.cap) {
      if (x.onCap != null) {
        x.onCap()
      }
      return noop
    }
    const id = window.setTimeout(function step(): void {
      x.set(x.value + 1)
    }, TICK_MS)
    return function clear(): void {
      window.clearTimeout(id)
    }
  }
}

/**
 * 准备倒计时 effect 工厂:每秒减一,到 0 进作答段。
 *
 * @param x 现值、落格与到点回调(进作答段)。
 * @returns effect 体。
 */
export function makeCountdown(x: TickerIn): EffectFn {
  return function down(): () => void {
    if (x.active === false) {
      return noop
    }
    if (x.value <= 0) {
      if (x.onCap != null) {
        x.onCap()
      }
      return noop
    }
    const id = window.setTimeout(function step(): void {
      x.set(x.value - 1)
    }, TICK_MS)
    return function clear(): void {
      window.clearTimeout(id)
    }
  }
}

/**
 * 空清理(effect 没起定时器时交回它)。
 *
 * @returns 无。
 */
export function noop(): void {
  return
}

/**
 * 准备秒数(RA 35;其余 0)。
 *
 * @param x 题型码。
 * @returns 秒。
 */
export function prepSecOf(x: TypeCodeIn): number {
  const s = PREP_S[x.type]
  if (s == null) {
    return 0
  }
  return s
}

/**
 * 评论按类分拣。
 *
 * @param x 全部评论与要哪类。
 * @returns 这一类。
 */
export function commentsOfKind(x: CommentsOfKindIn): PteComment[] {
  const out: PteComment[] = []
  for (const c of x.comments) {
    if (c.kind === x.kind) {
      out.push(c)
    }
  }
  return out
}

/**
 * 登录框完成后的回调:整页刷新,让服务端按真实 cookie 态重渲(同 header AccountLite 的 reload)。
 *
 * @returns 无。
 */
export function reloadPage(): void {
  window.location.reload()
}

/**
 * 题型钮文案:人话名 + 括号题数(Frank 2026-09-04「这个需要和按钮放在一起吧,用括号」)。
 *
 * @param x 名与题数。
 * @returns 「朗读 (168)」。
 */
export function typeLabelOf(x: TypeLabelIn): string {
  return x.name + PAREN_L + String(x.count) + PAREN_R
}

/**
 * 目录树一行的题面(截到一行放得下)。
 *
 * @param x 题面。
 * @returns 短题面。
 */
export function navTextOf(x: NavTextIn): string {
  if (x.text.length <= NAV_TEXT_LEN) {
    return x.text
  }
  return x.text.slice(0, NAV_TEXT_LEN) + ELLIPSIS
}

/**
 * 造目录树题型钮手柄:原地切清单不跳页(Frank 2026-09-04「点击的时候不要跳页面,还是在当前页面筛选」)。
 *
 * @param x 题型码与落格。
 * @returns 手柄。
 */
export function makeNavPick(x: NavPickIn): ClickFn {
  return function pick(): void {
    x.set(x.code)
  }
}

/**
 * 全部有题的型各取一份题单(单题页目录树原地切型用)。
 *
 * @param x 数据库连接与题型维度。
 * @returns 型码 → 题单。
 */
export async function loadPteNavRows(x: NavRowsIn): Promise<Record<string, PteRow[]>> {
  const out: Record<string, PteRow[]> = {}
  for (const t of x.types) {
    if (t.count > 0) {
      out[t.code] = await loadPteList({ db: x.db, type: t.code })
    }
  }
  return out
}

/**
 * 造「进页把目录树滚到当前题」的 effect(只滚目录树自己的滚动容器,不动整页)。
 *
 * @param x 当前题键。
 * @returns 滚动手柄。
 */
export function makeNavScroll(x: NavScrollIn): ClickFn {
  return function scrollNav(): void {
    const el = document.getElementById(NAV_ID_PREFIX + x.qid)
    if (el == null) {
      return
    }
    const box = el.parentElement
    if (box == null) {
      return
    }
    box.scrollTop = el.offsetTop - box.clientHeight / NAV_CENTER_DIV
  }
}

/**
 * 一题题面里该高亮的词 → 档:切词去重后一查,按考纲标签分档;没档的不进表。
 *
 * @param x 数据库连接与题面。
 * @returns 词 → 档。
 */
export async function loadPteTiers(x: PteTiersIn): Promise<Record<string, number>> {
  const words: string[] = []
  for (const p of textPartsOf({ text: x.text, tiers: {} })) {
    if (p.word !== TEXT_NONE && words.includes(p.word) === false) {
      words.push(p.word)
    }
  }
  const out: Record<string, number> = {}
  if (words.length === 0) {
    return out
  }
  const rows = await queryRowsOrEmpty({ db: x.db, sql: SQL.PTE_DICT_TAGS, params: [words], map: toTierRow })
  for (const r of rows) {
    if (r.tier !== TIER_NONE) {
      out[r.word] = r.tier
    }
  }
  return out
}

/**
 * 整张题单的高亮档表:全部题面切词并集一查(词表上限就是题库词表 ~3.6k,一条 ANY 足够)。
 *
 * @param x 数据库连接与全部题。
 * @returns 词 → 档。
 */
export async function loadPteListTiers(x: ListTiersIn): Promise<Record<string, number>> {
  const seen = new Set<string>()
  for (const r of x.rows) {
    for (const p of textPartsOf({ text: r.text, tiers: {} })) {
      if (p.word !== TEXT_NONE) {
        seen.add(p.word)
      }
    }
  }
  const out: Record<string, number> = {}
  if (seen.size === 0) {
    return out
  }
  const rows = await queryRowsOrEmpty({ db: x.db, sql: SQL.PTE_DICT_TAGS, params: [Array.from(seen)], map: toTierRow })
  for (const r of rows) {
    if (r.tier !== TIER_NONE) {
      out[r.word] = r.tier
    }
  }
  return out
}

/**
 * 高亮依据库行 → (词, 档)。
 *
 * @param r 库行。
 * @returns 词与档。
 */
function toTierRow(r: PteDictTagDbRow): TextPart {
  return { text: TEXT_NONE, word: text(r.word), tier: tierOf({ tag: text(r.tag), frq: count(r.frq) }), cls: TEXT_NONE }
}

/**
 * 词频排名 / 考纲标签 → 档:有排名按排名门槛(高档先),没排名按标签(基础词标签命中即 0;否则高档先)。
 *
 * @param x 标签串与排名。
 * @returns 档。
 */
export function tierOf(x: TierOfIn): number {
  if (x.frq > 0) {
    for (const tier of TIER_ORDER) {
      const min = TIER_FRQ_MIN[tier]
      if (min != null && x.frq >= min) {
        return tier
      }
    }
    return TIER_NONE
  }
  const tags = x.tag.split(TAG_SEP)
  for (const easy of TIER_EASY_TAGS) {
    if (tags.includes(easy)) {
      return TIER_NONE
    }
  }
  for (const tier of TIER_ORDER) {
    const want = TIER_TAGS[tier]
    if (want == null) {
      continue
    }
    for (const w of want) {
      if (tags.includes(w)) {
        return tier
      }
    }
  }
  return TIER_NONE
}

/**
 * 题面切段:词与分隔交替,词按小写归一查档。
 *
 * @param x 题面与档表。
 * @returns 段清单(原样拼回 = 题面)。
 */
export function textPartsOf(x: TextPartsIn): TextPart[] {
  const out: TextPart[] = []
  for (const piece of x.text.split(TEXT_TOKEN_RE)) {
    if (piece === TEXT_NONE) {
      continue
    }
    if (TEXT_TOKEN_RE.test(piece) === false) {
      out.push({ text: piece, word: TEXT_NONE, tier: TIER_NONE, cls: TEXT_NONE })
      continue
    }
    const word = trimWord(piece.toLowerCase())
    let tier = TIER_NONE
    const hit = x.tiers[word]
    if (hit != null) {
      tier = hit
    }
    out.push({ text: piece, word, tier, cls: tierClsOf(tier) })
  }
  return out
}

/**
 * 剥掉词两端的撇号 / 连字符(与 ETL 切词同口径)。
 *
 * @param w 小写词。
 * @returns 净词。
 */
function trimWord(w: string): string {
  let a = 0
  let b = w.length
  while (a < b && WORD_TRIM.includes(w[a] as string)) {
    a = a + 1
  }
  while (b > a && WORD_TRIM.includes(w[b - 1] as string)) {
    b = b - 1
  }
  return w.slice(a, b)
}

/**
 * 词的类名(按档;0 档 = 普通词,只有悬停底色 —— Frank 2026-09-04「所有的单词鼠标放上去都可以点」)。
 *
 * @param tier 档。
 * @returns css module 类。
 */
export function tierClsOf(tier: number): string {
  return cssOf(css[TIER_CLS_HEAD + String(tier)])
}

/**
 * 点词开弹框(模块级稳定函数:行数据里只放它一个引用,列表就不用每次弹框都重算切词 ——
 * Frank 2026-09-04「弹框的时候看着很慢」;落格由 usePteDict 挂载时登记进 CACHE)。
 *
 * @param e 点击事件(词取自元素文本,位置取元素矩形)。
 * @returns 无。
 */
export function openDictWord(e: React.MouseEvent<HTMLElement>): void {
  const sink = CACHE.dictSink
  if (sink == null) {
    return
  }
  makeHoverWord({ setWord: sink.setWord, setPos: sink.setPos })(e)
}

/**
 * 造「弹框开合旗」的 effect:词非空 = 开着(选词监听放过期间的松开),拆卸或词清空 = 关。
 *
 * @param x 当前词。
 * @returns effect 体。
 */
export function makeDictOpenFlag(x: NavScrollIn): EffectFn {
  return function flag(): () => void {
    CACHE.dictOpen = x.qid !== TEXT_NONE
    return function clear(): void {
      CACHE.dictOpen = false
    }
  }
}

/**
 * 造「登记弹框落格」的 effect(挂载登记,拆卸清掉)。
 *
 * @param x 两个落格。
 * @returns effect 体。
 */
export function makeDictSink(x: HoverWordIn): EffectFn {
  return function register(): () => void {
    CACHE.dictSink = { setWord: x.setWord, setPos: x.setPos }
    return function clear(): void {
      CACHE.dictSink = null
    }
  }
}

/**
 * 造「悬到高亮词开弹层」手柄:词取自元素文本,弹层位置取元素矩形底边中点。
 *
 * @param x 两个落格。
 * @returns 手柄(收鼠标事件 —— React 定的签名)。
 */
export function makeHoverWord(x: HoverWordIn): (e: React.MouseEvent<HTMLElement>) => void {
  return function hoverWord(e: React.MouseEvent<HTMLElement>): void {
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    const raw = el.textContent
    if (raw == null) {
      return
    }
    x.setPos({ x: r.left + r.width / NAV_CENTER_DIV, y: r.bottom })
    x.setWord(trimWord(raw.toLowerCase()))
  }
}

/**
 * 带回忆文字的考试记录(正文不是日期占位的那些),按留言的样子列在留言区。
 *
 * @param x 考试记录。
 * @returns 有回忆的那些。
 */
export function recallsOf(x: RecallsIn): PteComment[] {
  const out: PteComment[] = []
  for (const e of x.exams) {
    if (e.body !== TEXT_NONE && e.body !== e.examDate) {
      out.push(e)
    }
  }
  return out
}

/**
 * 「考过 (N)」的 N:来源合成的考过次数(库里 times 已含本站过审记录)+ 本次会话刚记的条数。
 *
 * @param x 来源次数、SSR 带下的评论与现时考试记录。
 * @returns 次数。
 */
export function seenCountOf(x: SeenCountIn): number {
  const was = commentsOfKind({ comments: x.comments, kind: KIND_EXAM }).length
  return x.times + x.exams.length - was
}

/**
 * 今天的日期串(YYYY-MM-DD,本地时区)。
 *
 * @returns 日期串。
 */
export function todayOf(): string {
  const d = new Date()
  const local = new Date(d.getTime() - d.getTimezoneOffset() * MS_PER_MIN)
  return local.toISOString().slice(0, DATE_LEN)
}

/**
 * 发一条评论(Payload REST;闸在 collection 的 beforeChange)。失败不静默:回 false 由调用方挂提示。
 *
 * @param x 序列化好的请求体。
 * @returns 发出去了没。
 */
async function postComment(x: PostCommentIn): Promise<boolean> {
  try {
    const r = await fetch(API_COMMENTS, {
      method: METHOD_POST,
      credentials: CRED_INCLUDE,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: x.body,
    })
    return r.ok
  } catch {
    return false
  }
}

/**
 * 造「考过」钮手柄:记今天,发成功当场并进考试记录栏(免审,不用等刷新);点过一次就不再收(状态离开闲置)。
 *
 * @param x 题键、两格现值、状态与三个落格。
 * @returns 手柄。
 */
export function makeExamSubmit(x: ExamSubmitIn): ClickFn {
  return function submit(): void {
    void examSubmitNow(x)
  }
}

/**
 * makeExamSubmit 的真身。
 *
 * @param x 同 makeExamSubmit。
 * @returns 无。
 */
async function examSubmitNow(x: ExamSubmitIn): Promise<void> {
  if (x.state !== STATE_IDLE) {
    return
  }
  if (x.examDate === TEXT_NONE) {
    return
  }
  x.setState(STATE_BUSY)
  const body = JSON.stringify({
    qid: x.qid, kind: KIND_EXAM, examDate: x.examDate, examCity: TEXT_NONE, body: x.recall,
  })
  const ok = await postComment({ body })
  if (ok === false) {
    x.setState(STATE_ERR)
    return
  }
  const mine: PteComment = {
    id: 0,
    kind: KIND_EXAM,
    examDate: x.examDate,
    examCity: TEXT_NONE,
    authorName: TEXT_NONE,
    body: x.recall,
    date: x.examDate,
  }
  x.setExams([mine].concat(x.exams))
  x.setState(STATE_SENT)
  x.setOpen(false)
}

/**
 * 造留言提交手柄:发出去落 pending,人工过审才显示。
 *
 * @param x 题键、正文、状态与两个落格。
 * @returns 手柄。
 */
export function makeNoteSubmit(x: NoteSubmitIn): ClickFn {
  return function submit(): void {
    void noteSubmitNow(x)
  }
}

/**
 * makeNoteSubmit 的真身。
 *
 * @param x 同 makeNoteSubmit。
 * @returns 无。
 */
async function noteSubmitNow(x: NoteSubmitIn): Promise<void> {
  const body = x.note.trim()
  if (body === TEXT_NONE || x.state === STATE_BUSY) {
    return
  }
  x.setState(STATE_BUSY)
  const ok = await postComment({ body: JSON.stringify({ qid: x.qid, kind: KIND_NOTE, body }) })
  if (ok === false) {
    x.setState(STATE_ERR)
    return
  }
  x.setState(STATE_SENT)
  x.setNote(TEXT_NONE)
}

/**
 * 留言提交状态的提示;闲置与在途给空串。
 *
 * @param x 取词函数与状态。
 * @returns 提示文案或空串。
 */
export function noteHintOf(x: HintIn): string {
  const key = NOTE_HINT_KEY[x.s]
  if (key == null) {
    return TEXT_NONE
  }
  return x.t(key)
}



/**
 * 读当前选区:恰好一个英文单词(字母开头、≥ 2 字母)才算;交回词与弹层位置,否则 null。
 *
 * @returns 词与位置;没选到词是 null。
 */
export function selectedWordOf(): SelectedWord | null {
  const sel = window.getSelection()
  if (sel == null || sel.rangeCount === 0) {
    return null
  }
  const word = sel.toString().trim()
  if (word.length < DICT_MIN_LEN || WORD_RE.test(word) === false) {
    return null
  }
  const rect = sel.getRangeAt(0).getBoundingClientRect()
  return { word: word.toLowerCase(), pos: dictPosOf({ left: rect.left, bottom: rect.bottom }) }
}

/**
 * 弹层定位:选区底边下方,左对齐选区,不出右边。
 *
 * @param x 选区左与底。
 * @returns 视口坐标。
 */
export function dictPosOf(x: DictPosIn): DictPos {
  let left = x.left
  const maxLeft = window.innerWidth - DICT_W_PX - DICT_EDGE_PX
  if (left > maxLeft) {
    left = maxLeft
  }
  if (left < DICT_EDGE_PX) {
    left = DICT_EDGE_PX
  }
  return { x: left, y: x.bottom + DICT_GAP_PX }
}

/**
 * 选区监听 effect 工厂:松开鼠标 / 手指后读选区,选到词就落词与位置,没选到就清词(弹层关)。
 *
 * @param x 两个落格。
 * @returns effect 体(挂两个监听,拆卸时摘掉)。
 */
export function makeSelectionWatch(x: SelectionWatchIn): EffectFn {
  return function watch(): () => void {
    const onUp = makeSelectionRead(x)
    document.addEventListener(EV_MOUSEUP, onUp)
    document.addEventListener(EV_TOUCHEND, onUp)
    return function stop(): void {
      document.removeEventListener(EV_MOUSEUP, onUp)
      document.removeEventListener(EV_TOUCHEND, onUp)
    }
  }
}

/**
 * 这次松开是不是落在字典弹层里(点弹层里的 ▶ / × 不算清选区,不然弹层自己就关了 ——
 * Frank 2026-09-04「这个点击播放自己就关闭了」)。
 *
 * @param e 松开事件。
 * @returns 在弹层里为 true。
 */
function insideDictOf(e: Event): boolean {
  const el = e.target
  if (el instanceof Element === false) {
    return false
  }
  const target = el as Element
  return target.closest(HASH + DICT_ID) != null || target.closest(MARK_TAG) != null
}

/**
 * 选区读取回调(松开后下一拍读,手机的选区在 touchend 时还没定)。
 *
 * @param x 两个落格。
 * @returns 回调。
 */
function makeSelectionRead(x: SelectionWatchIn): DomEventFn {
  return function read(e: Event): void {
    if (CACHE.dictOpen || insideDictOf(e)) {
      return
    }
    window.setTimeout(function later(): void {
      const hit = selectedWordOf()
      if (hit == null) {
        x.setWord(TEXT_NONE)
        return
      }
      x.setWord(hit.word)
      x.setPos(hit.pos)
    }, 0)
  }
}

/**
 * 查词 effect 工厂:词变了就查(命中缓存秒回);空词落闲置。
 *
 * @param x 词与两个落格。
 * @returns effect 体。
 */
export function makeDictLookup(x: DictLookupIn): EffectFn {
  return function lookup(): () => void {
    if (x.word === TEXT_NONE) {
      x.setState(DICT_IDLE)
      x.setEntry(null)
      return noop
    }
    const flag: DeadFlag = { dead: false }
    void lookupNow({ x, flag })
    return function stop(): void {
      flag.dead = true
    }
  }
}

/**
 * makeDictLookup 的真身:缓存 → 接口 → 落格(拆卸后不落)。
 *
 * @param y 入参与死亡标记。
 * @returns 无。
 */
async function lookupNow(y: LookupNowIn): Promise<void> {
  if (CACHE.dict.has(y.x.word)) {
    const cached = CACHE.dict.get(y.x.word)
    if (cached == null) {
      settleDict({ x: y.x, entry: null })
      return
    }
    settleDict({ x: y.x, entry: cached })
    return
  }
  y.x.setState(DICT_BUSY)
  const entry = await fetchDict(y.x.word)
  CACHE.dict.set(y.x.word, entry)
  if (y.flag.dead) {
    return
  }
  settleDict({ x: y.x, entry })
}

/**
 * 落查词结果:有 = ok,没有 = none。
 *
 * @param y 入参与结果。
 * @returns 无。
 */
function settleDict(y: SettleDictIn): void {
  y.x.setEntry(y.entry)
  if (y.entry == null) {
    y.x.setState(DICT_NONE)
    return
  }
  y.x.setState(DICT_OK)
}

/**
 * 打站内词典接口;404 / 网络错 / 形状不对都给 null(弹层显「没查到」)。`as DictApiBody` 是跨边界断言,逐格判后才用。
 *
 * @param word 选中的词。
 * @returns 结果或 null。
 */
async function fetchDict(word: string): Promise<DictEntry | null> {
  try {
    const r = await fetch(DICT_API + encodeURIComponent(word))
    if (r.ok === false) {
      return null
    }
    const body = await r.json() as DictApiBody
    return toDictEntry(body)
  } catch {
    return null
  }
}

/**
 * 接口响应 → 字典结果(释义按行拆;没释义 = null)。
 *
 * @param e 响应体。
 * @returns 结果或 null。
 */
function toDictEntry(e: DictApiBody): DictEntry | null {
  if (e.ok !== true || typeof e.word !== 'string' || typeof e.translation !== 'string') {
    return null
  }
  const lines: string[] = []
  for (const line of e.translation.split(DICT_LINE_SEP)) {
    if (line.trim() !== TEXT_NONE) {
      lines.push(line.trim())
    }
  }
  if (lines.length === 0) {
    return null
  }
  let phonetic = TEXT_NONE
  if (typeof e.phonetic === 'string') {
    phonetic = e.phonetic
  }
  let lemma = TEXT_NONE
  if (typeof e.lemma === 'string') {
    lemma = e.lemma
  }
  let phoneticUk = TEXT_NONE
  if (typeof e.phoneticUk === 'string') {
    phoneticUk = e.phoneticUk
  }
  let phoneticUs = TEXT_NONE
  if (typeof e.phoneticUs === 'string') {
    phoneticUs = e.phoneticUs
  }
  const linesEn: string[] = []
  if (typeof e.definition === 'string') {
    for (const line of e.definition.split(DICT_LINE_SEP)) {
      if (line.trim() !== TEXT_NONE) {
        linesEn.push(line.trim())
      }
    }
  }
  let forms = TEXT_NONE
  if (typeof e.forms === 'string') {
    forms = e.forms
  }
  return { word: e.word, phonetic, lines, lemma, phoneticUk, phoneticUs, linesEn, forms }
}

/**
 * 弹层释义按界面语:中文界面给中文;其余给英文释义,英文释义没有就退回中文。
 *
 * @param x 结果与界面语。
 * @returns 一义一行。
 */
export function dictLinesOf(x: DictLinesIn): string[] {
  if (x.lang === LANG_ZH) {
    return x.entry.lines
  }
  if (x.entry.linesEn.length > 0) {
    return x.entry.linesEn
  }
  return x.entry.lines
}

/**
 * 释义标签的 i18n 键按界面语(表里没有的语言给英文标签)。
 *
 * @param x 界面语。
 * @returns 键。
 */
export function dictTagKeyOf(x: DictTagKeyIn): string {
  const key = DICT_TAG_KEY[x.lang]
  if (key == null) {
    return DICT_TAG_KEY[LANG_EN] as string
  }
  return key
}

/**
 * 词形串 → 逐条(码不在表里的丢掉)。
 *
 * @param x 词形串。
 * @returns 条目。
 */
export function dictFormsOf(x: DictFormsIn): DictForm[] {
  const out: DictForm[] = []
  if (x.forms === TEXT_NONE) {
    return out
  }
  for (const part of x.forms.split(FORM_SEP)) {
    const at = part.indexOf(FORM_KV)
    if (at <= 0) {
      continue
    }
    const key = FORM_KEY[part.slice(0, at)]
    if (key == null) {
      continue
    }
    out.push({ key, word: part.slice(at + 1) })
  }
  return out
}

/**
 * audio 元素:跳到某秒(hooks 里不许直接改元素属性,搬到这里)。
 *
 * @param x 元素与秒。
 * @returns 无。
 */
export function seekAudio(x: SeekAudioIn): void {
  x.el.currentTime = x.n
}

/**
 * audio 元素:改倍速。
 *
 * @param x 元素与倍速。
 * @returns 无。
 */
export function rateAudio(x: RateAudioIn): void {
  x.el.playbackRate = x.rate
}

/**
 * 音标加中括号;空串原样。
 *
 * @param x 音标。
 * @returns 「[…]」。
 */
export function bracketOf(x: BracketIn): string {
  if (x.phon === TEXT_NONE) {
    return TEXT_NONE
  }
  return BRACKET_L + x.phon + BRACKET_R
}

/**
 * 弹层里一档音标:有道给了用有道的,没给用 ECDICT 那套;都没有给空串(弹层留空,不写「无」)。
 *
 * @param x 本档与兜底。
 * @returns 音标。
 */
export function phonOf(x: PhonIn): string {
  if (x.own !== TEXT_NONE) {
    return x.own
  }
  return x.fallback
}

/**
 * 造「读这个词」手柄(浏览器语音,按语言码挑声音:英音 en-GB / 美音 en-US;
 * Frank 2026-09-04「英音和美音都要有吧」)。没语音能力就静默。
 *
 * @param x 词与语言码。
 * @returns 手柄。
 */
export function makeSpeakWord(x: SpeakWordIn): ClickFn {
  return function speakWord(): void {
    if (canSpeak() === false || x.word === TEXT_NONE) {
      return
    }
    const synth = window.speechSynthesis
    synth.cancel()
    const u = new SpeechSynthesisUtterance(x.word)
    u.lang = x.lang
    u.rate = TTS_RATE
    for (const v of synth.getVoices()) {
      if (v.lang.replace(UNDERSCORE, DASH).startsWith(x.lang)) {
        u.voice = v
        break
      }
    }
    function done(): void {
      x.setSpeaking(SPK_NONE)
    }
    const once = makeOnce(done)
    u.onend = once
    u.onerror = once
    x.setSpeaking(x.key)
    synth.speak(u)
    window.setTimeout(once, SPK_GUARD_MS)
  }
}

/**
 * 喇叭钮类名:在读时加动效类。
 *
 * @param x 在读。
 * @returns 类名。
 */
export function spkClsOf(x: SpkClsIn): string {
  if (x.on) {
    return cssOf(css.spkBtn) + CLS_SEP + cssOf(css.spkOn)
  }
  return cssOf(css.spkBtn)
}

/**
 * 造关弹层手柄(清词)。
 *
 * @param x 落词。
 * @returns 手柄。
 */
export function makeDictClose(x: DictCloseIn): ClickFn {
  return function close(): void {
    x.setWord(TEXT_NONE)
  }
}

/**
 * 弹层的定位样式(位置是运行时数据,经 style 进是正当通道)。
 *
 * @param p 位置。
 * @returns 样式。
 */
export function dictStyleOf(p: DictPos): React.CSSProperties {
  return { left: p.x, top: p.y }
}





