#!/usr/bin/env python3
"""
Reduce el peso de las imágenes que se pintan pequeñas (usa Pillow; sharp no está en el proyecto):
  - assets/stamps/*.png: sellos de goma, a 400 px de ancho como máximo (se pintan a ~1/3 de una hoja).
  - assets/postcards/thumb/*.jpg: miniaturas de 416 px de las postales, para el pin y la ventana del
    mapa de Postales.
  - assets/postcards/mid/*.jpg: 832 px, para las postales de la lista (la de 1664 px solo a pantalla completa).
  - assets/postcards/blur/*.jpg: la silueta ya difuminada de las postales sin ganar (antes se
    difuminaba en el móvil con blurRadius, y en Android es lento).
  - assets/route-stamps/gray/*.png: el sello de cada ruta en blanco y negro, para los que aún no se
    han conseguido o no se han comprado (el filtro de gris de React Native no funciona en iOS ni en
    Android antiguos).
Se puede repetir sin problema: solo toca lo que aún es más grande. Si se vuelven a hornear los sellos
con scripts/build-stamps.mjs, hay que volver a pasarlo.

    python3 scripts/shrink-assets.py
"""
from pathlib import Path
from PIL import Image, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
STAMP_W = 400
THUMB_W = 416
MID_W = 832
BLUR_W = 208

for f in sorted((ROOT / 'assets/stamps').glob('*.png')):
    im = Image.open(f)
    if im.width <= STAMP_W:
        continue
    h = round(im.height * STAMP_W / im.width)
    im.convert('RGBA').resize((STAMP_W, h), Image.LANCZOS).save(f, optimize=True)
    print('sello', f.name, f'{im.width}x{im.height} ->', f'{STAMP_W}x{h}')

thumbs = ROOT / 'assets/postcards/thumb'
thumbs.mkdir(exist_ok=True)
for f in sorted((ROOT / 'assets/postcards').glob('*.jpg')):
    im = Image.open(f).convert('RGB')
    h = round(im.height * THUMB_W / im.width)
    im.resize((THUMB_W, h), Image.LANCZOS).save(thumbs / f.name, quality=82, optimize=True)
    print('miniatura', f.name, f'{THUMB_W}x{h}')

mids = ROOT / 'assets/postcards/mid'
mids.mkdir(exist_ok=True)
blurs = ROOT / 'assets/postcards/blur'
blurs.mkdir(exist_ok=True)
for f in sorted((ROOT / 'assets/postcards').glob('*.jpg')):
    im = Image.open(f).convert('RGB')
    h = round(im.height * MID_W / im.width)
    im.resize((MID_W, h), Image.LANCZOS).save(mids / f.name, quality=85, optimize=True)
    h = round(im.height * BLUR_W / im.width)
    # Como el blurRadius de 22 que se usaba sobre la miniatura de 416 px, a la mitad de tamaño
    im.resize((BLUR_W, h), Image.LANCZOS).filter(ImageFilter.GaussianBlur(6)).save(blurs / f.name, quality=80, optimize=True)
    print('mediana y difuminada', f.name)

grays = ROOT / 'assets/route-stamps/gray'
grays.mkdir(exist_ok=True)
for f in sorted((ROOT / 'assets/route-stamps').glob('*.png')):
    ImageOps.grayscale(Image.open(f).convert('RGB')).save(grays / f.name, optimize=True)
    print('sello en gris', f.name)
