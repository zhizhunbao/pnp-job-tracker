'use client'
/**
 * 账户状态页(E3-02):仅已登录态(Pro 到期/档案/购买/登出;Stripe 回跳落点)。
 * 登录入口全站只有一个 = /jobs 顶栏弹框(用户定):未登录访问本页 → 跳回 /jobs?login=1 自动弹框。
 * E3-03:时长包购买入口(30/90 天)—— 前端只拿 Checkout URL 跳转,回跳 ?ok=1 提示(到期日由 webhook 拨)。
 *
 * 2026-08-26:页面改造成「纯拼装门」(闸 local/page-compose-only)—— 排版全部下沉进
 * components/account/;同日 Frank 实拍「还是有一堆函数啊」再收一刀(闸 local/page-no-logic):
 * state/effect/handler 也全部收进 components/account/hooks.ts 的 useAccountPage,
 * 门里只剩一行 hook + 大写组件的拼装;注释一并收 JSDoc 形(闸 local/jsdoc-comments-only)。
 *
 * 2026-08-28:骨架收编进全站标准形 —— 外框 Frame + 正文轨 Shell(2026-07-18 Frank
 * 「每个页面的宽度应该是一样的」),本页专属的 860 读宽 AccountColumns 作为窄读列
 * 住进壳内(2026-07-31「窄读列放壳内」)。原 AccountShell 退役,渐变底先暂存
 * AccountTint 候选层;2026-08-28 Frank 拍板全站灰(渐变与灰亮度差不足 2%,
 * 留渐变只多一个特例),该件同日删除,底色归 Frame 的 var(--bg) 一处。
 * 上下留白由 Shell 的 top/bottom 档接手(各 40px = 原 AccountColumns 的 2.5rem),
 * 左右安全边由正文轨的 1.25rem 接手。
 *
 * 节槽注记(原散在 JSX 里的决策记录,收拢于此):
 * · 顶栏/页脚:全站共享(2026-07-16 用户拍板统一 header/footer);账户在本页为当前态不再链自己。
 * · 答题条件条(AnswersRow)2026-08-04 摘除:整条蓝条的存在意义就是把人送去 /plan/job
 *   (看结果 / 去答题),而答题卡功能已摘入口、只保留路由。档案节现在直接是 ProfileForm + 简历存档。
 * · profile 节:移民档案(E5-00)= 匹配层输入,key 按 id 防换号残留;
 *   简历存档(E11-08)能看能删是能存的前提,与「存」同批上线。
 * · favs / sjobs 节:已保存筛选(E5-03)= 邮件提醒管理;我的收藏(#62A)是同一收藏数据的
 *   纯列表视图,独立成节。
 * · buy 节:时长包购买(E3-03),Pro 也可续买,到期日顺延。
 * · 未登录:回首页弹登录框(不渲染独立登录页)。
 *
 * 2026-09-23 Frank:「只保留一个 我的简历 我的收藏 我的求职 其他的能删都删了」(起因:他截图说
 * 移民档案节「基本上是完全没法用」)。撤掉四节:概览 overview、移民档案 profile、
 * 已保存的筛选 saved、升级 Pro buy —— 上面节槽注记里 profile 节与 buy 节两条、favs 条里的
 * 已保存筛选半句,自此只是历史。侧栏只剩 我的简历 resume(默认落点)、我的收藏 favs、
 * 我的求职 sjobs 三节;简历存档 ResumeArchive 原样挪进「我的简历」节;Stripe 回跳 `?ok=1`
 * 的成功提示原住概览节顶上,抽成 PayOkNotice 挂在右列内容最上面(三节都出)。
 * 旧深链 `?sec=overview|profile|saved|buy` 不在节表里,落回默认节。
 * 2026-10-04 Frank「升级 Pro 这个删了,放到 我的 模块里,加一个我的订阅」:末尾加回一节「我的订阅」(sub),
 * 账户下拉的「升级 Pro」挪进来 —— 当前套餐 + 升级 / 续买,钮打开全站同一个定价框。
 * 2026-10-05 Frank「先做我的简历吧」:「我的简历」节的简历文字存档 ResumeArchive 退役,换成原件卡片 ResumeFile
 * (上传 / 预览 / 替换 / 下载 / 删除 + PDF 首页缩略图;自己拉元信息,不再吃 me.profile 的两格)。
 * 2026-10-06 Frank「先做我的求职」「也重新改一下」:「我的求职」「我的收藏」两节换成 myjobs 桶的两张表
 * (AppliedList / SavedList,通用 Table、手机职位卡);周报开关 WeeklyOptin 随定稿拼在收藏表下面,原 SavedJobsList 撤。
 * 2026-10-07 Frank「投递不应该跳到我的投递页面吗」→「合成一个」:投递并进「我的求职」—— 职位页「邮箱投递」跳
 * `?sec=sjobs&job=<职位号>`,投递区(apply 桶 ApplySection)摆在投递记录表上方;发出后表按 appliedGen 重挂、重新取一次。
 * 原独立投递页 /apply/<id> 撤。
 * 2026-10-08 照 AIApply 重设计(docs/design/我的/我的求职-20261009.md):页签换序、默认落「我的求职」;banner 副题「已投 N 封」;
 * 发出后表上方出成功条 SentNotice;「我的简历」下面多一段「求职信」CoverLetters;「我的订阅」换成方案卡 / Pro 包含 / 付款记录。
 * 2026-10-08 Frank「找一个最好的直接抄」(AIApply 的 Auto Apply):「我的求职」最上面加「今日待投」QueueReview(智能投递队列的审核区)。
 * 2026-10-08 小白走查:带 job= 来的(职位页点了「邮箱投递」)先给他投那一岗 —— 投递区在上、「今日待投」等发出去再出;
 * 否则两块都在要简历和英文姓名,他不知道填哪个。
 * 2026-10-09 A 批投递搬进弹框(docs/design/我的/我的求职-20261009.md):页内投递区 ApplySection 撤 —— 投递框挂在全站骨架上,
 * 任何一页带 `?apply=<职位号>` 就弹;本页摆一个无界面的 ApplySentSync,收到「发出去了」就刷新投递表、出成功条;「今日待投」不再让位。
 * 2026-10-10 批 2「我的求职」四段(docs/design/我的/我的求职-20261009.md 第 3 节 15 / 16b / 16c / 16d):「今日待投」QueueReview
 * 与它的准备清单、智能投递开关从本页撤(队列后端不动);「我的收藏」页签撤,收藏表搬进「我的求职」;节内顺序 =
 * 今日推荐(+ 免费号的更多推荐)→ 我的收藏 → 我的投递 → 新岗推送(Push,接替周报开关 WeeklyOptin)。发出后投递表重挂、推荐卡按同一个代数重拉。
 * 2026-10-10 批 3(docs/design/我的/我的求职-20261009.md 1.5 / 2.5 / 1.6 / 2.6):「我的求职」后面加「收件箱」一节(inbox 桶 Inbox,
 * 页签带红色未读数);门里再摆只读投递框宿主 AppViewHost(地址栏 `?app=` 就弹:我的投递「打开」、收件箱「打开这次投递」)。
 * 2026-10-11「进我的求职先弹五题」(Frank「一共没几个问题啊 都问不行吗」):「我的求职」节多摆 JobsQuiz —— 档案五样有空着的
 * 自动弹「修改」同一个弹框、只问空着的;关了今日推荐按答档案代数现算重拉。
 *
 * @author Frank
 * @time 2026-07-02 00:00:00
 */
