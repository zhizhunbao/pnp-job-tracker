# E6-03 · 公司分析接服务端 web_fetch(顾问公司层补真数据)

> Epic **E6 数据补强** · 负责人 Frank · 2 SP · 2026-07-05 立项(盘点 §2「公司分析无真实数据兜底」;原 #5 自建抓取因脆/重被 D9 砍,**方案换代:Anthropic 服务端 web_fetch 运行时抓,零 ETL**)
> 上位分析:[功能价值盘点](../../功能价值盘点与数据缺口.md) §4-P3→P2 提级理由。

## 1. 整体目标

advisor 的公司初判(field=company)从「凭模型记忆」升级为「现场抓官网首页 grounded 总结」:prompt 带官网 URL + 声明 web_fetch 工具 → Anthropic 服务端抓页 → 模型基于真实内容写四段分析。覆盖有官网 URL 的 ~24% 公司(恰为 ATS 第一方主力)。

## 2. 验收标准

- [x] ① 真 API 冒烟:`web_fetch_20250910` 在 claude-haiku-4-5 **无需 beta 头**,server_tool_use/web_fetch_tool_result 块不干扰流式 text 事件。(2026-07-05 ✅)
- [x] ② `lib/llm.ts`:可选 `fetchUrl` → webFetchTool()(URL 合法性防御/max_uses=1/allowed_domains=官网 host/max_content_tokens 4000);ollama 忽略。✅
- [x] ③ advisor 路由:company 初判传 fetchUrl;prompt 带注入防御 +「失败回退通识并明说」+「不旁白抓取动作」。✅
- [x] ④ 缓存按公司名不变;成本=抓回 ≤4K tokens 输入(~$0.004)+输出 640(公司档从 480 提,实测抓到真材料后 480 截断第四段)。✅
- [x] ⑤ 生产验证 ✅(2026-07-05):Magnet Forensics 实测——输出含官网当前产品矩阵(Graykey/Verakey/AutoKey/Axiom/Nexus/Griffeye/Magnet One)与 slogan「Gain an Investigative Edge」,**模型记忆编不出的新鲜度 = grounding 实锤**;无官网公司走通识分支不变。

## 3. 实现步骤

- [x] **3.1** 冒烟脚本拍板:免 beta 头,end_turn 正常。
- [x] **3.2** llm.ts 扩展(webFetchTool 独立小函数,非法 URL 静默降级=无工具)。
- [x] **3.3** advisor route 改造(fetchUrl 只在 company 初判传,chat 轮不传)。
- [x] **3.4** build 过 → 推送 → 生产实测过(⑤);瑕疵修复随后一笔(640 tokens + 不旁白)。

## 4. 涉及文件

`cms/src/lib/llm.ts` · `cms/src/app/api/advisor/route.ts`(buildPrompt/POST)

## 5. 现有代码

anthropicStream 用官方 SDK `client.messages.stream`;公司初判缓存键 `company:<名>:<语言>`;advisor SYSTEM 已有 grounding 铁律(叠加不冲突)。

## 6. 完成定义(DoD)

- [x] §2 全勾 + push + STATUS 记档;盘点文档 P3 行已结案。(2026-07-05,立项→生产验证 <半天)

## 7. 实施记录

- 2026-07-05 立项。前置调研:裸 API 无网络;web_fetch 只抓对话中出现过的 URL(安全设计);Haiku 4.5 用基础版 `web_fetch_20250910`(动态过滤版需 Opus/Sonnet 档);计费=抓回内容按输入 token 计,无按次费。
