from PIL import Image, ImageChops

def autocrop(image_path, output_path):
    img = Image.open(image_path).convert('RGB')
    # Assume the document is white or very light, and the background is either white or dark grey.
    # Let's crop the image by finding the bounding box of the central document.
    # If the background was dark grey, we can find the white document.
    # But my previous script flattened transparency to white.
    # Let's just find the bounding box of the non-background pixels.
    bg = Image.new('RGB', img.size, img.getpixel((0, 0)))
    diff = ImageChops.difference(img, bg)
    bbox = diff.getbbox()
    if bbox:
        cropped = img.crop(bbox)
        cropped.save(output_path)
        print(f'Cropped {image_path} to {bbox}')
    else:
        img.save(output_path)
        print(f'Could not crop {image_path}')

autocrop('images/pdf_compliance1_flattened.png', 'images/pdf_compliance1_cropped.png')
autocrop('images/pdf_compliance2_flattened.png', 'images/pdf_compliance2_cropped.png')

