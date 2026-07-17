---
name: iterate-audit
description: 对 offer2pr.com 生产站跑一轮迭代式整改:全量截图(电脑+手机)→ 统一检查 → 对照上轮整改清单复查闭环 → 自动实施代码侧整改 → 更新工作台文档与轮次。当用户说「跑一轮整改」「迭代整改」「复查整改清单」「下一轮走查」「/iterate-audit」,或提到功能盈利点检查、截图走查、闭环上轮问题时,一定要用本 skill——不要临场发挥重写截图脚本,脚本已捆绑且经生产验证。
---

# 迭代式整改(/iterate-audit)

工作台文档 = `docs/功能盈利点检查.md`。每轮的目标不是"发现一点改一点",而是**一次截全 → 统一检查 → 一次给全整改 → 实施 → 下轮复查闭环**,轮次递增直至清单清零。这是用户 Frank 拍板的工作法,顺序不可倒置。

## 一轮的六步

### 第 0 步 · 读现状

读 `docs/功能盈利点检查.md`:取当前轮次 N、整改清单(#编号/级别/状态)。状态含义:`⬜ 待整改`(本轮要做或复查)、`✅(第 X 轮闭环)`(已完成)。再快速扫 `STATUS.md` 头部,确认没有与整改冲突的进行中工作。

### 第 1 步 · 实施上轮待整改项(代码侧)

对清单中状态 ⬜ 的项,按 **P0 → P1 → P2** 逐项实施。边界判断:

- **自动做**:前端组件/样式/i18n 文案、`lib/plan.ts` 等常量、env 默认值、响应式修复——改完必须本地 `cd cms && npm run build` 过(dev 的 turbopack 不跑完整类型检查,这是踩过的坑)。
- **先核查再动**:标着「先核查数据」的项(如榜单聚合全零),先查 mart/DB 实况,把核查结论写进该项再决定动不动。
- **不自动做,列出来等拍板**:需要用户亲手的(Stripe Dashboard、DNS、账号类)、涉及 DB schema/ETL 数据层的、以及会改变产品语义的。这些项保持 ⬜ 并在报告里单列。

改动合并为一个 commit(git 身份 Wang Peng、不带 Co-Authored-By,repo 已配置)。**push main = 直接上生产**(Render Auto-Deploy=On):push 前确认没动 collection schema(动了要先给 Supabase 补列,B4 事故教训);push 后等部署完成再进下一步(约 2-4 分钟,`curl -s -o /dev/null -w "%{http_code}" https://offer2pr.com/jobs` 200 且改动可见为准)。

### 第 2 步 · 全量截图(两端)

依次跑捆绑脚本(系统 python,Playwright 只装在系统 python 里,别用 uv venv):

```bash
python .claude/skills/iterate-audit/scripts/capture_desktop.py --out <scratchpad>/shots
python .claude/skills/iterate-audit/scripts/capture_mobile.py --out <scratchpad>/shots
python .claude/skills/iterate-audit/scripts/process_shots.py --src <scratchpad>/shots
```

capture 脚本直连生产站,匿名段 + 测试号登录段全覆盖(账号读 `credentials.local.json`,已 gitignore);process 把 PNG 压缩成 JPG 覆盖写入 `docs/assets/profit-shots/`(电脑端)与 `docs/assets/profit-shots/mobile/`(手机端)——**文件名跨轮稳定**,md 里的图链接不用动。脚本某步失败会打印并继续,结束后核对输出清单,缺的单独补拍(补拍手法见脚本内注释:JS click 绕 tooltip、`字段` 按钮再点一次关下拉、弹框截图前重置所有 div scrollTop、手机端用 `state='attached'` 等待)。

### 第 3 步 · 统一检查

逐张 Read 截图(全部,不抽查),两件事同时做:

1. **复查**:上轮 ⬜ 项对应的图,确认整改生效 → 状态改 `✅(第 N 轮闭环)`;没生效的写明原因保持 ⬜。
2. **найти新问题**:从 #<最大编号+1> 起追加。判分标尺:转化链路是否断环、文案与事实是否相符(「真实数据」是本站的命,自家文案不许撒谎)、术语用户能否看懂、两端响应式是否破损、免费/付费切分是否被绕过。

检查期间**不动产品**——所有新发现只记入清单,留给下一轮实施(用户明确要求不许发现一点改一点)。

### 第 4 步 · 更新工作台文档

- 轮次 N → N+1,标题与日期更新;**上一轮的「当前轮次」段落先追加到 `docs/整改轮次存档.md` 末尾再覆盖**(2026-07-16 拆档拍板:工作台只留当前轮,历史沉档只增不改;已闭环多轮的图注块也可顺手迁走);
- 维持**一图一题**结构:每张截图独占子标题,子标题号=图号(电脑 图 1-22 / 手机 图 M1-M20;新增功能追加图号);
- 每图下方的「整改意见(第 N+1 轮)」块更新:闭环项写 ✅ + 一句复查结论,新问题写编号+级别+改法;
- 文末汇总表同步(#/级/问题/图/状态)。

### 第 5 步 · 输出报告

最终回复里给:本轮闭环了哪些(#号列表)、新发现哪些、还剩哪些等用户手动/拍板、下一轮建议焦点。桌面渲染 PNG 只在用户要时生成(电脑端/手机端分两张,别合一张——超 Chromium 16384px 截图上限)。

## 踩过的坑(为什么脚本长那样)

- 弹框内容会自动滚到命中行,截图前要把所有 div scrollTop 归零,否则拍不到顶部的抽选块/评分明细;
- `字段` 列选择下拉 Escape 关不掉,再点一次按钮才关;随手 mouse.click 空白坐标可能点中表格 cell 弹出无关弹框;
- PNP cell 的 hover tooltip 会拦截普通 click,一律 `el.evaluate('el => el.click()')`;
- 手机端是卡片流不是表格(表格 attached 但不可见),等待用 `state='attached'`;筛选收在「筛选 ▼」折叠里,「保存此筛选」要先套一个筛选条件才出现;
- 测试号点「购买 30 天」会进真实 live Stripe Checkout——**只截图不支付**,session 过期无副作用;
- 生产站 20000 行 SSR,goto 后等 table attached 再等 1.5s;AI 弹框要等 10-15s 让判断段生成完;
- 本地 dev 连的就是生产库,一切验证优先打 https://offer2pr.com 而不是起 dev(起了必须关,pooler 只有 15 连接,打满过导致生产 500)。

## 边界

本 skill 管「截图可见的问题」的迭代闭环。产品级大事(价值账/痛点盘点、新数据源立项、架构改动)不属于整改清单——发现了就在报告里提一句归入 backlog,不追加编号。
