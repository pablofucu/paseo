#!/usr/bin/env python3
"""
Reduce el peso de las imágenes que se pintan pequeñas (usa Pillow; sharp no está en el proyecto):
  - assets/stamps/*.png: sellos de goma, a 400 px de ancho como máximo (se pintan a ~1/3 de una hoja).
  - assets/postcards/thumb/*.jpg: miniaturas de 416 px de las postales, para el pin y la ventana del
    mapa de Postales y para la silueta difuminada de las postales sin ganar.
Se puede repetir sin problema: solo toca lo que aún es más grande. Si se vuelven a hornear los sellos
con scripts/build-stamps.mjs, hay que volver a pasarlo.

    python3 scripts/shrink-assets.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
STAMP_W = 400
THUMB_W = 416

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
