"""
opswatch 域常量(五件全溶,2026-11-08 立域)。

@author Frank
@time 2026-11-08 23:59:00
"""

ENV_LLM_BASE = "NEWS_LLM_BASE"
"""局域网 Ollama 的地址(与 jdformat / explore 同一台盒子)。"""

ENV_NONE = ""
"""环境变量没配。"""

PATH_TAGS = "/api/tags"
"""Ollama 列模型的路径:不跑模型,不占算力。"""

PATH_TICK = "/api/ops/tick"
"""站点收节拍的路径。"""

PROBE_TIMEOUT_S = 10
"""探活超时(秒)。"""

TICK_TIMEOUT_S = 60
"""站点一轮要探两个通道、判定全部规则,超时放宽(秒)。"""

MS_PER_S = 1000
"""秒换毫秒。"""

STATUS_OK = 200
"""HTTP 成功。"""

ERR_HTTP = "HTTP "
"""探活失败原因:HTTP 状态前缀。"""

ERR_NETWORK = "network error"
"""探活失败原因:连不上或超时。"""

ERR_UNCONFIGURED = "not configured"
"""探活失败原因:没配地址。"""

KEY_OLLAMA = "ollama"
"""节拍请求体里 Ollama 探活的键。"""

PRINT_SKIP = "opswatch: SEED_URL/SEED_TOKEN 未设,跳过"
"""没配站点时的提示。"""

PRINT_DONE = "opswatch: 探活 ollama={ok},新触发报警 {fired} 条"
"""一轮收口的提示。"""

ERR_TICK = "opswatch: 站点节拍失败 HTTP {status}"
"""站点返回失败时抛出的话。"""

KEY_FIRED = "fired"
"""站点回包里新触发条数的键。"""
