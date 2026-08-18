// 答复文本的底料:去记号、单位词三语、判据词表、长度上限。
//
// 为什么单独存在:它们不属于任何一层业务,facts / guards / traces / answer / stream 都要用。
// 放进其中任何一个,另一个就得反向 import 它 —— 实测过两个环(facts↔guards、answer↔guards),
// 成因就是这几个名字住错了层。
// 🔴 判据词表(AVAIL_MARKERS / VERDICT_MARKERS / HEDGE_WORDS)**不是文案**:用户看不到,
//    它们是校验器用来认出「模型说了什么」的判据,所以不进 lib/i18n。
import { type Availability } from './tools'
import { type Lang } from '../i18n'

/** 出口回读用:模型会换个说法(「未收集」不是「未收录」),所以按**语义标记**认,不按原句认。 */
export const AVAIL_MARKERS: Record<Lang, Record<Exclude<Availability, 'ok'>, string[]>> = {
  zh: {
    // 私人承诺那句(PROMISE_WHY)不含「不公布」三个字,但它就是 not-published 的意思,而且说得更透
    'not-published': ['不公布', '不发布', '未公布', '未发布', '不对外公布', '不披露', '没有任何一级政府公布', '谁也核不了'],
    'not-collected': ['未收录', '尚未收录', '未收集', '没有收录', '未索引', '暂未收录', '未收集此类'],
    'not-applicable': ['不适用', '不走这套', '不属于省提名'],
  },
  en: {
    'not-published': ['does not publish', 'is not published', 'not published', 'do not publish', 'no government publishes', 'nobody can check'],
    'not-collected': ['not indexed', 'has not indexed', 'unindexed', 'not collected', 'no data on', 'not in our index'],
    'not-applicable': ['not applicable', 'outside the provincial nominee'],
  },
  ko: {
    'not-published': ['공개하지 않', '공표하지 않', '발표하지 않', '공개하는 정부는 없', '확인할 수 없'],
    'not-collected': ['수집하지 않', '수집되지 않', '색인되지 않'],
    'not-applicable': ['해당 없음', '대상이 아닙'],
  },
}

/**
 * 商业话术那条主张的**判断**有没有被说出口 —— 同 AVAIL_MARKERS 一个道理:按语义认,不按原句认。
 *
 * 🔴 2026-08-05 实测这个洞:facts 里给的是「这类私人承诺不能当作官方保证」(PROMISE_WHY),
 * 模型写出来的是「中介收取的 2 万费用及所谓合作公司承诺并非官方要求,**本站无此记录**」——
 * 把交易判断换成了四态口吻。而 collectFacts ⑦ 之所以**不**给商业话术套四态,防的正是这一句:
 * 「本站未收录」= 我们的问题,他该去官网看;「私人承诺不能当官方保证」= **对方的问题**,他该警惕。
 * 两句在用户那里意思相反,说反等于拿假前提教他防中介(CLAUDE.md 那条铁律的同一个坑)。
 *
 * 为什么 missingClaimLines 原来放行:它只在主张带四态时才要求答复复述状态,而商业话术那行没有四态,
 * 于是「提到了这条主张」就算过 —— 判断说成什么样都行。这里给它补上该有的那把尺。
 */
export const VERDICT_MARKERS: Record<Lang, string[]> = {
  zh: ['不能当作', '不能证明', '不是官方保证', '不等于官方', '不构成官方', '并不保证', '没有官方效力'],
  en: ['not an official guarantee', 'does not prove', 'do not prove', 'does not guarantee', 'no official standing', 'is not official'],
  ko: ['공식 보장이 아', '증명하지 않', '보장하지 않', '공식적인 효력이 없'],
}

