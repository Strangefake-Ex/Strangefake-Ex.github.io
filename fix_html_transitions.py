import re

with open('/workspace/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace transition-all with transition
content = content.replace('transition-all', 'transition motion-reduce:transition-none')

with open('/workspace/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
