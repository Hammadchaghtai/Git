from PIL import Image
import os

for f in ['images/pdf_compliance1.png', 'images/pdf_compliance2.png']:
    try:
        img = Image.open(f)
        print(f'{f}: {img.mode} {img.size}')
        bg = Image.new('RGB', img.size, (255, 255, 255))
        if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
            alpha = img.convert('RGBA').split()[-1]
            bg.paste(img, mask=alpha)
        else:
            bg.paste(img)
        out_name = f.replace('.png', '_flattened.png')
        # The image might have grey borders anyway, let's also crop it if possible, but let's first save flattened
        bg.save(out_name)
        print(f'Saved {out_name}')
    except Exception as e:
        print(e)

