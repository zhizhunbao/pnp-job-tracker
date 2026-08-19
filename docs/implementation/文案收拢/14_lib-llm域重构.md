# 14 · `lib/llm/`:域内七件套定型 + 失败与留痕收拢

> 2026-08-19。样板是同日定型的 `lib/agent`(见 [11 号 §9](11_agent兜底接入pi.md)),规矩在 CLAUDE.md「代码组织约定 / 域内文件的标准形态」。
> 起点:632 行 / 4 文件(`provider.ts` 出口、`friend.ts` 朋友 ngrok 网关、`lineTranslate.ts` 逐行对齐翻译、`index.ts` 桶),39 处箭头函数 / 7 处 any-unknown / 14 处对象展开。

---

## 1 · 边界:`lib/llm` 与 `lib/agent` 都在回答「用哪个模型」,判定为**不合并**

`llm/index.ts` 自称「advisor 的**唯一模型出口**」,而 `lib/agent` 这一轮长出了自己的 `model()` 构建函数 + 一整套 anthropic 常量(`MODEL_ID` / `MODEL_API` / `MODEL_BASE_URL` / `COST_*`),绕过 llm 直连 pi-ai。CLAUDE.md 的收拢判据是「**有没有重复**」,所以逐字查:

**真正重合的只有一样东西** —— 默认模型 id `claude-haiku-4-5` 与它的 env 覆盖 `ANTHROPIC_MODEL`。
其余(cost 表、baseUrl、contextWindow、reasoning)**只有 agent 有**,因为 pi-ai 要一整个 `Model<…>` 描述符自己算账;`lib/llm` 走 `@anthropic-ai/sdk`,SDK 自带地址与计费。没有第二处重复,就没有合并的由头。

合并要付的代价反而是实的:

- llm 有 **14 个消费者**(src 里 import 这个桶的文件数),为 agent 一个消费者背上 pi-ai 的类型;
- 更糟的是**合并后的「唯一出口」会撒谎** —— 它在类型上让人以为 agent 也能切 friend / ollama,而朋友的网关**不透传 tools**(实测),ollama 那条链根本没接工具。一个允许你选、选了就静默失效的开关,比两个诚实的出口坏得多(宪法:不许 fallback 成默认值悄悄降级)。

**所以边界不按「模型 / 后端」切,按「对话形状」切:**

| | `lib/llm` | `lib/agent` |
|---|---|---|
| 形状 | 一问一答出**一条字节流** | **带工具的多轮循环** |
| 后端 | 三个可互换(Render 置 `LLM_PROVIDER=friend` 一个 env 就切,回退 = 删该 env) | 锁死 anthropic —— 不是没做,是**换不了** |
| 工具 / 多轮 / 记账 | 都没有 | pi 的 harness 全包 |

那唯一一处重合怎么办:**不做跨域 import**(宪法:域之间不互相取常量;为一个字符串新建共享叶子是为两行代码盖房子)。真正的单一来源是 **env `ANTHROPIC_MODEL`** —— 两边读同一个 key,只有 env 没设时才各自回落到字面量。两边的常量正上方都写了这条,`lib/agent/constants.ts` 的 `MODEL_ID` 上也留了交叉引用。

哪天朋友的网关真透传了 tools,回来重判这一条。

---

## 2 · 不开 `./server` 门(重判后结论不变,理由换了个更硬的)

旧理由是「今天的消费者全在服务端,零个 `'use client'`」—— 那是会变的事实,撑不住。

**真正的判据:擦掉服务端那半之后,index 门里还剩什么。** 本域擦掉之后只剩 `ChatMessage` 一个类型 —— 那不是门,是空壳。(`lib/agent` 拆得成,是因为它的 index 本来就只有类型:`AgentSlots` 要交给客户端看。)

外加一条硬约束:桶路径被 **11 处 `vi.mock('@/lib/llm', …)`** 钉着,把值搬进 `/server` 等于让那 11 处 mock 全部失效(mock 打桶、被测代码却从 `/server` 取)。

---

## 3 · 四件不是七件

`constants` 参数 / `types` 形状 / `functions` 行为 / `index` 门。缺的三件各有理由,不是漏了:

- **`prompts.ts`** —— 本域**不组装 prompt**(`provider.ts` 头一行的老规矩:prompt 组装留在调用方)。唯一进 prompt 的字是 `[ref:指纹]`,它是**上游缓存键读的协议标记**,不是话术,归 `constants`。
- **`schemas.ts`** —— 没有运行时校验库。网关回包的形状写在 `types` 第 3 段,解析时逐个兜底。
- **`server.ts`** —— 见 §2。

顺手收掉两处**真查得出**的重复:

1. `TRANSLATE_API_BASE/KEY` 的读法 —— `friend.ts` 与 `lineTranslate.ts` 各抄了一份逐字相同的,现在是 `GATEWAY_BASE` / `GATEWAY_KEY` 一处(同一个网关同一把钥匙)。
2. `refPrompt(prompt, system)` 与 `refLine(text, lang)` 逐字同形 —— 差别只是拌进指纹的那一段,于是它变成了 `refPrompt({ prompt, salt })`。

