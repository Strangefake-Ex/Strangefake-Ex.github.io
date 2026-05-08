import re

with open('/workspace/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

def fix_image(match):
    img_tag = match.group(0)
    
    # add alt="" if missing
    if 'alt=' not in img_tag:
        # Check if we can infer alt
        if 'Wang' in img_tag or 'Mei' in img_tag or 'Shen' in img_tag or 'Zhao' in img_tag:
            name = re.search(r'src="([^"]+)\.jpg"', img_tag)
            if name:
                alt_text = name.group(1).replace('%20', ' ')
                img_tag = img_tag.replace('<img', f'<img alt="{alt_text}"')
            else:
                img_tag = img_tag.replace('<img', '<img alt=""')
        else:
            img_tag = img_tag.replace('<img', '<img alt=""')
            
    # add width and height if missing
    if 'width=' not in img_tag:
        if 'w-32 h-32' in img_tag or 'w-48 h-48' in img_tag:
            img_tag = img_tag.replace('<img', '<img width="200" height="200"')
        elif '.jpg' in img_tag or 'unsplash' in img_tag:
            img_tag = img_tag.replace('<img', '<img width="800" height="600"')
        else:
            img_tag = img_tag.replace('<img', '<img width="800" height="600"')
            
    return img_tag

content = re.sub(r'<img[^>]+>', fix_image, content)

with open('/workspace/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
