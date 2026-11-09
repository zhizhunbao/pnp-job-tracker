"""
opswatch 域形状(2026-11-08 立域;边界模型照 dli 样张)。
import 只有标准库与 pydantic(叶子律)。

@author Frank
@time 2026-11-08 23:59:00
"""
from pydantic import BaseModel, ConfigDict

MODEL_CFG = ConfigDict(extra="ignore", populate_by_name=True, use_attribute_docstrings=True)
"""边界模型统一配置。"""


class OllamaProbe(BaseModel):
    """一次 Ollama 探活。"""

    model_config = MODEL_CFG

    ok: bool
    """是否可用。"""

    ms: int | None
    """耗时;没测到是 None。"""

    error: str | None
    """失败原因;成功是 None。"""