| | 改前 | 改后 |
|---|---|---|
| 箭头函数 | 39 | **0**(`types.ts` 里 8 处是回调**类型**声明) |
| `any` / `unknown` | 7 | **0** |
| 对象展开 `...` | 14 | **0** |
| `as` 断言 | 2 | **0**(只剩一个 `as const`,上一行写了为什么) |
| `functions.ts` 顶层变量 | — | **0** |

---

## 4 · 不用 class(Frank 定,全站)

抛出去的是**原生 `Error`**,身份挂在 `name` 上,判定走类型谓词。

- 造:`fail({ name, msg, code })` → 真 Error(堆栈照旧)+ 域自己的错误码。
- 判:`hasName` 在域里包成**类型谓词** —— 谓词的签名是语言规定的(必须直接收被判定的值,不能包成 `XxxIn`,包了就窄化不了)。调用方先 `e instanceof Error` 把 catch 里的 unknown 收窄,再交给它。
- 为什么 `name` 不用 `instanceof`:一来没有 class 了;二来 **`name` 跨模块边界照样认得出**,而 `instanceof` 在测试把整个桶 `vi.mock` 掉时必然失灵。

**两种失败为什么不合成一种**(被问过一次,理由钉在 `lib/error.ts`):字段完全一样,但 `message` 是**两种相反的契约** —— `LlmFailure.message` 是**见客话术**(`api/advisor` 那行 `new Response(e.message, {status:502})` 直接把它当 HTTP 响应体发出去),`GatewayFailure.message` 是**技术留痕**(`400 invalid_request_error: …`)。合成一种 = 两类字符串共用一个字段,离「用户看到 `400 invalid_request_error`」只差一次误抛。

还没换的:`lib/chat/orchestrate.ts` 的 `ChatError`(多带一个 `slots` 字段)。
不能换的:`lib/resume/extract.ts` 里三个是 pdf.js 的**全局垫片**(库要 `new DOMMatrix()`),外部规定。

---

## 5 · 所有 log 与 error 代码收进两个共享叶子(类比 `lib/db/sql.ts`)

判据仍是「有没有重复」:全站 **34 处** `console.log(\`[某某] …\`)` 各写各的前缀,3 个域还各包了一层一模一样的包装;class 形态的错误 2 个。前缀与措辞是**全站口径**,不该由某个域拥有(同 `lib/location.ts`)。

- **`lib/log.ts`** —— 全站**唯一的 `console.log`** + 各域的字面量表(`LLM_LOG` / `AGENT_LOG` / `LLM_FN` / `AGENT_FN`)。调用形状 `log({ tag: X_LOG.tag, text: … })`,和 `pool.query(SQL.X, params)` 同一个形状。
- **`lib/error.ts`** —— 全站**唯一造错与判错** + 错误码 + 话术 + 上游回包映射表。

域里**一层包装都不留**(`logLine` / `logFailure` 拆了):包装本身就是 log 代码。结果:`lib/llm` 与 `lib/agent` 里 `console.log` **0**、`new Error` **0**、`class` **0** —— 只剩「什么时候记、什么时候抛」。

顺带治好一处:那 11 处 `vi.mock('@/lib/llm')` **不用再桩 `LlmError`** 了 —— 判定走 `@/lib/error` 真模块,桩里只剩 `completeText`。

⚠️ 存量还有 **30 处 `[chat]` 的裸 `console.log`** 没接过来,纯机械清扫,单独一批。

---

## 6 · 验收

- [x] `npx tsc --noEmit` 零错
- [x] `npx eslint src/lib/llm src/lib/agent src/lib/log.ts src/lib/error.ts` 零 error 零 warning
- [x] `npx vitest run --config vitest.config.mts` —— **41 文件 719 条**,与基线逐条相同
- [x] `npm run build` ✓
- [ ] push 后拉 `/api/version` 确认换版(push ≠ 上线)

**这批改到的测试**:出口签名改成一参一对象,11 处 mock 工厂的参数从「位置两个」改成「一个对象」(函数体一字未动);4 处原本直接点 `@/lib/llm/friend` 的改从桶取;`friendLlm.int.spec` 的 `toBeInstanceOf(FriendLlmError)` 改成类型谓词。

**一处 1 行的行为微修**:旧链 `sources` 里上游若给 `{}`,旧写法 `String(s?.url || s || '')` 会漏出 `'[object Object]'`,新写法丢弃它。当笔误处理,注释里写明。

**记下的债**:`FRIEND_MSG` / `LLM_MSG` 是**给用户看的中文话术**,按宪法该住 `lib/i18n/` 且该有三语。这轮只收位置不搬文案(搬 = 顺带补 en/ko),已在 `lib/error.ts` 第 3 段标成技术债。