/**
 * 🔴 **markdown 记号一律剥掉,不渲染**(2026-08-05 生产实录:答复里出现 `ON 官方**不公布**职业清单`)。
 *
 * 病根在数据层:C1 的 note 是给人读的中文,里面带着 markdown 强调
 * (tools.ts `${prov} 官方**不公布**职业清单…`),它经 valueText 进三个下游 —— 喂模型的 FACTS 块、
 * 降级清单、前端出处表。**降级清单和出处表是我们自己写的字**,没有 tidy 这道回来剥的工序,于是原样见客。
 *
 * 为什么剥不渲:我们的答复按设计是**一句一事实的短纯文本**(前端 white-space:pre-wrap),
 * 没有一处需要富文本;引入 markdown 渲染 = 一个新依赖 + 一个 XSS 面(答复正文里混着模型生成的内容),
 * 换来的只是几个星号变成加粗。剥掉是 Ponytail 第 5 格的一行解法,而且**三个下游一次全治**。
 *
 * 收口在 `fact()` 这一个入口:label/valueText 是 markdown 唯一的入境口,在这儿剥干净,
 * prompt / 降级清单 / 出处表都不必再各自处理(各自处理迟早漏一处)。
 *
 * 🔴 2026-08-06 起**两样不剥**:行首 `- ` 与空行。它们是前端 ChatText(3ebe64c)真渲染得出来的
 * 两样(项目符号组 + 空行分段),剥掉就等于把渲染器废了 —— 「格式乱」的病根正是这里曾经全剥。
 * 剥的判据从此只有一条:**渲染不出来的记号才剥**(`**` `#` 反引号 → 剥;`*`/`+`/`•` → 归一成 `- `;
 * 编号列表 → 也归一成 `- `,理由见下)。
 */
