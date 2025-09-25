from pathlib import Path
import re

path = Path('src/pages/nsi/ObjectTypesPage.vue')
text = path.read_text(encoding='utf-8').replace('\r\n', '\n')

pattern = re.compile(
    r"(?P<indent>\s*)const ok = await ElMessageBox.confirm\(\s*(?P<content>[\s\S]+?),\s*(?P<title>[\s\S]+?),\s*(?P<options>\{[\s\S]*?\})\s*\)\.catch\(\(\) => false\)",
)

def repl(match: re.Match) -> str:
    indent = match.group('indent')
    content = match.group('content').strip()
    title = match.group('title').strip()
    options = match.group('options')
    positive = re.search(r"confirmButtonText:\s*'([^']*)'", options)
    negative = re.search(r"cancelButtonText:\s*'([^']*)'", options)
    html = 'dangerouslyUseHTMLString' in options
    lines = [f"{indent}const ok = await confirmDialog({{"]
    lines.append(f"{indent}  title: {title},")
    lines.append(f"{indent}  content: {content},")
    if positive:
        lines.append(f"{indent}  positiveText: '{positive.group(1)}',")
    if negative:
        lines.append(f"{indent}  negativeText: '{negative.group(1)}',")
    if html:
        lines.append(f"{indent}  html: true,")
    lines.append(f"{indent}}})")
    lines.append(f"{indent}if (!ok) return")
    return '\n'.join(lines)

text, count = pattern.subn(repl, text)
if count == 0:
    raise SystemExit('No ElMessageBox.confirm blocks with catch found')
path.write_text(text.replace('\n', '\r\n'), encoding='utf-8')
