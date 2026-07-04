# E1-01 · 分支合 main 与容器同步

> Epic **E1 收尾与合流** · 负责人 Frank · 2 SP · Sprint 0 · 批次 B0
> 通用约定与索引见 [实现文档 README](../README.md)。

---

## 1. 整体目标

把 `feat/lists-autoupdate-and-table-ux`（30+ commits 未合并）合入 main，重建 docker cms 到最新代码，使 **main 即最新可部署态**，并锁定数据回归基线。

## 2. 验收标准

- [x] main 包含分支全部提交并已 push（c9732b4..f94e096，2026-07-03 用户授权）。
- [x] docker cms（:3001）重建完成，/jobs 返回 200（19MB 列表页）。
- [x] 数据回归基线记录在案（§5）。

## 3. 实现步骤

- [x] **3.1** 合并完成（fast-forward 至 d6d6a86，35 commits 含计划文档；**push 待用户确认**——直推 main 需明确授权）。
- [x] **3.2** cms 重建完成并验证 :3001 → 200（2026-07-03）。
- [x] **3.3** 基线已记录（见 §5）。

## 4. 涉及目录 / 文件

| 路径 | 角色 |
|---|---|
| git 分支 | 合并对象 |
| `docker/docker-compose.yml` cms 服务 | 重建（cms 源码非 bind-mount，改码必须 --build） |

## 5. 现有代码与基线

- 分支在远端有同名 `origin/`，持续 push 过——合并是低风险动作（实测 fast-forward 零冲突）。
- **回归基线（2026-07-03，mart 层）**：jobs=11904（有评分 11904 · 有区 4485 · 有 NOC 11824）· companies=8722 · pnp_occupations=247 · ee_categories=94 · noc_descriptions=447 · designated_employers=2917 · cities=1478 · districts=1386。

## 6. 完成定义（DoD）

- [ ] §2 全勾 + 基线数字落档 + push。