export const stripMd = (s: string): string => s
  .replace(/\*\*/g, '')                       // 加粗记号:去记号留字
  .replace(/`/g, '')                          // 等宽记号
  .replace(/^[ \t]*#{1,6}[ \t]*/gm, '')       // 小标题
  .replace(/^[ \t]*[*+•][ \t]+/gm, '- ')      // 别家的项目符号 → 我们这一种(渲染器只认 `- `)
  // 🔴 编号列表 → 项目符号。两个理由,都不是审美:① 渲染器不认 `1.`,它会原样留在正文里;
  //    ② 行首编号撞 guard 的**行首序号白名单**(那道白名单按位置放行 1-2 位数,不查 facts)——
  //    归一掉序号,这个盲区就不存在了。提示词那头照旧明令禁止,这里是回来自己收的那一道。
  .replace(/^[ \t]*\d{1,2}[.)][ \t]+/gm, '- ')

// num = 直接跟在数字后面(自带量词);bare = 跟在中文/韩文量词后面(量词已经写过了,不能再带一个)
const UNIT_TEXT: Record<Exclude<Lang, 'en'>, { num: Record<string, string>; bare: Record<string, string> }> = {
  zh: {
    num: { job: '个岗位', opening: '个岗位', posting: '个岗位', year: '年', month: '个月', week: '周', day: '天', point: '分', people: '人', person: '人', invitation: '个邀请', spot: '个名额', nomination: '个提名' },
    bare: { job: '岗位', opening: '岗位', posting: '岗位', year: '年', month: '月', week: '周', day: '天', point: '分', people: '人', person: '人', invitation: '邀请', spot: '名额', nomination: '提名' },
  },
  ko: {
    num: { job: '개 일자리', opening: '개 일자리', posting: '개 일자리', year: '년', month: '개월', week: '주', day: '일', point: '점', people: '명', person: '명', invitation: '건 초청', spot: '개 정원', nomination: '건 지명' },
    bare: { job: '일자리', opening: '일자리', posting: '일자리', year: '년', month: '월', week: '주', day: '일', point: '점', people: '명', person: '명', invitation: '초청', spot: '지명' },
  },
}

/**
 * 「3 jobs」→「3 个岗位」、「3个Job」→「3个岗位」。只动单位词,不碰数字(guard 的账一分不变)。
 * 第二条规则是实测出来的:模型会自己补中文量词再抄英文单位(「15个Job」),只认「数字+单位」会漏。
 */
export function localizeUnits(answer: string, lang: Lang): string {
  if (lang === 'en') return answer
  const { num, bare } = UNIT_TEXT[lang]
  const key = (w: string) => w.toLowerCase().replace(/s$/, '')
  return answer
    .replace(new RegExp(`(\\d)\\s*(${UNIT_WORDS})\\b${NOT_PROPER}`, 'gi'), (m, n, w: string) => (num[key(w)] ? `${n} ${num[key(w)]}` : m))
    .replace(new RegExp(`([\\u4e00-\\u9fff\\uac00-\\ud7af])\\s*(${UNIT_WORDS})\\b${NOT_PROPER}`, 'gi'), (m, c, w: string) => (bare[key(w)] ? `${c}${bare[key(w)]}` : m))
}

// ── 🟡 出口留痕④:没有 fact 撑腰的推断性措辞 ────────────────────────────────
//
// 数字 guard 只管数字,拦不住「QC 通常要求法语能力」「竞争激烈」「政府不介入商业安排」这类**非数字主张** ——
// 而它们错了一样赔信任。词表只收三类**必然越过 facts** 的措辞,不收正常表述(避免误杀,先只报警不拦):
//   ① 频率概化(通常/往往/一般来说):facts 只给单个官方数,任何「一般怎样」都是模型自己的经验;
//   ② 概率与竞争评价(竞争激烈/可能较低/大概率):本站从不算胜率,出现即凭空;
//   ③ 行动劝告(建议尽快/最好尽早):红线里写死了不给建议,劝一句就变成了顾问。
export const HEDGE_WORDS: Record<Lang, string[]> = {
  zh: ['通常', '一般来说', '一般而言', '往往', '大多数情况', '普遍', '众所周知', '按惯例',
    '竞争激烈', '竞争很激烈', '难度较大', '相对容易', '大概率', '可能性较大', '可能较低', '可能较高', '概率较低', '概率较高',
    '建议您尽快', '建议尽快', '最好尽早', '应尽快', '建议', '务必', '轻信'],
  en: ['usually', 'typically', 'generally', 'in general', 'tend to', 'tends to', 'as a rule',
    'highly competitive', 'very competitive', 'most likely', 'chances are', 'unlikely to', 'likely to be lower',
    'we recommend', 'you should hurry', 'as soon as possible', 'make sure to', 'be careful'],
  ko: ['보통', '일반적으로', '대체로', '흔히', '경쟁이 치열', '가능성이 높', '가능성이 낮', '가급적 빨리', '권장합니다', '주의하'],
}

// ── ✂️ 出口截断:长度与句数都得回来自己收 ──
export const LEN_CAP: Record<Lang, number> = { zh: 600, ko: 700, en: 1400 }

/**
 * RULE 7 写着「至多 N 句」,模型该写十六句照写十六句(2026-08-04 实录:一省一句摞了八行岗位数)。
 * 句数上限做成**机械的**:多出来的句子按定义是清单尾巴 —— 剧本要求的内容全在前 N 行里。
 *
 * 🔴 2026-08-06 由 8 提到 11:RULE 5 松绑后 bucket A 从**一句长句**摊成**二到四行项目符号**,
 * 而这里按 `\n` 断行 —— 每条项目就是一行。内容预算一个字没加,只是同样的内容多占了 3 行:
 * 1 句答题 + 4 行清单 + 最多 5 条主张各一句 + 1 句收口 = 11(旧口径 1+1+5+1 = 8,同一笔账)。
 * 不改成「一组项目符号算一句」是因为那会给「一省一行」开后门 —— 每一行都得记账,超了照样截。
 * 字数上限不动:项目符号只多了几个 `- ` 与换行,LEN_CAP 那头一点没紧张。
 */
export const SENT_CAP = 11

/**
 * 单位来自库(pnp_ops_stats.unit),**我们枚举不全**:实测漏过一个 `nominations`。
 * 兜底原则 —— 中/韩界面里,**认不出的英文单位一律不印**(标签已经把意思说清了:
 * 「MB 年内已提名: 2673」不比「2673 nominations」少一个字的信息)。缩写(CRS/CLB)照留。
 */
export function unitText(unit: string, lang: Lang): string {
  if (!unit || lang === 'en') return unit
  if (!/[a-z]/i.test(unit)) return unit                       // 本来就不是英文
  if (/^[A-Z]{2,5}$/.test(unit)) return unit                  // CRS / CLB 这类站内通用缩写
  const mapped = localizeUnits(`1 ${unit}`, lang).replace(/^1\s*/, '')
  return /[a-z]/i.test(mapped) ? '' : mapped                  // 认不出 → 不印,绝不把英文丢给用户
}


// ── 🔴 出口校验①:中/韩答复里不许留英文单位词 ──────────────────────────────
//
// 根因是 facts 的 label/unit 用官方英文措辞,模型顺手抄进中文句子(实录「BC: 15 jobs」「满 3 years」)。
// 两段处理:**能机械修的就地修**(数字后面跟的单位词,纯显示,换掉不丢任何事实),
// **修不掉的报出来**(裸着的 cutoff/requires 这类 FACTS 速记 → 说明整句是抄的,要重写)。
// 专有名词(MPNP In-Demand Occupations List)不在词表里 —— 那是引用依据,准许保留英文原名。
export const UNIT_WORDS = 'jobs?|openings?|postings?|years?|months?|weeks?|days?|points?|people|persons?|invitations?|spots?|nominations?'
// 专名护栏:「Job Bank」是来源名(RULE 6 准许保留英文原名),不是单位词 —— 别把它译成「岗位 Bank」
export const NOT_PROPER = '(?!\\s*Bank)'