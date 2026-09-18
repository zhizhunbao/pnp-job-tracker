'use client'
/**
 * JD 正文区:按取数态分四档 —— 在途 / 被防滥用闸挡下(#201:JD 已免费,429 偶发,
 * 素文案不引流 Pro)/ 这一岗没正文(空态自己解释)/ 拿到了。
 * 拿到了那一档:整理版状态行 + 正文轨 —— J3 整理版默认在上、原文一键切换;
 * 生成中或没有整理版就照旧渲原文。
 * 2026-08-28 换装批自 Jd.tsx 提出成文件。
 * 2026-09-14 Frank「不要显示原文,直接显示整理之后的」「这种不行」「加一个 loading 如果没有翻译完」:整理在途(fmt 还没回)
 * 与对照在途(中 / 韩界面翻译中)都出转圈行,不铺原文也不先铺英文整理版;整理失败 / 额度用完(fmt = null)仍退原文,
 * 不能让人看不到正文。取数 / 整理 / 翻译三段在途共用**同一个**转圈元素(jdWaitingOf 一次判完;Frank「加载途中为什么会闪一下」:
 * 原是两处各渲一条,取数变整理那一瞬卸一条挂一条就闪)。
 * 2026-09-16 改判(Frank「可以先显示原帖正文」):**整理在途时铺原帖正文,不再转圈**,整理版回来自动替换 ——
 * 上一条「整理在途不铺原文」作废(原文保留)。起因:服务端渲染与爬虫抓到的恰是整理在途这一档,
 * 整页只剩「加载中」,Search Console 判软 404 1,211 页、重复页 273 页。对照在译的转圈不变。
 * 2026-09-16 Frank「可以,先显示英文整理版」「不要显示这个,因为现在已经直接显示了原版,所以不用在显示加载中」:
 * 中 / 韩界面对照在译也不再转圈,先铺英文整理版,译文回来补对照行;转圈只剩「正文还在取」一种。上面 09-14「对照在途出转圈」作废。
 * 2026-09-16 同日三改位置(Frank「看原文这个按钮的位置不对」「还是像之前一样,加一个 AI 整理中,先看原文这种」「可以,就这样做」):
 * 切换钮挪进 JdAiNote 状态行右端,本件不再挂钮;为「正文区右上角绝对定位」加的外框 / 定位 / 原帖让位三个类随之撤。下面两条是撤前的记录。
 * 2026-09-16 同日改钮型:幽灵钮(ghost)在 button 桶里是纯文字,线上渲成蓝字链接,不像效果图里带描边的钮 ——
 * 「Back」的描边靠的是它专属的 backButton 类,不是 ghost 本身;改用通用次级行动钮 secondary(白底灰描边蓝字)。
 * 2026-09-16 Frank「右上角加一个切换的按钮」「放正文右上角,去掉箭头」:有整理版时正文区右上角出幽灵钮
 * 「看原文 / 看整理版」(复用 act.seeOrig / act.seeFmt,箭头已去),切的是既有的 showOrig 开关;
 * 整理版还没回(fmt = undefined)或失败(null)时正文本来就是原帖,不出钮。
 * 2026-09-16 Frank「点开的时候,如果有整理版,直接显示整理版,不要有跳跃」「点开之后,默认自动翻译」:开框首拍先只查库
 * (整理版 + 存好的对照),在途 d.pending 正文区留白,回了一起铺;库里没有的才走「先铺原帖 / 先铺英文」那两档。
 * 2026-09-16 Frank「loading 去掉吧」:**正文区的转圈行整个撤**(最后剩的「正文还在取」那一档也不出,取到前这一块留白),
 * 判它的 jdWaitingOf 随之撤。⚠ 与「加载区必占位」旧规矩相左,Frank 本人拍板撤;转圈样式 loading / spin 职位板加载件还在用,不删。
 * 2026-09-17 Frank「自动拨开去掉,但是后台要自动翻译」:对照在后台拉好但不自动出,d.pending 只剩等整理版那一拍。
 * jdWaitingOf 的注释原文照录,留「当初为什么」:
 *   「正文区从头到尾要不要出转圈行:取数在途、整理在途、翻译在途三段合一(2026-09-14 Frank「加载途中为什么会闪一下」:
 *   三段各渲一条转圈,段切换那一瞬旧条卸新条挂就闪;合成一个判定一个元素就不闪)。
 *   2026-09-16 再改判(Frank「可以,先显示英文整理版」):只剩取数在途这一段转圈 —— 整理在途铺原帖正文,
 *   中 / 韩界面对照在译先铺英文整理版,译文回来再补上对照行。原先判「整理 / 对照在途」的 jdBusyOf 随之撤(投递栏与整理版也不再等它)。
 *   代价(Frank 知情拍板):中 / 韩界面对照回来那一下正文会多出对照行,即 09-14 所说的「闪一下」。」
 *   (jdBusyOf 自己的注释原文:「整理还没回、对照在译、或中 / 韩界面整理版刚到对照还没开始译都算在途;
 *   09-16 整理还没回不再算在途 —— SSR 与 Googlebot 抓到的正是这一档,Search Console 判软 404 1,211 页与重复页 273 页。」)
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { cssOf } from '@/components/css'
import { blockedSrc } from '@/lib/jobs'
import { JD_DONE, JD_EMPTY, JD_LIMITED, JD_MAX_LEN, TEXT_NONE } from './constants'
import {
  fallbackPayOf, jdLocationOf, jdLocationZhOf, noTextOf, showFormattedOf, transShownOf,
} from './functions'
import { JdAiNote } from './jdainote'
import { JdEmpty } from './jdempty'
import { JdFormattedView } from './jdformattedview'
import { JdTextView } from './jdtextview'
import type { JdContentIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染 JD 正文区。
 *
 * @param props JD 身体状态机、本岗、是不是紧跟大标题与登录态。
 * @returns 按取数态渲的正文区。
 */
export function JdContent({ d, job, underTitle, loggedIn, lang }: JdContentIn) {
  return (
    <>
      {d.status === JD_LIMITED && (
        <p className={`${cssOf(css.mutedNote)} ${cssOf(css.mutedM4)}`}>{d.t('jd.busy')}</p>
      )}
      {d.status === JD_EMPTY && (
        <JdEmpty note={noTextOf({ t: d.t, src: blockedSrc(job) })} url={job.applyUrl}
          label={d.t('act.seeOfficial')} />
      )}
      {d.status === JD_DONE && d.pending === false && (
        <>
          <JdAiNote d={d} anon={loggedIn === false} />
          {showFormattedOf({ fmt: d.fmt, showOrig: d.showOrig }) && (
            <JdFormattedView text={String(d.fmt)}
              t={d.t}
              fallbackPay={fallbackPayOf(job)}
              location={jdLocationOf(job)}
              locationZh={jdLocationZhOf({
                t: d.t, job, lang, shown: transShownOf({ shown: d.showTrans, trans: d.trans }) !== TEXT_NONE,
              })}
              applyUrl={job.applyUrl}
              applyEmail={d.applyEmail}
              underTitle={underTitle}
              trans={transShownOf({ shown: d.showTrans, trans: d.trans })} />
          )}
          {showFormattedOf({ fmt: d.fmt, showOrig: d.showOrig }) === false && (
            <JdTextView text={d.text} max={JD_MAX_LEN} />
          )}
        </>
      )}
    </>
  )
}
