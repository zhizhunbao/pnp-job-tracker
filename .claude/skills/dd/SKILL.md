---
name: dd
description: 迭代整改快捷指令。用户发来「dd」「DD」「/dd」(单独一条消息或后面带参数)= 立即跑一轮迭代式整改,等同 /iterate-audit。看到 dd 就用本 skill,不要追问用户想干什么——这是 Frank 定好的快捷键。
---

# dd = 跑一轮迭代整改

这是 `/iterate-audit` 的快捷别名。收到后**不要请求确认**,直接读取 `.claude/skills/iterate-audit/SKILL.md` 并从第 0 步开始执行完整一轮:

读工作台现状(`docs/功能盈利点检查.md`)→ 实施上轮待整改项(代码侧自动做,用户手动项列出)→ 无截图体检(捆绑脚本)→ **人眼走一遍转化链路**(浏览器窗格,第 2.5 步)→ 统一检查(闭环 ✅ + 新问题追加编号 + **每个数据面过内容层五问**:列口径读到 ETL/列非空率/站内重复/形态对照 JobsTable/口径时效,见 iterate-audit 第 3 步)→ 更新文档轮次 → 输出本轮报告。

## 参数(2026-08-02 定)

**模块名**——只体检/只浏览这些模块,其余整段跳过(全量 ~7 分钟 → 单模块 1-2 分钟):

| 写法 | 等价于 |
|---|---|
| `dd jobs` | `checkup.py --only jobs`(职位列表 + 移民价值/JD 弹框 + 匹配视图) |
| `dd pricing` | `--only pricing` |
| `dd stats` | `--only stats`(总览 + 分省 + 对比) |
| `dd rankings` | `--only rankings`(周榜/雇主榜/日榜) |
| `dd plan` | `--only plan`(/plan 四页:pr / job / career / province,SurveyJS 表单) |
| `dd news` / `dd pathways` / `dd account` | 对应 `--only` |
| `dd jobs pricing` | `--only jobs,pricing`(可叠加) |

模块名照 `checkup.py` 顶部 `MODULES`,以那儿为准;用户说了别的词(如「榜单」「定价页」)自己映射,别追问。第 2.5 步的浏览链路同步缩到该模块那一段。

**其他范围词**:`dd 全量`(跑全量截图轮,大改版后用)、`dd 只截图不整改`(跳过第 1 步)、`dd 复查 #3`(只复查指定编号)。没带参数 = 全量默认流程。
