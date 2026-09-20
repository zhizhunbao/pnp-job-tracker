"""
richtext 域函数 —— 一段 HTML(或一个 bs4 节点)→ 带结构的纯文本。

两只函数自 etl/jobbank/functions.py 逐字迁入(2026-09-20 搬家步,函数体一字未改):
jobbank 是六个源域里唯一把块级结构做对的一家,把它抬成全站唯一一份,其余五家的
plain_text_of 随后换用本门 —— 而不是再各抄一遍(CLAUDE.md:行为重复不许)。

@author Frank
@time 2026-09-20
"""
from bs4 import BeautifulSoup, NavigableString, Tag

from richtext.constants import (BLANK_LINES_RE, BLOCK_TAGS, BULLET_PREFIX, EMPH_TAGS, HEAD_MARK,
                                HEAD_MAX_LEN, HEAD_TAGS, LINE_BREAK, PARA_BREAK, PARSER_HTML, SKIP_TAGS,
                                SPACE_SEP, TAG_BR, TAG_LI, WS_RE)


def rich_text_of(html: str) -> str:
    """一段 HTML 串 → 带结构的纯文本(字符串门;取自 JSON-LD / 字段值的正文走它)。

    2026-09-20 立:五个源域原先各有一份 plain_text_of 把标签碾成空格,换用本门后
    段落、列表、节头全部保真。实体转义过的 HTML(`&lt;p&gt;`)由调用方先还原一层 ——
    那是各源自己的事(哪家转义、转几层),本叶只认正常 HTML。
    """
    if html == "":
        return ""
    return rich_text(BeautifulSoup(html, PARSER_HTML))


def rich_text(node: object) -> str:
    """块感知提取:HTML 结构(p/div/br/h*/li…)→ 带换行的纯文本,段落间空行、li 加「• 」。"""
    if node is None:
        return ""
    lines = []
    for line in serialize_node(node).split(LINE_BREAK):
        lines.append(WS_RE.sub(SPACE_SEP, line).strip())
    return BLANK_LINES_RE.sub(PARA_BREAK, LINE_BREAK.join(lines)).strip()


def serialize_node(node: object) -> str:
    """递归块级序列化:块边界落换行、<br> 即换行、标题前后空行、li 加「• 」。

    2026-07-16 用户报告:原帖有格式,老提取只认 h2-h5/p/li,Indeed 转义帖的 <br> 换行与
    <b>标题行</b> 全被压平成一坨 —— 这只函数就是为把原帖的分段/列表/标题结构原样落进
    纯文本而写的。
    """
    if isinstance(node, NavigableString):
        return WS_RE.sub(SPACE_SEP, str(node))
    if not isinstance(node, Tag) or node.name in SKIP_TAGS:
        return ""
    if node.name == TAG_BR:
        return LINE_BREAK
    parts = []
    for child in node.children:
        parts.append(serialize_node(child))
    inner = "".join(parts)
    if node.name == TAG_LI:
        return BULLET_PREFIX + inner.strip() + LINE_BREAK
    if node.name in HEAD_TAGS:
        return PARA_BREAK + HEAD_MARK + inner.strip() + LINE_BREAK
    if node.name in BLOCK_TAGS:
        body = inner.strip()
        if body == "":
            return ""
        if is_head_block(node):
            return PARA_BREAK + HEAD_MARK + body + LINE_BREAK
        return LINE_BREAK + body + PARA_BREAK
    return inner


def is_head_block(node: Tag) -> bool:
    """这个块是不是节头:块的可见文本 == 块内 strong/b 的文本(整段都在强调)且不超长。

    2026-09-20 立(设计稿 docs/design/职位正文结构下沉-20260920.md)。ATS / 招聘板的节头
    在 HTML 里是 `<p><strong>What We Offer:</strong></p>`,行内强调是
    `<p>Reporting to …, the <strong>Registered Practical Nurse</strong> is …</p>` ——
    前者整段都在强调,后者不是,一条判据分得开,不需要白名单、不靠「碰巧带冒号」。
    """
    body = WS_RE.sub(SPACE_SEP, node.get_text()).strip()
    if body == "" or len(body) > HEAD_MAX_LEN:
        return False
    marks = []
    for el in node.find_all(EMPH_TAGS):
        marks.append(el.get_text())
    emph = WS_RE.sub(SPACE_SEP, "".join(marks)).strip()
    return emph != "" and emph == body
