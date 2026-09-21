"""
richtext 域常量 —— 块级序列化的标签名单与分隔符(方言:constants 只许 import re / paths)。
全部自 etl/jobbank/constants.py 逐字迁入(2026-09-20 搬家步,值与 docstring 一字未改)。

@author Frank
@time 2026-09-20
"""
import re

PARSER_HTML = "html.parser"
"""bs4 解析器:标准库自带,免装 lxml(容器镜像瘦)。"""

LINE_BREAK = "\n"
"""单换行。"""

PARA_BREAK = "\n\n"
"""段落空行(段后空行=保留段落感)。"""

SPACE_SEP = " "
"""压空白后的单空格,也是 get_text 的分隔符。"""

WS_RE = re.compile(r"\s+")
"""连续空白折一个(清抓来的文本)。"""

BLANK_LINES_RE = re.compile(r"\n{3,}")
"""三个以上换行折成两个。"""

BULLET_PREFIX = "\n• "
"""列表项前缀(原帖的列表结构原样落进纯文本)。"""

TAG_BR = "br"
"""<br> 即换行。"""

TAG_LI = "li"
"""列表项:前缀「• 」。"""

BLOCK_TAGS = {"p", "div", "section", "article", "ul", "ol", "dl", "dt", "dd", "table", "thead",
              "tbody", "tr", "blockquote", "figure", "figcaption", "header", "footer", "main",
              "aside"}
"""块级标签:序列化时边界落换行 + 段后空行。"""

HEAD_TAGS = {"h1", "h2", "h3", "h4", "h5", "h6"}
"""标题标签:序列化时前后留空行。"""

SKIP_TAGS = {"script", "style", "noscript", "template"}
"""序列化时整段跳过的标签。"""

EMPH_TAGS = ["strong", "b"]
"""行内强调标签 —— 判节头只看它们:一个块的可见文本 == 块内强调文本 = 整段都在强调 = 节头。
(2026-09-20 立。Sienna 帖实证:`<p><strong>What We Offer:</strong></p>` 是节头,
`<p>Reporting to the Director of Care, the <strong>Registered Practical Nurse</strong> is...</p>`
是行内强调 —— 同一条判据一真一假,不需要白名单。)"""

HEAD_MARK = "## "
"""节头行前缀(与列表项的「• 」同规格:纯文本里的轻标记,消费端一处收口剥掉)。
放在 h1-h6 与「整段强调块」两种节头前,前端不再靠「白名单 + 碰巧带冒号」猜。"""

MD_HEAD_LINE_RE = re.compile(r"^[ \t]*(?:\*{1,2}|_)(?P<head>[^*_\s][^\n]*?)(?:\*{1,2}|_)[ \t]*$")
"""整行被 markdown 强调包住的行(`*Job Overview*`、`**Qualifications**`、`_Contract Details_`)。

2026-09-20 Frank 三次实拍(line cook 的 Qualifications、office assistant 的 Job Overview):
雇主在招聘板的正文框里用星号标加粗,**判据与 HTML 的 `<strong>` 一字不差** —— 整行都在强调 = 节头,
行内强调 = 正文(`You have at least *6 months to 1 year* of experience`)。
行首 `* ` 带空格的是列表项不是节头,所以捕获组第一个字符不许是空白。"""

SENTENCE_END_RE = re.compile(r"[.!?。!?]$")
"""句末标点。整行强调但以句号结尾的是被整句加粗的正文,不是节头
(`_Join a purpose-driven … every day._`),连同长度上限一起当护栏。"""

HEAD_GROUP = "head"
"""MD_HEAD_LINE_RE 里节头正文的捕获组名。"""

HEAD_MAX_LEN = 80
"""判节头的长度上限:整段强调但超过这个长度的当正文 —— 整段加粗的免责声明、
被加粗的一整句话不是节头(宁可不标,不瞎标;真节头实测最长 40 余字符)。"""
