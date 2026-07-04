# E4-03 · republish 自查与 PII 脱敏

> Epic **E4 合规与信任** · 负责人 Frank · 2 SP · Sprint 2 · 批次 B5
> 通用约定与索引见 [实现文档 README](../README.md)。决策 D6：JD 摘录不整篇转载。

---

## 1. 整体目标

把「转载抓取内容」的版权/PII 风险收敛到可辩护状态：JD 只做结构化摘录+显著链接官方原帖；雇主个人联系方式不出前台。

## 2. 验收标准

- [ ] JD 弹框：摘录展示 + 「查看官方原帖」按钮显著（点击直达 applyUrl）；advisor 喂 LLM 的 JD 仍是截断摘录（现 2200 字符）。
- [ ] grep 证据留档：雇主 email/phone 不出现在任何前台 SQL SELECT / props / API 响应（admin 后台可见不算）。
- [ ] 榜单/citation 等新页面同样只引事实字段 + 官方链接（对 E5-02/E4-04 提出约束）。

## 3. 实现步骤

- [ ] **3.1** JD 展示核查：`jobtext` 响应与弹框渲染是否已是摘录形态；补「官方原帖」按钮到 JD 块顶部（现有 applyUrl 链接若不显著则强化）。
- [ ] **3.2** PII grep：`page.tsx` SQL、各 API route、mart 各表 → email/phone 字段流向清单，front-facing 的删列。
- [ ] **3.3** 自查结论写入本档 §5（哪些字段展示、依据是什么：事实性数据 + 指向官方源）。

## 4. 涉及目录 / 文件

| 路径 | 角色 |
|---|---|
| `cms/src/app/api/jobtext/route.ts` · JobsTable JD 块 | 摘录 + 原帖链接 |
| `(frontend)/jobs/page.tsx` SQL · mart 各表 | PII 流向核查 |

## 5. 自查结论（3.3 填写）

- 展示字段清单与依据：___
- PII 处理记录：___

## 6. 完成定义（DoD）

- [ ] §2 全勾 + 自查结论落档 + push。
