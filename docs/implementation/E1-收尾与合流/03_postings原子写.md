# E1-03 · postings 原子写竞态修复

> Epic **E1 收尾与合流** · 负责人 Frank · 1 SP · Sprint 0 · 批次 B0
> 通用约定与索引见 [实现文档 README](../README.md)。

---

## 1. 整体目标

消除 build 容器读 `processed/jobbank/postings.json` 与 jobbank 容器写它的竞态（STATUS 记录：读到半写 → 该轮失败重试）。所有写方统一 temp + `os.replace` 原子写。

## 2. 验收标准

- [x] `postings.json` 全部 5 个写方均为 temp+`os.replace`：clean/05、clean/05b 原已原子（核校确认）；**04c/04d/05c 三处直写已补**（grep 全仓确认无遗漏）。
- [x] 验证：py_compile 三文件通过；05c 幂等实跑走新路径成功（15293 帖 / 318 AIP）。os.replace 同卷 rename 原子性由 OS 保证，读方任意时刻拿到完整旧版或完整新版。

## 3. 实现步骤

- [x] **3.1** grep 定位：05/05b 已原子；04c:175、04d:122、05c:71 直写（STATUS 两处记载的矛盾由此澄清——05 早已原子，坑在三个原地清洗脚本）。
- [x] **3.2** 三处补 temp+`os.replace`（含补 `import os`）。
- [x] **3.3** 其它共享产物核查结论：ATS 各公司 jobs.json（04b/04c/04d/05c 写）只在 build 链内顺序读写、无跨容器并发写方 → 不处理；all-scored.json/mart 由 08/09 在同一 build 步内产出后才被 seed 读 → 竞态窗口可忽略，暂不处理（YAGNI）。

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
