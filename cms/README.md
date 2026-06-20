# ① CMS — Payload（内容管理 + 公开网站前端）

## 需要你跑一条命令（这步必须交互式终端，Claude 的非交互 shell 跑不了）

在**你自己的终端**里，于项目根目录执行：

```bash
cd C:\Users\40270\Desktop\workspace\pnp-job-tracker
npx create-payload-app@latest cms -t blank -a claude
```

交互提示里选：
- **Database**：选 **SQLite**（零基础设施、最快；之后可迁 Postgres）
- 其余默认即可

> `-a claude` 会顺带安装 **Payload 的 Claude 技能**，之后我据此帮你写 collections 会更准。
> `-t blank` = 空白模板（我们自己定义 collections，不用 demo 内容）。

## scaffold 完成后，交给我做：

1. **定义 5 个 collections**（见 ../prd.md §7）：`companies` · `jobs` · `pnpStreams` · `policyDocs` · `designatedEmployers`
2. **ETL 入库** `etl/jobs/load.py`：把评分后的 jobs/companies 经 Payload REST API（`POST /api/jobs` 等）upsert 入库
3. **公开前端**：Next.js 页面，按 地域/NOC/通道/评分 搜索筛选
4. 配 API-key 鉴权（ETL 写库用）

## 验证 scaffold 成功的标志
- `cms/` 下有 `package.json`、`src/payload.config.ts`、`src/app/(payload)/...`
- `cd cms && npm run dev` 能起到 `http://localhost:3000/admin`
