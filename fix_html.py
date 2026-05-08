import re

with open('/workspace/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Quotes and Ellipses
replacements = {
    '"sword"': '“sword”',
    '"Face-Saving"': '“Face-Saving”',
    "'Face-Saving'": '‘Face-Saving’',
    '"Hidden Shield"': '“Hidden Shield”',
    "'Hidden Shield'": '‘Hidden Shield’',
    '"Head of the Table"': '“Head of the Table”',
    "'Head of the Table'": '‘Head of the Table’',
    '"Non Nobis Solum"': '“Non Nobis Solum”',
    "'Non Nobis Solum'": '‘Non Nobis Solum’',
    '"Playful"': '“Playful”',
    '"Crazy Eights"': '“Crazy Eights”',
    '...': '…'
}
for k, v in replacements.items():
    content = content.replace(k, v)

# 2. Add text-balance to headings
def add_text_balance(match):
    tag = match.group(1)
    attrs = match.group(2)
    if 'class="' in attrs:
        if 'text-balance' not in attrs:
            attrs = re.sub(r'class="([^"]*)"', r'class="\1 text-balance"', attrs)
    else:
        attrs += ' class="text-balance"'
    return f"<{tag}{attrs}>"

content = re.sub(r'<(h[1-6])([^>]*)>', add_text_balance, content)

# 3. Fix onclick div -> button
old_div = '<div class="flex items-center gap-4 group cursor-pointer" onclick="window.scrollTo({top: 0, behavior: \'smooth\'})">'
new_btn = '<button class="flex items-center gap-4 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-full p-2" onclick="window.scrollTo({top: 0, behavior: \'smooth\'})">'

if old_div in content:
    # Need to replace the closing </div> as well. We'll do it by finding the block.
    start_idx = content.find(old_div)
    # find next </div> which corresponds to the inner div, then the one after that.
    # Actually, let's just use regex or manual replace for the specific block.
    pass

with open('/workspace/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
