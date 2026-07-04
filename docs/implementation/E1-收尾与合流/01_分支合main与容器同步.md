# E1-01 · 分支合 main 与容器同步

> Epic **E1 收尾与合流** · 负责人 Frank · 2 SP · Sprint 0 · 批次 B0
> 通用约定与索引见 [实现文档 README](../README.md)。

---

## 1. 整体目标

把 `feat/lists-autoupdate-and-table-ux`（30+ commits 未合并）合入 main，重建 docker cms 到最新代码，使 **main 即最新可部署态**，并锁定数据回归基线。

## 2. 验收标准

- [ ] main 包含分支全部提交，push 远端。
- [ ] docker cms（:3001）重建后与 host dev（:3000）行为一致（弹框三层 / 固定列 / JD 格式均在）。
- [ ] 数据回归基线记录在案：mart 岗位数 / 有评分数 / 有区数。

## 3. 实现步骤

- [ ] **3.1** `git checkout main && git merge feat/lists-autoupdate-and-table-ux && git push`（无冲突预期：main 落后无分叉）。
- [ ] **3.2** `cd docker && docker compose --profile unattended up -d --build cms`，抽查 :3001 弹框/表格。
- [ ] **3.3** 记录回归基线数字（jobs/companies/评分/区计数），写入本文档 §5。

## 4. 涉及目录 / 文件

| 路径 | 角色 |
|---|---|
| git 分支 | 合并对象 |
| `docker/docker-compose.yml` cms 服务 | 重建（cms 源码非 bind-mount，改码必须 --build） |

## 5. 现有代码与基线

- 分支在远端有同名 `origin/`，持续 push 过——合并是低风险动作。
- 回归基线（3.3 填写）：jobs=___ · 有评分=___ · 有区=___。

## 6. 完成定义（DoD）

- [ ] §2 全勾 + 基线数字落档 + push。
