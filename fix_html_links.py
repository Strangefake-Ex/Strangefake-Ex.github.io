import re

with open('/workspace/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

def add_focus_visible(match):
    tag_content = match.group(1)
    if 'class="' in tag_content:
        if 'focus-visible' not in tag_content:
            # We add it
            tag_content = re.sub(r'class="([^"]*)"', r'class="\1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded"', tag_content)
    else:
        tag_content += ' class="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded"'
    return f"<a{tag_content}>"

content = re.sub(r'<a([^>]+)>', add_focus_visible, content)

with open('/workspace/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
