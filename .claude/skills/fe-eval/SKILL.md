---
name: fe-eval
description: /fe 的评估段(只读取证 → 评估报告),在 fe-scout 子代理里跑,跑完把报告交回主循环出选择题。由 /fe 派出,用户一般不直接调;直接调也行(等同「只要评估报告,不拍板」)。
context: fork
agent: fe-scout
background: false
---

# fe-eval = 只读取证 → 评估报告

对象 = `$ARGUMENTS`(`pte`、`公司弹框`、`定价页` 这类)。**一行代码不改**,三步走完把报告作为最终结果交回。

## 第 1 步 · 定对象

把对象映射到四样东西再开工:

- 组件桶 `cms/src/components/<域>/` 与相关 `cms/src/lib/<域>/`;
- 页面路由(哪些 page.tsx 消费它);
- 埋点事件清单:grep `TRACK_|EV_` 常量,含义从 constants 的 JSDoc 抄,**别猜事件名的意思**;
- 若涉数据展示,追到 mart 列与 ETL 段(内容层问题多半在数据层)。

对象没给或映射不到,报告第一行写明「对象不明,候选:…」就交回,不猜。

## 第 2 步 · 收证据(只读)

四路取证,每条结论必须挂证据(代码位置 / 数据 / 所见),量力取舍但不许凭印象:

1. **代码侧**:读组件桶 + lib 域,列出功能的动线与埋点事件表(事件名 → 人话含义)。
2. **数据侧**:
   - 第一方 `funnel_events` 表(day, event, prop, n;白名单见 `cms/src/lib/funnel/constants.ts` 的 FUNNEL_STEPS)——用 node+pg 只读直查生产库(连接串在 `cms/.env` DATABASE_URI),拉近 30 天按事件汇总,漏斗内功能算每步转化率;
   - Umami:share 链接看该功能事件量与相关页面流量(链接见记忆 umami-share-url),**先剔 Frank 本人两台设备**;
   - 两源数对不上是正常的(umami 被广告拦截器吃、免费档无正式 API,见 `cms/src/lib/track/functions.ts` 头注释),漏斗分母以 funnel_events 为准;拿不到的数写「拿不到」,不编。
3. **生产实测**:375px 手机优先真开 https://offer2pr.com 走一遍该功能动线(可复用 `.claude/skills/iterate-audit/scripts/checkup.py --only <模块>`,别重写脚本);只看不改,别起本地 dev。
4. **站内对照**:同形态别处怎么做(通用桶单一出口)、该功能与站内哪里重复、数据面过 iterate-audit 的内容层六问。

## 第 3 步 · 评估报告(最终结果)

简短,固定四块,主循环拿它直接出选择题:

1. **现状**一句话;
2. **数据表现**(带数的小表);
3. **问题清单**逐条带证据,每条标工作量档(小时级 / 半天 / 要立项);
4. **优化机会**逐条一句话,含「维持现状」「砍掉」是否值得列为选项的判断。

不写长文,不给拍板,不动代码。
