# E1-03 · postings 原子写竞态修复

> Epic **E1 收尾与合流** · 负责人 Frank · 1 SP · Sprint 0 · 批次 B0
> 通用约定与索引见 [实现文档 README](../README.md)。

---

## 1. 整体目标

消除 build 容器读 `processed/jobbank/postings.json` 与 jobbank 容器写它的竞态（STATUS 记录：读到半写 → 该轮失败重试）。所有写方统一 temp + `os.replace` 原子写。

## 2. 验收标准

- [ ] `postings.json` 的**全部写方**均为 temp+replace（clean/05 已是；核查 05b 富集回写等其余路径）。
- [ ] 人工并发验证：写进行中读方拿到的是完整旧版。

## 3. 实现步骤

- [ ] **3.1** grep `postings.json` 全部写点，逐一核查写法。
- [ ] **3.2** 非原子写点补 temp+`os.replace`（同目录 temp 文件保证同卷 rename 原子性）。
- [ ] **3.3** 顺手核查其它跨容器共享产物（all-scored.json、mart/*.json）同样处理。

## 4. 涉及目录 / 文件

| 路径 | 角色 |
|---|---|
| `etl/clean/05_parse_jobbank.py` | 已原子（核校） |
| `etl/clean/05b_parse_details.py` | 富集回写（重点核查） |
| `etl/08_score.py` / `etl/09_build_mart.py` | 顺手核查 |

## 5. 现有代码

- STATUS 两处记载略矛盾（05 已原子 vs 「需要可给 05 加原子写」）——以 3.1 读码结论为准，修正本档。

## 6. 完成定义（DoD）

- [ ] §2 全勾 + push。