import { ApplySentSync } from '@/components/apply'
import { Inbox } from '@/components/inbox'
import { AppliedList, AppViewHost, Picks, Push, SavedList } from '@/components/myjobs'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import {
  AccountBanner,
  AccountColumns,
  AccountNav,
  AccountRedirect,
  CoverLetters,
  JobsQuiz,
  PayOkNotice,
  Profile,
  ResumeFile,
  SentNotice,
  Subscription,
  SEC_INBOX,
  SEC_PROFILE,
  SEC_RESUME,
  SEC_SJOBS,
  SEC_SUB,
  SHELL_BOTTOM,
  SHELL_TOP,
  useAccountPage,
} from '@/components/account'
import { Frame, Shell } from '@/components/shell'

/**
 * 账户页的门:一行状态机器 + 大写组件的拼装,没有别的。
 *
 * @returns 整页。
 */
export default function AccountPage() {
  const a = useAccountPage()
  return (
    <Frame>
      <Header />

      <Shell top={SHELL_TOP} bottom={SHELL_BOTTOM}>
        <AccountBanner t={a.t} sent={a.sent} />
        {a.checked && a.me != null && (
          <AccountColumns
            nav={<AccountNav sec={a.sec} t={a.t} onPick={a.onPick} unread={a.unread} />}>
            {a.payOk && <PayOkNotice t={a.t} />}
            {a.sec === SEC_SJOBS && a.sentTo != null && <SentNotice t={a.t} company={a.sentTo} />}
            {a.sec === SEC_RESUME && <ResumeFile t={a.t} />}
            {a.sec === SEC_RESUME && <CoverLetters t={a.t} />}
            {a.sec === SEC_SJOBS && <Picks gen={a.appliedGen} asked={a.askedGen} t={a.t} pro={a.pro} />}
            {a.sec === SEC_SJOBS && <SavedList t={a.t} plan={a.plan} />}
            {a.sec === SEC_SJOBS && <AppliedList key={a.appliedGen} t={a.t} plan={a.plan} />}
            {a.sec === SEC_SJOBS && <Push t={a.t} />}
            {a.sec === SEC_SJOBS && <JobsQuiz t={a.t} onDone={a.onAsked} />}
            {a.sec === SEC_INBOX && <Inbox t={a.t} />}
            {a.sec === SEC_PROFILE && <Profile t={a.t} />}
            {a.sec === SEC_SUB && <Subscription t={a.t} until={a.me.proUntil} />}
          </AccountColumns>
        )}
        {a.checked && a.me == null && <AccountRedirect />}
        <ApplySentSync onSent={a.onApplied} />
        {a.checked && a.me != null && <AppViewHost t={a.t} />}
      </Shell>

      <Footer />
    </Frame>
  )
}
